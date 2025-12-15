# 🎯 Guide Complet de Déploiement Coolify v1.0.1

Ce guide vous accompagne pas à pas pour déployer votre application de gestion de terrains de tir à l'arc sur Coolify.

---

## 📋 Prérequis

- ✅ Serveur Coolify installé et accessible
- ✅ Nom de domaine configuré (ex: `tirallarc.votredomaine.com`)
- ✅ Repository GitHub à jour avec la v1.0.1
- ✅ Accès à Node.js 20+ localement (pour générer les secrets)

---

## 🔐 Étape 1 : Générer les Secrets

### Sur votre machine locale :

```bash
# Générer des secrets forts (32+ caractères)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('DB_PASSWORD=' + require('crypto').randomBytes(24).toString('hex'))"
```

**⚠️ IMPORTANT :** Copiez ces secrets dans un fichier temporaire sécurisé. Vous allez les utiliser dans Coolify.

**Exemple de sortie :**
```
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
JWT_REFRESH_SECRET=f2e1d0c9b8a7z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1
SESSION_SECRET=9876543210abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqr
ENCRYPTION_KEY=zyxwvutsrqponmlkjihgfedcba9876543210fedcba9876543210abcdefghij
DB_PASSWORD=secure_db_password_123456789
```

---

## 🎯 Étape 2 : Configurer le Projet dans Coolify

### 2.1 Créer un Nouveau Projet

1. **Connectez-vous à Coolify** : `https://coolify.votreserveur.com`
2. **Cliquez sur "New Project"**
3. **Nom du projet :** `Terrain Tir Arc` (ou votre choix)

### 2.2 Ajouter la Resource

1. **Add New Resource** → **Docker Compose**
2. **Configuration Git :**
   ```
   Repository URL: https://github.com/Eloli13/terrain-tir-arc
   Branch: main
   Docker Compose File: docker-compose.coolify.yml
   ```

3. **Build Configuration :**
   - **Build Pack :** Docker Compose
   - **Base Directory :** `.` (racine)
   - **Dockerfile :** `Dockerfile` (auto-détecté)

**📌 Note importante :** Nous utilisons `docker-compose.coolify.yml` et non `docker-compose.prod.yml`. Le fichier Coolify est optimisé pour cette plateforme :
- ✅ Pas de référence à une image Docker Hub (construction locale uniquement)
- ✅ Configuration simplifiée pour Coolify
- ✅ Service de backup avec planification quotidienne

---

## ⚙️ Étape 3 : Variables d'Environnement

Dans l'onglet **Environment Variables** de votre resource Coolify, ajoutez :

### 📦 Base de Données

```env
DB_HOST=postgres
DB_PORT=5432
DB_NAME=terrain_tir_arc
DB_USER=tir_arc_user
DB_PASSWORD=VOTRE_DB_PASSWORD_GENERE
```

### 🔐 Secrets JWT (Utilisez les secrets générés à l'étape 1)

```env
JWT_SECRET=VOTRE_JWT_SECRET_GENERE
JWT_REFRESH_SECRET=VOTRE_JWT_REFRESH_SECRET_GENERE
SESSION_SECRET=VOTRE_SESSION_SECRET_GENERE
ENCRYPTION_KEY=VOTRE_ENCRYPTION_KEY_GENERE
```

### 🌐 Configuration Application

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn
```

### 🔒 CORS (⚠️ IMPORTANT - Remplacez par votre domaine)

```env
ALLOWED_ORIGINS=https://tirallarc.votredomaine.com,https://www.tirallarc.votredomaine.com
```

### 🚦 Rate Limiting

```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=12
```

### 📧 Email SMTP (Optionnel - Configuration via UI aussi disponible)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre_app_password_gmail
EMAIL_FROM=noreply@votredomaine.com
```

