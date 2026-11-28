/* German course site — Session 1 practice shell, design v2.
   Progress storage adapter: remote intermediary when configured, local queue otherwise.
   Offline: edits queue locally and flush on reconnect; a manual "re-read" is always offered. */
(function () {
  'use strict';

  var LV = (document.body && document.body.getAttribute('data-level')) || 'a1';
  var SID = String((document.body && document.body.getAttribute('data-session')) || '1');
  var SN = parseInt(SID, 10) || 1; // numeric sessions only; nonnumeric ids ('rev', '15a') keep SID
  var CONFIG = {
    sessionUrl: LV === 'a1' ? 'data/session-' + SN + '.json' : 'data/' + LV + '/session-' + SID + '.json',
    progressEndpoint: null, // set to the intermediary URL when it exists, e.g. 'https://<worker>/progress'
    localKey: LV === 'a1' ? (SN === 1 ? 'german-site.progress.v1' : 'german-site.progress.s' + SN + '.v1') : 'german-site.progress.' + LV + 's' + SID + '.v1'
  };

  var arNum = function (n) { return String(n); };

  var store = {
    data: { answers: {}, tracker: {}, updatedAt: null },
    queued: false,
    online: navigator.onLine,
    loadLocal: function () {
      try {
        var raw = localStorage.getItem(CONFIG.localKey);
        if (raw) this.data = JSON.parse(raw);
      } catch (e) { /* storage unavailable: session-only state */ }
    },
    saveLocal: function () {
      try { localStorage.setItem(CONFIG.localKey, JSON.stringify(this.data)); } catch (e) {}
    },
    // Remote sync through the intermediary. When the gate is live, /api/session answers 200
    // and the endpoint activates; locally everything stays on-device.
    flush: function (onState) {
      if (!CONFIG.progressEndpoint) { onState('local'); return; }
      fetch(CONFIG.progressEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.data)
      }).then(function (r) {
        onState(r.ok ? 'synced' : 'error');
      }).catch(function () {
        onState(navigator.onLine ? 'error' : 'offline-queued');
      });
    },
    pullRemote: function (done) {
      if (!CONFIG.progressEndpoint) { done(); return; }
      fetch(CONFIG.progressEndpoint).then(function (r) { return r.ok ? r.json() : null; }).then(function (remote) {
        if (remote && remote.updatedAt && (!store.data.updatedAt || remote.updatedAt > store.data.updatedAt)) {
          store.data = remote;
          store.saveLocal();
        } else if (store.data.updatedAt && (!remote || !remote.updatedAt || store.data.updatedAt > remote.updatedAt)) {
          store.flush(setSync);
        }
        done();
      }).catch(function () { done(); });
    },
    detectEndpoint: function (done) {
      fetch('/api/session').then(function (r) {
        if (r.ok) CONFIG.progressEndpoint = '/api/progress';
      }).catch(function () {}).then(function () { done(); });
    }
  };

  var state = {
    sortColor: {}, speech: {},
    session: null,
    tab: 0,
    cardIndex: 0,
    revealed: false,
    drill: 0,
    shown: {},
    syncState: 'local' // local | synced | offline-queued | error
  };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') node.className = v;
      else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), v);
      else if (k === 'dir') node.dir = v;
      else node.setAttribute(k, v);
    });
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  var ICONS = {
    mic: '<rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    down: '<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    up: '<path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v5h5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    chart: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3v9l6.5 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    play: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 8.5l5 3.5-5 3.5z" fill="currentColor"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M4 5.5v15" stroke="currentColor" stroke-width="2"/>',
    cards: '<rect x="3" y="6" width="13" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 3h11a2 2 0 0 1 2 2v11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    quiz: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.2 9.3a2.8 2.8 0 1 1 4 2.9c-.8.4-1.2 1-1.2 1.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17" r="1.2" fill="currentColor"/>',
    speaker: '<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    grammar: '<path d="M5 19L12 5l7 14M7.5 14h9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    doc: '<path d="M7 3h7l4 4v14H7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M14 3v4h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    link: '<path d="M10 14a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  };

  function icon(name, size) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('width', String(size || 20));
    s.setAttribute('height', String(size || 20));
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ICONS[name] || '';
    return s;
  }

  function rich(text) {
    var out = [], re = /[A-Za-zÄÖÜäöüß]+(?:[ \-][A-Za-zÄÖÜäöüß]+)*/g, last = 0, m, t = String(text == null ? '' : text);
    while ((m = re.exec(t))) {
      if (m.index > last) out.push(t.slice(last, m.index));
      out.push(el('bdi', { class: 'lt', dir: 'ltr' }, [m[0]]));
      last = m.index + m[0].length;
    }
    if (last < t.length) out.push(t.slice(last));
    return out;
  }

  function articleSpan(article) {
    if (!article) return null;
    return el('span', { class: 'art art-' + article, dir: 'ltr' }, [article]);
  }

  var currentAudio = null;
  var currentEl = null;
  function playClip(src, host, stateEl) {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    if (currentEl) { currentEl.dataset.state = ''; currentEl = null; }
    var a = new Audio((window.AUDIO_DATA && window.AUDIO_DATA[src]) || src);
    currentAudio = a;
    currentEl = stateEl;
    stateEl.dataset.state = 'playing';
    function done() { if (currentAudio === a) { currentAudio = null; currentEl = null; } stateEl.dataset.state = ''; }
    a.onended = done;
    a.onerror = function () { done(); showAudioError(host); };
    a.play().catch(function () { done(); showAudioError(host); });
  }

  function audioButton(src, label) {
    var btn = el('button', { class: 'audio-btn', type: 'button', 'aria-label': label, title: label }, [icon('speaker', 20)]);
    btn.addEventListener('click', function () { playClip(src, btn, btn); });
    return btn;
  }

  /* Whole row is the play control (words and sentences). */
  function tapRow(li, src, label) {
    li.classList.add('tap-play');
    li.setAttribute('role', 'button');
    li.setAttribute('tabindex', '0');
    li.setAttribute('aria-label', label);
    li.addEventListener('click', function () { playClip(src, li, li); });
    li.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playClip(src, li, li); }
    });
    return li;
  }

  function showAudioError(btn) {
    var box = btn.classList.contains('tap-play') ? btn : btn.parentNode;
    if (box.querySelector('.audio-err')) return;
    box.appendChild(el('span', { class: 'audio-err', role: 'status' }, ['Audio is not available right now']));
  }

  function setSync(s) { state.syncState = s; }

  function youtubeEmbed(url) {
    var m = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/.exec(url || '');
    return m ? 'https://www.youtube.com/embed/' + m[1] : null;
  }

  function panel(iconName, title, hint, children, tone, span, id) {
    var head = el('div', { class: 'panel-head' }, [
      el('span', { class: 'panel-icon' }, [icon(iconName, 18)]),
      el('div', {}, [
        el('h2', { class: 'panel-title' }, [title]),
        hint ? el('p', { class: 'panel-hint' }, [hint]) : null
      ])
    ]);
    var sec = el('section', { class: 'panel ' + (tone || '') + ' ' + (span || '') }, [head].concat(children));
    if (id) sec.id = id;
    return sec;
  }

  /* ---------- hero with live progress ring ---------- */
  function renderHero(s) {
    var steps = s.tracker || [];
    var done = steps.filter(function (st) { return store.data.tracker[st.id]; }).length;
    var pct = steps.length ? Math.round((done / steps.length) * 100) : 0;
    var R = 46, CIRC = 2 * Math.PI * R;
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '108'); svg.setAttribute('height', '108'); svg.setAttribute('viewBox', '0 0 108 108');
    var track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    track.setAttribute('class', 'ring-track'); track.setAttribute('cx', '54'); track.setAttribute('cy', '54');
    track.setAttribute('r', String(R)); track.setAttribute('fill', 'none'); track.setAttribute('stroke-width', '9');
    var fill = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    fill.setAttribute('class', 'ring-fill'); fill.setAttribute('cx', '54'); fill.setAttribute('cy', '54');
    fill.setAttribute('r', String(R)); fill.setAttribute('fill', 'none'); fill.setAttribute('stroke-width', '9');
    fill.setAttribute('stroke-dasharray', CIRC.toFixed(1));
    fill.setAttribute('stroke-dashoffset', (CIRC * (1 - pct / 100)).toFixed(1));
    svg.appendChild(track); svg.appendChild(fill);

    return el('header', { class: 'hero' }, [
      el('div', { class: 'wrap hero-row' }, [
        el('div', { class: 'hero-main' }, [
          el('div', { class: 'hero-chips' }, [
            el('span', { class: 'chip chip-level' }, ['German ' + s.level]),
            el('span', { class: 'chip' }, ['A1-S' + (SN < 10 ? '0' : '') + SN])
          ]),
          el('h1', {}, [String(s.title)]),
          el('p', { class: 'hero-sub' }, ['Lesson video, grammar and practice on one page.'])
        ]),
        el('div', { class: 'ring', role: 'img', 'aria-label': 'Progress ' + pct + ' percent' }, [
          svg,
          el('div', { class: 'ring-label' }, [
            el('span', { class: 'ring-pct' }, [pct + '%']),
            el('span', { class: 'ring-cap' }, ['Done'])
          ])
        ])
      ])
    ]);
  }

  /* ---------- sections ---------- */
  function renderTracker(s) {
    var t = store.data.tracker;
    var list = el('ul', { class: 'steps' }, s.tracker.map(function (step) {
      var doneAt = t[step.id];
      var box = el('input', { type: 'checkbox', id: 'tr-' + step.id, class: 'step-check' });
      box.checked = !!doneAt;
      box.addEventListener('change', function () {
        if (box.checked) t[step.id] = new Date().toISOString();
        else delete t[step.id];
        persist(); render();
      });
      var li = el('li', { class: 'step' }, [box, el('label', { 'for': 'tr-' + step.id }, [step.title])]);
      if (doneAt) li.appendChild(el('span', { class: 'done-at' }, [new Date(doneAt).toLocaleDateString('en-GB')]));
      return li;
    }));
    var fileInput = el('input', { type: 'file', accept: 'application/json,.json', style: 'display:none' });
    fileInput.addEventListener('change', function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var data = JSON.parse(rd.result);
          if (data && typeof data === 'object' && (data.tracker || data.answers)) {
            store.data = { answers: data.answers || {}, tracker: data.tracker || {}, updatedAt: data.updatedAt || null };
            persist(); render();
          }
        } catch (e) { /* invalid file: ignore */ }
      };
      rd.readAsText(f);
    });
    var tools = el('div', { class: 'progress-tools' }, [
      el('button', {
        class: 'btn btn-secondary', type: 'button',
        onclick: function () {
          var blob = new Blob([JSON.stringify(store.data, null, 2)], { type: 'application/json' });
          var a = el('a', { href: URL.createObjectURL(blob), download: 'german-progress.json' });
          document.body.appendChild(a); a.click(); a.remove();
        }
      }, ['Download progress file']),
      el('button', { class: 'btn btn-ghost', type: 'button', onclick: function () { fileInput.click(); } }, ['Upload progress file']),
      fileInput
    ]);
    return panel('chart', 'Your progress', 'Tick each step when you finish it', [list, tools], '', 'span-12', 'sec-tracker');
  }

  var NV = { state: 'loading', url: null, expires: 0, video: null, wrap: null, busy: false };
  var REG = { yt: '', nr: '' };
  fetch('data/registry.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (g) {
    var ll = g && g.levels && g.levels[LV] && g.levels[LV].lessons || [];
    var l = ll.filter(function (x) { return String(x.sid != null ? x.sid : x.n) === SID; })[0] || null;
    if (l && /^https:\/\/app\.notion\.com\//.test(l.notion_row || '')) REG.nr = l.notion_row;
    if (l && /^https:\/\/www\.youtube\.com\//.test(l.youtube || '') && l.youtube !== REG.yt) { REG.yt = l.youtube; if (state.session) render(); } else if (state.session) render();
  }).catch(function () {});
  function nowSec() { return Math.floor(Date.now() / 1000); }
  function fetchVideoUrl(done) {
    fetch('data/video-urls.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { var k = LV === 'a1' ? 'session-' + SN : LV + '-session-' + SID; var e = d && d[k]; done(e && e.url && e.expires_at > nowSec() ? e : null); })
      .catch(function () { done(null); });
  }
  function swapVideo(e) {
    var v = NV.video; if (!v || !e || e.url === NV.url) return;
    var t = v.currentTime, playing = !v.paused && !v.ended;
    NV.url = e.url; NV.expires = e.expires_at;
    v.src = e.url;
    v.addEventListener('loadedmetadata', function once() {
      v.removeEventListener('loadedmetadata', once);
      try { v.currentTime = t; } catch (x) {}
      if (playing) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    });
    v.load();
  }
  function refreshVideo() {
    if (NV.busy) return; NV.busy = true;
    fetchVideoUrl(function (e) { NV.busy = false; if (e) swapVideo(e); });
  }
  function sessionVideos() {
    var s = state.session || {};
    var list = [];
    if (Array.isArray(s.videos) && s.videos.length) list = s.videos.slice();
    else if (s.video) list = [s.video];
    var seen = {}, out = [];
    list.forEach(function (v) { var u = v && v.open_url; if (u && !seen[u]) { seen[u] = 1; out.push(v); } });
    return out;
  }
  function ytRow() {
    var yt = REG.yt || (state.session && state.session.video && state.session.video.open_url) || '';
    if (!/^https:\/\/www\.youtube\.com\//.test(yt)) return null;
    return el('p', { class: 'caption', style: 'margin:8px 0 0' }, [el('a', { href: yt, target: '_blank', rel: 'noopener', style: 'display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:3px 11px;border-radius:999px;background:#c4302b;color:#fff;text-decoration:none;font-size:13px', 'aria-label': 'Open the video on YouTube' }, ['▶ YouTube ↗'])]);
  }
  function notionRow() {
    if (!REG.nr) return null;
    return el('a', { href: REG.nr, target: '_blank', rel: 'noopener', style: 'display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:3px 11px;border-radius:999px;background:#fff;color:#111;border:1px solid #111;text-decoration:none;margin-inline-start:8px;font-size:13px', 'aria-label': 'Open the session in Notion' }, [el('span', { style: 'display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;border-radius:3px;border:1.3px solid #111;font:700 11px serif', 'aria-hidden': 'true' }, ['N']), 'Notion ↗']);
  }
  function ytFrame(u0) {
    var yt = u0 || REG.yt || (state.session && state.session.video && state.session.video.open_url) || '';
    var u = youtubeEmbed(yt);
    if (!u) return null;
    return el('div', { class: 'video-wrap lv-wrap' }, [el('iframe', { src: u + '?rel=0&playsinline=1', title: 'Session video on YouTube', style: 'width:100%;aspect-ratio:16/9;border:0;display:block', allow: 'accelerometer; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: '', referrerpolicy: 'strict-origin-when-cross-origin' })]);
  }
  var AUD = { list: [], el: null, cache: {} };
  fetch('data/audio.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (g) {
    var l = g && (g[LV] || (LV === 'a1' ? g.a1 : null)); if (l && l.length) { AUD.list = l; if (state.session) render(); }
  }).catch(function () {});
  function sessionNo() {
    var m = state.session && /(\d+)\s*$/.exec(String(state.session.id || ''));
    return m ? parseInt(m[1], 10) : 0;
  }
  function audMine() {
    var n = sessionNo();
    return n ? AUD.list.filter(function (x) { return x.n === n; })[0] || null : null;
  }
  function audResolve(t) {
    if (t.src) return Promise.resolve(t.src);
    if (!AUD.cache[t.n]) {
      AUD.cache[t.n] = Promise.all(t.parts.map(function (p) { return fetch(p).then(function (r) { if (!r.ok) throw new Error('part'); return r.text(); }); })).then(function (x) {
        var bin = atob(x.join('').replace(/\s+/g, '')), u = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        return URL.createObjectURL(new Blob([u], { type: t.mime || 'audio/mp4' }));
      });
    }
    return AUD.cache[t.n];
  }
  function audioRow() {
    var t = audMine();
    if (!t) return null;
    var a = el('audio', { controls: '', preload: 'none', style: 'width:100%;margin-top:6px', 'aria-label': 'Lesson audio', 'data-lesson': String(t.n) });
    AUD.el = a;
    var msg = el('p', { class: 'caption', role: 'status', style: 'margin:4px 0 0' }, []);
    if (t.src) { a.src = t.src; a.preload = 'metadata'; }
    else {
      msg.textContent = 'Loading the lesson audio...';
      audResolve(t).then(function (u) { a.src = u; a.load(); msg.textContent = ''; }).catch(function () { msg.textContent = 'The lesson audio could not load. Reload the page to try again.'; });
    }
    if ('mediaSession' in navigator) { try { navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: 'Deutsch by Barbary', album: 'A1' }); } catch (e) {} }
    return el('div', { style: 'margin:10px 0 0' }, [a, msg]);
  }
  function videoBlock() {
    var kids = [];
    var vids = sessionVideos();
    var first = ytFrame(vids.length ? vids[0].open_url : null);
    if (first) {
      kids.push(first);
      var row = el('p', { class: 'caption', style: 'margin:8px 0 0;display:flex;flex-wrap:wrap;gap:8px;align-items:center' }, []);
      var yr = ytRow(); if (yr) { var a = yr.firstChild; a.style.marginInlineStart = '0'; row.appendChild(a); }
      var nr = notionRow(); if (nr) row.appendChild(nr);
      kids.push(row);
      vids.slice(1).forEach(function (v, i) {
        var f = ytFrame(v.open_url); if (!f) return;
        kids.push(f);
        if (v.note) kids.push(el('p', { class: 'caption', style: 'margin:4px 0 0' }, [v.note]));
        var yl = /^https:\/\/www\.youtube\.com\//.test(v.open_url || '') ? el('p', { class: 'caption', style: 'margin:4px 0 8px' }, [el('a', { href: v.open_url, target: '_blank', rel: 'noopener', style: 'display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:3px 11px;border-radius:999px;background:#c4302b;color:#fff;text-decoration:none;font-size:13px', 'aria-label': 'Open video ' + (i + 2) + ' on YouTube' }, ['\u25b6 YouTube ' + (i + 2) + ' \u2197'])]) : null;
        if (yl) kids.push(yl);
      });
      var ar = audioRow(); if (ar) kids.push(ar);
      return el('div', { class: 'lv' }, kids);
    }
    if (NV.video) {
      kids.push(el('div', { class: 'video-wrap lv-wrap' }, [NV.video]));
    } else if (NV.state === 'loading') {
      kids.push(el('p', { class: 'caption' }, ['Preparing the video…']));
    } else {
      kids.push(el('p', { class: 'caption' }, ['The video is not working here right now (its link expired). This is a fault on our side.']));
      kids.push(el('p', { class: 'caption' }, [el('button', { type: 'button', style: 'min-height:44px;padding:8px 16px;border-radius:999px;border:1px solid currentColor;background:transparent;color:inherit;font:inherit', onclick: function () { NV.state = 'loading'; if (state.session) render(); startVideo(true); } }, ['Try again'])]));
    }
    var r = ytRow(); if (r) kids.push(r);
    return el('div', { class: 'lv' }, kids);
  }
  function startVideo(retry) {
    if (state.session && state.session.video && state.session.video.provider === 'none') return;
    if (!retry) NV.state = 'loading';
    fetchVideoUrl(function (e) {
      if (!e) { NV.state = 'unavailable'; if (state.session) render(); return; }
      NV.state = 'ready';
      NV.url = e.url; NV.expires = e.expires_at;
      NV.video = el('video', { controls: '', playsinline: '', preload: 'metadata', class: 'lv-video' });
      NV.video.src = e.url;
      NV.video.addEventListener('error', function () { refreshVideo(); });
      if (state.session) render();
    });
    if (!retry) setInterval(function () { if (NV.video && NV.expires - nowSec() < 600) refreshVideo(); }, 30000);
  }

  function bidiParts(t) {
    return String(t).split(/([A-Za-z][A-Za-z\- ]*[A-Za-z])/).map(function (p, i) {
      return i % 2 ? el('bdi', { dir: 'ltr', style: 'white-space:nowrap' }, [p]) : p;
    });
  }
  function renderLesson(s) {
    var vid = s.video || {};
    var children = [];
    if (vid.provider === 'none') {
      children.push(el('p', { class: 'caption' }, ['This lesson is PDF-based; there is no video.']));
    } else {
      children.push(videoBlock());
    }
    if (s.lesson && s.lesson.summary) children.push(el('p', {}, [s.lesson.summary]));
    if (s.lesson && s.lesson.challenge) {
      var ch = s.lesson.challenge;
      children.push(el('div', { class: 'challenge' }, [
        el('h3', {}, bidiParts(ch.title)),
        el('p', {}, [ch.intro]),
        el('ol', {}, ch.items.map(function (t) { return el('li', {}, [t]); })),
        el('p', { class: 'caption' }, [ch.note])
      ]));
    }
    var lp = panel('play', 'Lesson', 'Video and the session challenge', children, 'tone-night', 'span-7', 'sec-lesson');
    if (s.grammar && s.grammar.length) {
      var gb = el('button', { type: 'button', class: 'gram-btn', 'aria-label': 'Open grammar summary', title: 'Grammar' }, [icon('grammar', 22)]);
      gb.addEventListener('click', function () { openGrammar(s, gb); });
      lp.querySelector('.panel-head').appendChild(gb);
    }
    return lp;
  }

  function ruleCard(r) {
    return el('div', { class: 'rule' }, [
      el('h3', {}, [r.title]),
      el('p', { class: 'ar-text' }, rich(r.rule)),
      r.forms ? el('ul', { class: 'rule-forms', dir: 'ltr' }, r.forms.map(function (f) { return el('li', {}, [f]); })) : null,
      r.note ? el('p', { class: 'ar-text' }, rich(r.note)) : null,
      el('ul', { class: 'rule-examples' }, r.examples.map(function (x) {
        return el('li', {}, [
          el('span', { class: 'rule-de', dir: 'ltr' }, [x.de]),
          el('span', { class: 'rule-ar ar-text' }, [x.ar])
        ]);
      }))
    ]);
  }

  function openGrammar(s, opener) {
    var rules = s.grammar, idx = 0;
    var old = document.getElementById('gram-modal'); if (old) old.remove();
    var body = el('div', { class: 'gram-body' }, []);
    var count = el('span', { class: 'gram-count', 'aria-live': 'polite' }, []);
    var dots = el('div', { class: 'gram-dots' }, rules.map(function (r, i) {
      var d = el('button', { type: 'button', class: 'gram-dot', 'aria-label': 'Rule ' + (i + 1) }, []);
      d.addEventListener('click', function () { show(i); });
      return d;
    }));
    var prev = el('button', { type: 'button', class: 'gram-nav', 'aria-label': 'Previous rule' }, ['←']);
    var next = el('button', { type: 'button', class: 'gram-nav', 'aria-label': 'Next rule' }, ['→']);
    var close = el('button', { type: 'button', class: 'gram-close', 'aria-label': 'Close grammar' }, ['×']);
    var box = el('div', { class: 'gram-box', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Grammar summary', tabindex: '-1' }, [
      el('div', { class: 'gram-top' }, [el('strong', {}, ['Grammar']), el('div', { class: 'gram-pager' }, [prev, count, next]), close]),
      body, dots
    ]);
    var ov = el('div', { id: 'gram-modal', class: 'gram-overlay' }, [box]);
    function show(i) {
      idx = Math.max(0, Math.min(rules.length - 1, i));
      body.innerHTML = ''; body.appendChild(ruleCard(rules[idx])); body.scrollTop = 0;
      count.textContent = (idx + 1) + ' / ' + rules.length;
      prev.disabled = idx === 0; next.disabled = idx === rules.length - 1;
      Array.prototype.forEach.call(dots.children, function (d, k) { d.setAttribute('aria-current', k === idx ? 'true' : 'false'); });
    }
    function shut() { document.removeEventListener('keydown', key); ov.remove(); document.body.style.overflow = ''; if (opener) opener.focus(); }
    function key(e) {
      if (e.key === 'Escape') shut();
      else if (e.key === 'ArrowRight') show(idx + 1);
      else if (e.key === 'ArrowLeft') show(idx - 1);
    }
    prev.addEventListener('click', function () { show(idx - 1); });
    next.addEventListener('click', function () { show(idx + 1); });
    close.addEventListener('click', shut);
    ov.addEventListener('click', function (e) { if (e.target === ov) shut(); });
    document.addEventListener('keydown', key);
    document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    show(0); box.focus();
  }

  function renderGrammar(s) { return null; }

  function renderMaterials(s) {
    if (!s.materials || !s.materials.length) return null;
    var blocks = s.materials.map(function (m) {
      return el('details', { class: 'material' }, [
        el('summary', {}, [m.title + ' (' + m.pages.length + ' pages)']),
        el('div', { class: 'material-body' }, [
          el('p', { class: 'caption' }, [m.source || '']),
          el('div', { class: 'pages' }, m.pages.map(function (p, i) {
            return el('img', { src: p, loading: 'lazy', alt: m.title + ' - page ' + (i + 1) });
          }))
        ])
      ]);
    });
    return panel('doc', 'Study files', 'The original files for reading. Open any file and read in order.', blocks, 'tone-gold', 'span-12', null);
  }

  function renderVocab(s) {
    var active = s.vocab[state.tab];
    var tabs = el('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Word categories' },
      s.vocab.map(function (v, i) {
        return el('button', {
          class: 'tab', type: 'button', role: 'tab', 'aria-selected': String(i === state.tab),
          onclick: function () { state.tab = i; render(); }
        }, [v.label, el('span', { class: 'tab-count' }, [arNum(v.words.length)])]);
      }));
    var hasArt = active.words.some(function (w) { return !!(w.article || w.tint); });
    var legend = el('div', { class: 'art-legend', dir: 'ltr' }, [
      el('span', { class: 'art-ico art-ico-der' }, ['der']),
      el('span', { class: 'art-ico art-ico-die' }, ['die']),
      el('span', { class: 'art-ico art-ico-das' }, ['das'])
    ]);
    function wordLi(w) {
      var g = w.article || w.tint || '';
      var li = el('li', { class: 'word' + (g ? ' wbg-' + g : '') }, [
        el('span', { class: 'word-de', dir: 'ltr' }, [articleSpan(w.article), w.de]),
        el('span', { class: 'word-ar ar-text' }, [w.ar])
      ]);
      if (w.audio) return tapRow(li, w.audio, 'Play: ' + w.de);
      li.appendChild(el('span', { class: 'noaudio', title: 'No audio yet' }, ['No audio']));
      return li;
    }
    var list;
    if (hasArt) {
      var cols = ['der', 'die', 'das'].map(function (g) {
        return el('ul', { class: 'words wcol wcol-' + g }, active.words.filter(function (w) { return (w.article || w.tint) === g; }).map(wordLi));
      });
      var rest = active.words.filter(function (w) { return !(w.article || w.tint); });
      list = el('div', { class: 'wgroups', role: 'tabpanel', 'aria-label': active.label }, [el('div', { class: 'wcols' }, cols)]
        .concat(rest.length ? [el('ul', { class: 'words wrest' }, rest.map(wordLi))] : []));
    } else {
      list = el('ul', { class: 'words', role: 'tabpanel', 'aria-label': active.label }, active.words.map(wordLi));
    }
    return panel('book', 'Vocabulary', '', [legend, tabs, list], '', 'span-12', 'sec-vocab');
  }

  function renderSentences(s) {
    var list = el('ul', { class: 'sentences' }, s.sentences.map(function (sent) {
      var li = el('li', { class: 'sentence' }, [
        el('span', { class: 'sentence-text' }, [
          el('span', { class: 'sentence-de', dir: 'ltr' }, [sent.de]),
          el('span', { class: 'sentence-ar ar-text' }, [sent.ar])
        ])
      ]);
      if (sent.audio) return tapRow(li, sent.audio, 'Play: ' + sent.de);
      li.appendChild(el('span', { class: 'noaudio', title: 'No audio yet' }, ['No audio']));
      return li;
    }));
    return panel('speaker', 'Listening to sentences', 'Listen, then repeat out loud', [list], 'tone-night', 'span-12', null);
  }

  function renderCards(s) {
    var card = s.cards[state.cardIndex];
    var pct = Math.round(((state.cardIndex + 1) / s.cards.length) * 100);
    var flash = el('button', {
      class: 'flashcard', type: 'button',
      'data-flipped': String(state.revealed),
      'aria-label': state.revealed ? 'Hide meaning' : 'Show meaning',
      onclick: function () { state.revealed = !state.revealed; render(); }
    }, [
      el('span', { class: 'flash-face flash-front' }, [
        el('span', { class: 'flashcard-de', dir: 'ltr' }, [articleSpan(card.article), card.de]),
        el('span', { class: 'flashcard-hint' }, ['Say the meaning out loud, then tap to check'])
      ]),
      el('span', { class: 'flash-face flash-back' }, [
        el('span', { class: 'flashcard-ar ar-text' }, [card.ar]),
        el('span', { class: 'flashcard-hint' }, ['Tap to go back to the word'])
      ])
    ]);
    return panel('cards', 'Word practice', 'Quick cards for memorising', [
      el('div', { class: 'card-progress' }, [
        el('span', {}, ['Card ' + (state.cardIndex + 1) + ' of ' + s.cards.length]),
        el('span', { class: 'progressbar' }, [el('i', { style: 'width:' + pct + '%' })])
      ]),
      el('div', { class: 'flash-scene' }, [flash]),
      el('div', { class: 'card-actions' }, [
        card.audio ? audioButton(card.audio, 'Listen: ' + card.de) : null,
        el('button', { class: 'btn btn-secondary', type: 'button', onclick: function () { state.revealed = !state.revealed; render(); } }, [state.revealed ? 'Hide' : 'Show meaning']),
        el('button', {
          class: 'btn btn-primary', type: 'button', onclick: function () {
            state.cardIndex = (state.cardIndex + 1) % s.cards.length;
            state.revealed = false;
            if (state.cardIndex === 0) markTracker('did-cards');
            render();
          }
        }, ['Next'])
      ])
    ], 'tone-red', 'span-5', 'sec-practice');
  }

  function renderQuiz(s) {
    var answers = store.data.answers;
    var correct = 0, checked = 0;
    var grid = el('div', { class: 'quiz-grid' });
    s.quiz.forEach(function (q, qi) {
      var st = answers[qi];
      if (st && st.result) checked += 1;
      if (st && st.result === 'correct') correct += 1;
      var qEl = el('div', { class: 'quiz-q qa ctl' }, [
        el('div', { class: 'quiz-prompt' }, [
          el('span', { class: 'quiz-num' }, [arNum(qi + 1)]),
          el('span', { dir: 'ltr' }, [q.prompt])
        ]),
        el('div', { class: 'bq-act' }, [
          el('button', {
            class: 'btn btn-secondary', type: 'button', 'aria-label': 'Check',
            disabled: (!st || st.result === 'correct') ? '' : null,
            onclick: function () {
              if (!answers[qi]) return;
              answers[qi].result = answers[qi].choice === q.answer ? 'correct' : 'wrong';
              if (answers[qi].result === 'correct' && s.quiz.every(function (_, i) { return answers[i] && answers[i].result === 'correct'; })) markTracker('did-quiz');
              persist(); render();
            }
          }, ['✓'])
        ]),
        el('div', { class: 'quiz-options', dir: 'ltr' }, q.options.map(function (opt, oi) {
          var selected = st && st.choice === oi;
          var lockedRight = st && st.result === 'correct' && oi === q.answer;
          var wrong = selected && st.result === 'wrong';
          return el('button', {
            class: 'quiz-opt' + (String(q.options[oi]).length > 14 ? ' long' : ''), type: 'button',
            'data-selected': String(!!selected), 'data-correct': String(!!lockedRight), 'data-wrong': String(!!wrong),
            onclick: function () {
              if (answers[qi] && answers[qi].result === 'correct') return;
              answers[qi] = { choice: oi, result: null };
              persist(); render();
            }
          }, [opt]);
        }))
      ]);
      var qFull = q.prompt.replace(/_+/, q.options[q.answer]);
      if (st && st.result === 'correct') qEl.appendChild(fbBox(true, qFull, q.ar, q.why));
      if (st && st.result === 'wrong') qEl.appendChild(fbBox(false, qFull, q.ar, q.why));
      grid.appendChild(qEl);
    });
    return panel('quiz', 'Short test', 'Choose an answer, then press Check', [
      grid,
      checked > 0 ? el('div', { class: 'quiz-summary' }, [
        el('span', {}, ['Score: ' + correct + ' of ' + s.quiz.length + ' correct'])
      ]) : null
    ], '', 'span-12', 'sec-quiz');
  }


  window.__resetAnswers = function () { store.data.answers = {}; persist(); render(); };

  /* ---------- practice drills (own content) ---------- */
  function drillAllDone(s) {
    var p = s.practice, ans = store.data.answers;
    var b = p.build.every(function (_, i) { return ans['b' + i] && ans['b' + i].result === 'correct'; });
    var e = p.errors.every(function (_, i) { return ans['e' + i] && ans['e' + i].result === 'correct'; });
    return b && e;
  }
  function buildHint(guess, it) {
    var g = guess.split(' '), t = it.answer.replace(/[.?]$/, '').split(' ');
    var n = 0; while (n < g.length && g[n] === t[n]) n++;
    var rule = '';
    if (/\bkann\b/.test(it.answer)) rule = ' القاعدة: kann في المركز التاني، والفعل التاني (المصدر) في آخر الجملة.';
    else if (/^Wie\b/.test(it.answer)) rule = ' القاعدة: في السؤال بـ Wie، الفعل بعد Wie على طول.';
    else rule = ' القاعدة: الفعل في المركز التاني.';
    return [
      el('div', {}, ['Your order: ', el('bdi', { dir: 'ltr' }, [guess])]),
      el('div', { class: 'ar-text' }, rich(n > 0 ? 'أول ' + n + ' كلمة مظبوطة. الكلمة رقم ' + (n + 1) + ' مش في مكانها.' : 'الكلمة الأولى مش مظبوطة.' + rule)),
      n > 0 ? el('div', { class: 'ar-text' }, rich(rule.trim())) : null
    ].filter(Boolean);
  }
  function ruleFor(full) {
    if (/\bkann\b/.test(full)) return 'kann في المركز التاني، والفعل التاني (المصدر) في آخر الجملة.';
    if (/^Wie\b/.test(full)) return 'في السؤال بـ Wie، الفعل بعد Wie على طول.';
    return 'الفعل في المركز التاني.';
  }
  function fbBox(ok, full, ar, why, extra) {
    var kids = [el('div', { class: 'fb-head' }, [ok ? 'Correct ✓' : 'Not yet.'])];
    if (extra) kids.push(el('div', { class: 'fb-note' }, extra));
    var note = [];
    note.push(el('div', { dir: 'ltr', style: 'text-align:left' }, [full]));
    if (ar) note.push(el('div', { class: 'ar-text' }, [ar]));
    if (why) note.push(el('div', { class: 'ar-text' }, rich(why)));
    kids.push(el('div', { class: 'fb-note' }, note));
    return el('div', { class: 'feedback', 'data-kind': ok ? 'correct' : 'wrong', role: 'status' }, kids);
  }
  function renderBuild(s) {
    var ans = store.data.answers;
    return s.practice.build.map(function (it, i) {
      var key = 'b' + i;
      var st = ans[key] || { picked: [], result: null };
      var done = st.result === 'correct';
      var picked = el('div', { class: 'answer-row', dir: 'ltr', 'aria-label': 'Your sentence' }, st.picked.map(function (ti, pos) {
        return el('button', { class: 'tile tile-picked', type: 'button', 'data-tile': it.tiles[ti], onclick: function () {
          if (done) return;
          var cur = ans[key] || { picked: [], result: null };
          cur.picked.splice(pos, 1); cur.result = null; ans[key] = cur; persist(); render();
        } }, [it.tiles[ti]]);
      }));
      var bank = el('div', { class: 'tile-bank', dir: 'ltr' }, it.tiles.map(function (t, ti) {
        var used = st.picked.indexOf(ti) !== -1;
        return el('button', { class: 'tile', type: 'button', 'data-tile': t, disabled: used || done ? '' : null, onclick: function () {
          var cur = ans[key] || { picked: [], result: null };
          cur.picked.push(ti); cur.result = null; ans[key] = cur; persist(); render();
        } }, [t]);
      }));
      var guess = st.picked.map(function (ti) { return it.tiles[ti]; }).join(' ');
      var wrap = el('div', { class: 'quiz-q build-q ctl' }, [
        el('div', { class: 'quiz-prompt', 'aria-label': 'Put the words in order' }, [el('span', { class: 'quiz-num' }, [arNum(i + 1)])]),
        picked,
        el('div', { class: 'bq-act' }, [
          el('button', { class: 'btn btn-secondary check-build', type: 'button', 'aria-label': 'Check',
            disabled: (st.picked.length === it.tiles.length && !done) ? null : '',
            onclick: function () {
              var cur = ans[key]; if (!cur) return;
              var built = cur.picked.map(function (ti) { return it.tiles[ti]; }).join(' ');
              cur.result = (built === it.answer.replace(/[.?]$/, '')) ? 'correct' : 'wrong';
              if (cur.result === 'correct' && drillAllDone(s)) markTracker('did-practice');
              persist(); render();
            } }, ['✓'])
        ]),
        bank
      ]);
      if (st.result === 'correct') wrap.appendChild(fbBox(true, it.answer, it.ar, ruleFor(it.answer)));
      if (st.result === 'wrong') wrap.appendChild(el('div', { class: 'feedback', 'data-kind': 'wrong', role: 'status' }, [el('div', { class: 'fb-head' }, ['Not yet.']), el('div', { class: 'fb-note' }, buildHint(guess, it))]));
      return wrap;
    });
  }
  function renderErrors(s) {
    var ans = store.data.answers;
    return s.practice.errors.map(function (it, i) {
      var key = 'e' + i, st = ans[key];
      var wrap = el('div', { class: 'quiz-q qa ctl er' }, [
        el('div', { class: 'bq-act' }, [el('button', { class: 'btn btn-secondary', type: 'button', 'aria-label': 'Check', disabled: (!st || st.result === 'correct') ? '' : null,
          onclick: function () {
            ans[key].result = ans[key].choice === it.answer ? 'correct' : 'wrong';
            if (ans[key].result === 'correct' && drillAllDone(s)) markTracker('did-practice');
            persist(); render();
          } }, ['✓'])]),
        el('div', { class: 'quiz-options', dir: 'ltr' }, it.options.map(function (opt, oi) {
          var selected = st && st.choice === oi;
          return el('button', { class: 'quiz-opt' + ' long', type: 'button',
            'data-selected': String(!!selected), 'data-correct': String(!!(st && st.result === 'correct' && oi === it.answer)), 'data-wrong': String(!!(selected && st.result === 'wrong')),
            onclick: function () { if (st && st.result === 'correct') return; ans[key] = { choice: oi, result: null }; persist(); render(); }
          }, [opt]);
        }))
      ]);
      if (st && st.result) wrap.appendChild(fbBox(st.result === 'correct', it.options[it.answer], it.ar, it.why));
      return wrap;
    });
  }
  /* ---------- spoken-answer comparison (approximate, browser speech service) ---------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var CONSENT_KEY = 'german-site.speech-ok';
  function hasConsent() { try { return localStorage.getItem(CONSENT_KEY) === '1'; } catch (e) { return false; } }
  function normWords(t) { return String(t).toLowerCase().replace(/ß/g, 'ss').replace(/[.,!?;:"'“”„]/g, ' ').split(/\s+/).filter(Boolean); }
  function compareWords(expected, heard) {
    var a = normWords(expected), b = normWords(heard), m = a.length, n = b.length, i, j;
    var L = []; for (i = 0; i <= m; i++) { L.push(new Array(n + 1).fill(0)); }
    for (i = m - 1; i >= 0; i--) for (j = n - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    var ok = new Array(m).fill(false); i = 0; j = 0;
    while (i < m && j < n) { if (a[i] === b[j]) { ok[i] = true; i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
    return { words: a, ok: ok, matched: ok.filter(Boolean).length };
  }
  function startSpeech(i, expected) {
    var st = state.speech[i] = { status: 'listening' };
    var rec = new SR();
    rec.lang = 'de-DE'; rec.interimResults = false; rec.maxAlternatives = 1; rec.continuous = false;
    rec.onresult = function (ev) { var r = ev.results[0][0]; st.status = 'done'; st.heard = r.transcript; };
    rec.onerror = function (ev) {
      st.status = 'error';
      st.err = ev.error === 'not-allowed' || ev.error === 'service-not-allowed' ? 'Microphone or speech service permission was denied.'
        : ev.error === 'no-speech' ? 'No speech was heard. Try again.'
        : ev.error === 'network' ? 'The speech service could not be reached.'
        : ev.error === 'audio-capture' ? 'No microphone was found.' : 'Speech check failed (' + ev.error + ').';
    };
    rec.onend = function () { if (st.status === 'listening') { st.status = 'error'; st.err = 'No speech was heard. Try again.'; } render(); };
    try { rec.start(); } catch (e) { st.status = 'error'; st.err = 'Speech check could not start.'; }
    render();
  }
  function micBtn(it, i) {
    if (!SR) return null;
    var st = state.speech[i];
    var label = st && st.status === 'listening' ? 'Listening' : (st && st.status === 'done' ? 'Say it again in German' : 'Say it in German');
    return el('button', { class: 'btn btn-ghost mic-btn', type: 'button', 'aria-label': label, title: label, disabled: (st && st.status === 'listening') ? '' : null, onclick: function () {
      if (hasConsent()) startSpeech(i, it.de); else { state.speech[i] = { status: 'consent' }; render(); }
    } }, [icon('mic', 20)]);
  }
  function speechBlock(it, i) {
    var st = state.speech[i];
    if (!SR) return el('p', { class: 'caption speech-note' }, ['Speech check is not available in this browser. Try Chrome or Edge on Android or desktop, or Safari.']);
    var kids = [];
    if (st && st.status === 'consent') {
      kids.push(el('div', { class: 'speech-consent', dir: 'rtl' }, [
        el('p', {}, ['قبل ما نسجّل: التعرّف على الكلام بيتم من خلال المتصفح. حسب المتصفح، تسجيل صوتك ممكن يتبعت لخدمة التعرّف على الكلام عند الشركة اللي عملت المتصفح عشان يتحوّل لنص. الموقع نفسه ما بيحفظ صوتك.']),
        el('p', {}, ['النتيجة تقريبية: بتقارن الكلام اللي المتصفح سمعه بالجملة المطلوبة. دي مش درجة للنطق.']),
        el('div', { class: 'speech-consent-act', dir: 'ltr' }, [
          el('button', { class: 'btn btn-secondary', type: 'button', onclick: function () { try { localStorage.setItem(CONSENT_KEY, '1'); } catch (e) {} startSpeech(i, it.de); } }, ['I agree, start']),
          el('button', { class: 'btn btn-ghost', type: 'button', onclick: function () { delete state.speech[i]; render(); } }, ['Cancel'])
        ])
      ]));
    } else if (st && st.status === 'listening') {
      kids.push(el('div', { class: 'speech-live', role: 'status' }, ['Listening… say the sentence in German.']));
    } else if (st && st.status === 'error') {
      kids.push(el('div', { class: 'speech-live', role: 'status' }, [st.err]));
    } else if (st && st.status === 'done') {
      var c = compareWords(it.de, st.heard);
      kids.push(el('div', { class: 'speech-res', role: 'status', dir: 'ltr' }, [
        el('div', { class: 'speech-heard' }, ['Heard: ', el('bdi', {}, [st.heard])]),
        el('div', { class: 'speech-words' }, c.words.map(function (w, k) { return el('span', { class: 'sw ' + (c.ok[k] ? 'sw-ok' : 'sw-miss') }, [it.de.replace(/[.,!?]/g, '').split(/\s+/)[k] || w]); })),
        el('div', { class: 'speech-sum' }, [c.matched + ' of ' + c.words.length + ' words matched']),
        el('div', { class: 'speech-ar', dir: 'rtl' }, ['مقارنة تقريبية بين النص اللي سمعه المتصفح والجملة المطلوبة. مش تقييم للنطق.'])
      ]));
    }
    return el('div', { class: 'speech' }, kids);
  }
  function renderTranslate(s) {
    return s.practice.translate.map(function (it, i) {
      var open = !!state.shown[i];
      return el('div', { class: 'quiz-q ctl tr' }, [
        el('div', { class: 'quiz-prompt' }, [el('span', { class: 'quiz-num' }, [String(i + 1)]), el('span', { class: 'ar-text' }, [it.ar])]),
        open ? tapRow(el('div', { class: 'feedback reveal', 'data-kind': 'correct', dir: 'ltr' }, [el('span', {}, [it.de])]), it.audio || ('audio/tr' + (i + 1) + '.mp3'), 'Play: ' + it.de) : null,
        speechBlock(it, i),
        el('div', { class: 'bq-act' }, [micBtn(it, i), el('button', { class: 'btn btn-secondary reveal-btn', type: 'button', 'aria-label': open ? 'Hide answer' : 'Show answer', 'aria-expanded': String(open), title: open ? 'Hide answer' : 'Show answer', onclick: function () { state.shown[i] = !state.shown[i]; render(); } }, [icon(open ? 'up' : 'down', 20)])])
      ]);
    });
  }
  function withReset(sec, label, fn) {
    if (!sec) return sec;
    var b = el('button', { type: 'button', class: 'sec-reset', 'aria-label': 'Reset ' + label, title: 'Reset all questions in this section', onclick: function () {
      fn(); persist(); render();
    } }, [icon('reset', 20)]);
    sec.querySelector('.panel-head').appendChild(b);
    return sec;
  }
  function resetQuizAll() {
    var a = store.data.answers; Object.keys(a).forEach(function (k) { if (/^\d+$/.test(k)) delete a[k]; });
  }
  function resetDrillsAll() {
    var a = store.data.answers; Object.keys(a).forEach(function (k) { if (/^[bet]\d+$/.test(k)) delete a[k]; });
    if (state.speech) Object.keys(state.speech).forEach(function (k) { delete state.speech[k]; });
    if (state.shown) Object.keys(state.shown).forEach(function (k) { delete state.shown[k]; });
  }

  function renderDrills(s) {
    if (!s.practice) return null;
    var modes = [['Sentence order', renderBuild], ['Find the mistake', renderErrors], ['Translate', renderTranslate]];
    var tabs = el('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Exercise types' }, modes.map(function (m, i) {
      return el('button', { class: 'tab drill-tab', type: 'button', role: 'tab', 'aria-selected': String(i === state.drill), onclick: function () { state.drill = i; render(); } }, [m[0]]);
    }));
    var items = modes[state.drill][1](s);
    var body = el('div', { class: 'quiz-grid drill-body' }, items);
    return panel('cards', 'Sentence exercises', 'Three short steps: order, correct, translate', [tabs, body], '', 'span-12', 'sec-drills');
  }

  function markTracker(id) {
    if (!store.data.tracker[id]) {
      store.data.tracker[id] = new Date().toISOString();
      persist();
    }
  }

  /* ---------- nav ---------- */
  function renderNav() {
    var items = [
      ['tracker', 'Progress', 'chart'], ['lesson', 'Lesson', 'play'], ['vocab', 'Words', 'book'],
      ['practice', 'Cards', 'cards'], ['drills', 'Sentences', 'doc'], ['quiz', 'Test', 'quiz']
    ];
    return el('nav', { class: 'navbar', 'aria-label': 'Page sections' }, [
      el('div', { class: 'navbar-inner' }, items.map(function (it) {
        return el('button', {
          class: 'navbtn', type: 'button',
          onclick: function () {
            var t = document.getElementById('sec-' + it[0]);
            if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, [icon(it[2], 20), el('span', {}, [it[1]])]);
      }))
    ]);
  }

  function persist() {
    store.data.updatedAt = new Date().toISOString();
    store.saveLocal();
    if (!navigator.onLine) { state.syncState = 'offline-queued'; return; }
    store.flush(setSync);
  }

  function render() {
    var app = document.getElementById('app');
    app.textContent = '';
    var s = state.session;
    if (!s) { app.appendChild(el('p', { class: 'loading' }, ['Loading…'])); return; }
    app.appendChild(renderNav());
    app.appendChild(renderHero(s));
    app.appendChild(el('div', { class: 'wrap' }, [
      el('div', { class: 'grid' }, [
        renderTracker(s),
        renderLesson(s),
        renderCards(s),
        renderVocab(s),
        renderSentences(s),
        renderGrammar(s),
        renderMaterials(s),
        withReset(renderDrills(s), 'sentence exercises', resetDrillsAll),
        withReset(renderQuiz(s), 'test', resetQuizAll)
      ].filter(Boolean))
    ]));
  }

  window.addEventListener('online', function () {
    if (state.syncState === 'offline-queued') { store.flush(setSync); render(); }
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  store.loadLocal();
  startVideo();
  store.detectEndpoint(function () {
    store.pullRemote(function () {
      fetch(CONFIG.sessionUrl).then(function (r) { return r.json(); }).then(function (s) {
        state.session = s;
        render();
      }).catch(function () {
        document.getElementById('app').textContent = '';
        document.getElementById('app').appendChild(el('p', { class: 'loading' }, ['Could not load the session data. Try refreshing the page when the connection returns.']));
      });
    });
  });
})();
