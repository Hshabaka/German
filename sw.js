/* App-shell cache: page, code, session data, generated audio. Materials images are
   cached on first view (cache-on-read) so reading works offline after one visit. */
const CACHE = 'german-site-live20';
const CORE = ['./', './index.html', './css/style.css', './js/app.js', './js/gate.js', './lessons.html', './css/lessons.css', './js/lessons.js', './data/a1-index.json', './data/a1-pdfs.json', './materials.html', './data/session-1.json', './js/audio-1.js', './js/audio-2.js', './js/audio-3.js', './js/audio-4.js', './js/audio-5.js', './js/audio-6.js', './js/audio-7.js', './js/audio-8.js', './js/audio-9.js', './js/audio-10.js', './js/audio-11.js'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (/(video-urls|gate)\.json$/.test(url.pathname)) return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok && /\/(materials|audio|data|css|js)\//.test(url.pathname)) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    }))
  );
});
