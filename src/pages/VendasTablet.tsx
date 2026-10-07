import { useEffect, useState } from 'react'
import { ArrowLeft, BarChart3, Boxes, Calculator, ClipboardList, FilePlus2, FileText, Handshake, Landmark, PackageCheck, Receipt, RefreshCw, Settings, ShoppingCart, Tags, Truck, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import '../styles/synqra-tablet.css'

type Profile = { nome: string | null; perfil: string | null }
type SalesModule = { key: string; label: string; description: string; route: string; Icon: typeof ShoppingCart }

const SALES_MODULES: readonly SalesModule[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'Resumo comercial e indicadores', route: '/vendas/dashboard', Icon: BarChart3 },
  { key: 'pedidos', label: 'Pedidos de venda', description: 'Carteira, status e abertura de pedidos', route: '/vendas/pedidos', Icon: ClipboardList },
  { key: 'novo', label: 'Novo pedido', description: 'Criar pedido de venda', route: '/vendas/novo-pedido', Icon: FilePlus2 },
  { key: 'pdv', label: 'PDV', description: 'Venda rápida e finalização', route: '/vendas/pdv', Icon: ShoppingCart },
  { key: 'carteira', label: 'Carteira', description: 'Pedidos e entregas comerciais', route: '/vendas/carteira', Icon: Handshake },
  { key: 'status', label: 'Status dos pedidos', description: 'Acompanhar o ciclo do pedido', route: '/vendas/status', Icon: PackageCheck },
  { key: 'clientes', label: 'Clientes', description: 'Cadastro e consulta de clientes', route: '/vendas/clientes', Icon: Users },
  { key: 'produtos', label: 'Produtos', description: 'Produtos disponíveis para venda', route: '/vendas/produtos', Icon: Boxes },
  { key: 'estoque', label: 'Estoque', description: 'Posição de estoque para vendas', route: '/vendas/estoque', Icon: Boxes },
  { key: 'orcamentos', label: 'Orçamentos', description: 'Análise e acompanhamento de propostas', route: '/vendas/orcamentos', Icon: FilePlus2 },
  { key: 'custos', label: 'Análise de custos', description: 'Custos e margem comercial', route: '/vendas/analise-custos', Icon: Calculator },
  { key: 'catalogo', label: 'Catálogo digital', description: 'Catálogo publicado e gestão', route: '/vendas/catalogo-digital', Icon: Tags },
  { key: 'metas', label: 'Metas', description: 'Metas e desempenho comercial', route: '/vendas/metas', Icon: BarChart3 },
  { key: 'graficos', label: 'Dashboard gráfico', description: 'Indicadores visuais de vendas', route: '/vendas/dashboard-graficos', Icon: BarChart3 },
  { key: 'relatorios', label: 'Relatórios', description: 'Relatórios comerciais', route: '/vendas/relatorios', Icon: FileText },
  { key: 'reajuste', label: 'Tabela de preços', description: 'Reajustes e preços de venda', route: '/vendas/reajuste', Icon: Tags },
  { key: 'expedicao', label: 'Expedição', description: 'Entrega e saída dos pedidos', route: '/vendas/expedicao', Icon: Truck },
  { key: 'fiscal', label: 'Fiscal', description: 'Operações fiscais vinculadas às vendas', route: '/vendas/fiscal', Icon: Receipt },
  { key: 'financeiro', label: 'Financeiro', description: 'Fluxo financeiro relacionado às vendas', route: '/vendas/fluxo-caixa', Icon: Landmark },
  { key: 'configuracoes', label: 'Configurações', description: 'Parâmetros do módulo de vendas', route: '/vendas/configuracoes', Icon: Settings },
]

async function loadProfile(): Promise<Profile | null> {
  const auth = await supabase.auth.getUser()
  if (auth.error) throw auth.error
  if (!auth.data.user) { window.location.assign('/login?returnTo=/vendas/tablet'); return null }
  const result = await supabase.from('erp_usuarios').select('nome,perfil').eq('auth_user_id', auth.data.user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
  if (result.error) throw result.error
  return result.data ? { nome: result.data.nome ?? 'Usuário', perfil: result.data.perfil ?? '' } : null
}

export default function VendasTablet() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [now, setNow] = useState(new Date())
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    void loadProfile().then(value => { if (alive) setProfile(value) }).catch(reason => { if (alive) setError(reason instanceof Error ? reason.message : String(reason)) })
    return () => { alive = false; window.clearInterval(timer) }
  }, [])

  const logout = async () => {
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) { setError(signOutError.message); return }
    window.location.assign('/login')
  }

  return (
    <main className="sales-tablet" aria-label="Menu do módulo de vendas">
      <header className="sales-tablet-header">
        <div className="sales-tablet-brand">
          <button type="button" className="sales-back" onClick={() => navigate('/tablet/dashboard')} title="Voltar ao Tablet Principal" aria-label="Voltar ao Tablet Principal"><ArrowLeft size={17} /></button>
          <div><span>TABLET PRINCIPAL / MÓDULO</span><strong>VENDAS</strong></div>
        </div>
        <div className="sales-tablet-session"><div><strong>{profile?.nome ?? 'Usuário'}</strong><span>{profile?.perfil || 'Perfil'} • {now.toLocaleDateString('pt-BR')} • {now.toLocaleTimeString('pt-BR')}</span></div><button type="button" className="sales-logout" onClick={() => void logout()}>SAIR</button></div>
      </header>

      <section className="sales-tablet-toolbar">
        <div><span>MENU VENDAS</span><h1>OPERAÇÃO COMERCIAL</h1></div>
        <div className="sales-toolbar-actions"><span>{SALES_MODULES.length} funções</span><button type="button" onClick={() => window.location.reload()} title="Atualizar menu"><RefreshCw size={14} /> ATUALIZAR</button></div>
      </section>

      {error && <div className="sales-tablet-error" role="alert">{error}</div>}

      <section className="sales-module-grid" aria-label="Funções do módulo de vendas">
        {SALES_MODULES.map(({ key, label, description, route, Icon }) => <button key={key} type="button" className="sales-module-card" onClick={() => navigate(route)} title={\`Abrir \${label}\`}><span className="sales-module-icon"><Icon size={30} strokeWidth={1.8} /></span><span className="sales-module-copy"><strong>{label}</strong><small>{description}</small></span></button>)}
      </section>

      <footer className="sales-tablet-footer"><span>VENDAS</span><span>ERP & SGQ INDUSTRIAL</span><span>Menu horizontal padronizado</span></footer>
    </main>
  )
}
