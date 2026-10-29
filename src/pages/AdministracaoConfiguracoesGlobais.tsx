/**
 * SYSNQRA ERP INDUSTRIAL — Administração e Configurações Globais
 * @REVISAO 28/10/2026
 * Usa entidades existentes: erp_empresas, erp_usuarios, erp_roles,
 * erp_permissions, erp_role_permissions e erp_audit_logs.
 * Não cria usuários Auth diretamente nem simula instalação de módulos.
 */
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Building2, ShieldCheck, Users, Puzzle, ScrollText, Save, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Section = 'empresa' | 'usuarios' | 'modulos' | 'logs'
type CompanyRow = Record<string, unknown> & { id: string }
type UserRow = {
  id: string; nome: string | null; email: string | null; login_nome: string | null
  perfil: string | null; nivel_admin: number | null; ativo: boolean | null
  role_id: string | null; is_master: boolean | null; deleted_at: string | null
  empresa_id: string | null; auth_user_id: string | null
}
type RoleRow = { id: string; codigo: string; nome: string; nivel: number; ativo: boolean }
type PermissionRow = { id: string; codigo: string; nome: string; modulo: string; ativo: boolean }
type AuditRow = { id: string; action: string; module: string | null; entity: string | null; entity_id: string | null; created_at: string; user_id: string | null }
const sections: { id: Section; label: string; description: string; icon: typeof Building2 }[] = [
  { id: 'empresa', label: 'Dados da empresa', description: 'Identidade corporativa e relatórios', icon: Building2 },
  { id: 'usuarios', label: 'Usuários e RBAC', description: 'Perfis e níveis de acesso', icon: Users },
  { id: 'modulos', label: 'Módulos e permissões', description: 'Catálogo real de permissões', icon: Puzzle },
  { id: 'logs', label: 'Auditoria e logs', description: 'Histórico gravado no banco', icon: ScrollText },
]
const companyFields = [
  { key: 'razao_social', label: 'Razão social', span: 'md:col-span-8' },
  { key: 'cnpj', label: 'CNPJ', span: 'md:col-span-4' },
  { key: 'nome_fantasia', label: 'Nome fantasia', span: 'md:col-span-6' },
  { key: 'inscricao_estadual', label: 'Inscrição estadual', span: 'md:col-span-6' },
  { key: 'endereco_completo', label: 'Endereço completo', span: 'md:col-span-8' },
  { key: 'telefone', label: 'Telefone', span: 'md:col-span-4' },
  { key: 'logo_url', label: 'URL do logotipo corporativo', span: 'md:col-span-12' },
] as const

