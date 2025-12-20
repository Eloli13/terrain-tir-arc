# Déploiement Complet avec Coolify

> **⚠️ ATTENTION - DOCUMENTATION OBSOLÈTE**
>
> Ce guide contient des références à `database.sql` qui est un fichier **OBSOLÈTE et DANGEREUX**.
>
> **👉 Utilisez plutôt le guide officiel:** [DEPLOIEMENT_PRODUCTION.md](../../../DEPLOIEMENT_PRODUCTION.md)
>
> Ce fichier est conservé uniquement pour référence historique.

---

**Application : Gestion Site Tir à l'Arc (Frontend + Backend)**
**Docker Hub : eloli/gestion_site_arc**
**Domaine : srv759477.hstgr.cloud**

---

## 📦 Ce qui est inclus dans l'image Docker

✅ **Backend Node.js** (API REST sur port 3000)
✅ **Frontend statique** (HTML/CSS/JS)
✅ **Interface Admin**
✅ **Nginx** (reverse proxy + serveur web)
✅ **PWA** (Service Worker + Manifest)

**Architecture :**
```
Port 80 (Nginx)
├─ / → Frontend statique
├─ /admin/ → Interface admin
├─ /api → Proxy vers Node.js:3000
├─ /health → Proxy vers Node.js:3000
└─ /uploads → Fichiers uploadés
```

---

## 🌐 Configuration DNS (À faire en PREMIER)

### Configuration de la zone DNS chez votre hébergeur

**Domaine principal : `srv759477.hstgr.cloud`**

Accédez à votre panneau de gestion DNS et ajoutez les enregistrements suivants :

#### Option 1 : Domaine principal uniquement

```dns
# Enregistrement A pour le domaine principal
Type: A
Nom: @
Valeur: [IP_DE_VOTRE_SERVEUR_COOLIFY]
TTL: 3600

# Enregistrement A pour www (optionnel)
Type: A
Nom: www
Valeur: [IP_DE_VOTRE_SERVEUR_COOLIFY]
TTL: 3600
```

**URLs accessibles :**
- `https://srv759477.hstgr.cloud`
- `https://www.srv759477.hstgr.cloud` (si configuré)

---

#### Option 2 : Sous-domaine dédié (RECOMMANDÉ)

```dns
# Enregistrement A pour le sous-domaine tirallarc
Type: A
Nom: tirallarc
Valeur: [IP_DE_VOTRE_SERVEUR_COOLIFY]
TTL: 3600

# Enregistrement A pour www.tirallarc (optionnel)
Type: A
Nom: www.tirallarc
Valeur: [IP_DE_VOTRE_SERVEUR_COOLIFY]
TTL: 3600
```

**URLs accessibles :**
- `https://istres.srv759477.hstgr.cloud`
- `https://www.istres.srv759477.hstgr.cloud` (si configuré)

---

#### Option 3 : Multi-sites avec plusieurs sous-domaines

```dns
# Site de tir à l'arc d'Istres
Type: A
Nom: istres
Valeur: [IP_DE_VOTRE_SERVEUR_COOLIFY]
TTL: 3600

# Site de tir à l'arc de Marseille (exemple)
Type: A
Nom: marseille
Valeur: [IP_DE_VOTRE_SERVEUR_COOLIFY]
TTL: 3600

# Panneau d'administration global
Type: A
Nom: admin
Valeur: [IP_DE_VOTRE_SERVEUR_COOLIFY]
TTL: 3600
```

**URLs accessibles :**
- `https://istres.srv759477.hstgr.cloud`
- `https://marseille.srv759477.hstgr.cloud`
- `https://admin.srv759477.hstgr.cloud`

---

### Trouver l'IP de votre serveur Coolify

**Sur votre serveur Coolify :**

```bash
# Obtenir l'IP publique
curl ifconfig.me

# OU
ip addr show
```

**Exemple de résultat :**
```
51.83.45.10
```

---

### Vérifier la propagation DNS

