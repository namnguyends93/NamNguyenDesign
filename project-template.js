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
// Image slots that may also hold a video file (full-width image, chapter image): muted, looped, plays while visible
const med = (s, alt, base) => isVid(s) ? vidTag(s, '', base, 'loop') : img(s, alt, base);
function embedUrl(u) {
  u = String(u || '').trim(); let m;
  if ((m = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/))) return 'https://www.youtube-nocookie.com/embed/' + m[1] + '?rel=0&modestbranding=1&playsinline=1';
  if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/))) return 'https://player.vimeo.com/video/' + m[1] + '?dnt=1';
  return '';
}
// Effects switched on in the editor (site.effects) → <html data-fx="…"> read by assets/fx.js
const fxAttr = content => { const e = (content.site && content.site.effects) || {}; return ' data-fx="' + ['intro', 'transitions', 'reveal', 'count', 'smooth'].filter(k => e[k] !== false).join(' ') + '"'; };
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
// Character styles chosen in the editor (font, size, weight, leading, tracking, align, case, italic):
// project.styles[field] / block.styles[field] = { ff, fs, fw, lh, ls, ta, tt, fi }. Size shrinks below 1440px, never under 14px.
const TYPE_FONTS = {'Space Grotesk':'Space+Grotesk:wght@300..700','Inter':'Inter:ital,wght@0,300..800;1,300..800','Syne':'Syne:wght@400..800','Archivo':'Archivo:ital,wght@0,300..800;1,300..800','Unbounded':'Unbounded:wght@300..800','Bricolage Grotesque':'Bricolage+Grotesque:wght@300..800','Playfair Display':'Playfair+Display:ital,wght@0,400..900;1,400..900','DM Serif Display':'DM+Serif+Display:ital@0;1','Anton':'Anton','Be Vietnam Pro':'Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,700'};
function typeDecl(o) {
  if (!o || typeof o !== 'object') return [];
  const d = [], n = v => v !== '' && v != null && isFinite(+v);
  if (o.ff && TYPE_FONTS[o.ff]) d.push('font-family:"' + o.ff + '",Inter,sans-serif');
  if (n(o.fs) && +o.fs > 0) { const s = Math.round(+o.fs * 10) / 10; d.push('font-size:' + (s <= 14 ? s + 'px' : 'clamp(14px,' + (s / 14.4).toFixed(3) + 'vw,' + s + 'px)')); }
  if (n(o.fw)) d.push('font-weight:' + Math.round(+o.fw));
  if (n(o.lh) && +o.lh > 0) d.push('line-height:' + +o.lh);
  if (n(o.ls)) d.push('letter-spacing:' + (+o.ls / 1000) + 'em');
  if (/^(left|center|right|justify)$/.test(o.ta || '')) d.push('text-align:' + o.ta);
  if (/^(none|uppercase|lowercase|capitalize)$/.test(o.tt || '')) d.push('text-transform:' + o.tt);
  if (o.fi === true) d.push('font-style:italic');
  return d;
}
const typeFontsHref = fams => { const f = [...new Set(fams)].filter(x => TYPE_FONTS[x]); return f.length ? 'https://fonts.googleapis.com/css2?' + f.map(x => 'family=' + TYPE_FONTS[x]).join('&') + '&display=swap' : ''; };
const CUR = { p: null, b: null };
function cs(path) {
  const m = String(path).match(/^blocks\.\d+\.(.+)$/);
  const c = m ? (CUR.b && CUR.b.colors && CUR.b.colors[m[1]]) : (CUR.p && CUR.p.colors && CUR.p.colors[path]);
  const t = m ? (CUR.b && CUR.b.styles && CUR.b.styles[m[1]]) : (CUR.p && CUR.p.styles && CUR.p.styles[path]);
  const d = (/^#[0-9a-f]{3,8}$/i.test(c || '') ? ['color:' + c] : []).concat(typeDecl(t));
  return d.length ? ` style="${esc(d.join(';'))}"` : '';
}
function pageTypeFonts(p) { const out = []; const add = st => Object.values(st || {}).forEach(o => o && o.ff && out.push(o.ff)); add(p.styles); (p.blocks || []).forEach(b => add(b && b.styles)); const h = typeFontsHref(out); return h ? `\n<link href="${h}" rel="stylesheet">` : ''; }
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
// Banner modules (slider / banners): frame ratios, transitions, corner sizes
const RATIOS = [['16x9', 'Ngang 16:9'], ['3x1', 'Banner web 3:1'], ['21x9', 'Siêu ngang 21:9'], ['4x5', 'Dọc 4:5 (post)'], ['1x1', 'Vuông 1:1'], ['3x4', 'Dọc 3:4'], ['9x16', 'Dọc 9:16 (story)'], ['auto', 'Theo tỉ lệ ảnh đầu tiên']];
const RAT = { '16x9': [16, 9], '3x1': [3, 1], '21x9': [21, 9], '4x5': [4, 5], '1x1': [1, 1], '3x4': [3, 4], '9x16': [9, 16] };
const SLIDER_FX = [['slide', 'Trượt ngang'], ['fade', 'Mờ dần + zoom chậm'], ['wipe', 'Màn che quét qua'], ['peek', 'Thẻ giữa nổi, 2 bên lấp ló'], ['marquee', 'Băng chạy liên tục (nhiều banner)']];
const BANNER_FX = [['rise', 'Bay lên lần lượt'], ['wipe', 'Màn che mở ra'], ['zoom', 'Ảnh thu vào khung'], ['tilt', 'Nghiêng 3D theo chuột'], ['none', 'Không hiệu ứng']];
const RADII = [['xl', 'Bo như trang (32px)'], ['md', 'Bo vừa (24px)'], ['lg', 'Bo lớn (48px)'], ['sm', 'Bo nhỏ (12px)'], ['0', 'Góc vuông']];
const arStyle = r => { const a = RAT[r]; return a ? `--ar:${a[0]}/${a[1]};--arn:${(a[0] / a[1]).toFixed(4)}` : ''; };
const radOf = (v, d) => ['xl', 'md', 'lg', 'sm', '0'].includes(String(v ?? '')) ? String(v) : (d || 'md');
// "Bố cục khung" templates: n frames per group, container ratio, grid columns / rows / areas (a, b, c … = frame 1, 2, 3 …)
const FRAMES = {
  'big-left':    { n: 3, label: '1 lớn trái + 2 nhỏ phải', ar: '16/10', c: '2fr 1fr', r: '1fr 1fr', a: ['a b', 'a c'] },
  'big-right':   { n: 3, label: '2 nhỏ trái + 1 lớn phải', ar: '16/10', c: '1fr 2fr', r: '1fr 1fr', a: ['b a', 'c a'] },
  'top-big':     { n: 3, label: '1 ngang trên + 2 dưới', ar: '5/4', c: '1fr 1fr', r: '1fr 1fr', a: ['a a', 'b c'] },
  'bottom-big':  { n: 3, label: '2 trên + 1 ngang dưới', ar: '5/4', c: '1fr 1fr', r: '1fr 1fr', a: ['b c', 'a a'] },
  'one-three':   { n: 4, label: '1 ngang trên + 3 dưới', ar: '4/3', c: '1fr 1fr 1fr', r: '1.4fr 1fr', a: ['a a a', 'b c d'] },
  'bento':       { n: 5, label: 'Bento: 1 lớn + 4 nhỏ', ar: '2/1', c: '2fr 1fr 1fr', r: '1fr 1fr', a: ['a b c', 'a d e'] },
  'bento-r':     { n: 5, label: 'Bento ngược: 4 nhỏ + 1 lớn', ar: '2/1', c: '1fr 1fr 2fr', r: '1fr 1fr', a: ['b c a', 'd e a'] },
  'mosaic':      { n: 4, label: 'Mosaic: dọc · 2 chồng · dọc', ar: '3/2', c: '1fr 1fr 1fr', r: '1fr 1fr', a: ['a b d', 'a c d'] },
  'wide-narrow': { n: 2, label: 'Rộng 2/3 + hẹp 1/3', ar: '2/1', c: '2fr 1fr', r: '1fr', a: ['a b'] },
  'narrow-wide': { n: 2, label: 'Hẹp 1/3 + rộng 2/3', ar: '2/1', c: '1fr 2fr', r: '1fr', a: ['a b'] },
  'full':        { n: 1, label: '1 khung ngang 16:10', ar: '16/10', c: '1fr', r: '1fr', a: ['a'] },
  'half':        { n: 2, label: '2 khung dọc 4:5', ar: '8/5', c: '1fr 1fr', r: '1fr', a: ['a b'] },
  'thirds':      { n: 3, label: '3 khung dọc 3:4', ar: '9/4', c: '1fr 1fr 1fr', r: '1fr', a: ['a b c'] },
  'quarters':    { n: 4, label: '4 khung vuông', ar: '4/1', c: 'repeat(4,1fr)', r: '1fr', a: ['a b c d'] },
  'grid6':       { n: 6, label: 'Lưới 6 ô (3 × 2)', ar: '3/2', c: '1fr 1fr 1fr', r: '1fr 1fr', a: ['a b c', 'd e f'] },
  'story3':      { n: 3, label: '3 khung story 9:16', ar: '27/16', c: '1fr 1fr 1fr', r: '1fr', a: ['a b c'], tall: 1 },
  'story5':      { n: 5, label: '5 khung story 9:16', ar: '45/16', c: 'repeat(5,1fr)', r: '1fr', a: ['a b c d e'], tall: 1 },
};
const FRAME_OPTS = Object.entries(FRAMES).map(([k, t]) => [k, t.label]);
const pad2 = n => String(n).padStart(2, '0');
const AREA = 'abcdef';
const BLOCKS = {
  overview:  { label: 'Overview', hint: 'Headline + Description + thông tin Client / Role / Scope / Year (lấy từ phần trên).', fields: [] },
  intro:     { label: 'Giới thiệu ngắn', hint: 'Description căn giữa + thông tin. Thay cho Overview khi muốn trang gọn.', fields: [] },
  gallery:   { label: 'Gallery ảnh', hint: 'Bao nhiêu ảnh cũng được, tự chia hàng theo kiểu đã chọn.', fields: [
    { k: 'style', label: 'Kiểu lưới', kind: 'select', options: GALLERY_STYLES },
    { k: 'images', label: 'Ảnh — mỗi dòng 1 ảnh', kind: 'images', note: 'Ảnh 2 cột: dọc 1600×2000 (4:5) · 3 cột: dọc 1200×1600 (3:4) · ảnh nằm 1 mình 1 hàng: ngang 2400 px, cao tuỳ ý. Ảnh cùng hàng nên cùng tỉ lệ.' }] },
  frames:    { label: 'Bố cục khung (chia ô sẵn)', hint: 'Chọn 1 trong 17 mẫu chia khung (1 lớn + 2 nhỏ, bento, mosaic, story…) rồi up ảnh: ảnh tự điền vào từng ô theo thứ tự. Nhiều ảnh hơn số ô thì mẫu tự lặp lại.', fields: [
    { k: 'tpl', label: 'Mẫu chia khung', kind: 'select', options: FRAME_OPTS },
    { k: 'images', label: 'Ảnh — mỗi dòng 1 ảnh (điền vào ô theo thứ tự)', kind: 'images', note: 'Ô lớn là ảnh đầu tiên của mỗi nhóm. Ảnh được cắt vừa ô (giữ giữa); chọn “Hiện đủ ảnh” nếu là banner có chữ.' },
    { k: 'fit', label: 'Cách đặt ảnh', kind: 'select', options: [['cover', 'Lấp đầy ô (cắt vừa)'], ['contain', 'Hiện đủ ảnh (không cắt, nền tối)']] },
    { k: 'fx', label: 'Hiệu ứng', kind: 'select', options: BANNER_FX },
    { k: 'radius', label: 'Bo góc', kind: 'select', options: RADII },
    { k: 'caption', label: 'Chú thích (không bắt buộc)', kind: 'text' }] },
  slider:    { label: 'Slide banner (trình chiếu)', hint: 'Banner chạy thành slide: nút ← →, chấm tiến độ, vuốt / kéo chuột, tự chuyển. Chọn 1 trong 5 hiệu ứng.', fields: [
    { k: 'images', label: 'Banner — mỗi dòng 1 ảnh', kind: 'images', note: 'Các banner trong 1 slide nên cùng kích thước. Ngang 16:9 → 2400×1350 · banner web 3:1 → 2400×800 · dọc 4:5 → 1600×2000 · story 9:16 → 1080×1920.' },
    { k: 'effect', label: 'Hiệu ứng chuyển', kind: 'select', options: SLIDER_FX },
    { k: 'ratio', label: 'Khung hình', kind: 'select', options: RATIOS },
    { k: 'auto', label: 'Tự chuyển', kind: 'select', options: [['5', 'Mỗi 5 giây'], ['3', 'Mỗi 3 giây'], ['8', 'Mỗi 8 giây'], ['0', 'Không tự chuyển']] },
    { k: 'radius', label: 'Bo góc khung', kind: 'select', options: RADII },
    { k: 'caption', label: 'Chú thích (không bắt buộc)', kind: 'text' }] },
  banners:   { label: 'Khung banner (lưới ảnh)', hint: 'Chỉ cần chọn khung và up ảnh: banner hiện đúng tỉ lệ, không bị cắt (chọn “Giữ nguyên tỉ lệ ảnh”), kèm hiệu ứng khi cuộn tới.', fields: [
    { k: 'images', label: 'Banner — mỗi dòng 1 ảnh', kind: 'images', note: 'Chọn “Giữ nguyên tỉ lệ ảnh” thì banner nào cũng hiện đủ, không cắt. Chọn khung cố định thì ảnh được cắt vừa khung (giữ giữa).' },
    { k: 'cols', label: 'Số cột', kind: 'select', options: [['2', '2 cột'], ['1', '1 cột (to)'], ['3', '3 cột'], ['4', '4 cột']] },
    { k: 'ratio', label: 'Khung hình', kind: 'select', options: [['auto', 'Giữ nguyên tỉ lệ ảnh (không cắt)']].concat(RATIOS.filter(r => r[0] !== 'auto')) },
    { k: 'fx', label: 'Hiệu ứng', kind: 'select', options: BANNER_FX },
    { k: 'radius', label: 'Bo góc khung', kind: 'select', options: RADII },
    { k: 'caption', label: 'Chú thích (không bắt buộc)', kind: 'text' }] },
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
  return `<div class="details">${items.map(([l, v, k]) => `<div class="detail"><b>${esc(l)}:</b>${VE ? edT('span', '', k, v, '—') : `<span${cs(k)}>${esc(v)}</span>`}</div>`).join('')}</div>`;
}

function renderBlock(b, p, base) {
  const title = String(p.title || '').trim();
  const desc = p.description || '';
  const metaTags = metaSpans(p);
  switch (b.type) {
    case 'overview':
    case 'intro': return (desc || VE || DETAIL_FIELDS.some(([k]) => p[k])) ? `
  <section class="section overview">
    ${VE ? edT('div', 'ov-desc', 'description', desc, 'Nhập mô tả dự án…', true) : desc ? `<div class="ov-desc"${cs('description')}>${P(desc)}</div>` : '<div></div>'}
    ${details(p)}
  </section>` : '';
    case 'gallery': return gallery(list(b.images), b.style, title, base);
    case 'frames': {
      const ims = list(b.images), T = FRAMES[b.tpl] || FRAMES['big-left'], rad = radOf(b.radius, 'xl');
      const fx = BANNER_FX.some(o => o[0] === b.fx) ? b.fx : 'rise', fit = b.fit === 'contain' ? ' fit-contain' : '';
      if (!ims.length && !VE) return '';
      const total = VE ? Math.max(ims.length, T.n) : ims.length, groups = [];
      const cell = (k, area) => { const s2 = ims[k]; return `<figure class="bg-item${s2 ? '' : ' ve-cell'}"${area ? ` style="grid-area:${area}"` : ''}${ati(bk('images.' + k))}>${s2 ? `<div class="bg-in">${med(s2, `${title} — ${k + 1}`, base)}</div>` : ''}</figure>`; };
      for (let g = 0; g < total; g += T.n) {
        const cnt = Math.min(T.n, total - g);
        if (cnt === T.n) groups.push(`<div class="bgrid fgrid${T.tall ? ' tall' : ''} r-${rad}${fit}" data-bfx="${VE ? 'none' : fx}" style="--far:${T.ar};grid-template-columns:${T.c};grid-template-rows:${T.r};grid-template-areas:${T.a.map(x => `'${x}'`).join(' ')}">${[...Array(T.n)].map((_, j) => cell(g + j, AREA[j])).join('')}</div>`);
        else groups.push(`<div class="bgrid frest c-${cnt}${T.tall ? ' tall' : ''} r-${rad}${fit}" data-bfx="${VE ? 'none' : fx}">${[...Array(cnt)].map((_, j) => cell(g + j, '')).join('')}</div>`);
      }
      const cap = VE ? edT('p', 'bg-cap', bk('caption'), b.caption, 'Chú thích (không bắt buộc)') : b.caption ? `<p class="bg-cap"${cs(bk('caption'))}>${esc(b.caption)}</p>` : '';
      return `
  <section class="section frames-wrap">${groups.join('')}${cap}</section>`;
    }
    case 'slider': {
      const ims = list(b.images), n = ims.length, fx = SLIDER_FX.some(o => o[0] === b.effect) ? b.effect : 'slide';
      const r = RAT[b.ratio] || b.ratio === 'auto' ? (b.ratio || '16x9') : '16x9', rad = radOf(b.radius);
      const st = arStyle(r) || '--ar:16/9;--arn:1.7778';
      const cap = VE ? edT('p', 'bs-cap', bk('caption'), b.caption, 'Chú thích (không bắt buộc)') : b.caption ? `<p class="bs-cap"${cs(bk('caption'))}>${esc(b.caption)}</p>` : '';
      if (!n) return VE ? `<section class="section ve-ph">Slide banner trống — bấm “+ Ảnh / Video” ở bảng bên phải</section>` : '';
      if (VE) return `
  <section class="section bslider-ve r-${rad}${r === 'auto' ? ' ar-auto' : ''}" style="${st}"><div class="bsv-tag">SLIDE BANNER · ${n} slide · ${esc((SLIDER_FX.find(o => o[0] === fx) || [])[1])} — hiệu ứng chạy ở trang thật (Xem trang)</div>
    <div class="bsv-grid">${ims.map((s2, k) => `<figure class="bs-slide"${ati(bk('images.' + k))}>${med(s2, `${title} — banner ${k + 1}`, base)}</figure>`).join('')}</div>${cap}</section>`;
      const slides = ims.map((s2, k) => `<figure class="bs-slide"${fx === 'marquee' ? '' : ` aria-roledescription="slide" aria-label="${k + 1} / ${n}"`}>${med(s2, `${title} — banner ${k + 1}`, base)}</figure>`).join('');
      if (fx === 'marquee') return `
  <section class="section bslider bsx-marquee r-${rad}${r === 'auto' ? ' ar-auto' : ''}" style="${st};--n:${n}"><div class="bs-mq">${slides}${slides.replace(/<figure/g, '<figure aria-hidden="true"')}</div>${cap}</section>`;
      const auto = ['0', '3', '5', '8'].includes(String(b.auto ?? '')) ? String(b.auto) : '5';
      return `
  <section class="section bslider bsx-${fx} r-${rad}" style="${st}" data-slider data-auto="${n > 1 ? auto : 0}"${r === 'auto' ? ' data-ar-auto' : ''} aria-roledescription="carousel" aria-label="${esc(title)} — banners" tabindex="0">
    <div class="bs-view"><div class="bs-track">${slides}</div></div>
    ${n > 1 ? `<div class="bs-ui"><button type="button" class="bs-btn bs-prev" aria-label="Previous">←</button><div class="bs-dots">${ims.map((_, k) => `<button type="button" aria-label="Slide ${k + 1}"><i></i></button>`).join('')}</div><span class="bs-count"><b>01</b> / ${pad2(n)}</span><button type="button" class="bs-btn bs-next" aria-label="Next">→</button></div>` : ''}${cap}
  </section>`;
    }
    case 'banners': {
      const ims = list(b.images), n = ims.length;
      if (!n) return VE ? `<section class="section ve-ph">Khung banner trống — bấm “+ Ảnh / Video” ở bảng bên phải</section>` : '';
      const c = Math.min(['1', '2', '3', '4'].includes(String(b.cols ?? '')) ? +b.cols : 2, n), r = RAT[b.ratio] ? b.ratio : 'auto', rad = radOf(b.radius);
      const fx = BANNER_FX.some(o => o[0] === b.fx) ? b.fx : 'rise';
      const cap = VE ? edT('p', 'bg-cap', bk('caption'), b.caption, 'Chú thích (không bắt buộc)') : b.caption ? `<p class="bg-cap"${cs(bk('caption'))}>${esc(b.caption)}</p>` : '';
      return `
  <section class="section bgrid-wrap"><div class="bgrid c-${c} r-${rad}${r === 'auto' ? ' ar-auto' : ''}"${r === 'auto' ? '' : ` style="${arStyle(r)}"`} data-bfx="${VE ? 'none' : fx}">${ims.map((s2, k) => `<figure class="bg-item"${ati(bk('images.' + k))}><div class="bg-in">${med(s2, `${title} — banner ${k + 1}`, base)}</div></figure>`).join('')}</div>${cap}</section>`;
    }
    case 'image': return (b.image || VE) ? `
  <figure class="bleed"${ati(bk('image'))}>${b.image ? med(b.image, `${title} — key visual`, base) : ''}</figure>` : '';
    case 'chapter': {
      if (VE) return `
  <section class="chapter-split${b.side === 'left' ? ' reverse' : ''}">
    <div class="section chapter-copy">${edT('div', 'eyebrow', bk('label'), b.label, 'Nhãn (vd 01 / Challenge)')}${edT('div', 'chapter-text', bk('text'), b.text, 'Nhập nội dung…', true)}</div>
    <figure class="chapter-media"${ati(bk('image'))}>${b.image ? med(b.image, `${title} — ${b.label || 'detail'}`, base) : ''}</figure>
  </section>`;
      if (!b.text && !b.image) return '';
      const eyebrow = b.label ? `<div class="eyebrow"${cs(bk('label'))}>${esc(b.label)}</div>` : '';
      if (!b.image) return renderBlock({ type: 'text', label: b.label, text: b.text }, p, base);
      return `
  <section class="chapter-split${b.side === 'left' ? ' reverse' : ''}">
    <div class="section chapter-copy">${eyebrow}${b.text ? `<div class="chapter-text"${cs(bk('text'))}>${P(b.text)}</div>` : ''}</div>
    <figure class="chapter-media">${med(b.image, `${title} — ${b.label || 'detail'}`, base)}</figure>
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

  const hasOv = blocks.some(b => b && (b.type === 'overview' || b.type === 'intro'));
  const hero = `
  <header class="p-head">
    <h1 class="p-title"${at('title')}${cs('title')}>${esc(title)}</h1>
    <div class="p-sub">${VE ? edT('span', '', 'category', p.category, 'Chuyên mục') + edT('span', '', 'year', p.year, 'Năm') : metaTags}</div>
    ${hasOv ? '' : VE ? edT('p', 'p-lead', 'description', desc, 'Mô tả ngắn…') : desc ? `<p class="p-lead"${cs('description')}>${esc(paras(desc)[0])}</p>` : ''}
  </header>
  <figure class="hero hero-media pf${short ? ' short' : ''}"${ati('cover')}>${p.cover ? img(p.cover, title, base) : ''}${p.coverVideo ? vidTag(p.coverVideo, p.cover, base, 'loop') : ''}</figure>`;

  // Bottom of the page: big Prev / Next (same kind: projects or articles)
  const prev = all.length > 1 ? all[(idx - 1 + all.length) % all.length] : null;
  const nxt = all.length > 1 ? all[(idx + 1) % all.length] : null;
  const pnLink = (o, cls, word, small) => `<a class="${cls}" href="${esc((o.slug || o.id) + '.html')}"><small>${small}</small><b>${word}</b><span>${esc(String(o.title || '').trim())}${blank(o.password) ? '' : ' 🔒'}</span></a>`;
  const nextBlock = nxt ? `
  <nav class="pn" aria-label="More ${isArticle ? 'articles' : 'projects'}">${pnLink(prev, 'pn-prev', '← Prev', isArticle ? 'Previous article' : 'Previous project')}${pnLink(nxt, 'pn-next', 'Next →', isArticle ? 'Next article' : 'Next project')}</nav>` : '';

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
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Geist+Mono:wght@500&family=Space+Grotesk:wght@500;600&display=swap" rel="stylesheet">${pageTypeFonts(p)}
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
${VE ? '' : '<script src="../assets/smooth.js" defer></script>'}
${i18nData(content)}
<script src="../assets/to-top.js" defer></script>
<script src="../assets/i18n.js" defer></script>
</body>
</html>
`;
}

// "All work": every published project with category filter chips → projects/index.html
function renderWorkPage(content, opts) {
  VE = opts && opts.edit ? { i: 0 } : null;
  try { return renderWork(content); } finally { VE = null; }
}
function renderWork(content) {
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
    <a class="work-card" data-cat="${esc(key(p.category))}" href="${esc((p.slug || p.id) + '.html')}"${VE ? ` data-ve-card="${(content.projects || []).indexOf(p)}"` : ''}>
      <div class="wc-media">${p.cover ? img(p.cover, String(p.title || '').trim(), base) : ''}${blank(p.password) ? '' : '<span class="lock">🔒 PRIVATE</span>'}</div>
      <div class="wc-row"><b>${esc(String(p.title || '').trim())}</b><span>${esc(p.category || '')}${p.year ? ' · ' + esc(p.year) : ''}</span></div>
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
    ${VE ? edT('h1', 'display', 'workPage.title', wp.title, 'ALL WORK') + edT('p', '', 'workPage.description', wp.description, 'Campaigns, key visuals and visual systems.') : `<h1 class="display">${esc(title)}</h1>
    <p>${esc(desc)}</p>`}
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
${VE ? '' : `<script>${WORK_JS}</script>`}
<script src="../assets/fx.js" defer></script>
${VE ? '' : '<script src="../assets/smooth.js" defer></script>'}
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
  function initLB(){imgs=[].slice.call(document.querySelectorAll('.gallery img, .bleed img, .chapter-media img, .bgrid img'));
    imgs.forEach(function(im){if(im._lb)return;im._lb=1;im.tabIndex=0;im.setAttribute('role','button');
      im.addEventListener('click',function(){open(imgs.indexOf(im))});
      im.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open(imgs.indexOf(im))}})})}
  var RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function initSliders(){[].forEach.call(document.querySelectorAll('[data-slider]'),function(s){if(s._bs)return;s._bs=1;
    var view=s.querySelector('.bs-view'),tr=s.querySelector('.bs-track'),sl=[].slice.call(s.querySelectorAll('.bs-slide')),n=sl.length,
      dots=[].slice.call(s.querySelectorAll('.bs-dots button')),cnt=s.querySelector('.bs-count b'),
      fx=(s.className.match(/bsx-([a-z]+)/)||[])[1]||'slide',dur=(+s.getAttribute('data-auto')||0)*1000,i=0,t=0,last=0,vis=false,hov=false,drag=null;
    sl.forEach(function(f){var im=f.querySelector('img');if(im){im.loading='eager';im.draggable=false}});
    function off(){if(fx==='slide')return -i*view.clientWidth;if(fx==='peek'){var f=sl[i];return view.clientWidth/2-(f.offsetLeft+f.offsetWidth/2)}return 0}
    function pos(dx,instant){if(fx!=='slide'&&fx!=='peek')return;tr.style.transition=instant?'none':'';tr.style.transform='translate3d('+(off()+(dx||0))+'px,0,0)';if(instant){void tr.offsetWidth;tr.style.transition=''}}
    function go(k,instant){var prev=i;i=((k%n)+n)%n;
      if(fx==='wipe'&&i!==prev&&!instant){s.classList.toggle('back',k<prev);sl[i].classList.remove('was','on');void sl[i].offsetWidth}
      sl.forEach(function(f,j){f.classList.toggle('was',j===prev&&j!==i);f.classList.toggle('on',j===i)});
      dots.forEach(function(d,j){d.classList.toggle('on',j===i);d.style.setProperty('--p',j===i&&!dur?1:0)});
      if(cnt)cnt.textContent=(i+1<10?'0':'')+(i+1);t=0;pos(0,instant)}
    if(s.hasAttribute('data-ar-auto')){var im0=sl[0]&&sl[0].querySelector('img');var setAr=function(){if(!im0.naturalWidth)return;s.style.setProperty('--ar',im0.naturalWidth+'/'+im0.naturalHeight);s.style.setProperty('--arn',(im0.naturalWidth/im0.naturalHeight).toFixed(4));pos(0,true)};if(im0){if(im0.complete)setAr();else im0.addEventListener('load',setAr)}}
    var pb=s.querySelector('.bs-prev'),nb=s.querySelector('.bs-next');if(pb)pb.onclick=function(){go(i-1)};if(nb)nb.onclick=function(){go(i+1)};
    dots.forEach(function(d,j){d.onclick=function(){go(j)}});
    s.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){e.preventDefault();go(i+1)}else if(e.key==='ArrowLeft'){e.preventDefault();go(i-1)}});
    s.addEventListener('mouseenter',function(){hov=true});s.addEventListener('mouseleave',function(){hov=false});
    if(n>1){view.addEventListener('pointerdown',function(e){if(e.button)return;drag={x:e.clientX,y:e.clientY,dx:0,id:e.pointerId};s.classList.add('dragging')});
      view.addEventListener('pointermove',function(e){if(!drag)return;drag.dx=e.clientX-drag.x;if(Math.abs(drag.dx)>6&&!drag.cap){drag.cap=1;try{view.setPointerCapture(drag.id)}catch(_){}}pos(drag.dx*(fx==='peek'?1:.9),true)});
      var up=function(){if(!drag)return;var dx=drag.dx;drag=null;s.classList.remove('dragging');if(Math.abs(dx)>50)go(i+(dx<0?1:-1));else pos(0)};
      view.addEventListener('pointerup',up);view.addEventListener('pointercancel',up);view.addEventListener('lostpointercapture',up)}
    addEventListener('resize',function(){pos(0,true)});
    if('IntersectionObserver' in window)new IntersectionObserver(function(es){vis=es[0].isIntersecting},{threshold:.35}).observe(s);else vis=true;
    function tick(ts){var dt=last?Math.min(ts-last,100):0;last=ts;
      if(dur&&n>1){if(vis&&!hov&&!drag&&!document.hidden){t+=dt;if(t>=dur)go(i+1)}var d=dots[i];if(d)d.style.setProperty('--p',Math.min(1,t/dur).toFixed(3))}
      requestAnimationFrame(tick)}
    go(0,true);if(dur&&n>1)requestAnimationFrame(tick)})}
  function initBanners(){[].forEach.call(document.querySelectorAll('.bgrid[data-bfx]'),function(g){if(g._bg)return;g._bg=1;
    var fx=g.getAttribute('data-bfx'),it=[].slice.call(g.querySelectorAll('.bg-item')),c=+(g.className.match(/c-([0-9])/)||[])[1]||1;
    if(fx==='tilt'){it.forEach(function(f){f.addEventListener('pointermove',function(e){if(e.pointerType!=='mouse')return;var r=f.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
      f.style.setProperty('--ry',((x-.5)*10).toFixed(2)+'deg');f.style.setProperty('--rx',((.5-y)*8).toFixed(2)+'deg');f.style.setProperty('--gx',(x*100).toFixed(1)+'%');f.style.setProperty('--gy',(y*100).toFixed(1)+'%');f.classList.add('tl')});
      f.addEventListener('pointerleave',function(){f.style.removeProperty('--rx');f.style.removeProperty('--ry');f.classList.remove('tl')})});return}
    if(fx==='none'||RM||!('IntersectionObserver' in window))return;
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;io.unobserve(e.target);var f=e.target;f.classList.add('bi');setTimeout(function(){f.classList.remove('bw','bi')},2800)})},{threshold:.12,rootMargin:'0px 0px -6% 0px'});
    it.forEach(function(f,k){var r=f.getBoundingClientRect();if(r.top<innerHeight*.92&&r.bottom>0)return;f.style.setProperty('--d',((k%c)*.12).toFixed(2)+'s');f.classList.add('bw');io.observe(f)})})}
  function initPX(){if(RM||window.__nndPX)return;window.__nndPX=1;var px=[].slice.call(document.querySelectorAll('.pf img, .g-item img, .bleed img, .chapter-media img'));if(!px.length)return;
    px.forEach(function(im){im.classList.add('px')});var busy=false;
    function upd(){busy=false;var vh=innerHeight;px.forEach(function(im){var f=im.closest('.pf,.g-item,.bleed,.chapter-media');if(!f)return;var r=f.getBoundingClientRect();if(r.bottom<-50||r.top>vh+50)return;
      var k=(r.top+r.height/2-vh/2)/(vh+r.height);im.style.transform='translate3d(0,'+(k*-11).toFixed(2)+'%,0) scale(1.14)'})}
    addEventListener('scroll',function(){if(!busy){busy=true;requestAnimationFrame(upd)}},{passive:true});addEventListener('resize',upd);upd()}
  window.__nndPageInit=function(){initBA();initLB();initSliders();initBanners();initPX();if(window.__nndFx)window.__nndFx.refresh()};
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
.gallery img,.bleed img,.chapter-media img,.bgrid img{cursor:zoom-in}
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

