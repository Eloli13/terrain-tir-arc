# 🧪 Guide de Test des Fonctionnalités de Sécurité

Ce guide vous accompagne dans le test de toutes les nouvelles fonctionnalités de sécurité implémentées.

---

## 🚀 Démarrage Rapide

### Prérequis

1. **Serveur démarré** :
```bash
docker-compose up -d
```

2. **Vérifier que le serveur est prêt** :
```bash
curl http://localhost/health
```

---

## 📋 Tests Disponibles

### 1. Script de Test Automatisé

Le script `test-security-features.js` teste automatiquement toutes les fonctionnalités :

```bash
cd server
npm run test:security
```

**Ce qui est testé** :
- ✅ Changement de mot de passe obligatoire
- ✅ API de sécurité (`/security/status`, `/security/audit-logs`, etc.)
- ✅ CSP avec nonces
- ✅ Rate limiting
- ✅ Algorithmes JWT explicites
- ✅ Système d'audit
- ✅ Documentation API

**Sortie attendue** :
```
🔒 === Tests des Fonctionnalités de Sécurité ===

============================================================
Test 1: Changement de mot de passe obligatoire
============================================================

✓ Admin par défaut doit changer son mot de passe
...
```

---

### 2. Réinitialisation du Flag `must_change_password`

Le test initial bloquera la connexion car l'admin doit changer son mot de passe. Pour continuer les tests :

**Option 1 : Via SQL (rapide)**
```bash
# Exécuter le script SQL
docker-compose exec postgres psql -U tir_arc_user -d terrain_tir_arc -f /app/scripts/reset-admin-flag.sql

# Ou en une ligne
docker-compose exec postgres psql -U tir_arc_user -d terrain_tir_arc -c "UPDATE admin_users SET must_change_password = false WHERE username = 'admin';"
```

**Option 2 : Via l'API (recommandé en production)**
```bash
# 1. Obtenir un token temporaire (nécessite modification du code)
# 2. Changer le mot de passe
curl -X POST http://localhost/api/v1/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "changez-moi-en-production",
    "newPassword": "VotreNouveauMotDePasseSecurise123!"
  }'
```

---

## 🔍 Tests Manuels Détaillés

### Test 1 : Audit de Sécurité

```bash
cd server
npm run security:audit
```

**Résultat attendu** :
```
🔒 === Audit de Sécurité Automatisé ===

📦 Vérification des vulnérabilités npm...
   ✓ Critique: 0 | Élevé: 0 | Moyen: 0 | Faible: 2

🔑 Vérification de la force des secrets...
   ✓ JWT_SECRET: OK (64 caractères)
   ✓ JWT_REFRESH_SECRET: OK (64 caractères)

📊 Score de Sécurité: 95/100 🟢
```

---

### Test 2 : Rotation des Secrets (Dry Run)

```bash
npm run security:rotate:dry
```

**Résultat attendu** :
```
🔐 === Script de Rotation des Secrets JWT ===

🔑 Nouveaux secrets générés:

JWT_SECRET=a1b2c3d4e5f6...
JWT_REFRESH_SECRET=f6e5d4c3b2a1...
SESSION_SECRET=123456789abc...
ENCRYPTION_KEY=abc987654321...

⚠️  Mode DRY RUN - Aucune modification appliquée
```

---

### Test 3 : API de Sécurité

#### 3.1 Connexion et Obtention du Token

```bash
# Se connecter (après avoir reset le flag must_change_password)
TOKEN=$(curl -s -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"changez-moi-en-production"}' \
  | jq -r '.accessToken')

echo "Token: $TOKEN"
```

#### 3.2 Vérifier le Statut de Sécurité

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost/api/v1/security/status | jq
```

**Résultat attendu** :
```json
{
  "timestamp": "2024-12-04T10:00:00.000Z",
  "securityScore": 95,
  "level": "excellent",
  "checks": {
    "secretsStrength": "pass",
    "bcryptStrength": "pass",
    "corsConfiguration": "pass",
    "productionMode": "warning",
    "ssl": "warning"
  },
  "statistics": {
    "activeUsers": 1,
    "usersNeedingPasswordChange": 0,
    "activeSessions": 1,
    "auditLogs24h": 15,
    "logins24h": 3,
    "lockedAccounts": 0
  },
  "recommendations": []
}
```

#### 3.3 Consulter les Logs d'Audit

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost/api/v1/security/audit-logs?limit=10" | jq
```

**Résultat attendu** :
```json
{
  "logs": [
    {
      "id": "uuid",
      "action": "LOGIN",
      "resource": "AUTH",
      "ip_address": "172.20.0.1",
      "created_at": "2024-12-04T10:00:00.000Z",
      "username": "admin",
      "email": "admin@localhost"
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

#### 3.4 Lister les Sessions Actives

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost/api/v1/security/active-sessions | jq
```

