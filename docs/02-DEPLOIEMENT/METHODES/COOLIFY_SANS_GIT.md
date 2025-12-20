# Coolify : Déploiement SANS Git

> **⚠️ ATTENTION - DOCUMENTATION OBSOLÈTE**
>
> Ce guide contient des méthodes obsolètes et des références à `database.sql` (fichier **SUPPRIMÉ**).
>
> **👉 Méthode recommandée:** [DEPLOIEMENT_PRODUCTION.md](../../../DEPLOIEMENT_PRODUCTION.md) (déploiement via Git)
>
> Les déploiements sans Git ne sont **PAS recommandés** pour la production.

---

**Guide complet des méthodes de déploiement dans Coolify**
**Date : 2025-01-15**

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Méthode 1 : Dockerfile personnalisé](#méthode-1--dockerfile-personnalisé)
3. [Méthode 2 : Docker Compose](#méthode-2--docker-compose)
4. [Méthode 3 : Docker Image (Registry)](#méthode-3--docker-image-registry)
5. [Méthode 4 : Simple Dockerfile](#méthode-4--simple-dockerfile)
6. [Méthode 5 : Via API Coolify](#méthode-5--via-api-coolify)
7. [Comparaison des méthodes](#comparaison-des-méthodes)
8. [Guide pratique : TirArc sans Git](#guide-pratique--tirallarc-sans-git)
9. [Mises à jour sans Git](#mises-à-jour-sans-git)
10. [Avantages et limites](#avantages-et-limites)

---

## Vue d'ensemble

### Coolify supporte 5 types de déploiement

| Type | Git requis ? | Difficulté | Automatisation |
|------|--------------|------------|----------------|
| **1. Git Repository** | ✅ Oui | ⭐ Facile | ✅✅ Auto |
| **2. Dockerfile** | ❌ Non | ⭐⭐ Moyen | ⚠️ Manuelle |
| **3. Docker Compose** | ❌ Non | ⭐⭐ Moyen | ⚠️ Manuelle |
| **4. Docker Image** | ❌ Non | ⭐ Facile | ✅ Semi-auto |
| **5. Public Repository** | ❌ Non | ⭐ Facile | ✅ Auto |

---

## Méthode 1 : Dockerfile personnalisé

### Principe

Vous créez un **Dockerfile** dans votre projet, puis vous l'uploadez vers le serveur. Coolify construit l'image Docker et la déploie.

### Avantages

- ✅ Pas besoin de Git
- ✅ Contrôle total sur l'image Docker
- ✅ Optimisation possible (multi-stage build)
- ✅ Variables d'environnement dans Coolify

### Inconvénients

- ⚠️ Mise à jour manuelle du Dockerfile
- ⚠️ Pas de webhook automatique

---

### Étape 1 : Créer un Dockerfile

**Dans votre projet TirArc (`C:\Gemini\terrain_claude_code\Dockerfile`) :**

```dockerfile
# Dockerfile pour TirArc Istres - Version production

# Stage 1: Build dependencies
FROM node:18-alpine AS builder
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --production --no-optional

# Stage 2: Production image
FROM node:18-alpine
WORKDIR /app

# Copier les dépendances depuis le builder
COPY --from=builder /app/node_modules ./node_modules

# Copier le code backend
COPY server/ .

# Créer les répertoires nécessaires
RUN mkdir -p uploads/incidents logs

# Variables d'environnement par défaut (surchargées par Coolify)
ENV NODE_ENV=production
ENV PORT=3000

# Exposer le port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Démarrer l'application
CMD ["node", "server.js"]
```

---

### Étape 2 : Créer un fichier .dockerignore

**Fichier `.dockerignore` (pour optimiser le build) :**

```
node_modules
.git
.gitignore
.env
.env.*
npm-debug.log
.DS_Store
*.md
.vscode
.idea
coverage
.nyc_output
*.test.js
__tests__
```

---

### Étape 3 : Transférer vers le serveur

**Option A : Via SCP**

```bash
# Créer une archive avec le Dockerfile
cd C:\Gemini\terrain_claude_code
tar -czf tirallarc-docker.tar.gz Dockerfile .dockerignore server/

# Transférer vers le serveur
scp tirallarc-docker.tar.gz user@51.210.100.50:/tmp/
```

**Option B : Via SFTP (FileZilla)**

```
1. Connecter à votre serveur (SFTP, port 22)
2. Créer un dossier /home/user/tirallarc-deploy/
3. Glisser-déposer :
   - Dockerfile
   - .dockerignore
   - Dossier server/ (tout le backend)
```

---

### Étape 4 : Déployer dans Coolify

**Dans l'interface Coolify :**

#### 1. Créer un nouveau projet

```
Coolify Dashboard → Projects → Add New Project

Name: TirArc Istres
Description: Application de gestion des terrains de tir à l'arc
Environment: Production
```

#### 2. Ajouter une ressource

```
Project TirArc → Add New Resource → Application

Type: Dockerfile
Name: tirallarc-backend
```

#### 3. Configuration de l'application

```
Build Configuration:
├─ Build Method: Dockerfile
├─ Dockerfile Path: /Dockerfile
└─ Base Directory: /home/user/tirallarc-deploy

Network Configuration:
├─ Ports: 3000
└─ Protocol: HTTP

Domain Configuration:
├─ Domain: tirallarc-istres.fr
├─ Additional Domain: www.tirallarc-istres.fr
└─ SSL: Enable (Let's Encrypt)
```

#### 4. Variables d'environnement

```
Environment Variables → Add

NODE_ENV=production
PORT=3000
DB_HOST=tirallarc-db
DB_PORT=5432
DB_NAME=terrain_tir_arc
DB_USER=tir_arc_user
DB_PASSWORD=VotreMotDePasseSecurise123
JWT_SECRET=votre_cle_jwt_generee
JWT_REFRESH_SECRET=votre_cle_refresh_generee
SESSION_SECRET=votre_cle_session_generee
ALLOWED_ORIGINS=https://tirallarc-istres.fr,https://www.tirallarc-istres.fr
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@tirallarc-istres.fr
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### 5. Persistent Storage

```
Storage → Add Volume

Volume 1:
├─ Name: uploads
├─ Mount Path: /app/uploads
└─ Host Path: /var/lib/coolify/applications/tirallarc/uploads

Volume 2:
├─ Name: logs
├─ Mount Path: /app/logs
└─ Host Path: /var/lib/coolify/applications/tirallarc/logs
```

#### 6. Build Path Configuration

```
Build → Build Pack Settings

Build Pack: Dockerfile
Custom Dockerfile Location: /Dockerfile
Context: /home/user/tirallarc-deploy
```

#### 7. Déployer

```
Click: Deploy

Coolify va :
1. ✅ Lire le Dockerfile
2. ✅ Construire l'image Docker
3. ✅ Créer le conteneur
4. ✅ Configurer le réseau Docker
5. ✅ Configurer Traefik (reverse proxy)
6. ✅ Obtenir le certificat SSL
7. ✅ Démarrer l'application
8. ✅ Health check automatique

Temps : 2-5 minutes
```

---

## Méthode 2 : Docker Compose

### Principe

Vous créez un fichier `docker-compose.yml` qui définit votre application ET sa base de données. Coolify déploie l'ensemble.

### Avantages

- ✅ Définition complète de la stack (app + DB + services)
- ✅ Multi-conteneurs facilement
- ✅ Configuration déclarative
- ✅ Réutilisable partout

---

### Étape 1 : Créer docker-compose.yml

**Fichier `docker-compose.yml` dans votre projet :**

```yaml
version: '3.8'

services:
  # Backend Node.js
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: tirallarc-backend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_HOST=db
      - DB_PORT=5432
      - DB_NAME=${DB_NAME}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
      - EMAIL_FROM=${EMAIL_FROM}
    volumes:
      - uploads:/app/uploads
      - logs:/app/logs
    depends_on:
      - db
    networks:
      - tirallarc-network
    labels:
      - "coolify.managed=true"

  # PostgreSQL Database
  db:
    image: postgres:15-alpine
    container_name: tirallarc-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./database.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - tirallarc-network
    labels:
      - "coolify.managed=true"

volumes:
  uploads:
  logs:
  postgres-data:

networks:
  tirallarc-network:
    driver: bridge
```

---

### Étape 2 : Transférer vers le serveur

```bash
# Créer une archive complète
tar -czf tirallarc-compose.tar.gz \
  docker-compose.yml \
  Dockerfile \
  .dockerignore \
  server/ \
  database.sql

# Transférer
scp tirallarc-compose.tar.gz user@51.210.100.50:/tmp/

# Sur le serveur, extraire
ssh user@51.210.100.50
mkdir -p /home/user/tirallarc-deploy
cd /home/user/tirallarc-deploy
tar -xzf /tmp/tirallarc-compose.tar.gz
```

---

### Étape 3 : Déployer dans Coolify

**Dans Coolify :**

```
Projects → Add New Project → TirArc Istres

Add New Resource → Application

Type: Docker Compose
Name: tirallarc-stack
Docker Compose File Path: /home/user/tirallarc-deploy/docker-compose.yml

Environment Variables:
(Même liste que précédemment)

Domain:
├─ Service: backend
├─ Domain: tirallarc-istres.fr
└─ SSL: Enable

Deploy
```

Coolify va déployer **tout** : backend + base de données + volumes.

---

## Méthode 3 : Docker Image (Registry)

### Principe

Vous construisez l'image Docker sur votre PC, la poussez vers Docker Hub (ou autre registry), puis Coolify la télécharge et la déploie.

### Avantages

- ✅ Build sur votre machine (plus rapide si bonne connexion)
- ✅ Image réutilisable
- ✅ Versionning des images
- ✅ Pas de build sur le serveur

---

### Étape 1 : Construire l'image localement

**Sur votre PC Windows :**

```bash
# Installer Docker Desktop si pas déjà fait
# https://www.docker.com/products/docker-desktop

# Ouvrir PowerShell dans votre projet
cd C:\Gemini\terrain_claude_code

# Construire l'image
docker build -t tirallarc:latest -f Dockerfile .

# Tester localement (optionnel)
docker run -p 3000:3000 tirallarc:latest
# Ouvrir http://localhost:3000/health
```

---

### Étape 2 : Pousser vers Docker Hub

**Créer un compte Docker Hub (gratuit) :**
- https://hub.docker.com/signup

**Pousser l'image :**

```bash
# Se connecter à Docker Hub
docker login
# Username: votre-username
# Password: votre-password

# Tag l'image avec votre username
docker tag tirallarc:latest votre-username/tirallarc:latest

# Pousser vers Docker Hub
docker push votre-username/tirallarc:latest

# L'image est maintenant publique sur :
# https://hub.docker.com/r/votre-username/tirallarc
```

**Pour une image privée :**

```bash
# Créer un repository privé sur Docker Hub
# Puis pousser de la même manière
docker push votre-username/tirallarc-private:latest
```

---

### Étape 3 : Déployer dans Coolify

**Dans Coolify :**

```
Projects → TirArc Istres → Add New Resource

Type: Docker Image
Name: tirallarc-backend

Configuration:
├─ Image: votre-username/tirallarc:latest
├─ Registry: Docker Hub (public)
└─ Pull Strategy: Always (pour les mises à jour)

Port Configuration:
├─ Port: 3000
└─ Protocol: HTTP

Domain:
├─ Domain: tirallarc-istres.fr
└─ SSL: Enable

Environment Variables:
(Même liste que précédemment)

Persistent Storage:
├─ uploads → /app/uploads
└─ logs → /app/logs

Deploy
```

**Coolify va :**
1. Télécharger l'image depuis Docker Hub
2. Créer le conteneur
3. Configurer le proxy et SSL
4. Démarrer l'application

**Temps : 2-3 minutes** ⚡

---

### Mise à jour avec Docker Image

**Sur votre PC :**

```bash
# Modifier le code
# ...

# Reconstruire l'image avec un nouveau tag
docker build -t votre-username/tirallarc:v1.1 .

# Pousser vers Docker Hub
docker push votre-username/tirallarc:v1.1

# Optionnel : mettre à jour le tag latest
docker tag votre-username/tirallarc:v1.1 votre-username/tirallarc:latest
docker push votre-username/tirallarc:latest
```

**Dans Coolify :**

```
Application → Redeploy

Coolify va :
1. Pull la nouvelle image
2. Arrêter l'ancien conteneur
3. Démarrer le nouveau conteneur
4. Zero-downtime si configuré

Temps : 1-2 minutes
```

---

## Méthode 4 : Simple Dockerfile

### Principe

La plus simple : vous transférez juste votre code + Dockerfile, sans Git, et Coolify build directement.

### Configuration

**Dans Coolify :**

```
Settings → Build Pack

Build Pack: Dockerfile
Dockerfile Location: ./Dockerfile
Base Directory: /path/to/your/code

# Coolify build depuis les fichiers locaux du serveur
```

**Avantage :** Très simple, pas de Git, pas de Docker Hub.

**Inconvénient :** Vous devez gérer le transfert des fichiers manuellement (SCP/SFTP).

---

## Méthode 5 : Via API Coolify

### Principe

Utiliser l'API REST de Coolify pour automatiser les déploiements sans passer par l'interface web.

### Configuration API

**Dans Coolify :**

```
Settings → API Tokens → Create New Token

Name: deployment-token
Scopes:
├─ projects:write
├─ applications:write
└─ deployments:create

Copier le token généré : coolify_xxxxxxxxxxxx
```

---

### Script de déploiement automatisé

**Créer `deploy-to-coolify.sh` :**

```bash
#!/bin/bash

# Configuration
COOLIFY_URL="https://coolify.example.com"
COOLIFY_TOKEN="coolify_xxxxxxxxxxxx"
APPLICATION_ID="app-id-from-coolify"

# Construire l'image Docker localement
echo "🔨 Building Docker image..."
docker build -t tirallarc:latest .

# Tag et push vers registry
echo "📤 Pushing to Docker Hub..."
docker tag tirallarc:latest votre-username/tirallarc:latest
docker push votre-username/tirallarc:latest

# Déclencher le déploiement via API Coolify
echo "🚀 Triggering Coolify deployment..."
curl -X POST \
  "${COOLIFY_URL}/api/v1/applications/${APPLICATION_ID}/deploy" \
  -H "Authorization: Bearer ${COOLIFY_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "force": true,
    "image": "votre-username/tirallarc:latest"
  }'

echo "✅ Deployment triggered!"
```

**Utilisation :**

```bash
chmod +x deploy-to-coolify.sh
./deploy-to-coolify.sh
```

---

## Comparaison des méthodes

### Tableau comparatif

| Méthode | Git ? | Build où ? | Temps | Auto-update | Difficulté |
|---------|-------|------------|-------|-------------|------------|
| **Git Repository** | ✅ | Serveur | 3-5 min | ✅ Webhook | ⭐ |
| **Dockerfile** | ❌ | Serveur | 3-5 min | ❌ Manuel | ⭐⭐ |
| **Docker Compose** | ❌ | Serveur | 3-5 min | ❌ Manuel | ⭐⭐ |
| **Docker Image** | ❌ | Local | 1-2 min | ⚠️ Semi | ⭐ |
| **API** | ❌ | Local | 1-2 min | ✅ Script | ⭐⭐⭐ |

### Par cas d'usage

| Cas d'usage | Méthode recommandée |
|-------------|---------------------|
| **Pas de Git, déploiement ponctuel** | Dockerfile |
| **Pas de Git, app + DB** | Docker Compose |
| **PC puissant, serveur faible** | Docker Image |
| **Automatisation sans Git** | Docker Image + API |
| **Simplicité maximale** | Docker Image |

---

## Guide pratique : TirArc sans Git

### Scénario complet : Déployer TirArc avec Coolify sans Git

#### Option A : Docker Image (Recommandée)

**Étape 1 : Sur votre PC Windows**

```bash
# Installer Docker Desktop
# https://www.docker.com/products/docker-desktop

# Créer le Dockerfile (voir plus haut)
cd C:\Gemini\terrain_claude_code
# Copier le Dockerfile fourni dans ce guide

# Build l'image
docker build -t tirallarc:latest .

# Tester localement (optionnel)
docker run -p 3000:3000 -e NODE_ENV=production tirallarc:latest
# Test : http://localhost:3000/health

# Login Docker Hub
docker login

# Tag et push
docker tag tirallarc:latest votre-username/tirallarc:latest
docker push votre-username/tirallarc:latest
```

**Étape 2 : Installer Coolify**

```bash
# SSH vers le serveur
ssh user@51.210.100.50

# Installer Coolify
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# Attendre 5 minutes
# Accès : http://51.210.100.50:8000
```

**Étape 3 : Créer la base de données dans Coolify**

```
Coolify → Projects → New Project → TirArc Istres

Add Resource → Database → PostgreSQL

Configuration:
├─ Name: tirallarc-db
├─ Version: 15
├─ Database: terrain_tir_arc
├─ User: tir_arc_user
├─ Password: VotreMotDePasseSecurise123
└─ Backup: Daily at 2:00 AM

Create Database
```

**Étape 4 : Déployer l'application dans Coolify**

```
Project TirArc → Add Resource → Application

Type: Docker Image

Configuration:
├─ Name: tirallarc-backend
├─ Image: votre-username/tirallarc:latest
├─ Registry: Docker Hub (public)
├─ Port: 3000
├─ Domain: tirallarc-istres.fr
└─ SSL: Enable

Environment Variables:
(Copier la liste complète depuis la section précédente)

Persistent Storage:
├─ uploads → /app/uploads
└─ logs → /app/logs

Deploy
```

**Étape 5 : Configurer DNS**

```
Chez votre registrar (OVH, Gandi, Cloudflare) :

Type: A
Nom: @
Valeur: 51.210.100.50

Type: CNAME
Nom: www
Valeur: tirallarc-istres.fr
```

**Étape 6 : Import du schéma de base de données**

```bash
# Via Coolify Database Terminal
Coolify → Database → tirallarc-db → Terminal

# Ou via SSH et port forwarding
ssh user@51.210.100.50
# Trouver le port PostgreSQL exposé
docker ps | grep postgres

# Importer le schéma
psql -h localhost -p <port> -U tir_arc_user -d terrain_tir_arc < database.sql
```

**C'est terminé !** ✅

Votre application est déployée sans Git, avec :
- ✅ SSL automatique
- ✅ Base de données PostgreSQL
- ✅ Sauvegardes automatiques
- ✅ Monitoring
- ✅ Logs en temps réel

---

#### Option B : Docker Compose (Stack complète)

**Plus simple : tout en un seul déploiement**

```bash
# Sur votre PC, créer docker-compose.yml
# (voir la section Docker Compose plus haut)

# Créer une archive
tar -czf tirallarc-stack.tar.gz \
  docker-compose.yml \
  Dockerfile \
  server/ \
  database.sql

# Transférer
scp tirallarc-stack.tar.gz user@51.210.100.50:/tmp/

# Sur le serveur
ssh user@51.210.100.50
mkdir -p /home/user/tirallarc
cd /home/user/tirallarc
tar -xzf /tmp/tirallarc-stack.tar.gz

# Dans Coolify
Projects → TirArc → Add Resource → Application

Type: Docker Compose
Compose File: /home/user/tirallarc/docker-compose.yml

Environment Variables: (liste complète)

Deploy
```

**Tout est déployé automatiquement : app + DB + volumes.**

---

## Mises à jour sans Git

### Avec Docker Image

**Le plus simple pour les mises à jour :**

```bash
# 1. Sur votre PC : modifier le code
# 2. Rebuild l'image
docker build -t votre-username/tirallarc:latest .

# 3. Push vers Docker Hub
docker push votre-username/tirallarc:latest

# 4. Dans Coolify : cliquer sur "Redeploy"
# Coolify pull automatiquement la nouvelle image
```

**Temps total : 3-5 minutes**

---

### Avec Dockerfile

```bash
# 1. Modifier le code sur votre PC
# 2. Transférer vers le serveur
scp -r server/ user@51.210.100.50:/home/user/tirallarc-deploy/

# 3. Dans Coolify : cliquer sur "Redeploy"
# Coolify rebuild l'image depuis les nouveaux fichiers
```

---

### Avec Docker Compose

```bash
# 1. Modifier le code
# 2. Recréer l'archive
tar -czf tirallarc-stack.tar.gz docker-compose.yml Dockerfile server/

# 3. Transférer et extraire
scp tirallarc-stack.tar.gz user@51.210.100.50:/tmp/
ssh user@51.210.100.50 "cd /home/user/tirallarc && tar -xzf /tmp/tirallarc-stack.tar.gz"

# 4. Coolify : Redeploy
```

---

## Avantages et limites

### Avantages du déploiement sans Git dans Coolify

✅ **Pas besoin de Git** : Pas de compte GitHub/GitLab requis
✅ **Contrôle total** : Vous gérez exactement ce qui est déployé
✅ **Build local** : Si votre PC est plus puissant que le serveur
✅ **Images réutilisables** : Une image pour plusieurs serveurs
✅ **Versionning manuel** : Tags Docker (v1.0, v1.1, etc.)
✅ **Coolify géré** : SSL, proxy, monitoring, logs

### Limites

⚠️ **Pas de webhook automatique** : Pas de déploiement automatique sur push
⚠️ **Mises à jour manuelles** : Vous devez déclencher manuellement
⚠️ **Transfert de fichiers** : SCP/SFTP nécessaire (sauf Docker Image)
⚠️ **Pas d'historique Git** : Pas de rollback facile (sauf tags Docker)

---

## Comparaison : Git vs Sans Git

### Avec Git (Repository)

```
✅ Déploiement automatique (webhook)
✅ Historique complet (rollback facile)
✅ CI/CD natif
✅ Collaboration équipe

❌ Compte GitHub/GitLab requis
❌ Code potentiellement public
❌ Build toujours sur le serveur
```

### Sans Git (Docker Image)

```
✅ Pas de compte Git requis
✅ Code privé sur votre PC
✅ Build local (plus rapide si bon PC)
✅ Images versionnées (tags Docker)

❌ Mise à jour manuelle
❌ Pas de webhook automatique
❌ Nécessite Docker Hub (ou registry)
```

---

## Workflow recommandé sans Git

### Développement → Production

```
1. Développement local
   ├─ Code sur votre PC
   └─ Test avec `npm start`

2. Build Docker Image
   ├─ `docker build -t tirallarc:latest .`
   └─ Test local : `docker run -p 3000:3000 tirallarc:latest`

3. Push vers Docker Hub
   ├─ `docker tag tirallarc:latest you/tirallarc:v1.0`
   └─ `docker push you/tirallarc:v1.0`

4. Déployer dans Coolify
   ├─ Application → Image: you/tirallarc:v1.0
   └─ Click "Deploy"

5. Tests de production
   └─ Vérifier https://tirallarc-istres.fr/health

✅ Déploiement terminé !
```

---

## Checklist de déploiement sans Git

### Préparation

- [ ] Dockerfile créé et testé
- [ ] .dockerignore configuré
- [ ] Variables d'environnement listées
- [ ] Compte Docker Hub créé (si méthode Docker Image)
- [ ] Coolify installé sur le serveur
- [ ] DNS configuré

### Build et push (si Docker Image)

- [ ] Image construite localement
- [ ] Image testée localement
- [ ] Image taggée correctement
- [ ] Image poussée vers Docker Hub
- [ ] Image accessible publiquement

### Configuration Coolify

- [ ] Projet créé dans Coolify
- [ ] Base de données créée (si nécessaire)
- [ ] Application créée (type Docker Image ou Dockerfile)
- [ ] Variables d'environnement configurées
- [ ] Domaine configuré
- [ ] SSL activé
- [ ] Persistent storage configuré

### Déploiement

- [ ] Déploiement lancé
- [ ] Build réussi (vérifier logs)
- [ ] Conteneur démarré
- [ ] Health check OK
- [ ] Site accessible en HTTPS
- [ ] Base de données connectée
- [ ] Tests fonctionnels OK

### Post-déploiement

- [ ] Sauvegardes configurées
- [ ] Monitoring actif
- [ ] Logs accessibles
- [ ] Documentation des mises à jour

---

## Conclusion

### 🎯 Recommandation finale pour TirArc sans Git

**Méthode recommandée : Docker Image** ⭐

```
Pourquoi ?
✅ Pas de Git requis
✅ Build sur votre PC (plus confortable)
✅ Mises à jour en 5 minutes (rebuild + push + redeploy)
✅ Coolify gère SSL, proxy, monitoring
✅ Versionning avec tags Docker
✅ Rollback possible (tags précédents)

Workflow :
1. Modifier le code sur votre PC
2. docker build + docker push (3 min)
3. Coolify → Redeploy (2 min)
4. C'est tout !
```

### Alternative : Docker Compose

Si vous voulez déployer app + DB en une seule fois, utilisez Docker Compose.

---

## Ressources

### Coolify

- **Documentation officielle** : https://coolify.io/docs
- **GitHub** : https://github.com/coollabsio/coolify
- **Discord** : https://coollabs.io/discord

### Docker

- **Docker Hub** : https://hub.docker.com
- **Docker Desktop** : https://www.docker.com/products/docker-desktop
- **Dockerfile reference** : https://docs.docker.com/engine/reference/builder/

### Tutoriels

- Coolify without Git : https://coolify.io/docs/knowledge-base/docker
- Docker Image deployment : https://coolify.io/docs/knowledge-base/docker/image

---

**OUI, Coolify permet de déployer SANS Git !** 🚀

Vous avez maintenant 4 méthodes différentes pour déployer dans Coolify sans utiliser Git. La méthode **Docker Image** est la plus flexible et recommandée.

---

**Guide réalisé avec succès !** 🎯

*Dernière mise à jour : 2025-01-15*
