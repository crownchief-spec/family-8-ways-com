(function () {
  // 這是簡易前端密碼保護，不是真正安全的權限系統。
  // 正式上線建議改用 Cloudflare Access 或 Cloudflare Pages Functions。
  var ADMIN_PASSWORD = '5551';
  var STORAGE_KEY = 'family_admin_auth_v1';
  var path = window.location.pathname || '/';
  var isAdminPath = path.indexOf('/admin') === 0;
  if (!isAdminPath) return;

  function isAuthed() {
    return sessionStorage.getItem(STORAGE_KEY) === 'ok' || localStorage.getItem(STORAGE_KEY) === 'ok';
  }

  function setAuthed() {
    sessionStorage.setItem(STORAGE_KEY, 'ok');
    localStorage.setItem(STORAGE_KEY, 'ok');
  }

  function clearAuth() {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
  }

  function mountLogout() {
    if (!document.body) return;
    if (document.getElementById('admin-logout-btn')) return;
    var btn = document.createElement('button');
    btn.id = 'admin-logout-btn';
    btn.className = 'btn btn--secondary btn--compact';
    btn.textContent = '登出後台';
    btn.style.position = 'fixed';
    btn.style.top = '14px';
    btn.style.right = '14px';
    btn.style.zIndex = '9999';
    btn.addEventListener('click', function () {
      clearAuth();
      window.location.reload();
    });
    document.body.appendChild(btn);
  }

  function mountGate() {
    var gate = document.createElement('div');
    gate.id = 'admin-auth-gate';
    gate.style.position = 'fixed';
    gate.style.inset = '0';
    gate.style.background = 'rgba(255,255,255,0.96)';
    gate.style.zIndex = '10000';
    gate.style.display = 'grid';
    gate.style.placeItems = 'center';
    gate.innerHTML =
      '<div class="card" style="width:min(92vw,460px);padding:1.2rem;">' +
      '<h1 class="h2" style="margin-top:0;">小巴老師｜親子寫真後台</h1>' +
      '<p class="muted">此區為攝影師內部使用，請輸入後台密碼。</p>' +
      '<label class="field"><span>後台密碼</span><input id="admin-password-input" type="password" autocomplete="current-password" /></label>' +
      '<p id="admin-auth-error" class="error-text" hidden>密碼錯誤，請重新輸入。</p>' +
      '<button id="admin-auth-submit" class="btn btn--primary" type="button">進入後台</button>' +
      '</div>';
    document.body.appendChild(gate);
    var input = document.getElementById('admin-password-input');
    var submit = document.getElementById('admin-auth-submit');
    var error = document.getElementById('admin-auth-error');
    function trySubmit() {
      var val = String((input && input.value) || '');
      if (val === ADMIN_PASSWORD) {
        setAuthed();
        gate.remove();
        mountLogout();
      } else if (error) {
        error.hidden = false;
      }
    }
    if (submit) submit.addEventListener('click', trySubmit);
    if (input) {
      input.focus();
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') trySubmit();
      });
    }
  }

  if (isAuthed()) {
    mountLogout();
  } else {
    mountGate();
  }
})();
