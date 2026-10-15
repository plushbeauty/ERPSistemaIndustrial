import {
  Activity, AlertTriangle, BarChart3, Bell, Building2, CalendarCheck, CheckSquare,
  ClipboardX, FileSpreadsheet, FileText, Gauge, GitFork, GraduationCap, History,
  LayoutDashboard, Lock, Paperclip, SearchCode, ShieldAlert, ShieldCheck,
  SlidersHorizontal, Tablet, Truck, X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export type TabletMenuModule = {
  key: string
  number: string
  label: string
  description: string
  route?: string
  icon: LucideIcon
  permission?: string
  accent?: 'green' | 'blue' | 'gray'
}

export type TabletMenuModalProps = {
  isOpen: boolean
  onClose: () => void
  onNavigate: (route: string) => void
}

const modules: readonly TabletMenuModule[] = [
  { key: 'acesso', number: 'M01', label: 'ACESSO', description: 'Autenticação e controle de entrada no SGQ.', icon: Lock },
  { key: 'organizacoes', number: 'M02', label: 'ORGANIZAÇÕES', description: 'Empresas e organizações do ambiente SGQ.', route: '/configuracoes-adm/empresa', permission: 'users.read', icon: Building2 },
  { key: 'permissoes', number: 'M03', label: 'PERMISSÕES', description: 'Perfis, funções e permissões administrativas.', route: '/configuracoes-adm/permissoes', permission: 'users.read', icon: ShieldCheck },
  { key: 'dashboard', number: 'M04', label: 'DASHBOARD', description: 'Visão consolidada dos indicadores e pendências.', route: '/erp-industrial', icon: LayoutDashboard },
  { key: 'ocorrencias', number: 'M05', label: 'OCORRÊNCIAS', description: 'Registro e acompanhamento de ocorrências da qualidade.', route: '/qualidade/rnc', permission: 'audit.read', icon: AlertTriangle },
  { key: 'nao-conformidades', number: 'M06', label: 'NÃO CONF.', description: 'Não conformidades, tratamento e rastreabilidade.', route: '/qualidade/rnc', permission: 'audit.read', icon: ClipboardX },
  { key: 'acoes-5w2h', number: 'M07', label: 'AÇÕES 5W2H', description: 'Planos de ação e acompanhamento estruturado.', route: '/qualidade/metodologia-8d', permission: 'audit.read', icon: CalendarCheck },
  { key: 'causa-raiz', number: 'M08', label: 'CAUSA RAIZ', description: 'Análise de causas e investigação estruturada.', route: '/qualidade/metodologia-8d', permission: 'audit.read', icon: GitFork },
  { key: 'evidencias', number: 'M09', label: 'EVIDÊNCIAS', description: 'Arquivos, registros e evidências vinculadas aos processos.', route: '/documentos-qualidade', permission: 'audit.read', icon: Paperclip },
  { key: 'aprovacoes', number: 'M10', label: 'APROVAÇÕES', description: 'Fluxos de aprovação e validação de registros.', route: '/configuracoes-adm', icon: CheckSquare },
  { key: 'eficacia', number: 'M11', label: 'EFICÁCIA', description: 'Verificação da eficácia das ações implementadas.', route: '/qualidade/rnc', permission: 'audit.read', icon: Activity },
  { key: 'notificacoes', number: 'M12', label: 'NOTIFICAÇÕES', description: 'Central de notificações específica não possui rota operacional comprovada.', icon: Bell },
  { key: 'auditorias', number: 'M13', label: 'AUDITORIAS', description: 'Auditorias, verificações e registros de evidência.', route: '/qualidade/auditoria-5s', permission: 'audit.read', icon: SearchCode },
  { key: 'documentos', number: 'M14', label: 'DOCUMENTOS', description: 'Documentos controlados e registros do SGQ.', route: '/qualidade/documentos', permission: 'audit.read', icon: FileText },
  { key: 'indicadores', number: 'M15', label: 'INDICADORES', description: 'Indicadores operacionais e desempenho da qualidade.', route: '/pcp/dashboard-oee', permission: 'reports.read', icon: BarChart3 },
  { key: 'riscos', number: 'M16', label: 'RISCOS', description: 'Identificação, análise e acompanhamento de riscos.', route: '/qualidade/pfmea', permission: 'audit.read', icon: ShieldAlert },
  { key: 'fornecedores', number: 'M17', label: 'FORNECEDORES', description: 'Cadastro e acompanhamento de fornecedores.', route: '/fornecedores', permission: 'purchases.read', icon: Truck },
  { key: 'treinamentos', number: 'M18', label: 'TREINAMENTOS', description: 'Treinamentos, capacitação e registros de competência.', route: '/rh', permission: 'users.read', icon: GraduationCap },
  { key: 'calibracao', number: 'M19', label: 'CALIBRAÇÃO', description: 'Instrumentos, calibrações e vencimentos metrológicos.', route: '/qualidade/calibracao', permission: 'audit.read', icon: Gauge },
  { key: 'relatorios', number: 'M20', label: 'RELATÓRIOS', description: 'Relatórios e consolidações documentais da qualidade.', route: '/qualidade/relatorios-documentos', permission: 'reports.read', icon: FileSpreadsheet },
  { key: 'configuracoes', number: 'M21', label: 'CONFIGURAÇÕES', description: 'Parâmetros e configuração administrativa do SGQ.', route: '/configuracoes-adm', permission: 'users.read', icon: SlidersHorizontal },
  { key: 'auditoria-sistema', number: 'M22', label: 'AUDITORIA SIST.', description: 'Histórico e trilha de auditoria do sistema.', route: '/admin/logs', permission: 'audit.read', icon: History },
]

export default function TabletMenuModal({ isOpen, onClose, onNavigate }: TabletMenuModalProps) {
  const [permissions, setPermissions] = useState<Set<string>>(new Set())
  const [accessReady, setAccessReady] = useState(false)
  const [accessError, setAccessError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    let alive = true
    void (async () => {
      try {
        const auth = await supabase.auth.getUser()
        if (auth.error) throw auth.error
        if (!auth.data.user) throw new Error('Sessão não autenticada.')
        const { data: profile, error: profileError } = await supabase
          .from('erp_usuarios')
          .select('role_id,empresa_id,is_master,nivel_admin,perfil')
          .eq('auth_user_id', auth.data.user.id)
          .eq('ativo', true)
          .is('deleted_at', null)
          .maybeSingle()
        if (profileError) throw profileError
        if (!profile) throw new Error('Usuário ERP ativo não encontrado.')
        const master = Boolean(profile.is_master) && Number(profile.nivel_admin ?? 0) >= 100 && String(profile.perfil ?? '').trim().toUpperCase() === 'MASTER' && profile.empresa_id === null
        if (master) {
          if (alive) setPermissions(new Set(['*']))
          return
        }
        if (!profile.role_id) throw new Error('Usuário ERP sem papel RBAC vinculado.')
        const { data: assignments, error: assignmentError } = await supabase
          .from('erp_role_permissions')
          .select('permission_id')
          .eq('role_id', profile.role_id)
        if (assignmentError) throw assignmentError
        const ids = (assignments ?? []).map(row => String(row.permission_id))
        if (!ids.length) {
          if (alive) setPermissions(new Set())
          return
        }
        const { data: rows, error: permissionError } = await supabase
          .from('erp_permissions')
          .select('id,code')
          .in('id', ids)
        if (permissionError) throw permissionError
        const next = new Set<string>()
        for (const row of rows ?? []) {
          next.add(String(row.code))
          const prefix = String(row.code).split('.')[0]
          if (prefix) next.add(prefix)
        }
        if (alive) setPermissions(next)
      } catch (error) {
        if (alive) setAccessError(error instanceof Error ? error.message : 'Falha ao validar permissões.')
      } finally {
        if (alive) setAccessReady(true)
      }
    })()
    return () => { alive = false }
  }, [isOpen])

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
        className="flex max-h-[calc(100vh-32px)] w-full max-w-[1440px] flex-col overflow-hidden rounded-[3px] border border-[#405363] bg-[#1e222b] p-4 text-white shadow-[0_32px_100px_rgba(2,6,23,0.62)] sm:max-h-[calc(100vh-48px)] sm:p-5"
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[#405363] pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/logo/logo.png" alt="SGQERP Industrial" className="h-[38px] w-[148px] shrink-0 object-contain max-[620px]:h-8 max-[620px]:w-28" />
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] text-white max-[620px]:h-[38px] max-[620px]:w-[38px]" aria-hidden="true">
              <Tablet size={24} />
            </span>
            <div className="min-w-0">
              <strong className="block text-[15px] font-bold leading-tight tracking-[0.08em] text-white max-[620px]:text-[12px]">CENTRAL DE MÓDULOS — MODO TABLET</strong>
              <p className="mt-1 text-[12px] leading-tight text-slate-300 max-[620px]:text-[10px]">Ambiente operacional integrado do ERP Industrial</p>
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

        {accessError && <div className="mb-2 border border-red-400 bg-red-950 px-2 py-1.5 text-[10px] text-red-100" role="alert">{accessError}</div>}

        <div className="mt-4 grid min-h-0 flex-1 grid-cols-5 content-start gap-3 overflow-y-auto pr-1 max-[1200px]:grid-cols-4 max-[900px]:grid-cols-3 max-[620px]:grid-cols-2 max-[400px]:grid-cols-1" aria-label="Módulos do ERP">
          {modules.map(({ key, number, label, description, route, permission, icon: Icon }) => {
            const disabled = !route || !accessReady || Boolean(accessError) || Boolean(permission && !permissions.has('*') && !permissions.has(permission))

            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                aria-disabled={disabled}
                title={disabled ? (accessError || (!accessReady ? 'Validando acesso e permissões.' : description)) : label}
                className="group relative flex min-h-[148px] min-w-0 touch-manipulation flex-row items-start gap-3 rounded-[3px] border border-[#3e5262] bg-gradient-to-br from-[#293441] to-[#222832] p-4 text-left transition-[background,border-color,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-[#67c7dc] hover:from-[#304252] hover:to-[#252f3a] hover:shadow-[0_10px_26px_rgba(0,0,0,0.22)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 max-[620px]:min-h-[126px] max-[620px]:gap-2 max-[620px]:p-3"
                onClick={() => {
                  if (route) {
                    onClose()
                    onNavigate(route)
                  }
                }}
              >
                <span
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-[3px] border border-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] max-[620px]:h-10 max-[620px]:w-10"
                  style={{ backgroundColor: '#2D8DB8' }}
                  aria-hidden="true"
                >
                  <Icon size={30} strokeWidth={1.9} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col items-start gap-2">
                  <span className="flex w-full items-center justify-between gap-2"><small className="text-[10px] font-bold leading-none tracking-[0.14em]" style={{ color: '#67c7dc' }}>{number}</small><span className="h-[3px] w-8 rounded-full bg-[#2D8DB8] transition-all group-hover:w-12" aria-hidden="true" /></span>
                  <strong className="text-[13px] font-bold leading-tight tracking-[0.025em] text-slate-50 max-[620px]:text-[11px]">{label}</strong>
                  <span className="text-[11px] leading-[1.4] text-slate-300 max-[620px]:text-[10px]">{description}</span>
                </span>
              </button>
            )
          })}
        </div>

        <footer className="mt-4 flex shrink-0 flex-wrap justify-between gap-2 border-t border-[#405363] pt-3 text-[10px] font-medium tracking-[0.03em] text-slate-400">
          <span>ERPSistema INDUSTRIAL</span>
          <span>Central operacional integrada</span>
          <span>22 módulos</span>
        </footer>
      </section>
    </div>
  )
}
