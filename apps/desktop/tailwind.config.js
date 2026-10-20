/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#07080a',
          900: '#0c0e12',
          850: '#12151b',
          800: '#191d25',
          750: '#222834',
          700: '#2d3545',
          600: '#3f495d',
        },
        signal: {
          cyan: '#38bdf8',
          amber: '#f59e0b',
          rose: '#f43f5e',
          emerald: '#10b981',
          violet: '#a855f7',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Geist Mono', 'Fira Code', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.95rem' }],
        'xs': ['0.75rem', { lineHeight: '1.05rem' }],
        'sm': ['0.8125rem', { lineHeight: '1.2rem' }],
      },
      boxShadow: {
        'dossier': '0 12px 32px -4px rgba(0, 0, 0, 0.7), 0 4px 12px -2px rgba(0, 0, 0, 0.5)',
        'modal': '0 24px 48px -12px rgba(0, 0, 0, 0.85)',
        'glow-cyan': '0 0 20px -3px rgba(56, 189, 248, 0.35)',
        'glow-amber': '0 0 20px -3px rgba(245, 158, 11, 0.35)',
      },
    },
  },
  plugins: [],
}
