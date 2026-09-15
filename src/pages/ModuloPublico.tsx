import { ArrowRight, BarChart3, Boxes, ClipboardCheck, Factory, Receipt, Wrench } from 'lucide-react'

type ModuleKey = 'pcp' | 'estoque' | 'qualidade' | 'manutencao' | 'fiscal' | 'indicadores'

const content: Record<ModuleKey, { title: string; eyebrow: string; icon: typeof Factory; summary: string; features: string[]; route: string }> = {
  pcp: {
    title: 'PCP e Produção', eyebrow: 'PLANEJAMENTO E CONTROLE DA PRODUÇÃO', icon: Factory,
    summary: 'Centraliza planejamento, ordens de produção, capacidade, materiais, sequenciamento e acompanhamento do chão de fábrica em um único fluxo.',
    features: ['Planejamento e programação das ordens de produção', 'Acompanhamento do andamento das ordens e etapas', 'Necessidades de materiais conectadas ao estoque', 'Apontamentos, perdas, paradas e produtividade', 'Rastreabilidade do pedido até a produção'], route: '/pcp'
  },
  estoque: {
    title: 'Estoque e Materiais', eyebrow: 'MATERIAIS E RASTREABILIDADE', icon: Boxes,
    summary: 'Controla saldos, entradas, saídas, movimentações e necessidades de materiais, mantendo o histórico ligado à operação da empresa.',
    features: ['Cadastro e controle de materiais e produtos', 'Saldos e movimentações por empresa', 'Rastreabilidade das movimentações', 'Integração com necessidades da produção', 'Visão operacional para compras, estoque e expedição'], route: '/produtos-vendas'
  },
  qualidade: {
    title: 'Qualidade', eyebrow: 'SGQ E MELHORIA CONTÍNUA', icon: ClipboardCheck,
    summary: 'Estrutura o Sistema de Gestão da Qualidade com não conformidades, RPNC, auditorias, ações, documentos controlados e evidências.',
    features: ['RPNC e tratamento de não conformidades', 'RPN/FMEA e análise de risco', 'Auditorias e planos de ação', 'CAPA e acompanhamento das ações corretivas', 'Documentos e procedimentos controlados com rastreabilidade'], route: '/qualidade'
  },
  manutencao: {
    title: 'Manutenção', eyebrow: 'ATIVOS E CONFIABILIDADE', icon: Wrench,
    summary: 'Organiza máquinas, equipamentos, manutenção preventiva e corretiva e o histórico operacional dos ativos industriais.',
    features: ['Cadastro e acompanhamento de equipamentos', 'Manutenção preventiva e corretiva', 'Histórico das intervenções', 'Controle de ocorrências e serviços executados', 'Integração da manutenção com a operação industrial'], route: '/operacao-industrial'
  },
  fiscal: {
    title: 'Financeiro e Fiscal', eyebrow: 'CONTROLE FINANCEIRO E FISCAL', icon: Receipt,
    summary: 'Conecta os processos fiscais e financeiros aos movimentos do ERP para reduzir retrabalho e manter os reflexos da operação registrados.',
    features: ['Processos fiscais do ERP', 'Visão financeira da operação', 'Reflexos dos movimentos da empresa', 'Acompanhamento de previsão e fluxo de caixa', 'Base preparada para evolução dos processos fiscais'], route: '/fiscal'
  },
  indicadores: {
    title: 'Indicadores', eyebrow: 'GESTÃO E PERFORMANCE', icon: BarChart3,
    summary: 'Transforma os dados dos módulos em visão gerencial para acompanhar produção, qualidade, estoque e desempenho da empresa.',
    features: ['Indicadores operacionais e gerenciais', 'Acompanhamento de produção e desempenho', 'Visão integrada de qualidade e estoque', 'Dados vinculados à empresa autenticada', 'Base para decisões orientadas por dados'], route: '/erp-industrial'
  }
}

export default function ModuloPublico({ module }: { module: ModuleKey }) {
  const item = content[module]
  const Icon = item.icon
  return <main className="module-public-page">
    <header className="module-public-header">
      <a href="/" className="module-public-brand"><img src="/logo-industrial.svg" alt="SGQ ERP" /></a>
      <nav><a href="/#modulos">Módulos</a><a href="/blog">Blog</a><a href="/contato">Contato</a></nav>
      <a className="module-public-login" href={`/login?returnTo=${encodeURIComponent(item.route)}`}>Entrar <ArrowRight size={17}/></a>
    </header>
    <section className="module-public-hero">
      <div className="module-public-copy">
        <span className="public-kicker">{item.eyebrow}</span>
        <h1>{item.title}</h1>
        <p>{item.summary}</p>
        <div className="module-public-actions">
          <a className="public-primary" href={`/login?returnTo=${encodeURIComponent(item.route)}`}>Entrar e abrir módulo <ArrowRight size={18}/></a>
          <a className="public-secondary" href="/#modulos">Ver todos os módulos</a>
        </div>
      </div>
      <div className="module-public-symbol"><Icon size={64}/><strong>{item.title}</strong><span>SGQ ERP Industrial</span></div>
    </section>
    <section className="module-public-content">
      <div><span className="public-kicker">O QUE ESTE MÓDULO FAZ</span><h2>Processos que ficam dentro do ERP.</h2><p>Esta apresentação é pública para que o cliente entenda o módulo antes do acesso. Os dados operacionais permanecem protegidos pela autenticação e pelas regras de acesso do ERP.</p></div>
      <div className="module-feature-grid">{item.features.map((feature, index) => <article key={feature}><b>{String(index + 1).padStart(2, '0')}</b><span>{feature}</span></article>)}</div>
    </section>
  </main>
}
