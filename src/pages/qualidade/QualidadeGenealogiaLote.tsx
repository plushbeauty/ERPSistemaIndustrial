import { useCallback, useState, type ReactElement } from 'react'
import { Printer, RefreshCw, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Lot = { id: string; lote_interno: string; lote_fornecedor: string | null; produto_id: string; quantidade_disponivel: number; status_inspecao: string | null }
type Product = { id: string; codigo: string; nome: string }
type Order = { id: string; numero_op: string | null; numero: string | null; produto_id: string; pedido_venda_id: string | null; maquina_id: string | null }
type Operator = { nome: string | null }
type Machine = { codigo: string; nome: string }
type Customer = { nome: string }
type ComponentRow = { id: string; quantidade_consumida: number; lote_insumo_id: string; lote: string; produto: string; fornecedor: string }

export default function QualidadeGenealogiaLote(): ReactElement {
  const [lotePesquisa, setLotePesquisa] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [lot, setLot] = useState<Lot | null>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [operator, setOperator] = useState<Operator | null>(null)
  const [machine, setMachine] = useState<Machine | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [components, setComponents] = useState<ComponentRow[]>([])
  const [loadingState, setLoadingState] = useState<'idle' | 'loading' | 'success' | 'empty' | 'error'>('idle')

  const executarRastreabilidade = useCallback(async () => {
    const codigo = lotePesquisa.trim()
    if (!codigo) return
    setBusy(true)
    setLoadingState('loading')
    setError('')
    setSearched(true)
    setLot(null)
    setProduct(null)
    setOrder(null)
    setOperator(null)
    setMachine(null)
    setCustomer(null)
    setComponents([])

    try {
      const { data: empresaId, error: empresaError } = await supabase.rpc('erp_current_empresa_id')
      if (empresaError) throw empresaError
      if (!empresaId) throw new Error('Empresa do usuário não identificada.')

      const { data: lotData, error: lotError } = await supabase
        .from('erp_estoque_lotes')
        .select('id,lote_interno,lote_fornecedor,produto_id,quantidade_disponivel,status_inspecao')
        .eq('empresa_id', empresaId)
        .or(`lote_interno.eq.${codigo},lote_fornecedor.eq.${codigo}`)
        .maybeSingle()
      if (lotError) throw lotError
      if (!lotData) throw new Error('Lote não encontrado na empresa atual.')
      setLot(lotData as Lot)

      const { data: productData, error: productError } = await supabase
        .from('erp_produtos')
        .select('id,codigo,nome')
        .eq('id', lotData.produto_id)
        .eq('empresa_id', empresaId)
        .maybeSingle()
      if (productError) throw productError
      setProduct(productData as Product | null)

      const { data: genealogy, error: genealogyError } = await supabase
        .from('erp_genealogia_lote_componentes')
        .select('id,quantidade_consumida,lote_insumo_id')
        .eq('empresa_id', empresaId)
        .eq('lote_acabado_id', lotData.id)
      if (genealogyError) throw genealogyError

      const rows: ComponentRow[] = []
      for (const item of genealogy ?? []) {
        const { data: inputLot, error: inputError } = await supabase
          .from('erp_estoque_lotes_rastreabilidade')
          .select('lote_fornecedor,produto_id')
          .eq('id', item.lote_insumo_id)
          .eq('empresa_id', empresaId)
          .maybeSingle()
        if (inputError) throw inputError
        if (!inputLot) continue
        const { data: inputProduct, error: inputProductError } = await supabase
          .from('erp_produtos')
          .select('nome')
          .eq('id', inputLot.produto_id)
          .eq('empresa_id', empresaId)
          .maybeSingle()
        if (inputProductError) throw inputProductError
        const { data: supplier, error: supplierError } = await supabase
          .from('erp_fornecedores')
          .select('razao_social')
          .eq('empresa_id', empresaId)
          .eq('documento', inputLot.lote_fornecedor)
          .maybeSingle()
        if (supplierError && supplierError.code !== 'PGRST116') throw supplierError
        rows.push({
          id: item.id,
          quantidade_consumida: Number(item.quantidade_consumida),
          lote_insumo_id: item.lote_insumo_id,
          lote: inputLot.lote_fornecedor,
          produto: inputProduct?.nome ?? 'Produto não identificado',
          fornecedor: supplier?.razao_social ?? 'Fornecedor não vinculado'
        })
      }
      setComponents(rows)
      setLoadingState(rows.length || lotData ? 'success' : 'empty')

      const { data: production, error: productionError } = await supabase
        .from('erp_apontamentos_processo')
        .select('ordem_producao_id,operador_id,maquina_id')
        .eq('empresa_id', empresaId)
        .eq('lote', lotData.lote_interno)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (productionError) throw productionError

      if (production?.ordem_producao_id) {
        const { data: opData, error: opError } = await supabase
          .from('erp_ordens_producao')
          .select('id,numero_op,numero,produto_id,pedido_venda_id,maquina_id')
          .eq('id', production.ordem_producao_id)
          .eq('empresa_id', empresaId)
          .maybeSingle()
        if (opError) throw opError
        setOrder(opData as Order | null)
      }

      if (production?.operador_id) {
        const { data: operatorData, error: operatorError } = await supabase
          .from('erp_usuarios')
          .select('nome')
          .eq('id', production.operador_id)
          .eq('empresa_id', empresaId)
          .maybeSingle()
        if (operatorError) throw operatorError
        setOperator(operatorData)
      }

      const machineId = production?.maquina_id ?? null
      if (machineId) {
        const { data: machineData, error: machineError } = await supabase
          .from('erp_maquinas')
          .select('codigo,nome')
          .eq('id', machineId)
          .eq('empresa_id', empresaId)
          .maybeSingle()
        if (machineError) throw machineError
        setMachine(machineData)
      }

      if (production?.ordem_producao_id) {
        const { data: opData } = await supabase
          .from('erp_ordens_producao')
          .select('pedido_venda_id')
          .eq('id', production.ordem_producao_id)
          .eq('empresa_id', empresaId)
          .maybeSingle()
        if (opData?.pedido_venda_id) {
          const { data: sale } = await supabase
            .from('erp_pedidos_venda')
            .select('cliente_id')
            .eq('id', opData.pedido_venda_id)
            .eq('empresa_id', empresaId)
            .maybeSingle()
          if (sale?.cliente_id) {
            const { data: client } = await supabase
              .from('erp_clientes')
              .select('nome')
              .eq('id', sale.cliente_id)
              .eq('empresa_id', empresaId)
              .maybeSingle()
            setCustomer(client)
          }
        }
      }
    } catch (err) {
      setLoadingState('error')
      setError(err instanceof Error ? err.message : 'Falha na rastreabilidade.')
    } finally {
      setBusy(false)
    }
  }, [lotePesquisa])

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6 text-slate-900">
      <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between print:hidden">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-sky-700" />
            <div><p className="text-xs font-black uppercase tracking-widest text-slate-500">Qualidade</p><h1 className="text-xl font-black">Genealogia e Rastreabilidade de Lote 360°</h1></div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => window.print()} className="inline-flex h-[54px] items-center gap-2 rounded-lg bg-slate-900 px-4 font-bold text-white"><Printer size={17} /> Emitir laudo</button>
          </div>
        </header>
        <div className="space-y-6 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-black uppercase tracking-wide text-slate-600">Lote pesquisado
              <div className="mt-1 flex">
                <input value={lotePesquisa} onChange={(e) => setLotePesquisa(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void executarRastreabilidade() }} placeholder="Digite ou bipe o lote" className="h-[54px] w-full rounded-l-lg border border-slate-300 px-4 text-base font-bold" />
                <button type="button" disabled={busy} onClick={() => void executarRastreabilidade()} className="h-[54px] rounded-r-lg bg-slate-900 px-5 text-white disabled:opacity-50"><RefreshCw className={busy ? 'animate-spin' : ''} size={18} /></button>
              </div>
            </label>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><span className="text-xs font-black uppercase text-slate-500">Produto</span><div className="font-bold">{product ? `${product.codigo} — ${product.nome}` : '—'}</div></div>
          </div>
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 font-bold text-rose-900">{error}</div>}
          {searched && !busy && !error && lot && (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border p-4"><span className="text-xs font-black uppercase text-slate-500">Lote</span><div className="font-black">{lot.lote_interno}</div></div>
                <div className="rounded-lg border p-4"><Cpu className="mb-1 text-sky-700" size={20} /><span className="text-xs font-black uppercase text-slate-500">OP / Máquina</span><div className="font-bold">{order?.numero_op ?? order?.numero ?? 'OP não vinculada'} / {machine ? `${machine.codigo} — ${machine.nome}` : 'máquina não vinculada'}</div></div>
                <div className="rounded-lg border p-4"><User className="mb-1 text-sky-700" size={20} /><span className="text-xs font-black uppercase text-slate-500">Operador</span><div className="font-bold">{operator?.nome ?? 'Operador não vinculado'}</div></div>
                <div className="rounded-lg border p-4"><PackageSearch className="mb-1 text-sky-700" size={20} /><span className="text-xs font-black uppercase text-slate-500">Cliente final</span><div className="font-bold">{customer?.nome ?? 'Cliente não vinculado'}</div></div>
              </div>
              <div>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-black uppercase"><Layers size={17} /> Insumos efetivamente vinculados à genealogia</h2>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-left"><thead><tr className="h-[54px] bg-slate-100 text-xs font-black uppercase"><th className="p-3">Componente</th><th className="p-3">Lote fornecedor</th><th className="p-3">Fornecedor</th><th className="p-3">Qtd. consumida</th></tr></thead>
                  <tbody>{components.map((row) => <tr key={row.id} className="h-[54px] border-t"><td className="p-3 font-bold">{row.produto}</td><td className="p-3 font-black text-sky-700">{row.lote}</td><td className="p-3">{row.fornecedor}</td><td className="p-3">{row.quantidade_consumida}</td></tr>)}{components.length===0 && <tr className="h-[54px]"><td colSpan={4} className="p-3 text-center text-slate-500">Nenhum vínculo de genealogia registrado para este lote. Nenhum dado fictício foi incluído.</td></tr>}</tbody></table>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
