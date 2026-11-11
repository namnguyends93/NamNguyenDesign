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

// ---------- video ----------
const isVid = s => /\.(mp4|webm|mov)([?#]|$)/i.test(String(s || ''));
// mode "player" = normal player with sound; otherwise muted, looped, plays while visible (assets/fx.js)
const vidTag = (s, poster, base, mode) => `<video class="vid" data-src="${esc(src(s, base))}"${poster ? ` poster="${esc(src(poster, base))}"` : ''}${mode === 'player' ? ' data-mode="player" controls preload="metadata"' : ' muted loop playsinline preload="none"'}></video>`;
function embedUrl(u) {
  u = String(u || '').trim(); let m;
  if ((m = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/))) return 'https://www.youtube-nocookie.com/embed/' + m[1] + '?rel=0&modestbranding=1&playsinline=1';
  if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/))) return 'https://player.vimeo.com/video/' + m[1] + '?dnt=1';
  return '';
}
// Effects switched on in the editor (site.effects) → <html data-fx="…"> read by assets/fx.js
const fxAttr = content => { const e = (content.site && content.site.effects) || {}; return ' data-fx="' + ['intro', 'transitions', 'reveal', 'count'].filter(k => e[k] !== false).join(' ') + '"'; };
const FX_HEAD = "<script>(function(){try{var d=document.documentElement,q=location.search,a=d.getAttribute('data-fx'),on=function(k){return a==null?k!=='intro':(' '+a+' ').indexOf(' '+k+' ')>=0},rm=matchMedia('(prefers-reduced-motion: reduce)').matches;if(/[?&](edit|i18nscan)=1/.test(q)||rm)return;if(on('transitions')&&!('onpagereveal' in window)&&sessionStorage.getItem('nnd-curtain'))d.classList.add('fx-curtain-in');if(on('intro')&&document.querySelector&&!sessionStorage.getItem('nnd-intro')&&/(^|\\/)(index\\.html)?$/.test(location.pathname))d.classList.add('fx-intro-on')}catch(e){}})()</script>";

// ---------- visual editor (/edit) ----------
// renderProjectPage(content, slug, { edit: true }) marks every editable spot: data-ve="path" (text),
// data-ve-img="path" (image), data-ve-block="i" (module). Paths are relative to the project.
// Empty fields get a grey placeholder so they can still be clicked. Normal pages are unchanged.
let VE = null;                                   // { i: current block index } while rendering for the editor
const at = path => VE ? ` data-ve="${esc(path)}"` : '';
const ati = path => VE ? ` data-ve-img="${esc(path)}"` : '';
const atv = path => VE ? ` data-ve-vid="${esc(path)}"` : '';
const bk = k => 'blocks.' + (VE ? VE.i : 0) + '.' + k;
const blank = v => !String(v ?? '').trim();
// editable text: element tag, classes, path, value, placeholder, multi-paragraph?
// Text colour chosen in the editor: project.colors[field] or, inside a module, block.colors[field]
const CUR = { p: null, b: null };
function cs(path) {
  const m = String(path).match(/^blocks\.\d+\.(.+)$/);
  const c = m ? (CUR.b && CUR.b.colors && CUR.b.colors[m[1]]) : (CUR.p && CUR.p.colors && CUR.p.colors[path]);
  return /^#[0-9a-f]{3,8}$/i.test(c || '') ? ` style="color:${c}"` : '';
}
const metaSpans = p => [['category', p.category], ['year', p.year]].filter(x => x[1]).map(([k, v]) => `<span${cs(k)}>${esc(v)}</span>`).join('');
function edT(tag, cls, path, value, ph, multi) {
  const empty = blank(value);
  const inner = empty ? (multi ? `<p>${esc(ph)}</p>` : esc(ph)) : (multi ? P(value) : esc(value));
  return `<${tag}${cls || empty ? ` class="${[cls, empty ? 've-empty' : ''].filter(Boolean).join(' ')}"` : ''}${at(path)}${cs(path)}>${inner}</${tag}>`;
}

