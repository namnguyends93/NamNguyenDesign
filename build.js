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

// ---------- pages ----------
async function prerender(file) {
  const relPath = path.relative(ROOT, file).split(path.sep).join('/');
  const depth = relPath.split('/').length - 1;
  const base = '../'.repeat(depth);
  const html = await fsp.readFile(file, 'utf8');

  const dom = new JSDOM(html, { url: 'http://localhost/' + relPath, runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  window.__CMS_BASE__ = base;
  window.__CMS_CONTENT__ = JSON.parse(JSON.stringify(content));
  window.console.warn = (...a) => console.warn('  runtime:', ...a);
  window.eval(runtime);
  await window.__CMS_DONE__;
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

  const pages = ['index.html', ...fs.readdirSync(path.join(ROOT, 'projects')).filter(f => f.endsWith('.html')).map(f => 'projects/' + f)];
  let htmlIn = 0, htmlOut = 0;
  for (const p of pages) {
    const src = path.join(ROOT, p);
    const out = await prerender(src);
    await fsp.writeFile(path.join(DIST, p), out);
    htmlIn += fs.statSync(src).size; htmlOut += Buffer.byteLength(out);
    console.log('  page', p);
  }
  for (const s of STATIC) if (fs.existsSync(path.join(ROOT, s))) await copyStatic(path.join(ROOT, s), path.join(DIST, s));
  if (!fs.existsSync(path.join(DIST, '.nojekyll'))) await fsp.writeFile(path.join(DIST, '.nojekyll'), '');

  console.log(`\nBuilt ${pages.length} pages in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${DIST}`);
  console.log(`HTML   : ${kb(htmlIn)} -> ${kb(htmlOut)}`);
  console.log(`Images : ${stats.count} files, ${kb(stats.inBytes)} -> ${kb(stats.outBytes)} (largest variant)`);
})().catch(e => { console.error(e); process.exit(1); });
