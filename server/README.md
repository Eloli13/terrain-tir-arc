# 🏹 Serveur Sécurisé - Terrain Tir à l'Arc

## 📋 Vue d'ensemble

Ce serveur est une refonte complète de l'application de gestion des terrains de tir à l'arc, développée selon les meilleures pratiques de sécurité pour remédier aux vulnérabilités critiques identifiées dans l'analyse de sécurité.

### ✨ Fonctionnalités

- **🔐 Authentification sécurisée** avec JWT et refresh tokens
- **🛡️ Validation côté serveur** de toutes les entrées
- **📊 API REST** complète avec CRUD pour sessions et incidents
- **⚙️ Gestion de configuration** centralisée et sécurisée
- **📝 Logs de sécurité et d'audit** complets
- **🔒 Middlewares de sécurité** avancés (Helmet, rate limiting, etc.)
- **🗄️ Base de données PostgreSQL** avec chiffrement et intégrité

### 🎯 Corrections des vulnérabilités critiques

| Vulnérabilité | Status | Solution implémentée |
|---------------|---------|---------------------|
| Authentification côté client | ✅ CORRIGÉ | JWT côté serveur avec refresh tokens |
| Stockage localStorage non sécurisé | ✅ CORRIGÉ | Base de données PostgreSQL chiffrée |
| Mot de passe faible par défaut | ✅ CORRIGÉ | Politique de mots de passe forte + bcrypt |
| Logique métier exposée | ✅ CORRIGÉ | API serveur avec validation stricte |
| Hachage SHA-256 sans sel | ✅ CORRIGÉ | bcrypt avec salt personnalisé |

## 🚀 Installation

### Prérequis

- **Node.js** 16+
- **PostgreSQL** 12+
- **npm** ou **yarn**

### 1. Installation des dépendances

```bash
cd server
npm install
```

### 2. Configuration de l'environnement

Copiez le fichier d'exemple et configurez vos variables :

```bash
cp .env.example .env
```

Éditez le fichier `.env` avec vos paramètres :

```bash
# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=terrain_tir_arc
DB_USER=tir_arc_user
DB_PASSWORD=votre_mot_de_passe_securise

# Sécurité (CHANGER EN PRODUCTION)
JWT_SECRET=votre_cle_jwt_32_caracteres_minimum
JWT_REFRESH_SECRET=votre_cle_refresh_jwt_32_caracteres_minimum
SESSION_SECRET=votre_cle_session_32_caracteres_minimum

# Configuration serveur
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://votre-domaine.com

# Email (optionnel)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe-app
EMAIL_FROM=noreply@votre-club.fr
```

### 3. Configuration de la base de données

Créez un utilisateur PostgreSQL dédié :

```sql
-- Se connecter en tant que superuser (postgres)
sudo -u postgres psql

-- Créer l'utilisateur et la base
CREATE USER tir_arc_user WITH PASSWORD 'votre_mot_de_passe_securise';
CREATE DATABASE terrain_tir_arc OWNER tir_arc_user;
GRANT ALL PRIVILEGES ON DATABASE terrain_tir_arc TO tir_arc_user;
```

### 4. Initialisation de la base de données

Exécutez le script d'installation :

```bash
node scripts/setup-database.js
```

Ce script va :
- Créer toutes les tables nécessaires
- Configurer les index pour les performances
- Insérer la configuration par défaut
- Créer un utilisateur administrateur par défaut

**⚠️ Informations de connexion par défaut :**
- **Nom d'utilisateur :** `admin`
- **Mot de passe :** `changez-moi-en-production`

**🚨 IMPORTANT :** Changez immédiatement ce mot de passe en production !

### 5. Migration des données existantes (optionnel)

Si vous avez des données de l'ancienne application localStorage :

```bash
# Test de migration (simulation)
node scripts/migrate-data.js --dry-run

# Migration réelle
node scripts/migrate-data.js

# Avec un fichier de données spécifique
node scripts/migrate-data.js --source=mes-donnees.json
```

## 🎮 Utilisation

### Démarrage du serveur

```bash
# Développement
npm run dev

# Production
npm start

# Tests
npm test
```

### Vérification de santé

```bash
curl http://localhost:3000/health
```

### Documentation API

Accédez à la documentation interactive :
- **Documentation :** `GET /api/docs`
- **Santé :** `GET /health`
- **Métriques :** `GET /metrics`

## 🔐 Authentification

### Connexion

```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "votre-mot-de-passe"
}
```

**Réponse :**
```json
{
  "message": "Connexion réussie",
  "user": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@club.fr"
  },
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token",
  "expiresIn": 900
}
```

### Utilisation des tokens

Incluez le token d'accès dans l'en-tête de chaque requête :

```bash
Authorization: Bearer <access_token>
```

### Renouvellement du token

```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "votre_refresh_token"
}
```

## 📚 Endpoints API

### 🔐 Authentification (`/api/auth`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/login` | Connexion |
| POST | `/refresh` | Renouvellement du token |
| POST | `/logout` | Déconnexion |
| POST | `/logout-all` | Déconnexion de tous les appareils |
| GET | `/me` | Informations utilisateur |
| POST | `/change-password` | Changement de mot de passe |

### 📊 Sessions (`/api/sessions`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Liste des sessions (avec filtres) |
| POST | `/` | Créer une session |
| GET | `/active` | Sessions actives uniquement |
| GET | `/stats` | Statistiques des sessions |
| GET | `/:id` | Détails d'une session |
| PUT | `/:id` | Modifier une session |
| DELETE | `/:id` | Supprimer une session |

