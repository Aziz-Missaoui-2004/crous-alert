"""Accès serveur minimal aux surveillances Supabase."""

from __future__ import annotations

import os
from dataclasses import dataclass

import requests

from worker.matching import WatchCriteria


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
