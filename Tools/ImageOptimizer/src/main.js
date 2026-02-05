import { initI18n, changeLanguage, updateUI } from '../../../Shared/i18n.js';
import { loadToolConfig } from '../../../Shared/config-loader.js';
import { WelcomeModal } from '../../../Shared/welcome-modal.js';
import AdManager from '../../../Shared/ad-manager.js';
import SEOManager from '../../../Shared/seo-manager.js';
import imageCompression from 'browser-image-compression';
import JSZip from 'jszip';

const TOOL_ID = 'image-optimizer';

// Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const qualityRange = document.getElementById('quality-range');
const qualityVal = document.getElementById('quality-val');
const maxWidthSelect = document.getElementById('max-width-select');
const maxWidthVal = document.getElementById('max-width-val');
const btnProcess = document.getElementById('btn-process');
const emptyState = document.getElementById('empty-state');
const queueCount = document.getElementById('queue-count');
const fileList = document.getElementById('file-list');
const totalSaved = document.getElementById('total-saved');
const btnDownloadAll = document.getElementById('btn-download-all');

(async () => {
    // Init i18n
    const i18n = await initI18n(TOOL_ID);
    const t = i18n.t.bind(i18n);

    // Initial Config
    const currentLang = i18n.language || 'en';
    await loadToolConfig(TOOL_ID, currentLang);
    AdManager.init();
    SEOManager.init('ImageOptimizer');

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

    // State
    let files = []; // { id, file, status, resultBlob, originalSize, resultSize }

    // Init
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleSelect);
    qualityRange.addEventListener('input', (e) => qualityVal.textContent = e.target.value + '%');
    maxWidthSelect.addEventListener('change', (e) => maxWidthVal.textContent = e.target.value === '0' ? t('original') : e.target.value + 'px');
    btnProcess.addEventListener('click', processAll);

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    dropZone.addEventListener('dragenter', () => dropZone.classList.add('border-pink-500'));
    dropZone.addEventListener('dragover', () => dropZone.classList.add('border-pink-500'));
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-pink-500'));
    dropZone.addEventListener('drop', handleDrop);

    function handleDrop(e) {
        dropZone.classList.remove('border-pink-500');
        const dt = e.dataTransfer;
        if (dt.files && dt.files.length) {
            addFiles(dt.files);
        }
    }

    function handleSelect(e) {
        if (e.target.files.length) addFiles(e.target.files);
    }

    function addFiles(fileListObj) {
        emptyState.classList.add('hidden');

        Array.from(fileListObj).forEach(file => {
            if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) return;

            const id = Math.random().toString(36).substr(2, 9);
            const item = {
                id,
                file,
                status: 'pending',
                originalSize: file.size,
                resultSize: 0
            };
            files.push(item);
            renderItem(item);
        });
        updateStats();
    }

    function updateUI() {
        updateStats();
        // Update any static text that might have changed if we used JS to set it
        // However, most text is in index.html with data-i18n.
        // We only need to handle dynamic labels if they are not covered by data-i18n.
        btnProcess.textContent = t('optimize_all');
        btnDownloadAll.textContent = t('download_zip');
        qualityVal.textContent = t('quality_value', { value: qualityRange.value });
        maxWidthVal.textContent = maxWidthSelect.value === '0' ? t('original') : t('max_width_value', { value: maxWidthSelect.value });

        // Re-render items to update their status text if language changed
        files.forEach(item => {
            const statusEl = document.getElementById(`status-${item.id}`);
            if (statusEl) {
                if (item.status === 'pending') {
                    updateStatus(item.id, t('status_pending'), 'text-gray-300');
                } else if (item.status === 'processing') {
                    updateStatus(item.id, t('status_processing'), 'text-yellow-400');
                } else if (item.status === 'done') {
                    updateStatus(item.id, `${formatSize(item.resultSize)} (-${Math.round((1 - item.resultSize / item.originalSize) * 100)}%)`, 'text-pink-400');
                    // Re-add button to update its text
                    addButton(item);
                } else if (item.status === 'error') {
                    updateStatus(item.id, t('status_error'), 'text-red-400');
                }
            }
        });
    }

    function renderItem(item) {
        const div = document.createElement('div');
        div.id = `item-${item.id}`;
        div.className = 'bg-gray-900 rounded-lg p-3 flex items-center justify-between border border-gray-700';
        div.innerHTML = `
        <div class="flex items-center space-x-3 overflow-hidden">
            <div class="w-10 h-10 rounded bg-gray-800 flex items-center justify-center flex-shrink-0 text-gray-500 font-bold text-xs uppercase">
                ${item.file.name.split('.').pop()}
            </div>
            <div class="min-w-0">
                <p class="text-sm font-medium text-gray-200 truncate">${item.file.name}</p>
                <p class="text-xs text-gray-500">${formatSize(item.originalSize)}</p>
            </div>
        </div >
    <div class="flex items-center space-x-4 flex-shrink-0">
        <div class="text-right">
            <p class="text-sm font-bold text-gray-300" id="status-${item.id}">${t('status_pending')}</p>
        </div>
        <button class="p-1 text-gray-500 hover:text-red-400" onclick="removeItem('${item.id}')">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
    </div>
`;
        fileList.appendChild(div);
    }

    window.removeItem = (id) => {
        files = files.filter(f => f.id !== id);
        document.getElementById(`item-${id}`).remove();
        updateStats();
        if (files.length === 0) emptyState.classList.remove('hidden');
    };

    async function processAll() {
        btnProcess.disabled = true;
        btnProcess.textContent = t('processing');

        const quality = parseInt(qualityRange.value) / 100;
        const maxWidth = parseInt(maxWidthSelect.value) || undefined;

        for (const item of files) {
            if (item.status === 'done') continue;

            updateStatus(item.id, t('status_processing'), 'text-yellow-400');

            try {
                if (item.file.type === 'image/svg+xml') {
                    await processSVG(item);
                } else {
                    await processWebP(item, quality, maxWidth);
                }
                // Done
                updateStatus(item.id, `${formatSize(item.resultSize)} (-${Math.round((1 - item.resultSize / item.originalSize) * 100)}%)`, 'text-pink-400');
                addButton(item);
            } catch (e) {
                console.error(e);
                updateStatus(item.id, t('status_error'), 'text-red-400');
            }
        }

        btnProcess.disabled = false;
        btnProcess.textContent = t('optimize_all');
        updateStats();

        // Enable Download All if we have files
        if (files.some(f => f.status === 'done')) {
            document.getElementById('btn-download-all').disabled = false;
        }
    }

    document.getElementById('btn-download-all').addEventListener('click', async () => {
        const zip = new JSZip();
        let count = 0;

        files.forEach(item => {
            if (item.status === 'done' && item.resultBlob) {
                const ext = item.file.type === 'image/svg+xml' ? 'svg' : 'webp';
                zip.file(`optimized_${item.file.name.split('.')[0]}.${ext}`, item.resultBlob);
                count++;
            }
        });

        if (count > 0) {
            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'optimized_images.zip';
            a.click();
        }
    });

    async function processWebP(item, quality, maxWidth) {
        const options = {
            maxSizeMB: 10, // No hard limit, control via quality
            maxWidthOrHeight: maxWidth,
            useWebWorker: true,
            fileType: 'image/webp',
            initialQuality: quality
        };

        const compressedFile = await imageCompression(item.file, options);
        item.resultBlob = compressedFile;
        item.resultSize = compressedFile.size;
        item.status = 'done';
    }

    async function processSVG(item) {
        const text = await item.file.text();
        // Simple Regex Minification
        let minified = text
            .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
            .replace(/>\s+</g, '><') // Remove whitespace between tags
            .replace(/\s{2,}/g, ' ') // Collapse whitespace
            .replace(/metadata/g, 'metadata_removed'); // Placeholder for metadata removal if needed (risky to just replace tag names, better to parse if possible, but regex is safe for standard comments)
        // Advanced: remove newlines
        minified = minified.replace(/\n/g, '');

        const blob = new Blob([minified], { type: 'image/svg+xml' });
        item.resultBlob = blob;
        item.resultSize = blob.size;
        item.status = 'done';
    }

    function updateStatus(id, text, colorClass) {
        const el = document.getElementById(`status-${id}`);
        el.textContent = text;
        el.className = `text-sm font-bold ${colorClass}`;
    }

    function addButton(item) {
        const div = document.getElementById(`item-${item.id}`).querySelector('.flex-shrink-0');
        // Remove existing delete button
        div.innerHTML = '';

        // Add Download Button
        const btn = document.createElement('button');
        const ext = item.file.type === 'image/svg+xml' ? 'svg' : 'webp';
        btn.className = 'bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded transition-colors';
        btn.textContent = t('save');
        btn.onclick = () => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(item.resultBlob);
            link.download = `optimized_${item.file.name.split('.')[0]}.${ext}`;
            link.click();
        };
        div.appendChild(btn);
    }

    function updateStats() {
        queueCount.textContent = t('queue_count', { count: files.length });
        const saved = files.reduce((acc, curr) => {
            if (curr.resultSize > 0) return acc + (curr.originalSize - curr.resultSize);
            return acc;
        }, 0);
        totalSaved.textContent = formatSize(saved);
    }

    function formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    window.addEventListener('languageChanged', (e) => {
        loadToolConfig(TOOL_ID, e.detail.lng);
        updateUI();
    });

})();
