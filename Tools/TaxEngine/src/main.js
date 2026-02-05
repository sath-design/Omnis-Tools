/**
 * TaxEngine Main Entry Point
 */
// import '../assets/style.css';
import { loadToolConfig } from '../../../Shared/config-loader.js';
import { initMonitor } from '../../../Shared/monitor.js';

import { WelcomeModal } from '../../../Shared/welcome-modal.js';
import { initI18n, changeLanguage, updateUI } from '../../../Shared/i18n.js';
import { calculateIncomeTaxJP, calculateConsumptionTaxJP, JP_TAX_CONSTANTS_2026 } from './logic/jp-tax.js';
import { calculateIncomeTaxUS, calculateSelfEmploymentTaxUS } from './logic/us-tax.js';
import { calculateTaxUK } from './logic/uk-tax.js';
import AdManager from '../../../Shared/ad-manager.js';
import SEOManager from '../../../Shared/seo-manager.js';

const TOOL_ID = 'tax-engine';

(async () => {
    try {
        console.log('[TaxEngine] Initializing...');
        // 1. Init Infra & i18n

        const i18n = await initI18n(TOOL_ID);
        const t = i18n.t.bind(i18n);

        initMonitor(TOOL_ID);

        const currentLang = i18n.language || 'en';
        await loadToolConfig(TOOL_ID, currentLang);
        AdManager.init();
        SEOManager.init('TaxEngine');

        // Welcome Modal (localized)
        try {
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
        } catch (e) {
            console.warn('[TaxEngine] WelcomeModal failed to init:', e);
        }

        // 2. UI Elements
        const inputSales = document.getElementById('input-sales');
        const inputExpenses = document.getElementById('input-expenses');
        const checkInvoice = document.getElementById('check-invoice');
        const check2wari = document.getElementById('check-2wari');
        const invoiceOptions = document.getElementById('invoice-options');
        const countryTabs = document.querySelectorAll('.country-tab');

        // Results
        const valNet = document.getElementById('val-net-income');
        const valTax1 = document.getElementById('val-income-tax');
        const valTax2 = document.getElementById('val-consumption-tax');
        const valSurtax = document.getElementById('val-surtax');
        const lblTax1 = document.getElementById('lbl-tax1');
        const lblTax2 = document.getElementById('lbl-tax2');

        let currentCountry = 'us';

        const formatters = {
            jp: new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }),
            us: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
            uk: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
        };

        function updateDynamicLabels() {
            console.log('[TaxEngine] Updating dynamic labels for:', currentCountry);
            // Labels
            if (currentCountry === 'jp') {
                if (lblTax1) lblTax1.textContent = t('tax_label_income_jp');
                if (lblTax2) lblTax2.textContent = t('tax_label_consumption_jp');
            } else if (currentCountry === 'us') {
                if (lblTax1) lblTax1.textContent = t('tax_label_federal_us');
                if (lblTax2) lblTax2.textContent = t('tax_label_se_us');
            } else if (currentCountry === 'uk') {
                if (lblTax1) lblTax1.textContent = t('tax_label_income_uk');
                if (lblTax2) lblTax2.textContent = t('tax_label_ni_uk');
            }

            // Currency Symbols in Inputs
            const sym = currentCountry === 'jp' ? '¥' : (currentCountry === 'us' ? '$' : '£');
            const symSales = document.getElementById('cur-symbol-sales');
            const symExpenses = document.getElementById('cur-symbol-expenses');
            if (symSales) symSales.innerText = sym;
            if (symExpenses) symExpenses.innerText = sym;
        }

        // 3. Tab Switching
        countryTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                countryTabs.forEach(t => {
                    t.classList.remove('bg-blue-600', 'text-white', 'shadow-sm');
                    t.classList.add('text-gray-400', 'hover:text-white', 'hover:bg-gray-700');
                });
                e.currentTarget.classList.add('bg-blue-600', 'text-white', 'shadow-sm');
                e.currentTarget.classList.remove('text-gray-400', 'hover:text-white', 'hover:bg-gray-700');

                currentCountry = e.currentTarget.getAttribute('data-country');
                document.querySelectorAll('.country-options').forEach(el => el.classList.add('hidden'));
                const optionsEl = document.getElementById(`options-${currentCountry}`);
                if (optionsEl) optionsEl.classList.remove('hidden');

                console.log(`[TaxEngine] Tab clicked: ${currentCountry}`);
                updateDynamicLabels();
                calculate();
            });
        });

        // 4. Toggle Invoice Options
        if (checkInvoice && invoiceOptions) {
            checkInvoice.addEventListener('change', (e) => {
                if (e.target.checked) invoiceOptions.classList.remove('hidden');
                else invoiceOptions.classList.add('hidden');
            });
        }

        // 5. Calculate Action
        function calculate() {
            if (!inputSales) {
                console.error('[TaxEngine] input-sales element not found!');
                return;
            }
            const sales = inputSales.valueAsNumber || 0;
            const expenses = inputExpenses?.valueAsNumber || 0;

            console.log(`[TaxEngine] Calculation trigger - Country: ${currentCountry}, Sales: ${sales}, Expenses: ${expenses}`);

            if (sales === 0) {
                if (valNet) valNet.innerText = '-';
                if (valTax1) valTax1.innerText = '-';
                if (valTax2) valTax2.innerText = '-';
                if (valSurtax) valSurtax.innerText = '-';
                return;
            }

            const fmt = formatters[currentCountry] || formatters['jp'];
            let netIncome = 0, tax1 = 0, tax2 = 0, surtax = 0;

            try {
                if (currentCountry === 'jp') {
                    const isInvoice = checkInvoice?.checked || false;
                    const is2wari = check2wari?.checked || false;
                    const cTax = calculateConsumptionTaxJP(sales, isInvoice, is2wari);
                    const effectiveSales = sales - cTax;
                    const profit = Math.max(0, effectiveSales - expenses);
                    const taxableIncome = Math.max(0, profit - JP_TAX_CONSTANTS_2026.BASIC_DEDUCTION);
                    const iTaxRes = calculateIncomeTaxJP(taxableIncome);
                    tax1 = iTaxRes.total;
                    tax2 = cTax;
                    surtax = (iTaxRes.reconstructionTax || 0) + (iTaxRes.surtax || 0);
                    netIncome = profit - tax1;
                } else if (currentCountry === 'us') {
                    const profit = Math.max(0, sales - expenses);
                    const seTax = calculateSelfEmploymentTaxUS(profit);
                    const iTax = calculateIncomeTaxUS(profit, seTax);
                    tax1 = iTax;
                    tax2 = seTax;
                    netIncome = profit - (iTax + seTax);
                } else if (currentCountry === 'uk') {
                    const profit = Math.max(0, sales - expenses);
                    const res = calculateTaxUK(profit);
                    tax1 = res.incomeTax;
                    tax2 = res.niClass4;
                    netIncome = profit - res.total;
                }

                if (valNet) valNet.innerText = fmt.format(netIncome);
                if (valTax1) valTax1.innerText = fmt.format(tax1);
                if (valTax2) valTax2.innerText = fmt.format(tax2);
                if (valSurtax) valSurtax.innerText = currentCountry === 'jp' ? fmt.format(surtax) : '-';

                const resultCard = document.getElementById('result-card');
                if (resultCard) {
                    resultCard.classList.remove('animate-pulse');
                    void resultCard.offsetWidth;
                    resultCard.classList.add('animate-pulse');
                    setTimeout(() => resultCard.classList.remove('animate-pulse'), 500);
                }

            } catch (err) {
                console.error('[TaxEngine] Error during calculation:', err);
                alert(t('calc_error') + ": " + err.message);
            }
        }

        const btnCalc = document.getElementById('btn-calculate');
        if (btnCalc) {
            btnCalc.addEventListener('click', calculate);
        } else {
            console.error('[TaxEngine] btn-calculate NOT FOUND');
        }

        // Listen for language changes
        window.addEventListener('languageChanged', (e) => {
            console.log('[TaxEngine] languageChanged event received:', e.detail.lng);
            loadToolConfig(TOOL_ID, e.detail.lng);
            updateUI();
            updateDynamicLabels();
            calculate();
        });

        // Initial update
        updateDynamicLabels();
        console.log('[TaxEngine] Initialization complete.');

    } catch (criticalError) {
        console.error('[TaxEngine] CRITICAL INITIALIZATION ERROR:', criticalError);
    }
})();
