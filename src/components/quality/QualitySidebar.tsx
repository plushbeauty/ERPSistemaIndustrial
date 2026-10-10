import { Link } from 'react-router-dom'
import { FolderGit2, LineChart, ShieldCheck } from 'lucide-react'
import { useSynqraLayout } from '../../layout/SynqraLayoutContext'

const items = [
  ['Dashboard SGQ', '/qualidade/dashboard-rnc'],
  ['Qualidade Geral', '/qualidade'],
  ['Especificações Técnicas', '/qualidade/especificacoes'],
  ['Inspeções de Lotes', '/qualidade/inspecoes'],
  ['Matriz FMEA / PFMEA', '/qualidade/fmea'],
  ['RNC & Planos CAPA', '/qualidade/rnc-capa'],
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
      
        <div className={hostedBySynqra ? 'flex flex-none items-center gap-1 border-l border-slate-200 pl-2' : 'mt-2 border-t border-slate-200 pt-2'}>
          <div className={hostedBySynqra ? 'flex h-8 items-center gap-1 whitespace-nowrap px-2 text-[10px] font-bold uppercase text-[#123B50]' : 'mb-1 flex h-8 items-center gap-2 px-2 text-[10px] font-bold uppercase text-[#123B50]'}>
            <ShieldCheck size={16} /> Gestão da Qualidade
          </div>
          <Link to="/qualidade/ged-documentos" aria-current={active === '/qualidade/ged-documentos' ? 'page' : undefined} className={`flex h-8 items-center gap-1 whitespace-nowrap border px-2 text-[10px] font-semibold ${active.startsWith('/qualidade/ged-documentos') ? 'border-[#2D8DB8] bg-sky-50 text-[#123B50]' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            <FolderGit2 size={14} /> Controle Documental GED
          </Link>
          <Link to="/qualidade/cep" aria-current={active === '/qualidade/cep' ? 'page' : undefined} className={`flex h-8 items-center gap-1 whitespace-nowrap border px-2 text-[10px] font-semibold ${active === '/qualidade/cep' ? 'border-[#2D8DB8] bg-sky-50 text-[#123B50]' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            <LineChart size={14} /> Cartas de Controle CEP
          </Link>
        </div>
      </nav>
    </aside>
  )
}
