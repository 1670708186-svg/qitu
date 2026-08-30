/* 报告页逻辑 - 渲染命盘 + 分析 + AI 报告 + 问答 */

// 五行颜色映射
const WX_COLOR = {
    "金": "#ffd700", "木": "#7fd47f", "水": "#5b9bd4",
    "火": "#ff6b6b", "土": "#d4a76a"
};

// 五行汉字转 CSS 类
function wxClass(wx) {
    const map = { "金": "wx-metal", "木": "wx-wood", "水": "wx-water", "火": "wx-fire", "土": "wx-earth" };
    return map[wx] || "";
}

// 简易 markdown 渲染
function renderMarkdown(text) {
    if (!text) return '';
    let html = text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        // 标题
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        // 粗体
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // 列表
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        // 换行
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    // 包裹连续 li
    html = html.replace(/(<li>.*?<\/li>)(?![<])/gs, '<ul>$1</ul>');
    return `<p>${html}</p>`;
}

// 全局数据
let reportData = null;

// 工具：读取本地报告列表（App 级持久化，离线可用）
function getSavedReports() {
    try {
        const list = JSON.parse(localStorage.getItem('qitu_reports') || '[]');
        return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
}

document.addEventListener('DOMContentLoaded', async () => {
    // ===== 数据兜底 =====
    // ?new=1：用户点了"重新测一次"——清掉会话数据，直接进入口表单（历史报告仍在 localStorage）
    const params = new URLSearchParams(location.search);
    if (params.get('new') === '1') {
        sessionStorage.removeItem('reportData');
        sessionStorage.removeItem('currentReportId');
        showV2Entry();
        await renderHistoryReports();
        return;
    }
    // 1) sessionStorage（本次会话刚生成的报告）
    const raw = sessionStorage.getItem('reportData');
    if (raw) {
        try {
            reportData = JSON.parse(raw);
            renderReport(reportData);
            await renderHistoryReports();
            return;
        } catch (e) { /* 数据损坏，继续兜底 */ }
    }
    // 2) localStorage（App 级持久化，离线可用）
    const rid = params.get('id') || sessionStorage.getItem('currentReportId');
    const saved = getSavedReports();
    const hit = rid ? saved.find(r => r.report_id === rid) : saved[0];
    if (hit && hit.data) {
        reportData = hit.data;
        sessionStorage.setItem('reportData', JSON.stringify(reportData));
        sessionStorage.setItem('currentReportId', hit.report_id || '');
        renderReport(reportData);
        await renderHistoryReports();
        return;
    }
    // 3) 网络：URL ?id= 经 GET /api/report/{id} 拉取
    if (rid) {
        try {
            const resp = await fetch(window.API_BASE + `/api/report/${rid}`);
            if (resp.ok) {
                reportData = await resp.json();
                renderReport(reportData);
                await renderHistoryReports();
                return;
            }
        } catch (e) { /* 离线或网络失败，落回无数据提示 */ }
    }
    // 三级都失败：有本地历史但 id 不匹配时，直接展示最近一份（离线友好）
    if (saved.length && saved[0].data) {
        reportData = saved[0].data;
        sessionStorage.setItem('reportData', JSON.stringify(reportData));
        sessionStorage.setItem('currentReportId', saved[0].report_id || '');
        renderReport(reportData);
        await renderHistoryReports();
        return;
    }
    // 真的没数据：展示 v2 内嵌测试漏斗（测完原地渲染 F 型报告）
    showV2Entry();
    await renderHistoryReports();
});

// ===== v2 内嵌测试漏斗（无报告数据时的独立入口） =====
function showV2Entry() {
    const entry = document.getElementById('v2Entry');
    if (entry) entry.style.display = '';
    // 本地自动保存：回填上次填写的生辰
    if (window.AutoSave && entry) {
        AutoSave.restore('qitu_form_v2', entry.querySelector('.v3-form'));
    }
    // 隐藏报告骨架里的其他默认模块（等待生成后再渲染）
    const hero = document.querySelector('.report-header');
    if (hero) hero.style.display = 'none';
}

function v2PickGender(btn) {
    document.querySelectorAll('.v2e-g').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

async function v2GenerateReport() {
    const year = parseInt(document.getElementById('v2Year').value, 10);
    const month = parseInt(document.getElementById('v2Month').value, 10);
    const day = parseInt(document.getElementById('v2Day').value, 10);
    const hour = parseInt(document.getElementById('v2Hour').value, 10);
    const gender = parseInt(document.querySelector('.v2e-g.active').dataset.g, 10);
    const errEl = document.getElementById('v2Err');
    const btn = document.getElementById('v2SubmitBtn');

    if (!year || !month || !day || year < 1900 || year > 2030 || month < 1 || month > 12 || day < 1 || day > 31) {
        errEl.textContent = '请填写完整的出生日期';
        return;
    }
    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = '演算中…';

    try {
        const resp = await fetch(window.API_BASE + '/api/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ year, month, day, hour, minute: 0, gender, calendar: 'solar' }),
        });
        const data = await resp.json();
        if (!resp.ok || !data.chart) {
            throw new Error(data.detail || '生成失败，请稍后重试');
        }
        reportData = data;
        // 写入会话 + 本地历史（与主站数据链路一致）
        sessionStorage.setItem('reportData', JSON.stringify(data));
        sessionStorage.setItem('currentReportId', data.report_id || '');
        try {
            const list = getSavedReports();
            list.unshift({ report_id: data.report_id || '', saved_at: new Date().toISOString(), data });
            localStorage.setItem('qitu_reports', JSON.stringify(list.slice(0, 10)));
        } catch (e) { /* 存储满等场景不阻塞 */ }

        // 隐藏入口表单，恢复报告头，渲染 F 型报告
        const entry = document.getElementById('v2Entry');
        if (entry) entry.style.display = 'none';
        const hero = document.querySelector('.report-header');
        if (hero) hero.style.display = '';
        renderReport(reportData);
        await renderHistoryReports();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        errEl.textContent = (e && e.message) || '网络异常，请重试';
    }
    btn.disabled = false;
    btn.textContent = '开 启 分 析';
}

// ===== 我的报告（历史切换卡） =====
async function renderHistoryReports() {
    const box = document.getElementById('historyReports');
    if (!box) return;
    let list = getSavedReports();
    // 已登录：合并云端历史报告（去重，云端优先）
    if (window.QituAuth && QituAuth.isLoggedIn()) {
        try {
            const r = await QituAuth.authFetch('/api/report/history');
            if (r.ok) {
                const d = await r.json();
                const cloudList = (d.reports || []).map(r => ({
                    report_id: r.report_id,
                    saved_at: r.created_at,
                    pillars: r.pillars,
                    meme_code: r.meme_code,
                    _cloud: true,
                }));
                // 合并：云端 + 本地未在云端的
                const cloudIds = new Set(cloudList.map(r => r.report_id));
                const localOnly = list.filter(r => r.report_id && !cloudIds.has(r.report_id));
                list = cloudList.concat(localOnly);
            }
        } catch (e) {}
    }
    if (list.length < 2) { box.innerHTML = ''; return; }
    const curId = (reportData && reportData.report_id) || sessionStorage.getItem('currentReportId');
    const fmtTime = ts => {
        try {
            const d = new Date(ts);
            const p = n => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
        } catch (e) { return ''; }
    };
    box.innerHTML = `
        <div class="his-card">
            <div class="his-title">✦ 我的报告 <span class="his-count">${list.length} 份</span></div>
            <div class="his-hint">已保存在本机 · 离线可随时回看</div>
            <div class="his-list">
                ${list.map(r => `
                <div class="his-item ${r.report_id === curId ? 'active' : ''}" data-rid="${r.report_id || ''}">
                    <div class="his-code">${r.meme_code || '☆☆☆☆'}</div>
                    <div class="his-info">
                        <div class="his-name">${r.meme_name || '命途报告'}</div>
                        <div class="his-meta">${(r.pillars || '').split(' ').join(' · ') || ''}</div>
                    </div>
                    <div class="his-time">${fmtTime(r.saved_at)}</div>
                </div>`).join('')}
            </div>
        </div>`;
    // 点击切换：写入 sessionStorage 后原地重渲染（不整页刷新，体验更顺）
    box.querySelectorAll('.his-item').forEach(item => {
        item.addEventListener('click', async () => {
            const rid2 = item.getAttribute('data-rid');
            const target = getSavedReports().find(r => r.report_id === rid2);
            if (!target || !target.data) return;
            reportData = target.data;
            sessionStorage.setItem('reportData', JSON.stringify(reportData));
            sessionStorage.setItem('currentReportId', rid2 || '');
            // 同步 URL，便于刷新/分享仍指向该报告
            try { history.replaceState(null, '', rid2 ? (window.IS_NATIVE_APP ? 'report.html?id=' + rid2 : '/report?id=' + rid2) : (window.IS_NATIVE_APP ? 'report.html' : '/report')); } catch (e) {}
            window.scrollTo({ top: 0, behavior: 'smooth' });
            renderReport(reportData);
            await renderHistoryReports();
        });
    });
}

function renderReport(data) {
    const container = document.getElementById('reportContent');
    const { chart, dayun, analysis } = data;
    const esc2 = (s) => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    const memeCard = analysis.meme_card || {};
    const career = analysis.career || {};
    const careerPath = analysis.career_path || {};
    const wxBalance = analysis.wuxing_balance || {};
    const civilService = analysis.civil_service || {};
    const education = analysis.education || {};
    const wealth = analysis.wealth || {};
    const mentorAdvice = analysis.mentor_advice || {};
    const birth = chart.birth || {};
    const pillars = chart.pillars || [];

    // 真太阳时提示
    let tstBadge = '';
    const birthExtra = chart.birth || {};
    if (birthExtra.true_solar_time) {
        tstBadge = `<div class="summary-item"><div class="k">真太阳时</div><div class="v">已修正 ${birthExtra.offset_minutes > 0 ? '+' : ''}${birthExtra.offset_minutes} 分</div></div>`;
    } else if (birthExtra.input_calendar) {
        tstBadge = `<div class="summary-item"><div class="k">输入历法</div><div class="v">${birthExtra.input_calendar}</div></div>`;
    }

    container.innerHTML = `
        <!-- ===== F型总览首页（逻辑拆分入口） ===== -->
        ${(() => {
            const cp = careerPath.best || {};
            const top3 = (career.recommended_careers || []).slice(0,3).map(c=>c.name).join(' / ');
            const matchScore = career.match_score || 0;
            const patternTag = chart.pattern || '独特格局';
            const talentHref = 'chart.html';
            const fortuneHref = 'daily.html';
            return `
            <div class="f-hero">
                <div class="f-top">
                    <div class="f-app">🔮 王半仙</div>
                    <div class="f-tag">【${esc2(patternTag)}】职场人</div>
                </div>
                <div class="f-score">
                    <span class="f-num">${matchScore}</span><span class="f-unit">分</span>
                </div>
                <div class="f-line">${esc2(top3 || '多类职业')} 天赋适配度<b>极高</b></div>
                <div class="f-hook">💭 想知道哪一年升职最容易？</div>
                <div class="f-btns">
                    <a class="f-btn free" href="${talentHref}">🔮 查看完整命盘</a>
                    <a class="f-btn pay" href="${fortuneHref}">⚡ 查看升职窗口期</a>
                </div>
            </div>`;
        })()}

        <!-- 打工人人格测试卡片（强制浅色/黑绿/低多边形，屏蔽命理元素） -->
        ${memeCard.name ? renderMemeCard(memeCard) : ''}

        <!-- 命盘总览 -->
        <div class="card">
            <div class="card-title">命盘总览</div>
            <div class="pillars-row">
                ${pillars.map((p, i) => {
                    const tg = chart.ten_gods.gan;
                    const zg = chart.ten_gods.zhi;
                    const key = ['year', 'month', 'day', 'hour'][i];
                    // 统一风格五行 SVG 图标（线条几何风，金色描边、对应五行淡填充）
                    const WX_SVG = {
                        '木': '<svg class="wx-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3 L7 11 L11 11 L7 17 L17 17 L13 11 L17 11 Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 17 L12 21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
                        '火': '<svg class="wx-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3 C 14 6 16 8 16 11 C 16 13 14.5 14.5 13 15 C 13.5 13.5 13 12 12 11 C 11 13 8 14 8 17 C 8 19.5 9.8 21.5 12 21.5 C 14.2 21.5 16 19.5 16 17 C 16 14 14 11 12 3 Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
                        '土': '<svg class="wx-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 18 L21 18" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M5 18 L7 11 L17 11 L19 18" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/><path d="M9 11 L9 8 L15 8 L15 11" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
                        '金': '<svg class="wx-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 8 L21 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M5 8 L5 18 M19 8 L19 18" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M3 18 L21 18" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M8 8 L8 13 L16 13 L16 8" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="12" cy="5" r="1.2" fill="currentColor"/></svg>',
                        '水': '<svg class="wx-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3 C 9 8 6 11 6 14 C 6 17.3 8.7 20 12 20 C 15.3 20 18 17.3 18 14 C 18 11 15 8 12 3 Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M9 14 C 10 15 11 15 12 14 C 13 15 14 15 15 14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/></svg>',
                    };
                    const GAN_WX = { '甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水' };
                    const ZHI_WX = { '子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水' };
                    const ganIcon = WX_SVG[GAN_WX[p.gan]] || '';
                    const zhiIcon = WX_SVG[ZHI_WX[p.zhi]] || '';
                    const zhiList = (zg && zg[key]) || [];
                    return `
                    <div class="pillar-card">
                        <div class="pillar-name">${p.name}</div>
                        <div class="pillar-stack">
                            <div class="pillar-gan-row">
                                <span class="pillar-gan">${p.gan}</span>
                                <span class="pillar-wx-ic">${ganIcon}</span>
                            </div>
                            <div class="pillar-ss-above">${tg[key] || ''}</div>
                            <div class="pillar-zhi-row">
                                <span class="pillar-zhi">${p.zhi}</span>
                                <span class="pillar-wx-ic">${zhiIcon}</span>
                            </div>
                            <div class="pillar-ss-below">${zhiList.join('、')}</div>
                        </div>
                    </div>`;
                }).join('')}
            </div>
            <div class="chart-summary">
                <div class="summary-item"><div class="k">日主</div><div class="v">${chart.day_master} · ${chart.day_master_wuxing}</div></div>
                <div class="summary-item"><div class="k">格局</div><div class="v">${chart.pattern}</div></div>
                <div class="summary-item"><div class="k">日主身强弱</div><div class="v">${chart.day_master_strength.level}（${chart.day_master_strength.score}分）</div></div>
                <div class="summary-item"><div class="k">用神</div><div class="v">${(chart.useful_god.useful || []).join('、')}</div></div>
                <div class="summary-item"><div class="k">起运</div><div class="v">${dayun.start_age}岁 · ${dayun.direction}</div></div>
                ${tstBadge}
            </div>
            ${(() => {
                const s = chart.day_master_strength || {};
                const d = [s.deling, s.dedi, s.deshi].map(x => x && x.got ? '✓' : '✗').join(' ');
                return `<div style="margin-top:0.8rem;padding:0.6rem 0.8rem;background:rgba(124,107,214,0.08);border-left:3px solid var(--gold);border-radius:0 8px 8px 0;font-size:0.82rem;color:var(--gold-light)">
                    身强身弱（得令 ${d.split(' ')[0]} · 得地 ${d.split(' ')[1]} · 得势 ${d.split(' ')[2]}）：${s.summary || ''}
                </div>`;
            })()}
            <div id="wuxingChart"></div>
        </div>

        <!-- 大运时间轴 -->
        <div class="card">
            <div class="card-title">大运时间轴</div>
            <div class="dayun-timeline" id="dayunTimeline"></div>
        </div>

        <!-- 五行调衡·择业吉方（独立入口 → fortune.html） -->
        ${wxBalance.day_master_wx ? (() => {
            const me = wxBalance.day_master_wx;
            const favor = (wxBalance.favor || []);
            const avoid = (wxBalance.avoid || []);
            const fortuneHref = 'daily.html';
            return `
        <div class="card wx-balance-card">
            <div class="card-title">五行调衡·择业吉方 <span class="wb-mode">五行喜忌 · 流年运势</span></div>
            <div class="wb-perspective">从五行平衡看，日主${me}<b>喜${favor.join('、') || '—'}</b>、<b>忌${avoid.join('、') || '—'}</b>，这是决定你整体运势起伏的关键。</div>
            <div class="wb-favor-row">
                <span class="wb-k">喜</span>
                ${favor.map(w => `<span class="wb-badge favor wx-${w}">${w}</span>`).join('')}
                <span class="wb-k" style="margin-left:0.6rem">忌</span>
                ${avoid.map(w => `<span class="wb-badge avoid wx-${w}">${w}</span>`).join('')}
            </div>
            <a class="talent-cta fortune-cta" href="${fortuneHref}">🔮 查看今年流年运势与升职窗口 →</a>
        </div>`;})() : ''}

        <!-- 格局天成·宜业方略（独立入口 → talent.html） -->
        <div class="card career-path-card">
            <div class="card-title">格局天成·宜业方略 <span class="wb-mode">十神格局 · 职场天赋</span></div>
            <div class="wb-perspective">你的命局格局（杀刃、财官、食伤等十神组合）决定了性格与天赋，<b>这些方向你更容易走得顺、做得久</b>。</div>
            <div style="margin-bottom:0.6rem">
                ${(career.tags || []).slice(0, 5).map(t => `<span class="tag gold">${t}</span>`).join('')}
            </div>
            <a class="talent-cta" href="chart.html">🔮 查看完整命盘详情 →</a>
        </div>

        <!-- 五大职业路径评估（十神格局综合 · 属"更可能出现的"维度） -->
        ${careerPath.best ? (() => {
            const levelClass = s => s >= 78 ? 'lv-great' : s >= 65 ? 'lv-good' : s >= 50 ? 'lv-mid' : s >= 35 ? 'lv-low' : 'lv-poor';
            const ranked = Object.values(careerPath.paths || {}).sort((a, b) => b.score - a.score);
            const best = careerPath.best;
            return `
        <div class="card">
            <div class="card-title">五大职业路径评估 <span class="wb-mode">十神格局综合 · 属"宜业方略"维度</span></div>
            <div class="wb-perspective">从命局格局（官杀、印、财、食伤、比劫）看你这辈子<b>更容易走上哪条职业赛道</b>，并综合打分排名。</div>
            <div class="path-best">
                <div class="path-best-left">
                    <span class="path-best-icon">${best.icon || '⭐'}</span>
                    <div>
                        <div class="path-best-name">${best.name}<span class="path-level-chip ${levelClass(best.score)}">${best.level}</span></div>
                        <div class="path-best-sub">最优路径 · ${best.score}分</div>
                    </div>
                </div>
                <div class="path-best-score">${best.score}<small>分</small></div>
            </div>
            <p class="path-summary">${careerPath.summary || ''}</p>
            <div class="path-bars">
                ${ranked.map(p => `
                <div class="path-bar-row ${p.key === best.key ? 'is-best' : ''}">
                    <div class="path-bar-label"><span class="icon">${p.icon || ''}</span>${p.name}</div>
                    <div class="path-bar-track"><div class="path-bar-fill ${levelClass(p.score)}" style="width:${p.score}%"></div></div>
                    <div class="path-bar-score">${p.score}</div>
                    <span class="path-level-chip ${levelClass(p.score)}">${p.level}</span>
                </div>`).join('')}
            </div>
            <div class="path-features">
                <div class="k">命中依据</div>
                <div class="v">${(best.features || []).map(f => `<span class="tag gold">${f}</span>`).join('')}</div>
            </div>
            <p class="path-advice">💡 ${best.advice || ''}</p>
            <p class="path-note">${careerPath.note || ''}</p>
        </div>`;})() : ''}

        <!-- 考公适配度 -->
        ${civilService.level ? `
        <div class="card">
            <div class="card-title">考公 / 体制内适配度</div>
            <div class="cs-header">
                <div class="cs-score-ring">
                    <span class="cs-score-num">${civilService.score}</span>
                    <span class="cs-score-unit">分</span>
                </div>
                <div class="cs-level-info">
                    <div class="cs-level">${civilService.level}</div>
                    <div class="cs-factors">
                        ${(civilService.factors || []).map(f => `<span class="cs-factor">${f}</span>`).join('')}
                    </div>
                </div>
            </div>
            <div class="cs-score-wrap">
                <div class="cs-score-bar" style="width:${civilService.score}%"></div>
            </div>
            <p class="cs-advice">${civilService.advice}</p>
            ${civilService.detail && civilService.detail.good_years && civilService.detail.good_years.length ? `
            <p style="color:var(--gold-light);font-size:0.85rem;margin-top:0.6rem">🔮 近年官印流年：${civilService.detail.good_years.map(g => `${g.year}年（${g.shishen}）`).join('、')} — 这些年份考运较佳</p>` : ''}
            <p style="color:var(--text-dim);font-size:0.75rem;margin-top:0.8rem">※ ${civilService.note || '考公评估综合官星、印星、食伤、财星与大运流年，趋势仅供参考'}</p>
        </div>` : ''}

        <!-- 学历潜力 -->
        <div class="card">
            <div class="card-title">学历潜力</div>
            <div class="edu-level-display">
                <div class="level">${education.level || '-'}</div>
                <div class="rule">${education.rule_matched || ''}</div>
            </div>
            <div style="margin:0.8rem 0">
                <span style="color:var(--text-dim);font-size:0.85rem">学业潜力指数</span>
                <div style="display:flex;align-items:center;gap:1rem">
                    <div class="score-bar-wrap" style="flex:1"><div class="score-bar" style="width:0%" id="eduScoreBar"></div></div>
                    <span style="color:var(--gold-light);font-weight:600">${education.score || 0}分</span>
                </div>
            </div>
            ${(education.subjects || []).map(s => `<p style="color:var(--text-main);font-size:0.9rem;margin:0.4rem 0">📚 ${s}</p>`).join('')}
            ${(education.suggestions || []).map(s => `<p style="color:var(--text-dim);font-size:0.85rem;margin:0.4rem 0">💡 ${s}</p>`).join('')}
            ${education.good_exam_years && education.good_exam_years.length ? `
            <p style="color:var(--gold-light);font-size:0.85rem;margin-top:0.8rem">🔮 近年利考年份：${education.good_exam_years.join('、')} 年</p>` : ''}
        </div>

        <!-- 赚钱路径 -->
        <div class="card">
            <div class="card-title">赚钱路径</div>
            ${(wealth.styles || []).map(s => `
                <p style="margin:0.6rem 0"><span class="tag gold">${s.style}</span></p>
                <p style="color:var(--text-dim);font-size:0.85rem;margin:0.3rem 0 0.8rem">${s.desc}</p>
            `).join('')}
            <p style="color:var(--text-main);font-size:0.9rem;margin:1rem 0 0.5rem">💰 推荐赚钱行业：</p>
            <div>${(wealth.recommended_industries || []).map(i => `<span class="tag">${i}</span>`).join('')}</div>
            ${wealth.wealth_periods && wealth.wealth_periods.length ? `
            <p style="color:var(--text-main);font-size:0.9rem;margin:1rem 0 0.5rem">📈 财富周期：</p>
            ${(wealth.wealth_periods || []).map(w => `<p style="color:var(--gold-light);font-size:0.85rem;margin:0.3rem 0">✦ ${w.period} ${w.dayun}（${w.shishen}）— ${w.advice}</p>`).join('')}
            ` : ''}
            ${wealth.risk_years && wealth.risk_years.length ? `
            <p style="color:var(--text-main);font-size:0.9rem;margin:1rem 0 0.5rem">⚠️ 财务风险期：</p>
            ${(wealth.risk_years || []).map(r => `<p style="color:#ff9a8a;font-size:0.85rem;margin:0.3rem 0">✦ ${r.period} ${r.dayun}（${r.shishen}）— ${r.advice}</p>`).join('')}
            ` : ''}
            ${wealth.ai_interpretation || data.wealth_ai ? `
            <div class="wealth-ai">
                <div class="wealth-ai-title">${['deepseek','zhipu'].includes(wealth.ai_source || data.wealth_source) ? '◆ AI 深度解读' : '◆ 规则深度解读'}</div>
                <div class="ai-report-content">${renderMarkdown(wealth.ai_interpretation || data.wealth_ai)}</div>
            </div>
            ` : ''}
        </div>

        <!-- 求职指导员支招（按路径自动分配导师） -->
        ${mentorAdvice.mentor_name ? (() => {
            const MENTOR_ICONS = { '知宜老师': '🌷', '雲钦老师': '📘', '桃随老师': '⚡', '王半仙': '🪭' };
            const mic = MENTOR_ICONS[mentorAdvice.mentor_name] || '🌷';
            return `
        <div class="card mentor-card">
            <div class="card-title">求职指导员支招</div>
            <div class="mentor-brief">
                <span class="mentor-ic">${mic}</span>
                <div>
                    <div class="mentor-nm">${mentorAdvice.mentor_name} <span class="mentor-role">${mentorAdvice.mentor_title || ''}</span></div>
                    <div class="mentor-path">针对你的路径「${mentorAdvice.path_name}」· 四位老师风格各异，可在对话页切换</div>
                </div>
            </div>
            <div class="mentor-cold">${mentorAdvice.cold_water}</div>
            <div class="mentor-actions">
                ${(mentorAdvice.actions || []).map((a, i) => `
                <div class="mentor-action"><span class="no">${i + 1}</span><span>${a}</span></div>`).join('')}
            </div>
            <div class="mentor-deadline">⏳ ${mentorAdvice.deadline}</div>
            <div class="mentor-sign">「${mentorAdvice.signature}」</div>
            <a href="mentor.html" class="mentor-cta">找${mentorAdvice.mentor_name}聊聊（可切换四位老师）→</a>
        </div>`;})() : ''}
    `;

    // 渲染图表
    renderWuxingChart(chart);
    renderDayunTimeline(dayun, chart);

    // 动画填充评分条
    setTimeout(() => {
        const bar1 = document.getElementById('careerScoreBar');
        const bar2 = document.getElementById('eduScoreBar');
        if (bar1) bar1.style.width = (career.match_score || 0) + '%';
        if (bar2) bar2.style.width = (education.score || 0) + '%';
    }, 200);

    // 人格编码卡状态机动画
    if (memeCard.name) startMemeCardSequence();
}

// 五行雷达/环形图
function renderWuxingChart(chart) {
    const el = document.getElementById('wuxingChart');
    if (!el || typeof echarts === 'undefined') return;
    const percent = chart.five_elements.percent || {};
    const chart5 = echarts.init(el);
    chart5.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
        series: [{
            type: 'pie',
            radius: ['45%', '70%'],
            center: ['50%', '50%'],
            label: { color: '#a89fc4', fontSize: 12 },
            labelLine: { lineStyle: { color: 'rgba(168,159,196,0.4)' } },
            data: Object.entries(percent).map(([name, value]) => ({
                name: name,
                value: value,
                itemStyle: { color: WX_COLOR[name], opacity: 0.85 }
            })),
            emphasis: {
                itemStyle: { shadowBlur: 20, shadowColor: 'rgba(124,107,214,0.5)' }
            }
        }],
        graphic: [{
            type: 'text',
            left: 'center',
            top: 'middle',
            style: { text: '五行', fill: '#b8aee8', fontSize: 16 }
        }]
    });
}

