import { useEffect, useMemo, useState, type ComponentType } from 'react'
import {
  BarChart3, Bell, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck,
  ClipboardList, FileCheck2, FileText, Factory, Gauge, Headphones, Home,
  Landmark, Leaf, LogOut, PackageCheck, PackageSearch, Search, Settings,
  ShieldCheck, ShoppingCart, Truck, UserCircle, Users, Wrench, X,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Profile = { nome: string | null; perfil: string | null }
type TabletModule = {
  key: string
  label: string
  icon: string
  route?: string
  Icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
}

const MODULES: TabletModule[] = [
  { key:'inicio', label:'INÍCIO', icon:'inicio', route:'/comercial', Icon:Home },
  { key:'dashboard', label:'DASHBOARD', icon:'dashboard', route:'/erp-industrial', Icon:BarChart3 },
  { key:'vendas', label:'VENDAS', icon:'vendas', route:'/vendas', Icon:ShoppingCart },
  { key:'compras', label:'COMPRAS', icon:'compras', route:'/compras/rfq', Icon:Truck },
  { key:'financeiro', label:'FINANCEIRO', icon:'financeiro', route:'/financeiro/custo-padrao', Icon:Landmark },
  { key:'rh', label:'RH', icon:'rh', route:'/rh', Icon:Users },
  { key:'administracao', label:'ADMINISTRAÇÃO', icon:'administracao', route:'/usuarios-admin', Icon:Settings },
  { key:'pcp', label:'PCP', icon:'pcp', route:'/pcp', Icon:Factory },
  { key:'qualidade', label:'QUALIDADE', icon:'qualidade', route:'/qualidade', Icon:CheckCircle2 },
  { key:'estoque', label:'ESTOQUE', icon:'estoque', route:'/estoque', Icon:PackageCheck },
  { key:'logistica', label:'LOGÍSTICA', icon:'logistica', route:'/expedicao/roteirizacao', Icon:Truck },
  { key:'manutencao', label:'MANUTENÇÃO', icon:'manutencao', route:'/manutencao/ordens', Icon:Wrench },
  { key:'maquinas', label:'MÁQUINAS E EQUIPAMENTOS', icon:'maquinas', route:'/manutencao/ordens', Icon:Wrench },
  { key:'materiais', label:'CONTROLE DE MATERIAIS', icon:'materiais', route:'/pcp/materiais', Icon:PackageSearch },
  { key:'projetos', label:'PROJETOS', icon:'projetos', route:'/engenharia', Icon:ClipboardList },
  { key:'documentos', label:'DOCUMENTOS', icon:'documentos', route:'/documentos-qualidade', Icon:FileText },
  { key:'relatorios', label:'RELATÓRIOS', icon:'relatorios', route:'/vendas/relatorios', Icon:FileText },
  { key:'treinamentos', label:'TREINAMENTOS', icon:'treinamentos', Icon:BookOpen },
  { key:'seguranca', label:'SEGURANÇA DO TRABALHO', icon:'seguranca', Icon:ShieldCheck },
  { key:'meio-ambiente', label:'MEIO AMBIENTE', icon:'meio_ambiente', Icon:Leaf },
  { key:'ti', label:'TI', icon:'ti', Icon:Settings },
  { key:'fornecedores', label:'FORNECEDORES', icon:'fornecedores', route:'/fornecedores', Icon:Truck },
  { key:'clientes', label:'CLIENTES', icon:'clientes', route:'/clientes', Icon:Users },
  { key:'suporte', label:'SUPORTE', icon:'suporte', route:'/ajuda', Icon:Headphones },
  { key:'notificacoes', label:'NOTIFICAÇÕES', icon:'notificacoes', Icon:Bell },
  { key:'agenda', label:'AGENDA', icon:'agenda', Icon:CalendarDays },
  { key:'aprovacoes', label:'APROVAÇÕES', icon:'aprovacoes', Icon:FileCheck2 },
  { key:'auditorias', label:'AUDITORIAS', icon:'auditorias', route:'/qualidade/auditoria-5s', Icon:ClipboardCheck },
  { key:'planejamento', label:'PLANEJAMENTO', icon:'planejamento', route:'/pcp/planejamento', Icon:CalendarDays },
  { key:'indicadores', label:'INDICADORES', icon:'indicadores', route:'/pcp/dashboard-oee', Icon:Gauge },
  { key:'configuracoes', label:'CONFIGURAÇÕES', icon:'configuracoes', route:'/configuracoes-adm', Icon:Settings },
  { key:'perfil', label:'PERFIL', icon:'perfil', route:'/usuarios', Icon:UserCircle },
]

const tabletIconAssets = import.meta.glob(
  '../assets/icones-tablet/*.{svg,png,webp,jpg,jpeg}',
  { eager:true, import:'default', query:'?url' },
) as Record<string,string>

function normalize(value:string){
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')
}
function resolveIcon(name:string){
  const wanted=normalize(name)
  return Object.entries(tabletIconAssets).find(([path])=>{
    const file=normalize(path.split('/').pop()?.replace(/\.[^.]+$/,'')??'')
    return file===wanted||file.startsWith(wanted+'_')||file.startsWith(wanted+'-')
  })?.[1]
}
async function loadProfile():Promise<Profile|null>{
  const auth=await supabase.auth.getUser()
  if(!auth.data.user){window.location.href='/login?returnTo=/tablet/dashboard';return null}
  const result=await supabase.from('erp_usuarios').select('nome,perfil').eq('auth_user_id',auth.data.user.id).eq('ativo',true).is('deleted_at',null).maybeSingle()
  if(result.error)throw result.error
  return result.data?{nome:result.data.nome??'Usuário',perfil:result.data.perfil??''}:null
}

export default function TabletDashboard(){
  const[profile,setProfile]=useState<Profile|null>(null)
  const[now,setNow]=useState(new Date())
  const[search,setSearch]=useState('')
  const[error,setError]=useState('')
  useEffect(()=>{const timer=window.setInterval(()=>setNow(new Date()),1000);return()=>window.clearInterval(timer)},[])
  useEffect(()=>{void loadProfile().then(setProfile).catch((reason:unknown)=>setError(reason instanceof Error?reason.message:String(reason)))},[])
  const filteredModules=useMemo(()=>{
    const term=normalize(search.trim())
    return term?MODULES.filter(module=>normalize(module.label).includes(term)):MODULES
  },[search])
  const logout=async()=>{await supabase.auth.signOut();window.location.href='/login'}

  return <main className="synqra-tablet">
    <header className="synqra-tablet-header">
      <div className="synqra-brand">
        <img src="/logo/sgq-erp.png" alt="SYNQRA ERP & SGQ INDUSTRIAL"/>
        <div className="synqra-brand-copy"><strong>ERP & SGQ INDUSTRIAL</strong><span>MAIS CONTROLE<br/>PARA O SEU RESULTADO</span></div>
      </div>
      <div className="synqra-session">
        <div className="synqra-session-text"><strong>{profile?.nome??'Usuário'}</strong><span>{profile?.perfil||'Perfil'}</span><time>{now.toLocaleDateString('pt-BR')} • {now.toLocaleTimeString('pt-BR')}</time></div>
        <button type="button" className="synqra-logout" onClick={()=>void logout()}><LogOut size={15}/> SAIR</button>
      </div>
    </header>

    <section className="synqra-tablet-toolbar">
      <div><span className="synqra-eyebrow">CENTRO DE COMANDO</span><h1>TABLET OPERACIONAL</h1></div>
      <label className="synqra-search"><Search size={15}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Pesquisar módulo" aria-label="Pesquisar módulo"/>{search&&<button type="button" aria-label="Limpar pesquisa" onClick={()=>setSearch('')}><X size={14}/></button>}</label>
    </section>

    {error&&<div className="synqra-tablet-error">{error}</div>}

    <section className="synqra-module-grid" aria-label="Módulos do ERP">
      {filteredModules.map(module=>{
        const asset=resolveIcon(module.icon)
        const Icon=module.Icon
        const available=Boolean(module.route)
        return <button key={module.key} type="button" className="synqra-module-card" disabled={!available} title={available?module.label:'Módulo ainda não possui rota operacional no ERP'} onClick={()=>{if(module.route)window.location.href=module.route}}>
          <span className="synqra-module-icon" aria-hidden="true">{asset?<img src={asset} alt=""/>:<Icon size={52} strokeWidth={1.8}/>}</span>
          <span className="synqra-module-label">{module.label}</span>
          {!available&&<span className="synqra-module-status">EM IMPLANTAÇÃO</span>}
        </button>
      })}
    </section>

    <footer className="synqra-tablet-footer"><span>SYSNQRA</span><span>ERP & SGQ INDUSTRIAL</span><span>{MODULES.filter(module=>module.route).length} módulos com rota operacional</span><span>{MODULES.filter(module=>!module.route).length} módulos a implementar</span></footer>

    <style>{`
      .synqra-tablet{min-height:100vh;padding:28px 38px 22px;background:#fff;color:#123b50;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
      .synqra-tablet-header{width:min(1440px,100%);margin:0 auto 20px;display:flex;align-items:center;justify-content:center;gap:28px}
      .synqra-brand{display:flex;align-items:center;justify-content:center;gap:24px;min-width:0}
      .synqra-brand img{width:min(560px,58vw);max-height:155px;object-fit:contain}
      .synqra-brand-copy{border-left:2px solid #39c4ef;padding-left:28px;display:grid;gap:6px;min-width:190px}
      .synqra-brand-copy strong{font-size:14px;letter-spacing:.16em;color:#164b91}
      .synqra-brand-copy span{font-size:11px;line-height:1.55;letter-spacing:.22em;color:#164b91;max-width:230px}
      .synqra-session{position:absolute;right:38px;top:26px;display:flex;align-items:center;gap:10px}
      .synqra-session-text{display:grid;text-align:right;gap:2px;font-size:10px}
      .synqra-session-text strong{font-size:11px}.synqra-session-text span,.synqra-session-text time{color:#64748b}
      .synqra-logout{height:30px;display:inline-flex;align-items:center;gap:5px;padding:0 10px;border:1px solid #c9e5ee;border-radius:7px;background:#fff;color:#164b91;font-size:10px;font-weight:900}
      .synqra-tablet-toolbar{width:min(1440px,100%);margin:0 auto 14px;display:flex;align-items:end;justify-content:space-between;gap:16px}
      .synqra-eyebrow{font-size:9px;letter-spacing:.16em;font-weight:900;color:#2d8db8}
      .synqra-tablet-toolbar h1{margin:2px 0 0;font-size:18px;letter-spacing:.06em;color:#123b50}
      .synqra-search{width:260px;height:32px;display:flex;align-items:center;gap:7px;padding:0 8px;border:1px solid #c9e5ee;border-radius:7px;background:#f7fcfe;color:#2d8db8}
      .synqra-search input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:#123b50;font-size:11px}
      .synqra-search button{width:20px;height:20px;min-height:20px;display:grid;place-items:center;border:0;background:transparent;color:#64748b}
      .synqra-module-grid{width:min(1440px,100%);margin:0 auto;display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:18px 20px}
      .synqra-module-card{position:relative;min-width:0;aspect-ratio:1/1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:12px 8px 10px;border:1px solid #8fd8f1;border-radius:14px;background:linear-gradient(180deg,#fbfdff 0%,#edf7fc 100%);box-shadow:0 2px 7px rgba(18,59,80,.08);color:#123b50;cursor:pointer;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease}
      .synqra-module-card:hover:not(:disabled){transform:translateY(-2px);border-color:#2d8db8;box-shadow:0 7px 18px rgba(45,141,184,.16)}
      .synqra-module-card:disabled{cursor:not-allowed;opacity:.58}
      .synqra-module-icon{width:68px;height:68px;display:grid;place-items:center;color:#0569c8}.synqra-module-icon img{width:68px;height:68px;object-fit:contain}
      .synqra-module-label{max-width:96%;font-size:11px;line-height:1.12;font-weight:900;letter-spacing:.015em;text-align:center;color:#164b91}
      .synqra-module-status{position:absolute;bottom:7px;font-size:7px;font-weight:900;letter-spacing:.04em;color:#b45309}
      .synqra-tablet-error{width:min(1440px,100%);margin:0 auto 12px;padding:8px 10px;border:1px solid #fecaca;border-radius:7px;background:#fff1f2;color:#991b1b;font-size:10px;font-weight:700}
      .synqra-tablet-footer{width:min(1440px,100%);margin:18px auto 0;padding-top:10px;display:flex;flex-wrap:wrap;justify-content:center;gap:6px 16px;border-top:1px solid #d9edf4;color:#6b7f8a;font-size:9px;font-weight:700}
      .synqra-tablet-footer span:first-child{color:#164b91;font-weight:900}
      @media(max-width:1200px){.synqra-module-grid{grid-template-columns:repeat(6,minmax(0,1fr))}.synqra-session{position:static}.synqra-tablet-header{flex-direction:column}}
      @media(max-width:800px){.synqra-tablet{padding:18px}.synqra-module-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.synqra-module-icon,.synqra-module-icon img{width:48px;height:48px}.synqra-module-label{font-size:9px}.synqra-tablet-toolbar{align-items:stretch;flex-direction:column}.synqra-search{width:100%}.synqra-brand{flex-direction:column;gap:8px}.synqra-brand img{width:min(520px,90vw)}.synqra-brand-copy{border-left:0;border-top:1px solid #39c4ef;padding:7px 0 0;text-align:center}}
      @media(max-width:520px){.synqra-module-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.synqra-module-card{min-height:130px}}
    `}</style>
  </main>
}
