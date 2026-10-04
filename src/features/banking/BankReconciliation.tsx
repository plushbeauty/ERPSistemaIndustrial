import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle, Download, Home, Landmark, List, ScrollText, Shuffle } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useIsMobile } from '../../hooks/useIsMobile'
import LinkFieldCombobox, { type LinkOption } from '../../components/ui/LinkFieldCombobox'

type Account = { id: string; codigo: string; nome: string; banco: string; saldo_inicial: number; ativo: boolean }
type Transaction = {
  id: string
  data_movimento: string
  data_valor: string | null
  descricao: string
  referencia: string | null
  tipo: 'CREDITO' | 'DEBITO'
  valor: number
  saldo: number | null
  status: 'PENDENTE' | 'CONCILIADO' | 'IGNORADO'
  conta_bancaria_id: string
}
type Tab = 'match' | 'statement' | 'transactions' | 'clearance' | 'incorrect'

const tabs: Array<[Tab, string, typeof Shuffle]> = [
  ['match', 'Match and Reconcile', Shuffle],
  ['statement', 'Reconciliation Statement', ScrollText],
  ['transactions', 'Transactions', List],
  ['clearance', 'Clearance Summary', CheckCircle],
  ['incorrect', 'Incorrectly Cleared', AlertTriangle],
]

const brl = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const today = () => new Date().toISOString().slice(0, 10)
const xml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

function crc32(data: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of data) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function u32(value: number) {
  return new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255])
}

function u16(value: number) {
  return new Uint8Array([value & 255, (value >>> 8) & 255])
}

function concat(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const output = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.length
  }
  return output
}

