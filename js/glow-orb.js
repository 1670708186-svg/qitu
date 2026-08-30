/* 王半仙 v3 · 光晕粒子球引擎
   把 .glow-orb 元素渲染成「无实体边」的柔光球：
   - 中心：多层径向渐变，中心亮 → 边缘完全渐隐透明（没有圆形轮廓线）
   - 周围：N 个小粒子（柔光小球）环绕漂浮、缓慢旋转、呼吸闪烁
   用法：<div class="glow-orb" data-c1="#b8aee8" data-c2="#d9578a" data-n="9" data-r="1">🔮</div>
   - data-c1 / data-c2：光晕主色 / 次色（默认天蓝紫 / 玫瑰粉）
   - data-n：粒子数量（默认按元素大小自适应）
   - data-r：光晕半径倍率（默认 1）
   元素原内容会自动包进 .glow-orb-content 显示在粒子层上方；
   动态新增的 .glow-orb 由 MutationObserver 自动接管。 */
(function () {
  'use strict';

  function hex2rgba(hex, a) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    if (!m) return 'rgba(184,174,232,' + a + ')';
    return 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',' + a + ')';
  }

  function init(el) {
    if (el.__glowInit) return;
    el.__glowInit = true;
    var c1 = el.getAttribute('data-c1') || '#b8aee8';
    var c2 = el.getAttribute('data-c2') || '#d9578a';
    var rMul = parseFloat(el.getAttribute('data-r')) || 1;

    // 内容包一层，保证显示在画布之上
    if (!el.querySelector(':scope > .glow-orb-content')) {
      var inner = document.createElement('span');
      inner.className = 'glow-orb-content';
      while (el.firstChild) inner.appendChild(el.firstChild);
      el.appendChild(inner);
    }
    var cv = document.createElement('canvas');
    el.appendChild(cv);
    var ctx = cv.getContext('2d');
    var w = 0, h = 0, R = 1, parts = [], raf = 0, running = true, sized = false;

    function resize() {
      var r = el.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var nw = Math.round(r.width * dpr), nh = Math.round(r.height * dpr);
      if (nw < 4 || nh < 4) { sized = false; return; }   // 隐藏/未布局时先占位，下一帧再试
      sized = true;
      var changed = nw !== w || nh !== h;
      w = nw; h = nh;
      if (changed) {
        cv.width = w; cv.height = h;
        R = Math.min(w, h) / 2;
        initParts();
      }
    }
    function initParts() {
      var n = parseInt(el.getAttribute('data-n'), 10) || Math.max(5, Math.round(R * 0.3));
      parts = [];
      for (var i = 0; i < n; i++) {
        parts.push({
          a: Math.random() * Math.PI * 2,
          dist: 0.42 + Math.random() * 0.58,
          r: (0.7 + Math.random() * 1.7) * (w / 46),
          speed: (0.15 + Math.random() * 0.4) * (Math.random() > 0.5 ? 1 : -1),
          tw: Math.random() * Math.PI * 2,
          twSpeed: 0.02 + Math.random() * 0.05,
          c: Math.random() > 0.55 ? c1 : c2
        });
      }
    }
    function softDot(x, y, r, color, alpha) {
      var g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, r));
      g.addColorStop(0, hex2rgba(color, alpha));
      g.addColorStop(1, hex2rgba(color, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, Math.max(1, r), 0, Math.PI * 2); ctx.fill();
    }
    function draw(t) {
      if (!running) return;
      if (!document.contains(cv)) { running = false; cancelAnimationFrame(raf); return; }
      resize();
      if (!sized) { raf = requestAnimationFrame(draw); return; }
      ctx.clearRect(0, 0, w, h);
      var cx = w / 2, cy = h / 2;
      var breath = 1 + 0.05 * Math.sin(t * 0.0022);
      var S = R * rMul * breath;
      // 第 1 层：主柔光（中心亮 → 完全渐隐，无硬边）
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, S));
      g.addColorStop(0, hex2rgba(c1, 0.55));
      g.addColorStop(0.35, hex2rgba(c2, 0.26));
      g.addColorStop(0.65, hex2rgba(c1, 0.10));
      g.addColorStop(1, hex2rgba(c1, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, S), 0, Math.PI * 2); ctx.fill();
      // 第 2 层：更大范围弥散（更软）
      var g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, S * 1.5));
      g2.addColorStop(0, hex2rgba(c2, 0.12));
      g2.addColorStop(1, hex2rgba(c2, 0));
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, S * 1.5), 0, Math.PI * 2); ctx.fill();
      // 环绕小粒子（小球粒子效果）
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.a += p.speed * 0.005;
        p.tw += p.twSpeed;
        var alpha = 0.30 + 0.55 * Math.abs(Math.sin(p.tw));
        var d = S * p.dist;
        var px = cx + Math.cos(p.a) * d;
        var py = cy + Math.sin(p.a) * d;
        softDot(px, py, p.r * (1 + 0.35 * Math.sin(p.tw)), p.c, alpha);
      }
      raf = requestAnimationFrame(draw);
    }
    resize();
    raf = requestAnimationFrame(draw);
  }

  function scan(root) {
    var els = (root || document).querySelectorAll('.glow-orb');
    for (var i = 0; i < els.length; i++) init(els[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { scan(); });
  } else scan();

  // 动态新增的 .glow-orb 自动接管
  var mo = window.MutationObserver ? new MutationObserver(function (muts) {
    var need = false;
    for (var i = 0; i < muts.length; i++) {
      if (muts[i].addedNodes && muts[i].addedNodes.length) { need = true; break; }
    }
    if (need) scan(document);
  }) : null;
  if (mo) mo.observe(document.body || document.documentElement, { childList: true, subtree: true });

  window.GlowOrb = { scan: scan, init: init };
})();
