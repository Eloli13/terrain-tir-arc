# Configuration Multi-Environnements

Ce document explique comment l'application gère les différents environnements (développement local vs production).

---

## Vue d'Ensemble

L'application s'adapte automatiquement selon l'environnement de déploiement :

| Environnement | Détection | Port Backend | URL API |
|--------------|-----------|--------------|---------|
| **Local (Docker)** | hostname = `localhost` ou `127.0.0.1` | 80 | `http://localhost/api` |
| **Production (Coolify)** | hostname contient `hstgr.cloud` | 3000 | `https://{domain}:3000/api` |
| **Autre Production** | autre hostname | variable | `/api` (relatif) |

---

## Configuration Frontend

### Fichier: `js/database.js`

```javascript
static API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost/api'  // Local: port 80
    : window.location.hostname.includes('hstgr.cloud')
        ? `${window.location.protocol}//${window.location.hostname}:3000/api`  // Production Coolify: port 3000
        : '/api';  // Autre: utiliser le même domaine
```

### Logique de Détection

1. **Développement Local**
   - Condition: `hostname === 'localhost'` ou `hostname === '127.0.0.1'`
   - URL API: `http://localhost/api` (port 80 via Nginx)
   - Utilisation: Docker Compose local

2. **Production Coolify**
   - Condition: `hostname.includes('hstgr.cloud')`
   - URL API: `https://istres.srv759477.hstgr.cloud:3000/api`
   - Utilisation: Serveur Coolify avec Traefik reverse proxy

3. **Autre Production**
   - Condition: tous les autres cas
   - URL API: `/api` (chemin relatif)
   - Utilisation: déploiement standard avec reverse proxy

---

## Architecture par Environnement

### 1. Développement Local (Docker Compose)

```
┌─────────────────────────────────────────┐
│         Navigateur (localhost)          │
│         http://localhost/               │
└────────────────┬────────────────────────┘
                 │
                 │ Port 80
                 ▼
┌─────────────────────────────────────────┐
│      Container: tirallarc-app           │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │    Nginx (Port 80)               │  │
│  │    - Frontend statique            │  │
│  │    - Proxy /api → localhost:3000  │  │
│  └─────────────┬────────────────────┘  │
│                │                        │
│                ▼                        │
│  ┌──────────────────────────────────┐  │
│  │    Node.js Backend (Port 3000)   │  │
│  │    - Express API                  │  │
│  │    - JWT Auth                     │  │
│  └─────────────┬────────────────────┘  │
└────────────────┼────────────────────────┘
                 │
                 │ Port 5432
                 ▼
┌─────────────────────────────────────────┐
│      Container: tirallarc-db            │
│      PostgreSQL 15                      │
└─────────────────────────────────────────┘
```

**Configuration Docker Compose**:
```yaml
services:
  app:
    ports:
      - "80:80"      # Nginx expose le port 80
    environment:
      PORT: 3000      # Backend Node.js écoute sur 3000

  postgres:
    ports:
      - "5432:5432"   # Base de données
```

**Nginx interne** (`nginx.conf`):
```nginx
server {
    listen 80;

    # Frontend statique
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API vers Node.js interne
    location /api {
        proxy_pass http://localhost:3000;
    }

    location /health {
        proxy_pass http://localhost:3000;
    }
}
```

### 2. Production Coolify (Hostinger)

```
┌────────────────────────────────────────────┐
│           Utilisateur Internet             │
│  https://istres.srv759477.hstgr.cloud   │
└────────────────┬───────────────────────────┘
                 │
                 │ HTTPS (443)
                 ▼
┌────────────────────────────────────────────┐
│         Traefik (Coolify Proxy)            │
│         - SSL/TLS (Let's Encrypt)          │
│         - Routing automatique              │
└────────────────┬───────────────────────────┘
                 │
                 │ Port 3000
                 ▼
┌────────────────────────────────────────────┐
│       Application Container                │
│                                            │
│  ┌──────────────────────────────────┐     │
│  │  Node.js + Nginx                 │     │
│  │  - Frontend: Nginx sur port 80   │     │
│  │  - Backend: Node.js sur port 3000│     │
│  └──────────────┬───────────────────┘     │
└─────────────────┼──────────────────────────┘
                  │
                  │ PostgreSQL (interne ou externe)
                  ▼
┌────────────────────────────────────────────┐
│         Base de Données PostgreSQL         │
└────────────────────────────────────────────┘
```

