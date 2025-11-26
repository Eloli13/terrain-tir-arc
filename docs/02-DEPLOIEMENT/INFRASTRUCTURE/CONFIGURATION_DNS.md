# Configuration DNS pour srv759477.hstgr.cloud

**Domaine principal : srv759477.hstgr.cloud**
**Application : Gestion Site Tir à l'Arc**
**Hébergeur : Hostinger**

---

## 🎯 Objectif

Configurer les enregistrements DNS pour rendre votre application accessible via :
- Domaine principal : `https://srv759477.hstgr.cloud`
- OU sous-domaine dédié : `https://istres.srv759477.hstgr.cloud`
- OU plusieurs sous-domaines pour multi-sites : `istres.srv759477.hstgr.cloud`, etc.

---

## 📋 Prérequis

1. **IP de votre serveur Coolify**
   ```bash
   # Se connecter au serveur Coolify (SSH)
   curl ifconfig.me

   # Exemple de résultat : 51.83.45.10
   ```

2. **Accès au panneau de gestion DNS**
   - Chez Hostinger (hstgr.cloud)
   - Ou chez votre registrar de domaine

---

## 🌐 Option 1 : Domaine principal

**Utilisation : `https://srv759477.hstgr.cloud`**

### Enregistrements DNS à créer

| Type | Nom | Valeur | TTL |
|------|-----|--------|-----|
| A | @ | [IP_SERVEUR_COOLIFY] | 3600 |
| A | www | [IP_SERVEUR_COOLIFY] | 3600 |

**Exemple concret :**

| Type | Nom | Valeur | TTL |
|------|-----|--------|-----|
| A | @ | 51.83.45.10 | 3600 |
| A | www | 51.83.45.10 | 3600 |

### Configuration dans Coolify

```
Domain: srv759477.hstgr.cloud
Additional Domain: www.srv759477.hstgr.cloud
SSL: Enable (Let's Encrypt)
```

### Variables d'environnement

```bash
ALLOWED_ORIGINS=https://srv759477.hstgr.cloud,https://www.srv759477.hstgr.cloud
EMAIL_FROM=noreply@srv759477.hstgr.cloud
```

### URLs accessibles

- `https://srv759477.hstgr.cloud`
- `https://www.srv759477.hstgr.cloud`
- `https://srv759477.hstgr.cloud/admin/`
- `https://srv759477.hstgr.cloud/health`

---

## 🌐 Option 2 : Sous-domaine dédié (RECOMMANDÉ)

**Utilisation : `https://istres.srv759477.hstgr.cloud`**

### Enregistrements DNS à créer

| Type | Nom | Valeur | TTL |
|------|-----|--------|-----|
| A | tirallarc | [IP_SERVEUR_COOLIFY] | 3600 |
| A | www.tirallarc | [IP_SERVEUR_COOLIFY] | 3600 |

**Exemple concret :**

| Type | Nom | Valeur | TTL |
|------|-----|--------|-----|
| A | tirallarc | 51.83.45.10 | 3600 |
| A | www.tirallarc | 51.83.45.10 | 3600 |

### Configuration dans Coolify

```
Domain: istres.srv759477.hstgr.cloud
Additional Domain: www.istres.srv759477.hstgr.cloud
SSL: Enable (Let's Encrypt)
```

### Variables d'environnement

```bash
ALLOWED_ORIGINS=https://istres.srv759477.hstgr.cloud,https://www.istres.srv759477.hstgr.cloud
EMAIL_FROM=noreply@srv759477.hstgr.cloud
```

### URLs accessibles

- `https://istres.srv759477.hstgr.cloud`
- `https://www.istres.srv759477.hstgr.cloud`
- `https://istres.srv759477.hstgr.cloud/admin/`
- `https://istres.srv759477.hstgr.cloud/health`

### Avantages

✅ **Séparation claire** : Le sous-domaine est dédié à l'application
✅ **Évolutif** : Facile d'ajouter d'autres sous-domaines (blog, api, etc.)
✅ **Professionnel** : Structure claire et organisée

---

## 🌐 Option 3 : Multi-sites (plusieurs sous-domaines)

**Utilisation : Héberger plusieurs sites de tir à l'arc**

### Enregistrements DNS à créer

| Type | Nom | Valeur | TTL | Application |
|------|-----|--------|-----|-------------|
| A | istres | [IP_SERVEUR] | 3600 | Site Istres |
| A | marseille | [IP_SERVEUR] | 3600 | Site Marseille |
| A | aix | [IP_SERVEUR] | 3600 | Site Aix-en-Provence |
| A | admin | [IP_SERVEUR] | 3600 | Panneau admin global |

**Exemple concret :**

| Type | Nom | Valeur | TTL |
|------|-----|--------|-----|
| A | istres | 51.83.45.10 | 3600 |
| A | marseille | 51.83.45.10 | 3600 |
| A | aix | 51.83.45.10 | 3600 |
| A | admin | 51.83.45.10 | 3600 |

### Configuration dans Coolify

**3 applications séparées :**

**App 1 : Istres**
```
Name: tirallarc-istres-app
Domain: istres.srv759477.hstgr.cloud
DB_HOST: tirallarc-istres-db-postgres
ALLOWED_ORIGINS: https://istres.srv759477.hstgr.cloud
```

**App 2 : Marseille**
```
Name: tirallarc-marseille-app
Domain: marseille.srv759477.hstgr.cloud
DB_HOST: tirallarc-marseille-db-postgres
ALLOWED_ORIGINS: https://marseille.srv759477.hstgr.cloud
```

**App 3 : Aix**
```
Name: tirallarc-aix-app
Domain: aix.srv759477.hstgr.cloud
DB_HOST: tirallarc-aix-db-postgres
ALLOWED_ORIGINS: https://aix.srv759477.hstgr.cloud
```

