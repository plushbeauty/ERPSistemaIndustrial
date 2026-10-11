import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CalendarDays, FileSpreadsheet, ListChecks } from 'lucide-react'

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
type SourceRow = { ordem?: string; equipamento: string; tag: string; frequencia: string; meses: string[] }

const frpRows: SourceRow[] = [
  { ordem: '1', equipamento: 'Prensa Hidráulica', tag: 'PR-01', frequencia: 'Trimestral', meses: ['PE','','','PE','','','PE','','','PE','',''] },
  { ordem: '2', equipamento: 'Prensa Excêntrica', tag: 'EX-01', frequencia: 'Trimestral', meses: ['','PE','','','PE','','','PE','','','PE',''] },
  { ordem: '3', equipamento: 'Prensa Excêntrica', tag: 'EX-02', frequencia: 'Trimestral', meses: ['','','PE','','','PE','','','PE','','','PE'] },
  { ordem: '4', equipamento: 'Injetora', tag: 'IJ-01', frequencia: 'Mensal', meses: ['PE','PE','PE','PE','PE','AT','P','P','P','P','P','P'] },
  { ordem: '5', equipamento: 'Injetora', tag: 'IJ-02', frequencia: 'Mensal', meses: ['PE','PE','PE','PE','M','PE','P','P','P','P','P','P'] },
  { ordem: '6', equipamento: 'Injetora', tag: 'IJ-03', frequencia: 'Mensal', meses: ['PE','PE','PE','PE','PE','PE','P','P','P','P','P','P'] },
  { ordem: '7', equipamento: 'Máquina de Corte de Cabo', tag: 'CC-01', frequencia: 'Anual', meses: ['','','','','','PE','','','','','',''] },
  { ordem: '9', equipamento: 'Máquina de Riscar Cabo', tag: 'RC-01', frequencia: 'Anual', meses: ['','','','','','','','PE','','','',''] },
  { ordem: '10', equipamento: 'Moinho', tag: 'MO-01', frequencia: 'Semestral', meses: ['PE','','','','','','P','','','','',''] },
  { ordem: '11', equipamento: 'Furadeira de Bancada', tag: 'FB-01', frequencia: 'Anual', meses: ['','','','','','','','','','PE','',''] },
  { ordem: '12', equipamento: 'Estufa', tag: 'ES-01', frequencia: 'Semestral', meses: ['','PE','','','','','','P','','','',''] },
  { ordem: '13', equipamento: 'Geladeira', tag: 'GE-01', frequencia: 'Anual', meses: ['','','','','','','','','','','PE',''] },
  { ordem: '14', equipamento: 'Compressor de Ar', tag: 'CP-01', frequencia: 'Trimestral', meses: ['PE','','','PE','','','P','','','P','',''] },
]
const masterRows: SourceRow[] = [
  { equipamento: 'Prensa Hidráulica', tag: 'PR-01', frequencia: 'Trimestral', meses: ['R','','','R','','','A','','','A','',''] },
  { equipamento: 'Injetora de Plástico', tag: 'INJ-01', frequencia: 'Mensal', meses: ['R','R','R','R','R','AT','A','A','A','A','A','A'] },
  { equipamento: 'Compressor de Ar Loft', tag: 'CP-01', frequencia: 'Semestral', meses: ['','','R','','','','','','A','','',''] },
  { equipamento: 'Torre de Resfriamento', tag: 'TR-01', frequencia: 'Trimestral', meses: ['','R','','','R','','','A','','','A',''] },
  { equipamento: 'Chiller Industrial', tag: 'CH-01', frequencia: 'Mensal', meses: ['R','R','R','R','AT','A','A','A','A','A','A','A'] },
  { equipamento: 'Prensa Auxiliar', tag: 'PR-02', frequencia: 'Trimestral', meses: ['','','R','','','R','','','A','','','A'] },
]

