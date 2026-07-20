"""
app.py
======

Point d'entrée principal de l'application.

Ce script effectue UN cycle complet de vérification :
1. récupère la page CROUS,
2. extrait les logements disponibles à Grenoble,
3. compare avec le cache pour détecter les nouveautés,
4. envoie un e-mail si (et seulement si) un nouveau logement est trouvé,
5. met à jour le cache.

Conçu pour être exécuté périodiquement (cron local ou GitHub Actions) :
voir .github/workflows/monitor.yml pour l'automatisation.

Usage :
    python app.py
    DRY_RUN=1 python app.py   # exécution de test, sans envoi d'e-mail
"""

from __future__ import annotations

import sys

from checker import CrousChecker
from config import settings
from email_sender import EmailSender
from exceptions import CrousAlertError, FetchError
from logger import get_logger
from storage import CacheStore

logger = get_logger(__name__)


def run() -> int:
    """
    Exécute un cycle complet de vérification.

    Returns:
        Code de sortie du processus (0 = succès, 1 = erreur).
        Le programme ne lève jamais d'exception non gérée : toute erreur
        est journalisée puis traduite en code de sortie, afin que le
        workflow GitHub Actions puisse continuer à s'exécuter aux
        prochains cycles plutôt que de rester bloqué.
    """
    try:
        settings.validate()
    except CrousAlertError as exc:
        logger.error("Configuration invalide : %s", exc)
        return 1

    cache_store = CacheStore(settings.cache_path)
    checker = CrousChecker(settings, cache_store)
    email_sender = EmailSender(settings)

    try:
        result = checker.check()
    except FetchError as exc:
        # Le site est temporairement injoignable (maintenance, forte
        # affluence, erreur réseau passagère...). Ce n'est PAS un bug de
        # notre programme : les tentatives avec backoff ont déjà été
        # épuisées. On journalise l'incident mais on retourne 0 (succès)
        # plutôt que 1, afin que le job GitHub Actions ne soit pas marqué
        # en échec — sinon GitHub envoie automatiquement un e-mail de
        # notification d'échec à chaque cycle où le site est indisponible.
        # Le prochain cycle (10 minutes plus tard) retentera naturellement.
        logger.warning(
            "Site CROUS indisponible pour le moment (maintenance ou forte "
            "affluence probable). Nouvelle tentative au prochain cycle : %s",
            exc,
        )
        return 0
    except CrousAlertError as exc:
        logger.error("Échec de la vérification : %s", exc)
        return 1

    if result.new_housings:
        try:
            email_sender.send_new_housing_alert(
                new_housings=result.new_housings,
                total_count=len(result.all_housings),
            )
        except CrousAlertError as exc:
            # On ne met pas le cache à jour si l'e-mail échoue : ainsi,
            # la nouveauté sera de nouveau détectée et un nouvel envoi
            # sera tenté au prochain cycle, plutôt que de perdre l'alerte.
            logger.error(
                "L'e-mail n'a pas pu être envoyé, le cache ne sera pas mis à jour "
                "afin de retenter au prochain cycle : %s",
                exc,
            )
            return 1

    try:
        checker.persist(result.all_housings)
    except CrousAlertError as exc:
        logger.error("Échec de la mise à jour du cache : %s", exc)
        return 1

    logger.info("Cycle de vérification terminé avec succès.")
    return 0


if __name__ == "__main__":
    sys.exit(run())
