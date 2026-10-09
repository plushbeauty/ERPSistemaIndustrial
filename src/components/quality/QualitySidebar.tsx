import { Link } from 'react-router-dom'
import { useSynqraLayout } from '../../layout/SynqraLayoutContext'

const items = [
  ['Dashboard SGQ', '/qualidade/dashboard-rnc'],
  ['Qualidade Geral', '/qualidade'],
  ['Especificações Técnicas', '/qualidade/especificacoes'],
  ['Inspeções de Lotes', '/qualidade/inspecoes'],
  ['Matriz FMEA / PFMEA', '/qualidade/fmea'],
  ['RNC & Planos CAPA', '/qualidade/rnc-capa'],
  ['CEP / Cartas de Controle', '/qualidade/cep'],
  ['Inspeção em Processo', '/qualidade/inspecao-processo'],
  ['Registro RPNC / CAPA', '/qualidade/rnc'],
  ['8D — Ações Corretivas', '/qualidade/metodologia-8d'],
  ['Auditoria 5S', '/qualidade/auditoria-5s'],
  ['PFMEA / Risco', '/qualidade/pfmea'],
  ['Procedimentos e documentos', '/qualidade/documentos'],
  ['Lista Mestre', '/qualidade/lista-mestre'],
  ['Relatórios SGQ', '/qualidade/relatorios-documentos'],
  ['Calibração / Metrologia', '/qualidade/metrologia'],
]

export default function QualitySidebar({ active }: { active: string }) {
  const hostedBySynqra = useSynqraLayout()

  return (
    <aside className={hostedBySynqra
      ? 'col-span-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm'
      : 'hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:block'}>
      {!hostedBySynqra && <div className="rounded-t-xl border-b border-slate-700 bg-slate-900 p-4 text-white">
        <p className="text-xs font-black uppercase tracking-widest text-sky-300">QUALIDADE</p>
        <h2 className="mt-1 text-lg font-extrabold">Workspace Industrial</h2>
      </div>}
      <nav
        aria-label="Navegação da qualidade"
        className={hostedBySynqra
          ? 'flex min-w-0 gap-1 overflow-x-auto p-2'
          : 'p-2'}
      >
        {items.map(([label, path]) => (
          <Link
            key={path}
            to={path}
            aria-current={active === path ? 'page' : undefined}
            className={`${hostedBySynqra
              ? 'min-h-10 flex-none whitespace-nowrap px-3 text-xs'
              : 'mb-1 min-h-11 w-full px-3 py-2 text-left text-sm'} flex items-center rounded-lg ${
              active === path
                ? hostedBySynqra
                  ? 'bg-blue-50 font-extrabold text-[#0052cc] ring-1 ring-blue-100'
                  : 'bg-sky-100 font-extrabold text-sky-900'
                : 'font-semibold text-slate-700 hover:bg-slate-100 hover:text-[#0052cc]'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
