# NamNguyenDesign portfolio: notes for Claude

Write replies to the owner in Vietnamese.

## How the site works
- A static site with a local Node CMS. `npm run dev` serves http://localhost:3000, and the admin is at `/admin`.
- `content.json` is the whole database. Uploaded images go in `uploads/`.
- `cms-runtime.js` patches the home page DOM from `content.json`.
- `project-template.js` is shared by Node and the browser and renders `projects/<slug>.html` from each project's `blocks`.
  - Block types: overview, intro, gallery, image, chapter, text, process, statement, credits.
  - Presets: minimal, compact, standard (the default), story, showcase.
- The owner edits everything without AI: double-click `Mo Admin Portfolio.bat` (starts server.js and opens the admin).
  - Visual editor at /edit (`editor.html`, also "✎ Chỉnh sửa trực tiếp" in the admin): the home page in an iframe (`/?edit=1`); click a text to type, "🖼 Đổi ảnh" badges change images (upload or Media, with size notes), right panel toggles sections, accent colour, marquee words, intro services; Lưu / Hoàn tác / Máy tính–Điện thoại. Text and image targets are listed in `bindings()` in editor.html: add a line there when the home page gets a new field. With `?edit=1`, motion.js and i18n.js do nothing, so the page stays plain English.
  - Right panel = inspector: `SECS` in editor.html lists every home section with all its fields (text, area, url, bool, color, select, range, img, list, items with add/dup/↑↓/delete, and project/article page lists). A ⚙ badge on each section, a click inside it, or the chips select it. Inspector edits call `setVal()` (undoable) and reload the preview; the preview renders the editor's unsaved state because cms-runtime.js reads `parent.__VE_STATE__` when `?edit=1`. Add a field = add one line to `SECS` (and render it in cms-runtime.js if new).
  - cms-runtime.js builds nav (`navigation.badge`, items, cta), hero title (newline = <br>), intro meta, client strip (name or logo, link), and footer (`brand`, `description`, `tagline`, `links`, `bigWord`, `copyright`, `note`) from data instead of replacing template text. Theme: `site.theme` = black, dark, white, accentSoft, headingFont, radius.
  - Project panel: all page fields, duplicate page, delete page.
  - List items on the home page (skill chips, tools, AI tools, nav links, footer links, stats, client cards) show a red ✕ on hover that removes the item (`del()` in `bindings()`, undoable). In layout mode the panel has a delete button and the Delete key works.
  - "✥ Bố cục" (layout mode, home page only): click any element to select it, drag it to move (CSS `translate`), handles for width, height, both (Shift keeps ratio), corner radius, and padding top/bottom on sections; arrow keys nudge. Stored per device in `layout.desktop` / `layout.mobile` = { cssSelector: {w,h,r,x,y,pt,pb,d} } (desktop ≥701px, mobile ≤700px). `selFor()` in editor.html builds the selector (id anchor, unique class or nth-child, checked unique). cms-runtime.js exposes `__cmsLayoutCss()` and writes `<style id="cms-layout">`, so the build prerenders it.
  - Project and article pages are edited in the same editor (page picker in the toolbar, or `/edit?page=<slug>`). The editor renders them in the browser with `ProjectTemplate.renderProjectPage(state, slug, { edit: true })` into an iframe srcdoc (`<base href="/projects/">`, `window.__VE_EDIT__`). Edit mode adds data-ve / data-ve-img / data-ve-block marks and placeholders for empty fields; normal rendering is byte-identical. The right panel lists modules: add, ↑ ↓, delete, gallery style, add photos, chapter side, hero height, published, article card image.
  - Image fields in the admin show recommended sizes (`.hint`); article projects have their own portrait card image (`thumbnail`).
  - Admin → Cài đặt chung: brand, contact email (applied to every mailto), SEO title/description, site URL, accent colour, marquee words (`home.marquee`), the two numbers beside the slider (`home.projectsSection.stats`), cursor ring on/off and text (`site.cursorRing`, `site.cursorText`).
  - Admin → Xuất bản: "Build thử", "Đưa lên Cloudflare" (build + wrangler deploy) and "Lưu lên GitHub" (git add/commit/push). server.js runs one job at a time and the page polls `/api/publish/status` for the log.
  - Non-GET API calls from another origin get 403, so other websites cannot drive the local admin.
  - server.js injects cms-runtime.js into site pages only, never into admin.html.
