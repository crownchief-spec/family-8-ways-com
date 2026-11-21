from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import json,re,sys,collections
R=Path(__file__).resolve().parents[1];cfg=json.loads((R/'content/brand-data/site.json').read_text());D=R/'dist';manifest=json.loads((R/'reports/brand-build.json').read_text());errors=[];titles=[];imgs=set();links=0
redirects={l.split()[0] for l in (D/'_redirects').read_text().splitlines() if l.strip() and not l.startswith('#')} if (D/'_redirects').exists() else set()
class Page(HTMLParser):
 def __init__(self):super().__init__();self.tags=[]
 def handle_starttag(self,t,a):self.tags.append((t,dict(a)))
for row in manifest['pages']:
 p=D/row['path'].strip('/')/'index.html'
 if not p.exists():errors.append('missing page '+row['path']);continue
 s=p.read_text();h=Page();h.feed(s);tags=h.tags
 if len([t for t,a in tags if t=='h1'])!=1:errors.append('H1 '+row['path'])
 title=re.search(r'<title>(.*?)</title>',s).group(1);titles.append(title)
 canonical=[a.get('href') for t,a in tags if t=='link' and a.get('rel')=='canonical']
 if canonical!=[cfg['url']+row['path']]:errors.append('canonical '+row['path'])
 if not any(t=='meta' and a.get('name')=='description' and a.get('content') for t,a in tags):errors.append('description '+row['path'])
 if not any(t=='meta' and a.get('property')=='og:image' for t,a in tags):errors.append('og '+row['path'])
 schemas=re.findall(r'<script type="application/ld\+json">(.*?)</script>',s,re.S)
 if not schemas:errors.append('schema '+row['path'])
 for a in schemas:
  try:json.loads(a)
  except:errors.append('invalid schema '+row['path'])
 for t,a in tags:
  if t=='iframe':errors.append('eager iframe '+row['path'])
  if t=='img':
   if not all(a.get(k) for k in ['alt','title','width','height','loading']):errors.append('image metadata '+row['path'])
   imgs.add(a.get('src',''))
  for k in (['src'] if t in ['img','script'] else ['href'] if t in ['a','link'] else []):
   u=a.get(k,'');u=urlsplit(u).path if u.startswith('/') and not u.startswith('//') else ''
   if not u:continue
   links+=1;f=D/unquote(u).lstrip('/')
   if not f.exists() and not (f/'index.html').exists() and u not in redirects:errors.append('broken '+row['path']+' -> '+u)
 if row['path'].startswith('/works/') and row['path']!='/works/':
  m=re.search(r'<section class="story-tags".*?</section>',s)
  if not m or not 5<=m.group().count('<a ')<=10:errors.append('tags '+row['path'])
for t,n in collections.Counter(titles).items():
 if n>1:errors.append('duplicate title '+t)
for n in ['content','src','scripts','.git','node_modules']:
 if (D/n).exists():errors.append('private source in deploy '+n)
if 'dQw4w9WgXcQ' in ''.join(p.read_text() for p in D.rglob('*.html')):errors.append('demo video present')
webps=list(D.rglob('*.webp'));report={'site':cfg['url'],'pagesChecked':len(manifest['pages']),'stories':manifest['stories'],'photos':manifest['photos'],'videos':manifest['videos'],'linksChecked':links,'uniqueImages':len(imgs),'webpFiles':len(webps),'webpBytes':sum(x.stat().st_size for x in webps),'errors':list(dict.fromkeys(errors))}
(R/'reports/brand-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2));sys.exit(1 if errors else 0)
