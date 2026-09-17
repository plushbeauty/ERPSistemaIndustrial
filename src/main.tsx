import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppBootstrap from './AppBootstrap'
import './styles/erp-reference-ux-2026.css'
import './styles/industrial-command-center-2026.css'

const ERP_BOOTSTRAP_VERSION = '2026-09-17-browser-auth-v7'

async function limparAplicacaoPwaLegada() {
  if (!('serviceWorker' in navigator)) return
  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.allSettled(registrations.map(registration => registration.unregister()))
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.allSettled(keys.map(key => caches.delete(key)))
    }
  } catch (error) {
    console.warn('[ERP] limpeza de cache legado ignorada:', error)
  }
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Elemento raiz #root não encontrado.')

void (async () => {
  await Promise.allSettled([limparAplicacaoPwaLegada()])
  console.info(`[ERP] bootstrap ${ERP_BOOTSTRAP_VERSION}`)
  createRoot(rootElement).render(
    <StrictMode>
      <AppBootstrap />
    </StrictMode>,
  )
})()
