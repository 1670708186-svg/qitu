/* 王半仙 v3 · 半仙对话中心（会话列表 + 对话房间）
   数据：localStorage qitu_conversations（会话列表）/ qitu_dm_<id>（私信消息）
   AI 对话走原站后端 /api/chat/*（保留后端接口） */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var API = (window.API_BASE || '');
  var listEl = $('convoList');
  var roomEl = $('roomView');
  var msgsEl = $('roomMsgs');
  var quickEl = $('roomQuick');
  var orbEl = $('roomOrb');

  /* ============ 存储 ============ */
  function getLS(key, def) { try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return v === null ? def : v; } catch (e) { return def; } }
  function setLS(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }

  /* ============ 讲解模式 + 命理导航 + 外接 AI ============ */
  var NAV_TOPICS = [
    { t: '八字排盘', q: '帮我把我的八字排出来，四柱、天干地支、藏干都列清楚。' },
    { t: '五行喜忌', q: '分析我命局的五行喜忌，缺什么、补什么，怎么补？' },
    { t: '十神格局', q: '讲讲我的十神格局，正官、正印、食神这些在我命盘里什么意思？' },
    { t: '大运流年', q: '我现在走到哪步大运？最近几年的流年对我运势有什么影响？' },
    { t: '事业财运', q: '我适合做什么类型的工作，财运什么时候能起来？' },
    { t: '姻缘感情', q: '从命理看我感情婚姻的走势，什么时候容易遇到正缘？' },
    { t: '健康提醒', q: '从五行平衡的角度看，我身体哪方面需要留意？' },
    { t: '学业考试', q: '我最近学业考运如何？有没有利考试升学的年份？' },
    { t: '每日宜忌', q: '今天对我而言有哪些宜、哪些忌？适合做什么？' },
    { t: '择日吉时', q: '帮我选个做重要决定（签约/面试/出行）的好日子。' }
  ];
  function getMode() { try { return localStorage.getItem('qitu_chat_mode') === 'pro' ? 'pro' : 'normal'; } catch (e) { return 'normal'; } }
  function setMode(m) { try { localStorage.setItem('qitu_chat_mode', m); } catch (e) {} }
  function modeHint() {
    return getMode() === 'pro'
      ? '（请用【专业命理】语言讲解：准确使用天干地支、十神、神煞、用神忌神、大运流年等术语，分析严谨有层次，像给懂八字的人看盘）'
      : '（请用【通俗易懂】的语言讲解，多用生活化比喻，尽量少用专业术语；必须用到术语时当场解释清楚）';
  }
  function getExt() {
    try { return JSON.parse(localStorage.getItem('qitu_ai_ext') || 'null') || { enabled: false, base: '', key: '', model: '' }; }
    catch (e) { return { enabled: false, base: '', key: '', model: '' }; }
  }
  function setExt(cfg) { try { localStorage.setItem('qitu_ai_ext', JSON.stringify(cfg)); } catch (e) {} }
  function extOn() { var e = getExt(); return !!(e.enabled && e.key && e.base); }
  function reportContext() {
    try {
      var list = JSON.parse(localStorage.getItem('qitu_reports') || '[]');
      var hit = null;
      list.forEach(function (r) { if (!hit && r.report_id === reportId) hit = r; });
      if (!hit) hit = list[list.length - 1];
      if (!hit || !hit.data) return '';
      var d = hit.data;
      var parts = [];
      if (d.birth) parts.push('出生信息：' + (typeof d.birth === 'object' ? JSON.stringify(d.birth) : d.birth));
      var mc = d.meme_card || (d.analysis && d.analysis.meme_card) || {};
      if (mc.name) parts.push('职业原型：' + mc.name);
      if (d.analysis && d.analysis.summary) parts.push('总评：' + (typeof d.analysis.summary === 'string' ? d.analysis.summary : JSON.stringify(d.analysis.summary)));
      return parts.length ? ('\n【用户命盘档案】\n' + parts.join('\n')) : '';
    } catch (e) { return ''; }
  }
  function extSystemPrompt() {
    return '你是「王半仙」，一位精通八字命理、五行、十神、大运流年的 AI 命理师。' +
      '你说话沉稳笃定，带一点古风玄机感，但内容必须落到实处：结合用户命盘与职场/人生问题，给出清晰、可执行的建议。' +
      reportContext() +
      (getMode() === 'pro'
        ? '\n【讲解要求】请用专业命理语言：准确使用天干地支、十神、神煞、用神忌神、大运流年等术语，分析严谨、层层递进，像给懂八字的同行看盘，可适当引用典籍观点。'
        : '\n【讲解要求】请用通俗易懂的语言讲解，多用生活化比喻，少用专业术语；必须用到术语时，当场用大白话解释清楚。');
  }

  /* 默认会话列表 */
  function defaultConvos() {
    return [
      { id: 'ai', type: 'ai', name: '王半仙', sub: 'AI 参谋', avatar: '🔮', online: true, unread: 2, last: '今天也别忘了，你是带着禀赋来的…', time: '上午 8:00', pinned: 1 },
      { id: 'mentor_li', type: 'mentor', name: '李师傅', sub: '命理导师', avatar: '🧘', online: true, unread: 1, last: '你的命盘我看过了，建议…', time: '昨天 22:14', pinned: 0 },
      { id: 'mentor_chen', type: 'mentor', name: '陈老师', sub: '职业规划', avatar: '🎯', online: false, unread: 0, last: '上次说的简历改好了吗？', time: '周三', pinned: 0 },
      { id: 'order_1', type: 'order', name: '咨询订单 · 张导师', sub: '语音咨询', avatar: '📋', online: false, unread: 0, last: '', time: '', pinned: 0 }
    ];
  }
  function convos() { return getLS('qitu_conversations', defaultConvos()); }
  function saveConvos(list) { setLS('qitu_conversations', list); }
  function dm(id) { return getLS('qitu_dm_' + id, []); }
  function saveDm(id, msgs) { setLS('qitu_dm_' + id, msgs); }

  function bump(key) { var n = parseInt(getLS(key, 0), 10) || 0; setLS(key, n + 1); return n + 1; }
  function toast(msg) {
    var t = $('toastBox');
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(window.__toastT);
    window.__toastT = setTimeout(function () { t.style.opacity = '0'; }, 2200);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* ============ 会话列表渲染 ============ */
  var editMode = false;
  var selected = {};
  var searchKw = '';

  function renderList() {
    var list = convos();
    var kw = searchKw.toLowerCase();
    var rows = list.filter(function (c) {
      if (!kw) return true;
      return (c.name + c.sub + c.last).toLowerCase().indexOf(kw) !== -1;
    }).sort(function (a, b) { return (b.pinned || 0) - (a.pinned || 0); });

    if (!rows.length) {
      listEl.innerHTML = '<div class="cl-empty">' + (kw ? '没有找到相关对话' : '还没有对话') + '<br>点下方「＋ 新对话」开始第一段</div>';
      return;
    }
    listEl.innerHTML = rows.map(function (c) {
      var avCls = c.type === 'ai' ? ' ai' : '';
      var stDot = c.type === 'ai' || c.online ? '<span class="st on"></span>' : '<span class="st off"></span>';
      var tag = c.type === 'ai' ? '<span class="cv-tag">AI 参谋</span>' : (c.type === 'mentor' ? '<span class="cv-tag">导师</span>' : '');
      var right = c.type === 'order'
        ? '<span class="cv-order-tag">待开始</span>'
        : (c.unread > 0 ? '<span class="cv-unread">' + (c.unread > 99 ? '99+' : c.unread) + '</span>' : '');
      var timeTxt = c.time || '';
      var orderLine = c.type === 'order' ? '<div class="cv-msg">待开始：8月31日 15:00 · 语音咨询</div>' : '<div class="cv-msg">' + esc(c.last || '') + '</div>';
      var chkCls = selected[c.id] ? ' checked' : '';
      return '<div class="cv-wrap" data-id="' + c.id + '">' +
        '<div class="cv-actions">' +
        '<button data-a="pin">' + (c.pinned ? '取消置顶' : '置顶') + '</button>' +
        '<button data-a="read" ' + (c.unread > 0 ? '' : 'style="display:none"') + '>标已读</button>' +
        '<button class="del" data-a="del">删除</button>' +
        '</div>' +
        '<div class="cv-item' + (editMode ? '' : '') + '" data-id="' + c.id + '">' +
        '<span class="chk' + chkCls + '" data-id="' + c.id + '">✓</span>' +
        '<div class="cv-av' + avCls + ' glow-orb" data-c1="#b8aee8" data-c2="#d9578a">' + c.avatar + stDot + '</div>' +
        '<div class="cv-main">' +
        '<div class="cv-row1"><span class="cv-name">' + esc(c.name) + '</span>' + tag + '</div>' +
        '<div class="cv-sub">' + esc(c.sub) + '</div>' +
        orderLine +
        '</div>' +
        '<div class="cv-right"><span class="cv-time">' + esc(timeTxt) + '</span>' + right + '</div>' +
        '</div></div>';
    }).join('');
    bindSwipeAndActions();
  }

  /* 左滑 + 操作按钮 */
  var startX = null;
  function bindSwipeAndActions() {
    var items = listEl.querySelectorAll('.cv-wrap');
    Array.prototype.forEach.call(items, function (w) {
      w.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; });
      w.addEventListener('touchmove', function (e) {
        if (startX === null) return;
        var dx = e.touches[0].clientX - startX;
        if (dx < -30) w.querySelector('.cv-actions').classList.add('show');
        if (dx > 40) w.querySelector('.cv-actions').classList.remove('show');
      });
      w.addEventListener('touchend', function () { startX = null; });
      w.querySelector('.cv-item').addEventListener('click', function () {
        if (editMode) { toggleSelect(w.dataset.id); return; }
        w.querySelector('.cv-actions').classList.remove('show');
        openRoom(w.dataset.id);
      });
    });
    listEl.querySelectorAll('.cv-actions button').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var w = b.closest('.cv-wrap');
        var id = w.dataset.id;
        var a = b.dataset.a;
        var list = convos();
        var c = list.filter(function (x) { return x.id === id; })[0];
        if (!c) return;
        if (a === 'del') { list = list.filter(function (x) { return x.id !== id; }); toast('已删除会话'); }
        if (a === 'pin') { c.pinned = c.pinned ? 0 : 1; toast(c.pinned ? '已置顶' : '已取消置顶'); }
        if (a === 'read') { c.unread = 0; }
        saveConvos(list);
        w.querySelector('.cv-actions').classList.remove('show');
        renderList();
      });
    });
    /* 编辑态多选 */
    listEl.querySelectorAll('.cv-item .chk').forEach(function (ch) {
      ch.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleSelect(ch.dataset.id);
      });
    });
  }

  function toggleSelect(id) {
    if (selected[id]) delete selected[id]; else selected[id] = 1;
    var ch = listEl.querySelector('.cv-item[data-id="' + id + '"] .chk');
    if (ch) ch.classList.toggle('checked', !!selected[id]);
    updateBatch();
  }
  function updateBatch() {
    var n = Object.keys(selected).length;
    $('batchCnt').textContent = '已选 ' + n + ' 项';
    $('batchBar').classList.toggle('show', n > 0);
    $('editBtn').textContent = n > 0 ? '完成' : '编辑';
  }
  function exitEdit() {
    editMode = false;
    selected = {};
    $('editBtn').classList.remove('on');
    $('batchBar').classList.remove('show');
    document.body.classList.remove('edit-mode');
    listEl.classList.remove('edit-mode');
    renderList();
  }

  /* ============ 房间 ============ */
  var current = null;      // {id,type,name,avatar}
  var reportId = null;
  var sessionId = null;    // AI 多会话
  var busy = false;

  function openRoom(id) {
    var list = convos();
    var c = list.filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    current = { id: c.id, type: c.type, name: c.name, avatar: c.avatar, sub: c.sub };
    // 未读清零
    c.unread = 0;
    saveConvos(list);
    renderList();
    showRoom();
  }

  function showRoom() {
    listEl.parentNode.style.display = 'none';
    roomEl.style.display = 'flex';
    var tb = document.getElementById('qituTabbar');
    if (tb) tb.style.display = 'none';
    msgsEl.innerHTML = '';
    initRoomSpark();   // 启动房间顶部白色火花（与启动屏同款）
    $('roomName').textContent = current.name;
    $('roomTitle').textContent = current.name + (current.type === 'ai' ? '（在线）' : '');
    $('roomStatus').innerHTML = current.type === 'ai'
      ? (extOn() ? '<span class="dot" style="background:#e9c46a;box-shadow:0 0 6px #e9c46a"></span>在线 · 外接 AI · ' + esc(getExt().model || '自定义模型')
                  : '<span class="dot"></span>在线 · 随缘回复')
      : (current.type === 'order' ? '待开始：8月31日 15:00' : (current.online !== false ? '<span class="dot"></span>在线 · 可回复' : '离线 · 留言会回'));
    $('ttsBtn').textContent = ChatVoice.isTtsOn() ? '🔊 播报·开' : '🔊 播报';
    $('ttsBtn').classList.toggle('on', ChatVoice.isTtsOn());
    if (current.type === 'ai') openAiRoom(); else if (current.type === 'order') openOrderRoom(); else openDmRoom();
  }

  function backToList() {
    roomEl.style.display = 'none';
    listEl.parentNode.style.display = 'flex';
    var tb = document.getElementById('qituTabbar');
    if (tb) tb.style.display = '';
    current = null;
    ChatVoice.stopSpeak();
    if (sparkInst) sparkInst.stop();
    renderList();
  }

  function addMsg(role, content, actions) {
    var row = document.createElement('div');
    row.className = 'msg-row ' + (role === 'user' ? 'user' : 'ai');
    var av = role === 'user' ? '我' : (current ? current.avatar : '🔮');
    var avData = role === 'user' ? 'data-c1="#d9578a" data-c2="#b8aee8"' : 'data-c1="#b8aee8" data-c2="#d9578a"';
    var actHtml = '';
    if (role !== 'user' && actions && actions.length) {
      actHtml = '<div class="act">' + actions.map(function (a) {
        return '<button data-act="' + esc(a) + '">' + esc(a) + '</button>';
      }).join('') + '</div>';
    }
    row.innerHTML = '<div class="msg-av glow-orb" ' + avData + '>' + av + '</div><div class="bubble">' + mdToHtml(content) + actHtml + '</div>';
    msgsEl.appendChild(row);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return row;
  }

  function addTyping() {
    var row = document.createElement('div');
    row.className = 'msg-row ai';
    row.innerHTML = '<div class="msg-av glow-orb" data-c1="#b8aee8" data-c2="#d9578a">' + (current ? current.avatar : '🔮') + '</div><div class="bubble"><span class="typing"><i></i><i></i><i></i></span></div>';
    msgsEl.appendChild(row);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return row;
  }

  function burstOrb() {
    // 触发 spark 中心白核脉冲（与启动屏白色火花爆发一致）
    if (window.__roomSpark) window.__roomSpark.burst();
  }

  /* ── 房间顶部白色火花爆发（与启动屏同款） ── */
  var sparkInst = null;
  function initRoomSpark() {
    if (sparkInst) return;
    var box = orbEl; // .room-spark 容器
    if (!box) return;
    var cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;';
    box.appendChild(cv);
    var ctx = cv.getContext('2d');
    var w = 0, h = 0, sparks = [], spinning = false, raf = null, burstT = 0;

    function resize() {
      w = cv.width = box.clientWidth || 360;
      h = cv.height = box.clientHeight || 200;
    }
    function initSparks() {
      sparks = [];
      var N = Math.min(140, Math.floor(w * h / 1400));
      for (var i = 0; i < N; i++) {
        sparks.push({
          a: Math.random() * Math.PI * 2,
          len: 6 + Math.pow(Math.random(), 0.6) * 22,
          size: 0.7 + Math.random() * 1.1,
          phase: Math.random() * Math.PI * 2,
          twSpeed: 0.04 + Math.random() * 0.06
        });
      }
    }
    function draw(t) {
      if (!spinning) return;
      ctx.clearRect(0, 0, w, h);
      var cx = w / 2, cy = h / 2;
      ctx.lineCap = 'round';
      for (var i = 0; i < sparks.length; i++) {
        var s = sparks[i];
        s.phase += s.twSpeed;
        var alpha = 0.45 + 0.5 * Math.sin(s.phase);
        var x1 = cx + Math.cos(s.a) * (s.len * 0.25);
        var y1 = cy + Math.sin(s.a) * (s.len * 0.25);
        var x2 = cx + Math.cos(s.a) * s.len;
        var y2 = cy + Math.sin(s.a) * s.len;
        var grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, 'rgba(255,255,255,' + alpha + ')');
        grad.addColorStop(1, 'rgba(190,200,220,' + (alpha * 0.25) + ')');
        ctx.strokeStyle = grad;
        ctx.lineWidth = s.size;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        // 起点白点
        ctx.beginPath();
        ctx.arc(x1, y1, s.size * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.9) + ')';
        ctx.fill();
      }
      // 中心柔光（无实体边：渐变渐隐）+ 环绕小粒子
      if (burstT > 0) burstT *= 0.92;
      var coreR = (4 + 1.6 * Math.sin(t * 0.003) + burstT * 8) * 2.4;
      var cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      cg.addColorStop(0, 'rgba(255,255,255,' + (0.9 + burstT * 0.1) + ')');
      cg.addColorStop(0.4, 'rgba(255,255,255,' + (0.3 + burstT * 0.05) + ')');
      cg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.fill();
      // 环绕小粒子（柔光小球）
      for (var k = 0; k < 10; k++) {
        var pa = t * 0.0005 + k * Math.PI * 2 / 10;
        var pd = (16 + 8 * Math.sin(t * 0.0012 + k * 1.3)) * (1 + burstT * 0.4);
        var ppx = cx + Math.cos(pa) * pd;
        var ppy = cy + Math.sin(pa) * pd;
        var pg = ctx.createRadialGradient(ppx, ppy, 0, ppx, ppy, 2.6);
        pg.addColorStop(0, 'rgba(255,255,255,' + (0.45 + 0.3 * Math.sin(t * 0.003 + k * 1.7)) + ')');
        pg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(ppx, ppy, 2.6, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    function start() {
      if (spinning) return;
      spinning = true;
      resize(); initSparks();
      requestAnimationFrame(draw);
    }
    function stop() {
      spinning = false;
      if (raf) cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, w, h);
    }
    window.addEventListener('resize', function () { if (spinning) { resize(); initSparks(); } });
    sparkInst = { start: start, stop: stop, burst: function () { burstT = 14; } };
    window.__roomSpark = sparkInst;
    start();
  }

  /* 轻量 markdown */
  function mdToHtml(text) {
    if (!text) return '';
    var e = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return e.split('\n').map(function (line) {
      var s = line.trim();
      var bold = function (x) { return x.replace(/\*\*(.+?)\*\*/g, '<b style="color:#e9e6f6">$1</b>'); };
      if (s.indexOf('### ') === 0) return '<div class="md-h">' + bold(s.slice(4)) + '</div>';
      if (s.indexOf('## ') === 0) return '<div class="md-h">' + bold(s.slice(3)) + '</div>';
      if (s.indexOf('- ') === 0 || s.indexOf('* ') === 0) return '<div class="md-li">' + bold(s.slice(2)) + '</div>';
      if (/^\d+[\.、)]/.test(s)) return '<div class="md-li">' + bold(s) + '</div>';
      return s ? '<div>' + bold(s) + '</div>' : '';
    }).join('');
  }

  /* ---- AI 房间（后端 /api/chat/*） ---- */
  function aiQuickQs() {
    if (reportId) return ['我最近适合跳槽吗？', '面试时我该注意什么？', '哪几年是我事业的上升期？', '我适合搞副业吗？'];
    return ['我适合什么职业？', '怎么挑选 offer？', '如何和同事相处？', '跳槽前要注意什么？'];
  }

  function openAiRoom() {
    aiHist = [];
    renderNav();
    var qs = aiQuickQs();
    renderQuick(qs);
    msgsEl.insertAdjacentHTML('afterbegin', '<div class="sys-tip">— 王半仙 AI 参谋 · ' + (getMode() === 'pro' ? '专业讲解' : '普通讲解') + (extOn() ? ' · 外接 AI' : '') + ' · 会话自动保存 —</div>');
    if (!reportId) {
      addMsg('ai', '你好呀，我是王半仙。带上你的命盘再聊会更准——建议先测一份职场天赋报告，我就能结合八字给你具体建议。');
      return;
    }
    // 恢复会话
    try { sessionId = localStorage.getItem('qitu_chat_session_' + reportId) || null; } catch (e) {}
    var fromUrl = new URLSearchParams(location.search).get('session_id');
    if (fromUrl) sessionId = fromUrl;
    // 拉历史
    var hUrl = sessionId ? '/api/chat/history?session_id=' + encodeURIComponent(sessionId) : '/api/chat/history?report_id=' + encodeURIComponent(reportId);
    fetch(API + hUrl).then(function (r) { return r.json().catch(function () { return {}; }); }).then(function (d) {
      var hist = (d && d.history) || [];
      if (hist.length) {
        msgsEl.insertAdjacentHTML('afterbegin', '<div class="sys-tip">— 已载入 ' + Math.ceil(hist.length / 2) + ' 轮历史 —</div>');
        hist.forEach(function (h) { addMsg(h.role === 'ai' ? 'ai' : 'user', h.content); });
      } else {
        addMsg('ai', '你好呀，我是你的命理智能体。关于职业方向、跳槽时机、offer 选择、副业思路……带着你的命盘，我们一件件聊。');
      }
    }).catch(function () {
      addMsg('ai', '你好呀，我是你的命理智能体。关于职业方向、跳槽时机、offer 选择、副业思路……带着你的命盘，我们一件件聊。');
    });
  }

  /* AI 历史（外接 AI 用，滚动 12 条） */
  var aiHist = [];

  function aiSend(q) {
    if (busy || !q) return;
    busy = true;
    $('sendBtn').disabled = true;
    addMsg('user', q);
    var typing = addTyping();
    var qWithMode = q.indexOf('（请用') === -1 ? q + modeHint() : q;
    if (extOn()) { extAiSend(q, qWithMode, typing); return; }
    var body = { report_id: reportId, question: qWithMode, session_id: sessionId };
    fetch(API + '/api/chat/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); }).then(function (d) {
      typing.remove();
      if (d.answer) {
        addMsg('ai', d.answer, suggestActions(d.answer));
        if (d.session_id && d.session_id !== sessionId) {
          sessionId = d.session_id;
          try { localStorage.setItem('qitu_chat_session_' + reportId, sessionId); } catch (e) {}
        }
        burstOrb();
        ChatVoice.speak(d.answer);
        bump('qitu_chat_count');
        // 更新列表最近消息
        var list = convos();
        var c = list.filter(function (x) { return x.id === 'ai'; })[0];
        if (c) { c.last = q; c.time = '刚刚'; saveConvos(list); }
      } else {
        var dd = d.detail;
        var m = Array.isArray(dd) ? ((dd[0] && dd[0].msg) || '请求参数有误') : (dd || '请稍后再试');
        addMsg('ai', '出错了：' + m);
      }
    }).catch(function () {
      typing.remove();
      addMsg('ai', '网络异常，请稍后再试。');
    }).then(function () {
      busy = false;
      $('sendBtn').disabled = false;
      $('msgInput').focus();
    });
  }

  /* ---- 外接 AI（OpenAI 兼容 /chat/completions） ---- */
  function extAiSend(q, qWithMode, typing) {
    var ext = getExt();
    var msgs = [{ role: 'system', content: extSystemPrompt() }];
    aiHist.slice(-12).forEach(function (m) { msgs.push(m); });
    msgs.push({ role: 'user', content: qWithMode });
    aiHist.push({ role: 'user', content: qWithMode });
    var url = ext.base.replace(/\/+$/, '') + '/chat/completions';
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ext.key },
      body: JSON.stringify({ model: ext.model || 'deepseek-chat', messages: msgs, temperature: 0.7, max_tokens: 1600 })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (d) {
      typing.remove();
      var ans = (d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '';
      if (!ans) { aiHist = aiHist.slice(0, Math.max(0, aiHist.length - 1)); throw new Error('返回为空'); }
      aiHist.push({ role: 'assistant', content: ans });
      addMsg('ai', ans, suggestActions(ans));
      burstOrb();
      ChatVoice.speak(ans);
      bump('qitu_chat_count');
      var list = convos();
      var c = list.filter(function (x) { return x.id === 'ai'; })[0];
      if (c) { c.last = q; c.time = '刚刚'; saveConvos(list); }
    }).catch(function (e) {
      typing.remove();
      aiHist = aiHist.slice(0, Math.max(0, aiHist.length - 1));
      toast('外接 AI 不可用（' + ((e && e.message) || '网络/CORS') + '），已回退内置王半仙');
      fallbackAiSend(qWithMode, typing);
    }).then(function () {
      busy = false;
      $('sendBtn').disabled = false;
      $('msgInput').focus();
    });
  }

  /* 外接 AI 失败 → 回退原站后端 */
  function fallbackAiSend(qWithMode, typing) {
    var body = { report_id: reportId, question: qWithMode, session_id: sessionId };
    fetch(API + '/api/chat/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); }).then(function (d) {
      typing.remove();
      if (d.answer) {
        addMsg('ai', d.answer, suggestActions(d.answer));
        if (d.session_id && d.session_id !== sessionId) {
          sessionId = d.session_id;
          try { localStorage.setItem('qitu_chat_session_' + reportId, sessionId); } catch (e) {}
        }
        burstOrb();
        ChatVoice.speak(d.answer);
        bump('qitu_chat_count');
        var list = convos();
        var c = list.filter(function (x) { return x.id === 'ai'; })[0];
        if (c) { c.last = qWithMode; c.time = '刚刚'; saveConvos(list); }
      } else {
        var dd = d.detail;
        var m = Array.isArray(dd) ? ((dd[0] && dd[0].msg) || '请求参数有误') : (dd || '请稍后再试');
        addMsg('ai', '出错了：' + m);
      }
    }).catch(function () {
      typing.remove();
      addMsg('ai', '网络异常，请稍后再试。');
    });
  }

  /* AI 回复 → 情境化行动按钮（点击记入灵体记忆 qitu_actions） */
  function suggestActions(answer) {
    var acts = [];
    var a = String(answer || '');
    if (/投递|简历|准备|面试/.test(a)) acts.push('投递简历');
    if (/简历/.test(a) && acts.indexOf('投递简历') === -1) acts.push('更新简历');
    if (/跳槽|离职|offer/.test(a)) acts.push('更新简历');
    if (/副业|接单/.test(a)) acts.push('列副业清单');
    if (/学习|考证|培训/.test(a)) acts.push('安排学习计划');
    if (/谈薪|加薪|升职/.test(a)) acts.push('准备谈薪话术');
    if (/面试/.test(a)) acts.push('准备面试问题');
    return acts.slice(0, 3);
  }

  /* ---- 导师/用户私信房间（本地演示 + 模拟回复） ---- */
  var DM_REPLY = {
    mentor_li: ['你的命盘我看过了，正官透干，考公路线确实顺。但今年流年冲官星，建议先稳住当下，明年开春再动。', '财库有动静，这个月适合梳理客户资源，别急着签大单。'],
    mentor_chen: ['简历上把"参与"改成"主导"，数据写具体。上次说的那家，周三前投出去。', '职业转型不是换赛道，是换打法。你现在的技能可以平移，别清零重来。'],
    user_x: ['我上周抓了个矿：主动找老客户续约，一次成了两单！', '匿名问：你们面试都怎么谈薪的？求支招。']
  };
  var DM_WELCOME = {
    mentor_li: '你好，我是李师傅。命理方向的问题都可以问我，先说说你的情况？',
    mentor_chen: '你好，我是陈老师，专注职业规划与简历优化。现在方便聊聊吗？',
    user_x: '（匿名用户）嗨，刚看了你的帖子，来交流一下挖矿心得！'
  };

  function openDmRoom() {
    renderQuick([]); // 私信无快捷提问
    var nav = $('roomNav'); if (nav) nav.innerHTML = '';
    var msgs = dm(current.id);
    msgsEl.insertAdjacentHTML('afterbegin', '<div class="sys-tip">— ' + (current.type === 'mentor' ? '真人导师私信 · 已脱敏' : '社区匿名交流 · 隐私保护') + ' —</div>');
    if (!msgs.length) {
      addMsg('ai', DM_WELCOME[current.id] || '你好，很高兴和你交流。');
      saveDm(current.id, [{ role: 'ai', content: DM_WELCOME[current.id] || '你好，很高兴和你交流。', t: Date.now() }]);
    } else {
      msgs.forEach(function (m) { addMsg(m.role, m.content); });
    }
  }

  function dmSend(q) {
    if (!q) return;
    addMsg('user', q);
    var msgs = dm(current.id);
    msgs.push({ role: 'user', content: q, t: Date.now() });
    saveDm(current.id, msgs);
    bump('qitu_chat_count');
    // 更新列表
    var list = convos();
    var c = list.filter(function (x) { return x.id === current.id; })[0];
    if (c) { c.last = q; c.time = '刚刚'; saveConvos(list); }
    var typing = addTyping();
    var replies = DM_REPLY[current.id] || ['收到，我再看看你的情况，晚点详细回你。', '明白，这个方向值得深入聊聊。'];
    setTimeout(function () {
      typing.remove();
      var reply = replies[Math.floor(Math.random() * replies.length)];
      addMsg('ai', reply);
      var msgs2 = dm(current.id);
      msgs2.push({ role: 'ai', content: reply, t: Date.now() });
      saveDm(current.id, msgs2);
      burstOrb();
      ChatVoice.speak(reply);
    }, 1200 + Math.random() * 1000);
  }

  /* ---- 咨询订单房间 ---- */
  function openOrderRoom() {
    renderQuick([]);
    var nav = $('roomNav'); if (nav) nav.innerHTML = '';
    msgsEl.innerHTML = '';
    msgsEl.insertAdjacentHTML('afterbegin', '<div class="sys-tip">— 咨询订单 · 语音咨询 —</div>');
    msgsEl.insertAdjacentHTML('beforeend',
      '<div class="order-card">' +
      '<div class="o-hd"><span class="ic">📋</span><span class="nm">张导师 · 语音咨询</span><span class="tag">待开始</span></div>' +
      '<div class="o-row">⏰ 时间：<b>8月31日（周一）15:00</b></div>' +
      '<div class="o-row">📞 时长：30 分钟 · 语音连线</div>' +
      '<div class="o-row">📝 主题：跳槽时机与职业方向</div>' +
      '<div class="o-actions"><button class="primary" data-oa="join">进入咨询</button><button data-oa="resched">改期</button></div>' +
      '</div>');
    msgsEl.scrollTop = msgsEl.scrollHeight;
    msgsEl.querySelectorAll('[data-oa]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.oa === 'join') toast('咨询室 8月31日 15:00 开放，届时从本页进入');
        else toast('改期需联系客服，将稍后处理');
      });
    });
  }

  /* ---- 命理导航条（AI 房间顶部横向话题） ---- */
  function renderNav() {
    var nav = $('roomNav');
    if (!nav) return;
    nav.innerHTML = '<span class="rn-t">🧭 命理导航</span>' + NAV_TOPICS.map(function (x) {
      return '<button class="rn-chip" data-q="' + esc(x.q) + '">' + esc(x.t) + '</button>';
    }).join('');
    nav.querySelectorAll('.rn-chip').forEach(function (b) {
      b.addEventListener('click', function () { send(b.dataset.q); });
    });
  }

  /* ---- 快速提问（动态 4 个） ---- */
  function renderQuick(qs) {
    if (!qs.length) { quickEl.innerHTML = ''; return; }
    quickEl.innerHTML = qs.map(function (q) { return '<button class="q-btn" data-q="' + esc(q) + '">' + esc(q) + '</button>'; }).join('');
    quickEl.querySelectorAll('.q-btn').forEach(function (b) {
      b.addEventListener('click', function () { send(b.dataset.q); });
    });
  }

  function send(q) {
    var text = (q || $('msgInput').value).trim();
    if (!text) return;
    $('msgInput').value = '';
    if (current.type === 'ai') aiSend(text);
    else dmSend(text);
  }

  /* ============ 新对话 ============ */
  function newChat(kind) {
    closeNewc();
    var list = convos();
    var id, name, sub, avatar, online;
    if (kind === 'ai') { id = 'ai'; name = '王半仙 AI'; sub = 'AI 参谋'; avatar = '🔮'; online = true; }
    else if (kind === 'mentor') { id = 'mentor_li'; name = '李师傅'; sub = '命理导师'; avatar = '🧘'; online = true; }
    else { id = 'user_x'; name = '匿名矿友'; sub = '社区用户'; avatar = '👥'; online = true; }
    var exists = list.filter(function (x) { return x.id === id; })[0];
    if (!exists) {
      list.unshift({ id: id, type: kind === 'user' ? 'user' : (kind === 'ai' ? 'ai' : 'mentor'), name: name, sub: sub, avatar: avatar, online: online, unread: 0, last: '', time: '刚刚', pinned: 0 });
      saveConvos(list);
    }
    if (id === 'ai' && sessionId) { try { localStorage.removeItem('qitu_chat_session_' + reportId); } catch (e) {} sessionId = null; }
    renderList();
    openRoom(id);
  }
  function closeNewc() { $('newcMask').classList.remove('show'); }

  /* ============ 事件绑定 ============ */
  function bindEvents() {
    $('newConvoBtn').addEventListener('click', function () { $('newcMask').classList.add('show'); });
    $('roomBack').addEventListener('click', backToList);
    $('sendBtn').addEventListener('click', function () { send(); });
    $('msgInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });
    $('searchInput').addEventListener('input', function (e) { searchKw = e.target.value.trim(); renderList(); });
    $('editBtn').addEventListener('click', function () {
      if (editMode) { exitEdit(); return; }
      editMode = true;
      $('editBtn').classList.add('on');
      document.body.classList.add('edit-mode');
      listEl.classList.add('edit-mode');
      updateBatch();
    });
    $('batchDel').addEventListener('click', function () {
      var ids = Object.keys(selected);
      if (!ids.length) return;
      if (!confirm('删除选中的 ' + ids.length + ' 个会话？')) return;
      var list = convos().filter(function (x) { return !selected[x.id]; });
      saveConvos(list);
      exitEdit();
      toast('已删除 ' + ids.length + ' 个会话');
    });
    $('ttsBtn').addEventListener('click', function () {
      var on = !ChatVoice.isTtsOn();
      ChatVoice.setTts(on);
      $('ttsBtn').textContent = on ? '🔊 播报·开' : '🔊 播报';
      $('ttsBtn').classList.toggle('on', on);
      toast(on ? '已开启：AI 回复自动语音播报' : '已关闭语音播报');
      if (!on) ChatVoice.stopSpeak();
    });
    $('voiceBtn').addEventListener('click', function () {
      var v = $('voiceBtn');
      if (v.classList.contains('rec')) { ChatVoice.stopSpeak(); v.classList.remove('rec'); v.textContent = '🎤'; return; }
      if (!ChatVoice.supported) { toast('浏览器不支持语音识别，请用 Chrome/Edge'); return; }
      v.classList.add('rec');
      v.textContent = '🔴';
      toast('请说话…');
      ChatVoice.recognize(function (txt, err) {
        v.classList.remove('rec');
        v.textContent = '🎤';
        if (err) { toast(err); return; }
        if (txt) { $('msgInput').value = txt; $('msgInput').focus(); }
      });
    });
    /* 讲解模式切换 */
    var seg = $('modeSeg');
    if (seg) {
      var curMode = getMode();
      seg.querySelectorAll('.m-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.mode === curMode); });
      seg.querySelectorAll('.m-btn').forEach(function (b) {
        b.addEventListener('click', function () {
          seg.querySelectorAll('.m-btn').forEach(function (x) { x.classList.remove('active'); });
          b.classList.add('active');
          setMode(b.dataset.mode);
          toast(getMode() === 'pro' ? '讲解模式：专业（术语详解）' : '讲解模式：普通（通俗易懂）');
        });
      });
    }
    /* 外接 AI 设置 */
    $('extBtn').addEventListener('click', openExt);
    $('extSwitch').addEventListener('click', function () { $('extSwitch').classList.toggle('on'); });
    $('extSave').addEventListener('click', saveExt);
    $('extCancel').addEventListener('click', closeExt);
    /* 行动按钮（点击记入灵体记忆） */
    msgsEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      var n = bump('qitu_actions');
      toast('✅ 已记入有效动作（第 ' + n + ' 个）：「' + b.dataset.act + '」');
    });
  }

  /* ============ 外接 AI 设置弹层 ============ */
  function openExt() {
    var cfg = getExt();
    $('extBase').value = cfg.base || '';
    $('extKey').value = cfg.key || '';
    $('extModel').value = cfg.model || '';
    $('extSwitch').classList.toggle('on', !!cfg.enabled);
    $('extMask').classList.add('show');
  }
  function closeExt() { $('extMask').classList.remove('show'); }
  function saveExt() {
    var base = $('extBase').value.trim();
    var key = $('extKey').value.trim();
    var model = $('extModel').value.trim() || 'deepseek-chat';
    var enabled = $('extSwitch').classList.contains('on');
    if (enabled && (!base || !key)) { toast('启用外接 AI 需填写接口地址和 API Key'); return; }
    setExt({ enabled: enabled, base: base, key: key, model: model });
    closeExt();
    toast(enabled ? '✅ 外接 AI 已启用：' + model : '已关闭外接 AI');
    if (current && current.type === 'ai') {
      var e = getExt();
      $('roomStatus').innerHTML = extOn()
        ? '<span class="dot" style="background:#e9c46a;box-shadow:0 0 6px #e9c46a"></span>在线 · 外接 AI · ' + esc(e.model)
        : '<span class="dot"></span>在线 · 随缘回复';
    }
  }

  /* ============ 初始化 ============ */
  function init() {
    reportId = sessionStorage.getItem('currentReportId');
    if (!reportId) {
      var params = new URLSearchParams(location.search);
      reportId = params.get('id');
      if (reportId) sessionStorage.setItem('currentReportId', reportId);
    }
    // 社区跳转参数：?to=ai / ?to=mentor_li / ?to=user_x
    var to = new URLSearchParams(location.search).get('to');
    var type = new URLSearchParams(location.search).get('type');
    renderList();
    bindEvents();
    if (to) {
      if (to === 'ai') newChat('ai');
      else if (to === 'mentor' || to === 'mentor_li') openRoom('mentor_li');
      else if (to === 'mentor_chen') openRoom('mentor_chen');
      else if (to === 'user') openRoom('user_x');
      else if (convos().some(function (c) { return c.id === to; })) openRoom(to);
    }
  }

  window.ChatApp = { newChat: newChat, closeNewc: closeNewc, closeExt: closeExt };
  init();
})();
