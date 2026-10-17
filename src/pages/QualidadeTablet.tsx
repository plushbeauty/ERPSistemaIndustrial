import { useMemo, useState } from 'react'
import { ArrowLeft, Gauge, Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, BookOpenCheck, ClipboardCheck, ClipboardList, FileCheck2, FileText,
  GitBranch, ListChecks, Microscope, SearchCheck, ShieldAlert, ShieldCheck,
  Target, Wrench, Workflow,
} from 'lucide-react'

const sections = [
  { title: 'CONTROLE DA QUALIDADE', description: 'Inspeção, rastreabilidade e liberação de materiais', items: [
    { label: 'Inspeções de lotes', description: 'Registrar amostras e resultados', route: '/qualidade/inspecoes', icon: ClipboardCheck },
    { label: 'Inspeção em processo', description: 'Verificações durante a produção', route: '/qualidade/inspecao-processo', icon: Microscope },
    { label: 'Especificações técnicas', description: 'Critérios, tolerâncias e revisões', route: '/qualidade/especificacoes', icon: FileCheck2 },
    { label: 'Liberação de lotes', description: 'Decisão e rastreio de liberação', route: '/qualidade/liberacao-lote', icon: ShieldCheck },
    { label: 'Quarentena de lotes', description: 'Materiais bloqueados e segregados', route: '/qualidade/quarentena', icon: ShieldAlert },
    { label: 'Genealogia de lotes', description: 'Rastrear origem e vínculos', route: '/qualidade/genealogia-lote', icon: GitBranch },
  ]},
  { title: 'NÃO CONFORMIDADE E AÇÕES', description: 'Tratamento de ocorrências e prevenção de recorrência', items: [
    { label: 'Sala de RNC / RPNC', description: 'Pendências e não conformidades', route: '/qualidade/sala-rnc', icon: ClipboardList },
    { label: 'Cadastro de RNC', description: 'Registrar ocorrências da qualidade', route: '/qualidade/rnc', icon: ShieldAlert },
    { label: 'Ishikawa · causa raiz 6M', description: 'Investigar causas do problema', route: '/qualidade/ishikawa', icon: Workflow },
    { label: 'Plano CAPA / 5W2H', description: 'Ações corretivas e preventivas', route: '/qualidade/capa', icon: ListChecks },
    { label: 'Metodologia 8D', description: 'Resolver problemas de forma estruturada', route: '/qualidade/metodologia-8d', icon: Target },
    { label: 'FMEA / PFMEA', description: 'Riscos de produto e processo', route: '/qualidade/pfmea', icon: Activity },
  ]},
  { title: 'SISTEMA DE GESTÃO E CONFORMIDADE', description: 'Documentos controlados, auditoria e melhoria contínua', items: [
    { label: 'Documentos controlados / GED', description: 'Documentos, revisões e vigência', route: '/qualidade/ged-documentos', icon: FileText },
    { label: 'Procedimentos e PDFs', description: 'Procedimentos e padrões do SGQ', route: '/qualidade/procedimentos', icon: BookOpenCheck },
    { label: 'Lista mestre', description: 'Índice de documentos controlados', route: '/qualidade/lista-mestre', icon: FileText },
    { label: 'Auditoria 5S', description: 'Auditorias de organização e disciplina', route: '/qualidade/auditoria-5s', icon: SearchCheck },
    { label: 'CEP / cartas de controle', description: 'Monitoramento estatístico do processo', route: '/qualidade/cep', icon: Activity },
    { label: 'Metrologia e calibração', description: 'Instrumentos e validade metrológica', route: '/qualidade/calibracao', icon: Wrench },
    { label: 'Instruções de trabalho', description: 'Padrões operacionais de execução', route: '/qualidade/editor-it', icon: ClipboardCheck },
    { label: 'Relatórios do SGQ', description: 'Consultas e relatórios de qualidade', route: '/qualidade/relatorios-documentos', icon: FileText },
  ]},
] as const

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')

