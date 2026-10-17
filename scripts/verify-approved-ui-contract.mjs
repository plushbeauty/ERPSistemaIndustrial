import { readFileSync } from 'node:fs'

const product = readFileSync('src/pages/ProdutosVendasIndustrial.tsx', 'utf8')
const login = readFileSync('src/styles/industrial-login.css', 'utf8')
const loginPage = readFileSync('src/IndustrialLoginDirect.tsx', 'utf8')
const appEntry = readFileSync('src/AppEntryV2.tsx', 'utf8')
const homeDashboard = readFileSync('src/AppIndustrialV7.tsx', 'utf8')
const shell = readFileSync('src/components/layout/ERPHorizontalShell.tsx', 'utf8')
const purchases = readFileSync('src/pages/ComprasIndustrial.tsx', 'utf8')
const fiscalPages = ['src/pages/Fiscal.tsx', 'src/pages/FiscalPendencias.tsx', 'src/pages/FiscalImpostos.tsx', 'src/pages/FiscalCarteiraNFe.tsx', 'src/pages/FiscalNFeEntradas.tsx'].map(path => readFileSync(path, 'utf8'))

const checks = [
  ['Cadastro de Produtos com abas', product.includes("['gerais','DADOS GERAIS'") && product.includes("['fiscal','FISCAL'") && product.includes("['estoque','ESTOQUE'")],
  ['Seção de identificação do produto', product.includes('IDENTIFICAÇÃO DO PRODUTO')],
  ['Grade compacta do formulário aprovado', product.includes('product-form-grid') && product.includes('product-general-row')],
  ['Grupo com ação de inclusão', product.includes('product-plus-button') && product.includes('addGroup')],
  ['Subgrupo com catálogo e inclusão', product.includes('product-subgroup-options') && product.includes('addSubgroupOption')],
  ['Custos em consulta e observações no formulário', product.includes('Último custo (calculado)') && product.includes('product-observations-field')],
  ['Consulta fiscal oficial Classif preservada', product.includes('portalunico.siscomex.gov.br/classif')],
  ['Login em imagem institucional de tela inteira preservado', login.includes('width:100vw!important') && login.includes('height:100dvh!important')],
  ['Texto institucional do login centralizado', login.includes('top: 50%') && login.includes('text-align:center') && login.includes('translate(-50%,-50%)')],
  ['Ícone decorativo de chave removido do login', !loginPage.includes('KeyRound') && !loginPage.includes('auth-key-icon')],
  ['CTAs secundários de cadastro e teste removidos', !loginPage.includes('cadastro-empresa') && !loginPage.includes('cadastro-master') && !loginPage.includes('Começar teste grátis')],
  ['Recuperação de senha preservada', loginPage.includes('Esqueci minha senha')],
  ['Rota de entrada aponta para o painel principal aprovado', appEntry.includes('path="/erp-industrial" element={<AppIndustrial />}') && homeDashboard.includes('<IndustrialCommandDashboard')],
  ['Menu PCP mantém submenu das quatro fichas de processo', ['Ficha de Processo Injetados', 'Ficha de Processo Prensados', 'Ficha de Processo Acabamento', 'Montagem de Embalagem'].every(label => shell.includes(label))],
  ['Submenu de Fichas de Processo renderiza e navega às categorias existentes', shell.includes('child.children.filter(grandchild') && shell.includes('setOpenSubMenu') && ['tipo=INJETADOS', 'tipo=PRENSADOS', 'tipo=ACABAMENTO', 'tipo=MONTAGEM_EMBALAGEM'].every(route => shell.includes(route))],
  ['Compras usa o azul institucional e não oferece o atalho de tablet desativado', purchases.includes('#2D8DB8') && !purchases.includes('Tablet Industrial') && !purchases.includes('buy-tablet')],
  ['Telas principais do Fiscal usam a superfície compacta e o azul institucional', fiscalPages.every(page => page.includes('fiscal-workspace') && !page.includes('#2563eb') && !page.includes('bg-blue-800') && !page.includes('bg-sky-700'))],
  ['Menu operacional não exibe lançadores de tablet', !shell.includes('PCP Tablet') && !shell.includes('TabletMenuModal') && !shell.includes('PCPTabletMenuModal')],
]

const failed = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) {
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'} — ${label}\n`)
}
if (failed.length) {
  process.stderr.write(`UI approved contract failed: ${failed.map(([label]) => label).join('; ')}\n`)
  process.exit(1)
}
