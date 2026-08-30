/* ============================================================
   王半仙 v3 · 背景画布控制器（无光球）
   ------------------------------------------------------------
   说明：原「蓝紫灵体光球」已按需求移除，本模块仅保留接口兼容
   （window.Spirit.setMode / play 仍可被页面调用，但不再绘制任何
   球体或光晕），避免改动其它页面逻辑。实际氛围由星空滑落
   （starfield.js）+ 弥散光晕（CSS .spirit-glow）共同呈现。
   ============================================================ */

(function () {
  'use strict';

  var canvas = document.getElementById('spirit-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  var w = 0, h = 0;
  var action = null;

  function resize() {
    w = canvas.clientWidth || window.innerWidth;
    h = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.max(1, w * dpr);
    canvas.height = Math.max(1, h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  /* ---- 对外接口：window.Spirit（兼容旧调用，视觉已移除） ---- */
  window.Spirit = {
    setMode: function () { /* 光球已移除，模式不再影响绘制 */ },
    play: function (name) { action = name; /* 预留：可在此触发轻量过渡 */ },
  };

  // 保持画布透明，不绘制任何球体/光晕
  ctx.clearRect(0, 0, w, h);
})();
