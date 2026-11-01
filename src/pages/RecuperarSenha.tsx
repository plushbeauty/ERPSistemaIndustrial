/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-01
 * @REVISAO: REV-ONBOARDING-20261101-01 — destino real do link de recuperação
 *
 * O link enviado por resetPasswordForEmail aponta para /recuperar-senha, que
 * até então não existia: quem clicava era devolvido ao login. Esta página
 * trata a sessão de recuperação gerada pelo Supabase (PKCE) e grava a senha
 * nova com updateUser antes de liberar qualquer destino dentro do ERP.
 */
import { FormEvent, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft, ArrowRight, KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import { supabase, supabaseConfigurado } from '../lib/supabaseClient'
import '../styles/ativar-sysnqra-20261101.css'

export default function RecuperarSenha() {
  const [estado, setEstado] = useState<'verificando' | 'definir' | 'solicitar'>('verificando')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    let vivo = true
    async function verificar() {
      if (!supabaseConfigurado) {
        if (vivo) {
          setErro('O ambiente do ERP não está configurado. Verifique VITE_SUPABASE_URL e a chave pública do Supabase.')
          setEstado('solicitar')
        }
        return
      }
      // O link de recuperação chega como ?code= (PKCE) ou como hash type=recovery.
      // getSession() já executa a troca do code antes de devolver a sessão.
      const busca = window.location.search
      const hash = window.location.hash
      const linkAberto = busca.includes('code=') || /type=recovery/.test(hash) || hash.includes('access_token=')
      try {
        const { data } = await supabase.auth.getSession()
        if (!vivo) return
        setEstado(linkAberto || data.session?.user ? 'definir' : 'solicitar')
      } catch {
        if (vivo) setEstado('solicitar')
      }
    }
    void verificar()
    return () => { vivo = false }
  }, [])

  async function solicitarLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro('')
    setAviso('')
    const alvo = email.trim().toLowerCase()
    if (!alvo.includes('@')) {
      setErro('Informe o e-mail cadastrado para receber o link de recuperação.')
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(alvo, {
        redirectTo: `${window.location.origin}/recuperar-senha`,
      })
      if (error) throw error
      setAviso('Se o e-mail estiver cadastrado, o link de recuperação será enviado. Abra o link neste navegador para definir a nova senha.')
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível solicitar a recuperação agora.')
    } finally {
      setBusy(false)
    }
  }

  async function definirSenha(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro('')
    if (senha.length < 8) {
      setErro('A nova senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (!/[a-zA-Z]/.test(senha) || !/[0-9]/.test(senha)) {
      setErro('A nova senha deve combinar letras e números.')
      return
    }
    if (senha !== confirmar) {
      setErro('As senhas não conferem.')
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: senha })
      if (error) throw error
      setAviso('Senha atualizada no Supabase. Abrindo a validação do seu perfil ERP…')
      // A sessão nova é revalidada pelo bootstrap do login, que confere
      // erp_usuarios, empresa e destino antes de liberar qualquer tela.
      window.setTimeout(() => window.location.replace('/login'), 900)
    } catch (falha) {
      const mensagem = falha instanceof Error ? falha.message : ''
      setErro(/different from the current password|already used/i.test(mensagem)
        ? 'Use uma senha diferente da atual.'
        : mensagem || 'Não foi possível atualizar a senha agora. Solicite um novo link.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="sxv-page" style={{ justifyContent: 'center' }}>
      <div className="sxv-shell" style={{ gridTemplateColumns: 'minmax(0, 620px)', justifyContent: 'center' }}>
        <section className="sxv-panel">
          <div className="sxv-panel-head">
            <span>ACESSO SEGURADO · SUPABASE AUTH</span>
            <h1>{estado === 'definir' ? 'Definir nova senha' : 'Recuperar acesso ao SYSNQRA'}</h1>
            <p>
              {estado === 'definir'
                ? 'Escolha a nova senha do seu acesso. O vínculo com a empresa e o perfil ERP são conferidos pelo sistema depois da troca.'
                : 'Informe seu e-mail cadastrado para receber o link de redefinição. O link vence e só funciona neste navegador.'}
            </p>
          </div>

          {estado === 'verificando' && (
            <div className="sxv-inline-loading"><Loader2 size={16} className="sxv-spin" /> Verificando o link de recuperação…</div>
          )}

          {erro && <div className="sxv-error" role="alert">{erro}</div>}
          {aviso && <div className="sxv-notice" role="status">{aviso}</div>}

          {estado === 'solicitar' && (
            <form className="sxv-form" onSubmit={solicitarLink}>
              <div className="sxv-section">
                <div className="sxv-section-title"><KeyRound size={15} /> E-mail cadastrado</div>
                <label>E-mail
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" autoFocus placeholder="seu@email.com" required />
                </label>
              </div>
              <div className="sxv-actions">
                <a className="sxv-btn sxv-btn-ghost" href="/login"><ArrowLeft size={16} /> Voltar ao login</a>
                <motion.button type="submit" className="sxv-btn sxv-btn-primary" disabled={busy} whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }}>
                  {busy ? <><Loader2 size={16} className="sxv-spin" /> Enviando link…</> : <>Enviar link de recuperação <ArrowRight size={16} /></>}
                </motion.button>
              </div>
            </form>
          )}

          {estado === 'definir' && (
            <form className="sxv-form" onSubmit={definirSenha}>
              <div className="sxv-section">
                <div className="sxv-section-title"><KeyRound size={15} /> Nova senha</div>
                <div className="sxv-grid">
                  <label>Nova senha<input type="password" value={senha} onChange={e => setSenha(e.target.value)} autoComplete="new-password" autoFocus minLength={8} required /></label>
                  <label>Confirmar nova senha<input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} autoComplete="new-password" minLength={8} required /></label>
                </div>
                <small className="sxv-muted">Mínimo de 8 caracteres, combinando letras e números.</small>
              </div>
              <div className="sxv-actions">
                <a className="sxv-btn sxv-btn-ghost" href="/login"><ArrowLeft size={16} /> Cancelar</a>
                <motion.button type="submit" className="sxv-btn sxv-btn-primary" disabled={busy} whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }}>
                  {busy ? <><Loader2 size={16} className="sxv-spin" /> Gravando…</> : <>Salvar nova senha <ArrowRight size={16} /></>}
                </motion.button>
              </div>
            </form>
          )}

          <p className="sxv-legal"><ShieldCheck size={13} style={{ verticalAlign: -2 }} /> A senha é verificada pelo Supabase Auth e nunca fica salva no navegador.</p>
        </section>
      </div>
    </main>
  )
}
