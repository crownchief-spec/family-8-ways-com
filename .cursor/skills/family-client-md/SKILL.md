# Family Client MD Generator

這個 Skill 用於把親子寫真客戶 LINE 對話、詢問紀錄、報價討論，轉換成網站可讀取的客戶案件 Markdown。

## 使用時機

當使用者貼上：
- LINE 對話
- 客戶詢問
- 親子寫真報價需求
- 海外旅拍需求
- 台灣包車旅拍需求
- 生日派對拍攝需求
- 家庭活動紀錄需求
- 客戶合約資料
- 拍攝後交件資料

請啟用本 Skill。

## 必讀檔案

- docs/family-service-knowledge.md
- content/clients/_template.md（正式客戶專區 frontmatter；舊檔 `src/content/clients/_client-template.md` 僅內部備份）

## 工作流程

1. 讀取客戶對話。
2. 萃取客戶資料。
3. 判斷拍攝類型。
4. 對照服務知識庫。
5. 推薦方案與報價。
6. 列出已確認事項。
7. 列出待確認事項。
8. 產生客戶案件 Markdown。
9. 檢查 frontmatter 是否完整。
10. 若缺資料，填空字串，不要亂編。
11. 產生一段可直接回覆客戶的 LINE 文字。

## 輸出格式

請輸出：
1. 建議檔名
2. 完整 Markdown 內容
3. 給客戶的回覆草稿
4. 後續待辦清單
