"""
scripts/handle_exclusion.py
============================

Traite une "demande d'exclusion" reçue via la création d'une issue
GitHub (déclenchée par un clic sur un lien "Ignorer" dans un e-mail
d'alerte CROUS).

Titre d'issue attendu :
    exclure-residence:<nom de la résidence>
    exclure-type:<type de logement>   (ex: Colocation)

Met à jour data/exclusions.json en conséquence, et écrit un message de
confirmation dans exclusion_result.txt (repris par le workflow pour
commenter puis fermer l'issue).

Script volontairement autonome (pas d'import depuis le reste du projet)
pour rester simple et fiable dans le contexte d'un workflow séparé.
"""

from __future__ import annotations

import json
import os
import sys
from urllib.parse import unquote_plus

EXCLUSIONS_PATH = os.path.join("data", "exclusions.json")
RESULT_PATH = "exclusion_result.txt"

_KNOWN_TYPES = ("individuel", "couple", "colocation")


def load_exclusions() -> dict:
    if not os.path.exists(EXCLUSIONS_PATH):
        return {"residences": [], "types": []}
    try:
        with open(EXCLUSIONS_PATH, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, json.JSONDecodeError):
        data = {}
    data.setdefault("residences", [])
    data.setdefault("types", [])
    return data


def save_exclusions(data: dict) -> None:
    os.makedirs(os.path.dirname(EXCLUSIONS_PATH) or ".", exist_ok=True)
    with open(EXCLUSIONS_PATH, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)


def write_result(message: str) -> None:
    with open(RESULT_PATH, "w", encoding="utf-8") as fh:
        fh.write(message)
    print(message)


def main() -> int:
    raw_title = os.environ.get("ISSUE_TITLE", "").strip()
    title = unquote_plus(raw_title)

    data = load_exclusions()

    if title.lower().startswith("exclure-residence:"):
        value = title.split(":", 1)[1].strip()
        if not value:
            write_result("Nom de résidence vide dans le titre de l'issue, rien à faire.")
            return 0
        existing = [r.lower() for r in data["residences"]]
        if value.lower() in existing:
            write_result(f"Résidence '{value}' déjà exclue, rien à faire.")
            return 0
        data["residences"].append(value)
        save_exclusions(data)
        write_result(
            f"Résidence '{value}' ajoutée à la liste des exclusions. "
            "Elle ne sera plus signalée par e-mail à partir du prochain cycle."
        )
        return 0

    if title.lower().startswith("exclure-type:"):
        value = title.split(":", 1)[1].strip()
        if not value:
            write_result("Type de logement vide dans le titre de l'issue, rien à faire.")
            return 0
        existing = [t.lower() for t in data["types"]]
        if value.lower() in existing:
            write_result(f"Type de logement '{value}' déjà exclu, rien à faire.")
            return 0
        if value.lower() not in _KNOWN_TYPES:
            write_result(
                f"Type de logement '{value}' non reconnu (attendu : Individuel, "
                "Couple ou Colocation). Ajouté quand même tel quel, à vérifier."
            )
        data["types"].append(value)
        save_exclusions(data)
        write_result(
            f"Type de logement '{value}' ajouté à la liste des exclusions. "
            "Il ne sera plus signalé par e-mail à partir du prochain cycle."
        )
        return 0

    write_result(f"Titre d'issue non reconnu, aucune action effectuée : {title}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
