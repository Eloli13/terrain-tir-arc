# Guide de Déploiement Multi-Sites avec Reverse Proxy

**Configuration : Plusieurs sites web isolés sur un même serveur**
**Date : 2025-01-15**

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture multi-sites](#architecture-multi-sites)
3. [Configuration avec Nginx](#configuration-avec-nginx)
4. [Configuration avec Docker](#configuration-avec-docker)
5. [Isolation avec utilisateurs système](#isolation-avec-utilisateurs-système)
6. [Gestion SSL pour plusieurs domaines](#gestion-ssl-pour-plusieurs-domaines)
7. [Optimisation des ressources](#optimisation-des-ressources)
8. [Exemples complets](#exemples-complets)

---

## Vue d'ensemble

### Qu'est-ce qu'un reverse proxy multi-sites ?

Un reverse proxy permet d'héberger plusieurs sites web sur un même serveur, chacun avec :
- Son propre nom de domaine
- Son propre certificat SSL
- Ses propres ressources isolées
- Sa propre base de données

### Avantages

✅ **Économie de ressources** : Un seul serveur pour plusieurs sites
✅ **Isolation** : Les sites ne peuvent pas interférer entre eux
✅ **Centralisation** : Gestion simplifiée des sauvegardes et mises à jour
✅ **Sécurité** : Isolation au niveau système et réseau
✅ **Flexibilité** : Ajout/suppression de sites facilement

---

## Architecture multi-sites

### Scénario typique

Vous avez un serveur qui héberge :
1. **TirArc Istres** : `tirallarc-istres.fr` (port 3000)
2. **Site Club Archerie** : `club-archerie-istres.fr` (port 3001)
3. **Portfolio personnel** : `mon-portfolio.fr` (port 3002)
4. **API publique** : `api.monservice.fr` (port 3003)

### Structure recommandée

```
/var/www/
├── tirallarc/                    # Site 1
│   ├── server/ (Node.js:3000)
│   └── frontend/
├── club-archerie/                # Site 2
│   ├── server/ (Node.js:3001)
│   └── frontend/
├── portfolio/                    # Site 3
│   └── static/ (HTML/CSS/JS)
└── api-service/                  # Site 4
    └── server/ (Node.js:3003)

/home/
├── tirallarc/                    # Utilisateur 1
├── clubarcherie/                 # Utilisateur 2
├── portfolio/                    # Utilisateur 3
└── apiservice/                   # Utilisateur 4
```

---

## Configuration avec Nginx

### 1. Architecture Nginx pour multi-sites

Nginx agit comme reverse proxy unique qui route le trafic :

```
Internet (443)
    ↓
Nginx (Reverse Proxy)
    ├─→ tirallarc-istres.fr → localhost:3000
    ├─→ club-archerie-istres.fr → localhost:3001
    ├─→ mon-portfolio.fr → /var/www/portfolio (static)
    └─→ api.monservice.fr → localhost:3003
```

### 2. Configuration Nginx - Site TirArc (Port 3000)

**Fichier : `/etc/nginx/sites-available/tirallarc`**

```nginx
# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name tirallarc-istres.fr www.tirallarc-istres.fr;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name tirallarc-istres.fr www.tirallarc-istres.fr;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/tirallarc-istres.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tirallarc-istres.fr/privkey.pem;
    include /etc/nginx/snippets/ssl-params.conf;

    # Security Headers
    include /etc/nginx/snippets/security-headers.conf;

    # Frontend
    root /var/www/tirallarc;
    index index.html;

    # Client body size
    client_max_body_size 10M;

    # API Backend (Port 3000)
    location /api {
        proxy_pass http://127.0.0.1:3000;
        include /etc/nginx/snippets/proxy-params.conf;
    }

    location ~ ^/(health|metrics) {
        proxy_pass http://127.0.0.1:3000;
        include /etc/nginx/snippets/proxy-params.conf;
    }

    # Uploads
    location /uploads {
        alias /var/www/tirallarc/server/uploads;
        expires 30d;
    }

    # Static files
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Frontend fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Logs
    access_log /var/log/nginx/tirallarc-access.log;
    error_log /var/log/nginx/tirallarc-error.log;
}
```

### 3. Configuration Nginx - Site 2 (Port 3001)

**Fichier : `/etc/nginx/sites-available/club-archerie`**

```nginx
# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name club-archerie-istres.fr www.club-archerie-istres.fr;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name club-archerie-istres.fr www.club-archerie-istres.fr;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/club-archerie-istres.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/club-archerie-istres.fr/privkey.pem;
    include /etc/nginx/snippets/ssl-params.conf;

    # Security Headers
    include /etc/nginx/snippets/security-headers.conf;

    # Frontend
    root /var/www/club-archerie;
    index index.html;

    # Client body size
    client_max_body_size 5M;

    # API Backend (Port 3001)
    location /api {
        proxy_pass http://127.0.0.1:3001;
        include /etc/nginx/snippets/proxy-params.conf;
    }

    # Frontend fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Logs (séparés par site)
    access_log /var/log/nginx/club-archerie-access.log;
    error_log /var/log/nginx/club-archerie-error.log;
}
```

### 4. Configuration Nginx - Site statique (sans backend)

**Fichier : `/etc/nginx/sites-available/portfolio`**

```nginx
# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name mon-portfolio.fr www.mon-portfolio.fr;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name mon-portfolio.fr www.mon-portfolio.fr;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/mon-portfolio.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mon-portfolio.fr/privkey.pem;
    include /etc/nginx/snippets/ssl-params.conf;

    # Security Headers
    include /etc/nginx/snippets/security-headers.conf;

    # Frontend
    root /var/www/portfolio;
    index index.html;

    # Static files
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Frontend fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Logs
    access_log /var/log/nginx/portfolio-access.log;
    error_log /var/log/nginx/portfolio-error.log;
}
```

### 5. Snippets réutilisables

**Fichier : `/etc/nginx/snippets/ssl-params.conf`**

```nginx
# SSL Configuration moderne
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
```

**Fichier : `/etc/nginx/snippets/security-headers.conf`**

```nginx
# Security Headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=(self)" always;
```

**Fichier : `/etc/nginx/snippets/proxy-params.conf`**

```nginx
# Proxy Configuration
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_cache_bypass $http_upgrade;
proxy_read_timeout 90;
proxy_connect_timeout 90;
proxy_send_timeout 90;
```

### 6. Activation des sites

```bash
# Créer les snippets
sudo mkdir -p /etc/nginx/snippets

# Créer les fichiers snippets (coller le contenu ci-dessus)
sudo nano /etc/nginx/snippets/ssl-params.conf
sudo nano /etc/nginx/snippets/security-headers.conf
sudo nano /etc/nginx/snippets/proxy-params.conf

# Activer les sites
sudo ln -s /etc/nginx/sites-available/tirallarc /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/club-archerie /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

---

## Configuration avec Docker

### Avantage de Docker

Docker offre une **isolation complète** entre les sites :
- Chaque site dans son propre conteneur
- Réseau isolé par conteneur
- Gestion des ressources (CPU, RAM) par conteneur
- Déploiement et rollback simplifiés

### 1. Structure Docker pour multi-sites

```
/opt/docker/
├── tirallarc/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── app/
├── club-archerie/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── app/
└── nginx-proxy/
    └── docker-compose.yml
```

### 2. Configuration Docker Compose - TirArc

**Fichier : `/opt/docker/tirallarc/docker-compose.yml`**

```yaml
version: '3.8'

services:
  # Backend Node.js
  backend:
    build: .
    container_name: tirallarc-backend
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"  # Exposé uniquement en local
    environment:
      - NODE_ENV=production
      - DB_HOST=db
      - DB_PORT=5432
      - DB_NAME=terrain_tir_arc
      - DB_USER=tir_arc_user
      - DB_PASSWORD=${DB_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
    volumes:
      - ./app:/app
      - ./uploads:/app/server/uploads
      - ./logs:/app/server/logs
    depends_on:
      - db
    networks:
      - tirallarc-network
    labels:
      - "com.centurylinklabs.watchtower.enable=true"

  # PostgreSQL
  db:
    image: postgres:15-alpine
    container_name: tirallarc-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=terrain_tir_arc
      - POSTGRES_USER=tir_arc_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - tirallarc-network

volumes:
  postgres-data:

networks:
  tirallarc-network:
    driver: bridge
```

**Fichier : `/opt/docker/tirallarc/Dockerfile`**

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copier package.json et package-lock.json
COPY app/server/package*.json ./server/

# Installer les dépendances
RUN cd server && npm ci --production

# Copier le code
COPY app/ .

# Créer les répertoires nécessaires
RUN mkdir -p server/uploads server/logs

# Exposer le port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Démarrer l'application
CMD ["node", "server/server.js"]
```

**Fichier : `/opt/docker/tirallarc/.env`**

```bash
DB_PASSWORD=VotreMotDePasseSecurisePostgreSQL
JWT_SECRET=votre_cle_jwt_secrete_generee
JWT_REFRESH_SECRET=votre_cle_refresh_secrete_generee
SESSION_SECRET=votre_cle_session_secrete_generee
```

### 3. Nginx comme reverse proxy pour Docker

**Fichier : `/opt/docker/nginx-proxy/docker-compose.yml`**

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: nginx-reverse-proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./sites:/etc/nginx/conf.d:ro
      - ./ssl:/etc/nginx/ssl:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - ./logs:/var/log/nginx
    networks:
      - proxy-network

networks:
  proxy-network:
    external: true
```

### 4. Alternative : Traefik (reverse proxy automatique)

**Fichier : `/opt/docker/traefik/docker-compose.yml`**

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    container_name: traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"  # Dashboard
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt
    networks:
      - proxy-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(`traefik.example.com`)"
      - "traefik.http.routers.dashboard.service=api@internal"
      - "traefik.http.routers.dashboard.middlewares=auth"
      - "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$..."

networks:
  proxy-network:
    external: true
```

**Mise à jour de docker-compose.yml pour TirArc avec Traefik :**

```yaml
version: '3.8'

services:
  backend:
    build: .
    container_name: tirallarc-backend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      # ... autres variables
    volumes:
      - ./app:/app
    depends_on:
      - db
    networks:
      - tirallarc-network
      - proxy-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.tirallarc.rule=Host(`tirallarc-istres.fr`) || Host(`www.tirallarc-istres.fr`)"
      - "traefik.http.routers.tirallarc.entrypoints=websecure"
      - "traefik.http.routers.tirallarc.tls.certresolver=letsencrypt"
      - "traefik.http.services.tirallarc.loadbalancer.server.port=3000"

  db:
    image: postgres:15-alpine
    # ... configuration identique

networks:
  tirallarc-network:
    driver: bridge
  proxy-network:
    external: true
```

### 5. Commandes Docker utiles

```bash
# Créer le réseau proxy
docker network create proxy-network

# Démarrer Traefik
cd /opt/docker/traefik
docker-compose up -d

# Démarrer TirArc
cd /opt/docker/tirallarc
docker-compose up -d

# Voir les logs
docker-compose logs -f backend

# Redémarrer un service
docker-compose restart backend

# Mise à jour
docker-compose pull
docker-compose up -d

# Nettoyage
docker system prune -a
```

---

## Isolation avec utilisateurs système

### 1. Création d'utilisateurs séparés

```bash
# Créer un utilisateur par site
sudo adduser --system --group --home /home/tirallarc tirallarc
sudo adduser --system --group --home /home/clubarcherie clubarcherie
sudo adduser --system --group --home /home/portfolio portfolio

# Créer les répertoires
sudo mkdir -p /var/www/tirallarc
sudo mkdir -p /var/www/club-archerie
sudo mkdir -p /var/www/portfolio

# Assigner les propriétaires
sudo chown -R tirallarc:tirallarc /var/www/tirallarc
sudo chown -R clubarcherie:clubarcherie /var/www/club-archerie
sudo chown -R portfolio:portfolio /var/www/portfolio
```

### 2. Configuration PM2 par utilisateur

```bash
# Pour TirArc (utilisateur tirallarc)
sudo -u tirallarc bash -c "cd /var/www/tirallarc/server && pm2 start ecosystem.config.js"
sudo -u tirallarc bash -c "pm2 save"

# Pour Club Archerie (utilisateur clubarcherie)
sudo -u clubarcherie bash -c "cd /var/www/club-archerie/server && pm2 start ecosystem.config.js"
sudo -u clubarcherie bash -c "pm2 save"

# Configurer le démarrage automatique pour chaque utilisateur
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u tirallarc --hp /home/tirallarc
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u clubarcherie --hp /home/clubarcherie
```

### 3. Configuration des ports

**Fichier : `/var/www/tirallarc/server/ecosystem.config.js`**

```javascript
module.exports = {
  apps: [{
    name: 'tirallarc-backend',
    script: './server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000  // Port 3000 pour TirArc
    }
  }]
};
```

**Fichier : `/var/www/club-archerie/server/ecosystem.config.js`**

```javascript
module.exports = {
  apps: [{
    name: 'club-archerie-backend',
    script: './server.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001  // Port 3001 pour Club Archerie
    }
  }]
};
```

### 4. Isolation des bases de données PostgreSQL

```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Créer des bases de données séparées avec des utilisateurs séparés
CREATE DATABASE terrain_tir_arc;
CREATE USER tir_arc_user WITH ENCRYPTED PASSWORD 'password1';
GRANT ALL PRIVILEGES ON DATABASE terrain_tir_arc TO tir_arc_user;

CREATE DATABASE club_archerie_db;
CREATE USER club_archerie_user WITH ENCRYPTED PASSWORD 'password2';
GRANT ALL PRIVILEGES ON DATABASE club_archerie_db TO club_archerie_user;

-- Isolation complète : aucun utilisateur ne peut accéder à la base de l'autre
REVOKE ALL ON DATABASE club_archerie_db FROM tir_arc_user;
REVOKE ALL ON DATABASE terrain_tir_arc FROM club_archerie_user;

\q
```

---

## Gestion SSL pour plusieurs domaines

### 1. Certificats SSL avec Let's Encrypt

```bash
# Installer Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtenir un certificat pour chaque domaine
sudo certbot --nginx -d tirallarc-istres.fr -d www.tirallarc-istres.fr
sudo certbot --nginx -d club-archerie-istres.fr -d www.club-archerie-istres.fr
sudo certbot --nginx -d mon-portfolio.fr -d www.mon-portfolio.fr

# Certificat wildcard (pour plusieurs sous-domaines)
sudo certbot certonly --manual --preferred-challenges dns \
  -d *.example.com -d example.com
```

### 2. Renouvellement automatique

```bash
# Tester le renouvellement
sudo certbot renew --dry-run

# Le renouvellement automatique est géré par systemd
sudo systemctl status certbot.timer

# Forcer le renouvellement manuel
sudo certbot renew --force-renewal
```

### 3. Configuration SSL avec Cloudflare (optionnel)

Si vous utilisez Cloudflare :

```bash
# Générer un certificat Origin depuis Cloudflare Dashboard
# Télécharger les fichiers :
# - origin-cert.pem
# - origin-key.pem

# Les placer dans /etc/ssl/cloudflare/
sudo mkdir -p /etc/ssl/cloudflare
sudo mv origin-cert.pem /etc/ssl/cloudflare/
sudo mv origin-key.pem /etc/ssl/cloudflare/
sudo chmod 600 /etc/ssl/cloudflare/*

# Modifier la configuration Nginx
ssl_certificate /etc/ssl/cloudflare/origin-cert.pem;
ssl_certificate_key /etc/ssl/cloudflare/origin-key.pem;
```

---

## Optimisation des ressources

### 1. Limitation des ressources par site

**Avec systemd (pour PM2) :**

```bash
# Créer un fichier de service override
sudo systemctl edit pm2-tirallarc.service
```

```ini
[Service]
# Limiter à 1 GB de RAM
MemoryMax=1G
MemoryHigh=800M

# Limiter à 50% du CPU
CPUQuota=50%
```

**Avec Docker :**

```yaml
services:
  backend:
    # ... configuration
    deploy:
      resources:
        limits:
          cpus: '0.5'        # 50% d'un CPU
          memory: 1024M      # 1 GB de RAM
        reservations:
          cpus: '0.25'
          memory: 512M
```

### 2. Configuration PostgreSQL partagée optimisée

**Fichier : `/etc/postgresql/14/main/postgresql.conf`**

```ini
# Mémoire partagée (ajuster selon RAM totale du serveur)
shared_buffers = 256MB           # 25% de la RAM totale
effective_cache_size = 1GB       # 50-75% de la RAM

# Connexions par base
max_connections = 100

# Optimisations
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
```

### 3. Configuration Nginx pour multi-sites

**Fichier : `/etc/nginx/nginx.conf`**

```nginx
user www-data;
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 2048;
    use epoll;
    multi_accept on;
}

http {
    # Optimisations générales
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript
               application/javascript application/json application/xml+rss;

    # Rate limiting global
    limit_req_zone $binary_remote_addr zone=global:10m rate=10r/s;

    # Rate limiting par site
    limit_req_zone $binary_remote_addr zone=tirallarc:10m rate=20r/s;
    limit_req_zone $binary_remote_addr zone=clubarcherie:10m rate=15r/s;

    # Cache
    proxy_cache_path /var/cache/nginx/tirallarc levels=1:2
                     keys_zone=tirallarc_cache:10m max_size=100m inactive=60m;
    proxy_cache_path /var/cache/nginx/clubarcherie levels=1:2
                     keys_zone=clubarcherie_cache:10m max_size=50m inactive=60m;

    # Inclure les configurations des sites
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

---

## Exemples complets

### Scénario 1 : 3 sites Node.js + 1 site statique

```bash
# Structure
/var/www/
├── tirallarc/          (Node.js:3000, PostgreSQL, 1GB RAM)
├── club-archerie/      (Node.js:3001, PostgreSQL, 512MB RAM)
├── api-service/        (Node.js:3002, PostgreSQL, 512MB RAM)
└── portfolio/          (Static HTML/CSS/JS)

# Ports utilisés
3000 → tirallarc-istres.fr
3001 → club-archerie-istres.fr
3002 → api.monservice.fr
N/A  → mon-portfolio.fr (static)

# Bases de données
terrain_tir_arc    → tir_arc_user
club_archerie_db   → club_archerie_user
api_service_db     → api_service_user

# Utilisateurs système
tirallarc
clubarcherie
apiservice
portfolio
```

### Scénario 2 : Docker avec Traefik

```bash
# Structure
/opt/docker/
├── traefik/            (Reverse proxy automatique)
├── tirallarc/          (Node.js + PostgreSQL)
├── club-archerie/      (Node.js + PostgreSQL)
└── wordpress/          (WordPress + MySQL)

# Tout est géré automatiquement par Traefik via labels Docker
# SSL automatique avec Let's Encrypt
# Load balancing automatique
# Health checks automatiques
```

### Scénario 3 : Mix Docker + PM2

```bash
# Sites critiques en Docker (isolation maximale)
/opt/docker/
├── traefik/
└── tirallarc/          (Docker, port 3000)

# Sites légers en PM2 (performance maximale)
/var/www/
├── club-archerie/      (PM2, port 3001)
├── blog/               (PM2, port 3002)
└── portfolio/          (Static)

# Nginx route vers Docker (localhost:3000) et PM2 (localhost:3001, 3002)
```

---

## Checklist de déploiement multi-sites

### Configuration initiale

- [ ] Planifier l'architecture (ports, domaines, ressources)
- [ ] Créer les utilisateurs système séparés
- [ ] Configurer les répertoires avec les bonnes permissions
- [ ] Installer Nginx/Traefik comme reverse proxy
- [ ] Configurer le pare-feu pour chaque port

### Pour chaque site

- [ ] Déployer le code dans son répertoire dédié
- [ ] Créer une base de données et un utilisateur PostgreSQL dédiés
- [ ] Configurer les variables d'environnement (.env unique)
- [ ] Configurer PM2/Docker avec le bon port
- [ ] Créer la configuration Nginx spécifique
- [ ] Obtenir le certificat SSL
- [ ] Tester l'accès HTTPS
- [ ] Configurer les logs séparés
- [ ] Configurer les sauvegardes séparées

### Sécurité

- [ ] Isolation des utilisateurs système
- [ ] Isolation des bases de données
- [ ] Isolation des ports (127.0.0.1 uniquement)
- [ ] Rate limiting par site
- [ ] SSL pour tous les domaines
- [ ] Fail2Ban configuré

### Monitoring

- [ ] Health checks par site
- [ ] Logs séparés et rotatifs
- [ ] Alertes configurées
- [ ] Dashboard de monitoring (PM2 Plus ou autre)

---

## Avantages et inconvénients

### Approche Nginx + PM2

**Avantages :**
- ✅ Performance maximale (pas de virtualisation)
- ✅ Faible consommation mémoire
- ✅ Configuration simple
- ✅ Démarrage rapide

**Inconvénients :**
- ❌ Isolation limitée (même système)
- ❌ Gestion manuelle des dépendances
- ❌ Risque de conflits de versions Node.js

### Approche Docker + Traefik

**Avantages :**
- ✅ Isolation maximale (conteneurs)
- ✅ Portabilité totale
- ✅ Rollback facile
- ✅ Configuration automatique (Traefik)
- ✅ Scaling horizontal facile

**Inconvénients :**
- ❌ Consommation mémoire plus élevée
- ❌ Courbe d'apprentissage Docker
- ❌ Complexité accrue

### Approche hybride (recommandée)

**Meilleur des deux mondes :**
- Sites critiques → Docker (isolation)
- Sites légers → PM2 (performance)
- Reverse proxy Nginx ou Traefik

---

## Conclusion

Votre application **TirArc Istres** est **totalement compatible** avec un déploiement multi-sites via reverse proxy. Vous pouvez :

1. **Nginx + PM2** : Simple, performant, idéal pour 2-5 sites
2. **Docker + Traefik** : Isolation maximale, idéal pour 5+ sites
3. **Hybride** : Sites critiques en Docker, légers en PM2

Tous les sites sont isolés au niveau :
- Réseau (ports différents)
- Système (utilisateurs séparés)
- Base de données (databases séparées)
- Ressources (limites CPU/RAM)
- Logs et monitoring

**Recommandation pour débuter :**
Commencez avec Nginx + PM2 (plus simple), puis migrez vers Docker si besoin de plus d'isolation.

---

**Guide réalisé avec succès !** 🚀

*Dernière mise à jour : 2025-01-15*
