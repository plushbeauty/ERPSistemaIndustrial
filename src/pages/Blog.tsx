import { useMemo, useState } from 'react'
import { ArrowRight, BookOpen, Factory, Package, ShieldCheck, Wrench, BarChart3, Boxes } from 'lucide-react'
import '../styles/login-blog-fix.css'

type Article = { category: string; title: string; excerpt: string }
const articles: Article[] = [
  { category:'PCP / MRP', title:'O que é MRP e como ele ajuda a indústria a planejar materiais?', excerpt:'Entenda como demanda, estoque, estrutura e prazo se transformam em necessidades de compra e produção.' },
  { category:'Estoque', title:'Gestão de estoque industrial: matéria-prima, lote e rastreabilidade', excerpt:'Como reduzir faltas, excesso e perdas mantendo cada movimentação vinculada ao processo.' },
  { category:'Qualidade', title:'Controle de qualidade industrial: da inspeção à não conformidade', excerpt:'Veja como conectar inspeções, ordens, lotes, desvios e ações corretivas em um único fluxo.' },
  { category:'Produção', title:'Como controlar uma Ordem de Produção do planejamento ao apontamento', excerpt:'Planejamento, execução, consumo, produção, refugo e encerramento sem depender de planilhas.' },
  { category:'Custos', title:'Custo industrial: o que realmente entra no custo de fabricação?', excerpt:'Material, mão de obra, máquina, energia, perdas, terceirização e custos indiretos.' },
  { category:'Manutenção', title:'Manutenção preventiva e corretiva: como evitar paradas inesperadas', excerpt:'Organize máquinas, ordens de manutenção, histórico e indicadores para aumentar a disponibilidade.' },
  { category:'Tecnologia', title:'ERP industrial: por que integrar produção, estoque e financeiro?', excerpt:'Dados conectados reduzem retrabalho e dão à gestão uma visão única da operação.' },
  { category:'Fiscal', title:'Reforma Tributária 2026: por que o ERP precisa estar preparado', excerpt:'Um panorama operacional para empresas que precisam manter processos e dados fiscais organizados.' },
  { category:'Gestão', title:'Dashboard industrial: quais indicadores realmente importam?', excerpt:'Transforme dados operacionais em decisões sobre produção, estoque, qualidade, prazo e custos.' },
]
const cats = ['Todos', ...Array.from(new Set(articles.map(a => a.category)))]
const icons: Record<string, typeof Factory> = { 'PCP / MRP': Factory, Estoque: Package, Qualidade: ShieldCheck, Produção: Boxes, Custos: BarChart3, Manutenção: Wrench, Tecnologia: Factory, Fiscal: BookOpen, Gestão: BarChart3 }

export default function Blog() {
  const [category, setCategory] = useState('Todos')
  const visible = useMemo(() => category === 'Todos' ? articles : articles.filter(a => a.category === category), [category])
  return <main className="blog-page">
    <header className="blog-nav"><a className="blog-brand" href="/"><img src="/logo-industrial.svg" alt="SGQ ERP" /></a><nav className="blog-nav-links"><a href="/">Início</a><a href="/#solucoes">Soluções</a><a href="/#segmentos">Segmentos</a><a href="/blog">Blog</a><a href="/#contato">Contato</a><a href="/login">Entrar</a></nav></header>
    <section className="blog-hero"><div className="blog-hero-inner"><div className="blog-kicker">BLOG INDUSTRIAL SGQ ERP</div><h1>Conhecimento para quem administra uma indústria</h1><p>Produção, PCP, MRP, estoque, qualidade, custos, manutenção, fiscal e tecnologia industrial — conteúdo prático para transformar gestão em resultado.</p></div></section>
    <section className="blog-container"><div className="blog-feature"><article className="blog-feature-main"><div className="blog-kicker">DESTAQUE • PCP / MRP</div><h2>ERP industrial: produção, estoque, PCP, qualidade e financeiro em um único fluxo</h2><p>Uma indústria eficiente não pode trabalhar com informações isoladas. O objetivo de um ERP industrial é conectar pedido, planejamento, materiais, produção, qualidade, estoque, expedição, fiscal e financeiro.</p><a className="read" href="#artigos">Ler conteúdos relacionados <ArrowRight size={16} /></a></article><aside className="blog-side"><div className="blog-side-card"><strong>Produção conectada</strong><p>Do planejamento à ordem de produção e ao apontamento.</p></div><div className="blog-side-card"><strong>Rastreabilidade</strong><p>Produto, lote, estoque e qualidade em uma mesma cadeia.</p></div></aside></div>
      <div className="blog-categories">{cats.map(c => <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div>
      <div id="artigos" className="blog-grid">{visible.map(a => { const Icon = icons[a.category] ?? Factory; return <article className="blog-card" key={a.title}><Icon size={25} /><span className="blog-tag">{a.category}</span><h3>{a.title}</h3><p>{a.excerpt}</p><span className="read">Em breve <ArrowRight size={15} /></span></article> })}</div>
      <div className="blog-cta"><div><h2>Veja como esses processos funcionam no SGQ ERP</h2><p>Uma plataforma pensada para integrar a operação industrial.</p></div><a href="/login">Conhecer o sistema <ArrowRight size={17} /></a></div>
    </section>
  </main>
}
