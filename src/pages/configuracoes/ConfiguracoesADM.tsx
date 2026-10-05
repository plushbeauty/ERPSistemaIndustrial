import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity, ArrowRight, BarChart3, Building2, ChevronDown,
  DatabaseBackup, FileClock, KeyRound, LayoutDashboard,
  LockKeyhole, Menu, Network, Search, Settings, ShieldCheck,
  SlidersHorizontal, UsersRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import CompanySettings from '../../components/CompanySettings'
import UsuariosAdmin from '../UsuariosAdmin'
import ConfiguracaoBackups from './ConfiguracaoBackups'
import ConfiguracaoCodificacaoAreas from './ConfiguracaoCodificacaoAreas'
import ConfiguracaoLogs from './ConfiguracaoLogs'
import ConfiguracaoPermissoes from './ConfiguracaoPermissoes'
import ConfiguracaoPerfis from './ConfiguracaoPerfis'

type Item = { path: string; label: string; description: string; icon: LucideIcon }
type Group = { label: string; items: Item[] }

const groups: Group[] = [
  { label: 'ADMINISTRAÇÃO', items: [
    { path: '/configuracoes-adm', label: 'Visão geral', description: 'Central administrativa', icon: LayoutDashboard },
    { path: '/configuracoes-adm/empresa', label: 'Empresa e identidade', description: 'Cadastro da empresa', icon: Building2 },
    { path: '/configuracoes-adm/codificacao', label: 'Codificação e áreas', description: 'Códigos e setores', icon: BarChart3 },
    { path: '/configuracoes-adm/perfis', label: 'Perfis de usuários', description: 'Perfis e níveis', icon: UsersRound },
    { path: '/configuracoes-adm/permissoes', label: 'Controle de permissões', description: 'Matriz de acesso', icon: ShieldCheck },
  ]},
  { label: 'CONTROLE E SEGURANÇA', items: [
    { path: '/configuracoes-adm/logs', label: 'Logs do sistema', description: 'Auditoria e rastreabilidade', icon: FileClock },
    { path: '/configuracoes-adm/backups', label: 'Backups', description: 'Continuidade operacional', icon: DatabaseBackup },
    { path: '/configuracoes-adm/usuarios', label: 'Usuários', description: 'Cadastro e situação', icon: KeyRound },
    { path: '/configuracoes-adm/seguranca', label: 'Segurança', description: 'Sessões e políticas', icon: LockKeyhole },
  ]},
  { label: 'PLATAFORMA', items: [
    { path: '/configuracoes-adm/integracoes', label: 'Integrações', description: 'Serviços e conectores', icon: Network },
    { path: '/configuracoes-adm/sistema', label: 'Sistema', description: 'Preferências gerais', icon: Settings },
  ]},
]
const allItems = groups.flatMap(group => group.items)

function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <section style={{ marginBottom: 20, borderRadius: 12, border: '1px solid #E2E8F0', background: '#FFFFFF', boxShadow: '0 2px 10px rgba(18,59,80,.05)' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid #E2E8F0', padding: '16px 20px' }}>
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#123B50' }}>{title}</h2>{action}
    </div>
    <div style={{ padding: 20 }}>{children}</div>
  </section>
}

const grid = (min = 220): CSSProperties => ({
  display: 'grid', gridTemplateColumns: `repeat(auto-fit,minmax(${min}px,1fr))`, gap: 16,
})
const buttonStyle: CSSProperties = {
  border: '1px solid #C9DDE5', borderRadius: 3, minHeight: 30, padding: '0 9px', display: 'inline-flex',
  alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 10, fontWeight: 700,
}

function Overview({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const cards: Array<[string, string, LucideIcon, string]> = [
    ['Empresa e identidade', 'Dados cadastrais, documentos e identidade usados nos relatórios.', Building2, '/configuracoes-adm/empresa'],
    ['Codificação e áreas', 'Sequências, grupos e áreas operacionais da empresa.', BarChart3, '/configuracoes-adm/codificacao'],
    ['Perfis e permissões', 'Papéis e permissões vinculados ao RBAC persistido.', ShieldCheck, '/configuracoes-adm/perfis'],
    ['Usuários', 'Contas operacionais, status e perfil de acesso.', UsersRound, '/configuracoes-adm/usuarios'],
    ['Logs do sistema', 'Auditoria persistida com escopo definido por RLS.', FileClock, '/configuracoes-adm/logs'],
    ['Backups', 'Informações sobre backup gerenciado na infraestrutura.', DatabaseBackup, '/configuracoes-adm/backups'],
  ]
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <Card title="Central administrativa">
      <div style={grid(270)}>{cards.map(([label, description, Icon, path]) =>
        <button key={path} type="button" onClick={() => navigate(path)} style={{ minHeight: 150, border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, textAlign: 'left', background: '#FFFFFF', cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: 8, background: '#EAF7FA', color: '#17445A' }}><Icon size={19} /></span>
            <ArrowRight size={16} color="#CBD5E1" />
          </div>
          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 800, color: '#123B50' }}>{label}</h3>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, fontWeight: 500, color: '#64748B' }}>{description}</p>
        </button>
      )}</div>
    </Card>
  </div>
}

