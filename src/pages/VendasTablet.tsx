import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  Calculator,
  ClipboardList,
  FilePlus2,
  FileText,
  Handshake,
  Landmark,
  PackageCheck,
  Receipt,
  RefreshCw,
  Settings,
  Search,
  ShoppingCart,
  Tags,
  Truck,
  Users,
  Warehouse,
  PackageOpen,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import '../styles/synqra-tablet.css'

type Profile = { nome: string | null; perfil: string | null }
type SalesItem = { key: string; label: string; route: string; Icon: typeof ShoppingCart }
type SalesSection = { label: string; items: readonly SalesItem[] }

const SALES_SECTIONS: readonly SalesSection[] = [
  { label: 'OPERAÇÃO COMERCIAL', items: [
    { key: 'dashboard', label: 'Dashboard de vendas', route: '/vendas/dashboard', Icon: BarChart3 }, { key: 'pedidos', label: 'Pedidos de venda', route: '/vendas/pedidos', Icon: ClipboardList }, { key: 'novo', label: 'Novo pedido', route: '/vendas/novo-pedido', Icon: FilePlus2 }, { key: 'pendentes', label: 'Pedidos pendentes', route: '/vendas/pendentes', Icon: PackageCheck }, { key: 'status', label: 'Status dos pedidos', route: '/vendas/status', Icon: PackageCheck }, { key: 'carteira', label: 'Carteira de pedidos', route: '/vendas/carteira', Icon: Handshake }, { key: 'pdv', label: 'PDV / venda rápida', route: '/vendas/pdv', Icon: ShoppingCart },
  ] },
  { label: 'CLIENTES E COMERCIAL', items: [
    { key: 'clientes', label: 'Clientes', route: '/vendas/clientes', Icon: Users }, { key: 'orcamentos', label: 'Orçamentos / custos', route: '/vendas/orcamentos', Icon: Calculator }, { key: 'analise-custos', label: 'Análise de custos', route: '/vendas/analise-custos', Icon: Calculator }, { key: 'metas', label: 'Metas de vendas', route: '/vendas/metas', Icon: BarChart3 }, { key: 'relatorios', label: 'Relatórios de vendas', route: '/vendas/relatorios', Icon: FileText }, { key: 'catalogo', label: 'Catálogo digital', route: '/vendas/catalogo-digital', Icon: Tags }, { key: 'catalogo-gestao', label: 'Gestão do catálogo', route: '/vendas/catalogo-digital/gestao', Icon: Tags },
  ] },
  { label: 'PRODUTOS E PREÇOS', items: [
    { key: 'produtos', label: 'Produtos de vendas', route: '/vendas/produtos', Icon: Boxes }, { key: 'estoque', label: 'Estoque', route: '/vendas/estoque', Icon: Warehouse }, { key: 'tabela-precos', label: 'Tabela de preços', route: '/vendas/reajuste', Icon: Tags },
  ] },
  { label: 'FATURAMENTO E FISCAL', items: [
    { key: 'fiscal', label: 'Fiscal / faturamento', route: '/vendas/fiscal', Icon: Receipt }, { key: 'ano-fiscal', label: 'Ano fiscal', route: '/vendas/ano-fiscal', Icon: Receipt }, { key: 'classificacao', label: 'Classificação fiscal', route: '/vendas/classificacao-fiscal', Icon: FileText }, { key: 'imprimir', label: 'Imprimir pedidos', route: '/vendas/imprimir', Icon: FileText },
  ] },
  { label: 'EXPEDIÇÃO E LOGÍSTICA', items: [
    { key: 'expedicao', label: 'Expedição', route: '/vendas/expedicao', Icon: Truck }, { key: 'materiais', label: 'Materiais', route: '/vendas/materiais', Icon: PackageOpen },
  ] },
  { label: 'FINANCEIRO COMERCIAL', items: [
    { key: 'conciliacao', label: 'Conciliação bancária', route: '/vendas/conciliacao', Icon: Landmark }, { key: 'importador', label: 'Importador bancário', route: '/vendas/importador', Icon: Landmark }, { key: 'fluxo-caixa', label: 'Fluxo de caixa', route: '/vendas/fluxo-caixa', Icon: BarChart3 }, { key: 'balanco', label: 'Balanço de estoque', route: '/vendas/balanco', Icon: Boxes }, { key: 'razao', label: 'Razão geral', route: '/vendas/razao-geral', Icon: FileText }, { key: 'auditoria', label: 'Auditoria / lucratividade', route: '/vendas/auditoria', Icon: ClipboardList },
  ] },
  { label: 'ANÁLISE E CONFIGURAÇÃO', items: [
    { key: 'graficos', label: 'Dashboard gráfico', route: '/vendas/dashboard-graficos', Icon: BarChart3 }, { key: 'configuracoes', label: 'Configurações', route: '/vendas/configuracoes', Icon: Settings },
  ] },
]

