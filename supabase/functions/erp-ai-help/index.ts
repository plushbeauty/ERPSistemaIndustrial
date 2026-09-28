/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 12:07 BRT
 * Desenvolvedor: Homologado por Fernando
 * ID da Revisão: REV-015
 * Alterações: Eliminar any da Edge Function de ajuda IA, tipar JSON de entrada, documentos ranqueados e resposta OpenAI.
 * Status do Build Local: Não executado — gate remoto em homologação.
 * =========================================================================
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type JsonRecord = Record<string, unknown>;
type HelpDoc = { id:string; slug:string; titulo:string; resumo:string|null; conteudo:string; palavras_chave:string|null; rota:string|null; };
type RankedDoc = HelpDoc & { score:number };
type ResponseContent = { type:string; text?:string; image_url?:string };

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const out=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const norm=(v:string)=>v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const financialTerms=["financeiro","caixa","conta a pagar","conta a receber","a pagar","a receber","saldo","faturamento","receita","despesa","fluxo de caixa","previsao de caixa","pagamento","recebimento"];
const actions=(p:string)=>{const n=norm(p);const a:{label:string;route:string}[]=[];if(n.includes("qualidade")||n.includes("nao conformidade")||n.includes("fmea"))a.push({label:"Abrir Qualidade",route:"/qualidade"});if(n.includes("pcp")||n.includes("mrp")||n.includes("producao"))a.push({label:"Abrir PCP / MRP",route:"/pcp"});if(n.includes("fiscal")||financialTerms.some(x=>n.includes(x)))a.push({label:"Abrir Fiscal",route:"/fiscal"});return a.slice(0,3)};
function key():string|null{const raw=Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");if(raw){try{const parsed:unknown=JSON.parse(raw);if(typeof parsed==="object"&&parsed!==null&&"default" in parsed)return String((parsed as {default:unknown}).default)}catch{ /* chave composta inválida; usa fallback seguro */ }}return Deno.env.get("SUPABASE_ANON_KEY")||null}
function image(v:string|null):string|null{if(!v||!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(v)||v.length>8_500_000)return null;return v}
function record(value:unknown):JsonRecord{return typeof value==="object"&&value!==null?value as JsonRecord:{}}
function responseText(value:unknown):string{const root=record(value);const direct=root.output_text;if(typeof direct==="string"&&direct.trim())return direct;const output=Array.isArray(root.output)?root.output:[];for(const entry of output){const item=record(entry);const content=Array.isArray(item.content)?item.content:[];for(const part of content){const p=record(part);if(p.type==="output_text"&&typeof p.text==="string")return p.text}}return "Não consegui gerar uma resposta agora."}

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers: cors});if(req.method!=="POST")return out({error:"Método não permitido"},405);const auth=req.headers.get("Authorization");if(!auth)return out({error:"Não autenticado"},401);
 const url=Deno.env.get("SUPABASE_URL"),anon=key(),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!anon||!service)return out({error:"Configuração segura ausente"},500);
 const client=createClient(url,anon,{global:{headers:{Authorization:auth}}});const {data:{user},error}=await client.auth.getUser();if(error||!user)return out({error:"Sessão inválida"},401);
 const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
 const rawBody:unknown=await req.json();const body=record(rawBody);const pergunta=String(body.pergunta||"").trim();const img=image(typeof body.imagem==="string"?body.imagem:null);if(!pergunta&&!img)return out({error:"Informe uma pergunta ou envie uma imagem"},400);if(body.imagem&&!img)return out({error:"Imagem inválida ou acima do limite permitido"},400);
 const {data:profile}=await admin.from("erp_usuarios").select("id,nome,email,empresa_id,nivel_admin,cargo,ativo,auth_user_id").eq("auth_user_id",user.id).maybeSingle();if(!profile?.ativo)return out({error:"Usuário industrial não autorizado"},403);
 const role=String(profile.cargo||"").toLowerCase(),level=Number(profile.nivel_admin||0),financialAllowed=level>=9||role.includes("fiscal")||role.includes("adm");if(financialTerms.some(x=>norm(pergunta).includes(x))&&!financialAllowed)return out({answer:"Você não possui permissão (Nível Fiscal/ADM) para visualizar dados financeiros.",blocked:true,actions:[]});
 const {data:docs}=await client.from("erp_ajuda_documentos").select("id,slug,titulo,resumo,conteudo,palavras_chave,rota").eq("publico",true).order("ordem").limit(100);const helpDocs:HelpDoc[]=(docs??[]) as HelpDoc[];const terms=norm(pergunta).split(/\s+/).filter((x:string)=>x.length>2);const ranked:RankedDoc[]=helpDocs.map((doc)=>({...doc,score:terms.reduce((sum:number,term:string)=>sum+(norm(doc.titulo+" "+(doc.resumo??"")+" "+doc.conteudo+" "+(doc.palavras_chave??"")).includes(term)?1:0),0)})).sort((a,b)=>b.score-a.score).slice(0,6);const context=ranked.map(doc=>`[${doc.titulo}] ${doc.conteudo}`).join("\n\n");const apiKey=Deno.env.get("OPENAI_API_KEY");if(!apiKey)return out({answer:"A base de ajuda está disponível, mas o provedor de IA ainda não foi habilitado neste ambiente.",source:"base_local",actions:actions(pergunta)});
 const system=`Você é o assistente IA do SGQ ERP Industrial. Responda em português, com passos objetivos e sem inventar dados. Usuário autenticado: ${profile.email||user.email||""}. Cargo: ${profile.cargo||"não informado"}. Nível: ${level}. Empresa/tenant: ${profile.empresa_id}. Nunca revele IDs, tokens, segredos ou dados de outros tenants. Não responda valores financeiros para perfis sem autorização. Use a base do ERP. Para legislação, tecnologia, tendências, fornecedores, boas práticas atuais ou perguntas que peçam pesquisa, use a pesquisa web. Se houver ação direta possível, indique a rota.`;
 const content:ResponseContent[]=[{type:"input_text",text:`CONTEXTO:\n${context||"Nenhum tópico relevante."}\n\nPERGUNTA:\n${pergunta||"Analise a imagem e explique o problema e o próximo passo."}`}];if(img)content.push({type:"input_image",image_url:img});
 const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${apiKey}`},body:JSON.stringify({model:Deno.env.get("OPENAI_MODEL")||"gpt-5.6-luna",temperature:.2,tools:[{type:"web_search_preview"}],input:[{role:"system",content:[{type:"input_text",text:system}]},{role:"user",content}]} )});if(!response.ok){console.error("OpenAI:",await response.text());return out({error:"Serviço de IA indisponível no momento"},502)}const responseJson:unknown=await response.json();return out({answer:responseText(responseJson),source:"openai_responses_web",actions:actions(pergunta)});
});
