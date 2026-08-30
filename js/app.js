/* 首页逻辑 - 表单交互 + API 调用 */

// 时辰数据：地支 + 时间范围（index 12 为"不知时辰"）
const HOURS = [
    { zhi: "子", range: "23-1", hour: 0, label: "23:00-00:59" },
    { zhi: "丑", range: "1-3", hour: 1, label: "01:00-02:59" },
    { zhi: "寅", range: "3-5", hour: 3, label: "03:00-04:59" },
    { zhi: "卯", range: "5-7", hour: 5, label: "05:00-06:59" },
    { zhi: "辰", range: "7-9", hour: 7, label: "07:00-08:59" },
    { zhi: "巳", range: "9-11", hour: 9, label: "09:00-10:59" },
    { zhi: "午", range: "11-13", hour: 11, label: "11:00-12:59" },
    { zhi: "未", range: "13-15", hour: 13, label: "13:00-14:59" },
    { zhi: "申", range: "15-17", hour: 15, label: "15:00-16:59" },
    { zhi: "酉", range: "17-19", hour: 17, label: "17:00-18:59" },
    { zhi: "戌", range: "19-21", hour: 19, label: "19:00-20:59" },
    { zhi: "亥", range: "21-23", hour: 21, label: "21:00-22:59" },
    { zhi: "?", range: "不知时", hour: 12, label: "不确定时辰", unknown: true },
];

let selectedHour = null;
let selectedGender = 1;
let selectedCalendar = "solar";

// 初始化时辰选择
function initHourGrid() {
    const grid = document.getElementById('hourGrid');
    if (!grid) return;
    // 12 个时辰排 4×3 网格；"不知时辰"单独一行按钮
    const normal = HOURS.filter(h => !h.unknown);
    const unknown = HOURS.filter(h => h.unknown);
    grid.innerHTML = normal.map(h => {
        const i = HOURS.indexOf(h);
        return `
        <div class="hour-item" data-index="${i}" onclick="selectHour(this)">
            <span class="zhi">${h.zhi}</span>
            <span class="time-range">${h.range}时</span>
        </div>`;
    }).join('');
    const urow = document.getElementById('hourUnknownRow');
    if (urow && unknown.length) {
        const u = unknown[0];
        const idx = HOURS.indexOf(u);
        urow.innerHTML = `
        <div class="hour-item hour-unknown" data-index="${idx}" onclick="selectHour(this)">
            <span class="zhi">?</span>
            <span class="time-range">不知时辰（按日柱推演）</span>
        </div>`;
    }
}

function selectHour(el) {
    document.querySelectorAll('.hour-item').forEach(e => e.classList.remove('active'));
    el.classList.add('active');
    selectedHour = parseInt(el.dataset.index);
}

function selectGender(el) {
    document.querySelectorAll('.gender-item').forEach(e => e.classList.remove('active'));
    el.classList.add('active');
    selectedGender = parseInt(el.dataset.value);
}

// 历法切换
function selectCalendar(el) {
    document.querySelectorAll('.cal-item').forEach(e => e.classList.remove('active'));
    el.classList.add('active');
    selectedCalendar = el.dataset.value;
    const label = document.getElementById('dateLabel');
    const hint = document.getElementById('calHint');
    if (selectedCalendar === 'lunar') {
        label.textContent = '出生日期（农历）';
        hint.textContent = '填写农历月日；若生日在闰月，请在"月"里加负号（如 -4 表示闰四月）';
    } else {
        label.textContent = '出生日期（公历）';
        hint.textContent = '公历生日直接填写；不确定公历生日可切换农历';
    }
}

// 表单提交
// 2024-08 起报告生成同步秒出，移除 pollReport（异步轮询已不再需要）


