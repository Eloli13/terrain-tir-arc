// Bibliothèque QR Scanner utilisant jsQR
// Chargement automatique de jsQR depuis le CDN

// Fonction utilitaire pour télécharger et inclure jsQR
async function loadQRLibrary() {
    return new Promise((resolve, reject) => {
        // Si jsQR est déjà chargé, pas besoin de le recharger
        if (window.jsQR) {
            resolve();
            return;
        }

        // Vérifier si le script existe déjà
        const existingScript = document.querySelector('script[src*="jsqr"]');
        if (existingScript) {
            // Attendre un peu que le script se charge
            setTimeout(() => {
                if (window.jsQR) {
                    resolve();
                } else {
                    reject(new Error('Script jsQR présent mais non fonctionnel'));
                }
            }, 500);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
        script.onload = () => {
            setTimeout(() => {
                if (window.jsQR) {
                    resolve();
                } else {
                    reject(new Error('jsQR non disponible après chargement'));
                }
            }, 100);
        };
        script.onerror = () => reject(new Error('Impossible de charger la bibliothèque jsQR'));
        document.head.appendChild(script);
    });
}

// Charger jsQR automatiquement au chargement de ce script
loadQRLibrary().catch(error => {
    Logger.warn('Avertissement:', error.message);
});

// Classe QRScanner personnalisée
class QRScanner {
    constructor(video) {
        this.video = video;
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
        this.isScanning = false;
    }

    async start() {
        try {
            await loadQRLibrary();

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 640 }
                }
            });

            this.video.srcObject = stream;
            await this.video.play();
            this.isScanning = true;

            return stream;
        } catch (error) {
            throw new Error(`Erreur d'accès caméra: ${error.message}`);
        }
    }

    stop() {
        this.isScanning = false;
        if (this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
            this.video.srcObject = null;
        }
    }

    scan() {
        return new Promise((resolve) => {
            const detectFrame = () => {
                if (!this.isScanning) {
                    resolve(null);
                    return;
                }

                if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
                    this.canvas.width = this.video.videoWidth;
                    this.canvas.height = this.video.videoHeight;
                    this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

                    const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);

                    // Utiliser jsQR ou mode test
                    let code = null;
                    if (window.jsQR && !window.qrTestMode) {
                        code = window.jsQR(imageData.data, this.canvas.width, this.canvas.height);
                    } else if (window.qrTestMode) {
                        // Simulation pour le développement
                        setTimeout(() => {
                            code = { data: 'TERRAIN_TIR_ARC_ACCESS' };
                            resolve(code);
                        }, 3000); // Simule une détection après 3 secondes
                        return;
                    }

                    if (code) {
                        resolve(code);
                        return;
                    }
                }

                requestAnimationFrame(detectFrame);
            };

            detectFrame();
        });
    }
}

// Fonction d'initialisation globale
window.QRScanner = QRScanner;