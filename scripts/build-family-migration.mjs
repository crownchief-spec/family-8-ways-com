#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { loadSiteConfig, renderPage, escapeHtml } from './render.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const cfg = loadSiteConfig();
const siteUrl = cfg.site.url;

const manifestPath = join(ROOT, 'content', 'family-migration-manifest.json');
const dataPath = join(ROOT, 'content', 'family-migration-data.json');
if (!existsSync(manifestPath) || !existsSync(dataPath)) {
  throw new Error('缺少 family migration data，請先執行 node scripts/import-family-pages.mjs');
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const pageData = JSON.parse(readFileSync(dataPath, 'utf8'));
const dataMap = new Map(pageData.map((p) => [p.id, p]));

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function writeRoute(route, html) {
  const clean = route.replace(/^\/+/, '');
  if (!clean) {
    writeFileSync(join(ROOT, 'index.html'), html, 'utf8');
    return;
  }
  const dir = join(ROOT, clean);
  ensureDir(dir);
  writeFileSync(join(dir, 'index.html'), html, 'utf8');
}

function breadcrumbs(route, title) {
  const parts = route.split('/').filter(Boolean);
  let acc = '';
  const items = ['<a href="/">首頁</a>']
    .concat(parts.map((p) => {
      acc += `/${p}`;
      return `<a href="${acc}/">${escapeHtml(p)}</a>`;
    }))
    .join(' / ');
  return `<nav class="container section" style="padding-bottom:0;font-size:0.9rem;"><div class="muted">${items} / <span>${escapeHtml(title)}</span></div></nav>`;
}

function ctaBlock() {
  return `<section class="container section card card--flat">
  <h2 class="h2">想預約親子寫真或家庭攝影嗎？</h2>
  <p class="muted">如果你正在規劃台灣親子旅拍、海外家庭寫真、露營團拍、生日派對或特定主題拍攝，歡迎先告訴我們拍攝地點、日期、家庭成員與想拍的風格，我們可以一起安排最適合的拍攝方式。</p>
  <div class="hero__actions">
    <a class="btn btn--primary" href="${escapeHtml(cfg.site.lineUrl)}" target="_blank" rel="noopener noreferrer">LINE 預約諮詢</a>
    <a class="btn btn--secondary" href="/family-service/">查看服務說明</a>
    <a class="btn btn--secondary" href="/family-faq/">查看常見問題</a>
  </div>
</section>`;
}

function renderGallery(images, prefix = 'family') {
  if (!images?.length) return '<p class="muted">本頁目前無照片，待補件。</p>';
  const cards = images
    .map(
      (src, idx) =>
        `<figure class="gallery__item"><img src="${escapeHtml(src)}" alt="${escapeHtml(prefix)} 第 ${idx + 1} 張" loading="lazy" width="1200" height="800"/></figure>`,
    )
    .join('');
  return `<p class="muted">本頁收錄 ${images.length} 張照片</p><div class="gallery">${cards}</div>`;
}

function renderVideos(videos) {
  if (!videos?.length) return '<p class="muted">本頁目前無影片。</p>';
  const embeds = videos
    .map((url) => {
      const id = (() => {
        const m1 = url.match(/v=([A-Za-z0-9_-]{6,})/);
        if (m1) return m1[1];
        const m2 = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
        if (m2) return m2[1];
        const m3 = url.match(/embed\/([A-Za-z0-9_-]{6,})/);
        return m3 ? m3[1] : null;
      })();
      if (!id) return '';
      return `<div style="aspect-ratio:16/9;background:#000;border-radius:10px;overflow:hidden;"><iframe loading="lazy" width="100%" height="100%" src="https://www.youtube.com/embed/${escapeHtml(id)}" title="YouTube video" frameborder="0" allowfullscreen></iframe></div>`;
    })
    .filter(Boolean)
    .join('');
  return `<p class="muted">本頁收錄 ${videos.length} 支影片</p><div class="grid-2">${embeds}</div>`;
}

function renderHashtags(tags) {
  return `<p class="container section muted" style="padding-top:0;">${tags.map((t) => `# ${escapeHtml(t)}`).join(' ')}</p>`;
}

function genericPage(p) {
  const title = p.title || p.id;
  const desc = p.paragraphs?.[0] || `${title}｜小巴老師親子寫真`;
  const hero = p.images?.[0] || '/public/og-default.svg';
  const body = `${breadcrumbs(p.new_url, title)}
<section class="hero" style="min-height:320px;margin-bottom:0;border-radius:0;">
<div class="hero__bg" style="background-image:url('${escapeHtml(hero)}')"></div><div class="hero__overlay"></div>
<div class="hero__inner"><h1 class="hero__title">${escapeHtml(title)}</h1><p class="hero__sub">${escapeHtml(desc)}</p></div></section>
<section class="container section prose">${(p.paragraphs || []).slice(0, 12).map((x) => `<p>${escapeHtml(x)}</p>`).join('')}</section>
<section class="container section"><h2 class="h2">作品圖庫</h2>${renderGallery(p.images, title)}</section>
<section class="container section"><h2 class="h2">影片</h2>${renderVideos(p.videos)}</section>
<section class="container section card card--flat"><h2 class="h2">相關頁推薦</h2>
<ul class="prose"><li><a href="/family-service/">服務說明</a></li><li><a href="/family-faq/">常見問題</a></li><li><a href="/family-reviews/">爸媽推薦</a></li></ul></section>
${ctaBlock()}
${renderHashtags([title, '親子寫真', '家庭攝影', '外拍', '旅拍', '小巴老師'])}`;
  return renderPage(cfg, {
    title: `${title}｜小巴老師親子寫真`,
    description: desc,
    canonical: `${siteUrl}${p.new_url}/`,
    body,
    ogImage: hero,
  });
}

function homePage(homeData) {
  const hero = homeData.images?.[0] || '/public/og-default.svg';
  const body = `<section class="hero" style="min-height:420px;margin-bottom:0;border-radius:0;">
<div class="hero__bg" style="background-image:url('${escapeHtml(hero)}')"></div><div class="hero__overlay"></div>
<div class="hero__inner"><h1 class="hero__title">親子寫真｜台灣包車、海外旅拍、家庭攝影作品集</h1>
<p class="hero__sub">小巴老師是全外拍親子攝影師，具 50 趟以上海外旅拍經驗，適合喜歡旅行、大自然、邊玩邊拍的家庭。台灣包車與海外旅拍皆可安排，讓家庭照像風景明信片。</p>
<div class="hero__actions"><a class="btn btn--primary" href="/family-service/">查看服務方案</a><a class="btn btn--secondary" href="/family-taipei/">查看台灣作品</a><a class="btn btn--secondary" href="/family-okinawa/">查看海外作品</a><a class="btn btn--secondary" href="${escapeHtml(cfg.site.lineUrl)}" target="_blank" rel="noopener noreferrer">LINE 預約諮詢</a></div>
</div></section>
<section class="container section"><h2 class="h2">核心賣點</h2><div class="grid-2">
<div class="card card--flat"><h3 class="h3">全外拍自然互動風格</h3><p class="muted">森林、草地、海邊等場景，孩子自在，照片自然。</p></div>
<div class="card card--flat"><h3 class="h3">台灣包車親子旅拍</h3><p class="muted">拍攝與接送動線一起規劃，省時省力。</p></div>
<div class="card card--flat"><h3 class="h3">海外旅拍經驗豐富</h3><p class="muted">日本、韓國、新加坡、澳洲等多地實戰。</p></div>
<div class="card card--flat"><h3 class="h3">照片全給 / MV可加值</h3><p class="muted">半天至少 100 張、全天至少 200 張，適用方案可附微電影 MV。</p></div>
</div></section>
<section class="container section"><h2 class="h2">價格與方案摘要</h2><div class="prose"><p><strong>台灣旅拍：</strong>半天約 $5800–8300、全天 $14800。<br/><strong>海外旅拍：</strong>一日攝影費 $14800、第二日 $9800，攝影師機票費用八折優惠。<br/><strong>成品：</strong>照片檔案全給，全天或適用方案附 MV。詳細內容仍以各地區頁與服務頁為準。</p></div></section>
<section class="container section"><h2 class="h2">精選影片</h2>${renderVideos(homeData.videos?.slice(0, 6))}<p><a href="https://www.youtube.com/playlist?list=PLlcWeCGlTvTTEDlFy5fNEjOKzUt5gBzVM" target="_blank" rel="noopener noreferrer">查看更多親子旅拍影片</a></p></section>
<section class="container section"><h2 class="h2">台灣拍攝地區導覽</h2><div class="loc-grid">${[
    ['台北', '/family-taipei/'],
    ['台北攝影基地', '/family-studio/'],
    ['淡水 / 北海岸', '/family-tamsui/'],
    ['桃園', '/family-taoyuan/'],
    ['新竹', '/family-hsinchu/'],
    ['台中', '/family-taichung/'],
    ['宜蘭', '/family-yilan/'],
    ['澎湖 / 離島', '/family-penghu/'],
    ['露營團拍 / 親子民宿', '/family-camping/'],
    ['生日派對 / 活動紀錄', '/family-birthday/'],
    ['野柳 / 十分天燈鐵道', '/family-railway/'],
    ['動物農場系列', '/family-farm/'],
  ].map((i) => `<a class="loc-card card card--flat" href="${i[1]}"><span class="loc-card__title">${i[0]}</span><span class="loc-card__sub muted">查看完整頁</span></a>`).join('')}</div></section>
<section class="container section"><h2 class="h2">海外旅拍地區導覽</h2><div class="loc-grid">${[
    ['日本冬季滑雪 / 玩雪', '/family-japan-winter/'],
    ['北海道 / 東北', '/family-hokkaido/'],
    ['沖繩', '/family-okinawa/'],
    ['東京 / 迪士尼', '/family-tokyo/'],
    ['京都 / 大阪 / 奈良', '/family-kansai/'],
    ['宿霧 / 峇里島 / 新加坡', '/family-southeast-asia/'],
    ['澳洲', '/family-australia/'],
    ['韓國', '/family-korea/'],
  ].map((i) => `<a class="loc-card card card--flat" href="${i[1]}"><span class="loc-card__title">${i[0]}</span></a>`).join('')}</div></section>
<section class="container section"><h2 class="h2">主題分類</h2><p class="muted">三代同堂、孕婦、和服韓服、夜拍煙火、海灘玩水、草地森林、黃昏日暮、室內 villa、春櫻秋楓、雨中與寶寶主題。</p></section>
<section class="container section card card--flat"><h2 class="h2">FAQ / 推薦精選</h2><ul class="prose"><li><a href="/family-faq/">常見問題精選（12+）</a></li><li><a href="/family-reviews/">爸媽推薦精選與圖庫</a></li></ul></section>
<section class="container section card card--flat"><h2 class="h2">關於小巴老師</h2><p class="muted">15 年全職攝影、50+ 趟海外拍攝，合作品牌包含喜來登、希爾頓、華碩、八方雲集、日本星野集團，並具滑雪與空拍拍攝能力。</p><p><a href="/about-ba-wei/">查看完整介紹</a></p></section>
${ctaBlock()}
${renderHashtags(['親子寫真', '台灣包車', '海外旅拍', '家庭攝影', '全家福', '小巴老師'])}`;

  return renderPage(cfg, {
    title: '親子寫真｜台灣包車、海外旅拍、家庭攝影作品集｜小巴老師',
    description:
      '小巴老師親子寫真，提供台灣包車親子旅拍、海外旅拍、家庭攝影、露營團拍、生日派對與多地區親子寫真服務。全外拍自然互動風格，作品遍及台北、桃園、台中、宜蘭、日本、沖繩、北海道、韓國、澳洲等地。',
    canonical: `${siteUrl}/`,
    body,
    ogImage: hero,
  });
}

function faqJsonLd(page) {
  const faqs = (page.paragraphs || []).slice(0, 12).map((q, i) => ({
    '@type': 'Question',
    name: `常見問題 ${i + 1}`,
    acceptedAnswer: { '@type': 'Answer', text: q },
  }));
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs })}</script>`;
}

function buildSpecial(p) {
  if (p.id === 'home') return homePage(p);
  if (p.id !== 'faq') return genericPage(p);
  const basic = genericPage(p);
  return basic.replace('</head>', `${faqJsonLd(p)}\n</head>`);
}

const renderedRoutes = [];
for (const row of manifest) {
  const p = dataMap.get(row.id);
  if (!p) continue;
  const html = buildSpecial(p);
  writeRoute(row.new_url, html);
  renderedRoutes.push(row.new_url);
}

const redirects = [
  '/taipei /family-taipei 301',
  '/base /family-studio 301',
  '/tamsui /family-tamsui 301',
  '/taoyuan /family-taoyuan 301',
  '/taichung /family-taichung 301',
  '/yilan /family-yilan 301',
  '/penghu /family-penghu 301',
  '/camp /family-camping 301',
  '/familyrecommend /family-reviews 301',
  '/familyqa /family-faq 301',
];
writeFileSync(join(ROOT, '_redirects'), redirects.join('\n') + '\n', 'utf8');

const sitemapSet = new Set(
  renderedRoutes.map((r) => (r === '/' ? `${siteUrl}/` : `${siteUrl}${r}/`)).concat([`${siteUrl}/`]),
);
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...sitemapSet].map((u) => `<url><loc>${escapeHtml(u)}</loc><changefreq>weekly</changefreq></url>`).join('\n')}
</urlset>`;
writeFileSync(join(ROOT, 'sitemap.xml'), sitemapXml, 'utf8');

console.log(`family migration pages rendered: ${renderedRoutes.length}`);
