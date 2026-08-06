/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      colors: {
        neu: {
          DEFAULT: '#e0e8f0',
          dark:    '#d4dce8',
          darker:  '#c8d2de',
        },
        brand: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0891b2',
          700: '#0284c7',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#070f1e',
        },
        slate: {
          850: '#0e172a',
          950: '#070d19',
        }
      },
      boxShadow: {
        // Raised neumorphic surfaces (cards, header, modals)
        'neu-flat':    '9px 9px 18px #bec6d0, -9px -9px 18px #ffffff',
        'neu-sm':      '5px 5px 10px #bec6d0, -5px -5px 10px #ffffff',
        'neu-xs':      '3px 3px 6px #bec6d0, -3px -3px 6px #ffffff',
        // Inset surfaces (inputs, active tabs, search bar)
        'neu-inset':   'inset 4px 4px 8px #bec6d0, inset -4px -4px 8px #ffffff',
        'neu-inset-sm':'inset 2px 2px 5px #bec6d0, inset -2px -2px 5px #ffffff',
        // Pressed / active button state
        'neu-pressed': 'inset 3px 3px 6px #bec6d0, inset -3px -3px 6px #ffffff',
        // Convex – buttons at rest (slightly raised but subtle)
        'neu-convex':  '6px 6px 12px #bec6d0, -6px -6px 12px #ffffff',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0.0, 0.6, 1) infinite',
        'float':      'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
