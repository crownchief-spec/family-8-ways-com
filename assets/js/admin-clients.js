(function () {
  var copyBtn = document.getElementById('copy-client-md-template');
  var source = document.getElementById('client-md-template');
  var status = document.getElementById('copy-template-status');
  if (copyBtn && source) {
    copyBtn.addEventListener('click', async function () {
      try {
        await navigator.clipboard.writeText(source.value);
        if (status) status.textContent = '已複製 Markdown 範本';
      } catch (_) {
        source.select();
        document.execCommand('copy');
        if (status) status.textContent = '已複製 Markdown 範本';
      }
    });
  }

  var tbody = document.getElementById('admin-client-list-body');
  if (tbody) {
    tbody.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-copy-client-url]');
      if (!btn) return;
      var u = btn.getAttribute('data-copy-client-url') || '';
      if (!u) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(u).catch(function () {});
      }
    });
  }
})();
