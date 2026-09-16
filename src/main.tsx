import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppBootstrap from './AppBootstrap'

const ERP_BOOTSTRAP_VERSION = '2026-09-16-auth-v4'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Elemento raiz #root não encontrado.')

console.info(`[ERP] bootstrap ${ERP_BOOTSTRAP_VERSION}`)
createRoot(rootElement).render(
  <StrictMode>
    <AppBootstrap />
  </StrictMode>,
)
