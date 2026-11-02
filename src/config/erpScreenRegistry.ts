/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-31
 * @REVISAO: REV-EVIDENCIA-TELAS-20261031-01 — registro único de evidência por tela
 * @STATUS_APROVACAO: PENDENTE DE homologação pelo proprietário (as marcações do menu passam a derivar deste registro)
 *
 * Este arquivo é a única fonte dos selos do menu. Um selo "atualizada" só aparece
 * quando a tela tem evidência real: consultas ao Supabase no próprio módulo,
 * escopo de tenant (empresa_id ou RPC security definer) e nenhuma migration pendente.
 *
 * Como promotes a tela para selo ligado:
 *   status: 'validada'  +  migration confirmada aplicada (aplicada: true) ou inexistente.
 * Nada aqui é estético: cada campo descreve uma verificação feita no código desta branch.
 */

export type ErpScreenStatus = 'validada' | 'parcial' | 'pendente' | 'estatica'

export type ErpScreenRecord = {
  /** 'validada' = banco real + escopo de tenant; 'parcial' = leitura sem gravação/escopo comprovado;
   * 'pendente' = depende de migration ainda não aplicada; 'estatica' = sem banco. */
  status: ErpScreenStatus
  /** Tabelas consultadas ou gravadas pela tela (verificado no código-fonte). */
  banco?: readonly string[]
  /** RPC/Edge Function usada como caminho de gravação autorizado. */
  rpc?: readonly string[]
  /** Migration necessária para a tela funcionar. */
  migration?: string
  /** Confirmação do proprietário de que a migration está aplicada no projeto Supabase. */
  aplicada?: boolean
  nota?: string
}

