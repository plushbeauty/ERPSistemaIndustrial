/**
 * @DATA_REVISAO_APROVACAO: 2026-11-08
 * @REVISAO: REV-TELAS-CONSISTENTES-20261108-01 — verbetes de Dashboard de RNC/CAPA, Sala de RNC/RPNC e Controle de Processo da Injetora; as três telas passam a usar o card de abertura navy único do shell em vez de cabeçalho próprio.
 * @REVISAO: REV-CENTRAL-AJUDA-TELAS-20261104-01 — cada verbete ganhou bloco de ajuda (como preencher / como usar / atenção) exibido no card de abertura
 * @AUTOR: FernandoSch
 * @STATUS_APROVACAO: ORDEM DO PROPRIETARIO EM 2026-11-04: "o cliente vai entrar e tem que ter nada para explicar para que serve a pagina, como preencher, como usar"
 * Chaves: caminho já normalizado (sem o prefixo /pageprincipal e sem barra final).
 * Telas que já desenham o próprio cabeçalho (Central de Compras, Financeiro,
 * Administração, Configurações e a Central de Ajuda) ficam fora do card do shell para não duplicar a abertura.
 * O verbete 'ajuda' continua no catálogo porque é indexado pela própria Central de Ajuda.
 * As balizas de help são escritas a partir do que a tela realmente faz no banco; nada aqui
 * promete campo, botão ou gravação que a página não tenha.
 */
import type { PageIntro } from './PageIntroCard'