export default function AdministracaoConfiguracoesGlobais() {
  const [section, setSection] = useState<Section>('empresa')
  const [company, setCompany] = useState<CompanyRow | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [permissions, setPermissions] = useState<PermissionRow[]>([])
  const [logs, setLogs] = useState<AuditRow[]>([])
  const [tenantId, setTenantId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyUser, setBusyUser] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [logSearch, setLogSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const { data: tenant, error: tenantError } = await supabase.rpc('erp_current_empresa_id')
      if (tenantError) throw tenantError
      if (typeof tenant !== 'string' || !tenant) throw new Error('Empresa da sessão não identificada. Entre com um usuário vinculado à empresa.')
      setTenantId(tenant)
      const [companyResult, usersResult, rolesResult, permissionsResult, logsResult] = await Promise.all([
        supabase.from('erp_empresas').select('*').eq('id', tenant).maybeSingle(),
        supabase.from('erp_usuarios').select('id,nome,email,login_nome,perfil,nivel_admin,ativo,role_id,is_master,deleted_at,empresa_id,auth_user_id').eq('empresa_id', tenant).is('deleted_at', null).order('nome').limit(500),
        supabase.from('erp_roles').select('id,codigo,nome,nivel,ativo').eq('ativo', true).order('nivel', { ascending: false }),
        supabase.from('erp_permissions').select('id,codigo,nome,modulo,ativo').eq('ativo', true).order('modulo').order('codigo').limit(1000),
        supabase.from('erp_audit_logs').select('id,action,module,entity,entity_id,created_at,user_id').eq('company_id', tenant).order('created_at', { ascending: false }).limit(200),
      ])
      const firstError = companyResult.error || usersResult.error || rolesResult.error || permissionsResult.error || logsResult.error
      if (firstError) throw firstError
      setCompany((companyResult.data as CompanyRow | null) ?? null)
      setUsers((usersResult.data ?? []) as UserRow[])
      setRoles((rolesResult.data ?? []) as RoleRow[])
      setPermissions((permissionsResult.data ?? []) as PermissionRow[])
      setLogs((logsResult.data ?? []) as AuditRow[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as configurações.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const saveCompany = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!company || !tenantId) return
    setSaving(true); setError(''); setMessage('')
    try {
      const payload: Record<string, unknown> = {}
      for (const field of companyFields) {
        if (Object.prototype.hasOwnProperty.call(company, field.key)) payload[field.key] = String(company[field.key] ?? '').trim() || null
      }
      if (Object.keys(payload).length === 0) throw new Error('O cadastro da empresa não possui campos corporativos compatíveis com este formulário.')
      const { error: saveError } = await supabase.from('erp_empresas').update(payload).eq('id', tenantId)
      if (saveError) throw saveError
      setMessage('Dados corporativos salvos. Os relatórios podem consumir esses dados conforme o módulo emissor.')
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao salvar os dados corporativos.') }
    finally { setSaving(false) }
  }

  const changeRole = async (user: UserRow, roleId: string) => {
    if (!tenantId || user.is_master || user.nivel_admin === 100) {
      setError('A identidade Master não pode ser alterada por esta tela.')
      return
    }
    const role = roles.find(item => item.id === roleId)
    if (!role) return
    setBusyUser(user.id); setError(''); setMessage('')
    try {
      const { error: updateError } = await supabase.from('erp_usuarios').update({ role_id: role.id }).eq('id', user.id).eq('empresa_id', tenantId).is('deleted_at', null)
      if (updateError) throw updateError
      setMessage('Perfil solicitado atualizado. O banco validará a permissão do administrador e o nível do perfil.')
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar o perfil.') }
    finally { setBusyUser(null) }
  }

  const toggleUser = async (user: UserRow, event: ChangeEvent<HTMLInputElement>) => {
    if (!tenantId || user.is_master || user.nivel_admin === 100) {
      setError('A identidade Master não pode ser alterada por esta tela.')
      event.preventDefault()
      return
    }
    setBusyUser(user.id); setError(''); setMessage('')
    try {
      const { error: updateError } = await supabase.from('erp_usuarios').update({ ativo: event.target.checked }).eq('id', user.id).eq('empresa_id', tenantId).is('deleted_at', null)
      if (updateError) throw updateError
      setMessage('Status do usuário atualizado.')
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar o status.') }
    finally { setBusyUser(null) }
  }

  const modules = Array.from(new Set(permissions.map(item => item.modulo))).sort()
  const filteredLogs = logs.filter(row => [row.action, row.module, row.entity, row.entity_id, row.user_id].some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(logSearch.trim().toLocaleLowerCase('pt-BR'))))

  return <main className="compras-page" aria-label="Administração e Configurações Globais">
    <header className="compras-header"><div><h1>Administração e Configurações Globais</h1><p>Empresa emissora, usuários, permissões por módulo e trilha de auditoria.</p></div><div className="compras-header-actions"><button type="button" className="compras-button compras-button--light" onClick={() => void load()} disabled={loading}><RefreshCw size={14}/> Atualizar</button></div></header>
    {error && <div className="compras-notice compras-notice--error" role="alert"><AlertTriangle size={15}/>{error}</div>}
    {message && <div className="compras-notice compras-notice--success" role="status"><CheckCircle2 size={15}/>{message}</div>}
    <div className="admin-global-layout">
      <aside className="admin-global-sidebar" aria-label="Seções de administração">
        <div className="admin-global-sidebar-title">PAINEL ADMINISTRATIVO<span>Configurações globais</span></div>
        {sections.map(item => <button key={item.id} type="button" onClick={() => setSection(item.id)} className={section === item.id ? 'admin-global-nav is-active' : 'admin-global-nav'}><item.icon size={16}/><span><strong>{item.label}</strong><small>{item.description}</small></span></button>)}
        <div className="admin-global-sidebar-foot"><ShieldCheck size={15}/> Controle de acesso validado pelo Supabase/RLS</div>
      </aside>
      <section className="admin-global-content">
        {loading ? <div className="compras-loading">Carregando configurações reais do ERP…</div> : <>
          {section === 'empresa' && <form onSubmit={saveCompany} className="compras-panel admin-global-panel">
            <div className="compras-panel-heading"><div><h2>Perfil corporativo da empresa</h2><p>Dados usados como fonte para identificação corporativa e documentos de saída.</p></div></div>
            {!company ? <div className="compras-empty"><Building2 size={22}/><strong>Empresa não encontrada</strong><span>Confirme o vínculo da sessão com erp_empresas.</span></div> : <>
              <div className="admin-global-logo-row"><div className="admin-global-logo-preview">{typeof company.logo_url === 'string' && company.logo_url ? <img src={company.logo_url} alt="Logotipo da empresa" /> : <Building2 size={28}/>}</div><div><strong>Logotipo corporativo</strong><p>Informe uma URL já hospedada no Storage autorizado. O upload só deve ser ativado após confirmar o bucket e suas políticas de acesso.</p></div></div>
              <div className="admin-global-fields">{companyFields.filter(field => Object.prototype.hasOwnProperty.call(company, field.key)).map(field => <label key={field.key} className={field.span}><span>{field.label}</span><input className="h-10" value={String(company[field.key] ?? '')} onChange={event => setCompany(current => current ? { ...current, [field.key]: event.target.value } : current)} /></label>)}</div>
              <div className="compras-form-footer"><span>Empresa vinculada: {tenantId}</span><button className="compras-button compras-button--primary" type="submit" disabled={saving}><Save size={14}/>{saving ? 'Salvando…' : 'Salvar dados corporativos'}</button></div>
            </>}
          </form>}
          {section === 'usuarios' && <section className="compras-panel admin-global-panel">
            <div className="compras-panel-heading"><div><h2>Controle de usuários e níveis de acesso</h2><p>Usuários existentes em erp_usuarios; convite e criação de credenciais Auth exigem o fluxo seguro de convite do servidor.</p></div><span className="admin-global-count">{users.length} usuários</span></div>
            <div className="compras-table-scroll"><table className="compras-table"><thead><tr><th>Nome / login</th><th>E-mail</th><th>Perfil RBAC</th><th>Nível</th><th>Status</th></tr></thead><tbody>{users.map(user => <tr key={user.id}><td><strong>{user.nome || user.login_nome || 'Usuário sem nome'}</strong>{user.is_master && <small className="admin-global-master">MASTER</small>}</td><td>{user.email || '—'}</td><td>{user.is_master || user.nivel_admin === 100 ? <span>Master (protegido)</span> : <select className="h-10" value={user.role_id ?? ''} disabled={busyUser === user.id} onChange={event => void changeRole(user, event.target.value)}><option value="" disabled>Perfil não definido</option>{roles.filter(role => role.nivel < 100).map(role => <option key={role.id} value={role.id}>{role.nome} ({role.codigo})</option>)}</select>}</td><td>{user.nivel_admin ?? '—'}</td><td><label className="admin-global-active"><input type="checkbox" checked={Boolean(user.ativo)} disabled={busyUser === user.id || Boolean(user.is_master) || user.nivel_admin === 100} onChange={event => void toggleUser(user, event)}/>{user.ativo ? 'Ativo' : 'Inativo'}</label></td></tr>)}</tbody></table></div>
            <p className="admin-global-note">A matriz de permissões é definida em <code>erp_permissions</code> e <code>erp_role_permissions</code>. Alterações respeitam as regras RBAC e o nível do administrador no banco.</p>
          </section>}
          {section === 'modulos' && <section className="compras-panel admin-global-panel">
            <div className="compras-panel-heading"><div><h2>Catálogo de módulos e permissões</h2><p>Leitura do catálogo RBAC existente. Instalação de módulos não é simulada nesta tela.</p></div><span className="admin-global-count">{modules.length} módulos</span></div>
            <div className="admin-global-module-grid">{modules.map(module => <article className="admin-global-module" key={module}><div><Puzzle size={16}/><strong>{module.toLocaleUpperCase('pt-BR')}</strong></div><span>{permissions.filter(item => item.modulo === module).length} permissões cadastradas</span><ul>{permissions.filter(item => item.modulo === module).map(permission => <li key={permission.id}><span>{permission.nome}</span><code>{permission.codigo}</code></li>)}</ul></article>)}</div>
            <div className="admin-global-note">Para instalar ou ativar recursos, é necessário um fluxo de migração e autorização específico. O painel não altera o banco de dados nem declara módulos instalados sem confirmação do servidor.</div>
          </section>}
          {section === 'logs' && <section className="compras-panel admin-global-panel">
            <div className="compras-panel-heading"><div><h2>Auditoria e logs</h2><p>Eventos encontrados em erp_audit_logs para a empresa atual.</p></div><span className="admin-global-count">{filteredLogs.length} eventos</span></div>
            <label className="admin-global-log-search">Pesquisar eventos<input className="h-10" value={logSearch} onChange={event => setLogSearch(event.target.value)} placeholder="Ação, módulo, entidade, ID do usuário…"/></label>
            <div className="compras-table-scroll"><table className="compras-table"><thead><tr><th>Data / hora</th><th>Ação</th><th>Módulo</th><th>Entidade</th><th>ID entidade</th><th>Usuário</th></tr></thead><tbody>{filteredLogs.map(row => <tr key={row.id}><td>{new Date(row.created_at).toLocaleString('pt-BR')}</td><td>{row.action}</td><td>{row.module || '—'}</td><td>{row.entity || '—'}</td><td>{row.entity_id || '—'}</td><td>{row.user_id || '—'}</td></tr>)}</tbody></table></div>
            {filteredLogs.length === 0 && <div className="compras-empty"><ScrollText size={22}/><strong>Nenhum evento encontrado</strong><span>Não há eventos correspondentes aos filtros no período consultado.</span></div>}
          </section>}
        </>}
      </section>
    </div>
  </main>
}