### URLs accessibles

- `https://istres.srv759477.hstgr.cloud`
- `https://marseille.srv759477.hstgr.cloud`
- `https://aix.srv759477.hstgr.cloud`
- `https://admin.srv759477.hstgr.cloud`

### Avantages

✅ **Isolation complète** : Chaque site a sa propre base de données
✅ **Gestion indépendante** : Mise à jour/maintenance site par site
✅ **Sécurité** : Un problème sur un site n'affecte pas les autres
✅ **Scalabilité** : Facile d'ajouter de nouveaux sites

---

## 🛠️ Guide de configuration DNS chez Hostinger

### Étape 1 : Connexion au panneau DNS

1. Connectez-vous à votre compte Hostinger
2. Accédez à **Domaines** ou **Zones DNS**
3. Sélectionnez `srv759477.hstgr.cloud`
4. Cliquez sur **Gérer les enregistrements DNS** ou **Zone DNS**

### Étape 2 : Ajouter un enregistrement A

**Pour le domaine principal (@) :**
```
Type : A
Nom : @ (ou laisser vide)
Pointe vers : [IP de votre serveur Coolify]
TTL : 3600 (ou Auto)
```

**Pour www :**
```
Type : A
Nom : www
Pointe vers : [IP de votre serveur Coolify]
TTL : 3600
```

**Pour un sous-domaine (tirallarc) :**
```
Type : A
Nom : tirallarc
Pointe vers : [IP de votre serveur Coolify]
TTL : 3600
```

**Pour www.tirallarc :**
```
Type : A
Nom : www.tirallarc
Pointe vers : [IP de votre serveur Coolify]
TTL : 3600
```

### Étape 3 : Sauvegarder

1. Cliquez sur **Ajouter** ou **Sauvegarder**
2. Attendez 5-30 minutes pour la propagation DNS

### Étape 4 : Vérification

**Sur votre PC Windows (PowerShell) :**

```powershell
# Vérifier le domaine principal
nslookup srv759477.hstgr.cloud

# Vérifier le sous-domaine
nslookup istres.srv759477.hstgr.cloud

# Résultat attendu :
# Nom :    istres.srv759477.hstgr.cloud
# Address: 51.83.45.10
```

**En ligne :**
- Visitez : https://dnschecker.org
- Entrez : `istres.srv759477.hstgr.cloud`
- Type : A
- Vérifiez que l'IP correspond

---

## ⚠️ Erreurs courantes

### Erreur 1 : "server can't find domain"

**Cause :** DNS pas encore propagé

**Solution :** Attendez 5-30 minutes puis réessayez

---

### Erreur 2 : Mauvaise IP retournée

**Cause :** Enregistrement DNS incorrect

**Solution :**
1. Vérifiez l'IP du serveur : `curl ifconfig.me`
2. Comparez avec l'IP dans votre zone DNS
3. Corrigez si nécessaire

---

### Erreur 3 : CNAME au lieu de A

**Cause :** Mauvais type d'enregistrement

**Solution :**
- ❌ CNAME → monserveur.exemple.com
- ✅ A → 51.83.45.10 (IP numérique)

---

### Erreur 4 : Nom complet au lieu du sous-domaine seul

**Cause :** Nom d'enregistrement incorrect

**Solution :**
- ❌ Nom : istres.srv759477.hstgr.cloud
- ✅ Nom : tirallarc

---

## 🔍 Vérification après configuration

### Étape 1 : DNS résolu correctement

```powershell
nslookup istres.srv759477.hstgr.cloud
# Devrait retourner l'IP de votre serveur
```

### Étape 2 : Ports ouverts

```bash
# Sur le serveur Coolify
sudo ufw status

# Doit montrer :
# 80/tcp   ALLOW   Anywhere
# 443/tcp  ALLOW   Anywhere
```

### Étape 3 : Coolify configuré

```
Application → Settings
Domain: istres.srv759477.hstgr.cloud
SSL: Enabled (Let's Encrypt)
```

### Étape 4 : Test HTTPS

```
Ouvrir dans le navigateur :
https://istres.srv759477.hstgr.cloud

Devrait afficher :
✅ Certificat SSL valide (cadenas vert)
✅ Page d'accueil de l'application
```

---

## 📊 Tableau récapitulatif

| Option | Domaine | Enregistrements DNS | Complexité | Multi-sites |
|--------|---------|---------------------|------------|-------------|
| 1 - Principal | `srv759477.hstgr.cloud` | `@`, `www` | Faible | Non |
| 2 - Sous-domaine | `istres.srv759477.hstgr.cloud` | `tirallarc`, `www.tirallarc` | Faible | Non |
| 3 - Multi-sites | `istres.srv759477.hstgr.cloud` | `istres`, `marseille`, `aix` | Moyenne | Oui |

---

## 🚀 Recommandation

**Pour un seul site :**
👉 **Option 2 - Sous-domaine dédié** (`istres.srv759477.hstgr.cloud`)

**Pour plusieurs sites :**
👉 **Option 3 - Multi-sites** (`istres.srv759477.hstgr.cloud`, `marseille.srv759477.hstgr.cloud`, etc.)

---

## 📞 Support

**Propagation DNS lente ?**
- Normal : 5-30 minutes
- Maximum : 24-48 heures (rare)

**Vérifier la propagation mondiale :**
- https://dnschecker.org
- https://www.whatsmydns.net

**Problème persistant ?**
1. Vérifiez l'IP du serveur
2. Vérifiez les enregistrements DNS
3. Attendez 30 minutes
4. Contactez le support Hostinger si nécessaire

---

**Date de création :** 2025-01-15
**Domaine :** srv759477.hstgr.cloud
**Application :** Gestion Site Tir à l'Arc
