import { initI18n, changeLanguage } from '../../../Shared/i18n.js';
import { loadToolConfig } from '../../../Shared/config-loader.js';
import { WelcomeModal } from '../../../Shared/welcome-modal.js';
import AdManager from '../../../Shared/ad-manager.js';
import SEOManager from '../../../Shared/seo-manager.js';
import Sortable from 'sortablejs';

const TOOL_ID = 'pdf-utility';

// Elements
const tabMerge = document.getElementById('tab-merge');
const tabSplit = document.getElementById('tab-split');
const tabUnlock = document.getElementById('tab-unlock');
const optionsPanel = document.getElementById('options-panel');
const optsSplit = document.getElementById('opts-split');
const optsUnlock = document.getElementById('opts-unlock');
const splitRadios = document.getElementsByName('split-mode');
const extractInputGroup = document.getElementById('extract-input-group');
const splitRange = document.getElementById('split-range');
const unlockPassword = document.getElementById('unlock-password');
const btnExecute = document.getElementById('btn-execute');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');

const tabs = { merge: tabMerge, split: tabSplit, unlock: tabUnlock };

// State
let mode = 'merge';
let files = [];
let worker = null;
let t; // Translation function

async function init() {
    // Init i18n
    const i18n = await initI18n(TOOL_ID);
    t = i18n.t.bind(i18n);

    // Initial Config
    const currentLang = i18n.language || 'en';
    await loadToolConfig(TOOL_ID, currentLang);
    AdManager.init();
    SEOManager.init('PdfUtility');

    new WelcomeModal(TOOL_ID, {
        title: t('welcome_title'),
        description: t('welcome_desc'),
        features: [
            t('feature_1'),
            t('feature_2'),
            t('feature_3')
        ],
        dontShowLabel: t('welcome_dont_show'),
        startLabel: t('welcome_start')
    }).init();

    window.addEventListener('languageChanged', (e) => {
        loadToolConfig(TOOL_ID, e.detail.lng);
        updateUI(); // Refresh tool-specific UI on lang change
    });

    initWorker();
    setupDnD();
    setupTabs();
    setupOptions();

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFiles);

    btnExecute.addEventListener('click', executeAction);

    // Initialize Sortable (Only useful for Merge)
    new Sortable(fileList, {
        animation: 150,
        ghostClass: 'opacity-50',
        onEnd: (evt) => {
            const itemEl = files.splice(evt.oldIndex, 1)[0];
            files.splice(evt.newIndex, 0, itemEl);
        }
    });

    updateUI();
}

function initWorker() {
    worker = new Worker(new URL('./worker/pdf-worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
        const { type, result, error } = e.data;
        if (type === 'SUCCESS') {
            const ext = result.mode === 'zip' ? 'zip' : 'pdf';
            const defaultName = mode === 'merge' ? 'merged.pdf' : (mode === 'split' ? `split.${ext}` : 'unlocked.pdf');
            const mime = result.mode === 'zip' ? 'application/zip' : 'application/pdf';

            downloadBlob(result.data, defaultName, mime);
            alert(t('done'));
            btnExecute.disabled = false;
            btnExecute.textContent = t('execute');
        } else if (type === 'ERROR') {
            console.error(error);
            alert('Error: ' + error);
            btnExecute.disabled = false;
            btnExecute.textContent = t('execute');
        }
    };
}

function setupTabs() {
    Object.keys(tabs).forEach(k => {
        tabs[k].addEventListener('click', () => {
            mode = k;
            updateUI();
        });
    });
}

function setupOptions() {
    splitRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'extract') {
                extractInputGroup.classList.remove('hidden');
            } else {
                extractInputGroup.classList.add('hidden');
            }
        });
    });
}