// ---------- module definitions (admin builds its forms from this) ----------
// Vietnamese dictionary for assets/i18n.js (content.json → i18n.vi)
function i18nData(content) {
  const vi = content && content.i18n && content.i18n.vi;
  if (!vi || !Object.keys(vi).length) return '';
  return '<script type="application/json" id="i18n-vi">' + JSON.stringify(vi).replace(/</g, '\\u003c') + '</script>';
}
const GALLERY_STYLES = [['mix', '2 ảnh + 1 ảnh lớn (mặc định)'], ['grid2', 'Lưới 2 cột'], ['grid3', 'Lưới 3 cột (gọn)'], ['grand', 'Lớn: 1 · 2 · 1 · 3 (trưng bày)']];
const BLOCKS = {
  overview:  { label: 'Overview', hint: 'Headline + Description + thông tin Client / Role / Scope / Year (lấy từ phần trên).', fields: [] },
  intro:     { label: 'Giới thiệu ngắn', hint: 'Description căn giữa + thông tin. Thay cho Overview khi muốn trang gọn.', fields: [] },
  gallery:   { label: 'Gallery ảnh', hint: 'Bao nhiêu ảnh cũng được, tự chia hàng theo kiểu đã chọn.', fields: [
    { k: 'style', label: 'Kiểu lưới', kind: 'select', options: GALLERY_STYLES },
    { k: 'images', label: 'Ảnh — mỗi dòng 1 ảnh', kind: 'images', note: 'Ảnh 2 cột: dọc 1600×2000 (4:5) · 3 cột: dọc 1200×1600 (3:4) · ảnh nằm 1 mình 1 hàng: ngang 2400 px, cao tuỳ ý. Ảnh cùng hàng nên cùng tỉ lệ.' }] },
  image:     { label: 'Ảnh tràn màn hình', hint: '1 ảnh lớn gần full màn hình.', fields: [{ k: 'image', label: 'Ảnh', kind: 'image', note: 'Ngang 2400×1500 (16:10), gần tràn màn hình. Trên điện thoại khung thành dọc: giữ chủ thể ở giữa.' }] },
  chapter:   { label: 'Chữ + ảnh (2 cột)', hint: 'Một đoạn kể chuyện kèm ảnh, vd Challenge / Approach.', fields: [
    { k: 'label', label: 'Nhãn (vd 01 / Challenge)', kind: 'text' },
    { k: 'text', label: 'Nội dung', kind: 'textarea' },
    { k: 'image', label: 'Ảnh', kind: 'image', note: 'Dọc 1600×2000 (4:5), nằm cạnh đoạn chữ.' },
    { k: 'side', label: 'Ảnh nằm bên', kind: 'select', options: [['right', 'Phải'], ['left', 'Trái']] }] },
  text:      { label: 'Đoạn chữ', hint: 'Một đoạn chữ lớn, không ảnh — vd Result.', fields: [
    { k: 'label', label: 'Nhãn (vd 03 / Result)', kind: 'text' },
    { k: 'text', label: 'Nội dung', kind: 'textarea' }] },
  process:   { label: '3 thẻ quy trình', hint: 'Tối đa 3 bước, bước nào trống tự ẩn.', fields: [
    { k: 't1', label: 'Bước 1 — tiêu đề', kind: 'text' }, { k: 'x1', label: 'Bước 1 — nội dung', kind: 'textarea' },
    { k: 't2', label: 'Bước 2 — tiêu đề', kind: 'text' }, { k: 'x2', label: 'Bước 2 — nội dung', kind: 'textarea' },
    { k: 't3', label: 'Bước 3 — tiêu đề', kind: 'text' }, { k: 'x3', label: 'Bước 3 — nội dung', kind: 'textarea' }] },
  statement: { label: 'Câu chữ lớn (Statement)', hint: 'Một câu chốt, chữ in hoa cỡ lớn.', fields: [{ k: 'text', label: 'Câu statement', kind: 'textarea' }] },
  video:     { label: 'Video', hint: 'File video (tự chạy, tắt tiếng, lặp lại — hoặc có nút phát + tiếng) hoặc link YouTube / Vimeo.', fields: [
    { k: 'video', label: 'File video (MP4)', kind: 'video', note: 'MP4 (H.264), 1080p, 5–15 giây, dưới khoảng 30 MB. Ngang 1920×1080 · dọc 1080×1920 · vuông 1080×1080.' },
    { k: 'poster', label: 'Ảnh poster (hiện trước khi video chạy)', kind: 'image', note: 'Cùng khung hình với video, lấy 1 khung đẹp nhất của clip.' },
    { k: 'embed', label: 'Hoặc link YouTube / Vimeo (video dài, có tiếng)', kind: 'text' },
    { k: 'ratio', label: 'Khung hình', kind: 'select', options: [['wide', 'Ngang 16:9'], ['full', 'Tràn màn hình'], ['vertical', 'Dọc 9:16 (Reels / TikTok)'], ['square', 'Vuông 1:1']] },
    { k: 'mode', label: 'Cách chạy', kind: 'select', options: [['loop', 'Tự chạy, tắt tiếng, lặp lại'], ['player', 'Có nút phát và âm thanh']] },
    { k: 'caption', label: 'Chú thích (không bắt buộc)', kind: 'text' }] },
  beforeafter: { label: 'Trước / Sau (kéo so sánh)', hint: 'Hai ảnh chồng lên nhau, người xem kéo thanh giữa để so sánh — hợp để khoe retouch, AI upscale (Magnific).', fields: [
    { k: 'before', label: 'Ảnh TRƯỚC', kind: 'image', note: 'Hai ảnh phải cùng kích thước và cùng khung hình. Ngang 2400×1500 (16:10) hoặc dọc 1600×2000 (4:5).' },
    { k: 'after', label: 'Ảnh SAU', kind: 'image', note: 'Cùng kích thước với ảnh Trước.' },
    { k: 'beforeLabel', label: 'Chữ trên ảnh trước (mặc định: Before)', kind: 'text' },
    { k: 'afterLabel', label: 'Chữ trên ảnh sau (mặc định: After)', kind: 'text' },
    { k: 'caption', label: 'Chú thích dưới ảnh (không bắt buộc)', kind: 'text' }] },
  results:   { label: 'Kết quả (con số)', hint: 'Tối đa 4 con số lớn: lượt tiếp cận, lịch hẹn, số ấn phẩm… Ô nào trống thì ẩn.', fields: [
    { k: 'label', label: 'Nhãn nhỏ (mặc định: Results)', kind: 'text' },
    { k: 'v1', label: 'Số 1 (vd 2.4M)', kind: 'text' }, { k: 'l1', label: 'Chú thích số 1', kind: 'text' },
    { k: 'v2', label: 'Số 2', kind: 'text' }, { k: 'l2', label: 'Chú thích số 2', kind: 'text' },
    { k: 'v3', label: 'Số 3', kind: 'text' }, { k: 'l3', label: 'Chú thích số 3', kind: 'text' },
    { k: 'v4', label: 'Số 4', kind: 'text' }, { k: 'l4', label: 'Chú thích số 4', kind: 'text' }] },
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
  if (!images.length) return VE ? `<section class="section ve-ph">Gallery trống — thêm ảnh ở bảng bên phải</section>` : '';
  const [pattern, cls] = GALLERY[style] || GALLERY.mix;
  const rows = [];
  let i = 0, r = 0;
  while (i < images.length) {
    const want = pattern[r++ % pattern.length];
    const n = Math.min(want, images.length - i);
    rows.push(`<div class="g-row cols-${n}${want === 1 ? ' tall' : ''}">` +
      images.slice(i, i + n).map((s, k) => `<figure class="g-item"${ati(bk('images.' + (i + k)))}>${isVid(s) ? vidTag(s, '', base, 'loop') : img(s, `${alt} — image ${i + k + 1}`, base)}</figure>`).join('') + '</div>');
    i += n;
  }
  return `<section class="gallery ${cls}">${rows.join('')}</section>`;
}

