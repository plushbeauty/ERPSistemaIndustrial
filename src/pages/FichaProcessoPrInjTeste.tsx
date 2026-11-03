import { useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Activity, ClipboardList, Factory, Gauge, Thermometer, Waves } from 'lucide-react'

type Tab = 'visao' | 'configuracoes' | 'historico' | 'qualidade'
type Param = { label: string; value: string }

const injection: Param[] = [
  { label: 'SKU', value: 'FT-INJ-001' }, { label: 'Molde', value: 'M-2026-089' },
  { label: 'Cavidades', value: '1' }, { label: 'Máquina', value: 'ROMI 170' },
  { label: 'Resina / composto', value: 'Caixa organizadora plástica' }, { label: 'Cor', value: 'Preto' },
  { label: 'Aditivo / masterbatch', value: '20% (exemplo)' }, { label: 'Tempo de ciclo', value: '28,0 s (exemplo)' },
]
const press: Param[] = [
  { label: 'Cavidades', value: '4 (exemplo)' }, { label: 'Dimensão do molde', value: '450 × 450 × 320 mm' },
  { label: 'Peso do molde', value: '350 kg (exemplo)' }, { label: 'Pré-aquecimento', value: '45 min (exemplo)' },
  { label: 'Material', value: 'Borracha nitrílica' }, { label: 'Dureza', value: '70 Shore A (exemplo)' },
  { label: 'Peso por cavidade', value: '85 g (exemplo)' }, { label: 'Tempo de cura', value: '90 s (exemplo)' },
]
const injectionParameters: Param[] = [
  { label: 'Velocidade de injeção', value: '0,00 mm/s' }, { label: 'Pressão de injeção', value: '200 MPa' },
  { label: 'Pressão de recalque', value: '1 MPa' }, { label: 'Posição de transferência', value: '-43,0 mm' },
  { label: 'Rotação da rosca', value: '1000 RPM' }, { label: 'Contrapressão', value: '5,0 MPa' },
  { label: 'Resfriamento', value: '8,0 s' }, { label: 'Pressão máxima', value: '300 MPa' },
]
const pressParameters: Param[] = [
  { label: 'Temperatura prato superior', value: '165°C ±5°C' }, { label: 'Temperatura prato inferior', value: '160°C ±5°C' },
  { label: 'Pressão de trabalho', value: '120 bar (exemplo)' }, { label: 'Força de fechamento', value: '120 t (exemplo)' },
  { label: 'Número de respiros', value: '2 ciclos' }, { label: 'Tempo até 1º respiro', value: '15 s' },
  { label: 'Tempo de alívio', value: '5 s' }, { label: 'Pré-aquecimento da matéria-prima', value: '30 s' },
]
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><h3 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800">{title}</h3>{children}</section>
}
function Rows({ rows }: { rows: Param[] }) {
  return <dl className="divide-y divide-slate-100">{rows.map(row => <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 py-2.5 text-sm"><dt className="text-slate-600">{row.label}</dt><dd className="max-w-[65%] text-right font-semibold text-slate-800">{row.value}</dd></div>)}</dl>
}
function Stamp({ code, revision }: { code: string; revision: string }) {
  return <div className="grid gap-2 sm:grid-cols-3">{[['Documento', code], ['Revisão', revision]].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 bg-white px-3 py-2"><span className="block text-[11px] uppercase text-slate-500">{label}</span><strong className="text-sm text-slate-800">{value}</strong></div>)}<div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center"><span className="block text-[11px] uppercase text-amber-800">Status</span><strong className="text-sm text-amber-900">Teste visual · não homologado</strong></div></div>
}
function Profile({ kind }: { kind: 'inj' | 'pr' }) {
  const zones = kind === 'inj' ? [{ label: 'Bico', value: '130°C', width: 'w-1/3' }, { label: 'Zona 1', value: '230°C', width: 'w-3/5' }, { label: 'Zona 2', value: '230°C', width: 'w-3/5' }, { label: 'Zona 3', value: '270°C', width: 'w-4/5' }, { label: 'Feed', value: '180°C', width: 'w-2/5' }] : [{ label: 'Prato superior', value: '165°C ±5°C', width: 'w-3/4' }, { label: 'Prato inferior', value: '160°C ±5°C', width: 'w-2/3' }]
  return <div className="space-y-4 p-4">{zones.map(zone => <div key={zone.label}><div className="mb-1 flex justify-between gap-2 text-xs"><span className="text-slate-600">{zone.label}</span><strong>{zone.value}</strong></div><div className="h-3 rounded-full bg-slate-100"><div className={`h-3 rounded-full bg-teal-600 ${zone.width}`} /></div></div>)}<p className="text-center text-[11px] text-slate-500">Perfil ilustrativo, sem ligação com sensores ou máquina real.</p></div>
}
function SheetTabs({ kind }: { kind: 'inj' | 'pr' }) {
  const [tab, setTab] = useState<Tab>('visao')
  const params = kind === 'inj' ? injectionParameters : pressParameters
  const identity = kind === 'inj' ? injection : press
  const tabs: { value: Tab; label: string }[] = [{ value: 'visao', label: 'Visão geral' }, { value: 'configuracoes', label: 'Configurações do processo' }, { value: 'historico', label: 'Histórico de produção' }, { value: 'qualidade', label: 'Controle de qualidade' }]
  return <Tabs.Root value={tab} onValueChange={value => setTab(value as Tab)}><Tabs.List aria-label="Seções da ficha de processo" className="flex flex-wrap gap-1 border-b border-slate-200 bg-white px-1">{tabs.map(item => <Tabs.Trigger key={item.value} value={item.value} className="min-h-10 border-b-2 border-transparent px-3 text-xs font-semibold text-slate-500 hover:bg-slate-50 data-[state=active]:border-teal-700 data-[state=active]:text-teal-800 sm:text-sm">{item.label}</Tabs.Trigger>)}</Tabs.List><Tabs.Content value={tab} className="space-y-4 pt-4">
    {tab === 'visao' && <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]"><Panel title={kind === 'inj' ? 'Identificação e matéria-prima' : 'Dados do molde e composto'}><Rows rows={identity} /></Panel><Panel title={kind === 'inj' ? 'Perfil de temperatura do canhão' : 'Temperatura dos pratos'}><Profile kind={kind} /></Panel><div className="xl:col-span-2"><Panel title={kind === 'inj' ? 'Parâmetros da injetora' : 'Parâmetros de cura e prensagem'}><div className="grid gap-0 sm:grid-cols-2"><Rows rows={params.slice(0, 4)} /><Rows rows={params.slice(4)} /></div></Panel></div></div>}
    {tab === 'configuracoes' && <div className="grid gap-4 lg:grid-cols-2"><Panel title="Parâmetros técnicos"><Rows rows={params} /></Panel><Panel title="Referência de processo"><Rows rows={identity} /></Panel></div>}
    {tab === 'historico' && <Panel title="Histórico de ajustes (exemplo visual)"><p className="border-b border-slate-100 px-4 py-3 text-xs text-amber-800">Não há registros reais. Estas linhas demonstrativas não são gravadas no ERP.</p><div className="overflow-x-auto"><table className="w-full min-w-[540px] text-left text-xs"><thead className="bg-slate-50"><tr>{['Data', 'Responsável', 'Parâmetro', 'Ajuste', 'Status'].map(h => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead><tbody><tr className="border-t border-slate-100">{['—', 'Referência visual', kind === 'inj' ? 'Tempo de ciclo' : 'Tempo de cura', 'Ajuste ilustrativo', 'Não homologado'].map((v, i) => <td key={i} className="px-3 py-3 text-slate-600">{v}</td>)}</tr></tbody></table></div></Panel>}
    {tab === 'qualidade' && <div className="grid gap-4 lg:grid-cols-2"><Panel title="Pontos de controle"><Rows rows={[{ label: 'Identificação de produto e molde', value: 'Conferir antes do setup' }, { label: 'Ficha vigente', value: 'Validar revisão aprovada' }, { label: 'Primeira peça', value: 'Inspecionar conforme plano' }, { label: 'Máquina e proteções', value: 'Seguir procedimento local' }]} /></Panel><Panel title="Rastreabilidade e aprovação"><Rows rows={[{ label: 'Processo', value: kind === 'inj' ? 'Injeção plástica' : 'Prensagem hidráulica' }, { label: 'Status', value: 'Não homologado' }, { label: 'Critério dimensional', value: 'Consultar desenho aprovado' }, { label: 'Responsável / data', value: 'Não preenchidos' }]} /></Panel></div>}
  </Tabs.Content></Tabs.Root>
}
export default function FichaProcessoPrInjTeste() {
  const [kind, setKind] = useState<'inj' | 'pr'>('inj')
  return <main className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-sm sm:p-5 lg:p-6"><header className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Engenharia · PCP · página de teste</p><h1 className="mt-1 text-xl font-bold sm:text-2xl">Ficha de Processo PR e Inj — Teste</h1><p className="mt-1 text-sm text-slate-600">Prévia visual de fichas para injeção plástica e prensagem hidráulica.</p></div><p role="note" className="max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900"><strong>Somente demonstração.</strong> Todos os valores são exemplos, não são dados do ERP, não foram homologados e não devem ser usados para configurar máquinas ou produzir.</p></header><Tabs.Root value={kind} onValueChange={value => setKind(value as 'inj' | 'pr')}><Tabs.List aria-label="Tipo de ficha" className="mb-4 flex flex-wrap gap-2 border-b border-slate-200">{[{ value: 'inj', label: 'Injetados', icon: Activity }, { value: 'pr', label: 'Prensado', icon: Factory }].map(item => { const Icon = item.icon; return <Tabs.Trigger key={item.value} value={item.value} className="inline-flex min-h-11 items-center gap-2 border-b-2 border-transparent px-4 text-sm font-semibold text-slate-600 data-[state=active]:border-teal-700 data-[state=active]:text-teal-800"><Icon size={16} />{item.label}</Tabs.Trigger> })}</Tabs.List><Tabs.Content value="inj" className="space-y-4"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-800"><Waves size={19} /></span><div><p className="text-xs uppercase text-slate-500">Processo · Injeção plástica</p><h2 className="text-lg font-bold">Caixa Organizadora Plástica 5L</h2></div></div><Stamp code="FT-INJ-001" revision="01" /></div><SheetTabs kind="inj" /></Tabs.Content><Tabs.Content value="pr" className="space-y-4"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-800"><Gauge size={19} /></span><div><p className="text-xs uppercase text-slate-500">Processo · Prensagem hidráulica</p><h2 className="text-lg font-bold">Ficha hidráulica de prensa e vulcanização</h2></div></div><Stamp code="FT-PRE-002" revision="02" /></div><SheetTabs kind="pr" /></Tabs.Content></Tabs.Root><footer className="mt-5 flex flex-col gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500 sm:flex-row sm:justify-between"><span className="inline-flex items-center gap-1.5"><ClipboardList size={14} /> Referência visual · documento não controlado</span><span className="inline-flex items-center gap-1.5"><Thermometer size={14} /> Validar parâmetros no processo oficial antes de qualquer uso</span></footer></main>
}
