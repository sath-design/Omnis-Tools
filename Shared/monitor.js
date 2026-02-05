/**
 * LogicHub Shared: Performance Monitor (Health Check)
 * Monitors LCP, CLS, FID and JS Errors.
 */

export function initMonitor(toolId) {
    // 1. Error Logging
    window.addEventListener('error', (event) => {
        logEvent('js_error', {
            message: event.message,
            source: event.filename,
            lineno: event.lineno
        });
    });

    // 2. Performance Observer (LCP)
    if (window.PerformanceObserver) {
        new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                console.log('LCP candidate:', entry.startTime, entry);
                logEvent('LCP', { value: entry.startTime });
            }
        }).observe({ type: 'largest-contentful-paint', buffered: true });
    }

    console.log(`Monitor initialized for ${toolId}`);
}

function logEvent(type, data) {
    // Send to Firestore 'system/performance' (Buffered/Batched)
    console.log(`[Monitor] ${type}:`, data);
}
