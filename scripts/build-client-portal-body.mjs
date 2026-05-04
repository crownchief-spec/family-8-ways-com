/**
 * 產生 /clients/[slug]/ 頁面 body（預約只讀、readyToShare 門檻、表單區）
 * @param {Record<string, unknown>} c — normalize 後客戶
 * @param {Record<string, string>} site — cfg.site
 * @param {{ escapeHtml: (s: unknown) => string; isPresent: (v: unknown) => boolean }} helpers
 */
export function buildClientPortalBody(c, site, { escapeHtml, isPresent }) {
  const readyShare = c.readyToShare === true;
  const depositDefault =
    c.deposit != null && String(c.deposit).trim() !== '' && Number.isFinite(Number(c.deposit))
      ? String(Number(c.deposit))
      : '';
  const clientAdultDefault =
    c.clientAdultCount != null && String(c.clientAdultCount).trim() !== ''
      ? String(c.clientAdultCount)
      : c.adultCount != null && String(c.adultCount).trim() !== ''
        ? String(c.adultCount)
        : '2';
  const clientChildDefault =
    c.clientChildCount != null && String(c.clientChildCount).trim() !== ''
      ? String(c.clientChildCount)
      : c.childCount != null && String(c.childCount).trim() !== ''
        ? String(c.childCount)
        : '1';
  const paymentPillLine = escapeHtml(
    String(c.paymentStatus || '').trim() ? String(c.paymentStatus).trim() : '訂金待確認',
  );
  const photographerPayNote = isPresent(c.paymentNoteFromAdmin)
    ? String(c.paymentNoteFromAdmin)
    : isPresent(c.paymentNote)
      ? String(c.paymentNote)
      : '';
  const deliverablesMerged = [c.deliverables, c.photoDeliverables, c.videoDeliverables]
    .filter((x) => isPresent(x))
    .map((x) => String(x).trim())
    .join('\n\n');
  const specLines = Array.isArray(c.specialRequests)
    ? c.specialRequests.filter(Boolean).map((x) => `<li>${escapeHtml(String(x))}</li>`).join('')
    : '';

  /** 拍攝前準備／作品交件：未簽合約且 MD 未標註已付訂時先隱藏，由前端依 localStorage 或「已匯款訂金」顯示 */
  const csForDefer = String(c.contractStatus || '').trim();
  const psForDefer = String(c.paymentStatus || '').trim();
  const mdShowsPostBooking =
    /已簽|PDF|簽署完成|客戶已簽|已完成|確認完成/i.test(csForDefer) ||
    /已匯款|已付款|已確認訂金|已收款|訂金已|款項已/i.test(psForDefer);
  const deferredBlocksAttrs = mdShowsPostBooking ? '' : ' id="portal-deferred-blocks" hidden';

  const lockBanner = !readyShare
    ? `<article class="card card--flat portal-locked-banner" style="border:1px solid rgba(220,180,80,0.5);background:rgba(255,248,220,0.35);">
    <p style="margin:0 0 0.5rem;"><strong>此頁尚在攝影師確認中，尚未開放填寫</strong></p>
    <p class="muted" style="margin:0;">攝影師於後台確認並開放後，您即可在此填寫訂金狀態、家庭資料與完成電子簽名。若您已收到連結但看到此訊息，請稍候或聯繫攝影師。</p>
  </article>`
    : '';

  const readonlyArticle = `<article class="card">
    <h2 class="h2">預約資訊</h2>
    <p class="muted" style="margin-top:0;">以下為攝影師依雙方討論建立的合約內容，僅供檢視。</p>
    <div class="portal-grid-2">
      <p><strong>客戶名稱：</strong>${escapeHtml(c.clientName)}</p>
      ${isPresent(c.shootingDate) ? `<p><strong>拍攝日期：</strong>${escapeHtml(c.shootingDate)}${isPresent(c.shootingWeekday) ? `（${escapeHtml(c.shootingWeekday)}）` : ''}</p>` : ''}
      ${isPresent(c.shootingStartTime) || isPresent(c.shootingEndTime) ? `<p><strong>拍攝時間：</strong>${escapeHtml([c.shootingStartTime, c.shootingEndTime].filter(Boolean).join(' - '))}</p>` : ''}
      ${isPresent(c.duration) ? `<p><strong>拍攝時長：</strong>${escapeHtml(c.duration)}</p>` : ''}
      ${isPresent(c.packageName) ? `<p><strong>拍攝方案：</strong>${escapeHtml(c.packageName)}</p>` : ''}
      ${isPresent(c.location) ? `<p><strong>行程／區域：</strong>${escapeHtml(c.location)}</p>` : ''}
      ${isPresent(c.meetingPoint) ? `<p><strong>拍攝地點：</strong>${escapeHtml(c.meetingPoint)}</p>` : ''}
      ${isPresent(c.pickup) ? `<p><strong>是否含接送：</strong>${escapeHtml(c.pickup)}</p>` : ''}
      ${isPresent(c.totalFee) ? `<p><strong>總費用：</strong>NT$${Number(c.totalFee || 0).toLocaleString('zh-TW')}</p>` : ''}
      ${isPresent(c.deposit) ? `<p><strong>訂金：</strong>NT$${Number(c.deposit || 0).toLocaleString('zh-TW')}</p>` : ''}
      ${isPresent(c.balance) ? `<p><strong>餘款：</strong>NT$${Number(c.balance || 0).toLocaleString('zh-TW')}</p>` : ''}
    </div>
    ${isPresent(deliverablesMerged) ? `<p><strong>成品內容：</strong><span data-deliverables-text>${escapeHtml(deliverablesMerged)}</span></p>` : ''}
    ${isPresent(c.contractNote) ? `<p><strong>合約補充條款：</strong>${escapeHtml(c.contractNote)}</p>` : ''}
    ${specLines ? `<p><strong>特殊約定：</strong></p><ul class="prose">${specLines}</ul>` : ''}
    <p class="portal-note muted" style="margin-top:var(--space-md);">以上拍攝資訊由攝影師依雙方討論內容建立。若內容需要修改，請先聯繫攝影師，由攝影師更新後台資料。</p>
  </article>`;

  const feeSummaryLines = [
    isPresent(c.totalFee)
      ? `<p style="margin:0.35rem 0;"><strong>攝影總費用：</strong>NT$${Number(c.totalFee || 0).toLocaleString('zh-TW')}</p>`
      : '',
    isPresent(c.deposit)
      ? `<p style="margin:0.35rem 0;"><strong>訂金金額：</strong>NT$${Number(c.deposit || 0).toLocaleString('zh-TW')}</p>`
      : '',
    isPresent(c.balance)
      ? `<p style="margin:0.35rem 0;"><strong>餘款：</strong>NT$${Number(c.balance || 0).toLocaleString('zh-TW')}</p>`
      : '',
  ]
    .filter(Boolean)
    .join('');

  const formArticle = readyShare
    ? `<article class="card portal-form">
    <form id="client-contract-form" novalidate>
      <h2 class="h2">費用與訂金匯款</h2>
      <p class="muted" style="margin-top:0;">下列為本次方案費用、訂金與匯款方式；匯款後請於下方回報付款方式與帳號末碼，方便攝影師對帳。</p>
      ${feeSummaryLines ? `<div class="portal-fee-summary" style="margin:var(--space-md) 0;padding:var(--space-md);background:rgba(0,0,0,0.03);border-radius:10px;border:1px solid var(--color-line);">${feeSummaryLines}</div>` : ''}
      ${isPresent(photographerPayNote) ? `<p><strong>攝影師備註（付款相關）：</strong>${escapeHtml(photographerPayNote)}</p>` : ''}

      <h3 class="h3" style="margin-top:var(--space-lg);">訂金匯款方式</h3>
      <div class="portal-note">
        <p><strong>Line Pay：</strong>可使用 Line Pay 支付訂金，請與攝影師確認付款方式。</p>
        <p><strong>銀行轉帳：</strong><br/>台新銀行（812）板橋分行<br/>分行代碼：0089<br/>帳號：20081000109398<br/>戶名：陳在紳</p>
        ${c.paymentEnablePaypal !== false ? '<p><strong>PayPal：</strong>海外用戶可使用 PayPal 支付訂金。<a href="https://paypal.me/bmpss96147/1800" target="_blank" rel="noopener noreferrer">付款連結一</a>、<a href="https://paypal.me/bmpss96147/2800" target="_blank" rel="noopener noreferrer">付款連結二</a></p>' : ''}
        <p><strong>微信支付：</strong>請加 WeChat 帳號：travelphotographer</p>
        ${c.paymentEnableWise !== false ? '<p><strong>WISE：</strong>海外用戶可支付約 USD 25（約 NT$800）作為訂金，實際匯率與手續費依平台顯示為準。</p>' : ''}
      </div>

      <h3 class="h3" style="margin-top:var(--space-lg);">填寫目前付款狀態與匯款回報</h3>
      <fieldset class="portal-fieldset">
        <legend class="sr-only">客戶目前付款狀態</legend>
        <label class="check-row"><input type="radio" name="paymentStatus" value="已匯款訂金" /> 已匯款訂金</label>
        <label class="check-row"><input type="radio" name="paymentStatus" value="尚未匯款，稍後會完成訂金" /> 尚未匯款，稍後會完成訂金</label>
        <label class="check-row"><input type="radio" name="paymentStatus" value="想先確認合約內容，再完成訂金" /> 想先確認合約內容，再完成訂金</label>
        <label class="check-row"><input type="radio" name="paymentStatus" value="使用其他付款方式，已與攝影師確認" /> 使用其他付款方式，已與攝影師確認</label>
      </fieldset>
      <p class="muted" id="bank-last5-hint" hidden>若已匯款訂金，請填寫付款方式、金額與匯款帳號後四碼（或末五碼），方便攝影師對帳。</p>
      <div class="portal-grid-2">
        <label class="field"><span>付款方式</span>
          <select name="paymentMethod">
            <option value="">請選擇</option>
            <option value="銀行轉帳">銀行轉帳</option>
            <option value="Line Pay">Line Pay</option>
            <option value="PayPal">PayPal</option>
            <option value="微信支付">微信支付</option>
            <option value="WISE">WISE</option>
            <option value="其他">其他</option>
          </select>
        </label>
        <label class="field"><span>匯款帳號後四碼（或末五碼）</span><input type="text" name="bankLast5" maxlength="10" autocomplete="off" placeholder="例如：81293 或 09398" value="${escapeHtml(c.bankLast5 || '')}" /></label>
        <label class="field"><span>付款金額（NT$）</span><input type="number" name="paymentAmount" min="0" step="1" value="${escapeHtml(depositDefault)}" /></label>
        <label class="field"><span>付款日期</span><input type="date" name="paymentDate" id="client-payment-date" value="${escapeHtml(c.paymentDate || '')}" /></label>
      </div>
      <label class="field"><span>付款備註（客戶）</span><textarea name="paymentNote" rows="3" placeholder="例如：家人代匯、Line Pay 已付款、稍後晚上匯款">${escapeHtml(c.paymentNote || '')}</textarea></label>
      <p class="muted">若已匯款，建議填寫後四碼或末五碼。未填寫仍可送出合約（第一階段不強制）。</p>

      <h2 class="h2" style="margin-top:var(--space-xl);">客戶補充資料</h2>
      <p class="muted" style="margin-top:0;">下列稱呼／姓名<strong>至少填寫一項</strong>即可（例如只填主要聯絡人或爸爸／媽媽稱呼均可）。</p>
      <div class="portal-grid-2">
        <label class="field"><span>攝影師如何稱呼爸爸</span><input name="fatherName" type="text" placeholder="例如：爸爸、John、阿宏" value="${escapeHtml(c.fatherName || '')}" /></label>
        <label class="field"><span>攝影師如何稱呼媽媽</span><input name="motherName" type="text" placeholder="例如：媽媽、Amy、小君" value="${escapeHtml(c.motherName || '')}" /></label>
        <label class="field"><span>主要聯絡人姓名</span><input name="contactName" type="text" value="${escapeHtml(c.contactName || '')}" /></label>
        <label class="field"><span>聯絡電話</span><input name="phone" type="text" value="${escapeHtml(c.phone || '')}" /></label>
        <label class="field"><span>Email（必填）</span><input name="customerEmail" type="email" value="${escapeHtml(c.customerEmail || c.email || '')}" required /></label>
        <label class="field"><span>LINE 顯示名稱或 LINE ID</span><input name="lineName" type="text" value="${escapeHtml(c.lineName || '')}" /></label>
        <label class="field"><span>客戶確認入鏡大人人數</span><input name="clientAdultCount" type="number" min="0" value="${escapeHtml(clientAdultDefault)}" /></label>
        <label class="field"><span>客戶確認入鏡小孩人數</span><input name="clientChildCount" type="number" min="0" value="${escapeHtml(clientChildDefault)}" /></label>
      </div>
      <label class="field"><span>小朋友的年齡與稱呼</span><textarea name="childrenInfo" rows="3">${escapeHtml(c.childrenInfo || '')}</textarea></label>
      <label class="field"><span>簡單介紹一家人</span><textarea name="familyIntro" rows="4">${escapeHtml(c.familyIntro || '')}</textarea></label>
      <label class="field"><span>特別想拍的畫面</span><textarea name="desiredShots" rows="4">${escapeHtml(c.desiredShots || '')}</textarea></label>
      <label class="field"><span>需要攝影師注意的地方</span><textarea name="specialNotes" rows="4">${escapeHtml(c.specialNotes || '')}</textarea></label>

      <h2 class="h2" style="margin-top:var(--space-xl);">合約確認與簽名</h2>
      <p class="muted" style="margin-top:0;">請於下方簽名區手寫簽名並確認；送出後會產生 PDF 預約確認書。</p>
      <div class="portal-grid-2">
        <label class="field"><span>簽名人姓名</span><input type="text" name="signerName" placeholder="可留白，將沿用上方姓名" /></label>
        <label class="field"><span>簽署日期</span><input type="date" id="client-signed-date" name="signedDate" /></label>
      </div>
      <div class="signature-wrap">
        <canvas id="client-signature-canvas" aria-label="客戶手寫簽名區"></canvas>
      </div>
      <div class="signature-actions no-print">
        <button class="btn btn--secondary" type="button" id="client-clear-signature">清除簽名</button>
        <button class="btn btn--primary" type="button" id="client-confirm-signature">確認簽名</button>
      </div>
      <p class="muted" id="client-sign-state">尚未確認簽名</p>
      <p class="error-text" id="client-signature-error" hidden>請先完成電子簽名後再送出合約。</p>
      <input type="hidden" id="client-signature-image-base64" />
      <input type="hidden" id="client-signed-at" />

      <h2 class="h2" style="margin-top:var(--space-xl);">送出合約並產生 PDF</h2>
      <p class="muted no-print">送出後會產生合約 PDF；若已設定 Email API，系統會將 PDF 寄到您填寫的 Email 與攝影師信箱。</p>
      <div class="hero__actions no-print">
        <button class="btn btn--primary" type="submit" id="client-submit-contract">送出合約並產生 PDF</button>
      </div>
      <p class="muted no-print" id="client-submit-status"></p>
      <div class="hero__actions no-print" id="client-download-wrap" hidden>
        <button class="btn btn--secondary" type="button" id="client-download-pdf">下載合約 PDF</button>
      </div>
      <div class="card card--flat no-print" id="contract-email-fallback" hidden style="margin-top:var(--space-md);padding:var(--space-md);">
        <p class="muted" style="margin-top:0;">合約 PDF 已產生，但目前系統尚未完成自動寄信設定。請先下載 PDF，並透過 Line 傳給小巴老師，或等待攝影師協助確認。</p>
        <div class="hero__actions" style="flex-wrap:wrap;">
          <button class="btn btn--secondary" type="button" id="client-copy-photographer-email">複製攝影師 Email</button>
          <a class="btn btn--primary" id="client-fallback-line" href="${escapeHtml(site.lineUrl)}" target="_blank" rel="noopener noreferrer">開啟 Line 聯絡</a>
        </div>
      </div>
      <p class="error-text" id="client-form-error" hidden></p>
      <div class="client-contract-signed" id="signed-status-panel" hidden>
        <p><strong>合約處理完成</strong></p>
        <p>簽署時間：<span id="signed-at-text"></span></p>
        <img id="signed-image" alt="簽名影像" />
      </div>
    </form>
    <div id="contract-pdf-content" style="position:fixed;left:-10000px;top:0;width:820px;background:#fff;color:#111;padding:24px;z-index:-1;"></div>
  </article>`
    : '';

  return `<section class="family-contract-hero">
  <div class="container family-contract-wrap">
    <h1 class="h1">${escapeHtml(c.clientName)}｜親子寫真預約與合約</h1>
    <p class="lead">${readyShare ? '請確認預約資訊後，填寫訂金回報與家庭資料，並完成簽名。送出後可下載 PDF。' : '此專屬頁面由攝影師建立中；開放填寫後即可在此完成訂金回報與簽名。'}</p>
    <div class="portal-status">
      <span class="status-pill" id="contract-status-tag">合約狀態：${escapeHtml(c.contractStatus || '尚未簽署')}</span>
      <span class="status-pill" id="payment-status-pill">付款狀態：${paymentPillLine}</span>
      <span class="status-pill" id="delivery-status-pill">作品交件狀態：${escapeHtml(c.deliveryStatus || '')}</span>
      ${!c.adminReviewed ? '<span class="status-pill">攝影師待確認</span>' : ''}
    </div>
  </div>
</section>
<section class="container section family-contract-wrap portal-grid" data-client-portal data-ready-to-share="${readyShare ? '1' : '0'}" data-line-url="${escapeHtml(site.lineUrl)}" data-photographer-email="crownchief@gmail.com" data-client-slug="${escapeHtml(c.slug)}" data-client-name="${escapeHtml(c.clientName)}" data-shooting-date="${escapeHtml(c.shootingDate || '')}" data-start-time="${escapeHtml(c.shootingStartTime || '')}" data-end-time="${escapeHtml(c.shootingEndTime || '')}" data-package-name="${escapeHtml(c.packageName || '')}" data-location="${escapeHtml(c.location || '')}" data-pickup="${escapeHtml(c.pickup || '')}" data-total-fee="${escapeHtml(c.totalFee || '')}" data-deposit="${escapeHtml(c.deposit || '')}" data-balance="${escapeHtml(c.balance || '')}" data-contract-version="${escapeHtml(c.contractVersion || 'family-contract-v2026-05')}" data-photographer-adult="${escapeHtml(c.adultCount != null && String(c.adultCount).trim() !== '' ? String(c.adultCount) : '')}" data-photographer-child="${escapeHtml(c.childCount != null && String(c.childCount).trim() !== '' ? String(c.childCount) : '')}">
  ${lockBanner}
  ${readonlyArticle}
  ${formArticle}

  <div${deferredBlocksAttrs}>
  <article class="card">
    <h2 class="h2">拍攝前準備</h2>
    <p>拍攝前可以先簡單準備服裝、孩子喜歡的小物、簡單點心與水。親子寫真的重點不是擺拍，而是讓家人在自然互動中留下真實表情。</p>
    <ul class="prose">
      <li>建議準備 1～2 套服裝</li>
      <li>家人服裝色系可以互相搭配，但不需要完全一樣</li>
      <li>小朋友可以帶喜歡的玩具或安撫小物</li>
      <li>可準備水、簡單點心、濕紙巾</li>
      <li>若有長輩或小小孩同行，請預留休息時間</li>
      <li>若孩子怕生，拍攝一開始會以陪玩和聊天為主，不會強迫擺拍</li>
    </ul>
  </article>

  <article class="card">
    <h2 class="h2">作品交件</h2>
    ${isPresent(c.deliveryStatus) ? `<p><strong>作品交件狀態：</strong>${escapeHtml(c.deliveryStatus)}</p>` : ''}
    ${c.driveFolderUrl || c.selectedPhotoUrl || c.videoUrl ? '' : '<p>拍攝完成後，照片整理與基本處理需要一些時間。完成後，攝影師會將雲端下載連結放在此頁，您可以隨時回到同一個專屬連結查看與下載。</p>'}
    <div class="delivery-actions">
      ${c.driveFolderUrl ? `<a class="btn btn--primary" href="${escapeHtml(c.driveFolderUrl)}" target="_blank" rel="noopener noreferrer">下載完整照片</a>` : ''}
      ${c.selectedPhotoUrl ? `<a class="btn btn--secondary" href="${escapeHtml(c.selectedPhotoUrl)}" target="_blank" rel="noopener noreferrer">查看精選照片</a>` : ''}
      ${c.videoUrl ? `<a class="btn btn--secondary" href="${escapeHtml(c.videoUrl)}" target="_blank" rel="noopener noreferrer">觀看影片</a>` : ''}
    </div>
    ${isPresent(c.deliveryNote) ? `<p class="portal-note">${escapeHtml(c.deliveryNote)}</p>` : '<p class="portal-note">照片完成後會提供雲端下載連結。建議收到連結後先下載備份至自己的電腦或雲端硬碟，避免日後連結過期或雲端空間調整。</p>'}
  </article>
  </div>

  <article class="card">
    <h2 class="h2">聯絡攝影師</h2>
    <p>如果合約內容、付款方式、拍攝地點或作品下載有任何問題，請直接聯繫攝影師。</p>
    <div class="hero__actions">
      <a class="btn btn--primary" href="${site.lineUrl}" target="_blank" rel="noopener noreferrer">Line 詢問</a>
      <a class="btn btn--secondary" href="${site.phoneTel}">電話聯絡</a>
      <a class="btn btn--secondary" href="mailto:${escapeHtml(site.email)}">Email 聯絡</a>
    </div>
    <p class="muted">Line／電話：0911-252-302<br/>WhatsApp：+886 911252302<br/>E-mail：${escapeHtml(site.email)}</p>
  </article>
</section>`;
}
