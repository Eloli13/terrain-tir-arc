# Implémentation des Notifications en Temps Réel

**Feature** : Système de notifications WebSocket avec Socket.io
**Status** : En cours d'implémentation
**Date** : Janvier 2025

---

## 📋 Vue d'ensemble

Ce document décrit l'implémentation complète du système de notifications en temps réel utilisant WebSockets (Socket.io) pour l'application de gestion des terrains de tir à l'arc.

### Objectifs

✅ Notifier les admins instantanément lors de nouveaux incidents
✅ Mettre à jour les statistiques en temps réel
✅ Afficher les nouvelles sessions sans rafraîchissement
✅ Notifier les changements de statut d'incidents
✅ Interface UI avec sons et badges de notification

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Socket.io Client (admin.js, js/websocket-client.js)│  │
│  │  - Connexion avec token JWT                          │  │
│  │  - Écoute des événements                             │  │
│  │  - Affichage des notifications                       │  │
│  └────────────────────┬─────────────────────────────────┘  │
└────────────────────────┼─────────────────────────────────────┘
                        │ WebSocket (port 3000)
                        │
┌────────────────────────▼─────────────────────────────────────┐
│                        BACKEND                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Socket.io Server (utils/websocket.js)              │  │
│  │  - Authentication middleware                         │  │
│  │  - Room management (admin-room, public-room)        │  │
│  │  - Event emission                                    │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                     │
│  ┌───────────────────────────────────────────┐            │
│  │  Routes (routes/incidents.js, sessions.js)│            │
│  │  - Appels à websocketServer.notifyXXX()   │            │
│  └───────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Fichiers Créés / Modifiés

### Backend

#### 1. `server/utils/websocket.js` ✨ NOUVEAU
Module principal gérant le serveur WebSocket

**Fonctionnalités** :
- Initialisation du serveur Socket.io
- Authentification JWT pour les admins
- Gestion des rooms (admin-room, public-room)
- Méthodes de notification :
  - `notifyNewIncident(incident)`
  - `notifyIncidentUpdated(incident, oldStatus)`
  - `notifyIncidentDeleted(incidentId)`
  - `notifyNewSession(session)`
  - `notifySessionEnded(session)`
  - `updateLiveStats()`
  - `notifyConfigUpdated(key, value)`

**Exemple d'utilisation** :
```javascript
const websocketServer = require('./utils/websocket');

// Dans une route
websocketServer.notifyNewIncident(incident);
```

#### 2. `server/server.js` 🔧 MODIFIÉ
- Import de `http` et `websocketServer`
- Création du serveur HTTP : `http.createServer(app)`
- Initialisation de WebSocket : `websocketServer.initialize(server)`
- Ajout des stats WebSocket dans `/metrics`

**Avant** :
```javascript
const server = app.listen(PORT, () => {
    logger.info(`Serveur démarré sur le port ${PORT}`);
});
```

**Après** :
```javascript
const server = http.createServer(app);
websocketServer.initialize(server);

server.listen(PORT, () => {
    logger.info(`Serveur démarré avec WebSocket sur le port ${PORT}`);
});
```

#### 3. `server/routes/incidents.js` 🔧 MODIFIÉ
Ajout des notifications WebSocket dans les routes :

**POST** `/api/incidents` :
```javascript
// Après création d'incident
websocketServer.notifyNewIncident(result);
```

**PUT** `/api/incidents/:id` :
```javascript
// Après mise à jour
websocketServer.notifyIncidentUpdated(result, existingIncident.statut);
```

**DELETE** `/api/incidents/:id` :
```javascript
// Après suppression
websocketServer.notifyIncidentDeleted(id);
```

#### 4. `server/routes/sessions.js` 🔧 À MODIFIER
**TODO** : Ajouter notifications pour :
- `notifyNewSession(session)` dans POST `/api/sessions`
- `notifySessionEnded(session)` dans PUT `/api/sessions/:id` (active=false)

#### 5. `server/routes/config.js` 🔧 À MODIFIER
**TODO** : Ajouter `notifyConfigUpdated(key, value)` dans PUT `/api/config`

#### 6. `server/package.json` 🔧 MODIFIÉ
Ajout de la dépendance :
```json
"socket.io": "^4.8.1"
```

---

### Frontend

#### 7. `js/websocket-client.js` ✨ À CRÉER
Module client WebSocket réutilisable

**Fonctionnalités** :
- Connexion automatique avec reconnexion
- Gestion du token JWT pour admins
- API simple pour écouter les événements
- Gestion des erreurs

