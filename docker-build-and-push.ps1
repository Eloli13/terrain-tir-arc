# ============================================
# Script PowerShell de build et push Docker
# Pour : Gestion Site Tir a l'Arc
# Docker Hub : eloli/gestion_site_arc
# ============================================

# Configuration
$DOCKER_USERNAME = "eloli"
$IMAGE_NAME = "gestion_site_arc"
$FULL_IMAGE_NAME = "${DOCKER_USERNAME}/${IMAGE_NAME}"

# Couleurs pour l'affichage
function Write-InfoMessage {
    param([string]$Message)
    Write-Host "INFO: $Message" -ForegroundColor Cyan
}

function Write-SuccessMessage {
    param([string]$Message)
    Write-Host "SUCCESS: $Message" -ForegroundColor Green
}

function Write-WarningMessage {
    param([string]$Message)
    Write-Host "WARNING: $Message" -ForegroundColor Yellow
}

function Write-ErrorMessage {
    param([string]$Message)
    Write-Host "ERROR: $Message" -ForegroundColor Red
}

# Verifier que Docker est installe
Write-InfoMessage "Verification de Docker..."
try {
    $dockerVersion = docker --version
    Write-SuccessMessage "Docker est installe : $dockerVersion"
} catch {
    Write-ErrorMessage "Docker n'est pas installe. Veuillez installer Docker Desktop."
    exit 1
}

# Verifier que Docker est demarre
try {
    docker info | Out-Null
    Write-SuccessMessage "Docker est demarre"
} catch {
    Write-ErrorMessage "Docker n'est pas demarre. Veuillez demarrer Docker Desktop."
    exit 1
}

# Demander le tag (version)
Write-Host ""
Write-InfoMessage "Entrez le tag pour cette version (ex: v1.0.0, latest, dev) :"
$TAG = Read-Host "Tag"

if ([string]::IsNullOrWhiteSpace($TAG)) {
    Write-WarningMessage "Aucun tag fourni, utilisation de 'latest'"
    $TAG = "latest"
}

Write-InfoMessage "Tag selectionne : $TAG"

# Confirmation
Write-Host ""
Write-WarningMessage "Vous allez build et push : ${FULL_IMAGE_NAME}:${TAG}"
$confirmation = Read-Host "Continuer ? (y/n)"
if ($confirmation -ne "y" -and $confirmation -ne "Y") {
    Write-ErrorMessage "Operation annulee"
    exit 1
}

# Build de l'image
Write-Host ""
Write-InfoMessage "Build de l'image Docker..."
docker build -t "${FULL_IMAGE_NAME}:${TAG}" .

if ($LASTEXITCODE -eq 0) {
    Write-SuccessMessage "Image construite avec succes"
} else {
    Write-ErrorMessage "Echec du build"
    exit 1
}

# Tag egalement en latest si ce n'est pas deja le cas
if ($TAG -ne "latest") {
    Write-InfoMessage "Tag de l'image egalement en 'latest'..."
    docker tag "${FULL_IMAGE_NAME}:${TAG}" "${FULL_IMAGE_NAME}:latest"
    Write-SuccessMessage "Image taguee en latest"
}

# Afficher les informations de l'image
Write-Host ""
Write-InfoMessage "Informations de l'image :"
docker images "${FULL_IMAGE_NAME}:${TAG}"

# Test local optionnel
Write-Host ""
$testLocal = Read-Host "Voulez-vous tester l'image localement avant de push ? (y/n)"
if ($testLocal -eq "y" -or $testLocal -eq "Y") {
    Write-InfoMessage "Test de l'image en local sur le port 3000..."
    Write-WarningMessage "L'application demarrera sans base de donnees (normal pour ce test)"
    Write-InfoMessage "Appuyez sur Ctrl+C pour arreter le test"
    docker run --rm -p 3000:3000 -e NODE_ENV=production "${FULL_IMAGE_NAME}:${TAG}"
}

# Login Docker Hub
Write-Host ""
Write-InfoMessage "Connexion a Docker Hub..."
docker login

if ($LASTEXITCODE -ne 0) {
    Write-ErrorMessage "Echec de la connexion a Docker Hub"
    exit 1
}

Write-SuccessMessage "Connecte a Docker Hub"

# Push de l'image
Write-Host ""
Write-InfoMessage "Push de l'image vers Docker Hub..."
docker push "${FULL_IMAGE_NAME}:${TAG}"

if ($LASTEXITCODE -eq 0) {
    Write-SuccessMessage "Image poussee avec succes : ${FULL_IMAGE_NAME}:${TAG}"
} else {
    Write-ErrorMessage "Echec du push"
    exit 1
}

# Push latest egalement si applicable
if ($TAG -ne "latest") {
    Write-InfoMessage "Push de la version 'latest'..."
    docker push "${FULL_IMAGE_NAME}:latest"

    if ($LASTEXITCODE -eq 0) {
        Write-SuccessMessage "Image latest poussee avec succes"
    }
}

# Resume final
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-SuccessMessage "Deploiement termine avec succes !"
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-InfoMessage "Images disponibles :"
Write-Host "  - ${FULL_IMAGE_NAME}:${TAG}"
if ($TAG -ne "latest") {
    Write-Host "  - ${FULL_IMAGE_NAME}:latest"
}
Write-Host ""
Write-InfoMessage "Lien Docker Hub :"
Write-Host "  https://hub.docker.com/r/${DOCKER_USERNAME}/${IMAGE_NAME}"
Write-Host ""
Write-InfoMessage "Pour utiliser dans Coolify :"
Write-Host "  Image: ${FULL_IMAGE_NAME}:${TAG}"
Write-Host ""
Write-InfoMessage "Pour tester localement :"
Write-Host "  docker run -p 3000:3000 -e NODE_ENV=production ${FULL_IMAGE_NAME}:${TAG}"
Write-Host ""
Write-Host "Pour deployer dans Coolify :" -ForegroundColor Cyan
Write-Host "  1. Aller dans Coolify -> Projects -> TirArc Istres"
Write-Host "  2. Add Resource -> Application -> Docker Image"
Write-Host "  3. Image: ${FULL_IMAGE_NAME}:${TAG}"
Write-Host "  4. Port: 3000"
Write-Host "  5. Domain: tirallarc-istres.fr"
Write-Host "  6. Deploy"
Write-Host ""
