(function () {
  var app = document.getElementById('app');
  function el(t, a, k) { var e = document.createElement(t); a = a || {}; for (var x in a) { if (x === 'onclick') e.onclick = a[x]; else e.setAttribute(x, a[x]); } (k || []).forEach(function (c) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }); return e; }
  var CSS = '.pl{max-width:640px;margin:0 auto;padding:12px 14px 90px;line-height:1.7}.pl h1{font-size:22px;margin:4px 0 10px}.pl-card{background:#0f172a;color:#fff;border-radius:16px;padding:14px;margin-bottom:14px}.pl-now{font-size:16px;font-weight:700;min-height:48px;margin:0 0 8px}.pl-sub{font-size:13px;opacity:.75;margin:0 0 8px}.pl-card audio{width:100%;display:block}.pl-ctl{display:flex;gap:8px;margin-top:10px}.pl-ctl button{flex:1;min-height:48px;border-radius:12px;border:1px solid rgba(255,255,255,.4);background:transparent;color:#fff;font:inherit;font-size:15px;cursor:pointer}.pl-ctl button.main{background:#fff;color:#0f172a;font-weight:700;flex:1.6}.pl-ctl button:disabled{opacity:.35}.pl-list{list-style:none;margin:0;padding:0}.pl-t{display:flex;align-items:center;gap:10px;width:100%;min-height:52px;padding:8px 12px;margin:6px 0;border:1px solid #cbd5e1;border-radius:12px;background:transparent;color:inherit;font:inherit;text-align:start;cursor:pointer}.pl-t .n{min-width:30px;font-weight:700}.pl-t .tt{flex:1}.pl-t .st{font-size:12px;opacity:.7;white-space:nowrap}.pl-t.cur{border-color:#0f766e;background:rgba(15,118,110,.12)}.pl-t.off{opacity:.5;cursor:default}';
  var st = el('style'); st.textContent = CSS; document.head.appendChild(st);
  Promise.all([
    fetch('data/registry.json').then(function (r) { return r.json(); }),
    fetch('data/audio.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
  ]).then(function (res) {
    var L = res[0].levels.a1.lessons, A = {}; ((res[1] && res[1].a1) || []).forEach(function (x) { A[x.n] = x.src; });
    var T = L.map(function (x) { return { n: x.n, title: x.title, src: A[x.n] || null }; });
    var cur = -1, wantAll = false;
    var au = el('audio', { controls: '', preload: 'none', 'aria-label': 'مشغّل البلاي ليست' });
    var now = el('p', { class: 'pl-now' }, ['اختار درس أو اضغط تشغيل الكل']);
    var sub = el('p', { class: 'pl-sub' }, []);
    var bP = el('button', { type: 'button', 'aria-label': 'السابق' }, ['⏮ السابق']);
    var bA = el('button', { type: 'button', class: 'main' }, ['▶ تشغيل الكل']);
    var bN = el('button', { type: 'button', 'aria-label': 'التالي' }, ['التالي ⏭']);
    var ul = el('ul', { class: 'pl-list' }, []), rows = [];
    function avail(i, d) { for (var j = i + d; j >= 0 && j < T.length; j += d) if (T[j].src) return j; return -1; }
    function paint() {
      rows.forEach(function (r, i) { r.className = 'pl-t' + (T[i].src ? '' : ' off') + (i === cur ? ' cur' : ''); });
      bP.disabled = cur < 0 || avail(cur, -1) < 0; bN.disabled = avail(cur < 0 ? -1 : cur, 1) < 0;
      var c = T.filter(function (t) { return t.src; }).length;
      sub.textContent = c + ' من ' + T.length + ' دروس جاهزة صوتيًا';
    }
    function go(i, play) {
      if (i < 0 || !T[i].src) return; cur = i; au.src = T[i].src; now.textContent = T[i].title;
      if ('mediaSession' in navigator) {
        try { navigator.mediaSession.metadata = new MediaMetadata({ title: T[i].title, artist: 'Deutsch by Barbary', album: 'A1' }); } catch (e) {}
        navigator.mediaSession.setActionHandler('nexttrack', function () { nxt(true); });
        navigator.mediaSession.setActionHandler('previoustrack', function () { prv(true); });
      }
      paint(); if (play) { var p = au.play(); if (p && p.catch) p.catch(function () {}); }
    }
    function nxt(p) { var j = avail(cur < 0 ? -1 : cur, 1); if (j >= 0) go(j, p); }
    function prv(p) { var j = avail(cur, -1); if (j >= 0) go(j, p); }
    T.forEach(function (t, i) {
      var b = el('button', { type: 'button', class: 'pl-t', 'aria-disabled': t.src ? 'false' : 'true', onclick: function () { if (t.src) { wantAll = true; go(i, true); } } }, [
        el('span', { class: 'n' }, [String(t.n)]), el('span', { class: 'tt' }, [t.title.replace(/^الدرس\s*\d+\s*:\s*/, '')]), el('span', { class: 'st' }, [t.src ? '▶ جاهز' : 'لسه مش جاهز'])]);
      rows.push(b); ul.appendChild(el('li', {}, [b]));
    });
    bA.onclick = function () { wantAll = true; var j = avail(-1, 1); if (j >= 0) go(j, true); };
    bN.onclick = function () { nxt(true); }; bP.onclick = function () { prv(true); };
    au.addEventListener('ended', function () { if (wantAll) nxt(true); });
    app.textContent = '';
    app.appendChild(el('div', { class: 'pl' }, [el('h1', {}, ['🎧 بلاي ليست A1 (صوت فقط)']),
      el('div', { class: 'pl-card' }, [now, sub, au, el('div', { class: 'pl-ctl' }, [bP, bA, bN])]), ul]));
    paint();
    window.__pl = { go: go, T: T };
  }).catch(function () { app.textContent = 'مش قادر أحمّل البلاي ليست.'; });
})();
