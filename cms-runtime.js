/* Nam Nguyen Design CMS runtime — shared by server.js (local) and build.js (static) */
window.__CMS_DONE__=(async function(){
  // Base URL of the site (works on localhost:3000 and on GitHub Pages sub-paths).
  // build.js sets __CMS_BASE__ / __CMS_CONTENT__ to prerender pages without fetching.
  const BASE=window.__CMS_BASE__!==undefined?window.__CMS_BASE__:(document.currentScript&&document.currentScript.src)?new URL(".",document.currentScript.src).href:location.origin+"/";
  try{
    // Visual editor (/edit): preview the editor's unsaved content instead of the saved file
    const veState=(/[?&]edit=1/.test(location.search)&&window.parent!==window)?(()=>{try{return window.parent.__VE_STATE__?JSON.parse(JSON.stringify(window.parent.__VE_STATE__)):null}catch(e){return null}})():null;
    const raw=window.__CMS_CONTENT__||veState||await (await fetch(BASE+"content.json",{cache:"no-store"})).json();
    // Rewrite root-absolute paths like /uploads/x.jpg so they resolve under BASE
    const fix=v=>typeof v==="string"?(/^\/(uploads|projects)\//.test(v)?BASE+v.slice(1):v):Array.isArray(v)?v.map(fix):(v&&typeof v==="object")?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,fix(x)])):v;
    const c=fix(raw);
    // Home-section images must not overwrite images on project detail pages
    const isHome=!/\/projects\/[^/]+\.html$/i.test(location.pathname);
    // On sub-pages, section links like "#about" must point back to the home page
    const link=h=>(!isHome&&/^#/.test(h||''))?BASE+'index.html'+h:h;
    const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
    const txtNodes=()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const a=[];let n;while(n=w.nextNode())a.push(n);return a};
    const replaceExact=(from,to,all=false)=>{if(to===undefined||to===null||!from)return;let done=false;for(const n of txtNodes()){if((n.nodeValue||'').trim()===String(from).trim()){n.nodeValue=String(to);done=true;if(!all)break}}return done};
    const hideByIdOrText=(id,text,visible)=>{if(visible!==false)return;const el=q('#'+id)||qa('section,header,footer,div').find(x=>(x.textContent||'').includes(text));if(el)el.style.display='none'};

    // Vietnamese dictionary for assets/i18n.js
    {const vi=raw.i18n?.vi;let el=q('#i18n-vi');if(vi&&Object.keys(vi).length){if(!el){el=document.createElement('script');el.type='application/json';el.id='i18n-vi';document.head.appendChild(el)}el.textContent=JSON.stringify(vi).replace(/</g,'\\u003c')}else if(el)el.remove()}
    document.title=c.site?.seoTitle||document.title;
    let meta=q('meta[name="description"]');if(meta&&c.site?.seoDescription)meta.content=c.site.seoDescription;
    if(c.site?.accent)document.documentElement.style.setProperty('--accent',c.site.accent);
    // Cursor ring text (motion.js reads these attributes)
    if(c.site?.cursorText)document.documentElement.dataset.cursorText=c.site.cursorText;
    if(c.site?.cursorRing===false)document.documentElement.dataset.cursorRing='off';
    // Big scrolling band: words alternate plain / outlined
    {const mq=c.home?.marquee,band=q('.big-marquee');if(band&&mq){if(mq.visible===false)band.style.display='none';else{const words=(mq.words||[]).map(w=>String(w).trim()).filter(Boolean);const tr=q('.bm-track',band);if(words.length&&tr){const e=v=>String(v).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));tr.innerHTML='<span>'+words.map((w,i)=>i%2?'<b>'+e(w)+'</b>':e(w)).join(' · ')+' · </span>';band.setAttribute('aria-label',words.join(', '))}}}}
    // Two numbers beside the project slider
    {const st=c.home?.projectsSection?.stats,box=q('#projects .stats');if(box&&Array.isArray(st)){const ok=st.filter(s=>s&&(s.value||s.label));const e=v=>String(v??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));box.innerHTML=ok.map(s=>'<div class="stat"><strong class="display">'+e(s.value)+'</strong><span class="muted">'+e(s.label)+'</span></div>').join('');box.style.display=ok.length?'':'none'}}

    const E=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    const lines=v=>E(v).replace(/\n/g,'<br>');   // text fields: a new line = <br>
    const ext=h=>/^https?:/i.test(h||'');

    // THEME: colours, heading font, corner roundness (site.theme)
    {const t=c.site?.theme||{},r=document.documentElement.style;
      [['black','--black'],['dark','--dark'],['white','--white'],['accentSoft','--accent-soft']].forEach(([k,v])=>{if(/^#[0-9a-f]{3,8}$/i.test(t[k]||''))r.setProperty(v,t[k])});
      const FONTS={'Space Grotesk':'','Inter':'','Syne':'Syne:wght@600;700','Archivo':'Archivo:wght@600;800','Unbounded':'Unbounded:wght@500;700','Bricolage Grotesque':'Bricolage+Grotesque:wght@600;700','Playfair Display':'Playfair+Display:wght@600;700','DM Serif Display':'DM+Serif+Display','Anton':'Anton','Be Vietnam Pro':'Be+Vietnam+Pro:wght@600;700'};
      let css='';const f=t.headingFont;
      if(f&&f!=='Space Grotesk'&&f in FONTS){if(FONTS[f]&&!q('link[data-cms-font]')){const l=document.createElement('link');l.rel='stylesheet';l.dataset.cmsFont='1';l.href='https://fonts.googleapis.com/css2?family='+FONTS[f]+'&display=swap';document.head.appendChild(l)}
        css+='.display,.big-title,.bm-track span,.qr-phone,.footer-word,.project-info-showcase h2{font-family:"'+f+'",Inter,sans-serif!important}'}
      const s=parseFloat(t.radius);if(s>=0&&s!==1)css+=':root{--radius-xl:'+Math.round(156*s)+'px;--radius-lg:'+Math.round(72*s)+'px;--radius-md:'+Math.round(46*s)+'px}@media(max-width:900px){:root{--radius-xl:'+Math.round(106*s)+'px}}';
      let st=q('#cms-theme');if(css){if(!st){st=document.createElement('style');st.id='cms-theme';document.head.appendChild(st)}st.textContent=css}else if(st)st.remove()}

    // LAYOUT: sizes, corners, offsets and spacing dragged in the editor (layout.desktop / layout.mobile = { selector: {w,h,r,x,y,pt,pb,d} })
    {const layoutCss=L=>{const px=n=>Math.round(+n||0)+'px';
        const one=m=>Object.entries(m||{}).map(([s,v])=>{if(!v||/[{}<;]/.test(s))return'';const d=[];
          if(v.d==='inline-block'||v.d==='block')d.push('display:'+v.d);
          if(v.w!=null&&v.w!=='')d.push('width:'+px(v.w),'max-width:100%','flex:none');
          if(v.h!=null&&v.h!=='')d.push('height:'+px(v.h),'min-height:0');
          if((v.w!=null&&v.w!=='')||(v.h!=null&&v.h!==''))d.push('object-fit:cover');
          if(v.r!=null&&v.r!=='')d.push('border-radius:'+px(v.r),'overflow:hidden');
          if(+v.x||+v.y)d.push('translate:'+px(v.x)+' '+px(v.y));
          if(v.pt!=null&&v.pt!=='')d.push('padding-top:'+px(v.pt));if(v.pb!=null&&v.pb!=='')d.push('padding-bottom:'+px(v.pb));
          return d.length?s+'{'+d.map(x=>x+'!important').join(';')+'}':''}).join('');
        const a=one(L&&L.desktop),b=one(L&&L.mobile);return (a?'@media (min-width:701px){'+a+'}':'')+(b?'@media (max-width:700px){'+b+'}':'')};
      window.__cmsLayoutCss=layoutCss;
      if(isHome){const css=layoutCss(raw.layout);let st=q('#cms-layout');if(css){if(!st){st=document.createElement('style');st.id='cms-layout';document.head.appendChild(st)}st.textContent=css}else if(st)st.remove()}}

    // NAV: logo badge, links and the button are built from navigation.*
    {const n=c.navigation||{},nav=q('nav.nav');if(nav){
      const badge=q('.brand-badge',nav);if(badge){if(n.badge)badge.innerHTML=lines(n.badge);badge.hidden=n.badgeVisible===false}
      const box=q('.nav-links',nav);if(box&&Array.isArray(n.items))box.innerHTML=n.items.filter(x=>x&&x.visible!==false&&x.label).map(it=>'<a href="'+E(link(it.href||'#'))+'"'+(ext(it.href)?' target="_blank" rel="noopener"':'')+'>'+E(it.label)+'</a>').join('');
      const cta=q('.nav-contact',nav);if(cta){if(n.ctaLabel)cta.textContent=n.ctaLabel;if(n.ctaHref)cta.href=link(n.ctaHref);cta.hidden=n.ctaVisible===false}
      if(n.visible===false)(q('.nav-wrap')||nav).style.display='none'}}

    // HERO
    replaceExact('Independent Visual Designer',c.home?.hero?.eyebrow);
    replaceExact('Selected Work.26',c.home?.hero?.indexLabel);
    {const h1=q('.hero-copy h1');if(h1&&c.home?.hero?.title)h1.innerHTML=lines(c.home.hero.title)}
    {const t=String(c.home?.hero?.title||'').replace(/\s+/g,' ').trim().toUpperCase();if(t)qa('.project-top span:first-child').forEach(s=>{s.textContent=t})}
    replaceExact('Brand identities, campaign visuals and digital experiences built with clarity, edge and intent.',c.home?.hero?.description);
    if(isHome&&c.home?.hero?.image){const hero=q('.hero-bg img')||q('.hero img');if(hero)hero.src=c.home.hero.image}
    hideByIdOrText('home','Independent Visual Designer',c.home?.hero?.visible);

    // INTRO / CLEAR IDEAS
    replaceExact('Visual Designer / Art Direction',c.home?.intro?.eyebrow);
    replaceExact('Clear ideas. Bold visual direction.',c.home?.intro?.title);
    {const m=qa('.intro-meta span'),it=c.home?.intro||{};
      if(m[0]&&Array.isArray(it.services))m[0].innerHTML=it.services.filter(Boolean).map(E).join('<br>');
      if(m[1]&&it.location)m[1].innerHTML=lines(String(it.location).replace(/,\s*/,'\n'))}
    if(isHome&&c.home?.intro?.image){const target=q('.intro-panel.image img');if(target)target.src=c.home.intro.image}
    hideByIdOrText('intro','Clear ideas. Bold visual direction.',c.home?.intro?.visible);

    // ABOUT
    replaceExact('Profile.26',c.home?.about?.eyebrow);
    replaceExact('About',c.home?.about?.title);
    replaceExact('Nam Nguyen Design is an independent visual design practice focused on brand identity, campaign systems and art direction. Every project is shaped around a clear idea, a strong visual point of view and execution that feels precise, contemporary and memorable.',c.home?.about?.description);
    if(isHome&&c.home?.about?.image){const target=q('.about-bg img');if(target)target.src=c.home.about.image}
    hideByIdOrText('about','Profile.26',c.home?.about?.visible);

    // SKILLSET (About) — app icons: Adobe-style letter tiles + Simple Icons glyphs (CC0)
    const APP_ICONS={"ps":{"bg":"#001E36","t":"Ps","c":"#31A8FF"},"ai":{"bg":"#330000","t":"Ai","c":"#FF9A00"},"id":{"bg":"#49021F","t":"Id","c":"#FF3366"},"ae":{"bg":"#00005B","t":"Ae","c":"#9999FF"},"pr":{"bg":"#00005B","t":"Pr","c":"#9999FF"},"lr":{"bg":"#001E36","t":"Lr","c":"#31A8FF"},"xd":{"bg":"#470137","t":"Xd","c":"#FF61F6"},"figma":{"bg":"#1E1E1E","svg":"<svg viewBox=\"0 0 38 57\" aria-hidden=\"true\"><path fill=\"#1ABCFE\" d=\"M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z\"/><path fill=\"#0ACF83\" d=\"M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z\"/><path fill=\"#FF7262\" d=\"M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z\"/><path fill=\"#F24E1E\" d=\"M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z\"/><path fill=\"#A259FF\" d=\"M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z\"/></svg>"},"blender":{"bg":"#1B1B1B","c":"#E87D0D","d":"M12.51 13.214c.046-.8.438-1.506 1.03-2.006a3.424 3.424 0 0 1 2.212-.79c.85 0 1.631.3 2.211.79.592.5.983 1.206 1.028 2.005.045.823-.285 1.586-.865 2.153a3.389 3.389 0 0 1-2.374.938 3.393 3.393 0 0 1-2.376-.938c-.58-.567-.91-1.33-.865-2.152M7.35 14.831c.006.314.106.922.256 1.398a7.372 7.372 0 0 0 1.593 2.757 8.227 8.227 0 0 0 2.787 2.001 8.947 8.947 0 0 0 3.66.76 8.964 8.964 0 0 0 3.657-.772 8.285 8.285 0 0 0 2.785-2.01 7.428 7.428 0 0 0 1.592-2.762 6.964 6.964 0 0 0 .25-3.074 7.123 7.123 0 0 0-1.016-2.779 7.764 7.764 0 0 0-1.852-2.043h.002L13.566 2.55l-.02-.015c-.492-.378-1.319-.376-1.86.002-.547.382-.609 1.015-.123 1.415l-.001.001 3.126 2.543-9.53.01h-.013c-.788.001-1.545.518-1.695 1.172-.154.665.38 1.217 1.2 1.22V8.9l4.83-.01-8.62 6.617-.034.025c-.813.622-1.075 1.658-.563 2.313.52.667 1.625.668 2.447.004L7.414 14s-.069.52-.063.831zm12.09 1.741c-.97.988-2.326 1.548-3.795 1.55-1.47.004-2.827-.552-3.797-1.538a4.51 4.51 0 0 1-1.036-1.622 4.282 4.282 0 0 1 .282-3.519 4.702 4.702 0 0 1 1.153-1.371c.942-.768 2.141-1.183 3.396-1.185 1.256-.002 2.455.41 3.398 1.175.48.391.87.854 1.152 1.367a4.28 4.28 0 0 1 .522 1.706 4.236 4.236 0 0 1-.239 1.811 4.54 4.54 0 0 1-1.035 1.626"},"c4d":{"bg":"#0B1A44","c":"#FFFFFF","d":"M12.052 0C5.394-.007-.003 5.412 0 11.976.003 18.654 5.475 23.981 11.978 24c6.535.02 12.057-5.306 12.022-11.998-.009-1.665-.53-5.371-1.84-5.276-1.98.145-2.159 4.12-2.377 5.407-.417 2.46-1.346 5.08-2.953 6.99-1.88 2.359-4.697 3.634-7.662 3.158-3.55-.564-5.893-3.278-6.68-5.201-.753-1.723-1.035-4.162-.07-6.324 1.16-2.766 3.734-4.632 6.28-5.584 2.006-.827 4.103-1.151 5.357-1.375 2.516-.5 2.855-1.463 2.814-2.149-.015-.252-.256-.724-.785-.943C15.03.269 13.268.001 12.052 0zm5.098 1.342c.139.398.088.85-.148 1.256-.325.56-.972 1.05-1.897 1.29-1.636.428-2.976.554-4.34.96-1.312.39-3.397 1.018-5.316 2.552-.268.842-.341 1.892-.369 2.662.15 5.014 4.557 8.884 9.17 8.682.853-.037 1.921-.261 2.912-.68a13.56 13.56 0 0 0 1.387-2.683l.002-.002v-.002c.424-1.03.606-1.836.8-2.793.32-1.565.202-2.88 1.012-4.758.251-.582.71-1.113 1.258-1.346.25-.105.522-.133.79-.072-.89-2.471-3.115-4.326-5.26-5.066z"},"canva":{"bg":"#7D2AE8","c":"#FFFFFF","d":"M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zM6.962 7.68c.754 0 1.337.549 1.405 1.2.069.583-.171 1.097-.822 1.406-.343.171-.48.172-.549.069-.034-.069 0-.137.069-.206.617-.514.617-.926.548-1.508-.034-.378-.308-.618-.583-.618-1.2 0-2.914 2.674-2.674 4.629.103.754.549 1.646 1.509 1.646.308 0 .65-.103.96-.24.5-.264.799-.47 1.097-.8-.073-.885.704-2.046 1.851-2.046.515 0 .926.205.96.583.068.514-.377.582-.514.582s-.378-.034-.378-.17c-.034-.138.309-.07.275-.378-.035-.206-.24-.274-.446-.274-.72 0-1.131.994-1.029 1.611.035.275.172.549.447.549.205 0 .514-.31.617-.755.068-.308.343-.514.583-.514.102 0 .17.034.205.171v.138c-.034.137-.137.548-.102.651 0 .069.034.171.17.171.092 0 .436-.18.777-.459.117-.59.253-1.298.253-1.357.034-.24.137-.48.617-.48.103 0 .171.034.205.171v.138l-.136.617c.445-.583 1.097-.994 1.508-.994.172 0 .309.102.309.274 0 .103 0 .274-.069.446-.137.377-.309.96-.412 1.474 0 .137.035.274.207.274.171 0 .685-.206 1.096-.754l.007-.004c-.002-.068-.007-.134-.007-.202 0-.411.035-.754.104-.994.068-.274.411-.514.617-.514.103 0 .205.069.205.171 0 .035 0 .103-.034.137-.137.446-.24.857-.24 1.269 0 .24.034.582.102.788 0 .034.035.069.07.069.068 0 .548-.445.89-1.028-.308-.206-.48-.549-.48-.96 0-.72.446-1.097.858-1.097.343 0 .617.24.617.72 0 .308-.103.65-.274.96h.102a.77.77 0 0 0 .584-.24.293.293 0 0 1 .134-.117c.335-.425.83-.74 1.41-.74.48 0 .924.205.959.582.068.515-.378.618-.515.618l-.002-.002c-.138 0-.377-.035-.377-.172 0-.137.309-.068.274-.376-.034-.206-.24-.275-.446-.275-.686 0-1.13.891-1.028 1.611.034.275.171.583.445.583.206 0 .515-.308.652-.754.068-.274.343-.514.583-.514.103 0 .17.034.205.171 0 .069 0 .206-.137.652-.17.308-.171.48-.137.617.034.274.171.48.309.583.034.034.068.102.068.102 0 .069-.034.138-.137.138-.034 0-.068 0-.103-.035-.514-.205-.72-.548-.789-.891-.205.24-.445.377-.72.377-.445 0-.89-.411-.96-.926a1.609 1.609 0 0 1 .075-.649c-.203.13-.422.203-.623.203h-.17c-.447.652-.927 1.098-1.27 1.303a.896.896 0 0 1-.377.104c-.068 0-.171-.035-.205-.104-.095-.152-.156-.392-.193-.667-.481.527-1.145.805-1.453.805-.343 0-.548-.206-.582-.55v-.376c.102-.754.377-1.2.377-1.337a.074.074 0 0 0-.069-.07c-.24 0-1.028.824-1.166 1.373l-.103.445c-.068.309-.377.515-.582.515-.103 0-.172-.035-.206-.172v-.137l.046-.233c-.435.31-.87.508-1.075.508-.308 0-.48-.172-.514-.412-.206.274-.445.412-.754.412-.352 0-.696-.24-.862-.593-.244.275-.523.553-.852.764-.48.309-1.028.549-1.68.549-.582 0-1.097-.309-1.371-.583-.412-.377-.651-.96-.686-1.509-.205-1.68.823-3.84 2.4-4.8.378-.205.755-.343 1.132-.343zm9.77 3.291c-.104 0-.172.172-.172.343 0 .274.137.583.309.755a1.74 1.74 0 0 0 .102-.583c0-.343-.137-.515-.24-.515z"},"davinci":{"bg":"#233A51","c":"#FFFFFF","d":"M17.621 0 5.977.004c-1.37 0-2.756.345-3.762 1.11a4.925 4.925 0 0 0-1.61 2.003C.233 3.93 0 5.02 0 5.951l.012 12.2c.002 1.604.479 3.057 1.461 4.112.984 1.056 2.462 1.683 4.331 1.691L16.856 24c1.26.005 3.095-.036 4.303-.714 1.075-.605 2.025-1.556 2.497-2.984.278-.84.345-2.084.344-3.147l-.021-11.13c-.002-.888-.15-2.023-.547-2.934-.425-.976-1.181-1.815-2.322-2.425C20.353.26 19.123 0 17.622 0zm0 .93c1.378 0 2.538.295 3.04.565.977.523 1.544 1.166 1.889 1.96.315.721.47 1.793.473 2.572l.018 11.13c.002 1.013-.097 2.257-.298 2.86-.396 1.202-1.146 1.946-2.063 2.462-.814.457-2.612.593-3.82.588l-11.05-.044c-1.657-.007-2.832-.534-3.626-1.386-.792-.851-1.212-2.06-1.212-3.485L.999 5.95c0-.829.196-1.827.474-2.437.345-.757.75-1.207 1.365-1.674C3.585 1.27 4.868.97 6.08.97zm-5.66 3.423c-1.976.089-3.204 1.658-3.214 3.29.019 1.443 1.635 3.481 2.884 4.53.12.099.154.109.33.18.062.025.198-.047.327-.135.36-.245.993-.947 1.648-1.738a7.67 7.67 0 0 0 1.031-1.683c.409-.89.261-1.599.235-1.888a3.983 3.983 0 0 0-.99-1.692 3.36 3.36 0 0 0-2.251-.864zm4.172 7.922a10.185 10.185 0 0 0-3.244.61c-.15.058-.26.1-.374.17-.057.036-.11.135-.105.292.017.433.29 1.278.624 2.27.384 1.135 1.066 2.27 1.844 2.74a3.23 3.23 0 0 0 2.53.342c.832-.243 1.595-.868 1.962-1.546.986-1.818.19-3.548-1.121-4.417-.447-.296-1.133-.445-1.89-.46-.074 0-.15-.002-.226-.001zm-8.432.038a6.201 6.201 0 0 0-.752.047c-.596.078-.932.273-1.29.51a3.177 3.177 0 0 0-1.365 1.979c-.075.552-.086 1.053.033 1.507.433 1.389 1.326 2.222 2.847 2.452.636.028 1.37-.063 1.99-.45 1.269-.782 2.08-3.17 2.412-4.742.053-.176.035-.357-.013-.42-.005-.067-.044-.113-.19-.183-.398-.192-1.32-.417-2.375-.6a7.68 7.68 0 0 0-1.297-.1z"},"procreate":{"bg":"#1B1B1B","t":"Pc","c":"#FFFFFF"}};
    const escH=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    const appIcon=(key,name,image)=>{if(image)return '<span class="app-icon has-img"><img src="'+escH(image)+'" alt="" sizes="32px" loading="lazy"></span>';const k=APP_ICONS[key]||{bg:'#1B1B1B',t:(String(name||'?').replace(/[^A-Za-z0-9]/g,'').slice(0,2)||'?'),c:'#8ea1ff'};
      const inner=k.svg?k.svg:k.d?'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="'+k.c+'" d="'+k.d+'"/></svg>':'<b style="color:'+k.c+';box-shadow:inset 0 0 0 1.5px '+k.c+'66">'+escH(k.t)+'</b>';
      return '<span class="app-icon" style="background:'+k.bg+'">'+inner+'</span>'};
    const toolList=list=>'<ul class="tool-list">'+list.map((t,i)=>'<li class="tool" style="--d:'+(i*70)+'ms">'+appIcon(t.icon,t.name,t.image)+'<span class="tool-name">'+escH(t.name)+'</span></li>').join('')+'</ul>';
    const renderSkills=s=>{const tools=(s.tools||[]).filter(t=>t&&t.name&&t.visible!==false),ai=(s.aiTools||[]).filter(t=>t&&t.name&&t.visible!==false),chips=(s.disciplines||[]).filter(Boolean);
      return '<div class="skills-head"><span class="mono">'+escH(s.eyebrow)+'</span><span class="mono">'+escH(s.label)+'</span></div>'
      +'<div class="skill-rows">'
      +(chips.length?'<div><span class="skills-sub">'+escH(s.disciplinesTitle)+'</span><ul class="chip-list">'+chips.map(x=>'<li class="chip">'+escH(x)+'</li>').join('')+'</ul></div>':'')
      +((tools.length||ai.length)?'<div>'+(tools.length?'<span class="skills-sub">'+escH(s.toolsTitle)+'</span>'+toolList(tools):'')+(ai.length?'<span class="skills-sub skills-sub-ai">'+escH(s.aiTitle||'AI Tools')+'</span>'+toolList(ai):'')+'</div>':'')
      +'</div>'};
    const sk=c.home?.about?.skills,skHost=q('#about .skills');
    if(isHome&&sk&&skHost){if(sk.visible===false)skHost.remove();else skHost.innerHTML=renderSkills(sk)}

    // CLIENTS
    replaceExact('Selected Clients',c.home?.clients?.eyebrow);
    {const h=q('#clients .section-head h2');if(h&&c.home?.clients?.title)h.textContent=c.home.clients.title}
    {const d=q('#clients .section-head .copy'),v=c.home?.clients?.description;if(d&&v!=null)d.textContent=v}
    // Client strip: one card per client (name, or logo image), repeated so the endless strip is always full
    const clientItems=(c.home?.clients?.items||[]).filter(x=>x&&x.visible!==false&&(x.name||x.logo));
    const track=q('#clients .client-track');
    if(track&&clientItems.length){
      const card=it=>{const inner=it.logo?'<img src="'+E(it.logo)+'" alt="'+E(it.name)+'" loading="lazy">':E(it.name);
        return it.href?'<a class="client-card" href="'+E(it.href)+'" target="_blank" rel="noopener">'+inner+'</a>':'<div class="client-card">'+inner+'</div>'};
      let set=clientItems;while(set.length<4)set=set.concat(clientItems);
      track.innerHTML=set.concat(set).map(card).join('');   // the CSS loop scrolls exactly half the track
    }
    // Client card look: shape, size, logo size and colour, card background, speed (home.clients.*)
    {const cl=c.home?.clients||{},k=Math.min(1.5,Math.max(.4,parseFloat(cl.cardSize)||1)),px=n=>Math.round(n)+'px';
      const SH={rounded:[366,357,72],circle:[340,340,'50%'],square:[340,340,24],pill:[460,200,'999px'],wide:[460,280,48],portrait:[300,400,60]};
      const sh=SH[cl.shape]||SH.rounded,rad=v=>typeof v==='string'?v:px(v*k);let css='';
      if((cl.shape&&cl.shape!=='rounded')||k!==1)css+='#clients .client-card{width:'+px(sh[0]*k)+';height:'+px(sh[1]*k)+';border-radius:'+rad(sh[2])+'}@media (max-width:520px){#clients .client-card{width:'+px(sh[0]*k*.82)+';height:'+px(sh[1]*k*.82)+'}}';
      const ls=parseFloat(cl.logoSize);if(ls>0)css+='#clients .client-card img{max-width:'+Math.round(ls*100)+'%;max-height:'+Math.round(ls*68)+'%}';
      if(cl.logoColor==='white')css+='#clients .client-card img{filter:brightness(0) invert(1);opacity:.85}';
      if(cl.logoColor==='original')css+='#clients .client-card img{opacity:1}';
      if(cl.logoColor==='gray')css+='#clients .client-card img{filter:grayscale(1);opacity:.5;transition:filter .3s,opacity .3s}#clients .client-card:hover img{filter:none;opacity:1}';
      if(cl.cardBg==='white')css+='#clients .client-card{background:#fff;backdrop-filter:none;color:rgba(0,0,0,.45)}';
      if(cl.cardBg==='none')css+='#clients .client-card{background:transparent;backdrop-filter:none}';
      if(cl.cardBg==='outline')css+='#clients .client-card{background:transparent;backdrop-filter:none;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}';
      const sp=parseFloat(cl.speed);if(sp>0&&sp!==22)css+='#clients .client-track{animation-duration:'+sp+'s}';
      let st=q('#cms-clients');if(css){if(!st){st=document.createElement('style');st.id='cms-clients';document.head.appendChild(st)}st.textContent=css}else if(st)st.remove()}
    hideByIdOrText('clients','Selected Clients',c.home?.clients?.visible);

    // PROJECTS
    replaceExact('Selected Work.26',c.home?.projectsSection?.eyebrow);
    replaceExact('Projects',c.home?.projectsSection?.title);
    replaceExact('Selected identity, campaign and digital projects shaped through concept, art direction and disciplined visual systems.',c.home?.projectsSection?.description);
    const host=q('.project-showcase');let slides=qa('.project-slide');const homeLimit=parseInt(c.home?.projectsSection?.homeLimit,10);let projects=(c.projects||[]).filter(p=>p.published!==false&&p.kind!=='journal');if(homeLimit>0)projects=projects.slice(0,homeLimit);
    if(host&&slides.length&&projects.length){
      while(slides.length<projects.length){const cl=slides[0].cloneNode(true);host.appendChild(cl);slides.push(cl)}
      while(slides.length>projects.length){slides.pop().remove()}
      slides.forEach((slide,i)=>{const p=projects[i];const img=q('img',slide);if(img&&p.cover)img.src=p.cover;if(p.cover)slide.style.setProperty('--project-bg',"url('"+p.cover+"')");const a=q('a[href]',slide);if(a)a.href=(p.link&&!/^\/?projects\//.test(p.link))?p.link:(BASE+'projects/'+(p.slug||p.id)+'.html');const titles=qa('h1,h2,h3,h4,strong,[class*="title"]',slide);const te=titles.find(x=>/CAMPAIGN|SYSTEM|PROJECT/i.test(x.textContent||''))||titles[0];if(te&&p.title)te.textContent=p.title;const texts=qa('p,span,small,[class*="category"],[class*="year"]',slide);const cat=texts.find(x=>/BRAND IDENTITY|ART DIRECTION|CAMPAIGN DESIGN/i.test(x.textContent||''));if(cat&&p.category)cat.textContent=p.category;const y=texts.find(x=>/^\s*20\d{2}\s*$/.test(x.textContent||''));if(y&&p.year)y.textContent=p.year;const num=qa('.project-top span',slide).find(x=>/\/\s*\d+\s*$/.test(x.textContent||''));if(num)num.textContent=num.textContent.replace(/\d+\s*$/,String(i+1).padStart(2,'0'));slide.classList.toggle('active',i===0)});
      const tot=q('.total-project');if(tot)tot.textContent=String(projects.length).padStart(2,'0');
      if(typeof window.showProject==='function')try{window.showProject(0)}catch(e){}
    }
    hideByIdOrText('projects','Selected Work.26',c.home?.projectsSection?.visible);

    // JOURNAL
    replaceExact('Journal.26',c.home?.journal?.eyebrow);
    replaceExact('Journal',c.home?.journal?.title);
    {const jd=q('#journal .section-head .copy');if(jd&&c.home?.journal?.description)jd.textContent=c.home.journal.description}
    // Journal cards: articles written in Projects (kind "journal"); the old item list is only a fallback
    const articles=(c.projects||[]).filter(p=>p.published!==false&&p.kind==='journal').map(p=>({title:p.title,category:p.category,thumbnail:p.thumbnail||p.cover,href:'projects/'+(p.slug||p.id)+'.html'}));
    const journals=articles.length?articles:(c.home?.journal?.items||[]).filter(x=>x.published!==false);
    // Cards come from home.journal.items. Up to 3 = the normal grid; 4 or more = a carousel with ← → buttons.
    const jGrid=q('#journal .journal-grid');
    if(jGrid&&journals.length){
      const esc=v=>String(v??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
      jGrid.innerHTML=journals.map(j=>{
        const live=j.href&&j.href!=='#';
        const hit=live?'<a class="article-hit" href="'+esc(link(j.href))+'"'+(/^https?:/.test(j.href)?' target="_blank" rel="noopener"':'')+' aria-label="'+esc(j.title)+'"></a>':'';
        return '<article class="article reveal">'+(j.thumbnail?'<img src="'+esc(j.thumbnail)+'" alt="'+esc(j.title)+'">':'')+'<div class="article-copy"><h3>'+esc(j.title)+'</h3><small>'+esc(j.category)+'</small></div>'+hit+'</article>';
      }).join('');
      const carousel=journals.length>3;
      jGrid.classList.toggle('is-carousel',carousel);
      let nav=q('#journal .journal-nav');
      if(carousel&&!nav){nav=document.createElement('div');nav.className='journal-nav';nav.innerHTML='<button class="jr-prev" type="button" aria-label="Previous articles" disabled>←</button><button class="jr-next" type="button" aria-label="Next articles">→</button>';jGrid.after(nav)}
      if(!carousel&&nav)nav.remove();
      qa('.reveal',jGrid).forEach(el=>{try{io.observe(el)}catch(e){}});
    }
    hideByIdOrText('journal','Journal.26',c.home?.journal?.visible);

    // CONTACT
    replaceExact('Start a Project.26',c.home?.contact?.eyebrow);
    replaceExact('Get in touch',c.home?.contact?.title);
    replaceExact('If you are building a brand, campaign or visual system and need a clear creative direction, send over the brief. I am open to selected freelance and collaborative projects.',c.home?.contact?.description);
    if(isHome&&c.home?.contact?.image){const target=q('.contact-bg img');if(target)target.src=c.home.contact.image}
    if(c.home?.contact?.email)replaceExact('hello@namnguyen.design',c.home.contact.email,true);
    // Zalo QR frame: image, caption and phone come from home.contact
    const qrBox=q('#contact .contact-qr');
    if(qrBox){
      const ct=c.home?.contact||{}, qi=q('.qr-img',qrBox), qe=q('.qr-empty',qrBox), qc=q('.qr-caption',qrBox), qp=q('.qr-phone',qrBox);
      if(ct.qrImage){qi.src=ct.qrImage;qi.hidden=false;qe.hidden=true}
      if(ct.qrCaption)qc.textContent=ct.qrCaption;
      if(ct.phone){qp.textContent=ct.phone;qp.href='tel:'+String(ct.phone).replace(/[^+\d]/g,'');qp.hidden=false}
    }
    hideByIdOrText('contact','Start a Project.26',c.home?.contact?.visible);

    // FOOTER
    // FOOTER: every text and link comes from footer.*
    const footer=q('footer.footer');if(footer){const f=c.footer||{},set=(s,v,html)=>{const el=q(s,footer);if(el&&v!=null&&v!=='')html?el.innerHTML=lines(v):el.textContent=v};
      set('.footer-top .mono',f.brand);set('.footer-top h3',f.description,1);set('.footer-top p.copy',f.tagline,1);
      set('.footer-word',f.bigWord||f.brand);
      const bs=qa('.footer-bottom span',footer);if(bs[0]&&f.copyright)bs[0].textContent=f.copyright;if(bs[1]&&f.note!=null)bs[1].textContent=f.note;
      const box=q('.footer-links',footer);if(box&&Array.isArray(f.links))box.innerHTML=f.links.filter(x=>x&&x.label&&x.visible!==false).map((it,i)=>'<a href="'+E(link(it.href||'#'))+'"'+(ext(it.href)?' target="_blank" rel="noopener"':'')+'><span>'+E(it.label)+'</span><span>'+(/^#./.test(it.href||'')?String(i+1).padStart(2,'0'):'↗')+'</span></a>').join('');
      if(f.visible===false)footer.style.display='none';
    }

  }catch(e){console.warn('CMS Full runtime:',e)}
})();
