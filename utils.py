"""
utils.py
========

Fonctions utilitaires génériques réutilisées dans plusieurs modules :
- décorateur de retry avec backoff exponentiel ;
- génération d'identifiants uniques ;
- formatage de dates/heures en français.
"""

from __future__ import annotations

import functools
import hashlib
import random
import time
from datetime import datetime
from typing import Callable, ParamSpec, Tuple, Type, TypeVar

from logger import get_logger

logger = get_logger(__name__)

P = ParamSpec("P")
T = TypeVar("T")


def retry_with_backoff(
    *,
    max_retries: int,
    base_seconds: float,
    exceptions: Tuple[Type[BaseException], ...],
    on_final_failure: Callable[[BaseException], None] | None = None,
) -> Callable[[Callable[P, T]], Callable[P, T]]:
    """
    Décorateur générique de retry avec backoff exponentiel + jitter.

    Args:
        max_retries: nombre maximal de tentatives (>= 1).
        base_seconds: délai de base (en secondes) avant la 1re nouvelle tentative.
        exceptions: tuple des exceptions qui déclenchent une nouvelle tentative.
        on_final_failure: callback optionnel appelé si toutes les tentatives échouent.

    Le délai suit la formule : base_seconds * (2 ** tentative) + jitter aléatoire.
    Cela évite de surcharger le serveur distant en cas d'indisponibilité
    temporaire, et évite les collisions si plusieurs instances tournent
    en parallèle.
    """

    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            last_exception: BaseException | None = None

            for attempt in range(1, max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as exc:
                    last_exception = exc
                    if attempt == max_retries:
                        break
                    delay = base_seconds * (2 ** (attempt - 1)) + random.uniform(0, 1)
                    logger.warning(
                        "Tentative %d/%d échouée pour %s (%s). "
                        "Nouvelle tentative dans %.1fs.",
                        attempt,
                        max_retries,
                        func.__name__,
                        exc,
                        delay,
                    )
                    time.sleep(delay)

            logger.error(
                "Échec définitif de %s après %d tentative(s) : %s",
                func.__name__,
                max_retries,
                last_exception,
            )
            if on_final_failure is not None and last_exception is not None:
                on_final_failure(last_exception)
            assert last_exception is not None
            raise last_exception

        return wrapper

    return decorator


def make_unique_id(*parts: str) -> str:
    """
    Construit un identifiant unique, stable et court à partir de plusieurs
    chaînes de caractères (ex : lien + résidence + adresse).

    Utilise SHA-256 tronqué à 16 caractères hexadécimaux : largement
    suffisant pour éviter toute collision sur un volume de quelques
    milliers de logements, tout en restant lisible dans les logs et le
    fichier de cache.
    """
    raw = "|".join(part.strip().lower() for part in parts if part)
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return digest[:16]


def now_french_datetime() -> tuple[str, str]:
    """Retourne (date, heure) formatées en français : ('14/07/2026', '15:42')."""
    now = datetime.now()
    return now.strftime("%d/%m/%Y"), now.strftime("%H:%M")
