(function () {
  var root = document.querySelector('[data-client-portal]');
  if (!root) return;

  var slug = root.getAttribute('data-client-slug') || '';
  var clientName = root.getAttribute('data-client-name') || '';
  var contractVersion = root.getAttribute('data-contract-version') || 'family-contract-v2026-05';
  var form = document.getElementById('client-contract-form');
  var signedPanel = document.getElementById('signed-status-panel');
  var signedTimeEl = document.getElementById('signed-at-text');
  var signedImageEl = document.getElementById('signed-image');
  var printBtn = document.getElementById('client-print-contract');
  var clearBtn = document.getElementById('client-clear-signature');
  var confirmBtn = document.getElementById('client-confirm-signature');
  var submitBtn = document.getElementById('client-submit-contract');
  var signError = document.getElementById('client-signature-error');
  var formError = document.getElementById('client-form-error');
  var submitStatus = document.getElementById('client-submit-status');
  var downloadWrap = document.getElementById('client-download-wrap');
  var downloadBtn = document.getElementById('client-download-pdf');
  var signatureInput = document.getElementById('client-signature-image-base64');
  var signedAtInput = document.getElementById('client-signed-at');
  var signStateText = document.getElementById('client-sign-state');
  var canvas = document.getElementById('client-signature-canvas');
  var statusTag = document.getElementById('contract-status-tag');
  var signedDate = document.getElementById('client-signed-date');
  var pdfContent = document.getElementById('contract-pdf-content');
  var consentYes = form.querySelector('input[name="usageConsentYes"]');
  var consentNo = form.querySelector('input[name="usageConsentNo"]');

  var signaturePad = null;
  var signatureConfirmed = false;
  var isSubmitting = false;
  var latestPdfBlob = null;
  var latestPdfFilename = '';
  var localKey = 'family-contract-signed-' + slug;

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

  function bool(name) {
    var el = form.elements[name];
    return !!(el && el.checked);
  }

  function updateSubmitState(loading, text) {
    isSubmitting = loading;
    if (submitBtn) {
      submitBtn.disabled = loading || submitBtn.dataset.done === 'true';
      submitBtn.textContent = submitBtn.dataset.done === 'true' ? '已送出' : loading ? '合約寄送中，請稍候' : '送出合約簽署';
    }
    if (submitStatus && text) submitStatus.textContent = text;
  }

  function bindExclusiveConsent() {
    function toggle(target, other) {
      if (target.checked) other.checked = false;
      target.required = !target.checked;
      other.required = !other.checked;
    }
    consentYes.addEventListener('change', function () {
      toggle(consentYes, consentNo);
    });
    consentNo.addEventListener('change', function () {
      toggle(consentNo, consentYes);
    });
    toggle(consentYes, consentNo);
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
    var usageConsent = bool('usageConsentYes') ? '同意公開使用' : bool('usageConsentNo') ? '不同意公開使用' : '';
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
      fatherName: val('fatherName'),
      motherName: val('motherName'),
      contactName: val('contactName'),
      phone: val('phone'),
      customerEmail: val('customerEmail'),
      lineName: val('lineName'),
      adultCount: val('adultCount'),
      childCount: val('childCount'),
      childrenInfo: val('childrenInfo'),
      familyIntro: val('familyIntro'),
      desiredShots: val('desiredShots'),
      specialNotes: val('specialNotes'),
      usageConsent: usageConsent,
      confirmBookingInfo: bool('confirmBookingInfo'),
      confirmTerms: bool('confirmTerms'),
      confirmDeposit: bool('confirmDeposit'),
      confirmSignature: bool('confirmSignature'),
      signerName: val('signerName'),
      signedDate: val('signedDate'),
      signedAt: signedAt,
      signatureDataUrl: signatureInput.value,
      paymentMethod: val('paymentMethod'),
      bankLast5: val('bankLast5'),
      paymentAmount: val('paymentAmount'),
      paymentDate: val('paymentDate'),
      paymentNote: val('paymentNoteSubmit'),
      contractVersion: contractVersion,
    };
  }

  function setSigned(data) {
    signedPanel.hidden = false;
    signedTimeEl.textContent = data.signedAt || '';
    if (data.signatureDataUrl) signedImageEl.src = data.signatureDataUrl;
    if (statusTag) statusTag.textContent = '合約狀態：已送出';
  }

  function validate() {
    formError.hidden = true;
    signError.hidden = true;

    if (!val('customerEmail')) {
      formError.hidden = false;
      formError.textContent = '請填寫 Email';
      return false;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      formError.hidden = false;
      formError.textContent = '請先完成所有必填欄位。';
      return false;
    }
    if (!bool('usageConsentYes') && !bool('usageConsentNo')) {
      formError.hidden = false;
      formError.textContent = '請選擇作品公開授權';
      return false;
    }
    if (bool('usageConsentYes') && bool('usageConsentNo')) {
      formError.hidden = false;
      formError.textContent = '作品公開授權只能二選一';
      return false;
    }
    if (!bool('confirmBookingInfo') || !bool('confirmTerms') || !bool('confirmDeposit') || !bool('confirmSignature')) {
      formError.hidden = false;
      formError.textContent = '請確認合約條款';
      return false;
    }
    if (!signatureConfirmed || !signatureInput.value) {
      signError.hidden = false;
      formError.hidden = false;
      formError.textContent = '請完成簽名';
      return false;
    }
    return true;
  }

  function pdfHtml(data) {
    function row(label, value) {
      return '<tr><td style="padding:6px 8px;border:1px solid #ddd;width:220px;font-weight:600;">' + escapeHtml(label) + '</td><td style="padding:6px 8px;border:1px solid #ddd;">' + escapeHtml(value || '') + '</td></tr>';
    }
    return (
      '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#111;">' +
      '<h1 style="font-size:26px;margin:0 0 14px;">小巴老師親子寫真預約確認書</h1>' +
      '<h2 style="font-size:18px;margin:18px 0 8px;">客戶案件資訊</h2><table style="border-collapse:collapse;width:100%;">' +
      row('客戶頁 slug', data.slug) +
      row('拍攝日期', data.shootingDate) +
      row('拍攝時間', [data.shootingStartTime, data.shootingEndTime].filter(Boolean).join(' - ')) +
      row('拍攝方案', data.packageName) +
      row('拍攝地點', data.location) +
      row('是否含接送', data.pickup) +
      row('總費用', data.totalFee) +
      row('訂金', data.deposit) +
      row('尾款', data.balance) +
      row('成品內容', data.deliverables) +
      '</table>' +
      '<h2 style="font-size:18px;margin:18px 0 8px;">客戶補充資料</h2><table style="border-collapse:collapse;width:100%;">' +
      row('爸爸稱呼', data.fatherName) + row('媽媽稱呼', data.motherName) + row('主要聯絡人', data.contactName) + row('電話', data.phone) +
      row('Email', data.customerEmail) + row('LINE', data.lineName) + row('大人人數', data.adultCount) + row('小孩人數', data.childCount) +
      row('小朋友年齡與稱呼', data.childrenInfo) + row('家庭介紹', data.familyIntro) + row('特別想拍的畫面', data.desiredShots) + row('注意事項', data.specialNotes) +
      '</table>' +
      '<h2 style="font-size:18px;margin:18px 0 8px;">合約確認</h2><table style="border-collapse:collapse;width:100%;">' +
      row('作品公開授權選擇', data.usageConsent) +
      row('已確認拍攝資訊', data.confirmBookingInfo ? '是' : '否') +
      row('已閱讀並同意合約', data.confirmTerms ? '是' : '否') +
      row('已了解訂金保留檔期', data.confirmDeposit ? '是' : '否') +
      row('同意電子簽名', data.confirmSignature ? '是' : '否') +
      '</table>' +
      '<h2 style="font-size:18px;margin:18px 0 8px;">付款資訊</h2><table style="border-collapse:collapse;width:100%;">' +
      row('付款方式', data.paymentMethod) + row('匯款末五碼', data.bankLast5) + row('付款金額', data.paymentAmount) + row('付款日期', data.paymentDate) + row('付款備註', data.paymentNote) +
      '</table>' +
      '<h2 style="font-size:18px;margin:18px 0 8px;">電子簽名</h2>' +
      '<p>簽名人姓名：' + escapeHtml(data.signerName) + '</p>' +
      '<p>簽署日期：' + escapeHtml(data.signedDate) + '</p>' +
      '<p>簽署時間：' + escapeHtml(data.signedAt) + '</p>' +
      '<img src="' + escapeHtml(data.signatureDataUrl) + '" style="width:320px;height:auto;border:1px solid #ddd;padding:4px;" alt="簽名圖片" />' +
      '<h2 style="font-size:18px;margin:18px 0 8px;">攝影師聯絡資訊</h2>' +
      '<p>小巴老師｜親子寫真<br>Line／電話：0911-252-302<br>WhatsApp：+886 911252302<br>Email：crownchief@gmail.com</p>' +
      '</div>'
    );
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
    var filename = 'contract-' + slug + '-' + (clientName || 'client').toLowerCase().replace(/\s+/g, '-') + '-' + fileDate() + '.pdf';
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
      photographerEmail: 'crownchief@gmail.com',
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
    if (!res.ok || !json.ok) throw new Error(json.message || 'Email 寄送失敗');
    return json;
  }

  function init() {
    if (!form || !initPad()) return;
    bindExclusiveConsent();
    if (signedDate) signedDate.value = formatDate(new Date());
    if (signedAtInput) signedAtInput.value = nowText();

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

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (isSubmitting) return;
      if (!validate()) return;
      updateSubmitState(true, '合約寄送中，請稍候');
      try {
        var data = collectData();
        var pdf = await generatePdf(data);
        latestPdfBlob = pdf.blob;
        latestPdfFilename = pdf.filename;
        if (downloadWrap) downloadWrap.hidden = false;

        var response = await sendContract(data, pdf);
        // 第一階段只更新前端狀態與寄送 Email，不會自動回寫 content/clients/*.md。
        localStorage.setItem(localKey, JSON.stringify(data));
        setSigned(data);
        submitBtn.dataset.done = 'true';
        updateSubmitState(false, '合約 PDF 已寄出。寄送對象：' + data.customerEmail + '、crownchief@gmail.com。請完成訂金付款，並將匯款末五碼傳給攝影師確認，攝影師確認訂金後才會正式保留檔期。');
        formError.hidden = true;
        if (response && response.message) {
          // 保留伺服器成功回應（目前主要以前端訊息為主）。
        }
      } catch (err) {
        formError.hidden = false;
        formError.textContent = 'Email 寄送失敗，但 PDF 已產生，請先下載 PDF 並透過 Line 傳給攝影師。';
        updateSubmitState(false, '目前尚未設定 Email API，請先下載 PDF 並傳給攝影師。');
      }
    });

    if (downloadBtn) {
      downloadBtn.addEventListener('click', function () {
        downloadPdf();
      });
    }

    if (printBtn) {
      printBtn.addEventListener('click', async function () {
        var validForPdf = validate();
        if (!validForPdf) return;
        var data = collectData();
        var pdf = await generatePdf(data);
        latestPdfBlob = pdf.blob;
        latestPdfFilename = pdf.filename;
        if (downloadWrap) downloadWrap.hidden = false;
        downloadPdf();
      });
    }
  }

  init();
})();
