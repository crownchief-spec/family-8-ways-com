#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_IMG_ROOT = join(ROOT, 'public', 'images', 'family');
const OUT_DATA_DIR = join(ROOT, 'content');
const CACHE_DIR = join(ROOT, 'scripts', '.wix-cache');

const PAGE_DEFS = [
  { id: 'home', oldPath: 'family', newUrl: '/', pageType: 'home', menuGroup: 'core', title: '親子寫真首頁' },
  { id: 'service', oldPath: 'family-service', newUrl: '/family-service', pageType: 'core', menuGroup: 'core', title: '服務說明與預約流程' },
  { id: 'faq', oldPath: 'familyqa', newUrl: '/family-faq', pageType: 'faq', menuGroup: 'core', title: '常見問題 FAQ' },
  { id: 'reviews', oldPath: 'familyrecommend', newUrl: '/family-reviews', pageType: 'reviews', menuGroup: 'core', title: '爸媽推薦文 / 評價' },
  { id: 'about', oldPath: 'about-ba-wei', newUrl: '/about-ba-wei', pageType: 'about', menuGroup: 'core', title: '關於小巴老師' },

  { id: 'taipei', oldPath: 'taipei', newUrl: '/family-taipei', pageType: 'location', menuGroup: 'taiwan', title: '台北親子寫真' },
  { id: 'studio', oldPath: 'base', newUrl: '/family-studio', pageType: 'location', menuGroup: 'taiwan', title: '台北攝影基地' },
  { id: 'tamsui', oldPath: 'tamsui', newUrl: '/family-tamsui', pageType: 'location', menuGroup: 'taiwan', title: '淡水親子寫真' },
  { id: 'taoyuan', oldPath: 'taoyuan', newUrl: '/family-taoyuan', pageType: 'location', menuGroup: 'taiwan', title: '桃園親子寫真' },
  { id: 'hsinchu', oldPath: 'hsinchu', newUrl: '/family-hsinchu', pageType: 'location', menuGroup: 'taiwan', title: '新竹親子寫真' },
  { id: 'taichung', oldPath: 'taichung', newUrl: '/family-taichung', pageType: 'location', menuGroup: 'taiwan', title: '台中親子寫真' },
  { id: 'yilan', oldPath: 'yilan', newUrl: '/family-yilan', pageType: 'location', menuGroup: 'taiwan', title: '宜蘭親子寫真' },
  { id: 'penghu', oldPath: 'penghu', newUrl: '/family-penghu', pageType: 'location', menuGroup: 'taiwan', title: '澎湖親子寫真' },
  { id: 'camping', oldPath: 'camp', newUrl: '/family-camping', pageType: 'location', menuGroup: 'taiwan', title: '露營團拍 / 親子民宿' },
  { id: 'birthday', oldPath: 'party', newUrl: '/family-birthday', pageType: 'location', menuGroup: 'taiwan', title: '生日派對 / 活動紀錄' },
  { id: 'railway', oldPath: 'shifen', newUrl: '/family-railway', pageType: 'location', menuGroup: 'taiwan', title: '野柳 / 十分天燈鐵道' },
  { id: 'farm', oldPath: 'animal', newUrl: '/family-farm', pageType: 'location', menuGroup: 'taiwan', title: '動物農場系列' },

  { id: 'japan-winter', oldPath: 'snow', newUrl: '/family-japan-winter', pageType: 'overseas', menuGroup: 'overseas', title: '日本冬季滑雪 / 玩雪' },
  { id: 'hokkaido', oldPath: 'hokkaido', newUrl: '/family-hokkaido', pageType: 'overseas', menuGroup: 'overseas', title: '北海道夏季 / 東北' },
  { id: 'okinawa', oldPath: 'okinawa', newUrl: '/family-okinawa', pageType: 'overseas', menuGroup: 'overseas', title: '沖繩親子寫真' },
  { id: 'tokyo', oldPath: 'tokyo', newUrl: '/family-tokyo', pageType: 'overseas', menuGroup: 'overseas', title: '東京 / 迪士尼' },
  { id: 'kansai', oldPath: 'kyoto', newUrl: '/family-kansai', pageType: 'overseas', menuGroup: 'overseas', title: '京都 / 大阪 / 奈良' },
  { id: 'southeast-asia', oldPath: 'bali', newUrl: '/family-southeast-asia', pageType: 'overseas', menuGroup: 'overseas', title: '宿霧 / 峇里島 / 新加坡' },
  { id: 'australia', oldPath: 'sydney', newUrl: '/family-australia', pageType: 'overseas', menuGroup: 'overseas', title: '澳洲雪梨 / 墨爾本' },
  { id: 'korea', oldPath: 'korea', newUrl: '/family-korea', pageType: 'overseas', menuGroup: 'overseas', title: '韓國親子寫真' },

  { id: 'generation', oldPath: 'grandparent', newUrl: '/family-generation', pageType: 'theme', menuGroup: 'themes', title: '三代同堂 / 祖父母' },
  { id: 'maternity', oldPath: 'pregnant', newUrl: '/maternity', pageType: 'theme', menuGroup: 'themes', title: '孕婦寫真' },
  { id: 'costume', oldPath: 'kimono', newUrl: '/family-costume', pageType: 'theme', menuGroup: 'themes', title: '和服 / 韓服 / 旗袍' },
  { id: 'night', oldPath: 'nightshot', newUrl: '/family-night', pageType: 'theme', menuGroup: 'themes', title: '夜拍 / 玩煙火' },
  { id: 'beach', oldPath: 'beach', newUrl: '/family-beach', pageType: 'theme', menuGroup: 'themes', title: '海灘 / 玩水' },
];

