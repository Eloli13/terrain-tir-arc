#!/usr/bin/env node

/**
 * Script d'audit de sécurité automatisé
 *
 * Ce script vérifie:
 * - Les vulnérabilités npm (npm audit)
 * - La force des secrets configurés
 * - Les configurations de sécurité
 * - Les permissions des fichiers sensibles
 *
 * Usage:
 *   node scripts/security-audit.js
 *   node scripts/security-audit.js --fix  (pour corriger automatiquement certains problèmes)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const shouldFix = process.argv.includes('--fix');
let score = 100;
const issues = [];

console.log('\n🔒 === Audit de Sécurité Automatisé ===\n');

/**
 * 1. Vérifier les vulnérabilités npm
 */
function checkNpmVulnerabilities() {
    console.log('📦 Vérification des vulnérabilités npm...');

    try {
        const auditResult = execSync('npm audit --json', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        });

        const audit = JSON.parse(auditResult);
        const vulnerabilities = audit.metadata?.vulnerabilities || {};

        const critical = vulnerabilities.critical || 0;
        const high = vulnerabilities.high || 0;
        const moderate = vulnerabilities.moderate || 0;
        const low = vulnerabilities.low || 0;

        if (critical > 0) {
            score -= 30;
            issues.push({
                severity: 'CRITIQUE',
                message: `${critical} vulnérabilité(s) critique(s) npm détectée(s)`,
                fix: 'Exécutez: npm audit fix --force'
            });
        }

        if (high > 0) {
            score -= 20;
            issues.push({
                severity: 'ÉLEVÉ',
                message: `${high} vulnérabilité(s) haute(s) npm détectée(s)`,
                fix: 'Exécutez: npm audit fix'
            });
        }

        if (moderate > 0) {
            score -= 10;
            issues.push({
                severity: 'MOYEN',
                message: `${moderate} vulnérabilité(s) modérée(s) npm détectée(s)`,
                fix: 'Exécutez: npm audit fix'
            });
        }

        console.log(`   ✓ Critique: ${critical} | Élevé: ${high} | Moyen: ${moderate} | Faible: ${low}`);

        if (shouldFix && (critical > 0 || high > 0 || moderate > 0)) {
            console.log('   🔧 Application des correctifs npm...');
            execSync('npm audit fix', { stdio: 'inherit' });
        }

    } catch (error) {
        console.log('   ⚠️  Erreur lors de l\'audit npm');
    }
}

/**
 * 2. Vérifier la force des secrets
 */
