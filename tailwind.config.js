/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#1D9E75', dark: '#147A5A', light: '#2BC59A', bg: '#0A0E1A', card: '#111827' }
      }
    }
  },
  plugins: []
}