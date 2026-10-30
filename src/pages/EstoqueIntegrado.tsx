import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Activity, AlertTriangle, ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine,
  Ban, Boxes, CheckCircle2, Edit3, History, Package, Plus, RefreshCw,
  Search, Save, Warehouse, X,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Product = {
  id: string
  codigo: string
  nome: string
  descricao_resumida: string | null
  unidade: string | null
  estoque_atual: number | null
  ponto_reposicao: number | null
  estoque_maximo: number | null
  custo_medio: number | null
  ativo: boolean
}
type WarehouseRecord = { id: string; codigo: string; nome: string; ativo: boolean }
type StockLocation = Record<string, unknown> & { id: string }
type Movement = Record<string, unknown> & { id: string; produto_id: string; tipo: string; quantidade: number }
type Tab = 'materiais' | 'locais' | 'movimentos' | 'saldos'
type Notice = { kind: 'success' | 'error' | 'info'; text: string }

const inputClass = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
const labelClass = 'mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500'
const buttonBase = 'inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50'

async function fetchAll<T>(queryFactory: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const result: T[] = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const response = await queryFactory(from, from + pageSize - 1)
    if (response.error) throw new Error(response.error.message)
    const page = response.data ?? []
    result.push(...page)
    if (page.length < pageSize) return result
  }
}

function asText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}
function formatNumber(value: unknown): string {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number.toLocaleString('pt-BR', { maximumFractionDigits: 3 }) : '0'
}
function formatMoney(value: unknown): string {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'
}
function locationLabel(location: StockLocation): string {
  return asText(location.nome) || asText(location.codigo) || location.id
}

