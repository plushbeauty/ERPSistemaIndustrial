import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')
const requiredFiles = [
  'src/pages/PCPFichasProcesso.tsx',
  'src/pages/PCPFichasProcessoCategorias.tsx',
  'src/pages/PCPFichasProcessoCadastro.tsx',
  'src/pages/PCPFichaEngenhariaCompleta.tsx',
  'docs/auditoria/PCP-FICHAS-PROCESSO-INTEGRACAO-20261019.md',
]
const failures = []
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Arquivo obrigatório de fichas PCP ausente: ${file}`)
}
if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

const router = read('src/AppEntryV2.tsx')
const central = read('src/pages/PCPFichasProcesso.tsx')
const categories = read('src/pages/PCPFichasProcessoCategorias.tsx')
const cadastro = read('src/pages/PCPFichasProcessoCadastro.tsx')
const engenharia = read('src/pages/PCPFichaEngenhariaCompleta.tsx')

if (!/const PCPFichasProcesso = lazyPage\(\(\) => import\('\.\/pages\/PCPFichasProcesso'\), 'default'\)/.test(router)) {
  failures.push('Import lazy da tela central PCPFichasProcesso foi removido ou alterado.')
}
if (!/<Route path="\/pcp\/fichas-processo" element=\{<QualityPlanGate>\{<PCPFichasProcesso \/>\}<\/QualityPlanGate>\} \/>/.test(router)) {
  failures.push('Rota oficial /pcp/fichas-processo foi removida ou perdeu o gate de acesso.')
}
for (const marker of ['PCPFichasProcessoCategorias', 'PCPFichasProcessoCadastro', 'PCPFichaEngenhariaCompleta']) {
  if (!central.includes(marker)) failures.push(`Modelo ${marker} deixou de estar integrado à central de fichas.`)
}
for (const marker of ['PRENSADOS', 'PCPMoldPhotoPanel', 'temp_placa_sup', 'temp_placa_inf']) {
  if (!categories.includes(marker)) failures.push(`Modelo por categoria perdeu conteúdo aprovado: ${marker}.`)
}
for (const marker of ['erp_fichas_processo', 'imagem_url', 'observacoes_setup', 'cavidades_ativas']) {
  if (!cadastro.includes(marker)) failures.push(`Modelo de cadastro completo perdeu campo/função: ${marker}.`)
}
for (const marker of ['erp_fichas_tecnicas', 'erp_ficha_itens', 'erp_ficha_operacoes', 'erp_planos_inspecao']) {
  if (!engenharia.includes(marker)) failures.push(`Modelo de Engenharia perdeu entidade/função: ${marker}.`)
}
if (failures.length) {
  console.error('PCP PROCESS SHEETS CONTRACT FAIL')
  console.error(failures.map((failure) => '- ' + failure).join('\n'))
  process.exit(1)
}
console.log('PCP PROCESS SHEETS CONTRACT PASS — rota oficial, três modelos e conteúdo essencial preservados.')
