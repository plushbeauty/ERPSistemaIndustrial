import { useCallback, useEffect, useState } from 'react'
import { Bell, Check, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
type Sector = 'VENDAS' | 'PCP' | 'COMPRAS' | 'ALMOXARIFADO' | 'SGQ' | 'FINANCEIRO'
type Notification = { id:string; setor_origem:Sector; setor_destino:Sector; titulo:string; mensagem:string; referencia_tipo:string|null; referencia_id:string|null; rota_destino:string|null; lida:boolean; created_at:string; expira_em:string }
type Profile = { empresa_id:string|null; perfil:string|null; erp_setores:{codigo?:string|null;nome?:string|null}|{codigo?:string|null;nome?:string|null}[]|null }
function sectorOf(profile:Profile):Sector|null {
 const row=Array.isArray(profile.erp_setores)?profile.erp_setores[0]:profile.erp_setores
 const value=(String(row?.codigo||'')+' '+String(row?.nome||'')+' '+String(profile.perfil||'')).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()
 if(value.includes('PCP')) return 'PCP'
 if(value.includes('COMPRA')) return 'COMPRAS'
 if(value.includes('ALMOX')||value.includes('ESTOQUE')) return 'ALMOXARIFADO'
 if(value.includes('QUALIDADE')||value.includes('SGQ')) return 'SGQ'
 if(value.includes('FINANCEIRO')||value.includes('FISCAL')||value.includes('FIN')) return 'FINANCEIRO'
 if(value.includes('VENDA')||value.includes('COMERCIAL')||value.includes('VDA')) return 'VENDAS'
 return null
}
const dateLabel=(value:string)=>new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value))
export default function NotificacoesSetorBell({onNavigate}:{onNavigate:(route:string)=>void}) {
 const [open,setOpen]=useState(false),[items,setItems]=useState<Notification[]>([]),[unread,setUnread]=useState(0),[company,setCompany]=useState(''),[sector,setSector]=useState<Sector|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState<string|null>(null)
 const load=useCallback(async()=>{
  try {
   const auth=await supabase.auth.getUser(); if(auth.error) throw auth.error; if(!auth.data.user){setItems([]);setUnread(0);return}
   const result=await supabase.from('erp_usuarios').select('empresa_id,perfil,erp_setores(codigo,nome)').eq('auth_user_id',auth.data.user.id).eq('ativo',true).is('deleted_at',null).maybeSingle<Profile>()
   if(result.error) throw result.error; if(!result.data?.empresa_id){setItems([]);setUnread(0);return}
   const destination=sectorOf(result.data);setCompany(result.data.empresa_id);setSector(destination);if(!destination){setItems([]);setUnread(0);setError('Usuário sem setor vinculado.');return}
   const now=new Date().toISOString()
   const [list,count]=await Promise.all([
    supabase.from('erp_notificacoes_setor').select('id,setor_origem,setor_destino,titulo,mensagem,referencia_tipo,referencia_id,rota_destino,lida,created_at,expira_em').eq('empresa_id',result.data.empresa_id).eq('setor_destino',destination).gt('expira_em',now).order('created_at',{ascending:false}).limit(100),
    supabase.from('erp_notificacoes_setor').select('id',{count:'exact',head:true}).eq('empresa_id',result.data.empresa_id).eq('setor_destino',destination).eq('lida',false).gt('expira_em',now)
   ])
   if(list.error) throw list.error;if(count.error) throw count.error;setItems((list.data||[]) as Notification[]);setUnread(count.count||0);setError('')
  } catch(cause) {setError(cause instanceof Error?cause.message:'Não foi possível carregar as notificações.')}
 },[])
 useEffect(()=>{void load();const timer=window.setInterval(()=>void load(),30000);const channel=supabase.channel('erp-notificacoes-setor-shell').on('postgres_changes',{event:'*',schema:'public',table:'erp_notificacoes_setor'},()=>void load()).subscribe();return()=>{window.clearInterval(timer);void supabase.removeChannel(channel)}},[load])
 const openItem=async(item:Notification)=>{setBusy(item.id);try{if(!item.lida){const result=await supabase.from('erp_notificacoes_setor').update({lida:true,lida_em:new Date().toISOString()}).eq('id',item.id).eq('empresa_id',company).eq('setor_destino',sector);if(result.error)throw result.error}setOpen(false);if(item.rota_destino)onNavigate(item.rota_destino);await load()}catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível marcar como lida.')}finally{setBusy(null)}}
 const visible=items.filter(item=>new Date(item.expira_em).getTime()>Date.now())
 return <div className="erp-sector-notification">
  <button type="button" className="erp-sector-notification-trigger" aria-label={'Notificações do setor: '+unread+' não lidas'} aria-expanded={open} onClick={()=>setOpen(value=>!value)}><Bell size={17}/>{unread>0&&<span className="erp-sector-notification-count">{unread>99?'99+':unread}</span>}</button>
  {open&&<section className="erp-sector-notification-panel" role="dialog" aria-label="Notificações do setor"><header><div><strong>Notificações</strong><small>{sector||'Setor não identificado'} · últimos 10 dias</small></div><button type="button" onClick={()=>setOpen(false)} aria-label="Fechar">×</button></header>
   {error&&<p className="erp-sector-notification-error" role="alert">{error}</p>}<div className="erp-sector-notification-list">
    {visible.length===0&&!error&&<p className="erp-sector-notification-empty">Nenhuma notificação ativa para este setor.</p>}
    {visible.map(item=><button type="button" key={item.id} disabled={busy===item.id} onClick={()=>void openItem(item)} className={'erp-sector-notification-item '+(item.lida?'is-read':'is-unread')}><span className="erp-sector-notification-item-icon">{item.lida?<Check size={14}/>:<i/>}</span><span className="erp-sector-notification-item-body"><strong>{item.titulo}</strong><span>{item.mensagem}</span><small>{item.setor_origem} · {dateLabel(item.created_at)}</small></span>{item.rota_destino&&<ExternalLink size={13}/>}</button>)}
   </div><footer><span>{unread} não lida(s)</span><button type="button" onClick={()=>void load()}>Atualizar</button></footer></section>}
 </div>
}