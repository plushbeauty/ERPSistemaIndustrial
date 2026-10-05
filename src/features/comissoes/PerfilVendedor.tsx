import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import LinkFieldCombobox, { type LinkOption } from '../../components/ui/LinkFieldCombobox'
import VendasLayout from '../../pages/VendasLayout'

type User={id:string;nome:string;email:string;perfil:string}
type Profile={id:string;nome:string}
type Link={id:string;usuario_id:string;perfil_id:string;status:string;usuario?:User;perfil?:Profile}
const input='h-7 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-800 outline-none focus:border-blue-500'
const label='mb-0.5 block text-[10px] font-bold uppercase text-gray-500'
export default function PerfilVendedor(){
 const [users,setUsers]=useState<User[]>([]),[profiles,setProfiles]=useState<Profile[]>([]),[links,setLinks]=useState<Link[]>([])
 const [userId,setUserId]=useState(''),[profileId,setProfileId]=useState(''),[status,setStatus]=useState('Ativo'),[error,setError]=useState('')
 const load=async()=>{const [u,p,l]=await Promise.all([supabase.from('erp_usuarios').select('id,nome,email,perfil').eq('ativo',true).is('deleted_at',null).order('nome'),supabase.from('erp_comissao_perfis').select('id,nome').eq('ativo',true).order('nome'),supabase.from('erp_comissao_vinculos').select('id,usuario_id,perfil_id,status,usuario:erp_usuarios(id,nome,email,perfil),perfil:erp_comissao_perfis(id,nome)').order('created_at',{ascending:false})]);if(u.error)throw u.error;if(p.error)throw p.error;if(l.error)throw l.error;setUsers((u.data??[]) as User[]);setProfiles((p.data??[]) as Profile[]);setLinks((l.data??[]) as unknown as Link[])}
 useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:'Falha ao carregar vínculos.'))},[])
 const save=async()=>{if(!userId||!profileId)return;const r=await supabase.rpc('erp_comissao_vincular',{p_usuario_id:userId,p_perfil_id:profileId,p_status:status});if(r.error)setError(r.error.message);else await load()}
 const userOptions:LinkOption[]=users.map(u=>({value:u.id,label:u.nome,description:u.email}))
 const profileOptions:LinkOption[]=profiles.map(p=>({value:p.id,label:p.nome}))
 return <VendasLayout title="Perfil de vendedor" subtitle="Vendedor • perfil de comissão • status" onRefresh={() => void load()}><main className="min-h-screen bg-slate-50 p-3"><section className="border border-gray-200 bg-white p-2 shadow-sm"><div className="mb-2 flex items-center justify-between"><div><div className="text-[10px] font-bold uppercase text-blue-700">Controladoria Comercial</div><nav className="mt-1 flex gap-2 text-[11px]"><a href="/comissoes/regras">Regras</a><a href="/comissoes/calculo">Cálculo</a><a className="font-bold text-blue-700" href="/comissoes/perfil">Perfil Vendedor</a></nav></div></div>
 <div className="flex items-end gap-2"><div className="w-[180px]"><label className={label}>Vendedor/Agente</label><LinkFieldCombobox value={userId} options={userOptions} onChange={setUserId}/></div><div className="w-40"><label className={label}>Perfil de Regras</label><LinkFieldCombobox value={profileId} options={profileOptions} onChange={setProfileId}/></div><div className="w-[90px]"><label className={label}>Status</label><select className={input+' w-[90px]'} value={status} onChange={e=>setStatus(e.target.value)}><option>Ativo</option><option>Inativo</option></select></div><button type="button" className="flex h-7 w-[95px] items-center justify-center gap-1 rounded-md bg-blue-600 px-2 text-[11px] font-bold text-white" onClick={()=>void save()}><Save size={12}/>Gravar Vínculo</button></div>
 {error&&<div className="mt-2 text-[11px] text-red-600">{error}</div>}
 <div className="scroll-fade-x mt-2 max-h-[200px] overflow-auto border border-gray-200"><table className="w-full border-collapse text-[10px]"><thead className="bg-slate-700 text-white"><tr className="h-7"><th className="px-2 text-left font-normal">Vendedor</th><th className="px-2 text-left font-normal">Perfil</th><th className="px-2 text-left font-normal">Status</th></tr></thead><tbody>{links.map((x,i)=><tr key={x.id} className={i%2?'bg-slate-50':'bg-white'} style={{height:24}}><td className="px-2">{x.usuario?.nome??'—'}</td><td className="px-2">{x.perfil?.nome??'—'}</td><td className="px-2">{x.status}</td></tr>)}</tbody></table></div>
 </section></main></VendasLayout>
}