# ============================================
# Dockerfile complet pour Gestion Site Tir à l'Arc
# Backend Node.js + Frontend statique + Nginx
# Optimisé pour production avec Coolify
# ============================================

# ============================================
# Stage 1: Builder - Installation des dépendances backend
# ============================================
FROM node:20-alpine AS backend-builder

LABEL maintainer="eloli"
LABEL description="Application de gestion des terrains de tir à l'arc"
LABEL version="1.0.0"

WORKDIR /app

# Copier uniquement les fichiers package pour profiter du cache Docker
COPY server/package*.json ./

# Installer les dépendances de production uniquement
RUN npm ci --production --no-optional && \
    npm cache clean --force

# ============================================
# Stage 2: Image de production avec Nginx + Node.js
# ============================================
FROM node:20-alpine

# Installer Nginx et les outils nécessaires
RUN apk add --no-cache \
    nginx \
    dumb-init \
    curl \
    su-exec

# Créer un utilisateur non-root pour Node.js
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Créer les répertoires nécessaires
RUN mkdir -p /var/www/html \
    /app \
    /var/log/nginx \
    /var/lib/nginx/tmp \
    /run/nginx && \
    chown -R nginx:nginx /var/www/html /var/log/nginx /var/lib/nginx /run/nginx

WORKDIR /app

# ============================================
# Copier le backend Node.js
# ============================================

# Copier les dépendances depuis le builder
COPY --from=backend-builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copier le code source du backend
COPY --chown=nodejs:nodejs server/ .

# Créer les répertoires pour uploads et logs avec les bonnes permissions
RUN mkdir -p /app/uploads/incidents /app/logs && \
    chown -R nodejs:nodejs /app/uploads /app/logs && \
    chmod -R 755 /app/uploads /app/logs

# ============================================
# Copier le frontend statique
# ============================================

# Copier tous les fichiers HTML du frontend
COPY --chown=nginx:nginx index.html /var/www/html/
COPY --chown=nginx:nginx declaration.html /var/www/html/
COPY --chown=nginx:nginx incident.html /var/www/html/
COPY --chown=nginx:nginx manifest.json /var/www/html/
COPY --chown=nginx:nginx sw.js /var/www/html/

# Copier les dossiers CSS, JS, Images
COPY --chown=nginx:nginx css/ /var/www/html/css/
COPY --chown=nginx:nginx js/ /var/www/html/js/
COPY --chown=nginx:nginx images/ /var/www/html/images/

# Copier le dossier admin
COPY --chown=nginx:nginx admin/ /var/www/html/admin/

# Copier le fichier de configuration Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Copier le script de démarrage
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Copier le fichier health
COPY health /var/www/html/

# Variables d'environnement par défaut
ENV NODE_ENV=production \
    PORT=3000 \
    LOG_LEVEL=info

# Exposer le port 80 (Nginx)
# Le port 3000 (Node.js) reste interne
EXPOSE 80

# Volume pour les données persistantes
VOLUME ["/app/uploads", "/app/logs"]

# Health check sur Nginx
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Point d'entrée avec dumb-init pour gérer les signaux
ENTRYPOINT ["dumb-init", "--"]

# Commande de démarrage
CMD ["/start.sh"]