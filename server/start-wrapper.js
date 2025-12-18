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
    process.stdout.write('\n[WRAPPER] ❌ ERREUR NON GÉRÉE:\n');
    process.stdout.write(error.stack || error.message || String(error));
    process.stdout.write('\n\n');
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    process.stdout.write('\n[WRAPPER] ❌ PROMISE REJETÉE:\n');
    process.stdout.write(String(reason));
    process.stdout.write('\n\n');
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
    let error = null;

    try {
        process.stdout.write('[WRAPPER] Chargement du serveur principal...\n');
        process.stdout.flush();

        const { initializeApp } = require('./server.js');

        process.stdout.write('[WRAPPER] Initialisation de l\'application...\n');
        process.stdout.flush();

        await initializeApp();

        process.stdout.write('[WRAPPER] ✅ Serveur démarré avec succès\n');
        process.stdout.flush();
    } catch (err) {
        error = err;

        // FORCE l'affichage de l'erreur avec console.log (plus fiable que stdout)
        console.log('\n========================================');
        console.log('[WRAPPER] ❌ ERREUR DE DÉMARRAGE DU SERVEUR:');
        console.log('========================================');
        console.log('Message:', err.message || 'Aucun message');
        console.log('Type:', err.constructor.name);

        if (err.stack) {
            console.log('\nStack trace:');
            console.log(err.stack);
        }

        console.log('\n========================================\n');

        // Aussi sur stdout pour être sûr
        process.stdout.write('\n[WRAPPER] ❌ ERREUR: ' + (err.message || String(err)) + '\n');

        // Attendre que tout flush
        await new Promise(resolve => setTimeout(resolve, 100));

        process.exit(1);
    }
}

// Lancer le démarrage
startServer().catch((error) => {
    process.stdout.write('\n[WRAPPER] ❌ ERREUR FATALE:\n');
    process.stdout.write(error.stack || error.message || String(error));
    process.stdout.write('\n\n');
    process.exit(1);
});