const DETAIL_FIELDS = [['client', 'Client'], ['role', 'Role'], ['scope', 'Scope'], ['year', 'Year']];
function details(p) {
  const items = DETAIL_FIELDS.map(([k, label]) => [label, p[k], k]).filter(([, v]) => VE || (v && String(v).trim()));
  if (!items.length) return '';
  return `<div class="details">${items.map(([l, v, k]) => `<div class="detail"><b>${esc(l)}</b>${VE ? edT('span', '', k, v, '—') : `<span${cs(k)}>${esc(v)}</span>`}</div>`).join('')}</div>`;
}

function renderBlock(b, p, base) {
  const title = String(p.title || '').trim();
  const desc = p.description || '';
  const metaTags = metaSpans(p);
  switch (b.type) {
    case 'overview': return `
  <section class="section overview">
    <div><div class="eyebrow">Project Overview</div><h2 class="display"${at('headline')}${cs('headline')}>${p.headline ? H(p.headline) : 'Direction<br>&amp; System'}</h2></div>
    <div>${VE ? edT('div', 'overview-copy', 'description', desc, 'Nhập mô tả dự án…', true) : desc ? `<div class="overview-copy"${cs('description')}>${P(desc)}</div>` : ''}${details(p)}</div>
  </section>`;
    case 'intro': return (desc || metaTags || VE) ? `
  <section class="section intro-mini">
    ${VE ? `<div class="meta">${edT('span', '', 'category', p.category, 'Chuyên mục')}${edT('span', '', 'year', p.year, 'Năm')}</div>` + edT('div', 'intro-text', 'description', desc, 'Nhập mô tả…', true) : `${metaTags ? `<div class="meta">${metaTags}</div>` : ''}${desc ? `<div class="intro-text"${cs('description')}>${P(desc)}</div>` : ''}`}${details(p)}
  </section>` : '';
    case 'gallery': return gallery(list(b.images), b.style, title, base);
    case 'image': return (b.image || VE) ? `
  <figure class="bleed"${ati(bk('image'))}>${b.image ? img(b.image, `${title} — key visual`, base) : ''}</figure>` : '';
    case 'chapter': {
      if (VE) return `
  <section class="chapter-split${b.side === 'left' ? ' reverse' : ''}">
    <div class="section chapter-copy">${edT('div', 'eyebrow', bk('label'), b.label, 'Nhãn (vd 01 / Challenge)')}${edT('div', 'chapter-text', bk('text'), b.text, 'Nhập nội dung…', true)}</div>
    <figure class="chapter-media"${ati(bk('image'))}>${b.image ? img(b.image, `${title} — ${b.label || 'detail'}`, base) : ''}</figure>
  </section>`;
      if (!b.text && !b.image) return '';
      const eyebrow = b.label ? `<div class="eyebrow"${cs(bk('label'))}>${esc(b.label)}</div>` : '';
      if (!b.image) return renderBlock({ type: 'text', label: b.label, text: b.text }, p, base);
      return `
  <section class="chapter-split${b.side === 'left' ? ' reverse' : ''}">
    <div class="section chapter-copy">${eyebrow}${b.text ? `<div class="chapter-text"${cs(bk('text'))}>${P(b.text)}</div>` : ''}</div>
    <figure class="chapter-media">${img(b.image, `${title} — ${b.label || 'detail'}`, base)}</figure>
  </section>`;
    }
    case 'text': if (VE) return `
  <section class="section chapter solo"><div class="chapter-copy">${edT('div', 'eyebrow', bk('label'), b.label, 'Nhãn (không bắt buộc)')}${edT('div', 'chapter-text', bk('text'), b.text, 'Nhập nội dung…', true)}</div></section>`;
      return b.text ? `
  <section class="section chapter solo"><div class="chapter-copy">${b.label ? `<div class="eyebrow"${cs(bk('label'))}>${esc(b.label)}</div>` : ''}<div class="chapter-text"${cs(bk('text'))}>${P(b.text)}</div></div></section>` : '';
    case 'process': {
      if (VE) return `
  <section class="section process">
    <div class="eyebrow">Process</div>
    <div class="process-grid cols-3">${[1, 2, 3].map(n => `<div class="step"><span class="step-num">0${n}</span>${edT('h3', 'display', bk('t' + n), b['t' + n], 'Tiêu đề bước ' + n)}${edT('div', '', bk('x' + n), b['x' + n], 'Nội dung bước ' + n, true)}</div>`).join('')}</div>
  </section>`;
      const steps = [1, 2, 3].map(n => [String(n).padStart(2, '0'), b['t' + n], b['x' + n]]).filter(s => s[1] || s[2]);
      return steps.length ? `
  <section class="section process">
    <div class="eyebrow">Process</div>
    <div class="process-grid cols-${steps.length}">${steps.map(([n, t, x]) => `<div class="step"><span class="step-num">${n}</span>${t ? `<h3 class="display"${cs(bk('t' + (+n)))}>${esc(t)}</h3>` : ''}${P(x).replace(/<p>/g, '<p' + cs(bk('x' + (+n))) + '>')}</div>`).join('')}</div>
  </section>` : '';
    }
    case 'statement': return (b.text || VE) ? `
  <section class="section statement">${VE ? edT('p', '', bk('text'), b.text, 'Câu statement…') : `<p${cs(bk('text'))}>${esc(b.text)}</p>`}</section>` : '';
    case 'video': {
      const r = ['wide', 'full', 'vertical', 'square'].includes(b.ratio) ? b.ratio : 'wide';
      const emb = embedUrl(b.embed);
      const frame = media => `
  <section class="section vid-wrap">
    <figure class="vid-frame r-${r}"${atv(bk('video'))}>${media}</figure>
    ${VE ? edT('p', 'vid-cap', bk('caption'), b.caption, 'Chú thích (không bắt buộc)') : b.caption ? `<p class="vid-cap"${cs(bk('caption'))}>${esc(b.caption)}</p>` : ''}
  </section>`;
      const iframe = emb ? `<iframe src="${esc(emb)}" title="${esc(b.caption || title)}" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>` : '';
      if (b.video) return frame(vidTag(b.video, b.poster, base, b.mode));
      if (iframe) return frame(iframe);
      return VE ? frame('') : '';
    }
    case 'beforeafter': {
      const bl = b.beforeLabel || 'Before', al = b.afterLabel || 'After';
      if (VE) return `
  <section class="section ba-edit">
    <figure class="ba-pane"${ati(bk('before'))}>${b.before ? img(b.before, `${title} — before`, base) : ''}</figure>
    <figure class="ba-pane"${ati(bk('after'))}>${b.after ? img(b.after, `${title} — after`, base) : ''}</figure>
    ${edT('span', 'ba-tag ba-tag-b', bk('beforeLabel'), b.beforeLabel, 'Before')}${edT('span', 'ba-tag ba-tag-a', bk('afterLabel'), b.afterLabel, 'After')}
    ${edT('p', 'ba-cap', bk('caption'), b.caption, 'Chú thích (không bắt buộc)')}
  </section>`;
      if (!b.before || !b.after) return '';
      return `
  <section class="section ba-wrap">
    <figure class="ba" data-ba style="--pos:50%">
      ${img(b.after, `${title} — ${al}`, base)}
      <div class="ba-before">${img(b.before, `${title} — ${bl}`, base)}</div>
      <span class="ba-line" aria-hidden="true"><span>↔</span></span>
      <span class="ba-tag ba-tag-b"${cs(bk('beforeLabel'))}>${esc(bl)}</span><span class="ba-tag ba-tag-a"${cs(bk('afterLabel'))}>${esc(al)}</span>
      <input class="ba-range" type="range" min="0" max="100" value="50" aria-label="${esc(bl)} / ${esc(al)}">
    </figure>
    ${b.caption ? `<p class="ba-cap"${cs(bk('caption'))}>${esc(b.caption)}</p>` : ''}
  </section>`;
    }
    case 'results': {
      const nums = [1, 2, 3, 4].map(n => [n, b['v' + n], b['l' + n]]);
      const show = VE ? nums : nums.filter(([, v, l]) => !blank(v) || !blank(l));
      if (!show.length) return '';
      return `
  <section class="section results">
    ${VE ? edT('div', 'eyebrow', bk('label'), b.label, 'Results') : `<div class="eyebrow"${cs(bk('label'))}>${esc(b.label || 'Results')}</div>`}
    <div class="results-grid cols-${show.length}">${show.map(([n, v, l]) => `<div class="result">${VE ? edT('strong', 'display', bk('v' + n), v, '00') + edT('span', '', bk('l' + n), l, 'Chú thích') : `<strong class="display"${cs(bk('v' + n))}>${esc(v)}</strong><span${cs(bk('l' + n))}>${esc(l)}</span>`}</div>`).join('')}</div>
  </section>`;
    }
    case 'credits': {
      const rows = [['Client', p.client, 'client'], ['Category', p.category, 'category'], ['Role', p.role, 'role'], ['Scope', p.scope, 'scope'], ['Year', p.year, 'year']].filter(r => VE || r[1]);
      return rows.length ? `
  <section class="section credits">${rows.map(([l, v, k]) => `<div><b>${l}</b>${VE ? edT('span', '', k, v, '—') : `<span${cs(k)}>${esc(v)}</span>`}</div>`).join('')}</section>` : '';
    }
    default: return '';
  }
}

