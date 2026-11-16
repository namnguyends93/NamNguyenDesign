/* Home hero, "big name" style (like hana.framer.media) — <html class="hn"> set by cms-runtime.js unless site.heroStyle = 'card'.
   - On load the portrait zooms out from 1.2 and fades in, the giant NAM NGUYEN slides up (class hn-in).
   - The name always fills the full width (font size measured).
   - Mouse over the hero: portrait zooms to 1.05 and a small card ("Hey, I'm Nam" + description) follows the cursor.
   - The hero stays pinned (sticky) and the next sections slide up over it; it zooms / darkens a little while covered. */
(function () {
  var d = document.documentElement;
  function start() {
    // runs whatever the style: everything it touches is only styled under <html class="hn"> (set later by cms-runtime.js)
    var card = document.querySelector('.hero-card'), name = document.querySelector('.hero-name'), span = name && name.querySelector('span');
    var edit = /[?&]edit=1/.test(location.search), rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function fit() {
      if (!span) return;
      span.style.fontSize = '100px';
      var w = span.scrollWidth, cs = getComputedStyle(name), box = name.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (w > 0 && box > 0) span.style.fontSize = (100 * box / w).toFixed(2) + 'px';
    }
    fit(); addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    window.__nndHeroFit = fit;
    if (edit || rm) d.classList.add('hn-in');
    else requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.add('hn-in'); }); });
    if (!card) return;

    // pinned hero: progress 0..1 while the next section covers it
    var busy = false;
    function cover() { busy = false; var p = Math.min(1, Math.max(0, scrollY / (innerHeight || 1))); card.style.setProperty('--hs', p.toFixed(3)); }
    addEventListener('scroll', function () { if (!busy) { busy = true; requestAnimationFrame(cover); } }, { passive: true }); cover();

    // cursor card
    var tip = document.querySelector('.hero-tip');
    if (!tip || edit || !matchMedia('(pointer: fine)').matches) return;
    var tx = 0, ty = 0, x = 0, y = 0, on = false, raf = 0;
    function loop() { x += (tx - x) * 0.16; y += (ty - y) * 0.16; tip.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      if (on || Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5) raf = requestAnimationFrame(loop); else raf = 0; }
    card.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      if (e.target.closest && e.target.closest('a,button,.nav-wrap')) { tip.classList.remove('on'); return; }
      tx = e.clientX + 18; ty = e.clientY + 22;
      var w = tip.offsetWidth, h = tip.offsetHeight;
      if (tx + w > innerWidth - 12) tx = e.clientX - w - 18;
      if (ty + h > innerHeight - 12) ty = e.clientY - h - 18;
      if (!on) { on = true; if (!tip.classList.contains('on')) { x = tx; y = ty; } card.classList.add('hov'); }
      tip.classList.add('on');
      if (!raf) raf = requestAnimationFrame(loop);
    });
    card.addEventListener('pointerleave', function () { on = false; card.classList.remove('hov'); tip.classList.remove('on'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
