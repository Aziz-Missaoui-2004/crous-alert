"""
exceptions.py
=============

Exceptions personnalisées utilisées dans tout le projet.

Centraliser les exceptions permet :
- une gestion d'erreurs explicite et ciblée dans checker.py / app.py ;
- des messages d'erreur clairs dans les logs ;
- une évolution future simple (ajout de nouveaux types d'erreurs).
"""


class CrousAlertError(Exception):
    """Exception de base pour toutes les erreurs propres à l'application."""


class FetchError(CrousAlertError):
    """
    Levée lorsque la récupération de la page CROUS échoue définitivement
    (après épuisement des tentatives de retry).
    """


class ParsingError(CrousAlertError):
    """
    Levée lorsque le contenu HTML récupéré ne peut pas être interprété
    correctement (structure inattendue, aucune donnée exploitable, etc.).
    """


class EmailSendError(CrousAlertError):
    """
    Levée lorsque l'envoi d'un e-mail échoue définitivement
    (après épuisement des tentatives de retry).
    """


class StorageError(CrousAlertError):
    """
    Levée en cas de problème de lecture/écriture du cache
    (fichier corrompu, JSON invalide, droits insuffisants, etc.).
    """


class ConfigurationError(CrousAlertError):
    """
    Levée lorsqu'une variable de configuration requise est absente
    ou invalide (ex : variables d'environnement manquantes).
    """
