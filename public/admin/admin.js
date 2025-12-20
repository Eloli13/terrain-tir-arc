// Script pour l'administration
class AdminApp {
    constructor() {
        this.currentChart = null;
        this.currentIncidents = [];
        this.lastPhotoMessage = null;
        this.websocketClient = null;
        this.notificationCount = 0;
        this.notificationPanelOpen = false;
        this.init();
    }

    // Échapper les caractères HTML pour éviter les injections et erreurs de syntaxe
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async init() {
        // Vérifier l'authentification avant tout
        if (!this.checkAuthentication()) {
            this.redirectToLogin();
            return;
        }

        // Vérifier si le mot de passe doit être changé
        this.checkPasswordChangeRequired();

        await this.loadDashboard();
        this.setupNavigation();
        this.setupEventListeners();
        this.setupModals();
        this.setupLogout();
        this.setupWebSocket();
        this.setupNotificationUI();
    }

    checkAuthentication() {
        // Vérifier si l'utilisateur a un token JWT valide
        const token = DatabaseManager.getAuthToken();

        if (!token) {
            return false;
        }

        // Le token sera automatiquement validé lors des requêtes API
        // Si le token est expiré, DatabaseManager.refreshToken() sera appelé automatiquement
        return true;
    }

    redirectToLogin() {
        // Rediriger vers la page principale sans message
        window.location.href = '../index.html';
    }

    checkPasswordChangeRequired() {
        // Vérifier si le mot de passe doit être changé
        const mustChangePassword = localStorage.getItem('must_change_password');

        if (mustChangePassword === 'true') {
            this.showPasswordChangeWarning();
        }
    }

    showPasswordChangeWarning() {
        // Créer une bannière d'avertissement persistante
        const warningBanner = document.createElement('div');
        warningBanner.id = 'password-change-warning';
        warningBanner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);
            color: white;
            padding: 16px 24px;
            text-align: center;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 16px;
            animation: slideDown 0.3s ease-out;
        `;

        warningBanner.innerHTML = `
            <span style="font-size: 1.1em;">
                🔒 <strong>SÉCURITÉ :</strong> Vous utilisez le mot de passe par défaut.
                Veuillez le changer immédiatement pour sécuriser votre compte.
            </span>
            <button id="changePasswordBtn" style="
                background: white;
                color: #FF6B6B;
                border: none;
                padding: 8px 20px;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            ">
                Changer maintenant
            </button>
        `;

        // Ajouter l'animation CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from {
                    transform: translateY(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            #changePasswordBtn:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
        `;
        document.head.appendChild(style);

        // Ajouter la bannière au début du body
        document.body.insertBefore(warningBanner, document.body.firstChild);

        // Ajuster le padding du contenu principal pour ne pas être caché par la bannière
        document.body.style.paddingTop = '70px';

