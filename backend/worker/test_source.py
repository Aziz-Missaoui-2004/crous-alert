import unittest
from unittest.mock import Mock

from worker.matching import WatchCriteria
from worker.source import CrousSource


class SourceTests(unittest.TestCase):
    def test_fetches_and_normalizes_public_crous_data(self) -> None:
        session = Mock()

        def response(payload):
            result = Mock()
            result.ok = True
            result.status_code = 200
            result.json.return_value = payload
            result.text = payload if isinstance(payload, str) else ""
            return result

        session.get.side_effect = [
            response({"features": [{"geometry": {"coordinates": [5.72, 45.18]}}]}),
            response('<div class="fr-card"><h3><a href="/tools/47/accommodations/1995">Residence A</a></h3><p class="fr-card__desc">1 rue Test 38000 GRENOBLE</p></div>'),
            response({
                "id": 1995,
                "label": "CHAMBRE RENOVEE",
                "available": True,
                "area": {"min": 14, "max": 17.9},
                "occupationModes": [{"type": "alone", "rent": {"min": 26900, "max": 26900}}],
            }),
        ]

        listings = CrousSource(session).fetch_for_watch(WatchCriteria("Grenoble", "38000", "chambre", None, None))

        self.assertEqual(len(listings), 1)
        self.assertEqual(listings[0].listing.housing_type, "chambre")
        self.assertEqual(listings[0].listing.price_min_cents, 26900)
        self.assertEqual(listings[0].listing.postal_code, "38000")

    def test_ignores_unknown_types_instead_of_guessing(self) -> None:
        source = CrousSource()
        listing = source._normalize_detail("1", {"id": 1, "label": "T2", "available": True}, WatchCriteria("Grenoble", None, "studio", None, None), "Residence", "1 rue Test 38000 GRENOBLE")
        self.assertIsNone(listing)

    def test_decodes_crous_html_as_utf8(self) -> None:
        response = Mock()
        response.encoding = "iso-8859-1"
        response.text = "<div>Résidence de Souilhac</div>"

        self.assertEqual(CrousSource._decode_html(response), "<div>Résidence de Souilhac</div>")
        self.assertEqual(response.encoding, "utf-8")


if __name__ == "__main__":
    unittest.main()
