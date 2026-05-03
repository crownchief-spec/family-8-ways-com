#!/usr/bin/env node
/**
 * 由 content/*.md 與 templates/fixed/*.html 產出靜態 HTML（無 Astro）
 */
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { marked } from 'marked';
import crypto from 'crypto';
import { loadSiteConfig, renderPage, escapeHtml } from './render.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const cfg = loadSiteConfig();
const { site } = cfg;
const INTERNAL_FALLBACK_IMAGE =
  '/public/images/wix-import/taiwan-taipei-family-portrait/taiwan-taipei-family-portrait-outdoor-lifestyle-01.jpg';

const CASE_IMAGE_BY_SLUG = {
  'three-generations-family':
    '/public/images/wix-import/theme-three-generation-grandparent-family/theme-three-generation-grandparent-family-outdoor-lifestyle-01.jpg',
  'okinawa-family-trip':
    '/public/images/wix-import/japan-okinawa-beach-family/japan-okinawa-beach-family-outdoor-lifestyle-01.jpg',
  'kyoto-kimono-family':
    '/public/images/wix-import/theme-kimono-hanbok-costume-family/theme-kimono-hanbok-costume-family-outdoor-lifestyle-01.jpg',
  'taipei-family-portrait':
    '/public/images/wix-import/taiwan-taipei-family-portrait/taiwan-taipei-family-portrait-outdoor-lifestyle-01.jpg',
  'yilan-forest-family':
    '/public/images/wix-import/taiwan-yilan-family-portrait/taiwan-yilan-family-portrait-outdoor-lifestyle-01.jpg',
  'taichung-golden-hour':
    '/public/images/wix-import/taiwan-taichung-family-portrait/taiwan-taichung-family-portrait-outdoor-lifestyle-01.jpg',
  'tamsui-riverside':
    '/public/images/wix-import/taiwan-tamsui-tamsui-river-family/taiwan-tamsui-tamsui-river-family-outdoor-lifestyle-01.jpg',
  'baby-park-outdoor':
    '/public/images/wix-import/taiwan-animal-farm-family/taiwan-animal-farm-family-outdoor-lifestyle-01.jpg',
  'hong-kong-family-taiwan-trip':
    '/public/images/wix-import/taiwan-taipei-family-portrait/taiwan-taipei-family-portrait-outdoor-lifestyle-02.jpg',
};

const REVIEW_IMAGE_BY_LOCATION = {
  宜蘭: '/public/images/wix-import/taiwan-yilan-family-portrait/taiwan-yilan-family-portrait-outdoor-lifestyle-02.jpg',
  沖繩: '/public/images/wix-import/japan-okinawa-beach-family/japan-okinawa-beach-family-outdoor-lifestyle-02.jpg',
  台北: '/public/images/wix-import/taiwan-taipei-family-portrait/taiwan-taipei-family-portrait-outdoor-lifestyle-03.jpg',
  台中: '/public/images/wix-import/taiwan-taichung-family-portrait/taiwan-taichung-family-portrait-outdoor-lifestyle-02.jpg',
};

const CLIENT_IMAGE_BY_SLUG = {
  'demo-client-1': '/public/images/wix-import/japan-okinawa-beach-family/japan-okinawa-beach-family-outdoor-lifestyle-03.jpg',
  'demo-client-2': '/public/images/wix-import/taiwan-birthday-party-family/taiwan-birthday-party-family-outdoor-lifestyle-01.jpg',
};

function injectSite(html) {
  return html
    .replace(/\{\{LINE_URL\}\}/g, site.lineUrl)
    .replace(/\{\{WECHAT\}\}/g, site.wechat)
    .replace(/\{\{EMAIL\}\}/g, site.email)
    .replace(/\{\{WHATSAPP_URL\}\}/g, site.whatsappUrl)
    .replace(/\{\{PHONE\}\}/g, site.phone);
}

