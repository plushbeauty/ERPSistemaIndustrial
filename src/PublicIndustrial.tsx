import { ArrowRight, BarChart3, Boxes, Check, Factory, Gauge, Package, ShieldCheck, ShoppingCart, Wrench, X } from 'lucide-react'
import { useState } from 'react'

const plans = [
  { name: 'Essencial', price: 'R$ 199', description: 'Para pequenas indústrias que querem organizar a operação.', features: ['Dashboard executivo', 'Estoque e materiais', 'Compras e fornecedores', 'Produção e OP', 'Cadastros e histórico'], missing: ['MRP avançado', 'PCP e agenda de máquinas', 'Qualidade / RPNC', 'Manutenção / CMMS', 'OEE e indicadores avançados', 'Painel Master / multiempresa', 'Integrações fiscais'], featured: false },
  { name: 'Profissional', price: 'R$ 349', description: 'Para operações que precisam integrar planejamento e chão de fábrica.', features: ['Tudo do Essencial', 'MRP e planejamento', 'PCP e agenda de máquinas', 'Qualidade / RPNC', 'Manutenção / CMMS', 'Indicadores e OEE'], missing: ['Painel Master / multiempresa', 'Auditoria executiva ampliada', 'Integrações avançadas'], featured: true },
  { name: 'Diamante', price: 'R$ 549', description: 'A gestão completa para empresas que querem enxergar toda a fábrica.', features: ['Tudo do Profissional', 'Painel Master / multiempresa', 'Gestão de permissões', 'Indicadores executivos', 'Auditoria e rastreabilidade', 'Integrações e expansão', 'Fiscal e documentos eletrônicos'], missing: [], featured: false },
]

const modules = [
  ['Produção', Factory, 'Ordens de produção, processos, apontamentos e rastreabilidade.'],
  ['Estoque / WMS', Package, 'Materiais, produtos, lotes, validade e disponibilidade.'],
  ['MRP / PCP', Gauge, 'Planejamento de necessidades, capacidade e agenda de máquinas.'],
  ['Qualidade', ShieldCheck, 'RPNC, ações corretivas, inspeções, evidências e histórico.'],
  ['Manutenção', Wrench, 'Máquinas, ordens, preventivas e histórico de manutenção.'],
  ['Compras / Vendas', ShoppingCart, 'Fornecedores, clientes, pedidos, vendas e fluxo comercial.'],
]

export default function PublicIndustrial() {
  const [helpOpen, setHelpOpen] = useState(false)
  return <div className="public-industrial">
    <header className="public-nav">
      <a href="/" className="public-brand"><img src="/logo-industrial.svg" alt="SGQ ERP" /></a>
      <nav><a href="#recursos">Recursos</a><a href="#por-dentro">Por dentro</a><a href="#planos">Planos</a><a href="#como-funciona">Como funciona</a></nav>
      <a href="/login" className="nav-login">Entrar <ArrowRight size={16} /></a>
    </header>

    <main>
      <section className="public-hero">
        <div className="hero-copy">
          <span className="public-kicker">SISTEMA DE GESTÃO INDUSTRIAL</span>
          <h1>A fábrica inteira conectada em uma única plataforma.</h1>
          <p>Produção, PCP, MRP, estoque, compras, qualidade, manutenção, vendas, fiscal e indicadores trabalhando juntos para você decidir com dados reais.</p>
          <div className="hero-actions"><a className="public-primary" href="#planos">Conhecer os planos <ArrowRight size={18} /></a><a className="public-secondary" href="/login">Já sou cliente</a></div>
          <div className="hero-proof"><span><Check size={16} /> 15 dias para testar</span><span><Check size={16} /> Computador e celular</span><span><Check size={16} /> Supabase Auth + RLS</span></div>
        </div>
        <DashboardMock />
      </section>

      <section id="recursos" className="public-section"><div className="section-heading"><span className="public-kicker">GESTÃO INTEGRADA</span><h2>Do pedido ao produto acabado.</h2><p>Você vê exatamente quais recursos entram em cada nível do ERP — sem promessas genéricas.</p></div><div className="module-cards">{modules.map(([name, Icon, text]) => <article className="module-card" key={String(name)}><div className="module-icon"><Icon size={22} /></div><h3>{String(name)}</h3><p>{String(text)}</p></article>)}</div></section>

      <section id="por-dentro" className="public-section inside-section"><div className="section-heading"><span className="public-kicker">POR DENTRO DO SISTEMA</span><h2>Veja como o ERP aparece para quem usa.</h2><p>As telas abaixo são uma prévia visual do ambiente interno, com indicadores, produção, estoque e qualidade.</p></div><div className="inside-grid"><ScreenMock type="dashboard" title="Dashboard executivo" /><ScreenMock type="production" title="Produção / OP" /><ScreenMock type="stock" title="Estoque / WMS" /><ScreenMock type="quality" title="Qualidade / RPNC" /></div></section>

      <section className="public-section fiscal-preview"><div><span className="public-kicker">NOVO • FISCAL</span><h2>Nota fiscal integrada à rotina industrial.</h2><p>Prepare NF-e, importe o XML recebido da contabilidade, extraia automaticamente a chave de acesso de 44 dígitos e mantenha documento, protocolo e histórico vinculados à empresa.</p><ul><li><Check size={16}/> Importação de XML</li><li><Check size={16}/> Chave de acesso de 44 dígitos</li><li><Check size={16}/> Ambiente de homologação e produção</li><li><Check size={16}/> Rastreabilidade do documento</li></ul></div><div className="fiscal-card-preview"><div><span>NF-e</span><b>Documento eletrônico</b><em>Homologação</em></div><div className="fake-field"><small>Chave de acesso</small><strong>3526 0000 0000 0000 0000 5500 1000 0000 0000 0000 0000</strong></div><div className="fake-field"><small>Status</small><strong>Rascunho • aguardando autorização</strong></div></div></section>

      <section id="como-funciona" className="public-section workflow"><div className="section-heading"><span className="public-kicker">COMO FUNCIONA</span><h2>Uma sequência operacional clara.</h2></div><div className="workflow-grid"><Workflow n="01" title="Planeje" text="Estruture produtos, fichas, processos, demanda e necessidades de materiais." /><Workflow n="02" title="Produza" text="Transforme planejamento em OPs, processos, apontamentos e rastreabilidade." /><Workflow n="03" title="Controle" text="Acompanhe estoque, qualidade, manutenção, custos, fiscal e indicadores." /></div></section>

      <section id="planos" className="public-section plans-section"><div className="section-heading"><span className="public-kicker">PLANOS</span><h2>Escolha o nível de gestão da sua indústria.</h2><p>Compare o que você ganha e o que deixa de ter em cada plano. O Diamante libera a visão completa.</p></div><div className="plans-grid">{plans.map(plan => <article className={plan.featured ? 'plan-card featured' : 'plan-card'} key={plan.name}>{plan.featured && <span className="plan-badge">MAIS ESCOLHIDO</span>}<h3>{plan.name}</h3><p>{plan.description}</p><strong>{plan.price}<small>/mês</small></strong><a href="/login">Começar teste <ArrowRight size={16} /></a><div className="plan-list"><b>Você tem:</b><ul>{plan.features.map(feature => <li className="has" key={feature}><Check size={16} /> {feature}</li>)}</ul></div><div className="plan-list missing"><b>Você deixa de ter neste plano:</b>{plan.missing.length ? <ul>{plan.missing.map(feature => <li key={feature}><X size={15} /> {feature}</li>)}</ul> : <p className="all-access">Nada. Este é o pacote completo.</p>}</div></article>)}</div></section>
    </main>

    <footer className="public-footer"><img src="/logo-industrial.svg" alt="SGQ ERP" /><span>FernandoSch_System • SGQ ERP • Sistema de Gestão Industrial</span><a href="/login">Acessar sistema</a></footer>
    <button className="public-help" onClick={() => setHelpOpen(!helpOpen)}>{helpOpen ? <X size={19}/> : <span>?</span>}<b>Ajuda IA</b></button>{helpOpen && <div className="public-help-panel"><strong>Assistente SGQ ERP</strong><p>Posso explicar recursos, planos, módulos, fiscal, MRP, produção e estoque.</p><a href="#planos">Ver comparação dos planos</a><a href="#por-dentro">Ver telas por dentro</a><a href="/login">Acessar o ERP</a></div>}
  </div>
}

