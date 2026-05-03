(function () {
  var form = document.getElementById('admin-client-edit-form');
  var statusEl = document.getElementById('admin-save-status');
  var saveBtn = document.getElementById('admin-save-md');
  var fmEl = document.getElementById('admin-client-initial-fm');
  var fallbackPanel = document.getElementById('admin-md-fallback-panel');
  var mdOut = document.getElementById('admin-md-output');
  var copyMdBtn = document.getElementById('admin-copy-md-output');
  var copyUrlBtn = document.getElementById('admin-copy-client-url');

  if (!form || !fmEl) return;

  var initialFm = {};
  try {
    initialFm = JSON.parse(fmEl.textContent || '{}');
  } catch (_) {
    initialFm = {};
  }

  var CHECKBOX_NAMES = [
    'mvIncluded',
    'droneIncluded',
    'underwaterIncluded',
    'contractEnabled',
    'shareEnabled',
    'adminReviewed',
    'readyToShare',
    'noindex',
    'showInClientList',
    'publicPortfolio',
    'adminOnly',
    'elderIncluded',
    'petIncluded',
    'paymentEnablePaypal',
    'paymentEnableWise',
    'portfolioPublish',
    'publish',
    'hubPortal',
    'deliveryEnabled',
  ];

  function linesToArr(text) {
    return String(text || '')
      .split('\n')
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
  }

  function boolFromForm(name) {
    var el = form.elements[name];
    return !!(el && el.type === 'checkbox' && el.checked);
  }

  function val(name) {
    var el = form.elements[name];
    if (!el) return '';
    return String(el.value != null ? el.value : '').trim();
  }

  function numOrStr(name) {
    var s = val(name);
    if (s === '') return '';
    var n = Number(s);
    if (Number.isFinite(n)) return n;
    return s;
  }

  function collectFromForm() {
    var o = {};
    [
      'title',
      'clientName',
      'clientAlias',
      'status',
      'slug',
      'shootingDate',
      'shootingWeekday',
      'shootingStartTime',
      'shootingEndTime',
      'duration',
      'location',
      'meetingPoint',
      'pickup',
      'transportationNote',
      'serviceType',
      'packageCategory',
      'packageName',
      'paymentNoteFromAdmin',
      'deliverables',
      'photoDeliverables',
      'videoDeliverables',
      'contractStatus',
      'contractVersion',
      'contractNote',
      'reviewedAt',
      'reviewedBy',
      'deliveryStatus',
      'driveFolderUrl',
      'videoUrl',
      'deliveryNote',
      'privacy',
      'internalNote',
      'familyCount',
      'adultCount',
      'childCount',
      'clientAccessCode',
      'selectedPhotoUrl',
      'coverImage',
    ].forEach(function (k) {
      o[k] = val(k);
    });
    o.totalFee = numOrStr('totalFee');
    o.deposit = numOrStr('deposit');
    o.balance = numOrStr('balance');
    CHECKBOX_NAMES.forEach(function (k) {
      o[k] = boolFromForm(k);
    });
    o.tags = linesToArr(val('tagsLines'));
    o.gallery = linesToArr(val('galleryLines'));
    o.specialRequests = linesToArr(val('specialRequestsLines'));
    return o;
  }

  function mergeFrontmatter() {
    var base = Object.assign({}, initialFm);
    var next = collectFromForm();
    Object.keys(next).forEach(function (k) {
      base[k] = next[k];
    });
    return base;
  }

  function yamlScalar(v) {
    if (v === true) return 'true';
    if (v === false) return 'false';
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
    if (v === null || v === undefined) return '""';
    var s = String(v);
    if (s === '') return '""';
    return (
      '"' +
      s
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n') +
      '"'
    );
  }

  function yamlDump(data) {
    var keys = Object.keys(data).filter(function (k) {
      if (k.indexOf('_') === 0) return false;
      return data[k] !== undefined;
    });
    keys.sort();
    var lines = [];
    keys.forEach(function (k) {
      var v = data[k];
      if (Array.isArray(v)) {
        if (!v.length) {
          lines.push(k + ': []');
          return;
        }
        lines.push(k + ':');
        v.forEach(function (item) {
          lines.push('  - ' + yamlScalar(item));
        });
        return;
      }
      lines.push(k + ': ' + yamlScalar(v));
    });
    return lines.join('\n');
  }

  function buildMarkdown(fm, bodyMd) {
    return '---\n' + yamlDump(fm) + '\n---\n\n' + String(bodyMd || '').replace(/\s+$/, '') + '\n';
  }

  function adminPassword() {
    return String(sessionStorage.getItem('family_admin_pw_for_api') || '').trim();
  }

  if (copyUrlBtn) {
    copyUrlBtn.addEventListener('click', function () {
      var u = copyUrlBtn.getAttribute('data-client-url') || '';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(u).then(
          function () {
            if (statusEl) statusEl.textContent = '已複製客戶連結';
          },
          function () {},
        );
      }
    });
  }

  if (copyMdBtn && mdOut) {
    copyMdBtn.addEventListener('click', function () {
      mdOut.select();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(mdOut.value).catch(function () {});
      } else {
        try {
          document.execCommand('copy');
        } catch (_) {}
      }
      if (statusEl) statusEl.textContent = '已複製 Markdown';
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', async function () {
      if (statusEl) statusEl.textContent = '';
      if (fallbackPanel) fallbackPanel.hidden = true;
      var fm = mergeFrontmatter();
      var bodyMd = val('bodyMd');
      var md = buildMarkdown(fm, bodyMd);
      var pw = adminPassword();
      if (!pw) {
        if (statusEl) statusEl.textContent = '找不到後台密碼工作階段，請登出後重新輸入後台密碼再試。';
        return;
      }
      try {
        var res = await fetch('/api/admin/save-client', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminPassword: pw,
            path: form.getAttribute('data-md-path'),
            slug: form.getAttribute('data-slug'),
            markdown: md,
          }),
        });
        var json = await res.json().catch(function () {
          return { ok: false, message: '回應格式錯誤' };
        });
        if (json && json.ok) {
          if (statusEl) statusEl.textContent = json.message || '客戶 MD 已更新';
          return;
        }
        if (res.status === 401) {
          if (statusEl) statusEl.textContent = (json && json.message) || '後台密碼錯誤，請登出後重新登入。';
          return;
        }
        if (json && json.githubConfigured === false) {
          if (mdOut) mdOut.value = md;
          if (fallbackPanel) fallbackPanel.hidden = false;
          if (statusEl) statusEl.textContent = json.message || '請複製 Markdown 手動存檔';
          return;
        }
        if (statusEl) statusEl.textContent = json.message || '儲存失敗';
      } catch (e) {
        if (statusEl) statusEl.textContent = '網路錯誤或尚未部署 API，已改為產生 Markdown。';
        if (mdOut) mdOut.value = md;
        if (fallbackPanel) fallbackPanel.hidden = false;
      }
    });
  }
})();
