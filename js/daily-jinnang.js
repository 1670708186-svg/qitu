/* ============================================================
   王半仙 v3 · 今日职场锦囊（数据化 + 金句接口）
   ------------------------------------------------------------
   数据来源：GET /api/energy/today
   字段：title / theme / quote / energy_score / energy_label /
        do_list / dont_list / lucky.{color,color_hex,direction,numbers,hours} /
        ganzhi / shishen / date / weekday / lunar
   金句接口：window.QituDailySlogans（数组，每条含 text / source）
   未来扩充金句库：直接 push 到 window.QituDailySlogans，本模块会一并进入轮换。
   ============================================================ */
(function () {
  'use strict';

  /* ===== 国学金句数据接口（可扩展） ===== */
  // 用户/平台可向 window.QituDailySlogans 追加更多金句，本模块当日从中选一条（按日期 hash 稳定选择）
  if (!Array.isArray(window.QituDailySlogans)) {
    window.QituDailySlogans = [
      { text: '万变局面，主线不乱。', source: '· 王半仙' },
      { text: '知止而后有定，定而后能静，静而后能安。', source: '《大学》' },
      { text: '凡事预则立，不预则废。', source: '《礼记》' },
      { text: '行有不得，反求诸己。', source: '《孟子》' },
      { text: '不驰于空想，不骛于虚声。', source: '· 李大钊' },
      { text: '但行好事，莫问前程。', source: '· 民间古训' },
      { text: '种一棵树最好的时间是十年前，其次是现在。', source: '· 俗语' },
      { text: '事来则应，事去则忘。', source: '《呻吟语》' },
      { text: '持而盈之，不如其已。', source: '《道德经》' },
      { text: '尽人事，听天命。', source: '· 曾国藩' },
      { text: '内不愧心，外不负俗。', source: '《颜氏家训》' },
      { text: '物来顺应，未来不迎。', source: '· 王阳明' },
    ];
  }
  // 自定义追加（产品/运营可继续往里 push）
  // 例：window.QituDailySlogans.push({ text: '...', source: '...' });

  /* ===== 工具 ===== */
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function pickSlogan(dateStr) {
    var arr = window.QituDailySlogans;
    if (!arr.length) return { text: '保持节奏，稳步前行。', source: '· 王半仙' };
    // 简单的日期 hash：取首项作稳定选择，让用户同一天看到同一金句
    var hash = 0;
    for (var i = 0; i < (dateStr || '').length; i++) hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
    return arr[Math.abs(hash) % arr.length];
  }

  function renderJinNang(d) {
    var slot = document.getElementById('jinnangSlot');
    var loading = document.getElementById('jinnangLoading');
    if (!slot) return;
    if (loading) loading.style.display = 'none';
    var d_ = d || {};
    var title = d_.title || '今日能量场';
    var theme = d_.theme || '';
    var shishen = d_.shishen || '';
    var ganzhi = d_.ganzhi || '';
    var score = parseInt(d_.energy_score, 10) || 0;
    var label = d_.energy_label || '';
    var doList = d_.do_list || [];
    var dontList = d_.dont_list || [];
    var lucky = d_.luck || d_.lucky || {};
    var luckColor = lucky.color || '—';
    var luckHex = lucky.color_hex || '#b8aee8';
    var luckDir = lucky.direction || '—';
    var luckNums = (lucky.numbers || []).join('、') || '—';
    var luckHours = (lucky.hours || []).join(' · ') || '—';
    var slogan = pickSlogan(d_.date);

    var html = ''
      + '<div class="card jn-card">'
      +   '<div class="jn-head">'
      +     '<div class="jn-tag">✦ 今日职场锦囊</div>'
      +     '<div class="jn-ganzhi">' + esc(ganzhi) + ' · ' + esc(shishen) + '当值</div>'
      +   '</div>'
      +   '<h2 class="jn-title">' + esc(title) + '</h2>'
      +   (theme ? '<p class="jn-theme">' + esc(theme) + '</p>' : '')
      +   '<div class="jn-score">'
      +     '<div class="jn-score-num">' + score + '<small>分</small></div>'
      +     '<div class="jn-score-bar"><div class="jn-score-fill" style="width:0%"></div></div>'
      +     '<div class="jn-score-lbl">运势指数</div>'
      +   '</div>'
      +   (label ? '<p class="jn-energy">' + esc(label) + '</p>' : '')
      +   '<div class="jn-do-dont">'
      +     '<div class="jn-do">'
      +       '<div class="jn-do-hd">✓ 今日宜做</div>'
      +       '<ul>' + doList.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>'
      +     '</div>'
      +     '<div class="jn-dont">'
      +       '<div class="jn-dont-hd">⚠ 今日注意</div>'
      +       '<ul>' + dontList.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>'
      +     '</div>'
      +   '</div>'
      +   '<div class="jn-luck">'
      +     '<div class="jn-luck-item"><div class="k">幸运色</div><div class="v"><span class="dot" style="background:' + esc(luckHex) + '"></span>' + esc(luckColor) + '</div></div>'
      +     '<div class="jn-luck-item"><div class="k">方位</div><div class="v">' + esc(luckDir) + '</div></div>'
      +     '<div class="jn-luck-item"><div class="k">数字</div><div class="v">' + esc(luckNums) + '</div></div>'
      +     '<div class="jn-luck-item"><div class="k">吉时</div><div class="v">' + esc(luckHours) + '</div></div>'
      +   '</div>'
      +   '<div class="jn-quote">'
      +     '<div class="jn-quote-text">“' + esc(slogan.text) + '”</div>'
      +     '<div class="jn-quote-by">' + esc(slogan.source) + '</div>'
      +   '</div>'
      + '</div>';

    slot.innerHTML = html;

    // 进度条动画
    setTimeout(function () {
      var f = slot.querySelector('.jn-score-fill');
      if (f) f.style.width = Math.min(100, Math.max(0, score)) + '%';
    }, 220);
  }

  function loadJinNang() {
    // 不阻塞原有 /api/daily 流程；拉取失败则不显示锦囊板块
    if (!window.API_BASE) return;
    fetch(window.API_BASE + '/api/energy/today')
      .then(function (r) { return r.json().catch(function () { return null; }); })
      .then(function (d) { if (d) renderJinNang(d); })
      .catch(function () {});
  }

  // 暴露：允许其它页面复用 / 主动触发
  window.QituDaily = {
    render: renderJinNang,
    reload: loadJinNang,
    slogans: window.QituDailySlogans,
  };

  // 自动加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadJinNang);
  } else {
    loadJinNang();
  }
})();
