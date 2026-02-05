/**
 * Shared Ad Manager
 * Controls the visibility of ad placeholders across all tools.
 * Fetches configuration from Firestore for live management.
 */

import { db } from './firebase-init.js';
import { doc, getDoc, onSnapshot } from "firebase/firestore";

const AdManager = {
    settings: {
        showAds: false,
        googleAdsEnabled: false,
        publisherId: '',
        headerTag: '',
    },

    init() {
        // Listen for realtime updates from Firestore
        const docRef = doc(db, 'config', 'ads');
        onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                this.settings = docSnap.data();
                console.log("AdSense Settings Updated:", this.settings);
                this.applySettings();
            }
        }, (error) => {
            console.error("AdManager AdSense Sync Error:", error);
        });

        // initial execution
        this.observeDOM();
    },

    applySettings() {
        const { showAds, googleAdsEnabled, publisherId, headerTag } = this.settings;
        const adElements = document.querySelectorAll('.ad-skeleton');

        // 1. Visibility Control
        adElements.forEach(el => {
            if (showAds) {
                el.style.display = 'flex';
                el.classList.remove('hidden');
            } else {
                el.style.display = 'none';
                el.classList.add('hidden');
            }
        });

        // 2. Google AdSense Injection (Auto-Ads)
        if (showAds && googleAdsEnabled && publisherId) {
            this.injectGoogleAdSense(publisherId);
        }

        // 3. Raptive / Header Injection
        if (showAds && headerTag) {
            this.injectHeaderScript(headerTag);
        }
    },

    injectGoogleAdSense(pubId) {
        if (document.getElementById('scr-google-adsense')) return;
        const script = document.createElement('script');
        script.id = 'scr-google-adsense';
        script.async = true;
        // Google AdSense Auto Ads Tag
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${pubId}`;
        script.crossOrigin = 'anonymous';
        document.head.appendChild(script);
    },

    injectHeaderScript(tag) {
        if (document.getElementById('scr-header-ads')) return;
        // Simple injection of the string content. 
        const div = document.createElement('div');
        div.id = 'scr-header-ads';
        div.innerHTML = tag;
        const scripts = div.querySelectorAll('script');
        scripts.forEach(s => {
            const newScript = document.createElement('script');
            if (s.src) newScript.src = s.src;
            newScript.textContent = s.textContent;
            document.head.appendChild(newScript);
        });
    },

    observeDOM() {
        const observer = new MutationObserver(() => {
            this.applySettings();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
};

export default AdManager;
