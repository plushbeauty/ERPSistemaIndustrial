import { ArrowLeft, ArrowRight, BarChart3, Boxes, ClipboardCheck, Factory, PackageCheck, Receipt, Wrench } from 'lucide-react'

type ModuleKey = 'pcp' | 'estoque' | 'recebimento' | 'qualidade' | 'manutencao' | 'fiscal' | 'indicadores'

type ModuleInfo = {
  title: string
  eyebrow: string
  description: string
  functionality: string[]
  flow: string[]
  indicators: string[]
  route: string
  Icon: typeof Factory
}

const modules: Record<ModuleKey, ModuleInfo> = {
  pcp: { title: 'PCP e Produção', eyebrow: 'PLANEJAMENTO E CHÃO DE FÁBRICA', description: 'Planeje ordens, capacidade, sequenciamento e acompanhamento da produção em um fluxo único.', functionality: ['Ordens de produção e programação', 'Máquinas, moldes, operadores e recursos', 'Apontamentos, paradas, setup e perdas', 'Finalização, lotes e rastreabilidade'], flow: ['Planejamento', 'Programação', 'Produção', 'Apontamento', 'Qualidade', 'Fechamento'], indicators: ['Produção realizada', 'Perdas e paradas', 'Eficiência operacional', 'OEE'], route: '/pcp', Icon: Factory },
  estoque: { title: 'Estoque e Materiais', eyebrow: 'MATERIAIS E RASTREABILIDADE', description: 'Controle saldos, movimentações, necessidades e rastreabilidade dos materiais usados pela operação.', functionality: ['Cadastro e consulta de itens', 'Entradas, saídas e ajustes', 'Saldos por empresa e localização', 'Rastreabilidade e integração com produção'], flow: ['Necessidade', 'Entrada', 'Armazenagem', 'Consumo', 'Saldo', 'Inventário'], indicators: ['Saldo disponível', 'Itens críticos', 'Movimentações', 'Giro de estoque'], route: '/produtos-vendas', Icon: Boxes },
  recebimento: { title: 'Recebimento de Materiais', eyebrow: 'ENTRADA DE MATERIAIS', description: 'Centralize o recebimento de materiais, conferência fiscal e distribuição dos itens por lote.', functionality: ['Importação e conferência de NF-e XML', 'Conferência de itens e quantidades', 'Distribuição por múltiplos lotes', 'Registro do recebimento para estoque e rastreabilidade'], flow: ['NF-e', 'Conferência', 'Lotes', 'Recebimento', 'Estoque', 'Rastreabilidade'], indicators: ['Recebimentos pendentes', 'Divergências', 'Itens recebidos', 'Lotes gerados'], route: '/recebimento-materiais', Icon: PackageCheck },
  qualidade: { title: 'Qualidade', eyebrow: 'SGQ E CONFORMIDADE', description: 'Gerencie não conformidades, auditorias, ações e documentos mantendo evidências e rastreabilidade.', functionality: ['RPNC e não conformidades', 'Auditorias e evidências', 'Ações corretivas e CAPA', 'Documentos e procedimentos controlados'], flow: ['Ocorrência', 'Análise', 'Risco', 'Ação', 'Evidência', 'Verificação'], indicators: ['RPN aberto', 'Não conformidades', 'Ações vencidas', 'Auditorias'], route: '/qualidade', Icon: ClipboardCheck },
  manutencao: { title: 'Manutenção', eyebrow: 'ATIVOS E CONFIABILIDADE', description: 'Organize manutenção preventiva e corretiva, equipamentos, intervenções e histórico operacional.', functionality: ['Cadastro e controle de ativos', 'Manutenção preventiva e corretiva', 'Ordens e histórico de intervenções', 'Integração com máquinas e operação'], flow: ['Ativo', 'Plano', 'Ordem', 'Execução', 'Apontamento', 'Histórico'], indicators: ['Ordens abertas', 'Preventivas pendentes', 'Paradas', 'Disponibilidade'], route: '/operacao-industrial', Icon: Wrench },
  fiscal: { title: 'Financeiro e Fiscal', eyebrow: 'CONTROLE FINANCEIRO E FISCAL', description: 'Conecte os reflexos financeiros e fiscais das operações realizadas no ERP.', functionality: ['Processos e documentos fiscais', 'Previsão e acompanhamento financeiro', 'Integração dos eventos da operação', 'Consultas e indicadores gerenciais'], flow: ['Operação', 'Documento', 'Fiscal', 'Financeiro', 'Conciliação', 'Indicador'], indicators: ['Valores processados', 'Pendências fiscais', 'Previsões', 'Movimentações'], route: '/fiscal', Icon: Receipt },
  indicadores: { title: 'Indicadores', eyebrow: 'GESTÃO E PERFORMANCE', description: 'Transforme os dados dos módulos em indicadores para acompanhamento da fábrica.', functionality: ['Indicadores de produção e PCP', 'Qualidade e não conformidades', 'Estoque e materiais', 'Desempenho operacional e gestão'], flow: ['Dados', 'Consolidação', 'Indicador', 'Análise', 'Ação', 'Resultado'], indicators: ['Produção', 'Qualidade', 'Estoque', 'Performance'], route: '/erp-industrial', Icon: BarChart3 },
}

