import { ArrowRight, BarChart3, ClipboardList, FileText, PackageCheck, ShoppingCart, Truck, Users, ShieldCheck, Boxes } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import VendasLayout from './VendasLayout'

const mainCards = [
  { title: 'Requisições', description: 'Registre necessidades de materiais, acompanhe urgências e encaminhe itens para cotação.', detail: 'NECESSIDADES E APROVAÇÕES', route: '/compras/requisicoes', Icon: ClipboardList, tone: 'blue' },
  { title: 'Cotações e mapa comparativo', description: 'Consulte cotações, compare propostas de fornecedores e registre a decisão comercial.', detail: 'RFQ • COMPARAÇÃO DE PREÇOS', route: '/compras/rfq', Icon: FileText, tone: 'orange' },
  { title: 'Pedidos de compra', description: 'Acompanhe pedidos, condições comerciais, aprovações e prazos de entrega.', detail: 'ORDENS E APROVAÇÕES', route: '/compras/pedido', Icon: ShoppingCart, tone: 'green' },
  { title: 'Fornecedores', description: 'Acesse os fornecedores cadastrados e seus dados de qualificação comercial.', detail: 'CADASTRO E QUALIFICAÇÃO', route: '/compras/fornecedores', Icon: Truck, tone: 'purple' },
]

const shortcuts = [
  { title: 'Recebimentos', description: 'Entrada e conferência de materiais', route: '/compras/recebimentos', Icon: PackageCheck, tone: 'teal' },
  { title: 'Análise de preços', description: 'Revisão e decisão de propostas', route: '/compras/analise-precos', Icon: BarChart3, tone: 'blue' },
  { title: 'Validação fiscal', description: 'Conferência fiscal dos pedidos', route: '/fiscal/compras', Icon: ShieldCheck, tone: 'orange' },
  { title: 'Relatórios', description: 'Consultas e acompanhamento', route: '/compras/relatorios', Icon: Boxes, tone: 'green' },
]

