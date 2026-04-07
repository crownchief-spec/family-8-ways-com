#!/usr/bin/env node
/**
 * Build content/spotlights/*.md from scripts/.wix-cache + public images.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const cache = join(root, 'scripts', '.wix-cache');
const imgRoot = join(root, 'public', 'images', 'wix-import');
const outDir = join(root, 'content', 'spotlights');

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

function listImages(folder) {
  const dir = join(imgRoot, folder);
  try {
    return readdirSync(dir)
      .filter((f) => /\.(jpg|jpeg|png)$/i.test(f))
      .sort()
      .map((f) => `/images/wix-import/${folder}/${f}`);
  } catch {
    return [];
  }
}

const SPOTLIGHTS = [
  {
    slug: 'taipei-photography-studio',
    path: 'base',
    folder: 'taipei-indoor-photography-studio-family',
    title: '台北攝影基地｜室內親子寫真與家庭攝影',
    subtitle: '棚內／基地型態的親子寫真與全家福照，適合想控管光線與動線的家庭。',
    category: 'taiwan',
    sort: 5,
  },
  {
    slug: 'taiwan-camping-glamping',
    path: 'camp',
    folder: 'taiwan-camping-glamping-family',
    title: '露營團拍／親子民宿｜台灣包車旅拍',
    subtitle: '露營區與親子民宿外拍，把營火、草地與星空寫進家庭寫真。',
    category: 'taiwan',
    sort: 6,
  },
  {
    slug: 'taiwan-birthday-party',
    path: 'party',
    folder: 'taiwan-birthday-party-family',
    title: '生日派對／活動紀錄｜親子外拍',
    subtitle: '派對現場的互動與情緒，用家庭攝影與活動紀錄方式完整留下。',
    category: 'taiwan',
    sort: 7,
  },
  {
    slug: 'taiwan-yeliu-shifen-railway',
    path: 'shifen',
    folder: 'taiwan-yeliu-shifen-railway-family',
    title: '野柳／十分天燈鐵道｜台北包車親子旅拍',
    subtitle: '北海岸與鐵道沿線景點，適合想結合旅行跟拍與家庭照的一日行程。',
    category: 'taiwan',
    sort: 8,
  },
  {
    slug: 'taiwan-animal-farm',
    path: 'animal',
    folder: 'taiwan-animal-farm-family',
    title: '動物農場系列｜親子外拍與兒童寫真',
    subtitle: '農場互動與戶外自然光，讓孩子邊玩邊拍，畫面真實不生硬。',
    category: 'taiwan',
    sort: 9,
  },
  {
    slug: 'japan-winter-ski-snow',
    path: 'snow',
    folder: 'japan-winter-ski-snow-family-portrait',
    title: '日本冬季滑雪／玩雪｜海外旅行跟拍',
    subtitle: '雪地親子寫真與滑雪動態紀錄，專屬攝影師跟拍，把旅拍做成你的家庭故事。',
    category: 'overseas',
    sort: 1,
  },
  {
    slug: 'japan-tokyo-disney',
    path: 'disney',
    folder: 'japan-tokyo-disney-family',
    title: '東京迪士尼｜親子旅遊攝影與旅拍',
    subtitle: '樂園氛圍與家庭互動並重，海外旅行跟拍讓行程與全家福照一次完成。',
    category: 'overseas',
    sort: 2,
  },
  {
    slug: 'southeast-asia-bali',
    path: 'bali',
    folder: 'southeast-asia-bali-family',
    title: '峇里島｜海島親子寫真與旅遊攝影外拍',
    subtitle: '熱帶度假氛圍中的家庭攝影，適合想放慢腳步的旅遊跟拍。',
    category: 'overseas',
    sort: 15,
  },
  {
    slug: 'grandparent-three-generation',
    path: 'grandparent',
    folder: 'theme-three-generation-grandparent-family',
    title: '三代同堂／祖父母｜家庭寫真與全家福照',
    subtitle: '讓長輩自然入鏡，記錄跨代互動與家庭聚會的溫度。',
    category: 'theme',
    sort: 1,
  },
  {
    slug: 'maternity-pregnancy',
    path: 'pregnant',
    folder: 'theme-maternity-pregnancy-family',
    title: '孕婦寫真｜家庭攝影與親子攝影銜接',
    subtitle: '孕期曲線與家庭互動並重，可與未來的兒童寫真延續同一套美學。',
    category: 'theme',
    sort: 2,
  },
  {
    slug: 'kimono-hanbok-costume',
    path: 'kimono',
    folder: 'theme-kimono-hanbok-costume-family',
    title: '和服／韓服／旗袍｜旅行跟拍主題',
    subtitle: '服飾主題與地景搭配，讓旅拍照片更有文化感與紀念性。',
    category: 'theme',
    sort: 3,
  },
  {
    slug: 'night-fireworks',
    path: 'nightshot',
    folder: 'theme-night-fireworks-family',
    title: '夜拍／煙火｜親子外拍與旅遊跟拍',
    subtitle: '夜景與煙火需要經驗累積的曝光與引導，把派對感與家庭感留在同一組畫面。',
    category: 'theme',
    sort: 4,
  },
  {
    slug: 'beach-water-play',
    path: 'beach',
    folder: 'theme-beach-water-family',
    title: '海灘／玩水｜家庭旅行跟拍',
    subtitle: '海邊戲水與艷陽下的親子寫真，把握光線與安全距離，拍起來輕鬆自然。',
    category: 'theme',
    sort: 5,
  },
];

function headingFromJson(path) {
  try {
    const j = JSON.parse(readFileSync(join(cache, `${path}.json`), 'utf8'));
    const h = (j.headings || []).find(
      (x) =>
        x.tag === 'h3' &&
        !x.text.includes('台灣 TAIWAN') &&
        x.text.length > 4 &&
        !x.text.includes('八威創意'),
    );
    return h ? h.text.replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ') : '';
  } catch {
    return '';
  }
}

function bodyFromJson(path) {
  try {
    const j = JSON.parse(readFileSync(join(cache, `${path}.json`), 'utf8'));
    return cleanParagraphs(j.paragraphs || []).slice(0, 8);
  } catch {
    return [];
  }
}

mkdirSync(outDir, { recursive: true });

for (const s of SPOTLIGHTS) {
  const imgs = listImages(s.folder);
  const cover = imgs[0] || '/og-default.svg';
  const paras = bodyFromJson(s.path);
  const h3 = headingFromJson(s.path);
  const lines = [
    '---',
    `title: ${JSON.stringify(s.title)}`,
    `subtitle: ${JSON.stringify(s.subtitle)}`,
    `category: ${s.category}`,
    `sort: ${s.sort}`,
    `cover: ${JSON.stringify(cover)}`,
    `legacy_url: "https://www.8-ways.com/${s.path}"`,
    `image_dir: ${JSON.stringify(s.folder)}`,
    `gallery: [${imgs.slice(0, 8).map((x) => JSON.stringify(x)).join(', ')}]`,
    'draft: false',
    '---',
    '',
    `## ${s.title.split('｜')[0].trim()}`,
    '',
    paras.length
      ? paras.map((p) => p.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')).join('\n\n')
      : s.subtitle,
    '',
    h3 ? `### ${h3}\n` : '',
    '',
    '關於親子寫真、家庭攝影與旅行跟拍，我們以自然互動為核心，並可依你的行程搭配台灣包車或海外旅行跟拍。若你在找專屬攝影師跟拍、親子旅遊攝影或旅遊攝影外拍，歡迎用 Line 與我討論行程與檔期。',
    '',
  ].join('\n');

  writeFileSync(join(outDir, `${s.slug}.md`), lines, 'utf8');
  console.error('Wrote', s.slug);
}
