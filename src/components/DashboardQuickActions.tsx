import { ClipboardCheck, Factory, PauseCircle, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
export interface QuickAction { id: 'op' | 'parada' | 'refugo' | 'molde'; label: string; description: string; icon: LucideIcon }
export const INDUSTRIAL_QUICK_ACTIONS: QuickAction[] = [
  { id: 'op', label: 'Abertura de OP', description: 'Consultar e iniciar uma ordem', icon: Factory },
  { id: 'parada', label: 'Parada de máquina', description: 'Registrar motivo e duração', icon: PauseCircle },
  { id: 'refugo', label: 'Apontamento de refugo', description: 'Registrar perda e causa', icon: ClipboardCheck },
  { id: 'molde', label: 'Troca de molde', description: 'Abrir checklist de setup', icon: Wrench },
]
export interface DashboardQuickActionsProps { onAction?: (action: QuickAction) => void }
export default function DashboardQuickActions({ onAction }: DashboardQuickActionsProps) {
  const run = (action: QuickAction) => { try { onAction?.(action) } catch (error) { console.error('[DashboardQuickActions]', error) } }
  return <section className="erp-quick-actions" aria-label="Ações rápidas do chão de fábrica">
    {INDUSTRIAL_QUICK_ACTIONS.map(action => { const Icon = action.icon; return <button key={action.id} type="button" onClick={() => run(action)}><Icon size={21}/><span><strong>{action.label}</strong><small>{action.description}</small></span></button> })}
  </section>
}
