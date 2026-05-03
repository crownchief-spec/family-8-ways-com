import { escapeHtml } from './render.mjs';

function v(val) {
  return escapeHtml(val == null ? '' : String(val));
}

function textInput(label, name, val, extra = '') {
  return `<label class="field"><span>${escapeHtml(label)}</span><input type="text" name="${escapeHtml(name)}" value="${v(val)}" ${extra}/></label>`;
}

function numberInput(label, name, val) {
  return `<label class="field"><span>${escapeHtml(label)}</span><input type="text" name="${escapeHtml(name)}" value="${v(val)}" inputmode="decimal" /></label>`;
}

function textareaField(label, name, val, rows = 4) {
  return `<label class="field"><span>${escapeHtml(label)}</span><textarea name="${escapeHtml(name)}" rows="${rows}">${v(val)}</textarea></label>`;
}

function checkField(label, name, checked) {
  return `<label class="check-row"><input type="checkbox" name="${escapeHtml(name)}" value="true"${checked ? ' checked' : ''}/> ${escapeHtml(label)}</label>`;
}

function arrToLines(arr) {
  if (!Array.isArray(arr)) return '';
  return arr.filter(Boolean).join('\n');
}

/**
 * @param {Record<string, unknown>} c — normalize 後的客戶物件（含 _mdRelPath）
 * @param {{ url: string }} site
 */
