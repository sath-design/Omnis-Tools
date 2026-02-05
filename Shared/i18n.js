import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

/**
 * Omnis i18n Engine
 * Handles translation loading and UI updates.
 */
export async function initI18n(toolId = 'common') {
    const fetchJson = url => fetch(url).then(res => res.json()).catch(() => ({}));

    // Parallel loading to reduce latency
    const [enCommon, jpCommon, enTool, jpTool] = await Promise.all([
        fetchJson('/locales/en/common.json'),
        fetchJson('/locales/jp/common.json'),
        toolId !== 'common' ? fetchJson(`/locales/en/${toolId}.json`) : Promise.resolve({}),
        toolId !== 'common' ? fetchJson(`/locales/jp/${toolId}.json`) : Promise.resolve({})
    ]);

    await i18next
        .use(LanguageDetector)
        .init({
            fallbackLng: 'en',
            resources: {
                en: { translation: { ...enCommon, ...enTool } },
                jp: { translation: { ...jpCommon, ...jpTool } },
                ja: { translation: { ...jpCommon, ...jpTool } }
            },
            detection: {
                order: ['querystring', 'localStorage', 'navigator'],
                lookupQuerystring: 'lng',
                lookupLocalStorage: 'i18nextLng',
                caches: ['localStorage']
            }
        });

    updateUI();
    setupLanguageSwitchers();
    return i18next;
}

/**
 * Updates all elements with data-i18n attributes.
 */
export function updateUI() {
    const lng = i18next.language || 'en';
    const isJp = lng.startsWith('jp') || lng.startsWith('ja');

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const value = el.getAttribute('data-i18n');
        if (!value) return;

        const parts = value.split(';');

        parts.forEach(part => {
            const attrMatch = part.match(/^\[(.*)\](.*)$/);
            if (attrMatch) {
                const attr = attrMatch[1];
                const key = attrMatch[2];
                el.setAttribute(attr, i18next.t(key));
            } else {
                el.textContent = i18next.t(part);
            }
        });
    });

    // Update Language Switcher Active States
    const activeClass = 'bg-gray-700';
    const textActiveClass = 'text-white';
    const inactiveClass = 'text-gray-400';

    const btnEn = document.getElementById('lang-en');
    const btnJp = document.getElementById('lang-jp');

    if (btnEn && btnJp) {
        if (isJp) {
            btnJp.classList.add(activeClass, textActiveClass);
            btnJp.classList.remove(inactiveClass);
            btnEn.classList.remove(activeClass, textActiveClass);
            btnEn.classList.add(inactiveClass);
        } else {
            btnEn.classList.add(activeClass, textActiveClass);
            btnEn.classList.remove(inactiveClass);
            btnJp.classList.remove(activeClass, textActiveClass);
            btnJp.classList.add(inactiveClass);
        }
    }

    // Release the UI
    document.body.classList.remove('i18n-loading');
    document.body.classList.add('i18n-initialized');

    updateMetaTags();
}

/**
 * Updates SEO meta tags based on current language
 */
function updateMetaTags() {
    // Title
    const title = i18next.t('meta_title');
    if (title && title !== 'meta_title') document.title = title;

    // Description
    const desc = i18next.t('meta_description');
    if (desc && desc !== 'meta_description') {
        document.querySelector('meta[name="description"]')?.setAttribute('content', desc);
    }

    // Keywords
    const keywords = i18next.t('meta_keywords');
    if (keywords && keywords !== 'meta_keywords') {
        document.querySelector('meta[name="keywords"]')?.setAttribute('content', keywords);
    }

    // OGP
    const ogTitle = i18next.t('meta_og_title');
    if (ogTitle && ogTitle !== 'meta_og_title') {
        document.querySelector('meta[property="og:title"]')?.setAttribute('content', ogTitle);
    }

    const ogDesc = i18next.t('meta_og_description');
    if (ogDesc && ogDesc !== 'meta_og_description') {
        document.querySelector('meta[property="og:description"]')?.setAttribute('content', ogDesc);
    }
}

/**
 * Automatic listener setup for standard lang buttons
 */
export function setupLanguageSwitchers() {
    const btnEn = document.getElementById('lang-en');
    const btnJp = document.getElementById('lang-jp');

    if (btnEn) {
        btnEn.removeEventListener('click', handleEnClick);
        btnEn.addEventListener('click', handleEnClick);
    }
    if (btnJp) {
        btnJp.removeEventListener('click', handleJpClick);
        btnJp.addEventListener('click', handleJpClick);
    }
}

function handleEnClick() { changeLanguage('en'); }
function handleJpClick() { changeLanguage('jp'); }

export const t = (key, options) => i18next.t(key, options);

export function changeLanguage(lng) {
    i18next.changeLanguage(lng, () => {
        updateUI();
        localStorage.setItem('i18nextLng', lng);
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lng } }));
    });
}
