import unittest
from unittest.mock import Mock

from worker.repository import RepositoryError, SupabaseRepository


class RepositoryTests(unittest.TestCase):
    def test_loads_only_the_active_watch_query(self) -> None:
        response = Mock()
        response.json.return_value = [{
            "id": "watch-1",
            "city": "Grenoble",
            "postal_code": "38000",
            "housing_type": "chambre",
            "min_price_cents": 25000,
            "max_price_cents": 45000,
        }]
        session = Mock()
        session.get.return_value = response

        watches = SupabaseRepository("https://example.supabase.co", "secret", session).load_active_watches()

        self.assertEqual(len(watches), 1)
        self.assertEqual(watches[0].criteria.city, "Grenoble")
        session.get.assert_called_once()
        self.assertEqual(session.get.call_args.kwargs["params"]["status"], "eq.active")

    def test_invalid_response_is_reported(self) -> None:
        response = Mock()
        response.json.return_value = {"error": "bad"}
        session = Mock()
        session.get.return_value = response

        with self.assertRaises(RepositoryError):
            SupabaseRepository("https://example.supabase.co", "secret", session).load_active_watches()


if __name__ == "__main__":
    unittest.main()
