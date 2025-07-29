/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      // Enhanced color system for CropGuard agricultural theme
      colors: {
        // Keep existing primary colors but enhance them
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
        
        // Enhanced agricultural brand colors
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7', 
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e', // Primary agricultural green
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16'
        },
        
        // Keep existing accent colors but expand them
        accent: {
          green: '#10B981',
          teal: '#2DD4BF',
          blue: '#3B82F6',
          purple: '#8B5CF6',
          pink: '#EC4899'
        },
        
        // Expand alert colors for better feedback
        alert: {
          orange: '#F59E0B',
          red: '#EF4444',
          yellow: '#EAB308',
          blue: '#3B82F6'
        },
        
        // Dark theme specific colors
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b', // Primary dark background
          900: '#0f172a', // Darker background
          950: '#020617'  // Darkest background
        },
        
        // Status colors for various states
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d'
        },
        
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f'
        },
        
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d'
        }
      },
      
      // Enhanced typography for mobile-first design
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['ui-serif', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace']
      },
      
      // Mobile-optimized font sizes
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        // Keep existing custom sizes
        'body': ['16px', { lineHeight: '1.5' }],
        'heading': ['24px', { lineHeight: '1.3' }],
        'caption': ['12px', { lineHeight: '1.4' }],
      },
      
      // Touch-friendly spacing
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        '144': '36rem'
      },
      
      // Modern border radius
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem'
      },
      
      // Enhanced animations
      animation: {
        // Keep existing animations
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-in-out',
        // Add new animations
        'fade-out': 'fadeOut 0.3s ease-in-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-left': 'slideLeft 0.3s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'scale-out': 'scaleOut 0.2s ease-in',
        'bounce-gentle': 'bounceGentle 2s infinite',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite'
      },
      
      // Enhanced keyframes
      keyframes: {
        // Keep existing keyframes
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        // Add new keyframes
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideLeft: {
          '0%': { transform: 'translateX(10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        slideRight: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' }
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(-5%)' },
          '50%': { transform: 'translateY(0)' }
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' }
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        }
      },
      
      // Mobile-first screen sizes
      screens: {
        'xs': '475px',    // Extra small devices
        'sm': '640px',    // Small devices (landscape phones)
        'md': '768px',    // Medium devices (tablets)
        'lg': '1024px',   // Large devices (laptops)
        'xl': '1280px',   // Extra large devices (desktops)
        '2xl': '1536px'   // 2X large devices (large desktops)
      },
      
      // Enhanced shadows for depth
      boxShadow: {
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        'glow': '0 0 20px rgb(34 197 94 / 0.3)',
        'glow-lg': '0 0 40px rgb(34 197 94 / 0.4)',
        'dark-sm': '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
        'dark-md': '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
        'dark-lg': '0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)'
      },
      
      // Z-index scale
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100'
      }
    },
  },
  plugins: [
    // Custom plugin for CropGuard components and utilities
    function({ addUtilities, addComponents, theme }) {
      // Touch-friendly utilities
      addUtilities({
        '.touch-target': {
          'min-height': '44px',
          'min-width': '44px'
        },
        '.safe-top': {
          'padding-top': 'env(safe-area-inset-top)'
        },
        '.safe-bottom': {
          'padding-bottom': 'env(safe-area-inset-bottom)'
        },
        '.safe-left': {
          'padding-left': 'env(safe-area-inset-left)'
        },
        '.safe-right': {
          'padding-right': 'env(safe-area-inset-right)'
        },
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            'display': 'none'
          }
        }
      })
      
      // Component classes for consistency
      addComponents({
        '.btn-primary': {
          backgroundColor: theme('colors.brand.500'),
          color: theme('colors.white'),
          padding: `${theme('spacing.3')} ${theme('spacing.6')}`,
          borderRadius: theme('borderRadius.lg'),
          fontWeight: theme('fontWeight.medium'),
          fontSize: theme('fontSize.sm[0]'),
          lineHeight: theme('fontSize.sm[1].lineHeight'),
          minHeight: '44px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme('spacing.2'),
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          border: 'none',
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: theme('colors.brand.600'),
            transform: 'translateY(-1px)',
            boxShadow: theme('boxShadow.md')
          },
          '&:active': {
            transform: 'translateY(0)',
            boxShadow: theme('boxShadow.sm')
          },
          '&:focus': {
            outline: 'none',
            boxShadow: `0 0 0 3px ${theme('colors.brand.200')}`
          },
          '&:disabled': {
            backgroundColor: theme('colors.gray.300'),
            color: theme('colors.gray.500'),
            cursor: 'not-allowed',
            transform: 'none',
            boxShadow: 'none'
          }
        },
        
        '.btn-secondary': {
          backgroundColor: 'transparent',
          color: theme('colors.brand.600'),
          padding: `${theme('spacing.3')} ${theme('spacing.6')}`,
          borderRadius: theme('borderRadius.lg'),
          fontWeight: theme('fontWeight.medium'),
          fontSize: theme('fontSize.sm[0]'),
          lineHeight: theme('fontSize.sm[1].lineHeight'),
          minHeight: '44px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme('spacing.2'),
          border: `1px solid ${theme('colors.brand.200')}`,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: theme('colors.brand.50'),
            borderColor: theme('colors.brand.300'),
            transform: 'translateY(-1px)'
          },
          '&:active': {
            transform: 'translateY(0)'
          },
          '&:focus': {
            outline: 'none',
            boxShadow: `0 0 0 3px ${theme('colors.brand.200')}`
          }
        },
        
        '.card': {
          backgroundColor: theme('colors.white'),
          borderRadius: theme('borderRadius.xl'),
          boxShadow: theme('boxShadow.sm'),
          border: `1px solid ${theme('colors.gray.200')}`,
          overflow: 'hidden',
          '.dark &': {
            backgroundColor: theme('colors.dark.800'),
            borderColor: theme('colors.dark.700'),
            boxShadow: theme('boxShadow.dark-sm')
          }
        },
        
        '.input-field': {
          width: '100%',
          padding: `${theme('spacing.3')} ${theme('spacing.4')}`,
          borderRadius: theme('borderRadius.lg'),
          border: `1px solid ${theme('colors.gray.300')}`,
          fontSize: theme('fontSize.sm[0]'),
          lineHeight: theme('fontSize.sm[1].lineHeight'),
          backgroundColor: theme('colors.white'),
          minHeight: '44px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:focus': {
            outline: 'none',
            borderColor: theme('colors.brand.500'),
            boxShadow: `0 0 0 3px ${theme('colors.brand.100')}`
          },
          '&::placeholder': {
            color: theme('colors.gray.400')
          },
          '.dark &': {
            backgroundColor: theme('colors.dark.800'),
            borderColor: theme('colors.dark.600'),
            color: theme('colors.white'),
            '&:focus': {
              borderColor: theme('colors.brand.400'),
              boxShadow: `0 0 0 3px ${theme('colors.brand.900')}`
            },
            '&::placeholder': {
              color: theme('colors.dark.400')
            }
          }
        }
      })
    }
  ]
}