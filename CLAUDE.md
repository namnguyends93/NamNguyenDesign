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
- `content.json` → `site.siteUrl` is the absolute site address used for share previews (og:image), canonical and sitemap.xml. Change it when the domain changes.
- Deploys run on GitHub Pages via Actions: push to `main`, then build and deploy `dist`. The live site is https://namnguyends93.github.io/NamNguyenDesign/.

## Rules from the owner
- Optimize and build locally first. **Push to GitHub only when the owner says so.**
- Use relative paths everywhere, because the site must work both under `/NamNguyenDesign/` and at a domain root.

## Open items
- Custom domain `namnguyendesign.com`. The owner has not set DNS yet, and the registrar is unknown.
  - Option A, GitHub Pages: A records 185.199.108-111.153, CNAME `www` → namnguyends93.github.io, then add a `CNAME` file and turn on Enforce HTTPS.
  - Option B, chosen: move hosting to Cloudflare Pages and move the domain's DNS to Cloudflare.
- **Cloudflare status (2026-11-07):**
  - The site is live on Cloudflare at https://namnguyendesign.namnguyen-thietketkm.workers.dev, as a Worker with static assets (`wrangler.jsonc`, assets = `./dist` only).
  - To deploy from this machine, run `npm run deploy`, which builds and then runs `wrangler deploy`. Wrangler is logged in through OAuth.
  - Cloudflare serves `/x.html` as a 307 redirect to `/x`. That is normal.
  - GitHub Pages is still on as well.
  - R2 is not enabled yet. Turning it on needs the owner to click "Add R2 subscription" and add a payment method. The plan is free under 10 GB, but Cloudflare requires a card on file. Claude must not enter card details.
  - Once R2 is enabled, run `npx wrangler r2 bucket create nnd-media`, then make admin uploads go to R2.
- **Older notes on the GitHub-app route (abandoned in favour of Wrangler):**
  - The owner has a Cloudflare account (Free plan), signed in with namnguyen.thietketkm@gmail.com.
  - The "Cloudflare Workers and Pages" GitHub app install was started for the **NamNguyenDesign repo only**. It stopped at GitHub's "Confirm access" password prompt. First check whether it got installed (GitHub → Settings → Applications); if not, redo it from Cloudflare → Workers & Pages → Create → Pages → Import an existing Git repository → Connect GitHub.
  - Next steps:
    1. Create the Pages project from `namnguyends93/NamNguyenDesign`, branch `main`, build command `npm run build`, output directory `dist`.
    2. Check the `*.pages.dev` site, then set `site.siteUrl` to the new address.
    3. Add the custom domain in Cloudflare.
    4. Turn off GitHub Pages so there aren't two copies of the site.
  - Later: Cloudflare R2 (10 GB free) for uploaded images, so the admin uploads straight to R2. The owner creates the API keys themself and puts them in a local config file that is not committed, never in chat.
  - `content.json` stays in Git.
- The owner cannot enter passwords through Claude. Pause at any password or 2FA prompt and ask the owner to do it.
