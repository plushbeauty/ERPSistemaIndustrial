/*
  @AUDIT_REVISION: #AUDIT-ERP-20260920-01
  @STATUS: VERIFIED_GREEN
  @SCOPE: src/main.tsx
  @CHECKLIST: No-Duplicate-Actions | Valid-Canonical-Links | Active-Noop-Callbacks
*/
import { StrictMode, Suspense, lazy, type ComponentType } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import { PontoProvider } from './context/PontoContext'
import { SidebarProvider } from './context/SidebarContext'


type LazyModule = { default?: ComponentType<unknown>; [key: string]: unknown }

function lazyPage(loader: () => Promise<LazyModule>, exportName: string) {
  return lazy(async () => {
    const module = await loader()
    const component = module.default ?? module[exportName]
    if (typeof component !== 'function' && typeof component !== 'object') {
      throw new Error('LAZY_EXPORT_MISSING: ' + exportName)
    }
    return { default: component as ComponentType<unknown> }
  })
}
import './styles/index.css'
import './styles/erp-reference-ux-2026.css'
import './styles/industrial-command-center-2026.css'
import './styles/design-system-2026.css'
import './styles/form-system-2026.css'
import './styles/erp-compact.css'

const AppBootstrap = lazyPage(() => import('./AppBootstrap'), 'AppBootstrap')
const ConfiguracoesADMPage = lazyPage(() => import('./pages/configuracoes/ConfiguracoesADM'), 'ConfiguracoesADMPage')

const ERP_BOOTSTRAP_VERSION = '2026-09-18-browser-auth-v9'

function DemoConfiguracoesADM() {
  return (
    <Suspense fallback={<div role="status" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'Inter,system-ui,sans-serif', background: '#F4FBFD', color: '#123B50' }}><strong>Carregando demonstração visual de Configurações ADM…</strong></div>}>
      <ConfiguracoesADMPage />
    </Suspense>
  )
}

function BootstrapLoader() {
  return (
    <Suspense fallback={<div role="status" aria-live="polite" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'Inter,system-ui,sans-serif', background: '#f4f5f3', color: '#17342f' }}><strong>Carregando SYSNQRA ERP & SGQ INDUSTRIAL…</strong></div>}>
      <AppBootstrap />
    </Suspense>
  )
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Elemento raiz #root não encontrado.')

createRoot(rootElement).render(
  <StrictMode>
    <MotionConfig reducedMotion="user" transition={{ duration: 0.22, ease: 'easeOut' }}>
      <BrowserRouter>
        <SidebarProvider>
        <PontoProvider>
        {window.location.pathname === '/configuracoes-adm' || window.location.pathname.startsWith('/configuracoes-adm/')
          ? <DemoConfiguracoesADM />
          : <BootstrapLoader />}
        </PontoProvider>
        </SidebarProvider>
      </BrowserRouter>
    </MotionConfig>
  </StrictMode>,
)

const LEGACY_PWA_CLEANUP_KEY = 'erp-industrial-legacy-pwa-cleanup-v2'

async function limparAplicacaoPwaLegadaUmaVez() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  if (window.localStorage.getItem(LEGACY_PWA_CLEANUP_KEY) === '1') return
  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.allSettled(registrations.map(registration => registration.unregister()))
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.allSettled(keys.map(key => caches.delete(key)))
    }
    window.localStorage.setItem(LEGACY_PWA_CLEANUP_KEY, '1')
  } catch {
    // Limpeza legada é best-effort; falha aqui não impede o bootstrap.
}

void limparAplicacaoPwaLegadaUmaVez()
