/**
 * Système de logging conditionnel pour l'application
 * En production, seules les erreurs critiques sont loggées
 * En développement, tous les logs sont affichés
 */

(function() {
    'use strict';

    class LoggerClass {
        constructor() {
            // Détection automatique de l'environnement
            // En production, window.location.hostname ne sera PAS localhost
            this.isDevelopment = this._detectEnvironment();
            this.isProduction = !this.isDevelopment;

            // Niveaux de log disponibles (du plus silencieux au plus verbeux)
            this.LOG_LEVELS = {
                SILENT: 0,    // Aucun log (sauf erreurs critiques)
                ERROR: 1,     // Erreurs uniquement
                WARN: 2,      // Erreurs + avertissements
                INFO: 3,      // Erreurs + avertissements + infos
                DEBUG: 4      // Tous les logs
            };

            // Niveau de log actuel (modifiable via setLogLevel)
            // Par défaut: ERROR en dev, SILENT en production
            this.currentLogLevel = this.isDevelopment ? this.LOG_LEVELS.ERROR : this.LOG_LEVELS.SILENT;

            // Charger le niveau depuis localStorage si disponible
            this._loadLogLevelFromStorage();
        }

        /**
         * Charge le niveau de log depuis localStorage
         * @private
         */
        _loadLogLevelFromStorage() {
            try {
                const savedLevel = localStorage.getItem('logLevel');
                if (savedLevel && this.LOG_LEVELS[savedLevel] !== undefined) {
                    this.currentLogLevel = this.LOG_LEVELS[savedLevel];
                }
            } catch (e) {
                // localStorage non disponible ou erreur, utiliser valeur par défaut
            }
        }

        /**
         * Sauvegarde le niveau de log dans localStorage
         * @private
         */
        _saveLogLevelToStorage(levelName) {
            try {
                localStorage.setItem('logLevel', levelName);
            } catch (e) {
                // localStorage non disponible, ignorer
            }
        }

        /**
         * Détecte l'environnement d'exécution
         * @returns {boolean} true si développement, false si production
         */
        _detectEnvironment() {
            const hostname = window.location.hostname;

            // Environnement de développement si:
            // - localhost, 127.0.0.1, ou IP locale
            // - URL contient 'dev', 'staging', 'test'
            const devPatterns = [
                'localhost',
                '127.0.0.1',
                '0.0.0.0',
                /^192\.168\./,
                /^10\./,
                /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
                /dev|staging|test|preprod/i
            ];

            return devPatterns.some(pattern => {
                if (typeof pattern === 'string') {
                    return hostname === pattern;
                }
                return pattern.test(hostname);
            });
        }

        /**
         * Log de débogage (niveau DEBUG)
         * @param {...any} args - Arguments à logger
         */
        debug(...args) {
            if (this.currentLogLevel >= this.LOG_LEVELS.DEBUG) {
                console.log('%c[DEBUG]', 'color: #888; font-weight: bold;', ...args);
            }
        }

        /**
         * Log d'information (niveau INFO)
         * @param {...any} args - Arguments à logger
         */
        info(...args) {
            if (this.currentLogLevel >= this.LOG_LEVELS.INFO) {
                console.log('%c[INFO]', 'color: #2196F3; font-weight: bold;', ...args);
            }
        }

        /**
         * Avertissement (niveau WARN)
         * @param {...any} args - Arguments à logger
         */
        warn(...args) {
            if (this.currentLogLevel >= this.LOG_LEVELS.WARN) {
                console.warn('%c[WARN]', 'color: #FF9800; font-weight: bold;', ...args);
            }
            // En production, pourrait envoyer à un service de monitoring
        }

        /**
         * Erreur (niveau ERROR - toujours loggée sauf mode SILENT)
         * @param {...any} args - Arguments à logger
         */
        error(...args) {
            if (this.currentLogLevel >= this.LOG_LEVELS.ERROR) {
                console.error('%c[ERROR]', 'color: #F44336; font-weight: bold;', ...args);
            }
            // En production, pourrait envoyer l'erreur à un service de monitoring
        }

        /**
         * Groupe de logs (niveau DEBUG)
         * @param {string} label - Label du groupe
         */
        group(label) {
            if (this.currentLogLevel >= this.LOG_LEVELS.DEBUG && console.group) {
                console.group(label);
            }
        }

        /**
         * Fin du groupe de logs (niveau DEBUG)
         */
        groupEnd() {
            if (this.currentLogLevel >= this.LOG_LEVELS.DEBUG && console.groupEnd) {
                console.groupEnd();
            }
        }

        /**
         * Table (niveau DEBUG)
         * @param {any} data - Données à afficher en table
         */
        table(data) {
            if (this.currentLogLevel >= this.LOG_LEVELS.DEBUG && console.table) {
                console.table(data);
            }
        }

        /**
         * Définir le niveau de log
         * @param {string} level - Niveau: 'SILENT', 'ERROR', 'WARN', 'INFO', 'DEBUG'
         * @example Logger.setLogLevel('ERROR') // Afficher uniquement les erreurs
         */
        setLogLevel(level) {
            const levelUpper = level.toUpperCase();
            if (this.LOG_LEVELS[levelUpper] !== undefined) {
                // Avertissement en production si niveau verbeux
                if (this.isProduction && (levelUpper === 'DEBUG' || levelUpper === 'INFO')) {
                    console.warn(
                        '%c⚠️ ATTENTION',
                        'color: #FF9800; font-weight: bold; font-size: 14px;',
                        `Vous activez le niveau ${levelUpper} en PRODUCTION. Cela peut exposer des informations sensibles.`
                    );
                }

                this.currentLogLevel = this.LOG_LEVELS[levelUpper];
                this._saveLogLevelToStorage(levelUpper);

                // Message de confirmation (seulement si niveau >= INFO pour éviter boucle)
                if (this.currentLogLevel >= this.LOG_LEVELS.INFO) {
                    console.log(
                        '%c✓ Niveau de log changé:',
                        'color: #4CAF50; font-weight: bold;',
                        levelUpper
                    );
                }
            } else {
                console.error(`Niveau de log invalide: ${level}. Valeurs acceptées: SILENT, ERROR, WARN, INFO, DEBUG`);
            }
        }

        /**
         * Obtenir le niveau de log actuel
         * @returns {string} Nom du niveau actuel
         */
        getLogLevel() {
            for (const [name, value] of Object.entries(this.LOG_LEVELS)) {
                if (value === this.currentLogLevel) {
                    return name;
                }
            }
            return 'UNKNOWN';
        }

        /**
         * Retourne l'état de l'environnement
         * @returns {string} 'development' ou 'production'
         */
        getEnvironment() {
            return this.isDevelopment ? 'development' : 'production';
        }

        /**
         * Force le mode développement (pour tests)
         * @param {boolean} isDev - true pour dev, false pour prod
         */
        setDevelopmentMode(isDev) {
            this.isDevelopment = isDev;
            this.isProduction = !isDev;
        }

        /**
         * Affiche l'aide sur l'utilisation du logger
         */
        help() {
            console.log('%c╔════════════════════════════════════════════════════════════════╗', 'color: #2196F3;');
            console.log('%c║              🔧 SYSTÈME DE LOGGING - AIDE                     ║', 'color: #2196F3; font-weight: bold;');
            console.log('%c╚════════════════════════════════════════════════════════════════╝', 'color: #2196F3;');
            console.log('');
            console.log('%cNiveaux disponibles:', 'font-weight: bold;');
            console.log('  • SILENT  - Aucun log (sauf critiques)');
            console.log('  • ERROR   - Erreurs uniquement (défaut)');
            console.log('  • WARN    - Erreurs + avertissements');
            console.log('  • INFO    - Erreurs + avertissements + informations');
            console.log('  • DEBUG   - Tous les logs (verbeux)');
            console.log('');
            console.log('%cCommandes:', 'font-weight: bold;');
            console.log('  Logger.setLogLevel("DEBUG")  - Activer tous les logs');
            console.log('  Logger.setLogLevel("ERROR")  - Désactiver les logs (défaut)');
            console.log('  Logger.setLogLevel("SILENT") - Aucun log');
            console.log('  Logger.getLogLevel()         - Voir niveau actuel');
            console.log('  Logger.help()                - Afficher cette aide');
            console.log('');
            console.log('%cNiveau actuel:', 'font-weight: bold;', this.getLogLevel());
            console.log('%cEnvironnement:', 'font-weight: bold;', this.getEnvironment());
        }
    }

    // Instance globale unique
    const loggerInstance = new LoggerClass();

    // Exporter vers window.Logger
    window.Logger = loggerInstance;

    // Exporter aussi comme variable globale pour compatibilité
    // Utilise globalThis pour être compatible navigateur/Node.js
    if (typeof globalThis !== 'undefined') {
        globalThis.Logger = loggerInstance;
    }

    // Export pour utilisation dans d'autres modules (Node.js)
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = loggerInstance;
    }
})();
