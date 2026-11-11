/**
 * Nam Nguyen Design — optimized static build
 * Run: npm run build   (or: node build.js)   -> outputs ./dist
 *
 * 1. Prerender: applies content.json to every page at build time (jsdom), so the
 *    published HTML already contains the final content — no flash, no extra fetch.
 * 2. Images: every <img> (uploads/ and remote Framer images) is downloaded once,
 *    resized and converted to WebP in two sizes, with srcset, width/height and lazy loading.
 * 3. HTML/CSS/JS inline code is minified.
 *
 * admin.html, server.js, backups/, content.json and the CMS runtime are NOT published.
 */
'use strict';
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const { JSDOM } = require('jsdom');
const sharp = require('sharp');
const { minify } = require('html-minifier-terser');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const CACHE = path.join(ROOT, '.cache', 'img');
const IMG_OUT = 'img';
const WIDTHS = [800, 1600];          // srcset sizes
const QUALITY = 78;                  // WebP quality
const EAGER_IMAGES = 2;              // first N images load eagerly (above the fold)

// Static folders/files copied as-is when they exist
const STATIC = ['assets', 'css', 'js', '.nojekyll', 'CNAME', 'favicon.ico'];

const { renderProjectPage, renderWorkPage } = require('./project-template');
const runtime = fs.readFileSync(path.join(ROOT, 'cms-runtime.js'), 'utf8');
const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'content.json'), 'utf8'));
const hash = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
const kb = n => (n / 1024).toFixed(0) + ' KB';

// ---------- images ----------
const imageJobs = new Map(); // source key -> Promise<{srcset, src, width, height}>
const stats = { inBytes: 0, outBytes: 0, count: 0 };

