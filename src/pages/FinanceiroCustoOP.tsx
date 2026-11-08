/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-08
 * @REVISAO: REV-FINANCEIRO-CUSTO-OP-REAL-20261108-01 — consumo real por OP, mão de obra dos apontamentos, overhead e margem
 * @STATUS_APROVACAO: INCREMENTO FUNCIONAL AUTORIZADO NA ORDEM ORDEM-EXECUCAO-SYSNQRA-20261108-01; depende da aplicação da migration no Supabase
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Boxes, Calculator, Factory, PlusCircle, Save, ShieldCheck } from 'lucide-react'
import VendasLayout from './VendasLayout'
import { fieldClass as input, labelClass as label } from '../components/industrial/forms/industrialFormStyles'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Ordem = { id: string; numero_op: string; produto_id: string; status: string; quantidade: number }
type Produto = { id: string; codigo: string; nome: string; estoque_atual: number; custo_medio: number }
type FichaItem = { produto_id: string; quantidade: number; perda_percentual: number | null }
type MaterialBOM = FichaItem & { produto: Produto | null }
type CustoOP = {
  id: string; empresa_id: string; ordem_producao_id: string; produto_id: string
  status_apuracao: string; revisao_apuracao: number
  custo_material: number; custo_mao_obra: number; custo_overhead: number
  custo_total: number; custo_unitario: number | null; quantidade_produzida: number
  preco_venda_unitario: number; receita_estimada: number; margem_valor: number
  margem_percentual: number; apurado_em: string | null; created_at: string
}
type Movimento = { id: string; produto_id: string; quantidade: number; custo_unitario: number; created_at: string; documento: string | null }
type Indireto = { id: string; tipo: string; valor: number; referencia: string | null; ocorrido_em: string }

const brl = (value: number | null | undefined) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value ?? 0))
const number = (value: number | null | undefined) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 }).format(Number(value ?? 0))

