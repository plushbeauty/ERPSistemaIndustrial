import { useNavigate } from 'react-router-dom'
import {
  Activity, BookOpenCheck, ClipboardCheck, ClipboardList, FileCheck2, FileText,
  Gauge, GitBranch, ListChecks, Microscope, SearchCheck, ShieldAlert, ShieldCheck,
  Target, Wrench, Workflow
} from 'lucide-react'

const sections = [
  { title: 'CONTROLE DA QUALIDADE', items: [
    { label: 'Visão geral do SGQ', route: '/qualidade', icon: Gauge },
    { label: 'Inspeções de lotes', route: '/qualidade/inspecoes', icon: ClipboardCheck },
    { label: 'Inspeção em processo', route: '/qualidade/inspecao-processo', icon: Microscope },
    { label: 'Especificações técnicas', route: '/qualidade/especificacoes', icon: FileCheck2 },
    { label: 'Liberação de lotes', route: '/qualidade/liberacao-lote', icon: ShieldCheck },
    { label: 'Quarentena de lotes', route: '/qualidade/quarentena', icon: ShieldAlert },
    { label: 'Genealogia de lotes', route: '/qualidade/genealogia-lote', icon: GitBranch },
  ]},
  { title: 'NÃO CONFORMIDADE E AÇÕES', items: [
    { label: 'Sala de RNC / RPNC', route: '/qualidade/sala-rnc', icon: ClipboardList },
    { label: 'Cadastro de RNC', route: '/qualidade/rnc', icon: ShieldAlert },
    { label: 'Ishikawa — causa raiz 6M', route: '/qualidade/ishikawa', icon: Workflow },
    { label: 'Plano CAPA / 5W2H', route: '/qualidade/capa', icon: ListChecks },
    { label: 'Metodologia 8D', route: '/qualidade/metodologia-8d', icon: Target },
    { label: 'FMEA / PFMEA', route: '/qualidade/pfmea', icon: Activity },
  ]},
  { title: 'SISTEMA DE GESTÃO E CONFORMIDADE', items: [
    { label: 'Documentos controlados / GED', route: '/qualidade/ged-documentos', icon: FileText },
    { label: 'Procedimentos e PDFs', route: '/qualidade/procedimentos', icon: BookOpenCheck },
    { label: 'Lista mestre', route: '/qualidade/lista-mestre', icon: FileText },
    { label: 'Auditoria 5S', route: '/qualidade/auditoria-5s', icon: SearchCheck },
    { label: 'CEP / cartas de controle', route: '/qualidade/cep', icon: Activity },
    { label: 'Metrologia e calibração', route: '/qualidade/calibracao', icon: Wrench },
    { label: 'Instruções de trabalho', route: '/qualidade/editor-it', icon: ClipboardCheck },
    { label: 'Relatórios do SGQ', route: '/qualidade/relatorios-documentos', icon: FileText },
  ]},
]

export default function QualidadeTablet() {
  const navigate = useNavigate()

  return (
    <main className="qt-shell">
      <style>{`
        .qt-shell{width:100%;max-width:1360px;margin:0 auto;min-height:calc(100vh - 76px);padding:10px;background:#f4f8fb;color:#123b50;box-sizing:border-box;font-family:Inter,system-ui,sans-serif}
        .qt-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 12px;background:linear-gradient(100deg,#123b50,#1d6684);color:#fff;border:1px solid #0f3445}
        .qt-head h1{margin:0;font-size:14px;font-weight:750;letter-spacing:.02em}
        .qt-head p{display:none}
        .qt-stamp{font-size:9px;font-weight:800;letter-spacing:.1em;color:#bce8f6;white-space:nowrap}
        .qt-groups{display:grid;gap:8px;margin-top:8px}
        .qt-group{border:1px solid #cbd9e1;background:#fff;min-width:0}
        .qt-group-title{padding:6px 9px;background:#e7f1f6;border-bottom:1px solid #cbd9e1;font-size:9px;font-weight:850;letter-spacing:.09em;color:#315466}
        .qt-grid{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:6px;padding:7px}
        .qt-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;height:80px;min-width:0;padding:6px;border:1px solid #cbd9e1;border-radius:2px;background:#fff;text-align:center;color:#123b50;cursor:pointer;transition:background .12s,border-color .12s}
        .qt-tile:hover,.qt-tile:focus-visible{background:#eef8fc;border-color:#2d8db8;outline:2px solid #b7e2f3;outline-offset:0}
        .qt-icon{display:grid;place-items:center;flex:0 0 28px;width:28px;height:28px;background:#e8f4f8;color:#23779b;border:1px solid #d2e7ef}
        .qt-copy{display:block;width:100%;min-width:0}.qt-copy strong{display:-webkit-box;overflow:hidden;-webkit-line-clamp:2;-webkit-box-orient:vertical;font-size:9px;line-height:1.2;font-weight:850;text-transform:uppercase;overflow-wrap:anywhere}
        .qt-copy small{display:none}
        .qt-foot{display:none}
        @media(max-width:1250px){.qt-grid{grid-template-columns:repeat(6,minmax(0,1fr))}}
        @media(max-width:900px){.qt-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
        @media(max-width:560px){.qt-shell{padding:6px}.qt-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;padding:6px}.qt-tile{height:76px}.qt-head h1{font-size:12px}.qt-stamp{display:none}}
      `}</style>
      <header className="qt-head">
        <div>
          <h1>SGQ INDUSTRIAL · CENTRAL DA QUALIDADE</h1>
          
        </div>
        <span className="qt-stamp">TABLET · SGQ</span>
      </header>
      <div className="qt-groups">
        {sections.map(section => (
          <section className="qt-group" key={section.title}>
            <div className="qt-group-title">{section.title}</div>
            <div className="qt-grid">
              {section.items.map(item => {
                const Icon = item.icon
                return <button className="qt-tile" key={item.route} type="button" onClick={() => navigate(item.route)} aria-label={item.label}>
                  <span className="qt-icon"><Icon size={20} strokeWidth={1.8} /></span>
                  <span className="qt-copy"><strong>{item.label}</strong></span>
                </button>
              })}
            </div>
          </section>
        ))}
      </div>
      <footer className="qt-foot"><span>SGQERP INDUSTRIAL · CENTRAL DE CONTROLE</span><span>Dados e permissões continuam sob o ERP/Supabase</span></footer>
    </main>
  )
}
