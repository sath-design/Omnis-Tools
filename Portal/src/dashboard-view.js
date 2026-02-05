import { fetchOverallMetrics, fetchToolMetrics, fetchToolConfig, updateToolConfig } from './dashboard-service.js';
import { fetchAdSettings, saveAdSettings } from './ad-service.js';

// --- State ---
let trafficChart;
let currentSection = 'dashboard';
let adSettings = null;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    initNavigation();
    initDashboard();
    initMockSections(); // Keeping SEO/Health as beta for now
    await initAdsSection();

    // Global Sync Button
    document.getElementById('btn-deploy-global')?.addEventListener('click', () => {
        alert('設定を全ツールに同期しました。 (このアクションは現在はアドオン設定の保存と同時に自動実行されます)');
    });

    // Simulate Realtime Updates
    setInterval(updateRealtimeData, 3000);
});

async function initAdsSection() {
    const adsSection = document.getElementById('ads-section');
    if (!adsSection) return;

    try {
        adSettings = await fetchAdSettings();
        renderAdsUI();
    } catch (e) {
        console.error("Ads Loading Error:", e);
        adsSection.innerHTML = `
            <div class="text-red-400 p-10 text-center glass-panel rounded-xl">
                Error loading ads data.<br>
                <span class="text-[10px] text-gray-500 font-mono mt-2 block">${e.message}</span>
            </div>
        `;
    }
}

function renderAdsUI() {
    const adsSection = document.getElementById('ads-section');
    if (!adsSection || !adSettings) return;

    const adsHTML = `
        <div class="grid grid-cols-1 gap-6">
            <!-- Summary Card -->
            <div class="glass-panel p-6 rounded-xl flex justify-between items-center border-l-[4px] ${adSettings.showAds ? 'border-green-500' : 'border-red-500'}">
                <div>
                    <h3 class="text-lg font-bold text-white mb-1">広告配信ステータス</h3>
                    <p class="text-sm text-gray-400">${adSettings.showAds ? '全ツールで広告が有効化されています' : '全ツールで広告が停止されています (緊急停止中)'}</p>
                </div>
                <div class="flex items-center gap-4">
                    <button id="btn-toggle-ads" class="px-6 py-2 rounded-lg font-bold text-sm shadow-lg transition-all ${adSettings.showAds ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-green-600 hover:bg-green-500 text-white'}">
                        ${adSettings.showAds ? '緊急停止を実行' : '配信を再開'}
                    </button>
                </div>
            </div>

            <!-- Unit List -->
            <div class="glass-panel p-6 rounded-xl">
                <h3 class="text-sm font-bold text-gray-300 mb-6 uppercase tracking-widest">広告ユニット管理</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm text-gray-400">
                        <thead class="bg-gray-800 text-gray-300 uppercase text-xs">
                            <tr>
                                <th class="px-4 py-3">ユニット名</th>
                                <th class="px-4 py-3">タイプ</th>
                                <th class="px-4 py-3">ステータス</th>
                                <th class="px-4 py-3">操作</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-700">
                            ${adSettings.slots?.map((s, idx) => `
                                <tr>
                                    <td class="px-4 py-3 font-medium text-gray-200">${s.name}</td>
                                    <td class="px-4 py-3">${s.type}</td>
                                    <td class="px-4 py-3">
                                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${s.status === 'Active' ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'}">${s.status}</span>
                                    </td>
                                    <td class="px-4 py-3">
                                        <button class="text-blue-400 hover:text-white transition-colors" onclick="alert('Coming soon: Edit slot')">編集</button>
                                    </td>
                                </tr>
                            `).join('') || '<tr><td colspan="4" class="text-center py-4 text-gray-600">No slots defined</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Scripts Configuration -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Google AdSense -->
                <div class="glass-panel p-6 rounded-xl space-y-4">
                    <h3 class="text-sm font-bold text-white flex items-center gap-2">
                        <i class="fab fa-google text-yellow-400"></i> Google AdSense 設定
                    </h3>
                    <div>
                        <label class="block text-[10px] text-gray-500 font-bold uppercase mb-1">Publisher ID (ca-pub-xxx)</label>
                        <input id="input-pub-id" type="text" value="${adSettings.publisherId || 'ca-pub-4443809916748748'}" placeholder="pub-xxxxxxxxxxxxxxxx" 
                            class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-blue-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-[10px] text-gray-500 font-bold uppercase mb-1">Auto-injection</label>
                        <label class="flex items-center cursor-pointer mt-1">
                            <input type="checkbox" id="check-gads" class="sr-only peer" ${adSettings.googleAdsEnabled ? 'checked' : ''}>
                            <div class="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            <span class="ml-3 text-xs font-medium text-gray-400">Google AdSense (自動広告) を有効化</span>
                        </label>
                    </div>
                </div>

                <!-- Raptive -->
                <div class="glass-panel p-6 rounded-xl space-y-4">
                    <h3 class="text-sm font-bold text-white flex items-center gap-2">
                        <i class="fas fa-bolt text-purple-400"></i> Raptive 設定
                    </h3>
                    <div>
                        <label class="block text-[10px] text-gray-500 font-bold uppercase mb-1">Header Script Tag</label>
                        <textarea id="input-header-tag" class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs font-mono h-20 focus:border-purple-500 outline-none" placeholder="<script>...</script>">${adSettings.headerTag || ''}</textarea>
                    </div>
                    <div>
                        <label class="flex items-center cursor-pointer mt-1">
                            <input type="checkbox" id="check-raptive" class="sr-only peer" ${adSettings.raptiveEnabled ? 'checked' : ''}>
                            <div class="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                            <span class="ml-3 text-xs font-medium text-gray-400">Raptive を優先有効化</span>
                        </label>
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-3">
                 <button id="btn-save-ads" class="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-lg font-bold shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2">
                    <i class="fas fa-save"></i> 設定を保存
                </button>
            </div>
        </div>
    `;

    adsSection.innerHTML = adsHTML;
    adsSection.classList.remove('hidden');

    // Attach Listeners
    document.getElementById('btn-toggle-ads')?.addEventListener('click', async () => {
        adSettings.showAds = !adSettings.showAds;
        await handleAdSave();
    });

    document.getElementById('btn-save-ads')?.addEventListener('click', async () => {
        adSettings.publisherId = document.getElementById('input-pub-id').value;
        adSettings.headerTag = document.getElementById('input-header-tag').value;
        adSettings.googleAdsEnabled = document.getElementById('check-gads').checked;
        adSettings.raptiveEnabled = document.getElementById('check-raptive').checked;
        await handleAdSave();
    });
}

async function handleAdSave() {
    try {
        const btn = document.getElementById('btn-save-ads');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner animate-spin"></i> 保存中...';
        }

        await saveAdSettings(adSettings);

        if (btn) {
            btn.innerHTML = '<i class="fas fa-check"></i> 保存完了';
            btn.classList.replace('bg-blue-600', 'bg-green-600');
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> 設定を保存';
                btn.classList.replace('bg-green-600', 'bg-blue-600');
            }, 2000);
        }

        renderAdsUI(); // Refresh UI
    } catch (e) {
        alert("Failed to save settings: " + e.message);
        renderAdsUI();
    }
}

