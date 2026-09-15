import React, { useEffect, useState } from 'react'
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
const rootContainer = mountNode as HTMLElement

function renderFatal(title: string, message: string) {
  rootContainer.innerHTML = `<main class="bootstrap-fatal"><section><div class="bootstrap-eyebrow">SGQ ERP INDUSTRIAL</div><h1>${title}</h1><p>${message}</p><button onclick="location.reload()">Tentar novamente</button></section></main>`
}

const ERP_SHELL_PATHS = new Set(['/erp-industrial', '/master', '/usuarios', '/pcp', '/operacao-industrial', '/produtos-vendas', '/qualidade', '/qualidade/documentos', '/manual-usuario', '/compras-solicitacao', '/fiscal', '/fiscal/previsao-caixa', '/teste-erp'])
function isErpShellPath(pathname: string) { return ERP_SHELL_PATHS.has(pathname) }

function TabletHost() {
  const [open, setOpen] = useState(false)
  useEffect(() => { const handler = () => setOpen(true); window.addEventListener('sgq:open-tablet', handler); return () => window.removeEventListener('sgq:open-tablet', handler) }, [])
  return <TabletLaunchpad isOpen={open} onClose={() => setOpen(false)} onNavigate={(route) => { location.href = route }} />
}

async function bootstrap() {
  if (!supabaseConfigurado) { renderFatal('Ambiente do ERP não configurado', 'A Vercel precisa expor VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY como variáveis públicas do Vite. Nunca use sb_secret ou service_role no navegador.'); return }
  try {
    const [entry, help, actions, boundary, pwa, theme, sidebar, header, backdrop] = await Promise.all([
      import('./AppEntryV2'), import('./GlobalHelp'), import('./components/ERPHeaderActions'), import('./components/GlobalErrorBoundary'), import('./components/PwaInstallButton'), import('./context/ThemeContext'), import('./context/SidebarContext'), import('./layout/AppHeader'), import('./layout/Backdrop'),
    ])
    if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined))
    const AppEntry = entry.default; const GlobalHelp = help.default; const ERPHeaderActions = actions.default; const GlobalErrorBoundary = boundary.default; const PwaInstallButton = pwa.default
    const { ThemeProvider } = theme; const { SidebarProvider } = sidebar; const AppHeader = header.default; const Backdrop = backdrop.default; const shell = isErpShellPath(location.pathname)
    ReactDOM.createRoot(rootContainer).render(<React.StrictMode><GlobalErrorBoundary><ThemeProvider><SidebarProvider><AppEntry />{shell && <AppHeader />}{shell && <Backdrop />}{shell && <ERPHeaderActions />}{shell && <GlobalHelp />}{shell && <PwaInstallButton />}{shell && <TabletHost />}</SidebarProvider></ThemeProvider></GlobalErrorBoundary></React.StrictMode>)
  } catch (error) { console.error('ERP_BOOT_FAILURE', error); renderFatal('Falha ao iniciar o ERP', 'O carregamento de um módulo foi isolado para impedir uma tela vazia. Recarregue para tentar novamente.') }
}
void bootstrap()
