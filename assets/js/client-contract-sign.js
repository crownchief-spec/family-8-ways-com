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
  /** 首次產生 PDF 時從 CDN 下載 Noto Sans TC（約 5.4MB），存成 base64 後本次分頁重複使用 */
  var notoFontBase64Cache = null;

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
        ' autoTable=' +
        !!(function () {
          try {
            var Ctor = window.jspdf && window.jspdf.jsPDF;
            if (!Ctor) return false;
            var p = new Ctor({ unit: 'mm', format: 'a4' });
            return typeof p.autoTable === 'function';
          } catch (e) {
            return false;
          }
        })(),
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

  function validate() {
    formError.hidden = true;
    signError.hidden = true;

    if (!val('customerEmail')) {
      dbg('驗證失敗', '未填 Email');
      formError.hidden = false;
      formError.textContent = '請填寫 Email';
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
      '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#111;padding:12px 16px 24px;box-sizing:border-box;">' +
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

  var NOTO_SANS_TC_OTF_URL =
    'https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@Sans2.004/Sans/SubsetOTF/TC/NotoSansTC-Regular.otf';

  function arrayBufferToBase64(ab) {
    return new Promise(function (resolve, reject) {
      var blob = new Blob([ab], { type: 'application/octet-stream' });
      var fr = new FileReader();
      fr.onload = function () {
        var s = String(fr.result || '');
        var i = s.indexOf(',');
        resolve(i >= 0 ? s.substring(i + 1) : s);
      };
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  }

  async function ensureNotoChineseFont(doc) {
    if (!notoFontBase64Cache) {
      dbg('PDF', '下載 PDF 繁體字型 Noto Sans TC（約 5.4MB，僅首次）…');
      var res = await withTimeout(
        fetch(NOTO_SANS_TC_OTF_URL, { mode: 'cors', credentials: 'omit' }),
        180000,
        '字型下載逾時，請檢查網路後再試',
      );
      if (!res.ok) throw new Error('無法下載 PDF 中文字型（HTTP ' + res.status + '）');
      var ab = await res.arrayBuffer();
      notoFontBase64Cache = await arrayBufferToBase64(ab);
      dbg('PDF', '字型已載入並快取於記憶體（本分頁不重複下載）');
    }
    doc.addFileToVFS('NotoSansTC-Regular.otf', notoFontBase64Cache);
    doc.addFont('NotoSansTC-Regular.otf', 'NotoSansTC', 'normal');
    doc.setFont('NotoSansTC', 'normal');
  }

  function formatNtd(v) {
    if (v === '' || v == null) return '';
    var n = Number(v);
    if (!isFinite(n)) return String(v);
    return 'NT$' + n.toLocaleString('zh-TW');
  }

  function pdfSectionHeading(doc, y, margin, title) {
    var pageH = doc.internal.pageSize.getHeight();
    if (y > pageH - 35) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('NotoSansTC', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(String(title || ''), margin, y);
    return y + 7;
  }

  function pdfTwoColumnTable(doc, startY, margin, rows) {
    var body = rows.map(function (r) {
      return [String(r[0] || ''), r[1] == null ? '' : String(r[1])];
    });
    doc.autoTable({
      startY: startY,
      margin: { left: margin, right: margin },
      tableWidth: doc.internal.pageSize.getWidth() - margin * 2,
      body: body,
      theme: 'grid',
      styles: {
        font: 'NotoSansTC',
        fontStyle: 'normal',
        fontSize: 9,
        cellPadding: 1.4,
        valign: 'top',
        overflow: 'linebreak',
        lineColor: [210, 210, 210],
        lineWidth: 0.05,
      },
      columnStyles: {
        0: { cellWidth: 46 },
        1: { cellWidth: 'auto' },
      },
    });
    return doc.lastAutoTable.finalY + 4;
  }

  function pdfSignatureBlock(doc, data, margin, y) {
    return new Promise(function (resolve) {
      var pageH = doc.internal.pageSize.getHeight();
      doc.setFont('NotoSansTC', 'normal');
      doc.setFontSize(10);
      if (y > pageH - 35) {
        doc.addPage();
        y = margin;
      }
      doc.text('簽名人姓名：' + String(data.signerDisplay || data.signerName || ''), margin, y);
      y += 6;
      doc.text('簽署日期：' + String(data.signedDate || ''), margin, y);
      y += 6;
      doc.text('簽署時間：' + String(data.signedAt || ''), margin, y);
      y += 8;

      var url = data.signatureDataUrl || '';
      if (!url) {
        resolve(y);
        return;
      }
      var img = new Image();
      img.onload = function () {
        var maxW = 72;
        var w = maxW;
        var h = (img.height / img.width) * w;
        var yy = y;
        if (yy + h > pageH - margin) {
          doc.addPage();
          yy = margin;
        }
        var fmt = /^data:image\/png/i.test(url) ? 'PNG' : 'JPEG';
        try {
          doc.addImage(url, fmt, margin, yy, w, h);
        } catch (imgErr) {
          dbg('PDF', '簽名圖嵌入失敗，略過圖檔');
        }
        resolve(yy + h + 6);
      };
      img.onerror = function () {
        resolve(y);
      };
      img.src = url;
    });
  }

  async function generatePdf(data) {
    dbg('PDF', '開始 generatePdf（jsPDF 向量文字＋表格，無截圖）');
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

    var probe = new JsPdfCtor({ unit: 'mm', format: 'a4' });
    if (typeof probe.autoTable !== 'function') {
      dbg('PDF 錯誤', 'jspdf-autotable 未掛載');
      throw new Error('PDF 表格元件未載入，請重新整理頁面後再試');
    }

    var sigForPdf = await shrinkSignatureDataUrlForPdf(data.signatureDataUrl, 560);
    if (sigForPdf !== data.signatureDataUrl) {
      dbg('PDF', '簽名圖已縮小以利嵌入 PDF');
    }
    var d = Object.assign({}, data, { signatureDataUrl: sigForPdf });

    if (pdfContent) {
      pdfContent.innerHTML = pdfHtml(d);
    }

    var doc = new JsPdfCtor({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });

    await ensureNotoChineseFont(doc);
    doc.setFont('NotoSansTC', 'normal');

    var margin = 14;
    var pageW = doc.internal.pageSize.getWidth();
    var y = margin;

    doc.setFontSize(17);
    doc.text('小巴老師親子寫真預約確認書', pageW / 2, y, { align: 'center' });
    y += 11;

    doc.setFontSize(10);

    y = pdfSectionHeading(doc, y, margin, '預約資訊');
    y = pdfTwoColumnTable(doc, y, margin, [
      ['客戶名稱', d.clientName],
      ['拍攝日期', d.shootingDate],
      ['拍攝時間', [d.shootingStartTime, d.shootingEndTime].filter(Boolean).join(' - ')],
      ['拍攝方案', d.packageName],
      ['拍攝地點', d.location],
      ['是否含接送', d.pickup],
      ['總費用', formatNtd(d.totalFee)],
      ['訂金', formatNtd(d.deposit)],
      ['餘款', formatNtd(d.balance)],
      ['成品內容', d.deliverables],
    ]);

    y = pdfSectionHeading(doc, y, margin, '費用與訂金匯款');
    y = pdfTwoColumnTable(doc, y, margin, [
      ['攝影總費用', formatNtd(d.totalFee)],
      ['訂金金額', formatNtd(d.deposit)],
      ['餘款', formatNtd(d.balance)],
      ['客戶目前付款狀態', d.paymentStatus],
      ['付款方式', d.paymentMethod],
      ['匯款帳號後四碼／末五碼', d.bankLast5],
      ['付款金額', formatNtd(d.paymentAmount)],
      ['付款日期', d.paymentDate],
      ['付款備註', d.paymentNote],
    ]);

    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);
    var tipLines = doc.splitTextToSize(
      '付款提醒：完成訂金付款後，攝影師才會正式保留檔期。',
      pageW - margin * 2,
    );
    if (y > doc.internal.pageSize.getHeight() - 25) {
      doc.addPage();
      y = margin;
    }
    doc.text(tipLines, margin, y);
    y += tipLines.length * 4.5 + 4;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    y = pdfSectionHeading(doc, y, margin, '客戶補充資料');
    y = pdfTwoColumnTable(doc, y, margin, [
      ['爸爸稱呼', d.fatherName],
      ['媽媽稱呼', d.motherName],
      ['主要聯絡人', d.contactName],
      ['電話', d.phone],
      ['Email', d.customerEmail],
      ['LINE', d.lineName],
      ['客戶確認入鏡大人人數', d.clientAdultCount],
      ['客戶確認入鏡小孩人數', d.clientChildCount],
      ['攝影師預設入鏡大人', d.photographerAdultCount],
      ['攝影師預設入鏡小孩', d.photographerChildCount],
      ['小朋友年齡與稱呼', d.childrenInfo],
      ['家庭介紹', d.familyIntro],
      ['特別想拍的畫面', d.desiredShots],
      ['注意事項', d.specialNotes],
    ]);

    doc.setFontSize(9);
    var ack = doc.splitTextToSize(
      '客戶已閱讀本頁預約與補充資料，並以下方電子簽名確認。',
      pageW - margin * 2,
    );
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = margin;
    }
    doc.text(ack, margin, y);
    y += ack.length * 4.5 + 6;
    doc.setFontSize(10);

    y = pdfSectionHeading(doc, y, margin, '電子簽名');
    y = await pdfSignatureBlock(doc, d, margin, y);

    y += 2;
    y = pdfSectionHeading(doc, y, margin, '攝影師聯絡資訊');
    var contactTxt =
      '小巴老師｜親子寫真\nLine／電話：0911-252-302\nWhatsApp：+886 911252302\nEmail：crownchief@gmail.com';
    doc.setFontSize(10);
    var contactLines = doc.splitTextToSize(contactTxt, pageW - margin * 2);
    doc.text(contactLines, margin, y);

    var filename =
      'contract-' +
      slug +
      '-' +
      safePdfClientPart(d.signerDisplay || d.customerEmail || clientName) +
      '-' +
      fileDate() +
      '.pdf';
    var blob = doc.output('blob');
    dbg('PDF', 'jsPDF 向量 PDF 完成，約 ' + Math.round(blob.size / 1024) + ' KB');
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
    var body = {
      slug: slug,
      clientName: clientName,
      customerEmail: data.customerEmail,
      photographerEmail: photographerEmail,
      subject: '小巴老師親子寫真｜預約確認書｜' + clientName,
      pdfBase64: base64,
      pdfFilename: pdf.filename,
    };
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

  function showEmailSuccess(data, sendResult) {
    if (fallbackPanel) fallbackPanel.hidden = true;
    if (statusContract) statusContract.textContent = '合約狀態：PDF 已寄出';
    if (submitStatus) {
      var sentList =
        sendResult && Array.isArray(sendResult.sentTo) && sendResult.sentTo.length
          ? sendResult.sentTo.join('、')
          : [data.customerEmail, photographerEmail].filter(Boolean).join('、');
      if (sendResult && sendResult.partial) {
        submitStatus.textContent =
          '合約 PDF 已寄出至：' +
          sentList +
          '。（客戶信箱若未收到，可能是 Resend 測試限制：請驗證網域後再寄；請也檢查垃圾郵件匣。）';
      } else {
        submitStatus.textContent =
          '合約 PDF 已寄出至 ' +
          data.customerEmail +
          ' 與 ' +
          photographerEmail +
          '。請留意信箱；若未收到，請下載 PDF 並透過 Line 聯繫小巴老師。';
      }
    }
  }

  function showEmailFallback() {
    if (fallbackPanel) fallbackPanel.hidden = false;
    if (statusContract) statusContract.textContent = '合約狀態：PDF 已產生，尚未寄出';
    if (submitStatus) {
      submitStatus.textContent =
        '合約 PDF 已產生，但目前系統尚未完成自動寄信設定。請先下載 PDF，並透過 Line 傳給小巴老師，或等待攝影師協助確認。';
    }
    if (downloadWrap) downloadWrap.hidden = false;
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

        if (submitStatus) submitStatus.textContent = 'PDF 已產生，正在寄送 Email…';

        var emailed = false;
        var sendResult = null;
        try {
          sendResult = await sendContract(data, pdf);
          emailed = true;
        } catch (sendErr) {
          emailed = false;
          dbg(
            '寄信未完成',
            sendErr && sendErr.message ? sendErr.message : String(sendErr),
          );
        }

        // 第一階段：僅前端狀態與寄信，不會自動回寫 content/clients/*.md（重新整理會還原）。
        try {
          localStorage.setItem(localKey, JSON.stringify({ data: data, emailed: emailed }));
        } catch (quotaErr) {
          try {
            var slim = Object.assign({}, data);
            slim.signatureDataUrl = '';
            localStorage.setItem(localKey, JSON.stringify({ data: slim, emailed: emailed }));
          } catch (_) {}
        }
        revealDeferredBlocks();
        setSignedPanel(data);
        updateSubmitState(false, true);

        if (emailed) {
          showEmailSuccess(data, sendResult);
        } else {
          showEmailFallback();
        }
        dbg(
          '流程結束',
          emailed
            ? sendResult && sendResult.partial
              ? '至少一封寄出成功（可能僅攝影師）'
              : '已嘗試寄信且成功'
            : 'PDF 完成（寄信失敗或未設定 API 時可下載）',
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