export default function QualidadeTablet() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const term = normalize(search.trim())
  const filtered = useMemo(() => sections.map(section => ({
    ...section,
    items: section.items.filter(item => !term || normalize(item.label + ' ' + item.description).includes(term)),
  })).filter(section => section.items.length > 0), [term])
  const count = filtered.reduce((total, section) => total + section.items.length, 0)

  return (
    <main className="quality-launcher">
      <style>{`
        .quality-launcher{--navy:#123b50;--blue:#2d8db8;--cyan:#48b7c7;--line:#cbdde5;min-height:calc(100vh - 84px);padding:12px;background:#edf4f7;color:var(--navy);font-family:Inter,system-ui,sans-serif;box-sizing:border-box}
        .ql-wrap{max-width:1440px;margin:0 auto}
        .ql-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 18px;background:linear-gradient(105deg,#123b50 0%,#174f69 68%,#1d6a82 100%);color:#fff;border:1px solid #0c3041}
        .ql-brand{display:flex;align-items:center;gap:12px;min-width:0}
        .ql-back{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:30px;padding:0 10px;border:1px solid #6e9aab;background:#194c62;color:#fff;font-size:10px;font-weight:800;white-space:nowrap}
        .ql-kicker{font-size:9px;font-weight:800;letter-spacing:.16em;color:#9fdae8}
        .ql-header h1{margin:3px 0 0;font-size:18px;line-height:1.15;font-weight:800;letter-spacing:.01em}
        .ql-header p{margin:4px 0 0;color:#d4e7ee;font-size:10px}
        .ql-meta{display:flex;align-items:center;gap:8px;flex-shrink:0}
        .ql-counter{display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid #47798b;background:#16445a}
        .ql-counter strong{font-size:17px;line-height:1;color:#fff}
        .ql-counter span{font-size:9px;font-weight:800;letter-spacing:.08em;color:#c5e6ee}
        .ql-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding:8px 10px;border:1px solid var(--line);background:#fff}
        .ql-toolbar-label{font-size:9px;font-weight:900;letter-spacing:.12em;color:#315466}
        .ql-search{display:flex;align-items:center;gap:7px;width:min(360px,100%);height:32px;padding:0 9px;border:1px solid #b8cbd5;background:#f9fcfd;color:#5b7885}
        .ql-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--navy);font-size:11px}
        .ql-clear{display:grid;place-items:center;width:24px;height:24px;border:0;background:transparent;color:#5b7885;cursor:pointer}
        .ql-sections{display:grid;gap:10px;margin-top:10px}
        .ql-section{min-width:0;border:1px solid var(--line);background:#fff}
        .ql-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 12px;background:#e4f0f5;border-bottom:1px solid var(--line)}
        .ql-section-title{font-size:10px;font-weight:900;letter-spacing:.1em;color:#17465c}
        .ql-section-desc{margin-top:3px;font-size:10px;color:#58727f}
        .ql-section-count{display:grid;place-items:center;min-width:28px;height:25px;padding:0 7px;border:1px solid #c1dce6;background:#f8fcfd;color:#267c9f;font-size:10px;font-weight:900}
        .ql-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;padding:9px}
        .ql-card{display:flex;align-items:center;gap:10px;min-width:0;min-height:66px;padding:9px 10px;border:1px solid #d5e1e7;border-left:3px solid #48b7c7;background:#fff;text-align:left;color:var(--navy);cursor:pointer;transition:border-color .12s,background .12s}
        .ql-card:hover,.ql-card:focus-visible{border-color:var(--blue);border-left-color:var(--blue);background:#f1f9fc;outline:2px solid #c3e5f0;outline-offset:0}
        .ql-icon{display:grid;place-items:center;flex:0 0 34px;width:34px;height:34px;border:1px solid #c8e1e9;background:#eaf5f8;color:#247da0}
        .ql-copy{display:block;min-width:0}
        .ql-name{display:block;font-size:10px;font-weight:850;line-height:1.25;color:#123b50}
        .ql-description{display:block;margin-top:4px;font-size:9px;line-height:1.3;color:#607986}
        .ql-empty{padding:28px 12px;border:1px solid var(--line);background:#fff;text-align:center;font-size:11px;color:#607986}
        .ql-footer{display:flex;justify-content:space-between;gap:12px;margin-top:10px;padding:8px 2px;border-top:1px solid #cbdde5;font-size:9px;color:#617985}
        @media(max-width:1100px){.ql-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
        @media(max-width:760px){.quality-launcher{padding:7px}.ql-header{align-items:flex-start;flex-direction:column;padding:12px}.ql-meta{width:100%;justify-content:space-between}.ql-toolbar{align-items:stretch;flex-direction:column}.ql-search{width:100%}.ql-grid{grid-template-columns:repeat(2,minmax(0,1fr));padding:7px}.ql-footer{flex-direction:column;gap:4px}}
        @media(max-width:460px){.ql-brand{align-items:flex-start;flex-direction:column;gap:8px}.ql-header h1{font-size:16px}.ql-grid{grid-template-columns:1fr}.ql-card{min-height:60px}}
      `}</style>
      <div className="ql-wrap">
        <header className="ql-header">
          <div className="ql-brand">
            <button type="button" className="ql-back" onClick={() => navigate('/tablet/dashboard')}><ArrowLeft size={13} /> VOLTAR AO TABLET</button>
            <div>
              <div className="ql-kicker">ERP INDUSTRIAL / SISTEMA DE GESTÃO DA QUALIDADE</div>
              <h1>Central da Qualidade</h1>
              <p>Processos, rastreabilidade e conformidade em um único ponto de acesso.</p>
            </div>
          </div>
          <div className="ql-meta">
            <div className="ql-counter"><Gauge size={17} color="#9fdae8" /><div><strong>{count}</strong><span> MÓDULOS</span></div></div>
            <div className="ql-counter"><ShieldCheck size={17} color="#9fdae8" /><div><strong>SGQ</strong><span> OPERACIONAL</span></div></div>
          </div>
        </header>
        <div className="ql-toolbar">
          <div className="ql-toolbar-label">CATÁLOGO DE PROCESSOS</div>
          <div className="ql-search"><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Pesquisar módulo, processo ou atividade..." aria-label="Pesquisar módulos da qualidade" />{search && <button type="button" className="ql-clear" onClick={() => setSearch('')} aria-label="Limpar pesquisa"><X size={14} /></button>}</label>
        </div>
        {filtered.length === 0 ? <div className="ql-empty" role="status">Nenhum módulo encontrado para “{search.trim()}”. Limpe a pesquisa e tente novamente.</div> : <div className="ql-sections">
          {filtered.map(section => <section className="ql-section" key={section.title}>
            <header className="ql-section-head"><div><div className="ql-section-title">{section.title}</div><div className="ql-section-desc">{section.description}</div></div><span className="ql-section-count">{section.items.length.toString().padStart(2, '0')}</span></header>
            <div className="ql-grid">{section.items.map(item => { const Icon = item.icon; return <button key={item.route} type="button" className="ql-card" onClick={() => navigate(item.route)}><span className="ql-icon"><Icon size={18} strokeWidth={1.8} /></span><span className="ql-copy"><span className="ql-name">{item.label}</span><span className="ql-description">{item.description}</span></span></button>})}</div>
          </section>)}
        </div>}
        <footer className="ql-footer"><span>SGQ INDUSTRIAL · CENTRAL DE CONTROLE</span><span>Os registros respeitam sessão, empresa ativa e permissões do ERP.</span></footer>
      </div>
    </main>
  )
}
