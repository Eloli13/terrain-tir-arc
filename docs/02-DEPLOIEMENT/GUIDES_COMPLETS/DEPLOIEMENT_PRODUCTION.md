# Guide de Déploiement en Production

**Serveur**: srv759477.hstgr.cloud (Hostinger + Coolify)
**Date**: 17 octobre 2025
**Version**: 1.0.0

---

## 📋 Pré-requis

Avant de commencer, assurez-vous d'avoir :

- ✅ Accès au serveur Coolify sur srv759477.hstgr.cloud
- ✅ Compte GitHub ou GitLab pour le code source
- ✅ Accès au panneau DNS Hostinger
- ✅ Coolify installé et fonctionnel sur le serveur
- ✅ Base de données PostgreSQL disponible (via Coolify)

---

## 🚀 Étape 1 : Préparer les Variables d'Environnement

### 1.1 Générer les Secrets JWT

Sur votre machine locale, exécutez :

```bash
# Générer JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Générer JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Générer SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**⚠️ Important** : Notez ces valeurs dans un gestionnaire de mots de passe sécurisé !

### 1.2 Préparer le Mot de Passe de la Base de Données

```bash
# Générer un mot de passe fort
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 1.3 Liste des Variables d'Environnement pour Coolify

Copiez ces variables et remplacez les valeurs `CHANGEZ_MOI` :

```env
# Environnement
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Base de données
DB_HOST=postgres
DB_PORT=5432
DB_NAME=terrain_tir_arc
DB_USER=tir_arc_user
DB_PASSWORD=<VOTRE_MOT_DE_PASSE_DB_GÉNÉRÉ>

# JWT (utiliser les valeurs générées)
JWT_SECRET=<VOTRE_JWT_SECRET_64_CARACTÈRES>
JWT_REFRESH_SECRET=<VOTRE_JWT_REFRESH_SECRET_64_CARACTÈRES>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# CORS
CORS_ORIGIN=https://istres.srv759477.hstgr.cloud
FRONTEND_URL=https://istres.srv759477.hstgr.cloud

# Session
SESSION_SECRET=<VOTRE_SESSION_SECRET_64_CARACTÈRES>
COOKIE_SECURE=true
COOKIE_SAMESITE=strict

# Logs
LOG_LEVEL=info
LOG_FORMAT=json
SECURITY_LOGS_ENABLED=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_MAX_ATTEMPTS=5
```

---

## 🗂️ Étape 2 : Préparer le Dépôt Git

### 2.1 Initialiser Git (si pas déjà fait)

```bash
# Dans le dossier du projet
cd c:\Gemini\terrain_claude_code

# Initialiser Git
git init

# Ajouter le fichier .gitignore
```

### 2.2 Créer/Vérifier le .gitignore

Assurez-vous que le fichier [.gitignore](.gitignore) contient :

```gitignore
# Fichiers sensibles
.env
.env.local
.env.production
.env.*.local

# Node modules
node_modules/
npm-debug.log*

# Logs
logs/
*.log

# Base de données locale
*.db
*.sqlite
data/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Docker local
docker-compose.override.yml
```

### 2.3 Commit et Push vers GitHub/GitLab

```bash
# Ajouter tous les fichiers
git add .

# Créer le commit initial
git commit -m "Initial commit - Production ready"

# Ajouter le remote (remplacer par votre URL)
git remote add origin https://github.com/VOTRE_USERNAME/terrain-tir-arc.git

# Pousser vers le dépôt
git push -u origin main
```

---

## 🐳 Étape 3 : Déployer sur Coolify

### 3.1 Créer une Nouvelle Application

1. **Connectez-vous à Coolify** : https://srv759477.hstgr.cloud (ou l'URL de votre Coolify)

2. **Créer un Nouveau Projet**
   - Cliquez sur "New Project"
   - Nom : `Terrain Tir Arc`

3. **Ajouter une Application**
   - Type : **Docker Compose** ou **Dockerfile**
   - Source : **GitHub/GitLab**
   - Dépôt : `https://github.com/VOTRE_USERNAME/terrain-tir-arc`
   - Branche : `main`

### 3.2 Configurer PostgreSQL

**Option A : Base de données intégrée Coolify**

1. Dans Coolify, aller dans "Databases"
2. Créer une nouvelle base PostgreSQL 15
3. Nom : `terrain-tir-arc-db`
4. Noter le nom d'hôte interne (généralement `postgres` ou `<service-name>`)

**Option B : Base de données externe**

Si vous utilisez une base externe :
- Utiliser l'IP/hostname fourni par votre hébergeur
- Configurer les règles de firewall pour autoriser Coolify

### 3.3 Configurer les Variables d'Environnement

Dans l'interface Coolify :

1. Aller dans **Settings** → **Environment Variables**
2. Ajouter toutes les variables de l'étape 1.3
3. **Mode** : `Secret` pour les valeurs sensibles

