-- Migration: Ajout de la colonne must_change_password
-- Version: 1.0.1
-- Date: 2025-12-04
-- Description: Ajoute la colonne must_change_password pour forcer le changement du mot de passe admin par défaut

-- Vérifier et ajouter la colonne si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'admin_users'
        AND column_name = 'must_change_password'
    ) THEN
        ALTER TABLE admin_users
        ADD COLUMN must_change_password BOOLEAN DEFAULT false;

        RAISE NOTICE 'Colonne must_change_password ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne must_change_password existe déjà';
    END IF;
END $$;

-- Créer un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_admin_users_must_change_password
ON admin_users(must_change_password)
WHERE must_change_password = true;

-- Afficher le résultat
SELECT
    username,
    email,
    must_change_password,
    is_active,
    last_login
FROM admin_users
ORDER BY created_at;
