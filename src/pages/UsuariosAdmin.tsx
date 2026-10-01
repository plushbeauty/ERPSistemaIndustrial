import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, Archive, Check, CircleHelp, ClipboardList, Copy, Edit3,
  KeyRound, Plus, RefreshCw, Search, ShieldCheck, UserCheck, UserPlus, UserRound,
  UserRoundCog, UserX, X,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type User = {
  id: string; auth_user_id: string; empresa_id: string | null; nome: string; email: string | null
  role: string; perfil?: string; is_master?: boolean; role_id: string | null; nivel_admin: number; ativo: boolean
  login_nome: string | null; created_at?: string | null; matricula?: string | null
  setor_id?: string | null; cargo_id?: string | null; deleted_at?: string | null; must_change_password?: boolean
}
type Company = { id: string; razao_social: string | null; nome_fantasia: string | null; codigo: string | null; ativo: boolean }
type Role = { id: string; company_id: string | null; codigo: string; nome: string; nivel: number; ativo: boolean }
type Permission = { id: string; codigo: string; nome: string; modulo: string; ativo: boolean }
type Grant = { role_id: string; permission_id: string }
type Override = { id: string; empresa_id: string; user_id: string; permission_id: string; effect: 'allow' | 'deny'; changed_by: string; updated_at: string }
type DepartmentGrant = { cargo_id: string; permission_id: string }
type AuditRow = { id: string; empresa_id: string | null; actor_user_id: string | null; action: string; entity_type: string; entity_id: string | null; old_data: unknown; new_data: unknown; user_agent: string | null; ip_address: string | null; created_at: string }
type AdminData = { actor: User; users: User[]; roles: Role[]; permissions: Permission[]; grants: Grant[]; overrides: Override[]; departmentGrants: DepartmentGrant[]; companies: Company[]; capabilities: { canCreateUsers: boolean; canEditUsers: boolean; canArchiveUsers: boolean; canViewAudit: boolean } }
type Tab = 'users' | 'roles' | 'permissions' | 'audit'
type UserForm = { nome: string; email: string; login_nome: string; matricula: string; role_id: string; password: string; empresa_id: string }
type RoleForm = { nome: string; codigo: string; nivel: number; empresa_id: string }

const emptyUser: UserForm = { nome: '', email: '', login_nome: '', matricula: '', role_id: '', password: '', empresa_id: '' }
const emptyRole: RoleForm = { nome: '', codigo: '', nivel: 1, empresa_id: '' }
const keyFor = (left: string, right: string) => `${left}:${right}`
const companyName = (company: Company | undefined, fallback: string | null) => company?.nome_fantasia || company?.razao_social || company?.codigo || fallback || '—'
const isMasterRole = (role: string | null | undefined) => ['MASTER', 'MASTER_ADMIN', 'SUPER_ADMIN'].includes(String(role || '').toUpperCase())
const permissionModuleName = (module: string) => module.replaceAll('_', ' ').replace(/\b\p{L}/gu, character => character.toLocaleUpperCase('pt-BR'))

