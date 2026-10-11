import { useNavigate } from 'react-router-dom'
import {
  Activity, BookOpenCheck, ClipboardCheck, ClipboardList, FileCheck2, FileText,
  Gauge, GitBranch, ListChecks, Microscope, SearchCheck, ShieldAlert, ShieldCheck,
  Target, Wrench, Workflow
} from 'lucide-react'

const sections = [
  { title: 'CONTROLE DA QUALIDADE', items: [
    { label: 'Visão geral do SGQ', description: 'Indicadores e pendências da qualidade', route: '/qualidade', icon: Gauge },
    { label: 'Inspeções de lotes', description: 'Recebimento, amostragem, medições e decisão', route: '/qualidade/inspecoes/operacao', icon: ClipboardCheck },
    { label: 'Inspeção em processo', description: 'Laudo de processo vinculado à produção', route: '/qualidade/inspecao-processo', icon: Microscope },
    { label: 'Especificações técnicas', description: 'Critérios, tolerâncias e revisões vigentes', route: '/qualidade/especificacoes', icon: FileCheck2 },
    { label: 'Liberação de lotes', description: 'Acompanhar decisão e liberação controlada', route: '/qualidade/liberacao-lote', icon: ShieldCheck },
    { label: 'Quarentena de lotes', description: 'Materiais bloqueados e destinação', route: '/qualidade/quarentena', icon: ShieldAlert },
    { label: 'Genealogia de lotes', description: 'Rastreabilidade de materiais e lotes', route: '/qualidade/genealogia-lote', icon: GitBranch },
  ]},
  { title: 'NÃO CONFORMIDADE E AÇÕES', items: [
    { label: 'Sala de RNC / RPNC', description: 'Registrar, investigar e acompanhar ocorrências', route: '/qualidade/sala-rnc', icon: ClipboardList },
    { label: 'Cadastro de RNC', description: 'Registro formal de não conformidade', route: '/qualidade/rnc', icon: ShieldAlert },
    { label: 'Ishikawa — causa raiz 6M', description: 'Organizar causas e evidências da análise', route: '/qualidade/ishikawa', icon: Workflow },
    { label: 'Plano CAPA / 5W2H', description: 'Ações, responsáveis, prazos e eficácia', route: '/qualidade/capa', icon: ListChecks },
    { label: 'Metodologia 8D', description: 'Investigação estruturada e ação corretiva', route: '/qualidade/metodologia-8d', icon: Target },
    { label: 'FMEA / PFMEA', description: 'Riscos, modos de falha e controles', route: '/qualidade/pfmea', icon: Activity },
  ]},
  { title: 'SISTEMA DE GESTÃO E CONFORMIDADE', items: [
    { label: 'Documentos controlados / GED', description: 'Documentos, revisões e distribuição', route: '/qualidade/ged-documentos', icon: FileText },
    { label: 'Procedimentos e PDFs', description: 'Consultar procedimentos documentados', route: '/qualidade/procedimentos', icon: BookOpenCheck },
    { label: 'Lista mestre', description: 'Controle de documentos vigentes', route: '/qualidade/lista-mestre', icon: FileText },
    { label: 'Auditoria 5S', description: 'Auditorias, apontamentos e acompanhamento', route: '/qualidade/auditoria-5s', icon: SearchCheck },
    { label: 'CEP / cartas de controle', description: 'Medições e acompanhamento estatístico', route: '/qualidade/cep', icon: Activity },
    { label: 'Metrologia e calibração', description: 'Instrumentos, certificados e validade', route: '/qualidade/calibracao', icon: Wrench },
    { label: 'Instruções de trabalho', description: 'Editar e controlar instruções e assinaturas', route: '/qualidade/editor-it', icon: ClipboardCheck },
    { label: 'Relatórios do SGQ', description: 'Consultas e relatórios de qualidade', route: '/qualidade/relatorios-documentos', icon: FileText },
  ]},
]

export default function QualidadeTablet() {
  const navigate = useNavigate()

  return (
    <main className="qt-shell">
      <style>{`
        .qt-shell{min-height:calc(100vh - 76px);padding:12px;background:#f4f8fb;color:#123b50;box-sizing:border-box;font-family:Inter,system-ui,sans-serif}
        .qt-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;background:linear-gradient(100deg,#123b50,#1d6684);color:#fff;border:1px solid #0f3445}
        .qt-head h1{margin:0;font-size:17px;font-weight:750;letter-spacing:.02em}
        .qt-head p{margin:4px 0 0;font-size:10px;color:#d7edf7}
        .qt-stamp{font-size:9px;font-weight:800;letter-spacing:.1em;color:#bce8f6;white-space:nowrap}
        .qt-groups{display:grid;gap:12px;margin-top:12px}
        .qt-group{border:1px solid #cbd9e1;background:#fff;min-width:0}
        .qt-group-title{padding:7px 10px;background:#e7f1f6;border-bottom:1px solid #cbd9e1;font-size:9px;font-weight:850;letter-spacing:.09em;color:#315466}
        .qt-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:9px}
        .qt-tile{display:flex;align-items:flex-start;gap:9px;min-height:68px;padding:10px;border:1px solid #cbd9e1;border-radius:2px;background:#fff;text-align:left;color:#123b50;cursor:pointer;transition:background .12s,border-color .12s;min-width:0}
        .qt-tile:hover,.qt-tile:focus-visible{background:#eef8fc;border-color:#2d8db8;outline:2px solid #b7e2f3;outline-offset:0}
        .qt-icon{display:grid;place-items:center;flex:0 0 30px;height:30px;background:#e8f4f8;color:#23779b;border:1px solid #d2e7ef}
        .qt-copy{min-width:0}.qt-copy strong{display:block;font-size:11px;line-height:1.25;font-weight:750}.qt-copy small{display:block;margin-top:5px;font-size:9px;line-height:1.35;color:#607987}
        .qt-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 2px;color:#718895;font-size:9px}
        @media(max-width:1100px){.qt-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
        @media(max-width:760px){.qt-shell{padding:7px}.qt-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;padding:7px}.qt-tile{padding:8px;min-height:74px}.qt-head h1{font-size:14px}.qt-stamp{display:none}}
        @media(max-width:420px){.qt-grid{grid-template-columns:1fr}}
      `}</style>
      <header className="qt-head">
        <div>
          <h1>SGQ INDUSTRIAL · CENTRAL DA QUALIDADE</h1>
          <p>Selecione uma função. O módulo abre na área central do ERP, mantendo o cabeçalho e a navegação principal.</p>
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
                  <span className="qt-icon"><Icon size={17} strokeWidth={1.8} /></span>
                  <span className="qt-copy"><strong>{item.label}</strong><small>{item.description}</small></span>
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