export default function FinanceiroCustoOP() {
  const [empresaId, setEmpresaId] = useState('')
  const [ordens, setOrdens] = useState<Ordem[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [custos, setCustos] = useState<CustoOP[]>([])
  const [materiais, setMateriais] = useState<MaterialBOM[]>([])
  const [movimentos, setMovimentos] = useState<Movimento[]>([])
  const [indiretos, setIndiretos] = useState<Indireto[]>([])
  const [ordemId, setOrdemId] = useState('')
  const [materialId, setMaterialId] = useState('')
  const [quantidadeConsumo, setQuantidadeConsumo] = useState('')
  const [observacaoConsumo, setObservacaoConsumo] = useState('')
  const [tipoIndireto, setTipoIndireto] = useState('INDIRETO')
  const [valorIndireto, setValorIndireto] = useState('')
  const [horasIndireto, setHorasIndireto] = useState('')
  const [custoHoraIndireto, setCustoHoraIndireto] = useState('')
  const [referenciaIndireto, setReferenciaIndireto] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const selectedOrder = ordens.find(order => order.id === ordemId) ?? null
  const selectedCost = useMemo(() => custos.filter(cost => cost.ordem_producao_id === ordemId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null, [custos, ordemId])
  const selectedProduct = selectedOrder ? produtos.find(product => product.id === selectedOrder.produto_id) ?? null : null

  const loadBase = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const company = String(tenant.data)
      setEmpresaId(company)
      const [orderRows, productRows, costRows] = await Promise.all([
        fetchAllPages<Ordem>((from, to) => supabase.from('erp_ordens_producao')
          .select('id,numero_op,produto_id,status,quantidade', { count: 'exact' })
          .eq('empresa_id', company).order('numero_op', { ascending: false }).range(from, to)),
        fetchAllPages<Produto>((from, to) => supabase.from('erp_produtos')
          .select('id,codigo,nome,estoque_atual,custo_medio', { count: 'exact' })
          .eq('empresa_id', company).eq('ativo', true).order('codigo').range(from, to)),
        fetchAllPages<CustoOP>((from, to) => supabase.from('erp_financeiro_custo_op')
          .select('id,empresa_id,ordem_producao_id,produto_id,status_apuracao,revisao_apuracao,custo_material,custo_mao_obra,custo_overhead,custo_total,custo_unitario,quantidade_produzida,preco_venda_unitario,receita_estimada,margem_valor,margem_percentual,apurado_em,created_at', { count: 'exact' })
          .eq('empresa_id', company).order('created_at', { ascending: false }).range(from, to)),
      ])
      setOrdens(orderRows)
      setProdutos(productRows)
      setCustos(costRows)
      if (!ordemId && orderRows.length) setOrdemId(orderRows[0].id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar custos reais.')
      setCustos([])
    } finally {
      setLoading(false)
    }
  }, [ordemId])

  const loadDetail = useCallback(async () => {
    if (!empresaId || !selectedOrder) {
      setMateriais([])
      setMovimentos([])
      setIndiretos([])
      return
    }
    setError('')
    try {
      const ficha = await supabase.from('erp_fichas_tecnicas').select('id')
        .eq('empresa_id', empresaId).eq('produto_id', selectedOrder.produto_id)
        .eq('ativa', true).order('versao', { ascending: false }).limit(1).maybeSingle()
      if (ficha.error) throw ficha.error
      if (!ficha.data?.id) throw new Error('A OP não possui ficha técnica ativa. O consumo de material foi bloqueado para evitar apontamento fora da BOM.')
      const fichaRows = await fetchAllPages<FichaItem>((from, to) => supabase.from('erp_ficha_itens')
        .select('produto_id,quantidade,perda_percentual', { count: 'exact' })
        .eq('ficha_id', ficha.data.id).range(from, to))
      const materialIds = [...new Set(fichaRows.map(item => item.produto_id))]
      const materialProducts = materialIds.length
        ? await fetchAllPages<Produto>((from, to) => supabase.from('erp_produtos')
          .select('id,codigo,nome,estoque_atual,custo_medio', { count: 'exact' })
          .eq('empresa_id', empresaId).in('id', materialIds).range(from, to))
        : []
      const productMap = new Map(materialProducts.map(product => [product.id, product]))
      setMateriais(fichaRows.map(item => ({ ...item, produto: productMap.get(item.produto_id) ?? null })))
      const [movementRows, indirectRows] = await Promise.all([
        fetchAllPages<Movimento>((from, to) => supabase.from('erp_estoque_movimentos')
          .select('id,produto_id,quantidade,custo_unitario,created_at,documento', { count: 'exact' })
          .eq('empresa_id', empresaId).eq('ordem_producao_id', selectedOrder.id)
          .eq('tipo', 'consumo').eq('origem', 'consumo_producao')
          .order('created_at', { ascending: false }).range(from, to)),
        fetchAllPages<Indireto>((from, to) => supabase.from('erp_custos_apontamentos')
          .select('id,tipo,valor,referencia,ocorrido_em', { count: 'exact' })
          .eq('empresa_id', empresaId).eq('ordem_producao_id', selectedOrder.id)
          .in('tipo', ['ENERGIA', 'INDIRETO', 'TERCEIRIZACAO', 'EMBALAGEM', 'PERDA'])
          .order('ocorrido_em', { ascending: false }).range(from, to)),
      ])
      setMovimentos(movementRows)
      setIndiretos(indirectRows)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar ficha, consumos e custos indiretos.')
      setMateriais([])
      setMovimentos([])
      setIndiretos([])
    }
  }, [empresaId, selectedOrder])

  useEffect(() => { void loadBase() }, [loadBase])
  useEffect(() => { void loadDetail() }, [loadDetail])

  const consumir = async () => {
    setBusy(true); setError(''); setNotice('')
    try {
      if (!selectedOrder || !materialId) throw new Error('Selecione a OP e um componente da ficha técnica.')
      const qty = Number(quantidadeConsumo)
      if (!Number.isFinite(qty) || qty <= 0) throw new Error('Informe uma quantidade de consumo maior que zero.')
      const result = await supabase.rpc('erp_pcp_consumir_material_op', {
        p_ordem_producao_id: selectedOrder.id,
        p_produto_id: materialId,
        p_quantidade: qty,
        p_observacao: observacaoConsumo.trim() || null,
      })
      if (result.error) throw result.error
      setQuantidadeConsumo(''); setObservacaoConsumo('')
      setNotice('Consumo registrado no estoque e vinculado à OP com custo unitário congelado no movimento.')
      await loadDetail()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao registrar consumo.')
    } finally { setBusy(false) }
  }

  const registrarIndireto = async () => {
    setBusy(true); setError(''); setNotice('')
    try {
      if (!selectedOrder) throw new Error('Selecione uma OP.')
      const value = Number(valorIndireto)
      if (!Number.isFinite(value) || value <= 0) throw new Error('Informe um valor de custo indireto maior que zero.')
      const result = await supabase.rpc('erp_financeiro_custo_op_registrar_indireto', {
        p_ordem_producao_id: selectedOrder.id,
        p_tipo: tipoIndireto,
        p_valor: value,
        p_referencia: referenciaIndireto.trim() || null,
        p_horas: Number(horasIndireto) || 0,
        p_custo_hora: Number(custoHoraIndireto) || 0,
      })
      if (result.error) throw result.error
      setValorIndireto(''); setHorasIndireto(''); setCustoHoraIndireto(''); setReferenciaIndireto('')
      setNotice('Custo indireto registrado com vínculo à OP.')
      await loadDetail()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao registrar custo indireto.')
    } finally { setBusy(false) }
  }

  const apurar = async () => {
    setBusy(true); setError(''); setNotice('')
    try {
      if (!selectedOrder) throw new Error('Selecione uma OP.')
      const result = await supabase.rpc('erp_financeiro_custo_op_apurar', { p_ordem_producao_id: selectedOrder.id })
      if (result.error) throw result.error
      setNotice('Custo da OP apurado. Revisão ' + (result.data?.revisao ?? '—') + ' · Total ' + brl(result.data?.custo_total) + '.')
      await loadBase()
      await loadDetail()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha na apuração do custo real.')
    } finally { setBusy(false) }
  }

  const refresh = async () => { await loadBase(); await loadDetail() }

  return (
    <VendasLayout
      title="Custo real por ordem de produção"
      subtitle="Apuração rastreável de material consumido, mão de obra apontada, máquinas, energia, indiretos e margem."
      onRefresh={() => void refresh()}
      topContent={<div className="flex flex-wrap items-center justify-between gap-2 border border-[#C8E3EE] bg-[#EAF6FA] px-3 py-2 text-[#123B50]">
        <div className="flex items-center gap-2"><ShieldCheck size={15} className="text-[#2D8DB8]" /><p className="text-[9px] font-bold uppercase tracking-[.14em]">CUSTO REAL · FONTE ÚNICA ERP_CUSTOS_PRODUTOS</p></div>
        <Link to="/financeiro/caixa" className="text-[10px] font-bold text-[#176487] underline">Voltar ao Financeiro</Link>
      </div>}
    >
      {(error || notice) && <p role={error ? 'alert' : 'status'} className={error ? 'border border-rose-200 bg-rose-50 p-2 text-[10px] text-rose-800' : 'border border-emerald-200 bg-emerald-50 p-2 text-[10px] text-emerald-800'}>{error || notice}</p>}
      <section className="border border-slate-200 bg-white p-3">
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label className={label}>ORDEM DE PRODUÇÃO
            <select className={input} value={ordemId} onChange={event => setOrdemId(event.target.value)}>
              <option value="">Selecione uma OP</option>
              {ordens.map(order => <option key={order.id} value={order.id}>{order.numero_op} · {order.status}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => void apurar()} disabled={!selectedOrder || busy || loading} className="inline-flex h-[30px] items-center justify-center gap-1 border border-[#2D8DB8] bg-[#2D8DB8] px-4 text-[10px] font-bold text-white disabled:opacity-50"><Calculator size={13} /> APURAR CUSTO REAL</button>
        </div>
        {selectedOrder && <p className="mt-2 text-[9px] text-slate-500">OP {selectedOrder.numero_op} · Produto {selectedProduct?.codigo ?? selectedOrder.produto_id} · Planejado {number(selectedOrder.quantidade)} · Status {selectedOrder.status}</p>}
      </section>

      <section className="grid gap-2 lg:grid-cols-2">
        <article className="border border-slate-200 bg-white p-3">
          <h2 className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#176487]"><Boxes size={14} /> Consumo real de materiais</h2>
          <label className={label}>COMPONENTE DA FICHA TÉCNICA
            <select className={input} value={materialId} onChange={event => setMaterialId(event.target.value)}>
              <option value="">Selecione material da BOM ativa</option>
              {materiais.map(item => <option key={item.produto_id} value={item.produto_id}>{item.produto?.codigo ?? item.produto_id} · {item.produto?.nome ?? 'Material'} · saldo {number(item.produto?.estoque_atual)} · custo médio {brl(item.produto?.custo_medio)}</option>)}
            </select>
          </label>
          {materialId && (() => { const item = materiais.find(row => row.produto_id === materialId); return item ? <p className="mt-1 text-[9px] text-slate-500">Previsto por unidade: {number(item.quantidade)} · Perda técnica: {number(item.perda_percentual)}%</p> : null })()}
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <label className={label}>QUANTIDADE CONSUMIDA<input className={input} type="number" min="0.0001" step="any" value={quantidadeConsumo} onChange={event => setQuantidadeConsumo(event.target.value)} /></label>
            <label className={label}>OBSERVAÇÃO<input className={input} value={observacaoConsumo} onChange={event => setObservacaoConsumo(event.target.value)} placeholder="Ex.: consumo apontado no posto" /></label>
          </div>
          <button type="button" onClick={() => void consumir()} disabled={!selectedOrder || !materialId || busy} className="mt-2 inline-flex h-[30px] items-center gap-1 border border-[#2D8DB8] px-3 text-[10px] font-bold text-[#176487] disabled:opacity-50"><PlusCircle size={13} /> REGISTRAR CONSUMO</button>
          <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[440px] text-left text-[9px]">
            <thead className="bg-[#EAF4F7] uppercase"><tr><th className="h-[28px] px-2">Produto</th><th className="px-2">Quantidade</th><th className="px-2">Custo unit.</th><th className="px-2">Total</th></tr></thead>
            <tbody>{movimentos.map(move => { const product = produtos.find(p => p.id === move.produto_id); return <tr key={move.id} className="h-[28px] border-t border-slate-100"><td className="px-2">{product?.codigo ?? move.produto_id}</td><td className="px-2">{number(move.quantidade)}</td><td className="px-2">{brl(move.custo_unitario)}</td><td className="px-2">{brl(move.quantidade * move.custo_unitario)}</td></tr> })}
              {!movimentos.length && <tr><td colSpan={4} className="p-4 text-center text-slate-500">Nenhum consumo de material registrado para esta OP.</td></tr>}</tbody>
          </table></div>
        </article>

        <article className="border border-slate-200 bg-white p-3">
          <h2 className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#176487]"><Factory size={14} /> Overhead e custos indiretos</h2>
          <div className="grid gap-2 md:grid-cols-2">
            <label className={label}>TIPO<select className={input} value={tipoIndireto} onChange={event => setTipoIndireto(event.target.value)}>{['INDIRETO','ENERGIA','TERCEIRIZACAO','EMBALAGEM','PERDA'].map(type => <option key={type}>{type}</option>)}</select></label>
            <label className={label}>VALOR (R$)<input className={input} type="number" min="0.01" step="0.01" value={valorIndireto} onChange={event => setValorIndireto(event.target.value)} /></label>
            <label className={label}>HORAS (OPCIONAL)<input className={input} type="number" min="0" step="any" value={horasIndireto} onChange={event => setHorasIndireto(event.target.value)} /></label>
            <label className={label}>CUSTO/HORA (OPCIONAL)<input className={input} type="number" min="0" step="any" value={custoHoraIndireto} onChange={event => setCustoHoraIndireto(event.target.value)} /></label>
          </div>
          <label className={label}>REFERÊNCIA<input className={input} value={referenciaIndireto} onChange={event => setReferenciaIndireto(event.target.value)} placeholder="Documento, centro de custo ou critério de rateio" /></label>
          <button type="button" onClick={() => void registrarIndireto()} disabled={!selectedOrder || busy} className="mt-2 inline-flex h-[30px] items-center gap-1 border border-[#2D8DB8] px-3 text-[10px] font-bold text-[#176487] disabled:opacity-50"><Save size={13} /> REGISTRAR CUSTO</button>
          <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[360px] text-left text-[9px]">
            <thead className="bg-[#EAF4F7] uppercase"><tr><th className="h-[28px] px-2">Tipo</th><th className="px-2">Referência</th><th className="px-2">Valor</th></tr></thead>
            <tbody>{indiretos.map(item => <tr key={item.id} className="h-[28px] border-t border-slate-100"><td className="px-2">{item.tipo}</td><td className="px-2">{item.referencia || '—'}</td><td className="px-2">{brl(item.valor)}</td></tr>)}
              {!indiretos.length && <tr><td colSpan={3} className="p-4 text-center text-slate-500">Nenhum custo indireto lançado para esta OP.</td></tr>}</tbody>
          </table></div>
        </article>
      </section>

      {selectedCost && <section className="border border-slate-200 bg-white p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-[10px] font-black uppercase tracking-wider text-[#176487]">Última apuração · revisão {selectedCost.revisao_apuracao}</h2><p className="text-[9px] text-slate-500">{selectedCost.status_apuracao} · {selectedCost.apurado_em ? new Date(selectedCost.apurado_em).toLocaleString('pt-BR') : '—'}</p></div><span className="text-[9px] font-bold text-[#176487]">Custo unitário: {brl(selectedCost.custo_unitario)}</span></div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[['Material',selectedCost.custo_material],['Mão de obra',selectedCost.custo_mao_obra],['Overhead',selectedCost.custo_overhead],['Custo total',selectedCost.custo_total],['Receita estimada',selectedCost.receita_estimada],['Margem',selectedCost.margem_valor],['Margem %',selectedCost.margem_percentual]].map(([title,value]) => <div key={String(title)} className="border border-slate-100 bg-[#F8FBFC] p-2"><p className="text-[9px] uppercase text-slate-500">{title}</p><p className="mt-1 text-[13px] font-black text-[#123B50]">{title === 'Margem %' ? number(Number(value)) + '%' : brl(Number(value))}</p></div>)}
        </div>
        {selectedCost.status_apuracao === 'APURADO_SEM_PRECO' && <p className="mt-2 text-[9px] text-amber-800">Preço de venda não cadastrado. Margem não calculada; informe o preço no cadastro do produto e gere nova revisão.</p>}
      </section>}

      <section className="border border-slate-200 bg-white p-3">
        <h2 className="mb-2 text-[10px] font-black uppercase tracking-wider text-[#176487]">Histórico de apurações</h2>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-[9px]">
          <thead className="bg-[#EAF4F7] uppercase"><tr><th className="h-[30px] px-2">OP</th><th className="px-2">Revisão</th><th className="px-2">Material</th><th className="px-2">Mão de obra</th><th className="px-2">Overhead</th><th className="px-2">Total</th><th className="px-2">Unitário</th><th className="px-2">Margem</th><th className="px-2">Status</th></tr></thead>
          <tbody>{custos.map(cost => <tr key={cost.id} className="h-[30px] border-t border-slate-100"><td className="px-2">{ordens.find(o => o.id === cost.ordem_producao_id)?.numero_op ?? cost.ordem_producao_id}</td><td className="px-2">{cost.revisao_apuracao}</td><td className="px-2">{brl(cost.custo_material)}</td><td className="px-2">{brl(cost.custo_mao_obra)}</td><td className="px-2">{brl(cost.custo_overhead)}</td><td className="px-2 font-bold">{brl(cost.custo_total)}</td><td className="px-2">{brl(cost.custo_unitario)}</td><td className="px-2">{number(cost.margem_percentual)}%</td><td className="px-2">{cost.status_apuracao}</td></tr>)}
            {!custos.length && <tr><td colSpan={9} className="p-6 text-center text-slate-500">{loading ? 'Carregando apurações...' : 'Nenhuma apuração real registrada.'}</td></tr>}</tbody>
        </table></div>
      </section>
    </VendasLayout>
  )
}
