import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const allowedOrigin = (origin: string | null) => {
  if (!origin) return null
  try {
    const url = new URL(origin)
    const host = url.hostname.toLowerCase()
    const official = host === "erp-sistema-industrial.vercel.app"
    // Vercel preview domains for this exact project; never reflect arbitrary origins.
    const preview = /^erp-sistema-industrial-[a-z0-9-]+-plushbeauty\\.vercel\\.app$/.test(host)
    return url.protocol === "https:" && (official || preview) ? origin : null
  } catch {
    return null
  }
}
const corsHeadersFor = (origin: string | null) => ({
  ...(allowedOrigin(origin) ? { "Access-Control-Allow-Origin": allowedOrigin(origin)! } : {}),
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Vary": "Origin",
})
const json=(body:unknown,status=200,headers:Record<string,string>={})=>new Response(JSON.stringify(body),{status,headers:{...headers,"Content-Type":"application/json"}})

Deno.serve(async(req:Request)=>{
  const corsHeaders = corsHeadersFor(req.headers.get("Origin"))
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:corsHeaders})
  if(req.method!=="POST") return json({error:"POST obrigatório."},405,corsHeaders)
  const auth=req.headers.get("Authorization")
  if(!auth) return json({error:"Autenticação obrigatória."},401,corsHeaders)
  try{
    const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}})
    const {data:{user},error}=await supabase.auth.getUser()
    if(error||!user) return json({error:"Sessão inválida."},401,corsHeaders)
    const upstream=Deno.env.get("VENDAS_EMAIL_IMPORT_URL")
    if(!upstream) return json({error:"Importação de e-mail não configurada no projeto Supabase."},503,corsHeaders)
    const body=await req.json().catch(()=>({}))
    const response=await fetch(upstream,{method:"POST",headers:{"content-type":"application/json","x-erp-user-id":user.id},body:JSON.stringify(body)})
    const raw=await response.text()
    let data:unknown
    try{data=JSON.parse(raw)}catch{data={message:raw}}
    return json(data,response.status,corsHeaders)
  }catch(error){
    return json({error:error instanceof Error?error.message:"Falha na importação."},400,corsHeaders)
  }
})
