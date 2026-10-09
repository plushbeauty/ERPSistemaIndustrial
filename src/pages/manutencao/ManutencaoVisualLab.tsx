import { useMemo, useState } from 'react'
import {
  Activity, AlertCircle, ArrowDownRight, ArrowUpRight, Bell, CalendarClock,
  CheckCircle2, ChevronDown, ChevronRight, CircleHelp, ClipboardCheck,
  Clock3, Command, Download, FileText, Filter, Gauge, History, LayoutDashboard,
  MoreHorizontal, Plus, RefreshCw, Search, Settings2, ShieldCheck, SlidersHorizontal,
  Sparkles, Wrench, X, Zap,
} from 'lucide-react'

type Ordem = {
  id: string
  maquina: string
  ativo: string
  tipo: 'CORRETIVA' | 'PREVENTIVA' | 'INSPEÇÃO'
  resumo: string
  prioridade: 'CRÍTICA' | 'ALTA' | 'MÉDIA' | 'BAIXA'
  status: 'EM ATRASO' | 'EM EXECUÇÃO' | 'AGENDADA' | 'CONCLUÍDA'
  responsavel: string
  data: string
  tempo: string
}

const amostras: Ordem[] = [
  { id: 'OS-2026-0184', maquina: 'INJ-04', ativo: 'Injetora hidráulica 250T', tipo: 'CORRETIVA', resumo: 'Vazamento no circuito hidráulico do fechamento', prioridade: 'CRÍTICA', status: 'EM EXECUÇÃO', responsavel: 'R. Martins', data: '09 OUT, 14:30', tempo: '01h 42m' },
  { id: 'OS-2026-0183', maquina: 'CMP-02', ativo: 'Compressor de ar 15 HP', tipo: 'PREVENTIVA', resumo: 'Rotina preventiva • filtro, óleo e vibração', prioridade: 'ALTA', status: 'EM ATRASO', responsavel: 'L. Costa', data: '09 OUT, 11:00', tempo: '3h 30m' },
  { id: 'OS-2026-0182', maquina: 'TOR-01', ativo: 'Torno CNC • célula A', tipo: 'INSPEÇÃO', resumo: 'Verificar repetibilidade dimensional do eixo', prioridade: 'MÉDIA', status: 'AGENDADA', responsavel: 'A. Souza', data: '09 OUT, 16:00', tempo: '—' },
  { id: 'OS-2026-0181', maquina: 'ROB-03', ativo: 'Robô de montagem 6 eixos', tipo: 'CORRETIVA', resumo: 'Calibrar sensor de posição do eixo 4', prioridade: 'ALTA', status: 'CONCLUÍDA', responsavel: 'M. Oliveira', data: '09 OUT, 09:15', tempo: '00h 56m' },
  { id: 'OS-2026-0180', maquina: 'PRE-01', ativo: 'Prensa excêntrica 80T', tipo: 'PREVENTIVA', resumo: 'Inspeção de proteções e lubrificação', prioridade: 'BAIXA', status: 'AGENDADA', responsavel: 'C. Lima', data: '10 OUT, 08:00', tempo: '—' },
  { id: 'OS-2026-0179', maquina: 'INJ-02', ativo: 'Injetora hidráulica 180T', tipo: 'CORRETIVA', resumo: 'Temperatura instável no circuito de refrigeração', prioridade: 'MÉDIA', status: 'CONCLUÍDA', responsavel: 'R. Martins', data: '08 OUT, 17:20', tempo: '02h 10m' },
]

const nav = [
  { label: 'Visão geral', icon: LayoutDashboard },
  { label: 'Ordens de serviço', icon: ClipboardCheck },
  { label: 'Máquinas e ativos', icon: Gauge },
  { label: 'Planos preventivos', icon: CalendarClock },
  { label: 'Paradas de máquina', icon: Activity },
  { label: 'Histórico técnico', icon: History },
]

const statusClass: Record<Ordem['status'], string> = {
  'EM ATRASO': 'ml-status ml-status--late',
  'EM EXECUÇÃO': 'ml-status ml-status--doing',
  AGENDADA: 'ml-status ml-status--planned',
  CONCLUÍDA: 'ml-status ml-status--done',
}
const priorityClass: Record<Ordem['prioridade'], string> = {
  CRÍTICA: 'ml-priority ml-priority--critical',
  ALTA: 'ml-priority ml-priority--high',
  MÉDIA: 'ml-priority ml-priority--medium',
  BAIXA: 'ml-priority ml-priority--low',
}

