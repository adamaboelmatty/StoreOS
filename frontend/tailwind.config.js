/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './hooks/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#F8F8FA',
          1: '#FFFFFF',
          2: '#F0F0F3',
          3: '#E8E8EC',
        },
        border: {
          DEFAULT: 'rgba(0,0,0,0.06)',
          hover: 'rgba(0,0,0,0.10)',
          active: 'rgba(0,0,0,0.15)',
        },
        text: {
          primary: '#1A1A1A',
          secondary: '#6B6B76',
          tertiary: '#9D9DA7',
        },
        accent: {
          DEFAULT: '#10B981',
          dim: 'rgba(16,185,129,0.08)',
          hover: 'rgba(16,185,129,0.14)',
        },
        status: {
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
        }
      },
      fontSize: {
        'xs': ['11px', { lineHeight: '16px' }],
        'sm': ['12px', { lineHeight: '16px' }],
        'base': ['13px', { lineHeight: '20px' }],
        'lg': ['14px', { lineHeight: '20px' }],
        'xl': ['16px', { lineHeight: '24px' }],
        '2xl': ['20px', { lineHeight: '28px' }],
        '3xl': ['24px', { lineHeight: '32px' }],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        toast: '0 8px 30px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
        modal: '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
