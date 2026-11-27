(function () {
  var TOTAL = 28, KEY = 'german-site.lang';
  var T = {
    en: { home: 'Home', learning: 'Learning', deutsch: 'Deutsch', level: 'Level', lessons: 'Lessons', playlist: 'Playlist', files: 'PDF files', prev: 'Previous', next: 'Next', exam: 'Exam practice', soon: 'not available yet', menu: 'Menu', lock: 'Lock', upd: 'Refresh site', lang: 'العربية', langA: 'Switch to Arabic', n28: '28 lessons', theme: 'Dark theme', zoom: 'Zoom', langRow: 'Language', zin: 'Zoom in', zout: 'Zoom out', site: 'Site navigation' },
    ar: { home: 'الرئيسية', learning: 'التعلّم', deutsch: 'Deutsch', level: 'المستوى', lessons: 'قايمة الدروس', playlist: 'بلاي ليست', files: 'ملفات PDF', prev: 'السابق', next: 'التالي', exam: 'تدريب الامتحان', soon: 'لسه ما اتضافش', menu: 'القائمة', lock: 'قفل', upd: 'تحديث الموقع', lang: 'EN', langA: 'التبديل للإنجليزي', n28: '28 درس', theme: 'الوضع الداكن', zoom: 'تكبير', langRow: 'اللغة', zin: 'تكبير', zout: 'تصغير', site: 'التنقل في الموقع' }
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
    next: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    prev: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    reset: '<path d="M4 4v6h6M4.5 15a8 8 0 100-6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'
  };
  function icon(n) { var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '22'); s.setAttribute('height', '22'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = I[n]; return s; }
  function getLang() { return 'en'; }
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
  var hoverAt = 0, hdr = el('header', 'hdr'), sub = el('nav', 'sn'), panel = null, menuBtn = null, lockB, updB;
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
    menuBtn = ibtn('menu', t.menu, function (e) { e.stopPropagation(); if (Date.now() - hoverAt < 800) return; toggle(); }); menuBtn.setAttribute('aria-haspopup', 'true'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.className += ' hb-m';
    hdr.appendChild(menuBtn);
    var ti = el('div', 'ht', title()); ti.setAttribute('aria-current', 'page'); hdr.appendChild(ti);
    if (PG.kind === 'lesson') {
      var rtl = L === 'ar';
      function il(h, ic, label) { var e = el('a', 'hb hb-s'); e.href = h; e.setAttribute('aria-label', label); e.title = label; e.appendChild(icon(ic)); return e; }
      var grp = el('div', 'hg');
      if (PG.n > 1) grp.appendChild(il(href(PG.n - 1), rtl ? 'next' : 'prev', t.prev));
      if (PG.n < TOTAL) grp.appendChild(il(href(PG.n + 1), rtl ? 'prev' : 'next', t.next));
      grp.appendChild(il('a1/files/', 'file', t.files));
      if (PG.n === 28) grp.appendChild(il('a1/s28/exam/', 'list', t.exam));
      if (PG.n === 1) { var rb = ibtn('reset', RS[L].t, askReset); rb.className += ' hb-s'; grp.appendChild(rb); }
      hdr.appendChild(grp);
    }
    updB = ibtn('refresh', t.upd, proxy('upd-btn')); lockB = ibtn('lock', t.lock, proxy('lock-btn')); hdr.appendChild(updB); hdr.appendChild(lockB);
    syncGate();
  }
  var RS = { en: { t: 'Reset answers', q: 'Reset all answers in this session? Your checklist progress stays.', y: 'Reset', n: 'Cancel' }, ar: { t: 'مسح الإجابات', q: 'تمسح كل إجابات الجلسة دي؟ تقدّم القايمة هيفضل زي ما هو.', y: 'امسح', n: 'إلغاء' } };
  function askReset() {
    var old = document.getElementById('sn-rs'); if (old) old.remove();
    var r = RS[L], w = el('div', 'rs'); w.id = 'sn-rs'; w.setAttribute('dir', dir()); w.setAttribute('role', 'dialog');
    var box = el('div', 'rsb'); box.appendChild(el('p', '', r.q));
    var row = el('div', 'rsr'), y = el('button', 'sbn rs-y', r.y), n = el('button', 'sbn', r.n); y.type = n.type = 'button';
    n.addEventListener('click', function () { w.remove(); });
    y.addEventListener('click', function () { w.remove(); if (window.__resetAnswers) window.__resetAnswers(); });
    w.addEventListener('click', function (e) { if (e.target === w) w.remove(); });
    row.appendChild(y); row.appendChild(n); box.appendChild(row); w.appendChild(box); document.body.appendChild(w);
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
    var box = el('div', 'ms');
    function srow(label) { var r = el('div', 'sr'); r.appendChild(el('span', 'sl', label)); box.appendChild(r); return r; }
    function sb(txt, aria, fn, pressed) { var b = el('button', 'sbn', txt); b.type = 'button'; b.setAttribute('aria-label', aria); if (pressed != null) b.setAttribute('aria-pressed', pressed ? 'true' : 'false'); b.addEventListener('click', function (e) { e.stopPropagation(); fn(); }); return b; }
    
    var r2 = srow(t.theme); r2.appendChild(sb(getTheme() === 'dark' ? 'ON' : 'OFF', t.theme, function () { setTheme(getTheme() === 'dark' ? 'light' : 'dark'); }, getTheme() === 'dark'));
    var r3 = srow(t.zoom); r3.appendChild(sb('−', t.zout, function () { setZoom(getZoom() - 0.1); })); r3.appendChild(el('span', 'zv', Math.round(getZoom() * 100) + '%')); r3.appendChild(sb('+', t.zin, function () { setZoom(getZoom() + 0.1); }));
    panel.appendChild(box);
    panel.querySelectorAll('a.mi').forEach(function (x) { x.addEventListener('click', function () { setOpen(false); }); });
  }
  function setOpen(o) { if (!panel) return; panel.classList.toggle('open', o); panel.hidden = !o; if (menuBtn) menuBtn.setAttribute('aria-expanded', o ? 'true' : 'false'); }
  function toggle() { setOpen(!panel.classList.contains('open')); }
  function drawActions() {
    var t = T[L], k = PG.kind, rtl = L === 'ar'; sub.textContent = ''; sub.setAttribute('dir', dir());
    var any = false; function add(x) { sub.appendChild(x); any = true; }
    if (k === 'list') add(a('a1/playlist/', t.playlist, 'sn-g'));
    if (k === 'list') add(a('a1/files/', t.files));
    sub.style.display = any ? '' : 'none';
  }
  function applyHub() {
    if (!HUB) return;
    var d = document.documentElement; d.lang = L; d.dir = dir();
    Array.prototype.forEach.call(document.querySelectorAll('[data-en]'), function (n) { n.textContent = n.getAttribute('data-' + L); });
    var h1 = document.querySelector('h1'); document.title = (L === 'ar' ? 'تدريب الألماني: ' : 'German practice: ') + (h1 ? h1.textContent : '');
  }
  var TK = 'german-site.theme', ZK = 'german-site.zoom';
  function getTheme() { try { return localStorage.getItem(TK) === 'dark' ? 'dark' : 'light'; } catch (e) { return 'light'; } }
  function getZoom() { try { if (localStorage.getItem(ZK + '.v') !== '2') { localStorage.removeItem(ZK); localStorage.setItem(ZK + '.v', '2'); } var z = parseFloat(localStorage.getItem(ZK)); return z >= 0.8 && z <= 1.8 ? z : 0.8; } catch (e) { return 0.8; } }
  function applyView() { document.documentElement.classList.toggle('sn-dark', getTheme() === 'dark'); var app = document.getElementById('app'); if (app) app.style.zoom = getZoom() === 1 ? '' : String(getZoom()); }
  function setTheme(v) { try { localStorage.setItem(TK, v); } catch (e) {} render(); }
  function setZoom(z) { z = Math.max(0.8, Math.min(1.8, Math.round(z * 10) / 10)); try { localStorage.setItem(ZK, String(z)); } catch (e) {} render(); }
  function setLang(l) { L = l; try { localStorage.setItem(KEY, l); } catch (e) {} render(); }
  function render() { applyView(); var o = panel && panel.classList.contains('open'); applyHub(); drawHeader(); drawActions(); drawPanel(); setOpen(!!o); }
  var st = document.createElement('style');
  st.textContent = ':root{color-scheme:light}html.locked .hdr,html.locked .sn,html.locked .mp{display:none!important}'
    + '#lock-btn,#upd-btn{display:none!important}'
    + '.hdr{position:sticky;top:0;z-index:70;display:flex;align-items:center;gap:6px;height:42px;padding:0 6px;background:#fff;color:#0f172a;border-bottom:1px solid #cbd5e1;box-shadow:0 1px 6px rgba(15,23,42,.08);font-size:16px}'
    + '.hdr .ht{flex:1;min-width:0;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 6px}'
    + '.hb{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-width:40px;height:40px;padding:0 6px;border:0;border-radius:12px;background:transparent;color:#0f172a;font:inherit;font-size:14px;font-weight:600;cursor:pointer}.hb:hover,.hb:focus-visible{background:#e2e8f0;outline:none}.hb-m{background:#0f172a;color:#fff}.hb-m:hover,.hb-m:focus-visible{background:#1e293b}'
    + '.hb-l{border:1px solid #cbd5e1}'
    + '.mp{position:fixed;top:46px;inset-inline-start:6px;z-index:80;width:min(88vw,320px);max-height:calc(100vh - 56px);overflow:auto;display:flex;flex-direction:column;gap:2px;padding:6px;background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:14px;box-shadow:0 10px 30px rgba(15,23,42,.25)}.mp[hidden]{display:none}'
    + '.mi{display:flex;align-items:center;gap:12px;min-height:46px;padding:4px 10px;border-radius:10px;color:#0f172a;text-decoration:none;font-size:15px}a.mi:hover,a.mi:focus-visible{background:#e2e8f0;outline:none}.mi.cur{background:#0f766e;color:#fff}.mi.off{opacity:.55}.mi.d1{margin-top:6px}.mi.d2{margin-inline-start:30px;min-height:42px;font-size:14px}'
    + '.mic{flex:0 0 30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;background:#f1f5f9;font-size:12px;font-weight:700;color:inherit}.mi.cur .mic{background:rgba(255,255,255,.2)}.mic svg{width:18px;height:18px}.mt{flex:1;min-width:0}'
    + '.sn{display:flex;flex-wrap:wrap;gap:8px;align-items:center;max-width:720px;margin:0 auto;padding:8px 12px}.sn a{display:inline-flex;align-items:center;min-height:44px;padding:6px 14px;border-radius:999px;background:#0f172a;color:#fff;text-decoration:none;font-size:15px}.sn a.sn-g{background:#0f766e}'
    + '@media(max-width:420px){.hdr{gap:2px}.hdr .ht{padding:0 4px}}'
    + '.ms{margin-top:8px;padding-top:8px;border-top:1px solid #cbd5e1;display:flex;flex-direction:column;gap:6px}.sr{display:flex;align-items:center;gap:8px;min-height:44px;padding:0 6px}.sl{flex:1;font-size:15px}.sbn{min-width:44px;height:40px;padding:0 12px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#0f172a;font:inherit;font-size:15px;font-weight:700;cursor:pointer}.sbn[aria-pressed=true]{background:#0f766e;color:#fff;border-color:#0f766e}.zv{min-width:48px;text-align:center;font-weight:700}'
    + 'html.sn-dark{color-scheme:dark;--ink:#ece7e1;--ink-2:#d6cfc8;--ink-3:#b5aea6;--hairline:#2f3b49;--paper:#1a2430;--sand-1:#111922;--sand-2:#182130;--night:#0a1119;--night-2:#15212e;--teal-soft:#12342f;--amber:#f59e0b;--amber-soft:#3a2a14;--blue:#8fb0ff;--green:#4ade80;--shadow:0 10px 30px rgba(0,0,0,.45);--shadow-sm:0 2px 8px rgba(0,0,0,.4)}'
    + 'html.sn-dark body{background:#0e151e;color:var(--ink)}html.sn-dark select,html.sn-dark input,html.sn-dark textarea{background:var(--paper);color:var(--ink);border-color:var(--hairline)}html.sn-dark a{color:#8fd3c9}'
    + 'html.sn-dark .hdr{background:#141d28;color:#ece7e1;border-bottom-color:#2f3b49}html.sn-dark .hb{color:#ece7e1}html.sn-dark .hb:hover,html.sn-dark .hb:focus-visible{background:#243242}html.sn-dark .hb-m{background:#ece7e1;color:#141d28}'
    + 'html.sn-dark .mp{background:#1a2430;color:#ece7e1;border-color:#2f3b49}html.sn-dark .mi{color:#ece7e1}html.sn-dark a.mi{color:#ece7e1}html.sn-dark a.mi:hover,html.sn-dark a.mi:focus-visible{background:#243242}html.sn-dark .mi.cur{background:#0f766e;color:#fff}html.sn-dark .mic{background:#243242}html.sn-dark .ms{border-top-color:#2f3b49}html.sn-dark .sbn{background:#243242;color:#ece7e1;border-color:#3a4859}html.sn-dark .sbn[aria-pressed=true]{background:#0f766e;color:#fff;border-color:#0f766e}'
    + 'html.sn-dark #gate{--ink:#1c1917;--ink-2:#57504b;--ink-3:#8a8178;--paper:#fffdfb;--hairline:#e7ded4;color:#1c1917;color-scheme:light}html.sn-dark #gate input{background:#fff;color:#1c1917;border-color:#1c1917}'
    + 'html.sn-dark .tile{background:#222f3d;color:#ece7e1;border-color:#3a4a5c}html.sn-dark .tile:disabled,html.sn-dark .tile.used{background:#2b3541;color:#6b7683}'
    + '.ms{margin-top:4px;padding-top:4px;gap:0}.sr{min-height:30px;gap:4px;padding:0 4px}.sl{font-size:12px}.sbn{min-width:34px;height:28px;padding:0 9px;font-size:12px;border-radius:7px}.sv{font-size:12px;min-width:34px}'
    + 'html.sn-dark button:disabled,html.sn-dark .btn:disabled{color:#9aa5b1;opacity:1;border-color:#3a4a5c}html.sn-dark .tile.used,html.sn-dark .tile:disabled{color:#7f8b98}'
    + '.hg{display:flex;align-items:center;gap:0;margin-inline-start:auto}.hb-s{min-width:34px;height:34px;padding:0 4px;border-radius:10px;color:inherit;text-decoration:none}.hb-s svg{width:19px;height:19px}.ht{flex:0 1 auto}'
    + '.rs{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:20px}.rsb{background:#fff;color:#0f172a;border-radius:16px;padding:18px;max-width:320px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.4)}.rsb p{margin:0 0 14px;font-size:15px;line-height:1.6}.rsr{display:flex;gap:8px;justify-content:flex-end}.rsr .sbn{height:38px;font-size:14px;padding:0 16px}.rs-y{background:#b91c1c;color:#fff;border-color:#b91c1c}html.sn-dark .rsb{background:#1a2430;color:#ece7e1}'
    + 'html.sn-dark .feedback[data-kind=wrong],html.sn-dark .feedback[data-kind=wrong] .fb-note,html.sn-dark .feedback[data-kind=wrong] .fb-note div{color:#5b1228}html.sn-dark .feedback[data-kind=wrong] .fb-head{color:#b3123f}.ctl{display:grid;grid-template-columns:minmax(0,1fr) 76px;gap:4px 6px;padding:6px 0;direction:ltr;align-items:start}.ctl>*{margin:0;min-width:0}.ctl .quiz-prompt{display:contents}.ctl .quiz-prompt>span{grid-column:1/-1;grid-row:1;text-align:right;direction:rtl}.ctl .quiz-prompt>span[dir=ltr]{direction:ltr;text-align:left}.ctl .quiz-prompt>.quiz-num{display:none}.ctl .answer-row{grid-column:1;grid-row:2;min-height:40px;padding:4px;gap:6px}.ctl .tile-bank,.ctl .quiz-options{grid-column:1;display:flex;flex-wrap:wrap;gap:6px;align-items:flex-start;min-width:0}.ctl.build-q .tile-bank{grid-row:3;grid-column:1/-1}.ctl.qa .quiz-options{grid-row:2}.ctl .tile,.ctl .quiz-opt{flex:0 0 auto;width:auto;min-height:38px;padding:4px 10px;font-size:15px;max-width:100%}.ctl .quiz-opt.long{flex:1 1 100%;width:100%;white-space:normal;text-align:left;line-height:1.35}.ctl>.bq-act{grid-column:2;grid-row:2;display:flex;flex-direction:row-reverse;justify-content:flex-start;gap:0;align-items:center}.ctl.er .quiz-options,.ctl.er>.bq-act{grid-row:1}.ctl.tr .quiz-prompt>span{grid-column:1}.ctl.tr>.bq-act{grid-row:1}.ctl.tr>.reveal{grid-column:1/-1;grid-row:2}.bq-act .btn{margin:0;min-height:44px;min-width:44px;padding:0;font-size:20px;line-height:1}.bq-act .btn-ghost{min-width:30px}.bq-act .reveal-btn{font-size:14px;padding:0 6px;min-width:70px;white-space:nowrap}.ctl>.feedback{grid-column:1/-1;grid-row:4;direction:rtl}.rule-forms{list-style:none;margin:0 0 10px;padding:0;display:grid;gap:4px}.rule-forms li{direction:ltr;text-align:left;font-weight:700;font-size:15px;background:var(--paper);border:1px solid var(--hairline);border-radius:10px;padding:6px 12px}.rule-examples li{flex-direction:column;align-items:stretch;gap:2px}.rule-examples .rule-de{direction:ltr;text-align:left}.rule-examples .rule-ar{direction:rtl;text-align:right}.rule h3,.rule p{text-align:right;direction:rtl}.art-legend{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0}.art-ico{display:inline-flex;align-items:center;justify-content:center;min-width:56px;height:32px;padding:0 12px;border-radius:10px;font-weight:800;font-size:15px;color:#fff}.art-ico-der{background:#1d4ed8}.art-ico-die{background:#e11d48}.art-ico-das{background:#15803d}.sort-color{margin-left:auto;min-height:36px;font-size:14px;padding:0 12px;border:1px solid var(--hairline)}.sort-color[aria-pressed=true]{background:#0f766e;color:#fff}.word.wbg-der{background:rgba(29,78,216,.12)}.word.wbg-die{background:rgba(225,29,72,.12)}.word.wbg-das{background:rgba(21,128,61,.12)}html.sn-dark .word.wbg-der{background:rgba(96,165,250,.2)}html.sn-dark .word.wbg-die{background:rgba(251,113,133,.2)}html.sn-dark .word.wbg-das{background:rgba(74,222,128,.18)}.tr-note{margin:0 0 6px;direction:rtl;text-align:right}.ctl>.feedback.reveal{direction:ltr;text-align:left}html.sn-dark .feedback.reveal{color:#c9f5e6}html.sn-dark .feedback.reveal *{color:#c9f5e6}.sentence{direction:ltr}.sentence .audio-btn,.sentence .noaudio{order:2;margin-left:auto}.sentence-text{order:1;flex:1}.sentence-de{align-self:flex-start;text-align:left}.sentence-ar{align-self:flex-end;direction:rtl;text-align:right}.word{direction:ltr}.word .word-de{order:1;flex:0 0 auto}.word .word-ar{order:2;direction:rtl;margin-left:2px}.word .audio-btn,.word .noaudio{order:3;margin-left:auto}'
    + 'html.sn-dark .sn a{background:#223040;color:#ece7e1;border:1px solid #3a4a5c}html.sn-dark .sn a.sn-g{background:#0f766e;color:#fff}'
    + '@media(min-width:900px){.navbar{top:auto!important;bottom:12px!important}body.has-sn #app{padding-bottom:104px}}@media(max-width:899px){body.has-sn #app{padding-bottom:96px}}';
  document.head.appendChild(st);
  var mm = document.createElement('meta'); mm.name = 'color-scheme'; mm.content = 'light'; document.head.appendChild(mm);
  document.addEventListener('click', function (e) { if (panel && panel.classList.contains('open') && !panel.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  function mount() {
    document.body.classList.add('has-sn'); document.body.insertBefore(sub, document.body.firstChild); document.body.insertBefore(hdr, document.body.firstChild); render();
    new MutationObserver(syncGate).observe(document.body, { childList: true });
    if (window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches) {
      var t; hdr.addEventListener('mouseover', function (e) { if (menuBtn && menuBtn.contains(e.target)) { clearTimeout(t); if (!panel.classList.contains('open')) hoverAt = Date.now(); setOpen(true); } });
      hdr.addEventListener('mouseleave', function () { t = setTimeout(function () { if (!panel.matches(':hover')) setOpen(false); }, 400); });
      panel.addEventListener('mouseleave', function () { setOpen(false); });
    }
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
