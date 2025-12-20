# Déploiement Local - Gestion Site Tir à l'Arc

> **⚠️ ATTENTION - DOCUMENTATION PARTIELLEMENT OBSOLÈTE**
>
> Ce guide contient des références à `database.sql` qui est un fichier **OBSOLÈTE et DANGEREUX**.
>
> **👉 Pour un déploiement production, utilisez:** [DEPLOIEMENT_PRODUCTION.md](../../../DEPLOIEMENT_PRODUCTION.md)
>
> Pour le développement local, ce guide reste valable mais ignorez toutes les références à `database.sql`.

---

**Mode développement pour tester et modifier l'application en local**

---

## 🎯 Objectif

Déployer l'application en local avec Docker pour :
- Tester l'application avant le déploiement sur Coolify
- Faire des modifications au code
- Déboguer et développer de nouvelles fonctionnalités

---

## 📋 Prérequis

- ✅ **Docker Desktop** installé et démarré
- ✅ **Git Bash** ou **PowerShell** (Windows)
- ✅ **Éditeur de code** (VS Code recommandé)
- ✅ Port 80 et 5432 disponibles sur votre machine

---

## 🚀 Démarrage rapide

### Étape 1 : Ouvrir le terminal

```powershell
# Dans PowerShell
cd C:\Gemini\terrain_claude_code
```

### Étape 2 : Démarrer l'application

```powershell
# Construire et démarrer tous les services
docker-compose up --build

# OU en mode détaché (arrière-plan)
docker-compose up -d --build
```

**Attendez 30-60 secondes** que tous les services démarrent.

### Étape 3 : Vérifier que tout fonctionne

**Dans le navigateur, ouvrez :**

```
✅ http://localhost              → Page d'accueil
✅ http://localhost/health       → Health check API
✅ http://localhost/admin/       → Interface admin
✅ http://localhost/declaration.html
✅ http://localhost/incident.html
```

**Health check devrait retourner :**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T...",
  "version": "1.0.0",
  "environment": "development",
  "uptime": 12.34
}
```

---

## 📊 Architecture locale

```
Docker Compose
├─ Service: postgres (Port 5432)
│  └─ Base de données PostgreSQL
│
└─ Service: app (Port 80)
   ├─ Nginx (Port 80) → Frontend
   └─ Node.js (Port 3000) → Backend API
```

**Réseau Docker :**
- Les deux services communiquent via le réseau `tirallarc-network`
- L'app accède à la DB via `postgres:5432` (nom du service)

---

## 🔧 Commandes utiles

### Démarrer l'application

```powershell
# Première fois (avec build)
docker-compose up --build

# Démarrages suivants (sans rebuild)
docker-compose up

# En arrière-plan
docker-compose up -d
```

### Arrêter l'application

```powershell
# Arrêter les services
docker-compose down

# Arrêter ET supprimer les volumes (réinitialiser la DB)
docker-compose down -v
```

### Voir les logs

```powershell
# Tous les services
docker-compose logs -f

# Uniquement l'app
docker-compose logs -f app

# Uniquement la base de données
docker-compose logs -f postgres
```

### Rebuild après modifications

```powershell
# Rebuild l'image de l'app
docker-compose build app

# Rebuild et redémarrer
docker-compose up --build -d
```

### Redémarrer un service

```powershell
# Redémarrer l'app uniquement
docker-compose restart app

# Redémarrer la base de données
docker-compose restart postgres
```

### Accéder à un conteneur

```powershell
# Terminal dans le conteneur app
docker exec -it tirallarc-app sh

# Terminal dans le conteneur postgres
docker exec -it tirallarc-db psql -U tir_arc_user -d terrain_tir_arc
```

### Vérifier l'état des services

```powershell
# Voir les conteneurs actifs
docker-compose ps

# Voir les volumes
docker volume ls

# Voir les réseaux
docker network ls
```

---

## 🛠️ Mode développement avec hot reload

Si vous souhaitez modifier le code **sans avoir à rebuild** à chaque fois :

### Étape 1 : Activer les volumes de développement

Éditez [docker-compose.yml](docker-compose.yml) et **décommentez** ces lignes :

```yaml
volumes:
  # Volumes pour le développement (hot reload)
  - ./server:/app
  - /app/node_modules
  - ./css:/var/www/html/css
  - ./js:/var/www/html/js
  - ./admin:/var/www/html/admin
  - ./index.html:/var/www/html/index.html
  - ./declaration.html:/var/www/html/declaration.html
  - ./incident.html:/var/www/html/incident.html