// 大运时间轴
function renderDayunTimeline(dayun, chart) {
    const el = document.getElementById('dayunTimeline');
    if (!el) return;
    const currentYear = new Date().getFullYear();
    const steps = dayun.steps || [];
    el.innerHTML = steps.map(s => {
        const isCurrent = s.start_year <= currentYear && currentYear <= s.end_year;
        return `
        <div class="dayun-item ${isCurrent ? 'current' : ''}">
            <div class="gz">${s.ganzhi}</div>
            <div class="age">${s.start_age}-${s.end_age}岁</div>
            <div class="ss">${s.shishen_gan}</div>
            ${isCurrent ? '<div class="current-tag">当前大运</div>' : ''}
        </div>`;
    }).join('');
}

// 2024-08 起：报告页不再内嵌"追问命理顾问"板块（用户反馈），仅保留历史记录和分享。

// 分享
async function shareReport() {
    if (!reportData) return;
    const { chart, analysis } = reportData;
    const career = analysis.career || {};
    const pillars = (chart.pillars || []).map(p => p.ganzhi).join(' ');
    const top3 = (career.recommended_careers || []).slice(0, 3).map(c => c.name).join('、');

    const text = `【王半仙 · 我的命途职业卡】
${chart.birth.solar} ${chart.birth.gender}
四柱：${pillars}
格局：${chart.pattern} | 用神：${(chart.useful_god.useful || []).join('、')}
最适合：${top3}
匹配度：${career.match_score}分 ✦
（仅供娱乐参考，不构成职业决策依据）`;

    try {
        if (navigator.share) {
            await navigator.share({ title: '我的命途职业卡', text: text });
        } else {
            await navigator.clipboard.writeText(text);
            alert('已复制职业卡文案，去粘贴分享吧～');
        }
    } catch (e) {
        // 用户取消
    }
}

