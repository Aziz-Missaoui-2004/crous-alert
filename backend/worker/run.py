"""Point d'entrée du worker de surveillance, sans notification e-mail."""

from __future__ import annotations

import logging
import os
import sys

from worker.orchestrator import run_cycle
from worker.repository import RepositoryError, SupabaseRepository
from worker.source import CrousSource, SourceError


def main() -> int:
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"), format="[%(asctime)s] [%(levelname)s] %(message)s")
    try:
        repository = SupabaseRepository.from_environment()
        source = CrousSource(tool_id=int(os.getenv("CROUS_TOOL_ID", "47")))
        result = run_cycle(repository, source)
    except (RepositoryError, SourceError, ValueError) as exc:
        logging.error("Cycle worker interrompu : %s", exc)
        return 1

    logging.info("Cycle terminé : %d surveillance(s), %d logement(s), %d correspondance(s), %d nouvelle(s) alerte(s).", result.watches, result.listings_seen, result.listings_matched, result.alerts_created)
    for error in result.errors:
        logging.error(error)
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
