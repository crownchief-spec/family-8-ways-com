#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { loadSiteConfig, renderPage, escapeHtml } from './render.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const cfg = loadSiteConfig();
const dataPath = join(ROOT, 'data', 'family-migration-runtime.json');
if (!existsSync(dataPath)) throw new Error('請先執行 node scripts/migrate-family-from-wix.mjs');
const pages = JSON.parse(readFileSync(dataPath, 'utf8'));
const pageMap = new Map(pages.map((p) => [p.id, p]));
const siteUrl = cfg.site.url;

function ensureDir(p) { mkdirSync(p, { recursive: true }); }
function writeRoute(route, html) {
  const clean = route.replace(/^\/+/, '');
  if (!clean) return writeFileSync(join(ROOT, 'index.html'), html, 'utf8');
  const dir = join(ROOT, clean);
  ensureDir(dir);
  writeFileSync(join(dir, 'index.html'), html, 'utf8');
}
function bread(route, title) {
  const bits = route.split('/').filter(Boolean);
  let acc = '';
  const links = ['<a href="/">首頁</a>'].concat(bits.map((b) => { acc += `/${b}`; return `<a href="${acc}/">${escapeHtml(b)}</a>`; }));
  return `<nav class="container section" style="padding-bottom:0;font-size:0.9rem;"><div class="muted">${links.join(' / ')} / <span>${escapeHtml(title)}</span></div></nav>`;
}
function statsRow(p) {
  return `<p class="container section muted" style="padding-top:0;">本頁作品照片：${p.images.length} 張｜影片：${p.videos.length} 支</p>`;
}
function gallery(p) {
  if (!p.images.length) return '<p class="muted">目前未抓到圖片，已標記待補件。</p>';
  return `<div class="gallery">${p.images.map((img, i) => `<figure class="gallery__item"><img loading="lazy" src="${img.src}" alt="${escapeHtml(p.newTitle)}｜親子寫真｜家庭攝影｜小巴老師｜第 ${i + 1} 張" width="1200" height="800"/></figure>`).join('')}</div>`;
}
function videoBlock(p) {
  if (!p.videos.length) return '<p class="muted">本頁暫無影片，請參考首頁精選影片。</p>';
  return `<div class="grid-2">${p.videos.map((v) => `<div style="aspect-ratio:16/9;background:#000;border-radius:10px;overflow:hidden;"><iframe loading="lazy" width="100%" height="100%" src="${escapeHtml(v.embedUrl)}" title="YouTube video" frameborder="0" allowfullscreen></iframe></div>`).join('')}</div>`;
}
function hashtags(p) { return `<p class="container section muted" style="padding-top:0;">${p.hashtags.map((h) => `# ${escapeHtml(h)}`).join(' ')}</p>`; }
function cta() {
  return `<section class="container section card card--flat"><h2 class="h2">想預約親子寫真或家庭攝影嗎？</h2><p class="muted">如果你正在規劃台灣親子旅拍、海外家庭寫真、露營團拍、生日派對或特定主題拍攝，歡迎先告訴我們拍攝地點、日期、家庭成員與想拍的風格，我們可以一起安排最適合的拍攝方式。</p><div class="hero__actions"><a class="btn btn--primary" href="${cfg.site.lineUrl}" target="_blank" rel="noopener noreferrer">LINE 預約諮詢</a><a class="btn btn--secondary" href="/pages/service-flow/">查看服務說明</a><a class="btn btn--secondary" href="/pages/faq/">查看常見問題</a></div></section>`;
}
function related(p) {
  const pool = pages.filter((x) => x.id !== p.id && x.pageType === p.pageType).slice(0, 3);
  return `<section class="container section card card--flat"><h2 class="h2">相關頁面</h2><ul class="prose">${pool.map((x) => `<li><a href="${x.newUrl}/">${escapeHtml(x.newTitle)}</a></li>`).join('')}</ul></section>`;
}

function buildStandardPage(p) {
  const desc = p.paragraphs[0] || `${p.newTitle}｜小巴老師親子寫真`;
  const hero = p.images[0]?.src || '/public/og-default.svg';
  const body = `${bread(p.newUrl, p.newTitle)}
<section class="hero" style="min-height:320px;margin-bottom:0;border-radius:0;"><div class="hero__bg" style="background-image:url('${hero}')"></div><div class="hero__overlay"></div><div class="hero__inner"><h1 class="hero__title">${escapeHtml(p.newTitle)}</h1><p class="hero__sub">${escapeHtml(desc)}</p><div class="hero__actions"><a class="btn btn--primary" href="${cfg.site.lineUrl}" target="_blank" rel="noopener noreferrer">LINE 預約</a><a class="btn btn--secondary" href="/pages/service-flow/">查看服務流程</a></div></div></section>
${statsRow(p)}
<section class="container section prose">${p.paragraphs.slice(0, 20).map((t) => `<p>${escapeHtml(t)}</p>`).join('')}</section>
<section class="container section"><h2 class="h2">作品圖庫</h2>${gallery(p)}</section>
<section class="container section"><h2 class="h2">影片</h2>${videoBlock(p)}</section>
${related(p)}
${cta()}
${hashtags(p)}`;
  const html = renderPage(cfg, { title: `${p.newTitle}｜小巴老師親子寫真`, description: desc.slice(0, 150), canonical: `${siteUrl}${p.newUrl}/`, body, ogImage: hero });
  return p.id === 'faq'
    ? html.replace('</head>', `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: p.paragraphs.slice(0, 12).map((q, i) => ({ '@type': 'Question', name: `常見問題 ${i + 1}`, acceptedAnswer: { '@type': 'Answer', text: q } })) })}</script>\n</head>`)
    : html;
}

function buildHome() {
  const p = pageMap.get('home');
  const body = `<section class="hero" style="min-height:420px;margin-bottom:0;border-radius:0;"><div class="hero__bg" style="background-image:url('${p.images[0]?.src || '/public/og-default.svg'}')"></div><div class="hero__overlay"></div><div class="hero__inner"><h1 class="hero__title">親子寫真｜台灣包車、海外旅拍、家庭攝影作品集</h1><p class="hero__sub">小巴老師以全外拍自然互動風格，陪家庭邊玩邊拍。從台灣包車旅拍到日本、韓國、新加坡、澳洲等海外親子寫真，讓家庭照像風景明信片一樣自然、有故事。</p><div class="hero__actions"><a class="btn btn--primary" href="/pages/service-flow/">查看服務流程與價格</a><a class="btn btn--secondary" href="/taiwan/taipei/">看台灣拍攝作品</a><a class="btn btn--secondary" href="/overseas/">看海外旅拍作品</a><a class="btn btn--secondary" href="${cfg.site.lineUrl}" target="_blank" rel="noopener noreferrer">LINE 預約諮詢</a></div></div></section>
${statsRow(p)}
<section class="container section"><h2 class="h2">核心賣點</h2><div class="grid-2"><div class="card card--flat"><h3 class="h3">全外拍自然互動風格</h3></div><div class="card card--flat"><h3 class="h3">台灣包車親子旅拍</h3></div><div class="card card--flat"><h3 class="h3">50 趟以上海外旅拍</h3></div><div class="card card--flat"><h3 class="h3">照片全給 / 微電影 MV</h3></div></div></section>
<section class="container section"><h2 class="h2">精選影片</h2>${videoBlock(p)}<p><a href="https://www.youtube.com/playlist?list=PLlcWeCGlTvTTEDlFy5fNEjOKzUt5gBzVM" target="_blank" rel="noopener noreferrer">查看更多親子旅拍影片</a></p></section>
<section class="container section"><h2 class="h2">價格與方案摘要</h2><div class="prose"><p>台灣旅拍：半天 $5800–8300、全天 $14800。海外旅拍：一日攝影費 $14800，第二日 $9800，攝影師機票費用八折優惠。成品照片檔案全給，可搭配微電影 MV。</p></div></section>
<section class="container section card card--flat"><h2 class="h2">入口導覽</h2><ul class="prose"><li><a href="/taiwan/taipei/">台灣拍攝地區</a></li><li><a href="/overseas/">海外旅拍地區</a></li><li><a href="/themes/">主題分類</a></li><li><a href="/works/">作品案例</a></li><li><a href="/client/">客戶專區</a></li><li><a href="/pages/reviews/">爸媽推薦</a></li><li><a href="/pages/faq/">常見問題</a></li><li><a href="/pages/about-ba-wei/">關於小巴老師</a></li></ul></section>
${cta()}
${hashtags(p)}`;
  return renderPage(cfg, {
    title: '親子寫真｜台灣包車、海外旅拍、家庭攝影作品集｜小巴老師',
    description: '小巴老師以全外拍自然互動風格，提供台灣包車親子旅拍與海外家庭攝影。照片全給，可搭配微電影 MV。',
    canonical: `${siteUrl}/`,
    body,
    ogImage: p.images[0]?.src || '/public/og-default.svg',
  });
}

function buildIndexPage(id, title, intro, filterFn) {
  const rows = pages.filter(filterFn);
  const cards = rows.map((p) => `<a class="pcard" href="${p.newUrl}/"><div class="pcard__media"><img src="${p.images[0]?.src || '/public/og-default.svg'}" alt="${escapeHtml(p.newTitle)}" loading="lazy" width="640" height="420"></div><div class="pcard__body"><h3 class="pcard__title">${escapeHtml(p.newTitle)}</h3><p class="muted">照片 ${p.images.length} 張｜影片 ${p.videos.length} 支</p></div></a>`).join('');
  const body = `${bread(id, title)}<section class="container section"><h1 class="h1">${escapeHtml(title)}</h1><p class="muted">${escapeHtml(intro)}</p></section><p class="container section muted" style="padding-top:0;">本頁作品照片：${rows.reduce((a,b)=>a+b.images.length,0)} 張｜影片：${rows.reduce((a,b)=>a+b.videos.length,0)} 支</p><section class="container section" style="padding-top:0;"><div class="grid-2">${cards}</div></section>${cta()}${hashtags({ hashtags: ['親子寫真', '家庭攝影', '小巴老師'] })}`;
  return renderPage(cfg, { title: `${title}｜小巴老師親子寫真`, description: intro, canonical: `${siteUrl}${id}/`, body, ogImage: rows[0]?.images[0]?.src || '/public/og-default.svg' });
}

const rendered = [];
for (const p of pages) {
  if (p.id === 'home') continue;
  if (p.id === 'works' || p.id === 'client' || p.id === 'overseas-index' || p.id === 'themes-index') continue;
  writeRoute(p.newUrl, buildStandardPage(p));
  rendered.push(p.newUrl);
}
writeRoute('/', buildHome());
writeRoute('/overseas', buildIndexPage('/overseas', '海外旅拍', '日本、韓國、新加坡、澳洲等地區的親子旅拍作品整理。', (p) => p.pageType === 'overseas' && p.id !== 'overseas-index'));
writeRoute('/themes', buildIndexPage('/themes', '主題分類', '依拍攝風格與情境瀏覽完整親子寫真作品。', (p) => p.pageType === 'theme' && p.id !== 'themes-index'));
writeRoute('/works', buildIndexPage('/works', '作品案例 Works', '台灣拍攝、海外旅拍與主題分類作品案例總覽。', (p) => ['taiwan', 'overseas', 'theme'].includes(p.pageType)));
writeRoute('/client', renderPage(cfg, { title: '客戶專區｜親子寫真專屬相簿入口｜小巴老師', description: '已完成拍攝的家庭，可輸入密碼觀看專屬相簿。', canonical: `${siteUrl}/client/`, body: `<section class="container section"><h1 class="h1">客戶專區</h1><p class="muted">已完成拍攝的家庭，可由這裡輸入密碼觀看專屬相簿。若忘記密碼，請直接 Line 小巴老師。</p></section><p class="container section muted" style="padding-top:0;">本頁作品照片：1 張｜影片：0 支</p><section class="container section" style="padding-top:0;"><form class="card card--flat" style="max-width:520px;"><label class="field"><span class="muted">相簿密碼</span><input type="password" placeholder="請輸入密碼" /></label><button type="button" class="btn btn--primary">進入相簿</button><p class="muted">Demo 相簿：親子寫真客戶專屬相簿 Demo（2026-04）</p><img src="/public/og-default.svg" alt="客戶專區 demo cover" width="1200" height="630" loading="lazy"/></form></section>${cta()}${hashtags({ hashtags: ['客戶專區', '親子寫真相簿', '家庭攝影', '小巴老師'] })}`, ogImage: '/public/og-default.svg' }));

const redirects = [
  '/family-taipei /taiwan/taipei 301', '/family-studio /taiwan/studio 301', '/family-tamsui /taiwan/tamsui 301',
  '/family-taoyuan /taiwan/taoyuan 301', '/family-hsinchu /taiwan/hsinchu 301', '/family-taichung /taiwan/taichung 301',
  '/family-yilan /taiwan/yilan 301', '/family-penghu /taiwan/penghu 301', '/family-camping /taiwan/camping 301',
  '/family-birthday /taiwan/birthday 301', '/family-railway /taiwan/railway 301', '/family-farm /taiwan/farm 301',
  '/family-japan-winter /overseas/japan-winter 301', '/family-hokkaido /overseas/hokkaido 301', '/family-okinawa /overseas/okinawa 301',
  '/family-tokyo /overseas/tokyo 301', '/family-kansai /overseas/kansai 301', '/family-southeast-asia /overseas/cebu-bali 301',
  '/family-australia /overseas/australia 301', '/family-korea /overseas/korea 301', '/family-generation /themes/generation 301',
  '/maternity /themes/maternity 301', '/family-faq /pages/faq 301', '/family-reviews /pages/reviews 301',
];
writeFileSync(join(ROOT, 'public', '_redirects'), redirects.join('\n') + '\n', 'utf8');
writeFileSync(join(ROOT, '_redirects'), redirects.join('\n') + '\n', 'utf8');

const urls = new Set(['/','/overseas','/themes','/works','/client', ...rendered]);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls].map((u) => `<url><loc>${escapeHtml(`${siteUrl}${u}/`.replace(/\/+$/, '/'))}</loc><changefreq>weekly</changefreq></url>`).join('\n')}\n</urlset>`;
writeFileSync(join(ROOT, 'sitemap.xml'), sitemap, 'utf8');
console.log(`family migration pages rendered: ${urls.size}`);
