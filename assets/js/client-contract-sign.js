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
    if (!window.SignaturePad || !canvas) return false;
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
      formError.hidden = false;
      formError.textContent = '請填寫 Email';
      return false;
    }
    if (!anyNameFilled()) {
      formError.hidden = false;
      formError.textContent =
        '請至少填寫一項稱呼或姓名（主要聯絡人、爸爸／媽媽稱呼或簽名人姓名擇一即可）';
      return false;
    }
    if (!signatureConfirmed || !signatureInput.value) {
      signError.hidden = false;
      formError.hidden = false;
      formError.textContent = '請先完成電子簽名後再送出合約。';
      return false;
    }
    return true;
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
      '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#111;">' +
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

  async function generatePdf(data) {
    if (!window.html2canvas || !window.jspdf || !pdfContent) {
      throw new Error('PDF 套件未載入');
    }
    pdfContent.innerHTML = pdfHtml(data);
    var canvasImg = await window.html2canvas(pdfContent, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      windowWidth: 820,
    });
    var imgData = canvasImg.toDataURL('image/jpeg', 0.95);
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF('p', 'mm', 'a4');
    var pageWidth = doc.internal.pageSize.getWidth();
    var pageHeight = doc.internal.pageSize.getHeight();
    var imgHeight = (canvasImg.height * pageWidth) / canvasImg.width;
    var y = 0;
    doc.addImage(imgData, 'JPEG', 0, y, pageWidth, imgHeight);
    while (imgHeight - y > pageHeight) {
      y -= pageHeight;
      doc.addPage();
      doc.addImage(imgData, 'JPEG', 0, y, pageWidth, imgHeight);
    }
    var filename =
      'contract-' +
      slug +
      '-' +
      safePdfClientPart(data.signerDisplay || data.customerEmail || clientName) +
      '-' +
      fileDate() +
      '.pdf';
    var blob = doc.output('blob');
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
    var base64 = await blobToBase64(pdf.blob);
    var body = {
      slug: slug,
      clientName: clientName,
      customerEmail: data.customerEmail,
      photographerEmail: photographerEmail,
      subject: '小巴老師親子寫真｜預約確認書｜' + clientName,
      pdfBase64: base64,
      pdfFilename: pdf.filename,
      formData: data,
    };
    var res = await fetch('/api/send-contract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    var json = await res.json().catch(function () {
      return { ok: false, message: '伺服器回應格式錯誤' };
    });
    if (!res.ok || !json.ok) {
      var err = new Error(json.message || 'Email 寄送失敗');
      err._payload = json;
      err._status = res.status;
      throw err;
    }
    return json;
  }

  function showEmailSuccess(data) {
    if (fallbackPanel) fallbackPanel.hidden = true;
    if (statusContract) statusContract.textContent = '合約狀態：PDF 已寄出';
    if (submitStatus) {
      submitStatus.textContent =
        '合約 PDF 已寄出至 ' +
        data.customerEmail +
        ' 與 ' +
        photographerEmail +
        '。請留意信箱；若未收到，請下載 PDF 並透過 Line 聯繫小巴老師。';
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
    if (!form || !initPad()) return;
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
      updateSubmitState(true, false);
      formError.hidden = true;
      if (fallbackPanel) fallbackPanel.hidden = true;
      if (submitStatus) submitStatus.textContent = '';

      try {
        var data = collectData();
        var pdf = await generatePdf(data);
        latestPdfBlob = pdf.blob;
        latestPdfFilename = pdf.filename;

        var emailed = false;
        try {
          await sendContract(data, pdf);
          emailed = true;
        } catch (sendErr) {
          emailed = false;
        }

        // 第一階段：僅前端狀態與寄信，不會自動回寫 content/clients/*.md（重新整理會還原）。
        localStorage.setItem(localKey, JSON.stringify({ data: data, emailed: emailed }));
        revealDeferredBlocks();
        setSignedPanel(data);
        updateSubmitState(false, true);

        if (emailed) {
          showEmailSuccess(data);
        } else {
          showEmailFallback();
        }
        form.dataset.contractComplete = '1';
      } catch (err) {
        formError.hidden = false;
        formError.textContent = String(err && err.message ? err.message : '處理失敗');
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
