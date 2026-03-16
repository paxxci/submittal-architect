/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'accent-primary': '#ff6b00',
        'accent-secondary': '#00ffa3',
        'bg-deep': '#0a0b0e',
        'bg-surface': '#14161b',
        'bg-card': '#1c1f26',
        'text-main': '#ffffff',
        'text-muted': '#8e9196',
        'border-subtle': 'rgba(255, 255, 255, 0.05)',
      }
    },
  },
  plugins: [],
}
