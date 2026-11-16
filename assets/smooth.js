/* Smooth (inertial) scrolling with the mouse wheel / trackpad, Lenis-style — like Framer sites.
   The wheel sets a target; every frame the page glides toward it (window.scrollTo), so all normal scroll
   events still fire for fx.js, motion.js and the section effects. Touch, keyboard, scrollbar, anchors and
   "back to top" keep working (the glide resyncs to them).
   Off: in the editor (?edit=1 or inside its preview frame), with prefers-reduced-motion, on touch-only
   devices, and when site.effects.smooth is false (<html data-fx> without "smooth"). */
(function () {
  var d = document.documentElement, w = window;
  try {
    var a = d.getAttribute('data-fx');
    if (a != null && (' ' + a + ' ').indexOf(' smooth ') < 0) return;
    if (/[?&](edit|i18nscan)=1/.test(location.search) || w.self !== w.top) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!matchMedia('(pointer: fine)').matches) return;
  } catch (e) { return; }

  var EASE = 0.095;            // share of the remaining distance covered per 60 fps frame (lower = longer glide)
  var cur = w.scrollY, target = cur, running = false, last = 0, mine = cur;
  d.style.scrollBehavior = 'auto';   // CSS smooth scrolling would fight every frame
  d.classList.add('smooth-on');

  var max = function () { return Math.max(0, d.scrollHeight - w.innerHeight); };
  var clamp = function (v) { return Math.max(0, Math.min(max(), v)); };

  function frame(ts) {
    var dt = last ? Math.min(ts - last, 64) : 16.7; last = ts;
    var k = 1 - Math.pow(1 - EASE, dt / 16.7);
    cur += (target - cur) * k;
    if (Math.abs(target - cur) < 0.4) cur = target;
    mine = Math.round(cur * 100) / 100;
    w.scrollTo(0, mine);
    if (cur !== target) requestAnimationFrame(frame); else { running = false; last = 0; }
  }
  function glide(to) { target = clamp(to); if (!running) { running = true; cur = w.scrollY; requestAnimationFrame(frame); } }
  w.__nndSmoothTo = glide;

  function scrollable(el, dy) {   // an inner box that can still scroll this way keeps the wheel
    for (; el && el !== d && el !== document.body; el = el.parentElement) {
      if (el.hasAttribute && el.hasAttribute('data-lenis-prevent')) return true;
      var s = getComputedStyle(el), o = s.overflowY;
      if ((o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
        if ((dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) || (dy < 0 && el.scrollTop > 0)) return true;
      }
    }
    return false;
  }

  w.addEventListener('wheel', function (e) {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey) return;                 // pinch / browser zoom
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;                      // sideways (sliders, carousels)
    var ov = getComputedStyle(d).overflowY, ob = getComputedStyle(document.body).overflowY;
    if (ov === 'hidden' || ob === 'hidden') return;                           // lightbox / menu open
    var dy = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? w.innerHeight : 1);
    if (scrollable(e.target, dy)) return;
    e.preventDefault();
    if (!running) target = w.scrollY;
    glide(target + dy);
  }, { passive: false });

  // Anything else that scrolls the page (keys, scrollbar, anchors, to-top, scrollIntoView): follow it
  w.addEventListener('scroll', function () {
    if (running && Math.abs(w.scrollY - mine) < 2) return;
    running = false; last = 0; cur = target = w.scrollY;
  }, { passive: true });

  // In-page links (#contact …) glide too
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var a = e.target.closest && e.target.closest('a[href*="#"]');
    if (!a || a.target || a.origin + a.pathname !== location.origin + location.pathname) return;
    var id = decodeURIComponent(a.hash.slice(1)), el = id ? document.getElementById(id) : null;
    if (!id) { e.preventDefault(); glide(0); return; }
    if (!el) return;
    e.preventDefault();
    var off = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    glide(el.getBoundingClientRect().top + w.scrollY - off);
    if (history.pushState) history.pushState(null, '', '#' + id);
  });
})();