function Empresa() {
  const [profile, setProfile] = useState<{ nome: string; empresa_id: string | null; is_master: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    const loadProfile = async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!authData.user) throw new Error('Sessão autenticada necessária para carregar a empresa.')
        const { data, error: profileError } = await supabase.from('erp_usuarios')
          .select('nome,empresa_id,is_master')
          .eq('auth_user_id', authData.user.id)
          .eq('ativo', true)
          .is('deleted_at', null)
          .maybeSingle()
        if (profileError) throw profileError
        if (!data) throw new Error('O usuário autenticado não possui perfil ERP.')
        if (!data.empresa_id) throw new Error('O Master precisa selecionar uma empresa antes de editar a identidade.')
        const { data: permitted, error: permissionError } = await supabase.rpc('erp_has_permission', { p_modulo: 'empresas', p_acao: 'editar' })
        if (permissionError) throw permissionError
        if (permitted !== true) throw new Error('Seu perfil não possui a permissão empresas.editar.')
        if (alive) setProfile({ nome: data.nome, empresa_id: data.empresa_id, is_master: Boolean(data.is_master) })
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o perfil.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    void loadProfile()
    return () => { alive = false }
  }, [])
  if (loading) return <Card title="Empresa e identidade">Carregando o perfil autenticado…</Card>
  if (error || !profile) return <Card title="Empresa e identidade">{error || 'Perfil ERP indisponível.'}</Card>
  return <CompanySettings profile={profile} />
}

function UnavailableSection({ item }: { item: Item }) {
  const details: Record<string, string> = {
    '/configuracoes-adm/seguranca': 'Autenticação e sessões são gerenciadas pelo Supabase Auth. O aplicativo não possui API autorizada de administração de sessões para este tenant.',
    '/configuracoes-adm/integracoes': 'Não existe um catálogo central de integrações no schema ERP. As integrações disponíveis precisam ser configuradas nos módulos de origem.',
    '/configuracoes-adm/sistema': 'Não existe uma fonte persistida de preferências globais do sistema. Nenhum valor local ou formulário sem persistência é apresentado.',
  }
  return <Card title={item.label}>
    <div role="status" style={{ borderRadius: 10, border: '1px solid #D7E2ED', background: '#F7FAFC', padding: 16, color: '#526273', fontSize: 13, lineHeight: 1.6 }}>
      {details[item.path] || 'Esta seção não possui uma operação administrativa persistida disponível no schema atual.'}
      {item.path === '/configuracoes-adm/integracoes' && <p style={{ margin: '12px 0 0' }}><Link to="/outlook/configuracao" style={{ color: '#0052CC', fontWeight: 800 }}>Abrir configuração de e-mail</Link></p>}
    </div>
  </Card>
}

function SectionContent({ item, navigate }: { item: Item; navigate: ReturnType<typeof useNavigate> }) {
  if (item.path === '/configuracoes-adm') return <Overview navigate={navigate} />
  if (item.path === '/configuracoes-adm/empresa') return <Empresa />
  if (item.path === '/configuracoes-adm/codificacao') return <ConfiguracaoCodificacaoAreas profile={null} />
  if (item.path === '/configuracoes-adm/perfis') return <ConfiguracaoPerfis />
  if (item.path === '/configuracoes-adm/permissoes') return <ConfiguracaoPermissoes />
  if (item.path === '/configuracoes-adm/logs') return <ConfiguracaoLogs />
  if (item.path === '/configuracoes-adm/backups') return <ConfiguracaoBackups />
  if (item.path === '/configuracoes-adm/usuarios') return <UsuariosAdmin />
  return <UnavailableSection item={item} />
}

