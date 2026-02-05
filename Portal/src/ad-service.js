import { db } from '../../Shared/firebase-init.js';
import { doc, getDoc, setDoc } from "firebase/firestore";

const ADS_CONFIG_PATH = 'config/ads';

/**
 * Fetch Ad Settings from Firestore
 */
export async function fetchAdSettings() {
    try {
        const docRef = doc(db, ADS_CONFIG_PATH);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            // Default fallback
            return {
                showAds: false,
                publisherId: '',
                googleAdsEnabled: false,
                raptiveEnabled: false,
                headerTag: '',
                footerTag: '',
                slots: [
                    { id: 'header', name: 'Header Responsive', type: 'Display', status: 'Active' },
                    { id: 'sidebar', name: 'Sidebar Sticky', type: 'Display', status: 'Paused' }
                ]
            };
        }
    } catch (error) {
        console.error("Error fetching ad settings:", error);
        throw error;
    }
}

/**
 * Save Ad Settings to Firestore
 */
export async function saveAdSettings(settings) {
    try {
        const docRef = doc(db, ADS_CONFIG_PATH);
        await setDoc(docRef, {
            ...settings,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        return true;
    } catch (error) {
        console.error("Error saving ad settings:", error);
        throw error;
    }
}
