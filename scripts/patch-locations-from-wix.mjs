#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const locDir = join(root, 'content', 'locations');
const cache = join(root, 'scripts', '.wix-cache');
const imgRoot = join(root, 'public', 'images', 'wix-import');

function cleanParagraphs(paras) {
  return paras.filter((p) => {
    if (p.length < 35) return false;
    if (p.includes('爸媽推薦文 方案')) return false;
    if (p.includes('Facebook Twitter')) return false;
    if (p.includes('WeChat微信')) return false;
    if (p.includes('E-mail：')) return false;
    if (p.includes('參考作品/影片')) return false;
    if (p.includes('商業空拍')) return false;
    return true;
  });
}

function firstImage(folder) {
  try {
    const files = readdirSync(join(imgRoot, folder)).filter((f) => /\.(jpg|png)$/i.test(f)).sort();
    return files.length ? `/images/wix-import/${folder}/${files[0]}` : null;
  } catch {
    return null;
  }
}

function bodyFromPath(path) {
  try {
    const j = JSON.parse(readFileSync(join(cache, `${path}.json`), 'utf8'));
    return cleanParagraphs(j.paragraphs || []).slice(0, 6);
  } catch {
    return [];
  }
}

const MAP = [
  ['taipei', 'taipei.md', 'taiwan-taipei-family-portrait'],
  ['tamsui', 'tamsui.md', 'taiwan-tamsui-tamsui-river-family'],
  ['taoyuan', 'taoyuan.md', 'taiwan-taoyuan-family-portrait'],
  ['taichung', 'taichung.md', 'taiwan-taichung-family-portrait'],
  ['yilan', 'yilan.md', 'taiwan-yilan-family-portrait'],
  ['penghu', 'penghu.md', 'taiwan-penghu-islands-family'],
  ['hokkaido', 'hokkaido-tohoku.md', 'japan-hokkaido-tohoku-summer-family'],
  ['okinawa', 'okinawa.md', 'japan-okinawa-beach-family'],
  ['tokyo', 'tokyo.md', 'japan-tokyo-family-portrait'],
  ['kyoto', 'kansai.md', 'japan-kansai-kyoto-osaka-nara-family'],
  ['korea', 'korea.md', 'korea-family-portrait'],
  ['sydney', 'sydney.md', 'australia-sydney-family-portrait'],
  ['singapore', 'singapore.md', 'southeast-asia-singapore-family'],
  ['bali', 'cebu-bali.md', 'southeast-asia-bali-family'],
];

const MARKER = '## 方案與拍攝重點（官網整理）';
const KW =
  '\n\n若你正在規劃親子寫真、家庭攝影或旅行跟拍，也歡迎參考我們的台灣包車與海外旅行跟拍方案。關鍵字參考：親子外拍、全家福照、專屬攝影師跟拍、親子旅遊攝影、旅遊跟拍、旅遊攝影外拍、家庭旅行跟拍。';

for (const [path, fname, folder] of MAP) {
  const fp = join(locDir, fname);
  let raw = readFileSync(fp, 'utf8');
  const cover = firstImage(folder);
  const paras = bodyFromPath(path);
  if (cover) {
    raw = raw.replace(/^cover:.*$/m, `cover: ${JSON.stringify(cover)}`);
  }
  if (!raw.includes(MARKER) && paras.length) {
    const text = paras.map((p) => p.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')).join('\n\n');
    raw = raw.trimEnd() + `\n\n${MARKER}\n\n${text}${KW}\n`;
  }
  writeFileSync(fp, raw, 'utf8');
  console.error('Patched', fname);
}
