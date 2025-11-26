# Démarrage Rapide - Application Locale

## Application démarrée avec succès !

### URLs d'accès

Ouvrez ces URLs dans votre navigateur :

```
✅ http://localhost                   → Page d'accueil
✅ http://localhost/admin/            → Interface admin
✅ http://localhost/health            → Health check API
✅ http://localhost/declaration.html  → Déclarer une session
✅ http://localhost/incident.html     → Déclarer un incident
```

### Identifiants admin

```
Username : admin
Password : changez-moi-en-production
```

---

## État des services

```powershell
# Voir l'état
docker-compose ps

# Résultat attendu :
# tirallarc-app    Up (healthy)    0.0.0.0:80->80/tcp
# tirallarc-db     Up (healthy)    0.0.0.0:5432->5432/tcp
```

---

## Commandes utiles

### Voir les logs

```powershell
# Tous les services
docker-compose logs -f

# Application uniquement
docker-compose logs -f app

# Base de données uniquement
docker-compose logs -f postgres
```

### Arrêter l'application

```powershell
# Arrêter (conserver les données)
docker-compose down

# Arrêter et supprimer les données (réinitialiser)
docker-compose down -v
```

### Redémarrer après modifications

```powershell
# Frontend ou backend modifié
docker-compose up --build -d

# Voir les logs après rebuild
docker-compose logs -f app
```

### Accéder à la base de données

```powershell
# Se connecter à PostgreSQL
docker exec -it tirallarc-db psql -U tir_arc_user -d terrain_tir_arc

# Dans psql :
\dt                    # Lister les tables
SELECT * FROM admins;  # Voir les admins
SELECT * FROM sessions; # Voir les sessions
\q                     # Quitter
```

---

## Faire des modifications

### 1. Modifier le frontend (HTML/CSS/JS)

```powershell
# 1. Modifier les fichiers dans :
#    - index.html
#    - css/
#    - js/
#    - admin/

# 2. Rebuild et redémarrer
docker-compose up --build -d

# 3. Recharger la page dans le navigateur (Ctrl+F5)
```

### 2. Modifier le backend (Node.js)

```powershell
# 1. Modifier les fichiers dans :
#    - server/

# 2. Rebuild et redémarrer
docker-compose up --build -d

# 3. Vérifier les logs
docker-compose logs -f app
```

### 3. Modifier la base de données

```powershell
# 1. Modifier database.sql

# 2. Réinitialiser complètement
docker-compose down -v
docker-compose up -d

# 3. Attendre 30 secondes
# 4. Tester http://localhost/health
```

---

## Tester l'API

### Avec PowerShell

```powershell
# Health check
Invoke-RestMethod -Uri http://localhost/health

# Créer une session
$body = @{
    nom = "Dupont"
    prenom = "Jean"
    type_tireur = "adulte"
    nombre_tireurs = 3
    terrain = "A"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost/api/sessions `
  -ContentType "application/json" -Body $body

# Lister les sessions
Invoke-RestMethod -Uri http://localhost/api/sessions
```

### Avec curl (Git Bash)

```bash
# Health check
curl http://localhost/health

# Créer une session
curl -X POST http://localhost/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"nom":"Dupont","prenom":"Jean","type_tireur":"adulte","nombre_tireurs":3,"terrain":"A"}'

# Lister les sessions
curl http://localhost/api/sessions
```

---

## Problèmes courants

### Port 80 déjà utilisé

**Symptôme :** `bind: address already in use`

**Solution :**

```powershell
# Trouver et arrêter le processus
netstat -ano | findstr :80
taskkill /PID [PID] /F

# OU changer le port dans docker-compose.yml
# ports: - "8080:80"
# Puis accéder à http://localhost:8080
```

### Application ne démarre pas

**Solution :**

```powershell
# Voir les logs détaillés
docker-compose logs

# Réinitialiser complètement
docker-compose down -v
docker-compose up -d --build
```

### Erreur 502 Bad Gateway

**Solution :**

```powershell
# Vérifier que le backend démarre
docker-compose logs app

# Attendre 30 secondes supplémentaires
# Puis tester http://localhost/health
```

### Modifications non prises en compte

**Solution :**

```powershell
# Force rebuild sans cache
docker-compose build --no-cache app
docker-compose up -d
```

---

## Workflow de développement

```
1. Démarrer Docker Desktop
   ↓
2. Lancer : docker-compose up -d
   ↓
3. Ouvrir http://localhost dans le navigateur
   ↓
4. Modifier le code dans VS Code
   ↓
5. Rebuild : docker-compose up --build -d
   ↓
6. Recharger le navigateur (Ctrl+F5)
   ↓
7. Répéter 4-6 jusqu'à satisfaction
   ↓
8. Quand prêt : Déployer sur Coolify
```

---

## Prêt pour le déploiement ?

Quand vous avez terminé vos modifications :

1. **Tester localement** que tout fonctionne
2. **Build l'image** : `docker build -t eloli/gestion_site_arc:latest .`
3. **Push sur Docker Hub** : `docker push eloli/gestion_site_arc:latest`
4. **Déployer sur Coolify** : Voir [DEPLOIEMENT_COOLIFY_COMPLET.md](DEPLOIEMENT_COOLIFY_COMPLET.md)

---

## Documentation complète

- **[DEPLOIEMENT_LOCAL.md](DEPLOIEMENT_LOCAL.md)** - Guide détaillé complet
- **[DEPLOIEMENT_COOLIFY_COMPLET.md](DEPLOIEMENT_COOLIFY_COMPLET.md)** - Déploiement production
- **[CONFIGURATION_DNS.md](CONFIGURATION_DNS.md)** - Configuration DNS
- **[DOCKER_GUIDE.md](DOCKER_GUIDE.md)** - Guide Docker avancé

---

**Bon développement !** 🚀

**Note :** L'avertissement sur `X-Forwarded-For` dans les logs est normal en développement local et n'affecte pas le fonctionnement.
