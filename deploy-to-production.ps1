# Script de Déploiement en Production
# Terrain Tir à l'Arc - srv759477.hstgr.cloud

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Déploiement Production - Terrain Tir à l'Arc             ║" -ForegroundColor Cyan
Write-Host "║  Serveur: srv759477.hstgr.cloud                           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Vérifications préalables
Write-Host "🔍 Vérifications préalables..." -ForegroundColor Yellow
Write-Host ""

# 1. Vérifier Git
Write-Host "1. Vérification de Git..." -NoNewline
try {
    $gitVersion = git --version 2>$null
    if ($gitVersion) {
        Write-Host " ✅ $gitVersion" -ForegroundColor Green
    } else {
        Write-Host " ❌ Git non installé" -ForegroundColor Red
        Write-Host "   Installer Git: https://git-scm.com/download/win"
        exit 1
    }
} catch {
    Write-Host " ❌ Erreur lors de la vérification de Git" -ForegroundColor Red
    exit 1
}

# 2. Vérifier Node.js
Write-Host "2. Vérification de Node.js..." -NoNewline
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host " ✅ $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host " ❌ Node.js non installé" -ForegroundColor Red
        Write-Host "   Installer Node.js: https://nodejs.org/"
        exit 1
    }
} catch {
    Write-Host " ❌ Erreur lors de la vérification de Node.js" -ForegroundColor Red
    exit 1
}

# 3. Vérifier le Dockerfile
Write-Host "3. Vérification du Dockerfile..." -NoNewline
if (Test-Path "Dockerfile") {
    Write-Host " ✅ Présent" -ForegroundColor Green
} else {
    Write-Host " ❌ Dockerfile manquant" -ForegroundColor Red
    exit 1
}