const OLD_URL = (path) => `https://www.8-ways.com/${path}`;

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function sanitizeText(t) {
  return String(t || '')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function normalizeImg(url) {
  if (!url) return '';
  return String(url).replace(/\\u0026/g, '&').trim();
}

function hashOf(input) {
  return crypto.createHash('sha1').update(input).digest('hex').slice(0, 10);
}

function extFromUrl(url) {
  const clean = url.split('?')[0];
  const ext = extname(clean).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
}

async function downloadFile(url, dest) {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 FamilyMigrationBot/2.0' },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 2048) return false;
    writeFileSync(dest, buf);
    return true;
  } catch {
    return false;
  }
}

function readCache(oldPath) {
  const p = join(CACHE_DIR, `${oldPath}.json`);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8'));
}

async function extractPageData(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 });
    await page.waitForTimeout(1200);
  } catch {
    await page.goto(url, { waitUntil: 'load', timeout: 12000 });
    await page.waitForTimeout(1200);
  }
  for (let i = 0; i < 4; i += 1) {
    await page.mouse.wheel(0, 2600);
    await page.waitForTimeout(240);
  }
  return page.evaluate(() => {
    const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const paragraphs = Array.from(document.querySelectorAll('p,li'))
      .map((el) => clean(el.textContent))
      .filter((t) => t.length > 20 && t.length < 2200);
    const headings = Array.from(document.querySelectorAll('h1,h2,h3'))
      .map((el) => clean(el.textContent))
      .filter((t) => t.length > 1 && t.length < 300);
    const imgSet = new Set();
    const pushImg = (u) => {
      const v = clean(u);
      if (!v) return;
      if (/data:image|svg\+xml/i.test(v)) return;
      if (!/^https?:\/\//i.test(v)) return;
      imgSet.add(v);
    };
    document.querySelectorAll('img').forEach((img) => {
      pushImg(img.currentSrc);
      pushImg(img.src);
      pushImg(img.getAttribute('data-src'));
      const srcset = img.getAttribute('srcset') || '';
      srcset.split(',').forEach((it) => pushImg(it.trim().split(' ')[0]));
    });
    document.querySelectorAll('source').forEach((source) => {
      const srcset = source.getAttribute('srcset') || '';
      srcset.split(',').forEach((it) => pushImg(it.trim().split(' ')[0]));
      pushImg(source.getAttribute('src'));
    });
    const videoSet = new Set();
    const pushVideo = (u) => {
      const v = clean(u);
      if (!v) return;
      if (/youtube\.com|youtu\.be/i.test(v)) videoSet.add(v);
    };
    document.querySelectorAll('iframe').forEach((el) => pushVideo(el.getAttribute('src')));
    document.querySelectorAll('a').forEach((el) => pushVideo(el.getAttribute('href')));
    const menuLinks = Array.from(document.querySelectorAll('a'))
      .map((a) => ({ text: clean(a.textContent), href: a.href }))
      .filter((a) => a.href && /8-ways\.com/.test(a.href) && a.text.length > 0);
    return {
      title: clean(document.title),
      headings: Array.from(new Set(headings)).slice(0, 80),
      paragraphs: Array.from(new Set(paragraphs)).slice(0, 160),
      images: Array.from(imgSet),
      videos: Array.from(videoSet),
      menuLinks,
    };
  });
}

