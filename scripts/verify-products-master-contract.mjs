import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/pages/ProdutosVendasIndustrial.tsx', import.meta.url), 'utf8')
const failures = []
const check = (condition, message) => { if (!condition) failures.push(message) }

const generalStart = source.indexOf("{tab==='gerais'")
const stockStart = source.indexOf("{tab==='estoque'")
const fiscalStart = source.indexOf("{tab==='fiscal'")
const productionStart = source.indexOf("{tab==='producao'")
const general = generalStart >= 0 ? source.slice(generalStart, source.indexOf('</form>}', generalStart)) : ''

check(generalStart >= 0 && stockStart > generalStart, 'A aba Geral deve existir antes de Estoque.')
check(!general.includes('LOCALIZAÇÃO PADRÃO'), 'Localização padrão não pode aparecer na aba Geral.')
check(stockStart >= 0 && fiscalStart > stockStart && source.slice(stockStart, fiscalStart).includes('LOCALIZAÇÃO PADRÃO'), 'Localização padrão deve existir na aba Estoque.')
check(source.includes("combo('NCM • 8 dígitos [?]','ncm',[],1,8)"), 'NCM não pode sugerir valores de produtos existentes; deve limitar a 8 dígitos.')
check(source.includes("combo('CEST • 7 dígitos [?]','cest',[],1,7)"), 'CEST não pode sugerir valores de produtos existentes; deve limitar a 7 dígitos.')
check(!/products\.filter\(p=>p\.ncm\)/.test(source), 'Não usar catálogo de produtos como fonte de NCM.')
check(!/products\.filter\(p=>p\.cest\)/.test(source), 'Não usar catálogo de produtos como fonte de CEST.')
check(source.includes('DOWNLOAD OFICIAL NCM (JSON)') && source.includes('CONSULTAR TABELA CFOP / NF-e') && source.includes('CONSULTAR CONVÊNIO CEST / CONFAZ'), 'Links de consulta fiscal oficial devem permanecer.')
check(source.includes("String(form.ncm||''),/^\\d{8}$/") && source.includes("String(form.cest||''),/^\\d{7}$/"), 'Validadores de NCM/CEST devem conferir o tamanho numérico.')
check(source.includes("field('Custo médio (calculado)','custo_medio','number',1,true)") && source.includes("field('Último custo (calculado)','custo_ultimo','number',1,true)"), 'Custos calculados devem continuar bloqueados para digitação.')
check(source.includes('Subgrupo adicionado às opções desta sessão'), 'A interface deve deixar claro que subgrupo ainda não é mestre persistente independente.')

if (failures.length) {
  console.error('PRODUCT MASTER CONTRACT FAILED:')
  for (const failure of failures) console.error('- ' + failure)
  process.exit(1)
}
console.log('PRODUCT MASTER CONTRACT PASS')
