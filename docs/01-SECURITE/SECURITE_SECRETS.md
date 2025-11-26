# 🔒 Guide de Gestion Sécurisée des Secrets

**⚠️ CRITIQUE**: Ce document explique comment gérer les secrets de production de manière sécurisée.

---

## 🚨 RÈGLES D'OR

1. ❌ **JAMAIS** commiter de secrets dans Git
2. ❌ **JAMAIS** partager de secrets par email/chat
3. ✅ **TOUJOURS** utiliser un gestionnaire de secrets
4. ✅ **TOUJOURS** régénérer les secrets après un incident de sécurité
5. ✅ **TOUJOURS** utiliser HTTPS en production

---

## 📋 Génération de Nouveaux Secrets

### Commandes à Exécuter

```bash
# 1. JWT Secret (128 caractères hexadécimal)
node -e "const crypto = require('crypto'); console.log('JWT_SECRET=' + crypto.randomBytes(64).toString('hex'))"

# 2. JWT Refresh Secret (128 caractères hexadécimal)
node -e "const crypto = require('crypto'); console.log('JWT_REFRESH_SECRET=' + crypto.randomBytes(64).toString('hex'))"

# 3. Session Secret (128 caractères hexadécimal)
node -e "const crypto = require('crypto'); console.log('SESSION_SECRET=' + crypto.randomBytes(64).toString('hex'))"

# 4. Database Password (Base64, 32 bytes)
node -e "const crypto = require('crypto'); console.log('DB_PASSWORD=' + crypto.randomBytes(32).toString('base64'))"
```

### Exemple de Sortie

```
JWT_SECRET=cc005cd360f63a6523f77dc6e401de6977c6229fb6ce0599deff5d329e72625976e2691e8548983e446430efedece219843fadbe96cd8e170ff63fa5d0e5a986
JWT_REFRESH_SECRET=a325188935e5e65ccfae9e64e1bcd833cc2cbe9f9f677f97575d5f28a9c91b5cfc9f33e3bf21b10575d48683eb478784fdfc5dce67e13e0c470e3aaa8a9ff275
SESSION_SECRET=40af7a3eff7a44cb5c38990359decd69bfeb895f9e164c5aa608a62b8b0ad2cc51bf0448153cb04eb76495e526c04d694dff107c78a962ee6cb042f57b1da93d
DB_PASSWORD=AfeI/RpY/e/jcBBkN1DyuzZHg4/uhmtvFEckROdSdao=
```

⚠️ **NE PAS RÉUTILISER CET EXEMPLE** - Générez vos propres secrets!

---

## 🔐 Stockage Sécurisé des Secrets

### Option 1: Gestionnaire de Mots de Passe (Recommandé)

Utilisez un gestionnaire de mots de passe sécurisé:

- **1Password**: https://1password.com
- **Bitwarden**: https://bitwarden.com
- **LastPass**: https://lastpass.com
- **KeePassXC**: https://keepassxc.org (open-source, offline)

**Procédure**:
1. Créez un dossier "Projet - Terrain Tir Arc"
2. Ajoutez une note sécurisée "Production Secrets"
3. Copiez-collez tous les secrets générés
4. Activez l'authentification à 2 facteurs (2FA)
5. Partagez uniquement avec les personnes autorisées

### Option 2: Variables d'Environnement Coolify

Dans Coolify, les secrets sont stockés de manière sécurisée:

1. **Connectez-vous à Coolify**: https://srv759477.hstgr.cloud
2. **Allez dans votre application** → Settings → Environment Variables
3. **Ajoutez chaque variable** une par une:
   - Nom: `JWT_SECRET`
   - Valeur: `<collez la valeur générée>`
   - Type: Secret (🔒)
4. **Sauvegardez**

✅ **Avantages**: Chiffré, accessible uniquement via SSH, audit log

### Option 3: Fichier Local Chiffré (Développement)

Pour le développement local uniquement:

```bash
# 1. Créer le fichier (en dehors du dépôt Git)
echo "JWT_SECRET=..." > ~/secrets/terrain-tir-arc.env

# 2. Protéger le fichier
chmod 600 ~/secrets/terrain-tir-arc.env

# 3. Chiffrer avec GPG
gpg --symmetric --cipher-algo AES256 ~/secrets/terrain-tir-arc.env

# 4. Supprimer la version non chiffrée
rm ~/secrets/terrain-tir-arc.env

# 5. Pour déchiffrer:
gpg --decrypt ~/secrets/terrain-tir-arc.env.gpg > ~/secrets/terrain-tir-arc.env
```

---

## 🚀 Déploiement en Production

### Étape par Étape

1. **Générer les secrets** (commandes ci-dessus)
2. **Copier les secrets** dans votre gestionnaire de mots de passe
3. **Configurer Coolify**:
   - Settings → Environment Variables
   - Ajouter chaque variable comme "Secret"
4. **Vérifier la configuration**:
   ```bash
   # Dans Coolify, vérifier que les variables sont présentes
   docker exec <container> env | grep -E "JWT_SECRET|DB_PASSWORD"
   ```
5. **Redémarrer l'application** pour charger les nouvelles variables
6. **Tester l'authentification**:
   ```bash
   curl -X POST https://istres.srv759477.hstgr.cloud/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"votre-mot-de-passe"}'
   ```

---

## 🔄 Rotation des Secrets

**Fréquence recommandée**:
- JWT_SECRET: Tous les 6 mois
- JWT_REFRESH_SECRET: Tous les 6 mois
- SESSION_SECRET: Tous les 12 mois
- DB_PASSWORD: Tous les 12 mois

**Après un incident de sécurité**: Immédiatement!

### Procédure de Rotation

```bash
# 1. Générer de nouveaux secrets
node -e "const crypto = require('crypto'); console.log(crypto.randomBytes(64).toString('hex'))"

# 2. Mettre à jour Coolify avec les nouveaux secrets

# 3. Redémarrer l'application
# Les anciens tokens JWT seront invalidés automatiquement

# 4. Notifier les utilisateurs de se reconnecter
```

---

## ✅ Checklist de Sécurité

Avant le déploiement en production:

- [ ] Tous les secrets ont été régénérés (pas d'exemples)
- [ ] Secrets stockés dans un gestionnaire de mots de passe
- [ ] `.gitignore` contient `SECRETS_PRODUCTION.txt` et `.secrets-*`
- [ ] Aucun secret dans le code source
- [ ] Variables d'environnement configurées dans Coolify
- [ ] HTTPS activé (Let's Encrypt)
- [ ] Mot de passe admin changé après le premier déploiement
- [ ] Backups de la base de données configurés
- [ ] Monitoring des logs de sécurité activé
- [ ] 2FA activé sur les comptes admin

---

## 🆘 En Cas de Compromission

Si vous suspectez qu'un secret a été exposé:

1. **🚨 Immédiat**: Régénérer TOUS les secrets
2. **🔒 Révoquer**: Tous les tokens JWT actifs (redémarrer l'application)
3. **📊 Analyser**: Logs de sécurité pour identifier l'incident
4. **🔄 Déployer**: Nouveaux secrets en production
5. **👥 Notifier**: Tous les utilisateurs de changer leur mot de passe
6. **📝 Documenter**: L'incident pour éviter qu'il se reproduise

---

## 📚 Ressources

- [OWASP - Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_CheatSheet.html)
- [HashiCorp Vault](https://www.vaultproject.io/)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [Azure Key Vault](https://azure.microsoft.com/en-us/services/key-vault/)

---

**Dernière mise à jour**: 2025-10-21
**Prochaine revue**: 2025-04-21 (6 mois)
