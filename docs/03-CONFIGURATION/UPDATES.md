# 📝 Dernières Mises à Jour

## 2025-01-15 - Clarification démarrage frontend

### ⚠️ IMPORTANT: Serveur Python depuis la RACINE du projet

**Problème identifié:**
Les utilisateurs lançaient `python -m http.server 8000` depuis le dossier `server/` au lieu de la racine, causant des erreurs 404.

**Corrections apportées:**

1. **QUICK_START.md** - Ajout d'avertissements clairs:
   - Section "Terminal 2: Frontend PWA" avec warning ⚠️
   - Section "Erreurs courantes" avec Cause 2 pour 404 index.html
   - Section "Workflow typique" avec commentaires explicites

2. **Tous les fichiers HTML** - Ajout des favicons:
   - `index.html`
   - `declaration.html`
   - `incident.html`
   - `admin/index.html`

### 📁 Structure correcte des terminaux

```
Terminal 1 (Backend):
C:\Gemini\terrain_claude_code\server> npm start

Terminal 2 (Frontend):
C:\Gemini\terrain_claude_code> python -m http.server 8000
                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^
                              ⚠️ ATTENTION: Racine du projet !
```

### ✅ Comment vérifier que vous êtes au bon endroit

Avant de lancer `python -m http.server 8000`, vérifiez que vous voyez ces fichiers :

```bash
ls
# Vous devez voir:
# - index.html
# - declaration.html
# - incident.html
# - manifest.json
# - server/ (dossier)
# - admin/ (dossier)
# - css/ (dossier)
# - js/ (dossier)
```

**Si vous voyez** `package.json`, `server.js`, `routes/`, vous êtes dans `server/` → Remontez avec `cd ..`

---

## Historique complet

| Date | Version | Description |
|------|---------|-------------|
| 2025-01-15 | 1.1.1 | Clarification démarrage frontend + ajout favicons |
| 2025-01-15 | 1.1.0 | Corrections bugs + nouvelles fonctionnalités |
| 2025-01-01 | 1.0.0 | Version initiale |

---

Voir [CHANGELOG.md](CHANGELOG.md) pour l'historique détaillé.
