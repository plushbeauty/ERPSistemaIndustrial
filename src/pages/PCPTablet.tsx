import { useNavigate } from 'react-router-dom'
import { Activity, ArrowLeft, Boxes, CalendarDays, ClipboardCheck, ClipboardList, FileSliders, Factory, Gauge, Layers3, ListChecks, Settings2, Wrench } from 'lucide-react'

const modules = [
  { label: 'Ordens de produção', description: 'Consultar e acompanhar ordens industriais e suas etapas.', route: '/pcp/ordens-industriais', icon: ClipboardList },
  { label: 'Painel de ordens', description: 'Visualizar a fila operacional das ordens de produção.', route: '/pcp/painel-ordens', icon: Factory },
  { label: 'Programação de máquinas', description: 'Organizar a programação dos recursos produtivos.', route: '/pcp/agenda-maquinas', icon: CalendarDays },
  { label: 'Capacidade e Gantt', description: 'Analisar carga, capacidade e janelas de produção.', route: '/pcp/capacidade', icon: Activity },
  { label: 'Sequenciamento', description: 'Consultar e ordenar a sequência das operações.', route: '/pcp/sequenciamento', icon: Layers3 },
  { label: 'Planejamento industrial', description: 'Acompanhar demanda e planejamento da produção.', route: '/pcp/planejamento', icon: Settings2 },
  { label: 'MRP II', description: 'Calcular e revisar necessidades de materiais.', route: '/pcp/mrp-ii', icon: Boxes },
  { label: 'Fichas de processo', description: 'Consultar parâmetros e instruções de fabricação.', route: '/pcp/fichas-processo', icon: FileSliders },
  { label: 'Apontamentos de produção', description: 'Registrar execução, quantidades e perdas.', route: '/pcp/apontamentos', icon: ClipboardCheck },
  { label: 'Paradas de produção', description: 'Registrar e acompanhar ocorrências e paradas.', route: '/pcp/paradas', icon: Wrench },
  { label: 'Indicadores OEE', description: 'Acompanhar eficiência global dos equipamentos.', route: '/pcp/dashboard-oee', icon: Gauge },
  { label: 'Tablet do operador', description: 'Abrir o fluxo operacional do operador de produção.', route: '/pcp/tablet-operador', icon: Factory },
  { label: 'Materiais do PCP', description: 'Consultar os fluxos de materiais do planejamento.', route: '/pcp/materiais', icon: ListChecks },
]

export default function PCPTablet() {
  const navigate = useNavigate()
  return (
    <main className="pcp-tablet-shell">
      <style>{`
        .pcp-tablet-shell{min-height:100vh;padding:12px;background:#f4fbfd;color:#123b50;font-family:Inter,system-ui,sans-serif;box-sizing:border-box}
        .pcp-tablet-head{display:flex;align-items:center;gap:14px;min-height:64px;padding:10px 14px;background:#fff;border:1px solid #c9dde5;border-bottom:3px solid #2d8db8}
        .pcp-tablet-logo{width:154px;height:42px;flex:none;object-fit:contain;background:#fff}
        .pcp-tablet-heading{min-width:0;flex:1}
        .pcp-tablet-eyebrow{margin:0;color:#2d8db8;font-size:9px;font-weight:800;letter-spacing:.14em}
        .pcp-tablet-heading h1{margin:3px 0;font-size:16px;line-height:1.2;font-weight:800}
        .pcp-tablet-heading p{margin:0;color:#526b78;font-size:10px;line-height:1.4}
        .pcp-tablet-back{display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:0 10px;border:1px solid #2d8db8;background:#fff;color:#17445a;font-size:10px;font-weight:700}
        .pcp-tablet-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px}
        .pcp-tablet-card{display:flex;align-items:center;gap:12px;min-width:0;min-height:92px;padding:12px;border:1px solid #c9dde5;background:#fff;text-align:left;color:#123b50;cursor:pointer;transition:background .12s,border-color .12s}
        .pcp-tablet-card:hover,.pcp-tablet-card:focus-visible{border-color:#2d8db8;background:#f0f9fc;outline:2px solid #b9e2ef;outline-offset:0}
        .pcp-tablet-icon{display:grid;place-items:center;flex:0 0 42px;width:42px;height:42px;border:1px solid #c4e3ee;background:#eaf6fa;color:#2d8db8}
        .pcp-tablet-copy{display:flex;flex-direction:column;gap:5px;min-width:0}
        .pcp-tablet-copy strong{font-size:11px;line-height:1.3;font-weight:800}
        .pcp-tablet-copy small{font-size:10px;line-height:1.4;color:#536b76;overflow-wrap:anywhere}
        .pcp-tablet-foot{margin-top:10px;padding:8px 10px;border-top:1px solid #c9dde5;color:#607985;font-size:9px}
        @media(max-width:1000px){.pcp-tablet-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:600px){.pcp-tablet-shell{padding:6px}.pcp-tablet-head{align-items:flex-start;flex-wrap:wrap;padding:8px}.pcp-tablet-logo{width:120px;height:34px}.pcp-tablet-heading{flex-basis:calc(100% - 140px)}.pcp-tablet-heading h1{font-size:13px}.pcp-tablet-back{margin-left:auto}.pcp-tablet-grid{grid-template-columns:minmax(0,1fr);gap:6px}.pcp-tablet-card{min-height:76px;padding:9px}}
      `}</style>
      <header className="pcp-tablet-head">
        <img className="pcp-tablet-logo" src="/logo/sgq-erp.png" alt="Logotipo SGQERP Industrial" />
        <div className="pcp-tablet-heading">
          <p className="pcp-tablet-eyebrow">SGQERP INDUSTRIAL · PRODUÇÃO</p>
          <h1>Tablet do PCP</h1>
          <p>Central de planejamento e controle da produção. Selecione uma área para abrir a tela operacional.</p>
        </div>
        <button className="pcp-tablet-back" type="button" onClick={() => navigate('/erp-industrial')}><ArrowLeft size={13}/> Início</button>
      </header>
      <section className="pcp-tablet-grid" aria-label="Módulos do PCP">
        {modules.map(({label,description,route,icon:Icon}) => <button key={route} type="button" className="pcp-tablet-card" onClick={() => navigate(route)}>
          <span className="pcp-tablet-icon" aria-hidden="true"><Icon size={21} strokeWidth={1.8}/></span>
          <span className="pcp-tablet-copy"><strong>{label}</strong><small>{description}</small></span>
        </button>)}
      </section>
      <footer className="pcp-tablet-foot">Acesso aos dados e às operações sujeito à sessão autenticada, permissões e isolamento por empresa do ERP.</footer>
    </main>
  )
}
