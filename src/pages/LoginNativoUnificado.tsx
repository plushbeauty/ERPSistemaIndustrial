import { FormEvent, useState } from 'react'
import { KeyRound, LogIn, UserPlus, ShieldCheck } from 'lucide-react'
import { supabase, supabaseConfigurado } from '../lib/supabaseClient'
import InfrastructureTrust from '../components/InfrastructureTrust'

export default function LoginNativoUnificado() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [status, setStatus] = useState('')
  const [erro, setErro] = useState('')
  const [busy, setBusy] = useState(false)

  async function executarAutenticacao(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setStatus('')
    setBusy(true)
    try {
      if (!supabaseConfigurado) throw new Error('A conexão pública do Supabase não está configurada neste ambiente.')
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha,
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('O Supabase Auth não devolveu um usuário válido.')
      setStatus('Autenticado. Carregando empresa, segmento e permissões...')

      const { data: perfil, error: perfilError } = await supabase
        .from('erp_usuarios')
        .select('id, empresa_id, nome, nivel_admin, ativo, deleted_at')
        .eq('auth_user_id', authData.user.id)
        .is('deleted_at', null)
        .maybeSingle()
      if (perfilError) throw perfilError
      if (!perfil) throw new Error('Usuário autenticado, mas sem vínculo ativo em erp_usuarios.')
      if (perfil.ativo === false) throw new Error('Este usuário está inativo no ERP.')

      const { data: empresa, error: empresaError } = await supabase
        .from('erp_empresas')
        .select('id, nome_fantasia, razao_social, segmento, ativo, plano_status, trial_ends_at')
        .eq('id', perfil.empresa_id)
        .maybeSingle()
      if (empresaError) throw empresaError
      if (!empresa) throw new Error('A empresa vinculada ao usuário não foi encontrada.')
      if (empresa.ativo === false) throw new Error('A empresa vinculada está bloqueada.')

      const trialExpired = Boolean(empresa.trial_ends_at && Date.now() >= new Date(empresa.trial_ends_at).getTime() && empresa.plano_status !== 'ativo')
      if (trialExpired && Number(perfil.nivel_admin) < 9) throw new Error('O período de teste desta empresa terminou. Ative o plano para continuar.')

      const segmento = String(empresa.segmento || '').trim().toLowerCase()
      setStatus(`Acesso liberado • ${empresa.nome_fantasia || empresa.razao_social || 'Empresa'} • ${segmento || 'segmento não informado'}`)
      window.setTimeout(() => {
        window.location.replace(Number(perfil.nivel_admin) >= 9 ? '/master' : '/erp-industrial')
      }, 150)
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível autenticar.')
      await supabase.auth.signOut().catch(() => undefined)
    } finally {
      setBusy(false)
    }
  }

  async function recuperarSenha() {
    setErro('')
    setStatus('')
    const address = email.trim().toLowerCase()
    if (!address || !address.includes('@')) {
      setErro('Informe o e-mail cadastrado para recuperar a senha.')
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(address, { redirectTo: `${window.location.origin}/login` })
      if (error) throw error
      setStatus('Se o e-mail estiver cadastrado, o link de recuperação foi solicitado.')
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível solicitar a recuperação.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="login-page">
    <section className="login-art" aria-label="SGQ ERP Industrial">
      <img src="/images/sgq/sgq-erp-login.png" alt="SGQ ERP — Gestão Industrial" />
      <div className="login-art-overlay">
        <div className="login-art-copy">
          <span className="login-eyebrow">SGQ ERP INDUSTRIAL</span>
          <h2>Um acesso. A empresa e o segmento corretos.</h2>
          <p>Autenticação nativa do Supabase, sessão persistente e resolução do tenant pelo vínculo real do usuário.</p>
          <div className="login-feature-pills"><span>● Supabase Auth</span><span>● Multiempresa</span><span>● RLS</span><span>● Segmento</span></div>
        </div>
        <InfrastructureTrust />
      </div>
    </section>
    <form className="login-card" onSubmit={executarAutenticacao}>
      <div className="login-brand">
        <a className="login-brand-logo" href="/login" aria-label="SGQ ERP"><img className="login-logo-large" src="/logo-industrial.svg" alt="SGQ ERP" /></a>
        <span className="login-kicker">ACESSO NATIVO</span>
        <h1>Entrar no SGQ ERP</h1>
        <p>Use o e-mail e a senha cadastrados no Supabase Auth. A empresa é descoberta depois da autenticação.</p>
      </div>
      <div className="login-fields">
        <label>E-mail corporativo<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@empresa.com.br" autoComplete="username" required disabled={busy} /></label>
        <label>Senha<div className="password-input"><input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Digite sua senha" autoComplete="current-password" required disabled={busy} /><KeyRound size={18} /></div></label>
      </div>
      {erro && <div className="error" role="alert">{erro}</div>}
      {status && <div className="notice" role="status">{status}</div>}
      <button className="primary full login-submit" disabled={busy}>{busy ? 'Autenticando...' : 'Entrar no sistema'} <LogIn size={18} /></button>
      <button className="secondary full" type="button" disabled={busy} onClick={() => void recuperarSenha()}><ShieldCheck size={17} /> Recuperar senha</button>
      <a className="signup-login-link" href="/cadastro-empresa"><UserPlus size={18} /> Cadastrar nova empresa</a>
      <a className="login-back" href="/">Voltar para o site</a>
      <small className="login-watermark">FernandoSch_System</small>
    </form>
  </main>
}
