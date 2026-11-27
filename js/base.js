(function () {
  var m = location.pathname.match(/^(.*\/)(?:a1|a2|b1)\/(?:.*)?$/);
  var root = m ? m[1] : location.pathname.replace(/[^/]*$/, '');
  document.write('<base href="' + root + '">');
})();
