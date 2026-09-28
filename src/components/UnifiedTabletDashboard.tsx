/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 12:47 BRT
 * Desenvolvedor: Homologado por FernandoSch.
 * ID da Revisão: REV-045
 * Alterações: Correção do namespace React usado nos tipos JSX e padronização do cabeçalho.
 * Status do Build Local: Não executado — gate remoto após commit.
 * =========================================================================
 */

import React, { useMemo, useState } from 'react'
import {
  Activity, CalendarDays, ClipboardList, Factory, Gauge, Layers3, Package,
  Settings2, ShieldCheck, Tablet, Wrench, X
} from 'lucide-react'

type TabletTab = 'overview' | 'injection' | 'presses' | 'machines' | 'maintenance' | 'pcp' | 'stock'
type Status = 'Disponível' | 'Em produção' | 'Manutenção' | 'Atenção' | 'Bloqueado'
type Mold = {
  id: string
  code: string
  description: string
  customerOwned: boolean
  customer?: string
  manufacturedAt: string
  spiClass: string
  targetCycles: number
  accumulatedCycles: number
  activeCavities: number
  totalCavities: number
  status: Status
  lastMaintenance: string
  nextMaintenanceCycles: number
}
type Machine = {
  number: string
  type: 'Injetora' | 'Prensa Hidráulica' | 'Prensa Excêntrica'
  tonnage: number
  manufacturer: string
  status: Status
  nextMaintenance: string
}
type Production = {
  op: string
  machine: string
  product: string
  cycleReal: number
  cycleTarget: number
  good: number
  scrap: number
  runnerKg: number
  activeCavities: number
}
type Tool = {
  code: string
  type: 'Estampo' | 'Faca'
  machine: string
  strokes: number
  limit: number
  status: Status
}
type StockItem = {
  code: string
  description: string
  quantity: number
  unit: string
  lot: string
  expiry?: string
  location: string
}
type Schedule = {
  machine: string
  type: string
  date: string
  shift: string
  product: string
  status: 'Ocupada' | 'Liberada' | 'Setup'
}

const molds: Mold[] = [
  {
    id: 'MOL-001', code: 'MOL-001', description: 'Tampa técnica 4 cavidades',
    customerOwned: false, manufacturedAt: '2024-03-18', spiClass: 'Classe 101',
    targetCycles: 500000, accumulatedCycles: 184200, activeCavities: 4,
    totalCavities: 4, status: 'Em produção', lastMaintenance: '2026-08-22',
    nextMaintenanceCycles: 200000
  },
  {
    id: 'MOL-014', code: 'MOL-014', description: 'Carcaça ABS 8 cavidades',
    customerOwned: true, customer: 'Cliente demonstrativo A',
    manufacturedAt: '2023-09-11', spiClass: 'Classe 102',
    targetCycles: 500000, accumulatedCycles: 392800, activeCavities: 7,
    totalCavities: 8, status: 'Atenção', lastMaintenance: '2026-07-19',
    nextMaintenanceCycles: 400000
  },
  {
    id: 'MOL-021', code: 'MOL-021', description: 'Componente PP 2 cavidades',
    customerOwned: false, manufacturedAt: '2025-01-14', spiClass: 'Classe 103',
    targetCycles: 300000, accumulatedCycles: 74200, activeCavities: 2,
    totalCavities: 2, status: 'Disponível', lastMaintenance: '2026-08-30',
    nextMaintenanceCycles: 150000
  }
]

const machines: Machine[] = [
  { number: '01', type: 'Injetora', tonnage: 180, manufacturer: 'Máquina demo', status: 'Em produção', nextMaintenance: '2026-10-04' },
  { number: '02', type: 'Injetora', tonnage: 250, manufacturer: 'Máquina demo', status: 'Disponível', nextMaintenance: '2026-10-12' },
  { number: '03', type: 'Prensa Hidráulica', tonnage: 160, manufacturer: 'Máquina demo', status: 'Manutenção', nextMaintenance: '2026-09-24' },
  { number: '04', type: 'Prensa Excêntrica', tonnage: 80, manufacturer: 'Máquina demo', status: 'Disponível', nextMaintenance: '2026-10-01' }
]

