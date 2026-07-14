# 🏠 CROUS Alert — Surveillance des logements CROUS à Grenoble

Système automatisé qui surveille en continu la disponibilité de logements
CROUS à Grenoble et envoie une alerte par e-mail dès qu'une résidence
apparaît dans les résultats de recherche.

---

## Sommaire

1. [Analyse et stratégie technique](#1-analyse-et-stratégie-technique)
2. [Architecture du projet](#2-architecture-du-projet)
3. [Installation locale](#3-installation-locale)
4. [Configuration](#4-configuration)
5. [Création d'un mot de passe d'application Gmail](#5-création-dun-mot-de-passe-dapplication-gmail)
6. [Configuration des GitHub Secrets](#6-configuration-des-github-secrets)
7. [Automatisation via GitHub Actions](#7-automatisation-via-github-actions)
8. [Fonctionnement interne](#8-fonctionnement-interne)
9. [Ajouter une nouvelle ville](#9-ajouter-une-nouvelle-ville)
10. [Résolution des problèmes courants](#10-résolution-des-problèmes-courants)
11. [Maintenance](#11-maintenance)
12. [Évolutions futures possibles](#12-évolutions-futures-possibles)

---

## 1. Analyse et stratégie technique

Avant d'écrire le moindre code, le fonctionnement du site
`trouverunlogement.lescrous.fr` a été analysé :

- Le site est une application **Svelte**, mais son rendu est effectué
  **côté serveur (SSR)** : une simple requête HTTP `GET` sur l'URL de
  recherche renvoie déjà le HTML complet contenant les logements
  disponibles, sans qu'aucun JavaScript ne doive être exécuté.
- Chaque logement est affiché dans une carte au format **DSFR** (Système
  de Design de l'État français) : `<div class="fr-card">`.
- Aucune API JSON publique dédiée n'a été identifiée : les données sont
  injectées directement dans le HTML lors du rendu serveur.

**Stratégie retenue : `requests` + `BeautifulSoup`.**

Pourquoi pas Playwright ? Parce que la page ne nécessite aucune
interaction JavaScript pour afficher les données. Utiliser un navigateur
headless ajouterait un coût inutile (temps d'exécution, RAM, taille de
l'image CI) pour un gain nul. Playwright resterait une option de repli
uniquement si le CROUS venait à modifier son site pour passer à un rendu
100% côté client (voir section Maintenance).

**Robustesse du parsing** : les classes CSS générées par le compilateur
Svelte (ex. `svelte-12dfls6`) changent à chaque déploiement du site et ne
sont donc pas fiables comme sélecteur à long terme. Le parseur
(`parser.py`) repose donc sur :
- le token de classe stable `fr-card` (convention DSFR, peu susceptible
  de changer) pour repérer les cartes ;
- des motifs de texte stables (`€`, `m²`, code postal à 5 chiffres) pour
  extraire les données, plutôt que des classes CSS précises.

---

## 2. Architecture du projet

```
crous-alert/
├── app.py                  # Point d'entrée : orchestre un cycle complet
├── checker.py               # Récupération HTML (retry/backoff) + détection des nouveautés
├── parser.py                 # Extraction des logements depuis le HTML
├── email_sender.py           # Construction et envoi de l'e-mail HTML/texte
├── config.py                 # Configuration centralisée (variables d'environnement)
├── storage.py                 # Modèle Housing + gestion du cache JSON
├── logger.py                  # Configuration du système de logs
├── utils.py                   # Retry/backoff, hachage, formatage de dates
├── exceptions.py               # Exceptions personnalisées
├── requirements.txt
├── .env.example                # Modèle de variables d'environnement (test local)
├── .gitignore
├── data/
│   └── cache.json              # Cache des logements déjà signalés
└── .github/workflows/
    └── monitor.yml              # Automatisation GitHub Actions
```

**Flux d'exécution** (`app.py`) :

1. `CrousChecker.fetch_html()` récupère la page (avec retry + backoff exponentiel).
2. `parser.parse_housings()` extrait la liste des logements.
3. `CrousChecker.check()` compare avec `data/cache.json` pour isoler les nouveautés.
4. Si des nouveautés existent : `EmailSender.send_new_housing_alert()` envoie l'e-mail.
5. Le cache n'est mis à jour **qu'après** un envoi réussi (ou s'il n'y avait rien
   de nouveau) : si l'e-mail échoue, la nouveauté sera de nouveau détectée
   au prochain cycle plutôt que d'être perdue silencieusement.

---

## 3. Installation locale

Prérequis : Python 3.11 ou supérieur.

```bash
git clone <url-de-votre-dépôt>
cd crous-alert
python3 -m venv venv
source venv/bin/activate        # Windows : venv\Scripts\activate
pip install -r requirements.txt
```

Copiez le modèle de configuration puis renseignez vos identifiants :

```bash
cp .env.example .env
```

Pour charger le fichier `.env` automatiquement, vous pouvez utiliser
`python-dotenv` (`pip install python-dotenv`) ou simplement exporter les
variables dans votre shell avant de lancer le script. Exemple rapide sans
dépendance supplémentaire :

```bash
export $(grep -v '^#' .env | xargs)
python app.py
```

Pour tester **sans envoyer de vrai e-mail** :

```bash
DRY_RUN=1 python app.py
```

---

## 4. Configuration

Toutes les options se règlent via variables d'environnement (voir
`config.py` pour la liste complète et les valeurs par défaut) :

| Variable              | Description                                         | Défaut                          |
|-----------------------|------------------------------------------------------|----------------------------------|
| `EMAIL_SENDER`         | Adresse Gmail expéditrice                             | *(requis)*                       |
| `EMAIL_PASSWORD`       | Mot de passe d'application Gmail                      | *(requis)*                       |
| `EMAIL_RECEIVER`       | Adresse destinataire des alertes                      | *(requis)*                       |
| `TARGET_URL`           | URL de recherche CROUS à surveiller                    | Recherche Grenoble (voir config.py) |
| `CITY_NAME`            | Nom de ville affiché dans les alertes                 | `Grenoble`                       |
| `REQUEST_TIMEOUT`      | Timeout HTTP (secondes)                               | `15`                              |
| `MAX_RETRIES`          | Nombre max. de tentatives (réseau et SMTP)             | `4`                               |
| `BACKOFF_BASE_SECONDS` | Délai de base du backoff exponentiel                   | `2`                               |
| `LOG_LEVEL`            | Niveau de log (`DEBUG`, `INFO`, `WARNING`, `ERROR`)    | `INFO`                            |
| `DRY_RUN`              | Si `1`/`true` : détecte mais n'envoie pas d'e-mail     | `false`                           |

---

## 5. Création d'un mot de passe d'application Gmail

**Important : n'utilisez jamais le mot de passe principal de votre compte
Gmail dans ce projet.** Gmail exige un « mot de passe d'application »
dédié pour l'envoi via SMTP par un programme tiers.

1. Activez la validation en deux étapes sur votre compte Google, si ce
   n'est pas déjà fait : https://myaccount.google.com/security
2. Rendez-vous sur https://myaccount.google.com/apppasswords
3. Donnez un nom à l'application (ex. « crous-alert ») et générez le
   mot de passe.
4. Copiez le mot de passe à 16 caractères généré : c'est la valeur à
   utiliser pour `EMAIL_PASSWORD` (pas votre mot de passe habituel).

---

## 6. Configuration des GitHub Secrets

Pour que GitHub Actions puisse envoyer les e-mails sans exposer vos
identifiants dans le code :

1. Ouvrez votre dépôt GitHub → onglet **Settings**.
2. Dans le menu de gauche : **Secrets and variables** → **Actions**.
3. Cliquez sur **New repository secret** et créez les trois secrets
   suivants :
   - `EMAIL_SENDER` → votre adresse Gmail
   - `EMAIL_PASSWORD` → le mot de passe d'application généré à l'étape 5
   - `EMAIL_RECEIVER` → l'adresse qui recevra les alertes

Ces secrets sont automatiquement injectés dans le workflow
(`.github/workflows/monitor.yml`) et ne sont jamais visibles dans les
logs ni dans le code source.

---

## 7. Automatisation via GitHub Actions

Une fois le dépôt poussé sur GitHub avec les secrets configurés, le
workflow `.github/workflows/monitor.yml` :

- s'exécute automatiquement **toutes les 10 minutes** ;
- peut aussi être lancé manuellement depuis l'onglet **Actions** du
  dépôt (bouton "Run workflow") ;
- committe automatiquement `data/cache.json` s'il a changé, afin que
  l'historique des logements déjà signalés soit conservé d'une
  exécution à l'autre (les runners GitHub Actions sont jetables).

**Étapes pour l'activer :**

1. Poussez ce projet sur un dépôt GitHub (public ou privé).
2. Configurez les 3 secrets (section précédente).
3. Le workflow démarre automatiquement à la prochaine échéance de cron.
   Vous pouvez aussi le déclencher immédiatement via Actions → Surveillance
   CROUS Grenoble → Run workflow.

**Remarque sur la fréquence** : GitHub n'autorise pas de cron plus
fréquent que toutes les 5 minutes, et n'exécute pas toujours le
déclenchement à l'heure exacte en cas de forte charge sur son
infrastructure (delai possible de quelques minutes). Un intervalle de
10 minutes est un bon compromis. Pour l'ajuster, modifiez la ligne
`cron:` dans `.github/workflows/monitor.yml` (syntaxe cron standard).

---

## 8. Fonctionnement interne

À chaque exécution :

```
[INFO] Connexion au site
[INFO] X logement(s) actuellement affiché(s) pour Grenoble.
[INFO] Nouveau logement trouvé : 1 nouveauté(s).     (ou "Aucun nouveau logement...")
[INFO] Envoi de l'e-mail d'alerte à ...
[INFO] Mail envoyé.
[INFO] Cache mis à jour : X logement(s) enregistré(s).
[INFO] Cycle de vérification terminé avec succès.
```

- Chaque logement reçoit un **identifiant unique** basé sur l'identifiant
  d'annonce présent dans son URL (`/accommodations/<id>`), garantissant
  qu'une même annonce n'est jamais signalée deux fois.
- En cas d'erreur réseau, de timeout ou d'erreur SMTP temporaire, le
  programme retente automatiquement avec un **backoff exponentiel**
  (délais croissants entre les tentatives) avant d'abandonner et de
  journaliser une erreur claire — sans jamais planter de façon brutale.
- Le cache n'est mis à jour qu'après un envoi d'e-mail réussi : si
  l'envoi échoue, l'alerte sera retentée au cycle suivant plutôt que
  d'être perdue.

---

## 9. Ajouter une nouvelle ville

Le projet est actuellement configuré pour Grenoble, mais son
architecture permet d'ajouter facilement d'autres villes :

1. Sur https://trouverunlogement.lescrous.fr, effectuez une recherche
   pour la ville souhaitée et copiez l'URL affichée (elle contient les
   coordonnées `bounds=...` de la zone).
2. Définissez la variable d'environnement (ou secret GitHub)
   `TARGET_URL` avec cette nouvelle URL, et `CITY_NAME` avec le nom de
   la ville.
3. Pour surveiller **plusieurs villes en parallèle**, la structure
   actuelle nécessiterait une petite extension : transformer
   `Settings.target_url` en une liste de cibles et boucler dessus dans
   `app.py` (une cible = une URL + un cache dédié, ex.
   `data/cache_grenoble.json`, `data/cache_lyon.json`). C'est une
   évolution volontairement simple à ajouter sans réécrire le reste de
   l'application (voir section suivante).

---

## 10. Résolution des problèmes courants

**Aucun e-mail reçu alors qu'un logement est bien apparu**
- Vérifiez les logs de l'exécution GitHub Actions (onglet Actions →
  dernière exécution → job "check").
- Vérifiez que les 3 secrets sont bien orthographiés exactement comme
  attendu (`EMAIL_SENDER`, `EMAIL_PASSWORD`, `EMAIL_RECEIVER`).
- Vérifiez que le mot de passe utilisé est bien un **mot de passe
  d'application** (16 caractères), pas le mot de passe du compte.
- Vérifiez vos spams : les premiers e-mails automatisés y atterrissent
  parfois.

**Erreur `ConfigurationError: Variables d'environnement manquantes`**
- Un ou plusieurs secrets ne sont pas définis. Revoir la section 6.

**Le programme dit "Aucun nouveau logement" alors que la page a changé**
- Il est possible que le CROUS ait légèrement modifié la structure HTML
  du site. Consultez les logs en niveau `DEBUG` (`LOG_LEVEL=DEBUG`) pour
  voir si le repli de détection des cartes s'active. Si le problème
  persiste, il faudra ajuster les sélecteurs dans `parser.py`.

**Erreur SMTP (`535 Authentication failed`)**
- Le mot de passe fourni n'est pas un mot de passe d'application valide,
  ou la validation en deux étapes n'est pas activée sur le compte.

**Le workflow GitHub Actions ne se déclenche pas automatiquement**
- Les workflows planifiés (`schedule`) sont automatiquement **désactivés
  par GitHub après 60 jours d'inactivité du dépôt**. Poussez un commit
  ou déclenchez le workflow manuellement pour le réactiver.

---

## 11. Maintenance

Ce site étant un service public sujet à évolutions, une surveillance
occasionnelle du bon fonctionnement est recommandée :

- Si le nombre de logements détectés reste bloqué à `0` de façon
  suspecte, comparez manuellement avec la page web pour vérifier que le
  parsing fonctionne toujours.
- Si le site venait à passer à un rendu 100% côté client (JavaScript),
  il faudrait remplacer `requests` par **Playwright** dans
  `checker.fetch_html()` (récupérer le HTML après exécution du JS) ; le
  reste de l'architecture (parser, cache, e-mail) resterait inchangé
  grâce au faible couplage entre modules.

---

## 12. Évolutions futures possibles

L'architecture modulaire (faible couplage entre `checker`, `parser`,
`storage` et `email_sender`) permet d'ajouter facilement, sans réécrire
l'application :

- **Plusieurs villes** : boucler sur une liste de cibles dans `app.py`.
- **Plusieurs destinataires** : `EMAIL_RECEIVER` peut devenir une liste
  séparée par des virgules, à séparer dans `config.py`.
- **Notifications Telegram / Discord / SMS** : ajouter un nouveau module
  `notifiers/telegram_sender.py` etc., avec la même interface que
  `EmailSender` (`send_new_housing_alert`), et les appeler depuis
  `app.py` en plus (ou à la place) de l'e-mail.
- **Base SQLite** : remplacer `CacheStore` par une implémentation
  utilisant `sqlite3`, en conservant la même interface (`load`/`save`).
- **Tableau de bord Web** : une petite app Flask/FastAPI qui lit
  `data/cache.json` pour afficher un historique.
- **Interface graphique** : un client desktop (ex. Tkinter/PyQt) ou une
  petite page web consommant les mêmes modules.
- **Docker** : un `Dockerfile` minimal (`python:3.11-slim`, `pip
  install -r requirements.txt`, `CMD ["python", "app.py"]`) suffit pour
  conteneuriser le projet tel quel.
- **Déploiement VPS** : remplacer le workflow GitHub Actions par un
  `cron` système ou un service `systemd` exécutant `python app.py` à
  intervalle régulier.

---

## Sécurité

- Aucun identifiant n'est écrit en dur dans le code : tout passe par des
  variables d'environnement / GitHub Secrets.
- Le fichier `.env` réel est exclu du dépôt via `.gitignore`.
- Le mot de passe d'application Gmail est révocable à tout moment depuis
  https://myaccount.google.com/apppasswords sans affecter le mot de
  passe principal du compte.
