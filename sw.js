/* App-shell cache: page, code, session data, generated audio. Materials images are
   cached on first view (cache-on-read) so reading works offline after one visit. */
const CACHE = 'german-site-live56';
const CORE = ['./', './index.html', './css/style.css', './js/app.js', './js/gate.js', './js/sitenav.js', './lessons.html', './a1/', './a1/files/', './a1/playlist/', './learning/', './learning/deutsch/', './js/playlist.js', './a1/s01/', './a1/s02/', './a1/s03/', './a1/s04/', './a1/s05/', './a1/s06/', './a1/s07/', './a1/s08/', './a1/s09/', './a1/s10/', './a1/s11/', './a1/s12/', './a1/s13/', './a1/s14/', './a1/s15/', './a1/s16/', './a1/s17/', './a1/s18/', './a1/s19/', './a1/s20/', './a1/s21/', './a1/s22/', './a1/s23/', './a1/s24/', './a1/s25/', './a1/s26/', './a1/s27/', './a1/s28/', './js/base.js', './js/legacy.js', './home.html', './css/lessons.css', './js/lessons.js', './js/practice.js', './data/a1-index.json', './data/a1-pdfs.json', './data/a1-teach.json', './materials.html', './data/session-1.json', './data/session-2.json', './js/audio-1.js', './js/audio-2.js', './js/audio-3.js', './js/audio-4.js', './js/audio-5.js', './js/audio-6.js', './js/audio-7.js', './js/audio-8.js', './js/audio-9.js', './js/audio-10.js', './js/audio-11.js', './data/session-3.json', './data/audio.json', './js/sitenav.js', './js/audio-s2-1.js', './js/audio-s2-2.js', './js/audio-s2-3.js', './js/audio-s2-4.js', './js/audio-s2-5.js', './js/audio-s2-6.js', './js/audio-s3-1.js', './js/audio-s3-2.js', './js/audio-s3-3.js', './js/audio-s3-4.js', './js/audio-s3-5.js', './js/audio-s3-6.js', './js/audio-s3-7.js', './js/audio-s3-8.js', './js/audio-s3-9.js', './js/audio-s3-10.js', './js/audio-s3-11.js', './js/audio-s3-12.js'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => {
    return Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))).then(() => self.clients.claim());
  }));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (/(video-urls|gate)\.json$/.test(url.pathname)) return;
  if (/\/audio\/a1\//.test(url.pathname) || e.request.headers.has('range')) return;
  const cacheFirst = /\/materials\//.test(url.pathname);
  const put = (res) => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return res; };
  e.respondWith(cacheFirst
    ? caches.match(e.request).then((hit) => hit || fetch(e.request).then(put))
    : fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }).then(put).catch(() => caches.match(e.request).then((hit) => hit || caches.match(e.request, { ignoreSearch: true })))
  );
});
