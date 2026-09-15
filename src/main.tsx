import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppBootstrap from './AppBootstrap'

const ERP_BOOTSTRAP_VERSION = '2026-09-15-v3'

async function limparAmbienteLocal() {
  if (typeof window === 'undefined') return
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(async (registration) => {
        try { registration.active?.postMessage({ type: 'CLEAR_EVERYTHING' }) } catch {}
        try { await registration.unregister() } catch {}
      }))
    }
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
    }
    const prefixes = ['erp-', 'sgq-', 'vite-', 'workbox-']
    for (const storage of [localStorage, sessionStorage]) {
      for (let i = storage.length - 1; i >= 0; i -= 1) {
        const key = storage.key(i)
        if (key && prefixes.some((prefix) => key.toLowerCase().startsWith(prefix))) storage.removeItem(key)
      }
    }
  } catch (error) {
    console.warn('[ERP] Limpeza de cache concluída com avisos:', error)
  }
}

void limparAmbienteLocal()

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Elemento raiz #root não encontrado.')

console.info(`[ERP] bootstrap ${ERP_BOOTSTRAP_VERSION}`)
createRoot(rootElement).render(
  <StrictMode>
    <AppBootstrap />
  </StrictMode>,
)
