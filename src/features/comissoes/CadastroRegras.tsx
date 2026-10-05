import { useEffect, useMemo, useState } from 'react'
import { Ban, Plus, Save, Search } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import LinkFieldCombobox, { type LinkOption } from '../../components/ui/LinkFieldCombobox'
import VendasLayout from '../../pages/VendasLayout'

type Profile={id:string;nome:string;ativo:boolean}
type Product={id:string;codigo:string;nome:string;descricao:string|null;dimensional:string|null}
type Rule={id:string;perfil_id:string;produto_id:string;percentual:number;meta_quantidade:number;ativo:boolean;perfil:Profile|null;produto:Product|null}

const input='h-7 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-800 outline-none focus:border-blue-500'
const label='mb-0.5 block text-[10px] font-bold uppercase text-gray-500'
const button='flex h-7 items-center justify-center gap-1 rounded-md px-2 text-[11px] font-bold'

export default function CadastroRegras(){
 const [profiles,setProfiles]=useState<Profile[]>([]),[products,setProducts]=useState<Product[]>([]),[rules,setRules]=useState<Rule[]>([])
 const [profileId,setProfileId]=useState(''),[sku,setSku]=useState(''),[pct,setPct]=useState(''),[meta,setMeta]=useState(''),[newProfile,setNewProfile]=useState('')
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
 const load=async()=>{
  const [p,r,x]=await Promise.all([
   supabase.from('erp_comissao_perfis').select('id,nome,ativo').eq('ativo',true).order('nome'),
   supabase.from('erp_produtos').select('id,codigo,nome,descricao,dimensional').eq('ativo',true).order('codigo').limit(5000),
   supabase.from('erp_comissao_regras').select('id,perfil_id,produto_id,percentual,meta_quantidade,ativo,perfil:erp_comissao_perfis(id,nome,ativo),produto:erp_produtos(id,codigo,nome,descricao,dimensional)').eq('ativo',true).order('created_at',{ascending:false}),
  ])
  if(p.error)throw p.error;if(r.error)throw r.error;if(x.error)throw x.error
  setProfiles((p.data??[]) as Profile[]);setProducts((r.data??[]) as Product[]);setRules((x.data??[]) as unknown as Rule[])
 }
 useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:'Falha ao carregar regras.'))},[])
 const productOptions=useMemo<LinkOption[]>(()=>products.map(p=>({value:p.id,label:p.codigo,description:p.nome,dimensions:p.dimensional??p.descricao??''})),[products])
 const addProfile=async()=>{if(!newProfile.trim())return;setBusy(true);setError('');const r=await supabase.from('erp_comissao_perfis').insert({nome:newProfile.trim()}).select('id,nome,ativo').single();setBusy(false);if(r.error){setError(r.error.message);return}setProfiles(v=>[...v,r.data as Profile]);setProfileId(r.data.id);setNewProfile('')}
 const add=async()=>{setError('');setMessage('');if(!profileId||!sku){setError('Selecione perfil e SKU.');return}const p=Number(pct),m=Number(meta);if(!Number.isFinite(p)||p<0||p>100||!Number.isFinite(m)||m<0){setError('Percentual e meta devem ser numéricos válidos.');return}setBusy(true);const r=await supabase.rpc('erp_comissao_salvar_regra',{p_perfil_id:profileId,p_produto_id:sku,p_percentual:p,p_meta_quantidade:m});setBusy(false);if(r.error){setError(r.error.message);return}setMessage('Regra gravada.');await load()}
 const disable=async(id:string)=>{setError('');const r=await supabase.from('erp_comissao_regras').update({ativo:false}).eq('id',id);if(r.error)setError(r.error.message);else await load()}
 return <VendasLayout title="Regras de comissão" subtitle="Produtos • percentuais • metas" onRefresh={() => void load()}><main className="min-h-screen bg-slate-50 p-3 text-gray-800">
  <section className="mb-2 flex items-end justify-between gap-2 border border-gray-200 bg-white p-2 shadow-sm">
   <div><div className="mb-1 text-[10px] font-bold uppercase text-blue-700">Controladoria Comercial</div><nav className="flex gap-2 text-[11px]"><a className="font-bold text-blue-700" href="/comissoes/regras">Regras</a><a href="/comissoes/calculo">Cálculo</a><a href="/comissoes/perfil">Perfil Vendedor</a></nav></div>
   <div className="flex items-end gap-2"><div><label className={label}>Perfil Comissão</label><select className={input+' w-40'} value={profileId} onChange={e=>setProfileId(e.target.value)}><option value="">Selecione...</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></div><div><label className={label}>Novo Perfil</label><input className={input+' w-40'} value={newProfile} onChange={e=>setNewProfile(e.target.value)} /></div><button type="button" className={button+' w-20 bg-blue-600 text-white'} onClick={()=>void addProfile()} disabled={busy}><Save size={12}/>Novo</button></div>
  </section>
  <section className="border border-gray-200 bg-white p-2 shadow-sm">
   <div className="mb-2 flex items-end gap-2 bg-gray-50 p-2">
    <div className="w-[120px]"><label className={label}>SKU Produto</label><LinkFieldCombobox value={sku} options={productOptions} onChange={setSku} placeholder="SKU / busca" /></div>
    <div className="w-20"><label className={label}>% Comissão</label><input className={input+' w-20 text-right'} type="number" step="0.01" min="0" max="100" value={pct} onChange={e=>setPct(e.target.value)}/></div>
    <div className="w-20"><label className={label}>Meta Qtd</label><input className={input+' w-20 text-right'} type="number" min="0" value={meta} onChange={e=>setMeta(e.target.value)}/></div>
    <button type="button" className={button+' w-20 bg-emerald-600 text-white'} onClick={()=>void add()} disabled={busy}><Plus size={12}/>+ Add</button>
    <Search size={13} className="ml-auto text-gray-400"/>
   </div>
   {error&&<div className="mb-2 text-[11px] font-semibold text-red-600">{error}</div>}{message&&<div className="mb-2 text-[11px] font-semibold text-emerald-700">{message}</div>}
   <div className="scroll-fade-x max-h-[200px] overflow-auto border border-gray-200"><table className="w-full border-collapse text-[10px]"><thead className="sticky top-0 bg-slate-700 text-white"><tr className="h-[26px]"><th className="px-2 text-left font-normal">Perfil</th><th className="px-2 text-left font-normal">SKU</th><th className="px-2 text-left font-normal">Produto</th><th className="px-2 text-right font-normal">%</th><th className="px-2 text-right font-normal">Meta Qtd</th><th className="w-10"></th></tr></thead><tbody>{rules.map((r,i)=><tr key={r.id} className={i%2?'bg-slate-50':'bg-white'} style={{height:26}}><td className="px-2">{r.perfil?.nome??'—'}</td><td className="px-2 font-semibold">{r.produto?.codigo??'—'}</td><td className="px-2">{r.produto?.nome??'—'}</td><td className="px-2 text-right">{Number(r.percentual).toFixed(2)}</td><td className="px-2 text-right">{Number(r.meta_quantidade).toLocaleString('pt-BR')}</td><td className="text-center"><button type="button" title="Inativar regra" className="h-7 w-7" onClick={()=>void disable(r.id)}><Ban size={11} className="text-red-600"/></button></td></tr>)}</tbody></table></div>
   <footer className="mt-2 flex justify-end border-t border-gray-200 pt-2"><button type="button" className={button+' w-[95px] bg-blue-600 text-white'} onClick={()=>void load()}><Save size={12}/>Gravar</button></footer>
  </section></main></VendasLayout>
}