**Configuration Coolify**:
- **Port exposé**: 3000 (Node.js backend)
- **Frontend**: Servi par Nginx en interne, accessible via reverse proxy
- **SSL**: Géré automatiquement par Traefik
- **Domaine**: `istres.srv759477.hstgr.cloud`

**Variables d'environnement**:
```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://istres.srv759477.hstgr.cloud
DB_HOST=postgres
DB_PORT=5432
```

---

## Configuration Backend

### Variables d'Environnement

Le backend utilise les mêmes variables dans tous les environnements, seules les valeurs changent.

**Fichier**: `.env` (local) ou Coolify Environment Variables (production)

```env
# Environnement
NODE_ENV=development|production

# Serveur
PORT=3000
HOST=0.0.0.0

# Base de données
DB_HOST=postgres|localhost|IP
DB_PORT=5432
DB_NAME=terrain_tir_arc
DB_USER=tir_arc_user
DB_PASSWORD=<selon environnement>

# JWT
JWT_SECRET=<secret 256 bits>
JWT_REFRESH_SECRET=<secret 256 bits>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# CORS
CORS_ORIGIN=http://localhost|https://istres.srv759477.hstgr.cloud

# Logs
LOG_LEVEL=debug|info|warn|error
```

### Comparaison des Configurations

| Variable | Développement Local | Production Coolify |
|----------|-------------------|-------------------|
| `NODE_ENV` | `development` | `production` |
| `PORT` | `3000` | `3000` |
| `DB_HOST` | `postgres` (nom container) | `postgres` ou IP externe |
| `DB_PASSWORD` | `dev_password_123` | Mot de passe fort généré |
| `JWT_SECRET` | Simple (dev) | Complexe (256 bits) |
| `CORS_ORIGIN` | `http://localhost` | `https://istres.srv759477.hstgr.cloud` |
| `LOG_LEVEL` | `debug` | `info` |

---

## Service Worker et Cache

Le Service Worker gère le cache différemment selon l'environnement.

### Développement

- Cache désactivé ou minimal
- Hard reload fréquent
- DevTools pour déboguer

### Production

- Cache agressif des assets statiques
- Stratégie Network First pour l'API
- Mise à jour automatique des caches

### Nettoyage du Cache

**Page utilitaire**: `http://localhost/clear-cache.html`

Cette page permet de :
- Désinstaller les Service Workers
- Vider le LocalStorage
- Supprimer tous les caches
- Redémarrer proprement l'application

```javascript
// Désinstaller tous les Service Workers
const registrations = await navigator.serviceWorker.getRegistrations();
for (let registration of registrations) {
    await registration.unregister();
}

// Vider tous les caches
const cacheNames = await caches.keys();
for (let cacheName of cacheNames) {
    await caches.delete(cacheName);
}

// Vider le LocalStorage
localStorage.clear();
```

---

## Tests Multi-Environnements

### Tester en Local

```bash
# 1. Démarrer les conteneurs
docker-compose up -d

# 2. Vérifier les logs
docker-compose logs -f

# 3. Tester l'API
curl http://localhost/health
curl http://localhost/api/sessions/stats

# 4. Ouvrir dans le navigateur
# http://localhost
```

### Tester la Configuration Production (Simulation)

Pour simuler la production en local, modifier temporairement `/etc/hosts`:

```bash
# Windows: C:\Windows\System32\drivers\etc\hosts
# Linux/Mac: /etc/hosts

127.0.0.1 istres.srv759477.hstgr.cloud
```

