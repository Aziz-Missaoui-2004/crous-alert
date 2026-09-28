"""Adaptateur indépendant pour les résultats publics du site CROUS."""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from worker.matching import NormalizedListing, WatchCriteria

logger = logging.getLogger(__name__)

_ACCOMMODATION_RE = re.compile(r"/accommodations/(\d+)")
_POSTAL_RE = re.compile(r"\b(\d{5})\s+([^,]+)$")
_ROOM_RE = re.compile(r"\b(chambre|room)\b", re.IGNORECASE)
_STUDIO_RE = re.compile(r"\b(studio|t1(?:\s+bis)?)\b", re.IGNORECASE)


class SourceError(RuntimeError):
    """Erreur de récupération ou de lecture du site CROUS."""


@dataclass(frozen=True)
class CrousListing:
    listing: NormalizedListing
    residence: str
    address: str
    url: str
    surface_m2: float | None
    raw_data: dict


class CrousSource:
    def __init__(
        self,
        session: requests.Session | None = None,
        *,
        base_url: str = "https://trouverunlogement.lescrous.fr",
        tool_id: int = 47,
        geocoder_url: str = "https://api-adresse.data.gouv.fr/search/",
    ) -> None:
        self.session = session or requests.Session()
        self.base_url = base_url.rstrip("/")
        self.tool_id = tool_id
        self.geocoder_url = geocoder_url
        self._coordinates: dict[tuple[str, str | None], tuple[float, float]] = {}

    def fetch_for_watch(self, criteria: WatchCriteria) -> list[CrousListing]:
        bounds = self._find_bounds(criteria)
        logger.info("Recherche CROUS : ville=%s, code_postal=%s, bounds=%s", criteria.city, criteria.postal_code or "tous", bounds)
        next_url: str | None = f"{self.base_url}/tools/{self.tool_id}/search"
        params: dict[str, str] | None = {"bounds": bounds, "locationName": criteria.city}
        cards: list[tuple[str, str, str]] = []
        seen_ids: set[str] = set()
        pages = 0
        for _ in range(50):
            pages += 1
            response = self.session.get(
                next_url,
                params=params,
                headers={"User-Agent": "CrousAlert/1.0", "Accept-Language": "fr-FR,fr;q=0.9"},
                timeout=20,
            )
            if not response.ok:
                raise SourceError(f"Recherche CROUS indisponible ({response.status_code}).")
            for card in self._search_cards(response.text):
                if card[0] not in seen_ids:
                    seen_ids.add(card[0])
                    cards.append(card)
            next_url = self._next_page(response.text)
            params = None
            if next_url is None:
                break

        logger.info("Résultats CROUS : %d carte(s) sur %d page(s) pour %s", len(cards), pages, criteria.city)
        listings: list[CrousListing] = []
        for accommodation_id, residence, address in cards:
            detail = self._fetch_detail(accommodation_id)
            if not detail.get("available", True):
                continue
            listing = self._normalize_detail(accommodation_id, detail, criteria, residence, address)
            if listing is not None:
                listings.append(listing)
            else:
                logger.info("Logement ignoré : type non reconnu (id=%s, label=%s)", accommodation_id, detail.get("label", "inconnu"))
        logger.info("Logements normalisés : %d pour %s", len(listings), criteria.city)
        return listings

    @staticmethod
    def _next_page(html: str) -> str | None:
        soup = BeautifulSoup(html, "html.parser")
        link = soup.select_one("a.fr-pagination__link--next[href]")
        if link is None or link.get("aria-disabled") == "true":
            return None
        return str(link["href"])

    def _find_bounds(self, criteria: WatchCriteria) -> str:
        cache_key = (criteria.city.casefold(), criteria.postal_code)
        if cache_key not in self._coordinates:
            query = " ".join(part for part in (criteria.city, criteria.postal_code) if part)
            response = self.session.get(self.geocoder_url, params={"q": query, "limit": 1}, timeout=15)
            if not response.ok:
                raise SourceError(f"Géocodage indisponible ({response.status_code}).")
            try:
                features = response.json().get("features", [])
                lon, lat = features[0]["geometry"]["coordinates"]
            except (IndexError, KeyError, TypeError, ValueError) as exc:
                raise SourceError(f"Zone introuvable pour {query}.") from exc
            self._coordinates[cache_key] = (float(lon), float(lat))

        lon, lat = self._coordinates[cache_key]
        radius = 0.035 if criteria.postal_code else 0.09
        return f"{lon - radius}_{lat + radius}_{lon + radius}_{lat - radius}"

    def _fetch_detail(self, accommodation_id: str) -> dict:
        response = self.session.get(
            f"{self.base_url}/api/fr/tools/{self.tool_id}/accommodations/{accommodation_id}",
            headers={"User-Agent": "CrousAlert/1.0"},
            timeout=20,
        )
        if not response.ok:
            raise SourceError(f"Fiche CROUS indisponible pour {accommodation_id} ({response.status_code}).")
        try:
            data = response.json()
        except (ValueError, json.JSONDecodeError) as exc:
            raise SourceError(f"Réponse invalide pour la fiche CROUS {accommodation_id}.") from exc
        if not isinstance(data, dict):
            raise SourceError(f"Fiche CROUS invalide pour {accommodation_id}.")
        return data

    @staticmethod
    def _search_cards(html: str) -> list[tuple[str, str, str]]:
        soup = BeautifulSoup(html, "html.parser")
        cards: list[tuple[str, str, str]] = []
        for card in soup.find_all("div", class_=lambda value: value and "fr-card" in value.split()):
            link = card.find("a", href=_ACCOMMODATION_RE)
            if link is None or not link.get("href"):
                continue
            match = _ACCOMMODATION_RE.search(link["href"])
            if match is None:
                continue
            address_node = card.select_one(".fr-card__desc")
            cards.append((match.group(1), link.get_text(" ", strip=True), address_node.get_text(" ", strip=True) if address_node else ""))
        return cards

    def _normalize_detail(self, accommodation_id: str, detail: dict, criteria: WatchCriteria, residence: str, address: str) -> CrousListing | None:
        label = str(detail.get("label") or "")
        if _ROOM_RE.search(label):
            housing_type = "chambre"
        elif _STUDIO_RE.search(label):
            housing_type = "studio"
        else:
            return None

        price_min, price_max = self._rent_range(detail)
        postal_code, city = self._address_parts(address, criteria.city)
        area = detail.get("area") or {}
        surface = area.get("min") if isinstance(area, dict) else None
        raw = {"id": detail.get("id", accommodation_id), "label": label, "area": area, "occupationModes": detail.get("occupationModes", [])}
        return CrousListing(
            listing=NormalizedListing(str(detail.get("id", accommodation_id)), city, postal_code, housing_type, price_min, price_max),
            residence=residence,
            address=address,
            url=urljoin(self.base_url, f"/tools/{self.tool_id}/accommodations/{accommodation_id}"),
            surface_m2=float(surface) if surface is not None else None,
            raw_data=raw,
        )

    @staticmethod
    def _rent_range(detail: dict) -> tuple[int | None, int | None]:
        modes = detail.get("occupationModes") or []
        preferred = next((mode for mode in modes if mode.get("type") == "alone"), modes[0] if modes else None)
        rent = preferred.get("rent", {}) if preferred else {}
        minimum = rent.get("min")
        maximum = rent.get("max", minimum)
        return (int(minimum) if minimum is not None else None, int(maximum) if maximum is not None else None)

    @staticmethod
    def _address_parts(address: str, fallback_city: str) -> tuple[str | None, str]:
        match = _POSTAL_RE.search(address.strip())
        return (match.group(1), match.group(2).strip()) if match else (None, fallback_city)
