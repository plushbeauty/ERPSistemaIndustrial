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
      colors: {
        background: 'var(--background)', foreground: 'var(--foreground)',
        card: { DEFAULT: 'var(--card)', foreground: 'var(--card-foreground)' },
        popover: { DEFAULT: 'var(--popover)', foreground: 'var(--popover-foreground)' },
        primary: { DEFAULT: 'var(--primary)', foreground: 'var(--primary-foreground)' },
        secondary: { DEFAULT: 'var(--secondary)', foreground: 'var(--secondary-foreground)' },
        muted: { DEFAULT: 'var(--muted)', foreground: 'var(--muted-foreground)' },
        accent: { DEFAULT: 'var(--accent)', foreground: 'var(--accent-foreground)' },
        destructive: { DEFAULT: 'var(--destructive)', foreground: 'var(--destructive-foreground)' },
        border: 'var(--border)', input: 'var(--input)', ring: 'var(--ring)',
        success: 'var(--success)', warning: 'var(--warning)', danger: 'var(--danger)', info: 'var(--info)', topbar: 'var(--topbar)',
        chart: { 1: 'var(--chart-1)', 2: 'var(--chart-2)', 3: 'var(--chart-3)', 4: 'var(--chart-4)', 5: 'var(--chart-5)' },
        sidebar: { DEFAULT: 'var(--sidebar)', foreground: 'var(--sidebar-foreground)', primary: 'var(--sidebar-primary)', 'primary-foreground': 'var(--sidebar-primary-foreground)', accent: 'var(--sidebar-accent)', 'accent-foreground': 'var(--sidebar-accent-foreground)', border: 'var(--sidebar-border)', ring: 'var(--sidebar-ring)' },
      },
    },
  },
  plugins: [tailwindAnimate],
} satisfies Config
