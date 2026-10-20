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
        mac: {
          canvas: '#121215',
          sidebar: '#16161a',
          window: '#1e1e22',
          surface: '#25252b',
          surfaceHover: '#2c2c33',
          surfaceActive: '#33333c',
          border: 'rgba(255, 255, 255, 0.08)',
          borderStrong: 'rgba(255, 255, 255, 0.15)',
          text: '#f5f5f7',
          textSecondary: '#8e8e93',
          textTertiary: '#636366',
          // Apple System Accents
          blue: '#0a84ff',
          orange: '#ff9f0a',
          red: '#ff453a',
          green: '#30d158',
          purple: '#bf5af2',
          gray: '#8e8e93',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          'SF Pro',
          '"Helvetica Neue"',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          '"SF Mono"',
          'SFMono-Regular',
          'ui-monospace',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.95rem' }],
        'xs': ['0.75rem', { lineHeight: '1.05rem' }],
        'sm': ['0.8125rem', { lineHeight: '1.2rem' }],
        'base': ['0.875rem', { lineHeight: '1.35rem' }],
      },
      boxShadow: {
        'mac-sheet': '0 20px 40px -8px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        'mac-popover': '0 12px 28px -4px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        'mac-button': '0 1px 2px rgba(0, 0, 0, 0.25)',
      },
    },
  },
  plugins: [],
}
