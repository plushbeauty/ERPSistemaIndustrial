import { useEffect, useRef, useState } from 'react'
import { FileSpreadsheet, HelpCircle, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Row = { id: string; cnpj_cliente: string; sku_produto: string; preco_especial: number; validade_tabela: string }

export default function ListaPrecosCliente() {
  const [rows, setRows] = useState<Row[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  const load = async () => {
    const result = await supabase.from('erp_tabela_precos_cliente').select('id,cnpj_cliente,sku_produto,preco_especial,validade_tabela').order('validade_tabela', { ascending: true }).limit(1000)
    if (result.error) setError(result.error.message)
    else setRows((result.data || []) as Row[])
  }

  useEffect(() => { void load() }, [])

  const choose = (next: File | null) => {
    if (!next) return
    if (!/\.(xlsx|xls)$/i.test(next.name)) { setError('Selecione uma planilha Excel.'); return }
    setFile(next)
    setError('')
  }

  const importFile = async () => {
    if (!file) { setError('Selecione a planilha.'); return }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const body = new FormData()
      body.append('file', file)
      const result = await supabase.functions.invoke('importar-lista-precos-cliente', { body })
      if (result.error) throw result.error
      const validated = result.data?.validated as Array<{ empresa_id: string; cliente_id: string; produto_id: string; cnpj_cliente: string; sku_produto: string; preco_especial: number; validade_tabela: string }> | undefined
      if (!validated?.length) throw new Error('A planilha não contém registros válidos.')
      const inserted = await supabase.from('erp_tabela_precos_cliente').insert(validated)
      if (inserted.error) throw inserted.error
      setMessage(validated.length + ' registro(s) importado(s).')
      setFile(null)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao importar planilha.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="erp-global-density min-h-screen bg-slate-50 p-2 text-gray-800">
    <div className="mb-2 flex h-7 items-center gap-1 text-[10px] text-gray-500"><FileSpreadsheet size={14} /><span>Finanças</span><span>›</span><strong className="text-gray-700">Lista de Preços por Cliente</strong><span title="Colunas obrigatórias: cnpj_cliente, sku_produto, preco_especial, validade_tabela"><HelpCircle size={12} className="ml-1 cursor-help text-gray-400" /></span></div>
    <div className="grid min-h-[calc(100vh-52px)] grid-cols-[52%_48%] bg-white">
      <section className="border border-gray-200 p-3">
        <div className="mb-2 text-[13px] font-semibold">Importar tabela Excel</div>
        <input ref={ref} className="hidden" type="file" accept=".xlsx,.xls" onChange={(event) => choose(event.target.files?.[0] || null)} />
        <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); choose(event.dataTransfer.files?.[0] || null) }} onClick={() => ref.current?.click()} className="flex min-h-[180px] cursor-pointer items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-[11px] text-slate-500">Arraste a planilha aqui ou clique para selecionar</div>
        {file && <div className="mt-2 rounded-md border bg-slate-50 px-2 py-1 text-[11px]">{file.name}</div>}
        <div className="mt-2 rounded-md bg-slate-50 px-2 py-1 text-[10px] text-slate-600">Colunas exatas: cnpj_cliente · sku_produto · preco_especial · validade_tabela</div>
        {error && <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700">{error}</div>}
        {message && <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">{message}</div>}
        <div className="mt-2 flex justify-end"><button type="button" disabled={busy} onClick={() => void importFile()} className="flex h-7 items-center gap-1 rounded-md bg-emerald-600 px-4 text-[11px] font-semibold text-white"><Upload size={12} />Upload</button></div>
      </section>
      <section className="border-s border-gray-200 p-3">
        <div className="mb-2 text-[13px] font-semibold">Tabelas cadastradas</div>
        <div className="overflow-auto"><table className="w-full border-collapse text-[10px]"><thead><tr className="h-7 bg-slate-700 text-white"><th className="px-2 text-left font-normal">CNPJ Cliente</th><th className="px-2 text-left font-normal">SKU</th><th className="px-2 text-right font-normal">Preço</th><th className="px-2 text-left font-normal">Validade</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="h-7 border-t border-gray-100 even:bg-slate-50"><td className="px-2">{row.cnpj_cliente}</td><td className="px-2">{row.sku_produto}</td><td className="px-2 text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.preco_especial)}</td><td className="px-2">{row.validade_tabela}</td></tr>)}{!rows.length && <tr><td colSpan={4} className="h-14 text-center text-gray-400">Nenhum preço especial.</td></tr>}</tbody></table></div>
      </section>
    </div>
  </div>
}
