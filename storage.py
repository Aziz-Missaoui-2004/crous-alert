"""
storage.py
==========

Modèle de données `Housing` (un logement CROUS), gestion du cache
persistant au format JSON (utilisé pour ne jamais envoyer deux fois la
même alerte), et gestion des exclusions dynamiques (résidences / types
de logement à ignorer, mises à jour via les liens "Ignorer" des e-mails
d'alerte).
"""

from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List

from exceptions import StorageError
from logger import get_logger

logger = get_logger(__name__)


@dataclass(frozen=True)
class Housing:
    """Représente un logement CROUS extrait de la page de recherche."""

    id: str
    residence: str
    type_logement: str
    prix: str
    surface: str
    adresse: str
    ville: str
    lien: str
    equipements: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class CacheStore:
    """
    Gère la lecture et l'écriture du cache des logements déjà connus.

    Le cache est stocké sous forme de fichier JSON contenant une liste
    d'objets logement. Il est chargé une fois en mémoire puis mis à jour
    explicitement via `save()`.
    """

    def __init__(self, path: str) -> None:
        self.path = path

    def load(self) -> Dict[str, Housing]:
        """
        Charge le cache depuis le disque.

        Retourne un dictionnaire {id: Housing}. Si le fichier n'existe pas
        encore (première exécution), retourne un dictionnaire vide sans
        erreur. Si le fichier existe mais est corrompu, lève une
        StorageError explicite plutôt que de risquer de renvoyer de
        fausses alertes en boucle.
        """
        if not os.path.exists(self.path):
            logger.info("Aucun cache existant trouvé (%s). Démarrage à vide.", self.path)
            return {}

        try:
            with open(self.path, "r", encoding="utf-8") as fh:
                raw: List[Dict[str, Any]] = json.load(fh)
        except (OSError, json.JSONDecodeError) as exc:
            raise StorageError(
                f"Impossible de lire le cache '{self.path}' : {exc}"
            ) from exc

        housings: Dict[str, Housing] = {}
        for item in raw:
            try:
                housing = Housing(**item)
                housings[housing.id] = housing
            except TypeError:
                logger.warning("Entrée de cache ignorée (format invalide) : %s", item)

        logger.info("Cache chargé : %d logement(s) déjà connu(s).", len(housings))
        return housings

    def save(self, housings: Dict[str, Housing]) -> None:
        """
        Sauvegarde le cache sur le disque de façon atomique.

        Écrit d'abord dans un fichier temporaire puis renomme, afin
        d'éviter de corrompre le cache en cas d'interruption pendant
        l'écriture (coupure réseau, timeout du job CI, etc.).
        """
        directory = os.path.dirname(self.path) or "."
        os.makedirs(directory, exist_ok=True)

        tmp_path = f"{self.path}.tmp"
        payload = [h.to_dict() for h in housings.values()]

        try:
            with open(tmp_path, "w", encoding="utf-8") as fh:
                json.dump(payload, fh, ensure_ascii=False, indent=2)
            os.replace(tmp_path, self.path)
        except OSError as exc:
            raise StorageError(f"Impossible d'écrire le cache '{self.path}' : {exc}") from exc

        logger.info("Cache mis à jour : %d logement(s) enregistré(s).", len(housings))


def load_exclusions(path: str) -> Dict[str, List[str]]:
    """
    Charge le fichier des exclusions dynamiques (résidences et types de
    logement à ignorer), mis à jour automatiquement par le workflow
    `handle-exclusion.yml` quand quelqu'un clique sur un lien "Ignorer"
    dans un e-mail d'alerte.

    Retourne toujours un dictionnaire avec les clés "residences" et
    "types" (listes vides si le fichier n'existe pas encore ou est
    invalide) : ce n'est PAS un cas d'erreur bloquant, contrairement au
    cache principal, car l'absence d'exclusions est un état parfaitement
    normal (rien n'a encore été exclu).
    """
    default: Dict[str, List[str]] = {"residences": [], "types": []}

    if not os.path.exists(path):
        return default

    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning(
            "Impossible de lire le fichier d'exclusions '%s' (%s). "
            "Aucune exclusion dynamique ne sera appliquée pour ce cycle.",
            path,
            exc,
        )
        return default

    data.setdefault("residences", [])
    data.setdefault("types", [])
    return data
