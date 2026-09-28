"""Exécution d'un cycle de surveillance sans envoi de notification."""

from __future__ import annotations

from dataclasses import dataclass, field

from worker.matching import matches
from worker.repository import ActiveWatch, SupabaseRepository
from worker.source import CrousSource


@dataclass
class CycleResult:
    watches: int = 0
    listings_seen: int = 0
    listings_matched: int = 0
    alerts_created: int = 0
    errors: list[str] = field(default_factory=list)


def run_cycle(repository: SupabaseRepository, source: CrousSource) -> CycleResult:
    result = CycleResult()
    watches = repository.load_active_watches()
    result.watches = len(watches)

    for watch in watches:
        try:
            listings = source.fetch_for_watch(watch.criteria)
            result.listings_seen += len(listings)
            for item in listings:
                if not matches(watch.criteria, item.listing):
                    continue
                result.listings_matched += 1
                listing_id = repository.upsert_listing(item)
                if repository.create_alert(watch.id, listing_id):
                    result.alerts_created += 1
            repository.mark_watch_run(watch.id)
        except Exception as exc:  # noqa: BLE001 - un cycle ne doit pas bloquer les autres surveillances
            message = f"{watch.criteria.city}: {exc}"
            result.errors.append(message)
            try:
                repository.mark_watch_run(watch.id, message)
            except Exception as mark_error:  # noqa: BLE001 - conserver l'erreur principale
                result.errors.append(f"{watch.criteria.city}: mise à jour impossible ({mark_error})")
    return result