const production: Production[] = [
  { op: 'OP-0480', machine: 'Injetora 01', product: 'Tampa técnica', cycleReal: 22.4, cycleTarget: 21.5, good: 8420, scrap: 222, runnerKg: 74, activeCavities: 4 },
  { op: 'OP-0491', machine: 'Injetora 02', product: 'Carcaça ABS', cycleReal: 30.8, cycleTarget: 29, good: 5160, scrap: 137, runnerKg: 41, activeCavities: 7 }
]

const tools: Tool[] = [
  { code: 'EST-021', type: 'Estampo', machine: 'Prensa 03', strokes: 384000, limit: 500000, status: 'Atenção' },
  { code: 'FAC-014', type: 'Faca', machine: 'Prensa 04', strokes: 128000, limit: 300000, status: 'Disponível' }
]

const stock: StockItem[] = [
  { code: 'MP-ABS-001', description: 'Resina ABS natural', quantity: 1280, unit: 'KG', lot: 'L-260801', expiry: '2026-10-02', location: 'ALM-01' },
  { code: 'MP-PP-014', description: 'Polipropileno natural', quantity: 840, unit: 'KG', lot: 'L-260815', expiry: '2026-11-10', location: 'ALM-01' },
  { code: 'CH-1020-120', description: 'Aço SAE 1020 1,20 mm', quantity: 2680, unit: 'KG', lot: 'BOB-26091', location: 'ALM-02' },
  { code: 'GR-REC-001', description: 'Material moído recuperado', quantity: 320, unit: 'KG', lot: 'REC-2609', location: 'REC-01' }
]

const schedule: Schedule[] = [
  { machine: '01', type: 'Injetora 180 t', date: '21/09', shift: '1º turno', product: 'Tampa técnica', status: 'Ocupada' },
  { machine: '01', type: 'Injetora 180 t', date: '22/09', shift: '1º turno', product: 'Carcaça ABS', status: 'Ocupada' },
  { machine: '01', type: 'Injetora 180 t', date: '23/09', shift: '1º turno', product: '—', status: 'Liberada' },
  { machine: '02', type: 'Injetora 250 t', date: '21/09', shift: '2º turno', product: 'Carcaça ABS', status: 'Setup' },
  { machine: '03', type: 'Prensa Hidráulica 160 t', date: '21/09', shift: '1º turno', product: 'Suporte estampado', status: 'Ocupada' },
  { machine: '04', type: 'Prensa Excêntrica 80 t', date: '22/09', shift: '2º turno', product: 'Chapa conformada', status: 'Liberada' }
]

const num = (value: number | undefined) => value?.toLocaleString('pt-BR') ?? '—'
const percent = (value: number | undefined) => value === undefined ? '—' : value.toFixed(1) + '%'

