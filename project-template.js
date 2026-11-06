/* Project detail pages — 5 layouts of different lengths, rendered from content.json.
   Used by server.js (live preview at /projects/<slug>.html) and build.js (static pages).

   Layouts (shortest -> longest):
     minimal   1 · Tối giản   hero, short intro, images, next
     compact   2 · Gọn        hero, overview + details, 2-column gallery, next
     standard  3 · Tiêu chuẩn hero, overview, gallery, statement, next          (original design)
     story     4 · Câu chuyện hero, overview, challenge / approach / result chapters with images, statement, gallery, next
     showcase  5 · Trưng bày  hero, overview, full-bleed image, process cards, large gallery, statement, credits, next

   Every section that has no content (no text, no images) is simply left out, so any layout works
   with any amount of material. */

const LAYOUTS = [
  ['minimal', '1 · Tối giản — ngắn nhất'],
  ['compact', '2 · Gọn'],
  ['standard', '3 · Tiêu chuẩn'],
  ['story', '4 · Câu chuyện'],
  ['showcase', '5 · Trưng bày — dài nhất'],
];

const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
// "NGOC DUNG CAMPAIGN" -> "Ngoc Dung Campaign" only when typed all-caps (display font is uppercase anyway)
const nice = t => String(t || '').trim();
// Paragraphs: blank line or single newline separates paragraphs
const paras = t => String(t || '').split(/\n+/).map(x => x.trim()).filter(Boolean);
const P = t => paras(t).map(x => `<p>${esc(x)}</p>`).join('');
// Headline: newline -> <br>
const H = t => paras(t).map(esc).join('<br>');
// Image paths in content.json are site-root based ("/uploads/x.jpg"); pages live in /projects/
const src = (s, base) => !s ? '' : /^(https?:|data:)/i.test(s) ? s : base + String(s).replace(/^\.?\//, '');
const img = (s, alt, base) => `<img src="${esc(src(s, base))}" alt="${esc(alt)}">`;

function gallery(images, pattern, alt, base, cls = '') {
  if (!images.length) return '';
  const rows = [];
  let i = 0, r = 0;
  while (i < images.length) {
    const want = pattern[r++ % pattern.length];
    const n = Math.min(want, images.length - i);
    rows.push(`<div class="g-row cols-${n}${want === 1 ? ' tall' : ''}">` +
      images.slice(i, i + n).map((s, k) => `<figure class="g-item">${img(s, `${alt} — image ${i + k + 1}`, base)}</figure>`).join('') + '</div>');
    i += n;
  }
  return `<section class="gallery ${cls}">${rows.join('')}</section>`;
}

function details(p, list) {
  const items = list.map(([k, label]) => [label, p[k]]).filter(([, v]) => v && String(v).trim());
  if (!items.length) return '';
  return `<div class="details">${items.map(([l, v]) => `<div class="detail"><b>${esc(l)}</b><span>${esc(v)}</span></div>`).join('')}</div>`;
}

const DETAIL_FIELDS = [['client', 'Client'], ['role', 'Role'], ['scope', 'Scope'], ['year', 'Year']];

function renderProjectPage(content, slug) {
  const all = (content.projects || []).filter(p => p.published !== false);
  const idx = all.findIndex(p => (p.slug || p.id) === slug);
  if (idx < 0) return null;
  const p = all[idx];
  const next = all.length > 1 ? all[(idx + 1) % all.length] : null;
  const layout = LAYOUTS.some(([k]) => k === p.layout) ? p.layout : 'standard';
  const base = '../';
  const title = nice(p.title) || 'Untitled project';
  const images = (p.gallery || []).filter(Boolean);
  const queue = images.slice();
  const take = n => queue.splice(0, n);
  const site = content.site || {};
  const brand = content.footer?.brand || content.navigation?.brand || site.name || 'Nam Nguyen Design';
  const location = content.home?.intro?.location || 'Ho Chi Minh City';
  const copyright = content.footer?.copyright || `© ${new Date().getFullYear()} ${brand}`;
  const desc = p.description || '';
  const metaTags = [p.category, p.year].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('');
  const headline = p.headline ? H(p.headline) : 'Direction<br>&amp; System';

  const hero = short => `
  <section class="hero${short ? ' short' : ''}">
    <div class="hero-media">${p.cover ? img(p.cover, title, base) : ''}</div>
    <div class="hero-copy">
      <h1 class="display">${esc(title)}</h1>
      <div class="hero-side">
        ${metaTags ? `<div class="meta">${metaTags}</div>` : ''}
        ${desc ? `<p>${esc(paras(desc)[0])}</p>` : ''}
      </div>
    </div>
  </section>`;

  const overview = (fields = DETAIL_FIELDS) => `
  <section class="section overview">
    <div>
      <div class="eyebrow">Project Overview</div>
      <h2 class="display">${headline}</h2>
    </div>
    <div>
      ${desc ? `<div class="overview-copy">${P(desc)}</div>` : ''}
      ${details(p, fields)}
    </div>
  </section>`;

  const statement = () => p.statement ? `
  <section class="section statement"><p>${esc(p.statement)}</p></section>` : '';

  const chapter = (num, label, text, image, reverse) => {
    if (!text && !image) return '';
    if (!image) return `
  <section class="section chapter solo"><div class="chapter-copy"><div class="eyebrow">${num} / ${esc(label)}</div><div class="chapter-text">${P(text)}</div></div></section>`;
    return `
  <section class="chapter-split${reverse ? ' reverse' : ''}">
    <div class="section chapter-copy"><div class="eyebrow">${num} / ${esc(label)}</div>${text ? `<div class="chapter-text">${P(text)}</div>` : ''}</div>
    <figure class="chapter-media">${img(image, `${title} — ${label}`, base)}</figure>
  </section>`;
  };

  const steps = [['01', 'Challenge', p.challenge], ['02', 'Approach', p.approach], ['03', 'Result', p.result]].filter(s => s[2]);
  const process = () => steps.length ? `
  <section class="section process">
    <div class="eyebrow">Process</div>
    <div class="process-grid cols-${steps.length}">${steps.map(([n, l, t]) => `<div class="step"><span class="step-num">${n}</span><h3 class="display">${l}</h3>${P(t)}</div>`).join('')}</div>
  </section>` : '';

  const credits = () => {
    const rows = [['Client', p.client], ['Category', p.category], ['Role', p.role], ['Scope', p.scope], ['Year', p.year]].filter(r => r[1]);
    return rows.length ? `
  <section class="section credits">${rows.map(([l, v]) => `<div><b>${l}</b><span>${esc(v)}</span></div>`).join('')}</section>` : '';
  };

  const bleed = s => s ? `
  <figure class="bleed">${img(s, `${title} — key visual`, base)}</figure>` : '';

  const nextBlock = next ? `
  <a class="next" href="${esc((next.slug || next.id) + '.html')}">
    ${next.cover ? img(next.cover, nice(next.title), base) : ''}
    <div class="next-copy"><small>NEXT PROJECT →</small><h3 class="display">${esc(nice(next.title))}</h3></div>
  </a>` : '';

  const intro = () => (desc || metaTags) ? `
  <section class="section intro-mini">
    ${metaTags ? `<div class="meta">${metaTags}</div>` : ''}
    ${desc ? `<div class="intro-text">${P(desc)}</div>` : ''}
    ${details(p, DETAIL_FIELDS)}
  </section>` : '';

  let body = '';
  switch (layout) {
    case 'minimal':
      body = hero(true) + intro() + gallery(take(queue.length), [3], title, base, 'dense');
      break;
    case 'compact':
      body = hero(true) + overview() + gallery(take(queue.length), [2], title, base, 'medium');
      break;
    case 'story': {
      body = hero(false) + overview();
      body += chapter('01', 'Challenge', p.challenge, p.challenge ? take(1)[0] : null, false);
      body += chapter('02', 'Approach', p.approach, p.approach ? take(1)[0] : null, true);
      body += bleed(take(1)[0]);
      body += chapter('03', 'Result', p.result, null, false);
      body += statement() + gallery(take(queue.length), [2], title, base, 'medium');
      break;
    }
    case 'showcase':
      body = hero(false) + overview(DETAIL_FIELDS) + bleed(take(1)[0]) + process() +
        gallery(take(queue.length), [1, 2, 1, 3], title, base, 'grand') + statement() + credits();
      break;
    default: // standard — the original design
      body = hero(false) + overview() + gallery(take(queue.length), [2, 1], title, base) + statement();
  }

  const accent = site.accent && /^#[0-9a-f]{3,8}$/i.test(site.accent) ? `--accent:${site.accent};` : '';
  const metaDesc = paras(desc)[0] || `${title} project by ${brand}.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(title)} — ${esc(brand)}</title>
<meta name="description" content="${esc(metaDesc)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Kode+Mono:wght@500&family=Space+Grotesk:wght@500;600&display=swap" rel="stylesheet">
<style>${CSS}${accent ? `:root{${accent}}` : ''}</style>
</head>
<body class="layout-${layout}">
<nav class="project-nav">
  <a href="../index.html#projects">← BACK TO WORK</a>
  <a href="../index.html#contact">START A PROJECT +</a>
</nav>
<main class="project-page">${body}${nextBlock}
</main>
<footer class="footer">
  <span>${esc(copyright).toUpperCase()}</span>
  <span>INDEPENDENT · ${esc(location).toUpperCase()}</span>
</footer>
<script>${TRANSITION_JS}</script>
<script src="../assets/to-top.js" defer></script>
</body>
</html>
`;
}

const CSS = `
:root{--black:#080808;--dark:#141414;--white:#f7f5ef;--soft:#ebe8e1;--muted:#9a9a96;--accent:#4c6fff;--accent-soft:#8ea1ff}
*{box-sizing:border-box}
html{scroll-behavior:smooth;background:var(--black)}
body{margin:0;background:var(--black);color:var(--white);font-family:Inter,Arial,sans-serif}
a{color:inherit;text-decoration:none}
img{display:block;width:100%;height:100%;object-fit:cover}
figure{margin:0}
.display{font-family:"Space Grotesk",Inter,sans-serif;text-transform:uppercase;letter-spacing:-.065em;line-height:.92;font-weight:600}
.mono{font-family:"Kode Mono",monospace;text-transform:uppercase;letter-spacing:-.04em}
.project-page{padding:8px;display:flex;flex-direction:column;gap:8px}
.project-nav{position:fixed;z-index:50;top:22px;left:22px;right:22px;display:flex;justify-content:space-between;align-items:center;pointer-events:none}
.project-nav a{pointer-events:auto;display:inline-flex;align-items:center;gap:10px;padding:13px 16px;border-radius:999px;background:rgba(8,8,8,.35);backdrop-filter:blur(26px);-webkit-backdrop-filter:blur(26px);border:1px solid rgba(255,255,255,.16);font-family:"Kode Mono",monospace;font-size:11px;transition:background .25s,color .25s}
.project-nav a:hover{background:var(--white);color:var(--black)}

/* hero */
.hero{position:relative;min-height:calc(100vh - 16px);border-radius:120px;overflow:hidden;display:flex;align-items:flex-end;background:#1b1b1b}
.hero.short{min-height:78vh}
.hero-media{position:absolute;inset:0}
.hero-media:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.06) 20%,rgba(0,0,0,.78) 100%)}
.hero-copy{position:relative;z-index:2;width:100%;padding:64px;display:grid;grid-template-columns:1.2fr .8fr;gap:50px;align-items:end}
.hero-copy h1{margin:0;font-size:clamp(70px,9vw,150px)}
.hero.short .hero-copy h1{font-size:clamp(60px,7.4vw,124px)}
.hero-side{display:flex;flex-direction:column;gap:18px;justify-self:end;max-width:420px}
.hero-side p{margin:0;color:#e8e8e8;font-size:16px;line-height:1.5}
.meta{display:flex;flex-wrap:wrap;gap:8px}
.meta span{border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:8px 11px;font:10px "Kode Mono",monospace;text-transform:uppercase}

/* shared section */
.section{border-radius:100px;overflow:hidden;background:var(--dark)}
.eyebrow{color:var(--accent-soft);font:12px "Kode Mono",monospace;text-transform:uppercase}

/* overview */
.overview{min-height:680px;padding:100px 7vw;display:grid;grid-template-columns:.8fr 1.2fr;gap:80px;align-items:start}
.layout-compact .overview{min-height:0;padding:90px 7vw}
.overview h2{margin:16px 0 0;font-size:clamp(52px,7vw,100px)}
.overview-copy{font-size:clamp(22px,2.3vw,36px);line-height:1.18;letter-spacing:-.03em}
.overview-copy p{margin:0 0 34px}
.details{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:18px;margin-top:60px}
.detail{padding-top:16px;border-top:1px solid rgba(255,255,255,.16)}
.detail b{display:block;margin-bottom:8px;font:10px "Kode Mono",monospace;color:var(--muted);text-transform:uppercase}
.detail span{font-size:15px}

/* minimal intro */
.intro-mini{padding:90px 7vw;display:flex;flex-direction:column;align-items:center;text-align:center;gap:30px}
.intro-text{max-width:900px;font-size:clamp(22px,2.4vw,36px);line-height:1.2;letter-spacing:-.03em}
.intro-text p{margin:0 0 20px}.intro-text p:last-child{margin:0}
.intro-mini .details{width:min(900px,100%);margin-top:10px;text-align:left}

/* gallery: rows of 1, 2 or 3 */
.gallery{display:flex;flex-direction:column;gap:8px}
.g-row{display:grid;gap:8px}
.g-row.cols-1{grid-template-columns:1fr}
.g-row.cols-2{grid-template-columns:1fr 1fr}
.g-row.cols-3{grid-template-columns:repeat(3,1fr)}
.g-item{min-height:680px;border-radius:86px;overflow:hidden;background:#1b1b1b}
.g-row.tall .g-item{min-height:820px}
.g-row.cols-3 .g-item{min-height:560px;border-radius:72px}

.gallery.dense .g-item,.gallery.dense .g-row.tall .g-item{min-height:440px;border-radius:64px}
.gallery.medium .g-item,.gallery.medium .g-row.tall .g-item{min-height:560px;border-radius:72px}
.gallery.grand .g-row.tall .g-item{min-height:min(92vh,980px);border-radius:120px}
.gallery.grand .g-row.cols-2 .g-item{min-height:760px}
/* statement */
.statement{min-height:620px;padding:90px 7vw;display:flex;align-items:center;justify-content:center;text-align:center}
.statement p{max-width:1050px;margin:0;font-family:"Space Grotesk",sans-serif;font-size:clamp(42px,6vw,92px);text-transform:uppercase;letter-spacing:-.06em;line-height:.96}

/* story chapters */
.chapter-split{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.chapter-split.reverse .chapter-copy{order:2}
.chapter-copy{padding:90px 6vw;display:flex;flex-direction:column;justify-content:center;gap:26px;min-height:620px}
.chapter-text{font-size:clamp(20px,1.9vw,30px);line-height:1.25;letter-spacing:-.02em}
.chapter-text p{margin:0 0 20px}.chapter-text p:last-child{margin:0}
.chapter-media{border-radius:100px;overflow:hidden;min-height:620px;background:#1b1b1b}
.chapter.solo{padding:100px 7vw}
.chapter.solo .chapter-copy{min-height:0;padding:0;max-width:1050px}
.chapter.solo .chapter-text{font-size:clamp(26px,3vw,46px);line-height:1.12}

/* full-bleed image */
.bleed{border-radius:120px;overflow:hidden;height:min(92vh,980px);background:#1b1b1b}

/* showcase process */
.process{padding:100px 7vw;display:flex;flex-direction:column;gap:40px}
.process-grid{display:grid;gap:8px}
.process-grid.cols-1{grid-template-columns:1fr}.process-grid.cols-2{grid-template-columns:1fr 1fr}.process-grid.cols-3{grid-template-columns:repeat(3,1fr)}
.step{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:48px;padding:36px 32px;display:flex;flex-direction:column;gap:14px}
.step-num{font:12px "Kode Mono",monospace;color:var(--accent-soft)}
.step h3{margin:0;font-size:clamp(34px,3.4vw,52px)}
.step p{margin:0;color:#cfcfcb;font-size:16px;line-height:1.5}

/* credits */
.credits{padding:60px 7vw;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:24px}
.credits b{display:block;margin-bottom:10px;font:10px "Kode Mono",monospace;color:var(--muted);text-transform:uppercase}
.credits span{font-family:"Space Grotesk",sans-serif;font-size:clamp(18px,1.6vw,24px);text-transform:uppercase;letter-spacing:-.03em}

/* next */
.next{position:relative;min-height:620px;display:flex;align-items:flex-end;border-radius:100px;overflow:hidden;background:#1b1b1b}
.next img{position:absolute;inset:0;transition:transform .9s cubic-bezier(.22,.75,.24,1)}
.next:hover img{transform:scale(1.03)}
.next:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.75))}
.next-copy{position:relative;z-index:2;padding:60px}
.next-copy small{font:11px "Kode Mono",monospace;color:#ddd}
.next-copy h3{margin:10px 0 0;font-size:clamp(58px,8vw,120px)}
.footer{padding:80px 32px 40px;display:flex;justify-content:space-between;gap:30px;color:#777;font:11px "Kode Mono",monospace}

@media(max-width:850px){
  .hero{border-radius:72px}.hero.short{min-height:70vh}
  .hero-copy{grid-template-columns:1fr;padding:100px 26px 34px}
  .hero-side{justify-self:start}
  .overview{grid-template-columns:1fr;padding:80px 28px;gap:50px}
  .layout-compact .overview{padding:70px 28px}
  .intro-mini{padding:70px 28px}
  .g-row.cols-2,.g-row.cols-3{grid-template-columns:1fr}
  .g-item,.g-row.tall .g-item,.g-row.cols-3 .g-item,.gallery .g-row .g-item{min-height:520px;border-radius:64px}.gallery.dense .g-row .g-item{min-height:400px}
  .section,.next,.chapter-media{border-radius:72px}
  .statement{padding:80px 28px}
  .chapter-split{grid-template-columns:1fr}
  .chapter-split.reverse .chapter-copy{order:0}
  .chapter-copy{min-height:0;padding:70px 28px}
  .chapter-media{min-height:480px}
  .chapter.solo{padding:70px 28px}
  .bleed{border-radius:72px;height:70vh}
  .process{padding:70px 22px}
  .process-grid.cols-2,.process-grid.cols-3{grid-template-columns:1fr}
  .step{border-radius:40px;padding:30px 26px}
  .credits{padding:50px 28px;grid-template-columns:1fr 1fr}
  .next{min-height:520px}
  .next-copy{padding:38px 28px}
  .footer{flex-direction:column}
}
@media(max-width:520px){
  .project-nav{top:14px;left:14px;right:14px}
  .project-nav a{padding:11px 13px;font-size:10px}
  .g-item,.g-row.tall .g-item,.g-row.cols-3 .g-item,.gallery .g-row .g-item{min-height:420px;border-radius:52px}.gallery.dense .g-row .g-item{min-height:340px}
  .section,.next,.chapter-media,.bleed{border-radius:52px}
  .hero{border-radius:56px}
}

/* page transition */
.page-transition-overlay{position:fixed;inset:0;z-index:9999;pointer-events:none;background:var(--black,#080808);opacity:0}
html.page-enter body{opacity:0;transform:translateY(14px)}
body{transition:opacity .52s cubic-bezier(.22,.75,.24,1),transform .52s cubic-bezier(.22,.75,.24,1)}
html.page-ready body{opacity:1;transform:none}
html.page-leaving body{opacity:.18;transform:translateY(-10px)}
@media (prefers-reduced-motion:reduce){body{transition:none!important;transform:none!important}}
`;

const TRANSITION_JS = `
(function(){
  var root=document.documentElement;
  root.classList.add("page-enter");
  requestAnimationFrame(function(){requestAnimationFrame(function(){root.classList.remove("page-enter");root.classList.add("page-ready")})});
  function internal(a){
    if(!a||!a.href||(a.target&&a.target!=="_self")||a.hasAttribute("download"))return false;
    var u=new URL(a.href,location.href);
    if(u.origin!==location.origin)return false;
    if(u.pathname===location.pathname&&u.search===location.search&&u.hash)return false;
    return /\\.html$/i.test(u.pathname);
  }
  document.addEventListener("click",function(e){
    if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    var a=e.target.closest("a");if(!internal(a))return;
    e.preventDefault();root.classList.add("page-leaving");
    setTimeout(function(){location.href=a.href},390);
  });
  addEventListener("pageshow",function(){root.classList.remove("page-leaving","page-enter");root.classList.add("page-ready")});
})();
`;

module.exports = { renderProjectPage, LAYOUTS };
