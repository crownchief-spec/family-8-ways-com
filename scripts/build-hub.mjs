#!/usr/bin/env node
/**
 * 親子寫真 Hub：作品 / 文章 / 客戶系統與服務子頁
 * 執行順序：prepare（遷移建置前）→ pages（遷移建置後）
 * package.json：build.mjs && build-hub prepare && build-family-migration.mjs && build-hub pages
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import matter from 'gray-matter';
import { marked } from 'marked';
import { loadSiteConfig, renderPage, escapeHtml } from './render.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const cfg = loadSiteConfig();
const { site } = cfg;

marked.setOptions({ mangle: false, headerIds: false });

const WORK_FILTER_SLUG = {
  台灣親子旅拍: 'taiwan',
  海外親子旅拍: 'overseas',
  露營團拍: 'camping',
  親子民宿: 'homestay',
  生日派對: 'party',
  '孕婦 / 寶寶': 'baby',
  三代同堂: 'three-generation',
  草地森林: 'grass',
  海灘玩水: 'beach',
  滑雪玩雪: 'ski',
  和服韓服: 'costume',
  夜拍煙火: 'night',
};

const ARTICLE_CAT_SLUG = {
  親子寫真準備: 'preparation',
  台灣親子旅拍: 'taiwan',
  海外親子旅拍: 'overseas',
  親子攝影地點: 'location',
  服裝穿搭: 'outfit',
  露營團拍: 'camping',
  家庭活動紀錄: 'event',
  攝影費用: 'pricing',
  常見問題: 'faq',
};

const DEFAULT_IMG = '/public/images/wix-import/taiwan-taipei-family-portrait/taiwan-taipei-family-portrait-outdoor-lifestyle-01.jpg';
const CLIENT_OG = '/assets/images/og/og-default.svg';

function readMdDir(dir) {
  const p = join(ROOT, dir);
  if (!existsSync(p)) return [];
  return readdirSync(p)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const raw = readFileSync(join(p, f), 'utf8');
      const { data, content } = matter(raw);
      return { file: f, base: f.replace(/\.md$/, ''), data, content, bodyMd: content };
    });
}

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

function writeRouteHtml(route, html) {
  const clean = route.replace(/^\/+/, '').replace(/\/$/, '');
  if (!clean) {
    writeFileSync(join(ROOT, 'index.html'), html, 'utf8');
    return;
  }
  const dir = join(ROOT, clean);
  ensureDir(dir);
  writeFileSync(join(dir, 'index.html'), html, 'utf8');
  console.error('hub write', clean + '/index.html');
}

function normImg(src, fallback = DEFAULT_IMG) {
  if (!src || typeof src !== 'string') return fallback;
  const t = src.trim();
  if (t.startsWith('/images/')) return `/public${t}`;
  if (t.startsWith('/')) return t;
  return fallback;
}

function sha256sync(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function workFilterSlug(entry) {
  const c = entry.data.category || '';
  return entry.data.filterSlug || WORK_FILTER_SLUG[c] || 'other';
}

function articleCatSlug(entry) {
  const c = entry.data.category || '';
  return entry.data.categorySlug || ARTICLE_CAT_SLUG[c] || 'general';
}

function jsonLdBreadcrumb(names) {
  return `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: names.map((name, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
    })),
  })}</script>`;
}

function mergeSitemap(extraUrls) {
  const p = join(ROOT, 'sitemap.xml');
  if (!existsSync(p)) return;
  let xml = readFileSync(p, 'utf8');
  const existing = new Set();
  const locRe = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = locRe.exec(xml))) existing.add(m[1]);
  const toAdd = extraUrls.filter((u) => !existing.has(u));
  if (!toAdd.length) return;
  const block = toAdd.map((u) => `\n<url><loc>${escapeXml(u)}</loc><changefreq>weekly</changefreq></url>`).join('');
  xml = xml.replace('</urlset>', `${block}\n</urlset>`);
  writeFileSync(p, xml, 'utf8');
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ---------- prepare ---------- */

export function runPrepare() {
  const works = readMdDir('content/works').filter((e) => !e.data.draft);
  const articles = readMdDir('content/articles').filter((e) => !e.data.draft);

  const sortedWorks = works.sort((a, b) => (a.data.date < b.data.date ? 1 : -1));
  const sortedArticles = articles.sort((a, b) => (a.data.date < b.data.date ? 1 : -1));

  const pickWorks = sortedWorks.filter((w) => w.data.featured).slice(0, 6);
  const latestWorks = pickWorks.length ? pickWorks : sortedWorks.slice(0, 6);
  const latestArts = sortedArticles.filter((a) => a.data.featured).slice(0, 3);
  const latestArticles = latestArts.length ? latestArts : sortedArticles.slice(0, 3);

  writeFileSync(
    join(ROOT, 'data/hub-footer-latest.json'),
    JSON.stringify(
      {
        works: latestWorks.map((w) => ({
          title: w.data.title,
          href: `/works/${w.data.slug}/`,
          date: w.data.date,
        })),
        articles: latestArticles.map((a) => ({
          title: a.data.title,
          href: `/articles/${a.data.slug}/`,
          date: a.data.date,
        })),
      },
      null,
      2,
    ),
    'utf8',
  );

  const worksCards = latestWorks
    .map((w) => {
      const cov = normImg(w.data.coverImage);
      return `<a class="showcase-card" href="/works/${escapeHtml(w.data.slug)}/">
  <div class="showcase-card__media"><img src="${escapeHtml(cov)}" alt="${escapeHtml(w.data.title)}" loading="lazy" width="640" height="420"/></div>
  <div class="showcase-card__body">
    <p class="showcase-card__type">${escapeHtml(w.data.category)}</p>
    <h3 class="showcase-card__title">${escapeHtml(w.data.title.split('｜')[0])}</h3>
    <p class="showcase-card__desc">${escapeHtml((w.data.excerpt || '').slice(0, 56))}…</p>
  </div>
</a>`;
    })
    .join('');

  const artCards = latestArticles
    .map((a) => {
      const cov = normImg(a.data.coverImage, DEFAULT_IMG);
      return `<a class="showcase-card showcase-card--article" href="/articles/${escapeHtml(a.data.slug)}/">
  <div class="showcase-card__media"><img src="${escapeHtml(cov)}" alt="" loading="lazy" width="640" height="420"/></div>
  <div class="showcase-card__body">
    <p class="showcase-card__type">${escapeHtml(a.data.category)}</p>
    <h3 class="showcase-card__title">${escapeHtml(a.data.title)}</h3>
    <p class="showcase-card__desc">${escapeHtml((a.data.description || '').slice(0, 80))}</p>
  </div>
</a>`;
    })
    .join('');

  const inject = `
<section class="container section hub-three-systems">
  <h2 class="h2">最新親子寫真作品</h2>
  <p class="muted">從真實案例看拍攝風格與場景氛圍。</p>
  <div class="showcase-grid">${worksCards || '<p class="muted">作品資料準備中。</p>'}</div>
  <p style="margin-top:var(--space-md);"><a class="btn btn--secondary" href="/works/">看更多作品</a></p>
</section>
<section class="container section hub-three-systems">
  <h2 class="h2">親子寫真文章</h2>
  <p class="muted">拍攝準備、地點、穿搭與費用等實用指南。</p>
  <div class="showcase-grid">${artCards || '<p class="muted">文章準備中。</p>'}</div>
  <p style="margin-top:var(--space-md);"><a class="btn btn--secondary" href="/articles/">閱讀更多文章</a></p>
</section>`;

  writeFileSync(join(ROOT, 'data/hub-home-inject.html'), inject, 'utf8');
  console.error('hub prepare OK');
}

/* ---------- pages ---------- */

function loadServiceDefs() {
  const p = join(ROOT, 'data/service-pages.json');
  if (!existsSync(p)) return [];
  return JSON.parse(readFileSync(p, 'utf8'));
}

function isPresent(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  return true;
}

function normalizeClientEntry(entry) {
  const d = entry.data || {};
  return {
    id: d.id || d.slug || entry.base,
    title: d.title || `${d.clientName || '客戶'}｜親子寫真客戶專區`,
    clientName: d.clientName || '',
    slug: d.slug || entry.base,
    status: d.status || 'active',
    publish: !!d.publish,
    portfolioPublish: !!d.portfolioPublish,
    publicPortfolio: d.publicPortfolio === true,
    noindex: d.noindex !== false,
    privacy: d.privacy || 'private',
    showInClientList: d.showInClientList === true,
    shareEnabled: d.shareEnabled !== false,
    adminOnly: d.adminOnly === true,
    contractEnabled: d.contractEnabled !== false,
    deliveryEnabled: d.deliveryEnabled !== false,
    clientAccessCode: d.clientAccessCode || '',
    internalNote: d.internalNote || '',
    shootingDate: d.shootingDate || '',
    shootingWeekday: d.shootingWeekday || '',
    shootingStartTime: d.shootingStartTime || '',
    shootingEndTime: d.shootingEndTime || '',
    packageName: d.packageName || '',
    location: d.location || '',
    pickup: d.pickup || '',
    totalFee: d.totalFee,
    deposit: d.deposit,
    balance: d.balance,
    paymentStatus: d.paymentStatus || '訂金待確認',
    paymentMethod: d.paymentMethod || '',
    bankLast5: d.bankLast5 || '',
    paymentAmount: d.paymentAmount || '',
    paymentDate: d.paymentDate || '',
    paymentNote: d.paymentNote || '',
    paymentEnablePaypal: d.paymentEnablePaypal !== false,
    paymentEnableWise: d.paymentEnableWise !== false,
    deliverables: d.deliverables || '',
    contactName: d.contactName || '',
    phone: d.phone || '',
    email: d.email || '',
    customerEmail: d.customerEmail || d.email || '',
    lineName: d.lineName || '',
    fatherName: d.fatherName || '',
    motherName: d.motherName || '',
    adultCount: d.adultCount,
    childCount: d.childCount,
    childrenInfo: d.childrenInfo || '',
    familyIntro: d.familyIntro || '',
    desiredShots: d.desiredShots || '',
    specialNotes: d.specialNotes || '',
    usageConsent: d.usageConsent || '',
    contractStatus: d.contractStatus || '',
    portfolioPermission: d.portfolioPermission || '',
    contractVersion: d.contractVersion || '',
    signedAt: d.signedAt || '',
    signedBy: d.signedBy || '',
    signedDate: d.signedDate || '',
    signedPdfSentAt: d.signedPdfSentAt || '',
    signedPdfSentTo: d.signedPdfSentTo || '',
    signatureImage: d.signatureImage || '',
    driveFolderUrl: d.driveFolderUrl || '',
    selectedPhotoUrl: d.selectedPhotoUrl || '',
    videoUrl: d.videoUrl || '',
    deliveryStatus: d.deliveryStatus || '',
    deliveryNote: d.deliveryNote || '',
    coverImage: d.coverImage || '',
    gallery: d.gallery || [],
    tags: d.tags || [],
    createdAt: d.createdAt || '',
    updatedAt: d.updatedAt || '',
    bodyMd: entry.bodyMd || '',
  };
}

