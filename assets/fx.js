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
      else { v.muted = true; v.loop = true; v.playsInline = true; if (reduce || edit) v.controls = true; }
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

  /* ---------------- start ---------------- */
  function refresh() { initVideos(); initReveal(); initCount(); }
  window.__nndFx = { refresh: refresh, refreshVideos: refreshVideos };
  function start() { liftCurtain(); runIntro(); refresh(); }
  var go = function () { (window.__CMS_DONE__ && window.__CMS_DONE__.then ? window.__CMS_DONE__ : Promise.resolve()).then(start, start); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
