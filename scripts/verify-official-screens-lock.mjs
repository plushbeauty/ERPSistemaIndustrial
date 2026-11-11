import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

/**
 * CONTRATO DAS TELAS OFICIAIS — ORDEM PERMANENTE DO PROPRIETARIO (2026-11-10):
 * "telas aprovadas podem ser trocadas por codigos novos. telas travadas aprovadas e para nao deixar
 * que as antigas voltem".
 * 1. O hash trava a REVISAO APROVADA ATUAL, nao congela a tela para sempre. O proprietario pode ordenar
 *    melhoria, substituicao ou reescrita; nesse caso, atualizar o codigo, o hash oficial e o manifesto
 *    na mesma entrega, registrando a nova revisao. A nova versao passa a ser a referencia protegida.
 * 2. A trava continua obrigatoria depois da troca: impede que versoes anteriores, prototipos antigos ou
 *    telas legadas voltem silenciosamente. Nunca restaurar codigo antigo apenas para satisfazer o hash.
 * 3. Toda tela em src/pages, src/features e src/modules precisa ser alcancavel a partir do entry
 *    (src/AppBootstrap.tsx + src/AppEntryV2.tsx) por import literal: tela sem rota nao pode voltar a existir.
 * 4. As telas antigas ja deletadas continuam banidas: recriar um desses caminhos reprova o build.
 * 5. Toda substituicao autorizada deve preservar rotas, contratos de dados, RLS/RBAC e funcionalidades
 *    existentes, salvo ordem explicita em contrario. A aprovacao passa para o novo codigo, nunca para o legado.
 * Revisao 2026-11-08 (trio APQP e cronograma colorido): ordem do proprietario — "veja o FMEA para vc
 * fazer FMEA E Plano de Controle juntos ok e Mapa de Processo ... ai vc junta e elemina os outros" e
 * "tela de Manutencao fazer tela de manutencao preventiva cronograma com corres". FMEA, Plano de
 * Controle e Mapa de Processo passam a ser abas de src/pages/qualidade/FmeaPlanoControle.tsx (as rotas
 * /qualidade/fmea, /qualidade/plano-controle e /qualidade/mapa-processo continuam validas para nao
 * quebrar QR Codes ja impressos); src/pages/qualidade/FMEA.tsx e PlanoControle.tsx saem da base. O
 * cronograma colorido substitui src/pages/ManutencaoPlanoMestre.tsx e /manutencao/plano-mestre passa a
 * redirecionar para /manutencao/cronograma. O manifesto foi regerado com `npm run telas:manifest` depois
 * da ordem, e o unico hash de componente re-carimbado foi o catalogo do tablet do SGQ.
 * Revisao 2026-11-08 (RPNC A4 compartilhado): as commits c2ccce6f, 854cec57 e c8cd7d50 converteram a
 * RPNC para o relatorio SynqraRelatorioA4 com emissao assincrona. A revisao esta autorizada no proprio
 * cabecalho da tela (REV-SGQ-RPNC-A4-COMPARTILHADO-20261108-02, "REVISAO AUTORIZADA PELO PROPRIETARIO
 * EM 2026-11-08"), mas o hash nao foi recarimbado na epoca; este contrato passa a refletir o arquivo
 * aprovado sem alterar investigacao, acoes, evidencias nem eficacia.
 * Revisao 2026-11-08: por ordem do proprietario em 2026-11-08, a autoria e registrada apenas como
 * "FernandoSch" em todas as telas (sem nome completo); nenhum layout, rota, consulta ou permissao mudou.
 * Os 26 hashes foram recarimbados somente por causa dessa linha de cabecalho.
 * Revisao 2026-11-02: a NF-e em etapas (1207 linhas, abas do emissor, numacao reservada pelo banco)
 * substitui o rascunho de 106 linhas, por ordem explicita do proprietario ("terminar sistema de
 * emissao de nota fiscal" / "nem a nota fiscal e tela nova"). Na mesma ordem, as telas do preview
 * foram transplantadas e o Iniciar passou a expor todos os modulos registrados.
 * Revisao 2026-11-02 (#82): industrial-login.css re-travado por ordem explicita do proprietario —
 * texto preto nos campos (fundo branco), caixa mais estreita, bloco encostado a direita e escala de
 * abertura menor. IndustrialLoginDirect.tsx continua no mesmo hash: so o CSS mudou.
 * Revisao 2026-11-02 (#82, r2): o painel passou a ser fixado na trilha 2 do grid. Em auto-place ele
 * herda a trilha larga (a marca fica oculta na tela cheia) e media 582px a 398px da borda direita.
 * Revisao 2026-11-02 (#85): ordem do proprietario para travar os codigos novos. Entram no contrato a
 * ficha de processo em 4 abas (#80) e a ativacao do convite por e-mail (#81) — sem essa segunda tela,
 * o link que a erp-user-admin envia por e-mail apontava para uma rota inexistente nesta branch.
 * Revisao 2026-11-02 (#CRUD-usuarios): preserva a tela com editar/arquivar acessos
 * na tabela; somente o hash oficial foi atualizado apos a validacao do Vercel.
 * A estrutura visual industrial existente nao foi redesenhada.
 * Revisao 2026-11-02 (telas novas da Qualidade e do Estoque): ordem do proprietario — "quero que envie
 * sempre para o GitHub direito, nao para o PC". Entram no contrato o Controle de Alteracao de Documentos
 * (7 abas), a Rastreabilidade de Lotes e o Controle e Saida de Material; o RPNC unificado e a NF-e sao
 * re-travados porque o card das abas ganhou altura e o campo UF do transportador foi alinhado.
 * Revisao 2026-11-03 (#103): ordem explicita do proprietario — "esse e o novo logo do sistema para voce
 * trocar ele de todas as pages ... criar travas para nao deixar voltar telas antigas". Home, planos e
 * login re-travados porque o slot quadrado (menos de 80px) passou a usar /logo/logo-marca.png: o lockup
 * horizontal de 900x265 ficava esmagado em 34x34. O cartao de cadastro ficou com o lockup porque o CSS
 * efetivo dele e um slot largo (180px/auto). O contrato da marca esta em scripts/verify-logo-assets.mjs.
 * Revisao 2026-11-03 (#105): ordem do proprietario para integrar as telas de C:\Users\Dri\Documents\
 * Qoder\2026-11-01. Entram a aba "Instalação do sistema" (SystemInstallationSettings) e o prototipo
 * visual do apontamento; AppEntryV2, shell e catalogo de cards foram mesclados por adicao, sem
 * sobrescrever as versoes desta branch.
 * Revisao 2026-11-03 (#106/#107/#108/#109): ordem do proprietario — "a imagem de fundo do login continua
 * grande, diminuir mais, dar menos zoom nela", "vc nao colocou o tablet da qualidade", "a tela de certificado
 * esta dentro desta pasta" e "na outra imagem vc vai deletar ela tela porque vamos deixar tudo no tablet
 * qualidade". industrial-login.css re-travado com a foto em faixa de no maximo 65% da altura; entra o
 * Certificado de Qualidade; o painel flutuante do SGQ (ModuleTabletMenuModal + qualityTabletModules) vira a
 * entrada unica da Qualidade no lugar do dropdown; ControleDesenhos e a grade QualitySidebar (que se repetia
 * no topo de 19 telas) sao deletados e banidos.
 * Revisao 2026-11-03 (carrossel): ordem "tirar do carrossel da tela principal aquelas das imagens
 * pequenas, so deixar as imagens grandes de traz" — PublicIndustrialHome e a folha de estilo do
 * carrossel sao re-travados sem a moldura de navegador dentro do slide; a secao "Telas" segue igual.
 * Revisao 2026-11-04 (padrao de cor + central de ajuda): ordem explicita do proprietario — "verificar
 * todas as pendencias e arrumar ... enviar todas as telas novas e melhoradas para o sistema fazer todas
 * as telas padrao", "fazer auditoria direito no sistema ver pagina por pagina ver se todas estao no
 * mesmo padrao de cor, eu andei vendo que tinha telas todas pretas, nao pode acontecer isso" e
 * "todas as telas ... nao tem nada para explicar para que serve aquela pagina, como preencher, como
 * usar". Datas: o console do tablet do SGQ e mais nove telas operacionais foram convertidas do tema
 * escuro para o padrao industrial claro (REV-PADRAO-COR-CLARO-20261104-01), o header/carrossel do
 * workspace e o dialog passaram ao mesmo padrao, e o card de abertura ganhou o bloco de ajuda
 * "como preencher / como usar" com o catalogo curado por rota; CentralAjuda passou a indexar esse
 * catalogo. Escopo: exclusivamente classNames, CSS e texto de ajuda — nenhuma consulta, RPC ou regra
 * de negocio foi tocada. Manifesto re-gerado com npm run telas:manifest.
 * Revisao 2026-11-04 (rotacao do carrossel + botao unico de teste): ordem explicita do proprietario
 * — "manei vc tirar botoes da tela principal de 15 dias gratis que se repete" e "as imagens nao fica
 * neles para vem passando como um carrossel". O botao de teste grátis de 15 dias fica somente no topo
 * (ph-nav-actions): saiu do slide do carrossel (que repetia o mesmo botao a cada volta) e saiu da
 * central de ajuda. A pausa por mouse, que antes valia pelo hero inteiro e congelava a rotacao com o
 * ponteiro em cima da tela, passou a valer so sobre o bloco de texto. Manifesto re-gerado com
 * npm run telas:manifest.
 * Revisao 2026-11-05 (carrossel das artes): ordem explicita do proprietario — "a tela principal voltou
 * tela antiga, nao mandei voltar tela antiga; mandei trocar as imagens do fundo com aquelas imagens que
 * mandei para vc; vc nao criou travas para nao deixar telas antigas voltar". As cinco artes enviadas por
 * ele em 2026-11-05 entram em public/images/carrossel/ travadas por hash, as cinco fotos geradas por
 * maquina (public/images/cena-*.webp) sao deletadas e banidas, e o slide deixa de desenhar texto, scrim
 * e moldura de navegador por cima da imagem. O guard scripts/verify-carousel-artes.mjs entrou no
 * verify:production, entao qualquer retorno dessas telas antigas bloqueia o deploy da Vercel.
 * Revisao 2026-11-05 (carrossel de borda a borda): ordem explicita do proprietario sobre a mesma
 * home — "DEU CERTO A IMAGEM ELA FICA TROCANDO MAIS SE VC VER ELA TEM QUE SER MAIS LARGA PEGANDO
 * DO LADO ESQUERDO AO LADO DIREITO TODO". O print dele mostrava a arte terminando a ~900px numa
 * janela de 1280px, com faixa branca à direita: o max-height:84vh do slide encolhia a largura junto com a
 * altura porque o aspect-ratio era preservado. Sai o clamp e entra width:100%; a arte aparece
 * inteira, de borda a borda, sem corte. PublicIndustrialHome.tsx permanece no mesmo hash.
 * Revisao 2026-11-08 (telas consistentes): ordem explicita do proprietario — "vc ficou de arrumar a page
 * controle de documentos" e "tem telas com botoes laranja e outras nao tem cards azul fontes desalinhadas".
 * O Controle de Documentos perdeu o cabecalho branco duplicado e passou a usar o card navy unico do shell;
 * contadores, Atualizar, as 7 abas, consultas e RPCs continuam iguais. Hash atualizado apos revisao real
 * (REV-TELAS-CONSISTENTES-20261108-01) e manifesto re-gerado com npm run telas:manifest.
 * Mudanca neste contrato exige ordem explicita do proprietario.
 */

