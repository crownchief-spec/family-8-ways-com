#!/usr/bin/env node
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const dataPath = join(ROOT, 'data', 'family-migration-runtime.json');
if (!existsSync(dataPath)) throw new Error('缺少 data/family-migration-runtime.json，請先執行 migrate script');
const pages = JSON.parse(readFileSync(dataPath, 'utf8'));

const failures = [];
function check(cond, msg) { if (!cond) failures.push(msg); }

for (const p of pages) {
  const rel = p.newUrl === '/' ? 'index.html' : `${p.newUrl.replace(/^\/+/, '')}/index.html`;
  const abs = join(ROOT, rel);
  check(existsSync(abs), `${p.newUrl}: 頁面不存在`);
  if (!existsSync(abs)) continue;
  const html = readFileSync(abs, 'utf8');
  check(/<h1[\s>]/i.test(html), `${p.newUrl}: 缺少 H1`);
  check(/<title>[^<]+<\/title>/i.test(html), `${p.newUrl}: 缺少 meta title`);
  check(/meta name="description"/i.test(html), `${p.newUrl}: 缺少 meta description`);
  check(/meta property="og:image"/i.test(html), `${p.newUrl}: 缺少 og:image`);
  check(html.includes('本頁作品照片：'), `${p.newUrl}: 缺少頁面統計行`);
  check(/#\s+[^\s]+/.test(html), `${p.newUrl}: 缺少 hashtag`);
  if (p.images?.length && p.id !== 'client') {
    const countInHtml = (html.match(/\/public\/images\/family\//g) || []).length;
    check(countInHtml >= Math.min(1, p.images.length), `${p.newUrl}: gallery 似乎未輸出`);
  }
  check(!/static\.wixstatic\.com/i.test(html), `${p.newUrl}: 發現 wix 外連圖片`);
  for (const v of p.videos || []) {
    check(/^https:\/\/www\.youtube\.com\/embed\//.test(v.embedUrl), `${p.newUrl}: embed URL 格式錯誤`);
  }
  check(/服務流程|台灣|海外|主題|推薦|常見問題|關於/i.test(html), `${p.newUrl}: footer/導覽關鍵連結不足`);
}

for (const p of pages) {
  for (const img of p.images || []) {
    const abs = join(ROOT, img.src.replace(/^\/+/, ''));
    check(existsSync(abs), `${p.newUrl}: 圖片不存在 ${img.src}`);
  }
}

const home = readFileSync(join(ROOT, 'index.html'), 'utf8');
for (const token of ['台灣拍攝', '海外旅拍', '主題分類', '作品案例', '客戶專區']) {
  check(home.includes(token), `首頁缺少入口：${token}`);
}
check(existsSync(join(ROOT, 'public', '_redirects')), '缺少 public/_redirects');

if (failures.length) {
  console.error('CHECK FAILED');
  for (const f of failures) console.error('-', f);
  process.exit(1);
}
console.log(`CHECK OK (${pages.length} pages)`);
