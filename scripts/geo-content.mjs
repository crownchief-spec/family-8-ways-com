// Visible, source-grounded content only. No hidden instructions or invented customer stories.
const E=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function faqBlock(rows=[],title='預約前常見問題'){
 return rows.length?`<section class="geo-faq section"><h2>${E(title)}</h2><div class="faq">${rows.map(x=>`<details><summary>${E(x.q)}</summary><p>${E(x.a)}</p></details>`).join('')}</div></section>`:'';
}
export function serviceClarity(s){
 if(!s)return '';
 return `<section class="geo-service section" aria-label="服務內容與預約準備"><h2>${E(s.heading||'這項拍攝服務適合誰？')}</h2><p class="geo-answer">${E(s.answer)}</p><dl class="geo-facts">${[['適合需求',s.audience],['拍攝重點',s.focus],['預約前提供',s.prepare],['交付前確認',s.delivery]].map(([k,v])=>`<div><dt>${E(k)}</dt><dd>${E(v)}</dd></div>`).join('')}</dl></section>${faqBlock(s.faq)}`;
}
export function portfolioFacts(w,serviceName,serviceUrl){
 const count=w.photos?.length||0,videoCount=(w.clips||w.videos||[]).length;
 const rows=[['攝影服務',serviceName],['拍攝地點',w.location],['作品主題',w.caseFocus||w.description],['本頁展示',`${count} 張作品照片${videoCount?`、${videoCount} 支作品影片`:''}`],['攝影師','小巴老師 Benson Chen｜八威創意有限公司']];
 if(w.shootDate)rows.splice(2,0,['拍攝日期',w.shootDate]);
 if(w.cooperationNote)rows.push(['合作紀錄',w.cooperationNote]);
 return `<section class="geo-case"><h2>這組作品的拍攝資訊</h2><dl class="geo-facts">${rows.filter(x=>x[1]).map(([k,v])=>`<div><dt>${E(k)}</dt><dd>${E(v)}</dd></div>`).join('')}</dl><p class="geo-case-link"><a href="${E(serviceUrl)}">了解${E(serviceName)}的服務與預約 →</a></p></section>`;
}
export function homeClarity(s){return s?`<section class="geo-home"><h2>${E(s.heading)}</h2><p>${E(s.answer)}</p></section>`:''}
export const geoCss=`.geo-home{max-width:900px;margin:30px 0 38px;padding:0 0 8px}.geo-home h2{font-size:1.45rem;line-height:1.55}.geo-home p,.geo-answer{font-size:1.06rem;line-height:1.95}.geo-service{max-width:1000px}.geo-facts{margin:24px 0;display:grid;grid-template-columns:1fr 1fr;gap:0 28px}.geo-facts>div{padding:17px 0;border-bottom:1px solid #d5e0dc;min-width:0}.geo-facts dt{font-size:.86rem;font-weight:700;color:var(--accent,#285b70);margin-bottom:7px}.geo-facts dd{margin:0;font-size:.97rem;line-height:1.85;overflow-wrap:anywhere}.geo-case{max-width:1000px;margin:28px auto 38px;padding:26px 30px;border:1px solid #d3dfd9;border-radius:14px;background:#f5f8f6}.geo-case h2{font-size:1.3rem;margin:0 0 15px}.geo-case .geo-facts{margin:0}.geo-case-link{font-size:.94rem;margin:20px 0 0}.geo-faq{max-width:1000px}.geo-faq summary{line-height:1.65;font-weight:700}.geo-faq p{max-width:85ch;line-height:1.9}.geo-guide-answer{padding:20px 23px;background:#f1f6f4;border-left:4px solid var(--accent,#285b70);line-height:1.95;margin:12px 0 28px}@media(max-width:700px){.geo-facts{grid-template-columns:1fr}.geo-case{padding:22px 20px}.geo-home{margin:22px 0 30px}.geo-service h2,.geo-faq h2{font-size:1.5rem;line-height:1.5}}`;
