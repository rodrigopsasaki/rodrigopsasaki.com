/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Monokai-inspired colors
        primary: {
          50: '#f5f8fa',
          100: '#e8f0f5',
          200: '#d4e2eb',
          300: '#b8ccdb',
          400: '#96adc4',
          500: '#7d94b3',
          600: '#6b7ea3',
          700: '#5e6c93',
          800: '#515a79',
          900: '#434a61',
          950: '#2a2e3d',
        },
        accent: {
          50: '#fef8f0',
          100: '#feefd6',
          200: '#fddcac',
          300: '#fac377',
          400: '#f7a340',
          500: '#f4881a',
          600: '#e56d10',
          700: '#be5510',
          800: '#974415',
          900: '#7a3714',
          950: '#421a08',
        },
        // Warm paper-like neutrals
        paper: {
          50: '#faf8f5',
          100: '#f5f1eb',
          200: '#ebe3d4',
          300: '#ddd0b8',
          400: '#c9b899',
          500: '#b5a082',
          600: '#a08c6e',
          700: '#8a7660',
          800: '#726151',
          900: '#5d4f43',
          950: '#302822',
        },
        // Extra soft, gentle light colors 
        gray: {
          50: '#f6f4f1',   // Gentle cream
          100: '#ede9e3',  // Soft beige
          200: '#e3ddd4',  // Muted beige
          300: '#d8d0c5',  // Warm beige
          400: '#c9bfb3',  // Medium beige
          500: '#b5a898',  // Medium beige
          600: '#9a8b7a',  // Darker beige
          700: '#7d6f60',  // Brown beige
          800: '#655851',  // Dark brown
          900: '#524942',  // Very dark brown
          950: '#2f2a24',  // Nearly black brown
        },
        // Dark mode monokai colors
        monokai: {
          bg: '#272822',
          surface: '#383830',
          border: '#49483e',
          text: '#f8f8f2',
          muted: '#75715e',
          yellow: '#e6db74',
          orange: '#fd971f',
          red: '#f92672',
          purple: '#ae81ff',
          blue: '#66d9ef',
          green: '#a6e22e',
        }
      },
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono Variable', 'JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backgroundImage: {
        'paper-texture': "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23c4b8a9\" fill-opacity=\"0.03\"%3E%3Ccircle cx=\"12\" cy=\"12\" r=\"1\"/%3E%3Ccircle cx=\"36\" cy=\"24\" r=\"1\"/%3E%3Ccircle cx=\"6\" cy=\"36\" r=\"1\"/%3E%3Ccircle cx=\"48\" cy=\"6\" r=\"1\"/%3E%3Ccircle cx=\"24\" cy=\"48\" r=\"1\"/%3E%3Cpath d=\"M30 30l2-2-2-2-2 2z\"/%3E%3Cpath d=\"M18 42l1-1-1-1-1 1z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')",
        'dark-paper-texture': "url('data:image/svg+xml,%3Csvg width=\"40\" height=\"40\" viewBox=\"0 0 40 40\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.005\" fill-rule=\"evenodd\"%3E%3Ccircle cx=\"8\" cy=\"8\" r=\"1\"/%3E%3Ccircle cx=\"24\" cy=\"16\" r=\"1\"/%3E%3Ccircle cx=\"32\" cy=\"32\" r=\"1\"/%3E%3Ccircle cx=\"12\" cy=\"28\" r=\"1\"/%3E%3C/g%3E%3C/svg%3E')",
        'linen-texture': "url('data:image/svg+xml,%3Csvg width=\"40\" height=\"40\" viewBox=\"0 0 40 40\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"%23a69c8a\" fill-opacity=\"0.04\" fill-rule=\"evenodd\"%3E%3Cpath d=\"M0 40L40 0H20L0 20M40 40V20L20 40\"/%3E%3C/g%3E%3C/svg%3E')",
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};