Après avoir ajouté les enregistrements DNS, attendez 5-30 minutes puis vérifiez :

```bash
# Sur votre PC Windows (PowerShell)
nslookup srv759477.hstgr.cloud
nslookup istres.srv759477.hstgr.cloud

# OU en ligne
# Visitez : https://dnschecker.org
```

**Résultat attendu :**
```
Nom :    istres.srv759477.hstgr.cloud
Address: 51.83.45.10
```

---

## 🚀 Déploiement rapide

### Étape 1 : Build et push l'image

```powershell
# Dans PowerShell
cd C:\Gemini\terrain_claude_code

# Exécuter le script
.\rebuild-and-push.ps1
```

**Ou manuellement :**

```powershell
# Build
docker build -t eloli/gestion_site_arc:latest .

# Push
docker push eloli/gestion_site_arc:latest
```

---

### Étape 2 : Créer la base de données dans Coolify

```
Coolify → Projects → Add New Project

Name: TirArc Istres
```

```
Project → Add New Resource → Database

Type: PostgreSQL
Name: tirallarc-db
Version: 15
Database Name: terrain_tir_arc
Username: tir_arc_user
Password: VotreMotDePasseSecurise123

Backup: Daily at 2:00 AM

Create
```

**Attendez que la DB soit "Running"**

---

### Étape 3 : Trouver le nom du service PostgreSQL

```
Coolify → Database tirallarc-db → Copy Internal Domain

Exemple : tirallarc-db-postgres
```

**OU dans les logs :**
```
Database → Logs
Chercher le nom du conteneur
```

---

### Étape 4 : Déployer l'application

```
Project TirArc → Add New Resource → Application

Type: Docker Image

Configuration:
├─ Name: tirallarc-app
├─ Image: eloli/gestion_site_arc:latest
├─ Registry: Docker Hub (public ou private avec credentials)
├─ Port: 80  ⚠️ IMPORTANT : Port 80 (pas 3000)
├─ Domain: istres.srv759477.hstgr.cloud
│          (ou srv759477.hstgr.cloud pour domaine principal)
│          (ou istres.srv759477.hstgr.cloud pour multi-sites)
├─ Additional Domain: www.istres.srv759477.hstgr.cloud (optionnel)
└─ SSL: Enable (Let's Encrypt)
```

**Exemples de configuration selon votre choix DNS :**

**Option 1 - Domaine principal :**
- Domain: `srv759477.hstgr.cloud`
- Additional Domain: `www.srv759477.hstgr.cloud`

**Option 2 - Sous-domaine dédié (RECOMMANDÉ) :**
- Domain: `istres.srv759477.hstgr.cloud`
- Additional Domain: `www.istres.srv759477.hstgr.cloud`

