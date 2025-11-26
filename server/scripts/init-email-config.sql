-- Script d'initialisation de la configuration email
-- À exécuter une seule fois pour ajouter les configurations par défaut

-- Insertion des configurations email avec des valeurs par défaut
INSERT INTO configuration (key, value, description, is_encrypted)
VALUES
    -- Configuration SMTP Gmail par défaut (désactivée)
    ('email_smtp_host', 'smtp.gmail.com', 'Serveur SMTP pour l''envoi d''emails', false),
    ('email_smtp_port', '587', 'Port SMTP (587 pour TLS, 465 pour SSL)', false),
    ('email_smtp_secure', 'false', 'Utiliser SSL (true) ou TLS (false)', false),
    ('email_smtp_user', '', 'Adresse email de l''expéditeur (compte Gmail)', false),
    ('email_smtp_password', '', 'Mot de passe d''application Gmail (chiffré)', true),

    -- Configuration de l'expéditeur
    ('email_from_name', 'Club Tir à l''Arc', 'Nom affiché comme expéditeur', false),
    ('email_from_address', '', 'Adresse email expéditeur', false),

    -- Configuration des destinataires
    ('email_incidents_to', '', 'Adresse email pour recevoir les notifications d''incidents', false),
    ('email_incidents_cc', '', 'Adresse email en copie (CC) - optionnel', false),

    -- Activation et statut
    ('email_enabled', 'false', 'Activer ou désactiver l''envoi d''emails', false),
    ('email_last_test_success', NULL, 'Date et heure du dernier test email réussi', false),
    ('email_last_send_success', NULL, 'Date et heure du dernier envoi email réussi', false)

ON CONFLICT (key) DO NOTHING; -- Ne pas écraser si déjà existant

-- Afficher un message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Configuration email initialisée avec succès !';
    RAISE NOTICE 'Pour configurer l''envoi d''emails :';
    RAISE NOTICE '1. Connectez-vous à l''interface d''administration';
    RAISE NOTICE '2. Allez dans l''onglet Configuration';
    RAISE NOTICE '3. Cliquez sur "Configurer l''envoi d''emails"';
    RAISE NOTICE '4. Remplissez les paramètres Gmail et testez la configuration';
END $$;