// ====== 打工人人格测试卡片渲染（状态机：加载→判定→卡片弹出） ======
const MEME_TIMING = { loading: 1200, verdict: 600, card: 500 };
const MEME_VERDICT_STYLE = (function() {
    try { return localStorage.getItem('meme_verdict_style') || 'A'; }
    catch (e) { return 'A'; }
})();

function renderMemeCard(m) {
    // 判定文案（A/B 可配置）
    const verdict = MEME_VERDICT_STYLE === 'B' ? (m.verdictB || m.verdictA || '') : (m.verdictA || m.verdictB || '');
    // 人格卡片图（1:1 比例）
    const cardImg = REAL_CARD_IMAGES[m.id]
        ? `<img class="meme-card-img" src="${REAL_CARD_IMAGES[m.id]}?v=7" alt="${m.name}" loading="lazy" onerror="this.outerHTML='<div class=&quot;meme-pet&quot;>${buildPetSvg(m.scene, m.props)}</div>'">`
        : `<div class="meme-pet">${buildPetSvg(m.scene, m.props)}</div>`;

    return `
    <div class="meme-card" id="memeCard" data-scene="${m.scene || ''}">
        <!-- stage 0: 加载 -->
        <div class="meme-loading">
            <div class="meme-spinner"></div>
            <div class="meme-loading-text">正在匹配你的先天行为模式…</div>
            <div class="meme-scanline"></div>
        </div>
        <!-- stage 1: 判定文案 -->
        <div class="meme-stage-el meme-verdict" data-stage="1">${verdict}</div>
        <!-- stage 2: 人格卡片图（1:1 比例，弹出 + 金色光晕） -->
        <div class="meme-stage-el meme-cardimg-wrap" data-stage="2">
            <div class="meme-cardimg-box">
                ${cardImg}
            </div>
        </div>
    </div>`;
}

