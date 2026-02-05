/**
 * JP Tax Logic 2026
 * Implements Income Tax (progressive rates) and Consumption Tax (Invoice system).
 */

export const JP_TAX_CONSTANTS_2026 = {
    INCOME_TAX_BRACKETS: [
        { max: 1950000, rate: 0.05, deduction: 0 },
        { max: 3300000, rate: 0.10, deduction: 97500 },
        { max: 6950000, rate: 0.20, deduction: 427500 },
        { max: 9000000, rate: 0.23, deduction: 636000 },
        { max: 18000000, rate: 0.33, deduction: 1536000 },
        { max: 40000000, rate: 0.40, deduction: 2796000 },
        { max: Infinity, rate: 0.45, deduction: 4796000 }
    ],
    // 2026 Special Surtax (Defense Tax Simulation +1%)
    DEFENSE_SURTAX_RATE: 0.01,
    // Basic Deduction (Standard + 2025 adjustment)
    BASIC_DEDUCTION: 480000 + 17800,
    // Consumption Tax Rate
    CONSUMPTION_TAX_RATE: 0.10,
    // Invoice 20% Special Exception (2-wari tokurei -> 30% expected transition simulation)
    // Note: User spec mentions "30% tokurei transition"
    INVOICE_EXEMPTION_RATE: 0.20 // Keeping 20% for now unless spec explicitly defines the date
};

/**
 * Calculates Income Tax based on taxable income.
 * @param {number} taxableIncome 
 * @returns {object} { baseTax, surtax, totalIncomeTax }
 */
export function calculateIncomeTaxJP(taxableIncome) {
    let tax = 0;
    for (const bracket of JP_TAX_CONSTANTS_2026.INCOME_TAX_BRACKETS) {
        if (taxableIncome <= bracket.max) {
            tax = (taxableIncome * bracket.rate) - bracket.deduction;
            break;
        }
    }

    // Ensure tax is not negative
    const baseTax = Math.max(0, Math.floor(tax));

    // Reconstrution Special Income Tax (2.1%)
    const reconstructionTax = Math.floor(baseTax * 0.021);

    // Defense Surtax (Simulation)
    const surtax = Math.floor(baseTax * JP_TAX_CONSTANTS_2026.DEFENSE_SURTAX_RATE);

    return {
        baseTax,
        reconstructionTax,
        surtax,
        total: baseTax + reconstructionTax + surtax
    };
}

/**
 * Calculates Consumption Tax with Invoice System considerations.
 * @param {number} taxableSales (Tax included)
 * @param {boolean} isInvoiceRegistered
 * @param {boolean} use20PercentRule (2-wari tokurei)
 */
export function calculateConsumptionTaxJP(taxableSales, isInvoiceRegistered, use20PercentRule = false) {
    if (!isInvoiceRegistered) return 0; // Tax Exempt Business

    const taxAmount = Math.floor(taxableSales * JP_TAX_CONSTANTS_2026.CONSUMPTION_TAX_RATE / (1 + JP_TAX_CONSTANTS_2026.CONSUMPTION_TAX_RATE));

    if (use20PercentRule) {
        // Pay only 20% of the sales tax received
        return Math.floor(taxAmount * 0.20);
    }

    // General taxation (Assuming simplified calculation for this tool unless expense data provided)
    // TODO: Implement expense deduction logic
    return taxAmount;
}