function normalizeDateForSlug(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const m = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!m) return raw.replace(/\s+/g, '').replace(/\//g, '-');
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

function themeCandidates(client) {
  const text = [
    client.packageName,
    client.title,
    client.location,
    ...(client.tags || []),
  ]
    .filter(Boolean)
    .join(' ');
  const candidates = [];
  const push = (t) => {
    if (!candidates.includes(t)) candidates.push(t);
  };

  if (/海外|沖繩|東京|日本|韓國|新加坡|澳洲/i.test(text)) push('overseas');
  if (/露營|民宿/i.test(text)) push('camping');
  if (/生日|活動/i.test(text)) push('event');
  if (/孕婦/i.test(text)) push('maternity');
  if (/寶寶/i.test(text)) push('baby');
  if (/三代/i.test(text)) push('generation');
  if (/包車|旅拍/i.test(text)) push('travel');
  push('family');
  return candidates;
}

function buildClientSlug(client) {
  const datePart = normalizeDateForSlug(client.shootingDate) || 'undated';
  const suffixes = themeCandidates(client);
  return suffixes.map((s) => `${datePart}${s}`);
}

function assignClientSlugs(clients) {
  const used = new Set();
  return clients.map((client) => {
    const next = { ...client };
    if (isPresent(next.slug)) {
      if (!used.has(next.slug)) {
        used.add(next.slug);
        return next;
      }
    }

    const candidates = buildClientSlug(next);
    let chosen = candidates.find((c) => !used.has(c));
    if (!chosen) {
      const base = candidates[0] || `undatedfamily`;
      let i = 2;
      chosen = `${base}-${i}`;
      while (used.has(chosen)) {
        i += 1;
        chosen = `${base}-${i}`;
      }
    }
    next.slug = chosen;
    used.add(chosen);
    return next;
  });
}

function relatedWorksHtml(slugs, workBySlug) {
  if (!slugs?.length) return '';
  const links = slugs
    .map((s) => workBySlug[s])
    .filter(Boolean)
    .map((e) => `<li><a href="/works/${escapeHtml(e.data.slug)}/">${escapeHtml(e.data.title)}</a></li>`)
    .join('');
  return links ? `<section class="container section card card--flat"><h2 class="h2">相關作品</h2><ul class="prose">${links}</ul></section>` : '';
}

function relatedArticlesHtml(slugs, artBySlug) {
  if (!slugs?.length) return '';
  const links = slugs
    .map((s) => artBySlug[s])
    .filter(Boolean)
    .map((e) => `<li><a href="/articles/${escapeHtml(e.data.slug)}/">${escapeHtml(e.data.title)}</a></li>`)
    .join('');
  return links ? `<section class="container section card card--flat"><h2 class="h2">相關文章</h2><ul class="prose">${links}</ul></section>` : '';
}

function runPages() {
  const works = readMdDir('content/works').filter((e) => !e.data.draft);
  const articles = readMdDir('content/articles').filter((e) => !e.data.draft);
  const clientEntries = readMdDir('content/clients')
    .filter((e) => !e.data.draft)
    .map(normalizeClientEntry)
    .filter((c) => isPresent(c.clientName));
  const clients = assignClientSlugs(clientEntries);

  const workBySlug = Object.fromEntries(works.map((w) => [w.data.slug, w]));
  const artBySlug = Object.fromEntries(articles.map((a) => [a.data.slug, a]));

  const extraSitemapUrls = [];

  /* ----- works index ----- */
  const workCards = works
    .sort((a, b) => (a.data.date < b.data.date ? 1 : -1))
    .map((w) => {
      const fs = workFilterSlug(w);
      const cov = normImg(w.data.coverImage);
      const tags = (w.data.tags || []).join(' ');
      return `<div class="hub-card-wrap" data-hub-work data-category="${escapeHtml(fs)}" data-search="${escapeHtml(`${w.data.title} ${w.data.location} ${tags} ${w.data.excerpt || ''}`)}">
  <a class="pcard" href="/works/${escapeHtml(w.data.slug)}/">
    <div class="pcard__media"><img src="${escapeHtml(cov)}" alt="${escapeHtml(w.data.title)}｜親子寫真作品" loading="lazy" width="640" height="420"/></div>
    <div class="pcard__body">
      <p class="pcard__loc muted">${escapeHtml(w.data.category)} · ${escapeHtml(w.data.location)}</p>
      <h3 class="pcard__title">${escapeHtml(w.data.title)}</h3>
      <p class="pcard__excerpt muted">${escapeHtml(w.data.excerpt || '')}</p>
      <span class="btn btn--ghost btn--compact" style="margin-top:0.5rem;display:inline-block;">查看作品</span>
    </div>
  </a></div>`;
    })
    .join('');

  const filterButtons = [
    ['全部', 'all'],
    ['台灣親子旅拍', 'taiwan'],
    ['海外親子旅拍', 'overseas'],
    ['露營團拍', 'camping'],
    ['親子民宿', 'homestay'],
    ['生日派對', 'party'],
    ['孕婦 / 寶寶', 'baby'],
    ['三代同堂', 'three-generation'],
    ['草地森林', 'grass'],
    ['海灘玩水', 'beach'],
    ['滑雪玩雪', 'ski'],
    ['和服韓服', 'costume'],
    ['夜拍煙火', 'night'],
  ]
    .map(
      ([label, val]) =>
        `<button type="button" class="chip${val === 'all' ? ' is-active' : ''}" data-hub-filter="${escapeHtml(val)}">${escapeHtml(label)}</button>`,
    )
    .join('');

  const worksIndexBody = `<nav class="container section" style="padding-bottom:0;font-size:0.9rem;"><div class="muted"><a href="/">首頁</a> / <span>親子寫真作品</span></div></nav>
<section class="hero hero--compact"><div class="hero__bg" style="background-image:url('${normImg('/public/images/wix-import/taiwan-yilan-family-portrait/taiwan-yilan-family-portrait-outdoor-lifestyle-01.jpg')}')"></div><div class="hero__overlay"></div><div class="hero__inner">
<h1 class="hero__title">親子寫真作品案例</h1>
<p class="hero__sub">收錄台灣親子旅拍、海外家庭攝影、露營團拍、生日派對、孕婦寶寶與三代同堂作品。</p>
</div></section>
<div class="container section">
<label class="field hub-search"><span class="muted">搜尋作品</span><input type="search" data-hub-search placeholder="標題、地點、標籤…" class="hub-search__input"/></label>
<div class="chips chips--wrap" style="margin-top:var(--space-md);">${filterButtons}</div>
</div>
<div class="container section" style="padding-top:0;"><div class="grid-2" id="hub-works-grid">${workCards}</div>
<p class="muted" id="hub-works-empty" hidden style="text-align:center;">此條件目前沒有作品。</p>
</div>
<script>(function(){function norm(){return(new URL(location.href)).searchParams.get("category")||"";}var active=norm();var chips=document.querySelectorAll("[data-hub-filter]");var items=document.querySelectorAll("[data-hub-work]");var q="";var searchEl=document.querySelector("[data-hub-search]");function apply(){var n=0;items.forEach(function(el){var cat=el.getAttribute("data-category")||"";var okCat=active===""||active==="all"||cat===active;var text=(el.getAttribute("data-search")||"").toLowerCase();var okSearch=!q||text.indexOf(q.toLowerCase())!==-1;var ok=okCat&&okSearch;el.toggleAttribute("hidden",!ok);if(ok)n++;});var empty=document.getElementById("hub-works-empty");if(empty)empty.hidden=n!==0;}if(active){chips.forEach(function(c){c.classList.toggle("is-active",c.getAttribute("data-hub-filter")===active);});}chips.forEach(function(btn){btn.addEventListener("click",function(){active=btn.getAttribute("data-hub-filter")||"all";chips.forEach(function(c){c.classList.remove("is-active");});btn.classList.add("is-active");apply();});});if(searchEl){searchEl.addEventListener("input",function(){q=String(searchEl.value||"").trim();apply();});}apply();})();</script>`;

  writeRouteHtml(
    '/works',
    renderPage(cfg, {
      title: '親子寫真作品案例｜小巴老師',
      description: '台灣、海外、露營、派對與家庭主題之親子寫真作品，可依分類篩選與搜尋。',
      canonical: `${site.url}/works/`,
      body: worksIndexBody,
      ogImage: normImg('/public/images/wix-import/taiwan-taipei-family-portrait/taiwan-taipei-family-portrait-outdoor-lifestyle-01.jpg'),
    }),
  );
  extraSitemapUrls.push(`${site.url}/works/`);

  /* ----- work detail ----- */
  for (const w of works) {
    const slug = w.data.slug;
    const cov = normImg(w.data.coverImage);
    const gallery = (w.data.gallery || []).map((g) => normImg(g, cov));
    const allImgs = [cov, ...gallery].filter((v, i, a) => a.indexOf(v) === i);
    const fs = workFilterSlug(w);
    const bodyMd = marked.parse(w.bodyMd);
    const vids = w.data.videos || [];
    const videoBlock =
      vids.length > 0
        ? `<section class="container section"><h2 class="h2">影片</h2><div class="grid-2">${vids
            .map((v) => {
              const id = v.youtubeId || (v.youtubeUrl && String(v.youtubeUrl).match(/[?&]v=([^&]+)/)?.[1]);
              if (!id) return '';
              return `<div class="video-embed"><iframe loading="lazy" title="${escapeHtml(v.title || 'YouTube')}" src="https://www.youtube.com/embed/${escapeHtml(id)}" allowfullscreen></iframe></div>`;
            })
            .join('')}</div></section>`
        : '';

    const related = works
      .filter((o) => o.data.slug !== slug && workFilterSlug(o) === fs)
      .slice(0, 3);
    const relHtml = related.length
      ? `<section class="container section card card--flat"><h2 class="h2">相關作品</h2><ul class="prose">${related.map((r) => `<li><a href="/works/${escapeHtml(r.data.slug)}/">${escapeHtml(r.data.title)}</a></li>`).join('')}</ul></section>`
      : '';

    const relArts = (w.data.relatedArticleSlugs || [])
      .map((s) => artBySlug[s])
      .filter(Boolean);
    const relArtHtml = relArts.length
      ? `<section class="container section card card--flat"><h2 class="h2">相關文章</h2><ul class="prose">${relArts.map((a) => `<li><a href="/articles/${escapeHtml(a.data.slug)}/">${escapeHtml(a.data.title)}</a></li>`).join('')}</ul></section>`
      : '';

    const galleryHtml = `<div class="masonry-lightbox" data-lightbox-root>${allImgs
      .map(
        (src, i) =>
          `<figure class="masonry-lightbox__item"><button type="button" class="masonry-lightbox__btn" data-lightbox-index="${i}" data-lightbox-src="${escapeHtml(src)}"><img src="${escapeHtml(src)}" alt="${escapeHtml(w.data.title)}｜親子寫真作品 ${i + 1}" loading="lazy" width="900" height="600"/></button></figure>`,
      )
      .join('')}</div>
<div class="lightbox" id="work-lightbox" hidden data-lightbox-modal><button type="button" class="lightbox__close" data-lightbox-close aria-label="關閉">×</button><button type="button" class="lightbox__prev" data-lightbox-prev aria-label="上一張">‹</button><button type="button" class="lightbox__next" data-lightbox-next aria-label="下一張">›</button><div class="lightbox__stage"><img src="" alt="" data-lightbox-img/></div></div>
<script>(function(){var root=document.querySelector("[data-lightbox-root]");if(!root)return;var modal=document.querySelector("[data-lightbox-modal]");var img=modal.querySelector("[data-lightbox-img]");var btns=root.querySelectorAll("[data-lightbox-src]");var list=[].map.call(btns,function(b){return b.getAttribute("data-lightbox-src");});var idx=0;function open(i){idx=i;modal.hidden=false;img.src=list[idx];document.body.style.overflow="hidden";}function close(){modal.hidden=true;document.body.style.overflow="";}root.addEventListener("click",function(e){var b=e.target.closest("[data-lightbox-src]");if(!b)return;e.preventDefault();open(parseInt(b.getAttribute("data-lightbox-index"),10)||0);});modal.querySelector("[data-lightbox-close]").addEventListener("click",close);modal.querySelector("[data-lightbox-prev]").addEventListener("click",function(){open((idx+list.length-1)%list.length);});modal.querySelector("[data-lightbox-next]").addEventListener("click",function(){open((idx+1)%list.length);});document.addEventListener("keydown",function(e){if(modal.hidden)return;if(e.key==="Escape")close();if(e.key==="ArrowLeft")open((idx+list.length-1)%list.length);if(e.key==="ArrowRight")open((idx+1)%list.length);});})();</script>`;

    const pageBody = `${jsonLdBreadcrumb(['首頁', '作品案例', w.data.title])}
<nav class="container section" style="padding-bottom:0;font-size:0.9rem;"><div class="muted"><a href="/">首頁</a> / <a href="/works/">作品案例</a> / <span>${escapeHtml(w.data.title)}</span></div></nav>
<section class="hero" style="min-height:340px;margin-bottom:0;border-radius:0;"><div class="hero__bg" style="background-image:url('${escapeHtml(cov)}')"></div><div class="hero__overlay"></div><div class="hero__inner">
<p class="hero__eyebrow">${escapeHtml(w.data.category)} · ${escapeHtml(w.data.location)}</p>
<h1 class="hero__title">${escapeHtml(w.data.title)}</h1>
<p class="hero__sub">${escapeHtml(w.data.excerpt || '')}</p>
</div></section>
<div class="container section"><div class="card card--flat hub-meta-grid">
<div><span class="muted">拍攝類型</span><p><strong>${escapeHtml(w.data.shootType || '親子寫真')}</strong></p></div>
<div><span class="muted">地點</span><p><strong>${escapeHtml(w.data.location)}</strong></p></div>
<div><span class="muted">主題分類</span><p><strong>${escapeHtml(w.data.subCategory || w.data.category)}</strong></p></div>
<div><span class="muted">日期</span><p><strong>${escapeHtml(w.data.date)}</strong></p></div>
</div></div>
<div class="container section prose">${bodyMd}</div>
${videoBlock}
<section class="container section"><h2 class="h2">照片作品</h2>${galleryHtml}</section>
${relHtml}
${relArtHtml}
<section class="container section card card--flat"><h2 class="h2">想拍類似風格嗎？</h2><div class="hero__actions">
<a class="btn btn--primary" href="${site.lineUrl}" target="_blank" rel="noopener noreferrer">加 Line 詢問</a>
<a class="btn btn--secondary" href="/services/">查看服務方案</a>
</div></section>`;

    const html = renderPage(cfg, {
      title: w.data.seoTitle || `${w.data.title}｜小巴老師親子寫真`,
      description: w.data.seoDescription || w.data.excerpt,
      canonical: `${site.url}/works/${slug}/`,
      body: pageBody,
      ogImage: cov,
    }).replace(
      '</head>',
      `<script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: w.data.title,
        image: new URL(cov.replace(/^\//, ''), site.url + '/').href,
        creator: { '@type': 'Person', name: '小巴老師' },
      })}</script>\n</head>`,
    );

    writeRouteHtml(`/works/${slug}`, html);
    extraSitemapUrls.push(`${site.url}/works/${slug}/`);
  }

  /* ----- articles index ----- */
  const artList = articles
    .sort((a, b) => (a.data.date < b.data.date ? 1 : -1))
    .map((a) => {
      const cs = articleCatSlug(a);
      const cov = normImg(a.data.coverImage);
      return `<div class="hub-card-wrap" data-hub-article data-category="${escapeHtml(cs)}" data-search="${escapeHtml(`${a.data.title} ${(a.data.tags || []).join(' ')} ${a.data.description || ''}`)}">
<a class="pcard" href="/articles/${escapeHtml(a.data.slug)}/">
<div class="pcard__media"><img src="${escapeHtml(cov)}" alt="" loading="lazy" width="640" height="420"/></div>
<div class="pcard__body">
<p class="pcard__loc muted">${escapeHtml(a.data.category)} · ${escapeHtml(a.data.date)}</p>
<h3 class="pcard__title">${escapeHtml(a.data.title)}</h3>
<p class="pcard__excerpt muted">${escapeHtml(a.data.description || '')}</p>
<p class="muted" style="font-size:0.85rem;">${(a.data.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join(' ')}</p>
<span class="btn btn--ghost btn--compact" style="margin-top:0.5rem;display:inline-block;">閱讀文章</span>
</div>
</a></div>`;
    })
    .join('');

  const artFilters = [
    ['全部', 'all'],
    ['親子寫真準備', 'preparation'],
    ['台灣親子旅拍', 'taiwan'],
    ['海外親子旅拍', 'overseas'],
    ['親子攝影地點', 'location'],
    ['服裝穿搭', 'outfit'],
    ['露營團拍', 'camping'],
    ['家庭活動紀錄', 'event'],
    ['攝影費用', 'pricing'],
    ['常見問題', 'faq'],
  ]
    .map(
      ([l, v]) =>
        `<button type="button" class="chip${v === 'all' ? ' is-active' : ''}" data-hub-afilter="${escapeHtml(v)}">${escapeHtml(l)}</button>`,
    )
    .join('');

  const articlesIndexBody = `<nav class="container section" style="padding-bottom:0;"><div class="muted"><a href="/">首頁</a> / <span>親子寫真文章</span></div></nav>
<section class="hero hero--compact"><div class="hero__bg" style="background-image:url('${normImg('/public/images/wix-import/theme-three-generation-grandparent-family/theme-three-generation-grandparent-family-outdoor-lifestyle-01.jpg')}')"></div><div class="hero__overlay"></div><div class="hero__inner">
<h1 class="hero__title">親子寫真文章｜拍攝準備、地點推薦、穿搭與家庭攝影指南</h1>
<p class="hero__sub">整理親子寫真、家庭攝影、台灣旅拍、海外旅拍、露營團拍與家庭照準備資訊。</p>
</div></section>
<div class="container section"><div class="chips chips--wrap">${artFilters}</div></div>
<div class="container section" style="padding-top:0;"><div class="grid-2" id="hub-art-grid">${artList}</div>
<p class="muted" id="hub-art-empty" hidden style="text-align:center;">此分類目前沒有文章。</p></div>
<script>(function(){var active="";try{active=(new URL(location.href)).searchParams.get("category")||"";}catch(e){}var chips=document.querySelectorAll("[data-hub-afilter]");var items=document.querySelectorAll("[data-hub-article]");function apply(){var n=0;items.forEach(function(el){var cat=el.getAttribute("data-category")||"";var ok=!active||active==="all"||cat===active;el.toggleAttribute("hidden",!ok);if(ok)n++;});var empty=document.getElementById("hub-art-empty");if(empty)empty.hidden=n!==0;}if(active){chips.forEach(function(c){c.classList.toggle("is-active",c.getAttribute("data-hub-afilter")===active);});}chips.forEach(function(btn){btn.addEventListener("click",function(){active=btn.getAttribute("data-hub-afilter")||"all";chips.forEach(function(c){c.classList.remove("is-active");});btn.classList.add("is-active");apply();});});apply();})();</script>`;

  writeRouteHtml(
    '/articles',
    renderPage(cfg, {
      title: '親子寫真文章｜小巴老師',
      description: '親子寫真準備、台灣與海外旅拍、穿搭、地點與費用等實用文章。',
      canonical: `${site.url}/articles/`,
      body: articlesIndexBody,
      ogImage: normImg('/public/images/wix-import/taiwan-taipei-family-portrait/taiwan-taipei-family-portrait-outdoor-lifestyle-02.jpg'),
    }),
  );
  extraSitemapUrls.push(`${site.url}/articles/`);

  for (const a of articles) {
    const slug = a.data.slug;
    const cov = normImg(a.data.coverImage);
    const prose = marked.parse(a.bodyMd);
    const relWorks = (a.data.relatedWorks || []).map((s) => workBySlug[s]).filter(Boolean);
    const relServ = a.data.relatedServices || [];
    const rw =
      relWorks.length > 0
        ? `<section class="container section card card--flat"><h2 class="h2">適合參考的作品</h2><ul class="prose">${relWorks.map((w) => `<li><a href="/works/${escapeHtml(w.data.slug)}/">${escapeHtml(w.data.title)}</a></li>`).join('')}</ul></section>`
        : '';
    const rs =
      relServ.length > 0
        ? `<section class="container section card card--flat"><h2 class="h2">相關服務</h2><ul class="prose">${relServ.map((href) => `<li><a href="${escapeHtml(href)}">${escapeHtml(href.replace(/\\/g, '').split('/').filter(Boolean).pop())}</a></li>`).join('')}</ul></section>`
        : '';

    const articleBody = `${jsonLdBreadcrumb(['首頁', '文章', a.data.title])}
<nav class="container section" style="padding-bottom:0;"><div class="muted"><a href="/">首頁</a> / <a href="/articles/">文章</a> / <span>${escapeHtml(a.data.title)}</span></div></nav>
<section class="hero" style="min-height:300px;margin-bottom:0;border-radius:0;"><div class="hero__bg" style="background-image:url('${escapeHtml(cov)}')"></div><div class="hero__overlay"></div><div class="hero__inner">
<p class="hero__eyebrow">${escapeHtml(a.data.category)} · ${escapeHtml(a.data.date)}</p>
<h1 class="hero__title">${escapeHtml(a.data.title)}</h1>
</div></section>
<article class="container section prose">${prose}</article>
${rw}
${rs}
<section class="container section card card--flat"><h2 class="h2">聯絡預約</h2><p class="muted">告訴我們預計拍攝的地點、日期與家庭成員，我可以協助規劃路線與時段。</p><div class="hero__actions"><a class="btn btn--primary" href="${site.lineUrl}" target="_blank" rel="noopener noreferrer">Line 預約</a><a class="btn btn--secondary" href="/contact/">填寫預約表單</a></div></section>`;

    const html = renderPage(cfg, {
      title: a.data.seoTitle || `${a.data.title}｜小巴老師親子寫真`,
      description: a.data.seoDescription || a.data.description,
      canonical: `${site.url}/articles/${slug}/`,
      body: articleBody,
      ogImage: cov,
    }).replace(
      '</head>',
      `<script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: a.data.title,
        datePublished: a.data.date,
        image: new URL(cov.replace(/^\//, ''), site.url + '/').href,
        author: { '@type': 'Person', name: '小巴老師' },
      })}</script>\n</head>`,
    );

    writeRouteHtml(`/articles/${slug}`, html);
    extraSitemapUrls.push(`${site.url}/articles/${slug}/`);
  }

  /* ----- clients ----- */
  const clientsForPortal = clients.filter((c) => c.status !== 'archived' && c.shareEnabled !== false && c.adminOnly !== true);

  const clientsIndexBody = `<nav class="container section" style="padding-bottom:0;"><div class="muted"><a href="/">首頁</a> / <span>客戶分享頁說明</span></div></nav>
<section class="hero hero--compact"><div class="hero__bg" style="background-image:url('${CLIENT_OG}')"></div><div class="hero__overlay"></div><div class="hero__inner">
<h1 class="hero__title">客戶分享頁使用說明</h1>
<p class="hero__sub">這裡不是公開查詢頁。已預約客戶請使用攝影師提供的專屬連結進入合約確認與作品交件頁。如找不到連結，請直接聯絡小巴老師。</p>
</div></section>
<section class="container section card card--flat prose">
<p>此頁不提供客戶列表、搜尋框與案件公開連結。</p>
<div class="hero__actions">
  <a class="btn btn--primary" href="${site.lineUrl}" target="_blank" rel="noopener noreferrer">Line 聯絡</a>
  <a class="btn btn--secondary" href="${site.phoneTel}">電話聯絡</a>
</div>
</section>`;

  writeRouteHtml(
    '/clients',
    renderPage(cfg, {
      title: '客戶分享頁說明｜小巴老師',
      description: '此頁不提供公開查詢，已預約客戶請使用攝影師提供的專屬連結。',
      canonical: `${site.url}/clients/`,
      body: clientsIndexBody,
      ogImage: CLIENT_OG,
      noIndex: true,
      hideAdminFooterLink: true,
    }),
  );

  for (const c of clientsForPortal) {
    const depositDefault =
      c.deposit != null && String(c.deposit).trim() !== '' && Number.isFinite(Number(c.deposit))
        ? String(Number(c.deposit))
        : '';
    const adultVal =
      c.adultCount != null && String(c.adultCount).trim() !== '' ? escapeHtml(String(c.adultCount)) : '2';
    const childVal =
      c.childCount != null && String(c.childCount).trim() !== '' ? escapeHtml(String(c.childCount)) : '1';
    const paymentPillLine = escapeHtml(
      String(c.paymentStatus || '').trim() ? String(c.paymentStatus).trim() : '訂金待確認',
    );
    const body = `<section class="family-contract-hero">
  <div class="container family-contract-wrap">
    <h1 class="h1">${escapeHtml(c.clientName)}｜親子寫真預約與合約</h1>
    <p class="lead">請依序確認預約資訊、訂金匯款方式、填寫家庭資料與付款狀態，並完成電子簽名。送出後會產生 PDF 合約作為本次預約確認紀錄。</p>
    <div class="portal-status">
      <span class="status-pill" id="contract-status-tag">合約狀態：${escapeHtml(c.contractStatus || '尚未簽署')}</span>
      <span class="status-pill" id="payment-status-pill">付款狀態：${paymentPillLine}</span>
      <span class="status-pill" id="delivery-status-pill">作品交件狀態：${escapeHtml(c.deliveryStatus || '')}</span>
    </div>
  </div>
</section>
<section class="container section family-contract-wrap portal-grid" data-client-portal data-line-url="${escapeHtml(site.lineUrl)}" data-photographer-email="crownchief@gmail.com" data-client-slug="${escapeHtml(c.slug)}" data-client-name="${escapeHtml(c.clientName)}" data-shooting-date="${escapeHtml(c.shootingDate || '')}" data-start-time="${escapeHtml(c.shootingStartTime || '')}" data-end-time="${escapeHtml(c.shootingEndTime || '')}" data-package-name="${escapeHtml(c.packageName || '')}" data-location="${escapeHtml(c.location || '')}" data-pickup="${escapeHtml(c.pickup || '')}" data-total-fee="${escapeHtml(c.totalFee || '')}" data-deposit="${escapeHtml(c.deposit || '')}" data-balance="${escapeHtml(c.balance || '')}" data-contract-version="${escapeHtml(c.contractVersion || 'family-contract-v2026-05')}">
  <article class="card">
    <h2 class="h2">預約資訊</h2>
    <div class="portal-grid-2">
      <p><strong>客戶名稱：</strong>${escapeHtml(c.clientName)}</p>
      ${isPresent(c.shootingDate) ? `<p><strong>拍攝日期：</strong>${escapeHtml(c.shootingDate)}${isPresent(c.shootingWeekday) ? `（${escapeHtml(c.shootingWeekday)}）` : ''}</p>` : ''}
      ${isPresent(c.shootingStartTime) || isPresent(c.shootingEndTime) ? `<p><strong>拍攝時間：</strong>${escapeHtml([c.shootingStartTime, c.shootingEndTime].filter(Boolean).join(' - '))}</p>` : ''}
      ${isPresent(c.packageName) ? `<p><strong>拍攝方案：</strong>${escapeHtml(c.packageName)}</p>` : ''}
      ${isPresent(c.location) ? `<p><strong>拍攝地點：</strong>${escapeHtml(c.location)}</p>` : ''}
      ${isPresent(c.pickup) ? `<p><strong>是否含接送：</strong>${escapeHtml(c.pickup)}</p>` : ''}
      ${isPresent(c.totalFee) ? `<p><strong>總費用：</strong>NT$${Number(c.totalFee || 0).toLocaleString('zh-TW')}</p>` : ''}
      ${isPresent(c.deposit) ? `<p><strong>訂金：</strong>NT$${Number(c.deposit || 0).toLocaleString('zh-TW')}</p>` : ''}
      ${isPresent(c.balance) ? `<p><strong>餘款：</strong>NT$${Number(c.balance || 0).toLocaleString('zh-TW')}</p>` : ''}
    </div>
    ${isPresent(c.deliverables) ? `<p><strong>成品內容：</strong><span data-deliverables-text>${escapeHtml(c.deliverables)}</span></p>` : ''}
    <p class="portal-note muted">以下拍攝資訊由攝影師依雙方討論內容建立，如有需要調整，請先聯繫攝影師，不要直接修改合約內容。</p>
  </article>

  <article class="card portal-form">
    <form id="client-contract-form" novalidate>
      <h2 class="h2">訂金匯款與付款狀態</h2>
      <p class="muted" style="margin-top:0;">請先依下方方式完成訂金匯款，或填寫您目前的付款狀態。完成訂金付款後，攝影師才會正式保留本次拍攝檔期。若您尚未匯款，也可以先送出合約，系統會在 PDF 中記錄目前付款狀態。</p>
      <div class="portal-grid-2">
        ${isPresent(c.totalFee) ? `<p><strong>總費用：</strong>NT$${Number(c.totalFee || 0).toLocaleString('zh-TW')}</p>` : ''}
        ${isPresent(c.deposit) ? `<p><strong>訂金：</strong>NT$${Number(c.deposit || 0).toLocaleString('zh-TW')}</p>` : ''}
        ${isPresent(c.balance) ? `<p><strong>餘款：</strong>NT$${Number(c.balance || 0).toLocaleString('zh-TW')}</p>` : ''}
      </div>
      ${isPresent(c.paymentNote) ? `<p><strong>攝影師備註（付款相關）：</strong>${escapeHtml(c.paymentNote)}</p>` : ''}
      <div class="portal-note" style="margin-top:var(--space-md);">
        <p><strong>Line Pay：</strong>可使用 Line Pay 支付訂金，請與攝影師確認付款方式。</p>
        <p><strong>銀行轉帳：</strong><br/>台新銀行（812）板橋分行<br/>分行代碼：0089<br/>帳號：20081000109398<br/>戶名：陳在紳</p>
        ${c.paymentEnablePaypal !== false ? '<p><strong>PayPal：</strong>海外用戶可使用 PayPal 支付訂金。<a href="https://paypal.me/bmpss96147/1800" target="_blank" rel="noopener noreferrer">付款連結一</a>、<a href="https://paypal.me/bmpss96147/2800" target="_blank" rel="noopener noreferrer">付款連結二</a></p>' : ''}
        <p><strong>微信支付：</strong>請加 WeChat 帳號：travelphotographer</p>
        ${c.paymentEnableWise !== false ? '<p><strong>WISE：</strong>海外用戶可支付約 USD 25（約 NT$800）作為訂金，實際匯率與手續費依平台顯示為準。</p>' : ''}
      </div>

      <h3 class="h3" style="margin-top:var(--space-lg);">填寫目前付款狀態</h3>
      <fieldset class="portal-fieldset">
        <legend class="sr-only">客戶目前付款狀態</legend>
        <label class="check-row"><input type="radio" name="paymentStatus" value="已匯款訂金" required /> 已匯款訂金</label>
        <label class="check-row"><input type="radio" name="paymentStatus" value="尚未匯款，稍後會完成訂金" /> 尚未匯款，稍後會完成訂金</label>
        <label class="check-row"><input type="radio" name="paymentStatus" value="想先確認合約內容，再完成訂金" /> 想先確認合約內容，再完成訂金</label>
        <label class="check-row"><input type="radio" name="paymentStatus" value="使用其他付款方式，已與攝影師確認" /> 使用其他付款方式，已與攝影師確認</label>
      </fieldset>
      <p class="muted" id="bank-last5-hint" hidden>若您選擇「已匯款訂金」，建議務必填寫匯款帳號末五碼，方便攝影師對帳（第一階段不會阻擋送出）。</p>
      <div class="portal-grid-2">
        <label class="field"><span>付款方式</span>
          <select name="paymentMethod">
            <option value="">請選擇</option>
            <option value="銀行轉帳">銀行轉帳</option>
            <option value="Line Pay">Line Pay</option>
            <option value="PayPal">PayPal</option>
            <option value="微信支付">微信支付</option>
            <option value="WISE">WISE</option>
            <option value="其他">其他</option>
          </select>
        </label>
        <label class="field"><span>匯款帳號末五碼</span><input type="text" name="bankLast5" maxlength="10" autocomplete="off" /></label>
        <label class="field"><span>付款金額（NT$）</span><input type="number" name="paymentAmount" min="0" step="1" value="${escapeHtml(depositDefault)}" /></label>
        <label class="field"><span>付款日期</span><input type="date" name="paymentDate" id="client-payment-date" /></label>
      </div>
      <label class="field"><span>付款備註</span><textarea name="paymentNote" rows="3" placeholder="例如：家人代匯、Line Pay 已付款、稍後晚上匯款"></textarea></label>
      <p class="muted">若已匯款，請填寫付款方式與末五碼，方便攝影師對帳。若尚未匯款，也可以先送出合約，請後續完成訂金並將末五碼傳給攝影師。</p>

      <h2 class="h2" style="margin-top:var(--space-xl);">客戶補充資料</h2>
      <div class="portal-grid-2">
        <label class="field"><span>攝影師如何稱呼爸爸</span><input name="fatherName" type="text" placeholder="例如：爸爸、John、阿宏" /></label>
        <label class="field"><span>攝影師如何稱呼媽媽</span><input name="motherName" type="text" placeholder="例如：媽媽、Amy、小君" /></label>
        <label class="field"><span>主要聯絡人姓名</span><input name="contactName" type="text" value="${escapeHtml(c.contactName || '')}" required /></label>
        <label class="field"><span>聯絡電話</span><input name="phone" type="text" value="${escapeHtml(c.phone || '')}" required /></label>
        <label class="field"><span>Email</span><input name="customerEmail" type="email" value="${escapeHtml(c.customerEmail || c.email || '')}" required /></label>
        <label class="field"><span>LINE 顯示名稱或 LINE ID</span><input name="lineName" type="text" value="${escapeHtml(c.lineName || '')}" /></label>
        <label class="field"><span>入鏡大人人數</span><input name="adultCount" type="number" min="0" value="${adultVal}" /></label>
        <label class="field"><span>入鏡小孩人數</span><input name="childCount" type="number" min="0" value="${childVal}" /></label>
      </div>
      <label class="field"><span>小朋友的年齡與稱呼</span><textarea name="childrenInfo" rows="3"></textarea></label>
      <label class="field"><span>簡單介紹一家人</span><textarea name="familyIntro" rows="4"></textarea></label>
      <label class="field"><span>特別想拍的畫面</span><textarea name="desiredShots" rows="4"></textarea></label>
      <label class="field"><span>需要攝影師注意的地方</span><textarea name="specialNotes" rows="4"></textarea></label>

      <h2 class="h2" style="margin-top:var(--space-xl);">合約確認與簽名</h2>
      <p class="muted">請確認上方預約資訊、訂金付款狀態與家庭補充資料。確認無誤後，請勾選合約確認項目並完成電子簽名。本頁送出後會產生 PDF 合約，作為本次親子寫真預約確認紀錄。</p>
      <label class="check-row"><input type="checkbox" name="usageConsentYes" value="yes" required /> 我同意攝影師可將本次拍攝作品作為作品集、網站、社群平台、行銷宣傳與攝影服務介紹使用。</label>
      <label class="check-row"><input type="checkbox" name="usageConsentNo" value="no" required /> 我不同意公開使用本次拍攝作品，僅供客戶私人保存。</label>
      <label class="check-row"><input type="checkbox" name="confirmBookingInfo" required /> 我已確認以上拍攝日期、時間、地點、方案與費用。</label>
      <label class="check-row"><input type="checkbox" name="confirmPaymentInfo" required /> 我已確認上方訂金匯款資訊，並已填寫目前付款狀態。</label>
      <label class="check-row"><input type="checkbox" name="confirmTerms" required /> 我已閱讀並同意本頁所載之服務內容與合約條款。</label>
      <label class="check-row"><input type="checkbox" name="confirmDeposit" required /> 我了解完成訂金付款後，攝影師才會正式保留拍攝檔期。</label>
      <label class="check-row"><input type="checkbox" name="confirmSignature" required /> 我確認以上填寫資料正確，並同意以電子簽名方式完成本次預約確認。</label>
      <div class="portal-grid-2">
        <label class="field"><span>簽名人姓名</span><input type="text" name="signerName" required /></label>
        <label class="field"><span>簽署日期</span><input type="date" id="client-signed-date" name="signedDate" required /></label>
      </div>
      <div class="signature-wrap">
        <canvas id="client-signature-canvas" aria-label="客戶手寫簽名區"></canvas>
      </div>
      <div class="signature-actions no-print">
        <button class="btn btn--secondary" type="button" id="client-clear-signature">清除簽名</button>
        <button class="btn btn--primary" type="button" id="client-confirm-signature">確認簽名</button>
      </div>
      <p class="muted" id="client-sign-state">尚未確認簽名</p>
      <p class="error-text" id="client-signature-error" hidden>請先完成電子簽名後再送出合約。</p>
      <input type="hidden" id="client-signature-image-base64" />
      <input type="hidden" id="client-signed-at" />

      <h2 class="h2" style="margin-top:var(--space-xl);">送出合約並產生 PDF</h2>
      <p class="muted no-print">送出後會產生合約 PDF；若已設定 Email API，系統會將 PDF 寄到您填寫的 Email 與攝影師信箱。</p>
      <div class="hero__actions no-print">
        <button class="btn btn--primary" type="submit" id="client-submit-contract">送出合約並產生 PDF</button>
      </div>
      <p class="muted no-print" id="client-submit-status"></p>
      <div class="hero__actions no-print" id="client-download-wrap" hidden>
        <button class="btn btn--secondary" type="button" id="client-download-pdf">下載合約 PDF</button>
      </div>
      <div class="card card--flat no-print" id="contract-email-fallback" hidden style="margin-top:var(--space-md);padding:var(--space-md);">
        <p class="muted" style="margin-top:0;">合約 PDF 已產生，但目前系統尚未完成自動寄信設定。請先下載 PDF，並透過 Line 傳給小巴老師，或等待攝影師協助確認。</p>
        <div class="hero__actions" style="flex-wrap:wrap;">
          <button class="btn btn--secondary" type="button" id="client-copy-photographer-email">複製攝影師 Email</button>
          <a class="btn btn--primary" id="client-fallback-line" href="${escapeHtml(site.lineUrl)}" target="_blank" rel="noopener noreferrer">開啟 Line 聯絡</a>
        </div>
      </div>
      <p class="error-text" id="client-form-error" hidden></p>
      <div class="client-contract-signed" id="signed-status-panel" hidden>
        <p><strong>合約處理完成</strong></p>
        <p>簽署時間：<span id="signed-at-text"></span></p>
        <img id="signed-image" alt="簽名影像" />
      </div>
    </form>
    <div id="contract-pdf-content" style="position:fixed;left:-10000px;top:0;width:820px;background:#fff;color:#111;padding:24px;z-index:-1;"></div>
  </article>

  <article class="card">
    <h2 class="h2">拍攝前準備</h2>
    <p>拍攝前可以先簡單準備服裝、孩子喜歡的小物、簡單點心與水。親子寫真的重點不是擺拍，而是讓家人在自然互動中留下真實表情。</p>
    <ul class="prose">
      <li>建議準備 1～2 套服裝</li>
      <li>家人服裝色系可以互相搭配，但不需要完全一樣</li>
      <li>小朋友可以帶喜歡的玩具或安撫小物</li>
      <li>可準備水、簡單點心、濕紙巾</li>
      <li>若有長輩或小小孩同行，請預留休息時間</li>
      <li>若孩子怕生，拍攝一開始會以陪玩和聊天為主，不會強迫擺拍</li>
    </ul>
  </article>

  <article class="card">
    <h2 class="h2">作品交件</h2>
    ${isPresent(c.deliveryStatus) ? `<p><strong>作品交件狀態：</strong>${escapeHtml(c.deliveryStatus)}</p>` : ''}
    ${c.driveFolderUrl || c.selectedPhotoUrl || c.videoUrl ? '' : '<p>拍攝完成後，照片整理與基本處理需要一些時間。完成後，攝影師會將雲端下載連結放在此頁，您可以隨時回到同一個專屬連結查看與下載。</p>'}
    <div class="delivery-actions">
      ${c.driveFolderUrl ? `<a class="btn btn--primary" href="${escapeHtml(c.driveFolderUrl)}" target="_blank" rel="noopener noreferrer">下載完整照片</a>` : ''}
      ${c.selectedPhotoUrl ? `<a class="btn btn--secondary" href="${escapeHtml(c.selectedPhotoUrl)}" target="_blank" rel="noopener noreferrer">查看精選照片</a>` : ''}
      ${c.videoUrl ? `<a class="btn btn--secondary" href="${escapeHtml(c.videoUrl)}" target="_blank" rel="noopener noreferrer">觀看影片</a>` : ''}
    </div>
    ${isPresent(c.deliveryNote) ? `<p class="portal-note">${escapeHtml(c.deliveryNote)}</p>` : '<p class="portal-note">照片完成後會提供雲端下載連結。建議收到連結後先下載備份至自己的電腦或雲端硬碟，避免日後連結過期或雲端空間調整。</p>'}
  </article>

  <article class="card">
    <h2 class="h2">聯絡攝影師</h2>
    <p>如果合約內容、付款方式、拍攝地點或作品下載有任何問題，請直接聯繫攝影師。</p>
    <div class="hero__actions">
      <a class="btn btn--primary" href="${site.lineUrl}" target="_blank" rel="noopener noreferrer">Line 詢問</a>
      <a class="btn btn--secondary" href="${site.phoneTel}">電話聯絡</a>
      <a class="btn btn--secondary" href="mailto:${escapeHtml(site.email)}">Email 聯絡</a>
    </div>
    <p class="muted">Line／電話：0911-252-302<br/>WhatsApp：+886 911252302<br/>E-mail：${escapeHtml(site.email)}</p>
  </article>
</section>`;

    const html = renderPage(cfg, {
      title: `${c.clientName}｜親子寫真預約與合約`,
      description: '這是小巴老師為本次拍攝建立的專屬頁面，請依攝影師提供的連結確認預約、訂金、合約與作品交件資訊。',
      canonical: `${site.url}/clients/${c.slug}/`,
      body,
      ogImage: '/assets/images/og/default.svg',
      noIndex: true,
      hideAdminFooterLink: true,
      clientPortal: true,
    })
      .replace('</head>', '  <link rel="stylesheet" href="/assets/css/client-portal.css" />\n</head>')
      .replace(
        '</body>',
        '  <script src="https://cdn.jsdelivr.net/npm/signature_pad@5.0.4/dist/signature_pad.umd.min.js"></script>\n  <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>\n  <script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>\n  <script src="/assets/js/client-contract-sign.js"></script>\n</body>',
      );
    writeRouteHtml(`/clients/${c.slug}`, html);
  }

  const portfolioClients = clients.filter((c) => c.portfolioPublish === true);
  for (const c of portfolioClients) {
    const storyHtml = marked.parse(c.bodyMd || '');
    const cover = normImg(c.coverImage || '', DEFAULT_IMG);
    const publicBody = `<nav class="container section" style="padding-bottom:0;"><div class="muted"><a href="/">首頁</a> / <a href="/works/">作品案例</a> / <span>${escapeHtml(c.clientName)}</span></div></nav>
<section class="hero hero--compact"><div class="hero__bg" style="background-image:url('${escapeHtml(cover)}')"></div><div class="hero__overlay"></div><div class="hero__inner"><h1 class="hero__title">${escapeHtml(c.title)}</h1>${isPresent(c.shootingDate) || isPresent(c.location) ? `<p class="hero__sub">${escapeHtml([c.shootingDate, c.location].filter(Boolean).join(' · '))}</p>` : ''}</div></section>
<section class="container section prose">${storyHtml}</section>`;
    writeRouteHtml(
      `/works/client-${c.slug}`,
      renderPage(cfg, {
        title: c.title,
        description: `${c.clientName} 親子寫真拍攝故事`,
        canonical: `${site.url}/works/client-${c.slug}/`,
        body: publicBody,
        ogImage: cover,
        noIndex: false,
      }),
    );
    extraSitemapUrls.push(`${site.url}/works/client-${c.slug}/`);
  }

  /* ----- services ----- */
  const services = loadServiceDefs();
  const svcIndexCards = services
    .map(
      (s) => `<a class="loc-card card card--flat" href="/services/${escapeHtml(s.slug)}/"><span class="loc-card__title">${escapeHtml(s.title)}</span><span class="loc-card__sub muted">${escapeHtml(s.summary)}</span></a>`,
    )
    .join('');

  const servicesIndexBody = `<nav class="container section" style="padding-bottom:0;"><div class="muted"><a href="/">首頁</a> / <span>服務方案</span></div></nav>
<section class="hero hero--compact"><div class="hero__bg" style="background-image:url('${normImg('/public/images/wix-import/taiwan-camping-glamping-family/taiwan-camping-glamping-family-outdoor-lifestyle-01.jpg')}')"></div><div class="hero__overlay"></div><div class="hero__inner">
<h1 class="hero__title">親子寫真服務方案</h1>
<p class="hero__sub">依旅行方式與家庭需求選擇台灣旅拍、海外旅拍、露營民宿、活動紀錄與孕婦／三代同堂主題。</p>
</div></section>
<div class="container section"><div class="loc-grid">${svcIndexCards}</div></div>
<section class="container section card card--flat"><h2 class="h2">需要建議？</h2><div class="hero__actions"><a class="btn btn--primary" href="${site.lineUrl}" target="_blank">加 Line</a><a class="btn btn--secondary" href="/faq/">常見問題</a></div></section>`;

  writeRouteHtml(
    '/services',
    renderPage(cfg, {
      title: '親子寫真服務方案｜小巴老師',
      description: '台灣親子旅拍、海外旅拍、露營團拍、家庭活動紀錄與孕婦寶寶方案總覽。',
      canonical: `${site.url}/services/`,
      body: servicesIndexBody,
      ogImage: normImg('/public/images/wix-import/taiwan-taipei-family-portrait/taiwan-taipei-family-portrait-outdoor-lifestyle-01.jpg'),
    }),
  );
  extraSitemapUrls.push(`${site.url}/services/`);

  for (const s of services) {
    const prose = marked.parse(s.bodyMd || '');
    const rw = relatedWorksHtml(s.relatedWorks, workBySlug);
    const ra = relatedArticlesHtml(s.relatedArticles, artBySlug);
    const hero = normImg(s.heroImage);
    const body = `<nav class="container section" style="padding-bottom:0;"><div class="muted"><a href="/">首頁</a> / <a href="/services/">服務方案</a> / <span>${escapeHtml(s.title)}</span></div></nav>
<section class="hero" style="min-height:320px;margin-bottom:0;border-radius:0;"><div class="hero__bg" style="background-image:url('${escapeHtml(hero)}')"></div><div class="hero__overlay"></div><div class="hero__inner"><h1 class="hero__title">${escapeHtml(s.title)}</h1><p class="hero__sub">${escapeHtml(s.summary)}</p></div></section>
<div class="container section prose">${prose}</div>
${rw}
${ra}
<section class="container section card card--flat"><div class="hero__actions"><a class="btn btn--primary" href="${site.lineUrl}" target="_blank">Line 諮詢</a><a class="btn btn--secondary" href="/works/">看作品</a><a class="btn btn--secondary" href="/articles/">看文章</a></div></section>`;

    writeRouteHtml(
      `/services/${s.slug}`,
      renderPage(cfg, {
        title: s.seoTitle,
        description: s.seoDescription,
        canonical: `${site.url}/services/${s.slug}/`,
        body,
        ogImage: hero,
      }),
    );
    extraSitemapUrls.push(`${site.url}/services/${s.slug}/`);
  }

  /* ----- static hub routes ----- */
  const aboutBody = `<nav class="container section" style="padding-bottom:0;"><div class="muted"><a href="/">首頁</a> / <span>關於小巴老師</span></div></nav>
<section class="hero hero--compact"><div class="hero__bg" style="background-image:url('/assets/images/og/default.svg')"></div><div class="hero__overlay"></div><div class="hero__inner"><h1 class="hero__title">關於小巴老師</h1>
<p class="hero__sub">全外拍自然互動、海外旅拍經驗豐富，長期服務親子與家庭品牌影像。</p></div></section>
<div class="container section prose">
<p>小巴老師專注親子寫真與家庭旅拍，相信照片應該留下真實互動與旅行中的情感，而非僵硬擺拍。</p>
<h2 class="h2">經歷與特色</h2>
<ul><li>多年全職攝影與團隊協作經驗</li><li>海外親子旅拍實績涵蓋日本、沖繩、韓國、新加坡、澳洲等地</li><li>自然光與戶外場景取向，可依家庭節奏安排行程</li></ul>
<p>更完整的文字與作品整理也可參考：<a href="/pages/about-ba-wei/">完整關於頁（遷移版）</a>。</p>
</div>`;
  writeRouteHtml(
    '/about',
    renderPage(cfg, {
      title: '關於小巴老師｜親子寫真攝影師',
      description: '小巴老師親子寫真與家庭旅拍理念、經歷與服務特色。',
      canonical: `${site.url}/about/`,
      body: `${jsonLdBreadcrumb(['首頁', '關於小巴老師'])}${aboutBody}`,
      ogImage: '/assets/images/og/default.svg',
    }),
  );
  extraSitemapUrls.push(`${site.url}/about/`);

  const faqTeaser = `<nav class="container section" style="padding-bottom:0;"><div class="muted"><a href="/">首頁</a> / <span>常見問題</span></div></nav>
<section class="hero hero--compact"><div class="hero__bg" style="background-image:url('/assets/images/og/default.svg')"></div><div class="hero__overlay"></div><div class="hero__inner"><h1 class="hero__title">常見問題</h1>
<p class="hero__sub">整理行程、外拍差異、下雨與交件等常見問題；完整內容請見詳細頁。</p></div></section>
<div class="container section prose">
<p>若你想先看最完整的 FAQ（含長篇整理），請前往：<a href="/pages/faq/">完整 FAQ 頁面</a>。</p>
</div>`;
  writeRouteHtml(
    '/faq',
    renderPage(cfg, {
      title: '常見問題｜親子寫真 FAQ',
      description: '親子寫真與家庭旅拍常見問題入口。',
      canonical: `${site.url}/faq/`,
      body: faqTeaser,
      ogImage: '/assets/images/og/default.svg',
    }),
  );
  extraSitemapUrls.push(`${site.url}/faq/`);

  let contactTpl = '';
  try {
    contactTpl = readFileSync(join(ROOT, 'templates/fixed/contact.html'), 'utf8')
      .replace(/\{\{LINE_URL\}\}/g, site.lineUrl)
      .replace(/\{\{WECHAT\}\}/g, site.wechat)
      .replace(/\{\{EMAIL\}\}/g, site.email)
      .replace(/\{\{WHATSAPP_URL\}\}/g, site.whatsappUrl);
  } catch {
    contactTpl = '<section class="container section"><p>聯絡表單</p></section>';
  }
  writeRouteHtml(
    '/contact',
    renderPage(cfg, {
      title: '聯絡預約｜小巴老師親子寫真',
      description: '預約親子寫真、家庭旅拍或詢問檔期與報價。',
      canonical: `${site.url}/contact/`,
      body: `<nav class="container section" style="padding-bottom:0;"><div class="muted"><a href="/">首頁</a> / <span>聯絡預約</span></div></nav>${contactTpl}`,
      ogImage: '/assets/images/og/default.svg',
    }),
  );
  extraSitemapUrls.push(`${site.url}/contact/`);

  const familyContractHtml = renderPage(cfg, {
    title: '親子寫真合約產生系統',
    description: '本頁已改為後台路由，將導向親子寫真合約產生系統。',
    canonical: `${site.url}/family-contract/`,
    body: `<section class="container section card card--flat"><h1 class="h1">親子寫真合約產生系統</h1><p class="muted">本頁已移轉至後台合約管理，系統將自動前往 <code>/admin/contracts/</code>。</p><p><a class="btn btn--primary" href="/admin/contracts/">前往後台合約系統</a></p></section><script>location.replace('/admin/contracts/');</script>`,
    noIndex: true,
    ogImage: '/assets/images/og/default.svg',
  });
  writeRouteHtml('/family-contract', familyContractHtml);

  const adminRows = clients
    .map((c) => {
      const portfolioLink = c.portfolioPublish ? `/works/client-${c.slug}/` : '';
      return `<tr>
<td>${escapeHtml(c.status || 'active')}</td>
<td>${escapeHtml(c.clientName)}</td>
<td>${escapeHtml(c.shootingDate || '')}</td>
<td>${escapeHtml(c.packageName || '')}</td>
<td>${escapeHtml(c.contractStatus || '')}</td>
<td>${escapeHtml(c.paymentStatus || '')}</td>
<td>${escapeHtml(c.deliveryStatus || '')}</td>
<td>${c.portfolioPublish ? '是' : '否'}</td>
<td><a href="/clients/${escapeHtml(c.slug)}/" target="_blank" rel="noopener noreferrer">/clients/${escapeHtml(c.slug)}/</a></td>
<td>${portfolioLink ? `<a href="${escapeHtml(portfolioLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(portfolioLink)}</a>` : ''}</td>
</tr>`;
    })
    .join('');

  const mdTemplatePath = join(ROOT, 'src/content/clients/_client-template.md');
  const legacyTemplatePath = join(ROOT, 'content/clients/_template.md');
  const mdTemplate = existsSync(mdTemplatePath)
    ? readFileSync(mdTemplatePath, 'utf8')
    : existsSync(legacyTemplatePath)
      ? readFileSync(legacyTemplatePath, 'utf8')
      : '';

  const adminClientsBody = `<section class="admin-hero">
  <div class="admin-wrap">
    <h1 class="h1">親子寫真客戶案件管理</h1>
    <p class="lead">本系統採用 Markdown 檔案式管理。每一組客戶案件都是一個獨立的 MD 檔案，可用來產生客戶專區、合約確認頁、作品交件頁，也可以在結案後選擇轉為公開作品集文章。</p>
    <p class="admin-warning">這裡是攝影師內部管理頁，不是給客戶看的頁面。新增或修改客戶案件時，請在專案的 clients Markdown 資料夾中建立或編輯對應 .md 檔案。</p>
  </div>
</section>
<section class="container section admin-wrap" id="admin-clients-root">
  <article class="card">
    <h2 class="h2">狀態篩選</h2>
    <p class="muted">建議用以下狀態管理進度：詢問中、已報價、已收訂、已簽約、已拍攝、修圖中、已交件、已結案。</p>
  </article>
  <article class="card">
    <h2 class="h2">客戶案件列表</h2>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>狀態</th><th>客戶名稱</th><th>拍攝日期</th><th>拍攝方案</th><th>合約狀態</th><th>付款狀態</th><th>交件狀態</th><th>是否公開作品集</th><th>客戶專區連結</th><th>作品集連結</th>
          </tr>
        </thead>
        <tbody id="admin-client-list-body">${adminRows}</tbody>
      </table>
    </div>
  </article>

  <article class="card">
    <h2 class="h2">如何新增客戶案件</h2>
    <ol class="prose">
      <li>複製一份既有的客戶 MD 範本。</li>
      <li>將檔名改成「客戶代稱-拍攝日期.md」，slug 預設使用「yyyy-mm-dd + 主題」，例如：2026-01-01family。</li>
      <li>修改 frontmatter 中的拍攝日期、方案、費用、地點、付款狀態與合約狀態；若同日期 slug 已存在，請依內容更換後綴主題名稱。</li>
      <li>儲存後網站會自動產生客戶專區。</li>
      <li>將客戶專區連結傳給客人即可完成合約確認與後續交件。</li>
    </ol>
    <p class="muted">客戶 Markdown 路徑：<code>src/content/clients/*.md</code>（舊版相容：<code>content/clients/*.md</code>）</p>
  </article>

  <article class="card">
    <h2 class="h2">從 LINE／訊息對話產生客戶 MD</h2>
    <ol class="prose">
      <li>複製與客戶討論的 LINE、Messenger、Email 或電話紀錄摘要。</li>
      <li>打開 Cursor。</li>
      <li>貼上對話，並輸入：「請使用 Family Client MD Generator，根據這段對話建立新的 content/clients Markdown 客戶案件。」</li>
      <li>Cursor 會自動讀取 docs/family-service-knowledge.md，判斷方案、價格、成品、包車、付款與待確認事項。</li>
      <li>Cursor 會產生一個新的客戶 MD。</li>
      <li>網站會根據該 MD 產生客戶專屬合約與作品交件頁。</li>
      <li>檢查後，把單一客戶頁連結傳給客戶。</li>
    </ol>
  </article>

  <article class="card">
    <h2 class="h2">複製客戶案件 MD 範本</h2>
    <p class="muted">空白欄位可以刪除，不一定要保留。前端會自動隱藏空欄位。</p>
    <div class="admin-actions">
      <button class="btn btn--secondary" type="button" id="copy-client-md-template">複製客戶案件 MD 範本</button>
      <span class="muted" id="copy-template-status"></span>
    </div>
    <textarea class="admin-template-box" id="client-md-template" rows="24" readonly>${escapeHtml(mdTemplate)}</textarea>
  </article>
</section>`;

  const adminClientsHtml = renderPage(cfg, {
    title: '親子寫真客戶案件管理',
    description: '本系統採 Markdown 檔案式管理，客戶案件由 MD frontmatter 生成客戶專區與作品資料。',
    canonical: `${site.url}/admin/clients/`,
    body: adminClientsBody,
    noIndex: true,
    ogImage: '/assets/images/og/default.svg',
  })
    .replace('</head>', '  <link rel="stylesheet" href="/assets/css/admin-clients.css" />\n</head>')
    .replace('</body>', '  <script src="/assets/js/admin-auth.js"></script>\n  <script src="/assets/js/admin-clients.js"></script>\n</body>');
  writeRouteHtml('/admin/clients', adminClientsHtml);

  const adminHomeBody = `<section class="admin-hero"><div class="admin-wrap"><h1 class="h1">小巴老師｜親子寫真後台</h1><p class="lead">此區為攝影師內部使用，請輸入後台密碼。</p></div></section>
<section class="container section admin-wrap">
<article class="card"><h2 class="h2">客戶與攝影師後台管理系統</h2><ul class="prose">
<li><a href="/admin/clients/">客戶案件管理</a></li>
<li><a href="/admin/contracts/">合約產生系統</a></li>
<li><a href="/admin/deliveries/">作品交件管理</a></li>
</ul></article>
<article class="card"><h2 class="h2">從 LINE 對話產生客戶 MD</h2><p>在 Cursor 貼上客戶對話，使用 Family Client MD Generator 產生 <code>content/clients/*.md</code> 或 <code>src/content/clients/*.md</code>。</p></article>
<article class="card"><h2 class="h2">服務知識庫</h2><p><code>docs/family-service-knowledge.md</code> 是判斷方案、價格、成品、付款與條款的規則來源。</p></article>
<article class="card"><h2 class="h2">客戶頁分享流程</h2><p>客戶頁僅透過專屬連結分享，不公開、不收錄、不進 sitemap。</p></article>
<article class="card"><h2 class="h2">系統設定</h2><p><a href="/admin/settings/">前往後台設定頁</a></p></article>
</section>`;
  const adminHomeHtml = renderPage(cfg, {
    title: '小巴老師｜親子寫真後台',
    description: '攝影師內部客戶案件、合約與交件管理入口。',
    canonical: `${site.url}/admin/`,
    body: adminHomeBody,
    noIndex: true,
    ogImage: '/assets/images/og/default.svg',
  }).replace('</body>', '  <script src="/assets/js/admin-auth.js"></script>\n</body>');
  writeRouteHtml('/admin', adminHomeHtml);

  const adminContractsBody = `<section class="admin-hero"><div class="admin-wrap"><h1 class="h1">親子寫真合約產生系統</h1><p class="lead">此頁為攝影師內部流程說明，不提供客戶公開填寫。</p></div></section>
<section class="container section admin-wrap">
<article class="card"><h2 class="h2">合約產生流程</h2><ol class="prose">
<li>在 Cursor 貼上客戶對話或拍攝需求。</li><li>Cursor 依照 <code>docs/family-service-knowledge.md</code> 判斷方案、價格、成品、付款、特殊條款。</li><li>Cursor 產生 <code>content/clients/[slug].md</code>。</li><li>網站依 MD 自動產生客戶專屬頁。</li><li>檢查內容後，把單一客戶頁連結傳給客戶。</li><li>客戶只會看到自己的合約確認與交件頁。</li></ol></article>
<article class="card"><h2 class="h2">合約頁包含</h2><ul class="prose"><li>拍攝日期、時間、地點、方案</li><li>總費用、訂金、尾款、成品內容</li><li>付款方式、合約確認、電子簽名</li><li>作品公開授權、拍攝前準備、拍攝後交件連結</li></ul></article>
<article class="card"><h2 class="h2">不要公開的內容</h2><ul class="prose"><li>全部客戶列表與其他客戶資料</li><li>客戶電話與 Email</li><li>內部備註與完整對話紀錄</li><li>成本與內部報價判斷</li></ul></article>
</section>`;
  const adminContractsHtml = renderPage(cfg, {
    title: '親子寫真合約產生系統',
    description: '攝影師內部合約建立與客戶專屬頁分享流程。',
    canonical: `${site.url}/admin/contracts/`,
    body: adminContractsBody,
    noIndex: true,
    ogImage: '/assets/images/og/default.svg',
  }).replace('</body>', '  <script src="/assets/js/admin-auth.js"></script>\n</body>');
  writeRouteHtml('/admin/contracts', adminContractsHtml);

  const adminDeliveriesBody = `<section class="admin-hero"><div class="admin-wrap"><h1 class="h1">作品交件管理</h1><p class="lead">此頁為攝影師內部交件流程說明。</p></div></section>
<section class="container section admin-wrap">
<article class="card"><h2 class="h2">作品交件流程</h2><ol class="prose">
<li>拍攝完成後，在客戶 MD 補上 <code>driveFolderUrl</code>、<code>videoUrl</code>、<code>deliveryStatus</code>。</li>
<li><code>deliveryStatus</code> 可使用：尚未拍攝、整理中、修圖中、已交件、已結案。</li>
<li>客戶專屬頁會顯示照片下載連結與影片連結。</li>
<li>客戶收到連結後回到同一個專屬頁查看。</li>
<li>交件頁維持 <code>noindex</code>，不出現在 sitemap。</li>
</ol></article>
</section>`;
  const adminDeliveriesHtml = renderPage(cfg, {
    title: '作品交件管理',
    description: '攝影師內部交件流程與狀態管理說明。',
    canonical: `${site.url}/admin/deliveries/`,
    body: adminDeliveriesBody,
    noIndex: true,
    ogImage: '/assets/images/og/default.svg',
  }).replace('</body>', '  <script src="/assets/js/admin-auth.js"></script>\n</body>');
  writeRouteHtml('/admin/deliveries', adminDeliveriesHtml);

  const adminSettingsHtml = renderPage(cfg, {
    title: '後台設定',
    description: '後台設定與環境說明。',
    canonical: `${site.url}/admin/settings/`,
    body: `<section class="container section card card--flat"><h1 class="h1">後台設定</h1><p class="muted">此頁預留後續整合 Cloudflare Pages Functions / Access 與權限控管。</p></section>`,
    noIndex: true,
    ogImage: '/assets/images/og/default.svg',
  }).replace('</body>', '  <script src="/assets/js/admin-auth.js"></script>\n</body>');
  writeRouteHtml('/admin/settings', adminSettingsHtml);

  const sitemapHtmlBody = `<nav class="container section"><h1 class="h1">網站地圖</h1>
<ul class="prose">
<li><a href="/">首頁</a></li>
<li><a href="/services/">服務方案</a></li>
<li><a href="/works/">作品</a></li>
<li><a href="/articles/">文章</a></li>
<li><a href="/faq/">FAQ</a></li>
<li><a href="/about/">關於</a></li>
<li><a href="/contact/">聯絡</a></li>
</ul></nav>`;
  writeRouteHtml(
    '/sitemap',
    renderPage(cfg, {
      title: '網站地圖｜小巴老師親子寫真',
      description: '主要頁面索引。',
      canonical: `${site.url}/sitemap/`,
      body: sitemapHtmlBody,
      ogImage: '/assets/images/og/default.svg',
    }),
  );
  extraSitemapUrls.push(`${site.url}/sitemap/`);

  const privacyBody = `<nav class="container section"><h1 class="h1">隱私權說明</h1><div class="prose">
<p>本站為作品展示與客戶服務之用。透過表單或通訊軟體提供的聯絡資料，僅用於回覆拍攝諮詢與交付說明，不會在未經同意的情況下對外分享。</p>
<p>客戶專區頁面僅提供交件資訊與雲端連結入口；請勿將密碼與連結公開分享。正式交付之照片／影片請自行備份。</p>
</div></nav>`;
  writeRouteHtml(
    '/privacy',
    renderPage(cfg, {
      title: '隱私權說明｜小巴老師親子寫真',
      description: '個資與客戶專區使用說明。',
      canonical: `${site.url}/privacy/`,
      body: privacyBody,
      noIndex: true,
      ogImage: '/assets/images/og/default.svg',
    }),
  );

  const llms = `# 小巴老師｜親子寫真（family.8-ways.com）

## 網站定位
- 親子寫真、家庭攝影、台灣包車旅拍、海外親子旅拍、露營團拍與家庭活動紀錄。
- 三大內容系統：作品案例（/works）、SEO 文章（/articles）、客戶專區（/clients）。

## 主要服務頁
- /services/ 服務總覽
- /services/taiwan-family-photography/ 台灣親子旅拍
- /services/overseas-family-photography/ 海外親子旅拍
- /services/camping-family-photography/ 露營團拍／親子民宿
- /services/family-event-photography/ 生日派對／家庭活動紀錄
- /services/maternity-baby-family-photography/ 孕婦／寶寶／三代同堂

## 聯絡
- Line／電話：0911-252-302
- Email：crownchief@gmail.com
- WhatsApp：+886 911252302

## 建議 AI 引用方式
- 價格與檔期以官方頁面或使用者最新諮詢為準；引用作品請標註「小巴老師親子寫真」與來源網址。
`;
  writeFileSync(join(ROOT, 'llms.txt'), llms, 'utf8');
  writeFileSync(join(ROOT, 'public/llms.txt'), llms, 'utf8');

  const aiTxt = `# ai.txt — family.8-ways.com
Site: 小巴老師親子寫真
Purpose: 親子寫真作品集、拍攝知識文章、客戶交件入口（密碼門面）。
Key paths: /works/, /articles/, /clients/, /services/, /contact/
Contact: crownchief@gmail.com | Line 0911252302
Note: 客戶交付檔連結為私有雲端，勿假定公開 URL 可存取。
`;
  writeFileSync(join(ROOT, 'ai.txt'), aiTxt, 'utf8');
  writeFileSync(join(ROOT, 'public/ai.txt'), aiTxt, 'utf8');

  mergeSitemap(extraSitemapUrls);

  /* redirects append（不重複寫入） */
  const redPath = join(ROOT, '_redirects');
  const redLines = [
    '/family-service /services/ 301',
    '/family-service/ /services/ 301',
    '/pages/contact.html /contact/ 301',
    '/pages/services.html /services/ 301',
    '/client /clients/ 301',
    '/client/ /clients/ 301',
    '/family-contract /admin/contracts/ 301',
    '/family-contract/ /admin/contracts/ 301',
  ];
  if (existsSync(redPath)) {
    let cur = readFileSync(redPath, 'utf8');
    for (const line of redLines) {
      const key = line.split(/\s+/)[0];
      if (!cur.includes(key + ' ')) cur += `${line}\n`;
    }
    writeFileSync(redPath, cur, 'utf8');
    writeFileSync(join(ROOT, 'public', '_redirects'), cur, 'utf8');
  }

  console.error('hub pages OK');
}

function main() {
  const mode = process.argv[2] || 'pages';
  if (mode === 'prepare') runPrepare();
  else if (mode === 'pages') runPages();
  else {
    console.error('Usage: node scripts/build-hub.mjs [prepare|pages]');
    process.exit(1);
  }
}

main();
