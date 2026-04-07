/**
 * 靜態 HTML 外殼與共用區塊（取代 Astro Layout）
 */
import { readFileSync } from 'fs';
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

export function renderNavbar(cfg) {
  const { site, nav } = cfg;
  const items = nav
    .map((item) => {
      const href = item.href === '/index.html' ? '/' : item.href;
      return `<li><a href="${escapeHtml(href)}">${escapeHtml(item.label)}</a></li>`;
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
        <a class="btn btn--primary btn--compact" href="/pages/contact.html">預約拍攝</a>
      </div>
    </nav>
  </div>
</header>
<script>
(function(){var t=document.querySelector("[data-nav-toggle]"),p=document.querySelector("[data-nav-panel]");if(t&&p){t.addEventListener("click",function(){var o=!p.classList.contains("is-open");p.classList.toggle("is-open",o);t.setAttribute("aria-expanded",String(o))});p.querySelectorAll("a").forEach(function(a){a.addEventListener("click",function(){p.classList.remove("is-open");t.setAttribute("aria-expanded","false")})})}
var path=location.pathname;document.querySelectorAll(".site-nav__list a").forEach(function(link){if(link.pathname===path||(path==="/"||path==="/index.html")&&(link.getAttribute("href")==="/"||link.getAttribute("href")==="/index.html"))link.setAttribute("aria-current","page");});
})();
</script>`;
}

export function renderFooter(cfg) {
  const { site, nav } = cfg;
  const y = new Date().getFullYear();
  const links = nav
    .map((item) => {
      const href = item.href === '/index.html' ? '/' : item.href;
      return `<li><a href="${escapeHtml(href)}">${escapeHtml(item.label)}</a></li>`;
    })
    .join('\n');
  return `<footer class="site-footer">
  <div class="container grid-2" style="align-items:start;">
    <div>
      <p class="h3" style="margin-bottom:var(--space-sm);">${escapeHtml(site.shortName)}</p>
      <p class="muted" style="margin:0;max-width:40ch;">${escapeHtml(site.description)}</p>
      <p style="margin-top:var(--space-md);"><a class="btn btn--primary btn--compact" href="${escapeHtml(site.lineUrl)}" target="_blank" rel="noopener noreferrer">於 Line 與我聯絡</a></p>
    </div>
    <div>
      <p class="h3" style="margin-bottom:var(--space-sm);">站內導覽</p>
      <ul class="footer-links">${links}</ul>
      <p class="muted" style="margin-top:var(--space-md);font-size:0.9rem;">電話：<a href="${escapeHtml(site.phoneTel)}">${escapeHtml(site.phone)}</a></p>
    </div>
  </div>
  <p class="container muted" style="margin-top:var(--space-xl);font-size:0.82rem;">© ${y} ${escapeHtml(site.shortName)}．保留所有權利。</p>
</footer>`;
}

export function renderPage(cfg, { title, description, canonical, body, ogImage, noIndex }) {
  const { site } = cfg;
  const desc = description || site.description;
  const og = ogImage
    ? ogImage.startsWith('http')
      ? ogImage
      : new URL(ogImage.replace(/^\//, ''), site.url + '/').href
    : new URL('/assets/images/og/default.svg', site.url).href;
  const robots = noIndex ? '<meta name="robots" content="noindex,nofollow" />' : '';
  const nav = renderNavbar(cfg);
  const foot = renderFooter(cfg);
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  ${robots}
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(desc)}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta property="og:image" content="${escapeHtml(og)}" />
  <meta property="og:locale" content="zh_TW" />
  <meta name="twitter:card" content="summary_large_image" />
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
