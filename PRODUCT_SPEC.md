# Spécification produit — CROUS Alert

## 1. Vision

CROUS Alert est une application web privée qui aide un groupe limité
d'utilisateurs autorisés à surveiller les logements publiés sur le site
officiel du CROUS.

L'application ne réserve aucun logement à la place de l'utilisateur. Elle
détecte une disponibilité correspondant à ses critères, lui envoie une alerte
et le redirige vers la page officielle du CROUS pour poursuivre sa demande.

## 2. Périmètre du MVP 0

Le MVP 0 reste volontairement minimal. Il doit seulement permettre de :

1. se connecter avec une adresse e-mail et un mot de passe ;
2. permettre d'envoyer une demande de première connexion ;
3. soumettre chaque demande à l'acceptation manuelle de l'administrateur ;
4. créer une surveillance simple pour une ville, avec des résidences
   facultatives ;
5. afficher les surveillances de l'utilisateur ;
6. modifier, mettre en pause ou supprimer une surveillance ;
7. envoyer une seule alerte par nouvelle annonce correspondante ;
8. fournir dans l'e-mail le nom de la résidence et le lien officiel CROUS ;
9. se déconnecter.

### Fonctionnalités reportées après le MVP 0

- surveillance de plusieurs villes dans une même configuration ;
- filtres avancés par prix, surface, code postal ou type de logement ;
- rappels périodiques ;
- historique détaillé et statistiques ;
- graphiques d'activité ;
- thème sombre ;
- personnalisation avancée des notifications ;
- paiement, abonnement ou commercialisation ;
- réservation ou soumission automatique d'un dossier CROUS ;
- application mobile native.

Chaque fonctionnalité reportée devra être discutée et ajoutée à la feuille de
route avant son développement.

## 3. Utilisateurs et rôles

### Administrateur

L'administrateur peut :

- inviter ou créer un utilisateur autorisé ;
- suspendre ou réactiver son accès ;
- consulter l'état technique global du service ;
- gérer les paramètres communs nécessaires au fonctionnement du bot.

Il ne doit pas pouvoir consulter le mot de passe d'un utilisateur. La solution
préférée est une invitation par e-mail permettant à l'utilisateur de choisir
son propre mot de passe.

### Utilisateur

L'utilisateur peut :

- se connecter et gérer son propre compte ;
- consulter uniquement ses propres surveillances ;
- créer, modifier, mettre en pause et supprimer ses surveillances ;
- consulter ses propres correspondances et notifications.

## 4. Parcours principal

### Accès

1. L'utilisateur renseigne son nom, son prénom, son e-mail et son mot de passe.
2. Supabase gère le mot de passe ; il n'est jamais stocké dans la table des demandes.
3. Le compte reste en attente jusqu'à la décision de l'administrateur.
4. Une fois accepté, l'utilisateur peut se connecter avec le mot de passe choisi.
5. Un compte en attente, refusé ou suspendu ne peut pas accéder à l'application.

### Création d'une surveillance

L'assistant de création comporte quatre étapes :

1. **Zone** : une ou plusieurs villes, avec codes postaux facultatifs.
2. **Résidences** : toutes les résidences de la zone ou une sélection précise.
3. **Critères** : type de logement, prix maximal et surface minimale.
4. **Alertes** : adresse de notification et stratégie de rappel.

Un résumé est affiché avant activation.

### Gestion

Le tableau de bord affiche pour chaque surveillance :

- son nom ;
- les villes et résidences suivies ;
- son état (`active`, `en pause` ou `en erreur`) ;
- la date de dernière vérification ;
- le nombre de correspondances récentes ;
- les actions modifier, mettre en pause, dupliquer et supprimer.

## 5. Modèle des critères

Chaque surveillance possède :

- un nom libre ;
- une ou plusieurs villes ;
- zéro ou plusieurs codes postaux ;
- un mode de résidence : `toutes`, `inclusions` ou `toutes sauf exclusions` ;
- zéro ou plusieurs résidences incluses ou exclues ;
- zéro ou plusieurs types de logement ;
- un prix maximal facultatif ;
- une surface minimale facultative ;
- une stratégie de notification ;
- un état actif ou en pause.

Une liste vide de types signifie « tous les types ». Un prix ou une surface
non renseigné signifie qu'aucune limite correspondante n'est appliquée.

## 6. Notifications

Deux stratégies sont envisagées :

- `unique` : une seule alerte par annonce et par surveillance ;
- `rappel` : nouvelle alerte après un délai défini tant que l'annonce reste
  disponible.

Le mode `unique` est proposé comme valeur par défaut afin d'éviter le spam.

Chaque e-mail contient au minimum :

- le nom de la résidence ;
- la ville et l'adresse disponibles ;
- le prix, la surface et le type disponibles ;
- la date de détection ;
- un lien explicite vers l'annonce officielle du CROUS ;
- la mention « Service indépendant, non affilié au CROUS ».

## 7. Règles du moteur de surveillance

- Une même page ou zone ne doit être téléchargée qu'une fois par cycle, même
  si plusieurs utilisateurs la surveillent.
- Le moteur compare ensuite les annonces obtenues aux critères de toutes les
  surveillances concernées.
- Une absence soudaine de cartes ne doit pas être considérée automatiquement
  comme une absence de logements : un changement du site doit générer une
  alerte technique.
- Les erreurs temporaires déclenchent des tentatives espacées.
- Aucune réservation ou action authentifiée n'est automatisée sur le site du
  CROUS.

## 8. Vie privée et sécurité

- Aucune inscription publique.
- Mots de passe hachés et gérés par un fournisseur d'authentification éprouvé.
- Isolation stricte des données de chaque utilisateur.
- Secrets absents du dépôt Git.
- Collecte limitée aux données nécessaires au service.
- Suppression du compte et des données associées sur demande.
- Journalisation sans mot de passe, jeton ou autre secret.

## 9. Cadre juridique initial

**Qualification actuelle : à encadrer.**

Le MVP reste privé et non commercial. Il affiche des informations factuelles
limitées et renvoie vers le site officiel. Il doit citer le CROUS comme source,
indiquer la date de détection et ne pas utiliser les photographies ou éléments
graphiques protégés du site.

Le moteur doit conserver une fréquence raisonnable, respecter les protections
techniques du site et ne pas accéder aux pages nécessitant une authentification.
Toute commercialisation ou réutilisation publicitaire est exclue tant qu'une
autorisation écrite du CNOUS n'a pas été obtenue.

## 10. Décisions encore ouvertes

- Invitation sécurisée ou mot de passe initial imposé par l'administrateur.
- Une surveillance multi-villes ou une surveillance distincte par ville.
- Mode `unique` seulement ou possibilité d'activer des rappels.
- Durée de conservation de l'historique.
- Hébergement définitif du frontend, du backend et du worker.
