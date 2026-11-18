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
    // frosted glass letters (index.html "Giant name: frosted glass letters"): .hn-frost blurs what is behind the word and is
    // masked to the letters with a canvas drawing of it; redrawn whenever the size changes. meas finds the exact baseline.
    var frost = null, meas = null;
    function syncFrost() {
      if (!frost || !span || !span.offsetWidth) return;
      var cs = getComputedStyle(span), w = span.offsetWidth, h = span.offsetHeight, txt = span.textContent, fs = parseFloat(cs.fontSize);
      frost.style.left = span.offsetLeft + 'px'; frost.style.top = span.offsetTop + 'px'; frost.style.width = w + 'px'; frost.style.height = h + 'px';
      meas.style.fontSize = cs.fontSize; meas.firstChild.nodeValue = txt;
      var base = meas.lastChild.getBoundingClientRect().top - meas.getBoundingClientRect().top;
      var dpr = Math.min(2, window.devicePixelRatio || 1), c = document.createElement('canvas'), x = c.getContext('2d');
      c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr); x.scale(dpr, dpr);
      x.font = cs.fontWeight + ' ' + fs + 'px ' + cs.fontFamily; if ('letterSpacing' in x) x.letterSpacing = cs.letterSpacing;
      x.textBaseline = 'alphabetic'; x.fillStyle = '#000'; x.fillText(cs.textTransform === 'uppercase' ? txt.toUpperCase() : txt, 0, base);
      var u = 'url(' + c.toDataURL() + ')'; frost.style.webkitMaskImage = u; frost.style.maskImage = u;
    }
    var fit0 = fit; fit = function () { fit0(); syncFrost(); };
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

    // glass hover on the giant name (2026-11-18): .hn-glass (not .glass: that class already exists on the site) while the mouse is over the letters, --gx/--gy = where
    if (span && !edit && matchMedia('(pointer: fine)').matches) {
      var gOn = false;
      frost = document.createElement('div'); frost.className = 'hn-frost'; frost.setAttribute('aria-hidden', 'true'); name.insertBefore(frost, span);
      meas = document.createElement('span'); meas.setAttribute('aria-hidden', 'true');
      meas.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;background:none;transition:none';
      meas.appendChild(document.createTextNode('')); var mk = document.createElement('i'); mk.style.cssText = 'display:inline-block;width:0;height:0'; meas.appendChild(mk);
      name.appendChild(meas); syncFrost();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncFrost);
      card.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var r = span.getBoundingClientRect(), inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (inside) { span.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%'); span.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%'); }
        if (inside !== gOn) { gOn = inside; if (inside && !frost.style.maskImage) syncFrost(); name.classList.toggle('hn-glass', inside); }
      });
      card.addEventListener('pointerleave', function () { gOn = false; name.classList.remove('hn-glass'); });
    }

    // portrait drifts with the mouse (2026-11-18, owner's choice): moves gently the opposite way of the cursor, eased,
    // back to centre when the mouse leaves. Uses the `translate` property on the picture, so the zoom (transform on .hero-bg)
    // and motion.js (transform on the img) keep working. Max 1.4% of the width: inside the margin the 1.05 hover zoom gives.
    var pic = card.querySelector('.hero-bg img, .hero-bg video');
    if (pic && !edit && !rm && matchMedia('(pointer: fine)').matches) {
      var dx = 0, dy = 0, cx = 0, cy = 0, dRaf = 0;
      function drift() { cx += (dx - cx) * 0.07; cy += (dy - cy) * 0.07;
        pic.style.translate = cx.toFixed(2) + 'px ' + cy.toFixed(2) + 'px';
        dRaf = (Math.abs(dx - cx) > 0.05 || Math.abs(dy - cy) > 0.05) ? requestAnimationFrame(drift) : 0; }
      card.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var r = card.getBoundingClientRect(), m = r.width * 0.014;
        dx = -((e.clientX - r.left) / r.width - 0.5) * 2 * m; dy = -((e.clientY - r.top) / r.height - 0.5) * 2 * m * 0.7;
        if (!dRaf) dRaf = requestAnimationFrame(drift);
      });
      card.addEventListener('pointerleave', function () { dx = dy = 0; if (!dRaf) dRaf = requestAnimationFrame(drift); });
    }

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
