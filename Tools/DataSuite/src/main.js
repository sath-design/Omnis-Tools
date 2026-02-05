/**
 * DataSuite Main Entry Point
 */
import { initI18n, changeLanguage, updateUI } from '../../../Shared/i18n.js';
import { loadToolConfig } from '../../../Shared/config-loader.js';
import { WelcomeModal } from '../../../Shared/welcome-modal.js';
import AdManager from '../../../Shared/ad-manager.js';
import SEOManager from '../../../Shared/seo-manager.js';
import { DataProcessor } from './logic/processor.js';

const TOOL_ID = 'data-suite';

(async () => {
    console.log('[DataSuite] Initializing...');

    // Init i18n
    const i18n = await initI18n(TOOL_ID);
    const t = i18n.t.bind(i18n);

    // Initial Config
    const currentLang = i18n.language || 'en';
    await loadToolConfig(TOOL_ID, currentLang);
    AdManager.init();
    SEOManager.init('DataSuite');

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

    const processor = new DataProcessor();

    // UI Elements
    const editorInput = document.getElementById('editor-input');
    const editorOutput = document.getElementById('editor-output');
    const statusMsg = document.getElementById('status-msg');
    const inputStatus = document.getElementById('input-status');

    // Buttons
    document.getElementById('btn-validate').addEventListener('click', () => {
        const input = editorInput.value;
        const result = processor.validateJSON(input);

        if (result.isValid) {
            inputStatus.innerText = t('input_status_json_ok');
            inputStatus.className = "text-[10px] bg-[#313244] px-2 py-0.5 rounded text-green-400";

            if (Array.isArray(result.data)) {
                statusMsg.innerText = t('status_validate_success', { count: result.data.length });
            } else {
                statusMsg.innerText = t('status_validate_success_obj');
            }

            // Pretty print
            editorOutput.value = JSON.stringify(result.data, null, 4);
        } else {
            inputStatus.innerText = t('input_status_invalid_json');
            inputStatus.className = "text-[10px] bg-[#313244] px-2 py-0.5 rounded text-red-400";
            statusMsg.innerText = t('status_fail_prefix') + result.error;
            editorOutput.value = result.error; // Show error in output
        }
    });

    document.getElementById('btn-to-csv').addEventListener('click', () => {
        try {
            const input = editorInput.value;
            const result = processor.validateJSON(input);

            if (!result.isValid) throw new Error(t('status_fail_prefix') + t('input_status_invalid_json'));

            const csv = processor.jsonToCsv(result.data);
            editorOutput.value = csv;
            statusMsg.innerText = t('status_csv_success');
            inputStatus.innerText = t('input_status_done');
            inputStatus.className = "text-[10px] bg-[#313244] px-2 py-0.5 rounded text-teal-400";
        } catch (err) {
            statusMsg.innerText = err.message;
            inputStatus.innerText = t('input_status_error');
            inputStatus.className = "text-[10px] bg-[#313244] px-2 py-0.5 rounded text-red-400";
        }
    });

    document.getElementById('btn-to-json').addEventListener('click', () => {
        try {
            const input = editorInput.value;
            const json = processor.csvToJson(input);

            editorOutput.value = JSON.stringify(json, null, 4);
            statusMsg.innerText = t('status_json_success');
            inputStatus.innerText = t('input_status_done');
            inputStatus.className = "text-[10px] bg-[#313244] px-2 py-0.5 rounded text-teal-400";
        } catch (err) {
            statusMsg.innerText = t('status_fail_prefix') + err.message;
            editorOutput.value = err.message;
            inputStatus.innerText = t('input_status_error');
            inputStatus.className = "text-[10px] bg-[#313244] px-2 py-0.5 rounded text-red-400";
        }
    });

    document.getElementById('btn-copy').addEventListener('click', () => {
        navigator.clipboard.writeText(editorOutput.value).then(() => {
            const span = document.getElementById('btn-copy').querySelector('span');
            const originalText = span.textContent;
            span.textContent = t('copy_done');
            statusMsg.innerText = t('copy_done');
            setTimeout(() => {
                span.textContent = originalText;
                statusMsg.innerText = t('status_idle');
            }, 2000);
        });
    });

    window.addEventListener('languageChanged', (e) => {
        loadToolConfig(TOOL_ID, e.detail.lng);
    });

})();
