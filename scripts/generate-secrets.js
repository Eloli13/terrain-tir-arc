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
const envContent = `# ===================================================================
# SECRETS GÉNÉRÉS LE ${new Date().toISOString()}
# ===================================================================
# ⚠️  NE JAMAIS COMMITER CE FICHIER DANS GIT !
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
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# ========================================
# SESSION ET ENCRYPTION
# ========================================
SESSION_SECRET=${secrets['SESSION_SECRET']}
ENCRYPTION_KEY=${secrets['ENCRYPTION_KEY']}
COOKIE_SECURE=true
COOKIE_SAMESITE=strict

# ========================================
# CORS ET DOMAINE
# ========================================
ALLOWED_ORIGINS=https://tiralarc.srv759477.hstgr.cloud
FRONTEND_URL=https://tiralarc.srv759477.hstgr.cloud

# ========================================
# LOGS ET MONITORING
# ========================================
LOG_LEVEL=info
LOG_FORMAT=json
SECURITY_LOGS_ENABLED=true
LOG_RETENTION_DAYS=30

# ========================================
# RATE LIMITING
# ========================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX_ATTEMPTS=5

# ========================================
# EMAIL (OPTIONNEL - à configurer plus tard)
# ========================================
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASSWORD=

# ========================================
# BACKUP
# ========================================
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=7

# ========================================
# MÉTRIQUES
# ========================================
METRICS_ENABLED=true
METRICS_PORT=9090
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