export default function ModuleOverviewIndustrial({ module }: { module: ModuleKey }) {
  const item = modules[module]
  const Icon = item.Icon
  return <main className="module-overview" style={{ maxWidth: 1440, margin: '0 auto', padding: '32px 24px 56px' }}>
    <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28 }}><ArrowLeft size={17}/> Voltar ao início</a>
    <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, .8fr)', gap: 28, alignItems: 'stretch' }}>
      <div style={{ border: '1px solid var(--border, #d9dee7)', borderRadius: 20, padding: 32 }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em' }}>{item.eyebrow}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14 }}><Icon size={34}/><h1 style={{ margin: 0 }}>{item.title}</h1></div>
        <p style={{ fontSize: 18, lineHeight: 1.6, maxWidth: 820 }}>{item.description}</p>
        <a href={item.route} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderRadius: 10, textDecoration: 'none', fontWeight: 800, border: '1px solid currentColor' }}>Entrar no módulo <ArrowRight size={17}/></a>
      </div>
      <div style={{ border: '1px solid var(--border, #d9dee7)', borderRadius: 20, padding: 28 }}><h2>Fluxo do módulo</h2><ol style={{ paddingLeft: 22, lineHeight: 2 }}>{item.flow.map(step => <li key={step}>{step}</li>)}</ol></div>
    </section>
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18, marginTop: 22 }}>
      <article style={{ border: '1px solid var(--border, #d9dee7)', borderRadius: 16, padding: 22 }}><h2>O que faz</h2><ul>{item.functionality.map(value => <li key={value} style={{ marginBottom: 9 }}>{value}</li>)}</ul></article>
      <article style={{ border: '1px solid var(--border, #d9dee7)', borderRadius: 16, padding: 22 }}><h2>Indicadores</h2><ul>{item.indicators.map(value => <li key={value} style={{ marginBottom: 9 }}>{value}</li>)}</ul></article>
      <article style={{ border: '1px solid var(--border, #d9dee7)', borderRadius: 16, padding: 22 }}><h2>Integrações</h2><p style={{ lineHeight: 1.6 }}>Os dados devem permanecer vinculados à empresa autenticada e refletir as movimentações reais do ERP, respeitando permissões e RLS.</p><a href={item.route}>Abrir área protegida →</a></article>
    </section>
    <p style={{ marginTop: 28, fontSize: 13, opacity: .72 }}>Esta página é uma apresentação funcional. A execução das operações acontece somente dentro do módulo protegido.</p>
  </main>
}