export default function ComprasCentral() {
  const navigate = useNavigate()

  return (
    <VendasLayout title="Central de Compras" subtitle="Suprimentos, fornecedores, pedidos e recebimentos">
      <main className="synqra-purchase-hub">
        <style>{`
          .synqra-purchase-hub{--sq-navy:#0b2545;--sq-blue:#1d5fd1;--sq-cyan:#22b8cf;min-height:calc(100vh - 70px);padding:12px;color:#172b43;background:#f5f7fb;font-family:Inter,Segoe UI,Arial,sans-serif}
          .sq-purchase-wrap{max-width:1600px;margin:0 auto}
          .sq-purchase-hero{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:22px 26px;border-radius:18px;background:linear-gradient(115deg,#0b2545 0%,#123f72 58%,#1d5fd1 100%);color:#fff;box-shadow:0 12px 28px rgba(11,37,69,.16)}
          .sq-purchase-hero:after{content:"";position:absolute;width:250px;height:250px;right:5%;top:-145px;border:1px solid rgba(255,255,255,.13);border-radius:50%;box-shadow:0 0 0 28px rgba(255,255,255,.035),0 0 0 58px rgba(255,255,255,.025);pointer-events:none}
          .sq-purchase-eyebrow{display:flex;align-items:center;gap:8px;color:#bfeef6;font-size:10px;font-weight:800;letter-spacing:.15em;text-transform:uppercase}
          .sq-purchase-hero h1{margin:8px 0 6px;font-size:clamp(22px,2.4vw,32px);font-weight:750;line-height:1.15;letter-spacing:-.025em;color:#fff}
          .sq-purchase-hero p{max-width:740px;margin:0;color:#e1edf9;font-size:13px;line-height:1.6}
          .sq-purchase-brand{position:relative;z-index:1;flex:0 0 auto;text-align:right}
          .sq-purchase-brand strong{display:block;font-size:13px;letter-spacing:.08em;color:#fff}
          .sq-purchase-brand span{display:block;margin-top:5px;color:#bfeef6;font-size:9px;font-weight:700;letter-spacing:.16em}
          .sq-purchase-section-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin:22px 2px 12px}
          .sq-purchase-section-head h2{margin:0;color:#102c4e;font-size:18px;font-weight:750}
          .sq-purchase-section-head p{margin:5px 0 0;color:#64748b;font-size:12px;line-height:1.5}
          .sq-purchase-section-head small{color:#64748b;font-size:10px;white-space:nowrap}
          .sq-purchase-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
          .sq-purchase-card{position:relative;display:flex;flex-direction:column;min-width:0;min-height:218px;padding:18px;border:1px solid transparent;border-radius:16px;text-align:left;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease;box-shadow:0 5px 16px rgba(15,35,65,.045)}
          .sq-purchase-card:hover{transform:translateY(-3px);box-shadow:0 12px 25px rgba(15,35,65,.11)}
          .sq-purchase-card:focus-visible,.sq-purchase-shortcut:focus-visible{outline:3px solid #22b8cf;outline-offset:3px}
          .sq-purchase-card.blue{background:#eaf2ff;border-color:#d7e5ff}.sq-purchase-card.orange{background:#fff1e6;border-color:#ffe1ca}.sq-purchase-card.green{background:#e8f7ef;border-color:#ccebd9}.sq-purchase-card.purple{background:#f1edff;border-color:#e1d9ff}
          .sq-purchase-icon{display:grid;place-items:center;width:46px;height:46px;margin-bottom:15px;border-radius:13px;background:#fff;box-shadow:0 3px 9px rgba(15,35,65,.06)}
          .sq-purchase-card.blue .sq-purchase-icon{color:#1d5fd1}.sq-purchase-card.orange .sq-purchase-icon{color:#c56a1a}.sq-purchase-card.green .sq-purchase-icon{color:#168653}.sq-purchase-card.purple .sq-purchase-icon{color:#7650c9}
          .sq-purchase-card h3{margin:0 0 8px;color:#102c4e;font-size:16px;font-weight:750;line-height:1.35}
          .sq-purchase-card p{flex:1;margin:0;color:#4d6178;font-size:12px;line-height:1.6}
          .sq-purchase-card-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:17px;padding-top:12px;border-top:1px solid rgba(40,65,95,.12)}
          .sq-purchase-card-foot span{font-size:9px;font-weight:800;letter-spacing:.06em;color:#52677f}
          .sq-purchase-card-foot svg{color:#1d5fd1;transition:transform .18s}.sq-purchase-card:hover .sq-purchase-card-foot svg{transform:translateX(3px)}
          .sq-purchase-shortcuts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
          .sq-purchase-shortcut{display:flex;align-items:center;gap:12px;min-width:0;padding:14px;border:1px solid #e0e7f0;border-radius:13px;background:#fff;text-align:left;cursor:pointer;transition:border-color .18s,transform .18s,box-shadow .18s}
          .sq-purchase-shortcut:hover{transform:translateY(-2px);border-color:#b9d5f5;box-shadow:0 7px 18px rgba(15,35,65,.06)}
          .sq-purchase-shortcut-icon{display:grid;place-items:center;flex:0 0 40px;height:40px;border-radius:12px;background:#eff6ff;color:#1d5fd1}
          .sq-purchase-shortcut.orange .sq-purchase-shortcut-icon{background:#fff4e8;color:#c56a1a}.sq-purchase-shortcut.green .sq-purchase-shortcut-icon{background:#eaf8f0;color:#168653}.sq-purchase-shortcut.teal .sq-purchase-shortcut-icon{background:#e6f9fb;color:#12889b}
          .sq-purchase-shortcut strong{display:block;color:#173452;font-size:12px;font-weight:750}.sq-purchase-shortcut small{display:block;margin-top:4px;color:#687b90;font-size:10px;line-height:1.4}
          .sq-purchase-description{display:flex;align-items:flex-start;gap:13px;margin-top:18px;padding:17px 19px;border:1px solid #e0e7f0;border-radius:15px;background:linear-gradient(110deg,#fff,#f9fbff)}
          .sq-purchase-description-icon{display:grid;place-items:center;flex:0 0 38px;height:38px;border-radius:12px;background:#edf4ff;color:#1d5fd1}
          .sq-purchase-description h3{margin:1px 0 5px;color:#102c4e;font-size:13px;font-weight:750}.sq-purchase-description p{margin:0;color:#5b6f85;font-size:12px;line-height:1.65}
          .sq-purchase-footer{display:flex;justify-content:space-between;gap:12px;margin:12px 2px 0;color:#8190a3;font-size:10px}
          @media(max-width:1100px){.sq-purchase-grid,.sq-purchase-shortcuts{grid-template-columns:repeat(2,minmax(0,1fr))}.sq-purchase-card{min-height:200px}}
          @media(max-width:650px){.synqra-purchase-hub{padding:8px}.sq-purchase-hero{align-items:flex-start;flex-direction:column;padding:20px;border-radius:15px}.sq-purchase-brand{text-align:left}.sq-purchase-section-head{align-items:flex-start;flex-direction:column;margin-top:18px}.sq-purchase-grid,.sq-purchase-shortcuts{grid-template-columns:1fr}.sq-purchase-card{min-height:175px}.sq-purchase-footer{flex-direction:column}}
          @media(prefers-reduced-motion:reduce){.sq-purchase-card,.sq-purchase-shortcut,.sq-purchase-card-foot svg{transition:none}}
        `}</style>
        <div className="sq-purchase-wrap">
          <header className="sq-purchase-hero">
            <div>
              <div className="sq-purchase-eyebrow"><ShoppingCart size={15} /> Central operacional • Suprimentos industriais</div>
              <h1>Compras e Suprimentos</h1>
              <p>Da necessidade de material ao pedido e recebimento: organize as etapas de compra com rastreabilidade, aprovações e integração com os demais módulos do ERP.</p>
            </div>
            <div className="sq-purchase-brand"><strong>SYSNQRA ERP INDUSTRIAL</strong><span>GESTÃO INTEGRADA</span></div>
          </header>
          <section aria-labelledby="sq-purchase-main-title">
            <div className="sq-purchase-section-head"><div><h2 id="sq-purchase-main-title">Escolha uma área de Compras</h2><p>Acesse diretamente a rotina que você precisa executar.</p></div><small>4 áreas principais</small></div>
            <div className="sq-purchase-grid">
              {mainCards.map(({title,description,detail,route,Icon,tone}) => <button key={title} type="button" className={`sq-purchase-card ${tone}`} onClick={() => navigate(route)} aria-label={`Abrir ${title}`}>
                <span className="sq-purchase-icon"><Icon size={23} strokeWidth={1.9}/></span>
                <h3>{title}</h3><p>{description}</p>
                <span className="sq-purchase-card-foot"><span>{detail}</span><ArrowRight size={17}/></span>
              </button>)}
            </div>
          </section>
          <section aria-labelledby="sq-purchase-shortcuts-title">
            <div className="sq-purchase-section-head"><div><h2 id="sq-purchase-shortcuts-title">Outras rotinas</h2><p>Atalhos para conferência, análise e acompanhamento.</p></div></div>
            <div className="sq-purchase-shortcuts">
              {shortcuts.map(({title,description,route,Icon,tone}) => <button key={title} type="button" className={`sq-purchase-shortcut ${tone}`} onClick={() => navigate(route)}>
                <span className="sq-purchase-shortcut-icon"><Icon size={20}/></span><span><strong>{title}</strong><small>{description}</small></span><ArrowRight size={15}/>
              </button>)}
            </div>
          </section>
          <section className="sq-purchase-description" aria-labelledby="sq-purchase-description-title">
            <span className="sq-purchase-description-icon"><Users size={20}/></span>
            <div><h3 id="sq-purchase-description-title">Descrição da tela</h3><p>Central operacional para controlar o ciclo de compras industriais, desde a necessidade de material até o pedido e o recebimento, com rastreabilidade, aprovações e integração com estoque e financeiro.</p></div>
          </section>
          <footer className="sq-purchase-footer"><span>SYSNQRA ERP INDUSTRIAL • Compras e Suprimentos</span><span>As rotinas usam os cadastros, permissões e registros reais já existentes no sistema.</span></footer>
        </div>
      </main>
    </VendasLayout>
  )
}
