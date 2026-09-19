import { StrictMode, lazy, Suspense, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/erp-reference-ux-2026.css'
import './styles/industrial-command-center-2026.css'

const ERP_BOOTSTRAP_VERSION = '2026-09-18-browser-auth-v9'

function FatalBootstrap({ error, retry }: { error: unknown; retry: () => void }) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f4f7f5', color: '#17342f', fontFamily: 'Inter,system-ui,sans-serif' }}>
      <section style={{ width: 'min(680px,100%)', background: '#fff', border: '1px solid #d9e3df', borderRadius: 24, padding: 28, boxShadow: '0 30px 90px rgba(20,55,49,.12)' }}>
        <strong style={{ fontSize: 11, letterSpacing: '.18em', color: '#9a763b' }}>SGQ ERP INDUSTRIAL • BOOTSTRAP</strong>
        <h1 style={{ fontSize: 28, margin: '10px 0 8px' }}>Falha ao carregar o aplicativo</h1>
        <p style={{ color: '#667975', lineHeight: 1.7 }}>O navegador conseguiu carregar o HTML, mas o módulo principal não iniciou. O erro real está abaixo.</p>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 18, padding: 16, borderRadius: 14, background: '#f2f5f3', color: '#8a5d23', fontSize: 12 }}>{message}</pre>
        <button type="button" onClick={retry} style={{ marginTop: 18, border: 0, borderRadius: 12, padding: '12px 18px', fontWeight: 900, cursor: 'pointer', background: '#0f766e', color: '#fff' }}>Recarregar aplicativo</button>
      </section>
    </main>
  )
}

function BootstrapLoader() {
  const [error, setError] = useState<unknown>(null)
  const [retryKey, setRetryKey] = useState(0)
  const AppBootstrap = lazy(() =>
    import('./AppBootstrap').catch((reason) => {
      setError(reason)
      throw reason
    }),
  )
  if (error) return <FatalBootstrap error={error} retry={() => { setError(null); setRetryKey(value => value + 1) }} />
  return (
    <Suspense fallback={<div role="status" aria-live="polite" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'Inter,system-ui,sans-serif', background: '#f4f7f5', color: '#17342f' }}><strong>Carregando SGQ ERP Industrial…</strong></div>}>
      <AppBootstrap key={retryKey} />
    </Suspense>
  )
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Elemento raiz #root não encontrado.')

console.info(`[ERP] bootstrap ${ERP_BOOTSTRAP_VERSION}`)
createRoot(rootElement).render(
  <StrictMode>
    <BootstrapLoader />
  </StrictMode>,
)

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

void limparAplicacaoPwaLegada()
