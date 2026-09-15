import React, { useEffect } from 'react'
import { Activity, CalendarDays, ClipboardCheck, Factory, FileText, LayoutGrid, Package, ShoppingCart, Users, Wrench, X } from 'lucide-react'

interface MenuButton {
  label: string
  description: string
  route: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  category: 'Operação' | 'Faturamento' | 'Administrativo'
}

const erpButtons: MenuButton[] = [
  { label: 'PCP & Planejamento', description: 'Agenda de máquinas e sequenciamento', route: '/pcp', icon: CalendarDays, category: 'Operação' },
  { label: 'Produtos & Estoque', description: 'Controle de materiais e insumos', route: '/produtos-vendas', icon: Package, category: 'Operação' },
  { label: 'Ordens de Produção', description: 'Apontamentos e chão de fábrica', route: '/operacao-industrial', icon: Factory, category: 'Operação' },
  { label: 'Máquinas & Manutenção', description: 'Equipamentos, manutenção e histórico', route: '/operacao-industrial', icon: Wrench, category: 'Operação' },
  { label: 'Controle de Qualidade', description: 'Inspeções, RPNC e conformidades', route: '/qualidade', icon: ClipboardCheck, category: 'Administrativo' },
  { label: 'Usuários & Permissões', description: 'Níveis de acesso e segurança Master', route: '/usuarios', icon: Users, category: 'Administrativo' },
  { label: 'Indicadores OEE', description: 'Eficiência global e indicadores', route: '/erp-industrial', icon: Activity, category: 'Administrativo' },
  { label: 'Documentos Controlados', description: 'Procedimentos e documentos da qualidade', route: '/qualidade/documentos', icon: FileText, category: 'Administrativo' },
  { label: 'Recebimento XML', description: 'Importação de NF-e e notas fiscais', route: '/fiscal', icon: FileText, category: 'Faturamento' },
  { label: 'Solicitação de Compras', description: 'Pedidos e cotações de insumos', route: '/compras-solicitacao', icon: ShoppingCart, category: 'Faturamento' },
]

interface TabletLaunchpadProps {
  onNavigate: (route: string) => void
  isOpen: boolean
  onClose: () => void
}

export const TabletLaunchpad: React.FC<TabletLaunchpadProps> = ({ onNavigate, isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="tablet-overlay" role="dialog" aria-modal="true" aria-label="Painel Tablet do SGQ ERP">
      <div className="tablet-frame">
        <div className="tablet-screen">
          <header className="tablet-header">
            <div>
              <span>SISTEMA DE GESTÃO INTEGRADA</span>
              <h2>Central de Módulos SGQ ERP</h2>
            </div>
            <button className="tablet-close-btn" onClick={onClose} aria-label="Fechar Painel"><X size={20} /></button>
          </header>
          <div className="tablet-grid-container">
            {(['Operação', 'Faturamento', 'Administrativo'] as const).map((category) => (
              <section key={category} className="tablet-category-section">
                <h3 className="tablet-category-title">{category}</h3>
                <div className="tablet-grid">
                  {erpButtons.filter((button) => button.category === category).map((button) => {
                    const Icon = button.icon
                    return (
                      <button key={button.route + button.label} className="tablet-card-button" onClick={() => { onNavigate(button.route); onClose() }}>
                        <div className="tablet-card-icon"><Icon size={24} /></div>
                        <div className="tablet-card-info"><strong>{button.label}</strong><small>{button.description}</small></div>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
          <button type="button" className="tablet-home-button-indicator" onClick={onClose} aria-label="Fechar painel" />
        </div>
      </div>
    </div>
  )
}

export default TabletLaunchpad
