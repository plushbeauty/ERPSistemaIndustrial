import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, FileSpreadsheet, ListChecks, RefreshCw, Wrench, X, AlertTriangle, ClipboardCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
type SourceRow = { ordem?: string; equipamento: string; tag: string; frequencia: string; meses: string[] }
type Machine = { id: string; codigo: string; nome: string; status?: string | null; tipo?: string | null }
type Company = { razao_social: string | null; nome_fantasia: string | null }
const CHECKLIST = [
  { group: 'Segurança e condição geral', items: ['Confirmar bloqueio e etiquetagem da máquina antes de intervir, conforme procedimento interno.', 'Inspecionar proteções, intertravamentos, botões de emergência e sinalização sem desativar dispositivos.', 'Verificar limpeza, fixações aparentes, ruídos, vibração, aquecimento e vazamentos anormais.'] },
  { group: 'Inspeção mecânica', items: ['Verificar folgas, desgaste, correias, acoplamentos, guias e elementos de fixação acessíveis.', 'Conferir pontos de lubrificação e níveis conforme manual do fabricante.', 'Registrar peças desgastadas ou anomalias para avaliação do responsável técnico.'] },
  { group: 'Inspeção elétrica e funcional', items: ['Verificar cabos, conectores e painel externamente; intervenções elétricas somente por profissional autorizado.', 'Executar teste funcional controlado após liberar a área e reinstalar as proteções.', 'Registrar medições, anomalias, peças utilizadas, responsável e evidências da execução.'] },
]

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
  { id: 'master', title: 'Cronograma Master 2026', subtitle: 'Cronograma Master de manutenção preventiva 2026 (documento de origem)', rows: masterRows, legend: [{code:'R',label:'Realizado'},{code:'A',label:'Agendado'},{code:'AT',label:'Atrasado'}] },
] as const

function statusClass(code: string) {
  if (code === 'PE' || code === 'R') return 'border-emerald-300 bg-emerald-100 text-emerald-900'
  if (code === 'P' || code === 'A') return 'border-amber-300 bg-amber-100 text-amber-900'
  if (code === 'AT') return 'border-rose-300 bg-rose-100 text-rose-900'
  if (code === 'M') return 'border-amber-300 bg-amber-50 text-amber-800'
  if (code === 'D') return 'border-slate-300 bg-slate-100 text-slate-600'
  return ''
}
function rowClass(row: SourceRow) {
  if (row.meses.includes('AT')) return 'bg-rose-50/70 hover:bg-rose-100'
  if (row.meses.includes('A') || row.meses.includes('P')) return 'bg-amber-50/50 hover:bg-amber-100'
  if (row.meses.includes('R') || row.meses.includes('PE')) return 'bg-emerald-50/40 hover:bg-emerald-100'
  return 'bg-white hover:bg-[#F4FBFD]'
}
function normalize(value: string) { return value.trim().toLocaleUpperCase('pt-BR').replace(/[^A-Z0-9]/g, '') }

