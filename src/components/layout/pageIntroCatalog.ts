/**
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-01
 * @AUTOR: FERNANDOSCH.SYSTEM
 * @STATUS: CATÁLOGO ÚNICO DE ABERTURA DE TELAS
 */
import type { PageIntro } from './PageIntroCard'

const introCatalog: Record<string, PageIntro> = {
  '': { module: 'SYSNQRA ERP · SGQ INDUSTRIAL', title: 'Central de Comando Industrial', description: 'Painel executivo com indicadores reais de produção, qualidade, compras, fiscal e financeiro da empresa autenticada.' },
  'cadastro-master': { module: 'Implantação', title: 'Cadastro Master da Empresa', description: 'Configuração inicial do tenant: empresa emissora, plano de acesso e primeiro usuário administrador.' },
  'ajuda': { module: 'SYSNQRA ERP · SGQ INDUSTRIAL', title: 'Central de Ajuda', description: 'Procedimentos operacionais, POPs e orientação contextual de todas as rotinas do sistema.' },
  'pcp': { module: 'Engenharia e PCP', title: 'Central PCP', description: 'Planejamento e controle da produção: ordens, apontamentos, necessidade de materiais e agenda de máquinas.' },
  'pcp/fichas-processo': { module: 'Engenharia e PCP', title: 'Fichas de Processo', description: 'Engenharia do injetado, prensado, acabamento e montagem de caixa, com parâmetros e sequências de operação.' },
  'pcp/roteiros': { module: 'Engenharia e PCP', title: 'Roteiro de Operações', description: 'Sequência de operações, máquinas e tempos padrão que cada produto percorre na fábrica.' },
  'pcp/capacidade': { module: 'Engenharia e PCP', title: 'Carga e Capacidade', description: 'Capacidade cadastrada por máquina confrontada com a carga real das ordens de produção abertas.' },
  'chao-de-fabrica/portal-operador': { module: 'Chão de Fábrica', title: 'Portal do Operador', description: 'Entrada do operador para apontar produção, consultar a OP em execução e registrar ocorrências.' },
  'chao-de-fabrica/postos': { module: 'Chão de Fábrica', title: 'Postos de Trabalho', description: 'Cadastro de postos e setores com responsável, turno e recursos vinculados à produção.' },
  'estoque/auditoria-saldos': { module: 'Estoque e Almoxarifado', title: 'Auditoria de Saldos e Inventário', description: 'Saldo do sistema confrontado com a contagem física, por item, lote e endereço de armazenagem.' },
  'estoque/balanco': { module: 'Estoque e Almoxarifado', title: 'Balanço e Valoração de Estoque', description: 'Quantidades e valores de estoque para a valoração contábil do período apurado.' },
  'estoque/depreciacao': { module: 'Estoque e Almoxarifado', title: 'Regras de Depreciação de Estoque', description: 'Métodos, taxas e critérios de desvalorização aplicados aos itens em armazenagem.' },
  'paquimetro': { module: 'Qualidade / Metrologia', title: 'Paquímetro Digital', description: 'Medição dimensional com leitura, tolerância e evidência da inspeção registrada no lote.' },
  'qualidade/rpnc': { module: 'Qualidade / SGQ', title: 'RPNC · Registro de Não Conformidade', description: 'Abertura, triagem e acompanhamento de não conformidades com causa raiz, plano de ação e evidências.' },
  'qualidade/ged': { module: 'Qualidade / SGQ', title: 'GED · Documentos da Qualidade', description: 'Repositório controlado de procedimentos, instruções de trabalho e registros do sistema de gestão.' },
  'compras/solicitacao': { module: 'Compras', title: 'Solicitação de Compra', description: 'Necessidade interna formalizada com itens, urgência e aprovação antes de ir para cotação.' },
  'compras/requisicoes': { module: 'Compras', title: 'Requisições de Compra', description: 'Fila de requisições abertas pelos setores, com andamento, responsável e vínculo com a cotação.' },
  'rh': { module: 'RH / Departamento Pessoal', title: 'Gestão de Pessoas', description: 'Colaboradores, jornada, custo de hora e dados de pessoal integrados ao PCP e à folha.' },
  'fiscal': { module: 'Fiscal', title: 'Central Fiscal Integrada', description: 'Apuração, conferência de documentos e obrigações acessórias do tenant autenticado.' },
  'fiscal/ano': { module: 'Fiscal', title: 'Ano Fiscal', description: 'Exercícios, períodos e datas de fechamento contábil e fiscal da empresa.' },
  'fiscal/classificacao': { module: 'Fiscal', title: 'Classificação Fiscal de Produtos', description: 'Vinculação de NCM, CEST e tributação aos produtos, conferida na base oficial vigente.' },
  'fiscal/auditoria-documental': { module: 'Fiscal', title: 'Auditoria Documental', description: 'Documentos fiscais pendentes, inconsistências e evidências organizados por período.' },
  'fiscal/estorno': { module: 'Fiscal', title: 'Estorno de Lançamentos', description: 'Solicitação e aprovação de estornos contábeis com justificativa e trilha de auditoria.' },
  'fiscal/razao': { module: 'Fiscal', title: 'Painel Razão Geral', description: 'Lançamentos consultados por conta, período e centro de custo no razão geral.' },
  'financeiro/conciliacao': { module: 'Financeiro', title: 'Conciliação Bancária', description: 'Extratos importados confrontados com os lançamentos do sistema, diferença por diferença.' },
  'financeiro/extrato': { module: 'Financeiro', title: 'Importação de Extrato', description: 'Importação de arquivos de extrato e registro dos lançamentos bancários da empresa.' },
  'financeiro/lista-precos': { module: 'Financeiro', title: 'Lista de Preços por Cliente', description: 'Tabelas de preço por cliente, usadas para validar os valores praticados nos pedidos de venda.' },
  'financeiro/comissoes': { module: 'Financeiro', title: 'Cálculo de Comissões', description: 'Comissão apurada sobre faturamento e metas, conforme as regras vigentes da empresa.' },
  'financeiro/comissoes/regras': { module: 'Financeiro', title: 'Regras de Comissão', description: 'Percentuais, metas e critérios de cálculo por vendedor, produto ou período.' },
  'financeiro/comissoes/perfil': { module: 'Financeiro', title: 'Perfil do Vendedor', description: 'Vendedores e agentes com taxa de custo de hora, metas e perfil de comissão vinculado.' },
  'financeiro/auditoria-comissoes': { module: 'Financeiro', title: 'Auditoria de Comissões', description: 'Base de cálculo, valores pagos e divergências conferidos antes do fechamento da comissão.' },
  'financeiro/decimais': { module: 'Financeiro', title: 'Cadastro de Precisão Decimal', description: 'Casas decimais, cubagem e arredondamento usados nas medições e cálculos industriais.' },
  'financeiro/lucratividade': { module: 'Financeiro', title: 'Painel de Lucratividade', description: 'Custos, margens industriais e resultado por produto, cliente ou pedido.' },
  'financeiro/retificacao': { module: 'Financeiro', title: 'Retificação de Pedido', description: 'Ajustes de quantidades, valores e impostos em pedidos já faturados, com histórico auditável.' },
  'financeiro/retificacao-assistente': { module: 'Financeiro', title: 'Assistente de Retificação', description: 'Passo a passo orientado da retificação de pedido e dos ajustes contábeis associados.' },
  'financeiro/notas-debito': { module: 'Financeiro', title: 'Notas de Débito', description: 'Emissão e acompanhamento de notas de débito por cliente, inclusive comprovantes de entrega (POD).' },
  'financeiro/notas-debito/configuracoes': { module: 'Financeiro', title: 'Configurações de Notas de Débito', description: 'Séries, impostos e regras de emissão das notas de débito da empresa.' },
  'cadastros/produtos': { module: 'Cadastros Mestres', title: 'Cadastro de Produtos', description: 'Identificação, fiscal, estoque, dimensional e produção do item, gravados em erp_produtos pela empresa autenticada.' },
  'cadastros/produtos/imprimir': { module: 'Cadastros Mestres', title: 'Ficha Técnica do Produto', description: 'Documento A4 do produto selecionado, gerado a partir dos dados persistidos no cadastro mestre.' },
  'cadastros/produtos/ficha-tecnica': { module: 'Cadastros Mestres', title: 'Ficha Técnica e Etiquetas', description: 'Listagem geral, ficha técnica, código de barras em ZPL e regras de formação do código do produto.' },
  'cadastros/produtos/parametros-codigo': { module: 'Cadastros Mestres', title: 'Parâmetros de Código', description: 'Prefixo, separador, modo e dígitos da numeração de SKUs gravada em erp_codigos.' },
  'cadastros/ajuda/ficha-tecnica': { module: 'Cadastros Mestres', title: 'POP · Ficha Técnica do Produto', description: 'Procedimento operacional da ficha técnica: chave do SKU, empresa, categoria e unidade de medida.' },
  'cadastros/ajuda/listagem-produtos': { module: 'Cadastros Mestres', title: 'POP · Listagem de Produtos', description: 'Procedimento operacional da listagem: estrutura relacional, geração de part number e conferência antes de gravar.' },
  'cadastros/ajuda/parametros-codigo': { module: 'Cadastros Mestres', title: 'POP · Parâmetros de Código', description: 'Procedimento operacional das regras de código e da gravação segura da numeração em erp_codigos.' },
  'master': { module: 'Plataforma', title: 'Console da Plataforma', description: 'Administração técnica de empresas, planos e acessos da plataforma SYSNQRA.' },
}

