import { Activity, BookOpenCheck, ClipboardCheck, ClipboardList, FileCheck2, FileText, Gauge, GitBranch, ListChecks, Microscope, SearchCheck, ShieldAlert, ShieldCheck, Tablet, Target, Workflow, X } from 'lucide-react'
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
  { key: 'inspecoes', number: 'M01', label: 'INSPEÇÕES DE LOTES', description: 'Registrar amostras e resultados de inspeção.', route: '/qualidade/inspecoes', icon: ClipboardCheck, permission: 'audit.read' },
  { key: 'inspecao-processo', number: 'M02', label: 'INSPEÇÃO EM PROCESSO', description: 'Controlar verificações durante a produção.', route: '/qualidade/inspecao-processo', icon: Microscope, permission: 'audit.read' },
  { key: 'especificacoes', number: 'M03', label: 'ESPECIFICAÇÕES TÉCNICAS', description: 'Consultar critérios e tolerâncias vigentes.', route: '/qualidade/especificacoes', icon: FileCheck2, permission: 'audit.read' },
  { key: 'liberacao-lotes', number: 'M04', label: 'LIBERAÇÃO DE LOTES', description: 'Acompanhar decisões de liberação.', route: '/qualidade/liberacao-lote', icon: ShieldCheck, permission: 'audit.read' },
  { key: 'quarentena', number: 'M05', label: 'QUARENTENA DE LOTES', description: 'Visualizar materiais em quarentena.', route: '/qualidade/quarentena', icon: ShieldAlert, permission: 'audit.read' },
  { key: 'genealogia', number: 'M06', label: 'GENEALOGIA DE LOTES', description: 'Rastrear lotes e vínculos de produção.', route: '/qualidade/genealogia-lote', icon: GitBranch, permission: 'audit.read' },
  { key: 'sala-rnc', number: 'M07', label: 'SALA RNC / RPNC', description: 'Centralizar não conformidades e pendências.', route: '/qualidade/sala-rnc', icon: ClipboardList, permission: 'audit.read' },
  { key: 'cadastro-rnc', number: 'M08', label: 'CADASTRO DE RNC', description: 'Registrar e acompanhar ocorrências.', route: '/qualidade/rnc', icon: ShieldAlert, permission: 'audit.read' },
  { key: 'ishikawa', number: 'M09', label: 'ISHIKAWA — CAUSA RAIZ', description: 'Investigar causas pelo método 6M.', route: '/qualidade/ishikawa', icon: Workflow, permission: 'audit.read' },
  { key: 'capa', number: 'M10', label: 'PLANO CAPA / 5W2H', description: 'Definir e acompanhar ações corretivas e preventivas.', route: '/qualidade/capa', icon: ListChecks, permission: 'audit.read' },
  { key: 'metodologia-8d', number: 'M11', label: 'METODOLOGIA 8D', description: 'Conduzir solução estruturada de problemas.', route: '/qualidade/metodologia-8d', icon: Target, permission: 'audit.read' },
  { key: 'pfmea', number: 'M12', label: 'FMEA / PFMEA', description: 'Analisar riscos de processo e produto.', route: '/qualidade/pfmea', icon: Activity, permission: 'audit.read' },
  { key: 'ged', number: 'M13', label: 'DOCUMENTOS CONTROLADOS', description: 'Acessar documentos controlados, anexos e revisões do SGQ.', route: '/qualidade/ged-documentos', icon: FileText, permission: 'audit.read' },
  { key: 'procedimentos', number: 'M14', label: 'PROCEDIMENTOS E PDFS', description: 'Consultar procedimentos da qualidade.', route: '/qualidade/procedimentos', icon: BookOpenCheck, permission: 'audit.read' },
  { key: 'lista-mestre', number: 'M15', label: 'LISTA MESTRE', description: 'Consultar o índice de documentos controlados.', route: '/qualidade/lista-mestre', icon: FileText, permission: 'audit.read' },
  { key: 'auditoria-5s', number: 'M16', label: 'AUDITORIA 5S', description: 'Registrar e acompanhar auditorias de organização.', route: '/qualidade/auditoria-5s', icon: SearchCheck, permission: 'audit.read' },
  { key: 'cep', number: 'M17', label: 'CEP / CARTAS DE CONTROLE', description: 'Acompanhar indicadores estatísticos de processo.', route: '/qualidade/cep', icon: Activity, permission: 'audit.read' },
  { key: 'calibracao', number: 'M18', label: 'METROLOGIA E CALIBRAÇÃO', description: 'Consultar instrumentos e calibrações.', route: '/qualidade/calibracao', icon: Gauge, permission: 'audit.read' },
  { key: 'instrumentos', number: 'M19', label: 'INSTRUMENTOS DE MEDIÇÃO', description: 'Consultar instrumentos e registros de medição.', route: '/qualidade/instrumentos', icon: Gauge, permission: 'audit.read' },
  { key: 'refugos', number: 'M20', label: 'REFUGOS DA QUALIDADE', description: 'Acompanhar registros e causas de refugo.', route: '/qualidade/refugos', icon: ShieldAlert, permission: 'audit.read' },
  { key: 'editor-it', number: 'M21', label: 'INSTRUÇÕES DE TRABALHO', description: 'Criar e consultar instruções de trabalho.', route: '/qualidade/editor-it', icon: ClipboardCheck, permission: 'audit.read' },
  { key: 'relatorios', number: 'M22', label: 'RELATÓRIOS DO SGQ', description: 'Acessar relatórios da qualidade.', route: '/qualidade/relatorios-documentos', icon: FileText, permission: 'reports.read' },
]

