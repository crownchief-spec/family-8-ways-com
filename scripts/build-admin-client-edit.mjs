import { escapeHtml } from './render.mjs';

function v(val) {
  return escapeHtml(val == null ? '' : String(val));
}

/** 將「中文說明 englishKey」拆成兩行顯示，提升可讀性 */
function labelHtml(fullLabel) {
  const s = String(fullLabel);
  const m = s.match(/^(.+?)\s+([a-zA-Z][a-zA-Z0-9_]*)$/);
  if (!m) {
    return `<span class="admin-field-label">${escapeHtml(s)}</span>`;
  }
  return `<span class="admin-field-label">${escapeHtml(m[1].trim())}<span class="admin-field-key">${escapeHtml(m[2])}</span></span>`;
}

function textInput(label, name, val, extra = '') {
  return `<label class="field admin-field">${labelHtml(label)}<input type="text" name="${escapeHtml(name)}" value="${v(val)}" ${extra}/></label>`;
}

function numberInput(label, name, val) {
  return `<label class="field admin-field">${labelHtml(label)}<input type="text" name="${escapeHtml(name)}" value="${v(val)}" inputmode="decimal" /></label>`;
}

function textareaField(label, name, val, rows = 4) {
  return `<label class="field admin-field admin-field--block">${labelHtml(label)}<textarea name="${escapeHtml(name)}" rows="${rows}">${v(val)}</textarea></label>`;
}

