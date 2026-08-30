/* ============================================================
   王半仙 v3 · 启动屏主视觉引擎
   ------------------------------------------------------------
   开场视觉（无球体，仅放射状星芒 + 深空蓝黑底）：
   1. 白色火花爆发（canvas 短白线从中心向外爆炸，每根独立闪烁）
   2. 旋转星云（背景层 canvas 螺旋粒子，深空蓝黑底）
   3. 宇宙低频音效（WebAudio 合成，3 秒循环，可选开关）
   时间线（默认 4.2s，可跳过）：
     0.0-1.1s  火花绽放 · 星云渐显旋转
     1.1-3.1s  持续爆发 + 旋转 · "正在链接高维…" 打字机
     3.1-4.2s  火花凝聚加速
     4.2s      进入入口屏
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var loader = $('spLoader');

  /* ================= 王半仙灵体（可复用画法，必须先注册——在 return 之前） =================
   * canvas 中央 = 柔光渐隐 + 多层蓝紫涟漪 + 环绕粒子；
   * 供启动屏、矿脉空态、其它"灵体"位置统一调用。 */
  function createOrb(canvas, opts) {
    opts = opts || {};
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, R = 0, particles = [], raf = 0, t0 = 0;
    var rings = opts.rings != null ? opts.rings : 3;
    var ringColor = opts.ringColor || '140,160,235';
    var coreColor = opts.coreColor || '255,255,255';
    var particleN = opts.particles != null ? opts.particles : 12;
    function resize() {
      var r = canvas.getBoundingClientRect();
      W = canvas.width = Math.max(8, Math.round(r.width * dpr));
      H = canvas.height = Math.max(8, Math.round(r.height * dpr));
      R = Math.min(W, H) * 0.18;
      particles = [];
      for (var i = 0; i < particleN; i++) {
        particles.push({
          phase: Math.random() * Math.PI * 2,
          speed: 0.0004 + Math.random() * 0.0006,
          dist: 0.5 + Math.random() * 0.7,
          baseA: 0.4 + Math.random() * 0.4
        });
      }
    }
    function draw(t) {
      if (!canvas.isConnected) { cancelAnimationFrame(raf); return; }
      t0 = t;
      ctx.clearRect(0, 0, W, H);
      var cx = W / 2, cy = H / 2;
      var haloR = R * 1.4;
      var haloG = ctx.createRadialGradient(cx, cy, R * 0.15, cx, cy, haloR);
      haloG.addColorStop(0, 'rgba(150,140,235,0)');
      haloG.addColorStop(0.6, 'rgba(124,107,214,0.12)');
      haloG.addColorStop(1, 'rgba(60,40,120,0)');
      ctx.fillStyle = haloG;
      ctx.beginPath(); ctx.arc(cx, cy, haloR, 0, Math.PI * 2); ctx.fill();
      for (var w = 0; w < rings; w++) {
        var phase = ((t * 0.0006 + w / rings) % 1);
        var ringR = R * 0.6 + phase * (R * 1.3);
        var ringA = 0.6 * (1 - phase) * (1 - phase);
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(' + ringColor + ',' + ringA.toFixed(3) + ')';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      var coreR = R * 0.5 * (0.9 + 0.1 * Math.sin(t * 0.004));
      var cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      cg.addColorStop(0, 'rgba(' + coreColor + ',0.85)');
      cg.addColorStop(0.4, 'rgba(' + coreColor + ',0.30)');
      cg.addColorStop(1, 'rgba(' + coreColor + ',0)');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.fill();
      for (var k = 0; k < particles.length; k++) {
        var p = particles[k];
        p.phase += p.speed * 16;
        var a = p.phase;
        var d = p.dist * R;
        var px = cx + Math.cos(a) * d;
        var py = cy + Math.sin(a) * d;
        var pa = p.baseA * (0.55 + 0.45 * Math.sin(t * 0.003 + k * 1.7));
        var pg = ctx.createRadialGradient(px, py, 0, px, py, 2.4);
        pg.addColorStop(0, 'rgba(' + coreColor + ',' + pa.toFixed(3) + ')');
        pg.addColorStop(1, 'rgba(' + coreColor + ',0)');
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(px, py, 2.4, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(draw);
    return { canvas: canvas, stop: function () { cancelAnimationFrame(raf); } };
  }
  window.SpiritOrb = { create: createOrb };

  if (!loader) return;

  /* ================= 1a. 白色火花爆发（短白线粒子） ================= */
  var nebula = $('nebulaCanvas');
  var nctx = nebula.getContext('2d');
  var nW = 0, nH = 0, stars = [], spinning = false, nebulaRAF = null;

  function nebulaResize() {
    nW = nebula.width = loader.clientWidth;
    nH = nebula.height = loader.clientHeight;
  }
  function nebulaInit() {
    nebulaResize();
    stars = [];
    // 火花粒子：精致小火花（参考图风格：细、短、稀疏、克制）
    // 中心亮核 + 两层短刺：密集短刺(细) + 少量长刺(微亮)
    var N = Math.min(110, Math.floor(nW * nH / 4200));
    for (var i = 0; i < N; i++) {
      var ang = Math.random() * Math.PI * 2;
      var len = 4 + Math.pow(Math.random(), 0.8) * 14;   // 4~18px，偏短
      var jitter = (Math.random() - 0.5) * 0.05;
      stars.push({
        a: ang + jitter,
        len: len,
        size: 0.5 + Math.random() * 0.9,      // 细线
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.03 + Math.random() * 0.05,  // 缓慢闪烁
        baseAlpha: 0.35 + Math.random() * 0.3,     // 克制的亮度
        group: Math.random() < 0.15 ? 'long' : 'short',
      });
    }
  }
  function drawSpark(t) {
    if (!spinning) return;
    nctx.clearRect(0, 0, nW, nH);
    var cx = nW * 0.5, cy = nH * 0.44;
    var R = Math.min(nW, nH) * 0.18;
    nctx.lineCap = 'round';
    // 仅保留放射状白色火花细线，不绘制任何实心光球/光晕，画面更清爽

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.phase += s.twinkleSpeed;
      var flicker = 0.5 + 0.5 * Math.sin(s.phase);
      var a = s.baseAlpha * (0.35 + 0.65 * flicker);
      var x1 = cx + Math.cos(s.a) * (s.len * 0.25);
      var y1 = cy + Math.sin(s.a) * (s.len * 0.25);
      var x2 = cx + Math.cos(s.a) * s.len;
      var y2 = cy + Math.sin(s.a) * s.len;
      nctx.strokeStyle = 'rgba(255,255,255,' + a + ')';
      nctx.lineWidth = s.size;
      nctx.beginPath();
      nctx.moveTo(x1, y1);
      nctx.lineTo(x2, y2);
      nctx.stroke();
    }
    // 中心柔光（无实体边：渐变渐隐）+ 环绕小粒子
    var coreR = (2.2 + 0.6 * Math.sin(t * 0.004)) * 2.6;
    var cg = nctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
    cg.addColorStop(0, 'rgba(255,255,255,0.85)');
    cg.addColorStop(0.4, 'rgba(255,255,255,0.30)');
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    nctx.fillStyle = cg;
    nctx.beginPath(); nctx.arc(cx, cy, coreR, 0, Math.PI * 2); nctx.fill();
    // 环绕小粒子（柔光小球，缓慢绕行）
    for (var k = 0; k < 12; k++) {
      var pa = t * 0.0004 + k * Math.PI * 2 / 12;
      var pd = 13 + 6 * Math.sin(t * 0.001 + k * 1.5);
      var ppx = cx + Math.cos(pa) * pd;
      var ppy = cy + Math.sin(pa) * pd;
      var pg = nctx.createRadialGradient(ppx, ppy, 0, ppx, ppy, 2.4);
      pg.addColorStop(0, 'rgba(255,255,255,' + (0.5 + 0.3 * Math.sin(t * 0.003 + k * 1.7)) + ')');
      pg.addColorStop(1, 'rgba(255,255,255,0)');
      nctx.fillStyle = pg;
      nctx.beginPath(); nctx.arc(ppx, ppy, 2.4, 0, Math.PI * 2); nctx.fill();
    }
    // 灵体光晕涟漪：3 层同心蓝紫光环缓慢扩散+回缩
    for (var w = 0; w < 3; w++) {
      var phase = (t * 0.0006 + w / 3) % 1;            // 0→1 循环
      var ringR = 24 + phase * (R * 0.95);              // 半径随相位扩散
      var ringA = 0.55 * (1 - phase) * (1 - phase);    // 越外越淡（二次衰减）
      nctx.beginPath();
      nctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      nctx.strokeStyle = 'rgba(140,160,235,' + ringA.toFixed(3) + ')';
      nctx.lineWidth = 1.2;
      nctx.stroke();
    }
    // 静态柔光外晕（蓝紫调，图1主色）
    var haloR = R * 0.95;
    var haloG = nctx.createRadialGradient(cx, cy, R * 0.15, cx, cy, haloR);
    haloG.addColorStop(0, 'rgba(150,140,235,0)');
    haloG.addColorStop(0.6, 'rgba(124,107,214,0.08)');
    haloG.addColorStop(1, 'rgba(60,40,120,0)');
    nctx.fillStyle = haloG;
    nctx.beginPath(); nctx.arc(cx, cy, haloR, 0, Math.PI * 2); nctx.fill();
    nebulaRAF = requestAnimationFrame(drawSpark);
  }
  function nebulaStart() { spinning = true; nebulaInit(); requestAnimationFrame(drawSpark); }
  function nebulaStop() { spinning = false; if (nebulaRAF) cancelAnimationFrame(nebulaRAF); nctx.clearRect(0, 0, nW, nH); }

  /* ================= 2. 罗盘凝聚时间线 ================= */
  var rays = $('spRays');
  var TIMELINE = { inAt: 80, coalesceAt: 2900, doneAt: 4000 };
  var timelineDone = false;

  function startCompassTimeline(done) {
    setTimeout(function () {
      if (timelineDone) return;
      rays.classList.add('in');
      window.Spirit && window.Spirit.setMode('loaderWhite');
    }, TIMELINE.inAt);

    setTimeout(function () {
      if (timelineDone) return;
      rays.classList.remove('in');
      rays.classList.add('coalesce');
      window.Spirit && window.Spirit.play('implode');
    }, TIMELINE.coalesceAt);

    setTimeout(function () {
      if (timelineDone) return;
      timelineDone = true;
      rays.classList.remove('coalesce');
      rays.style.display = 'none';
      window.Spirit && window.Spirit.play('burst');
      if (done) done();
    }, TIMELINE.doneAt);
  }

  /* ================= 3. 宇宙低频音效（WebAudio 合成） ================= */
  var audio = {
    ctx: null, master: null, osc: null, lfo: null, noise: null, gain: null,
    playing: false,
    start: function () {
      if (this.playing) return;
      try {
        if (!this.ctx) {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          this.ctx = new AC();
          this.master = this.ctx.createGain();
          this.master.gain.value = 0;
          this.master.connect(this.ctx.destination);
          // 主振荡器：低频宇宙 hum（52Hz 正弦 + 轻微失谐 55Hz）
          this.osc = this.ctx.createOscillator();
          this.osc.type = 'sine';
          this.osc.frequency.value = 52;
          var osc2 = this.ctx.createOscillator();
          osc2.type = 'sine';
          osc2.frequency.value = 55.3;
          var oscGain = this.ctx.createGain();
          oscGain.gain.value = 0.5;
          this.osc.connect(oscGain); osc2.connect(oscGain);
          oscGain.connect(this.master);
          // 呼吸 LFO（3 秒周期，营造宇宙脉动感）
          this.lfo = this.ctx.createOscillator();
          this.lfo.frequency.value = 1 / 3;
          this.lfoGain = this.ctx.createGain();
          this.lfoGain.gain.value = 0.10;
          this.lfo.connect(this.lfoGain);
          this.lfoGain.connect(this.master.gain);
          // 底层噪声（极淡的深空沙沙声）
          var len = this.ctx.sampleRate * 3;
          var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
          var data = buf.getChannelData(0);
          for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.05;
          this.noise = this.ctx.createBufferSource();
          this.noise.buffer = buf;
          this.noise.loop = true;
          var nGain = this.ctx.createGain();
          nGain.gain.value = 0.25;
          this.noise.connect(nGain); nGain.connect(this.master);
          this.osc.start(); osc2.start(); this.lfo.start(); this.noise.start();
        }
        this.ctx.resume && this.ctx.resume();
        this.master.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 1.6);
        this.playing = true;
      } catch (e) { /* 不支持则静音 */ }
    },
    stop: function () {
      if (!this.ctx || !this.playing) return;
      try {
        this.master.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.8);
      } catch (e) {}
      this.playing = false;
    },
    fadeOut: function () { this.stop(); },
  };

  /* 音效开关按钮 */
  var audioBtn = $('spAudioToggle');
  var audioOn = false;
  if (audioBtn) {
    audioBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      audioOn = !audioOn;
      if (audioOn) { audio.start(); audioBtn.classList.add('on'); audioBtn.textContent = '🔊'; }
      else { audio.stop(); audioBtn.classList.remove('on'); audioBtn.textContent = '🔇'; }
    });
  }

  /* ================= 导出给 index.html 使用 ================= */
  window.Opening = {
    nebulaStart: nebulaStart,
    nebulaStop: nebulaStop,
    startTimeline: startCompassTimeline,
    audio: audio,
    audioBtn: audioBtn,
    isAudioOn: function () { return audioOn; },
  };
})();
