import { ArrowLeft, ArrowRight, BarChart3, Boxes, ClipboardCheck, Factory, PackageCheck, Receipt, Wrench } from 'lucide-react'

type ModuleKey = 'pcp' | 'estoque' | 'recebimento' | 'qualidade' | 'manutencao' | 'fiscal' | 'indicadores'

type ModuleInfo = {
  title: string
  eyebrow: string
  description: string
  functionality: string[]
  flow: string[]
  indicators: string[]
  integrations: string[]
  route: string
  Icon: typeof Factory
}

const modules: Record<ModuleKey, ModuleInfo> = {
  pcp: { title: 'PCP e Produção', eyebrow: 'PLANEJAMENTO E CHÃO DE FÁBRICA', description: 'Planeje ordens, capacidade, sequenciamento e acompanhamento da produção em um fluxo único.', functionality: ['Ordens de produção e programação', 'Máquinas, moldes, operadores e recursos', 'Apontamentos, paradas, setup e perdas', 'Finalização, lotes e rastreabilidade'], flow: ['Planejamento', 'Programação', 'Produção', 'Apontamento', 'Qualidade', 'Fechamento'], indicators: ['Produção realizada', 'Perdas e paradas', 'Eficiência operacional', 'OEE'], integrations: ['Produtos e materiais', 'Qualidade', 'Estoque', 'Indicadores'], route: '/pcp', Icon: Factory },
  estoque: { title: 'Estoque e Materiais', eyebrow: 'MATERIAIS E RASTREABILIDADE', description: 'Controle saldos, movimentações, necessidades e rastreabilidade dos materiais usados pela operação.', functionality: ['Cadastro e consulta de itens', 'Entradas, saídas e ajustes', 'Saldos por empresa e localização', 'Rastreabilidade e integração com produção'], flow: ['Necessidade', 'Entrada', 'Armazenagem', 'Consumo', 'Saldo', 'Inventário'], indicators: ['Saldo disponível', 'Itens críticos', 'Movimentações', 'Giro de estoque'], integrations: ['PCP e produção', 'Recebimento', 'Compras', 'Indicadores'], route: '/produtos-vendas', Icon: Boxes },
  recebimento: { title: 'Recebimento de Materiais', eyebrow: 'ENTRADA DE MATERIAIS', description: 'Centralize o recebimento de materiais, conferência fiscal e distribuição dos itens por lote.', functionality: ['Importação e conferência de NF-e XML', 'Conferência de itens e quantidades', 'Distribuição por múltiplos lotes', 'Registro do recebimento para estoque e rastreabilidade'], flow: ['NF-e', 'Conferência', 'Lotes', 'Recebimento', 'Estoque', 'Rastreabilidade'], indicators: ['Recebimentos pendentes', 'Divergências', 'Itens recebidos', 'Lotes gerados'], integrations: ['Estoque', 'Fiscal', 'Fornecedores', 'Rastreabilidade'], route: '/recebimento-materiais', Icon: PackageCheck },
  qualidade: { title: 'Qualidade', eyebrow: 'SGQ E CONFORMIDADE', description: 'Gerencie não conformidades, auditorias, ações e documentos mantendo evidências e rastreabilidade.', functionality: ['RPNC e não conformidades', 'Auditorias e evidências', 'Ações corretivas e CAPA', 'Documentos e procedimentos controlados'], flow: ['Ocorrência', 'Análise', 'Risco', 'Ação', 'Evidência', 'Verificação'], indicators: ['RPN aberto', 'Não conformidades', 'Ações vencidas', 'Auditorias'], integrations: ['Produção', 'Documentos', 'Auditorias', 'Indicadores'], route: '/qualidade', Icon: ClipboardCheck },
  manutencao: { title: 'Manutenção', eyebrow: 'ATIVOS E CONFIABILIDADE', description: 'Organize manutenção preventiva e corretiva, equipamentos, intervenções e histórico operacional.', functionality: ['Cadastro e controle de ativos', 'Manutenção preventiva e corretiva', 'Ordens e histórico de intervenções', 'Integração com máquinas e operação'], flow: ['Ativo', 'Plano', 'Ordem', 'Execução', 'Apontamento', 'Histórico'], indicators: ['Ordens abertas', 'Preventivas pendentes', 'Paradas', 'Disponibilidade'], integrations: ['Máquinas', 'PCP', 'Produção', 'Indicadores'], route: '/operacao-industrial', Icon: Wrench },
  fiscal: { title: 'Financeiro e Fiscal', eyebrow: 'CONTROLE FINANCEIRO E FISCAL', description: 'Conecte os reflexos financeiros e fiscais das operações realizadas no ERP.', functionality: ['Processos e documentos fiscais', 'Previsão e acompanhamento financeiro', 'Integração dos eventos da operação', 'Consultas e indicadores gerenciais'], flow: ['Operação', 'Documento', 'Fiscal', 'Financeiro', 'Conciliação', 'Indicador'], indicators: ['Valores processados', 'Pendências fiscais', 'Previsões', 'Movimentações'], integrations: ['Recebimento', 'Vendas', 'Financeiro', 'Relatórios'], route: '/fiscal', Icon: Receipt },
  indicadores: { title: 'Indicadores', eyebrow: 'GESTÃO E PERFORMANCE', description: 'Transforme os dados dos módulos em indicadores para acompanhamento da fábrica.', functionality: ['Indicadores de produção e PCP', 'Qualidade e não conformidades', 'Estoque e materiais', 'Desempenho operacional e gestão'], flow: ['Dados', 'Consolidação', 'Indicador', 'Análise', 'Ação', 'Resultado'], indicators: ['Produção', 'Qualidade', 'Estoque', 'Performance'], integrations: ['Todos os módulos', 'Dashboards', 'Relatórios', 'Gestão'], route: '/erp-industrial', Icon: BarChart3 },
}

