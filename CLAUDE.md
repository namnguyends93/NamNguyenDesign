# NamNguyenDesign portfolio: notes for Claude

Write replies to the owner in Vietnamese.

## How the site works
- A static site with a local Node CMS. `npm run dev` serves http://localhost:3000, and the admin is at `/admin`.
- `content.json` is the whole database. Uploaded images go in `uploads/`.
- `cms-runtime.js` patches the home page DOM from `content.json`.
- `project-template.js` is shared by Node and the browser and renders `projects/<slug>.html` from each project's `blocks`.
  - Block types: overview, intro, gallery, image, chapter, text, process, statement, credits.
  - Presets: minimal, compact, standard (the default), story, showcase.
- `npm run build` writes `dist/`. It prerenders with jsdom, converts images to WebP with sharp, and minifies the HTML.
- `npm run demo` writes demo pages of the 5 presets into `dist/`.
- Deploys run on GitHub Pages via Actions: push to `main`, then build and deploy `dist`. The live site is https://namnguyends93.github.io/NamNguyenDesign/.

## Rules from the owner
- Optimize and build locally first. **Push to GitHub only when the owner says so.**
- Use relative paths everywhere, because the site must work both under `/NamNguyenDesign/` and at a domain root.

## Open items
- Custom domain `namnguyendesign.com`. The owner has not set DNS yet, and the registrar is unknown.
  - Option A, GitHub Pages: A records 185.199.108-111.153, CNAME `www` → namnguyends93.github.io, then add a `CNAME` file and turn on Enforce HTTPS.
  - Option B, being considered: move hosting to Cloudflare Pages (build `npm run build`, output `dist`) and move the domain's DNS to Cloudflare.
- Cloudflare R2 for large images or video: not needed yet.
