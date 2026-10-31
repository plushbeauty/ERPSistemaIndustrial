/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-ACCESS-CONTROL-20261030-01 — controle de acesso do chão de fábrica (setores, matriz por módulo e modelos por nível)
 * @STATUS_APROVACAO: INTEGRAÇÃO REAL COM SUPABASE · exige a migration 20261030160000_erp_access_control_sector_matrix_v1 e o deploy da Edge Function erp-user-admin
 * Fontes: erp_setores, erp_postos_trabalho, erp_permissoes_modulos, erp_modulos_acesso,
 * erp_roles/erp_permissions/erp_role_permissions e auditoria em erp_audit_logs.
 * A criação de credenciais Auth é feita somente pela Edge Function erp-user-admin
 * (service role no servidor); a navegador cabem apenas sessão autenticada, RPC e RLS.
 */
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Copy, KeyRound, Lock, RefreshCw, Save, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { invokeSecureEdgeFunction, supabase } from '../lib/supabaseClient'

type Tab = 'matriz' | 'usuarios' | 'niveis'
type FlagKey = 'visualizar' | 'criar' | 'editar' | 'excluir'
type MatrixFlags = Record<FlagKey, boolean>
type ModuleEntry = { modulo: string; nome: string; grupo: string; ordem: number; descricao: string; rbacModulo: string }
type SectorRow = { id: string; codigo: string; nome: string }
type WorkstationRow = { id: string; codigoPosto: string; nomePosto: string }
type LevelTemplate = { roleId: string; codigo: string; nome: string; nivel: number; global: boolean; modulos: Record<string, MatrixFlags> }
type SectorUser = {
  id: string; nome: string; email: string; loginNome: string; matricula: string
  nivelAdmin: number; ativo: boolean; roleId: string; setorId: string
}

const flagColumns: { key: FlagKey; label: string }[] = [
  { key: 'visualizar', label: 'Ver' },
  { key: 'criar', label: 'Criar' },
  { key: 'editar', label: 'Editar' },
  { key: 'excluir', label: 'Excluir' },
]

const input = 'h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[11px] text-slate-800'
const label = 'mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500'
const button = 'inline-flex h-8 items-center justify-center gap-1 rounded-md px-3 text-[11px] font-bold transition-colors'
const primaryButton = `${button} bg-[#123B50] text-white hover:bg-[#0d2f40]`
const lightButton = `${button} border border-slate-300 bg-white text-slate-700 hover:border-[#2D8DB8] hover:text-[#123B50]`
const cellFlag = 'border border-slate-200 text-[11px]'

const emptyFlags = (): MatrixFlags => ({ visualizar: false, criar: false, editar: false, excluir: false })
const passwordIsStrong = (value: string): boolean =>
  value.length >= 12 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value)

function asRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null && !Array.isArray(item))
    : []
}
function text(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return ''
}
function integer(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0
}
function flagsOf(item: Record<string, unknown>): MatrixFlags {
  return {
    visualizar: item.visualizar === true,
    criar: item.criar === true,
    editar: item.editar === true,
    excluir: item.excluir === true,
  }
}

function normalizeOverview(raw: unknown) {
  const root = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? raw as Record<string, unknown> : {}
  const setores: SectorRow[] = asRecords(root.setores).map(item => ({
    id: text(item.id), codigo: text(item.codigo), nome: text(item.nome),
  })).filter(item => item.id)
  const postos: WorkstationRow[] = asRecords(root.postos).map(item => ({
    id: text(item.id), codigoPosto: text(item.codigo_posto), nomePosto: text(item.nome_posto),
  })).filter(item => item.id)
  const modulos: ModuleEntry[] = asRecords(root.modulos).map(item => ({
    modulo: text(item.modulo), nome: text(item.nome) || text(item.modulo), grupo: text(item.grupo) || 'Outros',
    ordem: integer(item.ordem), descricao: text(item.descricao), rbacModulo: text(item.rbac_modulo),
  })).filter(item => item.modulo).sort((a, b) => a.ordem - b.ordem || a.modulo.localeCompare(b.modulo))
  const matriz: Record<string, Record<string, MatrixFlags>> = {}
  for (const row of asRecords(root.matriz)) {
    const setorId = text(row.setor_id)
    const modulo = text(row.modulo)
    if (!setorId || !modulo) continue
    matriz[setorId] = { ...(matriz[setorId] ?? {}), [modulo]: flagsOf(row) }
  }
  const niveis: LevelTemplate[] = asRecords(root.niveis).map(item => {
    const modulos: Record<string, MatrixFlags> = {}
    for (const entry of asRecords(item.modulos)) {
      const modulo = text(entry.modulo)
      if (modulo) modulos[modulo] = flagsOf(entry)
    }
    return {
      roleId: text(item.role_id), codigo: text(item.codigo), nome: text(item.nome),
      nivel: integer(item.nivel), global: item.global === true, modulos,
    }
  }).filter(item => item.roleId)
  return {
    empresaId: text(root.empresa_id), nivelAdmin: integer(root.nivel_admin),
    setores, postos, modulos, matriz, niveis,
  }
}

