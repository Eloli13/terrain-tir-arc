# Règles et Contraintes du Projet

> **Documentation des contraintes techniques et des règles de développement pour ce projet**

## 🐳 Environnement de Développement

### Développement Local - Docker OBLIGATOIRE

**⚠️ RÈGLE STRICTE : Le lancement en local s'effectue UNIQUEMENT avec Docker Desktop**

- **Pas d'installation native** : Node.js, PostgreSQL, ou autres dépendances ne doivent PAS être installées directement sur la machine de développement
- **Docker Desktop requis** : Tous les développeurs doivent avoir Docker Desktop installé et démarré
- **Commandes Docker standard** : Utiliser uniquement `docker-compose` pour gérer l'application
- **Environnement isolé** : Garantit la cohérence entre tous les environnements de développement

### Raisons de cette contrainte

1. **Reproductibilité** : Environnement identique pour tous les développeurs
2. **Isolation** : Pas de conflits avec les installations locales
3. **Versions contrôlées** : Node.js, PostgreSQL et toutes les dépendances sont versionnées dans Docker
4. **Configuration automatique** : Base de données, variables d'environnement, tout est préconfiguré
5. **Similitude avec production** : L'environnement local est identique à la production (Coolify)

## 📦 Conteneurs Docker

### Conteneurs démarrés en local

1. **tirallarc-app**
   - Application Node.js/Express
   - Port : 80
   - Health check : `/health`

2. **tirallarc-db**
   - PostgreSQL 15 Alpine
   - Port : 5432
   - Base : `terrain_tir_arc`
   - User : `tir_arc_user`

### Commandes Docker autorisées

```bash
# Démarrage
docker-compose up -d

# Vérifier l'état des conteneurs
docker-compose ps

# Voir les logs
docker-compose logs -f          # Tous les logs
docker-compose logs -f app      # Logs de l'application
docker-compose logs -f postgres # Logs PostgreSQL

# Rebuild et redémarrage
docker-compose up -d --build

# Redémarrer un service
docker-compose restart app

# Arrêt
docker-compose down

# Arrêt et suppression des volumes (reset complet)
docker-compose down -v

# Exécution de scripts dans les conteneurs
docker-compose exec app node scripts/[script-name].js
docker-compose exec postgres psql -U tir_arc_user -d terrain_tir_arc
```

## 🔐 Sécurité

### Credentials par défaut (UNIQUEMENT EN LOCAL)

- **Admin** : `admin` / `changez-moi-en-production`
- **Base de données** : Variables dans `.env`

**⚠️ Ces credentials doivent être changés en production**

### Encryption

- Mot de passe SMTP : AES-256-CBC
- Clé de chiffrement : `SESSION_SECRET` ou `ENCRYPTION_KEY` dans `.env`
- Format stocké : `iv:encrypted_data`

## 📁 Structure du Projet

### Documentation organisée

- **docs/** : Toute la documentation est organisée en 6 catégories
- **Index** : [docs/INDEX.md](../docs/INDEX.md) pour navigation complète
- **README.md** : Point d'entrée avec démarrage rapide

### Scripts importants

```
server/scripts/
├── setup-database.js       # Initialisation complète de la BDD
├── init-email-config.js    # Configuration email par défaut
├── migrate-data.js         # Migration de données
└── clear-active-sessions.sql  # Nettoyage sessions actives
```

## 🔄 Workflow de Développement

### 1. Démarrage d'une session de travail

```bash
# 1. Vérifier que Docker Desktop est démarré

# 2. Lancer l'application
docker-compose up -d

# 3. Vérifier que les conteneurs sont UP et healthy
docker-compose ps

# 4. Facultatif : voir les logs au démarrage
docker-compose logs -f
```

### 2. Développement

- Modifier le code dans `server/` ou les fichiers frontend
- L'application redémarre automatiquement (nodemon)
- Vérifier les logs : `docker-compose logs -f app`

### 3. Tests

```bash
# Tester les endpoints API
curl http://localhost/api/[endpoint]

# Se connecter à l'admin
http://localhost/admin/
```

### 4. Fin de session

```bash
# Arrêter les conteneurs (conserve les données)
docker-compose down

# Ou arrêter et nettoyer
docker-compose down -v  # Supprime aussi les volumes
```

## 🚫 Ce qu'il NE FAUT PAS faire

1. ❌ Installer Node.js localement pour ce projet
2. ❌ Installer PostgreSQL localement pour ce projet
3. ❌ Lancer le serveur avec `node server.js` directement
4. ❌ Utiliser `npm start` en dehors de Docker
5. ❌ Modifier les ports 80 et 5432 (réservés pour Docker)
6. ❌ Commit les credentials de production
7. ❌ Modifier `.claude/settings.local.json` sans raison valable

## ✅ Bonnes Pratiques

1. ✅ Toujours démarrer avec `docker-compose up -d`
2. ✅ Vérifier l'état des conteneurs avec `docker-compose ps`
3. ✅ Vérifier les logs avec `docker-compose logs -f`
4. ✅ Utiliser `docker-compose exec` pour exécuter des commandes dans les conteneurs
5. ✅ Commiter les changements de schéma de BDD dans `server/scripts/`
6. ✅ Documenter les nouvelles fonctionnalités dans `docs/`
7. ✅ Tester les endpoints API avec curl ou Postman
8. ✅ Vérifier que les conteneurs sont "healthy" avant de développer
9. ✅ Arrêter proprement avec `docker-compose down`

## 🔧 Déploiement

### Environnements

- **Local** : Docker Compose (`docker-compose up -d`)
- **Production** : Coolify (voir [docs/02-DEPLOIEMENT/](../docs/02-DEPLOIEMENT/))

### Configuration

- **Local** : `.env` dans `server/`
- **Production** : Variables d'environnement Coolify

## 📝 Notes Importantes

- Ce projet utilise PostgreSQL (pas SQLite, pas MySQL)
- JWT pour l'authentification (access + refresh tokens)
- Nodemailer pour les emails (configuration en BDD)
- Service Worker pour le mode offline de la PWA
- Bcrypt pour le hashing des mots de passe (12 rounds)

---

**Dernière mise à jour** : 2025-01-17
**Version du projet** : 1.0.0
