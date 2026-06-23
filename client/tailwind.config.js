/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        linen: '#f3eee6',
        ink: '#1c2320',
        sage: {
          50: '#f3f6f2',
          100: '#e5ece2',
          200: '#cbd8c8',
          300: '#aebeab',
          400: '#8fa68d',
          500: '#6d866b',
          600: '#566b54',
          700: '#445342',
          800: '#384438',
          900: '#2d352d',
        },
        clay: {
          50: '#fcf4ef',
          100: '#f7e2d6',
          200: '#efc3a9',
          300: '#e29a73',
          400: '#d67a51',
          500: '#bc6240',
          600: '#9d4d34',
          700: '#7f3d2c',
          800: '#693428',
          900: '#582e25',
        },
        tide: {
          50: '#f0f8f7',
          100: '#d9ece9',
          200: '#b3d7d1',
          300: '#86b9b0',
          400: '#609a8f',
          500: '#4b7f75',
          600: '#3b665e',
          700: '#31534d',
          800: '#2a4440',
          900: '#253936',
        },
        sun: {
          50: '#fffaf0',
          100: '#fff1d6',
          200: '#ffe1a4',
          300: '#efc874',
          400: '#dda94d',
          500: '#c78b2f',
          600: '#a46d20',
          700: '#84561d',
          800: '#6d471d',
          900: '#5c3d1d',
        },
        obsidian: '#08070b',
        ember: {
          50: '#fff5ed',
          100: '#ffe7d4',
          200: '#ffc89f',
          300: '#ffa667',
          400: '#ff8331',
          500: '#f6650f',
          600: '#d94f05',
          700: '#b33e08',
          800: '#90320e',
          900: '#752c10'
        },
        plum: {
          50: '#fbf6ff',
          100: '#f3e8ff',
          200: '#e8d3ff',
          300: '#d7b1ff',
          400: '#bc80ff',
          500: '#a353ff',
          600: '#8d2ff2',
          700: '#7620cf',
          800: '#621fa7',
          900: '#531f89'
        }
      },
      fontFamily: {
        sans: ['"Manrope"', 'sans-serif'],
        display: ['"Manrope"', 'sans-serif']
      },
      boxShadow: {
        soft: '0 20px 70px rgba(60, 48, 26, 0.08)',
        lift: '0 18px 45px rgba(28, 35, 32, 0.12)',
        aura: '0 20px 80px rgba(163, 83, 255, 0.22)',
        ember: '0 20px 60px rgba(246, 101, 15, 0.18)'
      },
      animation: {
        'pop-in': 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'fade-up': 'fadeUp 0.5s ease forwards',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        drift: 'drift 8s ease-in-out infinite',
      },
      keyframes: {
        popIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        fadeUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 rgba(163, 83, 255, 0.0)' },
          '50%': { boxShadow: '0 0 40px rgba(163, 83, 255, 0.35)' }
        },
        drift: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -12px, 0)' },
        }
      }
    }
  },
  plugins: []
};
