import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE='https://floydskd-netizen.github.io/la-trama-publica/';
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s.replace(/\r?\n/g,'\n'),'utf8')};
const esc=s=>String(s??'').replace(/[<>&'\"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','\"':'&quot;'}[c]));
const attr=(h,n)=>h.match(new RegExp(`${n}="([^"]+)"`,'i'))?.[1]||'';
const meta=(h,k,n)=>h.match(new RegExp(`<meta\\s+${k}="${n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"\\s+content="([^"]*)"\\s*\\/?>`,'i'))?.[1]||'';
const canonical=h=>h.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1]||'';
const jsonld=h=>{const m=h.match(/<script\s+type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/i);if(!m)return null;try{return JSON.parse(m[1])}catch{return null}};
const key=h=>h.match(/data-article-key="([^"]+)"/i)?.[1]||'';
const lang=h=>attr(h.match(/<html\b[^>]*>/i)?.[0]||'','lang');
const walk=d=>fs.existsSync(d)?fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):e.name==='index.html'?[path.join(d,e.name)]:[]):[];
const articleFiles=[...walk(path.join(ROOT,'notas')).filter(p=>path.dirname(p)!==path.join(ROOT,'notas')),...walk(path.join(ROOT,'en','notas')).filter(p=>path.dirname(p)!==path.join(ROOT,'en','notas'))];

const enInfo={
 'netanyahu-israel-isolation':{key:'netanyahu-israel-aislamiento',date:'2026-09-25',title:'Has Netanyahu become a major problem for Israel?',desc:'Israel faces real threats. It also faces growing diplomatic isolation. How much is unavoidable, and how much reflects the decisions of its government?',image:SITE+'assets/social/netanyahu-israel-aislamiento.png',es:SITE+'notas/netanyahu-israel-aislamiento/'},
 'trump-carlson-democracia-milei':{key:'trump-carlson-democracia-milei',date:'2026-09-25',title:'When people who were close to Trump begin warning about him',desc:'Carlson, Kelly, Mattis, Pence, Bolton and Sachs arrive from different directions at the same question about power, limits and consequences.',image:SITE+'assets/social/trump-carlson-democracia-milei.png',es:SITE+'notas/trump-carlson-democracia-milei/'}
};
for(const f of articleFiles){
 let h=read(f), l=lang(h), c=canonical(h);
 if(l.startsWith('en')){
   const slug=path.basename(path.dirname(f)), x=enInfo[slug]; if(!x)throw Error('Missing EN metadata '+slug);
   if(!meta(h,'name','author')) h=h.replace(/<link rel="stylesheet"/,`<meta name="author" content="La Trama Pública">\n<meta property="og:locale" content="en_US">\n<meta property="article:published_time" content="${x.date}">\n<script type="application/ld+json">\n${JSON.stringify({"@context":"https://schema.org","@type":"Article",headline:x.title,description:x.desc,image:[x.image],datePublished:x.date,inLanguage:"en-US",mainEntityOfPage:{"@type":"WebPage","@id":c},author:{"@type":"Organization",name:"La Trama Pública",url:SITE},publisher:{"@type":"Organization",name:"La Trama Pública",logo:{"@type":"ImageObject",url:SITE+"assets/branding/tp-mark.png"}}},null,2)}\n</script>\n<link rel="stylesheet"`);
 }
 const k=key(h), ld=jsonld(h); if(!k||!c||!meta(h,'name','description')||!meta(h,'property','og:title')||!meta(h,'name','twitter:card')||!meta(h,'name','author')||!ld?.datePublished) throw Error('Discovery metadata incomplete: '+path.relative(ROOT,f));
 if(!/rel="alternate"\s+type="application\/rss\+xml"/i.test(h)) h=h.replace(/<\/head>/i,`<link rel="alternate" type="application/rss+xml" title="La Trama Pública" href="${SITE}rss.xml">\n</head>`);
 write(f,h);
}const pairs=[
 [SITE+'notas/netanyahu-israel-aislamiento/',SITE+'en/notas/netanyahu-israel-isolation/'],
 [SITE+'notas/trump-carlson-democracia-milei/',SITE+'en/notas/trump-carlson-democracia-milei/']
];
for(const [es,en] of pairs)for(const f of articleFiles){let h=read(f),c=canonical(h);if(c!==es&&c!==en)continue;const alt=`<link rel="alternate" hreflang="es-AR" href="${es}">\n<link rel="alternate" hreflang="en-US" href="${en}">\n<link rel="alternate" hreflang="x-default" href="${es}">`;if(!/hreflang="es-AR"/.test(h)){h=h.replace(/<\/head>/i,alt+'\n</head>');write(f,h)}}

