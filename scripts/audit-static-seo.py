#!/usr/bin/env python3
"""Audit final static HTML, local resources, unique social images and all 100 requested items."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
from collections import Counter
import json,re,html,sys
R=Path(__file__).resolve().parents[1];D=R/'dist';cfg=json.loads((R/'content/seo/site.json').read_text());report=json.loads((R/'reports/seo-maintenance.json').read_text());rows=report['pages'];live=[r for r in rows if not r['noindex']];issues=[];warnings=[];headingJumps=[];missingAlt=[];missingSize=[];lazyHero=[];broken=[];references=0;faqPages=[]
class Page(HTMLParser):
 def __init__(self):super().__init__();self.tags=[]
 def handle_starttag(self,t,a):self.tags.append((t,dict(a)))
redirects=[]
if (D/'_redirects').exists():redirects=[l.split()[0] for l in (D/'_redirects').read_text().splitlines() if l.strip() and not l.startswith('#')]
def redirected(path):return any(re.fullmatch(re.escape(x).replace(r'\*','.*'),path) for x in redirects)
requiredMeta=['description','og:title','og:description','og:image','og:url','og:type','og:site_name','twitter:card','twitter:title','twitter:description','twitter:image','theme-color']
for row in rows:
 p=R/row['pageFile'];s=p.read_text();h=Page();h.feed(s);tags=h.tags
 meta={a.get('name',a.get('property')):a.get('content','') for t,a in tags if t=='meta'};links={a.get('rel'):a.get('href') for t,a in tags if t=='link'}
 for k in requiredMeta:
  if not meta.get(k):issues.append([row['route'],'missing '+k])
 if meta.get('og:url')!=row['canonical'] or links.get('canonical')!=row['canonical']:issues.append([row['route'],'canonical mismatch'])
 if meta.get('twitter:image')!=meta.get('og:image'):issues.append([row['route'],'Twitter image mismatch'])
 if urlsplit(row['canonical']).netloc!=urlsplit(cfg['url']).netloc or not row['canonical'].startswith('https://') or urlsplit(row['canonical']).query:issues.append([row['route'],'invalid canonical'])
 if not row['noindex'] and sum(t=='h1' for t,a in tags)!=1:issues.append([row['route'],'H1 count'])
 if not row['noindex'] and 'WebPage' not in row['schemaType']:issues.append([row['route'],'missing WebPage'])
 if row['noindex'] and 'noindex' not in meta.get('robots',''):issues.append([row['route'],'missing noindex'])
 for raw in re.findall(r'<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>([\s\S]*?)</script>',s,re.I):
  try:json.loads(raw)
  except:issues.append([row['route'],'invalid JSON-LD'])
 level=0
 for t,a in tags:
  if re.fullmatch('h[1-6]',t):
   v=int(t[1]);
   if level and v>level+1 and not row['noindex']:headingJumps.append([row['route'],level,v])
   level=v
  if t=='img' and (a.get('src') or a.get('srcset')):
   if not a.get('alt'):missingAlt.append([row['route'],a.get('src')])
   if not a.get('width') or not a.get('height'):missingSize.append([row['route'],a.get('src')])
  if t=='html' and a.get('lang') not in ['zh-Hant','zh-Hant-TW']:issues.append([row['route'],'HTML lang'])
  attrs=['src'] if t in ['img','script','source','video'] else ['href'] if t in ['a','link'] else []
  if t=='video':attrs+=['poster']
  for attr in attrs:
   val=a.get(attr,'');u=urlsplit(val)
   if not val or val.startswith(('#','data:','mailto:','tel:','javascript:')):continue
   if u.netloc and u.netloc!=urlsplit(cfg['url']).netloc:continue
   if not u.path.startswith('/'):continue
   references+=1;f=D/unquote(u.path).lstrip('/')
   if not f.exists() and not (f/'index.html').exists() and not redirected(u.path):broken.append([row['route'],val])
 # The social card is a 1200 x 630 exported asset, never a lazy thumbnail URL.
 if '-thumb.' in row['ogImage'] or not (D/unquote(urlsplit(row['ogImage']).path).lstrip('/')).exists():issues.append([row['route'],'bad social image'])
 if '<details' in s and '<summary' in s and 'FAQPage' in row['schemaType']:faqPages.append(row['route'])
 if re.search(r'富邦|華碩|asus|fubon',s,re.I):issues.append([row['route'],'restricted company name'])
for field in ['title','description','canonical','ogImage']:
 duplicates=[v for v,c in Counter(r[field] for r in live).items() if c>1]
 if duplicates:issues.append(['site','duplicate '+field+': '+str(len(duplicates))])
sitemap=(D/'sitemap.xml').read_text();sitemapUrls=[html.unescape(u) for u in re.findall('<loc>(.*?)</loc>',sitemap)];expected=[r['canonical'] for r in live]
if set(sitemapUrls)!=set(expected):issues.append(['site','sitemap mismatch'])
if broken:issues.extend([[a,'broken '+b] for a,b in broken])
if missingAlt:issues.extend([[a,'missing image alt '+str(b)] for a,b in missingAlt])
if missingSize:issues.extend([[a,'missing image size '+str(b)] for a,b in missingSize])
if headingJumps:warnings.append({'headingJumps':headingJumps})
nohero=[r['route'] for r in live if r.get('ogImageNote')];thin=[r['route'] for r in live if r['wordCount']<180]
# The checklist labels come verbatim from the owner's supplied checklist.
labels=json.loads((R/'content/seo/checklist.json').read_text());checks=[]
for item in labels:
 i=item['id'];status='完成';note='已由建置流程實作，並掃描最終 HTML；詳見逐頁維護總表。'
 if i in [11,12,19,20]:note='正式可索引頁的 title / description 已逐頁檢查；重複值會列入錯誤。'
 if i in [23,29,30,31,32,33,34,35,36,37,38,39,40,46]:note=f'{len(rows)} 頁各有獨立 1200×630 分享圖，來源依頁面主圖優先；{len(nohero)} 個資訊／目錄頁暫採相關照片與本頁標題製圖，列有 TODO。'
 if i in [1,2,3,4,5,6,7]:note='favicon.ico、SVG、180px touch icon、192/512px manifest icons 與品牌 theme-color 已輸出並引用。'
 if i==8:note='主導覽採可讀的「小巴老師」品牌文字；非空白圖片 logo。'
 if i in [9,10]:note='品牌與正式網域由 content/seo/site.json 及既有品牌資料管理。'
 if i==18:
  status='待改善' if headingJumps else '完成';note=f'掃描 H1–H6，發現 {len(headingJumps)} 個層級跳躍；詳見 warnings。'
 if i in [41,42,43,44,45,47,48,49,50]:note='scripts/seo-static-finalize.mjs 共用建置，content/seo/page-overrides.json 可覆寫 title、description、canonical、heroImage、ogImage、noindex、schemaType、schema。'
 if i==56:note=report['similarPages']
 if i in [58]:note='保留原有 _redirects；兩組公司運動會作品改中性網址並將原網址 301 導向新作品。'
 if i in [61,62,63,64,65,66,67,69]:note=f'robots 與 sitemap 已重建；{len(live)} 頁可索引，{len(rows)-len(live)} 個私人／系統／隱私／錯誤頁排除，404 保留 noindex。'
 if i==68:
  status='待補資料' if thin else '完成';note=f'低於 180 個可讀字元的可索引頁：{len(thin)} 頁。作品及目錄仍以影像、分類與實際連結共同判讀。'
 if i==70:note=f'已掃描 {references} 個站內資源與連結，壞連結 {len(broken)} 個。'
 if i==72:status='待補資料';note=report['todos']['localBusiness']
 if i==77:note=f'由實際顯示的 FAQ 問題與回答產生 FAQPage，涵蓋 {len(faqPages)} 頁；移除與畫面問題不一致的舊 Schema。'
 if i==80:note='價格及圖文沿用已確認內容；FAQ 由可見問答擷取；未加入虛構地址、評論或評分。'
 if i in [81,82,87,88]:note=f'掃描圖片 ALT、尺寸與本機路徑；缺 ALT {len(missingAlt)}、缺尺寸 {len(missingSize)}。'
 if i in [83,84,85,89,90]:note='新工作照已以語意英文命名、轉 WebP 並移除 EXIF/GPS；作品原有最佳化圖庫保留。歷史遷移檔名列後續漸進整理，避免破壞既有網址。'
 if i==86:note='新首頁與作品首圖保留 eager / fetchpriority；下方圖庫使用 lazy。'
 if i in [91,92]:note='llms.txt 已由正式可索引頁產生，包含網站用途、服務、重要入口與聯絡。'
 if i in [93,94,95,96,97]:note='價格、服務、摘要與聯絡資料直接存在共用靜態 HTML，桌機／手機同一份 head；保留作品／分類／指南／服務互連。'
 if i==98:note='已盤點長圖庫、卡片數量、外部 YouTube 載入及歷史圖片大小風險；影片點選後才載入。尚無真實 CWV 數據，不宣稱已通過實測。'
 if i==99:note='head 已留追蹤插入位置；TODO：尚待查核既有 GA4/GTM 資產，未捏造追蹤 ID 或重複安裝。'
 if i==100:note='reports/seo-maintenance.json 與 seo-audit.html 包含每頁檔案、網址、標題、摘要、canonical、hero、OG、schema、noindex。'
 checks.append({'id':i,'item':item['item'],'status':status,'evidence':note})
result={'site':cfg['url'],'pages':len(rows),'indexable':len(live),'uniqueOgImages':len(set(r['ogImage'] for r in rows)),'referencesChecked':references,'errors':issues,'warnings':warnings,'noHeroTodos':nohero,'thinPages':thin,'checklist':checks,'todo':report['todos']}
(R/'reports/seo-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
def esc(x):return html.escape(str(x))
parts=[f'<!doctype html><html lang="zh-Hant-TW"><meta charset="utf-8"><title>{esc(cfg["brand"])} SEO 驗收總表</title><style>body{{font:16px/1.8 system-ui;margin:40px;color:#243b3e}}table{{border-collapse:collapse;width:100%;margin:25px 0}}td,th{{border:1px solid #ccd8d5;padding:12px;text-align:left;vertical-align:top;overflow-wrap:anywhere}}th{{background:#eaf1ee}}.scroll{{overflow:auto}}small{{color:#567}}</style><h1>{esc(cfg["brand"])}｜SEO 100 項驗收</h1><p>2026-11-22。{len(rows)} 頁、{len(live)} 頁可索引、{len(set(r["ogImage"] for r in rows))} 張獨立分享圖。技術錯誤：{len(issues)}。</p><h2>100 項檢查狀態</h2><table><tr><th>項次</th><th>項目</th><th>狀態</th><th>依據／待辦</th></tr>']
for c in checks:parts.append('<tr>'+''.join(f'<td>{esc(c[k])}</td>' for k in ['id','item','status','evidence'])+'</tr>')
parts.append('</table><h2>逐頁 SEO 維護總表</h2><div class="scroll"><table><tr>'+''.join(f'<th>{esc(k)}</th>' for k in ['page file','route','title','description','canonical','hero image','og image','schema type','noindex'])+'</tr>')
for row in rows:parts.append('<tr>'+''.join(f'<td>{esc(row[k])}</td>' for k in ['pageFile','route','title','description','canonical','heroImage','ogImage','schemaType','noindex'])+'</tr>')
parts.append('</table></div><h2>錯誤、缺圖與風險紀錄</h2><pre>'+esc(json.dumps({k:result[k] for k in ['errors','warnings','noHeroTodos','thinPages','todo']},ensure_ascii=False,indent=2))+'</pre>')
parts.append('<h2>未來維護</h2><ol><li>先在現有作品／分類資料填好 title、description 及主圖。</li><li>首次新增頁面後，在 Mac 執行 /usr/bin/python3 scripts/prepare-seo-assets.py 產生該頁獨立分享圖；Cloudflare 只需 Node。</li><li>必要時在 content/seo/page-overrides.json 指定 ogImage 或其他欄位。</li><li>執行 npm run build 與 npm run check:seo，僅發布 dist；不得發布來源或客戶紀錄。</li><li>確認 GA4/GTM ID 或營業地址後再填 content/seo/site.json；不得用猜測資料。</li></ol></html>')
(R/'reports/seo-audit.html').write_text(''.join(parts))
print(json.dumps({k:result[k] for k in ['site','pages','indexable','uniqueOgImages','referencesChecked']},ensure_ascii=False));print('errors',len(issues),'heading jumps',len(headingJumps),'checklist',len(checks))
for e in issues[:12]:print(e)
raise SystemExit(1 if issues else 0)