- `npm run build` writes `dist/`. It prerenders with jsdom, converts images to WebP with sharp, and minifies the HTML.
- `npm run demo` writes demo pages of the 5 presets into `dist/`.
- Owner (2026): Nam Nguyen, Design Leader at Ngoc Dung Beauty Center (Thẩm mỹ viện Ngọc Dung), led 20 campaigns in 2026; designer since 2019 (FPT Arena). Earlier: Sinbad, Tu Trinh Spa, LinkHouse, Seedcom (Juno, Hnoss), Maple Land, Ngoc Dung & Zema. Old portfolio: https://www.behance.net/gallery/199409315/Portfolio-2024
- Home project slider: one slide per published project, in admin order. `home.projectsSection.homeLimit` (Admin → Projects) caps how many; empty = all.
- Contact: a white QR on a transparent PNG sits on the glass with no card (`home.contact.qrImage`). `uploads/qr-zalo-demo.png` is a placeholder that points to a fake number: replace it before going live.
- `content.json` → `site.siteUrl` is the absolute site address used for share previews (og:image), canonical and sitemap.xml. Change it when the domain changes.
- Deploys run on GitHub Pages via Actions: push to `main`, then build and deploy `dist`. The live site is https://namnguyends93.github.io/NamNguyenDesign/.

- Interaction layer (inspired by gojett.framer.website, keeping the owner's own design):
  - Lives in `assets/motion.js` and `assets/motion.css`. It runs after `window.__CMS_DONE__` and adds `.motion` to `<html>`.
  - Effects: split-character headline reveal, hero zoom and fade on scroll, image parallax (`--py`), a velocity marquee (`.big-marquee`, placed before `#journal`), hover text scramble, a rotating "NAM NGUYEN •" text ring (96px) that follows the mouse everywhere, and magnetic buttons.
  - The cursor ring and magnetic buttons run only with a mouse. Reduced motion turns all of it off.
  - The marquee text is hardcoded in `index.html` and is not in the admin yet.
  - Journal: 3 posts = grid of cards; 4 or more = a carousel with ← → buttons. The owner rejected a hover-image list.
  - Journal articles are projects with `kind: "journal"` (Admin → Projects → Loại, or Journal tab → "+ Thêm bài Nhật ký"). They get pages at `projects/<slug>.html`, are left out of the home slider, and fill the Journal cards. `home.journal.items` is only a fallback when no article exists.
  - The 6 articles about AI (Higgsfield, Magnific) and leadership are sample copy with placeholder images: the owner will rewrite them.
  - Every project/article page ends with "More projects / More articles": the other pages of the same kind, next one first, up to 6.
  - Skillset has an "AI Tools" group (`about.skills.aiTools`, `aiTitle`). Any tool can have its own icon image (`image`), which wins over the preset icon.
  - Not built yet: a background colour change on scroll.
- VI / EN switch (`assets/i18n.js`, on every page):
  - Pages are written in English. Vietnamese is a dictionary `content.json` → `i18n.vi` = { "English text": "Vietnamese text" }, edited in Admin → Tiếng Việt (that tab scans pages with `?i18nscan=1` to list every text).
  - The dictionary is embedded as `<script type="application/json" id="i18n-vi">`: by `cms-runtime.js` on the home page, by `project-template.js` on project pages.
  - The choice is kept in localStorage `nnd-lang` (also `?lang=vi|en`). Switching reloads the page, so `i18n.js` must run before `motion.js` splits headlines.
  - An empty entry means keep English. If English text changes, its old translation no longer matches: rescan in the admin.
  - `html[lang=vi]` gets a little more line height on big capitals for the accents.
- Check animations in Chrome, because the built-in browser pane is hidden and does not run IntersectionObserver or requestAnimationFrame.
- Deploy everything: `git push origin main` updates GitHub Pages, then `npm run deploy` updates Cloudflare.

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
  - R2 is on.
    - Bucket `nnd-media`, public at https://pub-5947827bb4ba488e9292f97b6e5a045a.r2.dev.
    - `media.config.json` turns it on. Images uploaded in the admin go to R2 through Wrangler (no keys are stored) and are listed in `media-r2.json`, which is committed.
    - Old images in `uploads/` stay where they are.
    - `build.js` downloads R2 images and turns them into WebP in `dist/`, just like other remote images.
  - On a new machine, run `npm install` and then `npx wrangler login` once (in PowerShell use `npx.cmd`, because script execution is disabled), otherwise uploads fail with an error asking you to log in.
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
