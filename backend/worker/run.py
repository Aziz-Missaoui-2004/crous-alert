"""Point d'entrée du worker de surveillance, sans notification e-mail."""

from __future__ import annotations

import logging
import os
import socket
import sys
from collections import defaultdict

from worker.orchestrator import CycleResult, run_cycle
from worker.notifications import NotificationError, NotificationMailer, PendingNotification
from worker.repository import RepositoryError, SupabaseRepository
from worker.source import CrousSource, SourceError


def main() -> int:
    # Garantit les accents dans les logs, y compris sur un runner CI.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"), format="[%(asctime)s] [%(levelname)s] %(message)s")
    try:
        repository = SupabaseRepository.from_environment()
        owner = f"{socket.gethostname()}:{os.getpid()}"
        if not repository.acquire_cycle_lock(owner):
            logging.warning("Cycle ignoré : un autre worker est déjà en cours d'exécution.")
            return 0
        run_id: str | None = None
        result = CycleResult()
        try:
            run_id = repository.start_worker_run(owner)
            source = CrousSource(tool_id=int(os.getenv("CROUS_TOOL_ID", "47")))
            result = run_cycle(repository, source)
            mailer = NotificationMailer.from_environment()
            pending = repository.load_pending_notifications()
            _send_notifications(repository, mailer, pending)
            repository.finish_worker_run(run_id, "failed" if result.errors else "completed", result, "; ".join(result.errors) or None)
        except Exception as exc:
            if run_id is not None:
                repository.finish_worker_run(run_id, "failed", result, str(exc))
            raise
        finally:
            repository.release_cycle_lock(owner)
    except (NotificationError, RepositoryError, SourceError, ValueError) as exc:
        logging.error("Cycle worker interrompu : %s", exc)
        return 1

    if result.errors:
        for error in result.errors:
            logging.error(error)
        logging.error("Cycle terminé avec %d erreur(s) : résultats incomplets, ne pas interpréter 0 logement comme une absence de disponibilité.", len(result.errors))
        return 1
    logging.info("Cycle terminé : %d surveillance(s), %d logement(s), %d correspondance(s), %d nouvelle(s) alerte(s).", result.watches, result.listings_seen, result.listings_matched, result.alerts_created)
    return 0


def _send_notifications(repository: SupabaseRepository, mailer: NotificationMailer, pending: list[PendingNotification]) -> None:
    grouped: dict[str, list[PendingNotification]] = defaultdict(list)
    for notification in pending:
        grouped[notification.recipient].append(notification)

    for recipient, notifications in grouped.items():
        try:
            mailer.send(recipient, [item.listing for item in notifications])
        except NotificationError as exc:
            repository.mark_notification_failed(notifications, str(exc))
            logging.error("Notification échouée pour %s : %s", recipient, exc)
            continue
        repository.mark_notification_sent([item.alert_id for item in notifications])


if __name__ == "__main__":
    sys.exit(main())