const introCatalog: Record<string, PageIntro> = {
  '': {
    module: 'SYSNQRA ERP · SGQ INDUSTRIAL', title: 'Central de Comando Industrial',
    description: 'Painel executivo com os números reais da empresa autenticada: OPs em andamento, produção do dia, OEE, peças no prazo e em atraso, RNCs abertas, metrologia e a fileira das ordens em execução.',
    help: {
      fill: ['Nada a preencher: a tela só lê. Confira se o nome da empresa no topo é a sua empresa autenticada.', 'Se um número vier zerado, confirme primeiro se existe cadastro no módulo correspondente; o painel não inventa valor.'],
      use: ['Comece pela fileira de ordens em execução: é o que a fábrica está fazendo agora.', 'Cada bloco é um indicador, não um botão de manutenção: para agir, abra o módulo pelo menu (PCP, Qualidade, Estoque).', 'Índice em atraso ou OEE baixo se investigam nas telas de Capacidade, Apontamentos e RPNC do próprio módulo.'],
      watch: 'Os valores dependem do apontamento feito no chão de fábrica. Produção não apontada não aparece aqui.',
    },
  },
  'cadastro-master': {
    module: 'Implantação', title: 'Cadastro Master da Empresa',
    description: 'Configuração inicial do tenant: empresa emissora, plano de acesso e primeiro usuário administrador.',
    help: {
      fill: ['Informe os dados da empresa emissora exatamente como aparecem no CNPJ: razão social, nome fantasia e endereço fiscal.', 'Escolha o plano de acesso conforme a quantidade de usuários e módulos contratados.', 'Cadastre o primeiro administrador com e-mail individual — é essa conta que recebe o convite e abre o sistema.'],
      use: ['Concluído o cadastro, a empresa passa a existir como tenant: todas as demais telas filtram automaticamente pelo identificador dela.', 'Use a conta administradora para convidar os demais usuários; cada pessoa trabalha com login próprio.'],
      watch: 'Dados de emissão fiscal errados aqui se propagam para NF-e, certificados e relatórios.',
    },
  },
  'ajuda': {
    module: 'SYSNQRA ERP · SGQ INDUSTRIAL', title: 'Central de Ajuda',
    description: 'Procedimentos operacionais, POPs e orientação contextual de todas as rotinas do sistema.',
    help: {
      fill: ['Digite no campo de busca parte do nome da tela (por exemplo "certificado", "estoque", "RPNC").', 'Nenhum dado é gravado nesta tela: ela é consulta.'],
      use: ['Clique no verbete para ir direto para a tela; a ajuda rápida dela abre junto com a página.', 'Procure aqui antes de ligar para o suporte: o texto que aparece em cada tela é o mesmo catálogo desta central.'],
    },
  },
  'pcp': {
    module: 'Engenharia e PCP', title: 'Central PCP',
    description: 'Planejamento e controle da produção: ordens, apontamentos, necessidade de materiais e agenda de máquinas.',
    help: {
      fill: ['Monte a ordem de produção a partir de um produto e um pedido já cadastrados; não digite código de memória.', 'Informe quantidade, máquina e datas planejadas no intervalo em que o equipamento está livre.'],
      use: ['Depois de programada, a OP aparece no Portal do Operador e é apontada pelo chão de fábrica.', 'A baixa de material e o saldo vêm do Estoque; a necessidade de compra vem do cálculo de MRP desta central.', 'Use Capacidade para ver se a máquina aguenta a carga antes de confirmar o prazo ao cliente.'],
    },
  },
  'pcp/fichas-processo': {
    module: 'Engenharia e PCP', title: 'Fichas de Processo',
    description: 'Ficha em 4 abas: Processo, Matéria-prima (Item, Cód. MP, Descrição, %, Qtde, Unid, com foto puxada do cadastro de produtos ao clicar na descrição), Molde (número, desenho e fotos) e Qualidade & SGQ.',
    help: {
      fill: ['Selecione o produto e a máquina na aba Processo; o ciclo e o setup calculam o tempo padrão da operação.', 'Na aba Matéria-prima, escolha o insumo pelo cadastro de produtos — a foto, a descrição e a unidade vêm dele, não são digitadas.', 'Percentuais e quantidades devem fechar com a BOM do produto.', 'Anexe o desenho e as fotos do molde na aba Molde; os arquivos vão para o repositório da empresa.'],
      use: ['A ficha só vale para a produção depois de aprovada; ficha em rascunho não aparece para o operador.', 'O apontamento do operador confere a quantidade produzida contra o ciclo desta ficha.', 'Alterações importantes pedem nova revisão em vez de sobrescrever a ficha aprovada.'],
      watch: 'Sem ficha aprovada, o Portal do Operador não libera início de produção daquela peça.',
    },
  },
  'pcp/roteiros': {
    module: 'Engenharia e PCP', title: 'Roteiro de Operações',
    description: 'Sequência de operações, máquinas e tempos padrão que cada produto percorre na fábrica.',
    help: {
      fill: ['Cadastre as operações na ordem real de execução, com número da operação e posto ou máquina.', 'Informe tempo de setup e tempo de ciclo por peça; é isso que alimenta capacidade e prazo.'],
      use: ['O roteiro é o esqueleto que a OP herda ao ser criada.', 'Mudar o roteiro não reescreve ordens já emitidas: vale para as próximas.'],
    },
  },
  'pcp/capacidade': {
    module: 'Engenharia e PCP', title: 'Carga e Capacidade',
    description: 'Capacidade cadastrada por máquina confrontada com a carga real das ordens de produção abertas.',
    help: {
      fill: ['Cadastre a capacidade de cada máquina em horas/dia e o turno de operação.', 'A carga vem das ordens; não digite horas de trabalho manuais para "fechar" o número.'],
      use: ['Máquina acima de 100% significa prazo irreal: realoque a OP para outro equipamento ou revise a sequência.', 'Compare com a agenda de máquinas antes de prometer data de entrega ao cliente.'],
    },
  },
  'chao-de-fabrica/portal-operador': {
    module: 'Chão de Fábrica', title: 'Portal do Operador',
    description: 'Entrada do operador para apontar produção, consultar a OP em execução e registrar ocorrências.',
    help: {
      fill: ['O operador entra com a própria conta; a programação exibida é a dele, vinculada pelo cadastro de RH.', 'Ao iniciar a produção, registre o horário de início; ao terminar, informe peças boas, refugo e motivo de parada.'],
      use: ['Cada apontamento dá baixa na OP e atualiza a produção do dia na Central de Comando.', 'Refugo registrado aqui alimenta os gráficos e a análise da Qualidade.', 'Parada e setup sem registro ficam invisíveis para o PCP — registre no ato, não no fim do turno.'],
      watch: 'Funciona apenas com a conta individual do funcionário cadastrado no RH com o mesmo e-mail do login.',
    },
  },
  'chao-de-fabrica/apontamento-operador': {
    module: 'Chão de Fábrica', title: 'Apontamento por cartão de ponto',
    description: 'Terminal do posto: o número do cartão mais os 3 últimos dígitos do CPF identificam o operador no RH e abrem a programação do PCP do dia e da semana, as máquinas atribuídas e a ficha de processo da peça direto do banco.',
    help: {
      fill: ['Digite o número do cartão (RFID) ou a matrícula cadastrada no RH e os 3 últimos dígitos do CPF do próprio operador; toque em Abrir minha programação.', 'Selecione a tarefa do dia antes de iniciar: o apontamento precisa de OP, máquina e ficha aprovada.', 'Ao finalizar, informe peças boas e refugadas; com refugo, a descrição do defeito é obrigatória.'],
      use: ['Início, fim, duração e a baixa na programação são carimbados pelo relógio do banco.', 'A aba Ficha de processo lê erp_fichas_processo, a sequência de operações e a receita aprovada do produto.', 'Parada registrada aqui entra em erp_producao_paradas e aparece no OEE; encerre a parada antes de trocar de motivo.'],
      watch: 'Sem cartão cadastrado no RH (numero_cracha_rfid ou matrícula) e sem CPF preenchido no cadastro do funcionário a tela não abre a agenda. Após 8 tentativas erradas o cartão fica bloqueado por 15 minutos; não existe operador de demonstração.',
    },
  },
  'chao-de-fabrica/postos': {
    module: 'Chão de Fábrica', title: 'Postos de Trabalho',
    description: 'Cadastro de postos e setores com responsável, turno e recursos vinculados à produção.',
    help: {
      fill: ['Informe código, nome do posto, setor, responsável e turno.', 'Vincule as máquinas que o posto opera; é isso que limita o que pode ser apontado nele.'],
      use: ['Posto cadastrado é o que faz a programação cair na tela certa do operador.', 'Setor e turno definem a apuração de horas e o relatório de produção por área.'],
    },
  },
  'estoque/auditoria-saldos': {
    module: 'Estoque', title: 'Auditoria de Saldos e Inventário',
    description: 'Saldo do sistema confrontado com a contagem física, por item, lote e endereço de armazenagem.',
    help: {
      fill: ['Selecione o intervalo físico informado na contagem, item por item, com endereço e lote quando controlados.', 'Justifique toda diferença relevante no campo de observação da contagem.'],
      use: ['A divergência apontada aqui se corrige pela tela de Ajuste, que gera o movimento de estoque correspondente.', 'Nunca ajuste direto no cadastro para "fechar" o saldo: sem movimento, a auditoria perde o histórico.'],
    },
  },
  'estoque/balanco': {
    module: 'Estoque', title: 'Balanço e Valoração de Estoque',
    description: 'Quantidades e valores de estoque para a valoração contábil do período apurado.',
    help: {
      fill: ['Escolha a data de apuração do período que será valorado; os custos vêm das entradas e do cadastro de custos.'],
      use: ['Use o total por grupo para a escrituração do período e para a conversa com a contabilidade.', 'Valor diferente do esperado quase sempre é entrada sem custo ou movimento ainda não baixado.'],
    },
  },
  'estoque/depreciacao': {
    module: 'Estoque', title: 'Regras de Depreciação de Estoque',
    description: 'Métodos, taxas e critérios de desvalorização aplicados aos itens em armazenagem.',
    help: {
      fill: ['Defina método, percentual e base de cálculo por grupo de item; a regra vale para o estoque futuro, não retroage.', 'Registre a data de vigência de cada regra.'],
      use: ['A valoração do Balanço aplica as regras vigentes na data de apuração.', 'Alterar taxa muda o valor de estoque apresentado: faça com anuência de quem responde pela contabilidade.'],
    },
  },
  'estoque/rastreabilidade': {
    module: 'Estoque', title: 'Rastreabilidade de Lotes',
    description: 'Cadeia do lote consultada no banco: fornecedor e NF-e de entrada, componentes consumidos, retenções de qualidade e o destino por OP, pedido de venda e cliente.',
    help: {
      fill: ['Digite ou escaneie o número do lote que quer investigar; a busca é exata sobre os lotes registrados.'],
      use: ['Em reclamação de cliente, siga a cadeia do lote até a entrada do fornecedor para saber o que mais foi atingido.', 'Em bloqueio de fornecedor, use o mesmo caminho para listar as OPs e pedidos que consumiram aquele lote.', 'A consulta não altera nada: é leitura da cadeia real.'],
      watch: 'Lote sem entrada registrada não tem cadeia: só aparece o consumo.',
    },
  },
  'almoxarifado/saida-material': {
    module: 'Almoxarifado', title: 'Controle e Saída de Material',
    description: 'Baixa de material do almoxarifado por setor, endereço e finalidade, gravada pela RPC de movimento com saldo e bloqueio de negativo calculados no servidor.',
    help: {
      fill: ['Escolha o item pelo cadastro, informe quantidade, setor destinatário e finalidade da saída.', 'Se a quantidade for maior que o saldo livre, o banco recusa: não tente contornar com valor menor repetido.'],
      use: ['A baixa sai do saldo do almoxarifado imediatamente e entra no razão de movimentações.', 'Consumo de produção deve ser apontado pela OP, não por esta tela, para não perder a relação com a ordem.'],
    },
  },
  'estoque': {
    module: 'Estoque', title: 'Estoque e Almoxarifado',
    description: 'Saldo por produto, inventário cíclico, entrada, saída, transferência entre endereços, almoxarifados e histórico de movimentos da empresa autenticada.',
    help: {
      fill: ['Trabalhe sempre pelo endereço e pelo lote reais do item; omitir endereço quebra a rastreabilidade.', 'Toda movimentação pede documento de origem (nota, OP ou requisição) no campo correspondente.'],
      use: ['Entrada alimenta saldo, saída consome, transferência troca de endereço sem alterar o total.', 'O histórico de movimentos é a prova usada em auditoria: não edite valores depois de gravados.'],
    },
  },
  'estoque/saldos': {
    module: 'Estoque', title: 'Saldo de Estoque por Produto',
    description: 'Saldo, ponto de reposição e necessidade de reposição calculados sobre erp_produtos, com pesquisa, filtro por categoria, página de 25 itens e impressão.',
    help: {
      fill: ['Pesquise por código, nome ou categoria; use a paginação de 25 itens para percorrer a lista.'],
      use: ['Item abaixo do ponto de reposição é candidato à solicitação de compra.', 'A impressão serve para contagem física; anote na folha e confira na tela de Auditoria de Saldos.'],
    },
  },
  'estoque/enderecos': {
    module: 'Estoque', title: 'Endereços Físicos de Armazenagem',
    description: 'Locais de guarda cadastrados em erp_estoque_localizacoes, vinculados ao almoxarifado, ao tipo e à situação ativa da empresa.',
    help: {
      fill: ['Cadastre o endereço com o código impresso na etiqueta física do local, almoxarifado pai e tipo (picking, armazenagem, quarentena).', 'Inative endereço desativado fisicamente; não apague endereço que já teve movimento.'],
      use: ['Endereço é o que permite separação, FIFO e inventário por localização.', 'Sem o endereço real, a contagem física não fecha com o sistema.'],
    },
  },
  'estoque/movimentacoes': {
    module: 'Estoque', title: 'Movimentações de Estoque',
    description: 'Razão de entradas, saídas e transferências gravadas em erp_estoque_movimentos, com produto, quantidade, origem, documento e observação.',
    help: {
      fill: ['Nada se digita aqui: a lista é o resultado dos movimentos gerados pelas telas de entrada, saída, ajuste e produção.'],
      use: ['Filtre por item e período para achar o movimento que explica uma diferença de saldo.', 'Uso em auditoria: cada linha tem usuário, data e documento de origem.'],
    },
  },
  'estoque/ajustes': {
    module: 'Estoque', title: 'Ajuste de Avaria',
    description: 'Baixa de item avariado com motivo e responsável, registrada como movimento de estoque para o saldo não ficar divergente da contagem física.',
    help: {
      fill: ['Selecione o item, a quantidade avariada, o motivo e o endereço de onde o material está.', 'Anexe ou descreva a evidência quando a avaria for reclamada de fornecedor ou transportadora.'],
      use: ['O ajuste gera movimento de saída específico; o saldo passa a bater com a prateleira.', 'Item avariado ainda não baixado continua aparecendo como disponível para venda: baixe o mais rápido possível.'],
    },
  },
  'estoque/separacao': {
    module: 'Estoque', title: 'Separação de Material',
    description: 'Reserva e baixa de material por OP e endereço, com rastreabilidade do que foi separado para a produção.',
    help: {
      fill: ['Confirme a quantidade separada endereço por endereço, na ordem indicada pelo sistema (FIFO/PEPS quando controlado por lote).'],
      use: ['O que foi separado fica indisponível para outras ordens: evita conflito de material no chão de fábrica.', 'Separação sem baixa real deixa o saldo "reservado" e mascara a necessidade de compra.'],
    },
  },
  'estoque/recebimento-lotes': {
    module: 'Estoque', title: 'Recebimento de Insumos e Lotes',
    description: 'Entrada de insumos com lote, fornecedor e documento fiscal, gerando o movimento de estoque que alimenta o saldo e a rastreabilidade.',
    help: {
      fill: ['Transcreva lote, quantidade e data de fabricação/vencimento exatamente como na etiqueta do fornecedor.', 'Informe o número da NF-e e o fornecedor; é essa dupla que sustenta a rastreabilidade futura.'],
      use: ['O recebimento cria o saldo e o registro de rastreabilidade do lote.', 'Insumo em quarentena não deve ser consumido antes da liberação da Qualidade.'],
    },
  },
  'estoque/etiquetas': {
    module: 'Estoque', title: 'Etiquetas do Estoque',
    description: 'Impressão de etiquetas industriais dos itens do estoque, montada a partir do cadastro de produtos e do usuário autenticado.',
    help: {
      fill: ['Selecione os itens e a quantidade de etiquetas por item; o código de barras é gerado a partir do SKU cadastrado.'],
      use: ['Etiqueta impressa é o que o coletor lê na movimentação; sem ela, o endereço não é conferido.', 'Reimpressão não gera novo código: o SKU continua o mesmo.'],
    },
  },
  'estoque/validade': {
    module: 'Estoque', title: 'Validade e FIFO / PEPS',
    description: 'Controle de vencimento por lote, com consumo na ordem de vencimento, sobre os lotes e movimentos reais do estoque.',
    help: {
      fill: ['Mantenha a data de vencimento preenchida no recebimento; sem data não há ordem de consumo.'],
      use: ['Consuma sempre o lote que vence primeiro indicado pela tela.', 'Lote vencido em saldo deve ser baixado ou bloqueado pela Qualidade, não vendido.'],
    },
  },
  'estoque/curva-abc': {
    module: 'Estoque', title: 'Curva ABC de Valorização',
    description: 'Classificação dos itens por participação em valor, calculada sobre saldos e custos cadastrados da própria empresa.',
    help: {
      fill: ['Nada a digitar: confira apenas se os custos dos itens estão cadastrados, pois item sem custo sai da curva.'],
      use: ['Itens A concentram valor: são os que merecem contagem cíclica mais frequente.', 'Curva serve de base para negociar estoque mínimo e política de compra.'],
    },
  },
  'almoxarifado': {
    module: 'Almoxarifado', title: 'Almoxarifado Mestre · FIFO e Lotes',
    description: 'Posição de estoque por almoxarifado, endereço e lote em ordem FIFO, somente com tabelas reais da empresa autenticada.',
    help: {
      fill: ['Filtre por almoxarifado para ver só a posição da sua área.'],
      use: ['Use esta visão antes de separar material: ela mostra qual lote deve sair primeiro.', 'Transferência entre almoxarifados é feita na tela de movimentação de estoque, não aqui.'],
    },
  },
  'almoxarifado/inventario-mestre': {
    module: 'Almoxarifado', title: 'Inventário Mestre · Rastreabilidade FIFO',
    description: 'Inventário consolidado por almoxarifado, endereço e lote, na ordem de consumo FIFO apurada nos movimentos do estoque.',
    help: {
      fill: ['Registre a contagem física por endereço e lote, não apenas pelo total do item.'],
      use: ['O confronto com o sistema gera a lista de divergências para ajuste.', 'Inventário por lote permite saber quais produtos acabados consumiram o lote divergente.'],
    },
  },
  'paquimetro': {
    module: 'Qualidade / Metrologia', title: 'Paquímetro Digital',
    description: 'Medição dimensional com leitura, tolerância e evidência da inspeção registrada no lote.',
    help: {
      fill: ['Informe o instrumento usado, o item e a cota medida, com a faixa de tolerância do desenho.', 'Anexe a evidência (foto ou arquivo da medição) quando o plano exigir registro visual.'],
      use: ['Medição fora da faixa abre não conformidade: trate na RPNC e vincule o lote.', 'O histórico por instrumento é o que sustenta a conferência metrológica periódica.'],
    },
  },
  'qualidade/rpnc': {
    module: 'Qualidade / SGQ', title: 'RPNC · Registro de Não Conformidade',
    description: 'Abertura, triagem e acompanhamento de não conformidades com causa raiz, plano de ação e evidências.',
    help: {
      fill: ['Descreva o fato observado com peça, lote e quantidade; evite conclusões no relato.', 'Classifique a gravidade, registre a contenção imediata e só então avance para causa raiz.'],
      use: ['A RPNC acompanha o problema até a eficácia da ação, com responsável e prazo.', 'Conclusão sem evidência anexada não fecha a não conformidade.'],
    },
  },
  'qualidade/rpnc-formulario': {
    module: 'Qualidade / SGQ', title: 'Formulário de Tratamento de Não Conformidade',
    description: 'Relato da ocorrência, Ishikawa e 5 Porquês, plano de ação CAPA com responsáveis e prazos, alerta de recorrência por peça/lote e impressão do relatório do SGQ.',
    help: {
      fill: ['Preencha o relato antes de montar o Ishikawa; as 6M se editam diretamente nas espinhas, com causa e subcausa.', 'Nos 5 Porquês, responda encadeado até chegar à causa raiz, e não ao sintoma.', 'Em cada ação CAPA coloque responsável, prazo e forma de verificar a eficácia.'],
      use: ['O sistema avisa quando a mesma peça ou lote já teve não conformidade registrada.', 'Imprima o relatório para assinatura e arquivo do SGQ; o conteúdo impresso é o mesmo do banco.', 'Ações em atraso continuam visíveis no painel de RPNC.'],
    },
  },
  'qualidade/dashboard-rnc': {
    module: 'Qualidade / SGQ', title: 'Dashboard de RNC e CAPA',
    description: 'Indicadores reais de não conformidades abertas, eficácia das ações CAPA, revisões documentais pendentes, inspeção de recebimento e inspeção dimensional.',
    help: {
      fill: ['Nada a preencher: a tela só lê os registros da empresa autenticada.', 'Se um indicador vier zerado, confirme se existe RNC, ação CAPA, revisão ou inspeção lançada no módulo correspondente.'],
      use: ['Use os gráficos para priorizar setor e tipo de desvio antes de abrir uma nova RPNC.', 'Cada cartão leva ao módulo de origem: RPNC, documentos, recebimento ou metrologia.'],
    },
  },
  'qualidade/sala-rnc': {
    module: 'Qualidade / SGQ', title: 'Sala de RNC / RPNC',
    description: 'Triagem, disposição física, análise dos 5 Porquês e ações mitigatórias 5W2H da não conformidade, com histórico e impressão em A4.',
    help: {
      fill: ['Registre a ocorrência com data real, criticidade e setor; a descrição deve permitir rastrear peça e lote.', 'Na análise, responda os 5 Porquês até a causa raiz e feche cada ação 5W2H com responsável e prazo.'],
      use: ['A RPNC só é encerrada com disposição registrada e eficácia verificada.', 'Use Imprimir A4 para o formulário controlado do SGQ; o relatório usa os dados do banco, não a captura da tela.'],
    },
  },
  'pcp/controle-injetora': {
    module: 'Engenharia e PCP', title: 'Controle de Processo da Injetora',
    description: 'Cartão de Controle de Processo Produtivo (CCPP): liberação de máquina, perfil térmico, amostragem e diário de bordo da injetora.',
    help: {
      fill: ['Selecione a OP e a máquina reais antes de preencher o CCPP.', 'Informe o perfil térmico e a amostragem medidos no turno; o diário de bordo registra o que ocorreu, não o que estava previsto.'],
      use: ['A liberação da máquina vale para o lote em execução; troca de material ou molde exige novo registro.', 'Use Imprimir A4 para o CCPP controlado; o relatório é montado a partir dos dados gravados.'],
      watch: 'Com POM/poliacetal, siga o alerta de segurança: fechar a guilhotina uma hora antes do fim e nunca deixar material no cilindro.',
    },
  },
  'qualidade/auditorias': {
    module: 'Qualidade / SGQ', title: 'Auditorias da Qualidade',
    description: 'Programa de auditorias por norma e período, com líder, status e as RPNCs vinculadas como constatações.',
    help: {
      fill: ['Monte o programa com norma, área auditada, período e líder da equipe.', 'Cada constatação deve virar RPNC vinculada; constatação solta não gera rastre de ação.'],
      use: ['Use o status para saber o que ainda falta executar no ciclo.', 'Auditoria externa usa o mesmo histórico de constatações e ações como evidência.'],
    },
  },
  'qualidade/documentos': {
    module: 'Qualidade', title: 'Controle de Alteração de Documentos da Qualidade',
    description: 'Página única em 7 abas do controle documental do SGQ: cadastro, anexos em PDF versionados, obsoletos com alerta de referência, revisões e aprovações, visualização, distribuição com ciência de leitura e impressão de cópias controladas.',
    help: {
      fill: ['Cadastre código, título, tipo, norma de referência e a revisão vigente do documento.', 'Anexe o PDF da revisão na aba de anexos; a versão anterior permanece no histórico.', 'Na distribuição, selecione os destinatários reais da cópia controlada.'],
      use: ['Documento obsoleto referenciado por outro ativo gera alerta: corrija a referência antes de aprovar.', 'Ciência de leitura é registrada por destinatário e serve de evidência de treinamento.', 'Cópias controladas impressas saem com identificação de usuário e data.'],
    },
  },
  'qualidade/ged': {
    module: 'Qualidade', title: 'GED · Documentos da Qualidade',
    description: 'Repositório controlado de procedimentos, instruções de trabalho e registros do sistema de gestão.',
    help: {
      fill: ['Organize por tipo de documento e área; o título deve permitir encontrar o procedimento sem abrir o arquivo.'],
      use: ['Consulta rápida de instruções no chão de fábrica.', 'O controle formal de revisão, aprovação e distribuição fica na tela de Controle de Alteração de Documentos.'],
    },
  },
  'qualidade/ged-documentos': {
    module: 'Qualidade', title: 'Editor de Documentos do SGQ',
    description: 'Emissão e revisão do corpo textual do procedimento no acervo legado do SGQ; o controle documental com anexos, distribuição e ciência de leitura está em Controle de Alteração de Documentos.',
    help: {
      fill: ['Edite o corpo do texto e registre o motivo da revisão.', 'Não duplique procedimento: pesquise o código antes de criar.'],
      use: ['Use esta tela para escrever e revisar o texto do procedimento.', 'Para anexar PDF controlado, distribuir e colher ciência, vá em Controle de Alteração de Documentos.'],
    },
  },
  'qualidade/certificados': {
    module: 'Qualidade', title: 'Certificado de Qualidade',
    description: 'Certificado dimensional do lote: cadastro da peça e das cotas nominais com tolerâncias, medições conferidas uma a uma, desenho de referência anexado e impressão do certificado com o número de série e o inspetor responsável.',
    help: {
      fill: ['Informe código e descrição da peça, ordem de produção ou lote, data da inspeção e, quando houver, cliente e número de série.', 'Anexe o desenho técnico (JPG, PNG, WebP ou PDF até 15 MB): é a referência da medição.', 'Para cada cota preencha identificação, descrição, nominal, mínimo e máximo; o medido entra quando a peça for efetivamente medida.'],
      use: ['O resultado de cada cota e o status do certificado são recalculados no banco, não no navegador.', 'Selecione o registro no histórico para reabrir, conferir as medições e imprimir ou salvar em PDF A4.', 'Certificado REPROVADO ou PENDENTE imprime com aviso de que não declara conformidade.'],
      watch: 'Inspetor e empresa vêm da sessão autenticada. Cotas sem medição mantêm o certificado pendente.',
    },
  },
  'compras/solicitacao': {
    module: 'Compras', title: 'Solicitação de Compra',
    description: 'Necessidade interna formalizada com itens, urgência e aprovação antes de ir para cotação.',
    help: {
      fill: ['Selecione o item pelo cadastro e justifique a necessidade (reposição, OP, projeto).', 'Informe quantidade real e a data em que o material precisa estar disponível.'],
      use: ['Solicitação aprovada vira cotação e, depois, pedido de compra.', 'Urgência e data desejada orientam o comprador na priorização.'],
    },
  },
  'compras/requisicoes': {
    module: 'Compras', title: 'Requisições de Compra',
    description: 'Fila de requisições abertas pelos setores, com andamento, responsável e vínculo com a cotação.',
    help: {
      fill: ['Nada se cadastra aqui: a fila recebe as solicitações dos setores.'],
      use: ['Filtre por setor ou responsável para cobrar as pendências do mês.', 'Requisição sem cotação vinculada é o primeiro lugar onde o atraso de compra aparece.'],
    },
  },
  'rh': {
    module: 'RH / Departamento Pessoal', title: 'Gestão de Pessoas',
    description: 'Colaboradores, jornada, custo de hora e dados de pessoal integrados ao PCP e à folha.',
    help: {
      fill: ['Cadastre o funcionário com matrícula, nome e o mesmo e-mail da conta individual dele no portal.', 'Informe turno, setor e custo de hora; é o custo usado no rateio de produção.'],
      use: ['Funcionário sem e-mail igual ao da conta não consegue entrar no Portal do Operador.', 'O custo de hora alimenta o custo real da OP e os indicadores de produtividade.'],
      watch: 'Situação inativa, desligada ou demitida bloqueia o acesso do funcionário às telas de chão de fábrica.',
    },
  },
  'fiscal': {
    module: 'Fiscal', title: 'Central Fiscal Integrada',
    description: 'Apuração, conferência de documentos e obrigações acessórias do tenant autenticado.',
    help: {
      fill: ['Selecione o período de apuração; nada se digita para fechar valor de imposto.'],
      use: ['Confira os documentos pendentes antes de fechar o período.', 'Divergência de imposto quase sempre nasce de classificação fiscal errada no cadastro do produto.'],
    },
  },
  'fiscal/ano': {
    module: 'Fiscal', title: 'Ano Fiscal',
    description: 'Exercícios, períodos e datas de fechamento contábil e fiscal da empresa.',
    help: {
      fill: ['Defina exercício, número de períodos e a data de fechamento de cada período.'],
      use: ['Período fechado bloqueia lançamentos retroativos: é o que protege a apuração já entregue.', 'As demais telas fiscais usam estes períodos para filtrar consultas.'],
    },
  },
  'fiscal/classificacao': {
    module: 'Fiscal', title: 'Classificação Fiscal de Produtos',
    description: 'Vinculação de NCM, CEST e tributação aos produtos, conferida na base oficial vigente.',
    help: {
      fill: ['Informe NCM e, quando exigido, CEST; confira CFOP de entrada e saída, alíquotas e tratamentos.', 'Valide a descrição do NCM na base oficial antes de gravar.'],
      use: ['A nota fiscal do produto usa exatamente esta classificação.', 'NCM errado gera imposto errado e pode exigir carta de correção ou nota de ajuste.'],
    },
  },
  'fiscal/auditoria-documental': {
    module: 'Fiscal', title: 'Auditoria Documental',
    description: 'Documentos fiscais pendentes, inconsistências e evidências organizados por período.',
    help: {
      fill: ['Nada se corrige aqui: liste os documentos e trate cada um na tela de origem.'],
      use: ['Comece pelo que tem rejeição ou falta de autorização.', 'Pendência não tratada vira obrigação acessória entregue com erro.'],
    },
  },
  'fiscal/estorno': {
    module: 'Fiscal', title: 'Estorno de Lançamentos',
    description: 'Solicitação e aprovação de estornos contábeis com justificativa e trilha de auditoria.',
    help: {
      fill: ['Descreva o erro real do lançamento e o que o estorno corrige, com a data competente.', 'Anexe a evidência que sustenta o pedido.'],
      use: ['O estorno só vale depois de aprovado por quem tem autorização.', 'Aprovação gera o lançamento de contrapartida com trilha de auditoria.'],
    },
  },
  'fiscal/razao': {
    module: 'Fiscal', title: 'Painel Razão Geral',
    description: 'Lançamentos consultados por conta, período e centro de custo no razão geral.',
    help: {
      fill: ['Escolha conta, período e centro de custo; a consulta é de leitura.'],
      use: ['Use para conferir se o valor do relatório vem de lançamento real.', 'Saldos que não fecham indicam documento lançado em conta errada.'],
    },
  },
  'fiscal/emissao': {
    module: 'Fiscal', title: 'Emissão de NF-e (modelo 55)',
    description: 'Monte a nota nas abas do emissor, confira as advertências antes de gravar e acompanhe a transmissão na grade de gerenciamento. A numeração é reservada pelo banco, o documento trava ao sair de Rascunho e nada é declarado autorizado sem chave de 44 dígitos e protocolo devolvidos pelo integrador.',
    help: {
      fill: ['Percorra as abas na ordem: destinatário, produtos, transporte, impostos e extras.', 'Selecione itens do pedido de venda sempre que existir; digitar o produto à mão desconecta a nota do pedido.', 'Confira as advertências do validador antes de gravar; cada uma aponta o campo faltante.'],
      use: ['Rascunho pode ser corrigido; documento transmitido não se edita.', 'Acompanhe a situação na grade de gerenciamento e trate rejeição corrigindo o campo apontado.', 'Autorizada significa chave de 44 dígitos e protocolo do fisco devolvidos: sem isso, a tela não declara a nota autorizada.'],
      watch: 'Cancelamento ou carta de correção exigem documento próprio e seguem regra do fisco.',
    },
  },
  'financeiro/conciliacao-bancaria': {
    module: 'Financeiro', title: 'Conciliação Bancária',
    description: 'Extratos importados confrontados com os lançamentos do sistema, diferença por diferença.',
    help: {
      fill: ['Importe o extrato primeiro (tela de Importação de Extrato) e selecione a conta conciliada.'],
      use: ['Clique no lançamento do banco para vincular ao lançamento do sistema, e vice-versa.', 'O que sobrar sem par é a diferença real do período: investigue antes de fechar o mês.'],
    },
  },
  'financeiro/importar-extratos': {
    module: 'Financeiro', title: 'Importação de Extrato',
    description: 'Importação de arquivos de extrato e registro dos lançamentos bancários da empresa.',
    help: {
      fill: ['Selecione a conta bancária de destino e envie o arquivo no formato exportado pelo banco (OFX ou similar).', 'Confira a data de início e fim do arquivo antes de importar.'],
      use: ['A importação cria os lançamentos bancários usados na conciliação.', 'Importar o mesmo período duas vezes gera duplicidade: verifique o saldo já conciliado.'],
    },
  },
  'financeiro/lista-precos-cliente': {
    module: 'Financeiro', title: 'Lista de Preços por Cliente',
    description: 'Tabelas de preço por cliente, usadas para validar os valores praticados nos pedidos de venda.',
    help: {
      fill: ['Monte a tabela por cliente ou grupo, com preço, unidade e vigência.', 'Informe desconto condicional, se praticado, em vez de reduzir o preço de tabela.'],
      use: ['O pedido de venda daquele cliente parte da tabela vigente.', 'Tabela sem vigência gera preço antigo em pedido novo.'],
    },
  },
  'comissoes/calculo': {
    module: 'Comissões', title: 'Cálculo de Comissões',
    description: 'Comissão apurada sobre faturamento e metas, conforme as regras vigentes da empresa.',
    help: {
      fill: ['Selecione o período de apuração; o cálculo usa o faturamento já emitido.'],
      use: ['Apuração conferida vira base de pagamento ao vendedor.', 'Nota cancelada ou estornada deve ser retirada antes de validar o valor.'],
    },
  },
  'comissoes/regras': {
    module: 'Comissões', title: 'Regras de Comissão',
    description: 'Percentuais, metas e critérios de cálculo por vendedor, produto ou período.',
    help: {
      fill: ['Defina percentual, base (faturamento, margem ou venda), vigência e a quem a regra se aplica.', 'Regra retroativa muda apuração já paga: use nova regra com vigência própria.'],
      use: ['A apuração considera a regra vigente na data do faturamento.', 'Mudança de percentual deve ser comunicada ao vendedor antes de valer.'],
    },
  },
  'comissoes/perfil': {
    module: 'Comissões', title: 'Perfil do Vendedor',
    description: 'Vendedores e agentes com taxa de custo de hora, metas e perfil de comissão vinculado.',
    help: {
      fill: ['Vincule o vendedor ao usuário do sistema e ao perfil de comissão correto.', 'Informe meta e custo de hora usados no rateio.'],
      use: ['Perfil sem comissão vinculada sai da apuração.', 'Vendedor com mais de um vínculo recebe cálculo duplicado: mantenha um perfil por pessoa.'],
    },
  },
  'controladoria/auditoria-comissoes': {
    module: 'Controladoria', title: 'Auditoria de Comissões',
    description: 'Base de cálculo, valores pagos e divergências conferidos antes do fechamento da comissão.',
    help: {
      fill: ['Nada se digita: confira base, percentual aplicado e valor pago por vendedor.'],
      use: ['Use para conferir a apuração antes de liberar o pagamento.', 'Divergência costuma ser regra com vigência errada ou venda de vendedor trocado.'],
    },
  },
  'controladoria/cadastro-decimais': {
    module: 'Controladoria', title: 'Cadastro de Precisão Decimal',
    description: 'Casas decimais, cubagem e arredondamento usados nas medições e cálculos industriais.',
    help: {
      fill: ['Defina casas decimais e regra de arredondamento para quantidade, valor, peso e cubagem.', 'Ajuste uma regra por vez e teste no cálculo que depende dela.'],
      use: ['As telas de custo, estoque e fiscal herdam esta precisão.', 'Mudar arredondamento altera totais já conferidos; alinhe com controladoria antes.'],
    },
  },
  'controladoria/lucratividade': {
    module: 'Controladoria', title: 'Painel de Lucratividade',
    description: 'Custos, margens industriais e resultado por produto, cliente ou pedido.',
    help: {
      fill: ['Filtre por produto, cliente ou período; não edite valores no painel.'],
      use: ['Margem negativa indica custo cadastrado errado, consumo acima da BOM ou preço de venda abaixo do custo real.', 'Compare com o custo padrão da Ficha de Processo para saber se é erro de cadastro ou de execução.'],
    },
  },
  'financeiro/retificacao': {
    module: 'Financeiro', title: 'Retificação Financeira',
    description: 'Localiza títulos e parcelas a pagar/receber, corrige valor, vencimento, conta e classificação com validação de período, justificativa obrigatória, comprovante e histórico imutável.',
    help: {
      fill: ['Filtre por NF/documento, título, pedido ou parceiro; escolha o tipo, status e intervalo de vencimento.', 'Selecione uma parcela e confira os dados originais antes de preencher a retificação.', 'Informe o motivo, os novos dados e uma justificativa com pelo menos 20 caracteres; anexe PDF, PNG ou JPG quando houver comprovante.'],
      use: ['A gravação é transacional e registra dados anteriores, novos, usuário, data/hora e justificativa.', 'Parcela em aberto ou parcialmente paga pode ser ajustada somente se o novo total preservar o valor já pago.', 'Parcela liquidada não é sobrescrita. Use o fluxo de estorno bancário ou lançamento complementar.'],
      watch: 'Períodos fechados bloqueiam a retificação. Estorno total só é permitido quando nenhuma parcela do título tiver pagamento registrado; a rotina não apaga baixas nem movimenta o caixa automaticamente.',
    },
  },
  'controladoria/retificacao-pedido': {
    module: 'Controladoria', title: 'Retificação de Pedido',
    description: 'Corrige somente dados comerciais e descritivos permitidos de pedidos já faturados; não altera preço, quantidade, impostos ou títulos financeiros.',
    help: {
      fill: ['Localize o pedido faturado por número, referência do cliente, documento ou vendedor.', 'Altere somente os campos liberados e descreva o motivo da mudança.'],
      use: ['Grave pela rotina transacional de Controladoria; os dados anteriores e novos ficam no log de auditoria.', 'Ajustes financeiros de valor, vencimento, conta e parcelas devem ser feitos em Financeiro > Retificação Financeira.'],
      watch: 'Pedidos ainda em rascunho/aberto não são elegíveis; dados fiscais e valores de documentos emitidos exigem procedimento fiscal próprio.',
    },
  },
  'controladoria/retificacao-assistente': {
    module: 'Controladoria', title: 'Assistente de Retificação',
    description: 'Passo a passo orientado da retificação de pedido e dos ajustes contábeis associados.',
    help: {
      fill: ['Responda as etapas do assistente na ordem; ele indica o que pode e o que não pode ser alterado.'],
      use: ['Use antes de retificar um pedido faturado para saber se o caso é retificação simples ou documento fiscal.', 'O assistente conduz até a tela de Retificação de Pedido quando o ajuste é permitido.'],
    },
  },
  'financeiro/notas-debito': {
    module: 'Financeiro', title: 'Notas de Débito e Rotinas Financeiras',
    description: 'Emissão e acompanhamento de débitos a receber ou pagar, com vínculo a parceiros, conta bancária, centro de custo, comprovante e geração transacional de títulos.',
    help: {
      fill: ['Selecione cliente para A Receber ou fornecedor para A Pagar, informe datas, valores, conta bancária, centro de custo e discriminação.', 'Anexe o comprovante e marque a geração automática do título quando a nota precisar integrar Contas a Receber/Pagar.'],
      use: ['A gravação valida empresa, parceiro, conta, centro de custo e permissão no servidor.', 'Quando solicitado, a nota e o título financeiro são criados na mesma transação; conciliação e extratos abrem seus módulos próprios.'],
    },
  },
  'financeiro/notas-debito/configuracoes': {
    module: 'Financeiro', title: 'Configurações de Notas de Débito',
    description: 'Séries, impostos e regras de emissão das notas de débito da empresa.',
    help: {
      fill: ['Configure série, modelo, alíquotas e regra de numeração conforme o que a empresa está autorizada a emitir.'],
      use: ['A emissão usa exatamente estas regras; alterar no meio do mês gera quebra de numeração.', 'Dúvida de amparo legal é do contador, não desta tela.'],
    },
  },
  'cadastros/produtos': {
    module: 'Cadastros Mestres', title: 'Cadastro de Produtos',
    description: 'Tela mestre de produto em quatro abas: Listagem Geral, Ficha Técnica, Código de Barras e Regras do Código, gravadas em erp_produtos e erp_codigos pela empresa autenticada.',
    help: {
      fill: ['Procure o item na Listagem Geral e abra a Ficha Técnica para cadastrar ou alterar — nada é digitado de memória.', 'Na aba Regras do Código defina prefixo, separador e sequência antes de criar o primeiro item novo.', 'A aba Código de Barras monta a etiqueta ZPL do produto já salvo.'],
      use: ['Produto cadastrado aparece em todas as telas: compra, estoque, BOM, OP, pedido e certificado.', 'Item com foto e descrição corretos alimenta automaticamente a Ficha de Processo.', 'O cadastro fiscal (NCM, CFOP, tributação) tem tela própria no mesmo menu.'],
      watch: 'Cadastro incompleto é a causa mais comum de erro em nota, saldo e custo.',
    },
  },
  'cadastros/produtos/imprimir': {
    module: 'Cadastros Mestres', title: 'Ficha Técnica do Produto',
    description: 'Documento A4 do produto selecionado, gerado a partir dos dados persistidos no cadastro mestre.',
    help: {
      fill: ['Selecione o produto; o documento monta sozinho o que já está gravado no cadastro.'],
      use: ['Use para enviar especificação a cliente ou fornecedor.', 'Campo em branco no A4 significa cadastro incompleto: complete na tela de Cadastro de Produtos.'],
    },
  },
  'cadastros/produtos/fiscal': {
    module: 'Cadastros Mestres', title: 'Cadastro Fiscal do Produto',
    description: 'Ficha técnica mestre e inteligência fiscal do item: NCM, CFOP, tributação, grupo, unidade, endereço de estoque e dados de produção.',
    help: {
      fill: ['Preencha a aba fiscal (NCM, CFOP e tributação) antes de usar o produto em nota fiscal.', 'Vincule grupo, unidade de medida e endereço de estoque; sem eles o saldo e a cubagem ficam errados.', 'Complete peso, dimensões e dados de produção — são usados em custo, capacidade e OP.'],
      use: ['Alterar unidade ou NCM de produto já movimentado afeta cálculos antigos: avalie antes.', 'O emitente de nota lê exatamente estes parâmetros no momento da emissão.'],
      watch: 'Item sem NCM definido bloqueia ou erra a emissão da nota fiscal.',
    },
  },
  'cadastros/ajuda/ficha-tecnica': {
    module: 'Cadastros Mestres', title: 'POP · Ficha Técnica do Produto',
    description: 'Procedimento operacional da ficha técnica: chave do SKU, empresa, categoria e unidade de medida.',
    help: {
      fill: ['Nada se preenche: é leitura do procedimento.'],
      use: ['Siga a sequência do POP ao montar a ficha de um produto novo.', 'Dúvida prática de campo resolve na tela de Cadastro de Produtos.'],
    },
  },
  'cadastros/ajuda/listagem-produtos': {
    module: 'Cadastros Mestres', title: 'POP · Listagem de Produtos',
    description: 'Procedimento operacional da listagem: estrutura relacional, geração de part number e conferência antes de gravar.',
    help: {
      fill: ['Nada se preenche: é leitura do procedimento.'],
      use: ['Use para padronizar como a equipe pesquisa e confere antes de gravar.', 'Part number segue a regra documentada em Parâmetros de Código.'],
    },
  },
  'cadastros/ajuda/parametros-codigo': {
    module: 'Cadastros Mestres', title: 'POP · Parâmetros de Código',
    description: 'Procedimento operacional das regras de código e da gravação segura da numeração em erp_codigos.',
    help: {
      fill: ['Nada se preenche: é leitura do procedimento.'],
      use: ['Leia antes de alterar prefixo ou dígitos da numeração.', 'A gravação da regra é feita na tela Parâmetros de Código.'],
    },
  },
  'configuracoes-usuario': {
    module: 'Configurações', title: 'Configurações de Usuário',
    description: 'Controle de acesso do chão de fábrica: acessos coletivos ou por posto, matriz de módulos por setor e modelos por nível de acesso.',
    help: {
      fill: ['Decida por setor quais módulos ficam liberados na matriz de permissões.', 'Escolha se o acesso do posto é individual (conta do funcionário) ou coletivo (cartão/sessão compartilhada).', 'Modele o nível de acesso conforme a responsabilidade, não conforme a pessoa.'],
      use: ['O que for bloqueado aqui some do menu e do tablet do módulo para aquele perfil.', 'A barreira efetiva continua sendo o RLS e as RPCs do banco: esta tela sinaliza e organiza o acesso.', 'Alteração de acesso atinge sessões novas; peça ao usuário para reentrar.'],
      watch: 'Acesso coletivo exige controle físico do posto; a sessão assume os apontamentos daquele posto.',
    },
  },
  'master': {
    module: 'Plataforma', title: 'Console da Plataforma',
    description: 'Administração técnica de empresas, planos e acessos da plataforma SYSNQRA.',
    help: {
      fill: ['Trabalhe por empresa: plano, quantidade de acessos e situação do tenant.'],
      use: ['Uso interno da plataforma, não do cliente final.', 'Suspenção de tenant fecha todas as telas daquela empresa imediatamente.'],
    },
  },
}