### 3.4 Configurer les Ports

- **Port de l'application** : `3000`
- **Protocole** : `HTTP` (Traefik gère HTTPS)
- **Domaine** : `istres.srv759477.hstgr.cloud`

### 3.5 Configurer le Dockerfile

Coolify utilisera automatiquement le [Dockerfile](Dockerfile) du projet.

Vérifiez qu'il contient bien :
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server/index.js"]
```

### 3.6 Déployer

1. Cliquez sur **"Deploy"**
2. Coolify va :
   - Cloner le dépôt Git
   - Construire l'image Docker
   - Démarrer les conteneurs
   - Configurer le reverse proxy Traefik
   - Générer le certificat SSL (Let's Encrypt)

**Durée estimée** : 5-10 minutes

---

## 🌐 Étape 4 : Configurer le DNS

### 4.1 Récupérer l'IP du Serveur

```bash
# Obtenir l'IP publique du serveur Coolify
curl -4 ifconfig.me
```

Ou vérifier dans le panneau Hostinger.

### 4.2 Configurer les Enregistrements DNS

Dans le **Panneau DNS Hostinger** (srv759477.hstgr.cloud) :

#### Option Recommandée : Sous-domaine dédié

| Type | Nom | Valeur | TTL |
|------|-----|--------|-----|
| A | `tirallarc` | `<IP_SERVEUR_COOLIFY>` | 3600 |
| CNAME | `www.tirallarc` | `istres.srv759477.hstgr.cloud` | 3600 |

**URLs accessibles** :
- https://istres.srv759477.hstgr.cloud
- https://www.istres.srv759477.hstgr.cloud

#### Vérifier la Propagation DNS

```bash
# Vérifier l'enregistrement A
nslookup istres.srv759477.hstgr.cloud

# Vérifier depuis un site
# https://dnschecker.org/
```

**Temps de propagation** : 5 minutes à 48 heures (généralement < 1 heure)

---

## ✅ Étape 5 : Vérifier le Déploiement

### 5.1 Vérifier le Health Check

```bash
# Test simple
curl -k https://istres.srv759477.hstgr.cloud:3000/health

# Résultat attendu:
{
  "status": "healthy",
  "timestamp": "2025-10-17T...",
  "version": "1.0.0",
  "environment": "production"
}
```

### 5.2 Vérifier l'API

```bash
# Tester les stats
curl -k https://istres.srv759477.hstgr.cloud:3000/api/sessions/stats
```

### 5.3 Vérifier le Frontend

Ouvrir dans le navigateur :
```
https://istres.srv759477.hstgr.cloud
```

**Checklist** :
- [ ] ✅ Page d'accueil s'affiche
- [ ] ✅ HTTPS activé (cadenas vert)
- [ ] ✅ Pas d'erreur dans la console
- [ ] ✅ Scanner QR fonctionne
- [ ] ✅ Formulaire de déclaration fonctionne

### 5.4 Tester l'Authentification Admin

```bash
# Test login
curl -X POST https://istres.srv759477.hstgr.cloud:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"changez-moi-en-production"}'

# Résultat attendu: JWT tokens
```

---

## 🔒 Étape 6 : Sécuriser l'Installation

### 6.1 Changer le Mot de Passe Admin

**CRITIQUE** : Le mot de passe par défaut `changez-moi-en-production` doit être changé !

1. Se connecter à l'interface admin : https://istres.srv759477.hstgr.cloud/admin/
2. Aller dans **Paramètres** → **Changer le mot de passe**
3. Utiliser un mot de passe fort (20+ caractères)

**Ou via API** :
```bash
# Se connecter
TOKEN=$(curl -s -X POST https://istres.srv759477.hstgr.cloud:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"changez-moi-en-production"}' \
  | jq -r '.accessToken')

# Changer le mot de passe
curl -X PUT https://istres.srv759477.hstgr.cloud:3000/api/admin/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"changez-moi-en-production","newPassword":"VOTRE_NOUVEAU_MOT_DE_PASSE_FORT"}'
```

### 6.2 Vérifier les Logs

Dans Coolify :
- Aller dans **Logs** → **Application Logs**
- Vérifier qu'il n'y a pas d'erreurs
- Vérifier que les connexions sont loguées

### 6.3 Configurer les Backups

**PostgreSQL Backup** :

Dans Coolify, configurer :
- Fréquence : Quotidienne (2h du matin)
- Rétention : 7 jours minimum
- Destination : S3 ou local

**Backup manuel** :
```bash
# Se connecter au serveur
ssh root@srv759477.hstgr.cloud

