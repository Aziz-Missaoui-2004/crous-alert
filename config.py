"""
config.py
=========

Configuration centralisée de l'application.

Toutes les valeurs modifiables (URL surveillée, intervalle, timeout,
nombre de tentatives, niveau de logs, informations SMTP) sont regroupées
ici. Les informations sensibles (identifiants e-mail) proviennent
exclusivement de variables d'environnement et ne sont jamais codées en dur.

Pour surveiller une autre ville ou une autre résidence : il suffit de
changer `TARGET_URL` et `CITY_NAME` (voir README, section "Ajouter une
nouvelle ville").
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

from exceptions import ConfigurationError


def _get_bool_env(name: str, default: bool) -> bool:
    """Lit une variable d'environnement booléenne (1/true/yes -> True)."""
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    """Regroupe l'intégralité de la configuration de l'application."""

    # --- Cible de surveillance -------------------------------------------------
    target_url: str = os.getenv(
        "TARGET_URL",
        "https://trouverunlogement.lescrous.fr/tools/47/search"
        "?bounds=5.6776059_45.2140762_5.7531176_45.1541442&locationName=Grenoble",
    )
    city_name: str = os.getenv("CITY_NAME", "Grenoble")
    base_url: str = "https://trouverunlogement.lescrous.fr"

    # --- Comportement du scraper -------------------------------------------------
    request_timeout: int = int(os.getenv("REQUEST_TIMEOUT", "15"))
    max_retries: int = int(os.getenv("MAX_RETRIES", "4"))
    backoff_base_seconds: float = float(os.getenv("BACKOFF_BASE_SECONDS", "2"))
    user_agent: str = os.getenv(
        "USER_AGENT",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    )

    # --- Stockage / cache -------------------------------------------------
    cache_path: str = os.getenv("CACHE_PATH", os.path.join("data", "cache.json"))

    # --- Journalisation -------------------------------------------------
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

    # --- E-mail (SMTP Gmail) -------------------------------------------------
    smtp_host: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "465"))
    email_sender: str = field(default_factory=lambda: os.getenv("EMAIL_SENDER", ""))
    email_password: str = field(default_factory=lambda: os.getenv("EMAIL_PASSWORD", ""))
    email_receiver: str = field(default_factory=lambda: os.getenv("EMAIL_RECEIVER", ""))

    # --- Divers -------------------------------------------------
    dry_run: bool = _get_bool_env("DRY_RUN", False)
    """Si True : détecte les nouveautés mais n'envoie aucun e-mail (tests)."""

    def validate(self) -> None:
        """
        Vérifie que la configuration est exploitable.

        Lève une ConfigurationError explicite si une variable requise
        est manquante, plutôt que de planter plus tard avec une erreur
        SMTP peu compréhensible.
        """
        if self.dry_run:
            return  # Pas besoin des identifiants e-mail en mode test.

        missing = [
            name
            for name, value in (
                ("EMAIL_SENDER", self.email_sender),
                ("EMAIL_PASSWORD", self.email_password),
                ("EMAIL_RECEIVER", self.email_receiver),
            )
            if not value
        ]
        if missing:
            raise ConfigurationError(
                "Variables d'environnement manquantes : "
                f"{', '.join(missing)}. "
                "Consultez le README (section Configuration) pour les définir."
            )


settings = Settings()