async function submitForm() {
    const errorMsg = document.getElementById('errorMsg');
    errorMsg.textContent = '';

    const year = parseInt(document.getElementById('year').value);
    const month = parseInt(document.getElementById('month').value);
    const day = parseInt(document.getElementById('day').value);

    // 校验
    if (!year || year < 1900 || year > 2030) {
        errorMsg.textContent = '请输入有效年份（1900-2030）';
        return;
    }
    if (!month || month < 1 || month > 12) {
        errorMsg.textContent = '请输入有效月份';
        return;
    }
    if (!day || day < 1 || day > 31) {
        errorMsg.textContent = '请输入有效日期';
        return;
    }
    if (selectedHour === null) {
        errorMsg.textContent = '请选择出生时辰';
        return;
    }

    const hourData = HOURS[selectedHour];
    // 经度（真太阳时）
    const longitudeVal = document.getElementById('birthPlace')?.value || "";
    const longitude = longitudeVal ? parseFloat(longitudeVal) : null;

    const payload = {
        year, month, day,
        hour: hourData.hour,
        minute: 0,
        gender: selectedGender,
        calendar: selectedCalendar,
        longitude: longitude,
    };

    // 显示加载
    const overlay = document.getElementById('loadingOverlay');
    const btn = document.getElementById('submitBtn');
    overlay.classList.remove('hidden');
    btn.disabled = true;

    try {
        const resp = await QituAuth.authFetch('/api/report/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.detail || `请求失败 (${resp.status})`);
        }

        let data = await resp.json();
        // 2024-08 起报告生成改为同步秒出（纯规则模式），不再有 generating 状态
        if (!data.report_id) {
            throw new Error('生成失败，请重试');
        }

        // 保存到 sessionStorage 供报告页使用（含 report_id/chart_id）
        sessionStorage.setItem('reportData', JSON.stringify(data));
        if (data.report_id) sessionStorage.setItem('currentReportId', data.report_id);
        // 本地持久化（App 级别：关闭浏览器不丢，支持多报告管理与离线查看）
        try {
            const meme = data.meme_card || (data.analysis && data.analysis.meme_card) || {};
            const chart = data.chart || {};
            const list = JSON.parse(localStorage.getItem('qitu_reports') || '[]');
            // 去重（同 report_id 覆盖）
            const idx = list.findIndex(r => r.report_id === data.report_id);
            const item = {
                report_id: data.report_id,
                saved_at: new Date().toISOString(),
                meme_name: meme.name || '',
                meme_code: meme.code || '',
                pillars: (chart.pillars || []).map(p => p.ganzhi || '').join(' '),
                birth: (chart.birth && chart.birth.solar) || '',
                data: data,   // 完整报告数据（离线可看）
            };
            if (idx >= 0) list[idx] = item; else list.unshift(item);
            // 最多保留 10 份，防止 localStorage 爆掉
            localStorage.setItem('qitu_reports', JSON.stringify(list.slice(0, 10)));
        } catch (e) { /* 存储失败不阻塞跳转 */ }
        // 跳转报告页
        window.location.href = window.IS_NATIVE_APP ? 'report.html' : '/report';
    } catch (e) {
        errorMsg.textContent = e.message || '生成失败，请重试';
        overlay.classList.add('hidden');
        btn.disabled = false;
    }
}

// 页面加载
document.addEventListener('DOMContentLoaded', () => {
    initHourGrid();
    loadDailyGuidance();
});

// 加载今日宇宙指引
async function loadDailyGuidance() {
    const card = document.getElementById('dailyCard');
    if (!card) return;
    try {
        // 若用户之前生成过报告，带上日主
        let dayGan = null;
        try {
            const saved = sessionStorage.getItem('reportData');
            if (saved) dayGan = JSON.parse(saved).chart?.day_master || null;
        } catch (e) {}

        const url = dayGan ? `/api/daily?day_gan=${encodeURIComponent(dayGan)}` : '/api/daily';
        const resp = await fetch(url);
        if (!resp.ok) return;
        const d = await resp.json();

        document.getElementById('dailyGz').textContent = d.today_ganzhi.day;
        document.getElementById('dailySs').textContent = d.shishen ? `流日${d.shishen}` : '今日干支';
        document.getElementById('dailyDate').textContent =
            `${d.date} 星期${d.weekday} · 农历${d.lunar}`;
        document.getElementById('dailyFortune').textContent = d.fortune;
        document.getElementById('dailyAdvice').textContent = `✦ ${d.energy}。${d.advice}`;
        document.getElementById('dailyAvoid').textContent = d.avoid;

        card.style.display = '';
        setTimeout(() => {
            document.getElementById('dailyScoreBar').style.width = d.score + '%';
        }, 300);
    } catch (e) {
        // 指引加载失败不影响主流程
    }
}