export default function ManutencaoVisualLab() {
  const [rows, setRows] = useState(amostras)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('TODAS')
  const [priority, setPriority] = useState('TODAS')
  const [activeNav, setActiveNav] = useState('Ordens de serviço')
  const [selected, setSelected] = useState<Ordem | null>(amostras[0])
  const [showCreate, setShowCreate] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [notice, setNotice] = useState('')
  const [newMachine, setNewMachine] = useState('')
  const [newSummary, setNewSummary] = useState('')
  const [newPriority, setNewPriority] = useState<Ordem['prioridade']>('MÉDIA')

  const filtered = useMemo(() => rows.filter((row) => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    const matchesTerm = !term || [row.id, row.maquina, row.ativo, row.resumo, row.responsavel].some((v) => v.toLocaleLowerCase('pt-BR').includes(term))
    return matchesTerm && (status === 'TODAS' || row.status === status) && (priority === 'TODAS' || row.prioridade === priority)
  }), [rows, query, status, priority])

  const notify = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3600)
  }

  const createDraft = () => {
    if (!newMachine.trim() || !newSummary.trim()) {
      notify('Preencha o ativo e a descrição para visualizar a nova O.S.')
      return
    }
    const draft: Ordem = {
      id: 'RASCUNHO-' + String(rows.length + 1).padStart(3, '0'),
      maquina: newMachine.trim().toUpperCase(),
      ativo: 'Ativo informado para demonstração',
      tipo: 'CORRETIVA',
      resumo: newSummary.trim(),
      prioridade: newPriority,
      status: 'AGENDADA',
      responsavel: 'Não atribuído',
      data: 'A definir',
      tempo: '—',
    }
    setRows((current) => [draft, ...current])
    setSelected(draft)
    setQuery('')
    setStatus('TODAS')
    setPriority('TODAS')
    setShowCreate(false)
    setNewMachine('')
    setNewSummary('')
    notify('Rascunho visual criado localmente. Nenhum dado foi enviado ao ERP.')
  }

  return (
    <main className="ml-lab">
      <style>{`
        .ml-lab{--ink:#123b50;--muted:#637986;--line:#d8e4e9;--blue:#2d8db8;--cyan:#48b7c7;--bg:#f2f7f9;min-height:100vh;background:var(--bg);color:#183b4a;font:11px/1.4 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
        .ml-lab *{box-sizing:border-box}.ml-layout{display:grid;grid-template-columns:206px minmax(0,1fr);min-height:100vh}
        .ml-sidebar{background:#102f40;color:#d8e8ef;padding:14px 10px;display:flex;flex-direction:column;gap:18px}
        .ml-brand{display:flex;align-items:center;gap:9px;padding:5px 7px 15px;border-bottom:1px solid #315263}
        .ml-brand-mark{display:grid;place-items:center;width:32px;height:32px;background:linear-gradient(135deg,#58c7d2,#2485b3);color:#fff;border-radius:3px;box-shadow:0 5px 14px #071e2a66}
        .ml-brand strong{display:block;font-size:13px;letter-spacing:.08em;color:#fff}.ml-brand small{display:block;color:#8fb4c5;font-size:8px;letter-spacing:.13em;margin-top:2px}
        .ml-side-caption{padding:0 9px;color:#7193a3;font-size:8px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
        .ml-nav{display:grid;gap:3px}.ml-nav button{height:34px;min-height:34px;display:flex;align-items:center;gap:9px;border:1px solid transparent;border-radius:2px;background:transparent;color:#b9d0da;padding:0 9px;text-align:left;font:500 10px inherit;cursor:pointer}
        .ml-nav button svg{width:15px;height:15px;flex:none}.ml-nav button:hover{background:#1a465b;color:#fff}.ml-nav button.is-active{background:#1d536c;border-color:#2c718d;color:#fff;box-shadow:inset 2px 0 #59c8d2}
        .ml-nav-count{margin-left:auto;border:1px solid #416678;background:#173e51;border-radius:2px;padding:2px 5px;font-size:8px;color:#b8e5ed}
        .ml-sidebar-foot{margin-top:auto;border-top:1px solid #315263;padding:12px 7px 2px;display:flex;align-items:center;gap:8px}.ml-avatar{width:27px;height:27px;display:grid;place-items:center;border-radius:50%;background:#d4eef1;color:#1c5a70;font-size:9px;font-weight:800}.ml-sidebar-foot strong{display:block;font-size:10px;color:#fff}.ml-sidebar-foot small{display:block;font-size:8px;color:#8fb4c5}
        .ml-main{min-width:0}.ml-topbar{height:48px;background:#fff;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 20px;position:sticky;top:0;z-index:5}
        .ml-crumb{display:flex;align-items:center;gap:7px;color:#80919a;font-size:9px}.ml-crumb strong{color:var(--ink);font-weight:700}.ml-top-actions{display:flex;align-items:center;gap:6px}.ml-live{display:inline-flex;align-items:center;gap:5px;border:1px solid #cce8dc;background:#f0fbf5;color:#277b5b;padding:4px 7px;border-radius:2px;font-size:8px;font-weight:800;letter-spacing:.06em}.ml-live i{width:5px;height:5px;border-radius:50%;background:#32a779}
        .ml-icon-btn,.ml-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:30px;min-height:30px;padding:0 9px;border:1px solid #cbdbe2;border-radius:2px;background:#fff;color:#315363;font:600 10px inherit;cursor:pointer;white-space:nowrap}.ml-icon-btn{width:30px;padding:0}.ml-icon-btn svg,.ml-btn svg{width:14px;height:14px}.ml-icon-btn:hover,.ml-btn:hover{background:#f0f7fa;border-color:#9dc8d7}
        .ml-btn--primary{background:var(--blue);border-color:#2479a0;color:#fff}.ml-btn--primary:hover{background:#247ca4;color:#fff}.ml-btn--dark{background:#173e51;border-color:#173e51;color:#fff}
        .ml-content{max-width:1680px;margin:0 auto;padding:18px 20px 28px}.ml-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:15px}.ml-eyebrow{display:flex;align-items:center;gap:6px;color:#3586a4;font-size:9px;letter-spacing:.11em;font-weight:800;text-transform:uppercase}.ml-title-row h1{font-size:23px;line-height:1.15;letter-spacing:-.035em;color:var(--ink);font-weight:650;margin:6px 0 5px}.ml-title-row p{font-size:10px;color:var(--muted);margin:0}.ml-title-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
        .ml-demo{display:inline-flex;align-items:center;gap:5px;margin-top:10px;padding:4px 7px;background:#fff7e8;border:1px solid #f1d7a5;color:#875d1d;font-size:8px;font-weight:800;letter-spacing:.07em;text-transform:uppercase}
        .ml-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px}.ml-kpi{position:relative;min-width:0;background:#fff;border:1px solid var(--line);padding:12px 13px;overflow:hidden}.ml-kpi:after{content:"";position:absolute;top:0;left:0;width:3px;height:100%;background:#54bac8}.ml-kpi-head{display:flex;align-items:center;justify-content:space-between;color:#6b808a;font-size:9px;font-weight:650}.ml-kpi-icon{display:grid;place-items:center;width:26px;height:26px;background:#edf7fa;color:#2e87a8;border:1px solid #d8edf2;border-radius:2px}.ml-kpi-icon svg{width:14px;height:14px}.ml-kpi-value{font-size:25px;line-height:1.15;font-weight:650;color:var(--ink);letter-spacing:-.04em;margin-top:8px}.ml-kpi-foot{display:flex;align-items:center;gap:4px;margin-top:6px;color:#6d818b;font-size:9px}.ml-trend-up{color:#25805f}.ml-trend-down{color:#b46c25}
        .ml-workspace{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:10px;align-items:start}.ml-panel{min-width:0;background:#fff;border:1px solid var(--line)}.ml-panel-head{min-height:43px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 12px;border-bottom:1px solid #e2eaee}.ml-panel-heading{display:flex;align-items:center;gap:8px;min-width:0}.ml-panel-heading-icon{width:25px;height:25px;display:grid;place-items:center;background:#edf7fa;border:1px solid #d8edf2;color:#3287a7;border-radius:2px;flex:none}.ml-panel-heading-icon svg{width:14px;height:14px}.ml-panel-heading strong{display:block;font-size:11px;color:var(--ink);font-weight:700}.ml-panel-heading small{display:block;color:#81939c;font-size:8px;margin-top:2px}.ml-panel-actions{display:flex;gap:5px;align-items:center}
        .ml-tabs{display:flex;gap:14px;padding:0 12px;border-bottom:1px solid #e5ecef;overflow:auto}.ml-tabs button{height:35px;min-height:35px;position:relative;white-space:nowrap;border:0;background:transparent;color:#71838d;font-size:9px;font-weight:650;cursor:pointer}.ml-tabs button.is-active{color:#1d7395}.ml-tabs button.is-active:after{content:"";position:absolute;bottom:-1px;left:0;right:0;height:2px;background:#2d9bb9}.ml-tab-count{margin-left:5px;background:#eef4f6;padding:2px 5px;border-radius:2px;font-size:8px;color:#6a7f89}.ml-tabs button.is-active .ml-tab-count{background:#e2f4f8;color:#1d7395}
        .ml-filterbar{display:flex;align-items:center;gap:6px;padding:9px 12px;border-bottom:1px solid #e5ecef;flex-wrap:wrap}.ml-search{height:30px;min-height:30px;display:flex;align-items:center;gap:6px;border:1px solid #d2e0e6;background:#fbfdfe;padding:0 8px;min-width:160px;flex:1}.ml-search svg{width:14px;height:14px;color:#80949e}.ml-search input{border:0!important;outline:none!important;box-shadow:none!important;background:transparent!important;min-width:0;width:100%;height:28px!important;min-height:28px!important;padding:0!important;font:10px inherit;color:#183b4a}.ml-select{height:30px;min-height:30px;border:1px solid #d2e0e6;background:#fff;color:#365866;padding:0 24px 0 8px;font:10px inherit;border-radius:2px}.ml-filter-extra{display:flex;align-items:center;gap:6px}
        .ml-table-wrap{width:100%;overflow:auto}.ml-table{width:100%;border-collapse:collapse;font-size:10px;white-space:nowrap}.ml-table th{height:32px;padding:0 9px;background:#f0f5f7;border-bottom:1px solid #dce7eb;text-align:left;color:#6b808b;font-size:8px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.ml-table td{height:42px;padding:5px 9px;border-bottom:1px solid #edf1f3;color:#35515f;vertical-align:middle}.ml-table tbody tr{cursor:pointer}.ml-table tbody tr:hover{background:#f5fafc}.ml-table tbody tr.is-selected{background:#eaf6fa;box-shadow:inset 2px 0 #3197b6}.ml-order-id{font-size:10px;font-weight:750;color:#1d6f90}.ml-machine{display:flex;align-items:center;gap:7px}.ml-machine-icon{display:grid;place-items:center;width:25px;height:25px;border:1px solid #d8e4e9;background:#f6fafb;color:#688592}.ml-machine-icon svg{width:13px;height:13px}.ml-machine strong{display:block;color:#294c5a;font-size:10px}.ml-machine small{display:block;font-size:8px;color:#8a9aa2;margin-top:2px}.ml-summary{max-width:240px;overflow:hidden;text-overflow:ellipsis;color:#506a76}.ml-priority,.ml-status{display:inline-flex;align-items:center;gap:4px;padding:3px 6px;border:1px solid;border-radius:2px;font-size:8px;font-weight:800;letter-spacing:.02em}.ml-priority:before{content:"";width:5px;height:5px;border-radius:50%;background:currentColor}.ml-priority--critical{color:#b93840;background:#fff0f0;border-color:#f2cccc}.ml-priority--high{color:#a65c13;background:#fff6e8;border-color:#f0ddb9}.ml-priority--medium{color:#7a6a1a;background:#fffbea;border-color:#e9e1b4}.ml-priority--low{color:#487f6b;background:#eef9f3;border-color:#cce8d9}
        .ml-status:before{content:"";width:5px;height:5px;border-radius:50%;background:currentColor}.ml-status--late{color:#b93840;background:#fff0f0;border-color:#f2cccc}.ml-status--doing{color:#1e7594;background:#eaf7fb;border-color:#c9e7f0}.ml-status--planned{color:#7a6a1a;background:#fffbea;border-color:#e9e1b4}.ml-status--done{color:#277a59;background:#eef9f3;border-color:#cce8d9}
        .ml-row-action{width:25px;height:25px;display:grid;place-items:center;border:1px solid transparent;background:transparent;color:#78909a;cursor:pointer}.ml-row-action:hover{background:#fff;border-color:#d8e4e9;color:#286d87}.ml-empty{padding:30px 12px;text-align:center;color:#78909a}.ml-empty svg{width:25px;height:25px;margin:0 auto 8px;color:#9eb5bf}.ml-empty strong{display:block;font-size:11px;color:#476573}.ml-empty span{display:block;font-size:9px;margin-top:4px}
        .ml-detail{position:sticky;top:60px}.ml-detail-body{padding:12px}.ml-detail-id{display:flex;align-items:center;justify-content:space-between;gap:6px}.ml-detail-id strong{font-size:12px;color:#1b6e8e}.ml-detail-title{font-size:14px;line-height:1.3;font-weight:650;color:#123b50;margin:9px 0}.ml-detail-copy{font-size:10px;color:#607782;line-height:1.6}.ml-detail-divider{height:1px;background:#e6edef;margin:12px 0}.ml-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 8px}.ml-detail-grid label{display:block;color:#81939c;font-size:8px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.ml-detail-grid strong{display:block;color:#345361;font-size:10px;margin-top:4px;font-weight:650}.ml-detail-actions{display:grid;gap:6px;margin-top:13px}.ml-detail-actions .ml-btn{width:100%}.ml-safety{display:flex;align-items:flex-start;gap:7px;padding:9px;background:#f2faf6;border:1px solid #d2ecdf;color:#477762;font-size:9px;line-height:1.5;margin-top:12px}.ml-safety svg{width:14px;height:14px;flex:none;margin-top:1px}
        .ml-bottom-strip{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 12px;color:#83949c;font-size:8px}.ml-bottom-strip strong{color:#55717d;font-weight:700}.ml-notice{position:fixed;right:18px;bottom:18px;z-index:30;display:flex;align-items:center;gap:8px;max-width:min(440px,calc(100vw - 32px));padding:11px 14px;background:#153d50;color:#fff;border:1px solid #2e6177;box-shadow:0 12px 35px #123b5026;font-size:10px}.ml-notice svg{width:15px;height:15px;color:#70d4c1;flex:none}
        .ml-modal-backdrop{position:fixed;inset:0;z-index:20;background:#102b3b66;display:grid;place-items:center;padding:16px}.ml-modal{width:min(500px,100%);background:#fff;border:1px solid #cbdde4;box-shadow:0 25px 70px #102b3b33}.ml-modal-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #e2eaee}.ml-modal-head h2{font-size:15px;color:var(--ink);margin:0}.ml-modal-body{display:grid;gap:11px;padding:16px}.ml-field{display:grid;gap:4px}.ml-field label{font-size:9px;letter-spacing:.06em;font-weight:800;color:#657e89;text-transform:uppercase}.ml-field input,.ml-field textarea,.ml-field select{width:100%;height:30px;min-height:30px;border:1px solid #cadbe2;border-radius:2px;padding:0 8px;background:#fff;color:#183b4a;font:10px inherit}.ml-field textarea{height:70px;min-height:70px;padding:7px;resize:vertical}.ml-modal-foot{display:flex;justify-content:flex-end;gap:6px;padding:12px 16px;border-top:1px solid #e2eaee}
        @media(max-width:1240px){.ml-workspace{grid-template-columns:minmax(0,1fr) 270px}.ml-content{padding:14px}.ml-topbar{padding:0 14px}.ml-table td{padding:5px 7px}}
        @media(max-width:1000px){.ml-layout{grid-template-columns:62px minmax(0,1fr)}.ml-sidebar{padding:12px 7px}.ml-brand{justify-content:center;padding:3px 0 14px}.ml-brand-copy,.ml-side-caption,.ml-nav-label,.ml-nav-count,.ml-sidebar-foot-copy{display:none}.ml-nav button{justify-content:center;padding:0}.ml-sidebar-foot{justify-content:center;padding:10px 0}.ml-workspace{grid-template-columns:minmax(0,1fr)}.ml-detail{position:static}.ml-detail-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.ml-detail-actions{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:680px){.ml-layout{grid-template-columns:1fr}.ml-sidebar{display:none}.ml-topbar{height:44px;padding:0 10px}.ml-crumb{font-size:8px}.ml-live{display:none}.ml-content{padding:12px 9px 22px}.ml-title-row{display:block}.ml-title-row h1{font-size:21px}.ml-title-actions{margin-top:12px}.ml-kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.ml-kpi{padding:9px}.ml-kpi-value{font-size:22px}.ml-workspace{gap:8px}.ml-panel-head{padding:0 9px}.ml-filterbar{padding:8px;gap:5px}.ml-search{flex-basis:100%}.ml-filter-extra{width:100%}.ml-select{flex:1;min-width:0}.ml-detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ml-table{min-width:830px}.ml-bottom-strip{align-items:flex-start;flex-direction:column}.ml-title-actions .ml-btn{flex:1}.ml-title-actions .ml-icon-btn{flex:none}}
      `}</style>
      <div className="ml-layout">
        <aside className="ml-sidebar">
          <div className="ml-brand">
            <div className="ml-brand-mark"><Wrench size={18}/></div>
            <div className="ml-brand-copy"><strong>SYNQRA</strong><small>ERP INDUSTRIAL • CMMS</small></div>
          </div>
          <div>
            <div className="ml-side-caption">Manutenção</div>
            <nav className="ml-nav" aria-label="Navegação do laboratório de manutenção">
              {nav.map((item, index) => {
                const Icon = item.icon
                return <button key={item.label} type="button" className={activeNav === item.label ? 'is-active' : ''} onClick={() => { setActiveNav(item.label); if (item.label !== 'Ordens de serviço') notify(item.label + ': navegação demonstrativa do laboratório visual.') }}>
                  <Icon size={15}/><span className="ml-nav-label">{item.label}</span>{index === 1 && <span className="ml-nav-count">18</span>}
                </button>
              })}
            </nav>
          </div>
          <div>
            <div className="ml-side-caption">Sistema</div>
            <nav className="ml-nav">
              <button type="button" onClick={() => notify('Preferências visuais de demonstração.')}><Settings2 size={15}/><span className="ml-nav-label">Preferências</span></button>
              <button type="button" onClick={() => notify('Central de ajuda visual.')}><CircleHelp size={15}/><span className="ml-nav-label">Ajuda e suporte</span></button>
            </nav>
          </div>
          <div className="ml-sidebar-foot"><div className="ml-avatar">FS</div><div className="ml-sidebar-foot-copy"><strong>Operação industrial</strong><small>Perfil de demonstração</small></div></div>
        </aside>
        <section className="ml-main">
          <header className="ml-topbar">
            <div className="ml-crumb"><Command size={13}/><span>WORKSPACE</span><ChevronRight size={12}/><span>MANUTENÇÃO</span><ChevronRight size={12}/><strong>ORDENS DE SERVIÇO</strong></div>
            <div className="ml-top-actions"><span className="ml-live"><i/> LABORATÓRIO VISUAL</span><button className="ml-icon-btn" type="button" title="Notificações" onClick={() => notify('Você está vendo uma tela isolada de avaliação visual.')}><Bell size={14}/></button><button className="ml-icon-btn" type="button" title="Ajuda" onClick={() => notify('Esta página não altera os dados reais do ERP.')}><CircleHelp size={14}/></button></div>
          </header>
          <div className="ml-content">
            <div className="ml-title-row">
              <div><div className="ml-eyebrow"><Sparkles size={13}/> MANUTENÇÃO / TPM / CMMS</div><h1>Centro de manutenção</h1><p>Ordens de serviço, disponibilidade dos ativos e execução da manutenção em uma única visão operacional.</p><div className="ml-demo"><AlertCircle size={12}/> protótipo visual • dados ilustrativos • sem gravação no Supabase</div></div>
              <div className="ml-title-actions"><button type="button" className="ml-btn" onClick={() => { setQuery(''); setStatus('TODAS'); setPriority('TODAS'); notify('Filtros limpos.') }}><SlidersHorizontal size={14}/> Limpar filtros</button><button type="button" className="ml-btn" onClick={() => notify('Exportação desativada neste protótipo visual.')}><Download size={14}/> Exportar</button><button type="button" className="ml-btn ml-btn--primary" onClick={() => setShowCreate(true)}><Plus size={15}/> Nova ordem</button></div>
            </div>
            <div className="ml-kpis">
              <article className="ml-kpi"><div className="ml-kpi-head"><span>Ordens em aberto</span><span className="ml-kpi-icon"><ClipboardCheck size={14}/></span></div><div className="ml-kpi-value">{rows.filter(x => x.status !== 'CONCLUÍDA').length.toString().padStart(2,'0')}</div><div className="ml-kpi-foot"><ArrowUpRight size={12} className="ml-trend-up"/> <span className="ml-trend-up">+8,4%</span><span>vs. período anterior</span></div></article>
              <article className="ml-kpi"><div className="ml-kpi-head"><span>Em atraso</span><span className="ml-kpi-icon" style={{background:'#fff3f1',color:'#bd5750',borderColor:'#f3d5d0'}}><Clock3 size={14}/></span></div><div className="ml-kpi-value">{rows.filter(x => x.status === 'EM ATRASO').length.toString().padStart(2,'0')}</div><div className="ml-kpi-foot"><ArrowDownRight size={12} className="ml-trend-down"/><span className="ml-trend-down">Atenção necessária</span></div></article>
              <article className="ml-kpi"><div className="ml-kpi-head"><span>Disponibilidade</span><span className="ml-kpi-icon" style={{background:'#eef9f3',color:'#31815f',borderColor:'#d1eadc'}}><Gauge size={14}/></span></div><div className="ml-kpi-value">94,8<span style={{fontSize:13}}>%</span></div><div className="ml-kpi-foot"><ArrowUpRight size={12} className="ml-trend-up"/><span className="ml-trend-up">+1,2 p.p.</span><span>média ilustrativa</span></div></article>
              <article className="ml-kpi"><div className="ml-kpi-head"><span>MTTR médio</span><span className="ml-kpi-icon" style={{background:'#fff7e8',color:'#a86d1c',borderColor:'#f1dfbd'}}><Zap size={14}/></span></div><div className="ml-kpi-value">1,6<span style={{fontSize:13}}>h</span></div><div className="ml-kpi-foot"><ArrowDownRight size={12} className="ml-trend-up"/><span className="ml-trend-up">−12 min</span><span>tempo de reparo</span></div></article>
            </div>
            <div className="ml-workspace">
              <section className="ml-panel">
                <div className="ml-panel-head"><div className="ml-panel-heading"><span className="ml-panel-heading-icon"><ClipboardCheck size={14}/></span><div><strong>Fila de ordens de serviço</strong><small>Prioridade, execução e programação • visão de demonstração</small></div></div><div className="ml-panel-actions"><button type="button" className="ml-icon-btn" title="Atualizar lista" onClick={() => notify('A lista ilustrativa já está atualizada.')}><RefreshCw size={14}/></button><button type="button" className="ml-icon-btn" title="Mais opções" onClick={() => setShowFilters(v => !v)}><MoreHorizontal size={15}/></button></div></div>
                <div className="ml-tabs" role="tablist" aria-label="Filtrar por situação">
                  {[['TODAS','Todas'],['EM ATRASO','Em atraso'],['EM EXECUÇÃO','Em execução'],['AGENDADA','Agendadas'],['CONCLUÍDA','Concluídas']].map(([value,label]) => <button type="button" role="tab" aria-selected={status === value} key={value} className={status === value ? 'is-active' : ''} onClick={() => setStatus(value)}>{label}<span className="ml-tab-count">{value === 'TODAS' ? rows.length : rows.filter(r => r.status === value).length}</span></button>)}
                </div>
                <div className="ml-filterbar">
                  <label className="ml-search"><Search size={14}/><input aria-label="Pesquisar ordens" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar O.S., máquina, ativo ou responsável…"/></label>
                  <div className="ml-filter-extra"><select aria-label="Filtrar prioridade" className="ml-select" value={priority} onChange={e => setPriority(e.target.value)}><option value="TODAS">Todas prioridades</option><option>CRÍTICA</option><option>ALTA</option><option>MÉDIA</option><option>BAIXA</option></select><button type="button" className="ml-btn" onClick={() => setShowFilters(v => !v)}><Filter size={13}/> Filtros <ChevronDown size={12}/></button></div>
                </div>
                {showFilters && <div className="ml-filterbar" style={{background:'#f7fbfc'}}><span style={{fontSize:9,color:'#607985'}}>Filtros avançados de demonstração</span><button className="ml-btn" type="button" onClick={() => {setPriority('CRÍTICA');setShowFilters(false)}}>Somente críticas</button><button className="ml-btn" type="button" onClick={() => {setStatus('EM EXECUÇÃO');setShowFilters(false)}}>Em execução</button><button className="ml-btn" type="button" onClick={() => {setQuery('INJ');setShowFilters(false)}}>Máquinas de injeção</button></div>}
                <div className="ml-table-wrap"><table className="ml-table"><thead><tr><th>Ordem / ativo</th><th>Tipo</th><th>Prioridade</th><th>Situação</th><th>Programação</th><th style={{textAlign:'center'}}>Ações</th></tr></thead><tbody>
                  {filtered.map(row => <tr key={row.id} className={selected?.id === row.id ? 'is-selected' : ''} onClick={() => setSelected(row)} aria-selected={selected?.id === row.id}><td><div className="ml-machine"><span className="ml-machine-icon"><Wrench size={13}/></span><span><strong className="ml-order-id">{row.id}</strong><small>{row.maquina} · {row.ativo}</small></span></div><div className="ml-summary" style={{margin:'4px 0 0 32px'}}>{row.resumo}</div></td><td>{row.tipo}</td><td><span className={priorityClass[row.prioridade]}>{row.prioridade}</span></td><td><span className={statusClass[row.status]}>{row.status}</span></td><td><strong style={{fontWeight:600,color:'#345361'}}>{row.data}</strong><small style={{display:'block',fontSize:8,color:'#82949d',marginTop:3}}>Tempo: {row.tempo}</small></td><td style={{textAlign:'center'}}><button type="button" className="ml-row-action" aria-label={'Ver '+row.id} onClick={e => {e.stopPropagation();setSelected(row)}}><ChevronRight size={15}/></button></td></tr>)}
                  {!filtered.length && <tr><td colSpan={6}><div className="ml-empty"><Search/><strong>Nenhuma ordem encontrada</strong><span>Ajuste os filtros ou o termo de pesquisa.</span></div></td></tr>}
                </tbody></table></div>
                <div className="ml-bottom-strip"><span>Exibindo <strong>{filtered.length}</strong> de <strong>{rows.length}</strong> registros ilustrativos</span><span>Atualizado para avaliação visual · <strong>09 OUT 2026</strong></span></div>
              </section>
              <aside className="ml-panel ml-detail">
                <div className="ml-panel-head"><div className="ml-panel-heading"><span className="ml-panel-heading-icon"><FileText size={14}/></span><div><strong>Detalhes da ordem</strong><small>Selecione uma linha para inspecionar</small></div></div><button type="button" className="ml-icon-btn" aria-label="Fechar detalhes" onClick={() => setSelected(null)}><X size={14}/></button></div>
                {selected ? <div className="ml-detail-body"><div className="ml-detail-id"><strong>{selected.id}</strong><span className={statusClass[selected.status]}>{selected.status}</span></div><h2 className="ml-detail-title">{selected.resumo}</h2><p className="ml-detail-copy">Ativo: <strong>{selected.ativo}</strong>. Esta área representa a ficha rápida da ordem, com rastreabilidade da execução e contexto para o time de manutenção.</p><div className="ml-detail-divider"/><div className="ml-detail-grid"><div><label>Equipamento</label><strong>{selected.maquina}</strong></div><div><label>Tipo de ordem</label><strong>{selected.tipo}</strong></div><div><label>Prioridade</label><strong><span className={priorityClass[selected.prioridade]}>{selected.prioridade}</span></strong></div><div><label>Responsável</label><strong>{selected.responsavel}</strong></div><div><label>Programação</label><strong>{selected.data}</strong></div><div><label>Tempo apontado</label><strong>{selected.tempo}</strong></div></div><div className="ml-detail-divider"/><div className="ml-detail-actions"><button type="button" className="ml-btn ml-btn--primary" onClick={() => notify('Ação de atendimento é somente visual neste protótipo.')}><Wrench size={14}/> Abrir atendimento</button><button type="button" className="ml-btn" onClick={() => notify('Histórico demonstrativo da ordem '+selected.id+'.')}><History size={14}/> Ver histórico técnico</button></div><div className="ml-safety"><ShieldCheck size={14}/><span>Na tela definitiva, ações de atendimento serão conectadas ao Supabase e respeitarão permissões, empresa e auditoria.</span></div></div> : <div className="ml-empty"><FileText/><strong>Nenhuma ordem selecionada</strong><span>Escolha uma linha da fila para ver os detalhes.</span></div>}
              </aside>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:7,color:'#7a909a',fontSize:8,marginTop:11}}><ShieldCheck size={12}/><span>AMBIENTE ISOLADO DE TESTE</span><span>·</span><span>Esta página não grava, atualiza nem exclui dados do ERP.</span></div>
          </div>
        </section>
      </div>
      {showCreate && <div className="ml-modal-backdrop" role="presentation" onMouseDown={e => {if(e.target === e.currentTarget) setShowCreate(false)}}><section className="ml-modal" role="dialog" aria-modal="true" aria-labelledby="ml-create-title"><div className="ml-modal-head"><h2 id="ml-create-title">Nova ordem · prévia visual</h2><button type="button" className="ml-icon-btn" onClick={() => setShowCreate(false)} aria-label="Fechar"><X size={14}/></button></div><div className="ml-modal-body"><p style={{margin:0,color:'#6d818b',fontSize:10,lineHeight:1.6}}>Monte um rascunho para avaliar os campos e a hierarquia do formulário. Os dados permanecem apenas nesta página.</p><div className="ml-field"><label htmlFor="ml-machine">Código do ativo *</label><input id="ml-machine" value={newMachine} onChange={e => setNewMachine(e.target.value)} placeholder="Ex.: INJ-05"/></div><div className="ml-field"><label htmlFor="ml-summary">Defeito / solicitação *</label><textarea id="ml-summary" value={newSummary} onChange={e => setNewSummary(e.target.value)} placeholder="Descreva o serviço ou sintoma observado."/></div><div className="ml-field"><label htmlFor="ml-priority">Prioridade</label><select id="ml-priority" value={newPriority} onChange={e => setNewPriority(e.target.value as Ordem['prioridade'])}><option>CRÍTICA</option><option>ALTA</option><option>MÉDIA</option><option>BAIXA</option></select></div></div><div className="ml-modal-foot"><button type="button" className="ml-btn" onClick={() => setShowCreate(false)}>Cancelar</button><button type="button" className="ml-btn ml-btn--primary" onClick={createDraft}><Plus size={14}/> Criar rascunho visual</button></div></section></div>}
      {notice && <div className="ml-notice" role="status"><CheckCircle2 size={15}/><span>{notice}</span></div>}
    </main>
  )
}