const pagePrincipalPrefix = '/pageprincipal'

/** Telas que já desenham o próprio cabeçalho de abertura; o shell não adiciona card acima (evita título duplicado). */
// Ordem do proprietario em 2026-11-04, print de /qualidade/dashboard-rnc com dois cards navy:
// "TEM DOIS CARDS AZUL TIRAR". As telas abaixo desenham a própria faixa de abertura e faltavam
// nesta lista, então o shell injetava uma segunda faixa idêntica acima delas.
// 2026-11-08: /qualidade/dashboard-rnc saiu da lista porque passou a usar o card navy único do shell
// (a tela já não desenha cabeçalho próprio); o verbete dela está no catálogo.
// /financeiro/fluxo-caixa desenha a própria faixa (synqra-reference-page) e entrou na integração da main.
const nativeIntroCardPaths = [
  '/compras', '/financeiro', '/financeiro/fluxo-caixa', '/administracao-configuracoes', '/ajuda',
  '/qualidade/auditoria-5s', '/qualidade/especificacoes', '/compras/requisicoes',
]

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
    help: {
      fill: ['Preencha os campos obrigatórios e selecione registros já cadastrados em vez de digitar códigos de memória.'],
      use: ['Confira o que a tela mostra antes de gravar: os dados vêm da empresa da sua sessão.', 'Esta rotina ainda não tem procedimento curado; a Central de Ajuda concentra as telas documentadas.'],
    },
  }
}

/** Índice de busca da Central de Ajuda: rota canônica, verbete e bloco de ajuda. */
export function listPageIntros(): Array<{ path: string; intro: PageIntro }> {
  return Object.entries(introCatalog)
    .map(([path, intro]) => ({ path: path === '' ? '/' : `/${path}`, intro }))
    .sort((a, b) => a.intro.title.localeCompare(b.intro.title, 'pt-BR'))
}
