# 🚀 Installation Propre sur Coolify

Ce guide vous permet de déployer l'application avec une base de données totalement vierge, évitant tous les problèmes de données corrompues.

## ⚠️ IMPORTANT : Supprimer les volumes existants

Avant de redéployer, vous **DEVEZ** supprimer tous les volumes Docker pour repartir de zéro.

### Étape 1 : Se connecter au serveur Coolify

```bash
ssh votre-utilisateur@srv759477.hstgr.cloud
```

### Étape 2 : Arrêter l'application

Dans l'interface Coolify, arrêtez l'application ou via SSH :

```bash
# Trouver le nom du projet Coolify
docker ps | grep tirallarc

# Arrêter tous les conteneurs
docker-compose -f /path/to/docker-compose.yaml down
```

### Étape 3 : Supprimer TOUS les volumes

```bash
# Lister les volumes
docker volume ls | grep tirallarc

# Supprimer les volumes (⚠️ PERTE DE DONNÉES DÉFINITIVE)
docker volume rm postgres_data_prod
docker volume rm app_uploads_prod
docker volume rm app_logs_prod
docker volume rm app_backups_prod

# OU supprimer tous les volumes orphelins
docker volume prune -f
```

### Étape 4 : Vérifier que les volumes sont supprimés

```bash
docker volume ls | grep tirallarc
# Ne devrait rien afficher
```

---

## 📋 Configuration des Variables d'Environnement dans Coolify

### 1. Générer les secrets

Sur votre machine locale, exécutez :

```bash
node -e "const crypto = require('crypto'); console.log('JWT_SECRET=' + crypto.randomBytes(64).toString('hex'))"
node -e "const crypto = require('crypto'); console.log('JWT_REFRESH_SECRET=' + crypto.randomBytes(64).toString('hex'))"
node -e "const crypto = require('crypto'); console.log('SESSION_SECRET=' + crypto.randomBytes(64).toString('hex'))"
node -e "const crypto = require('crypto'); console.log('ENCRYPTION_KEY=' + crypto.randomBytes(32).toString('hex'))"
node -e "const crypto = require('crypto'); console.log('DB_PASSWORD=' + crypto.randomBytes(32).toString('base64'))"
```

### 2. Dans Coolify, configurez ces variables d'environnement :

#### Base de données PostgreSQL
```env
DB_HOST=postgres
DB_PORT=5432
DB_NAME=terrain_tir_arc
DB_USER=tir_arc_user
DB_PASSWORD=<valeur générée ci-dessus>
```

#### Sécurité JWT
```env
JWT_SECRET=<valeur générée ci-dessus - 128 caractères hex>
JWT_REFRESH_SECRET=<valeur générée ci-dessus - 128 caractères hex>
SESSION_SECRET=<valeur générée ci-dessus - 128 caractères hex>
ENCRYPTION_KEY=<valeur générée ci-dessus - 64 caractères hex>
```

#### Serveur et CORS
```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
ALLOWED_ORIGINS=https://tiralarc.srv759477.hstgr.cloud
```

#### Rate Limiting
```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Logs
```env
LOG_LEVEL=info
LOG_FORMAT=json
```

#### Email (optionnel - peut être configuré plus tard)
```env
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASSWORD=
```

---

## 🚀 Déploiement

### Étape 1 : Déclencher le déploiement

Dans Coolify :
1. Allez dans votre application
2. Cliquez sur "Deploy"
3. Coolify va :
   - Cloner le repo GitHub
   - Builder l'image Docker
   - Créer les volumes vierges
   - Démarrer PostgreSQL
   - Démarrer l'application

### Étape 2 : Vérifier le démarrage

Surveillez les logs dans Coolify ou via SSH :

```bash
# Trouver l'ID du conteneur app
docker ps | grep app

# Suivre les logs
docker logs <container-id> -f
```

Vous devriez voir :
```
[DATABASE] Config: host=postgres, port=5432, database=terrain_tir_arc, user=tir_arc_user, ssl=false
[DATABASE] DEBUG: Tentative de connexion au pool...
[DATABASE] DEBUG: Client connecté au pool avec succès
[WRAPPER] ✅ Serveur démarré avec succès
```

### Étape 3 : Initialiser la base de données

Une fois le serveur démarré, initialisez la base de données :

```bash
# Trouver l'ID du conteneur app
docker ps | grep app

