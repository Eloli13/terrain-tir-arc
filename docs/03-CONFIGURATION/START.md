# 🚀 DÉMARRAGE RAPIDE (2 minutes)

## ⚡ Les deux commandes essentielles

### 1️⃣ Terminal 1 - Backend

```bash
cd server
npm start
```

✅ **Backend démarré sur http://localhost:3000**

---

### 2️⃣ Terminal 2 - Frontend

⚠️ **DEPUIS LA RACINE DU PROJET (pas depuis server/) !**

```bash
# Si vous êtes dans server/, remontez:
cd ..

# Puis lancez:
python -m http.server 8000
```

✅ **Frontend démarré sur http://localhost:8000**

---

## 🌐 Ouvrir dans le navigateur

**👉 http://localhost:8000**

---

## 🆘 Problèmes ?

### Erreur 404 sur les fichiers ?

**Vérifiez que vous êtes à la racine:**

```bash
ls
# Vous devez voir: index.html, declaration.html, server/, admin/, etc.
```

**Si vous ne voyez pas index.html**, vous êtes dans le mauvais dossier !

```bash
cd ..
python -m http.server 8000
```

---

### Backend ne démarre pas ?

Port 3000 déjà utilisé :

```powershell
# Windows PowerShell
Get-Process node | Where-Object {$_.Id -in (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess} | Stop-Process -Force

# Puis relancer
cd server
npm start
```

---

## 📚 Documentation complète

- [QUICK_START.md](QUICK_START.md) - Guide détaillé
- [README.md](README.md) - Documentation principale
- [UPDATES.md](UPDATES.md) - Dernières mises à jour

---

**✅ C'est tout ! Bon développement !**