export default function TabletMenuModal({ isOpen, onClose, onNavigate }: TabletMenuModalProps) {
  const [permissions, setPermissions] = useState<Set<string>>(new Set())
  const [accessReady, setAccessReady] = useState(false)
  const [accessError, setAccessError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    let alive = true
    setPermissions(new Set())
    setAccessReady(false)
    setAccessError('')
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
        className="max-h-[calc(100vh-24px)] w-full max-w-[1080px] overflow-auto rounded-[2px] border border-slate-600 bg-[#1e222b] p-3 text-white shadow-[0_30px_90px_rgba(2,6,23,0.48)] sm:max-h-[calc(100vh-36px)] sm:p-4"
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

        {accessError && <div className="mb-2 border border-red-400 bg-red-950 px-2 py-1.5 text-[10px] text-red-100" role="alert">{accessError}</div>}

        <div className="mt-3 grid grid-cols-4 gap-2 max-[700px]:grid-cols-3 max-[460px]:grid-cols-2" aria-label="Módulos da Qualidade">
          {modules.map(({ key, number, label, description, route, permission, icon: Icon }) => {
            const disabled = !route || !accessReady || Boolean(accessError) || Boolean(permission && !permissions.has('*') && !permissions.has(permission))

            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                aria-disabled={disabled}
                title={disabled ? (accessError || (!accessReady ? 'Validando acesso e permissões.' : description)) : label}
                className="group flex min-h-[76px] min-w-0 touch-manipulation flex-row items-center justify-start gap-2 rounded-[2px] border border-[#2D8DB8] bg-[#123B50] px-2 py-2 text-left text-white transition-[background,border-color] duration-100 hover:border-[#48B7C7] hover:bg-[#174d66] active:bg-[#0e3142] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => {
                  if (route) {
                    onClose()
                    onNavigate(route)
                  }
                }}
              >
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-[2px] text-white"
                  style={{ backgroundColor: '#2D8DB8' }}
                  aria-hidden="true"
                >
                  <Icon size={21} strokeWidth={2} />
                </span>
                <span className="flex min-w-0 flex-col items-start gap-1">
                  <small className="text-[8px] font-semibold leading-none tracking-[0.08em]" style={{ color: '#67c7dc' }}>{number}</small>
                  <strong className="max-w-full text-[9px] font-semibold leading-[1.15] tracking-[0.01em] text-slate-100">{label}</strong>
                </span>
              </button>
            )
          })}
        </div>

        <footer className="mt-3 flex flex-wrap justify-between gap-2 border-t border-[#DBE7EA] pt-2.5 text-[9px] font-medium tracking-[0.03em] text-slate-400">
          <span>ERPSistema INDUSTRIAL</span>
          <span>Central operacional integrada</span>
          <span>22 módulos de qualidade</span>
        </footer>
      </section>
    </div>
  )
}
