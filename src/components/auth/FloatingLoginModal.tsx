import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Cog, Factory, LockKeyhole, LockKeyholeOpen, X } from 'lucide-react'
import IndustrialLoginDirect from '../../IndustrialLoginDirect'
import './FloatingLoginModal.css'

type Props = { isOpen: boolean; onClose: () => void; returnTo?: string }
type LoginState = 'idle' | 'authenticating' | 'unlocked' | 'error'

export default function FloatingLoginModal({ isOpen, onClose, returnTo = '/erp-industrial' }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const [loginState, setLoginState] = useState<LoginState>('idle')

  useEffect(() => {
    if (!isOpen) return
    setLoginState('idle')
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 0)
    return () => {
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
      previousFocus.current?.focus()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const stateText = loginState === 'authenticating' ? 'Validando credenciais' : loginState === 'unlocked' ? 'Acesso liberado' : loginState === 'error' ? 'Verifique seus dados' : 'Acesso corporativo seguro'

  return createPortal(
    <div className="floating-login-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className="floating-login-dialog" role="dialog" aria-modal="true" aria-labelledby="floating-login-title">
        <button ref={closeRef} type="button" className="floating-login-close" onClick={onClose} aria-label="Fechar janela de acesso">
          <X size={18} />
        </button>
        <h2 id="floating-login-title" className="sr-only">Entrar no SYSNQRA ERP &amp; SGQ INDUSTRIAL</h2>
        <div className={`floating-login-brand floating-login-brand--${loginState}`}>
          <div className="floating-login-emblem" aria-hidden="true">
            <Factory className="floating-login-factory" size={27}/>
            <Cog className="floating-login-gear" size={21}/>
            {loginState === 'unlocked' ? <LockKeyholeOpen className="floating-login-lock" size={17}/> : <LockKeyhole className="floating-login-lock" size={17}/>}
          </div>
          <div className="floating-login-brand-copy"><b>SYSNQRA INDUSTRIAL</b><span>{stateText}</span></div>
          <span className="floating-login-status-dot" aria-label={stateText}/>
        </div>
        <IndustrialLoginDirect returnTo={returnTo} onLoginStateChange={setLoginState} />
      </section>
    </div>,
    document.body,
  )
}
