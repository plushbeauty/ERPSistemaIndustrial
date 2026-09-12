import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Bot, HelpCircle, ImagePlus, Link2, Loader2, Search, X } from 'lucide-react'
import { supabase } from './lib/supabaseClient'

type HelpDoc={id:string;slug:string;titulo:string;resumo:string;conteudo:string;palavras_chave:string[];rota:string|null;ordem:number}
type Action={label:string;route:string}
const fallback:HelpDoc[]=[{id:'fallback-dashboard',slug:'dashboard',titulo:'Dashboard',resumo:'Visão executiva da operação.',conteudo:'Use os indicadores e atalhos para acompanhar a operação industrial.',palavras_chave:['dashboard','indicadores','KPI'],rota:'/',ordem:1}]
const routeSlug:Record<string,string>={'/':'dashboard','/login':'login','/cadastro-empresa':'cadastro-empresa','/qualidade':'qualidade','/fiscal':'fiscal','/pcp':'pcp-mrp','/master':'usuarios-permissoes','/erp-industrial':'dashboard'}
const financialTerms=['financeiro','caixa','conta a pagar','conta a receber','a pagar','a receber','saldo','faturamento','receita','despesa','fluxo de caixa','previsao de caixa','pagamento','recebimento']
const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
const MAX=6*1024*1024

export default function GlobalHelp(){
 const [open,setOpen]=useState(false),[docs,setDocs]=useState<HelpDoc[]>(fallback),[search,setSearch]=useState(''),[question,setQuestion]=useState(''),[answer,setAnswer]=useState(''),[actions,setActions]=useState<Action[]>([]),[image,setImage]=useState<string|null>(null),[loading,setLoading]=useState(false),[path,setPath]=useState(location.pathname);const inputRef=useRef<HTMLInputElement>(null)
 useEffect(()=>{const f=()=>setPath(location.pathname);addEventListener('popstate',f);return()=>removeEventListener('popstate',f)},[])
 useEffect(()=>{void loadDocs()},[])
 async function loadDocs(){const {data}=await supabase.from('erp_ajuda_documentos').select('id,slug,titulo,resumo,conteudo,palavras_chave,rota,ordem').eq('publico',true).order('ordem');if(data?.length)setDocs(data as HelpDoc[])}
 const current=useMemo(()=>docs.find(d=>d.slug===routeSlug[path])||docs.find(d=>d.slug==='dashboard')||docs[0],[docs,path])
 const results=useMemo(()=>{const term=normalize(search.trim());if(!term)return docs.slice(0,8);return docs.filter(d=>normalize([d.titulo,d.resumo,d.conteudo,...d.palavras_chave].join(' ')).includes(term)).slice(0,8)},[docs,search])
 async function readImage(file:File){if(file.size>MAX){setAnswer('A imagem deve ter no máximo 6 MB.');return}if(!file.type.startsWith('image/')){setAnswer('Envie uma imagem PNG, JPG, WEBP ou similar.');return}const r=new FileReader();r.onload=()=>setImage(String(r.result));r.readAsDataURL(file)}
 async function ask(){const clean=question.trim();if((!clean&&!image)||loading)return;setLoading(true);setAnswer('');setActions([]);try{const {data,error}=await supabase.functions.invoke('erp-ai-help',{body:{pergunta:clean||'Analise esta imagem e explique o que devo fazer.',imagem:image}});if(error)throw error;setAnswer(String(data?.answer||'Não consegui interpretar a solicitação.'));setActions(Array.isArray(data?.actions)?data.actions:[]);setQuestion('')}catch{setAnswer('O assistente visual ainda não está conectado ao provedor de IA deste ambiente. A base de ajuda continua disponível abaixo.')}finally{setLoading(false)}}
 return <>
  <button type="button" aria-label="Abrir Ajuda IA" title="Ajuda IA" className="global-help-button" onClick={()=>setOpen(true)}><Bot size={20}/><span>Ajuda IA</span></button>
  {open&&<aside className="global-help-panel" role="dialog" aria-label="Ajuda IA do SGQ ERP">
   <div className="global-help-head"><span className="global-help-icon"><Bot size={20}/></span><div><strong>Ajuda IA</strong><small>{current?.titulo||'SGQ ERP'} · texto + imagem</small></div><button type="button" onClick={()=>setOpen(false)} aria-label="Fechar"><X size={18}/></button></div>
   {answer&&<div className="global-help-answer">{answer}</div>}
   {actions.length>0&&<div className="global-help-actions">{actions.map(a=><a key={a.route+a.label} href={a.route}><Link2 size={15}/>{a.label}<ArrowRight size={15}/></a>)}</div>}
   {image&&<div className="global-help-image"><img src={image} alt="Imagem enviada para análise"/><button type="button" onClick={()=>setImage(null)}>Remover imagem</button></div>}
   <div className="global-help-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar ajuda"/></div>
   <div className="global-help-chat"><textarea value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Pergunte sobre esta tela ou envie um print..."/><div><button type="button" onClick={()=>inputRef.current?.click()}><ImagePlus size={16}/> Imagem</button><input ref={inputRef} type="file" accept="image/*" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void readImage(f);e.currentTarget.value='' }}/><button type="button" onClick={()=>void ask()} disabled={loading||(!question.trim()&&!image)}>{loading?<Loader2 size={16} className="animate-spin"/>:<Bot size={16}/>} Perguntar</button></div></div>
   {!search?<><h3 className="global-help-topic-title">{current?.titulo||'SGQ ERP'}</h3><p>{current?.conteudo||current?.resumo||'Consulte a base de conhecimento do sistema.'}</p>{current?.rota&&current.rota!==path&&<a className="global-help-action" href={current.rota}>Abrir módulo <ArrowRight size={17}/></a>}</>:<div className="global-help-results">{results.map(d=><button type="button" key={d.id} onClick={()=>{setSearch('');if(d.rota&&d.rota!==path)location.href=d.rota}}>{d.titulo}<small>{d.resumo}</small></button>)}{!results.length&&<div className="global-help-no-results">Nenhum tópico encontrado.</div>}</div>}
   <div className="global-help-tips"><span>🔐 Segurança por perfil</span><span>A IA consulta o usuário autenticado e bloqueia valores financeiros para perfis sem permissão.</span></div>
  </aside>}
 </>
}
