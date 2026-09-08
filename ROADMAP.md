# Feuille de route — CROUS Alert

Ce document suit la transformation du script actuel en application web privée.

## Règle du MVP 0

Le projet commence avec les fonctions indispensables uniquement. Toute nouvelle
fonctionnalité doit être discutée, validée, qualifiée juridiquement puis ajoutée
à cette feuille de route avant son développement.

### Fonctions retenues pour le MVP 0

- [ ] Connexion et déconnexion.
- [ ] Demande de première connexion validée manuellement par l'administrateur.
- [ ] Tableau de bord simple.
- [ ] Création d'une surveillance pour une ville et, facultativement, certaines résidences.
- [ ] Liste, modification, pause et suppression des surveillances.
- [ ] Détection des nouvelles annonces sans doublon.
- [ ] E-mail contenant la résidence et le lien officiel CROUS.
- [ ] Sidebar fonctionnelle sur ordinateur et mobile.

## Convention de travail

- `work` : développement actif et tests locaux.
- `main` : version stable, après validation.
- Flux Git : `work` → validation → fusion dans `main`.
- Une fonctionnalité n'est cochée qu'après implémentation, tests et validation.
- Chaque décision fonctionnelle doit inclure un contrôle juridique et sécurité.

## Suivi opérationnel — ordre des prochaines étapes

Cette liste est notre point de reprise principal. Nous avançons dans cet ordre et
une tâche n'est cochée qu'après son test et sa validation.

- [x] Corriger le modèle d'e-mail de confirmation Supabase avec `/auth/confirm`.
- [ ] Tester l'inscription et la confirmation avec une adresse e-mail contrôlée.
- [ ] Transformer le premier compte validé en administrateur approuvé.
- [ ] Créer la page administrateur des demandes d'accès.
- [ ] Ajouter les actions Accepter/Refuser et l'e-mail d'acceptation.
- [ ] Simplifier le tableau de bord aux fonctionnalités indispensables.
- [ ] Créer les surveillances propres à chaque utilisateur.
- [ ] Connecter le bot Python aux surveillances enregistrées.
- [ ] Améliorer les modèles d'e-mail de confirmation et d'alerte.

## Légende juridique

- **Acceptable** : aucun obstacle juridique évident identifié.
- **À encadrer** : acceptable avec des précautions documentées.
- **À autoriser** : accord préalable du CNOUS ou d'un autre titulaire nécessaire.
- **À éviter** : risque juridique important.

> Cette qualification est une analyse pratique et ne remplace pas l'avis d'un juriste.

## Phase 0 — Cadrage du produit

- [x] Valider le parcours de demande et d'acceptation d'un compte.
- [x] Définir les rôles `admin` et `utilisateur`.
- [x] Définir le parcours de création d'une surveillance.
- [x] Définir les critères simples et avancés.
- [ ] Valider la fréquence et la stratégie des notifications (proposition rédigée).
- [x] Définir les conditions de pause, modification et suppression.
- [x] Décider si le service reste gratuit et privé.
- [x] Rédiger les limites d'usage et la mention de non-affiliation au CROUS.
- [ ] Contrôle juridique de la phase 0.

## Phase 1 — Architecture

- [x] Valider la technologie du frontend et du backend.
- [ ] Valider l'hébergement de l'application.
- [x] Valider PostgreSQL et le fournisseur d'authentification.
- [ ] Concevoir le modèle de données.
- [ ] Concevoir l'isolation des données entre utilisateurs.
- [ ] Définir l'architecture du worker de surveillance.
- [ ] Éviter de télécharger plusieurs fois la même zone pour différents utilisateurs.
- [ ] Concevoir la gestion des erreurs, logs et alertes techniques.
- [ ] Contrôle sécurité et juridique de la phase 1.

## Phase 2 — Comptes privés