function renderProjectPage(content, slug, opts) {
  VE = opts && opts.edit ? { i: 0 } : null;
  try { return renderPage(content, slug); } finally { VE = null; }
}
function renderPage(content, slug) {
  const pub = (content.projects || []).filter(p => p.published !== false);
  const p = pub.find(x => (x.slug || x.id) === slug);
  if (!p) return null;
  // Journal articles (kind "journal") use the same page; "next" stays within the same kind
  const isArticle = p.kind === 'journal';
  const all = pub.filter(x => (x.kind === 'journal') === isArticle);
  const idx = all.indexOf(p);
  const next = all.length > 1 ? all[(idx + 1) % all.length] : null;
  const base = '../';
  const title = String(p.title || '').trim() || 'Untitled project';
  const { heroSize, blocks } = blocksOf(p);
  const site = content.site || {};
  const brand = content.footer?.brand || content.navigation?.brand || site.name || 'Nam Nguyen Design';
  const location = content.home?.intro?.location || 'Ho Chi Minh City';
  const copyright = content.footer?.copyright || `© ${new Date().getFullYear()} ${brand}`;
  const desc = p.description || '';
  CUR.p = p; CUR.b = null;
  const metaTags = metaSpans(p);
  const short = (p.heroSize || heroSize) === 'short';
  // Password-protected page: build.js encrypts <main data-private>; the editor and dev server show it as is
  const priv = !VE && !blank(p.password);

  const hero = `
  <section class="hero${short ? ' short' : ''}">
    <div class="hero-media"${ati('cover')}>${p.cover ? img(p.cover, title, base) : ''}${p.coverVideo ? vidTag(p.coverVideo, p.cover, base, 'loop') : ''}</div>
    <div class="hero-copy">
      <h1 class="display"${at('title')}${cs('title')}>${esc(title)}</h1>
      <div class="hero-side">
        ${VE ? `<div class="meta">${edT('span', '', 'category', p.category, 'Chuyên mục')}${edT('span', '', 'year', p.year, 'Năm')}</div>` : metaTags ? `<div class="meta">${metaTags}</div>` : ''}
        ${VE && paras(desc).length <= 1 ? edT('p', '', 'description', desc, 'Mô tả ngắn…') : desc ? `<p${cs('description')}>${esc(paras(desc)[0])}</p>` : ''}
      </div>
    </div>
  </section>`;

  // Bottom of the page: every other project (or article), starting with the next one, up to 6
  const others = all.length > 1 ? [...all.slice(idx + 1), ...all.slice(0, idx)].slice(0, 6) : [];
  const nextBlock = others.length ? `
  <section class="more">
    <div class="more-head">
      <h2 class="display">${isArticle ? 'MORE ARTICLES' : 'MORE PROJECTS'}</h2>
      <a href="${isArticle ? '../index.html#journal' : 'index.html'}">VIEW ALL →</a>
    </div>
    <div class="more-grid" style="--cols:${Math.min(3, others.length)}">${others.map((o, i) => `
      <a class="more-card" href="${esc((o.slug || o.id) + '.html')}">
        ${o.cover ? img(o.cover, String(o.title || '').trim(), base) : ''}
        ${blank(o.password) ? '' : '<span class="lock">🔒 PRIVATE</span>'}<div class="more-copy"><small>${i === 0 ? (isArticle ? 'NEXT ARTICLE →' : 'NEXT PROJECT →') : [o.category, o.year].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join(' · ')}</small><h3 class="display">${esc(String(o.title || '').trim())}</h3></div>
      </a>`).join('')}
    </div>
  </section>` : '';

  const body = hero + blocks.map((b, i) => {
    if (VE) VE.i = i;
    CUR.b = b;
    const h = renderBlock(b, p, base);
    CUR.b = null;
    return VE && h ? h.replace(/<(section|figure)/, m => `${m} data-ve-block="${i}"`) : h;
  }).join('');
  const accent = site.accent && /^#[0-9a-f]{3,8}$/i.test(site.accent) ? `:root{--accent:${site.accent}}` : '';
  const metaDesc = priv ? 'Private project — password required.' : (paras(desc)[0] || `${title} project by ${brand}.`);

  return `<!DOCTYPE html>
<html lang="en"${VE ? '' : fxAttr(content)}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(title)} — ${esc(brand)}</title>
<meta name="description" content="${esc(metaDesc)}">
${VE ? '' : FX_HEAD}${priv ? '\n<meta name="robots" content="noindex">' : ''}
<script>(function(){try{var q=new URLSearchParams(location.search).get('lang');if((q||localStorage.getItem('nnd-lang'))==='vi'){var d=document.documentElement;d.classList.add('i18n-wait');setTimeout(function(){d.classList.remove('i18n-wait')},2500)}}catch(e){}})()</script><style>.i18n-wait body{opacity:0}</style>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Geist+Mono:wght@500&family=Space+Grotesk:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/fx.css">
<style>${CSS}${accent}</style>
</head>
<body>
<nav class="project-nav">
  ${isArticle ? '<a href="../index.html#journal">← BACK TO JOURNAL</a>' : '<a href="../index.html#projects">← BACK TO WORK</a>'}
  <a href="../index.html#contact">START A PROJECT +</a>
</nav>
<main class="project-page"${priv ? ' data-private="1"' : ''}>${body}${nextBlock}
</main>
<footer class="footer">
  <span>${esc(copyright).toUpperCase()}</span>
  <span>INDEPENDENT · ${esc(location).toUpperCase()}</span>
</footer>
${VE ? '' : `<script>${PAGE_JS}</script>`}
<script src="../assets/fx.js" defer></script>
${i18nData(content)}
<script src="../assets/to-top.js" defer></script>
<script src="../assets/i18n.js" defer></script>
</body>
</html>
`;
}