export default function ConfiguracoesADM() {
  const location = useLocation(); const navigate = useNavigate()
  const current = useMemo(() => allItems.find(item => item.path === location.pathname) ?? allItems[0], [location.pathname])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => Object.fromEntries(groups.map(g => [g.label, true])))
  const [query, setQuery] = useState('')
  const filteredGroups = groups.map(g => ({ ...g, items: g.items.filter(i => !query || (i.label + ' ' + i.description).toLowerCase().includes(query.toLowerCase())) })).filter(g => g.items.length)
  const toggleGroup = (label: string) => setOpenGroups(s => ({ ...s, [label]: !s[label] }))

  const sidebar: CSSProperties = {
    width: 230, flexShrink: 0, minHeight: 'calc(100vh - 48px)', borderRight: '1px solid #E2E8F0',
    background: '#FFFFFF', display: 'flex', flexDirection: 'column',
  }
  const navLink = (active: boolean): CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 12, borderRadius: 8, padding: '4px 8px',
    textDecoration: 'none', color: active ? '#123B50' : '#475569',
    background: active ? '#EAF7FA' : 'transparent', border: active ? '1px solid #C8E1E8' : '1px solid transparent',
  })

  return <div style={{ minHeight: '100vh', background: '#F4FBFD', color: '#1E293B', fontFamily: 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
    <header style={{ position: 'sticky', top: 0, zIndex: 40, borderBottom: '1px solid #E2E8F0', background: 'rgba(255,255,255,.96)', backdropFilter: 'blur(4px)' }}>
      <div style={{ height: 48, display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px' }}>
        <button type="button" onClick={() => setMobileOpen(v => !v)} style={{ ...buttonStyle, width: 40, padding: 0, justifyContent: 'center', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#17445A' }} aria-label="Abrir menu"><Menu size={19} /></button>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.18em', color: '#2D8DB8' }}>SYNQRA ERP & SGQ INDUSTRIAL</div><div style={{ fontSize: 14, fontWeight: 900, color: '#123B50', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Administração do sistema</div></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 'min(320px,36vw)', border: '1px solid #E2E8F0', borderRadius: 8, background: '#F8FAFC', padding: '0 12px' }}><Search size={16} color="#94A3B8" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar configuração..." style={{ height: 30, flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent', fontSize: 11, fontWeight: 600 }} /></div>
      </div>
    </header>

    {mobileOpen && <button type="button" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: '64px 0 0', zIndex: 45, border: 0, background: 'rgba(18,59,80,.42)' }} />}

    <div style={{ maxWidth: 1680, margin: '0 auto', display: 'flex', alignItems: 'stretch' }}>
      <aside className="admin-config-sidebar" style={{ ...sidebar, position: 'fixed', top: 48, bottom: 0, left: 0, zIndex: 50, overflowY: 'auto', transform: mobileOpen ? 'translateX(0)' : 'translateX(-105%)', transition: 'transform .2s ease' }}>
        <div style={{ borderBottom: '1px solid #E2E8F0', padding: 16 }}><div style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 12, background: '#123B50', padding: 16, color: '#FFFFFF' }}><div style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: 8, background: 'rgba(255,255,255,.1)' }}><SlidersHorizontal size={19} /></div><div><div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.1em', color: '#8DE0EA' }}>CONFIGURAÇÃO</div><div style={{ fontSize: 14, fontWeight: 900 }}>Painel Administrativo</div></div></div></div>
        <nav aria-label="Menu administrativo" style={{ flex: 1, padding: 12 }}>
          {filteredGroups.map(group => <div key={group.label} style={{ marginBottom: 16 }}>
            <button type="button" onClick={() => toggleGroup(group.label)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, padding: 8, border: 0, background: 'transparent', color: '#94A3B8', fontSize: 10, fontWeight: 900, letterSpacing: '.16em', cursor: 'pointer' }}>{group.label}<ChevronDown size={14} style={{ transform: openGroups[group.label] ? 'none' : 'rotate(-90deg)' }} /></button>
            {openGroups[group.label] && <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{group.items.map(item => { const Icon = item.icon; const active = current.path === item.path; return <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)} aria-current={active ? 'page' : undefined} style={navLink(active)}>
              <span style={{ width: 28, height: 28, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 6, background: active ? '#FFFFFF' : '#F1F5F9', color: active ? '#2D8DB8' : '#64748B' }}><Icon size={16} /></span>
              <span style={{ minWidth: 0, flex: 1 }}><span style={{ display: 'block', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span><span style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</span></span>
              <ArrowRight size={14} color={active ? '#2D8DB8' : '#CBD5E1'} />
            </Link>})}</div>}
          </div>)}
        </nav>
        <div style={{ borderTop: '1px solid #E2E8F0', padding: 16 }}><div style={{ border: '1px solid #C8E1E8', borderRadius: 8, background: '#F4FBFD', padding: 12 }}><div style={{ fontSize: 10, fontWeight: 900, color: '#17445A' }}>ESCOPO DE ACESSO</div><div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, lineHeight: 1.4, color: '#526A75' }}>Dados operacionais respeitam as políticas RLS do banco; recursos sem fonte persistida são identificados.</div></div></div>
      </aside>

      <main className="admin-config-main" style={{ flex: 1, minWidth: 0, padding: 12, marginLeft: 230 }}>
        <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div><div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>ERP Industrial / Administração / <span style={{ color: '#475569' }}>{current.label}</span></div><h1 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color: '#123B50' }}>{current.label}</h1><p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 600, color: '#64748B' }}>{current.description}</p></div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, border: '1px solid #C8E1E8', background: '#F4FBFD', padding: '6px 12px', fontSize: 10, fontWeight: 900, color: '#17445A' }}><Activity size={13} /> Área administrativa</div>
        </div>
        <SectionContent item={current} navigate={navigate} />
        <footer style={{ marginTop: 32, borderTop: '1px solid #E2E8F0', padding: '20px 0', textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#94A3B8' }}>© FernandoSch_System — Todos os direitos reservados</footer>
      </main>
    </div>
  </div>
}