marked.setOptions({ mangle: false, headerIds: false });

function sha256(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

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

function slugOf(entry) {
  return entry.data.slug || entry.base;
}

/** 作品集 location → 地區頁 */
const portfolioLocationToPage = {
  沖繩: 'okinawa',
  京都: 'kansai',
  台北: 'taipei',
  淡水: 'tamsui',
  宜蘭: 'yilan',
  台中: 'taichung',
};

function hrefForPortfolioLocation(location) {
  const slug = portfolioLocationToPage[location];
  return slug ? `/locations/${slug}.html` : '/locations/index.html';
}

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

function writeHtml(relPath, html) {
  const full = join(ROOT, relPath);
  ensureDir(dirname(full));
  writeFileSync(full, html, 'utf8');
  console.error('write', relPath);
}

function loadFixed(name) {
  const p = join(ROOT, 'templates', 'fixed', name);
  return injectSite(readFileSync(p, 'utf8'));
}

function normalizeImageSource(src, fallback = INTERNAL_FALLBACK_IMAGE) {
  if (!src || typeof src !== 'string') return fallback;
  const trimmed = src.trim();
  // 舊內容常用 /images/...，實際檔案在 /public/images/...
  if (trimmed.startsWith('/images/')) return `/public${trimmed}`;
  // 僅接受站內相對路徑，避免引用外部圖源。
  if (trimmed.startsWith('/')) return trimmed;
  return fallback;
}

function cardHtml(href, title, excerpt, location, tags, cover) {
  const safeCover = normalizeImageSource(cover);
  const alt = `${title}｜${location} 親子寫真與家庭寫真`;
  const tagSpans = tags
    .slice(0, 4)
    .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
    .join('');
  return `<a class="pcard" href="${escapeHtml(href)}">
  <div class="pcard__media"><img src="${escapeHtml(safeCover)}" alt="${escapeHtml(alt)}" title="${escapeHtml(alt)}" loading="lazy" width="640" height="420" /></div>
  <div class="pcard__body">
    <p class="pcard__loc muted">${escapeHtml(location)}</p>
    <h3 class="pcard__title">${escapeHtml(title)}</h3>
    <p class="pcard__excerpt muted">${escapeHtml(excerpt)}</p>
    <div class="pcard__tags">${tagSpans}</div>
  </div>
</a>`;
}

function buildCasePages(entries) {
  const sorted = entries
    .filter((e) => !e.data.draft)
    .sort((a, b) => (a.data.date < b.data.date ? 1 : -1));

  const listCards = sorted
    .map((e) => {
      const slug = slugOf(e);
      const tags = [...(e.data.category || []), ...(e.data.tags || [])];
      return `<div class="pf-item" data-type="${escapeHtml((e.data.category || []).join(' '))}" data-tags="${escapeHtml(tags.join(' '))}" data-region="${escapeHtml(e.data.location)}">${cardHtml(`/case/${slug}.html`, e.data.title, e.data.excerpt, e.data.location, tags, e.data.cover)}</div>`;
    })
    .join('\n');

  const typeLabels = [
    '親子寫真',
    '家庭寫真',
    '孕婦寫真',
    '寶寶寫真',
    '三代同堂',
    '生日派對',
    '畢業照 / 成長紀錄',
    '香港家庭來台拍攝',
    '台灣旅行跟拍',
  ];
  const themeLabels = [
    '草地 / 森林',
    '黃昏 / 日暮',
    '海邊 / 玩水',
    '和服 / 韓服 / 旗袍',
    '夜拍 / 聖誕節 / 煙火',
    '室內 / 飯店 / villa',
    '櫻花 / 繡球花',
    '楓葉 / 銀杏 / 落羽松',
    '雨中 / 水中',
    '寶寶 / 三代同堂',
  ];
  const regions = [...new Set(sorted.map((i) => i.data.location))].sort();

  const chips = (group, labels) =>
    `<div class="chips" data-filter-group="${group}"><button type="button" class="chip is-active" data-value="all">全部</button>${labels.map((t) => `<button type="button" class="chip" data-value="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('')}</div>`;

  const caseIndexBody = `${loadFixed('_case-hero.html')}
<div class="container section">
  <h2 class="h2">依你喜歡的方式來看作品</h2>
  <div class="prose muted"><p>我一直很喜歡用「故事」來看每一次拍攝。你可以用拍攝類型、地區或場景主題來看。</p></div>
  <h3 class="h3" style="margin-top:var(--space-lg);">依拍攝類型</h3>
  ${chips('type', typeLabels)}
</div>
<div class="container section" style="padding-top:0;">
  <h3 class="h3">依場景主題</h3>
  <div class="chips chips--wrap" data-filter-group="theme">
  <button type="button" class="chip is-active" data-value="all">全部</button>${themeLabels.map((t) => `<button type="button" class="chip" data-value="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('')}
  </div>
</div>
<div class="container section" style="padding-top:0;">
  <h3 class="h3">依地區</h3>
  <div class="chips" data-filter-group="region">
  <button type="button" class="chip is-active" data-value="all">全部</button>${regions.map((r) => `<button type="button" class="chip" data-value="${escapeHtml(r)}">${escapeHtml(r)}</button>`).join('')}
  </div>
</div>
<div class="container section" style="padding-top:0;">
  <h2 class="h2">最新作品與精選案例</h2>
  <div class="grid-2" id="portfolio-grid">${listCards}</div>
  <p class="muted" id="portfolio-empty" hidden style="text-align:center;padding:2rem;">此條件目前沒有作品。</p>
</div>
<script>
(function(){var groups={type:'all',theme:'all',region:'all'};function apply(){var items=document.querySelectorAll('.pf-item');var n=0;items.forEach(function(el){var types=el.dataset.type||'',region=el.dataset.region||'',tags=el.dataset.tags||'';var ok=true;if(groups.type!=='all'&&!types.includes(groups.type))ok=false;if(groups.region!=='all'&&region!==groups.region)ok=false;if(groups.theme!=='all'){var parts=groups.theme.split('/').map(function(p){return p.trim()});var blob=tags+' '+types;if(!parts.some(function(part){return blob.includes(part)}))ok=false;}el.toggleAttribute('hidden',!ok);if(ok)n++;});var empty=document.getElementById('portfolio-empty');if(empty)empty.hidden=n!==0;}document.querySelectorAll('[data-filter-group]').forEach(function(wrap){wrap.addEventListener('click',function(e){var t=e.target;var btn=t.closest('button[data-value]');if(!btn)return;var g=wrap.getAttribute('data-filter-group');if(!g)return;groups[g]=btn.dataset.value||'all';wrap.querySelectorAll('.chip').forEach(function(c){c.classList.remove('is-active')});btn.classList.add('is-active');apply();});});apply();})();
</script>`;

  writeHtml(
    'case/index.html',
    renderPage(cfg, {
      title: '作品集｜小巴老師親子寫真',
      description: '從台灣森林草地、海邊、日暮，到海外櫻花、古都、海島與雪地。',
      canonical: `${site.url}/case/index.html`,
      body: caseIndexBody,
      ogImage: '/assets/images/home/child-portrait-kimono-portfolio-hero-004.png',
    }),
  );

  for (const e of sorted) {
    const slug = slugOf(e);
    const htmlBody = marked.parse(e.bodyMd);
    const caseFallback = CASE_IMAGE_BY_SLUG[slug] || INTERNAL_FALLBACK_IMAGE;
    const cover = normalizeImageSource(e.data.cover, caseFallback);
    const gallery = [cover, ...(e.data.gallery || []).map((src) => normalizeImageSource(src, caseFallback))].filter(
      (v, i, a) => a.indexOf(v) === i,
    );
    const gal = gallery
      .map(
        (src, i) =>
          `<figure class="gallery__item"><img src="${escapeHtml(src)}" alt="${escapeHtml(e.data.title)} 第 ${i + 1} 張｜親子寫真與家庭寫真" loading="lazy" width="900" height="600" /></figure>`,
      )
      .join('');
    const locHref = hrefForPortfolioLocation(e.data.location);
    const article = `<article>
<section class="hero" style="min-height:360px;margin-bottom:0;border-radius:0;">
<div class="hero__bg" style="background-image:url('${escapeHtml(cover)}')"></div>
<div class="hero__overlay"></div>
<div class="hero__inner" style="padding-bottom:var(--space-xl);">
<p class="hero__eyebrow">${escapeHtml(e.data.location)}${e.data.country ? ` · ${escapeHtml(e.data.country)}` : ''}</p>
<h1 class="hero__title" style="max-width:24ch;">${escapeHtml(e.data.title)}</h1>
<p class="hero__sub">${escapeHtml((e.data.category || []).join('、'))}${e.data.season ? ` · ${escapeHtml(e.data.season)}` : ''}</p>
<div class="hero__tags" style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-top:0.75rem;">${(e.data.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
</div>
</section>
<div class="container section prose">${htmlBody}</div>
<div class="container section"><h2 class="h2">精選照片</h2><div class="gallery">${gal}</div></div>
<div class="container section card card--flat"><h2 class="h2">延伸閱讀</h2><ul class="prose">
<li><a href="${locHref}">類似地區與拍攝建議</a></li>
<li><a href="/case/index.html">更多作品集</a></li>
<li><a href="/services/">服務方案</a></li>
</ul></div>
</article>`;

    writeHtml(
      `case/${slug}.html`,
      renderPage(cfg, {
        title: `${e.data.title}｜作品集`,
        description: e.data.excerpt,
        canonical: `${site.url}/case/${slug}.html`,
        body: article,
        ogImage: cover,
      }),
    );
  }
}

function locationBody(md) {
  const html = marked.parse(md);
  return `<div class="container section prose">${html}</div>`;
}

function buildLocationPages(entries) {
  const list = entries
    .filter((e) => !e.data.draft)
    .sort((a, b) => (a.data.sort ?? 0) - (b.data.sort ?? 0));
  const taiwan = list.filter((e) => e.data.region === 'taiwan');
  const overseas = list.filter((e) => e.data.region === 'overseas');

  const cards = (arr) =>
    arr
      .map(
        (e) =>
          `<a class="loc-card card card--flat" href="/locations/${e.base}.html"><span class="loc-card__title">${escapeHtml(e.data.title)}</span>${e.data.subtitle ? `<span class="loc-card__sub muted">${escapeHtml(e.data.subtitle)}</span>` : ''}</a>`,
      )
      .join('');

  const idxBody = `<section class="hero" style="min-height:300px;margin-bottom:0;border-radius:0;">
<div class="hero__bg" style="background-image:url('/assets/images/home/kids-portrait-evening-lights-locations-005.png')"></div>
<div class="hero__overlay"></div>
<div class="hero__inner" style="padding-bottom:var(--space-xl);"><h1 class="hero__title" style="max-width:none;">地區拍攝</h1>
<p class="hero__sub" style="max-width:58ch;">每個地區都有適合的家庭旅拍方式。</p></div></section>
<div class="container section"><p class="lead">想找<strong>海外旅行跟拍</strong>，請到「<a href="/pages/overseas.html">海外旅拍</a>」與「<a href="/pages/spotlights.html">拍攝主題</a>」。</p></div>
<div class="container section"><h2 class="h2">台灣地區拍攝</h2><div class="loc-grid">${cards(taiwan)}</div></div>
<div class="container section"><h2 class="h2">海外地區拍攝</h2><div class="loc-grid">${cards(overseas)}</div></div>`;

  writeHtml(
    'locations/index.html',
    renderPage(cfg, {
      title: '地區拍攝｜台灣與海外親子旅拍',
      description: '每個地區都有適合的家庭旅拍方式。',
      canonical: `${site.url}/locations/index.html`,
      body: idxBody,
    }),
  );

  for (const e of list) {
    const hero = normalizeImageSource(
      e.data.cover,
      '/public/images/wix-import/taiwan-taipei-family-portrait/taiwan-taipei-family-portrait-outdoor-lifestyle-04.jpg',
    );
    const body = `<section class="hero" style="min-height:340px;margin-bottom:0;border-radius:0;">
<div class="hero__bg" style="background-image:url('${escapeHtml(hero)}')"></div>
<div class="hero__overlay"></div>
<div class="hero__inner" style="padding-bottom:var(--space-xl);">
<h1 class="hero__title" style="max-width:none;">${escapeHtml(e.data.title)}</h1>
${e.data.subtitle ? `<p class="hero__sub" style="max-width:52ch;">${escapeHtml(e.data.subtitle)}</p>` : ''}
</div></section>
${locationBody(e.bodyMd)}
${e.data.why_great?.length ? `<div class="container section"><h2 class="h2">為什麼適合拍</h2><ul class="prose">${e.data.why_great.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>` : ''}
<div class="container section cta-mini"><h2 class="h2">想安排此區親子／家庭旅拍</h2><div class="hero__actions">
<a class="btn btn--primary" href="${site.lineUrl}" target="_blank" rel="noopener noreferrer">加 Line 詢問</a>
<a class="btn btn--secondary" href="/contact/">預約拍攝</a>
</div></div>`;

    writeHtml(
      `locations/${e.base}.html`,
      renderPage(cfg, {
        title: `${e.data.title}｜地區拍攝建議`,
        description: e.data.subtitle || e.data.title,
        canonical: `${site.url}/locations/${e.base}.html`,
        body,
        ogImage: hero,
      }),
    );
  }
}

function buildClientPages(entries) {
  const list = entries.filter((e) => !e.data.draft && !e.data.hubPortal);
  const idx = `<section class="hero" style="min-height:260px;margin-bottom:0;border-radius:0;">
<div class="hero__bg" style="background-image:url('/assets/images/home/family-portrait-kimono-clients-index-009.png')"></div>
<div class="hero__overlay"></div>
<div class="hero__inner" style="padding-bottom:var(--space-xl);"><h1 class="hero__title" style="max-width:none;">客戶專屬頁面</h1>
<p class="hero__sub">依專案名稱搜尋或從下方清單進入。</p></div></section>
<div class="container section"><ul class="prose">${list.map((e) => {
      const out = e.data.output_slug || slugOf(e);
      return `<li><a href="/projects/clients/${out}.html">${escapeHtml(e.data.client_name || e.data.title)}</a></li>`;
    }).join('')}</ul></div>`;

  writeHtml(
    'projects/clients/index.html',
    renderPage(cfg, {
      title: '客戶專屬頁面｜小巴老師',
      description: '專案連結與交付資訊（部分頁面需密碼）。',
      canonical: `${site.url}/projects/clients/index.html`,
      body: idx,
      noIndex: false,
    }),
  );

  for (const e of list) {
    const slug = e.data.output_slug || slugOf(e);
    const passwordHash =
      e.data.password_protected && e.data.password ? sha256(e.data.password) : '';
    const htmlContent = marked.parse(e.bodyMd);
    const cover = normalizeImageSource(e.data.cover, CLIENT_IMAGE_BY_SLUG[slug] || INTERNAL_FALLBACK_IMAGE);
    const gate = passwordHash
      ? `<form class="card card--flat pw-gate" data-pw-form><p class="h3">此頁面需輸入密碼</p><label class="field"><span class="muted">密碼</span><input type="password" name="password" autocomplete="current-password" required /></label><button class="btn btn--primary" type="submit">解鎖頁面</button><p class="muted pw-error" data-pw-error hidden>密碼不正確。</p></form>`
      : '';
    const links = [];
    if (e.data.gallery_link) links.push(`<li><a href="${escapeHtml(e.data.gallery_link)}" target="_blank" rel="noopener noreferrer">雲端相簿</a></li>`);
    if (e.data.download_link) links.push(`<li><a href="${escapeHtml(e.data.download_link)}" target="_blank" rel="noopener noreferrer">下載連結</a></li>`);
    if (e.data.video_link) links.push(`<li><a href="${escapeHtml(e.data.video_link)}" target="_blank" rel="noopener noreferrer">影片連結</a></li>`);
    if (e.data.proof_link) links.push(`<li><a href="${escapeHtml(e.data.proof_link)}" target="_blank" rel="noopener noreferrer">校稿連結</a></li>`);
    const linksBlock =
      links.length > 0
        ? `<ul class="prose link-list">${links.join('')}</ul>`
        : `<p class="muted">連結將於檔案就緒後更新，或由另訊提供。</p>`;
    const notesBlock = e.data.notes
      ? `<section class="section card card--flat" style="padding-top:var(--space-md);"><h2 class="h2">注意事項</h2><p class="muted" style="margin:0;">${escapeHtml(e.data.notes)}</p></section>`
      : '';
    const body = `<article class="client-page">
<section class="hero" style="min-height:280px;margin-bottom:0;border-radius:0;">
<div class="hero__bg" style="background-image:url('${escapeHtml(cover)}')"></div>
<div class="hero__overlay"></div>
<div class="hero__inner" style="padding-bottom:var(--space-xl);">
<p class="hero__eyebrow">${escapeHtml(e.data.project_type)}</p>
<h1 class="hero__title" style="max-width:none;">${escapeHtml(e.data.client_name)}</h1>
<p class="hero__sub">拍攝日期：${escapeHtml(e.data.shoot_date)}</p>
</div></section>
<div class="container section" data-pw-root data-pw-hash="${passwordHash}" data-pw-slug="${escapeHtml(slug)}">
${gate}
<div data-pw-content class="${passwordHash ? 'is-locked' : ''}">
<div class="section" style="padding-top:0;"><h2 class="h2">專案狀態</h2><p><strong>目前狀態：</strong>${escapeHtml(e.data.status)}</p>${e.data.estimated_delivery ? `<p class="muted"><strong>預計交件：</strong>${escapeHtml(e.data.estimated_delivery)}</p>` : ''}</div>
${e.data.shoot_includes?.length ? `<div class="section" style="padding-top:0;"><h2 class="h2">本次拍攝內容</h2><ul class="prose">${e.data.shoot_includes.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>` : ''}
<section class="section" style="padding-top:0;"><h2 class="h2">重要連結</h2>${linksBlock}</section>
${notesBlock}
<section class="section prose" style="padding-top:0;"><h2 class="h2">其他說明</h2>${htmlContent}</section>
<section class="section card card--flat"><h2 class="h2">延伸推薦</h2><ul class="prose"><li><a href="/case/index.html">類似作品風格</a></li><li><a href="/services/">服務方案</a></li><li><a href="/contact/">再次預約</a></li></ul>
<div class="hero__actions" style="margin-top:var(--space-md);"><a class="btn btn--primary" href="${site.lineUrl}" target="_blank" rel="noopener noreferrer">聯絡小巴老師</a></div></section>
</div></div></article>
<script>
(function(){var root=document.querySelector("[data-pw-root]");if(!root)return;var hash=root.dataset.pwHash||"";var slug=root.dataset.pwSlug||"";var form=root.querySelector("[data-pw-form]");var content=root.querySelector("[data-pw-content]");var err=root.querySelector("[data-pw-error]");var key="client_unlock_"+slug;async function sha256Hex(m){var b=new TextEncoder().encode(m);var d=await crypto.subtle.digest("SHA-256",b);return Array.from(new Uint8Array(d)).map(function(x){return x.toString(16).padStart(2,"0")}).join("");}function unlock(){if(content)content.classList.remove("is-locked");if(form)form.hidden=true;}if(!hash)return;if(sessionStorage.getItem(key)===hash)unlock();if(!form)return;form.addEventListener("submit",async function(ev){ev.preventDefault();var fd=new FormData(form);var pw=String(fd.get("password")||"");var entered=await sha256Hex(pw);if(entered===hash){sessionStorage.setItem(key,hash);if(err)err.hidden=true;unlock();}else if(err)err.hidden=false;});})();
</script>
<style>.hero__eyebrow{margin:0 0 var(--space-sm);letter-spacing:0.06em;font-size:0.9rem;opacity:0.95;}.pw-gate{max-width:420px;padding:var(--space-lg);margin-bottom:var(--space-lg);}.pw-gate .field{display:grid;gap:0.35rem;margin-bottom:var(--space-sm);}.pw-gate input{font:inherit;padding:0.55rem 0.75rem;border:1px solid var(--color-line);border-radius:8px;}.is-locked{display:none;}</style>`;

    writeHtml(
      `projects/clients/${slug}.html`,
      renderPage(cfg, {
        title: `${e.data.client_name}｜客戶專屬頁`,
        description: `專案：${e.data.project_type}（${e.data.shoot_date}）`,
        canonical: `${site.url}/projects/clients/${slug}.html`,
        body,
        ogImage: cover,
        noIndex: !!e.data.password_protected,
      }),
    );
  }
}

function buildReviewsPage(entries) {
  const sorted = entries.filter((e) => !e.data.draft).sort((a, b) => (a.data.sort ?? 0) - (b.data.sort ?? 0));
  const blocks = sorted
    .map((e) => {
      const inner = marked.parse(e.bodyMd);
      const reviewPhoto = normalizeImageSource(e.data.photo, REVIEW_IMAGE_BY_LOCATION[e.data.location] || INTERNAL_FALLBACK_IMAGE);
      const photo = reviewPhoto
        ? `<div class="rev__photo"><img src="${escapeHtml(reviewPhoto)}" alt="${escapeHtml(e.data.title)}｜${escapeHtml(e.data.location)} 親子寫真推薦" loading="lazy" width="800" height="520" /></div>`
        : '';
      return `<article class="rev card card--flat">${photo}<div class="rev__body"><h2 class="h3">${escapeHtml(e.data.title)}</h2>
<p class="muted" style="margin:0 0 var(--space-sm);font-size:0.92rem;">${escapeHtml(e.data.location)} · ${escapeHtml(e.data.type)}</p>
<div class="prose" style="font-size:0.98rem;">${inner}</div></div></article>`;
    })
    .join('');

  const body = `<section class="hero" style="min-height:280px;margin-bottom:0;border-radius:0;">
<div class="hero__bg" style="background-image:url('/assets/images/home/family-portrait-japanese-kimono-reviews-006.png')"></div>
<div class="hero__overlay"></div>
<div class="hero__inner" style="padding-bottom:var(--space-xl);"><h1 class="hero__title" style="max-width:none;">爸媽推薦</h1></div></section>
<div class="container section"><div class="rev-grid">${blocks}</div></div>`;

  writeHtml(
    'pages/reviews.html',
    renderPage(cfg, {
      title: '爸媽推薦｜小巴老師親子寫真',
      description: '拍攝結束後，最讓我在意的是客人真實的回饋。',
      canonical: `${site.url}/pages/reviews.html`,
      body,
    }),
  );
}

function buildIndex(caseEntries) {
  const featured = caseEntries
    .filter((e) => !e.data.draft && e.data.featured)
    .sort((a, b) => (a.data.date < b.data.date ? 1 : -1))
    .slice(0, 8);
  const cards = featured
    .map((e) => {
      const slug = slugOf(e);
      const tags = [...(e.data.category || []), ...(e.data.tags || [])];
      return cardHtml(
        `/case/${slug}.html`,
        e.data.title,
        e.data.excerpt,
        e.data.location,
        tags,
        e.data.cover,
      );
    })
    .join('');

  let body = loadFixed('index.html');
  body = body.replace('{{FEATURED_CASES}}', `<div class="grid-2" style="margin-top:var(--space-lg);">${cards}</div>`);
  writeHtml(
    'index.html',
    renderPage(cfg, {
      title: '小巴老師｜親子寫真・家庭旅拍｜台灣包車與海外親子旅拍',
      description: site.description,
      canonical: `${site.url}/`,
      body,
      ogImage: '/assets/images/home/family-portrait-kimono-hero-home-taiwan-japan-001.png',
    }),
  );
}

function buildSitemap(urls) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url><loc>${escapeHtml(u)}</loc><changefreq>weekly</changefreq></url>`).join('\n')}
</urlset>`;
  writeFileSync(join(ROOT, 'sitemap.xml'), xml, 'utf8');
}

function main() {
  const cases = readMdDir('content/case');
  const locs = readMdDir('content/locations');
  const clients = readMdDir('content/clients');
  const reviews = readMdDir('content/reviews');

  buildIndex(cases);
  buildCasePages(cases);
  buildLocationPages(locs);
  buildClientPages(clients);
  buildReviewsPage(reviews);

  const fixedPages = [
    ['pages/services.html', 'services.html', '親子寫真服務方案｜小巴老師', site.description],
    ['pages/about.html', 'about.html', '關於小巴老師｜親子寫真攝影師', site.description],
    ['pages/contact.html', 'contact.html', '預約詢問｜小巴老師親子寫真', '請告訴我你們想拍的日期與地點。'],
    ['pages/booking-info.html', 'booking-info.html', '預約與付款說明｜小巴老師', site.description],
    ['pages/hong-kong-family-trip-taiwan.html', 'hong-kong-family-trip-taiwan.html', '香港家庭來台拍攝｜小巴老師', '香港家庭來台親子旅拍與半日方案。'],
    ['pages/faq.html', 'faq.html', '常見問題｜親子寫真＆家庭旅拍', '第一次拍親子寫真可以先從這裡開始。'],
    ['pages/overseas.html', 'overseas.html', '海外旅拍專區｜小巴老師', '日本、韓國與海島海外旅行跟拍。'],
    ['pages/spotlights.html', 'spotlights.html', '拍攝主題｜小巴老師', '露營、滑雪、迪士尼等主題方案。'],
  ];

  for (const [out, frag, title, desc] of fixedPages) {
    const body = loadFixed(frag);
    writeHtml(
      out,
      renderPage(cfg, {
        title,
        description: desc,
        canonical: `${site.url}/${out}`,
        body,
      }),
    );
  }

  const urls = [
    site.url + '/',
    site.url + '/index.html',
    ...fixedPages.map(([p]) => site.url + '/' + p),
    ...cases.filter((e) => !e.data.draft).map((e) => `${site.url}/case/${slugOf(e)}.html`),
    `${site.url}/case/index.html`,
    ...locs.filter((e) => !e.data.draft).map((e) => `${site.url}/locations/${e.base}.html`),
    `${site.url}/locations/index.html`,
    ...clients.filter((e) => !e.data.draft).map((e) => `${site.url}/projects/clients/${e.data.output_slug || slugOf(e)}.html`),
    `${site.url}/projects/clients/index.html`,
    `${site.url}/pages/reviews.html`,
  ];
  buildSitemap([...new Set(urls)]);

  writeFileSync(
    join(ROOT, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`,
    'utf8',
  );

  console.error('Build OK');
}

main();
