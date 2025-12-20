// Application principale
class TirArcApp {
    constructor() {
        this.isScanning = false;
        this.stream = null;
        this.init();
    }

    async init() {
        await this.loadCurrentStats();
        this.setupEventListeners();
        this.setupPWA();
    }

    setupEventListeners() {
        const startScanBtn = document.getElementById('startScan');

        if (startScanBtn) {
            startScanBtn.addEventListener('click', () => this.toggleScanner());
        }

        // Admin access modal
        this.setupAdminModal();

        // Actualiser les stats toutes les 30 secondes
        setInterval(() => this.loadCurrentStats(), 30000);
    }

    setupAdminModal() {
        const adminAccessBtn = document.getElementById('adminAccessBtn');
        const adminModal = document.getElementById('adminModal');
        const modalOverlay = document.getElementById('modalOverlay');
        const closeModalBtn = document.getElementById('closeAdminModal');
        const cancelBtn = document.getElementById('cancelAdminLogin');
        const adminForm = document.getElementById('adminLoginForm');
        const errorDiv = document.getElementById('adminLoginError');

        // Ouvrir le modal
        if (adminAccessBtn) {
            adminAccessBtn.addEventListener('click', () => {
                this.showAdminModal();
            });
        }

        // Fermer le modal
        const closeModal = () => {
            this.hideAdminModal();
        };

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeModal);
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeModal);
        }

        if (modalOverlay) {
            modalOverlay.addEventListener('click', closeModal);
        }

        // Gérer la soumission du formulaire
        if (adminForm) {
            adminForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAdminLogin();
            });
        }
    }

    showAdminModal() {
        const modal = document.getElementById('adminModal');
        const overlay = document.getElementById('modalOverlay');
        const errorDiv = document.getElementById('adminLoginError');
        const passwordInput = document.getElementById('adminPassword');

        if (modal && overlay) {
            modal.classList.remove('hidden');
            overlay.classList.remove('hidden');
            errorDiv.classList.add('hidden');
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    hideAdminModal() {
        const modal = document.getElementById('adminModal');
        const overlay = document.getElementById('modalOverlay');

        if (modal && overlay) {
            modal.classList.add('hidden');
            overlay.classList.add('hidden');
        }
    }

    async handleAdminLogin() {
        const passwordInput = document.getElementById('adminPassword');
        const errorDiv = document.getElementById('adminLoginError');
        const password = passwordInput.value;

        try {
            // Tenter la connexion via l'API d'abord
            if (DatabaseManager.useAPI) {
                try {
                    // Utiliser le username par défaut "admin"
                    const loginResult = await DatabaseManager.login('admin', password);

                    if (loginResult && loginResult.accessToken) {
                        // Stocker le flag must_change_password si présent
                        if (loginResult.mustChangePassword) {
                            localStorage.setItem('must_change_password', 'true');
                            Logger.warn('⚠️ Mot de passe par défaut détecté - changement requis');
                        } else {
                            localStorage.removeItem('must_change_password');
                        }

                        // Connexion réussie, rediriger vers la page admin
                        window.location.href = 'admin/index.html';
                        return;
                    }
                } catch (apiError) {
                    // Gestion spécifique du rate limiting
                    if (apiError.message === 'RATE_LIMIT_EXCEEDED') {
                        const waitTime = apiError.waitTime || 900; // 15 minutes par défaut
                        const formattedTime = this.formatWaitTime(waitTime);

                        Logger.warn('⚠️ Limite de tentatives dépassée. Temps restant:', formattedTime);

                        errorDiv.innerHTML = `
                            <strong>🚫 Trop de tentatives de connexion</strong><br>
                            <span style="font-size: 0.9em;">
                                Veuillez réessayer dans <strong>${formattedTime}</strong>.<br>
                                Cette limite protège le système contre les attaques.
                            </span>
                        `;
                        errorDiv.style.backgroundColor = '#FFF3E0';
                        errorDiv.style.color = '#E65100';
                        errorDiv.style.padding = '12px';
                        errorDiv.style.borderRadius = '8px';
                        errorDiv.style.border = '2px solid #FF9800';
                        errorDiv.classList.remove('hidden');
                        passwordInput.value = '';
                        passwordInput.disabled = true;

                        // Réactiver le champ après le délai
                        setTimeout(() => {
                            passwordInput.disabled = false;
                            errorDiv.classList.add('hidden');
                            errorDiv.style.backgroundColor = '';
                            errorDiv.style.color = '';
                            errorDiv.style.padding = '';
                            errorDiv.style.borderRadius = '';
                            errorDiv.style.border = '';
                        }, waitTime * 1000);

                        return;
                    }

                    Logger.warn('Échec connexion API:', apiError.message);
                    // Afficher l'erreur API
                    errorDiv.textContent = apiError.message || 'Mot de passe incorrect';
                    errorDiv.classList.remove('hidden');
                    passwordInput.value = '';
                    passwordInput.focus();
                    return;
                }
            }

            // Fallback localStorage (ancien système)
            const config = await DatabaseManager.getConfiguration();
            const hashedPassword = config.admin_password;

            const isValidPassword = await DatabaseManager.verifyPassword(password, hashedPassword);

            if (isValidPassword) {
                // Créer une session d'authentification locale (fallback)
                sessionStorage.setItem('adminAuthenticated', 'true');
                sessionStorage.setItem('adminSessionTime', Date.now().toString());

                // Rediriger vers la page admin
                window.location.href = 'admin/index.html';
            } else {
                // Afficher l'erreur
                errorDiv.textContent = 'Mot de passe incorrect';
                errorDiv.classList.remove('hidden');
                passwordInput.value = '';
                passwordInput.focus();
            }

        } catch (error) {
            Logger.error('Erreur lors de la connexion:', error);
            errorDiv.textContent = 'Erreur de connexion';
            errorDiv.classList.remove('hidden');
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    async toggleScanner() {
        const startScanBtn = document.getElementById('startScan');
        const scannerVideo = document.getElementById('scanner');
        const scanResult = document.getElementById('scanResult');

        if (!this.isScanning) {
            try {
                startScanBtn.innerHTML = '<span class="spinner"></span> Arrêter le Scanner';
                startScanBtn.classList.add('btn-danger');
                startScanBtn.classList.remove('btn-primary');

                // Demander l'accès à la caméra avec paramètres optimisés
                this.stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment', // Caméra arrière préférée
                        width: { ideal: 1280, max: 1920 },
                        height: { ideal: 720, max: 1080 },
                        frameRate: { ideal: 30, max: 60 }
                    }
                });

                scannerVideo.srcObject = this.stream;
                scannerVideo.style.display = 'block';
                await scannerVideo.play();

                this.isScanning = true;
                this.startQRDetection();

            } catch (error) {
                Logger.error('Erreur d\'accès à la caméra:', error);
                this.showScanResult('Erreur: Impossible d\'accéder à la caméra', 'error');
                this.stopScanner();
            }
        } else {
            this.stopScanner();
        }
    }

    stopScanner() {
        const startScanBtn = document.getElementById('startScan');
        const scannerVideo = document.getElementById('scanner');

        this.isScanning = false;

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        scannerVideo.style.display = 'none';
        startScanBtn.innerHTML = '📱 Démarrer le Scanner';
        startScanBtn.classList.remove('btn-danger');
        startScanBtn.classList.add('btn-primary');
    }

    async startQRDetection() {
        try {
            // Charger la bibliothèque jsQR si elle n'est pas disponible
            if (typeof jsQR === 'undefined') {
                await this.loadJsQRLibrary();
            }

            const scannerVideo = document.getElementById('scanner');
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            const detectQR = () => {
                if (!this.isScanning) return;

                if (scannerVideo.readyState === scannerVideo.HAVE_ENOUGH_DATA) {
                    canvas.width = scannerVideo.videoWidth;
                    canvas.height = scannerVideo.videoHeight;
                    context.drawImage(scannerVideo, 0, 0, canvas.width, canvas.height);

                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

                    try {
                        const code = jsQR(imageData.data, canvas.width, canvas.height);

                        if (code) {
                            this.handleQRCode(code.data);
                            this.stopScanner();
                            return;
                        }
                    } catch (error) {
                        Logger.warn('Erreur détection QR:', error);
                    }
                }

                requestAnimationFrame(detectQR);
            };

            // Démarrer la détection quand la vidéo est prête
            if (scannerVideo.readyState >= scannerVideo.HAVE_METADATA) {
                detectQR();
            } else {
                scannerVideo.addEventListener('loadedmetadata', detectQR, { once: true });
            }

        } catch (error) {
            Logger.error('Erreur initialisation scanner:', error);
            this.showScanResult('Erreur d\'initialisation du scanner', 'error');
        }
    }

    // Charger la bibliothèque jsQR dynamiquement
    async loadJsQRLibrary() {
        return new Promise((resolve, reject) => {
            if (typeof jsQR !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
            script.onload = () => {
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Impossible de charger jsQR'));
            };

            // Éviter de charger plusieurs fois
            if (!document.querySelector('script[src*="jsqr"]')) {
                document.head.appendChild(script);
            } else {
                resolve();
            }
        });
    }

    handleQRCode(data) {
        Logger.debug('QR Code détecté:', data);

        // Vérifier si c'est un QR code valide pour l'application
        if (this.isValidQRCode(data)) {
            this.showScanResult('QR Code valide ! Redirection...', 'success');
            setTimeout(() => {
                this.goToDeclaration();
            }, 1500);
        } else {
            this.showScanResult('QR Code non valide pour cette application', 'error');
        }
    }

    isValidQRCode(data) {
        // Vérifier si le QR code contient l'URL de l'application
        return data.includes('terrain') || data.includes('tir') ||
               data.includes(window.location.hostname) ||
               data === 'TERRAIN_TIR_ARC_ACCESS' ||
               data.includes('test') || data.includes('TEST'); // Pour les tests
    }

    showScanResult(message, type) {
        const scanResult = document.getElementById('scanResult');
        scanResult.className = `scan-result alert alert-${type === 'success' ? 'success' : 'danger'}`;
        scanResult.textContent = message;
        scanResult.classList.remove('hidden');

        if (type === 'error') {
            setTimeout(() => {
                scanResult.classList.add('hidden');
            }, 3000);
        }
    }

    goToDeclaration() {
        // Rediriger vers la page de déclaration
        window.location.href = 'declaration.html';
    }

    async loadCurrentStats() {
        try {
            const stats = await DatabaseManager.getCurrentStats();
            document.getElementById('countInterieur').textContent = stats.interieur;
            document.getElementById('countExterieur').textContent = stats.exterieur;
        } catch (error) {
            Logger.error('Erreur lors du chargement des statistiques:', error);
        }
    }

    // Configuration PWA
    setupPWA() {
        // Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    Logger.debug('Service Worker enregistré:', registration);
                })
                .catch(error => {
                    Logger.debug('Erreur Service Worker:', error);
                });
        }

        // Bouton d'installation
        let deferredPrompt;
        const installPrompt = document.createElement('div');
        installPrompt.className = 'install-prompt';
        installPrompt.innerHTML = `
            <div>
                <strong>Installer l'application</strong>
                <p>Accédez rapidement aux terrains depuis votre écran d'accueil</p>
            </div>
            <div>
                <button id="installBtn">Installer</button>
                <button id="dismissBtn">✕</button>
            </div>
        `;
        document.body.appendChild(installPrompt);

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installPrompt.classList.add('show');
        });

        document.getElementById('installBtn').addEventListener('click', () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((result) => {
                    deferredPrompt = null;
                    installPrompt.classList.remove('show');
                });
            }
        });

        document.getElementById('dismissBtn').addEventListener('click', () => {
            installPrompt.classList.remove('show');
        });
    }

    /**
     * Formate le temps d'attente en secondes en format lisible
     * @param {number} seconds - Temps en secondes
     * @returns {string} - Temps formaté (ex: "15 minutes", "2 minutes 30 secondes")
     */
    formatWaitTime(seconds) {
        if (seconds < 60) {
            return `${seconds} seconde${seconds > 1 ? 's' : ''}`;
        }

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        if (remainingSeconds === 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''}`;
        }

        return `${minutes} minute${minutes > 1 ? 's' : ''} et ${remainingSeconds} seconde${remainingSeconds > 1 ? 's' : ''}`;
    }
}

// Utilitaires
const Utils = {
    formatDate: (date) => {
        return new Date(date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    formatDuration: (start, end) => {
        const duration = new Date(end) - new Date(start);
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}min`;
    },

    showNotification: (message, type = 'info') => {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type}`;
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '1000';
        notification.style.minWidth = '300px';

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    },

    validateEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    validatePhone: (phone) => {
        const re = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
        return re.test(phone);
    }
};

// Initialiser l'application quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
    new TirArcApp();
});

// Gestion des erreurs globales
window.addEventListener('error', (e) => {
    Logger.error('Erreur globale:', e.error);
    Utils.showNotification('Une erreur est survenue', 'danger');
});

window.addEventListener('unhandledrejection', (e) => {
    Logger.error('Promise rejetée:', e.reason);
    Utils.showNotification('Erreur de connexion', 'danger');
});