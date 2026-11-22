// Build-time SEO only: the deployed HTML contains all metadata without client-side JS.
import {readFileSync,writeFileSync,readdirSync,existsSync,cpSync,mkdirSync,statSync} from 'node:fs';
import {resolve,dirname,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const R=resolve(dirname(fileURLToPath(import.meta.url)),'..'),D=join(R,'dist');
const cfg=JSON.parse(readFileSync(join(R,'content/seo/site.json'),'utf8'));
const overrides=JSON.parse(readFileSync(join(R,'content/seo/page-overrides.json'),'utf8'));
const E=s=>String(s??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const decode=s=>String(s??'').replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>');
const plain=s=>decode(String(s).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
const meta=(h,key)=>decode((h.match(new RegExp('<meta\\b(?=[^>]*(?:name|property)=["\\\']'+key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'["\\\'])[^>]*content=["\\\']([^"\\\']*)','i'))||[])[1]||'');
function setMeta(h,key,value,prop=false){const re=new RegExp('<meta\\b(?=[^>]*(?:name|property)=["\\\']'+key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'["\\\'])[^>]*>','ig');h=h.replace(re,'');return h.replace('</head>',`<meta ${prop?'property':'name'}="${E(key)}" content="${E(value)}">\n</head>`)}
function link(h,rel,href,attrs=''){const re=new RegExp('<link\\b(?=[^>]*rel=["\\\']'+rel+'["\\\'])[^>]*>','ig');return h.replace(re,'').replace('</head>',`<link rel="${rel}" href="${E(href)}"${attrs?' '+attrs:''}>\n</head>`)}
function files(p){return readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(p,e.name)):e.name.endsWith('.html')?[join(p,e.name)]:[])}
const redirectMap=new Map((existsSync(join(D,'_redirects'))?readFileSync(join(D,'_redirects'),'utf8'):'').split('\n').filter(l=>l.trim()&&!l.startsWith('#')).map(l=>l.trim().split(/\s+/)).filter(a=>a[0]&&!a[0].includes('*')).map(a=>[a[0].replace(/\/$/,''),a[1]]));
function resolveLink(u){for(let i=0;i<8;i++){const next=redirectMap.get(u.replace(/\/$/,''));if(!next||next===u)break;u=next;}if(u.startsWith('/')&&existsSync(join(D,u,'index.html'))&&!u.endsWith('/'))u+='/';return u;}
const rows=[];const usedDescriptions=new Set();mkdirSync(join(D,'assets/seo'),{recursive:true});cpSync(join(R,'content/seo-assets'),join(D,'assets/seo'),{recursive:true});
for(const n of ['favicon.ico','favicon.svg','apple-touch-icon.png'])cpSync(join(R,'content/seo-assets',n),join(D,n));
writeFileSync(join(D,'site.webmanifest'),JSON.stringify({name:cfg.brand,short_name:'小巴老師',lang:'zh-Hant-TW',start_url:'/',scope:'/',display:'standalone',background_color:'#fbfaf7',theme_color:cfg.color,icons:[{src:'/assets/seo/icon-192.png',sizes:'192x192',type:'image/png'},{src:'/assets/seo/icon-512.png',sizes:'512x512',type:'image/png'}]},null,2));
for(const f of files(D)){
 let h=readFileSync(f,'utf8');
 if(!/<head\b/i.test(h)){const a=h.match(/<html\b[^>]*>/i);const i=h.indexOf('<main');if(a&&i>0){const end=a.index+a[0].length;h=h.slice(0,end)+'<head>'+h.slice(end,i)+'</head><body>'+h.slice(i).replace('</html>','</body></html>');}}
 h=h.replace(/(<a\b[^>]*href=["'])(\/[^"'#?]*)(["'])/ig,(_,a,u,b)=>a+resolveLink(u)+b);
 const headingTags=[...h.matchAll(/<h([1-6])\b/ig)];const firstH1=headingTags.find(x=>x[1]==='1'),firstAfter=firstH1&&headingTags.find(x=>x.index>firstH1.index);
 if(firstAfter&&Number(firstAfter[1])>2){const start=h.lastIndexOf('<div class="grid',firstAfter.index);if(start>firstH1.index){const label=h.includes('data-video-id')?'作品與影片列表':'分類與作品列表';h=h.slice(0,start)+`<h2 style="font-size:1.45rem;margin:28px 0">${label}</h2>`+h.slice(start);}}
const rel=relative(D,f).replaceAll('\\','/'),route=rel==='index.html'?'/':rel.endsWith('/index.html')?'/'+rel.slice(0,-10):'/'+rel;
 const o=overrides[route]||{},title=o.title||plain((h.match(/<title>([\s\S]*?)<\/title>/i)||[])[1])||cfg.brand;
 const h1=plain((h.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||title),descriptionBase=o.description||meta(h,'description')||`${h1}，查看小巴老師的攝影作品與服務資訊。`;
 let description=descriptionBase;if(usedDescriptions.has(description))description=h1+'：'+description;usedDescriptions.add(description);
 const canonical=o.canonical||cfg.url+route;
 const noindex=o.noindex===true||meta(h,'robots').includes('noindex')||route==='/404.html'||/^\/(admin|clients?|family-contract|privacy)(\/|$)/.test(route);
 let image=o.ogImage||meta(h,'og:image');if(image.startsWith('/'))image=cfg.url+image;
 const oldImage=meta(h,'og:image'),isArticle=/^\/(articles|guides)\/[^/]+\/$/.test(route),type=isArticle?'article':'website';
 h=h.replace(/<title>[\s\S]*?<\/title>/i,`<title>${E(title)}</title>`);h=h.replace(/<html\b([^>]*)>/i,(_,a)=>`<html${a.replace(/\s+lang=["'][^"']*["']/i,'')} lang="zh-Hant-TW">`);
 h=link(h,'canonical',canonical);
 for(const [k,v] of Object.entries({'description':description,'twitter:card':'summary_large_image','twitter:title':title,'twitter:description':description,'twitter:image':image,'twitter:image:alt':h1+'｜小巴老師攝影','theme-color':cfg.color,'robots':noindex?'noindex,follow,noarchive':'index,follow,max-image-preview:large'}))h=setMeta(h,k,v);
 for(const [k,v] of Object.entries({'og:type':type,'og:title':title,'og:description':description,'og:url':canonical,'og:site_name':cfg.brand,'og:locale':'zh_TW','og:image':image,'og:image:secure_url':image,'og:image:type':'image/jpeg','og:image:width':1200,'og:image:height':630,'og:image:alt':h1+'｜小巴老師攝影'}))h=setMeta(h,k,v,true);
 h=link(h,'icon','/favicon.svg','type="image/svg+xml"');h=h.replace('</head>','<link rel="icon" href="/favicon.ico" sizes="any">\n</head>');h=link(h,'apple-touch-icon','/apple-touch-icon.png','sizes="180x180"');h=link(h,'manifest','/site.webmanifest');
 const graphs=[];for(const m of h.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/ig)){try{const x=JSON.parse(m[1]);graphs.push(...(x['@graph']||[x]));}catch{throw new Error('Invalid existing schema: '+route)}}
 for(let i=graphs.length-1;i>=0;i--)if([].concat(graphs[i]['@type']||[]).includes('FAQPage'))graphs.splice(i,1);
 const has=t=>graphs.some(x=>[].concat(x['@type']||[]).includes(t));const organization={'@type':'Organization','@id':cfg.url+'/#organization',name:'八威創意有限公司｜小巴老師攝影',url:cfg.url,telephone:'+886911252302',email:'crownchief@gmail.com',taxID:'86936915'};
 if(!has('Organization'))graphs.push(organization);
 if(!has('WebSite'))graphs.push({'@type':'WebSite','@id':cfg.url+'/#website',name:cfg.brand,url:cfg.url,inLanguage:'zh-Hant-TW'});
 for(let i=graphs.length-1;i>=0;i--)if([].concat(graphs[i]['@type']||[]).includes('WebPage'))graphs.splice(i,1);
 graphs.push({'@type':'WebPage','@id':canonical+'#webpage',url:canonical,name:title,description,inLanguage:'zh-Hant-TW',isPartOf:{'@id':cfg.url+'/#website'},primaryImageOfPage:{'@type':'ImageObject',contentUrl:image,url:image,width:1200,height:630,caption:h1}});
 if(/^\/(services|categories)\//.test(route)&&!has('Service'))graphs.push({'@type':'Service',name:h1,description,url:canonical,provider:{'@id':cfg.url+'/#organization'}});
 if(o.schemaType&&!has(o.schemaType))graphs.push({'@type':o.schemaType,name:h1,description,url:canonical});
 if(o.schema)graphs.push(o.schema);
 if(isArticle&&!has('Article')&&!has('BlogPosting'))graphs.push({'@type':'Article',headline:h1,description,mainEntityOfPage:canonical,image,author:{'@type':'Person',name:'小巴老師 Benson Chen'}});
 if(route!=='/'&&!has('BreadcrumbList')&&!noindex)graphs.push({'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'首頁',item:cfg.url+'/'},{'@type':'ListItem',position:2,name:h1,item:canonical}]});
 const faq=[...h.matchAll(/<details\b[^>]*>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/ig)].filter(m=>!m[2].includes('<nav')).map(m=>({q:plain(m[1]),a:plain(m[2])})).filter(x=>x.q&&x.a);
 if(faq.length&&!has('FAQPage'))graphs.push({'@type':'FAQPage',mainEntity:faq.map(x=>({'@type':'Question',name:x.q,acceptedAnswer:{'@type':'Answer',text:x.a}}))});
 h=h.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/ig,'');h=h.replace('</head>',`<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':graphs}).replaceAll('<','\\u003c')}</script>\n<!-- Analytics insertion point: set the verified GA4/GTM ID in content/seo/site.json before enabling tracking. -->\n</head>`);
 // Metadata and Organization may never identify the two anonymized sports-day clients.
 if(/富邦|華碩|asus|fubon/i.test(h))throw new Error('Restricted company name remains in '+route);
 writeFileSync(f,h);
 rows.push({pageFile:'dist/'+rel,route,url:cfg.url+route,title,description,canonical,heroImage:o.heroImage||null,ogImage:image,schemaType:[...new Set(graphs.flatMap(x=>[].concat(x['@type']||[])))],noindex,ogImageNote:o.imageNote||null,wordCount:plain(h.replace(/<head>[\s\S]*?<\/head>/i,'')).length});
}
const live=rows.filter(x=>!x.noindex);writeFileSync(join(D,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${live.map(x=>`<url><loc>${E(x.canonical)}</loc></url>`).join('')}</urlset>`);
writeFileSync(join(D,'robots.txt'),`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /clients/\nDisallow: /family-contract/\nSitemap: ${cfg.url}/sitemap.xml\n`);
writeFileSync(join(D,'llms.txt'),`# ${cfg.brand}\n\n${cfg.summary}\n\n## 主要內容\n\n${live.filter(x=>x.route.split('/').filter(Boolean).length<2).map(x=>`- [${x.title}](${x.url}): ${x.description}`).join('\n')}\n\n## 聯絡攝影師\n小巴老師 Benson Chen，八威創意有限公司。電話／LINE：0911252302；E-mail：crownchief@gmail.com。\n`);
mkdirSync(join(R,'reports'),{recursive:true});writeFileSync(join(R,'reports/seo-maintenance.json'),JSON.stringify({site:cfg.url,brand:cfg.brand,pages:rows,todos:{localBusiness:'TODO：缺少已確認可公開的營業地址及 Google 商家檔案資料，不捏造 LocalBusiness 地址。',analytics:cfg.analyticsId||'TODO：待確認既有 GA4／GTM 資產與追蹤 ID。',performance:'TODO：部署後由 Search Console／PageSpeed 檢查真實 Core Web Vitals。'},similarPages:'分類頁與服務頁保留各自用途、標題與 self-canonical；既有入口以 301 規則銜接。'},null,2));
console.log(JSON.stringify({site:cfg.url,htmlPages:rows.length,indexable:live.length,uniqueSocialImages:new Set(rows.map(x=>x.ogImage)).size}));
