/**
 * REV-PCP-FICHA-TESTE-001 | 2026-10-21
 * Fonte: protótipo visual enviado pelo Lovable.dev.
 * Escopo: avaliação visual isolada; dados demonstrativos claramente identificados.
 * Segurança: não grava dados e não substitui a ficha aprovada.
 */
import { useMemo, useState } from 'react'
import { Activity, ArrowLeft, BadgeCheck, Box, CalendarClock, ClipboardList, Factory, Gauge, Printer, Search, Thermometer, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion'
import { Menubar, MenubarMenu, MenubarTrigger } from '../components/ui/menubar'

type DemoFicha = {
  codigo: string; descricao: string; maquina: string; molde: string; cavidades: number; resina: string
  temperaturas: { label: string; value: number }[]
  ciclo: { label: string; value: number }[]
  parametros: { grupo: string; label: string; valor: string }[]
}
const fichas: DemoFicha[] = [
  { codigo: 'FT-TESTE-001', descricao: 'Caixa organizadora plástica 5 L', maquina: 'INJETORA 170T · TESTE', molde: 'M-TESTE-089', cavidades: 1, resina: 'PP copolímero', temperaturas: [{ label: 'Bico', value: 230 }, { label: 'Zona 1', value: 230 }, { label: 'Zona 2', value: 225 }, { label: 'Zona 3', value: 215 }, { label: 'Aliment.', value: 180 }], ciclo: [{ label: 'Preenchimento', value: 3 }, { label: 'Recalque', value: 4.5 }, { label: 'Resfriamento', value: 16 }, { label: 'Abertura / extração', value: 4.5 }], parametros: [{ grupo: 'Injeção e recalque', label: 'Velocidade de injeção', valor: '85 mm/s' }, { grupo: 'Injeção e recalque', label: 'Pressão de injeção', valor: '120 MPa' }, { grupo: 'Injeção e recalque', label: 'Pressão de recalque', valor: '65 MPa' }, { grupo: 'Injeção e recalque', label: 'Posição de comutação', valor: '18,0 mm' }, { grupo: 'Plastificação', label: 'Rotação da rosca', valor: '120 RPM' }, { grupo: 'Plastificação', label: 'Contrapressão', valor: '8 bar' }, { grupo: 'Plastificação', label: 'Curso de dosagem', valor: '62,0 mm' }, { grupo: 'Fechamento e extração', label: 'Força de fechamento', valor: '170 t' }, { grupo: 'Fechamento e extração', label: 'Proteção do molde', valor: 'Ativa' }, { grupo: 'Fechamento e extração', label: 'Golpes de extração', valor: '2' }] },
  { codigo: 'FT-TESTE-002', descricao: 'Tampa para caixa organizadora 5 L', maquina: 'INJETORA 170T · TESTE', molde: 'M-TESTE-090', cavidades: 2, resina: 'PP homopolímero', temperaturas: [{ label: 'Bico', value: 220 }, { label: 'Zona 1', value: 220 }, { label: 'Zona 2', value: 215 }, { label: 'Zona 3', value: 210 }, { label: 'Aliment.', value: 175 }], ciclo: [{ label: 'Preenchimento', value: 2.5 }, { label: 'Recalque', value: 3.5 }, { label: 'Resfriamento', value: 14 }, { label: 'Abertura / extração', value: 4 }], parametros: [{ grupo: 'Injeção e recalque', label: 'Velocidade de injeção', valor: '90 mm/s' }, { grupo: 'Injeção e recalque', label: 'Pressão de injeção', valor: '110 MPa' }, { grupo: 'Injeção e recalque', label: 'Pressão de recalque', valor: '60 MPa' }, { grupo: 'Injeção e recalque', label: 'Posição de comutação', valor: '15,0 mm' }, { grupo: 'Plastificação', label: 'Rotação da rosca', valor: '130 RPM' }, { grupo: 'Plastificação', label: 'Contrapressão', valor: '7 bar' }, { grupo: 'Plastificação', label: 'Curso de dosagem', valor: '55,0 mm' }, { grupo: 'Fechamento e extração', label: 'Força de fechamento', valor: '170 t' }, { grupo: 'Fechamento e extração', label: 'Proteção do molde', valor: 'Ativa' }, { grupo: 'Fechamento e extração', label: 'Golpes de extração', valor: '2' }] },
]

export default function PCPFichaProcessoTeste() {
  const [selectedCode, setSelectedCode] = useState(fichas[0].codigo)
  const [search, setSearch] = useState('')
  const [activeView, setActiveView] = useState<'ficha' | 'parametros' | 'historico'>('ficha')
  const ficha = useMemo(() => fichas.find((item) => item.codigo === selectedCode) ?? fichas[0], [selectedCode])
  const filtered = fichas.filter((item) => (item.codigo + ' ' + item.descricao).toLowerCase().includes(search.toLowerCase()))
  const cycleTotal = ficha.ciclo.reduce((sum, item) => sum + item.value, 0)
  const maxTemp = Math.max(...ficha.temperaturas.map((item) => item.value), 250)

  return (
    <main className="min-h-[calc(100vh-56px)] bg-[#eef3f8] text-slate-800">
      <header className="bg-[#123B50] text-white shadow-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/20 bg-white/10"><Factory className="h-5 w-5 text-cyan-200" /></div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">SYSNQRA ERP & SGQ INDUSTRIAL · PCP</div>
              <h1 className="truncate text-lg font-bold tracking-tight">Ficha de Processo — Ambiente de Teste</h1>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-blue-100 md:flex"><span className="h-2 w-2 rounded-full bg-amber-400" /> Visualização de demonstração · não grava dados</div>
        </div>
        <div className="border-t border-white/10 bg-[#0d2e40] px-5 py-2">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3">
            <Menubar className="border-0 bg-transparent p-0 shadow-none">
              <MenubarMenu><MenubarTrigger className={activeView === 'ficha' ? 'bg-white/15 text-white' : ''} onClick={() => setActiveView('ficha')}><Activity className="mr-2 h-3.5 w-3.5" /> Visão geral</MenubarTrigger></MenubarMenu>
              <MenubarMenu><MenubarTrigger className={activeView === 'parametros' ? 'bg-white/15 text-white' : ''} onClick={() => setActiveView('parametros')}><Wrench className="mr-2 h-3.5 w-3.5" /> Parâmetros</MenubarTrigger></MenubarMenu>
              <MenubarMenu><MenubarTrigger className={activeView === 'historico' ? 'bg-white/15 text-white' : ''} onClick={() => setActiveView('historico')}><ClipboardList className="mr-2 h-3.5 w-3.5" /> Histórico</MenubarTrigger></MenubarMenu>
            </Menubar>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => window.print()} className="inline-flex h-8 items-center gap-2 rounded border border-white/20 px-3 text-xs font-bold text-white hover:bg-white/10"><Printer className="h-3.5 w-3.5" /> Imprimir</button>
              <Link to="/pcp/fichas-processo" className="inline-flex h-8 items-center gap-2 rounded bg-white px-3 text-xs font-bold text-[#123B50] hover:bg-cyan-50"><ArrowLeft className="h-3.5 w-3.5" /> Ficha aprovada</Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-5 md:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">Engenharia de processo / Injetados</div><h2 className="mt-1 text-xl font-bold text-slate-900">{ficha.descricao}</h2><p className="mt-1 text-xs text-slate-500">Protótipo visual isolado para avaliação antes de qualquer substituição da tela aprovada.</p></div>
          <div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800"><BadgeCheck className="h-3.5 w-3.5" /> Layout de teste</span><span className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600"><CalendarClock className="h-3.5 w-3.5" /> Revisão visual 01</span></div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 p-3"><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700"><Box className="h-4 w-4 text-blue-700" /> Fichas de teste <span className="ml-auto rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-800">{filtered.length}</span></div><div className="relative"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar ficha..." className="h-8 w-full rounded border border-slate-300 bg-white pl-8 pr-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div></div>
            <div className="space-y-1 p-2">{filtered.map((item) => <button key={item.codigo} type="button" onClick={() => setSelectedCode(item.codigo)} className={['w-full rounded border p-3 text-left transition-colors', selectedCode === item.codigo ? 'border-blue-300 bg-blue-50' : 'border-transparent hover:bg-slate-50'].join(' ')}><div className="flex items-center justify-between gap-2"><span className="text-xs font-extrabold text-slate-900">{item.codigo}</span><span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-800">Teste</span></div><div className="mt-1 text-xs font-semibold text-slate-600">{item.descricao}</div><div className="mt-2 text-[10px] text-slate-400">{item.maquina}</div></button>)}</div>
            <div className="border-t border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-900">Dados demonstrativos. Esta tela não consulta nem grava fichas no banco.</div>
          </aside>

          <section className="min-w-0 space-y-4">
            {activeView === 'ficha' && <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
              <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-700">Perfil de temperatura</h3><p className="mt-1 text-[11px] text-slate-400">Setpoints por zona térmica · °C</p></div><Thermometer className="h-5 w-5 text-blue-700" /></div><div className="flex h-44 items-end justify-around gap-3 border-b border-slate-100 px-2 pb-2">{ficha.temperaturas.map((temp) => <div key={temp.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-extrabold tabular-nums text-slate-800">{temp.value}°</span><div className="flex w-full max-w-12 items-end" style={{ height: '100px' }}><div className="w-full rounded-t-sm bg-gradient-to-t from-blue-800 to-cyan-500 shadow-sm" style={{ height: Math.max(8, temp.value / maxTemp * 100) + 'px' }} /></div><span className="text-center text-[10px] font-bold text-slate-500">{temp.label}</span></div>)}</div><div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500"><span className="h-2 w-2 rounded-full bg-cyan-500" /> Perfil configurado para avaliação visual — não representa leitura ao vivo da máquina.</div></article>
              <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-700">Resumo do ciclo</h3><p className="mt-1 text-[11px] text-slate-400">Tempos de processo em segundos</p></div><Gauge className="h-5 w-5 text-blue-700" /></div><div className="space-y-3">{ficha.ciclo.map((item) => <div key={item.label} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 text-xs"><span className="text-slate-500">{item.label}</span><span className="font-bold tabular-nums text-slate-800">{item.value.toFixed(1)} s</span></div>)}</div><div className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3"><div className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">Tempo total calculado</div><div className="mt-1 text-2xl font-black tabular-nums text-emerald-700">{cycleTotal.toFixed(1)} <span className="text-sm font-bold">s</span></div></div></article>
            </div>}

            {activeView !== 'historico' && <article className="rounded-md border border-slate-200 bg-white px-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-3"><div><h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-700">Parâmetros da injetora</h3><p className="mt-1 text-[11px] text-slate-400">Painéis expansíveis para operação e engenharia</p></div><Wrench className="h-4 w-4 text-blue-700" /></div><Accordion type="multiple" defaultValue={['injecao','plastificacao']}><AccordionItem value="injecao"><AccordionTrigger><span>01 · Injeção e recalque</span><span className="ml-auto mr-3 text-[10px] font-semibold text-slate-400">4 parâmetros</span></AccordionTrigger><AccordionContent><div className="grid grid-cols-1 gap-2 pb-1 sm:grid-cols-2 xl:grid-cols-4">{ficha.parametros.filter((item) => item.grupo === 'Injeção e recalque').map((item) => <div key={item.label} className="rounded border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-semibold text-slate-500">{item.label}</div><div className="mt-1 text-sm font-extrabold text-slate-800">{item.valor}</div></div>)}</div></AccordionContent></AccordionItem><AccordionItem value="plastificacao"><AccordionTrigger><span>02 · Plastificação</span><span className="ml-auto mr-3 text-[10px] font-semibold text-slate-400">3 parâmetros</span></AccordionTrigger><AccordionContent><div className="grid grid-cols-1 gap-2 pb-1 sm:grid-cols-3">{ficha.parametros.filter((item) => item.grupo === 'Plastificação').map((item) => <div key={item.label} className="rounded border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-semibold text-slate-500">{item.label}</div><div className="mt-1 text-sm font-extrabold text-slate-800">{item.valor}</div></div>)}</div></AccordionContent></AccordionItem><AccordionItem value="fechamento"><AccordionTrigger><span>03 · Fechamento e extração</span><span className="ml-auto mr-3 text-[10px] font-semibold text-slate-400">3 parâmetros</span></AccordionTrigger><AccordionContent><div className="grid grid-cols-1 gap-2 pb-1 sm:grid-cols-3">{ficha.parametros.filter((item) => item.grupo === 'Fechamento e extração').map((item) => <div key={item.label} className="rounded border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-semibold text-slate-500">{item.label}</div><div className="mt-1 text-sm font-extrabold text-slate-800">{item.valor}</div></div>)}</div></AccordionContent></AccordionItem></Accordion></article>}

            {activeView !== 'parametros' && <article className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3"><div><h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-700">Histórico recente de ajustes</h3><p className="mt-1 text-[11px] text-slate-400">Exemplo visual de auditoria · registros fictícios</p></div><ClipboardList className="h-4 w-4 text-blue-700" /></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] border-collapse text-left text-xs"><thead className="bg-[#123B50] text-[10px] uppercase tracking-wide text-white"><tr>{['Data / hora','Responsável','Parâmetro','Alteração','Status'].map((label) => <th key={label} className="px-3 py-2.5 font-bold">{label}</th>)}</tr></thead><tbody>{[{ data: '20/10/2026 14:20', pessoa: 'Operador teste', parametro: 'Resfriamento', alteracao: '18,0 → 16,0 s' }, { data: '12/10/2026 09:05', pessoa: 'Engenharia teste', parametro: 'Pressão de recalque', alteracao: '70 → 65 MPa' }, { data: '02/10/2026 16:40', pessoa: 'Qualidade teste', parametro: 'Zona 3', alteracao: '220 → 215 °C' }].map((row) => <tr key={row.data} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/50"><td className="whitespace-nowrap px-3 py-3 text-slate-500">{row.data}</td><td className="px-3 py-3 font-semibold text-slate-700">{row.pessoa}</td><td className="px-3 py-3 text-slate-600">{row.parametro}</td><td className="px-3 py-3 font-bold tabular-nums text-slate-800">{row.alteracao}</td><td className="px-3 py-3"><span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"><BadgeCheck className="h-3 w-3" /> Aprovado (demo)</span></td></tr>)}</tbody></table></div></article>}
            <div className="text-right text-[10px] text-slate-400">Protótipo PCP · Revisão 01 · Tela isolada para aprovação visual · não substitui a ficha aprovada</div>
          </section>
        </div>
      </div>
      <style>{'@media print { header button, header a, aside, main > div > div:first-child { display: none !important; } main { background: white !important; } }'}</style>
    </main>
  )
}
