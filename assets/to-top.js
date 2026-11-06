/* Back-to-top button — shared by every page. Appears after scrolling down. */
(function () {
  if (document.querySelector('.to-top')) return;

  var css = [
    '.to-top{position:fixed;z-index:90;right:24px;bottom:32px;width:56px;height:56px;border-radius:50%;',
    'display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;color:#fff;',
    'background:rgba(0,0,0,.34);backdrop-filter:blur(38px);-webkit-backdrop-filter:blur(38px);',
    'border:1px solid rgba(255,255,255,.12);box-shadow:0 10px 30px rgba(0,0,0,.18);',
    'opacity:0;visibility:hidden;transform:translateY(16px);',
    'transition:opacity .35s cubic-bezier(.22,.75,.24,1),transform .35s cubic-bezier(.22,.75,.24,1),visibility .35s,background .25s,color .25s}',
    '.to-top.show{opacity:1;visibility:visible;transform:none}',
    '.to-top:hover{background:#fff;color:#000;transform:translateY(-3px)}',
    '.to-top:focus-visible{outline:2px solid var(--accent,#4c6fff);outline-offset:3px}',
    '.to-top svg{width:22px;height:22px}',
    /* Home page: the floating nav sits at the bottom centre — keep clear of it on narrow screens */
    '@media (max-width:860px){body:has(.nav-wrap) .to-top{bottom:120px}}',
    '@media (max-width:520px){.to-top{right:16px;width:48px;height:48px}}',
    '@media (prefers-reduced-motion:reduce){.to-top{transition:opacity .2s,visibility .2s}}'
  ].join('');
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'to-top';
  btn.setAttribute('aria-label', 'Back to top');
  btn.title = 'Back to top';
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
  document.body.appendChild(btn);

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduce ? 'instant' : 'smooth' });
    btn.blur();
  });

  var ticking = false;
  function update() {
    btn.classList.toggle('show', window.scrollY > Math.min(600, window.innerHeight * 0.8));
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
})();
