// Script pour la page de déclaration
class DeclarationApp {
    constructor() {
        this.selectedTerrain = null;
        this.currentSession = null;
        this.init();
    }

    async init() {
        await this.loadStats();
        await this.checkActiveSession();
        this.setupEventListeners();
        this.setupModal();
        this.setupFormValidation();
    }

    async loadStats() {
        try {
            const stats = await DatabaseManager.getCurrentStats();
            document.getElementById('statusInterieur').textContent = `${stats.interieur} tireur(s)`;
            document.getElementById('statusExterieur').textContent = `${stats.exterieur} tireur(s)`;
        } catch (error) {
            Logger.error('Erreur chargement stats:', error);
        }
    }

    async checkActiveSession() {
        try {
            const activeSessions = await DatabaseManager.getActiveSessions();
            // Pour simplifier, on prend la dernière session active de l'utilisateur
            // Dans une vraie app, on identifierait l'utilisateur
            if (activeSessions.length > 0) {
                this.currentSession = activeSessions[activeSessions.length - 1];
                this.displayActiveSession();
            }
        } catch (error) {
            Logger.error('Erreur vérification session:', error);
        }
    }

    displayActiveSession() {
        if (!this.currentSession) return;

        // Remplir les détails de la session
        document.getElementById('sessionNom').textContent = this.currentSession.nom;
        document.getElementById('sessionPrenom').textContent = this.currentSession.prenom;
        document.getElementById('sessionType').textContent = this.getTypeLabel(this.currentSession.type_tireur);
        document.getElementById('sessionTerrain').textContent = this.getTerrainLabel(this.currentSession.terrain);
        document.getElementById('sessionNombre').textContent = this.currentSession.nombre_tireurs;
        document.getElementById('sessionDebut').textContent = this.formatDate(this.currentSession.date_debut);

        // Afficher la section session active
        document.getElementById('activeSession').classList.remove('hidden');

        // Masquer le formulaire de déclaration
        document.querySelector('.declaration-form').style.display = 'none';
        document.querySelector('.terrain-selection').style.display = 'none';
    }

    getTypeLabel(type) {
        const labels = {
            'club': 'Membre du club',
            'autre_club': 'Membre d\'un autre club',
            'service_sports': 'Service des sports de la mairie'
        };
        return labels[type] || type;
    }

    getTerrainLabel(terrain) {
        return terrain === 'interieur' ? 'Terrain Intérieur' : 'Terrain Extérieur';
    }

    setupEventListeners() {
        // Sélection du terrain
        document.querySelectorAll('.terrain-card').forEach(card => {
            card.addEventListener('click', () => this.selectTerrain(card));
        });

        // Formulaire de déclaration
        document.getElementById('declarationForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleDeclaration();
        });