// "All work": every published project with category filter chips → projects/index.html
function renderWorkPage(content) {
  const site = content.site || {}, wp = content.workPage || {};
  const brand = content.footer?.brand || content.navigation?.brand || site.name || 'Nam Nguyen Design';
  const copyright = content.footer?.copyright || `© ${new Date().getFullYear()} ${brand}`;
  const location = content.home?.intro?.location || 'Ho Chi Minh City';
  const base = '../';
  const list = (content.projects || []).filter(p => p.published !== false && p.kind !== 'journal');
  const key = v => String(v || '').trim().toLowerCase();
  const cats = [];
  for (const p of list) if (!blank(p.category) && !cats.some(c => key(c) === key(p.category))) cats.push(String(p.category).trim());
  const title = wp.title || 'ALL WORK';
  const desc = wp.description || 'Campaigns, key visuals and visual systems.';
  const accent = site.accent && /^#[0-9a-f]{3,8}$/i.test(site.accent) ? `:root{--accent:${site.accent}}` : '';
  const cards = list.map(p => `
    <a class="work-card" data-cat="${esc(key(p.category))}" href="${esc((p.slug || p.id) + '.html')}">
      ${p.cover ? img(p.cover, String(p.title || '').trim(), base) : ''}
      ${blank(p.password) ? '' : '<span class="lock">🔒 PRIVATE</span>'}
      <div class="more-copy"><small>${[p.category, p.year].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join(' · ')}</small><h3 class="display">${esc(String(p.title || '').trim())}</h3></div>
    </a>`).join('');
  return `<!DOCTYPE html>
<html lang="en"${fxAttr(content)}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(title)} — ${esc(brand)}</title>
<meta name="description" content="${esc(desc)}">
${FX_HEAD}
<script>(function(){try{var q=new URLSearchParams(location.search).get('lang');if((q||localStorage.getItem('nnd-lang'))==='vi'){var d=document.documentElement;d.classList.add('i18n-wait');setTimeout(function(){d.classList.remove('i18n-wait')},2500)}}catch(e){}})()</script><style>.i18n-wait body{opacity:0}</style>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Geist+Mono:wght@500&family=Space+Grotesk:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/fx.css">
<style>${CSS}${accent}</style>
</head>
<body>
<nav class="project-nav">
  <a href="../index.html">← HOME</a>
  <a href="../index.html#contact">START A PROJECT +</a>
</nav>
<main class="project-page work-page">
  <section class="section work-head">
    <h1 class="display">${esc(title)}</h1>
    <p>${esc(desc)}</p>
    <div class="work-filter" role="group" aria-label="Filter">
      <button type="button" data-filter="*" aria-pressed="true"><span>All</span> <b>${list.length}</b></button>${cats.map(c => `<button type="button" data-filter="${esc(key(c))}" aria-pressed="false"><span>${esc(c)}</span> <b>${list.filter(p => key(p.category) === key(c)).length}</b></button>`).join('')}
    </div>
  </section>
  <section class="work-grid">${cards}
  </section>
</main>
<footer class="footer">
  <span>${esc(copyright).toUpperCase()}</span>
  <span>INDEPENDENT · ${esc(location).toUpperCase()}</span>
</footer>
<script>${WORK_JS}</script>
<script src="../assets/fx.js" defer></script>
${i18nData(content)}
<script src="../assets/to-top.js" defer></script>
<script src="../assets/i18n.js" defer></script>
</body>
</html>
`;
}

