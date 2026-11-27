(function () {
  var TOTAL = 28, KEY = 'german-site.lang';
  var T = {
    en: { home: 'Home', learning: 'Learning', deutsch: 'Deutsch', level: 'Level', lessons: 'Lessons', playlist: 'Playlist', files: 'PDF files', prev: 'Previous', next: 'Next', exam: 'Exam practice', soon: 'not available yet', menu: 'Menu', lock: 'Lock', upd: 'Refresh site', lang: 'العربية', langA: 'Switch to Arabic', n28: '28 lessons', site: 'Site navigation' },
    ar: { home: 'الرئيسية', learning: 'التعلّم', deutsch: 'Deutsch', level: 'المستوى', lessons: 'قايمة الدروس', playlist: 'بلاي ليست', files: 'ملفات PDF', prev: 'السابق', next: 'التالي', exam: 'تدريب الامتحان', soon: 'لسه ما اتضافش', menu: 'القائمة', lock: 'قفل', upd: 'تحديث الموقع', lang: 'EN', langA: 'التبديل للإنجليزي', n28: '28 درس', site: 'التنقل في الموقع' }
  };
  var I = {
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    home: '<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',
    book: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19a2 2 0 002 2h13"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
    play: '<path d="M4 14v-2a8 8 0 0116 0v2M4 14h3v5H4zM17 14h3v5h-3z"/>',
    file: '<path d="M7 3h7l5 5v13H7zM14 3v5h5"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    refresh: '<path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'
  };
  function icon(n) { var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '22'); s.setAttribute('height', '22'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = I[n]; return s; }
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
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function a(h, t, cls) { var e = el('a', cls, t); e.href = h; return e; }
  function dir() { return L === 'ar' ? 'rtl' : 'ltr'; }
  var hdr = el('header', 'hdr'), sub = el('nav', 'sn'), panel = null, menuBtn = null, lockB, updB;
  function ibtn(name, label, fn) { var b = el('button', 'hb'); b.type = 'button'; b.setAttribute('aria-label', label); b.title = label; b.appendChild(icon(name)); b.addEventListener('click', fn); return b; }
  function proxy(id) { return function () { var o = document.getElementById(id); if (o) o.click(); }; }
  function title() {
    var t = T[L], k = PG.kind, s = '';
    if (k === 'home') s = t.home; else if (k === 'learning') s = t.learning; else if (k === 'deutsch') s = t.deutsch;
    else if (k === 'lesson') s = 'A1 · S' + (PG.n < 10 ? '0' : '') + PG.n; else if (k === 'list') s = 'A1 · ' + t.lessons;
    else if (k === 'playlist') s = 'A1 · ' + t.playlist; else if (k === 'files') s = 'A1 · ' + t.files; else s = 'A1 · S28 · ' + t.exam;
    return s;
  }
  function drawHeader() {
    var t = T[L]; hdr.textContent = ''; hdr.setAttribute('dir', dir());
    menuBtn = ibtn('menu', t.menu, function (e) { e.stopPropagation(); toggle(); }); menuBtn.setAttribute('aria-haspopup', 'true'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.className += ' hb-m';
    hdr.appendChild(menuBtn);
    var ti = el('div', 'ht', title()); ti.setAttribute('aria-current', 'page'); hdr.appendChild(ti);
    var lb = el('button', 'hb hb-l'); lb.type = 'button'; lb.setAttribute('aria-label', t.langA); lb.title = t.langA; lb.appendChild(icon('globe')); lb.appendChild(el('span', '', t.lang)); lb.addEventListener('click', function () { setLang(L === 'ar' ? 'en' : 'ar'); }); hdr.appendChild(lb);
    updB = ibtn('refresh', t.upd, proxy('upd-btn')); lockB = ibtn('lock', t.lock, proxy('lock-btn')); hdr.appendChild(updB); hdr.appendChild(lockB);
    syncGate();
  }
  function syncGate() { var on = !!document.getElementById('lock-btn'); if (updB) updB.style.display = on ? '' : 'none'; if (lockB) lockB.style.display = on ? '' : 'none'; }
  function drawPanel() {
    var t = T[L], k = PG.kind;
    if (!panel) { panel = el('div', 'mp'); panel.id = 'sn-menu'; document.body.appendChild(panel); }
    panel.textContent = ''; panel.setAttribute('dir', dir()); panel.setAttribute('aria-label', t.site); panel.hidden = !panel.classList.contains('open') && true;
    function row(h, ic, label, cur, depth, badge, off) {
      var e = off ? el('div', 'mi off') : a(h, '', 'mi'); if (off) e.setAttribute('aria-disabled', 'true');
      if (cur) { e.className += ' cur'; e.setAttribute('aria-current', 'page'); }
      if (depth) e.className += ' d' + depth;
      var i = el('span', 'mic'); if (badge) i.textContent = badge; else i.appendChild(icon(ic)); e.appendChild(i);
      e.appendChild(el('span', 'mt', label)); panel.appendChild(e); return e;
    }
    row('./', 'home', t.home, k === 'home');
    row('learning/', 'book', t.learning, k === 'learning');
    row('learning/deutsch/', null, t.deutsch, k === 'deutsch', 0, 'De');
    var inA1 = !HUB;
    row('a1/', null, t.level + ' A1 · ' + t.n28, false, 1, 'A1');
    row('a1/', 'list', t.lessons, k === 'list', 2);
    row('a1/playlist/', 'play', t.playlist, k === 'playlist', 2);
    row('a1/files/', 'file', t.files, k === 'files', 2);
    row(null, null, t.level + ' A2 · ' + t.soon, false, 1, 'A2', true);
    row(null, null, t.level + ' B1 · ' + t.soon, false, 1, 'B1', true);
    panel.querySelectorAll('a.mi').forEach(function (x) { x.addEventListener('click', function () { setOpen(false); }); });
  }
  function setOpen(o) { if (!panel) return; panel.classList.toggle('open', o); panel.hidden = !o; if (menuBtn) menuBtn.setAttribute('aria-expanded', o ? 'true' : 'false'); }
  function toggle() { setOpen(!panel.classList.contains('open')); }
  function drawActions() {
    var t = T[L], k = PG.kind, rtl = L === 'ar'; sub.textContent = ''; sub.setAttribute('dir', dir());
    var any = false; function add(x) { sub.appendChild(x); any = true; }
    if (k === 'lesson') {
      if (PG.n > 1) add(a(href(PG.n - 1), (rtl ? '→ ' : '← ') + t.prev));
      if (PG.n < TOTAL) add(a(href(PG.n + 1), t.next + (rtl ? ' ←' : ' →')));
      if (PG.n === 28) add(a('a1/s28/exam/', t.exam));
    }
    if (k === 'list') add(a('a1/playlist/', t.playlist, 'sn-g'));
    if (k === 'lesson' || k === 'list') add(a('a1/files/', t.files));
    sub.style.display = any ? '' : 'none';
  }
  function applyHub() {
    if (!HUB) return;
    var d = document.documentElement; d.lang = L; d.dir = dir();
    Array.prototype.forEach.call(document.querySelectorAll('[data-en]'), function (n) { n.textContent = n.getAttribute('data-' + L); });
    var h1 = document.querySelector('h1'); document.title = (L === 'ar' ? 'تدريب الألماني: ' : 'German practice: ') + (h1 ? h1.textContent : '');
  }
  function setLang(l) { L = l; try { localStorage.setItem(KEY, l); } catch (e) {} render(); }
  function render() { var o = panel && panel.classList.contains('open'); applyHub(); drawHeader(); drawActions(); drawPanel(); setOpen(!!o); }
  var st = document.createElement('style');
  st.textContent = ':root{color-scheme:light}html.locked .hdr,html.locked .sn,html.locked .mp{display:none!important}'
    + '#lock-btn,#upd-btn{display:none!important}'
    + '.hdr{position:sticky;top:0;z-index:70;display:flex;align-items:center;gap:6px;height:56px;padding:0 8px;background:#fff;color:#0f172a;border-bottom:1px solid #cbd5e1;box-shadow:0 1px 6px rgba(15,23,42,.08);font-size:16px}'
    + '.hdr .ht{flex:1;min-width:0;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 6px}'
    + '.hb{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-width:44px;height:44px;padding:0 8px;border:0;border-radius:12px;background:transparent;color:#0f172a;font:inherit;font-size:14px;font-weight:600;cursor:pointer}.hb:hover,.hb:focus-visible{background:#e2e8f0;outline:none}.hb-m{background:#0f172a;color:#fff}.hb-m:hover,.hb-m:focus-visible{background:#1e293b}'
    + '.hb-l{border:1px solid #cbd5e1}'
    + '.mp{position:fixed;top:60px;inset-inline-start:8px;z-index:80;width:min(88vw,320px);max-height:calc(100vh - 72px);overflow:auto;display:flex;flex-direction:column;gap:2px;padding:6px;background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:14px;box-shadow:0 10px 30px rgba(15,23,42,.25)}.mp[hidden]{display:none}'
    + '.mi{display:flex;align-items:center;gap:12px;min-height:46px;padding:4px 10px;border-radius:10px;color:#0f172a;text-decoration:none;font-size:15px}a.mi:hover,a.mi:focus-visible{background:#e2e8f0;outline:none}.mi.cur{background:#0f766e;color:#fff}.mi.off{opacity:.55}.mi.d1{margin-top:6px}.mi.d2{margin-inline-start:30px;min-height:42px;font-size:14px}'
    + '.mic{flex:0 0 30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;background:#f1f5f9;font-size:12px;font-weight:700;color:inherit}.mi.cur .mic{background:rgba(255,255,255,.2)}.mic svg{width:18px;height:18px}.mt{flex:1;min-width:0}'
    + '.sn{display:flex;flex-wrap:wrap;gap:8px;align-items:center;max-width:720px;margin:0 auto;padding:8px 12px}.sn a{display:inline-flex;align-items:center;min-height:44px;padding:6px 14px;border-radius:999px;background:#0f172a;color:#fff;text-decoration:none;font-size:15px}.sn a.sn-g{background:#0f766e}'
    + '@media(hover:hover) and (pointer:fine){.hb-m:hover~.x{}}'
    + '@media(max-width:899px){body.has-sn #app{padding-bottom:96px}}';
  document.head.appendChild(st);
  var mm = document.createElement('meta'); mm.name = 'color-scheme'; mm.content = 'light'; document.head.appendChild(mm);
  document.addEventListener('click', function (e) { if (panel && panel.classList.contains('open') && !panel.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  function mount() {
    document.body.classList.add('has-sn'); document.body.insertBefore(sub, document.body.firstChild); document.body.insertBefore(hdr, document.body.firstChild); render();
    new MutationObserver(syncGate).observe(document.body, { childList: true });
    if (window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches) {
      var t; hdr.addEventListener('mouseover', function (e) { if (menuBtn && menuBtn.contains(e.target)) { clearTimeout(t); setOpen(true); } });
      hdr.addEventListener('mouseleave', function () { t = setTimeout(function () { if (!panel.matches(':hover')) setOpen(false); }, 400); });
      panel.addEventListener('mouseleave', function () { setOpen(false); });
    }
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
