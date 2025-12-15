#!/usr/bin/env node

/**
 * Script de test des fonctionnalités de sécurité
 *
 * Ce script teste :
 * - Changement de mot de passe obligatoire
 * - API de sécurité (/api/v1/security/*)
 * - CSP avec nonces
 * - Rate limiting
 * - Algorithmes JWT
 * - Audit logs
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost';
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

let testsPassed = 0;
let testsFailed = 0;
let adminToken = null;

/**
 * Helper pour afficher les résultats
 */
function log(message, type = 'info') {
    const prefix = {
        success: `${colors.green}✓${colors.reset}`,
        error: `${colors.red}✗${colors.reset}`,
        info: `${colors.blue}ℹ${colors.reset}`,
        warning: `${colors.yellow}⚠${colors.reset}`
    };
    console.log(`${prefix[type]} ${message}`);
}

function logSection(title) {
    console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.blue}${title}${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

async function test(name, fn) {
    try {
        await fn();
        log(`${name}`, 'success');
        testsPassed++;
    } catch (error) {
        log(`${name}: ${error.message}`, 'error');
        testsFailed++;
    }
}

/**
 * Test 1: Changement de mot de passe obligatoire
 */
async function testMustChangePassword() {
    logSection('Test 1: Changement de mot de passe obligatoire');

    await test('Admin par défaut doit changer son mot de passe', async () => {
        try {
            const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
                username: 'admin',
                password: 'changez-moi-en-production'
            });

            // Si la connexion réussit, c'est un échec du test
            throw new Error('La connexion ne devrait pas réussir sans changement de mot de passe');
        } catch (error) {
            if (error.response?.status === 401 &&
                error.response?.data?.error?.includes('changer votre mot de passe')) {
                // C'est le comportement attendu
                return;
            }
            throw error;
        }
    });

    log('💡 Pour réinitialiser le flag must_change_password, exécutez :', 'info');
    log('   UPDATE admin_users SET must_change_password = false WHERE username = \'admin\';', 'info');
}

/**
 * Test 2: Connexion et obtention du token
 */
async function testLogin() {
    logSection('Test 2: Connexion (après reset du flag)');

    await test('Connexion avec admin (must_change_password = false)', async () => {
        const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
            username: 'admin',
            password: 'changez-moi-en-production'
        });

        if (!response.data.accessToken) {
            throw new Error('Pas de token reçu');
        }

        adminToken = response.data.accessToken;
        log(`   Token obtenu: ${adminToken.substring(0, 20)}...`, 'info');
    });
}

/**
 * Test 3: API de sécurité - Statut
 */
