import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

type SidebarContextValue = {
  isExpanded: boolean
  isMobileOpen: boolean
  toggleSidebar: () => void
  toggleMobileSidebar: () => void
  closeMobileSidebar: () => void
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined)
const STORAGE_KEY = 'sgq-erp-sidebar-expanded'

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setExpanded] = useState(true)
  const [isMobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === 'false') setExpanded(false)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('sgq-collapsed', !isExpanded)
    document.documentElement.dataset.sidebarMobile = isMobileOpen ? 'open' : 'closed'
  }, [isExpanded, isMobileOpen])

  const toggleSidebar = useCallback(() => setExpanded(value => {
    const next = !value
    localStorage.setItem(STORAGE_KEY, String(next))
    return next
  }), [])
  const toggleMobileSidebar = useCallback(() => setMobileOpen(value => !value), [])
  const closeMobileSidebar = useCallback(() => setMobileOpen(false), [])

  return (
    <SidebarContext.Provider value={{ isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar, closeMobileSidebar }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) throw new Error('useSidebar must be used within SidebarProvider')
  return context
}