# Backup manuel
docker exec <postgres-container> pg_dump -U tir_arc_user terrain_tir_arc > backup-$(date +%Y%m%d).sql
```

### 6.4 Monitorer l'Application

**Outils recommandés** :
- Coolify Metrics (intégré)
- Uptime Kuma (monitoring externe)
- Grafana + Prometheus (avancé)

**Métriques à surveiller** :
- Temps de réponse API
- Nombre d'erreurs 5xx
- Utilisation mémoire/CPU
- Espace disque base de données

---

## 🐛 Dépannage

### Problème : "Unable to connect to database"

**Solution** :
1. Vérifier que PostgreSQL est démarré dans Coolify
2. Vérifier les variables `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`
3. Vérifier les logs PostgreSQL

### Problème : "CORS error" dans le navigateur

**Solution** :
1. Vérifier `CORS_ORIGIN` dans les variables d'environnement
2. S'assurer que l'URL correspond exactement (https, pas de / à la fin)
3. Redémarrer l'application après changement

### Problème : "Certificate error" / "Not secure"

**Solution** :
1. Vérifier que Traefik est actif dans Coolify
2. Attendre 2-3 minutes pour génération Let's Encrypt
3. Vérifier que le port 443 est ouvert
4. Forcer le renouvellement du certificat dans Coolify

### Problème : "Port 3000 not accessible"

**Solution** :
1. Vérifier la configuration des ports dans Coolify
2. S'assurer que Traefik proxyfie vers le bon port
3. Vérifier le firewall du serveur :
```bash
ufw status
ufw allow 3000/tcp
```

### Problème : DNS ne résout pas

**Solution** :
1. Attendre jusqu'à 48h pour propagation complète
2. Vider le cache DNS local : `ipconfig /flushdns` (Windows)
3. Tester avec un autre DNS : `8.8.8.8` (Google)
4. Vérifier les enregistrements : https://dnschecker.org/

---

## 📊 Checklist Post-Déploiement

### Sécurité
- [ ] Mot de passe admin changé
- [ ] Variables d'environnement configurées avec secrets forts
- [ ] HTTPS activé et fonctionnel
- [ ] CORS configuré correctement
- [ ] Rate limiting actif
- [ ] Backups automatiques configurés

### Fonctionnalités
- [ ] Page d'accueil accessible
- [ ] Scanner QR fonctionne
- [ ] Déclaration de session fonctionne
- [ ] Signalement d'incident fonctionne
- [ ] Login admin fonctionne
- [ ] Dashboard admin accessible
- [ ] Exports de rapports fonctionnent

### Performance
- [ ] Temps de réponse < 500ms
- [ ] Pas d'erreur dans les logs
- [ ] Base de données répond rapidement
- [ ] PWA s'installe correctement sur mobile

### Monitoring
- [ ] Logs accessibles dans Coolify
- [ ] Métriques activées
- [ ] Alertes configurées (optionnel)
- [ ] Uptime monitoring actif (optionnel)

---

## 🔄 Mises à Jour Futures

### Déployer une Mise à Jour

```bash
# 1. Faire les modifications localement
# 2. Commiter et pousser
git add .
git commit -m "Update: description des changements"
git push origin main

# 3. Dans Coolify, cliquer sur "Redeploy"
# Ou activer le "Auto Deploy" sur push Git
```

### Rollback en Cas de Problème

Dans Coolify :
1. Aller dans **Deployments**
2. Sélectionner un déploiement précédent
3. Cliquer sur **"Rollback"**

---

## 📞 Support

### En Cas de Problème

1. **Consulter les logs** :
   - Coolify → Application → Logs
   - Logs en temps réel dans l'interface

2. **Vérifier les variables d'environnement** :
   - Coolify → Application → Settings → Environment Variables

3. **Redémarrer l'application** :
   - Coolify → Application → Actions → Restart

4. **Consulter la documentation** :
   - [DEPLOIEMENT_COOLIFY_COMPLET.md](DEPLOIEMENT_COOLIFY_COMPLET.md)
   - [CONFIGURATION_DNS.md](CONFIGURATION_DNS.md)
   - [SECURITE_LOCALSTORAGE.md](SECURITE_LOCALSTORAGE.md)

### Contacts

- **Support Coolify** : https://coolify.io/docs
- **Support Hostinger** : https://www.hostinger.fr/support

---

## 🎉 Félicitations !

Votre application est maintenant déployée en production ! 🚀

**URLs de l'application** :
- **Frontend** : https://istres.srv759477.hstgr.cloud
- **Admin** : https://istres.srv759477.hstgr.cloud/admin/
- **API** : https://istres.srv759477.hstgr.cloud:3000/api

**Prochaines étapes recommandées** :
1. Tester toutes les fonctionnalités
2. Créer quelques sessions de test
3. Former les utilisateurs
4. Imprimer les QR codes
5. Installer la PWA sur mobile
6. Configurer les sauvegardes régulières
7. Monitorer les premières semaines

**N'oubliez pas** :
- ⚠️ Changer le mot de passe admin immédiatement
- 🔒 Conserver les secrets JWT en lieu sûr
- 💾 Vérifier les backups régulièrement
- 📊 Surveiller les logs les premiers jours
