import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppBootstrap from './AppBootstrap'
import './styles/erp-reference-ux-2026.css'
import './styles/industrial-command-center-2026.css'

const ERP_BOOTSTRAP_VERSION = '2026-09-16-auth-v6-visual'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Elemento raiz #root não encontrado.')

console.info(`[ERP] bootstrap ${ERP_BOOTSTRAP_VERSION}`)
createRoot(rootElement).render(
  <StrictMode>
    <AppBootstrap />
  </StrictMode>,
)
