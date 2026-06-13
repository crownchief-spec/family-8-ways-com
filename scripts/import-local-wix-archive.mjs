#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { basename, dirname, extname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DEFAULT_ARCHIVE = resolve(ROOT, '..', '攝影', '8ways_family_archive');
const ARCHIVE = resolve(process.argv[2] || DEFAULT_ARCHIVE);
const RUNTIME_PATH = join(ROOT, 'data', 'family-migration-runtime.json');
const CONTENT_DATA_PATH = join(ROOT, 'content', 'family-migration-data.json');
const CONTENT_MANIFEST_PATH = join(ROOT, 'content', 'family-migration-manifest.json');
const SRC_GALLERY_DIR = join(ROOT, 'src', 'data', 'family-galleries');
const OUT_IMAGE_ROOT = join(ROOT, 'public', 'images', 'family', 'archive');
const REPORT_PATH = join(ROOT, 'docs', 'LOCAL_WIX_ARCHIVE_IMPORT.md');

const ID_TO_OLD_PATH = {
  home: 'family',
  'service-flow': 'family',
  faq: 'familyqa',
  reviews: 'familyrecommend',
  'about-ba-wei': 'aboutus',
  taipei: 'taipei',
  studio: 'base',
  tamsui: 'tamsui',
  taoyuan: 'taoyuan',
  hsinchu: 'camp',
  taichung: 'taichung',
  yilan: 'yilan',
  penghu: 'penghu',
  hualien: 'hualien',
  south: 'kaohsiung',
  camping: 'camp',
  birthday: 'party',
  railway: 'shifen',
  farm: 'animal',
  graduation: 'graduate',
  'overseas-index': 'family',
  'japan-winter': 'snow',
  hokkaido: 'hokkaido',
  okinawa: 'okinawa',
  tokyo: 'tokyo',
  disney: 'disney',
  kansai: 'kyoto',
  'cebu-bali': 'bali',
  singapore: 'singapore',
  korea: 'korea',
  australia: 'sydney',
  'themes-index': 'family',
  group: 'groupphoto',
  familydress: 'family',
  grass: 'grass',
  sunset: 'sunset',
  costume: 'kimono',
  night: 'nightshot',
  indoor: 'villa',
  sakura: 'sakura',
  autumn: 'maple',
  beach: 'beach',
  underwater: 'diving',
  rain: 'rain',
  generation: 'grandparent',
  baby: 'baby',
  maternity: 'pregnant',
  works: 'works',
  client: 'family',
};

const ID_TO_IMAGE_FALLBACK_OLD_PATH = {
  group: 'family',
};

