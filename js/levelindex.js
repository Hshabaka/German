(function () {
  'use strict';
  var LV = (document.body && document.body.getAttribute('data-level')) || 'a2';
  var CODE = LV.toUpperCase();
  document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr';
  var app = document.getElementById('app');
  function el(t, a, k) { var e = document.createElement(t); a = a || {}; for (var x in a) { if (x === 'class') e.className = a[x]; else e.setAttribute(x, a[x]); } (k || []).forEach(function (c) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }); return e; }
  function label(s) { return s.sid === 'rev' ? CODE + ' · Review' : s.code; }
  function done(s) {
    try { var d = JSON.parse(localStorage.getItem('german-site.progress.' + LV + 's' + s.sid + '.v1') || 'null'); return !!(d && d.tracker && Object.keys(d.tracker).length); } catch (e) { return false; }
  }
  fetch('data/' + LV + '-index.json').then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (idx) {
    app.textContent = '';
    var w = el('div', { class: 'lx' }, [
      el('h1', { style: 'font-size:22px;margin:0 0 6px' }, ['Choose your session (' + CODE + ')']),
      el('p', { style: 'margin:0 0 12px' }, [idx.sessions.length + ' sessions in course order.'])
    ]);
    idx.sessions.forEach(function (s) {
      w.appendChild(el('a', { href: s.route, style: 'display:flex;align-items:center;gap:10px;min-height:52px;padding:10px 14px;margin:8px 0;border:1px solid #cbd5e1;border-radius:12px;color:inherit;text-decoration:none' }, [
        el('span', { style: 'font-weight:700;min-width:92px;direction:ltr' }, [label(s)]),
        el('span', { style: 'flex:1' }, [s.title.replace(/^.*?:\s*/, '')]),
        el('span', {}, [done(s) ? '✓' : '→'])
      ]));
    });
    app.appendChild(w);
  }).catch(function () { app.textContent = 'Could not load the session list.'; });
})();
