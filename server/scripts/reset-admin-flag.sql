-- Script pour réinitialiser le flag must_change_password de l'admin
-- Permet de tester la connexion sans être bloqué

-- Afficher l'état actuel
SELECT
    username,
    email,
    must_change_password,
    is_active,
    last_login
FROM admin_users
WHERE username = 'admin';

-- Réinitialiser le flag
UPDATE admin_users
SET must_change_password = false
WHERE username = 'admin';

-- Vérifier le changement
SELECT
    username,
    email,
    must_change_password,
    is_active
FROM admin_users
WHERE username = 'admin';
