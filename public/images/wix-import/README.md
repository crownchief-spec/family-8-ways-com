# 舊站（Wix）匯入圖片

此目錄由 `scripts/fetch-wix-pages.mjs` 自 `https://www.8-ways.com/{路徑}` 下載，已 `sips -Z 1920` 限縮長邊，檔名為 SEO 英文。

**路徑對照（行銷文件中的 URL 與實際舊站路徑不同）**

| 你文件中的範例 | 實際舊站路徑 |
|----------------|--------------|
| `/family-tamsui` | `/tamsui` |
| `/family-japan-winter` | `/snow` |
| `/family-tokyo` | `/tokyo`、`/disney` |
| `/family-kansai` | `/kyoto` |
| `/family-southeast-asia` | `/bali`、`/singapore` |

重新下載：`npm run wix:fetch`（若已加入 package.json 腳本）。