function checkField(label, name, checked) {
  const s = String(label);
  const m = s.match(/^(.+?)\s+([a-zA-Z][a-zA-Z0-9_]*)$/);
  const zh = m ? m[1].trim() : s;
  const key = m ? m[2] : '';
  const inner =
    key ?
      `${escapeHtml(zh)}<span class="admin-field-key">${escapeHtml(key)}</span>` :
      `${escapeHtml(s)}`;
  return `<label class="check-row admin-check"><input type="checkbox" name="${escapeHtml(name)}" value="true"${checked ? ' checked' : ''}/><span class="admin-check-text">${inner}</span></label>`;
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

  return `<nav class="container section admin-edit-breadcrumb"><div class="muted"><a href="/admin/">後台</a> <span aria-hidden="true">/</span> <a href="/admin/clients/">客戶案件</a> <span aria-hidden="true">/</span> <span>編輯</span></div></nav>
<section class="admin-hero admin-edit-hero"><div class="admin-wrap admin-edit-hero-inner">
  <p class="admin-edit-meta muted">檔案：<code>${v(c._mdRelPath || `content/clients/${c.slug}.md`)}</code></p>
  <h1 class="h1 admin-edit-title">編輯客戶案件｜${v(c.clientName)}</h1>
  <p class="lead admin-edit-lead">以下為攝影師維護欄位；儲存後會組成客戶 Markdown。請將 <strong>readyToShare</strong> 設為可分享後，再把客戶專屬連結傳給客人。</p>
  <p class="admin-warning" id="admin-edit-guard-msg"${c.readyToShare ? ' hidden' : ''}>此案件尚未標記為可分享，客戶頁將不開放填寫表單。</p>
</div></section>

<section class="container section admin-wrap admin-edit-page">
  <article class="card card--flat admin-edit-banner" id="admin-github-banner" hidden>
    <p class="admin-edit-banner__title">手動更新 Markdown 模式</p>
    <p class="muted admin-edit-banner__body">若 Cloudflare 未設定 <code>GITHUB_TOKEN</code>、<code>GITHUB_OWNER</code>、<code>GITHUB_REPO</code>，或正在本機預覽靜態檔，按下「儲存」會<strong>直接產生完整 Markdown</strong>；請複製後貼回專案對應的 <code>.md</code> 檔並存檔，再執行建置／部署。</p>
  </article>
  <div class="admin-edit-toolbar">
    <button type="button" class="btn btn--primary" id="admin-save-md">儲存客戶 MD</button>
    <a class="btn btn--secondary" href="/clients/${v(c.slug)}/" target="_blank" rel="noopener noreferrer">預覽客戶頁</a>
    <button type="button" class="btn btn--secondary" id="admin-copy-client-url" data-client-url="${v(clientUrl)}">複製客戶專屬連結</button>
    <a class="btn btn--ghost" href="/admin/clients/">回到客戶列表</a>
  </div>
  <p class="muted admin-save-status-line" id="admin-save-status"></p>

  <form id="admin-client-edit-form" class="admin-edit-form" data-md-path="${v(c._mdRelPath || `content/clients/${c.slug}.md`)}" data-slug="${v(c.slug)}">
    <article class="card admin-edit-card" id="edit-section-basic"><h2 class="h2 admin-edit-section-title"><span class="admin-edit-section-num">1</span>案件基本資料</h2>
      <div class="portal-grid-2 admin-edit-grid">
        ${textInput('標題 title', 'title', c.title)}
        ${textInput('客戶名稱 clientName', 'clientName', c.clientName)}
        ${textInput('客戶代稱 clientAlias', 'clientAlias', c.clientAlias)}
        ${textInput('案件狀態 status', 'status', c.status)}
        ${textInput('slug（請謹慎修改）', 'slug', c.slug, 'readonly')}
      </div>
    </article>

    <article class="card admin-edit-card" id="edit-section-shoot"><h2 class="h2 admin-edit-section-title"><span class="admin-edit-section-num">2</span>拍攝資訊</h2>
      <div class="portal-grid-2 admin-edit-grid">
        ${textInput('拍攝日期 shootingDate', 'shootingDate', c.shootingDate)}
        ${textInput('星期 shootingWeekday', 'shootingWeekday', c.shootingWeekday)}
        ${textInput('開始時間 shootingStartTime', 'shootingStartTime', c.shootingStartTime)}
        ${textInput('結束時間 shootingEndTime', 'shootingEndTime', c.shootingEndTime)}
        ${textInput('時長 duration', 'duration', c.duration)}
        ${textInput('行程／區域 location', 'location', c.location)}
        ${textInput('拍攝地點 meetingPoint', 'meetingPoint', c.meetingPoint)}
        ${textInput('是否含接送 pickup', 'pickup', c.pickup)}
        ${textareaField('攝影備註 transportationNote', 'transportationNote', c.transportationNote, 3)}
      </div>
    </article>

    <article class="card admin-edit-card" id="edit-section-fee"><h2 class="h2 admin-edit-section-title"><span class="admin-edit-section-num">3</span>方案與費用</h2>
      <div class="portal-grid-2 admin-edit-grid">
        ${textInput('拍攝類型 serviceType', 'serviceType', c.serviceType)}
        ${textInput('方案分類 packageCategory', 'packageCategory', c.packageCategory)}
        ${textInput('方案名稱 packageName', 'packageName', c.packageName)}
        ${numberInput('總費用 totalFee', 'totalFee', c.totalFee)}
        ${numberInput('訂金 deposit', 'deposit', c.deposit)}
        ${numberInput('餘款 balance', 'balance', c.balance)}
        ${textareaField('付款備註（攝影師）paymentNoteFromAdmin', 'paymentNoteFromAdmin', c.paymentNoteFromAdmin, 3)}
      </div>
    </article>

    <article class="card admin-edit-card" id="edit-section-deliver"><h2 class="h2 admin-edit-section-title"><span class="admin-edit-section-num">4</span>成品內容</h2>
      <div class="admin-edit-stack">
      ${textareaField('成品總述 deliverables', 'deliverables', c.deliverables, 4)}
      ${textareaField('照片成品 photoDeliverables', 'photoDeliverables', c.photoDeliverables, 3)}
      ${textareaField('影片成品 videoDeliverables', 'videoDeliverables', c.videoDeliverables, 3)}
      </div>
      <div class="admin-edit-checkgroup">
      ${checkField('是否含 MV mvIncluded', 'mvIncluded', !!c.mvIncluded)}
      ${checkField('是否含空拍 droneIncluded', 'droneIncluded', !!c.droneIncluded)}
      ${checkField('是否含水中攝影 underwaterIncluded', 'underwaterIncluded', !!c.underwaterIncluded)}
      </div>
      ${textareaField('特殊約定 specialRequests（每行一項）', 'specialRequestsLines', arrToLines(spec), 4)}
    </article>

    <article class="card admin-edit-card" id="edit-section-contract"><h2 class="h2 admin-edit-section-title"><span class="admin-edit-section-num">5</span>合約設定</h2>
      <div class="portal-grid-2 admin-edit-grid">
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

    <article class="card admin-edit-card" id="edit-section-delivery"><h2 class="h2 admin-edit-section-title"><span class="admin-edit-section-num">6</span>作品交件</h2>
      <div class="portal-grid-2 admin-edit-grid">
        ${textInput('交件狀態 deliveryStatus', 'deliveryStatus', c.deliveryStatus)}
        ${textInput('雲端照片連結 driveFolderUrl', 'driveFolderUrl', c.driveFolderUrl)}
        ${textInput('影片連結 videoUrl', 'videoUrl', c.videoUrl)}
        ${textareaField('交件備註 deliveryNote', 'deliveryNote', c.deliveryNote, 3)}
      </div>
    </article>

    <article class="card admin-edit-card" id="edit-section-privacy"><h2 class="h2 admin-edit-section-title"><span class="admin-edit-section-num">7</span>隱私與公開</h2>
      <div class="portal-grid-2 admin-edit-grid admin-edit-grid--checks">
        ${textInput('隱私 privacy', 'privacy', c.privacy)}
        ${checkField('noindex', 'noindex', c.noindex !== false)}
        ${checkField('顯示於客戶列表說明 showInClientList', 'showInClientList', !!c.showInClientList)}
        ${checkField('公開作品集 publicPortfolio', 'publicPortfolio', !!c.publicPortfolio)}
        ${checkField('僅後台 adminOnly', 'adminOnly', !!c.adminOnly)}
      </div>
    </article>

    <article class="card admin-edit-card" id="edit-section-extra"><h2 class="h2 admin-edit-section-title"><span class="admin-edit-section-num">8</span>人數與其他</h2>
      <div class="portal-grid-2 admin-edit-grid">
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

    <article class="card admin-edit-card" id="edit-section-internal"><h2 class="h2 admin-edit-section-title"><span class="admin-edit-section-num">9</span>內部備註</h2>
      ${textareaField('內部備註 internalNote', 'internalNote', c.internalNote, 5)}
    </article>

    <article class="card admin-edit-card" id="edit-section-body"><h2 class="h2 admin-edit-section-title">標籤與內文</h2>
      <p class="muted admin-edit-section-intro">Markdown <code>body</code>：會顯示在客戶頁下方故事區（若有使用）。</p>
      <div class="admin-edit-stack">
      ${textareaField('標籤 tags（每行一項）', 'tagsLines', arrToLines(tags), 4)}
      ${textareaField('相簿網址 gallery（每行一個網址）', 'galleryLines', arrToLines(gal), 3)}
      ${textareaField('內文 bodyMd', 'bodyMd', c.bodyMd || '', 16)}
      </div>
    </article>
  </form>

  <article class="card admin-edit-fallback" id="admin-md-fallback-panel" hidden>
    <h2 class="h2 admin-edit-fallback-title">複製以下 Markdown</h2>
    <p class="muted">請全選複製，貼到本專案 <code id="admin-md-path-hint"></code>（或 Cursor 中對應檔案）後存檔。</p>
    <textarea id="admin-md-output" class="admin-template-box admin-md-output" rows="20" readonly></textarea>
    <div class="admin-actions admin-edit-fallback-actions">
      <button type="button" class="btn btn--primary" id="admin-copy-md-output">複製 Markdown</button>
    </div>
  </article>
</section>`;
}