/* banner modules: slider (5 transitions) + banner frames grid */
.r-lg{--br:48px}.r-md{--br:24px}.r-sm{--br:12px}.r-0{--br:0px}
.section.bslider,.section.bgrid-wrap{background:none;border-radius:0;overflow:visible}
.bslider{position:relative;outline:0}
.bs-view{position:relative;overflow:hidden;width:min(100%,calc(86vh*var(--arn,1.7778)));margin:0 auto;aspect-ratio:var(--ar,16/9);border-radius:var(--br);background:#111;touch-action:pan-y;user-select:none;-webkit-user-select:none;cursor:grab}
.bslider.dragging .bs-view{cursor:grabbing}
.bs-track{position:relative;height:100%}
.bs-slide{overflow:hidden;background:#151515}
.bs-slide img,.bs-slide video{width:100%;height:100%;object-fit:cover;pointer-events:none;-webkit-user-drag:none}
.bsx-slide .bs-track,.bsx-peek .bs-track{display:flex;transition:transform .95s cubic-bezier(.65,0,.15,1);will-change:transform}
.bsx-slide .bs-slide{flex:0 0 100%;height:100%}
.bsx-slide .bs-slide img{transform:scale(1.06);transition:transform 1.6s cubic-bezier(.2,.7,.2,1)}
.bsx-slide .bs-slide.on img{transform:none}
.bsx-fade .bs-slide,.bsx-wipe .bs-slide{position:absolute;inset:0}
.bsx-fade .bs-slide{opacity:0;transition:opacity 1.1s ease}
.bsx-fade .bs-slide img{transform:scale(1.1);transition:transform 7s cubic-bezier(.2,.6,.2,1)}
.bsx-fade .bs-slide.on{opacity:1;z-index:2}.bsx-fade .bs-slide.was{z-index:1}
.bsx-fade .bs-slide.on img{transform:none}
.bsx-wipe .bs-slide{clip-path:inset(0 0 0 100%);z-index:0}
.bsx-wipe.back .bs-slide:not(.on):not(.was){clip-path:inset(0 100% 0 0)}
.bsx-wipe .bs-slide.was{clip-path:inset(0);z-index:1}
.bsx-wipe .bs-slide.was img{transform:scale(.94) translateX(-3%);transition:transform 1.2s cubic-bezier(.77,0,.18,1)}
.bsx-wipe.back .bs-slide.was img{transform:scale(.94) translateX(3%)}
.bsx-wipe .bs-slide.on{clip-path:inset(0);z-index:2;transition:clip-path 1.15s cubic-bezier(.77,0,.18,1)}
.bsx-wipe .bs-slide.on img{animation:bsWz 1.8s cubic-bezier(.2,.7,.2,1)}
@keyframes bsWz{from{transform:scale(1.2)}}
.bsx-peek .bs-view{width:100%;aspect-ratio:auto;background:none;border-radius:0}
.bsx-peek .bs-track{gap:16px;align-items:center}
.bsx-peek .bs-slide{flex:0 0 auto;width:min(62%,calc(74vh*var(--arn,1.7778)));aspect-ratio:var(--ar,16/9);border-radius:var(--br);transform:scale(.88);opacity:.35;filter:saturate(.6);transition:transform .95s cubic-bezier(.65,0,.15,1),opacity .95s,filter .95s}
.bsx-peek .bs-slide.on{transform:none;opacity:1;filter:none}
.bs-ui{display:flex;align-items:center;justify-content:center;gap:16px;margin-top:20px}
.bs-btn{width:50px;height:50px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.04);color:var(--white);font-size:18px;cursor:pointer;transition:background .3s,border-color .3s,transform .3s}
.bs-btn:hover{background:var(--accent);border-color:var(--accent);transform:scale(1.07)}
.bs-dots{display:flex;align-items:center;gap:6px}
.bs-dots button{position:relative;width:26px;height:4px;padding:0;border:0;border-radius:4px;background:rgba(255,255,255,.18);overflow:hidden;cursor:pointer;transition:width .5s cubic-bezier(.65,0,.15,1)}
.bs-dots button.on{width:64px}
.bs-dots button i{position:absolute;inset:0;background:var(--white);transform-origin:left;transform:scaleX(var(--p,0))}
.bs-count{font:500 12px "Geist Mono",monospace;letter-spacing:.06em;color:var(--muted);min-width:64px;text-align:center}.bs-count b{color:var(--white);font-weight:500}
.bs-cap,.bg-cap{margin:16px 0 0;text-align:center;color:var(--muted);font-size:14px}
.bsx-marquee{overflow:hidden!important;margin:0 -8px}
.bs-mq{display:flex;gap:8px;width:max-content;animation:bsMq calc(var(--n)*7s) linear infinite}
.bsx-marquee:hover .bs-mq{animation-play-state:paused}
.bsx-marquee .bs-slide{flex:none;height:clamp(240px,32vw,560px);aspect-ratio:var(--ar,16/9);border-radius:var(--br)}
.bsx-marquee.ar-auto .bs-slide{aspect-ratio:auto}.bsx-marquee.ar-auto .bs-slide img{width:auto}
@keyframes bsMq{to{transform:translateX(calc(-50% - 4px))}}
.bgrid{display:grid;gap:8px;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}
.bgrid.c-1{grid-template-columns:1fr}.bgrid.c-3{grid-template-columns:repeat(3,minmax(0,1fr))}.bgrid.c-4{grid-template-columns:repeat(4,minmax(0,1fr))}
.bg-item{position:relative;overflow:hidden;border-radius:var(--br);background:#151515;aspect-ratio:var(--ar,auto)}
.bg-in{width:100%;height:100%;overflow:hidden;border-radius:inherit}
.bg-item img,.bg-item video{width:100%;height:100%;object-fit:cover}
.bgrid.ar-auto .bg-item img,.bgrid.ar-auto .bg-item video{height:auto}
.bgrid[data-bfx=rise] .bg-item.bw{opacity:0;transform:translateY(80px) scale(.97)}
.bgrid[data-bfx=rise] .bg-item.bw.bi{opacity:1;transform:none;transition:opacity .9s ease var(--d),transform 1.2s cubic-bezier(.2,.7,.2,1) var(--d)}
.bgrid[data-bfx=wipe] .bg-item.bw{background:none}
.bgrid[data-bfx=wipe] .bg-item.bw .bg-in{clip-path:inset(100% 0 0 0)}
.bgrid[data-bfx=wipe] .bg-item.bw img{transform:scale(1.3) translateY(-6%)}
.bgrid[data-bfx=wipe] .bg-item.bw.bi .bg-in{clip-path:inset(0);transition:clip-path 1.25s cubic-bezier(.77,0,.18,1) var(--d)}
.bgrid[data-bfx=wipe] .bg-item.bw.bi img{transform:none;transition:transform 1.8s cubic-bezier(.2,.7,.2,1) var(--d)}
.bgrid[data-bfx=zoom] .bg-item.bw{opacity:0;transform:scale(.88)}
.bgrid[data-bfx=zoom] .bg-item.bw img{transform:scale(1.35)}
.bgrid[data-bfx=zoom] .bg-item.bw.bi{opacity:1;transform:none;transition:opacity .8s ease var(--d),transform 1.3s cubic-bezier(.2,.7,.2,1) var(--d)}
.bgrid[data-bfx=zoom] .bg-item.bw.bi img{transform:none;transition:transform 2s cubic-bezier(.2,.7,.2,1) var(--d)}
.bgrid[data-bfx=tilt]{perspective:1200px}
.bgrid[data-bfx=tilt] .bg-item{transform:rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .6s cubic-bezier(.2,.7,.2,1),box-shadow .6s;will-change:transform}
.bgrid[data-bfx=tilt] .bg-item.tl{transition:transform .12s linear,box-shadow .4s;box-shadow:0 30px 70px rgba(0,0,0,.55);z-index:2}
.bgrid[data-bfx=tilt] .bg-item:after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at var(--gx,50%) var(--gy,50%),rgba(255,255,255,.24),transparent 55%);opacity:0;transition:opacity .4s}
.bgrid[data-bfx=tilt] .bg-item.tl:after{opacity:1}
.bslider-ve{padding:28px;border-radius:var(--br)!important}
.bsv-tag{margin-bottom:14px;font:500 11px "Geist Mono",monospace;color:var(--accent-soft);letter-spacing:.04em}
.bsv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px}
.bsv-grid .bs-slide{aspect-ratio:var(--ar,16/9);border-radius:var(--br)}
.bslider-ve.ar-auto .bsv-grid .bs-slide{aspect-ratio:auto}.bslider-ve.ar-auto .bsv-grid img{height:auto}
@media (prefers-reduced-motion:reduce){.bs-track,.bs-slide,.bs-slide img{transition:none!important;animation:none!important}.bs-mq{animation:none}.bsx-marquee{overflow-x:auto!important}}

