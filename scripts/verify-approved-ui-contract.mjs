import { readFileSync } from 'node:fs'

const product = readFileSync('src/pages/ProdutosVendasIndustrial.tsx', 'utf8')
const login = readFileSync('src/styles/industrial-login.css', 'utf8')
const loginComponent = readFileSync('src/IndustrialLoginDirect.tsx', 'utf8')

const checks = [
  ['Cadastro de Produtos com abas', product.includes("['gerais','DADOS GERAIS'") && product.includes("['fiscal','FISCAL'") && product.includes("['estoque','ESTOQUE'")],
  ['Seção de identificação do produto', product.includes('IDENTIFICAÇÃO DO PRODUTO')],
  ['Grade compacta do formulário aprovado', product.includes('product-form-grid') && product.includes('product-general-row')],
  ['Grupo com ação de inclusão', product.includes('product-plus-button') && product.includes('addGroup')],
  ['Subgrupo com catálogo e inclusão', product.includes('product-subgroup-options') && product.includes('addSubgroupOption')],
  ['Custos em consulta e observações no formulário', product.includes('Último custo (calculado)') && product.includes('product-observations-field')],
  ['Consulta fiscal oficial Classif preservada', product.includes('portalunico.siscomex.gov.br/classif')],
  ['Login mantém imagem institucional em tela inteira', login.includes('width:100vw!important') && login.includes('height:100dvh!important')],
  ['Legenda institucional em dourado claro', login.includes('color:#F4D58D!important')],
  ['Frase institucional centralizada horizontal e verticalmente', login.includes('left:50%!important') && login.includes('transform:translate(-50%,-50%)!important')],
  ['Título e descrição institucionais em branco', login.includes('.auth-visual-message h2,') && login.includes('color:#fff!important') && login.includes('.auth-visual-message p')),
  ['Logo removido do login desktop e mobile', !loginComponent.includes('className="auth-visual-logo"') && !loginComponent.includes('className="auth-mobile-brand"') && !loginComponent.includes('/logo/logo.png')],
]

const failed = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) {
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'} — ${label}\n`)
}
if (failed.length) {
  process.stderr.write(`UI approved contract failed: ${failed.map(([label]) => label).join('; ')}\n`)
  process.exit(1)
}