const ID_TO_FALLBACK_PARAGRAPHS = {
  maternity: [
    '孕婦寫真適合以自然外拍、飯店房內、民宿或具有生活感的空間進行，拍攝重點不是制式擺拍，而是保留準爸媽期待新生命時的互動與情緒。',
    '可以安排夫妻合照、媽媽獨照、與大寶一起入鏡的親子孕期紀錄，也能依照家庭狀態搭配草地、海邊、室內或黃昏光線，讓照片更像一段家庭故事。',
    '拍攝前可先討論孕期週數、服裝風格、同行家人與地點動線，小巴老師會依照體力與天氣安排節奏，讓拍攝輕鬆、安全，也保留自然好看的畫面。',
  ],
};

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function stripHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function cleanText(value) {
  return stripHtmlEntities(value)
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function slugify(value, fallback = 'page') {
  return String(value || fallback)
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|#%{}^~[\]`;]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 72) || fallback;
}

function unique(items, key = (x) => x) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const k = key(item);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function between(md, start, end) {
  const a = md.indexOf(start);
  if (a < 0) return '';
  const b = end ? md.indexOf(end, a + start.length) : -1;
  return md.slice(a + start.length, b >= 0 ? b : undefined).trim();
}

function parseBullets(section) {
  return unique(
    section
      .split('\n')
      .map((line) => line.replace(/^- /, '').trim())
      .filter((line) => line && !line.startsWith('_沒有')),
  );
}

function scoreParagraph(text) {
  if (!text) return 0;
  if (text.length < 16) return 0;
  if (/^(返回|下一步|播放|暫停|投影片|內容在浮動|My Account|Notifications|Settings|Blog)/i.test(text)) return 0;
  if (/^\{.*\}$/.test(text)) return 0;
  if ((text.match(/方案-/g) || []).length > 7) return 0;
  if ((text.match(/\//g) || []).length > 12 && text.length < 180) return 0;
  return 1;
}

function parseTextBlocks(section) {
  return unique(
    section
      .split(/\n---\n/g)
      .map(cleanText)
      .flatMap((block) => {
        if (!block) return [];
        const lines = block.split('\n').map(cleanText).filter(Boolean);
        if (lines.length <= 2) return [block];
        return [block, ...lines.filter((line) => line.length > 18)];
      })
      .filter((text) => scoreParagraph(text)),
  ).slice(0, 96);
}

function parseImages(md, oldPath, pageId, newTitle) {
  const imageSection = between(md, '## 圖片', '## 連結');
  const matches = [...imageSection.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
  const outDir = join(OUT_IMAGE_ROOT, pageId);
  ensureDir(outDir);
  const copied = [];
  let index = 1;
  for (const match of matches) {
    const alt = cleanText(match[1]) || `${newTitle} 第 ${index} 張`;
    const rel = match[2];
    const srcAbs = resolve(ARCHIVE, 'pages_md', rel);
    if (!existsSync(srcAbs)) continue;
    const ext = extname(srcAbs).toLowerCase() || '.jpg';
    const destName = `${slugify(pageId)}-${String(index).padStart(3, '0')}-${slugify(basename(srcAbs, ext), 'image').slice(0, 42)}${ext}`;
    const destAbs = join(outDir, destName);
    if (!existsSync(destAbs)) copyFileSync(srcAbs, destAbs);
    copied.push({
      src: `/public/images/family/archive/${pageId}/${destName}`,
      thumb: `/public/images/family/archive/${pageId}/${destName}`,
      alt,
      oldPath,
    });
    index += 1;
  }
  return unique(copied, (image) => image.src);
}

function loadArchivePages() {
  const pages = JSON.parse(readFileSync(join(ARCHIVE, 'data', 'pages.json'), 'utf8'));
  const mdFiles = new Map();
  const mdDir = join(ARCHIVE, 'pages_md');
  const files = readdirSync(mdDir).filter((name) => name.endsWith('.md'));
  for (const page of pages) {
    const oldPath = page.pageUriSEO || page.pageId;
    const expected = `${oldPath}.md`;
    const file = files.find((name) => name.endsWith(`-${expected}`) || name === expected);
    if (file) mdFiles.set(oldPath, join(mdDir, file));
  }
  return { pages, mdFiles };
}

function findMdByOldPath(mdFiles, oldPath) {
  if (mdFiles.has(oldPath)) return mdFiles.get(oldPath);
  const normalized = decodeURIComponent(oldPath || '');
  if (mdFiles.has(normalized)) return mdFiles.get(normalized);
  return '';
}

function parseArchivePage(mdPath, oldPath, pageId, newTitle) {
  if (!mdPath || !existsSync(mdPath)) return null;
  const md = readFileSync(mdPath, 'utf8');
  const textSection = between(md, '## 頁面文字', '## 導覽/按鈕文字');
  const labelSection = between(md, '## 導覽/按鈕文字', '## 圖片文字與 Alt');
  const altSection = between(md, '## 圖片文字與 Alt', '## 圖片');
  const paragraphs = parseTextBlocks(textSection);
  const labelHeadings = parseBullets(labelSection);
  const altHeadings = parseBullets(altSection).filter((text) => !/^(My Account|Notifications|Settings|Blog|Followers|Profile)/i.test(text));
  const headings = unique([
    newTitle,
    ...paragraphs
      .flatMap((p) => p.split('\n'))
      .map(cleanText)
      .filter((line) => line.length >= 2 && line.length <= 48),
    ...labelHeadings,
    ...altHeadings,
  ]).slice(0, 36);
  const images = parseImages(md, oldPath, pageId, newTitle);
  return {
    oldPath,
    mdPath,
    headings,
    paragraphs,
    images,
  };
}

function parseArchiveImagesOnly(mdFiles, oldPath, pageId, newTitle) {
  const mdPath = findMdByOldPath(mdFiles, oldPath);
  if (!mdPath || !existsSync(mdPath)) return [];
  const md = readFileSync(mdPath, 'utf8');
  return parseImages(md, oldPath, pageId, newTitle);
}

function toGalleryTs(pageTitle, gallery) {
  const rows = gallery
    .map((g, idx) => `  {
    src: "${g.src}",
    thumb: "${g.thumb}",
    alt: "${(g.alt || `${pageTitle}｜第 ${idx + 1} 張`).replace(/"/g, '\\"')}",
    width: 1200,
    height: 800
  }`)
    .join(',\n');
  return `export const gallery = [\n${rows}\n];\n`;
}

function toContentData(page) {
  return {
    id: page.id,
    old_url: page.oldUrls?.[0] || page.resolvedOldUrl || '',
    resolved_old_url: page.resolvedOldUrl || page.oldUrls?.[0] || '',
    new_url: page.newUrl,
    page_type: page.pageType,
    title: page.headings?.[0] || page.newTitle,
    menu_group: page.pageType,
    photo_count: page.images?.length || 0,
    video_count: page.videos?.length || 0,
    status: page.stats?.dedupImageCount || page.hasMainText ? 'local_archive' : 'needs_review',
    notes: page.archiveSource ? `local archive: ${page.archiveSource.oldPath}` : 'no local archive match',
    headings: page.headings || [],
    paragraphs: page.paragraphs || [],
    images: (page.images || []).map((image) => image.src || image),
    videos: page.videos || [],
  };
}

function main() {
  if (!existsSync(ARCHIVE)) throw new Error(`Archive folder not found: ${ARCHIVE}`);
  ensureDir(OUT_IMAGE_ROOT);
  ensureDir(SRC_GALLERY_DIR);

  const runtime = JSON.parse(readFileSync(RUNTIME_PATH, 'utf8'));
  const { mdFiles } = loadArchivePages();
  const report = [];
  const updated = runtime.map((page) => {
    const oldPath = ID_TO_OLD_PATH[page.id] || page.oldUrls?.map((url) => url.split('/').filter(Boolean).pop()).find(Boolean) || '';
    const mdPath = findMdByOldPath(mdFiles, oldPath);
    const archive = parseArchivePage(mdPath, oldPath, page.id, page.newTitle);
    if (!archive) {
      report.push({ id: page.id, newUrl: page.newUrl, oldPath, status: 'no_match', images: page.images?.length || 0, paragraphs: page.paragraphs?.length || 0 });
      return page;
    }

    const fallbackParagraphs = ID_TO_FALLBACK_PARAGRAPHS[page.id] || [];
    const mergedParagraphs = unique([...archive.paragraphs, ...fallbackParagraphs, ...(page.paragraphs || [])]).slice(0, 110);
    const mergedHeadings = unique([...archive.headings, ...(page.headings || [])]).slice(0, 42);
    const fallbackImages = archive.images.length
      ? []
      : parseArchiveImagesOnly(mdFiles, ID_TO_IMAGE_FALLBACK_OLD_PATH[page.id], page.id, page.newTitle);
    const mergedImages = archive.images.length ? archive.images : fallbackImages.length ? fallbackImages : (page.images || []);
    const next = {
      ...page,
      resolvedOldUrl: `https://www.8-ways.com/${oldPath}`,
      oldPageTitle: page.oldPageTitle || archive.headings[0] || page.oldTitle,
      headings: mergedHeadings,
      paragraphs: mergedParagraphs,
      images: mergedImages,
      stats: {
        ...(page.stats || {}),
        rawImageCount: archive.images.length,
        downloadedImageCount: archive.images.length,
        dedupImageCount: mergedImages.length,
        heroImage: mergedImages[0]?.src || page.stats?.heroImage || '',
        localArchiveParagraphCount: archive.paragraphs.length,
      },
      hasMainText: mergedParagraphs.length > 0,
      archiveSource: {
        oldPath,
        markdown: archive.mdPath.replace(`${ARCHIVE}/`, ''),
      },
    };
    writeFileSync(join(SRC_GALLERY_DIR, `${page.id}.ts`), toGalleryTs(page.newTitle, next.images), 'utf8');
    report.push({ id: page.id, newUrl: page.newUrl, oldPath, status: 'updated', images: next.images.length, paragraphs: next.paragraphs.length });
    return next;
  });

  writeFileSync(RUNTIME_PATH, JSON.stringify(updated, null, 2), 'utf8');
  writeFileSync(CONTENT_DATA_PATH, JSON.stringify(updated.map(toContentData), null, 2), 'utf8');
  writeFileSync(
    CONTENT_MANIFEST_PATH,
    JSON.stringify(
      updated.map((page) => ({
        id: page.id,
        old_url: page.oldUrls?.[0] || page.resolvedOldUrl || '',
        resolved_old_url: page.resolvedOldUrl || '',
        new_url: page.newUrl,
        page_type: page.pageType,
        title: page.newTitle,
        menu_group: page.pageType,
        photo_count: page.images?.length || 0,
        video_count: page.videos?.length || 0,
        status: page.archiveSource ? 'local_archive' : 'needs_review',
        notes: page.archiveSource ? `local archive: ${page.archiveSource.oldPath}` : 'no local archive match',
      })),
      null,
      2,
    ),
    'utf8',
  );

  const lines = [
    '# Local Wix Archive Import',
    '',
    `Archive: ${ARCHIVE}`,
    `Updated at: ${new Date().toISOString()}`,
    '',
    '| id | newUrl | oldPath | status | images | paragraphs |',
    '|---|---|---|---|---:|---:|',
    ...report.map((r) => `| ${r.id} | ${r.newUrl} | ${r.oldPath} | ${r.status} | ${r.images} | ${r.paragraphs} |`),
    '',
  ];
  writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');

  const totals = updated.reduce(
    (acc, page) => {
      acc.images += page.images?.length || 0;
      acc.paragraphs += page.paragraphs?.length || 0;
      if (page.archiveSource) acc.updated += 1;
      return acc;
    },
    { updated: 0, images: 0, paragraphs: 0 },
  );
  console.log(`local archive imported: ${totals.updated}/${updated.length} pages, ${totals.images} images, ${totals.paragraphs} paragraphs`);
}

main();
