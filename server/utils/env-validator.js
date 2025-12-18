/**
 * Validation des variables d'environnement au démarrage
 * Empêche le serveur de démarrer si configuration incomplète
 */

const logger = require('./logger');

/**
 * Variables d'environnement requises avec description
 */
const REQUIRED_ENV_VARS = {
    // Base de données
    DB_HOST: 'Hôte de la base de données PostgreSQL',
    DB_PORT: 'Port de la base de données PostgreSQL',
    DB_NAME: 'Nom de la base de données',
    DB_USER: 'Utilisateur de la base de données',
    DB_PASSWORD: 'Mot de passe de la base de données',

    // Sécurité - JWT
    JWT_SECRET: 'Clé secrète pour les JWT access tokens (min 32 caractères)',
    JWT_REFRESH_SECRET: 'Clé secrète pour les JWT refresh tokens (min 32 caractères)',

    // Sécurité - Session
    SESSION_SECRET: 'Clé secrète pour les sessions (min 32 caractères)',

    // Sécurité - Encryption
    ENCRYPTION_KEY: 'Clé de chiffrement AES-256 pour les données sensibles (64 caractères hex)',

    // Application
    NODE_ENV: 'Environnement d\'exécution (development/production)',
    PORT: 'Port du serveur backend'
};

/**
 * Variables d'environnement optionnelles avec valeurs par défaut
 */
const OPTIONAL_ENV_VARS = {
    ALLOWED_ORIGINS: 'http://localhost,http://localhost:80',
    LOG_LEVEL: 'info',
    RATE_LIMIT_WINDOW_MS: '900000',
    RATE_LIMIT_MAX_REQUESTS: '100',
    BCRYPT_ROUNDS: '12'
};

/**
 * Validation des secrets (longueur minimale)
 */
const SECRET_MIN_LENGTH = 32;
const SECRETS_TO_VALIDATE = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'SESSION_SECRET', 'ENCRYPTION_KEY'];

/**
 * Valider toutes les variables d'environnement
 * @throws {Error} Si validation échoue
 */