# 4. Vérifier le fichier des secrets
Write-Host "4. Vérification du fichier SECRETS_PRODUCTION.txt..." -NoNewline
if (Test-Path "SECRETS_PRODUCTION.txt") {
    Write-Host " ✅ Présent" -ForegroundColor Green
} else {
    Write-Host " ❌ Fichier des secrets manquant" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Demander confirmation
Write-Host "⚠️  ATTENTION: Ce script va:" -ForegroundColor Yellow
Write-Host "   1. Initialiser un dépôt Git (si pas déjà fait)"
Write-Host "   2. Commiter tous les fichiers"
Write-Host "   3. Vous guider pour pousser vers GitHub/GitLab"
Write-Host ""
$confirmation = Read-Host "Continuer? (o/n)"
if ($confirmation -ne "o" -and $confirmation -ne "O") {
    Write-Host "❌ Déploiement annulé" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Étape 1: Initialiser Git
Write-Host "📦 Étape 1: Configuration Git" -ForegroundColor Cyan
Write-Host ""

if (Test-Path ".git") {
    Write-Host "✅ Dépôt Git déjà initialisé" -ForegroundColor Green
} else {
    Write-Host "Initialisation du dépôt Git..." -NoNewline
    git init
    Write-Host " ✅" -ForegroundColor Green
}

# Vérifier le .gitignore
Write-Host "Vérification du .gitignore..." -NoNewline
if (-not (Test-Path ".gitignore")) {
    Write-Host " ⚠️  .gitignore manquant, création..." -ForegroundColor Yellow
    @"
# Fichiers sensibles
.env
.env.local
.env.production
.env.*.local
SECRETS_PRODUCTION.txt

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
"@ | Out-File -FilePath ".gitignore" -Encoding UTF8
    Write-Host " ✅" -ForegroundColor Green
} else {
    Write-Host " ✅" -ForegroundColor Green
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Étape 2: Commit
Write-Host "📝 Étape 2: Commit des fichiers" -ForegroundColor Cyan
Write-Host ""

Write-Host "Ajout des fichiers..." -NoNewline
git add .
Write-Host " ✅" -ForegroundColor Green

Write-Host "Création du commit..." -NoNewline
$commitMessage = "Production ready - Déploiement initial"
git commit -m $commitMessage 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✅" -ForegroundColor Green
} else {
    Write-Host " ⚠️  Rien à commiter ou déjà commité" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Étape 3: Configuration du remote
Write-Host "🌐 Étape 3: Configuration du dépôt distant" -ForegroundColor Cyan
Write-Host ""

$hasRemote = git remote 2>$null
if ($hasRemote) {
    Write-Host "✅ Remote Git déjà configuré:" -ForegroundColor Green
    git remote -v
} else {
    Write-Host "⚠️  Aucun remote configuré" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Créez un nouveau dépôt sur GitHub ou GitLab, puis entrez l'URL:"
    Write-Host "Exemple GitHub: https://github.com/votre-username/terrain-tir-arc.git"
    Write-Host "Exemple GitLab: https://gitlab.com/votre-username/terrain-tir-arc.git"
    Write-Host ""
    $remoteUrl = Read-Host "URL du dépôt distant"

    if ($remoteUrl) {
        Write-Host "Ajout du remote..." -NoNewline
        git remote add origin $remoteUrl
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host "❌ URL non fournie" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Étape 4: Push
Write-Host "🚀 Étape 4: Push vers le dépôt distant" -ForegroundColor Cyan
Write-Host ""

Write-Host "Pushing vers origin main..." -NoNewline
git branch -M main 2>$null
$pushResult = git push -u origin main 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✅" -ForegroundColor Green
} else {
    Write-Host " ⚠️  " -ForegroundColor Yellow
    Write-Host $pushResult
    Write-Host ""
    Write-Host "Si l'authentification échoue, configurez un token GitHub/GitLab"
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Étape 5: Instructions Coolify
Write-Host "🎯 Étape 5: Configuration Coolify" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Prochaines étapes à effectuer dans Coolify:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Connectez-vous à Coolify: https://srv759477.hstgr.cloud"
Write-Host ""
Write-Host "2. Créer un nouveau projet:"
Write-Host "   - Nom: Terrain Tir Arc"
Write-Host ""
Write-Host "3. Ajouter une application:"
Write-Host "   - Type: Dockerfile"
Write-Host "   - Source: GitHub/GitLab"
Write-Host "   - Dépôt:" (git remote get-url origin 2>$null)
Write-Host "   - Branche: main"
Write-Host ""
Write-Host "4. Configurer PostgreSQL:"
Write-Host "   - Créer une nouvelle base de données"
Write-Host "   - Version: PostgreSQL 15"
Write-Host "   - Nom: terrain-tir-arc-db"
Write-Host ""
Write-Host "5. Variables d'environnement:"
Write-Host "   - Ouvrir: SECRETS_PRODUCTION.txt"
Write-Host "   - Copier toutes les variables dans Coolify"
Write-Host "   - Settings → Environment Variables"
Write-Host ""
Write-Host "6. Configuration des ports:"
Write-Host "   - Port: 3000"
Write-Host "   - Protocole: HTTP (Traefik gère HTTPS)"
Write-Host "   - Domaine: istres.srv759477.hstgr.cloud"
Write-Host ""
Write-Host "7. Déployer:"
Write-Host "   - Cliquer sur 'Deploy'"
Write-Host "   - Attendre la construction (5-10 min)"
Write-Host ""
Write-Host "8. Configuration DNS (Hostinger):"
Write-Host "   - Type A: tirallarc → IP du serveur"
Write-Host "   - CNAME: www.tirallarc → istres.srv759477.hstgr.cloud"
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Étape 6: Afficher le fichier des secrets
Write-Host "🔐 Étape 6: Secrets de production" -ForegroundColor Cyan
Write-Host ""

$openSecrets = Read-Host "Ouvrir le fichier SECRETS_PRODUCTION.txt? (o/n)"
if ($openSecrets -eq "o" -or $openSecrets -eq "O") {
    if (Test-Path "SECRETS_PRODUCTION.txt") {
        notepad "SECRETS_PRODUCTION.txt"
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Récapitulatif
Write-Host "✅ RÉCAPITULATIF" -ForegroundColor Green
Write-Host ""
Write-Host "État actuel:"
Write-Host "  ✅ Code commité dans Git"
Write-Host "  ✅ Prêt pour le push"
Write-Host "  ✅ Secrets générés"
Write-Host "  ✅ Documentation disponible"
Write-Host ""
Write-Host "Prochaines actions:"
Write-Host "  1. Configurer Coolify (voir instructions ci-dessus)"
Write-Host "  2. Copier les variables depuis SECRETS_PRODUCTION.txt"
Write-Host "  3. Déployer l'application"
Write-Host "  4. Configurer le DNS"
Write-Host "  5. Tester l'application"
Write-Host "  6. CHANGER LE MOT DE PASSE ADMIN"
Write-Host ""
Write-Host "Documentation:"
Write-Host "  📘 DEPLOIEMENT_PRODUCTION.md - Guide complet"
Write-Host "  🔒 SECRETS_PRODUCTION.txt - Variables d'environnement"
Write-Host "  🌐 CONFIGURATION_DNS.md - Configuration DNS"
Write-Host ""
Write-Host "⚠️  IMPORTANT: Sauvegardez SECRETS_PRODUCTION.txt dans un gestionnaire" -ForegroundColor Yellow
Write-Host "   de mots de passe, puis supprimez-le de votre ordinateur !" -ForegroundColor Yellow
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 Bonne chance pour le déploiement !" -ForegroundColor Green
Write-Host ""

# Pause finale
Read-Host "Appuyez sur Entrée pour terminer"
