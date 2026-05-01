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
  const { site } = cfg;
  const y = new Date().getFullYear();
  const sections = [
    {
      title: '親子寫真服務',
      links: [
        ['服務流程與價格', '/pages/service-flow/'],
        ['台灣包車親子旅拍', '/taiwan/taipei/'],
        ['海外親子旅拍', '/overseas/'],
        ['微電影 MV', '/pages/service-flow/'],
        ['爸媽推薦', '/pages/reviews/'],
        ['常見問題', '/pages/faq/'],
      ],
    },
    {
      title: '台灣拍攝地區',
      links: [
        ['台北親子寫真', '/taiwan/taipei/'],
        ['桃園親子寫真', '/taiwan/taoyuan/'],
        ['新竹親子寫真', '/taiwan/hsinchu/'],
        ['台中親子寫真', '/taiwan/taichung/'],
        ['宜蘭親子寫真', '/taiwan/yilan/'],
        ['澎湖親子寫真', '/taiwan/penghu/'],
        ['露營團拍', '/taiwan/camping/'],
        ['生日派對', '/taiwan/birthday/'],
      ],
    },
    {
      title: '海外旅拍',
      links: [
        ['日本滑雪玩雪', '/overseas/japan-winter/'],
        ['北海道夏季', '/overseas/hokkaido/'],
        ['沖繩親子寫真', '/overseas/okinawa/'],
        ['東京迪士尼', '/overseas/disney/'],
        ['京都大阪奈良', '/overseas/kansai/'],
        ['韓國親子寫真', '/overseas/korea/'],
        ['新加坡親子寫真', '/overseas/singapore/'],
        ['澳洲雪梨墨爾本', '/overseas/australia/'],
      ],
    },
    {
      title: '主題分類',
      links: [
        ['三代同堂', '/themes/generation/'],
        ['孕婦寫真', '/themes/maternity/'],
        ['和服韓服旗袍', '/themes/costume/'],
        ['夜拍煙火', '/themes/night/'],
        ['海灘玩水', '/themes/beach/'],
        ['草地森林', '/themes/grass/'],
        ['春櫻秋楓', '/themes/sakura/'],
        ['寶寶 Baby', '/themes/baby/'],
      ],
    },
    {
      title: '聯絡小巴老師',
      links: [
        ['Line ID：0911252302', site.lineUrl],
        ['WeChat：travelphotographer', `https://weixin.qq.com/`],
        ['WhatsApp：+886 911252302', site.whatsappUrl],
        ['電話：0911252302', site.phoneTel],
        ['Email：crownchief@gmail.com', `mailto:${site.email}`],
        ['IG：travel.photo.tw', 'https://www.instagram.com/travel.photo.tw/'],
        ['Facebook：Facebook.com/benson.tw', 'https://facebook.com/benson.tw'],
      ],
    },
  ];
  const sectionHtml = sections
    .map(
      (section) => `<section class="site-footer__col">
      <p class="h3 site-footer__title">${escapeHtml(section.title)}</p>
      <ul class="footer-links footer-links--single">${section.links
        .map(
          ([label, href]) =>
            `<li><a href="${escapeHtml(href)}"${href.startsWith('http') || href.startsWith('mailto:') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(label)}</a></li>`,
        )
        .join('')}</ul>
    </section>`,
    )
    .join('');
  return `<footer class="site-footer">
  <div class="container">
    <div class="site-footer__top">
      <p class="h3" style="margin:0;">${escapeHtml(site.shortName)}</p>
      <p class="muted" style="margin:0;max-width:62ch;">台灣包車旅拍、海外親子旅拍、全外拍自然互動風格。照片全給，可搭配微電影 MV。</p>
      <p style="margin:0;"><a class="btn btn--primary btn--compact" href="${escapeHtml(site.lineUrl)}" target="_blank" rel="noopener noreferrer">LINE 預約諮詢</a></p>
    </div>
    <div class="site-footer__grid">
      ${sectionHtml}
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
