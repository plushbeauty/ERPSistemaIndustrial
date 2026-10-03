import "jsr:@supabase/functions-js/edge-runtime.d.ts"
export const corsHeaders={"Access-Control-Allow-Origin":"https://erp-sistema-industrial.vercel.app","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}})
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{status:204,headers:corsHeaders})
 if(req.method!=="POST")return json({error:"POST obrigatório."},405)
 const auth=req.headers.get("Authorization");if(!auth)return json({error:"Autenticação obrigatória."},401)
 try{
  const body=await req.json();const cnpj=String(body?.cnpj??"").replace(/\D/g,"");if(cnpj.length!==14)return json({error:"CNPJ inválido."},400)
  const response=await fetch("https://brasilapi.com.br/api/cnpj/v1/"+cnpj,{headers:{accept:"application/json"}})
  const data=await response.json().catch(()=>({}));if(!response.ok)return json({error:"CNPJ não localizado na consulta pública.",details:data},response.status)
  return json({razao_social:data.razao_social??data.nome_fantasia??"",nome_fantasia:data.nome_fantasia??"",cnpj:data.cnpj??cnpj,logradouro:data.logradouro??"",municipio:data.municipio??"",uf:data.uf??""})
 }catch(error){return json({error:error instanceof Error?error.message:"Falha na consulta de CNPJ."},500)}
})