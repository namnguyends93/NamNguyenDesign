/* Nam Nguyen Design — shared page effects (home, project, article, all-work pages)
 * - Videos: load when scrolled to, play muted/looped while visible (or a normal player with sound)
 * - Intro (home, first visit of the session): name + counter 0 → 100, then the curtain lifts
 * - Page transitions: the browser's cross-page View Transitions (curtain wipe + the clicked cover
 *   flies into the project hero); older browsers get an accent-colour curtain instead
 * - Images unveil when scrolled to; numbers count up
 * Each effect can be switched off in the editor (site.effects → <html data-fx="intro transitions reveal count">).
 * Reduced motion turns them off; the visual editor (?edit=1) keeps everything still.
 */
(function () {
  'use strict';
  var doc = document.documentElement;
  var edit = /[?&](edit|i18nscan)=1/.test(location.search) || !!window.__VE_EDIT__;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function fx(k) {
    if (edit || reduce) return false;
    var a = doc.getAttribute('data-fx');
    return a == null ? k !== 'intro' : (' ' + a + ' ').indexOf(' ' + k + ' ') >= 0;
  }
  var hasIO = 'IntersectionObserver' in window;
  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }

  /* ---------------- videos ---------------- */
  function loadVid(v) { if (!v.getAttribute('src') && v.dataset.src) v.src = v.dataset.src; }
  function canPlay(v) { var s = v.closest('.project-slide'); return !s || s.classList.contains('active'); }
  var vio = hasIO ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var v = e.target;
      if (v.dataset.mode === 'player') { if (e.isIntersecting) loadVid(v); return; }
      if (e.isIntersecting && canPlay(v) && !reduce) { loadVid(v); var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else if (!v.paused) v.pause();
    });
  }, { threshold: [0, 0.25], rootMargin: '200px 0px' }) : null;
  function initVideos() {
    each('video[data-src]', function (v) {
      if (v._fx) return; v._fx = 1;
      if (v.dataset.mode === 'player') { v.controls = true; v.muted = false; v.preload = 'metadata'; }
      else { v.muted = true; v.loop = true; v.playsInline = true; if ((reduce || edit) && !v.classList.contains('vid-bg')) v.controls = true; }
      if (edit) loadVid(v);
      if (vio) vio.observe(v); else loadVid(v);
    });
  }
  function refreshVideos() {
    each('video[data-src]', function (v) {
      if (v.dataset.mode === 'player') return;
      var r = v.getBoundingClientRect(), vis = r.bottom > 0 && r.top < innerHeight && r.width > 0;
      if (vis && canPlay(v) && !reduce && !edit) { loadVid(v); var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else if (!v.paused) v.pause();
    });
  }

  /* ---------------- numbers count up ---------------- */
  function fmt(n, dec, comma) {
    var s = n.toFixed(dec);
    if (comma) { var parts = s.split('.'); parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); s = parts.join('.'); }
    return s;
  }
  var cio = null;
  function initCount() {
    if (!fx('count') || !hasIO) return;
    cio = cio || new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return; cio.unobserve(e.target);
        var el = e.target, d = el._cnt, t0 = Date.now(), dur = 1400;
        var timer = setInterval(function () {
          var k = Math.min(1, (Date.now() - t0) / dur), ease = 1 - Math.pow(2, -10 * k);
          el.textContent = d.pre + fmt(d.to * (k >= 1 ? 1 : ease), d.dec, d.comma) + d.post;
          if (k >= 1) clearInterval(timer);
        }, 30);
        setTimeout(function () { clearInterval(timer); el.textContent = d.pre + fmt(d.to, d.dec, d.comma) + d.post; }, dur + 400);
      });
    }, { threshold: 0.6 });
    each('.stat strong, .result strong', function (el) {
      if (el._cnt) return;
      var m = el.textContent.trim().match(/^(\D*?)(\d[\d.,]*)(.*)$/);
      if (!m) return;
      var raw = m[2], comma = raw.indexOf(',') >= 0, dec = (raw.split('.')[1] || '').length, to = parseFloat(raw.replace(/,/g, ''));
      if (!isFinite(to)) return;
      var r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) return;          // already on screen at load: leave it
      el._cnt = { pre: m[1], post: m[3], to: to, dec: dec, comma: comma };
      el.textContent = m[1] + fmt(0, dec, comma) + m[3];
      cio.observe(el);
    });
  }

  /* ---------------- images unveil ---------------- */
  var rio = null;
  function initReveal() {
    if (!fx('reveal') || !hasIO) return;
    rio = rio || new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return; rio.unobserve(e.target);
        var el = e.target; el.classList.add('fx-in');
        setTimeout(function () { el.classList.remove('fx-clip', 'fx-in'); }, 1700);   // leave nothing behind
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    each('.g-item, .bleed, .chapter-media, .vid-frame, .ba, .work-card, .more-card, .intro-panel.image, .result', function (el) {
      if (el._rv) return; el._rv = 1;
      var r = el.getBoundingClientRect();
      if (r.top < innerHeight * 0.92 && r.bottom > 0) return;   // visible at load: no animation
      el.classList.add('fx-clip'); rio.observe(el);
    });
  }

  /* ---------------- page transitions ---------------- */
  var crossDocVT = 'onpagereveal' in window;   // Chrome / Edge 126+, Safari 18.2+
  function internal(a) {
    if (!a || !a.href || (a.target && a.target !== '_self') || a.hasAttribute('download')) return false;
    var u = new URL(a.href, location.href);
    if (u.origin !== location.origin) return false;
    if (u.pathname === location.pathname && u.search === location.search) return false;
    return /(\.html|\/)$/i.test(u.pathname);
  }
  function coverOf(a) {
    if (!/\/projects\/[\w-]+\.html$/i.test(new URL(a.href, location.href).pathname)) return null;
    var card = a.closest('.project-slide, .more-card, .work-card, .article');
    if (!card) return null;
    return card.querySelector('.project-image') || card.querySelector('img');
  }
  // The browser's own transition was switched off in the editor: skip it
  addEventListener('pageswap', function (e) { if (e.viewTransition && !fx('transitions')) e.viewTransition.skipTransition(); });
  addEventListener('pagereveal', function (e) { if (e.viewTransition && !fx('transitions')) e.viewTransition.skipTransition(); });

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest('a');
    if (!fx('transitions') || !internal(a)) return;
    if (crossDocVT) {
      // Only one element may carry the name: clear the hero of this page, name the clicked cover
      each('.hero-media', function (h) { h.style.viewTransitionName = 'none'; });
      var c = coverOf(a); if (c) c.style.viewTransitionName = 'nnd-cover';
      return;                                     // the browser animates the navigation
    }
    e.preventDefault();
    try { sessionStorage.setItem('nnd-curtain', '1'); } catch (er) {}
    var cur = document.createElement('div'); cur.className = 'fx-curtain'; document.body.appendChild(cur);
    setTimeout(function () { cur.classList.add('on'); }, 20);
    setTimeout(function () { location.href = a.href; }, 500);
  });
  // Arriving after a curtain: lift it
  function liftCurtain() {
    if (!doc.classList.contains('fx-curtain-in')) return;
    try { sessionStorage.removeItem('nnd-curtain'); } catch (er) {}
    var cur = document.createElement('div'); cur.className = 'fx-curtain on'; document.body.appendChild(cur);
    doc.classList.remove('fx-curtain-in');
    setTimeout(function () { cur.classList.add('out'); }, 40);
    setTimeout(function () { cur.remove(); }, 950);
  }
  addEventListener('pageshow', function (e) {
    if (e.persisted) each('.fx-curtain', function (c) { c.remove(); });   // back button from a cached page
    each('.project-image, .more-card img, .work-card img, .article img', function (el) { if (el.style.viewTransitionName) el.style.viewTransitionName = ''; });
  });

  /* ---------------- intro (home) ---------------- */
  function runIntro() {
    if (!doc.classList.contains('fx-intro-on')) return;
    var box = document.querySelector('.fx-intro'), num = box && box.querySelector('.fx-intro-count');
    if (!box) { doc.classList.remove('fx-intro-on'); return; }
    var t0 = Date.now(), min = 1150, hero = document.querySelector('.hero-bg img'), ready = !hero || hero.complete, done = false;
    if (!ready) { hero.addEventListener('load', function () { ready = true; }, { once: true }); hero.addEventListener('error', function () { ready = true; }, { once: true }); }
    function finish() {
      if (done) return; done = true; clearInterval(timer);
      if (num) num.textContent = '100';
      doc.classList.add('fx-intro-out');
      try { sessionStorage.setItem('nnd-intro', '1'); } catch (er) {}
      setTimeout(function () {
        doc.classList.remove('fx-intro-on', 'fx-intro-out');
        document.dispatchEvent(new Event('nnd:intro-done'));
      }, 950);
    }
    // timers, not animation frames: the intro must never get stuck over the page
    var timer = setInterval(function () {
      var dt = Date.now() - t0, k = Math.min(1, dt / min);
      if (num) num.textContent = Math.round((ready ? k : Math.min(k, 0.9)) * 100);
      if (k >= 1 && (ready || dt > 2600)) finish();
    }, 30);
    setTimeout(finish, 3500);   // safety net
  }

  /* ---------------- section effects (home) ----------------
     On scroll (site.sectionFx → data-sfx): curtain = wipes up like a curtain · rise = texts, pictures and cards fly up
     one after another · tilt = tips back in 3D and stands up.
     With the mouse (site.sectionHover → data-shov), on the section's main card:
       hover3d = the card tilts towards the pointer with a moving glare · spotlight = a soft light follows the pointer, the
       rest dims · depth = titles, texts and buttons float on layers that drift with the pointer · glow = a light runs
       along the card's edge next to the pointer · scatter = the big title's letters dodge the pointer.
     Off in the editor and with reduced motion; mouse effects only with a real mouse. The editor plays samples with
     __nndSfxPlay / __nndHoverPlay. */
  var SFX_KIDS = 'h1,h2,h3,h4,p,li,.chip,figure,img,video,.btn,.stat,.article,.client-card,.app-icon,.project-showcase,.qr-frame,.glass';
  var sfxWait = [], sfxBound = 0;
  function sfxKids(el) {
    var all = [].slice.call(el.querySelectorAll(SFX_KIDS)).filter(function (x) { var r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).slice(0, 160);
    all = all.filter(function (x) { return !all.some(function (y) { return y !== x && y.contains(x); }); }).slice(0, 48);
    all.forEach(function (x, i) { x.classList.add('sfx-k'); x.style.setProperty('--sfx-d', Math.min(i * 70, 980) + 'ms'); });
  }
  // entrance starts when the section's top passes 88% of the screen (checked on scroll: an observer never fires for the
  // curtain, whose clip-path hides the section until it opens)
  function sfxScroll() {
    var vh = innerHeight;
    sfxWait = sfxWait.filter(function (el) { var r = el.getBoundingClientRect(); if (r.top < vh * 0.88 && r.bottom > 0) { setTimeout(function () { el.classList.add('sfx-in'); }, 80); return false; } return true; });
  }
  function initSfx() {
    if (edit || reduce) return;
    var list = [].slice.call(document.querySelectorAll('[data-sfx]')).filter(function (el) { return !el._sfx; });
    if (list.length) {
      doc.classList.add('sfx-on', 'sfx-noanim'); void doc.offsetWidth; setTimeout(function () { doc.classList.remove('sfx-noanim'); }, 50);
      list.forEach(function (el) { el._sfx = 1; var k = el.getAttribute('data-sfx'); if (k === 'rise') sfxKids(el); if (k === 'curtain' || k === 'rise' || k === 'tilt') sfxWait.push(el); });
      if (!sfxBound) { sfxBound = 1; addEventListener('scroll', sfxScroll, { passive: true }); addEventListener('resize', sfxScroll); }
      sfxScroll();
    }
    if (window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches)
      each('[data-shov]', function (el) { if (!el._shov) { el._shov = 1; hoverBind(el, el.getAttribute('data-shov')); } });
  }
  function sfxPlay(el, k) {   // editor sample of an entrance effect
    if (!el) return; var had = doc.classList.contains('sfx-on');
    el.classList.remove('sfx-in'); el.setAttribute('data-sfx', k); doc.classList.add('sfx-on', 'sfx-noanim');
    if (k === 'rise') { el.querySelectorAll('.sfx-k').forEach(function (x) { x.classList.remove('sfx-k'); }); sfxKids(el); }
    void el.offsetWidth; doc.classList.remove('sfx-noanim');
    setTimeout(function () { el.classList.add('sfx-in'); }, 120);
    setTimeout(function () { el.removeAttribute('data-sfx'); el.classList.remove('sfx-in'); el.querySelectorAll('.sfx-k').forEach(function (x) { x.classList.remove('sfx-k'); x.style.removeProperty('--sfx-d'); }); if (!had) doc.classList.remove('sfx-on'); }, 2600);
  }

  /* ---- mouse effects ---- */
  function mainCard(sec) {   // the big visible card of a section (its rounded box), else the section itself
    var r0 = sec.getBoundingClientRect(), best = null, area = 0;
    [].slice.call(sec.querySelectorAll(':scope > *, :scope > * > *')).forEach(function (c) {
      var r = c.getBoundingClientRect(), a = r.width * r.height, cs = getComputedStyle(c);
      if (a > area && a > r0.width * r0.height * 0.35 && cs.position !== 'fixed' && cs.display !== 'none') { best = c; area = a; }
    });
    return best || sec;
  }
  function mk(cls, host) { var d = document.createElement('div'); d.className = cls; d.setAttribute('aria-hidden', 'true'); host.appendChild(d); return d; }
  function hoverBind(sec, k) {
    var card = mainCard(sec), cs = getComputedStyle(card), parts = [], on = false;
    if (cs.position === 'static') { card.style.position = 'relative'; parts.push(function () { card.style.position = ''; }); }
    card.classList.add('shov-card', 'shov-' + k); parts.push(function () { card.classList.remove('shov-card', 'shov-' + k, 'shov-on'); });
    var layer = null, chars = [], deps = [];
    if (k === 'hover3d') layer = mk('shovl-glare', card);
    if (k === 'spotlight') layer = mk('shovl-spot', card);
    if (k === 'glow') layer = mk('shovl-glow', card);
    if (layer) parts.push(function () { layer.remove(); });
    if (k === 'depth') {
      var picks = [].slice.call(card.querySelectorAll('h1,h2,h3,.display,.big-title,p,li,.btn,a,.chip,.stat,.glass,.mono,.qr-frame,.app-icon,.intro-meta > span'))
        .filter(function (x) { var r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !x.closest('.nav-wrap'); });
      picks = picks.filter(function (x) { return !picks.some(function (y) { return y !== x && y.contains(x); }); }).slice(0, 30);
      picks.forEach(function (x) { var z = /^H[1-3]$/.test(x.tagName) || x.classList.contains('display') || x.classList.contains('big-title') ? 26 : x.classList.contains('glass') ? -14 : x.tagName === 'P' ? 10 : 18;
        deps.push(x); x.classList.add('shov-dep'); x.style.setProperty('--z', z); });
      parts.push(function () { deps.forEach(function (x) { x.classList.remove('shov-dep'); x.style.removeProperty('--z'); }); });
    }
    if (k === 'scatter') {
      var h = card.querySelector('.big-title, h1, h2, .display');
      if (h) {
        chars = [].slice.call(h.querySelectorAll('.c'));
        if (!chars.length) {   // not split by motion.js: wrap each letter once
          var walk = document.createTreeWalker(h, NodeFilter.SHOW_TEXT), nodes = [], n; while ((n = walk.nextNode())) nodes.push(n);
          nodes.forEach(function (t) { var f = document.createDocumentFragment(); t.textContent.split('').forEach(function (ch) { if (/\s/.test(ch)) { f.appendChild(document.createTextNode(ch)); return; } var sp = document.createElement('span'); sp.className = 'shov-ch'; sp.textContent = ch; f.appendChild(sp); }); t.parentNode.replaceChild(f, t); });
          chars = [].slice.call(h.querySelectorAll('.shov-ch'));
        }
        chars.forEach(function (c) { c.classList.add('shov-c'); });
        parts.push(function () { chars.forEach(function (c) { c.classList.remove('shov-c'); c.style.transform = ''; }); });
      }
    }
    function apply(px, py, inside, cx, cy) {
      if (inside !== on) { on = inside; card.classList.toggle('shov-on', inside); }
      card.style.setProperty('--mx', (px * 100).toFixed(2) + '%'); card.style.setProperty('--my', (py * 100).toFixed(2) + '%');
      var dx = inside ? px - 0.5 : 0, dy = inside ? py - 0.5 : 0;
      if (k === 'hover3d') card.style.transform = inside ? 'perspective(1600px) rotateX(' + (-dy * 9).toFixed(2) + 'deg) rotateY(' + (dx * 11).toFixed(2) + 'deg) scale(1.012)' : '';
      if (k === 'depth') { card.style.setProperty('--dx', dx.toFixed(3)); card.style.setProperty('--dy', dy.toFixed(3)); }
      if (k === 'scatter') chars.forEach(function (c) {
        if (!inside) { c.style.transform = ''; return; }
        var r = c.getBoundingClientRect(), ex = r.left + r.width / 2 - cx, ey = r.top + r.height / 2 - cy, d = Math.sqrt(ex * ex + ey * ey), R = 170;
        if (d >= R) { c.style.transform = ''; return; }
        var f = (1 - d / R), m = f * f * 46; c.style.transform = 'translate(' + (ex / (d || 1) * m).toFixed(1) + 'px,' + (ey / (d || 1) * m).toFixed(1) + 'px) rotate(' + (ex / (d || 1) * f * 14).toFixed(1) + 'deg)';
      });
    }
    function move(e) { var r = card.getBoundingClientRect(); apply((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, true, e.clientX, e.clientY); }
    function leave() { apply(0.5, 0.5, false, 0, 0); }
    card.addEventListener('pointermove', move); card.addEventListener('pointerleave', leave);
    parts.push(function () { card.removeEventListener('pointermove', move); card.removeEventListener('pointerleave', leave); card.style.transform = ''; ['--mx', '--my', '--dx', '--dy'].forEach(function (v) { card.style.removeProperty(v); }); });
    return { apply: apply, card: card, destroy: function () { parts.reverse().forEach(function (f) { f(); }); } };
  }
  function hoverPlay(sec, k) {   // editor sample: a pretend pointer draws a loop over the card for 3 seconds
    if (!sec) return; var b = hoverBind(sec, k), t0 = Date.now();
    var tm = setInterval(function () {
      var t = (Date.now() - t0) / 3000, a = t * Math.PI * 2, px = 0.5 + Math.cos(a) * 0.32, py = 0.5 + Math.sin(a * 2) * 0.22, r = b.card.getBoundingClientRect();
      b.apply(px, py, true, r.left + px * r.width, r.top + py * r.height);
      if (t >= 1) { clearInterval(tm); b.apply(0.5, 0.5, false, 0, 0); setTimeout(b.destroy, 700); }
    }, 16);
  }

  /* ---------------- start ---------------- */
  function refresh() { initVideos(); initReveal(); initCount(); initSfx(); }
  window.__nndFx = { refresh: refresh, refreshVideos: refreshVideos };
  window.__nndSfxPlay = sfxPlay;
  window.__nndHoverPlay = hoverPlay;
  function start() { liftCurtain(); runIntro(); refresh(); }
  var go = function () { (window.__CMS_DONE__ && window.__CMS_DONE__.then ? window.__CMS_DONE__ : Promise.resolve()).then(start, start); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
