import { ArrowLeft, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import synqraLogo from '../assets/synqra/logo-synqra.png'
import { sections } from './VendasLayout'

export default function VendasTablet() {
 const navigate=useNavigate()
 const logout=async()=>{await supabase.auth.signOut();navigate('/login')}
 return <div className="min-h-screen bg-[#F4F7FE] text-[#123B50]">
  <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-slate-300 bg-white px-3">
   <div className="flex items-center gap-2"><img src={synqraLogo} alt="SYNQRA" className="h-8 w-auto object-contain"/><div><div className="text-[10px] font-medium text-[#2D8DB8]">VENDAS</div><div className="text-[11px] font-medium">TABLET DE VENDAS</div></div></div>
   <div className="flex items-center gap-1"><button type="button" onClick={()=>navigate('/vendas')} className="flex h-8 items-center gap-1 border border-slate-300 bg-white px-2 text-[10px]" title="Voltar"><ArrowLeft size={13}/>Voltar</button><button type="button" onClick={()=>void logout()} className="flex h-8 items-center gap-1 border border-slate-300 bg-white px-2 text-[10px]" title="Sair"><LogOut size={13}/>Sair</button></div>
  </header>
  <main className="mx-auto max-w-[1400px] p-3">
   <div className="mb-3 grid grid-cols-2 gap-1.5 md:grid-cols-3 xl:grid-cols-6">
    {[['Atrasados','41','bg-red-50 border-red-300 text-red-700'],['Produção','0','bg-orange-50 border-orange-300 text-orange-700'],['Acabamento','0','bg-yellow-50 border-yellow-300 text-yellow-700'],['Almoxarifado','0','bg-blue-50 border-blue-300 text-blue-700'],['Liberado NF','0','bg-cyan-50 border-cyan-300 text-cyan-700'],['Total pendente','50','bg-slate-50 border-slate-300 text-[#123B50]']].map(([label,value,tone])=><div key={label} className={`border px-2.5 py-2 ${tone}`}><span className="block text-[8px] uppercase tracking-wide">{label}</span><strong className="block text-[17px] leading-5 font-medium">{value}</strong></div>)}
   </div>
   <section className="border border-slate-300 bg-white p-3">
    <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-[#2D8DB8]">Módulos de Vendas</div>
    {sections.map(section=><div key={section.label} className="mb-3"><div className="mb-1 border-b border-slate-200 pb-1 text-[9px] font-medium uppercase tracking-wide text-slate-500">{section.label}</div><div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">{section.items.map(item=>{const Icon=item.icon;return <button key={item.href} type="button" onClick={()=>navigate(item.href)} className="flex h-14 items-center gap-2 border border-slate-300 bg-white px-2 text-left text-[10px] text-slate-700 hover:border-[#2D8DB8] hover:bg-[#F4FBFD]" title={item.label}><span className="flex h-7 w-7 shrink-0 items-center justify-center border border-slate-200 bg-[#F4FBFD] text-[#2D8DB8]"><Icon size={15} strokeWidth={1.8}/></span><span className="leading-tight">{item.label}</span></button>})}</div></div>)}
   </section>
  </main>
  <style>{`.vendas-tablet button{border-radius:2px}.vendas-tablet strong{font-weight:500}`}</style>
 </div>
}
