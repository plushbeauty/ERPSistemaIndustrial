/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 12:55 BRT
 * Desenvolvedor: IA Co-Pilot (Homologado por Fernando)
 * ID da Revisão: REV-055
 * Alterações: Tipagem estrita do evento beforeinstallprompt; remoção de casts de Navigator e organização dos imports.
 * Status do Build Local: Não executado — validação será feita pelo gate remoto.
 * =========================================================================
 */

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

export default function PwaInstallButton() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState(false)
  const [help, setHelp] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    if (standalone) {
      setHidden(true)
      return
    }

    const handler = (event: BeforeInstallPromptEvent) => {
      event.preventDefault()
      setPrompt(event)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (hidden) return null

  async function install() {
    if (!prompt) { setHelp(true); return }
    const currentPrompt = prompt
    if (!currentPrompt) return
    setPrompt(null)
    try {
      await currentPrompt.prompt()
      await currentPrompt.userChoice
    } catch {
      setPrompt(null)
    }
  }

  return (
    <div className="pwa-install-banner" role="status">
      <div>
        <strong>Instale o ERP no computador</strong>
        <span>{help ? 'No Chrome/Edge: Menu ⋮ → Instalar aplicativo. O botão automático aparece quando o navegador liberar a instalação.' : 'Acesso rápido, tela própria e experiência de aplicativo.'}</span>
      </div>
      <div className="pwa-install-actions">
        <button type="button" onClick={() => void install()}>
          <Download size={16} /> Instalar
        </button>
        <button type="button" aria-label="Fechar" onClick={() => setPrompt(null)}>
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