const SALES_ITEM_COUNT = SALES_SECTIONS.reduce((total, section) => total + section.items.length, 0)

async function loadProfile(): Promise<Profile | null> {
  const auth = await supabase.auth.getUser()
  if (auth.error) throw auth.error
  if (!auth.data.user) {
    window.location.assign('/login?returnTo=/vendas/tablet')
    return null
  }

  const result = await supabase
    .from('erp_usuarios')
    .select('nome,perfil')
    .eq('auth_user_id', auth.data.user.id)
    .eq('ativo', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (result.error) throw result.error
  return result.data
    ? { nome: result.data.nome ?? 'Usuário', perfil: result.data.perfil ?? '' }
    : null
}

export default function VendasTablet() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    void loadProfile().then(setProfile).catch(reason => setError(reason instanceof Error ? reason.message : String(reason)))
    return () => window.clearInterval(timer)
  }, [])
  const logout = async () => {
    const result = await supabase.auth.signOut()
    if (result.error) { setError(result.error.message); return }
    window.location.assign('/login')
  }
  const normalizedSearch = search.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
  const filteredSections = useMemo(() => SALES_SECTIONS.map(section => ({ ...section, items: normalizedSearch ? section.items.filter(item => item.label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').includes(normalizedSearch)) : section.items })).filter(section => section.items.length > 0), [normalizedSearch])
  const visibleCount = filteredSections.reduce((total, section) => total + section.items.length, 0)
  return (
    <main className="synqra-tablet synqra-sales-tablet">
      <header className="synqra-tablet-header">
        <div className="synqra-brand"><button type="button" className="synqra-sales-back" onClick={() => navigate('/tablet/dashboard')} title="Voltar ao Tablet Operacional"><ArrowLeft size={22} strokeWidth={2} /></button><div className="synqra-sales-brand-copy"><strong>MENU VENDAS</strong><span>ERP & SGQ INDUSTRIAL · CENTRAL COMERCIAL</span></div></div>
        <div className="synqra-session"><div className="synqra-session-text"><strong>{profile?.nome ?? 'Usuário'}</strong><span>{profile?.perfil || 'Perfil'}</span><time>{now.toLocaleDateString('pt-BR')} • {now.toLocaleTimeString('pt-BR')}</time></div><button type="button" className="synqra-logout" onClick={() => void logout()}>SAIR</button></div>
      </header>
      <section className="synqra-tablet-toolbar synqra-sales-toolbar"><div><span className="synqra-eyebrow">CENTRO DE COMANDO / VENDAS</span><h1>MENU VENDAS</h1></div><div className="synqra-sales-tools"><label className="synqra-search"><Search size={16} aria-hidden="true" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Pesquisar módulo de vendas" aria-label="Pesquisar módulo de vendas" /></label><button type="button" className="synqra-sales-refresh" onClick={() => window.location.reload()} title="Atualizar menu"><RefreshCw size={16} /></button></div></section>
      {error && <div className="synqra-tablet-error" role="alert">{error}</div>}
      <section className="synqra-sales-module-grid" aria-label="Todos os módulos de vendas">{filteredSections.map(section => <div className="synqra-sales-section" key={section.label}><div className="synqra-sales-section-title">{section.label}</div><div className="synqra-sales-cards">{section.items.map(({ key, label, route, Icon }) => <button key={key} type="button" className="synqra-sales-card" onClick={() => navigate(route)} title={label}><span className="synqra-sales-icon" aria-hidden="true"><Icon size={52} strokeWidth={1.8} /></span><span className="synqra-sales-label">{label}</span></button>)}</div></div>)}</section>
      <footer className="synqra-tablet-footer"><span>MENU VENDAS</span><span>ERP & SGQ INDUSTRIAL</span><span>{SALES_ITEM_COUNT} módulos de vendas</span><span>{visibleCount} visíveis</span><span className="synqra-footer-slashes" aria-hidden="true"><i /><i /><i /></span></footer>
      <style>{`
        .synqra-sales-back{display:grid;place-items:center;width:46px;height:46px;flex:0 0 auto;border:1px solid #8fd8f1;border-radius:10px;background:#edf7fc;color:#0569c8;cursor:pointer}.synqra-sales-brand-copy{display:grid;gap:5px;border-left:2px solid #39c4ef;padding-left:16px}.synqra-sales-brand-copy strong{color:#164b91;font-size:18px;font-weight:900;letter-spacing:.08em}.synqra-sales-brand-copy span{color:#64748b;font-size:9px;font-weight:800;letter-spacing:.12em}.synqra-sales-tools{display:flex;align-items:center;gap:7px}.synqra-sales-refresh{display:grid;width:34px;height:34px;place-items:center;border:1px solid #c9e5ee;border-radius:7px;background:#f7fcfe;color:#2d8db8;cursor:pointer}.synqra-sales-module-grid{position:absolute;inset:154px 0 49px;overflow:auto;padding:12px clamp(14px,3vw,38px) 24px;background:#fff}.synqra-sales-section{margin-bottom:16px}.synqra-sales-section-title{display:flex;align-items:center;gap:8px;margin-bottom:8px;color:#164b91;font-size:10px;font-weight:900;letter-spacing:.14em}.synqra-sales-section-title:after{content:"";height:1px;flex:1;background:#d9edf4}.synqra-sales-cards{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:clamp(8px,1.25vw,18px)}.synqra-sales-card{display:flex;min-width:0;aspect-ratio:1/1;flex-direction:column;align-items:center;justify-content:center;gap:9px;border:1px solid #8fd8f1;border-radius:13px;padding:10px;background:linear-gradient(180deg,#fbfdff 0%,#edf7fc 100%);box-shadow:0 2px 7px rgb(18 59 80 / 8%);color:#164b91;cursor:pointer;transition:transform .14s ease,border-color .14s ease,box-shadow .14s ease}.synqra-sales-card:hover{transform:translateY(-2px);border-color:#2d8db8;box-shadow:0 7px 18px rgb(45 141 184 / 17%)}.synqra-sales-icon{display:grid;width:68px;height:68px;place-items:center;border-radius:14px;background:linear-gradient(145deg,#f0faff,#fff);color:#0569c8}.synqra-sales-icon svg{width:76%;height:76%}.synqra-sales-label{max-width:100%;color:#164b91;font-size:11px;font-weight:900;line-height:1.15;text-align:center;text-transform:uppercase}@media(max-width:1100px){.synqra-sales-cards{grid-template-columns:repeat(6,minmax(0,1fr))}}@media(max-width:800px){.synqra-sales-brand-copy{display:none}.synqra-sales-cards{grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.synqra-sales-icon{width:52px;height:52px}.synqra-sales-label{font-size:8px}.synqra-sales-module-grid{inset:141px 0 57px;padding:10px 12px}.synqra-sales-tools{max-width:55vw}.synqra-sales-tools .synqra-search{width:100%}}
      `}</style>
    </main>
  )
}
