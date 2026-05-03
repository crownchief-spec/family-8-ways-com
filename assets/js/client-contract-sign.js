(function () {
  var root = document.querySelector('[data-client-portal]');
  if (!root) return;

  var slug = root.getAttribute('data-client-slug') || '';
  var clientName = root.getAttribute('data-client-name') || '';
  var contractVersion = 'v1.0-demo';
  var form = document.getElementById('client-contract-form');
  var signedPanel = document.getElementById('signed-status-panel');
  var signedTimeEl = document.getElementById('signed-at-text');
  var signedImageEl = document.getElementById('signed-image');
  var printBtn = document.getElementById('client-print-contract');
  var clearBtn = document.getElementById('client-clear-signature');
  var confirmBtn = document.getElementById('client-confirm-signature');
  var signError = document.getElementById('client-signature-error');
  var formError = document.getElementById('client-form-error');
  var signatureInput = document.getElementById('client-signature-image-base64');
  var signStateText = document.getElementById('client-sign-state');
  var canvas = document.getElementById('client-signature-canvas');
  var statusTag = document.getElementById('contract-status-tag');
  var signedDate = document.getElementById('client-signed-date');

  var signaturePad = null;
  var signatureConfirmed = false;
  var localKey = 'family-contract-signed-' + slug;

  function nowText() {
    var d = new Date();
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0') +
      ' ' +
      String(d.getHours()).padStart(2, '0') +
      ':' +
      String(d.getMinutes()).padStart(2, '0') +
      ':' +
      String(d.getSeconds()).padStart(2, '0')
    );
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

  function val(name) {
    var el = form.elements[name];
    if (!el) return '';
    if (el.type === 'radio') {
      var checked = form.querySelector('input[name="' + name + '"]:checked');
      return checked ? checked.value : '';
    }
    if (el.type === 'checkbox') return !!el.checked;
    return String(el.value || '').trim();
  }

  function payload() {
    return {
      clientSlug: slug,
      clientName: clientName,
      shootingDate: root.getAttribute('data-shooting-date') || '',
      shootingStartTime: root.getAttribute('data-start-time') || '',
      shootingEndTime: root.getAttribute('data-end-time') || '',
      packageName: root.getAttribute('data-package-name') || '',
      location: root.getAttribute('data-location') || '',
      totalFee: root.getAttribute('data-total-fee') || '',
      deposit: root.getAttribute('data-deposit') || '',
      balance: root.getAttribute('data-balance') || '',
      fatherName: val('fatherName'),
      motherName: val('motherName'),
      contactName: val('contactName'),
      phone: val('phone'),
      email: val('email'),
      lineName: val('lineName'),
      adultCount: val('adultCount'),
      childCount: val('childCount'),
      childrenInfo: val('childrenInfo'),
      familyIntro: val('familyIntro'),
      desiredShots: val('desiredShots'),
      specialNotes: val('specialNotes'),
      portfolioPermission: val('portfolioPermission'),
      agreementCheckboxes: {
        confirmedMainInfo: val('agreementMainInfo'),
        agreedTerms: val('agreementTerms'),
        understoodDepositRule: val('agreementDeposit'),
        confirmedSignature: val('agreementSignature'),
      },
      signerName: val('signerName'),
      signatureImageBase64: signatureInput.value,
      signedAt: nowText(),
      userAgent: navigator.userAgent,
      contractVersion: contractVersion,
    };
  }

  function setSigned(data) {
    signedPanel.hidden = false;
    signedTimeEl.textContent = data.signedAt || '';
    if (data.signatureImageBase64) signedImageEl.src = data.signatureImageBase64;
    if (statusTag) statusTag.textContent = '合約狀態：已簽署';
  }

  function loadSignedStatus() {
    try {
      var data = JSON.parse(localStorage.getItem(localKey) || 'null');
      if (!data) return;
      setSigned(data);
    } catch (_) {
      return;
    }
  }

  function validate() {
    formError.hidden = true;
    if (!form.checkValidity()) {
      form.reportValidity();
      formError.hidden = false;
      formError.textContent = '請先完成所有必填欄位。';
      return false;
    }
    if (!val('portfolioPermission')) {
      formError.hidden = false;
      formError.textContent = '請先選擇肖像權授權。';
      return false;
    }
    if (!signatureConfirmed || !signatureInput.value) {
      signError.hidden = false;
      formError.hidden = false;
      formError.textContent = '請先完成簽名並按下確認。';
      return false;
    }
    signError.hidden = true;
    return true;
  }

  function init() {
    if (!initPad()) return;
    if (signedDate) signedDate.value = (new Date()).toISOString().slice(0, 10);
    loadSignedStatus();

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
      signStateText.textContent = '簽名已確認';
      signError.hidden = true;
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) return;
      var data = payload();
      localStorage.setItem(localKey, JSON.stringify(data));
      setSigned(data);

      // TODO: 串接正式 API
      // fetch('/api/clients/' + encodeURIComponent(slug) + '/contract-sign', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(data),
      // });
    });

    if (printBtn) {
      printBtn.addEventListener('click', function () {
        window.print();
      });
    }
  }

  init();
})();
