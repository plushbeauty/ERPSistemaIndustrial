import React, { Component, ReactNode, Suspense, lazy, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { supabaseConfigurado } from './lib/supabaseClient'
import './styles/app.css'
import './styles/tablet-launchpad.css'
import './styles/visual-ux-redesign-2026.css'
import './styles/infrastructure-trust.css'
import './styles/industrial-public-restoration.css'
import './styles/tailadmin-shell.css'
import { TabletLaunchpad } from './components/TabletLaunchpad'

const mountNode = document.getElementById('root') as HTMLElement | null
if (!mountNode) throw new Error('ROOT_ELEMENT_MISSING')
const rootContainer = mountNode

function renderFatal(title: string, message: string) {
  rootContainer.innerHTML = `<main class="bootstrap-fatal"><section><div class="bootstrap-eyebrow">SGQ ERP INDUSTRIAL</div><h1>${title}</h1><p>${message}</p><button onclick="location.reload()">Tentar novamente</button></section></main>`
}

const ERP_SHELL_PATHS = new Set(['/erp-industrial', '/master', '/usuarios', '/pcp', '/operacao-industrial', '/produtos-vendas', '/qualidade', '/qualidade/documentos', '/manual-usuario', '/compras-solicitacao', '/fiscal', '/fiscal/previsao-caixa', '/teste-erp'])
function isErpShellPath(pathname: string) { return ERP_SHELL_PATHS.has(pathname) }

class ChromeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error) { console.error('ERP_CHROME_FAILURE', error) }
  render() { return this.state.failed ? null : this.props.children }
}

function TabletHost() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('sgq:open-tablet', handler)
    return () => window.removeEventListener('sgq:open-tablet', handler)
  }, [])
  return <TabletLaunchpad isOpen={open} onClose={() => setOpen(false)} onNavigate={(route) => { location.href = route }} />
}

const LazyHeader = lazy(() => import('./layout/AppHeader'))
const LazyBackdrop = lazy(() => import('./layout/Backdrop'))
const LazyActions = lazy(() => import('./components/ERPHeaderActions'))
const LazyHelp = lazy(() => import('./GlobalHelp'))
const LazyPwa = lazy(() => import('./components/PwaInstallButton'))

function OptionalChrome({ shell }: { shell: boolean }) {
  if (!shell) return null
  return <ChromeBoundary><Suspense fallback={null}><LazyHeader/><LazyBackdrop/><LazyActions/><LazyHelp/><LazyPwa/><TabletHost/></Suspense></ChromeBoundary>
}

async function bootstrap() {
  if (!supabaseConfigurado) {
    renderFatal('Ambiente do ERP não configurado', 'A Vercel precisa expor VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY como variáveis públicas do Vite. Nunca use sb_secret ou service_role no navegador.')
    return
  }

  try {
    /* O AppEntry é o núcleo. Ele deve abrir mesmo se algum módulo visual opcional estiver com chunk/cache quebrado. */
    const entry = await import('./AppEntryV2')
    const AppEntry = entry.default
    const shell = isErpShellPath(location.pathname)

    ReactDOM.createRoot(rootContainer).render(
      <React.StrictMode>
        <AppEntry />
        <OptionalChrome shell={shell}/>
      </React.StrictMode>,
    )

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined))
    }
  } catch (error) {
    console.error('ERP_BOOT_FAILURE', error)
    renderFatal('Falha ao iniciar o ERP', 'O núcleo do sistema não conseguiu carregar. Recarregue a página; se persistir, verifique o último deploy e o cache do navegador.')
  }
}

void bootstrap()
