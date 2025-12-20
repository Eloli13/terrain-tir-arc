# 🚀 Guide de Déploiement Production - Terrain Tir à l'Arc

**Version:** 1.0.5
**Date:** 2025-12-20
**Statut:** ✅ MÉTHODE OFFICIELLE ET RECOMMANDÉE

---

## ⚠️ IMPORTANT - LISEZ CECI EN PREMIER

**CE GUIDE EST LA SEULE MÉTHODE SUPPORTÉE POUR LE DÉPLOIEMENT EN PRODUCTION.**

### ❌ NE JAMAIS UTILISER

- ~~`database.sql`~~ - **FICHIER OBSOLÈTE SUPPRIMÉ** (contenait un schéma et hash périmés)
- Méthodes de déploiement sans Git mentionnées dans l'ancienne documentation
- Scripts d'initialisation manuels avec psql

### ✅ MÉTHODE CORRECTE

1. Déploiement via Git sur Coolify
2. Initialisation automatique via `database.js` (tables + structure)
3. Création compte admin via `init-db.js` OU automatiquement au démarrage

---

## 📋 Prérequis

- Serveur Coolify configuré
- Nom de domaine pointant vers votre serveur
- Accès SSH au serveur (pour nettoyage si nécessaire)
- Git repository à jour

---

## 🧹 ÉTAPE 1 : Nettoyage Complet (SI REDÉPLOIEMENT)

**⚠️ CRITIQUE:** Si vous avez déjà tenté un déploiement précédent, vous DEVEZ nettoyer les volumes PostgreSQL.

### Méthode A : Via Coolify UI

1. Allez dans votre application Coolify
2. Cliquez sur "Resources" → "Postgres"
3. Cliquez sur "Stop" puis "Delete"
4. **IMPORTANT:** Cochez "Delete volumes" pour supprimer les données persistantes
5. Recréez la base de données avec les mêmes paramètres

### Méthode B : Via SSH (si Méthode A ne fonctionne pas)

```bash
# Se connecter au serveur
ssh votre-serveur

# Arrêter l'application
cd /path/to/your/app
docker-compose down

# Supprimer les volumes PostgreSQL
docker volume ls | grep postgres
docker volume rm <nom_du_volume_postgres>

# Vérifier que le volume est bien supprimé
docker volume ls | grep postgres  # Ne doit rien retourner
```

---

## 🔐 ÉTAPE 2 : Génération des Secrets

Sur votre machine locale (PAS sur le serveur), générez des secrets cryptographiques forts:

```bash
# Dans le dossier du projet
node scripts/generate-secrets.js
```

Cela crée `.env.production.generated` avec des secrets de **128 caractères**.

**⚠️ IMPORTANT:**
- Copiez **TOUTE LA LIGNE** de chaque secret (ne tronquez PAS à 15 caractères !)
- Ces secrets ne doivent JAMAIS être committé dans Git
- Gardez une copie sécurisée dans un gestionnaire de mots de passe

---

## ☁️ ÉTAPE 3 : Configuration Coolify

### 3.1 Créer une Nouvelle Application

1. Dans Coolify, cliquez sur "New Resource" → "Application"
2. Sélectionnez "Public Repository (GitHub/GitLab)"
3. Entrez l'URL du repository Git
4. Branch: `main`
5. Build Pack: **Docker Compose**

### 3.2 Configuration du Domaine

