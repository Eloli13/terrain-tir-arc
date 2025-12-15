# 🚀 Guide de Déploiement en Production

Ce guide couvre le déploiement de l'application de gestion des terrains de tir à l'arc en production, avec ou sans Coolify.

---

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Génération des secrets](#génération-des-secrets)
3. [Configuration](#configuration)
4. [Déploiement avec Coolify (Recommandé)](#déploiement-avec-coolify)
5. [Déploiement Docker manuel](#déploiement-docker-manuel)
6. [Configuration HTTPS/SSL](#configuration-httpsssl)
7. [Backups](#backups)
8. [Monitoring](#monitoring)
9. [Maintenance](#maintenance)
10. [Rollback](#rollback)
11. [Troubleshooting](#troubleshooting)

---

## ✅ Prérequis

### Serveur
- OS: Ubuntu 20.04+ / Debian 11+ / autre Linux
- RAM: Minimum 2GB, recommandé 4GB+
- CPU: Minimum 2 cores
- Espace disque: Minimum 20GB
- Accès SSH root ou sudo

### Logiciels
- Docker 24+
- Docker Compose 2.20+
- Node.js 20+ (pour génération des secrets)
- Git (optionnel)

### Réseau
- Port 80 (HTTP) ouvert
- Port 443 (HTTPS) ouvert
- Port 5432 (PostgreSQL) **fermé** au public
- Nom de domaine pointant vers le serveur (pour HTTPS)

---

## 🔐 Génération des secrets

**⚠️ ÉTAPE CRITIQUE - À faire AVANT le premier déploiement**

### 1. Générer les secrets cryptographiques

```bash
node generate-secrets.js create
```

Cette commande génère :
- `JWT_SECRET` - Secret pour tokens d'accès
- `JWT_REFRESH_SECRET` - Secret pour tokens de rafraîchissement
- `SESSION_SECRET` - Secret pour sessions
- `ENCRYPTION_KEY` - Clé de chiffrement AES-256
- `DB_PASSWORD` - Mot de passe base de données fort

### 2. Sauvegarder les secrets

**IMPORTANT:** Copiez le fichier `.env.production` dans un gestionnaire de secrets sécurisé :
- 1Password
- Bitwarden
- HashiCorp Vault
- AWS Secrets Manager
- etc.

**NE JAMAIS** commiter `.env.production` dans Git !

### 3. Vérifier .gitignore

Le script ajoute automatiquement à `.gitignore` :
```
.env.production
.env.local
.env.*.local
secrets.txt
```

---

## ⚙️ Configuration

### 1. Éditer `.env.production`

```bash
nano .env.production
```

Modifiez les valeurs suivantes :

#### CORS Origins (OBLIGATOIRE)
```env
ALLOWED_ORIGINS=https://votre-domaine.com,https://www.votre-domaine.com
```

#### Email SMTP (Optionnel - configurable via UI)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # App password Gmail
```

### 2. Variables d'environnement par défaut

Valeurs recommandées (déjà configurées) :
```env
NODE_ENV=production
LOG_LEVEL=warn
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=12
```

---

## 🔄 Migrations de Base de Données (v1.0.1+)

**⚠️ IMPORTANT pour les déploiements existants**

### Migration automatique

La colonne `must_change_password` est créée automatiquement au démarrage depuis la v1.0.1.

### Migration manuelle (optionnelle)

Pour exécuter la migration avant le déploiement :

```bash
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U tir_arc_user -d terrain_tir_arc < server/migrations/001_add_must_change_password.sql
```

**Vérification :**

```bash
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U tir_arc_user -d terrain_tir_arc \
  -c "\d admin_users" | grep must_change_password
```

---

## 🛡️ Nouveaux Scripts de Sécurité (v1.0.1)

### Audit de sécurité

Vérifier le score de sécurité :

```bash
cd server
npm run security:audit
```

**Score cible en production : ≥ 90/100**

### Rotation des secrets

```bash
# Prévisualisation
npm run security:rotate:dry

# Rotation réelle (révoque tous les JWT actifs)
npm run security:rotate
```

### CI/CD GitHub Actions

Workflow automatique ajouté dans `.github/workflows/security.yml` :
- ✅ npm audit sur chaque push/PR
- ✅ security-audit.js quotidien à 3h UTC
- ✅ CodeQL analysis
- ✅ Dependency review

### Nouvelles API de sécurité

Endpoints admin ajoutés :

```bash
GET /api/v1/security/status          # Score et statistiques
GET /api/v1/security/audit-logs      # Logs d'audit
GET /api/v1/security/active-sessions # Sessions actives
DELETE /api/v1/security/revoke-session/:id  # Révoquer une session
```

Documentation complète : [SECURITY.md](SECURITY.md)

---

## 🎯 Déploiement avec Coolify

**Coolify gère automatiquement :**
- ✅ HTTPS avec Let's Encrypt
- ✅ Renouvellement automatique des certificats
- ✅ Reverse proxy
- ✅ Monitoring
- ✅ Logs centralisés

### Étapes

1. **Créer un nouveau projet dans Coolify**
   - Type: Docker Compose
   - Repository: Votre dépôt Git

2. **Configurer les variables d'environnement**

   Dans l'interface Coolify, ajoutez toutes les variables de `.env.production` :

   ```
   DB_PASSWORD=...
   JWT_SECRET=...
   JWT_REFRESH_SECRET=...
   SESSION_SECRET=...
   ENCRYPTION_KEY=...
   ALLOWED_ORIGINS=https://votre-domaine.com
   ```

3. **Sélectionner le fichier de composition**

   ```
   docker-compose.prod.yml
   ```

4. **Configurer le domaine**

   - Domaine: `votre-domaine.com`
   - Coolify génère automatiquement le certificat SSL

5. **Déployer**

   Cliquez sur "Deploy" - Coolify s'occupe du reste !

### Vérification

```bash
curl https://votre-domaine.com/health
```

Résultat attendu :
```json
{"status":"healthy","timestamp":"...","environment":"production"}
```

---

## 🐳 Déploiement Docker manuel

### 1. Cloner le projet

```bash
git clone https://github.com/votre-repo/terrain-tir-arc.git
cd terrain-tir-arc
```

### 2. Copier .env.production

```bash
cp .env.production.exemple .env.production
# Éditer avec vos secrets générés
nano .env.production
```

### 3. Build et démarrage

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### 4. Vérifier les conteneurs

```bash
docker-compose -f docker-compose.prod.yml ps
```

Résultat attendu :
```
NAME                    STATUS              PORTS
tirallarc-app-prod     Up (healthy)        0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
tirallarc-db-prod      Up (healthy)        127.0.0.1:5432->5432/tcp
tirallarc-backup-prod  Up
```

### 5. Consulter les logs

```bash
docker-compose -f docker-compose.prod.yml logs -f app
```

### 6. Test de santé

```bash
curl http://localhost/health
```

---

## 🔒 Configuration HTTPS/SSL

### Option 1: Avec Coolify (Automatique)

**Rien à faire !** Coolify gère tout automatiquement.

### Option 2: Let's Encrypt manuel (Certbot)

#### Installation de Certbot

```bash
sudo apt update
sudo apt install certbot
```

#### Génération du certificat

```bash
sudo certbot certonly --standalone -d votre-domaine.com -d www.votre-domaine.com
```

Certificats générés dans :
```
/etc/letsencrypt/live/votre-domaine.com/fullchain.pem
/etc/letsencrypt/live/votre-domaine.com/privkey.pem
```

#### Mise à jour de la configuration Nginx

1. Remplacer `nginx.conf` par `nginx.prod.conf` dans le Dockerfile :

```dockerfile
COPY nginx.prod.conf /etc/nginx/nginx.conf
```

2. Décommenter les lignes SSL dans `nginx.prod.conf` :

```nginx
ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;
```

3. Ajouter le volume dans `docker-compose.prod.yml` :

```yaml
volumes:
  - /etc/letsencrypt:/etc/letsencrypt:ro
```

#### Renouvellement automatique

Ajouter un cron job :

```bash
sudo crontab -e
```

Ajouter :
```cron
0 3 * * * certbot renew --quiet && docker-compose -f /path/to/docker-compose.prod.yml restart app
```

### Option 3: Reverse Proxy externe (Nginx/Traefik)

Si vous utilisez un reverse proxy externe, configurez-le pour :
- Terminer le SSL/TLS
- Proxy vers `http://localhost:80`
- Passer les headers `X-Forwarded-*`

---

## 💾 Backups

### Backup automatique quotidien

Le service `backup` dans `docker-compose.prod.yml` effectue un backup quotidien à 3h00.

Backups stockés dans `./backups/` avec rétention de 30 jours.

### Backup manuel

```bash
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U tir_arc_user terrain_tir_arc > backup_$(date +%Y%m%d).sql
```

### Restauration

```bash
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U tir_arc_user terrain_tir_arc < backup_20250118.sql
```

### Backup des uploads

```bash
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/
```

---

## 📊 Monitoring

### Health Check

```bash
curl http://localhost/health
```

### Métriques système

```bash
curl http://localhost/metrics
```

Métriques disponibles :
- Uptime du serveur
- Utilisation mémoire (RSS, heap)
- Sessions actives
- Incidents en attente
- Statistiques WebSocket

### Logs

```bash
# Logs application
docker-compose -f docker-compose.prod.yml logs -f app

# Logs base de données
docker-compose -f docker-compose.prod.yml logs -f postgres

# Logs backup
docker-compose -f docker-compose.prod.yml logs -f backup
```

### Logs persistants

Logs limités automatiquement :
- Taille max: 10 MB par fichier
- Rotation: 3 fichiers
- Driver: json-file

---

## 🔧 Maintenance

### Mise à jour de l'application

```bash
# Pull dernière version
git pull origin main

# Rebuild et redémarrage
docker-compose -f docker-compose.prod.yml up -d --build

# Vérifier
docker-compose -f docker-compose.prod.yml ps
```

### Mise à jour des dépendances npm

```bash
cd server
npm audit fix
npm update
cd ..

# Rebuild
docker-compose -f docker-compose.prod.yml build app
docker-compose -f docker-compose.prod.yml up -d app
```

### Nettoyage Docker

```bash
# Images non utilisées
docker image prune -a

# Volumes non utilisés
docker volume prune

# Tout nettoyer (ATTENTION)
docker system prune -a --volumes
```

### Rotation des secrets

Modifier `.env.production` puis :

```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

**IMPORTANT:** Révoque tous les tokens JWT après changement de secrets !

---

## ⏮️ Rollback

### Rollback rapide

```bash
# Arrêter
docker-compose -f docker-compose.prod.yml down

# Revenir à la version précédente
git checkout <commit-precedent>

# Redémarrer
docker-compose -f docker-compose.prod.yml up -d --no-build
```

### Rollback avec backup DB

```bash
# Arrêter l'app
docker-compose -f docker-compose.prod.yml stop app

# Restaurer DB
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U tir_arc_user terrain_tir_arc < backups/db_20250117_030000.sql

# Redémarrer
docker-compose -f docker-compose.prod.yml start app
```

---

## 🚨 Troubleshooting

### Problème: Application ne démarre pas

**Vérification:**
```bash
docker-compose -f docker-compose.prod.yml logs app
```

**Causes fréquentes:**
- Secrets manquants dans `.env.production`
- Base de données non accessible
- Port 80/443 déjà utilisé

**Solution:**
```bash
# Vérifier variables d'environnement
docker-compose -f docker-compose.prod.yml config

# Vérifier ports
sudo netstat -tulpn | grep -E ':80|:443'
```

### Problème: Erreur de connexion base de données

**Vérification:**
```bash
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U tir_arc_user
```

**Solution:**
```bash
# Redémarrer PostgreSQL
docker-compose -f docker-compose.prod.yml restart postgres

# Attendre que le health check soit OK
docker-compose -f docker-compose.prod.yml ps
```

### Problème: HTTPS ne fonctionne pas

**Avec Coolify:**
- Vérifier que le domaine pointe vers le serveur
- Vérifier les logs Coolify
- Attendre 5-10 minutes pour la génération du certificat

**Manuel:**
```bash
# Vérifier Certbot
sudo certbot certificates

# Tester le certificat
openssl s_client -connect votre-domaine.com:443 -servername votre-domaine.com
```

### Problème: Performances lentes

**Vérification:**
```bash
# Ressources conteneurs
docker stats

# Logs d'erreurs
docker-compose -f docker-compose.prod.yml logs app | grep -i error
```

**Optimisations:**
- Vérifier les index de base de données (créés automatiquement)
- Augmenter les limites CPU/RAM dans docker-compose.prod.yml
- Activer le cache dans nginx.prod.conf

### Problème: Emails ne s'envoient pas

**Vérification:**
```bash
# Tester configuration SMTP via UI admin
# Consulter les logs
docker-compose -f docker-compose.prod.yml logs app | grep -i email
```

**Solution:**
- Vérifier les credentials SMTP dans .env.production
- Vérifier le port 587 ouvert en sortie
- Pour Gmail: générer un "App Password"

---

## 📞 Support

### Logs d'audit

Toutes les actions sont loggées dans la table `audit_logs` :

```sql
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50;
```

### Monitoring externe recommandé

- **Uptime:** UptimeRobot, Pingdom
- **Logs:** Papertrail, Logtail
- **APM:** New Relic, Datadog
- **Sécurité:** Snyk, Dependabot

---

## ✅ Checklist de déploiement

### Avant de mettre en production :

**Configuration de base :**
- [ ] Secrets générés avec `generate-secrets.js` (≥ 32 caractères)
- [ ] `.env.production` créé et configuré
- [ ] `ALLOWED_ORIGINS` modifié avec votre domaine
- [ ] Domaine DNS configuré et résolu
- [ ] Ports 80 et 443 ouverts
- [ ] PostgreSQL port 5432 **fermé** au public
- [ ] Secrets sauvegardés dans gestionnaire sécurisé
- [ ] `.env.production` dans `.gitignore`

**Sécurité (v1.0.1+) :**
- [ ] Migration `must_change_password` appliquée (automatique ou manuelle)
- [ ] Audit de sécurité exécuté : `npm run security:audit` (score ≥ 90/100)
- [ ] Workflow GitHub Actions activé (`.github/workflows/security.yml`)
- [ ] API de sécurité testée : `GET /api/v1/security/status`
- [ ] CSP avec nonces activé (vérifier headers HTTP)
- [ ] Rate limiting testé (6 tentatives max)
- [ ] Mot de passe admin par défaut changé

**Infrastructure :**
- [ ] Backups automatiques configurés
- [ ] Health checks testés : `GET /health`
- [ ] Logs consultés sans erreurs
- [ ] HTTPS fonctionnel (certificat valide)
- [ ] Tests de charge effectués (optionnel)
- [ ] Plan de rollback documenté

---

**Déploiement réussi ! 🎉**

### Maintenance continue :

1. **Sécurité :**
   - Exécuter `npm run security:audit` mensuellement
   - Surveiller les alertes GitHub Security (Dependabot)
   - Consulter les logs d'audit : `GET /api/v1/security/audit-logs`
   - Rotation des secrets tous les 90 jours (recommandé)

2. **Monitoring :**
   - Vérifier le score de sécurité : `GET /api/v1/security/status`
   - Monitorer les sessions actives : `GET /api/v1/security/active-sessions`
   - Consulter les logs quotidiennement
   - Vérifier les métriques : `GET /metrics`

3. **Backups :**
   - Tester la restauration des backups mensuellement
   - Effectuer des backups manuels avant chaque mise à jour
   - Vérifier l'espace disque des backups

4. **Mises à jour :**
   - Maintenir Node.js à jour (version LTS)
   - Exécuter `npm audit fix` régulièrement
   - Suivre les release notes du projet
   - Tester en staging avant production
