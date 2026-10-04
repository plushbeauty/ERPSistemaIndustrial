import { useEffect, useRef, useState } from 'react'
import { DownloadCloud, Key, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import LinkFieldCombobox, { type LinkOption } from '../../components/ui/LinkFieldCombobox'

type Account = { id: string; codigo: string; nome: string; banco: string }
type Log = { id: string; nome_arquivo: string; url_arquivo: string; status_processamento: string; numero_transacoes: number; saldo_fechamento: number; criado_em: string }

const allowed = ['.csv', '.xlsx', '.pdf']

export default function BankStatementImporter() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [logs, setLogs] = useState<Log[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    const accountsResult = await supabase.from('erp_contas_bancarias').select('id,codigo,nome,banco').eq('ativo', true).order('nome')
    if (!accountsResult.error) {
      const data = (accountsResult.data || []) as Account[]
      setAccounts(data)
      if (!accountId && data[0]) setAccountId(data[0].id)
    }
    const logsResult = await supabase.from('erp_importacoes_log').select('id,nome_arquivo,url_arquivo,status_processamento,numero_transacoes,saldo_fechamento,criado_em').order('criado_em', { ascending: false }).limit(20)
    if (logsResult.error) setError(logsResult.error.message)
    else setLogs((logsResult.data || []) as Log[])
  }

  useEffect(() => { void load() }, [])

  const options: LinkOption[] = accounts.map((account) => ({
    value: account.id,
    label: account.codigo + ' · ' + account.nome,
    description: account.banco,
  }))

  const choose = (next: File | null) => {
    if (!next) return
    const extension = next.name.slice(next.name.lastIndexOf('.')).toLowerCase()
    if (!allowed.includes(extension)) { setError('Arquivo não suportado.'); return }
    setFile(next)
    setError('')
  }

  const upload = async () => {
    if (!file || !accountId) { setError('Selecione o banco e o arquivo.'); return }
    setBusy(true)
    setError('')
    setMessage('')
    const company = await supabase.rpc('erp_current_empresa_id')
    if (company.error || !company.data) { setError(company.error?.message || 'Empresa da sessão não identificada.'); setBusy(false); return }

    const path = company.data + '/' + crypto.randomUUID() + '-' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const stored = await supabase.storage.from('banking-extratos').upload(path, file, { upsert: false })
    if (stored.error) { setError(stored.error.message); setBusy(false); return }

    const log = await supabase.from('erp_importacoes_log').insert({
      empresa_id: company.data,
      nome_arquivo: file.name,
      url_arquivo: path,
      status_processamento: 'Processando',
    }).select('id').single()
    if (log.error) { setError(log.error.message); setBusy(false); return }

    if (file.name.toLowerCase().endsWith('.csv')) {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter(Boolean)
      const count = Math.max(0, lines.length - 1)
      await supabase.from('erp_importacoes_log').update({ status_processamento: 'Completed', numero_transacoes: count }).eq('id', log.data.id)
    }

    setMessage('Arquivo recebido e histórico atualizado.')
    setFile(null)
    setPassword('')
    await load()
    setBusy(false)
  }

  return <div className="erp-global-density min-h-screen bg-slate-50 p-2 text-gray-800">
    <div className="mb-2 flex h-7 items-center gap-1 text-[10px] text-gray-500"><DownloadCloud size={14} /><span>Finanças</span><span>›</span><strong className="text-gray-700">Importador de Extratos</strong></div>
    <div className="grid min-h-[calc(100vh-52px)] grid-cols-[52%_48%] bg-white">
      <section className="border border-gray-200 p-3">
        <div className="mb-2 text-[13px] font-semibold">Importar extrato</div>
        <label className="mb-0.5 block text-[10px] text-gray-500">Banco</label>
        <LinkFieldCombobox value={accountId} options={options} onChange={setAccountId} placeholder="Banco/Conta" />
        <div className="my-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-600">CSV, XLSX ou PDF. O banco selecionado identifica a conta de destino.</div>
        <input ref={fileRef} className="hidden" type="file" accept=".csv,.xlsx,.pdf" onChange={(event) => choose(event.target.files?.[0] || null)} />
        <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); choose(event.dataTransfer.files?.[0] || null) }} onClick={() => fileRef.current?.click()} className="flex min-h-[180px] cursor-pointer items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-[11px] text-slate-500">Arraste o arquivo aqui ou clique para selecionar</div>
        {file && <div className="mt-2 rounded-md border bg-slate-50 px-2 py-1 text-[11px]">{file.name}</div>}
        <div className="mt-2 flex items-center gap-1"><Key size={12} className="text-gray-500" /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha PDF" className="h-7 w-[140px] rounded-md border border-gray-200 px-2 text-[11px]" /></div>
        {error && <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700">{error}</div>}
        {message && <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">{message}</div>}
        <div className="mt-2 flex justify-end"><button type="button" disabled={busy} onClick={() => void upload()} className="flex h-7 items-center gap-1 rounded-md bg-emerald-600 px-4 text-[11px] font-semibold text-white"><Upload size={12} />Upload</button></div>
      </section>
      <section className="border-s border-gray-200 p-3">
        <div className="mb-2 text-[13px] font-semibold">Últimas 20 importações</div>
        <div className="overflow-auto"><table className="w-full border-collapse text-[10px]"><thead><tr className="h-7 bg-slate-700 text-white"><th className="px-2 text-left font-normal">Importado em</th><th className="px-2 text-left font-normal">Status</th><th className="px-2 text-left font-normal">Datas</th><th className="px-2 text-right font-normal">Nº Transações</th><th className="px-2 text-right font-normal">Saldo</th><th className="px-2 text-left font-normal">Arquivo</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="h-7 border-t border-gray-100 even:bg-slate-50"><td className="px-2">{new Date(log.criado_em).toLocaleString('pt-BR')}</td><td className="px-2"><span className={log.status_processamento === 'Completed' ? 'rounded-md bg-emerald-100 px-1.5 py-0.5 text-emerald-700' : 'rounded-md bg-gray-100 px-1.5 py-0.5 text-gray-600'}>{log.status_processamento}</span></td><td className="px-2">—</td><td className="px-2 text-right">{log.numero_transacoes}</td><td className="px-2 text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(log.saldo_fechamento)}</td><td className="px-2"><button type="button" className="text-blue-700 underline" onClick={async () => { const signed = await supabase.storage.from('banking-extratos').createSignedUrl(log.url_arquivo, 300); if (!signed.error) window.open(signed.data.signedUrl, '_blank', 'noopener,noreferrer') }}>{log.nome_arquivo}</button></td></tr>)}{!logs.length && <tr><td colSpan={6} className="h-14 text-center text-gray-400">Nenhuma importação.</td></tr>}</tbody></table></div>
      </section>
    </div>
  </div>
}
