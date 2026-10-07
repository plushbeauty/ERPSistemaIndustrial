import { useEffect, useState } from 'react'
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
  ShoppingCart,
  Tags,
  Truck,
  Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import '../styles/synqra-tablet.css'

type Profile = { nome: string | null; perfil: string | null }
type SalesItem = { key: string; label: string; route: string; Icon: typeof ShoppingCart }
type SalesSection = { label: string; items: readonly SalesItem[] }

const SALES_SECTIONS: readonly SalesSection[] = [
  {
    label: 'OPERAÇÃO',
    items: [
      { key: 'dashboard', label: 'Dashboard', route: '/vendas', Icon: BarChart3 },
      { key: 'pedidos', label: 'Pedidos de venda', route: '/vendas/pedidos', Icon: ClipboardList },
      { key: 'novo', label: 'Novo pedido', route: '/vendas/novo-pedido', Icon: FilePlus2 },
      { key: 'pendentes', label: 'Pedidos pendentes', route: '/vendas/pendentes', Icon: PackageCheck },
      { key: 'status', label: 'Status do pedido', route: '/vendas/status', Icon: PackageCheck },
      { key: 'carteira', label: 'Carteira', route: '/vendas/carteira', Icon: Handshake },
    ],
  },
  {
    label: 'COMERCIAL',
    items: [
      { key: 'clientes', label: 'Clientes', route: '/vendas/clientes', Icon: Users },
      { key: 'orcamentos', label: 'Orçamentos / custos', route: '/vendas/orcamentos', Icon: Calculator },
      { key: 'analise', label: 'Análise de custos', route: '/vendas/analise-custos', Icon: Calculator },
      { key: 'metas', label: 'Metas', route: '/vendas/metas', Icon: BarChart3 },
      { key: 'comissoes', label: 'Vendedores / comissões', route: '/comissoes/perfil', Icon: Users },
      { key: 'relatorios', label: 'Relatórios', route: '/vendas/relatorios', Icon: FileText },
    ],
  },
  {
    label: 'ITENS E PREÇOS',
    items: [
      { key: 'produtos', label: 'Produtos', route: '/vendas/produtos', Icon: Boxes },
      { key: 'estoque', label: 'Estoque', route: '/vendas/estoque', Icon: Boxes },
      { key: 'tabela', label: 'Tabela de preços', route: '/vendas/reajuste', Icon: Tags },
      { key: 'catalogo', label: 'Catálogo digital', route: '/vendas/catalogo-digital', Icon: Tags },
      { key: 'catalogo-gestao', label: 'Gestão do catálogo', route: '/vendas/catalogo-digital/gestao', Icon: Tags },
    ],
  },
  {
    label: 'FATURAMENTO E LOGÍSTICA',
    items: [
      { key: 'pdv', label: 'PDV / venda rápida', route: '/vendas/pdv', Icon: ShoppingCart },
      { key: 'fiscal', label: 'Faturamento / NF-e', route: '/fiscal/emissao', Icon: Receipt },
      { key: 'expedicao', label: 'Expedição', route: '/vendas/expedicao', Icon: Truck },
      { key: 'financeiro', label: 'Fluxo de caixa', route: '/vendas/fluxo-caixa', Icon: Landmark },
    ],
  },
  {
    label: 'ANÁLISE',
    items: [
      { key: 'graficos', label: 'Dashboard gráfico', route: '/vendas/dashboard-graficos', Icon: BarChart3 },
      { key: 'balanco', label: 'Balanço', route: '/vendas/balanco', Icon: Boxes },
      { key: 'auditoria', label: 'Auditoria / lucratividade', route: '/vendas/auditoria', Icon: ClipboardList },
    ],
  },
  {
    label: 'CONFIGURAÇÃO',
    items: [
      { key: 'configuracoes', label: 'Configurações', route: '/vendas/configuracoes', Icon: Settings },
      { key: 'ano-fiscal', label: 'Ano fiscal', route: '/vendas/ano-fiscal', Icon: Receipt },
      { key: 'classificacao', label: 'Classificação fiscal', route: '/vendas/classificacao-fiscal', Icon: FileText },
    ],
  },
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
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    void loadProfile()
      .then(setProfile)
      .catch(reason => setError(reason instanceof Error ? reason.message : String(reason)))
    return () => window.clearInterval(timer)
  }, [])

  const logout = async () => {
    const result = await supabase.auth.signOut()
    if (result.error) {
      setError(result.error.message)
      return
    }
    window.location.assign('/login')
  }

  return (
    <main className="sales-tablet">
      <header className="tablet-header">
        <div className="tablet-brand">
          <button type="button" className="tablet-back" onClick={() => navigate('/tablet/dashboard')} aria-label="Voltar ao menu principal">
            <ArrowLeft size={15} />
          </button>
          <div>
            <strong>MENU VENDAS</strong>
            <span>PADRÃO OPERACIONAL · BASE ODOO / ERPNEXT</span>
          </div>
        </div>
        <div className="tablet-user">
          <div>
            <strong>{profile?.nome ?? 'Usuário'}</strong>
            <span>{profile?.perfil || 'Perfil'} · {now.toLocaleDateString('pt-BR')} · {now.toLocaleTimeString('pt-BR')}</span>
          </div>
          <button type="button" onClick={() => void logout()}>SAIR</button>
        </div>
      </header>

      <section className="tablet-bar sales-bar">
        <div>
          <span>TABLET / VENDAS</span>
          <h1>MENU VENDAS</h1>
        </div>
        <button type="button" className="tablet-refresh" onClick={() => window.location.reload()}>
          <RefreshCw size={13} /> ATUALIZAR
        </button>
      </section>

      {error && <div className="tablet-error">{error}</div>}

      <section className="sales-sections" aria-label="Módulos de vendas">
        {SALES_SECTIONS.map(section => (
          <div className="sales-section" key={section.label}>
            <div className="sales-section-title">{section.label}</div>
            <div className="sales-grid">
              {section.items.map(({ key, label, route, Icon }) => (
                <button key={key} type="button" className="sales-card" onClick={() => navigate(route)}>
                  <span className="tablet-icon"><Icon size={28} strokeWidth={1.7} /></span>
                  <strong>{label}</strong>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <footer className="tablet-footer">
        <strong>VENDAS</strong>
        <span>ERP & SGQ INDUSTRIAL</span>
        <span>{SALES_ITEM_COUNT} FUNÇÕES OPERACIONAIS</span>
      </footer>
    </main>
  )
}
