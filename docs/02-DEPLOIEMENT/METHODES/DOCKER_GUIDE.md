# Guide Docker - Build et Push vers Docker Hub

**Pour : Gestion Site Tir à l'Arc**
**Docker Hub : eloli/gestion_site_arc**
**Date : 2025-01-15**

---

## Table des matières

1. [Prérequis](#prérequis)
2. [Méthode rapide (scripts automatisés)](#méthode-rapide-scripts-automatisés)
3. [Méthode manuelle (commandes)](#méthode-manuelle-commandes)
4. [Utiliser l'image dans Coolify](#utiliser-limage-dans-coolify)
5. [Mises à jour](#mises-à-jour)
6. [Dépannage](#dépannage)

---

## Prérequis

### 1. Installer Docker Desktop

**Windows / Mac :**
- Télécharger : https://www.docker.com/products/docker-desktop
- Installer et démarrer Docker Desktop
- Vérifier l'installation :
  ```bash
  docker --version
  docker info
  ```

### 2. Créer un compte Docker Hub

- Créer un compte gratuit : https://hub.docker.com/signup
- Username : `eloli`
- Email : votre email
- Mot de passe : créer un mot de passe sécurisé

---

## Méthode rapide (scripts automatisés)

### Option A : Windows (PowerShell) ⭐ Recommandé

**Ouvrir PowerShell dans votre projet :**

```powershell
# Se placer dans le répertoire du projet
cd C:\Gemini\terrain_claude_code

# Exécuter le script
.\docker-build-and-push.ps1
```

**Le script va :**
1. ✅ Vérifier que Docker est installé et démarré
2. ✅ Demander le tag de version (ex: v1.0.0)
3. ✅ Construire l'image Docker
4. ✅ Tagger en `latest` automatiquement
5. ✅ Proposer un test local
6. ✅ Se connecter à Docker Hub
7. ✅ Pousser l'image vers `eloli/gestion_site_arc`
8. ✅ Afficher les instructions pour Coolify

**Temps total : 5-10 minutes**

---

### Option B : Linux/Mac (Bash)

```bash
# Se placer dans le répertoire du projet
cd /chemin/vers/terrain_claude_code

# Rendre le script exécutable
chmod +x docker-build-and-push.sh

# Exécuter le script
./docker-build-and-push.sh
```

---

## Méthode manuelle (commandes)

### Étape 1 : Build de l'image

```bash
# Se placer dans le répertoire du projet
cd C:\Gemini\terrain_claude_code

# Build l'image avec un tag de version
docker build -t eloli/gestion_site_arc:v1.0.0 .

# Build terminé en 2-5 minutes
```

**Explication :**
- `-t` : tag de l'image
- `eloli/gestion_site_arc` : username/nom-image
- `v1.0.0` : tag de version
- `.` : contexte (dossier actuel)

---

### Étape 2 : Tag en latest

```bash
# Créer un tag latest pour la même image
docker tag eloli/gestion_site_arc:v1.0.0 eloli/gestion_site_arc:latest
```

**Pourquoi latest ?**
- C'est le tag par défaut si aucun tag n'est spécifié
- Facilite les déploiements (pas besoin de spécifier le numéro de version)

---

### Étape 3 : Test local (optionnel)

```bash
# Tester l'image localement
docker run -p 3000:3000 -e NODE_ENV=production eloli/gestion_site_arc:v1.0.0

# Ouvrir dans le navigateur
# http://localhost:3000/health

# Arrêter avec Ctrl+C
```

---

### Étape 4 : Login Docker Hub

```bash
# Se connecter à Docker Hub
docker login

# Entrer vos identifiants :
# Username: eloli
# Password: votre_mot_de_passe
```

**Vous devriez voir :**
```
Login Succeeded
```

---

### Étape 5 : Push vers Docker Hub

```bash
# Push la version spécifique
docker push eloli/gestion_site_arc:v1.0.0

# Push également latest
docker push eloli/gestion_site_arc:latest
```

**Progression :**
```
The push refers to repository [docker.io/eloli/gestion_site_arc]
abc123: Pushed
def456: Pushed
...
v1.0.0: digest: sha256:... size: 1234
```

**Temps : 2-5 minutes** (selon votre connexion internet)

---

### Étape 6 : Vérifier sur Docker Hub

**Ouvrir dans le navigateur :**
```
https://hub.docker.com/r/eloli/gestion_site_arc
```

Vous devriez voir :
- ✅ Repository `eloli/gestion_site_arc`
- ✅ Tags disponibles : `latest`, `v1.0.0`
- ✅ Image publique

---

## Utiliser l'image dans Coolify

### Configuration Coolify

**Dans l'interface Coolify :**

#### 1. Créer le projet

```
Coolify Dashboard → Projects → Add New Project

Name: TirArc Istres
Description: Application de gestion des terrains de tir à l'arc
Environment: Production
```

#### 2. Créer la base de données

```
Project TirArc → Add New Resource → Database

Type: PostgreSQL
Name: tirallarc-db
Version: 15
Database Name: terrain_tir_arc
Username: tir_arc_user
Password: VotreMotDePasseSecurise123

Backup Configuration:
├─ Frequency: Daily
├─ Time: 02:00 AM
├─ Retention: 7 days

Create Database
```

#### 3. Déployer l'application

```
Project TirArc → Add New Resource → Application

Type: Docker Image

Configuration:
├─ Name: tirallarc-backend
├─ Image: eloli/gestion_site_arc:latest
├─ Registry: Docker Hub (public)
├─ Pull Strategy: Always
└─ Restart Policy: Unless Stopped

Network:
├─ Port: 3000
└─ Protocol: HTTP

Domain:
├─ Domain: tirallarc-istres.fr
├─ Additional Domain: www.tirallarc-istres.fr
└─ SSL: Enable (Let's Encrypt)
```

#### 4. Variables d'environnement

```
Environment Variables → Add Multiple

NODE_ENV=production
PORT=3000
DB_HOST=tirallarc-db
DB_PORT=5432
DB_NAME=terrain_tir_arc
DB_USER=tir_arc_user
DB_PASSWORD=VotreMotDePasseSecurise123
JWT_SECRET=votre_cle_jwt_generee_32_caracteres
JWT_REFRESH_SECRET=votre_cle_refresh_generee_32_caracteres
SESSION_SECRET=votre_cle_session_generee_32_caracteres
ALLOWED_ORIGINS=https://tirallarc-istres.fr,https://www.tirallarc-istres.fr
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@tirallarc-istres.fr
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Générer les clés secrètes :**

```bash
# Dans PowerShell ou terminal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copier et utiliser pour JWT_SECRET

node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copier et utiliser pour JWT_REFRESH_SECRET

node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copier et utiliser pour SESSION_SECRET
```

#### 5. Persistent Storage

```
Storage → Add Volume

Volume 1:
├─ Name: uploads
├─ Mount Path: /app/uploads
└─ Source: Auto (Coolify gère)

Volume 2:
├─ Name: logs
├─ Mount Path: /app/logs
└─ Source: Auto (Coolify gère)
```

#### 6. Deploy

```
Click: Deploy

Coolify va :
1. ✅ Pull l'image depuis Docker Hub
2. ✅ Créer le conteneur
3. ✅ Configurer le réseau Docker
4. ✅ Configurer Traefik (reverse proxy)
5. ✅ Obtenir le certificat SSL
6. ✅ Démarrer l'application
7. ✅ Health check automatique

Temps : 2-5 minutes
```

#### 7. Import du schéma de base de données

```bash
# Option 1 : Via terminal Coolify
Coolify → Database tirallarc-db → Terminal

psql -U tir_arc_user -d terrain_tir_arc

# Copier-coller le contenu de database.sql

# Option 2 : Via SSH
ssh user@votre-serveur.com
docker ps | grep tirallarc-db
docker exec -it <container-id> psql -U tir_arc_user -d terrain_tir_arc

# Copier-coller le contenu de database.sql
```

#### 8. Vérification

```
Ouvrir dans le navigateur :
https://tirallarc-istres.fr/health

Devrait retourner :
{
  "status": "healthy",
  "timestamp": "2025-01-15T...",
  "version": "1.0.0",
  "environment": "production",
  "uptime": 123.45
}
```

**✅ Déploiement terminé !**

---

## Mises à jour

### Workflow de mise à jour

**1. Modifier le code sur votre PC**

```bash
# Éditer les fichiers...
# Tester localement avec npm start
```

**2. Rebuild et push une nouvelle version**

```bash
# Build avec un nouveau tag
docker build -t eloli/gestion_site_arc:v1.1.0 .

# Tag en latest aussi
docker tag eloli/gestion_site_arc:v1.1.0 eloli/gestion_site_arc:latest

# Push les deux
docker push eloli/gestion_site_arc:v1.1.0
docker push eloli/gestion_site_arc:latest
```

**3. Redéployer dans Coolify**

```
Option A : Redeploy automatique (si image = latest)
Coolify → Application → Redeploy
Coolify pull automatiquement la nouvelle image latest

Option B : Changer de version manuellement
Coolify → Application → Settings → Image
Changer : eloli/gestion_site_arc:v1.1.0
Save → Redeploy
```

**Temps total : 5-10 minutes**

---

### Stratégie de versioning

**Tags recommandés :**

```bash
# Version majeure.mineure.patch
v1.0.0  → Première version stable
v1.0.1  → Bug fix
v1.1.0  → Nouvelle fonctionnalité
v2.0.0  → Changement majeur

# Environnements
dev     → Version de développement
staging → Version de test
latest  → Dernière version stable

# Dates
2025-01-15  → Release du 15 janvier 2025
```

**Exemple :**

```bash
# Release v1.1.0
docker build -t eloli/gestion_site_arc:v1.1.0 .
docker tag eloli/gestion_site_arc:v1.1.0 eloli/gestion_site_arc:latest
docker push eloli/gestion_site_arc:v1.1.0
docker push eloli/gestion_site_arc:latest
```

---

### Rollback (revenir en arrière)

**Si une nouvelle version a des problèmes :**

```
Coolify → Application → Settings

Image: eloli/gestion_site_arc:v1.0.0
(au lieu de v1.1.0 ou latest)

Save → Redeploy

L'application revient à la version v1.0.0 en 2 minutes
```

---

## Dépannage

### Problème : Docker n'est pas installé

**Erreur :**
```
docker: command not found
```

**Solution :**
```
Installer Docker Desktop :
Windows/Mac : https://www.docker.com/products/docker-desktop
Linux : sudo apt install docker.io
```

---

### Problème : Docker n'est pas démarré

**Erreur :**
```
Cannot connect to the Docker daemon
```

**Solution :**
```
Windows/Mac : Démarrer Docker Desktop
Linux : sudo systemctl start docker
```

---

### Problème : Échec du build

**Erreur :**
```
ERROR [stage-1 5/8] COPY server/ .
failed to compute cache key: "/server" not found
```

**Solution :**
```bash
# Vérifier que vous êtes dans le bon répertoire
pwd  # ou cd sur Windows
# Doit afficher : C:\Gemini\terrain_claude_code

# Vérifier que le dossier server existe
ls server/  # ou dir server\ sur Windows
```

---

### Problème : Login Docker Hub échoue

**Erreur :**
```
Error response from daemon: Get "https://registry-1.docker.io/v2/": unauthorized
```

**Solution :**
```bash
# Vérifier vos identifiants
docker login

# Username: eloli (pas votre email)
# Password: votre_mot_de_passe

# Si toujours des erreurs, réinitialiser le mot de passe :
# https://hub.docker.com/reset-password
```

---

### Problème : Push échoue

**Erreur :**
```
denied: requested access to the resource is denied
```

**Solutions :**
```bash
# 1. Vérifier le nom d'utilisateur dans le tag
docker images
# L'image doit être : eloli/gestion_site_arc:tag
# Pas : gestion_site_arc:tag

# 2. Vérifier que vous êtes connecté
docker login

# 3. Retag l'image si nécessaire
docker tag gestion_site_arc:latest eloli/gestion_site_arc:latest
docker push eloli/gestion_site_arc:latest
```

---

### Problème : L'image est trop grosse

**Vérifier la taille :**
```bash
docker images eloli/gestion_site_arc:latest
# Taille normale : 100-200 MB
# Trop gros : > 500 MB
```

**Solution :**
```bash
# Vérifier le .dockerignore
cat .dockerignore

# Doit contenir :
# node_modules
# .git
# *.md
# etc.

# Rebuild avec .dockerignore
docker build -t eloli/gestion_site_arc:latest .
```

---

### Problème : Health check échoue dans Coolify

**Dans Coolify logs :**
```
Health check failed
```

**Solution :**

```bash
# 1. Vérifier que le endpoint /health existe
# Dans server/server.js, ligne ~91 :
app.get('/health', async (req, res) => { ... })

# 2. Vérifier les logs de l'application
Coolify → Application → Logs

# 3. Vérifier les variables d'environnement
Coolify → Application → Environment Variables
# DB_HOST, DB_PASSWORD, etc. doivent être corrects

# 4. Vérifier la connexion à la base de données
Coolify → Database → Test Connection
```

---

## Commandes utiles

### Gestion des images locales

```bash
# Lister toutes les images
docker images

# Supprimer une image
docker rmi eloli/gestion_site_arc:v1.0.0

# Supprimer toutes les images inutilisées
docker image prune -a

# Voir l'historique d'une image
docker history eloli/gestion_site_arc:latest
```

### Gestion des conteneurs locaux

```bash
# Lister les conteneurs en cours
docker ps

# Lister tous les conteneurs
docker ps -a

# Arrêter un conteneur
docker stop <container-id>

# Supprimer un conteneur
docker rm <container-id>

# Voir les logs d'un conteneur
docker logs <container-id>

# Entrer dans un conteneur
docker exec -it <container-id> sh
```

### Nettoyage complet

```bash
# Supprimer tout (images, conteneurs, volumes, cache)
docker system prune -a --volumes

# Libère beaucoup d'espace disque
```

---

## Checklist complète

### Avant le build

- [ ] Docker Desktop installé et démarré
- [ ] Compte Docker Hub créé (username: eloli)
- [ ] Code testé localement (`npm start`)
- [ ] Dockerfile et .dockerignore présents
- [ ] Variables d'environnement listées

### Build et push

- [ ] `docker build` réussi
- [ ] Image taguée correctement
- [ ] Test local OK (optionnel)
- [ ] `docker login` réussi
- [ ] `docker push` réussi
- [ ] Image visible sur Docker Hub

### Déploiement Coolify

- [ ] Coolify installé sur le serveur
- [ ] DNS configuré vers le serveur
- [ ] Projet créé dans Coolify
- [ ] Base de données créée
- [ ] Application créée (type Docker Image)
- [ ] Variables d'environnement configurées
- [ ] Domaine et SSL configurés
- [ ] Volumes (uploads/logs) configurés
- [ ] Déploiement lancé
- [ ] Health check OK
- [ ] Site accessible en HTTPS
- [ ] Schéma de base de données importé
- [ ] Tests fonctionnels OK

---

## Résumé rapide

### Commandes essentielles

```bash
# 1. Build
docker build -t eloli/gestion_site_arc:v1.0.0 .

# 2. Tag latest
docker tag eloli/gestion_site_arc:v1.0.0 eloli/gestion_site_arc:latest

# 3. Login
docker login

# 4. Push
docker push eloli/gestion_site_arc:v1.0.0
docker push eloli/gestion_site_arc:latest

# 5. Utiliser dans Coolify
Image: eloli/gestion_site_arc:latest
```

**Temps total : 10-15 minutes**

---

**Guide terminé !** 🚀

Votre image Docker est maintenant prête à être déployée sur `eloli/gestion_site_arc` !

---

*Dernière mise à jour : 2025-01-15*
