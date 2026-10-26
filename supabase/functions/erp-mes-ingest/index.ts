import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type, x-device-token","Access-Control-Allow-Methods":"POST, OPTIONS"};
const out=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const object=(v:unknown):Record<string,unknown>=>typeof v==="object"&&v!==null&&!Array.isArray(v)?v as Record<string,unknown>:{};
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return out({error:"Método não permitido"},405);
 const token=req.headers.get("x-device-token")||"";
 if(token.length<32||token.length>256)return out({error:"Token de dispositivo inválido"},401);
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!key)return out({error:"Configuração segura indisponível"},500);
 let raw:unknown;try{const text=await req.text();if(text.length>16384)return out({error:"Payload excede 16 KB"},413);raw=JSON.parse(text)}catch{return out({error:"JSON inválido"},400)}
 const body=object(raw),state=String(body.estado||""),id=String(body.evento_id||"");
 const number=(key:string)=>{const n=Number(body[key]??0);return Number.isSafeInteger(n)&&n>=0?n:null};
 const cycles=number("contador_ciclos"),good=number("pecas_boas"),scrap=number("pecas_refugo");
 const date=new Date(String(body.emitido_em||""));
 if(id.length<1||id.length>120||!(["RODANDO","PARADA","ALARME"].includes(state))||cycles===null||good===null||scrap===null||Number.isNaN(date.getTime()))return out({error:"Evento incompleto ou fora do contrato"},400);
 const admin=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
 const result=await admin.rpc("erp_iot_ingest_event",{p_token:token,p_evento_id:id,p_estado:state,p_contador_ciclos:cycles,p_pecas_boas:good,p_pecas_refugo:scrap,p_emitido_em:date.toISOString(),p_payload:object(body.payload)});
 if(result.error){const unauthorized=/TOKEN_IOT_INVALIDO|DISPOSITIVO_IOT_NAO_AUTORIZADO/.test(result.error.message);return out({error:unauthorized?"Dispositivo não autorizado":"Evento recusado pelo ERP"},unauthorized?401:400)}
 return out({ok:true,event_id:result.data},202);
});
