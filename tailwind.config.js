/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./context/**/*.{js,ts,jsx,tsx}",
        "./hooks/**/*.{js,ts,jsx,tsx}",
        "./*.{js,ts,jsx,tsx}",
    ],
    safelist: [
        // Legacy colors (to be migrated)
        'bg-blue-500', 'bg-yellow-500', 'bg-purple-500', 'bg-orange-500', 'bg-green-500',
        'border-blue-500', 'border-yellow-500', 'border-purple-500', 'border-orange-500', 'border-green-500',
        'text-blue-500', 'text-yellow-500', 'text-purple-500', 'text-orange-500', 'text-green-500',
        'hover:bg-slate-100', 'dark:hover:bg-white/10',
        // OKLCH Status Colors
        'bg-success', 'bg-success-hover', 'bg-success-bg', 'text-success', 'text-success-text',
        'bg-warning', 'bg-warning-hover', 'bg-warning-bg', 'text-warning', 'text-warning-text',
        'bg-error', 'bg-error-hover', 'bg-error-bg', 'text-error', 'text-error-text',
        'bg-info', 'bg-info-hover', 'bg-info-bg', 'text-info', 'text-info-text',
        'bg-orange', 'bg-orange-bg', 'text-orange', 'text-orange-text',
        // OKLCH Text Colors
        'text-foreground', 'text-foreground-primary', 'text-foreground-secondary', 'text-foreground-muted', 'text-foreground-subtle',
        // OKLCH Surface Colors  
        'bg-surface', 'bg-surface-bg', 'bg-surface-muted',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Space Grotesk', 'sans-serif'],
                serif: ['Cinzel', 'serif'],
            },
            colors: {
                primary: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                },
                dark: {
                    bg: '#020617', // Deep Slate 950
                    card: '#0f172a', // Slate 900
                    border: '#1e293b', // Slate 800
                    hover: '#334155',
                },
                // Semantic colors using CSS variables (OKLCH)
                surface: {
                    DEFAULT: 'var(--color-surface)',
                    bg: 'var(--color-bg)',
                    muted: 'var(--color-muted)',
                },
                'border-color': {
                    DEFAULT: 'var(--color-border)',
                    subtle: 'var(--color-border-subtle)',
                },
                // Status colors using OKLCH
                success: {
                    DEFAULT: 'var(--color-success)',
                    hover: 'var(--color-success-hover)',
                    bg: 'var(--color-success-bg)',
                    text: 'var(--color-success-text)',
                },
                warning: {
                    DEFAULT: 'var(--color-warning)',
                    hover: 'var(--color-warning-hover)',
                    bg: 'var(--color-warning-bg)',
                    text: 'var(--color-warning-text)',
                },
                error: {
                    DEFAULT: 'var(--color-error)',
                    hover: 'var(--color-error-hover)',
                    bg: 'var(--color-error-bg)',
                    text: 'var(--color-error-text)',
                },
                info: {
                    DEFAULT: 'var(--color-info)',
                    hover: 'var(--color-info-hover)',
                    bg: 'var(--color-info-bg)',
                    text: 'var(--color-info-text)',
                },
                orange: {
                    DEFAULT: 'var(--color-orange)',
                    bg: 'var(--color-orange-bg)',
                    text: 'var(--color-orange-text)',
                },
                // Text colors using OKLCH (foreground to avoid 'text-text-x' collision)
                foreground: {
                    DEFAULT: 'var(--color-text-primary)',
                    primary: 'var(--color-text-primary)',
                    secondary: 'var(--color-text-secondary)',
                    muted: 'var(--color-text-muted)',
                    subtle: 'var(--color-text-subtle)',
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
            }
        },
    },
    plugins: [],
}
