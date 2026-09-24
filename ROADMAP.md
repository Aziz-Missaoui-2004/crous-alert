# Feuille de route — CROUS Alert

Application web privée de surveillance des logements CROUS.

## Principes de travail

- Le bot Python historique reste exécutable pendant toute la migration.
- Toute modification du bot doit avoir un test de non-régression.
- Une fonctionnalité est ajoutée seulement si elle est utile au parcours réel.
- Aucun doublon entre les pages, les données ou les actions.
- Chaque changement est vérifié côté frontend, Supabase et worker.
- Les textes sont courts, explicites et orientés action.
- Le frontend reste sobre : peu d’écrans, peu d’indicateurs, aucune décoration sans utilité.
- Les erreurs techniques doivent être visibles et exploitables par l’administrateur.

## Périmètre du MVP

Le MVP doit permettre :

- demander un accès et confirmer son adresse e-mail ;
- approuver ou refuser un compte depuis l’administration ;
- se connecter et se déconnecter ;
- créer une surveillance sur une seule zone ou ville ;
- sélectionner toutes les résidences ou certaines résidences ;
- filtrer par type, prix maximal et surface minimale ;
- consulter, modifier, mettre en pause et supprimer ses surveillances ;
- détecter une nouvelle annonce sans doublon ;
- envoyer une alerte avec les informations essentielles et le lien officiel CROUS ;
- afficher l’état minimal du service à l’administrateur.

Règle de notification initiale : une seule alerte par annonce et par surveillance.
Les rappels configurables seront ajoutés après validation de cette règle.

## Ordre de réalisation

### 1. Stabiliser les comptes

- Tester l’inscription, la confirmation e-mail et la connexion avec Supabase.
- Vérifier la création automatique du profil.
- Vérifier l’approbation et le refus d’un compte.
- Ajouter la réinitialisation du mot de passe.
- Ajouter la suspension et la réactivation d’un utilisateur.
- Tester l’isolation RLS entre deux comptes.

### 2. Simplifier l’interface

- Remplacer le dashboard fictif par un tableau de bord minimal réel.
- Afficher uniquement les surveillances de l’utilisateur connecté.
- Créer l’écran de création d’une surveillance.
- Créer les écrans de modification, pause et suppression.
- Garder une navigation administrateur séparée de l’espace utilisateur.
- Supprimer les graphiques, compteurs et éléments décoratifs non alimentés par de vraies données.
- Vérifier l’accessibilité et l’affichage mobile essentiel.

### 3. Concevoir les données

- Créer les tables des zones, résidences, surveillances et critères.
- Ajouter les relations entre utilisateurs et surveillances.
- Ajouter les règles RLS pour empêcher tout accès croisé.
- Définir l’identifiant stable d’une annonce et son empreinte de contenu.
- Définir la conservation et la suppression des anciennes données.

### 4. Construire le worker séparé

- Ne pas remplacer directement le bot historique.
- Réutiliser le parsing seulement après ajout de tests HTML locaux.
- Télécharger chaque zone une seule fois par cycle.
- Appliquer les critères de toutes les surveillances concernées.
- Détecter les changements de structure du site au lieu de conclure à zéro résultat.
- Empêcher les cycles concurrents entre GitHub Actions et Cron-job.
- Enregistrer le dernier cycle, les erreurs et les résultats essentiels.

### 5. Ajouter les notifications

- Utiliser `crous.alerte.sender@gmail.com` avec un mot de passe d’application.
- Créer un modèle court en texte et HTML.
- Inclure résidence, ville, prix, surface, type, date de détection et lien officiel.
- Ajouter la mention de non-affiliation au CROUS.
- Enregistrer chaque notification envoyée.
- Gérer les échecs et les nouvelles tentatives sans doublon.

### 6. Valider avant extension

- Tester un cycle complet avec un compte et une surveillance.
- Tester deux utilisateurs avec des critères différents.
- Tester une même zone surveillée par plusieurs utilisateurs.
- Tester une annonce qui disparaît puis réapparaît.
- Tester une panne réseau et un changement HTML.
- Tester les permissions utilisateur et administrateur.
- Déployer une version de validation avant toute migration définitive.

## Fonctionnalités reportées

- rappels configurables ;
- plusieurs zones dans une même surveillance ;
- historique détaillé et statistiques ;
- graphiques ;
- recherche globale ;
- thème sombre ou effets visuels ;
- réservation ou action automatisée sur le site CROUS ;
- paiement, abonnement et ouverture publique ;
- application mobile native.

## Décisions fixées

- Application privée et non commerciale.
- Utilisateurs validés manuellement.
- Premier administrateur déjà créé.
- Une zone par surveillance pour le MVP.
- Alerte unique par annonce par défaut.
- Rappels après stabilisation de la déduplication.
- Worker web séparé du bot historique.
- Frontend minimaliste et fonctionnel avant toute extension visuelle.

## Hébergement

À décider après validation locale du MVP :

- frontend ;
- worker ;
- déclenchement fréquent ;
- sauvegardes et restauration.
