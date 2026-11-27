/* A1 interactive practice built from each lesson's own exercise and quiz sections.
   Progress (answers + results) is saved only in this browser (localStorage). Nothing is synced.
   Every result is tagged: "تصحيح تلقائي" (matched against the lesson's own answer key)
   or "تقييم ذاتي" (the learner judged own answer). Explanations beyond the source are flagged. */
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
  function norm(s) { return String(s).toLowerCase().replace(/[\u064B-\u065F]/g, '').replace(/[.,!?;:()"'«»،؟]/g, ' ').replace(/\s+/g, ' ').trim(); }
  var AR = /[\u0600-\u06FF]/, LAT = /[A-Za-zÄÖÜäöüß]/;
  var ITEM = /^\s*([\d٠-٩]+)\s*\)\s*(.*)$/;
  var OPT = /^\s*([A-D])\s*\)\s*(.*)$/;
  function toN(x) { return parseInt(digits(x), 10); }
  function digits(s) { return String(s).replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 1632); }); }

  function sections(blocks) {
    var out = [], cur = null;
    blocks.forEach(function (b) {
      if (b.type === 'heading_2') { cur = { h: plain(b.text), blocks: [] }; out.push(cur); }
      else if (cur) cur.blocks.push(b);
    });
    return out;
  }
  // Arabic meanings that the lesson itself gives for German sentences.
  function dictionary(blocks) {
    var D = {};
    function add(g, a) { g = norm(g); if (g && a) D[g] = a.trim(); }
    function walk(bs) {
      (bs || []).forEach(function (b) {
        if (b.type === 'table') { b.rows.slice(1).forEach(function (r) { if (r.length >= 2) add(plain(r[0]), plain(r[1])); }); }
        var t = plain(b.text);
        var m = t.match(/^([^\u0600-\u06FF]*[A-Za-zÄÖÜäöüß][^\u0600-\u06FF]*?)\s+([\u0600-\u06FF].*)$/);
        if (m && b.type !== 'toggle') add(m[1], m[2]);
        walk(b.children);
      });
    }
    walk(blocks);
    return D;
  }
  function parseSection(sec) {
    var items = [], answers = {}, lastA = null, notes = [], lastItem = null, group = [], afterHeader = false, orderN = 0, order = null;
    sec.blocks.forEach(function (b) {
      if (b.type === 'toggle') {
        (b.children || []).forEach(function (c) { plain(c.text).split('\n').forEach(function (t) {
          var mr = t.match(/^\s*([\d٠-٩]+)\s*-\s*([\d٠-٩]+)\s*\)\s*(.*)$/), m2 = t.match(ITEM);
          if (mr) { for (var i = toN(mr[1]); i <= toN(mr[2]); i++) answers[i] = { free: true, lines: [] }; lastA = { free: true, lines: [mr[3]], range: true }; }
          else if (m2) { lastA = { lines: [m2[2]] }; answers[toN(m2[1])] = lastA; }
          else if (lastA && !/^\(.*\)$/.test(t.trim())) { lastA.lines.push(t); }
          else if (t.trim()) { notes.push(t); }
        }); });
        return;
      }
      if (b.type !== 'paragraph') return;
      var t = plain(b.text), tt = t.trim();
      if (!tt) return;
      if (orderN > 0) { order.lines.push(tt); orderN--; if (!orderN) { items.push(order); order = null; lastItem = null; } return; }
      var om = tt.match(/رتب.*[(（]\s*([١-٩\d]+)\s*إلى\s*([١-٩\d]+)\s*[)）]/);
      if (om) { orderN = parseInt(digits(om[2]), 10); order = { kind: 'order', n: 'ord', head: tt, lines: [], extras: [] }; return; }
      var m = t.match(ITEM);
      if (m) { lastItem = { n: toN(m[1]), text: m[2], head: group.join('  '), extras: [] }; group = []; afterHeader = false; items.push(lastItem); return; }
      if (/[:：]\s*$/.test(tt)) { group = group.concat([tt]); afterHeader = true; lastItem = null; return; }
      if (afterHeader || !lastItem) group.push(tt); else lastItem.extras.push(tt);
    });
    var open = notes.some(function (x) { return /ممكن تختلف|مثال|ممكن تتبدل/.test(x); });
    return { items: items, answers: answers, notes: notes, open: open };
  }
  function ansLine(a) { return a && a.lines && a.lines[0] ? a.lines[0] : ''; }
  function classify(it, a, sec) {
    if (it.kind === 'order') return 'order';
    if (!a) return 'nokey';
    var first = ansLine(a);
    if (a.free || /إجابة حرة/.test(first)) return 'free';
    var opts = it.extras.filter(function (x) { return OPT.test(x); });
    if (opts.length >= 2 && /^\s*[A-D]\b/.test(first)) return 'choice';
    if (/＿/.test(it.text)) return 'gap';
    if (/جاوب من حياتك/.test(a.lines.join(' '))) return 'free-example';
    if (sec.open) return 'open';
    return 'text';
  }
  function fillGap(text, ans) { return text.replace(/＿{2,}/, ans).replace(/＿+/g, ans); }
  function leadLetter(s) { var m = s.match(/^\s*([A-D])\b/); return m ? m[1] : null; }

  var TEACH = null, teachTried = false;
  function loadTeach(cb) {
    if (teachTried) return; teachTried = true;
    try { fetch('data/a1-teach.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j) { TEACH = j; cb(); } }).catch(function () {}); } catch (e) {}
  }
  function exercisePanel(sec, parsed, n, kind, dict) {
    var st = load(); st[n] = st[n] || {}; st[n][kind] = st[n][kind] || {};
    var P = st[n][kind];
    var box = el('div', { class: 'pr-box' }, []);
    var score = el('div', { class: 'pr-score' }, []);
    function rec(id) { var r = P[id]; return (r && typeof r === 'object') ? r : (r === undefined ? null : { v: r, m: 'auto', a: '' }); }
    function upd() {
      var c = { aok: 0, abad: 0, sok: 0, sbad: 0 }, total = 0;
      parsed.items.forEach(function (it) { var k = classify(it, parsed.answers[it.n], parsed); if (k === 'gap' || k === 'choice' || k === 'text' || k === 'open' || k === 'order') total++; var r = rec(it.n); if (r) { if (r.m === 'auto') { r.v ? c.aok++ : c.abad++; } else { r.v ? c.sok++ : c.sbad++; } } });
      score.textContent = 'اتحلّ ' + (c.aok + c.abad + c.sok + c.sbad) + ' من ' + total + ' · تصحيح تلقائي: صح ' + c.aok + '، غلط ' + c.abad + ' · تقييم ذاتي: صح ' + c.sok + '، محتاج مراجعة ' + c.sbad;
    }
    box.appendChild(score);
    parsed.items.forEach(function (it) {
      var a = parsed.answers[it.n], k = classify(it, a, parsed);
      var T = (TEACH && TEACH[n] && TEACH[n][kind] && TEACH[n][kind][it.n]) || null;
      var row = el('div', { class: 'pr-item' }, []);
      if (it.head) row.appendChild(el('p', { class: 'pr-ctx' }, [it.head]));
      var qt = it.kind === 'order' ? it.head : (it.n + ') ' + it.text.replace(/＿{2,}/g, '＿＿＿'));
      var q = el('p', { class: 'pr-q' }, [it.kind === 'order' ? '' : qt]);
      if (it.kind !== 'order') { if (LAT.test(it.text) && !AR.test(it.text)) q.setAttribute('dir', 'ltr'); row.appendChild(q); }
      var fb = el('div', { class: 'pr-fb', 'aria-live': 'polite' }, []);
      function mark() { var r = rec(it.n); row.className = 'pr-item' + (r ? (r.m === 'self' ? (r.v ? ' sok' : ' sno') : (r.v ? ' ok' : ' bad')) : ''); }
      function why(userAns) {
        if (T && T.w) {
          var w = el('div', { class: 'pr-teach' }, [el('p', { class: 'pr-teach-h' }, ['ليه؟ (شرح تعليمي مضاف، مش من ملف المدرس)']), el('p', {}, [T.w])]);
          if (T.o && userAns && T.o[userAns]) w.appendChild(el('p', { class: 'pr-teach-o' }, ['اختيارك (' + userAns + '): ' + T.o[userAns]]));
          return w;
        }
        return el('p', { class: 'pr-why' }, ['ليه؟ راجع قاعدة الدرس فوق. شرح السبب لكل سؤال مش مكتوب في ملف الدرس الأصلي (محتاج مراجعة).']);
      }
      function meaning(full, ar) {
        var dm = (T && T.m) || dict[norm(full)] || ''; if (!(T && T.m) && dm.split(/\s+/).length < 2) dm = '';
        var m = ar || dm; if (ar && T && T.m && it.n && /\.$/.test(ar) === false) { m = ar; }
        var note = it.extras.filter(function (x) { return /^المعنى\s*:/.test(x); })[0];
        var w = el('div', {}, [el('p', { class: 'pr-mean' }, [m ? m : 'ترجمة الجملة كاملة مش مكتوبة في ملف الدرس.'])]);
        if (note) w.appendChild(el('p', { class: 'pr-mean' }, ['من الملف (معنى الكلمة الناقصة): ' + note.replace(/^المعنى\s*:\s*/, '')]));
        return w;
      }
      function tag(m) { return el('span', { class: 'pr-tag' }, [m === 'auto' ? 'تصحيح تلقائي (مطابقة لإجابة الملف)' : 'تقييم ذاتي (مش تصحيح تلقائي)']); }
      function showResult(r, userAns, needSelf) {
        fb.textContent = '';
        var first = ansLine(a), full, ar = null;
        if (k === 'gap') full = fillGap(it.text, first);
        else if (k === 'choice') {
          var L = leadLetter(first), optLine = it.extras.filter(function (x) { return OPT.test(x) && x.trim()[0] === L; })[0];
          var optTxt = optLine ? optLine.replace(OPT, '$2') : first.replace(/^\s*[A-D]\s*\)\s*/, '');
          full = /＿/.test(it.text) ? fillGap(it.text, optTxt) : optTxt;
        } else { full = first; if (AR.test(it.text) && !LAT.test(it.text)) ar = it.text; }
        if (T && T.f) full = T.f;
        if (!needSelf) {
          fb.appendChild(el('p', { class: r.m === 'self' ? (r.v ? 'pr-selfok' : 'pr-selfno') : (r.v ? 'pr-good' : 'pr-wrong') }, [r.m === 'self' ? (r.v ? '✔ قيّمت نفسي: صح ' : '↻ قيّمت نفسي: محتاج مراجعة ') : (r.v ? '✅ صح ' : '❌ غلط ') ]));
          fb.lastChild.appendChild(tag(r.m));
          if (!r.v || r.m === 'self') fb.appendChild(el('p', { class: 'pr-say' }, ['إجابتك: ' + (userAns || '(فاضي)')]));
          var line = el('p', { class: 'pr-full', dir: 'ltr' }, [full]); fb.appendChild(line);
          fb.appendChild(meaning(full, ar));
          fb.appendChild(why(userAns));
          if (a.lines.length > 1 && k !== 'gap' && k !== 'choice') a.lines.slice(1).forEach(function (l) { fb.appendChild(el('p', { class: 'pr-mean' }, [l])); });
        }
      }
      function finish(v, m, userAns) {
        P[it.n] = { v: v, m: m, a: userAns }; save(st); mark(); upd();
        showResult(P[it.n], userAns, false);
      }
      function selfPrompt(userAns) {
        fb.textContent = '';
        fb.appendChild(el('p', { class: 'pr-neutral' }, [k === 'open' ? 'الملف نفسه بيقول إن الأسئلة والإجابات دي أمثلة وممكن تختلف، فمفيش تصحيح تلقائي. قارن بنفسك:' : 'مش مطابقة للإجابة النموذجية بالضبط. ممكن صياغة تانية تبقى صح، قارن بنفسك:']));
        a.lines.forEach(function (l) { fb.appendChild(el('p', { class: 'pr-model', dir: 'auto' }, [l])); });
        if (it.extras.length && k !== 'choice') { /* hints stay visible above */ }
        fb.appendChild(el('div', { class: 'pr-self' }, [
          el('button', { type: 'button', class: 'lx-btn', onclick: function () { finish(1, 'self', userAns); } }, ['قيّمت نفسي: كنت صح']),
          el('button', { type: 'button', class: 'lx-btn', onclick: function () { finish(0, 'self', userAns); } }, ['قيّمت نفسي: محتاج مراجعة'])
        ]));
      }
      if (k === 'nokey' || k === 'free' || k === 'free-example') {
        it.extras.forEach(function (x) { row.appendChild(el('p', { class: 'pr-extra', dir: 'auto' }, [x])); });
        row.appendChild(el('p', { class: 'pr-note' }, [k === 'nokey' ? 'مفيش إجابة نموذجية مطابقة للسؤال ده في ملف الدرس، فمفيش تصحيح.' : 'إجابة حرة، مفيش تصحيح تلقائي.' + (k === 'free-example' ? ' المثال في الملف:' : '')]));
        if (k === 'free-example') a.lines.forEach(function (l) { row.appendChild(el('p', { class: 'pr-model', dir: 'auto' }, [l])); });
        box.appendChild(row); return;
      }
      if (k === 'order') {
        row.appendChild(el('p', { class: 'pr-q' }, [it.head]));
        var sel = [];
        var key = {}; // line -> correct position (from the numbered answers 1..N in the key)
        it.lines.forEach(function (l) { for (var i = 1; i <= it.lines.length; i++) { var al = parsed.answers[i]; if (al && norm(ansLine(al)) === norm(l)) key[l] = i; } });
        var okKey = it.lines.every(function (l) { return key[l]; });
        it.lines.forEach(function (l) {
          var s = el('select', { class: 'pr-in', 'aria-label': 'ترتيب: ' + l }, [el('option', { value: '' }, ['؟'])]);
          for (var i = 1; i <= it.lines.length; i++) s.appendChild(el('option', { value: String(i) }, [String(i)]));
          sel.push(s);
          var ln = el('div', { class: 'pr-line' }, [s, el('span', { class: 'pr-ordtxt', dir: 'ltr' }, [l])]); row.appendChild(ln);
        });
        var r0 = rec('ord');
        if (r0 && r0.a) { var pv = r0.a.split(','); sel.forEach(function (s, i) { s.value = pv[i] || ''; }); }
        var ob = el('button', { type: 'button', class: 'lx-btn pr-chk', onclick: function () {
          var vals = sel.map(function (s) { return s.value; }); if (vals.some(function (v) { return !v; })) { fb.textContent = 'رتّب كل الأسطر الأول.'; return; }
          var ok = okKey && it.lines.every(function (l, i) { return String(key[l]) === vals[i]; });
          function listKey() {
            for (var i = 1; i <= it.lines.length; i++) fb.appendChild(el('p', { class: 'pr-full', dir: 'ltr' }, [i + ') ' + ansLine(parsed.answers[i])]));
          }
          function done(v, m) { P.ord = { v: v, m: m, a: vals.join(',') }; save(st); mark(); upd(); }
          fb.textContent = '';
          if (ok) {
            done(1, 'auto');
            fb.appendChild(el('p', { class: 'pr-good' }, ['✅ نفس ترتيب الملف ']));
            fb.lastChild.appendChild(tag('auto'));
            listKey();
          } else {
            var prev = rec('ord');
            if (prev && prev.m === 'self') done(prev.v, 'self'); else { delete P.ord; save(st); mark(); upd(); }
            fb.appendChild(el('p', { class: 'pr-neutral' }, ['ترتيبك مختلف عن ترتيب ملف الدرس. الملف نفسه بيقول إن أكتر من ترتيب ممكن يكون صح، فده مش بيتعلّم غلط تلقائي. قارن بنفسك:']));
            if (prev && prev.m === 'self') fb.appendChild(el('p', { class: prev.v ? 'pr-selfok' : 'pr-selfno' }, [prev.v ? '✔ تقييمك المحفوظ: ترتيبي مقبول' : '↻ تقييمك المحفوظ: محتاج مراجعة']));
            listKey();
            fb.appendChild(el('div', { class: 'pr-self' }, [
              el('button', { type: 'button', class: 'lx-btn', onclick: function () { done(1, 'self'); ob.click(); } }, ['قيّمت نفسي: ترتيبي مقبول']),
              el('button', { type: 'button', class: 'lx-btn', onclick: function () { done(0, 'self'); ob.click(); } }, ['قيّمت نفسي: محتاج مراجعة'])
            ]));
          }
          if (!okKey) fb.appendChild(el('p', { class: 'pr-why' }, ['مفتاح الترتيب مش مطابق تمامًا للأسطر، المقارنة هنا غير مضمونة (محتاج مراجعة).']));
        } }, ['تحقق']);
        row.appendChild(ob); row.appendChild(fb); box.appendChild(row);
        var rr = rec('ord'); if (rr) { ob.click(); } mark(); return;
      }
      // options for multiple choice
      var optLines = it.extras.filter(function (x) { return OPT.test(x); });
      it.extras.forEach(function (x) { if (k === 'choice' && OPT.test(x)) return; if (/^المعنى\s*:/.test(x)) return; row.appendChild(el('p', { class: 'pr-extra', dir: 'auto' }, [x])); });
      var inp = null, picked = null, radios = [];
      if (k === 'choice') {
        optLines.forEach(function (x) {
          var L = x.trim()[0];
          var rd = el('input', { type: 'radio', name: 'q' + n + kind + it.n, value: L, 'aria-label': x }, []);
          rd.onchange = function () { picked = L; };
          radios.push(rd);
          row.appendChild(el('label', { class: 'pr-opt', dir: 'auto' }, [rd, ' ' + x]));
        });
      } else {
        inp = el('input', { type: 'text', class: 'pr-in', dir: 'auto', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'إجابة السؤال ' + it.n }, []);
      }
      function run() {
        var userAns;
        if (k === 'choice') {
          if (!picked) { fb.textContent = 'اختار إجابة الأول.'; return; }
          userAns = picked; finish(picked === leadLetter(ansLine(a)) ? 1 : 0, 'auto', picked); return;
        }
        userAns = inp.value;
        if (!norm(userAns)) { fb.textContent = 'اكتب إجابتك الأول.'; return; }
        var alts = ansLine(a).split(/\s+\/\s+/).map(norm);
        var exact = a.lines.length === 1 && alts.indexOf(norm(userAns)) >= 0;
        if (k === 'gap') { finish(alts.indexOf(norm(userAns)) >= 0 ? 1 : 0, 'auto', userAns); return; }
        if (k === 'text' && exact) { finish(1, 'auto', userAns); return; }
        selfPrompt(userAns);
      }
      var btn = el('button', { type: 'button', class: 'lx-btn pr-chk', onclick: run }, ['تحقق']);
      if (inp) { inp.onkeydown = function (e) { if (e.key === 'Enter') run(); }; row.appendChild(el('div', { class: 'pr-line' }, [inp, btn])); }
      else row.appendChild(btn);
      row.appendChild(fb);
      box.appendChild(row);
      // restore a previous answer and result so the field never looks ungraded
      var r = rec(it.n);
      if (r) {
        if (inp) inp.value = r.a || '';
        if (k === 'choice') radios.forEach(function (rd) { if (rd.value === r.a) { rd.checked = true; picked = r.a; } });
        showResult(r, r.a, false);
        fb.insertBefore(el('p', { class: 'pr-note' }, ['نتيجتك المحفوظة من آخر مرة:']), fb.firstChild);
      }
      mark();
    });
    upd();
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
      info.textContent = 'كلمة ' + (i + 1) + ' من ' + rows.length + ' · عرفت ' + known() + ' (تقييم ذاتي)';
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
      var secs = sections(blocks), wrap = el('div', { class: 'pr-wrap' }, []), dict = dictionary(blocks);
      function build() {
        wrap.textContent = '';
        wrap.appendChild(el('h2', {}, ['تدريب تفاعلي (من تمارين الدرس نفسه)']));
        wrap.appendChild(el('p', { class: 'pr-note' }, ['التصحيح التلقائي بيطابق إجابتك مع الإجابة النموذجية في ملف الدرس. لو الإجابة مش مطابقة بالضبط في الجمل المفتوحة، بتقارن وتقيّم نفسك وده بيتسجّل "تقييم ذاتي". التقدّم محفوظ في المتصفح ده بس.']));
        var made = false;
        secs.forEach(function (s) {
          var kind = s.h.indexOf('تمرين') >= 0 ? 'ex' : s.h.indexOf('اختبار') >= 0 ? 'quiz' : s.h.indexOf('كلمات') >= 0 ? 'vocab' : null;
          if (!kind) return;
          var panel = null, title = null;
          if (kind === 'vocab') { panel = vocabPanel(s, n); title = 'بطاقات الكلمات'; }
          else { var p = parseSection(s); if (p.items.length) { panel = exercisePanel(s, p, n, kind, dict); title = kind === 'ex' ? 'تمرين' : 'اختبار الدرس'; } }
          if (panel) { made = true; wrap.appendChild(el('h3', {}, [title])); wrap.appendChild(panel); }
        });
        if (!made) wrap.textContent = '';
      }
      mountAgain = build; build(); loadTeach(function () { try { build(); } catch (e) {} });
      if (wrap.firstChild) container.insertBefore(wrap, anchor || null);
    },
    done: function (n) {
      var s = load()[n]; if (!s) return false;
      return ((s.ex ? Object.keys(s.ex).length : 0) + (s.quiz ? Object.keys(s.quiz).length : 0)) > 0;
    },
    _parse: function (blocks) { var d = dictionary(blocks); return sections(blocks).map(function (s) { var p = parseSection(s); return { h: s.h, p: p, kinds: p.items.map(function (it) { return classify(it, p.answers[it.n], p); }), dict: d }; }); },
    _dict: dictionary, _norm: norm
  };
  window.A1Practice = A1;
  if (typeof module !== 'undefined') module.exports = { A1: A1 };
})();
