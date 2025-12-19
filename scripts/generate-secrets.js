#!/usr/bin/env node

/**
 * Script pour générer tous les secrets nécessaires au déploiement
 * Usage: node scripts/generate-secrets.js
 */

const crypto = require('crypto');

console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
console.log('║  🔐 GÉNÉRATION DES SECRETS POUR COOLIFY                          ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

console.log('📋 Copiez ces valeurs dans les variables d\'environnement de Coolify:\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Génération des secrets
const secrets = {
    'JWT_SECRET': crypto.randomBytes(64).toString('hex'),
    'JWT_REFRESH_SECRET': crypto.randomBytes(64).toString('hex'),
    'SESSION_SECRET': crypto.randomBytes(64).toString('hex'),
    'ENCRYPTION_KEY': crypto.randomBytes(32).toString('hex'),
    'DB_PASSWORD': crypto.randomBytes(32).toString('base64')
};

// Affichage formaté
Object.entries(secrets).forEach(([key, value]) => {
    console.log(`${key}=${value}`);
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Vérifications
console.log('✅ Vérifications:');
console.log(`   JWT_SECRET: ${secrets['JWT_SECRET'].length} caractères (devrait être 128)`);
console.log(`   JWT_REFRESH_SECRET: ${secrets['JWT_REFRESH_SECRET'].length} caractères (devrait être 128)`);
console.log(`   SESSION_SECRET: ${secrets['SESSION_SECRET'].length} caractères (devrait être 128)`);
console.log(`   ENCRYPTION_KEY: ${secrets['ENCRYPTION_KEY'].length} caractères (devrait être 64)`);
console.log(`   DB_PASSWORD: ${secrets['DB_PASSWORD'].length} caractères (base64)\n`);

// Avertissements
console.log('⚠️  IMPORTANT:');
console.log('   1. NE JAMAIS commiter ces secrets dans Git');
console.log('   2. Sauvegarder ces valeurs dans un gestionnaire de mots de passe');
console.log('   3. Utiliser des secrets DIFFÉRENTS pour dev et production');
console.log('   4. Si vous perdez ENCRYPTION_KEY, les données chiffrées seront IRRÉCUPÉRABLES\n');

// Génération du fichier .env (optionnel)
console.log('💾 Voulez-vous sauvegarder ces secrets dans un fichier ?');
console.log('   Les secrets seront sauvegardés dans : .env.production.generated');
console.log('   Ensuite, vous devrez copier ces valeurs dans Coolify\n');

const fs = require('fs');
const path = require('path');

// Génération du fichier .env.production.generated
// ⚠️ IMPORTANT: Ne générer QUE les variables utilisées dans docker-compose.coolify.yml
const envContent = `# ===================================================================
# SECRETS GÉNÉRÉS LE ${new Date().toISOString()}
# ===================================================================
# ⚠️  NE JAMAIS COMMITER CE FICHIER DANS GIT !
# ⚠️  Ces variables sont utilisées par docker-compose.coolify.yml
# ===================================================================

# ========================================
# ENVIRONNEMENT
# ========================================
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# ========================================
# BASE DE DONNÉES POSTGRESQL
# ========================================
DB_HOST=postgres
DB_PORT=5432
DB_NAME=terrain_tir_arc
DB_USER=tir_arc_user
DB_PASSWORD=${secrets['DB_PASSWORD']}

# ========================================
# SÉCURITÉ JWT
# ========================================
JWT_SECRET=${secrets['JWT_SECRET']}
JWT_REFRESH_SECRET=${secrets['JWT_REFRESH_SECRET']}

# ========================================
# SESSION ET ENCRYPTION
# ========================================
SESSION_SECRET=${secrets['SESSION_SECRET']}
ENCRYPTION_KEY=${secrets['ENCRYPTION_KEY']}

# ========================================
# CORS
# ========================================
ALLOWED_ORIGINS=https://tiralarc.srv759477.hstgr.cloud

# ========================================
# LOGS
# ========================================
LOG_LEVEL=info

# ========================================
# RATE LIMITING
# ========================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=12

# ========================================
# EMAIL (OPTIONNEL - laisser vide pour l'instant)
# ========================================
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASSWORD=

# ========================================
# NOTES
# ========================================
# BACKUP_RETENTION_DAYS: Configuré à 30 jours dans docker-compose.coolify.yml (ligne 109)
# Le backup s'exécute automatiquement tous les jours à 2h du matin
# Les backups sont conservés dans le volume app_backups_prod
`;

const outputPath = path.join(__dirname, '..', '.env.production.generated');
fs.writeFileSync(outputPath, envContent, 'utf8');

console.log(`✅ Fichier sauvegardé : ${outputPath}\n`);
console.log('📋 Prochaines étapes:');
console.log('   1. Ouvrez le fichier .env.production.generated');
console.log('   2. Copiez TOUTES les variables d\'environnement');
console.log('   3. Dans Coolify, collez-les dans la section "Environment Variables"');
console.log('   4. Vérifiez que chaque variable est bien configurée');
console.log('   5. Déployez l\'application\n');

console.log('⚠️  SÉCURITÉ:');
console.log('   - Ajoutez .env.production.generated au .gitignore (déjà fait)');
console.log('   - Supprimez ce fichier après l\'avoir copié dans Coolify');
console.log('   - Conservez une copie des secrets dans un gestionnaire de mots de passe\n');
