/* AlgoHand dashboard service worker: an honest offline page for navigations, a small cache for /assets/*, and Web
   Push notifications. Never caches the API (/portal/*, /v1/*), the support pages or anything with Authorization —
   the dashboard is live data. Bump VERSION with every change to sw.js or the offline page. */
const VERSION = 'v1';
const ASSETS = 'algohand-assets-' + VERSION;
const OFFLINE = '/offline.html';
const PRECACHE = [OFFLINE, '/assets/icon-192.png', '/assets/logo-mark.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(ASSETS).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== ASSETS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const p = url.pathname;
  if (p.startsWith('/portal/') || p.startsWith('/v1/') || p.startsWith('/support') || req.headers.has('Authorization')) return;   // live data: straight to the network
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));                    // network first, the offline page when there is none
    return;
  }
  if (p.startsWith('/assets/') || p === '/favicon.ico') {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(ASSETS).then(c => c.put(req, copy)); }
      return res;
    })));
  }
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  const opts = { body: d.body || '', icon: '/assets/icon-192.png', badge: '/assets/icon-192.png', data: { url: d.url || '/app' } };
  if (d.tag) opts.tag = d.tag;
  e.waitUntil(self.registration.showNotification(d.title || 'AlgoHand', opts));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/app';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { c.navigate(url); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