        // Gérer le clic sur le bouton "Changer maintenant"
        document.getElementById('changePasswordBtn').addEventListener('click', () => {
            // Naviguer vers la section paramètres
            this.showSection('parametres');
            // Synchroniser l'état actif
            this.syncActiveStates('parametres');
            // Scroll vers le formulaire de changement de mot de passe
            setTimeout(() => {
                const passwordSection = document.querySelector('#parametres');
                if (passwordSection) {
                    passwordSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        });

        Logger.warn('⚠️ Bannière de changement de mot de passe affichée');
    }

    setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
    }

    async logout() {
        // Déconnexion via l'API
        await DatabaseManager.logout();

        // Rediriger vers la page principale
        window.location.href = '../index.html';
    }

    setupNavigation() {
        // Navigation tabs (desktop et mobile)
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const section = tab.dataset.section;
                this.showSection(section);

                // Synchroniser les états actifs entre desktop et mobile
                this.syncActiveStates(section);

                // Update mobile dropdown toggle text
                const toggleBtn = document.getElementById('navToggle');
                const dropdown = document.getElementById('navDropdown');
                if (toggleBtn) {
                    toggleBtn.textContent = tab.textContent + ' ▼';
                    if (dropdown) {
                        dropdown.classList.remove('show');
                    }
                }
            });
        });

        // Mobile dropdown toggle
        const navToggle = document.getElementById('navToggle');
        const navDropdown = document.getElementById('navDropdown');

        if (navToggle && navDropdown) {
            navToggle.addEventListener('click', () => {
                navDropdown.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!navToggle.contains(e.target) && !navDropdown.contains(e.target)) {
                    navDropdown.classList.remove('show');
                }
            });
        }
    }

    syncActiveStates(activeSection) {
        // Désactiver tous les onglets (desktop et mobile)
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Activer les onglets correspondants (desktop et mobile)
        document.querySelectorAll(`.nav-tab[data-section="${activeSection}"]`).forEach(tab => {
            tab.classList.add('active');
        });
    }

    showSection(sectionId) {
        // Masquer toutes les sections
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });

        // Activer la section sélectionnée
        document.getElementById(sectionId).classList.add('active');

        // Synchroniser les états actifs entre desktop et mobile
        this.syncActiveStates(sectionId);

        // Charger les données spécifiques à la section
        this.loadSectionData(sectionId);
    }

    async loadSectionData(sectionId) {
        switch (sectionId) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'configuration':
                await this.loadConfiguration();
                break;
            case 'frequentation':
                await this.loadFrequentation();
                break;
            case 'incidents':
                await this.loadIncidents();
                break;
            case 'qrcode':
                await this.loadQRCodeSection();
                break;
        }
    }

    async loadDashboard() {
        try {
            const [stats, activeSessions, allIncidents] = await Promise.all([
                DatabaseManager.getCurrentStats(),
                DatabaseManager.getActiveSessions(),
                DatabaseManager.getAllIncidents()
            ]);

            // Compter les incidents ouverts (en_attente ou en_cours)
            const openIncidents = allIncidents.filter(i =>
                i.statut === 'en_attente' || i.statut === 'en_cours'
            );

            // Mettre à jour les statistiques
            document.getElementById('activeShooters').textContent = stats.interieur + stats.exterieur;
            document.getElementById('indoorCount').textContent = stats.interieur;
            document.getElementById('outdoorCount').textContent = stats.exterieur;
            document.getElementById('openIncidents').textContent = openIncidents.length;

            // Charger les sessions récentes
            this.displayRecentSessions(activeSessions);

        } catch (error) {
            Logger.error('Erreur chargement tableau de bord:', error);
        }
    }

    displayRecentSessions(sessions) {
        const container = document.getElementById('recentSessions');

        if (sessions.length === 0) {
            container.innerHTML = '<p class="text-center text-secondary">Aucune session active</p>';
            return;
        }

        container.innerHTML = sessions.map(session => `
            <div class="activity-item">
                <div class="activity-info">
                    <strong>${session.nom} ${session.prenom}</strong>
                    <span class="activity-meta">
                        ${this.getTerrainLabel(session.terrain)} •
                        ${session.nombre_tireurs} tireur(s) •
                        ${this.formatDate(session.date_debut)}
                    </span>
                </div>
                <div class="activity-status">
                    <span class="status-badge active">Actif</span>
                </div>
            </div>
        `).join('');
    }

    async loadConfiguration() {
        try {
            const config = await DatabaseManager.getConfiguration();

            document.getElementById('phoneNumber').value = config.telephone_responsable || '';

        } catch (error) {
            Logger.error('Erreur chargement configuration:', error);
        }
    }

    async loadFrequentation() {
        try {
            const sessions = await DatabaseManager.getAllSessions();
            this.displayFrequentationChart(sessions);
            this.displayFrequentationTable(sessions);

        } catch (error) {
            Logger.error('Erreur chargement fréquentation:', error);
        }
    }

    displayFrequentationChart(sessions) {
        const ctx = document.getElementById('frequentationChart').getContext('2d');

        if (this.currentChart) {
            this.currentChart.destroy();
        }

        // Préparer les données pour le graphique
        const dailyData = this.aggregateSessionsByDay(sessions);
        const labels = dailyData.map(d => d.date);
        const interieurData = dailyData.map(d => d.interieur);
        const exterieurData = dailyData.map(d => d.exterieur);

        this.currentChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Terrain Intérieur',
                        data: interieurData,
                        borderColor: '#2E7D32',
                        backgroundColor: 'rgba(46, 125, 50, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Terrain Extérieur',
                        data: exterieurData,
                        borderColor: '#FF6F00',
                        backgroundColor: 'rgba(255, 111, 0, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Évolution de la fréquentation'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 16,
                        min: 0,
                        ticks: {
                            stepSize: 1,
                            precision: 0,
                            callback: function(value) {
                                if (Number.isInteger(value)) {
                                    return value;
                                }
                            }
                        },
                        title: {
                            display: true,
                            text: 'Nombre de tireurs'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                }
            }
        });
    }

    aggregateSessionsByDay(sessions) {
        // FIX: Vérifier que sessions est un array avant d'appeler forEach
        if (!Array.isArray(sessions)) {
            Logger.warn('aggregateSessionsByDay: sessions n\'est pas un array, retour array vide', sessions);
            return [];
        }

        const grouped = {};

        sessions.forEach(session => {
            const date = new Date(session.date_debut).toISOString().split('T')[0];

            if (!grouped[date]) {
                grouped[date] = {
                    dateISO: date, // Garder la date ISO pour le tri
                    date: new Date(date).toLocaleDateString('fr-FR'),
                    interieur: 0,
                    exterieur: 0
                };
            }

            if (session.terrain === 'interieur') {
                grouped[date].interieur += session.nombre_tireurs;
            } else {
                grouped[date].exterieur += session.nombre_tireurs;
            }
        });

        // Trier par date ISO chronologique
        return Object.values(grouped).sort((a, b) =>
            a.dateISO.localeCompare(b.dateISO)
        );
    }

    displayFrequentationTable(sessions) {
        const tbody = document.querySelector('#frequentationTable tbody');

        tbody.innerHTML = sessions.map(session => `
            <tr>
                <td>${this.formatDate(session.date_debut)}</td>
                <td>${session.nom}</td>
                <td>${session.prenom}</td>
                <td>${this.getTypeLabel(session.type_tireur)}</td>
                <td>${this.getTerrainLabel(session.terrain)}</td>
                <td>${session.nombre_tireurs}</td>
                <td>${session.date_fin ?
                    this.formatDuration(session.date_debut, session.date_fin) :
                    'En cours'}</td>
                <td>
                    <span class="status-badge ${session.active ? 'active' : 'completed'}">
                        ${session.active ? 'Actif' : 'Terminé'}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    async loadIncidents() {
        try {
            const incidents = await DatabaseManager.getAllIncidents();
            this.currentIncidents = incidents;
            this.displayIncidents(incidents);

            // Configurer les event listeners pour les boutons de sélection
            this.setupIncidentSelectionListeners();

        } catch (error) {
            Logger.error('Erreur chargement incidents:', error);
        }
    }

    displayIncidents(incidents) {
        // Mettre à jour la liste courante pour que les boutons "Modifier" fonctionnent
        this.currentIncidents = incidents;

        const container = document.getElementById('incidentsList');

        if (!container) {
            Logger.error('Conteneur incidentsList introuvable');
            return;
        }

        if (incidents.length === 0) {
            container.innerHTML = '<p class="text-center text-secondary">Aucun incident signalé</p>';
            return;
        }

        container.innerHTML = incidents.map(incident => `
            <div class="incident-card ${incident.statut}" data-incident-id="${incident.id}">
                <div class="incident-header">
                    <div class="incident-selection">
                        <input type="checkbox" id="incident-${incident.id}" class="incident-checkbox" value="${incident.id}">
                        <label for="incident-${incident.id}" class="checkbox-label"></label>
                    </div>
                    <div class="incident-title">
                        <h4>${this.escapeHtml(incident.type_incident)}</h4>
                        <span class="incident-terrain">${this.getTerrainLabel(incident.terrain)}</span>
                    </div>
                    <div class="incident-actions">
                        <span class="incident-status status-${incident.statut}">
                            ${this.getStatutLabel(incident.statut)}
                        </span>
                        <button class="btn btn-sm btn-secondary edit-incident-btn" data-incident-id="${incident.id}">
                            ✏️ Modifier
                        </button>
                    </div>
                </div>

                <div class="incident-body">
                    <p><strong>Date:</strong> ${this.formatDate(incident.date_incident)}</p>
                    <p><strong>Description:</strong></p>
                    <div class="incident-description">${this.escapeHtml(incident.description)}</div>

                    ${incident.photo_path ? `
                        <div class="incident-photo">
                            <p><strong>Photo:</strong></p>
                            <div class="photo-container">
                                <img src="${this.escapeHtml(incident.photo_path)}"
                                     alt="Photo incident"
                                     class="incident-photo-img clickable-photo"
                                     data-photo-path="${this.escapeHtml(incident.photo_path)}"
                                     title="Cliquez pour agrandir">
                                <div class="photo-filename">${incident.photo_path.split('/').pop()}</div>
                            </div>
                        </div>
                    ` : ''}

                    ${incident.treatment_notes ? `
                        <div class="incident-treatment">
                            <p><strong>Traitement:</strong></p>
                            <div>${this.escapeHtml(incident.treatment_notes)}</div>
                        </div>
                    ` : ''}

                    ${incident.resolution_notes ? `
                        <div class="incident-resolution">
                            <p><strong>Résolution:</strong></p>
                            <div>${this.escapeHtml(incident.resolution_notes)}</div>
                            ${incident.date_resolution ? `
                                <small>Résolu le ${this.formatDate(incident.date_resolution)}</small>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');

        // Ajouter les event listeners pour les checkboxes
        this.setupCheckboxListeners();
    }

    setupIncidentSelectionListeners() {
        // Sélection des incidents
        const selectAllBtn = document.getElementById('selectAllIncidents');
        if (selectAllBtn && !selectAllBtn.dataset.listenerAdded) {
            selectAllBtn.addEventListener('click', () => {
                this.selectAllIncidents();
            });
            selectAllBtn.dataset.listenerAdded = 'true';
        }

        const selectNoneBtn = document.getElementById('selectNoneIncidents');
        if (selectNoneBtn && !selectNoneBtn.dataset.listenerAdded) {
            selectNoneBtn.addEventListener('click', () => {
                this.selectNoneIncidents();
            });
            selectNoneBtn.dataset.listenerAdded = 'true';
        }

        const exportSelectedBtn = document.getElementById('exportSelectedPDF');
        if (exportSelectedBtn && !exportSelectedBtn.dataset.listenerAdded) {
            exportSelectedBtn.addEventListener('click', () => {
                this.exportSelectedIncidentsPDF();
            });
            exportSelectedBtn.dataset.listenerAdded = 'true';
        }

        const deleteSelectedBtn = document.getElementById('deleteSelectedIncidents');
        if (deleteSelectedBtn && !deleteSelectedBtn.dataset.listenerAdded) {
            deleteSelectedBtn.addEventListener('click', () => {
                this.deleteSelectedIncidents();
            });
            deleteSelectedBtn.dataset.listenerAdded = 'true';
        }
    }

    setupCheckboxListeners() {
        const checkboxes = document.querySelectorAll('.incident-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateSelectionButtons();
            });
        });

        // Event listeners pour les boutons "Modifier"
        const editButtons = document.querySelectorAll('.edit-incident-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', () => {
                const incidentId = button.dataset.incidentId; // UUID: ne pas utiliser parseInt()
                this.editIncident(incidentId);
            });
        });

        // Event listeners pour les photos cliquables
        const photos = document.querySelectorAll('.clickable-photo');
        photos.forEach(photo => {
            photo.addEventListener('click', () => {
                const photoPath = photo.dataset.photoPath;
                this.showPhotoInfo(photoPath);
            });
        });
    }

    updateSelectionButtons() {
        const checkboxes = document.querySelectorAll('.incident-checkbox');
        const checked = document.querySelectorAll('.incident-checkbox:checked');

        const exportBtn = document.getElementById('exportSelectedPDF');
        const deleteBtn = document.getElementById('deleteSelectedIncidents');

        if (checked.length > 0) {
            exportBtn.disabled = false;
            deleteBtn.disabled = false;
            exportBtn.textContent = `📄 Export PDF (${checked.length})`;
            deleteBtn.textContent = `🗑️ Supprimer (${checked.length})`;
        } else {
            exportBtn.disabled = true;
            deleteBtn.disabled = true;
            exportBtn.textContent = '📄 Export PDF sélection';
            deleteBtn.textContent = '🗑️ Supprimer sélection';
        }
    }

    selectAllIncidents() {
        const checkboxes = document.querySelectorAll('.incident-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        this.updateSelectionButtons();
    }

    selectNoneIncidents() {
        const checkboxes = document.querySelectorAll('.incident-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateSelectionButtons();
    }

    getSelectedIncidentIds() {
        const checked = document.querySelectorAll('.incident-checkbox:checked');
        return Array.from(checked).map(checkbox => checkbox.value); // UUID - ne pas utiliser parseInt
    }

    async exportSelectedIncidentsPDF() {
        try {
            const selectedIds = this.getSelectedIncidentIds();
            if (selectedIds.length === 0) {
                alert('Veuillez sélectionner au moins un incident');
                return;
            }

            // Charger les incidents si nécessaire
            if (!this.currentIncidents || this.currentIncidents.length === 0) {
                Logger.debug('🔄 Chargement des incidents pour export...');
                this.currentIncidents = await DatabaseManager.getAllIncidents();
            }

            const selectedIncidents = this.currentIncidents.filter(incident =>
                selectedIds.includes(incident.id)
            );

            if (selectedIncidents.length === 0) {
                alert('Aucun incident sélectionné trouvé');
                return;
            }

            await this.generateIncidentsPDF(selectedIncidents);

        } catch (error) {
            Logger.error('Erreur export PDF sélectif:', error);
            alert(`Erreur lors de l'export PDF: ${error.message}`);
        }
    }

    deleteSelectedIncidents() {
        const selectedIds = this.getSelectedIncidentIds();
        if (selectedIds.length === 0) {
            return;
        }

        // Identifier tous les modals visibles
        const allModals = document.querySelectorAll('.modal');
        Logger.debug('📋 Nombre total de modals:', allModals.length);

        allModals.forEach((modal, index) => {
            const isHidden = modal.classList.contains('hidden');
            const computedDisplay = window.getComputedStyle(modal).display;
            Logger.debug(`Modal ${index} (${modal.id}): hidden=${isHidden}, display=${computedDisplay}`);
        });

        // Forcer la fermeture de TOUS les modals sauf le modal de confirmation
        allModals.forEach(modal => {
            if (modal.id !== 'deleteConfirmModal') {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        });

        Logger.debug('✅ Tous les modals fermés');

        // Stocker les IDs pour la confirmation
        this.pendingDeleteIds = selectedIds;

        // Afficher le modal de confirmation avec un léger délai
        setTimeout(() => {
            const message = `Êtes-vous sûr de vouloir supprimer ${selectedIds.length} incident(s) ?`;
            document.getElementById('deleteConfirmMessage').textContent = message;

            const deleteModal = document.getElementById('deleteConfirmModal');
            const overlay = document.getElementById('modalOverlay');

            // Forcer l'affichage de l'overlay
            overlay.classList.remove('hidden');
            overlay.style.display = 'block'; // Forcer à block
            overlay.style.zIndex = '1999';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'; // Plus opaque

            Logger.debug('🔍 Overlay - hidden:', overlay.classList.contains('hidden'));
            Logger.debug('🔍 Overlay - display:', window.getComputedStyle(overlay).display);
            Logger.debug('🔍 Overlay - zIndex:', window.getComputedStyle(overlay).zIndex);

            // Afficher le modal
            deleteModal.classList.remove('hidden');
            deleteModal.style.display = 'flex'; // Forcer à flex comme défini dans le CSS
            deleteModal.style.zIndex = '2000';

            Logger.debug('🔍 DeleteModal - hidden:', deleteModal.classList.contains('hidden'));
            Logger.debug('🔍 DeleteModal - display:', window.getComputedStyle(deleteModal).display);
            Logger.debug('🔍 DeleteModal - zIndex:', window.getComputedStyle(deleteModal).zIndex);

            Logger.debug('✅ Modal de confirmation et overlay affichés');
        }, 50);
    }

    hideDeleteConfirmModal() {
        const deleteModal = document.getElementById('deleteConfirmModal');
        const overlay = document.getElementById('modalOverlay');

        deleteModal.classList.add('hidden');
        deleteModal.style.display = 'none';
        deleteModal.style.zIndex = ''; // Réinitialiser le z-index

        overlay.classList.add('hidden');
        overlay.style.display = 'none';
        overlay.style.zIndex = ''; // Réinitialiser le z-index

        this.pendingDeleteIds = null;
    }

    async confirmDeleteIncidents() {
        if (!this.pendingDeleteIds || this.pendingDeleteIds.length === 0) {
            return;
        }

        // Sauvegarder les IDs avant de fermer le modal (qui réinitialise pendingDeleteIds)
        const idsToDelete = [...this.pendingDeleteIds];

        try {
            // Masquer le modal
            this.hideDeleteConfirmModal();

            // Supprimer les incidents un par un
            for (const id of idsToDelete) {
                await DatabaseManager.deleteIncident(id);
            }

            // Recharger la liste des incidents
            await this.loadIncidents();

        } catch (error) {
            Logger.error('Erreur suppression incidents:', error);
            alert('Erreur lors de la suppression des incidents');
        }
    }

    showPhotoInfo(photoPath) {
        // Ouvrir la modal avec la photo
        this.showPhotoModal(photoPath);
    }

    showPhotoModal(photoPath) {
        // Créer un modal pour afficher la photo en grand
        const modal = document.createElement('div');
        modal.className = 'photo-modal';
        modal.innerHTML = `
            <div class="photo-modal-content">
                <div class="photo-modal-header">
                    <h3>Photo de l'incident</h3>
                    <button class="photo-modal-close">&times;</button>
                </div>
                <div class="photo-modal-body">
                    <img src="${photoPath}" alt="Photo incident" class="photo-modal-img">
                </div>
            </div>
            <div class="photo-modal-overlay"></div>
        `;

        // Styles inline pour le modal
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        document.body.appendChild(modal);

        // Event listeners pour fermer
        modal.querySelector('.photo-modal-close').addEventListener('click', () => {
            modal.remove();
        });
        modal.querySelector('.photo-modal-overlay').addEventListener('click', () => {
            modal.remove();
        });
    }

    async loadImageForPDF(imagePath) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    const dataURL = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(dataURL);
                } catch (error) {
                    Logger.warn('Erreur conversion image:', error);
                    resolve(null);
                }
            };
            img.onerror = function() {
                Logger.warn('Erreur chargement image:', imagePath);
                resolve(null);
            };
            img.src = imagePath;
        });
    }

    async generateIncidentsPDF(incidents) {
        try {
            Logger.debug('📄 Génération PDF pour', incidents ? incidents.length : 0, 'incident(s)');

            if (!incidents || incidents.length === 0) {
                Logger.warn('⚠️ Aucun incident à exporter');
                alert('Aucun incident à exporter');
                return false;
            }

            const { jsPDF } = window.jspdf;
            if (!jsPDF) {
                Logger.error('❌ jsPDF non disponible');
                alert('Erreur: bibliothèque PDF non chargée');
                return false;
            }

            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            const contentWidth = pageWidth - (margin * 2);

            // Charger le logo
            const logoImg = new Image();
            logoImg.src = '/images/icon-512.png';
            await new Promise((resolve) => {
                logoImg.onload = resolve;
                logoImg.onerror = resolve;
            });

            Logger.debug('🔄 Génération de', incidents.length, 'incident(s)...');

            // Tableau pour stocker l'incident associé à chaque page
            const pageToIncident = [];

            for (let i = 0; i < incidents.length; i++) {
                const incident = incidents[i];
                Logger.debug(`📝 Incident ${i + 1}:`, incident.type_incident, '-', incident.statut);

                if (i > 0) {
                    doc.addPage();
                }

                // Enregistrer l'incident pour cette page
                const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
                pageToIncident.push({ page: currentPage, incidentId: incident.id });

                let yPos = 10;

                // === HEADER AVEC LOGO ===
                const logoSize = 20;
                try {
                    doc.addImage(logoImg, 'PNG', margin + 5, yPos, logoSize, logoSize);
                } catch (e) {
                    Logger.warn('Logo non ajouté au PDF:', e);
                }

                const titleX = margin + logoSize + 15;
                doc.setFontSize(20);
                doc.setTextColor(46, 125, 50);
                doc.setFont('helvetica', 'bold');
                doc.text('Club Istres Sports', titleX, yPos + 7);

                doc.setFontSize(16);
                doc.text('Tir à l\'Arc', titleX, yPos + 15);

                // Ligne de séparation
                yPos = 35;
                doc.setDrawColor(46, 125, 50);
                doc.setLineWidth(0.5);
                doc.line(margin, yPos, pageWidth - margin, yPos);

                // === TITRE RAPPORT ===
                yPos = 45;
                doc.setFontSize(18);
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.text('RAPPORT D\'INCIDENT', pageWidth / 2, yPos, { align: 'center' });

                // === INFORMATIONS PRINCIPALES ===
                yPos = 60;
                doc.setFontSize(11);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 100, 100);
                doc.text(`Rapport généré le ${new Date().toLocaleDateString('fr-FR', {
                    year: 'numeric', month: 'long', day: 'numeric'
                })}`, pageWidth / 2, yPos, { align: 'center' });

                // === DÉTAILS DE L'INCIDENT ===
                yPos = 75;
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(46, 125, 50);
                doc.text('TYPE D\'INCIDENT', margin, yPos);

                yPos += 8;
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text(incident.type_incident || 'Non spécifié', margin, yPos);

                // Statut avec badge coloré
                const statutWidth = 40;
                const statutHeight = 7;
                yPos += 2;

                // Couleur selon le statut (en_attente, en_cours, resolu)
                if (incident.statut === 'en_attente') {
                    doc.setFillColor(255, 152, 0); // Orange
                } else if (incident.statut === 'en_cours') {
                    doc.setFillColor(33, 150, 243); // Bleu
                } else if (incident.statut === 'resolu') {
                    doc.setFillColor(76, 175, 80); // Vert
                } else {
                    doc.setFillColor(158, 158, 158); // Gris par défaut
                }

                doc.roundedRect(pageWidth - margin - statutWidth, yPos - 5, statutWidth, statutHeight, 2, 2, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(this.getStatutLabel(incident.statut).toUpperCase(),
                    pageWidth - margin - statutWidth / 2, yPos, { align: 'center' });

                // === INFORMATIONS CHRONOLOGIQUES ===
                yPos += 15;
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(46, 125, 50);
                doc.text('CHRONOLOGIE', margin, yPos);

                yPos += 8;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);

                // Date d'incident
                doc.setFont('helvetica', 'bold');
                doc.text('Date du signalement:', margin, yPos);
                doc.setFont('helvetica', 'normal');
                doc.text(this.formatDate(incident.date_incident), margin + 50, yPos);

                // Terrain
                yPos += 6;
                doc.setFont('helvetica', 'bold');
                doc.text('Terrain concerné:', margin, yPos);
                doc.setFont('helvetica', 'normal');
                doc.text(this.getTerrainLabel(incident.terrain), margin + 50, yPos);

                // Date de résolution si existe
                if (incident.date_resolution) {
                    yPos += 6;
                    doc.setFont('helvetica', 'bold');
                    doc.text('Date de résolution:', margin, yPos);
                    doc.setFont('helvetica', 'normal');
                    doc.text(this.formatDate(incident.date_resolution), margin + 50, yPos);
                }

                // === DESCRIPTION ===
                yPos += 12;
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(46, 125, 50);
                doc.text('DESCRIPTION', margin, yPos);

                yPos += 8;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);
                const descLines = doc.splitTextToSize(incident.description || 'Aucune description', contentWidth);
                doc.text(descLines, margin, yPos);
                yPos += descLines.length * 5;

                // === TRAITEMENT ===
                // Afficher si treatment_notes existe et statut != en_attente
                if (incident.treatment_notes && incident.statut !== 'en_attente') {
                    yPos += 10;
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(46, 125, 50);
                    doc.text('TRAITEMENT', margin, yPos);

                    yPos += 8;
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(0, 0, 0);
                    const treatLines = doc.splitTextToSize(incident.treatment_notes, contentWidth);
                    doc.text(treatLines, margin, yPos);
                    yPos += treatLines.length * 5;
                }

                // === RÉSOLUTION ===
                // Afficher si resolution_notes existe
                if (incident.resolution_notes) {
                    yPos += 10;
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(46, 125, 50);
                    doc.text('RÉSOLUTION', margin, yPos);

                    yPos += 8;
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(0, 0, 0);
                    const resLines = doc.splitTextToSize(incident.resolution_notes, contentWidth);
                    doc.text(resLines, margin, yPos);
                    yPos += resLines.length * 5;
                }

                // === PHOTO ===
                if (incident.photo_path) {
                    yPos += 10;

                    // Photo sur toute la largeur de la page
                    const imgWidth = contentWidth;
                    const imgHeight = contentWidth * 0.75; // Ratio 4:3

                    // Vérifier s'il reste assez d'espace
                    if (yPos + imgHeight + 20 > pageHeight - margin) {
                        doc.addPage();
                        // Enregistrer cette nouvelle page pour le même incident
                        const photoPage = doc.internal.getCurrentPageInfo().pageNumber;
                        pageToIncident.push({ page: photoPage, incidentId: incident.id });
                        yPos = margin;
                    }

                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(46, 125, 50);
                    doc.text('PHOTO JOINTE', margin, yPos);

                    yPos += 8;

                    try {
                        const photoData = await this.loadImageForPDF(incident.photo_path);
                        if (photoData) {
                            // Photo sur toute la largeur disponible
                            doc.addImage(photoData, 'JPEG', margin, yPos, imgWidth, imgHeight);
                            yPos += imgHeight + 5;

                            doc.setFontSize(8);
                            doc.setFont('helvetica', 'italic');
                            doc.setTextColor(120, 120, 120);
                            doc.text(`Fichier: ${incident.photo_path.split('/').pop()}`,
                                pageWidth / 2, yPos, { align: 'center' });
                        }
                    } catch (error) {
                        Logger.warn('Erreur chargement photo pour PDF:', error);
                        doc.setFontSize(9);
                        doc.setFont('helvetica', 'italic');
                        doc.setTextColor(150, 150, 150);
                        doc.text('(Photo non disponible)', margin, yPos);
                    }
                }
            }

            // === AJOUTER LES FOOTERS À TOUTES LES PAGES ===
            const totalPages = doc.internal.getNumberOfPages();
            Logger.debug(`📄 Ajout des footers sur ${totalPages} page(s)...`);

            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                doc.setPage(pageNum);

                // Trouver l'incident associé à cette page
                const pageInfo = pageToIncident.find(p => p.page === pageNum);
                const incidentId = pageInfo ? pageInfo.incidentId : 'N/A';

                // Ajouter le footer
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.setFont('helvetica', 'normal');
                const footerText = `Page ${pageNum} sur ${totalPages} - Incident ID: ${incidentId}`;
                doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
            }

            Logger.debug('✅ PDF généré avec succès');
            doc.save(`incidents-${new Date().toISOString().split('T')[0]}.pdf`);
            return true;

        } catch (error) {
            Logger.error('❌ Erreur génération PDF:', error);
            alert(`Erreur lors de la génération du PDF: ${error.message}`);
            throw error;
        }
    }

    async loadQRCodeSection() {
        try {
            const config = await DatabaseManager.getConfiguration();
            const qrData = config.qr_code_data || window.location.origin;
            document.getElementById('qrData').value = qrData;

            // Générer automatiquement le QR code valide à l'ouverture de la section
            Logger.debug('🔄 Génération automatique du QR code...');
            setTimeout(() => {
                this.generateQRCode();
            }, 300); // Petit délai pour laisser le DOM se mettre à jour

        } catch (error) {
            Logger.error('Erreur chargement QR code:', error);
        }
    }

    setupEventListeners() {
        // Configuration
        document.getElementById('configForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveConfiguration();
        });

        // Changement de mot de passe
        document.getElementById('passwordChangeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.changePassword();
        });

        // Filtres fréquentation
        document.getElementById('applyFilters').addEventListener('click', () => {
            this.applyFrequentationFilters();
        });

        document.getElementById('resetFilters').addEventListener('click', () => {
            this.resetFrequentationFilters();
        });

        // Export
        document.getElementById('exportXLS').addEventListener('click', () => {
            this.exportData('xls');
        });

        // QR Code
        document.getElementById('qrForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateQRCode();
        });

        document.getElementById('downloadQR').addEventListener('click', () => {
            this.downloadQRCode();
        });

        document.getElementById('printQR').addEventListener('click', () => {
            this.printQRCode();
        });

        document.getElementById('exportPDF').addEventListener('click', () => {
            this.exportQRCodeToPDF();
        });

        // Incidents
        document.getElementById('filterIncidents').addEventListener('click', () => {
            this.filterIncidents();
        });

        const exportIncidentsPDFBtn = document.getElementById('exportIncidentsPDF');
        if (exportIncidentsPDFBtn) {
            exportIncidentsPDFBtn.addEventListener('click', () => {
                this.exportIncidentsPDF();
            });
        }

        // Sélection des incidents (avec vérification d'existence)
        const selectAllBtn = document.getElementById('selectAllIncidents');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                this.selectAllIncidents();
            });
        }

        const selectNoneBtn = document.getElementById('selectNoneIncidents');
        if (selectNoneBtn) {
            selectNoneBtn.addEventListener('click', () => {
                this.selectNoneIncidents();
            });
        }

        // Note: exportSelectedPDF et deleteSelectedIncidents sont gérés dans setupIncidentSelectionListeners()
        // pour éviter les event listeners en double

        document.getElementById('editIncidentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveIncidentChanges();
        });
    }

    setupModals() {
        const overlay = document.getElementById('modalOverlay');

        // Gérer le clic sur l'overlay pour fermer le modal ouvert
        overlay.addEventListener('click', () => {
            // Vérifier quel modal est ouvert
            if (!document.getElementById('deleteConfirmModal').classList.contains('hidden')) {
                this.hideDeleteConfirmModal();
            } else if (!document.getElementById('incidentModal').classList.contains('hidden')) {
                this.hideIncidentModal();
            }
        });

        // Event listeners pour le modal de confirmation de suppression
        const deleteModalClose = document.getElementById('deleteModalClose');
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

        if (deleteModalClose) {
            deleteModalClose.addEventListener('click', () => this.hideDeleteConfirmModal());
        }

        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => this.confirmDeleteIncidents());
        }

        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', () => this.hideDeleteConfirmModal());
        }
    }

    async saveConfiguration() {
        try {
            const formData = new FormData(document.getElementById('configForm'));

            await DatabaseManager.updateConfiguration('telephone_responsable', formData.get('telephone_responsable'));

            alert('✅ Configuration sauvegardée avec succès !');

        } catch (error) {
            Logger.error('Erreur sauvegarde configuration:', error);
            alert('❌ Erreur lors de la sauvegarde de la configuration');
        }
    }

    async changePassword() {
        try {
            const formData = new FormData(document.getElementById('passwordChangeForm'));
            const currentPassword = formData.get('current_password');
            const newPassword = formData.get('new_password');
            const confirmPassword = formData.get('confirm_password');

            // Vérifications côté client
            if (newPassword.length < 12) {
                this.showPasswordMessage('Le nouveau mot de passe doit contenir au moins 12 caractères', 'alert-danger');
                return;
            }

            if (newPassword !== confirmPassword) {
                this.showPasswordMessage('Les mots de passe ne correspondent pas', 'alert-danger');
                return;
            }

            if (newPassword === currentPassword) {
                this.showPasswordMessage('Le nouveau mot de passe doit être différent de l\'ancien', 'alert-danger');
                return;
            }

            // Tenter le changement via l'API
            if (DatabaseManager.useAPI) {
                try {
                    await DatabaseManager.apiRequest('/auth/change-password', {
                        method: 'POST',
                        body: JSON.stringify({
                            currentPassword,
                            newPassword
                        })
                    });

                    // Supprimer le flag must_change_password
                    localStorage.removeItem('must_change_password');

                    // Supprimer la bannière d'avertissement si elle existe
                    const warningBanner = document.getElementById('password-change-warning');
                    if (warningBanner) {
                        warningBanner.remove();
                        document.body.style.paddingTop = '0';
                    }

                    // Effacer le formulaire
                    document.getElementById('passwordChangeForm').reset();
                    this.showPasswordMessage('✅ Mot de passe modifié avec succès ! Votre compte est maintenant sécurisé.', 'alert-success');

                    Logger.info('✅ Mot de passe changé - flag must_change_password supprimé');
                    return;

                } catch (apiError) {
                    // Si l'API échoue, montrer l'erreur
                    this.showPasswordMessage(apiError.message || 'Erreur lors du changement de mot de passe', 'alert-danger');
                    return;
                }
            }

            // Fallback localStorage (ancien système)
            const config = await DatabaseManager.getConfiguration();
            const storedHashedPassword = config.admin_password;

            const isCurrentPasswordValid = await DatabaseManager.verifyPassword(currentPassword, storedHashedPassword);
            if (!isCurrentPasswordValid) {
                this.showPasswordMessage('Mot de passe actuel incorrect', 'alert-danger');
                return;
            }

            const hashedNewPassword = await DatabaseManager.hashPassword(newPassword);
            await DatabaseManager.updateConfiguration('admin_password', hashedNewPassword);

            document.getElementById('passwordChangeForm').reset();
            this.showPasswordMessage('Mot de passe modifié avec succès (mode local)', 'alert-success');

        } catch (error) {
            Logger.error('Erreur changement mot de passe:', error);
            this.showPasswordMessage('Erreur lors du changement de mot de passe', 'alert-danger');
        }
    }

    showPasswordMessage(message, type) {
        const messageDiv = document.getElementById('passwordChangeMessage');
        messageDiv.textContent = message;
        messageDiv.className = `alert ${type}`;
        messageDiv.classList.remove('hidden');

        // Masquer le message après 5 secondes
        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, 5000);
    }

    async applyFrequentationFilters() {
        const periode = document.getElementById('periodFilter').value;
        const terrain = document.getElementById('terrainFilter').value;
        const type_tireur = document.getElementById('typeFilter').value;

        // Ne passer que les filtres que la base de données comprend
        const dbFilters = {};
        if (terrain) dbFilters.terrain = terrain;
        if (type_tireur) dbFilters.type_tireur = type_tireur;

        try {
            Logger.debug('Filtres appliqués:', { periode, terrain, type_tireur });
            let sessions = await DatabaseManager.getAllSessions(dbFilters);
            Logger.debug(`${sessions.length} sessions récupérées de la base de données`);

            // Filtrer par période (côté client)
            if (periode) {
                const now = new Date();
                let startDate;

                switch (periode) {
                    case 'week':
                        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        break;
                    case 'month':
                        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                        break;
                    case 'year':
                        startDate = new Date(now.getFullYear(), 0, 1);
                        break;
                }

                if (startDate) {
                    sessions = sessions.filter(s => new Date(s.date_debut) >= startDate);
                    Logger.debug(`${sessions.length} sessions après filtrage par période (${periode})`);
                }
            }

            this.displayFrequentationChart(sessions);
            this.displayFrequentationTable(sessions);

        } catch (error) {
            Logger.error('Erreur application filtres:', error);
        }
    }

    resetFrequentationFilters() {
        document.getElementById('periodFilter').value = 'month';
        document.getElementById('terrainFilter').value = '';
        document.getElementById('typeFilter').value = '';
        this.loadFrequentation();
    }

    async exportData(format) {
        try {
            const data = await DatabaseManager.exportSessions(format);
            const filename = `frequentation-${new Date().toISOString().split('T')[0]}`;

            if (format === 'xls' || format === 'xlsx') {
                // Créer un workbook Excel
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.json_to_sheet(data);

                // Ajouter la feuille au workbook
                XLSX.utils.book_append_sheet(wb, ws, 'Fréquentation');

                // Télécharger le fichier Excel
                XLSX.writeFile(wb, `${filename}.xlsx`);
            } else {
                const contentType = format === 'csv' ? 'text/csv' : 'application/json';
                DatabaseManager.downloadFile(data, `${filename}.${format}`, contentType);
            }

        } catch (error) {
            Logger.error('Erreur export:', error);
        }
    }

    async generateQRCode() {
        try {
            const formData = new FormData(document.getElementById('qrForm'));
            const qrData = formData.get('qr_data');
            const qrSize = parseInt(formData.get('qr_size'));

            if (!qrData || qrData.trim() === '') {
                throw new Error('Aucune donnée à encoder dans le QR code');
            }

            const container = document.getElementById('qrCodeContainer');
            if (!container) {
                throw new Error('Conteneur QR code introuvable');
            }

            container.innerHTML = '<p>Génération en cours...</p>';

            // Utiliser la bibliothèque QRCodeJS (qrcodejs)
            if (typeof QRCode !== 'undefined') {
                container.innerHTML = ''; // Vider le conteneur

                // Créer le QR code avec qrcodejs
                new QRCode(container, {
                    text: qrData,
                    width: qrSize,
                    height: qrSize,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.H
                });

            } else {
                // Fallback : utiliser un service en ligne pour générer le QR code
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(qrData)}`;

                const img = document.createElement('img');
                img.src = qrUrl;
                img.alt = 'QR Code';
                img.style.maxWidth = '100%';
                img.style.height = 'auto';

                img.onload = () => {
                    container.innerHTML = '';
                    container.appendChild(img);
                };

                img.onerror = () => {
                    throw new Error('Impossible de générer le QR code avec le service externe');
                };
            }

            // Sauvegarder la configuration (optionnel, ne bloque pas la génération)
            try {
                await DatabaseManager.updateConfiguration('qr_code_data', qrData);
                Logger.debug('✅ Configuration QR code sauvegardée');
            } catch (error) {
                Logger.warn('⚠️ Impossible de sauvegarder la configuration QR code:', error.message);
                // Continuer quand même - la génération du QR code a réussi
            }

            // Afficher les actions
            document.getElementById('qrActions').classList.remove('hidden');

            if (typeof QRCode !== 'undefined') {
            }

        } catch (error) {
            Logger.error('Erreur génération QR code:', error);

            const container = document.getElementById('qrCodeContainer');
            if (container) {
                container.innerHTML = `
                    <div style="color: #D32F2F; text-align: center; padding: 2rem;">
                        <p><strong>Erreur de génération</strong></p>
                        <p>${error.message}</p>
                        <small>Essayez avec des données plus simples (ex: "TEST")</small>
                    </div>
                `;
            }

        }
    }

    downloadQRCode() {
        const container = document.getElementById('qrCodeContainer');
        const canvas = container.querySelector('canvas');
        const img = container.querySelector('img');

        if (canvas) {
            // Télécharger depuis le canvas (bibliothèque QRCode)
            const link = document.createElement('a');
            link.download = `qr-code-terrain-${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL();
            link.click();
        } else if (img) {
            // Télécharger depuis l'image (service externe)
            const link = document.createElement('a');
            link.download = `qr-code-terrain-${new Date().toISOString().split('T')[0]}.png`;
            link.href = img.src;
            link.target = '_blank';
            link.click();
        } else {
        }
    }

    printQRCode() {
        const container = document.getElementById('qrCodeContainer');
        const canvas = container.querySelector('canvas');
        const img = container.querySelector('img');

        let imageSrc = '';

        if (canvas) {
            imageSrc = canvas.toDataURL();
        } else if (img) {
            imageSrc = img.src;
        } else {
            return;
        }

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>QR Code - Terrains de Tir</title>
                <style>
                    body {
                        text-align: center;
                        font-family: Arial, sans-serif;
                        margin: 20px;
                    }
                    h2 { color: #2E7D32; }
                    img {
                        margin: 20px;
                        max-width: 300px;
                    }
                    .footer {
                        font-size: 12px;
                        color: #666;
                        margin-top: 30px;
                    }
                </style>
            </head>
            <body>
                <h2>🎯 QR Code d'Accès aux Terrains</h2>
                <p>Scannez ce code pour accéder à l'application</p>
                <img src="${imageSrc}" alt="QR Code">
                <div class="footer">
                    Istres Sports Tir à l'Arc<br>
                    ${new Date().toLocaleDateString('fr-FR')}
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }

    /**
     * Exporte le QR Code en PDF professionnel
     */
    async exportQRCodeToPDF() {
        try {
            const container = document.getElementById('qrCodeContainer');
            const canvas = container.querySelector('canvas');
            const img = container.querySelector('img');

            if (!canvas && !img) {
                throw new Error('Aucun QR code à exporter');
            }

            // Vérifier que jsPDF est disponible
            if (typeof jspdf === 'undefined' && typeof jsPDF === 'undefined') {
                throw new Error('Bibliothèque jsPDF non disponible');
            }

            // Utiliser jsPDF (nouvelle syntaxe)
            const { jsPDF } = window.jspdf || window;

            // Créer un nouveau document PDF (A4, portrait)
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Dimensions de la page A4 en mm
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // Configuration
            const qrData = document.getElementById('qrData').value;
            const currentDate = new Date().toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // === HEADER AVEC LOGO ===
            // Charger le logo icon-512.png
            const logoImg = new Image();
            logoImg.src = '/images/icon-512.png';
            await new Promise((resolve) => {
                logoImg.onload = resolve;
                logoImg.onerror = resolve; // Continue même si l'image ne charge pas
            });

            // Ajouter le logo à gauche du titre
            const logoSize = 20; // 20mm
            const logoX = 30;
            const logoY = 10;

            try {
                doc.addImage(logoImg, 'PNG', logoX, logoY, logoSize, logoSize);
            } catch (e) {
                Logger.warn('Impossible d\'ajouter le logo au PDF:', e);
            }

            // Logo / Titre (décalé à droite pour laisser place au logo)
            const titleX = logoX + logoSize + 10; // 10mm de marge après le logo

            doc.setFontSize(22);
            doc.setTextColor(46, 125, 50); // Vert du thème
            doc.setFont('helvetica', 'bold');
            doc.text('Club Istres Sports', titleX, 20, { align: 'left' });

            doc.setFontSize(18);
            doc.text('Tir à l\'Arc', titleX, 28, { align: 'left' });

            // Ligne de séparation
            doc.setDrawColor(46, 125, 50);
            doc.setLineWidth(0.5);
            doc.line(20, 35, pageWidth - 20, 35);

            // === TITRE PRINCIPAL ===
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text('QR Code d\'Accès aux Terrains', pageWidth / 2, 50, { align: 'center' });

            // === INSTRUCTIONS ===
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);

            const instructions = [
                'Scannez ce QR code avec votre smartphone pour accéder',
                'à la gestion des terrains de tir.'
            ];

            instructions.forEach((line, index) => {
                doc.text(line, pageWidth / 2, 60 + (index * 6), { align: 'center' });
            });

            // === QR CODE PRINCIPAL ===
            // Récupérer l'image du QR code
            let imageData = '';
            if (canvas) {
                imageData = canvas.toDataURL('image/png');
            } else if (img) {
                // Pour une image externe, on doit la convertir en canvas
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = img.width;
                tempCanvas.height = img.height;
                tempCtx.drawImage(img, 0, 0);
                imageData = tempCanvas.toDataURL('image/png');
            }

            // Taille du QR code dans le PDF (80mm = 8cm)
            const qrSize = 80;
            const qrX = (pageWidth - qrSize) / 2;
            const qrY = 80;

            // Ajouter le QR code au PDF
            doc.addImage(imageData, 'PNG', qrX, qrY, qrSize, qrSize);

            // Cadre autour du QR code (optionnel mais joli)
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.2);
            doc.rect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4);

            // === FOOTER ===
            const footerY = pageHeight - 30;

            // === QR CODE DE L'URL (juste au-dessus du footer) ===
            const urlQrSize = 30; // 30mm pour le petit QR code
            const urlSectionY = footerY - 45; // Position juste au-dessus du footer

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.setFont('helvetica', 'bold');
            doc.text('Adresse internet de l\'application :', 25, urlSectionY);

            // Générer un petit QR code pour l'URL avec qrcodejs
            const urlQrContainer = document.createElement('div');
            urlQrContainer.style.display = 'none';
            document.body.appendChild(urlQrContainer);

            try {
                // Générer le QR code avec qrcodejs (même bibliothèque que dans generateQRCode)
                new QRCode(urlQrContainer, {
                    text: qrData,
                    width: 200,
                    height: 200,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });

                // Attendre que le canvas soit créé par qrcodejs (asynchrone)
                await new Promise(resolve => setTimeout(resolve, 100));

                const urlQrCanvas = urlQrContainer.querySelector('canvas');
                if (urlQrCanvas) {
                    const urlQrImageData = urlQrCanvas.toDataURL('image/png');
                    const urlQrX = 25;
                    const urlQrY = urlSectionY + 4;

                    doc.addImage(urlQrImageData, 'PNG', urlQrX, urlQrY, urlQrSize, urlQrSize);

                    // Ajouter l'URL en texte à côté du QR code
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(120, 120, 120);
                    const displayUrl = qrData.length > 40 ? qrData.substring(0, 40) + '...' : qrData;
                    doc.text(displayUrl, urlQrX + urlQrSize + 5, urlQrY + 5);
                    doc.text('Scannez ce QR code', urlQrX + urlQrSize + 5, urlQrY + 10);
                    doc.text('pour accéder directement', urlQrX + urlQrSize + 5, urlQrY + 15);
                } else {
                    Logger.warn('Canvas QR code non trouvé après génération');
                }

                // Nettoyer le conteneur temporaire
                document.body.removeChild(urlQrContainer);
            } catch (qrError) {
                Logger.warn('Impossible de générer le QR code de l\'URL:', qrError);
                // Nettoyer si erreur
                if (urlQrContainer && urlQrContainer.parentNode) {
                    document.body.removeChild(urlQrContainer);
                }
                // Fallback: afficher juste l'URL en texte
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                const displayUrl = qrData.length > 60 ? qrData.substring(0, 60) + '...' : qrData;
                doc.text(displayUrl, 25, urlSectionY + 5);
            }

            // Ligne de séparation
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            doc.line(20, footerY, pageWidth - 20, footerY);

            // Informations de contact
            doc.setFontSize(9);
            doc.setTextColor(120, 120, 120);
            doc.setFont('helvetica', 'normal');

            const footerInfo = [
                'Club Istres Sports - Section Tir à l\'Arc',
                'Pour plus d\'informations, contactez le responsable du club',
                `Document généré le ${currentDate}`
            ];

            footerInfo.forEach((line, index) => {
                doc.text(line, pageWidth / 2, footerY + 7 + (index * 5), { align: 'center' });
            });

            // === INFORMATIONS TECHNIQUES (petite note en bas) ===
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.text('Ce QR code est permanent et peut être imprimé et affiché sur le site',
                pageWidth / 2, pageHeight - 10, { align: 'center' });

            // === SAUVEGARDER LE PDF ===
            const filename = `QR-Code-Terrain-TirArc-${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);

            Logger.debug(`✅ PDF généré avec succès: ${filename}`);

        } catch (error) {
            Logger.error('❌ Erreur lors de la génération du PDF:', error);
            alert(`Impossible de générer le PDF: ${error.message}`);
        }
    }

    async filterIncidents() {
        const filters = {
            statut: document.getElementById('statutFilter').value,
            terrain: document.getElementById('terrainIncidentFilter').value
        };

        try {
            const incidents = await DatabaseManager.getAllIncidents(filters);
            this.displayIncidents(incidents);

        } catch (error) {
            Logger.error('Erreur filtrage incidents:', error);
        }
    }

    editIncident(incidentId) {
        const incident = this.currentIncidents.find(i => i.id === incidentId);
        if (!incident) {
            Logger.error('Incident introuvable:', incidentId);
            return;
        }


        // Remplir le formulaire modal
        document.getElementById('incidentId').value = incident.id;
        document.getElementById('editStatut').value = incident.statut;
        document.getElementById('editTreatment').value = incident.treatment_notes || '';
        document.getElementById('editResolution').value = incident.resolution_notes || '';

        // Afficher le modal
        this.showIncidentModal();
    }

    showIncidentModal() {
        const modal = document.getElementById('incidentModal');
        const overlay = document.getElementById('modalOverlay');

        if (modal && overlay) {
            modal.classList.remove('hidden');
            modal.style.display = ''; // Réactive le display CSS

            overlay.classList.remove('hidden');
            overlay.style.display = ''; // Réactive le display CSS
        } else {
            Logger.error('Elements modal introuvables');
        }
    }

    hideIncidentModal() {
        const modal = document.getElementById('incidentModal');
        const overlay = document.getElementById('modalOverlay');

        modal.classList.add('hidden');
        modal.style.display = 'none'; // Force le masquage

        overlay.classList.add('hidden');
        overlay.style.display = 'none'; // Force le masquage
    }

    async saveIncidentChanges() {
        try {
            const formData = new FormData(document.getElementById('editIncidentForm'));
            const incidentId = formData.get('incidentId') || document.getElementById('incidentId').value; // UUID: ne pas utiliser parseInt()

            const updates = {
                statut: formData.get('statut'),
                treatment_notes: formData.get('treatment_notes'),
                resolution_notes: formData.get('resolution_notes')
            };

            await DatabaseManager.updateIncident(incidentId, updates);

            this.hideIncidentModal();
            this.loadIncidents();

        } catch (error) {
            Logger.error('Erreur sauvegarde incident:', error);
        }
    }

    // Charger dynamiquement la bibliothèque QRCode si nécessaire
    async loadQRCodeLibrary() {
        return new Promise((resolve, reject) => {
            // Vérifier si QRCode est déjà disponible
            if (typeof QRCode !== 'undefined') {
                resolve();
                return;
            }

            // Vérifier si le script existe déjà
            const existingScript = document.querySelector('script[src*="qrcode"]');
            if (existingScript) {
                // Attendre un peu que le script se charge
                setTimeout(() => {
                    if (typeof QRCode !== 'undefined') {
                        resolve();
                    } else {
                        reject(new Error('Script QRCode présent mais non fonctionnel'));
                    }
                }, 1000);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';

            script.onload = () => {
                // Attendre un peu que la variable QRCode soit disponible
                setTimeout(() => {
                    if (typeof QRCode !== 'undefined') {
                        resolve();
                    } else {
                        reject(new Error('Script chargé mais QRCode non disponible'));
                    }
                }, 100);
            };

            script.onerror = () => {
                reject(new Error('Impossible de charger la bibliothèque QRCode depuis le CDN'));
            };

            document.head.appendChild(script);
        });
    }

    async exportIncidentsPDF() {
        try {
            // Charger les incidents si nécessaire
            if (!this.currentIncidents || this.currentIncidents.length === 0) {
                Logger.debug('🔄 Chargement des incidents pour export...');
                this.currentIncidents = await DatabaseManager.getAllIncidents();
            }

            if (!this.currentIncidents || this.currentIncidents.length === 0) {
                alert('Aucun incident à exporter');
                return;
            }

            // Utiliser la même fonction que pour les incidents sélectionnés
            await this.generateIncidentsPDF(this.currentIncidents);
        } catch (error) {
            Logger.error('Erreur export PDF:', error);
            alert(`Erreur lors de l'export PDF: ${error.message}`);
        }
    }

    // Utilitaires
    getTypeLabel(type) {
        const labels = {
            'club': 'Membre du club',
            'autre_club': 'Autre club',
            'service_sports': 'Service sports'
        };
        return labels[type] || type;
    }

    getTerrainLabel(terrain) {
        return terrain === 'interieur' ? 'Intérieur' : 'Extérieur';
    }

    getStatutLabel(statut) {
        const labels = {
            'en_attente': 'En attente',
            'en_cours': 'En cours',
            'resolu': 'Résolu'
        };
        return labels[statut] || statut;
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

    // Méthode pour formater la durée
    formatDuration(startDate, endDate) {
        if (window.Utils && typeof Utils.formatDuration === 'function') {
            return Utils.formatDuration(startDate, endDate);
        } else {
            // Fallback simple pour calculer la durée
            const start = new Date(startDate);
            const end = new Date(endDate);
            const duration = end - start;

            const hours = Math.floor(duration / (1000 * 60 * 60));
            const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

            if (hours > 0) {
                return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
            } else {
                return `${minutes}min`;
            }
        }
    }

    /* ============================================
       WEBSOCKET NOTIFICATIONS METHODS
       ============================================ */

    /**
     * Initialise la connexion WebSocket et les écouteurs d'événements
     */
    setupWebSocket() {
        try {
            // Initialiser le client WebSocket
            this.websocketClient = new WebSocketClient();
            this.websocketClient.connect();

            // Restaurer le compteur de notifications non lues
            this.restoreNotificationCount();

            // Écouter les événements de connexion
            this.websocketClient.on('connection-status', (data) => {
                if (data.connected) {
                    Logger.info('✅ WebSocket connecté!', data.socketId);
                } else {
                    Logger.warn('❌ WebSocket déconnecté:', data.reason);
                }
            });

            // Écouter les événements d'incident
            this.websocketClient.on('incident:created', (data) => {
                Logger.info('📢 Incident créé:', data);

                // Afficher la notification toast
                this.showNotification(data.message, 'error', '🚨 Nouvel Incident');

                // Jouer le son (uniquement pour les incidents)
                this.playSound();

                // Incrémenter le badge
                this.incrementBadge();

                // Demander permission pour notifications natives
                this.showNativeNotification('🚨 Nouvel Incident', data.message);

                // Recharger la liste si on est sur l'onglet incidents
                if (this.currentTab === 'incidents') {
                    this.loadIncidents();
                }
            });

            this.websocketClient.on('incident:updated', (data) => {
                Logger.info('📢 Incident mis à jour:', data);
                this.showNotification(data.message, 'info', 'ℹ️ Incident Modifié');
                this.incrementBadge();

                if (this.currentTab === 'incidents') {
                    this.loadIncidents();
                }
            });

            this.websocketClient.on('incident:deleted', (data) => {
                Logger.info('📢 Incident supprimé:', data);
                this.showNotification(data.message, 'success', '✅ Incident Supprimé');
                this.incrementBadge();

                if (this.currentTab === 'incidents') {
                    this.loadIncidents();
                }
            });

            // Écouter les événements de session
            this.websocketClient.on('session:created', (data) => {
                Logger.info('📢 Session créée:', data);
                this.showNotification(data.message, 'info', 'ℹ️ Nouvelle Session');
                this.incrementBadge();

                // Mettre à jour les statistiques
                this.updateStatsDisplay();
            });

            this.websocketClient.on('session:ended', (data) => {
                Logger.info('📢 Session terminée:', data);
                this.showNotification(data.message, 'info', 'ℹ️ Session Terminée');
                this.incrementBadge();

                // Mettre à jour les statistiques
                this.updateStatsDisplay();
            });

            // Écouter les mises à jour de stats
            this.websocketClient.on('stats:updated', (data) => {
                Logger.debug('📊 Stats mises à jour:', data);
                this.updateStatsDisplay(data);
            });

            // Écouter les mises à jour de l'historique de notifications
            this.websocketClient.on('history-updated', () => {
                // Synchroniser le compteur avec les notifications non lues
                const unreadNotifications = this.websocketClient.getUnreadNotifications();
                this.notificationCount = unreadNotifications.length;
                this.updateBadge();
                Logger.debug(`Badge mis à jour: ${this.notificationCount} notification(s) non lue(s)`);

                // Rafraîchir le panneau si ouvert
                if (this.notificationPanelOpen) {
                    this.renderNotificationPanel();
                }
            });

            Logger.info('✅ WebSocket configuration terminée');
        } catch (error) {
            Logger.error('❌ Erreur lors de la configuration WebSocket:', error);
        }
    }

    /**
     * Configure les événements UI pour les notifications
     */
    setupNotificationUI() {
        // Badge click - ouvrir le panneau
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.addEventListener('click', () => {
                this.toggleNotificationPanel();
            });
        }

        // Bouton fermer le panneau
        const closeBtn = document.getElementById('closePanelBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeNotificationPanel();
            });
        }

        // Overlay click - fermer le panneau
        const overlay = document.getElementById('notificationPanelOverlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                this.closeNotificationPanel();
            });
        }

        // Marquer tout comme lu
        const markAllReadBtn = document.getElementById('markAllReadBtn');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', () => {
                if (this.websocketClient) {
                    this.websocketClient.markAllAsRead();
                    // L'événement 'history-updated' mettra à jour le badge et le panneau
                }
            });
        }

        // Effacer tout
        const clearAllBtn = document.getElementById('clearAllBtn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                if (this.websocketClient) {
                    this.websocketClient.clearHistory();
                    // L'événement 'history-updated' mettra à jour le badge et le panneau
                }
            });
        }

    }

    /**
     * Affiche une notification toast
     */
    showNotification(message, type = 'info', title = null) {
        const container = document.getElementById('notificationContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `notification-toast ${type}`;

        const icon = this.getNotificationIcon(type);
        const toastTitle = title || this.getNotificationTitle(type);

        toast.innerHTML = `
            <div class="notification-toast-content">
                <span class="notification-toast-icon">${icon}</span>
                <div class="notification-toast-body">
                    <div class="notification-toast-title">${this.escapeHtml(toastTitle)}</div>
                    <div class="notification-toast-message">${this.escapeHtml(message)}</div>
                </div>
                <button class="notification-toast-close" aria-label="Fermer">&times;</button>
            </div>
        `;

        // Événement de fermeture
        const closeBtn = toast.querySelector('.notification-toast-close');
        closeBtn.addEventListener('click', () => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        });

        // Click sur le toast pour ouvrir le panneau
        toast.addEventListener('click', (e) => {
            if (!e.target.classList.contains('notification-toast-close')) {
                this.openNotificationPanel();
            }
        });

        container.appendChild(toast);

        // Auto-suppression après 5 secondes
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.add('fade-out');
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    /**
     * Retourne l'icône appropriée selon le type de notification
     */
    getNotificationIcon(type) {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '🚨'
        };
        return icons[type] || icons.info;
    }

    /**
     * Retourne le titre approprié selon le type de notification
     */
    getNotificationTitle(type) {
        const titles = {
            info: 'Information',
            success: 'Succès',
            warning: 'Attention',
            error: 'Incident'
        };
        return titles[type] || 'Notification';
    }

    /**
     * Joue le son de notification (uniquement pour les incidents critiques)
     */
    playSound() {
        const audio = document.getElementById('notificationSound');
        if (audio) {
            audio.play().catch(e => {
                Logger.debug('Son désactivé ou bloqué par le navigateur');
            });
        }
    }

    /**
     * Incrémente le compteur du badge
     */
    incrementBadge() {
        this.notificationCount++;
        this.updateBadge();
    }

    /**
     * Met à jour l'affichage du badge
     */
    updateBadge() {
        const badge = document.getElementById('notificationBadge');
        const count = document.getElementById('notificationCount');

        if (badge && count) {
            if (this.notificationCount > 0) {
                badge.classList.remove('hidden');
                badge.classList.add('pulse');
                count.textContent = this.notificationCount > 99 ? '99+' : this.notificationCount;
            } else {
                badge.classList.add('hidden');
                badge.classList.remove('pulse');
            }
        }
    }

    /**
     * Restaure le compteur de notifications non lues depuis localStorage
     */
    restoreNotificationCount() {
        if (this.websocketClient) {
            const unreadNotifications = this.websocketClient.getUnreadNotifications();
            this.notificationCount = unreadNotifications.length;
            this.updateBadge();
            Logger.info(`${this.notificationCount} notification(s) non lue(s) restaurée(s)`);
        }
    }

    /**
     * Toggle le panneau de notifications
     */
    toggleNotificationPanel() {
        if (this.notificationPanelOpen) {
            this.closeNotificationPanel();
        } else {
            this.openNotificationPanel();
        }
    }

    /**
     * Ouvre le panneau de notifications
     */
    openNotificationPanel() {
        const panel = document.getElementById('notificationPanel');
        const overlay = document.getElementById('notificationPanelOverlay');

        if (panel && overlay) {
            panel.classList.add('open');
            overlay.classList.add('visible');
            this.notificationPanelOpen = true;
            this.renderNotificationPanel();
        }
    }

    /**
     * Ferme le panneau de notifications
     */
    closeNotificationPanel() {
        const panel = document.getElementById('notificationPanel');
        const overlay = document.getElementById('notificationPanelOverlay');

        if (panel && overlay) {
            panel.classList.remove('open');
            overlay.classList.remove('visible');
            this.notificationPanelOpen = false;
        }
    }

    /**
     * Rend le contenu du panneau de notifications
     */
    renderNotificationPanel() {
        const listContainer = document.getElementById('notificationPanelList');
        if (!listContainer || !this.websocketClient) return;

        const history = this.websocketClient.getHistory();

        if (history.length === 0) {
            listContainer.innerHTML = `
                <div class="notification-panel-empty">
                    <div class="notification-panel-empty-icon">🔔</div>
                    <div class="notification-panel-empty-text">Aucune notification</div>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = history.map(notif => {
            const time = this.formatNotificationTime(notif.receivedAt);
            const type = this.getNotificationType(notif);
            const isUnread = !notif.read;

            return `
                <div class="notification-item ${type} ${isUnread ? 'unread' : ''}" data-id="${notif.id}">
                    <div class="notification-item-header">
                        <span class="notification-item-type ${type}">${this.getNotificationIcon(type)}</span>
                        <span class="notification-item-time">${time}</span>
                    </div>
                    <div class="notification-item-message">${this.escapeHtml(notif.message)}</div>
                    <div class="notification-item-actions">
                        ${isUnread ? '<button class="mark-read-btn">✓ Marquer lu</button>' : ''}
                        <button class="delete-notif-btn">🗑️ Supprimer</button>
                    </div>
                </div>
            `;
        }).join('');

        // Ajouter les événements sur les boutons
        listContainer.querySelectorAll('.mark-read-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.notification-item');
                const id = item.dataset.id;
                this.websocketClient.markAsRead(id);
                // L'événement 'history-updated' mettra à jour le badge et le panneau
            });
        });

        listContainer.querySelectorAll('.delete-notif-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.notification-item');
                const id = item.dataset.id;
                this.websocketClient.removeNotification(id);
                // L'événement 'history-updated' mettra à jour le badge et le panneau
            });
        });
    }

    /**
     * Détermine le type de notification basé sur son contenu
     */
    getNotificationType(notif) {
        if (notif.type === 'incident_created') return 'error';
        if (notif.type === 'incident_updated') return 'info';
        if (notif.type === 'incident_deleted') return 'success';
        if (notif.type === 'session_created') return 'info';
        if (notif.type === 'session_ended') return 'info';
        return 'info';
    }

    /**
     * Formate le temps de la notification de manière relative
     */
    formatNotificationTime(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'À l\'instant';
        if (minutes < 60) return `Il y a ${minutes}min`;
        if (hours < 24) return `Il y a ${hours}h`;
        if (days === 1) return 'Hier';
        if (days < 7) return `Il y a ${days}j`;

        return time.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }

    /**
     * Affiche une notification native du navigateur
     */
    async showNativeNotification(title, body) {
        // Vérifier si les notifications natives sont supportées
        if (!('Notification' in window)) {
            return;
        }

        // Demander la permission si pas encore accordée
        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }

        // Afficher la notification si permission accordée
        if (Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body: body,
                icon: '../images/icon-192.png',
                badge: '../images/icon-192.png',
                tag: 'admin-notification',
                requireInteraction: false
            });

            // Fermer automatiquement après 5 secondes
            setTimeout(() => notification.close(), 5000);

            // Click sur la notification - focus sur l'onglet
            notification.onclick = () => {
                window.focus();
                this.openNotificationPanel();
                notification.close();
            };
        }
    }

}

// Styles CSS additionnels pour l'administration
const adminStyles = `
.dashboard-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1.2rem;
    margin-bottom: 2rem;
}

.activity-list {
    background: var(--surface-color);
    border-radius: var(--border-radius);
    padding: 1.5rem;
    max-height: 400px;
    overflow-y: auto;
}

.activity-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
    border-bottom: 1px solid var(--border-color);
}

