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
    var W = 0, H = 0, R = 0, particles = [], raf = 0;
    var rings = opts.rings != null ? opts.rings : 3;
    var ringColor = opts.ringColor || '170,190,240';     // 轨道淡蓝
    var coreHi = opts.coreHi || '255,255,255';          // 亮白核心
    var coreMid = opts.coreMid || '165,195,255';        // 淡蓝
    var coreDeep = opts.coreDeep || '110,75,200';       // 深紫
    var particleN = opts.particles != null ? opts.particles : 22;
    var ringAlphas = opts.ringAlphas || [0.34, 0.20, 0.11];  // 由内向外递减
    var ringRadii = opts.ringRadii || [0.55, 0.78, 1.0];     // 三层轨道（最外=canvas 半径）
    var radiusScale = opts.radiusScale != null ? opts.radiusScale : 0.5;  // R=min(W,H)*scale
    function resize() {
      var r = canvas.getBoundingClientRect();
      W = canvas.width = Math.max(8, Math.round(r.width * dpr));
      H = canvas.height = Math.max(8, Math.round(r.height * dpr));
      R = Math.min(W, H) * radiusScale;
      particles = [];
      for (var i = 0; i < particleN; i++) {
        particles.push({
          a: Math.random() * Math.PI * 2,                          // 角度
          speed: (0.15 + Math.random() * 0.5) * (Math.random() > 0.5 ? 1 : -1) * 0.0016,
          band: 0.4 + Math.random() * 0.65,                       // 轨道带（0.4R~1.05R）
          drift: (Math.random() - 0.5) * 0.35,                    // 径向漂移幅度
          ph: Math.random() * Math.PI * 2,                        // 漂移相位
          baseA: 0.35 + Math.random() * 0.45,                     // 亮度
          r: 1.1 + Math.random() * 1.5,                           // 光点半径
          jump: Math.random() < 0.35                              // 是否跳跃型
        });
      }
    }
    function draw(t) {
      if (!canvas.isConnected) { cancelAnimationFrame(raf); return; }
      ctx.clearRect(0, 0, W, H);
      var cx = W / 2, cy = H / 2;
      var breathe = 0.5 + 0.5 * Math.sin(t * 0.0016);            // 整体呼吸 0~1
      // 深紫外晕（半透明，随呼吸明暗）
      var haloR = R * 1.5;
      var haloG = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, haloR);
      haloG.addColorStop(0, 'rgba(120,85,220,' + (0.10 + 0.05 * breathe).toFixed(3) + ')');
      haloG.addColorStop(0.55, 'rgba(120,85,220,0.06)');
      haloG.addColorStop(1, 'rgba(60,30,140,0)');
      ctx.fillStyle = haloG;
      ctx.beginPath(); ctx.arc(cx, cy, haloR, 0, Math.PI * 2); ctx.fill();
      // 三层同心圆轨道：透明度由内向外递减 + 呼吸
      for (var w = 0; w < rings && w < ringRadii.length; w++) {
        var rr = ringRadii[w] * R;
        var ra = ringAlphas[w] * (0.75 + 0.25 * breathe);
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(' + ringColor + ',' + ra.toFixed(3) + ')';
        ctx.lineWidth = w === 0 ? 1.4 : 1;
        ctx.stroke();
      }
      // 核心灵球：亮白 → 淡蓝 → 深紫 半透明渐变（呼吸）
      var coreR = R * 0.52 * (0.92 + 0.08 * breathe);
      var cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      cg.addColorStop(0, 'rgba(' + coreHi + ',0.95)');
      cg.addColorStop(0.35, 'rgba(' + coreMid + ',0.55)');
      cg.addColorStop(0.7, 'rgba(' + coreDeep + ',0.22)');
      cg.addColorStop(1, 'rgba(' + coreDeep + ',0)');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.fill();
      // 星尘粒子：轨道带内缓慢旋转 + 部分来回飘散跳跃 + 闪烁
      for (var k = 0; k < particles.length; k++) {
        var p = particles[k];
        p.a += p.speed;
        if (p.jump && Math.random() < 0.05) {
          p.a += (Math.random() - 0.5) * 1.4;                 // 跳跃：角度突变
          p.band += (Math.random() - 0.5) * 0.18;             // 径向抖动
          if (p.band < 0.4) p.band = 0.4;
          if (p.band > 1.35) p.band = 1.35;
        }
        p.ph += 0.004;
        var d = p.band * R + p.drift * R * Math.sin(p.ph);   // 来回飘散
        var px = cx + Math.cos(p.a) * d;
        var py = cy + Math.sin(p.a) * d;
        var tw = 0.5 + 0.5 * Math.sin(t * 0.003 + p.ph * 3); // 闪烁
        var pa = p.baseA * (0.35 + 0.65 * tw);
        var pg = ctx.createRadialGradient(px, py, 0, px, py, p.r);
        pg.addColorStop(0, 'rgba(' + coreMid + ',' + pa.toFixed(3) + ')');
        pg.addColorStop(1, 'rgba(' + coreMid + ',0)');
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(px, py, p.r, 0, Math.PI * 2); ctx.fill();
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
    // 中心发光体/轨道/星尘由独立星灵球 canvas（loader-orb）呈现，这里只保留火花放射
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