**Structure** :
```javascript
class WebSocketClient {
    constructor(url, token = null) {
        this.url = url;
        this.token = token;
        this.socket = null;
        this.connect();
    }

    connect() {
        // Connexion à Socket.io
    }

    on(event, callback) {
        // Écouter un événement
    }

    emit(event, data) {
        // Émettre un événement
    }

    disconnect() {
        // Déconnexion propre
    }
}
```

#### 8. `admin/admin.js` 🔧 À MODIFIER
Intégration du client WebSocket dans l'interface admin

**À ajouter** :
```javascript
class AdminApp {
    constructor() {
        // ...
        this.setupWebSocket();
    }

    setupWebSocket() {
        const token = DatabaseManager.getAuthToken();
        this.ws = new WebSocketClient('/api', token);

        // Incidents
        this.ws.on('incident:created', (data) => {
            this.handleNewIncident(data);
        });

        this.ws.on('incident:updated', (data) => {
            this.handleIncidentUpdated(data);
        });

        this.ws.on('incident:deleted', (data) => {
            this.handleIncidentDeleted(data);
        });

        // Sessions
        this.ws.on('session:created', (data) => {
            this.handleNewSession(data);
        });

        this.ws.on('session:ended', (data) => {
            this.handleSessionEnded(data);
        });

        // Stats temps réel
        this.ws.on('stats:updated', (data) => {
            this.updateStatsDisplay(data);
        });
    }

    handleNewIncident(data) {
        // Afficher notification
        this.showNotification('Nouvel incident signalé!', 'info');

        // Ajouter à la liste si on est sur l'onglet incidents
        if (this.currentTab === 'incidents') {
            this.prependIncidentToTable(data.data);
        }

        // Incrémenter le badge
        this.incrementNotificationBadge();

        // Jouer un son
        this.playNotificationSound();
    }

    // ...
}
```

#### 9. `admin/index.html` 🔧 À MODIFIER
Ajout des éléments UI pour les notifications

**À ajouter** :
```html
<!-- Zone de notifications -->
<div id="notificationContainer" class="notification-container"></div>

<!-- Badge de notifications non lues -->
<div class="notification-badge hidden" id="notificationBadge">
    <span id="notificationCount">0</span>
</div>

<!-- Panneau latéral de notifications -->
<div id="notificationPanel" class="notification-panel hidden">
    <div class="notification-header">
        <h3>Notifications</h3>
        <button id="clearNotifications">Tout effacer</button>
    </div>
    <div id="notificationList" class="notification-list">
        <!-- Notifications ici -->
    </div>
</div>

<!-- Son de notification -->
<audio id="notificationSound" src="../sounds/notification.mp3" preload="auto"></audio>

<!-- Import Socket.io client -->
<script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>
<script src="../js/websocket-client.js"></script>
```

#### 10. `css/style.css` 🔧 À MODIFIER
Styles pour les notifications

**À ajouter** :
```css
/* Container de notifications (toasts) */
.notification-container {
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 400px;
}

/* Notification toast */
.notification-toast {
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 16px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    animation: slideIn 0.3s ease-out;
}

.notification-toast.info {
    border-left: 4px solid #2196F3;
}

.notification-toast.success {
    border-left: 4px solid #4CAF50;
}

.notification-toast.warning {
    border-left: 4px solid #FF9800;
}

.notification-toast.error {
    border-left: 4px solid #F44336;
}

/* Animation d'entrée */
@keyframes slideIn {
    from {
        transform: translateX(400px);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

/* Badge de notifications */
.notification-badge {
    position: fixed;
    top: 20px;
    right: 80px;
    background: #F44336;
    color: white;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    cursor: pointer;
    z-index: 1000;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.1);
    }
}

/* Panneau de notifications */
.notification-panel {
    position: fixed;
    top: 0;
    right: -400px;
    width: 400px;
    height: 100vh;
    background: white;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
    z-index: 9999;
    transition: right 0.3s ease-out;
    overflow-y: auto;
}

.notification-panel.show {
    right: 0;
}

.notification-header {
    padding: 20px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.notification-list {
    padding: 10px;
}

.notification-item {
    padding: 12px;
    border-bottom: 1px solid #eee;
    cursor: pointer;
    transition: background 0.2s;
}

.notification-item:hover {
    background: #f5f5f5;
}

.notification-item.unread {
    background: #e3f2fd;
}
```

#### 11. `sounds/notification.mp3` ✨ À AJOUTER
Fichier audio pour les notifications (optionnel)

---

## 🔌 Événements WebSocket

### Événements Émis par le Serveur

#### Incidents

