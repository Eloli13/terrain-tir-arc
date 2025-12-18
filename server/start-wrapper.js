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
    let initializeApp;

    try {
        console.log('[WRAPPER] Chargement du serveur principal...');
        initializeApp = require('./server.js').initializeApp;
        console.log('[WRAPPER] Module serveur chargé avec succès');
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
        console.log(fullError);
        console.error(fullError);
        process.exit(1);
    }

    try {
        console.log('[WRAPPER] Initialisation de l\'application...');
        await initializeApp();
        console.log('[WRAPPER] ✅ Serveur démarré avec succès');
    } catch (err) {
        // Utiliser console.log ET console.error pour maximiser les chances de voir l'erreur
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

        // Écrire sur console.log ET console.error
        console.log(fullError);
        console.error(fullError);

        // Forcer la sortie immédiate sans attente
        process.exit(1);
    }
}

// Lancer le démarrage
startServer().catch((error) => {
    console.log('\n[WRAPPER] ❌ ERREUR FATALE:');
    console.log(error.stack || error.message || String(error));
    console.log('');
    console.error('\n[WRAPPER] ❌ ERREUR FATALE:');
    console.error(error.stack || error.message || String(error));
    console.error('');
    process.exit(1);
});