Puis accéder à `http://istres.srv759477.hstgr.cloud` (l'API utilisera le port 3000).

**⚠️ Important**: Ne pas oublier de retirer cette ligne après les tests !

---

## Debugging

### Vérifier l'URL API Utilisée

Ouvrir la console du navigateur et exécuter :

```javascript
console.log('Hostname:', window.location.hostname);
console.log('API URL:', DatabaseManager.API_BASE_URL);
```

**Résultats attendus**:

| Environnement | Hostname | API URL |
|--------------|----------|---------|
| Local | `localhost` | `http://localhost/api` |
| Production | `istres.srv759477.hstgr.cloud` | `https://istres.srv759477.hstgr.cloud:3000/api` |

### Vérifier la Connexion API

```javascript
// Dans la console du navigateur
await DatabaseManager.init();
console.log('API disponible:', DatabaseManager.useAPI);
```

Si `useAPI = false`, vérifier :
1. Backend est démarré
2. Firewall/ports ouverts
3. CORS configuré correctement
4. URL API correcte

### Logs Backend

```bash
# Docker local
docker logs tirallarc-app -f

# Coolify
# Voir les logs dans l'interface Coolify
```

---

## Migration entre Environnements

### De Local → Production

1. **Préparer les variables d'environnement**
   - Copier `.env.local` vers `.env.production`
   - Remplacer les valeurs de développement

2. **Build de l'image Docker**
   ```bash
   docker build -t votre-registry/tirallarc:latest .
   docker push votre-registry/tirallarc:latest
   ```

3. **Déployer sur Coolify**
   - Suivre `DEPLOIEMENT_COOLIFY_COMPLET.md`
   - Configurer les variables d'environnement
   - Déployer l'application

4. **Configurer le DNS**
   - Suivre `CONFIGURATION_DNS.md`
   - Pointer vers l'IP Coolify
   - Attendre propagation DNS

5. **Vérifier le déploiement**
   ```bash
   curl https://istres.srv759477.hstgr.cloud:3000/health
   ```

### De Production → Local

1. **Exporter la base de données**
   ```bash
   pg_dump -h production -U user -d terrain_tir_arc > backup.sql
   ```

2. **Importer en local**
   ```bash
   docker exec -i tirallarc-db psql -U tir_arc_user -d terrain_tir_arc < backup.sql
   ```

3. **Tester en local**
   ```bash
   curl http://localhost/api/sessions/stats
   ```

---

## Checklist de Déploiement

### Avant de déployer en production

- [ ] Variables d'environnement configurées
- [ ] Secrets JWT générés (256 bits minimum)
- [ ] Mot de passe admin changé
- [ ] Mot de passe base de données fort
- [ ] CORS configuré pour le domaine de production
- [ ] SSL/TLS activé (Traefik/Let's Encrypt)
- [ ] DNS configuré et propagé
- [ ] Backup de la base de données configuré
- [ ] Logs de production configurés (niveau info ou warn)
- [ ] Health checks fonctionnels
- [ ] Monitoring en place (optionnel)

### Après le déploiement

- [ ] Tester l'accès HTTPS
- [ ] Vérifier le health check: `curl https://domain:3000/health`
- [ ] Tester l'authentification admin
- [ ] Créer une session de test
- [ ] Créer un incident de test
- [ ] Vérifier les logs backend
- [ ] Tester depuis mobile (PWA)
- [ ] Vérifier les performances
- [ ] Documenter les accès admin

---

## Support et Dépannage

### Problème: Frontend ne se connecte pas à l'API

**Symptômes**:
- Erreur 503 dans la console
- Message "API indisponible"
- Fallback sur localStorage

**Solutions**:
1. Vérifier l'URL API dans la console :
   ```javascript
   console.log(DatabaseManager.API_BASE_URL);
   ```

2. Vérifier que le backend répond :
   ```bash
   curl http://localhost/health  # ou https://domain:3000/health
   ```

3. Vérifier les CORS :
   - Backend doit autoriser l'origine du frontend
   - Vérifier la variable `CORS_ORIGIN`

4. Nettoyer le cache du navigateur :
   - Aller sur `/clear-cache.html`
   - Ou Ctrl+Shift+R (hard reload)

### Problème: Port 3000 ne répond pas

**Solutions**:
1. Vérifier que le backend écoute sur le bon port :
   ```bash
   docker logs tirallarc-app | grep "listening"
   ```

2. Vérifier la variable `PORT` dans `.env`

3. Vérifier que Nginx proxifie correctement :
   ```bash
   docker exec tirallarc-app cat /etc/nginx/conf.d/default.conf
   ```

### Problème: "Mixed Content" en production

**Symptômes**: Erreur "blocked loading mixed active content"

**Cause**: Page HTTPS charge des ressources HTTP

**Solutions**:
1. Vérifier que `API_BASE_URL` utilise `https://` en production
2. S'assurer que tous les assets utilisent des URLs relatives ou HTTPS
3. Ajouter dans `index.html` :
   ```html
   <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
   ```

---

## Ressources

- [Guide de déploiement Coolify](DEPLOIEMENT_COOLIFY_COMPLET.md)
- [Configuration DNS](CONFIGURATION_DNS.md)
- [Rapport de tests](RAPPORT_TESTS_CONFIGURATION_API.md)
- [Documentation Docker Compose](docker-compose.yml)
- [Documentation Nginx](nginx.conf)
