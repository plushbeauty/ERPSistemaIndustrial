/*
 * REVISÃO TÉCNICA: 16/10/2026
 * Página criada: central de parâmetros administrativos já existentes, com navegação para configurações persistidas e identificação segura da sessão/empresa.
 * Limite conhecido: não grava parâmetros globais porque não foi localizada uma tabela/contrato de schema confirmado para preferências gerais do sistema.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Building2, Code2, DatabaseBackup, FileClock, KeyRound, Network, ShieldCheck, Settings2, UsersRound, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

const destinations = [
  { to: '/configuracoes-adm/empresa', label: 'Empresa e identidade', detail: 'Dados cadastrais da empresa', icon: Building2 },
  { to: '/configuracoes-adm/codificacao', label: 'Codificação e áreas', detail: 'Padrões e setores existentes', icon: Code2 },
  { to: '/configuracoes-adm/perfis', label: 'Perfis de usuários', detail: 'Perfis e níveis de acesso', icon: UsersRound },
  { to: '/configuracoes-adm/permissoes', label: 'Permissões RBAC', detail: 'Permissões por código e perfil', icon: ShieldCheck },
  { to: '/configuracoes-adm/usuarios', label: 'Usuários', detail: 'Contas e situação de acesso', icon: KeyRound },
  { to: '/configuracoes-adm/seguranca', label: 'Segurança e sessões', detail: 'Senha, MFA e sessão atual', icon: Activity },
  { to: '/configuracoes-adm/logs', label: 'Logs e auditoria', detail: 'Eventos de rastreabilidade', icon: FileClock },
  { to: '/configuracoes-adm/backups', label: 'Backups e recuperação', detail: 'Política e evidência de recuperação', icon: DatabaseBackup },
  { to: '/configuracoes-adm/integracoes', label: 'Integrações', detail: 'Serviços conectados', icon: Network },
]

export default function ConfiguracaoSistema() {
  const [identity, setIdentity] = useState<{ company: string | null; actor: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!auth.user) throw new Error('Entre no ERP para consultar os parâmetros administrativos.')
        const [company, actor] = await Promise.all([
          supabase.rpc('erp_current_empresa_id'),
          supabase.from('erp_usuarios').select('nome,ativo,deleted_at').eq('auth_user_id', auth.user.id).maybeSingle(),
        ])
        if (company.error) throw company.error
        if (actor.error) throw actor.error
        if (!actor.data || !actor.data.ativo || actor.data.deleted_at) throw new Error('O usuário não possui um perfil ERP ativo.')
        if (alive) setIdentity({ company: company.data ? String(company.data) : null, actor: actor.data.nome })
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : 'Não foi possível validar a sessão.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    void load()
    return () => { alive = false }
  }, [])

  return <section className="space-y-2 text-[#334155]">
    <header className="flex items-center gap-2 border border-[#CFE1E7] bg-white p-3"><span className="grid h-8 w-8 place-items-center rounded-[2px] bg-[#E2F3F7] text-[#176487]"><Settings2 size={16}/></span><div><h2 className="text-[11px] font-extrabold uppercase tracking-wide text-[#123B50]">Parâmetros administrativos</h2><p className="mt-0.5 text-[9px] text-slate-500">Acesso direto às configurações reais existentes no ERP.</p></div></header>
    {error && <div role="alert" className="flex items-start gap-2 border border-red-200 bg-red-50 p-2 text-[10px] text-red-800"><AlertTriangle size={13} className="mt-0.5 shrink-0"/>{error}</div>}
    {loading ? <div className="border border-[#CFE1E7] bg-white p-3 text-[10px]">Validando sessão…</div> : identity && <div className="grid gap-2 sm:grid-cols-2"><div className="border border-[#CFE1E7] bg-white p-2"><span className="text-[8px] font-bold uppercase tracking-wide text-slate-500">Operador autenticado</span><p className="mt-1 text-[10px] font-extrabold text-[#123B50]">{identity.actor}</p></div><div className="border border-[#CFE1E7] bg-white p-2"><span className="text-[8px] font-bold uppercase tracking-wide text-slate-500">Empresa da sessão</span><p className="mt-1 break-all text-[10px] font-extrabold text-[#123B50]">{identity.company || 'Sem empresa selecionada'}</p></div></div>}
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{destinations.map(item => {const Icon = item.icon; return <Link key={item.to} to={item.to} className="flex min-h-[58px] items-center gap-2 border border-[#CFE1E7] bg-white p-2 no-underline hover:border-[#2D8DB8] hover:bg-[#F4FBFD]"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-[2px] bg-[#E2F3F7] text-[#176487]"><Icon size={14}/></span><span className="min-w-0 flex-1"><strong className="block text-[10px] font-extrabold text-[#123B50]">{item.label}</strong><small className="mt-0.5 block text-[9px] text-slate-500">{item.detail}</small></span></Link>})}</div>
    <div className="flex items-start gap-2 border border-[#E8D6AD] bg-[#FFFDF5] p-2 text-[9px] text-[#7A581C]"><AlertTriangle size={13} className="mt-0.5 shrink-0"/>Preferências globais editáveis não são simuladas: antes de criar campos de gravação, é necessário confirmar a tabela e as policies RLS oficiais para parâmetros do sistema.</div>
  </section>
}
