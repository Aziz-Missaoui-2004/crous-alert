"""Accès serveur minimal aux surveillances Supabase."""

from __future__ import annotations

import os
import logging
from dataclasses import dataclass
from datetime import datetime, timezone

import requests

from worker.matching import WatchCriteria
from worker.notifications import NotificationListing, PendingNotification
from worker.source import CrousListing

logger = logging.getLogger(__name__)


class RepositoryError(RuntimeError):
    """Erreur exploitable lors de la lecture de Supabase."""


@dataclass(frozen=True)
class ActiveWatch:
    id: str
    criteria: WatchCriteria


class SupabaseRepository:
    def __init__(self, url: str, service_role_key: str, session: requests.Session | None = None) -> None:
        self.url = url.rstrip("/")
        self.session = session or requests.Session()
        self.headers = {
            "apikey": service_role_key,
            "Accept": "application/json",
        }
        # Les nouvelles clés sb_secret_* s'envoient uniquement via apikey.
        # Les anciennes clés JWT service_role gardent le header Bearer.
        if not service_role_key.startswith("sb_secret_"):
            self.headers["Authorization"] = f"Bearer {service_role_key}"

    @classmethod
    def from_environment(cls) -> "SupabaseRepository":
        url = os.getenv("SUPABASE_URL", "").strip()
        key = (os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")).strip()
        if not url or not key:
            raise RepositoryError("SUPABASE_URL et SUPABASE_SECRET_KEY sont requis.")
        if key.startswith("sb_publishable_"):
            raise RepositoryError("Une clé publishable/anon ne peut pas être utilisée par le worker. Utilisez une clé sb_secret_.")
        return cls(url, key)

    def load_active_watches(self) -> list[ActiveWatch]:
        response = self.session.get(
            f"{self.url}/rest/v1/surveillances",
            params={
                "select": "id,city,postal_code,housing_type,min_price_cents,max_price_cents",
                "status": "eq.active",
            },
            headers=self.headers,
            timeout=15,
        )
        try:
            response.raise_for_status()
            rows = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise RepositoryError(f"Impossible de lire les surveillances Supabase : {exc}") from exc

        if not isinstance(rows, list):
            raise RepositoryError("Réponse Supabase invalide : une liste était attendue.")

        return [
            ActiveWatch(
                id=str(row["id"]),
                criteria=WatchCriteria(
                    city=str(row["city"]),
                    postal_code=row.get("postal_code"),
                    housing_type=str(row["housing_type"]),
                    min_price_cents=row.get("min_price_cents"),
                    max_price_cents=row.get("max_price_cents"),
                ),
            )
            for row in rows
        ]

    def acquire_cycle_lock(self, owner: str, ttl_seconds: int = 120) -> bool:
        response = self.session.post(
            f"{self.url}/rest/v1/rpc/acquire_worker_lock",
            headers=self.headers,
            json={"requested_lock_name": "crous-worker", "requested_owner": owner, "ttl_seconds": ttl_seconds},
            timeout=15,
        )
        try:
            response.raise_for_status()
            value = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise RepositoryError(f"Impossible d'acquérir le verrou du worker : {exc}") from exc
        return bool(value)

    def release_cycle_lock(self, owner: str) -> None:
        response = self.session.post(
            f"{self.url}/rest/v1/rpc/release_worker_lock",
            headers=self.headers,
            json={"requested_lock_name": "crous-worker", "requested_owner": owner},
            timeout=15,
        )
        try:
            response.raise_for_status()
        except requests.RequestException as exc:
            raise RepositoryError(f"Impossible de libérer le verrou du worker : {exc}") from exc

    def start_worker_run(self, owner: str) -> str:
        response = self.session.post(
            f"{self.url}/rest/v1/worker_runs",
            headers={**self.headers, "Prefer": "return=representation"},
            json={"owner": owner, "status": "running"},
            timeout=15,
        )
        try:
            response.raise_for_status()
            return str(response.json()[0]["id"])
        except (requests.RequestException, ValueError, IndexError, KeyError, TypeError) as exc:
            raise RepositoryError(f"Impossible d'enregistrer le début du cycle : {exc}") from exc

    def finish_worker_run(self, run_id: str, status: str, result: object, error: str | None = None) -> None:
        response = self.session.patch(
            f"{self.url}/rest/v1/worker_runs",
            params={"id": f"eq.{run_id}"},
            headers=self.headers,
            json={
                "status": status,
                "finished_at": datetime.now(timezone.utc).isoformat(),
                "watches": result.watches,
                "listings_seen": result.listings_seen,
                "listings_matched": result.listings_matched,
                "alerts_created": result.alerts_created,
                "error": error,
            },
            timeout=15,
        )
        try:
            response.raise_for_status()
        except requests.RequestException as exc:
            raise RepositoryError(f"Impossible d'enregistrer la fin du cycle : {exc}") from exc

    def upsert_listing(self, item: CrousListing) -> str:
        now = datetime.now(timezone.utc).isoformat()
        payload = {
            "source": "crous",
            "source_key": item.listing.source_key,
            "city": item.listing.city,
            "postal_code": item.listing.postal_code,
            "residence": item.residence,
            "housing_type": item.listing.housing_type,
            "price_min_cents": item.listing.price_min_cents,
            "price_max_cents": item.listing.price_max_cents,
            "surface_m2": item.surface_m2,
            "address": item.address,
            "url": item.url,
            "available": True,
            "last_seen_at": now,
            "updated_at": now,
            "raw_data": item.raw_data,
        }
        response = self.session.post(
            f"{self.url}/rest/v1/logements",
            params={"on_conflict": "source,source_key"},
            headers={**self.headers, "Prefer": "resolution=merge-duplicates,return=representation"},
            json=payload,
            timeout=15,
        )
        try:
            response.raise_for_status()
            rows = response.json()
            return str(rows[0]["id"])
        except (requests.RequestException, ValueError, IndexError, KeyError, TypeError) as exc:
            raise RepositoryError(f"Impossible d'enregistrer le logement : {exc}") from exc

    def create_alert(self, watch_id: str, listing_id: str) -> bool:
        response = self.session.post(
            f"{self.url}/rest/v1/alertes",
            params={"on_conflict": "surveillance_id,logement_id"},
            headers={**self.headers, "Prefer": "resolution=ignore-duplicates,return=representation"},
            json={"surveillance_id": watch_id, "logement_id": listing_id},
            timeout=15,
        )
        try:
            response.raise_for_status()
            rows = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise RepositoryError(f"Impossible de créer l'alerte : {exc}") from exc
        return bool(rows)

    def load_pending_notifications(self, limit: int = 100) -> list[PendingNotification]:
        response = self.session.get(
            f"{self.url}/rest/v1/alertes",
            params={
                "select": "id,notification_attempts,logements(residence,city,postal_code,housing_type,price_min_cents,price_max_cents,surface_m2,url,last_seen_at),surveillances(profiles(email,first_name))",
                "notification_status": "in.(pending,failed)",
                "notification_attempts": "lt.3",
                "order": "created_at.asc",
                "limit": str(limit),
            },
            headers=self.headers,
            timeout=15,
        )
        try:
            response.raise_for_status()
            rows = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise RepositoryError(f"Impossible de lire les notifications en attente : {exc}") from exc
        if not isinstance(rows, list):
            raise RepositoryError("Réponse Supabase invalide : une liste de notifications était attendue.")

        pending: list[PendingNotification] = []
        for row in rows:
            listing = row.get("logements") or {}
            surveillance = row.get("surveillances") or {}
            profile = surveillance.get("profiles") or {}
            if isinstance(listing, list):
                listing = listing[0] if listing else {}
            if isinstance(surveillance, list):
                surveillance = surveillance[0] if surveillance else {}
            if isinstance(profile, list):
                profile = profile[0] if profile else {}
            recipient = str(profile.get("email", "")).strip()
            if not recipient or not listing.get("url"):
                logger.warning("Notification %s ignorée : profil ou logement incomplet.", row.get("id"))
                continue
            pending.append(PendingNotification(
                alert_id=str(row["id"]),
                recipient=recipient,
                first_name=str(profile.get("first_name", "")),
                attempts=int(row.get("notification_attempts", 0)),
                listing=NotificationListing(
                    residence=str(listing.get("residence", "Logement CROUS")),
                    city=str(listing.get("city", "")),
                    postal_code=listing.get("postal_code"),
                    housing_type=str(listing.get("housing_type", "")),
                    price_min_cents=listing.get("price_min_cents"),
                    price_max_cents=listing.get("price_max_cents"),
                    surface_m2=listing.get("surface_m2"),
                    url=str(listing["url"]),
                    last_seen_at=str(listing.get("last_seen_at", "")),
                ),
            ))
        return pending

    def mark_notification_sent(self, alert_ids: list[str]) -> None:
        if not alert_ids:
            return
        response = self.session.patch(
            f"{self.url}/rest/v1/alertes",
            params={"id": f"in.({','.join(alert_ids)})"},
            headers=self.headers,
            json={"notification_status": "sent", "notification_sent_at": datetime.now(timezone.utc).isoformat(), "notification_error": None},
            timeout=15,
        )
        try:
            response.raise_for_status()
        except requests.RequestException as exc:
            raise RepositoryError(f"Impossible de confirmer l'envoi des notifications : {exc}") from exc

    def mark_notification_failed(self, notifications: list[PendingNotification], error: str) -> None:
        if not notifications:
            return
        for notification in notifications:
            response = self.session.patch(
                f"{self.url}/rest/v1/alertes",
                params={"id": f"eq.{notification.alert_id}"},
                headers=self.headers,
                json={"notification_status": "failed", "notification_attempts": notification.attempts + 1, "notification_error": error[:1000]},
                timeout=15,
            )
            try:
                response.raise_for_status()
            except requests.RequestException as exc:
                raise RepositoryError(f"Impossible d'enregistrer l'échec de notification : {exc}") from exc

    def mark_watch_run(self, watch_id: str, error: str | None = None) -> None:
        response = self.session.patch(
            f"{self.url}/rest/v1/surveillances",
            params={"id": f"eq.{watch_id}"},
            headers=self.headers,
            json={"last_checked_at": datetime.now(timezone.utc).isoformat(), "last_error": error},
            timeout=15,
        )
        try:
            response.raise_for_status()
        except requests.RequestException as exc:
            raise RepositoryError(f"Impossible de mettre à jour la surveillance : {exc}") from exc
