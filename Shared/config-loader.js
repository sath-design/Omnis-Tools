/**
 * Omnis Shared: Config Loader
 * Loads Ad settings and SEO metadata from Firestore (or local cache).
 * Dynamically updates DOM elements based on language.
 */

import { db } from './firebase-init.js';
// Note: In production, use Firebase SDK properly.
// import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function loadToolConfig(toolId, lang = 'en') {
    try {
        console.log(`Loading config for: ${toolId} (${lang})`);

        // MOCK DATA (In production, this comes from Firestore)
        const mockData = {
            ads: {
                enabled: true,
                headerTag: '<div class="flex items-center justify-center h-full text-gray-600">Advertisement</div>',
                footerTag: '<div class="flex items-center justify-center h-full text-gray-600">Advertisement</div>'
            },
            seo: {
                en: {
                    title: `${toolId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} - Omnis`,
                    description: `Professional and secure ${toolId.replace('-', ' ')} tool for designers and developers.`
                },
                jp: {
                    title: `${toolId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} - Omnis (オムニス)`,
                    description: `デザイナー・開発者のための、安全で高速な ${toolId} ツール。`
                }
            }
        };

        applyConfig(mockData, lang);

    } catch (error) {
        console.error("Config Loading Failed:", error);
    }
}

function applyConfig(config, lang) {
    const seo = config.seo[lang] || config.seo['en'];

    // 1. Apply SEO
    if (seo) {
        document.title = seo.title || document.title;
        let metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.content = seo.description || "";

        // OGP
        let ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.content = seo.title;

        let ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.content = seo.description;
    }

    // 2. Apply Ads (Skeletons are already in HTML, we just fill content)
    if (config.ads && config.ads.enabled) {
        const headerSlot = document.getElementById('raptive-header-slot');
        if (headerSlot) {
            headerSlot.innerHTML = config.ads.headerTag;
            headerSlot.classList.remove('ad-skeleton'); // Remove pulse once loaded
        }

        const footerSlot = document.getElementById('raptive-footer-slot');
        if (footerSlot) {
            footerSlot.innerHTML = config.ads.footerTag;
            footerSlot.classList.remove('ad-skeleton');
        }
    }
}
