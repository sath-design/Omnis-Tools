/**
 * VideoWorkbench Main Entry Point
 */
import { initI18n, changeLanguage, updateUI } from '../../../Shared/i18n.js';
import { loadToolConfig } from '../../../Shared/config-loader.js';
import { WelcomeModal } from '../../../Shared/welcome-modal.js';
import AdManager from '../../../Shared/ad-manager.js';
import { VideoConverter } from './logic/encoder.js';

const TOOL_ID = 'video-workbench';

(async () => {
    try {
        console.log('[VideoWorkbench] Initializing...');
        const startBtn = document.getElementById('btn-start');
        // Init i18n
        const i18n = await initI18n(TOOL_ID);
        const t = i18n.t.bind(i18n);

        // Initial Config
        const currentLang = i18n.language || 'en';
        await loadToolConfig(TOOL_ID, currentLang);
        AdManager.init();
        SEOManager.init('VideoWorkbench');

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

        // UI Elements
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const progressContainer = document.getElementById('progress-container');
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        const resultContainer = document.getElementById('result-container');
        const reductionMsg = document.getElementById('reduction-msg');
        const btnDownload = document.getElementById('btn-download');
        const btnReset = document.getElementById('btn-reset');

        // Drag & Drop Handlers
        dropZone.addEventListener('click', () => fileInput.click());
        // ... (rest of drag events)
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-purple-500', 'bg-gray-800');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('border-purple-500', 'bg-gray-800');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-purple-500', 'bg-gray-800');
            if (e.dataTransfer.files.length) {
                handleFile(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                handleFile(e.target.files[0]);
            }
        });

        // Reset Handler
        btnReset.addEventListener('click', () => {
            resultContainer.classList.add('hidden');
            dropZone.classList.remove('hidden');
            fileInput.value = '';
        });

        function handleFile(file) {
            if (!file.type.startsWith('video/')) {
                alert(t('error_video_only'));
                return;
            }
            startConversion(file);
        }

        function startConversion(file) {
            dropZone.classList.add('hidden');
            progressContainer.classList.remove('hidden');
            progressBar.style.width = '0%';

            const quality = document.getElementById('opt-quality').value;
            const resolutionHeight = parseInt(document.getElementById('opt-resolution').value, 10);
            const bitrate = quality === 'high' ? 4000000 : (quality === 'low' ? 1000000 : 2000000);

            const converter = new VideoConverter(
                (progress) => {
                    progressBar.style.width = `${progress}%`;
                    progressText.innerText = `${progress}%`;
                },
                (result) => {
                    progressContainer.classList.add('hidden');
                    resultContainer.classList.remove('hidden');

                    // Mock reduction calculation (calculated from blob size now)
                    const originalSize = file.size;
                    const newSize = result.size;
                    const reduction = Math.round(((originalSize - newSize) / originalSize) * 100);

                    reductionMsg.textContent = t('size_reduction', { percent: reduction > 0 ? reduction : 0 });

                    btnDownload.href = result.url;
                    btnDownload.download = `compressed_${file.name}`;
                },
                (error) => {
                    progressContainer.classList.add('hidden');
                    dropZone.classList.remove('hidden');
                    alert(t('error_prefix') + error.message);
                    console.error(error);
                }
            );

            converter.start(file, { bitrate, height: resolutionHeight });
        }

        window.addEventListener('languageChanged', (e) => {
            loadToolConfig(TOOL_ID, e.detail.lng);
        });

    } catch (err) {
        console.error('[VideoWorkbench] Critical initialization error:', err);
    }
})();
