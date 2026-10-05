import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit3,
  KeyRound,
  MailPlus,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  UserRound,
  UserX,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog'
import '../styles/premium-workspaces.css'

type User = {
  id: string
  auth_user_id?: string | null
  empresa_id: string | null
  nome: string
  email: string | null
  perfil?: string | null
  is_master?: boolean | null
  role: string
  role_id: string | null
  nivel_admin: number
  ativo: boolean
  login_nome: string | null
  created_at?: string | null
  matricula?: string | null
  setor_id?: string | null
  cargo_id?: string | null
}
type Company = {
  id: string
  razao_social: string | null
  nome_fantasia: string | null
  codigo: string | null
  ativo: boolean
  plano: string | null
  plano_status: string | null
}
type Role = { id: string; codigo: string; nome: string; nivel: number; empresa_id: string | null }
type FormState = { nome: string; email: string; login_nome: string; matricula: string; role_id: string; password: string; empresa_id: string }
type StatusFilter = 'all' | 'active' | 'inactive'

const emptyForm: FormState = { nome: '', email: '', login_nome: '', matricula: '', role_id: '', password: '', empresa_id: '' }
const masterAccount = (user: User | null) => user?.is_master === true
  && Number(user.nivel_admin) >= 100
  && user.empresa_id === null
  && String(user.perfil ?? '').trim().toUpperCase() === 'MASTER'
const masterRole = (role: string) => role.trim().toUpperCase() === 'MASTER'
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase() || 'U'

