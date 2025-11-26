#!/usr/bin/env node

/**
 * Script de configuration initiale de la base de données
 * Usage: node scripts/setup-database.js
 */

require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');
const { authManager } = require('../middleware/auth');

async function setupDatabase() {
    let client = null;

    try {
        console.log('🚀 Début de la configuration de la base de données...\n');

        // Connexion à PostgreSQL (base par défaut)
        const defaultClient = new Client({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
            database: 'postgres' // Base par défaut
        });

        await defaultClient.connect();
        console.log('✅ Connexion au serveur PostgreSQL établie');

        // Créer la base de données si elle n'existe pas
        const dbName = process.env.DB_NAME || 'terrain_tir_arc';

        try {
            await defaultClient.query(`CREATE DATABASE ${dbName}`);
            console.log(`✅ Base de données '${dbName}' créée`);
        } catch (error) {
            if (error.code === '42P04') {
                console.log(`ℹ️  Base de données '${dbName}' existe déjà`);
            } else {
                throw error;
            }
        }

        await defaultClient.end();

        // Connexion à la base de données cible
        client = new Client({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
            database: dbName
        });

        await client.connect();
        console.log(`✅ Connexion à la base de données '${dbName}' établie\n`);

        // Créer les extensions nécessaires
        console.log('📦 Installation des extensions PostgreSQL...');
        await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
        console.log('✅ Extensions installées\n');

        // Créer les tables
        console.log('🏗️  Création des tables...');
        await createTables(client);
        console.log('✅ Tables créées\n');

        // Insérer la configuration par défaut
        console.log('⚙️  Insertion de la configuration par défaut...');
        await insertDefaultConfiguration(client);
        console.log('✅ Configuration par défaut insérée\n');

        // Créer l'utilisateur administrateur par défaut
        console.log('👤 Création de l\'utilisateur administrateur...');
        await createDefaultAdmin(client);
        console.log('✅ Utilisateur administrateur créé\n');

        console.log('🎉 Configuration de la base de données terminée avec succès !');
        console.log('\n📋 Récapitulatif:');
        console.log(`   Base de données: ${dbName}`);
        console.log('   Tables: admin_users, sessions, incidents, configuration, audit_logs, refresh_tokens');
        console.log('   Utilisateur admin: admin');
        console.log('   Mot de passe: changez-moi-en-production');
        console.log('\n⚠️  IMPORTANT: Changez immédiatement le mot de passe administrateur en production !');

    } catch (error) {
        console.error('❌ Erreur lors de la configuration de la base de données:', error.message);
        logger.error('Erreur setup database:', error);
        process.exit(1);
    } finally {
        if (client) {
            await client.end();
        }
    }
}

async function createTables(client) {
    const createTablesSQL = `
        -- Table des utilisateurs administrateurs
        CREATE TABLE IF NOT EXISTS admin_users (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            salt VARCHAR(255) NOT NULL,
            is_active BOOLEAN DEFAULT true,
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
            type_tireur VARCHAR(50) NOT NULL CHECK (type_tireur IN ('debutant', 'intermediaire', 'avance', 'competition')),
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
            resource_id VARCHAR(255),
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
}

async function insertDefaultConfiguration(client) {
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
            ON CONFLICT (key) DO UPDATE SET
                value = EXCLUDED.value,
                description = EXCLUDED.description
        `, [config.key, config.value, config.description]);
    }
}

async function createDefaultAdmin(client) {
    const username = 'admin';
    const email = 'admin@club-tir-arc.fr';
    const password = 'changez-moi-en-production'; // Mot de passe temporaire

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await client.query(
        'SELECT id FROM admin_users WHERE username = $1 OR email = $2',
        [username, email]
    );

    if (existingUser.rows.length > 0) {
        console.log('ℹ️  Utilisateur administrateur existe déjà');
        return;
    }

    // Créer le salt et hacher le mot de passe
    const salt = authManager.generateSalt();
    const { hash } = await authManager.hashPassword(password, salt);

    // Insérer l'utilisateur
    await client.query(`
        INSERT INTO admin_users (username, email, password_hash, salt)
        VALUES ($1, $2, $3, $4)
    `, [username, email, hash, salt]);

    console.log(`   Nom d'utilisateur: ${username}`);
    console.log(`   Email: ${email}`);
    console.log(`   Mot de passe: ${password}`);
}

// Fonction utilitaire pour créer un utilisateur admin personnalisé
async function createCustomAdmin() {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (prompt) => new Promise(resolve => readline.question(prompt, resolve));

    try {
        console.log('\n👤 Création d\'un utilisateur administrateur personnalisé\n');

        const username = await question('Nom d\'utilisateur: ');
        const email = await question('Email: ');
        const password = await question('Mot de passe (min 12 caractères): ');

        if (password.length < 12) {
            console.log('❌ Le mot de passe doit contenir au moins 12 caractères');
            process.exit(1);
        }

        const client = new Client({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'terrain_tir_arc'
        });

        await client.connect();

        // Vérifier si l'utilisateur existe déjà
        const existingUser = await client.query(
            'SELECT id FROM admin_users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            console.log('❌ Un utilisateur avec ce nom ou cet email existe déjà');
            process.exit(1);
        }

        // Créer l'utilisateur
        const salt = authManager.generateSalt();
        const { hash } = await authManager.hashPassword(password, salt);

        const result = await client.query(`
            INSERT INTO admin_users (username, email, password_hash, salt)
            VALUES ($1, $2, $3, $4)
            RETURNING id, username, email, created_at
        `, [username, email, hash, salt]);

        console.log('\n✅ Utilisateur administrateur créé avec succès !');
        console.log(`   ID: ${result.rows[0].id}`);
        console.log(`   Nom d'utilisateur: ${result.rows[0].username}`);
        console.log(`   Email: ${result.rows[0].email}`);

        await client.end();

    } catch (error) {
        console.error('❌ Erreur lors de la création de l\'utilisateur:', error.message);
        process.exit(1);
    } finally {
        readline.close();
    }
}

// Interface en ligne de commande
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--create-admin')) {
        createCustomAdmin();
    } else {
        setupDatabase();
    }
}

module.exports = { setupDatabase, createDefaultAdmin, createCustomAdmin };