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
            el('span', { class: 'chip' }, ['الجلسة الأولى'])
          ]),
          el('h1', {}, [s.title]),
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

  function renderLesson(s) {
    var vid = s.video || {};
    var embed = vid.provider === 'youtube' ? youtubeEmbed(vid.url) : null;
    var children = [];
    if (embed) {
      children.push(el('div', { class: 'video-wrap' }, [
        el('iframe', {
          src: embed, title: 'فيديو الدرس', loading: 'lazy',
          allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          allowfullscreen: ''
        })
      ]));
      children.push(el('p', { class: 'caption' }, [(vid.note || 'فيديو الدرس') + (vid.backup ? ' · ' + vid.backup : '')]));
      children.push(el('p', { class: 'caption' }, [el('a', { href: vid.url, target: '_blank', rel: 'noopener' }, ['افتح الفيديو على يوتيوب ↗']), ' (لو ظهرت إعلانات، افتحه من هنا وإنت داخل بحساب Premium)']));
    } else if (vid.url) {
      children.push(el('p', {}, [el('a', { href: vid.url, target: '_blank', rel: 'noopener' }, ['افتح فيديو الدرس'])]));
    }
    if (s.lesson && s.lesson.summary) children.push(el('p', {}, [s.lesson.summary]));
    if (s.lesson && s.lesson.challenge) {
      var ch = s.lesson.challenge;
      children.push(el('div', { class: 'challenge' }, [
        el('h3', {}, [ch.title]),
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
    return panel('grammar', 'القاعدة', 'Ich kann + الفعل في الآخر', [grid], 'tone-amber', 'span-7', null);
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
          w.audio ? audioButton(w.audio, 'اسمع: ' + w.de) : null,
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
        audioButton(sent.audio, 'اسمع: ' + sent.de),
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
      var qEl = el('div', { class: 'quiz-q' }, [
        el('div', { class: 'quiz-prompt' }, [
          el('span', { class: 'quiz-num' }, [arNum(qi + 1)]),
          el('span', { dir: 'ltr' }, [q.prompt])
        ]),
        el('div', { class: 'quiz-options', dir: 'ltr' }, q.options.map(function (opt, oi) {
          var selected = st && st.choice === oi;
          var lockedRight = st && st.result === 'correct' && oi === q.answer;
          var wrong = selected && st.result === 'wrong';
          return el('button', {
            class: 'quiz-opt', type: 'button',
            'data-selected': String(!!selected), 'data-correct': String(!!lockedRight), 'data-wrong': String(!!wrong),
            onclick: function () {
              if (answers[qi] && answers[qi].result === 'correct') return;
              answers[qi] = { choice: oi, result: null };
              persist(); render();
            }
          }, [opt]);
        })),
        el('div', {}, [
          el('button', {
            class: 'btn btn-secondary', type: 'button',
            disabled: (!st || st.result === 'correct') ? '' : null,
            onclick: function () {
              if (!answers[qi]) return;
              answers[qi].result = answers[qi].choice === q.answer ? 'correct' : 'wrong';
              if (answers[qi].result === 'correct' && s.quiz.every(function (_, i) { return answers[i] && answers[i].result === 'correct'; })) markTracker('did-quiz');
              persist(); render();
            }
          }, ['تحقق'])
        ])
      ]);
      if (st && st.result === 'correct') qEl.appendChild(el('div', { class: 'feedback', 'data-kind': 'correct', role: 'status' }, ['صح ✓']));
      if (st && st.result === 'wrong') qEl.appendChild(el('div', { class: 'feedback', 'data-kind': 'wrong', role: 'status' }, ['لسه. الصح: ' + q.options[q.answer] + ' — ' + q.why]));
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

  function renderExtra(s) {
    if (!s.extra || !(s.extra.links || s.extra.url)) return null;
    var links = s.extra.links || [{ title: 'افتح تدريب DW', url: s.extra.url }];
    var kids = [el('p', { style: 'margin:0 0 12px' }, [s.extra.label + ':'])];
    links.forEach(function (l) {
      kids.push(el('p', { style: 'margin:0 0 10px' }, [el('a', { class: 'extra-link', href: l.url, target: '_blank', rel: 'noopener' }, [l.title + ' ↗'])]));
    });
    kids.push(el('p', { class: 'caption' }, ['المصدر: Deutsche Welle (learngerman.dw.com)، بيتفتح على موقعهم الرسمي.']));
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
      ['practice', 'تدريب', 'cards'], ['quiz', 'اختبار', 'quiz']
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
        renderQuiz(s),
        renderExtra(s)
      ].filter(Boolean)),
      el('p', { class: 'closing' }, ['الصوت تسجيل مولّد للتدريب، مش صوت المدرس. ده نموذج أولي بمحتوى الجلسة الأولى.'])
    ]));
  }

  window.addEventListener('online', function () {
    if (state.syncState === 'offline-queued') { store.flush(setSync); render(); }
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  store.loadLocal();
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
