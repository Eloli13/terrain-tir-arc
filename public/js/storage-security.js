// Utilitaire de sécurité pour le stockage local
class StorageSecurity {
    // Clé de chiffrement dérivée de l'appareil (unique par navigateur)
    static encryptionKey = null;

    /**
     * Génère ou récupère une clé de chiffrement unique pour l'appareil
     */
    static async getEncryptionKey() {
        if (this.encryptionKey) {
            return this.encryptionKey;
        }

        // Vérifier si une clé existe déjà
        let keyData = sessionStorage.getItem('_sk');

        if (!keyData) {
            // Générer une nouvelle clé aléatoire
            const randomBytes = crypto.getRandomValues(new Uint8Array(32));
            keyData = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
            sessionStorage.setItem('_sk', keyData);
        }

        // Convertir en CryptoKey pour Web Crypto API
        const keyBuffer = new Uint8Array(keyData.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

        this.encryptionKey = await crypto.subtle.importKey(
            'raw',
            keyBuffer,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );

        return this.encryptionKey;
    }

    /**
     * Chiffre des données sensibles
     */
    static async encrypt(data) {
        try {
            const key = await this.getEncryptionKey();
            const iv = crypto.getRandomValues(new Uint8Array(12)); // Vecteur d'initialisation

            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(JSON.stringify(data));

            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                key,
                dataBuffer
            );

            // Combiner IV + données chiffrées
            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(encrypted), iv.length);

            // Convertir en base64 pour le stockage
            return btoa(String.fromCharCode.apply(null, combined));
        } catch (error) {
            Logger.error('Erreur de chiffrement:', error);
            return null;
        }
    }

    /**
     * Déchiffre des données
     */
    static async decrypt(encryptedData) {
        try {
            const key = await this.getEncryptionKey();

            // Convertir de base64
            const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

            // Extraire IV et données
            const iv = combined.slice(0, 12);
            const data = combined.slice(12);

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                key,
                data
            );

            const decoder = new TextDecoder();
            const jsonString = decoder.decode(decrypted);
            return JSON.parse(jsonString);
        } catch (error) {
            Logger.error('Erreur de déchiffrement:', error);
            return null;
        }
    }

    /**
     * Nettoie les données sensibles du localStorage
     */
    static sanitizeStorageData(data) {
        if (!data) return data;

        const sanitized = { ...data };

        // Supprimer le mot de passe admin s'il existe
        if (sanitized.configuration && sanitized.configuration.admin_password) {
            delete sanitized.configuration.admin_password;
        }

        return sanitized;
    }

    /**
     * Vérifie si des données sensibles sont exposées
     */
    static checkSecurityIssues() {
        const issues = [];

        // Vérifier le localStorage
        try {
            const tirArcDB = localStorage.getItem('tirArcDB');
            if (tirArcDB) {
                const data = JSON.parse(tirArcDB);

                if (data.configuration && data.configuration.admin_password) {
                    issues.push({
                        severity: 'HIGH',
                        location: 'localStorage.tirArcDB.configuration.admin_password',
                        message: 'Mot de passe admin stocké dans localStorage',
                        recommendation: 'Utiliser uniquement l\'API pour l\'authentification'
                    });
                }
            }
        } catch (error) {
            Logger.error('Erreur lors de la vérification de sécurité:', error);
        }

        // Vérifier les tokens JWT
        const authToken = localStorage.getItem('auth_token');
        const refreshToken = localStorage.getItem('refresh_token');

        if (authToken) {
            issues.push({
                severity: 'MEDIUM',
                location: 'localStorage.auth_token',
                message: 'Token JWT accessible dans localStorage',
                recommendation: 'Considérer httpOnly cookies ou sessionStorage'
            });
        }

        if (refreshToken) {
            issues.push({
                severity: 'HIGH',
                location: 'localStorage.refresh_token',
                message: 'Refresh token accessible dans localStorage',
                recommendation: 'Utiliser httpOnly cookies côté serveur'
            });
        }

        return issues;
    }

    /**
     * Génère un rapport de sécurité
     */
    static generateSecurityReport() {
        const issues = this.checkSecurityIssues();

        console.group('🔒 Rapport de Sécurité - Stockage Local');

        if (issues.length === 0) {
            Logger.debug('✅ Aucun problème de sécurité détecté');
        } else {
            Logger.warn(`⚠️ ${issues.length} problème(s) détecté(s):`);
            issues.forEach((issue, index) => {
                console.group(`${index + 1}. [${issue.severity}] ${issue.location}`);
                Logger.debug('Message:', issue.message);
                Logger.debug('Recommandation:', issue.recommendation);
                console.groupEnd();
            });
        }

        console.groupEnd();

        return issues;
    }

    /**
     * Nettoie toutes les données sensibles du localStorage
     */
    static cleanSensitiveData() {
        Logger.debug('🧹 Nettoyage des données sensibles...');

        // Récupérer les données actuelles
        const tirArcDB = localStorage.getItem('tirArcDB');
        if (tirArcDB) {
            try {
                const data = JSON.parse(tirArcDB);
                const sanitized = this.sanitizeStorageData(data);
                localStorage.setItem('tirArcDB', JSON.stringify(sanitized));
                Logger.debug('✅ Données sensibles supprimées du localStorage');
            } catch (error) {
                Logger.error('❌ Erreur lors du nettoyage:', error);
            }
        }
    }
}

// Exécuter un audit de sécurité au chargement (en mode développement uniquement)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            const issues = StorageSecurity.generateSecurityReport();

            if (issues.length > 0) {
                Logger.warn('💡 Conseil: Utilisez StorageSecurity.cleanSensitiveData() pour nettoyer les données exposées');
            }
        }, 2000); // Attendre que l'app initialise le localStorage
    });
}
