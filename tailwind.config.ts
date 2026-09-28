/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 12:07 BRT
 * Desenvolvedor: Homologado por Fernando
 * ID da Revisão: REV-017
 * Alterações: Substituir require do plugin Tailwind por import ESM tipado.
 * Status do Build Local: Não executado — gate remoto em homologação.
 * =========================================================================
 */

import type { Config } from 'tailwindcss'
import tailwindAnimate from 'tailwindcss-animate'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontSize: { base: ['1rem', { lineHeight: '1.5rem' }] },
      borderRadius: { xl: '0.9rem' },
    },
  },
  plugins: [tailwindAnimate],
} satisfies Config
