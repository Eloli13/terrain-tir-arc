-- ============================================
-- Script d'ajout d'index de performance
-- Base de données: terrain_tir_arc
-- Date: 2025-01-18
-- ============================================

-- Ce script ajoute des index pour optimiser les requêtes fréquentes
-- sur les tables principales de l'application

BEGIN;

-- ============================================
-- INDEX POUR TABLE INCIDENTS
-- ============================================

-- Index pour filtrer par statut (requêtes admin)
-- Utilisé dans: GET /api/incidents?statut=en_attente
CREATE INDEX IF NOT EXISTS idx_incidents_statut
ON incidents(statut);

-- Index pour filtrer par terrain
-- Utilisé dans: GET /api/incidents?terrain=interieur
CREATE INDEX IF NOT EXISTS idx_incidents_terrain
ON incidents(terrain);

-- Index pour trier par date (ordre chronologique inversé)
-- Utilisé dans: GET /api/incidents ORDER BY date_incident DESC
CREATE INDEX IF NOT EXISTS idx_incidents_date_desc
ON incidents(date_incident DESC);

-- Index pour filtrer par type d'incident
-- Utilisé dans: GET /api/incidents?type=degradation
CREATE INDEX IF NOT EXISTS idx_incidents_type
ON incidents(type_incident);

-- Index composite pour requêtes complexes (terrain + statut + date)
-- Optimise: SELECT * FROM incidents WHERE terrain='interieur' AND statut='en_attente' ORDER BY date_incident DESC
CREATE INDEX IF NOT EXISTS idx_incidents_terrain_statut_date
ON incidents(terrain, statut, date_incident DESC);

-- Index pour recherche par créateur
-- Utilisé dans: SELECT * FROM incidents WHERE created_by = $1
CREATE INDEX IF NOT EXISTS idx_incidents_created_by
ON incidents(created_by) WHERE created_by IS NOT NULL;

-- ============================================
-- INDEX POUR TABLE SESSIONS
-- ============================================

-- Index pour filtrer les sessions actives (requête très fréquente)
-- Utilisé dans: GET /api/sessions/active
CREATE INDEX IF NOT EXISTS idx_sessions_active
ON sessions(active) WHERE active = true;

-- Index pour trier par date de session
-- Utilisé dans: GET /api/sessions ORDER BY date_session DESC
CREATE INDEX IF NOT EXISTS idx_sessions_date_desc
ON sessions(date_session DESC);

-- Index pour filtrer par terrain
-- Utilisé dans: GET /api/sessions?terrain=interieur
CREATE INDEX IF NOT EXISTS idx_sessions_terrain
ON sessions(terrain);

-- Index pour filtrer par type de tireur
-- Utilisé dans: GET /api/sessions?type_tireur=adulte
CREATE INDEX IF NOT EXISTS idx_sessions_type_tireur
ON sessions(type_tireur);

-- Index composite pour sessions actives par terrain
-- Optimise: SELECT * FROM sessions WHERE active=true AND terrain='interieur'
CREATE INDEX IF NOT EXISTS idx_sessions_active_terrain
ON sessions(terrain, active) WHERE active = true;

-- Index pour recherche par nom de tireur (pour autocomplétion)
-- Utilisé dans: SELECT DISTINCT nom_tireur FROM sessions WHERE nom_tireur LIKE 'Jo%'
CREATE INDEX IF NOT EXISTS idx_sessions_nom_tireur
ON sessions(nom_tireur text_pattern_ops);

-- ============================================
-- INDEX POUR TABLE AUDIT_LOGS
-- ============================================

-- Index pour récupérer les logs par utilisateur
-- Utilisé dans: SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date
ON audit_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- Index pour récupérer les logs par ressource
-- Utilisé dans: SELECT * FROM audit_logs WHERE resource = 'INCIDENT' AND resource_id = $1
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
ON audit_logs(resource, resource_id) WHERE resource_id IS NOT NULL;

-- Index pour filtrer par action
-- Utilisé dans: SELECT * FROM audit_logs WHERE action = 'DELETE'
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
ON audit_logs(action);

-- Index pour trier par date (logs récents)
-- Utilisé dans: SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_desc
ON audit_logs(created_at DESC);

-- ============================================
-- INDEX POUR TABLE REFRESH_TOKENS
-- ============================================

-- Index pour recherche par user_id et expiration
-- Utilisé dans: SELECT * FROM refresh_tokens WHERE user_id=$1 AND expires_at>NOW() AND revoked=false
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_expires
ON refresh_tokens(user_id, expires_at) WHERE revoked = false;

-- Index pour nettoyage des tokens expirés
-- Utilisé dans: DELETE FROM refresh_tokens WHERE expires_at < NOW()
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
ON refresh_tokens(expires_at) WHERE revoked = false;

-- ============================================
-- INDEX POUR TABLE ADMIN_USERS
-- ============================================

-- Index unique pour recherche par email (déjà créé par UNIQUE, mais explicite)
-- Pas besoin de créer si colonne déjà UNIQUE

-- Index pour filtrer les utilisateurs actifs
-- Utilisé dans: SELECT * FROM admin_users WHERE is_active = true
CREATE INDEX IF NOT EXISTS idx_admin_users_active
ON admin_users(is_active) WHERE is_active = true;

-- Index pour recherche par username (déjà UNIQUE normalement)
-- Pas besoin si colonne username est UNIQUE

-- ============================================
-- INDEX POUR TABLE CONFIGURATION
-- ============================================

-- La colonne 'key' devrait déjà avoir un index UNIQUE
-- Pas besoin d'index supplémentaires car très petite table

-- ============================================
-- ANALYSE DES TABLES APRÈS INDEX
-- ============================================

-- Mettre à jour les statistiques PostgreSQL pour optimiser le query planner
ANALYZE incidents;
ANALYZE sessions;
ANALYZE audit_logs;
ANALYZE refresh_tokens;
ANALYZE admin_users;

COMMIT;

-- ============================================
-- VÉRIFICATION DES INDEX
-- ============================================

-- Afficher tous les index créés
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================
-- STATISTIQUES D'UTILISATION DES INDEX (optionnel)
-- ============================================

-- Pour vérifier si les index sont utilisés après quelques jours
-- SELECT
--     schemaname,
--     tablename,
--     indexname,
--     idx_scan as index_scans,
--     idx_tup_read as tuples_read,
--     idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- ============================================
-- NOTES
-- ============================================

-- 1. Ces index améliorent les performances des requêtes SELECT
-- 2. Ils ralentissent légèrement les INSERT/UPDATE/DELETE
-- 3. Dans cette application, les lectures sont plus fréquentes que les écritures
-- 4. Pour de grosses tables (>100k lignes), considérer le partitionnement
-- 5. Monitorer l'utilisation des index avec pg_stat_user_indexes
-- 6. Supprimer les index non utilisés après analyse
