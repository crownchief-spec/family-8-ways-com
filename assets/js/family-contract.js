(function () {
  var form = document.getElementById('family-contract-form');
  if (!form) return;

  var signatureCanvas = document.getElementById('signature-canvas');
  var clearSignatureBtn = document.getElementById('clear-signature');
  var confirmSignatureBtn = document.getElementById('confirm-signature');
  var signatureError = document.getElementById('signature-error');
  var signatureStatus = document.getElementById('signature-status');
  var signatureInput = document.getElementById('signature-image-base64');
  var signedDateInput = document.getElementById('signed-date');
  var summarySection = document.getElementById('contract-summary');
  var summaryContent = document.getElementById('summary-content');
  var summarySignatureImage = document.getElementById('summary-signature-image');
  var summarySubmitNote = document.getElementById('summary-submit-note');
  var printButton = document.getElementById('print-contract');
  var formErrorMessage = document.getElementById('form-error-message');
  var printFooterNote = document.getElementById('print-footer-note');

  var signaturePad = null;
  var signatureConfirmed = false;
  var totalFee = 'NT$7,800';
  var deposit = 'NT$800';
  var balance = 'NT$7,000';

  function formatDate(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function formatDateTime(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    var hh = String(date.getHours()).padStart(2, '0');
    var mm = String(date.getMinutes()).padStart(2, '0');
    var ss = String(date.getSeconds()).padStart(2, '0');
    return y + '-' + m + '-' + d + ' ' + hh + ':' + mm + ':' + ss;
  }

  function ensureSignaturePadReady() {
    if (!window.SignaturePad || !signatureCanvas) return false;
    if (signaturePad) return true;

    signaturePad = new window.SignaturePad(signatureCanvas, {
      minWidth: 0.6,
      maxWidth: 2.5,
      penColor: '#2c2a26',
      backgroundColor: 'rgb(255, 255, 255)',
    });

    function resizeCanvas() {
      var ratio = Math.max(window.devicePixelRatio || 1, 1);
      var rect = signatureCanvas.getBoundingClientRect();
      signatureCanvas.width = rect.width * ratio;
      signatureCanvas.height = rect.height * ratio;
      signatureCanvas.getContext('2d').scale(ratio, ratio);
      signaturePad.clear();
      signatureConfirmed = false;
      signatureInput.value = '';
      signatureStatus.textContent = '尚未確認簽名';
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    return true;
  }

  function getFormValue(name) {
    var element = form.elements[name];
    if (!element) return '';
    if (element.type === 'radio') {
      var checked = form.querySelector('input[name="' + name + '"]:checked');
      return checked ? checked.value.trim() : '';
    }
    if (element.type === 'checkbox') return element.checked;
    return String(element.value || '').trim();
  }

  function getAgreementCheckboxes() {
    return {
      confirmedShootingInfo: !!form.elements.agreementDateTimeLocationFee.checked,
      agreedTerms: !!form.elements.agreementTerms.checked,
      understoodDepositPolicy: !!form.elements.agreementDepositRequired.checked,
      confirmedElectronicSignature: !!form.elements.agreementSignature.checked,
    };
  }

  function buildPayload() {
    var now = new Date();
    return {
      shootingDate: getFormValue('shootingDate'),
      shootingWeekday: getFormValue('shootingWeekday'),
      shootingStartTime: getFormValue('shootingStartTime'),
      shootingEndTime: getFormValue('shootingEndTime'),
      packageName: getFormValue('packageName'),
      deliverables: getFormValue('deliverables'),
      location: getFormValue('location'),
      pickupOption: getFormValue('pickupOption'),
      notes: getFormValue('notes'),
      totalFee: totalFee,
      deposit: deposit,
      balance: balance,
      selectedPaymentMethod: getFormValue('selectedPaymentMethod'),
      paymentStatus: getFormValue('paymentStatus'),
      paymentNote: getFormValue('paymentNote'),
      fatherName: getFormValue('fatherName'),
      motherName: getFormValue('motherName'),
      contactName: getFormValue('contactName'),
      phone: getFormValue('phone'),
      email: getFormValue('email'),
      lineName: getFormValue('lineName'),
      adultCount: getFormValue('adultCount'),
      childCount: getFormValue('childCount'),
      childrenInfo: getFormValue('childrenInfo'),
      familyIntro: getFormValue('familyIntro'),
      desiredShots: getFormValue('desiredShots'),
      specialNotes: getFormValue('specialNotes'),
      portfolioPermission: getFormValue('portfolioPermission'),
      agreementCheckboxes: getAgreementCheckboxes(),
      signerName: getFormValue('signerName'),
      signedDate: getFormValue('signedDate'),
      signatureImageBase64: signatureInput.value,
      submittedAt: formatDateTime(now),
      userAgent: navigator.userAgent,
    };
  }

  function validateForm() {
    formErrorMessage.hidden = true;

    if (!form.checkValidity()) {
      form.reportValidity();
      formErrorMessage.textContent = '請先完成所有必填欄位後再送出。';
      formErrorMessage.hidden = false;
      return false;
    }

    if (!getFormValue('portfolioPermission')) {
      formErrorMessage.textContent = '請選擇肖像與作品使用授權。';
      formErrorMessage.hidden = false;
      return false;
    }

    if (!signatureConfirmed || !signatureInput.value) {
      signatureError.hidden = false;
      formErrorMessage.textContent = '請先完成簽名並按下「確認簽名」。';
      formErrorMessage.hidden = false;
      return false;
    }

    signatureError.hidden = true;
    return true;
  }

  function appendGroup(title, items) {
    var group = document.createElement('div');
    group.className = 'summary-group';
    var heading = document.createElement('h3');
    heading.className = 'h3';
    heading.textContent = title;
    group.appendChild(heading);

    var grid = document.createElement('div');
    grid.className = 'summary-grid';
    items.forEach(function (item) {
      var p = document.createElement('p');
      p.innerHTML = '<strong>' + item.label + '：</strong>' + (item.value || '未填寫');
      grid.appendChild(p);
    });
    group.appendChild(grid);
    summaryContent.appendChild(group);
  }

  function renderSummary(payload) {
    summaryContent.innerHTML = '';

    appendGroup('拍攝資訊', [
      { label: '拍攝日期', value: payload.shootingDate },
      { label: '拍攝星期', value: payload.shootingWeekday },
      { label: '拍攝開始時間', value: payload.shootingStartTime },
      { label: '拍攝結束時間', value: payload.shootingEndTime },
      { label: '拍攝方案', value: payload.packageName },
      { label: '成品內容', value: payload.deliverables },
      { label: '拍攝地點', value: payload.location },
      { label: '接送需求', value: payload.pickupOption },
      { label: '備註', value: payload.notes },
    ]);

    appendGroup('費用與付款', [
      { label: '總費用', value: payload.totalFee },
      { label: '訂金', value: payload.deposit },
      { label: '餘款', value: payload.balance },
      { label: '已選擇付款方式', value: payload.selectedPaymentMethod },
      { label: '付款狀態', value: payload.paymentStatus },
      { label: '付款備註', value: payload.paymentNote },
    ]);

    appendGroup('家庭與聯絡資訊', [
      { label: '爸爸稱呼', value: payload.fatherName },
      { label: '媽媽稱呼', value: payload.motherName },
      { label: '主要聯絡人', value: payload.contactName },
      { label: '聯絡電話', value: payload.phone },
      { label: 'Email', value: payload.email },
      { label: 'LINE 名稱或 ID', value: payload.lineName },
      { label: '入鏡大人人數', value: payload.adultCount },
      { label: '入鏡小孩人數', value: payload.childCount },
      { label: '小朋友資訊', value: payload.childrenInfo },
      { label: '家庭介紹', value: payload.familyIntro },
      { label: '希望拍攝畫面', value: payload.desiredShots },
      { label: '需注意事項', value: payload.specialNotes },
    ]);

    appendGroup('合約同意', [
      { label: '肖像授權', value: payload.portfolioPermission },
      { label: '已確認拍攝資訊', value: payload.agreementCheckboxes.confirmedShootingInfo ? '是' : '否' },
      { label: '已同意條款', value: payload.agreementCheckboxes.agreedTerms ? '是' : '否' },
      { label: '已了解訂金規則', value: payload.agreementCheckboxes.understoodDepositPolicy ? '是' : '否' },
      { label: '同意電子簽名', value: payload.agreementCheckboxes.confirmedElectronicSignature ? '是' : '否' },
      { label: '簽名人姓名', value: payload.signerName },
      { label: '簽署日期', value: payload.signedDate },
    ]);

    summarySignatureImage.src = payload.signatureImageBase64;
    summarySubmitNote.textContent = '送出時間：' + payload.submittedAt;
    printFooterNote.textContent =
      '親子寫真線上合約填寫｜family.8-ways.com 送出時間：' + payload.submittedAt;
    summarySection.hidden = false;
  }

  function init() {
    signedDateInput.value = formatDate(new Date());

    if (!ensureSignaturePadReady()) {
      signatureStatus.textContent = '簽名模組載入中，請稍候重新整理。';
      return;
    }

    clearSignatureBtn.addEventListener('click', function () {
      signaturePad.clear();
      signatureConfirmed = false;
      signatureInput.value = '';
      signatureError.hidden = true;
      signatureStatus.textContent = '尚未確認簽名';
    });

    confirmSignatureBtn.addEventListener('click', function () {
      if (signaturePad.isEmpty()) {
        signatureError.hidden = false;
        signatureStatus.textContent = '請先完成簽名';
        signatureConfirmed = false;
        signatureInput.value = '';
        return;
      }
      signatureInput.value = signaturePad.toDataURL('image/png');
      signatureConfirmed = true;
      signatureError.hidden = true;
      signatureStatus.textContent = '簽名已確認';
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!validateForm()) return;

      var payload = buildPayload();
      renderSummary(payload);

      // 後續串接後端時可啟用：
      // fetch('/api/family-contract', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // });
    });

    if (printButton) {
      printButton.addEventListener('click', function () {
        window.print();
      });
    }
  }

  init();
})();
