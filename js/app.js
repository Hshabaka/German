/* German course site — Session 1 practice shell, design v2.
   Progress storage adapter: remote intermediary when configured, local queue otherwise.
   Offline: edits queue locally and flush on reconnect; a manual "re-read" is always offered. */
(function () {
  'use strict';

  var CONFIG = {
    sessionUrl: 'data/session-1.json',
    progressEndpoint: null, // set to the intermediary URL when it exists, e.g. 'https://<worker>/progress'
    localKey: 'german-site.progress.v1'
  };

  var arNum = function (n) { return Number(n).toLocaleString('ar-EG'); };

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

  function articleSpan(article) {
    if (!article) return null;
    return el('span', { class: 'art art-' + article, dir: 'ltr' }, [article]);
  }

  var currentAudio = null;
  function audioButton(src, label) {
    var btn = el('button', { class: 'audio-btn', type: 'button', 'aria-label': label, title: label }, [icon('speaker', 20)]);
    btn.addEventListener('click', function () {
      if (currentAudio) { currentAudio.pause(); currentAudio = null; }
      var a = new Audio((window.AUDIO_DATA && window.AUDIO_DATA[src]) || src);
      currentAudio = a;
      btn.dataset.state = 'playing';
      a.onended = function () { if (currentAudio === a) currentAudio = null; btn.dataset.state = ''; };
      a.onerror = function () { if (currentAudio === a) currentAudio = null; btn.dataset.state = ''; showAudioError(btn); };
      a.play().catch(function () { if (currentAudio === a) currentAudio = null; btn.dataset.state = ''; showAudioError(btn); });
    });
    return btn;
  }

  function showAudioError(btn) {
    if (btn.parentNode.querySelector('.audio-err')) return;
    btn.parentNode.appendChild(el('span', { class: 'audio-err', role: 'status' }, ['الصوت مش متاح دلوقتي']));
  }

  function renderBanner() {
    var kind, text;
    if (state.syncState === 'synced') { kind = 'ok'; text = 'تقدمك محفوظ ومتحدّث.'; }
    else if (state.syncState === 'error') { kind = 'error'; text = 'حصل خطأ في الحفظ.'; }
    else if (state.syncState === 'offline-queued') { kind = 'wait'; text = CONFIG.progressEndpoint ? 'أوفلاين — تعديلاتك محفوظة هنا وهتتبعت لما الإنترنت يرجع.' : 'أوفلاين — تعديلاتك محفوظة على الجهاز ده. الإرسال المركزي لسه مش مفعّل.'; }
    else { kind = 'wait'; text = 'الحفظ حاليًا على هذا الجهاز بس. المزامنة المركزية لسه مش شغالة — هتتفعّل لما خادم المزامنة يجهز.'; }
    return el('div', { class: 'banner', 'data-kind': kind, role: 'status' }, [
      el('span', {}, [text]),
      el('button', { class: 'btn btn-secondary', type: 'button', onclick: function () { store.flush(setSync); render(); } }, ['إعادة القراءة'])
    ]);
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
            el('span', { class: 'chip chip-level' }, ['ألماني ' + s.level]),
            el('span', { class: 'chip' }, ['A1-S01'])
          ]),
          el('h1', {}, [String(s.title).replace(/^الجلسة\s*(\d+)/, 'الدرس $1')]),
          el('p', { class: 'hero-sub' }, ['فيديو الدرس والقاعدة والتدريب في صفحة واحدة.'])
        ]),
        el('div', { class: 'ring', role: 'img', 'aria-label': 'نسبة الإنجاز ' + arNum(pct) + ' في المية' }, [
          svg,
          el('div', { class: 'ring-label' }, [
            el('span', { class: 'ring-pct' }, [arNum(pct) + '٪']),
            el('span', { class: 'ring-cap' }, ['منجز'])
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
      if (doneAt) li.appendChild(el('span', { class: 'done-at' }, [new Date(doneAt).toLocaleDateString('ar-EG')]));
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
      }, ['نزّل ملف تقدمك']),
      el('button', { class: 'btn btn-ghost', type: 'button', onclick: function () { fileInput.click(); } }, ['ارفع ملف تقدم']),
      fileInput
    ]);
    return panel('chart', 'تقدمك في الجلسة', 'علّم كل خطوة تخلصها', [list, tools], '', 'span-12', 'sec-tracker');
  }

  var NV = { state: 'loading', url: null, expires: 0, video: null, wrap: null, busy: false };
  var REG = { yt: '', nr: '' };
  fetch('data/registry.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (g) {
    var l = g && g.levels && g.levels.a1 && g.levels.a1.lessons && g.levels.a1.lessons[0];
    if (l && /^https:\/\/app\.notion\.com\//.test(l.notion_row || '')) REG.nr = l.notion_row;
    if (l && /^https:\/\/www\.youtube\.com\//.test(l.youtube || '') && l.youtube !== REG.yt) { REG.yt = l.youtube; if (state.session) render(); } else if (state.session) render();
  }).catch(function () {});
  function nowSec() { return Math.floor(Date.now() / 1000); }
  function fetchVideoUrl(done) {
    fetch('data/video-urls.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { var e = d && d['session-1']; done(e && e.url && e.expires_at > nowSec() ? e : null); })
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
  function ytRow() {
    var yt = REG.yt || (state.session && state.session.video && state.session.video.open_url) || '';
    if (!/^https:\/\/www\.youtube\.com\//.test(yt)) return null;
    return el('p', { class: 'caption', style: 'margin:8px 0 0' }, [el('a', { href: yt, target: '_blank', rel: 'noopener', style: 'display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:3px 11px;border-radius:999px;background:#c4302b;color:#fff;text-decoration:none;font-size:13px', 'aria-label': 'افتح الفيديو على يوتيوب' }, ['▶ يوتيوب ↗'])]);
  }
  function notionRow() {
    if (!REG.nr) return null;
    return el('a', { href: REG.nr, target: '_blank', rel: 'noopener', style: 'display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:3px 11px;border-radius:999px;background:#fff;color:#111;border:1px solid #111;text-decoration:none;margin-inline-start:8px;font-size:13px', 'aria-label': 'افتح السيشن في Notion' }, [el('span', { style: 'display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;border-radius:3px;border:1.3px solid #111;font:700 11px serif', 'aria-hidden': 'true' }, ['N']), 'Notion ↗']);
  }
  function ytFrame() {
    var yt = REG.yt || (state.session && state.session.video && state.session.video.open_url) || '';
    var u = youtubeEmbed(yt);
    if (!u) return null;
    return el('div', { class: 'video-wrap lv-wrap' }, [el('iframe', { src: u + '?rel=0&playsinline=1', title: 'فيديو السيشن على يوتيوب', style: 'width:100%;aspect-ratio:16/9;border:0;display:block', allow: 'accelerometer; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: '', referrerpolicy: 'strict-origin-when-cross-origin' })]);
  }
  var AUD = { list: [], i: 0, el: null, all: false };
  fetch('data/audio.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (g) {
    var l = g && g.a1; if (l && l.length) { AUD.list = l; if (state.session) render(); }
  }).catch(function () {});
  function audSet(i) {
    var t = AUD.list[i]; if (!t || !AUD.el) return; AUD.i = i; AUD.el.src = t.src;
    var lab = document.getElementById('aud-title'); if (lab) lab.textContent = t.title;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: 'Deutsch by Barbary', album: 'A1' });
      navigator.mediaSession.setActionHandler('nexttrack', AUD.list.length > 1 ? function () { audNext(true); } : null);
      navigator.mediaSession.setActionHandler('previoustrack', AUD.list.length > 1 ? function () { if (AUD.i > 0) { audSet(AUD.i - 1); AUD.el.play(); } } : null);
    }
  }
  function audNext(play) { if (AUD.i + 1 < AUD.list.length) { audSet(AUD.i + 1); if (play) AUD.el.play(); } }
  function audioRow() {
    if (!AUD.list.length) return null;
    var a = el('audio', { controls: '', preload: 'none', style: 'width:100%;margin-top:6px', 'aria-label': 'صوت الدرس' });
    AUD.el = a;
    a.addEventListener('ended', function () { if (AUD.all) audNext(true); });
    var box = el('div', { style: 'margin:10px 0 0' }, [a]);
    setTimeout(function () { audSet(AUD.i); }, 0);
    return box;
  }
  function videoBlock() {
    var kids = [];
    var yf = ytFrame();
    if (yf) {
      kids.push(yf);
      var row = el('p', { class: 'caption', style: 'margin:8px 0 0;display:flex;flex-wrap:wrap;gap:8px;align-items:center' }, []);
      var yr = ytRow(); if (yr) { var a = yr.firstChild; a.style.marginInlineStart = '0'; row.appendChild(a); }
      var nr = notionRow(); if (nr) row.appendChild(nr);
      kids.push(row);
      var ar = audioRow(); if (ar) kids.push(ar);
      return el('div', { class: 'lv' }, kids);
    }
    if (NV.video) {
      kids.push(el('div', { class: 'video-wrap lv-wrap' }, [NV.video]));
    } else if (NV.state === 'loading') {
      kids.push(el('p', { class: 'caption' }, ['بنجهّز الفيديو…']));
    } else {
      kids.push(el('p', { class: 'caption' }, ['الفيديو مش شغال هنا دلوقتي (رابطه انتهى). ده عطل عندنا.']));
      kids.push(el('p', { class: 'caption' }, [el('button', { type: 'button', style: 'min-height:44px;padding:8px 16px;border-radius:999px;border:1px solid currentColor;background:transparent;color:inherit;font:inherit', onclick: function () { NV.state = 'loading'; if (state.session) render(); startVideo(true); } }, ['جرّب تاني'])]));
    }
    var r = ytRow(); if (r) kids.push(r);
    return el('div', { class: 'lv' }, kids);
  }
  function startVideo(retry) {
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
    children.push(videoBlock());
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
    return panel('play', 'الدرس', 'الفيديو وتحدي الجلسة', children, 'tone-night', 'span-7', 'sec-lesson');
  }

  function renderGrammar(s) {
    if (!s.grammar || !s.grammar.length) return null;
    var grid = el('div', { class: 'rules' + (s.grammar.length > 2 ? ' cols-3' : '') }, s.grammar.map(function (r) {
      return el('div', { class: 'rule' }, [
        el('h3', {}, [r.title]),
        el('p', {}, [r.rule]),
        el('ul', { class: 'rule-examples' }, r.examples.map(function (x) {
          return el('li', {}, [
            el('span', { class: 'rule-de', dir: 'ltr' }, [x.de]),
            el('span', { class: 'rule-ar' }, [x.ar])
          ]);
        }))
      ]);
    }));
    return panel('grammar', 'القاعدة', 'Ich kann + الفعل في الآخر', [el('details', { class: 'rule-toggle' }, [el('summary', { style: 'cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:700' }, ['اعرض / اخفِ القاعدة']), grid])], 'tone-amber', 'span-7', null);
  }

  function renderMaterials(s) {
    if (!s.materials || !s.materials.length) return null;
    var blocks = s.materials.map(function (m) {
      return el('details', { class: 'material' }, [
        el('summary', {}, [m.title + ' (' + arNum(m.pages.length) + ' صفحات)']),
        el('div', { class: 'material-body' }, [
          el('p', { class: 'caption' }, [m.source || '']),
          el('div', { class: 'pages' }, m.pages.map(function (p, i) {
            return el('img', { src: p, loading: 'lazy', alt: m.title + ' — صفحة ' + (i + 1) });
          }))
        ])
      ]);
    });
    return panel('doc', 'مذاكرة الجلسة', 'الملفات الأصلية للقراءة — افتح أي ملف واقرا بالترتيب', blocks, 'tone-gold', 'span-12', null);
  }

  function renderVocab(s) {
    var active = s.vocab[state.tab];
    var tabs = el('div', { class: 'tabs', role: 'tablist', 'aria-label': 'تصنيفات الكلمات' },
      s.vocab.map(function (v, i) {
        return el('button', {
          class: 'tab', type: 'button', role: 'tab', 'aria-selected': String(i === state.tab),
          onclick: function () { state.tab = i; render(); }
        }, [v.label, el('span', { class: 'tab-count' }, [arNum(v.words.length)])]);
      }));
    var list = el('ul', { class: 'words', role: 'tabpanel', 'aria-label': active.label },
      active.words.map(function (w) {
        return el('li', { class: 'word' }, [
          w.audio ? audioButton(w.audio, 'اسمع: ' + w.de) : el('span', { class: 'noaudio', title: 'الصوت لسه مضافش' }, ['بدون صوت']),
          el('span', { class: 'word-de', dir: 'ltr' }, [articleSpan(w.article), w.de]),
          el('span', { class: 'word-ar' }, [w.ar])
        ]);
      }));
    return panel('book', 'الكلمات', 'der أزرق · die أحمر · das أخضر', [tabs, list,
      el('p', { class: 'caption' }, ['اضغط زر السماعة جنب أي كلمة تسمع نطقها.'])], '', 'span-12', 'sec-vocab');
  }

  function renderSentences(s) {
    var list = el('ul', { class: 'sentences' }, s.sentences.map(function (sent) {
      return el('li', { class: 'sentence' }, [
        sent.audio ? audioButton(sent.audio, 'اسمع: ' + sent.de) : el('span', { class: 'noaudio', title: 'الصوت لسه مضافش' }, ['بدون صوت']),
        el('span', { class: 'sentence-text' }, [
          el('span', { class: 'sentence-de', dir: 'ltr' }, [sent.de]),
          el('span', { class: 'sentence-ar' }, [sent.ar])
        ])
      ]);
    }));
    return panel('speaker', 'الجمل بالصوت', 'اسمع وكرر بصوت عالي', [list,
      el('p', { class: 'caption' }, ['الصوت تسجيل مولّد للتدريب، مش صوت المدرس.'])], 'tone-night', 'span-5', null);
  }

  function renderCards(s) {
    var card = s.cards[state.cardIndex];
    var pct = Math.round(((state.cardIndex + 1) / s.cards.length) * 100);
    var flash = el('button', {
      class: 'flashcard', type: 'button',
      'data-flipped': String(state.revealed),
      'aria-label': state.revealed ? 'إخفاء المعنى' : 'كشف المعنى',
      onclick: function () { state.revealed = !state.revealed; render(); }
    }, [
      el('span', { class: 'flash-face flash-front' }, [
        el('span', { class: 'flashcard-de', dir: 'ltr' }, [articleSpan(card.article), card.de]),
        el('span', { class: 'flashcard-hint' }, ['قول المعنى بصوت عالي، وبعدين اضغط تتأكد'])
      ]),
      el('span', { class: 'flash-face flash-back' }, [
        el('span', { class: 'flashcard-ar' }, [card.ar]),
        el('span', { class: 'flashcard-hint' }, ['اضغط ترجع للكلمة'])
      ])
    ]);
    return panel('cards', 'تدريب الكلمات', 'كروت سريعة للحفظ', [
      el('div', { class: 'card-progress' }, [
        el('span', {}, ['كارت ' + arNum(state.cardIndex + 1) + ' من ' + arNum(s.cards.length)]),
        el('span', { class: 'progressbar' }, [el('i', { style: 'width:' + pct + '%' })])
      ]),
      el('div', { class: 'flash-scene' }, [flash]),
      el('div', { class: 'card-actions' }, [
        el('button', { class: 'btn btn-secondary', type: 'button', onclick: function () { state.revealed = !state.revealed; render(); } }, [state.revealed ? 'إخفاء' : 'كشف المعنى']),
        el('button', {
          class: 'btn btn-primary', type: 'button', onclick: function () {
            state.cardIndex = (state.cardIndex + 1) % s.cards.length;
            state.revealed = false;
            if (state.cardIndex === 0) markTracker('did-cards');
            render();
          }
        }, ['التالي'])
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
            class: 'btn btn-secondary', type: 'button', 'aria-label': 'تحقق',
            disabled: (!st || st.result === 'correct') ? '' : null,
            onclick: function () {
              if (!answers[qi]) return;
              answers[qi].result = answers[qi].choice === q.answer ? 'correct' : 'wrong';
              if (answers[qi].result === 'correct' && s.quiz.every(function (_, i) { return answers[i] && answers[i].result === 'correct'; })) markTracker('did-quiz');
              persist(); render();
            }
          }, ['✓']),
          el('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': 'من الأول', onclick: function () { delete answers[qi]; persist(); render(); } }, ['↺'])
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
    return panel('quiz', 'اختبار سريع', 'اختار إجابة واضغط «تحقق»', [
      grid,
      el('div', { class: 'quiz-summary' }, [
        el('span', {}, [checked > 0 ? 'نتيجتك: ' + arNum(correct) + ' من ' + arNum(s.quiz.length) + ' صح' : 'جاوب الأسئلة بالترتيب اللي يريحك.']),
        el('button', { class: 'btn btn-ghost', type: 'button', onclick: function () { store.data.answers = {}; persist(); render(); } }, ['ابدأ من الأول'])
      ])
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
      el('div', {}, ['ترتيبك: ', el('bdi', { dir: 'ltr' }, [guess])]),
      el('div', {}, [n > 0 ? 'أول ' + arNum(n) + ' كلمة مظبوطة. الكلمة رقم ' + arNum(n + 1) + ' مش في مكانها.' : 'الكلمة الأولى مش مظبوطة.' + rule]),
      n > 0 ? el('div', {}, [rule.trim()]) : null
    ].filter(Boolean);
  }
  function ruleFor(full) {
    if (/\bkann\b/.test(full)) return 'kann في المركز التاني، والفعل التاني (المصدر) في آخر الجملة.';
    if (/^Wie\b/.test(full)) return 'في السؤال بـ Wie، الفعل بعد Wie على طول.';
    return 'الفعل في المركز التاني.';
  }
  function fbBox(ok, full, ar, why, extra) {
    var kids = [el('div', { class: 'fb-head' }, [ok ? 'صح ✓' : 'لسه.'])];
    if (extra) kids.push(el('div', { class: 'fb-note' }, extra));
    var note = [];
    note.push(el('div', { dir: 'ltr', style: 'text-align:left' }, [full]));
    if (ar) note.push(el('div', {}, [ar]));
    if (why) note.push(el('div', {}, [why]));
    kids.push(el('div', { class: 'fb-note' }, note));
    return el('div', { class: 'feedback', 'data-kind': ok ? 'correct' : 'wrong', role: 'status' }, kids);
  }
  function renderBuild(s) {
    var ans = store.data.answers;
    return s.practice.build.map(function (it, i) {
      var key = 'b' + i;
      var st = ans[key] || { picked: [], result: null };
      var done = st.result === 'correct';
      var picked = el('div', { class: 'answer-row', dir: 'ltr', 'aria-label': 'جملتك' }, st.picked.map(function (ti, pos) {
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
        el('div', { class: 'quiz-prompt', 'aria-label': 'رتّب الكلمات في جملة' }, [el('span', { class: 'quiz-num' }, [arNum(i + 1)])]),
        picked,
        el('div', { class: 'bq-act' }, [
          el('button', { class: 'btn btn-secondary check-build', type: 'button', 'aria-label': 'تحقق',
            disabled: (st.picked.length === it.tiles.length && !done) ? null : '',
            onclick: function () {
              var cur = ans[key]; if (!cur) return;
              var built = cur.picked.map(function (ti) { return it.tiles[ti]; }).join(' ');
              cur.result = (built === it.answer.replace(/[.?]$/, '')) ? 'correct' : 'wrong';
              if (cur.result === 'correct' && drillAllDone(s)) markTracker('did-practice');
              persist(); render();
            } }, ['✓']),
          el('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': 'من الأول', onclick: function () { delete ans[key]; persist(); render(); } }, ['↺'])
        ]),
        bank
      ]);
      if (st.result === 'correct') wrap.appendChild(fbBox(true, it.answer, it.ar, ruleFor(it.answer)));
      if (st.result === 'wrong') wrap.appendChild(el('div', { class: 'feedback', 'data-kind': 'wrong', role: 'status' }, [el('div', { class: 'fb-head' }, ['لسه.']), el('div', { class: 'fb-note' }, buildHint(guess, it))]));
      return wrap;
    });
  }
  function renderErrors(s) {
    var ans = store.data.answers;
    return s.practice.errors.map(function (it, i) {
      var key = 'e' + i, st = ans[key];
      var wrap = el('div', { class: 'quiz-q qa ctl er' }, [
        el('div', { class: 'bq-act' }, [el('button', { class: 'btn btn-secondary', type: 'button', 'aria-label': 'تحقق', disabled: (!st || st.result === 'correct') ? '' : null,
          onclick: function () {
            ans[key].result = ans[key].choice === it.answer ? 'correct' : 'wrong';
            if (ans[key].result === 'correct' && drillAllDone(s)) markTracker('did-practice');
            persist(); render();
          } }, ['✓']),
          el('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': 'من الأول', onclick: function () { delete ans[key]; persist(); render(); } }, ['↺'])]),
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
  function renderTranslate(s) {
    return s.practice.translate.map(function (it, i) {
      var open = !!state.shown[i];
      return el('div', { class: 'quiz-q ctl tr' }, [
        el('div', { class: 'quiz-prompt' }, [el('span', { class: 'quiz-num' }, [arNum(i + 1)]), el('span', {}, [it.ar])]),
        open ? el('div', { class: 'feedback reveal', 'data-kind': 'correct', dir: 'ltr' }, [it.de]) : null,
        el('div', { class: 'bq-act' }, [el('button', { class: 'btn btn-secondary reveal-btn', type: 'button', onclick: function () { state.shown[i] = !state.shown[i]; render(); } }, [open ? 'إخفاء' : 'اكشف'])])
      ]);
    });
  }
  function renderDrills(s) {
    if (!s.practice) return null;
    var modes = [['رتّب الجملة', renderBuild], ['لاقي الغلطة', renderErrors], ['ترجم واكشف', renderTranslate]];
    var tabs = el('div', { class: 'tabs', role: 'tablist', 'aria-label': 'أنواع التدريب' }, modes.map(function (m, i) {
      return el('button', { class: 'tab drill-tab', type: 'button', role: 'tab', 'aria-selected': String(i === state.drill), onclick: function () { state.drill = i; render(); } }, [m[0]]);
    }));
    var items = modes[state.drill][1](s);
    if (state.drill === 2) items.unshift(el('p', { class: 'caption tr-note' }, ['قولها بالألماني بصوت عالي، وبعدين اكشف.']));
    var body = el('div', { class: 'quiz-grid drill-body' }, items);
    return panel('cards', 'تدريب على الجمل', 'ثلاث خطوات قصيرة: رتّب، صحّح، ترجم', [tabs, body], '', 'span-12', 'sec-drills');
  }

  function renderExtra(s) {
    if (!s.extra || !(s.extra.links || s.extra.url)) return null;
    var links = s.extra.links || [{ title: 'افتح تدريب DW', url: s.extra.url }];
    var kids = [el('p', { style: 'margin:0 0 12px' }, [s.extra.label + ':'])];
    links.forEach(function (l) {
      kids.push(el('p', { style: 'margin:0 0 10px' }, [el('a', { class: 'extra-link', href: l.url, target: '_blank', rel: 'noopener' }, [l.title + ' ↗'])]));
    });
    kids.push(el('p', { class: 'caption' }, ['العنوان الرسمي: ', el('bdi', { lang: 'de', dir: 'ltr' }, [s.extra.source_title || 'Nicos Weg']), ' · المصدر: ', el('bdi', { dir: 'ltr' }, ['learngerman.dw.com']), ' (بيتفتح على موقع DW)']));
    return panel('link', 'تدريب إضافي', 'مصدر مجاني رسمي من Deutsche Welle', kids, 'tone-night', 'span-12', null);
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
      ['tracker', 'تقدمك', 'chart'], ['lesson', 'الدرس', 'play'], ['vocab', 'الكلمات', 'book'],
      ['practice', 'تدريب', 'cards'], ['drills', 'جمل', 'doc'], ['quiz', 'اختبار', 'quiz']
    ];
    return el('nav', { class: 'navbar', 'aria-label': 'أقسام الصفحة' }, [
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
    if (!s) { app.appendChild(el('p', { class: 'loading' }, ['بيحمّل…'])); return; }
    app.appendChild(renderNav());
    app.appendChild(renderHero(s));
    app.appendChild(el('div', { class: 'wrap' }, [
      renderBanner(),
      el('div', { class: 'grid' }, [
        renderTracker(s),
        renderLesson(s),
        renderCards(s),
        renderVocab(s),
        renderSentences(s),
        renderGrammar(s),
        renderMaterials(s),
        renderDrills(s),
        renderQuiz(s),
        renderExtra(s)
      ].filter(Boolean)),
      el('p', { class: 'closing' }, ['الصوت تسجيل مولّد للتدريب، مش صوت المدرس. ده نموذج أولي بمحتوى الجلسة الأولى. الكلمات والجمل اللي مكتوب جنبها «بدون صوت» صوتها لسه مش مضاف.'])
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
        document.getElementById('app').appendChild(el('p', { class: 'loading' }, ['مش قادر أحمّل بيانات الجلسة. جرّب تحديث الصفحة لما الإنترنت يرجع.']));
      });
    });
  });
})();
