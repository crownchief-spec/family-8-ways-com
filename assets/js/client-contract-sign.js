(function () {
  var root = document.querySelector('[data-client-portal]');
  if (!root) return;

  var slug = root.getAttribute('data-client-slug') || '';
  var localKey = 'family-contract-signed-' + slug;
  var deferredWrap = document.getElementById('portal-deferred-blocks');

  function revealDeferredBlocks() {
    if (deferredWrap) deferredWrap.hidden = false;
  }

  function tryRevealDeferredFromStorage() {
    if (!deferredWrap || !deferredWrap.hidden) return;
    try {
      if (localStorage.getItem(localKey)) revealDeferredBlocks();
    } catch (e) {}
  }

  tryRevealDeferredFromStorage();

  if (root.getAttribute('data-ready-to-share') !== '1') return;

  var clientName = root.getAttribute('data-client-name') || '';
  var lineUrl = root.getAttribute('data-line-url') || 'https://line.me/ti/p/0911252302';
  var photographerEmail = root.getAttribute('data-photographer-email') || 'crownchief@gmail.com';
  var contractVersion = root.getAttribute('data-contract-version') || 'family-contract-v2026-05';
  var form = document.getElementById('client-contract-form');
  var signedPanel = document.getElementById('signed-status-panel');
  var signedTimeEl = document.getElementById('signed-at-text');
  var signedImageEl = document.getElementById('signed-image');
  var clearBtn = document.getElementById('client-clear-signature');
  var confirmBtn = document.getElementById('client-confirm-signature');
  var submitBtn = document.getElementById('client-submit-contract');
  var signError = document.getElementById('client-signature-error');
  var formError = document.getElementById('client-form-error');
  var submitStatus = document.getElementById('client-submit-status');
  var downloadWrap = document.getElementById('client-download-wrap');
  var downloadBtn = document.getElementById('client-download-pdf');
  var fallbackPanel = document.getElementById('contract-email-fallback');
  var copyEmailBtn = document.getElementById('client-copy-photographer-email');
  var fallbackLine = document.getElementById('client-fallback-line');
  var signatureInput = document.getElementById('client-signature-image-base64');
  var signedAtInput = document.getElementById('client-signed-at');
  var signStateText = document.getElementById('client-sign-state');
  var canvas = document.getElementById('client-signature-canvas');
  var statusContract = document.getElementById('contract-status-tag');
  var statusPayment = document.getElementById('payment-status-pill');
  var signedDate = document.getElementById('client-signed-date');
  var paymentDateInput = document.getElementById('client-payment-date');
  var bankLast5Hint = document.getElementById('bank-last5-hint');
  var pdfContent = document.getElementById('contract-pdf-content');

  var signaturePad = null;
  var signatureConfirmed = false;
  var isSubmitting = false;
  var latestPdfBlob = null;
  var latestPdfFilename = '';
  /** 除錯模式：網址加 ?contract_debug=1 或 console 執行 localStorage.setItem('family_contract_debug','1') 後重整 */
  var CONTRACT_DEBUG = false;
  try {
    CONTRACT_DEBUG =
      /\bcontract_debug=1\b/.test(location.search) ||
      localStorage.getItem('family_contract_debug') === '1';
  } catch (e1) {}

  function dbg(step, detail) {
    if (!CONTRACT_DEBUG) return;
    var msg = String(step || '');
    if (detail !== undefined && detail !== null) msg += ' ' + String(detail);
    try {
      console.warn('[family-contract]', msg);
    } catch (e2) {}
    var panel = document.getElementById('client-contract-debug-panel');
    if (!panel) return;
    var line = document.createElement('div');
    line.style.cssText =
      'margin:3px 0;padding:4px 6px;background:rgba(255,255,255,0.06);border-radius:4px;word-break:break-all;';
    line.textContent =
      '[' +
      new Date().toLocaleTimeString('zh-TW', { hour12: false }) +
      '] ' +
      msg;
    panel.appendChild(line);
    var w = document.getElementById('client-contract-debug-wrap');
    if (w) w.scrollTop = w.scrollHeight;
  }

  function ensureDebugPanel() {
    if (!CONTRACT_DEBUG || document.getElementById('client-contract-debug-wrap')) return;
    var wrap = document.createElement('div');
    wrap.id = 'client-contract-debug-wrap';
    wrap.setAttribute('aria-live', 'polite');
    wrap.style.cssText =
      'position:fixed;left:0;right:0;bottom:0;max-height:42vh;overflow:auto;z-index:2147483647;' +
      'background:rgba(15,18,22,0.94);color:#c8e6c9;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;' +
      'font-size:11px;line-height:1.35;padding:10px 12px;border-top:3px solid #2e7d32;box-shadow:0 -4px 24px rgba(0,0,0,0.35);';
    wrap.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px;color:#81c784;">' +
      '<span><strong>合約除錯模式</strong>（僅你看得到）</span>' +
      '<button type="button" id="client-contract-debug-close" style="flex-shrink:0;padding:4px 10px;font:inherit;cursor:pointer;border-radius:6px;border:1px solid #555;background:#333;color:#eee;">關閉並移除 ?contract_debug</button></div>' +
      '<div style="color:#9ccc65;margin-bottom:8px;font-size:10px;">關閉後網址去掉 <code style="color:#ffcc80;">contract_debug=1</code>，或執行 <code style="color:#ffcc80;">localStorage.removeItem(\'family_contract_debug\')</code> 後重整。</div>' +
      '<div id="client-contract-debug-panel"></div>';
    document.body.appendChild(wrap);
    var closeBtn = document.getElementById('client-contract-debug-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        try {
          localStorage.removeItem('family_contract_debug');
        } catch (e3) {}
        try {
          var u = new URL(location.href);
          u.searchParams.delete('contract_debug');
          location.href = u.toString();
        } catch (e4) {
          wrap.remove();
        }
      });
    }
    dbg('除錯面板', '已啟用');
  }

  if (CONTRACT_DEBUG && root) {
    ensureDebugPanel();
    dbg(
      '載入',
      'slug=' +
        slug +
        ' readyToShare=' +
        (root.getAttribute('data-ready-to-share') || '') +
        ' libs: SignaturePad=' +
        !!window.SignaturePad +
        ' jspdf=' +
        !!(window.jspdf && window.jspdf.jsPDF) +
        ' html2canvas=' +
        !!window.html2canvas,
    );
  }

  function pad(v) {
    return String(v).padStart(2, '0');
  }

  function formatDate(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function nowText() {
    var d = new Date();
    return formatDate(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  function fileDate() {
    var d = new Date();
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Promise／fetch 無回應時避免按鈕永遠卡在「處理中」 */
  function withTimeout(promise, ms, errMsg) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error(errMsg || '處理逾時，請重新整理頁面後再試'));
        }, ms);
      }),
    ]);
  }

  function fetchWithTimeout(url, options, timeoutMs) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (ctrl) ctrl.abort();
    }, timeoutMs);
    var opts = ctrl ? Object.assign({}, options, { signal: ctrl.signal }) : options;
    var fetchPromise = fetch(url, opts).finally(function () {
      clearTimeout(timer);
    });
    if (ctrl) return fetchPromise;
    return Promise.race([
      fetchPromise,
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error('寄送請求逾時（請檢查網路或稍後再試）'));
        }, timeoutMs);
      }),
    ]);
  }

  function val(name) {
    var el = form.elements[name];
    if (!el) return '';
    return String(el.value || '').trim();
  }

  function valRadio(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? String(el.value || '').trim() : '';
  }

  function bool(name) {
    var el = form.elements[name];
    return !!(el && el.checked);
  }

  function paymentPillDisplay(statusVal) {
    if (statusVal === '已匯款訂金') return '客戶回報已匯款，待攝影師確認';
    if (statusVal === '尚未匯款，稍後會完成訂金') return '尚未匯款';
    if (statusVal === '想先確認合約內容，再完成訂金') return '尚未匯款（想先確認合約）';
    if (statusVal === '使用其他付款方式，已與攝影師確認') return '已與攝影師確認其他付款方式';
    return '訂金待確認';
  }

  function updatePaymentPill() {
    if (!statusPayment) return;
    statusPayment.textContent = '付款狀態：' + paymentPillDisplay(valRadio('paymentStatus'));
  }

  function bindPaymentRadios() {
    function onPaymentChange() {
      updatePaymentPill();
      if (valRadio('paymentStatus') === '已匯款訂金') revealDeferredBlocks();
      if (bankLast5Hint) {
        bankLast5Hint.hidden = valRadio('paymentStatus') !== '已匯款訂金';
        if (!bankLast5Hint.hidden) {
          bankLast5Hint.textContent =
            '若已匯款訂金，請填寫付款方式、金額與匯款帳號後四碼（或末五碼），方便攝影師對帳。';
        }
      }
    }
    form.querySelectorAll('input[name="paymentStatus"]').forEach(function (r) {
      r.addEventListener('change', onPaymentChange);
    });
    onPaymentChange();
  }

  function updateSubmitState(loading, done) {
    isSubmitting = loading;
    if (!submitBtn) return;
    submitBtn.disabled = loading || done;
    if (done) {
      submitBtn.textContent = '合約 PDF 已產生';
    } else if (loading) {
      submitBtn.textContent = '合約處理中，請稍候';
    } else {
      submitBtn.textContent = '送出合約並產生 PDF';
    }
  }

  function resolvedSignerDisplay() {
    var order = ['signerName', 'contactName', 'fatherName', 'motherName'];
    for (var i = 0; i < order.length; i++) {
      var v = val(order[i]);
      if (v) return v;
    }
    return '';
  }

  function anyNameFilled() {
    return !!(val('fatherName') || val('motherName') || val('contactName') || val('signerName'));
  }

  function initPad() {
    if (!window.SignaturePad || !canvas) {
      dbg('簽名區', 'SignaturePad 函式庫或 canvas 不存在');
      return false;
    }
    signaturePad = new window.SignaturePad(canvas, {
      minWidth: 0.7,
      maxWidth: 2.5,
      penColor: '#2c2a26',
      backgroundColor: 'rgb(255,255,255)',
    });

    function resize() {
      var ratio = Math.max(window.devicePixelRatio || 1, 1);
      var rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      canvas.getContext('2d').scale(ratio, ratio);
      signaturePad.clear();
      signatureInput.value = '';
      signatureConfirmed = false;
      signStateText.textContent = '尚未確認簽名';
    }

    window.addEventListener('resize', resize);
    resize();
    return true;
  }

  function collectData() {
    var signedAt = signedAtInput.value || nowText();
    var signedDateVal = val('signedDate');
    if (!signedDateVal) signedDateVal = formatDate(new Date());
    var signerDisplay = resolvedSignerDisplay();
    return {
      slug: slug,
      clientName: clientName,
      shootingDate: root.getAttribute('data-shooting-date') || '',
      shootingStartTime: root.getAttribute('data-start-time') || '',
      shootingEndTime: root.getAttribute('data-end-time') || '',
      packageName: root.getAttribute('data-package-name') || '',
      location: root.getAttribute('data-location') || '',
      pickup: root.getAttribute('data-pickup') || '',
      totalFee: root.getAttribute('data-total-fee') || '',
      deposit: root.getAttribute('data-deposit') || '',
      balance: root.getAttribute('data-balance') || '',
      deliverables: (document.querySelector('[data-deliverables-text]') || {}).textContent || '',
      paymentStatus: valRadio('paymentStatus'),
      paymentMethod: val('paymentMethod'),
      bankLast5: val('bankLast5'),
      paymentAmount: val('paymentAmount'),
      paymentDate: val('paymentDate'),
      paymentNote: val('paymentNote'),
      fatherName: val('fatherName'),
      motherName: val('motherName'),
      contactName: val('contactName'),
      phone: val('phone'),
      customerEmail: val('customerEmail'),
      lineName: val('lineName'),
      clientAdultCount: val('clientAdultCount'),
      clientChildCount: val('clientChildCount'),
      photographerAdultCount: root.getAttribute('data-photographer-adult') || '',
      photographerChildCount: root.getAttribute('data-photographer-child') || '',
      childrenInfo: val('childrenInfo'),
      familyIntro: val('familyIntro'),
      desiredShots: val('desiredShots'),
      specialNotes: val('specialNotes'),
      signerName: val('signerName'),
      signerDisplay: signerDisplay,
      signedDate: signedDateVal,
      signedAt: signedAt,
      signatureDataUrl: signatureInput.value,
      contractVersion: contractVersion,
    };
  }

  function setSignedPanel(data) {
    signedPanel.hidden = false;
    signedTimeEl.textContent = data.signedAt || '';
    if (data.signatureDataUrl) signedImageEl.src = data.signatureDataUrl;
  }

  function validEmailFormat(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  /** 電話、LINE、Email 至少一種（Email 選填；有填則檢查格式） */
  function hasAnyContactChannel() {
    return !!(val('phone') || val('lineName') || val('customerEmail'));
  }

  function validate() {
    formError.hidden = true;
    signError.hidden = true;

    if (!hasAnyContactChannel()) {
      dbg('驗證失敗', '未填任何聯絡方式');
      formError.hidden = false;
      formError.textContent =
        '請至少填寫一種聯絡方式：聯絡電話、LINE 或 Email（可擇一；Email 非必填）。';
      return false;
    }
    if (val('customerEmail') && !validEmailFormat(val('customerEmail'))) {
      dbg('驗證失敗', 'Email 格式錯誤');
      formError.hidden = false;
      formError.textContent = 'Email 格式不正確，若不需要留 Email 可清空欄位。';
      return false;
    }
    if (!anyNameFilled()) {
      dbg('驗證失敗', '姓名／稱呼未填');
      formError.hidden = false;
      formError.textContent =
        '請至少填寫一項稱呼或姓名（主要聯絡人、爸爸／媽媽稱呼或簽名人姓名擇一即可）';
      return false;
    }
    if (!signatureConfirmed || !signatureInput.value) {
      dbg('驗證失敗', '簽名未確認');
      signError.hidden = false;
      formError.hidden = false;
      formError.textContent = '請先完成電子簽名後再送出合約。';
      return false;
    }
    dbg('驗證通過', '');
    return true;
  }

  /** 簽名 PNG 常為高解析 canvas，縮小後再嵌入 PDF 可減輕檔案與記憶體 */
  function shrinkSignatureDataUrlForPdf(dataUrl, maxWidthPx) {
    return new Promise(function (resolve) {
      var url = String(dataUrl || '');
      if (!url || !/^data:image\/(png|jpeg|jpg);base64,/i.test(url)) {
        resolve(url);
        return;
      }
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth || img.width;
        var h = img.naturalHeight || img.height;
        if (!w || !h || w <= maxWidthPx) {
          resolve(url);
          return;
        }
        var nw = maxWidthPx;
        var nh = Math.max(1, Math.round(h * (nw / w)));
        var c = document.createElement('canvas');
        c.width = nw;
        c.height = nh;
        var ctx = c.getContext('2d');
        if (!ctx) {
          resolve(url);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, nw, nh);
        ctx.drawImage(img, 0, 0, nw, nh);
        resolve(c.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = function () {
        resolve(url);
      };
      img.src = url;
    });
  }

  function pdfHtml(data) {
    function row(label, value) {
      return (
        '<tr><td style="padding:6px 8px;border:1px solid #ddd;width:220px;font-weight:600;">' +
        escapeHtml(label) +
        '</td><td style="padding:6px 8px;border:1px solid #ddd;">' +
        escapeHtml(value || '') +
        '</td></tr>'
      );
    }
    return (
      '<div style="font-family:\'PingFang TC\',\'Microsoft JhengHei\',\'Noto Sans TC\',Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#111;padding:12px 16px 24px;box-sizing:border-box;">' +
      '<h1 style="font-size:26px;margin:0 0 14px;">小巴老師親子寫真預約確認書</h1>' +
      '<h2 style="font-size:18px;margin:18px 0 8px;">預約資訊</h2><table style="border-collapse:collapse;width:100%;">' +
      row('客戶名稱', data.clientName) +
      row('拍攝日期', data.shootingDate) +
      row('拍攝時間', [data.shootingStartTime, data.shootingEndTime].filter(Boolean).join(' - ')) +
      row('拍攝方案', data.packageName) +
      row('拍攝地點', data.location) +
      row('是否含接送', data.pickup) +
      row('總費用', data.totalFee ? 'NT$' + Number(data.totalFee).toLocaleString('zh-TW') : '') +
      row('訂金', data.deposit ? 'NT$' + Number(data.deposit).toLocaleString('zh-TW') : '') +
      row('餘款', data.balance ? 'NT$' + Number(data.balance).toLocaleString('zh-TW') : '') +
      row('成品內容', data.deliverables) +
      '</table>' +
      '<h2 style="font-size:18px;margin:18px 0 8px;">費用與訂金匯款</h2><table style="border-collapse:collapse;width:100%;">' +
      row('攝影總費用', data.totalFee ? 'NT$' + Number(data.totalFee).toLocaleString('zh-TW') : '') +
      row('訂金金額', data.deposit ? 'NT$' + Number(data.deposit).toLocaleString('zh-TW') : '') +
      row('餘款', data.balance ? 'NT$' + Number(data.balance).toLocaleString('zh-TW') : '') +
      row('客戶目前付款狀態', data.paymentStatus) +
      row('付款方式', data.paymentMethod) +
      row('匯款帳號後四碼／末五碼', data.bankLast5) +
      row('付款金額', data.paymentAmount ? 'NT$' + Number(data.paymentAmount).toLocaleString('zh-TW') : '') +
      row('付款日期', data.paymentDate) +
      row('付款備註', data.paymentNote) +
      '</table>' +
      '<p style="margin:8px 0 0;font-size:13px;color:#333;">付款提醒：完成訂金付款後，攝影師才會正式保留檔期。</p>' +
      '<h2 style="font-size:18px;margin:18px 0 8px;">客戶補充資料</h2><table style="border-collapse:collapse;width:100%;">' +
      row('爸爸稱呼', data.fatherName) +
      row('媽媽稱呼', data.motherName) +
      row('主要聯絡人', data.contactName) +
      row('電話', data.phone) +
      row('Email', data.customerEmail) +
      row('LINE', data.lineName) +
      row('客戶確認入鏡大人人數', data.clientAdultCount) +
      row('客戶確認入鏡小孩人數', data.clientChildCount) +
      row('攝影師預設入鏡大人', data.photographerAdultCount) +
      row('攝影師預設入鏡小孩', data.photographerChildCount) +
      row('小朋友年齡與稱呼', data.childrenInfo) +
      row('家庭介紹', data.familyIntro) +
      row('特別想拍的畫面', data.desiredShots) +
      row('注意事項', data.specialNotes) +
      '</table>' +
      '<p style="margin:12px 0 0;font-size:13px;color:#333;">客戶已閱讀本頁預約與補充資料，並以下方電子簽名確認。</p>' +
      '<h2 style="font-size:18px;margin:18px 0 8px;">電子簽名</h2>' +
      '<p>簽名人姓名：' +
      escapeHtml(data.signerDisplay || data.signerName) +
      '</p>' +
      '<p>簽署日期：' +
      escapeHtml(data.signedDate) +
      '</p>' +
      '<p>簽署時間：' +
      escapeHtml(data.signedAt) +
      '</p>' +
      '<img src="' +
      escapeHtml(data.signatureDataUrl) +
      '" style="width:320px;height:auto;border:1px solid #ddd;padding:4px;" alt="簽名" />' +
      '<h2 style="font-size:18px;margin:18px 0 8px;">攝影師聯絡資訊</h2>' +
      '<p>小巴老師｜親子寫真<br>Line／電話：0911-252-302<br>WhatsApp：+886 911252302<br>Email：crownchief@gmail.com</p>' +
      '</div>'
    );
  }

  function safePdfClientPart(name) {
    var s = String(name || 'client').trim().replace(/\s+/g, '-');
    s = s.replace(/[\\/:*?"<>|]/g, '');
    if (!s) s = 'client';
    return s;
  }

  /** 與 #contract-pdf-content 寬度一致，供截圖版面 */
  var PDF_CAPTURE_WIDTH_PX = 820;

  var html2canvasLoadPromise = null;
  function ensureHtml2Canvas() {
    if (typeof window.html2canvas === 'function') return Promise.resolve(window.html2canvas);
    if (html2canvasLoadPromise) return html2canvasLoadPromise;
    html2canvasLoadPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      s.onload = function () {
        if (typeof window.html2canvas === 'function') resolve(window.html2canvas);
        else reject(new Error('html2canvas 未掛載'));
      };
      s.onerror = function () {
        reject(new Error('無法載入 html2canvas，請檢查網路後重新整理'));
      };
      document.head.appendChild(s);
    });
    return html2canvasLoadPromise;
  }

  function waitForImages(container) {
    var imgs = container.querySelectorAll('img');
    return Promise.all(
      Array.prototype.map.call(imgs, function (img) {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise(function (resolve) {
          img.onload = function () {
            resolve();
          };
          img.onerror = function () {
            resolve();
          };
        });
      }),
    );
  }

  async function generatePdf(data) {
    dbg(
      'PDF',
      '開始 generatePdf（html2canvas 擷取 DOM → jsPDF 影像；中文由瀏覽器字型繪製，非向量選字）',
    );
    var JsPdfCtor =
      window.jspdf && typeof window.jspdf.jsPDF === 'function'
        ? window.jspdf.jsPDF
        : typeof window.jsPDF === 'function'
          ? window.jsPDF
          : null;
    if (!JsPdfCtor) {
      dbg('PDF 錯誤', 'jspdf / jsPDF 不存在於 window');
      throw new Error('jsPDF 未載入，請重新整理頁面後再試');
    }

    var sigForPdf = await shrinkSignatureDataUrlForPdf(data.signatureDataUrl, 560);
    if (sigForPdf !== data.signatureDataUrl) {
      dbg('PDF', '簽名圖已縮小以利嵌入 PDF');
    }
    var d = Object.assign({}, data, { signatureDataUrl: sigForPdf });

    if (!pdfContent) {
      throw new Error('PDF 容器遺失，無法產生檔案');
    }

    pdfContent.innerHTML = pdfHtml(d);
    await waitForImages(pdfContent);
    await new Promise(function (resolve) {
      requestAnimationFrame(function () {
        requestAnimationFrame(resolve);
      });
    });

    var h2c = await ensureHtml2Canvas();

    var shell = document.createElement('div');
    shell.setAttribute('aria-hidden', 'true');
    shell.style.cssText =
      'position:absolute;left:-9999px;top:0;width:' +
      PDF_CAPTURE_WIDTH_PX +
      'px;box-sizing:border-box;background:#fff;color:#111;padding:24px;z-index:2147483000;opacity:1;visibility:visible;';
    shell.innerHTML = pdfContent.innerHTML;
    document.body.appendChild(shell);
    await waitForImages(shell);

    var canvas;
    var scale = 2;
    try {
      for (var attempt = 0; attempt < 2; attempt++) {
        try {
          canvas = await h2c(shell, {
            scale: scale,
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#ffffff',
            logging: false,
            width: PDF_CAPTURE_WIDTH_PX,
            windowWidth: PDF_CAPTURE_WIDTH_PX,
          });
          break;
        } catch (capErr) {
          dbg('PDF', 'html2canvas 嘗試 scale=' + scale + ' 失敗：' + String(capErr && capErr.message));
          scale = 1;
          if (attempt === 1) throw capErr;
        }
      }
    } finally {
      shell.remove();
    }

    if (!canvas || !canvas.width) {
      throw new Error('無法繪製合約預覽，請重新整理後再試');
    }

    dbg('PDF', 'canvas ' + canvas.width + '×' + canvas.height + ' px');

    var doc = new JsPdfCtor({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
    var pageW = doc.internal.pageSize.getWidth();
    var pageH = doc.internal.pageSize.getHeight();
    var imgW = pageW;
    var imgH = (canvas.height * imgW) / canvas.width;
    var imgData = canvas.toDataURL('image/jpeg', 0.92);

    var heightLeft = imgH;
    var position = 0;
    doc.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0.5) {
      position = heightLeft - imgH;
      doc.addPage();
      doc.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
      heightLeft -= pageH;
    }

    var filename =
      'contract-' +
      slug +
      '-' +
      safePdfClientPart(d.signerDisplay || d.customerEmail || clientName) +
      '-' +
      fileDate() +
      '.pdf';
    var blob = doc.output('blob');
    dbg('PDF', '影像 PDF 完成，約 ' + Math.round(blob.size / 1024) + ' KB');
    return { blob: blob, filename: filename };
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onloadend = function () {
        var value = String(reader.result || '');
        resolve(value.split(',')[1] || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function downloadPdf() {
    if (!latestPdfBlob) return;
    var url = URL.createObjectURL(latestPdfBlob);
    var a = document.createElement('a');
    a.href = url;
    a.download = latestPdfFilename || 'contract.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function sendContract(data, pdf) {
    dbg('寄信', 'blob → base64…');
    var base64 = await blobToBase64(pdf.blob);
    dbg('寄信', 'base64 長度 ' + base64.length + ' 字元');
    /** 寄給攝影師的信件：後端依欄位組主旨與長文內文（供 Gmail 搜尋）；不上傳簽名圖 base64 減少 JSON 體積 */
    var snapshot = {};
    for (var k in data) {
      if (!Object.prototype.hasOwnProperty.call(data, k)) continue;
      if (k === 'signatureDataUrl') continue;
      snapshot[k] = data[k];
    }
    var body = Object.assign({}, snapshot, {
      photographerEmail: photographerEmail,
      pdfBase64: base64,
      pdfFilename: pdf.filename,
    });
    var bodyStr = JSON.stringify(body);
    dbg('寄信', 'POST /api/send-contract，JSON 約 ' + Math.round(bodyStr.length / 1024) + ' KB');
    var res = await fetchWithTimeout(
      '/api/send-contract',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
      },
      120000,
    );
    dbg('寄信', 'HTTP 狀態 ' + res.status);
    var json = await res.json().catch(function () {
      return { ok: false, message: '伺服器回應格式錯誤' };
    });
    if (!res.ok || !json.ok) {
      dbg('寄信失敗', (json && json.message) || res.statusText || '');
      var err = new Error(json.message || 'Email 寄送失敗');
      err._payload = json;
      err._status = res.status;
      throw err;
    }
    dbg('寄信', 'API 回應成功');
    return json;
  }

  /**
   * 主流程以「下載 PDF」為準；寄信僅嘗試傳 PDF 備份給攝影師，失敗不阻擋成功狀態。
   */
  function showContractFlowComplete(data, outcome) {
    var sendResult = outcome.sendResult;
    var mailErr = outcome.mailError;

    if (downloadWrap) downloadWrap.hidden = false;

    if (statusContract) {
      statusContract.textContent = '合約狀態：PDF 已產生（已下載）';
    }

    if (mailErr) {
      if (fallbackPanel) fallbackPanel.hidden = false;
      if (submitStatus) {
        submitStatus.textContent =
          '合約 PDF 已下載到您的裝置。攝影師備份信未能自動送出，請將此 PDF 傳給小巴老師（Line／Email），以免漏單。';
      }
      return;
    }

    if (fallbackPanel) fallbackPanel.hidden = true;

    if (submitStatus) {
      var base =
        '合約 PDF 已下載到您的裝置，請自行保留檔案。若瀏覽器未跳出下載，可按下方「下載合約 PDF」。';
      if (sendResult && sendResult.skipped) {
        submitStatus.textContent = base;
      } else if (sendResult && sendResult.ok && sendResult.sentTo && sendResult.sentTo.length) {
        submitStatus.textContent =
          base + ' 系統已將同一份 PDF 副本寄至攝影師信箱備份。';
      } else {
        submitStatus.textContent = base;
      }
    }
  }

  function init() {
    if (!form) {
      dbg('init', '找不到表單 #client-contract-form');
      return;
    }
    if (!initPad()) return;
    dbg('init', '簽名區與表單已綁定');
    bindPaymentRadios();
    if (signedDate) signedDate.value = formatDate(new Date());
    if (paymentDateInput) paymentDateInput.value = formatDate(new Date());
    if (signedAtInput) signedAtInput.value = nowText();
    if (fallbackLine) fallbackLine.href = lineUrl;

    clearBtn.addEventListener('click', function () {
      signaturePad.clear();
      signatureInput.value = '';
      signatureConfirmed = false;
      signStateText.textContent = '尚未確認簽名';
      signError.hidden = true;
    });

    confirmBtn.addEventListener('click', function () {
      if (signaturePad.isEmpty()) {
        signError.hidden = false;
        signStateText.textContent = '請先簽名';
        return;
      }
      signatureInput.value = signaturePad.toDataURL('image/png');
      signatureConfirmed = true;
      signedAtInput.value = nowText();
      signStateText.textContent = '簽名已確認';
      signError.hidden = true;
    });

    if (copyEmailBtn) {
      copyEmailBtn.addEventListener('click', function () {
        var em = photographerEmail;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(em).catch(function () {});
        }
      });
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (form.dataset.contractComplete === '1') return;
      if (isSubmitting) return;
      if (!validate()) return;
      dbg('送出', '表單送出開始');
      updateSubmitState(true, false);
      formError.hidden = true;
      if (fallbackPanel) fallbackPanel.hidden = true;
      if (submitStatus) submitStatus.textContent = '正在產生 PDF…';

      try {
        var data = collectData();
        var pdf = await generatePdf(data);
        latestPdfBlob = pdf.blob;
        latestPdfFilename = pdf.filename;

        if (submitStatus) submitStatus.textContent = 'PDF 已產生，正在下載…';
        downloadPdf();

        if (submitStatus) submitStatus.textContent = '正在傳送攝影師備份（可略過）…';

        var sendResult = null;
        var mailError = null;
        try {
          sendResult = await sendContract(data, pdf);
        } catch (sendErr) {
          mailError = sendErr && sendErr.message ? sendErr.message : String(sendErr);
          dbg('攝影師備份信未完成', mailError);
        }

        var photographerBackupSent = !!(sendResult && sendResult.ok && !sendResult.skipped);

        try {
          localStorage.setItem(
            localKey,
            JSON.stringify({ data: data, emailed: photographerBackupSent }),
          );
        } catch (quotaErr) {
          try {
            var slim = Object.assign({}, data);
            slim.signatureDataUrl = '';
            localStorage.setItem(
              localKey,
              JSON.stringify({ data: slim, emailed: photographerBackupSent }),
            );
          } catch (_) {}
        }
        revealDeferredBlocks();
        setSignedPanel(data);
        updateSubmitState(false, true);

        showContractFlowComplete(data, { sendResult: sendResult, mailError: mailError });
        dbg(
          '流程結束',
          photographerBackupSent
            ? 'PDF 已下載且攝影師備份信已送出'
            : mailError
              ? 'PDF 已下載；攝影師備份信失敗'
              : 'PDF 已下載（未寄備份或未設定 API）',
        );
        form.dataset.contractComplete = '1';
      } catch (err) {
        formError.hidden = false;
        var msg = String(err && err.message ? err.message : '處理失敗');
        if (err && err.name === 'AbortError') {
          msg = '寄送合約逾時（網路或伺服器忙碌），請稍後再試或先下載 PDF。';
        }
        dbg('發生錯誤', msg);
        if (err && err.stack) {
          dbg('堆疊', String(err.stack).split('\n').slice(0, 4).join(' ← '));
        }
        formError.textContent = msg;
        updateSubmitState(false, false);
      }
    });

    if (downloadBtn) {
      downloadBtn.addEventListener('click', function () {
        downloadPdf();
      });
    }
  }

  init();
})();
