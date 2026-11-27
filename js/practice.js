/* A1 interactive practice built from each lesson's own exercise and quiz sections.
   Progress is saved only in this browser (localStorage). Nothing is synced. */
(function () {
  var KEY = 'german-a1-progress';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'class') e.className = attrs[k]; else if (k.indexOf('on') === 0) e[k] = attrs[k]; else e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function plain(parts) { return (parts || []).map(function (p) { return p.t; }).join(''); }
  function norm(s) {
    return String(s).toLowerCase().replace(/[\u064B-\u065F]/g, '').replace(/[.,!?;:()"'«»،؟]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  var ITEM = /^\s*(\d+)\s*\)\s*(.*)$/;
  var SUB = /^\s*([a-z])\s*\)\s*(.*)$/i;

  // Split a lesson into sections by heading_2 and pull out items and answers.
  function sections(blocks) {
    var out = [], cur = null;
    blocks.forEach(function (b) {
      if (b.type === 'heading_2') { cur = { h: plain(b.text), blocks: [] }; out.push(cur); }
      else if (cur) cur.blocks.push(b);
    });
    return out;
  }
  function parseSection(sec) {
    var items = [], ctx = [], answers = {}, lastA = null, notes = [];
    sec.blocks.forEach(function (b) {
      if (b.type === 'toggle') {
        (b.children || []).forEach(function (c) {
          var t = plain(c.text), m = t.match(/^\s*(\d+)\s*-\s*(\d+)\s*\)\s*(.*)$/), m2 = t.match(ITEM);
          if (m) { for (var i = +m[1]; i <= +m[2]; i++) answers[i] = { free: true, text: '' }; lastA = null; notes.push(m[3]); }
          else if (m2) { lastA = { text: m2[2] }; answers[+m2[1]] = lastA; }
          else if (lastA) { lastA.text += '\n' + t; }
        });
      } else if (b.type === 'paragraph') {
        var t = plain(b.text), m = t.match(ITEM);
        if (m) { items.push({ n: +m[1], text: m[2], ctx: ctx.join('  ') }); ctx = []; }
        else if (SUB.test(t) && items.length) { items[items.length - 1].text += '\n' + t; }
        else if (t.trim()) ctx.push(t);
      }
    });
    return { items: items, answers: answers };
  }

  function checkItem(item, ans) {
    var a = ans.text.split('\n')[0];
    // gap items: strip leading "a) " and allow alternatives separated by " / "
    var alts = a.split(/\s+\/\s+/).map(norm);
    return function (input) { var u = norm(input); return !!u && alts.indexOf(u) >= 0; };
  }

  function exercisePanel(sec, parsed, n, kind) {
    var st = load(); st[n] = st[n] || {}; st[n][kind] = st[n][kind] || {};
    var P = st[n][kind];
    var box = el('div', { class: 'pr-box' }, []);
    var score = el('div', { class: 'pr-score' }, []);
    function upd() {
      var done = 0, ok = 0, total = 0;
      parsed.items.forEach(function (it) { if (parsed.answers[it.n]) { total++; if (P[it.n] !== undefined) { done++; if (P[it.n] === 1) ok++; } } });
      score.textContent = 'اتحلّ ' + done + ' من ' + total + ' · صح ' + ok;
      return { done: done, total: total, ok: ok };
    }
    box.appendChild(score);
    parsed.items.forEach(function (it) {
      var ans = parsed.answers[it.n];
      var row = el('div', { class: 'pr-item' }, []);
      if (it.ctx) row.appendChild(el('p', { class: 'pr-ctx' }, [it.ctx]));
      var q = el('p', { class: 'pr-q' }, [it.n + ') ' + it.text.replace(/＿{2,}/g, '＿＿＿')]);
      if (/[A-Za-zÄÖÜäöüß]/.test(it.text) && !/[\u0600-\u06FF]/.test(it.text)) q.setAttribute('dir', 'ltr');
      row.appendChild(q);
      if (!ans || ans.free) {
        row.appendChild(el('p', { class: 'pr-note' }, [ans && ans.free ? 'إجابة حرة، مفيش تصحيح تلقائي.' : 'مفيش إجابة نموذجية مطابقة للسؤال ده في الملف.']));
        box.appendChild(row); return;
      }
      var inp = el('input', { type: 'text', class: 'pr-in', dir: 'auto', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'إجابة السؤال ' + it.n }, []);
      var fb = el('div', { class: 'pr-fb', 'aria-live': 'polite' }, []);
      var chk = checkItem(it, ans);
      function mark() { row.className = 'pr-item' + (P[it.n] === 1 ? ' ok' : P[it.n] === 0 ? ' bad' : ''); }
      function show(auto) {
        fb.textContent = '';
        var modelLines = ans.text.split('\n');
        var correct = chk(inp.value);
        if (correct) { P[it.n] = 1; fb.appendChild(el('p', { class: 'pr-good' }, ['✅ صح']));
        } else if (/＿/.test(it.text)) { P[it.n] = 0; fb.appendChild(el('p', { class: 'pr-wrong' }, ['❌ غلط. الإجابة: ' + modelLines[0]]));
        } else {
          fb.appendChild(el('p', { class: 'pr-wrong' }, ['الإجابة النموذجية (ممكن تكون في صياغات تانية صح):']));
          modelLines.forEach(function (l) { var p = el('p', { class: 'pr-model', dir: 'auto' }, [l]); fb.appendChild(p); });
          fb.appendChild(el('div', { class: 'pr-self' }, [
            el('button', { type: 'button', class: 'lx-btn', onclick: function () { P[it.n] = 1; save(st); mark(); upd(); fb.querySelector('.pr-self').textContent = 'اتسجّل: كنت صح'; } }, ['كنت صح']),
            el('button', { type: 'button', class: 'lx-btn', onclick: function () { P[it.n] = 0; save(st); mark(); upd(); fb.querySelector('.pr-self').textContent = 'اتسجّل: محتاج مراجعة'; } }, ['محتاج مراجعة'])
          ]));
          mark(); upd(); return;
        }
        save(st); mark(); upd();
      }
      var btn = el('button', { type: 'button', class: 'lx-btn pr-chk', onclick: function () { show(); } }, ['تحقق']);
      inp.onkeydown = function (e) { if (e.key === 'Enter') show(); };
      row.appendChild(el('div', { class: 'pr-line' }, [inp, btn]));
      row.appendChild(fb);
      box.appendChild(row);
      mark();
    });
    var s = upd();
    box.appendChild(el('button', { type: 'button', class: 'lx-btn pr-reset', onclick: function () { st = load(); if (st[n]) delete st[n][kind]; save(st); mountAgain(); } }, ['امسح تقدّم الجزء ده']));
    return box;
  }

  var mountAgain = function () {};
  function vocabPanel(sec, n) {
    var rows = [];
    sec.blocks.forEach(function (b) { if (b.type === 'table') b.rows.slice(1).forEach(function (r) { if (r.length >= 2) rows.push([plain(r[0]), plain(r[1])]); }); });
    if (!rows.length) return null;
    var st = load(); st[n] = st[n] || {}; var V = st[n].vocab = st[n].vocab || {};
    var box = el('div', { class: 'pr-box' }, []);
    var i = 0, flipped = false;
    var info = el('div', { class: 'pr-score' }, []);
    var card = el('button', { type: 'button', class: 'pr-card', 'aria-live': 'polite' }, []);
    var acts = el('div', { class: 'pr-line' }, []);
    function known() { return rows.filter(function (r) { return V[r[0]] === 1; }).length; }
    function draw() {
      card.textContent = flipped ? rows[i][1] : rows[i][0];
      card.setAttribute('dir', flipped ? 'rtl' : 'ltr');
      info.textContent = 'كلمة ' + (i + 1) + ' من ' + rows.length + ' · عرفت ' + known();
    }
    card.onclick = function () { flipped = !flipped; draw(); };
    function next(v) { V[rows[i][0]] = v; save(st); i = (i + 1) % rows.length; flipped = false; draw(); }
    acts.appendChild(el('button', { type: 'button', class: 'lx-btn', onclick: function () { next(1); } }, ['عرفتها']));
    acts.appendChild(el('button', { type: 'button', class: 'lx-btn', onclick: function () { next(0); } }, ['لسه']));
    box.appendChild(info); box.appendChild(card); box.appendChild(acts); draw();
    return box;
  }

  var A1 = {
    mount: function (container, blocks, n, anchor) {
      var secs = sections(blocks), wrap = el('div', { class: 'pr-wrap' }, []);
      function build() {
        wrap.textContent = '';
        wrap.appendChild(el('h2', {}, ['تدريب تفاعلي (من تمارين الدرس نفسه)']));
        wrap.appendChild(el('p', { class: 'pr-note' }, ['التصحيح هنا بيطابق إجابتك مع الإجابة النموذجية في ملف الدرس. التقدّم محفوظ في المتصفح ده بس.']));
        var made = false;
        secs.forEach(function (s) {
          var kind = s.h.indexOf('تمرين') >= 0 ? 'ex' : s.h.indexOf('اختبار') >= 0 ? 'quiz' : s.h.indexOf('كلمات') >= 0 ? 'vocab' : null;
          if (!kind) return;
          var panel = null, title = null;
          if (kind === 'vocab') { panel = vocabPanel(s, n); title = 'بطاقات الكلمات'; }
          else { var p = parseSection(s); if (p.items.length) { panel = exercisePanel(s, p, n, kind); title = kind === 'ex' ? 'تمرين' : 'اختبار الدرس'; } }
          if (panel) { made = true; wrap.appendChild(el('h3', {}, [title])); wrap.appendChild(panel); }
        });
        if (!made) wrap.textContent = '';
      }
      mountAgain = build; build();
      if (wrap.firstChild) container.insertBefore(wrap, anchor || null);
    },
    done: function (n) {
      var s = load()[n]; if (!s) return false;
      var k = (s.ex ? Object.keys(s.ex).length : 0) + (s.quiz ? Object.keys(s.quiz).length : 0);
      return k > 0;
    },
    summary: function () {
      var s = load(), lessons = 0, ok = 0, tot = 0;
      Object.keys(s).forEach(function (n) { var any = 0; ['ex', 'quiz'].forEach(function (k) { Object.keys(s[n][k] || {}).forEach(function (q) { any++; tot++; if (s[n][k][q] === 1) ok++; }); }); if (any) lessons++; });
      return { lessons: lessons, ok: ok, answered: tot };
    },
    _parse: function (blocks) { return sections(blocks).map(function (s) { return { h: s.h, p: parseSection(s) }; }); }
  };
  window.A1Practice = A1;
  if (typeof module !== 'undefined') module.exports = { A1: A1, norm: norm };
})();
