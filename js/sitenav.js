(function () {
  var TOTAL = 28;
  function page() {
    var p = location.pathname;
    if (/materials\.html$/.test(p)) return { kind: 'files' };
    if (/lessons\.html$/.test(p)) { var n = parseInt(location.hash.slice(1), 10); return n >= 2 ? { kind: 'lesson', n: n } : { kind: 'home' }; }
    return { kind: 'lesson', n: 1 };
  }
  function href(n) { return n === 1 ? 'index.html' : 'lessons.html#' + n; }
  function a(h, t, c) { var e = document.createElement('a'); e.href = h; e.textContent = t; if (c) e.className = c; return e; }
  var bar = document.createElement('nav'); bar.className = 'sn'; bar.setAttribute('aria-label', 'التنقل في الكورس');
  function draw() {
    var pg = page(); bar.textContent = '';
    var crumbs = document.createElement('div'); crumbs.className = 'sn-c';
    if (pg.kind === 'home') { var s = document.createElement('strong'); s.textContent = 'الكورس › A1: كل الدروس'; crumbs.appendChild(s); }
    else {
      crumbs.appendChild(a('lessons.html', 'كل الدروس'));
      var m = document.createElement('span'); m.textContent = ' › ' + (pg.kind === 'files' ? 'ملفات A1' : 'الدرس ' + pg.n); crumbs.appendChild(m);
    }
    bar.appendChild(crumbs);
    var acts = document.createElement('div'); acts.className = 'sn-a';
    if (pg.kind === 'lesson') {
      if (pg.n > 1) acts.appendChild(a(href(pg.n - 1), '→ السابق'));
      if (pg.n < TOTAL) acts.appendChild(a(href(pg.n + 1), 'التالي ←'));
    }
    if (pg.kind !== 'files') acts.appendChild(a('materials.html', 'ملفات PDF'));
    bar.appendChild(acts);
  }
  draw(); window.addEventListener('hashchange', draw);
  var st = document.createElement('style');
  st.textContent = '.sn{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;max-width:720px;margin:0 auto;padding:10px 12px;font-size:15px}.sn a{display:inline-flex;align-items:center;min-height:44px;padding:6px 14px;border-radius:999px;background:#0f172a;color:#fff;text-decoration:none}.sn-c{flex:1 1 100%;padding-inline-end:0;min-height:44px;display:flex;align-items:center}.sn-c a{background:transparent;color:inherit;text-decoration:underline;padding:6px 0}.sn-a{display:flex;gap:8px;flex-wrap:wrap}@media(max-width:899px){body.has-sn #app{padding-bottom:96px}}@media(min-width:900px){body.has-sn{padding-top:64px}}';
  document.head.appendChild(st);
  function mount() { document.body.classList.add('has-sn'); document.body.insertBefore(bar, document.body.firstChild); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
