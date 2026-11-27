(function () {
  var p = location.pathname, root = p.replace(/[^/]*$/, ''), f = p.split('/').pop();
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var to = null;
  if (f === 'index.html') to = root + 'a1/s01/';
  else if (f === 'home.html') to = root;
  else if (f === 'materials.html') to = root + 'a1/files/';
  else if (f === 'lessons.html') {
    var n = parseInt(location.hash.slice(1), 10);
    to = root + 'a1/' + (n >= 1 && n <= 28 ? 's' + pad(n) + '/' : '');
  }
  if (to) location.replace(to + (f === 'index.html' ? location.search : ''));
})();
