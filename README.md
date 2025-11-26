# 🏹 Terrain de Tir à l'Arc - Gestion des Accès

> Application web professionnelle de gestion des terrains de tir à l'arc avec système d'authentification sécurisé, gestion des sessions en temps réel et reporting d'incidents.

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Security](https://img.shields.io/badge/security-hardened-green)](DEPLOYMENT.md)

---

## 📋 Table des Matières

- [Présentation](#-présentation)
- [Fonctionnalités](#-fonctionnalités)
- [Stack Technique](#-stack-technique)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Utilisation](#-utilisation)
- [Structure du Projet](#-structure-du-projet)
- [API Documentation](#-api-documentation)
- [Sécurité](#-sécurité)
- [Déploiement](#-déploiement)
- [Contribution](#-contribution)
- [Support](#-support)
- [Licence](#-licence)

---

## 🎯 Présentation

**Terrain de Tir à l'Arc** est une application web moderne conçue pour gérer l'accès et la sécurité des terrains de tir à l'arc. Elle permet aux administrateurs de suivre les sessions en temps réel, gérer les incidents, et assurer la conformité avec les réglementations de sécurité.

### Problématique

Les clubs de tir à l'arc ont besoin de :
- Contrôler l'accès aux terrains selon les niveaux de compétence
- Suivre qui est présent sur chaque terrain en temps réel
- Documenter les incidents pour la conformité réglementaire
- Notifier rapidement les responsables en cas de problème

### Solution

Cette application fournit :
- **Authentification sécurisée** avec JWT et refresh tokens
- **Gestion temps réel** des sessions via WebSocket
- **Reporting d'incidents** avec photos et catégorisation
- **Panel administrateur** avec statistiques et audit
- **Notifications email** automatiques pour les incidents critiques
- **PWA** pour utilisation mobile optimale

---

## ✨ Fonctionnalités

### Pour les Utilisateurs

- 🔐 **Connexion sécurisée** : Authentification JWT avec refresh tokens
- 📱 **Responsive & PWA** : Fonctionne sur mobile, tablette et desktop
- 🎯 **Déclaration de sessions** : Démarrer/terminer une session sur un terrain
- ⚠️ **Signalement d'incidents** : Reporter un problème avec photo (optionnel)
- 📊 **Tableau de bord** : Voir les terrains disponibles et occupés
- ⏱️ **Temps réel** : Mises à jour instantanées via WebSocket

### Pour les Administrateurs

- 👥 **Gestion utilisateurs** : Créer, modifier, désactiver des comptes
- 📈 **Statistiques** : Vue d'ensemble des sessions et incidents
- 🔍 **Historique complet** : Audit trail de toutes les actions
- ✉️ **Notifications email** : Alertes automatiques pour incidents critiques
- 🗂️ **Export de données** : Rapports au format CSV
- ⚙️ **Configuration SMTP** : Paramétrage des emails depuis l'interface

### Sécurité Renforcée

- 🔒 **HTTPS/TLS** : Chiffrement end-to-end
- 🛡️ **Helmet.js** : Protection contre les vulnérabilités OWASP
- ⏲️ **Rate Limiting** : Protection contre les attaques par force brute
- 🔑 **Secrets cryptographiques** : Générés automatiquement avec 256-bit entropy
- 📝 **Audit complet** : Logging de toutes les actions sensibles
- 🚫 **Validation stricte** : Sanitization des entrées avec express-validator

---

## 🛠️ Stack Technique

### Backend

- **Runtime** : Node.js 20.x (Alpine Linux)
- **Framework** : Express.js 4.18+
- **Base de données** : PostgreSQL 15
- **Authentication** : JSON Web Tokens (JWT)
- **WebSocket** : Socket.io 4.8+
- **Email** : Nodemailer 7.0+
- **Validation** : Joi + Express Validator
- **Sécurité** : Helmet, express-rate-limit
- **Logging** : Winston 3.10+

### Frontend

- **Vanilla JavaScript** : Aucune dépendance framework
- **CSS3** : Design moderne et responsive
- **PWA** : Service Worker pour mode hors-ligne
- **WebSocket Client** : Socket.io-client
- **Logger personnalisé** : Niveaux configurables (SILENT/ERROR/WARN/INFO/DEBUG)

### Infrastructure

- **Containerisation** : Docker + Docker Compose
- **Proxy** : Nginx avec TLS 1.2/1.3
- **Backups** : Automatisés quotidiennement (3h00)
- **Monitoring** : Health checks automatiques
- **CI/CD Ready** : Compatible Coolify, Render, DigitalOcean

---

## 📦 Prérequis

- **Docker** ≥ 20.10 (recommandé pour développement)
- **Docker Compose** ≥ 2.0
- **Node.js** ≥ 16.0.0 (si installation manuelle)
- **PostgreSQL** ≥ 13.0 (si installation manuelle)
- **Git** ≥ 2.30

---

## 🚀 Installation

### Option 1 : Installation avec Docker (Recommandé)

#### Développement

```bash
# Cloner le repository
git clone https://github.com/votre-username/terrain-tir-arc.git
cd terrain-tir-arc

# Copier le fichier d'environnement exemple
cp .env.example .env

# Démarrer les containers
docker-compose up -d

# L'application est accessible sur http://localhost
```

**Conteneurs démarrés :**
- `tirallarc-app` : Application Node.js (port 80)
- `tirallarc-db` : PostgreSQL 15 (port 5432)

#### Production

```bash
# Générer les secrets de production
node generate-secrets.js

# Démarrer en mode production
docker-compose -f docker-compose.prod.yml up -d --build

# Vérifier les logs
docker-compose -f docker-compose.prod.yml logs -f app
```

### Option 2 : Installation Manuelle

```bash
# Cloner le repository
git clone https://github.com/votre-username/terrain-tir-arc.git
cd terrain-tir-arc

# Installer les dépendances backend
cd server
npm install

# Créer la base de données PostgreSQL
psql -U postgres
CREATE DATABASE terrain_tir_arc;
CREATE USER terrain_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE terrain_tir_arc TO terrain_user;
\q

# Copier et configurer .env
cp ../.env.example .env
# Éditer .env avec vos paramètres

# Initialiser la base de données
node scripts/init-database.js

# Démarrer le serveur
npm start

# Le serveur est accessible sur http://localhost:3000
```

---

## ⚙️ Configuration

### Variables d'Environnement

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```bash
# === Base de données ===
DB_HOST=localhost
DB_PORT=5432
DB_NAME=terrain_tir_arc
DB_USER=terrain_user
DB_PASSWORD=votre_mot_de_passe_securise

# === Serveur ===
NODE_ENV=development
PORT=3000

# === Sécurité JWT ===
# IMPORTANT: Générez des secrets forts avec generate-secrets.js
JWT_SECRET=votre_secret_jwt_minimum_32_caracteres
JWT_REFRESH_SECRET=votre_secret_refresh_minimum_32_caracteres
SESSION_SECRET=votre_secret_session_minimum_32_caracteres

# === Chiffrement ===
ENCRYPTION_KEY=votre_cle_chiffrement_32_caracteres

# === Email (Optionnel) ===
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre_email@example.com
SMTP_PASSWORD=votre_mot_de_passe_smtp
EMAIL_FROM=noreply@terrain-tir-arc.com

# === Admin par défaut ===
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@localhost
ADMIN_PASSWORD=changeme_immediately
```

### Génération des Secrets de Production

**CRITIQUE** : Ne jamais utiliser les secrets par défaut en production !

```bash
# Générer automatiquement des secrets cryptographiques forts
node generate-secrets.js

# Cela créera .env.production avec des secrets de 256-bit
# Fichier ajouté automatiquement à .gitignore
```

### Configuration Email (Administrateur)

L'application permet de configurer les emails depuis l'interface administrateur :

1. Connectez-vous en tant qu'administrateur
2. Allez dans **Configuration** → **Email**
3. Entrez les paramètres SMTP de votre fournisseur
4. Testez la configuration avec le bouton **Tester**

Fournisseurs SMTP compatibles : Gmail, Outlook, SendGrid, Mailgun, etc.

---

## 📖 Utilisation

### Accès Utilisateur

1. **Page de connexion** : `http://localhost/`
   - Connectez-vous avec vos identifiants
   - Mot de passe oublié disponible

2. **Démarrer une session** :
   - Cliquez sur **Déclarer une session**
   - Sélectionnez le terrain et le type de tir
   - Confirmez pour démarrer

3. **Terminer une session** :
   - Sur le tableau de bord, cliquez sur votre session active
   - Cliquez sur **Terminer la session**

4. **Signaler un incident** :
   - Cliquez sur **Signaler un incident**
   - Remplissez le formulaire (photo optionnelle)
   - Soumettez le rapport

### Accès Administrateur

1. **Panel admin** : `http://localhost/admin/`
   - Connectez-vous avec un compte administrateur
   - **Utilisateur par défaut** : `admin` / `changeme_immediately`

2. **Gestion des utilisateurs** :
   - Créer / modifier / désactiver des comptes
   - Attribuer des rôles (user / admin)
   - Voir l'historique des connexions

3. **Gestion des incidents** :
   - Voir tous les incidents signalés
   - Marquer comme résolu / en cours
   - Ajouter des commentaires

4. **Statistiques** :
   - Vue d'ensemble des sessions actives
   - Historique des sessions par terrain
   - Graphiques d'utilisation

5. **Audit & Logs** :
   - Journal complet de toutes les actions
   - Filtrage par utilisateur / date / action
   - Export CSV pour analyse

---

## 📂 Structure du Projet

```
terrain-tir-arc/
├── server/                      # Backend Node.js
│   ├── config/
│   │   ├── database.js         # Configuration PostgreSQL avec pool
│   │   └── email.js            # Configuration Nodemailer
│   ├── middleware/
│   │   ├── auth.js             # Middleware JWT authentification
│   │   ├── security.js         # Helmet + rate limiting
│   │   ├── audit.js            # Middleware audit logging
│   │   └── validation.js       # Validation schemas Joi
│   ├── routes/
│   │   ├── auth.js             # Routes authentification (/api/v1/auth)
│   │   ├── sessions.js         # Routes sessions (/api/v1/sessions)
│   │   ├── incidents.js        # Routes incidents (/api/v1/incidents)
│   │   ├── users.js            # Routes utilisateurs (/api/v1/users)
│   │   ├── config.js           # Routes configuration (/api/v1/config)
│   │   └── email-config.js     # Routes config email (/api/v1/email-config)
│   ├── utils/
│   │   ├── encryption.js       # Chiffrement AES-256-GCM
│   │   ├── logger.js           # Winston logger
│   │   └── env-validator.js    # Validation environnement au démarrage
│   ├── scripts/
│   │   └── add-performance-indexes.sql  # 18 index PostgreSQL
│   ├── uploads/                # Photos incidents (généré)
│   ├── server.js               # Point d'entrée Express.js
│   └── package.json
│
├── admin/                       # Interface administrateur
│   ├── index.html              # Dashboard admin
│   ├── js/
│   │   ├── admin.js            # Logique admin
│   │   └── auth.js             # Gestion authentification
│   └── css/
│       └── admin.css           # Styles admin
│
├── js/                          # Frontend utilisateur
│   ├── app.js                  # Application principale
│   ├── auth.js                 # Gestion JWT & refresh
│   ├── logger.js               # Logger frontend configurable
│   └── socket-manager.js       # WebSocket client
│
├── css/
│   └── style.css               # Styles globaux responsive
│
├── images/                      # Assets visuels
│   ├── icon-192.png
│   └── icon-512.png
│
├── index.html                   # Page principale
├── declaration.html             # Formulaire déclaration session
├── incident.html                # Formulaire signalement incident
├── manifest.json                # PWA manifest
├── service-worker.js            # Service Worker PWA
│
├── docker-compose.yml           # Docker dev
├── docker-compose.prod.yml      # Docker production (sécurisé)
├── Dockerfile                   # Image Node.js 20-alpine
├── nginx.prod.conf              # Configuration Nginx HTTPS/TLS
│
├── generate-secrets.js          # Générateur secrets crypto
├── .env.example                 # Template configuration
├── .env.production              # Secrets production (gitignored)
├── .gitignore
│
├── DEPLOYMENT.md                # Guide déploiement complet
├── CONTRIBUTING.md              # Guide contribution
├── CHANGELOG.md                 # Historique versions
├── LICENSE                      # Licence MIT
└── README.md                    # Ce fichier
```

---

## 🔌 API Documentation

### Authentification

Toutes les routes API (sauf `/login` et `/register`) nécessitent un JWT dans le header :

```
Authorization: Bearer <votre_jwt_token>
```

### Endpoints Principaux

#### **POST** `/api/v1/auth/login`

Connexion utilisateur.

**Body** :
```json
{
  "username": "john_doe",
  "password": "SecurePass123!"
}
```

**Response** :
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "username": "john_doe",
    "role": "user"
  }
}
```

#### **GET** `/api/v1/sessions`

Récupérer toutes les sessions actives.

**Response** :
```json
{
  "sessions": [
    {
      "id": "uuid",
      "terrain": "A",
      "type_tireur": "adulte",
      "active": true,
      "date_debut": "2025-11-26T10:00:00Z",
      "username": "john_doe"
    }
  ]
}
```

#### **POST** `/api/v1/sessions`

Démarrer une nouvelle session.

**Body** :
```json
{
  "terrain": "A",
  "type_tireur": "adulte",
  "materiel": "arc_classique"
}
```

#### **POST** `/api/v1/incidents`

Signaler un incident (avec upload photo optionnel).

**Body** (multipart/form-data) :
```
type_incident: "securite"
description: "Flèche égarée zone interdite"
terrain: "B"
photo: <file>
```

**Response** :
```json
{
  "incident": {
    "id": "uuid",
    "type_incident": "securite",
    "statut": "en_attente",
    "photo_path": "/uploads/incident-123.jpg"
  }
}
```

### Versionnement API

L'API utilise le versionnement par URL :
- **v1** : `/api/v1/*` (version actuelle)
- **Rétrocompatibilité** : `/api/*` redirige vers `/api/v1/*`

---

## 🔒 Sécurité

### Mesures Implémentées

1. **Authentification & Autorisation**
   - JWT avec expiration courte (15 min)
   - Refresh tokens avec rotation
   - Bcrypt pour hash des mots de passe (cost 12)
   - Tokens stockés en HTTP-only cookies (option)

2. **Protection des Données**
   - Chiffrement AES-256-GCM pour données sensibles
   - TLS 1.2/1.3 en production
   - Secrets générés avec `crypto.randomBytes()` (256-bit)
   - Variables sensibles jamais committées (.gitignore)

3. **Protection Applicative**
   - Helmet.js : 11 protections OWASP
   - Rate limiting : 10 req/s API, 3 req/min login
   - Validation stricte avec Joi + Express Validator
   - Sanitization SQL (parameterized queries)
   - CSP headers, X-Frame-Options, HSTS

4. **Audit & Monitoring**
   - Logging Winston de toutes actions sensibles
   - Audit trail complet en base de données
   - Health checks Docker automatiques
   - Alertes email pour incidents critiques

5. **Infrastructure**
   - Docker : no-new-privileges, capabilities minimales
   - PostgreSQL : port 127.0.0.1 only en production
   - Nginx : OCSP stapling, modern ciphers
   - Backups automatiques quotidiens

### Recommandations

- ✅ **Toujours** utiliser `generate-secrets.js` pour la production
- ✅ **Toujours** activer HTTPS (Let's Encrypt gratuit)
- ✅ **Toujours** changer le mot de passe admin par défaut
- ✅ **Jamais** exposer PostgreSQL sur internet
- ✅ **Jamais** committer `.env` ou `.env.production`
- ✅ **Mettre à jour** régulièrement les dépendances : `npm audit fix`

### Rapports de Vulnérabilités

Si vous découvrez une faille de sécurité, veuillez **NE PAS** créer d'issue publique. Contactez-nous directement à :
- **Email** : security@terrain-tir-arc.com

---

## 🚢 Déploiement

Consultez [DEPLOYMENT.md](DEPLOYMENT.md) pour le guide complet de déploiement.

### Déploiement Rapide avec Coolify

1. **Créer un projet Docker Compose** dans Coolify
2. **Importer les variables** depuis `.env.production`
3. **Sélectionner** `docker-compose.prod.yml`
4. **Déployer** : Coolify gère automatiquement HTTPS avec Let's Encrypt

### Déploiement Manuel

```bash
# Générer les secrets
node generate-secrets.js

# Build et démarrage
docker-compose -f docker-compose.prod.yml up -d --build

# Vérifier les logs
docker-compose -f docker-compose.prod.yml logs -f

# Health check
curl https://votre-domaine.com/health
```

### Plateformes Supportées

- ✅ Coolify (recommandé)
- ✅ Docker Swarm
- ✅ Kubernetes (nécessite adaptation)
- ✅ VPS (Ubuntu/Debian)
- ✅ Render.com
- ✅ DigitalOcean App Platform

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Consultez [CONTRIBUTING.md](CONTRIBUTING.md) pour les directives.

### Processus de Contribution

1. **Fork** le projet
2. **Créer une branche** : `git checkout -b feature/AmazingFeature`
3. **Commiter** : `git commit -m 'feat: Add AmazingFeature'`
4. **Pusher** : `git push origin feature/AmazingFeature`
5. **Ouvrir une Pull Request**

### Standards de Code

- Code propre et documenté
- Tests unitaires si applicable
- Commits conventionnels (feat, fix, docs, etc.)
- Documentation mise à jour

---

## 📞 Support

### Documentation

- 📖 [Guide de déploiement](DEPLOYMENT.md)
- 🛠️ [Guide de contribution](CONTRIBUTING.md)
- 📝 [Changelog](CHANGELOG.md)

### FAQ

**Q : Comment réinitialiser le mot de passe admin ?**
```bash
docker-compose exec app node scripts/reset-admin-password.js
```

**Q : Comment voir les logs en temps réel ?**
```bash
docker-compose logs -f app
```

**Q : Comment faire un backup manuel ?**
```bash
docker-compose exec postgres pg_dump -U terrain_user terrain_tir_arc > backup.sql
```

---

## 📄 Licence

Ce projet est sous licence MIT. Voir [LICENSE](LICENSE) pour plus de détails.

---

## 🙏 Remerciements

- [Express.js](https://expressjs.com/) - Framework web
- [PostgreSQL](https://www.postgresql.org/) - Base de données
- [Socket.io](https://socket.io/) - WebSocket temps réel
- [Helmet.js](https://helmetjs.github.io/) - Sécurité HTTP
- [Docker](https://www.docker.com/) - Containerisation
- [Coolify](https://coolify.io/) - Plateforme de déploiement

---

<p align="center">
  Développé avec ❤️ pour la communauté du tir à l'arc
</p>

<p align="center">
  <a href="#-table-des-matières">⬆️ Retour en haut</a>
</p>
