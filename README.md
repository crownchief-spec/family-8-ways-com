# family-8-ways.com（純靜態站）

小巴老師親子寫真品牌官網。**不使用 Astro**：以 HTML + `assets/` + `scripts/build.mjs`（Markdown → HTML）維護，透過 Cloudflare Pages 部署建置完成的 `dist/`。原始資料夾不作公開部署。

## 目錄結構（重點）

| 路徑 | 說明 |
|------|------|
| `index.html` | 首頁（由建置產生，勿手改） |
| `pages/*.html` | 固定頁：服務、關於、FAQ、聯絡、香港家庭、預約付款等 |
| `case/` | 作品集列表 + 各案例頁（由 `content/case/*.md` 產生） |
| `locations/` | 地區列表 + 各地區頁（由 `content/locations/*.md` 產生） |
| `projects/clients/` | 客戶專屬頁（由 `content/clients/*.md` 產生，可設密碼） |
| `assets/css/main.css` | 全站樣式 |
| `assets/images/{home,case,locations,reviews,clients,og}/` | 圖片（首頁主視覺在 `home/`） |
| `content/` | **維護內容放這裡**：`case`、`locations`、`clients`、`reviews`、`faq`、`blog` |
| `templates/fixed/` | 固定頁「內文片段」HTML，可用 `{{LINE_URL}}` 等占位符 |
| `site.config.json` | 站名、導覽、聯絡連結 |
| `scripts/build.mjs` | 建置：讀 Markdown、套用模板、寫入 HTML |
| `favicon.svg` | 網站圖示 |
| `robots.txt` / `sitemap.xml` | 建置時覆寫 |

## 建置

```bash
npm install
npm run build
```

建置後會更新根目錄 `index.html`、`case/`、`locations/`、`projects/clients/`、`pages/` 內多數檔案，以及 `sitemap.xml`。

## 本機預覽

```bash
npm run preview
```

## 新增／修改內容

- **作品案例**：在 `content/case/` 新增或編輯 `.md`，frontmatter 需含 `title`、`slug`、`cover`、`excerpt` 等，再執行 `npm run build`。
- **地區頁**：`content/locations/*.md`，檔名即網址（例：`taipei.md` → `locations/taipei.html`）。
- **客戶頁**：`content/clients/*.md`；`output_slug` 可指定輸出檔名（例：`demo-client-1.html`）；`password` + `password_protected: true` 為前端簡易鎖（SHA-256 比對）。
- **固定頁文案**：改 `templates/fixed/` 對應檔案後建置。

## Cloudflare Pages

- **Build command**：`npm run build`
- **Build output directory**：`dist`（最後由 `scripts/package-public.mjs` 收集公開頁面與必要資產）
- **Functions**：使用 `functions/api/send-contract.ts` 接收合約 PDF 並寄送 Email（Resend）。
- **Environment Variables**：
  - `RESEND_API_KEY`
  - `CONTRACT_FROM_EMAIL`
  - `CONTRACT_PHOTOGRAPHER_EMAIL`（可留空，預設 `crownchief@gmail.com`）

若只上傳靜態檔、不跑建置，請在本地先 `npm run build` 再部署 `dist/`，不要上傳專案根目錄。

## 與舊 Astro 版差異

- 已移除 `src/`、`astro.config.mjs`、Astro content collections。
- 網址改為明確檔名（例：`/pages/services.html`），較利於非工程師理解路徑。

## 2026-11-22 親子作品整合

新首頁、分類、影片庫與指南由 `scripts/build-brand.mjs` 產生。

- `content/brand-portfolio/YYYY-MM-DD 中文案件/article.md`：新整理作品，JSON frontmatter與Markdown內文。
- 每案 `photos/`：壓縮WebP和縮圖；原始照片與影片留在原圖庫或來源位置。
- `content/brand-data/site.json`：首頁、分類、指南、精選順序與既有作品入口。
- `content/brand-data/videos.json`：103支公開親子作品影片與逐支封面；點選才播放。
- 既有 `content/portfolio/`、`content/works/`、`content/clients/`、地區頁與客戶功能仍由原建置器處理。
- `npm run build` 先建置舊頁，再疊加新作品，最後檢查SEO並打包 `dist/`。
- `npm run check:brand` 驗證新整合頁面的連結、照片與SEO。

本地根目錄HTML為建置中間產物；預覽及部署請使用 `dist/`。

## LINE 聯絡入口

所有網站加好友、預約及詢價按鈕統一使用官方帳號 `@281uducw`：`https://line.me/R/ti/p/@281uducw`。不得恢復個人 LINE ID 或舊的個人加好友連結。電話連結與 LINE 分享文章功能維持原用途。
