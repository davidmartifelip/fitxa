/* =================================================================
   🚀 DEPLOY CHECKLIST — llegir abans de fer push!
   -----------------------------------------------------------------
   Cada vegada que facis un deploy amb canvis de frontend:
   1. Incrementa CACHE més avall: 'fitxa-v2' → 'fitxa-v3' etc.
   2. El toast d'actualització apareixerà automàticament als usuaris.
   ================================================================= */

/* ─── Service Worker ─────────────────────────────────────────
   Caches all app files for offline use.
   Estratègia d'actualització: el SW nou espera un missatge
   SKIP_WAITING del client (botó "Actualitzar aplicació") per
   activar-se, evitant interrupcions a mig sessió.
   ─────────────────────────────────────────────────────────── */

// ─── Versió del caché ────────────────────────────────────────
// Incrementa aquest valor cada vegada que facis un deploy nou
// per invalidar el caché antic i forçar l'actualització.
const CACHE = 'fitxa-v2';

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
];

// ─── Install ─────────────────────────────────────────────────
// Pre-caché tots els assets. NO cridem skipWaiting() aquí:
// deixem que el toast del frontend decideixi quan activar-se.
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  // NO self.skipWaiting() aquí → el SW queda en "waiting"
  // fins que l'usuari prem "Actualitzar aplicació"
});

// ─── Activate ────────────────────────────────────────────────
// Un cop activat (per skipWaiting via missatge), elimina els
// cachés antics i pren el control de totes les pestanyes.
// NOTA: clients.claim() NO esborra LocalStorage ni IndexedDB.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Missatge SKIP_WAITING ───────────────────────────────────
// El frontend envia aquest missatge quan l'usuari prem el botó
// d'actualitzar. Llavors el SW s'activa immediatament.
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Fetch (Network-first per HTML, Cache-first per assets) ──
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Només gestiona peticions del mateix origen
  if (url.origin !== location.origin) {
    return;
  }

  // Network-first per a la pàgina principal (sempre fresca)
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache-first per a la resta d'assets estàtics
  e.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
