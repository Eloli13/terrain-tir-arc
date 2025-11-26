require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testLogin() {
    console.log('🔐 Test de connexion admin...\n');

    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'changez-moi-en-production'
            })
        });

        const contentType = response.headers.get('content-type');
        let data;

        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        console.log('Status:', response.status, response.statusText);
        console.log('Réponse:', JSON.stringify(data, null, 2));

        if (response.ok) {
            console.log('\n✅ Connexion réussie!');
            console.log('Token:', data.accessToken ? '***généré***' : 'non reçu');
        } else {
            console.log('\n❌ Échec de connexion');
            console.log('Erreur:', data.error || data);
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

testLogin();