```

### Étape 2 : Installer nodemon

**Dans le conteneur ou localement :**

```powershell
cd server
npm install --save-dev nodemon
```

### Étape 3 : Modifier le script de démarrage

Éditez [server/package.json](server/package.json) :

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

### Étape 4 : Redémarrer avec nodemon

Modifiez le CMD dans [start.sh](start.sh) :

```bash
exec su-exec nodejs npm run dev
```

**OU lancez manuellement :**

```powershell
docker exec -it tirallarc-app sh
cd /app
npm run dev
```

**Résultat :** Les modifications du code seront automatiquement détectées et l'app redémarrera.

---

## 🗄️ Gestion de la base de données

### Import du schéma initial

Le fichier [database.sql](database.sql) est automatiquement importé au premier démarrage de PostgreSQL.

Si vous souhaitez **réimporter** :

```powershell
# Supprimer les volumes et redémarrer
docker-compose down -v
docker-compose up -d
```

### Accéder à la base de données

**Via psql :**

```powershell
docker exec -it tirallarc-db psql -U tir_arc_user -d terrain_tir_arc
```

**Commandes SQL utiles :**

```sql
-- Lister les tables
\dt

-- Voir les sessions
SELECT * FROM sessions;

-- Voir les incidents
SELECT * FROM incidents;

-- Voir les admins
SELECT * FROM admins;

-- Quitter
\q
```

### Modifier les données

**Exemple : Changer le mot de passe admin :**

```sql
-- Mot de passe : nouveaumotdepasse
UPDATE admins
SET password_hash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LRwDYGPvN4EHLwJVi'
WHERE username = 'admin';
```

**Note :** Pour générer un nouveau hash bcrypt, utilisez :

```javascript
const bcrypt = require('bcrypt');
bcrypt.hash('nouveaumotdepasse', 12).then(console.log);
```

### Sauvegarder la base de données

```powershell
# Dump de la base de données
docker exec tirallarc-db pg_dump -U tir_arc_user terrain_tir_arc > backup.sql

# Restaurer un backup
docker exec -i tirallarc-db psql -U tir_arc_user terrain_tir_arc < backup.sql
```

---

## 📂 Structure des dossiers

```
C:\Gemini\terrain_claude_code\
├── docker-compose.yml        → Configuration Docker Compose
├── Dockerfile                → Image de production
├── .env.local                → Variables d'environnement (local)
├── database.sql              → Schéma PostgreSQL
│
├── server/                   → Backend Node.js
│   ├── server.js
│   ├── package.json
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   └── utils/
│
├── css/                      → Frontend CSS
├── js/                       → Frontend JavaScript
├── admin/                    → Interface admin
├── images/                   → Images statiques
│
├── index.html                → Page d'accueil
├── declaration.html          → Déclaration de session
├── incident.html             → Déclaration d'incident
├── manifest.json             → PWA manifest
└── sw.js                     → Service Worker
```

---

## 🔍 Dépannage

### Problème : Port 80 déjà utilisé

**Erreur :**
```
Error starting userland proxy: listen tcp 0.0.0.0:80: bind: address already in use
```

**Solution 1 : Arrêter le service qui utilise le port 80**

```powershell
# Trouver le processus
netstat -ano | findstr :80

# Arrêter le processus (remplacer PID)
taskkill /PID [PID] /F
```

**Solution 2 : Changer le port dans docker-compose.yml**

```yaml
ports:
  - "8080:80"  # Utiliser le port 8080 au lieu de 80
```

Puis accéder à : `http://localhost:8080`

---

### Problème : Port 5432 déjà utilisé

**Si vous avez déjà PostgreSQL installé localement :**

**Solution : Changer le port dans docker-compose.yml**

```yaml
postgres:
  ports:
    - "5433:5432"  # Port externe 5433
```

---

### Problème : "Cannot connect to database"

**Vérifier que PostgreSQL est démarré :**

```powershell
docker-compose ps

# postgres devrait être "healthy"
```

**Voir les logs de la base de données :**

```powershell
docker-compose logs postgres
```

**Solution : Attendre que la DB soit prête**

Le conteneur `app` attend automatiquement que `postgres` soit "healthy" grâce à :

```yaml
depends_on:
  postgres:
    condition: service_healthy
```

---

### Problème : "502 Bad Gateway"

**Causes possibles :**

1. **Le backend Node.js n'a pas démarré**

   ```powershell
   # Vérifier les logs
   docker-compose logs app
   ```

2. **Nginx ne peut pas se connecter au backend**

   ```powershell
   # Vérifier que le backend écoute sur le port 3000
   docker exec -it tirallarc-app netstat -tuln | grep 3000
   ```

3. **Problème de configuration Nginx**

   ```powershell
   # Tester la configuration Nginx
   docker exec -it tirallarc-app nginx -t
   ```

---

### Problème : Modifications du code non prises en compte

**Cause :** L'image Docker contient une copie statique du code.

