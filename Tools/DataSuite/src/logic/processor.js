/**
 * DataSuite Core Logic
 * - JSON Validator
 * - JSON <-> CSV Converter
 */

export class DataProcessor {
    constructor() { }

    /**
     * Validates JSON string.
     * @param {string} jsonString 
     * @returns {object} { isValid: boolean, error: string | null, data: object | null }
     */
    validateJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            return { isValid: true, error: null, data: data };
        } catch (e) {
            return { isValid: false, error: e.message, data: null };
        }
    }

    /**
     * Converts JSON Array to CSV string.
     * @param {Array} jsonData 
     * @returns {string} CSV content
     */
    jsonToCsv(jsonData) {
        // Auto-wrap single object
        if (!Array.isArray(jsonData) && typeof jsonData === 'object' && jsonData !== null) {
            jsonData = [jsonData];
        }

        if (!Array.isArray(jsonData) || jsonData.length === 0) {
            throw new Error("Input must be a non-empty JSON array or object.");
        }

        const headers = Object.keys(jsonData[0]);
        const csvRows = [];
        csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',')); // Quote headers too

        for (const row of jsonData) {
            const values = headers.map(header => {
                let val = row[header];
                if (val === null || val === undefined) {
                    val = '';
                } else if (typeof val === 'object') {
                    val = JSON.stringify(val);
                } else {
                    val = '' + val;
                }

                // Escape quotes by doubling them
                const escaped = val.replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }

        return csvRows.join('\n');
    }

    /**
     * Converts CSV string to JSON Array.
     * @param {string} csvString 
     * @returns {Array} JSON objects
     */
    csvToJson(csvString) {
        const lines = csvString.trim().split(/\r?\n/);
        if (lines.length < 2) throw new Error("CSV must have header and at least one row.");

        // Parse Headers (Simple split might fail if headers have commas, but rare. Using robust parser likely safer)
        const headers = this.parseCSVLine(lines[0]);
        const result = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const currentline = this.parseCSVLine(lines[i]);
            const obj = {};

            for (let j = 0; j < headers.length; j++) {
                let val = currentline[j] || '';
                // Try to restore JSON objects
                if ((val.startsWith('{') && val.endsWith('}')) || (val.startsWith('[') && val.endsWith(']'))) {
                    try {
                        val = JSON.parse(val);
                    } catch (e) {
                        // Keep as string if parse fails
                    }
                }
                obj[headers[j]] = val;
            }
            result.push(obj);
        }

        return result;
    }

    /**
     * Helper to parse a single CSV line respecting quotes
     */
    parseCSVLine(text) {
        const result = [];
        let cur = '';
        let inQuote = false;

        for (let i = 0; i < text.length; i++) {
            const c = text[i];

            if (inQuote) {
                if (c === '"') {
                    if (i + 1 < text.length && text[i + 1] === '"') {
                        // Escaped quote
                        cur += '"';
                        i++;
                    } else {
                        // End quote
                        inQuote = false;
                    }
                } else {
                    cur += c;
                }
            } else {
                if (c === '"') {
                    inQuote = true;
                } else if (c === ',') {
                    result.push(cur);
                    cur = '';
                } else {
                    cur += c;
                }
            }
        }
        result.push(cur);
        return result;
    }
}
