import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { LogIn, Palette, Wifi, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type ThemeName = 'blue' | 'green' | 'gray'
const themeClasses: Record<ThemeName,string> = {
  blue: 'bg-sky-600 hover:bg-sky-500',
  green: 'bg-emerald-600 hover:bg-emerald-500',
  gray: 'bg-slate-600 hover:bg-slate-500',
}

export default function TabletHome() {
  const [theme,setTheme]=useState<ThemeName>(() => (localStorage.getItem('erp-tablet-theme') as ThemeName) || 'blue')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [now,setNow]=useState(new Date())
  useEffect(()=>{const id=window.setInterval(()=>setNow(new Date()),1000);return()=>window.clearInterval(id)},[])
  useEffect(()=>{localStorage.setItem('erp-tablet-theme',theme);document.documentElement.dataset.tabletTheme=theme},[theme])
  const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError('');const {error:authError}=await supabase.auth.signInWithPassword({email,password});if(authError)setError(authError.message);else location.href='/tablet/dashboard';setBusy(false)}
  return <main className="min-h-screen bg-slate-900 text-slate-100" data-tablet-theme={theme}>
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 lg:px-8"><div className="text-base font-black">📅 {now.toLocaleDateString('pt-BR')} • 🕒 {now.toLocaleTimeString('pt-BR')}</div><div className="text-xl font-black tracking-wide">SISTEMA ERP INDUSTRIAL PREMIUM</div><label className="flex items-center gap-2 text-sm font-black"><Palette size={18}/><span>TEMA</span><select value={theme} onChange={e=>setTheme(e.target.value as ThemeName)} className="h-11 rounded-md border border-slate-600 bg-slate-800 px-3 font-black text-white"><option value="blue">Azul Industrial</option><option value="green">Verde Produção</option><option value="gray">Cinza Escuro</option></select></label></header>
    <section className="mx-auto flex min-h-[calc(100vh-124px)] max-w-4xl flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl rounded-lg border border-slate-700 bg-slate-800 p-6 text-center shadow-2xl sm:p-10"><div className="mx-auto flex h-24 items-center justify-center rounded-md border border-slate-600 bg-white p-3 sm:h-32"><img src="/logo-industrial.svg" alt="Logo da empresa" className="h-full max-w-full object-contain"/></div><h1 className="mt-6 text-2xl font-black">ERP INDUSTRIAL V2</h1><p className="mt-2 text-base font-bold text-slate-300">ACESSO RESTRITO AO TERMINAL DO TABLET</p><form onSubmit={submit} className="mx-auto mt-7 max-w-xl space-y-5 text-left"><label className="block text-base font-black">Usuário / E-mail<input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="username" required className="mt-2 h-14 w-full rounded-md border border-slate-300 bg-white px-4 text-base font-semibold text-slate-900"/></label><label className="block text-base font-black">Senha de Acesso<input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="current-password" required className="mt-2 h-14 w-full rounded-md border border-slate-300 bg-white px-4 text-base font-semibold text-slate-900"/></label>{error&&<div className="rounded-md border border-rose-400 bg-rose-950/40 p-3 font-bold text-rose-200">{error}</div>}<button disabled={busy} className={`h-14 w-full rounded-md px-5 text-lg font-black text-white shadow-lg ${themeClasses[theme]}`}><LogIn size={21} className="mr-2 inline"/>{busy?'AUTENTICANDO...':'ENTRAR NO OPERACIONAL'}</button></form></div></section>
    <footer className="border-t border-slate-700 px-4 py-3 text-center text-sm font-semibold text-slate-400"><Wifi size={16} className="mr-1 inline text-emerald-400"/> Status: autenticação Supabase • Estação: TABLET</footer>
    <button type="button" aria-label="Fechar" onClick={()=>location.href='/erp-industrial'} className="fixed right-3 top-3 rounded-md bg-rose-600 px-4 py-2 font-black text-white shadow-lg"><X size={24}/></button>
  </main>
}
