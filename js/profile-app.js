/* 王半仙 v3 · 我的（个人中心）页面逻辑 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var now = Date.now();

  function getLS(key, def) {
    try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return v === null ? def : v; } catch (e) { return def; }
  }
  function setLS(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {}
  }
  function bump(key) {
    var n = parseInt(getLS(key, 0), 10) || 0;
    setLS(key, n + 1);
    return n + 1;
  }
  function fmtNum(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /* ═══════ 1. 个人信息卡 ═══════ */
  var reports = getLS('qitu_reports', []);
  var postMeta = getLS('qitu_post_meta', []);
  var postCount = Array.isArray(postMeta) ? postMeta.length : 0;
  var chatCount = parseInt(getLS('qitu_chat_count', 0), 10) || 0;
  var calibCount = parseInt(getLS('qitu_calibrations', 0), 10) || 0;
  var actionCount = parseInt(getLS('qitu_actions', 0), 10) || 0;

  var loggedIn = !!(window.QituAuth && QituAuth.isLoggedIn());
  var nickname = '矿工小王';
  var phone = '';
  if (loggedIn && window.QituAuth) {
    QituAuth.me().then(function (u) {
      if (u && u.nickname) {
        nickname = u.nickname;
        $('pNick').innerHTML = '<span style="display:inline-block">' + escapeHtml(nickname) + '</span><span class="vip">王半仙旅人</span>';
      }
      if (u && u.phone && QituAuth.maskPhone) {
        phone = QituAuth.maskPhone(u.phone);
        $('setBirth').textContent = phone;
      }
    }).catch(function () {});
  }

  // 职业原型：取最新报告
  var memeName = '职场摆摊人 🧳';
  var memeCode = '';
  if (reports.length) {
    var last = reports[reports.length - 1];
    var d = last.data || {};
    var mc = d.meme_card || (d.analysis && d.analysis.meme_card) || {};
    if (mc.name) { memeName = mc.name; memeCode = mc.code || ''; }
  }
  $('pMeme').innerHTML = '🏅 职业原型：<b>' + escapeHtml(memeName) + (memeCode ? ' <span style="color:var(--text-hint);font-weight:300;font-size:0.62rem">' + escapeHtml(memeCode) + '</span>' : '') + '</b>';

  // 淘金力积分
  var gold = 100 + reports.length * 300 + (loggedIn ? 200 : 0) + postCount * 50 + chatCount * 30;

  /* ═══════ 2. 成就荣誉墙 ═══════ */
  var ACH = [
    { em: '🪙', nm: '第一桶金', unlock: reports.length >= 1 },
    { em: '🌟', nm: '崭露头角', unlock: reports.length >= 2 },
    { em: '💡', nm: '灵感捕手', unlock: reports.length >= 3 },
    { em: '⚡', nm: '天选', unlock: loggedIn },
    { em: '🧭', nm: '问路者', unlock: chatCount >= 1 },
    { em: '📢', nm: '声名远播', unlock: postCount >= 1 },
    { em: '🏆', nm: '矿脉老手', unlock: postCount >= 3 }
  ];
  var unlockedCount = ACH.filter(function (a) { return a.unlock; }).length;
  gold += unlockedCount * 100;
  $('pGold').textContent = fmtNum(gold);
  $('achGrid').innerHTML = ACH.map(function (a) {
    return '<div class="ach-item' + (a.unlock ? ' unlocked' : '') + '">' +
      (a.unlock ? '' : '<span class="lk">🔒</span>') +
      '<span class="em">' + a.em + '</span><span class="nm">' + a.nm + '</span></div>';
  }).join('');

  /* ═══════ 3. 我的咨询（本地订单演示 + 真实会话计数） ═══════ */
  var cons = [
    { k: '待支付', n: 1, hot: true },
    { k: '进行中', n: chatCount > 0 ? 1 : 0, hot: false },
    { k: '已完成', n: Math.max(3, reports.length), hot: false },
    { k: '已取消', n: 0, hot: false }
  ];
  $('conGrid').innerHTML = cons.map(function (c) {
    return '<div class="con-item" onclick="toast(\'' + c.k + (c.n > 0 ? ' ' + c.n + ' 笔，去对话页查看详情' : '暂无记录') + '\')">' +
      '<div class="n' + (c.hot ? ' hot' : '') + '">' + c.n + '</div><div class="k">' + c.k + '</div></div>';
  }).join('');

  /* ═══════ 4. 我的报告 ═══════ */
  var box = $('repList');
  if (reports.length) {
    box.innerHTML = reports.slice(-4).reverse().map(function (r) {
      var d = r.data || {};
      var mc = d.meme_card || (d.analysis && d.analysis.meme_card) || {};
      var t = new Date(r.saved_at || Date.now());
      var p = function (n) { return String(n).padStart(2, '0'); };
      var hasDayun = !!(d.dayun && d.dayun.steps && d.dayun.steps.length);
      return '<a class="rep-item" href="report.html?id=' + encodeURIComponent(r.report_id || '') + '">' +
        '<span class="ic">📜</span>' +
        '<span class="info"><div class="nm">《职业禀赋报告》· ' + escapeHtml(mc.name || '命途报告') + '</div>' +
        '<div class="mt">' + t.getFullYear() + '.' + p(t.getMonth() + 1) + (hasDayun ? ' · 含年度矿脉地图' : '') + '</div></span>' +
        '<span class="ar">→</span></a>';
    }).join('') +
    '<a class="rep-item" href="mine.html"><span class="ic">🗺️</span>' +
    '<span class="info"><div class="nm">《年度矿脉地图》' + (new Date().getFullYear()) + '</div>' +
    '<div class="mt">大运 · 流年 · 升职窗口期</div></span><span class="ar">→</span></a>';
  } else {
    box.innerHTML = '<p style="font-size:0.78rem;color:var(--text-hint);padding:0.6rem 0">暂无报告，先去测一次职场天赋吧。</p>' +
      '<a class="rep-item" href="index.html"><span class="ic">✨</span>' +
      '<span class="info"><div class="nm">生成我的第一份职业禀赋报告</div>' +
      '<div class="mt">免费 · 3 分钟</div></span><span class="ar">→</span></a>';
  }

  /* ═══════ 5. 灵体记忆 ═══════ */
  $('mCalib').textContent = fmtNum(calibCount);
  $('mAction').textContent = fmtNum(actionCount);
  var moodLog = getLS('qitu_mood_log', []);
  var trendLabel = '—';
  if (moodLog.length >= 2) {
    var sum = 0;
    for (var i = 1; i < moodLog.length; i++) sum += (moodLog[i] - moodLog[i - 1]);
    var avg = sum / (moodLog.length - 1);
    trendLabel = avg > 0.05 ? '↑ 上扬' : (avg < -0.05 ? '↓ 波动' : '→ 平稳');
  }
  $('mTrend').textContent = trendLabel;

  // 情绪趋势 spark 线
  var spark = $('memSpark');
  var nctx = spark.getContext('2d');
  var W = 300, H = 52;
  var pts = moodLog.length >= 3 ? moodLog : [0.3, 0.45, 0.38, 0.55, 0.5, 0.68, 0.62];
  var min = Math.min.apply(null, pts), max = Math.max.apply(null, pts);
  var span = (max - min) || 1;
  var xStep = W / (pts.length - 1);
  var g = nctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(124,107,214,.35)');
  g.addColorStop(1, 'rgba(124,107,214,0)');
  nctx.clearRect(0, 0, W, H);
  // 投影填充
  nctx.beginPath();
  nctx.moveTo(0, H);
  var fy = H - 8 - ((pts[0] - min) / span) * (H - 16);
  nctx.lineTo(0, fy);
  for (var i2 = 1; i2 < pts.length; i2++) {
    nctx.lineTo(i2 * xStep, H - 8 - ((pts[i2] - min) / span) * (H - 16));
  }
  nctx.lineTo(W, H);
  nctx.closePath();
  nctx.fillStyle = g;
  nctx.fill();
  // 主曲线
  nctx.strokeStyle = 'rgba(184,174,232,.85)';
  nctx.lineWidth = 1.5;
  nctx.beginPath();
  for (var i3 = 0; i3 < pts.length; i3++) {
    var px = i3 * xStep, py = H - 8 - ((pts[i3] - min) / span) * (H - 16);
    if (i3 === 0) nctx.moveTo(px, py); else nctx.lineTo(px, py);
  }
  nctx.stroke();
  // 末端亮点
  nctx.fillStyle = 'rgba(233,196,106,.95)';
  nctx.beginPath();
  nctx.arc(W - xStep, H - 8 - ((pts[pts.length - 1] - min) / span) * (H - 16), 2.6, 0, Math.PI * 2);
  nctx.fill();

  /* ═══════ 6. 出生档案 ═══════ */
  var birth = getLS('qitu_birth', null);
  if (birth && birth.birth) {
    $('setBirth').textContent = birth.birth + (birth.calendar === 'lunar' ? ' 农历' : ' 公历');
  }

  /* ═══════ 7. 登录态 ═══════ */
  if (loggedIn) {
    var lb = $('loginBtn');
    lb.textContent = '退出登录';
    lb.href = 'javascript:void(0)';
    lb.onclick = function (e) {
      e.preventDefault();
      if (window.QituAuth) QituAuth.clearToken();
      toast('已退出登录');
      setTimeout(function () { location.reload(); }, 500);
    };
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* 暴露给内联 onclick */
  window.toast = function (msg) {
    var t = $('toastBox');
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(window.__toastT);
    window.__toastT = setTimeout(function () { t.style.opacity = '0'; }, 2200);
  };
  window.showAbout = function () { $('aboutMask').classList.add('show'); };
  window.hideAbout = function () { $('aboutMask').classList.remove('show'); };
})();
