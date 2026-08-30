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

  var GRADE_DEF = {
    S: { fill: 'url(#gradS)', stroke: '#e9c46a', em: '👑', tag: '👑 天命转折 / 💰 暴富机遇', tip: 'S级 80-100', glow: 'rgba(233,196,106,.85)' },
    A: { fill: 'url(#gradA)', stroke: '#ff9db8', em: '📈', tag: '📈 事业升迁 / 💵 财源广进', tip: 'A级 60-79', glow: 'rgba(255,157,184,.65)' },
    B: { fill: 'url(#gradB)', stroke: '#8ba8d8', em: '🌱', tag: '🌱 平稳积蓄', tip: 'B级 40-59', glow: 'rgba(139,168,216,.55)' },
    C: { fill: 'url(#gradC)', stroke: 'rgba(255,255,255,.30)', em: '🧘', tag: '🧘 韬光养晦', tip: 'C级 <40', glow: 'rgba(255,255,255,.15)' }
  };
  var GRADE_WORD = { S: 'S级 · 天命转折', A: 'A级 · 黄金窗口', B: 'B级 · 平稳中藏机', C: 'C级 · 蓄力之年' };
  // 由分数反推等级
  function gradeForScore(s) { return s >= 80 ? 'S' : s >= 60 ? 'A' : s >= 40 ? 'B' : 'C'; }
  // 年度淘金评分 = 喜用神状态(40) + 财官引动(40) + 结构爆发(20)
  function yearScore(ev, y) {
    var yongshen, caiguan, baofa;
    var t = ev ? ((ev.type || '') + (ev.title || '')) : '';
    if (ev) {
      yongshen = /喜神|用神|大运|贵人|食神|正印|偏印/.test(t) ? 35
                : /忌神|破格|劫煞|七杀|伤官|枭神/.test(t) ? 14 : 24;
      caiguan  = /财|官|升|职|薪|库|贵人|offer|加薪|正财|偏财|正官|七杀/.test(t) ? 34
                : /学|学|习|转|换|平台|资源|努力|踏实|稳|修/.test(t) ? 20 : 26;
      baofa    = /转折|天命|财库|爆发|巅峰|大运|重组|跃迁|新局|高光|突破/.test(t) ? 18
                : /贵人|升职|晋升|窗口|offer|加薪|新机|启动|合作|扩张/.test(t) ? 14
                : /平稳|学习|蓄力|积累|沉淀|沉淀|修整|缓步|低调/.test(t) ? 6 : 10;
    } else {
      yongshen = 22 + Math.floor(stable('s' + y, y) * 12);
      caiguan  = 22 + Math.floor(stable('s' + y, y + 100) * 12);
      baofa    = 8  + Math.floor(stable('s' + y, y + 200) * 8);
    }
    var total = yongshen + caiguan + baofa;
    return Math.max(0, Math.min(100, total));
  }
  var JUDGE = {
    S: '掐指一算，这一年你财库大开，是十年一遇的天命转折。别贪多，认准主线，重仓自己的禀赋。',
    A: '这一年你运势上扬，贵人暗助，适合主动推进关键动作——该出手时就出手。',
    B: '平稳中藏着机会，选对方向就能把矿挖到。别冒进，看准一个点深挖。',
    C: '蓄力之年，别急着爆发。把技能磨利、把人脉养熟，稳住就是胜利。'
  };
  // GRI 月度时机引擎：信号 / 专属词 / 触发条件 / 行动指令 / 权重区间
  // 术语原则：只有"进财"场景用「矿」，其它用 窗口/波段/共振/期
  // explain 为详细建议文案（后期填充，非空时本月建议卡自动展开显示）
  var MONTH_LEVELS = [
    { k: 'rich', nm: '暴富矿', word: '矿', em: '🥇', c: '#e9c46a', trigger: '偏财+食伤', act: '短线变现，联系提成客户。', range: [75, 95], explain: '' },
    { k: 'promo', nm: '晋升窗口', word: '窗口', em: '🚀', c: '#8ba8d8', trigger: '官印相生', act: '汇报带解决方案。', range: [80, 92], explain: '' },
    { k: 'idea', nm: '灵感波段', word: '波段', em: '🧠', c: '#b8aee8', trigger: '伤官佩印', act: '把新框架写进PPT。', range: [65, 85], explain: '' },
    { k: 'net', nm: '人脉共振', word: '共振', em: '🤝', c: '#7fb8a8', trigger: '比劫+合局', act: '约客户喝咖啡，聊兴趣。', range: [60, 80], explain: '' },
    { k: 'steady', nm: '稳固期', word: '期', em: '⛰️', c: 'rgba(255,255,255,.32)', trigger: '财官双美', act: '签约、谈判、长期合同。', range: [55, 75], explain: '' }
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
        return { year: e.year, grade: g, emoji: GRADE_DEF[g].em, title: e.title || GRADE_WORD[g], desc: e.desc || JUDGE[g], ev: e };
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
      var em = GRADE_DEF[g].em;
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
      var score = yearScore(ev, y);
      // 评分三段制：喜用神 40 + 财官引动 40 + 结构爆发 20 = 100
      years.push({ year: y, score: score, ev: ev, smooth: !ev, grade: gradeForScore(score) });
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

    var g = '<defs>' +
      '<linearGradient id="mineGrad" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0%" stop-color="#e9c46a"/><stop offset="55%" stop-color="#d9578a"/><stop offset="100%" stop-color="#7c6bd6"/>' +
      '</linearGradient>' +
      // 节点径向渐变：柔金 / 粉橙 / 青蓝 / 低透明灰
      '<radialGradient id="gradS" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#fff3b0" stop-opacity="1"/><stop offset="60%" stop-color="#e9c46a" stop-opacity=".95"/><stop offset="100%" stop-color="#7a5a20" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="gradA" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ffd0e0" stop-opacity="1"/><stop offset="60%" stop-color="#ff9db8" stop-opacity=".92"/><stop offset="100%" stop-color="#7a2f4a" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="gradB" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#cfe0f5" stop-opacity="1"/><stop offset="60%" stop-color="#8ba8d8" stop-opacity=".9"/><stop offset="100%" stop-color="#1e3a5c" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="gradC" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="rgba(255,255,255,.55)"/><stop offset="60%" stop-color="rgba(255,255,255,.30)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></radialGradient>' +
      '<linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7c6bd6"/><stop offset="100%" stop-color="#7c6bd6" stop-opacity="0"/></linearGradient>' +
      '</defs>';

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

    // 节点 + emoji + 年份 + 等级标签
    series.forEach(function (s, i) {
      var x = X(i), y = Y(s.score);
      var grade = s.grade;
      var def = GRADE_DEF[grade];
      var r = grade === 'S' ? 7.5 : (grade === 'A' ? 6.5 : (grade === 'B' ? 5.5 : 4.5));
      var em = def.em;
      var tag = grade === 'S' ? '天命转折' : grade === 'A' ? '事业升迁' : grade === 'B' ? '平稳积蓄' : '韬光养晦';
      var labelColor = grade === 'S' ? '#e9c46a' : grade === 'A' ? '#ff9db8' : grade === 'B' ? '#8ba8d8' : 'rgba(255,255,255,.4)';
      g += '<g class="y-node" data-year="' + s.year + '" data-grade="' + grade + '" style="cursor:pointer">' +
        '<circle cx="' + x + '" cy="' + y + '" r="' + (r + 8) + '" fill="transparent"/>' +
        '<circle cx="' + x + '" cy="' + y + '" r="' + (r + 4) + '" fill="' + def.fill + '" style="filter:drop-shadow(0 0 6px ' + def.glow + ')"/>' +
        '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="none" stroke="' + def.stroke + '" stroke-width="0.8" opacity=".7"/>' +
        '<text x="' + x + '" y="' + (y - 12) + '" text-anchor="middle" font-size="14">' + em + '</text>' +
        '<text x="' + x + '" y="' + (y + 18) + '" text-anchor="middle" font-size="9" fill="' + labelColor + '">' + tag + '</text>' +
        '<text x="' + x + '" y="' + (padT + plotH + 22) + '" text-anchor="middle" font-size="11" fill="' + (s.year === nowYear ? '#e9e6f6' : 'rgba(255,255,255,.42)') + '">' + s.year + '</text>' +
        '</g>';
    });

    yearChart.innerHTML = g;
    yearChart.style.width = W + 'px';
    yearScroll.scrollLeft = Math.max(0, (series.findIndex(function (s) { return s.year === nowYear; }) - 2) * step);

    // 图例：S/A/B/C 等级 + 标签
    $('yearLegend').innerHTML = ['S', 'A', 'B', 'C'].map(function (k) {
      var d = GRADE_DEF[k];
      return '<span class="lg"><i style="background:' + d.stroke + ';box-shadow:0 0 6px ' + d.glow + '"></i>' + d.tag + '</span>';
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
      ? future.slice().sort(function (a, b) { return b.score - a.score; })[0]
      : (series.filter(function (s) { return s.ev; }).slice().sort(function (a, b) { return b.score - a.score; })[0]);
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

  /* ============ 月度时机（GRI 引擎） ============ */
  function monthSeries() {
    var months = [];
    for (var m = 1; m <= 12; m++) {
      var r = stable('m' + m, m * 3);
      var lv;
      if (r > 0.9) lv = MONTH_LEVELS[0];        // 暴富矿
      else if (r > 0.72) lv = MONTH_LEVELS[1];  // 晋升窗口
      else if (r > 0.52) lv = MONTH_LEVELS[2];  // 灵感波段
      else if (r > 0.34) lv = MONTH_LEVELS[3];  // 人脉共振
      else lv = MONTH_LEVELS[4];                // 稳固期
      // GRI 权重区间内取值
      var lo = lv.range[0], hi = lv.range[1];
      var score = lo + Math.floor(stable('v' + m, m) * (hi - lo + 1));
      months.push({ m: m, lv: lv, score: Math.max(lo, Math.min(hi, score)) });
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
      var lv = s.lv;
      var c = lv.c;
      var em = lv.em;
      var glow = lv.k === 'rich' ? ' style="filter:drop-shadow(0 0 8px rgba(233,196,106,.8))"' : '';
      g += '<g class="m-node" data-m="' + s.m + '" style="cursor:pointer">' +
        '<circle cx="' + x + '" cy="' + y + '" r="11" fill="transparent"/>' +
        '<circle cx="' + x + '" cy="' + y + '" r="' + (lv.k === 'steady' ? 4.5 : 6) + '" fill="' + c + '" stroke="rgba(255,255,255,.25)" stroke-width="1"' + glow + '/>' +
        '<text x="' + x + '" y="' + (y - 12) + '" text-anchor="middle" font-size="13">' + em + '</text>' +
        '<text x="' + x + '" y="' + (padT + plotH + 22) + '" text-anchor="middle" font-size="11" fill="rgba(255,255,255,.42)">' + s.m + '月</text>' +
        '</g>';
    });

    monthChart.innerHTML = g;
    $('monthLegend').innerHTML = MONTH_LEVELS.map(function (lv) {
      return '<span class="lg"><i style="background:' + lv.c + '"></i>' + lv.em + ' ' + lv.nm + '</span>';
    }).join('');

    Array.prototype.forEach.call(monthChart.querySelectorAll('.m-node'), function (node) {
      node.addEventListener('click', function () {
        var m = parseInt(node.getAttribute('data-m'), 10);
        var s = series.filter(function (x) { return x.m === m; })[0];
        if (!s) return;
        var lv = s.lv;
        var sig = '<div class="sig">信号：<b>' + lv.em + ' ' + lv.nm + '</b>（专属词「' + lv.word + '」）· 触发条件：<b>' + lv.trigger + '</b> · GRI ' + s.score + '</div>';
        var acts = '<div class="acts">' + lv.act + '</div>';
        var ganzhi = gzForMonth(m);
        openPop(lv.em, nowYear + '年' + m + '月 · 行动指令', lv.nm + ' · ' + ganzhi, sig + acts, [], m);
      });
    });

    renderMonthTip(series);
  }

  /* 本月建议卡：对应当前月生成 GRI 建议，加在月度时机下方 */
  function renderMonthTip(series) {
    var box = document.getElementById('monthTipCard');
    if (!box) return;
    var now = new Date();
    var m = now.getMonth() + 1;
    var s = series.filter(function (x) { return x.m === m; })[0];
    if (!s) return;
    var lv = s.lv;
    var gradeColor = lv.k === 'rich' ? 'gold' : lv.k === 'promo' ? 'blue' : lv.k === 'idea' ? 'violet' : lv.k === 'net' ? 'teal' : 'gray';
    box.innerHTML =
      '<div class="card">' +
      '<div class="sec-label"><span>' + now.getFullYear() + '年' + m + '月 · 本月建议</span><span class="hint">GRI 月度时机引擎</span></div>' +
      '<div class="mt-main">' +
      '<span class="mt-emoji">' + lv.em + '</span>' +
      '<div class="mt-info">' +
      '<div class="mt-title">' + lv.nm + ' <em class="mt-word">专属词「' + lv.word + '」</em></div>' +
      '<div class="mt-trigger">触发条件：' + lv.trigger + '</div>' +
      '</div>' +
      '<div class="mt-score ' + gradeColor + '">GRI <b>' + s.score + '</b></div>' +
      '</div>' +
      '<div class="mt-act">→ ' + lv.act + '</div>' +
      (lv.explain ? '<div class="mt-explain">' + lv.explain + '</div>' : '') +
      '</div>';
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