.activity-item:last-child {
    border-bottom: none;
}

.activity-info strong {
    display: block;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
}

.activity-meta {
    font-size: 0.9rem;
    color: var(--text-secondary);
}

.status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
}

.status-badge.active {
    background: rgba(46, 125, 50, 0.1);
    color: var(--primary-color);
}

.status-badge.completed {
    background: rgba(117, 117, 117, 0.1);
    color: var(--text-secondary);
}

.config-form {
    background: var(--surface-color);
    border-radius: var(--border-radius);
    padding: 2rem;
    box-shadow: var(--shadow);
}

.filters-section {
    background: var(--surface-color);
    border-radius: var(--border-radius);
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: var(--shadow);
}

.filters-form {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    align-items: end;
}

.filter-group {
    display: flex;
    flex-direction: column;
}

.filter-actions {
    display: flex;
    gap: 0.5rem;
}

.data-section {
    background: var(--surface-color);
    border-radius: var(--border-radius);
    padding: 2rem;
    box-shadow: var(--shadow);
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
}

.data-table-container {
    overflow-x: auto;
}

.data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
}

.data-table th,
.data-table td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
}

.data-table th {
    background: var(--background-color);
    font-weight: 600;
    color: var(--text-primary);
}

.data-table tr:hover {
    background: rgba(46, 125, 50, 0.02);
}