**Option 3 - Multi-sites :**
- Domain: `istres.srv759477.hstgr.cloud`
- (créez d'autres applications pour marseille, admin, etc.)

---

### Étape 5 : Variables d'environnement

```
Environment Variables → Add Multiple
```

**Variables obligatoires :**

```bash
# Node.js
NODE_ENV=production
PORT=3000

# Database - AJUSTEZ DB_HOST avec le nom trouvé à l'étape 3
DB_HOST=tirallarc-db-postgres
DB_PORT=5432
DB_NAME=terrain_tir_arc
DB_USER=tir_arc_user
DB_PASSWORD=VotreMotDePasseSecurise123

# Sécurité (générer avec commande ci-dessous)
JWT_SECRET=votre_cle_jwt_32_caracteres
JWT_REFRESH_SECRET=votre_cle_refresh_32_caracteres
SESSION_SECRET=votre_cle_session_32_caracteres

# CORS (AJUSTEZ selon votre configuration DNS)
# Option 1 - Domaine principal :
ALLOWED_ORIGINS=https://srv759477.hstgr.cloud,https://www.srv759477.hstgr.cloud

# Option 2 - Sous-domaine dédié (RECOMMANDÉ) :
ALLOWED_ORIGINS=https://istres.srv759477.hstgr.cloud,https://www.istres.srv759477.hstgr.cloud

# Option 3 - Multi-sites :
ALLOWED_ORIGINS=https://istres.srv759477.hstgr.cloud,https://marseille.srv759477.hstgr.cloud

# Logs
LOG_LEVEL=info

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Générer les clés secrètes :**

```bash
# Dans PowerShell ou terminal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Exécuter 3 fois pour les 3 clés
```

**Variables optionnelles (Email) :**

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@srv759477.hstgr.cloud
```

---

### Étape 6 : Persistent Storage

```
Storage → Add Volume

Volume 1:
├─ Name: uploads
├─ Mount Path: /app/uploads
└─ Source: Auto

Volume 2:
├─ Name: logs
├─ Mount Path: /app/logs
└─ Source: Auto
```

---

### Étape 7 : Deploy

```
Click: Deploy

Attendre 2-5 minutes
```

**Coolify va :**
1. ✅ Pull l'image depuis Docker Hub
2. ✅ Créer le conteneur
3. ✅ Démarrer Nginx + Node.js
4. ✅ Configurer Traefik (reverse proxy)
5. ✅ Obtenir le certificat SSL
6. ✅ Router le trafic vers votre domaine

---

### Étape 8 : Import du schéma de base de données

**Via Coolify Terminal :**

```
Coolify → Database tirallarc-db → Terminal
```

```sql
-- Copier-coller le contenu du fichier database.sql
-- (voir DOCKER_GUIDE.md pour le schéma PostgreSQL complet)

CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    type_tireur VARCHAR(50) NOT NULL,
    nombre_tireurs INTEGER NOT NULL,
    terrain VARCHAR(20) NOT NULL,
    date_debut TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_fin TIMESTAMP,
    active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    type_incident VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    photo_path VARCHAR(255),
    terrain VARCHAR(20) NOT NULL,
    date_incident TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    statut VARCHAR(50) DEFAULT 'en_attente',
    resolution_notes TEXT,
    date_resolution TIMESTAMP
);

CREATE TABLE IF NOT EXISTS configuration (
    id SERIAL PRIMARY KEY,
    cle VARCHAR(50) UNIQUE NOT NULL,
    valeur TEXT NOT NULL,
    description TEXT
);

-- Compte admin par défaut (mot de passe: changez-moi-en-production)
INSERT INTO admins (username, password_hash, email) VALUES
('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LRwDYGPvN4EHLwJVi', 'admin@srv759477.hstgr.cloud')
ON CONFLICT (username) DO NOTHING;

-- Configuration par défaut (AJUSTEZ selon votre configuration DNS)
INSERT INTO configuration (cle, valeur, description) VALUES
('telephone_responsable', '0123456789', 'Téléphone du responsable'),
('email_incidents', 'incidents@srv759477.hstgr.cloud', 'Email incidents'),
('qr_code_data', 'https://istres.srv759477.hstgr.cloud', 'Données QR code')
ON CONFLICT (cle) DO NOTHING;
```

---

### Étape 9 : Vérification

**Ouvrir dans le navigateur :**

**Selon votre configuration DNS :**

**Option 1 - Domaine principal :**
```
✅ https://srv759477.hstgr.cloud
✅ https://srv759477.hstgr.cloud/health
✅ https://srv759477.hstgr.cloud/admin/
✅ https://srv759477.hstgr.cloud/declaration.html
✅ https://srv759477.hstgr.cloud/incident.html
```

**Option 2 - Sous-domaine dédié (RECOMMANDÉ) :**
```
✅ https://istres.srv759477.hstgr.cloud
✅ https://istres.srv759477.hstgr.cloud/health
✅ https://istres.srv759477.hstgr.cloud/admin/
✅ https://istres.srv759477.hstgr.cloud/declaration.html
✅ https://istres.srv759477.hstgr.cloud/incident.html
```

**Option 3 - Multi-sites :**
```
✅ https://istres.srv759477.hstgr.cloud
✅ https://istres.srv759477.hstgr.cloud/health
✅ https://marseille.srv759477.hstgr.cloud
```

**Health check devrait retourner :**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T...",
  "version": "1.0.0",
  "environment": "production",
  "uptime": 123.45
}
```

---

## 🌍 Gestion Multi-Sites avec Sous-Domaines

### Architecture multi-sites sur srv759477.hstgr.cloud

Si vous souhaitez héberger **plusieurs sites** de tir à l'arc sur le même serveur Coolify :

#### Étape 1 : Configuration DNS pour tous les sites

```dns
# Site d'Istres
Type: A
Nom: istres
Valeur: [IP_SERVEUR_COOLIFY]
TTL: 3600

