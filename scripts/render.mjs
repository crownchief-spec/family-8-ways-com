/**
 * 靜態 HTML 外殼與共用區塊（取代 Astro Layout）
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

export function loadSiteConfig() {
  return JSON.parse(readFileSync(join(ROOT, 'site.config.json'), 'utf8'));
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loadFooterLatest() {
  const p = join(ROOT, 'data/hub-footer-latest.json');
  if (!existsSync(p)) return { works: [], articles: [] };
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return { works: [], articles: [] };
  }
}

export function renderNavbar(cfg) {
  const { site, nav } = cfg;
  const items = nav
    .map((item) => {
      const href = item.href === '/index.html' ? '/' : item.href;
      if (item.children?.length) {
        const sub = item.children
          .map(
            (ch) =>
              `<li><a href="${escapeHtml(ch.href)}">${escapeHtml(ch.label)}</a></li>`,
          )
          .join('');
        return `<li class="site-nav__item site-nav__item--dropdown">
  <div class="site-nav__split">
    <a href="${escapeHtml(href)}" class="site-nav__parent">${escapeHtml(item.label)}</a>
    <button type="button" class="site-nav__dropdown-toggle" aria-expanded="false" aria-label="展開子選單" data-dropdown-toggle>▼</button>
  </div>
  <ul class="site-nav__sub">${sub}</ul>
</li>`;
      }
      return `<li class="site-nav__item"><a href="${escapeHtml(href)}">${escapeHtml(item.label)}</a></li>`;
    })
    .join('\n');

  return `<header class="site-header">
  <div class="site-header__inner container">
    <a class="site-header__brand" href="/">${escapeHtml(site.shortName)}</a>
    <button class="site-header__toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-nav-toggle>
      <span class="sr-only">開啟選單</span>
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
    </button>
    <nav class="site-nav" id="site-nav" data-nav-panel>
      <ul class="site-nav__list">${items}</ul>
      <div class="site-nav__cta">
        <a class="btn btn--ghost btn--compact" href="${escapeHtml(site.lineUrl)}" target="_blank" rel="noopener noreferrer">加 Line 詢問</a>
        <a class="btn btn--primary btn--compact" href="/contact/">預約拍攝</a>
      </div>
    </nav>
  </div>
</header>
<div class="sticky-mobile-cta" aria-hidden="false">
  <a class="sticky-mobile-cta__btn sticky-mobile-cta__btn--line" href="${escapeHtml(site.lineUrl)}" target="_blank" rel="noopener noreferrer">Line 詢問</a>
  <a class="sticky-mobile-cta__btn sticky-mobile-cta__btn--tel" href="${escapeHtml(site.phoneTel)}">撥打電話</a>
</div>
<script>
(function(){
function normPath(p){p=p||"/";if(p.endsWith("/index.html"))p=p.slice(0,-10)||"/";return p.replace(/\/+$/,"")||"/";}
var t=document.querySelector("[data-nav-toggle]"),p=document.querySelector("[data-nav-panel]");
if(t&&p){t.addEventListener("click",function(){var o=!p.classList.contains("is-open");p.classList.toggle("is-open",o);t.setAttribute("aria-expanded",String(o))});p.querySelectorAll("a").forEach(function(a){a.addEventListener("click",function(){p.classList.remove("is-open");t.setAttribute("aria-expanded","false")})})}
document.querySelectorAll("[data-dropdown-toggle]").forEach(function(btn){
var li=btn.closest(".site-nav__item--dropdown");if(!li)return;
btn.addEventListener("click",function(){var o=li.classList.toggle("is-sub-open");btn.setAttribute("aria-expanded",String(o));});
});
var path=normPath(location.pathname);
document.querySelectorAll(".site-nav__list a").forEach(function(link){
var h=link.getAttribute("href")||"";
var lp=normPath(link.pathname||"");
if(lp===path||(path==="/"&&(h==="/"||h==="/index.html")))link.setAttribute("aria-current","page");
});
})();
</script>`;
}

export function renderFooter(cfg, options = {}) {
  const { showAdminLink = true } = options;
  const { site } = cfg;
  const y = new Date().getFullYear();
  const latest = loadFooterLatest();
  const worksMini = (latest.works || [])
    .slice(0, 3)
    .map((w) => `<li><a href="${escapeHtml(w.href)}">${escapeHtml(w.title)}</a></li>`)
    .join('');
  const artsMini = (latest.articles || [])
    .slice(0, 3)
    .map((a) => `<li><a href="${escapeHtml(a.href)}">${escapeHtml(a.title)}</a></li>`)
    .join('');

  const colBrand = `<section class="site-footer__col site-footer__col--brand">
      <p class="h3 site-footer__title">小巴老師｜親子寫真</p>
      <p class="muted" style="margin:0 0 var(--space-md);max-width:42ch;font-size:0.95rem;">親子寫真、家庭攝影、台灣包車旅拍、海外親子旅拍、露營團拍與家庭活動紀錄。自然互動、不死板，讓孩子在旅行與遊戲中留下真實表情。</p>
      <p class="muted" style="margin:0;font-size:0.92rem;line-height:1.65;">
        Line／電話：${escapeHtml(site.phoneDisplay || '0911-252-302')}<br/>
        WhatsApp：+886 911252302<br/>
        E-mail：<a href="mailto:${escapeHtml(site.email)}">${escapeHtml(site.email)}</a>
      </p>
      <div class="site-footer__cta" style="margin-top:var(--space-md);display:flex;flex-wrap:wrap;gap:0.5rem;">
        <a class="btn btn--primary btn--compact" href="${escapeHtml(site.lineUrl)}" target="_blank" rel="noopener noreferrer">加 Line 詢問</a>
        <a class="btn btn--secondary btn--compact" href="/contact/">預約拍攝</a>
      </div>
    </section>`;

  const colServices = `<section class="site-footer__col">
      <p class="h3 site-footer__title">親子寫真服務</p>
      <ul class="footer-links footer-links--single">
        <li><a href="/services/taiwan-family-photography/">台灣親子旅拍</a></li>
        <li><a href="/services/overseas-family-photography/">海外親子旅拍</a></li>
        <li><a href="/services/camping-family-photography/">露營團拍／親子民宿</a></li>
        <li><a href="/services/family-event-photography/">生日派對／家庭活動紀錄</a></li>
        <li><a href="/services/maternity-baby-family-photography/">孕婦／寶寶／三代同堂</a></li>
        <li><a href="/faq/">常見問題</a></li>
        <li><a href="/about/">關於小巴老師</a></li>
      </ul>
    </section>`;

  const colWorks = `<section class="site-footer__col">
      <p class="h3 site-footer__title">親子寫真作品</p>
      <ul class="footer-links footer-links--single">
        <li><a href="/works/">全部作品</a></li>
        <li><a href="/works/?category=taiwan">台灣親子旅拍作品</a></li>
        <li><a href="/works/?category=overseas">海外親子旅拍作品</a></li>
        <li><a href="/works/?category=camping">露營團拍作品</a></li>
        <li><a href="/works/?category=homestay">親子民宿作品</a></li>
        <li><a href="/works/?category=party">生日派對作品</a></li>
        <li><a href="/works/?category=baby">孕婦與寶寶作品</a></li>
        <li><a href="/works/?category=three-generation">三代同堂作品</a></li>
      </ul>
      ${worksMini ? `<p class="muted" style="margin:var(--space-sm) 0 0;font-size:0.85rem;">最新作品</p><ul class="footer-links footer-links--single" style="margin-top:0.35rem;">${worksMini}</ul>` : ''}
    </section>`;

  const colArticles = `<section class="site-footer__col">
      <p class="h3 site-footer__title">親子寫真文章</p>
      <ul class="footer-links footer-links--single">
        <li><a href="/articles/">全部文章</a></li>
        <li><a href="/articles/?category=preparation">親子寫真準備</a></li>
        <li><a href="/articles/?category=taiwan">台灣親子旅拍</a></li>
        <li><a href="/articles/?category=overseas">海外親子旅拍</a></li>
        <li><a href="/articles/?category=camping">露營團拍</a></li>
        <li><a href="/articles/?category=outfit">家庭照穿搭</a></li>
        <li><a href="/articles/?category=location">親子攝影地點</a></li>
        <li><a href="/articles/?category=pricing">家庭攝影費用</a></li>
      </ul>
      ${artsMini ? `<p class="muted" style="margin:var(--space-sm) 0 0;font-size:0.85rem;">最新文章</p><ul class="footer-links footer-links--single" style="margin-top:0.35rem;">${artsMini}</ul>` : ''}
    </section>`;

  return `<footer class="site-footer">
  <div class="container">
    <div class="site-footer__grid site-footer__grid--hub">
      ${colBrand}
      ${colServices}
      ${colWorks}
      ${colArticles}
    </div>
  </div>
  <div class="container site-footer__bottom">
    <p class="muted" style="margin:0;font-size:0.82rem;">
      <a href="/sitemap/">網站地圖</a>
      ・
      <a href="/privacy/">隱私權說明</a>
      ・
      ${showAdminLink ? '<a href="/admin/">客戶與攝影師後台管理系統</a> ・' : ''}
      © ${y} 小巴老師｜親子寫真．八威創意有限公司
    </p>
  </div>
</footer>`;
}

export function renderPage(cfg, { title, description, canonical, body, ogImage, noIndex, hideAdminFooterLink }) {
  const { site } = cfg;
  const desc = description || site.description;
  const og = ogImage
    ? ogImage.startsWith('http')
      ? ogImage
      : new URL(ogImage.replace(/^\//, ''), site.url + '/').href
    : new URL('/assets/images/og/default.svg', site.url).href;
  const robots = noIndex
    ? '<meta name="robots" content="noindex,nofollow,noarchive,nosnippet,noimageindex" />'
    : '';
  const canonicalTag = noIndex ? '' : `<link rel="canonical" href="${escapeHtml(canonical)}" />`;
  const ogUrl = noIndex ? `${site.url}/` : canonical;
  const nav = renderNavbar(cfg);
  const foot = renderFooter(cfg, { showAdminLink: !hideAdminFooterLink });
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}" />
  ${canonicalTag}
  ${robots}
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(desc)}" />
  <meta property="og:url" content="${escapeHtml(ogUrl)}" />
  <meta property="og:image" content="${escapeHtml(og)}" />
  <meta property="og:locale" content="zh_TW" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(desc)}" />
  <meta name="twitter:image" content="${escapeHtml(og)}" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/assets/css/main.css" />
</head>
<body>
${nav}
<main id="main">
${body}
</main>
${foot}
</body>
</html>`;
}
