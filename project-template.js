/* Project detail pages, built from modules ("blocks"), rendered from content.json.
   Used by server.js (live preview at /projects/<slug>.html), build.js (static pages)
   and admin.html (module definitions + presets) — so this file must run in Node and in the browser.

   A project = hero (always) + its list of blocks + "next project" (always).
   New projects start with the Standard preset; add / remove / reorder modules in admin.
   The 5 presets are just ready-made block lists (shortest -> longest). */

(function () {
const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const paras = t => String(t || '').split(/\n+/).map(x => x.trim()).filter(Boolean);
const P = t => paras(t).map(x => `<p>${esc(x)}</p>`).join('');
const H = t => paras(t).map(esc).join('<br>');
// Image paths in content.json are site-root based ("/uploads/x.jpg"); pages live in /projects/
const src = (s, base) => !s ? '' : /^(https?:|data:)/i.test(s) ? s : base + String(s).replace(/^\.?\//, '');
const img = (s, alt, base) => `<img src="${esc(src(s, base))}" alt="${esc(alt)}">`;
const list = v => Array.isArray(v) ? v.filter(Boolean) : paras(v);

// ---------- module definitions (admin builds its forms from this) ----------
const GALLERY_STYLES = [['mix', '2 ảnh + 1 ảnh lớn (mặc định)'], ['grid2', 'Lưới 2 cột'], ['grid3', 'Lưới 3 cột (gọn)'], ['grand', 'Lớn: 1 · 2 · 1 · 3 (trưng bày)']];
const BLOCKS = {
  overview:  { label: 'Overview', hint: 'Headline + Description + thông tin Client / Role / Scope / Year (lấy từ phần trên).', fields: [] },
  intro:     { label: 'Giới thiệu ngắn', hint: 'Description căn giữa + thông tin. Thay cho Overview khi muốn trang gọn.', fields: [] },
  gallery:   { label: 'Gallery ảnh', hint: 'Bao nhiêu ảnh cũng được, tự chia hàng theo kiểu đã chọn.', fields: [
    { k: 'style', label: 'Kiểu lưới', kind: 'select', options: GALLERY_STYLES },
    { k: 'images', label: 'Ảnh — mỗi dòng 1 ảnh', kind: 'images' }] },
  image:     { label: 'Ảnh tràn màn hình', hint: '1 ảnh lớn gần full màn hình.', fields: [{ k: 'image', label: 'Ảnh', kind: 'image' }] },
  chapter:   { label: 'Chữ + ảnh (2 cột)', hint: 'Một đoạn kể chuyện kèm ảnh, vd Challenge / Approach.', fields: [
    { k: 'label', label: 'Nhãn (vd 01 / Challenge)', kind: 'text' },
    { k: 'text', label: 'Nội dung', kind: 'textarea' },
    { k: 'image', label: 'Ảnh', kind: 'image' },
    { k: 'side', label: 'Ảnh nằm bên', kind: 'select', options: [['right', 'Phải'], ['left', 'Trái']] }] },
  text:      { label: 'Đoạn chữ', hint: 'Một đoạn chữ lớn, không ảnh — vd Result.', fields: [
    { k: 'label', label: 'Nhãn (vd 03 / Result)', kind: 'text' },
    { k: 'text', label: 'Nội dung', kind: 'textarea' }] },
  process:   { label: '3 thẻ quy trình', hint: 'Tối đa 3 bước, bước nào trống tự ẩn.', fields: [
    { k: 't1', label: 'Bước 1 — tiêu đề', kind: 'text' }, { k: 'x1', label: 'Bước 1 — nội dung', kind: 'textarea' },
    { k: 't2', label: 'Bước 2 — tiêu đề', kind: 'text' }, { k: 'x2', label: 'Bước 2 — nội dung', kind: 'textarea' },
    { k: 't3', label: 'Bước 3 — tiêu đề', kind: 'text' }, { k: 'x3', label: 'Bước 3 — nội dung', kind: 'textarea' }] },
  statement: { label: 'Câu chữ lớn (Statement)', hint: 'Một câu chốt, chữ in hoa cỡ lớn.', fields: [{ k: 'text', label: 'Câu statement', kind: 'textarea' }] },
  credits:   { label: 'Credits', hint: 'Dải Client / Category / Role / Scope / Year (lấy từ phần trên).', fields: [] },
};

// ---------- presets: ready-made block lists, filled with whatever material the project already has ----------
const PRESETS = [
  ['minimal', '1 · Tối giản — ngắn nhất'],
  ['compact', '2 · Gọn'],
  ['standard', '3 · Tiêu chuẩn (mặc định)'],
  ['story', '4 · Câu chuyện'],
  ['showcase', '5 · Trưng bày — dài nhất'],
];

// Pull reusable material (images, texts) out of an existing block list
function material(blocks) {
  const m = { images: [], statement: '', challenge: '', approach: '', result: '' };
  const put = (label, text) => {
    const l = String(label || '').toLowerCase();
    for (const k of ['challenge', 'approach', 'result']) if (l.includes(k) && !m[k]) m[k] = text || '';
  };
  for (const b of blocks || []) {
    if (b.image) m.images.push(b.image);
    if (b.images) m.images.push(...list(b.images));
    if (b.type === 'statement' && !m.statement) m.statement = b.text || '';
    if (b.type === 'chapter' || b.type === 'text') put(b.label, b.text);
    if (b.type === 'process') for (const n of [1, 2, 3]) put(b['t' + n], b['x' + n]);
  }
  m.images = [...new Set(m.images)];
  return m;
}

function presetBlocks(name, m = {}) {
  const imgs = (m.images || []).slice();
  const take = () => imgs.shift() || '';
  const rest = () => imgs.splice(0);
  const st = { type: 'statement', text: m.statement || '' };
  switch (name) {
    case 'minimal':  return { heroSize: 'short', blocks: [{ type: 'intro' }, { type: 'gallery', style: 'grid3', images: rest() }] };
    case 'compact':  return { heroSize: 'short', blocks: [{ type: 'overview' }, { type: 'gallery', style: 'grid2', images: rest() }] };
    case 'story':    return { heroSize: 'full', blocks: [
      { type: 'overview' },
      { type: 'chapter', label: '01 / Challenge', text: m.challenge || '', image: take(), side: 'right' },
      { type: 'chapter', label: '02 / Approach', text: m.approach || '', image: take(), side: 'left' },
      { type: 'image', image: take() },
      { type: 'text', label: '03 / Result', text: m.result || '' },
      st, { type: 'gallery', style: 'grid2', images: rest() }] };
    case 'showcase': return { heroSize: 'full', blocks: [
      { type: 'overview' }, { type: 'image', image: take() },
      { type: 'process', t1: 'Challenge', x1: m.challenge || '', t2: 'Approach', x2: m.approach || '', t3: 'Result', x3: m.result || '' },
      { type: 'gallery', style: 'grand', images: rest() }, st, { type: 'credits' }] };
    default:         return { heroSize: 'full', blocks: [{ type: 'overview' }, { type: 'gallery', style: 'mix', images: rest() }, st] };
  }
}

// Projects saved before modules existed (gallery / statement / layout fields)
function blocksOf(p) {
  if (Array.isArray(p.blocks)) return { heroSize: p.heroSize || 'full', blocks: p.blocks };
  const r = presetBlocks(p.layout || 'standard', { images: list(p.gallery), statement: p.statement, challenge: p.challenge, approach: p.approach, result: p.result });
  return r;
}

// ---------- rendering ----------
const GALLERY = { mix: [[2, 1], ''], grid2: [[2], 'medium'], grid3: [[3], 'dense'], grand: [[1, 2, 1, 3], 'grand'] };
function gallery(images, style, alt, base) {
  if (!images.length) return '';
  const [pattern, cls] = GALLERY[style] || GALLERY.mix;
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

const DETAIL_FIELDS = [['client', 'Client'], ['role', 'Role'], ['scope', 'Scope'], ['year', 'Year']];
function details(p) {
  const items = DETAIL_FIELDS.map(([k, label]) => [label, p[k]]).filter(([, v]) => v && String(v).trim());
  if (!items.length) return '';
  return `<div class="details">${items.map(([l, v]) => `<div class="detail"><b>${esc(l)}</b><span>${esc(v)}</span></div>`).join('')}</div>`;
}

function renderBlock(b, p, base) {
  const title = String(p.title || '').trim();
  const desc = p.description || '';
  const metaTags = [p.category, p.year].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('');
  switch (b.type) {
    case 'overview': return `
  <section class="section overview">
    <div><div class="eyebrow">Project Overview</div><h2 class="display">${p.headline ? H(p.headline) : 'Direction<br>&amp; System'}</h2></div>
    <div>${desc ? `<div class="overview-copy">${P(desc)}</div>` : ''}${details(p)}</div>
  </section>`;
    case 'intro': return (desc || metaTags) ? `
  <section class="section intro-mini">
    ${metaTags ? `<div class="meta">${metaTags}</div>` : ''}${desc ? `<div class="intro-text">${P(desc)}</div>` : ''}${details(p)}
  </section>` : '';
    case 'gallery': return gallery(list(b.images), b.style, title, base);
    case 'image': return b.image ? `
  <figure class="bleed">${img(b.image, `${title} — key visual`, base)}</figure>` : '';
    case 'chapter': {
      if (!b.text && !b.image) return '';
      const eyebrow = b.label ? `<div class="eyebrow">${esc(b.label)}</div>` : '';
      if (!b.image) return renderBlock({ type: 'text', label: b.label, text: b.text }, p, base);
      return `
  <section class="chapter-split${b.side === 'left' ? ' reverse' : ''}">
    <div class="section chapter-copy">${eyebrow}${b.text ? `<div class="chapter-text">${P(b.text)}</div>` : ''}</div>
    <figure class="chapter-media">${img(b.image, `${title} — ${b.label || 'detail'}`, base)}</figure>
  </section>`;
    }
    case 'text': return b.text ? `
  <section class="section chapter solo"><div class="chapter-copy">${b.label ? `<div class="eyebrow">${esc(b.label)}</div>` : ''}<div class="chapter-text">${P(b.text)}</div></div></section>` : '';
    case 'process': {
      const steps = [1, 2, 3].map(n => [String(n).padStart(2, '0'), b['t' + n], b['x' + n]]).filter(s => s[1] || s[2]);
      return steps.length ? `
  <section class="section process">
    <div class="eyebrow">Process</div>
    <div class="process-grid cols-${steps.length}">${steps.map(([n, t, x]) => `<div class="step"><span class="step-num">${n}</span>${t ? `<h3 class="display">${esc(t)}</h3>` : ''}${P(x)}</div>`).join('')}</div>
  </section>` : '';
    }
    case 'statement': return b.text ? `
  <section class="section statement"><p>${esc(b.text)}</p></section>` : '';
    case 'credits': {
      const rows = [['Client', p.client], ['Category', p.category], ['Role', p.role], ['Scope', p.scope], ['Year', p.year]].filter(r => r[1]);
      return rows.length ? `
  <section class="section credits">${rows.map(([l, v]) => `<div><b>${l}</b><span>${esc(v)}</span></div>`).join('')}</section>` : '';
    }
    default: return '';
  }
}

function renderProjectPage(content, slug) {
  const all = (content.projects || []).filter(p => p.published !== false);
  const idx = all.findIndex(p => (p.slug || p.id) === slug);
  if (idx < 0) return null;
  const p = all[idx];
  const next = all.length > 1 ? all[(idx + 1) % all.length] : null;
  const base = '../';
  const title = String(p.title || '').trim() || 'Untitled project';
  const { heroSize, blocks } = blocksOf(p);
  const site = content.site || {};
  const brand = content.footer?.brand || content.navigation?.brand || site.name || 'Nam Nguyen Design';
  const location = content.home?.intro?.location || 'Ho Chi Minh City';
  const copyright = content.footer?.copyright || `© ${new Date().getFullYear()} ${brand}`;
  const desc = p.description || '';
  const metaTags = [p.category, p.year].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('');
  const short = (p.heroSize || heroSize) === 'short';

  const hero = `
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

  const nextBlock = next ? `
  <a class="next" href="${esc((next.slug || next.id) + '.html')}">
    ${next.cover ? img(next.cover, String(next.title || '').trim(), base) : ''}
    <div class="next-copy"><small>NEXT PROJECT →</small><h3 class="display">${esc(String(next.title || '').trim())}</h3></div>
  </a>` : '';

  const body = hero + blocks.map(b => renderBlock(b, p, base)).join('');
  const accent = site.accent && /^#[0-9a-f]{3,8}$/i.test(site.accent) ? `:root{--accent:${site.accent}}` : '';
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
<style>${CSS}${accent}</style>
</head>
<body>
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

const api = { renderProjectPage, renderBlock, BLOCKS, PRESETS, GALLERY_STYLES, presetBlocks, material, blocksOf };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.ProjectTemplate = api;
})();
