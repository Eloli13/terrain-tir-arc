-- Script pour mettre à jour le type ENUM type_tireur
-- Exécuter avec : psql -U tir_arc_user -d terrain_tir_arc -f update-type-tireur.sql

BEGIN;

-- 1. Changer temporairement le type de la colonne vers VARCHAR
ALTER TABLE sessions ALTER COLUMN type_tireur TYPE VARCHAR(50);

-- 2. Mettre à jour les données existantes si nécessaire (mapping ancien -> nouveau)
-- Si vous aviez des données avec 'debutant', 'intermediaire', etc., les convertir
UPDATE sessions SET type_tireur = 'club' WHERE type_tireur = 'debutant';
UPDATE sessions SET type_tireur = 'club' WHERE type_tireur = 'intermediaire';
UPDATE sessions SET type_tireur = 'club' WHERE type_tireur = 'avance';
UPDATE sessions SET type_tireur = 'club' WHERE type_tireur = 'competition';

-- 3. Supprimer l'ancien type ENUM
DROP TYPE IF EXISTS type_tireur_enum;

-- 4. Créer le nouveau type ENUM
CREATE TYPE type_tireur_enum AS ENUM ('club', 'autre_club', 'service_sports');

-- 5. Remettre la colonne avec le bon type
ALTER TABLE sessions
ALTER COLUMN type_tireur TYPE type_tireur_enum
USING type_tireur::type_tireur_enum;

-- 6. Afficher les types disponibles
SELECT unnest(enum_range(NULL::type_tireur_enum)) AS valeurs_possibles;

COMMIT;

-- Message de confirmation
SELECT 'Type tireur_enum mis à jour avec succès!' AS status;
