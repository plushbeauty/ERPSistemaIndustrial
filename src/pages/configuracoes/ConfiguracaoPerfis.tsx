/*
 * REVISÃO TÉCNICA: 16/10/2026
 * Revisado: autenticação, escopo de empresa, listagem de perfis e ação para abrir a matriz RBAC com o perfil selecionado.
 * Não validado nesta revisão: schema/RLS remoto, RPC em produção, type-check/build e fluxo de clonagem ponta a ponta.
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, ShieldCheck, UsersRound } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Role = { id: string; codigo: string | null; nome: string | null; nivel: number | null; ativo: boolean | null; empresa_id: string | null }
const buttonClass = 'inline-flex h-[30px] items-center gap-2 rounded-[2px] border border-[#CFE1E7] bg-white px-2 text-[9px] font-bold text-[#123B50] disabled:cursor-not-allowed disabled:opacity-50'

export default function ConfiguracaoPerfis() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authorized, setAuthorized] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setAuthorized(false)
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!authData.user) throw new Error('Entre no sistema para consultar os perfis.')
      const [actorResult, companyResult, permissionResult] = await Promise.all([
        supabase.from('erp_usuarios').select('empresa_id,ativo').eq('auth_user_id', authData.user.id).maybeSingle(),
        supabase.rpc('erp_current_empresa_id'),
        supabase.rpc('erp_has_permission', { p_code: 'users.update' }),
      ])
      if (actorResult.error) throw actorResult.error
      if (companyResult.error) throw companyResult.error
      if (permissionResult.error) throw permissionResult.error
      const actor = actorResult.data
      const companyId = typeof companyResult.data === 'string' ? companyResult.data : null
      if (!actor?.ativo || actor.deleted_at || !companyId || actor.empresa_id !== companyId || permissionResult.data !== true) {
        throw new Error('Seu usuário não tem permissão para consultar a administração de perfis.')
      }
      const { data, error: queryError } = await supabase.from('erp_roles')
        .select('id,codigo,nome,nivel,ativo,empresa_id')
        .or(`empresa_id.eq.${companyId},empresa_id.is.null`)
        .order('nivel', { ascending: false })
      if (queryError) throw queryError
      setRows((data ?? []) as Role[])
      setAuthorized(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os perfis.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  return <section className="space-y-2 text-[10px] text-slate-700">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#CFE1E7] pb-2">
      <div><div className="text-[9px] font-bold uppercase tracking-wider text-[#176487]">ADMINISTRAÇÃO / RBAC</div><h2 className="mt-1 text-[15px] font-bold text-[#123B50]">Perfis de usuários</h2><p className="mt-1 text-[10px] text-slate-500">Perfis disponíveis para a empresa atual e perfis globais.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading} className={buttonClass}><RefreshCw size={12}/>ATUALIZAR</button>
    </header>
    {error && <div role="alert" className="border border-red-200 bg-red-50 p-2 text-[10px] text-red-800">{error}</div>}
    <div className="overflow-auto border border-[#CFE1E7] bg-white">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead className="bg-[#123B50] text-white"><tr>{['Código','Perfil','Nível','Escopo','Status','Ação'].map(label=><th key={label} scope="col" className="h-[28px] px-2 text-[9px] font-bold uppercase tracking-wide">{label}</th>)}</tr></thead>
        <tbody>{loading ? <tr><td colSpan={6} className="p-5 text-center text-slate-500">Consultando perfis autorizados…</td></tr> : rows.map(role=><tr key={role.id} className="h-[32px] border-t border-[#E2EDF0] even:bg-[#F8FCFD]">
          <td className="px-2 font-mono">{role.codigo || '—'}</td><td className="px-2 font-semibold">{role.nome || '—'}</td><td className="px-2 text-center">{role.nivel ?? '—'}</td><td className="px-2">{role.empresa_id ? 'Empresa' : 'Global'}</td><td className="px-2"><span className={role.ativo === false ? 'text-red-700' : 'text-emerald-700'}>{role.ativo === false ? 'INATIVO' : 'ATIVO'}</span></td><td className="px-2"><button type="button" disabled={!authorized || role.ativo === false} onClick={() => navigate('/pageprincipal/administracao-configuracoes/permissoes?perfil=' + encodeURIComponent(role.id))} className="inline-flex h-[26px] items-center gap-1 border border-[#2D8DB8] bg-white px-2 text-[9px] font-bold text-[#176487] disabled:opacity-50"><ShieldCheck size={11}/>{role.empresa_id ? 'CONFIGURAR' : 'CLONAR / CONFIGURAR'}</button></td>
        </tr>)}</tbody>
      </table>
      {!loading && authorized && !rows.length && <div className="p-5 text-center text-slate-500"><UsersRound size={20} className="mx-auto mb-2 text-[#2D8DB8]"/>Nenhum perfil autorizado encontrado.</div>}
    </div>
    <p className="flex items-start gap-2 text-[9px] text-slate-500"><ShieldCheck size={12} className="mt-0.5 shrink-0"/>A tela consulta perfis; alterações de permissões são feitas na matriz RBAC e precisam ser autorizadas pelo backend/RLS.</p>
  </section>
}
