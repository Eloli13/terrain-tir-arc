// Service Worker pour l'application Terrains de Tir à l'Arc
const CACHE_NAME = 'tir-arc-v1.0.1';
const STATIC_CACHE = 'tir-arc-static-v2';
const DYNAMIC_CACHE = 'tir-arc-dynamic-v2';

// Ressources à mettre en cache immédiatement
const STATIC_FILES = [
    '/',
    '/index.html',
    '/declaration.html',
    '/admin/index.html',
    '/css/style.css',
    '/js/logger.js',
    '/js/error-handler.js',
    '/js/storage-security.js',
    '/js/validators.js',
    '/js/app.js',
    '/js/database.js',
    '/js/declaration.js',
    '/js/qr-scanner.js',
    '/admin/admin.js',
    '/manifest.json',
    // Images
    '/images/icon-192.png',
    '/images/icon-512.png'
];

// Ressources externes (CDN)
const EXTERNAL_RESOURCES = [
    'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                // Forcer l'activation immédiate
                return self.skipWaiting();
            })
            .catch((error) => {
                // Erreur critique lors de la mise en cache
                console.error('[SW] Cache error:', error);
            })
    );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            // Nettoyer les anciens caches
            cleanupOldCaches(),
            // Prendre le contrôle de tous les clients
            self.clients.claim()
        ])
    );
});

// Nettoyage des anciens caches
async function cleanupOldCaches() {
    const cacheNames = await caches.keys();
    const oldCaches = cacheNames.filter(name =>
        name !== STATIC_CACHE &&
        name !== DYNAMIC_CACHE &&
        name.startsWith('tir-arc')
    );

    return Promise.all(
        oldCaches.map(cacheName => caches.delete(cacheName))
    );
}

// Interception des requêtes
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorer les requêtes non-HTTP
    if (!request.url.startsWith('http')) {
        return;
    }

    // Stratégie différente selon le type de ressource
    if (STATIC_FILES.includes(url.pathname) || url.pathname === '/') {
        // Ressources statiques: Cache First
        event.respondWith(cacheFirstStrategy(request));
    } else if (EXTERNAL_RESOURCES.some(resource => request.url.includes(resource))) {
        // Ressources externes: Stale While Revalidate
        event.respondWith(staleWhileRevalidateStrategy(request));
    } else if (request.destination === 'image') {
        // Images: Cache First avec fallback
        event.respondWith(imageStrategy(request));
    } else {
        // Autres ressources: Network First
        event.respondWith(networkFirstStrategy(request));
    }
});

// Stratégie Cache First (pour les ressources statiques)
async function cacheFirstStrategy(request) {
    try {
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        // Si pas en cache, récupérer du réseau et mettre en cache
        const networkResponse = await fetch(request);

        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;

    } catch (error) {
        console.error('[SW] Erreur Cache First:', error);

        // Fallback pour les pages HTML
        if (request.destination === 'document') {
            const fallbackResponse = await caches.match('/index.html');
            return fallbackResponse || new Response('Application hors ligne', {
                status: 503,
                statusText: 'Service Unavailable'
            });
        }

        throw error;
    }
}

// Stratégie Network First (pour les données dynamiques)
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);

        // Mettre en cache les réponses réussies (uniquement GET)
        if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;

    } catch (error) {
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        // Réponse d'erreur personnalisée
        return new Response(JSON.stringify({
            error: 'Connexion indisponible',
            message: 'Veuillez vérifier votre connexion Internet'
        }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}

// Stratégie Stale While Revalidate (pour les ressources externes)
async function staleWhileRevalidateStrategy(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);

    // Toujours essayer de récupérer la version la plus récente
    const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(() => cachedResponse);

    // Retourner immédiatement la version en cache si disponible
    return cachedResponse || fetchPromise;
}

// Stratégie pour les images
async function imageStrategy(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        const networkResponse = await fetch(request);

        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;

    } catch (error) {
        // Image de fallback pour les erreurs
        return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">' +
            '<rect width="200" height="200" fill="#f0f0f0"/>' +
            '<text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="14" fill="#999">Image indisponible</text>' +
            '</svg>',
            {
                headers: {
                    'Content-Type': 'image/svg+xml'
                }
            }
        );
    }
}

// Gestion des messages depuis l'application
self.addEventListener('message', (event) => {
    const { type, payload } = event.data;

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'GET_VERSION':
            event.ports[0].postMessage({
                version: CACHE_NAME,
                timestamp: new Date().toISOString()
            });
            break;

        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;

        case 'FORCE_UPDATE':
            forceUpdate().then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;

        default:
            // Type de message non reconnu
            break;
    }
});

// Nettoyer tous les caches
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
    );
}

// Forcer la mise à jour
async function forceUpdate() {
    await clearAllCaches();
    const cache = await caches.open(STATIC_CACHE);
    return cache.addAll(STATIC_FILES);
}

// Gestion des notifications push (pour une future extension)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();

        const options = {
            body: data.body,
            icon: '/images/icon-192.png',
            badge: '/images/icon-192.png',
            vibrate: [200, 100, 200],
            tag: 'tir-arc-notification',
            actions: [
                {
                    action: 'open',
                    title: 'Ouvrir l\'application'
                },
                {
                    action: 'dismiss',
                    title: 'Ignorer'
                }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'Terrains de Tir', options)
        );
    }
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Synchronisation en arrière-plan (pour les données hors ligne)
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        event.waitUntil(syncOfflineData());
    }
});

// Synchroniser les données hors ligne
async function syncOfflineData() {
    try {
        // Récupérer les données en attente de synchronisation
        const pendingData = await getStoredPendingData();

        if (pendingData.length > 0) {
            for (const item of pendingData) {
                try {
                    await syncDataItem(item);
                    await removeFromPendingData(item.id);
                } catch (error) {
                    // Erreur sync silencieuse (item sera retenté plus tard)
                }
            }
        }

    } catch (error) {
        // Erreur de synchronisation silencieuse
    }
}

// Récupérer les données en attente
async function getStoredPendingData() {
    // Ici, on récupérerait les données du IndexedDB ou localStorage
    // Pour l'instant, on retourne un tableau vide
    return [];
}

// Synchroniser un élément
async function syncDataItem(item) {
    const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(item)
    });

    if (!response.ok) {
        throw new Error('Sync failed');
    }

    return response.json();
}

// Supprimer un élément des données en attente
async function removeFromPendingData(itemId) {
    // Implémentation pour supprimer l'élément des données en attente
}