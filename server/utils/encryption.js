/**
 * Module de chiffrement/déchiffrement pour les données sensibles
 * Utilise AES-256-CBC pour sécuriser les mots de passe SMTP
 */

const crypto = require('crypto');
const logger = require('./logger');

// Clé de chiffrement depuis les variables d'environnement
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET;

if (!ENCRYPTION_KEY) {
    logger.error('ENCRYPTION_KEY ou SESSION_SECRET non définie dans .env');
    throw new Error('Clé de chiffrement manquante. Définissez ENCRYPTION_KEY dans .env');
}

// Dériver une clé de 32 bytes depuis la clé fournie
const algorithm = 'aes-256-cbc';

/**
 * Générer une clé de chiffrement de 32 bytes
 */
function getKey() {
    return crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
}

/**
 * Chiffrer une chaîne de caractères
 * @param {string} text - Texte à chiffrer
 * @returns {string} Texte chiffré au format "iv:encrypted"
 */
function encrypt(text) {
    try {
        if (!text) {
            return null;
        }

        const key = getKey();
        const iv = crypto.randomBytes(16); // Vecteur d'initialisation aléatoire
        const cipher = crypto.createCipheriv(algorithm, key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Retourner IV + données chiffrées (séparés par :)
        return iv.toString('hex') + ':' + encrypted;

    } catch (error) {
        logger.error('Erreur lors du chiffrement:', error);
        throw new Error('Échec du chiffrement');
    }
}

/**
 * Déchiffrer une chaîne de caractères
 * @param {string} encryptedText - Texte chiffré au format "iv:encrypted"
 * @returns {string} Texte déchiffré
 */
function decrypt(encryptedText) {
    try {
        if (!encryptedText) {
            return null;
        }

        const key = getKey();
        const parts = encryptedText.split(':');

        if (parts.length !== 2) {
            throw new Error('Format de texte chiffré invalide');
        }

        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];

        const decipher = crypto.createDecipheriv(algorithm, key, iv);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;

    } catch (error) {
        logger.error('Erreur lors du déchiffrement:', error);
        throw new Error('Échec du déchiffrement');
    }
}

/**
 * Vérifier si une chaîne semble être chiffrée
 * @param {string} text - Texte à vérifier
 * @returns {boolean}
 */
function isEncrypted(text) {
    if (!text || typeof text !== 'string') {
        return false;
    }

    // Format attendu: "hex:hex" avec au moins 32 caractères pour l'IV
    const parts = text.split(':');
    return parts.length === 2 && parts[0].length === 32 && /^[0-9a-f]+$/i.test(parts[0]);
}

/**
 * Hacher une chaîne (pour comparaison, non réversible)
 * @param {string} text - Texte à hacher
 * @returns {string} Hash SHA-256
 */
function hash(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
}

module.exports = {
    encrypt,
    decrypt,
    isEncrypted,
    hash
};