// Before/After drag + image viewer (lightbox). Exposed as __nndPageInit so a private page can run it after unlocking.
const PAGE_JS = `
(function(){
  function initBA(){[].forEach.call(document.querySelectorAll('[data-ba]'),function(f){if(f._ba)return;f._ba=1;var r=f.querySelector('input');function set(){f.style.setProperty('--pos',r.value+'%')}r.addEventListener('input',set);set()})}
  var lb=null,imgs=[],cur=0,last=null;
  function big(im){var ss=im.getAttribute('srcset');if(ss){var best=ss.split(',').map(function(s){var p=s.trim().split(/\\s+/);return{u:p[0],w:parseInt(p[1],10)||0}}).sort(function(a,b){return b.w-a.w})[0];if(best&&best.u)return best.u}return im.currentSrc||im.src}
  function build(){lb=document.createElement('div');lb.className='lb';lb.setAttribute('role','dialog');lb.setAttribute('aria-modal','true');lb.setAttribute('aria-label','Image viewer');
    lb.innerHTML='<img alt=""><button type="button" class="lb-x" aria-label="Close">✕</button><button type="button" class="lb-p" aria-label="Previous">←</button><button type="button" class="lb-n" aria-label="Next">→</button><span class="lb-c"></span>';
    document.body.appendChild(lb);
    lb.addEventListener('click',function(e){var c=e.target.classList;if(e.target===lb||c.contains('lb-x'))close();else if(c.contains('lb-p'))go(-1);else if(c.contains('lb-n'))go(1)});
    var sx=null;lb.addEventListener('touchstart',function(e){sx=e.touches[0].clientX},{passive:true});
    lb.addEventListener('touchend',function(e){if(sx==null)return;var dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>50)go(dx<0?1:-1);sx=null})}
  function show(){var im=imgs[cur],el=lb.querySelector('img');el.src=big(im);el.alt=im.alt||'';lb.querySelector('.lb-c').textContent=(cur+1)+' / '+imgs.length;lb.classList.toggle('single',imgs.length<2)}
  function open(i){if(!lb)build();last=document.activeElement;cur=i;show();lb.classList.add('on');document.documentElement.style.overflow='hidden';lb.querySelector('.lb-x').focus()}
  function close(){lb.classList.remove('on');document.documentElement.style.overflow='';if(last&&last.focus)last.focus()}
  function go(d){cur=(cur+d+imgs.length)%imgs.length;show()}
  document.addEventListener('keydown',function(e){if(!lb||!lb.classList.contains('on'))return;if(e.key==='Escape')close();else if(e.key==='ArrowRight')go(1);else if(e.key==='ArrowLeft')go(-1)});
  function initLB(){imgs=[].slice.call(document.querySelectorAll('.gallery img, .bleed img, .chapter-media img'));
    imgs.forEach(function(im){if(im._lb)return;im._lb=1;im.tabIndex=0;im.setAttribute('role','button');
      im.addEventListener('click',function(){open(imgs.indexOf(im))});
      im.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open(imgs.indexOf(im))}})})}
  window.__nndPageInit=function(){initBA();initLB();if(window.__nndFx)window.__nndFx.refresh()};
  window.__nndPageInit();
})();`;

