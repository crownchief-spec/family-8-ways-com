#!/usr/bin/env node
/** 全站 SEO／OG／AI 可讀性稽核，並產生逐頁維護總表。 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://family.8-ways.com';
const SKIP_DIRS = new Set(['node_modules', 'templates', 'src', 'data', 'content', 'components']);
const REDIRECTED_ROUTES = new Set(['/pages/about.html', '/pages/contact.html', '/pages/reviews.html', '/pages/services.html']);
const args = new Set(process.argv.slice(2));

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
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const a = new RegExp(`<meta\\b[^>]*${key}=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i');
  const b = new RegExp(`<meta\\b[^>]*content=["']([^"']*)["'][^>]*${key}=["']${escaped}["'][^>]*>`, 'i');
  return html.match(a)?.[1] || html.match(b)?.[1] || '';
}

function getLink(html, rel) {
  const a = new RegExp(`<link\\b[^>]*rel=["']${rel}["'][^>]*href=["']([^"']*)["'][^>]*>`, 'i');
  const b = new RegExp(`<link\\b[^>]*href=["']([^"']*)["'][^>]*rel=["']${rel}["'][^>]*>`, 'i');
  return html.match(a)?.[1] || html.match(b)?.[1] || '';
}

function schemas(html) {
  const types = [];
  let invalid = false;
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(match[1]);
      const nodes = Array.isArray(data) ? data : data['@graph'] || [data];
      for (const node of nodes) {
        const type = node?.['@type'];
        if (Array.isArray(type)) types.push(...type);
        else if (type) types.push(type);
      }
    } catch {
      invalid = true;
    }
  }
  return { types: [...new Set(types)], invalid };
}

function heroImage(html) {
  return html.match(/background-image\s*:\s*url\((?:["'])?([^"')]+)(?:["'])?\)/i)?.[1]
    || html.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1]
    || '';
}

function normalizeRef(value) {
  return String(value || '').replace(/&amp;/g, '&').split('#')[0].split('?')[0];
}

function resolveLocalRef(ref, htmlFile, trackedFiles, redirectSources) {
  const clean = normalizeRef(ref);
  if (!clean || clean.startsWith('#') || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(clean)) return true;
  const absolute = clean.startsWith('/') ? clean : `/${relative(ROOT, join(dirname(htmlFile), clean)).split(sep).join('/')}`;
  if (redirectSources.has(absolute) || redirectSources.has(absolute.replace(/\/+$/, ''))) return true;
  const rel = absolute.replace(/^\//, '');
  if (trackedFiles.has(rel) || existsSync(join(ROOT, rel))) return true;
  if (existsSync(join(ROOT, rel, 'index.html'))) return true;
  if (existsSync(join(ROOT, `${rel}.html`))) return true;
  return false;
}

function md(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
}

const trackedFiles = new Set(
  execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n').map((x) => x.trim()).filter(Boolean),
);
const redirectSources = new Set();
const redirectsPath = join(ROOT, '_redirects');
if (existsSync(redirectsPath)) {
  for (const line of readFileSync(redirectsPath, 'utf8').split('\n')) {
    const source = line.trim().split(/\s+/)[0];
    if (source?.startsWith('/') && !source.includes('*')) redirectSources.add(source);
  }
}

const pages = walkHtml().sort().map((file) => {
  const html = readFileSync(file, 'utf8');
  const route = routeFromFile(file);
  const robotValue = getMeta(html, 'name', 'robots');
  const schema = schemas(html);
  const refs = [
    ...[...html.matchAll(/\b(?:href|src|poster)=["']([^"']+)["']/gi)].map((m) => m[1]),
    ...[...html.matchAll(/background-image\s*:\s*url\((?:["'])?([^"')]+)(?:["'])?\)/gi)].map((m) => m[1]),
  ];
  return {
    file: relative(ROOT, file).split(sep).join('/'),
    route,
    title: getTitle(html),
    description: getMeta(html, 'name', 'description'),
    canonical: getLink(html, 'canonical'),
    heroImage: heroImage(html),
    ogTitle: getMeta(html, 'property', 'og:title'),
    ogDescription: getMeta(html, 'property', 'og:description'),
    ogUrl: getMeta(html, 'property', 'og:url'),
    ogImage: getMeta(html, 'property', 'og:image'),
    twitterCard: getMeta(html, 'name', 'twitter:card'),
    twitterImage: getMeta(html, 'name', 'twitter:image'),
    noindex: robotValue.includes('noindex'),
    h1Count: (html.match(/<h1\b/gi) || []).length,
    lang: html.match(/<html\b[^>]*lang=["']([^"']+)/i)?.[1] || '',
    manifest: getLink(html, 'manifest'),
    appleTouchIcon: getLink(html, 'apple-touch-icon'),
    themeColor: getMeta(html, 'name', 'theme-color'),
    schemaTypes: schema.types,
    invalidSchema: schema.invalid,
    emptyMediaAttributes: [...html.matchAll(/\b(?:src|poster)=["']\s*["']/gi)].map((match) => match[0]),
    brokenRefs: [...new Set(refs.filter((ref) => !resolveLocalRef(ref, file, trackedFiles, redirectSources)))],
  };
});

const indexable = pages.filter((page) => !page.noindex && !REDIRECTED_ROUTES.has(page.route));
const duplicateGroups = (key, list = indexable) => [...Map.groupBy(list, (page) => page[key]).entries()]
  .filter(([value, group]) => value && group.length > 1)
  .map(([value, group]) => ({ value, files: group.map((page) => page.file) }));

const sitemapUrls = existsSync(join(ROOT, 'sitemap.xml'))
  ? [...readFileSync(join(ROOT, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  : [];
const canonicalSet = new Set(indexable.map((page) => page.canonical));
const sitemapSet = new Set(sitemapUrls);

const issues = {
  missingTitle: pages.filter((page) => !page.title).map((page) => page.file),
  missingDescription: pages.filter((page) => !page.description).map((page) => page.file),
  missingCanonical: pages.filter((page) => !page.canonical).map((page) => page.file),
  missingOpenGraph: pages.filter((page) => !page.ogTitle || !page.ogDescription || !page.ogUrl || !page.ogImage).map((page) => page.file),
  missingTwitter: pages.filter((page) => page.twitterCard !== 'summary_large_image' || !page.twitterImage).map((page) => page.file),
  missingAppMeta: pages.filter((page) => !page.manifest || !page.appleTouchIcon || !page.themeColor).map((page) => page.file),
  invalidH1: pages.filter((page) => page.h1Count !== 1).map((page) => `${page.file} (${page.h1Count})`),
  invalidLang: pages.filter((page) => page.lang !== 'zh-Hant').map((page) => page.file),
  missingSchema: indexable.filter((page) => !page.schemaTypes.length).map((page) => page.file),
  invalidSchema: pages.filter((page) => page.invalidSchema).map((page) => page.file),
  emptyMediaAttributes: pages.filter((page) => page.emptyMediaAttributes.length).map((page) => page.file),
  duplicateTitle: duplicateGroups('title'),
  duplicateDescription: duplicateGroups('description'),
  duplicateCanonical: duplicateGroups('canonical'),
  duplicateOgImage: duplicateGroups('ogImage', pages),
  brokenReferences: pages.filter((page) => page.brokenRefs.length).map((page) => ({ file: page.file, refs: page.brokenRefs })),
  sitemapMissing: [...canonicalSet].filter((url) => !sitemapSet.has(url)),
  sitemapExtra: [...sitemapSet].filter((url) => !canonicalSet.has(url)),
  hardcodedDefaultOg: pages.filter((page) => /(?:og-default|\/default\.svg)/i.test(page.ogImage)).map((page) => page.file),
  missingHero: pages.filter((page) => !page.heroImage).map((page) => page.file),
};

const summary = {
  totalPages: pages.length,
  indexablePages: indexable.length,
  noindexPages: pages.length - indexable.length,
  uniqueOgImages: new Set(pages.map((page) => page.ogImage)).size,
  sitemapUrls: sitemapUrls.length,
  filesWithBrokenReferences: issues.brokenReferences.length,
  filesMissingSchema: issues.missingSchema.length,
  duplicateTitleGroups: issues.duplicateTitle.length,
  duplicateDescriptionGroups: issues.duplicateDescription.length,
  duplicateCanonicalGroups: issues.duplicateCanonical.length,
  duplicateOgImageGroups: issues.duplicateOgImage.length,
};

const criticalKeys = [
  'missingTitle', 'missingDescription', 'missingCanonical', 'missingOpenGraph', 'missingTwitter',
  'missingAppMeta', 'invalidH1', 'invalidLang', 'missingSchema', 'invalidSchema', 'emptyMediaAttributes',
  'duplicateTitle', 'duplicateDescription', 'duplicateCanonical', 'duplicateOgImage',
  'brokenReferences', 'sitemapMissing', 'sitemapExtra', 'hardcodedDefaultOg',
];
const criticalCount = criticalKeys.reduce((sum, key) => sum + issues[key].length, 0);

if (args.has('--write')) {
  mkdirSync(join(ROOT, 'docs'), { recursive: true });
  mkdirSync(join(ROOT, 'data'), { recursive: true });
  writeFileSync(join(ROOT, 'data', 'seo-audit-report.json'), `${JSON.stringify({ summary, issues, pages }, null, 2)}\n`, 'utf8');

  const table = [
    '# 全站 SEO 頁面維護總表',
    '',
    '> 由 `npm run audit:seo` 依最終 HTML 自動產生；請勿手改表格內容。',
    '',
    `- 總頁數：${summary.totalPages}`,
    `- 可索引頁：${summary.indexablePages}`,
    `- noindex 頁：${summary.noindexPages}`,
    `- 不重複 og:image：${summary.uniqueOgImages}`,
    '',
    '| page file | route | title | description | canonical | hero image | og image | schema type | noindex |',
    '|---|---|---|---|---|---|---|---|---|',
    ...pages.map((page) => `| ${md(page.file)} | ${md(page.route)} | ${md(page.title)} | ${md(page.description)} | ${md(page.canonical)} | ${md(page.heroImage || 'TODO：頁面無可見 hero')} | ${md(page.ogImage)} | ${md(page.schemaTypes.join(', ') || '—')} | ${page.noindex ? '是' : '否'} |`),
    '',
  ].join('\n');
  writeFileSync(join(ROOT, 'docs', 'seo-page-map.md'), table, 'utf8');
}

console.log(JSON.stringify({ summary, criticalCount }, null, 2));
if (args.has('--check') && criticalCount > 0) {
  console.error(JSON.stringify(issues, null, 2));
  process.exit(1);
}
