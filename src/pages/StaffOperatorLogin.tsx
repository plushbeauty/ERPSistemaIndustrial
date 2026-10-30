/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Factory, ShieldCheck } from 'lucide-react'
import { supabase, supabaseConfigurado } from '../lib/supabaseClient'

type LoginMode = 'operator' | 'admin'

export default function StaffOperatorLogin() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<LoginMode>('operator')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (!supabaseConfigurado) throw new Error('Ambiente Supabase não configurado.')
      const email = username.trim().toLowerCase()
      if (!email || !password) throw new Error('Informe usuário e senha.')
      if (!email.includes('@')) throw new Error('Use o e-mail corporativo cadastrado no Supabase Auth. Acesso por PIN/crachá será liberado após implantação do validador seguro no servidor.')

      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
      if (!data.user) throw new Error('O Supabase não retornou uma sessão válida.')

      const { data: profile, error: profileError } = await supabase
        .from('erp_usuarios')
        .select('id,auth_user_id,empresa_id,ativo,is_master,nivel_admin,perfil,deleted_at')
        .eq('auth_user_id', data.user.id)
        .eq('ativo', true)
        .is('deleted_at', null)
        .maybeSingle()
      if (profileError) throw profileError
      if (!profile || profile.auth_user_id !== data.user.id || !profile.empresa_id) {
        throw new Error('Usuário sem perfil ERP ativo e empresa vinculada. Acesso bloqueado.')
      }

      const profileName = String(profile.perfil ?? '').trim().toUpperCase()
      const isOperator = profileName === 'OPERADOR_FABRIL'
      const isMaster = profile.is_master === true && Number(profile.nivel_admin ?? 0) >= 100 && profileName === 'MASTER' && profile.empresa_id === null
      if (isMaster) throw new Error('O acesso Master deve ser realizado pelo login administrativo principal.')
      if (mode === 'operator' && !isOperator) throw new Error('Este usuário não possui perfil OPERADOR_FABRIL.')
      if (mode === 'admin' && isOperator) throw new Error('Operadores devem utilizar a entrada de Chão de Fábrica.')

      if (mode === 'operator') navigate('/tablet/dashboard', { replace: true })
      else navigate('/pageprincipal', { replace: true })
    } catch (cause) {
      await supabase.auth.signOut().catch(() => undefined)
      setError(cause instanceof Error ? cause.message : 'Falha na autenticação. Verifique os dados.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen w-full bg-[#F4FBFD] px-4 py-8 text-[#123B50]">
      <section className="mx-auto w-full max-w-md space-y-5">
        <header className="space-y-1 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[2px] bg-[#123B50] text-white"><Factory size={21}/></div>
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#2D8DB8]">SYSNQRA ERP INDUSTRIAL</p>
          <h1 className="text-xl font-extrabold">Acesso ao sistema</h1>
          <p className="text-xs text-slate-500">Autenticação segura para operação e administração</p>
        </header>
        <div className="erp-card flex gap-1 p-1">
          <button type="button" onClick={()=>{setMode('operator');setError('')}} className={`flex-1 rounded-[2px] px-2 py-2 text-xs font-bold ${mode==='operator'?'bg-[#123B50] text-white':'text-slate-600 hover:bg-slate-100'}`}>Operador Chão de Fábrica</button>
          <button type="button" onClick={()=>{setMode('admin');setError('')}} className={`flex-1 rounded-[2px] px-2 py-2 text-xs font-bold ${mode==='admin'?'bg-[#123B50] text-white':'text-slate-600 hover:bg-slate-100'}`}>Administração ERP</button>
        </div>
        <section className="erp-card space-y-4 p-5">
          {error && <div role="alert" className="rounded-[2px] border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</div>}
          <form onSubmit={authenticate} className="space-y-4">
            <label className="block space-y-1"><span className="erp-label">{mode==='operator'?'E-mail corporativo do operador':'E-mail do administrador'}</span><input className="erp-input w-full" type="email" autoComplete="username" required value={username} onChange={e=>setUsername(e.target.value)} placeholder="usuario@empresa.com"/></label>
            <label className="block space-y-1"><span className="erp-label">Senha</span><input className="erp-input w-full font-mono" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Digite sua senha"/></label>
            {mode==='operator'&&<p className="border-l-2 border-[#2D8DB8] bg-[#F4FBFD] p-2 text-[10px] leading-4 text-slate-600">O acesso por crachá/PIN não é habilitado nesta versão porque exige validação server-side e sessão operacional própria. Esta tela utiliza Supabase Auth e valida o perfil de operador antes de liberar o Tablet.</p>}
            <div className="flex items-center gap-2 border-t border-slate-200 pt-3"><button type="button" className="erp-btn flex-1" disabled={loading} onClick={()=>{setUsername('');setPassword('');setError('')}}>Limpar</button><button type="submit" className="erp-btn-primary flex-1" disabled={loading}>{loading?'Autenticando...':'Autenticar Entrada'}</button></div>
          </form>
          <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-[10px] text-slate-500"><ShieldCheck size={15} className="shrink-0 text-[#2D8DB8]"/> Sessão gerenciada pelo Supabase Auth. Nenhuma credencial é salva manualmente no navegador.</div>
        </section>
        <button type="button" onClick={()=>navigate('/login')} className="w-full text-center text-xs font-semibold text-[#2D8DB8] hover:underline">Ir para o login principal</button>
      </section>
    </main>
  )
}
