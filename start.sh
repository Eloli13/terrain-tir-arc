#!/bin/sh

echo "=========================================="
echo "Démarrage de l'application TirArc"
echo "=========================================="

# Vérifier les variables d'environnement critiques
if [ -z "$DB_HOST" ]; then
    echo "WARNING: DB_HOST n'est pas défini"
fi

if [ -z "$JWT_SECRET" ]; then
    echo "WARNING: JWT_SECRET n'est pas défini"
fi

echo "Environment: ${NODE_ENV:-production}"
echo "Port Backend: ${PORT:-3000}"
echo "DB Host: ${DB_HOST:-non défini}"
echo ""

# Démarrer Nginx en arrière-plan
echo "Démarrage de Nginx..."
nginx -t
if [ $? -eq 0 ]; then
    nginx
    echo "✓ Nginx démarré sur le port 80"
else
    echo "✗ Erreur de configuration Nginx"
    exit 1
fi

# Attendre que Nginx soit prêt
sleep 2

# Démarrer l'application Node.js
echo ""
echo "Démarrage du backend Node.js..."
cd /app

# Utiliser le wrapper qui force l'affichage des erreurs
# Rediriger stderr vers stdout ET forcer unbuffered output
su-exec nodejs node --unhandled-rejections=strict start-wrapper.js 2>&1

# Si on arrive ici, Node.js a crashé
EXIT_CODE=$?
echo ""
echo "✗ ERREUR: Le backend Node.js s'est arrêté avec le code $EXIT_CODE"
echo "Vérifiez les variables d'environnement dans Coolify"
exit $EXIT_CODE
