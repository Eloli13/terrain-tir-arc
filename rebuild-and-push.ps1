# Script rapide de rebuild et push
# Pour corriger les problemes et redéployer rapidement

$DOCKER_USERNAME = "eloli"
$IMAGE_NAME = "gestion_site_arc"
$TAG = "latest"
$FULL_IMAGE = "${DOCKER_USERNAME}/${IMAGE_NAME}:${TAG}"

Write-Host "Rebuild et push de l'image Docker..." -ForegroundColor Cyan
Write-Host "Image: $FULL_IMAGE" -ForegroundColor Yellow
Write-Host ""

# Build
Write-Host "1. Build de l'image..." -ForegroundColor Cyan
docker build -t $FULL_IMAGE .

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR: Echec du build" -ForegroundColor Red
    exit 1
}

Write-Host "SUCCESS: Image construite" -ForegroundColor Green
Write-Host ""

# Push
Write-Host "2. Push vers Docker Hub..." -ForegroundColor Cyan
docker push $FULL_IMAGE

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR: Echec du push" -ForegroundColor Red
    Write-Host "Verifiez que vous etes connecte: docker login" -ForegroundColor Yellow
    exit 1
}

Write-Host "SUCCESS: Image poussee vers Docker Hub" -ForegroundColor Green
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Image prete: $FULL_IMAGE" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Dans Coolify:" -ForegroundColor Cyan
Write-Host "  1. Aller dans votre application"
Write-Host "  2. Cliquer sur 'Redeploy'"
Write-Host "  3. Attendre 2-3 minutes"
Write-Host ""
