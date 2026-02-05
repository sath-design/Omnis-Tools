/**
 * US Tax Logic 2026 (Estimated)
 * Implements Federal Income Tax and Self-Employment Tax.
 */

export const US_TAX_CONSTANTS_2026 = {
    // 2026 Projected Single Filer Brackets (Post-TCJA expiration scenario assumed or inflation adjusted)
    // Simplified for tool demonstration
    INCOME_TAX_BRACKETS: [
        { max: 11925, rate: 0.10 },
        { max: 48475, rate: 0.12 },
        { max: 103350, rate: 0.22 },
        { max: 197300, rate: 0.24 },
        { max: 250525, rate: 0.32 },
        { max: 626350, rate: 0.35 },
        { max: Infinity, rate: 0.37 }
    ],
    STANDARD_DEDUCTION: 15000, // Estimated for Single 2026

    // Self-Employment Tax
    SE_TAX_RATE_SS: 0.124, // Social Security
    SE_TAX_RATE_MEDICARE: 0.029, // Medicare
    SE_TAX_CAP_SS: 176100, // Wage base limit est 2026
    SE_TAX_DEDUCTION_FACTOR: 0.9235 // 7.65% deduction for SE tax calculation base
};

/**
 * Calculates US Self-Employment Tax
 * @param {number} netProfit - Net earnings from self-employment
 */
export function calculateSelfEmploymentTaxUS(netProfit) {
    // Net earnings from self-employment (profit * 92.35%)
    const netEarnings = netProfit * US_TAX_CONSTANTS_2026.SE_TAX_DEDUCTION_FACTOR;

    if (netEarnings < 400) return 0;

    // Social Security (capped)
    const ssTaxable = Math.min(netEarnings, US_TAX_CONSTANTS_2026.SE_TAX_CAP_SS);
    const ssTax = ssTaxable * US_TAX_CONSTANTS_2026.SE_TAX_RATE_SS;

    // Medicare (no cap)
    const medicareTax = netEarnings * US_TAX_CONSTANTS_2026.SE_TAX_RATE_MEDICARE;

    return Math.floor(ssTax + medicareTax);
}

/**
 * Calculates US Federal Income Tax
 * @param {number} netProfit 
 * @param {number} seTax (Deductible portion: 50% of SE tax)
 */
export function calculateIncomeTaxUS(netProfit, seTax) {
    // AGI Calculation: Net Profit - 50% SE Tax Deductible
    const agi = netProfit - (seTax * 0.5);

    // Taxable Income: AGI - Standard Deduction
    const taxableIncome = Math.max(0, agi - US_TAX_CONSTANTS_2026.STANDARD_DEDUCTION);

    let tax = 0;
    let previousMax = 0;

    for (const bracket of US_TAX_CONSTANTS_2026.INCOME_TAX_BRACKETS) {
        if (taxableIncome > previousMax) {
            const taxableAmount = Math.min(taxableIncome, bracket.max) - previousMax;
            tax += taxableAmount * bracket.rate;
            previousMax = bracket.max;
        } else {
            break;
        }
    }

    return Math.floor(tax);
}
