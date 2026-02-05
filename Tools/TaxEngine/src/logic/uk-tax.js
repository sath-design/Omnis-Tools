/**
 * UK Tax Logic 2026/27 (Estimated)
 * Implements Income Tax and National Insurance (Class 2 & 4).
 */

export const UK_TAX_CONSTANTS_2026 = {
    PERSONAL_ALLOWANCE: 12570,

    // Income Tax Bands (England/Wales/NI)
    INCOME_TAX_BANDS: [
        { max: 50270, rate: 0.20 }, // Basic
        { max: 125140, rate: 0.40 }, // Higher
        { max: Infinity, rate: 0.45 } // Additional
    ],

    // National Insurance Class 4
    NI_CLASS4_LOWER_LIMIT: 12570,
    NI_CLASS4_UPPER_LIMIT: 50270,
    NI_CLASS4_RATE_MAIN: 0.06, // 6% (Reduced from 9% in recent years)
    NI_CLASS4_RATE_UPPER: 0.02, // 2%

    // Class 2 (Assuming abolished/voluntary for lower earners, simplified to 0 for profit > threshold)
    // Note: Class 2 is effectively being phased out for many, treating as included or 0 for simplicity unless specific rule applies.
    NI_CLASS2_RATE_WEEKLY: 0 // Simplification
};

/**
 * Calculates UK Tax & NI
 * @param {number} profit - Annual profit in GBP
 */
export function calculateTaxUK(profit) {
    // 1. National Insurance Class 4
    let niClass4 = 0;
    if (profit > UK_TAX_CONSTANTS_2026.NI_CLASS4_LOWER_LIMIT) {
        const mainBand = Math.min(profit, UK_TAX_CONSTANTS_2026.NI_CLASS4_UPPER_LIMIT) - UK_TAX_CONSTANTS_2026.NI_CLASS4_LOWER_LIMIT;
        niClass4 += mainBand * UK_TAX_CONSTANTS_2026.NI_CLASS4_RATE_MAIN;

        if (profit > UK_TAX_CONSTANTS_2026.NI_CLASS4_UPPER_LIMIT) {
            const upperBand = profit - UK_TAX_CONSTANTS_2026.NI_CLASS4_UPPER_LIMIT;
            niClass4 += upperBand * UK_TAX_CONSTANTS_2026.NI_CLASS4_RATE_UPPER;
        }
    }

    // 2. Income Tax
    const taxableIncome = Math.max(0, profit - UK_TAX_CONSTANTS_2026.PERSONAL_ALLOWANCE);
    let incomeTax = 0;
    let previousMax = 0; // Relative to taxable income start (0) or absolute? 
    // UK bands usually defined on gross income above PA?
    // Basic rate: £12,571 to £50,270 (Band width ~37,700)

    // Let's use taxable income logic (Income - PA)
    // Basic Band size: 37700
    // Higher Band starts after that

    // Band 1: 0 - 37700
    const band1Width = 37700;
    const band1Taxable = Math.min(taxableIncome, band1Width);
    incomeTax += band1Taxable * 0.20;

    // Band 2: 37700 - 112570 (Total 125140) => Width 87440?
    // Higher rate applies above 50,270 up to 125,140
    if (taxableIncome > band1Width) {
        const remaining = taxableIncome - band1Width;
        const band2Width = 125140 - 50270; // 74870
        const band2Taxable = Math.min(remaining, band2Width);
        incomeTax += band2Taxable * 0.40;

        // Band 3: Above 125140
        if (remaining > band2Width) {
            const band3Taxable = remaining - band2Width;
            incomeTax += band3Taxable * 0.45;
        }
    }

    return {
        niClass4: Math.floor(niClass4),
        incomeTax: Math.floor(incomeTax),
        total: Math.floor(niClass4 + incomeTax)
    };
}