const sourceOptions = [
  { id: 'frp', title: 'FRP-MP-001', subtitle: 'FRP-FER-001-PLASTIBOR - Cronograma de manutenção preventiva máquinas.xlsx', rows: frpRows, legend: [{code:'P',label:'Programado'},{code:'PE',label:'Programado e executado'},{code:'AT',label:'Em atraso'},{code:'M',label:'Em manutenção'},{code:'D',label:'Desativado'}] },
  { id: 'master', title: 'Cronograma Master 2026', subtitle: 'PLASTIBOR LTDA - Cronograma Master de manutenção preventiva 2026.xlsm', rows: masterRows, legend: [{code:'R',label:'Realizado'},{code:'A',label:'Agendado'},{code:'AT',label:'Atrasado'}] },
] as const

function statusClass(code: string) {
  if (code === 'PE' || code === 'R') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (code === 'P' || code === 'A') return 'border-sky-200 bg-sky-50 text-sky-800'
  if (code === 'AT') return 'border-rose-200 bg-rose-50 text-rose-800'
  if (code === 'M') return 'border-amber-200 bg-amber-50 text-amber-800'
  if (code === 'D') return 'border-slate-300 bg-slate-100 text-slate-600'
  return ''
}

export default function ManutencaoPlanoMestre() {
  const [sourceId, setSourceId] = useState<'frp' | 'master'>('frp')
  const [search, setSearch] = useState('')
  const source = sourceOptions.find(item => item.id === sourceId) ?? sourceOptions[0]
  const rows = useMemo(() => source.rows.filter(row => [row.equipamento, row.tag, row.frequencia, row.ordem ?? ''].join(' ').toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))), [source, search])
  const counts = useMemo(() => {
    const all = source.rows.flatMap(row => row.meses).filter(Boolean)
    return { machines: source.rows.length, planned: all.filter(code => code === 'P' || code === 'A').length, completed: all.filter(code => code === 'PE' || code === 'R').length, overdue: all.filter(code => code === 'AT').length, maintenance: all.filter(code => code === 'M').length }
  }, [source])

  return (
    <main className="min-h-screen bg-[#F4FBFD] text-[#123B50]">
      <header className="border-b border-[#D8E8EE] bg-white">
        <div className="mx-auto flex max-w-[1700px] flex-wrap items-center gap-3 px-5 py-3">
          <Link to="/manutencao" aria-label="Voltar à central de manutenção" className="flex h-[30px] items-center gap-2 rounded-[2px] border border-slate-300 px-3 text-[10px] font-semibold"><ArrowLeft size={13}/> CENTRAL</Link>
          <span className="flex h-8 w-8 items-center justify-center rounded-[2px] bg-[#E7F4F8] text-[#2D8DB8]"><FileSpreadsheet size={18}/></span>
          <div><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#2D8DB8]">MANUTENÇÃO / DOCUMENTOS-FONTE</p><h1 className="text-[15px] font-semibold">Plano mestre preventivo — 2026</h1></div>
          <div className="ml-auto flex gap-2"><Link to="/manutencao/cronograma" className="flex h-[30px] items-center rounded-[2px] border border-[#B8D5E0] px-3 text-[10px] font-semibold">CRONOGRAMA DO ERP</Link><Link to="/manutencao/ordens" className="flex h-[30px] items-center rounded-[2px] bg-[#2D8DB8] px-3 text-[10px] font-bold text-white">ORDENS DE SERVIÇO</Link></div>
        </div>
      </header>
      <div className="mx-auto max-w-[1700px] space-y-3 px-5 py-4">
        <div role="note" className="border border-[#B8D5E0] bg-white px-3 py-2 text-[10px] leading-4 text-[#17445A]"><strong>Referência documental:</strong> os dados abaixo foram transcritos das duas planilhas originais. Permanecem separados dos cadastros operacionais do Supabase até que sejam vinculados às máquinas da empresa correta. Nenhuma máquina ou ordem foi criada por esta página.</div>
        <section className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          <Kpi label="Equipamentos na planilha" value={counts.machines}/>
          <Kpi label="Programado / agendado" value={counts.planned}/>
          <Kpi label="Realizado" value={counts.completed}/>
          <Kpi label="Em atraso" value={counts.overdue} alert={counts.overdue > 0}/>
        </section>
        <section className="border border-[#D8E8EE] bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#D8E8EE] p-3">
            <div className="mr-2"><h2 className="text-[12px] font-semibold">Origem do cronograma</h2><p className="text-[10px] text-slate-500">Escolha qual planilha consultar; as tags e legendas não são mescladas.</p></div>
            {sourceOptions.map(option => <button key={option.id} type="button" onClick={() => { setSourceId(option.id); setSearch('') }} aria-pressed={sourceId === option.id} className={'min-h-[30px] rounded-[2px] border px-3 py-1 text-[10px] font-semibold ' + (sourceId === option.id ? 'border-[#2D8DB8] bg-[#E7F4F8] text-[#17445A]' : 'border-slate-300 bg-white text-slate-600')}>{option.title}</button>)}
            <label className="ml-auto flex h-[30px] min-w-[200px] items-center gap-2 border border-slate-300 px-2"><ListChecks size={13} className="text-[#2D8DB8]"/><input aria-label="Pesquisar equipamento" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar equipamento ou tag…" className="w-full bg-transparent text-[10px] outline-none"/></label>
          </div>
          <div className="border-b border-[#D8E8EE] bg-[#F8FCFD] px-3 py-2"><p className="text-[10px] font-semibold text-[#17445A]">{source.title}</p><p className="break-words text-[9px] text-slate-500">{source.subtitle}</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left"><thead className="bg-[#EAF4F7] text-[9px] uppercase tracking-wide text-[#17445A]"><tr><th className="px-2 py-2">Nº</th><th className="px-2 py-2">Equipamento / máquina</th><th className="px-2 py-2">Tag / ID</th><th className="px-2 py-2">Frequência</th>{MONTHS.map(month => <th key={month} className="min-w-[48px] px-2 py-2 text-center">{month}</th>)}</tr></thead><tbody className="text-[10px]">{rows.map((row, index) => <tr key={row.tag} className="border-t border-slate-100 hover:bg-[#F4FBFD]"><td className="px-2 py-2 text-slate-500">{row.ordem ?? index + 1}</td><td className="px-2 py-2 font-medium">{row.equipamento}</td><td className="px-2 py-2 font-semibold text-[#17445A]">{row.tag}</td><td className="px-2 py-2">{row.frequencia}</td>{row.meses.map((code, monthIndex) => <td key={MONTHS[monthIndex]} className="px-1 py-2 text-center">{code ? <span className={'inline-flex min-w-[28px] justify-center border px-1 py-0.5 text-[9px] font-bold ' + statusClass(code)}>{code}</span> : <span className="text-slate-300">—</span>}</td>)}</tr>)}{rows.length === 0 && <tr><td colSpan={16} className="px-3 py-8 text-center text-slate-500">Nenhum equipamento corresponde à pesquisa.</td></tr>}</tbody></table></div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-[#D8E8EE] px-3 py-3">{source.legend.map(item => <span key={item.code} className="inline-flex items-center gap-1.5 text-[9px] text-slate-600"><span className={'inline-flex min-w-[25px] justify-center border px-1 py-0.5 font-bold ' + statusClass(item.code)}>{item.code}</span>{item.label}</span>)}</div>
        </section>
        <p className="text-[9px] text-slate-500">Documento de origem: FRP-MP-001 (revisão 00, data 05/05/2026) e Cronograma Master PLASTIBOR 2026. O vínculo definitivo exige conferir o cadastro de ativos da empresa que utilizará estes dados.</p>
      </div>
    </main>
  )
}

function Kpi({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return <article className={'border bg-white px-4 py-3 ' + (alert ? 'border-rose-300' : 'border-[#D8E8EE]')}><span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-500">{label}</span><strong className={'mt-1 block text-[22px] font-semibold tabular-nums ' + (alert ? 'text-rose-700' : 'text-[#17445A]')}>{value}</strong></article>
}
