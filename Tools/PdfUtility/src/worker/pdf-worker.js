import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

self.onmessage = async (e) => {
    const { type, payload, id } = e.data;

    try {
        let result;
        switch (type) {
            case 'MERGE':
                const mergedBytes = await mergePDFs(payload.files);
                result = { data: mergedBytes, mode: 'pdf' };
                break;
            case 'SPLIT':
                const splitRes = await splitPDF(payload.files[0], payload.options);
                result = splitRes; // { data, mode: 'pdf'|'zip' }
                break;
            case 'UNLOCK':
                const unlockedBytes = await unlockPDF(payload.files[0], payload.options.password);
                result = { data: unlockedBytes, mode: 'pdf' };
                break;
            default:
                throw new Error(`Unknown operation type: ${type}`);
        }
        self.postMessage({ type: 'SUCCESS', id, result });
    } catch (error) {
        self.postMessage({ type: 'ERROR', id, error: error.message });
    }
};

async function mergePDFs(fileBuffers) {
    const mergedPdf = await PDFDocument.create();

    for (const buffer of fileBuffers) {
        const pdf = await PDFDocument.load(buffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    return await mergedPdf.save();
}

async function splitPDF(buffer, options) {
    const pdf = await PDFDocument.load(buffer);
    const pageCount = pdf.getPageCount();

    if (options.splitMode === 'extract') {
        // Extract specific pages into one PDF
        const newPdf = await PDFDocument.create();
        const pageIndices = parseRange(options.range, pageCount);

        if (pageIndices.length === 0) throw new Error("有効なページ範囲を指定してください。");

        const copiedPages = await newPdf.copyPages(pdf, pageIndices);
        copiedPages.forEach(p => newPdf.addPage(p));

        const data = await newPdf.save();
        return { data, mode: 'pdf' };
    } else {
        // Burst: Split all pages into a ZIP
        const zip = new JSZip();

        for (let i = 0; i < pageCount; i++) {
            const newPdf = await PDFDocument.create();
            const [copiedPage] = await newPdf.copyPages(pdf, [i]);
            newPdf.addPage(copiedPage);
            const bytes = await newPdf.save();
            zip.file(`page_${i + 1}.pdf`, bytes);
        }

        const zipData = await zip.generateAsync({ type: 'blob' }); // Worker can return Blob too? JSZip output
        // pdf-lib returns Uint8Array usually. 
        // PostMessage can handle Blob or ArrayBuffer.
        // Let's convert Blob to ArrayBuffer to be consistent if needed, or just return Blob.
        // Main thread expects Blob-like data for download.
        return { data: zipData, mode: 'zip' };
    }
}

async function unlockPDF(buffer, password) {
    // Try to load with password
    // If successful, save without encryption
    try {
        const pdf = await PDFDocument.load(buffer, { password });
        return await pdf.save(); // Saves without encryption by default
    } catch (e) {
        throw new Error("パスワードが正しくないか、PDFを読み込めませんでした。");
    }
}

function parseRange(rangeStr, maxPages) {
    // Basic parser for "1, 3-5" => [0, 2, 3, 4]
    const indices = new Set();
    const parts = rangeStr.split(',');

    parts.forEach(part => {
        const p = part.trim();
        if (p.includes('-')) {
            const [start, end] = p.split('-').map(Number);
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = start; i <= end; i++) {
                    if (i >= 1 && i <= maxPages) indices.add(i - 1);
                }
            }
        } else {
            const num = Number(p);
            if (!isNaN(num) && num >= 1 && num <= maxPages) {
                indices.add(num - 1);
            }
        }
    });

    return Array.from(indices).sort((a, b) => a - b);
}