# Site de Marseille
Type: A
Nom: marseille
Valeur: [IP_SERVEUR_COOLIFY]
TTL: 3600

# Site d'Aix-en-Provence
Type: A
Nom: aix
Valeur: [IP_SERVEUR_COOLIFY]
TTL: 3600

# Panneau admin global (optionnel)
Type: A
Nom: admin
Valeur: [IP_SERVEUR_COOLIFY]
TTL: 3600
```

#### Étape 2 : Créer une base de données par site

**Dans Coolify :**

```
Project TirArc → Add New Resource → Database

Site Istres:
├─ Name: tirallarc-istres-db
├─ Database Name: terrain_tir_arc_istres
└─ Username: tir_arc_istres_user

Site Marseille:
├─ Name: tirallarc-marseille-db
├─ Database Name: terrain_tir_arc_marseille
└─ Username: tir_arc_marseille_user

Site Aix:
├─ Name: tirallarc-aix-db
├─ Database Name: terrain_tir_arc_aix
└─ Username: tir_arc_aix_user
```

#### Étape 3 : Déployer une application par site

**Application 1 : Site Istres**
```
Name: tirallarc-istres-app
Image: eloli/gestion_site_arc:latest
Port: 80
Domain: istres.srv759477.hstgr.cloud
SSL: Enable

Variables d'environnement :
DB_HOST=tirallarc-istres-db-postgres
DB_NAME=terrain_tir_arc_istres
DB_USER=tir_arc_istres_user
ALLOWED_ORIGINS=https://istres.srv759477.hstgr.cloud
```

**Application 2 : Site Marseille**
```
Name: tirallarc-marseille-app
Image: eloli/gestion_site_arc:latest
Port: 80
Domain: marseille.srv759477.hstgr.cloud
SSL: Enable

Variables d'environnement :
DB_HOST=tirallarc-marseille-db-postgres
DB_NAME=terrain_tir_arc_marseille
DB_USER=tir_arc_marseille_user
ALLOWED_ORIGINS=https://marseille.srv759477.hstgr.cloud
```

**Application 3 : Site Aix**
```
Name: tirallarc-aix-app
Image: eloli/gestion_site_arc:latest
Port: 80
Domain: aix.srv759477.hstgr.cloud
SSL: Enable

Variables d'environnement :
DB_HOST=tirallarc-aix-db-postgres
DB_NAME=terrain_tir_arc_aix
DB_USER=tir_arc_aix_user
ALLOWED_ORIGINS=https://aix.srv759477.hstgr.cloud
```

### Avantages de cette architecture

✅ **Isolation complète** : Chaque site a sa propre base de données
✅ **Gestion indépendante** : Chaque site peut être mis à jour séparément
✅ **Sécurité renforcée** : Un problème sur un site n'affecte pas les autres
✅ **Même image Docker** : Utilisation de la même image pour tous les sites
✅ **SSL automatique** : Let's Encrypt pour chaque sous-domaine

### Utilisation de la même base de données (Alternative)

Si vous préférez **une seule base de données** pour tous les sites :

```sql
-- Ajouter une colonne "site_id" dans chaque table
ALTER TABLE sessions ADD COLUMN site_id VARCHAR(50) DEFAULT 'istres';
ALTER TABLE incidents ADD COLUMN site_id VARCHAR(50) DEFAULT 'istres';

