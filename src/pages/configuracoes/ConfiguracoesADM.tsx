/*
 * REVISÃO TÉCNICA: 16/10/2026
 * Revisado: navegação horizontal sem barra lateral, pesquisa de seções, estado ativo, layout responsivo e conteúdo da página selecionada.
 * Alteração desta revisão: páginas dedicadas de Integrações e Parâmetros do Sistema conectadas à navegação administrativa. Não validado: type-check/build, execução no navegador, permissões reais e publicação Vercel.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity, ArrowRight, BarChart3, Building2, DatabaseBackup,
  FileClock, KeyRound, LayoutDashboard, LockKeyhole, Network, Search,
  Settings, ShieldCheck, UsersRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import CompanySettings from '../../components/CompanySettings'
import UsuariosAdmin from '../UsuariosAdmin'
import ConfiguracaoBackups from './ConfiguracaoBackups'
import ConfiguracaoCodificacaoAreas from './ConfiguracaoCodificacaoAreas'
import ConfiguracaoLogs from './ConfiguracaoLogs'
import ConfiguracaoPermissoes from './ConfiguracaoPermissoes'
import ConfiguracaoSeguranca from './ConfiguracaoSeguranca'
import ConfiguracaoPerfis from './ConfiguracaoPerfis'
import ConfiguracaoIntegracoes from './ConfiguracaoIntegracoes'
import ConfiguracaoSistema from './ConfiguracaoSistema'

type Item = { path: string; label: string; description: string; icon: LucideIcon }
type Group = { label: string; items: Item[] }

const groups: Group[] = [
  { label: 'ADMINISTRAÇÃO', items: [
    { path: '/configuracoes-adm', label: 'Visão geral', description: 'Central administrativa', icon: LayoutDashboard },
    { path: '/configuracoes-adm/empresa', label: 'Empresa e identidade', description: 'Dados da empresa', icon: Building2 },
    { path: '/configuracoes-adm/codificacao', label: 'Codificação e áreas', description: 'Códigos e setores', icon: BarChart3 },
    { path: '/configuracoes-adm/perfis', label: 'Perfis de usuários', description: 'Papéis e níveis', icon: UsersRound },
    { path: '/configuracoes-adm/permissoes', label: 'Permissões RBAC', description: 'Acesso por módulo e ação', icon: ShieldCheck },
  ] },
  { label: 'SEGURANÇA E CONTROLE', items: [
    { path: '/configuracoes-adm/usuarios', label: 'Usuários', description: 'Contas e situação', icon: KeyRound },
    { path: '/configuracoes-adm/seguranca', label: 'Segurança e sessões', description: 'Autenticação e políticas', icon: LockKeyhole },
    { path: '/configuracoes-adm/logs', label: 'Logs e auditoria', description: 'Rastreabilidade', icon: FileClock },
    { path: '/configuracoes-adm/backups', label: 'Backups e recuperação', description: 'Continuidade operacional', icon: DatabaseBackup },
  ] },
  { label: 'PLATAFORMA', items: [
    { path: '/configuracoes-adm/integracoes', label: 'Integrações', description: 'Serviços conectados', icon: Network },
    { path: '/configuracoes-adm/sistema', label: 'Parâmetros do sistema', description: 'Preferências disponíveis', icon: Settings },
  ] },
]
const allItems = groups.flatMap(group => group.items)
const colors = { navy: '#123B50', blue: '#2D8DB8', border: '#CFE1E7', pale: '#F4FBFD', text: '#334155' }

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section style={{ border: `1px solid ${colors.border}`, borderRadius: 2, background: '#fff', marginBottom: 10 }}>
    <header style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border}`, color: colors.navy, fontSize: 10, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>{title}</header>
    <div style={{ padding: 10 }}>{children}</div>
  </section>
}

function Overview({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const items = allItems.filter(item => item.path !== '/configuracoes-adm')
  return <Panel title="Áreas administrativas">
    <div className="adm-overview-grid">
      {items.map(item => {
        const Icon = item.icon
        return <button key={item.path} type="button" onClick={() => navigate(item.path)} className="adm-overview-item">
          <span className="adm-overview-icon"><Icon size={15} /></span>
          <span className="adm-overview-copy"><strong>{item.label}</strong><small>{item.description}</small></span>
          <ArrowRight size={14} className="adm-overview-arrow" />
        </button>
      })}
    </div>
  </Panel>
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
        if (!authData.user) throw new Error('É necessário estar autenticado para carregar a empresa.')
        const { data, error: profileError } = await supabase.from('erp_usuarios')
          .select('nome,empresa_id,is_master')
          .eq('auth_user_id', authData.user.id)
          .eq('ativo', true)
          .is('deleted_at', null)
          .maybeSingle()
        if (profileError) throw profileError
        if (!data) throw new Error('O usuário autenticado não possui perfil ERP ativo.')
        if (!data.empresa_id) throw new Error('O Master precisa selecionar uma empresa antes de editar sua identidade.')
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
  if (loading) return <Panel title="Empresa e identidade">Carregando perfil autenticado…</Panel>
  if (error || !profile) return <Panel title="Empresa e identidade"><div role="alert" className="adm-error">{error || 'Perfil ERP indisponível.'}</div></Panel>
  return <CompanySettings profile={profile} />
}

function UnavailableSection({ item }: { item: Item }) {
  const details: Record<string, string> = {
    '/configuracoes-adm/seguranca': 'A autenticação e o ciclo de sessão são gerenciados pelo Supabase Auth. Revogação administrativa de sessões, MFA e políticas de senha só serão exibidos como disponíveis quando houver contrato e operação autorizados comprovados.',
    '/configuracoes-adm/integracoes': 'Ainda não foi confirmado um catálogo persistido de integrações no schema ERP. Os conectores devem ser ligados a configurações reais, sem simular status ou salvamento.',
    '/configuracoes-adm/sistema': 'Esta área ainda não possui um contrato único confirmado para preferências globais. Parâmetros operacionais permanecem nos respectivos módulos até a auditoria do schema.',
  }
  return <Panel title={item.label}>
    <div className="adm-notice"><strong>Auditoria necessária</strong><p>{details[item.path] || 'Não foi identificada uma operação administrativa persistida para esta área.'}</p>
      {item.path === '/configuracoes-adm/seguranca' && <div className="adm-actions"><Link to="/configuracoes-adm/usuarios">USUÁRIOS</Link><Link to="/configuracoes-adm/permissoes">PERMISSÕES RBAC</Link><Link to="/configuracoes-adm/logs">LOGS E AUDITORIA</Link></div>}
      {item.path === '/configuracoes-adm/integracoes' && <div className="adm-actions"><Link to="/outlook/configuracao">CONFIGURAÇÃO DE E-MAIL</Link></div>}
      {item.path === '/configuracoes-adm/sistema' && <div className="adm-actions"><Link to="/configuracoes-adm/codificacao">CODIFICAÇÃO E ÁREAS</Link><Link to="/configuracoes-adm/empresa">DADOS DA EMPRESA</Link></div>}
    </div>
  </Panel>
}

function SectionContent({ item, navigate }: { item: Item; navigate: ReturnType<typeof useNavigate> }) {
  if (item.path === '/configuracoes-adm') return <Overview navigate={navigate} />
  if (item.path === '/configuracoes-adm/empresa') return <Empresa />
  if (item.path === '/configuracoes-adm/codificacao') return <ConfiguracaoCodificacaoAreas profile={null} />
  if (item.path === '/configuracoes-adm/perfis') return <ConfiguracaoPerfis />
  if (item.path === '/configuracoes-adm/permissoes') return <ConfiguracaoPermissoes />
  if (item.path === '/configuracoes-adm/seguranca') return <ConfiguracaoSeguranca />
  if (item.path === '/configuracoes-adm/logs') return <ConfiguracaoLogs />
  if (item.path === '/configuracoes-adm/backups') return <ConfiguracaoBackups />
  if (item.path === '/configuracoes-adm/usuarios') return <UsuariosAdmin />
  if (item.path === '/configuracoes-adm/integracoes') return <ConfiguracaoIntegracoes />
  if (item.path === '/configuracoes-adm/sistema') return <ConfiguracaoSistema />
  return <UnavailableSection item={item} />
}

export default function ConfiguracoesADM() {
  const location = useLocation()
  const navigate = useNavigate()
  const current = useMemo(() => allItems.find(item => item.path === location.pathname) ?? allItems[0], [location.pathname])
  const [query, setQuery] = useState('')
  const filteredGroups = useMemo(() => groups.map(group => ({
    ...group,
    items: group.items.filter(item => !query || `${item.label} ${item.description} ${group.label}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))),
  })).filter(group => group.items.length), [query])
  const go = (path: string) => navigate(path)

  return <div className="adm-root">
    <header className="adm-topbar">
      <div className="adm-brand"><span>SYNQRA ERP · ADMINISTRAÇÃO</span><strong>Configurações do sistema</strong></div>
      <label className="adm-search"><Search size={14} /><input aria-label="Pesquisar configurações" value={query} onChange={event => setQuery(event.target.value)} maxLength={60} placeholder="Pesquisar configuração..." /></label>
      <span className="adm-scope"><Activity size={13} /> CONTROLE ADMINISTRATIVO</span>
    </header>

    <nav className="adm-navigation" aria-label="Navegação horizontal das configurações">
      {filteredGroups.map(group => <section className="adm-nav-group" key={group.label}>
        <div className="adm-group-title">{group.label}</div>
        <div className="adm-nav-items">{group.items.map(item => {
          const Icon = item.icon
          const active = current.path === item.path
          return <button key={item.path} type="button" onClick={() => go(item.path)} aria-current={active ? 'page' : undefined} className={`adm-nav-link ${active ? 'is-active' : ''}`}>
            <Icon size={13} /><span>{item.label}</span>
          </button>
        })}</div>
      </section>)}
      {!filteredGroups.length && <p className="adm-no-results">Nenhuma configuração corresponde à pesquisa.</p>}
    </nav>

    <main className="adm-main">
      <div className="adm-page-heading"><div><div className="adm-breadcrumb">ERP INDUSTRIAL / CONFIGURAÇÕES / <strong>{current.label.toLocaleUpperCase('pt-BR')}</strong></div><h1>{current.label}</h1><p>{current.description}</p></div><button type="button" className="adm-back-button" onClick={() => go('/erp-industrial')}>VOLTAR AO ERP</button></div>
      <SectionContent item={current} navigate={navigate} />
      <footer className="adm-footer">SYNQRA ERP INDUSTRIAL · Administração e segurança</footer>
    </main>

    <style>{`
      .adm-root{min-height:calc(100vh - 48px);background:#F4FBFD;color:#334155;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:11px}
      .adm-root *{box-sizing:border-box}
      .adm-topbar{min-height:48px;position:sticky;top:0;z-index:60;display:flex;align-items:center;gap:12px;padding:7px 12px;background:#fff;border-bottom:1px solid #CFE1E7}
      .adm-brand{display:flex;flex-direction:column;gap:2px;min-width:180px;flex:1}
      .adm-brand span{font-size:9px;line-height:1.2;letter-spacing:.1em;font-weight:800;color:#2D8DB8}
      .adm-brand strong{font-size:13px;line-height:1.2;color:#123B50;font-weight:800}
      .adm-search{height:30px;width:min(310px,30vw);display:flex;align-items:center;gap:6px;padding:0 8px;border:1px solid #CFE1E7;border-radius:2px;background:#F8FCFD;color:#64748B}
      .adm-search input{width:100%;min-width:0;height:28px;border:0;outline:0;background:transparent;font-size:10px;color:#123B50}
      .adm-scope{display:flex;align-items:center;gap:5px;color:#17445A;font-size:9px;font-weight:800;white-space:nowrap}
      .adm-navigation{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:8px 12px;background:#EAF5F8;border-bottom:1px solid #CFE1E7}
      .adm-nav-group{min-width:0;padding:7px;border:1px solid #CFE1E7;background:#fff}
      .adm-group-title{margin:0 0 6px;color:#607987;font-size:9px;font-weight:800;letter-spacing:.07em}
      .adm-nav-items{display:flex;flex-wrap:wrap;gap:4px}
      .adm-nav-link{min-height:28px;display:inline-flex;align-items:center;gap:5px;padding:0 7px;border:1px solid #D8E7EC;border-radius:2px;background:#fff;color:#334155;font-size:9px;font-weight:700;text-align:left;cursor:pointer}
      .adm-nav-link svg{flex-shrink:0;color:#2D8DB8}.adm-nav-link:hover{border-color:#2D8DB8;background:#F4FBFD}.adm-nav-link.is-active{border-color:#2D8DB8;background:#123B50;color:#fff}.adm-nav-link.is-active svg{color:#fff}
      .adm-no-results{grid-column:1/-1;margin:0;padding:8px;color:#64748B}
      .adm-main{min-width:0;margin:0 auto;padding:12px;max-width:1800px}
      .adm-page-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #CFE1E7}
      .adm-breadcrumb{font-size:9px;color:#64748B;letter-spacing:.03em}.adm-breadcrumb strong{color:#176487}
      .adm-page-heading h1{margin:5px 0 0;font-size:17px;line-height:1.2;font-weight:800;color:#123B50}.adm-page-heading p{margin:4px 0 0;color:#64748B;font-size:10px}
      .adm-back-button{height:30px;padding:0 9px;border:1px solid #CFE1E7;border-radius:2px;background:#fff;color:#123B50;font-size:9px;font-weight:800;white-space:nowrap;cursor:pointer}
      .adm-overview-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,225px),1fr));gap:7px}
      .adm-overview-item{min-height:62px;display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #CFE1E7;border-radius:2px;background:#fff;text-align:left;cursor:pointer;color:#123B50}
      .adm-overview-item:hover{border-color:#2D8DB8;background:#F4FBFD}.adm-overview-icon{width:27px;height:27px;flex-shrink:0;display:grid;place-items:center;background:#E2F3F7;color:#176487;border-radius:2px}
      .adm-overview-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px}.adm-overview-copy strong{font-size:10px;font-weight:800}.adm-overview-copy small{font-size:9px;line-height:1.35;color:#64748B}.adm-overview-arrow{flex-shrink:0;color:#94A3B8}
      .adm-notice{padding:10px;border:1px solid #E8D6AD;border-left:3px solid #E6A34A;background:#FFFDF5;color:#526273;line-height:1.5;font-size:10px}.adm-notice p{margin:4px 0 0}
      .adm-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.adm-actions a{display:inline-flex;align-items:center;min-height:30px;padding:0 8px;border:1px solid #CFE1E7;border-radius:2px;background:#fff;color:#123B50;text-decoration:none;font-size:9px;font-weight:800}
      .adm-error{padding:8px;border:1px solid #F1B8B8;background:#FFF1F1;color:#A52727;font-size:10px}
      .adm-footer{padding:10px 0 4px;text-align:center;color:#94A3B8;font-size:9px;border-top:1px solid #CFE1E7;margin-top:12px}
      .adm-root input:not([type=checkbox]):not([type=radio]):not([type=file]),.adm-root select{max-width:100%;border-radius:2px}.adm-root table{font-size:10px}.adm-root thead th{font-size:9px}
      @media(max-width:1100px){.adm-navigation{grid-template-columns:repeat(2,minmax(0,1fr))}.adm-scope{display:none}}
      @media(max-width:700px){.adm-topbar{flex-wrap:wrap}.adm-brand{min-width:0}.adm-brand strong{font-size:12px}.adm-search{width:min(300px,48vw)}.adm-navigation{grid-template-columns:1fr;padding:7px}.adm-main{padding:8px}.adm-page-heading{align-items:flex-start}.adm-back-button{font-size:8px}.adm-overview-grid{grid-template-columns:1fr}}
      @media(max-width:430px){.adm-brand span{font-size:8px}.adm-brand strong{font-size:11px}.adm-search{width:100%}.adm-page-heading h1{font-size:15px}}
    `}</style>
  </div>
}
