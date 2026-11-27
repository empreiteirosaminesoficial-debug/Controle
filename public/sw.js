/**
 * Service Worker com Arquitetura Google PWA & Offline Fallback Robusto
 * Empreiteiro Saminês
 */

const CACHE_NAME = 'samines-pwa-v7.0.0-logo-20261026';

// Arquivos estáticos essenciais pré-carregados para funcionamento offline e novos ícones
const PRECACHE_ASSETS = [
  '/',
  '/index.html?v=20261026',
  '/manifest.json?v=20261026',
  '/offline.html',
  '/logo.png?v=20261026',
  '/logo-transparent.png?v=20261026',
  '/logo-192.png?v=20261026',
  '/logo-maskable-192.png?v=20261026',
  '/logo-256.png?v=20261026',
  '/logo-384.png?v=20261026',
  '/logo-512.png?v=20261026',
  '/logo-maskable-512.png?v=20261026',
  '/apple-touch-icon.png?v=20261026',
  '/favicon.ico?v=20261026',
  '/favicon-16.png?v=20261026',
  '/favicon-32.png?v=20261026',
  '/favicon-48.png?v=20261026',
  '/favicon-128.png?v=20261026',
  '/screenshots/screenshot-desktop.png?v=20261026',
  '/screenshots/screenshot-mobile.png?v=20261026',
  '/caixa-registradora.mp3',
  '/door-knock.mp3'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log(`[Google PWA SW] Instalando versão limpa: ${CACHE_NAME}`);
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[Google PWA SW] Falha ao pré-carregar recursos secundários:', err);
      });
    })
  );
});

// Ativação do Service Worker e limpeza radical de TODOS os caches obsoletos
self.addEventListener('activate', (event) => {
  console.log(`[Google PWA SW] Ativando versão: ${CACHE_NAME}`);
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log(`[Google PWA SW] Purgando cache antigo: ${key}`);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_VERSION_CHANGED',
            version: CACHE_NAME,
            timestamp: Date.now()
          });
        });
      });
    })
  );
});

// Mensagens
self.addEventListener('message', (event) => {
  if (event.data) {
    if (event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    } else if (event.data.type === 'CHECK_VERSION') {
      event.ports[0]?.postMessage({ version: CACHE_NAME });
    }
  }
});

// Interceptação de requisições de rede (Fetch)
self.addEventListener('fetch', (event) => {
  // Ignora métodos não-GET ou esquemas não-http
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  const url = new URL(event.request.url);

  // Não intercepta chamadas externas ou APIs do Firebase / Google
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('generativelanguage.googleapis.com') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // 1. Google Fonts: Cache-First
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const res = await fetch(event.request);
          if (res.status === 200) {
            cache.put(event.request, res.clone());
          }
          return res;
        } catch {
          return cached || new Response('', { status: 408 });
        }
      })
    );
    return;
  }

  // 2. Navegação de páginas HTML (SPA): Sempre Network-First com fallback para cache/offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(async () => {
          console.warn('[Google PWA SW] Sem conexão, carregando fallback...');
          const cached = await caches.match(event.request);
          if (cached) return cached;

          const rootCached = await caches.match('/');
          if (rootCached) return rootCached;

          const indexCached = await caches.match('/index.html');
          if (indexCached) return indexCached;

          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) return offlinePage;

          return new Response('Página indisponível offline.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        })
    );
    return;
  }

  // 3. Demais recursos estáticos: Network-First com fallback para Cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return new Response('', { status: 404 });
      })
  );
});

// Notificações Push
self.addEventListener('push', (event) => {
  let data = {
    title: '💸 Manda o Pix! • Empreiteiro Saminês',
    body: 'Lembrete de acerto e conferência dos serviços realizados.',
    icon: '/logo-192.png',
    badge: '/logo-192.png',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/logo-192.png',
      badge: data.badge || '/logo-192.png',
      vibrate: [200, 100, 200, 100, 400],
      data: { url: '/' },
      actions: [
        { action: 'open', title: 'Abrir Aplicativo' },
        { action: 'close', title: 'Dispensar' }
      ]
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
