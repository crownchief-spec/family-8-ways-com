(function () {
  var root = document.getElementById('admin-clients-root');
  if (!root) return;
  var payloadEl = document.getElementById('admin-clients-data');
  if (!payloadEl) return;

  var data = [];
  try {
    data = JSON.parse(payloadEl.textContent || '[]');
  } catch (_) {
    data = [];
  }

  var tbody = document.getElementById('admin-client-list-body');
  var preview = document.getElementById('admin-preview-link');
  var statusInfo = document.getElementById('admin-form-status');

  function nt(num) {
    return 'NT$' + Number(num || 0).toLocaleString('zh-TW');
  }

  function renderRows() {
    if (!tbody) return;
    tbody.innerHTML = '';
    data.forEach(function (item, index) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + (item.isVisible ? '顯示中' : '隱藏') + '</td>' +
        '<td>' + item.clientName + '</td>' +
        '<td>' + item.slug + '</td>' +
        '<td>' + item.shootingDate + '</td>' +
        '<td>' + item.packageName + '</td>' +
        '<td>' + nt(item.totalFee) + '</td>' +
        '<td>' + nt(item.deposit) + '</td>' +
        '<td>' + item.contractStatus + '</td>' +
        '<td>' + item.paymentStatus + '</td>' +
        '<td>' + item.deliveryStatus + '</td>' +
        '<td><a href="/clients/' + item.slug + '/" target="_blank" rel="noopener noreferrer">/clients/' + item.slug + '/</a></td>' +
        '<td class="admin-actions"><button class="btn btn--secondary btn--compact" type="button" data-edit="' + index + '">編輯</button><a class="btn btn--ghost btn--compact" href="/clients/' + item.slug + '/" target="_blank" rel="noopener noreferrer">預覽客戶專區</a></td>';
      tbody.appendChild(tr);
    });
  }

  function setForm(item) {
    var form = document.getElementById('admin-client-form');
    if (!form) return;
    Object.keys(item).forEach(function (key) {
      if (!form.elements[key]) return;
      if (form.elements[key].type === 'checkbox') {
        form.elements[key].checked = !!item[key];
      } else {
        form.elements[key].value = item[key] == null ? '' : item[key];
      }
    });
    if (preview) preview.href = '/clients/' + item.slug + '/';
    if (statusInfo) statusInfo.textContent = '目前編輯：' + item.clientName + '（' + item.slug + '）';
  }

  function bindEvents() {
    if (!tbody) return;
    tbody.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-edit]');
      if (!btn) return;
      var idx = Number(btn.getAttribute('data-edit'));
      if (!Number.isFinite(idx) || !data[idx]) return;
      setForm(data[idx]);
      window.scrollTo({ top: document.getElementById('admin-client-form').offsetTop - 80, behavior: 'smooth' });
    });

    var form = document.getElementById('admin-client-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (statusInfo) statusInfo.textContent = 'Demo 模式：目前僅做前端介面展示，資料尚未寫入後端。';
    });
  }

  renderRows();
  bindEvents();
  if (data[0]) setForm(data[0]);
})();
