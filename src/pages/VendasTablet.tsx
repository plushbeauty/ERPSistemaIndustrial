import { useEffect, useState } from 'react'
import { ArrowLeft, BarChart3, Boxes, Calculator, ClipboardList, FilePlus2, FileText, Handshake, Landmark, PackageCheck, Receipt, RefreshCw, Settings, ShoppingCart, Tags, Truck, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import '../styles/synqra-tablet.css'

type Profile = { nome: string | null; perfil: string | null }
type SalesModule = { key: string; label: string; route: string; Icon: typeof ShoppingCart }
const SALES_MODULES: readonly SalesModule[] = [
 {key:'dashboard',label:'Dashboard',route:'/vendas/dashboard',Icon:BarChart3},{key:'pedidos',label:'Pedidos de venda',route:'/vendas/pedidos',Icon:ClipboardList},{key:'novo',label:'Novo pedido',route:'/vendas/novo-pedido',Icon:FilePlus2},{key:'pdv',label:'PDV',route:'/vendas/pdv',Icon:ShoppingCart},{key:'carteira',label:'Carteira',route:'/vendas/carteira',Icon:Handshake},{key:'status',label:'Status dos pedidos',route:'/vendas/status',Icon:PackageCheck},{key:'clientes',label:'Clientes',route:'/vendas/clientes',Icon:Users},{key:'produtos',label:'Produtos',route:'/vendas/produtos',Icon:Boxes},{key:'estoque',label:'Estoque',route:'/vendas/estoque',Icon:Boxes},{key:'orcamentos',label:'Orçamentos',route:'/vendas/orcamentos',Icon:FilePlus2},{key:'custos',label:'Análise de custos',route:'/vendas/analise-custos',Icon:Calculator},{key:'catalogo',label:'Catálogo digital',route:'/vendas/catalogo-digital',Icon:Tags},{key:'metas',label:'Metas',route:'/vendas/metas',Icon:BarChart3},{key:'graficos',label:'Dashboard gráfico',route:'/vendas/dashboard-graficos',Icon:BarChart3},{key:'relatorios',label:'Relatórios',route:'/vendas/relatorios',Icon:FileText},{key:'reajuste',label:'Tabela de preços',route:'/vendas/reajuste',Icon:Tags},{key:'expedicao',label:'Expedição',route:'/vendas/expedicao',Icon:Truck},{key:'fiscal',label:'Fiscal',route:'/vendas/fiscal',Icon:Receipt},{key:'financeiro',label:'Financeiro',route:'/vendas/fluxo-caixa',Icon:Landmark},{key:'configuracoes',label:'Configurações',route:'/vendas/configuracoes',Icon:Settings}
]
async function profile(): Promise<Profile | null> {
 const auth=await supabase.auth.getUser(); if(auth.error) throw auth.error
 if(!auth.data.user){window.location.assign('/login?returnTo=/vendas/tablet');return null}
 const r=await supabase.from('erp_usuarios').select('nome,perfil').eq('auth_user_id',auth.data.user.id).eq('ativo',true).is('deleted_at',null).maybeSingle()
 if(r.error) throw r.error
 return r.data?{nome:r.data.nome??'Usuário',perfil:r.data.perfil??''}:null
}
export default function VendasTablet(){
 const navigate=useNavigate();const[p,setP]=useState<Profile|null>(null);const[now,setNow]=useState(()=>new Date());const[error,setError]=useState('')
 useEffect(()=>{const t=window.setInterval(()=>setNow(new Date()),1000);void profile().then(setP).catch(e=>setError(e instanceof Error?e.message:String(e)));return()=>window.clearInterval(t)},[])
 const logout=async()=>{const r=await supabase.auth.signOut();if(r.error){setError(r.error.message);return}window.location.assign('/login')}
 return <main className="sales-tablet">
  <header className="tablet-header"><div className="tablet-brand"><button type="button" className="tablet-back" onClick={()=>navigate('/tablet/dashboard')} aria-label="Voltar"><ArrowLeft size={15}/></button><div><strong>VENDAS</strong><span>MENU OPERACIONAL</span></div></div><div className="tablet-user"><div><strong>{p?.nome??'Usuário'}</strong><span>{p?.perfil||'Perfil'} · {now.toLocaleDateString('pt-BR')} · {now.toLocaleTimeString('pt-BR')}</span></div><button type="button" onClick={()=>void logout()}>SAIR</button></div></header>
  <section className="tablet-bar sales-bar"><div><span>TABLET / VENDAS</span><h1>MENU VENDAS</h1></div><button type="button" className="tablet-refresh" onClick={()=>window.location.reload()}><RefreshCw size={13}/> ATUALIZAR</button></section>
  {error&&<div className="tablet-error">{error}</div>}
  <section className="sales-grid">{SALES_MODULES.map(({key,label,route,Icon})=><button key={key} type="button" className="sales-card" onClick={()=>navigate(route)}><span className="tablet-icon"><Icon size={32} strokeWidth={1.7}/></span><strong>{label}</strong></button>)}</section>
  <footer className="tablet-footer"><strong>VENDAS</strong><span>ERP & SGQ INDUSTRIAL</span><span>{SALES_MODULES.length} FUNÇÕES</span></footer>
 </main>
}