.incidents-filters {
    margin-bottom: 2rem;
}

.filters-row {
    display: flex;
    gap: 1rem;
    align-items: end;
    margin-bottom: 1rem;
    flex-wrap: wrap;
}

.filter-group {
    display: flex;
    flex-direction: column;
    min-width: 150px;
}

.filter-group label {
    margin-bottom: 0.25rem;
    font-weight: 500;
    color: var(--text-primary);
}

.filter-btn {
    align-self: end;
    white-space: nowrap;
}

.actions-row {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
    justify-content: space-between;
}

.selection-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.selected-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.qrcode-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
}

.qr-settings, .qr-display {
    background: var(--surface-color);
    border-radius: var(--border-radius);
    padding: 2rem;
    box-shadow: var(--shadow);
}

.qr-container {
    text-align: center;
    padding: 2rem;
    border: 2px dashed var(--border-color);
    border-radius: var(--border-radius);
    margin-bottom: 1rem;
}

.qr-actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
}

.incident-card {
    background: var(--surface-color);
    border-radius: var(--border-radius);
    padding: 1.5rem;
    margin-bottom: 1rem;
    box-shadow: var(--shadow);
    border-left: 4px solid var(--border-color);
}

.incident-card.en_attente {
    border-left-color: #FF6F00;
}

