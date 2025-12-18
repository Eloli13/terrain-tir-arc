// Système de validation centralisé
class Validators {
    constructor() {
        this.rules = new Map();
        this.messages = new Map();
        this.setupDefaultRules();
        this.setupDefaultMessages();
    }

    // Configuration des règles par défaut
    setupDefaultRules() {
        // Règles de base
        this.rules.set('required', (value) => {
            return value !== null && value !== undefined && value.toString().trim() !== '';
        });

        this.rules.set('email', (value) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value);
        });

        this.rules.set('phone', (value) => {
            const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
            return phoneRegex.test(value.replace(/\s/g, ''));
        });

        this.rules.set('minLength', (value, length) => {
            return value && value.toString().length >= length;
        });

        this.rules.set('maxLength', (value, length) => {
            return !value || value.toString().length <= length;
        });

        this.rules.set('min', (value, min) => {
            const num = parseFloat(value);
            return !isNaN(num) && num >= min;
        });

        this.rules.set('max', (value, max) => {
            const num = parseFloat(value);
            return !isNaN(num) && num <= max;
        });

        this.rules.set('numeric', (value) => {
            return !isNaN(parseFloat(value)) && isFinite(value);
        });

        this.rules.set('integer', (value) => {
            const num = parseInt(value);
            return !isNaN(num) && num.toString() === value.toString();
        });

        this.rules.set('alpha', (value) => {
            const alphaRegex = /^[A-Za-zÀ-ÿ\s]+$/;
            return alphaRegex.test(value);
        });

        this.rules.set('alphanumeric', (value) => {
            const alphaNumRegex = /^[A-Za-z0-9À-ÿ\s]+$/;
            return alphaNumRegex.test(value);
        });

        // Règles spécifiques au domaine
        this.rules.set('terrain', (value) => {
            return ['interieur', 'exterieur'].includes(value);
        });

        this.rules.set('typeTireur', (value) => {
            return ['club', 'autre_club', 'service_sports'].includes(value);
        });

        this.rules.set('statutIncident', (value) => {
            return ['en_attente', 'en_cours', 'resolu'].includes(value);
        });

        this.rules.set('typeIncident', (value) => {
            const validTypes = [
                'Équipement défaillant',
                'Problème de sécurité',
                'Dégradation',
                'Accident',
                'Autre'
            ];
            return validTypes.includes(value);
        });
    }

    // Messages d'erreur par défaut
    setupDefaultMessages() {
        this.messages.set('required', 'Ce champ est obligatoire');
        this.messages.set('email', 'Format d\'email invalide');
        this.messages.set('phone', 'Numéro de téléphone invalide');
        this.messages.set('minLength', 'Doit contenir au moins {param} caractères');
        this.messages.set('maxLength', 'Ne peut dépasser {param} caractères');
        this.messages.set('min', 'Doit être supérieur ou égal à {param}');
        this.messages.set('max', 'Doit être inférieur ou égal à {param}');
        this.messages.set('numeric', 'Doit être un nombre');
        this.messages.set('integer', 'Doit être un nombre entier');
        this.messages.set('alpha', 'Ne peut contenir que des lettres');
        this.messages.set('alphanumeric', 'Ne peut contenir que des lettres et des chiffres');
        this.messages.set('terrain', 'Terrain invalide');
        this.messages.set('typeTireur', 'Type de tireur invalide');
        this.messages.set('statutIncident', 'Statut d\'incident invalide');
        this.messages.set('typeIncident', 'Type d\'incident invalide');
    }

    // Valider une valeur avec une règle
    validate(value, rule, param = null) {
        if (!this.rules.has(rule)) {
            throw new Error(`Règle de validation inconnue: ${rule}`);
        }

        const validator = this.rules.get(rule);
        return param !== null ? validator(value, param) : validator(value);
    }

    // Valider un objet avec un schéma de règles
    validateObject(data, schema) {
        const errors = {};
        const warnings = {};

        for (const [field, rules] of Object.entries(schema)) {
            const value = data[field];
            const fieldErrors = [];
            const fieldWarnings = [];

            // Traiter chaque règle du champ
            for (const rule of rules) {
                let ruleName, param, message, severity;

                if (typeof rule === 'string') {
                    ruleName = rule;
                } else if (typeof rule === 'object') {
                    ruleName = rule.name;
                    param = rule.param;
                    message = rule.message;
                    severity = rule.severity || 'error';
                }

                // Ignorer les autres règles si required échoue et que la valeur est vide
                if (ruleName !== 'required' && (!value || value.toString().trim() === '')) {
                    continue;
                }

                // Valider
                const isValid = this.validate(value, ruleName, param);

                if (!isValid) {
                    const errorMessage = message || this.getErrorMessage(ruleName, param, field);

                    if (severity === 'warning') {
                        fieldWarnings.push(errorMessage);
                    } else {
                        fieldErrors.push(errorMessage);
                    }
                }
            }

            if (fieldErrors.length > 0) {
                errors[field] = fieldErrors;
            }

            if (fieldWarnings.length > 0) {
                warnings[field] = fieldWarnings;
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors,
            warnings,
            hasErrors: Object.keys(errors).length > 0,
            hasWarnings: Object.keys(warnings).length > 0
        };
    }

    // Obtenir le message d'erreur formaté
    getErrorMessage(rule, param, field) {
        let message = this.messages.get(rule) || `Validation ${rule} échouée`;

        // Remplacer les placeholders
        if (param !== null) {
            message = message.replace('{param}', param);
        }

        message = message.replace('{field}', field);

        return message;
    }

    // Valider les données de session
    validateSession(sessionData) {
        const schema = {
            nom: [
                'required',
                { name: 'minLength', param: 2, message: 'Le nom doit contenir au moins 2 caractères' },
                { name: 'maxLength', param: 50 },
                { name: 'alpha', message: 'Le nom ne peut contenir que des lettres' }
            ],
            prenom: [
                'required',
                { name: 'minLength', param: 2, message: 'Le prénom doit contenir au moins 2 caractères' },
                { name: 'maxLength', param: 50 },
                { name: 'alpha', message: 'Le prénom ne peut contenir que des lettres' }
            ],
            type_tireur: [
                'required',
                'typeTireur'
            ],
            nombre_tireurs: [
                'required',
                'integer',
                { name: 'min', param: 1, message: 'Il doit y avoir au moins 1 tireur' },
                { name: 'max', param: 20, message: 'Maximum 20 tireurs autorisés' }
            ],
            terrain: [
                'required',
                'terrain'
            ]
        };

        return this.validateObject(sessionData, schema);
    }

    // Valider les données d'incident
    validateIncident(incidentData) {
        const schema = {
            type_incident: [
                'required',
                'typeIncident'
            ],
            description: [
                'required',
                { name: 'minLength', param: 10, message: 'La description doit contenir au moins 10 caractères' },
                { name: 'maxLength', param: 1000, message: 'La description ne peut dépasser 1000 caractères' }
            ],
            terrain: [
                { name: 'terrain', severity: 'warning', message: 'Terrain non spécifié' }
            ]
        };

        return this.validateObject(incidentData, schema);
    }

    // Valider la configuration
    validateConfiguration(configData) {
        const schema = {
            telephone_responsable: [
                'required',
                'phone'
            ],
            email_incidents: [
                'required',
                'email'
            ]
        };

        return this.validateObject(configData, schema);
    }

    // Validation en temps réel pour les formulaires
    setupRealtimeValidation(form, schema) {
        const inputs = form.querySelectorAll('input, select, textarea');

        inputs.forEach(input => {
            const fieldName = input.name;
            const fieldRules = schema[fieldName];

            if (!fieldRules) return;

            // Validation uniquement lors de la perte de focus pour éviter d'interrompre la saisie
            input.addEventListener('blur', () => {
                this.validateField(input, fieldRules, fieldName);
            });

            // Pour les select, validation immédiate car pas de saisie continue
            if (input.tagName.toLowerCase() === 'select') {
                input.addEventListener('change', () => {
                    this.validateField(input, fieldRules, fieldName);
                });
            }
        });
    }

    // Valider un champ individuel
    validateField(input, rules, fieldName) {
        const value = input.value;
        const validation = this.validateObject({ [fieldName]: value }, { [fieldName]: rules });

        // Retirer les classes de validation précédentes
        input.classList.remove('valid', 'invalid', 'warning');

        // Supprimer les messages d'erreur précédents
        const existingError = input.parentElement.querySelector('.validation-message');
        if (existingError) {
            existingError.remove();
        }

        // Appliquer les nouveaux états
        if (validation.hasErrors) {
            input.classList.add('invalid');
            this.showFieldError(input, validation.errors[fieldName][0]);
        } else if (validation.hasWarnings) {
            input.classList.add('warning');
            this.showFieldWarning(input, validation.warnings[fieldName][0]);
        } else if (value && value.trim() !== '') {
            input.classList.add('valid');
        }

        return validation.isValid;
    }

    // Afficher erreur de champ
    showFieldError(input, message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'validation-message validation-error';
        errorElement.textContent = message;

        // Insérer après l'input
        input.parentElement.appendChild(errorElement);

        // Note: ErrorHandler n'est appelé que lors de la soumission du formulaire
        // pour éviter le spam de la console pendant la saisie
    }

    // Afficher erreur de champ avec ErrorHandler (pour soumission de formulaire)
    showFieldErrorWithHandler(input, message) {
        this.showFieldError(input, message);

        // Gérer l'erreur via le système centralisé uniquement lors de la soumission
        if (window.ErrorHandler) {
            window.ErrorHandler.validationError(input.name, message, input.value);
        }
    }

    // Afficher avertissement de champ
    showFieldWarning(input, message) {
        const warningElement = document.createElement('div');
        warningElement.className = 'validation-message validation-warning';
        warningElement.textContent = message;

        input.parentElement.appendChild(warningElement);
    }

    // Ajouter une règle personnalisée
    addRule(name, validator, message) {
        this.rules.set(name, validator);
        this.messages.set(name, message);
    }

    // Modifier un message d'erreur
    setMessage(rule, message) {
        this.messages.set(rule, message);
    }

    // Valider un formulaire complet
    validateForm(form, schema) {
        const formData = new FormData(form);
        const data = {};

        // Convertir FormData en objet
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }

        const validation = this.validateObject(data, schema);

        // Nettoyer les messages précédents
        form.querySelectorAll('.validation-message').forEach(msg => msg.remove());
        form.querySelectorAll('input, select, textarea').forEach(input => {
            input.classList.remove('valid', 'invalid', 'warning');
        });

        // Afficher les erreurs
        for (const [field, errors] of Object.entries(validation.errors)) {
            const input = form.querySelector(`[name="${field}"]`);
            if (input) {
                input.classList.add('invalid');
                this.showFieldError(input, errors[0]);
            }
        }

        // Afficher les avertissements
        for (const [field, warnings] of Object.entries(validation.warnings)) {
            const input = form.querySelector(`[name="${field}"]`);
            if (input && !input.classList.contains('invalid')) {
                input.classList.add('warning');
                this.showFieldWarning(input, warnings[0]);
            }
        }

        // Marquer les champs valides
        for (const [field] of Object.entries(data)) {
            if (!validation.errors[field] && !validation.warnings[field]) {
                const input = form.querySelector(`[name="${field}"]`);
                if (input && input.value.trim() !== '') {
                    input.classList.add('valid');
                }
            }
        }

        return validation;
    }
}

