(function () {
  'use strict';
  var app = document.getElementById('app');
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') e.className = attrs[k]; else if (k.indexOf('on') === 0) e[k] = attrs[k]; else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  var hasLatin = /[A-Za-zÄÖÜäöüß]/;
  function runs(parts) {
    var frag = document.createDocumentFragment();
    (parts || []).forEach(function (p) {
      var node = document.createTextNode(p.t);
      var out = node;
      if (p.c) out = el('code', {}, [out]);
      if (p.b) out = el('strong', {}, [out]);
      if (p.i) out = el('em', {}, [out]);
      if (p.href && /^https:\/\//.test(p.href)) out = el('a', { href: p.href, target: '_blank', rel: 'noopener noreferrer' }, [out]);
      frag.appendChild(out);
    });
    return frag;
  }
  function plain(parts) { return (parts || []).map(function (p) { return p.t; }).join(''); }
  function cls(parts) { var t = plain(parts); return hasLatin.test(t) && !/[\u0600-\u06FF]/.test(t) ? 'de' : ''; }
  function wrap(tag, b, extra) {
    var e = el(tag, { class: cls(b.text) }, []);
    e.appendChild(runs(b.text));
    (extra || []).forEach(function (x) { e.appendChild(x); });
    return e;
  }
  function kids(b) { return (b.children || []).map(block).filter(Boolean); }
  function list(blocks) {
    var out = [], i = 0;
    while (i < blocks.length) {
      var t = blocks[i].type;
      if (t === 'bulleted_list_item' || t === 'numbered_list_item') {
        var l = el(t === 'bulleted_list_item' ? 'ul' : 'ol', {}, []);
        while (i < blocks.length && blocks[i].type === t) {
          var li = el('li', {}, []); li.appendChild(runs(blocks[i].text));
          if (cls(blocks[i].text)) li.className = 'de';
          kids(blocks[i]).forEach(function (k) { li.appendChild(k); });
          l.appendChild(li); i++;
        }
        out.push(l);
      } else { var n = block(blocks[i]); if (n) out.push(n); i++; }
    }
    return out;
  }
  function block(b) {
    switch (b.type) {
      case 'heading_1': case 'heading_2': return wrap('h2', b);
      case 'heading_3': return wrap('h3', b);
      case 'paragraph': return plain(b.text) ? wrap('p', b, kids(b)) : (b.children ? el('div', {}, list(b.children)) : null);
      case 'quote': return wrap('blockquote', b, kids(b));
      case 'callout': var c = el('div', { class: 'callout' }, [el('span', {}, [b.icon || '']), el('div', {}, [])]);
        c.lastChild.appendChild(runs(b.text)); list(b.children || []).forEach(function (k) { c.lastChild.appendChild(k); }); return c;
      case 'toggle': var d = el('details', {}, [el('summary', {}, [])]);
        d.firstChild.appendChild(runs(b.text)); list(b.children || []).forEach(function (k) { d.appendChild(k); }); return d;
      case 'to_do': return el('p', {}, [(b.checked ? '☑ ' : '☐ ') + plain(b.text)]);
      case 'divider': return el('hr', {}, []);
      case 'audio': return b.file ? el('audio', { controls: '', preload: 'none', src: b.file }, []) : el('p', { class: 'miss' }, ['صوت ناقص (ما اتحفظش)']);
      case 'table': var t = el('table', {}, []);
        b.rows.forEach(function (r, ri) { var tr = el('tr', {}, []); r.forEach(function (cell) { var td = el(ri === 0 ? 'th' : 'td', { class: cls(cell) }, []); td.appendChild(runs(cell)); tr.appendChild(td); }); t.appendChild(tr); });
        return t;
      case 'bulleted_list_item': case 'numbered_list_item': return list([b])[0];
      case 'pdf': case 'file': case 'video': case 'image': case 'embed': case 'bookmark':
        var p = el('p', { class: 'miss' }, ['ملف/وسائط في Notion، مش منقولة هنا: ' + (plain(b.caption) || b.type)]);
        return p;
      default: return plain(b.text) ? wrap('p', b) : null;
    }
  }
  function show(idx, n) {
    app.textContent = '';
    var L = idx.lessons;
    var sel = el('select', { 'aria-label': 'اختر الدرس', onchange: function () { if (this.value === '1') location.href = 'index.html'; else location.hash = this.value; } }, []);
    L.forEach(function (x) { var o = el('option', { value: String(x.n) }, [x.title]); if (x.n === n) o.selected = true; sel.appendChild(o); });
    var wrapEl = el('div', { class: 'lx' }, [el('div', { class: 'lx-top' }, [el('a', { href: 'index.html' }, ['الدرس 1 (الرئيسية)']), sel])]);
    app.appendChild(wrapEl);
    var item = L.filter(function (x) { return x.n === n; })[0];
    if (!item) { wrapEl.appendChild(el('p', {}, ['الدرس ده مش موجود.'])); return; }
    var body = el('div', {}, [el('p', { class: 'loading' }, ['بيحمّل الدرس…'])]);
    wrapEl.appendChild(body);
    fetch('data/a1/lesson-' + n + '.json').then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (d) {
      body.textContent = '';
      body.appendChild(el('h1', {}, [d.title]));
      var blocks = d.blocks.slice();
      var orig = null;
      if (blocks.length && blocks[0].type === 'callout' && plain(blocks[0].text).indexOf('مسودة مبدئية') === 0) { orig = blocks.shift(); }
      var cov = el('div', { class: 'callout' }, [el('span', {}, ['ℹ️']), el('div', {}, [])]);
      var ct = cov.lastChild;
      ct.appendChild(el('p', {}, [el('strong', {}, ['عرض قراءة للدرس مع الصوت.']), ' ده مش بنفس تجربة الدرس 1 التفاعلية (مفيش اختبار أو تتبّع تقدّم هنا).']));
      ct.appendChild(el('p', {}, ['المحتوى مكتوب من ملفات الدرس ومن الترجمة التلقائية للفيديو، ولسه ما اتراجعش مع المدرس. التسجيلات الألمانية مولّدة للتدريب، مش صوت المدرس. الفيديو الأصلي برابط يوتيوب (مش فيديو Notion داخل الصفحة). ملفات الـ PDF بتاعة الدرس تحت.']));
      if (orig) {
        var det = el('details', {}, [el('summary', {}, ['ملاحظة المصدر الأصلية من Notion'])]);
        det.appendChild(runs(orig.text));
        ct.appendChild(det);
      }
      body.appendChild(cov);
      list(blocks).forEach(function (k) { body.appendChild(k); });
      var pf = (window.__a1pdfs || {})[String(n)] || [];
      if (pf.length) {
        var ps = el('div', { class: 'callout' }, [el('span', {}, ['📄']), el('div', {}, [el('p', {}, [el('strong', {}, ['ملفات PDF للدرس'])])])]);
        pf.forEach(function (f) { ps.lastChild.appendChild(el('p', {}, [el('a', { href: f.file, target: '_blank', rel: 'noopener' }, [f.label])])); });
        body.appendChild(ps);
      }
      Array.prototype.forEach.call(body.querySelectorAll('li'), function (li) { if ((li.textContent.indexOf('ملفات الدرس') >= 0 && li.textContent.indexOf('Barbary') >= 0 && li.textContent.indexOf('نوشن') >= 0) && !li.querySelector('li') && pf.length) li.textContent = 'ملفات الدرس: تلاقيها تحت في صندوق "ملفات PDF للدرس".'; });
      var nav = el('div', { class: 'lx-nav' }, []);
      if (n > 2) nav.appendChild(el('a', { class: 'lx-btn', href: '#' + (n - 1) }, ['→ الدرس ' + (n - 1)]));
      if (n < L.length) nav.appendChild(el('a', { class: 'lx-btn', href: '#' + (n + 1) }, ['الدرس ' + (n + 1) + ' ←']));
      body.appendChild(nav);
      window.scrollTo(0, 0);
    }).catch(function () { body.textContent = ''; body.appendChild(el('p', {}, ['الدرس ده لسه ما اتحمّلش على الموقع.'])); });
  }
  fetch('data/a1-pdfs.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }).then(function (p) { window.__a1pdfs = p; return fetch('data/a1-index.json'); }).then(function (r) { return r.json(); }).then(function (idx) {
    function go() { var n = parseInt(location.hash.slice(1), 10); show(idx, n >= 2 ? n : 2); }
    window.addEventListener('hashchange', go); go();
  }).catch(function () { app.textContent = 'مش قادر أحمّل قايمة الدروس.'; });
})();
