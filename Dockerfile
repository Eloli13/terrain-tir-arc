# ============================================
# Dockerfile simplifié pour Gestion Site Tir à l'Arc
# Backend Node.js + Frontend statique servi par Express
# Optimisé pour production avec Coolify (Architecture Coolify Native)
# ============================================

FROM node:20-alpine

LABEL maintainer="eloli"
LABEL description="Application de gestion des terrains de tir à l'arc"
LABEL version="1.0.3"

WORKDIR /app

# Installation des dépendances
COPY server/package*.json ./
RUN npm ci --production --no-optional && \
    npm cache clean --force

# Copie du code source du backend
COPY server/ ./server/

# Copie du frontend (dossier public à la racine du projet)
COPY public/ ./public/

# Création des dossiers pour les données
RUN mkdir -p uploads/incidents logs && \
    chown -R node:node /app

# Variables d'environnement par défaut
ENV NODE_ENV=production \
    PORT=3000 \
    LOG_LEVEL=info

# Exposer le port 3000 (Coolify gère le proxy HTTPS)
EXPOSE 3000

# Volume pour les données persistantes
VOLUME ["/app/uploads", "/app/logs"]

# Health check sur l'application Node.js
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Utiliser l'utilisateur non-root 'node' (fourni par l'image node:alpine)
USER node

# Démarrage direct de Node avec le wrapper pour capturer les erreurs
CMD ["node", "server/start-wrapper.js"]