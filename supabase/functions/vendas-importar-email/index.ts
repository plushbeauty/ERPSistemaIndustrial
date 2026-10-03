import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

export const corsHeaders = {
  "Access-Control-Allow-Origin": "https://erp-sistema-industrial.vercel.app",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}})

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{status:204,headers:corsHeaders})
  if(req.method!=="POST") return json({error:"POST obrigatório."},405)
  const auth=req.headers.get("Authorization")
  if(!auth) return json({error:"Autenticação obrigatória."},401)
  try{
    const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}})
    const {data:{user},error}=await supabase.auth.getUser()
    if(error||!user) return json({error:"Sessão inválida."},401)
    const upstream=Deno.env.get("VENDAS_EMAIL_IMPORT_URL")
    if(!upstream) return json({error:"Importação de e-mail não configurada no projeto Supabase."},503)
    const body=await req.json().catch(()=>({}))
    const response=await fetch(upstream,{method:"POST",headers:{"content-type":"application/json","x-erp-user-id":user.id},body:JSON.stringify(body)})
    const raw=await response.text()
    let data:unknown
    try{data=JSON.parse(raw)}catch{data={message:raw}}
    return json(data,response.status)
  }catch(error){
    return json({error:error instanceof Error?error.message:"Falha na importação."},400)
  }
})
