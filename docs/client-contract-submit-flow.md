# 客戶合約送出流程

1. 攝影師用 Cursor 根據 LINE 對話建立客戶 MD。  
2. 網站自動產生客戶專屬頁。  
3. 攝影師檢查內容後，把專屬連結傳給客戶。  
4. 客戶填寫補充資料。  
5. 客戶完成合約確認與電子簽名。  
6. 系統產生 PDF。  
7. 系統將 PDF 寄給客戶 Email 與攝影師 Email。  
8. 客戶完成訂金付款。  
9. 攝影師確認款項後，手動或未來自動更新客戶 MD。  
10. 拍攝完成後，攝影師補上作品交件連結，客戶可回同一頁下載。  

## 第一階段範圍

- 第一階段「合約送出」只做：前端驗證、產生 PDF、呼叫 `/api/send-contract` 寄送 Email。  
- 不會自動回寫 `content/clients/*.md`，重新整理後頁面狀態可能回到原始 frontmatter。  
- 若要永久更新狀態（例如 `contractStatus: signed`、`signedAt`、`signedPdfUrl`、`paymentStatus`、`paymentConfirmedAt`），第二階段需串接 GitHub API 或後台資料儲存。  

## Cloudflare Pages 環境變數

- `RESEND_API_KEY`：Resend API 金鑰（必填，僅後端 Function 使用）。  
- `CONTRACT_FROM_EMAIL`：寄件者（例如 `Family Contract <noreply@yourdomain.com>`）。  
- `CONTRACT_PHOTOGRAPHER_EMAIL`：攝影師收件信箱，預設 `crownchief@gmail.com`。  

若未設定 `RESEND_API_KEY`，API 會回傳失敗訊息，前端仍可下載 PDF 作為 fallback 手動傳送。  

## 隱私與安全

- `/clients/[slug]/` 維持 `noindex,nofollow`，不列入公開 sitemap。  
- 前端不保存 API Key，PDF 不公開上傳。  
- 第一階段僅透過 Email 傳送 PDF。  
- 若未來要保存 PDF，建議使用 Cloudflare R2 私有儲存與受控下載連結。  
