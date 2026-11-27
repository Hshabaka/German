(function () {
  var app = document.getElementById('app');
  var EN_T = ["Breaking the ice (\"I can\")", "Giving the sentence life", "Review and locking in the building blocks", "Starting with the other pronouns", "Obligation and need", "Travel and being able to buy things", "How to give your opinion about food", "The imperative and giving reasons", "The full family of modal verbs", "The capstone: introducing yourself", "The world of nouns and articles", "Numbers and age", "My family and my things", "Comparing adjectives (bigger than / better than)", "Cancelling a formal appointment", "At the doctor and describing pain", "Master class (part 1)", "Master class (part 2)", "Master class (part 3: the finale)", "All about questions (how to ask in German)", "The weather", "When? (time prepositions)", "Where and where to? (place prepositions)", "How to talk about the future", "What happened? (the perfect tense, Perfekt)", "The quick storytelling past", "Writing an email", "The form and the conversation"];
  function el(t, a, k) { var e = document.createElement(t); a = a || {}; for (var x in a) { if (x === 'onclick') e.onclick = a[x]; else e.setAttribute(x, a[x]); } (k || []).forEach(function (c) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }); return e; }
  var P = { play: 'M8 5.5v13l11-6.5z', pause: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z', stop: 'M7 7h10v10H7z', prev: 'M6 5h2.2v14H6zM19 5.5v13L9.5 12z', next: 'M15.8 5H18v14h-2.2zM5 5.5v13L14.5 12z', clock: 'M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z' };
  function icon(n, s) { var d = document.createElement('span'); d.className = 'ic'; var st = n === 'clock' ? 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"' : 'fill="currentColor"'; d.innerHTML = '<svg viewBox="0 0 24 24" width="' + (s || 24) + '" height="' + (s || 24) + '" aria-hidden="true"><path ' + st + ' d="' + P[n] + '"/></svg>'; return d; }
  function setIcon(b, n, s) { b.textContent = ''; b.appendChild(icon(n, s)); }
  function fmt(t) { if (!isFinite(t)) return '0:00'; t = Math.floor(t); var m = Math.floor(t / 60), s = t % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
  var CSS = '.pl{max-width:560px;margin:0 auto;padding:10px 14px 90px;line-height:1.7}.pl h1{font-size:21px;margin:6px 0 12px;color:#0f172a}.pl-card{background:#fffdfb;border:1px solid #e7ded4;border-radius:20px;padding:16px 16px 14px;margin-bottom:16px;box-shadow:0 6px 20px rgba(15,23,42,.07)}.pl-k{font-size:12px;color:#0f766e;font-weight:700;letter-spacing:.02em;margin:0}.pl-now{font-size:17px;font-weight:700;color:#0f172a;min-height:52px;margin:2px 0 4px}.pl-sub{font-size:12.5px;color:#64748b;margin:0 0 10px}.pl-bar{direction:ltr;display:flex;align-items:center;gap:10px;font-size:12px;color:#64748b;font-variant-numeric:tabular-nums}.pl-bar input{flex:1;min-width:0;accent-color:#0f766e;height:28px;margin:0}.pl-ctl{direction:ltr;display:flex;align-items:center;justify-content:center;gap:14px;margin-top:6px}.pl-ctl button{width:48px;height:48px;border-radius:50%;border:1px solid #d9cfc3;background:#fff;color:#0f172a;display:inline-flex;align-items:center;justify-content:center;padding:0;cursor:pointer}.pl-ctl button.main{width:64px;height:64px;background:#0f766e;border-color:#0f766e;color:#fff;box-shadow:0 4px 12px rgba(15,118,110,.35)}.pl-ctl button:disabled{opacity:.35;cursor:default}.pl-ctl button:active{transform:scale(.95)}.ic{display:inline-flex}.pl-list{list-style:none;margin:0;padding:0}.pl-t{display:flex;align-items:center;gap:12px;width:100%;min-height:54px;padding:8px 12px;margin:7px 0;border:1px solid #e7ded4;border-radius:14px;background:#fffdfb;color:#0f172a;font:inherit;text-align:start;cursor:pointer}.pl-t .n{width:32px;height:32px;border-radius:50%;background:#f1e9df;color:#0f172a;font-weight:700;font-size:14px;display:inline-flex;align-items:center;justify-content:center;flex:none}.pl-t .tt{flex:1;font-size:15px}.pl-t .st{color:#0f766e;display:inline-flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap}.pl-t.cur{border-color:#0f766e;background:#e6f2ef}.pl-t.cur .n{background:#0f766e;color:#fff}.pl-t.off{cursor:default;background:transparent}.pl-t.off .tt,.pl-t.off .n{opacity:.5}.pl-t.off .st{color:#94a3b8}';
  var st = el('style'); st.textContent = CSS; document.head.appendChild(st);
  Promise.all([
    fetch('data/registry.json').then(function (r) { return r.json(); }),
    fetch('data/audio.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
  ]).then(function (res) {
    var L = res[0].levels.a1.lessons, A = {}; ((res[1] && res[1].a1) || []).forEach(function (x) { A[x.n] = x.src; });
    var T = L.map(function (x) { return { n: x.n, title: x.title, src: A[x.n] || null }; });
    var cur = -1;
    var au = el('audio', { preload: 'none', 'aria-label': 'Playlist player' });
    var now = el('p', { class: 'pl-now' }, ['Pick a lesson; the next one plays automatically']);
    var sub = el('p', { class: 'pl-sub' }, []);
    var tc = el('span', {}, ['0:00']), td = el('span', {}, ['0:00']);
    var rg = el('input', { type: 'range', min: '0', max: '1000', value: '0', 'aria-label': 'Playback position' });
    var bP = el('button', { type: 'button', 'aria-label': 'Previous' }, []); setIcon(bP, 'prev', 22);
    var bA = el('button', { type: 'button', class: 'main', 'aria-label': 'Play / pause' }, []); setIcon(bA, 'play', 30);
    var bS = el('button', { type: 'button', 'aria-label': 'Stop' }, []); setIcon(bS, 'stop', 20);
    var bN = el('button', { type: 'button', 'aria-label': 'Next' }, []); setIcon(bN, 'next', 22);
    var ul = el('ul', { class: 'pl-list' }, []), rows = [];
    function avail(i, d) { for (var j = i + d; j >= 0 && j < T.length; j += d) if (T[j].src) return j; return -1; }
    function paint() {
      rows.forEach(function (r, i) { r.className = 'pl-t' + (T[i].src ? '' : ' off') + (i === cur ? ' cur' : ''); });
      bP.disabled = cur < 0 || avail(cur, -1) < 0; bN.disabled = avail(cur < 0 ? -1 : cur, 1) < 0;
      var c = T.filter(function (t) { return t.src; }).length;
      sub.textContent = c + ' of ' + T.length + ' lessons ready with audio';
    }
    function go(i, play) {
      if (i < 0 || !T[i].src) return; cur = i; au.src = T[i].src; now.textContent = T[i].title; rg.value = 0; tc.textContent = '0:00'; td.textContent = '0:00';
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
      var s = el('span', { class: 'st' }, []);
      if (t.src) { s.appendChild(icon('play', 14)); s.appendChild(document.createTextNode('Ready')); } else { s.appendChild(icon('clock', 14)); s.appendChild(document.createTextNode('Soon')); }
      var b = el('button', { type: 'button', class: 'pl-t', 'aria-disabled': t.src ? 'false' : 'true', onclick: function () { if (t.src) go(i, true); } }, [
        el('span', { class: 'n' }, [String(t.n)]), el('span', { class: 'tt' }, [EN_T[t.n - 1] || '']), s]);
      rows.push(b); ul.appendChild(el('li', {}, [b]));
    });
    bA.onclick = function () { if (cur < 0) { var j = avail(-1, 1); if (j >= 0) go(j, true); } else if (au.paused) { var p = au.play(); if (p && p.catch) p.catch(function () {}); } else au.pause(); };
    bS.onclick = function () { au.pause(); au.currentTime = 0; };
    bN.onclick = function () { nxt(true); }; bP.onclick = function () { prv(true); };
    au.addEventListener('play', function () { setIcon(bA, 'pause', 30); }); au.addEventListener('pause', function () { setIcon(bA, 'play', 30); });
    au.addEventListener('timeupdate', function () { if (!rg.dragging && au.duration) rg.value = Math.round(au.currentTime / au.duration * 1000); tc.textContent = fmt(au.currentTime); td.textContent = fmt(au.duration); });
    au.addEventListener('loadedmetadata', function () { td.textContent = fmt(au.duration); });
    rg.addEventListener('input', function () { rg.dragging = true; if (au.duration) tc.textContent = fmt(rg.value / 1000 * au.duration); });
    rg.addEventListener('change', function () { rg.dragging = false; if (au.duration) au.currentTime = rg.value / 1000 * au.duration; });
    au.addEventListener('ended', function () { nxt(true); });
    app.textContent = '';
    app.appendChild(el('div', { class: 'pl' }, [el('h1', {}, ['A1 playlist (audio only)']),
      el('div', { class: 'pl-card' }, [el('p', { class: 'pl-k' }, ['Current lesson']), now, sub, au, el('div', { class: 'pl-bar' }, [tc, rg, td]), el('div', { class: 'pl-ctl' }, [bS, bP, bA, bN])]), ul]));
    paint();
    window.__pl = { go: go, T: T };
  }).catch(function () { app.textContent = 'Could not load the playlist.'; });
})();