| Événement | Destinataires | Données | Trigger |
|-----------|---------------|---------|---------|
| `incident:created` | Admin | `{ type, timestamp, data: incident, message }` | POST `/api/incidents` |
| `incident:created-public` | Public | `{ type, timestamp, message }` | POST `/api/incidents` |
| `incident:updated` | Admin | `{ type, timestamp, data: incident, oldStatus, message }` | PUT `/api/incidents/:id` |
| `incident:deleted` | Admin | `{ type, timestamp, data: { id }, message }` | DELETE `/api/incidents/:id` |

#### Sessions

| Événement | Destinataires | Données | Trigger |
|-----------|---------------|---------|---------|
| `session:created` | Tous | `{ type, timestamp, data: session, message }` | POST `/api/sessions` |
| `session:ended` | Tous | `{ type, timestamp, data: session, message }` | PUT `/api/sessions/:id` (active=false) |

#### Statistiques

| Événement | Destinataires | Données | Trigger |
|-----------|---------------|---------|---------|
| `stats:updated` | Tous | `{ type, timestamp, data: { interieur, exterieur } }` | Après session créée/terminée |
| `connection-stats` | Admin | `{ total, admins, public }` | Connexion/Déconnexion client |

#### Configuration

| Événement | Destinataires | Données | Trigger |
|-----------|---------------|---------|---------|
| `config:updated` | Admin | `{ type, timestamp, data: { key, value }, message }` | PUT `/api/config` |

### Événements Reçus par le Serveur

| Événement | Description | Réponse |
|-----------|-------------|---------|
| `ping` | Test de connexion | `pong` avec timestamp |
| `test` | Test avec données | `test-response` |
| `disconnect` | Déconnexion client | Logs + update stats |

---

## 🔐 Authentification

### Mode Public (sans token)
```javascript
const socket = io('http://localhost:3000');
// Connexion autorisée, rejoint 'public-room'
// Reçoit uniquement les événements publics
```

### Mode Admin (avec token JWT)
```javascript
const token = localStorage.getItem('auth_token');
const socket = io('http://localhost:3000', {
    auth: { token }
});
// Connexion autorisée, rejoint 'admin-room'
// Reçoit tous les événements (admin + public)
```

---

## 📊 Format des Notifications

### Structure Standard
```javascript
{
    type: 'incident_created',        // Type d'événement
    timestamp: '2025-01-15T14:30:00.000Z',
    data: {                          // Données spécifiques
        id: 'uuid',
        type_incident: 'probleme_materiel',
        // ...
    },
    message: 'Nouvel incident signalé!'  // Message humain
}
```

### Types de Notifications UI

1. **Info** (bleu) : Nouvelle session, stats mises à jour
2. **Success** (vert) : Incident résolu
3. **Warning** (orange) : Incident en cours de traitement
4. **Error** (rouge) : Nouvel incident, incident critique

---

## 🎨 Interface Utilisateur

### Toast Notifications
- Affichage en haut à droite
- Durée : 5 secondes
- Fermeture automatique ou manuelle (X)
- Animation de slide-in
- Son optionnel

### Badge de Notifications
- Compteur de notifications non lues
- Position : top-right
- Animation pulse
- Clic pour ouvrir le panneau

### Panneau Latéral
- Historique des notifications
- Marquage lu/non lu
- Effacement individuel ou global
- Filtre par type

---

## 🔧 Configuration

### Variables d'Environnement
```bash
# Déjà configurées
ALLOWED_ORIGINS=https://votre-domaine.com
JWT_SECRET=votre_secret

# Socket.io utilise automatiquement les mêmes
```

### Options Socket.io Server
```javascript
const io = new Server(httpServer, {
    cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 60000,      // 60 secondes
    pingInterval: 25000      // 25 secondes
});
```

---

## 🧪 Tests

### Test de Connexion (Browser Console)
```javascript
// Connexion publique
const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('✅ Connecté:', socket.id);
});

socket.on('incident:created-public', (data) => {
    console.log('📢 Nouvel incident:', data);
});

// Test ping
socket.emit('ping');
socket.on('pong', (data) => {
    console.log('🏓 Pong:', data);
});
```

### Test Admin (avec token)
```javascript
const token = 'votre-jwt-token';
const socket = io('http://localhost:3000', {
    auth: { token }
});

socket.on('incident:created', (data) => {
    console.log('📢 Incident (admin):', data);
});
```

### Test API (créer incident)
```bash
curl -X POST http://localhost:3000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "type_incident": "probleme_materiel",
    "description": "Test notification WebSocket",
    "terrain": "interieur"
  }'

# Vérifier dans la console browser:
# 📢 Nouvel incident reçu!
```

