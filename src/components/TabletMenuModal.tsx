import {
  Activity, AlertTriangle, BarChart3, Bell, Building2, CalendarCheck, CheckSquare,
  ClipboardX, FileSpreadsheet, FileText, Gauge, GitFork, GraduationCap, History,
  LayoutDashboard, Lock, Paperclip, SearchCode, ShieldAlert, ShieldCheck,
  SlidersHorizontal, Tablet, Truck, X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type TabletMenuModule = {
  key: string
  number: string
  label: string
  description: string
  route?: string
  icon: LucideIcon
}

export type TabletMenuModalProps = {
  isOpen: boolean
  onClose: () => void
  onNavigate: (route: string) => void
}

const modules: readonly TabletMenuModule[] = [
  { key: 'acesso', number: 'M01', label: 'ACESSO', description: 'Autenticação e controle de entrada no SGQ.', icon: Lock },
  { key: 'organizacoes', number: 'M02', label: 'ORGANIZAÇÕES', description: 'Empresas e organizações do ambiente SGQ.', route: '/configuracoes-adm', icon: Building2 },
  { key: 'permissoes', number: 'M03', label: 'PERMISSÕES', description: 'Perfis, funções e permissões administrativas.', route: '/configuracoes-adm', icon: ShieldCheck },
  { key: 'dashboard', number: 'M04', label: 'DASHBOARD', description: 'Visão consolidada dos indicadores e pendências.', route: '/erp-industrial', icon: LayoutDashboard },
  { key: 'ocorrencias', number: 'M05', label: 'OCORRÊNCIAS', description: 'Registro e acompanhamento de ocorrências da qualidade.', route: '/qualidade/rnc', icon: AlertTriangle },
  { key: 'nao-conformidades', number: 'M06', label: 'NÃO CONF.', description: 'Não conformidades, tratamento e rastreabilidade.', route: '/qualidade/rnc', icon: ClipboardX },
  { key: 'acoes-5w2h', number: 'M07', label: 'AÇÕES 5W2H', description: 'Planos de ação e acompanhamento estruturado.', route: '/qualidade/metodologia-8d', icon: CalendarCheck },
  { key: 'causa-raiz', number: 'M08', label: 'CAUSA RAIZ', description: 'Análise de causas e investigação estruturada.', route: '/qualidade/metodologia-8d', icon: GitFork },
  { key: 'evidencias', number: 'M09', label: 'EVIDÊNCIAS', description: 'Arquivos, registros e evidências vinculadas aos processos.', route: '/documentos-qualidade', icon: Paperclip },
  { key: 'aprovacoes', number: 'M10', label: 'APROVAÇÕES', description: 'Fluxos de aprovação e validação de registros.', route: '/configuracoes-adm', icon: CheckSquare },
  { key: 'eficacia', number: 'M11', label: 'EFICÁCIA', description: 'Verificação da eficácia das ações implementadas.', route: '/qualidade/rnc', icon: Activity },
  { key: 'notificacoes', number: 'M12', label: 'NOTIFICAÇÕES', description: 'Central de comunicações e avisos operacionais.', icon: Bell },
  { key: 'auditorias', number: 'M13', label: 'AUDITORIAS', description: 'Auditorias, verificações e registros de evidência.', route: '/qualidade/auditoria-5s', icon: SearchCode },
  { key: 'documentos', number: 'M14', label: 'DOCUMENTOS', description: 'Documentos controlados e registros do SGQ.', route: '/qualidade/documentos', icon: FileText },
  { key: 'indicadores', number: 'M15', label: 'INDICADORES', description: 'Indicadores operacionais e desempenho da qualidade.', route: '/pcp/dashboard-oee', icon: BarChart3 },
  { key: 'riscos', number: 'M16', label: 'RISCOS', description: 'Identificação, análise e acompanhamento de riscos.', route: '/qualidade/pfmea', icon: ShieldAlert },
  { key: 'fornecedores', number: 'M17', label: 'FORNECEDORES', description: 'Cadastro e acompanhamento de fornecedores.', route: '/fornecedores', icon: Truck },
  { key: 'treinamentos', number: 'M18', label: 'TREINAMENTOS', description: 'Treinamentos, capacitação e registros de competência.', route: '/rh', icon: GraduationCap },
  { key: 'calibracao', number: 'M19', label: 'CALIBRAÇÃO', description: 'Instrumentos, calibrações e vencimentos metrológicos.', route: '/qualidade/calibracao', icon: Gauge },
  { key: 'relatorios', number: 'M20', label: 'RELATÓRIOS', description: 'Relatórios e consolidações documentais da qualidade.', route: '/qualidade/relatorios-documentos', icon: FileSpreadsheet },
  { key: 'configuracoes', number: 'M21', label: 'CONFIGURAÇÕES', description: 'Parâmetros e configuração administrativa do SGQ.', route: '/configuracoes-adm', icon: SlidersHorizontal },
  { key: 'auditoria-sistema', number: 'M22', label: 'AUDITORIA SIST.', description: 'Histórico e trilha de auditoria do sistema.', route: '/admin/logs', icon: History },
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
        className="max-h-[calc(100vh-24px)] w-full max-w-[1180px] overflow-auto rounded-[2px] border border-slate-600 bg-[#1e222b] p-3 text-white shadow-[0_30px_90px_rgba(2,6,23,0.48)] sm:max-h-[calc(100vh-36px)] sm:p-4"
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
              <p className="mt-1 text-[11px] leading-tight text-slate-400">Ambiente operacional integrado do ERP Industrial</p>
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

        <div className="mt-3 grid grid-cols-11 gap-1.5 max-[1050px]:grid-cols-6 max-[700px]:grid-cols-4 max-[460px]:grid-cols-3" aria-label="Módulos do ERP">
          {modules.map(({ key, number, label, description, route, icon: Icon }) => {
            const disabled = !route

            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                aria-disabled={disabled}
                title={disabled ? description : label}
                className="group flex min-h-[86px] min-w-0 touch-manipulation flex-col items-center justify-center gap-[7px] rounded-[2px] border border-slate-600 bg-[#252a34] px-1 py-1.5 text-center transition-[background,border-color,transform] duration-100 hover:-translate-y-px hover:border-slate-300 hover:bg-[#303642] active:translate-y-0 active:bg-[#38404d] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => {
                  if (route) {
                    onClose()
                    onNavigate(route)
                  }
                }}
              >
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[2px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
                  style={{ backgroundColor: '#2D8DB8' }}
                  aria-hidden="true"
                >
                  <Icon size={28} strokeWidth={2.15} />
                </span>
                <span className="flex min-w-0 flex-col items-center gap-0.5">
                  <small className="text-[8px] font-semibold leading-none tracking-[0.08em]" style={{ color: '#67c7dc' }}>{number}</small>
                  <strong className="max-w-full text-[9px] font-semibold leading-[1.15] tracking-[0.01em] text-slate-100">{label}</strong>
                </span>
              </button>
            )
          })}
        </div>

        <footer className="mt-3 flex flex-wrap justify-between gap-2 border-t border-[#DBE7EA] pt-2.5 text-[9px] font-medium tracking-[0.03em] text-[#64777D]">
          <span>ERPSistema INDUSTRIAL</span>
          <span>Central operacional integrada</span>
          <span>22 módulos</span>
        </footer>
      </section>
    </div>
  )
}
