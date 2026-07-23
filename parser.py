"""
parser.py
=========

Extraction des logements disponibles depuis le HTML de la page de
recherche CROUS.

Stratégie retenue et pourquoi
------------------------------
La page https://trouverunlogement.lescrous.fr est une application Svelte
mais dont le rendu HTML est déjà effectué côté serveur (SSR) : les cartes
de logements sont présentes directement dans la réponse HTML d'une simple
requête GET, sans exécution de JavaScript. Cela a été vérifié par
inspection directe des requêtes réseau. La stratégie la plus simple, la
plus rapide et la plus fiable est donc :

    requests (récupération du HTML) + BeautifulSoup (extraction)

Playwright n'est pas nécessaire ici et aurait un coût inutile en CI
(navigateur à télécharger, RAM, temps d'exécution) pour un site qui ne
requiert aucune interaction JS.

Chaque logement est affiché dans une carte au format DSFR (Système de
Design de l'État français) : `<div class="fr-card ...">`. Les classes
générées par le compilateur Svelte (ex. `svelte-12dfls6`) changent à
chaque déploiement du site et ne sont donc PAS fiables comme sélecteur
sur le long terme. Pour rendre le scraper robuste dans le temps, ce
module repose sur deux niveaux de résilience :

1. Sélection des cartes via le token de classe exact "fr-card" (pas une
   sous-chaîne, pour éviter les faux positifs sur les sous-éléments BEM
   comme "fr-card__body"), combiné à la présence d'un lien vers
   `/accommodations/<id>` (ce qui exclut les cartes de filtres).
2. Extraction des données (prix, surface, adresse, type) via des motifs
   de texte stables (ex. "€", "m²", code postal à 5 chiffres) plutôt que
   via des classes CSS précises, qui sont plus susceptibles de changer.

Exclusions
----------
Deux mécanismes complémentaires permettent d'ignorer certaines annonces :
- EXCLUDED_RESIDENCES / EXCLUDED_TYPES (variables d'environnement,
  réglage manuel dans config.py) ;
- data/exclusions.json (fichier dynamique, mis à jour automatiquement
  via les liens "Ignorer" cliqués dans les e-mails d'alerte, voir
  storage.load_exclusions et le workflow handle-exclusion.yml).
Les deux sont fusionnés à chaque cycle.
"""

from __future__ import annotations

import re
from typing import List, Optional
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from bs4.element import Tag

from config import settings
from exceptions import ParsingError
from logger import get_logger
from storage import Housing, load_exclusions
from utils import make_unique_id

logger = get_logger(__name__)

_ACCOMMODATION_LINK_RE = re.compile(r"/accommodations/(\d+)")
_PRICE_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*€")
_SURFACE_RE = re.compile(r"(\d+(?:[.,]\d+)?(?:\s*à\s*\d+(?:[.,]\d+)?)?)\s*m²")
_POSTAL_CODE_RE = re.compile(r"\b\d{5}\b")
_KNOWN_TYPES = ("Individuel", "Couple", "Colocation")


def parse_housings(html: str) -> List[Housing]:
    """
    Extrait la liste des logements présents dans le HTML fourni, après
    application des exclusions (résidences et types de logement à
    ignorer).

    Args:
        html: contenu HTML brut de la page de résultats CROUS.

    Returns:
        Liste d'objets Housing (peut être vide si aucun logement
        n'est actuellement disponible, ou si tous les logements trouvés
        sont exclus : ce sont des cas normaux, pas des erreurs).

    Raises:
        ParsingError: si le HTML ne peut pas être interprété du tout
            (structure radicalement différente de celle attendue), afin
            de distinguer "aucun logement" (cas normal) de "le site a
            changé et on ne sait plus rien extraire" (cas à surveiller).
    """
    try:
        soup = BeautifulSoup(html, "html.parser")
    except Exception as exc:  # noqa: BLE001 - on veut capturer tout type d'erreur bs4
        raise ParsingError(f"Impossible de parser le HTML : {exc}") from exc

    cards = _find_housing_cards(soup)
    housings: List[Housing] = []

    for card in cards:
        housing = _parse_card(card)
        if housing is not None:
            housings.append(housing)

    housings = _apply_exclusions(housings)

    logger.info("%d logement(s) extrait(s) du HTML (après exclusions).", len(housings))
    return housings


def _apply_exclusions(housings: List[Housing]) -> List[Housing]:
    """
    Filtre la liste des logements en retirant :
    - les résidences exclues (config.settings.excluded_residences +
      data/exclusions.json, comparaison insensible à la casse, par
      sous-chaîne) ;
    - les types de logement exclus (config.settings.excluded_types +
      data/exclusions.json, comparaison insensible à la casse, exacte).
    """
    dynamic = load_exclusions(settings.exclusions_path)

    excluded_residences = {
        r.lower() for r in (*settings.excluded_residences, *dynamic.get("residences", [])) if r
    }
    excluded_types = {
        t.lower() for t in (*settings.excluded_types, *dynamic.get("types", [])) if t
    }

    if not excluded_residences and not excluded_types:
        return housings

    kept: List[Housing] = []
    for housing in housings:
        residence_lower = housing.residence.lower()
        if excluded_residences and any(ex in residence_lower for ex in excluded_residences):
            logger.info("Résidence '%s' ignorée (exclusion résidence).", housing.residence)
            continue
        if excluded_types and housing.type_logement.lower() in excluded_types:
            logger.info(
                "Logement de type '%s' ignoré (résidence '%s', exclusion type).",
                housing.type_logement,
                housing.residence,
            )
            continue
        kept.append(housing)
    return kept


