"""Normalisation et filtrage des logements pour les surveillances."""

from __future__ import annotations

import unicodedata
from dataclasses import dataclass
from decimal import Decimal


def normalize_text(value: str) -> str:
    """Normalise un texte pour les comparaisons métier."""
    decomposed = unicodedata.normalize("NFKD", value.strip().casefold())
    return "".join(char for char in decomposed if not unicodedata.combining(char))


@dataclass(frozen=True)
class WatchCriteria:
    """Critères d'une surveillance active lus depuis Supabase."""

    city: str
    postal_code: str | None
    housing_type: str
    min_price_cents: int | None
    max_price_cents: int | None


@dataclass(frozen=True)
class NormalizedListing:
    """Logement indépendant du format renvoyé par le site CROUS."""

    source_key: str
    city: str
    postal_code: str | None
    housing_type: str
    price_min_cents: int | None
    price_max_cents: int | None


def matches(criteria: WatchCriteria, listing: NormalizedListing) -> bool:
    """Indique si un logement correspond exactement à une surveillance."""
    if normalize_text(criteria.city) != normalize_text(listing.city):
        return False

    if criteria.postal_code and criteria.postal_code != listing.postal_code:
        return False

    if normalize_text(criteria.housing_type) != normalize_text(listing.housing_type):
        return False

    if listing.price_min_cents is None and listing.price_max_cents is None:
        return criteria.min_price_cents is None and criteria.max_price_cents is None

    listing_min = Decimal(listing.price_min_cents or listing.price_max_cents or 0)
    listing_max = Decimal(listing.price_max_cents or listing.price_min_cents or 0)
    if criteria.max_price_cents is not None and criteria.max_price_cents < listing_min:
        return False
    if criteria.min_price_cents is not None and criteria.min_price_cents > listing_max:
        return False
    return True
