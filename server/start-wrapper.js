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

        const { initializeApp } = require('./server.js');

        process.stdout.write('[WRAPPER] Initialisation de l\'application...\n');

        await initializeApp();

        process.stdout.write('[WRAPPER] ✅ Serveur démarré avec succès\n');
    } catch (err) {
        error = err;

        // FORCE l'affichage de l'erreur avec console.error (déjà redirigé vers stdout)
        // console.error écrit sur stderr qui n'est PAS bufferisé
        console.error('\n========================================');
        console.error('[WRAPPER] ❌ ERREUR DE DÉMARRAGE DU SERVEUR:');
        console.error('========================================');
        console.error('Message:', err.message || 'Aucun message');
        console.error('Type:', err.constructor.name);

        if (err.stack) {
            console.error('\nStack trace:');
            console.error(err.stack);
        }

        console.error('\n========================================\n');

        // AUSSI écrire directement sur stderr (file descriptor 2) pour être ABSOLUMENT SÛR
        const errorMsg = `\n[WRAPPER] ❌ ERREUR CRITIQUE: ${err.message || String(err)}\n\n`;
        process.stderr.write(errorMsg);

        // ET sur stdout
        process.stdout.write(errorMsg);

        // Attendre que tout flush (augmenté à 500ms pour être sûr)
        await new Promise(resolve => setTimeout(resolve, 500));

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
