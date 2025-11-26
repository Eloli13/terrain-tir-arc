# Guide d'Utilisation - Système de Gestion des Terrains de Tir à l'Arc

## Table des matières
1. [Partie Utilisateur](#partie-utilisateur)
   - [Déclaration de session](#déclaration-de-session)
   - [Signalement d'incident](#signalement-dincident)
2. [Partie Administrateur](#partie-administrateur)
   - [Connexion](#connexion)
   - [Tableau de bord](#tableau-de-bord)
   - [Gestion des incidents](#gestion-des-incidents)
   - [Suivi de fréquentation](#suivi-de-fréquentation)
   - [Configuration](#configuration)

---

## Partie Utilisateur

L'interface utilisateur permet aux tireurs de déclarer leur présence et de signaler des incidents sur les terrains.

### Déclaration de session

#### Accès
- **URL**: Page d'accueil ou `/declaration.html`
- **Pas de connexion requise**

#### Démarrer une session

1. **Remplir le formulaire de déclaration** :
   - **Nom** : Votre nom de famille (2-100 caractères)
   - **Prénom** : Votre prénom (2-100 caractères)
   - **Type de tireur** :
     - `Membres du club` : Adhérents du club local
     - `Autres clubs` : Tireurs d'autres clubs
     - `Service sports` : Utilisateurs du service des sports
   - **Nombre de tireurs** : Nombre total de personnes (1-20)
   - **Terrain** :
     - `Intérieur` : Salle couverte
     - `Extérieur` : Terrain en plein air

2. **Valider le formulaire** :
   - Cliquer sur le bouton **"Démarrer la session"**
   - Une confirmation s'affiche avec l'heure de début

#### Terminer une session

1. **Localiser votre session active** dans la liste affichée
2. **Cliquer sur le bouton "Terminer"** correspondant à votre session
3. La session est clôturée automatiquement avec l'heure de fin

#### Informations affichées

- **Statistiques en temps réel** :
  - Nombre de tireurs actuellement présents sur chaque terrain
  - Limite de capacité par terrain
- **Sessions actives** :
  - Liste des sessions en cours avec nom, prénom, type, nombre de tireurs et heure de début

---

### Signalement d'incident

#### Accès
- **URL**: Page d'accueil puis "Signaler un incident" ou `/incident.html`
- **Pas de connexion requise**

#### Déclarer un incident

1. **Remplir le formulaire** :
   - **Type d'incident** :
     - `Problème matériel` : Équipement défectueux ou endommagé
     - `Blessure` : Incident médical nécessitant une attention
     - `Sécurité` : Situation dangereuse ou violation des règles de sécurité
     - `Autre` : Tout autre type d'incident
   - **Description** : Décrire l'incident en détail (10-2000 caractères)
   - **Terrain concerné** :
     - `Intérieur`
     - `Extérieur`
   - **Photo (optionnel)** : Joindre une photo de l'incident (JPG, PNG, max 5 Mo)

2. **Soumettre le signalement** :
   - Cliquer sur **"Envoyer le signalement"**
   - Un email automatique est envoyé au responsable
   - Une confirmation s'affiche à l'écran

#### Bonnes pratiques

- Soyez précis dans la description
- Indiquez la localisation exacte si nécessaire
- Joignez une photo si cela aide à comprendre le problème
- En cas d'urgence médicale, contactez immédiatement les secours (15 ou 112)

---

## Partie Administrateur

L'interface administrateur permet la gestion complète des incidents, le suivi de fréquentation et la configuration du système.

### Connexion

#### Accès
- **URL**: `/admin/` ou `/admin/index.html`
- **Connexion requise**

#### Se connecter

1. **Entrer les identifiants** :
   - Nom d'utilisateur
   - Mot de passe
2. **Cliquer sur "Se connecter"**
3. Le tableau de bord s'affiche après authentification

#### Sécurité

- Les sessions expirent après 1 heure d'inactivité
- Le token se rafraîchit automatiquement si nécessaire
- Pensez à vous déconnecter après utilisation (bouton en haut à droite)

---

### Tableau de bord

Le tableau de bord affiche les statistiques principales :

- **Nombre total d'incidents** par statut :
  - En attente
  - En cours de traitement
  - Résolus
- **Sessions actives** par terrain
- **Graphique de fréquentation** (configurable par période)

---

### Gestion des incidents

#### Vue d'ensemble

L'onglet **"Incidents"** affiche tous les incidents signalés avec :
- ID de l'incident (UUID)
- Type d'incident
- Terrain concerné
- Date et heure
- Statut actuel
- Actions disponibles

#### Filtrer les incidents

Utilisez les filtres pour affiner l'affichage :
- **Statut** : Tous / En attente / En cours / Résolus
- **Terrain** : Tous / Intérieur / Extérieur
- **Type** : Tous / Problème matériel / Blessure / Sécurité / Autre

Cliquez sur **"Appliquer"** pour filtrer ou **"Réinitialiser"** pour tout afficher.

#### Actions sur un incident

**Visualiser les détails** :
1. Cliquer sur l'icône **👁️ Détails**
2. Une modale affiche :
   - Toutes les informations de l'incident
   - La photo si disponible
   - Les notes de traitement et de résolution

**Modifier le statut** :
1. Ouvrir les détails de l'incident
2. Sélectionner le nouveau statut :
   - `En attente` : Incident non traité
   - `En cours` : Traitement en cours
   - `Résolu` : Incident résolu
3. Ajouter des notes :
   - **Notes de traitement** : Actions en cours, étapes suivies
   - **Notes de résolution** : Solution finale apportée
4. Cliquer sur **"Enregistrer"**

**Exporter en PDF** :
1. Sélectionner les incidents à exporter (cases à cocher)
2. Cliquer sur **"📄 Exporter PDF"**
3. Le PDF est généré avec :
   - Détails complets de chaque incident
   - Photos incluses
   - Pagination automatique
   - Pied de page avec numéro de page et ID d'incident

**Supprimer des incidents** :
1. Sélectionner les incidents à supprimer (cases à cocher)
2. Cliquer sur **"🗑️ Supprimer la sélection"**
3. Confirmer dans la modale de confirmation
4. **⚠️ Action irréversible**

#### Export PDF - Détails techniques

Le PDF généré contient :
- En-tête avec logo et informations du club
- Informations détaillées de chaque incident
- Photos redimensionnées automatiquement
- Pagination intelligente (nouvelle page si nécessaire)
- Pied de page : "Page X sur Y - Incident ID: [UUID complet]"

---

### Suivi de fréquentation

#### Accès

Cliquer sur l'onglet **"Fréquentation"** dans le menu de navigation.

#### Visualisation des données

**Graphique d'évolution** :
- Graphique en courbes montrant l'évolution du nombre de tireurs
- Deux courbes :
  - 🟢 Terrain Intérieur
  - 🟠 Terrain Extérieur
- Dates en ordre chronologique sur l'axe X
- Nombre de tireurs sur l'axe Y

**Tableau détaillé** :
- Liste de toutes les sessions avec :
  - Nom et prénom
  - Type de tireur
  - Nombre de tireurs
  - Terrain utilisé
  - Date et heure de début
  - Date et heure de fin (ou "En cours")
  - Durée de la session

#### Filtres disponibles

**Période** :
- `Semaine` : 7 derniers jours
- `Mois` : Mois en cours (depuis le 1er)
- `Année` : Année en cours (depuis le 1er janvier)
- `Toutes` : Toutes les sessions enregistrées

**Terrain** :
- `Tous` : Intérieur et extérieur
- `Intérieur` : Uniquement le terrain intérieur
- `Extérieur` : Uniquement le terrain extérieur

**Type de tireur** :
- `Tous les types`
- `Membres du club`
- `Autres clubs`
- `Service sports`

**Appliquer les filtres** :
1. Sélectionner les critères souhaités
2. Cliquer sur **"🔍 Appliquer"**
3. Le graphique et le tableau se mettent à jour automatiquement

**Réinitialiser** :
- Cliquer sur **"🔄 Réinitialiser"** pour revenir aux filtres par défaut (mois en cours, tous terrains, tous types)

#### Export de données

**Export CSV** :
1. Cliquer sur le bouton **"📊 Exporter CSV"**
2. Un fichier CSV est téléchargé avec toutes les sessions (filtrées ou non)
3. Colonnes exportées : ID, Nom, Prénom, Type, Nombre, Terrain, Dates, Durée

**Export JSON** :
1. Cliquer sur **"📋 Exporter JSON"**
2. Format structuré pour intégration avec d'autres outils

**Export Excel** :
1. Cliquer sur **"📈 Exporter Excel"**
2. Format XLS compatible avec Excel et LibreOffice

---

### Configuration

#### Accès

Cliquer sur l'onglet **"Configuration"** dans le menu de navigation.

#### Paramètres disponibles

**Téléphone du responsable** :
- Numéro affiché sur le formulaire de déclaration
- Format : 10 chiffres (ex: 0123456789)
- Utilisé pour les urgences

**Email pour les incidents** :
- Adresse email recevant les notifications d'incidents
- Un email automatique est envoyé à chaque nouveau signalement
- Vérifier régulièrement la boîte de réception

**Données du QR Code** :
- Contenu encodé dans le QR code affiché sur la page d'accueil
- Peut contenir : URL, texte, informations de contact
- Utile pour partager rapidement l'accès à l'application

#### Modifier la configuration

1. **Modifier les valeurs** dans les champs de texte
2. **Cliquer sur "💾 Enregistrer"** à côté de chaque paramètre
3. Un message de confirmation s'affiche
4. Les modifications sont appliquées immédiatement

#### Bonnes pratiques

- Maintenir les informations de contact à jour
- Tester l'email de notification après modification
- Vérifier que le QR code fonctionne après modification

---

## Fonctionnalités avancées

### Mode hors ligne (PWA)

L'application fonctionne comme une Progressive Web App :
- **Installation** : Ajoutez l'application à l'écran d'accueil depuis votre navigateur
- **Mode hors ligne** : Les données sont stockées localement si le serveur est indisponible
- **Synchronisation** : Les données se synchronisent automatiquement quand la connexion revient

### Responsive Design

L'interface s'adapte à tous les écrans :
- 📱 **Mobile** : Navigation simplifiée, formulaires optimisés
- 💻 **Tablette/Desktop** : Tableaux et graphiques complets

### Sécurité

**Protection des données** :
- Communication chiffrée (HTTPS en production)
- Validation des entrées utilisateur
- Protection contre les injections XSS
- Échappement des caractères spéciaux

**Authentification** :
- JWT (JSON Web Token) pour les sessions admin
- Tokens expirables et renouvelables
- Déconnexion automatique après inactivité

**Audit Trail** :
- Toutes les actions admin sont enregistrées
- Traçabilité complète des modifications
- Logs d'audit consultables

---

## Aide et support

### En cas de problème

**Problèmes de connexion** :
- Vérifier vos identifiants
- Attendre quelques minutes si plusieurs tentatives échouées
- Contacter l'administrateur système pour réinitialiser le mot de passe

**Erreur lors de la soumission** :
- Vérifier que tous les champs obligatoires sont remplis
- Vérifier la taille de la photo (max 5 Mo)
- Rafraîchir la page et réessayer
- Vérifier votre connexion Internet

**Données non synchronisées** :
- L'application bascule en mode localStorage si l'API est indisponible
- Les données seront synchronisées au retour de la connexion
- En mode admin, reconnectez-vous pour forcer la synchronisation

### Contact

Pour toute assistance technique :
- Consulter les logs en mode développeur (F12)
- Noter le message d'erreur exact
- Contacter l'administrateur système avec ces informations

---

## Annexes

### Formats de fichiers acceptés

**Photos d'incidents** :
- JPG/JPEG
- PNG
- Taille maximale : 5 Mo
- Redimensionnement automatique dans les PDF

### Limites du système

**Sessions** :
- Maximum 10 sessions simultanées par terrain (configurable)
- Empêche la surcharge des terrains
- Message d'erreur si limite atteinte

**Incidents** :
- Pas de limite de stockage
- Recommandé : archiver les incidents de plus de 2 ans
- Export régulier en PDF pour archivage

### Navigateurs supportés

- ✅ Chrome/Edge (v90+)
- ✅ Firefox (v88+)
- ✅ Safari (v14+)
- ✅ Opera (v76+)

### Raccourcis clavier (Admin)

- `Ctrl + Shift + R` : Rafraîchir et vider le cache
- `F5` : Rafraîchir la page
- `F12` : Ouvrir les outils de développement
- `Échap` : Fermer une modale ouverte

---

**Version du document** : 1.0
**Dernière mise à jour** : Octobre 2025
**Application** : Système de Gestion des Terrains de Tir à l'Arc