export function buildAdminClientEditBody(c, site) {
  const clientUrl = `${site.url.replace(/\/+$/, '')}/clients/${encodeURI(c.slug)}/`;
  const spec = Array.isArray(c.specialRequests) ? c.specialRequests : [];
  const tags = Array.isArray(c.tags) ? c.tags : [];
  const gal = Array.isArray(c.gallery) ? c.gallery : [];

  return `<nav class="container section" style="padding-bottom:0;"><div class="muted"><a href="/admin/">後台</a> / <a href="/admin/clients/">客戶案件</a> / <span>編輯</span></div></nav>
<section class="admin-hero"><div class="admin-wrap">
  <h1 class="h1">編輯客戶案件｜${v(c.clientName)}</h1>
  <p class="lead">以下為攝影師欄位，儲存後會寫入客戶 Markdown。請確認 <strong>readyToShare</strong> 為「可分享」後，再將客戶專屬連結傳給客人。</p>
  <p class="admin-warning" id="admin-edit-guard-msg"${c.readyToShare ? ' hidden' : ''}>此案件尚未標記為可分享，客戶頁將不開放填寫表單。</p>
</div></section>

<section class="container section admin-wrap">
  <div class="admin-actions" style="flex-wrap:wrap;margin-bottom:var(--space-lg);">
    <button type="button" class="btn btn--primary" id="admin-save-md">儲存客戶 MD</button>
    <a class="btn btn--secondary" href="/clients/${v(c.slug)}/" target="_blank" rel="noopener noreferrer">預覽客戶頁</a>
    <button type="button" class="btn btn--secondary" id="admin-copy-client-url" data-client-url="${v(clientUrl)}">複製客戶專屬連結</button>
    <a class="btn btn--ghost" href="/admin/clients/">回到客戶列表</a>
  </div>
  <p class="muted" id="admin-save-status" style="min-height:1.5em;"></p>

  <form id="admin-client-edit-form" class="admin-edit-form" data-md-path="${v(c._mdRelPath || `content/clients/${c.slug}.md`)}" data-slug="${v(c.slug)}">
    <article class="card"><h2 class="h2">1. 案件基本資料</h2>
      <div class="portal-grid-2">
        ${textInput('標題 title', 'title', c.title)}
        ${textInput('客戶名稱 clientName', 'clientName', c.clientName)}
        ${textInput('客戶代稱 clientAlias', 'clientAlias', c.clientAlias)}
        ${textInput('案件狀態 status', 'status', c.status)}
        ${textInput('slug（請謹慎修改）', 'slug', c.slug, 'readonly')}
      </div>
    </article>

    <article class="card"><h2 class="h2">2. 拍攝資訊</h2>
      <div class="portal-grid-2">
        ${textInput('拍攝日期 shootingDate', 'shootingDate', c.shootingDate)}
        ${textInput('星期 shootingWeekday', 'shootingWeekday', c.shootingWeekday)}
        ${textInput('開始時間 shootingStartTime', 'shootingStartTime', c.shootingStartTime)}
        ${textInput('結束時間 shootingEndTime', 'shootingEndTime', c.shootingEndTime)}
        ${textInput('時長 duration', 'duration', c.duration)}
        ${textInput('拍攝地點 location', 'location', c.location)}
        ${textInput('集合地點 meetingPoint', 'meetingPoint', c.meetingPoint)}
        ${textInput('是否含接送 pickup', 'pickup', c.pickup)}
        ${textareaField('接送備註 transportationNote', 'transportationNote', c.transportationNote, 3)}
      </div>
    </article>

    <article class="card"><h2 class="h2">3. 方案與費用</h2>
      <div class="portal-grid-2">
        ${textInput('拍攝類型 serviceType', 'serviceType', c.serviceType)}
        ${textInput('方案分類 packageCategory', 'packageCategory', c.packageCategory)}
        ${textInput('方案名稱 packageName', 'packageName', c.packageName)}
        ${numberInput('總費用 totalFee', 'totalFee', c.totalFee)}
        ${numberInput('訂金 deposit', 'deposit', c.deposit)}
        ${numberInput('餘款 balance', 'balance', c.balance)}
        ${textareaField('付款備註（攝影師）paymentNoteFromAdmin', 'paymentNoteFromAdmin', c.paymentNoteFromAdmin, 3)}
      </div>
    </article>

    <article class="card"><h2 class="h2">4. 成品內容</h2>
      ${textareaField('成品總述 deliverables', 'deliverables', c.deliverables, 4)}
      ${textareaField('照片成品 photoDeliverables', 'photoDeliverables', c.photoDeliverables, 3)}
      ${textareaField('影片成品 videoDeliverables', 'videoDeliverables', c.videoDeliverables, 3)}
      ${checkField('是否含 MV mvIncluded', 'mvIncluded', !!c.mvIncluded)}
      ${checkField('是否含空拍 droneIncluded', 'droneIncluded', !!c.droneIncluded)}
      ${checkField('是否含水中攝影 underwaterIncluded', 'underwaterIncluded', !!c.underwaterIncluded)}
      ${textareaField('特殊約定 specialRequests（每行一項）', 'specialRequestsLines', arrToLines(spec), 4)}
    </article>

    <article class="card"><h2 class="h2">5. 合約設定</h2>
      <div class="portal-grid-2">
        ${textInput('合約狀態 contractStatus', 'contractStatus', c.contractStatus)}
        ${textInput('合約版本 contractVersion', 'contractVersion', c.contractVersion)}
        ${textareaField('合約補充條款 contractNote', 'contractNote', c.contractNote, 3)}
        ${checkField('啟用合約區 contractEnabled', 'contractEnabled', c.contractEnabled !== false)}
        ${checkField('可分享連結 shareEnabled', 'shareEnabled', c.shareEnabled !== false)}
        ${checkField('攝影師已確認 adminReviewed', 'adminReviewed', !!c.adminReviewed)}
        ${checkField('可開放客戶填寫 readyToShare', 'readyToShare', !!c.readyToShare)}
        ${textInput('確認時間 reviewedAt', 'reviewedAt', c.reviewedAt)}
        ${textInput('確認者 reviewedBy', 'reviewedBy', c.reviewedBy)}
      </div>
    </article>

    <article class="card"><h2 class="h2">6. 作品交件</h2>
      <div class="portal-grid-2">
        ${textInput('交件狀態 deliveryStatus', 'deliveryStatus', c.deliveryStatus)}
        ${textInput('雲端照片連結 driveFolderUrl', 'driveFolderUrl', c.driveFolderUrl)}
        ${textInput('影片連結 videoUrl', 'videoUrl', c.videoUrl)}
        ${textareaField('交件備註 deliveryNote', 'deliveryNote', c.deliveryNote, 3)}
      </div>
    </article>

    <article class="card"><h2 class="h2">7. 隱私與公開</h2>
      <div class="portal-grid-2">
        ${textInput('隱私 privacy', 'privacy', c.privacy)}
        ${checkField('noindex', 'noindex', c.noindex !== false)}
        ${checkField('顯示於客戶列表說明 showInClientList', 'showInClientList', !!c.showInClientList)}
        ${checkField('公開作品集 publicPortfolio', 'publicPortfolio', !!c.publicPortfolio)}
        ${checkField('僅後台 adminOnly', 'adminOnly', !!c.adminOnly)}
      </div>
    </article>

    <article class="card"><h2 class="h2">8. 人數與其他</h2>
      <div class="portal-grid-2">
        ${numberInput('家庭數 familyCount', 'familyCount', c.familyCount)}
        ${numberInput('攝影師預設入鏡大人 adultCount', 'adultCount', c.adultCount)}
        ${numberInput('攝影師預設入鏡小孩 childCount', 'childCount', c.childCount)}
        ${checkField('是否含長輩 elderIncluded', 'elderIncluded', !!c.elderIncluded)}
        ${checkField('是否含寵物 petIncluded', 'petIncluded', !!c.petIncluded)}
        ${checkField('啟用 PayPal 說明 paymentEnablePaypal', 'paymentEnablePaypal', c.paymentEnablePaypal !== false)}
        ${checkField('啟用 WISE 說明 paymentEnableWise', 'paymentEnableWise', c.paymentEnableWise !== false)}
        ${checkField('作品集發佈 portfolioPublish', 'portfolioPublish', !!c.portfolioPublish)}
        ${checkField('發佈 publish', 'publish', !!c.publish)}
        ${checkField('客戶專區 hubPortal', 'hubPortal', c.hubPortal !== false)}
        ${checkField('交件區 deliveryEnabled', 'deliveryEnabled', c.deliveryEnabled !== false)}
        ${textInput('客戶存取碼 clientAccessCode', 'clientAccessCode', c.clientAccessCode)}
        ${textInput('精選照 selectedPhotoUrl', 'selectedPhotoUrl', c.selectedPhotoUrl)}
        ${textInput('封面 coverImage', 'coverImage', c.coverImage)}
      </div>
    </article>

    <article class="card"><h2 class="h2">9. 內部備註</h2>
      ${textareaField('internalNote', 'internalNote', c.internalNote, 5)}
    </article>

    <article class="card"><h2 class="h2">標籤與內文（Markdown body）</h2>
      ${textareaField('tags（每行一項）', 'tagsLines', arrToLines(tags), 4)}
      ${textareaField('gallery（每行一個網址）', 'galleryLines', arrToLines(gal), 3)}
      ${textareaField('Body', 'bodyMd', c.bodyMd || '', 16)}
    </article>
  </form>

  <article class="card" id="admin-md-fallback-panel" hidden style="margin-top:var(--space-lg);">
    <h2 class="h2">產生更新後的 Markdown</h2>
    <p class="muted">目前尚未設定 GitHub 寫入 API，請複製此 Markdown 到 Cursor 對應檔案後儲存。</p>
    <textarea id="admin-md-output" class="admin-template-box" rows="20" readonly></textarea>
    <div class="admin-actions" style="margin-top:var(--space-md);">
      <button type="button" class="btn btn--primary" id="admin-copy-md-output">複製 Markdown</button>
    </div>
  </article>
</section>`;
}
