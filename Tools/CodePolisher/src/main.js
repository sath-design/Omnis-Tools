import { initI18n, changeLanguage, updateUI } from '../../../Shared/i18n.js';
import { loadToolConfig } from '../../../Shared/config-loader.js';
import { WelcomeModal } from '../../../Shared/welcome-modal.js';
import AdManager from '../../../Shared/ad-manager.js';
import SEOManager from '../../../Shared/seo-manager.js';
import { format } from "prettier/standalone";
import * as prettierPluginBabel from "prettier/plugins/babel";
import * as prettierPluginEstree from "prettier/plugins/estree";
import * as prettierPluginHtml from "prettier/plugins/html";
import * as prettierPluginPostcss from "prettier/plugins/postcss";
import { format as formatSql } from 'sql-formatter';

const TOOL_ID = 'code-polisher';

// Elements
const langSelect = document.getElementById('lang-select');
const indentSelect = document.getElementById('indent-select');
const inputCode = document.getElementById('input-code');
const outputCode = document.getElementById('output-code');
const btnPaste = document.getElementById('btn-paste');
const btnCopy = document.getElementById('btn-copy');
const scanStatus = document.getElementById('scan-status');
const secretWarning = document.getElementById('secret-warning');

// State
let isProcessing = false;

(async () => {
    // Init i18n
    const i18n = await initI18n(TOOL_ID);
    const t = i18n.t.bind(i18n);

    // Initial Config
    const currentLang = i18n.language || 'en';
    await loadToolConfig(TOOL_ID, currentLang);
    AdManager.init();
    SEOManager.init('CodePolisher');

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

    // Init
    inputCode.addEventListener('input', debounce(process, 300));
    langSelect.addEventListener('change', process);
    indentSelect.addEventListener('change', process);

    btnPaste.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            inputCode.value = text;
            process();
        } catch (e) {
            // Fallback or permission denial
            inputCode.focus();
        }
    });

    btnCopy.addEventListener('click', () => {
        if (!outputCode.value) return;
        navigator.clipboard.writeText(outputCode.value);
        const originalText = btnCopy.innerHTML;
        const span = btnCopy.querySelector('span');
        if (span) {
            span.textContent = t('copy_done');
        } else {
            btnCopy.textContent = t('copy_done');
        }
        btnCopy.classList.add('bg-green-600', 'hover:bg-green-500');
        btnCopy.classList.remove('bg-cyan-600', 'hover:bg-cyan-500');
        setTimeout(() => {
            btnCopy.innerHTML = originalText;
            btnCopy.classList.remove('bg-green-600', 'hover:bg-green-500');
            btnCopy.classList.add('bg-cyan-600', 'hover:bg-cyan-500');
        }, 1500);
    });

    async function process() {
        if (isProcessing) return;
        isProcessing = true;

        const code = inputCode.value;
        const lang = langSelect.value;
        const indent = indentSelect.value;

        // 1. Scan for secrets
        scanSecrets(code);

        if (!code.trim()) {
            outputCode.value = '';
            isProcessing = false;
            return;
        }

        // 2. Format
        try {
            let formatted = '';
            const options = {
                parser: getParser(lang),
                plugins: [prettierPluginBabel, prettierPluginEstree, prettierPluginHtml, prettierPluginPostcss],
                tabWidth: indent === 'tab' ? 2 : parseInt(indent),
                useTabs: indent === 'tab',
                printWidth: 80,
            };
            if (lang === 'sql') {
                formatted = formatSql(code, {
                    language: 'sql',
                    tabWidth: indent === 'tab' ? 2 : parseInt(indent),
                });
            } else {
                formatted = await format(code, options);
            }

            outputCode.value = formatted;
            outputCode.classList.remove('text-red-400');
            outputCode.classList.add('text-cyan-100');
        } catch (e) {
            outputCode.value = `// 解析エラー:\n${e.message}`;
            outputCode.classList.remove('text-cyan-100');
            outputCode.classList.add('text-red-400');
        }

        isProcessing = false;
    }

    function getParser(lang) {
        if (lang === 'javascript') return 'babel';
        if (lang === 'json') return 'json';
        if (lang === 'html') return 'html';
        if (lang === 'css') return 'css';
        return 'babel';
    }

    function scanSecrets(text) {
        const suspiciousPatterns = [
            /(api_?key|access_?token|secret_?key|password|passwd|pwd)['":\s]*=?['"][a-zA-Z0-9_\-\.]{16,}['"]/i,
            /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/,
            /AKIA[0-9A-Z]{16}/,
            /[a-zA-Z0-9]{32,}/,
        ];

        const found = suspiciousPatterns.some(p => p.test(text));

        if (found) {
            secretWarning.classList.remove('hidden');
            scanStatus.classList.remove('hidden');
            scanStatus.innerHTML = `<span class="text-red-400 flex items-center gap-1 font-bold">⚠ ${t('scan_status_found')}</span>`;
        } else {
            secretWarning.classList.add('hidden');
            if (text.length > 0) {
                scanStatus.classList.remove('hidden');
                scanStatus.innerHTML = `<span class="text-green-500 flex items-center gap-1">✔ ${t('scan_status_safe')}</span>`;
            } else {
                scanStatus.classList.add('hidden');
            }
        }
    }

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    window.addEventListener('languageChanged', (e) => {
        loadToolConfig(TOOL_ID, e.detail.lng);
    });

})();
