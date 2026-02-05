import { initI18n, changeLanguage, t } from '../../../Shared/i18n.js';
import { loadToolConfig } from '../../../Shared/config-loader.js';
import { WelcomeModal } from '../../../Shared/welcome-modal.js';
import AdManager from '../../../Shared/ad-manager.js';
import SEOManager from '../../../Shared/seo-manager.js';
import { parse } from 'regjsparser';

const TOOL_ID = 'regex-sandbox';

const regexInput = document.getElementById('regex-input');
const flagsInput = document.getElementById('flags-input');
const testInput = document.getElementById('test-input');
const visualizer = document.getElementById('visualizer');
const highlightLayer = document.getElementById('highlight-layer');
const errorMessage = document.getElementById('error-message');
const matchCount = document.getElementById('match-count');

let currentRegex = null;

(async () => {
    // Init i18n
    const i18n = await initI18n(TOOL_ID);
    const t = i18n.t.bind(i18n);

    // Initial Config
    const currentLang = i18n.language || 'en';
    await loadToolConfig(TOOL_ID, currentLang);
    AdManager.init();
    SEOManager.init('RegexSandbox');

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
    regexInput.addEventListener('input', update);
    flagsInput.addEventListener('input', update);
    testInput.addEventListener('input', updateTest);
    testInput.addEventListener('scroll', syncScroll);

    // Initial call
    regexInput.value = '^([a-z0-9_\\.-]+)@([\\da-z\\.-]+)\\.([a-z\\.]{2,6})$'; // Email example
    testInput.value = `test@example.com
invalid.email
user.name+tag@mail.co.uk
@missinguser.com`;
    update();

    function update() {
        const pattern = regexInput.value;
        const flags = flagsInput.value;

        try {
            currentRegex = new RegExp(pattern, flags);
            regexInput.classList.remove('border-red-500');
            errorMessage.classList.add('hidden');

            // 1. Visualize Structure
            renderStructure(pattern, flags);

            // 2. Run Test
            updateTest();

        } catch (e) {
            currentRegex = null;
            regexInput.classList.add('border-red-500');
            errorMessage.textContent = e.message;
            errorMessage.classList.remove('hidden');
            visualizer.innerHTML = `<div class="text-red-400 font-mono text-sm p-4">${t('error_parse', { message: e.message })}</div>`;
            highlightLayer.innerHTML = testInput.value.replace(/</g, '&lt;'); // Raw text
        }
    }

    function updateTest() {
        if (!currentRegex) return;

        const text = testInput.value;
        let html = '';
        let lastIndex = 0;
        let match;
        let count = 0;

        // Reset lastIndex for global matches logic manually if needed, 
        // but matchAll or exec loop is better.
        // Note: If 'g' flag is not present, it only matches once. 
        // We should handle that visual logic.

        // Safety check for empty regex (matches everywhere)
        if (regexInput.value === '') {
            highlightLayer.innerHTML = escapeHtml(text);
            matchCount.innerText = t('match_count', { count: 0 });
            return;
        }

        // Use matchAll or loop
        // Note: allow overlap? Standard JS RegEx doesn't overlap-match in loop mostly.

        // We need to construct a new RegExp ensuring 'g' if we want to highlight all occurrences for visualization?
        // Actually typically regex tools force 'g' for highlighting separate matches. 
        // But let's respect user flags. If no 'g', only first match highlights.

        const isGlobal = currentRegex.flags.includes('g');
        const runnerRegex = new RegExp(currentRegex.source, currentRegex.flags + (isGlobal ? '' : 'g')); // Force g for highlighting loop? No, respect logic.
        // Wait, if user wants to check multiple lines, they usually want 'g'. 
        // But if they explicitly omit 'g', we should only highlight the first one. That's "Testing".

        let matches = [];
        try {
            if (isGlobal || text.match(currentRegex)) {
                // To get indices, we need execution loop
                let match;
                // Reset index
                currentRegex.lastIndex = 0;

                // If global, loop. If not, one off.
                if (isGlobal) {
                    while ((match = currentRegex.exec(text)) !== null) {
                        matches.push(match);
                        if (match.index === currentRegex.lastIndex) currentRegex.lastIndex++; // Avoid infinite loop on zero-width
                    }
                } else {
                    match = currentRegex.exec(text);
                    if (match) matches.push(match);
                }
            }
        } catch (e) {
            // limit loop etc
        }

        count = matches.length;
        matchCount.innerText = t('match_count', { count });

        // Build HTML
        lastIndex = 0;
        matches.forEach(m => {
            // Non-match text before
            html += escapeHtml(text.substring(lastIndex, m.index));

            // Match text with logic for capture groups?
            // Simple highlighting: <span class="bg-purple-500/50 ...">match</span>
            // Advanced: Nested groups? Hard to visualize in simple text area buffer.
            // Let's just highlight the full match for now.
            html += `<span class="bg-purple-600/60 rounded px-0.5 text-white shadow-sm border-b-2 border-purple-400">${escapeHtml(m[0])}</span>`;

            lastIndex = m.index + m[0].length;
        });

        // Remaining text
        html += escapeHtml(text.substring(lastIndex));

        // Handle trailing newlines for textarea sync
        if (text.endsWith('\n')) html += '<br>&nbsp;'; // visual hack

        highlightLayer.innerHTML = html;
    }

    function syncScroll() {
        highlightLayer.scrollTop = testInput.scrollTop;
        highlightLayer.scrollLeft = testInput.scrollLeft;
    }

    function escapeHtml(text) {
        return text.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function renderStructure(pattern, flags) {
        try {
            const ast = parse(pattern);
            // Simple Recursive Visitor to build HTML
            let html = '<div class="space-y-2 font-mono text-sm">';
            html += visit(ast);
            html += '</div>';
            visualizer.innerHTML = html;
        } catch (e) {
            // Since we already check via RegExp constructor, regjsparser might fail specifically on browser-only features?
            // Or syntax it doesn't support.
            visualizer.innerHTML = `<div class="text-yellow-500 p-4">このパターンの構造解析は利用できません。</div>`;
        }
    }

    function visit(node) {
        if (!node) return '';

        let label = '';
        let content = '';
        let colorClass = 'text-gray-300';
        let icon = '';

        switch (node.type) {
            case 'Disjunction':
                return `
                <div class="ml-4 border-l-2 border-gray-700 pl-2 my-2">
                    <div class="text-xs text-yellow-500 font-bold mb-1">OR (いずれかにマッチ)</div>
                    ${visit(node.left)}
                    <div class="border-t border-dashed border-gray-700 my-1 text-gray-600 text-xs">OR</div>
                    ${visit(node.right)}
                </div>`;
            case 'Alternative':
                return node.body.map(visit).join('');

            case 'Anchor':
                colorClass = 'text-yellow-400 font-bold';
                if (node.kind === 'start') { label = '行頭 / 文字列の先頭'; icon = '^'; }
                if (node.kind === 'end') { label = '行末 / 文字列の末尾'; icon = '$'; }
                if (node.kind === 'boundary') { label = '単語の境界'; icon = '\\b'; }
                break;

            case 'CharacterClass':
                colorClass = 'text-green-300';
                const neg = node.negative ? 'NOT ' : '';
                label = `${neg}いずれかの文字`;
                // content = node.body...
                icon = '[]';
                content = `<div class="ml-4 pl-2 border-l border-gray-700 text-xs text-gray-500">${node.body.map(visit).join('')}</div>`;
                return `<div class="bg-gray-900/40 p-1.5 rounded border border-gray-700/50 my-1">
                        <span class="${colorClass} mr-2">${icon}</span>
                        <span class="text-gray-400">${label}</span>
                        ${content}
                    </div>`;

            case 'Quantifier':
                const target = visit(node.body);
                let q = '';
                if (node.min === 0 && node.max === 1) q = '? (0 または 1)';
                else if (node.min === 0 && !node.max) q = '* (0 以上)';
                else if (node.min === 1 && !node.max) q = '+ (1 以上)';
                else q = `{${node.min}, ${node.max || ''}}`;

                return `<div class="bg-blue-900/20 p-2 rounded border border-blue-900/30 my-1">
                        <div class="text-xs text-blue-400 font-bold mb-1">繰り返し: ${q} ${!node.greedy ? '(最短一致)' : ''}</div>
                        ${target}
                    </div>`;

            case 'Group':
                // Capturing?
                const isCap = node.capturing;
                const title = isCap ? `グループ #${node.number || ''}` : '非キャプチャグループ';
                const border = isCap ? 'border-purple-500/30 bg-purple-900/10' : 'border-gray-600 border-dashed';
                return `<div class="${border} border p-2 rounded my-1 ml-2">
                        <div class="text-xs ${isCap ? 'text-purple-400' : 'text-gray-500'} font-bold mb-1">${title}</div>
                        ${node.body.map(visit).join('')}
                    </div>`;

            case 'Character':
                return `<span class="bg-gray-700 px-1 rounded text-white mx-0.5" title="Literal '${node.value}'">${node.value}</span>`;

            case 'value': // regjsparser specific for chars in range
                return `<span class="text-gray-400">${String.fromCharCode(node.codePoint)}</span>`;

            case 'CharacterClassRange':
                return `<div class="text-xs text-gray-400 ml-2">${t('range_label')}: ${visit(node.min)} - ${visit(node.max)}</div>`;

            case 'Dot':
                return `<span class="bg-gray-700 px-1 rounded text-yellow-200 mx-0.5 font-bold">${t('any_char')}</span>`;

            default:
                if (node.raw) return `<span class="text-gray-500">${node.raw}</span>`;
        }

        if (label) {
            return `<div class="flex items-center py-1">
                    <span class="w-6 text-center ${colorClass} font-mono font-bold mr-2">${icon}</span>
                    <span class="text-gray-300 text-sm">${label}</span>
                </div>`;
        }

        return '';
    }
    window.addEventListener('languageChanged', (e) => {
        loadToolConfig(TOOL_ID, e.detail.lng);
    });

})();
