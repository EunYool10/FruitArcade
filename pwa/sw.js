/* Service worker template — the build fills in the version and the file list (see vite.config.ts) */
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const APP_CACHE = `fruit-arcade-${VERSION}`;
const FONT_CACHE = 'fruit-arcade-fonts';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('fruit-arcade-') && k !== APP_CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Streak reminders from scripts/reminders: show the message, open the app when it's tapped
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'FRUIT ARCADE', {
      body: data.body || '오늘 한 판 해요!',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: data.tag || 'streak',
      lang: 'ko',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => w.url.startsWith(self.registration.scope));
      return open ? open.focus() : self.clients.openWindow(self.registration.scope);
    })
  );
});

// The page asks for this when the player taps "새로고침" on the update banner
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fonts: serve from cache, refresh in the background
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const fresh = fetch(req)
          .then((res) => {
            if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || fresh;
      })
    );
    return;
  }

  // Only this app's own files; Firebase and other APIs always go to the network
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;

  // Pages: network first so a new version shows up, cached copy when offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(APP_CACHE).then((cache) => cache.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./'))
    );
    return;
  }

  // Build assets (hashed names): cache first
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(APP_CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
    )
  );
});
