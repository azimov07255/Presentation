// Offline ishlash: ilova fayllari keshlanadi. VERSION ni o‘zgartirsangiz, hamma qurilmada yangilanadi.
const VERSION = '0.1.0';
const CACHE = 'slaydo-' + VERSION;
const SHELL = ['./', 'index.html', 'css/app.css', 'manifest.webmanifest', 'vendor/pptxgen.bundle.js', 'icons/icon.svg',
  'js/app.js', 'js/util.js', 'js/themes.js', 'js/model.js', 'js/render.js', 'js/layouts.js', 'js/canvas.js', 'js/inspector.js',
  'js/rail.js', 'js/present.js', 'js/export.js', 'js/store.js', 'js/home.js', 'js/templates.js'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x.startsWith('slaydo-') && x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const sameOrigin = u.origin === location.origin, fonts = /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (!sameOrigin && !fonts) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => {
    const net = fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(CACHE).then(ch => ch.put(e.request, c)); } return r; }).catch(() => hit);
    return hit || net;   // keshdan darrov, orqada yangilab qo‘yamiz
  }));
});
