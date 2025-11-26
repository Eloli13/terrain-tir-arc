# Guide de Déploiement sur Serveur Linux

**Application : Gestion des Terrains de Tir à l'Arc**
**Version : 1.0.0**
**Date : 2025-01-15**

---

## Table des matières

1. [Prérequis](#prérequis)
2. [Configuration du serveur](#configuration-du-serveur)
3. [Installation des dépendances](#installation-des-dépendances)
4. [Configuration de PostgreSQL](#configuration-de-postgresql)
5. [Configuration du backend](#configuration-du-backend)
6. [Configuration du frontend](#configuration-du-frontend)
7. [Configuration Nginx](#configuration-nginx)
8. [SSL/HTTPS avec Let's Encrypt](#sslhttps-avec-lets-encrypt)
9. [Configuration PM2](#configuration-pm2)
10. [Sécurité](#sécurité)
11. [Monitoring](#monitoring)
12. [Sauvegarde](#sauvegarde)
13. [Maintenance](#maintenance)
14. [Dépannage](#dépannage)

---

## Prérequis

### Serveur recommandé
- **OS** : Ubuntu Server 22.04 LTS (ou Debian 11+)
- **RAM** : Minimum 2 GB (4 GB recommandé)
- **CPU** : 2 cores minimum
- **Disque** : 20 GB minimum (SSD recommandé)
- **Réseau** : Connexion Internet stable

### Nom de domaine
- Un nom de domaine configuré pointant vers votre serveur
- Exemple : `tirallarc-istres.fr`

### Accès
- Accès SSH root ou sudo
- Utilisateur non-root recommandé pour l'application

---

## Configuration du serveur

### 1. Mise à jour du système

```bash
# Se connecter au serveur
ssh root@votre-serveur.com

# Mise à jour des paquets
sudo apt update && sudo apt upgrade -y

# Installation des outils de base
sudo apt install -y curl wget git build-essential ufw fail2ban
```

### 2. Création d'un utilisateur dédié

```bash
# Créer un utilisateur pour l'application
sudo adduser tirallarc
sudo usermod -aG sudo tirallarc

# Passer à cet utilisateur
su - tirallarc
```

### 3. Configuration du pare-feu (UFW)

```bash
# Autoriser SSH
sudo ufw allow 22/tcp

# Autoriser HTTP et HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Activer le pare-feu
sudo ufw enable
sudo ufw status
```

---

## Installation des dépendances

### 1. Installation de Node.js

```bash
# Installation de Node.js 18.x LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Vérification
node --version  # Devrait afficher v18.x.x
npm --version   # Devrait afficher 9.x.x
```

### 2. Installation de PostgreSQL

```bash
# Installation de PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Vérification
sudo systemctl status postgresql
```

### 3. Installation de Nginx

```bash
# Installation de Nginx
sudo apt install -y nginx

# Démarrage et activation
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4. Installation de PM2

```bash
# Installation globale de PM2 (gestionnaire de processus Node.js)
sudo npm install -g pm2

# Configuration du démarrage automatique
pm2 startup systemd -u tirallarc --hp /home/tirallarc
# Exécuter la commande suggérée par PM2
```

---

## Configuration de PostgreSQL

### 1. Création de la base de données et de l'utilisateur

```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Dans le shell PostgreSQL, exécuter :
CREATE DATABASE terrain_tir_arc;
CREATE USER tir_arc_user WITH ENCRYPTED PASSWORD 'VotreMotDePasseSecurise123!';
GRANT ALL PRIVILEGES ON DATABASE terrain_tir_arc TO tir_arc_user;

# Quitter PostgreSQL
\q
```

### 2. Configuration de l'accès PostgreSQL

```bash
# Éditer pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Ajouter cette ligne après les autres configurations
# local   terrain_tir_arc    tir_arc_user                            md5

# Redémarrer PostgreSQL
sudo systemctl restart postgresql
```

### 3. Création du schéma de base de données

```bash
# Se placer dans le répertoire de l'application (après déploiement)
cd /var/www/tirallarc

# Se connecter à la base de données
psql -U tir_arc_user -d terrain_tir_arc -h localhost

# Copier et coller le contenu du fichier SQL suivant :
```

**Fichier : `database_postgres.sql`** (adapté pour PostgreSQL)

```sql
-- Base de données PostgreSQL pour la gestion des terrains de tir à l'arc

-- Table des administrateurs
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Table des sessions de tir
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    type_tireur VARCHAR(50) NOT NULL CHECK (type_tireur IN ('club', 'autre_club', 'service_sports')),
    nombre_tireurs INTEGER NOT NULL CHECK (nombre_tireurs > 0),
    terrain VARCHAR(20) NOT NULL CHECK (terrain IN ('interieur', 'exterieur')),
    date_debut TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_fin TIMESTAMP,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des incidents
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    type_incident VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    photo_path VARCHAR(255),
    terrain VARCHAR(20) NOT NULL CHECK (terrain IN ('interieur', 'exterieur')),
    date_incident TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    statut VARCHAR(50) DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'en_cours', 'resolu')),
    resolution_notes TEXT,
    date_resolution TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table de configuration
CREATE TABLE IF NOT EXISTS configuration (
    id SERIAL PRIMARY KEY,
    cle VARCHAR(50) UNIQUE NOT NULL,
    valeur TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des tokens de rafraîchissement
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(500) UNIQUE NOT NULL,
    admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertion des valeurs de configuration par défaut
INSERT INTO configuration (cle, valeur, description) VALUES
('telephone_responsable', '0123456789', 'Numéro de téléphone du responsable du club'),
('email_incidents', 'incidents@tirallarc-istres.fr', 'Email pour recevoir les signalements d''incidents'),
('qr_code_data', 'https://tirallarc-istres.fr/index.html', 'Données contenues dans le QR code')
ON CONFLICT (cle) DO NOTHING;

-- Création d'un compte admin par défaut (mot de passe : changez-moi-en-production)
-- Hash bcrypt pour "changez-moi-en-production" (12 rounds)
INSERT INTO admins (username, password_hash, email) VALUES
('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LRwDYGPvN4EHLwJVi', 'admin@tirallarc-istres.fr')
ON CONFLICT (username) DO NOTHING;

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date_debut);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(active);
CREATE INDEX IF NOT EXISTS idx_sessions_terrain ON sessions(terrain);
CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents(date_incident);
CREATE INDEX IF NOT EXISTS idx_incidents_statut ON incidents(statut);
CREATE INDEX IF NOT EXISTS idx_incidents_terrain ON incidents(terrain);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_admin ON refresh_tokens(admin_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Fonctions de mise à jour automatique du timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour la mise à jour automatique
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configuration_updated_at BEFORE UPDATE ON configuration
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Configuration du backend

### 1. Déploiement du code

```bash
# Créer le répertoire de l'application
sudo mkdir -p /var/www/tirallarc
sudo chown tirallarc:tirallarc /var/www/tirallarc

# Se placer dans le répertoire
cd /var/www/tirallarc

# Cloner le dépôt Git (ou transférer les fichiers)
git clone https://github.com/votre-repo/terrain_claude_code.git .

# Ou via SCP depuis votre machine locale :
# scp -r c:\Gemini\terrain_claude_code/* tirallarc@votre-serveur.com:/var/www/tirallarc/
```

### 2. Installation des dépendances backend

```bash
# Installer les dépendances du serveur
cd /var/www/tirallarc/server
npm install --production

# Créer les répertoires nécessaires
mkdir -p uploads/incidents
mkdir -p logs
chmod 755 uploads
chmod 755 logs
```

### 3. Configuration des variables d'environnement

```bash
# Copier le fichier d'exemple
cd /var/www/tirallarc/server
cp .env.example .env

# Éditer le fichier .env
nano .env
```

**Configuration .env pour la production :**

```bash
# Configuration de la base de données PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=terrain_tir_arc
DB_USER=tir_arc_user
DB_PASSWORD=VotreMotDePasseSecurise123!

# Clés de sécurité (GÉNÉRER DE NOUVELLES CLÉS!)
# Générer avec : node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=VOTRE_CLE_JWT_SECRETE_ICI
JWT_REFRESH_SECRET=VOTRE_CLE_REFRESH_SECRETE_ICI
SESSION_SECRET=VOTRE_CLE_SESSION_SECRETE_ICI

# Configuration serveur
PORT=3000
NODE_ENV=production

# Configuration CORS (votre domaine)
ALLOWED_ORIGINS=https://tirallarc-istres.fr,https://www.tirallarc-istres.fr

# Configuration de sécurité
BCRYPT_ROUNDS=12

# Configuration email (Gmail, SendGrid, ou autre)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre_app_password
EMAIL_FROM=noreply@tirallarc-istres.fr

# Configuration de logs
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Limites de taux (rate limiting)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Génération des clés secrètes

```bash
# Générer 3 clés secrètes différentes
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Copier ces valeurs dans le fichier .env
```

### 5. Initialisation de la base de données

```bash
# Exécuter les scripts de setup
cd /var/www/tirallarc/server

# Créer les tables (si le script existe)
node scripts/setup-database.js

# Ou importer le fichier SQL créé plus haut
psql -U tir_arc_user -d terrain_tir_arc -h localhost -f database_postgres.sql
```

### 6. Test du backend

```bash
# Tester le démarrage du serveur
cd /var/www/tirallarc/server
npm start

# Dans un autre terminal, tester l'API
curl http://localhost:3000/health

# Devrait retourner : {"status":"healthy", ...}

# Arrêter le serveur (Ctrl+C)
```

---

## Configuration du frontend

### 1. Structure des fichiers frontend

```bash
# Les fichiers frontend sont déjà dans le répertoire racine
cd /var/www/tirallarc

# Vérifier la présence des fichiers
ls -la
# Devrait afficher : index.html, declaration.html, incident.html, admin/, js/, css/, images/
```

### 2. Configuration de l'URL de l'API

Éditer les fichiers JavaScript pour pointer vers l'API en production :

```bash
# Éditer le fichier de configuration de l'API (si présent)
nano js/config.js
```

**Créer ou éditer `js/config.js` :**

```javascript
// Configuration de l'API
const API_CONFIG = {
    baseURL: 'https://tirallarc-istres.fr/api',
    timeout: 10000
};

// Export pour utilisation dans les autres scripts
window.API_CONFIG = API_CONFIG;
```

### 3. Mise à jour du manifest.json

```bash
# Éditer le manifest PWA
nano manifest.json
```

**Mise à jour des URLs :**

```json
{
  "name": "Tir à l'Arc Istres",
  "short_name": "TirArc",
  "description": "Gestion d'accès aux terrains de tir à l'arc",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#2c5f2d",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/images/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/images/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## Configuration Nginx

### 1. Création de la configuration Nginx

```bash
# Créer le fichier de configuration
sudo nano /etc/nginx/sites-available/tirallarc
```

**Configuration complète Nginx :**

```nginx
# Configuration HTTP (redirection vers HTTPS)
server {
    listen 80;
    listen [::]:80;
    server_name tirallarc-istres.fr www.tirallarc-istres.fr;

    # Redirection vers HTTPS
    return 301 https://$server_name$request_uri;
}

# Configuration HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name tirallarc-istres.fr www.tirallarc-istres.fr;

    # Certificats SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/tirallarc-istres.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tirallarc-istres.fr/privkey.pem;

    # Configuration SSL moderne
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Sécurité supplémentaire
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Racine du site (frontend)
    root /var/www/tirallarc;
    index index.html;

    # Taille maximale des uploads (pour les photos d'incidents)
    client_max_body_size 10M;

    # Compression gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    # Proxy pour l'API backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }

    # Health check et métriques
    location ~ ^/(health|metrics) {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Fichiers uploadés (photos incidents)
    location /uploads {
        alias /var/www/tirallarc/server/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Fichiers statiques (CSS, JS, images)
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service Worker (ne pas mettre en cache)
    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Manifest PWA
    location = /manifest.json {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Toutes les autres requêtes vers index.html (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Logs
    access_log /var/log/nginx/tirallarc-access.log;
    error_log /var/log/nginx/tirallarc-error.log;
}
```

### 2. Activation de la configuration

```bash
# Créer un lien symbolique
sudo ln -s /etc/nginx/sites-available/tirallarc /etc/nginx/sites-enabled/

# Supprimer la configuration par défaut
sudo rm /etc/nginx/sites-enabled/default

# Tester la configuration
sudo nginx -t

# Recharger Nginx (NE PAS REDÉMARRER tant que SSL n'est pas configuré)
# sudo systemctl reload nginx
```

---

## SSL/HTTPS avec Let's Encrypt

### 1. Installation de Certbot

```bash
# Installation de Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Obtention du certificat SSL

**IMPORTANT** : Avant d'exécuter cette commande, assurez-vous que :
- Votre domaine pointe vers l'IP de votre serveur
- Le port 80 est ouvert dans le pare-feu

```bash
# Obtenir le certificat SSL
sudo certbot --nginx -d tirallarc-istres.fr -d www.tirallarc-istres.fr

# Suivre les instructions :
# - Entrer votre email
# - Accepter les conditions
# - Choisir de rediriger HTTP vers HTTPS
```

### 3. Renouvellement automatique

```bash
# Tester le renouvellement
sudo certbot renew --dry-run

# Le renouvellement automatique est déjà configuré via cron
# Vérifier :
sudo systemctl status certbot.timer
```

### 4. Redémarrage de Nginx

```bash
# Maintenant on peut redémarrer Nginx avec SSL
sudo systemctl reload nginx
```

---

## Configuration PM2

### 1. Démarrage de l'application avec PM2

```bash
# Se placer dans le répertoire du serveur
cd /var/www/tirallarc/server

# Démarrer l'application avec PM2
pm2 start server.js --name "tirallarc-backend" --env production

# Vérifier le statut
pm2 status
```

### 2. Configuration avancée PM2

Créer un fichier de configuration PM2 :

```bash
# Créer ecosystem.config.js
nano /var/www/tirallarc/server/ecosystem.config.js
```

**Configuration PM2 :**

```javascript
module.exports = {
  apps: [{
    name: 'tirallarc-backend',
    script: './server.js',
    instances: 2, // Mode cluster avec 2 instances
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '500M',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    watch: false
  }]
};
```

### 3. Redémarrage avec la nouvelle configuration

```bash
# Supprimer l'ancienne configuration
pm2 delete all

# Démarrer avec le fichier de configuration
cd /var/www/tirallarc/server
pm2 start ecosystem.config.js

# Sauvegarder la configuration PM2
pm2 save

# Configurer le démarrage automatique
pm2 startup systemd
# Exécuter la commande suggérée par PM2
```

### 4. Commandes PM2 utiles

```bash
# Voir les logs en temps réel
pm2 logs tirallarc-backend

# Redémarrer l'application
pm2 restart tirallarc-backend

# Recharger sans downtime
pm2 reload tirallarc-backend

# Arrêter l'application
pm2 stop tirallarc-backend

# Informations détaillées
pm2 show tirallarc-backend

# Monitoring
pm2 monit
```

---

## Sécurité

### 1. Configuration de Fail2Ban

```bash
# Créer un filtre pour l'application
sudo nano /etc/fail2ban/filter.d/tirallarc.conf
```

**Contenu :**

```ini
[Definition]
failregex = ^.*"ip":"<HOST>".*"level":"security".*"message":"Tentative de connexion échouée".*$
ignoreregex =
```

**Créer la jail :**

```bash
sudo nano /etc/fail2ban/jail.d/tirallarc.conf
```

**Contenu :**

```ini
[tirallarc]
enabled = true
port = http,https
logpath = /var/www/tirallarc/server/logs/app.log
maxretry = 5
bantime = 3600
findtime = 600
```

**Redémarrer Fail2Ban :**

```bash
sudo systemctl restart fail2ban
sudo fail2ban-client status tirallarc
```

### 2. Permissions des fichiers

```bash
# Définir les permissions correctes
cd /var/www/tirallarc

# Propriétaire des fichiers
sudo chown -R tirallarc:tirallarc /var/www/tirallarc

# Permissions des fichiers
find /var/www/tirallarc -type f -exec chmod 644 {} \;
find /var/www/tirallarc -type d -exec chmod 755 {} \;

# Permissions spéciales pour les répertoires d'upload
chmod 755 /var/www/tirallarc/server/uploads
chmod 755 /var/www/tirallarc/server/logs

# Le fichier .env doit être protégé
chmod 600 /var/www/tirallarc/server/.env
```

### 3. Configuration du système

```bash
# Limiter les connexions simultanées
sudo nano /etc/security/limits.conf

# Ajouter :
tirallarc soft nofile 10000
tirallarc hard nofile 10000
```

### 4. Mises à jour de sécurité automatiques

```bash
# Installer unattended-upgrades
sudo apt install -y unattended-upgrades

# Configurer
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## Monitoring

### 1. Monitoring avec PM2 Plus (optionnel)

```bash
# S'inscrire sur https://pm2.io
# Obtenir la clé de connexion

# Connecter PM2 à PM2 Plus
pm2 link VOTRE_CLE_SECRETE VOTRE_CLE_PUBLIQUE
```

### 2. Logs centralisés

```bash
# Créer un script de rotation des logs
sudo nano /etc/logrotate.d/tirallarc
```

**Contenu :**

```
/var/www/tirallarc/server/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 tirallarc tirallarc
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 3. Monitoring système avec htop

```bash
# Installation
sudo apt install -y htop

# Utilisation
htop
```

### 4. Health check automatique

Créer un script de vérification :

```bash
# Créer le script
nano /home/tirallarc/healthcheck.sh
```

**Contenu :**

```bash
#!/bin/bash

# Health check de l'application
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)

if [ "$RESPONSE" != "200" ]; then
    echo "$(date): Health check échoué - Code HTTP: $RESPONSE" >> /var/log/tirallarc-health.log
    # Redémarrer l'application
    pm2 restart tirallarc-backend
    # Envoyer une alerte email (optionnel)
    # echo "L'application a été redémarrée" | mail -s "Alerte TirArc" admin@tirallarc-istres.fr
fi
```

**Rendre exécutable et ajouter au cron :**

```bash
chmod +x /home/tirallarc/healthcheck.sh

# Ajouter au crontab (toutes les 5 minutes)
crontab -e

# Ajouter cette ligne :
*/5 * * * * /home/tirallarc/healthcheck.sh
```

---

## Sauvegarde

### 1. Script de sauvegarde de la base de données

```bash
# Créer le répertoire de sauvegarde
mkdir -p /home/tirallarc/backups

# Créer le script de sauvegarde
nano /home/tirallarc/backup.sh
```

**Script de sauvegarde :**

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/home/tirallarc/backups"
DB_NAME="terrain_tir_arc"
DB_USER="tir_arc_user"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Créer le répertoire s'il n'existe pas
mkdir -p $BACKUP_DIR

# Sauvegarde de la base de données
echo "$(date): Début de la sauvegarde..."
PGPASSWORD=$DB_PASSWORD pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Sauvegarde des fichiers uploadés
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz -C /var/www/tirallarc/server uploads/

# Sauvegarde du fichier .env
cp /var/www/tirallarc/server/.env $BACKUP_DIR/env_backup_$DATE

# Supprimer les sauvegardes anciennes
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "uploads_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "env_backup_*" -mtime +$RETENTION_DAYS -delete

echo "$(date): Sauvegarde terminée"

# Envoyer une notification (optionnel)
# echo "Sauvegarde terminée avec succès" | mail -s "Sauvegarde TirArc" admin@tirallarc-istres.fr
```

**Rendre exécutable :**

```bash
chmod +x /home/tirallarc/backup.sh

# Tester
/home/tirallarc/backup.sh
```

### 2. Planification des sauvegardes

```bash
# Ajouter au crontab (tous les jours à 2h du matin)
crontab -e

# Ajouter cette ligne :
0 2 * * * /home/tirallarc/backup.sh >> /var/log/tirallarc-backup.log 2>&1
```

### 3. Sauvegarde distante (optionnel)

```bash
# Installation de rclone pour sauvegarder vers le cloud
curl https://rclone.org/install.sh | sudo bash

# Configuration de rclone (suivre les instructions pour Google Drive, Dropbox, etc.)
rclone config

# Modifier le script de sauvegarde pour inclure rclone
# Ajouter à la fin du script backup.sh :
# rclone copy $BACKUP_DIR remote:tirallarc-backups
```

### 4. Restauration

**Pour restaurer une sauvegarde :**

```bash
# Restaurer la base de données
gunzip -c /home/tirallarc/backups/db_backup_YYYYMMDD_HHMMSS.sql.gz | psql -U tir_arc_user -h localhost terrain_tir_arc

# Restaurer les fichiers uploadés
tar -xzf /home/tirallarc/backups/uploads_backup_YYYYMMDD_HHMMSS.tar.gz -C /var/www/tirallarc/server/

# Redémarrer l'application
pm2 restart tirallarc-backend
```

---

## Maintenance

### 1. Mise à jour de l'application

```bash
# Se placer dans le répertoire
cd /var/www/tirallarc

# Sauvegarder la version actuelle
cp -r /var/www/tirallarc /var/www/tirallarc_backup_$(date +%Y%m%d)

# Récupérer les nouvelles versions
git pull origin main
# Ou copier les nouveaux fichiers via SCP

# Mettre à jour les dépendances
cd server
npm install --production

# Redémarrer l'application
pm2 reload tirallarc-backend

# Vérifier que tout fonctionne
pm2 logs tirallarc-backend
curl https://tirallarc-istres.fr/health
```

### 2. Mise à jour de Node.js

```bash
# Installer nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Recharger le shell
source ~/.bashrc

# Installer une nouvelle version de Node.js
nvm install 18
nvm use 18

# Réinstaller PM2 globalement
npm install -g pm2

# Redémarrer les applications
pm2 restart all
```

### 3. Nettoyage des logs

```bash
# Nettoyer les logs PM2
pm2 flush

# Nettoyer les logs de l'application
cd /var/www/tirallarc/server/logs
find . -name "*.log" -mtime +30 -delete

# Nettoyer les logs Nginx
sudo find /var/log/nginx -name "*.log" -mtime +30 -delete
```

### 4. Nettoyage de la base de données

```bash
# Se connecter à PostgreSQL
psql -U tir_arc_user -d terrain_tir_arc -h localhost

# Supprimer les anciennes sessions (plus de 1 an)
DELETE FROM sessions WHERE date_debut < NOW() - INTERVAL '1 year';

# Supprimer les incidents résolus (plus de 6 mois)
DELETE FROM incidents WHERE statut = 'resolu' AND date_resolution < NOW() - INTERVAL '6 months';

# Supprimer les anciens tokens expirés
DELETE FROM refresh_tokens WHERE expires_at < NOW();

# Optimiser la base de données
VACUUM ANALYZE;

# Quitter
\q
```

---

## Dépannage

### 1. L'application ne démarre pas

```bash
# Vérifier les logs PM2
pm2 logs tirallarc-backend

# Vérifier les logs de l'application
tail -f /var/www/tirallarc/server/logs/app.log

# Vérifier que toutes les dépendances sont installées
cd /var/www/tirallarc/server
npm install

# Vérifier le fichier .env
cat /var/www/tirallarc/server/.env

# Tester manuellement
cd /var/www/tirallarc/server
npm start
```

### 2. Erreur de connexion à la base de données

```bash
# Vérifier que PostgreSQL fonctionne
sudo systemctl status postgresql

# Tester la connexion
psql -U tir_arc_user -d terrain_tir_arc -h localhost

# Vérifier les permissions dans pg_hba.conf
sudo cat /etc/postgresql/14/main/pg_hba.conf

# Redémarrer PostgreSQL
sudo systemctl restart postgresql
```

### 3. Erreur 502 Bad Gateway (Nginx)

```bash
# Vérifier que l'application fonctionne
pm2 status
curl http://localhost:3000/health

# Vérifier les logs Nginx
sudo tail -f /var/log/nginx/tirallarc-error.log

# Vérifier la configuration Nginx
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
```

### 4. Certificat SSL expiré

```bash
# Renouveler manuellement
sudo certbot renew

# Vérifier la date d'expiration
sudo certbot certificates

# Redémarrer Nginx
sudo systemctl reload nginx
```

### 5. Problème de permissions

```bash
# Réinitialiser les permissions
cd /var/www/tirallarc
sudo chown -R tirallarc:tirallarc .
find . -type f -exec chmod 644 {} \;
find . -type d -exec chmod 755 {} \;
chmod 600 server/.env
chmod 755 server/uploads
chmod 755 server/logs
```

### 6. L'application consomme trop de mémoire

```bash
# Voir l'utilisation mémoire
pm2 monit

# Réduire le nombre d'instances dans ecosystem.config.js
nano /var/www/tirallarc/server/ecosystem.config.js
# Modifier : instances: 1

# Redémarrer
pm2 reload tirallarc-backend

# Ajouter une limite de mémoire
pm2 restart tirallarc-backend --max-memory-restart 300M
```

### 7. Tests de connectivité

```bash
# Tester l'API en local
curl http://localhost:3000/health

# Tester l'API via Nginx
curl https://tirallarc-istres.fr/api/health

# Tester depuis l'extérieur
curl https://tirallarc-istres.fr

# Vérifier les ports ouverts
sudo netstat -tulpn | grep -E ':(80|443|3000)'

# Tester la résolution DNS
nslookup tirallarc-istres.fr

# Tester SSL
openssl s_client -connect tirallarc-istres.fr:443
```

---

## Checklist de déploiement

### Avant le déploiement

- [ ] Nom de domaine configuré et pointant vers le serveur
- [ ] Serveur Linux (Ubuntu 22.04) configuré
- [ ] Accès SSH fonctionnel
- [ ] Certificats SSL prêts ou Let's Encrypt installé

### Configuration du serveur

- [ ] Système mis à jour (`apt update && apt upgrade`)
- [ ] Pare-feu configuré (UFW)
- [ ] Fail2Ban installé et configuré
- [ ] Node.js 18+ installé
- [ ] PostgreSQL installé et configuré
- [ ] Nginx installé
- [ ] PM2 installé globalement

### Base de données

- [ ] Base de données PostgreSQL créée
- [ ] Utilisateur PostgreSQL créé
- [ ] Schéma de base de données importé
- [ ] Permissions configurées

### Backend

- [ ] Code déployé dans `/var/www/tirallarc`
- [ ] Dépendances npm installées
- [ ] Fichier `.env` configuré avec les vraies valeurs
- [ ] Clés JWT/Session générées et sécurisées
- [ ] Répertoires `uploads/` et `logs/` créés
- [ ] Application démarre avec PM2
- [ ] Health check fonctionne

### Frontend

- [ ] Fichiers HTML/CSS/JS en place
- [ ] Configuration API mise à jour
- [ ] Manifest PWA configuré
- [ ] Service Worker testé

### Nginx

- [ ] Configuration Nginx créée
- [ ] SSL/HTTPS configuré
- [ ] Reverse proxy vers le backend fonctionne
- [ ] Compression gzip activée
- [ ] Headers de sécurité configurés

### Sécurité

- [ ] Certificat SSL actif
- [ ] Redirection HTTP vers HTTPS
- [ ] Permissions des fichiers correctes
- [ ] `.env` protégé (chmod 600)
- [ ] Rate limiting configuré
- [ ] Fail2Ban actif

### Monitoring & Sauvegarde

- [ ] PM2 configuré pour le redémarrage automatique
- [ ] Script de sauvegarde créé
- [ ] Sauvegarde planifiée (cron)
- [ ] Health check automatique configuré
- [ ] Logs rotatifs configurés

### Tests finaux

- [ ] Accès à `https://votre-domaine.com` fonctionne
- [ ] Scanner QR fonctionne
- [ ] Déclaration de session fonctionne
- [ ] Signalement d'incident fonctionne
- [ ] Interface admin accessible
- [ ] Authentification admin fonctionne
- [ ] Export de données fonctionne
- [ ] Mode hors ligne PWA fonctionne
- [ ] Health check répond correctement
- [ ] Logs enregistrés correctement

---

## URLs importantes

Après le déploiement, ces URLs seront accessibles :

| URL | Description |
|-----|-------------|
| `https://tirallarc-istres.fr` | Page d'accueil (scanner QR) |
| `https://tirallarc-istres.fr/declaration.html` | Formulaire de déclaration |
| `https://tirallarc-istres.fr/incident.html` | Signalement d'incident |
| `https://tirallarc-istres.fr/admin/` | Interface d'administration |
| `https://tirallarc-istres.fr/api` | API REST |
| `https://tirallarc-istres.fr/health` | Health check |
| `https://tirallarc-istres.fr/metrics` | Métriques système |
| `https://tirallarc-istres.fr/api/docs` | Documentation API |

---

## Support et contact

Pour toute question ou problème :

- **Documentation** : Ce fichier `DEPLOIEMENT_LINUX.md`
- **Logs** : `/var/www/tirallarc/server/logs/`
- **Monitoring** : `pm2 monit` ou PM2 Plus

---

**Déploiement réalisé avec succès !** 🎯

*Dernière mise à jour : 2025-01-15*
