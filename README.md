# family-8-ways-com

小巴老師親子寫真品牌官網（Astro 靜態站 + Markdown 內容）。

## 開發

```bash
npm install
npm run dev
```

## 正式建置

```bash
npm run build
npm run preview
```

## 內容目錄

新作品、地區、客戶專屬頁、FAQ、爸媽推薦請於 `content/` 底下以 Markdown 新增；前台會自動產生路由。

- 作品：`content/portfolio/`
- 地區：`content/locations/`
- 客戶專屬：`content/clients/`（可設 `password_protected` + `password`，靜態頁僅為輕量隱私，正式環境請再評估資安需求）
- FAQ：`content/faq/`
- 推薦：`content/reviews/`

## 環境變數與表單

聯絡表單已預留 Netlify Forms 欄位 `data-netlify`。若部署至其他平台，請改為自有 API 或第三方表單。

站內 LINE、電話請改 `src/site.config.ts`。