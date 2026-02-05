/** @type {import('vite').UserConfig} */
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    root: '.', // Serve from root to access Shared/ and Tools/
    build: {
        rollupOptions: {
            input: {
                portal: resolve(__dirname, 'Portal/index.html'),
                dashboard: resolve(__dirname, 'Portal/dashboard.html'),
                login: resolve(__dirname, 'Portal/login.html'),
                about: resolve(__dirname, 'Portal/about.html'),
                contact: resolve(__dirname, 'Portal/contact.html'),
                privacy: resolve(__dirname, 'Portal/privacy.html'),
                terms: resolve(__dirname, 'Portal/terms.html'),
                tax_engine: resolve(__dirname, 'Tools/TaxEngine/index.html'),
                video_workbench: resolve(__dirname, 'Tools/VideoWorkbench/index.html'),
                data_suite: resolve(__dirname, 'Tools/DataSuite/index.html'),
                pdf_utility: resolve(__dirname, 'Tools/PdfUtility/index.html'),
                privacy_scrubber: resolve(__dirname, 'Tools/PrivacyScrubber/index.html'),
                image_optimizer: resolve(__dirname, 'Tools/ImageOptimizer/index.html'),
                regex_sandbox: resolve(__dirname, 'Tools/RegexSandbox/index.html'),
                code_polisher: resolve(__dirname, 'Tools/CodePolisher/index.html'),
            },
        },
    },
    server: {
        open: '/Portal/index.html', // Open Portal by default
    }
});