export default function ModuleOverviewIndustrial({ module }: { module: ModuleKey }) {
  const item = modules[module]
  const Icon = item.Icon

  return (
    <main className="module-overview-page">
      <div className="module-overview-shell">
        <a className="module-back" href="/"><ArrowLeft size={17} /> Voltar ao site</a>
        <section className="module-hero">
          <div className="module-hero-main">
            <span className="module-eyebrow">{item.eyebrow}</span>
            <div className="module-title-row"><span className="module-icon"><Icon size={30} /></span><h1>{item.title}</h1></div>
            <p className="module-description">{item.description}</p>
            <div className="module-actions"><a className="module-primary" href={item.route}>Entrar no módulo <ArrowRight size={17} /></a><a className="module-secondary" href="/login">Acessar o ERP</a></div>
          </div>
          <aside className="module-flow-card"><span className="module-card-kicker">FLUXO OPERACIONAL</span><h2>Como o módulo trabalha</h2><ol>{item.flow.map((step, index) => <li key={step}><b>{String(index + 1).padStart(2, '0')}</b><span>{step}</span></li>)}</ol></aside>
        </section>
        <section className="module-grid">
          <article className="module-card"><span>01</span><h2>O que você faz aqui</h2><ul>{item.functionality.map(value => <li key={value}>{value}</li>)}</ul></article>
          <article className="module-card"><span>02</span><h2>Indicadores</h2><ul>{item.indicators.map(value => <li key={value}>{value}</li>)}</ul></article>
          <article className="module-card"><span>03</span><h2>Integrações</h2><ul>{item.integrations.map(value => <li key={value}>{value}</li>)}</ul></article>
        </section>
        <section className="module-bottom-cta"><div><span className="module-eyebrow">DADOS REAIS • EMPRESA AUTENTICADA</span><h2>Pronto para operar dentro do ERP?</h2><p>A apresentação é pública. A operação real permanece protegida pelo Supabase Auth, permissões e RLS da empresa autenticada.</p></div><a className="module-primary" href={item.route}>Abrir área protegida <ArrowRight size={17} /></a></section>
      </div>
    </main>
  )
}
