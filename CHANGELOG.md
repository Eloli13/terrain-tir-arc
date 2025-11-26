# Changelog

Tous les changements notables de ce projet seront documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Versioning Sémantique](https://semver.org/lang/fr/).

## [Non publié]

### À venir
- Tests automatisés avec Jest
- CI/CD avec GitHub Actions
- Monitoring avec Prometheus
- Internationalisation (i18n)

---

## [1.0.0] - 2025-01-26

### 🎉 Version Initiale Stable

Première version stable et prête pour la production de l'application de gestion des terrains de tir à l'arc.

### ✨ Ajouté

#### Authentification & Sécurité
- Système d'authentification JWT avec access et refresh tokens
- Bcrypt pour le hachage sécurisé des mots de passe (cost 12)
- Middleware de vérification des tokens
- Rate limiting sur les endpoints sensibles (10 req/s API, 3 req/min login)
- Protection Helmet.js contre les vulnérabilités OWASP
- Validation stricte des entrées avec Joi et Express Validator
- Chiffrement AES-256-GCM pour les données sensibles
- Générateur de secrets cryptographiques (`generate-secrets.js`)
- Validation automatique des variables d'environnement au démarrage
- Middleware d'audit pour tracer toutes les actions sensibles

#### Gestion des Sessions
- Création de sessions de tir par terrain
- Suivi en temps réel des sessions actives via WebSocket (Socket.io)
- Historique complet des sessions
- Filtrage par terrain, type de tireur, et période
- Export des données de sessions
- Notifications temps réel pour les changements de statut

#### Gestion des Incidents
- Signalement d'incidents avec catégorisation
- Upload de photos pour documentation
- Workflow de résolution (en_attente → en_cours → résolu)
- Notifications email automatiques pour incidents critiques
- Historique et suivi complet
- Notes de résolution

#### Interface Administrateur
- Tableau de bord avec statistiques en temps réel
- Gestion complète des utilisateurs (CRUD)
- Gestion des rôles (user / admin)
- Vue d'ensemble des sessions et incidents
- Journal d'audit avec filtrage avancé
- Export de données (CSV, logs)
- Configuration SMTP depuis l'interface
- Statistiques d'utilisation par terrain

#### Email & Notifications
- Configuration SMTP dynamique via l'interface admin
- Chiffrement des identifiants SMTP en base de données
- Test de configuration email
- Notifications automatiques pour incidents de sécurité
- Templates d'emails personnalisables
- Support multi-fournisseurs (Gmail, Outlook, SendGrid, etc.)

#### API REST
- API RESTful versionnée (/api/v1/*)
- Rétrocompatibilité avec /api/*
- Documentation des endpoints
- Codes de statut HTTP appropriés
- Messages d'erreur descriptifs
- Pagination sur les endpoints de liste

#### Base de Données
- PostgreSQL 15 avec schéma optimisé
- 18 index de performance pour requêtes fréquentes
- Migrations automatiques au démarrage
- Contraintes d'intégrité référentielle
- Audit trail complet
- Scripts de backup automatisés

#### Infrastructure
- Containerisation Docker multi-stage
- Docker Compose pour développement
- docker-compose.prod.yml sécurisé pour production
- Node.js 20-alpine (réduction vulnérabilités)
- Nginx avec configuration TLS 1.2/1.3
- Health checks automatiques
- Logs structurés avec Winston
- Backups PostgreSQL quotidiens à 3h00 (rétention 30 jours)

#### Frontend
- Interface utilisateur responsive (mobile-first)
- PWA avec Service Worker
- Mode hors-ligne basique
- WebSocket client pour mises à jour temps réel
- Logger frontend configurable (SILENT/ERROR/WARN/INFO/DEBUG)
- Persistance des niveaux de log dans localStorage
- Design moderne et accessible

#### Documentation
- README.md complet avec badges et structure professionnelle
- CONTRIBUTING.md avec guide de contribution détaillé
- DEPLOYMENT.md avec instructions Coolify et manuelles
- Documentation API avec exemples
- Guide de sécurité et recommandations
- FAQ et troubleshooting

#### Sécurité
- Secrets générés avec crypto.randomBytes() (256-bit entropy)
- HTTPS/TLS obligatoire en production
- PostgreSQL non exposé (127.0.0.1 only)
- Docker : no-new-privileges, capabilities minimales
- Content Security Policy (CSP)
- HSTS, X-Frame-Options, X-Content-Type-Options
- OCSP stapling pour certificats SSL
- Protection CSRF
- Sanitization SQL (requêtes paramétrées)
- Aucun secret hardcodé (.gitignore approprié)

### 🔧 Modifié
- Migration de Node.js 18 vers Node.js 20-alpine
- Optimisation des performances avec indexes PostgreSQL
- Amélioration de la structure du code (DRY avec middleware audit)
- Refactoring des routes pour API versioning

### 🐛 Corrigé
- 3 vulnérabilités npm (js-yaml, validator, express-validator)
- Fuite de mémoire dans le pool PostgreSQL
- Rate limiting inconsistent entre endpoints
- Refresh tokens non invalidés à la déconnexion
- Logs excessifs en console de développement

### 🔒 Sécurité
- 0 vulnérabilités npm
- Réduction des vulnérabilités Docker : -1 High, -2 Medium
- Secrets production générés cryptographiquement
- Audit complet de sécurité effectué

### 📦 Dépendances

#### Backend
- express@4.18.2
- pg@8.11.3 (PostgreSQL client)
- bcrypt@5.1.0
- jsonwebtoken@9.0.2
- socket.io@4.8.1
- nodemailer@7.0.7
- helmet@7.0.0
- express-rate-limit@6.8.1
- express-validator@7.0.1
- joi@17.9.2
- winston@3.10.0
- multer@2.0.2
- compression@1.7.4
- cors@2.8.5
- dotenv@16.3.1

#### DevDependencies
- nodemon@3.0.1
- jest@29.6.2
- supertest@6.3.3

### 📋 Configuration

#### Variables d'Environnement Requises
```env
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
NODE_ENV, PORT
JWT_SECRET, JWT_REFRESH_SECRET, SESSION_SECRET
ENCRYPTION_KEY
SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM
ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD
```

#### Fichiers de Configuration
- `.env.example` : Template de configuration
- `.env.production` : Configuration production (généré)
- `docker-compose.yml` : Développement
- `docker-compose.prod.yml` : Production
- `nginx.prod.conf` : Configuration Nginx HTTPS

### 🚀 Déploiement

#### Plateformes Supportées
- Coolify (recommandé, HTTPS automatique)
- Docker Swarm
- VPS avec Docker
- Render.com
- DigitalOcean App Platform

#### Prérequis Production
- Docker ≥ 20.10
- Docker Compose ≥ 2.0
- 2 CPU cores, 2GB RAM minimum
- 10GB stockage
- Domaine avec DNS configuré (pour HTTPS)

### 📊 Statistiques

- **Lignes de code** : ~8000
- **Fichiers** : ~60
- **Routes API** : 25+
- **Endpoints** : 40+
- **Tables PostgreSQL** : 6
- **Index de performance** : 18
- **Vulnérabilités** : 0

---

## [0.9.0] - 2025-01-20

### Version Beta - Tests et Optimisations

### Ajouté
- Interface administrateur complète
- Export de données CSV
- Statistiques avancées
- Audit logging middleware
- Validation environnement

### Modifié
- Amélioration UI/UX responsive
- Optimisation requêtes base de données
- Refactoring code pour réutilisabilité

### Corrigé
- Bugs WebSocket reconnexion
- Problèmes d'affichage mobile
- Validation formulaires

---

## [0.8.0] - 2025-01-15

### Version Alpha - Fonctionnalités Core

### Ajouté
- Système d'authentification JWT
- Gestion sessions de tir
- Gestion incidents avec photos
- WebSocket temps réel
- Configuration email SMTP

### Modifié
- Architecture backend restructurée
- Migration vers PostgreSQL

---

## [0.5.0] - 2025-01-10

### Prototype Initial

### Ajouté
- Interface utilisateur basique
- Connexion/déconnexion
- Déclaration de sessions simples
- Base de données locale (localStorage)

---

## Types de Changements

- `Ajouté` : Nouvelles fonctionnalités
- `Modifié` : Changements dans les fonctionnalités existantes
- `Déprécié` : Fonctionnalités bientôt supprimées
- `Supprimé` : Fonctionnalités supprimées
- `Corrigé` : Corrections de bugs
- `Sécurité` : Correctifs de vulnérabilités

## Versioning Sémantique

Étant donné un numéro de version `MAJEUR.MINEUR.CORRECTIF` :

- **MAJEUR** : Changements incompatibles de l'API
- **MINEUR** : Ajout de fonctionnalités rétrocompatibles
- **CORRECTIF** : Corrections de bugs rétrocompatibles

---

## Liens

- [Repository GitHub](https://github.com/votre-username/terrain-tir-arc)
- [Documentation](README.md)
- [Guide de Déploiement](DEPLOYMENT.md)
- [Guide de Contribution](CONTRIBUTING.md)

---

**Note** : Les dates sont au format ISO 8601 (YYYY-MM-DD).

[Non publié]: https://github.com/votre-username/terrain-tir-arc/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/votre-username/terrain-tir-arc/releases/tag/v1.0.0
[0.9.0]: https://github.com/votre-username/terrain-tir-arc/releases/tag/v0.9.0
[0.8.0]: https://github.com/votre-username/terrain-tir-arc/releases/tag/v0.8.0
[0.5.0]: https://github.com/votre-username/terrain-tir-arc/releases/tag/v0.5.0
