/* 王半仙 App 化组件：底部 Tab 栏 + PWA Service Worker 注册 */
(function () {
  'use strict';

  /* ===== Service Worker 注册（仅 web 版；原生 App 壳跳过） ===== */
  if (!window.IS_NATIVE_APP && 'serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

  /* ===== 底部 Tab 栏（v3 独立站点版：5 Tab 指引/矿脉/半仙/社区/我的） ===== */
  try { sessionStorage.setItem('qitu_ui_mode', 'v3'); } catch (e) {}
  function pageUrl(name) {
    return name + '.html';
  }
  /* 线性 icon：24×24、1.5px 细线、无填充（第八节视觉规格） */
  var TABS = [
    {
      key: 'guide', label: '指引', href: pageUrl('daily'),
      icon: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3 L13.6 8.4 L19 10 L13.6 11.6 L12 17 L10.4 11.6 L5 10 L10.4 8.4 Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>'
    },
    {
      key: 'mine', label: '矿脉', href: pageUrl('mine'),
      icon: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 4 H17 L21 10 L12 20 L3 10 Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M3 10 H21 M12 10 L12 20 M7 4 L8.5 10 M17 4 L15.5 10" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>'
    },
    {
      key: 'mentor', label: '半仙', href: pageUrl('chat'), breathe: true,
      icon: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.5"/><path d="M12 3.5 V6 M12 18 V20.5 M3.5 12 H6 M18 12 H20.5 M5.6 5.6 L7.4 7.4 M16.6 16.6 L18.4 18.4 M18.4 5.6 L16.6 7.4 M7.4 16.6 L5.6 18.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    },
    {
      key: 'community', label: '社区', href: pageUrl('energy'),
      icon: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6 H20 V17 H9 L5 20 V17 H4 Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 10.5 H16 M8 13.5 H13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    },
    {
      key: 'profile', label: '我的', href: pageUrl('profile'),
      icon: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8.5" r="3.5" stroke="currentColor" stroke-width="1.5"/><path d="M5 20 C5 15.5 8.5 13.5 12 13.5 C15.5 13.5 19 15.5 19 20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    }
  ];

  // 当前页对应的 tab key（v3 路由）
  var PATH_MAP = {
    'index.html': 'guide', '/index.html': 'guide', '': 'guide',
    'daily.html': 'guide', '/daily.html': 'guide', '/daily': 'guide',
    'mine.html': 'mine', '/mine.html': 'mine', '/mine': 'mine',
    'chat.html': 'mentor', '/chat.html': 'mentor', '/chat': 'mentor',
    '/mentor': 'mentor', 'mentor.html': 'mentor', '/mentor.html': 'mentor',
    'energy.html': 'community', '/energy.html': 'community',
    '/community': 'community', 'community.html': 'community', '/community.html': 'community',
    '/consult': 'community', 'consult.html': 'community', '/consult.html': 'community',
    'report.html': 'guide', '/report.html': 'guide',
    'chart.html': 'guide', '/chart.html': 'guide',
    'share.html': 'guide', '/share.html': 'guide',
    'profile.html': 'profile', '/profile.html': 'profile',
    'login.html': '', '/login.html': '', 'register.html': '', '/register.html': '',
  };

  function currentKey() {
    var p = location.pathname.replace(/\/$/, '') || '/';
    var base = p.split('/').pop() || p; // App 壳下 pathname 可能是 /xxx.html
    return PATH_MAP[p] || PATH_MAP['/' + base] || PATH_MAP[base] || '';
  }

  function init() {
    if (document.getElementById('qituTabbar')) return;

    var active = currentKey();
    var bar = document.createElement('nav');
    bar.id = 'qituTabbar';
    bar.setAttribute('aria-label', '主导航');

    bar.innerHTML =
      '<style>' +
      /* 第八节规格：64px（含安全区）/ 深黑 #0D0D12 / 顶部 1px 极淡分隔线 */
      '#qituTabbar{position:fixed;left:0;right:0;bottom:0;z-index:900;display:flex;justify-content:space-around;' +
      'background:#0D0D12;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);' +
      'border-top:1px solid rgba(255,255,255,0.08);' +
      'padding:0.72rem 0.2rem calc(0.72rem + env(safe-area-inset-bottom,0px));}' +
      '#qituTabbar .tab-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;' +
      'text-decoration:none;color:rgba(255,255,255,0.4);font-size:10px;font-weight:300;letter-spacing:1px;' +
      'padding:0;transition:color .3s ease;position:relative;}' +
      '#qituTabbar .tab-item svg{width:24px;height:24px;transition:transform .3s ease,filter .3s ease;}' +
      /* 选中：白色 + 图标上浮 2px + 柔光扩散 */
      '#qituTabbar .tab-item.active{color:#FFFFFF;}' +
      '#qituTabbar .tab-item.active svg{transform:translateY(-2px);filter:drop-shadow(0 0 7px rgba(184,174,232,0.75));}' +
      /* 下方柔光点 */
      '#qituTabbar .tab-item.active::after{content:"";position:absolute;bottom:0;left:50%;margin-left:-2px;' +
      'width:4px;height:4px;border-radius:50%;background:#FFFFFF;' +
      'box-shadow:0 0 6px #fff,0 0 12px rgba(184,174,232,0.8);animation:tabDot .3s ease;}' +
      '@keyframes tabDot{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}' +
      /* 半仙 Tab：图标呼吸脉动（提示 AI 在等） */
      '#qituTabbar .tab-item.breathe svg{animation:tabBreathe 2.6s ease-in-out infinite;}' +
      '@keyframes tabBreathe{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.12);opacity:1;filter:drop-shadow(0 0 6px rgba(124,107,214,.6))}}' +
      'body{padding-bottom:calc(3.9rem + env(safe-area-inset-bottom,0px)) !important;' +
      'padding-top:env(safe-area-inset-top,0px) !important;}' +
      '@media print{#qituTabbar{display:none !important}body{padding-bottom:0 !important}}' +
      '</style>' +
      TABS.map(function (t) {
        return '<a class="tab-item' + (t.key === active ? ' active' : '') + (t.breathe ? ' breathe' : '') + '" href="' + t.href + '">' +
          t.icon + '<span>' + t.label + '</span></a>';
      }).join('');

    document.body.appendChild(bar);
  }

  /* ===== 悬浮入口（指引/问答/每日能量） =====
     在 v3 报告体系页面（index.html / report.html / chart.html / share.html）显示：
     右下角悬浮胶囊，点击展开【每日指引】【职场问答】【每日能量】快捷入口。 */
  function initFloatingEntry() {
    if (document.getElementById('qituFloatEntry')) return;
    var p = location.pathname.replace(/\/$/, '');
    var page = p.split('/').pop() || 'index.html';
    var showOn = ['index.html', 'report.html', 'chart.html', 'share.html'];
    if (showOn.indexOf(page) === -1) return;

    var fab = document.createElement('div');
    fab.id = 'qituFloatEntry';
    fab.innerHTML =
      '<style>' +
      '#qituFloatEntry{position:fixed;right:1rem;bottom:calc(4.2rem + env(safe-area-inset-bottom,0px));z-index:930;}' +
      '#qituFloatEntry .fab-main{width:3.1rem;height:3.1rem;border-radius:50%;border:1px solid rgba(124,107,214,0.5);' +
      'background:rgba(184,174,232,.14);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);color:#e9e6f6;font-size:1.35rem;cursor:pointer;border:1px solid rgba(184,174,232,.4);' +
      'display:flex;align-items:center;justify-content:center;box-shadow:0 6px 22px rgba(0,0,0,0.5),0 0 16px rgba(124,107,214,0.2);' +
      'transition:transform .25s,box-shadow .25s;}' +
      '#qituFloatEntry .fab-main:active{transform:scale(0.94);}' +
      '#qituFloatEntry .fab-panel{position:absolute;right:0;bottom:calc(3.6rem + 6px);width:9.5rem;' +
      'background:rgba(26,34,38,0.96);border:1px solid rgba(124,107,214,0.35);border-radius:16px;' +
      'box-shadow:0 10px 34px rgba(0,0,0,0.55);padding:0.5rem;opacity:0;pointer-events:none;' +
      'transform:translateY(8px) scale(0.96);transition:all .28s;' +
      'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);}' +
      '#qituFloatEntry.open .fab-panel{opacity:1;pointer-events:auto;transform:translateY(0) scale(1);}' +
      '#qituFloatEntry .fe-item{display:flex;align-items:center;gap:0.6rem;padding:0.62rem 0.7rem;border-radius:11px;' +
      'text-decoration:none;color:rgba(255,255,255,.88);font-size:0.85rem;transition:background .2s;}' +
      '#qituFloatEntry .fe-item:hover{background:rgba(124,107,214,0.1);}' +
      '#qituFloatEntry .fe-item .ic{font-size:1.15rem;width:1.5rem;text-align:center;}' +
      '#qituFloatEntry .fe-item .nm{color:#e9e6f6;font-weight:600;}' +
      '#qituFloatEntry .fe-item .ds{display:block;font-size:0.66rem;color:rgba(255,255,255,.45);margin-top:1px;}' +
      '</style>' +
      '<div class="fab-panel" id="fePanel">' +
      '<a class="fe-item" href="daily.html"><span class="ic">🔮</span>' +
      '<span><span class="nm">每日指引</span><span class="ds">今日黄历 · 幸运指南</span></span></a>' +
      '<a class="fe-item" href="chat.html"><span class="ic">💬</span>' +
      '<span><span class="nm">职场问答</span><span class="ds">命理导师一对一</span></span></a>' +
      '<a class="fe-item" href="energy.html"><span class="ic">⚡</span>' +
      '<span><span class="nm">每日能量</span><span class="ds">锦囊 · 签到</span></span></a>' +
      '</div>' +
      '<div class="fab-main" id="feBtn" aria-label="快捷入口">🔮</div>';

    document.body.appendChild(fab);
    var btn = fab.querySelector('#feBtn');
    var panel = fab.querySelector('#fePanel');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      fab.classList.toggle('open');
    });
    document.addEventListener('click', function (e) {
      if (fab.classList.contains('open') && !fab.contains(e.target)) fab.classList.remove('open');
    });
  }

  /* ===== "添加到主屏幕"引导浮层（v3：在报告体系页面显示） ===== */
  function initInstallGuide() {
    // 已安装（standalone 模式）不再显示
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) return;
    // 用户关闭过就不再烦人（30 天内）
    try {
      var t = parseInt(localStorage.getItem('qitu_a2hs_closed_v3') || '0', 10);
      if (t && Date.now() - t < 30 * 86400 * 1000) return;
    } catch (e) {}
    // 只在 v3 主入口页显示（首页/报告），避免打扰使用中的用户
    var cur = location.pathname.replace(/\/$/, '') || '/';
    var page = cur.split('/').pop() || 'index.html';
    if (['index.html', 'report.html'].indexOf(page) === -1) return;

    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var deferredPrompt = null;

    var layer = document.createElement('div');
    layer.id = 'qituA2HS';
    layer.innerHTML =
      '<style>' +
      '#qituA2HS{position:fixed;left:50%;bottom:calc(4.4rem + env(safe-area-inset-bottom,0px));' +
      'transform:translateX(-50%) translateY(12px);z-index:950;width:min(92vw,340px);' +
      'background:rgba(26,34,38,0.96);border:1px solid rgba(124,107,214,0.4);border-radius:14px;' +
      'box-shadow:0 8px 30px rgba(0,0,0,0.5),0 0 20px rgba(124,107,214,0.12);' +
      'padding:0.95rem 1rem 0.85rem;opacity:0;pointer-events:none;transition:all .4s;' +
      'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);}' +
      '#qituA2HS.show{opacity:1;pointer-events:auto;transform:translateX(-50%) translateY(0);}' +
      '#qituA2HS .hd{display:flex;align-items:center;gap:0.55rem;margin-bottom:0.55rem;}' +
      '#qituA2HS .ic{width:34px;height:34px;border-radius:8px;flex-shrink:0;}' +
      '#qituA2HS .tt{font-size:0.92rem;font-weight:700;color:#e9e6f6;letter-spacing:1px;}' +
      '#qituA2HS .sub{font-size:0.68rem;color:rgba(255,255,255,.5);margin-top:1px;}' +
      '#qituA2HS .steps{font-size:0.76rem;color:rgba(255,255,255,.88);line-height:1.8;margin-bottom:0.55rem;}' +
      '#qituA2HS .steps b{color:#e9e6f6;font-weight:600;}' +
      '#qituA2HS .steps .arr{display:inline-flex;align-items:center;justify-content:center;' +
      'width:17px;height:17px;border-radius:50%;background:rgba(124,107,214,.16);color:#b8aee8;' +
      'font-size:0.62rem;margin:0 2px;vertical-align:-3px;}' +
      '#qituA2HS .btns{display:flex;gap:0.5rem;align-items:center;}' +
      '#qituA2HS .btn{flex:1;border:none;border-radius:999px;padding:0.5rem 0;' +
      'background:rgba(184,174,232,.16);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);color:#e9e6f6;font-weight:500;border:1px solid rgba(184,174,232,.45);' +
      'font-size:0.8rem;cursor:pointer;}' +
      '#qituA2HS .dismiss{background:transparent;border:1px solid rgba(255,255,255,.2);' +
      'color:rgba(255,255,255,.5);font-size:0.78rem;padding:0.5rem 0.9rem;border-radius:999px;cursor:pointer;flex:0 0 auto;}' +
      '</style>' +
      '<div class="hd">' +
      '<img class="ic" src="img/icons/icon-192.png" alt="王半仙">' +
      '<div><div class="tt">把职场天赋装进手机</div><div class="sub">桌面图标 · 全屏直达</div></div>' +
      '</div>' +
      '<div class="steps" id="a2hsSteps"></div>' +
      '<div class="btns"><button class="btn" id="a2hsBtn" style="display:none">立即安装</button>' +
      '<button class="dismiss" id="a2hsClose">暂不需要</button></div>';

    document.body.appendChild(layer);

    var stepsEl = layer.querySelector('#a2hsSteps');
    var btnEl = layer.querySelector('#a2hsBtn');

    if (isIOS) {
      stepsEl.innerHTML = '在 Safari 底部点 <span class="arr">↑</span> 分享按钮，' +
        '然后选 <b>「添加到主屏幕」</b>，桌面就会出现王半仙图标';
    } else if (location.protocol === 'https:') {
      stepsEl.innerHTML = '点浏览器菜单 <span class="arr">⋮</span>，选 <b>「安装应用」</b>或<b>「添加到主屏幕」</b>，桌面即生成图标';
    } else {
      stepsEl.innerHTML = '打开浏览器菜单，选择 <b>「添加到主屏幕」</b>即可安装';
    }

    // Android: 捕获安装事件（Chrome 主动触发时换成一键安装按钮）
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      btnEl.style.display = '';
      stepsEl.innerHTML = '点下方按钮，像原生 App 一样安装到桌面（打开直达新版）';
    });

    btnEl.addEventListener('click', function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () { deferredPrompt = null; hide(); });
    });

    function hide() {
      layer.classList.remove('show');
      setTimeout(function () { if (layer.parentNode) layer.parentNode.removeChild(layer); }, 500);
    }
    layer.querySelector('#a2hsClose').addEventListener('click', function () {
      try { localStorage.setItem('qitu_a2hs_closed_v3', String(Date.now())); } catch (e) {}
      hide();
    });

    // 3 秒后滑入
    setTimeout(function () { layer.classList.add('show'); }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); initInstallGuide(); initFloatingEntry(); });
  } else {
    init();
    initInstallGuide();
    initFloatingEntry();
  }
})();
