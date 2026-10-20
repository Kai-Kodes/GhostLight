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
        canvas: {
          950: '#080a0f',
          900: '#0d1117',
          850: '#141820',
          800: '#1c222e',
          750: '#252e3d',
          700: '#323d4e',
        },
        ghost: {
          cyan: '#00f0ff',
          sky: '#38bdf8',
          ice: '#e0f2fe',
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
        '2xs': ['0.65rem', { lineHeight: '0.85rem' }],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'elevated': '0 4px 12px 0 rgba(0, 0, 0, 0.45)',
        'glow-cyan': '0 0 16px -2px rgba(0, 240, 255, 0.3)',
      },
    },
  },
  plugins: [],
}
