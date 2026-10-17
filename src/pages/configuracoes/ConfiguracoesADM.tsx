/*
 * REVISÃO TÉCNICA: 16/10/2026
 * Revisado: navegação horizontal sem barra lateral, pesquisa de seções, estado ativo, layout responsivo e conteúdo da página selecionada.
 * Alteração desta revisão: páginas dedicadas de Integrações e Parâmetros do Sistema conectadas à navegação administrativa; mensagens antigas de indisponibilidade removidas dessas rotas. Não validado: type-check/build, execução no navegador, permissões reais e publicação Vercel.
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
  return <section style={{ border: `1px solid ${colors.border}`, borderRadius: 12, background: '#fff', marginBottom: 14, boxShadow: '0 8px 24px rgba(18,59,80,.04)' }}>
    <header style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border}`, color: colors.navy, fontSize: 12, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>{title}</header>
    <div style={{ padding: 18 }}>{children}</div>
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
  }
  return <Panel title={item.label}>
    <div className="adm-notice"><strong>Auditoria necessária</strong><p>{details[item.path] || 'Não foi identificada uma operação administrativa persistida para esta área.'}</p>
      {item.path === '/configuracoes-adm/seguranca' && <div className="adm-actions"><Link to="/configuracoes-adm/usuarios">USUÁRIOS</Link><Link to="/configuracoes-adm/permissoes">PERMISSÕES RBAC</Link><Link to="/configuracoes-adm/logs">LOGS E AUDITORIA</Link></div>}
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

    <div className="adm-shell">
      <nav className="adm-navigation" aria-label="Navegação das configurações">
        {filteredGroups.map(group => <section className="adm-nav-group" key={group.label}>
          <div className="adm-group-title">{group.label}</div>
          <div className="adm-nav-items">{group.items.map(item => {
            const Icon = item.icon
            const active = current.path === item.path
            return <button key={item.path} type="button" onClick={() => go(item.path)} aria-current={active ? 'page' : undefined} className={`adm-nav-link ${active ? 'is-active' : ''}`}>
              <Icon size={16} /><span>{item.label}</span>
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
    </div>

    <style>{`
      .adm-root{min-height:calc(100vh - 48px);background:linear-gradient(180deg,#F2F8FB 0%,#F6F8FA 280px);color:#334155;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px}
      .adm-root *{box-sizing:border-box}
      .adm-topbar{min-height:72px;position:sticky;top:0;z-index:60;display:flex;align-items:center;gap:18px;padding:12px 24px;background:rgba(255,255,255,.96);border-bottom:1px solid #D5E4EA;box-shadow:0 6px 22px rgba(18,59,80,.05);backdrop-filter:blur(12px)}
      .adm-brand{display:flex;flex-direction:column;gap:4px;min-width:240px;flex:1}
      .adm-brand span{font-size:10px;line-height:1.2;letter-spacing:.12em;font-weight:800;color:#2879A6}
      .adm-brand strong{font-size:19px;line-height:1.2;color:#123B50;font-weight:800}
      .adm-search{height:42px;width:min(380px,30vw);display:flex;align-items:center;gap:9px;padding:0 12px;border:1px solid #CFE1E7;border-radius:9px;background:#F8FCFD;color:#64748B;transition:border-color .16s,box-shadow .16s}
      .adm-search:focus-within{border-color:#2D8DB8;box-shadow:0 0 0 3px rgba(45,141,184,.12)}
      .adm-search input{width:100%;min-width:0;height:38px;border:0;outline:0;background:transparent;font-size:13px;color:#123B50}
      .adm-scope{display:flex;align-items:center;gap:7px;color:#17445A;font-size:11px;font-weight:800;white-space:nowrap}
      .adm-shell{display:grid;grid-template-columns:280px minmax(0,1fr);max-width:1920px;margin:0 auto}
      .adm-navigation{position:sticky;top:72px;align-self:start;display:block;height:calc(100vh - 72px);overflow:auto;padding:20px 12px 20px 24px;background:rgba(234,245,248,.55);border-right:1px solid #D5E4EA}
      .adm-nav-group{min-width:0;margin-bottom:12px;padding:12px;border:1px solid #D7E5EA;border-radius:11px;background:rgba(255,255,255,.9);box-shadow:0 4px 12px rgba(18,59,80,.025)}
      .adm-group-title{margin:0 0 9px;padding:0 4px;color:#607987;font-size:10px;font-weight:800;letter-spacing:.08em}
      .adm-nav-items{display:grid;grid-template-columns:minmax(0,1fr);gap:5px}
      .adm-nav-link{width:100%;min-height:42px;display:flex;align-items:center;gap:10px;padding:0 11px;border:1px solid transparent;border-radius:8px;background:transparent;color:#334155;font-size:12px;font-weight:700;text-align:left;cursor:pointer;transition:background .16s,border-color .16s,transform .16s}
      .adm-nav-link svg{flex-shrink:0;color:#2D8DB8}.adm-nav-link:hover{border-color:#D8E7EC;background:#F4FBFD}.adm-nav-link.is-active{border-color:#C4E2EC;background:linear-gradient(100deg,#E6F4F8,#F8FCFD);color:#123B50;box-shadow:inset 3px 0 #2D8DB8}.adm-nav-link.is-active svg{color:#176487}
      .adm-no-results{margin:0;padding:12px;color:#64748B;font-size:12px}
      .adm-main{min-width:0;width:100%;margin:0 auto;padding:24px;max-width:1500px}
      .adm-page-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid #D5E4EA}
      .adm-breadcrumb{font-size:10px;color:#64748B;letter-spacing:.04em}.adm-breadcrumb strong{color:#176487}
      .adm-page-heading h1{margin:7px 0 0;font-size:26px;line-height:1.2;font-weight:800;color:#123B50}.adm-page-heading p{margin:6px 0 0;color:#64748B;font-size:13px}
      .adm-back-button{height:40px;padding:0 14px;border:1px solid #CFE1E7;border-radius:8px;background:#fff;color:#123B50;font-size:11px;font-weight:800;white-space:nowrap;cursor:pointer;transition:border-color .16s,background .16s}
      .adm-back-button:hover{border-color:#2D8DB8;background:#F4FBFD}
      .adm-overview-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:12px}
      .adm-overview-item{min-height:82px;display:flex;align-items:center;gap:12px;padding:14px;border:1px solid #D5E4EA;border-radius:11px;background:#fff;text-align:left;cursor:pointer;color:#123B50;box-shadow:0 4px 14px rgba(18,59,80,.035);transition:border-color .16s,box-shadow .16s,transform .16s}
      .adm-overview-item:hover{border-color:#2D8DB8;background:#F4FBFD;box-shadow:0 10px 24px rgba(18,59,80,.08);transform:translateY(-1px)}.adm-overview-icon{width:42px;height:42px;flex-shrink:0;display:grid;place-items:center;background:#E2F3F7;color:#176487;border-radius:10px}
      .adm-overview-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:5px}.adm-overview-copy strong{font-size:14px;font-weight:800}.adm-overview-copy small{font-size:12px;line-height:1.45;color:#64748B}.adm-overview-arrow{flex-shrink:0;color:#94A3B8}
      .adm-notice{padding:16px;border:1px solid #E8D6AD;border-left:4px solid #E6A34A;border-radius:10px;background:#FFFDF5;color:#526273;line-height:1.6;font-size:13px}.adm-notice p{margin:6px 0 0}
      .adm-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.adm-actions a{display:inline-flex;align-items:center;min-height:38px;padding:0 12px;border:1px solid #CFE1E7;border-radius:8px;background:#fff;color:#123B50;text-decoration:none;font-size:11px;font-weight:800}
      .adm-error{padding:12px;border:1px solid #F1B8B8;border-radius:9px;background:#FFF1F1;color:#A52727;font-size:13px}
      .adm-footer{padding:16px 0 6px;text-align:center;color:#94A3B8;font-size:11px;border-top:1px solid #D5E4EA;margin-top:20px}
      .adm-root .adm-main :is(p,small,dt,dd,label,[class*="text-[8px]"],[class*="text-[9px]"],[class*="text-[10px]"],[class*="text-[11px]"],[class*="text-[12px]"]){font-size:12px!important;line-height:1.5}
      .adm-root .adm-main h2{font-size:18px!important;line-height:1.3}
      .adm-root .adm-main h3{font-size:15px!important;line-height:1.35}
      .adm-root .adm-main input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]),.adm-root .adm-main select{width:100%;max-width:100%;min-width:0;height:42px!important;min-height:42px!important;padding:0 12px;border:1px solid #C9D9E0;border-radius:8px;background-color:#fff;color:#123B50;font-size:14px!important;line-height:1.4;box-shadow:0 1px 2px rgba(18,59,80,.04)}
      .adm-root .adm-main textarea{width:100%;max-width:100%;min-height:112px;padding:10px 12px;border:1px solid #C9D9E0;border-radius:8px;background:#fff;color:#123B50;font-size:14px!important;line-height:1.5;resize:vertical}
      .adm-root .adm-main input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]):focus,.adm-root .adm-main select:focus,.adm-root .adm-main textarea:focus{border-color:#2D8DB8;outline:0;box-shadow:0 0 0 3px rgba(45,141,184,.14)}
      .adm-root .adm-main input:disabled,.adm-root .adm-main select:disabled,.adm-root .adm-main textarea:disabled{background:#F1F5F7;color:#718096;cursor:not-allowed}
      .adm-root .adm-main button{min-height:38px;border-radius:8px;font-size:11px}
      .adm-root .adm-main .user-admin-search input,.adm-root .adm-main .user-admin-company-filter select{height:38px!important;min-height:38px!important;padding:0!important;border:0!important;border-radius:0;background:transparent!important;font-size:13px!important;box-shadow:none!important}
      .adm-root .adm-main .user-admin-search button,.adm-root .adm-main .user-icon-action{width:36px;min-width:36px;height:36px;min-height:36px;padding:0}
      .adm-root .adm-main table{width:100%;font-size:13px}
      .adm-root .adm-main thead th{height:40px;padding:8px 12px;font-size:11px!important;letter-spacing:.04em}
      .adm-root .adm-main tbody td{padding:10px 12px;line-height:1.45}
      .adm-root .adm-main article{border-radius:11px}
      .adm-root :is(button,a,input,select,textarea,summary):focus-visible{outline:3px solid rgba(45,141,184,.28);outline-offset:2px}
      @media(max-width:1100px){.adm-shell{grid-template-columns:240px minmax(0,1fr)}.adm-navigation{padding:16px 10px 16px 16px}.adm-scope{display:none}.adm-main{padding:20px}}
      @media(max-width:740px){.adm-topbar{position:relative;flex-wrap:wrap;gap:12px;padding:14px 16px}.adm-brand{min-width:0}.adm-brand strong{font-size:17px}.adm-search{width:100%}.adm-shell{grid-template-columns:minmax(0,1fr)}.adm-navigation{position:static;height:auto;max-height:none;display:grid;grid-template-columns:minmax(0,1fr);gap:8px;overflow:visible;padding:10px 16px;border-right:0;border-bottom:1px solid #D5E4EA}.adm-nav-group{margin:0;padding:10px}.adm-nav-items{grid-template-columns:repeat(auto-fit,minmax(175px,1fr))}.adm-main{padding:18px 16px}.adm-page-heading{align-items:flex-start}.adm-page-heading h1{font-size:23px}.adm-overview-grid{grid-template-columns:1fr}}
      @media(max-width:430px){.adm-brand span{font-size:9px}.adm-brand strong{font-size:16px}.adm-main{padding:16px 12px}.adm-page-heading{flex-direction:column}.adm-page-heading h1{font-size:21px}.adm-back-button{width:100%}.adm-nav-items{grid-template-columns:minmax(0,1fr)}}
    `}</style>
  </div>
}