-- Créer un index pour les performances
CREATE INDEX idx_sessions_site ON sessions(site_id);
CREATE INDEX idx_incidents_site ON incidents(site_id);
```

**Puis modifier l'application pour filtrer par site_id dans chaque requête.**

**Note :** Cette approche est plus complexe et nécessite des modifications du code backend. L'approche avec bases de données séparées est recommandée.

---

## 🔍 Dépannage

### Problème : "DNS resolution failed" ou domaine inaccessible

**Causes possibles :**

1. **DNS pas encore propagé**
   ```bash
   # Vérifier la propagation DNS
   nslookup istres.srv759477.hstgr.cloud

   # Si "server can't find", attendez 5-30 minutes
   ```

2. **Enregistrement DNS incorrect**
   ```
   Vérifiez dans votre panneau DNS :
   - Type : A (pas CNAME)
   - Nom : tirallarc (pas istres.srv759477.hstgr.cloud)
   - Valeur : IP du serveur (pas un nom de domaine)
   - TTL : 3600 est recommandé
   ```

3. **IP du serveur incorrecte**
   ```bash
   # Sur le serveur Coolify
   curl ifconfig.me

   # Comparer avec l'IP dans votre zone DNS
   ```

4. **Pare-feu bloquant les ports 80/443**
   ```bash
   # Sur le serveur Coolify
   sudo ufw status

   # Doit montrer :
   # 80/tcp   ALLOW   Anywhere
   # 443/tcp  ALLOW   Anywhere
   ```

**Solution rapide :**
1. Vérifiez l'IP du serveur : `curl ifconfig.me`
2. Connectez-vous à votre panneau DNS
3. Vérifiez/corrigez l'enregistrement A
4. Attendez 5-10 minutes
5. Testez : `nslookup [votre-domaine]`

---

### Problème : "Cannot connect to database"

**Solution :**

1. Vérifier que la base de données est "Running"
2. Vérifier `DB_HOST` dans les variables d'environnement
3. Copier le "Internal Domain" de la DB
4. Mettre à jour `DB_HOST` avec ce nom
5. Redeploy

**Trouver le bon DB_HOST :**

```
Option 1: tirallarc-db
Option 2: tirallarc-db-postgres
Option 3: Voir dans Database → Internal Domain
```

---

### Problème : "502 Bad Gateway"

**Causes possibles :**

1. **L'application ne démarre pas**
   ```
   Coolify → Application → Logs
   Chercher les erreurs
   ```

2. **Port incorrect dans Coolify**
   ```
   Coolify → Application → Settings → Port
   Doit être : 80 (pas 3000)
   ```

3. **Nginx ne démarre pas**
   ```
   Application → Logs
   Chercher "Nginx"
   ```

---

### Problème : "Permission denied uploads"

**Solution : Les volumes sont créés automatiquement avec les bonnes permissions dans le Dockerfile**

Si le problème persiste :
```
Coolify → Application → Restart
```

---

### Problème : Frontend fonctionne mais pas l'API

**Vérifier :**

```
1. https://[VOTRE_DOMAINE]/health
   Exemples :
   - https://srv759477.hstgr.cloud/health
   - https://istres.srv759477.hstgr.cloud/health
   - https://istres.srv759477.hstgr.cloud/health
   → Devrait retourner JSON

2. Application → Logs
   → Chercher "Backend Node.js"
   → Devrait voir "Serveur démarré sur le port 3000"

3. Variables d'environnement
   → DB_HOST doit être correct
   → ALLOWED_ORIGINS doit correspondre à votre domaine
```

---

## 📊 Structure de l'image Docker

```
Image: eloli/gestion_site_arc:latest