type AdminResponse = {
  ok?: boolean; error?: string; message?: string
  users?: unknown; user?: unknown
  temporary_password?: string | null; audit_warning?: string | null
}

function normalizeUsers(raw: unknown): SectorUser[] {
  return asRecords(raw).map(item => ({
    id: text(item.id), nome: text(item.nome), email: text(item.email),
    loginNome: text(item.login_nome), matricula: text(item.matricula),
    nivelAdmin: integer(item.nivel_admin), ativo: item.ativo === true,
    roleId: text(item.role_id), setorId: text(item.setor_id),
  })).filter(item => item.id)
}

export default function AccessControlSettings() {
  const [tab, setTab] = useState<Tab>('matriz')
  const [empresaId, setEmpresaId] = useState('')
  const [nivelAdmin, setNivelAdmin] = useState(0)
  const [setores, setSetores] = useState<SectorRow[]>([])
  const [postos, setPostos] = useState<WorkstationRow[]>([])
  const [modulos, setModulos] = useState<ModuleEntry[]>([])
  const [niveis, setNiveis] = useState<LevelTemplate[]>([])
  const [matrizSalva, setMatrizSalva] = useState<Record<string, Record<string, MatrixFlags>>>({})
  const [draft, setDraft] = useState<Record<string, MatrixFlags>>({})
  const [setorId, setSetorId] = useState('')
  const [users, setUsers] = useState<SectorUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyUser, setBusyUser] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [pendingMigration, setPendingMigration] = useState(false)
  const [restricted, setRestricted] = useState(false)
  const [appliedRoleId, setAppliedRoleId] = useState('')
  const [draftSetorId, setDraftSetorId] = useState('')
  const [hasEdits, setHasEdits] = useState(false)

  const [novoCodigo, setNovoCodigo] = useState('')
  const [novoNome, setNovoNome] = useState('')

  const [formNome, setFormNome] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formSenha, setFormSenha] = useState('')
  const [formLogin, setFormLogin] = useState('')
  const [formMatricula, setFormMatricula] = useState('')
  const [formTipo, setFormTipo] = useState<'COLETIVO' | 'POSTO'>('COLETIVO')
  const [formPostoId, setFormPostoId] = useState('')
  const [formRoleId, setFormRoleId] = useState('')
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true); setError(''); setPendingMigration(false); setRestricted(false)
    let snapshotEmpresa = ''
    try {
      const { data, error: rpcError } = await supabase.rpc('erp_access_control_overview')
      if (rpcError) {
        const notDeployed = /does not exist|Could not find|schema cache|not found/i.test(rpcError.message)
        const denied = /n[íi]vel 8 ou 9|permissão negada|42501|not authorize|permission denied/i.test(rpcError.message)
        if (notDeployed) {
          setPendingMigration(true)
          setAuthNotice('A migration 20261030160000_erp_access_control_sector_matrix_v1 ainda não foi aplicada no banco desta empresa.')
        } else if (denied) {
          setRestricted(true)
          setError(rpcError.message)
        } else {
          setError(rpcError.message)
        }
        return
      }
      const overview = normalizeOverview(data)
      snapshotEmpresa = overview.empresaId
      setEmpresaId(overview.empresaId)
      setNivelAdmin(overview.nivelAdmin)
      setSetores(overview.setores)
      setPostos(overview.postos)
      setModulos(overview.modulos)
      setNiveis(overview.niveis)
      setMatrizSalva(overview.matriz)
      setSetorId(current => {
        const stillValid = overview.setores.some(item => item.id === current)
        if (stillValid) return current
        return overview.setores[0]?.id ?? ''
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o controle de acesso.')
      return
    } finally {
      setLoading(false)
    }

    const { data: usersResult, error: usersError } = await invokeSecureEdgeFunction<AdminResponse>('erp-user-admin', {
      action: 'list_users', empresa_id: snapshotEmpresa || undefined,
    })
    if (usersError) {
      setAuthNotice(`Serviço de usuários indisponível: ${usersError.message} Confirme o deploy da Edge Function erp-user-admin.`)
      setUsers([])
      return
    }
    if (!usersResult || usersResult.ok !== true) {
      setAuthNotice(usersResult?.error ?? 'O serviço de usuários devolveu uma resposta sem lista de acessos.')
      setUsers([])
      return
    }
    setUsers(normalizeUsers(usersResult.users))
    if (usersResult.audit_warning) setError(usersResult.audit_warning)
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    // Uma recarga externa não pode descartar marcações ainda não gravadas; a troca de setor refaz o rascunho.
    if (draftSetorId === setorId && hasEdits) return
    const saved = matrizSalva[setorId] ?? {}
    const next: Record<string, MatrixFlags> = {}
    for (const item of modulos) next[item.modulo] = { ...emptyFlags(), ...(saved[item.modulo] ?? {}) }
    setDraft(next)
    setDraftSetorId(setorId)
    setHasEdits(false)
    setAppliedRoleId('')
  }, [setorId, modulos, matrizSalva, draftSetorId, hasEdits])

  const selectedSector = useMemo(() => setores.find(item => item.id === setorId), [setores, setorId])
  const dirty = useMemo(() => {
    const saved = matrizSalva[setorId] ?? {}
    for (const item of modulos) {
      const current = draft[item.modulo] ?? emptyFlags()
      const previous = saved[item.modulo] ?? emptyFlags()
      if (flagColumns.some(column => current[column.key] !== previous[column.key])) return true
    }
    return false
  }, [draft, modulos, matrizSalva, setorId])
  const grupos = useMemo(() => {
    const map = new Map<string, ModuleEntry[]>()
    for (const item of modulos) map.set(item.grupo, [...(map.get(item.grupo) ?? []), item])
    return [...map.entries()]
  }, [modulos])
  const sectorUsers = useMemo(
    () => users.filter(user => user.setorId === setorId || (!setorId && user.setorId)),
    [users, setorId],
  )
  const assignableRoles = useMemo(() => niveis.filter(level => nivelAdmin === 100 ? true : level.nivel < nivelAdmin), [niveis, nivelAdmin])

  const toggleFlag = (modulo: string, key: FlagKey, value: boolean) => {
    setDraft(current => {
      const flags = { ...(current[modulo] ?? emptyFlags()) }
      flags[key] = value
      if (key === 'visualizar' && !value) {
        flags.criar = false; flags.editar = false; flags.excluir = false
      }
      if (key !== 'visualizar' && value) flags.visualizar = true
      return { ...current, [modulo]: flags }
    })
    setHasEdits(true)
    setAppliedRoleId('')
  }

  const applyLevel = (roleId: string) => {
    const level = niveis.find(item => item.roleId === roleId)
    if (!level) {
      setAppliedRoleId('')
      return
    }
    const next: Record<string, MatrixFlags> = {}
    for (const item of modulos) next[item.modulo] = { ...emptyFlags(), ...(level.modulos[item.modulo] ?? {}) }
    setDraft(next)
    setHasEdits(true)
    setAppliedRoleId(roleId)
  }

  const saveMatrix = async () => {
    if (!setorId) return
    setSaving(true); setError(''); setMessage('')
    const matrix = modulos.map(item => ({ modulo: item.modulo, ...(draft[item.modulo] ?? emptyFlags()) }))
    const { data, error: rpcError } = await supabase.rpc('erp_access_control_save_setor_matrix', {
      p_setor_id: setorId, p_matrix: matrix,
    })
    if (rpcError) setError(rpcError.message)
    else {
      setMessage(`${Number(data ?? 0)} módulos gravados para ${selectedSector?.nome ?? selectedSector?.codigo ?? 'o setor'} com trilha em erp_audit_logs.`)
      setHasEdits(false)
      await load()
    }
    setSaving(false)
  }

  const saveSector = async () => {
    setError(''); setMessage('')
    const { data, error: rpcError } = await supabase.rpc('erp_access_control_save_setor', {
      p_setor_id: null, p_codigo: novoCodigo, p_nome: novoNome,
    })
    if (rpcError) { setError(rpcError.message); return }
    setNovoCodigo(''); setNovoNome('')
    setMessage('Setor criado. Selecione o setor para marcar os módulos.')
    await load()
    const createdId = typeof data === 'string' ? data : ''
    if (createdId) setSetorId(createdId)
  }

  const suggestedLogin = useMemo(() => {
    const code = (selectedSector?.codigo ?? '').toUpperCase().replace(/[^A-Z0-9_-]/g, '')
    if (!code) return ''
    if (formTipo === 'COLETIVO') return `${code}-COLETIVO`
    const posto = postos.find(item => item.id === formPostoId)
    return posto ? `${code}-${posto.codigoPosto.toUpperCase()}` : `${code}-POSTO`
  }, [selectedSector, formTipo, formPostoId, postos])

  const createUser = async (event: { preventDefault: () => void }, action: 'create_user' | 'invite_user') => {
    event.preventDefault()
    setError(''); setMessage(''); setGeneratedPassword('')
    if (formNome.trim().length < 3) { setError('Informe o nome do setor ou do posto de trabalho.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail.trim())) { setError('Informe um e-mail válido para o acesso.'); return }
    if (formSenha && !passwordIsStrong(formSenha)) {
      setError('A senha deve ter no mínimo 12 caracteres com maiúscula, minúscula, número e símbolo.')
      return
    }
    const body: Record<string, unknown> = {
      action, nome: formNome.trim(), email: formEmail.trim(),
      setor_id: setorId || null, role_id: formRoleId || null,
      login_nome: (formLogin || suggestedLogin).trim().toLowerCase(),
      matricula: formMatricula.trim() || null,
    }
    if (action === 'create_user' && formSenha) body.password = formSenha

    setSaving(true)
    const { data, error: invokeError } = await invokeSecureEdgeFunction<AdminResponse>('erp-user-admin', body)
    setSaving(false)
    if (invokeError) { setError(invokeError.message); return }
    if (!data || data.ok !== true) { setError(data?.error ?? 'O serviço de usuários não confirmou a criação do acesso.'); return }
    if (action === 'invite_user') {
      setMessage(data.message ?? 'Convite enviado. O usuário deve concluir o acesso pela tela de ativação.')
    } else {
      const created = typeof data.user === 'object' && data.user !== null ? data.user as Record<string, unknown> : {}
      setGeneratedPassword(typeof data.temporary_password === 'string' ? data.temporary_password : '')
      setMessage(`Acesso criado${created.login_nome ? ` para ${created.login_nome}` : ''}. Informe a senha temporária ao responsável do setor.`)
    }
    if (data.audit_warning) setError(data.audit_warning)
    setFormNome(''); setFormEmail(''); setFormSenha(''); setFormLogin(''); setFormMatricula('')
    await load()
  }

  const runUserAction = async (user: SectorUser, action: 'set_active' | 'reset_password', payload: Record<string, unknown> = {}) => {
    setBusyUser(user.id); setError(''); setMessage('')
    const { data, error: invokeError } = await invokeSecureEdgeFunction<AdminResponse>('erp-user-admin', {
      action, user_id: user.id, empresa_id: empresaId || undefined, ...payload,
    })
    setBusyUser('')
    if (invokeError) { setError(invokeError.message); return }
    if (!data || data.ok !== true) { setError(data?.error ?? 'O serviço de usuários não confirmou a operação.'); return }
    if (action === 'reset_password' && typeof data.temporary_password === 'string') {
      const temporary = data.temporary_password
      setUserPasswords(current => ({ ...current, [user.id]: temporary }))
      setMessage(`Nova senha temporária gerada para ${user.nome || user.email}.`)
    } else {
      setMessage(data.message ?? 'Status de acesso atualizado.')
    }
    if (data.audit_warning) setError(data.audit_warning)
    await load()
  }

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setMessage('Valor copiado para a área de transferência.')
    } catch {
      setError('O navegador bloqueou a cópia automática; registre a senha manualmente.')
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'matriz', label: 'Matriz de permissões por setor' },
    { id: 'usuarios', label: 'Usuários do setor' },
    { id: 'niveis', label: 'Modelos por nível de acesso' },
  ]

  return (
    <main className="space-y-2 text-slate-800">
      <section className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white p-2 shadow-sm">
        {tabs.map(item => (
          <button key={item.id} type="button" onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? 'page' : undefined}
            className={`${button} ${tab === item.id ? 'bg-[#123B50] text-white' : 'border border-slate-300 bg-white text-slate-600 hover:border-[#2D8DB8] hover:text-[#123B50]'}`}>
            {item.label}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-500"><ShieldCheck size={13}/>Nível {(nivelAdmin || '—')} · controle aplicado por RLS e pela Edge Function</span>
        <button type="button" onClick={() => void load()} className={lightButton} disabled={loading}><RefreshCw size={12}/>Atualizar</button>
      </section>

      {error && <div role="alert" className="flex items-start gap-2 rounded-md border border-[#D65B61] bg-[#fdf1f2] px-3 py-2 text-[10px] text-[#8f2f36]"><AlertTriangle size={13}/><span>{error}</span></div>}
      {message && <div role="status" className="flex items-start gap-2 rounded-md border border-[#3A9D78] bg-[#f0f8f4] px-3 py-2 text-[10px] text-[#256c52]"><CheckCircle2 size={13}/><span>{message}</span></div>}
      {(pendingMigration || authNotice) && (
        <div role="status" className="flex items-start gap-2 rounded-md border border-[#E6A34A] bg-[#fdf6ea] px-3 py-2 text-[10px] text-[#8a5a12]">
          <AlertTriangle size={13}/><span>{pendingMigration ? authNotice || 'Aplique a migration 20261030160000_erp_access_control_sector_matrix_v1.sql para liberar a matriz de acesso.' : authNotice}</span>
        </div>
      )}

      {restricted ? (
        <section className="rounded-md border border-slate-200 bg-white p-6 text-center text-[11px] text-slate-500">
          <Lock size={18} className="mx-auto mb-2 text-[#123B50]" />
          <p>Rotina exclusiva de administradores de nível 8 e 9. O bloqueio vale também para o acesso direto pela URL: as funções erp_access_control_* conferem a sessão no banco e recusam níveis inferiores.</p>
        </section>
      ) : loading ? <section className="rounded-md border border-slate-200 bg-white p-6 text-center text-[11px] text-slate-500">Carregando setores, módulos e matrizes reais do banco…</section> : (
        <>
          {tab === 'matriz' && (
            <section className="space-y-2">
              <div className="flex flex-wrap items-end gap-2 rounded-md border border-slate-200 bg-white p-2 shadow-sm">
                <div className="w-[220px]"><span className={label}>Setor / departamento</span>
                  <select className={input} value={setorId} onChange={event => setSetorId(event.target.value)}>
                    <option value="" disabled>{setores.length ? 'Selecione o setor' : 'Nenhum setor cadastrado em erp_setores'}</option>
                    {setores.map(item => <option key={item.id} value={item.id}>{item.codigo} · {item.nome}</option>)}
                  </select>
                </div>
                <div className="w-[210px]"><span className={label}>Aplicar modelo de nível</span>
                  <select className={input} value={appliedRoleId} onChange={event => applyLevel(event.target.value)}>
                    <option value="">Nenhum modelo aplicado</option>
                    {niveis.map(item => <option key={item.roleId} value={item.roleId}>{item.nome} · nível {item.nivel}</option>)}
                  </select>
                </div>
                <button type="button" onClick={() => void saveMatrix()} className={primaryButton} disabled={!setorId || !dirty || saving}><Save size={12}/>{saving ? 'Gravando…' : 'Gravar matriz'}</button>
                {dirty && <span className="text-[10px] font-bold text-[#E6A34A]">Alterações ainda não gravadas</span>}
              </div>

              <div className="flex flex-wrap items-end gap-2 rounded-md border border-slate-200 bg-white p-2 shadow-sm">
                <div className="w-[110px]"><span className={label}>Código do setor</span><input className={input} value={novoCodigo} onChange={event => setNovoCodigo(event.target.value)} placeholder="CQ" maxLength={30} /></div>
                <div className="min-w-[240px] flex-1"><span className={label}>Nome do setor</span><input className={input} value={novoNome} onChange={event => setNovoNome(event.target.value)} placeholder="Controle de Qualidade" maxLength={80} /></div>
                <button type="button" onClick={() => void saveSector()} className={lightButton} disabled={novoCodigo.trim().length < 2 || novoNome.trim().length < 2}><UserPlus size={12}/>Criar setor</button>
                <span className="text-[9px] text-slate-500">Grava em erp_setores pelo RPC erp_access_control_save_setor (nível 8/9).</span>
              </div>

              {!setorId ? <div className="rounded-md border border-slate-200 bg-white p-6 text-center text-[11px] text-slate-500">Cadastre ou selecione um setor para montar a matriz de módulos.</div> : (
                <div className="max-h-[600px] overflow-auto rounded-md border border-slate-200 bg-white shadow-sm">
                  <table className="w-full min-w-[820px] border-collapse text-[10px]">
                    <thead className="sticky top-0 z-10"><tr className="h-7 bg-[#123B50] text-white">
                      <th className="px-2 text-left font-normal">Módulo do ERP</th>
                      <th className="w-[130px] px-2 text-left font-normal">Rotina</th>
                      {flagColumns.map(column => <th key={column.key} className="w-[76px] px-2 text-center font-normal">{column.label}</th>)}
                      <th className="w-[120px] px-2 text-left font-normal">Fonte RBAC</th>
                    </tr></thead>
                    <tbody>
                      {grupos.map(([grupo, itens]) => (
                        <Fragment key={grupo}>
                          <tr className="h-6 bg-[#dcecf2] text-[#17445a]"><td colSpan={7} className="px-2 text-[9px] font-bold uppercase">{grupo}</td></tr>
                          {itens.map(item => {
                            const flags = draft[item.modulo] ?? emptyFlags()
                            return (
                              <tr key={item.modulo} className="h-[28px] border-b border-slate-100">
                                <td className="px-2">
                                  <button type="button" onClick={() => toggleFlag(item.modulo, 'visualizar', !flags.visualizar)} title="Marcar/desmarcar acesso do setor a este módulo"
                                    className={`flex w-full items-center gap-2 rounded px-1 py-0.5 text-left ${flags.visualizar ? 'bg-[#e8f5f8] font-bold text-[#123B50]' : 'text-slate-600 hover:bg-slate-50'}`}>
                                    <span className={`flex h-4 w-4 items-center justify-center rounded-[2px] border ${flags.visualizar ? 'border-[#2D8DB8] bg-[#2D8DB8] text-white' : 'border-slate-300 bg-white'}`}>
                                      {flags.visualizar && <CheckCircle2 size={11} />}
                                    </span>
                                    <span className="min-w-0"><span className="block truncate">{item.nome}</span><span className="block text-[8px] text-slate-400">{item.modulo}</span></span>
                                  </button>
                                </td>
                                <td className="px-2 text-slate-600">{item.descricao || '—'}</td>
                                {flagColumns.slice(1).map(column => (
                                  <td key={column.key} className="px-2 text-center">
                                    <input type="checkbox" className={cellFlag} checked={flags[column.key]} disabled={!flags.visualizar}
                                      aria-label={`${column.label} · ${item.nome}`} onChange={event => toggleFlag(item.modulo, column.key, event.target.checked)} />
                                  </td>
                                ))}
                                <td className="px-2 text-[9px] text-slate-500">{item.rbacModulo ? `erp_permissions · ${item.rbacModulo}` : 'sem vínculo com o catálogo RBAC'}</td>
                              </tr>
                            )
                          })}
                        </Fragment>
                      ))}
                      {!modulos.length && <tr><td colSpan={7} className="h-16 text-center text-slate-400">Nenhum módulo disponível no catálogo de acesso.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="px-1 text-[9px] text-slate-500">Desmarcar “Ver” desliga as ações do módulo. Os modelos de nível reproduzem exatamente as permissões gravadas em erp_role_permissions; nada é concedido por aparecer no menu.</p>
            </section>
          )}

          {tab === 'usuarios' && (
            <section className="space-y-2">
              <form className="rounded-md border border-slate-200 bg-white p-2 shadow-sm" onSubmit={event => void createUser(event, 'create_user')}>
                <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-[#123B50]"><KeyRound size={13}/>Novo acesso de setor
                  <span className="font-normal text-slate-500">— {selectedSector ? `${selectedSector.codigo} · ${selectedSector.nome}` : 'selecione o setor na aba Matriz'}</span>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                  <div className="md:col-span-2"><span className={label}>Nome do acesso (setor ou posto)</span><input className={input} value={formNome} onChange={event => setFormNome(event.target.value)} placeholder="CQ — Inspeção de entrada" /></div>
                  <div><span className={label}>Tipo de acesso</span>
                    <select className={input} value={formTipo} onChange={event => setFormTipo(event.target.value === 'POSTO' ? 'POSTO' : 'COLETIVO')}>
                      <option value="COLETIVO">Coletivo do setor</option>
                      <option value="POSTO">Posto de trabalho</option>
                    </select>
                  </div>
                  <div><span className={label}>Posto de trabalho (erp_postos_trabalho)</span>
                    <select className={input} value={formPostoId} disabled={formTipo !== 'POSTO'} onChange={event => setFormPostoId(event.target.value)}>
                      <option value="">{formTipo === 'POSTO' ? 'Selecione o posto' : 'Não aplicável'}</option>
                      {postos.map(item => <option key={item.id} value={item.id}>{item.codigoPosto} · {item.nomePosto}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2"><span className={label}>E-mail de acesso</span><input type="email" className={input} value={formEmail} onChange={event => setFormEmail(event.target.value)} placeholder="cq.setor@empresa.com.br" /></div>
                  <div><span className={label}>Login (gerado do setor/posto)</span><input className={input} value={formLogin} onChange={event => setFormLogin(event.target.value)} placeholder={suggestedLogin || 'CQ-COLETIVO'} /></div>
                  <div><span className={label}>Matrícula (opcional)</span><input className={input} value={formMatricula} onChange={event => setFormMatricula(event.target.value)} placeholder="1042" /></div>
                  <div><span className={label}>Perfil / nível de acesso</span>
                    <select className={input} value={formRoleId} onChange={event => setFormRoleId(event.target.value)}>
                      <option value="">Não definido</option>
                      {assignableRoles.map(item => <option key={item.roleId} value={item.roleId}>{item.nome} · nível {item.nivel}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2"><span className={label}>Senha (mín. 12 com A-Z, a-z, 0-9 e símbolo)</span><input type="password" className={input} value={formSenha} onChange={event => setFormSenha(event.target.value)} placeholder="em branco = senha temporária gerada pelo servidor" /></div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button type="submit" className={primaryButton} disabled={saving || !setorId}><UserPlus size={12}/>{saving ? 'Enviando…' : 'Criar acesso do setor'}</button>
                  <button type="button" className={lightButton} disabled={saving || !setorId} onClick={event => { event.preventDefault(); void createUser(event, 'invite_user') }}>Enviar convite por e-mail</button>
                  <span className="text-[9px] text-slate-500">A identidade Auth é criada pela Edge Function erp-user-admin com service role no servidor; o navegador nunca recebe credencial privada.</span>
                </div>
                {generatedPassword && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-[#E6A34A] bg-[#fdf6ea] px-2 py-1 text-[10px] text-[#8a5a12]">
                    <Lock size={12}/><span>Senha temporária (exiba uma única vez):</span><code className="font-bold">{generatedPassword}</code>
                    <button type="button" className={lightButton} onClick={() => void copyText(generatedPassword)}><Copy size={11}/>Copiar</button>
                  </div>
                )}
              </form>

              <div className="overflow-auto rounded-md border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[860px] border-collapse text-[10px]">
                  <thead><tr className="h-7 bg-[#123B50] text-white"><th className="px-2 text-left font-normal">Acesso do setor</th><th className="px-2 text-left font-normal">E-mail / login</th><th className="w-[90px] px-2 text-center font-normal">Nível</th><th className="w-[110px] px-2 text-center font-normal">Matrícula</th><th className="w-[110px] px-2 text-center font-normal">Status</th><th className="w-[210px] px-2 text-center font-normal">Ações</th></tr></thead>
                  <tbody>
                    {sectorUsers.map(user => (
                      <tr key={user.id} className="h-[30px] border-b border-slate-100 even:bg-slate-50">
                        <td className="px-2 font-bold text-[#123B50]">{user.nome || '—'}<span className="ml-1 text-[8px] font-normal text-slate-400">{user.id.slice(0, 8)}</span></td>
                        <td className="px-2 text-slate-600">{user.email || '—'}<span className="block text-[8px] text-slate-400">login: {user.loginNome || '—'}</span>{userPasswords[user.id] && <span className="block text-[9px] font-bold text-[#8a5a12]">temporária: {userPasswords[user.id]}</span>}</td>
                        <td className="px-2 text-center">{user.nivelAdmin}</td>
                        <td className="px-2 text-center">{user.matricula || '—'}</td>
                        <td className="px-2 text-center"><span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${user.ativo ? 'bg-[#e5f3ee] text-[#256c52]' : 'bg-slate-100 text-slate-500'}`}>{user.ativo ? 'ATIVO' : 'BLOQUEADO'}</span></td>
                        <td className="px-2">
                          <div className="flex justify-center gap-1">
                            <button type="button" className={lightButton} disabled={busyUser === user.id} onClick={() => void runUserAction(user, 'set_active', { ativo: !user.ativo })}><ShieldCheck size={11}/>{user.ativo ? 'Bloquear' : 'Ativar'}</button>
                            <button type="button" className={lightButton} disabled={busyUser === user.id} onClick={() => void runUserAction(user, 'reset_password')}><KeyRound size={11}/>Nova senha</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!sectorUsers.length && <tr><td colSpan={6} className="h-16 text-center text-slate-400"><Users size={18} className="mx-auto mb-1" />Nenhum usuário vinculado a este setor em erp_usuarios.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === 'niveis' && (
            <section className="overflow-auto rounded-md border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[760px] border-collapse text-[10px]">
                <thead><tr className="h-7 bg-[#123B50] text-white"><th className="w-[200px] px-2 text-left font-normal">Nível / perfil (erp_roles)</th><th className="w-[70px] px-2 text-center font-normal">Nível</th><th className="px-2 text-left font-normal">Módulos liberados em erp_role_permissions</th><th className="w-[130px] px-2 text-center font-normal">Aplicar</th></tr></thead>
                <tbody>
                  {niveis.map(level => (
                    <tr key={level.roleId} className="min-h-[30px] border-b border-slate-100 align-top even:bg-slate-50">
                      <td className="px-2 font-bold text-[#123B50]">{level.nome}<span className="block text-[8px] font-normal text-slate-400">{level.codigo}{level.global ? ' · perfil global' : ' · perfil da empresa'}</span></td>
                      <td className="px-2 text-center">{level.nivel}</td>
                      <td className="px-2 py-1">
                        <div className="flex flex-wrap gap-1">
                          {modulos.filter(item => level.modulos[item.modulo]).map(item => {
                            const flags = level.modulos[item.modulo]
                            const actions = flagColumns.filter(column => column.key !== 'visualizar' && flags[column.key]).map(column => column.label.toUpperCase()).join(' · ')
                            return <span key={item.modulo} className="rounded-[2px] border border-[#b9d4df] bg-[#eaf5f8] px-1.5 py-0.5 text-[9px] text-[#123B50]">{item.nome}{actions && <b className="ml-1 text-[8px] text-[#2D8DB8]">{actions}</b>}</span>
                          })}
                          {!modulos.some(item => level.modulos[item.modulo]) && <span className="text-[9px] text-slate-400">nenhum módulo do catálogo vinculado a este nível</span>}
                        </div>
                      </td>
                      <td className="px-2 text-center"><button type="button" className={lightButton} onClick={() => { setTab('matriz'); applyLevel(level.roleId) }}>Marcar na matriz</button></td>
                    </tr>
                  ))}
                  {!niveis.length && <tr><td colSpan={4} className="h-16 text-center text-slate-400">Nenhum perfil RBAC encontrado para esta empresa.</td></tr>}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </main>
  )
}
