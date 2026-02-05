/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./Portal/**/*.{html,js}",
        "./Tools/**/*.{html,js}",
        "./Shared/**/*.{html,js}"
    ],
    theme: {
        extend: {
            colors: {
                background: '#F8F9FA', // Light Gray Base
                surface: '#FFFFFF',
                primary: '#007AFF', // Trust Blue
                'primary-hover': '#0056b3',
                success: '#28A745', // Green
                text: {
                    main: '#1A1A1A',
                    muted: '#6C757D'
                },
                border: '#DEE2E6'
            },
            fontFamily: {
                sans: [
                    'Inter',
                    'Segoe UI',
                    'Roboto',
                    'Helvetica',
                    'Arial',
                    'sans-serif',
                    'Apple Color Emoji',
                    'Segoe UI Emoji',
                    'Segoe UI Symbol'
                ],
            },
            spacing: {
                '4px': '4px',
                '8px': '8px',
                '24px': '24px', // Minimum content padding
            },
            letterSpacing: {
                tight: '-0.01em',
            },
            lineHeight: {
                relaxed: '1.5',
            },
            boxShadow: {
                'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
                'float': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            },
            animation: {
                'fade-in': 'fadeIn 0.2s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                }
            }
        },
    },
    plugins: [],
}
