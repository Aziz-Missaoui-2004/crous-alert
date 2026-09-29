import unittest

from worker.notifications import NotificationListing, NotificationMailer, _build_html, _build_text


class NotificationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.listing = NotificationListing(
            residence="Résidence Test",
            city="Corte",
            postal_code="20250",
            housing_type="studio",
            price_min_cents=35000,
            price_max_cents=39000,
            surface_m2=18,
            url="https://trouverunlogement.lescrous.fr/accommodations/123",
            last_seen_at="2026-09-28T12:00:00+00:00",
        )

    def test_text_and_html_contain_the_essential_listing_data(self) -> None:
        text = _build_text([self.listing])
        html = _build_html([self.listing])
        for content in (text, html):
            self.assertIn("Résidence Test", content)
            self.assertIn("Corte", content)
            self.assertIn("350,00 à 390,00 €", content)
            self.assertIn("trouverunlogement.lescrous.fr", content)
            self.assertIn("pas affilié", content)

    def test_password_is_required(self) -> None:
        with self.assertRaisesRegex(Exception, "EMAIL_PASSWORD"):
            NotificationMailer.from_environment()


if __name__ == "__main__":
    unittest.main()