function startMemeCardSequence() {
    const card = document.getElementById('memeCard');
    if (!card) return;
    const t = MEME_TIMING;
    const plan = [
        [t.loading, 1],
        [t.loading + t.verdict, 2],
    ];
    plan.forEach(([ms, stage]) => {
        setTimeout(() => {
            card.querySelectorAll(`[data-stage="${stage}"]`).forEach(el => el.classList.add('is-visible'));
            if (stage === 1) {
                const ld = card.querySelector('.meme-loading');
                if (ld) ld.classList.add('is-hidden');
            }
            if (stage === 2) card.classList.add('card-popped');
        }, ms);
    });
}

// 用户提供的真图（11 张有真图，stall_owner 用户没发图，走 SVG fallback）
const REAL_CARD_IMAGES = {
    deadline_mage: 'img/cards/deadline_mage.jpg',
    silent_king: 'img/cards/silent_king.jpg',
    revision_artist: 'img/cards/revision_artist.jpg',
    meeting_camouflager: 'img/cards/meeting_camouflager.jpg',
    rule_living_dict: 'img/cards/rule_living_dict.jpg',
    finance_cautious: 'img/cards/finance_cautious.jpg',
    note_collector: 'img/cards/note_collector.jpg',
    opportunity_dog: 'img/cards/opportunity_dog.jpg',
    milk_tea_hero: 'img/cards/milk_tea_hero.jpg',
    lone_tech_expert: 'img/cards/lone_tech_expert.jpg',
    meeting_vibe: 'img/cards/meeting_vibe.jpg',
    // stall_owner: 用户没提供真图，走 SVG fallback
};

