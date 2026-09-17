#!/usr/bin/env node
/**
 * 全站 SEO 最後整理：在所有建置器完成後，統一補齊靜態 HTML head、
 * per-page 社群分享圖、Schema、索引控制、404 與 sitemap。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSiteConfig, renderPage } from './render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = loadSiteConfig();
const { site } = cfg;
const SKIP_DIRS = new Set(['node_modules', 'templates', 'src', 'data', 'content', 'components']);
const REDIRECTED_ROUTES = new Set(['/pages/about.html', '/pages/contact.html', '/pages/reviews.html', '/pages/services.html']);
const PRIVATE_PREFIXES = ['/admin/', '/clients/', '/family-contract/', '/projects/clients/', '/privacy/'];
const IMAGE_EXTENSIONS = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeXml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function walkHtml(dir = ROOT, output = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (dir === ROOT && entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, output);
    else if (entry.isFile() && entry.name.endsWith('.html')) output.push(full);
  }
  return output;
}

function routeFromFile(file) {
  const rel = relative(ROOT, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -10)}`;
  return `/${rel}`;
}

function getTitle(html) {
  return html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || '';
}

function getMeta(html, key, value) {
  const a = new RegExp(`<meta\\b[^>]*${key}=["']${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i');
  const b = new RegExp(`<meta\\b[^>]*content=["']([^"']*)["'][^>]*${key}=["']${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'i');
  return html.match(a)?.[1] || html.match(b)?.[1] || '';
}

function getLink(html, rel) {
  const a = new RegExp(`<link\\b[^>]*rel=["']${rel}["'][^>]*href=["']([^"']*)["'][^>]*>`, 'i');
  const b = new RegExp(`<link\\b[^>]*href=["']([^"']*)["'][^>]*rel=["']${rel}["'][^>]*>`, 'i');
  return html.match(a)?.[1] || html.match(b)?.[1] || '';
}

function upsertMeta(html, key, value, content) {
  const tag = `<meta ${key}="${escapeAttr(value)}" content="${escapeAttr(content)}" />`;
  const re = new RegExp(`<meta\\b(?=[^>]*${key}=["']${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'])[^>]*>`, 'i');
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', `  ${tag}\n</head>`);
}

function upsertLink(html, rel, href, extra = '') {
  const tag = `<link rel="${escapeAttr(rel)}"${extra ? ` ${extra}` : ''} href="${escapeAttr(href)}" />`;
  const re = new RegExp(`<link\\b(?=[^>]*rel=["']${rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'])[^>]*>`, 'i');
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', `  ${tag}\n</head>`);
}

function setTitle(html, title) {
  const tag = `<title>${escapeAttr(title)}</title>`;
  return /<title>[\s\S]*?<\/title>/i.test(html)
    ? html.replace(/<title>[\s\S]*?<\/title>/i, tag)
    : html.replace('</head>', `  ${tag}\n</head>`);
}

function normalizeInternalImage(src) {
  if (!src) return '';
  let value = String(src).trim().replace(/&amp;/g, '&');
  if (value.startsWith(site.url)) value = value.slice(site.url.length);
  if (!value.startsWith('/')) return '';
  value = value.split(/[?#]/)[0];
  if (!IMAGE_EXTENSIONS.has(extname(value).toLowerCase())) return '';
  return value;
}

function extractPageImages(html) {
  const images = [];
  for (const match of html.matchAll(/background-image\s*:\s*url\((?:["'])?([^"')]+)(?:["'])?\)/gi)) images.push(match[1]);
  for (const match of html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) images.push(match[1]);
  const currentOg = getMeta(html, 'property', 'og:image');
  if (currentOg) images.push(currentOg);
  return [...new Set(images.map(normalizeInternalImage).filter(Boolean))];
}

function isUsefulSocialImage(path, trackedMedia) {
  if (!path || !trackedMedia.has(path.replace(/^\//, ''))) return false;
  return !/(?:^|\/)(?:favicon|logo|icon|qr|og-default|default\.svg)(?:$|[./_-])/i.test(path);
}

function schemaTypes(html) {
  const types = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(match[1]);
      const nodes = Array.isArray(data) ? data : data['@graph'] || [data];
      for (const node of nodes) if (node?.['@type']) types.push(node['@type']);
    } catch {
      types.push('INVALID');
    }
  }
  return types.flat();
}

function inferSchemaType(route) {
  if (route === '/') return 'WebPage';
  if (route === '/about/' || route.includes('about-ba-wei')) return 'AboutPage';
  if (route === '/contact/' || route === '/pages/contact.html') return 'ContactPage';
  if (/^\/services\/[^/]+\/$/.test(route)) return 'Service';
  if (route === '/services/' || route === '/works/' || route === '/articles/' || route === '/sitemap/') return 'CollectionPage';
  if (/^\/articles\/[^/]+\/$/.test(route)) return 'BlogPosting';
  if (/^\/(?:works|case)\//.test(route)) return 'ImageGallery';
  return 'WebPage';
}

function primarySchema({ route, title, description, canonical, image, type }) {
  const common = {
    '@context': 'https://schema.org',
    '@type': type,
    name: title,
    description,
    url: canonical,
    image,
    inLanguage: 'zh-Hant',
    isPartOf: { '@type': 'WebSite', name: site.shortName, url: `${site.url}/` },
  };
  if (type === 'Service') {
    return {
      ...common,
      provider: { '@type': 'Organization', name: site.shortName, url: `${site.url}/` },
      areaServed: ['台灣', '日本', '韓國', '新加坡', '澳洲'],
      serviceType: title.replace(/｜.*$/, ''),
    };
  }
  if (type === 'BlogPosting') {
    return {
      ...common,
      headline: title.replace(/｜小巴老師.*$/, ''),
      author: { '@type': 'Person', name: '小巴老師' },
      publisher: { '@type': 'Organization', name: site.shortName, url: `${site.url}/` },
      mainEntityOfPage: canonical,
    };
  }
  if (type === 'ImageGallery') {
    return { ...common, creator: { '@type': 'Person', name: '小巴老師' } };
  }
  return common;
}

function homeSchema({ title, description, canonical, image }) {
  const organizationId = `${site.url}/#organization`;
  const websiteId = `${site.url}/#website`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Organization', 'LocalBusiness'],
        '@id': organizationId,
        name: site.shortName,
        legalName: '八威創意有限公司',
        url: `${site.url}/`,
        image,
        email: site.email,
        telephone: site.phone,
        priceRange: 'NT$5,800–38,800',
        areaServed: ['台灣', '日本', '韓國', '新加坡', '澳洲'],
      },
      {
        '@type': 'WebSite',
        '@id': websiteId,
        name: site.shortName,
        url: `${site.url}/`,
        inLanguage: 'zh-Hant',
        publisher: { '@id': organizationId },
      },
      {
        '@type': 'WebPage',
        name: title,
        description,
        url: canonical,
        image,
        inLanguage: 'zh-Hant',
        isPartOf: { '@id': websiteId },
        about: { '@id': organizationId },
      },
    ],
  };
}

function injectSchema(html, schema) {
  const safe = JSON.stringify(schema).replace(/</g, '\\u003c');
  return html.replace('</head>', `  <script type="application/ld+json">${safe}</script>\n</head>`);
}

function ensure404() {
  const body = `<section class="container section" style="text-align:center;min-height:60vh;display:grid;place-content:center;">
  <p class="muted">404</p>
  <h1 class="h1">找不到這個頁面</h1>
  <p class="muted">網址可能已更新，請回到首頁、作品案例或服務方案繼續瀏覽。</p>
  <div class="hero__actions" style="justify-content:center;"><a class="btn btn--primary" href="/">回首頁</a><a class="btn btn--secondary" href="/works/">看作品</a><a class="btn btn--secondary" href="/services/">看服務方案</a></div>
  </section>`;
  writeFileSync(
    join(ROOT, '404.html'),
    renderPage(cfg, {
      title: '找不到頁面｜小巴老師親子寫真',
      description: '這個網址不存在或已更新，請回到小巴老師親子寫真首頁繼續瀏覽。',
      canonical: `${site.url}/404.html`,
      body,
      ogImage: '/public/images/family/archive/home/home-003-636b95_cbaa6a6b10e9487788cccd52f862c7f0-mv.jpg',
      noIndex: true,
    }),
    'utf8',
  );
}

ensure404();

const overridesPath = join(ROOT, 'data', 'seo-overrides.json');
const overrides = existsSync(overridesPath) ? JSON.parse(readFileSync(overridesPath, 'utf8')) : {};
const trackedMedia = new Set(
  execFileSync('git', ['ls-files', 'assets/images/**', 'public/images/**'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean),
);
const migrationPath = join(ROOT, 'content', 'family-migration-data.json');
const migrationPages = existsSync(migrationPath) ? JSON.parse(readFileSync(migrationPath, 'utf8')) : [];
const migrationByRoute = new Map();
const globalPool = [];
for (const page of migrationPages) {
  const route = `${String(page.new_url || '').replace(/\/+$/, '') || ''}/`.replace(/^\/$/, '/');
  const images = (page.images || []).map(normalizeInternalImage).filter((x) => isUsefulSocialImage(x, trackedMedia));
  migrationByRoute.set(route, images);
  globalPool.push(...images);
}

const files = walkHtml().sort();
const pageRecords = files.map((file) => {
  const route = routeFromFile(file);
  const html = readFileSync(file, 'utf8');
  const canonical = getLink(html, 'canonical') || `${site.url}${route}`;
  const title = getTitle(html) || `${route}｜${site.shortName}`;
  const description = getMeta(html, 'name', 'description') || `${title.replace(/｜.*$/, '')}，小巴老師親子寫真網站內容。`;
  const routeKey = `${route.replace(/\/+$/, '') || ''}/`.replace(/^\/$/, '/');
  const pageImages = extractPageImages(html).filter((x) => isUsefulSocialImage(x, trackedMedia));
  const routeImages = migrationByRoute.get(routeKey) || [];
  const override = overrides[route] || {};
  const preferred = normalizeInternalImage(override.ogImage);
  return { file, route, html, canonical, title, description, override, candidates: [preferred, ...pageImages, ...routeImages, ...globalPool].filter(Boolean) };
});

// 先保留人工指定的主圖，再為其餘頁面挑同頁圖片；最後才使用全站相關圖池。
const usedImages = new Set();
for (const page of pageRecords) {
  const preferred = normalizeInternalImage(page.override.ogImage);
  if (preferred && isUsefulSocialImage(preferred, trackedMedia) && !usedImages.has(preferred)) {
    page.socialImage = preferred;
    usedImages.add(preferred);
  }
}
for (const page of pageRecords) {
  if (page.socialImage) continue;
  const selected = page.candidates.find((candidate) => !usedImages.has(candidate) && isUsefulSocialImage(candidate, trackedMedia));
  if (!selected) throw new Error(`找不到可用且未重複的 og:image：${page.route}`);
  page.socialImage = selected;
  usedImages.add(selected);
}

const descriptionGroups = Map.groupBy(pageRecords, (page) => page.description);
for (const page of pageRecords) {
  const duplicateDescription = page.description && descriptionGroups.get(page.description)?.length > 1;
  if (duplicateDescription && !page.override.description) {
    const subject = page.title.replace(/｜小巴老師.*$/, '').replace(/｜親子寫真.*$/, '');
    page.description = `${subject}：查看小巴老師整理的親子寫真作品、拍攝重點與預約資訊。`;
  }
  if (page.override.title) page.title = page.override.title;
  if (page.override.description) page.description = page.override.description;
}

for (const page of pageRecords) {
  let html = page.html;
  const noindex = page.override.noindex === true
    || PRIVATE_PREFIXES.some((prefix) => page.route.startsWith(prefix))
    || REDIRECTED_ROUTES.has(page.route)
    || page.route === '/404.html'
    || getMeta(html, 'name', 'robots').includes('noindex');
  const absoluteImage = `${site.url}${page.socialImage}`;
  const imageAlt = `${page.title.replace(/｜小巴老師.*$/, '')}分享圖片`;
  const ogType = page.route.startsWith('/articles/') && page.route !== '/articles/' ? 'article' : 'website';

  html = setTitle(html, page.title);
  html = upsertMeta(html, 'name', 'description', page.description);
  html = upsertLink(html, 'canonical', page.canonical);
  html = upsertMeta(html, 'property', 'og:type', ogType);
  html = upsertMeta(html, 'property', 'og:site_name', site.shortName);
  html = upsertMeta(html, 'property', 'og:title', page.title);
  html = upsertMeta(html, 'property', 'og:description', page.description);
  html = upsertMeta(html, 'property', 'og:url', page.canonical);
  html = upsertMeta(html, 'property', 'og:image', absoluteImage);
  html = upsertMeta(html, 'property', 'og:image:alt', imageAlt);
  html = upsertMeta(html, 'property', 'og:locale', 'zh_TW');
  html = upsertMeta(html, 'name', 'twitter:card', 'summary_large_image');
  html = upsertMeta(html, 'name', 'twitter:title', page.title);
  html = upsertMeta(html, 'name', 'twitter:description', page.description);
  html = upsertMeta(html, 'name', 'twitter:image', absoluteImage);
  html = upsertMeta(html, 'name', 'twitter:image:alt', imageAlt);
  html = upsertMeta(html, 'name', 'theme-color', '#3d5c4a');
  html = upsertLink(html, 'icon', '/favicon.svg', 'type="image/svg+xml"');
  if (!/href=["']\/favicon\.ico["']/i.test(html)) html = html.replace('</head>', '  <link rel="icon" href="/favicon.ico" sizes="any" />\n</head>');
  html = upsertLink(html, 'apple-touch-icon', '/apple-touch-icon.png', 'sizes="180x180"');
  html = upsertLink(html, 'manifest', '/site.webmanifest');
  if (noindex) html = upsertMeta(html, 'name', 'robots', 'noindex,nofollow,noarchive,nosnippet,noimageindex');

  const types = schemaTypes(html);
  const inferredType = page.override.schemaType === null ? null : page.override.schemaType || inferSchemaType(page.route);
  const primaryTypes = new Set(['AboutPage', 'BlogPosting', 'CollectionPage', 'ContactPage', 'FAQPage', 'ImageGallery', 'Service', 'WebPage']);
  const hasPrimary = types.some((type) => primaryTypes.has(type));
  if (!noindex && inferredType && !hasPrimary) {
    const schema = page.route === '/'
      ? homeSchema({ title: page.title, description: page.description, canonical: page.canonical, image: absoluteImage })
      : primarySchema({ route: page.route, title: page.title, description: page.description, canonical: page.canonical, image: absoluteImage, type: inferredType });
    html = injectSchema(html, schema);
  }
  writeFileSync(page.file, html, 'utf8');
  page.noindex = noindex;
  page.schemaType = inferredType;
}

const sitemapUrls = [...new Set(pageRecords
  .filter((page) => !page.noindex && !REDIRECTED_ROUTES.has(page.route))
  .map((page) => page.canonical)
  .filter((url) => url.startsWith(`${site.url}/`) && !url.includes('?')))]
  .sort();
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((url) => `<url><loc>${escapeXml(url)}</loc><changefreq>weekly</changefreq></url>`).join('\n')}
</urlset>
`;
writeFileSync(join(ROOT, 'sitemap.xml'), sitemap, 'utf8');

const robots = `User-agent: *
Disallow: /admin/
Disallow: /clients/
Disallow: /family-contract/
Disallow: /projects/clients/
Disallow: /content/
Disallow: /data/
Disallow: /docs/
Disallow: /scripts/
Disallow: /src/
Disallow: /templates/
Sitemap: ${site.url}/sitemap.xml
`;
writeFileSync(join(ROOT, 'robots.txt'), robots, 'utf8');
mkdirSync(join(ROOT, 'public'), { recursive: true });
writeFileSync(join(ROOT, 'public', 'robots.txt'), robots, 'utf8');

console.error(`SEO finalizer OK：${pageRecords.length} 頁、${usedImages.size} 張不重複社群圖、${sitemapUrls.length} 個 sitemap URL`);