.incident-card.resolu {
    border-left-color: var(--primary-color);
}

.incident-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
    gap: 1rem;
}

.incident-selection {
    display: flex;
    align-items: flex-start;
    margin-right: 1rem;
}

.incident-checkbox {
    margin-right: 0.5rem;
    transform: scale(1.2);
    cursor: pointer;
}

.checkbox-label {
    cursor: pointer;
}

.incident-title h4 {
    margin: 0 0 0.25rem 0;
    color: var(--text-primary);
}

.incident-terrain {
    background: var(--background-color);
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.incident-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-shrink: 0;
}

.incident-status {
    padding: 0.375rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.8rem;
    font-weight: 600;
}

.status-en_attente {
    background: rgba(255, 111, 0, 0.1);
    color: #FF6F00;
}

.status-resolu {
    background: rgba(46, 125, 50, 0.1);
    color: var(--primary-color);
}

.incident-body {
    line-height: 1.5;
}

.incident-description {
    background: var(--background-color);
    padding: 1rem;
    border-radius: var(--border-radius);
    margin: 0.5rem 0;
    border: 1px solid var(--border-color);
}

.incident-photo {
    margin: 1rem 0;
}

.photo-container {
    margin-top: 0.5rem;
}

.photo-placeholder {
    background: var(--background-color);
    border: 2px dashed var(--border-color);
    border-radius: var(--border-radius);
    padding: 1rem;
    text-align: center;
    cursor: pointer;
    transition: var(--transition);
    color: var(--text-secondary);
}

