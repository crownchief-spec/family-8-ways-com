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

## 圖片 SEO 規範（已套用）

- Hero 與常用素材放在 `public/images/heroes/`，檔名使用英文、連字號、可讀關鍵字（例如 `family-portrait-...`、`child-portrait-...`）。
- 前端圖片 `alt`/`title` 已改為 SEO 友善描述，包含作品標題、地點與親子/家庭寫真語意。
- 目前已上傳的 13 張照片已完成 resize（最長邊 1920）與 SEO 命名。

## 新照片上傳流程（之後都用這個）

先把新圖放到 `uploads/`，再執行：

```bash
npm run img:prepare -- ./uploads ./public/images/uploads family-portrait 1920
```

參數說明：
- 第 1 個：來源資料夾（預設 `./uploads`）
- 第 2 個：輸出資料夾（預設 `./public/images/uploads`）
- 第 3 個：關鍵字前綴（預設 `family-portrait`）
- 第 4 個：最長邊 resize（預設 `1920`）