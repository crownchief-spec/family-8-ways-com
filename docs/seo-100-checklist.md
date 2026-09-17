# 網站上線後優化設定 100 項驗收表

狀態：✅ 完成；🟡 部分完成／持續優化；— 不適用但已確認。

| # | 檢查項目 | 狀態 | 實作或證據 |
|---:|---|:---:|---|
| 1 | favicon.ico | ✅ | 由現有品牌 SVG 產生並於全站引用。 |
| 2 | SVG favicon | ✅ | `/favicon.svg`。 |
| 3 | favicon link tags | ✅ | `renderPage()` 與最終整理器統一輸出。 |
| 4 | apple-touch-icon | ✅ | `/apple-touch-icon.png`，180×180。 |
| 5 | manifest 檔 | ✅ | `/site.webmanifest`。 |
| 6 | manifest 引用 | ✅ | 全部最終 HTML 直接引用。 |
| 7 | theme-color | ✅ | 品牌綠 `#3d5c4a`。 |
| 8 | logo alt | — | 導覽品牌為文字連結，不是缺 alt 的圖片。 |
| 9 | 品牌名稱一致 | ✅ | 集中使用「小巴老師｜親子寫真」。 |
| 10 | 品牌名稱集中管理 | ✅ | `site.config.json`。 |
| 11 | 每頁獨立 title | ✅ | 稽核阻擋缺漏與可索引頁重複。 |
| 12 | 每頁獨立 description | ✅ | 最終整理器修正重複描述。 |
| 13 | 每頁獨立 canonical | ✅ | 全頁輸出正式 canonical。 |
| 14 | 每頁 og:url | ✅ | 與 canonical 相同。 |
| 15 | 每頁 og:type | ✅ | 文章為 article，其餘依頁型輸出。 |
| 16 | HTML lang | ✅ | `zh-Hant`。 |
| 17 | 每頁 H1 | ✅ | 稽核要求每頁恰好一個 H1。 |
| 18 | H2／H3 結構 | ✅ | 使用共用頁面外殼與內容層級；文章重複 H1 已移除。 |
| 19 | title 重複問題 | ✅ | 可索引頁重複即建置失敗。 |
| 20 | description 重複問題 | ✅ | 可索引頁重複即建置失敗。 |
| 21 | 每頁 og:title | ✅ | 直接存在最終 head。 |
| 22 | 每頁 og:description | ✅ | 直接存在最終 head。 |
| 23 | 每頁 og:image | ✅ | 每頁使用不重複的公開圖片網址。 |
| 24 | 每頁 og:url | ✅ | 直接存在最終 head。 |
| 25 | twitter:card | ✅ | `summary_large_image`。 |
| 26 | 每頁 twitter:title | ✅ | 與頁面 title 同步。 |
| 27 | 每頁 twitter:description | ✅ | 與頁面描述同步。 |
| 28 | 每頁 twitter:image | ✅ | 與該頁 og:image 同步。 |
| 29 | 寫死共用 og:image | ✅ | 最終整理器移除預設共用圖。 |
| 30 | 不同頁面不再同圖 | ✅ | 稽核檢查全部最終頁面圖片網址唯一。 |
| 31 | hero 優先做 og:image | ✅ | 選圖規則優先讀取 hero。 |
| 32 | 支援專用 og:image | ✅ | `data/seo-overrides.json`。 |
| 33 | 選圖邏輯 | ✅ | override → hero → 主要圖片 → 同主題圖池。 |
| 34 | og:image 絕對網址 | ✅ | 統一轉成正式網域 HTTPS。 |
| 35 | og:image 可公開讀取 | ✅ | 只選 Git 追蹤的公開媒體。 |
| 36 | 圖片 404 | ✅ | 本機引用完整性為發布阻擋條件。 |
| 37 | 不抓 lazy-load 小圖 | ✅ | hero 優先，頁內圖僅作備援。 |
| 38 | 多主圖頁規則 | ✅ | 依 DOM 出現順序與去重規則選取。 |
| 39 | 首頁專用 og:image | ✅ | `seo-overrides` 明確指定。 |
| 40 | ogImage 欄位 | ✅ | 各內容 frontmatter 與 `seo-overrides` 均支援。 |
| 41 | 共用 SEO head | ✅ | `scripts/render.mjs`。 |
| 42 | 完整 head 欄位 | ✅ | title、description、canonical、OG、Twitter、robots、Schema。 |
| 43 | per-page SEO 資料來源 | ✅ | Markdown frontmatter、service data、`seo-overrides`。 |
| 44 | 每頁 title 可維護 | ✅ | 來源資料或 override。 |
| 45 | 每頁 description 可維護 | ✅ | 來源資料或 override。 |
| 46 | 每頁 heroImage／ogImage | ✅ | 支援獨立指定與自動備援。 |
| 47 | 每頁 canonical | ✅ | 建置器傳入，最終整理器補漏。 |
| 48 | 每頁 noindex | ✅ | 後台、客戶、舊頁與 404 支援。 |
| 49 | 每頁 schemaType | ✅ | 可由 override 指定，否則依路由推斷。 |
| 50 | 純 HTML 可維護 | ✅ | 最終 HTML 含完整 meta，另有逐頁總表。 |
| 51 | 每頁 canonical | ✅ | 稽核阻擋缺漏。 |
| 52 | 正式網域 | ✅ | `https://family.8-ways.com`。 |
| 53 | www／non-www | ✅ | canonical 統一 non-www。 |
| 54 | http／https | ✅ | canonical、OG、sitemap 全為 HTTPS。 |
| 55 | 尾斜線一致 | ✅ | 目錄路由用尾斜線；保留舊 `.html` 路由副檔名。 |
| 56 | 類似頁 canonical | ✅ | 舊固定頁以 301／noindex 處理。 |
| 57 | 內部連結一致 | ✅ | 建置器使用正式路由，稽核死連結。 |
| 58 | 舊頁 redirect | ✅ | `_redirects` 集中維護。 |
| 59 | sitemap 與 canonical | ✅ | 由最終可索引 canonical 重建。 |
| 60 | query 不作正式頁 | ✅ | sitemap 與 canonical 排除 query。 |
| 61 | robots.txt | ✅ | 已補公開與私有路徑規則。 |
| 62 | robots 加 sitemap | ✅ | 已加入正式 sitemap URL。 |
| 63 | sitemap.xml | ✅ | 每次建置重建。 |
| 64 | 僅收錄正式頁 | ✅ | noindex、404、重導頁排除。 |
| 65 | 排除重複頁 | ✅ | 舊固定頁重導並排除。 |
| 66 | noindex 支援 | ✅ | meta 與 Cloudflare `X-Robots-Tag`。 |
| 67 | 404.html | ✅ | 有導覽、noindex 與品牌樣式。 |
| 68 | 薄內容頁 | 🟡 | 稽核總表標示無 hero／內容較少頁；後續按流量補強，不捏造內容。 |
| 69 | staging／demo | ✅ | 客戶、demo、admin 皆 noindex。 |
| 70 | 死連結掃描 | ✅ | `audit-seo.mjs` 發布阻擋。 |
| 71 | Organization schema | ✅ | 首頁 `@graph`。 |
| 72 | LocalBusiness schema | ✅ | 首頁使用公開聯絡與服務區域，不虛構地址。 |
| 73 | WebSite schema | ✅ | 首頁 `@graph`。 |
| 74 | WebPage schema | ✅ | 一般可索引頁自動補齊。 |
| 75 | Service schema | ✅ | 服務子頁依路由輸出。 |
| 76 | BreadcrumbList | ✅ | 具層級的作品、文章與主要頁已有麵包屑 Schema。 |
| 77 | FAQPage | ✅ | 完整 FAQ 頁保留可見問答對應 Schema。 |
| 78 | Article／BlogPosting | ✅ | 文章頁輸出 Article／BlogPosting。 |
| 79 | ImageObject | ✅ | 作品頁以 ImageGallery／CreativeWork 的 image 關聯呈現。 |
| 80 | Schema 與頁面一致 | ✅ | 僅使用 title、description、圖片與公開聯絡資訊。 |
| 81 | 主要圖片 alt | ✅ | 新系統要求語意 alt；稽核仍持續檢查空值風險。 |
| 82 | hero 圖 alt | 🟡 | CSS 背景無 alt 語意；由可見 H1、摘要及分享圖 alt 補足，未來高流量頁改 `<picture>`。 |
| 83 | 避免 IMG 命名 | 🟡 | 新增媒體已規範；舊 Wix UUID 檔名保留以避免破壞既有 URL。 |
| 84 | 重要圖片 SEO 命名 | ✅ | 新作品流程強制語意英文檔名。 |
| 85 | 圖片尺寸合理 | 🟡 | 新媒體有尺寸預算；舊遷移圖需按流量逐批轉換。 |
| 86 | 首圖不過度 lazy-load | ✅ | hero 為 CSS 背景，不使用 lazy-load。 |
| 87 | width／height | ✅ | 內容卡片與圖庫輸出尺寸屬性。 |
| 88 | 壞圖修正 | ✅ | 內部媒體引用為建置阻擋條件。 |
| 89 | WebP／AVIF | 🟡 | 新媒體優先 WebP；舊 JPG／PNG 持續分批處理。 |
| 90 | 圖片資源整理 | ✅ | hero／作品／社群圖來源與選圖規則集中管理。 |
| 91 | llms.txt | ✅ | 根目錄與 public 均有。 |
| 92 | llms 結構 | ✅ | 品牌、用途、重要頁、服務與聯絡資訊齊全。 |
| 93 | 頁面摘要 | ✅ | 首頁與主要 hub 前段有可見文字摘要。 |
| 94 | 關鍵資訊用 HTML | ✅ | 服務、FAQ、流程與聯絡資訊可讀。 |
| 95 | AI 理解品牌服務 | ✅ | 首頁、footer、llms 與 Schema 使用一致公開資料。 |
| 96 | 內部連結 | ✅ | 服務、作品、文章與推薦互相連結。 |
| 97 | 手機桌機 head | ✅ | 同一份靜態 HTML，不依裝置變更。 |
| 98 | Core Web Vitals 盤點 | ✅ | `docs/seo-maintenance.md` 已列風險與後續順序。 |
| 99 | analytics 預留 | ✅ | 共用 head 有集中註解位置，未擅自新增追蹤。 |
| 100 | 維護總表 | ✅ | `docs/seo-page-map.md` 與 JSON 稽核報告。 |

## 尚待持續處理

- 舊 Wix 匯入圖片仍有 JPG／PNG、UUID 檔名與尺寸偏大的可能；為避免破壞既有網址，本次不批次改名或複製 7,000 多張圖片。
- CSS 背景 hero 沒有原生 `alt`／`fetchpriority`；高流量頁面未來可逐頁改成 `<picture>`，不必為全部舊頁一次增加複雜度。
- LINE、Facebook 分享快取不會因網站發布立即清空，需要平台重新抓取或等待快取更新。
