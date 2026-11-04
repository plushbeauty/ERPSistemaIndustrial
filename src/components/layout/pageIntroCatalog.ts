/**
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-01 — catálogo de título e descrição de todas as telas
 * @AUTOR: Fernando Schuinsekel
 * @STATUS: CATÁLOGO ÚNICO DE ABERTURA DE TELAS · APROVADO PELO PROPRIETÁRIO EM 2026-10-30
 * Chaves: caminho já normalizado (sem o prefixo /pageprincipal e sem barra final).
 * Telas que já desenham o próprio card navy (Central de Compras, Financeiro,
 * Administração e Configurações) ficam fora do catálogo para não duplicar o cabeçalho.
 */
import type { PageIntro } from './PageIntroCard'

const introCatalog: Record<string, PageIntro> = {
  '': { module: 'SYSNQRA ERP · SGQ INDUSTRIAL', title: 'Central de Comando Industrial', description: 'Painel executivo com os números reais da empresa autenticada: OPs em andamento, produção do dia, OEE, peças no prazo e em atraso, RNCs abertas, metrologia e a fileira das ordens em execução.' },
  'cadastro-master': { module: 'Implantação', title: 'Cadastro Master da Empresa', description: 'Configuração inicial do tenant: empresa emissora, plano de acesso e primeiro usuário administrador.' },
  'ajuda': { module: 'SYSNQRA ERP · SGQ INDUSTRIAL', title: 'Central de Ajuda', description: 'Procedimentos operacionais, POPs e orientação contextual de todas as rotinas do sistema.' },

  'pcp': { module: 'Engenharia e PCP', title: 'Central PCP', description: 'Planejamento e controle da produção: ordens, apontamentos, necessidade de materiais e agenda de máquinas.' },
  'pcp/fichas-processo': { module: 'Engenharia e PCP', title: 'Fichas de Processo', description: 'Ficha em 4 abas: Processo, Matéria-prima (Item, Cód. MP, Descrição, %, Qtde, Unid, com foto puxada do cadastro de produtos ao clicar na descrição), Molde (número, desenho e fotos) e Qualidade & SGQ.' },
  'pcp/roteiros': { module: 'Engenharia e PCP', title: 'Roteiro de Operações', description: 'Sequência de operações, máquinas e tempos padrão que cada produto percorre na fábrica.' },
  'pcp/roteiro-producao': { module: 'Engenharia e PCP', title: 'Roteiro de Produção (tela anterior)', description: 'Grade simples de operações, postos e tempos por produto. A ficha de processo em 4 abas está em Fichas de Processo.' },
  'pcp/capacidade': { module: 'Engenharia e PCP', title: 'Carga e Capacidade', description: 'Capacidade cadastrada por máquina confrontada com a carga real das ordens de produção abertas.' },
  'chao-de-fabrica/portal-operador': { module: 'Chão de Fábrica', title: 'Portal do Operador', description: 'Entrada do operador para apontar produção, consultar a OP em execução e registrar ocorrências.' },
  'chao-de-fabrica/postos': { module: 'Chão de Fábrica', title: 'Postos de Trabalho', description: 'Cadastro de postos e setores com responsável, turno e recursos vinculados à produção.' },

  'estoque/auditoria-saldos': { module: 'Estoque', title: 'Auditoria de Saldos e Inventário', description: 'Saldo do sistema confrontado com a contagem física, por item, lote e endereço de armazenagem.' },
  'estoque/balanco': { module: 'Estoque', title: 'Balanço e Valoração de Estoque', description: 'Quantidades e valores de estoque para a valoração contábil do período apurado.' },
  'estoque/depreciacao': { module: 'Estoque', title: 'Regras de Depreciação de Estoque', description: 'Métodos, taxas e critérios de desvalorização aplicados aos itens em armazenagem.' },
  'estoque/rastreabilidade': { module: 'Estoque', title: 'Rastreabilidade de Lotes', description: 'Cadeia do lote consultada no banco: fornecedor e NF-e de entrada, componentes consumidos, retenções de qualidade e o destino por OP, pedido de venda e cliente.' },
  'almoxarifado/saida-material': { module: 'Almoxarifado', title: 'Controle e Saída de Material', description: 'Baixa de material do almoxarifado por setor, endereço e finalidade, gravada pela RPC de movimento com saldo e bloqueio de negativo calculados no servidor.' },
  'estoque': { module: 'Estoque', title: 'Estoque e Almoxarifado', description: 'Saldo por produto, inventário cíclico, entrada, saída, transferência entre endereços, almoxarifados e histórico de movimentos da empresa autenticada.' },
  'estoque/saldos': { module: 'Estoque', title: 'Saldo de Estoque por Produto', description: 'Saldo, ponto de reposição e necessidade de reposição calculados sobre erp_produtos, com pesquisa, filtro por categoria, página de 25 itens e impressão.' },
  'estoque/enderecos': { module: 'Estoque', title: 'Endereços Físicos de Armazenagem', description: 'Locais de guarda cadastrados em erp_estoque_localizacoes, vinculados ao almoxarifado, ao tipo e à situação ativa da empresa.' },
  'estoque/movimentacoes': { module: 'Estoque', title: 'Movimentações de Estoque', description: 'Razão de entradas, saídas e transferências gravadas em erp_estoque_movimentos, com produto, quantidade, origem, documento e observação.' },
  'estoque/ajustes': { module: 'Estoque', title: 'Ajuste de Avaria', description: 'Baixa de item avariado com motivo e responsável, registrada como movimento de estoque para o saldo não ficar divergente da contagem física.' },
  'estoque/separacao': { module: 'Estoque', title: 'Separação de Material', description: 'Reserva e baixa de material por OP e endereço, com rastreabilidade do que foi separado para a produção.' },
  'estoque/recebimento-lotes': { module: 'Estoque', title: 'Recebimento de Insumos e Lotes', description: 'Entrada de insumos com lote, fornecedor e documento fiscal, gerando o movimento de estoque que alimenta o saldo e a rastreabilidade.' },
  'estoque/etiquetas': { module: 'Estoque', title: 'Etiquetas do Estoque', description: 'Impressão de etiquetas industriais dos itens do estoque, montada a partir do cadastro de produtos e do usuário autenticado.' },
  'estoque/validade': { module: 'Estoque', title: 'Validade e FIFO / PEPS', description: 'Controle de vencimento por lote, com consumo na ordem de vencimento, sobre os lotes e movimentos reais do estoque.' },
  'estoque/curva-abc': { module: 'Estoque', title: 'Curva ABC de Valorização', description: 'Classificação dos itens por participação em valor, calculada sobre saldos e custos cadastrados da própria empresa.' },
  'almoxarifado': { module: 'Almoxarifado', title: 'Almoxarifado Mestre · FIFO e Lotes', description: 'Posição de estoque por almoxarifado, endereço e lote em ordem FIFO, somente com tabelas reais da empresa autenticada.' },
  'almoxarifado/inventario-mestre': { module: 'Almoxarifado', title: 'Inventário Mestre · Rastreabilidade FIFO', description: 'Inventário consolidado por almoxarifado, endereço e lote, na ordem de consumo FIFO apurada nos movimentos do estoque.' },

  'paquimetro': { module: 'Qualidade / Metrologia', title: 'Paquímetro Digital', description: 'Medição dimensional com leitura, tolerância e evidência da inspeção registrada no lote.' },
  'qualidade/rpnc': { module: 'Qualidade / SGQ', title: 'RPNC · Registro de Não Conformidade', description: 'Abertura, triagem e acompanhamento de não conformidades com causa raiz, plano de ação e evidências.' },
  'qualidade/rpnc-formulario': { module: 'Qualidade / SGQ', title: 'Formulário de Tratamento de Não Conformidade', description: 'Relato da ocorrência, Ishikawa e 5 Porquês, plano de ação CAPA com responsáveis e prazos, alerta de recorrência por peça/lote e impressão do relatório do SGQ.' },
  'qualidade/auditorias': { module: 'Qualidade / SGQ', title: 'Auditorias da Qualidade', description: 'Programa de auditorias por norma e período, com líder, status e as RPNCs vinculadas como constatações.' },
  'qualidade/documentos': { module: 'Qualidade', title: 'Controle de Alteração de Documentos da Qualidade', description: 'Página única em 7 abas do controle documental do SGQ: cadastro, anexos em PDF versionados, obsoletos com alerta de referência, revisões e aprovações, visualização, distribuição com ciência de leitura e impressão de cópias controladas.' },
  'qualidade/ged': { module: 'Qualidade', title: 'GED · Documentos da Qualidade', description: 'Repositório controlado de procedimentos, instruções de trabalho e registros do sistema de gestão.' },
  'qualidade/ged-documentos': { module: 'Qualidade', title: 'Editor de Documentos do SGQ', description: 'Emissão e revisão do corpo textual do procedimento no acervo legado do SGQ; o controle documental com anexos, distribuição e ciência de leitura está em Controle de Alteração de Documentos.' },
  'qualidade/certificados': { module: 'Qualidade', title: 'Certificado de Qualidade', description: 'Certificado dimensional do lote: cadastro da peça e das cotas nominais com tolerâncias, medições conferidas uma a uma, desenho de referência anexado e impressão do certificado com o número de série e o inspetor responsável.' },

  'compras/solicitacao': { module: 'Compras', title: 'Solicitação de Compra', description: 'Necessidade interna formalizada com itens, urgência e aprovação antes de ir para cotação.' },
  'compras/requisicoes': { module: 'Compras', title: 'Requisições de Compra', description: 'Fila de requisições abertas pelos setores, com andamento, responsável e vínculo com a cotação.' },

  'rh': { module: 'RH / Departamento Pessoal', title: 'Gestão de Pessoas', description: 'Colaboradores, jornada, custo de hora e dados de pessoal integrados ao PCP e à folha.' },

  'fiscal': { module: 'Fiscal', title: 'Central Fiscal Integrada', description: 'Apuração, conferência de documentos e obrigações acessórias do tenant autenticado.' },
  'fiscal/ano': { module: 'Fiscal', title: 'Ano Fiscal', description: 'Exercícios, períodos e datas de fechamento contábil e fiscal da empresa.' },
  'fiscal/classificacao': { module: 'Fiscal', title: 'Classificação Fiscal de Produtos', description: 'Vinculação de NCM, CEST e tributação aos produtos, conferida na base oficial vigente.' },
  'fiscal/auditoria-documental': { module: 'Fiscal', title: 'Auditoria Documental', description: 'Documentos fiscais pendentes, inconsistências e evidências organizados por período.' },
  'fiscal/estorno': { module: 'Fiscal', title: 'Estorno de Lançamentos', description: 'Solicitação e aprovação de estornos contábeis com justificativa e trilha de auditoria.' },
  'fiscal/razao': { module: 'Fiscal', title: 'Painel Razão Geral', description: 'Lançamentos consultados por conta, período e centro de custo no razão geral.' },
  'fiscal/emissao': { module: 'Fiscal', title: 'Emissão de NF-e (modelo 55)', description: 'Monte a nota nas abas do emissor, confira as advertências antes de gravar e acompanhe a transmissão na grade de gerenciamento. A numeração é reservada pelo banco, o documento trava ao sair de Rascunho e nada é declarado autorizado sem chave de 44 dígitos e protocolo devolvidos pelo integrador.' },

  // Chaves no caminho canônico: os apelidos do Financeiro agora redirecionam e não montam tela própria.
  'financeiro/conciliacao-bancaria': { module: 'Financeiro', title: 'Conciliação Bancária', description: 'Extratos importados confrontados com os lançamentos do sistema, diferença por diferença.' },
  'financeiro/importar-extratos': { module: 'Financeiro', title: 'Importação de Extrato', description: 'Importação de arquivos de extrato e registro dos lançamentos bancários da empresa.' },
  'financeiro/lista-precos-cliente': { module: 'Financeiro', title: 'Lista de Preços por Cliente', description: 'Tabelas de preço por cliente, usadas para validar os valores praticados nos pedidos de venda.' },
  'comissoes/calculo': { module: 'Comissões', title: 'Cálculo de Comissões', description: 'Comissão apurada sobre faturamento e metas, conforme as regras vigentes da empresa.' },
  'comissoes/regras': { module: 'Comissões', title: 'Regras de Comissão', description: 'Percentuais, metas e critérios de cálculo por vendedor, produto ou período.' },
  'comissoes/perfil': { module: 'Comissões', title: 'Perfil do Vendedor', description: 'Vendedores e agentes com taxa de custo de hora, metas e perfil de comissão vinculado.' },
  'controladoria/auditoria-comissoes': { module: 'Controladoria', title: 'Auditoria de Comissões', description: 'Base de cálculo, valores pagos e divergências conferidos antes do fechamento da comissão.' },
  'controladoria/cadastro-decimais': { module: 'Controladoria', title: 'Cadastro de Precisão Decimal', description: 'Casas decimais, cubagem e arredondamento usados nas medições e cálculos industriais.' },
  'controladoria/lucratividade': { module: 'Controladoria', title: 'Painel de Lucratividade', description: 'Custos, margens industriais e resultado por produto, cliente ou pedido.' },
  'financeiro/retificacao': { module: 'Financeiro', title: 'Retificação de Pedido', description: 'Corrige referência do cliente, vendedor, condição de pagamento e descrição dos itens em pedido já faturado, com histórico auditável; quantidades, preços e impostos permanecem bloqueados.' },
  'controladoria/retificacao-assistente': { module: 'Controladoria', title: 'Assistente de Retificação', description: 'Passo a passo orientado da retificação de pedido e dos ajustes contábeis associados.' },
  'financeiro/notas-debito': { module: 'Financeiro', title: 'Notas de Débito', description: 'Emissão e acompanhamento de notas de débito por cliente, inclusive comprovantes de entrega (POD).' },
  'financeiro/notas-debito/configuracoes': { module: 'Financeiro', title: 'Configurações de Notas de Débito', description: 'Séries, impostos e regras de emissão das notas de débito da empresa.' },

  'cadastros/produtos': { module: 'Cadastros Mestres', title: 'Cadastro de Produtos', description: 'Identificação, fiscal, estoque, dimensional e produção do item, gravados em erp_produtos pela empresa autenticada.' },
  'cadastros/produtos/imprimir': { module: 'Cadastros Mestres', title: 'Ficha Técnica do Produto', description: 'Documento A4 do produto selecionado, gerado a partir dos dados persistidos no cadastro mestre.' },
  'cadastros/produtos/ficha-tecnica': { module: 'Cadastros Mestres', title: 'Ficha Técnica e Etiquetas', description: 'Listagem geral, ficha técnica, código de barras em ZPL e regras de formação do código do produto.' },
  'cadastros/produtos/parametros-codigo': { module: 'Cadastros Mestres', title: 'Parâmetros de Código', description: 'Prefixo, separador, modo e dígitos da numeração de SKUs gravada em erp_codigos.' },
  'cadastros/ajuda/ficha-tecnica': { module: 'Cadastros Mestres', title: 'POP · Ficha Técnica do Produto', description: 'Procedimento operacional da ficha técnica: chave do SKU, empresa, categoria e unidade de medida.' },
  'cadastros/ajuda/listagem-produtos': { module: 'Cadastros Mestres', title: 'POP · Listagem de Produtos', description: 'Procedimento operacional da listagem: estrutura relacional, geração de part number e conferência antes de gravar.' },
  'cadastros/ajuda/parametros-codigo': { module: 'Cadastros Mestres', title: 'POP · Parâmetros de Código', description: 'Procedimento operacional das regras de código e da gravação segura da numeração em erp_codigos.' },

  'configuracoes-usuario': { module: 'Configurações', title: 'Configurações de Usuário', description: 'Controle de acesso do chão de fábrica: acessos coletivos ou por posto, matriz de módulos por setor e modelos por nível de acesso.' },

  'master': { module: 'Plataforma', title: 'Console da Plataforma', description: 'Administração técnica de empresas, planos e acessos da plataforma SYSNQRA.' },
}

