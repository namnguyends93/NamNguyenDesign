/* Nam Nguyen Design — VI / EN switch, shared by every page.
 * The page is written in English. Vietnamese comes from a dictionary
 * { "English text": "Vietnamese text" } kept in content.json → i18n.vi (edited in Admin → Tiếng Việt)
 * and embedded in each page as <script type="application/json" id="i18n-vi">.
 * Choosing a language stores it and reloads, so headline effects are built from the right text.
 */
(function () {
  'use strict';
  var KEY = 'nnd-lang';
  var root = document.documentElement;

  function getLang() {
    try {
      var q = new URLSearchParams(location.search).get('lang');
      if (q === 'vi' || q === 'en') return q;
      return localStorage.getItem(KEY) === 'vi' ? 'vi' : 'en';
    } catch (e) { return 'en'; }
  }
  function readDict() {
    var el = document.getElementById('i18n-vi');
    if (!el) return null;
    try { var d = JSON.parse(el.textContent || '{}'); return Object.keys(d).length ? d : null; } catch (e) { return null; }
  }
  var norm = function (s) { return String(s).replace(/\s+/g, ' ').trim(); };

  function makeLookup(dict) {
    var exact = {}, lower = {};
    Object.keys(dict).forEach(function (k) {
      var v = dict[k]; if (!v || !String(v).trim()) return;
      exact[norm(k)] = v; lower[norm(k).toLowerCase()] = v;
    });
    return function (text) {
      var t = norm(text); if (!t) return null;
      if (exact[t]) return exact[t];
      var v = lower[t.toLowerCase()];
      if (!v) return null;
      // page shows the text in capitals (e.g. "PROJECT / 01") → keep it in capitals
      return (t === t.toUpperCase() && /[A-Z]/.test(t)) ? v.toUpperCase() : v;
    };
  }

  function translate(t) {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), n, list = [];
    while ((n = w.nextNode())) list.push(n);
    list.forEach(function (node) {
      var p = node.parentElement;
      if (!p || p.closest('script,style,noscript,[data-no-i18n]')) return;
      var raw = node.nodeValue, v = t(raw);
      if (v) node.nodeValue = raw.replace(raw.trim(), v);
    });
    Array.prototype.forEach.call(document.querySelectorAll('[alt],[aria-label],[placeholder],[title]'), function (el) {
      ['alt', 'aria-label', 'placeholder', 'title'].forEach(function (a) {
        var cur = el.getAttribute(a); if (!cur) return; var v = t(cur); if (v) el.setAttribute(a, v);
      });
    });
    var title = document.title.split(' — ');
    document.title = title.map(function (part) { return t(part) || part; }).join(' — ');
    var md = document.querySelector('meta[name="description"]');
    if (md) { var v = t(md.content); if (v) md.content = v; }
  }

  function addSwitch(lang) {
    if (document.querySelector('.lang-switch')) return;
    var css = document.createElement('style');
    css.textContent =
      '.lang-switch{display:inline-flex;gap:2px;padding:3px;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16)}' +
      '.lang-switch button{all:unset;cursor:pointer;padding:9px 10px;border-radius:999px;font:500 11px/1 "Geist Mono",monospace;letter-spacing:.02em;color:#fff;opacity:.7;transition:background .25s,color .25s,opacity .25s}' +
      '.lang-switch button:hover{opacity:1}' +
      '.lang-switch button[aria-pressed="true"]{background:#fff;color:#000;opacity:1}' +
      '.lang-switch button:focus-visible{outline:2px solid var(--accent,#4c6fff);outline-offset:2px}' +
      '.nav-end{display:flex;align-items:center;gap:10px}' +
      '.project-nav .nav-end{pointer-events:auto}' +
      '.project-nav .lang-switch{background:rgba(8,8,8,.35);backdrop-filter:blur(26px);-webkit-backdrop-filter:blur(26px)}' +
      /* Vietnamese capitals carry accents above and below: give big type a little more line height */
      'html[lang="vi"] .display{line-height:1.04}' +
      'html[lang="vi"] .bm-track span{line-height:1.1}';
    document.head.appendChild(css);

    var box = document.createElement('div');
    box.className = 'lang-switch'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Language / Ngôn ngữ');
    box.setAttribute('data-no-i18n', '');
    ['vi', 'en'].forEach(function (l) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = l.toUpperCase(); b.setAttribute('data-lang', l);
      b.setAttribute('aria-pressed', String(l === lang));
      b.setAttribute('aria-label', l === 'vi' ? 'Tiếng Việt' : 'English');
      b.addEventListener('click', function () {
        if (l === lang) return;
        try { localStorage.setItem(KEY, l); sessionStorage.setItem('nnd-scroll', String(window.scrollY)); } catch (e) {}
        var u = new URL(location.href); u.searchParams.delete('lang');
        if (u.href !== location.href) location.replace(u.href); else location.reload();
      });
      box.appendChild(b);
    });

    // Home: next to "Contact +" in the floating nav. Project pages: next to "Start a project".
    var anchor = document.querySelector('.nav .nav-contact') || document.querySelector('.project-nav a:last-child');
    if (anchor) {
      var end = document.createElement('div'); end.className = 'nav-end';
      anchor.parentNode.insertBefore(end, anchor);
      end.appendChild(box); end.appendChild(anchor);
    } else {
      box.style.cssText = 'position:fixed;top:16px;right:16px;z-index:120;background:rgba(0,0,0,.4)';
      document.body.appendChild(box);
    }
  }

  // Admin → Tiếng Việt loads pages with ?i18nscan=1 to list every English text on them.
  function scan() {
    var out = [], seen = {};
    var add = function (s) { s = norm(s || ''); if (s && /[A-Za-z]/.test(s) && !seen[s]) { seen[s] = 1; out.push(s); } };
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) { var p = n.parentElement; if (p && !p.closest('script,style,noscript,[data-no-i18n]')) add(n.nodeValue); }
    Array.prototype.forEach.call(document.querySelectorAll('[aria-label],[placeholder]'), function (el) { add(el.getAttribute('aria-label')); add(el.getAttribute('placeholder')); });
    document.title.split(' — ').forEach(add);
    window.__I18N_STRINGS__ = out;
  }

  function run() {
    if (/[?&]i18nscan=1/.test(location.search)) { scan(); root.classList.remove('i18n-wait'); return; }
    var dict = readDict();
    var lang = dict ? getLang() : 'en';
    try { var q = new URLSearchParams(location.search).get('lang'); if (q === 'vi' || q === 'en') localStorage.setItem(KEY, q); } catch (e) {}
    if (lang === 'vi') { translate(makeLookup(dict)); root.lang = 'vi'; }
    if (dict) addSwitch(lang);
    root.classList.remove('i18n-wait');
    try {
      var y = sessionStorage.getItem('nnd-scroll');
      if (y !== null) { sessionStorage.removeItem('nnd-scroll'); window.scrollTo({ top: Number(y) || 0, behavior: 'instant' }); }
    } catch (e) {}
  }

  // On the local dev server the CMS fills the page first; on the built site the content is already there.
  if (window.__CMS_DONE__ && window.__CMS_DONE__.then) window.__CMS_DONE__.then(run, run); else run();
})();
