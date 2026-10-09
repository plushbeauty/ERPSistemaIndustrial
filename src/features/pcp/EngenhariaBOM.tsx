import { ArrowLeft, Plus, Trash2, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

type Product = { id: string; codigo: string; nome: string; unidade?: string | null }
type BomRow = { id: string; produto_id: string; sku_insumo: string; qtd: number; unidade: string; custo_unitario: number }
type Workstation = { id: string; codigo_posto: string; nome_posto: string; taxa_hora: number }
type Operation = { id: string; sequencia: number; operacao: string; posto_id: string; setup_min: number; tempo_peca_min: number; tempo_min: number }

const input = 'h-[30px] w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-slate-800 outline-none focus:border-[#2D8DB8] focus-visible:ring-1 focus-visible:ring-[#2D8DB8]'
const label = 'mb-[2px] block text-[9px] font-medium uppercase tracking-wider text-slate-500'
const button = 'inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border px-2.5 text-[10px] font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2D8DB8] disabled:cursor-not-allowed disabled:opacity-50'
const money = (value: number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const numeric = (value: string) => Number(value)

export default function EngenhariaBOM() {
  const nav = useNavigate()
  const [empresaId, setEmpresaId] = useState('')
  const [pai, setPai] = useState('')
  const [componentId, setComponentId] = useState('')
  const [qtd, setQtd] = useState('1')
  const [unidade, setUnidade] = useState('UN')
  const [custo, setCusto] = useState('0')
  const [products, setProducts] = useState<Product[]>([])
  const [rows, setRows] = useState<BomRow[]>([])
  const [workstations, setWorkstations] = useState<Workstation[]>([])
  const [operations, setOperations] = useState<Operation[]>([])
  const [sequencia, setSequencia] = useState('10')
  const [operacao, setOperacao] = useState('')
  const [postoId, setPostoId] = useState('')
  const [setupMin, setSetupMin] = useState('0')
  const [tempoPecaMin, setTempoPecaMin] = useState('0')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const companyId = String(tenant.data)
      setEmpresaId(companyId)
      const [productResult, workstationResult] = await Promise.all([
        supabase.from('erp_produtos').select('id,codigo,nome,unidade').eq('empresa_id', companyId).eq('ativo', true).order('codigo').limit(3000),
        supabase.from('erp_postos_trabalho').select('id,codigo_posto,nome_posto,taxa_hora').eq('empresa_id', companyId).eq('ativo', true).order('codigo_posto').limit(1000),
      ])
      if (productResult.error) throw productResult.error
      if (workstationResult.error) throw workstationResult.error
      setProducts((productResult.data ?? []) as Product[])
      setWorkstations((workstationResult.data ?? []) as Workstation[])
      if (!pai) {
        setRows([])
        setOperations([])
        return
      }
      const [bomResult, operationResult] = await Promise.all([
        supabase.from('erp_pcp_bom_itens').select('id,produto_id,sku_insumo,qtd,unidade,custo_unitario').eq('empresa_id', companyId).eq('produto_pai_id', pai).order('created_at'),
        supabase.from('erp_pcp_roteiro_operacoes').select('id,sequencia,operacao,posto_id,setup_min,tempo_peca_min,tempo_min').eq('empresa_id', companyId).eq('produto_id', pai).order('sequencia'),
      ])
      if (bomResult.error) throw bomResult.error
      if (operationResult.error) throw operationResult.error
      setRows((bomResult.data ?? []) as BomRow[])
      setOperations((operationResult.data ?? []) as Operation[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar Engenharia/BOM.')
    } finally {
      setLoading(false)
    }
  }, [pai])

  useEffect(() => { void load() }, [load])

  const addComponent = async () => {
    const product = products.find(item => item.id === componentId)
    const quantity = numeric(qtd)
    const unitCost = numeric(custo)
    if (!pai || !product) return setError('Selecione o produto pai e um componente cadastrado.')
    if (!Number.isFinite(quantity) || quantity <= 0) return setError('Informe quantidade maior que zero.')
    if (!Number.isFinite(unitCost) || unitCost < 0) return setError('Informe um custo unitário válido, sem valor negativo.')
    if (pai === componentId) return setError('O produto acabado não pode ser componente direto de si mesmo.')
    setSaving(true); setError(''); setNotice('')
    try {
      const result = await supabase.rpc('erp_pcp_bom_adicionar', {
        p_produto_pai_id: pai,
        p_produto_id: product.id,
        p_sku_insumo: product.codigo,
        p_qtd: quantity,
        p_unidade: unidade.trim() || product.unidade || 'UN',
        p_custo_unitario: unitCost,
      })
      if (result.error) throw result.error
      setComponentId(''); setQtd('1'); setCusto('0')
      setNotice('Componente registrado na estrutura do produto.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível adicionar o componente.')
    } finally {
      setSaving(false)
    }
  }

  const removeComponent = async (row: BomRow) => {
    if (!empresaId) return
    setSaving(true); setError(''); setNotice('')
    try {
      const result = await supabase.from('erp_pcp_bom_itens').delete().eq('id', row.id).eq('empresa_id', empresaId).eq('produto_pai_id', pai)
      if (result.error) throw result.error
      setRows(current => current.filter(item => item.id !== row.id))
      setNotice('Componente removido da estrutura.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível remover o componente.')
    } finally {
      setSaving(false)
    }
  }

  const addOperation = async () => {
    const sequence = numeric(sequencia)
    const setup = numeric(setupMin)
    const perPiece = numeric(tempoPecaMin)
    if (!pai) return setError('Selecione o produto fabricado.')
    if (!operacao.trim()) return setError('Informe a operação de fabricação.')
    if (!postoId || !workstations.some(item => item.id === postoId)) return setError('Selecione um centro de trabalho ativo da empresa.')
    if (!Number.isInteger(sequence) || sequence < 1) return setError('A sequência deve ser um número inteiro positivo.')
    if (![setup, perPiece].every(Number.isFinite) || setup < 0 || perPiece < 0 || (setup === 0 && perPiece === 0)) return setError('Informe setup e/ou tempo por peça maior que zero.')
    setSaving(true); setError(''); setNotice('')
    try {
      const result = await supabase.from('erp_pcp_roteiro_operacoes').insert({
        empresa_id: empresaId,
        produto_id: pai,
        sequencia: sequence,
        operacao: operacao.trim(),
        posto_id: postoId,
        setup_min: setup,
        tempo_peca_min: perPiece,
        tempo_min: setup + perPiece,
      }).select('id,sequencia,operacao,posto_id,setup_min,tempo_peca_min,tempo_min').single()
      if (result.error) throw result.error
      setOperations(current => [...current, result.data as Operation].sort((a, b) => a.sequencia - b.sequencia))
      setSequencia(String(sequence + 10)); setOperacao(''); setPostoId(''); setSetupMin('0'); setTempoPecaMin('0')
      setNotice('Operação adicionada ao roteiro padrão.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível gravar a operação.')
    } finally {
      setSaving(false)
    }
  }

  const removeOperation = async (row: Operation) => {
    if (!empresaId) return
    setSaving(true); setError(''); setNotice('')
    try {
      const result = await supabase.from('erp_pcp_roteiro_operacoes').delete().eq('id', row.id).eq('empresa_id', empresaId).eq('produto_id', pai)
      if (result.error) throw result.error
      setOperations(current => current.filter(item => item.id !== row.id))
      setNotice('Operação removida do roteiro.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível remover a operação.')
    } finally {
      setSaving(false)
    }
  }

  const parent = products.find(item => item.id === pai)
  const totalMaterialCost = rows.reduce((sum, row) => sum + Number(row.qtd) * Number(row.custo_unitario), 0)

  return <main className="min-h-screen bg-[#F4FBFD] p-2 text-[10px] text-slate-700">
    <div className="mx-auto max-w-[1600px] space-y-2">
      <header className="flex min-h-[34px] flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => nav('/engenharia')} className={button + ' border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}><ArrowLeft size={14}/>Voltar</button>
          <div><div className="text-[9px] font-medium uppercase tracking-wider text-slate-500">Engenharia / PCP</div><h1 className="text-[13px] font-semibold text-[#123B50]">Estrutura de materiais e roteiro</h1></div>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading || saving} className={button + ' border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}><RefreshCw size={13}/>Atualizar</button>
      </header>
      {error && <div role="alert" className="border border-red-200 bg-red-50 px-2 py-1.5 text-[10px] text-red-800">{error}</div>}
      {notice && <div role="status" className="border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[10px] text-emerald-800">{notice}</div>}
      <section className="border border-slate-200 bg-white p-2">
        <label className={label} htmlFor="bom-parent">Produto fabricado</label>
        <select id="bom-parent" className={input + ' max-w-[760px]'} value={pai} onChange={e => setPai(e.target.value)}>
          <option value="">Selecione o produto fabricado…</option>
          {products.map(product => <option key={product.id} value={product.id}>{product.codigo} — {product.nome}</option>)}
        </select>
        {parent && <div className="mt-1 text-[10px] text-slate-500">Código: <strong>{parent.codigo}</strong> · Componentes: {rows.length} · Custo material estimado: <strong className="tabular-nums">{money(totalMaterialCost)}</strong></div>}
      </section>
      <section className="overflow-hidden border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-2 py-1.5"><h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-700">1. Estrutura de materiais (BOM)</h2></div>
        <div className="grid grid-cols-1 gap-2 p-2 sm:grid-cols-[minmax(220px,1fr)_100px_80px_110px_auto] sm:items-end">
          <div><label className={label} htmlFor="bom-component">Componente / matéria-prima</label><select id="bom-component" className={input} value={componentId} onChange={e => { setComponentId(e.target.value); const p = products.find(item => item.id === e.target.value); if (p?.unidade) setUnidade(p.unidade) }} disabled={!pai}><option value="">Selecione um componente…</option>{products.filter(product => product.id !== pai).map(product => <option key={product.id} value={product.id}>{product.codigo} — {product.nome}</option>)}</select></div>
          <div><label className={label} htmlFor="bom-qty">Qtd. por unidade</label><input id="bom-qty" className={input + ' text-right tabular-nums'} type="number" min="0.000001" step="any" value={qtd} onChange={e => setQtd(e.target.value)} /></div>
          <div><label className={label} htmlFor="bom-unit">Unidade</label><input id="bom-unit" className={input} value={unidade} onChange={e => setUnidade(e.target.value)} maxLength={8}/></div>
          <div><label className={label} htmlFor="bom-cost">Custo unit. (R$)</label><input id="bom-cost" className={input + ' text-right tabular-nums'} type="number" min="0" step="0.000001" value={custo} onChange={e => setCusto(e.target.value)} /></div>
          <button type="button" onClick={() => void addComponent()} disabled={saving || !pai} className={button + ' border-[#2D8DB8] bg-[#2D8DB8] text-white hover:bg-[#24779B]'}><Plus size={13}/>Adicionar</button>
        </div>
        <div className="overflow-auto">
          <table className="w-full border-collapse text-[10px]">
            <thead className="sticky top-0 bg-slate-100 text-[9px] uppercase text-slate-600"><tr className="h-[32px] border-y border-slate-200"><th className="px-2 text-left font-semibold">SKU</th><th className="px-2 text-left font-semibold">Componente</th><th className="px-2 text-right font-semibold">Qtd.</th><th className="px-2 text-left font-semibold">Un.</th><th className="px-2 text-right font-semibold">Custo unit.</th><th className="px-2 text-right font-semibold">Custo total</th><th className="px-2 text-center font-semibold">Ação</th></tr></thead>
            <tbody>
              {rows.map(row => { const product = products.find(item => item.id === row.produto_id); return <tr key={row.id} className="h-[32px] border-b border-slate-100 hover:bg-neutral-50/80"><td className="px-2">{row.sku_insumo}</td><td className="px-2">{product?.nome ?? 'Componente cadastrado'}</td><td className="px-2 text-right tabular-nums">{Number(row.qtd).toLocaleString('pt-BR')}</td><td className="px-2">{row.unidade}</td><td className="px-2 text-right tabular-nums">{money(Number(row.custo_unitario))}</td><td className="px-2 text-right tabular-nums">{money(Number(row.qtd) * Number(row.custo_unitario))}</td><td className="px-2 text-center"><button type="button" title="Remover componente" aria-label={'Remover ' + row.sku_insumo} disabled={saving} onClick={() => void removeComponent(row)} className="inline-flex h-[30px] w-[30px] items-center justify-center border border-slate-300 bg-white hover:bg-red-50 disabled:opacity-50"><Trash2 size={13}/></button></td></tr> })}
              {!loading && rows.length === 0 && <tr><td colSpan={7} className="h-[64px] px-2 text-center text-[10px] text-slate-400">Nenhum componente cadastrado para este produto.</td></tr>}
              {loading && <tr><td colSpan={7} className="h-[32px] animate-pulse bg-slate-50 text-center text-[10px] text-slate-400">Carregando estrutura…</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="overflow-hidden border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-2 py-1.5"><h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-700">2. Roteiro de fabricação</h2></div>
        <div className="grid grid-cols-1 gap-2 p-2 sm:grid-cols-[70px_minmax(180px,1fr)_minmax(180px,1fr)_100px_110px_auto] sm:items-end">
          <div><label className={label} htmlFor="route-seq">Sequência</label><input id="route-seq" className={input + ' text-right tabular-nums'} type="number" min="1" step="1" value={sequencia} onChange={e => setSequencia(e.target.value}/></div>
          <div><label className={label} htmlFor="route-op">Operação</label><input id="route-op" className={input} value={operacao} onChange={e => setOperacao(e.target.value)} placeholder="Ex.: Corte, Usinagem, Inspeção"/></div>
          <div><label className={label} htmlFor="route-workstation">Centro de trabalho</label><select id="route-workstation" className={input} value={postoId} onChange={e => setPostoId(e.target.value)}><option value="">Selecione…</option>{workstations.map(item => <option key={item.id} value={item.id}>{item.codigo_posto} — {item.nome_posto}</option>)}</select></div>
          <div><label className={label} htmlFor="route-setup">Setup (min)</label><input id="route-setup" className={input + ' text-right tabular-nums'} type="number" min="0" step="0.001" value={setupMin} onChange={e => setSetupMin(e.target.value)} /></div>
          <div><label className={label} htmlFor="route-piece">Tempo/peça (min)</label><input id="route-piece" className={input + ' text-right tabular-nums'} type="number" min="0" step="0.000001" value={tempoPecaMin} onChange={e => setTempoPecaMin(e.target.value)} /></div>
          <button type="button" onClick={() => void addOperation()} disabled={saving || !pai} className={button + ' border-[#2D8DB8] bg-[#2D8DB8] text-white hover:bg-[#24779B]'}><Plus size={13}/>Adicionar</button>
        </div>
        <div className="overflow-auto">
          <table className="w-full border-collapse text-[10px]">
            <thead className="sticky top-0 bg-slate-100 text-[9px] uppercase text-slate-600"><tr className="h-[32px] border-y border-slate-200"><th className="px-2 text-right font-semibold">Seq.</th><th className="px-2 text-left font-semibold">Operação</th><th className="px-2 text-left font-semibold">Centro de trabalho</th><th className="px-2 text-right font-semibold">Setup (min)</th><th className="px-2 text-right font-semibold">Tempo/peça (min)</th><th className="px-2 text-right font-semibold">Tempo total 1 peça</th><th className="px-2 text-center font-semibold">Ação</th></tr></thead>
            <tbody>
              {operations.map(row => { const workstation = workstations.find(item => item.id === row.posto_id); return <tr key={row.id} className="h-[32px] border-b border-slate-100 hover:bg-neutral-50/80"><td className="px-2 text-right tabular-nums">{row.sequencia}</td><td className="px-2">{row.operacao}</td><td className="px-2">{workstation ? workstation.codigo_posto + ' — ' + workstation.nome_posto : 'Centro de trabalho'}</td><td className="px-2 text-right tabular-nums">{Number(row.setup_min).toLocaleString('pt-BR')}</td><td className="px-2 text-right tabular-nums">{Number(row.tempo_peca_min).toLocaleString('pt-BR')}</td><td className="px-2 text-right tabular-nums">{money(Number(row.tempo_min))}</td><td className="px-2 text-center"><button type="button" title="Remover operação" aria-label={'Remover operação ' + row.operacao} disabled={saving} onClick={() => void removeOperation(row)} className="inline-flex h-[30px] w-[30px] items-center justify-center border border-slate-300 bg-white hover:bg-red-50 disabled:opacity-50"><Trash2 size={13}/></button></td></tr> })}
              {!loading && operations.length === 0 && <tr><td colSpan={7} className="h-[64px] px-2 text-center text-[10px] text-slate-400">Nenhuma operação cadastrada para este produto.</td></tr>}
              {loading && <tr><td colSpan={7} className="h-[32px] animate-pulse bg-slate-50 text-center text-[10px] text-slate-400">Carregando roteiro…</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <p className="text-[9px] text-slate-500">Os dados são gravados no PostgreSQL do ERP. O acesso aos registros é limitado à empresa da sessão por RLS; a validação da estrutura BOM ocorre também no banco.</p>
    </div>
  </main>
}