/** Chaves: caminho do workspace (sem o prefixo /pageprincipal), mesma convenção do catálogo de abertura. */
export const erpScreenRegistry: Record<string, ErpScreenRecord> = {
  '': { status: 'validada', banco: ['erp_ordens_producao', 'erp_apontamentos_processo', 'erp_maquinas', 'erp_pcp_programacoes', 'erp_producao_paradas', 'erp_equipamentos_medicao'], nota: 'Cockpit executivo somente leitura.' },

  'financeiro': { status: 'validada', banco: ['erp_financeiro_titulos', 'erp_financeiro_parcelas', 'erp_financeiro_baixas', 'erp_clientes', 'erp_fornecedores'], rpc: ['erp_current_empresa_id'], nota: 'Carteira financeira por tenant; lançamentos gravados nos módulos de origem.' },
  'financeiro/conciliacao-bancaria': { status: 'validada', banco: ['erp_contas_bancarias', 'erp_transacoes_bancarias', 'erp_fiscal_razao_lancamentos'], rpc: ['erp_current_empresa_id'], nota: 'Confronto extrato × sistema; gravação pela importação de extratos.' },
  'financeiro/importar-extratos': { status: 'validada', banco: ['erp_contas_bancarias', 'erp_importacoes_log'], rpc: ['erp_current_empresa_id'] },
  'financeiro/lista-precos-cliente': { status: 'validada', banco: ['erp_tabela_precos_cliente'], rpc: ['importar-lista-precos-cliente'] },
  'financeiro/retificacao': { status: 'validada', banco: ['erp_pedidos_venda', 'erp_pedidos_venda_itens', 'erp_usuarios'], rpc: ['erp_retificar_pedido_faturado'], nota: 'Gravação somente pela RPC security definer.' },
  'financeiro/notas-debito': { status: 'validada', banco: ['erp_notas_debito_clientes', 'erp_clientes'], rpc: ['erp_current_empresa_id'] },
  'financeiro/notas-debito/configuracoes': { status: 'validada', banco: ['erp_clientes_dn_config', 'erp_clientes'], rpc: ['erp_current_empresa_id'], nota: 'Gravação por upsert na tabela de configuração do tenant.' },
  'financeiro/notas-debito/:id/pod': { status: 'parcial', nota: 'Comprovante de entrega; validação visual e de storage pendente.' },

  'comissoes': { status: 'validada', nota: 'Raiz do módulo: redireciona para Regras de Comissão.' },
  'comissoes/regras': { status: 'validada', banco: ['erp_comissao_regras', 'erp_comissao_perfis', 'erp_produtos'], rpc: ['erp_current_empresa_id', 'erp_comissao_salvar_regra'], migration: '20261031150000_hardening_comissoes_controladoria.sql', aplicada: false, nota: 'Funciona sem o hardening; aplicação da migration ainda não confirmada.' },
  'comissoes/calculo': { status: 'validada', banco: ['erp_comissao_linhas', 'erp_usuarios', 'erp_clientes'], rpc: ['erp_current_empresa_id', 'erp_comissao_calcular'], migration: '20261031150000_hardening_comissoes_controladoria.sql', aplicada: false },
  'comissoes/perfil': { status: 'validada', banco: ['erp_comissao_perfis', 'erp_comissao_vinculos', 'erp_usuarios'], rpc: ['erp_current_empresa_id', 'erp_comissao_vincular'], migration: '20261031150000_hardening_comissoes_controladoria.sql', aplicada: false },

  'controladoria': { status: 'validada', nota: 'Raiz do módulo: redireciona para Lucratividade e Margens.' },
  'controladoria/lucratividade': { status: 'validada', banco: ['erp_pedidos_venda', 'erp_pedidos_venda_itens', 'erp_clientes'], rpc: ['erp_current_empresa_id'] },
  'controladoria/razao-geral': { status: 'validada', banco: ['erp_fiscal_razao_lancamentos', 'erp_contas_bancarias'], rpc: ['erp_current_empresa_id', 'erp_fiscal_saldo_razao'], nota: 'Mantém a versão de controladoria; o módulo Fiscal conserva o próprio painel.' },
  'controladoria/cadastro-decimais': { status: 'validada', banco: ['erp_regras_decimais'], rpc: ['erp_decimal_salvar_regra'] },
  'controladoria/auditoria-comissoes': { status: 'validada', banco: ['erp_comissao_linhas', 'erp_pedidos_venda', 'erp_produtos', 'erp_clientes', 'erp_usuarios'], rpc: ['erp_current_empresa_id', 'erp_comissao_calcular'] },
  'controladoria/retificacao-assistente': { status: 'validada', banco: ['erp_usuarios'], rpc: ['erp_fiscal_estornar_documento'], nota: 'Assistente que conduz o estorno pela RPC security definer.' },
  'controladoria/retificacao-pedido/:pedidoId': { status: 'validada', nota: 'Mesma tela do Retificação de Pedido, aberta por pedido.' },

  'cadastros/produtos': { status: 'validada', banco: ['erp_produtos', 'erp_grupos', 'erp_fornecedores', 'erp_estoque_localizacoes', 'erp_usuarios'], rpc: ['erp_current_empresa_id'] },
  'cadastros/produtos/ficha-tecnica': { status: 'validada', banco: ['erp_produtos', 'erp_codigos'], nota: 'Gravação na subtela FormFichaTecnica (erp_produtos) com escopo de empresa.' },
  'cadastros/produtos/parametros-codigo': { status: 'validada', banco: ['erp_codigos', 'erp_usuarios'] },

  'rh': { status: 'validada', banco: ['erp_funcionarios', 'erp_rh_ponto_eventos', 'erp_rh_treinamentos_registros', 'erp_rh_faltas', 'erp_rh_avaliacoes'], rpc: ['erp_current_empresa_id'], migration: '20261030190000_rh_avaliacoes_acidentes_documentos.sql', aplicada: false, nota: 'Núcleo funcional; avaliação/acidente dependem da confirmação da migration.' },

  'pcp': { status: 'validada', nota: 'Workspace por abas; cada aba consulta o banco (ordens, fichas, BOM, apuração).' },
  'pcp/dashboard': { status: 'parcial', banco: ['erp_ordens_producao', 'erp_produtos', 'erp_maquinas', 'erp_pcp_programacoes', 'erp_apontamentos_processo', 'erp_producao_paradas', 'erp_empresas'], rpc: ['erp_current_empresa_id'], nota: 'Somente leitura. Sem views nem RPCs de KPI no banco: todo indicador é calculado na tela a partir das tabelas reais; qualquer fonte ilegível aparece como aviso honesto em vez de número inventado.' },
  'pcp/fichas-processo': { status: 'validada', banco: ['erp_produtos', 'erp_postos_trabalho', 'erp_pcp_roteiro_operacoes'], rpc: ['erp_current_empresa_id'] },
  'pcp/roteiros': { status: 'validada', banco: ['erp_pcp_roteiro_operacoes', 'erp_produtos', 'erp_postos_trabalho'], rpc: ['erp_current_empresa_id'] },
  'pcp/capacidade': { status: 'pendente', banco: ['erp_maquinas', 'erp_ordens_producao'], migration: '20261023120000_pcp_capacidade_schema_sync.sql', aplicada: false, nota: 'Colunas de capacidade ainda não confirmadas no banco do tenant.' },

  'chao-de-fabrica/portal-operador': { status: 'validada', banco: ['erp_pcp_programacoes', 'erp_ordens_producao', 'erp_funcionarios', 'erp_produtos', 'erp_maquinas'], rpc: ['erp_current_empresa_id'] },
  'chao-de-fabrica/postos': { status: 'validada', banco: ['erp_postos_trabalho'], rpc: ['erp_pcp_salvar_posto'], nota: 'Escopo de tenant garantido dentro da RPC security definer.' },

  'estoque/auditoria-saldos': { status: 'parcial', banco: ['erp_inventario_auditoria_saldos'], nota: 'Leitura sem gravação própria e sem escopo de empresa explícito no componente.' },
  'estoque/balanco': { status: 'validada', banco: ['erp_almoxarifados', 'erp_produtos'], rpc: ['erp_current_empresa_id'] },
  'estoque/depreciacao': { status: 'validada', banco: ['erp_depreciacao_regras'], rpc: ['erp_depreciacao_salvar_regra', 'erp_depreciacao_desativar_regra'] },
  'estoque/baixa-por-lote': { status: 'pendente', banco: ['erp_produtos', 'erp_estoque_lotes_rastreabilidade', 'erp_estoque_movimentos', 'erp_ordens_producao'], rpc: ['erp_lote_saldos_por_material', 'erp_lote_planejar_baixa', 'erp_lote_baixar_por_fifo'], migration: '20261101200000_erp_lote_baixa_fifo_rastreabilidade_v1.sql', aplicada: false, nota: 'A alocação FIFO por lote e a gravação dos movimentos acontecem no servidor; sem a migration as três RPCs não existem e a tela declara a pendência.' },
  'estoque/rastreabilidade-lote': { status: 'pendente', banco: ['erp_estoque_lotes_rastreabilidade', 'erp_estoque_movimentos', 'erp_apontamentos_processo', 'erp_ordens_producao', 'erp_produtos'], rpc: ['erp_lote_rastrear'], migration: '20261101200000_erp_lote_baixa_fifo_rastreabilidade_v1.sql', aplicada: false, nota: 'Consulta lote/NF → baixas → peças apontadas, resolvida pela RPC security definer na empresa da sessão.' },

  'paquimetro': { status: 'validada', banco: ['erp_equipamentos_medicao', 'erp_inspecoes'], rpc: ['erp_current_empresa_id'] },
  'qualidade/rpnc': { status: 'validada', banco: ['erp_rpnc', 'erp_qualidade_rpnc_evidencias', 'erp_setores'], rpc: ['erp_current_empresa_id', 'erp_sgq_abrir_rpnc'] },
  'qualidade/rpnc-formulario': { status: 'pendente', banco: ['erp_rpnc', 'erp_setores', 'erp_produtos', 'erp_clientes', 'erp_usuarios'], rpc: ['erp_sgq_abrir_rpnc_formulario', 'erp_sgq_salvar_formulario_rpnc', 'erp_sgq_salvar_acoes_rpnc', 'erp_sgq_buscar_recorrencia_rpnc'], migration: '20261031100000_sgq_rpnc_formulario_auditorias_recorrencia_v1.sql', aplicada: false, nota: 'RPCs do formulário ainda não existem no banco: a tela abre em modo pendente e não grava.' },
  'qualidade/auditorias': { status: 'pendente', banco: ['erp_sgq_auditorias', 'erp_rpnc', 'erp_usuarios'], rpc: ['erp_sgq_vincular_rpnc_auditoria'], migration: '20261031100000_sgq_rpnc_formulario_auditorias_recorrencia_v1.sql', aplicada: false, nota: 'Tabela erp_sgq_auditorias criada pela mesma migration pendente.' },
  'qualidade/ged': { status: 'parcial', banco: ['erp_qualidade_rpnc_evidencias', 'erp_rpnc'], nota: 'Repositório em storage; revisão de documento (workflow ADENDO) ainda não implementada.' },

  'compras': { status: 'validada', banco: ['erp_pedidos_compra', 'erp_rfq'], rpc: ['erp_current_empresa_id'] },
  'compras/solicitacao': { status: 'validada', banco: ['erp_solicitacoes_compra', 'erp_produtos', 'erp_fornecedores', 'erp_usuarios'], rpc: ['erp_current_empresa_id'] },
  'compras/requisicoes': { status: 'validada', banco: ['erp_requisicoes_compra', 'erp_requisicoes_compra_itens', 'erp_ordens_producao', 'erp_produtos', 'erp_fornecedores'], rpc: ['erp_current_empresa_id'] },

  'administracao-configuracoes': { status: 'validada', banco: ['erp_empresas', 'erp_usuarios', 'erp_roles', 'erp_permissions', 'erp_audit_logs'], rpc: ['erp_current_empresa_id'] },
  'configuracoes-usuario': { status: 'pendente', rpc: ['erp_access_control_overview', 'erp_access_control_save_setor', 'erp_access_control_save_setor_matrix'], migration: '20261030160000_erp_access_control_sector_matrix_v1.sql', aplicada: false, nota: 'Matriz de permissão por setor depende das RPCs da migration ainda não aplicada.' },

  'fiscal': { status: 'validada', banco: ['erp_documentos_fiscais', 'erp_pedidos_venda', 'erp_contas_receber', 'erp_contas_pagar'], rpc: ['erp_current_empresa_id'] },
  'fiscal/ano': { status: 'validada', banco: ['erp_anos_fiscais'], rpc: ['erp_current_empresa_id'] },
  'fiscal/classificacao': { status: 'validada', banco: ['erp_classificacao_fiscal'], rpc: ['erp_current_empresa_id'] },
  'fiscal/auditoria-documental': { status: 'parcial', banco: ['erp_fiscal_documentos'], nota: 'Leitura sem escopo de empresa explícito no componente; depende de RLS ativa na tabela.' },
  'fiscal/estorno': { status: 'validada', banco: ['erp_fiscal_estornos'], rpc: ['erp_fiscal_estornar_documento'], nota: 'Gravação pela RPC security definer.' },
  'fiscal/razao': { status: 'parcial', banco: ['erp_fiscal_razao_lancamentos', 'erp_contas_bancarias'], nota: 'Painel do módulo Fiscal; sem gravação própria.' },
  'fiscal/emissao': { status: 'parcial', nota: 'Emissão de NFe exige credenciais e certificado: não homologada.' },

  'ajuda': { status: 'estatica', nota: 'Central de ajuda documentada; sem consultas ao banco por desenho.' },
  'master': { status: 'parcial', nota: 'Console da plataforma SaaS: painel PIX e cobrança dinâmica ainda não implementados.' },
  'cadastro-master': { status: 'parcial', nota: 'Implantação inicial do tenant; validação com empresa real pendente.' },
}

const REGISTRO_SEM_EVIDENCIA: ErpScreenRecord = { status: 'parcial', nota: 'Tela ainda sem registro de evidência.' }

export function normalizeErpRoute(route: string): string {
  const withoutPrefix = route.startsWith('/pageprincipal') ? route.slice('/pageprincipal'.length) : route
  const trimmed = withoutPrefix.replace(/\/+$/, '')
  return trimmed === '' ? '' : trimmed
}

export function erpScreenRecord(route: string): ErpScreenRecord {
  return erpScreenRegistry[normalizeErpRoute(route)] ?? REGISTRO_SEM_EVIDENCIA
}

/** Selo "atualizada": exige banco real, ausência de migration pendente e confirmação do proprietário. */
export function erpScreenHasBadge(route: string): boolean {
  const record = erpScreenRecord(route)
  if (record.status !== 'validada') return false
  if (record.migration && record.aplicada !== true) return false
  return true
}

export function erpScreenIsPending(route: string): boolean {
  const record = erpScreenRecord(route)
  return record.status === 'pendente' || Boolean(record.migration && record.aplicada !== true)
}
