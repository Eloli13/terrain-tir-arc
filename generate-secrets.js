#!/usr/bin/env node

/**
 * Script de génération de secrets forts pour la production
 * Usage: node generate-secrets.js
 *
 * Génère des secrets cryptographiquement sécurisés pour :
 * - JWT_SECRET
 * - JWT_REFRESH_SECRET
 * - SESSION_SECRET
 * - DB_PASSWORD
 * - ENCRYPTION_KEY
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Générer un secret fort de longueur spécifiée
 */
function generateSecret(length = 48, format = 'base64') {
    const bytes = crypto.randomBytes(length);

    switch (format) {
        case 'base64':
            return bytes.toString('base64');
        case 'hex':
            return bytes.toString('hex');
        case 'alphanumeric':
            // Alphanumeric seulement (pour DB password)
            return bytes.toString('base64')
                .replace(/[^a-zA-Z0-9]/g, '')
                .substring(0, length);
        default:
            return bytes.toString('base64');
    }
}

/**
 * Afficher les secrets générés
 */
function displaySecrets() {
    const secrets = {
        JWT_SECRET: generateSecret(48, 'base64'),
        JWT_REFRESH_SECRET: generateSecret(48, 'base64'),
        SESSION_SECRET: generateSecret(48, 'base64'),
        ENCRYPTION_KEY: generateSecret(32, 'base64'), // 32 bytes pour AES-256
        DB_PASSWORD: generateSecret(32, 'alphanumeric')
    };

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║     🔐 SECRETS CRYPTOGRAPHIQUES GÉNÉRÉS POUR PRODUCTION       ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('⚠️  IMPORTANT: Ces secrets sont générés UNE SEULE FOIS !');
    console.log('⚠️  Sauvegardez-les dans un gestionnaire de secrets sécurisé');
    console.log('⚠️  NE LES COMMITEZ JAMAIS dans Git\n');

    console.log('═══════════════════════════════════════════════════════════════\n');

    Object.entries(secrets).forEach(([key, value]) => {
        console.log(`${key}=${value}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════\n');

    return secrets;
}

/**
 * Créer un fichier .env.production avec les secrets générés
 */
function createEnvFile(secrets, filename = '.env.production') {
    const envContent = `# ============================================
# FICHIER DE CONFIGURATION PRODUCTION
# ============================================
# ⚠️  NE JAMAIS COMMITER CE FICHIER DANS GIT
# ⚠️  Ajoutez .env.production à .gitignore
# ⚠️  Généré le ${new Date().toISOString()}
# ============================================

# ============================================
# BASE DE DONNÉES
# ============================================
DB_HOST=postgres
DB_PORT=5432
DB_NAME=terrain_tir_arc
DB_USER=tir_arc_user
DB_PASSWORD=${secrets.DB_PASSWORD}

# ============================================
# SÉCURITÉ - JWT
# ============================================
JWT_SECRET=${secrets.JWT_SECRET}
JWT_REFRESH_SECRET=${secrets.JWT_REFRESH_SECRET}

# ============================================
# SÉCURITÉ - SESSION
# ============================================
SESSION_SECRET=${secrets.SESSION_SECRET}

# ============================================
# CHIFFREMENT
# ============================================
ENCRYPTION_KEY=${secrets.ENCRYPTION_KEY}

# ============================================
# APPLICATION
# ============================================
NODE_ENV=production
PORT=3000

# ============================================
# CORS - MODIFIER AVEC VOTRE DOMAINE
# ============================================
ALLOWED_ORIGINS=https://votre-domaine.com,https://www.votre-domaine.com

# ============================================
# LOGS
# ============================================
LOG_LEVEL=warn

# ============================================
# RATE LIMITING
# ============================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=12

# ============================================
# EMAIL SMTP (Optionnel - configurable via UI)
# ============================================
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=votre-email@gmail.com
# SMTP_PASSWORD=votre-mot-de-passe-application
`;

    const filePath = path.join(__dirname, filename);

    try {
        fs.writeFileSync(filePath, envContent, 'utf8');
        console.log(`✅ Fichier ${filename} créé avec succès`);
        console.log(`📁 Emplacement: ${filePath}\n`);

        // Vérifier si .gitignore existe et contient .env.production
        updateGitignore();

        return true;
    } catch (error) {
        console.error(`❌ Erreur lors de la création du fichier ${filename}:`, error.message);
        return false;
    }
}

/**
 * Mettre à jour .gitignore pour exclure .env.production
 */
function updateGitignore() {
    const gitignorePath = path.join(__dirname, '.gitignore');

    try {
        let gitignoreContent = '';

        if (fs.existsSync(gitignorePath)) {
            gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
        }

        const entriesToAdd = [
            '.env.production',
            '.env.local',
            '.env.*.local',
            'secrets.txt'
        ];

        let updated = false;
        entriesToAdd.forEach(entry => {
            if (!gitignoreContent.includes(entry)) {
                gitignoreContent += `\n${entry}`;
                updated = true;
            }
        });

        if (updated) {
            fs.writeFileSync(gitignorePath, gitignoreContent, 'utf8');
            console.log('✅ .gitignore mis à jour pour exclure les fichiers de secrets\n');
        }

    } catch (error) {
        console.warn('⚠️  Impossible de mettre à jour .gitignore:', error.message);
    }
}

/**
 * Créer un fichier .env.example pour documentation
 */
function createEnvExample() {
    const exampleContent = `# ============================================
# EXEMPLE DE CONFIGURATION
# ============================================
# Copiez ce fichier en .env.production et remplissez avec vos valeurs
# Utilisez: node generate-secrets.js pour générer des secrets forts
# ============================================

# BASE DE DONNÉES
DB_HOST=postgres
DB_PORT=5432
DB_NAME=terrain_tir_arc
DB_USER=tir_arc_user
DB_PASSWORD=GÉNÉRÉ_PAR_SCRIPT

# SÉCURITÉ - JWT (minimum 32 caractères)
JWT_SECRET=GÉNÉRÉ_PAR_SCRIPT
JWT_REFRESH_SECRET=GÉNÉRÉ_PAR_SCRIPT

# SÉCURITÉ - SESSION (minimum 32 caractères)
SESSION_SECRET=GÉNÉRÉ_PAR_SCRIPT

# CHIFFREMENT (32 bytes pour AES-256)
ENCRYPTION_KEY=GÉNÉRÉ_PAR_SCRIPT

# APPLICATION
NODE_ENV=production
PORT=3000

# CORS - Remplacer par votre domaine
ALLOWED_ORIGINS=https://votre-domaine.com

# LOGS
LOG_LEVEL=warn

# RATE LIMITING
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=12

# EMAIL SMTP (Optionnel - configurable via interface admin)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=votre-email@gmail.com
# SMTP_PASSWORD=votre-mot-de-passe-application
`;

    const filePath = path.join(__dirname, '.env.example');

    try {
        fs.writeFileSync(filePath, exampleContent, 'utf8');
        console.log('✅ Fichier .env.example créé pour documentation\n');
        return true;
    } catch (error) {
        console.error('❌ Erreur lors de la création de .env.example:', error.message);
        return false;
    }
}

/**
 * Menu principal
 */
function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'display':
        case 'show':
            // Afficher seulement sans créer de fichier
            displaySecrets();
            console.log('💡 TIP: Utilisez "node generate-secrets.js create" pour créer le fichier .env.production\n');
            break;

        case 'create':
        case 'generate':
            // Générer et créer le fichier
            const secrets = displaySecrets();
            createEnvFile(secrets);
            createEnvExample();

            console.log('════════════════════════════════════════════════════════════════\n');
            console.log('📋 PROCHAINES ÉTAPES:\n');
            console.log('1. Vérifiez le fichier .env.production généré');
            console.log('2. Modifiez ALLOWED_ORIGINS avec votre domaine de production');
            console.log('3. Configurez les variables SMTP si nécessaire');
            console.log('4. Utilisez docker-compose.prod.yml pour le déploiement');
            console.log('5. SAUVEGARDEZ ces secrets dans un gestionnaire sécurisé (1Password, Vault, etc.)');
            console.log('\n⚠️  RAPPEL: Ne commitez JAMAIS .env.production dans Git\n');
            console.log('════════════════════════════════════════════════════════════════\n');
            break;

        case 'help':
        case '--help':
        case '-h':
        default:
            console.log('\n╔════════════════════════════════════════════════════════════════╗');
            console.log('║     🔐 GÉNÉRATEUR DE SECRETS CRYPTOGRAPHIQUES                 ║');
            console.log('╚════════════════════════════════════════════════════════════════╝\n');
            console.log('Usage:');
            console.log('  node generate-secrets.js [command]\n');
            console.log('Commandes:');
            console.log('  create, generate    Générer secrets et créer .env.production');
            console.log('  display, show       Afficher secrets sans créer de fichier');
            console.log('  help                Afficher cette aide\n');
            console.log('Exemples:');
            console.log('  node generate-secrets.js create      # Créer .env.production');
            console.log('  node generate-secrets.js display     # Afficher uniquement\n');

            if (!command) {
                // Par défaut, créer le fichier
                console.log('Aucune commande spécifiée, exécution de "create" par défaut...\n');
                const secrets = displaySecrets();
                createEnvFile(secrets);
                createEnvExample();
            }
            break;
    }
}

// Exécuter le script
if (require.main === module) {
    main();
}

module.exports = { generateSecret, displaySecrets, createEnvFile };
