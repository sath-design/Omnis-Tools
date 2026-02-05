/**
 * Dashboard Data Service
 * Fetches metrics and settings from Firestore.
 */
import { db } from '../../Shared/firebase-init.js';
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";

export async function fetchOverallMetrics() {
    // Mock Data for Prototype (Replace with DB calls)
    return {
        revenue: 1250.00, // USD
        rpm: 4.50,
        pv: 45000,
        errors: 12
    };
}

export async function fetchToolMetrics(toolId) {
    // Mock Data
    const basePV = toolId === 'tax-engine' ? 20000 : (toolId === 'video-workbench' ? 15000 : 10000);
    return {
        id: toolId,
        pv: basePV,
        revenue: (basePV / 1000) * 4.5,
        performance: 98 // LightHouse Score
    };
}

export async function fetchToolConfig(toolId) {
    // Mock Config Fetch
    // In production: const snap = await getDoc(doc(db, "tools", toolId));
    return {
        seoTitle: `${toolId} - LogicHub Tool`,
        adTagHeader: `<!-- Header Tag for ${toolId} -->`,
        adTagFooter: `<!-- Footer Tag for ${toolId} -->`,
        adsEnabled: true
    };
}

export async function updateToolConfig(toolId, newConfig) {
    console.log(`Saving config for ${toolId}:`, newConfig);
    // In production: await updateDoc(doc(db, "tools", toolId), newConfig);
    // Simulate network delay
    await new Promise(r => setTimeout(r, 500));
    return true;
}
