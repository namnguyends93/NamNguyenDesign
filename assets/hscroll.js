/* Sideways scrolling on the home page (2026-11-17). Each section carries data-hs (cms-runtime.js, from site.sectionScroll):
   hold  = the section stops in place (sticky) for a short stretch of scrolling while its blocks slide in sideways;
           sections alternate left / right, the two halves of a split section come from opposite sides. Then the page moves on.
   pin   = Journal: the section stops in place and scrolling slides the cards from right to left.
   drift = no stop: blocks glide sideways while the page keeps moving.
   Off in the editor, inside frames, with reduced motion; on phones (≤ 860px) hold / pin become a gentle drift. */
(function () {
  var d = document.documentElement, w = window;
  if (/[?&](edit|i18nscan)=1/.test(location.search) || w.self !== w.top) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var items = [], vw = innerWidth, vh = innerHeight, busy = false;
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); };

  function unwrap(sec) { var p = sec.parentElement; if (p && p.classList.contains('hs-hold')) { p.parentNode.insertBefore(sec, p); p.remove(); } }
  function setup() {
    items.forEach(function (o) { o.kids.forEach(function (k) { k.el.style.translate = ''; k.el.style.opacity = ''; }); if (o.grid) o.grid.scrollLeft = 0; });
    items = []; vw = innerWidth; vh = innerHeight;
    var phone = vw <= 860, n = 0;
    [].forEach.call(document.querySelectorAll('#home [data-hs]'), function (sec) {
      var mode = sec.getAttribute('data-hs');
      unwrap(sec); sec.classList.remove('hs-pinned', 'hs-held'); sec.style.top = '';
      if (sec.offsetParent === null) return;
      if (phone && mode !== 'drift') mode = 'drift';
      var side = n++ % 2 ? -1 : 1;
      var kids = [].slice.call(sec.children).filter(function (k) { return k.offsetHeight > 40; })
        .map(function (k, i, all) { return { el: k, dir: all.length > 1 ? (i % 2 ? 1 : -1) : side }; });   // split section: left half from the left, right half from the right
      if (mode === 'pin') {
        var grid = sec.querySelector('.journal-grid');
        if (grid) { sec.classList.add('hs-pinned'); var travel = Math.max(0, grid.scrollWidth - grid.clientWidth);
          if (travel > 40) { items.push(hold(sec, 'pin', travel + 80, [], grid)); return; }
          sec.classList.remove('hs-pinned'); }
        mode = 'hold';
      }
      if (mode === 'hold') { items.push(hold(sec, 'hold', Math.round(vh * 0.5), kids)); return; }
      if (mode === 'drift') items.push({ mode: 'drift', sec: sec, kids: kids, amp: phone ? Math.min(60, vw * .12) : Math.min(260, vw * .16) });
    });
    update();
  }
  // wrap the section in a taller box; the section sticks inside it while the extra length is scrolled
  function hold(sec, mode, len, kids, grid) {
    var h = sec.offsetHeight, wrap = document.createElement('div');
    wrap.className = 'hs-hold'; sec.parentNode.insertBefore(wrap, sec); wrap.appendChild(sec);
    var top = h <= vh ? Math.max(0, (vh - h) / 2) : 0;
    sec.classList.add('hs-held'); sec.style.top = top + 'px'; wrap.style.height = (h + len) + 'px';
    return { mode: mode, sec: sec, wrap: wrap, top: top, len: len, kids: kids, grid: grid, amp: Math.min(vw * .42, 620) };
  }

  function update() {
    busy = false;
    for (var i = 0; i < items.length; i++) {
      var o = items[i], r = (o.wrap || o.sec).getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      if (o.mode === 'drift') {
        var hh = Math.min(o.sec.offsetHeight, vh), k = (r.top + hh / 2 - vh / 2) / (vh / 2 + hh / 2);
        k = Math.max(-1, Math.min(1, k));
        var e = k > 0 ? k * k * (3 - 2 * k) : -(k * k) * 0.35;
        o.kids.forEach(function (c) { c.el.style.translate = (c.dir * e * o.amp).toFixed(1) + 'px 0'; });
        continue;
      }
      var p = Math.max(0, Math.min(1, (o.top - r.top) / o.len));   // 0 = just stuck, 1 = about to move on
      if (o.mode === 'pin') { o.grid.scrollLeft = p * (o.grid.scrollWidth - o.grid.clientWidth); continue; }
      var q = ease(Math.min(1, p / 0.85));
      o.kids.forEach(function (c) { c.el.style.translate = (c.dir * (1 - q) * o.amp).toFixed(1) + 'px 0'; c.el.style.opacity = (0.35 + 0.65 * q).toFixed(3); });
    }
  }
  function onScroll() { if (!busy) { busy = true; requestAnimationFrame(update); } }
  addEventListener('scroll', onScroll, { passive: true });
  var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(setup, 200); });
  w.__nndHsSetup = function () { clearTimeout(rt); rt = setTimeout(setup, 60); };
  function start() { setTimeout(setup, 80); }
  (w.__CMS_DONE__ || Promise.resolve()).then(start, start);
  addEventListener('load', function () { setTimeout(setup, 300); });
})();
