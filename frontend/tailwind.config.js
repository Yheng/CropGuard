/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1F2A44',
          50: '#F8F9FB',
          100: '#F1F3F7',
          200: '#E5E9F0',
          300: '#D4DBE8',
          400: '#B8C4D6',
          500: '#8F9FBA',
          600: '#6B7C9B',
          700: '#4A5B7C',
          800: '#1F2A44',
          900: '#161F33',
        },
        accent: {
          green: '#10B981',
          teal: '#2DD4BF',
        },
        alert: {
          orange: '#F59E0B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      fontSize: {
        'body': '16px',
        'heading': '24px',
        'caption': '12px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}