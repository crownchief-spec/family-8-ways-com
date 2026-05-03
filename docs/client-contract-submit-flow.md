# 客戶合約送出流程

1. 攝影師用 Cursor 根據 LINE 對話建立客戶 MD。  
2. 網站自動產生客戶專屬頁。  
3. 攝影師檢查內容後，把專屬連結傳給客戶。  
4. 客戶確認預約資訊、查看訂金匯款方式，並填寫目前付款狀態（可尚未匯款）。  
5. 客戶填寫家庭補充資料與 Email。  
6. 客戶完成合約確認與電子簽名，送出後產生 PDF。  
7. 若已設定 Resend／`/api/send-contract`，PDF 會寄到客戶 Email 與攝影師 Email；否則頁面提供下載與 Line 聯絡 fallback。  
8. 客戶完成訂金付款後，將末五碼等資訊傳給攝影師對帳。  
9. 攝影師確認款項後，手動或未來自動更新客戶 MD。  
10. 拍攝完成後，攝影師補上作品交件連結，客戶可回同一頁下載。  

## 第一階段範圍

- 第一階段「合約送出」只做：前端驗證、產生 PDF、呼叫 `/api/send-contract` 寄送 Email（可選）。  
- 不會自動回寫 `content/clients/*.md`；頁面上方「合約狀態／付款狀態」於送出後僅為前端顯示，重新整理後會回到 MD 原始內容。  
- 若要永久保存客戶選擇的付款狀態、合約送出時間、PDF 寄送紀錄等，第二階段需串接 GitHub API、後台資料庫或其他儲存機制。  

## Cloudflare Pages 環境變數

- `RESEND_API_KEY`：Resend API 金鑰（必填，僅後端 Function 使用）。  
- `CONTRACT_FROM_EMAIL`：寄件者（例如 `Family Contract <noreply@yourdomain.com>`）。  
- `CONTRACT_PHOTOGRAPHER_EMAIL`：攝影師收件信箱，預設 `crownchief@gmail.com`。  

若未設定 `RESEND_API_KEY`，API 會回傳失敗訊息，前端仍可下載 PDF 作為 fallback 手動傳送。  

## 隱私與安全

- `/clients/[slug]/` 維持 `noindex,nofollow,noarchive,nosnippet,noimageindex`，不列入公開 sitemap。  
- 前端不保存 API Key，PDF 不公開上傳。  
- 第一階段僅透過 Email 傳送 PDF。  
- 若未來要保存 PDF，建議使用 Cloudflare R2 私有儲存與受控下載連結。  