// --- Navigation ---
function initNavigation() {
    window.showSection = (id) => {
        const sections = ['dashboard', 'ads', 'seo', 'health'];
        const activeClasses = ['bg-blue-600/10', 'text-blue-400', 'border', 'border-blue-600/20'];
        const inactiveClasses = ['text-gray-400', 'hover:bg-gray-800', 'hover:text-white'];
        currentSection = id;

        // 1. Content Toggling
        sections.forEach(s => {
            const sec = document.getElementById(s + '-section');
            if (sec) sec.classList.add('hidden');
        });
        const target = document.getElementById(id + '-section');
        if (target) {
            target.classList.remove('hidden');
            target.classList.add('animate-fade-in');
        }

        // 2. Nav Visual Update
        sections.forEach(s => {
            const el = document.getElementById('nav-' + s);
            if (!el) return;

            if (s === id) {
                el.classList.remove(...inactiveClasses);
                el.classList.add(...activeClasses);
            } else {
                el.classList.remove(...activeClasses);
                el.classList.add(...inactiveClasses);
            }
        });

        // 3. Title Update
        const titles = {
            'dashboard': 'オーバーウォッチ ダッシュボード',
            'ads': '広告マナージメント',
            'seo': 'SEO設定・管理',
            'health': 'システム死活監視'
        };
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) pageTitle.innerText = titles[id];
    };
}

// --- Dashboard Section ---
async function initDashboard() {
    initChart();
    await updateDashboardMetrics();
}

function initChart() {
    const canvas = document.getElementById('trafficChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    Chart.defaults.color = '#6B7280';
    Chart.defaults.borderColor = '#374151';

    trafficChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
            datasets: [
                {
                    label: 'PV',
                    data: [120, 300, 2400, 4800, 3200, 5200],
                    borderColor: '#60A5FA', // Blue-400
                    backgroundColor: 'rgba(96, 165, 250, 0.1)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: '収益 ($)',
                    data: [1, 2, 12, 28, 18, 25],
                    borderColor: '#34D399', // Emerald-400
                    borderDash: [5, 5],
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { labels: { color: '#9CA3AF' } } },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { color: '#374151' },
                    ticks: { color: '#9CA3AF' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { display: false },
                    ticks: { color: '#9CA3AF' }
                },
                x: { grid: { display: false }, ticks: { color: '#9CA3AF' } }
            }
        }
    });
}

