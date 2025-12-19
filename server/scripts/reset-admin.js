#!/usr/bin/env node

/**
 * Script pour réinitialiser le compte administrateur
 * Supprime tous les admins existants et recrée le compte par défaut
 * Usage: node server/scripts/reset-admin.js
 */

require('dotenv').config();
const database = require('../config/database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Configuration de l'admin par défaut (DOIT correspondre à database.js)
const DEFAULT_ADMIN = {
    username: 'admin',
    email: 'admin@localhost',
    password: 'changez-moi-en-production' // DOIT être changé au premier login
};

async function resetAdmin() {
    try {
        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log('║     🔄 RÉINITIALISATION DU COMPTE ADMINISTRATEUR             ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');

        // 1. Supprimer TOUS les comptes admin existants
        console.log('🗑️  Suppression des comptes administrateurs existants...\n');
        const deleteResult = await database.query('DELETE FROM admin_users');
        console.log(`   ✓ ${deleteResult.rowCount} compte(s) supprimé(s)\n`);

        // 2. Générer le sel et hasher le mot de passe (EXACTEMENT comme database.js)
        console.log('🔐 Génération du hash du mot de passe...\n');
        const salt = crypto.randomBytes(16).toString('hex'); // 16 bytes = 32 caractères hex
        const saltedPassword = DEFAULT_ADMIN.password + salt;
        const passwordHash = await bcrypt.hash(saltedPassword, 12); // 12 rounds comme database.js

        console.log(`   Salt (16 bytes): ${salt.substring(0, 20)}...`);
        console.log(`   Hash: ${passwordHash.substring(0, 20)}...\n`);

        // 3. Créer le nouveau compte admin
        console.log('👤 Création du compte administrateur...\n');
        await database.query(`
            INSERT INTO admin_users (username, email, password_hash, salt, is_active, must_change_password)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            DEFAULT_ADMIN.username,
            DEFAULT_ADMIN.email,
            passwordHash,
            salt,
            true,
            true // Force le changement de mot de passe
        ]);

        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║     ✅ COMPTE ADMINISTRATEUR RÉINITIALISÉ                     ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');

        console.log('📋 Informations de connexion:');
        console.log(`   Username: ${DEFAULT_ADMIN.username}`);
        console.log(`   Email:    ${DEFAULT_ADMIN.email}`);
        console.log(`   Password: ${DEFAULT_ADMIN.password}`);
        console.log('\n⚠️  IMPORTANT: Ce mot de passe DOIT être changé lors de la première connexion!\n');

        // 4. Vérifier que le compte a bien été créé
        const checkResult = await database.query(
            'SELECT username, email, must_change_password, salt, password_hash FROM admin_users WHERE username = $1',
            [DEFAULT_ADMIN.username]
        );

        if (checkResult.rows.length > 0) {
            const admin = checkResult.rows[0];
            console.log('✅ Vérification:');
            console.log(`   Username: ${admin.username}`);
            console.log(`   Email: ${admin.email}`);
            console.log(`   Must change password: ${admin.must_change_password}`);
            console.log(`   Salt length: ${admin.salt.length} caractères (devrait être 32)`);
            console.log(`   Hash length: ${admin.password_hash.length} caractères\n`);

            if (admin.salt.length !== 32) {
                console.warn('⚠️  ATTENTION: La longueur du salt ne correspond pas à 32 caractères!\n');
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('\n❌ ERREUR lors de la réinitialisation:', error.message);
        console.error('\nStack trace:', error.stack);
        console.error('\nVérifiez:');
        console.error('  - Les variables d\'environnement (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)');
        console.error('  - Que la base de données est accessible');
        console.error('  - Que l\'utilisateur a les droits nécessaires\n');
        process.exit(1);
    }
}

// Exécuter si appelé directement
if (require.main === module) {
    resetAdmin();
}

module.exports = { resetAdmin };