        // Bouton annuler
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.goHome();
        });

        // Bouton terminer session
        const endSessionBtn = document.getElementById('endSessionBtn');
        if (endSessionBtn) {
            endSessionBtn.addEventListener('click', () => this.endSession());
        }

        // Bouton retour à l'accueil dans le header
        const homeBtn = document.getElementById('homeBtn');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => this.goHome());
        }

        // Boutons utilitaires
        document.getElementById('reportIncidentBtn').addEventListener('click', () => {
            this.showIncidentModal();
        });

        document.getElementById('callResponsibleBtn').addEventListener('click', () => {
            this.callResponsible();
        });

        // Formulaire incident
        document.getElementById('incidentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleIncidentReport();
        });

        // Gestion des photos d'incident
        this.setupPhotoHandling();
    }

    selectTerrain(card) {
        // Retirer la sélection précédente
        document.querySelectorAll('.terrain-card').forEach(c => c.classList.remove('selected'));

        // Sélectionner le nouveau terrain
        card.classList.add('selected');
        this.selectedTerrain = card.dataset.terrain;
        document.getElementById('terrainSelected').value = this.selectedTerrain;

        // Afficher le formulaire
        document.querySelector('.declaration-form').style.display = 'block';
        document.querySelector('.declaration-form').scrollIntoView({ behavior: 'smooth' });
    }

    async handleDeclaration() {
        if (!this.selectedTerrain) {
            if (window.ErrorHandler) {
                window.ErrorHandler.validationError('terrain', 'Veuillez sélectionner un terrain');
            }
            this.showNotification('Veuillez sélectionner un terrain', 'warning');
            return;
        }

        const form = document.getElementById('declarationForm');
        const formData = new FormData(form);
        const sessionData = {
            nom: formData.get('nom'),
            prenom: formData.get('prenom'),
            type_tireur: formData.get('type_tireur'),
            nombre_tireurs: formData.get('nombre_tireurs'),
            terrain: this.selectedTerrain
        };

        try {
            // Validation avec le système centralisé
            const validation = window.Validators.validateSession(sessionData);

            if (!validation.isValid) {
                // Afficher les erreurs de validation
                for (const [field, errors] of Object.entries(validation.errors)) {
                    const input = form.querySelector(`[name="${field}"]`);
                    if (input) {
                        input.classList.add('invalid');
                        window.Validators.showFieldErrorWithHandler(input, errors[0]);
                    }
                }

                this.showNotification('Veuillez corriger les erreurs du formulaire', 'warning');
                return;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<span class="spinner"></span> Validation...';
            submitBtn.disabled = true;

            // Créer la session
            const session = await DatabaseManager.createSession(sessionData);
            this.currentSession = session;

            this.showNotification('Présence enregistrée avec succès !', 'success');

            // Afficher la session active
            this.displayActiveSession();

            // Actualiser les stats
            await this.loadStats();

        } catch (error) {
            Logger.error('Erreur déclaration:', error);
            const errorMessage = error.message || 'Erreur lors de l\'enregistrement';

            if (window.ErrorHandler) {
                window.ErrorHandler.databaseError('handleDeclaration', errorMessage, sessionData);
            }

            this.showNotification(errorMessage, 'danger');
        } finally {
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '✅ Valider ma présence';
            submitBtn.disabled = false;
        }
    }

    // Configuration de la validation en temps réel
    setupFormValidation() {
        const form = document.getElementById('declarationForm');
        const incidentForm = document.getElementById('incidentForm');

        if (form && window.Validators) {
            // Schéma de validation pour le formulaire de déclaration
            const sessionSchema = {
                nom: [
                    'required',
                    { name: 'minLength', param: 2 },
                    { name: 'maxLength', param: 50 },
                    'alpha'
                ],
                prenom: [
                    'required',
                    { name: 'minLength', param: 2 },
                    { name: 'maxLength', param: 50 },
                    'alpha'
                ],
                type_tireur: [
                    'required',
                    'typeTireur'
                ],
                nombre_tireurs: [
                    'required',
                    'integer',
                    { name: 'min', param: 1 },
                    { name: 'max', param: 20 }
                ]
            };

            window.Validators.setupRealtimeValidation(form, sessionSchema);
        }

        if (incidentForm && window.Validators) {
            // Schéma de validation pour le formulaire d'incident
            const incidentSchema = {
                type_incident: [
                    'required',
                    'typeIncident'
                ],
                description: [
                    'required',
                    { name: 'minLength', param: 10 },
                    { name: 'maxLength', param: 1000 }
                ]
            };

            window.Validators.setupRealtimeValidation(incidentForm, incidentSchema);
        }
    }

    async endSession() {
        if (!this.currentSession) return;

        // Afficher le modal de confirmation
        this.showEndSessionModal();
    }

    async confirmEndSession() {
        if (!this.currentSession) return;

        try {
            const endBtn = document.getElementById('endSessionBtn');
            const confirmBtn = document.getElementById('confirmEndSession');

            endBtn.innerHTML = '<span class="spinner"></span> Fermeture...';
            endBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="spinner"></span> Fermeture...';
            confirmBtn.disabled = true;

            await DatabaseManager.endSession(this.currentSession.id);

            this.showNotification('Session terminée avec succès !', 'success');
            this.hideEndSessionModal();

            // Retourner à l'accueil après 2 secondes
            setTimeout(() => {
                this.goHome();
            }, 2000);

        } catch (error) {
            Logger.error('Erreur fin session:', error);
            this.showNotification('Erreur lors de la fermeture', 'danger');

            const endBtn = document.getElementById('endSessionBtn');
            const confirmBtn = document.getElementById('confirmEndSession');

            endBtn.innerHTML = '🏁 Terminer la session';
            endBtn.disabled = false;
            confirmBtn.innerHTML = '🏁 Oui, terminer la session';
            confirmBtn.disabled = false;

            this.hideEndSessionModal();
        }
    }

    showEndSessionModal() {
        document.getElementById('endSessionModal').classList.remove('hidden');
        document.getElementById('modalOverlay').classList.remove('hidden');
    }

    hideEndSessionModal() {
        document.getElementById('endSessionModal').classList.add('hidden');
        document.getElementById('modalOverlay').classList.add('hidden');
    }

    setupModal() {
        const incidentModal = document.getElementById('incidentModal');
        const endSessionModal = document.getElementById('endSessionModal');
        const overlay = document.getElementById('modalOverlay');
        const closeButtons = document.querySelectorAll('.modal-close');

        // Event listeners pour fermer les modaux
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideIncidentModal();
                this.hideEndSessionModal();
            });
        });

        overlay.addEventListener('click', () => {
            this.hideIncidentModal();
            this.hideEndSessionModal();
        });

        // Event listener pour confirmer la fin de session
        const confirmEndSessionBtn = document.getElementById('confirmEndSession');
        if (confirmEndSessionBtn) {
            confirmEndSessionBtn.addEventListener('click', () => {
                this.confirmEndSession();
            });
        }

        // Fermer avec Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!incidentModal.classList.contains('hidden')) {
                    this.hideIncidentModal();
                }
                if (!endSessionModal.classList.contains('hidden')) {
                    this.hideEndSessionModal();
                }
            }
        });
    }

    showIncidentModal() {
        // FIX: Rediriger vers la page dédiée de signalement d'incidents
        window.location.href = 'incident.html';
    }

    hideIncidentModal() {
        const modal = document.getElementById('incidentModal');
        const overlay = document.getElementById('modalOverlay');

        modal.classList.add('hidden');
        overlay.classList.add('hidden');

        // Réinitialiser le formulaire
        document.getElementById('incidentForm').reset();
    }

    async handleIncidentReport() {
        const form = document.getElementById('incidentForm');
        const formData = new FormData(form);

        const incidentData = {
            type_incident: formData.get('type_incident'),
            description: formData.get('description'),
            terrain: this.selectedTerrain || 'non_defini'
        };

        // Gestion de la photo
        const photo = formData.get('photo');
        if (photo && photo.size > 0) {
            // Dans une vraie application, on uploadrait la photo vers un serveur
            // Ici on simule en stockant le nom du fichier
            incidentData.photo_path = photo.name;
        }

        try {
            // Validation
            if (!this.validateIncident(incidentData)) {
                return;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<span class="spinner"></span> Envoi...';
            submitBtn.disabled = true;

            // Créer l'incident
            await DatabaseManager.createIncident(incidentData);

            this.showNotification('Incident signalé avec succès !', 'success');
            this.hideIncidentModal();

        } catch (error) {
            Logger.error('Erreur signalement incident:', error);
            this.showNotification('Erreur lors du signalement', 'danger');
        } finally {
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '📤 Envoyer le signalement';
            submitBtn.disabled = false;
        }
    }

    validateIncident(data) {
        if (!data.type_incident) {
            this.showNotification('Veuillez sélectionner le type d\'incident', 'warning');
            return false;
        }

        if (!data.description.trim()) {
            this.showNotification('La description est obligatoire', 'warning');
            return false;
        }

        if (data.description.trim().length < 10) {
            this.showNotification('La description doit contenir au moins 10 caractères', 'warning');
            return false;
        }

        return true;
    }

    async callResponsible() {
        try {
            const config = await DatabaseManager.getConfiguration();
            const phone = config.telephone_responsable;

            if (phone) {
                const confirmCall = confirm(`Appeler le responsable au ${phone} ?`);
                if (confirmCall) {
                    // Lancer l'appel téléphonique
                    window.location.href = `tel:${phone}`;
                }
            } else {
                this.showNotification('Numéro du responsable non configuré', 'warning');
            }
        } catch (error) {
            Logger.error('Erreur appel responsable:', error);
            this.showNotification('Erreur lors de l\'appel', 'danger');
        }
    }

    goHome() {
        window.location.href = 'index.html';
    }

    // Méthode pour formater les dates
    formatDate(dateString) {
        if (window.Utils && typeof Utils.formatDate === 'function') {
            return Utils.formatDate(dateString);
        } else {
            // Fallback simple pour formater les dates
            const date = new Date(dateString);
            return date.toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    // Méthode pour afficher les notifications
    showNotification(message, type = 'info') {
        if (window.Utils && typeof Utils.showNotification === 'function') {
            Utils.showNotification(message, type);
        } else {
            // Fallback si Utils n'est pas disponible
            Logger.debug(`[${type.toUpperCase()}] ${message}`);

            // Créer une notification simple
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideInRight 0.3s ease-out;
            `;

            // Couleurs selon le type
            const colors = {
                success: '#2E7D32',
                danger: '#D32F2F',
                warning: '#FF6F00',
                info: '#1976D2'
            };

            notification.style.backgroundColor = colors[type] || colors.info;

            document.body.appendChild(notification);

            // Suppression automatique
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 4000);
        }
    }

    setupPhotoHandling() {
        const cameraBtn = document.getElementById('cameraBtn');
        const galleryBtn = document.getElementById('galleryBtn');
        const photoInput = document.getElementById('photoIncident');
        const photoPreview = document.getElementById('photoPreview');
        const previewImg = document.getElementById('previewImg');
        const removePhotoBtn = document.getElementById('removePhoto');

        if (!cameraBtn || !galleryBtn || !photoInput) return;

        // Bouton caméra
        cameraBtn.addEventListener('click', () => {
            this.openCamera();
        });

        // Bouton galerie
        galleryBtn.addEventListener('click', () => {
            photoInput.accept = 'image/*';
            photoInput.removeAttribute('capture');
            photoInput.click();
        });

        // Gestion du changement de fichier
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handlePhotoSelection(file);
            }
        });

        // Bouton supprimer photo
        if (removePhotoBtn) {
            removePhotoBtn.addEventListener('click', () => {
                this.removePhoto();
            });
        }
    }

    openCamera() {
        const photoInput = document.getElementById('photoIncident');

        // Configurer pour ouvrir directement la caméra
        photoInput.accept = 'image/*';
        photoInput.setAttribute('capture', 'environment');
        photoInput.click();
    }

    handlePhotoSelection(file) {
        if (!file || !file.type.startsWith('image/')) {
            this.showNotification('Veuillez sélectionner une image valide', 'warning');
            return;
        }

        // Vérifier la taille du fichier (limite à 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('La photo est trop volumineuse (max 5MB)', 'warning');
            return;
        }

        // Créer un aperçu
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewImg = document.getElementById('previewImg');
            const photoPreview = document.getElementById('photoPreview');

            if (previewImg && photoPreview) {
                previewImg.src = e.target.result;
                photoPreview.classList.remove('hidden');

                // Masquer les boutons de sélection
                const photoButtons = document.querySelector('.photo-buttons');
                if (photoButtons) {
                    photoButtons.style.display = 'none';
                }
            }
        };
        reader.readAsDataURL(file);

        this.showNotification('Photo ajoutée avec succès', 'success');
    }

    removePhoto() {
        const photoInput = document.getElementById('photoIncident');
        const photoPreview = document.getElementById('photoPreview');
        const photoButtons = document.querySelector('.photo-buttons');

        // Réinitialiser l'input
        if (photoInput) {
            photoInput.value = '';
        }

        // Masquer l'aperçu
        if (photoPreview) {
            photoPreview.classList.add('hidden');
        }

        // Réafficher les boutons
        if (photoButtons) {
            photoButtons.style.display = 'flex';
        }

        this.showNotification('Photo supprimée', 'info');
    }
}

// Styles CSS additionnels pour les modals et photos
const additionalStyles = `
.photo-input-container {
    margin: 0.5rem 0;
}

.photo-buttons {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.photo-input.hidden {
    display: none;
}

.photo-preview {
    position: relative;
    margin-top: 1rem;
    text-align: center;
}

.preview-image {
    max-width: 100%;
    max-height: 200px;
    border-radius: var(--border-radius, 8px);
    border: 1px solid #ddd;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.remove-photo {
    margin-top: 0.5rem;
    border-radius: 20px;
}

.photo-buttons .btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.9rem;
}

@media (max-width: 768px) {
    .photo-buttons {
        flex-direction: column;
    }

    .photo-buttons .btn {
        width: 100%;
        justify-content: center;
    }

    .preview-image {
        max-height: 150px;
    }
}

.modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-hover);
    z-index: 1001;
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
    width: 500px;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
}

.modal-content {
    padding: 2rem;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
}

.modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--text-secondary);
    padding: 0.5rem;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-close:hover {
    background: var(--background-color);
}

.terrain-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
}

.session-card {
    background: linear-gradient(135deg, var(--surface-color) 0%, #F8F9FA 100%);
    border-radius: var(--border-radius);
    padding: 2rem;
    box-shadow: var(--shadow);
    border-left: 4px solid var(--primary-color);
}

.session-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}

.session-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: var(--primary-color);
}