async function main() {
  ensureDir(OUT_IMG_ROOT);
  ensureDir(OUT_DATA_DIR);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let familyRoot = { menuLinks: [] };
  try {
    familyRoot = await extractPageData(page, OLD_URL('family'));
  } catch {
    familyRoot = { menuLinks: [] };
  }
  const menuHrefSet = new Set(
    familyRoot.menuLinks
      .map((i) => i.href)
      .filter((href) => href.startsWith('https://www.8-ways.com/'))
      .map((href) => href.replace(/\/+$/, '')),
  );

  const manifest = [];
  const pageData = [];
  let totalDownloaded = 0;

  for (const def of PAGE_DEFS) {
    const guessed = OLD_URL(def.oldPath);
    const resolvedOldUrl = [...menuHrefSet].find((u) => u.endsWith(`/${def.oldPath}`)) || guessed;
    const record = {
      id: def.id,
      old_url: guessed,
      resolved_old_url: resolvedOldUrl,
      new_url: def.newUrl,
      page_type: def.pageType,
      title: def.title,
      menu_group: def.menuGroup,
      photo_count: 0,
      video_count: 0,
      status: 'pending',
      notes: '',
    };

    let extracted = null;
    try {
      extracted = await extractPageData(page, resolvedOldUrl);
      record.status = 'scraped';
    } catch (e) {
      record.status = 'failed';
      record.notes = String(e.message || e);
    }

    const cache = readCache(def.oldPath);
    const headings = [
      ...(extracted?.headings || []),
      ...((cache?.headings || []).map((h) => (h.text ? h.text : '')).filter(Boolean)),
    ];
    const paragraphs = [...(extracted?.paragraphs || []), ...(cache?.paragraphs || [])];
    const images = [...(extracted?.images || []), ...(cache?.imageUrls || [])].map(normalizeImg);
    const videos = extracted?.videos || [];

    const uniqueHeadings = Array.from(new Set(headings.map(sanitizeText))).filter(Boolean);
    const uniqueParagraphs = Array.from(new Set(paragraphs.map(sanitizeText))).filter(Boolean);
    const uniqueImages = Array.from(new Set(images)).filter((u) => /^https?:\/\//.test(u));
    const uniqueVideos = Array.from(new Set(videos)).filter(Boolean);

    const sectionDir = join(OUT_IMG_ROOT, def.menuGroup, def.id);
    ensureDir(sectionDir);

    const localImages = [];
    for (let i = 0; i < Math.min(uniqueImages.length, 36); i += 1) {
      const remote = uniqueImages[i];
      const filename = `${String(i + 1).padStart(3, '0')}-${hashOf(remote)}${extFromUrl(remote)}`;
      const dest = join(sectionDir, filename);
      if (!existsSync(dest)) {
        const ok = await downloadFile(remote, dest);
        if (!ok) continue;
        totalDownloaded += 1;
      }
      localImages.push(`/public/images/family/${def.menuGroup}/${def.id}/${filename}`);
    }

    record.photo_count = localImages.length;
    record.video_count = uniqueVideos.length;
    if (record.status === 'failed' && (localImages.length > 0 || uniqueParagraphs.length > 0)) {
      record.status = 'fallback_cache';
      record.notes = `live抓取失敗，已使用快取補齊`;
    } else if (record.status === 'scraped' && cache) {
      record.notes = 'live + 快取整合';
    } else if (record.status === 'scraped') {
      record.notes = 'live抓取';
    }

    manifest.push(record);
    pageData.push({
      ...record,
      title: uniqueHeadings[0] || def.title,
      headings: uniqueHeadings.slice(0, 24),
      paragraphs: uniqueParagraphs.slice(0, 80),
      images: localImages,
      videos: uniqueVideos,
    });
  }

  await browser.close();

  writeFileSync(join(OUT_DATA_DIR, 'family-migration-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  writeFileSync(join(OUT_DATA_DIR, 'family-migration-data.json'), JSON.stringify(pageData, null, 2), 'utf8');
  writeFileSync(
    join(OUT_DATA_DIR, 'family-migration-report.json'),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        total_pages: manifest.length,
        downloaded_images: totalDownloaded,
        scraped_ok: manifest.filter((m) => m.status === 'scraped').length,
        fallback_cache: manifest.filter((m) => m.status === 'fallback_cache').length,
        failed: manifest.filter((m) => m.status === 'failed').map((m) => m.id),
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log(`manifest/pages written: ${manifest.length}, images downloaded: ${totalDownloaded}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
