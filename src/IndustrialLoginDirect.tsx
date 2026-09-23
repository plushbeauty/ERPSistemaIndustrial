import { FormEvent, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Building2, Eye, EyeOff, KeyRound, LogIn, ShieldCheck, UserPlus } from 'lucide-react'
import { supabase, supabaseConfigurado } from './lib/supabaseClient'
import './styles/industrial-login.css'

// Production marker: native Supabase Auth login.

type Props = {
  returnTo?: string
  masterMode?: boolean
}

function safeReturnTo(value?: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/login')) {
    return '/erp-industrial'
  }
  return value
}

function normalizeIndustrialLogin(value: string) {
  return value.trim().toLowerCase()
}

async function validateIndustrialSession(userId: string) {
  const { data: profile, error: profileError } = await supabase
    .from('erp_usuarios')
    .select('id,auth_user_id,empresa_id,nivel_admin,ativo,is_master,perfil,deleted_at,setor_id')
    .eq('auth_user_id', userId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile) throw new Error('Usuário autenticado, mas sem perfil ERP ativo.')
  if (profile.auth_user_id !== userId) {
    throw new Error('O vínculo entre Supabase Auth e o perfil ERP é inválido.')
  }

  const perfil = String(profile.perfil ?? '').trim().toUpperCase()
  const nivel = Number(profile.nivel_admin ?? 0)
  const isMaster =
    profile.is_master === true &&
    nivel === 9 &&
    perfil === 'MASTER' &&
    profile.empresa_id === null &&
    (profile.setor_id === null || profile.setor_id === undefined)

  if (isMaster) {
    return { profile, empresa: null, isMaster: true }
  }

  if (profile.is_master === true || perfil === 'MASTER' || nivel === 9) {
    throw new Error('Registro administrativo inconsistente. Acesso bloqueado.')
  }

  if (!profile.empresa_id) {
    throw new Error('Usuário autenticado sem empresa industrial vinculada.')
  }

  const { data: empresa, error: empresaError } = await supabase
    .from('erp_empresas')
    .select('id,razao_social,nome_fantasia,ativo')
    .eq('id', profile.empresa_id)
    .eq('ativo', true)
    .maybeSingle()

  if (empresaError) throw empresaError
  if (!empresa) {
    throw new Error('A empresa vinculada ao usuário está inexistente ou inativa.')
  }

  return { profile, empresa, isMaster: false }
}

