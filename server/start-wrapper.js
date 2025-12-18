#!/usr/bin/env node

/**
 * Wrapper de démarrage pour capturer et afficher toutes les erreurs
 * Nécessaire car console.error() peut ne pas flush avant que le process meure
 */

// Forcer le flush de stdout/stderr avant de quitter
process.on('exit', (code) => {
    if (code !== 0) {
        process.stdout.write(`\n[WRAPPER] Process exiting with code ${code}\n`);
    }
});

// Capturer les erreurs non gérées
process.on('uncaughtException', (error) => {
    const errorMsg = '\n[WRAPPER] ❌ ERREUR NON GÉRÉE:\n' +
                     (error.stack || error.message || String(error)) + '\n\n';

    // Écriture synchrone sur stderr ET stdout
    process.stderr.write(errorMsg);
    process.stdout.write(errorMsg);

    // Attendre pour laisser les buffers flusher
    const waitForFlush = Date.now() + 100;
    while (Date.now() < waitForFlush) { /* spin wait */ }

    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    const errorMsg = '\n[WRAPPER] ❌ PROMISE REJETÉE:\n' +
                     (String(reason)) + '\n\n';

    // Écriture synchrone sur stderr ET stdout
    process.stderr.write(errorMsg);
    process.stdout.write(errorMsg);

    // Attendre pour laisser les buffers flusher
    const waitForFlush = Date.now() + 100;
    while (Date.now() < waitForFlush) { /* spin wait */ }

    process.exit(1);
});

// Rediriger console.error vers process.stdout pour garantir la visibilité
const originalConsoleError = console.error;
console.error = function(...args) {
    // Écrire sur stdout ET stderr
    process.stdout.write(args.join(' ') + '\n');
    originalConsoleError.apply(console, args);
};

// Démarrer le serveur principal
async function startServer() {
    let initializeApp;

    try {
        process.stderr.write('[WRAPPER] Chargement du serveur principal...\n');
        initializeApp = require('./server.js').initializeApp;
        process.stderr.write('[WRAPPER] Module serveur chargé avec succès\n');
    } catch (err) {
        // Erreur pendant le chargement du module (ex: validateEnvironment qui throw)
        const errorDetails = [
            '\n========================================',
            '[WRAPPER] ❌ ERREUR DE CHARGEMENT DU MODULE:',
            '========================================',
            `Message: ${err.message || 'Aucun message'}`,
            `Type: ${err.constructor.name}`,
            ''
        ];

        if (err.stack) {
            errorDetails.push('Stack trace:');
            errorDetails.push(err.stack);
        }

        errorDetails.push('========================================\n');

        const fullError = errorDetails.join('\n');

        // Écriture synchrone sur stderr (plus fiable que console.log)
        process.stderr.write(fullError);
        process.stdout.write(fullError);

        // Attendre un court instant pour laisser les buffers flusher
        const waitForFlush = Date.now() + 100;
        while (Date.now() < waitForFlush) { /* spin wait */ }

        process.exit(1);
    }

    try {
        process.stderr.write('[WRAPPER] Initialisation de l\'application...\n');
        await initializeApp();
        process.stderr.write('[WRAPPER] ✅ Serveur démarré avec succès\n');
    } catch (err) {
        // FORCE BRUTALE: Utiliser fs.writeFileSync sur /dev/stdout
        const fs = require('fs');

        const errorDetails = [
            '\n========================================',
            '[WRAPPER] ❌ ERREUR DE DÉMARRAGE DU SERVEUR:',
            '========================================',
            `Message: ${err.message || 'Aucun message'}`,
            `Type: ${err.constructor.name}`,
            ''
        ];

        if (err.stack) {
            errorDetails.push('Stack trace:');
            errorDetails.push(err.stack);
        }

        errorDetails.push('========================================\n');

        const fullError = errorDetails.join('\n');

        // Triple écriture pour maximiser les chances
        try {
            // 1. fs.writeFileSync sur stdout (le plus fiable)
            fs.writeFileSync(1, fullError, 'utf8');
            fs.writeFileSync(2, fullError, 'utf8');
        } catch (e) {
            // Fallback
        }

        // 2. process.stderr/stdout.write
        process.stderr.write(fullError);
        process.stdout.write(fullError);

        // 3. console.log comme dernier recours
        console.log(fullError);
        console.error(fullError);

        // Attendre PLUS LONGTEMPS pour laisser les buffers flusher
        const waitForFlush = Date.now() + 500;
        while (Date.now() < waitForFlush) { /* spin wait */ }

        process.exit(1);
    }
}

// Lancer le démarrage
startServer().catch((error) => {
    const errorMsg = '\n[WRAPPER] ❌ ERREUR FATALE:\n' +
                     (error.stack || error.message || String(error)) + '\n';

    // Écriture synchrone sur stderr ET stdout
    process.stderr.write(errorMsg);
    process.stdout.write(errorMsg);

    // Attendre pour laisser les buffers flusher
    const waitForFlush = Date.now() + 100;
    while (Date.now() < waitForFlush) { /* spin wait */ }

    process.exit(1);
});