/var/www/html/               (Frontend - Nginx)
├── index.html               (Page d'accueil)
├── declaration.html         (Déclaration)
├── incident.html            (Incidents)
├── manifest.json            (PWA)
├── sw.js                    (Service Worker)
├── css/
├── js/
├── images/
└── admin/
    ├── index.html
    └── admin.js

/app/                        (Backend - Node.js)
├── server.js
├── config/
├── middleware/
├── routes/
├── utils/
├── uploads/                 (Volume persistant)
└── logs/                    (Volume persistant)

/etc/nginx/nginx.conf        (Configuration Nginx)
/start.sh                    (Script de démarrage)
```

---

## 🔄 Mises à jour

### Workflow de mise à jour

```powershell
# 1. Modifier le code sur votre PC
# ...

# 2. Rebuild et push
cd C:\Gemini\terrain_claude_code
.\rebuild-and-push.ps1

# 3. Dans Coolify : Redeploy
Coolify → Application → Redeploy

# 4. Attendre 2-3 minutes
# L'application sera mise à jour avec zero-downtime
```

---

## ✅ Checklist complète

### Avant le déploiement

- [ ] Docker Desktop installé et démarré
- [ ] Code testé localement
- [ ] Compte Docker Hub (eloli)
- [ ] IP du serveur Coolify obtenue (curl ifconfig.me)
- [ ] DNS configuré dans la zone DNS :
  - [ ] Enregistrement A pour le domaine/sous-domaine
  - [ ] Enregistrement A pour www (optionnel)
  - [ ] Propagation DNS vérifiée (nslookup)

### Build et push

- [ ] Image buildée : `docker build -t eloli/gestion_site_arc:latest .`
- [ ] Image poussée : `docker push eloli/gestion_site_arc:latest`
- [ ] Image visible sur Docker Hub

### Configuration Coolify

- [ ] Coolify installé
- [ ] Projet "TirArc Istres" créé
- [ ] Base de données PostgreSQL créée et "Running"
- [ ] Internal Domain de la DB copié

### Application

- [ ] Application créée (type Docker Image)
- [ ] Image: `eloli/gestion_site_arc:latest`
- [ ] Port: **80** (important !)
- [ ] Domaine configuré (srv759477.hstgr.cloud ou sous-domaine)
- [ ] SSL activé (Let's Encrypt)
- [ ] Variables d'environnement configurées :
  - [ ] `DB_HOST` = Internal Domain de la DB
  - [ ] `ALLOWED_ORIGINS` = votre domaine HTTPS
  - [ ] Clés JWT/Session générées
  - [ ] `EMAIL_FROM` ajusté si nécessaire
- [ ] Volumes uploads/logs configurés

### Déploiement

- [ ] Déploiement lancé
- [ ] Build réussi (2-5 minutes)
- [ ] Conteneur "Running"
- [ ] Health check OK
- [ ] Site accessible en HTTPS
- [ ] API fonctionne (`/health`)
- [ ] Schéma DB importé
- [ ] Page d'accueil OK
- [ ] Interface admin OK

---

## 🎯 Résumé des commandes

```powershell
# Build et push
docker build -t eloli/gestion_site_arc:latest .
docker push eloli/gestion_site_arc:latest

# Générer clés secrètes (exécuter 3 fois)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Test local (optionnel)
docker run -p 80:80 -e NODE_ENV=production -e DB_HOST=localhost eloli/gestion_site_arc:latest
```

---

## 📞 Support

**En cas de problème :**

1. Vérifier les logs dans Coolify
2. Vérifier que la DB est "Running"
3. Vérifier les variables d'environnement
4. Redéployer l'application
5. Consulter les guides :
   - `DOCKER_GUIDE.md`
   - `COOLIFY_SANS_GIT.md`
   - `DEPLOIEMENT_LINUX.md`

---

**Déploiement complet terminé !** 🎉

Votre application frontend + backend est maintenant en production avec :
- ✅ SSL automatique
- ✅ Nginx + Node.js
- ✅ Base de données PostgreSQL
- ✅ PWA fonctionnelle
- ✅ Sauvegardes automatiques
- ✅ Monitoring intégré

---

*Dernière mise à jour : 2025-01-15*
