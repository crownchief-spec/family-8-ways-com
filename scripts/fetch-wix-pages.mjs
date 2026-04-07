#!/usr/bin/env node
/**
 * Fetch legacy Wix HTML (8-ways.com), extract text + images, download + resize.
 * Real URL paths differ from marketing doc (e.g. /snow not /family-japan-winter).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'public', 'images', 'wix-import');
const metaDir = join(root, 'scripts', '.wix-cache');

/** path segment on 8-ways.com -> SEO folder name under wix-import */
const PAGES = [
  { path: 'taipei', folder: 'taiwan-taipei-family-portrait' },
  { path: 'base', folder: 'taipei-indoor-photography-studio-family' },
  { path: 'tamsui', folder: 'taiwan-tamsui-tamsui-river-family' },
  { path: 'taoyuan', folder: 'taiwan-taoyuan-family-portrait' },
  { path: 'taichung', folder: 'taiwan-taichung-family-portrait' },
  { path: 'yilan', folder: 'taiwan-yilan-family-portrait' },
  { path: 'penghu', folder: 'taiwan-penghu-islands-family' },
  { path: 'camp', folder: 'taiwan-camping-glamping-family' },
  { path: 'party', folder: 'taiwan-birthday-party-family' },
  { path: 'shifen', folder: 'taiwan-yeliu-shifen-railway-family' },
  { path: 'animal', folder: 'taiwan-animal-farm-family' },
  { path: 'snow', folder: 'japan-winter-ski-snow-family-portrait' },
  { path: 'hokkaido', folder: 'japan-hokkaido-tohoku-summer-family' },
  { path: 'okinawa', folder: 'japan-okinawa-beach-family' },
  { path: 'tokyo', folder: 'japan-tokyo-family-portrait' },
  { path: 'disney', folder: 'japan-tokyo-disney-family' },
  { path: 'kyoto', folder: 'japan-kansai-kyoto-osaka-nara-family' },
  { path: 'bali', folder: 'southeast-asia-bali-family' },
  { path: 'singapore', folder: 'southeast-asia-singapore-family' },
  { path: 'korea', folder: 'korea-family-portrait' },
  { path: 'sydney', folder: 'australia-sydney-family-portrait' },
  { path: 'grandparent', folder: 'theme-three-generation-grandparent-family' },
  { path: 'pregnant', folder: 'theme-maternity-pregnancy-family' },
  { path: 'kimono', folder: 'theme-kimono-hanbok-costume-family' },
  { path: 'nightshot', folder: 'theme-night-fireworks-family' },
  { path: 'beach', folder: 'theme-beach-water-family' },
];

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractParagraphs(html) {
  const out = [];
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(html))) {
    const t = stripTags(m[1]);
    if (t.length > 25 && t.length < 2200) out.push(t);
  }
  return [...new Set(out)].slice(0, 35);
}

function extractHeadings(html) {
  const out = [];
  for (const tag of ['h1', 'h2', 'h3']) {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    let m;
    while ((m = re.exec(html))) {
      const t = stripTags(m[1]);
      if (t.length > 2 && t.length < 400) out.push({ tag, text: t });
    }
  }
  return out.slice(0, 25);
}

function wixImageUrls(html) {
  const set = new Set();
  const re = /https:\/\/static\.wixstatic\.com\/media\/[^"'\\\s)]+/g;
  let m;
  while ((m = re.exec(html))) {
    let u = m[0].replace(/\\u0026/g, '&');
    if (u.includes('w_20,h_20')) continue;
    if (u.includes('w_40,h_40')) continue;
    if (u.includes('w_32')) continue;
    if (u.includes('w_192')) continue;
    if (u.includes('blur_2')) continue;
    set.add(u.split('&')[0]);
  }
  return [...set];
}

function pickBestUrls(urls) {
  const byId = new Map();
  for (const u of urls) {
    const idMatch = u.match(/media\/([^/]+)\//);
    if (!idMatch) continue;
    const id = idMatch[1];
    const w = u.match(/w_(\d+)/);
    const width = w ? parseInt(w[1], 10) : 0;
    const prev = byId.get(id);
    if (!prev || width > prev.width) byId.set(id, { u, width });
  }
  return [...byId.values()]
    .sort((a, b) => b.width - a.width)
    .map((x) => x.u)
    .filter((u) => /\.(jpg|jpeg|png|JPG)/i.test(u) || u.includes('~mv2.jpg'));
}

async function fetchText(url) {
  const r = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; FamilySiteMigration/1.0)',
      accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.text();
}

function download(url, dest) {
  execSync(`curl -sSL --max-time 120 -A "Mozilla/5.0" ${JSON.stringify(url)} -o ${JSON.stringify(dest)}`, {
    maxBuffer: 50 * 1024 * 1024,
  });
}

async function main() {
  mkdirSync(metaDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  const summary = [];

  for (const { path: pth, folder } of PAGES) {
    const url = `https://www.8-ways.com/${pth}`;
    console.error('Fetching', folder, url);
    let html;
    try {
      html = await fetchText(url);
    } catch (e) {
      console.error('  FAIL', e.message);
      summary.push({ path: pth, folder, url, error: String(e.message) });
      continue;
    }

    const headings = extractHeadings(html);
    const paragraphs = extractParagraphs(html);
    const imgs = pickBestUrls(wixImageUrls(html)).slice(0, 14);

    writeFileSync(
      join(metaDir, `${pth}.json`),
      JSON.stringify({ path: pth, folder, url, headings, paragraphs, imageUrls: imgs }, null, 2),
      'utf8',
    );

    const imgDir = join(outDir, folder);
    mkdirSync(imgDir, { recursive: true });

    let n = 0;
    for (const imgUrl of imgs.slice(0, 8)) {
      n += 1;
      const ext = /\.png/i.test(imgUrl) ? 'png' : 'jpg';
      const base = `${folder}-outdoor-lifestyle-${String(n).padStart(2, '0')}.${ext}`;
      const dest = join(imgDir, base);
      try {
        download(imgUrl, dest);
        const sz = readFileSync(dest).length;
        if (sz < 2500) continue;
        try {
          execSync(`sips -Z 1920 "${dest}" > /dev/null 2>&1`, { stdio: 'ignore' });
        } catch {
          /* non-mac */
        }
      } catch (e) {
        console.error('  img fail', e.message);
      }
    }

    summary.push({ path: pth, folder, paragraphs: paragraphs.length, images: imgs.length });
  }

  writeFileSync(join(metaDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
