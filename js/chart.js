/* 命盘页逻辑 - 详细命盘可视化 */

const WX_COLOR = { "金": "#ffd700", "木": "#7fd47f", "水": "#5b9bd4", "火": "#ff6b6b", "土": "#d4a76a" };
const ALL_SHISHEN = ["比肩", "劫财", "食神", "伤官", "偏财", "正财", "七杀", "正官", "偏印", "正印"];

let chartData = null;

document.addEventListener('DOMContentLoaded', () => {
    const raw = sessionStorage.getItem('reportData');
    if (!raw) return;
    chartData = JSON.parse(raw);
    renderChart(chartData);
});

function renderChart(data) {
    const container = document.getElementById('chartContent');
    const { chart, dayun } = data;
    const birth = chart.birth || {};
    const pillars = chart.pillars || [];
    const tg = chart.ten_gods.gan || {};
    const zg = chart.ten_gods.zhi || {};
    const hide = chart.hide_gan || {};
    const strength = chart.day_master_strength || {};

    document.getElementById('chartSubtitle').textContent =
        `${birth.solar || ''}（农历：${birth.lunar || ''}） · ${birth.gender || ''}`;

    // 统计十神出现次数
    const ssCount = {};
    ALL_SHISHEN.forEach(s => ssCount[s] = 0);
    Object.values(tg).forEach(v => { if (v && v !== '日主') ssCount[v] = (ssCount[v] || 0) + 1; });
    Object.values(zg).forEach(v => {
        if (Array.isArray(v)) v.forEach(x => ssCount[x] = (ssCount[x] || 0) + 1);
    });

    // 藏干表：需要计算每个藏干对日主的十神（用 lunar-python 结果 zg 已经有）
    const pillarKeys = ['year', 'month', 'day', 'hour'];

    container.innerHTML = `
        <!-- 四柱 -->
        <div class="card">
            <div class="card-title">四柱八字</div>
            <div class="pillars-row">
                ${pillars.map((p, i) => {
                    const key = pillarKeys[i];
                    return `
                    <div class="pillar-card">
                        <div class="pillar-name">${p.name}</div>
                        <span class="pillar-gan">${p.gan}</span>
                        <span class="pillar-zhi">${p.zhi}</span>
                        <span class="pillar-ss">${tg[key]}</span>
                    </div>`;
                }).join('')}
            </div>
            <table class="hidegan-table">
                <tr>
                    <th></th>
                    ${pillars.map(p => `<th>${p.name}</th>`).join('')}
                </tr>
                <tr>
                    <th>天干</th>
                    ${pillars.map((p, i) => `<td>
                        <div class="zhi-char">${p.gan}</div>
                        <div class="ss-cell">${tg[pillarKeys[i]]}</div>
                    </td>`).join('')}
                </tr>
                <tr>
                    <th>地支</th>
                    ${pillars.map((p, i) => `<td>
                        <div class="zhi-char">${p.zhi}</div>
                        <div class="ss-cell">${(zg[pillarKeys[i]] || [])[0] || ''}</div>
                    </td>`).join('')}
                </tr>
                <tr>
                    <th>藏干</th>
                    ${pillars.map((p, i) => {
                        const hides = hide[pillarKeys[i]] || [];
                        const ssList = zg[pillarKeys[i]] || [];
                        return `<td><div class="hidegan-list">${hides.map((h, j) => `
                            <div class="hidegan-row">
                                <span class="hidegan-char">${h}</span>
                                <span class="hidegan-ss">${ssList[j] || ''}</span>
                            </div>`).join('')}</div></td>`;
                    }).join('')}
                </tr>
                <tr>
                    <th>纳音</th>
                    ${pillars.map(p => `<td style="font-size:0.75rem;color:var(--text-dim)">${p.wuxing}</td>`).join('')}
                </tr>
            </table>
        </div>

        <!-- 命局信息 -->
        <div class="card">
            <div class="card-title">命局信息</div>
            <div class="info-line"><span class="k">日主</span><span class="v">${chart.day_master} · ${chart.day_master_wuxing}</span></div>
            <div class="info-line"><span class="k">格局</span><span class="v">${chart.pattern}</span></div>
            <div class="info-line"><span class="k">用神（扶抑法）</span><span class="v">${(chart.useful_god.useful || []).join('、')}</span></div>
            <div class="info-line"><span class="k">忌神</span><span class="v">${(chart.useful_god.avoid || []).join('、')}</span></div>
            <div class="info-line"><span class="k">起运</span><span class="v">${dayun.start_age}岁 ${dayun.start_month}月${dayun.start_day}天 · ${dayun.direction}</span></div>

            <div style="margin-top:1.2rem">
                <div style="display:flex;justify-content:space-between;font-size:0.85rem">
                    <span style="color:var(--text-dim)">日主身强身弱（得令·得地·得势）</span>
                    <span style="color:var(--gold-light)">${strength.level}（${strength.score}分）</span>
                </div>
                <div class="strength-bar-wrap">
                    <div class="strength-bar" style="width:${strength.score}%"></div>
                    <div class="strength-marker" style="left:50%"></div>
                </div>
                <div class="strength-labels"><span>身弱</span><span>中和</span><span>身强</span></div>
                <div class="ddd-summary">${strength.summary || ''}</div>
                <div class="ddd-list">
                    ${[['得令', strength.deling, '月令旺衰·权重40%'], ['得地', strength.dedi, '地支根气·权重30%'], ['得势', strength.deshi, '生扶力量·权重30%']].map(([name, d, tip]) => `
                    <div class="ddd-item ${d && d.got ? 'got' : 'lost'}">
                        <div class="ddd-head">
                            <span class="ddd-name">${name}${d && d.got ? ' ✓' : ' ✗'}</span>
                            <span class="ddd-score">${d ? d.score : 0}<small>分</small></span>
                        </div>
                        <div class="ddd-tip">${tip}</div>
                        <div class="ddd-desc">${d ? d.desc : ''}</div>
                    </div>`).join('')}
                </div>
            </div>
        </div>

        <!-- 五行雷达图 -->
        <div class="card">
            <div class="card-title">五行力量分布</div>
            <div id="wuxingRadar"></div>
        </div>

        <!-- 十神分布 -->
        <div class="card">
            <div class="card-title">十神分布</div>
            <div class="ss-grid">
                ${ALL_SHISHEN.map(s => `
                    <div class="ss-cell ${ssCount[s] > 0 ? 'active' : ''}">
                        <div class="name">${s}</div>
                        <div class="count">${ssCount[s] > 0 ? '×' + ssCount[s] : '—'}</div>
                    </div>`).join('')}
            </div>
        </div>

        <!-- 大运详情 -->
        <div class="card">
            <div class="card-title">大运与流年</div>
            <div class="dayun-detail">
                ${(dayun.steps || []).map(s => {
                    const isCurrent = s.start_year <= new Date().getFullYear() && new Date().getFullYear() <= s.end_year;
                    return `
                    <div class="dy-block ${isCurrent ? 'current' : ''}">
                        <div class="head">
                            <span class="gz">${s.ganzhi}</span>
                            <span class="age">${s.start_age}-${s.end_age}岁</span>
                        </div>
                        <div class="ss-cell" style="margin-bottom:0.3rem">${s.shishen_gan}</div>
                        <div class="ln">${(s.liu_nian || []).slice(0, 5).map(ly =>
                            `${ly.year} ${ly.ganzhi}<b>${ly.shishen}</b>`
                        ).join('<br>')}</div>
                        ${isCurrent ? '<div style="color:var(--gold);font-size:0.68rem;margin-top:0.3rem">★ 当前大运</div>' : ''}
                    </div>`;
                }).join('')}
            </div>
        </div>
    `;

    renderWuxingRadar(chart);
}

