import { useEffect } from 'react'
import {
  Archive, BarChart3, BookOpen, Boxes, CalendarDays, ClipboardCheck,
  ClipboardList, FileCheck2, FileText, Factory, FolderOpen, Gauge,
  Landmark, Percent, Ruler, Settings, ShieldCheck, UserCog, Warehouse, Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import '../../styles/module-tablet-panel.css'

export type ModuleTabletKey = 'sgq' | 'pcp' | 'fiscal' | 'estoque' | 'manutencao' | 'configuracoes'

type ModuleTabletItem = {
  label: string
  description: string
  route: string
  icon: LucideIcon
  minNivel?: number
}
type ModuleTabletPanel = {
  label: string
  description: string
  icon: LucideIcon
  items: readonly ModuleTabletItem[]
}

export const MODULE_TABLET_PANELS: Record<ModuleTabletKey, ModuleTabletPanel> = {
  sgq: {
    label: 'Sistema de Gestão da Qualidade',
    description: 'Acesse as rotinas disponíveis do SGQ em um só lugar.',
    icon: ShieldCheck,
    items: [
      { label: 'Metrologia e calibração', description: 'Instrumentos, validade e medições.', route: '/pageprincipal/paquimetro', icon: Ruler },
      { label: 'RPNC', description: 'Não conformidades, evidências e ações.', route: '/pageprincipal/qualidade/rpnc', icon: ClipboardCheck },
      { label: 'Formulário de RPNC', description: 'Ishikawa, 5 porquês e CAPA.', route: '/pageprincipal/qualidade/rpnc-formulario', icon: FileText },
      { label: 'Auditorias da qualidade', description: 'Planeje e acompanhe auditorias.', route: '/pageprincipal/qualidade/auditorias', icon: ClipboardList },
      { label: 'GED de qualidade', description: 'Documentos, revisões e anexos.', route: '/pageprincipal/qualidade/ged', icon: FolderOpen },
    ],
  },
  pcp: {
    label: 'Planejamento e Controle da Produção',
    description: 'Planejamento, processos, capacidade e execução da produção.',
    icon: Factory,
    items: [
      { label: 'Central PCP', description: 'Ordens, processos, estrutura e apontamentos.', route: '/pageprincipal/pcp', icon: Gauge },
      { label: 'Fichas de processo', description: 'Consulte e mantenha fichas de produção.', route: '/pageprincipal/pcp/fichas-processo', icon: ClipboardList },
      { label: 'Roteiro de operações', description: 'Operações e roteiros de fabricação.', route: '/pageprincipal/pcp/roteiros', icon: Boxes },
      { label: 'Carga e capacidade', description: 'Acompanhe capacidade e carga produtiva.', route: '/pageprincipal/pcp/capacidade', icon: BarChart3 },
      { label: 'Postos de trabalho', description: 'Consulte os postos cadastrados.', route: '/pageprincipal/chao-de-fabrica/postos', icon: Factory },
      { label: 'Portal do operador', description: 'Acesso operacional do chão de fábrica.', route: '/pageprincipal/chao-de-fabrica/portal-operador', icon: ClipboardCheck },
    ],
  },
  fiscal: {
    label: 'Fiscal',
    description: 'Acesse emissão, documentos e rotinas fiscais disponíveis.',
    icon: FileText,
    items: [
      { label: 'Central Fiscal', description: 'Documentos, liberações e relatórios fiscais.', route: '/pageprincipal/fiscal', icon: Landmark },
      { label: 'Emissão de NF-e', description: 'Emita notas a partir dos pedidos autorizados.', route: '/pageprincipal/fiscal/emissao', icon: FileCheck2 },
      { label: 'Ano fiscal', description: 'Consulte e gerencie o período fiscal.', route: '/pageprincipal/fiscal/ano', icon: CalendarDays },
      { label: 'Classificação fiscal', description: 'Consulte classificações tributárias.', route: '/pageprincipal/fiscal/classificacao', icon: BookOpen },
      { label: 'Auditoria documental', description: 'Acompanhe documentos e pendências.', route: '/pageprincipal/fiscal/auditoria-documental', icon: ClipboardCheck },
      { label: 'Estorno de lançamentos', description: 'Acesse o fluxo de estorno fiscal.', route: '/pageprincipal/fiscal/estorno', icon: Percent },
      { label: 'Painel razão geral', description: 'Consulte os lançamentos do razão.', route: '/pageprincipal/fiscal/razao', icon: Archive },
    ],
  },
  estoque: {
    label: 'Estoque e Almoxarifado',
    description: 'Acesse as rotinas de controle de saldos e inventário.',
    icon: Warehouse,
    items: [
      { label: 'Auditoria de saldos', description: 'Confira saldos registrados no estoque.', route: '/pageprincipal/estoque/auditoria-saldos', icon: ClipboardCheck },
      { label: 'Balanço de estoque', description: 'Consulte e execute o balanço disponível.', route: '/pageprincipal/estoque/balanco', icon: Boxes },
      { label: 'Regras de depreciação', description: 'Consulte as regras cadastradas.', route: '/pageprincipal/estoque/depreciacao', icon: Percent },
    ],
  },
  manutencao: {
    label: 'Manutenção',
    description: 'A área de Manutenção ainda não possui uma tela operacional registrada no roteador autenticado.',
    icon: Wrench,
    items: [],
  },
  configuracoes: {
    label: 'Configurações',
    description: 'Acesse as configurações gerais e as opções autorizadas ao seu perfil.',
    icon: Settings,
    items: [
      { label: 'Configurações gerais', description: 'Parâmetros e configurações da empresa.', route: '/pageprincipal/administracao-configuracoes', icon: Settings },
      { label: 'Configurações de usuário', description: 'Acessos disponíveis para administradores.', route: '/pageprincipal/configuracoes-usuario', icon: UserCog, minNivel: 8 },
    ],
  },
}

export default function ModuleTabletMenuModal({
  moduleKey, sessionNivel, onClose, onNavigate,
}: {
  moduleKey: ModuleTabletKey | null
  sessionNivel: number
  onClose: () => void
  onNavigate: (route: string) => void
}) {
  const panel = moduleKey ? MODULE_TABLET_PANELS[moduleKey] : null

  useEffect(() => {
    if (!panel) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose, panel])

  if (!panel) return null
  const PanelIcon = panel.icon
  const visibleItems = panel.items.filter(item => item.minNivel === undefined || sessionNivel >= item.minNivel)

  return (
    <div className="module-tablet-backdrop" role="dialog" aria-modal="true" aria-label={'Painel de módulos: ' + panel.label}
      onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className="module-tablet-panel">
        <header className="module-tablet-header">
          <img src="/logo/logo.png" alt="SYSNQRA ERP & SGQ INDUSTRIAL" className="module-tablet-logo" />
          <div className="module-tablet-heading">
            <span className="module-tablet-section-icon" aria-hidden="true"><PanelIcon size={24} /></span>
            <div><p>PAINEL DE MÓDULOS</p><h1>{panel.label}</h1><span>{panel.description}</span></div>
          </div>
          <button type="button" className="module-tablet-close" onClick={onClose} aria-label="Fechar painel de módulos">×</button>
        </header>
        {visibleItems.length > 0 ? (
          <nav className="module-tablet-grid" aria-label={'Módulos de ' + panel.label}>
            {visibleItems.map(({ label, description, route, icon: Icon }) => (
              <button key={route} type="button" className="module-tablet-card" onClick={() => onNavigate(route)}>
                <span className="module-tablet-card-icon" aria-hidden="true"><Icon size={34} strokeWidth={2} /></span>
                <strong>{label}</strong><span>{description}</span>
              </button>
            ))}
          </nav>
        ) : (
          <p className="module-tablet-empty" role="status">
            Nenhum destino operacional está disponível neste módulo no momento. O painel será preenchido quando uma tela real de Manutenção for integrada.
          </p>
        )}
        <footer className="module-tablet-footer">SYSNQRA ERP INDUSTRIAL · Acesso conforme permissões da sessão</footer>
      </section>
    </div>
  )
}
