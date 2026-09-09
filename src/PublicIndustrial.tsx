import { ArrowRight, BarChart3, Boxes, Check, Factory, Gauge, Package, ShieldCheck, ShoppingCart, Wrench } from 'lucide-react'
import AppIndustrial from './AppIndustrial'
import './styles/public-industrial.css'

const plans = [
  { name: 'Essencial', price: 'R$ 199', description: 'Para pequenas indústrias que querem sair das planilhas.', features: ['Dashboard executivo', 'Estoque e materiais', 'Compras e fornecedores', 'Produção e OP', 'Cadastros e histórico'] },
  { name: 'Profissional', price: 'R$ 349', description: 'Para operações que precisam integrar PCP, qualidade e manutenção.', featured: true, features: ['Tudo do Essencial', 'MRP e planejamento', 'PCP e agenda de máquinas', 'Qualidade / RPNC', 'Manutenção / CMMS', 'Indicadores e OEE'] },
  { name: 'Diamante', price: 'R$ 549', description: 'Para empresas com gestão avançada e visão completa da fábrica.', features: ['Tudo do Profissional', 'Painel Master / multiempresa', 'Gestão de permissões', 'Indicadores executivos', 'Auditoria e rastreabilidade', 'Integrações e expansão'] },
]

const modules = [
  ['Produção', Factory, 'Ordens de produção, processos e apontamentos.'],
  ['Estoque / WMS', Package, 'Materiais, produtos, lotes e disponibilidade.'],
  ['MRP / PCP', Gauge, 'Planejamento de necessidades e capacidade.'],
  ['Qualidade', ShieldCheck, 'RPNC, ações, evidências e rastreabilidade.'],
  ['Manutenção', Wrench, 'Máquinas, ordens e histórico de manutenção.'],
  ['Compras / Vendas', ShoppingCart, 'Fornecedores, clientes e fluxo comercial.'],
]

export default function PublicIndustrial() {
  // A raiz é uma vitrine pública e não depende de Supabase/Auth para renderizar.
  // O sistema autenticado fica exclusivamente em /login e nas rotas do AppIndustrial.
  if (window.location.pathname === '/login') return <AppIndustrial />

  return (
    <div className="public-industrial">
      <header className="public-nav">
        <a href="/" className="public-brand"><img src="/logo-industrial.svg" alt="SGQ ERP" /><span>SGQ ERP</span></a>
        <nav><a href="#recursos">Recursos</a><a href="#planos">Planos</a><a href="#como-funciona">Como funciona</a></nav>
        <a href="/login" className="nav-login">Entrar <ArrowRight size={16} /></a>
      </header>

      <main>
        <section className="public-hero">
          <div className="hero-copy">
            <span className="public-kicker">SISTEMA DE GESTÃO INDUSTRIAL</span>
            <h1>A fábrica inteira conectada em uma única plataforma.</h1>
            <p>Produção, PCP, MRP, estoque, compras, qualidade, manutenção, vendas e indicadores trabalhando juntos para você decidir com dados reais.</p>
            <div className="hero-actions"><a className="public-primary" href="#planos">Conhecer os planos <ArrowRight size={18} /></a><a className="public-secondary" href="/login">Já sou cliente</a></div>
            <div className="hero-proof"><span><Check size={16} /> 15 dias para testar</span><span><Check size={16} /> Acesso pelo computador e celular</span><span><Check size={16} /> Dados protegidos por Supabase Auth + RLS</span></div>
          </div>
          <div className="dashboard-preview" aria-label="Prévia do painel do ERP Industrial">
            <div className="preview-top"><div><span>VISÃO EXECUTIVA</span><strong>Controle da fábrica</strong></div><span className="preview-status">● Conectado</span></div>
            <div className="preview-metrics"><PreviewMetric title="Ordens abertas" value="24" /><PreviewMetric title="OEE" value="87%" /><PreviewMetric title="Estoque" value="R$ 184 mil" /><PreviewMetric title="Qualidade" value="03" /></div>
            <div className="preview-chart"><div className="chart-title"><span>Desempenho da operação</span><BarChart3 size={18} /></div><div className="fake-bars">{[48, 72, 55, 88, 68, 94, 78, 100].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div></div>
            <div className="preview-grid"><span><Factory size={16} /> Produção em fluxo</span><span><Boxes size={16} /> Materiais controlados</span><span><ShieldCheck size={16} /> Qualidade monitorada</span><span><Gauge size={16} /> Indicadores em tempo real</span></div>
          </div>
        </section>

        <section id="recursos" className="public-section"><div className="section-heading"><span className="public-kicker">GESTÃO INTEGRADA</span><h2>Do pedido ao produto acabado.</h2><p>Uma estrutura única para acompanhar a operação industrial sem depender de planilhas espalhadas.</p></div><div className="module-cards">{modules.map(([name, Icon, text]) => <article className="module-card" key={String(name)}><div className="module-icon"><Icon size={22} /></div><h3>{String(name)}</h3><p>{String(text)}</p></article>)}</div></section>

        <section id="como-funciona" className="public-section workflow"><div className="section-heading"><span className="public-kicker">COMO FUNCIONA</span><h2>Uma sequência operacional clara.</h2></div><div className="workflow-grid"><Workflow n="01" title="Planeje" text="Estruture produtos, fichas, processos, demanda e necessidades de materiais." /><Workflow n="02" title="Produza" text="Transforme planejamento em OPs, processos, apontamentos e rastreabilidade." /><Workflow n="03" title="Controle" text="Acompanhe estoque, qualidade, manutenção, custos e indicadores." /></div></section>

        <section id="planos" className="public-section plans-section"><div className="section-heading"><span className="public-kicker">PLANOS</span><h2>Escolha o nível de gestão da sua indústria.</h2><p>Comece pequeno e evolua conforme sua operação cresce.</p></div><div className="plans-grid">{plans.map(plan => <article className={plan.featured ? 'plan-card featured' : 'plan-card'} key={plan.name}>{plan.featured && <span className="plan-badge">MAIS COMPLETO</span>}<h3>{plan.name}</h3><p>{plan.description}</p><strong>{plan.price}<small>/mês</small></strong><a href="/login">Começar teste <ArrowRight size={16} /></a><ul>{plan.features.map(feature => <li key={feature}><Check size={16} /> {feature}</li>)}</ul></article>)}</div></section>
      </main>

      <footer className="public-footer"><img src="/logo-industrial.svg" alt="SGQ ERP" /><span>FernandoSch_System • SGQ ERP • Sistema de Gestão Industrial</span><a href="/login">Acessar sistema</a></footer>
    </div>
  )
}

function PreviewMetric({ title, value }: { title: string; value: string }) { return <div><span>{title}</span><strong>{value}</strong></div> }
function Workflow({ n, title, text }: { n: string; title: string; text: string }) { return <article className="workflow-card"><span>{n}</span><h3>{title}</h3><p>{text}</p></article> }
