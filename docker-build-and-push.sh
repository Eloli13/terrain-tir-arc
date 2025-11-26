#!/bin/bash

# ============================================
# Script de build et push Docker
# Pour : Gestion Site Tir à l'Arc
# Docker Hub : eloli/gestion_site_arc
# ============================================

set -e  # Arrêter en cas d'erreur

# Configuration
DOCKER_USERNAME="eloli"
IMAGE_NAME="gestion_site_arc"
FULL_IMAGE_NAME="${DOCKER_USERNAME}/${IMAGE_NAME}"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction d'affichage
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    print_error "Docker n'est pas installé. Veuillez installer Docker Desktop."
    exit 1
fi

# Vérifier que Docker est démarré
if ! docker info &> /dev/null; then
    print_error "Docker n'est pas démarré. Veuillez démarrer Docker Desktop."
    exit 1
fi

print_success "Docker est installé et démarré"

# Demander le tag (version)
echo ""
print_info "Entrez le tag pour cette version (ex: v1.0.0, latest, dev) :"
read -p "Tag: " TAG

if [ -z "$TAG" ]; then
    print_warning "Aucun tag fourni, utilisation de 'latest'"
    TAG="latest"
fi

print_info "Tag sélectionné : ${TAG}"

# Confirmation
echo ""
print_warning "Vous allez build et push : ${FULL_IMAGE_NAME}:${TAG}"
read -p "Continuer ? (y/n) : " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Opération annulée"
    exit 1
fi

# Build de l'image
echo ""
print_info "🔨 Build de l'image Docker..."
docker build -t ${FULL_IMAGE_NAME}:${TAG} .

if [ $? -eq 0 ]; then
    print_success "Image construite avec succès"
else
    print_error "Échec du build"
    exit 1
fi

# Tag également en latest si ce n'est pas déjà le cas
if [ "$TAG" != "latest" ]; then
    print_info "Tag de l'image également en 'latest'..."
    docker tag ${FULL_IMAGE_NAME}:${TAG} ${FULL_IMAGE_NAME}:latest
    print_success "Image taguée en latest"
fi

# Afficher la taille de l'image
IMAGE_SIZE=$(docker images ${FULL_IMAGE_NAME}:${TAG} --format "{{.Size}}")
print_info "Taille de l'image : ${IMAGE_SIZE}"

# Test local optionnel
echo ""
read -p "Voulez-vous tester l'image localement avant de push ? (y/n) : " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "🧪 Test de l'image en local sur le port 3000..."
    print_warning "L'application démarrera sans base de données (normal pour ce test)"
    print_info "Appuyez sur Ctrl+C pour arrêter le test"
    docker run --rm -p 3000:3000 -e NODE_ENV=production ${FULL_IMAGE_NAME}:${TAG}
fi

# Login Docker Hub
echo ""
print_info "🔐 Connexion à Docker Hub..."
docker login

if [ $? -ne 0 ]; then
    print_error "Échec de la connexion à Docker Hub"
    exit 1
fi

print_success "Connecté à Docker Hub"

# Push de l'image
echo ""
print_info "📤 Push de l'image vers Docker Hub..."
docker push ${FULL_IMAGE_NAME}:${TAG}

if [ $? -eq 0 ]; then
    print_success "Image poussée avec succès : ${FULL_IMAGE_NAME}:${TAG}"
else
    print_error "Échec du push"
    exit 1
fi

# Push latest également si applicable
if [ "$TAG" != "latest" ]; then
    print_info "📤 Push de la version 'latest'..."
    docker push ${FULL_IMAGE_NAME}:latest

    if [ $? -eq 0 ]; then
        print_success "Image latest poussée avec succès"
    fi
fi

# Résumé final
echo ""
echo "=========================================="
print_success "🎉 Déploiement terminé avec succès !"
echo "=========================================="
echo ""
print_info "Images disponibles :"
echo "  - ${FULL_IMAGE_NAME}:${TAG}"
if [ "$TAG" != "latest" ]; then
    echo "  - ${FULL_IMAGE_NAME}:latest"
fi
echo ""
print_info "Lien Docker Hub :"
echo "  https://hub.docker.com/r/${DOCKER_USERNAME}/${IMAGE_NAME}"
echo ""
print_info "Pour utiliser dans Coolify :"
echo "  Image: ${FULL_IMAGE_NAME}:${TAG}"
echo ""
print_info "Pour tester localement :"
echo "  docker run -p 3000:3000 -e NODE_ENV=production ${FULL_IMAGE_NAME}:${TAG}"
echo ""