function updateUI() {
    // 1. Tab Styles
    Object.keys(tabs).forEach(k => {
        const el = tabs[k];
        if (k === mode) {
            el.className = 'px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 bg-indigo-600 text-white shadow';
        } else {
            el.className = 'px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 text-gray-400 hover:text-white hover:bg-gray-700';
        }
    });

    // 2. Options Panel
    optionsPanel.classList.add('hidden');
    optsSplit.classList.add('hidden');
    optsUnlock.classList.add('hidden');

    if (mode === 'split') {
        optionsPanel.classList.remove('hidden');
        optsSplit.classList.remove('hidden');
    } else if (mode === 'unlock') {
        optionsPanel.classList.remove('hidden');
        optsUnlock.classList.remove('hidden');
    }

    // 3. File List & Input Restrictions
    // In Split/Unlock, allow only 1 file. If more, keep first.
    if ((mode === 'split' || mode === 'unlock') && files.length > 1) {
        files = [files[0]];
        renderFileList();
    }

    // Update DropZone text
    const title = dropZone.querySelector('h3');
    if (mode === 'merge') {
        fileInput.multiple = true;
        title.setAttribute('data-i18n', 'drop_zone_all');
        title.innerText = t('drop_zone_all');
        fileList.classList.remove('pointer-events-none', 'opacity-50'); // sortable enabled
    } else {
        fileInput.multiple = false;
        title.setAttribute('data-i18n', 'drop_zone_single');
        title.innerText = t('drop_zone_single');
        // Sortable effectively disabled by UI logic implicitly (1 item)
    }

    // Update Button Text
    btnExecute.innerText = t('execute');
}

function setupDnD() {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    dropZone.addEventListener('dragenter', () => dropZone.classList.add('border-indigo-500', 'bg-gray-800/80'));
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-indigo-500', 'bg-gray-800/80'));
    dropZone.addEventListener('drop', handleDrop);
}

function handleDrop(e) {
    dropZone.classList.remove('border-indigo-500', 'bg-gray-800/80');
    const dt = e.dataTransfer;
    handleFiles({ target: { files: dt.files } });
}

function handleFiles(e) {
    const newFiles = [...e.target.files].filter(f => f.type === 'application/pdf');

    if (mode !== 'merge') {
        // Replace existing
        files = [];
        if (newFiles.length > 0) {
            const f = newFiles[0];
            const id = Math.random().toString(36).substr(2, 9);
            files.push({ id, file: f });
        }
    } else {
        // Append
        newFiles.forEach(file => {
            const id = Math.random().toString(36).substr(2, 9);
            files.push({ id, file });
        });
    }
    renderFileList();
    fileInput.value = ''; // Reset to allow re-selecting same file
}

function renderFileList() {
    fileList.innerHTML = '';
    files.forEach(f => addFileToUI(f.file, f.id));
}

function addFileToUI(file, id) {
    const div = document.createElement('div');
    div.className = 'group relative bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-sm hover:border-gray-500 cursor-grab active:cursor-grabbing transition-all animate-fade-in';
    div.dataset.id = id;
    div.innerHTML = `
        <div class="aspect-[1/1.4] bg-gray-700/50 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
            <svg class="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            ${mode === 'merge' ? `<div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span class="text-xs font-bold text-white">${t('sort_hint')}</span>
            </div>` : ''}
        </div>
        <div class="text-xs text-gray-300 truncate font-mono">${file.name}</div>
        <div class="text-[10px] text-gray-500 mt-1">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
        
        <button class="absolute top-2 right-2 p-1 bg-gray-900/80 rounded-full text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onclick="removeFile('${id}')">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
    `;
    fileList.appendChild(div);
}

window.removeFile = (id) => {
    const index = files.findIndex(f => f.id === id);
    if (index > -1) {
        files.splice(index, 1);
        renderFileList();
    }
};

async function executeAction() {
    if (files.length === 0) {
        return;
    }

    if (mode === 'merge' && files.length < 2) {
        return;
    }

    btnExecute.disabled = true;
    btnExecute.textContent = t('processing');

    const fileBuffers = await Promise.all(files.map(async (f) => {
        return await f.file.arrayBuffer();
    }));

    const payload = {
        files: fileBuffers,
        options: {}
    };

    if (mode === 'split') {
        const splitMode = Array.from(splitRadios).find(r => r.checked).value; // 'all' or 'extract'
        payload.options.splitMode = splitMode;
        if (splitMode === 'extract') {
            payload.options.range = splitRange.value;
        }
    } else if (mode === 'unlock') {
        payload.options.password = unlockPassword.value;
    }

    // Offload to worker
    worker.postMessage({ type: mode.toUpperCase(), payload, id: Date.now() });
}

function downloadBlob(data, fileName, mimeType) {
    const blob = new Blob([data], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
}

init();
