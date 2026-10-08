import {
  Activity,
  Award,
  BarChart3,
  Boxes,
  CalendarDays,
  CheckCircle,
  ClipboardCheck,
  ClipboardList,
  Cpu,
  Factory,
  FileText,
  Gauge,
  Handshake,
  Headphones,
  Home,
  Landmark,
  PackageSearch,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tablet,
  Truck,
  UserCircle,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type TabletMenuModule = {
  key: string
  number: string
  label: string
  description: string
  route?: string
  icon: LucideIcon
  accent: string
}

export type TabletMenuModalProps = {
  isOpen: boolean
  onClose: () => void
  onNavigate: (route: string) => void
}

const modules: readonly TabletMenuModule[] = [
  { key: 'inicio', number: '01', label: 'INÍCIO', description: 'Central operacional e acesso rápido ao ERP.', route: '/comercial', icon: Home, accent: '#2D8DB8' },
  { key: 'dashboard', number: '02', label: 'DASHBOARD', description: 'Visão executiva, indicadores e situação operacional.', route: '/erp-industrial', icon: BarChart3, accent: '#2D8DB8' },
  { key: 'vendas', number: '03', label: 'VENDAS', description: 'Pedidos, clientes, carteira, preços e acompanhamento comercial.', route: '/vendas/tablet', icon: Handshake, accent: '#2D8DB8' },
  { key: 'compras', number: '04', label: 'COMPRAS', description: 'Solicitações, cotações, pedidos, fornecedores e recebimento.', route: '/compras/rfq', icon: ShoppingCart, accent: '#7A4E00' },
  { key: 'estoque', number: '05', label: 'ESTOQUE', description: 'Saldos, movimentos, inventário, lotes e rastreabilidade.', route: '/estoque', icon: Boxes, accent: '#087A58' },
  { key: 'fiscal', number: '06', label: 'FISCAL', description: 'Documentos fiscais, impostos e operações tributárias.', route: '/fiscal', icon: FileText, accent: '#6B3FA0' },
  { key: 'financeiro', number: '07', label: 'FINANCEIRO', description: 'Caixa, contas, liquidação e controle financeiro.', route: '/financeiro/caixa', icon: Landmark, accent: '#17445A' },
  { key: 'pcp', number: '08', label: 'PCP', description: 'Ordens de produção, programação, capacidade e OEE.', route: '/pcp', icon: Factory, accent: '#0B7654' },
  { key: 'qualidade', number: '09', label: 'QUALIDADE', description: 'Inspeções, liberação, RPNC, instrumentos e quarentena.', route: '/qualidade', icon: Award, accent: '#16788A' },
  { key: 'sgq', number: '10', label: 'SGQ', description: 'Documentos, procedimentos, auditorias e evidências.', route: '/vendas/sgq', icon: ClipboardCheck, accent: '#0F6170' },
  { key: 'engenharia', number: '11', label: 'ENGENHARIA', description: 'Produtos, estruturas, processos e documentação técnica.', route: '/engenharia', icon: Cpu, accent: '#17445A' },
  { key: 'produtos', number: '12', label: 'PRODUTOS', description: 'Cadastros, SKUs, grupos, unidades e informações do produto.', route: '/produtos', icon: Boxes, accent: '#2D8DB8' },
  { key: 'clientes', number: '13', label: 'CLIENTES', description: 'Cadastro e relacionamento com clientes do ERP.', route: '/clientes', icon: Users, accent: '#2563A6' },
  { key: 'fornecedores', number: '14', label: 'FORNECEDORES', description: 'Cadastro e relacionamento com fornecedores.', route: '/fornecedores', icon: Truck, accent: '#7A4E00' },
  { key: 'rh', number: '15', label: 'RH', description: 'Gestão de pessoas e rotinas administrativas.', route: '/rh', icon: Users, accent: '#9A3B67' },
  { key: 'administracao', number: '16', label: 'ADMINISTRAÇÃO', description: 'Usuários, permissões e administração do ERP.', route: '/usuarios-admin', icon: ClipboardList, accent: '#17445A' },
  { key: 'logistica', number: '17', label: 'LOGÍSTICA', description: 'Expedição, roteirização, separação e entrega.', route: '/expedicao/roteirizacao', icon: Truck, accent: '#A64B00' },
  { key: 'manutencao', number: '18', label: 'MANUTENÇÃO', description: 'Ordens, manutenção preventiva e corretiva.', route: '/manutencao/ordens', icon: Wrench, accent: '#8A6200' },
  { key: 'materiais', number: '19', label: 'MATERIAIS', description: 'Necessidades, reservas, lotes e controle de materiais.', route: '/pcp/materiais', icon: PackageSearch, accent: '#B85C00' },
  { key: 'documentos', number: '20', label: 'DOCUMENTOS', description: 'Documentos controlados e registros de qualidade.', route: '/documentos-qualidade', icon: FileText, accent: '#16788A' },
  { key: 'relatorios', number: '21', label: 'RELATÓRIOS', description: 'Consultas, análises e relatórios operacionais.', route: '/vendas/relatorios', icon: BarChart3, accent: '#2563EB' },
  { key: 'auditorias', number: '22', label: 'AUDITORIAS', description: 'Planos, auditorias, verificações e evidências.', route: '/qualidade/auditoria-5s', icon: ClipboardCheck, accent: '#0F6170' },
  { key: 'planejamento', number: '23', label: 'PLANEJAMENTO', description: 'Planejamento de produção e necessidades.', route: '/pcp/planejamento', icon: CalendarDays, accent: '#0B7654' },
  { key: 'indicadores', number: '24', label: 'INDICADORES', description: 'OEE, desempenho e indicadores industriais.', route: '/pcp/dashboard-oee', icon: Gauge, accent: '#087A58' },
  { key: 'configuracoes', number: '25', label: 'CONFIGURAÇÕES', description: 'Parâmetros, identidade, empresa e administração.', route: '/configuracoes-adm', icon: Settings, accent: '#2D8DB8' },
  { key: 'suporte', number: '26', label: 'SUPORTE', description: 'Ajuda operacional e suporte do sistema.', route: '/ajuda', icon: Headphones, accent: '#17445A' },
  { key: 'perfil', number: '27', label: 'PERFIL', description: 'Dados e configurações do usuário autenticado.', route: '/usuarios', icon: UserCircle, accent: '#2563A6' },
  { key: 'agenda', number: '28', label: 'AGENDA', description: 'Módulo registrado no ERP; rota operacional ainda não publicada.', icon: CalendarDays, accent: '#64748B' },
  { key: 'treinamentos', number: '29', label: 'TREINAMENTOS', description: 'Módulo registrado no ERP; rota operacional ainda não publicada.', icon: Award, accent: '#64748B' },
  { key: 'seguranca', number: '30', label: 'SEGURANÇA DO TRABALHO', description: 'Módulo registrado no ERP; rota operacional ainda não publicada.', icon: ShieldCheck, accent: '#64748B' },
]

export default function TabletMenuModal({ isOpen, onClose, onNavigate }: TabletMenuModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-[5px] sm:p-[18px]"
      role="dialog"
      aria-modal="true"
      aria-label="Central de módulos do Tablet"
      onMouseDown={onClose}
    >
      <section
        className="max-h-[calc(100vh-24px)] w-full max-w-[1080px] overflow-auto rounded-[2px] border border-slate-200 bg-white p-3 text-[#1e222b] shadow-[0_30px_90px_rgba(2,6,23,0.48)] sm:max-h-[calc(100vh-36px)] sm:p-4"
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/logo/sgq-erp.png" alt="SGQERP Industrial" className="h-[38px] w-[148px] shrink-0 object-contain max-[620px]:h-8 max-[620px]:w-28" />
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] text-white max-[620px]:h-[38px] max-[620px]:w-[38px]" aria-hidden="true">
              <Tablet size={24} />
            </span>
            <div className="min-w-0">
              <strong className="block text-xs font-semibold leading-tight tracking-[0.02em]">CENTRAL DE MÓDULOS — MODO TABLET</strong>
              <p className="mt-1 text-[11px] leading-tight text-slate-500">Ambiente operacional integrado do ERP Industrial</p>
            </div>
          </div>

          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[2px] border border-slate-400 bg-slate-50 text-slate-600 touch-manipulation hover:border-[#2D8DB8] hover:bg-slate-100"
            onClick={onClose}
            aria-label="Fechar central de módulos"
            title="Fechar"
          >
            <X size={22} />
          </button>
        </header>

        <div className="mt-3 grid grid-cols-6 gap-2 max-[900px]:grid-cols-4 max-[620px]:grid-cols-3 max-[420px]:grid-cols-2" aria-label="Módulos do ERP">
          {modules.map(({ key, number, label, description, route, icon: Icon, accent }) => {
            const disabled = !route

            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                aria-disabled={disabled}
                title={disabled ? description : label}
                className="group flex min-h-[94px] min-w-0 touch-manipulation flex-col items-center justify-center gap-[7px] rounded-[2px] border bg-white px-1.5 py-2 text-center transition-[background,border-color,transform] duration-100 hover:-translate-y-px hover:bg-[#F4FBFD] active:translate-y-0 active:bg-[#EAF5F8] disabled:cursor-not-allowed disabled:opacity-40"
                style={{ borderColor: accent }}
                onClick={() => {
                  if (route) {
                    onClose()
                    onNavigate(route)
                  }
                }}
              >
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[2px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
                  style={{ backgroundColor: accent }}
                  aria-hidden="true"
                >
                  <Icon size={28} strokeWidth={2.15} />
                </span>
                <span className="flex min-w-0 flex-col items-center gap-0.5">
                  <small className="text-[8px] font-semibold leading-none tracking-[0.08em]" style={{ color: accent }}>{number}</small>
                  <strong className="max-w-full text-[9px] font-semibold leading-[1.15] tracking-[0.01em] text-[#123B50]">{label}</strong>
                </span>
              </button>
            )
          })}
        </div>

        <footer className="mt-3 flex flex-wrap justify-between gap-2 border-t border-[#DBE7EA] pt-2.5 text-[9px] font-medium tracking-[0.03em] text-[#64777D]">
          <span>ERPSistema INDUSTRIAL</span>
          <span>Central operacional integrada</span>
          <span>30 módulos</span>
        </footer>
      </section>
    </div>
  )
}