// All-work page: category filter chips
const WORK_JS = `
document.addEventListener('click',function(e){var b=e.target.closest('[data-filter]');if(!b)return;var f=b.getAttribute('data-filter');
  [].forEach.call(document.querySelectorAll('[data-filter]'),function(x){x.setAttribute('aria-pressed',String(x===b))});
  [].forEach.call(document.querySelectorAll('.work-card'),function(c){c.hidden=f!=='*'&&c.getAttribute('data-cat')!==f})});`;

const CSS = `
:root{--black:#080808;--dark:#141414;--white:#f7f5ef;--soft:#ebe8e1;--muted:#9a9a96;--accent:#4c6fff;--accent-soft:#8ea1ff}
*{box-sizing:border-box}
html{scroll-behavior:smooth;background:var(--black)}
body{margin:0;background:var(--black);color:var(--white);font-family:Inter,Arial,sans-serif}
a{color:inherit;text-decoration:none}
img{display:block;width:100%;height:100%;object-fit:cover}
figure{margin:0}
.display{font-family:"Space Grotesk",Inter,sans-serif;text-transform:uppercase;letter-spacing:-.065em;line-height:.92;font-weight:600}
.mono{font-family:"Geist Mono",monospace;text-transform:uppercase;letter-spacing:-.04em}
.project-page{padding:8px;display:flex;flex-direction:column;gap:8px}
.project-nav{position:fixed;z-index:50;top:22px;left:22px;right:22px;display:flex;justify-content:space-between;align-items:center;pointer-events:none}
.project-nav a{pointer-events:auto;display:inline-flex;align-items:center;gap:10px;padding:13px 16px;border-radius:999px;background:rgba(8,8,8,.35);backdrop-filter:blur(26px);-webkit-backdrop-filter:blur(26px);border:1px solid rgba(255,255,255,.16);font-family:"Geist Mono",monospace;font-size:11px;transition:background .25s,color .25s}
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
.meta span{border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:8px 11px;font:10px "Geist Mono",monospace;text-transform:uppercase}

/* shared section */
.section{border-radius:100px;overflow:hidden;background:var(--dark)}
.eyebrow{color:var(--accent-soft);font:12px "Geist Mono",monospace;text-transform:uppercase}

/* overview */
.overview{min-height:680px;padding:100px 7vw;display:grid;grid-template-columns:.8fr 1.2fr;gap:80px;align-items:start}
.overview h2{margin:16px 0 0;font-size:clamp(52px,7vw,100px)}
.overview-copy{font-size:clamp(22px,2.3vw,36px);line-height:1.18;letter-spacing:-.03em}
.overview-copy p{margin:0 0 34px}
.details{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:18px;margin-top:60px}
.detail{padding-top:16px;border-top:1px solid rgba(255,255,255,.16)}
.detail b{display:block;margin-bottom:8px;font:10px "Geist Mono",monospace;color:var(--muted);text-transform:uppercase}
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
.step-num{font:12px "Geist Mono",monospace;color:var(--accent-soft)}
.step h3{margin:0;font-size:clamp(34px,3.4vw,52px)}
.step p{margin:0;color:#cfcfcb;font-size:16px;line-height:1.5}

/* credits */
.credits{padding:60px 7vw;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:24px}
.credits b{display:block;margin-bottom:10px;font:10px "Geist Mono",monospace;color:var(--muted);text-transform:uppercase}
.credits span{font-family:"Space Grotesk",sans-serif;font-size:clamp(18px,1.6vw,24px);text-transform:uppercase;letter-spacing:-.03em}

/* next */
.next{position:relative;min-height:620px;display:flex;align-items:flex-end;border-radius:100px;overflow:hidden;background:#1b1b1b}
.next img{position:absolute;inset:0;transition:transform .9s cubic-bezier(.22,.75,.24,1)}
/* before / after */
.ba-wrap{padding-top:8px;padding-bottom:8px}
.ba{position:relative;margin:0;border-radius:100px;overflow:hidden;background:#1b1b1b;user-select:none;touch-action:pan-y}
.ba>img{display:block;width:100%;height:auto}
.ba-before{position:absolute;inset:0;clip-path:inset(0 calc(100% - var(--pos)) 0 0)}
.ba-before img{width:100%;height:100%;object-fit:cover}
.ba-line{position:absolute;top:0;bottom:0;left:var(--pos);width:2px;margin-left:-1px;background:#fff;pointer-events:none}
.ba-line span{position:absolute;top:50%;left:50%;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;background:#fff;color:#000;display:grid;place-items:center;font-size:20px;box-shadow:0 8px 24px rgba(0,0,0,.35)}
.ba-range{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:ew-resize}
.ba-tag{position:absolute;top:28px;padding:9px 14px;border-radius:999px;background:rgba(8,8,8,.55);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);font:11px "Geist Mono",monospace;text-transform:uppercase;pointer-events:none}
.ba-tag-b{left:28px}.ba-tag-a{right:28px}
.ba-cap{margin:16px 0 0;text-align:center;color:var(--muted);font-size:14px}
.ba-edit{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ba-pane{margin:0;min-height:420px;border-radius:72px;overflow:hidden;background:#1b1b1b}
.ba-edit .ba-tag{top:28px;pointer-events:auto}.ba-edit .ba-tag-a{right:auto;left:calc(50% + 28px)}.ba-edit .ba-cap{grid-column:1/-1}
/* results */
.results{padding:110px 6vw}
.results-grid{display:grid;grid-template-columns:repeat(var(--n,4),minmax(0,1fr));gap:8px;margin-top:28px}
.results-grid.cols-1{--n:1}.results-grid.cols-2{--n:2}.results-grid.cols-3{--n:3}.results-grid.cols-4{--n:4}
.result{padding:40px 34px;border-radius:46px;background:#141414;border:1px solid rgba(255,255,255,.08);display:flex;flex-direction:column;gap:14px}
.result strong{font-size:clamp(48px,6vw,96px);line-height:.9;color:var(--accent-soft)}
.result span{color:#cfcfcf;font-size:15px;line-height:1.35}
/* image viewer */
.gallery img,.bleed img,.chapter-media img{cursor:zoom-in}
.lb{position:fixed;inset:0;z-index:200;background:rgba(5,5,5,.94);display:none;align-items:center;justify-content:center;padding:70px 90px}
.lb.on{display:flex}
.lb img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;border-radius:18px}
.lb button{position:absolute;width:52px;height:52px;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:rgba(0,0,0,.4);color:#fff;font-size:20px;cursor:pointer}
.lb button:hover{background:#fff;color:#000}
.lb-x{top:18px;right:18px}.lb-p{left:18px;top:50%;margin-top:-26px}.lb-n{right:18px;top:50%;margin-top:-26px}
.lb.single .lb-p,.lb.single .lb-n,.lb.single .lb-c{display:none}
.lb-c{position:absolute;bottom:22px;left:50%;transform:translateX(-50%);font:11px "Geist Mono",monospace;color:#bbb}
/* private tag */
.lock{position:absolute;z-index:3;top:26px;left:26px;padding:8px 12px;border-radius:999px;background:rgba(8,8,8,.6);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);font:11px "Geist Mono",monospace}
/* all-work page */
.work-head{padding:150px 6vw 50px}
.work-head h1{margin:0;font-size:clamp(64px,11vw,190px)}
.work-head p{max-width:560px;color:#cfcfcf;font-size:18px;line-height:1.4;margin:22px 0 34px}
.work-filter{display:flex;flex-wrap:wrap;gap:8px}
.work-filter button{display:inline-flex;gap:8px;align-items:center;padding:12px 18px;border-radius:999px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#fff;font:12px "Geist Mono",monospace;text-transform:uppercase;cursor:pointer;transition:background .25s,color .25s}
.work-filter button b{font-weight:500;opacity:.55}
.work-filter button[aria-pressed="true"],.work-filter button:hover{background:var(--white);color:var(--black)}
.work-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.work-card{position:relative;min-height:560px;display:flex;align-items:flex-end;border-radius:72px;overflow:hidden;background:#1b1b1b}
.work-card[hidden]{display:none}
.work-card img{position:absolute;inset:0;transition:transform .9s cubic-bezier(.22,.75,.24,1)}
.work-card:hover img{transform:scale(1.04)}
.work-card:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 35%,rgba(0,0,0,.78))}
@media (max-width:900px){.ba,.ba-pane{border-radius:52px}.ba-edit{grid-template-columns:1fr}.ba-edit .ba-tag-a{left:28px;top:calc(50% + 28px)}.ba-tag{top:18px}.ba-tag-b{left:18px}.ba-tag-a{right:18px}
  .results{padding:80px 28px}.results-grid{grid-template-columns:1fr 1fr}.result{padding:30px 24px;border-radius:36px}
  .lb{padding:60px 12px}.lb-p,.lb-n{top:auto;bottom:14px;margin-top:0}.lb-c{bottom:30px}
  .work-head{padding:120px 24px 36px}.work-grid{grid-template-columns:1fr}.work-card{min-height:420px;border-radius:52px}}
.more{padding-top:90px}
.more-head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;padding:0 24px 28px}
.more-head h2{margin:0;font-size:clamp(40px,5vw,76px)}
.more-head a{flex:none;padding:13px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.2);font:11px "Geist Mono",monospace;transition:background .25s,color .25s}
.more-head a:hover{background:var(--white);color:var(--black)}
.more-grid{display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:8px}
.more-card{position:relative;min-height:480px;display:flex;align-items:flex-end;border-radius:72px;overflow:hidden;background:#1b1b1b}
.more-card img{position:absolute;inset:0;transition:transform .9s cubic-bezier(.22,.75,.24,1)}
.more-card:hover img{transform:scale(1.04)}
.more-card:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 35%,rgba(0,0,0,.78))}
.more-copy{position:relative;z-index:2;padding:40px}
.more-copy small{font:11px "Geist Mono",monospace;color:#ddd;text-transform:uppercase}
.more-copy h3{margin:10px 0 0;font-size:clamp(28px,2.8vw,46px)}
@media (max-width:900px){.more-grid{grid-template-columns:1fr}.more-card{min-height:380px;border-radius:52px}.more-copy{padding:30px 26px}.more{padding-top:60px}}
.next:hover img{transform:scale(1.03)}
.next:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.75))}
.next-copy{position:relative;z-index:2;padding:60px}
.next-copy small{font:11px "Geist Mono",monospace;color:#ddd}
.next-copy h3{margin:10px 0 0;font-size:clamp(58px,8vw,120px)}
.footer{padding:80px 104px 40px 32px;display:flex;justify-content:space-between;gap:30px;color:#777;font:11px "Geist Mono",monospace}

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

const api = { renderWorkPage, renderProjectPage, renderBlock, BLOCKS, PRESETS, GALLERY_STYLES, presetBlocks, material, blocksOf };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.ProjectTemplate = api;
})();
