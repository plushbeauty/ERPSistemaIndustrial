import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { Moon, Sun } from 'lucide-react'
import AppEntry from './AppEntryV2'
import GlobalHelp from './GlobalHelp'
import ERPHeaderActions from './components/ERPHeaderActions'
import GlobalErrorBoundary from './components/GlobalErrorBoundary'
import PwaInstallButton from './components/PwaInstallButton'
import VirtualGuide from './components/VirtualGuide'
import './styles/app.css'
import './styles/visual-ux-redesign-2026.css'
import './styles/infrastructure-trust.css'
import './styles/industrial-public-restoration.css'

const THEME_KEY = 'sgq-erp-theme'

type Theme = 'light' | 'dark'

function ThemeController() {
  const [theme, setTheme] = useState<Theme>('light')
  const [path, setPath] = useState(location.pathname)

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY)
    const initial: Theme = saved === 'dark' || saved === 'light'
      ? saved
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    setTheme(initial)
    document.documentElement.dataset.sgqTheme = initial
    document.documentElement.classList.toggle('dark', initial === 'dark')

    const onPopState = () => setPath(location.pathname)
    addEventListener('popstate', onPopState)
    return () => removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.sgqTheme = theme
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const publicRoute = path === '/' || path === '/login' || path === '/planos' || path.startsWith('/cadastro')
  if (publicRoute) return null

  const toggle = () => setTheme(value => value === 'dark' ? 'light' : 'dark')
  return <button className="sgq-theme-toggle" type="button" onClick={toggle} aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}>
    {theme === 'dark' ? <Sun size={19}/> : <Moon size={19}/>}<span>{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
  </button>
}

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <AppEntry />
      <ThemeController />
      <ERPHeaderActions />
      <GlobalHelp />
      {location.pathname !== '/erp-industrial' && <VirtualGuide brand="SGQ ERP" name="Dri"/>}
      <PwaInstallButton/>
    </GlobalErrorBoundary>
  </React.StrictMode>
)
