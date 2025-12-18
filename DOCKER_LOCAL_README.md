# 🐳 Développement Local avec Docker

## Démarrage Rapide

```bash
# Démarrer l'application (détaché)
docker-compose up -d

# Voir les logs en temps réel
docker-compose logs -f app

# Arrêter l'application
docker-compose down

# Redémarrer après modifications
docker-compose restart app
```

## Accès aux Services

- **Frontend**: http://localhost:3000
- **Admin**: http://localhost:3000/admin
- **API**: http://localhost:3000/api/v1/*
- **Health Check**: http://localhost:3000/health
- **PostgreSQL**: localhost:5432

## Connexion PostgreSQL

```bash
# Avec psql
psql -h localhost -p 5432 -U tir_arc_user -d terrain_tir_arc
# Password: dev_password_123

# Avec Docker
docker-compose exec postgres psql -U tir_arc_user -d terrain_tir_arc
```

## Configuration

Tous les secrets et variables d'environnement sont pré-configurés dans `docker-compose.yml`:
- JWT_SECRET, JWT_REFRESH_SECRET, SESSION_SECRET (64 caractères)
- ENCRYPTION_KEY (clé AES-256-GCM)
- DB_PASSWORD: `dev_password_123`
- LOG_LEVEL: `debug`
- RATE_LIMIT: 1000 requêtes/15min (vs 100 en prod)

**⚠️ Ces secrets sont UNIQUEMENT pour développement local. NE JAMAIS utiliser en production!**

## Hot Reload (Optionnel)

Pour activer le rechargement automatique lors des modifications de code:

1. Installer nodemon dans `server/`:
   ```bash
   cd server
   npm install --save-dev nodemon
   ```

2. Décommenter les volumes bind-mount dans `docker-compose.yml`:
   ```yaml
   # Décommenter ces lignes:
   - ./server:/app/server:ro
   - ./public:/app/public:ro
   ```

3. Modifier le CMD du Dockerfile pour utiliser nodemon (ou créer un Dockerfile.dev)

4. Redémarrer:
   ```bash
   docker-compose up -d --build
   ```

## Volumes Persistants

Les données suivantes sont persistées dans des volumes Docker:
- `postgres_data_dev`: Base de données PostgreSQL
- `app_uploads_dev`: Photos des incidents
- `app_logs_dev`: Logs de l'application

Pour réinitialiser complètement:
```bash
docker-compose down -v  # Supprime les volumes
docker-compose up -d    # Recrée tout
```

## Commandes Utiles

```bash
# Voir les conteneurs en cours
docker-compose ps

# Logs PostgreSQL
docker-compose logs -f postgres

# Logs Application
docker-compose logs -f app

# Entrer dans le conteneur app
docker-compose exec app sh

# Entrer dans PostgreSQL
docker-compose exec postgres sh

# Reconstruire l'image après modification du Dockerfile
docker-compose up -d --build

# Nettoyer complètement (conteneurs + volumes + images)
docker-compose down -v --rmi all
```

## Différences Dev vs Production

| Paramètre | Dev (docker-compose.yml) | Prod (Coolify) |
|-----------|--------------------------|----------------|
| NODE_ENV | development | production |
| LOG_LEVEL | debug | warn |
| RATE_LIMIT | 1000/15min | 100/15min |
| BCRYPT_ROUNDS | 10 | 12 |
| DB_PASSWORD | dev_password_123 | Secret fort |
| Secrets | Pré-configurés | Générés aléatoirement |
| Port PostgreSQL | Exposé (5432) | Interne uniquement |

## Résolution de Problèmes

### Le conteneur app redémarre en boucle
```bash
# Voir les logs détaillés
docker-compose logs app

# Vérifier le health check
docker-compose exec app node -e "require('http').get('http://localhost:3000/health', (r) => { r.on('data', d => console.log(d.toString())); })"
```

### PostgreSQL ne démarre pas
```bash
# Vérifier les logs
docker-compose logs postgres

# Réinitialiser le volume
docker-compose down -v
docker-compose up -d
```

### Port 3000 déjà utilisé
```bash
# Modifier le port dans docker-compose.yml
ports:
  - "3001:3000"  # Utiliser 3001 au lieu de 3000
```

## Notes de Sécurité

🔒 **IMPORTANT**:
- Ces configurations sont pour **développement local uniquement**
- Ne **JAMAIS** utiliser ces secrets en production
- Ne **JAMAIS** commiter les fichiers `.env.local` ou `.env.production`
- En production, utiliser `docker-compose.coolify.yml` avec secrets forts

## Documentation

- [COOLIFY_SETUP.md](COOLIFY_SETUP.md) - Déploiement production sur Coolify
- [MIGRATION_v1.0.3.md](MIGRATION_v1.0.3.md) - Guide de migration
- [CHANGELOG.md](CHANGELOG.md) - Historique des versions
