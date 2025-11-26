# Guide de Gestion des Noms de Domaine Multi-Sites

**Configuration DNS et gestion des domaines pour serveur multi-sites**
**Date : 2025-01-15**

---

## Table des matières

1. [Concepts de base](#concepts-de-base)
2. [Types de configurations DNS](#types-de-configurations-dns)
3. [Configuration DNS chez les registrars](#configuration-dns-chez-les-registrars)
4. [Sous-domaines vs Domaines multiples](#sous-domaines-vs-domaines-multiples)
5. [Configuration Nginx par type](#configuration-nginx-par-type)
6. [Cloudflare (CDN + DNS)](#cloudflare-cdn--dns)
7. [Gestion SSL par scénario](#gestion-ssl-par-scénario)
8. [Scénarios pratiques](#scénarios-pratiques)
9. [Dépannage DNS](#dépannage-dns)
10. [Bonnes pratiques](#bonnes-pratiques)

---

## Concepts de base

### Qu'est-ce qu'un nom de domaine ?

Un **nom de domaine** est l'adresse lisible d'un site web :
- `tirallarc-istres.fr` (domaine principal)
- `www.tirallarc-istres.fr` (sous-domaine)
- `api.tirallarc-istres.fr` (sous-domaine)

### Composants d'un domaine

```
https://admin.tirallarc-istres.fr:443/dashboard
│      │     │               │    │   │
│      │     │               │    │   └─ Chemin
│      │     │               │    └───── Port (443 = HTTPS)
│      │     │               └────────── Domaine de deuxième niveau (SLD)
│      │     └────────────────────────── Sous-domaine
│      └──────────────────────────────── Protocole
```

### Enregistrements DNS importants

| Type | Description | Exemple |
|------|-------------|---------|
| **A** | Pointe vers une adresse IPv4 | `tirallarc-istres.fr → 51.210.100.50` |
| **AAAA** | Pointe vers une adresse IPv6 | `tirallarc-istres.fr → 2001:41d0:...` |
| **CNAME** | Alias vers un autre domaine | `www → tirallarc-istres.fr` |
| **MX** | Serveurs de messagerie | `mail.tirallarc-istres.fr` |
| **TXT** | Informations textuelles | Validation SSL, SPF, DKIM |
| **NS** | Serveurs de noms (nameservers) | `ns1.ovh.net` |

---

## Types de configurations DNS

### Configuration 1 : Un seul domaine, plusieurs sous-domaines

**Scénario :** Tout sur un seul domaine principal

```
tirallarc-istres.fr           → Site principal
www.tirallarc-istres.fr       → Site principal (alias)
admin.tirallarc-istres.fr     → Interface admin
api.tirallarc-istres.fr       → API backend
docs.tirallarc-istres.fr      → Documentation
blog.tirallarc-istres.fr      → Blog
```

**Configuration DNS :**

```
Type    Nom             Valeur                  TTL
A       @               51.210.100.50           3600
A       www             51.210.100.50           3600
A       admin           51.210.100.50           3600
A       api             51.210.100.50           3600
A       docs            51.210.100.50           3600
A       blog            51.210.100.50           3600
```

**Ou avec CNAME (recommandé) :**

```
Type    Nom             Valeur                      TTL
A       @               51.210.100.50               3600
CNAME   www             tirallarc-istres.fr.        3600
CNAME   admin           tirallarc-istres.fr.        3600
CNAME   api             tirallarc-istres.fr.        3600
CNAME   docs            tirallarc-istres.fr.        3600
CNAME   blog            tirallarc-istres.fr.        3600
```

**Avantages :**
- ✅ Un seul domaine à acheter
- ✅ Gestion DNS simplifiée
- ✅ Certificat SSL wildcard possible (`*.tirallarc-istres.fr`)
- ✅ Cohérence de marque

**Inconvénients :**
- ❌ Tous les services liés au même domaine
- ❌ Moins de flexibilité pour revendre/transférer un service

---

### Configuration 2 : Plusieurs domaines indépendants

**Scénario :** Chaque site a son propre domaine

```
tirallarc-istres.fr           → Application principale
club-archerie-istres.fr       → Site du club
boutique-tirallarc.fr         → Boutique en ligne
mon-portfolio.fr              → Portfolio personnel
```

**Configuration DNS (pour chaque domaine) :**

**Domaine 1 : tirallarc-istres.fr**
```
Type    Nom             Valeur                  TTL
A       @               51.210.100.50           3600
CNAME   www             tirallarc-istres.fr.    3600
```

**Domaine 2 : club-archerie-istres.fr**
```
Type    Nom             Valeur                  TTL
A       @               51.210.100.50           3600
CNAME   www             club-archerie-istres.fr. 3600
```

**Domaine 3 : boutique-tirallarc.fr**
```
Type    Nom             Valeur                  TTL
A       @               51.210.100.50           3600
CNAME   www             boutique-tirallarc.fr.  3600
```

**Avantages :**
- ✅ Indépendance totale de chaque site
- ✅ Flexibilité pour déplacer un site vers un autre serveur
- ✅ Meilleur SEO (domaines séparés)
- ✅ Branding distinct par service

**Inconvénients :**
- ❌ Coût : plusieurs domaines à acheter/renouveler
- ❌ Gestion DNS plus complexe
- ❌ Certificats SSL séparés (ou wildcard par domaine)

---

### Configuration 3 : Hybride (domaine + sous-domaines)

**Scénario :** Domaine principal avec sous-domaines + domaines additionnels

```
# Domaine principal avec services
tirallarc-istres.fr           → Site principal
www.tirallarc-istres.fr       → Site principal
admin.tirallarc-istres.fr     → Admin
api.tirallarc-istres.fr       → API

# Domaines additionnels pour services spécifiques
boutique-tirallarc.fr         → Boutique (domaine séparé)
mon-portfolio.fr              → Portfolio (domaine séparé)
```

**Configuration DNS :**

**tirallarc-istres.fr** (avec sous-domaines)
```
Type    Nom             Valeur                  TTL
A       @               51.210.100.50           3600
CNAME   www             tirallarc-istres.fr.    3600
CNAME   admin           tirallarc-istres.fr.    3600
CNAME   api             tirallarc-istres.fr.    3600
```

**boutique-tirallarc.fr** (domaine séparé)
```
Type    Nom             Valeur                  TTL
A       @               51.210.100.50           3600
CNAME   www             boutique-tirallarc.fr.  3600
```

**Avantages :**
- ✅ Équilibre entre coût et flexibilité
- ✅ Services critiques sur sous-domaines (cohérence)
- ✅ Services indépendants sur domaines séparés

---

## Configuration DNS chez les registrars

### OVH (Registrar français populaire)

#### Interface web OVH

1. **Connexion** : https://www.ovh.com/manager/
2. **Domaines** → Sélectionner votre domaine → **Zone DNS**
3. **Ajouter une entrée**

**Exemple pour TirArc :**

```
# Entrée principale
Type: A
Sous-domaine: (vide ou @)
Cible: 51.210.100.50
TTL: Auto

# www
Type: CNAME
Sous-domaine: www
Cible: tirallarc-istres.fr.
TTL: Auto

# admin
Type: CNAME
Sous-domaine: admin
Cible: tirallarc-istres.fr.
TTL: Auto

# api
Type: CNAME
Sous-domaine: api
Cible: tirallarc-istres.fr.
TTL: Auto
```

#### Via API OVH (automatisation)

```bash
# Installation du client OVH
pip3 install ovh

# Script Python pour ajouter un enregistrement
cat > add_dns_record.py << 'EOF'
import ovh

client = ovh.Client(
    endpoint='ovh-eu',
    application_key='YOUR_APP_KEY',
    application_secret='YOUR_APP_SECRET',
    consumer_key='YOUR_CONSUMER_KEY',
)

# Ajouter un enregistrement A
client.post(f'/domain/zone/tirallarc-istres.fr/record',
    fieldType='A',
    subDomain='',
    target='51.210.100.50',
    ttl=3600
)

# Ajouter un enregistrement CNAME
client.post(f'/domain/zone/tirallarc-istres.fr/record',
    fieldType='CNAME',
    subDomain='www',
    target='tirallarc-istres.fr.',
    ttl=3600
)

# Rafraîchir la zone DNS
client.post(f'/domain/zone/tirallarc-istres.fr/refresh')
EOF

python3 add_dns_record.py
```

---

### Gandi (Alternative OVH)

1. **Connexion** : https://admin.gandi.net/
2. **Domaines** → Sélectionner domaine → **Enregistrements DNS**
3. **Ajouter un enregistrement**

**Configuration identique à OVH**

---

### Google Domains / Cloud DNS

1. **Connexion** : https://domains.google.com/
2. **DNS** → **Gérer les enregistrements personnalisés**

**Format Google Domains :**

```
Nom d'hôte         Type    TTL     Données
@                  A       1h      51.210.100.50
www                CNAME   1h      tirallarc-istres.fr.
admin              CNAME   1h      tirallarc-istres.fr.
api                CNAME   1h      tirallarc-istres.fr.
```

---

### Cloudflare (DNS + CDN)

Voir section dédiée [Cloudflare](#cloudflare-cdn--dns)

---

## Sous-domaines vs Domaines multiples

### Tableau comparatif

| Critère | Sous-domaines | Domaines multiples |
|---------|---------------|-------------------|
| **Coût** | 💰 1 seul domaine | 💰💰💰 1 domaine par site |
| **Gestion DNS** | ✅ Simple (un seul registrar) | ❌ Complexe (plusieurs registrars possibles) |
| **SSL** | ✅ Wildcard SSL possible | ❌ SSL par domaine |
| **SEO** | ⚠️ Moins bon (même domaine racine) | ✅ Meilleur (domaines distincts) |
| **Indépendance** | ❌ Tous liés au domaine principal | ✅ Totalement indépendants |
| **Migration** | ❌ Difficile de séparer un service | ✅ Facile de déplacer un site |
| **Branding** | ⚠️ Marque unifiée | ✅ Marques distinctes |

### Recommandations par cas d'usage

#### Utiliser des sous-domaines si :
- ✅ Tous les services font partie du même projet/entreprise
- ✅ Budget limité (1 seul domaine)
- ✅ Vous voulez une gestion DNS simplifiée
- ✅ Cohérence de marque importante

**Exemple :** Application entreprise
```
app.monentreprise.fr        → Application principale
admin.monentreprise.fr      → Administration
api.monentreprise.fr        → API
docs.monentreprise.fr       → Documentation
support.monentreprise.fr    → Support client
```

#### Utiliser des domaines multiples si :
- ✅ Services complètement indépendants
- ✅ Possibilité de revendre/transférer un service
- ✅ SEO important (sites distincts)
- ✅ Marques différentes

**Exemple :** Portfolio d'applications
```
tirallarc-istres.fr         → App de gestion tir à l'arc
club-natation-istres.fr     → App de gestion natation
gestion-sports.fr           → App générique sports
mon-portfolio.dev           → Portfolio personnel
```

---

## Configuration Nginx par type

### Configuration pour sous-domaines

**Fichier : `/etc/nginx/sites-available/tirallarc-subdomains`**

```nginx
# Domaine principal
server {
    listen 443 ssl http2;
    server_name tirallarc-istres.fr www.tirallarc-istres.fr;

    ssl_certificate /etc/letsencrypt/live/tirallarc-istres.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tirallarc-istres.fr/privkey.pem;

    root /var/www/tirallarc/frontend;
    index index.html;

    location /api {
        proxy_pass http://localhost:3000;
        include snippets/proxy-params.conf;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Sous-domaine admin
server {
    listen 443 ssl http2;
    server_name admin.tirallarc-istres.fr;

    ssl_certificate /etc/letsencrypt/live/tirallarc-istres.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tirallarc-istres.fr/privkey.pem;

    root /var/www/tirallarc/admin;
    index index.html;

    location /api {
        proxy_pass http://localhost:3000;
        include snippets/proxy-params.conf;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Sous-domaine API uniquement
server {
    listen 443 ssl http2;
    server_name api.tirallarc-istres.fr;

    ssl_certificate /etc/letsencrypt/live/tirallarc-istres.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tirallarc-istres.fr/privkey.pem;

    # Pas de frontend, uniquement l'API
    location / {
        proxy_pass http://localhost:3000;
        include snippets/proxy-params.conf;
    }
}

# Sous-domaine docs (statique)
server {
    listen 443 ssl http2;
    server_name docs.tirallarc-istres.fr;

    ssl_certificate /etc/letsencrypt/live/tirallarc-istres.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tirallarc-istres.fr/privkey.pem;

    root /var/www/tirallarc/docs;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Obtention du certificat SSL wildcard :**

```bash
# Certificat wildcard pour tous les sous-domaines
sudo certbot certonly --manual --preferred-challenges dns \
  -d tirallarc-istres.fr \
  -d *.tirallarc-istres.fr

# Suivre les instructions pour créer un enregistrement TXT DNS
# _acme-challenge.tirallarc-istres.fr TXT "valeur_fournie_par_certbot"
```

---

### Configuration pour domaines multiples

**Fichier : `/etc/nginx/sites-available/tirallarc`**

```nginx
server {
    listen 443 ssl http2;
    server_name tirallarc-istres.fr www.tirallarc-istres.fr;

    ssl_certificate /etc/letsencrypt/live/tirallarc-istres.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tirallarc-istres.fr/privkey.pem;

    root /var/www/tirallarc;

    location /api {
        proxy_pass http://localhost:3000;
        include snippets/proxy-params.conf;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Fichier : `/etc/nginx/sites-available/club-archerie`**

```nginx
server {
    listen 443 ssl http2;
    server_name club-archerie-istres.fr www.club-archerie-istres.fr;

    ssl_certificate /etc/letsencrypt/live/club-archerie-istres.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/club-archerie-istres.fr/privkey.pem;

    root /var/www/club-archerie;

    location /api {
        proxy_pass http://localhost:3001;
        include snippets/proxy-params.conf;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Fichier : `/etc/nginx/sites-available/boutique`**

```nginx
server {
    listen 443 ssl http2;
    server_name boutique-tirallarc.fr www.boutique-tirallarc.fr;

    ssl_certificate /etc/letsencrypt/live/boutique-tirallarc.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/boutique-tirallarc.fr/privkey.pem;

    root /var/www/boutique;

    location /api {
        proxy_pass http://localhost:3002;
        include snippets/proxy-params.conf;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Obtention des certificats SSL :**

```bash
# Un certificat par domaine
sudo certbot --nginx -d tirallarc-istres.fr -d www.tirallarc-istres.fr
sudo certbot --nginx -d club-archerie-istres.fr -d www.club-archerie-istres.fr
sudo certbot --nginx -d boutique-tirallarc.fr -d www.boutique-tirallarc.fr
```

---

## Cloudflare (CDN + DNS)

### Avantages de Cloudflare

- ✅ **DNS gratuit** ultra-rapide
- ✅ **CDN gratuit** (cache + accélération)
- ✅ **SSL gratuit** (certificat Cloudflare)
- ✅ **Protection DDoS** gratuite
- ✅ **Firewall WAF** (Web Application Firewall)
- ✅ **Analytics** détaillés
- ✅ **API complète** pour automatisation

### Configuration Cloudflare

#### 1. Transfert de DNS vers Cloudflare

1. **Créer un compte** : https://dash.cloudflare.com/sign-up
2. **Ajouter un site** : Cliquer sur "Add a Site"
3. **Entrer votre domaine** : `tirallarc-istres.fr`
4. **Plan gratuit** : Sélectionner "Free"
5. **Scanner DNS** : Cloudflare détecte automatiquement vos enregistrements
6. **Vérifier les enregistrements** : Ajouter ceux manquants
7. **Changer les nameservers** :
   - Chez votre registrar (OVH, Gandi, etc.)
   - Remplacer les nameservers par ceux de Cloudflare :
     ```
     ns1.cloudflare.com
     ns2.cloudflare.com
     ```
8. **Attendre la propagation** (2-48h, souvent < 1h)

#### 2. Configuration DNS dans Cloudflare

**Tableau de bord Cloudflare → DNS → Records**

```
Type    Nom             Contenu             Proxy   TTL
A       @               51.210.100.50       ✅      Auto
CNAME   www             tirallarc-istres.fr ✅      Auto
CNAME   admin           tirallarc-istres.fr ✅      Auto
CNAME   api             tirallarc-istres.fr ✅      Auto
```

**Note importante :**
- ☁️ **Proxy activé (orange)** : Le trafic passe par Cloudflare (CDN, cache, protection)
- 🔧 **DNS uniquement (gris)** : Le trafic va directement au serveur

#### 3. Configuration SSL avec Cloudflare

**Cloudflare → SSL/TLS → Overview**

**Mode recommandé : Full (strict)**

```
Navigateur → [HTTPS] → Cloudflare → [HTTPS] → Serveur
```

**Configuration serveur avec certificat Origin :**

1. **Générer certificat Origin** :
   - Cloudflare → SSL/TLS → Origin Server
   - Create Certificate
   - Télécharger `origin-cert.pem` et `origin-key.pem`

2. **Installer sur le serveur** :
   ```bash
   sudo mkdir -p /etc/ssl/cloudflare
   sudo nano /etc/ssl/cloudflare/origin-cert.pem  # Coller le contenu
   sudo nano /etc/ssl/cloudflare/origin-key.pem   # Coller le contenu
   sudo chmod 600 /etc/ssl/cloudflare/*.pem
   ```

3. **Configurer Nginx** :
   ```nginx
   server {
       listen 443 ssl http2;
       server_name tirallarc-istres.fr;

       ssl_certificate /etc/ssl/cloudflare/origin-cert.pem;
       ssl_certificate_key /etc/ssl/cloudflare/origin-key.pem;

       # Valider l'origine Cloudflare
       set_real_ip_from 173.245.48.0/20;
       set_real_ip_from 103.21.244.0/22;
       set_real_ip_from 103.22.200.0/22;
       set_real_ip_from 103.31.4.0/22;
       set_real_ip_from 141.101.64.0/18;
       set_real_ip_from 108.162.192.0/18;
       set_real_ip_from 190.93.240.0/20;
       set_real_ip_from 188.114.96.0/20;
       set_real_ip_from 197.234.240.0/22;
       set_real_ip_from 198.41.128.0/17;
       set_real_ip_from 2400:cb00::/32;
       set_real_ip_from 2606:4700::/32;
       set_real_ip_from 2803:f800::/32;
       set_real_ip_from 2405:b500::/32;
       set_real_ip_from 2405:8100::/32;
       real_ip_header CF-Connecting-IP;

       # ... reste de la configuration
   }
   ```

#### 4. Règles de cache Cloudflare

**Cloudflare → Rules → Page Rules** (3 règles gratuites)

**Règle 1 : Cache agressif pour les assets**
```
URL: *tirallarc-istres.fr/*.css
     *tirallarc-istres.fr/*.js
     *tirallarc-istres.fr/*.jpg
     *tirallarc-istres.fr/*.png

Settings:
- Cache Level: Cache Everything
- Edge Cache TTL: 1 month
- Browser Cache TTL: 1 year
```

**Règle 2 : Pas de cache pour l'API**
```
URL: *tirallarc-istres.fr/api/*

Settings:
- Cache Level: Bypass
```

**Règle 3 : Pas de cache pour l'admin**
```
URL: *admin.tirallarc-istres.fr/*

Settings:
- Cache Level: Bypass
- Security Level: High
```

#### 5. Sécurité Cloudflare

**Cloudflare → Security → WAF**

**Activer les règles managées gratuites :**
- ✅ Cloudflare Managed Ruleset
- ✅ Cloudflare OWASP Core Ruleset

**Cloudflare → Security → Settings**
```
Security Level: Medium
Challenge Passage: 30 minutes
Browser Integrity Check: On
```

#### 6. Multi-sites avec Cloudflare

**Ajouter plusieurs sites à Cloudflare :**

1. **Domaine principal avec sous-domaines :**
   ```
   tirallarc-istres.fr      → Site 1 (localhost:3000)
   admin.tirallarc-istres.fr → Admin (localhost:3000)
   api.tirallarc-istres.fr   → API (localhost:3000)
   ```

2. **Domaines séparés :**
   - Ajouter chaque domaine dans Cloudflare
   - Configurer DNS pour chaque domaine
   - Chaque domaine pointe vers la même IP serveur
   - Nginx route selon le `server_name`

**Exemple avec 3 domaines :**

```bash
# Cloudflare Dashboard
Site 1: tirallarc-istres.fr
  → A @ 51.210.100.50
  → CNAME www tirallarc-istres.fr

Site 2: club-archerie-istres.fr
  → A @ 51.210.100.50
  → CNAME www club-archerie-istres.fr

Site 3: boutique-tirallarc.fr
  → A @ 51.210.100.50
  → CNAME www boutique-tirallarc.fr
```

---

## Gestion SSL par scénario

### Scénario 1 : Let's Encrypt (sans Cloudflare)

**Avantages :**
- ✅ Gratuit
- ✅ Renouvelé automatiquement
- ✅ Reconnu par tous les navigateurs

**Pour un domaine :**
```bash
sudo certbot --nginx -d tirallarc-istres.fr -d www.tirallarc-istres.fr
```

**Pour plusieurs domaines :**
```bash
# Domaine 1
sudo certbot --nginx -d tirallarc-istres.fr -d www.tirallarc-istres.fr

# Domaine 2
sudo certbot --nginx -d club-archerie-istres.fr -d www.club-archerie-istres.fr

# Domaine 3
sudo certbot --nginx -d boutique-tirallarc.fr -d www.boutique-tirallarc.fr
```

**Pour un wildcard (tous les sous-domaines) :**
```bash
sudo certbot certonly --manual --preferred-challenges dns \
  -d tirallarc-istres.fr \
  -d *.tirallarc-istres.fr

# Créer l'enregistrement TXT DNS :
# _acme-challenge.tirallarc-istres.fr TXT "valeur_certbot"
```

---

### Scénario 2 : Cloudflare SSL (recommandé)

**Avantages :**
- ✅ Gratuit
- ✅ Certificat géré automatiquement
- ✅ Protection DDoS incluse
- ✅ CDN inclus
- ✅ Pas de renouvellement manuel

**Configuration :**
1. DNS sur Cloudflare (proxy activé ☁️)
2. SSL Mode : Full (strict)
3. Certificat Origin sur le serveur
4. Aucun renouvellement nécessaire

---

### Scénario 3 : Certificat commercial (payant)

**Pour les entreprises avec besoins spécifiques**

Acheter un certificat chez :
- Sectigo
- DigiCert
- GlobalSign

**Installation identique à Let's Encrypt**

---

## Scénarios pratiques

### Scénario A : Startup avec budget limité

**Configuration recommandée :**
```
1 domaine : monapp.fr
Sous-domaines :
  - www.monapp.fr        (site principal)
  - app.monapp.fr        (application)
  - admin.monapp.fr      (admin)
  - api.monapp.fr        (API)
  - docs.monapp.fr       (docs)

DNS : Cloudflare (gratuit)
SSL : Cloudflare Origin (gratuit)
CDN : Cloudflare (gratuit)
```

**Coût annuel : ~12€** (domaine uniquement)

---

### Scénario B : Agence avec plusieurs clients

**Configuration recommandée :**
```
Domaines séparés par client :
  - client1-app.fr       (localhost:3000)
  - client2-app.fr       (localhost:3001)
  - client3-app.fr       (localhost:3002)

DNS : Cloudflare (1 compte, plusieurs sites)
SSL : Cloudflare Origin par site
Isolation : Utilisateurs Linux + PM2 séparés
```

**Coût annuel : ~12€ × nombre de clients**

---

### Scénario C : SaaS multi-tenant

**Configuration recommandée :**
```
Domaine principal : monservice.fr
Sous-domaines par client :
  - client1.monservice.fr
  - client2.monservice.fr
  - client3.monservice.fr

OU domaines personnalisés :
  - app.client1.fr → CNAME vers monservice.fr
  - app.client2.fr → CNAME vers monservice.fr

DNS : Cloudflare
SSL : Wildcard SSL (*.monservice.fr)
Backend : Même app, multi-tenant en base
```

**Coût annuel : ~12€** (domaine principal)

---

## Dépannage DNS

### Commandes de diagnostic

```bash
# Vérifier la résolution DNS
nslookup tirallarc-istres.fr

# Vérifier les enregistrements A
dig tirallarc-istres.fr A

# Vérifier les enregistrements CNAME
dig www.tirallarc-istres.fr CNAME

# Vérifier tous les enregistrements
dig tirallarc-istres.fr ANY

# Tracer la propagation DNS
dig @8.8.8.8 tirallarc-istres.fr
dig @1.1.1.1 tirallarc-istres.fr

# Vérifier depuis plusieurs serveurs DNS
for ns in 8.8.8.8 1.1.1.1 208.67.222.222; do
  echo "DNS Server: $ns"
  dig @$ns tirallarc-istres.fr +short
done

# Vérifier les nameservers
dig tirallarc-istres.fr NS

# Vérifier le certificat SSL
openssl s_client -connect tirallarc-istres.fr:443 -servername tirallarc-istres.fr

# Test de connectivité complet
curl -I https://tirallarc-istres.fr
```

### Outils en ligne

- **DNS Checker** : https://dnschecker.org
- **DNS Propagation** : https://www.whatsmydns.net
- **SSL Checker** : https://www.sslshopper.com/ssl-checker.html
- **Cloudflare Diagnostic** : https://1.1.1.1/help

### Problèmes courants

#### Problème 1 : "DNS_PROBE_FINISHED_NXDOMAIN"

**Cause :** Domaine non résolu

**Solutions :**
```bash
# Vérifier que l'enregistrement A existe
dig tirallarc-istres.fr A

# Vérifier les nameservers
dig tirallarc-istres.fr NS

# Vider le cache DNS local
# Windows
ipconfig /flushdns

# Linux
sudo systemd-resolve --flush-caches

# macOS
sudo dscacheutil -flushcache
```

#### Problème 2 : "ERR_SSL_VERSION_OR_CIPHER_MISMATCH"

**Cause :** Certificat SSL invalide ou mal configuré

**Solutions :**
```bash
# Vérifier le certificat
openssl s_client -connect tirallarc-istres.fr:443 -servername tirallarc-istres.fr

# Renouveler le certificat Let's Encrypt
sudo certbot renew --force-renewal

# Vérifier la configuration Nginx
sudo nginx -t
```

#### Problème 3 : Sous-domaine ne fonctionne pas

**Cause :** Enregistrement DNS manquant

**Solutions :**
```bash
# Vérifier l'enregistrement
dig admin.tirallarc-istres.fr

# Ajouter l'enregistrement CNAME
# Dans le panneau DNS de votre registrar :
Type: CNAME
Nom: admin
Cible: tirallarc-istres.fr.

# Attendre la propagation (30 min - 48h)
```

#### Problème 4 : Site accessible sans www mais pas avec www

**Cause :** CNAME www manquant

**Solutions :**
```bash
# Ajouter le CNAME www
Type: CNAME
Nom: www
Cible: tirallarc-istres.fr.

# OU rediriger dans Nginx
server {
    server_name www.tirallarc-istres.fr;
    return 301 https://tirallarc-istres.fr$request_uri;
}
```

---

## Bonnes pratiques

### ✅ Sécurité DNS

1. **Utiliser DNSSEC** (si supporté par le registrar)
2. **Activer le verrouillage de domaine** (domain lock)
3. **Authentification 2FA** sur le compte registrar
4. **Email de notification** pour changements DNS
5. **Sauvegarder la configuration DNS**

### ✅ Performance

1. **TTL court pendant les tests** (300s = 5 min)
2. **TTL long en production** (3600s = 1h ou plus)
3. **Utiliser un CDN** (Cloudflare gratuit)
4. **CNAME pour les sous-domaines** (plus flexible que A)
5. **Enregistrement A pour le domaine racine** (@)

### ✅ Organisation

1. **Documenter tous les enregistrements DNS**
2. **Utiliser des noms de sous-domaines cohérents**
   - `api.` pour les API
   - `admin.` pour l'administration
   - `docs.` pour la documentation
   - `cdn.` pour les assets statiques
3. **Préfixer les environnements**
   - `dev.monapp.fr`
   - `staging.monapp.fr`
   - `monapp.fr` (production)

### ✅ Monitoring

1. **Surveiller l'expiration des domaines** (renouvellement)
2. **Surveiller l'expiration des certificats SSL**
3. **Alertes sur les changements DNS non autorisés**
4. **Uptime monitoring** (UptimeRobot, Pingdom)

---

## Checklist de configuration

### Configuration DNS initiale

- [ ] Domaine acheté et activé
- [ ] Nameservers configurés
- [ ] Enregistrement A vers IP serveur créé
- [ ] Enregistrement CNAME www créé
- [ ] Propagation DNS vérifiée (dig/nslookup)
- [ ] Test de résolution depuis plusieurs DNS (8.8.8.8, 1.1.1.1)

### Pour chaque sous-domaine

- [ ] Enregistrement CNAME créé
- [ ] Configuration Nginx ajoutée
- [ ] Certificat SSL obtenu
- [ ] Test HTTPS fonctionnel
- [ ] Redirection HTTP → HTTPS active

### Pour chaque domaine additionnel

- [ ] Domaine acheté
- [ ] DNS configuré vers même IP serveur
- [ ] Configuration Nginx créée et activée
- [ ] Certificat SSL obtenu
- [ ] Test du site fonctionnel
- [ ] Logs séparés configurés

### Cloudflare (optionnel)

- [ ] Compte Cloudflare créé
- [ ] Site ajouté à Cloudflare
- [ ] Nameservers changés chez le registrar
- [ ] Enregistrements DNS migrés
- [ ] SSL Mode : Full (strict)
- [ ] Certificat Origin installé sur serveur
- [ ] Cache configuré (Page Rules)
- [ ] WAF activé

---

## Ressources utiles

### Outils

- **DNS Checker** : https://dnschecker.org
- **SSL Checker** : https://www.sslshopper.com/ssl-checker.html
- **Cloudflare** : https://www.cloudflare.com
- **Let's Encrypt** : https://letsencrypt.org
- **Certbot** : https://certbot.eff.org

### Registrars recommandés

- **OVH** : https://www.ovh.com (français, €)
- **Gandi** : https://www.gandi.net (français, €)
- **Namecheap** : https://www.namecheap.com (international, $)
- **Google Domains** : https://domains.google.com (international, $)
- **Cloudflare Registrar** : https://www.cloudflare.com/products/registrar/ (prix coûtant)

### Coûts indicatifs

| Extension | Prix annuel |
|-----------|-------------|
| `.fr` | 8-12 € |
| `.com` | 10-15 € |
| `.net` | 10-15 € |
| `.io` | 30-40 € |
| `.dev` | 12-18 € |
| `.app` | 15-20 € |

---

## Conclusion

La gestion des noms de domaine pour un serveur multi-sites est **flexible et adaptable** selon vos besoins :

### 🎯 Recommandations finales

1. **Budget limité** → 1 domaine + sous-domaines + Cloudflare gratuit
2. **Sites indépendants** → Domaines séparés + Cloudflare
3. **Startup/PME** → Domaine principal + quelques sous-domaines clés
4. **Agence** → Domaines clients séparés sur même serveur
5. **SaaS** → Wildcard SSL + sous-domaines par tenant

**Pour TirArc Istres, je recommande :**
```
Option A (Simple) : tirallarc-istres.fr
  ├─ www.tirallarc-istres.fr     (site)
  ├─ admin.tirallarc-istres.fr   (admin)
  └─ api.tirallarc-istres.fr     (API)

Coût : ~10€/an + Cloudflare gratuit
SSL : Cloudflare Origin (gratuit)
```

Vous êtes maintenant prêt à gérer vos domaines efficacement ! 🚀

---

**Guide réalisé avec succès !** 🎯

*Dernière mise à jour : 2025-01-15*
