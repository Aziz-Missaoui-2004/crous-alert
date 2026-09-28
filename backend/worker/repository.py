"""Accès serveur minimal aux surveillances Supabase."""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timezone

import requests

from worker.matching import WatchCriteria
from worker.source import CrousListing


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
            "Authorization": f"Bearer {service_role_key}",
            "Accept": "application/json",
        }

    @classmethod
    def from_environment(cls) -> "SupabaseRepository":
        url = os.getenv("SUPABASE_URL", "").strip()
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        if not url or not key:
            raise RepositoryError("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.")
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
