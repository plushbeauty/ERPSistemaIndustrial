const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '')
if (!base) throw new Error('Defina SUPABASE_URL antes de executar este teste.')
const endpoint = `${base}/functions/v1/emitir-nfe`
const cases = [['Produção','https://erp-sistema-industrial.vercel.app'],['Preview','https://erp-sistema-industrial-git-main-plushbeauty.vercel.app'],['Localhost','http://localhost:5173']]
const expectedMethods = 'POST, OPTIONS'
const expectedHeaders = 'authorization, x-client-info, apikey, content-type'
let failures = 0
for (const [name, expectedOrigin] of cases) {
  console.log(`\n[${name}] ${expectedOrigin}`)
  const response = await fetch(endpoint,{method:'OPTIONS',headers:{Origin:expectedOrigin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':expectedHeaders}})
  const actualOrigin=response.headers.get('access-control-allow-origin')
  const methods=response.headers.get('access-control-allow-methods')
  const headers=response.headers.get('access-control-allow-headers')
  const checks=[['STATUS 204',response.status===204,String(response.status)],['ALLOW-ORIGIN',actualOrigin===expectedOrigin,actualOrigin??'ausente'],['ALLOW-METHODS',methods===expectedMethods,methods??'ausente'],['ALLOW-HEADERS',headers===expectedHeaders,headers??'ausente']]
  for(const [label,ok,actual] of checks){console.log(`${ok?'PASS':'FAIL'} ${label}${ok?'':` — ${actual}`);if(!ok)failures++}
}
console.log(`\nResultado: ${failures===0?'CORS OPTIONS APROVADO':`${failures} validação(ões) falharam`}`)
process.exitCode=failures?1:0