const ROOT = path.resolve(import.meta.dirname, '..')
const read = rel => readFileSync(path.join(ROOT, rel), 'utf8')

const oficiais = [
  { path: 'src/PublicIndustrialHome.tsx', sha: '7daf332b2210fdf0c5aff6c07fee146236517a53', label: 'Publica / Home SYSNQRA ERP INDUSTRIAL com as 5 artes e preload do carrossel (REV-CARROSSEL-PRELOAD-E-MARCA-SYSNQRA-20261110-01; mantém a geometria aprovada em 2026-11-06: ordem do proprietario — "A IMAGEM FICOU GRANDE DE MAIS ... ELA FICOU MUITNA ALTA PEGANDO A TELA MUITO PARA BAIXO" e "A BARRA DO TOPO ACHO QUE PODEMOS TIRAR O LOGO DELA PORQUE JA TEM O LOGO NAS IMAGENS ASSIM DEIXANDO ESSA BARRA MAIS FINA"; o logo saiu do header e a faixa do carrossel ganhou teto de 780px. Mantem REV-CARROSSEL-ARTES-20261105-01: "MANDEI TROCAR AS IMAGENS DO FUNDO COM AQUELAS IMAGENS QUE MANDEI PARA VC"; contrato das artes em scripts/verify-carousel-artes.mjs)' },
  { path: 'src/components/marketing/TelaVitrine.tsx', sha: '810640098487ae4a3e51b913113a776c3702d4c7', label: 'Publica / Replica de tela do sistema na vitrine' },
  { path: 'src/styles/public-home-premium-20261101.css', sha: '27e48f60406e5a9fa396a1a65d3584c3c00c01df', label: 'Publica / estilos do carrossel e vitrine (REV-HOME-ALTURA-E-TOPO-20261106-01: ordem do proprietario — barra do topo afinada em --ph-nav-h:52px e faixa do carrossel limitada a clamp(340px, 100svh-52px, 780px) com arte em contain sobre copia desfocada, porque "ELA FICOU MUITNA ALTA PEGANDO A TELA MUITO PARA BAIXO". Antes REV-CARROSSEL-FULL-BLEED-20261105-01 — "ELA TEM QUE SER MAIS LARGA PEGANDO DO LADO ESQUERDO AO LADO DIREITO TODO" — e REV-CARROSSEL-ARTES-20261105-01 — folha 16:9 das artes do proprietario, sem scrim e sem texto do DOM sobre a imagem)' },
  { path: 'src/pages/PlanosIndustrial.tsx', sha: '76e09e54e07c903020d12665361782bfb344a476', label: 'Publica / Planos (REV-PLANOS-SISTEMA-20261106-01: ordem do proprietario — "TELA DE PLANOS ESTA FEIA DE MAIS ARRUMAR ELA ACHAR EM OUTROS SISTEMA PARA MELHORAR O VISUAL DELA BASEADO NO NOSSO SISTEMA VER AS OUTRAS TELAS DO SISTEMA E VERIFICAR SE TEMOS TODOS ESSES ITENS NO SISTEMA QUE CONSTA NOS PLANOS"; visual nas cores do ERP, matriz comercial dele com 31 linhas e leitura real de erp_planos_catalogo + erp_plano_modulos, sem preco inventado durante o carregamento) e o CSS propio src/styles/planos-industrial-20261106.css' },
  { path: 'src/styles/planos-industrial-20261106.css', sha: '8a423e0192a414234bc95a580db80191c9ed2e82', label: 'Publica / estilos da tela /planos refeita nas cores do sistema (REV-PLANOS-SISTEMA-20261106-01)' },
  { path: 'src/pages/CadastroEmpresa.tsx', sha: '817720a7fc7383b1407ee474ec2f2db4c61620a8', label: 'Publica / Cadastro da empresa' },
  { path: 'src/pages/Blog.tsx', sha: '229522390ca8e3ea52e3609fea681cd1a7396221', label: 'Publica / Blog' },
  { path: 'src/pages/Contato.tsx', sha: '9f3db9706b956a21d884ce581e3f397cc1fd2775', label: 'Publica / Contato' },
  { path: 'src/IndustrialLoginDirect.tsx', sha: '7a7e866839eea90522108173468efb350fb54f13', label: 'Login / tela sobre a foto da planta com cartao flutuante (REV-INTEGRACAO-MAIN-20261108-01: ordem de integracao main x prod-telas-novas — Master passa a abrir /pageprincipal/master, rota canonica do contrato de ajuda contextual; cartao, foto e login individual por Supabase Auth inalterados)' },
  { path: 'src/styles/industrial-login.css', sha: '2c03b7bd62fac429e15cc33fb4c67d674532f818', label: 'Login / estilos da tela sobre a foto da planta (REV-LOGIN-FOTO-MAIOR-20261104-01: ordem do proprietario — faixa da foto aumentada de 74vw/116vh para 80vw/128vh porque ficou pequena demais)' },
  { path: 'src/pages/CertificadoQualidade.tsx', sha: 'a5a62d087c45f0bb62b25681b4062929b78c3251', label: 'Qualidade / Certificado de Qualidade com cotas dimensionais e desenho anexado (recebido em 2026-11-01; REV-CERTIFICADO-A4-20261108-01: botão Imprimir passou a emitir a folha A4 compartilhada em vez de capturar a tela, cumprindo o item 5 da ordem de 2026-11-05 — cotas e desenho anexado preservados)' },
  { path: 'src/components/layout/ModuleTabletMenuModal.tsx', sha: '9866f2f8e4d240ab5dc0a37977e285d39c72c6e5', label: 'Tablet / painel flutuante de módulos (entrada única do Sistema SGQ)' },
  { path: 'src/components/quality/qualityTabletModules.ts', sha: '371842d00d8183e00e9858ecd97f8fab4b93d41e', label: 'Tablet / catálogo SGQ — incrementos aditivos autorizados em 2026-11-08: REV-TABLET-TEMPLATE-INSPECAO-20261108-01 (templates versionados) e REV-APQP-TRIO-20261108-01 (FMEA, Plano de Controle e Mapa de Processo em abas de uma página única, com o card do Mapa adicionado e as três rotas mantidas para não quebrar QR Codes impressos)' },
  { path: 'src/styles/module-tablet-panel.css', sha: 'ea7cd5ef04a872e2848e5675ec919e915e00f5ec', label: 'Tablet / estilos do painel flutuante (REV-TABLET-COMPACTO-20261104-01: ordem do proprietário — painel muito grande; card saiu da régua de 30px, mediu 117px de altura sem transbordo no harness de cascata)' },
  { path: 'src/pages/QualityRpncForm.tsx', sha: 'e3c4aa6034e623b482ad671ebc2806515d7441f8', label: 'Qualidade / RPNC com Ishikawa, 5 Porques, CAPA, análise de causa, eficácia e workflow (REV-SGQ-RPNC-EFICACIA-20261108-01 preservada; REV-SGQ-RPNC-A4-COMPARTILHADO-20261108-02: relatório convertido para SynqraRelatorioA4 compartilhado com emissão assíncrona — revisão autorizada pelo proprietário em 2026-11-08, registrada no cabeçalho da própria tela; investigação, ações, evidências e eficácia inalteradas)' },
  { path: 'src/pages/QualityRpncUnified.tsx', sha: '99d6572db81b7f547bb01520a7739e7af90c8325', label: 'Qualidade / RPNC unificada em abas (REV-RPNC-ABAS-CARD-20261102-01: card das abas maior, descricao visivel)' },
  { path: 'src/styles/quality-rpnc-unified.css', sha: 'ff3e66481fd5c91c5b87059f3f804fe6bf24c82d', label: 'Qualidade / estilos das abas do RPNC unificado (isengao da regula de 30px)' },
  { path: 'src/pages/QualityAuditsList.tsx', sha: '587211eca76c3af93e7d93c2b9baa3ab54fb68a5', label: 'Qualidade / Painel de auditorias' },
  { path: 'src/pages/DocumentosQualidadeControle.tsx', sha: '120da60e72c0f385f00c2e4579999e80dc9f1e7c', label: 'Qualidade / Controle de Alteracao de Documentos em 7 abas (anexo pela URL assinada, nenhum status inventado) (REV-TELAS-CONSISTENTES-20261108-01: ordem do proprietario — cabecalho branco duplicado removido, card navy unico do shell, contadores e Atualizar na barra; consultas, RPCs e as 7 abas iguais)' },
  { path: 'src/pages/AccessControlSettings.tsx', sha: 'f6858b0b6de1a243a0a4c70e5ea5bcf099bf8aba', label: 'Configuracoes / Controle de acesso por setor (REV-ACCESS-CONTROL-SEM-MATRICULA-20261105-01: ordem do proprietario — "public.erp_usuarios não possui a coluna matricula ... Corrigir todas as consultas que solicitam matricula de erp_usuarios"; so a coluna saiu da tela, CRUD e layout preservados)' },
  { path: 'src/pages/PCPCapacidade.tsx', sha: '5b1d8c9a2a780b05f76ea22b3d12e30dfed906c7', label: 'PCP / Capacidade de maquinas' },
  { path: 'src/pages/NFeEmissao.tsx', sha: 'a79afb624238abcf777ab41fd93ef1a63b9c6ac1', label: 'Fiscal / Emissao de NF-e em etapas (transacional, na prod) + UF do transportador alinhado a regula de 72px' },
  { path: 'src/pages/EstoqueRastreabilidadeLotes.tsx', sha: '94243fcfe775cb485b8c6c6b492da43861a381bc', label: 'Estoque / Rastreabilidade de lotes (lote > OP > pedido > cliente, so tabelas reais)' },
  { path: 'src/pages/AlmoxarifadoSaidaMaterial.tsx', sha: '294ae04579807cdb4d712a0ade53f8b5e40ad22c', label: 'Almoxarifado / Controle e Saida de Material (RPC de movimento, saldo no servidor)' },
  { path: 'src/pages/FichasProcesso.tsx', sha: 'ef3d3b2a33a56104a52e33cb3aeefe7fd7c266f7', label: 'PCP / Ficha de processo com descrições por categoria e seletor laranja (REV-PCP-FICHA-CATEGORIA-20261102-01)' },
  { path: 'src/pages/AtivarAcesso.tsx', sha: 'bb3b2e264d6b08adac2198abb646441b4ee01de1', label: 'Acesso / Ativacao do convite por e-mail (REV-ATIVAR-ACESSO-OPERADOR-20261102-01)' },
]

