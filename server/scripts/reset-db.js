#!/usr/bin/env node

/**
 * Script de réinitialisation de la base de données
 * ATTENTION: Supprime TOUTES les données de la base
 * Usage: node server/scripts/reset-db.js [--force]
 */

require('dotenv').config();
const { Pool } = require('pg');
const readline = require('readline');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'terrain_tir_arc',
    user: process.env.DB_USER || 'tir_arc_user',
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    } : false
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function confirmReset() {
    return new Promise((resolve) => {
        console.log('\n⚠️  ATTENTION: Cette opération va SUPPRIMER TOUTES LES DONNÉES de la base de données!');
        console.log(`📊 Base de données: ${process.env.DB_NAME || 'terrain_tir_arc'}`);
        console.log(`🖥️  Hôte: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);
        console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}\n`);

        rl.question('Êtes-vous sûr de vouloir continuer? (tapez "RESET" pour confirmer): ', (answer) => {
            rl.close();
            resolve(answer === 'RESET');
        });
    });
}

async function resetDatabase() {
    const client = await pool.connect();

    try {
        console.log('\n🔄 Début de la réinitialisation...\n');

        // Désactiver les contraintes de clés étrangères temporairement
        await client.query('SET session_replication_role = replica;');

        // Lister toutes les tables à supprimer
        const tables = [
            'refresh_tokens',
            'audit_logs',
            'incidents',
            'sessions',
            'configuration',
            'admin_users'
        ];

        // Supprimer les données de chaque table
        for (const table of tables) {
            try {
                await client.query(`TRUNCATE TABLE ${table} CASCADE;`);
                console.log(`✅ Table "${table}" vidée`);
            } catch (err) {
                // La table n'existe peut-être pas encore, ce n'est pas grave
                console.log(`⚠️  Table "${table}" non trouvée ou déjà vide`);
            }
        }

        // Réactiver les contraintes
        await client.query('SET session_replication_role = DEFAULT;');

        console.log('\n✅ Base de données réinitialisée avec succès!');
        console.log('\n💡 Prochaines étapes:');
        console.log('   1. Redémarrez le serveur pour recréer les tables');
        console.log('   2. Ou exécutez: node server/scripts/init-db.js');
        console.log('   3. Un compte admin par défaut sera créé\n');

    } catch (error) {
        console.error('\n❌ Erreur lors de la réinitialisation:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

async function main() {
    const args = process.argv.slice(2);
    const forceReset = args.includes('--force');

    try {
        // Vérifier la connexion
        await pool.query('SELECT 1');

        // Demander confirmation sauf si --force
        if (!forceReset) {
            const confirmed = await confirmReset();
            if (!confirmed) {
                console.log('\n❌ Opération annulée par l\'utilisateur\n');
                await pool.end();
                process.exit(0);
            }
        } else {
            console.log('\n⚠️  Mode --force activé, réinitialisation sans confirmation...\n');
        }

        await resetDatabase();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERREUR FATALE:', error.message);
        console.error('\nVérifiez:');
        console.error('  - Les variables d\'environnement (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)');
        console.error('  - Que la base de données est accessible');
        console.error('  - Que l\'utilisateur a les droits nécessaires\n');
        await pool.end();
        process.exit(1);
    }
}

// Exécuter si appelé directement
if (require.main === module) {
    main();
}

module.exports = { resetDatabase };
