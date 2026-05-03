# 親子寫真舊站轉移稽核

來源站：`https://www.8-ways.com`  
目標站：`https://family.8-ways.com`

> 註：本表整合舊站 URL 掃描、既有遷移映射與目前新站內容。欄位中的「有／部分」代表已觀察到對應資訊，最終規則以 `docs/family-service-knowledge.md` 為準。

| 舊站 URL | 新站對應 URL | 舊站價格 | 舊站拍攝時間 | 舊站成品內容 | 舊站影片規則 | 舊站包車/車馬費/機票住宿 | 舊站雨天/延期/人數限制 | 新站已轉移 | 新站缺漏內容 | 需新增或修正檔案 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/family` | `/`、`/pages/service-flow/` | 有 | 有 | 有 | 有 | 有 | 有 | 部分 | 首頁可再加方案對照表 | `pages/service-flow/index.html` |
| `/camping-family`(404) / `camping` | `/services/camping-family-photography/`、`/taiwan/camping/` | 有 | 有 | 有 | 有 | 有 | 有 | 有 | 補 FAQ 更完整 | `data/service-pages.json` |
| `/birthday`(404) / `party` | `/services/family-event-photography/`、`/taiwan/birthday/` | 有 | 有 | 有 | 部分 | 部分 | 部分 | 有 | 補跨縣市車馬費規則 | `data/service-pages.json` |
| `/shifen` | `/taiwan/railway/` | 有 | 有 | 有 | 部分 | 部分 | 部分 | 部分 | 野柳/十分完整方案結構化 | `src/data/family-galleries/taiwan-railway.ts` |
| `/taipei` | `/taiwan/taipei/` | 有 | 有 | 有 | 有 | 部分 | 部分 | 有 | 補「加人入鏡 800」明文 | `src/data/family-galleries/taiwan-taipei.ts` |
| `/base` | `/taiwan/studio/` | 部分 | 部分 | 部分 | 部分 | 無 | 無 | 部分 | 室內基地方案規則不夠完整 | `src/data/family-galleries/taiwan-studio.ts` |
| `/tamsui` | `/taiwan/tamsui/` | 有 | 有 | 有 | 部分 | 部分 | 部分 | 有 | 補半天/全天差異 | `src/data/family-galleries/taiwan-tamsui.ts` |
| `/yilan` | `/taiwan/yilan/` | 有 | 有 | 有 | 有 | 有 | 有 | 有 | 補人數分攤說明 | `src/data/family-galleries/taiwan-yilan.ts` |
| `/animal` | `/taiwan/farm/` | 有 | 有 | 有 | 有 | 有 | 有 | 有 | 門票/停車費可更醒目 | `src/data/family-galleries/taiwan-farm.ts` |
| `/taoyuan` | `/taiwan/taoyuan/` | 有 | 有 | 有 | 有 | 部分 | 部分 | 有 | 補「不包車」明文 | `src/data/family-galleries/taiwan-taoyuan.ts` |
| `/taichung` | `/taiwan/taichung/` | 有 | 有 | 有 | 有 | 有 | 有 | 有 | 可增加常見路線案例 | `src/data/family-galleries/taiwan-taichung.ts` |
| `/penghu` | `/taiwan/penghu/` | 有 | 有 | 有 | 有 | 有 | 有 | 有 | 補改票費提醒強化 | `src/data/family-galleries/taiwan-penghu.ts` |
| `/hualien` | `/taiwan/hualien/` | 部分 | 部分 | 部分 | 部分 | 部分 | 部分 | 部分 | 價格級距可更明確 | `src/data/family-galleries/taiwan-hualien.ts` |
| `/kaohsiung` | `/taiwan/south/` | 有 | 有 | 有 | 有 | 有 | 部分 | 部分 | URL 對應需補 `/taiwan/kaohsiung/` 策略 | `data/family-migration-map.json` |
| `/maternity`(404) / `pregnant` | `/themes/maternity/`、`/services/maternity-baby-family-photography/` | 部分 | 部分 | 部分 | 部分 | 無 | 部分 | 部分 | 價格與建議方案需更明確 | `data/service-pages.json` |
| `/family-graduation` | `/taiwan/graduation/` | 部分 | 部分 | 部分 | 部分 | 部分 | 部分 | 部分 | 補完整畢業活動規則 | `src/data/family-galleries/taiwan-graduation.ts` |
| `/snow` | `/overseas/japan-winter/` | 有 | 有 | 有 | 有 | 有 | 部分 | 有 | 第二天 6800 已調整，仍需頁面明文 | `data/service-pages.json` |
| `/hokkaido` | `/overseas/hokkaido/` | 有 | 有 | 有 | 有 | 有 | 部分 | 有 | 可補季節拍攝注意事項 | `src/data/family-galleries/overseas-hokkaido.ts` |
| `/okinawa` | `/overseas/okinawa/` | 有 | 有 | 有 | 有 | 有 | 部分 | 有 | 補常見行程安排 | `src/data/family-galleries/overseas-okinawa.ts` |
| `/tokyo` | `/overseas/tokyo/` | 有 | 有 | 有 | 有 | 有 | 部分 | 有 | 補城市移動規則 | `src/data/family-galleries/overseas-tokyo.ts` |
| `/disney` | `/overseas/disney/` | 有 | 有 | 有 | 有 | 有 | 部分 | 有 | 補入園拍攝限制提醒 | `src/data/family-galleries/overseas-disney.ts` |
| `/kyoto` | `/overseas/kansai/` | 有 | 有 | 有 | 有 | 有 | 部分 | 部分 | `/overseas/kyoto/` 對應策略 | `data/family-migration-map.json` |
| `/cebu`(404) / `/bali` | `/overseas/cebu-bali/` | 有 | 有 | 有 | 有 | 有 | 部分 | 有 | 補雙地區差異敘述 | `src/data/family-galleries/overseas-cebu-bali.ts` |
| `/singapore` | `/overseas/singapore/` | 有 | 有 | 有 | 有 | 有 | 部分 | 有 | 補熱帶氣候備案 | `src/data/family-galleries/overseas-singapore.ts` |
| `/korea` | `/overseas/korea/` | 有 | 有 | 有 | 有 | 有 | 部分 | 有 | 補韓服主題連結 | `src/data/family-galleries/overseas-korea.ts` |
| `/sydney` | `/overseas/australia/` | 有 | 有 | 有 | 有 | 有 | 部分 | 有 | 補城市範例與交通備註 | `src/data/family-galleries/overseas-australia.ts` |
| `/group-photo`(404) | `/themes/group/` | 部分 | 部分 | 部分 | 部分 | 無 | 有 | 部分 | 增補多人分組拍攝方法 | `src/data/family-galleries/themes-group.ts` |
| `/grass` | `/themes/grass/` | 無 | 無 | 部分 | 無 | 無 | 部分 | 有 | 補「適合對象」小段 | `src/data/family-galleries/themes-grass.ts` |
| `/sunset` | `/themes/sunset/` | 無 | 部分 | 部分 | 無 | 無 | 部分 | 有 | 補黃昏時段建議 | `src/data/family-galleries/themes-sunset.ts` |
| `/kimono` | `/themes/costume/` | 無 | 部分 | 部分 | 無 | 無 | 部分 | 有 | 補服裝租借注意事項 | `src/data/family-galleries/themes-costume.ts` |
| `/nightshot` | `/themes/night/` | 無 | 部分 | 部分 | 有 | 無 | 部分 | 有 | 補夜拍安全提醒 | `src/data/family-galleries/themes-night.ts` |
| `/indoor`(404) | `/themes/indoor/` | 無 | 部分 | 部分 | 無 | 無 | 部分 | 部分 | 強化室內場景規劃內容 | `src/data/family-galleries/themes-indoor.ts` |
| `/sakura` | `/themes/sakura/` | 無 | 部分 | 部分 | 無 | 無 | 部分 | 有 | 補花季檔期提醒 | `src/data/family-galleries/themes-sakura.ts` |
| `/autumn`(404) | `/themes/autumn/` | 無 | 部分 | 部分 | 無 | 無 | 部分 | 部分 | 秋季主題需增文字密度 | `src/data/family-galleries/themes-autumn.ts` |
| `/beach` | `/themes/beach/` | 無 | 部分 | 部分 | 部分 | 無 | 部分 | 有 | 補玩水安全提醒 | `src/data/family-galleries/themes-beach.ts` |
| `/diving` | `/themes/underwater/` | 無 | 部分 | 部分 | 部分 | 無 | 部分 | 部分 | 水中題材限制說明不足 | `src/data/family-galleries/themes-underwater.ts` |
| `/rain` | `/themes/rain/` | 無 | 部分 | 部分 | 無 | 無 | 有 | 有 | 補延期/改期流程卡 | `src/data/family-galleries/themes-rain.ts` |
| `/grandparents`(404) | `/themes/generation/` | 無 | 部分 | 部分 | 無 | 無 | 有 | 部分 | 補長輩節奏規劃建議 | `src/data/family-galleries/themes-generation.ts` |
| `/baby` | `/themes/baby/` | 部分 | 部分 | 部分 | 部分 | 無 | 部分 | 有 | 補年齡分段拍攝建議 | `src/data/family-galleries/themes-baby.ts` |
| `/familydress` | `/themes/familydress/` | 無 | 無 | 無 | 無 | 無 | 無 | 部分 | 服裝建議頁需再補完整文字 | `src/data/family-galleries/themes-familydress.ts` |

## 稽核總結
- 舊站核心價格規則已大致進入新站，但「地區頁／主題頁」仍有部分頁面文字密度不足。
- 舊站導覽殘留字串已在產生器加入過濾規則，仍需持續檢查新的抓取批次。
- 客戶案件系統已轉為 Markdown 流程，後續所有報價與合約生成需以 `docs/family-service-knowledge.md` 為單一準則。