---

## 📈 Monitoring

### Statistiques WebSocket
```bash
# Endpoint de métriques
curl http://localhost:3000/metrics

# Réponse inclut:
{
    "websocket": {
        "totalConnections": 5,
        "adminConnections": 2,
        "publicConnections": 3,
        "clients": [
            {
                "socketId": "abc123",
                "userType": "admin",
                "username": "admin",
                "connectedAt": "2025-01-15T10:00:00.000Z"
            }
        ]
    }
}
```

### Logs
```
✅ Serveur WebSocket initialisé
🔌 Nouvelle connexion WebSocket: abc123 (admin: admin)
👨‍💼 Admin admin a rejoint admin-room
📢 Notification: Nouvel incident créé (ID: uuid)
🔌 Déconnexion: abc123 (transport close)
```

---

## 🚀 Déploiement

### Coolify / Production

1. **Socket.io fonctionne sur le même port** (3000)
   - Nginx proxy déjà configuré ✅
   - Pas de port supplémentaire nécessaire

2. **WebSocket upgrading automatique**
   - HTTP → WebSocket automatique
   - Supporté par Nginx et Traefik

3. **Variables d'environnement**
   - Utilise `ALLOWED_ORIGINS` existant
   - Pas de configuration additionnelle

4. **Build Docker**
```bash
# Rebuild avec Socket.io
docker build -t eloli/gestion_site_arc:latest .
docker push eloli/gestion_site_arc:latest

# Redeploy dans Coolify
# WebSocket fonctionne automatiquement!
```

---

## ✅ Checklist d'Implémentation

### Backend
- [x] Installer Socket.io (`npm install socket.io`)
- [x] Créer `server/utils/websocket.js`
- [x] Modifier `server/server.js` (http + initialize)
- [x] Modifier `server/routes/incidents.js` (notifications)
- [ ] Modifier `server/routes/sessions.js` (notifications)
- [ ] Modifier `server/routes/config.js` (notifications)
- [x] Exporter `websocketServer` dans `server.js`

### Frontend
- [ ] Ajouter Socket.io client CDN dans `admin/index.html`
- [ ] Créer `js/websocket-client.js`
- [ ] Modifier `admin/admin.js` (integration WebSocket)
- [ ] Ajouter HTML notifications dans `admin/index.html`
- [ ] Ajouter styles notifications dans `css/style.css`
- [ ] (Optionnel) Ajouter `sounds/notification.mp3`

### Tests
- [ ] Tester connexion WebSocket (console browser)
- [ ] Tester création incident → notification
- [ ] Tester mise à jour incident → notification
- [ ] Tester suppression incident → notification
- [ ] Tester création session → mise à jour stats
- [ ] Tester reconnexion automatique

### Documentation
- [x] Documenter l'architecture
- [x] Documenter les événements
- [x] Documenter l'authentification
- [ ] Créer guide utilisateur (notifications)

---

## 🎯 Prochaines Étapes

1. ✅ **Terminer Backend**
   - Ajouter notifications dans `sessions.js`
   - Ajouter notifications dans `config.js`

2. **Créer Frontend**
   - WebSocket client réutilisable
   - UI de notifications (toasts)
   - Badge et panneau latéral
   - Sons et animations

3. **Tests Complets**
   - Scénarios utilisateur réels
   - Tests de charge (10+ connexions)
   - Tests de reconnexion

4. **Déploiement**
   - Build et push Docker
   - Redeploy Coolify
   - Tests en production

5. **Documentation Utilisateur**
   - Guide d'utilisation des notifications
   - Paramètres (sons, fréquence)

---

## 💡 Améliorations Futures

### Phase 2
- [ ] Persistance des notifications (PostgreSQL)
- [ ] Notification history (7 derniers jours)
- [ ] Filtres par type/priorité
- [ ] Recherche dans notifications
- [ ] Marquage lu/non lu

### Phase 3
- [ ] Notifications push (PWA)
- [ ] Intégration mobile (React Native)
- [ ] Notifications email configurable
- [ ] Webhooks vers services externes
- [ ] Slack/Discord integration

### Phase 4
- [ ] Notifications groupées (digest)
- [ ] Préférences utilisateur (types, fréquence)
- [ ] Mode ne pas déranger
- [ ] Notifications planifiées
- [ ] Analytics (taux d'ouverture)

---

**Document créé le** : Janvier 2025
**Version** : 1.0 (En cours)
**Auteur** : Claude Code Implementation
**Prochaine révision** : Après implémentation frontend
