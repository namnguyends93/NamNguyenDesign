/* Nam Nguyen Design CMS runtime — shared by server.js (local) and build.js (static) */
(async function(){
  // Base URL of the site (works on localhost:3000 and on GitHub Pages sub-paths)
  const BASE=(document.currentScript&&document.currentScript.src)?new URL(".",document.currentScript.src).href:location.origin+"/";
  try{
    const raw=await (await fetch(BASE+"content.json",{cache:"no-store"})).json();
    // Rewrite root-absolute paths like /uploads/x.jpg so they resolve under BASE
    const fix=v=>typeof v==="string"?(/^\/(uploads|projects)\//.test(v)?BASE+v.slice(1):v):Array.isArray(v)?v.map(fix):(v&&typeof v==="object")?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,fix(x)])):v;
    const c=fix(raw);
    const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
    const txtNodes=()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const a=[];let n;while(n=w.nextNode())a.push(n);return a};
    const replaceExact=(from,to,all=false)=>{if(to===undefined||to===null||!from)return;let done=false;for(const n of txtNodes()){if((n.nodeValue||'').trim()===String(from).trim()){n.nodeValue=String(to);done=true;if(!all)break}}return done};
    const hideByIdOrText=(id,text,visible)=>{if(visible!==false)return;const el=q('#'+id)||qa('section,header,footer,div').find(x=>(x.textContent||'').includes(text));if(el)el.style.display='none'};

    document.title=c.site?.seoTitle||document.title;
    let meta=q('meta[name="description"]');if(meta&&c.site?.seoDescription)meta.content=c.site.seoDescription;
    if(c.site?.accent)document.documentElement.style.setProperty('--accent',c.site.accent);

    // NAV
    replaceExact('Nam Nguyen Design',c.navigation?.brand||c.site?.name,true);
    const navLinks=qa('nav a, header a');
    (c.navigation?.items||[]).filter(x=>x.visible!==false).forEach((it,i)=>{if(navLinks[i]){navLinks[i].textContent=it.label;navLinks[i].href=it.href}});
    if(c.navigation?.visible===false){const nav=q('nav')||q('header');if(nav)nav.style.display='none'}

    // HERO
    replaceExact('Independent Visual Designer',c.home?.hero?.eyebrow);
    replaceExact('Selected Work.26',c.home?.hero?.indexLabel);
    replaceExact('Nam Nguyen Design',c.home?.hero?.title);
    replaceExact('NAM NGUYEN DESIGN',(c.home?.hero?.title||'').toUpperCase());
    replaceExact('Brand identities, campaign visuals and digital experiences built with clarity, edge and intent.',c.home?.hero?.description);
    if(c.home?.hero?.image){const hero=q('.hero img')||q('[class*="hero"] img')||q('main img');if(hero)hero.src=c.home.hero.image}
    hideByIdOrText('home','Independent Visual Designer',c.home?.hero?.visible);

    // INTRO / CLEAR IDEAS
    replaceExact('Visual Designer / Art Direction',c.home?.intro?.eyebrow);
    replaceExact('Clear ideas. Bold visual direction.',c.home?.intro?.title);
    if(c.home?.intro?.description)replaceExact('',c.home.intro.description);
    const serviceText=['Brand Identity','Campaign Design','Art Direction'];
    (c.home?.intro?.services||[]).forEach((v,i)=>{if(serviceText[i])replaceExact(serviceText[i],v)});
    if(c.home?.intro?.location)replaceExact('Ho Chi Minh City, Vietnam',c.home.intro.location);
    if(c.home?.intro?.image){const imgs=qa('img');const target=imgs.find(x=>/PWNFx|intro|about/i.test(x.src||''))||imgs[1];if(target)target.src=c.home.intro.image}
    hideByIdOrText('intro','Clear ideas. Bold visual direction.',c.home?.intro?.visible);

    // ABOUT
    replaceExact('Profile.26',c.home?.about?.eyebrow);
    replaceExact('About',c.home?.about?.title);
    replaceExact('Nam Nguyen Design is an independent visual design practice focused on brand identity, campaign systems and art direction. Every project is shaped around a clear idea, a strong visual point of view and execution that feels precise, contemporary and memorable.',c.home?.about?.description);
    if(c.home?.about?.image){const imgs=qa('img');const target=imgs.find(x=>/7bhFM|about/i.test(x.src||''))||imgs[2];if(target)target.src=c.home.about.image}
    hideByIdOrText('about','Profile.26',c.home?.about?.visible);

    // CLIENTS
    replaceExact('Selected Clients',c.home?.clients?.eyebrow);
    replaceExact('Clients',c.home?.clients?.title);
    const clientItems=(c.home?.clients?.items||[]).filter(x=>x.visible!==false);
    const clientHost=q('.clients-marquee')||q('[class*="client"]');
    if(clientHost&&clientItems.length){
      const candidates=qa('a,span,div',clientHost).filter(el=>el.children.length===0&&(el.textContent||'').trim().length>1);
      clientItems.forEach((it,i)=>{if(candidates[i]){candidates[i].textContent=it.name;if(candidates[i].tagName==='A'&&it.href)candidates[i].href=it.href}});
    }
    hideByIdOrText('clients','Selected Clients',c.home?.clients?.visible);

    // PROJECTS
    replaceExact('Selected Work.26',c.home?.projectsSection?.eyebrow);
    replaceExact('Projects',c.home?.projectsSection?.title);
    replaceExact('Selected identity, campaign and digital projects shaped through concept, art direction and disciplined visual systems.',c.home?.projectsSection?.description);
    const host=q('.project-showcase');let slides=qa('.project-slide');const projects=(c.projects||[]).filter(p=>p.published!==false);
    if(host&&slides.length&&projects.length){
      while(slides.length<projects.length){const cl=slides[0].cloneNode(true);host.appendChild(cl);slides.push(cl)}
      while(slides.length>projects.length){slides.pop().remove()}
      slides.forEach((slide,i)=>{const p=projects[i];const img=q('img',slide);if(img&&p.cover)img.src=p.cover;const a=q('a[href]',slide);if(a)a.href=p.link||(BASE+'projects/'+p.slug+'.html');const titles=qa('h1,h2,h3,h4,strong,[class*="title"]',slide);const te=titles.find(x=>/CAMPAIGN|SYSTEM|PROJECT/i.test(x.textContent||''))||titles[0];if(te&&p.title)te.textContent=p.title;const texts=qa('p,span,small,[class*="category"],[class*="year"]',slide);const cat=texts.find(x=>/BRAND IDENTITY|ART DIRECTION|CAMPAIGN DESIGN/i.test(x.textContent||''));if(cat&&p.category)cat.textContent=p.category;const y=texts.find(x=>/^\s*20\d{2}\s*$/.test(x.textContent||''));if(y&&p.year)y.textContent=p.year});
      if(typeof window.showProject==='function')try{window.showProject(0)}catch(e){}
    }
    hideByIdOrText('projects','Selected Work.26',c.home?.projectsSection?.visible);

    // JOURNAL
    replaceExact('Journal.26',c.home?.journal?.eyebrow);
    replaceExact('Journal',c.home?.journal?.title);
    replaceExact('Notes on visual culture, process and creative direction.',c.home?.journal?.description);
    const journals=(c.home?.journal?.items||[]).filter(x=>x.published!==false);
    const journalHost=q('#journal')||q('[class*="journal"]');
    if(journalHost&&journals.length){
      const cards=qa('article,a,[class*="card"]',journalHost).filter(x=>(x.textContent||'').trim().length>0);
      journals.forEach((j,i)=>{const card=cards[i];if(!card)return;const title=q('h2,h3,h4,[class*="title"]',card);if(title)title.textContent=j.title;const img=q('img',card);if(img&&j.thumbnail)img.src=j.thumbnail;const a=card.tagName==='A'?card:q('a',card);if(a&&j.href)a.href=j.href;const meta=qa('span,small,p',card);const d=meta.find(x=>/20\d{2}/.test(x.textContent||''));if(d&&j.date)d.textContent=j.date});
    }
    hideByIdOrText('journal','Journal.26',c.home?.journal?.visible);

    // CONTACT
    replaceExact('Start a Project.26',c.home?.contact?.eyebrow);
    replaceExact('Get in touch',c.home?.contact?.title);
    replaceExact('If you are building a brand, campaign or visual system and need a clear creative direction, send over the brief. I am open to selected freelance and collaborative projects.',c.home?.contact?.description);
    if(c.home?.contact?.image){const imgs=qa('img');const target=imgs.find(x=>/WDp2|contact/i.test(x.src||''))||imgs.at(-1);if(target)target.src=c.home.contact.image}
    if(c.home?.contact?.email)replaceExact('hello@namnguyen.design',c.home.contact.email,true);
    hideByIdOrText('contact','Start a Project.26',c.home?.contact?.visible);

    // FOOTER
    replaceExact('Independent visual design practice.',c.footer?.description);
    replaceExact('© 2026 Nam Nguyen Design',c.footer?.copyright);
    replaceExact('Nam Nguyen Design',c.footer?.brand,true);
    const footer=q('footer');if(footer){
      const links=qa('a',footer);(c.footer?.links||[]).forEach((it,i)=>{if(links[i]){links[i].textContent=it.label;links[i].href=it.href}});
      if(c.footer?.visible===false)footer.style.display='none';
    }

    // PROJECT DETAIL PAGE
    const m=location.pathname.match(/\/projects\/([^/]+)\.html$/i);
    if(m){
      const slug=decodeURIComponent(m[1]);const p=(c.projects||[]).find(x=>(x.slug||x.id)===slug);
      if(p){
        const titleEls=qa('h1,h2,[class*="title"]');const title=titleEls.find(x=>/CAMPAIGN|SYSTEM|PROJECT/i.test(x.textContent||''))||titleEls[0];if(title&&p.title)title.textContent=p.title;
        const hero=q('.hero-media img')||q('[class*="hero"] img');if(hero&&p.cover)hero.src=p.cover;
        const st=q('.statement p')||q('[class*="statement"] p');if(st&&p.statement)st.textContent=p.statement;
        const gallery=qa('.gallery-item img,[class*="gallery"] img');(p.gallery||[]).forEach((src,i)=>{if(gallery[i])gallery[i].src=src});
        const years=qa('span,p,small').filter(x=>/^\s*20\d{2}\s*$/.test(x.textContent||''));if(years[0]&&p.year)years[0].textContent=p.year;
      }
    }
  }catch(e){console.warn('CMS Full runtime:',e)}
})();
