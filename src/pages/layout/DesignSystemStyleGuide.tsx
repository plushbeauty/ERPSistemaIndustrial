/**
 * ERP INDUSTRIAL — DESIGN SYSTEM / CONTRATO DE CAMPOS
 * Data de modificação: 16/10/2026
 * Revisão incremental: 1.0
 * Escopo: travar labels, campos h-8, grids responsivos e moldura industrial compacta.
 * Contrato: não alterar as classes exportadas sem revisar as telas consumidoras.
 */
import type { ReactNode } from 'react'

export const labelClass =
  'flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500'

export const fieldClass =
  'h-8 w-full rounded-[2px] border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20 disabled:cursor-not-allowed disabled:bg-slate-100'

export const gridLayout = 'grid grid-cols-1 gap-4 md:grid-cols-4'

export const cardClass =
  'bg-white border border-slate-300 rounded-[2px] p-5 shadow-sm space-y-6'

export const sectionTitleClass =
  'border-b border-slate-200 pb-2 text-xs font-bold uppercase tracking-wider text-[#123B50]'

export const readOnlyFieldClass =
  fieldClass + ' bg-slate-100 text-slate-600'

export function DesignField({
  label,
  children,
  className = '',
  required = false,
}: {
  label: string
  children: ReactNode
  className?: string
  required?: boolean
}) {
  return (
    <label className={`${labelClass} ${className}`}>
      <span>{label}{required ? ' *' : ''}</span>
      {children}
    </label>
  )
}

/** Componente de referência do próprio contrato de estilo, sem dependência externa. */
export default function DesignSystemStyleGuide() {
  return (
    <main className={`mx-auto max-w-5xl ${cardClass}`}>
      <header className="space-y-1">
        <h1 className="text-sm font-bold uppercase tracking-wide text-[#123B50]">
          Design System Industrial
        </h1>
        <p className="text-xs text-slate-500">
          Contrato global de campos, labels, grids e molduras.
        </p>
      </header>
      <section className="space-y-3">
        <h2 className={sectionTitleClass}>Campos padronizados</h2>
        <div className={gridLayout}>
          <DesignField label="Campo de texto">
            <input className={fieldClass} aria-label="Campo de texto" />
          </DesignField>
          <DesignField label="Campo somente leitura">
            <input className={readOnlyFieldClass} aria-label="Campo somente leitura" readOnly value="Gerado pelo sistema" />
          </DesignField>
          <DesignField label="Seleção">
            <select className={fieldClass} aria-label="Seleção" defaultValue="">
              <option value="">Selecione...</option>
            </select>
          </DesignField>
          <DesignField label="Ação">
            <button className="h-8 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-xs font-semibold text-white" type="button">
              Confirmar
            </button>
          </DesignField>
        </div>
      </section>
    </main>
  )
}
