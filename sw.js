/**
 * NexOS - Service Worker (sw.js)
 */

const CACHE_NAME = 'nexos-cache-v9';

const ASSETS_TO_CACHE = [
  './',
  './login.html',
  './manutencoes.html',
  './cadastros.html',
  './relatorios.html',
  './novo-relatorio.html',
  './novo-orcamento.html',
  './horas-extras.html',
  './configuracao.html',
  './admin.html',
  './style.css',
  './admin.js',
  './cadastros.js',
  './configuracao.js',
  './horas-extras.js',
  './login.js',
  './manutencoes.js',
  './relatorios.js',
  './global-modal.js',
  './firebase-init.js',
  './firebase-sync.js',
  './marca.png',
  './nexosico192.png',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

// Instalação resiliente (não trava se algum arquivo opcional falhar)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of ASSETS_TO_CACHE) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[SW] Ignorando asset na pré-instalação:', asset);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// Ativação e Limpeza de Caches Antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceção de Requisições (Network-First ignorando cache HTTP antigo)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const isSameOrigin = event.request.url.startsWith(self.location.origin);

  event.respondWith(
    fetch(isSameOrigin ? new Request(event.request, { cache: 'no-store' }) : event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
