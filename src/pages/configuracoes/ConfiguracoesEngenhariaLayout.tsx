import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Database, ShieldCheck, Users, FileText, HardDrive, ChevronRight, User, LogOut } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

const items=[['/configuracoes-adm/codificacao','Codificação e Áreas',Database],['/configuracoes-adm/permissoes','Controle de Permissões',ShieldCheck],['/configuracoes-adm/perfis','Perfis de Usuários',Users],['/configuracoes-adm/logs','Logs do Sistema',FileText],['/configuracoes-adm/backups','Backups do Banco',HardDrive]] as const

export default function ConfiguracoesEngenhariaLayout({children,title,subtitle}:{children:ReactNode;title:string;subtitle:string}){
 const location=useLocation();const [operator,setOperator]=useState('Administrador');const [clock,setClock]=useState(new Date())
 useEffect(()=>{let alive=true;void (async()=>{const {data:u}=await supabase.auth.getUser();if(!alive||!u.user)return;const {data:p}=await supabase.from('erp_usuarios').select('nome').eq('auth_user_id',u.user.id).eq('ativo',true).is('deleted_at',null).maybeSingle();if(alive&&p?.nome)setOperator(p.nome)})();const t=window.setInterval(()=>setClock(new Date()),1000);return()=>{alive=false;window.clearInterval(t)}},[])
 const active=items.find(([to])=>location.pathname===to)?.[1]??title
 return <div className="flex min-h-screen bg-[#F4F7FE] text-slate-800 font-sans antialiased">
  <aside className="fixed z-30 flex h-full w-64 flex-col border-r border-slate-800 bg-slate-900 text-slate-300 shadow-2xl">
   <div className="flex items-center space-x-3 border-b border-slate-800 p-6"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-900 text-sm font-black text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)]">SQ</div><div><span className="block text-base font-black tracking-tight text-white">SGQERP</span><span className="block -mt-1 text-[10px] font-bold uppercase tracking-widest text-cyan-400">Industrial</span></div></div>
   <div className="p-4 pb-3 pl-6 pt-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">Administração</div>
   <nav className="flex-1 space-y-1 overflow-y-auto px-4">{items.map(([to,label,Icon])=><NavLink key={to} to={to} className={({isActive})=>'group flex items-center justify-between rounded-xl border p-3 font-semibold transition-all '+(isActive?'border-blue-400/30 bg-blue-600 text-white font-bold shadow-lg shadow-blue-950/30':'border-transparent text-slate-300 hover:bg-slate-800 hover:text-white')}><span className="flex items-center space-x-3"><Icon className="h-4 w-4 text-current"/><span>{label}</span></span><ChevronRight className="h-3.5 w-3.5 opacity-80"/></NavLink>)}</nav>
   <div className="flex items-center justify-between border-t border-slate-800 p-4 pl-6 font-mono text-[10px] text-slate-400"><span>SUPABASE CONNECTED</span><span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"/></div>
  </aside>
  <div className="ml-64 flex min-h-screen min-w-0 flex-1 flex-col">
   <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/60 bg-white/90 px-8 py-4 shadow-sm backdrop-blur-md"><div className="flex items-center space-x-2 text-sm font-bold text-slate-400"><span>Dashboard</span><ChevronRight className="h-3.5 w-3.5"/><span className="text-slate-800">{active}</span></div><div className="flex items-center space-x-4"><div className="hidden text-right text-[10px] font-bold leading-tight text-slate-400 lg:block"><div>{clock.toLocaleDateString('pt-BR')}</div><div>{clock.toLocaleTimeString('pt-BR')}</div></div><div className="flex items-center space-x-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500"><User className="h-3.5 w-3.5 text-blue-900"/><span>Operador: <strong className="text-slate-700">{operator}</strong></span></div><button type="button" title="Sair" onClick={()=>void supabase.auth.signOut()} className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-red-500"><LogOut className="h-4 w-4"/></button></div></header>
   <main className="flex-1 overflow-y-auto p-8"><div className="mx-auto max-w-[1500px]"><div className="mb-6 border-b border-slate-200/60 pb-4"><h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1><p className="mt-1 text-xs font-medium text-slate-400">{subtitle}</p></div>{children}</div></main>
  </div>
 </div>
}
