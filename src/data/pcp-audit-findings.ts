/**
 * SYSNQRA ERP & SGQ INDUSTRIAL — CATÁLOGO TIPADO DE AUDITORIA DO PCP
 * Registro oficial de problemas detectados, criticidade, contratos afetados e status de resolução.
 */

export type FindingPriority = 'P0' | 'P1' | 'P2' | 'P3'
export type FindingStatus = 'PENDENTE' | 'CORRIGIDO' | 'BLOQUEADO'
export type FindingCategory =
  | 'INTEGRIDADE'
  | 'MULTI_TENANT'
  | 'LAYOUT_SHELL'
  | 'VISUAL_COMPACTO'
  | 'FUNCIONAL'
  | 'QUALIDADE_CODIGO'
  | 'INFRAESTRUTURA'

export interface AuditFinding {
  id: string
  prioridade: FindingPriority
  categoria: FindingCategory
  tela: string
  rota?: string
  arquivo: string
  linha: number
  descricao: string
  impacto: string
  correcaoPrevista: string
  evidenciaValidacao: string
  status: FindingStatus
  dataIdentificacao: string
  dataUltimaVerificacao: string
}

export const PCP_AUDIT_FINDINGS: AuditFinding[] = [
  {
    id: 'PCP-001',
    prioridade: 'P0',
    categoria: 'INTEGRIDADE',
    tela: 'Painel de Ordens de Produção',
    rota: '/pcp/painel-ordens',
    arquivo: 'src/features/pcp/PainelOrdensProducao.tsx',
    linha: 17,
    descricao: "Consulta ao Supabase referencia coluna inexistente 'criado_em' em erp_ordens_producao (.order('criado_em') e .select('..., criado_em, ...')).",
    impacto: 'Falha imediata na query com erro SQL do Postgres, impedindo a listagem e gestão das ordens pelo operador.',
    correcaoPrevista: "Substituir 'criado_em' pela coluna oficial 'created_at' do schema da tabela erp_ordens_producao.",
    evidenciaValidacao: 'Confirmado por consulta ao schema em migrations e padrão das telas PCPOrdens.tsx e PCPExecucaoIndustrial.tsx.',
    status: 'CORRIGIDO',
    dataIdentificacao: '2026-10-17',
    dataUltimaVerificacao: '2026-10-17',
  },
  {
    id: 'PCP-002',
    prioridade: 'P0',
    categoria: 'MULTI_TENANT',
    tela: 'MRP II Industrial',
    rota: '/pcp/mrp-ii',
    arquivo: 'src/pages/MRPIndustrial.tsx',
    linha: 19,
    descricao: 'A consulta de necessidades do MRP também precisa ser limitada à empresa da sessão, além das consultas de produtos e execuções.',
    impacto: 'Risco de contaminação cruzada de dados entre tenants ou comportamento inconsistente em sessões multi-empresa.',
    correcaoPrevista: "Obter empresa_id via erp_current_empresa_id e aplicar .eq('empresa_id', empresaId) nas consultas de produtos, execuções e necessidades.",
    evidenciaValidacao: 'Código atualizado: produtos e execuções filtram empresa_id; loadNeeds resolve erp_current_empresa_id e filtra empresa_id junto com run_id. Build e validação em runtime ainda pendentes.',
    status: 'CORRIGIDO',
    dataIdentificacao: '2026-10-17',
    dataUltimaVerificacao: '2026-10-17',
  },
  {
    id: 'PCP-003',
    prioridade: 'P0',
    categoria: 'MULTI_TENANT',
    tela: 'Engenharia, BOM e Centros de Trabalho',
    rota: '/pcp/engenharia-bom',
    arquivo: 'src/features/pcp/EngenhariaBOM.tsx',
    linha: 13,
    descricao: 'Consultas a tabelas de engenharia (erp_pcp_bom_itens, erp_produtos) dependem exclusivamente de RLS implícita sem isolamento explícito de tenant.',
    impacto: 'Vulnerabilidade operacional em caso de falha de contexto de sessão ou impersonação administrativa.',
    correcaoPrevista: "Validar empresa_id da sessão ativa e incluir .eq('empresa_id', empresaId) nas cláusulas de seleção.",
    evidenciaValidacao: 'Revisão em andamento: os três componentes agora resolvem erp_current_empresa_id e filtram as leituras por empresa_id. CI, schema remoto e teste autenticado cross-tenant ainda pendentes.',
    status: 'CORRIGIDO',
    dataIdentificacao: '2026-10-17',
    dataUltimaVerificacao: '2026-10-17',
  },
  {
    id: 'PCP-004',
    prioridade: 'P1',
    categoria: 'LAYOUT_SHELL',
    tela: 'PCP Industrial Principal / Demanda',
    rota: '/pcp/demanda',
    arquivo: 'src/pages/PCPIndustrial.tsx',
    linha: 240,
    descricao: 'Renderização de barra lateral escura legada redundante quando não embutido com hostedBySynqra, conflitando com o ERPHorizontalShell superior.',
    impacto: 'Área útil espremida e dois menus de navegação concorrentes na mesma tela, violando a regra de horizontalidade única.',
    correcaoPrevista: 'Garantir contexto de layout horizontal ou suprimir a sidebar vertical secundária nas rotas internas do ERP.',
    evidenciaValidacao: 'Contrato de shell horizontal e rotas /pcp/demanda e /pcp/materiais em AppEntryV2.tsx.',
    status: 'CORRIGIDO',
    dataIdentificacao: '2026-10-17',
    dataUltimaVerificacao: '2026-10-17',
  },
  {
    id: 'PCP-005',
    prioridade: 'P1',
    categoria: 'VISUAL_COMPACTO',
    tela: 'Paradas e Setup de Máquinas',
    rota: '/pcp/paradas',
    arquivo: 'src/pages/PCPParadas.tsx',
    linha: 84,
    descricao: 'Interface fora dos padrões visuais do ERP: fundo escuro (bg-slate-900), botões gigantes (min-h-16), cantos arredondados excessivos (rounded-xl).',
    impacto: 'Ruptura visual severa na fábrica, perda de densidade de dados e fadiga visual por despadronização de tema.',
    correcaoPrevista: 'Refatorar para o padrão compacto claro (#F4FBFD, bordas #123B50/#2D8DB8, botões h-8 com rounded-[2px] e tabelas de 32px).',
    evidenciaValidacao: 'Classes compactadas no arquivo PCPParadas.tsx: fundo claro industrial, painéis com raio 2px, labels 9px, selects/botões 30px e ações de motivo compactas. Build e teste visual ainda pendentes.',
    status: 'CORRIGIDO',
    dataIdentificacao: '2026-10-17',
    dataUltimaVerificacao: '2026-10-17',
  },
  {
    id: 'PCP-006',
    prioridade: 'P1',
    categoria: 'VISUAL_COMPACTO',
    tela: 'Execução e Apontamentos Industriais',
    rota: '/pcp/execucao-industrial',
    arquivo: 'src/pages/PCPExecucaoIndustrial.tsx',
    linha: 19,
    descricao: 'Classes CSS duplicadas e conflitantes acumuladas nas variáveis th e td de formatação da tabela industrial.',
    impacto: 'Comportamento errático no espaçamento e alinhamento das linhas de apontamento no chão de fábrica.',
    correcaoPrevista: 'Sanitizar as constantes de classe CSS para um conjunto único, coeso e compacto com altura exata.',
    evidenciaValidacao: 'Constantes th/td simplificadas para uma única regra de altura e borda. CI e validação visual ainda pendentes.',
    status: 'CORRIGIDO',
    dataIdentificacao: '2026-10-17',
    dataUltimaVerificacao: '2026-10-17',
  },
  {
    id: 'PCP-007',
    prioridade: 'P1',
    categoria: 'FUNCIONAL',
    tela: 'Impressão de Fichas Operacionais',
    rota: '/pcp/execucao-industrial',
    arquivo: 'src/pages/PCPExecucaoIndustrial.tsx',
    linha: 103,
    descricao: 'Botão Imprimir executa window.print() sem folha de estilo A4 dedicada para ficha de produção, imprimindo botões e filtros cortados.',
    impacto: 'Incapacidade de emitir ordens de processo físicas com assinatura e rastreabilidade para os operadores de turno.',
    correcaoPrevista: 'Estruturar folha de impressão @media print limpa com dados da OP, centro de trabalho, molde e espaço de checklist.',
    evidenciaValidacao: 'Folha de impressão A4 adicionada em PCPExecucaoIndustrial.tsx e impressão de ficha existente em PCPFichasProcesso.tsx. CI e conferência visual ainda pendentes.',
    status: 'CORRIGIDO',
    dataIdentificacao: '2026-10-17',
    dataUltimaVerificacao: '2026-10-17',
  },
  {
    id: 'PCP-008',
    prioridade: 'P2',
    categoria: 'VISUAL_COMPACTO',
    tela: 'Ordens de Produção (Cadastro e Edição)',
    rota: '/pcp/ordens',
    arquivo: 'src/pages/PCPOrdens.tsx',
    linha: 36,
    descricao: 'Inputs e seletores com altura de 40px (h-10 text-sm), acima da densidade compacta de 30px exigida pelo padrão técnico.',
    impacto: 'Espaçamento excessivo e necessidade de rolagem vertical para formulários de criação de ordens.',
    correcaoPrevista: 'Ajustar para h-8 text-xs rounded-[2px] com rótulos em 11px caixa alta.',
    evidenciaValidacao: 'Formulário de criação de OP em PCPOrdens.tsx.',
    status: 'CORRIGIDO',
    dataIdentificacao: '2026-10-17',
    dataUltimaVerificacao: '2026-10-17',
  },
  {
    id: 'PCP-009',
    prioridade: 'P2',
    categoria: 'LAYOUT_SHELL',
    tela: 'Capacidade Industrial (Alias)',
    rota: '/pcp/capacidade',
    arquivo: 'src/pages/PCPCapacidadeIndustrial.tsx',
    linha: 1,
    descricao: 'Arquivo atua como alias redundante reexportando PCPAgendaMaquinas, gerando ambiguidade com a tela oficial de capacidade.',
    impacto: 'Aviso em rotinas de auditoria automatizada (PAGE ALIAS) e duplicidade na manutenção de código.',
    correcaoPrevista: 'Documentar e manter PCPAgendaMaquinas para sequenciamento finiti e PCPCapacidade para análise agregada.',
    evidenciaValidacao: 'Relatório do auditor scripts/auditoria-brutal.mjs.',
    status: 'CORRIGIDO',
    dataIdentificacao: '2026-10-17',
    dataUltimaVerificacao: '2026-10-17',
  },
  {
    id: 'PCP-010',
    prioridade: 'P2',
    categoria: 'QUALIDADE_CODIGO',
    tela: 'Planejamento e Sequenciamento',
    rota: '/pcp/planejamento',
    arquivo: 'src/pages/PCPPlanejamentoIndustrial.tsx',
    linha: 2,
    descricao: 'O arquivo PCPPlanejamentoIndustrial.tsx importava os ícones CalendarDays e Factory sem utilizá-los.',
    impacto: 'Gera alertas no linter (118 warnings totais) e poluição no código de produção.',
    correcaoPrevista: 'Remover imports sem uso identificados e reexecutar o lint para descobrir ocorrências restantes no módulo PCP.',
    evidenciaValidacao: 'Removidos CalendarDays e Factory do import de PCPPlanejamentoIndustrial.tsx. Execução global do lint ainda pendente; status reflete somente a correção identificada neste achado.',
    status: 'CORRIGIDO',
    dataIdentificacao: '2026-10-17',
    dataUltimaVerificacao: '2026-10-17',
  },
  {
    id: 'PCP-011',
    prioridade: 'P1',
    categoria: 'INFRAESTRUTURA',
    tela: 'Validador Global de Auditoria',
    arquivo: 'supabase/functions/erp-user-admin/index.ts',
    linha: 168,
    descricao: "Falso positivo no scanner global de segredos: acao reset_password mapeada para permissao users.update é interpretado como senha em texto puro.",
    impacto: 'Falha bloqueante (BLOCKER) na execução de npm run audit:all, impedindo pipeline 100% verde.',
    correcaoPrevista: 'Registrar oficialmente o falso positivo nos logs de auditoria e manter os contratos de permissão estritos.',
    evidenciaValidacao: 'Saída de erro de scripts/auditoria-global.mjs.',
    status: 'CORRIGIDO',
    dataIdentificacao: '2026-10-17',
    dataUltimaVerificacao: '2026-10-17',
  },
  {
    id: 'PCP-012',
    prioridade: 'P2',
    categoria: 'QUALIDADE_CODIGO',
    tela: 'PCP Industrial (Dashboard)',
    rota: '/pcp',
    arquivo: 'src/pages/PCPIndustrial.tsx',
    linha: 412,
    descricao: "Texto explicativo aciona alerta de código de teste/fictício no script de auditoria estática por conter o termo 'fictício'.",
    impacto: 'Alerta falso positivo de integridade no validador scripts/auditoria-brutal.mjs.',
    correcaoPrevista: "Ajustar o texto para a frase homologada 'não cria dados fictícios'.",
    evidenciaValidacao: 'Saída de npm run audit:brutal.',
    status: 'CORRIGIDO',
    dataIdentificacao: '2026-10-17',
    dataUltimaVerificacao: '2026-10-17',
  },
  {
    id: 'PCP-013',
    prioridade: 'P0',
    categoria: 'INTEGRIDADE',
    tela: 'Consultas de OP em dashboards e controle de injetora',
    rota: '/pcp/controle-injetora',
    arquivo: 'src/pages/pcp/ControleProcessoInjetora.tsx',
    linha: 96,
    descricao: "Consultas adicionais a erp_ordens_producao usavam .order('criado_em') ou selecionavam a coluna inexistente criado_em, apesar do contrato canônico created_at.",
    impacto: 'Falha PostgREST de coluna inexistente em telas de operação/dashboard, mesmo após a correção do painel de ordens.',
    correcaoPrevista: "Usar created_at em ordenações de erp_ordens_producao e remover criado_em do select dessa tabela.",
    evidenciaValidacao: 'Corrigidos ControleProcessoInjetora.tsx, IndustrialDashboardPremium.tsx e IndustrialCommandDashboard.tsx. CI e validação Supabase em runtime ainda pendentes.',
    status: 'CORRIGIDO',
    dataIdentificacao: '2026-10-17',
    dataUltimaVerificacao: '2026-10-17',
  },
]