export default function IndustrialLoginDirect({ returnTo, masterMode = false }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let alive = true

    async function bootstrap() {
      if (!supabaseConfigurado) {
        if (alive) setChecking(false)
        return
      }

      try {
        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        const user = data.session?.user
        if (!user) {
          if (alive) setChecking(false)
          return
        }

        const result = await validateIndustrialSession(user.id)

        if (masterMode && !result.isMaster) {
          await supabase.auth.signOut()
          if (alive) {
            setError('Esta sessão não possui perfil MASTER autorizado.')
            setChecking(false)
          }
          return
        }

        if (alive) window.location.replace(safeReturnTo(returnTo))
      } catch (err) {
        console.error('[ERP login bootstrap]', err)
        await supabase.auth.signOut().catch(() => undefined)

        if (alive) {
          setError('A sessão anterior não possui acesso válido ao ERP Industrial. Entre novamente.')
          setChecking(false)
        }
      }
    }

    void bootstrap()

    return () => {
      alive = false
    }
  }, [masterMode, returnTo])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!supabaseConfigurado) {
      setError('O ambiente do ERP não está configurado. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY na Vercel.')
      return
    }

    const normalizedEmail = normalizeIndustrialLogin(email)

    if (!normalizedEmail || !password) {
      setError('Informe seu e-mail e sua senha.')
      return
    }

    if (!normalizedEmail.includes('@')) {
      setError('Use o e-mail cadastrado para entrar no ERP Industrial.')
      return
    }

    setBusy(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (authError) throw authError
      if (!data.user) throw new Error('O Supabase não retornou uma sessão válida.')

      const result = await validateIndustrialSession(data.user.id)

      if (masterMode && !result.isMaster) {
        throw new Error('Este acesso não possui perfil MASTER autorizado.')
      }

      const destination = safeReturnTo(returnTo)
      const destinationName =
        result.empresa?.nome_fantasia ||
        result.empresa?.razao_social ||
        'ambiente Master'

      setNotice(
        `Acesso validado para ${destinationName}. Abrindo o ERP…`,
      )

      window.location.replace(destination)
    } catch (err) {
      console.error('[ERP login]', err)
      await supabase.auth.signOut().catch(() => undefined)

      const message = err instanceof Error ? err.message : 'Não foi possível entrar no ERP.'
      const friendly =
        /invalid login credentials/i.test(message)
          ? 'E-mail ou senha incorretos.'
          : /email not confirmed/i.test(message)
            ? 'O e-mail ainda não foi confirmado no Supabase.'
            : message

      setError(friendly)
    } finally {
      setBusy(false)
    }
  }

  async function recover() {
    setError('')
    setNotice('')

    if (!supabaseConfigurado) {
      setError('O ambiente Supabase não está configurado na Vercel.')
      return
    }

    const normalizedEmail = normalizeIndustrialLogin(email)

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Informe seu e-mail corporativo para receber o link de recuperação.')
      return
    }

    setBusy(true)

    try {
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        { redirectTo: `${window.location.origin}/recuperar-senha` },
      )

      if (recoveryError) throw recoveryError

      setNotice(
        'Se o e-mail estiver cadastrado, as instruções de recuperação serão enviadas.',
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível solicitar a recuperação.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (checking) {
    return (
      <motion.main
        className="auth-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.32 }}
      >
        <section className="auth-panel">
          <div className="auth-panel-inner">
            <div className="auth-heading">
              <span className="auth-overline">
                {masterMode ? 'SGQ ERP INDUSTRIAL • LOGIN MASTER' : 'PLASTIBOR • ACESSO SEGURO'}
              </span>
            </div>
            <h1>Preparando seu acesso</h1>
            <p className="auth-description">Validando a sessão do SGQ ERP Industrial…</p>
            <div className="auth-security-note">
              <ShieldCheck size={16} />
              <span>Sessão segura e persistente.</span>
            </div>
          </div>
        </section>
      </motion.main>
    )
  }

  return (
    <motion.main
      className="auth-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.32 }}
    >
      <section className="auth-visual" aria-label="SGQ ERP Industrial">
        <img src="/images/sgq/sgq-erp-login.png" alt="Ambiente industrial do SGQ ERP" />
        <div className="auth-visual-shade" />
        <div className="auth-visual-grid" aria-hidden="true" />
        <div className="auth-visual-content">
          <a href="/" className="auth-visual-logo">
            <img src="/logo-industrial.svg" alt="SGQ ERP" />
          </a>
          <div className="auth-visual-message">
            <span>PLASTIBOR • SGQ ERP INDUSTRIAL</span>
            <h2>
              Uma fábrica inteira.
              <br />
              <em>Um único controle.</em>
            </h2>
            <p>
              PCP, produção, qualidade, estoque, manutenção, financeiro e fiscal
              trabalhando sobre os mesmos dados.
            </p>
            <div className="auth-trust">
              <b><ShieldCheck size={14} /> Sessão segura</b>
              <b><Building2 size={14} /> Multiempresa</b>
            </div>
          </div>
          <small>FernandoSch_System</small>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-inner">
          <div className="auth-mobile-brand">
            <a href="/">
              <img src="/logo-industrial.svg" alt="SGQ ERP" />
            </a>
          </div>

          <div className="auth-heading">
            <span className="auth-overline">PLASTIBOR • ACESSO SEGURO</span>
            <span className="auth-status"><i /> Ambiente protegido</span>
          </div>

          <h1>{masterMode ? 'Telas Master — Administrador do Projeto' : 'Entrar no SGQ ERP'}</h1>

          <p className="auth-description">
            {masterMode
              ? 'Área reservada ao proprietário do projeto. O perfil MASTER é validado antes da abertura do painel administrativo.'
              : 'Use as credenciais cadastradas. A empresa, o perfil e o status são verificados antes da entrada.'}
          </p>

          <form className="auth-form" onSubmit={submit}>
            <label htmlFor="erp-direct-email">E-mail</label>
            <div className="auth-input-wrap">
              <input
                id="erp-direct-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            <div className="auth-label-row">
              <label htmlFor="erp-direct-password">Senha</label>
              <button type="button" className="auth-text-button" onClick={recover} disabled={busy}>
                Esqueci minha senha
              </button>
            </div>

            <div className="auth-input-wrap">
              <input
                id="erp-direct-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <KeyRound className="auth-key-icon" size={16} aria-hidden="true" />
            </div>

            {error && <div className="auth-message auth-error" role="alert">{error}</div>}
            {notice && <div className="auth-message auth-notice" role="status">{notice}</div>}

            <motion.button
              className="auth-submit"
              type="submit"
              disabled={busy}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.985 }}
            >
              {busy ? (
                <>
                  <span className="auth-spinner" />
                  Entrando…
                </>
              ) : (
                <>
                  Entrar no sistema <LogIn size={18} />
                </>
              )}
            </motion.button>

            <div className="auth-divider"><span>ou</span></div>

            <a className="auth-register" href="/cadastro-master">
              <ShieldCheck size={18} /> Primeiro acesso · cadastrar proprietário Master
            </a>

            <a className="auth-register" href="/cadastro-empresa">
              <UserPlus size={18} /> Criar uma nova empresa
            </a>

            <a className="auth-trial" href="/cadastro-empresa">
              Começar teste grátis de 15 dias <ArrowRight size={16} />
            </a>
          </form>

          <div className="auth-security-note">
            <ShieldCheck size={16} />
            <span>Autenticação feita pelo Supabase Auth. Nenhuma senha é armazenada no navegador.</span>
          </div>

          <div className="auth-footer">
            <a href="/">Voltar para o site</a>
            <span>•</span>
            <a href="/contato">Fale conosco</a>
          </div>
        </div>
      </section>
    </motion.main>
  )
}