// Styles CSS pour la validation
const validationStyles = `
    .validation-message {
        font-size: 0.875rem;
        margin-top: 0.25rem;
        padding: 0.25rem 0;
    }

    .validation-error {
        color: #D32F2F;
    }

    .validation-warning {
        color: #FF6F00;
    }

    .form-control.valid {
        border-color: #2E7D32;
        box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.1);
    }

    .form-control.invalid {
        border-color: #D32F2F;
        box-shadow: 0 0 0 2px rgba(211, 47, 47, 0.1);
    }

    .form-control.warning {
        border-color: #FF6F00;
        box-shadow: 0 0 0 2px rgba(255, 111, 0, 0.1);
    }

    .form-control.valid:focus {
        border-color: #2E7D32;
        box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.2);
    }

    .form-control.invalid:focus {
        border-color: #D32F2F;
        box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.2);
    }

    .form-control.warning:focus {
        border-color: #FF6F00;
        box-shadow: 0 0 0 3px rgba(255, 111, 0, 0.2);
    }
`;

// Ajouter les styles au document
const validationStyleSheet = document.createElement('style');
validationStyleSheet.textContent = validationStyles;
document.head.appendChild(validationStyleSheet);

// Créer l'instance globale
window.Validators = new Validators();

// Export pour les modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Validators;
}