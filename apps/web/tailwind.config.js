/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Low-saturation warm palette — no blue-purple gradients, no saturated backgrounds.
        canvas: '#f5f1ea', // warm neutral
        panel: '#fffdf9',
        ink: '#292524', // warm near-black
        muted: '#78716c', // stone-500
        terracotta: {
          DEFAULT: '#c2410c', // orange-700
          soft: '#fbeee4',
          dark: '#9a3412',
        },
        amber: {
          soft: '#fef3df',
          DEFAULT: '#b45309',
          dark: '#92400e',
        },
        teal: {
          DEFAULT: '#115e59', // deep teal, sparing
          soft: '#e7f2f0',
        },
        danger: {
          DEFAULT: '#b91c1c',
          soft: '#fdeaea',
          dark: '#7f1d1d',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.9rem',
      },
    },
  },
  plugins: [],
};
