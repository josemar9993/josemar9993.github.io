// Service Worker — Fit com Estilo
// PWA: site instalável + cache offline
// v2: cache-first para assets estáticos (melhora PageSpeed/Cache score)

const CACHE_NAME = 'fitcomestilo-v2';
const OFFLINE_URL = '/';

// Regex para assets estáticos do próprio domínio
const STATIC_RE = /\.(webp|jpg|jpeg|png|svg|gif|ico|woff2|woff|ttf|css)(\?.*)?$/i;

// Arquivos essenciais para cache no install
const PRECACHE_URLS = [
  '/',
  '/logo.webp',
  '/favicon.ico',
  '/favicon-192.png',
  '/favicon-512.png',
  '/manifest.json',
  '/img-achadinhos.svg',
  '/img-shopee.webp',
  '/img-acessorios.webp',
  '/img-skincare.webp',
  '/img-tv.webp',
  '/img-hotmart1.webp',
  '/img-hotmart2.webp',
  '/img-hotmart3.webp'
];

// Instalar — cachear arquivos essenciais
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS.map(url => new Request(url, {cache: 'reload'}))))
      .then(() => self.skipWaiting())
  );
});

// Ativar — limpar caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — estratégia dupla:
//   Assets estáticos próprios → Cache First (resposta imediata + revalidação bg)
//   HTML / APIs              → Network First (sempre fresco, fallback cache)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isOwnOrigin = url.origin === self.location.origin;
  const isStaticAsset = isOwnOrigin && STATIC_RE.test(url.pathname);

  if (isStaticAsset) {
    // Cache First: serve do cache imediatamente, atualiza em background
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const networkFetch = fetch(event.request).then(response => {
            if (response.status === 200) cache.put(event.request, response.clone());
            return response;
          }).catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // Network First para HTML e chamadas dinâmicas
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.status === 200 && isOwnOrigin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(cached => cached || caches.match(OFFLINE_URL))
      )
  );
});
