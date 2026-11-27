/* Cosmetic screen lock: hides the course from onlookers on a shared screen.
   It is not file protection. The hash is public by design. */
(function () {
  var BASE = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/js\/gate\.js[^\/]*$/, '') : '';
  var root = document.documentElement;
  var KEY = 'german-unlocked';
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function unhex(h) { var a = new Uint8Array(h.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; }
  function mk(tag, attrs, text) { var e = document.createElement(tag); for (var k in (attrs || {})) e.setAttribute(k, attrs[k]); if (text) e.textContent = text; return e; }
  var gateData = null;
  function check(code) {
    if (!gateData || !window.crypto || !crypto.subtle) return Promise.resolve(false);
    return crypto.subtle.importKey('raw', new TextEncoder().encode(code.trim()), 'PBKDF2', false, ['deriveBits']).then(function (k) {
      return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unhex(gateData.salt), iterations: gateData.iter, hash: 'SHA-256' }, k, 256);
    }).then(function (bits) { return hex(bits) === gateData.hash; });
  }
  function unlock() { try { sessionStorage.setItem(KEY, '1'); } catch (e) {} root.classList.remove('locked'); var g = document.getElementById('gate'); if (g) g.remove(); addLockButton(); }
  function lock() { try { sessionStorage.removeItem(KEY); } catch (e) {} var b = document.getElementById('lock-btn'); if (b) b.remove(); var u = document.getElementById('upd-btn'); if (u) u.remove(); showGate(); }
  function addLockButton() {
    if (document.getElementById('lock-btn')) return;
    var b = mk('button', { id: 'lock-btn', type: 'button', 'aria-label': 'قفل الشاشة' }, 'قفل 🔒');
    b.addEventListener('click', lock); document.body.appendChild(b);
    var u = mk('button', { id: 'upd-btn', type: 'button', 'aria-label': 'تحديث الموقع ومسح الملفات المخزنة' }, 'تحديث ↻');
    u.setAttribute('style', 'position:fixed;top:52px;left:10px;z-index:50;border:1px solid rgba(28,25,23,.35);border-radius:999px;padding:7px 14px;background:rgba(255,253,251,.92);color:#1c1917;font-size:13px;cursor:pointer');
    u.addEventListener('click', refreshSite); document.body.appendChild(u);
  }
  /* Clears only this site's cached files (service worker + Cache Storage + HTTP cache copies), then reloads.
     Progress and settings (localStorage) and the unlock state (sessionStorage) are not touched. */
  function refreshSite() {
    var u = document.getElementById('upd-btn'); if (u) { u.disabled = true; u.textContent = 'بيتحدّث…'; }
    var urls = [location.href];
    Array.prototype.forEach.call(document.querySelectorAll('script[src],link[rel=stylesheet][href]'), function (n) { urls.push(n.src || n.href); });
    ['data/registry.json', 'data/audio.json', 'sw.js'].forEach(function (f) { urls.push(BASE + f); });
    var done = function () { var q = location.search.replace(/[?&]_r=\d+/, ''); location.replace(location.pathname + (q ? q + '&' : '?') + '_r=' + Date.now() + location.hash); };
    var regs = navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(function (r) { return Promise.all(r.map(function (x) { return x.unregister(); })); }) : Promise.resolve();
    var cs = window.caches ? caches.keys().then(function (k) { return Promise.all(k.map(function (x) { return caches.delete(x); })); }) : Promise.resolve();
    Promise.all([regs, cs]).catch(function () {}).then(function () {
      return Promise.all(urls.map(function (x) { return fetch(x, { cache: 'reload' }).catch(function () {}); }));
    }).then(done, done);
  }
  function showGate() {
    root.classList.add('locked');
    if (document.getElementById('gate')) return;
    var box = mk('div', { id: 'gate' });
    var card = mk('form', { class: 'gate-card' });
    var h = mk('h1', {}, 'كورس الألماني');
    var input = mk('input', { type: 'password', autocomplete: 'current-password', inputmode: 'text', 'aria-label': 'رمز الدخول', placeholder: 'رمز الدخول' });
    var btn = mk('button', { type: 'submit' }, 'فتح');
    var msg = mk('p', { class: 'gate-msg', role: 'alert' }, '');
    card.appendChild(h); card.appendChild(input); card.appendChild(btn); card.appendChild(msg);
    card.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var tries = 0;
      (function go() {
        if (!gateData && tries++ < 50) { msg.textContent = 'ثواني...'; return setTimeout(go, 100); }
        if (!gateData) { msg.textContent = 'القفل لسه بيتجهّز، جرّب كمان لحظة.'; return; }
        msg.textContent = '';
      check(input.value).then(function (ok) { if (ok) unlock(); else { msg.textContent = 'الرمز غلط، جرّب تاني.'; input.value = ''; input.focus(); } });
      })();
    });
    box.appendChild(card); document.body.appendChild(box);
    setTimeout(function () { input.focus(); }, 50);
  }
  function start() {
    var unlocked = false; try { unlocked = sessionStorage.getItem(KEY) === '1'; } catch (e) {}
    if (unlocked) { root.classList.remove('locked'); addLockButton(); } else showGate();
    if ('serviceWorker' in navigator) { try { navigator.serviceWorker.register(BASE + 'sw.js', { updateViaCache: 'none' }).then(function (r) { return r.update(); }).catch(function () {}); } catch (e) {} }
    fetch(BASE + 'data/gate.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { gateData = d; }).catch(function () {});
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