export default function UnifiedTabletDashboard({
  onExit
}: {
  onExit?: () => void
}) {
  const [tab, setTab] = useState<TabletTab>('overview')
  const [selectedMold, setSelectedMold] = useState<Mold | null>(null)
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null)
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)

  const oee = useMemo(() => {
    const availability = 91.2
    const performance = 95.4
    const quality = 98.1
    return (availability * performance * quality) / 10000
  }, [])

  const tabs: Array<{ id: TabletTab; label: string; icon: typeof Gauge }> = [
    { id: 'overview', label: 'Visão geral', icon: Gauge },
    { id: 'injection', label: 'Injeção', icon: Layers3 },
    { id: 'presses', label: 'Prensados', icon: Wrench },
    { id: 'machines', label: 'Máquinas', icon: Factory },
    { id: 'maintenance', label: 'Manutenção', icon: ClipboardList },
    { id: 'pcp', label: 'PCP / Calendário', icon: CalendarDays },
    { id: 'stock', label: 'Estoque', icon: Package }
  ]

  return (
    <section className="utd-shell" aria-label="Central operacional do tablet">
      <style>{`
        .utd-shell{min-height:100vh;background:#fff;color:#111827;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
        .utd-top{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 20px;background:#fff;border-bottom:2px solid #d7dee5;box-shadow:0 4px 16px rgba(17,24,39,.08)}
        .utd-title{display:flex;align-items:center;gap:12px}.utd-title strong{display:block;font-size:17px}.utd-title span{display:block;margin-top:3px;color:#475569;font-size:11px}
        .utd-top button,.utd-tab,.utd-btn{display:inline-flex;align-items:center;gap:7px;border:1px solid #cbd5e1;background:#fff;color:#111827;border-radius:10px;padding:10px 12px;font-weight:850;cursor:pointer}
        .utd-top button:hover,.utd-tab:hover,.utd-btn:hover{background:#f1f5f9}.utd-exit{background:#ff6b00!important;border-color:#ff6b00!important;color:#fff!important}
        .utd-tabs{display:flex;gap:7px;overflow:auto;padding:10px 18px;background:#f8fafc;border-bottom:1px solid #d7dee5}.utd-tab{white-space:nowrap}.utd-tab.active{background:#0f766e;border-color:#0f766e;color:#fff}
        .utd-main{width:100%;max-width:1800px;margin:0 auto;padding:20px;box-sizing:border-box}.utd-hero{display:flex;justify-content:space-between;gap:20px;padding:22px;background:#f8fafc;border:1px solid #d7dee5;border-radius:18px}
        .utd-eyebrow{font-size:9px;letter-spacing:.13em;font-weight:950;color:#0f766e}.utd-hero h1{margin:6px 0;font-size:clamp(28px,4vw,44px);letter-spacing:-.04em}.utd-hero p{margin:0;color:#475569;max-width:900px}
        .utd-oee{min-width:130px;display:grid;place-items:center;border:8px solid #d7ebe7;border-radius:22px;color:#0f766e}.utd-oee strong{font-size:28px}.utd-oee span{font-size:10px;font-weight:800}
        .utd-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:14px 0}.utd-card{background:#fff;border:1px solid #d7dee5;border-radius:15px;padding:15px;box-shadow:0 5px 16px rgba(17,24,39,.05);min-width:0}.utd-card span{display:block;color:#475569;font-size:10px;font-weight:800}.utd-card strong{display:block;margin-top:6px;font-size:25px}.utd-card small{display:block;margin-top:5px;color:#64748b}
        .utd-panels{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.utd-panel{background:#fff;border:1px solid #d7dee5;border-radius:16px;padding:17px;min-width:0;box-shadow:0 5px 18px rgba(17,24,39,.04)}.utd-panel h2{margin:4px 0;font-size:18px}.utd-panel p{margin:0 0 13px;color:#64748b;font-size:11px}
        .utd-table{overflow:auto;max-width:100%}.utd-table table{width:100%;min-width:760px;border-collapse:collapse;font-size:11px}.utd-table th,.utd-table td{padding:10px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:middle}.utd-table th{background:#f1f5f9;color:#475569;text-transform:uppercase;font-size:9px}.utd-table button{border:1px solid #b9cbd7;background:#fff;color:#0f766e;border-radius:8px;padding:7px 9px;font-weight:850;cursor:pointer}
        .utd-status{display:inline-flex;padding:5px 8px;border-radius:999px;background:#eef2f7;font-weight:850;font-size:10px}.utd-status.ok{background:#dcfce7;color:#166534}.utd-status.warn{background:#ffedd5;color:#9a3412}.utd-status.stop{background:#fee2e2;color:#991b1b}
        .utd-machine-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.utd-machine{border:1px solid #d7dee5;border-radius:15px;padding:15px;background:#fff}.utd-machine b{display:block;font-size:17px}.utd-machine small{display:block;color:#64748b;margin:5px 0 12px}.utd-machine button{width:100%}
        .utd-calendar{display:grid;grid-template-columns:150px repeat(6,minmax(130px,1fr));overflow:auto;border:1px solid #d7dee5;border-radius:14px}.utd-calendar>div{min-height:82px;padding:10px;border-right:1px solid #d7dee5;border-bottom:1px solid #d7dee5;background:#fff}.utd-calendar .head{min-height:auto;background:#f1f5f9;font-weight:900;color:#334155}.utd-calendar .machine-name{background:#f8fafc;font-weight:900}.utd-cell{border-radius:9px;padding:8px;font-size:10px;font-weight:800}.utd-cell.busy{background:#dbeafe;color:#1d4ed8}.utd-cell.free{background:#dcfce7;color:#166534}.utd-cell.setup{background:#ffedd5;color:#9a3412}
        .utd-legend{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0}.utd-legend span{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:800}.utd-dot{width:12px;height:12px;border-radius:4px}.utd-dot.blue{background:#93c5fd}.utd-dot.green{background:#86efac}.utd-dot.orange{background:#fdba74}
        .utd-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.utd-form label{display:grid;gap:5px;font-size:10px;font-weight:850;color:#475569}.utd-form input,.utd-form select,.utd-form textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:9px;padding:10px;background:#fff;color:#111827}.utd-form textarea{min-height:80px;resize:vertical}.utd-full{grid-column:1/-1}
        .utd-modal{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:18px;background:rgba(15,23,42,.55)}.utd-modal-card{width:min(760px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:18px;padding:20px;box-sizing:border-box;box-shadow:0 30px 90px rgba(0,0,0,.3)}.utd-modal-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.utd-modal-head button{border:0;background:transparent;cursor:pointer}.utd-modal-card h2{margin:4px 0 0}.utd-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.utd-primary{background:#0f766e;color:#fff;border-color:#0f766e}
        .utd-note{padding:12px;border-left:4px solid #ff6b00;background:#fff7ed;color:#7c2d12;border-radius:8px;font-size:11px;line-height:1.55;margin:12px 0}
        @media(max-width:1100px){.utd-grid,.utd-machine-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.utd-panels{grid-template-columns:1fr}}
        @media(max-width:700px){.utd-top{align-items:flex-start}.utd-top button span{display:none}.utd-main{padding:12px}.utd-hero{display:grid}.utd-grid,.utd-machine-grid,.utd-form{grid-template-columns:1fr}.utd-oee{min-height:110px}.utd-top{padding:10px}.utd-title span{display:none}}
      `}</style>

      <header className="utd-top">
        <div className="utd-title">
          <Tablet size={25} color="#ff6b00" />
          <div><strong>Tablet • Chão de Fábrica</strong><span>SGQ ERP Industrial · PCP · MES · Manutenção</span></div>
        </div>
        {onExit && <button className="utd-exit" type="button" onClick={onExit}><X size={17}/><span>Sair do tablet</span></button>}
      </header>

      <nav className="utd-tabs" aria-label="Módulos do chão de fábrica">
        {tabs.map(item => {
          const Icon = item.icon
          return <button key={item.id} type="button" className={tab === item.id ? 'utd-tab active' : 'utd-tab'} onClick={() => setTab(item.id)}>
            <Icon size={16}/>{item.label}
          </button>
        })}
      </nav>

      <main className="utd-main">
        {tab === 'overview' && <Overview oee={oee} onMold={() => setTab('injection')} onMachines={() => setTab('machines')} onStock={() => setTab('stock')} />}
        {tab === 'injection' && <InjectionView selected={selectedMold} onSelect={setSelectedMold} />}
        {tab === 'presses' && <PressView selected={selectedTool} onSelect={setSelectedTool} />}
        {tab === 'machines' && <MachineView selected={selectedMachine} onSelect={setSelectedMachine} />}
        {tab === 'maintenance' && <MaintenanceView />}
        {tab === 'pcp' && <PCPView />}
        {tab === 'stock' && <StockView />}
      </main>

      {selectedMold && <MoldModal mold={selectedMold} onClose={() => setSelectedMold(null)} />}
      {selectedMachine && <MachineModal machine={selectedMachine} onClose={() => setSelectedMachine(null)} />}
      {selectedTool && <ToolModal tool={selectedTool} onClose={() => setSelectedTool(null)} />}
    </section>
  )
}