.photo-placeholder:hover {
    border-color: var(--primary-color);
    background: rgba(46, 125, 50, 0.05);
}

.incident-photo-img {
    max-width: 200px;
    max-height: 150px;
    border-radius: var(--border-radius);
    border: 1px solid var(--border-color);
    cursor: pointer;
    transition: var(--transition);
}

.incident-photo-img:hover {
    opacity: 0.8;
    transform: scale(1.02);
}

.photo-filename {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
}

.photo-modal-content {
    background: white;
    border-radius: var(--border-radius);
    max-width: 90vw;
    max-height: 90vh;
    position: relative;
    box-shadow: var(--shadow-hover);
}

.photo-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
}

.photo-modal-close {
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

.photo-modal-close:hover {
    background: var(--background-color);
}

.photo-modal-body {
    padding: 1rem;
    text-align: center;
}

.photo-modal-img {
    max-width: 100%;
    max-height: 70vh;
    border-radius: var(--border-radius);
}

.photo-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: -1;
}

.incident-resolution {
    margin-top: 1rem;
    padding: 1rem;
    background: rgba(46, 125, 50, 0.05);
    border-radius: var(--border-radius);
}

.btn-sm {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
}

/* Modal styles */
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

.modal-header h2 {
    margin: 0;
    color: var(--text-primary);
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

.hidden {
    display: none !important;
}

@media (max-width: 768px) {
    .admin-nav {
        flex-direction: column;
    }

    .nav-tab {
        text-align: center;
    }

    .dashboard-stats {
        grid-template-columns: 1fr;
    }

    .filters-form {
        grid-template-columns: 1fr;
    }

    .filter-actions {
        justify-content: center;
    }

    .qrcode-section {
        grid-template-columns: 1fr;
    }

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

    .filters-row {
        flex-direction: column;
        align-items: stretch;
    }

    .filter-group {
        min-width: unset;
    }

    .filter-btn {
        align-self: stretch;
        margin-top: 1rem;
    }

    .actions-row {
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
    }

    .selection-controls,
    .selected-actions {
        justify-content: center;
    }
}

    .section-header {
        flex-direction: column;
        align-items: stretch;
    }

    .export-buttons {
        display: flex;
        gap: 0.5rem;
        justify-content: center;
    }
}
`;

// Ajouter les styles
const adminStyleSheet = document.createElement('style');
adminStyleSheet.textContent = adminStyles;
document.head.appendChild(adminStyleSheet);

// ===== GESTION DE LA CONFIGURATION EMAIL =====

// Classe pour gérer la configuration email
class EmailConfigManager {
    constructor() {
        this.modal = null;
        this.currentConfig = null;
        this.init();
    }

    init() {
        this.modal = document.getElementById('emailConfigModal');
        this.setupEventListeners();
        this.loadEmailConfigStatus();
    }

    // Méthode helper pour faire des appels API avec authentification
    async fetchAPI(url, options = {}) {
        const token = DatabaseManager.getAuthToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Erreur réseau' }));
            throw new Error(error.error || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    setupEventListeners() {
        // Bouton d'ouverture du modal
        const openBtn = document.getElementById('openEmailConfigBtn');
        if (openBtn) {
            openBtn.addEventListener('click', () => this.openModal());
        }

        // Boutons de fermeture
        const closeBtn = document.getElementById('closeEmailConfigModal');
        const closeBtns = this.modal.querySelectorAll('.modal-close');
        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        // Toggle guide Gmail
        const guideBtn = document.getElementById('showGmailGuideBtn');
        const guideDetail = document.getElementById('gmailGuideDetail');
        if (guideBtn && guideDetail) {
            guideBtn.addEventListener('click', () => {
                if (guideDetail.style.display === 'none') {
                    guideDetail.style.display = 'block';
                    guideBtn.textContent = '📖 Masquer le guide';
                } else {
                    guideDetail.style.display = 'none';
                    guideBtn.textContent = '📖 Voir le guide complet';
                }
            });
        }

        // Toggle password visibility
        const togglePasswordBtn = document.getElementById('togglePasswordBtn');
        const passwordInput = document.getElementById('smtpPassword');
        if (togglePasswordBtn && passwordInput) {
            togglePasswordBtn.addEventListener('click', () => {
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    togglePasswordBtn.textContent = '🙈';
                } else {
                    passwordInput.type = 'password';
                    togglePasswordBtn.textContent = '👁️';
                }
            });
        }

        // Bouton de test
        const testBtn = document.getElementById('testEmailBtn');
        if (testBtn) {
            testBtn.addEventListener('click', () => this.testEmailConfig());
        }

        // Soumission du formulaire
        const form = document.getElementById('emailConfigForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveEmailConfig();
            });
        }
    }

    async loadEmailConfigStatus() {
        // Ne pas charger si pas de token (utilisateur non connecté)
        const token = DatabaseManager.getAuthToken();
        if (!token) {
            this.updateStatusIndicator({ configured: false, tested: false });
            return;
        }

        try {
            const response = await this.fetchAPI('/api/email-config', {
                method: 'GET'
            });

            if (response.configuration) {
                this.currentConfig = response.configuration;
                this.updateStatusIndicator(response.status);
            }
        } catch (error) {
            // Ne pas afficher d'erreur pour les 401 (non authentifié ou token expiré)
            // C'est un cas normal au chargement de la page
            if (!error.message || !error.message.includes('Token invalide')) {
                console.error('Erreur chargement statut email:', error);
            }
            this.updateStatusIndicator({ configured: false, tested: false });
        }
    }

    updateStatusIndicator(status) {
        const statusDiv = document.getElementById('emailConfigStatus');
        if (!statusDiv) return;

        const indicator = statusDiv.querySelector('.status-indicator');
        const icon = indicator.querySelector('.status-icon');
        const text = indicator.querySelector('.status-text');

        // Retirer toutes les classes de statut
        indicator.classList.remove('status-not-configured', 'status-configured', 'status-tested', 'status-error');

        if (!status.configured) {
            indicator.classList.add('status-not-configured');
            icon.textContent = '⚫';
            text.textContent = 'Email non configuré';
        } else if (status.tested) {
            indicator.classList.add('status-tested');
            icon.textContent = '✅';
            let lastTest = '';
            if (status.last_test) {
                const testDate = new Date(status.last_test);
                if (!isNaN(testDate.getTime())) {
                    lastTest = testDate.toLocaleString('fr-FR');
                }
            }
            text.textContent = `Email configuré et testé${lastTest ? ' (' + lastTest + ')' : ''}`;
        } else {
            indicator.classList.add('status-configured');
            icon.textContent = '🟡';
            text.textContent = 'Email configuré mais non testé';
        }
    }

    async openModal() {
        // Charger la configuration actuelle
        try {
            const response = await this.fetchAPI('/api/email-config', {
                method: 'GET'
            });

            if (response.configuration) {
                this.currentConfig = response.configuration;
                this.populateForm(response.configuration);
            }
        } catch (error) {
            // Ne pas afficher d'erreur pour les 401 (non authentifié ou token expiré)
            if (!error.message || !error.message.includes('Token invalide')) {
                console.error('Erreur chargement configuration:', error);
            }
            // Continuer quand même l'ouverture du modal avec un formulaire vierge
        }

        this.modal.classList.remove('hidden');
        document.getElementById('modalOverlay').classList.remove('hidden');
    }

    populateForm(config) {
        // Remplir les champs avec les données existantes
        if (config.smtp_user) {
            document.getElementById('smtpUser').value = config.smtp_user;
        }
        if (config.from_name) {
            document.getElementById('emailFromName').value = config.from_name;
        }
        if (config.incidents_to) {
            document.getElementById('emailIncidentsTo').value = config.incidents_to;
        }
        if (config.incidents_cc) {
            document.getElementById('emailIncidentsCc').value = config.incidents_cc;
        }
        if (config.smtp_password_set) {
            document.getElementById('smtpPassword').placeholder = '••••••••••••••••';
            document.getElementById('smtpPassword').required = false;
        }
        if (typeof config.enabled !== 'undefined') {
            document.getElementById('emailEnabled').checked = config.enabled;
        }
    }

    closeModal() {
        this.modal.classList.add('hidden');
        document.getElementById('modalOverlay').classList.add('hidden');
        this.hideTestResult();
    }

    async testEmailConfig() {
        const testBtn = document.getElementById('testEmailBtn');
        const originalText = testBtn.textContent;

        // Récupérer les données du formulaire
        const ccValue = document.getElementById('emailIncidentsCc').value;

        const formData = {
            smtp_host: document.getElementById('smtpHost').value,
            smtp_port: parseInt(document.getElementById('smtpPort').value),
            smtp_secure: false, // TLS (port 587)
            smtp_user: document.getElementById('smtpUser').value,
            smtp_password: document.getElementById('smtpPassword').value,
            email_from: this.buildFromAddress(),
            test_recipient: document.getElementById('emailIncidentsTo').value
        };

        // Ajouter le CC seulement s'il est défini (pour qu'il soit inclus dans JSON)
        if (ccValue && ccValue.trim() !== '') {
            formData.test_recipient_cc = ccValue.trim();
        }

        // Validation
        if (!formData.smtp_user || !formData.test_recipient) {
            this.showTestResult(false, 'Veuillez remplir l\'email expéditeur et l\'email destinataire incidents');
            return;
        }

        if (!formData.smtp_password) {
            this.showTestResult(false, 'Veuillez entrer le mot de passe d\'application Gmail');
            return;
        }

        // Désactiver le bouton
        testBtn.disabled = true;
        testBtn.textContent = '⏳ Test en cours...';
        this.hideTestResult();

        try {
            const response = await this.fetchAPI('/api/email-config/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.success) {
                this.showTestResult(true, `Email de test envoyé avec succès ! Vérifiez votre boîte de réception (${formData.test_recipient}).`);
                // Recharger le statut pour afficher "testé"
                await this.loadEmailConfigStatus();
            } else {
                let errorMessage = response.error || 'Erreur lors du test';
                if (response.suggestions && response.suggestions.length > 0) {
                    errorMessage += '\n\nSuggestions :\n' + response.suggestions.map(s => '• ' + s).join('\n');
                }
                this.showTestResult(false, errorMessage, response.helpLink);
            }
        } catch (error) {
            this.showTestResult(false, `Erreur lors du test : ${error.message}`);
        } finally {
            testBtn.disabled = false;
            testBtn.textContent = originalText;
        }
    }

    buildFromAddress() {
        const user = document.getElementById('smtpUser').value;
        const name = document.getElementById('emailFromName').value;
        return name ? `${name} <${user}>` : user;
    }

    showTestResult(success, message, helpLink = null) {
        const resultDiv = document.getElementById('testResult');
        const contentDiv = document.getElementById('testResultContent');

        resultDiv.style.display = 'block';
        resultDiv.style.background = success ? '#e8f5e9' : '#ffebee';
        resultDiv.style.borderLeft = success ? '4px solid #4caf50' : '4px solid #f44336';

        let html = `
            <div style="display: flex; align-items: start; gap: 10px;">
                <div style="font-size: 24px;">${success ? '✅' : '❌'}</div>
                <div style="flex: 1;">
                    <div style="font-weight: bold; margin-bottom: 5px; color: #333;">${success ? 'Test réussi !' : 'Test échoué'}</div>
                    <div style="white-space: pre-wrap; color: #333;">${message}</div>
                    ${helpLink ? `<a href="${helpLink}" target="_blank" style="color: #1976D2; margin-top: 10px; display: inline-block;">📖 Voir le guide d'aide Google</a>` : ''}
                </div>
            </div>
        `;

        contentDiv.innerHTML = html;

        // Scroll vers le résultat
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    hideTestResult() {
        const resultDiv = document.getElementById('testResult');
        resultDiv.style.display = 'none';
    }

    async saveEmailConfig() {
        const saveBtn = document.getElementById('saveEmailConfigBtn');
        const originalText = saveBtn.textContent;

        // Récupérer les données du formulaire
        const formData = {
            smtp_host: document.getElementById('smtpHost').value,
            smtp_port: parseInt(document.getElementById('smtpPort').value),
            smtp_secure: false,
            smtp_user: document.getElementById('smtpUser').value,
            smtp_password: document.getElementById('smtpPassword').value,
            email_from_name: document.getElementById('emailFromName').value,
            email_from_address: document.getElementById('smtpUser').value,
            email_incidents_to: document.getElementById('emailIncidentsTo').value,
            email_incidents_cc: document.getElementById('emailIncidentsCc').value || '',
            email_enabled: document.getElementById('emailEnabled').checked
        };

        // Validation
        if (!formData.smtp_user || !formData.email_incidents_to) {
            alert('Veuillez remplir au minimum l\'email expéditeur et l\'email destinataire');
            return;
        }

        // Si pas de mot de passe et que c'est une nouvelle config
        if (!formData.smtp_password && !this.currentConfig?.smtp_password_set) {
            alert('Veuillez entrer le mot de passe d\'application Gmail');
            return;
        }

        // Si le mot de passe n'a pas changé et qu'il existe déjà, ne pas l'envoyer
        if (!formData.smtp_password && this.currentConfig?.smtp_password_set) {
            delete formData.smtp_password;
        }

        // Désactiver le bouton
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Enregistrement...';

        try {
            const response = await this.fetchAPI('/api/email-config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.success) {
                this.showNotification(true, 'Succès', 'Configuration email enregistrée avec succès !');
                this.closeModal();
                this.loadEmailConfigStatus();
            } else {
                this.showNotification(false, 'Erreur', 'Erreur lors de l\'enregistrement : ' + (response.error || 'Erreur inconnue'));
            }
        } catch (error) {
            this.showNotification(false, 'Erreur', 'Erreur lors de l\'enregistrement : ' + error.message);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    }

    showNotification(success, title, message) {
        const modal = document.getElementById('notificationModal');
        const overlay = document.getElementById('notificationOverlay');
        const icon = document.getElementById('notificationIcon');
        const titleEl = document.getElementById('notificationTitle');
        const messageEl = document.getElementById('notificationMessage');
        const closeBtn = document.getElementById('notificationCloseBtn');

        icon.textContent = success ? '✅' : '❌';
        titleEl.textContent = title;
        messageEl.textContent = message;

        modal.classList.remove('hidden');
        overlay.classList.remove('hidden');

        const closeNotification = () => {
            modal.classList.add('hidden');
            overlay.classList.add('hidden');
            closeBtn.removeEventListener('click', closeNotification);
            overlay.removeEventListener('click', closeNotification);
        };

        closeBtn.addEventListener('click', closeNotification);
        overlay.addEventListener('click', closeNotification);
    }
}

// Initialiser le gestionnaire de configuration email
let emailConfigManager;
document.addEventListener('DOMContentLoaded', () => {
    emailConfigManager = new EmailConfigManager();
});

// Initialiser l'application admin
let adminApp;
document.addEventListener('DOMContentLoaded', () => {
    adminApp = new AdminApp();
});