#!/usr/bin/env node

/**
 * Script de rotation des secrets JWT
 *
 * Ce script génère de nouveaux secrets cryptographiques et met à jour le fichier .env
 * IMPORTANT: À exécuter en maintenance planifiée car cela invalide tous les tokens existants
 *
 * Usage:
 *   node scripts/rotate-secrets.js
 *   node scripts/rotate-secrets.js --dry-run  (pour voir les nouveaux secrets sans les appliquer)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const isDryRun = process.argv.includes('--dry-run');

/**
 * Génère un secret cryptographique fort
 */
function generateSecret(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Sauvegarde les anciens secrets avant rotation
 */
function backupSecrets() {
    const envPath = path.join(__dirname, '../../.env');
    const backupPath = path.join(__dirname, `../../.env.backup.${Date.now()}`);

    if (fs.existsSync(envPath)) {
        fs.copyFileSync(envPath, backupPath);
        console.log(`✅ Backup créé: ${backupPath}`);
        return backupPath;
    }

    return null;
}

/**
 * Met à jour les secrets dans le fichier .env
 */
function updateEnvFile(newSecrets) {
    const envPath = path.join(__dirname, '../../.env');

    if (!fs.existsSync(envPath)) {
        console.error('❌ Fichier .env introuvable. Utilisez .env.example comme template.');
        process.exit(1);
    }

    let envContent = fs.readFileSync(envPath, 'utf8');

    // Remplacer les secrets
    Object.keys(newSecrets).forEach(key => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `${key}=${newSecrets[key]}`);
        } else {
            // Ajouter la clé si elle n'existe pas
            envContent += `\n${key}=${newSecrets[key]}`;
        }
    });

    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log(`✅ Fichier .env mis à jour avec les nouveaux secrets`);
}

/**
 * Fonction principale
 */
function main() {
    console.log('\n🔐 === Script de Rotation des Secrets JWT ===\n');

    // Générer les nouveaux secrets
    const newSecrets = {
        JWT_SECRET: generateSecret(32),
        JWT_REFRESH_SECRET: generateSecret(32),
        SESSION_SECRET: generateSecret(32),
        ENCRYPTION_KEY: generateSecret(32)
    };

    console.log('🔑 Nouveaux secrets générés:\n');
    Object.keys(newSecrets).forEach(key => {
        console.log(`${key}=${newSecrets[key]}`);
    });

    if (isDryRun) {
        console.log('\n⚠️  Mode DRY RUN - Aucune modification appliquée');
        console.log('💡 Retirez --dry-run pour appliquer les changements\n');
        return;
    }

    // Confirmation
    console.log('\n⚠️  ATTENTION: Cette opération va:');
    console.log('   1. Invalider tous les JWT tokens existants');
    console.log('   2. Déconnecter tous les utilisateurs');
    console.log('   3. Nécessiter un redémarrage du serveur\n');

    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Voulez-vous continuer? (oui/non): ', (answer) => {
        if (answer.toLowerCase() === 'oui') {
            // Backup avant modification
            const backupPath = backupSecrets();

            // Mettre à jour le fichier .env
            updateEnvFile(newSecrets);

            console.log('\n✅ Rotation des secrets terminée avec succès!');
            console.log('\n📝 Prochaines étapes:');
            console.log('   1. Redémarrez le serveur: docker-compose restart app');
            console.log('   2. Tous les utilisateurs devront se reconnecter');
            if (backupPath) {
                console.log(`   3. Backup sauvegardé: ${backupPath}`);
            }
            console.log('\n⚠️  Ne committez JAMAIS le fichier .env dans Git!\n');
        } else {
            console.log('\n❌ Opération annulée');
        }

        rl.close();
    });
}

// Exécution
if (require.main === module) {
    main();
}

module.exports = { generateSecret };
