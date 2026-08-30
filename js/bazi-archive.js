/* ════════════════════════════════════════════════════════════
 * bazi-archive.js — 我的命盘档案（启途 P0）
 * 六折叠卡片：四柱排盘 / 五行能量 / 格局分析 / 用神喜忌 / 神煞 / 合冲刑害
 * 数据源：reportData（chart 字段），纳音/神煞/合冲为本地查表计算
 * 入口：#baziEntryCard → 展开 #baziArchive
 * ════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

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
    return data;
  }

  var GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var GAN_WX = { '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水' };
  var ZHI_WX = { '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火', '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水' };
  // 60 甲子纳音（每两组一纳音）
  var NAYIN = ['海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火', '涧下水', '城头土', '白蜡金', '杨柳木',
    '泉中水', '屋上土', '霹雳火', '松柏木', '长流水', '沙中金', '山下火', '平地木', '壁上土', '金箔金',
    '覆灯火', '天河水', '大驿土', '钗钏金', '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水'];
  function naying(gan, zhi) {
    var gi = GAN.indexOf(gan), zi = ZHI.indexOf(zhi);
    if (gi < 0 || zi < 0) return '';
    var n = -1;
    for (var i = 0; i < 60; i++) { if (i % 10 === gi && i % 12 === zi) { n = i; break; } }
    if (n < 0) return '';
    return NAYIN[Math.floor(n / 2)];
  }
  function indexOf(arr, v) { return arr.indexOf(v); }

  // 地支藏干（主气）
  var ZHI_HIDE = {
    '子': ['癸'], '丑': ['己', '癸', '辛'], '寅': ['甲', '丙', '戊'], '卯': ['乙'],
    '辰': ['戊', '乙', '癸'], '巳': ['丙', '庚', '戊'], '午': ['丁', '己'], '未': ['己', '丁', '乙'],
    '申': ['庚', '壬', '戊'], '酉': ['辛'], '戌': ['戊', '辛', '丁'], '亥': ['壬', '甲']
  };

  // 神煞查表（基准：日干 + 年支）
  var TIANYI = { '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'], '乙': ['子', '申'], '己': ['子', '申'],
    '丙': ['亥', '酉'], '丁': ['亥', '酉'], '壬': ['巳', '卯'], '癸': ['巳', '卯'], '辛': ['午', '寅'] };
  var WENCHANG = { '甲': '巳', '乙': '午', '丙': '申', '戊': '申', '丁': '酉', '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯' };
  var YIMA = { '申': '寅', '子': '寅', '辰': '寅', '寅': '申', '午': '申', '戌': '申', '巳': '亥', '酉': '亥', '丑': '亥', '亥': '巳', '卯': '巳', '未': '巳' };
  var TAOHUA = { '申': '酉', '子': '酉', '辰': '酉', '寅': '卯', '午': '卯', '戌': '卯', '巳': '午', '酉': '午', '丑': '午', '亥': '子', '卯': '子', '未': '子' };
  var JIESHA = { '申': '巳', '子': '巳', '辰': '巳', '寅': '亥', '午': '亥', '戌': '亥', '巳': '寅', '酉': '寅', '丑': '寅', '亥': '申', '卯': '申', '未': '申' };

  // 合冲刑害
  var LIUHE = { '子': '丑', '丑': '子', '寅': '亥', '亥': '寅', '卯': '戌', '戌': '卯', '辰': '酉', '酉': '辰', '巳': '申', '申': '巳', '午': '未', '未': '午' };
  var LIUCHONG = { '子': '午', '午': '子', '丑': '未', '未': '丑', '寅': '申', '申': '寅', '卯': '酉', '酉': '卯', '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳' };
  var SANHE = [['申', '子', '辰', '水'], ['亥', '卯', '未', '木'], ['寅', '午', '戌', '火'], ['巳', '酉', '丑', '金']];
  var XING = { '寅': '巳', '巳': '申', '申': '寅', '丑': '戌', '戌': '未', '未': '丑', '子': '卯', '卯': '子' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function renderEntry(data) {
    var box = document.getElementById('baziEntryCard');
    if (!box) return;
    var chart = data.chart || {};
    var pillars = chart.pillars || [];
    var gz = pillars.map(function (p) { return (p.gan || '') + (p.zhi || ''); }).join(' ');
    var pattern = chart.pattern || '—';
    var useful = ((chart.useful_god || {}).useful || []).join('、') || '—';
    box.innerHTML =
      '<div class="card bz-entry" id="bzEntryBtn">' +
      '<div class="bz-entry-hd">' +
      '<span class="bz-entry-ic">📜</span>' +
      '<div class="bz-entry-info">' +
      '<div class="bz-entry-title">我的命盘档案</div>' +
      '<div class="bz-entry-sub">四柱：' + esc(gz || '—') + '　格局：' + esc(pattern) + '　用神：' + esc(useful) + '</div>' +
      '</div>' +
      '<span class="bz-entry-ar" id="bzEntryAr">▾</span>' +
      '</div></div>';
    var btn = document.getElementById('bzEntryBtn');
    if (btn) btn.addEventListener('click', toggle);
  }

  function toggle() {
    var arch = document.getElementById('baziArchive');
    var ar = document.getElementById('bzEntryAr');
    if (!arch) return;
    var show = arch.style.display !== 'block';
    arch.style.display = show ? 'block' : 'none';
    if (ar) ar.textContent = show ? '▴' : '▾';
  }

  function renderArchive(data) {
    var arch = document.getElementById('baziArchive');
    if (!arch) return;
    var chart = data.chart || {};
    var dayun = data.dayun || {};
    var pillars = chart.pillars || [];
    var html = '';

    /* 卡1：四柱排盘 */
    var p1 = '';
    if (pillars.length) {
      var th = '<div class="bz-4"><span class="bz-c bz-th">四柱</span>' + pillars.map(function (p) {
        return '<span class="bz-c bz-name">' + esc(p.name || '') + '</span>';
      }).join('') + '</div>';
      var tgan = '<div class="bz-4"><span class="bz-c bz-th">天干</span>' + pillars.map(function (p) {
        return '<span class="bz-c bz-gan wx-' + (GAN_WX[p.gan] || '') + '">' + esc(p.gan || '') + '</span>';
      }).join('') + '</div>';
      var tzhi = '<div class="bz-4"><span class="bz-c bz-th">地支</span>' + pillars.map(function (p) {
        return '<span class="bz-c bz-zhi wx-' + (ZHI_WX[p.zhi] || '') + '">' + esc(p.zhi || '') + '</span>';
      }).join('') + '</div>';
      var hide = '<div class="bz-4"><span class="bz-c bz-th">藏干</span>' + pillars.map(function (p) {
        return '<span class="bz-c bz-hide">' + esc((ZHI_HIDE[p.zhi] || []).join(' ')) + '</span>';
      }).join('') + '</div>';
      var ny = '<div class="bz-4"><span class="bz-c bz-th">纳音</span>' + pillars.map(function (p) {
        return '<span class="bz-c bz-naying">' + esc(naying(p.gan, p.zhi)) + '</span>';
      }).join('') + '</div>';
      var tg = '<div class="bz-4"><span class="bz-c bz-th">十神</span>' + pillars.map(function (p) {
        return '<span class="bz-c bz-sg">' + esc((((chart.ten_gods || {}).gan || {})[p.name] || '—')) + '</span>';
      }).join('') + '</div>';
      p1 = th + tgan + tzhi + hide + ny + tg;
    } else {
      p1 = '<div class="bz-empty">暂无排盘数据</div>';
    }

    /* 卡2：五行能量 */
    var p2 = '';
    var wxs = (chart.five_elements || {}).percent || {};
    var wxOrder = ['木', '火', '土', '金', '水'];
    var wxRows = wxOrder.map(function (w) {
      var v = wxs[w] || 0;
      return '<div class="bz-wx-row"><span class="bz-wx-k">' + w + '</span>' +
        '<span class="bz-wx-bar"><i class="wx-' + w + '" style="width:' + Math.min(100, v) + '%"></i></span>' +
        '<span class="bz-wx-v">' + v + '%</span></div>';
    }).join('');
    p2 = '<div class="bz-wx">' + wxRows + '</div>' +
      '<div class="bz-line">日主：' + esc(chart.day_master || '—') + '（' + esc(chart.day_master_wuxing || '—') + '）' +
      ' · ' + esc((chart.day_master_strength || {}).level || '—') + '（' + esc((chart.day_master_strength || {}).score || '—') + '分）</div>';

    /* 卡3：格局分析 */
    var p3 = '<div class="bz-grid"><span class="bz-gk">格局</span><span class="bz-gv">' + esc(chart.pattern || '—') + '</span></div>' +
      '<div class="bz-line">格局注解与破格风险见上方「禀赋报告」；日主身' + esc((chart.day_master_strength || {}).level || '—') + '，整体宜顺势而为。</div>';

    /* 卡4：用神喜忌 */
    var ug = chart.useful_god || {};
    var p4 = '<div class="bz-grid"><span class="bz-gk">用神</span><span class="bz-gv" style="color:#e9c46a">' + esc((ug.useful || []).join('、') || '—') + '</span></div>' +
      '<div class="bz-grid"><span class="bz-gk">忌神</span><span class="bz-gv" style="color:#ff9a8a">' + esc((ug.avoid || []).join('、') || '—') + '</span></div>' +
      '<div class="bz-line">用神即补益命局的力量，宜在职业、环境与人事中多亲近；忌神则宜避开或减少接触。</div>';

    /* 卡5：神煞 */
    var dm = pillars[2] ? pillars[2].gan : '';
    var yz = pillars[0] ? pillars[0].zhi : '';
    var allZhi = pillars.map(function (p) { return p.zhi; });
    var ss = [];
    function hit(list, k, name, ic, desc) {
      var found = (list || []).filter(function (z) { return allZhi.indexOf(z) >= 0; });
      if (found.length) ss.push({ n: name, v: found.join('、'), i: ic, d: desc });
    }
    hit(TIANYI[dm], dm, '天乙贵人', '✨', '遇事有人帮，关键时刻易得贵人援手');
    hit([WENCHANG[dm]], dm, '文昌', '📚', '利学习考试、文书写作、知识变现');
    hit([YIMA[yz]], yz, '驿马', '🐴', '利变动出行、异地发展、业务拓展');
    hit([TAOHUA[yz]], yz, '桃花', '🍑', '人缘魅力强，销售/公关/社交场合加分');
    hit([JIESHA[yz]], yz, '劫煞', '⚠️', '防突发破财与小人是非，重要决策多复核');
    var p5 = ss.length
      ? ss.map(function (s) { return '<div class="bz-ss"><span class="bz-ss-i">' + s.i + '</span><span class="bz-ss-n">' + esc(s.n) + '：' + esc(s.v) + '</span><span class="bz-ss-d">' + esc(s.d) + '</span></div>'; }).join('')
      : '<div class="bz-empty">本命局未落入常见神煞</div>';

    /* 卡6：合冲刑害 */
    var rels = [];
    for (var i = 0; i < allZhi.length; i++) {
      for (var j = i + 1; j < allZhi.length; j++) {
        var a = allZhi[i], b = allZhi[j];
        var nm = (pillars[i] && pillars[i].name) + '、' + (pillars[j] && pillars[j].name);
        if (LIUHE[a] === b) rels.push(nm + ' ' + a + b + ' 六合 → 合作助力');
        if (LIUCHONG[a] === b) rels.push(nm + ' ' + a + b + ' 六冲 → 变动冲击');
        if (XING[a] === b || XING[b] === a) rels.push(nm + ' ' + a + b + ' 相刑 → 注意口舌与磨合');
        if (a === b) rels.push(nm + ' ' + a + a + ' 自刑 → 自我施压');
      }
    }
    SANHE.forEach(function (grp) {
      var hit3 = grp.slice(0, 3).filter(function (z) { return allZhi.indexOf(z) >= 0; });
      if (hit3.length === 3) rels.push('三合' + grp[3] + '局（' + grp.slice(0, 3).join('') + '全）→ 能量聚合');
    });
    var p6 = rels.length
      ? rels.map(function (r) { return '<div class="bz-ss"><span class="bz-ss-i">⚡</span><span class="bz-ss-n">' + esc(r) + '</span></div>'; }).join('')
      : '<div class="bz-empty">四柱无明显合冲刑害</div>';

    var cards = [
      ['四柱排盘', p1], ['五行能量', p2], ['格局分析', p3],
      ['用神喜忌', p4], ['神煞', p5], ['合冲刑害', p6]
    ];
    html = cards.map(function (c, idx) {
      return '<details class="bz-card"' + (idx === 0 ? ' open' : '') + '>' +
        '<summary><span class="bz-card-ic">' + ['🧭', '⚖️', '🏛️', '💧', '✨', '⚡'][idx] + '</span>' + c[0] + '</summary>' +
        '<div class="bz-card-body">' + c[1] + '</div></details>';
    }).join('');

    var gz = pillars.map(function (p) { return (p.gan || '') + (p.zhi || ''); }).join(' ');
    arch.innerHTML =
      '<div class="card bz-arch-hd">' +
      '<div class="bz-arch-title">📜 完整命盘档案</div>' +
      '<div class="bz-arch-sub">' + esc(gz) + ' · 格局 ' + esc(chart.pattern || '—') + ' · 用神 ' + esc(((chart.useful_god || {}).useful || []).join('、') || '—') + '</div>' +
      '</div>' + html;
  }

  window.BaziArchive = {
    init: function () {
      var data = loadReport();
      if (!data) return;
      renderEntry(data);
      renderArchive(data);
    }
  };
})();
