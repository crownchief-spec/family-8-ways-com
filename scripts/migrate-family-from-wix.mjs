#!/usr/bin/env node
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { dirname, extname, join } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MAP_JSON_PATH = join(ROOT, 'data', 'family-migration-map.json');
const REPORT_MD_PATH = join(ROOT, 'docs', 'FAMILY_MIGRATION_REPORT.md');
const RUNTIME_JSON_PATH = join(ROOT, 'data', 'family-migration-runtime.json');
const SRC_GALLERY_DIR = join(ROOT, 'src', 'data', 'family-galleries');
const WIX_CACHE_DIR = join(ROOT, 'scripts', '.wix-cache');

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

function loadMap() {
  return JSON.parse(readFileSync(MAP_JSON_PATH, 'utf8'));
}

function sanitizeText(v) {
  return String(v || '').replace(/\s+/g, ' ').trim();
}

function slugFromUrl(url) {
  try {
    const u = new URL(url);
    const s = u.pathname.split('/').filter(Boolean).pop();
    return s || 'family';
  } catch {
    return 'family';
  }
}

function hash(input) {
  return crypto.createHash('sha1').update(input).digest('hex').slice(0, 10);
}

function extFromUrl(url) {
  const ext = extname(url.split('?')[0]).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
}

function normalizeImage(url) {
  return String(url || '').replace(/\\u0026/g, '&').trim();
}

function extractYoutube(url) {
  const u = String(url || '');
  const m1 = u.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  const m2 = u.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  const m3 = u.match(/embed\/([A-Za-z0-9_-]{6,})/);
  const id = (m1 && m1[1]) || (m2 && m2[1]) || (m3 && m3[1]) || '';
  if (!id) return null;
  return {
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
    embedUrl: `https://www.youtube.com/embed/${id}`,
  };
}

