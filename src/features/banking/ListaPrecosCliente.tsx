/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-10
 * @REVISAO: REV-VENDAS-TABELA-PRECO-CLIENTE-20261110-01
 * @STATUS_APROVACAO: REVISAO AUTORIZADA PELO PROPRIETARIO EM 2026-11-10
 * @ESCOPO: Central de preços especiais por cliente, consumida pelo cálculo do Novo Pedido.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, FileSpreadsheet, Info, RefreshCw, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Row = {
  id: string
  cliente_id: string
  produto_id: string
  cnpj_cliente: string
  sku_produto: string
  preco_especial: number
  validade_tabela: string
}
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const dateLabel = (value: string) => new Date(value + 'T12:00:00').toLocaleDateString('pt-BR')

export default function ListaPrecosCliente() {
  const [rows, setRows] = useState<Row[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!auth.user) throw new Error('Sua sessão expirou. Entre novamente.')
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      if (typeof tenant.data !== 'string' || !tenant.data) throw new Error('Não foi possível identificar a empresa da sessão.')
      setEmpresaId(tenant.data)
      const result = await supabase.from('erp_tabela_precos_cliente')
        .select('id,cliente_id,produto_id,cnpj_cliente,sku_produto,preco_especial,validade_tabela')
        .eq('empresa_id', tenant.data)
        .order('validade_tabela', { ascending: true })
        .limit(1000)
      if (result.error) throw result.error
      setRows((result.data || []) as Row[])
    } catch (cause) {
      setRows([])
      setError(cause instanceof Error ? cause.message : 'Falha ao consultar a tabela de preços.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const today = new Date().toISOString().slice(0, 10)
  const activeRows = useMemo(() => rows.filter(row => row.validade_tabela >= today), [rows, today])
  const expiredRows = rows.length - activeRows.length

  const choose = (next: File | null) => {
    if (!next) return
    if (!/\.(xlsx|xls)$/i.test(next.name)) { setError('Selecione uma planilha Excel (.xlsx ou .xls).'); return }
    setFile(next)
    setError('')
    setMessage('')
  }

  const importFile = async () => {
    if (!file || !empresaId) { setError('Selecione uma planilha e aguarde a validação da empresa.'); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const body = new FormData()
      body.append('file', file)
      const result = await supabase.functions.invoke('importar-lista-precos-cliente', { body })
      if (result.error) throw result.error
      const validated = result.data?.validated as Array<{
        empresa_id: string; cliente_id: string; produto_id: string; cnpj_cliente: string;
        sku_produto: string; preco_especial: number; validade_tabela: string
      }> | undefined
      if (!validated?.length) throw new Error('A planilha não contém registros válidos.')
      if (validated.some(row => row.empresa_id !== empresaId)) throw new Error('A planilha retornou registros de outra empresa. Importação bloqueada.')
      const saved = await supabase.from('erp_tabela_precos_cliente')
        .upsert(validated, { onConflict: 'empresa_id,cliente_id,produto_id' })
      if (saved.error) throw saved.error
      setMessage(`${validated.length} preço(s) importado(s)/atualizado(s). O Novo Pedido já pode consultar os preços especiais vigentes.`)
      setFile(null)
      if (ref.current) ref.current.value = ''
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao importar a planilha.')
    } finally { setBusy(false) }
  }

  return <main className="erp-page-v3 w-full space-y-3 p-3 text-[#173B4A]">
    <header className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-[#D3E3EA] border-l-4 border-l-[#2D8DB8] bg-white p-3 shadow-sm">
      <div>
        <div className="flex items-center gap-2 text-[9px] font-extrabold tracking-widest text-[#2D8DB8]"><FileSpreadsheet size={14}/> VENDAS · POLÍTICA COMERCIAL</div>
        <h1 className="mt-1 text-lg font-extrabold text-[#123B50]">Lista de Preços por Cliente</h1>
        <p className="mt-1 text-[11px] text-[#657F8C]">Preços especiais por cliente e produto, aplicados na formação do pedido de venda.</p>
      </div>
      <button type="button" onClick={() => void load()} disabled={loading || busy} className="inline-flex h-[30px] items-center gap-2 rounded border border-[#CBDCE3] bg-white px-3 text-[10px] font-bold text-[#315466] disabled:opacity-50"><RefreshCw size={13} className={loading ? 'animate-spin' : ''}/> ATUALIZAR</button>
    </header>

    <section className="grid gap-2 rounded-md border border-[#BFDCE7] bg-[#F0F8FB] p-3 md:grid-cols-[auto_1fr]">
      <Info size={19} className="text-[#2D8DB8]"/>
      <div>
        <h2 className="text-[12px] font-extrabold text-[#123B50]">Para que serve esta lista?</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-[#365767]">Ela guarda o preço negociado de cada produto para cada cliente. Quando Vendas seleciona o cliente e o produto em <b>Novo Pedido</b>, o sistema consulta a tabela vigente e usa o preço especial como preço unitário sugerido. Se não houver preço especial válido, permanece o cálculo comercial padrão do produto.</p>
        <p className="mt-1 text-[10px] font-semibold text-[#28734F]">Importar aqui alimenta automaticamente a consulta de preços do Novo Pedido. A validade é respeitada; preços vencidos não são aplicados.</p>
      </div>
    </section>

    <section className="grid gap-2 sm:grid-cols-3">
      <article className="rounded-md border border-[#B9DFCE] border-t-[3px] border-t-[#3A9D78] bg-[#F4FBF7] p-3"><span className="text-[9px] font-extrabold uppercase text-[#547968]">Preços vigentes</span><strong className="mt-1 block text-xl font-extrabold text-[#28734F]">{loading ? '—' : activeRows.length}</strong><small className="text-[9px] text-[#718895]">Disponíveis para pedidos novos</small></article>
      <article className="rounded-md border border-[#D3E3EA] border-t-[3px] border-t-[#2D8DB8] bg-white p-3"><span className="text-[9px] font-extrabold uppercase text-[#607987]">Registros cadastrados</span><strong className="mt-1 block text-xl font-extrabold text-[#123B50]">{loading ? '—' : rows.length}</strong><small className="text-[9px] text-[#718895]">Preços especiais da empresa</small></article>
      <article className="rounded-md border border-[#F0D9B4] border-t-[3px] border-t-[#E6A34A] bg-[#FFFBF4] p-3"><span className="text-[9px] font-extrabold uppercase text-[#8A682F]">Preços vencidos</span><strong className="mt-1 block text-xl font-extrabold text-[#99621D]">{loading ? '—' : expiredRows}</strong><small className="text-[9px] text-[#8A7654]">Não entram em pedidos novos</small></article>
    </section>

    <section className="rounded-md border border-[#D3E3EA] bg-white p-3 shadow-sm">
      <div className="mb-2 border-b border-[#E5EEF2] pb-2"><h2 className="text-[13px] font-extrabold text-[#123B50]">Importar tabela comercial</h2><p className="mt-1 text-[10px] text-[#718895]">Envie a planilha com os preços negociados. Registros do mesmo cliente/produto são atualizados, não duplicados.</p></div>
      <input ref={ref} className="hidden" type="file" accept=".xlsx,.xls" onChange={event => choose(event.target.files?.[0] || null)}/>
      <button type="button" onClick={() => ref.current?.click()} onDragOver={event => event.preventDefault()} onDrop={event => {event.preventDefault();choose(event.dataTransfer.files?.[0] || null)}} className="flex min-h-[92px] w-full flex-col items-center justify-center gap-2 rounded border border-dashed border-[#9DBBC8] bg-[#F8FCFE] px-3 text-center text-[11px] text-[#456170] hover:border-[#2D8DB8] hover:bg-[#F0F8FB]">
        <Upload size={18} className="text-[#2D8DB8]"/><b>{file ? file.name : 'Clique para selecionar ou arraste a planilha Excel aqui'}</b><span className="text-[9px] text-[#718895]">.xlsx ou .xls · Colunas: cnpj_cliente, sku_produto, preco_especial, validade_tabela</span>
      </button>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[9px] text-[#718895]">A validação confere cliente, produto, empresa e data de vigência.</span>
        <button type="button" disabled={!file || busy || loading || !empresaId} onClick={() => void importFile()} className="inline-flex h-[30px] items-center gap-2 rounded bg-[#2D8DB8] px-3 text-[10px] font-extrabold text-white hover:bg-[#236F92] disabled:cursor-not-allowed disabled:opacity-45"><Upload size={13}/>{busy ? 'IMPORTANDO…' : 'IMPORTAR PREÇOS'}</button>
      </div>
    </section>

    {error && <div role="alert" className="flex gap-2 rounded border border-[#F0CACA] bg-[#FFF3F3] p-2 text-[10px] text-[#9F3030]"><AlertCircle size={15}/><span>{error}</span></div>}
    {message && <div role="status" className="flex gap-2 rounded border border-[#B9DFCE] bg-[#EFFAF4] p-2 text-[10px] text-[#236B4B]"><CheckCircle2 size={15}/><span>{message}</span></div>}

    <section className="rounded-md border border-[#D3E3EA] bg-white p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-[#E5EEF2] pb-2"><div><h2 className="text-[13px] font-extrabold text-[#123B50]">Preços cadastrados por cliente</h2><p className="mt-1 text-[10px] text-[#718895]">Cada linha representa o preço de um produto para um cliente específico.</p></div><span className="rounded border border-[#D3E3EA] bg-[#F4FBFD] px-2 py-1 text-[9px] font-bold text-[#456170]">{loading ? 'Consultando…' : `${rows.length} registro(s)`}</span></div>
      <div className="overflow-auto rounded border border-[#D3E3EA]">
        <table className="w-full min-w-[720px] border-collapse text-[10px]">
          <thead><tr className="h-8 bg-[#EDF6F9] text-left text-[8px] font-extrabold uppercase tracking-wide text-[#456170]"><th className="px-2">CNPJ cliente</th><th className="px-2">Código / SKU</th><th className="px-2 text-right">Preço especial</th><th className="px-2">Validade</th><th className="px-2">Situação</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan={5} className="h-16 text-center text-[#718895]">Carregando dados da empresa…</td></tr> : error && !rows.length ? <tr><td colSpan={5} className="h-16 text-center text-[#B74349]">Não foi possível consultar os preços.</td></tr> : rows.map(row => {const active = row.validade_tabela >= today;return <tr key={row.id} className="h-8 border-t border-[#EAF0F3] even:bg-[#FAFCFD] hover:bg-[#F0F8FB]"><td className="px-2 font-semibold text-[#294957]">{row.cnpj_cliente}</td><td className="px-2">{row.sku_produto}</td><td className="px-2 text-right font-bold tabular-nums">{money(Number(row.preco_especial))}</td><td className="px-2">{dateLabel(row.validade_tabela)}</td><td className="px-2"><span className={active ? 'rounded border border-[#B9DFCE] bg-[#EFFAF4] px-2 py-1 text-[8px] font-extrabold text-[#26734F]' : 'rounded border border-[#F0D9B4] bg-[#FFF8EB] px-2 py-1 text-[8px] font-extrabold text-[#99621D]'}>{active ? 'VIGENTE' : 'VENCIDO'}</span></td></tr>})}
          {!loading && !error && rows.length === 0 && <tr><td colSpan={5} className="h-16 text-center text-[#718895]">Nenhum preço especial cadastrado. Importe a primeira tabela para disponibilizar preços negociados em Novo Pedido.</td></tr>}</tbody>
        </table>
      </div>
    </section>
  </main>
}