// Telas antigas deletadas do sistema. Recriar qualquer um destes caminhos reprova o build.
const banidos = [
  // ORDEM 2026-11-06 (item 3/5): duplicatas legadas substituidas pelas telas novas e apagadas.
  // As rotas antigas agora redirecionam para a tela aprovada; recriar estes arquivos reprova o build.
  'src/pages/PedidoCompra.tsx',
  'src/pages/CatalogoDigital.tsx',
  'src/pages/AjusteGlobal.tsx',
  'src/pages/ClientesIndustrial.tsx',
  'src/pages/InjecaoIndustrial.tsx',
  'src/features/pcp/FichaProcesso.tsx',
  'src/pages/qualidade/FichasProcesso.tsx',
  'src/components/layout/BarraWindows11.tsx',
  'src/PublicIndustrial.tsx',
  'src/features/QualityRpncForm .tsx',
  'src/features/fiscal/GeradorGruposContabeis.tsx',
  'src/pages/CentralQualidade.tsx',
  'src/pages/ComprasOrdemCompra.tsx',
  'src/pages/ComprasPedidoCompra.tsx',
  'src/pages/Configuracoes.tsx',
  'src/pages/EstoqueAlmoxarifado.tsx',
  'src/pages/EstoqueAlmoxarifadoMestre.tsx',
  'src/pages/ExpedicaoSaida.tsx',
  'src/pages/FMEAIndustrial.tsx',
  'src/pages/FMEAIndustrialPage.tsx',
  'src/pages/FerramentariaPreventiva.tsx',
  'src/pages/FiscalPublic.tsx',
  'src/pages/ImprimirPedido.tsx',
  'src/pages/ImprimirProduto.tsx',
  'src/pages/IndustrialDashboardPremium.tsx',
  'src/pages/InteligenciaIndustrial.tsx',
  'src/pages/ManutencaoIndustrial.tsx',
  'src/pages/ManutencaoPreventivaCorretiva.tsx',
  'src/pages/MoldesInjecao.tsx',
  'src/pages/PCPAcabamento.tsx',
  'src/pages/PCPAprovacaoSetup.tsx',
  'src/pages/PCPDashboardOEECentral.tsx',
  'src/pages/PCPDemanda.tsx',
  'src/pages/PCPFichaProcessoTeste.tsx',
  'src/pages/PCPParadas.tsx',
  'src/pages/PcpChaoDeFabricaMestre.tsx',
  'src/pages/PedidosVendas.tsx',
  'src/pages/QualidadeCalibracao.tsx',
  'src/pages/QualidadeCertificados.tsx',
  'src/pages/QualidadeConfigTemplates.tsx',
  'src/pages/QualidadeMetrologia.tsx',
  'src/pages/QualidadePFMEA.tsx',
  'src/pages/QualidadeSGQAvancado.tsx',
  'src/pages/QualidadeTablet.tsx',
  'src/pages/RecebimentoNfe.tsx',
  'src/pages/SgqManagementCompact.tsx',
  'src/pages/TabletHome.tsx',
  'src/pages/VendasCarteira.tsx',
  'src/pages/VendasConfiguracoes.tsx',
  'src/pages/VendasPedidosMestre.tsx',
  'src/pages/VendasStatusPedidos.tsx',
  'src/pages/VirtualGuide.tsx',
  'src/pages/configuracoes/Backups.tsx',
  'src/pages/configuracoes/CodificacaoAreas.tsx',
  'src/pages/configuracoes/ConfiguracoesEngenhariaLayout.tsx',
  'src/pages/configuracoes/ControlePermissoes.tsx',
  'src/pages/configuracoes/Logs.tsx',
  'src/pages/configuracoes/Perfis.tsx',
  'src/pages/financeiro/BankClearanceSummary.tsx',
  'src/pages/financeiro/BankRecWorkspace.tsx',
  'src/pages/financeiro/BankReconciliation.tsx',
  'src/pages/financeiro/BankReconciliationStatement.tsx',
  'src/pages/financeiro/BankStatementImporter.tsx',
  'src/pages/financeiro/BankTransactionList.tsx',
  'src/pages/financeiro/IncorrectlyClearedEntries.tsx',
  'src/pages/manutencao/ManutencaoOrdens.tsx',
  'src/pages/manutencao/ManutencaoPreventivas.tsx',
  // Codigo morto achado na auditoria de 2026-11-02 (#83): nenhum importador em src.
  // Sao shells antigos de login/menu/tablet e uma segunda origem de autenticacao; recriar reprova.
  'src/auth/AuthProvider.tsx',
  'src/auth/authTypes.ts',
  'src/components/ERPHeaderActions.tsx',
  'src/components/TabletLaunchpad.tsx',
  'src/components/TabletMenuModal.tsx',
  'src/components/UnifiedTabletDashboard.tsx',
  'src/components/auth/FloatingLoginModal.tsx',
  'src/components/auth/FloatingLoginModal.css',
  'src/components/layout/ERPModuleSidebar.tsx',
  'src/components/layout/ERPStatusLegend.tsx',
  'src/layout/AppHeader.tsx',
  'src/layout/Backdrop.tsx',
  'src/layout/Sidebar.tsx',
  // Entradas avulsas recebidas em 2026-11-03 (codigo-tablet-sgq.zip) que fariam o sistema servir
  // uma tela fora do gate de autenticacao e da shell compartilhada. Recriar reprova o build.
  'operator-preview.html',
  'src/operator-preview.tsx',
  // Ordem do proprietario em 2026-11-03 (#109): "na outra imagem vc vai deletar ela tela porque vamos
  // deixar tudo no tablet qualidade". A tela de desenhos e a grade de 21 opcoes que se repetia no topo
  // de cada tela da Qualidade saem da base; a navegacao do SGQ passa a ser o painel flutuante.
  'src/pages/qualidade/ControleDesenhos.tsx',
  'src/components/quality/QualitySidebar.tsx',
]

