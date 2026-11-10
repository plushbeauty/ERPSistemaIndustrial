export type ContextualHelp = {
  title: string
  purpose: string
  steps: string[]
  fields: string[]
  buttons?: string[]
  tips?: string[]
  verified: boolean
}

const help: Record<string, ContextualHelp> = {
  '/pageprincipal/ajuda': {
    title: 'Central de Ajuda',
    purpose: 'Localizar orientações operacionais por tela, módulo ou assunto e abrir diretamente a rotina correspondente.',
    steps: ['Digite o nome da tela, módulo ou assunto no campo de pesquisa.', 'Leia a finalidade apresentada no cartão do resultado.', 'Abra a tela correspondente.', 'Dentro da tela, use o ícone de interrogação no topo para ver a orientação contextual completa.'],
    fields: ['Pesquisa: procura por título, rota, finalidade, etapas e campos cadastrados.', 'Situação da orientação: indica se o conteúdo está cadastrado ou ainda precisa de validação técnica.'],
    buttons: ['Abrir tela: navega para a rotina selecionada.', 'Voltar à tela anterior: retorna à página visitada antes da Central de Ajuda.'],
    tips: ['Uma orientação marcada como pendente não deve ser tratada como procedimento oficial.'],
    verified: true,
  },
  '/pageprincipal': {
    title: 'Painel principal',
    purpose: 'Visão inicial para acessar os módulos e acompanhar indicadores e atalhos disponíveis para o perfil autenticado.',
    steps: ['Confira os indicadores apresentados e o período de referência.', 'Use o menu superior para abrir o módulo desejado.', 'Abra os detalhes de um indicador antes de tomar decisões.', 'Se um cartão não apresentar dados, confira período, empresa ativa e permissões.'],
    fields: ['Período: intervalo usado nos indicadores, quando disponível.', 'Empresa: contexto de dados da sessão autenticada.', 'Indicadores: valores consolidados conforme os registros e permissões disponíveis.'],
    buttons: ['Atalhos: navegam para a rotina correspondente.', 'Atualizar: quando disponível, consulta novamente os dados.'],
    tips: ['O painel não substitui os registros operacionais dos módulos.'],
    verified: true,
  },
  '/pageprincipal/compras': {
    title: 'Central de Compras',
    purpose: 'Centralizar o acompanhamento de necessidades de aquisição, cotações, fornecedores, pedidos e etapas de compra.',
    steps: ['Consulte solicitações e requisições existentes.', 'Abra a rotina de cotação para comparar propostas recebidas.', 'Confira fornecedor, itens, quantidades, preços, frete e prazo.', 'Encaminhe para aprovação conforme as permissões configuradas.', 'Acompanhe o pedido e o recebimento nas rotinas correspondentes.'],
    fields: ['Fornecedor: parceiro selecionado no cadastro.', 'Item: produto ou serviço solicitado.', 'Quantidade/unidade: volume e unidade de compra.', 'Preço e frete: valores da proposta; confira se incluem impostos e transporte.', 'Prazo/condição: entrega e condição comercial negociadas.', 'Status: etapa atual; não significa aprovação se não houver registro do aprovador.'],
    buttons: ['Nova solicitação: inicia uma necessidade de compra.', 'Cotar: registra ou consulta propostas, quando disponível.', 'Aprovar: autoriza a etapa se o perfil tiver permissão.', 'Imprimir/Exportar: gera a saída oferecida pela rotina.'],
    tips: ['Não duplique uma requisição existente; pesquise antes de criar outra.'],
    verified: true,
  },
  '/pageprincipal/compras/solicitacao': {
    title: 'Solicitação de Compra',
    purpose: 'Registrar uma necessidade interna de material ou serviço para avaliação e encaminhamento ao processo de compras.',
    steps: ['Informe o solicitante e o setor de origem.', 'Adicione cada item com descrição, quantidade e unidade.', 'Informe necessidade, prazo e justificativa.', 'Revise os itens e envie para o fluxo previsto.', 'Acompanhe a situação na lista de requisições.'],
    fields: ['Solicitante/setor: origem da demanda.', 'Item/descrição: material ou serviço necessário.', 'Quantidade/unidade: necessidade mensurável.', 'Data necessária: quando o item precisa estar disponível.', 'Justificativa: motivo operacional da solicitação.'],
    buttons: ['Adicionar item: inclui uma linha na solicitação.', 'Salvar: grava o registro conforme validações.', 'Enviar: encaminha para a próxima etapa, se habilitado.'],
    tips: ['Informe especificações suficientes para evitar cotação de item incorreto.'],
    verified: true,
  },
  '/pageprincipal/compras/requisicoes': {
    title: 'Requisições de Compra',
    purpose: 'Consultar e acompanhar requisições de compra registradas pela empresa.',
    steps: ['Pesquise pelo número, solicitante ou status.', 'Abra a requisição para conferir itens e justificativa.', 'Verifique pendências e etapa atual.', 'Use a ação disponível para encaminhar ou tratar a requisição.'],
    fields: ['Número: identificador da requisição.', 'Solicitante: usuário que abriu a necessidade.', 'Status: etapa registrada no fluxo.', 'Data: momento do registro ou atualização.'],
    buttons: ['Consultar: abre os detalhes.', 'Editar: altera dados enquanto a situação e permissão permitirem.', 'Encaminhar: envia para a próxima etapa disponível.'],
    verified: true,
  },
  '/pageprincipal/pcp': {
    title: 'Central PCP — Planejamento e Controle da Produção',
    purpose: 'Planejar e acompanhar ordens de produção, fichas, roteiros, materiais e execução fabril.',
    steps: ['Consulte a demanda e as ordens abertas.', 'Confira ficha técnica, roteiro e disponibilidade de materiais.', 'Verifique capacidade e recursos antes de programar.', 'Libere somente ordens revisadas e autorizadas.', 'Acompanhe apontamentos, quantidades boas, refugos e paradas.'],
    fields: ['Produto: item que será fabricado.', 'Quantidade: volume planejado para a ordem.', 'Datas/prioridade: prazo e sequência de atendimento.', 'Roteiro: operações necessárias para fabricar.', 'Máquina/centro: recurso produtivo responsável.', 'Status: etapa real da ordem.'],
    buttons: ['Nova OP: inicia ordem conforme permissões.', 'Abrir: consulta a ordem e seus dados.', 'Programar: organiza execução quando a rotina permitir.', 'Apontar: registra produção efetivamente realizada.'],
    tips: ['Não confunda quantidade planejada com quantidade efetivamente produzida.'],
    verified: true,
  },
  '/pageprincipal/pcp/fichas-processo': {
    title: 'Fichas de Processo',
    purpose: 'Manter instruções e parâmetros operacionais que orientam a fabricação de um produto.',
    steps: ['Localize o produto e a ficha vigente.', 'Confira operações, parâmetros e instruções.', 'Edite somente se tiver autorização e informação técnica aprovada.', 'Salve a revisão e confirme a vigência conforme o fluxo da tela.'],
    fields: ['Produto/código: item ao qual a ficha se aplica.', 'Operação: etapa do processo produtivo.', 'Parâmetros: condições que devem ser respeitadas.', 'Revisão/status: identificação e situação da ficha.'],
    buttons: ['Consultar: abre a ficha selecionada.', 'Editar: altera os dados permitidos.', 'Imprimir: gera a ficha para uso operacional, quando disponível.'],
    verified: true,
  },
  '/pageprincipal/pcp/capacidade': {
    title: 'Carga e Capacidade de Máquinas',
    purpose: 'Comparar a capacidade semanal cadastrada dos equipamentos com a carga das ordens de produção abertas.',
    steps: ['Confira as máquinas ativas.', 'Informe horas produtivas por dia e dias de trabalho por semana.', 'Salve a capacidade de cada máquina.', 'Compare carga e capacidade e identifique sobrecargas.', 'Replaneje as ordens antes de confirmar a programação.'],
    fields: ['Horas/dia: horas produtivas planejadas por dia.', 'Dias/semana: dias previstos de trabalho.', 'Capacidade semanal: horas/dia multiplicadas pelos dias.', 'Carga: tempo estimado das ordens vinculadas.', 'Ocupação: relação entre carga e capacidade.'],
    buttons: ['Salvar capacidade: grava os parâmetros do equipamento.', 'Exportar CSV: baixa os dados exibidos, quando habilitado.'],
    verified: true,
  },
  '/pageprincipal/chao-de-fabrica/portal-operador': {
    title: 'Portal do Operador',
    purpose: 'Permitir ao operador consultar suas atividades e registrar a execução de operações autorizadas.',
    steps: ['Entre com a conta operacional autorizada.', 'Selecione a ordem/operação atribuída.', 'Confira produto, máquina e instrução vigente.', 'Registre início, quantidade boa, refugo e parada conforme a atividade.', 'Finalize a operação somente após conferir os apontamentos.'],
    fields: ['Ordem/operação: trabalho atribuído.', 'Quantidade boa: peças aprovadas produzidas.', 'Refugo: quantidade não conforme.', 'Parada/motivo: interrupção e causa real.', 'Observação: informação útil para rastreabilidade.'],
    buttons: ['Iniciar: registra o começo quando permitido.', 'Apontar: registra produção e ocorrências.', 'Finalizar: encerra a operação conforme regras de acesso.'],
    tips: ['Nunca registre produção que não foi efetivamente realizada.'],
    verified: true,
  },
  '/pageprincipal/qualidade/rpnc': {
    title: 'RPNC — Registro de Produto/Processo Não Conforme',
    purpose: 'Registrar, rastrear e acompanhar uma não conformidade, sua contenção, análise, ações e encerramento.',
    steps: ['Identifique produto, lote, setor, processo e origem.', 'Descreva objetivamente o desvio e seu impacto.', 'Registre contenção imediata e responsáveis.', 'Encaminhe para análise de causa e plano de ação.', 'Anexe evidências e valide eficácia antes de encerrar.'],
    fields: ['Produto/lote: rastreabilidade do item afetado.', 'Descrição: fato observado, local e condição.', 'Origem/severidade: classificação conforme critérios da qualidade.', 'Contenção: ação imediata para impedir avanço do problema.', 'Responsável/prazo: dono e data prevista da ação.', 'Evidência: arquivo ou registro que comprova execução/eficácia.'],
    buttons: ['Nova RPNC: inicia um registro.', 'Abrir: consulta ocorrência e histórico.', 'Anexar evidência: vincula arquivo ao registro.', 'Encerrar: somente após validação exigida pelo fluxo.'],
    verified: true,
  },
  '/pageprincipal/qualidade/rpnc-formulario': {
    title: 'Formulário RPNC — Ishikawa, 5 Porquês e CAPA',
    purpose: 'Documentar investigação de causa raiz e ações corretivas/preventivas ligadas à não conformidade.',
    steps: ['Confirme a ocorrência e os dados de rastreabilidade.', 'Preencha os ramos do Ishikawa com causas possíveis e evidências.', 'Use os 5 Porquês para aprofundar a causa comprovada.', 'Defina contenção, ação corretiva/preventiva, responsável e prazo.', 'Anexe evidências e registre a verificação de eficácia.'],
    fields: ['6M: Máquina, Método, Mão de obra, Material, Medição e Meio ambiente.', 'Por quê?: cada resposta deve decorrer da anterior e ser verificável.', 'Ação: descreva o que será feito, não apenas a intenção.', 'Responsável: pessoa encarregada da execução.', 'Prazo: data limite acordada.', 'Eficácia: evidência de que a causa foi eliminada ou controlada.'],
    buttons: ['Salvar: grava o formulário conforme validações.', 'Adicionar ação: inclui etapa do plano CAPA.', 'Anexar: vincula evidência à ocorrência.'],
    tips: ['Não trate hipótese como causa raiz confirmada.'],
    verified: true,
  },
  '/pageprincipal/qualidade/auditorias': {
    title: 'Auditorias da Qualidade',
    purpose: 'Planejar, registrar e acompanhar auditorias do sistema de gestão da qualidade.',
    steps: ['Cadastre objetivo, escopo, tipo e período.', 'Defina auditor líder e participantes conforme procedimento.', 'Registre constatações e evidências.', 'Vincule não conformidades quando necessário.', 'Acompanhe ações e encerramento.'],
    fields: ['Objetivo/escopo: o que será avaliado e seus limites.', 'Tipo: classificação da auditoria.', 'Auditor líder: responsável pela condução.', 'Início/fim: período planejado ou realizado.', 'Constatação: evidência objetiva observada.'],
    buttons: ['Nova auditoria: inicia planejamento.', 'Abrir: consulta o registro.', 'Salvar: grava alterações permitidas.'],
    verified: true,
  },
  '/pageprincipal/qualidade/ged': {
    title: 'GED / Evidências da Qualidade',
    purpose: 'Consultar documentos e evidências digitais vinculados às rotinas da qualidade disponíveis nesta tela.',
    steps: ['Pesquise o registro de origem.', 'Confira identificação, lote e descrição.', 'Abra o item para consultar os arquivos vinculados.', 'Respeite o status e as permissões antes de baixar ou alterar.'],
    fields: ['Registro de origem: ocorrência ou documento relacionado.', 'Identificação: código/número do registro.', 'Arquivo: evidência anexada.', 'Data: momento de inclusão.'],
    buttons: ['Abrir: consulta o registro relacionado.', 'Baixar/visualizar: acessa o arquivo conforme permissão.'],
    tips: ['Esta tela GED de evidências não deve ser confundida com um sistema completo de controle de revisões documentais.'],
    verified: true,
  },
  '/pageprincipal/paquimetro': {
    title: 'Paquímetro Digital',
    purpose: 'Registrar medições dimensionais e apoiar a inspeção de características do produto.',
    steps: ['Identifique produto, lote e característica medida.', 'Confira instrumento e unidade de medida.', 'Registre o valor observado.', 'Compare com limites de especificação apresentados.', 'Salve a medição e trate resultados fora do limite conforme procedimento.'],
    fields: ['Produto/lote: item e rastreabilidade.', 'Característica: dimensão ou requisito verificado.', 'Valor medido: leitura do instrumento.', 'Unidade: mm ou unidade indicada.', 'Mínimo/máximo: limites de aceitação cadastrados.'],
    buttons: ['Nova medição: inicia um registro.', 'Salvar: grava o resultado.', 'Imprimir: gera o registro quando disponível.'],
    verified: true,
  },
  '/pageprincipal/rh': {
    title: 'RH / Departamento Pessoal',
    purpose: 'Centralizar rotinas de cadastro e acompanhamento de pessoas, treinamentos e registros de pessoal disponíveis.',
    steps: ['Localize o colaborador antes de criar outro cadastro.', 'Confira os dados e vínculos autorizados.', 'Registre treinamentos e ocorrências com datas e responsáveis.', 'Revise e salve; consulte o histórico para confirmar.'],
    fields: ['Colaborador: pessoa cadastrada.', 'Matrícula: identificador interno.', 'Setor/cargo: vínculo organizacional.', 'Treinamento: capacitação realizada ou planejada.', 'Data/status: situação do registro.'],
    buttons: ['Novo cadastro: inicia registro de colaborador, se permitido.', 'Editar: atualiza informações autorizadas.', 'Salvar: grava conforme validações e permissões.'],
    tips: ['Dados pessoais devem ser acessados somente por usuários autorizados.'],
    verified: true,
  },
  '/pageprincipal/financeiro': {
    title: 'Central Financeira',
    purpose: 'Acompanhar rotinas financeiras e acessar conciliação, importação de extratos, notas de débito e demais operações disponíveis.',
    steps: ['Selecione a rotina financeira adequada.', 'Confira empresa, período e conta antes de lançar ou importar.', 'Revise valores, datas e documentos de origem.', 'Concilie somente transações com correspondência confirmada.', 'Consulte relatórios e histórico para validar o resultado.'],
    fields: ['Conta: conta bancária ou financeira cadastrada.', 'Período: intervalo consultado.', 'Data/valor: dados do lançamento ou extrato.', 'Documento: referência de origem.', 'Status: situação de conciliação ou processamento.'],
    buttons: ['Importar: inicia leitura de arquivo bancário suportado.', 'Conciliar: associa transações correspondentes.', 'Consultar: abre detalhes e histórico.'],
    verified: true,
  },
  '/pageprincipal/financeiro/conciliacao-bancaria': {
    title: 'Conciliação Bancária',
    purpose: 'Comparar movimentações importadas do extrato bancário com lançamentos financeiros registrados no ERP.',
    steps: ['Selecione conta e período.', 'Importe o extrato se ainda não estiver disponível.', 'Compare data, valor e identificação das transações.', 'Associe somente correspondências comprovadas.', 'Revise pendências e finalize a conciliação.'],
    fields: ['Conta bancária: conta do extrato.', 'Data: data da movimentação.', 'Valor: valor debitado ou creditado.', 'Histórico: descrição bancária.', 'Lançamento ERP: registro interno correspondente.'],
    buttons: ['Importar extrato: carrega arquivo suportado.', 'Conciliar: confirma associação.', 'Desfazer: remove associação conforme permissão.'],
    verified: true,
  },
  '/pageprincipal/financeiro/importar-extratos': {
    title: 'Importação de Extratos',
    purpose: 'Carregar arquivo bancário suportado para disponibilizar as transações na conciliação.',
    steps: ['Selecione a conta bancária correta.', 'Escolha o arquivo no formato aceito pela tela.', 'Confira período e prévia das transações.', 'Confirme a importação e verifique o resultado.', 'Abra a conciliação para relacionar os lançamentos.'],
    fields: ['Conta: destino das movimentações.', 'Arquivo: extrato fornecido pelo banco.', 'Período: datas abrangidas pelo arquivo.', 'Prévia: linhas reconhecidas antes da gravação.'],
    buttons: ['Selecionar arquivo: escolhe o extrato.', 'Importar: grava as transações reconhecidas.', 'Ver resultado: apresenta sucesso ou erros de leitura.'],
    verified: true,
  },
  '/pageprincipal/fiscal': {
    title: 'Central Fiscal',
    purpose: 'Acessar rotinas fiscais, documentos, classificação e conferência de informações tributárias.',
    steps: ['Selecione a rotina fiscal desejada.', 'Confira empresa, período e regime aplicável.', 'Revise cadastro do parceiro, produto e classificação fiscal.', 'Valide os dados antes de transmitir ou contabilizar.', 'Guarde os protocolos e documentos de retorno.'],
    fields: ['Período fiscal: competência da operação.', 'Parceiro: cliente ou fornecedor.', 'NCM/CFOP/CST: classificações fiscais aplicáveis.', 'Documento: nota ou lançamento de origem.', 'Status: situação de validação, autorização ou escrituração.'],
    buttons: ['Consultar: abre documentos e lançamentos.', 'Validar: executa verificações disponíveis.', 'Transmitir: somente quando habilitado e após conferência.'],
    tips: ['A ajuda não substitui validação do contador ou responsável fiscal.'],
    verified: true,
  },
  '/pageprincipal/fiscal/emissao': {
    title: 'Emissão de Nota Fiscal Eletrônica',
    purpose: 'Preparar, validar e transmitir uma NF-e a partir dos dados comerciais, fiscais e cadastrais da operação.',
    steps: ['Selecione o tipo e a finalidade da operação.', 'Informe destinatário e endereço conforme cadastro.', 'Inclua produtos, quantidades, valores e tributos.', 'Confira CFOP, NCM, CST/CSOSN, frete e totais.', 'Valide a nota, revise as rejeições e transmita quando autorizada.'],
    fields: ['Destinatário: cliente ou destinatário da operação.', 'Natureza/CFOP: enquadramento da operação.', 'Produto: item e classificação fiscal.', 'Quantidade/preço: valores comerciais da operação.', 'Tributos: bases, alíquotas e valores conforme regra fiscal.', 'Transporte/frete: modalidade e valores aplicáveis.'],
    buttons: ['Adicionar item: inclui produto na nota.', 'Validar: verifica consistência antes da transmissão.', 'Transmitir: envia para autorização SEFAZ.', 'Imprimir DANFE: gera representação da NF-e autorizada, quando disponível.'],
    tips: ['Nunca transmita sem conferir destinatário, operação, impostos e totais.'],
    verified: true,
  },
  '/pageprincipal/cadastros/produtos': {
    title: 'Cadastro de Produtos',
    purpose: 'Manter a identificação e os dados mestres dos produtos usados nos processos comerciais, fiscais, de estoque e produção.',
    steps: ['Pesquise código, descrição ou referência para evitar duplicidade.', 'Abra o produto existente ou inicie um novo cadastro.', 'Preencha identificação, unidade e classificações aplicáveis.', 'Revise dados fiscais, estoque e dimensões quando disponíveis.', 'Salve e confira a confirmação da gravação.'],
    fields: ['Código/descrição: identificação do item.', 'Unidade: unidade de compra, estoque ou venda conforme campo.', 'Grupo/categoria: classificação interna.', 'NCM/CEST/CFOP: classificação fiscal, quando aplicável.', 'Peso/dimensões: dados logísticos.', 'Estoque mínimo/máximo: parâmetros de reposição, quando disponíveis.'],
    buttons: ['Novo: inicia cadastro.', 'Editar: habilita alteração permitida.', 'Salvar: grava o cadastro.', 'Imprimir ficha: gera documento técnico quando disponível.'],
    verified: true,
  },
  '/pageprincipal/cadastros/produtos/ficha-tecnica': {
    title: 'Ficha Técnica do Produto',
    purpose: 'Consultar e manter informações técnicas e de composição/processo associadas ao produto, conforme os recursos da tela.',
    steps: ['Selecione o produto correto.', 'Confira revisão e situação da ficha.', 'Preencha somente os campos técnicos exigidos.', 'Revise os componentes e parâmetros antes de salvar.', 'Gere a impressão para conferência quando necessário.'],
    fields: ['Produto: item ao qual a ficha pertence.', 'Revisão: versão técnica do documento.', 'Componentes: materiais ou itens associados, se exibidos.', 'Parâmetros: especificações aplicáveis.'],
    buttons: ['Selecionar produto: carrega ficha correspondente.', 'Salvar: grava alterações autorizadas.', 'Imprimir: gera a ficha disponível.'],
    verified: true,
  },
  '/pageprincipal/cadastros/produtos/parametros-codigo': {
    title: 'Parâmetros de Código',
    purpose: 'Configurar parâmetros de identificação e geração de códigos de produtos.',
    steps: ['Confira o padrão de codificação aprovado pela empresa.', 'Revise prefixos, sequências e regras disponíveis.', 'Altere somente com autorização do responsável pelo cadastro.', 'Salve e teste com um cadastro controlado antes de uso amplo.'],
    fields: ['Prefixo: parte inicial do código, se configurável.', 'Sequência: regra numérica ou alfanumérica.', 'Máscara: formato esperado do identificador.'],
    buttons: ['Salvar: grava parâmetros.', 'Restaurar: somente se a tela oferecer essa ação e houver autorização.'],
    tips: ['Alterar a regra pode afetar novos cadastros; avalie impactos antes de salvar.'],
    verified: true,
  },,
  '/pageprincipal/controladoria/razao-geral': {
    title: 'Monitor do Razão Geral — GL',
    purpose: 'Auditar e acompanhar débitos e créditos registrados em uma conta bancária ou diário financeiro da empresa, com extrato detalhado e saldo consolidado consultado diretamente no banco.',
    steps: ['Confira a empresa autenticada, preenchida automaticamente.', 'Selecione em Banco / Diário a conta que deseja consultar.', 'Clique em Filtrar para carregar as movimentações.', 'Analise Data, Documento, Descrição, Débito e Crédito.', 'Confira no rodapé os totais da grade e o saldo total do razão calculado sobre todo o histórico da conta.'],
    fields: ['Empresa: contexto da empresa autenticada na sessão; não é editável.', 'Banco / Diário: conta bancária ativa da empresa selecionada.', 'Data: data registrada para o lançamento.', 'Documento: identificador documental do lançamento, quando informado.', 'Descrição: histórico do lançamento.', 'Débito / Crédito: valores exibidos na grade para os lançamentos consultados.'],
    buttons: ['Voltar: retorna à tela visitada anteriormente.', 'Filtrar: consulta os lançamentos da conta selecionada.'],
    tips: ['A grade exibe no máximo os 1.000 lançamentos mais recentes.', 'O saldo total é obtido pela RPC erp_fiscal_saldo_razao no banco e considera o histórico integral da conta, não apenas as linhas exibidas.', 'Os totais de Débitos e Créditos no rodapé representam somente os lançamentos presentes na grade.', 'Se não houver conta selecionada, a grade permanece vazia; nenhum lançamento fictício é exibido.'],
    verified: true,
  },
}