const recs=articleFiles.map(f=>{const h=read(f),ld=jsonld(h);return{file:f,key:key(h),lang:lang(h),url:canonical(h),title:meta(h,'property','og:title'),desc:meta(h,'property','og:description')||meta(h,'name','description'),image:meta(h,'property','og:image'),date:ld.datePublished,modified:ld.dateModified||ld.datePublished}}).sort((a,b)=>b.date.localeCompare(a.date)||a.url.localeCompare(b.url));
const staticUrls=[SITE,SITE+'notas/',SITE+'privacidad/',SITE+'en/',SITE+'en/notas/',SITE+'en/privacy/'];
const alts=u=>{const p=pairs.find(x=>x.includes(u));return p?`\n    <xhtml:link rel="alternate" hreflang="es-AR" href="${esc(p[0])}"/>\n    <xhtml:link rel="alternate" hreflang="en-US" href="${esc(p[1])}"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(p[0])}"/>`:''};
write(path.join(ROOT,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${[...staticUrls.map(u=>({url:u})),...recs.map(r=>({url:r.url,lastmod:r.modified}))].map(x=>`  <url>\n    <loc>${esc(x.url)}</loc>${x.lastmod?`\n    <lastmod>${x.lastmod}</lastmod>`:''}${alts(x.url)}\n  </url>`).join('\n')}\n</urlset>\n`);
const today=new Date();today.setUTCHours(0,0,0,0);const news=recs.filter(r=>(today-new Date(r.date+'T00:00:00Z'))/86400000<=2);
write(path.join(ROOT,'news-sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${news.map(r=>`  <url><loc>${esc(r.url)}</loc><news:news><news:publication><news:name>La Trama Pública</news:name><news:language>${r.lang.startsWith('en')?'en':'es'}</news:language></news:publication><news:publication_date>${r.date}</news:publication_date><news:title>${esc(r.title)}</news:title></news:news></url>`).join('\n')}\n</urlset>\n`);
const pubs=JSON.parse(read(path.join(ROOT,'data','publications.json')));
const latest=[...pubs].sort((a,b)=>b.date.localeCompare(a.date))[0]?.date||'2026-09-25';
write(path.join(ROOT,'rss.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>La Trama Pública</title><link>${SITE}</link><description>Noticias, documentos y debate ciudadano.</description><language>es-AR</language><lastBuildDate>${new Date(latest+'T12:00:00-03:00').toUTCString()}</lastBuildDate>${pubs.map(p=>{const r=recs.find(x=>x.url===SITE+p.href),u=SITE+p.href;return`<item><title>${esc(p.title)}</title><link>${u}</link><guid isPermaLink="true">${u}</guid><pubDate>${new Date(p.date+'T12:00:00-03:00').toUTCString()}</pubDate><description>${esc(p.summary)}</description>${r?.image?`<media:content url="${esc(r.image)}" medium="image"/>`:''}</item>`}).join('')}</channel></rss>\n`);
write(path.join(ROOT,'robots.txt'),`# GitHub Pages project-site copy. Crawlers normally request /robots.txt at the origin root.\nUser-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\nSitemap: ${SITE}news-sitemap.xml\n`);

const utm=(u,source,medium='social',campaign='article_share',content='')=>{const x=new URL(u);x.searchParams.set('utm_source',source);x.searchParams.set('utm_medium',medium);x.searchParams.set('utm_campaign',campaign);if(content)x.searchParams.set('utm_content',content);return x.toString()};
const dist=pubs.map(p=>({slug:p.slug,title:p.title,canonical:SITE+p.href,tracked:{whatsapp:utm(SITE+p.href,'whatsapp','social','article_share',p.slug),x:utm(SITE+p.href,'x','social','article_share',p.slug),telegram:utm(SITE+p.href,'telegram','social','article_share',p.slug),instagram:utm(SITE+p.href,'instagram','social','article_share',p.slug),newsletter:utm(SITE+p.href,'newsletter','email','article_digest',p.slug),reddit:utm(SITE+p.href,'reddit','social','article_share',p.slug)},copy:{whatsapp:`${p.title}\n\n${p.summary}\n\n${utm(SITE+p.href,'whatsapp','social','article_share',p.slug)}`,x:`${p.title}\n\n${utm(SITE+p.href,'x','social','article_share',p.slug)}`,telegram:`${p.title}\n\n${p.summary}\n\nLeer: ${utm(SITE+p.href,'telegram','social','article_share',p.slug)}`,instagram:`${p.title}\n\n${p.summary}\n\nNota completa en La Trama Pública.`,newsletter:`${p.title} — ${p.summary}`,video_script:`${p.title}. ${p.summary} La nota completa, con sus fuentes y contexto, está en La Trama Pública.`}}));
write(path.join(ROOT,'data','distribution.json'),JSON.stringify(dist,null,2)+'\n');
write(path.join(ROOT,'distribution','README.md'),'# Distribution assets\n\nGenerated by `node tools/update-distribution.mjs`. External publishing is always manual/authorized.\n');
for(const d of dist)write(path.join(ROOT,'distribution',d.slug+'.md'),`# ${d.title}\n\nCanonical: ${d.canonical}\n\n## WhatsApp\n${d.copy.whatsapp}\n\n## X\n${d.copy.x}\n\n## Telegram\n${d.copy.telegram}\n\n## Instagram\n${d.copy.instagram}\n\n## Newsletter\n${d.copy.newsletter}\n\n## 30–60 second video script\n${d.copy.video_script}\n\n## Tracked URLs\n${Object.entries(d.tracked).map(([k,v])=>`- ${k}: ${v}`).join('\n')}\n`);

for(const f of walk(ROOT)){if(!f.endsWith('index.html'))continue;let h=read(f);if(!/rel="alternate"\s+type="application\/rss\+xml"/i.test(h)){h=h.replace(/<\/head>/i,`<link rel="alternate" type="application/rss+xml" title="La Trama Pública" href="${SITE}rss.xml">\n</head>`);write(f,h)}}
console.log(`Validated ${recs.length} article pages; generated sitemap, News sitemap (${news.length} URLs), RSS (${pubs.length} items), distribution assets.`);