export default function UsuariosAdmin() {
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState<Tab>('users')
  const [query, setQuery] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [userModal, setUserModal] = useState<'create' | 'edit' | null>(null)
  const [roleModal, setRoleModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userForm, setUserForm] = useState<UserForm>(emptyUser)
  const [roleForm, setRoleForm] = useState<RoleForm>(emptyRole)
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [rolePermissionDraft, setRolePermissionDraft] = useState<Set<string>>(new Set())

  const invokeAdmin = useCallback(async <T,>(action: string, payload: Record<string, unknown> = {}): Promise<T> => {
    const { data: response, error } = await supabase.functions.invoke('erp-user-admin', { body: { action, ...payload } })
    if (error) {
      let message = error.message || 'Falha ao chamar o serviço administrativo.'
      const context = (error as Error & { context?: Response }).context
      if (context) {
        try { message = (await context.json())?.error || message } catch { /* keep the client message */ }
      }
      throw new Error(message)
    }
    if (!response?.ok) throw new Error(response?.error || 'O serviço administrativo recusou a operação.')
    return response as T
  }, [])

  const load = useCallback(async (companyId = companyFilter) => {
    setLoading(true)
    setMessage('')
    try {
      const next = await invokeAdmin<AdminData>('list_admin_data', companyId ? { empresa_id: companyId } : {})
      setData(next)
      setSelectedRoleId(current => current && next.roles.some(role => role.id === current) ? current : '')
      setSelectedUserId(current => next.users.some(user => user.id === current && !user.deleted_at) ? current : next.users.find(user => !user.deleted_at)?.id || '')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível carregar a administração de acessos.')
    } finally {
      setLoading(false)
    }
  }, [companyFilter, invokeAdmin])

  useEffect(() => { void load() }, [load])

  const actor = data?.actor
  const isMaster = isMasterRole(actor?.perfil) && actor?.is_master === true && Number(actor?.nivel_admin) >= 100 && actor?.empresa_id === null
  const capabilities = data?.capabilities
  const users = data?.users || []
  const roles = data?.roles || []
  const permissions = data?.permissions || []
  const companies = data?.companies || []
  const activeUsers = users.filter(user => !user.deleted_at)
  const archivedUsers = users.filter(user => Boolean(user.deleted_at))
  const visibleUsers = (showArchived ? archivedUsers : activeUsers).filter(user => JSON.stringify(user).toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')))
  const selectedRole = roles.find(role => role.id === selectedRoleId) || null
  const selectedUser = activeUsers.find(user => user.id === selectedUserId) || null
  const selectedUserRole = selectedUser ? roles.find(role => role.id === selectedUser.role_id) : null
  const grants = useMemo(() => new Set((data?.grants || []).map(grant => keyFor(grant.role_id, grant.permission_id))), [data?.grants])
  const overrides = useMemo(() => new Map((data?.overrides || []).map(override => [keyFor(override.user_id, override.permission_id), override.effect])), [data?.overrides])
  const departmentGrants = useMemo(() => new Set((data?.departmentGrants || []).filter(grant => grant.cargo_id === selectedUser?.cargo_id).map(grant => grant.permission_id)), [data?.departmentGrants, selectedUser?.cargo_id])
  const moduleGroups = useMemo(() => {
    const filtered = permissions.filter(permission => `${permission.modulo} ${permission.codigo} ${permission.nome}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')))
    const grouped = filtered.reduce<Record<string, Permission[]>>((result, permission) => {
      ;(result[permission.modulo] ||= []).push(permission)
      return result
    }, {})
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
  }, [permissions, query])
  const canEditSelectedRole = Boolean(selectedRole && selectedRole.company_id && (isMaster || selectedRole.company_id === actor?.empresa_id) && (isMaster || Number(selectedRole.nivel) < Number(actor?.nivel_admin || 0)))
  const assignmentCompany = editingUser?.empresa_id || userForm.empresa_id || companyFilter || actor?.empresa_id
  const assignableRoles = roles.filter(role => !isMasterRole(role.codigo) && (role.company_id === null || role.company_id === assignmentCompany) && (isMaster || role.nivel < Number(actor?.nivel_admin || 0)))

  useEffect(() => {
    if (!selectedRole) { setRolePermissionDraft(new Set()); return }
    setRolePermissionDraft(new Set(permissions.filter(permission => grants.has(keyFor(selectedRole.id, permission.id))).map(permission => permission.id)))
  }, [selectedRole?.id, permissions, grants])

  const setOverride = async (user: User, permission: Permission, effect: string) => {
    if (!capabilities?.canEditUsers) return
    setBusy(true)
    setMessage('')
    try {
      await invokeAdmin('set_user_permission_overrides', { user_id: user.id, override: { permission_id: permission.id, effect } })
      setMessage(`Exceção atualizada: ${permission.nome} • ${user.nome}.`)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar a exceção de acesso.')
    } finally {
      setBusy(false)
    }
  }

  const saveRoleGrants = async () => {
    if (!selectedRole || !canEditSelectedRole) return
    setBusy(true)
    setMessage('')
    try {
      await invokeAdmin('set_role_permissions', { role_id: selectedRole.id, permission_ids: [...rolePermissionDraft] })
      setMessage(`Permissões do perfil ${selectedRole.nome} atualizadas e auditadas.`)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar a matriz do perfil.')
    } finally {
      setBusy(false)
    }
  }

  const setRoleModule = (module: string, checked: boolean) => {
    const ids = permissions.filter(permission => permission.modulo === module).map(permission => permission.id)
    setRolePermissionDraft(current => {
      const next = new Set(current)
      for (const id of ids) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  const openCreateUser = () => {
    setEditingUser(null)
    setUserForm({ ...emptyUser, empresa_id: companyFilter || (isMaster ? '' : actor?.empresa_id || ''), role_id: assignableRoles[0]?.id || '' })
    setTemporaryPassword('')
    setUserModal('create')
  }

  const openEditUser = (user: User) => {
    setEditingUser(user)
    setUserForm({ nome: user.nome || '', email: user.email || '', login_nome: user.login_nome || '', matricula: user.matricula || '', role_id: user.role_id || '', password: '', empresa_id: user.empresa_id || '' })
    setTemporaryPassword('')
    setUserModal('edit')
  }

  const saveUser = async () => {
    if (!userForm.nome.trim() || (!editingUser && !userForm.email.trim())) return setMessage('Preencha nome e identificador de login.')
    setBusy(true)
    setMessage('')
    setTemporaryPassword('')
    try {
      let temporary: string | undefined
      if (editingUser) {
        await invokeAdmin('update_user', { user_id: editingUser.id, nome: userForm.nome, login_nome: userForm.login_nome, matricula: userForm.matricula, role_id: userForm.role_id })
      } else {
        const result = await invokeAdmin<{ temporary_password?: string }>('create_user', { nome: userForm.nome, email: userForm.email, login_nome: userForm.login_nome, matricula: userForm.matricula, role_id: userForm.role_id, password: userForm.password || undefined, empresa_id: userForm.empresa_id || undefined })
        temporary = result.temporary_password
        if (temporary) setTemporaryPassword(temporary)
      }
      setMessage(editingUser ? 'Usuário atualizado.' : temporary ? 'Usuário criado. A senha provisória aparece uma única vez abaixo.' : 'Usuário criado.')
      setUserModal(null)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar o usuário.')
    } finally {
      setBusy(false)
    }
  }

  const resetPassword = async (user: User) => {
    if (!window.confirm(`Gerar senha provisória para ${user.nome}? A senha será exibida uma vez ao administrador, que deve entregá-la diretamente ao funcionário.`)) return
    setBusy(true)
    setTemporaryPassword('')
    setMessage('Gerando senha provisória…')
    try {
      const result = await invokeAdmin<{ temporary_password: string; message: string }>('reset_password', { user_id: user.id })
      setTemporaryPassword(result.temporary_password)
      setMessage(result.message)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível redefinir a senha.')
    } finally {
      setBusy(false)
    }
  }

  const setActive = async (user: User) => {
    const nextActive = !user.ativo
    if (!nextActive && !window.confirm(`Bloquear o acesso de ${user.nome}?`)) return
    setBusy(true)
    setMessage('')
    try {
      await invokeAdmin('set_active', { user_id: user.id, ativo: nextActive })
      setMessage(nextActive ? 'Acesso ativado.' : 'Acesso bloqueado.')
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível alterar o acesso.')
    } finally {
      setBusy(false)
    }
  }

  const archiveUser = async (user: User) => {
    if (!window.confirm(`Arquivar ${user.nome}? O acesso será bloqueado e o histórico preservado.`)) return
    setBusy(true)
    setMessage('')
    try {
      await invokeAdmin('archive_user', { user_id: user.id })
      setMessage('Usuário arquivado. O histórico foi preservado.')
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível arquivar o usuário.')
    } finally {
      setBusy(false)
    }
  }

  const restoreUser = async (user: User) => {
    if (!window.confirm(`Restaurar o acesso de ${user.nome}?`)) return
    setBusy(true)
    setMessage('')
    try {
      await invokeAdmin('restore_user', { user_id: user.id })
      setMessage('Usuário restaurado e operação registrada na auditoria.')
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível restaurar o usuário.')
    } finally {
      setBusy(false)
    }
  }

  const createRole = async () => {
    const code = roleForm.codigo.trim().toUpperCase()
    if (!roleForm.nome.trim() || !code) return setMessage('Informe o nome e o código do perfil.')
    setBusy(true)
    setMessage('')
    try {
      const result = await invokeAdmin<{ role: Role }>('create_role', { nome: roleForm.nome, codigo: code, nivel: Number(roleForm.nivel), empresa_id: roleForm.empresa_id || undefined })
      setSelectedRoleId(result.role.id)
      setRoleModal(false)
      setMessage(`Perfil ${result.role.nome} criado para a empresa.`)
      if (isMaster && roleForm.empresa_id) setCompanyFilter(roleForm.empresa_id)
      await load(roleForm.empresa_id || companyFilter)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível criar o perfil.')
    } finally {
      setBusy(false)
    }
  }

  const loadAudit = useCallback(async () => {
    setBusy(true)
    setMessage('')
    try {
      const result = await invokeAdmin<{ audit: AuditRow[] }>('list_audit', companyFilter ? { empresa_id: companyFilter } : {})
      setAuditRows(result.audit)
      setAuditLoaded(true)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível carregar a auditoria.')
    } finally {
      setBusy(false)
    }
  }, [companyFilter, invokeAdmin])

  const [auditRows, setAuditRows] = useState<AuditRow[]>([])
  const [auditLoaded, setAuditLoaded] = useState(false)
  useEffect(() => { if (tab === 'audit' && capabilities?.canViewAudit && !auditLoaded) void loadAudit() }, [tab, capabilities?.canViewAudit, auditLoaded, companyFilter, loadAudit])

  const changeTab = (next: Tab) => {
    setQuery('')
    setTab(next)
    if (next === 'audit') { setAuditLoaded(false); setAuditRows([]) }
  }

  const copyTemporaryPassword = async () => {
    try { await navigator.clipboard.writeText(temporaryPassword); setMessage('Senha provisória copiada. Entregue-a ao funcionário por um canal privado.') }
    catch { setMessage('Não foi possível copiar a senha automaticamente. Selecione e copie o texto exibido.') }
  }

  const saveRoleDraftToggle = (permissionId: string) => setRolePermissionDraft(current => {
    const next = new Set(current)
    if (next.has(permissionId)) next.delete(permissionId)
    else next.add(permissionId)
    return next
  })

  return <main className="access-admin crud-page">
    <header className="access-admin__header">
      <div>
        <span className="v2-eyebrow">ADMINISTRAÇÃO • IDENTIDADE • RBAC</span>
        <h1>Controle de acessos</h1>
        <p>Equipe, perfis, permissões por módulo e trilha de auditoria. As decisões são verificadas novamente no servidor.</p>
      </div>
      <div className="access-admin__header-actions">
        {isMaster && <label className="access-admin__company">Empresa
          <select value={companyFilter} onChange={event => { setCompanyFilter(event.target.value); setAuditLoaded(false); setAuditRows([]); void load(event.target.value) }} disabled={loading || busy}>
            <option value="">Todas as empresas</option>
            {companies.map(company => <option key={company.id} value={company.id}>{companyName(company, company.id)}</option>)}
          </select>
        </label>}
        <button type="button" className="access-admin__button" onClick={() => void load()} disabled={loading || busy}><RefreshCw size={16}/>{loading ? 'Carregando…' : 'Atualizar'}</button>
        {tab === 'users' && capabilities?.canCreateUsers && <button type="button" className="access-admin__button access-admin__button--primary" onClick={openCreateUser}><UserPlus size={16}/>Novo usuário</button>}
        {tab === 'roles' && capabilities?.canCreateUsers && <button type="button" className="access-admin__button access-admin__button--primary" onClick={() => { setRoleForm({ ...emptyRole, empresa_id: companyFilter || (isMaster ? '' : actor?.empresa_id || '') }); setRoleModal(true) }}><Plus size={16}/>Novo perfil</button>}
      </div>
    </header>

    {message && <div className="access-admin__notice" role="status">{message}{temporaryPassword && <div className="access-admin__temp-password"><KeyRound size={16}/><strong>Senha provisória:</strong><code>{temporaryPassword}</code><button type="button" onClick={() => void copyTemporaryPassword()} title="Copiar senha"><Copy size={15}/></button><button type="button" onClick={() => setTemporaryPassword('')} title="Ocultar senha"><X size={15}/></button></div>}</div>}

    <nav className="access-admin__tabs" aria-label="Administração de acessos">
      {([
        ['users', 'Usuários', UserRound], ['roles', 'Perfis', ShieldCheck], ['permissions', 'Permissões', UserRoundCog], ['audit', 'Auditoria', Activity],
      ] as const).map(([id, label, Icon]) => <button key={id} type="button" aria-selected={tab === id} onClick={() => changeTab(id)} className={tab === id ? 'is-active' : ''}><Icon size={16}/>{label}{id === 'audit' && capabilities?.canViewAudit && <span>{auditRows.length || ''}</span>}</button>)}
    </nav>

    {loading && !data ? <section className="access-admin__empty">Carregando dados de acesso…</section> : !data ? <section className="access-admin__empty">{message || 'Não foi possível abrir o controle de acessos.'}</section> : <>
      {tab === 'users' && <section className="access-admin__panel">
        <div className="access-admin__toolbar">
          <label className="access-admin__search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar nome, login, matrícula ou perfil"/></label>
          <label className="access-admin__check"><input type="checkbox" checked={showArchived} onChange={event => setShowArchived(event.target.checked)}/>Exibir arquivados ({archivedUsers.length})</label>
          <span className="access-admin__count">{visibleUsers.length} registro(s)</span>
        </div>
        <div className="access-admin__table-wrap"><table className="access-admin__table"><thead><tr><th>Usuário</th><th>Login interno</th><th>Empresa</th><th>Perfil</th><th>Estado</th><th>Ações</th></tr></thead><tbody>
          {visibleUsers.map(user => {
            const role = roles.find(item => item.id === user.role_id) || roles.find(item => item.codigo === (user.perfil || user.role))
            const scoped = isMaster || (user.empresa_id === actor?.empresa_id && Number(user.nivel_admin || 0) < Number(actor?.nivel_admin || 0))
            return <tr key={user.id}>
              <td><strong>{user.nome}</strong><small>{user.matricula || user.setor_id || 'Sem matrícula'}</small></td>
              <td><code>{user.login_nome || user.email || '—'}</code>{user.must_change_password && <small className="access-admin__warning">Troca de senha pendente</small>}</td>
              <td>{companyName(companies.find(company => company.id === user.empresa_id), user.empresa_id)}</td>
              <td>{role?.nome || user.perfil || user.role || `Nível ${user.nivel_admin}`}</td>
              <td><span className={`access-admin__state ${user.deleted_at ? 'is-archived' : user.ativo ? 'is-active' : 'is-off'}`}>{user.deleted_at ? 'Arquivado' : user.ativo ? 'Ativo' : 'Bloqueado'}</span></td>
              <td><div className="access-admin__row-actions">
                {user.deleted_at ? <button type="button" disabled={busy || !capabilities?.canArchiveUsers || !scoped} onClick={() => void restoreUser(user)}><UserCheck size={14}/>Restaurar</button> : <>
                  {capabilities?.canEditUsers && scoped && user.id !== actor?.id && <><button type="button" disabled={busy} onClick={() => openEditUser(user)} title="Editar usuário"><Edit3 size={14}/></button><button type="button" disabled={busy} onClick={() => void resetPassword(user)} title="Gerar senha provisória"><KeyRound size={14}/></button></>}
                  {capabilities?.canArchiveUsers && scoped && user.id !== actor?.id && <><button type="button" disabled={busy} onClick={() => void setActive(user)} title={user.ativo ? 'Bloquear acesso' : 'Ativar acesso'}>{user.ativo ? <UserX size={14}/> : <UserCheck size={14}/>}</button><button type="button" disabled={busy} onClick={() => void archiveUser(user)} title="Arquivar mantendo histórico"><Archive size={14}/></button></>}
                </>}
              </div></td>
            </tr>
          })}
          {!visibleUsers.length && <tr><td colSpan={6} className="access-admin__empty-cell">{showArchived ? 'Nenhum usuário arquivado encontrado.' : 'Nenhum usuário encontrado.'}</td></tr>}
        </tbody></table></div>
      </section>}

      {tab === 'roles' && <section className="access-admin__panel access-admin__role-list">
        <div className="access-admin__toolbar"><label className="access-admin__search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar perfil"/></label><span className="access-admin__count">{roles.filter(role => `${role.nome} ${role.codigo}`.toLowerCase().includes(query.toLowerCase())).length} perfil(is)</span></div>
        <div className="access-admin__table-wrap"><table className="access-admin__table"><thead><tr><th>Perfil</th><th>Código</th><th>Escopo</th><th>Nível</th><th>Permissões ativas</th><th>Configurar</th></tr></thead><tbody>
          {roles.filter(role => `${role.nome} ${role.codigo}`.toLowerCase().includes(query.toLowerCase())).map(role => <tr key={role.id}>
            <td><strong>{role.nome}</strong></td><td><code>{role.codigo}</code></td><td>{role.company_id ? companyName(companies.find(company => company.id === role.company_id), role.company_id) : <span className="access-admin__state is-template">Modelo padrão</span>}</td><td>{role.nivel}</td>
            <td>{data.grants.filter(grant => grant.role_id === role.id).length} / {permissions.length}</td>
            <td><button className="access-admin__text-button" type="button" onClick={() => { setSelectedRoleId(role.id); changeTab('permissions') }}><ShieldCheck size={14}/>{role.company_id ? 'Editar matriz' : 'Ver matriz'}</button></td>
          </tr>)}
        </tbody></table></div>
        <p className="access-admin__hint"><CircleHelp size={15}/>Modelos padrão são mantidos pelo sistema. Crie um perfil por empresa para personalizar acessos sem alterar os modelos compartilhados.</p>
      </section>}

      {tab === 'permissions' && <section className="access-admin__permissions-layout">
        <aside className="access-admin__selector">
          <div className="access-admin__selector-title"><ShieldCheck size={16}/><strong>Matriz de acesso</strong></div>
          <label>Aplicar a
            <select value={selectedRoleId ? `role:${selectedRoleId}` : selectedUserId ? `user:${selectedUserId}` : ''} onChange={event => {
              const [kind, id] = event.target.value.split(':')
              if (kind === 'role') { setSelectedRoleId(id); setSelectedUserId('') }
              else { setSelectedUserId(id); setSelectedRoleId('') }
            }}>
              <optgroup label="Perfis">
                {roles.map(role => <option key={role.id} value={`role:${role.id}`}>{role.nome}{role.company_id ? '' : ' • modelo'}</option>)}
              </optgroup>
              <optgroup label="Usuários">
                {activeUsers.map(user => <option key={user.id} value={`user:${user.id}`}>{user.nome}</option>)}
              </optgroup>
            </select>
          </label>
          <div className="access-admin__selector-note"><strong>{selectedRole ? selectedRole.nome : selectedUser?.nome || 'Selecione uma pessoa ou perfil'}</strong><span>{selectedRole ? selectedRole.company_id ? companyName(companies.find(company => company.id === selectedRole.company_id), selectedRole.company_id) : 'Modelo padrão • somente consulta' : selectedUserRole?.nome || 'Sem perfil associado'}</span></div>
          {selectedRole && <><button type="button" className="access-admin__button access-admin__button--primary" onClick={() => void saveRoleGrants()} disabled={busy || !canEditSelectedRole}><Check size={15}/>Salvar matriz</button>{!canEditSelectedRole && <small>Selecione um perfil da empresa em que você tem permissão para alterar acessos.</small>}</>}
        </aside>
        <div className="access-admin__matrix">
          <div className="access-admin__toolbar"><label className="access-admin__search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filtrar operações do catálogo"/></label><span className="access-admin__legend"><i className="is-allow"/>Permitido <i className="is-deny"/>Bloqueado <i className="is-inherit"/>Herdado</span></div>
          {!selectedRole && !selectedUser && <div className="access-admin__empty">Escolha um perfil ou usuário na coluna ao lado.</div>}
          {moduleGroups.map(([module, items]) => {
            const roleAll = Boolean(selectedRole) && items.every(permission => rolePermissionDraft.has(permission.id))
            const roleSome = Boolean(selectedRole) && items.some(permission => rolePermissionDraft.has(permission.id))
            return <section className="access-admin__module" key={module}>
              <header><div><span>{permissionModuleName(module)}</span><small>{items.length} operações</small></div>{selectedRole && <label className="access-admin__check"><input type="checkbox" checked={roleAll} ref={element => { if (element) element.indeterminate = roleSome && !roleAll }} onChange={event => setRoleModule(module, event.target.checked)} disabled={!canEditSelectedRole || busy}/>Marcar módulo</label>}</header>
              <div className="access-admin__permission-table"><div className="access-admin__permission-head"><span>Operação</span><span>{selectedRole ? 'Acesso no perfil' : 'Acesso individual'}</span><span>Origem / efeito</span></div>
                {items.map(permission => {
                  const roleGranted = Boolean(selectedUserRole && grants.has(keyFor(selectedUserRole.id, permission.id)))
                  const departmentGranted = Boolean(selectedUser?.cargo_id && departmentGrants.has(permission.id))
                  const inherited = roleGranted || departmentGranted
                  const override = selectedUser ? overrides.get(keyFor(selectedUser.id, permission.id)) || 'inherit' : 'inherit'
      const masterUser = Boolean(selectedUser?.is_master && selectedUser.perfil === 'MASTER' && selectedUser.nivel_admin >= 100 && selectedUser.empresa_id === null)
      const effective = masterUser || (override === 'allow' ? true : override === 'deny' ? false : inherited)
      const source = masterUser ? 'Acesso global MASTER' : override !== 'inherit' ? (override === 'allow' ? 'Exceção: permitir' : 'Exceção: bloquear') : roleGranted && departmentGranted ? 'Perfil + cargo' : roleGranted ? 'Herdado do perfil' : departmentGranted ? 'Herdado do cargo' : 'Negado pelo perfil e cargo'
                  return <div className="access-admin__permission-row" key={permission.id}>
                    <span><strong>{permission.nome}</strong><small>{permission.codigo}</small></span>
                    {selectedRole ? <label className="access-admin__check"><input type="checkbox" checked={rolePermissionDraft.has(permission.id)} onChange={() => saveRoleDraftToggle(permission.id)} disabled={!canEditSelectedRole || busy}/>{rolePermissionDraft.has(permission.id) ? 'Permitir' : 'Negar'}</label> : selectedUser ? <select aria-label={`Permissão individual: ${permission.nome}`} value={override} onChange={event => void setOverride(selectedUser, permission, event.target.value)} disabled={busy || masterUser || !capabilities?.canEditUsers || !isMaster && selectedUser.empresa_id !== actor?.empresa_id || !isMaster && selectedUser.nivel_admin >= Number(actor?.nivel_admin || 0)}><option value="inherit">Herdar</option><option value="allow">Permitir</option><option value="deny">Bloquear</option></select> : <span>—</span>}
                    <span className={`access-admin__effective ${effective ? 'is-allow' : 'is-deny'}`}>{source}</span>
                  </div>
                })}
              </div>
            </section>
          })}
        </div>
      </section>}

      {tab === 'audit' && <section className="access-admin__panel">
        {!capabilities?.canViewAudit ? <div className="access-admin__empty"><ShieldCheck size={20}/>Seu perfil não tem acesso à trilha de auditoria.</div> : <>
          <div className="access-admin__toolbar"><span className="access-admin__count">{auditLoaded ? `${auditRows.length} eventos recentes` : 'A trilha registra alterações de usuários e perfis.'}</span><button type="button" className="access-admin__button" onClick={() => void loadAudit()} disabled={busy}><RefreshCw size={15}/>Atualizar histórico</button></div>
          <div className="access-admin__table-wrap"><table className="access-admin__table"><thead><tr><th>Data e hora</th><th>Ação</th><th>Usuário afetado</th><th>Responsável</th><th>Agente / IP</th><th>Alterações</th></tr></thead><tbody>
            {auditRows.map(row => <tr key={row.id}>
              <td>{new Date(row.created_at).toLocaleString('pt-BR')}</td><td><code>{row.action}</code><small>{row.entity_type}</small></td><td>{users.find(user => user.id === row.entity_id)?.nome || roles.find(role => role.id === row.entity_id)?.nome || <code>{row.entity_id || '—'}</code>}</td><td>{users.find(user => user.id === row.actor_user_id)?.nome || <code>{row.actor_user_id || '—'}</code>}</td><td><small>{row.user_agent || '—'}</small><small>{row.ip_address || 'IP não informado'}</small></td><td><details><summary>Ver antes/depois</summary><pre>{JSON.stringify({ antes: row.old_data, depois: row.new_data }, null, 2)}</pre></details></td>
            </tr>)}
            {auditLoaded && !auditRows.length && <tr><td colSpan={6} className="access-admin__empty-cell">Nenhum evento de auditoria encontrado.</td></tr>}
          </tbody></table></div>
          <p className="access-admin__hint"><ClipboardList size={15}/>São exibidos até 300 eventos recentes, limitados ao escopo da sua empresa.</p>
        </>}
      </section>}
    </>}

    {userModal && <div role="dialog" aria-modal="true" aria-labelledby="access-user-modal-title" className="access-admin__modal-backdrop"><section className="access-admin__modal">
      <header><div><span className="v2-eyebrow">CADASTRO DE ACESSO</span><h2 id="access-user-modal-title">{editingUser ? 'Editar usuário' : 'Novo usuário'}</h2></div><button type="button" onClick={() => setUserModal(null)} disabled={busy} aria-label="Fechar"><X size={18}/></button></header>
      <div className="access-admin__form-grid">
        <label>Nome completo<input value={userForm.nome} onChange={event => setUserForm({ ...userForm, nome: event.target.value })} autoFocus/></label>
        <label>Identificador interno de autenticação<input type="text" value={userForm.email} onChange={event => setUserForm({ ...userForm, email: event.target.value })} placeholder="matricula@login.local" disabled={Boolean(editingUser)}/><small>É usado como identificador de login do Supabase. Não enviamos convite nem redefinição para esse endereço.</small></label>
        <label>Login / matrícula<input value={userForm.login_nome} onChange={event => setUserForm({ ...userForm, login_nome: event.target.value })} placeholder="Login curto (opcional)"/></label>
        <label>Matrícula<input value={userForm.matricula} onChange={event => setUserForm({ ...userForm, matricula: event.target.value })}/></label>
        <label>Perfil de acesso<select value={userForm.role_id} onChange={event => setUserForm({ ...userForm, role_id: event.target.value })}><option value="">Selecione o perfil</option>{assignableRoles.map(role => <option key={role.id} value={role.id}>{role.nome} · nível {role.nivel}</option>)}</select></label>
        {isMaster && !editingUser && <label>Empresa<select value={userForm.empresa_id} onChange={event => setUserForm({ ...userForm, empresa_id: event.target.value, role_id: '' })}><option value="">Selecione a empresa</option>{companies.map(company => <option key={company.id} value={company.id}>{companyName(company, company.id)}</option>)}</select></label>}
        {!editingUser && <label>Senha inicial (opcional)<input type="password" autoComplete="new-password" value={userForm.password} onChange={event => setUserForm({ ...userForm, password: event.target.value })} placeholder="Vazia = gerar senha provisória"/><small>O funcionário receberá a senha do ADM e será obrigado a trocá-la no primeiro acesso.</small></label>}
      </div>
      <footer><button type="button" className="access-admin__button" onClick={() => setUserModal(null)} disabled={busy}>Cancelar</button><button type="button" className="access-admin__button access-admin__button--primary" onClick={() => void saveUser()} disabled={busy}>{busy ? 'Salvando…' : editingUser ? 'Salvar alterações' : 'Criar usuário'}<Check size={15}/></button></footer>
    </section></div>}

    {roleModal && <div role="dialog" aria-modal="true" aria-labelledby="access-role-modal-title" className="access-admin__modal-backdrop"><section className="access-admin__modal access-admin__modal--compact">
      <header><div><span className="v2-eyebrow">PERFIL PERSONALIZADO</span><h2 id="access-role-modal-title">Novo perfil de empresa</h2></div><button type="button" onClick={() => setRoleModal(false)} disabled={busy} aria-label="Fechar"><X size={18}/></button></header>
      <div className="access-admin__form-grid"><label>Nome do perfil<input value={roleForm.nome} onChange={event => setRoleForm({ ...roleForm, nome: event.target.value, codigo: event.target.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 28) })} placeholder="Ex.: Supervisor de qualidade"/></label><label>Código único<input value={roleForm.codigo} onChange={event => setRoleForm({ ...roleForm, codigo: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 40) })} placeholder="SUPERVISOR_QUALIDADE"/></label><label>Nível de acesso<input type="number" min={1} max={isMaster ? 9 : Math.max(1, Number(actor?.nivel_admin || 2) - 1)} value={roleForm.nivel} onChange={event => setRoleForm({ ...roleForm, nivel: Number(event.target.value) })}/></label>{isMaster && <label>Empresa<select value={roleForm.empresa_id} onChange={event => setRoleForm({ ...roleForm, empresa_id: event.target.value })}><option value="">Selecione a empresa</option>{companies.map(company => <option key={company.id} value={company.id}>{companyName(company, company.id)}</option>)}</select></label>}</div>
      <p className="access-admin__hint"><CircleHelp size={15}/>Depois de criar, defina as operações na aba Permissões. Perfis sem permissões começam sem acesso.</p>
      <footer><button type="button" className="access-admin__button" onClick={() => setRoleModal(false)} disabled={busy}>Cancelar</button><button type="button" className="access-admin__button access-admin__button--primary" onClick={() => void createRole()} disabled={busy}>{busy ? 'Criando…' : 'Criar perfil'}<Plus size={15}/></button></footer>
    </section></div>}
  </main>
}
