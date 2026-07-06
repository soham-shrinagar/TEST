import { LINEUP } from './src/styles/lineupTokens.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: LINEUP.paper,
        ink: LINEUP.ink,
        inkSoft: LINEUP.inkSoft,
        accent: LINEUP.accent,
      },
      fontFamily: {
        sans: ['"Archivo"', 'sans-serif'],
        display: ['"Anton"', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0',
        none: '0',
        sm: '2px',
        md: '2px',
        lg: '2px',
        xl: '2px',
        full: '9999px',
      },
      boxShadow: {
        none: 'none',
      },
      animation: {
        'punch-in': 'punchIn 180ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      keyframes: {
        punchIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
