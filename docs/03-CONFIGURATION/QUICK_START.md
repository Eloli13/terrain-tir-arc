# 🚀 Guide de Démarrage Rapide

## ⚠️ IMPORTANT: Deux serveurs à lancer

Cette application nécessite **DEUX serveurs** :
1. **Backend API** (Node.js) sur port 3000
2. **Frontend PWA** (fichiers statiques) sur port 8000

---

## 📋 Prérequis

- Node.js >= 16.0.0
- PostgreSQL >= 12
- Python 3.x (pour serveur HTTP simple)

---

## 🔧 Configuration initiale (une seule fois)

### 1. Configuration environnement

```bash
cd server
cp .env.example .env
# Éditer .env avec vos valeurs (DB_PASSWORD, JWT_SECRET, etc.)
```

### 2. Installation dépendances

```bash
cd server
npm install
```

### 3. Base de données PostgreSQL

```sql
-- Se connecter à PostgreSQL
psql -U postgres

-- Créer la base et l'utilisateur
CREATE DATABASE terrain_tir_arc;
CREATE USER tir_arc_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE terrain_tir_arc TO tir_arc_user;

-- Rendre created_by nullable (important)
\c terrain_tir_arc
ALTER TABLE incidents ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE sessions ALTER COLUMN created_by DROP NOT NULL;
```

Ou utiliser le script :
```bash
cd server
node scripts/setup-database.js
```

---

## 🚀 Démarrage

### Terminal 1: Backend API

```bash
cd server
npm start
```

**✅ Backend démarré sur:** http://localhost:3000

**Vérification:**
- Health check: http://localhost:3000/health
- Devrait afficher `{"status":"ok"}`

### Terminal 2: Frontend PWA

⚠️ **IMPORTANT: Cette commande doit être exécutée depuis la RACINE du projet, PAS depuis le dossier `server/`**

```bash
# Depuis la racine du projet (C:\Gemini\terrain_claude_code\)
# PAS depuis le dossier server/ !
python -m http.server 8000
```

**✅ Frontend démarré sur:** http://localhost:8000

**Si vous êtes dans le dossier server/, remontez d'un niveau:**
```bash
cd ..
python -m http.server 8000
```

---

## 🌐 URLs de l'application

### Frontend (port 8000 - UTILISEZ CECI)

| Page | URL | Description |
|------|-----|-------------|
| **🏠 Accueil** | http://localhost:8000 | Scanner QR, stats en temps réel |
| **📝 Déclaration** | http://localhost:8000/declaration.html | Formulaire de présence |
| **⚠️ Incidents** | http://localhost:8000/incident.html | Signalement incident avec photo |
| **⚙️ Admin** | http://localhost:8000/admin/index.html | Interface administration |

### Backend API (port 3000 - NE PAS ACCÉDER DIRECTEMENT)

| Route | URL | Description |
|-------|-----|-------------|
| Health | http://localhost:3000/health | Vérification serveur |
| Sessions actives | http://localhost:3000/api/sessions/active | API sessions |
| Stats | http://localhost:3000/api/sessions/stats | API statistiques |

---

## ❌ Erreurs courantes

### Erreur 404 sur index.html

**Cause 1:** Vous accédez à http://localhost:3000 (backend) au lieu de http://localhost:8000 (frontend)

**Solution:** Utilisez **http://localhost:8000**

**Cause 2:** Le serveur Python a été lancé depuis le dossier `server/` au lieu de la racine

**Solution:**
```bash
# Arrêter le serveur (Ctrl+C)
# Remonter à la racine du projet
cd ..
# Relancer depuis la racine
python -m http.server 8000
```

### Erreur 404 sur favicon.ico

**Cause:** Favicon manquant (corrigé maintenant)

**Solution:** ✅ Déjà corrigé - favicon pointé vers `images/icon-192.png`

### Backend ne démarre pas (EADDRINUSE)

**Cause:** Port 3000 déjà utilisé

**Solution:**
```powershell
# Windows PowerShell
Get-Process node | Where-Object {$_.Id -in (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess} | Stop-Process -Force

# Puis relancer
cd server
npm start
```

### Erreur connexion base de données

**Cause:** PostgreSQL non démarré ou mauvaises credentials

**Solution:**
1. Vérifier que PostgreSQL est démarré
2. Vérifier les credentials dans `server/.env`
3. Tester la connexion:
   ```bash
   cd server
   node test-connection.js
   ```

### API indisponible (mode localStorage)

**Cause:** Backend non démarré

**Solution:** Lancer le backend dans le Terminal 1
```bash
cd server
npm start
```

---

## ✅ Vérification que tout fonctionne

### 1. Backend OK

```bash
curl http://localhost:3000/health
```
**Attendu:** `{"status":"ok",...}`

### 2. Frontend OK

Ouvrir dans le navigateur: http://localhost:8000

**Attendu:** Page d'accueil avec scanner QR

### 3. API OK

Ouvrir la console du navigateur (F12), onglet Console

**Attendu:** Message ✅ API disponible (pas ❌ API non disponible)

---

## 🔐 Connexion admin

**URL:** http://localhost:8000/admin/index.html

**Mot de passe par défaut:** `admin123`

⚠️ **IMPORTANT:** Changez ce mot de passe immédiatement en production !

---

## 📧 Configuration email (optionnel)

Par défaut, l'application utilise **Ethereal** (emails de test).

Pour activer de vrais emails, éditez `server/.env` :

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre.email@gmail.com
SMTP_PASS=votre_mot_de_passe_app
EMAIL_FROM="Terrain Tir Arc <noreply@domain.com>"
```

### Gmail

1. Activer "Validation en deux étapes"
2. Générer un "Mot de passe d'application"
3. Utiliser ce mot de passe dans `SMTP_PASS`

---

## 🛑 Arrêt de l'application

### Backend

Dans le Terminal 1, appuyez sur `Ctrl+C`

### Frontend

Dans le Terminal 2, appuyez sur `Ctrl+C`

---

## 📝 Logs et debugging

### Logs backend

Fichiers dans `server/logs/` :
- `combined.log` - Tous les logs
- `error.log` - Erreurs uniquement

### Console navigateur

Ouvrir les DevTools (F12), onglet Console

Messages utiles :
- ✅ API disponible
- ❌ API non disponible (mode localStorage)
- Erreurs JavaScript

---

## 🎯 Workflow typique

1. **Démarrer backend** (Terminal 1)
   ```bash
   cd server && npm start
   ```

2. **Démarrer frontend** (Terminal 2 - DEPUIS LA RACINE DU PROJET)
   ```bash
   # ⚠️ ATTENTION: Depuis la racine (C:\Gemini\terrain_claude_code\)
   # PAS depuis server/ !
   python -m http.server 8000
   ```

3. **Ouvrir navigateur**
   - http://localhost:8000 (accueil)
   - http://localhost:8000/declaration.html (déclaration)

4. **Créer une session**
   - Remplir le formulaire
   - Vérifier dans l'admin que la session apparaît

5. **Signaler un incident**
   - http://localhost:8000/incident.html
   - Ajouter une photo
   - Vérifier les logs backend pour l'email

---

## 🚀 Prêt pour la production ?

Voir [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) pour les instructions de déploiement.

---

**✅ Bon développement !**
