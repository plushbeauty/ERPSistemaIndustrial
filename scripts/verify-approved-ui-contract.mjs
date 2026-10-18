import { readFileSync } from 'node:fs'

const product = readFileSync('src/pages/ProdutosVendasIndustrial.tsx', 'utf8')
const login = readFileSync('src/styles/industrial-login.css', 'utf8')
const loginPage = readFileSync('src/IndustrialLoginDirect.tsx', 'utf8')
const publicHome = readFileSync('src/PublicIndustrialHome.tsx', 'utf8')
const vendasStatus = readFileSync('src/pages/VendasCentral.tsx', 'utf8')
const novoPedido = readFileSync('src/pages/NovoPedido.tsx', 'utf8')
const horizontalShell = readFileSync('src/components/layout/ERPHorizontalShell.tsx', 'utf8')

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
  ['Carrossel público sem botões de movimento', publicHome.includes('APROV-006') && publicHome.includes('.sgq-public-home .sgq-dots{display:none!important}')],
  ['Card e imagem do carrossel ampliados no desktop', publicHome.includes('height:clamp(500px,70vh,760px)!important') && publicHome.includes('grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important')],
  ['Recuperação de senha preservada', loginPage.includes('Esqueci minha senha')],
  ['Status de Vendas mantém seis filtros e legenda visível das etapas', vendasStatus.includes('sales-orders-status-grid') && vendasStatus.includes('sales-process-legend') && vendasStatus.includes('NF / Saída')],
  ['Novo Pedido usa controles compactos e três cartões superiores alinhados', novoPedido.includes('h-[30px]') && novoPedido.includes('text-[9px]') && novoPedido.includes('md:grid-cols-6') && ['Dados do Cliente','Dados do Pedido','Entrega e Logística'].every(label => novoPedido.includes(label))],
  ['Menu PCP oferece nove tipos de ficha de processo', ['INJETADOS','PRENSADOS','ESTAMPARIA','MECANICA','TRATAMENTO_SUPERFICIAL','PINTURA_QUIMICA','CORTE_VINCO','ACABAMENTO','MONTAGEM_EMBALAGEM'].every(tipo => horizontalShell.includes('?tipo=' + tipo))],
]

const failed = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) {
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'} — ${label}\n`)
}
if (failed.length) {
  process.stderr.write(`UI approved contract failed: ${failed.map(([label]) => label).join('; ')}\n`)
  process.exit(1)
}
