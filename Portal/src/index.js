import { initI18n, changeLanguage, updateUI } from '../../Shared/i18n.js';
import { loadToolConfig } from '../../Shared/config-loader.js';

async function initPortal() {
    // Init i18n
    await initI18n('portal');

    // Language switchers are now handled by Shared/i18n.js automatically
    // but we can add Tool specific logic here if needed.
    window.addEventListener('languageChanged', (e) => {
        loadToolConfig('portal', e.detail.lng);
    });

    // Initial Load
    const currentLang = localStorage.getItem('i18nextLng') || 'en';
    await loadToolConfig('portal', currentLang);
}

document.addEventListener('DOMContentLoaded', initPortal);
