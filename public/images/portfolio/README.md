# 作品集圖片（親子站擴充）

若作品不只一張封面，可為每則 `content/portfolio/` 的 `slug` 建資料夾放圖。

```
public/images/portfolio/
├── README.md
└── {slug}/          ← 與 frontmatter 的 slug 一致
```

Markdown 內引用：

```
/images/portfolio/taichung-golden-hour/photo-01.jpg
```

目前範例作品多用 `cover` / `gallery` 外部網址；要改為自管圖檔時，把檔放此並把 frontmatter 改成上述路徑即可。
