# components/

全站共用區塊由 `scripts/render.mjs` 以程式組出（等同舊站 Header／Footer），**非**獨立 HTML 檔。

若要改導覽或頁尾：

1. 編輯 `site.config.json` 的 `nav` 陣列。
2. 或修改 `scripts/render.mjs` 內 `renderNavbar` / `renderFooter`。

視覺樣式在 `assets/css/main.css`（搜尋 `.site-header`、`.site-footer`）。