# Initialiser la base de données
docker exec <container-id> node server/scripts/init-db.js
```

Vous devriez voir :
```
✅ Tables créées avec succès
✅ Compte administrateur par défaut créé:
   Username: admin
   Email: admin@localhost
   Password: changez-moi-en-production
```

---

## ✅ Test de l'application

### 1. Accéder à l'application

Ouvrez votre navigateur : `https://tiralarc.srv759477.hstgr.cloud/`

Vous devriez voir la page de connexion sans erreur 504.

### 2. Connexion administrateur

```
Username: admin
Password: changez-moi-en-production
```

### 3. Changer le mot de passe

Lors de la première connexion, vous serez forcé de changer le mot de passe.

---

## 🐛 Dépannage

### Problème : Gateway Timeout (504)

```bash
# Vérifier que le conteneur est running (pas en restart)
docker ps | grep app

# Vérifier les logs pour erreurs
docker logs <container-id> --tail 100

# Vérifier que le port 3000 est exposé
docker port <container-id>
```

### Problème : "password authentication failed"

C'est normal ! Cela signifie que PostgreSQL n'a pas encore le bon mot de passe. Lors du **premier démarrage**, PostgreSQL crée l'utilisateur avec le mot de passe de `DB_PASSWORD`.

Si vous voyez cette erreur :
1. Attendez que PostgreSQL soit complètement démarré
2. Redémarrez le conteneur app : `docker restart <container-id>`

### Problème : ValidationError express-rate-limit

Si vous voyez encore cette erreur, vérifiez que vous avez bien la dernière version du code (commit `c524987` ou plus récent) :

```bash
# Dans Coolify, vérifier la dernière version déployée
git log -1 --oneline
```

### Problème : Admin ne peut pas se connecter

Réinitialisez le compte admin :

```bash
docker exec <container-id> node server/scripts/reset-admin.js
```

---

## 📝 Checklist Installation Propre

- [ ] Arrêter l'application dans Coolify
- [ ] Supprimer tous les volumes Docker (`docker volume rm ...`)
- [ ] Vérifier que les volumes sont supprimés (`docker volume ls`)
- [ ] Configurer toutes les variables d'environnement dans Coolify
- [ ] Générer de nouveaux secrets cryptographiques
- [ ] Déclencher le déploiement dans Coolify
- [ ] Vérifier les logs : "✅ Serveur démarré avec succès"
- [ ] Exécuter `docker exec <container-id> node server/scripts/init-db.js`
- [ ] Accéder à `https://tiralarc.srv759477.hstgr.cloud/`
- [ ] Se connecter avec admin/changez-moi-en-production
- [ ] Changer le mot de passe admin

---

## ⚙️ Configuration Post-Installation

### 1. Configurer SMTP (optionnel)

Depuis l'interface admin, allez dans "Configuration Email" pour configurer l'envoi d'emails.

### 2. Sauvegarder les variables d'environnement

Conservez une copie sécurisée de vos secrets (JWT_SECRET, ENCRYPTION_KEY, DB_PASSWORD) dans un gestionnaire de mots de passe.

### 3. Activer les backups automatiques

Les backups sont configurés dans `docker-compose.yaml` et s'exécutent automatiquement tous les jours.

Pour vérifier :
```bash
docker exec <backup-container-id> ls -lh /backups
```

---

## 🔒 Sécurité Post-Déploiement

1. **Changez immédiatement le mot de passe admin** après la première connexion
2. Vérifiez que HTTPS fonctionne (cadenas vert dans le navigateur)
3. Testez le rate limiting en faisant plusieurs requêtes rapides
4. Vérifiez les logs de sécurité : `docker logs <container-id> | grep SECURITY`

---

## 📚 Documentation Complète

- [README.md](README.md) - Vue d'ensemble du projet
- [DEPLOYMENT.md](DEPLOYMENT.md) - Guide de déploiement détaillé
- [DATABASE.md](DATABASE.md) - Gestion de la base de données
- [CHANGELOG.md](CHANGELOG.md) - Historique des versions
