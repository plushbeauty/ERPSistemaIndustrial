import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import * as XLSX from "npm:xlsx@0.18.5"
import { createClient } from "jsr:@supabase/supabase-js@2"
const cors={"Access-Control-Allow-Origin":"https://erp-sistema-industrial.vercel.app","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}})
const digits=(v:unknown)=>String(v??"").replace(/\D/g,"")
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{status:204,headers:cors})
 if(req.method!=="POST")return json({error:"POST obrigatório."},405)
 const auth=req.headers.get("Authorization");if(!auth)return json({error:"Autenticação obrigatória."},401)
 try{
  const url=Deno.env.get("SUPABASE_URL")!,key=Deno.env.get("SUPABASE_ANON_KEY")!
  const supabase=createClient(url,key,{global:{headers:{Authorization:auth}}})
  const {data:empresa,error:empresaError}=await supabase.rpc("erp_current_empresa_id");if(empresaError||!empresa)throw empresaError??new Error("Empresa não identificada.")
  const form=await req.formData();const file=form.get("file");if(!(file instanceof File))return json({error:"Arquivo Excel obrigatório."},400)
  const bytes=new Uint8Array(await file.arrayBuffer());const workbook=XLSX.read(bytes,{type:"array",cellDates:true});const sheet=workbook.Sheets[workbook.SheetNames[0]];if(!sheet)return json({error:"Planilha sem aba."},400)
  const rows=XLSX.utils.sheet_to_json<Record<string,unknown>>(sheet,{defval:"",raw:true});const required=["cnpj_cliente","sku_produto","preco_especial","validade_tabela"];const headers=Object.keys(rows[0]??{});if(headers.length!==required.length||required.some(k=>!headers.includes(k)))return json({error:"A planilha deve conter exatamente: cnpj_cliente, sku_produto, preco_especial, validade_tabela."},422)
  const payload=[]
  for(let i=0;i<rows.length;i++){
   const row=rows[i],cnpj=digits(row.cnpj_cliente),sku=String(row.sku_produto??"").trim(),preco=Number(row.preco_especial),validade=row.validade_tabela instanceof Date?row.validade_tabela.toISOString().slice(0,10):String(row.validade_tabela??"").slice(0,10)
   if(cnpj.length!==14||!sku||!Number.isFinite(preco)||preco<0||!/^\d{4}-\d{2}-\d{2}$/.test(validade))return json({error:"Linha "+(i+2)+" inválida."},422)
   payload.push({cnpj_cliente:cnpj,sku_produto:sku,preco_especial:preco,validade_tabela:validade})
  }
  const cnpjs=[...new Set(payload.map(x=>x.cnpj_cliente))],skus=[...new Set(payload.map(x=>x.sku_produto))]
  const [{data:clientes,error:ce},{data:produtos,error:pe}]=await Promise.all([
   supabase.from("erp_clientes").select("id,documento").eq("empresa_id",empresa).in("documento",cnpjs),
   supabase.from("erp_produtos").select("id,codigo").eq("empresa_id",empresa).in("codigo",skus)
  ]);if(ce)throw ce;if(pe)throw pe
  const cm=new Map((clientes??[]).map(x=>[digits(x.documento),x.id])),pm=new Map((produtos??[]).map(x=>[String(x.codigo),x.id]))
  const insertRows=payload.map(x=>({empresa_id:empresa,cliente_id:cm.get(x.cnpj_cliente),produto_id:pm.get(x.sku_produto),...x}));const missing=insertRows.findIndex(x=>!x.cliente_id||!x.produto_id);if(missing>=0)return json({error:"Cliente/Código de produto não localizado na empresa na linha "+(missing+2)+"."},422)
  return json({validated:insertRows})
 }catch(error){return json({error:error instanceof Error?error.message:"Falha ao importar lista."},500)}
})