# 客戶／專案圖片（與 grad-8-ways-com 對齊）

此目錄放**依專案 slug 分資料夾**的圖片，規則與 `grad-8-ways-com/public/images/projects/` 相同。

## 資料夾結構

```
public/images/projects/
├── README.md
├── sunshine-kindergarten/   ← 該專案所有照片
└── {project-slug}/          ← 其他專案依 slug 建立資料夾
```

## 與本站 Markdown 的對應

親子站客戶專屬頁的 slug 來自 `content/clients/*.md` 的檔名（不含 `.md`），例如：

- `content/clients/sunshine-kindergarten.md` → `public/images/projects/sunshine-kindergarten/`

在 Markdown 或 Astro 裡引用時使用**網站根路徑**（建置後會對應 `public/`）：

```
/images/projects/sunshine-kindergarten/group-photo.jpg
```

## 與 grad 站的差異（只需記一點）

- 畢業站若寫 `public/images/projects/`，與這裡**路徑規則相同**。
- 本站的「全域主視覺」習慣放在 `public/images/heroes/`（檔名 SEO 英文），對應畢業站根目錄的 `assets/images/hero/` 概念。
