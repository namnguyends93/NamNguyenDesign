/* Nam Nguyen Design — interaction layer
 * Split-character headline reveals, scroll-linked hero and image parallax,
 * a scroll-velocity marquee, text scramble on hover, a "View" cursor and
 * magnetic buttons. Vanilla JS, transform/opacity only, respects reduced motion.
 */
(function () {
  'use strict';
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function ready(fn) {
    var go = function () { (window.__CMS_DONE__ && window.__CMS_DONE__.then ? window.__CMS_DONE__ : Promise.resolve()).then(fn, fn); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  }

  /* ---------- split text into characters ---------- */
  function split(el) {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    var label = (el.innerText || el.textContent).replace(/\s+/g, ' ').trim();
    var n = 0;
    function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w';
            Array.from(part).forEach(function (c) {
              var s = document.createElement('span'); s.className = 'c';
              var i = document.createElement('i'); i.textContent = c; i.style.setProperty('--cd', (n++ * 28) + 'ms');
              s.appendChild(i); w.appendChild(s);
            });
            frag.appendChild(w);
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1 && ch.tagName !== 'BR') walk(ch);
      });
    }
    walk(el);
    el.classList.add('split');
    el.setAttribute('aria-label', label);
    Array.prototype.forEach.call(el.querySelectorAll('.w'), function (w) { w.setAttribute('aria-hidden', 'true'); });
  }

  /* ---------- text scramble ---------- */
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/+*';
  function scramble(el) {
    if (el._scr) return;
    var target = el.dataset.text || (el.dataset.text = el.textContent);
    var frame = 0, total = Math.min(22, 8 + target.length);
    el._scr = true;
    (function tick() {
      var out = '';
      for (var i = 0; i < target.length; i++) {
        var ch = target[i];
        out += (ch === ' ' || i < (frame / total) * target.length) ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (++frame <= total) requestAnimationFrame(tick); else { el.textContent = target; el._scr = false; }
    })();
  }

  ready(function () {
    doc.classList.add('motion');

    /* headlines: split + reveal when in view */
    var heads = document.querySelectorAll('.hero-copy h1, .big-title, .intro-panel.text h2, .about-box h2, .contact-copy h2, .footer-word');
    if (!reduce) {
      var hio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('on'); hio.unobserve(e.target); } });
      }, { threshold: 0.2 });
      Array.prototype.forEach.call(heads, function (h) { split(h); hio.observe(h); });
    }

    /* scramble on hover */
    var scr = document.querySelectorAll('.nav-links a, .nav-contact, .project-link, .footer-links a span:first-child, .article h3, .project-meta span');
    Array.prototype.forEach.call(scr, function (el) {
      if (el.children.length) { // only scramble the leading text node, keep icons
        var t = el.firstChild; if (!t || t.nodeType !== 3 || !t.textContent.trim()) return;
        var s = document.createElement('span'); s.textContent = t.textContent; el.replaceChild(s, t); el = s;
      }
      el.setAttribute('data-scramble', '');
      var host = el.closest('a, article') || el;
      host.addEventListener('mouseenter', function () { if (!reduce) scramble(el); });
    });

    /* velocity marquee */
    var band = document.querySelector('.bm-track');
    var bandW = 0, bandX = 0, dir = -1, vel = 0;
    if (band) {
      var first = band.firstElementChild;
      for (var k = 0; k < 3; k++) band.appendChild(first.cloneNode(true)).setAttribute('aria-hidden', 'true');
      bandW = first.getBoundingClientRect().width;
      window.addEventListener('resize', function () { bandW = band.firstElementChild.getBoundingClientRect().width; });
    }

    /* parallax images */
    var par = Array.prototype.slice.call(document.querySelectorAll('.intro-panel.image, .about-bg, .contact-bg, .article'));
    par.forEach(function (p) { p.setAttribute('data-par', ''); });
    var heroCard = document.querySelector('.hero-card');

    var lastY = window.scrollY, vh = window.innerHeight;
    window.addEventListener('resize', function () { vh = window.innerHeight; });

    function frame() {
      var y = window.scrollY, dy = y - lastY; lastY = y;
      if (!reduce) {
        if (heroCard) {
          var r = heroCard.getBoundingClientRect();
          var hp = Math.min(1, Math.max(0, -r.top / (r.height || 1)));
          heroCard.style.setProperty('--hp', hp.toFixed(4));
        }
        for (var i = 0; i < par.length; i++) {
          var b = par[i].getBoundingClientRect();
          if (b.bottom < -200 || b.top > vh + 200) continue;
          var prog = (b.top + b.height / 2 - vh / 2) / (vh + b.height); // -0.5..0.5
          par[i].style.setProperty('--py', (prog * -b.height * 0.18).toFixed(1));
        }
      }
      if (band && bandW) {
        if (dy) dir = dy > 0 ? -1 : 1;
        vel += (Math.min(40, Math.abs(dy)) - vel) * 0.1;
        bandX += dir * (reduce ? 0.3 : 0.8 + vel * 0.6);
        if (bandX <= -bandW) bandX += bandW; else if (bandX > 0) bandX -= bandW;
        band.style.transform = 'translate3d(' + bandX.toFixed(2) + 'px,0,0)';
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    /* cursor label + magnetic buttons (mouse only) */
    if (finePointer && !reduce) {
      var tag = document.createElement('div');
      tag.className = 'cursor-tag'; tag.setAttribute('aria-hidden', 'true'); tag.textContent = 'View ↗';
      document.body.appendChild(tag);
      var cx = -200, cy = -200, tx = -200, ty = -200;
      window.addEventListener('mousemove', function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
      (function follow() {
        cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
        tag.style.setProperty('--x', cx.toFixed(1) + 'px'); tag.style.setProperty('--y', cy.toFixed(1) + 'px');
        requestAnimationFrame(follow);
      })();
      Array.prototype.forEach.call(document.querySelectorAll('.project-stage, .article'), function (z) {
        z.addEventListener('mouseenter', function () { tag.textContent = z.classList.contains('article') ? 'Read ↗' : 'View ↗'; tag.classList.add('on'); });
        z.addEventListener('mouseleave', function () { tag.classList.remove('on'); });
        z.addEventListener('mouseover', function (e) { tag.classList.toggle('on', !e.target.closest('button, .project-link, .project-controls')); });
      });
      Array.prototype.forEach.call(document.querySelectorAll('.nav-contact, .btn, .project-prev, .project-next, .brand-badge'), function (m) {
        m.classList.add('magnetic');
        m.addEventListener('mousemove', function (e) {
          var b = m.getBoundingClientRect();
          m.style.transform = 'translate(' + ((e.clientX - b.left - b.width / 2) * 0.25).toFixed(1) + 'px,' + ((e.clientY - b.top - b.height / 2) * 0.3).toFixed(1) + 'px)';
        });
        m.addEventListener('mouseleave', function () { m.style.transform = ''; });
      });
    }
  });
})();