export default function UsuariosAdmin() {
  const [users, setUsers] = useState<User[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [actor, setActor] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(0)
  const [busy, setBusy] = useState(false)
  const [permissionFlags, setPermissionFlags] = useState({ edit: false, create: false, archive: false })
  const [modal, setModal] = useState<'create' | 'edit' | 'invite' | null>(null)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [temporaryPassword, setTemporaryPassword] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const auth = (await supabase.auth.getUser()).data.user
      if (!auth) throw new Error('Sessão não encontrada.')
      const { data: actorRow, error: actorError } = await supabase
        .from('erp_usuarios')
        .select('id,auth_user_id,empresa_id,nome,email,role,perfil,is_master,role_id,nivel_admin,ativo,login_nome,created_at,matricula,setor_id,cargo_id')
        .eq('auth_user_id', auth.id)
        .is('deleted_at', null)
        .maybeSingle()
      if (actorError) throw actorError
      if (!actorRow) throw new Error('Usuário autenticado não está vinculado ao ERP.')
      const currentActor = actorRow as User
      setActor(currentActor)

      let usersQuery = supabase
        .from('erp_usuarios')
        .select('id,auth_user_id,empresa_id,nome,email,role,perfil,is_master,role_id,nivel_admin,ativo,login_nome,created_at,matricula,setor_id,cargo_id')
        .is('deleted_at', null)
        .order('nome')
      if (masterAccount(currentActor)) usersQuery = usersQuery.not('empresa_id', 'is', null)
      else usersQuery = usersQuery.eq('empresa_id', currentActor.empresa_id)

      const [usersResult, companiesResult, rolesResult, editPermission, createPermission, archivePermission] = await Promise.all([
        fetchAllPages<User>((from, to) => usersQuery.range(from, to)),
        fetchAllPages<Company>((from, to) => supabase.from('erp_empresas').select('id,razao_social,nome_fantasia,codigo,ativo,plano,plano_status', { count: 'exact' }).order('nome_fantasia').range(from, to)),
        fetchAllPages<Role>((from, to) => supabase.from('erp_roles').select('id,codigo,nome,nivel,empresa_id', { count: 'exact' }).eq('ativo', true).order('nivel', { ascending: false }).range(from, to)),
        supabase.rpc('erp_has_permission', { p_modulo: 'usuarios', p_acao: 'editar' }),
        supabase.rpc('erp_has_permission', { p_modulo: 'usuarios', p_acao: 'criar' }),
        supabase.rpc('erp_has_permission', { p_modulo: 'usuarios', p_acao: 'excluir' }),
      ])
      setUsers(usersResult)
      setCompanies(companiesResult)
      setRoles(rolesResult)
      setPermissionFlags({ edit: editPermission.data === true, create: createPermission.data === true, archive: archivePermission.data === true })
      const permissionError = editPermission.error || createPermission.error || archivePermission.error
      setMessage(permissionError ? 'As ações de usuário foram bloqueadas porque não foi possível validar o RBAC. Aplique as migrations administrativas pendentes.' : '')
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Não foi possível carregar usuários.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const actorLevel = Number(actor?.nivel_admin || 0)
  const isMaster = masterAccount(actor)
  const canManage = isMaster || (actorLevel >= 8 && permissionFlags.edit)
  const canCreate = isMaster || (actorLevel >= 8 && permissionFlags.create)
  const canArchive = isMaster || (actorLevel >= 8 && permissionFlags.archive)
  const availableRoles = roles.filter((role) => role.codigo !== 'MASTER' && role.nivel < actorLevel
    && (role.empresa_id === null || role.empresa_id === (isMaster ? form.empresa_id : actor?.empresa_id)))
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return users.filter((user) => {
      const companyMatch = !companyFilter || user.empresa_id === companyFilter
      const statusMatch = statusFilter === 'all' || user.ativo === (statusFilter === 'active')
      const searchMatch = !term || [user.nome, user.email, user.login_nome, user.matricula, user.role]
        .some((value) => String(value ?? '').toLocaleLowerCase('pt-BR').includes(term))
      return companyMatch && statusMatch && searchMatch
    })
  }, [users, companyFilter, statusFilter, search])
  const pageSize = 25
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageUsers = filtered.slice(page * pageSize, (page + 1) * pageSize)
  useEffect(() => { setPage(0) }, [search, companyFilter, statusFilter])

  const activeCount = users.filter((user) => user.ativo).length
  const inactiveCount = users.length - activeCount

  const openCreate = (mode: 'create' | 'invite') => {
    setEditing(null)
    setTemporaryPassword('')
    setForm({ ...emptyForm, empresa_id: isMaster ? companyFilter : actor?.empresa_id || '', role_id: availableRoles.find((role) => role.codigo === 'OPERATOR')?.id || availableRoles[0]?.id || '' })
    setModal(mode)
  }

  const openEdit = (user: User) => {
    setEditing(user)
    setTemporaryPassword('')
    setForm({
      nome: user.nome || '',
      email: user.email || '',
      login_nome: user.login_nome || '',
      matricula: user.matricula || '',
      role_id: user.role_id || roles.find((role) => role.codigo === user.role && (role.empresa_id === null || role.empresa_id === user.empresa_id))?.id || '',
      password: '',
      empresa_id: user.empresa_id || '',
    })
    setModal('edit')
  }

  const submit = async () => {
    if (!form.nome.trim() || !form.email.trim()) {
      setMessage('Nome e e-mail são obrigatórios.')
      return
    }
    setBusy(true)
    setMessage('')
    setTemporaryPassword('')
    try {
      const action = modal === 'edit' ? 'update_user' : modal === 'invite' ? 'invite_user' : 'create_user'
      if (isMaster && !form.empresa_id) throw new Error('Selecione a empresa do novo usuário.')
      const body = modal === 'edit'
        ? { action, user_id: editing?.id, empresa_id: form.empresa_id, nome: form.nome, login_nome: form.login_nome, matricula: form.matricula, role_id: form.role_id }
        : { action, empresa_id: form.empresa_id, nome: form.nome, email: form.email, login_nome: form.login_nome, matricula: form.matricula, role_id: form.role_id, password: form.password || undefined }
      const { data, error } = await supabase.functions.invoke('erp-user-admin', { body })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error || 'Não foi possível concluir a operação.')
      if (data.temporary_password) setTemporaryPassword(data.temporary_password)
      setMessage([data.message || (modal === 'invite' ? 'Convite enviado por e-mail.' : modal === 'edit' ? 'Usuário atualizado.' : 'Usuário criado.'), data.audit_warning].filter(Boolean).join(' '))
      setModal(null)
      await load()
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Não foi possível concluir a operação.')
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (user: User) => {
    if (!actor) return
    if (!isMaster && user.empresa_id !== actor.empresa_id) {
      setMessage('Operação recusada: empresa diferente.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const { data, error } = await supabase.functions.invoke('erp-user-admin', { body: { action: 'set_active', user_id: user.id, empresa_id: user.empresa_id, ativo: !user.ativo } })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error || 'Não foi possível alterar o usuário.')
      setMessage([data.message || (user.ativo ? 'Usuário desativado.' : 'Usuário ativado.'), data.audit_warning].filter(Boolean).join(' '))
      await load()
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Não foi possível alterar o usuário.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (user: User) => {
    if (!actor) return
    if (!isMaster && user.empresa_id !== actor.empresa_id) {
      setMessage('Operação recusada: empresa diferente.')
      return
    }
    if (user.id === actor.id) {
      setMessage('O próprio usuário não pode ser excluído.')
      return
    }
    if (!window.confirm(`Remover o acesso de ${user.nome}? O perfil ERP será arquivado para preservar a auditoria e o histórico.`)) return
    setBusy(true)
    setMessage('Excluindo usuário…')
    try {
      const { data, error } = await supabase.functions.invoke('erp-user-admin', { body: { action: 'delete_user', user_id: user.id, empresa_id: user.empresa_id } })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error || 'Não foi possível excluir o usuário.')
      setMessage([data.message || 'Acesso removido.', data.audit_warning].filter(Boolean).join(' '))
      await load()
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Não foi possível excluir o usuário.')
    } finally {
      setBusy(false)
    }
  }

  const resetPassword = async (user: User) => {
    setBusy(true)
    setMessage('')
    setTemporaryPassword('')
    try {
      const { data, error } = await supabase.functions.invoke('erp-user-admin', { body: { action: 'reset_password', user_id: user.id, empresa_id: user.empresa_id } })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error || 'Não foi possível redefinir a senha.')
      setTemporaryPassword(data.temporary_password || '')
      setMessage([data.message || 'Senha redefinida.', data.audit_warning].filter(Boolean).join(' '))
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Não foi possível redefinir a senha.')
    } finally {
      setBusy(false)
    }
  }

  const selectedCompanyName = (id: string | null) => companies.find((company) => company.id === id)?.nome_fantasia
    || companies.find((company) => company.id === id)?.razao_social
    || 'Empresa não identificada'

  return (
    <main className="user-admin">
      <section className="user-admin-heading">
        <div>
          <div className="user-admin-eyebrow"><ShieldCheck size={15} /> SEGURANÇA / RBAC / MULTIEMPRESA</div>
          <h1>Usuários e permissões</h1>
          <p>Gerencie as contas, convites e perfis de acesso da sua organização.</p>
        </div>
        <div className="user-admin-heading-actions">
          <button type="button" className="user-button user-button--secondary" onClick={() => void load()} disabled={loading || busy}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
          {canCreate && <>
            <button type="button" className="user-button user-button--secondary" onClick={() => openCreate('invite')} disabled={busy}><MailPlus size={16} /> Enviar convite</button>
            <button type="button" className="user-button user-button--primary" onClick={() => openCreate('create')} disabled={busy}><UserPlus size={16} /> Novo usuário</button>
          </>}
        </div>
      </section>

      {message && <div className="user-admin-notice" role="status">
        <span>{message}</span>
        <button type="button" aria-label="Fechar aviso" onClick={() => setMessage('')}><X size={16} /></button>
      </div>}
      {temporaryPassword && <div className="user-password-notice" role="alert">
        <KeyRound size={19} />
        <div><strong>Senha temporária gerada</strong><span>{temporaryPassword} — entregue ao usuário e solicite a troca no primeiro acesso.</span></div>
        <button type="button" aria-label="Fechar aviso de senha" onClick={() => setTemporaryPassword('')}><X size={16} /></button>
      </div>}

      <section className="user-admin-summary" aria-label="Resumo de usuários">
        <article><span>Usuários na lista</span><strong>{users.length}</strong><small>contas cadastradas</small></article>
        <article><span>Ativos</span><strong>{activeCount}</strong><small>com acesso habilitado</small></article>
        <article><span>Inativos</span><strong>{inactiveCount}</strong><small>acesso desabilitado</small></article>
        <article><span>Perfis disponíveis</span><strong>{roles.length}</strong><small>políticas RBAC ativas</small></article>
      </section>
      <section className="user-admin-card">
        <div className="user-admin-toolbar">
          <label className="user-admin-search">
            <Search size={17} />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nome, e-mail, login ou matrícula" aria-label="Buscar usuários" />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="Limpar busca"><X size={15} /></button>}
          </label>
          {isMaster && <label className="user-admin-company-filter">
            <Building2 size={16} />
            <select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)} aria-label="Filtrar por empresa">
              <option value="">Todas as empresas</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.nome_fantasia || company.razao_social || company.codigo || company.id}</option>)}
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </label>}
          <div className="user-admin-count">{filtered.length} de {users.length} usuários</div>
        </div>

        <div className="user-admin-tabs" role="tablist" aria-label="Filtrar usuários por status">
          {([
            ['all', 'Todos', users.length],
            ['active', 'Ativos', activeCount],
            ['inactive', 'Inativos', inactiveCount],
          ] as Array<[StatusFilter, string, number]>).map(([value, label, count]) => (
            <button key={value} type="button" role="tab" aria-selected={statusFilter === value} className={statusFilter === value ? 'is-active' : ''} onClick={() => setStatusFilter(value)}>
              {label}<span>{count}</span>
            </button>
          ))}
        </div>

        <div className="user-admin-table-wrap">
          <table className="user-admin-table">
            <thead><tr><th>Usuário</th><th>Organização</th><th>Perfil de acesso</th><th>Status</th><th><span className="sr-only">Ações</span></th></tr></thead>
            <tbody>
              {pageUsers.map((user) => {
                const role = roles.find((item) => item.id === user.role_id) || roles.find((item) => item.codigo === user.role) || roles.find((item) => item.nivel === user.nivel_admin)
                const canManageUser = canManage && user.id !== actor?.id
                  && (isMaster ? Boolean(user.empresa_id) : user.empresa_id === actor?.empresa_id)
                  && (isMaster || Number(user.nivel_admin) < actorLevel)
                return <tr key={user.id}>
                  <td>
                    <div className="user-admin-person">
                      <span className={`user-admin-avatar${user.ativo ? '' : ' is-inactive'}`} aria-hidden="true">{initials(user.nome)}</span>
                      <span className="user-admin-person-details"><strong>{user.nome}</strong><small>{user.email || 'E-mail não informado'}</small><small>{user.login_nome || user.matricula || 'Login não informado'}</small></span>
                    </div>
                  </td>
                  <td><span className="user-admin-company">{selectedCompanyName(user.empresa_id)}</span>{user.matricula && <small className="user-admin-subline">Matrícula {user.matricula}</small>}</td>
                  <td><span className="user-admin-role">{masterRole(user.role) && <ShieldCheck size={15} />}{role?.nome || user.role || `Nível ${user.nivel_admin}`}</span><small className="user-admin-subline">Nível {role?.nivel ?? user.nivel_admin}</small></td>
                  <td><span className={`user-admin-status${user.ativo ? ' is-active' : ' is-inactive'}`}>{user.ativo ? <UserCheck size={14} /> : <UserX size={14} />}{user.ativo ? 'Ativo' : 'Inativo'}</span></td>
                  <td>
                    {canManageUser && <div className="user-admin-actions">
                      <button type="button" className="user-icon-action" onClick={() => openEdit(user)} disabled={busy} title="Editar usuário" aria-label={`Editar ${user.nome}`}><Edit3 size={16} /></button>
                      <button type="button" className="user-icon-action" onClick={() => void resetPassword(user)} disabled={busy || !user.ativo} title="Redefinir senha" aria-label={`Redefinir senha de ${user.nome}`}><KeyRound size={16} /></button>
                      <button type="button" className="user-icon-action" onClick={() => void toggle(user)} disabled={busy} title={user.ativo ? 'Desativar usuário' : 'Ativar usuário'} aria-label={user.ativo ? `Desativar ${user.nome}` : `Ativar ${user.nome}`}>{user.ativo ? <UserX size={16} /> : <UserCheck size={16} />}</button>
                      {canArchive && <button type="button" className="user-icon-action is-danger" onClick={() => void remove(user)} disabled={busy} title="Arquivar usuário" aria-label={`Arquivar ${user.nome}`}><Trash2 size={16} /></button>}
                    </div>}
                  </td>
                </tr>
              })}
              {!loading && filtered.length === 0 && <tr><td colSpan={5}><div className="user-admin-empty"><UserRound size={25} /><strong>Nenhum usuário encontrado</strong><span>Ajuste os filtros ou a pesquisa para ver outras contas.</span></div></td></tr>}
              {loading && <tr><td colSpan={5} className="user-admin-loading">Carregando contas e perfis…</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="user-admin-pagination" aria-label="Paginação de usuários">
          <span>Página {page + 1} de {pageCount}</span>
          <div>
            <button type="button" onClick={() => setPage(value => Math.max(0, value - 1))} disabled={page === 0} aria-label="Página anterior"><ChevronLeft size={16} /></button>
            <button type="button" onClick={() => setPage(value => Math.min(pageCount - 1, value + 1))} disabled={page >= pageCount - 1} aria-label="Próxima página"><ChevronRight size={16} /></button>
          </div>
        </div>
      </section>

      <Dialog open={Boolean(modal)} onOpenChange={(open) => { if (!open && !busy) setModal(null) }}>
        <DialogContent className="user-admin-dialog">
          <header className="user-admin-dialog-header">
            <span className="user-admin-dialog-icon">{modal === 'invite' ? <MailPlus size={19} /> : modal === 'edit' ? <Edit3 size={19} /> : <UserPlus size={19} />}</span>
            <div>
              <span className="user-admin-eyebrow">ADMINISTRAÇÃO DE ACESSO</span>
              <DialogTitle>{modal === 'edit' ? 'Editar usuário' : modal === 'invite' ? 'Convidar usuário' : 'Novo usuário'}</DialogTitle>
              <DialogDescription>{modal === 'invite' ? 'Enviaremos um código de uso único para o e-mail informado.' : 'Defina os dados da conta e o perfil de acesso apropriado.'}</DialogDescription>
            </div>
            <button type="button" className="user-icon-action" onClick={() => setModal(null)} disabled={busy} aria-label="Fechar"><X size={17} /></button>
          </header>
          {modal === 'invite' && <div className="user-admin-invite-note">O usuário conclui o cadastro em <strong>/ativar-acesso</strong>, valida o código e cria a própria senha.</div>}
          <div className="user-admin-form-grid">
            <label className="user-admin-field"><span>Nome completo <b>*</b></span><input autoFocus value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} placeholder="Nome da pessoa" autoComplete="name" /></label>
            <label className="user-admin-field"><span>E-mail <b>*</b></span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="nome@empresa.com" disabled={modal === 'edit'} autoComplete="email" /></label>
            {isMaster && modal !== 'edit' && <label className="user-admin-field user-admin-field--wide"><span>Empresa <b>*</b></span><select value={form.empresa_id} onChange={(event) => setForm({ ...form, empresa_id: event.target.value })}><option value="">Selecione a empresa</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.nome_fantasia || company.razao_social || company.codigo || company.id}</option>)}</select></label>}
            <label className="user-admin-field"><span>Login</span><input value={form.login_nome} onChange={(event) => setForm({ ...form, login_nome: event.target.value })} placeholder="Identificador de acesso" autoComplete="username" /></label>
            <label className="user-admin-field"><span>Matrícula</span><input value={form.matricula} onChange={(event) => setForm({ ...form, matricula: event.target.value })} placeholder="Código interno" /></label>
            <label className="user-admin-field user-admin-field--wide"><span>Perfil de acesso</span><select value={form.role_id} onChange={(event) => setForm({ ...form, role_id: event.target.value })}><option value="">Selecione um perfil</option>{availableRoles.map((role) => <option key={role.id} value={role.id}>{role.nome} — nível {role.nivel}</option>)}</select><small>Somente perfis permitidos para o seu nível de acesso são listados.</small></label>
            {modal === 'create' && <label className="user-admin-field user-admin-field--wide"><span>Senha inicial</span><input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Deixe em branco para gerar uma senha temporária" autoComplete="new-password" /><small>A política de senha é validada pelo serviço administrativo.</small></label>}
          </div>
          <footer className="user-admin-dialog-actions">
            <button type="button" className="user-button user-button--secondary" onClick={() => setModal(null)} disabled={busy}>Cancelar</button>
            <button type="button" className="user-button user-button--primary" onClick={() => void submit()} disabled={busy}>
              {busy ? <RefreshCw size={16} className="animate-spin" /> : modal === 'edit' ? <Check size={16} /> : <Plus size={16} />}
              {busy ? 'Processando…' : modal === 'edit' ? 'Salvar alterações' : modal === 'invite' ? 'Enviar convite' : 'Criar usuário'}
            </button>
          </footer>
        </DialogContent>
      </Dialog>
    </main>
  )
}
