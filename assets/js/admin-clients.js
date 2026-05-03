(function () {
  var copyBtn = document.getElementById('copy-client-md-template');
  var source = document.getElementById('client-md-template');
  var status = document.getElementById('copy-template-status');
  if (!copyBtn || !source) return;

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
})();
