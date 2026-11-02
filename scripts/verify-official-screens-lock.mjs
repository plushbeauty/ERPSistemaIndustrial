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
 * Mudanca neste contrato exige ordem explicita do proprietario.
 */

const ROOT = path.resolve(import.meta.dirname, '..')
const read = rel => readFileSync(path.join(ROOT, rel), 'utf8')

const oficiais = [
  { path: 'src/PublicIndustrialHome.tsx', sha: '8c75adb51525461520740693af89ab4725fbdf71', label: 'Publica / Home com carrossel da vitrine' },
  { path: 'src/components/marketing/TelaVitrine.tsx', sha: 'befc9424504e57fcfb85ff3d593fa4172aedfe10', label: 'Publica / Replica de tela do sistema na vitrine' },
  { path: 'src/styles/public-home-premium-20261101.css', sha: '775ed1d1dd8df5a2d347b1c3dc1885f99d74333d', label: 'Publica / estilos do carrossel e vitrine' },
  { path: 'src/pages/PlanosIndustrial.tsx', sha: '539c08c5496f6674512f733a98d684b715fb980d', label: 'Publica / Planos' },
  { path: 'src/pages/CadastroEmpresa.tsx', sha: 'a860dc1434ece03bf9e60803d929d16bddd7f90b', label: 'Publica / Cadastro da empresa' },
  { path: 'src/pages/Blog.tsx', sha: 'aebf301d6e049f459f5c403527c7010e0b7eabf7', label: 'Publica / Blog' },
  { path: 'src/pages/Contato.tsx', sha: '770de58912bee0ed0e3e0bc4cddd7262c729ec80', label: 'Publica / Contato' },
  { path: 'src/IndustrialLoginDirect.tsx', sha: '556ae8ec80125f74358fc03a6e7e386fce2cf3b6', label: 'Login / tela sobre a foto da planta com cartao flutuante' },
  { path: 'src/styles/industrial-login.css', sha: '7fb567609b0ab04d8db75262fc1158a5425ff8af', label: 'Login / estilos da tela sobre a foto da planta' },
  { path: 'src/pages/QualityRpncForm.tsx', sha: '381b3765b81513ce5f9da39fc33e6d5b678f4960', label: 'Qualidade / RPNC com Ishikawa, 5 Porques e CAPA' },
  { path: 'src/pages/QualityAuditsList.tsx', sha: '34d4247238acaa0cab346056b56953a049c4ec2d', label: 'Qualidade / Painel de auditorias' },
  { path: 'src/pages/AccessControlSettings.tsx', sha: '0161ef8ffd66d5f35213668b989353dc8d9637e5', label: 'Configuracoes / Controle de acesso por setor' },
  { path: 'src/pages/PCPCapacidade.tsx', sha: '7b26fa34132d8ffcf116d53e780e372383280f5a', label: 'PCP / Capacidade de maquinas' },
  { path: 'src/pages/NFeEmissao.tsx', sha: '5a3244463751bce45a1a112d755435482c60c408', label: 'Fiscal / Emissao de NF-e (transacional, na prod)' },
]

// Telas antigas deletadas do sistema. Recriar qualquer um destes caminhos reprova o build.
const banidos = [
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
