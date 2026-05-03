# 從對話產生客戶 MD 範例

## 1) 模擬客戶對話

客戶（林小姐）：
- 我們家想約 2026/07/12 拍親子寫真，兩大兩小。
- 想拍台北草地、公園跟黃昏的感覺。
- 想問有沒有包車？還有影片可以做嗎？
- 方案想選全天，預算可以抓 14800。
- 訂金先付 3000，尾款當天付可以嗎？
- Email 我晚點補給你。

攝影師回覆摘要：
- 全天可安排，成品至少 200 張 + 1 支 MV。
- 包車可安排，細節（集合點、路線）拍攝前再確認。
- 2026/07/12 可先保留，訂金 3000 收到後正式保留檔期。

## 2) AI 應抽取資料（摘要）

- 客戶名稱：林小姐家庭
- 聯絡人：林小姐
- 拍攝日期：2026-07-12
- 方案：親子寫真 - 全天方案
- 方案類型：台灣親子旅拍
- 人數：2 大 2 小
- 地點偏好：台北草地、公園、黃昏
- 接送：希望包車
- MV：需要（全天含 1 支）
- 總費用：14800
- 訂金：3000
- 尾款：11800
- 付款狀態：訂金待確認
- 合約狀態：尚未簽署
- 交件狀態：尚未拍攝
- Email：未提供（待確認）
- slug 建議：2026-07-12family

## 3) 產生的客戶 MD 範例

```md
---
title: "林小姐家庭｜親子寫真客戶專區"
clientName: "林小姐家庭"
clientAlias: "lin-family"
slug: "2026-07-12family"
status: "active"
hubPortal: true
publish: false
portfolioPublish: false
noindex: true

serviceType: "親子寫真"
packageCategory: "台灣親子旅拍"
packageName: "親子寫真 - 全天方案"

shootingDate: "2026-07-12"
shootingWeekday: ""
shootingStartTime: ""
shootingEndTime: ""
duration: "8 小時"
location: "台北（草地、公園、黃昏）"
meetingPoint: ""
pickup: "希望包車"
transportationNote: "包車路線與集合點待確認"

familyCount: "1"
adultCount: "2"
childCount: "2"
childrenAges: ""
elderIncluded: false
petIncluded: false

totalFee: 14800
deposit: 3000
balance: 11800
paymentStatus: "訂金待確認"
paymentNote: "尾款拍攝當天支付"

deliverables: "照片全給至少 200 張 + 1 支微電影 MV。"
photoDeliverables: "至少 200 張"
videoDeliverables: "1 支 MV"
mvIncluded: true
droneIncluded: false
underwaterIncluded: false
specialRequests:
  - "希望黃昏時段畫面"

contactName: "林小姐"
phone: ""
email: ""
lineName: ""

contractStatus: "尚未簽署"
contractVersion: "family-contract-v2026-05"
contractSignedAt: ""
contractNote: "訂金完成後正式保留檔期"

driveFolderUrl: ""
selectedPhotoUrl: ""
videoUrl: ""
deliveryStatus: "尚未拍攝"
deliveryNote: ""

coverImage: ""
gallery: []

tags:
  - 親子寫真
  - 台北親子旅拍
  - 全天方案

createdAt: "2026-05-04"
updatedAt: "2026-05-04"
---

## 客戶備註

客戶偏好草地、公園、黃昏氛圍，畫面希望自然互動感。

## 拍攝故事

希望在城市自然景與家庭互動中，留下旅行感與日常陪伴記錄。

## 拍攝安排

建議安排上午暖場互動、午後休息、傍晚黃昏主拍。

## 成品內容

照片全給（至少 200 張）與 1 支 MV。

## 付款與合約

總費用 14800，訂金 3000，尾款當日支付。

## 合約補充條款

包車路線與集合點需於拍攝前 3-5 日確認。

## 待確認事項

- Email
- 實際集合點
- 孩子年齡

## 內部備註

若天氣不穩，優先保留黃昏時段，前段可調整至半室內動線。
```

## 4) 待確認事項範例

- 聯絡 Email 尚未提供
- 小孩年齡尚未提供
- 實際集合地點待確認
- 若需要夜拍或加拍，需再確認時數與費用
