(function () {
  var TOTAL = 28;
  function page() {
    var p = location.pathname, m;
    if (/\/a1\/files\/?$/.test(p)) return { kind: 'files' };
    if (/\/a1\/playlist\/?(index\.html)?$/.test(p)) return { kind: 'playlist' };
    if ((m = p.match(/\/a1\/s(\d\d)\/?$/))) return { kind: 'lesson', n: parseInt(m[1], 10) };
    if (/\/a1\/(index\.html)?$/.test(p)) return { kind: 'list' };
    if (/\/learning\/deutsch\/?(index\.html)?$/.test(p)) return { kind: 'deutsch' };
    if (/\/learning\/?(index\.html)?$/.test(p)) return { kind: 'learning' };
    return { kind: 'home' };
  }
  function href(n) { return 'a1/s' + (n < 10 ? '0' : '') + n + '/'; }
  function a(h, t, c) { var e = document.createElement('a'); e.href = h; e.textContent = t; if (c) e.className = c; return e; }
  var bar = document.createElement('nav'); bar.className = 'sn'; bar.setAttribute('aria-label', 'التنقل في الكورس');
  function draw() {
    var pg = page(); bar.textContent = '';
    var crumbs = document.createElement('div'); crumbs.className = 'sn-c';
    var items = [['الرئيسية', './'], ['التعلّم', 'learning/'], ['Deutsch', 'learning/deutsch/'], ['A1', 'a1/']], k = pg.kind;
    var depth = k === 'home' ? 1 : k === 'learning' ? 2 : k === 'deutsch' ? 3 : 4;
    var last = k === 'list' ? 'قايمة الدروس' : k === 'playlist' ? 'بلاي ليست' : k === 'files' ? 'ملفات' : k === 'lesson' ? 'A1-S' + (pg.n < 10 ? '0' : '') + pg.n : null;
    items.slice(0, depth).forEach(function (it, i) {
      if (i) { var sp = document.createElement('span'); sp.textContent = ' › '; crumbs.appendChild(sp); }
      if (i === depth - 1 && !last) { var st = document.createElement('strong'); st.textContent = it[0]; crumbs.appendChild(st); }
      else crumbs.appendChild(a(it[1], it[0]));
    });
    if (last) { var sp2 = document.createElement('span'); sp2.textContent = ' › ' + last; crumbs.appendChild(sp2); }
    bar.appendChild(crumbs);
    var acts = document.createElement('div'); acts.className = 'sn-a';
    if (pg.kind === 'lesson') {
      if (pg.n > 1) acts.appendChild(a(href(pg.n - 1), '→ السابق'));
      if (pg.n < TOTAL) acts.appendChild(a(href(pg.n + 1), 'التالي ←'));
    }
    if (pg.kind === 'lesson' && pg.n === 28) acts.appendChild(a('a1/s28/exam/', 'تدريب الامتحان'));
    if (pg.kind === 'list') { var pl = a('a1/playlist/', '🎧 بلاي ليست'); pl.style.background = '#0f766e'; pl.style.color = '#fff'; acts.appendChild(pl); }
    if (pg.kind === 'lesson' || pg.kind === 'list') acts.appendChild(a('a1/files/', 'ملفات PDF'));
    bar.appendChild(acts);
  }
  draw(); window.addEventListener('hashchange', draw);
  var st = document.createElement('style');
  st.textContent = '.sn{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;max-width:720px;margin:0 auto;padding:10px 12px;font-size:15px}.sn a{display:inline-flex;align-items:center;min-height:44px;padding:6px 14px;border-radius:999px;background:#0f172a;color:#fff;text-decoration:none}.sn-c{flex:1 1 100%;padding-inline-end:0;min-height:44px;display:flex;align-items:center}.sn-c a{background:transparent;color:inherit;text-decoration:underline;padding:6px 0}.sn-a{display:flex;gap:8px;flex-wrap:wrap}@media(max-width:899px){body.has-sn #app{padding-bottom:96px}}@media(min-width:900px){body.has-sn{padding-top:64px}}';
  document.head.appendChild(st);
  function mount() { document.body.classList.add('has-sn'); document.body.insertBefore(bar, document.body.firstChild); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
