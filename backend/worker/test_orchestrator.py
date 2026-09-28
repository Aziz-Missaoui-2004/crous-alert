import unittest
from unittest.mock import Mock

from worker.matching import NormalizedListing, WatchCriteria
from worker.orchestrator import run_cycle
from worker.repository import ActiveWatch
from worker.source import CrousListing


class OrchestratorTests(unittest.TestCase):
    def test_matches_upserts_and_creates_only_new_alerts(self) -> None:
        repository = Mock()
        repository.load_active_watches.return_value = [ActiveWatch("watch-1", WatchCriteria("Grenoble", None, "chambre", 25000, 45000))]
        repository.upsert_listing.return_value = "listing-1"
        repository.create_alert.return_value = True
        source = Mock()
        source.fetch_for_watch.return_value = [CrousListing(NormalizedListing("source-1", "Grenoble", "38000", "chambre", 30000, 35000), "Résidence", "1 rue Test 38000 GRENOBLE", "https://example.test/1", 18, {})]

        result = run_cycle(repository, source)

        self.assertEqual(result.watches, 1)
        self.assertEqual(result.listings_matched, 1)
        self.assertEqual(result.alerts_created, 1)
        repository.mark_watch_run.assert_called_once_with("watch-1")

    def test_one_watch_error_does_not_stop_the_cycle(self) -> None:
        repository = Mock()
        repository.load_active_watches.return_value = [ActiveWatch("watch-1", WatchCriteria("Grenoble", None, "chambre", None, None))]
        source = Mock()
        source.fetch_for_watch.side_effect = RuntimeError("site indisponible")

        result = run_cycle(repository, source)

        self.assertEqual(len(result.errors), 1)
        repository.mark_watch_run.assert_called_once()


if __name__ == "__main__":
    unittest.main()
