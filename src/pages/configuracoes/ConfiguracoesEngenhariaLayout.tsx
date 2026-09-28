import { NavLink, useLocation } from 'react-router-dom'
import { Database, ShieldCheck, Users, FileText, HardDrive, Settings, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

const items = [
  ['/configuracoes-adm/codificacao','Codificação e Áreas',Database],
  ['/configuracoes-adm/permissoes','Controle de Permissões',ShieldCheck],
  ['/configuracoes-adm/perfis','Perfis de Usuários',Users],
  ['/configuracoes-adm/logs','Logs do Sistema',FileText],
  ['/configuracoes-adm/backups','Backups Supabase',HardDrive],
] as const

export default function ConfiguracoesEngenhariaLayout({children,title,subtitle}:{children:ReactNode;title:string;subtitle:string}){
 const location=useLocation()
 return (
  <div className="min-h-screen bg-[#F4F7FA] text-[#123B50] flex overflow-hidden">
   <aside className="w-[286px] shrink-0 h-screen bg-white border-r border-[#D8E5EA] flex flex-col shadow-[4px_0_18px_rgba(18,59,80,.06)]">
    <div className="h-[92px] px-6 flex items-center border-b border-[#E3EDF0]">
     <div className="h-11 w-11 rounded-xl bg-[#123B50] text-white grid place-items-center mr-3"><Settings size={22}/></div>
     <div><div className="text-[10px] font-black tracking-[.18em] uppercase text-[#2D8DB8]">SGQ ERP INDUSTRIAL</div><div className="text-lg font-black leading-tight">CONFIGURAÇÕES</div></div>
    </div>
    <div className="px-5 pt-6 pb-3 text-[10px] font-black tracking-[.16em] uppercase text-slate-400">Administração do sistema</div>
    <nav className="px-3 space-y-1.5 flex-1 overflow-y-auto">
     {items.map(([to,label,Icon])=>(
      <NavLink key={to} to={to} className={({isActive}) =>
       'group flex items-center gap-3 min-h-[48px] rounded-xl px-4 text-[13px] font-extrabold transition-all ' +
       (isActive ? 'bg-[#2D8DB8] text-white shadow-md' : 'text-[#345564] hover:bg-[#F0F8FB] hover:text-[#123B50]')
      }>
       <Icon size={19}/><span className="flex-1">{label}</span><ChevronRight size={15} className="opacity-60"/>
      </NavLink>
     ))}
    </nav>
    <div className="m-4 rounded-xl border border-[#D8E5EA] bg-[#F4FBFD] p-3">
      <div className="flex items-center gap-2 text-[11px] font-black text-[#123B50]"><span className="h-2.5 w-2.5 rounded-full bg-[#3A9D78]"/> SUPABASE CONECTADO</div>
      <div className="mt-1 text-[10px] text-slate-500">Ambiente empresarial protegido</div>
    </div>
   </aside>
   <main className="min-w-0 flex-1 h-screen overflow-y-auto">
    <div className="max-w-[1500px] mx-auto px-7 py-7 lg:px-9">
     <header className="mb-6 flex items-start justify-between gap-6 border-b border-[#DCE8EC] pb-5">
      <div>
       <div className="text-[10px] font-black uppercase tracking-[.2em] text-[#2D8DB8]">Configurações / Administração</div>
       <h1 className="mt-1 text-[28px] font-black tracking-tight text-[#123B50]">{title}</h1>
       <p className="mt-1 max-w-4xl text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="hidden md:flex items-center gap-2 rounded-xl border border-[#D8E5EA] bg-white px-4 py-3 text-xs font-bold text-slate-500">
       <span className="h-2 w-2 rounded-full bg-[#3A9D78]"/> Configuração ativa
      </div>
     </header>
     {children}
    </div>
   </main>
  </div>
 )
}
