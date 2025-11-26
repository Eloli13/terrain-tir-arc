/**
 * Middleware pour l'upload de fichiers avec Multer
 * Gestion sécurisée des photos d'incidents
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Définir le chemin du dossier d'upload
const uploadDir = path.join(__dirname, '../uploads/incidents');

// Vérifier que le dossier existe et est accessible
// Note: Le dossier doit être créé au démarrage du conteneur (voir Dockerfile)
try {
    if (!fs.existsSync(uploadDir)) {
        // Tenter de créer le dossier seulement si on a les permissions
        fs.mkdirSync(uploadDir, { recursive: true });
        logger.info('Dossier uploads/incidents créé');
    } else {
        logger.info('Dossier uploads/incidents existe et est accessible');
    }
} catch (err) {
    // En production Docker, le dossier doit déjà exister (créé dans le Dockerfile)
    logger.warn('Impossible de créer le dossier uploads/incidents:', err.message);
    logger.info('Utilisation du dossier existant:', uploadDir);
}

// Configuration du stockage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Générer un nom de fichier unique: timestamp + uuid + extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `incident-${uniqueSuffix}${ext}`);
    }
});

// Filtre pour accepter uniquement les images
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        logger.warn('Tentative d\'upload de fichier non-image', {
            mimetype: file.mimetype,
            originalname: file.originalname,
            ip: req.ip
        });
        cb(new Error('Seules les images sont autorisées (JPEG, PNG, GIF, WebP)'), false);
    }
};

// Configuration multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB max
        files: 1 // 1 fichier maximum par requête
    }
});

// Middleware de gestion d'erreurs upload
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'Fichier trop volumineux (maximum 10 MB)'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                error: 'Trop de fichiers (maximum 1 fichier)'
            });
        }
        return res.status(400).json({
            error: `Erreur d'upload: ${err.message}`
        });
    }

    if (err) {
        logger.error('Erreur upload fichier:', err);
        return res.status(400).json({
            error: err.message || 'Erreur lors de l\'upload du fichier'
        });
    }

    next();
};

module.exports = {
    upload,
    handleUploadError,
    uploadDir
};