**Solution 1 : Rebuild l'image**

```powershell
docker-compose up --build -d
```

**Solution 2 : Activer le mode développement**

Voir la section [Mode développement avec hot reload](#-mode-développement-avec-hot-reload)

---

### Problème : Permission denied sur uploads/

**Solution : Créer les dossiers localement**

```powershell
mkdir uploads, logs
```

Les volumes Docker monteront ces dossiers et les permissions seront correctes.

---

## 🧪 Tests

### Tester l'API

**Avec curl (Git Bash) :**

```bash
# Health check
curl http://localhost/health

# Créer une session
curl -X POST http://localhost/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Dupont",
    "prenom": "Jean",
    "type_tireur": "adulte",
    "nombre_tireurs": 3,
    "terrain": "A"
  }'

# Obtenir toutes les sessions
curl http://localhost/api/sessions
```

**Avec PowerShell :**

```powershell
# Health check
Invoke-WebRequest -Uri http://localhost/health

# Créer une session
Invoke-RestMethod -Method Post -Uri http://localhost/api/sessions `
  -ContentType "application/json" `
  -Body '{"nom":"Dupont","prenom":"Jean","type_tireur":"adulte","nombre_tireurs":3,"terrain":"A"}'
```

### Tester l'interface admin

1. Ouvrir : http://localhost/admin/
2. Se connecter avec :
   - **Username :** `admin`
   - **Password :** `changez-moi-en-production`

---

## 📦 Préparer pour le déploiement

Une fois que vous avez terminé vos modifications en local :

### Étape 1 : Tester en production locale

```powershell
# Arrêter le mode dev
docker-compose down

# Rebuilder en mode production
docker-compose up --build
```

### Étape 2 : Vérifier que tout fonctionne

- ✅ Frontend accessible
- ✅ API fonctionne
- ✅ Interface admin fonctionne
- ✅ Upload d'images fonctionne
- ✅ Pas d'erreurs dans les logs

### Étape 3 : Build et push vers Docker Hub

```powershell
# Build l'image de production
docker build -t eloli/gestion_site_arc:latest .

# Push vers Docker Hub
docker push eloli/gestion_site_arc:latest
```

### Étape 4 : Déployer sur Coolify

Suivez le guide [DEPLOIEMENT_COOLIFY_COMPLET.md](DEPLOIEMENT_COOLIFY_COMPLET.md)

---

## 🔄 Workflow de développement

```
1. Modifier le code localement
   ↓
2. Tester en local avec docker-compose
   ↓
3. Vérifier que tout fonctionne
   ↓
4. Commit Git (optionnel)
   ↓
5. Build et push l'image Docker
   ↓
6. Redeploy sur Coolify
```

---

## 📝 Variables d'environnement

Les variables sont définies dans [.env.local](.env.local) et dans [docker-compose.yml](docker-compose.yml).

**Pour les modifier :**

1. Éditez `.env.local` OU `docker-compose.yml`
2. Redémarrez : `docker-compose restart app`

**Variables importantes en développement :**

```bash
NODE_ENV=development        # Mode développement
LOG_LEVEL=debug            # Logs détaillés
DB_HOST=postgres           # Nom du service Docker
ALLOWED_ORIGINS=http://localhost  # CORS
```

---

## ✅ Checklist avant déploiement

Avant de déployer sur Coolify, vérifiez :

- [ ] L'application démarre sans erreur
- [ ] Le frontend est accessible sur http://localhost
- [ ] L'API répond sur http://localhost/health
- [ ] L'interface admin fonctionne
- [ ] Les sessions peuvent être créées
- [ ] Les incidents peuvent être déclarés
- [ ] L'upload de photos fonctionne
- [ ] Pas d'erreurs JavaScript dans la console du navigateur
- [ ] Pas d'erreurs dans les logs : `docker-compose logs app`

---

## 🎉 Résumé des commandes

```powershell
# Démarrer
docker-compose up -d --build

# Voir les logs
docker-compose logs -f

# Arrêter
docker-compose down

# Rebuild après modifications
docker-compose up --build -d

# Accéder à la DB
docker exec -it tirallarc-db psql -U tir_arc_user -d terrain_tir_arc

# Accéder au conteneur app
docker exec -it tirallarc-app sh

# Nettoyer tout (attention : supprime les données)
docker-compose down -v
```

---

**Bon développement !** 🚀

Consultez également :
- [DEPLOIEMENT_COOLIFY_COMPLET.md](DEPLOIEMENT_COOLIFY_COMPLET.md) - Déploiement sur Coolify
- [CONFIGURATION_DNS.md](CONFIGURATION_DNS.md) - Configuration DNS
- [DOCKER_GUIDE.md](DOCKER_GUIDE.md) - Guide Docker complet
