import { useEffect, useState } from 'react'
import { ArrowLeft, ClipboardList, FolderKanban, Inbox, PackageSearch, Settings, Wrench } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const items=[
  {key:'projetos',label:'PROJETOS',icon:FolderKanban},
  {key:'pedidos',label:'PEDIDOS',icon:ClipboardList,route:'/vendas'},
  {key:'entradas',label:'ENTRADAS',icon:Inbox,route:'/recebimento-materiais'},
  {key:'fichas',label:'FICHAS DE PROCESSO',icon:Wrench,route:'/engenharia/fichas-processo'},
  {key:'codigos',label:'CÓDIGOS DE PRODUTOS',icon:PackageSearch,route:'/produtos'},
  {key:'config',label:'CONFIGURAÇÕES',icon:Settings,route:'/configuracoes-adm'}
] as const

export default function EngenhariaCentral(){
  const[section,setSection]=useState('projetos'),[profile,setProfile]=useState(''),[error,setError]=useState('')
  useEffect(()=>{void(async()=>{const u=await supabase.auth.getUser();if(!u.data.user){setError('Sessão não encontrada.');return}const p=await supabase.from('erp_usuarios').select('perfil').eq('auth_user_id',u.data.user.id).eq('ativo',true).is('deleted_at',null).maybeSingle();if(p.error){setError(p.error.message);return}setProfile(String(p.data?.perfil??''))})()},[])
  const selected=items.find(x=>x.key===section)??items[0],Icon=selected.icon
  const open=(item:typeof items[number])=>{if('route'in item&&item.route){window.location.href=item.route}else setSection(item.key)}
  return <main className="min-h-screen bg-[#F4FBFD] p-4 text-[#123B50] md:p-6"><div className="mx-auto grid max-w-[1500px] gap-5 lg:grid-cols-[270px_1fr]">
    <aside className="rounded-2xl border-2 border-[#A7C8D4] bg-white p-4 shadow-lg"><div className="mb-3 flex items-center gap-3 border-b-2 border-[#D8EDF3] pb-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#17445A] text-white"><FolderKanban size={22}/></span><div><strong className="block font-black">ENGENHARIA</strong><span className="text-[10px] font-extrabold text-[#31505D]">CENTRAL DO SETOR</span></div></div><nav className="grid gap-2">{items.map(item=>{const ItemIcon=item.icon;return <button key={item.key} type="button" onClick={()=>open(item)} className={`flex min-h-[54px] items-center gap-3 rounded-xl border-2 px-3 text-left font-black ${section===item.key?'border-[#2D8DB8] bg-[#E7F5F9]':'border-[#D0E2E8] bg-white text-[#123B50]'}`}><ItemIcon size={20} className="text-[#176487]"/>{item.label}</button>})}</nav></aside>
    <section className="rounded-2xl border-2 border-[#A7C8D4] bg-white p-5 shadow-lg"><header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#D8EDF3] pb-4"><div><p className="mb-1 text-xs font-black tracking-[.12em] text-[#176487]">ENGENHARIA INDUSTRIAL</p><h1 className="text-2xl font-black text-[#123B50]">{selected.label}</h1></div><button type="button" onClick={()=>window.history.back()} className="inline-flex items-center gap-2 rounded-lg border-2 border-[#7C9AA5] bg-white px-3 py-2 font-black text-[#123B50]"><ArrowLeft size={17}/> Voltar</button></header><div className="mt-5 rounded-2xl border-2 border-dashed border-[#A7C8D4] bg-[#F8FCFD] p-10 text-center"><span className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-[#17445A] text-white"><Icon size={30}/></span><h2 className="text-xl font-black">{section==='projetos'?'Projetos de Engenharia':'Módulo '+selected.label}</h2><p className="mx-auto mt-2 max-w-2xl font-semibold text-[#31505D]">{error||'Sem dados demonstrativos. Os registros reais da empresa serão exibidos quando existirem no banco. Use o menu lateral para acessar cada área sem misturar setores.'}</p>{profile&&<p className="mt-3 text-xs font-black text-[#176487]">PERFIL: {profile.toUpperCase()}</p>}</div></section>
  </div></main>
}