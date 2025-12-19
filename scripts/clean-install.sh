#!/bin/bash

###############################################################################
# Script de nettoyage complet pour installation propre
# ATTENTION : Ce script SUPPRIME TOUTES LES DONNÉES de l'application !
# Usage: ./scripts/clean-install.sh
###############################################################################

set -e  # Arrêter en cas d'erreur

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  ⚠️  NETTOYAGE COMPLET - INSTALLATION PROPRE                    ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "⚠️  ATTENTION : Ce script va :"
echo "   - Arrêter tous les conteneurs de l'application"
echo "   - Supprimer TOUTES les données (base de données, uploads, logs)"
echo "   - Supprimer tous les volumes Docker"
echo ""
echo "❌ Cette opération est IRRÉVERSIBLE !"
echo ""
read -p "Voulez-vous continuer ? (tapez 'OUI' en majuscules pour confirmer) : " CONFIRM

if [ "$CONFIRM" != "OUI" ]; then
    echo "❌ Opération annulée."
    exit 1
fi

echo ""
echo "🔍 Recherche des conteneurs et volumes..."
echo ""

# Fonction pour afficher avec couleur
print_step() {
    echo ""
    echo "▶ $1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Étape 1 : Arrêter les conteneurs
print_step "Étape 1/4 : Arrêt des conteneurs"

if [ -f "docker-compose.coolify.yml" ]; then
    echo "Arrêt via docker-compose..."
    docker-compose -f docker-compose.coolify.yml down || echo "⚠️  Aucun conteneur à arrêter"
else
    echo "⚠️  docker-compose.coolify.yml non trouvé, arrêt manuel..."

    # Arrêter les conteneurs individuellement
    docker ps -a --filter "name=tirallarc" --format "{{.ID}}" | while read container_id; do
        if [ ! -z "$container_id" ]; then
            echo "   Arrêt du conteneur $container_id..."
            docker stop "$container_id" || true
            docker rm "$container_id" || true
        fi
    done
fi

echo "✅ Conteneurs arrêtés"

# Étape 2 : Supprimer les volumes
print_step "Étape 2/4 : Suppression des volumes"

VOLUMES=$(docker volume ls --filter "name=tirallarc" --filter "name=postgres_data_prod" --filter "name=app_uploads_prod" --filter "name=app_logs_prod" --filter "name=app_backups_prod" --format "{{.Name}}")

if [ -z "$VOLUMES" ]; then
    echo "ℹ️  Aucun volume trouvé"
else
    echo "Volumes trouvés :"
    echo "$VOLUMES"
    echo ""

    for volume in $VOLUMES; do
        echo "   Suppression de $volume..."
        docker volume rm "$volume" || echo "⚠️  Impossible de supprimer $volume (peut être en cours d'utilisation)"
    done
fi

echo "✅ Volumes supprimés"

# Étape 3 : Nettoyer les ressources orphelines
print_step "Étape 3/4 : Nettoyage des ressources orphelines"

echo "   Suppression des volumes orphelins..."
docker volume prune -f

echo "   Suppression des réseaux orphelins..."
docker network prune -f

echo "   Suppression des images non utilisées..."
docker image prune -f

echo "✅ Nettoyage terminé"

# Étape 4 : Vérification
print_step "Étape 4/4 : Vérification"

REMAINING_VOLUMES=$(docker volume ls --filter "name=tirallarc" --format "{{.Name}}")

if [ -z "$REMAINING_VOLUMES" ]; then
    echo "✅ Aucun volume résiduel"
else
    echo "⚠️  Volumes résiduels détectés :"
    echo "$REMAINING_VOLUMES"
    echo ""
    echo "Essayez de les supprimer manuellement avec :"
    for vol in $REMAINING_VOLUMES; do
        echo "   docker volume rm $vol"
    done
fi

# Résumé final
echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  ✅ NETTOYAGE TERMINÉ                                            ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Prochaines étapes :"
echo "   1. Dans Coolify, cliquez sur 'Deploy' pour redéployer"
echo "   2. Attendez que le serveur démarre (vérifier les logs)"
echo "   3. Exécutez : docker exec <container-id> node server/scripts/init-db.js"
echo "   4. Accédez à https://tiralarc.srv759477.hstgr.cloud/"
echo "   5. Connectez-vous avec admin / changez-moi-en-production"
echo ""
echo "📖 Consultez FRESH_INSTALL.md pour le guide complet"
echo ""