const TELAS = ['src/pages/', 'src/features/', 'src/modules/']

const resolve = (fromFile, spec) => {
  const base = path.resolve(ROOT, path.dirname(fromFile), spec.split('?')[0])
  for (const cand of [`${base}.tsx`, `${base}.ts`, path.join(base, 'index.tsx'), path.join(base, 'index.ts')]) {
    if (existsSync(cand) && statSync(cand).isFile()) return cand
  }
  return null
}

const arquivosSrc = []
const walk = dir => {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) walk(full)
    else if (/\.tsx?$/.test(name)) arquivosSrc.push(full)
  }
}
walk(path.join(ROOT, 'src'))

const relOf = f => path.relative(ROOT, f).split(path.sep).join('/')

const deps = new Map()
for (const f of arquivosSrc) {
  for (const m of readFileSync(f, 'utf8').matchAll(/(?:from\s*|import\s*\(\s*)['"](\.[^'"]+)['"]/g)) {
    const t = resolve(f, m[1])
    if (!t) continue
    if (!deps.has(f)) deps.set(f, new Set())
    deps.get(f).add(t)
  }
}

const entries = ['src/AppBootstrap.tsx', 'src/AppEntryV2.tsx'].map(rel => path.join(ROOT, rel))
const alcancaveis = new Set()
const fila = [...entries]
while (fila.length) {
  const f = fila.pop()
  if (alcancaveis.has(f)) continue
  alcancaveis.add(f)
  for (const t of deps.get(f) || []) fila.push(t)
}

const falhas = []

for (const f of arquivosSrc) {
  const rel = relOf(f)
  if (!TELAS.some(prefix => rel.startsWith(prefix))) continue
  if (!alcancaveis.has(f)) falhas.push(`tela sem rota/alcanca: ${rel}`)
}

for (const item of oficiais) {
  const file = path.join(ROOT, item.path)
  if (!existsSync(file)) { falhas.push(`tela oficial ausente: ${item.path} (${item.label})`); continue }
  const content = Buffer.from(read(item.path).replace(/\r\n/g, '\n'), 'utf8')
  const sha = createHash('sha1').update(Buffer.from(`blob ${content.byteLength}\0`, 'utf8')).update(content).digest('hex')
  if (sha !== item.sha) falhas.push(`tela oficial modificada sem ordem: ${item.label} [${item.path}] esperado=${item.sha} encontrado=${sha}`)
}

/**
 * MANIFESTO DE APROVACAO — ordem do proprietario em 2026-11-03: "todas as telas novas vao ter
 * revisao, aprovacao e travamento para o vercel nao pegar mais telas antigas". As 25 telas acima
 * eram o contrato escrito a mao; abaixo o contrato passa a cobrir TODAS as telas alcancaveis do
 * sistema, cada uma com @AUTOR, @REVISAO, @DATA_REVISAO_APROVACAO e @STATUS_APROVACAO registrados.
 * Re-aprovacao exige ordem do proprietario e `npm run telas:manifest` commite junto.
 */
const MANIFESTO = 'scripts/telas-oficiais-manifest.json'
if (!existsSync(path.join(ROOT, MANIFESTO))) {
  falhas.push(`manifesto de aprovacao ausente: ${MANIFESTO} — gere com npm run telas:manifest depois da ordem do proprietario`)
} else {
  const manifesto = JSON.parse(readFileSync(path.join(ROOT, MANIFESTO), 'utf8'))
  const entradas = new Map((manifesto.telas ?? []).map(item => [item.path, item]))
  const shaDaTela = rel => {
    const content = Buffer.from(readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n'), 'utf8')
    return createHash('sha1').update(Buffer.from(`blob ${content.byteLength}\0`, 'utf8')).update(content).digest('hex')
  }
  for (const f of arquivosSrc) {
    const rel = relOf(f)
    if (!TELAS.some(prefix => rel.startsWith(prefix))) continue
    if (!alcancaveis.has(f)) continue
    const entrada = entradas.get(rel)
    if (!entrada) { falhas.push(`tela alcancavel sem aprovacao no manifesto: ${rel}`); continue }
    if (!entrada.autor || !entrada.revisao || !entrada.statusAprovacao) falhas.push(`tela sem carimbo de revisao/aprovacao: ${rel}`)
    const sha = shaDaTela(rel)
    if (sha !== entrada.sha) falhas.push(`tela travada modificada sem ordem: ${rel} esperado=${entrada.sha} encontrado=${sha}`)
  }
  for (const [rel, entrada] of entradas) {
    if (!existsSync(path.join(ROOT, rel))) falhas.push(`tela aprovada sumiu do sistema: ${rel} (${entrada.revisao})`)
  }
}

for (const rel of banidos) {
  if (existsSync(path.join(ROOT, rel))) falhas.push(`tela antiga banida voltou ao sistema: ${rel}`)
}

if (falhas.length) {
  console.error('CONTRATO DAS TELAS OFICIAIS (PRODUCAO) FALHOU')
  for (const f of falhas) console.error('- ' + f)
  console.error('Nao restaure telas antigas. Se a mudanca foi ordenada pelo proprietario, atualize o hash e o manifesto para registrar a nova revisao aprovada.')
  process.exit(1)
}
const navegaveis = arquivosSrc.filter(f => TELAS.some(prefix => relOf(f).startsWith(prefix)))
console.log(`CONTRATO DAS TELAS OFICIAIS (PRODUCAO) PASS — ${oficiais.length} telas travadas por hash, ${banidos.length} telas antigas banidas, ${navegaveis.length} telas alcancaveis.`)