const pagePrincipalPrefix = '/pageprincipal'

/** Telas que já desenham o próprio card navy aprovado; o shell não adiciona outro acima. */
const nativeIntroCardPaths = ['/compras', '/financeiro', '/administracao-configuracoes', '/chao-de-fabrica/apontamento-operador']

export function hasNativeIntroCard(pathname: string): boolean {
  return nativeIntroCardPaths.includes(normalizeWorkspacePath(pathname))
}

export function normalizeWorkspacePath(pathname: string): string {
  const withoutPrefix = pathname.startsWith(pagePrincipalPrefix)
    ? pathname.slice(pagePrincipalPrefix.length)
    : pathname
  const trimmed = withoutPrefix.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

/** Resolve o card de abertura pela rota: corresponde exata primeiro e depois ao prefixo mais longo. */
export function resolvePageIntro(pathname: string): PageIntro | null {
  const normalized = normalizeWorkspacePath(pathname)
  const direct = introCatalog[normalized === '/' ? '' : normalized]
  if (direct) return direct
  const candidates = Object.keys(introCatalog)
    .filter(key => key !== '' && normalized.startsWith(`${key}/`))
    .sort((a, b) => b.length - a.length)
  const best = candidates[0]
  return best ? introCatalog[best] : null
}

/**
 * Fallback para telas alcançadas pelo menu mas ainda sem verbete curado:
 * usa o rótulo real do menu e a finalidade já documentada na ajuda contextual.
 * Sem ajuda específica, descreve só a posição da rotina no sistema, sem afirmar funcionalidade.
 */
export function fallbackPageIntro(parts: { module?: string; label?: string; purpose?: string }): PageIntro | null {
  const label = parts.label?.trim()
  if (!label) return null
  const module = parts.module?.trim() || undefined
  const purpose = parts.purpose?.trim()
  return {
    module,
    title: label,
    description: purpose ?? `Rotina ${label} do módulo ${module ?? 'SYSNQRA'} do ERP industrial.`,
  }
}
