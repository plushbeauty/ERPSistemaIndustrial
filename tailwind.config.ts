import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontSize: { base: ['1rem', { lineHeight: '1.5rem' }] },
      borderRadius: { xl: '0.9rem' },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config
