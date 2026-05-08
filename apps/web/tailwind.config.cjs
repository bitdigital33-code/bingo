/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.06), 0 25px 60px rgba(2,12,18,0.35)',
      },
      backgroundImage: {
        aurora:
          'radial-gradient(circle at top left, rgba(89, 255, 208, 0.12), transparent 34%), radial-gradient(circle at top right, rgba(255, 122, 89, 0.13), transparent 30%), radial-gradient(circle at bottom center, rgba(255, 215, 128, 0.08), transparent 34%)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Manrope"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
