# Scripts de gestion

Ce dossier contient les scripts utilitaires pour l'administration de l'application.

## 🔐 Génération de secrets

### `generate-secrets.js`

Génère tous les secrets cryptographiques nécessaires au déploiement.

```bash
node scripts/generate-secrets.js
```

**Sortie :**
- Affiche tous les secrets dans le terminal
- Crée un fichier `.env.production.generated` avec tous les secrets
- Vous pouvez copier-coller directement dans Coolify

**⚠️ IMPORTANT :**
- Les secrets générés sont UNIQUES et ALÉATOIRES
- Conservez une copie dans un gestionnaire de mots de passe
- Ne commitez JAMAIS le fichier `.env.production.generated`
- Si vous perdez `ENCRYPTION_KEY`, les données chiffrées seront IRRÉCUPÉRABLES

---

## 🗄️ Gestion de la base de données

### `init-db.js`

Initialise la base de données avec les tables et le compte admin par défaut.

```bash
# En production (dans Coolify)
docker exec <container-id> node server/scripts/init-db.js

# En développement local
npm run db:init
# ou
node server/scripts/init-db.js
```

**Ce que fait ce script :**
- ✅ Crée toutes les tables (si elles n'existent pas)
- ✅ Crée les index de performance
- ✅ Crée le compte admin par défaut (username: `admin`, password: `changez-moi-en-production`)
- ✅ Insère les configurations par défaut

**⚠️ Note :** Si un compte admin existe déjà, il ne sera PAS recréé.

---

### `reset-admin.js`

Réinitialise le compte administrateur.

```bash
# En production (dans Coolify)
docker exec <container-id> node server/scripts/reset-admin.js

# En développement local
node server/scripts/reset-admin.js
```

**Ce que fait ce script :**
- 🗑️ Supprime TOUS les comptes admin existants
- ✅ Recrée le compte admin par défaut avec le bon hash
- ✅ Vérifie que le compte est correctement créé
- ✅ Affiche les informations de connexion

**Utilisez ce script quand :**
- Le mot de passe admin ne fonctionne pas
- Vous avez perdu le mot de passe admin
- Le hash du mot de passe est corrompu

---

### `reset-db.js`

Supprime TOUTES les données de la base de données.

```bash
# En production (dans Coolify) - ⚠️ DANGEREUX
docker exec <container-id> node server/scripts/reset-db.js

# En développement local
npm run db:reset
# ou
node server/scripts/reset-db.js
```

**⚠️ ATTENTION :**
- Supprime TOUTES les tables
- Supprime TOUTES les données (sessions, incidents, admins, etc.)
- Cette opération est IRRÉVERSIBLE
- Le script demande une confirmation

**Mode force (sans confirmation) :**
```bash
npm run db:reset:force
# ou
node server/scripts/reset-db.js --force
```

---

## 🧹 Nettoyage complet (Installation propre)

### `clean-install.sh`

Script pour repartir de zéro avec une installation propre.

```bash
# Sur le serveur Coolify
bash scripts/clean-install.sh
```

**Ce que fait ce script :**
1. ❌ Arrête tous les conteneurs de l'application
2. 🗑️ Supprime tous les volumes Docker (base de données, uploads, logs, backups)
3. 🧹 Nettoie les ressources orphelines (volumes, réseaux, images)
4. ✅ Vérifie que tout est bien supprimé

**⚠️ ATTENTION :**
- Cette opération est IRRÉVERSIBLE
- Vous perdrez TOUTES les données (base de données, photos d'incidents, logs)
- Le script demande une confirmation explicite (tapez "OUI" en majuscules)

**Après l'exécution :**
1. Redéployez dans Coolify (bouton "Deploy")
2. Exécutez `docker exec <container-id> node server/scripts/init-db.js`
3. Connectez-vous avec `admin` / `changez-moi-en-production`

---

## 🔒 Sécurité

### `security-audit.js`

Vérifie la sécurité de l'application.

```bash
npm run security:audit
# ou
node server/scripts/security-audit.js
```

**Ce que fait ce script :**
- ✅ Vérifie que toutes les variables d'environnement requises sont présentes
- ✅ Vérifie la force des secrets (longueur, format)
- ✅ Vérifie les vulnérabilités npm
- ✅ Vérifie la configuration SSL/TLS
- ✅ Affiche un rapport de sécurité

**Mode auto-fix :**
```bash
npm run security:audit:fix
# ou
node server/scripts/security-audit.js --fix
```

---

### `rotate-secrets.js`

Rotation des secrets cryptographiques.

```bash
npm run security:rotate
# ou
node server/scripts/rotate-secrets.js
```

**⚠️ ATTENTION :**
- Ne pas utiliser en production sans préparation
- Les anciens tokens JWT seront invalidés
- Les sessions actives seront déconnectées
- Prévoir une maintenance pour cette opération

**Mode dry-run (simulation) :**
```bash
npm run security:rotate:dry
# ou
node server/scripts/rotate-secrets.js --dry-run
```

---

## 📋 Commandes npm rapides

Toutes ces commandes sont définies dans [package.json](../server/package.json) :

```bash
# Base de données
npm run db:init           # Initialiser la base de données
npm run db:reset          # Réinitialiser (avec confirmation)
npm run db:reset:force    # Réinitialiser (sans confirmation)
npm run db:fresh          # Reset + Init (installation propre)

# Sécurité
npm run security:audit       # Audit de sécurité
npm run security:audit:fix   # Audit + corrections automatiques
npm run security:rotate      # Rotation des secrets
npm run security:rotate:dry  # Simulation de rotation

# Audits npm
npm run audit            # Audit des vulnérabilités npm
npm run audit:fix        # Correction automatique des vulnérabilités
npm run outdated         # Vérifier les packages obsolètes
```

---

## 🆘 Aide et dépannage

### Problème : "permission denied"

```bash
# Donner les droits d'exécution
chmod +x scripts/*.sh
chmod +x scripts/*.js
```

### Problème : "command not found: node"

Vérifiez que Node.js est installé :
```bash
node --version  # Devrait afficher v20.x ou supérieur
```

### Problème : "Cannot find module"

Installez les dépendances :
```bash
cd server
npm install
```

### Problème : Docker not found

Si vous exécutez depuis votre machine locale Windows, vous devez SSH sur le serveur Coolify :
```bash
ssh votre-utilisateur@srv759477.hstgr.cloud
cd /path/to/application
bash scripts/clean-install.sh
```

---

## 📚 Documentation

- [FRESH_INSTALL.md](../FRESH_INSTALL.md) - Guide d'installation propre
- [DATABASE.md](../DATABASE.md) - Gestion de la base de données
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Guide de déploiement
- [CHANGELOG.md](../CHANGELOG.md) - Historique des versions
