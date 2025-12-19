const { Pool } = require('pg');
const logger = require('../utils/logger');

class DatabaseManager {
    constructor() {
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'terrain_tir_arc',
            user: process.env.DB_USER || 'tir_arc_user',
            password: process.env.DB_PASSWORD,
            // SSL désactivé pour connexions Docker internes (sécurisé car réseau isolé)
            // Pour activer SSL (ex: DB externe), définir DB_SSL=true
            ssl: process.env.DB_SSL === 'true' ? {
                rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
            } : false,
            max: 20, // Maximum de connexions dans le pool
            idleTimeoutMillis: 30000, // Fermer les connexions inactives après 30s
            connectionTimeoutMillis: 2000, // Timeout de connexion 2s
        };

        process.stderr.write(`[DATABASE] Config: host=${dbConfig.host}, port=${dbConfig.port}, database=${dbConfig.database}, user=${dbConfig.user}, ssl=${dbConfig.ssl}\n`);

        this.pool = new Pool(dbConfig);

        this.pool.on('error', (err) => {
            logger.error('Erreur inattendue sur une connexion de base de données inactive', err);
            process.exit(-1);
        });
    }

    async init() {
        try {
            // Tester la connexion
            process.stderr.write('[DATABASE] DEBUG: Tentative de connexion au pool...\n');
            const client = await this.pool.connect();
            process.stderr.write('[DATABASE] DEBUG: Client connecté au pool avec succès\n');
            logger.info('Connexion à la base de données établie');

            // Créer les tables si elles n'existent pas
            await this.createTables(client);

            // Créer les index de performance
            await this.createPerformanceIndexes(client);

            client.release();
        } catch (error) {
            logger.error('Impossible de se connecter à la base de données:', error);
            throw error;
        }
    }

    async createTables(client) {
        const createTablesSQL = `
            -- Extension pour UUID
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
            CREATE EXTENSION IF NOT EXISTS "pgcrypto";

            -- Table des utilisateurs administrateurs
            CREATE TABLE IF NOT EXISTS admin_users (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                salt VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT true,
                must_change_password BOOLEAN DEFAULT false,
                last_login TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                login_attempts INTEGER DEFAULT 0,
                locked_until TIMESTAMP WITH TIME ZONE
            );

            -- Table des sessions de tir
            CREATE TABLE IF NOT EXISTS sessions (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                nom VARCHAR(100) NOT NULL,
                prenom VARCHAR(100) NOT NULL,
                type_tireur VARCHAR(50) NOT NULL CHECK (type_tireur IN ('club', 'autre_club', 'service_sports')),
                nombre_tireurs INTEGER NOT NULL CHECK (nombre_tireurs > 0),
                terrain VARCHAR(20) NOT NULL CHECK (terrain IN ('interieur', 'exterieur')),
                date_debut TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                date_fin TIMESTAMP WITH TIME ZONE,
                active BOOLEAN DEFAULT true,
                created_by UUID REFERENCES admin_users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Table des incidents
            CREATE TABLE IF NOT EXISTS incidents (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                type_incident VARCHAR(100) NOT NULL,
                description TEXT NOT NULL,
                photo_path VARCHAR(500),
                terrain VARCHAR(20) NOT NULL CHECK (terrain IN ('interieur', 'exterieur')),
                date_incident TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                statut VARCHAR(20) DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'en_cours', 'resolu')),
                treatment_notes TEXT,
                resolution_notes TEXT,
                date_resolution TIMESTAMP WITH TIME ZONE,
                created_by UUID REFERENCES admin_users(id),
                resolved_by UUID REFERENCES admin_users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Table de configuration
            CREATE TABLE IF NOT EXISTS configuration (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                key VARCHAR(100) UNIQUE NOT NULL,
                value TEXT NOT NULL,
                description TEXT,
                is_encrypted BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Table des logs d'audit
            CREATE TABLE IF NOT EXISTS audit_logs (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                user_id UUID REFERENCES admin_users(id),
                action VARCHAR(100) NOT NULL,
                resource VARCHAR(100) NOT NULL,
                resource_id UUID,
                old_values JSONB,
                new_values JSONB,
                ip_address INET,
                user_agent TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Table des refresh tokens
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
                token_hash VARCHAR(255) NOT NULL,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                revoked BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Index pour les performances
            CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(active);
            CREATE INDEX IF NOT EXISTS idx_sessions_terrain ON sessions(terrain);
            CREATE INDEX IF NOT EXISTS idx_sessions_date_debut ON sessions(date_debut);
            CREATE INDEX IF NOT EXISTS idx_incidents_statut ON incidents(statut);
            CREATE INDEX IF NOT EXISTS idx_incidents_terrain ON incidents(terrain);
            CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents(date_incident);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

            -- Fonction de trigger pour updated_at
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';

            -- Triggers pour updated_at
            DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
            CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

            DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
            CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

            DROP TRIGGER IF EXISTS update_incidents_updated_at ON incidents;
            CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

            DROP TRIGGER IF EXISTS update_configuration_updated_at ON configuration;
            CREATE TRIGGER update_configuration_updated_at BEFORE UPDATE ON configuration
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `;

        await client.query(createTablesSQL);
        logger.info('Tables de base de données créées/vérifiées');

        // Insérer la configuration par défaut
        await this.insertDefaultConfiguration(client);

        // Créer le compte admin par défaut si n'existe pas
        await this.createDefaultAdmin(client);
    }

    async insertDefaultConfiguration(client) {
        const defaultConfigs = [
            {
                key: 'telephone_responsable',
                value: '0123456789',
                description: 'Numéro de téléphone du responsable'
            },
            {
                key: 'email_incidents',
                value: 'incidents@club-tir-arc.fr',
                description: 'Email pour les notifications d\'incidents'
            },
            {
                key: 'qr_code_data',
                value: 'TERRAIN_TIR_ARC_ACCESS',
                description: 'Données du QR Code d\'accès'
            },
            {
                key: 'max_sessions_per_terrain',
                value: '10',
                description: 'Nombre maximum de sessions simultanées par terrain'
            }
        ];

        for (const config of defaultConfigs) {
            await client.query(`
                INSERT INTO configuration (key, value, description)
                VALUES ($1, $2, $3)
                ON CONFLICT (key) DO NOTHING
            `, [config.key, config.value, config.description]);
        }
    }

    async createDefaultAdmin(client) {
        const bcrypt = require('bcrypt');
        const crypto = require('crypto');

        // Vérifier si un admin existe déjà
        const existingAdmin = await client.query(`
            SELECT COUNT(*) as count FROM admin_users
        `);

        if (parseInt(existingAdmin.rows[0].count) === 0) {
            // Créer le compte admin par défaut
            const username = 'admin';
            const password = 'changez-moi-en-production';
            const email = 'admin@localhost';

            // Utiliser la même méthode de hashage que authManager
            const salt = crypto.randomBytes(16).toString('hex');
            const saltedPassword = password + salt; // Important: ajouter le salt avant le hash
            const passwordHash = await bcrypt.hash(saltedPassword, 12);

            await client.query(`
                INSERT INTO admin_users (username, email, password_hash, salt, must_change_password)
                VALUES ($1, $2, $3, $4, $5)
            `, [username, email, passwordHash, salt, true]);

            logger.info('Compte administrateur par défaut créé', {
                username,
                email,
                warning: 'CHANGEZ LE MOT DE PASSE EN PRODUCTION !'
            });

            logger.warn('SÉCURITÉ: Compte admin par défaut créé avec mot de passe faible !', {
                username: 'admin',
                action: 'Changez immédiatement ce mot de passe via /api/v1/auth/change-password'
            });
        }
    }

    async createPerformanceIndexes(client) {
        const indexesSQL = `
            -- Index pour incidents
            CREATE INDEX IF NOT EXISTS idx_incidents_statut ON incidents(statut);
            CREATE INDEX IF NOT EXISTS idx_incidents_terrain ON incidents(terrain);
            CREATE INDEX IF NOT EXISTS idx_incidents_date_desc ON incidents(date_incident DESC);
            CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(type_incident);
            CREATE INDEX IF NOT EXISTS idx_incidents_terrain_statut_date ON incidents(terrain, statut, date_incident DESC);
            CREATE INDEX IF NOT EXISTS idx_incidents_created_by ON incidents(created_by) WHERE created_by IS NOT NULL;

            -- Index pour sessions
            CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(active) WHERE active = true;
            CREATE INDEX IF NOT EXISTS idx_sessions_date_desc ON sessions(date_debut DESC);
            CREATE INDEX IF NOT EXISTS idx_sessions_terrain ON sessions(terrain);
            CREATE INDEX IF NOT EXISTS idx_sessions_type_tireur ON sessions(type_tireur);
            CREATE INDEX IF NOT EXISTS idx_sessions_active_terrain ON sessions(terrain, active) WHERE active = true;

            -- Index pour audit_logs
            CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date ON audit_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;
            CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource, resource_id) WHERE resource_id IS NOT NULL;
            CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_desc ON audit_logs(created_at DESC);

            -- Index pour refresh_tokens
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_expires ON refresh_tokens(user_id, expires_at) WHERE revoked = false;
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at) WHERE revoked = false;

            -- Index pour admin_users
            CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active) WHERE is_active = true;

            -- Analyser les tables pour mettre à jour les statistiques
            ANALYZE incidents;
            ANALYZE sessions;
            ANALYZE audit_logs;
            ANALYZE refresh_tokens;
            ANALYZE admin_users;
        `;

        await client.query(indexesSQL);
        logger.info('Index de performance créés/vérifiés');
    }

    async query(text, params) {
        const start = Date.now();
        const client = await this.pool.connect();

        try {
            const result = await client.query(text, params);
            const duration = Date.now() - start;

            logger.debug('Requête SQL exécutée', {
                query: text,
                duration: duration + 'ms',
                rows: result.rowCount
            });

            return result;
        } catch (error) {
            logger.error('Erreur lors de l\'exécution de la requête SQL', {
                query: text,
                params: params,
                error: error.message
            });
            throw error;
        } finally {
            client.release();
        }
    }

    async transaction(callback) {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Transaction annulée', { error: error.message });
            throw error;
        } finally {
            client.release();
        }
    }

    async close() {
        await this.pool.end();
        logger.info('Pool de connexions fermé');
    }
}

module.exports = new DatabaseManager();