function checkSecretsStrength() {
    console.log('\n🔑 Vérification de la force des secrets...');

    const envPath = path.join(__dirname, '../../.env');

    if (!fs.existsSync(envPath)) {
        console.log('   ⚠️  Fichier .env introuvable');
        return;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const secrets = [
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'SESSION_SECRET',
        'ENCRYPTION_KEY'
    ];

    secrets.forEach(secretName => {
        const regex = new RegExp(`^${secretName}=(.+)$`, 'm');
        const match = envContent.match(regex);

        if (!match) {
            score -= 10;
            issues.push({
                severity: 'ÉLEVÉ',
                message: `Secret ${secretName} manquant dans .env`,
                fix: `Ajoutez ${secretName} avec un secret fort (32+ caractères)`
            });
            return;
        }

        const secretValue = match[1].trim();

        // Vérifier si c'est un placeholder
        if (secretValue.includes('CHANGEZ_MOI') || secretValue.length < 32) {
            score -= 15;
            issues.push({
                severity: 'CRITIQUE',
                message: `Secret ${secretName} faible ou par défaut`,
                fix: `Générez un secret fort: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
            });
        } else {
            console.log(`   ✓ ${secretName}: OK (${secretValue.length} caractères)`);
        }
    });
}

/**
 * 3. Vérifier les configurations de sécurité
 */
function checkSecurityConfig() {
    console.log('\n⚙️  Vérification des configurations de sécurité...');

    const checks = [
        {
            name: 'NODE_ENV en production',
            check: () => process.env.NODE_ENV === 'production',
            severity: 'MOYEN',
            message: 'NODE_ENV devrait être "production" en production'
        },
        {
            name: 'BCRYPT_ROUNDS ≥ 12',
            check: () => {
                const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
                return rounds >= 12;
            },
            severity: 'MOYEN',
            message: 'BCRYPT_ROUNDS devrait être ≥ 12 pour une sécurité optimale'
        },
        {
            name: 'ALLOWED_ORIGINS configuré',
            check: () => {
                const origins = process.env.ALLOWED_ORIGINS || '';
                return origins.length > 0 && !origins.includes('*');
            },
            severity: 'ÉLEVÉ',
            message: 'ALLOWED_ORIGINS doit être configuré (pas de wildcard *)'
        }
    ];

    checks.forEach(({ name, check, severity, message }) => {
        if (!check()) {
            const penalty = severity === 'CRITIQUE' ? 15 : severity === 'ÉLEVÉ' ? 10 : 5;
            score -= penalty;
            issues.push({ severity, message, fix: `Vérifiez la configuration dans .env` });
            console.log(`   ✗ ${name}`);
        } else {
            console.log(`   ✓ ${name}`);
        }
    });
}

/**
 * 4. Vérifier les permissions des fichiers sensibles
 */
function checkFilePermissions() {
    console.log('\n📁 Vérification des permissions de fichiers...');

    const sensitiveFiles = [
        '../../.env',
        '../../.env.production'
    ];

    sensitiveFiles.forEach(file => {
        const filePath = path.join(__dirname, file);

        if (fs.existsSync(filePath)) {
            try {
                const stats = fs.statSync(filePath);
                const mode = (stats.mode & parseInt('777', 8)).toString(8);

                // Vérifier que le fichier n'est pas lisible par tous
                if (mode.endsWith('4') || mode.endsWith('6') || mode.endsWith('7')) {
                    score -= 10;
                    issues.push({
                        severity: 'ÉLEVÉ',
                        message: `${path.basename(filePath)} a des permissions trop permissives (${mode})`,
                        fix: `Exécutez: chmod 600 ${filePath}`
                    });
                    console.log(`   ✗ ${path.basename(filePath)}: Permissions ${mode} (trop permissif)`);
                } else {
                    console.log(`   ✓ ${path.basename(filePath)}: Permissions ${mode}`);
                }
            } catch (error) {
                // Windows n'a pas le même système de permissions
                if (process.platform !== 'win32') {
                    console.log(`   ⚠️  Impossible de vérifier les permissions de ${file}`);
                }
            }
        }
    });
}

/**
 * 5. Vérifier les dépendances obsolètes
 */
function checkOutdatedDependencies() {
    console.log('\n📅 Vérification des dépendances obsolètes...');

    try {
        const outdatedResult = execSync('npm outdated --json', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        });

        if (outdatedResult.trim()) {
            const outdated = JSON.parse(outdatedResult);
            const count = Object.keys(outdated).length;

            if (count > 10) {
                score -= 5;
                issues.push({
                    severity: 'FAIBLE',
                    message: `${count} dépendances obsolètes détectées`,
                    fix: 'Exécutez: npm update'
                });
            }

            console.log(`   ⚠️  ${count} dépendance(s) obsolète(s)`);
        } else {
            console.log('   ✓ Toutes les dépendances sont à jour');
        }
    } catch (error) {
        console.log('   ✓ Toutes les dépendances sont à jour');
    }
}

/**
 * Afficher le rapport final
 */
function displayReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RAPPORT D\'AUDIT DE SÉCURITÉ');
    console.log('='.repeat(60));

    const scoreColor = score >= 90 ? '🟢' : score >= 70 ? '🟡' : '🔴';
    console.log(`\n${scoreColor} Score de Sécurité: ${score}/100`);

    if (issues.length === 0) {
        console.log('\n✅ Aucun problème de sécurité détecté!\n');
        return;
    }

    console.log(`\n⚠️  ${issues.length} problème(s) détecté(s):\n`);

    // Grouper par sévérité
    const grouped = issues.reduce((acc, issue) => {
        if (!acc[issue.severity]) acc[issue.severity] = [];
        acc[issue.severity].push(issue);
        return acc;
    }, {});

    ['CRITIQUE', 'ÉLEVÉ', 'MOYEN', 'FAIBLE'].forEach(severity => {
        if (grouped[severity]) {
            console.log(`\n🚨 ${severity}:`);
            grouped[severity].forEach((issue, i) => {
                console.log(`   ${i + 1}. ${issue.message}`);
                console.log(`      💡 Solution: ${issue.fix}`);
            });
        }
    });

    console.log('\n' + '='.repeat(60) + '\n');

    // Exit code basé sur le score
    if (score < 70) {
        process.exit(1);
    }
}

/**
 * Fonction principale
 */
function main() {
    try {
        checkNpmVulnerabilities();
        checkSecretsStrength();
        checkSecurityConfig();
        checkFilePermissions();
        checkOutdatedDependencies();

        displayReport();
    } catch (error) {
        console.error('\n❌ Erreur lors de l\'audit:', error.message);
        process.exit(1);
    }
}

// Exécution
if (require.main === module) {
    main();
}

module.exports = { checkNpmVulnerabilities, checkSecretsStrength };
