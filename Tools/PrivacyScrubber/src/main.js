import { initI18n, changeLanguage, updateUI } from '../../../Shared/i18n.js';
import { loadToolConfig } from '../../../Shared/config-loader.js';
import { WelcomeModal } from '../../../Shared/welcome-modal.js';
import AdManager from '../../../Shared/ad-manager.js';
import SEOManager from '../../../Shared/seo-manager.js';
import EXIF from '../../../Shared/exif-patched.js';

const TOOL_ID = 'privacy-scrubber';

// Global State (Module Scope)
let scrubberI18n = null;
let lastAnalysisResult = null;
let lastAnalysisError = null;

// UI Element Caches
let imgPreview, metaList, metaHeader, metaHeaderText, metaItems, resultPlaceholder, canvas, imgResult, successBadge, resultMessage, resultHeader, btnDownload, textInput, textOutput, btnCopyText, dropPlaceholder;

/**
 * Initialize Tool
 */
(async function init() {
    try {
        scrubberI18n = await initI18n(TOOL_ID);
        const currentLang = scrubberI18n.language || 'en';
        await loadToolConfig(TOOL_ID, currentLang);

        cacheElements();
        attachEventListeners();
        showWelcomeModal();
        AdManager.init();
        SEOManager.init('PrivacyScrubber');
    } catch (e) {
        console.error("Initialization failed:", e);
    }
})();

function cacheElements() {
    imgPreview = document.getElementById('img-preview');
    metaList = document.getElementById('meta-list');
    metaHeader = document.getElementById('meta-header');
    metaHeaderText = document.getElementById('meta-header-text');
    metaItems = document.getElementById('meta-items');
    resultPlaceholder = document.getElementById('result-placeholder');
    canvas = document.getElementById('canvas-process');
    imgResult = document.getElementById('img-result');
    successBadge = document.getElementById('success-badge');
    resultMessage = document.getElementById('result-message');
    resultHeader = document.getElementById('result-header');
    btnDownload = document.getElementById('btn-download');
    textInput = document.getElementById('text-input');
    textOutput = document.getElementById('text-output');
    btnCopyText = document.getElementById('btn-copy-text');
    dropPlaceholder = document.getElementById('drop-placeholder');
}

function attachEventListeners() {
    const tabImage = document.getElementById('tab-image');
    const tabText = document.getElementById('tab-text');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    tabImage?.addEventListener('click', () => switchTab('image'));
    tabText?.addEventListener('click', () => switchTab('text'));

    dropZone?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) handleImageFile(e.target.files[0]);
    });

    dropZone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-green-500');
    });
    dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('border-green-500'));
    dropZone?.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-green-500');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) handleImageFile(e.dataTransfer.files[0]);
    });

    textInput?.addEventListener('input', scrubText);
    btnCopyText?.addEventListener('click', handleCopyText);

    window.addEventListener('languageChanged', (e) => {
        loadToolConfig(TOOL_ID, e.detail.lng);
        renderAnalysisResult();
    });
}

function showWelcomeModal() {
    if (!scrubberI18n) return;
    new WelcomeModal(TOOL_ID, {
        title: scrubberI18n.t('welcome_title'),
        description: scrubberI18n.t('welcome_desc'),
        features: [
            scrubberI18n.t('feature_1'),
            scrubberI18n.t('feature_2'),
            scrubberI18n.t('feature_3')
        ],
        dontShowLabel: scrubberI18n.t('welcome_dont_show'),
        startLabel: scrubberI18n.t('welcome_start')
    }).init();
}

/**
 * Tab Switching Logic
 */
function switchTab(mode) {
    const viewImage = document.getElementById('view-image');
    const viewText = document.getElementById('view-text');
    const tabImage = document.getElementById('tab-image');
    const tabText = document.getElementById('tab-text');

    if (mode === 'image') {
        viewImage?.classList.replace('hidden', 'grid');
        viewText?.classList.replace('grid', 'hidden');
        tabImage?.classList.add('bg-green-600', 'text-white', 'shadow');
        tabImage?.classList.remove('text-gray-400');
        tabText?.classList.remove('bg-green-600', 'text-white', 'shadow');
        tabText?.classList.add('text-gray-400');
    } else {
        viewText?.classList.replace('hidden', 'grid');
        viewImage?.classList.replace('grid', 'hidden');
        tabText?.classList.add('bg-green-600', 'text-white', 'shadow');
        tabText?.classList.remove('text-gray-400');
        tabImage?.classList.remove('bg-green-600', 'text-white', 'shadow');
        tabImage?.classList.add('text-gray-400');
    }
}

/**
 * Image Processing Logic
 */
function handleImageFile(file) {
    if (!file.type.match('image.*')) {
        alert('Please select an image file (JPEG/PNG).');
        return;
    }

    // Reset State
    lastAnalysisResult = null;
    lastAnalysisError = null;
    renderAnalysisResult();

    // Prepare UI
    resultPlaceholder?.classList.remove('hidden');
    imgResult?.classList.add('hidden');
    successBadge?.classList.add('hidden');
    btnDownload.disabled = true;

    // 1. Metadata Analysis
    const exifReader = new FileReader();
    exifReader.onload = () => {
        try {
            analyzeEXIF(exifReader.result);
        } catch (err) {
            console.error("EXIF parsing error:", err);
            lastAnalysisError = err.message;
            renderAnalysisResult();
        }
    };
    exifReader.readAsArrayBuffer(file);

    // 2. Preview & Restoration
    const previewReader = new FileReader();
    previewReader.onload = (e) => {
        if (imgPreview) {
            imgPreview.src = e.target.result;
            imgPreview.classList.remove('hidden');
            imgPreview.onload = () => processCleanImage(imgPreview);
        }
        dropPlaceholder?.classList.add('hidden');
    };
    previewReader.readAsDataURL(file);
}

