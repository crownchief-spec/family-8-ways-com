(function () {
  var form = document.getElementById('admin-client-edit-form');
  var statusEl = document.getElementById('admin-save-status');
  var saveBtn = document.getElementById('admin-save-md');
  var fmEl = document.getElementById('admin-client-initial-fm');
  var fallbackPanel = document.getElementById('admin-md-fallback-panel');
  var mdOut = document.getElementById('admin-md-output');
  var copyMdBtn = document.getElementById('admin-copy-md-output');
  var downloadMdBtn = document.getElementById('admin-download-md-output');
  var copyUrlBtn = document.getElementById('admin-copy-client-url');
  var githubBanner = document.getElementById('admin-github-banner');
  var pathHintEl = document.getElementById('admin-md-path-hint');

  if (!form || !fmEl) return;

  if (pathHintEl && form.getAttribute('data-md-path')) {
    pathHintEl.textContent = form.getAttribute('data-md-path');
  }

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
    return String(
      sessionStorage.getItem('family_admin_pw_for_api') ||
        localStorage.getItem('family_admin_pw_for_api') ||
        '',
    ).trim();
  }

  function showMarkdownPanel(md, statusMessage) {
    if (mdOut) mdOut.value = md;
    if (fallbackPanel) {
      fallbackPanel.hidden = false;
      try {
        fallbackPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (_) {}
    }
    if (statusEl) statusEl.textContent = statusMessage || '';
  }

  function initGithubBanner() {
    var detailEl = document.getElementById('admin-github-banner-detail');
    fetch('/api/admin/save-client', { method: 'GET' })
      .then(function (r) {
        if (!r.ok) throw new Error('no api');
        return r.json();
      })
      .then(function (cfg) {
        if (cfg && cfg.githubConfigured === true) {
          if (githubBanner) githubBanner.hidden = true;
          if (detailEl) {
            detailEl.hidden = true;
            detailEl.textContent = '';
          }
          return;
        }
        if (detailEl && cfg && Array.isArray(cfg.missingGithubEnv) && cfg.missingGithubEnv.length) {
          detailEl.hidden = false;
          detailEl.innerHTML =
            '<strong>目前無法連 GitHub：</strong>Functions 讀不到環境變數「' +
            cfg.missingGithubEnv.join('」、「') +
            '」。請到 Cloudflare → 此 Pages 專案 → Settings → Variables and Secrets → 環境選 <strong>Production</strong> → 新增（名稱須<strong>完全一致</strong>，<code>GITHUB_TOKEN</code> 請用 <strong>Secret</strong>），存檔後<strong>Retry deployment</strong>。' +
            '<br/><span class="muted">原因確認：請用瀏覽器開 <code>/api/admin/save-client</code>，若 <code>missingGithubEnv</code> 仍列出變數，代表尚未套進線上。</span>';
        } else if (detailEl) {
          detailEl.hidden = false;
          detailEl.textContent =
            '無法確認 GitHub 設定（缺少設定資訊）。請確認已在 Cloudflare 設定 GITHUB_TOKEN、GITHUB_OWNER、GITHUB_REPO。';
        }
        if (githubBanner) githubBanner.hidden = false;
      })
      .catch(function () {
        if (detailEl) {
          detailEl.hidden = false;
          detailEl.innerHTML =
            '無法呼叫 <code>/api/admin/save-client</code>（404 或離線）。若為<strong>本機直接開 HTML</strong>，請改用具 Functions 的預覽（例如 <code>wrangler pages dev</code>）；線上站請確認已部署最新版。';
        }
        if (githubBanner) githubBanner.hidden = false;
      });
  }

  initGithubBanner();

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

  function mdDownloadFilename() {
    var path = String(form.getAttribute('data-md-path') || '').trim();
    var name = path.split('/').pop() || 'client.md';
    return name.toLowerCase().endsWith('.md') ? name : name + '.md';
  }

  if (downloadMdBtn && mdOut && form) {
    downloadMdBtn.addEventListener('click', function () {
      var name = mdDownloadFilename();
      var blob = new Blob([mdOut.value], { type: 'text/markdown;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      if (statusEl)
        statusEl.textContent = '已下載「' + name + '」，請覆蓋專案中對應路徑後再建置。';
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
      var fm = mergeFrontmatter();
      var bodyMd = val('bodyMd');
      var md = buildMarkdown(fm, bodyMd);

      var pw = adminPassword();
      if (!pw) {
        showMarkdownPanel(
          md,
          '未偵測後台登入快取（或已清除）。已產生 Markdown；請複製後貼回檔案。若要從瀏覽器自動寫入 GitHub，請先從 /admin/ 登入後台。',
        );
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
        var text = await res.text();
        var json = null;
        try {
          json = JSON.parse(text);
        } catch (_) {
          json = null;
        }

        if (json && json.ok) {
          if (statusEl) statusEl.textContent = json.message || '客戶 MD 已更新';
          if (fallbackPanel) fallbackPanel.hidden = true;
          return;
        }

        if (res.status === 401) {
          showMarkdownPanel(
            md,
            (json && json.message) || '後台密碼驗證失敗。已產生 Markdown，請複製後手動貼回檔案。',
          );
          return;
        }

        if (json && json.githubConfigured === false) {
          showMarkdownPanel(md, json.message || '請複製 Markdown 貼回檔案後存檔。');
          return;
        }

        showMarkdownPanel(
          md,
          (json && json.message ? json.message + ' ' : '') + '已改為產生 Markdown，請複製下方內容手動更新。',
        );
      } catch (_) {
        showMarkdownPanel(
          md,
          '無法連線 API（本機預覽或未部署 Cloudflare Functions）。請複製 Markdown 貼回專案 content/clients/ 路徑。',
        );
      }
    });
  }
})();