function Overview({oee,onMold,onMachines,onStock}:{oee:number;onMold:()=>void;onMachines:()=>void;onStock:()=>void}) {
  return <>
    <section className="utd-hero">
      <div><span className="utd-eyebrow">VISÃO OPERACIONAL · ALTO CONTRASTE</span><h1>Controle do chão de fábrica</h1><p>PCP integrado à Injeção Plástica, Prensados/Estamparia, manutenção, máquinas, estoque e apontamento MES.</p></div>
      <div className="utd-oee"><Gauge size={22}/><strong>{oee.toFixed(1)}%</strong><span>OEE DEMO</span></div>
    </section>
    <section className="utd-grid">
      <Metric label="Disponibilidade" value="91,2%" note="máquinas disponíveis"/>
      <Metric label="Performance" value="95,4%" note="ciclo real x padrão"/>
      <Metric label="Qualidade" value="98,1%" note="peças boas"/>
      <Metric label="Setups" value="3" note="1 em execução"/>
      <Metric label="Moldes em alerta" value="1" note="ciclo / cavidade"/>
      <Metric label="Ferramentas em alerta" value="1" note="golpes próximos"/>
      <Metric label="Estoque a vencer" value="1" note="lote monitorado"/>
      <Metric label="Manutenções próximas" value="2" note="programadas"/>
    </section>
    <section className="utd-panels">
      <Panel title="Acesso rápido" description="Cada cartão abre uma tela operacional, não apenas um indicador.">
        <div className="utd-actions">
          <button className="utd-btn utd-primary" type="button" onClick={onMold}><Layers3 size={16}/> Controle de moldes</button>
          <button className="utd-btn" type="button" onClick={onMachines}><Factory size={16}/> Cadastro de máquinas</button>
          <button className="utd-btn" type="button" onClick={onStock}><Package size={16}/> Estoque / vencimentos</button>
        </div>
      </Panel>
      <Panel title="Regras críticas" description="Informações que devem alimentar o PCP e a manutenção.">
        <div className="utd-note">Cavidade isolada reduz a capacidade da OP; golpe/ciclo atualiza a vida útil; refugo exige motivo e origem; setup registra troca de molde, cor e aquecimento do canhão.</div>
        <div className="utd-note">Em demo, os dados são locais e não executam baixa real de estoque, OS ou apontamento fiscal.</div>
      </Panel>
    </section>
  </>
}

