import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Database, HelpCircle, Plus, Save, Trash2, SlidersHorizontal, Boxes, MapPinned, WandSparkles } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import ConfiguracoesEngenhariaLayout from './ConfiguracoesEngenhariaLayout'

type Area={id:string;sigla_tipo:string;nome_area:string;destinacao:'FABRICA'|'COMERCIAL'|'ADMINISTRATIVO';ativo:boolean}
const destLabel={FABRICA:'Chão de Fábrica',COMERCIAL:'Comercial / Vendas',ADMINISTRATIVO:'Administrativo'}
const emptyArea={sigla_tipo:'',nome_area:'',destinacao:'FABRICA' as Area['destinacao']}

export default function ConfiguracaoCodificacaoAreas(){
 const [empresaId,setEmpresaId]=useState<string|null>(null)
 const [config,setConfig]=useState({id:'',sigla_empresa:'PL',separador:'-',sequencial_digitos:4,modo:'PREFIXO_GRUPO_SEQUENCIAL'})
 const [areas,setAreas]=useState<Area[]>([])
 const [area,setArea]=useState(emptyArea)
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 const load=async()=>{
  setBusy(true);setError('')
  try{
   const {data:user}=await supabase.auth.getUser(); if(!user.user) throw new Error('Sessão não encontrada.')
   const {data:p,error:pe}=await supabase.from('erp_usuarios').select('empresa_id,is_master').eq('auth_user_id',user.user.id).eq('ativo',true).is('deleted_at',null).maybeSingle()
   if(pe) throw pe; if(!p?.empresa_id) throw new Error('Esta configuração precisa estar vinculada a uma empresa.')
   setEmpresaId(p.empresa_id)
   const [c,a]=await Promise.all([
    supabase.from('erp_engenharia_codificacao').select('*').eq('empresa_id',p.empresa_id).maybeSingle(),
    supabase.from('erp_engenharia_areas').select('*').eq('empresa_id',p.empresa_id).eq('ativo',true).order('sigla_tipo')
   ])
   if(c.error) throw c.error; if(a.error) throw a.error
   if(c.data) setConfig({id:c.data.id,sigla_empresa:c.data.sigla_empresa,separador:c.data.separador,sequencial_digitos:c.data.sequencial_digitos,modo:c.data.modo})
   setAreas((a.data||[]) as Area[])
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar as configurações.')}
  finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[])
 const preview=useMemo(()=>areas.map(a=>({...a,preview:config.sigla_empresa.toUpperCase()+config.separador+a.sigla_tipo+config.separador+'1'.padStart(config.sequencial_digitos,'0')})),[areas,config])
 const saveConfig=async()=>{
  if(!empresaId)return;setBusy(true);setError('');setMessage('')
  try{
   const {error}=await supabase.from('erp_engenharia_codificacao').upsert({id:config.id||undefined,empresa_id:empresaId,sigla_empresa:config.sigla_empresa.trim().toUpperCase(),separador:config.separador,sequencial_digitos:config.sequencial_digitos,modo:config.modo,updated_at:new Date().toISOString()},{onConflict:'empresa_id'})
   if(error)throw error;setMessage('Parâmetros globais salvos no Supabase.')
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.')}finally{setBusy(false)}
 }
 const addArea=async(e:FormEvent)=>{
  e.preventDefault();if(!empresaId||!area.sigla_tipo.trim()||!area.nome_area.trim())return
  setBusy(true);setError('');setMessage('')
  try{
   const {data,error}=await supabase.from('erp_engenharia_areas').insert({empresa_id:empresaId,sigla_tipo:area.sigla_tipo.trim().toUpperCase(),nome_area:area.nome_area.trim(),destinacao:area.destinacao}).select().single()
   if(error)throw error;setAreas(v=>[...v,data as Area]);setArea(emptyArea);setMessage('Área cadastrada no Supabase.')
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível cadastrar a área.')}finally{setBusy(false)}
 }
 const removeArea=async(id:string)=>{
  setBusy(true);setError('')
  try{const {error}=await supabase.from('erp_engenharia_areas').update({ativo:false,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;setAreas(v=>v.filter(x=>x.id!==id));setMessage('Área desativada.')}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível desativar a área.')}finally{setBusy(false)}
 }
 return <ConfiguracoesEngenhariaLayout title="Codificação e Áreas" subtitle="Configure a inteligência de geração de códigos, grupos de produtos e áreas de destino sem alterar códigos históricos.">
  {(message||error)&&<div className={'mb-5 rounded-xl border px-4 py-3 text-sm font-bold '+(error?'border-red-200 bg-red-50 text-red-700':'border-[#BFE3EA] bg-[#F0FAFC] text-[#123B50]')}>{error||message}</div>}
  <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
   <section className="xl:col-span-5 rounded-2xl bg-white border border-[#D8E5EA] shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-[#E6EEF1] flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-[#EAF6FA] text-[#2D8DB8] grid place-items-center"><SlidersHorizontal size={19}/></div><div><h2 className="font-black text-[#123B50]">Inteligência de Código</h2><p className="text-xs text-slate-500">Máscara principal da empresa</p></div></div>
    <div className="p-5 space-y-4">
     <label className="block text-xs font-black uppercase text-slate-500">Sigla da Empresa<input value={config.sigla_empresa} maxLength={10} onChange={e=>setConfig({...config,sigla_empresa:e.target.value.toUpperCase()})} className="mt-1 w-full rounded-xl border border-[#C9DCE2] px-3 py-3 font-black text-[#123B50]"/></label>
     <div className="grid grid-cols-2 gap-3">
      <label className="block text-xs font-black uppercase text-slate-500">Separador<select value={config.separador} onChange={e=>setConfig({...config,separador:e.target.value})} className="mt-1 w-full rounded-xl border border-[#C9DCE2] px-3 py-3"><option>-</option><option>/</option><option>.</option><option value="">Sem separador</option></select></label>
      <label className="block text-xs font-black uppercase text-slate-500">Sequencial<select value={config.sequencial_digitos} onChange={e=>setConfig({...config,sequencial_digitos:Number(e.target.value)})} className="mt-1 w-full rounded-xl border border-[#C9DCE2] px-3 py-3"><option value={4}>4 dígitos</option><option value={5}>5 dígitos</option><option value={6}>6 dígitos</option></select></label>
     </div>
     <div className="rounded-xl bg-[#F4FBFD] border border-[#CBE8EE] p-4"><div className="text-[10px] font-black uppercase text-slate-500">Preview do código</div><div className="mt-2 text-2xl font-black text-[#123B50]">{config.sigla_empresa}{config.separador}GRP{config.separador}{'1'.padStart(config.sequencial_digitos,'0')}</div></div>
     <button disabled={busy} onClick={()=>void saveConfig()} className="w-full rounded-xl bg-[#123B50] px-4 py-3 text-sm font-black text-white flex items-center justify-center gap-2"><Save size={17}/> SALVAR CONFIGURAÇÃO</button>
    </div>
   </section>
   <section className="xl:col-span-7 rounded-2xl bg-white border border-[#D8E5EA] shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-[#E6EEF1] flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-[#EDF8F2] text-[#3A9D78] grid place-items-center"><Boxes size={19}/></div><div><h2 className="font-black text-[#123B50]">Grupos de Produtos</h2><p className="text-xs text-slate-500">Base para composição do código industrial</p></div></div>
    <div className="p-5"><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><div className="rounded-xl border border-[#D8E5EA] p-4"><div className="text-xs font-black text-slate-400 uppercase">Prefixo</div><div className="mt-1 text-xl font-black">GRP</div></div><div className="rounded-xl border border-[#D8E5EA] p-4"><div className="text-xs font-black text-slate-400 uppercase">Sequencial</div><div className="mt-1 text-xl font-black">{String(1).padStart(config.sequencial_digitos,'0')}</div></div><div className="rounded-xl border border-[#D8E5EA] p-4"><div className="text-xs font-black text-slate-400 uppercase">Status</div><div className="mt-1 text-xl font-black text-[#3A9D78]">ATIVO</div></div></div><div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600 flex gap-3"><WandSparkles size={18} className="shrink-0 text-[#2D8DB8]"/> A estrutura fica pronta para os módulos de Produtos e Engenharia utilizarem a mesma regra.</div></div>
   </section>
   <section className="xl:col-span-12 rounded-2xl bg-white border border-[#D8E5EA] shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-[#E6EEF1] flex items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-[#FFF7E8] text-[#E6A34A] grid place-items-center"><MapPinned size={19}/></div><div><h2 className="font-black text-[#123B50]">Áreas / Destinações</h2><p className="text-xs text-slate-500">Cadastre onde cada grupo de produto pertence.</p></div></div><button title="Ajuda" className="rounded-xl border border-[#D8E5EA] p-2 text-[#2D8DB8]"><HelpCircle size={18}/></button></div>
    <form onSubmit={addArea} className="p-5 grid grid-cols-1 md:grid-cols-12 gap-3 items-end border-b border-slate-100"><label className="md:col-span-2 text-xs font-black uppercase text-slate-500">Sigla<input required maxLength={10} value={area.sigla_tipo} onChange={e=>setArea({...area,sigla_tipo:e.target.value.toUpperCase()})} className="mt-1 w-full rounded-xl border border-[#C9DCE2] px-3 py-2.5 font-mono"/></label><label className="md:col-span-5 text-xs font-black uppercase text-slate-500">Nome da área<input required value={area.nome_area} onChange={e=>setArea({...area,nome_area:e.target.value})} className="mt-1 w-full rounded-xl border border-[#C9DCE2] px-3 py-2.5"/></label><label className="md:col-span-3 text-xs font-black uppercase text-slate-500">Destinação<select value={area.destinacao} onChange={e=>setArea({...area,destinacao:e.target.value as Area['destinacao']})} className="mt-1 w-full rounded-xl border border-[#C9DCE2] px-3 py-2.5"><option value="FABRICA">Fábrica</option><option value="COMERCIAL">Comercial</option><option value="ADMINISTRATIVO">Administrativo</option></select></label><button disabled={busy} className="md:col-span-2 rounded-xl bg-[#2D8DB8] px-4 py-2.5 text-sm font-black text-white flex items-center justify-center gap-2"><Plus size={17}/> CADASTRAR</button></form>
    <div className="overflow-auto"><table className="w-full text-sm"><thead className="bg-[#F4FBFD] text-[10px] uppercase text-slate-500"><tr><th className="p-3 text-left">Sigla</th><th className="p-3 text-left">Área</th><th className="p-3 text-left">Destinação</th><th className="p-3 text-left">Próximo código</th><th className="p-3 w-12"/></tr></thead><tbody>{preview.length?preview.map(a=><tr key={a.id} className="border-t border-slate-100"><td className="p-3 font-mono font-black text-[#123B50]">{a.sigla_tipo}</td><td className="p-3 font-semibold">{a.nome_area}</td><td className="p-3">{destLabel[a.destinacao]}</td><td className="p-3 font-mono font-black text-[#2D8DB8]">{a.preview}</td><td className="p-3 text-right"><button onClick={()=>void removeArea(a.id)} disabled={busy} className="p-2 text-red-600" title="Desativar"><Trash2 size={16}/></button></td></tr>):<tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhuma área cadastrada para esta empresa.</td></tr>}</tbody></table></div>
   </section>
  </div>
 </ConfiguracoesEngenhariaLayout>
}
