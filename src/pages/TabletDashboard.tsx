import { useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ERPHeader from '../components/layout/ERPHeader'
import { SYNQRA_MODULES } from '../assets/synqra/icons'
import { supabase } from '../lib/supabaseClient'
import '../styles/synqra-workspace.css'
import '../styles/synqra-tablet.css'

type Profile = {
  role_id: string | null
  empresa_id: string | null
  is_master: boolean
  nivel_admin: number
  perfil: string
}

type RolePermission = {
  permission_id: string
}

type Permission = {
  id: string
  code: string
}

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')

async function loadAccess(): Promise<{ profile: Profile; permissions: Set<string> }> {
  const auth = await supabase.auth.getUser()
  if (auth.error) throw auth.error
  if (!auth.data.user) {
    window.location.replace('/login?returnTo=/tablet/dashboard')
    throw new Error('Sessão não autenticada.')
  }

  const { data: row, error } = await supabase
    .from('erp_usuarios')
    .select('role_id,empresa_id,is_master,nivel_admin,perfil')
    .eq('auth_user_id', auth.data.user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  if (!row) throw new Error('Usuário autenticado sem perfil ERP ativo.')

  const profile: Profile = {
    role_id: row.role_id ?? null,
    empresa_id: row.empresa_id ?? null,
    is_master: Boolean(row.is_master),
    nivel_admin: Number(row.nivel_admin ?? 0),
    perfil: String(row.perfil ?? ''),
  }

  const master =
    profile.is_master &&
    profile.nivel_admin >= 100 &&
    profile.perfil.trim().toUpperCase() === 'MASTER' &&
    profile.empresa_id === null

  if (master) return { profile, permissions: new Set(['*']) }

  if (!profile.role_id) {
    throw new Error('Usuário ERP sem papel RBAC vinculado.')
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from('erp_role_permissions')
    .select('permission_id')
    .eq('role_id', profile.role_id)

  if (assignmentError) throw assignmentError

  const permissionIds = (assignments as RolePermission[]).map(row => row.permission_id)
  if (!permissionIds.length) return { profile, permissions: new Set() }

  const { data: permissionRows, error: permissionError } = await supabase
    .from('erp_permissions')
    .select('id,code')
    .in('id', permissionIds)
    .eq('ativo', true)

  if (permissionError) throw permissionError

  const permissions = new Set<string>()
  for (const permission of (permissionRows ?? []) as Permission[]) {
    permissions.add(permission.code)
    const moduleCode = permission.code.split('.')[0]
    if (moduleCode) permissions.add(moduleCode)
  }

  return { profile, permissions }
}

export default function TabletDashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [permissions, setPermissions] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    void loadAccess()
      .then(({ profile: nextProfile, permissions: nextPermissions }) => {
        if (!alive) return
        setProfile(nextProfile)
        setPermissions(nextPermissions)
      })
      .catch((reason: unknown) => {
        if (!alive) return
        setError(reason instanceof Error ? reason.message : String(reason))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  const modules = useMemo(() => {
    const term = normalize(search.trim())
    return SYNQRA_MODULES
      .filter(module => Boolean(module.route))
      .filter(module => !module.permission || permissions.has('*') || permissions.has(module.permission))
      .filter(module => !term || normalize(module.label).includes(term))
  }, [permissions, search])

  const master = profile?.is_master === true && profile.nivel_admin >= 100 && profile.empresa_id === null

  return (
    <main className="synqra-tablet synqra-tablet-operational">
      <ERPHeader />

      <section className="synqra-tablet-toolbar" aria-label="Controle da central operacional">
        <div className="synqra-toolbar-title">
          <span>CENTRAL OPERACIONAL</span>
          <strong>TABLET PRINCIPAL</strong>
        </div>
        <div className="synqra-tablet-tools">
          <span className="synqra-tablet-scope">{master ? 'MASTER' : profile?.perfil || 'USUÁRIO ERP'}</span>
          <label className="synqra-search">
            <Search size={14} aria-hidden="true" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Pesquisar módulo"
              aria-label="Pesquisar módulo"
            />
            {search && (
              <button type="button" aria-label="Limpar pesquisa" onClick={() => setSearch('')}>
                <X size={13} />
              </button>
            )}
          </label>
        </div>
      </section>

      {error && <div className="synqra-tablet-error" role="alert">{error}</div>}

      {loading ? (
        <div className="synqra-tablet-loading" role="status">VALIDANDO ACESSO E PERMISSÕES...</div>
      ) : (
        <section className="synqra-module-grid" aria-label="Módulos autorizados do ERP">
          {modules.map(({ key, label, route, Icon }) => (
            <button
              key={key}
              type="button"
              className="synqra-module-card"
              title={label}
              onClick={() => {
                if (route) navigate(route)
              }}
            >
              <span className="synqra-module-icon" aria-hidden="true">
                <Icon size={32} strokeWidth={1.8} />
              </span>
              <span className="synqra-module-label">{label}</span>
            </button>
          ))}
          {!modules.length && !error && (
            <div className="synqra-tablet-empty">Nenhum módulo operacional autorizado para este usuário.</div>
          )}
        </section>
      )}

      <footer className="synqra-tablet-footer">
        <span>SGQERP</span>
        <span>CENTRAL DE CONTROLE</span>
        <span>{modules.length} módulos visíveis</span>
        <span>DADOS: SUPABASE</span>
      </footer>
    </main>
  )
}
