/**
 * Portal Dashboard Logic
 */
import { initAuth, login, logout } from './auth.js';
import { fetchOverallMetrics, fetchToolMetrics, fetchToolConfig, updateToolConfig } from './dashboard-service.js';

// Init
(async () => {
    // Auth State Interface
    const authSection = document.getElementById('auth-section');
    const dashboardContent = document.getElementById('dashboard-content');
    const btnLogin = document.getElementById('btn-login');
    const btnLogout = document.getElementById('btn-logout');
    const userDisplay = document.getElementById('user-display');

    initAuth((user) => {
        if (user) {
            authSection.classList.add('hidden');
            dashboardContent.classList.remove('hidden');
            userDisplay.innerText = user.email;
            loadDashboardData();
        } else {
            authSection.classList.remove('hidden');
            dashboardContent.classList.add('hidden');
            userDisplay.innerText = '';
        }
    });

    btnLogin.addEventListener('click', login);
    btnLogout.addEventListener('click', logout);

    // Editor Logic
    setupEditor();
})();

async function loadDashboardData() {
    // 1. Overall Metrics
    const metrics = await fetchOverallMetrics();
    document.getElementById('metric-revenue').innerText = `$${metrics.revenue.toFixed(2)}`;
    document.getElementById('metric-pv').innerText = metrics.pv.toLocaleString();
    document.getElementById('metric-rpm').innerText = `$${metrics.rpm.toFixed(2)}`;
    document.getElementById('metric-errors').innerText = metrics.errors;

    // 2. Tool Tables (Mock)
    const tableBody = document.getElementById('tools-table-body');
    tableBody.innerHTML = ''; // Clear

    const tools = ['tax-engine', 'video-workbench', 'data-suite'];
    for (const id of tools) {
        const data = await fetchToolMetrics(id);
        const row = `
            <tr class="border-b border-gray-700 hover:bg-gray-750">
                <td class="p-3">${id}</td>
                <td class="p-3 font-mono">${data.pv.toLocaleString()}</td>
                <td class="p-3 text-green-400">$${data.revenue.toFixed(2)}</td>
                <td class="p-3 text-yellow-400">${data.performance}%</td>
                <td class="p-3">
                    <button class="text-blue-400 hover:underline btn-edit-config" data-id="${id}">Edit</button>
                </td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    }

    // Attach Edit Listeners
    document.querySelectorAll('.btn-edit-config').forEach(btn => {
        btn.addEventListener('click', (e) => openEditor(e.target.dataset.id));
    });
}

// Editor Modal Logic
const modal = document.getElementById('editor-modal');
const editorToolId = document.getElementById('editor-tool-id');
const inputSeoTitle = document.getElementById('input-seo-title');
const inputAdHeader = document.getElementById('input-ad-header');
const checkAdsEnabled = document.getElementById('check-ads-enabled');
const btnSave = document.getElementById('btn-save-config');
const btnCancel = document.getElementById('btn-cancel-config');

async function openEditor(toolId) {
    editorToolId.innerText = toolId;
    modal.classList.remove('hidden');

    // Load current config
    const config = await fetchToolConfig(toolId);
    inputSeoTitle.value = config.seoTitle;
    inputAdHeader.value = config.adTagHeader; // Simplified for demo
    checkAdsEnabled.checked = config.adsEnabled;
}

function setupEditor() {
    btnCancel.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    btnSave.addEventListener('click', async () => {
        const toolId = editorToolId.innerText;
        const newConfig = {
            seoTitle: inputSeoTitle.value,
            adTagHeader: inputAdHeader.value,
            adsEnabled: checkAdsEnabled.checked
        };

        btnSave.innerText = "Saving...";
        await updateToolConfig(toolId, newConfig);
        btnSave.innerText = "Save Changes";
        modal.classList.add('hidden');
        alert(`Configuration for ${toolId} saved!`);
    });
}