function renderMemePet(cardId, scene, props) {
    const imgUrl = REAL_CARD_IMAGES[cardId];
    if (imgUrl) {
        // 真图卡片：原图整体构图很完整（含边框/标题区/小狗/装饰），直接当主图
        // 加 ?v=7 cache-buster，避免 CDN/浏览器缓存错位
        return `<img class="meme-pet-img" src="${imgUrl}?v=7" alt="${cardId}" loading="lazy" onerror="this.outerHTML='<div class=&quot;meme-pet&quot;>${buildPetSvg(scene, props)}</div>'">`;
    }
    return `<div class="meme-pet">${buildPetSvg(scene, props)}</div>`;
}

async function shareMemeCard(text) {
    try {
        if (navigator.share) {
            await navigator.share({ title: '我的打工人人格', text });
        } else {
            await navigator.clipboard.writeText(text);
            alert('已复制分享文案，去粘贴吧～');
        }
    } catch (e) {}
}

// 道具 → 简单 SVG 标识（4 套：时钟/能量条/星星/便签/红披风等）
function propToSvg(p) {
    const map = {
        clock: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
        progress_bars: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><rect x="2" y="9" width="20" height="3" rx="1.5"/><rect x="2" y="14" width="14" height="3" rx="1.5" opacity=".5"/></svg>',
        energy_bars: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><rect x="2" y="6" width="6" height="12" rx="1"/><rect x="9" y="9" width="6" height="9" rx="1" fill="#a8d8b9"/><rect x="16" y="11" width="6" height="7" rx="1" fill="#f0c14b"/></svg>',
        red_cape: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#c84a3e"><path d="M4 4l8 4 8-4-4 16h-8z"/></svg>',
        laptop: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><rect x="3" y="5" width="18" height="11" rx="1"/><path d="M2 19h20"/></svg>',
        milk_tea: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><path d="M7 4h10l-1 16H8z"/><path d="M5 4h2M17 4h2"/></svg>',
        bubbles: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#a8d8b9"><circle cx="8" cy="10" r="3"/><circle cx="16" cy="8" r="2"/><circle cx="14" cy="16" r="2.5"/></svg>',
        pearls: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#fff" stroke="#2e6b4f"><circle cx="6" cy="18" r="2"/><circle cx="10" cy="16" r="2"/><circle cx="14" cy="14" r="2"/></svg>',
        glasses: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><circle cx="7" cy="14" r="4"/><circle cx="17" cy="14" r="4"/><path d="M11 14h2"/></svg>',
        books_stack: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#2e6b4f"><rect x="3" y="6" width="14" height="3"/><rect x="5" y="10" width="16" height="3" fill="#a8d8b9"/><rect x="3" y="14" width="12" height="3" fill="#f0c14b"/></svg>',
        binder: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 8h16M4 16h16"/></svg>',
        law_book: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><path d="M5 4h11l3 3v13H5z"/><path d="M9 9h6M9 13h6"/></svg>',
        money_box: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><rect x="3" y="9" width="18" height="9" rx="1"/><path d="M8 9V6h8v3"/><circle cx="12" cy="13" r="1.5" fill="#f0c14b"/></svg>',
        backpack: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><path d="M6 8h12v12H6z"/><path d="M9 4h6v4"/></svg>',
        cup: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><path d="M6 6h12l-1 14H7z"/><path d="M18 9h3v6h-3"/></svg>',
        menu_board: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><path d="M5 3l3 18M19 3l-3 18M3 8h18"/></svg>',
        stars: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#f0c14b"><path d="M12 2l3 6 6 1-4.5 4 1 6L12 16l-5.5 3 1-6L3 9l6-1z"/></svg>',
        headphones: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><path d="M4 13a8 8 0 0116 0"/><rect x="3" y="13" width="4" height="7" rx="1"/><rect x="17" y="13" width="4" height="7" rx="1"/></svg>',
        wing_jetpack: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#a8d8b9"><path d="M2 12l4-4 2 4-2 4zM22 12l-4-4-2 4 2 4z"/><rect x="9" y="9" width="6" height="6" fill="#2e6b4f"/></svg>',
        docs: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#fff" stroke="#2e6b4f" stroke-width="1.5"><path d="M6 3h9l4 4v14H6z"/><path d="M9 9h6M9 13h6M9 17h4"/></svg>',
        calculator: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><rect x="4" y="3" width="16" height="18" rx="1"/><circle cx="9" cy="9" r=".7" fill="#2e6b4f"/><circle cx="13" cy="9" r=".7" fill="#2e6b4f"/><circle cx="17" cy="9" r=".7" fill="#2e6b4f"/><circle cx="9" cy="14" r=".7" fill="#2e6b4f"/><circle cx="13" cy="14" r=".7" fill="#2e6b4f"/><circle cx="17" cy="14" r=".7" fill="#2e6b4f"/></svg>',
        ledger: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#2e6b4f"><rect x="3" y="4" width="18" height="16"/><path d="M6 8h12M6 12h12M6 16h8" stroke="#fff" stroke-width="1.2"/></svg>',
        magnifier: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><circle cx="10" cy="10" r="6"/><path d="M14 14l6 6"/></svg>',
        balloons: '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="8" cy="8" r="4" fill="#f0a040"/><circle cx="16" cy="6" r="4" fill="#a8d8b9"/><path d="M8 12v8M16 10v10" stroke="#2e6b4f" stroke-width="1"/></svg>',
        flag: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M5 3v18M5 3h14l-3 5 3 5H5" fill="#c84a3e" stroke="#2e6b4f" stroke-width="1"/></svg>',
        smile_stickers: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#f0c14b"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1" fill="#111"/><circle cx="15" cy="10" r="1" fill="#111"/><path d="M8 15c1 2 3 3 4 3s3-1 4-3" stroke="#111" fill="none" stroke-width="1.5"/></svg>',
        name_tag: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><path d="M3 8l5-5h13v13l-5 5z"/><circle cx="16" cy="8" r="1.5" fill="#c84a3e"/></svg>',
        sticky_notes: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#fff7c0" stroke="#2e6b4f"><rect x="3" y="3" width="9" height="9" transform="rotate(-8 7 7)"/><rect x="10" y="12" width="9" height="9" transform="rotate(5 14 16)" fill="#a8d8b9"/></svg>',
        highlighter: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><path d="M4 18l8-8 4 4-8 8H4z"/><path d="M12 10l4 4" stroke="#f0c14b" stroke-width="3"/></svg>',
        folder: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><path d="M3 7l3-3h6l2 2h7v13H3z"/></svg>',
        pen: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><path d="M4 20l4-1 11-11-3-3L5 16z"/></svg>',
        cape: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#a8d8b9"><path d="M12 4l-7 3 3 13h8l3-13z"/></svg>',
        envelope: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#fff" stroke="#2e6b4f" stroke-width="2"><rect x="3" y="6" width="18" height="13"/><path d="M3 7l9 6 9-6"/></svg>',
        tea_cup: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><path d="M5 9h13l-1 11H6z"/><path d="M18 11h3v3a3 3 0 01-3 3"/></svg>',
        snack: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#f0c14b"><ellipse cx="12" cy="14" rx="8" ry="4"/><circle cx="12" cy="9" r="2" fill="#c84a3e"/></svg>',
        monitor: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><rect x="3" y="4" width="18" height="13" rx="1"/><path d="M9 21h6M12 17v4"/></svg>',
        sketch: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="1.5"><circle cx="12" cy="12" r="7"/><path d="M5 12c2-3 5-5 7-5s5 2 7 5c-2 3-5 5-7 5s-5-2-7-5z"/></svg>',
        spray_can: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#c84a3e"><rect x="9" y="9" width="6" height="12"/><rect x="10" y="5" width="4" height="4"/><circle cx="6" cy="6" r="1" fill="#2e6b4f"/><circle cx="18" cy="4" r="1" fill="#2e6b4f"/></svg>',
        tablet: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#2e6b4f"><rect x="6" y="3" width="12" height="18" rx="1.5"/><rect x="8" y="5" width="8" height="13" fill="#fff"/></svg>',
        keyboard: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="1"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M10 14h.01M14 14h.01M18 14h.01" stroke-width="3"/></svg>',
        screwdriver: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><path d="M14 4l6 6-2 2-6-6z"/><path d="M12 8l-8 8v4h4l8-8"/></svg>',
        tech_box: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#a8d8b9" stroke="#2e6b4f" stroke-width="1.5"><rect x="3" y="6" width="18" height="12"/><path d="M3 10h18M7 14h4M13 14h4" stroke="#2e6b4f"/></svg>',
        tool_belt: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#c84a3e"><rect x="2" y="11" width="20" height="6"/><rect x="5" y="6" width="5" height="6" fill="#2e6b4f"/><rect x="14" y="6" width="5" height="6" fill="#2e6b4f"/></svg>',
        wrench: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><path d="M14 4a4 4 0 015 5l-3 3-2-2 3-3a2 2 0 00-2-2l-3 3 2 2-8 8H3v-3l8-8-2-2 3-3a4 4 0 012-2z"/></svg>',
        mask: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b4f" stroke-width="2"><path d="M4 8c4 0 6 4 8 4s4-4 8-4v6c0 4-4 6-8 6s-8-2-8-6z"/></svg>',
    };
    return `<span class="meme-prop">${map[p] || ''}</span>`;
}