.status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--primary-color);
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
}

.session-details {
    margin-bottom: 2rem;
}

.detail-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border-color);
}

.detail-item:last-child {
    border-bottom: none;
}

.utility-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
}

.utility-card {
    background: var(--surface-color);
    border-radius: var(--border-radius);
    padding: 2rem;
    text-align: center;
    box-shadow: var(--shadow);
    transition: var(--transition);
}

.utility-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-hover);
}

.utility-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.utility-card h3 {
    color: var(--primary-color);
    margin-bottom: 0.5rem;
}

.utility-card p {
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
}

.btn-accent {
    background: linear-gradient(135deg, var(--accent-color) 0%, #1565C0 100%);
    color: white;
}

.btn-accent:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-hover);
}

@media (max-width: 768px) {
    .modal {
        width: 90vw;
        margin: 20px;
        position: fixed;
        top: 20px;
        left: 20px;
        right: 20px;
        bottom: 20px;
        transform: none;
        max-height: calc(100vh - 40px);
    }

    .modal-content {
        padding: 1.5rem;
    }

    .terrain-cards {
        grid-template-columns: 1fr;
    }

    .utility-grid {
        grid-template-columns: 1fr;
    }

    .session-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
    }
}

.modal-body {
    margin-bottom: 2rem;
}

.modal-body p {
    margin-bottom: 1rem;
}

.text-warning {
    color: #FF6F00;
    font-weight: 500;
}

.modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
}

@media (max-width: 768px) {
    .modal-actions {
        flex-direction: column;
    }

    .modal-actions .btn {
        width: 100%;
    }
}
`;

// Ajouter les styles additionnels
const declarationStyleSheet = document.createElement('style');
declarationStyleSheet.textContent = additionalStyles;
document.head.appendChild(declarationStyleSheet);

// Initialiser l'application
document.addEventListener('DOMContentLoaded', () => {
    new DeclarationApp();
});