import unittest

from worker.matching import NormalizedListing, WatchCriteria, matches


class MatchingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.watch = WatchCriteria("Grenoble", None, "chambre", 25000, 45000)

    def listing(self, **changes: object) -> NormalizedListing:
        values = {
            "source_key": "crous-1",
            "city": "Grenoble",
            "postal_code": "38000",
            "housing_type": "chambre",
            "price_cents": 35000,
        }
        values.update(changes)
        return NormalizedListing(**values)

    def test_matches_city_type_and_price(self) -> None:
        self.assertTrue(matches(self.watch, self.listing()))

    def test_city_is_case_and_accent_insensitive(self) -> None:
        self.assertTrue(matches(self.watch, self.listing(city="GRÉNOBLE")))

    def test_optional_postal_code_limits_the_zone(self) -> None:
        watch = WatchCriteria("Grenoble", "38000", "chambre", None, None)
        self.assertTrue(matches(watch, self.listing()))
        self.assertFalse(matches(watch, self.listing(postal_code="38100")))

    def test_price_bounds_are_inclusive(self) -> None:
        self.assertTrue(matches(self.watch, self.listing(price_cents=25000)))
        self.assertTrue(matches(self.watch, self.listing(price_cents=45000)))
        self.assertFalse(matches(self.watch, self.listing(price_cents=45001)))

    def test_unknown_price_does_not_match_a_price_filter(self) -> None:
        self.assertFalse(matches(self.watch, self.listing(price_cents=None)))


if __name__ == "__main__":
    unittest.main()
