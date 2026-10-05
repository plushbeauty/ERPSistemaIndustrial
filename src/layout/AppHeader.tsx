import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, HelpCircle, LayoutGrid, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSidebar } from '../context/SidebarContext'
import ThemeToggleButton from '../components/common/ThemeToggleButton'
import { SYNQRA_MODULES } from '../assets/synqra/icons'
import { supabase } from '../lib/supabaseClient'

const normalize = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR')

export default function AppHeader() {
  const { isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar, closeMobileSidebar } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const activeModule = useMemo(() => [...SYNQRA_MODULES]
    .filter(module => module.route)
    .sort((left, right) => (right.route?.length ?? 0) - (left.route?.length ?? 0))
    .find(module => location.pathname === module.route || location.pathname.startsWith(`${module.route}/`)), [location.pathname])
  const matches = useMemo(() => {
    const term = normalize(query.trim())
    return SYNQRA_MODULES
      .filter(module => module.route && (!term || normalize(module.label).includes(term)))
      .slice(0, 7)
  }, [query])

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
        window.requestAnimationFrame(() => searchRef.current?.focus())
      }
      if (event.key === 'Escape') {
        setSearchOpen(false)
        closeMobileSidebar()
      }
    }
    document.addEventListener('keydown', onShortcut)
    return () => document.removeEventListener('keydown', onShortcut)
  }, [closeMobileSidebar])

  const goTo = (route: string) => {
    navigate(route)
    setQuery('')
    setSearchOpen(false)
  }

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        setLogoutError(error.message)
        return
      }
      navigate('/login')
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <header className="synqra-app-header">
      <div className="synqra-header-context">
        <button
          type="button"
          className="synqra-header-menu synqra-header-menu-desktop"
          onClick={toggleSidebar}
          aria-label={isExpanded ? 'Recolher navegação' : 'Expandir navegação'}
          aria-expanded={isExpanded}
        >
          {isExpanded ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
        </button>
        <button
          type="button"
          className="synqra-header-menu synqra-header-menu-mobile"
          onClick={toggleMobileSidebar}
          aria-label={isMobileOpen ? 'Fechar navegação' : 'Abrir navegação'}
          aria-expanded={isMobileOpen}
        >
          <Menu size={20} />
        </button>
        <div className="synqra-breadcrumb" aria-label="Localização atual">
          <span>SYNQRA ERP</span>
          <ChevronRight size={15} aria-hidden="true" />
          <strong>{activeModule?.label ?? 'Área operacional'}</strong>
        </div>
      </div>

      <div className="synqra-global-search-wrap">
        <label className="synqra-global-search">
          <Search size={17} aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onFocus={() => setSearchOpen(true)}
            onChange={event => { setQuery(event.target.value); setSearchOpen(true) }}
            onKeyDown={event => {
              const firstRoute = matches[0]?.route
              if (event.key === 'Enter' && firstRoute) goTo(firstRoute)
            }}
            placeholder="Buscar módulos..."
            aria-label="Buscar módulos do ERP"
            aria-controls="synqra-search-results"
          />
          <kbd>Ctrl K</kbd>
        </label>
        {searchOpen && (
          <div className="synqra-search-results" id="synqra-search-results" role="region" aria-label="Resultados da busca">
            {matches.length ? matches.map(({ key, label, route, Icon }) => (
              <button key={key} type="button" onClick={() => route && goTo(route)}>
                <Icon size={17} aria-hidden="true" />
                <span>{label}</span>
              </button>
            )) : <p>Nenhum módulo com rota disponível corresponde à busca.</p>}
          </div>
        )}
      </div>

      <div className="synqra-header-actions">
        <span className="synqra-header-motto">MAIS CONTROLE PARA O SEU RESULTADO</span>
        <button type="button" className="synqra-header-action" onClick={() => navigate('/ajuda')} aria-label="Abrir suporte">
          <HelpCircle size={18} />
        </button>
        <button type="button" className="synqra-header-action synqra-header-tablet" onClick={() => navigate('/tablet/dashboard')} aria-label="Abrir painel tablet">
          <LayoutGrid size={18} />
        </button>
        <ThemeToggleButton />
        <span className="synqra-slashes" aria-label="SYNQRA"><i /><i /><i /></span>
        <button type="button" className="synqra-header-action" onClick={() => void logout()} aria-label="Sair do ERP" title="Sair">
          <LogOut size={18} />
        </button>
      </div>
      {logoutError && <span className="synqra-header-error" role="alert">{logoutError}</span>}
    </header>
  )
}
