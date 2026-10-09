import { Link } from 'react-router-dom'
import { useSynqraLayout } from '../../layout/SynqraLayoutContext'

const items = [
  ['CENTRAL SGQ', '/qualidade'],
  ['DASHBOARD RPNC', '/qualidade/dashboard-rnc'],
  ['INSPEÇÃO EM PROCESSO', '/qualidade/inspecao-processo'],
  ['LIBERAÇÃO DE LOTE', '/qualidade/liberacao-lote'],
  ['QUARENTENA', '/qualidade/quarentena'],
  ['RASTREABILIDADE', '/qualidade/genealogia-lote'],
  ['RPNC / CAPA', '/qualidade/rnc'],
  ['PFMEA / RISCOS', '/qualidade/pfmea'],
  ['AÇÕES CORRETIVAS 8D', '/qualidade/metodologia-8d'],
  ['AUDITORIA 5S', '/qualidade/auditoria-5s'],
  ['CALIBRAÇÃO', '/qualidade/calibracao'],
  ['METROLOGIA', '/qualidade/metrologia'],
  ['DOCUMENTOS CONTROLADOS', '/qualidade/documentos'],
  ['INSTRUÇÕES DE TRABALHO', '/qualidade/editor-it'],
  ['ASSINATURAS DE IT', '/qualidade/assinatura-it'],
  ['LISTA MESTRE', '/qualidade/lista-mestre'],
  ['RELATÓRIOS SGQ', '/qualidade/relatorios-documentos'],
] as const

export default function QualitySidebar({ active }: { active: string }) {
  const hostedBySynqra = useSynqraLayout()

  return (
    <aside
      className={hostedBySynqra
        ? 'col-span-full min-w-0 overflow-hidden border border-slate-200 bg-white'
        : 'hidden min-w-0 border border-slate-200 bg-white lg:block'}
    >
      {!hostedBySynqra && (
        <div className="border-b border-slate-700 bg-slate-900 px-3 py-2 text-white">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-sky-300">DEPARTAMENTO DE QUALIDADE</p>
          <h2 className="mt-1 text-[12px] font-semibold">Sistema de Gestão da Qualidade</h2>
        </div>
      )}
      <nav
        aria-label="Navegação do Departamento de Qualidade"
        className={hostedBySynqra
          ? 'flex min-w-0 flex-wrap gap-1 overflow-x-auto p-1'
          : 'grid gap-1 p-1'}
      >
        {items.map(([label, path]) => (
          <Link
            key={path}
            to={path}
            aria-current={active === path ? 'page' : undefined}
            className={[
              'flex min-h-[30px] items-center border px-2 py-1 text-[9px] font-medium leading-tight transition-colors',
              'rounded-[2px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2D8DB8]',
              hostedBySynqra ? 'flex-none whitespace-nowrap' : 'w-full',
              active === path
                ? 'border-[#2D8DB8] bg-[#EAF5FA] text-[#123B50]'
                : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50',
            ].join(' ')}
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
