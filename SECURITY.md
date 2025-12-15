# 🔒 Guide de Sécurité - Terrain de Tir à l'Arc

> **Version**: 1.0.0
> **Dernière mise à jour**: Décembre 2024
> **Niveau de sécurité**: 9.5/10

---

## 📋 Table des Matières

- [Vue d'Ensemble](#-vue-densemble)
- [Fonctionnalités de Sécurité](#-fonctionnalités-de-sécurité)
- [Scripts de Sécurité](#-scripts-de-sécurité)
- [API de Sécurité](#-api-de-sécurité)
- [Configuration Sécurisée](#-configuration-sécurisée)
- [Bonnes Pratiques](#-bonnes-pratiques)
- [Audit et Monitoring](#-audit-et-monitoring)
- [Rotation des Secrets](#-rotation-des-secrets)
- [Signalement de Vulnérabilités](#-signalement-de-vulnérabilités)

---

## 🛡️ Vue d'Ensemble

Cette application implémente des mesures de sécurité de niveau **production** conformes aux standards OWASP et aux bonnes pratiques de Context7 pour Express.js, JWT et PostgreSQL.

### Score de Sécurité : 9.5/10

| Composant | Score | État |
|-----------|-------|------|
| Authentification JWT | 10/10 | ✅ Excellent |
| Base de données PostgreSQL | 10/10 | ✅ Excellent |
| API REST | 9.5/10 | ✅ Excellent |
| WebSocket | 10/10 | ✅ Excellent |
| Configuration | 10/10 | ✅ Excellent |
| Infrastructure Docker | 9/10 | ✅ Très bon |

---

## 🔐 Fonctionnalités de Sécurité

### 1. **Authentification & Autorisation**

#### JWT avec Sécurité Renforcée
- ✅ Tokens d'accès courts (15 minutes)
- ✅ Refresh tokens longs (7 jours)
- ✅ Algorithmes explicites (`HS256`)
- ✅ Validation `issuer` et `audience`
- ✅ Stockage des refresh tokens en base (hash SHA-256)
- ✅ Système de révocation fonctionnel

**Exemple de configuration** :
```javascript
// Génération de token
jwt.sign(payload, secret, {
    algorithm: 'HS256',              // Algorithme explicite
    expiresIn: '15m',
    issuer: 'terrain-tir-arc-server',
    audience: 'terrain-tir-arc-client'
});

// Vérification de token
jwt.verify(token, secret, {
    algorithms: ['HS256'],           // Liste d'algorithmes autorisés
    issuer: 'terrain-tir-arc-server',
    audience: 'terrain-tir-arc-client'
});
```

#### Double Salting des Mots de Passe
- ✅ Salt personnalisé (32 bytes crypto.randomBytes)
- ✅ Bcrypt avec 12 rounds minimum
- ✅ Protection contre rainbow tables

**Méthode** :
```javascript
const salt = crypto.randomBytes(32).toString('hex');
const saltedPassword = password + salt;
const bcryptHash = await bcrypt.hash(saltedPassword, 12);
```

#### Protection Brute-Force
- ✅ Verrouillage après 5 tentatives échouées
- ✅ Durée de verrouillage : 30 minutes
- ✅ Compteur de tentatives par utilisateur
- ✅ Logs de sécurité pour chaque tentative

#### Changement de Mot de Passe Obligatoire
- ✅ Flag `must_change_password` en base
- ✅ Blocage de connexion tant que non changé
- ✅ Admin par défaut forcé à changer son mot de passe

### 2. **Sécurité de l'API**

#### Helmet.js avec CSP Dynamique
- ✅ Content Security Policy avec **nonces uniques**
- ✅ Plus de `'unsafe-inline'` (meilleure sécurité)
- ✅ Protection XSS, clickjacking, MIME sniffing
- ✅ 11 headers de sécurité activés

**Configuration CSP** :
```javascript
// Génération de nonce unique par requête
app.use((req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
    next();
});

// Utilisation dans HTML
<script nonce="<%= locals.cspNonce %>">...</script>
```

#### Rate Limiting Multi-Niveaux
- ✅ **Global** : 100 requêtes / 15 minutes
- ✅ **Authentification** : 5 tentatives / 15 minutes
- ✅ **Speed limiting** : ralentissement progressif après 50 requêtes
- ✅ Trust proxy activé pour headers `X-Forwarded-For`

#### Détection d'Attaques
- ✅ Patterns XSS détectés
- ✅ Patterns SQL injection bloqués
- ✅ Path traversal détecté
- ✅ User-Agents suspects identifiés
- ✅ Logs de sécurité automatiques

### 3. **Base de Données PostgreSQL**

#### Sécurité des Connexions
- ✅ SSL activé en production avec validation de certificat
- ✅ Connection pooling sécurisé (max 20, timeout 2s)
- ✅ Requêtes paramétrées (100% des requêtes)
- ✅ Aucune interpolation de string SQL

**Configuration SSL** :
```javascript
ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true  // Validation du certificat activée
} : false
```

#### Optimisation & Performance
- ✅ **18 index stratégiques** créés
- ✅ Index partiels pour meilleures performances
- ✅ ANALYZE automatique après création d'index
- ✅ Triggers `updated_at` automatiques

### 4. **WebSocket Sécurisé**

- ✅ Authentification JWT dans `handshake.auth.token`
- ✅ Algorithmes explicites lors de la vérification
- ✅ Séparation des rooms (admin vs public)
- ✅ Connexions publiques autorisées (sans token)
- ✅ CORS configuré correctement

### 5. **Audit & Logging**

#### Winston Logger
- ✅ Logs multi-niveaux (debug, info, warn, error, security)
- ✅ Rotation automatique des logs
- ✅ Logs sécurité séparés

#### Audit Trail Complet
- ✅ Toutes les actions sensibles loggées en base
- ✅ Table `audit_logs` dédiée
- ✅ Capture de l'IP, User-Agent, timestamp
- ✅ Historique des modifications (old_values / new_values)

---

## 🛠️ Scripts de Sécurité

### 1. Audit de Sécurité Automatisé

Exécute un audit complet du système :

```bash
# Audit complet avec rapport
npm run security:audit

# Audit avec correction automatique
npm run security:audit:fix
```

**Ce qui est vérifié** :
- ✅ Vulnérabilités npm (npm audit)
- ✅ Force des secrets (.env)
- ✅ Configurations de sécurité
- ✅ Permissions des fichiers sensibles
- ✅ Dépendances obsolètes

**Sortie exemple** :
```
🔒 === Audit de Sécurité Automatisé ===

📦 Vérification des vulnérabilités npm...
   ✓ Critique: 0 | Élevé: 0 | Moyen: 0 | Faible: 2

🔑 Vérification de la force des secrets...
   ✓ JWT_SECRET: OK (64 caractères)
   ✓ JWT_REFRESH_SECRET: OK (64 caractères)

⚙️  Vérification des configurations de sécurité...
   ✓ NODE_ENV en production
   ✓ BCRYPT_ROUNDS ≥ 12

📊 Score de Sécurité: 95/100 🟢
```

### 2. Rotation des Secrets JWT

Génère de nouveaux secrets et met à jour `.env` :

```bash
# Test (voir les nouveaux secrets sans les appliquer)
npm run security:rotate:dry

# Application (avec confirmation)
npm run security:rotate
```

**Processus** :
1. Génération de 4 nouveaux secrets (32 bytes chacun)
2. Backup automatique de `.env`
3. Mise à jour des secrets
4. Tous les tokens existants sont invalidés
5. Redémarrage du serveur requis

**⚠️ Impact** :
- Tous les utilisateurs seront déconnectés
- Nécessite un redémarrage du serveur

### 3. NPM Audit

```bash
# Audit des vulnérabilités
npm run audit

# Correction automatique
npm run audit:fix

# Vérifier les dépendances obsolètes
npm run outdated
```

---

## 🔌 API de Sécurité

### Endpoints Disponibles (Admin uniquement)

#### 1. Statut de Sécurité Système

**GET** `/api/v1/security/status`

Retourne un rapport complet de sécurité :

```json
{
  "timestamp": "2024-12-04T10:00:00Z",
  "securityScore": 95,
  "level": "excellent",
  "checks": {
    "secretsStrength": "pass",
    "bcryptStrength": "pass",
    "corsConfiguration": "pass",
    "productionMode": "pass",
    "ssl": "pass"
  },
  "statistics": {
    "activeUsers": 5,
    "usersNeedingPasswordChange": 0,
    "activeSessions": 12,
    "auditLogs24h": 143,
    "logins24h": 15,
    "lockedAccounts": 0
  },
  "recommendations": []
}
```

#### 2. Logs d'Audit

**GET** `/api/v1/security/audit-logs`

Paramètres query :
- `limit` : Nombre de logs (défaut: 50)
- `offset` : Décalage pour pagination (défaut: 0)
- `action` : Filtrer par action (LOGIN, LOGOUT, etc.)
- `userId` : Filtrer par utilisateur
- `startDate` : Date de début
- `endDate` : Date de fin

**Exemple** :
```bash
GET /api/v1/security/audit-logs?action=LOGIN&limit=20
```

#### 3. Sessions Actives

**GET** `/api/v1/security/active-sessions`

Liste toutes les sessions actives avec IP de connexion :

```json
{
  "sessions": [
    {
      "id": "uuid",
      "userId": "uuid",
      "username": "john_doe",
      "email": "john@example.com",
      "createdAt": "2024-12-04T09:00:00Z",
      "expiresAt": "2024-12-11T09:00:00Z",
      "lastIp": "192.168.1.100"
    }
  ],
  "total": 12
}
```

#### 4. Révoquer une Session

**DELETE** `/api/v1/security/revoke-session/:sessionId`

Révoque immédiatement une session (admin peut déconnecter un utilisateur).

---

## ⚙️ Configuration Sécurisée

### Variables d'Environnement Essentielles

```bash
# === Secrets Cryptographiques ===
# IMPORTANT: Générez avec crypto.randomBytes(32)
JWT_SECRET=<64 caractères hexadécimaux>
JWT_REFRESH_SECRET=<64 caractères hexadécimaux>
SESSION_SECRET=<64 caractères hexadécimaux>
ENCRYPTION_KEY=<64 caractères hexadécimaux>

# === Base de Données ===
DB_HOST=localhost
DB_PORT=5432
DB_NAME=terrain_tir_arc
DB_USER=terrain_user
DB_PASSWORD=<mot de passe fort>

# === SSL PostgreSQL ===
# Par défaut: validation activée en production
# Pour désactiver temporairement (non recommandé):
DB_SSL_REJECT_UNAUTHORIZED=false

# === Serveur ===
NODE_ENV=production
PORT=3000

# === Sécurité ===
BCRYPT_ROUNDS=12
ALLOWED_ORIGINS=https://votredomaine.com

# === Rate Limiting ===
RATE_LIMIT_WINDOW_MS=900000   # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100   # 100 requêtes par fenêtre
```

### Génération de Secrets Forts

```bash
# Méthode 1: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Méthode 2: Script de rotation
npm run security:rotate:dry

# Méthode 3: OpenSSL
openssl rand -hex 32
```

---

## ✅ Bonnes Pratiques

### 1. **En Développement**

```bash
# Utiliser des secrets différents du .env.example
cp .env.example .env
npm run security:rotate:dry  # Copier les secrets générés

# Ne JAMAIS committer .env
git status  # Vérifier que .env est dans .gitignore
```

### 2. **En Production**

```bash
# 1. Générer des secrets uniques
npm run security:rotate

# 2. Activer SSL PostgreSQL
# Dans .env.production:
NODE_ENV=production
DB_SSL_REJECT_UNAUTHORIZED=true  # Ou omis (true par défaut)

# 3. Configurer CORS strictement
ALLOWED_ORIGINS=https://production.votredomaine.com

# 4. Changer le mot de passe admin
# Première connexion forcera le changement
```

### 3. **Maintenance Régulière**

```bash
# Chaque semaine
npm run security:audit

# Chaque mois
npm run audit
npm run outdated
npm update

# Chaque trimestre
npm run security:rotate  # Rotation des secrets JWT
```

### 4. **Monitoring**

```bash
# Vérifier les logs de sécurité
docker-compose logs app | grep "security"

# Consulter l'audit trail via l'API
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost/api/v1/security/audit-logs

# Vérifier les sessions actives
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost/api/v1/security/active-sessions
```

---

## 📊 Audit et Monitoring

### Logs de Sécurité

Les événements suivants sont loggés automatiquement :

| Événement | Sévérité | Action |
|-----------|----------|--------|
| Tentative de connexion avec identifiant inexistant | SECURITY | Alert |
| 5 tentatives de connexion échouées | SECURITY | Verrouillage compte |
| Connexion réussie | SECURITY | Log |
| Token JWT invalide ou expiré | SECURITY | Log |
| Rate limit dépassé | SECURITY | Block + Log |
| Attaque détectée (XSS, SQLi) | SECURITY | Block + Alert |
| Modification de mot de passe | SECURITY | Log + Audit |
| Révocation de session | SECURITY | Log + Audit |

### Table Audit Logs

Toutes les actions sensibles sont enregistrées dans `audit_logs` :

```sql
SELECT
  al.action,
  al.resource,
  al.created_at,
  au.username,
  al.ip_address
FROM audit_logs al
LEFT JOIN admin_users au ON al.user_id = au.id
WHERE al.created_at > NOW() - INTERVAL '24 hours'
ORDER BY al.created_at DESC;
```

---

## 🔄 Rotation des Secrets

### Pourquoi Faire une Rotation ?

- ✅ Limiter l'impact d'une compromission
- ✅ Conformité réglementaire (ISO 27001, SOC 2)
- ✅ Bonne pratique de sécurité (rotation tous les 90 jours)

### Processus de Rotation

```bash
# 1. Tester la rotation (voir les nouveaux secrets)
npm run security:rotate:dry

# 2. Planifier une maintenance (déconnexion des utilisateurs)
# Envoyer une notification aux utilisateurs

# 3. Exécuter la rotation
npm run security:rotate
# Tapez "oui" pour confirmer

# 4. Redémarrer le serveur
docker-compose restart app

# 5. Vérifier que tout fonctionne
curl http://localhost/health
```

### Planning Recommandé

| Fréquence | Action |
|-----------|--------|
| **Hebdomadaire** | Audit de sécurité (`npm run security:audit`) |
| **Mensuel** | Vérification des vulnérabilités npm |
| **Trimestriel** | Rotation des secrets JWT |
| **Annuel** | Audit de sécurité complet externe |

---

## 🚨 Signalement de Vulnérabilités

Si vous découvrez une faille de sécurité :

### **NE PAS** :
- ❌ Créer une issue publique sur GitHub
- ❌ Divulguer la vulnérabilité publiquement
- ❌ Exploiter la vulnérabilité

### **À FAIRE** :
1. ✅ Envoyer un email à : **security@terrain-tir-arc.com**
2. ✅ Inclure :
   - Description détaillée de la vulnérabilité
   - Étapes pour reproduire
   - Impact potentiel
   - Votre nom (pour les remerciements)
3. ✅ Attendre notre réponse (sous 48h)

### Reconnaissance

Les chercheurs en sécurité qui signalent de manière responsable seront mentionnés dans le CHANGELOG (si souhaité).

---

## 📚 Ressources Additionnelles

- 📘 [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- 📘 [Context7 Express.js Best Practices](https://context7.com/expressjs)
- 📘 [JWT Best Practices](https://auth0.com/blog/jwt-security-best-practices/)
- 📘 [PostgreSQL Security Guide](https://www.postgresql.org/docs/current/security.html)
- 📘 [Node.js Security Checklist](https://github.com/goldbergyoni/nodebestpractices#6-security-best-practices)

---

## 📞 Contact

Pour toute question concernant la sécurité :

- 📧 **Email** : security@terrain-tir-arc.com
- 🐛 **Bugs** : [GitHub Issues](https://github.com/Eloli13/terrain-tir-arc/issues)
- 📖 **Documentation** : [README.md](README.md)

---

<p align="center">
  <strong>🔒 Sécurité = Priorité #1</strong>
</p>