function InjectionView({selected,onSelect}:{selected:Mold|null;onSelect:(m:Mold)=>void}) {
  return <section>
    <PageHead eyebrow="INJEÇÃO PLÁSTICA" title="Moldes, cavidades e apontamento MES" text="Cadastro completo do ativo, propriedade, fabricação, ciclos, manutenção preventiva e capacidade real."/>
    <Panel title="Cadastro de moldes" description="Clique em qualquer molde para abrir a ficha operacional completa.">
      <Table heads={['Molde','Descrição','Propriedade','Cavidades','Ciclos','Vida útil','Status','Ação']}
        rows={molds.map(m => [
          m.code, m.description, m.customerOwned ? 'Cliente' : 'Empresa',
          num(m.activeCavities)+' / '+num(m.totalCavities), num(m.accumulatedCycles),
          percent((m.accumulatedCycles / m.targetCycles) * 100), m.status, 'Abrir ficha'
        ])}
        onAction={index => { const mold = molds?.[index]; if (mold) onSelect(mold) }}
      />
    </Panel>
    <div className="utd-panels">
      <Panel title="Setup de injeção" description="Tempos que entram no sequenciamento e no OEE.">
        <div className="utd-grid">
          <Metric label="Troca de molde" value="42 min" note="setup mecânico"/>
          <Metric label="Aquecimento do canhão" value="18 min" note="temperatura estável"/>
          <Metric label="Troca de cor" value="12 min" note="purga / limpeza"/>
          <Metric label="Setup total" value="72 min" note="OP-0480"/>
        </div>
      </Panel>
      <Panel title="Apontamento MES" description="Pilares do apontamento de produção.">
        <div className="utd-table"><table><thead><tr><th>OP</th><th>Máquina</th><th>Boas</th><th>Refugo</th><th>Galhos kg</th><th>Cavidades</th></tr></thead><tbody>
          {production.map(p => <tr key={p.op}><td>{p.op}</td><td>{p.machine}</td><td>{num(p.good)}</td><td>{num(p.scrap)}</td><td>{num(p.runnerKg)}</td><td>{num(p.activeCavities)}</td></tr>)}
        </tbody></table></div>
      </Panel>
    </div>
    {selected && <div className="utd-note">Ficha selecionada: <strong>{selected?.code}</strong> · {selected?.activeCavities}/{selected?.totalCavities} cavidades ativas · próximo gatilho de manutenção em {num(selected?.nextMaintenanceCycles)} ciclos.</div>}
  </section>
}