function DashboardMock() { return <div className="dashboard-preview"><div className="preview-top"><div><span>VISÃO EXECUTIVA</span><strong>Controle da fábrica</strong></div><span className="preview-status">● Conectado</span></div><div className="preview-metrics"><PreviewMetric title="Ordens abertas" value="24"/><PreviewMetric title="OEE" value="87%"/><PreviewMetric title="Estoque" value="R$ 184 mil"/><PreviewMetric title="Qualidade" value="03"/></div><div className="preview-chart"><div className="chart-title"><span>Desempenho da operação</span><BarChart3 size={18}/></div><div className="fake-bars">{[48,72,55,88,68,94,78,100].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div></div><div className="preview-grid"><span><Factory size={16}/> Produção em fluxo</span><span><Boxes size={16}/> Materiais controlados</span><span><ShieldCheck size={16}/> Qualidade monitorada</span><span><Gauge size={16}/> Indicadores em tempo real</span></div></div> }
function PreviewMetric({title,value}:{title:string;value:string}){return <div><span>{title}</span><strong>{value}</strong></div>}
function ScreenMock({type,title}:{type:string;title:string}){return <article className="screen-card"><div className="screen-bar"><b>{title}</b><span>● Online</span></div><div className="screen-body">{type==='dashboard'&&<><div className="mini-kpis"><i>OPs <b>24</b></i><i>OEE <b>87%</b></i><i>Estoque <b>R$ 184k</b></i></div><div className="mini-chart">{[30,62,46,82,58,91,73].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div></>}{type==='production'&&<><div className="mini-table"><span>OP-00482 <b>Em produção</b></span><span>Produto A <b>1.200 UN</b></span><span>Prensa 03 <b>02:14 h</b></span><span>Entrega <b>Hoje</b></span></div><div className="progress"><i style={{width:'72%'}}/></div></>}{type==='stock'&&<><div className="mini-table"><span>MAT-001 <b>Aço carbono</b></span><span>MAT-028 <b>Resina</b></span><span>PRD-104 <b>Produto acabado</b></span></div><div className="stock-bars"><i/><i/><i/><i/></div></>}{type==='quality'&&<><div className="quality-grid"><i>RPNC-031 <b>Aberta</b></i><i>RPNC-028 <b>Em ação</b></i><i>Inspeções <b>18</b></i><i>Rastreabilidade <b>100%</b></i></div></>}</div></article>}
function Workflow({n,title,text}:{n:string;title:string;text:string}){return <article className="workflow-card"><span>{n}</span><h3>{title}</h3><p>{text}</p></article>}