// 五行雷达图
function renderWuxingRadar(chart) {
    const el = document.getElementById('wuxingRadar');
    if (!el || typeof echarts === 'undefined') return;
    const percent = chart.five_elements.percent || {};
    const score = chart.five_elements.score || {};
    const useful = (chart.useful_god && chart.useful_god.useful) || [];
    const avoid = (chart.useful_god && chart.useful_god.avoid) || [];

    const myChart = echarts.init(el);
    myChart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'item',
            formatter: (p) => {
                const wx = p.name;
                let tag = '';
                if (useful.includes(wx)) tag = '（用神）';
                else if (avoid.includes(wx)) tag = '（忌神）';
                return `${wx}${tag}<br>原始分：${score[wx]}<br>占比：${p.value}%`;
            }
        },
        radar: {
            indicator: ["金", "木", "水", "火", "土"].map(name => ({ name, max: 40 })),
            shape: 'polygon',
            splitNumber: 4,
            axisName: { color: '#e8e4f0', fontSize: 14 },
            splitLine: { lineStyle: { color: 'rgba(124,107,214,0.15)' } },
            splitArea: { areaStyle: { color: ['rgba(26,34,38,0.3)', 'rgba(26,34,38,0.1)'] } },
            axisLine: { lineStyle: { color: 'rgba(124,107,214,0.2)' } }
        },
        series: [{
            type: 'radar',
            data: [{
                value: ["金", "木", "水", "火", "土"].map(n => percent[n] || 0),
                name: '五行占比',
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: { color: '#b8aee8', width: 2 },
                itemStyle: { color: '#e9e6f6' },
                areaStyle: { color: 'rgba(124,107,214,0.25)' }
            }],
            emphasis: {
                lineStyle: { width: 3 }
            }
        }]
    });
}
