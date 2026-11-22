#!/usr/bin/env python3
"""Prepare per-page social cards from existing public page photos. Originals stay unchanged.
Run locally after npm run build; requires Pillow. Cloudflare builds use only the Node finalizer.
"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
from PIL import Image,ImageOps,ImageDraw,ImageFont
import json,re,hashlib,sys
R=Path(__file__).resolve().parents[1];D=R/'dist';cfg=json.loads((R/'content/seo/site.json').read_text());OUT=R/'content/seo-assets';OUT.mkdir(parents=True,exist_ok=True);(OUT/'og').mkdir(exist_ok=True)
FONT='/System/Library/Fonts/STHeiti Medium.ttc'
class Page(HTMLParser):
 def __init__(self):super().__init__();self.tags=[];self.inTitle=False;self.title=''
 def handle_starttag(self,t,a):
  self.tags.append((t,dict(a)))
  if t=='title':self.inTitle=True
 def handle_endtag(self,t):
  if t=='title':self.inTitle=False
 def handle_data(self,s):
  if self.inTitle:self.title+=s

def font(n):return ImageFont.truetype(FONT,n)
def local(src):
 u=urlsplit(src)
 if u.netloc and u.netloc!=urlsplit(cfg['url']).netloc:return None
 p=D/unquote(u.path).lstrip('/')
 if '-thumb.' in p.name and p.with_name(p.name.replace('-thumb.','.')).exists():p=p.with_name(p.name.replace('-thumb.','.'))
 return p if p.is_file() and p.suffix.lower() in ['.jpg','.jpeg','.png','.webp'] else None
records={};todos=[]
for p in sorted(D.rglob('*.html')):
 rel=p.relative_to(D).as_posix();route='/' if rel=='index.html' else '/'+rel[:-10] if rel.endswith('/index.html') else '/'+rel
 s=p.read_text();h=Page();h.feed(s);private=bool(re.search(r'(?:^|/)(?:clients?|admin|family-contract|projects/clients)(?:/|$)',route));title='專屬攝影服務頁' if private else h.title.split('｜小巴老師')[0]
 body=s[s.find('<main'):s.find('</main>')+7] if '<main' in s else s
 candidates=re.findall(r'background-image\s*:\s*url\([\'"]?([^\'"\)]+)',body)
 candidates += [a.get('src','') for t,a in h.tags if t=='img']
 current=next((a.get('content','') for t,a in h.tags if t=='meta' and a.get('property')=='og:image'),'')
 primary=next((local(x) for x in candidates if local(x)),None)
 selected=None if private else primary or local(current)
 key=hashlib.sha256(route.encode()).hexdigest()[:10];slug=re.sub('[^a-z0-9-]+','-',route.lower()).strip('-') or 'home';name=f'{slug[:95]}-{key}.jpg';canvas=Image.new('RGB',(1200,630),cfg['color']);draw=ImageDraw.Draw(canvas)
 if selected:
  pic=ImageOps.exif_transpose(Image.open(selected)).convert('RGB');pic.thumbnail((630,630),Image.Resampling.LANCZOS);canvas.paste(pic,(570+(630-pic.width)//2,(630-pic.height)//2))
 else:draw.rounded_rectangle((675,185,1080,445),radius=35,outline='#c8dad5',width=7);draw.ellipse((800,220,965,385),outline='#c8dad5',width=8)
 draw.rectangle((0,0,570,630),fill=cfg['color']);draw.text((48,46),'BENSON CHEN',font=font(23),fill='#d5e4df');draw.text((48,91),cfg['brand'],font=font(28),fill='white')
 lines=[];line=''
 for c in title:
  if draw.textbbox((0,0),line+c,font=font(38))[2]>470:lines.append(line);line=c
  else:line+=c
 if line:lines.append(line)
 for j,l in enumerate(lines[:6]):draw.text((48,205+j*52),l,font=font(38),fill='white')
 draw.text((48,560),urlsplit(cfg['url']).netloc,font=font(22),fill='#d5e4df');canvas.save(OUT/'og'/name,'JPEG',quality=86,optimize=True)
 hero='/'+selected.relative_to(D).as_posix() if selected else None
 records[route]={'ogImage':'/assets/seo/og/'+name,'heroImage':hero,'width':1200,'height':630,'imageSource':'page-photo' if primary and not private else 'related-page-image' if selected else 'brand-graphic','imageNote':None if primary and not private else 'TODO：資訊或系統頁未設專用首圖；目前使用該頁主題文字與相關影像製作獨立分享圖。'}
 if not primary and not private:todos.append(route)
# A camera icon in each website's brand color; no fabricated photo or new logo claim.
im=Image.new('RGB',(512,512),cfg['color']);dr=ImageDraw.Draw(im);dr.rounded_rectangle((75,160,437,390),radius=38,outline='white',width=18);dr.rounded_rectangle((160,112,287,182),radius=15,fill='white');dr.ellipse((182,200,330,348),outline='white',width=18);im.save(OUT/'favicon.ico',sizes=[(16,16),(32,32),(48,48)]);im.resize((180,180)).save(OUT/'apple-touch-icon.png');im.resize((192,192)).save(OUT/'icon-192.png');im.save(OUT/'icon-512.png')
(OUT/'favicon.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="90" fill="{cfg["color"]}"/><rect x="75" y="160" width="362" height="230" rx="38" fill="none" stroke="white" stroke-width="18"/><rect x="160" y="112" width="127" height="70" rx="15" fill="white"/><circle cx="256" cy="274" r="74" fill="none" stroke="white" stroke-width="18"/></svg>')
(R/'content/seo/page-overrides.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'pages':len(records),'ownSocialCards':len(records),'noHeroTodo':len(todos),'bytes':sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())}))
