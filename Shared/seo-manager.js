/**
 * Global SEO & Metadata Manager
 * Handles dynamic content injection for long-tail SEO and Schema.org snippets.
 */

const SEOManager = {
    // Keyword-rich technical documentation for each tool
    docs: {
        'TaxEngine': {
            title: 'Freelance Tax Calculator 2026 & US Mortgage Amortization',
            content: `
                <p>Omnis TaxEngine provides a deterministic, 100% client-side calculation for global freelancers. For US users, it supports <strong>federal income tax</strong> and <strong>self-employment tax</strong> estimation based on 2024-2025 tax brackets. Our <strong>compound interest calculator</strong> allows for monthly deposits, helping you plan for long-term wealth.</p>
                <p>Whether you are looking for a <strong>US mortgage amortization schedule</strong> or a <strong>Japan invoice system simulator</strong>, TaxEngine processes everything locally. No personal financial data ever reaches our servers, ensuring GDPR and CCPA compliance by design.</p>
            `,
            schema: {
                "@type": "HowTo",
                "name": "How to calculate freelance taxes locally",
                "step": [
                    { "@type": "HowToStep", "text": "Select your country (US, UK, or Japan)." },
                    { "@type": "HowToStep", "text": "Enter your annual sales and business expenses." },
                    { "@type": "HowToStep", "text": "View instant net income estimates and tax breakdowns." }
                ]
            }
        },
        'VideoWorkbench': {
            title: 'Compress Video for Discord 25MB & Local WebM to MP4',
            content: `
                <p>Struggling with the <strong>Discord 25MB file limit</strong>? VideoWorkbench is a high-performance <strong>local video compressor</strong> that uses the WebCodecs API. You can <strong>convert WebM to MP4 locally</strong> or resize 4K footage to 1080p without quality loss. All processing happens in your browser's memory, which is significantly faster than cloud-based tools and 100% private.</p>
                <p>This tool is ideal for creators who need to <strong>optimize video for web performance</strong> or anonymize clips by stripping metadata before sharing.</p>
            `,
            schema: {
                "@type": "MediaObject",
                "contentUrl": "https://omnis-tools.com/Tools/VideoWorkbench/",
                "encodingFormat": "video/mp4",
                "description": "Browser-based local video compressor and converter."
            }
        },
        'DataSuite': {
            title: 'Convert JSON to Excel Privacy-First & Clean CSV Online',
            content: `
                <p>DataSuite is a professional-grade <strong>JSON to Excel converter</strong> designed for sensitive data. Unlike other online converters, we do not require you to upload your files. Your data remains in the sandbox. Our engine can <strong>clean CSV online no upload</strong>, handling massive files through browser-based stream processing.</p>
                <p>Featuring a VS Code-style editor, you can validate complex nested JSON structures and export them to structured formats instantly.</p>
            `
        },
        'PdfUtility': {
            title: 'Merge PDF in Browser Encrypted & Remove PDF Password Locally',
            content: `
                <p>Omnis PdfUtility allows you to <strong>merge PDF in browser encrypted</strong> using industry-standard libraries. Need to <strong>remove PDF password locally</strong>? Our tool processes the decryption keys only on your device. It is a secure alternative to cloud-based PDF managers, perfect for legal and financial documents.</p>
            `
        },
        'PrivacyScrubber': {
            title: 'Delete EXIF from JPG/PNG & Anonymize Text for GDPR',
            content: `
                <p><strong>Delete EXIF from JPG/PNG without cloud</strong> processing. PrivacyScrubber uses selective canvas re-rendering to strip all GPS and camera metadata. You can also <strong>anonymize text for GDPR compliance</strong> by detecting and masking PII (Personally Identifiable Information) like emails and phone numbers in real-time.</p>
            `
        },
        'ImageOptimizer': {
            title: 'PNG to WebP 100 Quality Browser-Side & Optimize SVG',
            content: `
                <p>Upgrade your site speed by converting <strong>PNG to WebP with 100 quality</strong>. Omnis ImageOptimizer is a batch processor that works entirely on your GPU/CPU locally. <strong>Optimize SVG for web performance</strong> by stripping unnecessary XML tags and comments, ensuring faster load times for your global audience.</p>
            `
        },
        'RegexSandbox': {
            title: 'Regex Tester for JavaScript with Visual Capture Groups',
            content: `
                <p>The ultimate <strong>Regex tester for JavaScript</strong>. Stop guessing how your AI-generated patterns work. Our <strong>visual capture groups</strong> breakdown helps you understand complex recursive patterns. It is an essential tool for developers who prioritize code security and validation.</p>
            `
        }
    },

    init(toolId) {
        this.toolId = toolId;
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.renderSEO();
                    this.observer.disconnect();
                }
            });
        });

        const anchor = document.getElementById('seo-docs-anchor');
        if (anchor) {
            this.observer.observe(anchor);
        } else {
            // Fallback for pages without anchor
            setTimeout(() => this.renderSEO(), 2000);
        }

        this.injectSchema();
    },

    renderSEO() {
        const data = this.docs[this.toolId];
        if (!data) return;

        const container = document.getElementById('seo-docs-anchor');
        if (!container) return;

        container.innerHTML = `
            <section class="mt-20 border-t border-gray-800 pt-10 pb-20 max-w-4xl mx-auto px-4 overflow-hidden">
                <div class="flex items-center gap-3 mb-6">
                    <div class="h-px flex-grow bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
                    <span class="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em]">Technical Documentation</span>
                    <div class="h-px flex-grow bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
                </div>
                <h2 class="text-xl font-bold text-gray-200 mb-6 text-center">${data.title}</h2>
                <div class="prose prose-invert prose-sm max-w-none text-gray-400 leading-relaxed space-y-4">
                    ${data.content}
                </div>
                <div class="mt-8 flex justify-center">
                    <div class="px-4 py-2 bg-gray-800/50 rounded-full border border-gray-700 text-[10px] text-gray-500 font-medium">
                        Privacy-First • Local Execution • Zero Data Collection
                    </div>
                </div>
            </section>
        `;
    },

    injectSchema() {
        const data = this.docs[this.toolId];
        const baseSchema = {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": this.toolId + " - Omnis",
            "operatingSystem": "All",
            "applicationCategory": "MultimediaApplication",
            "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
            }
        };

        if (data && data.schema) {
            Object.assign(baseSchema, data.schema);
        }

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(baseSchema);
        document.head.appendChild(script);
    }
};

export default SEOManager;
