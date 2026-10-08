import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CopyPlus, RefreshCw, Save, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'

type Role = { id: string; codigo: string; nome: string; nivel: number; ativo: boolean; empresa_id: string | null }
type Permission = { id: string; code: string; name: string; description: string | null }
type RolePermission = { role_id: string; permission_id: string }
type RoleDraft = { roleId: string | null; codigo: string; nome: string; permissions: Set<string> }

const emptyDraft = (): RoleDraft => ({ roleId: null, codigo: '', nome: '', permissions: new Set() })

export default function ConfiguracaoPermissoes() {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [actorCompany, setActorCompany] = useState<string | null>(null)
  const [canManage, setCanManage] = useState(false)
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [draft, setDraft] = useState<RoleDraft>(emptyDraft)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const selectedRoleIdRef = useRef('')

  const selectedRole = roles.find(role => role.id === selectedRoleId) ?? null
  const permissionGroups = useMemo(() => {
    const groups = new Map<string, Permission[]>()
    permissions.forEach(permission => {
      const moduleCode = permission.code.split('.')[0] ?? permission.code
      groups.set(moduleCode, [...(groups.get(moduleCode) ?? []), permission])
    })
    return Array.from(groups.entries()).sort(([left], [right]) => left.localeCompare(right, 'pt-BR'))
  }, [permissions])
  const mayEdit = canManage && Boolean(actorCompany)
  const isDraftForSelectedRole = Boolean(
    draft.roleId !== null
    && draft.roleId === selectedRoleId
    && selectedRole?.empresa_id
    && selectedRole.empresa_id === actorCompany,
  )
  const isEditing = Boolean(draft.codigo && draft.nome) && (isDraftForSelectedRole || (draft.roleId === null && mayEdit))

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!authData.user) throw new Error('Sessão autenticada necessária para consultar perfis.')

      const [actorResult, companyResult, permissionResult, roleRows] = await Promise.all([
        supabase.from('erp_usuarios').select('nivel_admin,empresa_id,ativo,deleted_at').eq('auth_user_id', authData.user.id).maybeSingle(),
        supabase.rpc('erp_current_empresa_id'),
        supabase.rpc('erp_has_permission', { p_code: 'users.update' }),
        fetchAllPages<Role>((from, to) => supabase.from('erp_roles')
          .select('id,codigo,nome,nivel,ativo,empresa_id', { count: 'exact' })
          .eq('ativo', true)
          .order('nivel', { ascending: false })
          .range(from, to)),
      ])
      if (actorResult.error) throw actorResult.error
      if (companyResult.error) throw companyResult.error
      if (permissionResult.error) throw permissionResult.error
      const companyId = typeof companyResult.data === 'string' ? companyResult.data : null
      const actor = actorResult.data
      const eligible = Boolean(
        actor?.ativo
        && !actor.deleted_at
        && actor.empresa_id
        && actor.empresa_id === companyId
        && Number(actor.nivel_admin) >= 8
        && permissionResult.data === true,
      )
      const permissionRows = await fetchAllPages<Permission>((from, to) => supabase
        .from('erp_permissions')
        .select('id,code,name,description', { count: 'exact' })
        .order('code')
        .range(from, to)
        .then(({ data, error, count }) => {
          if (error) throw error
          return {
            data: (data ?? []).map(item => ({
              id: item.id,
              code: item.code,
              name: item.name,
              description: item.description,
            })),
            error: null,
            count: count ?? (data ?? []).length,
          }
        }))

      setActorCompany(companyId)
      setCanManage(eligible)
      setRoles(roleRows)
      setPermissions(permissionRows)
      const currentRole = roleRows.find(role => role.id === selectedRoleIdRef.current) ?? roleRows[0]
      setSelectedRoleId(currentRole?.id ?? '')
      selectedRoleIdRef.current = currentRole?.id ?? ''
      if (!currentRole) {
        setDraft(emptyDraft())
        return
      }
      const assignmentRows = await fetchAllPages<RolePermission>((from, to) => supabase.from('erp_role_permissions')
        .select('role_id,permission_id', { count: 'exact' })
        .eq('role_id', currentRole.id)
        .range(from, to))
      const permissionCodes = new Set(permissionRows
        .filter(permission => assignmentRows.some(assignment => assignment.permission_id === permission.id))
        .map(permission => permission.code))
      setDraft(companyId && eligible && currentRole.empresa_id === companyId
        ? { roleId: currentRole.id, codigo: currentRole.codigo, nome: currentRole.nome, permissions: permissionCodes }
        : { roleId: currentRole.empresa_id === null ? currentRole.id : null, codigo: currentRole.codigo, nome: currentRole.nome, permissions: permissionCodes })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os perfis e permissões.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const selectRole = async (roleId: string) => {
    setSelectedRoleId(roleId)
    selectedRoleIdRef.current = roleId
    setDraft(emptyDraft())
    setError('')
    setMessage('')
    const role = roles.find(item => item.id === roleId)
    if (!role) return
    setLoading(true)
    try {
      const assignments = await fetchAllPages<RolePermission>((from, to) => supabase.from('erp_role_permissions')
        .select('role_id,permission_id', { count: 'exact' })
        .eq('role_id', role.id)
        .range(from, to))
      const codes = new Set(permissions
        .filter(permission => assignments.some(assignment => assignment.permission_id === permission.id))
        .map(permission => permission.code))
      if (actorCompany && canManage && role.empresa_id === actorCompany) {
        setDraft({ roleId: role.id, codigo: role.codigo, nome: role.nome, permissions: codes })
      } else {
        setDraft({ roleId: role.empresa_id === null ? role.id : null, codigo: role.codigo, nome: role.nome, permissions: codes })
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível consultar as permissões deste perfil.')
    } finally {
      setLoading(false)
    }
  }

  const cloneSelected = () => {
    if (!selectedRole || !mayEdit || selectedRole.empresa_id !== null) return
    const baseCode = `${selectedRole.codigo}_EMPRESA`.replace(/[^A-Z0-9_]/g, '').slice(0, 40)
    setDraft({ roleId: null, codigo: baseCode, nome: `${selectedRole.nome} (empresa)`, permissions: new Set(draft.permissions) })
    setMessage('')
    setError('')
  }

  const togglePermission = (code: string, checked: boolean) => {
    setDraft(current => {
      const next = new Set(current.permissions)
      if (checked) next.add(code)
      else next.delete(code)
      return { ...current, permissions: next }
    })
  }

  const save = async () => {
    if (!mayEdit || !draft.codigo.trim() || !draft.nome.trim()) {
      setError('É necessário informar código e nome e possuir permissão administrativa na empresa.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { data, error: saveError } = await supabase.rpc('erp_admin_save_role', {
        p_role_id: draft.roleId,
        p_codigo: draft.codigo.trim(),
        p_nome: draft.nome.trim(),
        p_permission_codes: Array.from(draft.permissions),
      })
      if (saveError) throw saveError
      if (typeof data !== 'string') throw new Error('O banco não retornou o identificador do perfil salvo.')
      setMessage('Perfil e permissões atualizados e registrados na auditoria.')
      setSelectedRoleId(data)
      selectedRoleIdRef.current = data
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o perfil.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="space-y-6">
    <header className="border-b border-slate-200 pb-4">
      <span className="block text-xs font-bold uppercase tracking-wider text-blue-600">Configurações / Segurança</span>
      <h2 className="text-3xl font-black tracking-tight text-slate-900">Controle de Permissões</h2>
      <p className="mt-1 text-sm text-slate-500">Matriz vinculada ao catálogo ERP e ao perfil selecionado.</p>
    </header>
    {(message || error) && <div role={error ? 'alert' : 'status'} className={`rounded-2xl border px-4 py-3 text-sm font-bold ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error || message}</div>}
    <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500"><ShieldCheck size={17} className="text-blue-600" />Matriz por perfil</div>
          <p className="mt-1 text-sm text-slate-500">Perfis globais são somente leitura; o administrador pode cloná-los para sua empresa.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Selecionar perfil" value={selectedRoleId} onChange={event => void selectRole(event.target.value)} disabled={loading || !roles.length} className="max-w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800">
            {roles.map(role => <option key={role.id} value={role.id}>{role.nome} · {role.empresa_id ? 'empresa' : 'global'}</option>)}
          </select>
          <button type="button" onClick={() => void load()} disabled={loading || busy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"><RefreshCw size={15} />Atualizar</button>
          {selectedRole?.empresa_id === null && mayEdit && <button type="button" onClick={cloneSelected} disabled={loading || busy} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800 disabled:opacity-50"><CopyPlus size={15} />Clonar para empresa</button>}
        </div>
      </div>
      {selectedRole && <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-bold text-slate-600">Código
          <input value={draft.codigo} onChange={event => setDraft(current => ({ ...current, codigo: event.target.value.toUpperCase() }))} disabled={!mayEdit || !isEditing || busy} maxLength={40} className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 disabled:bg-slate-50" />
        </label>
        <label className="grid gap-1 text-xs font-bold text-slate-600">Nome do perfil
          <input value={draft.nome} onChange={event => setDraft(current => ({ ...current, nome: event.target.value }))} disabled={!mayEdit || !isEditing || busy} maxLength={100} className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 disabled:bg-slate-50" />
        </label>
      </div>}
      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-slate-800 text-white"><tr><th scope="col" className="p-4 text-left">Módulo e permissões</th><th scope="col" className="p-4 text-right">Acesso</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={2} className="p-8 text-center text-slate-500">Consultando permissões persistidas...</td></tr>
              : permissionGroups.map(([module, items]) => <tr key={module} className="border-t border-slate-100 even:bg-slate-50">
                <th scope="row" className="p-4 text-left align-top"><span className="font-black capitalize text-slate-800">{module.replaceAll('_', ' ')}</span><span className="mt-1 block text-xs font-medium text-slate-500">{items.map(item => item.name).join(' · ')}</span></th>
                <td className="p-4 text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    {items.map(item => <label key={item.id} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700">
                      <input type="checkbox" checked={draft.permissions.has(item.code)} onChange={event => togglePermission(item.code, event.target.checked)} disabled={!mayEdit || !isEditing || loading || busy} className="h-4 w-4 accent-blue-700" />
                      {item.code.split('.').at(-1)}
                    </label>)}
                  </div>
                </td>
              </tr>)}
            {!loading && !permissionGroups.length && <tr><td colSpan={2} className="p-8 text-center text-slate-500">O catálogo de permissões ativo está vazio.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{mayEdit ? 'As alterações são validadas por tenant e nível no banco.' : 'A sessão atual não possui permissão de edição para perfis desta empresa.'}</p>
        {mayEdit && isEditing && <button type="button" disabled={busy || loading} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-50"><Save size={16} />{busy ? 'Salvando…' : draft.roleId ? 'Salvar perfil' : 'Criar perfil da empresa'}</button>}
      </div>
    </section>
  </div>
}
