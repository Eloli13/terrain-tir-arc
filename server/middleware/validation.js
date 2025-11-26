const Joi = require('joi');
const logger = require('../utils/logger');

// Schémas de validation Joi
const schemas = {
    // Validation pour l'authentification
    login: Joi.object({
        username: Joi.string()
            .alphanum()
            .min(3)
            .max(50)
            .required()
            .messages({
                'string.alphanum': 'Le nom d\'utilisateur ne peut contenir que des caractères alphanumériques',
                'string.min': 'Le nom d\'utilisateur doit contenir au moins 3 caractères',
                'string.max': 'Le nom d\'utilisateur ne peut dépasser 50 caractères',
                'any.required': 'Le nom d\'utilisateur est requis'
            }),

        password: Joi.string()
            .min(8)
            .max(128)
            .required()
            .messages({
                'string.min': 'Le mot de passe doit contenir au moins 8 caractères',
                'string.max': 'Le mot de passe ne peut dépasser 128 caractères',
                'any.required': 'Le mot de passe est requis'
            })
    }),

    // Validation pour la création d'un utilisateur admin
    createAdmin: Joi.object({
        username: Joi.string()
            .alphanum()
            .min(3)
            .max(50)
            .required()
            .messages({
                'string.alphanum': 'Le nom d\'utilisateur ne peut contenir que des caractères alphanumériques',
                'string.min': 'Le nom d\'utilisateur doit contenir au moins 3 caractères',
                'string.max': 'Le nom d\'utilisateur ne peut dépasser 50 caractères',
                'any.required': 'Le nom d\'utilisateur est requis'
            }),

        email: Joi.string()
            .email()
            .max(255)
            .required()
            .messages({
                'string.email': 'L\'adresse email doit être valide',
                'string.max': 'L\'adresse email ne peut dépasser 255 caractères',
                'any.required': 'L\'adresse email est requise'
            }),

        password: Joi.string()
            .min(12)
            .max(128)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .required()
            .messages({
                'string.min': 'Le mot de passe doit contenir au moins 12 caractères',
                'string.max': 'Le mot de passe ne peut dépasser 128 caractères',
                'string.pattern.base': 'Le mot de passe doit contenir au moins : 1 minuscule, 1 majuscule, 1 chiffre et 1 caractère spécial',
                'any.required': 'Le mot de passe est requis'
            })
    }),

    // Validation pour les sessions de tir
    createSession: Joi.object({
        nom: Joi.string()
            .trim()
            .min(2)
            .max(100)
            .pattern(/^[a-zA-ZÀ-ÿ\s\-']+$/)
            .required()
            .messages({
                'string.min': 'Le nom doit contenir au moins 2 caractères',
                'string.max': 'Le nom ne peut dépasser 100 caractères',
                'string.pattern.base': 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes',
                'any.required': 'Le nom est requis'
            }),

        prenom: Joi.string()
            .trim()
            .min(2)
            .max(100)
            .pattern(/^[a-zA-ZÀ-ÿ\s\-']+$/)
            .required()
            .messages({
                'string.min': 'Le prénom doit contenir au moins 2 caractères',
                'string.max': 'Le prénom ne peut dépasser 100 caractères',
                'string.pattern.base': 'Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes',
                'any.required': 'Le prénom est requis'
            }),

        type_tireur: Joi.string()
            .valid('club', 'autre_club', 'service_sports')
            .required()
            .messages({
                'any.only': 'Le type de tireur doit être : club, autre_club ou service_sports',
                'any.required': 'Le type de tireur est requis'
            }),

        nombre_tireurs: Joi.number()
            .integer()
            .min(1)
            .max(20)
            .required()
            .messages({
                'number.base': 'Le nombre de tireurs doit être un nombre',
                'number.integer': 'Le nombre de tireurs doit être un entier',
                'number.min': 'Le nombre de tireurs doit être d\'au moins 1',
                'number.max': 'Le nombre de tireurs ne peut dépasser 20',
                'any.required': 'Le nombre de tireurs est requis'
            }),

        terrain: Joi.string()
            .valid('interieur', 'exterieur')
            .required()
            .messages({
                'any.only': 'Le terrain doit être : interieur ou exterieur',
                'any.required': 'Le terrain est requis'
            })
    }),

    // Validation pour la mise à jour d'une session
    updateSession: Joi.object({
        active: Joi.boolean()
            .messages({
                'boolean.base': 'Le statut actif doit être vrai ou faux'
            }),

        date_fin: Joi.date()
            .iso()
            .messages({
                'date.format': 'La date de fin doit être au format ISO'
            })
    }).min(1), // Au moins un champ doit être présent

    // Validation pour les incidents
    createIncident: Joi.object({
        type_incident: Joi.string()
            .trim()
            .min(3)
            .max(100)
            .required()
            .messages({
                'string.min': 'Le type d\'incident doit contenir au moins 3 caractères',
                'string.max': 'Le type d\'incident ne peut dépasser 100 caractères',
                'any.required': 'Le type d\'incident est requis'
            }),

        description: Joi.string()
            .trim()
            .min(10)
            .max(2000)
            .required()
            .messages({
                'string.min': 'La description doit contenir au moins 10 caractères',
                'string.max': 'La description ne peut dépasser 2000 caractères',
                'any.required': 'La description est requise'
            }),

        terrain: Joi.string()
            .valid('interieur', 'exterieur')
            .required()
            .messages({
                'any.only': 'Le terrain doit être : interieur ou exterieur',
                'any.required': 'Le terrain est requis'
            }),

        photo_path: Joi.string()
            .uri({ scheme: ['http', 'https', 'data'] })
            .max(500)
            .optional()
            .messages({
                'string.uri': 'Le chemin de la photo doit être une URI valide',
                'string.max': 'Le chemin de la photo ne peut dépasser 500 caractères'
            })
    }),

    // Validation pour la mise à jour d'un incident
    updateIncident: Joi.object({
        statut: Joi.string()
            .valid('en_attente', 'en_cours', 'resolu')
            .messages({
                'any.only': 'Le statut doit être : en_attente, en_cours ou resolu'
            }),

        treatment_notes: Joi.string()
            .trim()
            .max(2000)
            .allow('')
            .messages({
                'string.max': 'Les notes de traitement ne peuvent dépasser 2000 caractères'
            }),

        resolution_notes: Joi.string()
            .trim()
            .max(2000)
            .allow('')
            .messages({
                'string.max': 'Les notes de résolution ne peuvent dépasser 2000 caractères'
            })
    }).min(1), // Au moins un champ doit être présent

    // Validation pour les filtres de requête
    sessionFilters: Joi.object({
        dateDebut: Joi.date()
            .iso()
            .messages({
                'date.format': 'La date de début doit être au format ISO'
            }),

        dateFin: Joi.date()
            .iso()
            .min(Joi.ref('dateDebut'))
            .messages({
                'date.format': 'La date de fin doit être au format ISO',
                'date.min': 'La date de fin doit être postérieure à la date de début'
            }),

        terrain: Joi.string()
            .valid('interieur', 'exterieur')
            .messages({
                'any.only': 'Le terrain doit être : interieur ou exterieur'
            }),

        type_tireur: Joi.string()
            .valid('club', 'autre_club', 'service_sports')
            .messages({
                'any.only': 'Le type de tireur doit être : club, autre_club ou service_sports'
            }),

        limit: Joi.number()
            .integer()
            .min(1)
            .max(1000)
            .default(100)
            .messages({
                'number.base': 'La limite doit être un nombre',
                'number.integer': 'La limite doit être un entier',
                'number.min': 'La limite doit être d\'au moins 1',
                'number.max': 'La limite ne peut dépasser 1000'
            }),

        offset: Joi.number()
            .integer()
            .min(0)
            .default(0)
            .messages({
                'number.base': 'L\'offset doit être un nombre',
                'number.integer': 'L\'offset doit être un entier',
                'number.min': 'L\'offset ne peut être négatif'
            })
    }),

    // Validation pour la configuration
    updateConfiguration: Joi.object({
        key: Joi.string()
            .trim()
            .min(1)
            .max(100)
            .required()
            .messages({
                'string.min': 'La clé ne peut être vide',
                'string.max': 'La clé ne peut dépasser 100 caractères',
                'any.required': 'La clé est requise'
            }),

        value: Joi.string()
            .trim()
            .max(5000)
            .required()
            .messages({
                'string.max': 'La valeur ne peut dépasser 5000 caractères',
                'any.required': 'La valeur est requise'
            }),

        description: Joi.string()
            .trim()
            .max(500)
            .allow('')
            .messages({
                'string.max': 'La description ne peut dépasser 500 caractères'
            })
    }),

    // Validation pour les paramètres UUID
    uuidParam: Joi.object({
        id: Joi.string()
            .guid({ version: ['uuidv4'] })
            .required()
            .messages({
                'string.guid': 'L\'identifiant doit être un UUID valide',
                'any.required': 'L\'identifiant est requis'
            })
    })
};

// Middleware de validation générique
const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        const dataToValidate = property === 'params' ? req.params :
                              property === 'query' ? req.query :
                              req.body;

        const { error, value } = schema.validate(dataToValidate, {
            abortEarly: false, // Retourner toutes les erreurs
            stripUnknown: true, // Supprimer les champs non définis dans le schéma
            convert: true // Convertir automatiquement les types
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));

            logger.security('Validation échouée', {
                ip: req.ip,
                url: req.originalUrl,
                method: req.method,
                property,
                errors: errors,
                userAgent: req.get('User-Agent')
            });

            return res.status(400).json({
                error: 'Données de validation invalides',
                details: errors
            });
        }

        // Remplacer les données validées et nettoyées
        if (property === 'params') {
            req.params = value;
        } else if (property === 'query') {
            req.query = value;
        } else {
            req.body = value;
        }

        next();
    };
};

// Middleware pour détecter et bloquer les vraies attaques XSS
const sanitizeInput = (req, res, next) => {
    // Champs qui peuvent contenir du texte libre (pas d'échappement HTML)
    const textFields = ['description', 'treatment_notes', 'resolution_notes', 'nom', 'prenom'];

    // Patterns d'attaques XSS à bloquer
    const xssPatterns = [
        /<script[\s\S]*?>[\s\S]*?<\/script>/gi,  // Balises script
        /javascript:/gi,                          // javascript: URLs
        /on\w+\s*=/gi,                           // Événements inline (onclick, onerror, etc.)
        /<iframe[\s\S]*?>/gi,                    // iframes
        /<object[\s\S]*?>/gi,                    // objects
        /<embed[\s\S]*?>/gi,                     // embeds
        /eval\s*\(/gi,                           // eval()
        /expression\s*\(/gi                      // CSS expressions
    ];

    const detectXSS = (str) => {
        if (typeof str !== 'string') return false;
        return xssPatterns.some(pattern => pattern.test(str));
    };

    const sanitizeObject = (obj, path = '') => {
        if (typeof obj !== 'object' || obj === null) return obj;

        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;

            if (typeof value === 'string') {
                // Vérifier si c'est un champ de texte libre
                const isTextField = textFields.includes(key);

                // Détecter les vraies attaques XSS
                if (detectXSS(value)) {
                    throw new Error(`Contenu dangereux détecté dans le champ: ${key}`);
                }

                // Pour les champs de texte libre, ne pas échapper les caractères normaux
                if (isTextField) {
                    sanitized[key] = value; // Stocker tel quel
                } else {
                    // Pour les autres champs, échapper uniquement < et >
                    sanitized[key] = value
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                }
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = sanitizeObject(value, currentPath);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    };

    try {
        req.body = sanitizeObject(req.body);
        req.query = sanitizeObject(req.query);
        next();
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};

// Middleware pour limiter la taille des requêtes
const limitRequestSize = (maxSize = '10mb') => {
    return (req, res, next) => {
        const contentLength = req.get('Content-Length');

        if (contentLength) {
            const sizeInBytes = parseInt(contentLength);
            const maxSizeInBytes = parseFloat(maxSize) * (maxSize.includes('mb') ? 1024 * 1024 : 1024);

            if (sizeInBytes > maxSizeInBytes) {
                logger.security('Requête trop volumineuse détectée', {
                    ip: req.ip,
                    contentLength: sizeInBytes,
                    maxSize: maxSizeInBytes,
                    url: req.originalUrl,
                    userAgent: req.get('User-Agent')
                });

                return res.status(413).json({
                    error: `Taille de requête trop importante. Maximum autorisé: ${maxSize}`
                });
            }
        }

        next();
    };
};

module.exports = {
    schemas,
    validate,
    sanitizeInput,
    limitRequestSize
};