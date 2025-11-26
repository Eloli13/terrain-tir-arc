  
  # Méthodes de Déploiement - Guide Complet

**Toutes les façons de déployer votre application sur un serveur**
**Date : 2025-01-15**

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Sans Git (transfert direct)](#sans-git-transfert-direct)
3. [Avec Git](#avec-git)
4. [Via FTP/SFTP](#via-ftpsftp)
5. [Via panneau de contrôle](#via-panneau-de-contrôle)
6. [Depuis un fichier ZIP/archive](#depuis-un-fichier-ziparchive)
7. [Docker Image](#docker-image)
8. [CI/CD automatisé](#cicd-automatisé)
9. [Comparaison des méthodes](#comparaison-des-méthodes)
10. [Recommandations par situation](#recommandations-par-situation)

---

## Vue d'ensemble

### Toutes les méthodes de déploiement

| Méthode | Git requis ? | Difficulté | Vitesse | Automatisation |
|---------|--------------|------------|---------|----------------|
| **SCP/SFTP** | ❌ Non | ⭐ Facile | ⚡⚡⚡ | ❌ Manuelle |
| **FTP/FileZilla** | ❌ Non | ⭐ Facile | ⚡⚡ | ❌ Manuelle |
| **ZIP Upload** | ❌ Non | ⭐ Facile | ⚡⚡ | ❌ Manuelle |
| **rsync** | ❌ Non | ⭐⭐ Moyen | ⚡⚡⚡ | ✅ Possible |
| **Git Push** | ✅ Oui | ⭐⭐ Moyen | ⚡⚡⚡ | ✅ Oui |
| **Git Clone** | ✅ Oui | ⭐⭐ Moyen | ⚡⚡⚡ | ⚠️ Partielle |
| **Docker Image** | ❌ Non | ⭐⭐⭐ Avancé | ⚡⚡⚡ | ✅ Oui |
| **Panneau Web** | ❌ Non | ⭐ Facile | ⚡⚡⚡ | ✅ Oui |
| **CI/CD** | ✅ Oui | ⭐⭐⭐ Avancé | ⚡⚡⚡⚡ | ✅ Total |

---

## Sans Git (transfert direct)

### Méthode 1 : SCP (Secure Copy) - **LA PLUS SIMPLE**

**Avantages :**
- ✅ Aucun Git requis
- ✅ Très rapide
- ✅ Sécurisé (SSH)
- ✅ Une seule commande

**De Windows vers Linux :**

```bash
# Depuis le terminal (PowerShell ou CMD)
cd C:\Gemini\terrain_claude_code

# Copier tout le projet vers le serveur
scp -r . user@51.210.100.50:/var/www/tirallarc/

# Avec un port SSH personnalisé
scp -P 2222 -r . user@51.210.100.50:/var/www/tirallarc/

# Exclure node_modules (recommandé)
scp -r --exclude='node_modules' --exclude='.git' . user@51.210.100.50:/var/www/tirallarc/
```

**De Linux/Mac vers Linux :**

```bash
# Même syntaxe
scp -r /chemin/local/terrain_claude_code user@51.210.100.50:/var/www/tirallarc/
```

**Mise à jour partielle :**

```bash
# Copier uniquement le dossier server
scp -r server/ user@51.210.100.50:/var/www/tirallarc/

# Copier un seul fichier
scp server/server.js user@51.210.100.50:/var/www/tirallarc/server/

# Copier les fichiers HTML du frontend
scp *.html user@51.210.100.50:/var/www/tirallarc/
```

**Après le transfert :**

```bash
# Se connecter au serveur
ssh user@51.210.100.50

# Aller dans le répertoire
cd /var/www/tirallarc/server

# Installer les dépendances
npm install --production

# Redémarrer l'application
pm2 restart tirallarc-backend
```

---

### Méthode 2 : SFTP avec FileZilla (interface graphique)

**Avantages :**
- ✅ Interface graphique (drag & drop)
- ✅ Aucun Git requis
- ✅ Facile pour les débutants
- ✅ Synchronisation possible

**Installation FileZilla :**

1. **Télécharger FileZilla Client** : https://filezilla-project.org/
2. **Installer** sur Windows/Mac/Linux

**Configuration de la connexion :**

```
Fichier → Gestionnaire de sites → Nouveau site

Nom : TirArc Istres
Hôte : 51.210.100.50
Protocole : SFTP - SSH File Transfer Protocol
Type d'authentification : Normale
Identifiant : user
Mot de passe : votre_mot_de_passe
Port : 22
```

**Transfert des fichiers :**

1. **Connecter** au serveur (clic sur "Connexion rapide")
2. **Naviguer** vers `/var/www/tirallarc/` (côté serveur)
3. **Glisser-déposer** les fichiers depuis votre PC vers le serveur
4. **Attendre** la fin du transfert

**Synchronisation :**

```
Clic droit sur le dossier distant → Synchroniser

Options :
☑ Télécharger uniquement les fichiers plus récents
☑ Comparer par taille et date
☑ Prévisualiser les changements

→ OK
```

**Après le transfert :**

Se connecter en SSH et redémarrer l'application (voir méthode SCP).

---

### Méthode 3 : rsync (synchronisation intelligente)

**Avantages :**
- ✅ Transfert uniquement des fichiers modifiés
- ✅ Très rapide après le premier transfert
- ✅ Préserve les permissions
- ✅ Scriptable

**Installation rsync (si non présent) :**

```bash
# Sur Windows (avec WSL ou Git Bash)
# rsync est inclus dans Git Bash

# Sur le serveur Linux (si absent)
sudo apt install rsync
```

**Commande de base :**

```bash
# Depuis votre machine locale
rsync -avz --progress C:/Gemini/terrain_claude_code/ user@51.210.100.50:/var/www/tirallarc/

# Explication des options :
# -a : archive (préserve permissions, dates, etc.)
# -v : verbose (affiche les détails)
# -z : compression pendant le transfert
# --progress : affiche la progression
```

**Exclure des fichiers :**

```bash
rsync -avz --progress \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='*.log' \
  --exclude='.env' \
  C:/Gemini/terrain_claude_code/ \
  user@51.210.100.50:/var/www/tirallarc/
```

**Mode dry-run (test sans transfert) :**

```bash
# Voir ce qui serait transféré
rsync -avz --dry-run --progress C:/Gemini/terrain_claude_code/ user@51.210.100.50:/var/www/tirallarc/
```

**Synchronisation bidirectionnelle :**

```bash
# Télécharger les modifications du serveur vers local
rsync -avz --progress user@51.210.100.50:/var/www/tirallarc/ C:/Gemini/terrain_claude_code/
```

**Script de déploiement automatisé :**

```bash
# Créer deploy.sh
cat > deploy.sh << 'EOF'
#!/bin/bash

echo "🚀 Déploiement de TirArc..."

# Synchronisation
rsync -avz --progress \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='*.log' \
  ./ user@51.210.100.50:/var/www/tirallarc/

# Commandes post-déploiement
ssh user@51.210.100.50 << 'ENDSSH'
cd /var/www/tirallarc/server
npm install --production
pm2 restart tirallarc-backend
echo "✅ Déploiement terminé !"
ENDSSH
EOF

# Rendre exécutable
chmod +x deploy.sh

# Utiliser
./deploy.sh
```

---

## Avec Git

### Méthode 4 : Git Clone (pull manuel)

**Avantages :**
- ✅ Historique Git préservé
- ✅ Facile à mettre à jour
- ✅ Rollback possible

**Prérequis :**
- Git installé sur le serveur
- Code hébergé sur GitHub/GitLab/Bitbucket

**Déploiement initial :**

```bash
# Se connecter au serveur
ssh user@51.210.100.50

# Installer Git (si absent)
sudo apt install git

# Cloner le dépôt
cd /var/www
git clone https://github.com/votre-user/terrain_claude_code.git tirallarc

# Ou avec authentification
git clone https://votre-token@github.com/votre-user/terrain_claude_code.git tirallarc

# Installer les dépendances
cd tirallarc/server
npm install --production

# Copier et configurer .env
cp .env.example .env
nano .env

# Démarrer l'application
pm2 start ecosystem.config.js
pm2 save
```

**Mise à jour :**

```bash
# Se connecter au serveur
ssh user@51.210.100.50

# Aller dans le répertoire
cd /var/www/tirallarc

# Récupérer les dernières modifications
git pull origin main

# Mettre à jour les dépendances
cd server
npm install --production

# Redémarrer l'application
pm2 restart tirallarc-backend
```

**Rollback (revenir en arrière) :**

```bash
# Voir l'historique
git log --oneline

# Revenir à un commit précédent
git checkout abc1234

# Ou réinitialiser
git reset --hard abc1234

# Redémarrer
pm2 restart tirallarc-backend
```

**Dépôt privé avec clé SSH :**

```bash
# Sur le serveur, générer une clé SSH
ssh-keygen -t ed25519 -C "serveur-tirallarc"

# Afficher la clé publique
cat ~/.ssh/id_ed25519.pub

# Copier cette clé et l'ajouter à GitHub :
# GitHub → Settings → SSH Keys → Add SSH Key

# Cloner avec SSH
git clone git@github.com:votre-user/terrain_claude_code.git tirallarc
```

---

### Méthode 5 : Git Push (déploiement automatique)

**Avec Dokku, Coolify, ou CapRover :**

```bash
# Sur votre machine locale
git remote add production dokku@51.210.100.50:tirallarc

# Déployer
git push production main

# Le serveur détecte automatiquement :
# - package.json → Node.js app
# - Installe les dépendances
# - Démarre l'application
# - Configure SSL
```

**Avec hook Git manuel :**

Sur le serveur :

```bash
# Créer un dépôt bare Git
mkdir -p /var/git/tirallarc.git
cd /var/git/tirallarc.git
git init --bare

# Créer un hook post-receive
nano hooks/post-receive
```

**Contenu du hook :**

```bash
#!/bin/bash

# Répertoire de déploiement
DEPLOY_DIR="/var/www/tirallarc"

echo "📦 Déploiement en cours..."

# Extraire les fichiers
git --work-tree=$DEPLOY_DIR --git-dir=/var/git/tirallarc.git checkout -f main

# Aller dans le répertoire
cd $DEPLOY_DIR/server

# Installer les dépendances
npm install --production

# Redémarrer l'application
pm2 restart tirallarc-backend

echo "✅ Déploiement terminé !"
```

**Rendre exécutable :**

```bash
chmod +x hooks/post-receive
```

**Sur votre machine locale :**

```bash
# Ajouter le remote
git remote add production user@51.210.100.50:/var/git/tirallarc.git

# Déployer
git push production main
```

---

## Via FTP/SFTP

### Méthode 6 : FTP classique (non recommandé)

**⚠️ Attention : FTP n'est pas sécurisé (mot de passe en clair)**

**Utiliser SFTP à la place (voir Méthode 2)**

Si vous devez absolument utiliser FTP :

```bash
# Installer serveur FTP sur le serveur
sudo apt install vsftpd

# Configurer
sudo nano /etc/vsftpd.conf

# Utiliser FileZilla avec protocole FTP
Hôte : ftp://51.210.100.50
Port : 21
Protocole : FTP
```

**Recommandation : Utilisez toujours SFTP (port 22) au lieu de FTP (port 21)**

---

## Via panneau de contrôle

### Méthode 7 : Coolify (Upload ZIP ou Git)

**Option 1 : Via Git (automatique)**

```
Coolify → Projects → Add New Project
Source : Git Repository
Repository : https://github.com/votre-user/terrain_claude_code
Branch : main
Deploy
```

**Option 2 : Upload direct (sans Git)**

Coolify supporte également Docker Compose et Dockerfile personnalisés :

```bash
# Créer un Dockerfile dans votre projet
cat > Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --production
COPY server/ .
CMD ["node", "server.js"]
EOF

# Zipper le projet
zip -r tirallarc.zip . -x "node_modules/*" ".git/*"

# Uploader via l'interface Coolify
Coolify → Projects → Upload Dockerfile
```

**Option 3 : Docker Registry**

```bash
# Construire l'image localement
docker build -t tirallarc:latest .

# Pousser vers Docker Hub
docker tag tirallarc:latest votre-user/tirallarc:latest
docker push votre-user/tirallarc:latest

# Déployer depuis Coolify
Coolify → Projects → Docker Image
Image : votre-user/tirallarc:latest
```

---

### Méthode 8 : Webmin/Virtualmin (Upload fichiers)

```
Webmin → File Manager
Navigate to : /var/www/tirallarc/
Upload Files : Sélectionner les fichiers
ou
Upload Zip : Sélectionner archive ZIP
Extract : Oui
```

---

## Depuis un fichier ZIP/archive

### Méthode 9 : Upload et extraction manuelle

**Sur votre machine locale :**

```bash
# Créer une archive (sans node_modules)
cd C:\Gemini\terrain_claude_code

# Windows (avec 7-Zip ou WinRAR)
7z a -tzip tirallarc.zip . -xr!node_modules -xr!.git

# Linux/Mac
tar -czf tirallarc.tar.gz --exclude='node_modules' --exclude='.git' .

# Ou ZIP
zip -r tirallarc.zip . -x "node_modules/*" ".git/*"
```

**Transfert vers le serveur :**

```bash
# Via SCP
scp tirallarc.zip user@51.210.100.50:/tmp/

# Via SFTP avec FileZilla
# Glisser-déposer tirallarc.zip vers /tmp/
```

**Sur le serveur :**

```bash
# Se connecter
ssh user@51.210.100.50

# Créer le répertoire de destination
sudo mkdir -p /var/www/tirallarc
sudo chown user:user /var/www/tirallarc

# Extraire l'archive
cd /var/www/tirallarc

# Si ZIP
unzip /tmp/tirallarc.zip

# Si TAR.GZ
tar -xzf /tmp/tirallarc.tar.gz

# Nettoyer
rm /tmp/tirallarc.zip

# Installer les dépendances
cd server
npm install --production

# Configurer et démarrer
cp .env.example .env
nano .env
pm2 start ecosystem.config.js
```

---

### Méthode 10 : Upload via interface web

**Avec Cockpit (interface d'administration Linux) :**

```bash
# Installer Cockpit sur le serveur
sudo apt install cockpit

# Accéder à l'interface
https://51.210.100.50:9090

# File Manager → Upload
Navigate to /var/www/tirallarc/
Upload files
```

---

## Docker Image

### Méthode 11 : Build et push vers registry

**Construire l'image localement :**

```bash
# Créer un Dockerfile optimisé
cat > Dockerfile << 'EOF'
FROM node:18-alpine AS builder
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --production

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY server/ .
COPY *.html ./frontend/
COPY css/ ./frontend/css/
COPY js/ ./frontend/js/
COPY images/ ./frontend/images/

EXPOSE 3000
CMD ["node", "server.js"]
EOF

# Construire l'image
docker build -t tirallarc:latest .

# Tester localement
docker run -p 3000:3000 tirallarc:latest
```

**Push vers Docker Hub :**

```bash
# Se connecter à Docker Hub
docker login

# Tag l'image
docker tag tirallarc:latest votre-user/tirallarc:latest

# Push
docker push votre-user/tirallarc:latest
```

**Sur le serveur :**

```bash
# Pull l'image
docker pull votre-user/tirallarc:latest

# Lancer le conteneur
docker run -d \
  --name tirallarc-backend \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=postgres \
  -v /var/www/tirallarc/uploads:/app/uploads \
  --restart unless-stopped \
  votre-user/tirallarc:latest
```

**Avec docker-compose.yml :**

```yaml
version: '3.8'

services:
  backend:
    image: votre-user/tirallarc:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped
```

```bash
# Déployer
docker-compose up -d
```

---

## CI/CD automatisé

### Méthode 12 : GitHub Actions

**Créer `.github/workflows/deploy.yml` :**

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Deploy to server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /var/www/tirallarc
          git pull origin main
          cd server
          npm install --production
          pm2 restart tirallarc-backend
```

**Configurer les secrets GitHub :**

```
GitHub Repository → Settings → Secrets → Actions

Ajouter :
- SERVER_HOST : 51.210.100.50
- SERVER_USER : user
- SSH_PRIVATE_KEY : (votre clé privée SSH)
```

Maintenant, chaque `git push` déclenche un déploiement automatique !

---

### Méthode 13 : GitLab CI/CD

**Créer `.gitlab-ci.yml` :**

```yaml
stages:
  - deploy

deploy_production:
  stage: deploy
  only:
    - main
  before_script:
    - 'command -v ssh-agent >/dev/null || ( apt-get update -y && apt-get install openssh-client -y )'
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh
    - chmod 700 ~/.ssh
  script:
    - ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_HOST "
        cd /var/www/tirallarc &&
        git pull origin main &&
        cd server &&
        npm install --production &&
        pm2 restart tirallarc-backend
      "
```

**Configurer les variables GitLab :**

```
GitLab Project → Settings → CI/CD → Variables

Ajouter :
- SERVER_HOST : 51.210.100.50
- SERVER_USER : user
- SSH_PRIVATE_KEY : (votre clé privée SSH)
```

---

## Comparaison des méthodes

### Par facilité d'utilisation

| Méthode | Difficulté | Temps | Automatisation |
|---------|------------|-------|----------------|
| **FileZilla (SFTP)** | ⭐ | 10 min | ❌ |
| **SCP** | ⭐ | 5 min | ⚠️ |
| **ZIP Upload** | ⭐ | 15 min | ❌ |
| **rsync** | ⭐⭐ | 5 min | ✅ |
| **Git Clone** | ⭐⭐ | 10 min | ⚠️ |
| **Coolify** | ⭐ | 5 min | ✅ |
| **Docker** | ⭐⭐⭐ | 20 min | ✅ |
| **CI/CD** | ⭐⭐⭐⭐ | 30 min | ✅✅ |

### Par vitesse de déploiement

| Méthode | Premier déploiement | Mises à jour |
|---------|---------------------|--------------|
| **SCP** | 5 min | 3 min |
| **rsync** | 5 min | 1 min ⚡ |
| **Git** | 10 min | 2 min |
| **SFTP** | 10 min | 5 min |
| **ZIP** | 15 min | 10 min |
| **Docker** | 20 min | 5 min |
| **Coolify** | 5 min | 2 min |
| **CI/CD** | 30 min | 30 sec ⚡⚡ |

### Par cas d'usage

| Cas d'usage | Méthode recommandée |
|-------------|---------------------|
| **Débutant sans Git** | FileZilla SFTP |
| **Développeur rapide** | SCP ou rsync |
| **Projet avec Git** | Git Clone ou CI/CD |
| **Multi-sites** | Coolify |
| **Production pro** | Docker + CI/CD |
| **One-shot simple** | ZIP Upload |
| **Mises à jour fréquentes** | rsync ou Git |

---

## Recommandations par situation

### Situation 1 : Vous n'utilisez pas Git

**✅ Recommandation : SCP ou rsync**

```bash
# Déploiement simple
scp -r . user@serveur:/var/www/tirallarc/

# Ou avec rsync (mieux pour les mises à jour)
rsync -avz --exclude='node_modules' . user@serveur:/var/www/tirallarc/
```

---

### Situation 2 : Vous utilisez Git

**✅ Recommandation : Git Clone + Script de mise à jour**

```bash
# Déploiement initial
ssh user@serveur
git clone https://github.com/you/projet.git /var/www/tirallarc

# Script de mise à jour (deploy.sh)
#!/bin/bash
cd /var/www/tirallarc
git pull origin main
cd server
npm install --production
pm2 restart tirallarc-backend
```

---

### Situation 3 : Vous voulez une interface graphique

**✅ Recommandation : FileZilla SFTP ou Coolify**

- **FileZilla** : Pour transfert manuel de fichiers
- **Coolify** : Pour déploiement automatisé avec interface

---

### Situation 4 : Vous gérez plusieurs sites

**✅ Recommandation : Coolify ou CapRover**

Déploiement en quelques clics pour chaque site.

---

### Situation 5 : Projet professionnel en équipe

**✅ Recommandation : Git + CI/CD (GitHub Actions ou GitLab CI)**

Déploiement automatique à chaque push, tests automatisés.

---

### Situation 6 : Budget serveur limité

**✅ Recommandation : Git Clone ou rsync (pas de panneau de contrôle)**

Économise ~500MB-1GB de RAM.

---

## Guide pratique : Déployer TirArc sans Git

### Scénario : Vous avez le code sur votre PC Windows, pas de Git

#### Étape 1 : Préparer l'archive

```bash
# Ouvrir PowerShell dans C:\Gemini\terrain_claude_code

# Créer un ZIP (avec PowerShell)
Compress-Archive -Path * -DestinationPath tirallarc.zip -Force
```

#### Étape 2 : Transférer vers le serveur

**Option A : Via SCP**

```bash
scp tirallarc.zip user@51.210.100.50:/tmp/
```

**Option B : Via FileZilla**

1. Ouvrir FileZilla
2. Connecter au serveur (SFTP, port 22)
3. Glisser-déposer `tirallarc.zip` vers `/tmp/`

#### Étape 3 : Sur le serveur

```bash
# Se connecter
ssh user@51.210.100.50

# Créer le répertoire
sudo mkdir -p /var/www/tirallarc
sudo chown $USER:$USER /var/www/tirallarc

# Extraire l'archive
cd /var/www/tirallarc
unzip /tmp/tirallarc.zip
rm /tmp/tirallarc.zip

# Installer dépendances backend
cd server
npm install --production

# Configurer
cp .env.example .env
nano .env
# (configurer les variables)

# Créer les répertoires
mkdir -p uploads/incidents logs

# Démarrer
pm2 start ecosystem.config.js
pm2 save
```

#### Étape 4 : Configurer Nginx

```bash
# Voir DEPLOIEMENT_LINUX.md pour la config Nginx complète
sudo nano /etc/nginx/sites-available/tirallarc
# (copier la configuration)

sudo ln -s /etc/nginx/sites-available/tirallarc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Étape 5 : SSL

```bash
sudo certbot --nginx -d tirallarc-istres.fr -d www.tirallarc-istres.fr
```

**C'est tout ! Votre site est déployé sans Git !** ✅

---

## Mises à jour sans Git

### Mise à jour complète

```bash
# Sur votre PC, créer nouveau ZIP
Compress-Archive -Path * -DestinationPath tirallarc-update.zip

# Transférer
scp tirallarc-update.zip user@51.210.100.50:/tmp/

# Sur le serveur
ssh user@51.210.100.50
cd /var/www/tirallarc
# Sauvegarder l'ancien
tar -czf ~/backup-$(date +%Y%m%d).tar.gz .
# Extraire la mise à jour
unzip -o /tmp/tirallarc-update.zip
cd server
npm install --production
pm2 restart tirallarc-backend
```

### Mise à jour d'un seul fichier

```bash
# Transférer juste le fichier modifié
scp server/server.js user@51.210.100.50:/var/www/tirallarc/server/

# Redémarrer
ssh user@51.210.100.50 "pm2 restart tirallarc-backend"
```

### Mise à jour avec rsync (recommandé)

```bash
# Synchroniser uniquement les fichiers modifiés
rsync -avz --exclude='node_modules' --exclude='.env' \
  C:/Gemini/terrain_claude_code/ \
  user@51.210.100.50:/var/www/tirallarc/

# Redémarrer
ssh user@51.210.100.50 "cd /var/www/tirallarc/server && npm install --production && pm2 restart tirallarc-backend"
```

---

## Checklist de déploiement

### Avant le déploiement

- [ ] Code testé localement
- [ ] Variables d'environnement préparées (`.env`)
- [ ] Base de données prête (schéma SQL)
- [ ] Domaine pointé vers le serveur
- [ ] Serveur accessible via SSH
- [ ] Node.js installé sur le serveur
- [ ] Nginx/PM2 configurés

### Choix de la méthode

- [ ] Avez-vous Git ? → Git Clone ou CI/CD
- [ ] Pas de Git ? → SCP, rsync, ou SFTP
- [ ] Multi-sites ? → Coolify
- [ ] Équipe ? → CI/CD

### Après le déploiement

- [ ] Application démarrée (PM2/Docker)
- [ ] Nginx configuré
- [ ] SSL actif (HTTPS)
- [ ] Base de données connectée
- [ ] Variables d'environnement configurées
- [ ] Uploads/logs configurés
- [ ] Test du site fonctionnel
- [ ] Sauvegardes configurées

---

## Conclusion

### 🎯 Recommandation finale

**Pour votre projet TirArc Istres :**

#### Si vous utilisez Git :
```
✅ Coolify (le plus simple)
✅ Git Clone + script de mise à jour
✅ CI/CD (le plus pro)
```

#### Si vous n'utilisez PAS Git :
```
✅ rsync (le plus efficace)
✅ SCP (le plus simple)
✅ FileZilla SFTP (interface graphique)
```

### Tableau récapitulatif

| Votre situation | Méthode #1 | Méthode #2 |
|----------------|-----------|-----------|
| 🎓 Débutant sans Git | **FileZilla** | **SCP** |
| 💻 Développeur avec Git | **Coolify** | **Git + CI/CD** |
| 🚀 Multi-sites | **Coolify** | **CapRover** |
| 💰 Budget RAM limité | **rsync** | **Git Clone** |
| 👥 Équipe | **CI/CD** | **Coolify** |

---

**Vous pouvez déployer votre application de multiples façons, avec ou sans Git !** 🚀

Le choix dépend de votre confort avec les outils et de vos besoins en automatisation.

---

**Guide réalisé avec succès !** 🎯

*Dernière mise à jour : 2025-01-15*