**Note Gmail :** Pour Gmail, générez un "App Password" depuis votre compte Google (Sécurité → Validation en 2 étapes → Mots de passe d'application).

### 📊 Variables PostgreSQL (pour le service)

Si Coolify ne les détecte pas automatiquement depuis docker-compose.prod.yml :

```env
POSTGRES_DB=terrain_tir_arc
POSTGRES_USER=tir_arc_user
POSTGRES_PASSWORD=VOTRE_DB_PASSWORD_GENERE
```

---

## 🌍 Étape 4 : Configuration du Domaine

### 4.1 Dans l'onglet "Domains" de votre resource :

1. **Ajouter votre domaine :** `tirallarc.votredomaine.com`
2. **Generate Domain :** Coolify peut suggérer un sous-domaine automatiquement
3. **SSL/TLS :** Activé automatiquement (Let's Encrypt)

### 4.2 Configuration DNS (chez votre registrar)

Ajoutez un enregistrement A :

```
Type: A
Nom: tirallarc (ou @)
Valeur: IP_DE_VOTRE_SERVEUR_COOLIFY
TTL: 3600 (ou automatique)
```

**Vérification DNS :**
```bash
nslookup tirallarc.votredomaine.com
# Doit retourner l'IP de votre serveur Coolify
```

---

## 🚀 Étape 5 : Premier Déploiement

### 5.1 Lancer le Build

1. **Cliquer sur "Deploy"** (bouton bleu en haut à droite)
2. **Coolify va automatiquement :**
   - ✅ Cloner le repository GitHub
   - ✅ Builder l'image Docker (2-5 minutes)
   - ✅ Démarrer PostgreSQL
   - ✅ Attendre le health check de la DB
   - ✅ Démarrer l'application
   - ✅ Générer le certificat SSL Let's Encrypt
   - ✅ Configurer le reverse proxy Nginx

### 5.2 Suivre les Logs

Dans l'onglet **Logs** :

Recherchez ces messages de succès :

```
✓ Nginx démarré sur le port 80
✓ Base de données connectée
✓ Migration must_change_password appliquée
✓ Serveur démarré avec WebSocket
✓ Health check: status=healthy
```

**Durée totale du premier déploiement :** 5-10 minutes

---

## ✅ Étape 6 : Vérification Post-Déploiement

### 6.1 Health Check

```bash
curl https://tirallarc.votredomaine.com/health
```

**Résultat attendu :**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-04T...",
  "version": "1.0.0",
  "environment": "production",
  "uptime": 42.123
}
```

### 6.2 Vérifier la Migration

Dans **Coolify Terminal** (ou SSH vers le serveur) :

```bash
# Accéder au container
docker exec -it <container-name> sh

# Vérifier la colonne must_change_password
psql -U tir_arc_user -d terrain_tir_arc \
  -c "\d admin_users" | grep must_change_password
```

**Résultat attendu :**
```
must_change_password | boolean | | | false
```

### 6.3 Tester l'Application

1. **Ouvrir dans le navigateur :** `https://tirallarc.votredomaine.com`
2. **Connexion admin :**
   - Username: `admin`
   - Password: `changez-moi-en-production`

3. **Changer le mot de passe immédiatement !**

### 6.4 Vérifier les Headers de Sécurité

```bash
curl -I https://tirallarc.votredomaine.com/health | grep -i "content-security-policy"
```

**Résultat attendu :**
```
Content-Security-Policy: default-src 'self';style-src 'self' https://fonts.googleapis.com 'nonce-...
```

Vous devriez voir des **nonces** au lieu de `'unsafe-inline'` ✅

### 6.5 Score de Sécurité

Après connexion admin, testez l'API :

```bash
# Se connecter et obtenir un token
TOKEN=$(curl -s -X POST https://tirallarc.votredomaine.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"VOTRE_NOUVEAU_MOT_DE_PASSE"}' \
  | jq -r '.accessToken')

# Vérifier le score de sécurité
curl -s https://tirallarc.votredomaine.com/api/v1/security/status \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```

**Score attendu : 90-95/100** 🎯

---

## 🔧 Étape 7 : Configuration Post-Déploiement

### 7.1 Changer le Mot de Passe Admin

**Via l'interface web :**
1. Connexion avec `admin` / `changez-moi-en-production`
2. Aller dans **Profil** ou **Paramètres**
3. Changer le mot de passe

**Ou via API :**
```bash
curl -X POST https://tirallarc.votredomaine.com/api/v1/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "changez-moi-en-production",
    "newPassword": "VotreNouveauMotDePasseSecurise123!"
  }'
```

### 7.2 Configurer SMTP (si pas fait dans les variables)

1. **Se connecter en admin**
2. **Aller dans Configuration → Email**
3. **Entrer les paramètres SMTP**
4. **Tester l'envoi d'un email**

### 7.3 Activer les Backups Automatiques

Dans Coolify :
1. **Onglet Backups**
2. **Configurer backup PostgreSQL**
   - Fréquence : Quotidien à 3h00
   - Rétention : 30 jours
3. **Destination :** S3, local, ou autre

---

## 📊 Étape 8 : Monitoring et Maintenance

### 8.1 Vérifier les Logs Coolify

**Dans l'interface Coolify :**
- **Logs** → Voir les logs en temps réel
- **Metrics** → Utilisation CPU/RAM/Disque
- **Health Checks** → État des services

### 8.2 GitHub Actions (CI/CD Automatique)

Le workflow `.github/workflows/security.yml` s'exécute automatiquement :
- ✅ À chaque push sur `main`
- ✅ Quotidiennement à 3h UTC
- ✅ Sur chaque Pull Request

**Vérifier dans GitHub :**
`https://github.com/Eloli13/terrain-tir-arc/actions`

### 8.3 Monitoring de Sécurité

**Vérifier mensuellement :**

```bash
# Score de sécurité
curl -s https://tirallarc.votredomaine.com/api/v1/security/status \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.securityScore'

# Sessions actives
curl -s https://tirallarc.votredomaine.com/api/v1/security/active-sessions \
  -H "Authorization: Bearer $TOKEN"

# Logs d'audit (dernières 24h)
curl -s "https://tirallarc.votredomaine.com/api/v1/security/audit-logs?hours=24" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🚨 Troubleshooting

### Problème : Application ne démarre pas

**Solution 1 - Vérifier les logs :**
```
Coolify → Logs → Rechercher "error" ou "failed"
```

**Solution 2 - Vérifier les variables d'environnement :**
```
Coolify → Environment Variables → Toutes les variables requises présentes ?
```

**Solution 3 - Vérifier la santé PostgreSQL :**
```bash
docker ps
# Le container postgres doit être "healthy"
```

### Problème : "pull access denied for tirallarc-app"

**Message d'erreur complet :**
```
Image tirallarc-app:latest pull access denied for tirallarc-app,
repository does not exist or may require 'docker login'
WARNING: Some service image(s) must be built from source
```

**Cause :** Le fichier Docker Compose contenait une directive `image:` qui faisait que Coolify essayait de télécharger l'image depuis Docker Hub au lieu de la construire localement.

**Solution :**
- ✅ **Déjà corrigé** dans `docker-compose.coolify.yml` (v1.0.2+)
- La ligne `image: tirallarc-app:${APP_VERSION:-latest}` a été supprimée
- Coolify construit maintenant l'image directement depuis le Dockerfile

**Si vous avez toujours cette erreur :**
1. Vérifiez que vous utilisez bien `docker-compose.coolify.yml`
2. Assurez-vous que votre repository GitHub est à jour (git pull)
3. Dans Coolify : **Force Rebuild** depuis l'interface

### Problème : "failed to read dockerfile: no such file or directory" ⚠️ CRITIQUE

**Message d'erreur complet :**
```
#2 [internal] load build definition from Dockerfile
#2 transferring dockerfile: 2B 0.0s done
failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory
```

**Cause :** Le fichier `.dockerignore` contenait une ligne `Dockerfile` qui excluait le Dockerfile lui-même du build context Docker. C'est une erreur de configuration courante mais critique.

**Solution :**
- ✅ **Déjà corrigé** dans `.dockerignore` (v1.0.2+)
- La ligne `Dockerfile` a été supprimée du `.dockerignore`
- Le Dockerfile est maintenant accessible lors du build

**⚠️ IMPORTANT :** Le `.dockerignore` ne doit **JAMAIS** exclure :
- Le `Dockerfile` lui-même
- Les fichiers de configuration essentiels (nginx.conf, start.sh, etc.)
- Les dossiers sources nécessaires au build (server/, css/, js/, admin/)

**Si vous avez toujours cette erreur après mise à jour v1.0.2+ :**

**Cause probable :** Coolify utilise un **cache de build** avec l'ancien `.dockerignore`.

**Solutions (dans l'ordre) :**

1. **Forcer le refresh Git dans Coolify :**
   - Vérifiez le commit hash affiché dans Coolify
   - Il doit être `64cfb6c` ou plus récent
   - Cliquez sur "**Pull**" ou "**Sync**" pour forcer la récupération

2. **Nettoyer le cache de build Docker :**
   - Dans Coolify : Activez "**Clear Build Cache**" ou "**No Cache**"
   - OU via SSH sur le serveur : `docker builder prune -a -f`

3. **Force Rebuild complet :**
   - Cliquez sur "**Deploy**" / "**Redeploy**"
   - **Cochez** "**Force rebuild**" ou "**No cache**"
   - Surveillez les logs : Le Dockerfile doit être transféré avec ~3.6KB, **PAS 2B**

4. **Option nucléaire (si rien ne marche) :**
   - Supprimez complètement la resource dans Coolify
   - Recréez-la depuis zéro avec `docker-compose.coolify.yml`
   - Cela force Coolify à tout nettoyer et repartir de zéro

**Indicateur de succès dans les logs :**
```
#2 [internal] load build definition from Dockerfile
#2 transferring dockerfile: 3.6KB done  ← Doit être ~3.6KB, PAS 2B !
```

### Problème : Erreur 502 Bad Gateway

**Cause :** L'application n'est pas encore prête

**Solution :**
- Attendre 1-2 minutes après le déploiement
- Vérifier que le health check `/health` retourne 200
- Voir les logs de l'application

### Problème : Certificat SSL non généré

**Cause :** DNS pas encore propagé

**Solution :**
- Vérifier DNS : `nslookup votre-domaine.com`
- Attendre 5-10 minutes pour la propagation DNS
- Dans Coolify : Regenerate Certificate

### Problème : Migration not applied

**Vérifier :**
```bash
docker exec -it <postgres-container> psql -U tir_arc_user -d terrain_tir_arc \
  -c "SELECT column_name FROM information_schema.columns WHERE table_name='admin_users';"
```

**Solution si manquante :**
```bash
docker exec -it <postgres-container> psql -U tir_arc_user -d terrain_tir_arc \
  -c "ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;"
```

### Problème : Score de sécurité < 90

**Causes courantes :**
1. Secrets trop courts (< 32 caractères)
2. Variables d'environnement manquantes
3. NODE_ENV pas en "production"

**Vérifier :**
```bash
curl https://tirallarc.votredomaine.com/api/v1/security/status \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.recommendations'
```

---

## 🔄 Mises à Jour de l'Application

### Déployer une nouvelle version :

1. **Pousser les changements vers GitHub :**
   ```bash
   git push origin main
   ```

2. **Dans Coolify :**
   - Cliquer sur **Deploy** (ou activer Auto-Deploy)
   - Coolify va automatiquement :
     - Pull le nouveau code
     - Rebuild l'image
     - Zero-downtime deployment

3. **Vérifier :**
   ```bash
   curl https://tirallarc.votredomaine.com/health
   # Vérifier que la version a changé
   ```

---

## 📋 Checklist Finale de Déploiement

**Configuration :**
- [x] Secrets générés (≥ 32 caractères)
- [x] Variables d'environnement configurées dans Coolify
- [x] ALLOWED_ORIGINS avec votre domaine
- [x] Domaine configuré et DNS pointé
- [x] Certificat SSL Let's Encrypt généré

**Sécurité :**
- [x] Migration must_change_password appliquée
- [x] Mot de passe admin changé
- [x] Score de sécurité ≥ 90/100
- [x] CSP avec nonces activé
- [x] Rate limiting fonctionnel
- [x] API /security/status accessible

**Infrastructure :**
- [x] Health check retourne 200
- [x] HTTPS fonctionnel
- [x] Backups configurés
- [x] Logs accessibles
- [x] GitHub Actions activé

**Fonctionnel :**
- [x] Connexion admin possible
- [x] Interface utilisateur accessible
- [x] Email SMTP configuré (optionnel)
- [x] WebSocket temps réel fonctionne

---

## 🎉 Félicitations !

Votre application est maintenant déployée en production avec :
- ✅ **Sécurité renforcée** (score 90-95/100)
- ✅ **HTTPS automatique**
- ✅ **Monitoring en temps réel**
- ✅ **CI/CD automatisé**
- ✅ **Backups quotidiens**

---

## 📚 Ressources

- [SECURITY.md](../SECURITY.md) - Guide complet de sécurité
- [TEST_GUIDE.md](../TEST_GUIDE.md) - Tests automatisés
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Guide de déploiement général
- [CHANGELOG.md](../CHANGELOG.md) - Historique des versions

**Support :**
- GitHub Issues : https://github.com/Eloli13/terrain-tir-arc/issues
- Documentation Coolify : https://coolify.io/docs

---

**Version du guide :** 1.0.1
**Dernière mise à jour :** 2025-12-04
