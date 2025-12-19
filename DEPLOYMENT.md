# 🚀 Guide de Déploiement en Production

Ce guide couvre le déploiement de l'application de gestion des terrains de tir à l'arc en production, avec ou sans Coolify.

---

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Génération des secrets](#génération-des-secrets)
3. [Configuration](#configuration)
4. [Déploiement avec Coolify (Recommandé)](#déploiement-avec-coolify)
5. [Déploiement Docker manuel](#déploiement-docker-manuel)
6. [Configuration HTTPS/SSL](#configuration-httpsssl)
7. [Backups](#backups)
8. [Monitoring](#monitoring)
9. [Maintenance](#maintenance)
10. [Rollback](#rollback)
11. [Troubleshooting](#troubleshooting)

---

## ✅ Prérequis

### Serveur
- OS: Ubuntu 20.04+ / Debian 11+ / autre Linux
- RAM: Minimum 2GB, recommandé 4GB+
- CPU: Minimum 2 cores
- Espace disque: Minimum 20GB
- Accès SSH root ou sudo

### Logiciels
- Docker 24+
- Docker Compose 2.20+
- Node.js 20+ (pour génération des secrets)
- Git (optionnel)

### Réseau
- Port 80 (HTTP) ouvert
- Port 443 (HTTPS) ouvert
- Port 5432 (PostgreSQL) **fermé** au public
- Nom de domaine pointant vers le serveur (pour HTTPS)

---

## 🔐 Génération des secrets

**⚠️ ÉTAPE CRITIQUE - À faire AVANT le premier déploiement**

### 1. Générer les secrets cryptographiques

```bash
node generate-secrets.js create
```

Cette commande génère :
- `JWT_SECRET` - Secret pour tokens d'accès
- `JWT_REFRESH_SECRET` - Secret pour tokens de rafraîchissement
- `SESSION_SECRET` - Secret pour sessions
- `ENCRYPTION_KEY` - Clé de chiffrement AES-256
- `DB_PASSWORD` - Mot de passe base de données fort

### 2. Sauvegarder les secrets

**IMPORTANT:** Copiez le fichier `.env.production` dans un gestionnaire de secrets sécurisé :
- 1Password
- Bitwarden
- HashiCorp Vault
- AWS Secrets Manager
- etc.

**NE JAMAIS** commiter `.env.production` dans Git !

### 3. Vérifier .gitignore

Le script ajoute automatiquement à `.gitignore` :
```
.env.production
.env.local
.env.*.local
secrets.txt
```

---

## ⚙️ Configuration

### 1. Éditer `.env.production`

```bash
nano .env.production
```

Modifiez les valeurs suivantes :

#### CORS Origins (OBLIGATOIRE)
```env
ALLOWED_ORIGINS=https://votre-domaine.com,https://www.votre-domaine.com
```

#### Email SMTP (Optionnel - configurable via UI)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # App password Gmail
```

### 2. Variables d'environnement par défaut

Valeurs recommandées (déjà configurées) :
```env
NODE_ENV=production
LOG_LEVEL=warn
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=12
```

---

## 🔄 Migrations de Base de Données (v1.0.1+)

**⚠️ IMPORTANT pour les déploiements existants**

### Migration automatique

La colonne `must_change_password` est créée automatiquement au démarrage depuis la v1.0.1.

### Migration manuelle (optionnelle)

Pour exécuter la migration avant le déploiement :

```bash
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U tir_arc_user -d terrain_tir_arc < server/migrations/001_add_must_change_password.sql
```

**Vérification :**

```bash
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U tir_arc_user -d terrain_tir_arc \
  -c "\d admin_users" | grep must_change_password
```

---

## 🛡️ Nouveaux Scripts de Sécurité (v1.0.1)

### Audit de sécurité

Vérifier le score de sécurité :

```bash
cd server
npm run security:audit
```

**Score cible en production : ≥ 90/100**

### Rotation des secrets

```bash
# Prévisualisation
npm run security:rotate:dry

# Rotation réelle (révoque tous les JWT actifs)
npm run security:rotate
```

### CI/CD GitHub Actions

Workflow automatique ajouté dans `.github/workflows/security.yml` :
- ✅ npm audit sur chaque push/PR
- ✅ security-audit.js quotidien à 3h UTC
- ✅ CodeQL analysis
- ✅ Dependency review

### Nouvelles API de sécurité

Endpoints admin ajoutés :

```bash
GET /api/v1/security/status          # Score et statistiques
GET /api/v1/security/audit-logs      # Logs d'audit
GET /api/v1/security/active-sessions # Sessions actives
DELETE /api/v1/security/revoke-session/:id  # Révoquer une session
```

Documentation complète : [SECURITY.md](SECURITY.md)

---

## 🎯 Déploiement avec Coolify

**Coolify gère automatiquement :**
- ✅ HTTPS avec Let's Encrypt
- ✅ Renouvellement automatique des certificats
- ✅ Reverse proxy
- ✅ Monitoring
- ✅ Logs centralisés

### Étapes

1. **Créer un nouveau projet dans Coolify**
   - Type: Docker Compose
   - Repository: Votre dépôt Git

2. **Configurer les variables d'environnement**

   Dans l'interface Coolify, ajoutez toutes les variables de `.env.production` :

   ```
   DB_PASSWORD=...
   JWT_SECRET=...
   JWT_REFRESH_SECRET=...
   SESSION_SECRET=...
   ENCRYPTION_KEY=...
   ALLOWED_ORIGINS=https://votre-domaine.com
   ```

3. **Sélectionner le fichier de composition**

   ```
   docker-compose.prod.yml
   ```

4. **Configurer le domaine**

   - Domaine: `votre-domaine.com`
   - Coolify génère automatiquement le certificat SSL

5. **Déployer**

   Cliquez sur "Deploy" - Coolify s'occupe du reste !

### Vérification

```bash
curl https://votre-domaine.com/health
```

Résultat attendu :
```json
{"status":"healthy","timestamp":"...","environment":"production"}
```

---

## 🐳 Déploiement Docker manuel

### 1. Cloner le projet

```bash
git clone https://github.com/votre-repo/terrain-tir-arc.git
cd terrain-tir-arc
```

### 2. Copier .env.production

```bash
cp .env.production.exemple .env.production
# Éditer avec vos secrets générés
nano .env.production
```

### 3. Build et démarrage

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### 4. Vérifier les conteneurs

```bash
docker-compose -f docker-compose.prod.yml ps
```

Résultat attendu :
```
NAME                    STATUS              PORTS
tirallarc-app-prod     Up (healthy)        0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
tirallarc-db-prod      Up (healthy)        127.0.0.1:5432->5432/tcp
tirallarc-backup-prod  Up
```

### 5. Consulter les logs

```bash
docker-compose -f docker-compose.prod.yml logs -f app
```

### 6. Test de santé

```bash
curl http://localhost/health
```

---

## 🖥️ Déploiement sur Serveur Classique (Sans Coolify)

Ce guide explique comment déployer l'application sur un serveur Linux classique (VPS, serveur dédié, cloud VM) sans utiliser Coolify.

### Portabilité de l'application

**Bonne nouvelle :** Le code de l'application est totalement portable et fonctionne de la même manière partout grâce à Docker.

**La seule différence entre les déploiements :**
- ✅ **Avec Coolify :** HTTPS automatique (Traefik + Let's Encrypt)
- ⚙️ **Sans Coolify :** HTTPS manuel (Nginx/Traefik + Certbot)

Tout le reste est identique : même code, même Dockerfile, mêmes variables d'environnement.

### Architecture déployée

```
Internet → HTTPS (443) → Nginx/Traefik → HTTP (3000) → Docker App → PostgreSQL
```

### Prérequis serveur

- **OS :** Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **RAM :** 2 GB minimum (4 GB recommandé)
- **Stockage :** 20 GB minimum
- **Docker :** Version 20.10+
- **Docker Compose :** Version 2.0+
- **Domaine :** Nom de domaine pointant vers le serveur (pour HTTPS)
- **Ports ouverts :**
  - `80` (HTTP - redirection HTTPS)
  - `443` (HTTPS)
  - `22` (SSH)

---

### A. Installation de Docker

Si Docker n'est pas déjà installé :

```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installation de Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER

# Activer Docker au démarrage
sudo systemctl enable docker
sudo systemctl start docker

# Vérification
docker --version
docker compose version
```

**Reconnectez-vous** après l'ajout au groupe docker pour appliquer les changements.

---

### B. Déploiement de l'application

#### 1. Cloner le projet

```bash
cd /opt
sudo git clone https://github.com/votre-repo/terrain-tir-arc.git
cd terrain-tir-arc
```

#### 2. Générer les secrets

```bash
cd server
npm install  # Installation temporaire pour generate-secrets.js
node generate-secrets.js
cd ..
```

**IMPORTANT :** Sauvegardez ces secrets dans un gestionnaire de mots de passe sécurisé !

#### 3. Créer le fichier de production

Créez `.env.production` à la racine du projet :

```bash
nano .env.production
```

Collez la configuration suivante avec vos secrets générés :

```env
# Base de données
DB_NAME=terrain_tir_arc
DB_USER=tir_arc_user
DB_PASSWORD=VOTRE_DB_PASSWORD_ICI

# Sécurité (secrets générés)
JWT_SECRET=VOTRE_JWT_SECRET_ICI
JWT_REFRESH_SECRET=VOTRE_JWT_REFRESH_SECRET_ICI
SESSION_SECRET=VOTRE_SESSION_SECRET_ICI
ENCRYPTION_KEY=VOTRE_ENCRYPTION_KEY_ICI

# Configuration application
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://votre-domaine.com,https://www.votre-domaine.com
LOG_LEVEL=warn

# Sécurité
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=12

# Email SMTP (optionnel)
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASSWORD=
```

**Protégez le fichier :**

```bash
chmod 600 .env.production
```

#### 4. Lancer l'application

```bash
docker compose -f docker-compose.yaml --env-file .env.production up -d
```

**Note :** Nous utilisons `docker-compose.yaml` qui est universel (fonctionne avec ou sans Coolify).

#### 5. Vérifier les services

```bash
docker compose -f docker-compose.yaml ps
```

Résultat attendu :
```
NAME                    STATUS              PORTS
tirallarc-app-prod     Up (healthy)        0.0.0.0:3000->3000/tcp
tirallarc-db-prod      Up (healthy)        (internal)
tirallarc-backup-prod  Up
```

#### 6. Test de santé local

```bash
curl http://localhost:3000/health
```

Résultat attendu :
```json
{"status":"healthy","timestamp":"...","version":"1.0.3"}
```

---

### C. Configuration HTTPS

À ce stade, l'application fonctionne en HTTP sur le port 3000. Il faut maintenant ajouter HTTPS.

#### Option A : Nginx + Let's Encrypt (Recommandé)

##### 1. Installer Nginx et Certbot

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

##### 2. Créer la configuration Nginx

```bash
sudo nano /etc/nginx/sites-available/terrain-tir-arc
```

Collez cette configuration :

```nginx
# Redirection HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name votre-domaine.com www.votre-domaine.com;

    # Défi ACME pour Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirection vers HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Configuration HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name votre-domaine.com www.votre-domaine.com;

    # Certificats SSL (générés par Certbot)
    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;

    # Sécurité SSL moderne
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # En-têtes de sécurité
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy vers l'application Docker
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        # Headers pour préserver les informations client
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Taille maximale des uploads (photos incidents)
    client_max_body_size 10M;

    # Logs
    access_log /var/log/nginx/terrain-tir-arc-access.log;
    error_log /var/log/nginx/terrain-tir-arc-error.log;
}
```

##### 3. Activer la configuration

```bash
# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/terrain-tir-arc /etc/nginx/sites-enabled/

# Supprimer la config par défaut
sudo rm /etc/nginx/sites-enabled/default

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

##### 4. Générer le certificat SSL

```bash
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com
```

Suivez les instructions :
- Entrez votre email pour les notifications d'expiration
- Acceptez les conditions
- Choisissez la redirection HTTPS automatique (recommandé)

##### 5. Renouvellement automatique

Certbot installe automatiquement un cron job pour renouveler les certificats. Vérifiez :

```bash
sudo systemctl status certbot.timer
```

Test manuel du renouvellement :

```bash
sudo certbot renew --dry-run
```

#### Option B : Traefik (Alternative moderne)

Si vous préférez Traefik (comme Coolify), créez un fichier `docker-compose.traefik.yml` :

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    container_name: traefik
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=votre-email@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-certificates:/letsencrypt
    networks:
      - web
    restart: unless-stopped

  app:
    # ... configuration identique à docker-compose.yaml
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(`votre-domaine.com`)"
      - "traefik.http.routers.app.entrypoints=websecure"
      - "traefik.http.routers.app.tls.certresolver=letsencrypt"
      - "traefik.http.services.app.loadbalancer.server.port=3000"
    networks:
      - web
      - tirallarc-network-prod

volumes:
  traefik-certificates:

networks:
  web:
    external: true
```

Démarrage :

```bash
docker network create web
docker compose -f docker-compose.traefik.yml up -d
```

---

### D. Vérification finale

#### 1. Test HTTPS

```bash
curl https://votre-domaine.com/health
```

Résultat attendu :
```json
{"status":"healthy","timestamp":"...","version":"1.0.3"}
```

#### 2. Test du certificat SSL

```bash
openssl s_client -connect votre-domaine.com:443 -servername votre-domaine.com
```

Vérifiez :
- ✅ `Verify return code: 0 (ok)`
- ✅ Émetteur : Let's Encrypt
- ✅ Dates de validité : 90 jours

#### 3. Test des fonctionnalités

- 🌐 Accès à l'interface : `https://votre-domaine.com`
- 🔐 Connexion admin : `https://votre-domaine.com/admin`
- 📊 Health check : `https://votre-domaine.com/health`
- 📈 Métriques : `https://votre-domaine.com/metrics`
- 📖 Documentation API : `https://votre-domaine.com/api/docs`

---

### Maintenance

#### Consulter les logs

```bash
# Logs application
docker compose -f docker-compose.yaml logs -f app

# Logs base de données
docker compose -f docker-compose.yaml logs -f postgres

# Logs Nginx (si utilisé)
sudo tail -f /var/log/nginx/terrain-tir-arc-error.log
```

#### Mise à jour de l'application

```bash
cd /opt/terrain-tir-arc

# Pull dernière version
git pull origin main

# Rebuild et redémarrage
docker compose -f docker-compose.yaml --env-file .env.production up -d --build

# Vérifier
docker compose -f docker-compose.yaml ps
```

#### Redémarrage des services

```bash
# Application Docker
docker compose -f docker-compose.yaml restart app

# Nginx
sudo systemctl restart nginx

# Tout redémarrer
docker compose -f docker-compose.yaml restart
```

#### Backups

Les backups automatiques quotidiens sont déjà configurés dans `docker-compose.yaml`.

**Backup manuel :**

```bash
# Base de données
docker compose -f docker-compose.yaml exec postgres \
  pg_dump -U tir_arc_user terrain_tir_arc > backup_$(date +%Y%m%d).sql

# Uploads
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/

# Copier les backups hors du serveur
scp backup_*.sql votre-backup-serveur:/backups/
scp uploads_backup_*.tar.gz votre-backup-serveur:/backups/
```

---

### Comparaison des approches

| Critère | Coolify | Serveur Classique (Nginx) | Serveur Classique (Traefik) |
|---------|---------|---------------------------|------------------------------|
| **HTTPS automatique** | ✅ Oui | ⚠️ Manuel | ✅ Oui |
| **Renouvellement SSL** | ✅ Automatique | ✅ Automatique (Certbot) | ✅ Automatique |
| **Configuration initiale** | 🟢 Simple | 🟡 Moyenne | 🟡 Moyenne |
| **Interface graphique** | ✅ Oui | ❌ Non | ⚠️ Dashboard disponible |
| **Monitoring intégré** | ✅ Oui | ❌ Non (à ajouter) | ⚠️ Basique |
| **Logs centralisés** | ✅ Oui | ❌ Non (à configurer) | ⚠️ Basique |
| **Gestion des secrets** | ✅ UI intégrée | ⚠️ Fichier .env | ⚠️ Fichier .env |
| **Déploiement Git auto** | ✅ Oui | ❌ Non (webhooks manuels) | ❌ Non |
| **Coût** | 💰 Gratuit (self-hosted) | 💰 Gratuit | 💰 Gratuit |
| **Complexité maintenance** | 🟢 Faible | 🟡 Moyenne | 🟡 Moyenne |

**Recommandation :**
- **Coolify** : Idéal pour la majorité des cas (simplicité + fonctionnalités)
- **Nginx** : Pour les admins expérimentés ou intégration dans infra existante
- **Traefik** : Pour ceux qui veulent une approche similaire à Coolify sans l'UI

---

### Résumé

✅ **Le code de l'application est portable** - fonctionne identiquement partout
✅ **Docker Compose universel** - même fichier `docker-compose.yaml`
✅ **Différence unique** - HTTPS (automatique avec Coolify, manuel sans)
✅ **Sécurité identique** - Même configuration, mêmes secrets, mêmes protections
✅ **Performance identique** - Reverse proxy → Node.js dans tous les cas

**Vous pouvez déployer l'application sur n'importe quel serveur Linux avec Docker !**

---

## 🔒 Configuration HTTPS/SSL

### Option 1: Avec Coolify (Automatique)

**Rien à faire !** Coolify gère tout automatiquement.

### Option 2: Let's Encrypt manuel (Certbot)

#### Installation de Certbot

```bash
sudo apt update
sudo apt install certbot
```

#### Génération du certificat

```bash
sudo certbot certonly --standalone -d votre-domaine.com -d www.votre-domaine.com
```

Certificats générés dans :
```
/etc/letsencrypt/live/votre-domaine.com/fullchain.pem
/etc/letsencrypt/live/votre-domaine.com/privkey.pem
```

#### Mise à jour de la configuration Nginx

1. Remplacer `nginx.conf` par `nginx.prod.conf` dans le Dockerfile :

```dockerfile
COPY nginx.prod.conf /etc/nginx/nginx.conf
```

2. Décommenter les lignes SSL dans `nginx.prod.conf` :

```nginx
ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;
```

3. Ajouter le volume dans `docker-compose.prod.yml` :

```yaml
volumes:
  - /etc/letsencrypt:/etc/letsencrypt:ro
```

#### Renouvellement automatique

Ajouter un cron job :

```bash
sudo crontab -e
```

Ajouter :
```cron
0 3 * * * certbot renew --quiet && docker-compose -f /path/to/docker-compose.prod.yml restart app
```

### Option 3: Reverse Proxy externe (Nginx/Traefik)

Si vous utilisez un reverse proxy externe, configurez-le pour :
- Terminer le SSL/TLS
- Proxy vers `http://localhost:80`
- Passer les headers `X-Forwarded-*`

---

## 💾 Backups

### Backup automatique quotidien

Le service `backup` dans `docker-compose.prod.yml` effectue un backup quotidien à 3h00.

Backups stockés dans `./backups/` avec rétention de 30 jours.

### Backup manuel

```bash
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U tir_arc_user terrain_tir_arc > backup_$(date +%Y%m%d).sql
```

### Restauration

```bash
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U tir_arc_user terrain_tir_arc < backup_20250118.sql
```

### Backup des uploads

```bash
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/
```

---

## 📊 Monitoring

### Health Check

```bash
curl http://localhost/health
```

### Métriques système

```bash
curl http://localhost/metrics
```

Métriques disponibles :
- Uptime du serveur
- Utilisation mémoire (RSS, heap)
- Sessions actives
- Incidents en attente
- Statistiques WebSocket

### Logs

```bash
# Logs application
docker-compose -f docker-compose.prod.yml logs -f app

# Logs base de données
docker-compose -f docker-compose.prod.yml logs -f postgres

# Logs backup
docker-compose -f docker-compose.prod.yml logs -f backup
```

### Logs persistants

Logs limités automatiquement :
- Taille max: 10 MB par fichier
- Rotation: 3 fichiers
- Driver: json-file

---

## 🔧 Maintenance

### Mise à jour de l'application

```bash
# Pull dernière version
git pull origin main

# Rebuild et redémarrage
docker-compose -f docker-compose.prod.yml up -d --build

# Vérifier
docker-compose -f docker-compose.prod.yml ps
```

### Mise à jour des dépendances npm

```bash
cd server
npm audit fix
npm update
cd ..

# Rebuild
docker-compose -f docker-compose.prod.yml build app
docker-compose -f docker-compose.prod.yml up -d app
```

### Nettoyage Docker

```bash
# Images non utilisées
docker image prune -a

# Volumes non utilisés
docker volume prune

# Tout nettoyer (ATTENTION)
docker system prune -a --volumes
```

### Rotation des secrets

Modifier `.env.production` puis :

```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

**IMPORTANT:** Révoque tous les tokens JWT après changement de secrets !

---

## ⏮️ Rollback

### Rollback rapide

```bash
# Arrêter
docker-compose -f docker-compose.prod.yml down

# Revenir à la version précédente
git checkout <commit-precedent>

# Redémarrer
docker-compose -f docker-compose.prod.yml up -d --no-build
```

### Rollback avec backup DB

```bash
# Arrêter l'app
docker-compose -f docker-compose.prod.yml stop app

# Restaurer DB
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U tir_arc_user terrain_tir_arc < backups/db_20250117_030000.sql

# Redémarrer
docker-compose -f docker-compose.prod.yml start app
```

---

## 🚨 Troubleshooting

### Problème: Application ne démarre pas

**Vérification:**
```bash
docker-compose -f docker-compose.prod.yml logs app
```

**Causes fréquentes:**
- Secrets manquants dans `.env.production`
- Base de données non accessible
- Port 80/443 déjà utilisé

**Solution:**
```bash
# Vérifier variables d'environnement
docker-compose -f docker-compose.prod.yml config

# Vérifier ports
sudo netstat -tulpn | grep -E ':80|:443'
```

### Problème: Erreur de connexion base de données

**Vérification:**
```bash
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U tir_arc_user
```

**Solution:**
```bash
# Redémarrer PostgreSQL
docker-compose -f docker-compose.prod.yml restart postgres

# Attendre que le health check soit OK
docker-compose -f docker-compose.prod.yml ps
```

### Problème: HTTPS ne fonctionne pas

**Avec Coolify:**
- Vérifier que le domaine pointe vers le serveur
- Vérifier les logs Coolify
- Attendre 5-10 minutes pour la génération du certificat

**Manuel:**
```bash
# Vérifier Certbot
sudo certbot certificates

# Tester le certificat
openssl s_client -connect votre-domaine.com:443 -servername votre-domaine.com
```

### Problème: Performances lentes

**Vérification:**
```bash
# Ressources conteneurs
docker stats

# Logs d'erreurs
docker-compose -f docker-compose.prod.yml logs app | grep -i error
```

**Optimisations:**
- Vérifier les index de base de données (créés automatiquement)
- Augmenter les limites CPU/RAM dans docker-compose.prod.yml
- Activer le cache dans nginx.prod.conf

### Problème: Emails ne s'envoient pas

**Vérification:**
```bash
# Tester configuration SMTP via UI admin
# Consulter les logs
docker-compose -f docker-compose.prod.yml logs app | grep -i email
```

**Solution:**
- Vérifier les credentials SMTP dans .env.production
- Vérifier le port 587 ouvert en sortie
- Pour Gmail: générer un "App Password"

---

## 📞 Support

### Logs d'audit

Toutes les actions sont loggées dans la table `audit_logs` :

```sql
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50;
```

### Monitoring externe recommandé

- **Uptime:** UptimeRobot, Pingdom
- **Logs:** Papertrail, Logtail
- **APM:** New Relic, Datadog
- **Sécurité:** Snyk, Dependabot

---

## ✅ Checklist de déploiement

### Avant de mettre en production :

**Configuration de base :**
- [ ] Secrets générés avec `generate-secrets.js` (≥ 32 caractères)
- [ ] `.env.production` créé et configuré
- [ ] `ALLOWED_ORIGINS` modifié avec votre domaine
- [ ] Domaine DNS configuré et résolu
- [ ] Ports 80 et 443 ouverts
- [ ] PostgreSQL port 5432 **fermé** au public
- [ ] Secrets sauvegardés dans gestionnaire sécurisé
- [ ] `.env.production` dans `.gitignore`

**Sécurité (v1.0.1+) :**
- [ ] Migration `must_change_password` appliquée (automatique ou manuelle)
- [ ] Audit de sécurité exécuté : `npm run security:audit` (score ≥ 90/100)
- [ ] Workflow GitHub Actions activé (`.github/workflows/security.yml`)
- [ ] API de sécurité testée : `GET /api/v1/security/status`
- [ ] CSP avec nonces activé (vérifier headers HTTP)
- [ ] Rate limiting testé (6 tentatives max)
- [ ] Mot de passe admin par défaut changé

**Infrastructure :**
- [ ] Backups automatiques configurés
- [ ] Health checks testés : `GET /health`
- [ ] Logs consultés sans erreurs
- [ ] HTTPS fonctionnel (certificat valide)
- [ ] Tests de charge effectués (optionnel)
- [ ] Plan de rollback documenté

---

**Déploiement réussi ! 🎉**

### Maintenance continue :

1. **Sécurité :**
   - Exécuter `npm run security:audit` mensuellement
   - Surveiller les alertes GitHub Security (Dependabot)
   - Consulter les logs d'audit : `GET /api/v1/security/audit-logs`
   - Rotation des secrets tous les 90 jours (recommandé)

2. **Monitoring :**
   - Vérifier le score de sécurité : `GET /api/v1/security/status`
   - Monitorer les sessions actives : `GET /api/v1/security/active-sessions`
   - Consulter les logs quotidiennement
   - Vérifier les métriques : `GET /metrics`

3. **Backups :**
   - Tester la restauration des backups mensuellement
   - Effectuer des backups manuels avant chaque mise à jour
   - Vérifier l'espace disque des backups

4. **Mises à jour :**
   - Maintenir Node.js à jour (version LTS)
   - Exécuter `npm audit fix` régulièrement
   - Suivre les release notes du projet
   - Tester en staging avant production