- [x] Créer l'interface de demande de première connexion.
- [x] Connecter la demande à Supabase avec un statut d'approbation.
- [x] Créer la connexion et protéger le tableau de bord.
- [ ] Ajouter l'action de déconnexion dans l'interface.
- [ ] Créer la réinitialisation sécurisée du mot de passe.
- [ ] Créer la suspension et la réactivation d'un utilisateur.
- [x] Ajouter les politiques d'accès à la base de données.
- [ ] Ajouter les tests d'autorisation et d'isolation des comptes.
- [ ] Ajouter une politique de confidentialité et une procédure de suppression des données.
- [ ] Contrôle RGPD et sécurité de la phase 2.

## Phase 3 — Surveillances personnalisables

- [ ] Créer une surveillance par ville entière.
- [ ] Autoriser plusieurs villes dans une surveillance.
- [ ] Ajouter le filtrage par code postal.
- [ ] Ajouter l'inclusion de résidences précises.
- [ ] Ajouter l'exclusion de résidences.
- [ ] Ajouter les filtres de type, prix et surface.
- [ ] Permettre la modification, la pause, la duplication et la suppression.
- [ ] Valider les règles lorsqu'un filtre est vide ou contradictoire.
- [ ] Contrôle juridique de la collecte et de la réutilisation des données CROUS.

## Phase 4 — Moteur de surveillance

- [ ] Adapter le parseur actuel aux recherches multi-zones.
- [ ] Détecter un changement de structure du site au lieu de conclure à zéro résultat.
- [ ] Respecter une fréquence raisonnable et limiter la charge sur le site CROUS.
- [ ] Centraliser les annonces dans PostgreSQL.
- [ ] Associer chaque annonce aux surveillances correspondantes.
- [ ] Empêcher les alertes en double.
- [ ] Ajouter une politique de rétention et de suppression des anciennes annonces.
- [ ] Ajouter des tests avec des pages HTML enregistrées localement.
- [ ] Contrôle juridique et technique de la phase 4.

## Phase 5 — Notifications

- [ ] Choisir le fournisseur d'e-mails.
- [ ] Créer les modèles HTML et texte.
- [ ] Inclure le nom de la résidence et un lien explicite vers le site officiel CROUS.
- [ ] Mentionner la source, la date de détection et la non-affiliation au CROUS.
- [ ] Ajouter les préférences de notification.
- [ ] Ajouter l'historique des envois.
- [ ] Gérer les échecs, nouvelles tentatives et désinscriptions.
- [ ] Contrôle juridique des e-mails et des données personnelles.

## Phase 6 — Interface web

- [x] Initialiser le frontend Next.js avec React, TypeScript, Tailwind et ESLint.
- [x] Créer un premier prototype responsive du tableau de bord.
- [x] Créer l'interface de la page de connexion (connexion Supabase à venir).
- [ ] Créer le tableau de bord utilisateur.
- [ ] Créer l'assistant de création d'une surveillance.
- [ ] Créer les écrans de consultation et modification.
- [ ] Créer l'administration des utilisateurs.
- [x] Ajouter les états de chargement, erreurs et confirmations, avec une page dédiée après validation de l'e-mail.
- [ ] Vérifier l'accessibilité et l'affichage mobile.
- [ ] Contrôle juridique des textes, marques et éléments visuels.

## Phase 7 — Mise en production

- [ ] Configurer les environnements de développement, validation et production.
- [ ] Séparer et protéger tous les secrets.
- [x] Ajouter la première migration PostgreSQL pour les profils et les règles RLS.
- [ ] Ajouter les tests automatiques et la CI.
- [ ] Déployer une version de validation depuis `work`.
- [ ] Effectuer une recette complète.
- [ ] Documenter la restauration et la sauvegarde des données.
- [ ] Effectuer la revue finale sécurité, RGPD et juridique.
- [ ] Fusionner la version validée vers `main`.

## Décisions à prendre en premier

- [ ] Service strictement gratuit ou commercialisation future envisagée ?
- [ ] Invitation avec choix du mot de passe par l'utilisateur ou mot de passe imposé ?
- [ ] Une surveillance combine-t-elle plusieurs villes, ou une surveillance par ville ?
- [ ] Alerte unique, rappels périodiques, ou choix laissé à l'utilisateur ?
- [ ] Conservation souhaitée de l'historique des annonces et notifications ?
