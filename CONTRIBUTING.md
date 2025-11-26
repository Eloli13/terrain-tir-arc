# Guide de Contribution

Merci de votre intérêt pour contribuer au projet de gestion des terrains de tir à l'arc !

## 🚀 Démarrage Rapide

### Prérequis OBLIGATOIRES

> **⚠️ IMPORTANT : Docker Desktop est OBLIGATOIRE pour le développement local**

Ce projet utilise **exclusivement Docker** pour le développement. Vous ne devez PAS installer Node.js, PostgreSQL ou d'autres dépendances localement.

**Installez :**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows, Mac, ou Linux)
- Git

### Configuration Initiale

```bash
# 1. Cloner le dépôt
git clone [URL_DU_DEPOT]
cd terrain_claude_code

# 2. S'assurer que Docker Desktop est démarré

# 3. Lancer l'application
docker-compose up -d

# 4. Vérifier que les conteneurs sont démarrés (healthy)
docker-compose ps

# 5. Accéder à l'application
# Frontend : http://localhost
# Admin : http://localhost/admin/
# Credentials : admin / changez-moi-en-production
```

## 📋 Règles du Projet

**Consultez [.claude/project-rules.md](.claude/project-rules.md)** pour les règles détaillées et les contraintes techniques du projet.

### Règles Essentielles

1. **Docker uniquement** : Tout développement se fait via Docker
2. **Pas d'installation native** : Ne pas installer Node.js/PostgreSQL localement
3. **Commandes Docker standard** : Utiliser `docker-compose` pour tout
4. **Tests requis** : Tester vos modifications avant de commit
5. **Documentation** : Documenter les nouvelles fonctionnalités

## 🔧 Workflow de Développement

### 1. Créer une Branche

```bash
git checkout -b feature/nom-de-la-fonctionnalite
# ou
git checkout -b fix/nom-du-bug
```

### 2. Développer avec Docker

```bash
# Démarrer l'environnement
docker-compose up -d

# Vérifier que les conteneurs sont UP et healthy
docker-compose ps

# Voir les logs de l'application
docker-compose logs -f app

# Voir tous les logs en temps réel
docker-compose logs -f

# Arrêter
docker-compose down
```

### 3. Tester

```bash
# Tester l'API
curl http://localhost/api/health

# Tester l'interface admin
# Ouvrir http://localhost/admin/ dans le navigateur

# Vérifier les conteneurs
docker-compose ps
```

### 4. Commit et Push

```bash
git add .
git commit -m "feat: description de la fonctionnalité"
# ou
git commit -m "fix: description du bug corrigé"
git push origin feature/nom-de-la-fonctionnalite
```

### 5. Créer une Pull Request

Créez une Pull Request avec :
- Titre clair et descriptif
- Description détaillée des changements
- Captures d'écran si pertinent
- Tests effectués

## 🎨 Conventions de Code

### JavaScript

```javascript
// Classes en PascalCase
class EmailConfigManager {
    constructor() {
        this.config = null;
    }

    // Méthodes en camelCase
    async loadConfig() {
        // Utiliser async/await
        const response = await fetch('/api/config');
        return await response.json();
    }
}

// Constantes en UPPER_SNAKE_CASE
const MAX_RETRIES = 3;

// Variables en camelCase
const emailConfig = await configManager.loadConfig();
```

### SQL

```sql
-- Tables en snake_case
CREATE TABLE admin_users (
    id UUID PRIMARY KEY,
    username VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes préfixés par idx_
CREATE INDEX idx_admin_users_username ON admin_users(username);
```

### Fichiers

```
kebab-case pour les fichiers
email-config.js
init-email-config.sql
```

## 📁 Structure du Code

```
terrain_claude_code/
├── server/                    # Backend Node.js/Express
│   ├── config/               # Configuration (database, etc.)
│   ├── middleware/           # Middlewares Express
│   ├── routes/               # Routes API
│   ├── utils/                # Utilitaires (email, logger, etc.)
│   ├── scripts/              # Scripts d'initialisation/migration
│   └── server.js             # Point d'entrée
├── admin/                     # Interface d'administration
├── docs/                      # Documentation organisée
├── .claude/                   # Configuration Claude Code
└── docker-compose.yml         # Configuration Docker
```

## ✅ Checklist Avant Pull Request

- [ ] Code testé localement avec Docker
- [ ] Pas d'erreurs dans les logs (`docker-compose logs`)
- [ ] Conteneurs démarrent correctement (`docker-compose ps`)
- [ ] API répond correctement (tester avec curl/Postman)
- [ ] Interface admin fonctionne
- [ ] Documentation mise à jour si nécessaire
- [ ] Pas de credentials hardcodés
- [ ] Variables sensibles dans `.env` (jamais committées)
- [ ] Messages de commit clairs et descriptifs

## 🐛 Signaler un Bug

1. Vérifier que le bug n'est pas déjà signalé
2. Créer une issue avec :
   - Description claire du bug
   - Étapes pour reproduire
   - Comportement attendu vs obtenu
   - Logs pertinents
   - Captures d'écran si applicable

## 💡 Proposer une Fonctionnalité

1. Ouvrir une issue de discussion
2. Décrire la fonctionnalité proposée
3. Expliquer le cas d'usage
4. Attendre validation avant de développer

## 📚 Documentation

### Ajouter de la Documentation

Toute la documentation est organisée dans `docs/` :

```
docs/
├── 01-SECURITE/
├── 02-DEPLOIEMENT/
├── 03-CONFIGURATION/
├── 04-DOCUMENTATION/
├── 05-TESTS/
└── 06-AVANCE/
```

Consultez [docs/INDEX.md](docs/INDEX.md) pour la structure complète.

## 🔐 Sécurité

### Signaler une Vulnérabilité

**NE PAS** créer d'issue publique pour les problèmes de sécurité.

Contactez les mainteneurs directement pour les vulnérabilités de sécurité.

### Bonnes Pratiques

- Ne jamais commit de credentials
- Utiliser les variables d'environnement
- Chiffrer les données sensibles (voir `server/utils/encryption.js`)
- Valider toutes les entrées utilisateur (Joi schemas)

## 🤝 Code de Conduite

- Respecter tous les contributeurs
- Accepter les critiques constructives
- Se concentrer sur ce qui est le mieux pour le projet
- Faire preuve d'empathie envers les autres membres

## 📞 Besoin d'Aide ?

- Consultez [README.md](README.md) pour le démarrage
- Lisez [docs/INDEX.md](docs/INDEX.md) pour la documentation complète
- Vérifiez [.claude/project-rules.md](.claude/project-rules.md) pour les règles techniques
- Ouvrez une issue pour poser des questions

## 📝 Licence

En contribuant, vous acceptez que vos contributions soient sous la même licence que le projet.

---

**Merci pour votre contribution ! 🎯**
