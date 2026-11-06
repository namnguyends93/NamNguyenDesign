// npm run demo — after npm run build. Writes dist/projects/demo-<layout>.html for each of the 5 layouts with sample text + 7 images.
const path = require('path'), fs = require('fs');
const site = path.join(__dirname, '..');
const { renderProjectPage, LAYOUTS } = require(path.join(site, 'project-template.js'));
const content = JSON.parse(fs.readFileSync(path.join(site, 'content.json'), 'utf8'));
const F = 'https://framerusercontent.com/images/';
const imgs = ['H3KNH97QuI3MqCMMrAfkRwWSDAc', 'BYTBcqFikmPNhvjQYU7pi3ciyI', 'r1Q4APz4TNMV5x9oKRYscAL06c', 'ZNnj2toPGisdyf6eClzPnuV72fM'].map(x => F + x + '.jpg?width=1600');
const gallery = [1, 2, 3, 0, 1, 2, 3].map(i => imgs[i]);
const demo = LAYOUTS.map(([k], i) => ({
  slug: 'demo-' + k, title: 'Demo ' + k, category: 'Brand Identity', year: '2026', client: 'Sample Client',
  role: 'Art Direction / Visual Design', scope: 'Concept / Key Visual / System', layout: k, cover: imgs[i % 4],
  headline: 'Direction\n& System', published: true, gallery: k === 'minimal' ? gallery.slice(0, 3) : k === 'compact' ? gallery.slice(0, 4) : k === 'standard' ? gallery.slice(0, 5) : gallery,
  description: 'A campaign system built to feel premium, contemporary and unmistakably beauty-led — balancing elegance with a sharper, more editorial attitude.',
  statement: 'Beauty communication can feel premium without becoming predictable.',
  challenge: 'The brand needed to stand out in a crowded beauty market while keeping its premium, trusted tone.',
  approach: 'We built a flexible key visual system: bold editorial crops, a restrained palette and one typographic voice across every touchpoint.',
  result: 'A consistent campaign rolled out across OOH, social and retail, with assets the in-house team can extend on their own.',
}));
const c = { ...content, projects: demo };
for (const p of demo) fs.writeFileSync(path.join(site, 'dist/projects', p.slug + '.html'), renderProjectPage(c, p.slug));
console.log('demo pages:', demo.map(p => p.slug).join(', '));
fs.copyFileSync(path.join(__dirname, 'demo-overview.html'), path.join(site, 'dist', 'demo-overview.html'));
console.log('Open: npm run preview -> http://127.0.0.1:4000/NamNguyenDesign/demo-overview.html');
