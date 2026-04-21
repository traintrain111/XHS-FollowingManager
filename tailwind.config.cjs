/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#ef4444',
          dark: '#dc2626',
          soft: '#fff1f2',
        },
      },
      boxShadow: {
        panel: '0 18px 50px rgba(15, 23, 42, 0.12)',
      },
    },
  },
  plugins: [],
};