### 🚨 Incidents (`/api/incidents`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Liste des incidents (avec filtres) |
| POST | `/` | Signaler un incident |
| GET | `/stats` | Statistiques des incidents |
| GET | `/:id` | Détails d'un incident |
| PUT | `/:id` | Modifier un incident |
| DELETE | `/:id` | Supprimer un incident |

### ⚙️ Configuration (`/api/config`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Toute la configuration |
| GET | `/:key` | Une valeur spécifique |
| PUT | `/` | Mettre à jour la configuration |
| DELETE | `/:key` | Supprimer une configuration |
| POST | `/validate` | Valider la configuration |
| POST | `/reset` | Réinitialiser aux valeurs par défaut |

## 🔒 Sécurité

### Fonctionnalités de sécurité implémentées

#### 🛡️ Authentification & Autorisation
- **JWT avec refresh tokens** pour la gestion de session
- **Politique de mots de passe forte** (12 caractères min, complexité)
- **Hachage bcrypt** avec salt personnalisé
- **Verrouillage de compte** après 5 tentatives échouées
- **Audit complet** de toutes les actions utilisateur

#### 🚧 Protection contre les attaques
- **Rate limiting** global et par endpoint
- **Détection d'attaques** (injection SQL, XSS, etc.)
- **Validation stricte** de toutes les entrées
- **Sanitisation automatique** des données
- **En-têtes de sécurité** (Helmet.js)
- **Protection CORS** configurable

#### 🗄️ Sécurité des données
- **Base de données PostgreSQL** avec contraintes strictes
- **Transactions** pour l'intégrité des données
- **Chiffrement** des données sensibles
- **Logs sécurisés** avec rotation automatique
- **Connexions chiffrées** SSL/TLS

### Configuration de sécurité recommandée

#### Variables d'environnement critiques
```bash
# Clés de sécurité (OBLIGATOIRE)
JWT_SECRET=32_caracteres_minimum_aleatoires
JWT_REFRESH_SECRET=32_caracteres_minimum_aleatoires
SESSION_SECRET=32_caracteres_minimum_aleatoires

# Sécurité CORS
ALLOWED_ORIGINS=https://votre-domaine.com,https://admin.votre-domaine.com

# Base de données sécurisée
DB_PASSWORD=mot_de_passe_tres_complexe
```

#### Recommandations de déploiement
1. **HTTPS obligatoire** en production
2. **Proxy inverse** (Nginx/Apache) avec configuration sécurisée
3. **Firewall** restrictif (ports 80/443 uniquement)
4. **Sauvegarde chiffrée** régulière de la base de données
5. **Monitoring** de sécurité actif
6. **Mise à jour** régulière des dépendances

## 📊 Monitoring & Logs

### Types de logs

- **`logs/app.log`** : Logs généraux de l'application
- **`logs/error.log`** : Erreurs uniquement
- **`logs/security.log`** : Événements de sécurité

### Métriques disponibles

Endpoint `/metrics` fournit :
- Utilisation mémoire et CPU
- Nombre de sessions actives
- Incidents en attente
- Uptime du serveur

### Monitoring de sécurité

Les événements suivants sont loggés :
- Tentatives de connexion (réussies/échouées)
- Dépassement de rate limits
- Détection d'attaques
- Changements de configuration
- Actions administrateur

## 🔧 Scripts utilitaires

### Configuration de la base de données
```bash
# Installation complète
node scripts/setup-database.js

# Créer un admin personnalisé
node scripts/setup-database.js --create-admin
```

### Migration des données
```bash
# Test de migration
node scripts/migrate-data.js --dry-run

# Migration réelle
node scripts/migrate-data.js --source=data.json

# Export des données actuelles
node scripts/migrate-data.js --export --output=backup.json
```

## 🐛 Dépannage

### Problèmes courants

#### Erreur de connexion à la base
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution :** Vérifiez que PostgreSQL est démarré et accessible

#### Erreur JWT Secret
```
Error: JWT secrets must be defined
```
**Solution :** Configurez les variables `JWT_SECRET` et `JWT_REFRESH_SECRET`

#### Rate limit atteint
```
HTTP 429 - Too Many Requests
```
**Solution :** Attendez ou configurez des limites plus élevées

### Debug

Activez les logs de debug en développement :
```bash
LOG_LEVEL=debug npm run dev
```

### Vérification de santé

```bash
# Test de base
curl http://localhost:3000/health

# Test avec authentification
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/auth/me
```

## 🚀 Déploiement en Production

### Checklist de sécurité

- [ ] Variables d'environnement configurées
- [ ] Mot de passe administrateur changé
- [ ] HTTPS configuré avec certificat valide
- [ ] CORS configuré pour votre domaine
- [ ] Firewall configuré
- [ ] Base de données sécurisée
- [ ] Logs de sécurité activés
- [ ] Monitoring en place
- [ ] Sauvegardes configurées

### Configuration Nginx (exemple)

```nginx
server {
    listen 443 ssl http2;
    server_name api.votre-domaine.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📄 License

Ce projet est développé dans le cadre de la sécurisation de l'application de gestion des terrains de tir à l'arc.

## 🔗 Support

Pour toute question ou problème :
- Consultez les logs dans `logs/`
- Vérifiez la configuration dans `.env`
- Utilisez les endpoints de santé pour diagnostiquer

---

**⚠️ RAPPEL SÉCURITÉ :** Cette application remplace complètement l'ancienne version non sécurisée. Ne jamais utiliser l'ancienne application en production.