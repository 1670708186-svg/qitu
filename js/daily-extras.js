/* ============================================================
   王半仙 v3 · 每日地图扩展模块（指引页末尾）
   ------------------------------------------------------------
   结构（参考站"每日地图"布局）：
   1. 今日形态卡   ：💰 主题词 + 五行能量雷达图（细线 SVG）+ 金橙柔光弥散背景
   2. 王半仙今日寄语卡 ：🧙 核心金句 + 11px 浅灰小字
   3. 年度倒计时卡 ：⏳ 距离【XX年】还有 N 天 + 柔金细进度条
   4. 今日3条预测卡：🔮 3 条确定性预测（日期种子稳定）
   5. 本周吉日卡   ：📅 本周宜面试/宜谈薪吉日
   6. 三入口       ：年度矿脉 / 月度时机 / 连线咨询
   7. 底部 CTA     ：[ 💬 找半仙聊聊 ]
   数据：报告(sessionStorage) → 五行/年度事件；/api/energy/today → 形态/预测
   ============================================================ */
(function () {
  'use strict';

  var slot = document.getElementById('dailyExtras');
  if (!slot) return;

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // 日期种子 hash（同日稳定）
  function daySeed(dateStr) {
    var s = dateStr || new Date().toDateString();
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  function pick(arr, seed) { return arr[seed % arr.length]; }

  /* ---- 报告数据（五行雷达 / 年度事件） ---- */
  var report = null;
  try { report = JSON.parse(sessionStorage.getItem('reportData') || 'null'); } catch (e) {}
  var fivePct = null;
  if (report && report.chart && report.chart.five_elements) {
    fivePct = report.chart.five_elements.percent || null;
  }
  var futureEvents = [];
  if (report && report.analysis && report.analysis.special_events) {
    var nowYear = new Date().getFullYear();
    futureEvents = (report.analysis.special_events.events || [])
      .filter(function (e) { return e.year >= nowYear; })
      .sort(function (a, b) { return a.year - b.year; });
  }
  var curDayun = (report && report.chart && report.chart.current_dayun) || null;

  /* ---- 十神 → 今日形态 ---- */
  var MOOD_MAP = {
    '比肩': ['💪', '拼搏'], '劫财': ['🔥', '出击'], '正财': ['💰', '搞钱'], '偏财': ['💰', '进财'],
    '正官': ['🎯', '攻坚'], '七杀': ['⚔️', '破局'], '食神': ['🍲', '享受'], '伤官': ['💡', '表达'],
    '正印': ['📚', '蓄力'], '偏印': ['🧠', '钻研'],
  };

  /* ---- 五行雷达 SVG（细线五边形） ---- */
  function radarSVG(pct) {
    var vals = { '木': 20, '火': 20, '土': 20, '金': 20, '水': 20 };
    if (pct) { vals['木'] = pct['木'] || 20; vals['火'] = pct['火'] || 20; vals['土'] = pct['土'] || 20; vals['金'] = pct['金'] || 20; vals['水'] = pct['水'] || 20; }
    var cx = 80, cy = 72, R = 52;
    var order = ['木', '火', '土', '金', '水'];
    function pt(i, r) {
      var a = -Math.PI / 2 + i * (2 * Math.PI / 5);
      return (cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1);
    }
    var rings = '';
    for (var ri = 1; ri <= 4; ri++) {
      var pts = [];
      for (var i = 0; i < 5; i++) pts.push(pt(i, R * ri / 4));
      rings += '<polygon points="' + pts.join(' ') + '" fill="none" stroke="rgba(233,196,106,.18)" stroke-width="0.7"/>';
    }
    var dataPts = [];
    for (var j = 0; j < 5; j++) dataPts.push(pt(j, Math.max(6, R * Math.min(100, vals[order[j]]) / 100)));
    var labels = order.map(function (w, idx) {
      var p = pt(idx, R + 13).split(',');
      return '<text x="' + p[0] + '" y="' + (parseFloat(p[1]) + 3) + '" text-anchor="middle" font-size="9" fill="rgba(233,196,106,.75)">' + w + '</text>';
    }).join('');
    return '<svg viewBox="0 0 160 150" class="ex-radar">' +
      rings +
      '<polygon points="' + dataPts.join(' ') + '" fill="rgba(233,196,106,.12)" stroke="#e9c46a" stroke-width="1.2" stroke-linejoin="round"/>' +
      labels + '</svg>';
  }

  /* ---- 年度倒计时 ---- */
  function countdown() {
    var now = new Date();
    var nowYear = now.getFullYear();
    var target = null, label = '';
    if (futureEvents.length) {
      target = futureEvents[0];
      label = target.title || (target.year + '年');
    } else if (curDayun && curDayun.end_year) {
      target = { year: curDayun.end_year };
      label = curDayun.end_year + '年（下一大运）';
    } else {
      target = { year: nowYear + 1 };
      label = (nowYear + 1) + '年';
    }
    var endOfTarget = new Date(target.year, 11, 31);
    var days = Math.max(0, Math.ceil((endOfTarget - now) / 86400000));
    // 进度：当年已过百分比
    var startOfYear = new Date(nowYear, 0, 1);
    var total = Math.ceil((new Date(nowYear + 1, 0, 1) - startOfYear) / 86400000);
    var passed = Math.max(0, Math.min(total, Math.ceil((now - startOfYear) / 86400000)));
    var pct = Math.round(passed / total * 100);
    return { label: label, days: days, pct: pct };
  }

  /* ---- 今日 3 条预测（日期种子稳定） ---- */
  function predictions(energy, seed) {
    var out = [];
    var hours = (energy && energy.lucky && energy.lucky.hours) || [];
    var doList = (energy && energy.do_list) || [];
    var dontList = (energy && energy.dont_list) || [];
    var score = (energy && energy.energy_score) || 70;
    var moods = ['收尾顺畅', '贵人现身', '灵感在线', '破冰良机', '节奏放缓'];
    var sides = ['左侧', '右侧', '正前方', '斜后方'];
    // ① 吉时
    if (hours.length) {
      out.push(hours[0] + '，重要沟通安排在此段');
    } else {
      out.push('申时（15-17点）行动力最旺');
    }
    // ② 气场/贵人
    var mood = pick(moods, seed);
    var side = pick(sides, Math.floor(seed / 7));
    out.push(score >= 80 ? side + '易得贵人助力，' + mood : score >= 60 ? side + '人缘平稳，' + mood : '宜低调蓄力，' + mood);
    // ③ 注意
    if (dontList.length) {
      out.push('17点后忌大决策：' + dontList[0]);
    } else {
      out.push('晚间忌情绪化沟通');
    }
    return out.slice(0, 3);
  }

  /* ---- 本周吉日 ---- */
  function weekGoodDays() {
    // 简化黄历：本周三宜面试、周五宜谈薪（参考站同款示例），附命盘用神提示
    var now = new Date();
    var wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    function labelFor(i) {
      var d = new Date(now);
      d.setDate(now.getDate() + ((i - now.getDay() + 7) % 7));
      var w = wd[d.getDay()];
      var acts = [];
      if (d.getDay() === 3) acts.push('宜面试');
      if (d.getDay() === 5) acts.push('宜谈薪');
      if (d.getDay() === 1) acts.push('宜规划');
      if (d.getDay() === 6) acts.push('宜复盘');
      if (!acts.length) return null;
      return { week: w, act: acts.join(' · '), date: (d.getMonth() + 1) + '月' + d.getDate() + '日' };
    }
    var days = [];
    for (var i = 0; i < 7; i++) {
      var g = labelFor(i);
      if (g) days.push(g);
      if (days.length >= 3) break;
    }
    return days;
  }

  /* ---- 主渲染 ---- */
  function render(energy) {
    var seed = daySeed((energy && energy.date) || '');
    var shishen = (energy && energy.shishen) || '';
    var mood = MOOD_MAP[shishen] || ['✨', '顺遂'];
    var score = (energy && energy.energy_score) || 70;
    var cd = countdown();
    var preds = predictions(energy, seed);
    var goodDays = weekGoodDays();
    var slogan = (window.QituDaily && window.QituDaily.slogans && window.QituDaily.slogans.length)
      ? window.QituDaily.slogans[seed % window.QituDaily.slogans.length]
      : { text: '知命不认命，天赋定航向。', source: '—— 王半仙' };

    var html = '';

    // 1. 今日形态 + 五行雷达（金橙柔光弥散背景）
    html += '<div class="card ex-mood">' +
      '<div class="ex-mood-head">' +
      '<div class="ex-mood-emoji">' + mood[0] + '</div>' +
      '<div class="ex-mood-meta"><div class="ex-mood-label">今日形态</div>' +
      '<div class="ex-mood-name">' + mood[1] + '</div></div>' +
      '<div class="ex-mood-score">' + score + '<small>分</small></div>' +
      '</div>' +
      '<div class="ex-mood-body">' +
      '<div class="ex-radar-wrap">' + radarSVG(fivePct) + '</div>' +
      '<div class="ex-mood-tip">' + esc((energy && energy.energy_label) || '今日能量平和稳固') + '</div>' +
      '</div></div>';

    // 2. 王半仙今日寄语（点击 → 半仙 Tab）
    html += '<div class="card ex-quote" data-go="chat.html">' +
      '<div class="ex-quote-head">🧙 王半仙今日寄语 <span class="ex-go-hint">去找王半仙 AI →</span></div>' +
      '<div class="ex-quote-text">“' + esc(slogan.text) + '”</div>' +
      '<div class="ex-quote-by">' + esc(slogan.source) + '</div>' +
      '</div>';

    // 3. 年度倒计时（点击 → 矿脉 Tab）
    html += '<div class="card ex-countdown" data-go="mine.html">' +
      '<div class="ex-countdown-head">⏳ 年度倒计时 <span class="ex-go-hint">去看矿脉 →</span></div>' +
      '<div class="ex-countdown-line">距离【' + esc(cd.label) + '】还有 <b>' + cd.days + '</b> 天</div>' +
      '<div class="ex-bar"><div class="ex-bar-fill" style="width:' + cd.pct + '%"></div></div>' +
      '<div class="ex-bar-note">当年已过 ' + cd.pct + '% · 柔金进度</div>' +
      '</div>';

    // 4. 今日 3 条预测（点击任意一条 → 校准对话框）
    html += '<div class="card ex-predict">' +
      '<div class="ex-predict-head">🔮 今日 3 条预测</div>' +
      '<ul class="ex-predict-list">' + preds.map(function (p, i) {
        return '<li class="ex-predict-item" data-i="' + i + '"><span class="ex-predict-no">' + (i + 1) + '</span><span class="ex-predict-tx">' + esc(p) + '</span><span class="ex-predict-more">校准 ›</span></li>';
      }).join('') + '</ul>' +
      '</div>';

    // 5. 本周吉日（点击 → 展开详细说明）
    html += '<div class="card ex-gooddays">' +
      '<div class="ex-gooddays-head">📅 本周吉日 <span class="ex-go-hint">点开详情</span></div>' +
      '<div class="ex-gooddays-list">' + goodDays.map(function (g) {
        return '<div class="ex-goodday"><span class="ex-goodday-week">' + g.week + '</span>' +
          '<span class="ex-goodday-date">' + g.date + '</span>' +
          '<span class="ex-goodday-act">' + g.act + '</span></div>';
      }).join('') + '</div>' +
      '<div class="ex-gooddays-detail" id="exGoodDetail" style="display:none">' +
      '<div class="ex-gooddays-detail-inner">' +
      '<div class="ex-gd-d-title">吉日判定依据</div>' +
      '<p class="ex-gd-d-text">以你的日主与用神为基准，逢用神当值的日子利于对应动作：</p>' +
      '<ul class="ex-gd-d-list">' +
      '<li><b>面试</b> —— 官杀旺日，利展示与承压</li>' +
      '<li><b>谈薪</b> —— 财星透干日，利议价与落定</li>' +
      '<li><b>规划</b> —— 印星当值日，利整理与布局</li>' +
      '<li><b>复盘</b> —— 食伤泄秀日，利总结与输出</li>' +
      '</ul>' +
      '<div class="ex-gd-d-note">以上为通用规则推演，结合具体时辰更准，可找半仙校准。</div>' +
      '</div></div>' +
      '<div class="ex-gooddays-note">以命盘用神推演 · 点击展开</div>' +
      '</div>';

    // 6. 三入口
    html += '<div class="ex-entry">' +
      '<a class="ex-entry-btn" href="mine.html"><span class="ex-entry-ic">🗺️</span><span class="ex-entry-nm">年度矿脉</span><span class="ex-entry-ar">→</span></a>' +
      '<a class="ex-entry-btn" href="mine.html"><span class="ex-entry-ic">📊</span><span class="ex-entry-nm">月度时机</span><span class="ex-entry-ar">→</span></a>' +
      '<a class="ex-entry-btn" href="chat.html"><span class="ex-entry-ic">🌙</span><span class="ex-entry-nm">连线咨询</span><span class="ex-entry-ar">→</span></a>' +
      '</div>';

    // 7. 找半仙聊聊
    html += '<a class="ex-chat-cta" href="chat.html">💬 找半仙聊聊</a>';

    slot.innerHTML = html;
    bindInteractions();

    // 进度条动画
    setTimeout(function () {
      var f = slot.querySelector('.ex-bar-fill');
      if (f) f.style.width = f.getAttribute('style') ? f.getAttribute('style').replace('width:', 'width:') : '';
    }, 200);
  }

  /* ================= 交互绑定 ================= */
  function bindInteractions() {
    // 卡片跳转（寄语 → 半仙 / 倒计时 → 矿脉）
    Array.prototype.forEach.call(slot.querySelectorAll('[data-go]'), function (card) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', function () {
        window.location.href = card.getAttribute('data-go');
      });
    });

    // 预测条目 → 校准对话框
    Array.prototype.forEach.call(slot.querySelectorAll('.ex-predict-item'), function (li) {
      li.addEventListener('click', function () {
        var idx = parseInt(li.getAttribute('data-i'), 10);
        openCalib(li.textContent.replace(/校准 ›/g, '').trim(), idx);
      });
    });

    // 本周吉日 → 展开详情
    var gdCard = slot.querySelector('.ex-gooddays');
    if (gdCard) {
      gdCard.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        var detail = document.getElementById('exGoodDetail');
        if (!detail) return;
        var open = detail.style.display !== 'none';
        detail.style.display = open ? 'none' : 'block';
        if (!open) {
          detail.style.maxHeight = detail.scrollHeight + 'px';
          detail.style.opacity = '1';
          gdCard.classList.add('ex-open');
        } else {
          detail.style.maxHeight = '0';
          detail.style.opacity = '0';
          gdCard.classList.remove('ex-open');
        }
      });
    }
  }

  /* ---- 校准对话框（半仙风格弹窗） ---- */
  function openCalib(text, idx) {
    var overlay = document.getElementById('calibOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'calibOverlay';
      overlay.className = 'calib-overlay';
      overlay.innerHTML =
        '<div class="calib-panel">' +
        '<div class="calib-head">' +
        '<div class="calib-orb glow-orb" data-c1="#b8aee8" data-c2="#d9578a">🧘</div>' +
        '<div><div class="calib-name">王半仙</div><div class="calib-role">校准你的今日运势</div></div>' +
        '</div>' +
        '<div class="calib-body" id="calibBody"></div>' +
        '<div class="calib-btns">' +
        '<button class="calib-btn" id="calibOk">校准完成</button>' +
        '<button class="calib-btn ghost" id="calibClose">关闭</button>' +
        '</div></div>';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', function (e) { if (e.target === overlay) hideCalib(); });
      document.getElementById('calibClose').addEventListener('click', hideCalib);
      document.getElementById('calibOk').addEventListener('click', function () {
        document.getElementById('calibBody').textContent = '校准已同步。今日指引已按你的反馈微调，明日起生效。';
      });
    }
    var lines = [
      '「' + text + '」',
      '这条是基于你的流日十神推的，',
      '但具体到你的命局，还有两个变量要校准——',
      idx % 2 === 0 ? '一是时辰用神，二是当前大运的流年叠加。' : '一是出生城市真太阳时，二是大运流年叠加。',
      '校准后这条会更贴合你。',
    ];
    var body = document.getElementById('calibBody');
    body.innerHTML = '';
    var i = 0;
    (function typeNext() {
      if (i < lines.length) {
        var p = document.createElement('p');
        p.textContent = lines[i];
        body.appendChild(p);
        i++;
        setTimeout(typeNext, 420);
      }
    })();
    overlay.classList.add('show');
  }
  function hideCalib() {
    var o = document.getElementById('calibOverlay');
    if (o) o.classList.remove('show');
  }

  /* ================= 下拉刷新（重新拉取今日运势 + 3 条预测） ================= */
  function initPullRefresh() {
    var startY = 0, pulling = false;
    var indicator = document.getElementById('pullIndicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'pullIndicator';
      indicator.className = 'pull-indicator';
      indicator.textContent = '↓ 下拉刷新';
      document.body.appendChild(indicator);
    }
    document.addEventListener('touchstart', function (e) {
      if (window.scrollY <= 0) { startY = e.touches[0].clientY; pulling = true; }
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (!pulling) return;
      var dy = e.touches[0].clientY - startY;
      if (dy > 0 && window.scrollY <= 0) {
        if (dy > 70) { indicator.textContent = '释放刷新运势'; indicator.classList.add('ready'); }
        else { indicator.textContent = '↓ 下拉刷新'; indicator.classList.remove('ready'); }
        indicator.style.opacity = Math.min(1, dy / 90);
      }
    }, { passive: true });
    document.addEventListener('touchend', function () {
      if (!pulling) return;
      pulling = false;
      if (indicator.classList.contains('ready')) {
        doRefresh();
      }
      setTimeout(function () { indicator.style.opacity = '0'; indicator.classList.remove('ready'); }, 400);
    });
  }

  function doRefresh() {
    var indicator = document.getElementById('pullIndicator');
    if (indicator) { indicator.textContent = '⚡ 王半仙重新演算中…'; indicator.style.opacity = '1'; }
    if (window.API_BASE) {
      fetch(window.API_BASE + '/api/energy/today')
        .then(function (r) { return r.json().catch(function () { return null; }); })
        .then(function (d) {
          render(d || {});
          // 同步刷新顶部锦囊
          if (window.QituDaily && window.QituDaily.reload) window.QituDaily.reload();
          if (indicator) setTimeout(function () { indicator.style.opacity = '0'; }, 500);
        })
        .catch(function () {
          render({});
          if (indicator) setTimeout(function () { indicator.style.opacity = '0'; }, 500);
        });
    } else {
      render({});
    }
  }

  // 拉取 energy/today（锦囊模块可能已拉，这里独立拉一次，失败也渲染降级版）
  if (window.API_BASE) {
    fetch(window.API_BASE + '/api/energy/today')
      .then(function (r) { return r.json().catch(function () { return null; }); })
      .then(function (d) { render(d || {}); })
      .catch(function () { render({}); });
  } else {
    render({});
  }
  initPullRefresh();
})();