export default function EstoqueIntegrado() {
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([])
  const [locations, setLocations] = useState<StockLocation[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [tab, setTab] = useState<Tab>('materiais')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [productModal, setProductModal] = useState(false)
  const [warehouseModal, setWarehouseModal] = useState(false)
  const [movementModal, setMovementModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseRecord | null>(null)
  const [productForm, setProductForm] = useState({ codigo: '', nome: '', descricao_resumida: '', unidade: 'UN', ponto_reposicao: '0', estoque_maximo: '0' })
  const [warehouseForm, setWarehouseForm] = useState({ codigo: '', nome: '', ativo: true })
  const [movementForm, setMovementForm] = useState({
    produto_id: '', tipo: 'entrada', quantidade: '', origem: 'manual', documento: '', observacao: '',
    localizacao_origem_id: '', localizacao_destino_id: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setNotice(null)
    try {
      const { data: company, error: companyError } = await supabase.rpc('erp_current_empresa_id')
      if (companyError) throw companyError
      if (!company) throw new Error('Empresa da sessão não identificada. Entre em uma empresa para acessar o Estoque.')
      const tenantId = String(company)
      setEmpresaId(tenantId)

      const [productRows, warehouseRows, locationRows, movementRows] = await Promise.all([
        fetchAll<Product>((from, to) => supabase.from('erp_produtos')
          .select('id,codigo,nome,descricao_resumida,unidade,estoque_atual,ponto_reposicao,estoque_maximo,custo_medio,ativo')
          .eq('empresa_id', tenantId).order('codigo').range(from, to)),
        fetchAll<WarehouseRecord>((from, to) => supabase.from('erp_almoxarifados')
          .select('id,codigo,nome,ativo').eq('empresa_id', tenantId).order('codigo').range(from, to)),
        fetchAll<StockLocation>((from, to) => supabase.from('erp_estoque_localizacoes')
          .select('*').eq('empresa_id', tenantId).range(from, to)),
        fetchAll<Movement>((from, to) => supabase.from('erp_estoque_movimentos')
          .select('*').eq('empresa_id', tenantId).range(from, to)),
      ])
      setProducts(productRows)
      setWarehouses(warehouseRows)
      setLocations(locationRows.filter((item) => item.ativo !== false))
      setMovements(movementRows.sort((a, b) => asText(b.created_at || b.data_movimento).localeCompare(asText(a.created_at || a.data_movimento))))
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Falha ao carregar dados do Estoque.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return products.filter((product) => !term || [product.codigo, product.nome, product.descricao_resumida || ''].some((value) => value.toLocaleLowerCase('pt-BR').includes(term)))
  }, [products, search])
  const filteredWarehouses = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return warehouses.filter((warehouse) => !term || (warehouse.codigo + ' ' + warehouse.nome).toLocaleLowerCase('pt-BR').includes(term))
  }, [warehouses, search])
  const filteredMovements = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return movements.filter((movement) => {
      const product = products.find((item) => item.id === movement.produto_id)
      return !term || [product?.codigo, product?.nome, movement.tipo, movement.documento, movement.origem, movement.observacao].some((value) => asText(value).toLocaleLowerCase('pt-BR').includes(term))
    })
  }, [movements, products, search])

  const totals = useMemo(() => ({
    products: products.length,
    active: products.filter((item) => item.ativo).length,
    low: products.filter((item) => Number(item.estoque_atual || 0) <= Number(item.ponto_reposicao || 0)).length,
    value: products.reduce((sum, item) => sum + Number(item.estoque_atual || 0) * Number(item.custo_medio || 0), 0),
  }), [products])

  const openNewProduct = () => {
    setEditingProduct(null)
    setProductForm({ codigo: '', nome: '', descricao_resumida: '', unidade: 'UN', ponto_reposicao: '0', estoque_maximo: '0' })
    setProductModal(true)
  }
  const openEditProduct = (product: Product) => {
    setEditingProduct(product)
    setProductForm({
      codigo: product.codigo, nome: product.nome, descricao_resumida: product.descricao_resumida || '',
      unidade: product.unidade || 'UN', ponto_reposicao: String(product.ponto_reposicao || 0),
      estoque_maximo: String(product.estoque_maximo || 0),
    })
    setProductModal(true)
  }
  const saveProduct = async (event: FormEvent) => {
    event.preventDefault()
    if (!empresaId) return
    if (!productForm.codigo.trim() || !productForm.nome.trim()) {
      setNotice({ kind: 'error', text: 'Código e nome do material são obrigatórios.' })
      return
    }
    setSaving(true)
    setNotice(null)
    try {
      const payload = {
        empresa_id: empresaId,
        codigo: productForm.codigo.trim(),
        nome: productForm.nome.trim(),
        descricao_resumida: productForm.descricao_resumida.trim() || null,
        unidade: productForm.unidade.trim() || 'UN',
        ponto_reposicao: Math.max(0, Number(productForm.ponto_reposicao || 0)),
        estoque_maximo: Math.max(0, Number(productForm.estoque_maximo || 0)),
      }
      const response = editingProduct
        ? await supabase.from('erp_produtos').update(payload).eq('id', editingProduct.id).eq('empresa_id', empresaId).select('id').maybeSingle()
        : await supabase.from('erp_produtos').insert({ ...payload, ativo: true }).select('id').maybeSingle()
      if (response.error) throw response.error
      if (!response.data?.id) throw new Error('Nenhum registro foi alterado. Verifique sua permissão de estoque e o acesso da empresa.')
      setProductModal(false)
      setNotice({ kind: 'success', text: editingProduct ? 'Material atualizado.' : 'Material cadastrado.' })
      await load()
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível salvar o material.' })
    } finally {
      setSaving(false)
    }
  }
  const deactivateProduct = async (product: Product) => {
    if (!empresaId || !window.confirm('Inativar ' + product.codigo + ' — ' + product.nome + '? O histórico será preservado.')) return
    setSaving(true)
    setNotice(null)
    try {
      const { data, error } = await supabase.from('erp_produtos').update({ ativo: false }).eq('id', product.id).eq('empresa_id', empresaId).select('id').maybeSingle()
      if (error) throw error
      if (!data?.id) throw new Error('Nenhum registro foi inativado. Verifique a permissão estoque.editar.')
      setNotice({ kind: 'success', text: 'Material inativado. O histórico de estoque foi preservado.' })
      await load()
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Falha ao inativar material.' })
    } finally {
      setSaving(false)
    }
  }

  const openNewWarehouse = () => {
    setEditingWarehouse(null)
    setWarehouseForm({ codigo: '', nome: '', ativo: true })
    setWarehouseModal(true)
  }
  const openEditWarehouse = (warehouse: WarehouseRecord) => {
    setEditingWarehouse(warehouse)
    setWarehouseForm({ codigo: warehouse.codigo, nome: warehouse.nome, ativo: warehouse.ativo })
    setWarehouseModal(true)
  }
  const saveWarehouse = async (event: FormEvent) => {
    event.preventDefault()
    if (!empresaId) return
    if (!warehouseForm.codigo.trim() || !warehouseForm.nome.trim()) {
      setNotice({ kind: 'error', text: 'Código e nome do almoxarifado são obrigatórios.' })
      return
    }
    setSaving(true)
    setNotice(null)
    try {
      const payload = { empresa_id: empresaId, codigo: warehouseForm.codigo.trim(), nome: warehouseForm.nome.trim(), ativo: warehouseForm.ativo }
      const response = editingWarehouse
        ? await supabase.from('erp_almoxarifados').update(payload).eq('id', editingWarehouse.id).eq('empresa_id', empresaId).select('id').maybeSingle()
        : await supabase.from('erp_almoxarifados').insert(payload).select('id').maybeSingle()
      if (response.error) throw response.error
      if (!response.data?.id) throw new Error('Nenhum almoxarifado foi alterado. Verifique a permissão de estoque.')
      setWarehouseModal(false)
      setNotice({ kind: 'success', text: editingWarehouse ? 'Almoxarifado atualizado.' : 'Almoxarifado cadastrado.' })
      await load()
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível salvar o almoxarifado.' })
    } finally {
      setSaving(false)
    }
  }

  const openMovement = (type: string) => {
    setMovementForm({
      produto_id: products.find((item) => item.ativo)?.id || '', tipo: type, quantidade: '',
      origem: 'manual', documento: '', observacao: '', localizacao_origem_id: '', localizacao_destino_id: '',
    })
    setMovementModal(true)
  }
  const saveMovement = async (event: FormEvent) => {
    event.preventDefault()
    if (!empresaId) return
    const quantity = Number(movementForm.quantidade)
    if (!movementForm.produto_id || !Number.isFinite(quantity) || quantity <= 0) {
      setNotice({ kind: 'error', text: 'Selecione o material e informe uma quantidade maior que zero.' })
      return
    }
    if (movementForm.tipo === 'transferencia' && (!movementForm.localizacao_origem_id || !movementForm.localizacao_destino_id || movementForm.localizacao_origem_id === movementForm.localizacao_destino_id)) {
      setNotice({ kind: 'error', text: 'A transferência exige endereços de origem e destino diferentes.' })
      return
    }
    setSaving(true)
    setNotice(null)
    try {
      const { data, error } = await supabase.rpc('erp_estoque_registrar_movimento', {
        p_empresa_id: empresaId,
        p_produto_id: movementForm.produto_id,
        p_tipo: movementForm.tipo,
        p_quantidade: quantity,
        p_origem: movementForm.origem.trim() || 'manual',
        p_documento: movementForm.documento.trim() || null,
        p_observacao: movementForm.observacao.trim() || null,
        p_localizacao_origem_id: movementForm.localizacao_origem_id || null,
        p_localizacao_destino_id: movementForm.localizacao_destino_id || null,
      })
      if (error) throw error
      if (!data) throw new Error('O banco não retornou o identificador da movimentação.')
      setMovementModal(false)
      setNotice({ kind: 'success', text: 'Movimentação registrada no banco. Identificador: ' + String(data) })
      await load()
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível registrar a movimentação.' })
    } finally {
      setSaving(false)
    }
  }

  const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
    { id: 'materiais', label: 'Materiais', icon: Package },
    { id: 'locais', label: 'Almoxarifados', icon: Warehouse },
    { id: 'movimentos', label: 'Movimentações', icon: History },
    { id: 'saldos', label: 'Saldos', icon: Boxes },
  ]

  return (
    <main className="mx-auto w-full max-w-[1680px] space-y-3 p-2 text-slate-800">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-900 px-5 py-4 text-white shadow-sm">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-sky-200">SYSNQRA ERP INDUSTRIAL · MÓDULO ATUALIZADO</div>
          <h1 className="mt-1 text-xl font-extrabold text-white">Estoque e Almoxarifado</h1>
          <p className="mt-1 text-xs text-slate-300">Materiais, locais, movimentações e saldos da empresa ativa.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonBase + ' border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700'} onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
          <button type="button" className={buttonBase + ' bg-orange-500 text-white hover:bg-orange-600'} onClick={() => openMovement('entrada')}>
            <Plus size={14} /> Nova movimentação
          </button>
        </div>
      </header>

      {notice && <div role="status" className={'flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ' + (notice.kind === 'error' ? 'border-red-200 bg-red-50 text-red-800' : notice.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-sky-200 bg-sky-50 text-sky-800')}>
        {notice.kind === 'error' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}<span>{notice.text}</span>
      </div>}

      <section className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500"><span>Materiais cadastrados</span><Package size={16} /></div><strong className="mt-1 block text-2xl text-slate-900">{totals.products}</strong><span className="text-[10px] text-slate-500">{totals.active} ativos</span></article>
        <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500"><span>Almoxarifados</span><Warehouse size={16} /></div><strong className="mt-1 block text-2xl text-slate-900">{warehouses.length}</strong><span className="text-[10px] text-slate-500">cadastros da empresa</span></article>
        <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500"><span>Abaixo do ponto</span><AlertTriangle size={16} className="text-amber-600" /></div><strong className="mt-1 block text-2xl text-amber-700">{totals.low}</strong><span className="text-[10px] text-slate-500">saldo ≤ ponto de reposição</span></article>
        <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500"><span>Valor estimado em estoque</span><Activity size={16} /></div><strong className="mt-1 block text-xl text-slate-900">{formatMoney(totals.value)}</strong><span className="text-[10px] text-slate-500">saldo atual × custo médio cadastrado</span></article>
      </section>

      <nav className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {tabs.map((item) => {
          const Icon = item.icon
          return <button key={item.id} type="button" onClick={() => { setTab(item.id); setSearch('') }} className={'inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold transition ' + (tab === item.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}>
            <Icon size={14} />{item.label}
          </button>
        })}
      </nav>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 p-3">
          <div><div className="text-[9px] font-bold uppercase tracking-widest text-sky-700">GESTÃO OPERACIONAL</div><h2 className="mt-1 text-sm font-extrabold text-slate-900">{tabs.find((item) => item.id === tab)?.label}</h2></div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative block min-w-[220px]"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className={inputClass + ' pl-9'} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código ou descrição..." /></label>
            {tab === 'materiais' && <button type="button" className={buttonBase + ' bg-orange-500 text-white hover:bg-orange-600'} onClick={openNewProduct}><Plus size={14} /> Novo material</button>}
            {tab === 'locais' && <button type="button" className={buttonBase + ' bg-orange-500 text-white hover:bg-orange-600'} onClick={openNewWarehouse}><Plus size={14} /> Novo almoxarifado</button>}
            {tab === 'movimentos' && <div className="flex gap-1"><button type="button" className={buttonBase + ' bg-emerald-700 text-white'} onClick={() => openMovement('entrada')}><ArrowDownToLine size={14} /> Entrada</button><button type="button" className={buttonBase + ' bg-rose-700 text-white'} onClick={() => openMovement('saida')}><ArrowUpFromLine size={14} /> Saída</button><button type="button" className={buttonBase + ' bg-sky-700 text-white'} onClick={() => openMovement('transferencia')}><ArrowLeftRight size={14} /> Transferir</button></div>}
          </div>
        </div>

        {loading ? <div className="p-10 text-center text-xs text-slate-500">Carregando dados reais do Supabase...</div> : !empresaId ? <div className="p-10 text-center text-xs text-slate-500">Empresa não identificada na sessão.</div> : (
          <>
            {tab === 'materiais' && <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-xs"><thead className="bg-slate-100 text-[9px] uppercase tracking-wider text-slate-600"><tr>{['Código','Material','Unidade','Saldo atual','Reposição','Máximo','Custo médio','Status','Ações'].map((label) => <th key={label} className="px-3 py-2.5">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filteredProducts.map((product) => <tr key={product.id} className="hover:bg-sky-50/50"><td className="px-3 py-2.5 font-bold text-slate-800">{product.codigo}</td><td className="px-3 py-2.5"><div className="font-semibold text-slate-800">{product.nome}</div><div className="max-w-[300px] truncate text-[10px] text-slate-500">{product.descricao_resumida || '—'}</div></td><td className="px-3 py-2.5">{product.unidade || 'UN'}</td><td className="px-3 py-2.5 font-bold">{formatNumber(product.estoque_atual)}</td><td className="px-3 py-2.5">{formatNumber(product.ponto_reposicao)}</td><td className="px-3 py-2.5">{formatNumber(product.estoque_maximo)}</td><td className="px-3 py-2.5">{formatMoney(product.custo_medio)}</td><td className="px-3 py-2.5"><span className={'rounded-full px-2 py-1 text-[9px] font-bold ' + (product.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>{product.ativo ? 'ATIVO' : 'INATIVO'}</span></td><td className="px-3 py-2.5"><div className="flex gap-1"><button type="button" title="Editar material" onClick={() => openEditProduct(product)} className="rounded-md p-2 text-sky-700 hover:bg-sky-50"><Edit3 size={14} /></button>{product.ativo && <button type="button" title="Inativar material" onClick={() => void deactivateProduct(product)} className="rounded-md p-2 text-rose-700 hover:bg-rose-50"><Ban size={14} /></button>}</div></td></tr>)}</tbody></table>{!filteredProducts.length && <div className="p-8 text-center text-xs text-slate-500">Nenhum material encontrado.</div>}</div>}

            {tab === 'locais' && <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-slate-100 text-[9px] uppercase tracking-wider text-slate-600"><tr><th className="px-3 py-2.5">Código</th><th className="px-3 py-2.5">Almoxarifado</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5 text-right">Ações</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredWarehouses.map((warehouse) => <tr key={warehouse.id} className="hover:bg-sky-50/50"><td className="px-3 py-2.5 font-bold">{warehouse.codigo}</td><td className="px-3 py-2.5 font-semibold">{warehouse.nome}</td><td className="px-3 py-2.5">{warehouse.ativo ? 'ATIVO' : 'INATIVO'}</td><td className="px-3 py-2.5 text-right"><button type="button" onClick={() => openEditWarehouse(warehouse)} className="rounded-md p-2 text-sky-700 hover:bg-sky-50"><Edit3 size={14} /></button></td></tr>)}</tbody></table>{!filteredWarehouses.length && <div className="p-8 text-center text-xs text-slate-500">Nenhum almoxarifado encontrado.</div>}<p className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-[10px] text-slate-500">Endereços internos são carregados separadamente para movimentações. Campos complementares (endereço, responsável, telefone e local padrão) serão habilitados somente após confirmação do schema correspondente.</p></div>}

            {tab === 'movimentos' && <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-100 text-[9px] uppercase tracking-wider text-slate-600"><tr>{['Data','Material','Tipo','Quantidade','Origem','Documento','Observação'].map((label) => <th key={label} className="px-3 py-2.5">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filteredMovements.map((movement) => { const product = products.find((item) => item.id === movement.produto_id); return <tr key={movement.id} className="hover:bg-sky-50/50"><td className="px-3 py-2.5">{asText(movement.created_at || movement.data_movimento) || '—'}</td><td className="px-3 py-2.5"><b>{product?.codigo || '—'}</b><div className="text-[10px] text-slate-500">{product?.nome || movement.produto_id}</div></td><td className="px-3 py-2.5">{movement.tipo}</td><td className="px-3 py-2.5 font-bold">{formatNumber(movement.quantidade)}</td><td className="px-3 py-2.5">{asText(movement.origem) || '—'}</td><td className="px-3 py-2.5">{asText(movement.documento) || '—'}</td><td className="max-w-[260px] truncate px-3 py-2.5">{asText(movement.observacao) || '—'}</td></tr>})}</tbody></table>{!filteredMovements.length && <div className="p-8 text-center text-xs text-slate-500">Nenhuma movimentação encontrada.</div>}</div>}

            {tab === 'saldos' && <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-100 text-[9px] uppercase tracking-wider text-slate-600"><tr>{['Código','Material','Unidade','Saldo','Ponto de reposição','Valor estimado','Situação'].map((label) => <th key={label} className="px-3 py-2.5">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filteredProducts.filter((item) => item.ativo).map((product) => { const balance = Number(product.estoque_atual || 0); const reorder = Number(product.ponto_reposicao || 0); const low = balance <= reorder; return <tr key={product.id} className="hover:bg-sky-50/50"><td className="px-3 py-2.5 font-bold">{product.codigo}</td><td className="px-3 py-2.5">{product.nome}</td><td className="px-3 py-2.5">{product.unidade || 'UN'}</td><td className="px-3 py-2.5 font-bold">{formatNumber(balance)}</td><td className="px-3 py-2.5">{formatNumber(reorder)}</td><td className="px-3 py-2.5">{formatMoney(balance * Number(product.custo_medio || 0))}</td><td className="px-3 py-2.5"><span className={'rounded-full px-2 py-1 text-[9px] font-bold ' + (low ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>{low ? 'REPOR' : 'NORMAL'}</span></td></tr>})}</tbody></table></div>}
          </>
        )}
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-2 px-1 text-[9px] font-semibold text-slate-500"><span>SYSNQRA ERP INDUSTRIAL · ESTOQUE</span><span>Empresa: {empresaId || 'não identificada'} · sessão autenticada + RLS</span><span>Atualizado · Padrão Premium · 30/10/2026</span></footer>

      {productModal && <div className="fixed inset-0 z-[2000] grid place-items-center bg-slate-950/50 p-3" role="presentation" onMouseDown={() => setProductModal(false)}><form onSubmit={saveProduct} onMouseDown={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl"><header className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4"><div><span className="text-[9px] font-bold uppercase tracking-widest text-sky-700">CADASTRO MESTRE</span><h3 className="text-base font-extrabold text-slate-900">{editingProduct ? 'Editar material' : 'Novo material'}</h3></div><button type="button" onClick={() => setProductModal(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={17} /></button></header><div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2"><label><span className={labelClass}>Código *</span><input className={inputClass} value={productForm.codigo} onChange={(event) => setProductForm({ ...productForm, codigo: event.target.value })} required /></label><label><span className={labelClass}>Nome do material *</span><input className={inputClass} value={productForm.nome} onChange={(event) => setProductForm({ ...productForm, nome: event.target.value })} required /></label><label className="md:col-span-2"><span className={labelClass}>Descrição</span><input className={inputClass} value={productForm.descricao_resumida} onChange={(event) => setProductForm({ ...productForm, descricao_resumida: event.target.value })} /></label><label><span className={labelClass}>Unidade de medida</span><input className={inputClass} value={productForm.unidade} onChange={(event) => setProductForm({ ...productForm, unidade: event.target.value.toUpperCase() })} /></label><label><span className={labelClass}>Ponto de reposição</span><input className={inputClass} type="number" min="0" step="0.001" value={productForm.ponto_reposicao} onChange={(event) => setProductForm({ ...productForm, ponto_reposicao: event.target.value })} /></label><label><span className={labelClass}>Estoque máximo</span><input className={inputClass} type="number" min="0" step="0.001" value={productForm.estoque_maximo} onChange={(event) => setProductForm({ ...productForm, estoque_maximo: event.target.value })} /></label><p className="rounded-lg border border-sky-100 bg-sky-50 p-3 text-[10px] leading-5 text-sky-900 md:col-span-2">Saldo atual e custo médio são controlados pelo razão de estoque e pelos recebimentos. Não são editáveis neste cadastro.</p></div><footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button type="button" onClick={() => setProductModal(false)} className={buttonBase + ' border border-slate-200 text-slate-600'}>Cancelar</button><button disabled={saving} className={buttonBase + ' bg-orange-500 text-white hover:bg-orange-600'}><Save size={14} />{saving ? 'Salvando...' : 'Salvar material'}</button></footer></form></div>}

      {warehouseModal && <div className="fixed inset-0 z-[2000] grid place-items-center bg-slate-950/50 p-3" role="presentation" onMouseDown={() => setWarehouseModal(false)}><form onSubmit={saveWarehouse} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><span className="text-[9px] font-bold uppercase tracking-widest text-sky-700">ESTRUTURA DE ESTOQUE</span><h3 className="text-base font-extrabold text-slate-900">{editingWarehouse ? 'Editar almoxarifado' : 'Novo almoxarifado'}</h3></div><button type="button" onClick={() => setWarehouseModal(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={17} /></button></header><div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2"><label><span className={labelClass}>Código *</span><input className={inputClass} value={warehouseForm.codigo} onChange={(event) => setWarehouseForm({ ...warehouseForm, codigo: event.target.value })} required /></label><label><span className={labelClass}>Nome *</span><input className={inputClass} value={warehouseForm.nome} onChange={(event) => setWarehouseForm({ ...warehouseForm, nome: event.target.value })} required /></label><label className="flex items-center gap-2 text-xs font-semibold text-slate-700 md:col-span-2"><input type="checkbox" checked={warehouseForm.ativo} onChange={(event) => setWarehouseForm({ ...warehouseForm, ativo: event.target.checked })} /> Almoxarifado ativo</label></div><footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button type="button" onClick={() => setWarehouseModal(false)} className={buttonBase + ' border border-slate-200 text-slate-600'}>Cancelar</button><button disabled={saving} className={buttonBase + ' bg-orange-500 text-white hover:bg-orange-600'}><Save size={14} />{saving ? 'Salvando...' : 'Salvar almoxarifado'}</button></footer></form></div>}

      {movementModal && <div className="fixed inset-0 z-[2000] grid place-items-center bg-slate-950/50 p-3" role="presentation" onMouseDown={() => setMovementModal(false)}><form onSubmit={saveMovement} onMouseDown={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><span className="text-[9px] font-bold uppercase tracking-widest text-sky-700">RAZÃO DE ESTOQUE · RPC TRANSACIONAL</span><h3 className="text-base font-extrabold text-slate-900">Registrar {movementForm.tipo === 'entrada' ? 'entrada' : movementForm.tipo === 'saida' ? 'saída' : 'transferência'}</h3></div><button type="button" onClick={() => setMovementModal(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={17} /></button></header><div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2"><label className="md:col-span-2"><span className={labelClass}>Material *</span><select className={inputClass} value={movementForm.produto_id} onChange={(event) => setMovementForm({ ...movementForm, produto_id: event.target.value })} required><option value="">Selecione</option>{products.filter((item) => item.ativo).map((item) => <option key={item.id} value={item.id}>{item.codigo} — {item.nome}</option>)}</select></label><label><span className={labelClass}>Tipo</span><select className={inputClass} value={movementForm.tipo} onChange={(event) => setMovementForm({ ...movementForm, tipo: event.target.value })}><option value="entrada">Entrada</option><option value="saida">Saída</option><option value="transferencia">Transferência</option></select></label><label><span className={labelClass}>Quantidade *</span><input className={inputClass} type="number" min="0.001" step="0.001" value={movementForm.quantidade} onChange={(event) => setMovementForm({ ...movementForm, quantidade: event.target.value })} required /></label>{movementForm.tipo !== 'saida' && <label><span className={labelClass}>Endereço de destino</span><select className={inputClass} value={movementForm.localizacao_destino_id} onChange={(event) => setMovementForm({ ...movementForm, localizacao_destino_id: event.target.value })}><option value="">Não especificado</option>{locations.map((location) => <option key={location.id} value={location.id}>{locationLabel(location)}</option>)}</select></label>}{movementForm.tipo !== 'entrada' && <label><span className={labelClass}>Endereço de origem</span><select className={inputClass} value={movementForm.localizacao_origem_id} onChange={(event) => setMovementForm({ ...movementForm, localizacao_origem_id: event.target.value })}><option value="">Não especificado</option>{locations.map((location) => <option key={location.id} value={location.id}>{locationLabel(location)}</option>)}</select></label>}<label><span className={labelClass}>Origem do lançamento</span><input className={inputClass} value={movementForm.origem} onChange={(event) => setMovementForm({ ...movementForm, origem: event.target.value })} /></label><label><span className={labelClass}>Documento / referência</span><input className={inputClass} value={movementForm.documento} onChange={(event) => setMovementForm({ ...movementForm, documento: event.target.value })} /></label><label className="md:col-span-2"><span className={labelClass}>Observação</span><textarea className={inputClass + ' min-h-[76px] py-2'} value={movementForm.observacao} onChange={(event) => setMovementForm({ ...movementForm, observacao: event.target.value })} /></label><p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[10px] leading-5 text-amber-900 md:col-span-2">A gravação usa a RPC erp_estoque_registrar_movimento, que valida sessão, empresa, produto ativo, permissão estoque.movimentar e quantidade. A transferência exige endereços distintos. O banco é responsável pela consistência do saldo.</p></div><footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button type="button" onClick={() => setMovementModal(false)} className={buttonBase + ' border border-slate-200 text-slate-600'}>Cancelar</button><button disabled={saving} className={buttonBase + ' bg-orange-500 text-white hover:bg-orange-600'}><Save size={14} />{saving ? 'Registrando...' : 'Registrar movimentação'}</button></footer></form></div>}
    </main>
  )
}