async function updateDashboardMetrics() {
    const data = await fetchOverallMetrics();
    const elPV = document.getElementById('metric-pv');
    const elRev = document.getElementById('metric-revenue');
    const elRPM = document.getElementById('metric-rpm');
    const elErr = document.getElementById('metric-errors');

    if (elPV) elPV.innerText = data.pv.toLocaleString();
    if (elRev) elRev.innerText = '$' + data.revenue.toFixed(2);
    if (elRPM) elRPM.innerText = '$' + data.rpm.toFixed(2);
    if (elErr) elErr.innerText = data.errors;
}

function updateRealtimeData() {
    if (currentSection !== 'dashboard') return;
    const volatility = 0.05;

    if (trafficChart) {
        const lastPV = trafficChart.data.datasets[0].data[5];
        const lastRev = trafficChart.data.datasets[1].data[5];
        const newPV = Math.floor(lastPV * (1 + (Math.random() * volatility * 2 - volatility)));
        const newRev = lastRev * (1 + (Math.random() * volatility * 2 - volatility));

        trafficChart.data.datasets[0].data.shift();
        trafficChart.data.datasets[0].data.push(newPV);
        trafficChart.data.datasets[1].data.shift();
        trafficChart.data.datasets[1].data.push(newRev);

        trafficChart.update('none');
    }

    const elPV = document.getElementById('metric-pv');
    if (elPV) {
        let current = parseInt(elPV.innerText.replace(/,/g, ''));
        elPV.innerText = (current + Math.floor(Math.random() * 10)).toLocaleString();
    }
}

// --- Beta Sections (SEO/Health) ---
function initMockSections() {
    const seoHTML = `
        <div class="glass-panel p-6 rounded-xl space-y-6">
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
                <i class="fas fa-search text-blue-400"></i> グローバルSEO設定 <span class="text-[10px] bg-blue-900/50 text-blue-300 px-1 rounded">Beta</span>
            </h3>
            <p class="text-xs text-gray-400">現在テスト運用中です。設定は全ツールに順次適用されます。</p>
            <div>
                <label class="block text-sm text-gray-400 mb-2">共通タイトルサフィックス</label>
                <input type="text" value=" - Omnis Tools" class="w-full bg-gray-900 border border-gray-700 rounded px-4 py-2 text-white focus:border-blue-500 focus:outline-none">
            </div>
            <div>
                <label class="block text-sm text-gray-400 mb-2">デフォルト Meta Description</label>
                <textarea class="w-full bg-gray-900 border border-gray-700 rounded px-4 py-2 text-white focus:border-blue-500 focus:outline-none h-24">プロフェッショナルのための高機能Webツールスイート。</textarea>
            </div>
             <div class="flex justify-end">
                <button class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg opacity-50 cursor-not-allowed">保存 (Coming Soon)</button>
            </div>
        </div>
    `;
    const seoSection = document.getElementById('seo-section');
    if (seoSection) seoSection.innerHTML = seoHTML;

    const tools = [
        { name: 'TaxEngine', status: 'Online', latency: '45ms', uptime: '99.99%' },
        { name: 'VideoWorkbench', status: 'Online', latency: '120ms', uptime: '99.95%' },
        { name: 'DataSuite', status: 'Online', latency: '35ms', uptime: '100.00%' },
        { name: 'PdfUtility', status: 'Online', latency: '50ms', uptime: '99.98%' },
        { name: 'PrivacyScrubber', status: 'Online', latency: '40ms', uptime: '99.99%' },
        { name: 'ImageOptimizer', status: 'Online', latency: '85ms', uptime: '99.90%' },
        { name: 'RegexSandbox', status: 'Online', latency: '30ms', uptime: '100.00%' },
        { name: 'CodePolisher', status: 'Online', latency: '35ms', uptime: '100.00%' }
    ];

    let healthHTML = `
        <div class="glass-panel p-6 rounded-xl">
            <h3 class="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <i class="fas fa-heartbeat text-green-400"></i> システムステータス <span class="text-[10px] bg-green-900/50 text-green-300 px-1 rounded">Beta</span>
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    `;
    tools.forEach(t => {
        healthHTML += `
            <div class="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <div class="flex items-center gap-3">
                    <div class="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></div>
                    <span class="font-bold text-white">${t.name}</span>
                </div>
                <div class="flex items-center gap-6 text-sm">
                    <span class="text-blue-300 ml-2 font-mono">${t.latency}</span>
                </div>
            </div>
        `;
    });
    healthHTML += `</div></div>`;
    const healthSection = document.getElementById('health-section');
    if (healthSection) healthSection.innerHTML = healthHTML;
}