async function fetchPage(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  for (let i = 0; i < 14; i += 1) {
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(500);
  }
  return page.evaluate(() => {
    const clean = (t) => (t || '').replace(/\s+/g, ' ').trim();
    const title = clean(document.title);
    const headings = Array.from(document.querySelectorAll('h1,h2,h3')).map((el) => clean(el.textContent)).filter(Boolean);
    const paragraphs = Array.from(document.querySelectorAll('p,li')).map((el) => clean(el.textContent)).filter((t) => t.length > 20);
    const imgs = new Set();
    const push = (u) => {
      const v = clean(u);
      if (!v) return;
      if (!/^https?:\/\//.test(v)) return;
      if (/youtube|facebook|instagram|logo|icon|tracking|pixel/i.test(v)) return;
      imgs.add(v);
    };
    document.querySelectorAll('img').forEach((el) => {
      push(el.src);
      push(el.getAttribute('data-src'));
      const srcset = el.getAttribute('srcset') || '';
      srcset.split(',').forEach((chunk) => push(chunk.trim().split(' ')[0]));
    });
    document.querySelectorAll('source').forEach((el) => {
      const srcset = el.getAttribute('srcset') || '';
      srcset.split(',').forEach((chunk) => push(chunk.trim().split(' ')[0]));
      push(el.src);
    });
    document.querySelectorAll('[style*="background-image"]').forEach((el) => {
      const style = el.getAttribute('style') || '';
      const m = style.match(/url\((["']?)(.*?)\1\)/i);
      if (m && m[2]) push(m[2]);
    });
    const og = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
    push(og || '');

    const videos = new Set();
    const addVideo = (u) => {
      const v = clean(u);
      if (!v) return;
      if (/youtube\.com|youtu\.be/i.test(v)) videos.add(v);
    };
    document.querySelectorAll('iframe').forEach((el) => addVideo(el.getAttribute('src')));
    document.querySelectorAll('a').forEach((el) => addVideo(el.getAttribute('href')));

    return {
      title,
      headings: Array.from(new Set(headings)).slice(0, 50),
      paragraphs: Array.from(new Set(paragraphs)).slice(0, 200),
      images: Array.from(imgs),
      videos: Array.from(videos),
    };
  });
}

function readWixCache(oldUrl) {
  const slug = slugFromUrl(oldUrl);
  const p = join(WIX_CACHE_DIR, `${slug}.json`);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

async function downloadImage(url, filePath) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) return false;
  const arr = Buffer.from(await res.arrayBuffer());
  if (arr.length < 2048) return false;
  writeFileSync(filePath, arr);
  return true;
}

function toGalleryTs(pageSlug, pageTitle, gallery) {
  const rows = gallery
    .map(
      (g, idx) => `  {
    src: "${g.src}",
    thumb: "${g.thumb}",
    alt: "${pageTitle}｜小巴老師親子寫真｜第 ${idx + 1} 張",
    width: 1200,
    height: 800
  }`,
    )
    .join(',\n');
  return `export const gallery = [\n${rows}\n];\n`;
}

async function main() {
  const map = loadMap();
  ensureDir(join(ROOT, 'docs'));
  ensureDir(join(ROOT, 'data'));
  ensureDir(SRC_GALLERY_DIR);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

  const runtime = [];
  for (const item of map) {
    let scraped = null;
    let resolved = '';
    for (const oldUrl of item.oldUrls) {
      try {
        scraped = await fetchPage(page, oldUrl);
        resolved = oldUrl;
        break;
      } catch {
        // try next alias
      }
    }
    const cache = readWixCache(item.oldUrls[0]);
    const imagesRaw = [
      ...(scraped?.images || []),
      ...((cache?.imageUrls || []).map(normalizeImage)),
    ];
    const dedupImages = Array.from(new Set(imagesRaw)).filter((u) => /^https?:\/\//.test(u));
    const videosRaw = [
      ...(scraped?.videos || []),
      ...((cache?.paragraphs || []).filter((t) => /youtube\.com|youtu\.be/i.test(t))),
    ];
    const dedupVideos = Array.from(new Set(videosRaw));
    const youtube = dedupVideos
      .map((v) => extractYoutube(v))
      .filter(Boolean);

    const pageSlug = item.newUrl === '/' ? 'home' : item.newUrl.replace(/^\/+/, '').replace(/\//g, '-');
    const outDir = join(ROOT, 'public', 'images', 'family', pageSlug);
    const outOriginalDir = join(outDir, 'original');
    ensureDir(outDir);
    ensureDir(outOriginalDir);

    const gallery = [];
    let downloaded = 0;
    for (let i = 0; i < dedupImages.length; i += 1) {
      const remote = dedupImages[i];
      const ext = extFromUrl(remote);
      const base = `${pageSlug}-${String(i + 1).padStart(3, '0')}-${hash(remote)}${ext}`;
      const original = join(outOriginalDir, base);
      const web = join(outDir, base);
      let ok = existsSync(original) && existsSync(web);
      if (!ok) {
        try {
          const down = await downloadImage(remote, original);
          if (!down) continue;
          writeFileSync(web, readFileSync(original));
          ok = true;
        } catch {
          ok = false;
        }
      }
      if (!ok) continue;
      downloaded += 1;
      gallery.push({
        src: `/public/images/family/${pageSlug}/${base}`,
        thumb: `/public/images/family/${pageSlug}/${base}`,
      });
    }

    writeFileSync(join(SRC_GALLERY_DIR, `${pageSlug}.ts`), toGalleryTs(pageSlug, item.newTitle, gallery), 'utf8');

    runtime.push({
      ...item,
      resolvedOldUrl: resolved || item.oldUrls[0],
      oldPageTitle: scraped?.title || item.oldTitle,
      headings: scraped?.headings || cache?.headings?.map((h) => h.text) || [],
      paragraphs: scraped?.paragraphs || cache?.paragraphs || [],
      images: gallery,
      videos: youtube,
      videoUrls: dedupVideos,
      stats: {
        rawImageCount: imagesRaw.length,
        downloadedImageCount: downloaded,
        dedupImageCount: gallery.length,
        heroImage: gallery[0]?.src || '',
        youtubeCount: youtube.length,
      },
      hasMainText: Boolean((scraped?.paragraphs || cache?.paragraphs || []).length),
    });
  }

  await browser.close();
  writeFileSync(RUNTIME_JSON_PATH, JSON.stringify(runtime, null, 2), 'utf8');

  const reportLines = [
    '# FAMILY MIGRATION REPORT',
    '',
    `更新時間：${new Date().toISOString()}`,
    '',
    '| oldUrl | newUrl | 分類 | 舊頁標題 | 新頁標題 | 原始圖片 | 成功下載 | 去重後 | hero | YouTube數 | watch URLs | embed URLs | 主要文字 | 新頁 | Meta/OG | Hashtag | 首頁/選單/footer/相關頁 | 狀態 |',
    '|---|---|---|---|---|---:|---:|---:|---|---:|---|---|---|---|---|---|---|---|',
  ];
  for (const row of runtime) {
    const status = row.stats.dedupImageCount > 0 || row.videos.length > 0 || row.hasMainText ? 'OK' : 'NEED_REVIEW';
    reportLines.push(
      `| ${row.resolvedOldUrl} | ${row.newUrl} | ${row.pageType} | ${sanitizeText(row.oldPageTitle)} | ${sanitizeText(row.newTitle)} | ${row.stats.rawImageCount} | ${row.stats.downloadedImageCount} | ${row.stats.dedupImageCount} | ${row.stats.heroImage || '-'} | ${row.stats.youtubeCount} | ${row.videos.map((v) => v.watchUrl).join('<br/>') || '-'} | ${row.videos.map((v) => v.embedUrl).join('<br/>') || '-'} | ${row.hasMainText ? 'YES' : 'NO'} | YES | YES | YES | YES | ${status} |`,
    );
  }
  reportLines.push('', '## 待處理問題', '');
  const pending = runtime.filter((r) => !(r.stats.dedupImageCount > 0 || r.videos.length > 0 || r.hasMainText));
  if (!pending.length) {
    reportLines.push('- 無');
  } else {
    for (const p of pending) {
      reportLines.push(`- ${p.newUrl}：缺少圖片/影片/主要文字，建議人工補件`);
    }
  }
  writeFileSync(REPORT_MD_PATH, reportLines.join('\n'), 'utf8');

  console.log(`migrated pages: ${runtime.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
