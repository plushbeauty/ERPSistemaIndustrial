import { useMemo } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { KeyRound, ShieldCheck, UsersRound, FileText, DatabaseBackup, Settings } from 'lucide-react'
import ConfiguracaoCodificacaoAreas from './ConfiguracaoCodificacaoAreas'
import ConfiguracaoPermissoes from './ConfiguracaoPermissoes'
import ConfiguracaoPerfis from './ConfiguracaoPerfis'
import ConfiguracaoLogs from './ConfiguracaoLogs'
import ConfiguracaoBackups from './ConfiguracaoBackups'

type Profile={nome?:string}|null
type Item={path:string;label:string;hint:string;icon:typeof Settings}
const items:Item[]=[
 {path:'/configuracoes-adm/codificacao',label:'Codificação',hint:'Áreas e códigos',icon:KeyRound},
 {path:'/configuracoes-adm/permissoes',label:'Permissões',hint:'Acesso por perfil',icon:ShieldCheck},
 {path:'/configuracoes-adm/perfis',label:'Perfis',hint:'Perfis RBAC',icon:UsersRound},
 {path:'/configuracoes-adm/logs',label:'Logs',hint:'Auditoria',icon:FileText},
 {path:'/configuracoes-adm/backups',label:'Backups',hint:'Continuidade',icon:DatabaseBackup},
]

export default function ConfiguracoesADM({profile}:{profile:Profile}){
 const location=useLocation(),navigate=useNavigate()
 const active=useMemo(()=>items.find(x=>location.pathname===x.path),[location.pathname])
 const renderContent=()=>{
   if(!active)return <Welcome/>
   if(active.path.endsWith('/codificacao'))return <ConfiguracaoCodificacaoAreas profile={profile}/>
   if(active.path.endsWith('/permissoes'))return <ConfiguracaoPermissoes/>
   if(active.path.endsWith('/perfis'))return <ConfiguracaoPerfis/>
   if(active.path.endsWith('/logs'))return <ConfiguracaoLogs/>
   return <ConfiguracaoBackups/>
 }
 return <div className="min-h-[calc(100vh-104px)] bg-[#F4F7FE] text-slate-800">
   <div className="flex min-h-[calc(100vh-104px)]">
     <aside className="sticky top-0 z-10 flex h-[calc(100vh-104px)] w-[95px] shrink-0 flex-col border-r border-[#173F52] bg-[#123B50] text-white shadow-[8px_0_24px_rgba(18,59,80,.18)]">
       <div className="flex h-[72px] items-center justify-center border-b border-white/10">
         <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#55B8C8] via-[#2D8DB8] to-[#17445A] shadow-[0_9px_18px_rgba(0,0,0,.3),inset_0_2px_0_rgba(255,255,255,.4)]"><Settings size={25}/></div>
       </div>
       <div className="px-1 pt-3 text-center text-[8px] font-black uppercase tracking-[.12em] text-[#8DE0EA]">ADM</div>
       <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-1.5" aria-label="Configurações">
         {items.map(({path,label,hint,icon:Icon})=><NavLink key={path} to={path} className={({isActive})=>['group flex min-h-[68px] w-full flex-col items-center justify-center gap-1 rounded-lg border text-center transition-all',isActive?'border-[#55B8C8] bg-[#17445A] text-white shadow-[0_5px_14px_rgba(0,0,0,.2)]':'border-transparent text-slate-300 hover:border-white/15 hover:bg-white/5 hover:text-white'].join(' ')}>
           <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#55B8C8] via-[#2D8DB8] to-[#17445A] text-white shadow-[0_5px_10px_rgba(0,0,0,.32),inset_0_1px_1px_rgba(255,255,255,.35)]"><Icon size={16} strokeWidth={2.5}/></span>
           <span className="text-[9px] font-black leading-none">{label}</span>
           <span className="text-[7px] font-semibold leading-none text-white/55">{hint}</span>
         </NavLink>)}
       </nav>
       <button type="button" onClick={()=>navigate('/erp-industrial')} className="mb-2 flex min-h-[56px] flex-col items-center justify-center gap-1 border-t border-white/10 text-white/80 hover:bg-white/5 hover:text-white">
         <span className="text-[14px]">⌂</span><span className="text-[8px] font-black">INÍCIO</span>
       </button>
     </aside>
     <main className="min-w-0 flex-1 overflow-y-auto">
       <div className="mx-auto max-w-[1600px] p-4 md:p-6 lg:p-7">
         <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
           <div><span className="text-[9px] font-black uppercase tracking-[.16em] text-[#176487]">ADMINISTRAÇÃO • CONFIGURAÇÕES</span><h1 className="mt-1 text-xl font-black tracking-tight text-[#123B50]">{active?.label??'Central de Configurações'}</h1></div>
           <div className="rounded-lg border border-[#C5DEE6] bg-white px-3 py-2 text-right"><span className="block text-[8px] font-black uppercase tracking-[.12em] text-slate-400">USUÁRIO</span><strong className="text-[10px] font-black text-[#123B50]">{profile?.nome||'Usuário ERP'}</strong></div>
         </div>
         {renderContent()}
       </div>
     </main>
   </div>
 </div>
}

function Welcome(){
 return <section className="flex min-h-[620px] items-center justify-center rounded-2xl border border-[#C5DEE6] bg-white shadow-[0_12px_30px_rgba(18,59,80,.12)]">
   <div className="max-w-xl px-8 text-center">
     <div className="mx-auto mb-7 flex h-32 w-[310px] items-center justify-center rounded-3xl border border-[#D7EAF0] bg-white p-5 shadow-[0_16px_36px_rgba(18,59,80,.14)]">
       <img src="/logo/sgq-erp.png" alt="SGQ ERP Industrial" className="max-h-full max-w-full object-contain"/>
     </div>
     <span className="text-[9px] font-black uppercase tracking-[.22em] text-[#2D8DB8]">SGQ ERP INDUSTRIAL</span>
     <h2 className="mt-2 text-2xl font-black text-[#123B50]">Configurações Administrativas</h2>
     <p className="mx-auto mt-3 max-w-lg text-[11px] font-semibold leading-5 text-slate-500">Você entrou na área de configurações. O painel central permanece limpo até que uma função seja escolhida no menu lateral. Clique em um item à esquerda para abrir somente a tela operacional correspondente.</p>
   </div>
 </section>
}
