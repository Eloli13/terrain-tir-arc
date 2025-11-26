-- ============================================
-- Base de données PostgreSQL
-- Gestion des terrains de tir à l'arc
-- ============================================

-- Table des sessions de tir
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    type_tireur VARCHAR(50) NOT NULL, -- 'club', 'autre_club', 'service_sports'
    nombre_tireurs INTEGER NOT NULL,
    terrain VARCHAR(20) NOT NULL, -- 'interieur' ou 'exterieur'
    date_debut TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_fin TIMESTAMP NULL,
    active BOOLEAN DEFAULT true,
    created_by INTEGER NULL -- Référence à admin_users.id (NULL si créé par utilisateur public)
);

-- Table des incidents
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    type_incident VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    photo_path VARCHAR(255) NULL,
    terrain VARCHAR(20) NOT NULL,
    date_incident TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    statut VARCHAR(50) DEFAULT 'en_attente', -- 'en_attente', 'en_cours', 'resolu'
    resolution_notes TEXT NULL,
    date_resolution TIMESTAMP NULL,
    created_by INTEGER NULL, -- Référence à admin_users.id (NULL si créé par utilisateur public)
    resolved_by INTEGER NULL -- Référence à admin_users.id (admin qui a résolu l'incident)
);

-- Table des administrateurs
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alias pour compatibilité (DROP IF EXISTS puis CREATE pour éviter les erreurs)
DROP VIEW IF EXISTS admins;
CREATE VIEW admins AS SELECT * FROM admin_users;

-- Table de configuration
CREATE TABLE IF NOT EXISTS configuration (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT NULL
);

-- Insertion du compte admin par défaut
-- Mot de passe : changez-moi-en-production
INSERT INTO admin_users (username, password_hash, email) VALUES
('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LRwDYGPvN4EHLwJVi', 'admin@localhost')
ON CONFLICT (username) DO NOTHING;

-- Insertion des valeurs de configuration par défaut
INSERT INTO configuration (key, value, description) VALUES
('telephone_responsable', '0123456789', 'Numéro de téléphone du responsable du club'),
('email_incidents', 'incidents@localhost', 'Email pour recevoir les signalements d''incidents'),
('qr_code_data', 'http://localhost', 'Données contenues dans le QR code')
ON CONFLICT (key) DO NOTHING;

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date_debut);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(active);
CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents(date_incident);
CREATE INDEX IF NOT EXISTS idx_incidents_statut ON incidents(statut);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);

-- Commentaires sur les tables
COMMENT ON TABLE sessions IS 'Sessions de tir à l''arc';
COMMENT ON TABLE incidents IS 'Incidents signalés sur les terrains';
COMMENT ON TABLE admin_users IS 'Comptes administrateurs';
COMMENT ON TABLE configuration IS 'Configuration de l''application';

-- Commentaires sur les colonnes
COMMENT ON COLUMN sessions.type_tireur IS 'Type de tireur: club, autre_club, service_sports';
COMMENT ON COLUMN sessions.terrain IS 'Terrain: interieur ou exterieur';
COMMENT ON COLUMN sessions.active IS 'Session en cours (true) ou terminée (false)';
COMMENT ON COLUMN incidents.statut IS 'Statut: en_attente, en_cours, resolu';
