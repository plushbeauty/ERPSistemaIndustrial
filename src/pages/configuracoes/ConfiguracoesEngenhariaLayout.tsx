import { NavLink } from 'react-router-dom'
import { Database, ShieldCheck, Users, FileText, HardDrive } from 'lucide-react'
import type { ReactNode } from 'react'

const items = [
  ['/configuracoes-adm/codificacao','Codificação e Áreas',Database],
  ['/configuracoes-adm/permissoes','Controle de Permissões',ShieldCheck],
  ['/configuracoes-adm/perfis','Perfis de Usuários',Users],
  ['/configuracoes-adm/logs','Logs do Sistema',FileText],
  ['/configuracoes-adm/backups','Backups do Banco',HardDrive],
] as const

export default function ConfiguracoesEngenhariaLayout({children,title,subtitle}:{children:ReactNode;title:string;subtitle:string}){
 return <div className='min-h-screen bg-[#F4F7FE] text-slate-800 flex'>
  <aside className='w-[270px] shrink-0 min-h-screen bg-[#123B50] text-white border-r border-[#2D8DB8]/30 flex flex-col'>
   <div className='px-6 py-6 border-b border-white/10'><div className='text-[11px] font-bold tracking-[.2em] text-cyan-200 uppercase'>SGQ ERP Industrial</div><h2 className='mt-1 text-lg font-black'>Configurações Globais</h2></div>
   <nav className='p-4 space-y-2 flex-1'>{items.map(([to,label,Icon])=><NavLink key={to} to={to} className={({isActive}) => 'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ' + (isActive ? 'bg-[#2D8DB8] text-white shadow-lg' : 'text-slate-200 hover:bg-white/10')}><Icon size={18}/>{label}</NavLink>)}</nav>
   <div className='p-4 border-t border-white/10 text-[11px] text-cyan-100 flex items-center gap-2'><span className='h-2 w-2 rounded-full bg-cyan-300'/> SUPABASE CONECTADO</div>
  </aside>
  <main className='min-w-0 flex-1 p-6 lg:p-8 overflow-auto'>
   <header className='mb-6 border-b border-slate-200 pb-5'><div className='text-[11px] font-black uppercase tracking-[.18em] text-[#2D8DB8]'>Configurações / Engenharia de Cadastro</div><h1 className='mt-1 text-2xl font-black text-[#123B50]'>{title}</h1><p className='mt-1 text-sm text-slate-500'>{subtitle}</p></header>
   {children}
  </main>
 </div>
}