function PressView({selected,onSelect}:{selected:Tool|null;onSelect:(t:Tool)=>void}) {
  return <section>
    <PageHead eyebrow="PRENSADOS / ESTAMPARIA" title="Estampos, facas, prensas e bobinas" text="Controle por golpes, tonelagem, consumo de aço, retalho e sucata."/>
    <Panel title="Ferramentas" description="Estampo e faca possuem a mesma ficha de vida útil baseada em golpes.">
      <Table heads={['Código','Tipo','Prensa','Golpes','Limite','Saldo','Status','Ação']}
        rows={tools.map(t => [t.code,t.type,t.machine,num(t.strokes),num(t.limit),num(Math.max(t.limit-t.strokes,0)),t.status,'Abrir ficha'])}
        onAction={index => { const tool = tools?.[index]; if (tool) onSelect(tool) }}
      />
    </Panel>
    <Panel title="Consumo de bobinas" description="Peso em kg e rastreabilidade por lote.">
      <div className="utd-table"><table><thead><tr><th>OP</th><th>Bobina</th><th>Material</th><th>Consumo kg</th><th>Retalho</th><th>Sucata</th></tr></thead><tbody>
        <tr><td>OP-0512</td><td>BOB-26091</td><td>Aço SAE 1020 · 1,20 mm</td><td>982 kg</td><td>38 kg</td><td>24 kg</td></tr>
        <tr><td>OP-0520</td><td>BOB-26102</td><td>Aço galvanizado · 0,90 mm</td><td>744 kg</td><td>31 kg</td><td>19 kg</td></tr>
      </tbody></table></div>
    </Panel>
    {selected && <div className="utd-note">Ficha selecionada: <strong>{selected?.code}</strong> · {selected?.type} · {num(selected?.strokes)} golpes de {num(selected?.limit)}.</div>}
  </section>
}

function MachineView({selected,onSelect}:{selected:Machine|null;onSelect:(m:Machine)=>void}) {
  return <section>
    <PageHead eyebrow="CADASTRO DE MÁQUINAS" title="Parque fabril" text="Número, tipo, tonelagem, fabricante, status e plano de manutenção por máquina."/>
    <div className="utd-machine-grid">{machines.map(machine => <article className="utd-machine" key={machine.number}>
      <span className="utd-eyebrow">MÁQUINA Nº {machine?.number}</span><b>{machine?.type}</b><small>{num(machine?.tonnage)} toneladas · {machine?.manufacturer}</small>
      <Status value={machine?.status}/>
      <div className="utd-actions"><button className="utd-btn" type="button" onClick={() => onSelect(machine)}><Settings2 size={15}/> Abrir cadastro</button></div>
    </article>)}</div>
    {selected && <div className="utd-note">Cadastro selecionado: <strong>Máquina {selected?.number}</strong> · {selected?.tonnage} t · próxima manutenção {selected?.nextMaintenance}.</div>}
  </section>
}

function MaintenanceView() {
  return <section>
    <PageHead eyebrow="MANUTENÇÃO" title="Planos preventivos e corretivos" text="Gatilhos por ciclos/golpes, calendário, responsável, OS e evidência de execução."/>
    <div className="utd-grid">
      <Metric label="OS abertas" value="3" note="2 preventivas · 1 corretiva"/>
      <Metric label="Vencendo em 7 dias" value="2" note="prioridade alta"/>
      <Metric label="Moldes monitorados" value={num(molds?.length)} note="ciclos acumulados"/>
      <Metric label="Máquinas monitoradas" value={num(machines?.length)} note="tonelagem cadastrada"/>
    </div>
    <Panel title="Plano preventivo" description="Modelo que deve gerar OS automaticamente quando o gatilho for atingido.">
      <div className="utd-table"><table><thead><tr><th>Ativo</th><th>Gatilho</th><th>Última execução</th><th>Próximo</th><th>Responsável</th><th>Status</th></tr></thead><tbody>
        <tr><td>MOL-014</td><td>400.000 ciclos</td><td>22/08/2026</td><td>Ao atingir 400.000</td><td>Manutenção</td><td><Status value="Atenção"/></td></tr>
        <tr><td>Prensa 03</td><td>50.000 golpes</td><td>17/09/2026</td><td>24/09/2026</td><td>Manutenção</td><td><Status value="Manutenção"/></td></tr>
        <tr><td>Injetora 01</td><td>1.000 h</td><td>04/09/2026</td><td>04/10/2026</td><td>Manutenção</td><td><Status value="Disponível"/></td></tr>
      </tbody></table></div>
    </Panel>
  </section>
}

