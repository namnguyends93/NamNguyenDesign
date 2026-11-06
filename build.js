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

const { renderProjectPage } = require('./project-template');
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
  const write = async (rel, html, useRuntime) => {
    pages.push(rel);
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
    await write('projects/' + slug + '.html', renderProjectPage(content, slug), false);
  }
  for (const s of STATIC) if (fs.existsSync(path.join(ROOT, s))) await copyStatic(path.join(ROOT, s), path.join(DIST, s));
  if (!fs.existsSync(path.join(DIST, '.nojekyll'))) await fsp.writeFile(path.join(DIST, '.nojekyll'), '');
  await writeSeoFiles(pages);

  console.log(`\nBuilt ${count} pages in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${DIST}`);
  console.log(`HTML   : ${kb(htmlIn)} -> ${kb(htmlOut)}`);
  console.log(`Images : ${stats.count} files, ${kb(stats.inBytes)} -> ${kb(stats.outBytes)} (largest variant)`);
})().catch(e => { console.error(e); process.exit(1); });
