/* Gridline offline cache: site works without internet (live alerts need internet). */
const V = 'gridline-v2';
const CORE = ['./', 'index.html', 'assets/css/fonts.css', 'assets/css/base.css?v=2', 'assets/css/site.css?v=2',
  'assets/js/motion.js', 'assets/js/supabase.js', 'assets/js/config.js?v=2', 'assets/js/fx.js?v=2', 'assets/js/alert.js?v=2',
  'assets/js/content.js?v=2', 'assets/js/steps.js?v=2', 'assets/js/site.js?v=2', 'assets/img/favicon.svg', 'assets/audio/gather.mp3', 'assets/audio/break.mp3', 'assets/audio/phones.mp3', 'assets/audio/custom.mp3',
  'assets/fonts/archivo-normal-100-900-latin.woff2', 'assets/fonts/archivo-normal-100-900-latin-ext.woff2',
  'assets/fonts/dm-mono-normal-400-latin.woff2', 'assets/fonts/dm-mono-normal-500-latin.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.endsWith('.mp4')) return;
  // network first, cache fallback (so updates show up immediately)
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