// 低多边形纸艺小狗 SVG（主体）+ 道具（按 scene 摆位）
function buildPetSvg(scene, props) {
    // 12 套姿态/表情差异：用 scene 区分
    const pose = {
        meeting: 'worried', deadline: 'tense', milk_tea: 'lazy',
        rules: 'serious', stall: 'happy', silent: 'focused',
        finance: 'careful', meeting_vibe: 'excited', notes: 'thinking',
        opportunity: 'alert', artist: 'creative', tech: 'tough',
    }[scene] || 'happy';
    const face = {
        worried: '<path d="M9 13c0-1 1-2 2-2M13 13c0-1 1-2 2-2M10 18q2 2 4 0" stroke="#111" fill="none" stroke-width="1.5"/>',
        tense: '<path d="M9 12l2 1M13 12l2-1M10 18q2 1 4 0" stroke="#111" fill="none" stroke-width="1.5"/>',
        lazy: '<path d="M9 13l2 1 2-1M10 18q2 0 4 0" stroke="#111" fill="none" stroke-width="1.5"/>',
        serious: '<path d="M9 12h2M13 12h2M10 18q2 1 4 0" stroke="#111" fill="none" stroke-width="1.5"/>',
        happy: '<path d="M9 13c1 1 2 1 2 0s1-1 2 0M10 18c1 2 3 2 4 0" stroke="#111" fill="none" stroke-width="1.5"/>',
        focused: '<path d="M9 12h2M13 12h2M10 18q2 1 4 0" stroke="#111" fill="none" stroke-width="1.5"/>',
        careful: '<path d="M9 13l2-1 2 1M10 18q2 1 4 0" stroke="#111" fill="none" stroke-width="1.5"/>',
        excited: '<path d="M8 12q1-1 2 0t2 0 2 0M10 17c1 3 3 3 4 0" stroke="#111" fill="none" stroke-width="1.5"/>',
        thinking: '<path d="M9 12h2M13 13h2M10 18q2 1 4 0" stroke="#111" fill="none" stroke-width="1.5"/>',
        alert: '<path d="M9 11l2 1 2-1M10 18q2 1 4 0" stroke="#111" fill="none" stroke-width="1.5"/>',
        creative: '<path d="M9 13c1 1 2 1 2 0M13 13c1 1 2 1 2 0M10 18q2 2 4 0" stroke="#111" fill="none" stroke-width="1.5"/>',
        tough: '<path d="M9 12l2 2 2-2M10 18q2 0 4 0" stroke="#111" fill="none" stroke-width="1.5"/>',
    }[pose];

    // 道具浮在狗周围
    const accessory = (() => {
        if (props && props.includes('glasses'))
            return '<circle cx="38" cy="70" r="7" fill="none" stroke="#111" stroke-width="1.5"/><circle cx="62" cy="70" r="7" fill="none" stroke="#111" stroke-width="1.5"/><path d="M45 70h10" stroke="#111" stroke-width="1.5"/>';
        if (props && props.includes('headphones'))
            return '<path d="M22 60q28-26 56 0" stroke="#111" stroke-width="2" fill="none"/><rect x="18" y="58" width="10" height="14" fill="#c84a3e"/><rect x="72" y="58" width="10" height="14" fill="#c84a3e"/>';
        if (props && props.includes('wing_jetpack'))
            return '<path d="M0 70l12-10 6 12-10 8zM100 70l-12-10-6 12 10 8z" fill="#cfd8e3" stroke="#888"/>';
        return '';
    })();

    // 身体
    return `
<svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg" class="meme-pet-svg">
    <!-- 头 -->
    <polygon points="50,12 78,28 82,68 50,82 18,68 22,28" fill="#d8b27a" stroke="#9a7a4a" stroke-width="1.2"/>
    <!-- 左耳 -->
    <polygon points="22,28 14,18 28,12" fill="#a8825a" stroke="#7a5a2a" stroke-width="1.2"/>
    <!-- 右耳 -->
    <polygon points="78,28 86,18 72,12" fill="#a8825a" stroke="#7a5a2a" stroke-width="1.2"/>
    <!-- 脸中部阴影 -->
    <polygon points="32,42 50,40 68,42 60,68 50,72 40,68" fill="#e8c89a"/>
    <!-- 眼睛/嘴 -->
    ${face}
    <!-- 鼻子 -->
    <ellipse cx="50" cy="58" rx="2.5" ry="2" fill="#111"/>
    <!-- 项圈（红） -->
    <path d="M28 78q22 8 44 0" stroke="#c84a3e" stroke-width="3" fill="none"/>
    <!-- 身体 -->
    <polygon points="30,82 70,82 80,118 50,124 20,118" fill="#d8b27a" stroke="#9a7a4a" stroke-width="1.2"/>
    <!-- 腿 -->
    <rect x="28" y="118" width="12" height="10" fill="#a8825a" stroke="#7a5a2a" stroke-width="1"/>
    <rect x="60" y="118" width="12" height="10" fill="#a8825a" stroke="#7a5a2a" stroke-width="1"/>
    <!-- 尾巴 -->
    <polygon points="50,124 60,130 70,120" fill="#d8b27a" stroke="#9a7a4a" stroke-width="1"/>
    ${accessory}
</svg>`;
}

// 导出 PDF：有 report_id 走服务端 PDF，否则回退 window.print()
function exportPDF() {
    const rid = (reportData && reportData.report_id) || sessionStorage.getItem('currentReportId');
    if (rid) {
        window.open(`/api/report/${rid}/pdf`, '_blank');
    } else {
        window.print();
    }
}
