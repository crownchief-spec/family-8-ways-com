let activeVideo = null;
function closeVideo({ focus = false } = {}) {
  if (!activeVideo) return;
  const { player, preview } = activeVideo;
  player.replaceWith(preview);
  activeVideo = null;
  if (focus) preview.focus();
}
document.querySelectorAll('[data-video-id]').forEach(button => {
  button.addEventListener('click', () => {
    closeVideo();
    const player = document.createElement('div');
    player.className = 'video-player';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'video-close';
    close.textContent = '關閉影片 ×';
    close.setAttribute('aria-label', `關閉影片：${button.dataset.videoTitle}`);
    close.addEventListener('click', () => closeVideo({ focus: true }));
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/${button.dataset.videoId}?autoplay=1&playsinline=1&rel=0`;
    frame.title = button.dataset.videoTitle;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    frame.className = 'video-frame';
    player.append(close, frame);
    button.replaceWith(player);
    activeVideo = { player, preview: button };
    close.focus();
  });
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeVideo({ focus: true });
});
document.querySelectorAll('[data-search]').forEach(input => {
  function filterCards() {
    const value = input.value.trim().toLocaleLowerCase();
    document.querySelectorAll('[data-search-item]').forEach(card => {
      card.hidden = !(card.textContent + ' ' + (card.dataset.searchKeywords || '')).toLocaleLowerCase().includes(value);
    });
    if (activeVideo?.player.closest('[hidden]')) closeVideo();
    const status = document.querySelector('[data-search-status]');
    if (status) status.textContent = `顯示 ${[...document.querySelectorAll('[data-search-item]')].filter(card => !card.hidden).length} 筆資料`;
  }
  input.addEventListener('input', filterCards);
  if (input.id === 'work-search') {
    const tag = new URLSearchParams(location.search).get('tag');
    if (tag) { input.value = tag; filterCards(); }
  }
});
document.querySelectorAll('[data-copy]').forEach(button => {
  button.addEventListener('click', async () => {
    const text = document.querySelector(button.dataset.copy)?.value;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = '已複製詢問範本';
    } catch {
      button.textContent = '請選取上方文字複製';
    }
  });
});