function PCPView() {
  const days = ['21/09','22/09','23/09','24/09','25/09','26/09']
  return <section>
    <PageHead eyebrow="PCP / APS" title="Calendário visual por máquina" text="Planejamento por capacidade finita. Azul = ocupada, verde = liberada, laranja = setup."/>
    <div className="utd-legend"><span><i className="utd-dot blue"/> Ocupada</span><span><i className="utd-dot green"/> Liberada</span><span><i className="utd-dot orange"/> Setup</span></div>
    <div className="utd-calendar">
      <div className="head">Máquina</div>{days.map(day => <div className="head" key={day}>{day}</div>)}
      {machines.map(machine => <div key={machine.number} className="utd-calendar" style={{display:'contents'}}>
        <div className="machine-name">Máquina {machine.number}<br/><small>{machine.tonnage} t</small></div>
        {days.map(day => {
          const entry = schedule?.find(item => item?.machine === machine.number && item?.date === day)
          return <div key={day}><div className={entry?.status === 'Ocupada' ? 'utd-cell busy' : entry?.status === 'Setup' ? 'utd-cell setup' : 'utd-cell free'}>{entry?.status ?? 'Liberada'}<br/>{entry?.product ?? '—'}</div></div>
        })}
      </div>)}
    </div>
  </section>
}

function StockView() {
  return <section>
    <PageHead eyebrow="ESTOQUE" title="Materiais e validade" text="Visão rápida de matéria-prima, lote, localização e itens próximos do vencimento."/>
    <Panel title="Estoque monitorado" description="O lote com validade deve entrar na rotina FEFO e gerar alerta para PCP/Compras.">
      <div className="utd-table"><table><thead><tr><th>Item</th><th>Descrição</th><th>Qtd.</th><th>Lote</th><th>Validade</th><th>Local</th><th>Status</th></tr></thead><tbody>
        {stock.map(item => {
          const expiry = item?.expiry
          const critical = expiry === '2026-10-02'
          return <tr key={item.code}><td>{item?.code}</td><td>{item?.description}</td><td>{num(item?.quantity)} {item?.unit}</td><td>{item?.lot}</td><td>{expiry ?? 'Sem validade'}</td><td>{item?.location}</td><td><Status value={critical ? 'Atenção' : 'Disponível'}/></td></tr>
        })}
      </tbody></table></div>
    </Panel>
  </section>
}

function MoldModal({mold,onClose}:{mold:Mold;onClose:()=>void}) {
  return <Modal title={'Ficha do molde · '+(mold?.code ?? '—')} onClose={onClose}>
    <div className="utd-form">
      <Field label="Código / Tag" value={mold?.code}/>
      <Field label="Descrição" value={mold?.description}/>
      <Field label="Propriedade" value={mold?.customerOwned ? 'Cliente' : 'Empresa'}/>
      <Field label="Cliente proprietário" value={mold?.customer ?? 'Não aplicável'}/>
      <Field label="Data de fabricação" value={mold?.manufacturedAt}/>
      <Field label="Classe SPI" value={mold?.spiClass}/>
      <Field label="Ciclos acumulados" value={num(mold?.accumulatedCycles)}/>
      <Field label="Meta de vida" value={num(mold?.targetCycles)}/>
      <Field label="Cavidades ativas" value={num(mold?.activeCavities)}/>
      <Field label="Cavidades totais" value={num(mold?.totalCavities)}/>
      <Field label="Última manutenção" value={mold?.lastMaintenance}/>
      <Field label="Próximo gatilho" value={num(mold?.nextMaintenanceCycles)+' ciclos'}/>
      <label className="utd-full">Projeto / desenho / documento do molde<input type="file" accept=".pdf,.png,.jpg,.jpeg,.step,.stp,.dwg"/></label>
      <label className="utd-full">Observações<textarea defaultValue={'Cadastro demonstrativo. Anexar projeto, desenho, ficha técnica, histórico de manutenção e evidências de execução.'}/></label>
    </div>
    <div className="utd-note">Regra PCP: cavidade isolada reduz a capacidade produtiva da OP. Regra manutenção: ao atingir o próximo gatilho, gerar OS preventiva.</div>
    <div className="utd-actions"><button className="utd-btn utd-primary" type="button" onClick={onClose}>Salvar demonstração</button></div>
  </Modal>
}

