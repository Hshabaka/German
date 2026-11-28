(function () {
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.tx-play') : null;
    if (!b) return;
    var id = b.parentNode.parentNode.getAttribute('data-vid');
    var f = document.createElement('iframe');
    f.setAttribute('title', 'Exercise video');
    f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
    f.setAttribute('allowfullscreen', '');
    f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    f.setAttribute('src', 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&mute=1&loop=1&playlist=' + id + '&playsinline=1&rel=0');
    b.parentNode.replaceChild(f, b);
  });
})();
