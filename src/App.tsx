import { useMemo, useState } from 'react'
import { Activity, BarChart3, Boxes, ClipboardCheck, Factory, Gauge, Menu, Package, Settings, ShoppingCart, Truck, Wrench, X } from 'lucide-react'

const modules = [
  ['Dashboard', Gauge], ['Engenharia / BOM', Boxes], ['MRP e Planejamento', BarChart3], ['Produção / OP', Factory],
  ['Estoque / WMS', Package], ['Compras / Fornecedores', Truck], ['Vendas / CRM', ShoppingCart], ['Qualidade / QMS', ClipboardCheck],
  ['Manutenção / CMMS', Wrench], ['Indicadores / OEE', Activity], ['Configurações', Settings],
] as const

export default function App() {
  const [active, setActive] = useState('Dashboard')
  const [open, setOpen] = useState(false)
  const Icon = useMemo(() => modules.find(([name]) => name === active)?.[1] ?? Gauge, [active])

  return <div className="app-shell">
    <aside className={open ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><Factory size={28}/><div><strong>ERP Industrial</strong><span>Plataforma de gestão</span></div></div>
      <nav>{modules.map(([name, ItemIcon]) => <button key={name} className={active === name ? 'nav-item active' : 'nav-item'} onClick={() => { setActive(name); setOpen(false) }}><ItemIcon size={19}/><span>{name}</span></button>)}</nav>
    </aside>
    <main className="main">
      <header className="topbar"><button className="mobile-menu" onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button><div><span className="eyebrow">OPERAÇÃO INDUSTRIAL</span><h1>{active}</h1></div><div className="status"><span className="dot"/> Sistema operacional</div></header>
      <section className="content">
        <div className="hero"><div><span className="eyebrow">VISÃO EXECUTIVA</span><h2>Controle sua indústria em um único lugar.</h2><p>Produção, materiais, qualidade, manutenção, custos e indicadores conectados.</p></div><Icon size={54}/></div>
        <div className="cards"><Metric title="Produção hoje" value="0" note="OPs em execução"/><Metric title="OEE" value="—" note="Aguardando dados"/><Metric title="Qualidade" value="100%" note="Sem registros ainda"/><Metric title="Estoque" value="0" note="Itens cadastrados"/></div>
        <div className="panel"><h3>{active}</h3><p>O módulo está preparado para receber dados reais do Supabase, com autenticação, permissões, auditoria e rastreabilidade por empresa.</p><div className="module-grid"><span>✓ Multiempresa</span><span>✓ Rastreabilidade</span><span>✓ Controle por perfil</span><span>✓ Auditoria</span></div></div>
      </section>
    </main>
  </div>
}

function Metric({title,value,note}:{title:string,value:string,note:string}) { return <div className="metric"><span>{title}</span><strong>{value}</strong><small>{note}</small></div> }
