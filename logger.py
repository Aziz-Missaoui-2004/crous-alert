"""
logger.py
=========

Configuration centralisée du système de journalisation (logging).

Fournit une fonction unique `get_logger()` à utiliser dans tous les
modules, afin de garantir un format de logs cohérent sur l'ensemble
de l'application.
"""

from __future__ import annotations

import logging
import sys

from config import settings

_CONFIGURED = False


def _configure_root_logger() -> None:
    """Configure le logger racine une seule fois (idempotent)."""
    global _CONFIGURED
    if _CONFIGURED:
        return

    level = getattr(logging, settings.log_level.upper(), logging.INFO)

    handler = logging.StreamHandler(stream=sys.stdout)
    formatter = logging.Formatter(
        fmt="[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()
    root.addHandler(handler)

    _CONFIGURED = True


def get_logger(name: str) -> logging.Logger:
    """
    Retourne un logger configuré pour le module appelant.

    Exemple d'utilisation :
        logger = get_logger(__name__)
        logger.info("Connexion au site")
    """
    _configure_root_logger()
    return logging.getLogger(name)
