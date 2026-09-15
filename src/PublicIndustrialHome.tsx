import { ArrowRight, Check, Factory, ShieldCheck, Smartphone, Boxes, ClipboardCheck, Wrench, BarChart3, Receipt, Workflow, Mail, PackageCheck } from 'lucide-react'

const modules = [
  ['PCP e Produção', 'Planejamento, ordens, sequenciamento e acompanhamento do chão de fábrica.', '/pcp', Factory],
  ['Estoque e Materiais', 'Saldos, movimentações, rastreabilidade e necessidades de materiais.', '/produtos-vendas', Boxes],
  ['Recebimento de Materiais', 'Importe o XML da NF-e, confira os itens e distribua quantidades por múltiplos lotes.', '/recebimento-materiais', PackageCheck],
  ['Qualidade', 'RPNC, auditorias, ações, documentos e rastreabilidade da qualidade.', '/qualidade', ClipboardCheck],
  ['Manutenção', 'Máquinas, manutenção preventiva, corretiva e histórico operacional.', '/operacao-industrial', Wrench],
  ['Financeiro e Fiscal', 'Visão financeira e preparação dos processos fiscais do ERP.', '/fiscal', Receipt],
  ['Indicadores', 'Acompanhe produção, qualidade, estoque e desempenho com dados do sistema.', '/erp-industrial', BarChart3],
] as const

export default function PublicIndustrialHome() {
  return <div className="public-industrial home-v2">
    <header className="public-nav">
      <a href="/" className="public-brand" aria-label="SGQ ERP"><img src="/logo-industrial.svg" alt="SGQ ERP" /></a>
      <nav aria-label="Navegação principal"><a href="#modulos">Módulos</a><a href="#fluxo">Fluxo</a><a href="#seguranca">Segurança</a><a href="/blog">Blog</a><a href="/contato">Contato</a></nav>
      <div className="public-nav-actions"><a className="nav-contact" href="/contato"><Mail size={16}/> Fale conosco</a><a className="nav-login" href="/login">Entrar <ArrowRight size={17}/></a></div>
    </header>
    <main>
      <section className="public-hero">
        <div className="hero-copy"><span className="public-kicker">SGQ ERP • GESTÃO INDUSTRIAL</span><h1>Gestão industrial de ponta a ponta, em um único sistema.</h1><p>PCP, produção, estoque, qualidade, manutenção, financeiro e fiscal conectados aos mesmos dados da sua empresa.</p><div className="hero-actions"><a className="public-primary" href="/cadastro-empresa">Começar teste grátis <ArrowRight size={18}/></a><a className="public-secondary" href="/login">Já sou cliente</a></div><div className="hero-proof"><span><Check size={16}/> Dados separados por empresa</span><span><Smartphone size={16}/> Responsivo</span><span><ShieldCheck size={16}/> Auth + RLS</span></div></div>
        <div className="dashboard-preview"><span className="public-kicker">FLUXO INDUSTRIAL</span><h3>Um processo conectado</h3><div className="preview-flow"><b>Pedido</b><i>→</i><b>PCP</b><i>→</i><b>Produção</b><i>→</i><b>Qualidade</b></div><div className="preview-flow"><b>Estoque</b><i>→</i><b>Expedição</b><i>→</i><b>Fiscal</b><i>→</i><b>Financeiro</b></div><small>Os indicadores dentro do ERP são alimentados pelo banco da empresa autenticada.</small></div>
      </section>
      <section id="modulos" className="public-section"><div className="section-heading"><span className="public-kicker">MÓDULOS</span><h2>O ERP acompanha a operação real da fábrica.</h2><p>Os módulos abaixo levam para as respectivas áreas protegidas. Se você ainda não estiver autenticado, o sistema encaminha para o login e depois retorna ao módulo solicitado.</p></div><div className="module-cards">{modules.map(([title,desc,href,Icon]) => <article className="module-card resource-card" key={title}><div className="module-icon"><Icon size={22}/></div><h3>{title}</h3><p>{desc}</p><a className="public-link" href={href}>Abrir módulo <ArrowRight size={15}/></a></article>)}</div></section>
      <section id="fluxo" className="public-section automation-flow"><div className="section-heading"><span className="public-kicker">FLUXO INTEGRADO</span><h2>Do pedido ao resultado.</h2><p>Elimine redigitação e mantenha rastreabilidade entre departamentos.</p></div><div className="flow-steps"><Flow n="01" t="Pedido" d="Entrada comercial e cadastro do cliente/produto."/><Flow n="02" t="PCP" d="Planejamento, capacidade, materiais e ordens."/><Flow n="03" t="Produção" d="Apontamentos, perdas, paradas e acompanhamento."/><Flow n="04" t="Qualidade" d="Inspeções, RPNC, ações e evidências."/><Flow n="05" t="Expedição" d="Estoque, movimentações e rastreabilidade."/><Flow n="06" t="Fiscal / Financeiro" d="Processos fiscais e reflexos financeiros."/></div></section>
      <section id="seguranca" className="public-section"><div className="section-heading"><span className="public-kicker">SEGURANÇA</span><h2>Cada empresa vê somente seus próprios dados.</h2><p>Supabase Auth, vínculo usuário/empresa, controle de acesso e RLS no banco.</p></div><div className="automation-cards"><Card t="Autenticação" d="Sessão persistente e validação antes das áreas protegidas."/><Card t="Multiempresa" d="Empresa e usuário são validados no backend."/><Card t="RLS" d="O banco aplica isolamento por empresa nas tabelas protegidas."/><Card t="Auditoria" d="Operações administrativas podem ser rastreadas."/></div></section>
    </main>
    <footer className="public-footer"><img src="/logo-industrial.svg" alt="SGQ ERP"/><span>SGQ ERP • Gestão Industrial</span><div><a href="/blog">Blog</a><a href="/contato">Contato</a><a href="/login">Acessar sistema</a></div></footer>
  </div>
}
function Card({t,d}:{t:string;d:string}) { return <article className="automation-card"><Workflow size={22}/><h3>{t}</h3><p>{d}</p></article> }
function Flow({n,t,d}:{n:string;t:string;d:string}) { return <article className="flow-step"><b>{n}</b><h3>{t}</h3><p>{d}</p></article> }
