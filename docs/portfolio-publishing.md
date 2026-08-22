# 親子寫真作品分享與客戶推薦系統

## 新增一篇作品

1. 複製 `content/portfolio/_template/` 整個資料夾。
2. 外層資料夾改為 `YYYY-MM-DD 案件類型 地點／客戶／主題`，例如 `2026-08-23 親子寫真 台北大安森林公園`。
3. 在 `article.md` 填寫固定的 `caseId`、英文 `slug`、公開標題、描述、照片與拍攝資訊。
4. 網頁照片放入 `public/images/portfolio/<slug>/`，使用 WebP、英文小寫檔名；原始檔與 RAW 留在網站專案之外。
5. 已取得客戶公開同意時，確認 `privacy: public-approved`，並將 `status` 改成 `published`。
6. 執行 `npm run build`；作品會出現在 `/works/<slug>/` 與作品總覽 `/works/`。

## 新增一則客戶推薦

1. 複製 `content/reviews/_template.md`，用日期與客戶簡稱命名。
2. 填寫短評、拍攝類型、地點與 `relatedWorkSlug`。
3. 確認推薦文字與照片皆可公開，再設 `status: published`、`draft: false`、`privacy: public-approved`。
4. 執行建置；推薦會出現在 `/reviews/`，並自動出現在相對應作品頁。

## 客戶專屬頁轉公開作品

既有 `content/clients/` 資料只有同時設定 `portfolioPublish: true`、`publicPortfolio: true` 與 `privacy: public-approved` 才會產生公開作品頁。沒有三項明確同意，不會公開。

## 網址規則

- Finder 資料夾可使用中文、日期與案件名稱，方便管理。
- 公開網址只使用固定英文 slug，例如 `/works/taipei-family-park-photography/`。
- 已公開後不要更改 slug；若真的需要改網址，必須加 301 轉址。
