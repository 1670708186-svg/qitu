/* 王半仙 · 登录 / 注册
   复用原站后端认证接口（CORS 已开）：
   - POST /api/auth/login    {phone, password}          → {token, ...}
   - POST /api/auth/register {phone, password, code?, nickname?} → {token, ...}
   - POST /api/auth/send_code {phone}                   → 发短信验证码（注册选填）
   登录成功：存 token → 取用户信息 → 迁移本地旧报告到账号 → 回跳 redirect 页
   同一账号在手机/电脑登录后，报告数据（八字命盘）自动云端互通。 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var API = window.API_BASE || '';
  var redirect = (new URLSearchParams(location.search).get('redirect')) || 'profile.html';
  // 防跳转逃逸：只允许站内相对路径
  if (!/^[a-z0-9_./-]+\.html(\?.*)?$/i.test(redirect) || redirect.indexOf('//') !== -1 || redirect.indexOf(':') !== -1) {
    redirect = 'profile.html';
  }

  var mode = 'login'; // login | register
  var busy = false;
  var cooldown = 0;

  function toast(msg, ok) {
    var t = $('toastBox');
    t.textContent = msg;
    t.style.borderColor = ok === false ? 'rgba(255,154,138,.6)' : 'rgba(217,87,138,.45)';
    t.style.opacity = '1';
    clearTimeout(window.__tT);
    window.__tT = setTimeout(function () { t.style.opacity = '0'; }, 2600);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function setBusy(b) {
    busy = b;
    $('submitBtn').disabled = b;
    $('submitBtn').textContent = b ? (mode === 'login' ? '登录中…' : '注册中…') : (mode === 'login' ? '登 录' : '注 册');
  }
  function validPhone(p) { return /^1[3-9]\d{9}$/.test(p); }

  function switchMode(m) {
    mode = m;
    $('tabLogin').classList.toggle('active', m === 'login');
    $('tabReg').classList.toggle('active', m === 'register');
    $('regOnly').style.display = m === 'register' ? 'block' : 'none';
    $('cardSub').textContent = m === 'login' ? '登录后，手机/电脑同一账号共享命盘与报告' : '注册即同步 · 一份命盘多端互通';
    $('submitBtn').textContent = m === 'login' ? '登 录' : '注 册';
  }

  function afterAuth(token, exp) {
    if (!window.QituAuth) { location.href = redirect; return; }
    QituAuth.setToken(token, exp);
    // 迁移本地旧报告到账号（静默，不阻塞）
    QituAuth.migrateLocalReports().catch(function () {});
    // 拉用户信息（成功与否都进入应用）
    QituAuth.me().then(function () { location.href = redirect; }).catch(function () { location.href = redirect; });
  }

  function doLogin() {
    var phone = $('phone').value.trim();
    var password = $('password').value;
    if (!validPhone(phone)) { toast('请输入 11 位手机号', false); return; }
    if (password.length < 6) { toast('密码至少 6 位', false); return; }
    if (busy) return;
    setBusy(true);
    fetch(API + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone, password: password })
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); }).then(function (res) {
      setBusy(false);
      var d = res.d || {};
      var token = d.token || d.access_token;
      if (res.ok && token) { toast('登录成功，正在同步…'); afterAuth(token, d.exp || d.token_exp); }
      else { toast(d.detail || d.message || '登录失败，请重试', false); }
    }).catch(function () { setBusy(false); toast('网络异常，请稍后再试', false); });
  }

  function doRegister() {
    var phone = $('phone').value.trim();
    var password = $('password').value;
    var code = $('code').value.trim();
    var nickname = $('nickname').value.trim();
    if (!validPhone(phone)) { toast('请输入 11 位手机号', false); return; }
    if (password.length < 6) { toast('密码至少 6 位', false); return; }
    if (busy) return;
    setBusy(true);
    var body = { phone: phone, password: password };
    if (code) body.code = code;
    if (nickname) body.nickname = nickname;
    fetch(API + '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); }).then(function (res) {
      setBusy(false);
      var d = res.d || {};
      var token = d.token || d.access_token;
      if (res.ok && token) { toast('注册成功，正在同步…'); afterAuth(token, d.exp || d.token_exp); }
      else if (res.ok) { toast('注册成功，请登录'); switchMode('login'); }
      else { toast(d.detail || d.message || '注册失败，请重试', false); }
    }).catch(function () { setBusy(false); toast('网络异常，请稍后再试', false); });
  }

  function sendCode() {
    var phone = $('phone').value.trim();
    if (!validPhone(phone)) { toast('请输入 11 位手机号', false); return; }
    if (cooldown > 0) return;
    $('sendCode').disabled = true;
    fetch(API + '/api/auth/send_code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone })
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); }).then(function (res) {
      if (res.ok) {
        toast('验证码已发送（可留空直接注册）');
        cooldown = 60;
        var t = setInterval(function () {
          cooldown--;
          $('sendCode').textContent = cooldown > 0 ? cooldown + 's' : '获取验证码';
          if (cooldown <= 0) { clearInterval(t); $('sendCode').disabled = false; }
        }, 1000);
      } else {
        $('sendCode').disabled = false;
        toast((res.d && (res.d.detail || res.d.message)) || '发送失败', false);
      }
    }).catch(function () { $('sendCode').disabled = false; toast('网络异常，请稍后再试', false); });
  }

  function init() {
    // 已登录直接进应用
    if (window.QituAuth && QituAuth.isLoggedIn()) {
      // 有 token 但可能已过期，交给目标页 me() 校验；此处直接回跳
      location.href = redirect;
      return;
    }
    switchMode('login');
    $('tabLogin').addEventListener('click', function () { switchMode('login'); });
    $('tabReg').addEventListener('click', function () { switchMode('register'); });
    $('submitBtn').addEventListener('click', function () { if (mode === 'login') doLogin(); else doRegister(); });
    $('sendCode').addEventListener('click', sendCode);
    $('backLink').addEventListener('click', function (e) { e.preventDefault(); history.length > 1 ? history.back() : (location.href = redirect); });
    $('phone').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('password').focus(); });
    $('password').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('submitBtn').click(); });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
