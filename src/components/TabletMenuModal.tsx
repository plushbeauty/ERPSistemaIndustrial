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
  { key: 'organizacoes', number: 'M02', label: 'ESPECIFICAÇÕES', description: 'Especificações técnicas e critérios de aceitação.', route: '/qualidade/especificacoes', permission: 'audit.read', icon: FileText },
  { key: 'permissoes', number: 'M03', label: 'DOCUMENTOS SGQ', description: 'Documentos controlados e revisões vigentes.', route: '/qualidade/ged-documentos', permission: 'audit.read', icon: ShieldCheck },
  { key: 'dashboard', number: 'M04', label: 'INDICADORES', description: 'Visão consolidada dos indicadores da qualidade.', route: '/qualidade', icon: LayoutDashboard },
  { key: 'ocorrencias', number: 'M05', label: 'OCORRÊNCIAS', description: 'Registro e acompanhamento de ocorrências da qualidade.', route: '/qualidade/rnc', permission: 'audit.read', icon: AlertTriangle },
  { key: 'nao-conformidades', number: 'M06', label: 'NÃO CONF.', description: 'Não conformidades, tratamento e rastreabilidade.', route: '/qualidade/rnc', permission: 'audit.read', icon: ClipboardX },
  { key: 'acoes-5w2h', number: 'M07', label: 'AÇÕES 5W2H', description: 'Planos de ação e acompanhamento estruturado.', route: '/qualidade/metodologia-8d', permission: 'audit.read', icon: CalendarCheck },
  { key: 'causa-raiz', number: 'M08', label: 'CAUSA RAIZ', description: 'Análise de causas e investigação estruturada.', route: '/qualidade/metodologia-8d', permission: 'audit.read', icon: GitFork },
  { key: 'evidencias', number: 'M09', label: 'EVIDÊNCIAS', description: 'Arquivos, registros e evidências vinculadas aos processos.', route: '/documentos-qualidade', permission: 'audit.read', icon: Paperclip },
  { key: 'aprovacoes', number: 'M10', label: 'LIBERAÇÃO', description: 'Liberação e acompanhamento de lotes.', route: '/qualidade/liberacao-lote', permission: 'audit.read', icon: CheckSquare },
  { key: 'eficacia', number: 'M11', label: 'EFICÁCIA', description: 'Verificação da eficácia das ações implementadas.', route: '/qualidade/rnc', permission: 'audit.read', icon: Activity },
  { key: 'notificacoes', number: 'M12', label: 'NOTIFICAÇÕES', description: 'Central de notificações específica não possui rota operacional comprovada.', icon: Bell },
  { key: 'auditorias', number: 'M13', label: 'AUDITORIAS', description: 'Auditorias, verificações e registros de evidência.', route: '/qualidade/auditoria-5s', permission: 'audit.read', icon: SearchCode },
  { key: 'documentos', number: 'M14', label: 'DOCUMENTOS', description: 'Documentos controlados e registros do SGQ.', route: '/qualidade/documentos', permission: 'audit.read', icon: FileText },
  { key: 'indicadores', number: 'M15', label: 'CEP / INDICADORES', description: 'Indicadores estatísticos e desempenho da qualidade.', route: '/qualidade/cep', permission: 'audit.read', icon: BarChart3 },
  { key: 'riscos', number: 'M16', label: 'RISCOS', description: 'Identificação, análise e acompanhamento de riscos.', route: '/qualidade/pfmea', permission: 'audit.read', icon: ShieldAlert },
  { key: 'fornecedores', number: 'M17', label: 'INSPEÇÃO RECEB.', description: 'Inspeção de materiais recebidos e lotes.', route: '/qualidade/inspecoes', permission: 'audit.read', icon: Truck },
  { key: 'treinamentos', number: 'M18', label: 'PROCEDIMENTOS', description: 'Procedimentos e instruções da qualidade.', route: '/qualidade/procedimentos', permission: 'audit.read', icon: GraduationCap },
  { key: 'calibracao', number: 'M19', label: 'CALIBRAÇÃO', description: 'Instrumentos, calibrações e vencimentos metrológicos.', route: '/qualidade/calibracao', permission: 'audit.read', icon: Gauge },
  { key: 'relatorios', number: 'M20', label: 'RELATÓRIOS', description: 'Relatórios e consolidações documentais da qualidade.', route: '/qualidade/relatorios-documentos', permission: 'reports.read', icon: FileSpreadsheet },
  { key: 'configuracoes', number: 'M21', label: 'LISTA MESTRE', description: 'Índice mestre dos documentos controlados.', route: '/qualidade/lista-mestre', permission: 'audit.read', icon: SlidersHorizontal },
  { key: 'auditoria-sistema', number: 'M22', label: 'AUDITORIA SGQ', description: 'Auditorias e verificações do sistema de qualidade.', route: '/qualidade/auditoria-5s', permission: 'audit.read', icon: History },
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
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/35 p-3 backdrop-blur-[3px] sm:p-[18px]"
      role="dialog"
      aria-modal="true"
      aria-label="Central de módulos do Tablet"
      onMouseDown={onClose}
    >
      <section
        className="max-h-[calc(100vh-24px)] w-full max-w-[1180px] overflow-auto rounded-[2px] border border-[#B9D4DF] bg-white p-3 text-[#123B50] shadow-[0_18px_50px_rgba(18,59,80,0.22)] sm:max-h-[calc(100vh-36px)] sm:p-4"
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#D8E8EE] pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/logo/logo.png" alt="SGQERP Industrial" className="h-[38px] w-[148px] shrink-0 object-contain max-[620px]:h-8 max-[620px]:w-28" />
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] text-white max-[620px]:h-[38px] max-[620px]:w-[38px]" aria-hidden="true">
              <Tablet size={24} />
            </span>
            <div className="min-w-0">
              <strong className="block text-xs font-semibold leading-tight tracking-[0.02em]">CENTRAL DE MÓDULOS — MODO TABLET</strong>
              <p className="mt-1 text-[11px] leading-tight text-[#315466]">Painel de módulos da Gestão da Qualidade</p>
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

        {accessError && <div className="mb-2 border border-[#D65B61] bg-[#FCEDEF] px-2 py-1.5 text-[10px] text-[#9F3038]" role="alert">{accessError}</div>}

        <div className="mt-3 grid grid-cols-11 gap-1.5 max-[1050px]:grid-cols-6 max-[700px]:grid-cols-4 max-[460px]:grid-cols-3" aria-label="Módulos do ERP">
          {modules.map(({ key, number, label, description, route, permission, icon: Icon }) => {
            const disabled = !route || !accessReady || Boolean(accessError) || Boolean(permission && !permissions.has('*') && !permissions.has(permission))

            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                aria-disabled={disabled}
                title={disabled ? (accessError || (!accessReady ? 'Validando acesso e permissões.' : description)) : label}
                className="group flex min-h-[86px] min-w-0 touch-manipulation flex-col items-center justify-center gap-[7px] rounded-[2px] border border-[#C9DDE5] bg-white px-1 py-1.5 text-center text-[#123B50] transition-[background,border-color,transform] duration-100 hover:-translate-y-px hover:border-[#2D8DB8] hover:bg-[#F4FBFD] active:translate-y-0 active:bg-[#EAF6FA] disabled:cursor-not-allowed disabled:opacity-40"
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
                  <small className="text-[8px] font-semibold leading-none tracking-[0.08em]" style={{ color: '#2D8DB8' }}>{number}</small>
                  <strong className="max-w-full text-[9px] font-semibold leading-[1.15] tracking-[0.01em] text-[#123B50]">{label}</strong>
                </span>
              </button>
            )
          })}
        </div>

        <footer className="mt-3 flex flex-wrap justify-between gap-2 border-t border-[#D8E8EE] pt-2.5 text-[9px] font-medium tracking-[0.03em] text-[#315466]">
          <span>ERPSistema INDUSTRIAL</span>
          <span>Gestão da Qualidade · SGQ</span>
          <span>22 módulos</span>
        </footer>
      </section>
    </div>
  )
}