1. Allez dans "Domains"
2. Ajoutez votre domaine: `https://votre-domaine.com`
3. Activez "Generate TLS Certificate" (Let's Encrypt)

### 3.3 Variables d'Environnement

Allez dans "Environment Variables" et ajoutez ces **12 variables** :

```env
# 🔐 SECRETS OBLIGATOIRES (générés à l'étape 2)
DB_PASSWORD=<coller le secret généré - 128 caractères>
JWT_SECRET=<coller le secret généré - 128 caractères>
JWT_REFRESH_SECRET=<coller le secret généré - 128 caractères>
SESSION_SECRET=<coller le secret généré - 128 caractères>
ENCRYPTION_KEY=<coller le secret généré - 128 caractères>

# 🌐 CONFIGURATION REQUISE (remplacer par votre domaine)
ALLOWED_ORIGINS=https://tiralarc.srv759477.hstgr.cloud

# 🔧 CONFIGURATION BASE (OBLIGATOIRES - Coolify ne passe pas les defaults)
NODE_ENV=production
DB_HOST=postgres
DB_PORT=5432
DB_NAME=terrain_tir_arc
DB_USER=tir_arc_user
HOST=0.0.0.0
```

**⚠️ IMPORTANT:** Coolify avec Docker Compose **ne passe PAS automatiquement** les defaults du docker-compose.yaml aux containers. Il faut donc spécifier explicitement ces variables.

---

### 3.4 Variables Optionnelles (si besoin de personnalisation)

Ces variables ont déjà des valeurs par défaut correctes. N'ajoutez que si vous voulez les modifier :

```env
# Application (defaults: production, 3000, warn)
LOG_LEVEL=info              # Pour plus de logs (default: warn)

# SMTP - Configuration email (default: vide = pas d'emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre_app_password
```

**⚠️ Variables Optionnelles (ont des defaults) :**
- `PORT` (default: 3000 dans docker-compose.yaml) - **pas besoin de l'ajouter**
- `LOG_LEVEL` (default: warn) - ajouter uniquement si vous voulez plus de logs (info/debug)
- `RATE_LIMIT_*`, `BCRYPT_ROUNDS` (defaults corrects) - **pas besoin de les ajouter**
- `SMTP_*` (vides par défaut) - ajouter uniquement si vous configurez les emails
- ❌ `CORS_ORIGIN`, `FRONTEND_URL` (variables inutilisées dans le code) - **NE PAS ajouter**

**⚠️ VÉRIFICATION CRITIQUE:**
- Chaque secret doit faire **128 caractères**
- `ALLOWED_ORIGINS` doit correspondre à votre domaine réel

---

## 🚀 ÉTAPE 4 : Premier Déploiement

1. Cliquez sur "Deploy"
2. Attendez que le build se termine (~2-3 minutes)
3. Vérifiez les logs :
   - `postgres` : doit afficher "database system is ready to accept connections"
   - `app` : doit afficher "Serveur démarré sur 0.0.0.0:3000"

### Logs à surveiller

#### ✅ Logs PostgreSQL normaux :
```
PostgreSQL Database directory appears to contain a database; Skipping initialization
database system is ready to accept connections
```

#### ✅ Logs Application normaux :
```
[DATABASE] Config: host=postgres, port=5432, database=terrain_tir_arc, user=tir_arc_user, ssl=false
[DATABASE] DEBUG: Tentative de connexion au pool...
[DATABASE] DEBUG: Client connecté au pool avec succès
Serveur démarré sur 0.0.0.0:3000
```

#### ❌ ERREUR : Password authentication failed
```
FATAL: password authentication failed for user "tir_arc_user"
```

**Solution:** Retournez à l'ÉTAPE 1 - vous DEVEZ nettoyer les volumes PostgreSQL.

---

## 👤 ÉTAPE 5 : Initialisation du Compte Admin

### Option A : Initialisation Automatique (RECOMMANDÉ)

L'application crée automatiquement le compte admin au premier démarrage si aucun compte n'existe.

**Credentials par défaut:**
- Username: `admin`
- Password: `changez-moi-en-production`
- Email: `admin@localhost`

### Option B : Initialisation Manuelle

Si vous préférez initialiser manuellement :

```bash
# Via Coolify UI : "Terminal" → Sélectionner le container "app"
# OU via SSH
docker exec -it <container_app_name> node server/scripts/init-db.js
```

---

## 🔒 ÉTAPE 6 : Sécurisation Post-Déploiement

### 6.1 Premier Login

1. Allez sur `https://votre-domaine.com/admin.html`
2. Connectez-vous avec les credentials par défaut
3. **IMPORTANT:** Changez immédiatement le mot de passe admin

### 6.2 Configuration SMTP (Optionnel)

Si vous voulez recevoir des emails pour les incidents :

1. Allez dans "Paramètres" → "Configuration Email"
2. Entrez vos paramètres SMTP
3. Testez l'envoi d'email

### 6.3 Health Checks Coolify

1. Dans Coolify, allez dans "Health Checks"
2. Activez le health check HTTP
3. URL: `/health`
4. Interval: 30s
5. Timeout: 10s

---

## 🔍 Vérification du Déploiement

### Checklist de Validation

- [ ] PostgreSQL démarre sans erreur d'authentification
- [ ] Application démarre et affiche "Serveur démarré"
- [ ] Page d'accueil accessible via HTTPS (certificat valide)
- [ ] Login admin fonctionne avec le mot de passe par défaut
- [ ] Tableau de bord admin s'affiche correctement
- [ ] Pas d'erreurs CSP dans la console navigateur
- [ ] Sessions de tir créables depuis la page publique
- [ ] Incidents signalables avec upload de photo
- [ ] WebSocket connecté (icône verte dans le tableau de bord)

---

## 🐛 Dépannage

### Problème : Gateway Timeout (504)

**Causes possibles:**
1. L'application n'a pas démarré
2. PostgreSQL n'est pas prêt
3. Mauvaise configuration du reverse proxy

**Solutions:**
```bash
# Vérifier les logs de l'application
docker-compose logs app

# Vérifier que PostgreSQL est prêt
docker-compose logs postgres

# Redémarrer l'application
docker-compose restart app
```

### Problème : Password Authentication Failed

**Cause:** Volume PostgreSQL contient une ancienne base avec un autre mot de passe.

**Solution:** Retournez à l'ÉTAPE 1 et supprimez les volumes.

### Problème : ERR_TOO_MANY_REDIRECTS

**Cause:** Problème de configuration du reverse proxy Coolify.

**Solution:**
1. Vérifiez que le port exposé est `3000`
2. Vérifiez que le domaine est correctement configuré
3. Redéployez l'application

### Problème : Secrets trop courts

**Erreur:**
```
❌ JWT_SECRET trop courte - Doit contenir au moins 32 caractères (actuel: 15)
```

**Cause:** Vous avez tronqué les secrets lors de la copie.

**Solution:**
1. Régénérez les secrets avec `node scripts/generate-secrets.js`
2. Copiez **TOUTE LA LIGNE** (128 caractères)
3. Remplacez les variables dans Coolify
4. Redéployez

---

## 📊 Architecture de Production

```
Internet
   ↓
Traefik/Caddy (Coolify)
   ↓ HTTPS (TLS 1.3)
   ↓
Docker Container "app" (Node.js:3000)
   ↓
Docker Container "postgres" (PostgreSQL:5432)
   ↓
Volume persistant "postgres_data_prod"
```

**Points clés:**
- PostgreSQL n'est PAS exposé sur Internet (sécurité)
- Communication app ↔ postgres via réseau Docker interne
- Traefik gère automatiquement HTTPS et certificats Let's Encrypt
- Volumes Docker assurent la persistence des données

---

## 🔄 Mises à Jour

Pour déployer une mise à jour :

1. Push vos modifications sur la branche `main`
2. Dans Coolify, cliquez sur "Redeploy"
3. Coolify va :
   - Pull les dernières modifications Git
   - Rebuild l'image Docker
   - Redémarrer le container `app`
   - **IMPORTANT:** Les volumes PostgreSQL ne sont PAS supprimés

**⚠️ Si vous avez des migrations de base de données:**
```bash
# Exécuter les migrations après le déploiement
docker exec -it <container_app> node server/scripts/migrate.js
```

---

## 📞 Support

En cas de problème persistant :

1. Vérifiez les logs Coolify (Docker Compose Logs)
2. Vérifiez que tous les prérequis sont remplis
3. Assurez-vous d'avoir suivi **TOUTES** les étapes dans l'ordre
4. Si le problème persiste, créez une issue GitHub avec :
   - Les logs complets (sans secrets !)
   - La description du problème
   - Les étapes déjà effectuées

---

## ✅ Conclusion

Ce guide garantit un déploiement propre et sécurisé de l'application. **Ne court-circuitez aucune étape**, particulièrement le nettoyage des volumes si vous redéployez.

**Points critiques à retenir:**
- ✅ Jamais de `database.sql` (obsolète et dangereux)
- ✅ Secrets de 128 caractères (pas 15 !)
- ✅ Nettoyage des volumes avant redéploiement
- ✅ Vérification des logs à chaque étape
- ✅ Changement du mot de passe admin après premier login

**Bonne production ! 🎯**
