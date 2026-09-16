import { FormEvent, useState } from 'react'
import { KeyRound, LogIn, UserPlus, ArrowRight } from 'lucide-react'
import { supabase, supabaseConfigurado, supabaseKeyExportada, supabaseUrlExportada } from './lib/supabaseClient'
import './styles/industrial-login.css'

type LoginResponse = {
  session?: {
    access_token?: string
    refresh_token?: string
  }
  empresa_id?: string
  profile?: {
    id: string
    empresa_id: string
    setor_id: string | null
    setor_codigo: string | null
    setor_nome: string | null
    username: string | null
    nome: string | null
    email: string
    nivel_admin: number
    is_master: boolean
  }
  error?: string
}

type HttpError = Error & { status?: number }

async function withRetry<T>(operation: () => Promise<T>, retries = 2): Promise<T> {
  let attempt = 0
  while (true) {
    try {
      return await operation()
    } catch (error) {
      const status = (error as HttpError).status
      const retryable = status === undefined || status >= 500
      if (!retryable || attempt >= retries) throw error
      attempt += 1
      await new Promise<void>((resolve) => window.setTimeout(resolve, 350 * attempt))
    }
  }
}

async function postErpLogin(identifier: string, password: string): Promise<LoginResponse> {
  const endpoint = `${supabaseUrlExportada}/functions/v1/erp-login`

  return withRetry(async () => {
    let response: Response
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKeyExportada,
          Authorization: `Bearer ${supabaseKeyExportada}`,
        },
        body: JSON.stringify({
          email: identifier,
          password,
          empresa_id: null,
        }),
      })
    } catch (error) {
      throw error instanceof Error ? error : new Error('Falha de rede ao chamar o serviço de autenticação.')
    }

    const raw = await response.text()
    let payload: LoginResponse = {}
    try {
      payload = raw ? (JSON.parse(raw) as LoginResponse) : {}
    } catch {
      payload = {}
    }

    if (!response.ok) {
      const error = new Error(payload.error || `Falha de autenticação (${response.status}).`) as HttpError
      error.status = response.status
      throw error
    }

    return payload
  })
}

export default function LoginStandalone() {
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [busy, setBusy] = useState(false)

  async function entrar(event: FormEvent) {
    event.preventDefault()
    setErro('')
    if (!supabaseConfigurado) {
      setErro('A conexão do sistema com o banco não está configurada.')
      return
    }
    if (!usuario.trim() || !senha) {
      setErro('Informe usuário/e-mail e senha.')
      return
    }

    setBusy(true)
    try {
      const data = await postErpLogin(usuario.trim(), senha)

      if (!data.session?.access_token || !data.session.refresh_token || !data.profile) {
        throw new Error(data.error || 'O serviço de autenticação não retornou uma sessão válida.')
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })

      if (sessionError) throw sessionError
      window.location.replace('/erp-industrial')
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível entrar no sistema.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="auth-screen">
    <section className="auth-visual" aria-label="SGQ ERP Industrial">
      <img src="/images/sgq/sgq-erp-login.png" alt="Ambiente industrial do SGQ ERP" />
      <div className="auth-visual-shade" />
      <div className="auth-visual-content">
        <a href="/" className="auth-visual-logo"><img src="/logo-industrial.svg" alt="SGQ ERP" /></a>
        <div className="auth-visual-message">
          <span>SGQ ERP • GESTÃO INDUSTRIAL</span>
          <h2>Uma fábrica inteira. Um único controle.</h2>
          <p>PCP, produção, qualidade, estoque, manutenção, financeiro e fiscal trabalhando sobre os mesmos dados.</p>
          <div className="auth-trust"><b>✓ Multiempresa</b><b>✓ Rastreabilidade</b><b>✓ Controle de acesso</b></div>
        </div>
        <small>FernandoSch_System</small>
      </div>
    </section>
    <section className="auth-panel">
      <div className="auth-panel-inner">
        <div className="auth-mobile-brand"><a href="/"><img src="/logo-industrial.svg" alt="SGQ ERP" /></a></div>
        <span className="auth-overline">ACESSO SEGURO</span>
        <h1>Entrar no SGQ ERP</h1>
        <p className="auth-description">Acesse com seu nome de usuário ou e-mail e senha. A empresa e as permissões são validadas automaticamente pelo seu perfil.</p>
        <form className="auth-form" onSubmit={entrar}>
          <label htmlFor="erp-user">Usuário ou e-mail</label>
          <div className="auth-input-wrap"><input id="erp-user" type="text" value={usuario} onChange={e => setUsuario(e.target.value)} placeholder="Seu nome de usuário ou e-mail" autoComplete="username" autoFocus required /></div>
          <label htmlFor="erp-password" style={{ marginTop: 16 }}>Senha</label>
          <div className="auth-input-wrap"><input id="erp-password" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Digite sua senha" autoComplete="current-password" required /><KeyRound size={17} aria-hidden="true" /></div>
          {erro && <div className="auth-message auth-error" role="alert">{erro}</div>}
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'} <LogIn size={18} /></button>
          <div className="auth-divider"><span>ou</span></div>
          <a className="auth-register" href="/cadastro-empresa"><UserPlus size={18} /> Criar uma nova empresa</a>
          <a className="auth-trial" href="/cadastro-empresa">Começar teste grátis de 15 dias <ArrowRight size={16} /></a>
        </form>
        <div className="auth-footer"><a href="/">Voltar para o site</a><span>•</span><a href="/contato">Fale conosco</a></div>
      </div>
    </section>
  </main>
}
