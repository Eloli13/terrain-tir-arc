/**
 * Module de chiffrement/déchiffrement pour les données sensibles
 * Utilise AES-256-CBC
 * Version Optimisée : Cache la clé dérivée pour ne pas bloquer l'Event Loop
 */

const crypto = require('crypto');
const logger = require('./logger');

// 1. Validation stricte : On ne veut PAS de fallback sur SESSION_SECRET
// C'est le rôle de env-validator.js de s'assurer que cette variable existe.
if (!process.env.ENCRYPTION_KEY) {
    const msg = 'CRITIQUE : ENCRYPTION_KEY manquante dans process.env (encryption.js)';
    logger.error(msg);
    // On crash volontairement ici si ça arrive, pour éviter de corrompre des données
    throw new Error(msg);
}

const RAW_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc';
const SALT = 'salt'; // On garde le sel hardcodé pour compatibilité avec vos données existantes

// 2. OPTIMISATION : On dérive la clé UNE SEULE FOIS au démarrage
// scryptSync est lent, on ne veut pas le faire à chaque requête !
let CACHED_KEY;
try {
    CACHED_KEY = crypto.scryptSync(RAW_KEY, SALT, 32);
    logger.info('🔑 Clé de chiffrement dérivée et chargée en mémoire avec succès');
} catch (err) {
    logger.error('Erreur fatale lors de la dérivation de la clé', err);
    throw err;
}

/**
 * Chiffrer une chaîne de caractères
 * @param {string} text - Texte à chiffrer
 * @returns {string} Texte chiffré au format "iv:encrypted"
 */
function encrypt(text) {
    try {
        if (!text) return null;

        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, CACHED_KEY, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
        logger.error('Erreur chiffrement:', error);
        // Ne jamais renvoyer l'erreur brute au client pour ne pas fuiter d'infos
        throw new Error('Erreur interne de sécurité (Encryption)');
    }
}

/**
 * Déchiffrer une chaîne de caractères
 * @param {string} encryptedText - Texte chiffré au format "iv:encrypted"
 * @returns {string} Texte déchiffré
 */
function decrypt(encryptedText) {
    try {
        if (!encryptedText) return null;

        const parts = encryptedText.split(':');
        if (parts.length !== 2) {
            // Ce n'est pas un format valide, on retourne null ou on log
            // (Utile si la DB contient parfois du texte non chiffré par erreur)
            logger.warn('Tentative de déchiffrement d\'un format invalide');
            return null;
        }

        const iv = Buffer.from(parts[0], 'hex');
        const encryptedContent = parts[1];

        const decipher = crypto.createDecipheriv(ALGORITHM, CACHED_KEY, iv);

        let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        logger.error('Erreur déchiffrement:', error.message);
        // Si le déchiffrement échoue (mauvaise clé ? données corrompues ?),
        // on lance une erreur pour que l'appelant sache que ça a échoué.
        throw new Error('Échec du déchiffrement (Clé invalide ou données corrompues)');
    }
}

/**
 * Vérifier si une chaîne semble être chiffrée
 * @param {string} text - Texte à vérifier
 * @returns {boolean}
 */
function isEncrypted(text) {
    if (!text || typeof text !== 'string') return false;
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
