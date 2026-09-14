import React from 'react'
import ReactDOM from 'react-dom/client'
import { supabaseConfigurado } from './lib/supabaseClient'
import './styles/app.css'
import './styles/visual-ux-redesign-2026.css'
import './styles/infrastructure-trust.css'
import './styles/industrial-public-restoration.css'
import './styles/tailadmin-shell.css'

const root = document.getElementById('root')!

function renderFatal(title: string, message: string) {
  root.innerHTML = `<main style="min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;background:#f4f7f6;font-family:Inter,system-ui,sans-serif;color:#14211e"><section style="width:min(620px,100%);background:#fff;border:1px solid #dce6e2;border-radius:20px;padding:36px;box-shadow:0 20px 60px rgba(15,61,52,.10)"><div style="font-size:12px;font-weight:800;letter-spacing:.12em;color:#0f766e">SGQ ERP INDUSTRIAL</div><h1 style="margin:10px 0 8px;font-size:28px">${title}</h1><p style="margin:0;color:#60716c;line-height:1.6">${message}</p></section></main>`
}

async function bootstrap() {
  if (!supabaseConfigurado) {
    renderFatal('Ambiente do ERP não configurado', 'Configure a chave pública anon/publishable do Supabase no ambiente da Vercel e gere um novo deploy. Chaves privadas não são aceitas no frontend.')
    return
  }

  try {
    const [entry, nativeLogin, help, actions, boundary, pwa, guide, theme, sidebar, header, backdrop] = await Promise.all([
      import('./AppEntryV2'),
      import('./pages/LoginNativoUnificado'),
      import('./GlobalHelp'),
      import('./components/ERPHeaderActions'),
      import('./components/GlobalErrorBoundary'),
      import('./components/PwaInstallButton'),
      import('./components/VirtualGuide'),
      import('./context/ThemeContext'),
      import('./context/SidebarContext'),
      import('./layout/AppHeader'),
      import('./layout/Backdrop'),
    ])

    if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined))

    const AppEntry = entry.default
    const NativeLogin = nativeLogin.default
    const GlobalHelp = help.default
    const ERPHeaderActions = actions.default
    const GlobalErrorBoundary = boundary.default
    const PwaInstallButton = pwa.default
    const VirtualGuide = guide.default
    const { ThemeProvider } = theme
    const { SidebarProvider } = sidebar
    const AppHeader = header.default
    const Backdrop = backdrop.default

    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <GlobalErrorBoundary>
          <ThemeProvider>
            <SidebarProvider>
              {location.pathname === '/login' ? <NativeLogin /> : <AppEntry />}
              {location.pathname !== '/login' && <AppHeader />}
              {location.pathname !== '/login' && <Backdrop />}
              {location.pathname !== '/login' && <ERPHeaderActions />}
              {location.pathname !== '/login' && <GlobalHelp />}
              {location.pathname !== '/erp-industrial' && location.pathname !== '/login' && <VirtualGuide brand="SGQ ERP" name="Dri" />}
              {location.pathname !== '/login' && <PwaInstallButton />}
            </SidebarProvider>
          </ThemeProvider>
        </GlobalErrorBoundary>
      </React.StrictMode>,
    )
  } catch (error) {
    console.error('ERP_BOOT_FAILURE', error)
    renderFatal('Falha ao iniciar o ERP', 'Um módulo do aplicativo não conseguiu carregar. O erro foi isolado para impedir tela vazia.')
  }
}

void bootstrap()
