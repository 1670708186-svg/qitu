/* 星空背景动画 - Canvas 粒子（性能优化版）
 * 优化：星云渐变离屏预渲染（不再每帧 createRadialGradient）、
 *      密度自适应（低配机减负）、页面不可见时暂停动画 */
(function () {
    const canvas = document.getElementById('starfield');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let stars = [];
    let nebulas = [];
    let W, H;
    let running = true;

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
        initStars();
    }

    function initStars() {
        stars = [];
        // 密度自适应：小屏（低配手机常见）降密度
        const per = (W * H < 500000) ? 9000 : 7000;
        const count = Math.floor((W * H) / per);
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * W,
                y: Math.random() * H,
                r: Math.random() * 1.5 + 0.3,
                baseAlpha: Math.random() * 0.6 + 0.2,
                alpha: 0,
                twinkleSpeed: Math.random() * 0.02 + 0.005,
                phase: Math.random() * Math.PI * 2,
                vy: Math.random() * 0.15 + 0.02,
            });
        }
        // 星云：离屏预渲染（每帧 createRadialGradient 是低端机卡顿元凶）
        nebulas = [];
        for (let i = 0; i < 3; i++) {
            const r = Math.random() * 200 + 150;
            const hue = [265, 220, 280][i % 3];
            // 每个星云画到自己的离屏 canvas 上，只画一次
            const off = document.createElement('canvas');
            off.width = off.height = Math.ceil(r * 2);
            const octx = off.getContext('2d');
            const grad = octx.createRadialGradient(r, r, 0, r, r, r);
            grad.addColorStop(0, `hsla(${hue}, 60%, 50%, 0.05)`);
            grad.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
            octx.fillStyle = grad;
            octx.fillRect(0, 0, r * 2, r * 2);

            nebulas.push({
                sprite: off,
                r: r,
                x: Math.random() * W,
                y: Math.random() * H,
                vx: (Math.random() - 0.5) * 0.1,
            });
        }
    }

    let t = 0;
    let meteors = [];
    let nextMeteorAt = 60;

    function draw() {
        if (!running) return;   // 页面不可见时彻底停止（回来时再启动）
        t += 1;
        ctx.clearRect(0, 0, W, H);

        // 星云（离屏 sprite 平移绘制，性能大幅提升）
        for (const n of nebulas) {
            ctx.drawImage(n.sprite, n.x - n.r, n.y - n.r);
            n.x += n.vx;
            if (n.x < -n.r) n.x = W + n.r;
            if (n.x > W + n.r) n.x = -n.r;
        }

        // 星星（小星用 fillRect，大星用 arc + 光晕）
        for (const s of stars) {
            s.phase += s.twinkleSpeed;
            s.alpha = s.baseAlpha * (0.6 + 0.4 * Math.sin(s.phase));
            s.y += s.vy;
            if (s.y > H) s.y = 0;

            if (s.r < 0.8) {
                // 小星星：矩形填充（视觉几乎无差，绘制快数倍）
                ctx.fillStyle = `rgba(230, 220, 255, ${s.alpha})`;
                ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
            } else {
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(230, 220, 255, ${s.alpha})`;
                ctx.fill();

                if (s.r > 1.3) {
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.r * 2.5, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(212, 175, 55, ${s.alpha * 0.15})`;
                    ctx.fill();
                }
            }
        }

        // 流星生成：每 2-3 秒一颗
        if (t >= nextMeteorAt) {
            spawnMeteor();
            nextMeteorAt = t + 120 + Math.floor(Math.random() * 60);
        }

        for (let i = meteors.length - 1; i >= 0; i--) {
            const m = meteors[i];
            m.x += m.vx;
            m.y += m.vy;
            m.life -= m.fade;
            if (m.life <= 0 || m.x < -200 || m.y > H + 200 || m.x > W + 200) {
                meteors.splice(i, 1);
                continue;
            }
            const tailLen = m.tailLen;
            const grad = ctx.createLinearGradient(
                m.x, m.y,
                m.x - m.vx * tailLen, m.y - m.vy * tailLen
            );
            grad.addColorStop(0, `rgba(245, 230, 184, ${m.life})`);
            grad.addColorStop(0.4, `rgba(212, 175, 55, ${m.life * 0.6})`);
            grad.addColorStop(1, 'rgba(212, 175, 55, 0)');
            ctx.strokeStyle = grad;
            ctx.lineWidth = m.width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(m.x, m.y);
            ctx.lineTo(m.x - m.vx * tailLen, m.y - m.vy * tailLen);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.width * 0.9, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 248, 224, ${m.life * 0.8})`;
            ctx.fill();
        }

        requestAnimationFrame(draw);
    }

    function spawnMeteor() {
        const fromTop = Math.random() < 0.6;
        const speed = Math.random() * 3 + 4;
        const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.4;
        let x, y;
        if (fromTop) {
            x = Math.random() * W * 0.8 + W * 0.2;
            y = -20;
        } else {
            x = W + 20;
            y = Math.random() * H * 0.4;
        }
        meteors.push({
            x: x,
            y: y,
            vx: -Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            fade: 0.012 + Math.random() * 0.008,
            width: 1.4 + Math.random() * 0.8,
            tailLen: 12 + Math.random() * 6,
        });
        if (meteors.length > 4) meteors.shift();
    }

    // 页面不可见时暂停（切后台不再耗电耗 CPU）
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            running = false;
        } else if (!running) {
            running = true;
            requestAnimationFrame(draw);
        }
    });

    window.addEventListener('resize', resize);
    resize();
    draw();
})();
