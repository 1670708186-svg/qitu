/* 王半仙 v3 · 矿脉（年度矿脉地图 + 月度时机）
   数据：报告 d.dayun.steps / d.analysis.special_events.events / d.career.match_score
   无报告时用演示数据（种子稳定），顶部提示先测报告解锁真实矿脉 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var yearChart = $('yearChart');
  var monthChart = $('monthChart');
  var yearScroll = $('yearScroll');

  var VIEW = { 'year': 'year', 'month': 'month' };
  var view = 'year';
  var reportData = null;
  var profile = 'me';   // 当前视角：me / li / wang
  var nowYear = new Date().getFullYear();

  var GRADE_COLOR = { S: '#e9c46a', A: '#ff9db8', B: '#8ba8d8', C: 'rgba(255,255,255,.30)' };
  var GRADE_SCORE = { S: 95, A: 85, B: 76, C: 63 };
  var GRADE_EMOJI = { S: '👑', A: '💰', B: '📈', C: '🧘' };
  var GRADE_WORD = { S: 'S级 · 天命转折', A: 'A级 · 黄金窗口', B: 'B级 · 平稳中藏机', C: 'C级 · 蓄力之年' };
  var JUDGE = {
    S: '掐指一算，这一年你财库大开，是十年一遇的天命转折。别贪多，认准主线，重仓自己的禀赋。',
    A: '这一年你运势上扬，贵人暗助，适合主动推进关键动作——该出手时就出手。',
    B: '平稳中藏着机会，选对方向就能把矿挖到。别冒进，看准一个点深挖。',
    C: '蓄力之年，别急着爆发。把技能磨利、把人脉养熟，稳住就是胜利。'
  };
  var MONTH_LEVELS = [
    { k: 'rich', nm: '暴富矿', c: '#e9c46a', ds: '财运最旺的波段，主动谈大单、追回款、谈涨薪，容易有实际进账。' },
    { k: 'promo', nm: '晋升窗口', c: '#8ba8d8', ds: '事业运势抬头，适合汇报成果、准备述职、争取带项目，上级更容易看见你。' },
    { k: 'idea', nm: '灵感波段', c: '#b8aee8', ds: '直觉与创意在线，适合头脑风暴、写方案、学新技能、更新作品集。' },
    { k: 'net', nm: '人脉共振', c: '#7fb8a8', ds: '社交能量强，适合约老友、参加行业活动、联系导师，贵人可能在聊天里。' },
    { k: 'steady', nm: '稳固期', c: 'rgba(255,255,255,.32)', ds: '运势平缓，宜低调深耕、整理手头事项、储蓄蓄力，不宜冒险。' }
  ];
  var ACTS = {
    rich: ['主动谈大单 / 追回款', '启动副业或接高价值项目', '大胆提一次涨薪'],
    promo: ['向领导汇报阶段成果', '提前准备述职材料', '争取带一个小项目'],
    idea: ['安排半天做头脑风暴', '报名一门新技能课', '更新作品集 / 写方案'],
    net: ['约老友吃顿饭', '参加一场行业活动', '主动联系导师或前辈'],
    steady: ['把手头事项收尾整理', '学习复盘，别开新战线', '储蓄蓄力，等待下个窗口']
  };

  /* ============ 数据加载 ============ */
  function loadReport() {
    var data = null;
    try { var raw = sessionStorage.getItem('reportData'); if (raw) data = JSON.parse(raw); } catch (e) {}
    if (!data) {
      try {
        var list = JSON.parse(localStorage.getItem('qitu_reports') || '[]');
        var rid = new URLSearchParams(location.search).get('id') || sessionStorage.getItem('currentReportId');
        var hit = rid ? list.find(function (r) { return r.report_id === rid; }) : list[0];
        if (hit && hit.data) data = hit.data;
      } catch (e) {}
    }
    reportData = data;
  }

  function seedFor(id) {
    var h = 0;
    var s = String(id || 'me');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
    return h;
  }
  function rnd(seed) { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  function stable(seed, salt) { return rnd(seedFor(profile) * 7 + salt * 13); }

  /* ============ 年度数据 ============ */
  function yearEvents() {
    if (profile === 'me' && reportData) {
      var events = ((reportData.analysis && reportData.analysis.special_events) || {}).events || [];
      return events.map(function (e) {
        var g = gradeFor(e);
        return { year: e.year, grade: g, emoji: GRADE_EMOJI[g], title: e.title || GRADE_WORD[g], desc: e.desc || JUDGE[g], ev: e };
      });
    }
    // 演示数据（me 无报告 / li / wang）
    var base = profile === 'li' ? 78 : 72;
    var list = [];
    for (var y = nowYear - 1; y <= nowYear + 6; y++) {
      var r = stable('y' + y, y);
      var g;
      if (r > 0.93) g = 'S'; else if (r > 0.75) g = 'A'; else if (r > 0.5) g = 'B'; else g = 'C';
      if (y === nowYear - 1) g = 'C';
      var em = GRADE_EMOJI[g];
      if (g === 'B' && r > 0.62) em = '📈';
      list.push({ year: y, grade: g, emoji: em, title: GRADE_WORD[g], desc: JUDGE[g], demo: true });
    }
    // 至少给 1-2 个亮点年
    if (!list.some(function (e) { return e.grade === 'S'; })) {
      list[list.length - 2].grade = 'S';
      list[list.length - 2].emoji = '👑';
      list[list.length - 2].title = 'S级 · 天命转折';
    }
    return list;
  }

  function gradeFor(ev) {
    var t = ((ev.type || '') + (ev.title || ''));
    if (/转折|天命|财库|爆发|大运|巅峰/.test(t)) return 'S';
    if (/升职|晋升|窗口|贵人|财运|加薪/.test(t)) return 'A';
    if (/机会|跳槽|变动|学习|offer|换岗/.test(t)) return 'B';
    return 'C';
  }

  function yearSeries(events) {
    var byYear = {};
    events.forEach(function (e) { byYear[e.year] = e; });
    var years = [];
    for (var y = nowYear - 1; y <= nowYear + 6; y++) {
      var ev = byYear[y];
      var score;
      if (ev) {
        score = GRADE_SCORE[ev.grade] + Math.floor(stable('s' + y, y) * 6);
      } else {
        score = 68 + Math.floor(stable('f' + y, y) * 14);
      }
      years.push({ year: y, score: score, ev: ev, smooth: !ev });
    }
    return years;
  }

  /* ============ 年度折线图 SVG ============ */
  function renderYearChart() {
    var events = yearEvents();
    var series = yearSeries(events);
    var W = 720, H = 300, padL = 34, padR = 20, padT = 26, padB = 40;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var yMin = 40, yMax = 100;
    var n = series.length;
    var step = plotW / (n - 1);
    function X(i) { return padL + i * step; }
    function Y(v) { return padT + plotH - ((v - yMin) / (yMax - yMin)) * plotH; }

    var g = '<defs><linearGradient id="mineGrad" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0%" stop-color="#e9c46a"/><stop offset="55%" stop-color="#d9578a"/><stop offset="100%" stop-color="#7c6bd6"/>' +
      '</linearGradient></defs>';

    // 网格 + 纵轴
    g += '<g stroke="rgba(255,255,255,.06)" stroke-width="1">';
    for (var v = 40; v <= 100; v += 10) {
      var yv = Y(v);
      g += '<line x1="' + padL + '" y1="' + yv + '" x2="' + (W - padR) + '" y2="' + yv + '"/>';
      g += '<text x="' + (padL - 8) + '" y="' + (yv + 3.5) + '" text-anchor="end" font-size="10" fill="rgba(255,255,255,.35)">' + v + '</text>';
    }
    g += '</g>';

    // 折线（平滑路径）
    var pts = series.map(function (s, i) { return [X(i), Y(s.score)]; });
    g += '<path d="' + smoothPath(pts) + '" fill="none" stroke="url(#mineGrad)" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>';
    // 面积渐变
    g += '<path d="' + smoothPath(pts) + ' L' + (W - padR) + ' ' + (padT + plotH) + ' L' + padL + ' ' + (padT + plotH) + ' Z" fill="url(#areaGrad)" opacity=".18" stroke="none"/>';
    g += '<defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7c6bd6"/><stop offset="100%" stop-color="#7c6bd6" stop-opacity="0"/></linearGradient></defs>';

    // 节点 + emoji + 年份
    series.forEach(function (s, i) {
      var x = X(i), y = Y(s.score);
      var grade = s.ev ? s.ev.grade : 'C';
      var color = s.ev ? GRADE_COLOR[grade] : 'rgba(255,255,255,.35)';
      var r = grade === 'S' ? 7 : (grade === 'A' ? 6 : 5);
      var glow = grade === 'S' ? ' style="filter:drop-shadow(0 0 8px rgba(233,196,106,.8))"' : (grade === 'A' ? ' style="filter:drop-shadow(0 0 6px rgba(255,157,184,.6))"' : '');
      var em = s.ev ? s.ev.emoji : '·';
      g += '<g class="y-node" data-year="' + s.year + '" style="cursor:pointer">' +
        '<circle cx="' + x + '" cy="' + y + '" r="' + (r + 6) + '" fill="transparent"/>' +
        '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + color + '" stroke="rgba(255,255,255,.25)" stroke-width="1"' + glow + '/>' +
        '<text x="' + x + '" y="' + (y - 13) + '" text-anchor="middle" font-size="15">' + em + '</text>' +
        '<text x="' + x + '" y="' + (padT + plotH + 22) + '" text-anchor="middle" font-size="11" fill="' + (s.year === nowYear ? '#e9e6f6' : 'rgba(255,255,255,.42)') + '">' + s.year + '</text>' +
        '</g>';
    });

    yearChart.innerHTML = g;
    yearChart.style.width = W + 'px';
    yearScroll.scrollLeft = Math.max(0, (series.findIndex(function (s) { return s.year === nowYear; }) - 2) * step);

    // 图例
    $('yearLegend').innerHTML = Object.keys(GRADE_COLOR).map(function (k) {
      return '<span class="lg"><i style="background:' + GRADE_COLOR[k] + '"></i>' + k + '级</span>';
    }).join('');

    bindYearNodes(series);
    renderPick(series);
  }

  function smoothPath(pts) {
    if (pts.length < 2) return '';
    var d = 'M' + pts[0][0] + ' ' + pts[0][1];
    for (var i = 1; i < pts.length; i++) {
      var p0 = pts[i - 1], p1 = pts[i];
      var mx = (p0[0] + p1[0]) / 2;
      d += ' C' + mx + ' ' + p0[1] + ',' + mx + ' ' + p1[1] + ',' + p1[0] + ' ' + p1[1];
    }
    return d;
  }

  function bindYearNodes(series) {
    Array.prototype.forEach.call(yearChart.querySelectorAll('.y-node'), function (node) {
      node.addEventListener('click', function () {
        var y = parseInt(node.getAttribute('data-year'), 10);
        var s = series.filter(function (x) { return x.year === y; })[0];
        if (!s) return;
        var ev = s.ev;
        var grade = ev ? ev.grade : 'C';
        var em = ev ? ev.emoji : '🧘';
        var title = ev ? ev.title : GRADE_WORD[grade];
        var desc = ev ? (ev.desc || JUDGE[grade]) : JUDGE[grade];
        var acts = ACTS[actForGrade(grade)] || ACTS.steady;
        openPop(em, y + '年 · 半仙点评', (ev && ev.demo ? '示例视角 · ' : '') + GRADE_WORD[grade], desc, acts, y);
      });
    });
  }

  function actForGrade(g) {
    return { S: 'rich', A: 'promo', B: 'idea', C: 'steady' }[g] || 'steady';
  }

  /* 年度精选卡（最高等级未来年） */
  function renderPick(series) {
    var box = $('pickCard');
    var future = series.filter(function (s) { return s.ev && s.year >= nowYear; });
    var best = future.length
      ? future.slice().sort(function (a, b) { return GRADE_SCORE[b.ev.grade] - GRADE_SCORE[a.ev.grade]; })[0]
      : (series.filter(function (s) { return s.ev; }).slice().sort(function (a, b) { return GRADE_SCORE[b.ev.grade] - GRADE_SCORE[a.ev.grade]; })[0]);
    if (!best || !best.ev) {
      box.innerHTML = '<div class="pc-hd"><span class="pc-emoji">🔮</span><span class="pc-year">矿脉未明</span></div>' +
        '<div class="pc-quote">还没有足够的命盘数据绘制矿脉。先测一份职场天赋报告，我就能告诉你矿藏在哪几年。</div>';
      return;
    }
    var ev = best.ev;
    var g = ev.grade;
    var acts = ACTS[actForGrade(g)] || ACTS.steady;
    box.innerHTML =
      '<div class="pc-hd"><span class="pc-emoji">' + ev.emoji + '</span><span class="pc-year">' + best.year + '年</span><span class="pc-grade">' + GRADE_WORD[g] + '</span></div>' +
      '<div class="pc-title">' + esc(ev.title || '') + '</div>' +
      '<div class="pc-quote">' + (ev.demo ? '示例视角 · ' : '') + '<b>王半仙掐指一算</b>，' + JUDGE[g] + '</div>' +
      '<button class="pc-btn" data-y="' + best.year + '">📜 查看备战清单</button>';
    box.querySelector('.pc-btn').addEventListener('click', function () {
      openPop(ev.emoji, best.year + '年 · 备战清单', GRADE_WORD[g], JUDGE[g], acts, best.year);
    });
  }

  /* ============ 月度时机 ============ */
  function monthSeries() {
    var months = [];
    for (var m = 1; m <= 12; m++) {
      var r = stable('m' + m, m * 3);
      var lv;
      if (r > 0.9) lv = MONTH_LEVELS[0];        // 暴富
      else if (r > 0.72) lv = MONTH_LEVELS[1];  // 晋升
      else if (r > 0.52) lv = MONTH_LEVELS[2];  // 灵感
      else if (r > 0.34) lv = MONTH_LEVELS[3];  // 人脉
      else lv = MONTH_LEVELS[4];                // 稳固
      var score = 45 + Math.floor(stable('v' + m, m) * 55);
      if (lv.k === 'steady') score = 40 + Math.floor(stable('v' + m, m) * 18);
      months.push({ m: m, lv: lv, score: score });
    }
    return months;
  }

  function renderMonthChart() {
    var series = monthSeries();
    var W = 720, H = 300, padL = 34, padR = 20, padT = 26, padB = 40;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var yMin = 40, yMax = 100;
    var step = plotW / 11;
    function X(i) { return padL + i * step; }
    function Y(v) { return padT + plotH - ((v - yMin) / (yMax - yMin)) * plotH; }

    var g = '<g stroke="rgba(255,255,255,.06)" stroke-width="1">';
    for (var v = 40; v <= 100; v += 10) {
      var yv = Y(v);
      g += '<line x1="' + padL + '" y1="' + yv + '" x2="' + (W - padR) + '" y2="' + yv + '"/>';
      g += '<text x="' + (padL - 8) + '" y="' + (yv + 3.5) + '" text-anchor="end" font-size="10" fill="rgba(255,255,255,.35)">' + v + '</text>';
    }
    g += '</g>';

    var pts = series.map(function (s, i) { return [X(i), Y(s.score)]; });
    g += '<path d="' + smoothPath(pts) + '" fill="none" stroke="url(#mineGrad)" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>';
    g += '<defs><linearGradient id="mineGrad2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#e9c46a"/><stop offset="55%" stop-color="#d9578a"/><stop offset="100%" stop-color="#7c6bd6"/></linearGradient></defs>';

    series.forEach(function (s, i) {
      var x = X(i), y = Y(s.score);
      var c = s.lv.c;
      var em = { rich: '💰', promo: '📈', idea: '💡', net: '🤝', steady: '🧘' }[s.lv.k];
      var glow = s.lv.k === 'rich' ? ' style="filter:drop-shadow(0 0 8px rgba(233,196,106,.8))"' : '';
      g += '<g class="m-node" data-m="' + s.m + '" style="cursor:pointer">' +
        '<circle cx="' + x + '" cy="' + y + '" r="11" fill="transparent"/>' +
        '<circle cx="' + x + '" cy="' + y + '" r="' + (s.lv.k === 'steady' ? 4.5 : 6) + '" fill="' + c + '" stroke="rgba(255,255,255,.25)" stroke-width="1"' + glow + '/>' +
        '<text x="' + x + '" y="' + (y - 12) + '" text-anchor="middle" font-size="13">' + em + '</text>' +
        '<text x="' + x + '" y="' + (padT + plotH + 22) + '" text-anchor="middle" font-size="11" fill="rgba(255,255,255,.42)">' + s.m + '月</text>' +
        '</g>';
    });

    monthChart.innerHTML = g;
    $('monthLegend').innerHTML = MONTH_LEVELS.map(function (lv) {
      return '<span class="lg"><i style="background:' + lv.c + '"></i>' + lv.nm + '</span>';
    }).join('');

    Array.prototype.forEach.call(monthChart.querySelectorAll('.m-node'), function (node) {
      node.addEventListener('click', function () {
        var m = parseInt(node.getAttribute('data-m'), 10);
        var s = series.filter(function (x) { return x.m === m; })[0];
        if (!s) return;
        var em = { rich: '💰', promo: '📈', idea: '💡', net: '🤝', steady: '🧘' }[s.lv.k];
        var sig = '<div class="sig">信号：<b>' + s.lv.nm + '</b> · GRI ' + s.score + '　' + s.lv.ds + '</div>';
        var acts = '<div class="acts">' + ACTS[s.lv.k].map(function (a) { return '<span class="ac">' + a + '</span>'; }).join('') + '</div>';
        var ganzhi = gzForMonth(m);
        openPop(em, nowYear + '年' + m + '月 · 行动指令', s.lv.nm + ' · ' + ganzhi, sig + acts, [], m);
      });
    });
  }

  function gzForMonth(m) {
    var stem = '甲乙丙丁戊己庚辛壬癸'[(nowYear + m) % 10];
    var branch = '子丑寅卯辰巳午未申酉戌亥'[(m + 2) % 12];
    return stem + branch + '月';
  }

  /* ============ 弹窗 ============ */
  function openPop(em, title, role, bodyHtml, acts, year) {
    var actsHtml = '';
    if (acts && acts.length) {
      actsHtml = '<div class="acts">' + acts.map(function (a) { return '<span class="ac">' + a + '</span>'; }).join('') + '</div>';
    }
    $('popBox').innerHTML =
      '<div class="pop-hd"><div class="pop-orb glow-orb" data-c1="#b8aee8" data-c2="#d9578a">' + em + '</div><div><div class="nm">' + title + '</div><div class="rs">' + role + '</div></div></div>' +
      '<div class="pop-body">' + bodyHtml + actsHtml + '</div>' +
      '<button class="pop-btn" onclick="MineApp.closePop()">好 的</button>';
    $('popMask').classList.add('show');
  }
  function closePop() { $('popMask').classList.remove('show'); }

  /* ============ 切换用户 ============ */
  var PROFILES = [
    { id: 'me', name: '我的矿脉', icon: '🔮', ds: '基于你的命盘 · 真实数据' },
    { id: 'li', name: '李师傅（示例）', icon: '🧘', ds: '命理导师视角 · 社区分享' },
    { id: 'wang', name: '矿友小王（示例）', icon: '👥', ds: '社区匿名分享 · 已脱敏' }
  ];
  function renderSwitchSheet() {
    $('switchSheet').innerHTML =
      '<div class="switch-hd">切换查看视角</div>' +
      PROFILES.map(function (p) {
        return '<div class="switch-opt" data-id="' + p.id + '">' +
          '<div class="ic">' + p.icon + '</div>' +
          '<div class="tx"><div class="nm">' + p.name + '</div><div class="ds">' + p.ds + '</div></div>' +
          (p.id === profile ? '<span class="cur">当前</span>' : '') +
          '</div>';
      }).join('') +
      '<button class="pop-btn" style="margin-top:0.6rem" onclick="MineApp.closeSwitch()">取 消</button>';
    Array.prototype.forEach.call($('switchSheet').querySelectorAll('.switch-opt'), function (o) {
      o.addEventListener('click', function () {
        profile = o.getAttribute('data-id');
        closeSwitch();
        renderAll();
      });
    });
  }
  function closeSwitch() { $('switchMask').classList.remove('show'); }

  /* ============ 渲染调度 ============ */
  function renderAll() {
    renderYearChart();
    renderMonthChart();
    renderSwitchSheet();
  }

  /* ============ 事件绑定 ============ */
  function bindEvents() {
    Array.prototype.forEach.call($('segSwitch').querySelectorAll('.seg'), function (seg) {
      seg.addEventListener('click', function () {
        var v = seg.getAttribute('data-v');
        if (v === view) return;
        view = v;
        Array.prototype.forEach.call($('segSwitch').querySelectorAll('.seg'), function (s) { s.classList.remove('on'); });
        seg.classList.add('on');
        $('yearView').style.display = v === 'year' ? '' : 'none';
        $('monthView').style.display = v === 'month' ? '' : 'none';
        if (v === 'month') monthChart.style.width = '100%';
      });
    });
    $('switchBtn').addEventListener('click', function () { $('switchMask').classList.add('show'); });
  }

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ============ init ============ */
  loadReport();
  renderAll();
  bindEvents();

  window.MineApp = { closePop: closePop, closeSwitch: closeSwitch };
})();