function MachineModal({machine,onClose}:{machine:Machine;onClose:()=>void}) {
  return <Modal title={'Cadastro da máquina nº '+(machine?.number ?? '—')} onClose={onClose}>
    <div className="utd-form">
      <Field label="Número da máquina" value={machine?.number}/>
      <Field label="Tipo" value={machine?.type}/>
      <Field label="Tonelagem" value={num(machine?.tonnage)+' t'}/>
      <Field label="Fabricante" value={machine?.manufacturer}/>
      <Field label="Status" value={machine?.status}/>
      <Field label="Próxima manutenção" value={machine?.nextMaintenance}/>
      <label className="utd-full">Manual / ficha técnica<input type="file" accept=".pdf,.png,.jpg,.jpeg"/></label>
      <label className="utd-full">Plano de manutenção<textarea defaultValue="Lubrificação; hidráulica; elétrica; segurança; horas de operação; checklist de partida e parada." /></label>
    </div>
    <div className="utd-actions"><button className="utd-btn utd-primary" type="button" onClick={onClose}>Salvar demonstração</button></div>
  </Modal>
}

function ToolModal({tool,onClose}:{tool:Tool;onClose:()=>void}) {
  return <Modal title={'Ficha de ferramenta · '+(tool?.code ?? '—')} onClose={onClose}>
    <div className="utd-form">
      <Field label="Código" value={tool?.code}/>
      <Field label="Tipo" value={tool?.type}/>
      <Field label="Máquina / prensa" value={tool?.machine}/>
      <Field label="Golpes acumulados" value={num(tool?.strokes)}/>
      <Field label="Limite" value={num(tool?.limit)}/>
      <Field label="Saldo" value={num(Math.max((tool?.limit ?? 0) - (tool?.strokes ?? 0), 0))}/>
      <label className="utd-full">Projeto / desenho da ferramenta<input type="file" accept=".pdf,.png,.jpg,.jpeg,.step,.stp,.dwg"/></label>
      <label className="utd-full">Plano de afiação<textarea defaultValue="Registrar afiação, troca de faca/estampo, responsável, data, golpes no momento da intervenção e evidência." /></label>
    </div>
    <div className="utd-actions"><button className="utd-btn utd-primary" type="button" onClick={onClose}>Salvar demonstração</button></div>
  </Modal>
}

function PageHead({eyebrow,title,text}:{eyebrow:string;title:string;text:string}) {
  return <header style={{marginBottom:14}}><span className="utd-eyebrow">{eyebrow}</span><h1 style={{margin:'6px 0',fontSize:'clamp(26px,4vw,42px)',letterSpacing:'-.04em'}}>{title}</h1><p style={{margin:0,color:'#475569'}}>{text}</p></header>
}

function Metric({label,value,note}:{label:string;value:string;note:string}) {
  return <article className="utd-card"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>
}

function Panel({title,description,children}:{title:string;description:string;children:React.ReactNode}) {
  return <section className="utd-panel"><h2>{title}</h2><p>{description}</p>{children}</section>
}

function Table({heads,rows,onAction}:{heads:string[];rows:string[][];onAction?:(index:number)=>void}) {
  return <div className="utd-table"><table><thead><tr>{heads.map(head => <th key={head}>{head}</th>)}</tr></thead><tbody>
    {rows.map((row,index) => <tr key={row.join('|')+index}>{row.map((cell,cellIndex) => <td key={heads?.[cellIndex] ?? cellIndex}>{cell}</td>)}{onAction && <td><button type="button" onClick={() => onAction?.(index)}>Abrir</button></td>}</tr>)}
  </tbody></table></div>
}

function Status({value}:{value:Status}) {
  const tone = value === 'Disponível' || value === 'Em produção' ? 'ok' : value === 'Atenção' ? 'warn' : value === 'Bloqueado' ? 'stop' : ''
  return <span className={'utd-status '+tone}>{value}</span>
}

function Field({label,value}:{label:string;value:string|undefined}) {
  return <label><span>{label}</span><input value={value ?? '—'} readOnly /></label>
}

function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}) {
  return <div className="utd-modal" onMouseDown={onClose}><div className="utd-modal-card" onMouseDown={event => event.stopPropagation()}>
    <div className="utd-modal-head"><div><span className="utd-eyebrow">CADASTRO OPERACIONAL</span><h2>{title}</h2></div><button type="button" onClick={onClose} aria-label="Fechar"><X size={19}/></button></div>
    {children}
  </div></div>
}