export default function ManutencaoPlanoMestre() {
  const [sourceId, setSourceId] = useState<'frp' | 'master'>('frp')
  const [search, setSearch] = useState('')
  const [machines, setMachines] = useState<Machine[]>([])
  const [companyName, setCompanyName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [selectedRow, setSelectedRow] = useState<SourceRow | null>(null)
  const [checkedItems, setCheckedItems] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const source = sourceOptions.find(item => item.id === sourceId) ?? sourceOptions[0]

  const load = async () => {
    setBusy(true)
    setError('')
    try {
      const current = await supabase.rpc('erp_current_empresa_id')
      if (current.error || !current.data) throw current.error ?? new Error('Empresa da sessão não identificada.')
      const companyId = String(current.data)
      const [companyResult, machineRows] = await Promise.all([
        supabase.from('erp_empresas').select('razao_social,nome_fantasia').eq('id', companyId).maybeSingle(),
        fetchAllPages<Machine>((from, to) => supabase.from('erp_maquinas').select('id,codigo,nome,status,tipo', { count: 'exact' }).eq('empresa_id', companyId).order('codigo').range(from, to)),
      ])
      if (companyResult.error) throw companyResult.error
      setCompanyName(String((companyResult.data as Company | null)?.nome_fantasia || (companyResult.data as Company | null)?.razao_social || ''))
      setMachines(machineRows)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar empresa e cadastro de máquinas.')
      setMachines([])
      setCompanyName('')
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => { void load() }, [])

  const rows = useMemo(() => source.rows.filter(row => [row.equipamento, row.tag, row.frequencia, row.ordem ?? ''].join(' ').toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))), [source, search])
  const counts = useMemo(() => {
    const all = source.rows.flatMap(row => row.meses).filter(Boolean)
    return { machines: source.rows.length, planned: all.filter(code => code === 'P' || code === 'A').length, completed: all.filter(code => code === 'PE' || code === 'R').length, overdue: all.filter(code => code === 'AT').length, maintenance: all.filter(code => code === 'M').length }
  }, [source])
  const machineFor = (row: SourceRow) => machines.find(machine => normalize(machine.codigo) === normalize(row.tag)) ?? null
  const openDetails = (row: SourceRow) => { setSelectedRow(row); setCheckedItems([]); setNotes('') }

  return (
    <main className="min-h-screen bg-[#F4FBFD] text-[#123B50]">
      <header className="border-b border-[#D8E8EE] bg-white">
        <div className="mx-auto flex max-w-[1700px] flex-wrap items-center gap-3 px-5 py-3">
          <Link to="/manutencao" aria-label="Voltar à central de manutenção" className="flex h-[30px] items-center gap-2 rounded-[2px] border border-slate-300 px-3 text-[10px] font-semibold"><ArrowLeft size={13}/> CENTRAL</Link>
          <span className="flex h-8 w-8 items-center justify-center rounded-[2px] bg-[#E7F4F8] text-[#2D8DB8]"><FileSpreadsheet size={18}/></span>
          <div><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#2D8DB8]">MANUTENÇÃO / DOCUMENTOS-FONTE</p><h1 className="text-[15px] font-semibold">Plano mestre preventivo — 2026</h1><p className="text-[10px] text-slate-500">{companyName ? 'Empresa: ' + companyName : 'Empresa: carregando cadastro…'}</p></div>
          <div className="ml-auto flex gap-2"><Link to="/manutencao/cronograma" className="flex h-[30px] items-center rounded-[2px] border border-[#B8D5E0] px-3 text-[10px] font-semibold">CRONOGRAMA DO ERP</Link><Link to="/manutencao/ordens" className="flex h-[30px] items-center rounded-[2px] bg-[#2D8DB8] px-3 text-[10px] font-bold text-white">ORDENS DE SERVIÇO</Link><button type="button" onClick={() => void load()} disabled={busy} aria-label="Atualizar cadastro da empresa e máquinas" className="flex h-[30px] items-center gap-1 rounded-[2px] border border-slate-300 px-2 text-[10px] disabled:opacity-50"><RefreshCw size={12} className={busy ? 'animate-spin' : ''}/> ATUALIZAR</button></div>
        </div>
      </header>
      <div className="mx-auto max-w-[1700px] space-y-3 px-5 py-4">
        {error && <div role="alert" className="border border-rose-300 bg-rose-50 px-3 py-2 text-[10px] text-rose-900">{error}</div>}
        <div role="note" className="border border-[#B8D5E0] bg-white px-3 py-2 text-[10px] leading-4 text-[#17445A]"><strong>Documento de referência:</strong> os códigos e as periodicidades abaixo vêm das planilhas-fonte. O nome da empresa exibido no cabeçalho vem do cadastro da empresa autenticada. A grade só se vincula a uma máquina operacional quando a tag da planilha coincide com o código cadastrado na empresa; não cria máquinas nem ordens automaticamente.</div>
        <section className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          <Kpi label="Equipamentos na planilha" value={counts.machines}/>
          <Kpi label="Programado / agendado" value={counts.planned}/>
          <Kpi label="Realizado" value={counts.completed}/>
          <Kpi label="Em atraso" value={counts.overdue} alert={counts.overdue > 0}/>
        </section>
        <section className="border border-[#D8E8EE] bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#D8E8EE] p-3">
            <div className="mr-2"><h2 className="text-[12px] font-semibold">Origem do cronograma</h2><p className="text-[10px] text-slate-500">Selecione a planilha; códigos e legendas permanecem separados.</p></div>
            {sourceOptions.map(option => <button key={option.id} type="button" onClick={() => { setSourceId(option.id); setSearch('') }} aria-pressed={sourceId === option.id} className={'min-h-[30px] rounded-[2px] border px-3 py-1 text-[10px] font-semibold ' + (sourceId === option.id ? 'border-[#2D8DB8] bg-[#E7F4F8] text-[#17445A]' : 'border-slate-300 bg-white text-slate-600')}>{option.title}</button>)}
            <label className="ml-auto flex h-[30px] min-w-[200px] items-center gap-2 border border-slate-300 px-2"><ListChecks size={13} className="text-[#2D8DB8]"/><input aria-label="Pesquisar equipamento" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar equipamento ou tag…" className="w-full bg-transparent text-[10px] outline-none"/></label>
          </div>
          <div className="border-b border-[#D8E8EE] bg-[#F8FCFD] px-3 py-2"><p className="text-[10px] font-semibold text-[#17445A]">{source.title}</p><p className="break-words text-[9px] text-slate-500">{source.subtitle}</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[1120px] border-collapse text-left"><thead className="bg-[#EAF4F7] text-[9px] uppercase tracking-wide text-[#17445A]"><tr><th className="px-2 py-2">Nº</th><th className="px-2 py-2">Máquina (cadastro)</th><th className="px-2 py-2">Tag / ID fonte</th><th className="px-2 py-2">Frequência</th>{MONTHS.map(month => <th key={month} className="min-w-[48px] px-2 py-2 text-center">{month}</th>)}</tr></thead><tbody className="text-[10px]">{rows.map((row, index) => { const machine = machineFor(row); return <tr key={row.tag} className={'border-t border-slate-200 ' + rowClass(row)}><td className="px-2 py-2 text-slate-500">{row.ordem ?? index + 1}</td><td className="px-2 py-1"><button type="button" onClick={() => openDetails(row)} className="flex min-h-[28px] items-center gap-1 text-left font-semibold underline decoration-dotted underline-offset-2 hover:text-[#2D8DB8]"><Wrench size={12}/>{machine ? machine.nome : row.equipamento}</button><span className={'block text-[9px] ' + (machine ? 'text-emerald-800' : 'text-rose-700')}>{machine ? 'Vinculada ao cadastro' : 'Tag não localizada no cadastro desta empresa'}</span></td><td className="px-2 py-2 font-semibold text-[#17445A]">{row.tag}</td><td className="px-2 py-2">{row.frequencia}</td>{row.meses.map((code, monthIndex) => <td key={MONTHS[monthIndex]} className="border-x border-white/70 px-1 py-1 text-center">{code ? <span title={code === 'R' ? 'Realizado' : code === 'A' ? 'Agendado' : code === 'AT' ? 'Atrasado' : code === 'PE' ? 'Programado e executado' : code === 'P' ? 'Programado' : code === 'M' ? 'Em manutenção' : 'Desativado'} className={'inline-flex min-h-[25px] min-w-[32px] items-center justify-center border px-1 py-0.5 text-[9px] font-bold ' + statusClass(code)}>{code}</span> : <span className="text-slate-300">—</span>}</td>)}</tr>})}{rows.length === 0 && <tr><td colSpan={16} className="px-3 py-8 text-center text-slate-500">Nenhum equipamento corresponde à pesquisa.</td></tr>}</tbody></table></div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-[#D8E8EE] px-3 py-3">{source.legend.map(item => <span key={item.code} className="inline-flex items-center gap-1.5 text-[9px] text-slate-600"><span className={'inline-flex min-w-[25px] justify-center border px-1 py-0.5 font-bold ' + statusClass(item.code)}>{item.code}</span>{item.label}</span>)}</div>
        </section>
        <p className="text-[9px] text-slate-500">As atividades detalhadas no clique são um roteiro geral de referência, não uma ordem gravada nem substituto do manual do fabricante. A execução real deve respeitar o procedimento técnico aprovado pela empresa.</p>
      </div>
      {selectedRow && <div className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3" onClick={() => setSelectedRow(null)}><section role="dialog" aria-modal="true" aria-labelledby="machine-plan-title" className="my-auto max-h-[92vh] w-full max-w-4xl overflow-y-auto border border-[#D8E8EE] bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-start gap-3 border-b border-[#D8E8EE] bg-white p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#E7F4F8] text-[#2D8DB8]"><Wrench size={18}/></span><div className="min-w-0 flex-1"><p className="text-[9px] font-semibold uppercase tracking-wider text-[#2D8DB8]">PLANO PREVENTIVO / DETALHE DO EQUIPAMENTO</p><h2 id="machine-plan-title" className="text-[14px] font-semibold">{machineFor(selectedRow)?.codigo ?? selectedRow.tag} · {machineFor(selectedRow)?.nome ?? selectedRow.equipamento}</h2><p className="text-[10px] text-slate-500">{companyName || 'Empresa da sessão'} · Frequência documental: {selectedRow.frequencia}</p></div><button type="button" aria-label="Fechar detalhe da máquina" onClick={() => setSelectedRow(null)} className="flex h-[30px] w-[30px] items-center justify-center border border-slate-300"><X size={15}/></button></header>
        <div className="space-y-4 p-4">
          {!machineFor(selectedRow) && <div role="alert" className="flex gap-2 border border-rose-300 bg-rose-50 p-3 text-[10px] text-rose-900"><AlertTriangle size={15} className="shrink-0"/><div><strong>Máquina ainda não vinculada.</strong><p>A tag {selectedRow.tag} não foi encontrada no cadastro de máquinas da empresa atual. Confira o cadastro antes de transformar esta linha documental em manutenção operacional.</p></div></div>}
          <section className="grid gap-2 sm:grid-cols-3"><Kpi label="Tag da planilha" value={selectedRow.tag}/><Kpi label="Frequência fonte" value={selectedRow.frequencia}/><Kpi label="Status no documento" value={selectedRow.meses.includes('AT') ? 'AT · Atrasado' : selectedRow.meses.includes('A') ? 'A · Agendado' : selectedRow.meses.includes('R') || selectedRow.meses.includes('PE') ? 'R/PE · Realizado' : 'Ver grade mensal'}/></section>
          <section className="border border-[#D8E8EE]"><div className="flex items-center gap-2 border-b border-[#D8E8EE] bg-[#F8FCFD] p-3"><ClipboardCheck size={15}/><h3 className="text-[11px] font-semibold">Roteiro orientativo de inspeção preventiva</h3></div><div className="space-y-3 p-3">{CHECKLIST.map(group => <div key={group.group}><h4 className="mb-1 text-[10px] font-semibold text-[#17445A]">{group.group}</h4><div className="space-y-1.5">{group.items.map(item => <label key={item} className="flex items-start gap-2 text-[10px] leading-4 text-slate-700"><input type="checkbox" checked={checkedItems.includes(item)} onChange={event => setCheckedItems(current => event.target.checked ? [...current, item] : current.filter(value => value !== item))} className="mt-0.5 accent-emerald-700"/><span>{item}</span></label>)}</div></div>)}</div></section>
          <label className="block text-[9px] font-semibold uppercase text-slate-600">Observações desta consulta (não gravadas no banco)<textarea value={notes} onChange={event => setNotes(event.target.value)} rows={3} className="mt-1 w-full border border-slate-300 p-2 text-[10px] font-normal normal-case outline-none focus:border-[#2D8DB8]" placeholder="Anote pontos para conferência técnica; este rascunho é temporário."/></label>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#D8E8EE] pt-3"><p className="max-w-xl text-[9px] leading-4 text-slate-500">Checklist apenas local: marcar itens ou escrever observações não cria registros. Para gravar uma intervenção, use o fluxo oficial de Ordem de Serviço.</p><div className="flex gap-2"><button type="button" onClick={() => { setCheckedItems([]); setNotes('') }} className="h-[30px] border border-slate-300 px-3 text-[10px]">LIMPAR RASCUNHO</button>{machineFor(selectedRow) ? <Link to="/manutencao/ordens" className="flex h-[30px] items-center gap-1 bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white"><Wrench size={12}/> ORDENS DE SERVIÇO</Link> : <span aria-disabled="true" className="flex h-[30px] items-center gap-1 bg-slate-200 px-3 text-[10px] font-semibold text-slate-500"><Wrench size={12}/> CADASTRE/VINCULE A MÁQUINA</span>}</div></div>
        </div>
      </section></div>}
    </main>
  )
}

function Kpi({ label, value, alert = false }: { label: string; value: number | string; alert?: boolean }) {
  return <article className={'border bg-white px-4 py-3 ' + (alert ? 'border-rose-300' : 'border-[#D8E8EE]')}><span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-500">{label}</span><strong className={'mt-1 block text-[18px] font-semibold tabular-nums ' + (alert ? 'text-rose-700' : 'text-[#17445A]')}>{value}</strong></article>
}
