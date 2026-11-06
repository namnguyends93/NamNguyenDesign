// Serves ./dist under /NamNguyenDesign/ to simulate a GitHub Pages project URL.
// Run: node tools/preview-dist.js  -> http://127.0.0.1:4000/NamNguyenDesign/
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist'), PREFIX = '/NamNguyenDesign/';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!u.startsWith(PREFIX)) { res.writeHead(302, { Location: PREFIX }); return res.end(); }
  let f = path.resolve(DIST, '.' + '/' + u.slice(PREFIX.length));
  if (!f.startsWith(DIST)) { res.writeHead(400); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(4000, '127.0.0.1', () => console.log('dist preview: http://127.0.0.1:4000' + PREFIX));