function makeXlsx(rows: string[][]) {
  const files: Array<[string, string]> = [
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Conciliação" sheetId="1" r:id="rId1"/></sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
    ['xl/worksheets/sheet1.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
      rows.map((row, rowIndex) => '<row r="' + (rowIndex + 1) + '">' + row.map((cell, cellIndex) => '<c r="' + String.fromCharCode(65 + Math.min(cellIndex, 25)) + (rowIndex + 1) + '" t="inlineStr"><is><t>' + xml(cell) + '</t></is></c>').join('') + '</row>').join('') +
      '</sheetData></worksheet>'],
  ]
  const encoder = new TextEncoder()
  const local: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const [name, content] of files) {
    const nameBytes = encoder.encode(name)
    const data = encoder.encode(content)
    const header = concat([new Uint8Array([80, 75, 3, 4]), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc32(data)), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), nameBytes])
    local.push(header, data)
    const directory = concat([new Uint8Array([80, 75, 1, 2]), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc32(data)), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameBytes])
    central.push(directory)
    offset += header.length + data.length
  }
  const centralBytes = concat(central)
  const end = concat([new Uint8Array([80, 75, 5, 6]), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralBytes.length), u32(offset), u16(0)])
  return new Blob([concat([...local, centralBytes, end])], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export default function BankReconciliation() {
  const navigate = useNavigate()
  const mobile = useIsMobile()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState('')
  const [date, setDate] = useState(today())
  const [status, setStatus] = useState('PENDENTE')
  const [tab, setTab] = useState<Tab>('match')
  const [rows, setRows] = useState<Transaction[]>([])
  const [selected, setSelected] = useState<Transaction | null>(null)
  const [reference, setReference] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saldoContabil, setSaldoContabil] = useState(0)

  const load = async () => {
    setError('')
    const accountResult = await supabase.from('erp_contas_bancarias').select('id,codigo,nome,banco,saldo_inicial,ativo').eq('ativo', true).order('nome')
    if (accountResult.error) { setError(accountResult.error.message); return }
    const list = (accountResult.data || []) as Account[]
    setAccounts(list)
    const selectedAccount = accountId || list[0]?.id || ''
    if (!accountId && selectedAccount) setAccountId(selectedAccount)
    let query = supabase.from('erp_transacoes_bancarias').select('id,data_movimento,data_valor,descricao,referencia,tipo,valor,saldo,status,conta_bancaria_id').order('data_movimento', { ascending: false }).limit(500)
    if (selectedAccount) query = query.eq('conta_bancaria_id', selectedAccount)
    if (date) query = query.lte('data_movimento', date)
    if (status !== 'TODOS') query = query.eq('status', status)
    const transactionResult = await query
    if (transactionResult.error) setError(transactionResult.error.message)
    else setRows((transactionResult.data || []) as Transaction[])
  }

  useEffect(() => { void load() }, [accountId, date, status])

  useEffect(() => { void (async () => { if (!accountId) { setSaldoContabil(0); return }; const r = await supabase.from('erp_fiscal_razao_lancamentos').select('debito,credito').eq('conta_bancaria_id', accountId); if (!r.error) { const opening = Number(accounts.find((account) => account.id === accountId)?.saldo_inicial ?? 0); setSaldoContabil(opening + (r.data ?? []).reduce((sum, row) => sum + Number(row.credito ?? 0) - Number(row.debito ?? 0), 0)) } })() }, [accountId])

  const options: LinkOption[] = useMemo(() => accounts.map((account) => ({
    value: account.id,
    label: account.codigo + ' · ' + account.nome,
    description: account.banco,
  })), [accounts])

  const credits = rows.filter((row) => row.tipo === 'CREDITO').reduce((sum, row) => sum + row.valor, 0)
  const debits = rows.filter((row) => row.tipo === 'DEBITO').reduce((sum, row) => sum + row.valor, 0)
  const net = credits - debits

  const reconcile = async () => {
    if (!selected) return
    setError('')
    const company = await supabase.rpc('erp_current_empresa_id')
    if (company.error || !company.data) { setError(company.error?.message || 'Empresa da sessão não identificada.'); return }
    const auth = await supabase.auth.getUser()
    const insert = await supabase.from('erp_conciliacoes_bancarias').insert({
      empresa_id: company.data,
      transacao_bancaria_id: selected.id,
      documento_tipo: 'REFERENCIA',
      referencia_interna: reference.trim() || selected.referencia || selected.descricao,
      valor_conciliado: selected.valor,
      conciliado_por: auth.data.user?.id || null,
    })
    if (insert.error) { setError(insert.error.message); return }
    const update = await supabase.from('erp_transacoes_bancarias').update({ status: 'CONCILIADO' }).eq('id', selected.id)
    if (update.error) { setError(update.error.message); return }
    setMessage('Transação conciliada.')
    setSelected(null)
    setReference('')
    await load()
  }

  const exportXlsx = () => {
    const data = [
      ['Data', 'Descrição', 'Referência', 'Tipo', 'Valor', 'Saldo', 'Status'],
      ...rows.map((row) => [row.data_movimento, row.descricao, row.referencia || '', row.tipo, row.valor.toFixed(2), String(row.saldo ?? ''), row.status]),
    ]
    const blob = makeXlsx(data)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'conciliacao-bancaria.xlsx'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (mobile) return <div className="erp-global-density flex min-h-screen items-center justify-center bg-slate-50 p-4"><div className="rounded-md border border-gray-200 bg-white px-5 py-4 text-center"><Landmark size={24} className="mx-auto mb-2 text-slate-500" /><div className="text-[13px] font-semibold text-slate-800">Esta tela não é suportada em dispositivos móveis. Use o Desktop.</div></div></div>

  return <div className="erp-global-density min-h-screen bg-slate-50 text-gray-800">
    <div className="flex h-7 items-center gap-2 border-b border-gray-200 bg-white px-2 text-[10px] text-gray-500"><button type="button" onClick={() => navigate(-1)} className="flex h-7 items-center gap-1 rounded-md border border-gray-200 bg-white px-2 text-[10px] font-bold text-gray-600">← Voltar</button><Home size={12} /><span>Finanças</span><span>›</span><span className="font-medium text-gray-700">Conciliação Bancária</span></div>
    <div className="flex h-7 items-center gap-2 border-b border-gray-200 bg-white px-2">
      <label className="text-[10px] text-gray-500">Empresa</label><select className="h-7 w-40 rounded-md border border-gray-200 text-[11px]" disabled><option>Empresa atual</option></select>
      <label className="ml-1 text-[10px] text-gray-500">Data Limite</label><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-7 w-[110px] rounded-md border border-gray-200 px-1 text-[11px]" />
      <label className="ml-1 text-[10px] text-gray-500">Banco/Diário</label><div className="w-40"><LinkFieldCombobox value={accountId} options={options} onChange={setAccountId} placeholder="Banco" /></div>
      <label className="ml-1 text-[10px] text-gray-500">Status Lançamentos</label><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-7 w-[140px] rounded-md border border-gray-200 px-1 text-[11px]"><option>TODOS</option><option>PENDENTE</option><option>CONCILIADO</option><option>IGNORADO</option></select>
      <button type="button" onClick={exportXlsx} className="ml-auto flex h-7 w-[110px] items-center justify-center gap-1 rounded-md bg-[#ffcc00] text-[11px] font-semibold text-black"><Download size={12} />EXPORTAR XLSX</button>
    </div>
    <div className="flex h-7 items-center justify-between border border-gray-200 bg-slate-100 px-3 text-[11px] font-bold rounded-sm mb-2"><span>Conta Bancária Ativa: {accounts.find((account) => account.id === accountId)?.nome || "—"}</span><span className="rounded bg-green-100 px-2 py-0.5 font-black text-green-800">Saldo Contábil do Razão: {brl(saldoContabil)}</span></div>\n    <div className="scroll-fade-x flex h-7 overflow-x-auto border-b border-gray-200 bg-white px-2">{tabs.map(([key, label, Icon]) => <button key={key} type="button" onClick={() => setTab(key)} className={'flex h-7 shrink-0 items-center gap-1 rounded-md px-3 text-[11px] ' + (tab === key ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-600')}><Icon size={12} className={key === 'incorrect' ? 'text-red-500' : ''} />{label}</button>)}</div>
    <div className="p-2">
      {error && <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700">{error}</div>}
      {message && <div className="mb-2 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">{message}</div>}
      {tab === 'match' && <section className="rounded-md border border-gray-200 bg-white"><div className="flex h-7 items-center justify-between border-b border-gray-200 px-2 text-[11px]"><span className="font-semibold">Transações para conciliação</span><span className="text-gray-500">{rows.length} registros · líquido {brl(net)}</span></div><div className="max-h-[calc(100vh-125px)] overflow-auto"><table className="w-full border-collapse text-[10px]"><thead><tr className="h-7 bg-slate-700 text-white"><th className="px-2 text-left font-normal">Data</th><th className="px-2 text-left font-normal">Descrição</th><th className="px-2 text-left font-normal">Referência</th><th className="px-2 text-right font-normal">Valor</th><th className="px-2 text-left font-normal">Status</th><th className="w-20 px-2" /></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="h-7 border-t border-gray-100 even:bg-slate-50"><td className="px-2">{row.data_movimento}</td><td className="max-w-[420px] truncate px-2">{row.descricao}</td><td className="px-2">{row.referencia || '—'}</td><td className="px-2 text-right">{brl(row.tipo === 'DEBITO' ? -row.valor : row.valor)}</td><td className="px-2">{row.status}</td><td className="px-2 text-right">{row.status === 'PENDENTE' && <button type="button" className="h-7 rounded-md border border-emerald-600 px-2 text-[10px] text-emerald-700" onClick={() => setSelected(row)}>Conciliar</button>}</td></tr>)}</tbody></table>{!rows.length && <div className="p-5 text-center text-[11px] text-gray-400">Nenhuma transação para os filtros.</div>}</div></section>}
      {tab === 'statement' && <section className="grid grid-cols-3 gap-2 rounded-md border border-gray-200 bg-white p-2 text-[11px]"><div className="rounded-md border p-2"><span className="block text-[10px] text-gray-500">Créditos</span><strong>{brl(credits)}</strong></div><div className="rounded-md border p-2"><span className="block text-[10px] text-gray-500">Débitos</span><strong>{brl(debits)}</strong></div><div className="rounded-md border p-2"><span className="block text-[10px] text-gray-500">Saldo do período</span><strong>{brl(net)}</strong></div></section>}
      {tab === 'transactions' && <section className="rounded-md border border-gray-200 bg-white p-2 text-[11px]">Transações carregadas: <strong>{rows.length}</strong>.</section>}
      {tab === 'clearance' && <section className="rounded-md border border-gray-200 bg-white p-2 text-[11px]">Conciliadas: <strong>{rows.filter((row) => row.status === 'CONCILIADO').length}</strong> · pendentes: <strong>{rows.filter((row) => row.status === 'PENDENTE').length}</strong>.</section>}
      {tab === 'incorrect' && <section className="rounded-md border border-gray-200 bg-white p-2 text-[11px]">Divergências/ignoradas: <strong>{rows.filter((row) => row.status === 'IGNORADO').length}</strong>.</section>}
    </div>
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4"><div className="w-[420px] rounded-md border border-gray-200 bg-white p-3 shadow-xl"><div className="mb-2 text-[12px] font-semibold">Conciliar transação</div><div className="mb-2 text-[11px] text-gray-600">{selected.data_movimento} · {selected.descricao} · {brl(selected.valor)}</div><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Referência interna" className="h-7 w-full rounded-md border border-gray-200 px-2 text-[11px]" /><div className="mt-2 flex justify-end gap-1"><button type="button" className="h-7 rounded-md border px-3 text-[11px]" onClick={() => setSelected(null)}>Cancelar</button><button type="button" className="h-7 rounded-md bg-emerald-600 px-3 text-[11px] text-white" onClick={() => void reconcile()}>Conciliar</button></div></div></div>}
  </div>
}