async function loadSource(src, pageFile) {
  if (/^https?:\/\//i.test(src)) {
    await fsp.mkdir(CACHE, { recursive: true });
    const cached = path.join(CACHE, hash(src));
    if (!fs.existsSync(cached)) {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${src}`);
      await fsp.writeFile(cached, Buffer.from(await res.arrayBuffer()));
    }
    return { buf: await fsp.readFile(cached), name: path.basename(new URL(src).pathname).replace(/\.\w+$/, '') };
  }
  const clean = decodeURIComponent(src.split(/[?#]/)[0]);
  const file = clean.startsWith('/') ? path.join(ROOT, clean) : path.resolve(path.dirname(pageFile), clean);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) return null;
  return { buf: await fsp.readFile(file), name: path.basename(file).replace(/\.\w+$/, '') };
}

// Framer CDN serves any size via ?width= — fetch one canonical large version per image
function canonicalRemote(src) {
  const u = new URL(src);
  if (/framerusercontent\.com$/i.test(u.hostname)) return `${u.origin}${u.pathname}?width=${Math.max(...WIDTHS)}`;
  return src;
}

function optimizeImage(src, pageFile) {
  if (/^https?:/i.test(src)) src = canonicalRemote(src);
  const key = /^https?:/i.test(src) ? src : path.resolve(path.dirname(pageFile), decodeURIComponent(src.split(/[?#]/)[0]));
  if (imageJobs.has(key)) return imageJobs.get(key);
  const job = (async () => {
    const source = await loadSource(src, pageFile);
    if (!source) return null;
    const meta = await sharp(source.buf).metadata();
    if (meta.format === 'svg' || meta.format === 'gif') return null; // keep vector/animated as-is
    const base = source.name.replace(/[^\w-]+/g, '-').slice(0, 40) + '-' + hash(key);
    const widths = [...new Set(WIDTHS.map(w => Math.min(w, meta.width)))];
    const outs = [];
    for (const w of widths) {
      const rel = `${IMG_OUT}/${base}-${w}.webp`;
      const out = await sharp(source.buf).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: QUALITY }).toBuffer();
      await fsp.writeFile(path.join(DIST, rel), out);
      outs.push({ rel, w, size: out.length });
    }
    stats.inBytes += source.buf.length; stats.outBytes += outs.at(-1).size; stats.count++;
    const largest = outs.at(-1);
    const height = Math.round(meta.height * (largest.w / meta.width));
    return { outs, width: largest.w, height };
  })().catch(e => { console.warn('  ! image skipped:', src, '-', e.message); return null; });
  imageJobs.set(key, job);
  return job;
}

// ---------- share previews, favicon, SEO ----------
// Absolute site address: used by link previews (Facebook, Zalo, Messenger), canonical and sitemap.
const SITE_URL = (content.site?.siteUrl || 'https://namnguyends93.github.io/NamNguyenDesign/').replace(/\/?$/, '/');
const pageUrl = rel => SITE_URL + (rel === 'index.html' ? '' : rel);

// 1200x630 JPEG for link previews (JPEG is the safest format for every chat app)
const ogJobs = new Map();
function ogImage(src, pageFile, name) {
  if (!src) return null;
  if (!ogJobs.has(name)) ogJobs.set(name, (async () => {
    const source = await loadSource(/^https?:/i.test(src) ? canonicalRemote(src) : src, pageFile);
    if (!source) return null;
    const rel = `${IMG_OUT}/og-${name}.jpg`;
    // Portrait photos: keep the band around 30% from the top, where faces usually are
    const upright = await sharp(source.buf).rotate().toBuffer();
    const { width: W, height: H } = await sharp(upright).metadata();
    let img = sharp(upright);
    const bandH = Math.round(W * 630 / 1200);
    if (bandH < H) img = img.extract({ left: 0, width: W, height: bandH, top: Math.round(Math.max(0, Math.min(H - bandH, H * 0.3 - bandH / 2))) });
    await img.resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(DIST, rel));
    return rel;
  })().catch(e => { console.warn('  ! og image skipped:', src, '-', e.message); return null; }));
  return ogJobs.get(name);
}

// Favicon: the uploaded site.favicon if set, otherwise an "N" monogram in the accent colour
async function buildFavicons() {
  const accent = /^#[0-9a-f]{3,8}$/i.test(content.site?.accent || '') ? content.site.accent : '#4c6fff';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${accent}"/><path fill="#fff" d="M18 46V18h6.5L40 37.5V18h6v28h-6.5L24 26.5V46z"/></svg>`;
  let buf = Buffer.from(svg);
  const custom = content.site?.favicon && await loadSource(content.site.favicon, path.join(ROOT, 'index.html')).catch(() => null);
  if (custom) buf = custom.buf;
  else await fsp.writeFile(path.join(DIST, 'favicon.svg'), svg);
  await sharp(buf, { density: 300 }).resize(32, 32).png().toFile(path.join(DIST, 'favicon-32.png'));
  await sharp(buf, { density: 300 }).resize(180, 180).flatten({ background: accent }).png().toFile(path.join(DIST, 'apple-touch-icon.png'));
  return { svg: !custom };
}
let favicons;

// ---------- private pages: the page body is encrypted with the project's password ----------
// PBKDF2-SHA256 (150k) → AES-GCM 256. The browser decrypts it with WebCrypto after the visitor types the password.
async function encryptText(text, password) {
  const subtle = crypto.webcrypto.subtle, enc = new TextEncoder();
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12), n = 150000;
  const km = await subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await subtle.deriveKey({ name: 'PBKDF2', salt, iterations: n, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
  return { s: salt.toString('base64'), i: iv.toString('base64'), n, c: Buffer.from(ct).toString('base64') };
}
const GATE_JS = `(function(){
  var box=document.getElementById('nnd-lock');if(!box)return;var data=JSON.parse(box.textContent),form=document.querySelector('.gate form'),err=document.querySelector('.gate-err');
  var b64=function(s){return Uint8Array.from(atob(s),function(c){return c.charCodeAt(0)})};
  async function unlock(pw,quiet){
    try{var enc=new TextEncoder(),km=await crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveKey']);
      var key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(data.s),iterations:data.n,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']);
      var out=JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(data.i)},key,b64(data.c))));
      try{sessionStorage.setItem('nnd-pw:'+location.pathname,pw)}catch(e){}
      document.querySelector('main').innerHTML=out.html;
      var d=document.getElementById('i18n-vi');if(d&&out.dict){var cur={};try{cur=JSON.parse(d.textContent)}catch(e){}for(var k in out.dict)cur[k]=out.dict[k];d.textContent=JSON.stringify(cur)}
      if(window.__nndPageInit)window.__nndPageInit();if(window.__nndI18nApply)window.__nndI18nApply();
      window.scrollTo(0,0);return true}
    catch(e){if(!quiet){err.hidden=false;form.querySelector('input').select()}return false}}
  form.addEventListener('submit',function(e){e.preventDefault();err.hidden=true;unlock(form.querySelector('input').value)});
  try{var saved=sessionStorage.getItem('nnd-pw:'+location.pathname);if(saved)unlock(saved,true)}catch(e){}
})();`;
async function lockPage(doc, project) {
  const main = doc.querySelector('main[data-private]');
  if (!main || !project || !String(project.password || '').trim()) return;
  const dictEl = doc.getElementById('i18n-vi');
  let dict = {};
  try { dict = dictEl ? JSON.parse(dictEl.textContent) : {}; } catch (e) {}
  const payload = await encryptText(JSON.stringify({ html: main.innerHTML, dict }), String(project.password).trim());
  main.removeAttribute('data-private');
  main.innerHTML = `
  <section class="section gate">
    <div class="eyebrow">🔒 Private project</div>
    <h1 class="display">${String(project.title || '').replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]))}</h1>
    <p>This project is protected. Enter the password to view it.</p>
    <form><input type="password" autocomplete="current-password" placeholder="Password" aria-label="Password" required><button type="submit">Unlock</button></form>
    <p class="gate-err" hidden>Wrong password.</p>
  </section>`;
  const data = doc.createElement('script'); data.type = 'application/json'; data.id = 'nnd-lock'; data.textContent = JSON.stringify(payload);
  const js = doc.createElement('script'); js.textContent = GATE_JS;
  const css = doc.createElement('style');
  css.textContent = '.gate{min-height:100vh;display:flex;flex-direction:column;justify-content:center;padding:140px 7vw}.gate h1{margin:18px 0;font-size:clamp(48px,8vw,130px)}.gate p{color:#cfcfcf;font-size:17px;max-width:520px}.gate form{display:flex;gap:8px;margin-top:22px;max-width:520px}.gate input{flex:1;padding:16px 20px;border-radius:999px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.06);color:#fff;font:15px Inter,sans-serif;outline:none}.gate input:focus{border-color:#fff}.gate button{padding:16px 24px;border-radius:999px;border:0;background:var(--accent);color:#fff;font:12px "Geist Mono",monospace;text-transform:uppercase;cursor:pointer}.gate-err{color:#ff9da2!important}';
  doc.head.appendChild(css);
  main.after(data, js);
}

// ---------- each page only carries the Vietnamese entries for its own text ----------
const RUNTIME_STRINGS = ['Back to top'];   // labels added by scripts after load
function trimDictionary(doc) {
  const el = doc.getElementById('i18n-vi');
  if (!el) return;
  let d; try { d = JSON.parse(el.textContent); } catch (e) { return; }
  const parts = [];
  const w = doc.createTreeWalker(doc.body, 4); let n;
  while ((n = w.nextNode())) if (!n.parentElement.closest('script,style,noscript')) parts.push(n.nodeValue);
  for (const e of doc.querySelectorAll('[alt],[aria-label],[placeholder],[title]')) for (const a of ['alt', 'aria-label', 'placeholder', 'title']) if (e.getAttribute(a)) parts.push(e.getAttribute(a));
  parts.push(doc.title, doc.querySelector('meta[name="description"]')?.getAttribute('content') || '', ...RUNTIME_STRINGS);
  const hay = parts.join(' \n ').replace(/\s+/g, ' ').toLowerCase();
  const keep = {};
  for (const [k, v] of Object.entries(d)) { const kk = k.replace(/\s+/g, ' ').trim().toLowerCase(); if (kk && hay.includes(kk)) keep[k] = v; }
  el.textContent = JSON.stringify(keep).replace(/</g, '\\u003c');
}

// ---------- search engines: who the site is about, and what each project is ----------
function jsonLd(doc, project, url, imgRel) {
  const s = content.site || {};
  const person = { '@type': 'Person', name: s.personName || 'Nam Nguyen', jobTitle: s.role || 'Design Leader', url: SITE_URL };
  if (s.email) person.email = 'mailto:' + s.email;
  const same = (content.footer?.links || []).map(l => l.href).filter(h => /^https?:\/\//.test(h || ''));
  if (same.length) person.sameAs = same;
  if (s.organization) person.worksFor = { '@type': 'Organization', name: s.organization };
  let data;
  if (!project) data = [{ '@context': 'https://schema.org', '@type': 'WebSite', name: s.name || 'Nam Nguyen Design', url: SITE_URL }, { '@context': 'https://schema.org', ...person, description: s.seoDescription || '', image: imgRel ? SITE_URL + imgRel : undefined }];
  else if (String(project.password || '').trim()) return;
  else data = { '@context': 'https://schema.org', '@type': 'CreativeWork', name: project.title, url, description: String(project.description || '').split(/\n+/)[0], genre: project.category || undefined, dateCreated: project.year || undefined, image: imgRel ? SITE_URL + imgRel : undefined, creator: person };
  const el = doc.createElement('script'); el.type = 'application/ld+json'; el.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
  doc.head.appendChild(el);
}

// ---------- analytics (Cloudflare Web Analytics, no cookies) ----------
const ANALYTICS = /^[a-f0-9]{32}$/i.test(String(content.site?.analyticsToken || '').trim())
  ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${String(content.site.analyticsToken).trim()}"}'></script>` : '';

async function addHeadMeta(doc, relPath, base, file) {
  const head = doc.head;
  const add = (tag, attrs) => { const el = doc.createElement(tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); head.appendChild(el); };
  const slug = relPath.startsWith('projects/') ? path.basename(relPath, '.html') : null;
  const project = slug && (content.projects || []).find(p => (p.slug || p.id) === slug);
  const title = doc.title || content.site?.seoTitle || '';
  const desc = doc.querySelector('meta[name="description"]')?.getAttribute('content') || content.site?.seoDescription || '';
  const imgRel = await ogImage(project ? project.cover : content.home?.hero?.image, file, slug || 'home');
  const url = pageUrl(relPath);

  if (favicons.svg) add('link', { rel: 'icon', type: 'image/svg+xml', href: base + 'favicon.svg' });
  add('link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: base + 'favicon-32.png' });
  add('link', { rel: 'apple-touch-icon', href: base + 'apple-touch-icon.png' });
  add('meta', { name: 'theme-color', content: '#000000' });
  add('link', { rel: 'canonical', href: url });
  add('meta', { property: 'og:type', content: project ? 'article' : 'website' });
  add('meta', { property: 'og:site_name', content: content.site?.name || 'Nam Nguyen Design' });
  add('meta', { property: 'og:title', content: title });
  add('meta', { property: 'og:description', content: desc });
  add('meta', { property: 'og:url', content: url });
  if (imgRel) {
    add('meta', { property: 'og:image', content: SITE_URL + imgRel });
    add('meta', { property: 'og:image:width', content: '1200' });
    add('meta', { property: 'og:image:height', content: '630' });
    add('meta', { property: 'og:image:alt', content: project ? project.title : title });
  }
  add('meta', { name: 'twitter:card', content: 'summary_large_image' });
  // English is the page as written; Vietnamese is the same page switched with ?lang=vi
  add('link', { rel: 'alternate', hreflang: 'en', href: url });
  add('link', { rel: 'alternate', hreflang: 'vi', href: url + '?lang=vi' });
  add('link', { rel: 'alternate', hreflang: 'x-default', href: url });
  jsonLd(doc, project, url, imgRel);
}

// 404: self-contained (works at any depth), finds the site root itself
function page404() {
  const s = content.site || {}, th = s.theme || {};
  const e = v => String(v ?? '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const root = new URL(SITE_URL).pathname;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>404 — ${e(s.name || 'Nam Nguyen Design')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Geist+Mono:wght@500&family=Space+Grotesk:wght@600&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box}html,body{margin:0;height:100%;background:${e(th.black || '#080808')};color:${e(th.white || '#f7f5ef')};font-family:Inter,Arial,sans-serif}
main{min-height:100%;display:flex;flex-direction:column;justify-content:center;padding:8vw}
.k{font:12px "Geist Mono",monospace;text-transform:uppercase;color:${e(th.accentSoft || '#8ea1ff')}}
h1{margin:14px 0 8px;font:600 clamp(110px,24vw,340px)/.85 "Space Grotesk",Inter,sans-serif;letter-spacing:-.07em}
p{font-size:18px;color:#cfcfcf;max-width:520px;line-height:1.45}
nav{display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}
a{display:inline-flex;padding:15px 22px;border-radius:999px;border:1px solid rgba(255,255,255,.25);color:inherit;text-decoration:none;font:12px "Geist Mono",monospace;text-transform:uppercase}
a.p{background:${e(s.accent || '#4c6fff')};border-color:transparent;color:#fff}a:hover{background:#fff;color:#000}</style></head>
<body><main><span class="k">${e(s.name || 'Nam Nguyen Design')} · Error 404</span><h1>404</h1>
<p>This page doesn't exist or has moved.<br>Trang này không tồn tại hoặc đã được chuyển đi.</p>
<nav><a class="p" data-to="" href="${e(root)}">← Home / Trang chủ</a><a data-to="projects/index.html" href="${e(root)}projects/index.html">All work / Tất cả dự án</a><a data-to="#contact" href="${e(root)}#contact">Contact / Liên hệ</a></nav></main>
<script>(function(){var r=${JSON.stringify(root)};if(location.pathname.indexOf(r)!==0)r='/';[].forEach.call(document.querySelectorAll('[data-to]'),function(a){a.href=r+a.getAttribute('data-to')})})()</script>
${ANALYTICS}</body></html>
`;
}

async function writeSeoFiles(pages) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = pages.map(rel => `  <url><loc>${pageUrl(rel)}</loc><lastmod>${today}</lastmod></url>`).join('\n');
  await fsp.writeFile(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  await fsp.writeFile(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n`);
}

// ---------- pages ----------
async function prerender(file, html, useRuntime = true) {
  const relPath = path.relative(ROOT, file).split(path.sep).join('/');
  const depth = relPath.split('/').length - 1;
  const base = '../'.repeat(depth);

  const dom = new JSDOM(html, { url: 'http://localhost/' + relPath, runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  window.__CMS_BASE__ = base;
  window.__CMS_CONTENT__ = JSON.parse(JSON.stringify(content));
  window.console.warn = (...a) => console.warn('  runtime:', ...a);
  if (useRuntime) { window.eval(runtime); await window.__CMS_DONE__; }
  const doc = window.document;

  // Images
  const imgs = [...doc.querySelectorAll('img[src]')];
  for (const [i, img] of imgs.entries()) {
    const r = await optimizeImage(img.getAttribute('src'), file);
    if (r) {
      img.setAttribute('src', base + r.outs.at(-1).rel);
      if (r.outs.length > 1) {
        img.setAttribute('srcset', r.outs.map(o => `${base}${o.rel} ${o.w}w`).join(', '));
        if (!img.hasAttribute('sizes')) img.setAttribute('sizes', '100vw');
      }
      img.setAttribute('width', r.width);
      img.setAttribute('height', r.height);
    }
    img.setAttribute('decoding', 'async');
    if (i < EAGER_IMAGES) { img.removeAttribute('loading'); if (i === 0) img.setAttribute('fetchpriority', 'high'); }
    else if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
  }

  // Video posters become WebP like other images
  for (const v of [...doc.querySelectorAll('video[poster]')]) {
    const r = await optimizeImage(v.getAttribute('poster'), file);
    if (r) v.setAttribute('poster', base + r.outs.at(-1).rel);
  }

  // Inline style background images, e.g. style="--project-bg:url('...')"
  for (const el of [...doc.querySelectorAll('[style]')].filter(e => e.getAttribute('style').includes('url('))) {
    let style = el.getAttribute('style');
    for (const m of [...style.matchAll(/url\((['"]?)([^'")]+)\1\)/g)]) {
      const r = await optimizeImage(m[2], file);
      if (r) style = style.replace(m[0], `url('${base}${r.outs.at(-1).rel}')`);
    }
    el.setAttribute('style', style);
  }

  await addHeadMeta(doc, relPath, base, file);

  // Start downloading the first big image with the HTML
  const lead = doc.querySelector('img[fetchpriority="high"]');
  if (lead) { const l = doc.createElement('link'); l.rel = 'preload'; l.as = 'image'; l.href = lead.getAttribute('src'); if (lead.getAttribute('srcset')) { l.setAttribute('imagesrcset', lead.getAttribute('srcset')); l.setAttribute('imagesizes', lead.getAttribute('sizes') || '100vw'); } l.setAttribute('fetchpriority', 'high'); doc.head.appendChild(l); }

  const pslug = relPath.startsWith('projects/') ? path.basename(relPath, '.html') : null;
  await lockPage(doc, pslug && (content.projects || []).find(p => (p.slug || p.id) === pslug));
  trimDictionary(doc);
  if (ANALYTICS) doc.body.insertAdjacentHTML('beforeend', ANALYTICS);

  const out = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
  window.close();
  return minify(out, {
    collapseWhitespace: true, conservativeCollapse: true, removeComments: true,
    minifyCSS: true, minifyJS: true, keepClosingSlash: true,
  });
}

async function copyStatic(src, dst) {
  const st = await fsp.stat(src);
  if (st.isDirectory()) {
    await fsp.mkdir(dst, { recursive: true });
    for (const n of await fsp.readdir(src)) await copyStatic(path.join(src, n), path.join(dst, n));
  } else await fsp.copyFile(src, dst);
}

(async () => {
  const t0 = Date.now();
  await fsp.rm(DIST, { recursive: true, force: true });
  await fsp.mkdir(path.join(DIST, IMG_OUT), { recursive: true });
  await fsp.mkdir(path.join(DIST, 'projects'), { recursive: true });

  favicons = await buildFavicons();
  const pages = [];
  let htmlIn = 0, htmlOut = 0, count = 0;
  const write = async (rel, html, useRuntime, listed = true) => {
    if (listed) pages.push(rel);
    const out = await prerender(path.join(ROOT, rel), html, useRuntime);
    await fsp.writeFile(path.join(DIST, rel), out);
    htmlIn += Buffer.byteLength(html); htmlOut += Buffer.byteLength(out); count++;
    console.log('  page', rel);
  };
  await write('index.html', await fsp.readFile(path.join(ROOT, 'index.html'), 'utf8'), true);
  // Project pages are generated from content.json with project-template.js (layout per project)
  for (const p of (content.projects || []).filter(x => x.published !== false)) {
    const slug = p.slug || p.id;
    if (!/^[\w-]+$/.test(slug)) { console.warn('  skip project with invalid slug:', slug); continue; }
    await write('projects/' + slug + '.html', renderProjectPage(content, slug), false, !String(p.password || '').trim());
  }
  // All work, with category filter
  await write('projects/index.html', renderWorkPage(content), false);
  // Files that are not images (CV PDF) are copied as they are
  for (const m of new Set(JSON.stringify(content).match(/\/uploads\/[^"?#]+\.(pdf|mp4|webm|mov)/gi) || [])) {
    const srcF = path.join(ROOT, decodeURIComponent(m));
    if (fs.existsSync(srcF)) {
      if (fs.statSync(srcF).size > 25 * 1024 * 1024) console.warn('  ! ' + m + ' is over 25 MB: Cloudflare will refuse it. Upload videos with R2 on, or make the file smaller.');
      await fsp.mkdir(path.dirname(path.join(DIST, m)), { recursive: true }); await fsp.copyFile(srcF, path.join(DIST, decodeURIComponent(m)));
    }
  }
  await fsp.writeFile(path.join(DIST, '404.html'), page404());
  for (const s of STATIC) if (fs.existsSync(path.join(ROOT, s))) await copyStatic(path.join(ROOT, s), path.join(DIST, s));
  if (!fs.existsSync(path.join(DIST, '.nojekyll'))) await fsp.writeFile(path.join(DIST, '.nojekyll'), '');
  await writeSeoFiles(pages);

  console.log(`\nBuilt ${count} pages in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${DIST}`);
  console.log(`HTML   : ${kb(htmlIn)} -> ${kb(htmlOut)}`);
  console.log(`Images : ${stats.count} files, ${kb(stats.inBytes)} -> ${kb(stats.outBytes)} (largest variant)`);
})().catch(e => { console.error(e); process.exit(1); });
