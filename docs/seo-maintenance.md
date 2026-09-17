# 靜態網站 SEO／OG／AI 維護說明

這個網站的 SEO 由三層共同維護：

1. 內容來源：`content/`、`data/`、`site.config.json`。
2. 共用輸出：`scripts/render.mjs` 與各建置器。
3. 最終整理與驗收：`scripts/finalize-seo.mjs`、`scripts/audit-seo.mjs`。

## 新增頁面時必填

- 唯一且可讀的 `title`，建議 25–60 個中文字元以內。
- 描述頁面實際內容的 `description`，不要複製其他頁。
- 正式 HTTPS `canonical`；目錄型路由以 `/` 結尾，保留中的舊 `.html` 路由維持原網址。
- 與頁面內容一致的 hero 圖或 `ogImage`。
- 唯一 H1；Markdown 文章內不要再重複頁面外殼的 H1。
- 適合的 Schema 類型：文章用 `BlogPosting`、服務用 `Service`、作品用 `ImageGallery`／`CreativeWork`、列表用 `CollectionPage`。
- 草稿、客戶頁、後台與重導舊頁必須 `noindex`，不可進 sitemap。

若頁面需要手動指定分享圖、Schema 或 noindex，編輯 `data/seo-overrides.json`。最終 meta 一定由建置程序直接寫進 HTML `<head>`，不依賴瀏覽器 JavaScript。

## 建置與驗收

```bash
npm run build
npm run audit:seo
```

建置會依序：產生頁面 → 統一 head → 選擇不重複分享圖 → 重建 sitemap → 產生逐頁 SEO 表 → 執行阻擋式檢查。

稽核輸出：

- `data/seo-audit-report.json`：機器可讀的總數、問題與逐頁資料。
- `docs/seo-page-map.md`：人可以直接查閱的每頁 SEO 總表。
- `docs/seo-100-checklist.md`：100 項完成狀態與待辦。

## 圖片與社群分享

- 分享圖優先順序：`seo-overrides` → 頁面 hero → 頁面主要圖片 → 同主題影像池。
- 全部 `og:image` 與 `twitter:image` 使用正式網域絕對網址。
- 建置器會避免不同頁面共用同一個社群圖片網址。
- 新增照片時仍需使用語意化英文檔名、移除 EXIF／GPS、建立 WebP，並補 `alt`、`title`、正確尺寸及載入方式。
- LINE、Facebook、Threads 可能保留舊快取；正式換圖後需使用平台分享偵錯工具重新抓取，或等待快取更新。

## Core Web Vitals 風險

- 舊站匯入圖仍有 JPG／PNG 與 UUID 檔名，部分尺寸較大；保留網址是為避免既有頁面破圖，後續應按流量由高到低轉成 WebP／AVIF。
- hero 使用 CSS 背景圖，瀏覽器無法直接套用 `<img fetchpriority="high">`；高流量頁未來可改成 `<picture>`。
- Google Fonts 是外部請求；已有 preconnect，但仍可能影響首次文字顯示。若效能需求提高，可改成本機託管字型。
- 舊遷移頁照片數量多，需持續限制首屏圖片並延後載入畫面下方內容。

## Analytics 插入點

`scripts/render.mjs` 的 `<head>` 已保留 GA4／GTM／Meta Pixel 註解位置。目前沒有加入追蹤碼，避免未經確認就新增 Cookie 或第三方資料傳送。
