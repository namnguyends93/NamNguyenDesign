/* Nav "notch" (tai thỏ) — 2026-11-18. On when <html data-nav="notch"> (site.navStyle, default notch: cms-runtime.js on the
   home page, fxAttr() in project-template.js on project / work pages); ?nav=notch|float overrides for previews.
   At the top of the page the floating nav is as before. Scrolling down, it shrinks away and a small black tab
   with a ☰ icon sits flush on the bottom edge (concave "ears" left and right). Hover (mouse) or tap the tab →
   the full nav comes back; scrolling on closes it again; back at the top → full nav. */
(function () { function init() {
  var d = document.documentElement, w = window;
  var q = new URLSearchParams(location.search).get('nav');
  if (q) d.setAttribute('data-nav', q);
  if (d.getAttribute('data-nav') !== 'notch' || /[?&](edit|i18nscan)=1/.test(location.search) || w.self !== w.top) return;
  var wrap = document.querySelector('.nav-wrap'); if (!wrap) return;

  var tab = document.createElement('button');
  tab.type = 'button'; tab.className = 'nav-notch'; tab.setAttribute('aria-label', 'Menu'); tab.setAttribute('aria-expanded', 'false');
  tab.innerHTML = '<i></i><i></i>';
  document.body.appendChild(tab);

  var mini = false, openAt = 0, leaveT = 0;
  function setMini(v) { if (v === mini) return; mini = v; d.classList.toggle('nav-mini', v); if (!v) setOpen(false); }
  function setOpen(v) { d.classList.toggle('nav-open', v); tab.setAttribute('aria-expanded', String(v)); if (v) openAt = w.scrollY; }
  function onScroll() {
    var y = w.scrollY;
    setMini(y > 80);
    if (d.classList.contains('nav-open') && Math.abs(y - openAt) > 60) setOpen(false);   // keep scrolling → tuck away again
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  tab.addEventListener('click', function () { setOpen(!d.classList.contains('nav-open')); });
  var mouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (mouse) {
    tab.addEventListener('mouseenter', function () { clearTimeout(leaveT); setOpen(true); });
    wrap.addEventListener('mouseenter', function () { clearTimeout(leaveT); });
    wrap.addEventListener('mouseleave', function () { if (mini) leaveT = setTimeout(function () { setOpen(false); }, 450); });
  }
  wrap.addEventListener('click', function (e) { if (mini && e.target.closest('a')) setTimeout(function () { setOpen(false); }, 300); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
}
  (window.__CMS_DONE__ || Promise.resolve()).then(init, init);
})();
