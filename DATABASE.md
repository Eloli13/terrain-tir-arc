# 🗄️ Gestion de la Base de Données

Guide complet pour gérer la base de données PostgreSQL du projet Terrain de Tir à l'Arc.

## Table des matières

- [Initialisation](#initialisation)
- [Réinitialisation](#réinitialisation)
- [Problèmes courants](#problèmes-courants)
- [Déploiement Coolify](#déploiement-coolify)
- [Migrations](#migrations)
- [Backup et restauration](#backup-et-restauration)

---

## 🚀 Initialisation

### Première initialisation (nouvelle base de données)

```bash
# 1. Créer les tables et l'admin par défaut
npm run db:init

# Ou manuellement
node server/scripts/init-db.js
```

**Résultat** :
- ✅ Toutes les tables créées
- ✅ Indexes de performance créés
- ✅ Compte admin par défaut créé :
  - **Username**: `admin`
  - **Email**: `admin@localhost`
  - **Password**: `Admin123!Change`
  - ⚠️ **Changement de mot de passe obligatoire** au premier login

### Configurations par défaut créées

```
- telephone_responsable: 0601020304
- email_incidents: incidents@club-tir-arc.fr
- qr_code_data: https://votre-domaine.com
- max_sessions_per_terrain: 5
```

---

## 🔄 Réinitialisation

### Reset complet de la base de données

⚠️ **ATTENTION**: Cette opération **SUPPRIME TOUTES LES DONNÉES**.

```bash
# Avec confirmation interactive
npm run db:reset

# Sans confirmation (automatique)
npm run db:reset -- --force

# Ou manuellement
node server/scripts/reset-db.js
```

**Ce qui est supprimé** :
- ✅ Tous les comptes administrateurs
- ✅ Toutes les sessions de tir
- ✅ Tous les incidents
- ✅ Toutes les configurations
- ✅ Tous les logs d'audit
- ✅ Tous les tokens de session

**Tables conservées** (structure uniquement) :
- ✅ Schéma des tables intact
- ✅ Indexes de performance intacts
- ✅ Extensions PostgreSQL (uuid, pgcrypto)

### Réinitialisation + Initialisation

Pour repartir sur une base propre avec un admin par défaut :

```bash
# 1. Reset
npm run db:reset -- --force

# 2. Réinitialisation
npm run db:init
```

Ou en une seule commande :

```bash
# Script combiné (à créer)
npm run db:fresh
```

---

## 🐛 Problèmes courants

### Problème 1 : Données chiffrées corrompues

**Symptôme** :
```
Error: Échec du déchiffrement (Clé invalide ou données corrompues)
```

**Cause** :
- `ENCRYPTION_KEY` changée après avoir chiffré des données
- Utilisation du fallback `SESSION_SECRET` puis ajout de `ENCRYPTION_KEY`
- Base de dev utilisée avec des clés différentes

**Solution** :
```bash
# Option A - Supprimer uniquement les configurations chiffrées (SMTP)
psql -U $DB_USER -d $DB_NAME -c "DELETE FROM configuration WHERE is_encrypted = true;"

# Option B - Reset complet
npm run db:reset -- --force
npm run db:init
```

### Problème 2 : Schéma incompatible entre dev et prod

**Symptôme** :
```
ERROR: column "must_change_password" does not exist
```

**Cause** :
- DB de développement avec ancien schéma
- Migration non appliquée

**Solution** :
```bash
# Appliquer les migrations manuellement
psql -U $DB_USER -d $DB_NAME -f server/migrations/001_add_must_change_password.sql

# Ou reset complet
npm run db:reset -- --force
npm run db:init
```

### Problème 3 : Connexion refusée

**Symptôme** :
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Cause** :
- PostgreSQL n'est pas démarré
- Mauvaise configuration des variables d'environnement
- Firewall bloquant la connexion

**Solution** :
```bash
# Vérifier que PostgreSQL tourne
docker ps | grep postgres

# Vérifier les variables d'environnement
echo $DB_HOST
echo $DB_PORT
echo $DB_NAME
echo $DB_USER

# Tester la connexion manuellement
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1"
```

### Problème 4 : Droits insuffisants

**Symptôme** :
```
ERROR: permission denied to create extension "uuid-ossp"
```

**Solution** :
```sql
-- Connectez-vous en tant que superuser et exécutez :
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Puis donnez les droits à votre utilisateur
GRANT ALL PRIVILEGES ON DATABASE terrain_tir_arc TO tir_arc_user;
```

---

## 🚀 Déploiement Coolify

### Scénario 1 : Nouvelle installation Coolify

```bash
# 1. Créer une nouvelle base PostgreSQL dans Coolify
#    Coolify UI → New Resource → Database → PostgreSQL 15

# 2. Configurer les variables d'environnement dans Coolify
DB_HOST=postgres (nom du service)
DB_PORT=5432
DB_NAME=terrain_tir_arc
DB_USER=tir_arc_user
DB_PASSWORD=<généré_par_coolify>
ENCRYPTION_KEY=<générer avec: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# 3. Déployer l'application
#    Les tables seront créées automatiquement au démarrage

# 4. Initialiser l'admin par défaut (optionnel)
#    Coolify → Service → Console
docker exec -it <container_name> node server/scripts/init-db.js
```

### Scénario 2 : Reset DB en production Coolify

⚠️ **DANGER**: Toutes les données seront perdues!

```bash
# Option A - Via console Docker
docker exec -it <container_name> node server/scripts/reset-db.js --force
docker exec -it <container_name> node server/scripts/init-db.js

# Option B - Recréer la DB Coolify
# 1. Coolify → Database → Delete
# 2. Créer une nouvelle DB
# 3. Mettre à jour les credentials dans Environment Variables
# 4. Redéployer l'application
```

### Scénario 3 : Problème ENCRYPTION_KEY sur base existante

Si vous avez déployé **avant** la v1.0.4 sans `ENCRYPTION_KEY` :

```bash
# 1. Ajouter ENCRYPTION_KEY dans Coolify Environment Variables
ENCRYPTION_KEY=<générer_nouvelle_clé>

# 2. Supprimer les anciennes configs chiffrées
docker exec -it <container_name> psql -U $DB_USER -d $DB_NAME \
  -c "DELETE FROM configuration WHERE is_encrypted = true;"

# 3. Redéployer
# Les configs SMTP devront être ressaisies via l'interface admin
```

---

## 📦 Migrations

### Structure des migrations

```
server/migrations/
└── 001_add_must_change_password.sql
```

### Appliquer une migration manuellement

```bash
# Local
psql -U tir_arc_user -d terrain_tir_arc -f server/migrations/001_add_must_change_password.sql

# Coolify (via Docker)
docker exec -it <container_name> psql -U $DB_USER -d $DB_NAME \
  -f /app/server/migrations/001_add_must_change_password.sql
```

### Créer une nouvelle migration

```sql
-- server/migrations/002_description.sql
-- Migration: Description de la migration
-- Version: 1.x.x
-- Date: YYYY-MM-DD

-- Vérifier et ajouter des colonnes/tables
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'nom_table' AND column_name = 'nom_colonne'
    ) THEN
        ALTER TABLE nom_table ADD COLUMN nom_colonne TYPE;
        RAISE NOTICE 'Colonne nom_colonne ajoutée';
    ELSE
        RAISE NOTICE 'Colonne nom_colonne existe déjà';
    END IF;
END $$;
```

---

## 💾 Backup et restauration

### Backup manuel

```bash
# Local
pg_dump -U tir_arc_user terrain_tir_arc > backup_$(date +%Y%m%d_%H%M%S).sql

# Coolify (via Docker)
docker exec <postgres_container> pg_dump -U tir_arc_user terrain_tir_arc \
  > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restauration

```bash
# Local
psql -U tir_arc_user -d terrain_tir_arc < backup_20250101_120000.sql

# Coolify (via Docker)
cat backup_20250101_120000.sql | docker exec -i <postgres_container> \
  psql -U tir_arc_user -d terrain_tir_arc
```

### Backup automatique (docker-compose.prod.yml)

Le fichier `docker-compose.prod.yml` inclut un service de backup automatique :

```yaml
backup:
  # Backup quotidien à 3h00 du matin
  # Retention: 30 jours
  # Stocké dans: volume app_backups_prod
```

**Accéder aux backups** :

```bash
# Lister les backups
docker volume inspect app_backups_prod
docker run --rm -v app_backups_prod:/backups alpine ls -lh /backups

# Restaurer un backup
docker run --rm -v app_backups_prod:/backups alpine \
  cat /backups/db_20250101_030000.sql | \
  docker exec -i <postgres_container> psql -U tir_arc_user -d terrain_tir_arc
```

---

## 📊 Vérification de l'état de la DB

### Lister les tables

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

### Compter les données

```sql
-- Nombre d'admins
SELECT COUNT(*) FROM admin_users;

-- Nombre de sessions actives
SELECT COUNT(*) FROM sessions WHERE active = true;

-- Nombre d'incidents non résolus
SELECT COUNT(*) FROM incidents WHERE statut != 'resolu';

-- Configurations chiffrées
SELECT key, is_encrypted FROM configuration WHERE is_encrypted = true;
```

### Voir le schéma d'une table

```sql
\d admin_users
\d+ admin_users  -- Plus détaillé
```

### Vérifier les indexes

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public';
```

---

## 🔐 Sécurité

### Bonnes pratiques

✅ **À FAIRE** :
- Toujours utiliser des secrets forts générés via `node generate-secrets.js`
- Sauvegarder régulièrement la base de données
- Tester les restaurations sur un environnement de staging
- Garder `ENCRYPTION_KEY` cohérente entre déploiements
- Changer le mot de passe admin par défaut immédiatement

❌ **À NE PAS FAIRE** :
- Ne JAMAIS committer les fichiers `.env` ou backups SQL
- Ne PAS utiliser le même `ENCRYPTION_KEY` entre dev et prod
- Ne PAS réinitialiser la DB de production sans backup
- Ne PAS partager les credentials de DB en clair

---

## 📚 Ressources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pg (Node.js Driver)](https://node-postgres.com/)
- [Coolify Docs](https://coolify.io/docs)
- [CHANGELOG.md](CHANGELOG.md) - Historique des modifications DB
