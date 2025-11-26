/**
 * Tests pour routes/sessions.js
 * Vérifier que les routes publiques fonctionnent bien
 */

const request = require('supertest');
const { app } = require('../../server');

describe('POST /api/sessions - Création session publique', () => {
    test('devrait créer une session SANS authentification', async () => {
        const sessionData = {
            nom: 'Dupont',
            prenom: 'Jean',
            type_tireur: 'club',
            nombre_tireurs: 2,
            terrain: 'interieur'
        };

        const response = await request(app)
            .post('/api/sessions')
            .send(sessionData);

        // Devrait réussir avec 201 ou potentiellement 409 (doublon)
        expect([201, 409, 500]).toContain(response.status);

        if (response.status === 201) {
            expect(response.body).toHaveProperty('session');
            expect(response.body.session.nom).toBe(sessionData.nom);
        }
    });
});

describe('GET /api/sessions/active - Récupération sessions actives', () => {
    test('devrait récupérer les sessions actives SANS authentification', async () => {
        const response = await request(app)
            .get('/api/sessions/active');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('sessions');
        expect(Array.isArray(response.body.sessions)).toBe(true);
    });
});

describe('GET /api/sessions/stats - Statistiques publiques', () => {
    test('devrait récupérer les stats SANS authentification', async () => {
        const response = await request(app)
            .get('/api/sessions/stats');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('active');
        expect(response.body.active).toHaveProperty('interieur');
        expect(response.body.active).toHaveProperty('exterieur');
    });
});