const pagePrincipalPrefix = '/pageprincipal'
const nativeIntroCardPaths = ['/compras', '/financeiro', '/administracao-configuracoes']

export function normalizeWorkspacePath(pathname: string): string {
  const withoutPrefix = pathname.startsWith(pagePrincipalPrefix) ? pathname.slice(pagePrincipalPrefix.length) : pathname
  const trimmed = withoutPrefix.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

export function hasNativeIntroCard(pathname: string): boolean {
  const normalized = normalizeWorkspacePath(pathname)
  return nativeIntroCardPaths.some(path => normalized === path || normalized.startsWith(`${path}/`))
}

export function resolvePageIntro(pathname: string): PageIntro | null {
  const normalized = normalizeWorkspacePath(pathname)
  const direct = introCatalog[normalized === '/' ? '' : normalized]
  if (direct) return direct
  const candidates = Object.keys(introCatalog).filter(key => key !== '' && normalized.startsWith(`${key}/`)).sort((a, b) => b.length - a.length)
  const best = candidates[0]
  return best ? introCatalog[best] : null
}

export function fallbackPageIntro(parts: { module?: string; label?: string; purpose?: string }): PageIntro | null {
  const label = parts.label?.trim()
  if (!label) return null
  const module = parts.module?.trim() || undefined
  const purpose = parts.purpose?.trim()
  return { module, title: label, description: purpose ?? `Rotina ${label} do módulo ${module ?? 'SYSNQRA'} do ERP industrial.` }
}
