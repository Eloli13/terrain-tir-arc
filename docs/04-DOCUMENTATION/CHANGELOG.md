# Changelog - Terrain Tir à l'Arc

Toutes les modifications notables du projet sont documentées dans ce fichier.

## [1.1.0] - 2025-01-15

### ✅ Corrections de bugs critiques

#### Bug #1: Crash `sessions.forEach is not a function` dans admin.js
- **Fichier**: `admin/admin.js:291`
- **Problème**: La méthode `aggregateSessionsByDay()` ne vérifiait pas si le paramètre `sessions` était un array avant d'appeler `.forEach()`
- **Impact**: Crash de la page de fréquentation quand l'API retournait `null` ou un objet au lieu d'un array
- **Solution**: Ajout d'une vérification `Array.isArray(sessions)` avec retour d'array vide si invalide
- **Commit**: Ajout de vérification defensive dans aggregateSessionsByDay()

#### Bug #2: Routes incidents inaccessibles publiquement
- **Fichier**: `server/routes/incidents.js:10`
- **Problème**: `router.use(requireAuth)` bloquait TOUTES les routes incidents, même pour les utilisateurs publics
- **Impact**: Les utilisateurs ne pouvaient pas signaler d'incidents sans être administrateurs
- **Solution**:
  - Retrait du `router.use(requireAuth)` global
  - Ajout de `requireAuth` uniquement sur PUT et DELETE
  - Modification de POST/GET pour accepter utilisateurs non-authentifiés
  - `created_by` devient optionnel (NULL si utilisateur public)
- **Commit**: Rendre routes POST/GET incidents accessibles publiquement

### 🎉 Nouvelles fonctionnalités

#### Upload de photos pour incidents
- **Fichiers**:
  - `server/middleware/upload.js` (nouveau)
  - `server/routes/incidents.js` (route `/api/incidents/upload`)
  - `server/server.js` (servir `/uploads`)
- **Fonctionnalités**:
  - Middleware multer pour upload sécurisé
  - Validation des types de fichiers (images uniquement)
  - Limite de taille: 10 MB
  - Nommage unique des fichiers
  - Route `/api/incidents/upload` (POST multipart/form-data)
  - Serveur statique pour afficher les photos
- **Sécurité**:
  - Filtre MIME types (JPEG, PNG, GIF, WebP uniquement)
  - Protection contre les uploads malveillants
  - Stockage sécurisé dans `server/uploads/incidents/`
- **Commit**: Implémenter upload de photos d'incidents avec multer

#### Notifications email réelles
- **Fichiers**:
  - `server/utils/email.js` (nouveau)
  - `server/routes/incidents.js` (utilisation du service email)
- **Fonctionnalités**:
  - Service nodemailer pour envoi d'emails
  - Support SMTP réel (production) et Ethereal (test)
  - Templates HTML professionnels
  - Notification automatique lors de création d'incident
  - Fonction `sendTestEmail()` pour vérifier la config
- **Configuration**:
  - Variables d'environnement SMTP optionnelles
  - Fallback vers Ethereal si pas de config
  - Mode simulation si aucun transporteur disponible
- **Commit**: Implémenter notifications email avec nodemailer

#### Page dédiée signalement d'incidents
- **Fichier**: `incident.html` (nouveau)
- **Fonctionnalités**:
  - Formulaire complet de signalement
  - Upload de photo intégré
  - Validation côté client
  - Support API et fallback localStorage
  - Bouton d'urgence pour appeler responsable
  - Design responsive et accessible
- **Intégration**:
  - Lien depuis `declaration.html` (bouton "Signaler")
  - Redirection automatique après envoi
  - Messages de confirmation/erreur
- **Commit**: Créer page dédiée signalement incidents

#### Bouton contact d'urgence
- **Fichiers**: `incident.html`, `declaration.html`
- **Fonctionnalité**: Bouton "📞 Appeler le Responsable" avec `tel:` link
- **Configuration**: Numéro chargé depuis la configuration (BDD ou localStorage)
- **Commit**: Ajouter bouton contact d'urgence

### 🔧 Améliorations techniques

#### Configuration environnement
- **Fichier**: `.env.example` (nouveau)
- **Contenu**:
  - Documentation complète de toutes les variables
  - Exemples de configuration SMTP
  - Configuration JWT
  - Configuration limites

#### Tests unitaires
- **Fichiers**:
  - `server/__tests__/routes/incidents.test.js` (nouveau)
  - `server/__tests__/routes/sessions.test.js` (nouveau)
  - `server/jest.config.js` (nouveau)
- **Coverage**: Routes incidents et sessions (accès public)

### 📝 Documentation

- **README.md**: Mise à jour des fonctionnalités implémentées
- **CHANGELOG.md**: Ce fichier
- `.env.example`: Guide de configuration

### 🔐 Sécurité

- Upload de fichiers sécurisé (validation type, taille)
- Sanitization maintenue sur tous les inputs
- Audit logs optionnels (seulement si user authentifié)
- Rate limiting toujours actif

### 📦 Dépendances ajoutées

```json
{
  "multer": "^2.0.2",
  "nodemailer": "^6.9.7"
}
```

### ⚙️ Configuration requise

#### Nouvelle configuration BDD
- Champ `created_by` dans `incidents` et `sessions` est maintenant **nullable**

```sql
ALTER TABLE incidents ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE sessions ALTER COLUMN created_by DROP NOT NULL;
```

#### Variables d'environnement optionnelles
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (pour emails en production)
- `EMAIL_FROM` (expéditeur des emails)

### 🚀 Migration

1. Copier `.env.example` vers `.env` et configurer
2. Mettre à jour les champs nullable en BDD (voir SQL ci-dessus)
3. Installer les nouvelles dépendances: `npm install`
4. Redémarrer le serveur: `npm start`

### 📋 Checklist fonctionnalités README

| Fonctionnalité | Status | Notes |
|----------------|--------|-------|
| Scanner QR Code | ✅ | Déjà implémenté |
| Déclaration de présence | ✅ | Déjà implémenté |
| Sélection de terrain | ✅ | Déjà implémenté |
| Gestion de session | ✅ | Déjà implémenté |
| **Signalement d'incidents** | ✅ | **Nouvellement implémenté** |
| **Contact d'urgence** | ✅ | **Nouvellement implémenté** |
| Mode hors ligne | ✅ | Déjà implémenté |
| Tableau de bord admin | ✅ | Bug forEach corrigé |
| Gestion des sessions admin | ✅ | Déjà implémenté |
| Suivi des incidents admin | ✅ | Déjà implémenté |
| Rapports (CSV/JSON/PDF) | ✅ | Déjà implémenté |
| Configuration | ✅ | Déjà implémenté |
| Génération QR Code | ✅ | Déjà implémenté |
| Statistiques avancées | ✅ | Bug forEach corrigé |

### 🎯 Toutes les fonctionnalités promises dans le README sont maintenant implémentées !

---

## [1.0.0] - 2025-01-01

### Version initiale

- Application PWA de gestion des terrains de tir à l'arc
- Frontend: HTML/CSS/JS avec Service Worker
- Backend: Node.js/Express avec PostgreSQL
- Authentification JWT
- Sécurité: Helmet, rate limiting, validation Joi
- Admin: Interface complète de gestion
- Mode hors ligne avec localStorage fallback