export function resolveContextualHelp(pathname: string): ContextualHelp {
  const exact = help[pathname]
  if (exact) return exact
  const prefix = Object.keys(help).filter((route) => route !== '/pageprincipal' && pathname.startsWith(route + '/')).sort((a, b) => b.length - a.length)[0]
  if (prefix) return { ...help[prefix], title: help[prefix].title + ' — rotina relacionada', tips: [...(help[prefix].tips ?? []), 'Esta rota específica ainda precisa de validação campo a campo com a tela implementada.'], verified: false }
  const leaf = pathname.split('/').filter(Boolean).pop()?.replace(/[-_]/g, ' ') ?? 'tela atual'
  return {
    title: 'Ajuda — ' + leaf.replace(/\b\w/g, (letter) => letter.toUpperCase()),
    purpose: 'Esta tela ainda não possui um procedimento operacional validado. Use a orientação abaixo apenas para navegação segura e não presuma que ações ou campos não documentados existam.',
    steps: ['Confira o título e a finalidade apresentada na própria tela.', 'Identifique os campos obrigatórios sinalizados pela interface.', 'Consulte o responsável do módulo antes de executar uma operação irreversível.', 'Após salvar, confirme a mensagem e consulte o registro para verificar a gravação.'],
    fields: ['Leia o rótulo e a descrição exibidos junto a cada campo.', 'Não preencha valores presumidos nem utilize dados fictícios.', 'Se um campo ou regra não estiver explicado, solicite validação ao responsável pelo módulo.'],
    buttons: ['Use somente ações exibidas e habilitadas na tela.', 'Antes de excluir, cancelar, transmitir ou aprovar, confira o impacto e a permissão.'],
    tips: ['Ajuda específica pendente de validação técnica desta rota.'],
    verified: false,
  }
}

export const contextualHelpRoutes = Object.keys(help)
