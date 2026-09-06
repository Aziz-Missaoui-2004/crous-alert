"""
checker.py
==========

Orchestration de la vérification : récupération de la page CROUS (avec
retries et backoff exponentiel), extraction des logements, et
comparaison avec le cache pour détecter les nouveautés.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

import requests

from config import Settings
from exceptions import FetchError
from logger import get_logger
from parser import parse_housings
from storage import CacheStore, Housing
from utils import retry_with_backoff

logger = get_logger(__name__)


@dataclass
class CheckResult:
    """Résultat d'une vérification : logements actuels et nouveautés."""

    all_housings: List[Housing]
    new_housings: List[Housing]


class CrousChecker:
    """
    Vérifie la disponibilité de logements CROUS et détecte les nouveautés
    par rapport au cache local.
    """

    def __init__(self, settings: Settings, cache_store: CacheStore) -> None:
        self.settings = settings
        self.cache_store = cache_store

    def fetch_html(self) -> str:
        """
        Récupère le HTML de la page de recherche, avec tentatives
        automatiques et backoff exponentiel en cas d'erreur réseau ou
        de timeout.
        """

        @retry_with_backoff(
            max_retries=self.settings.max_retries,
            base_seconds=self.settings.backoff_base_seconds,
            exceptions=(requests.RequestException,),
        )
        def _do_fetch() -> str:
            logger.info("Connexion au site CROUS...")
            response = requests.get(
                self.settings.target_url,
                timeout=self.settings.request_timeout,
                headers={
                    "User-Agent": self.settings.user_agent,
                    "Accept-Language": "fr-FR,fr;q=0.9",
                },
            )
            response.raise_for_status()
            return response.text

        try:
            return _do_fetch()
        except requests.RequestException as exc:
            raise FetchError(
                f"Impossible de récupérer la page CROUS après "
                f"{self.settings.max_retries} tentative(s) : {exc}"
            ) from exc

    def check(self) -> CheckResult:
        """
        Effectue un cycle complet de vérification :
        1. récupère le HTML,
        2. extrait les logements disponibles,
        3. compare avec le cache pour isoler les nouveautés.

        Ne met PAS à jour le cache lui-même (voir `commit_new_housings`),
        afin que l'appelant puisse d'abord tenter l'envoi de l'e-mail et
        ne persister le cache qu'en cas de succès (ou choisir une autre
        politique).
        """
        html = self.fetch_html()
        housings = parse_housings(html)
        logger.info("%d logement(s) actuellement affiché(s) pour %s.",
                     len(housings), self.settings.city_name)

        known = self.cache_store.load()

        if self.settings.always_renotify:
            # Mode "re-notification systématique" : on signale toute
            # résidence actuellement affichée (non exclue), même si elle
            # a déjà été signalée à un cycle précédent. Le cache continue
            # d'être mis à jour (utile pour les logs / futures évolutions)
            # mais n'est plus utilisé pour filtrer les alertes.
            new_housings = housings
        else:
            new_housings = [h for h in housings if h.id not in known]

        if new_housings:
            logger.info("Nouveau logement trouvé : %d nouveauté(s).", len(new_housings))
        else:
            logger.info("Aucun nouveau logement par rapport au cache.")

        return CheckResult(all_housings=housings, new_housings=new_housings)

    def persist(self, housings: List[Housing]) -> None:
        """
        Met à jour le cache avec l'état courant des logements affichés.

        Remarque : le cache reflète l'ensemble des logements actuellement
        visibles (et non un simple ajout), ce qui permet aussi de
        "nettoyer" automatiquement les logements qui ont disparu de la
        page (déjà loués) sans jamais renvoyer une alerte déjà émise
        pour un logement qui reviendrait plus tard avec le même identifiant.
        """
        current: Dict[str, Housing] = {h.id: h for h in housings}
        self.cache_store.save(current)