@media(max-width:850px){
  .bgrid.c-2{grid-template-columns:1fr}.bgrid.c-3,.bgrid.c-4{grid-template-columns:1fr 1fr}
  .bsx-peek .bs-slide{width:72%}.bs-btn{width:42px;height:42px}.bs-ui{gap:10px}.bs-dots button.on{width:40px}
  .bs-view{width:min(100%,calc(78vh*var(--arn,1.7778)))}.r-lg{--br:32px}
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

/* "Bố cục khung": template grids (frames module) */
.r-xl{--br:32px}
.frames-wrap{display:flex;flex-direction:column;gap:24px}
.fgrid{display:grid;gap:24px;aspect-ratio:var(--far)}
.fgrid .bg-item{aspect-ratio:auto;height:100%;min-height:0}
.frest .bg-item{aspect-ratio:4/5}.frest.c-1 .bg-item{aspect-ratio:16/10}.frest.tall .bg-item{aspect-ratio:9/16}
.fit-contain .bg-item{background:#111}.fit-contain .bg-item img,.fit-contain .bg-item video{object-fit:contain}
.bg-item.ve-cell{background:repeating-linear-gradient(45deg,#141414 0 12px,#191919 12px 24px);outline:1px dashed rgba(255,255,255,.18);outline-offset:-1px;min-height:0!important}
@media(max-width:850px){
  .frames-wrap{gap:12px}
  .fgrid{aspect-ratio:auto;gap:12px;grid-template-columns:1fr 1fr!important;grid-template-rows:none!important;grid-template-areas:none!important}
  .fgrid .bg-item{grid-area:auto!important;height:auto;aspect-ratio:4/5}
  .fgrid:not(.tall) .bg-item:first-child{grid-column:span 2;aspect-ratio:4/3}
  .fgrid.tall .bg-item{aspect-ratio:9/16}
  .frest.c-3,.frest.c-4,.frest.c-5{grid-template-columns:1fr 1fr}
}
/* ===== Project pages, Vexoo-style (2026-11-16): black page, one calm frame size, quiet type =====
   Title + category, one rounded cover frame, description left / details right, frames 24px apart,
   images drift slightly inside their frames (parallax), big Prev / Next at the end. */
body{background:#000}
.project-page{padding:0 32px;gap:24px;background:#000;max-width:1920px;margin:0 auto;width:100%}
.project-nav{top:0;left:0;right:0;padding:22px max(32px,calc((100vw - 1856px)/2));background:linear-gradient(#000 35%,rgba(0,0,0,0))}
.project-nav a{padding:0;border:0;background:none;backdrop-filter:none;-webkit-backdrop-filter:none;font:500 13px Inter,sans-serif;letter-spacing:.01em;opacity:.85}
.project-nav a:hover{background:none;color:var(--white);opacity:1}
.p-head{padding:116px 0 4px}
.p-title{margin:0;font:500 clamp(36px,3.4vw,52px)/1.05 Inter,sans-serif;letter-spacing:-.035em;text-transform:none}
.p-sub{margin-top:8px;display:flex;flex-wrap:wrap;gap:10px;font:500 clamp(16px,1.3vw,20px) Inter,sans-serif;color:var(--muted)}
.p-sub span{border:0;padding:0;font:inherit;text-transform:none;border-radius:0}
.p-sub span+span:before{content:"·";margin-right:10px}
.p-lead{max-width:560px;margin:20px 0 0;color:#cfcfcb;font-size:16px;line-height:1.6}
.hero.hero-media{position:relative;inset:auto;display:block;min-height:0;width:100%;aspect-ratio:16/10;max-height:calc(100vh - 150px);border-radius:32px;overflow:hidden;background:#111}
.hero.hero-media.short{aspect-ratio:21/9}
.hero-media:after{display:none}
.section{border-radius:0;background:none;overflow:visible}
.eyebrow{font:500 15px Inter,sans-serif;color:var(--white);text-transform:none;letter-spacing:0}
.overview{min-height:0;display:grid;grid-template-columns:1fr 1fr;gap:40px;padding:48px 48px 56px;align-items:start}
.ov-desc{max-width:470px;font:500 16px/1.65 Inter,sans-serif;color:var(--white)}
.ov-desc p{margin:0 0 14px}.ov-desc p:last-child{margin:0}
.details{display:flex;flex-direction:column;gap:8px;margin:0}
.detail{padding:0;border:0;display:flex;flex-wrap:wrap;gap:6px;font:500 16px Inter,sans-serif}
.detail b{display:inline;margin:0;font:inherit;color:var(--muted);text-transform:none}
.detail span{font-size:16px}
.gallery,.g-row,.bgrid{gap:24px}
.g-item,.g-row.tall .g-item,.g-row.cols-3 .g-item,.gallery .g-row .g-item,.gallery.dense .g-row .g-item,.gallery.medium .g-row .g-item,.gallery.grand .g-row .g-item{min-height:0;max-height:none;border-radius:32px;aspect-ratio:4/5;background:#111}
.gallery .g-row.cols-1 .g-item{aspect-ratio:16/10}
.gallery .g-row.cols-3 .g-item{aspect-ratio:3/4}
.bleed{height:auto;max-height:none;aspect-ratio:16/10;border-radius:32px}
.chapter-split{gap:24px;align-items:center}
.chapter-copy{min-height:0;padding:48px;gap:16px}
.chapter-text{max-width:506px;font:500 16px/1.65 Inter,sans-serif;letter-spacing:0}
.chapter-text p{margin:0 0 14px}
.chapter-media{min-height:0;aspect-ratio:4/5;border-radius:32px;background:#111}
.chapter.solo{padding:36px 48px}
.chapter.solo .chapter-copy{display:grid;grid-template-columns:1fr 1fr;gap:40px;max-width:none;padding:0}
.chapter.solo .chapter-text{font-size:16px;line-height:1.65}
.statement{min-height:0;display:block;padding:88px 0 32px;text-align:left}
.statement p{max-width:1100px;font:500 clamp(36px,5.2vw,80px)/1.08 Inter,sans-serif;letter-spacing:-.04em;text-transform:none}
.process{padding:36px 48px;gap:22px}
.process-grid{gap:40px}
.step{background:none;border:0;border-top:1px solid rgba(255,255,255,.14);border-radius:0;padding:22px 0 0;gap:10px}
.step h3{font:500 22px/1.2 Inter,sans-serif;letter-spacing:-.01em;text-transform:none}
.step p{font-size:15px;line-height:1.6}
.results{padding:36px 48px}
.results-grid{gap:40px}
.result{background:none;border:0;border-top:1px solid rgba(255,255,255,.14);border-radius:0;padding:22px 0 0}
.result strong{font:500 clamp(40px,4.4vw,72px)/1 Inter,sans-serif;letter-spacing:-.045em;color:var(--white)}
.credits{padding:36px 48px}
.credits b{font:500 14px Inter,sans-serif;text-transform:none}
.credits span{font:500 16px Inter,sans-serif;text-transform:none;letter-spacing:0}
.vid-frame,.ba,.ba-pane{border-radius:32px}
.vid-cap,.ba-cap,.bs-cap,.bg-cap{font-size:14px}
.pn{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:120px 48px 48px}
.pn a{display:flex;flex-direction:column;gap:8px}
.pn-next{text-align:right;align-items:flex-end}
.pn small{font:500 14px Inter,sans-serif;color:var(--muted)}
.pn b{font:500 clamp(48px,5.6vw,80px)/1 Inter,sans-serif;letter-spacing:-.045em;transition:color .3s,transform .5s cubic-bezier(.2,.7,.2,1)}
.pn span{font:500 16px Inter,sans-serif;color:#cfcfcb}
.pn a:hover b{color:var(--accent-soft)}
.pn-prev:hover b{transform:translateX(-10px)}.pn-next:hover b{transform:translateX(10px)}
.footer{margin:0 max(32px,calc((100vw - 1856px)/2));padding:32px 0 40px;border-top:1px solid rgba(255,255,255,.1)}
/* all-work page, Vexoo /portfolio style */
.work-head{padding:116px 0 28px}
.work-head h1{margin:0;max-width:980px;font:500 clamp(34px,3.6vw,56px)/1.08 Inter,sans-serif;letter-spacing:-.035em;text-transform:none}
.work-head p{max-width:620px;margin:14px 0 26px;color:var(--muted);font-size:16px;line-height:1.55}
.work-filter button{padding:9px 14px;font:500 13px Inter,sans-serif;text-transform:none}
.work-grid{gap:24px}
.work-card{display:block;min-height:0;padding:14px;border-radius:28px;background:#111;overflow:hidden;transition:background .3s}
.work-card:hover{background:#181818}
.wc-media{position:relative;aspect-ratio:16/11;border-radius:18px;overflow:hidden;background:#1b1b1b}
.wc-media img{transition:transform .9s cubic-bezier(.2,.7,.2,1)}
.work-card:hover .wc-media img{transform:scale(1.04)}
.wc-row{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:16px 8px 4px}
.wc-row b{font:500 18px/1.25 Inter,sans-serif;letter-spacing:-.01em}
.wc-row span{flex:none;color:var(--muted);font:500 15px Inter,sans-serif}
@media(max-width:850px){.work-head{padding:88px 4px 20px}.work-grid{grid-template-columns:1fr;gap:12px}.work-card{min-height:0;padding:10px;border-radius:22px}.wc-media{border-radius:14px}}
img.px{transform:scale(1.14);will-change:transform}
@media(max-width:850px){
  .project-page{padding:0 12px;gap:12px}
  .project-nav{padding:16px 14px}
  .p-head{padding:88px 4px 4px}
  .hero.hero-media{aspect-ratio:4/5;max-height:none;border-radius:20px}.hero.hero-media.short{aspect-ratio:4/3}
  .overview,.chapter.solo .chapter-copy,.pn{grid-template-columns:1fr}
  .overview{padding:32px 4px;gap:24px}
  .chapter.solo,.process,.results,.credits{padding:24px 4px}.chapter-copy{padding:28px 4px}
  .gallery,.g-row,.bgrid{gap:12px}
  .g-item,.g-row.tall .g-item,.g-row.cols-3 .g-item,.gallery .g-row .g-item,.gallery.dense .g-row .g-item{border-radius:20px}
  .gallery .g-row.cols-1 .g-item{aspect-ratio:4/3}.gallery .g-row.cols-3 .g-item{aspect-ratio:4/5}
  .bleed{aspect-ratio:4/5}.bleed,.chapter-media,.vid-frame,.ba,.ba-pane{border-radius:20px}
  .statement{padding:56px 4px 16px}
  .pn{padding:72px 4px 24px;gap:32px}.pn-next{text-align:left;align-items:flex-start}
  .footer{margin:0 12px}
}
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

const api = { renderWorkPage, renderProjectPage, renderBlock, BLOCKS, FRAMES, FRAME_OPTS, RATIOS, SLIDER_FX, BANNER_FX, RADII, PRESETS, GALLERY_STYLES, presetBlocks, material, blocksOf, typeDecl, typeFontsHref, TYPE_FONTS };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.ProjectTemplate = api;
})();
