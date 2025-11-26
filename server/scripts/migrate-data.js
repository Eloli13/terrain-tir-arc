#!/usr/bin/env node

/**
 * Script de migration des données depuis localStorage vers PostgreSQL
 * Usage: node scripts/migrate-data.js [--source=file.json] [--dry-run]
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const logger = require('../utils/logger');
const { authManager } = require('../middleware/auth');

class DataMigrator {
    constructor() {
        this.client = null;
        this.dryRun = false;
        this.stats = {
            sessions: { migrated: 0, skipped: 0, errors: 0 },
            incidents: { migrated: 0, skipped: 0, errors: 0 },
            configuration: { migrated: 0, skipped: 0, errors: 0 }
        };
    }

    async connect() {
        this.client = new Client({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'terrain_tir_arc'
        });

        await this.client.connect();
        console.log('✅ Connexion à la base de données établie');
    }

    async disconnect() {
        if (this.client) {
            await this.client.end();
            console.log('✅ Connexion à la base de données fermée');
        }
    }

    /**
     * Charge les données depuis un fichier JSON ou depuis les données d'exemple
     */
    loadSourceData(sourceFile) {
        let data;

        if (sourceFile && fs.existsSync(sourceFile)) {
            console.log(`📂 Chargement des données depuis: ${sourceFile}`);
            const fileContent = fs.readFileSync(sourceFile, 'utf8');
            data = JSON.parse(fileContent);
        } else {
            console.log('📂 Utilisation des données d\'exemple localStorage');
            data = this.getExampleLocalStorageData();
        }

        this.validateSourceData(data);
        return data;
    }

    /**
     * Données d'exemple au format localStorage pour la démonstration
     */
    getExampleLocalStorageData() {
        return {
            sessions: [
                {
                    id: 1640995200000,
                    nom: "Martin",
                    prenom: "Jean",
                    type_tireur: "intermediaire",
                    nombre_tireurs: 2,
                    terrain: "interieur",
                    date_debut: "2024-01-01T10:00:00.000Z",
                    date_fin: "2024-01-01T12:00:00.000Z",
                    active: false
                },
                {
                    id: 1640995400000,
                    nom: "Dubois",
                    prenom: "Marie",
                    type_tireur: "avance",
                    nombre_tireurs: 1,
                    terrain: "exterieur",
                    date_debut: "2024-01-01T14:00:00.000Z",
                    date_fin: null,
                    active: true
                }
            ],
            incidents: [
                {
                    id: 1640995600000,
                    type_incident: "Équipement défaillant",
                    description: "Cible endommagée sur le terrain intérieur, position 3",
                    photo_path: null,
                    terrain: "interieur",
                    date_incident: "2024-01-01T16:00:00.000Z",
                    statut: "resolu",
                    resolution_notes: "Cible remplacée",
                    date_resolution: "2024-01-02T09:00:00.000Z"
                }
            ],
            configuration: {
                telephone_responsable: "0145678900",
                email_incidents: "incidents@exemple-club.fr",
                qr_code_data: "TERRAIN_ACCESS_2024",
                admin_password: "sha256_hash_example" // Sera ignoré lors de la migration
            }
        };
    }

    /**
     * Valide la structure des données source
     */
    validateSourceData(data) {
        const required = ['sessions', 'incidents', 'configuration'];

        for (const key of required) {
            if (!(key in data)) {
                throw new Error(`Données manquantes: ${key}`);
            }
        }

        if (!Array.isArray(data.sessions)) {
            throw new Error('sessions doit être un tableau');
        }

        if (!Array.isArray(data.incidents)) {
            throw new Error('incidents doit être un tableau');
        }

        if (typeof data.configuration !== 'object') {
            throw new Error('configuration doit être un objet');
        }

        console.log(`✅ Données validées: ${data.sessions.length} sessions, ${data.incidents.length} incidents`);
    }

    /**
     * Trouve ou crée un utilisateur administrateur pour l'attribution
     */
    async getOrCreateMigrationAdmin() {
        // Chercher un admin existant
        const existingAdmin = await this.client.query(`
            SELECT id FROM admin_users WHERE username = 'admin' LIMIT 1
        `);

        if (existingAdmin.rows.length > 0) {
            return existingAdmin.rows[0].id;
        }

        // Créer un admin pour la migration si aucun n'existe
        const salt = authManager.generateSalt();
        const { hash } = await authManager.hashPassword('migration-admin-temp', salt);

        const result = await this.client.query(`
            INSERT INTO admin_users (username, email, password_hash, salt)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `, ['migration-admin', 'migration@system.local', hash, salt]);

        console.log('🔧 Utilisateur administrateur de migration créé');
        return result.rows[0].id;
    }

    /**
     * Migre les sessions de tir
     */
    async migrateSessions(sessions, adminUserId) {
        console.log(`\n📊 Migration de ${sessions.length} sessions...`);

        for (const session of sessions) {
            try {
                // Validation des données de session
                if (!session.nom || !session.prenom || !session.terrain) {
                    this.stats.sessions.skipped++;
                    console.log(`⚠️  Session ${session.id} ignorée: données manquantes`);
                    continue;
                }

                // Nettoyer et valider les types
                const cleanSession = {
                    nom: String(session.nom).trim(),
                    prenom: String(session.prenom).trim(),
                    type_tireur: session.type_tireur || 'intermediaire',
                    nombre_tireurs: parseInt(session.nombre_tireurs) || 1,
                    terrain: session.terrain,
                    date_debut: session.date_debut ? new Date(session.date_debut) : new Date(),
                    date_fin: session.date_fin ? new Date(session.date_fin) : null,
                    active: Boolean(session.active !== false),
                    created_by: adminUserId
                };

                // Vérifier si la session existe déjà (basé sur nom, prénom, date)
                const existing = await this.client.query(`
                    SELECT id FROM sessions
                    WHERE nom = $1 AND prenom = $2 AND date_debut = $3
                `, [cleanSession.nom, cleanSession.prenom, cleanSession.date_debut]);

                if (existing.rows.length > 0) {
                    this.stats.sessions.skipped++;
                    console.log(`ℹ️  Session ${session.id} existe déjà`);
                    continue;
                }

                if (!this.dryRun) {
                    await this.client.query(`
                        INSERT INTO sessions (nom, prenom, type_tireur, nombre_tireurs, terrain, date_debut, date_fin, active, created_by)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    `, [
                        cleanSession.nom,
                        cleanSession.prenom,
                        cleanSession.type_tireur,
                        cleanSession.nombre_tireurs,
                        cleanSession.terrain,
                        cleanSession.date_debut,
                        cleanSession.date_fin,
                        cleanSession.active,
                        cleanSession.created_by
                    ]);
                }

                this.stats.sessions.migrated++;
                console.log(`✅ Session migrée: ${cleanSession.nom} ${cleanSession.prenom} (${cleanSession.terrain})`);

            } catch (error) {
                this.stats.sessions.errors++;
                console.error(`❌ Erreur session ${session.id}:`, error.message);
                logger.error('Erreur migration session', { session, error: error.message });
            }
        }
    }

    /**
     * Migre les incidents
     */
    async migrateIncidents(incidents, adminUserId) {
        console.log(`\n🚨 Migration de ${incidents.length} incidents...`);

        for (const incident of incidents) {
            try {
                // Validation des données d'incident
                if (!incident.type_incident || !incident.description || !incident.terrain) {
                    this.stats.incidents.skipped++;
                    console.log(`⚠️  Incident ${incident.id} ignoré: données manquantes`);
                    continue;
                }

                // Nettoyer et valider les données
                const cleanIncident = {
                    type_incident: String(incident.type_incident).trim(),
                    description: String(incident.description).trim(),
                    terrain: incident.terrain,
                    photo_path: incident.photo_path || null,
                    date_incident: incident.date_incident ? new Date(incident.date_incident) : new Date(),
                    statut: incident.statut || 'en_attente',
                    resolution_notes: incident.resolution_notes || null,
                    date_resolution: incident.date_resolution ? new Date(incident.date_resolution) : null,
                    created_by: adminUserId,
                    resolved_by: incident.statut === 'resolu' ? adminUserId : null
                };

                // Vérifier si l'incident existe déjà
                const existing = await this.client.query(`
                    SELECT id FROM incidents
                    WHERE type_incident = $1 AND description = $2 AND date_incident = $3
                `, [cleanIncident.type_incident, cleanIncident.description, cleanIncident.date_incident]);

                if (existing.rows.length > 0) {
                    this.stats.incidents.skipped++;
                    console.log(`ℹ️  Incident ${incident.id} existe déjà`);
                    continue;
                }

                if (!this.dryRun) {
                    await this.client.query(`
                        INSERT INTO incidents (type_incident, description, terrain, photo_path, date_incident, statut, resolution_notes, date_resolution, created_by, resolved_by)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    `, [
                        cleanIncident.type_incident,
                        cleanIncident.description,
                        cleanIncident.terrain,
                        cleanIncident.photo_path,
                        cleanIncident.date_incident,
                        cleanIncident.statut,
                        cleanIncident.resolution_notes,
                        cleanIncident.date_resolution,
                        cleanIncident.created_by,
                        cleanIncident.resolved_by
                    ]);
                }

                this.stats.incidents.migrated++;
                console.log(`✅ Incident migré: ${cleanIncident.type_incident} (${cleanIncident.terrain})`);

            } catch (error) {
                this.stats.incidents.errors++;
                console.error(`❌ Erreur incident ${incident.id}:`, error.message);
                logger.error('Erreur migration incident', { incident, error: error.message });
            }
        }
    }

    /**
     * Migre la configuration
     */
    async migrateConfiguration(configuration) {
        console.log(`\n⚙️  Migration de la configuration...`);

        // Ignorer certaines clés sensibles ou obsolètes
        const ignoredKeys = ['admin_password'];

        for (const [key, value] of Object.entries(configuration)) {
            try {
                if (ignoredKeys.includes(key)) {
                    console.log(`⚠️  Configuration '${key}' ignorée (sécurité)`);
                    continue;
                }

                if (!value || String(value).trim() === '') {
                    this.stats.configuration.skipped++;
                    console.log(`⚠️  Configuration '${key}' ignorée: valeur vide`);
                    continue;
                }

                // Vérifier si la configuration existe déjà
                const existing = await this.client.query(`
                    SELECT value FROM configuration WHERE key = $1
                `, [key]);

                if (existing.rows.length > 0 && existing.rows[0].value === String(value)) {
                    this.stats.configuration.skipped++;
                    console.log(`ℹ️  Configuration '${key}' identique`);
                    continue;
                }

                if (!this.dryRun) {
                    await this.client.query(`
                        INSERT INTO configuration (key, value, description)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (key)
                        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
                    `, [key, String(value), `Configuration migrée depuis localStorage`]);
                }

                this.stats.configuration.migrated++;
                console.log(`✅ Configuration migrée: ${key} = ${String(value).substring(0, 50)}${String(value).length > 50 ? '...' : ''}`);

            } catch (error) {
                this.stats.configuration.errors++;
                console.error(`❌ Erreur configuration '${key}':`, error.message);
                logger.error('Erreur migration configuration', { key, value, error: error.message });
            }
        }
    }

    /**
     * Exécute la migration complète
     */
    async migrate(sourceFile, dryRun = false) {
        this.dryRun = dryRun;

        console.log('🚀 Début de la migration des données...');
        console.log(`Mode: ${dryRun ? 'Simulation (dry-run)' : 'Migration réelle'}\n`);

        try {
            await this.connect();

            // Charger les données source
            const data = this.loadSourceData(sourceFile);

            // Obtenir un utilisateur admin pour l'attribution
            const adminUserId = await this.getOrCreateMigrationAdmin();

            // Démarrer une transaction pour l'intégrité des données
            if (!this.dryRun) {
                await this.client.query('BEGIN');
            }

            // Migrer les données
            await this.migrateSessions(data.sessions, adminUserId);
            await this.migrateIncidents(data.incidents, adminUserId);
            await this.migrateConfiguration(data.configuration);

            // Valider la transaction
            if (!this.dryRun) {
                await this.client.query('COMMIT');
            }

            this.printSummary();

        } catch (error) {
            console.error('❌ Erreur lors de la migration:', error.message);

            if (!this.dryRun) {
                await this.client.query('ROLLBACK');
                console.log('🔄 Transaction annulée');
            }

            throw error;

        } finally {
            await this.disconnect();
        }
    }

    /**
     * Affiche un résumé de la migration
     */
    printSummary() {
        console.log('\n📊 Résumé de la migration:');
        console.log('═══════════════════════════');

        const totalMigrated = this.stats.sessions.migrated + this.stats.incidents.migrated + this.stats.configuration.migrated;
        const totalSkipped = this.stats.sessions.skipped + this.stats.incidents.skipped + this.stats.configuration.skipped;
        const totalErrors = this.stats.sessions.errors + this.stats.incidents.errors + this.stats.configuration.errors;

        console.log(`Sessions:       ${this.stats.sessions.migrated} migrées, ${this.stats.sessions.skipped} ignorées, ${this.stats.sessions.errors} erreurs`);
        console.log(`Incidents:      ${this.stats.incidents.migrated} migrés, ${this.stats.incidents.skipped} ignorés, ${this.stats.incidents.errors} erreurs`);
        console.log(`Configuration:  ${this.stats.configuration.migrated} migrées, ${this.stats.configuration.skipped} ignorées, ${this.stats.configuration.errors} erreurs`);
        console.log('───────────────────────────');
        console.log(`TOTAL:          ${totalMigrated} migrées, ${totalSkipped} ignorées, ${totalErrors} erreurs`);

        if (this.dryRun) {
            console.log('\n⚠️  SIMULATION: Aucune donnée n\'a été réellement migrée');
        } else if (totalErrors === 0) {
            console.log('\n🎉 Migration terminée avec succès !');
        } else {
            console.log('\n⚠️  Migration terminée avec des erreurs. Consultez les logs pour plus de détails.');
        }
    }

    /**
     * Exporte les données actuelles de la base vers un fichier JSON
     */
    async exportData(outputFile) {
        console.log('📤 Export des données actuelles...');

        try {
            await this.connect();

            // Récupérer toutes les données
            const sessionsResult = await this.client.query(`
                SELECT * FROM sessions ORDER BY created_at DESC
            `);

            const incidentsResult = await this.client.query(`
                SELECT * FROM incidents ORDER BY created_at DESC
            `);

            const configResult = await this.client.query(`
                SELECT key, value, description FROM configuration ORDER BY key
            `);

            // Formater les données
            const exportData = {
                export_date: new Date().toISOString(),
                sessions: sessionsResult.rows,
                incidents: incidentsResult.rows,
                configuration: {}
            };

            // Convertir la configuration en objet
            configResult.rows.forEach(row => {
                exportData.configuration[row.key] = row.value;
            });

            // Écrire le fichier
            fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2));

            console.log(`✅ Export terminé: ${outputFile}`);
            console.log(`   Sessions: ${exportData.sessions.length}`);
            console.log(`   Incidents: ${exportData.incidents.length}`);
            console.log(`   Configuration: ${Object.keys(exportData.configuration).length} clés`);

        } finally {
            await this.disconnect();
        }
    }
}

// Interface en ligne de commande
async function main() {
    const args = process.argv.slice(2);
    const migrator = new DataMigrator();

    try {
        // Parsing des arguments
        let sourceFile = null;
        let dryRun = false;
        let exportMode = false;
        let outputFile = null;

        for (const arg of args) {
            if (arg.startsWith('--source=')) {
                sourceFile = arg.split('=')[1];
            } else if (arg === '--dry-run') {
                dryRun = true;
            } else if (arg === '--export') {
                exportMode = true;
            } else if (arg.startsWith('--output=')) {
                outputFile = arg.split('=')[1];
            }
        }

        if (exportMode) {
            outputFile = outputFile || `export-${Date.now()}.json`;
            await migrator.exportData(outputFile);
        } else {
            await migrator.migrate(sourceFile, dryRun);
        }

    } catch (error) {
        console.error('💥 Erreur fatale:', error.message);
        logger.error('Migration failed', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { DataMigrator };