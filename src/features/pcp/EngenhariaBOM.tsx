import { ArrowLeft, Plus, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

type Product = { id: string; codigo: string; nome: string }
type BomItem = { id: string; sku_insumo: string; qtd: number; unidade: string; custo_unitario: number; rendimento_percentual: number; perda_galvanica_percentual: number; perda_mecanica_percentual: number }

const inputClass = 'h-[30px] min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-slate-800 outline-none transition focus:border-sky-600 focus:ring-1 focus:ring-sky-600'
const buttonClass = 'inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border px-2 text-[10px] font-medium transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-600 disabled:cursor-not-allowed disabled:opacity-50'
const labelClass = 'mb-[2px] block text-[9px] font-semibold uppercase tracking-wider text-slate-500'

export default function EngenhariaBOM() {
  const navigate = useNavigate()
  const [empresaId, setEmpresaId] = useState('')
  const [produtoPai, setProdutoPai] = useState('')
  const [skuInsumo, setSkuInsumo] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [unidade, setUnidade] = useState('UN')
  const [custoUnitario, setCustoUnitario] = useState('0')
  const [rendimento, setRendimento] = useState('100')
  const [perdaGalvanica, setPerdaGalvanica] = useState('0')
  const [perdaMecanica, setPerdaMecanica] = useState('0')
  const [produtos, setProdutos] = useState<Product[]>([])
  const [itens, setItens] = useState<BomItem[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const companyId = String(company.data)
      const productResult = await supabase
        .from('erp_produtos')
        .select('id,codigo,nome')
        .eq('empresa_id', companyId)
        .eq('ativo', true)
        .order('codigo')
        .limit(3000)
      if (productResult.error) throw productResult.error
      setEmpresaId(companyId)
      setProdutos((productResult.data ?? []) as Product[])
      if (produtoPai) {
        const bomResult = await supabase
          .from('erp_pcp_bom_itens')
          .select('id,sku_insumo,qtd,unidade,custo_unitario,rendimento_percentual,perda_galvanica_percentual,perda_mecanica_percentual')
          .eq('empresa_id', companyId)
          .eq('produto_pai_id', produtoPai)
          .order('created_at')
        if (bomResult.error) throw bomResult.error
        setItens((bomResult.data ?? []) as BomItem[])
      } else {
        setItens([])
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar a estrutura de materiais.')
    } finally {
      setBusy(false)
    }
  }, [produtoPai])

  useEffect(() => { void load() }, [load])

  const addItem = async () => {
    setError('')
    setMessage('')
    const component = produtos.find(item => item.codigo.trim().toLowerCase() === skuInsumo.trim().toLowerCase())
    const qty = Number(quantidade)
    const cost = Number(custoUnitario)
    const yieldPercent = Number(rendimento)
    const galvanicLoss = Number(perdaGalvanica)
    const mechanicalLoss = Number(perdaMecanica)
    if (!empresaId) { setError('Empresa da sessão não identificada.'); return }
    if (!produtoPai) { setError('Selecione o produto pai.'); return }
    if (produtoPai === component?.id) { setError('O produto acabado não pode ser insumo de si mesmo.'); return }
    if (!component) { setError('Informe o código de um produto/insumo cadastrado nesta empresa.'); return }
    if (!Number.isFinite(qty) || qty <= 0) { setError('A quantidade do componente deve ser maior que zero.'); return }
    if (!unidade.trim()) { setError('Informe a unidade de medida.'); return }
    if (!Number.isFinite(cost) || cost < 0) { setError('O custo unitário não pode ser negativo.'); return }
    if (!Number.isFinite(yieldPercent) || yieldPercent <= 0 || yieldPercent > 100) { setError('O rendimento deve ser maior que 0% e menor ou igual a 100%.'); return }
    if (![galvanicLoss, mechanicalLoss].every(value => Number.isFinite(value) && value >= 0 && value <= 100)) { setError('As perdas galvânica e mecânica devem estar entre 0% e 100%.'); return }

    setBusy(true)
    try {
      const result = await supabase.rpc('erp_pcp_bom_adicionar', {
        p_produto_pai_id: produtoPai,
        p_produto_id: component.id,
        p_sku_insumo: component.codigo,
        p_qtd: qty,
        p_unidade: unidade.trim(),
        p_custo_unitario: cost,
        p_rendimento_percentual: yieldPercent,
        p_perda_galvanica_percentual: galvanicLoss,
        p_perda_mecanica_percentual: mechanicalLoss,
      })
      if (result.error) throw result.error
      setSkuInsumo('')
      setMessage('Componente adicionado à estrutura de materiais.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível adicionar o componente.')
    } finally {
      setBusy(false)
    }
  }

  const quantidadePlanejada = (item: BomItem) => Number(item.qtd || 0) / (Number(item.rendimento_percentual || 100) / 100) * (1 + (Number(item.perda_galvanica_percentual || 0) + Number(item.perda_mecanica_percentual || 0)) / 100)
  const custoTotal = itens.reduce((sum, item) => sum + quantidadePlanejada(item) * Number(item.custo_unitario || 0), 0)
  const produtoSelecionado = produtos.find(item => item.id === produtoPai)

  return (
    <main className="min-h-screen bg-[#F4FBFD] p-2 text-[#123B50]">
      <div className="mx-auto max-w-[1600px] space-y-2">
        <header className="flex min-h-[38px] items-center justify-between gap-2 border-b border-slate-200 bg-white px-2 py-1">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={() => navigate('/engenharia')} className={buttonClass + ' border-slate-300 bg-white'}><ArrowLeft size={14} /> VOLTAR</button>
            <h1 className="truncate text-[12px] font-semibold">ENGENHARIA · ESTRUTURA DE MATERIAIS (BOM)</h1>
          </div>
          <button type="button" onClick={() => void load()} disabled={busy} className={buttonClass + ' border-slate-300 bg-white'}><RefreshCw size={13} /> ATUALIZAR</button>
        </header>

        {error ? <div role="alert" className="border border-red-300 bg-red-50 px-2 py-1 text-[10px] text-red-800">{error}</div> : null}
        {message ? <div role="status" className="border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] text-emerald-800">{message}</div> : null}

        <section className="border border-slate-200 bg-white p-2">
          <label className={labelClass} htmlFor="bom-produto-pai">Produto a fabricar</label>
          <select id="bom-produto-pai" className={inputClass + ' w-full max-w-[760px]'} value={produtoPai} onChange={event => setProdutoPai(event.target.value)}>
            <option value="">Selecione o produto acabado ou subconjunto</option>
            {produtos.map(item => <option key={item.id} value={item.id}>{item.codigo} · {item.nome}</option>)}
          </select>
          {produtoSelecionado ? <p className="mt-1 text-[10px] text-slate-500">Estrutura do item: {produtoSelecionado.codigo} · {produtoSelecionado.nome}</p> : null}
        </section>

        <section className="border border-slate-200 bg-white p-2">
          <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(160px,1.4fr)_90px_70px_100px_100px_100px_100px_100px]">
            <div>
              <label className={labelClass} htmlFor="bom-insumo">Código do componente</label>
              <input id="bom-insumo" className={inputClass + ' w-full'} list="bom-insumos" value={skuInsumo} onChange={event => setSkuInsumo(event.target.value)} placeholder="Código cadastrado" />
              <datalist id="bom-insumos">{produtos.map(item => <option key={item.id} value={item.codigo}>{item.nome}</option>)}</datalist>
            </div>
            <div>
              <label className={labelClass} htmlFor="bom-quantidade">Qtd. por unidade</label>
              <input id="bom-quantidade" className={inputClass + ' w-full text-right'} type="number" min="0.000001" step="0.000001" value={quantidade} onChange={event => setQuantidade(event.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="bom-unidade">Unidade</label>
              <input id="bom-unidade" className={inputClass + ' w-full'} maxLength={8} value={unidade} onChange={event => setUnidade(event.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="bom-custo">Custo unitário estimado</label>
              <input id="bom-custo" className={inputClass + ' w-full text-right'} type="number" min="0" step="0.000001" value={custoUnitario} onChange={event => setCustoUnitario(event.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="bom-rendimento">Rendimento (%)</label>
              <input id="bom-rendimento" className={inputClass + ' w-full text-right'} type="number" min="0.0001" max="100" step="0.0001" value={rendimento} onChange={event => setRendimento(event.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="bom-perda-galvanica">Perda galvânica (%)</label>
              <input id="bom-perda-galvanica" className={inputClass + ' w-full text-right'} type="number" min="0" max="100" step="0.0001" value={perdaGalvanica} onChange={event => setPerdaGalvanica(event.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="bom-perda-mecanica">Perda mecânica (%)</label>
              <input id="bom-perda-mecanica" className={inputClass + ' w-full text-right'} type="number" min="0" max="100" step="0.0001" value={perdaMecanica} onChange={event => setPerdaMecanica(event.target.value)} />
            </div>
            <button type="button" disabled={busy} onClick={() => void addItem()} className={buttonClass + ' border-sky-700 bg-sky-700 text-white hover:bg-sky-800'}><Plus size={14} /> ADICIONAR</button>
          </div>
        </section>

        <section className="overflow-hidden border border-slate-200 bg-white">
          <div className="flex h-[30px] items-center justify-between border-b border-slate-200 px-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider">Componentes da estrutura</h2>
            <span className="text-[10px] text-slate-500">{itens.length} componente(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[10px]">
              <thead className="bg-slate-100 text-[9px] uppercase tracking-wider text-slate-600">
                <tr className="h-[30px]">
                  <th className="px-2 font-semibold">Código do componente</th>
                  <th className="w-[100px] px-2 text-right font-semibold">Qtd. base</th>
                  <th className="w-[60px] px-2 font-semibold">Un.</th>
                  <th className="w-[90px] px-2 text-right font-semibold">Rend. %</th>
                  <th className="w-[90px] px-2 text-right font-semibold">Perda galv. %</th>
                  <th className="w-[90px] px-2 text-right font-semibold">Perda mec. %</th>
                  <th className="w-[120px] px-2 text-right font-semibold">Qtd. planejada</th>
                  <th className="w-[130px] px-2 text-right font-semibold">Custo unitário</th>
                  <th className="w-[140px] px-2 text-right font-semibold">Custo estendido</th>
                </tr>
              </thead>
              <tbody>
                {itens.map(item => (
                  <tr key={item.id} className="h-[32px] border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-2">{item.sku_insumo}</td>
                    <td className="px-2 text-right tabular-nums">{Number(item.qtd).toLocaleString('pt-BR', { maximumFractionDigits: 6 })}</td>
                    <td className="px-2">{item.unidade}</td>
                    <td className="px-2 text-right tabular-nums">{Number(item.rendimento_percentual).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}</td>
                    <td className="px-2 text-right tabular-nums">{Number(item.perda_galvanica_percentual).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}</td>
                    <td className="px-2 text-right tabular-nums">{Number(item.perda_mecanica_percentual).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}</td>
                    <td className="px-2 text-right font-semibold tabular-nums">{quantidadePlanejada(item).toLocaleString('pt-BR', { maximumFractionDigits: 6 })}</td>
                    <td className="px-2 text-right tabular-nums">{Number(item.custo_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</td>
                    <td className="px-2 text-right tabular-nums">{(quantidadePlanejada(item) * Number(item.custo_unitario)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  </tr>
                ))}
                {!busy && itens.length === 0 ? <tr><td colSpan={9} className="h-[56px] px-2 text-center text-[10px] text-slate-500">Selecione um produto para consultar a estrutura ou adicione o primeiro componente.</td></tr> : null}
                {busy && itens.length === 0 ? <tr><td colSpan={9} className="h-[32px] animate-pulse bg-slate-50 px-2 text-center text-[10px] text-slate-500">Carregando estrutura…</td></tr> : null}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50">
                <tr className="h-[30px]"><td colSpan={8} className="px-2 text-right text-[9px] font-semibold uppercase tracking-wider">Custo estimado com rendimento e perdas</td><td className="px-2 text-right text-[10px] font-semibold tabular-nums">{custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td></tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