function validateEnvironment() {
    const errors = [];
    const warnings = [];

    logger.info('Validation des variables d\'environnement...');

    // Vérifier les variables requises
    for (const [varName, description] of Object.entries(REQUIRED_ENV_VARS)) {
        if (!process.env[varName] || process.env[varName].trim() === '') {
            errors.push(`❌ ${varName} manquante ou vide - ${description}`);
        } else {
            logger.debug(`✓ ${varName} définie`);
        }
    }

    // Vérifier la longueur des secrets
    for (const secretName of SECRETS_TO_VALIDATE) {
        if (process.env[secretName] && process.env[secretName].length < SECRET_MIN_LENGTH) {
            errors.push(
                `❌ ${secretName} trop courte - Doit contenir au moins ${SECRET_MIN_LENGTH} caractères (actuel: ${process.env[secretName].length})`
            );
        }
    }

    // Validation spécifique pour ENCRYPTION_KEY (format hexadécimal attendu)
    const encKey = process.env.ENCRYPTION_KEY;
    if (encKey) {
        // Une clé AES-256 devrait être en format hexadécimal (64 caractères = 32 bytes)
        if (!/^[0-9a-fA-F]+$/.test(encKey)) {
            warnings.push(
                `⚠️ ENCRYPTION_KEY ne semble pas être en format hexadécimal. Assurez-vous qu'elle est correcte pour AES-256.`
            );
        }
        // En production, vérifier que c'est bien 64 caractères hex pour AES-256
        if (process.env.NODE_ENV === 'production' && encKey.length !== 64) {
            warnings.push(
                `⚠️ ENCRYPTION_KEY devrait faire 64 caractères hexadécimaux pour AES-256 (actuel: ${encKey.length})`
            );
        }
    }

    // Vérifier les secrets de développement en production
    if (process.env.NODE_ENV === 'production') {
        const devSecretPatterns = [/dev_/i, /test_/i, /exemple/i, /sample/i];

        for (const secretName of SECRETS_TO_VALIDATE) {
            const secretValue = process.env[secretName] || '';

            for (const pattern of devSecretPatterns) {
                if (pattern.test(secretValue)) {
                    errors.push(
                        `❌ ${secretName} contient un pattern de développement en PRODUCTION - Doit être régénérée avec une valeur forte`
                    );
                    break;
                }
            }
        }

        // Vérifier le mot de passe DB en production
        const dbPassword = process.env.DB_PASSWORD || '';
        if (dbPassword.length < 16) {
            warnings.push(
                `⚠️ DB_PASSWORD est court (${dbPassword.length} caractères) - Recommandé: 32+ caractères en production`
            );
        }
        if (/dev_|test_|123|password/i.test(dbPassword)) {
            errors.push(
                `❌ DB_PASSWORD contient un pattern faible en PRODUCTION - Doit être régénérée`
            );
        }
    }

    // Vérifier le format de certaines variables
    if (process.env.PORT && isNaN(parseInt(process.env.PORT))) {
        errors.push(`❌ PORT doit être un nombre (actuel: ${process.env.PORT})`);
    }

    if (process.env.DB_PORT && isNaN(parseInt(process.env.DB_PORT))) {
        errors.push(`❌ DB_PORT doit être un nombre (actuel: ${process.env.DB_PORT})`);
    }

    if (process.env.NODE_ENV && !['development', 'production', 'test'].includes(process.env.NODE_ENV)) {
        warnings.push(
            `⚠️ NODE_ENV a une valeur non standard: ${process.env.NODE_ENV} (attendu: development/production/test)`
        );
    }

    // Appliquer les valeurs par défaut pour variables optionnelles
    for (const [varName, defaultValue] of Object.entries(OPTIONAL_ENV_VARS)) {
        if (!process.env[varName]) {
            process.env[varName] = defaultValue;
            logger.info(`ℹ️ ${varName} non définie, valeur par défaut appliquée: ${defaultValue}`);
        }
    }

    // Afficher les warnings
    if (warnings.length > 0) {
        logger.warn('Avertissements de configuration:');
        warnings.forEach(warning => logger.warn(warning));
    }

    // Arrêter si erreurs critiques
    if (errors.length > 0) {
        // Utiliser console.error EN PLUS de logger pour s'assurer que les erreurs sont visibles
        // (Winston peut ne pas flush avant que le processus ne meure)
        console.error('\n❌ VALIDATION DES VARIABLES D\'ENVIRONNEMENT ÉCHOUÉE');
        console.error('Erreurs détectées:');
        errors.forEach(error => console.error(error));
        console.error('');
        console.error('Le serveur ne peut pas démarrer avec une configuration invalide.');
        console.error('Veuillez corriger les erreurs dans Coolify → Environment Variables\n');

        logger.error('❌ VALIDATION DES VARIABLES D\'ENVIRONNEMENT ÉCHOUÉE');
        logger.error('Erreurs détectées:');
        errors.forEach(error => logger.error(error));
        logger.error('');
        logger.error('Le serveur ne peut pas démarrer avec une configuration invalide.');
        logger.error('Veuillez corriger les erreurs ci-dessus dans votre fichier .env ou docker-compose.yml');

        throw new Error(`Variables d'environnement invalides: ${errors.length} erreur(s) détectée(s)`);
    }

    logger.info('✅ Validation des variables d\'environnement réussie');

    // Afficher résumé configuration
    displayConfigSummary();
}

/**
 * Afficher un résumé de la configuration (sans secrets)
 */
function displayConfigSummary() {
    logger.info('Configuration du serveur:');
    logger.info(`  Environnement: ${process.env.NODE_ENV}`);
    logger.info(`  Port: ${process.env.PORT}`);
    logger.info(`  Base de données: ${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
    logger.info(`  CORS origins: ${process.env.ALLOWED_ORIGINS}`);
    logger.info(`  Log level: ${process.env.LOG_LEVEL}`);
    logger.info(`  Rate limit: ${process.env.RATE_LIMIT_MAX_REQUESTS} requêtes / ${parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 60000} minutes`);
}

/**
 * Générer des secrets forts pour le développement
 * @returns {Object} Secrets générés
 */
function generateStrongSecrets() {
    const crypto = require('crypto');

    return {
        JWT_SECRET: crypto.randomBytes(48).toString('base64'),
        JWT_REFRESH_SECRET: crypto.randomBytes(48).toString('base64'),
        SESSION_SECRET: crypto.randomBytes(48).toString('base64'),
        ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'), // 32 bytes = 64 caractères hex pour AES-256
        DB_PASSWORD: crypto.randomBytes(24).toString('base64').replace(/[^a-zA-Z0-9]/g, '')
    };
}

module.exports = {
    validateEnvironment,
    generateStrongSecrets,
    REQUIRED_ENV_VARS,
    OPTIONAL_ENV_VARS
};
