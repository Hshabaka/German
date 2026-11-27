(function () {
  var TOTAL = 28, KEY = 'german-site.lang';
  var T = {
    en: { home: 'Home', learning: 'Learning', deutsch: 'Deutsch', a1: 'A1', list: 'Lessons', playlist: 'Playlist', files: 'PDF files', prev: 'Previous', next: 'Next', exam: 'Exam practice', soon: 'Not available yet', menu: 'Quick navigation', lock: 'Lock 🔒', upd: 'Refresh ↻', lockA: 'Lock screen', updA: 'Refresh the site and clear its cached files', lang: 'Language', here: 'You are here' },
    ar: { home: 'الرئيسية', learning: 'التعلّم', deutsch: 'Deutsch', a1: 'A1', list: 'قايمة الدروس', playlist: 'بلاي ليست', files: 'ملفات PDF', prev: 'السابق', next: 'التالي', exam: 'تدريب الامتحان', soon: 'لسه ما اتضافش', menu: 'تنقل سريع', lock: 'قفل 🔒', upd: 'تحديث ↻', lockA: 'قفل الشاشة', updA: 'تحديث الموقع ومسح الملفات المخزنة', lang: 'اللغة', here: 'إنت هنا' }
  };
  function getLang() { try { return localStorage.getItem(KEY) === 'ar' ? 'ar' : 'en'; } catch (e) { return 'en'; } }
  var L = getLang();
  function page() {
    var p = location.pathname, m;
    if (/\/a1\/s28\/exam\/?(index\.html)?$/.test(p)) return { kind: 'exam' };
    if (/\/a1\/files\/?(index\.html)?$/.test(p)) return { kind: 'files' };
    if (/\/a1\/playlist\/?(index\.html)?$/.test(p)) return { kind: 'playlist' };
    if ((m = p.match(/\/a1\/s(\d\d)\/?(index\.html)?$/))) return { kind: 'lesson', n: parseInt(m[1], 10) };
    if (/\/a1\/(index\.html)?$/.test(p)) return { kind: 'list' };
    if (/\/learning\/deutsch\/?(index\.html)?$/.test(p)) return { kind: 'deutsch' };
    if (/\/learning\/?(index\.html)?$/.test(p)) return { kind: 'learning' };
    return { kind: 'home' };
  }
  var PG = page(), HUB = /^(home|learning|deutsch)$/.test(PG.kind);
  function href(n) { return 'a1/s' + (n < 10 ? '0' : '') + n + '/'; }
  function a(h, t) { var e = document.createElement('a'); e.href = h; e.textContent = t; return e; }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  var bar = el('nav', 'sn'); var qn = null;
  function dir() { return L === 'ar' ? 'rtl' : 'ltr'; }
  function drawBar() {
    var t = T[L], k = PG.kind; bar.textContent = ''; bar.setAttribute('dir', dir()); bar.setAttribute('aria-label', t.menu);
    var c = el('div', 'sn-c');
    if (HUB) {
      var items = [['home', './'], ['learning', 'learning/'], ['deutsch', 'learning/deutsch/']], depth = k === 'home' ? 1 : k === 'learning' ? 2 : 3;
      items.slice(0, depth).forEach(function (it, i) {
        if (i) c.appendChild(el('span', 'sn-s', ' › '));
        if (i === depth - 1) c.appendChild(el('strong', '', t[it[0]])); else c.appendChild(a(it[1], t[it[0]]));
      });
    } else {
      var lbl = k === 'lesson' ? 'A1-S' + (PG.n < 10 ? '0' : '') + PG.n : k === 'list' ? 'A1 · ' + t.list : k === 'playlist' ? 'A1 · ' + t.playlist : k === 'files' ? 'A1 · ' + t.files : 'A1-S28 · ' + t.exam;
      var s = el('strong', '', lbl); s.setAttribute('aria-current', 'page'); c.appendChild(s);
    }
    bar.appendChild(c);
    var acts = el('div', 'sn-a'), rtl = L === 'ar';
    if (k === 'home') {
      [['en', 'English'], ['ar', 'العربية']].forEach(function (x) {
        var b = el('button', 'sn-l', x[1]); b.type = 'button'; b.setAttribute('aria-pressed', L === x[0] ? 'true' : 'false'); b.setAttribute('aria-label', t.lang + ': ' + x[1]);
        b.addEventListener('click', function () { setLang(x[0]); }); acts.appendChild(b);
      });
    }
    if (k === 'lesson') {
      if (PG.n > 1) acts.appendChild(a(href(PG.n - 1), (rtl ? '→ ' : '← ') + t.prev));
      if (PG.n < TOTAL) acts.appendChild(a(href(PG.n + 1), t.next + (rtl ? ' ←' : ' →')));
    }
    if (k === 'lesson' && PG.n === 28) acts.appendChild(a('a1/s28/exam/', t.exam));
    if (k === 'list') { var pl = a('a1/playlist/', '🎧 ' + t.playlist); pl.className = 'sn-g'; acts.appendChild(pl); }
    if (k === 'lesson' || k === 'list') acts.appendChild(a('a1/files/', t.files));
    bar.appendChild(acts);
  }
  function drawQuick() {
    if (HUB) return; var t = T[L];
    if (!qn) {
      qn = el('aside', 'qn');
      document.body.appendChild(qn);
      document.addEventListener('click', function (e) { if (qn && !qn.contains(e.target)) qn.classList.remove('open'); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && qn) qn.classList.remove('open'); });
    }
    qn.textContent = ''; qn.setAttribute('dir', dir()); qn.setAttribute('aria-label', t.menu);
    var h = el('button', 'qn-h', '☰'); h.type = 'button'; h.setAttribute('aria-label', t.menu); h.setAttribute('aria-expanded', qn.classList.contains('open') ? 'true' : 'false');
    h.addEventListener('click', function () { var o = qn.classList.toggle('open'); h.setAttribute('aria-expanded', o ? 'true' : 'false'); });
    var p = el('div', 'qn-p');
    [['🏠', 'home', './'], ['📚', 'learning', 'learning/'], ['🇩🇪', 'deutsch', 'learning/deutsch/'], ['A1', 'a1', 'a1/', 1], ['A2', 'a2', null], ['B1', 'b1', null]].forEach(function (it) {
      var label = it[1] === 'a2' ? 'A2' : it[1] === 'b1' ? 'B1' : t[it[1]] || it[1];
      if (it[2]) {
        var l = a(it[2], ''); l.appendChild(el('b', '', it[0])); l.appendChild(el('span', '', label));
        if (it[3]) { l.className = 'cur'; l.setAttribute('aria-current', 'true'); } p.appendChild(l);
      } else {
        var d = el('div', 'off'); d.setAttribute('aria-disabled', 'true'); d.appendChild(el('b', '', it[0])); d.appendChild(el('span', '', label + ' · ' + t.soon)); p.appendChild(d);
      }
    });
    qn.appendChild(p); qn.appendChild(h);
  }
  function relabel() {
    var t = T[L], b = document.getElementById('lock-btn'), u = document.getElementById('upd-btn');
    if (b) { b.textContent = t.lock; b.setAttribute('aria-label', t.lockA); }
    if (u && !u.disabled) { u.textContent = t.upd; u.setAttribute('aria-label', t.updA); }
  }
  function applyHub() {
    if (!HUB) return;
    var d = document.documentElement; d.lang = L; d.dir = dir();
    Array.prototype.forEach.call(document.querySelectorAll('[data-en]'), function (n) { n.textContent = n.getAttribute('data-' + L); });
    var h1 = document.querySelector('h1'); document.title = (L === 'ar' ? 'تدريب الألماني: ' : 'German practice: ') + (h1 ? h1.textContent : '');
  }
  function setLang(l) { L = l; try { localStorage.setItem(KEY, l); } catch (e) {} render(); }
  function render() { applyHub(); drawBar(); drawQuick(); relabel(); }
  var st = document.createElement('style');
  st.textContent = '.sn{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;max-width:720px;margin:0 auto;padding:10px 12px;font-size:15px}.sn a,.sn .sn-l{display:inline-flex;align-items:center;min-height:44px;padding:6px 14px;border-radius:999px;background:#0f172a;color:#fff;text-decoration:none;border:0;font:inherit;cursor:pointer}.sn .sn-l{background:#e2e8f0;color:#0f172a}.sn .sn-l[aria-pressed=true]{background:#0f766e;color:#fff}.sn .sn-g{background:#0f766e}.sn-c{flex:1 1 100%;min-height:44px;display:flex;align-items:center;flex-wrap:wrap}.sn-c a{background:transparent;color:inherit;text-decoration:underline;padding:6px 0;min-height:44px}.sn-a{display:flex;gap:8px;flex-wrap:wrap}'
    + '@media(max-width:899px){.sn{padding-left:104px}body.has-sn #app{padding-bottom:96px}}@media(min-width:900px){body.has-sn{padding-top:64px}}'
    + '.qn{position:fixed;right:0;top:34%;z-index:60;display:flex;flex-direction:row;align-items:flex-start;direction:ltr}.qn[dir=rtl] .qn-p{direction:rtl}.qn-h{width:36px;min-height:48px;border:0;border-radius:12px 0 0 12px;background:#0f172a;color:#fff;font-size:18px;cursor:pointer;opacity:.88}.qn-p{display:none;flex-direction:column;gap:4px;padding:6px;background:#fff;border:1px solid #cbd5e1;border-radius:14px 0 0 14px;box-shadow:0 6px 24px rgba(15,23,42,.22);max-width:70vw}.qn.open .qn-p{display:flex}@media(hover:hover) and (pointer:fine){.qn:hover .qn-p{display:flex}}.qn-p a,.qn-p .off{display:flex;align-items:center;gap:10px;min-height:44px;padding:4px 12px;border-radius:10px;color:#0f172a;text-decoration:none;font-size:15px;white-space:nowrap}.qn-p a:hover,.qn-p a:focus{background:#e2e8f0}.qn-p a.cur{background:#0f766e;color:#fff}.qn-p b{min-width:28px;text-align:center}.qn-p .off{opacity:.5}';
  document.head.appendChild(st);
  function mount() { document.body.classList.add('has-sn'); document.body.insertBefore(bar, document.body.firstChild); render(); new MutationObserver(relabel).observe(document.body, { childList: true }); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