async function testSecurityStatus() {
    logSection('Test 3: API /security/status');

    if (!adminToken) {
        log('Token non disponible, test ignoré', 'warning');
        return;
    }

    await test('GET /api/v1/security/status', async () => {
        const response = await axios.get(`${BASE_URL}/api/v1/security/status`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        const data = response.data;

        if (!data.securityScore) {
            throw new Error('Score de sécurité manquant');
        }

        log(`   Score de sécurité: ${data.securityScore}/100 (${data.level})`, 'info');

        const checksCount = Object.keys(data.checks).length;
        log(`   Vérifications: ${checksCount} checks effectués`, 'info');

        if (data.recommendations.length > 0) {
            log(`   Recommandations: ${data.recommendations.length} à appliquer`, 'warning');
            data.recommendations.forEach(rec => {
                log(`     - [${rec.severity}] ${rec.message}`, 'warning');
            });
        }
    });
}

/**
 * Test 4: API de sécurité - Audit Logs
 */
async function testAuditLogs() {
    logSection('Test 4: API /security/audit-logs');

    if (!adminToken) {
        log('Token non disponible, test ignoré', 'warning');
        return;
    }

    await test('GET /api/v1/security/audit-logs', async () => {
        const response = await axios.get(`${BASE_URL}/api/v1/security/audit-logs?limit=5`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        const data = response.data;

        if (!data.logs || !Array.isArray(data.logs)) {
            throw new Error('Logs d\'audit manquants');
        }

        log(`   ${data.logs.length} logs récupérés`, 'info');
        log(`   Total dans la base: ${data.pagination.total}`, 'info');

        if (data.logs.length > 0) {
            const lastLog = data.logs[0];
            log(`   Dernier log: ${lastLog.action} par ${lastLog.username || 'système'}`, 'info');
        }
    });
}

/**
 * Test 5: API de sécurité - Sessions actives
 */
async function testActiveSessions() {
    logSection('Test 5: API /security/active-sessions');

    if (!adminToken) {
        log('Token non disponible, test ignoré', 'warning');
        return;
    }

    await test('GET /api/v1/security/active-sessions', async () => {
        const response = await axios.get(`${BASE_URL}/api/v1/security/active-sessions`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        const data = response.data;

        if (!data.sessions || !Array.isArray(data.sessions)) {
            throw new Error('Sessions actives manquantes');
        }

        log(`   ${data.sessions.length} session(s) active(s)`, 'info');

        data.sessions.forEach((session, i) => {
            log(`   Session ${i + 1}: ${session.username} (IP: ${session.lastIp || 'N/A'})`, 'info');
        });
    });
}

/**
 * Test 6: CSP avec nonces
 */
async function testCSPNonces() {
    logSection('Test 6: Content Security Policy avec nonces');

    await test('Vérifier les headers CSP', async () => {
        const response = await axios.get(`${BASE_URL}/health`);

        const cspHeader = response.headers['content-security-policy'];

        if (!cspHeader) {
            throw new Error('Header Content-Security-Policy manquant');
        }

        log(`   CSP présent: ${cspHeader.substring(0, 100)}...`, 'info');

        // Vérifier la présence de nonces
        if (cspHeader.includes("'nonce-")) {
            log('   Nonces détectés dans CSP ✓', 'success');
        } else {
            throw new Error('Nonces non détectés dans CSP');
        }

        // Vérifier l'absence de unsafe-inline
        if (cspHeader.includes("'unsafe-inline'")) {
            log('   ATTENTION: unsafe-inline détecté (à éviter)', 'warning');
        } else {
            log('   Pas de unsafe-inline ✓', 'success');
        }
    });
}

/**
 * Test 7: Rate Limiting
 */
async function testRateLimiting() {
    logSection('Test 7: Rate Limiting (tentatives de login)');

    log('Envoi de 6 tentatives de connexion rapides...', 'info');

    let blockedAt = 0;

    for (let i = 1; i <= 6; i++) {
        try {
            await axios.post(`${BASE_URL}/api/v1/auth/login`, {
                username: 'test_rate_limit',
                password: 'wrong_password'
            });
        } catch (error) {
            if (error.response?.status === 429) {
                blockedAt = i;
                log(`   Bloqué après ${i} tentatives ✓`, 'success');
                testsPassed++;
                break;
            }
        }

        // Petite pause entre les requêtes
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (blockedAt === 0) {
        log('   Rate limiting non déclenché', 'warning');
    }
}

/**
 * Test 8: Vérification des algorithmes JWT
 */
async function testJWTAlgorithms() {
    logSection('Test 8: Algorithmes JWT explicites');

    if (!adminToken) {
        log('Token non disponible, test ignoré', 'warning');
        return;
    }

    await test('Vérifier la structure du JWT', async () => {
        const parts = adminToken.split('.');

        if (parts.length !== 3) {
            throw new Error('Format JWT invalide');
        }

        // Décoder le header
        const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());

        log(`   Algorithme utilisé: ${header.alg}`, 'info');
        log(`   Type: ${header.typ}`, 'info');

        if (header.alg !== 'HS256') {
            throw new Error(`Algorithme inattendu: ${header.alg} (attendu: HS256)`);
        }

        // Décoder le payload
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

        log(`   Issuer: ${payload.iss}`, 'info');
        log(`   Audience: ${payload.aud}`, 'info');

        if (payload.iss !== 'terrain-tir-arc-server') {
            throw new Error('Issuer incorrect');
        }

        if (payload.aud !== 'terrain-tir-arc-client') {
            throw new Error('Audience incorrecte');
        }
    });
}

/**
 * Test 9: Test de l'audit
 */
async function testAuditSystem() {
    logSection('Test 9: Système d\'audit');

    if (!adminToken) {
        log('Token non disponible, test ignoré', 'warning');
        return;
    }

    await test('POST /api/v1/security/test-audit', async () => {
        const response = await axios.post(`${BASE_URL}/api/v1/security/test-audit`, {}, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        if (!response.data.message) {
            throw new Error('Réponse inattendue');
        }

        log(`   Entrée d'audit créée: ${response.data.timestamp}`, 'info');
    });
}

/**
 * Test 10: Documentation API
 */
async function testAPIDocumentation() {
    logSection('Test 10: Documentation API');

    await test('GET /api/docs', async () => {
        const response = await axios.get(`${BASE_URL}/api/docs`);

        const docs = response.data;

        if (!docs.endpoints) {
            throw new Error('Endpoints manquants dans la documentation');
        }

        const endpointGroups = Object.keys(docs.endpoints);
        log(`   ${endpointGroups.length} groupes d'endpoints documentés`, 'info');

        // Vérifier que le groupe security existe
        if (docs.endpoints.security) {
            const securityEndpoints = Object.keys(docs.endpoints.security).length;
            log(`   ${securityEndpoints} endpoints de sécurité documentés ✓`, 'success');
        } else {
            throw new Error('Groupe security manquant dans la documentation');
        }
    });
}

/**
 * Fonction principale
 */
async function main() {
    console.log('\n🔒 === Tests des Fonctionnalités de Sécurité ===\n');
    console.log(`Base URL: ${BASE_URL}\n`);

    try {
        // Test 1: Must change password (devrait échouer)
        await testMustChangePassword();

        // Note pour l'utilisateur
        console.log(`\n${colors.yellow}⚠ IMPORTANT:${colors.reset}`);
        console.log('Pour continuer les tests, vous devez désactiver le flag must_change_password:');
        console.log('\n  Option 1: Via psql');
        console.log('  docker-compose exec postgres psql -U tir_arc_user -d terrain_tir_arc');
        console.log('  UPDATE admin_users SET must_change_password = false WHERE username = \'admin\';');
        console.log('\n  Option 2: Via API (changez le mot de passe)');
        console.log('  POST /api/v1/auth/change-password\n');

        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        await new Promise((resolve) => {
            readline.question('Appuyez sur Entrée après avoir désactivé le flag... ', () => {
                readline.close();
                resolve();
            });
        });

        // Tests suivants (nécessitent un token)
        await testLogin();
        await testSecurityStatus();
        await testAuditLogs();
        await testActiveSessions();
        await testCSPNonces();
        await testRateLimiting();
        await testJWTAlgorithms();
        await testAuditSystem();
        await testAPIDocumentation();

    } catch (error) {
        log(`Erreur fatale: ${error.message}`, 'error');
        console.error(error);
    }

    // Résumé final
    console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.blue}RÉSUMÉ DES TESTS${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);

    const total = testsPassed + testsFailed;
    const percentage = total > 0 ? Math.round((testsPassed / total) * 100) : 0;

    console.log(`${colors.green}✓ Tests réussis: ${testsPassed}${colors.reset}`);
    console.log(`${colors.red}✗ Tests échoués: ${testsFailed}${colors.reset}`);
    console.log(`📊 Taux de réussite: ${percentage}%\n`);

    if (testsFailed === 0) {
        console.log(`${colors.green}🎉 Tous les tests sont passés avec succès !${colors.reset}\n`);
    } else {
        console.log(`${colors.yellow}⚠ Certains tests ont échoué. Vérifiez les erreurs ci-dessus.${colors.reset}\n`);
    }

    process.exit(testsFailed > 0 ? 1 : 0);
}

// Exécution
if (require.main === module) {
    main().catch(error => {
        console.error('Erreur:', error);
        process.exit(1);
    });
}