function analyzeEXIF(buffer) {
    try {
        const allMetaData = EXIF.readFromBinaryFile(buffer);
        const dangerousTags = ['GPSLatitude', 'GPSLongitude', 'Make', 'Model', 'DateTimeOriginal'];
        let detected = [];

        if (allMetaData) {
            dangerousTags.forEach(tag => {
                if (allMetaData[tag]) detected.push(tag);
            });
        }

        lastAnalysisResult = detected;
        renderAnalysisResult();
    } catch (e) {
        lastAnalysisError = e.message || "Unknown EXIF error";
        renderAnalysisResult();
    }
}

function renderAnalysisResult() {
    if (!scrubberI18n || !scrubberI18n.t) return;
    const t = scrubberI18n.t.bind(scrubberI18n);

    // CRITICAL: Always reset styles to neutral before applying new ones
    metaList.classList.remove('bg-red-900/10', 'border-red-500/50', 'bg-green-900/10', 'border-green-500/50');
    metaHeader.classList.remove('text-red-400', 'text-green-400');
    metaItems.classList.remove('text-red-200', 'text-green-200');

    // Handle initial/reset state
    if (!lastAnalysisError && lastAnalysisResult === null) {
        metaList.style.display = 'none';
        metaItems.innerHTML = '';
        return;
    }

    // Handle error state (Persistent fix for "n is not defined")
    if (lastAnalysisError) {
        metaList.classList.add('bg-red-900/10', 'border-red-500/50');
        metaHeader.classList.add('text-red-400');
        metaHeaderText.innerText = t('meta_detected'); // Fallback to detected header
        metaItems.innerHTML = `<li class="text-red-500 font-bold whitespace-normal">Error: ${lastAnalysisError}</li>`;
        metaList.style.display = 'block';
        return;
    }

    // Handle success states
    if (lastAnalysisResult.length > 0) {
        // Red State
        metaList.classList.add('bg-red-900/10', 'border-red-500/50');
        metaHeader.classList.add('text-red-400');
        metaHeaderText.innerText = t('meta_detected');
        metaItems.classList.add('text-red-200');

        let html = `<li class="text-red-400 font-bold mb-2 text-sm italic underline">• ${t('exif_detected_warning')}</li>`;
        lastAnalysisResult.forEach(tag => {
            html += `<li>• ${tag}: ${t('exif_found_suffix')}</li>`;
        });
        metaItems.innerHTML = html;
    } else {
        // Green State
        metaList.classList.add('bg-green-900/10', 'border-green-500/50');
        metaHeader.classList.add('text-green-400');
        metaHeaderText.innerText = t('scan_result');
        metaItems.classList.add('text-green-200');
        metaItems.innerHTML = `<li class="text-green-400 font-bold">• ${t('exif_safe_message')}</li>`;
    }

    metaList.style.display = 'block';

    // Sync Right Side
    if (resultHeader) resultHeader.innerText = t('scrubbed');
    if (resultMessage) resultMessage.innerText = t('no_meta');
}

function processCleanImage(sourceImg) {
    if (!scrubberI18n) return;
    const t = scrubberI18n.t.bind(scrubberI18n);

    if (!sourceImg.complete) return;

    const ctx = canvas.getContext('2d');
    canvas.width = sourceImg.naturalWidth;
    canvas.height = sourceImg.naturalHeight;
    ctx.drawImage(sourceImg, 0, 0);

    const cleanDataUrl = canvas.toDataURL('image/jpeg', 0.92);

    imgResult.src = cleanDataUrl;
    imgResult.classList.replace('hidden', 'opacity-100');
    resultPlaceholder?.classList.add('hidden');
    successBadge?.classList.remove('hidden');
    btnDownload.disabled = false;

    if (resultHeader) resultHeader.innerText = t('scrubbed');
    if (resultMessage) resultMessage.innerText = t('no_meta');

    btnDownload.onclick = () => {
        const a = document.createElement('a');
        a.href = cleanDataUrl;
        a.download = 'scrubbed-image.jpg';
        a.click();
    };
}

/**
 * Text Processing Logic
 */
function scrubText() {
    if (!scrubberI18n) return;
    let text = textInput.value;
    if (!text) {
        textOutput.value = '';
        return;
    }

    const patterns = [
        { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, repl: '***@***.com' },
        { regex: /(\d{2,4})-(\d{2,4})-(\d{3,4})/g, repl: '$1-****-$3' },
        { regex: /(\d{10,11})/g, repl: '***-****-***' },
        { regex: /\b(?:\d[ -]*?){13,16}\b/g, repl: '[CARD_NUMBER]' }
    ];

    patterns.forEach(p => {
        text = text.replace(p.regex, p.repl);
    });

    textOutput.value = text;
}

function handleCopyText() {
    if (!textOutput.value || !scrubberI18n) return;
    navigator.clipboard.writeText(textOutput.value);
    const original = btnCopyText.innerText;
    btnCopyText.innerText = scrubberI18n.t('copy_done');
    setTimeout(() => { btnCopyText.innerText = original; }, 1500);
}