def _find_housing_cards(soup: BeautifulSoup) -> List[Tag]:
    """
    Repère les cartes de logement dans la page.

    Une carte est retenue uniquement si elle contient un lien vers
    `/accommodations/<id>`, ce qui garantit qu'il s'agit bien d'un
    logement et non d'un autre élément utilisant la même classe CSS
    (ex. carte de filtre, carte de résidence sans logement disponible).

    Important : on matche le TOKEN de classe exact "fr-card" (ou une
    variante "fr-card--xxx"), pas une simple sous-chaîne. En BEM (la
    convention utilisée par le DSFR), les sous-éléments d'une carte
    portent des classes comme "fr-card__body" ou "fr-card__content" :
    un sélecteur `[class*="fr-card"]` les matcherait aussi et
    provoquerait des doublons (plusieurs divs imbriquées contenant le
    même lien).
    """

    def _is_card_container(tag: Tag) -> bool:
        if tag.name != "div" or not tag.has_attr("class"):
            return False
        return any(cls == "fr-card" or cls.startswith("fr-card--") for cls in tag["class"])

    candidates = soup.find_all(_is_card_container)
    cards = [c for c in candidates if c.find("a", href=_ACCOMMODATION_LINK_RE)]

    if not cards:
        # Repli : certains changements mineurs de structure peuvent déplacer
        # le lien en dehors d'une simple div "fr-card". On retente en
        # cherchant directement tous les liens vers une fiche logement et
        # en remontant à leur conteneur parent le plus proche.
        logger.debug(
            "Aucune carte 'fr-card' avec lien logement trouvée, "
            "tentative de repli via les liens directs."
        )
        links = soup.find_all("a", href=_ACCOMMODATION_LINK_RE)
        seen_containers: List[Tag] = []
        for link in links:
            container = link.find_parent("div") or link
            if container not in seen_containers:
                seen_containers.append(container)
        cards = seen_containers

    return cards


def _parse_card(card: Tag) -> Optional[Housing]:
    """Extrait un objet Housing à partir d'une carte HTML unique."""
    link_tag = card.find("a", href=_ACCOMMODATION_LINK_RE)
    if link_tag is None or not link_tag.get("href"):
        return None

    href = link_tag["href"]
    lien = urljoin(settings.base_url, href)
    residence = link_tag.get_text(strip=True) or "Résidence inconnue"

    full_text = card.get_text(separator=" | ", strip=True)

    prix = _extract_price(full_text)
    surface = _extract_surface(full_text)
    adresse = _extract_address(full_text, residence)
    type_logement = _extract_type(full_text)
    equipements = _extract_equipments(full_text)

    match = _ACCOMMODATION_LINK_RE.search(href)
    accommodation_id = match.group(1) if match else None

    # Important : on NE se base PAS uniquement sur l'ID présent dans l'URL.
    # Cet ID correspond à l'entrée de résultat de recherche pour une
    # résidence, pas à une chambre précise (le site CROUS n'expose aucun
    # identifiant par chambre sur la page de recherche). Si une résidence
    # déjà connue voit une chambre supplémentaire se libérer, l'URL peut
    # rester identique alors que le contenu affiché change (fourchette de
    # prix ou de surface élargie, type de logement différent, etc.).
    # On inclut donc ces champs dans l'empreinte de l'identifiant unique :
    # tout changement de contenu visible est ainsi traité comme une
    # nouveauté à signaler, même si l'ID d'URL, lui, ne change pas.
    unique_id = make_unique_id(
        accommodation_id or lien, residence, prix, surface, type_logement, adresse
    )

    return Housing(
        id=unique_id,
        residence=residence,
        type_logement=type_logement,
        prix=prix,
        surface=surface,
        adresse=adresse,
        ville=settings.city_name,
        lien=lien,
        equipements=equipements,
    )


def _extract_price(text: str) -> str:
    match = _PRICE_RE.search(text)
    return f"{match.group(1)} €" if match else "Prix non précisé"


def _extract_surface(text: str) -> str:
    match = _SURFACE_RE.search(text)
    return f"{match.group(1)} m²" if match else "Surface non précisée"


def _extract_type(text: str) -> str:
    for known_type in _KNOWN_TYPES:
        if known_type.lower() in text.lower():
            return known_type
    return "Type non précisé"


def _extract_address(text: str, residence: str) -> str:
    """
    Isole le segment de texte contenant le code postal (adresse), en
    s'appuyant sur les séparateurs `|` insérés lors de l'extraction du
    texte de la carte.
    """
    for segment in text.split("|"):
        segment = segment.strip()
        if _POSTAL_CODE_RE.search(segment) and segment != residence:
            return segment
    return "Adresse non précisée"


def _extract_equipments(text: str) -> str:
    """
    Récupère la liste d'équipements si présente (segment contenant une
    virgule et des mots-clés typiques, ex. 'WC, Douche, Evier + plaque').
    """
    keywords = ("WC", "Douche", "Frigo", "Micro-onde", "Evier", "Lit")
    for segment in text.split("|"):
        segment = segment.strip()
        if any(keyword.lower() in segment.lower() for keyword in keywords):
            return segment
    return ""
