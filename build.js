/**
 * Nam Nguyen Design — static build for GitHub Pages / Netlify / Cloudflare Pages
 * Run: node build.js        -> outputs ./dist
 *
 * dist/ contains only public files: pages, projects/, uploads/, content.json,
 * cms-runtime.js. admin.html, server.js and backups/ are NOT published.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

// Top-level files/folders to publish (missing ones are skipped)
const PUBLIC = ['index.html', 'projects', 'uploads', 'assets', 'css', 'js', 'content.json', 'cms-runtime.js', 'ava.jpg', '.nojekyll', 'CNAME', 'favicon.ico'];

function injectRuntime(html, depth) {
  if (html.includes('cms-runtime.js')) return html;
  const src = '../'.repeat(depth) + 'cms-runtime.js';
  return html.replace(/<\/body>/i, `<script src="${src}"></script></body>`);
}

function copy(src, dst, depth) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const name of fs.readdirSync(src)) copy(path.join(src, name), path.join(dst, name), depth + 1);
    return;
  }
  if (src.toLowerCase().endsWith('.html')) {
    fs.writeFileSync(dst, injectRuntime(fs.readFileSync(src, 'utf8'), depth));
  } else {
    fs.copyFileSync(src, dst);
  }
}

// Validate content.json before publishing
JSON.parse(fs.readFileSync(path.join(ROOT, 'content.json'), 'utf8'));

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST);
let count = 0;
for (const item of PUBLIC) {
  const src = path.join(ROOT, item);
  if (!fs.existsSync(src)) continue;
  copy(src, path.join(DIST, item), 0);
  count++;
}
if (!fs.existsSync(path.join(DIST, '.nojekyll'))) fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
console.log(`Built ${count} items into ${DIST}`);
