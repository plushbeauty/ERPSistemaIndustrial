import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

/**
 * CONTRATO DAS TELAS OFICIAIS — branch de producao (2026-11-02, por ordem explicita do proprietario:
 * "trocar todas as pages pelas novas que vc fez travando para que o vercel nao recupere mais telas antigas").
 * 1. As telas novas da experiencia publica (home com carrossel, planos, cadastro, blog, contato) e o login
 *    sobre a foto da planta estao travadas por hash: qualquer edicao reprova o build da Vercel ate que o
 *    proprietario ordene a revisao e este contrato seja atualizado.
 * 2. Toda tela em src/pages, src/features e src/modules precisa ser alcancavel a partir do entry
 *    (src/AppBootstrap.tsx + src/AppEntryV2.tsx) por import literal: tela sem rota nao pode voltar a existir.
 * 3. As telas antigas ja deletadas estao banidas: recriar um desses caminhos reprova o build.
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
 * Mudanca neste contrato exige ordem explicita do proprietario.
 */

const ROOT = path.resolve(import.meta.dirname, '..')
const read = rel => readFileSync(path.join(ROOT, rel), 'utf8')

const oficiais = [
  { path: 'src/PublicIndustrialHome.tsx', sha: 'da0347d9ce223b0d268d05ba0e19b97ceee3479d', label: 'Publica / Home com carrossel da vitrine (REV-20261103-01: sem a moldura pequena no slide)' },
  { path: 'src/components/marketing/TelaVitrine.tsx', sha: 'befc9424504e57fcfb85ff3d593fa4172aedfe10', label: 'Publica / Replica de tela do sistema na vitrine' },
  { path: 'src/styles/public-home-premium-20261101.css', sha: '05a8d17def7c36b37c03781314cffec0eed1aa3b', label: 'Publica / estilos do carrossel e vitrine (texto do slide em coluna unica)' },
  { path: 'src/pages/PlanosIndustrial.tsx', sha: '1070b2cc87cacb249390e69d99c5c11dcfd411a6', label: 'Publica / Planos' },
  { path: 'src/pages/CadastroEmpresa.tsx', sha: 'a860dc1434ece03bf9e60803d929d16bddd7f90b', label: 'Publica / Cadastro da empresa' },
  { path: 'src/pages/Blog.tsx', sha: 'aebf301d6e049f459f5c403527c7010e0b7eabf7', label: 'Publica / Blog' },
  { path: 'src/pages/Contato.tsx', sha: '770de58912bee0ed0e3e0bc4cddd7262c729ec80', label: 'Publica / Contato' },
  { path: 'src/IndustrialLoginDirect.tsx', sha: '8e42f60fe545793e4382f049c490bb3289ea88d6', label: 'Login / tela sobre a foto da planta com cartao flutuante' },
  { path: 'src/styles/industrial-login.css', sha: 'b8924498059b298c44ccd58899c3358fe67735de', label: 'Login / estilos da tela sobre a foto da planta (REV-LOGIN-ZOOM-MENOR-20261103-01)' },
  { path: 'src/pages/CertificadoQualidade.tsx', sha: 'f83e55451a90c5867297cff6f4f532bcfb45cd91', label: 'Qualidade / Certificado de Qualidade com cotas dimensionais e desenho anexado (recebido em 2026-11-01; REV-CERTIFICADO-CARIMBO-20261103-01 so adicionou o cabecalho de autoria/aprovacao)' },
  { path: 'src/components/layout/ModuleTabletMenuModal.tsx', sha: '0e7259b7f3fb74769f32d0dc2b97125c09ee2554', label: 'Tablet / painel flutuante de módulos (entrada única do Sistema SGQ)' },
  { path: 'src/components/quality/qualityTabletModules.ts', sha: 'a1fc2eb3713c465e1a851204d5300490c1a257cd', label: 'Tablet / catálogo das rotinas do SGQ com cada rota conferida no roteador' },
  { path: 'src/styles/module-tablet-panel.css', sha: '97915a5da6c898af79c43b4a44f10ca45e8c51a3', label: 'Tablet / estilos do painel flutuante' },
  { path: 'src/pages/QualityRpncForm.tsx', sha: '50452b68f2663eb27ec2cfae7120d4c58d4b3478', label: 'Qualidade / RPNC com Ishikawa, 5 Porques e CAPA' },
  { path: 'src/pages/QualityRpncUnified.tsx', sha: '95335212fcf40881e37a37cc063f326d58335235', label: 'Qualidade / RPNC unificada em abas (REV-RPNC-ABAS-CARD-20261102-01: card das abas maior, descricao visivel)' },
  { path: 'src/styles/quality-rpnc-unified.css', sha: '38e62419f0b2e3798847abd7f2bbd6622a9acaa3', label: 'Qualidade / estilos das abas do RPNC unificado (isengao da regula de 30px)' },
  { path: 'src/pages/QualityAuditsList.tsx', sha: '34d4247238acaa0cab346056b56953a049c4ec2d', label: 'Qualidade / Painel de auditorias' },
  { path: 'src/pages/DocumentosQualidadeControle.tsx', sha: 'e4fbb85f9dad9fc2ad457567cba27185f0695e9b', label: 'Qualidade / Controle de Alteracao de Documentos em 7 abas (anexo pela URL assinada, nenhum status inventado)' },
  { path: 'src/pages/AccessControlSettings.tsx', sha: '64fbe7d0a0cb14e2aff8565f14fd713de2b13a00', label: 'Configuracoes / Controle de acesso por setor (CRUD de usuarios preservado; sem redesign)' },
  { path: 'src/pages/PCPCapacidade.tsx', sha: '7b26fa34132d8ffcf116d53e780e372383280f5a', label: 'PCP / Capacidade de maquinas' },
  { path: 'src/pages/NFeEmissao.tsx', sha: 'ab04bc518c81140a5bc5de9a0aab9cbe291beb98', label: 'Fiscal / Emissao de NF-e em etapas (transacional, na prod) + UF do transportador alinhado a regula de 72px' },
  { path: 'src/pages/EstoqueRastreabilidadeLotes.tsx', sha: 'a0b53bb0823af4468f0b70d91f68845c8bd495ed', label: 'Estoque / Rastreabilidade de lotes (lote > OP > pedido > cliente, so tabelas reais)' },
  { path: 'src/pages/AlmoxarifadoSaidaMaterial.tsx', sha: '4350d550481a0836ee2ffb900619c26203de2df4', label: 'Almoxarifado / Controle e Saida de Material (RPC de movimento, saldo no servidor)' },
  { path: 'src/pages/FichasProcesso.tsx', sha: '0a7ba99d8f78bf0d47b449cfb908ff2ee1f8db7c', label: 'PCP / Ficha de processo com descrições por categoria e seletor laranja (REV-PCP-FICHA-CATEGORIA-20261102-01)' },
  { path: 'src/pages/AtivarAcesso.tsx', sha: '6cf46c1875094bdb3ba3082bac3f2d1518cbb9cc', label: 'Acesso / Ativacao do convite por e-mail (REV-ATIVAR-ACESSO-OPERADOR-20261102-01)' },
]

// Telas antigas deletadas do sistema. Recriar qualquer um destes caminhos reprova o build.
const banidos = [
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
  console.error('Restaure as telas aprovadas ou obtenha ordem explicita do proprietario para nova revisao deste contrato.')
  process.exit(1)
}
const navegaveis = arquivosSrc.filter(f => TELAS.some(prefix => relOf(f).startsWith(prefix)))
console.log(`CONTRATO DAS TELAS OFICIAIS (PRODUCAO) PASS — ${oficiais.length} telas travadas por hash, ${banidos.length} telas antigas banidas, ${navegaveis.length} telas alcancaveis.`)