#### 3.5 Tester le Système d'Audit

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost/api/v1/security/test-audit | jq
```

---

### Test 4 : CSP avec Nonces

#### Vérifier les Headers CSP

```bash
curl -I http://localhost/health | grep -i "content-security-policy"
```

**Résultat attendu** :
```
content-security-policy: default-src 'self'; script-src 'self' 'nonce-AbC123XyZ=='; style-src 'self' 'nonce-AbC123XyZ==' https://fonts.googleapis.com; ...
```

**Vérifications** :
- ✅ Header `content-security-policy` présent
- ✅ Contient `'nonce-...'` pour script-src et style-src
- ✅ NE contient PAS `'unsafe-inline'`

---

### Test 5 : Rate Limiting

#### Test du Rate Limiting d'Authentification

```bash
# Envoyer 6 tentatives rapides (limite = 5)
for i in {1..6}; do
  echo "Tentative $i:"
  curl -X POST http://localhost/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}'
  echo ""
done
```

**Résultat attendu** :
- Tentatives 1-5 : Code 401 (Unauthorized)
- Tentative 6 : Code **429** (Too Many Requests)

```json
{
  "error": "Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.",
  "retryAfter": 900
}
```

---

### Test 6 : JWT avec Algorithmes Explicites

#### Décoder le JWT manuellement

```bash
# Copier votre token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOi..."

# Décoder le header (première partie)
echo $TOKEN | cut -d. -f1 | base64 -d | jq
```

**Résultat attendu** :
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

#### Vérifier issuer et audience

```bash
# Décoder le payload (deuxième partie)
echo $TOKEN | cut -d. -f2 | base64 -d | jq
```

**Résultat attendu** :
```json
{
  "userId": "uuid",
  "username": "admin",
  "email": "admin@localhost",
  "iss": "terrain-tir-arc-server",
  "aud": "terrain-tir-arc-client",
  "iat": 1733304000,
  "exp": 1733304900
}
```

---

### Test 7 : WebSocket avec Authentification JWT

#### Test via navigateur (console)

```javascript
// Dans la console du navigateur
const socket = io('http://localhost', {
  auth: {
    token: 'VOTRE_TOKEN_ICI'
  }
});

socket.on('connect', () => {
  console.log('✅ Connecté en tant qu\'admin');
});

socket.on('connection-stats', (stats) => {
  console.log('📊 Stats:', stats);
});
```

**Résultat attendu** :
- ✅ Connexion réussie avec token valide
- ✅ Placement dans la room `admin-room`
- ✅ Réception des statistiques de connexion

---

### Test 8 : Documentation API

```bash
curl -s http://localhost/api/docs | jq
```

**Vérifier que** :
- ✅ Section `security` présente dans `endpoints`
- ✅ 5 routes de sécurité documentées
- ✅ Version API `v1` indiquée

---

## 📊 Vérifications PostgreSQL

### Vérifier la colonne `must_change_password`

```bash
docker-compose exec postgres psql -U tir_arc_user -d terrain_tir_arc -c "
  SELECT username, must_change_password, is_active, last_login
  FROM admin_users;
"
```

### Vérifier les logs d'audit

```bash
docker-compose exec postgres psql -U tir_arc_user -d terrain_tir_arc -c "
  SELECT action, resource, created_at, user_id
  FROM audit_logs
  ORDER BY created_at DESC
  LIMIT 10;
"
```

### Vérifier les refresh tokens actifs

```bash
docker-compose exec postgres psql -U tir_arc_user -d terrain_tir_arc -c "
  SELECT user_id, created_at, expires_at, revoked
  FROM refresh_tokens
  WHERE expires_at > NOW()
  ORDER BY created_at DESC;
"
```

---

## 🐛 Dépannage

### Problème : "Token non disponible, test ignoré"

**Solution** : Réinitialiser le flag `must_change_password` :
```bash
docker-compose exec postgres psql -U tir_arc_user -d terrain_tir_arc -c "UPDATE admin_users SET must_change_password = false WHERE username = 'admin';"
```

### Problème : "Rate limit dépassé"

**Solution** : Attendre 15 minutes ou redémarrer le serveur :
```bash
docker-compose restart app
```

### Problème : "Vulnérabilités npm détectées"

**Solution** : Corriger automatiquement :
```bash
cd server
npm run audit:fix
```

### Problème : "Score de sécurité faible"

**Solution** : Exécuter l'audit avec corrections :
```bash
npm run security:audit:fix
```

---

## ✅ Checklist de Validation

Avant de passer en production, vérifiez que :

- [ ] Score de sécurité ≥ 90/100 (`npm run security:audit`)
- [ ] Aucune vulnérabilité critique npm (`npm run audit`)
- [ ] Secrets forts générés (≥ 32 caractères)
- [ ] CSP avec nonces activé (pas de `unsafe-inline`)
- [ ] Rate limiting fonctionnel (test manuel)
- [ ] JWT avec algorithmes explicites (HS256)
- [ ] WebSocket authentification opérationnelle
- [ ] Logs d'audit enregistrés en base
- [ ] API `/security/*` accessible aux admins
- [ ] Flag `must_change_password` pour admin par défaut
- [ ] SSL PostgreSQL activé en production
- [ ] Documentation complète ([SECURITY.md](SECURITY.md))

---

## 📞 Support

Si vous rencontrez des problèmes :

1. **Consultez les logs** :
```bash
docker-compose logs app | tail -50
```

2. **Vérifiez la santé du serveur** :
```bash
curl http://localhost/health
```

3. **Consultez la documentation** :
- [README.md](README.md)
- [SECURITY.md](SECURITY.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)

---

<p align="center">
  <strong>🔒 Bonne chance pour vos tests !</strong>
</p>
