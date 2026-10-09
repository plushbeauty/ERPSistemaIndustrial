import { ArrowLeft, Plus, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

type Product = { id: string; codigo: string; nome: string }
type WorkCenter = { id: string; codigo_posto: string; nome_posto: string }
type Operation = { id: string; sequencia: number; operacao: string; posto_id: string; tempo_min: number }

const inputClass = 'h-[30px] min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-slate-800 outline-none transition focus:border-sky-600 focus:ring-1 focus:ring-sky-600'
const buttonClass = 'inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border px-2 text-[10px] font-medium transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-600 disabled:cursor-not-allowed disabled:opacity-50'
const labelClass = 'mb-[2px] block text-[9px] font-semibold uppercase tracking-wider text-slate-500'

export default function RoteiroOperacoes() {
  const navigate = useNavigate()
  const [empresaId, setEmpresaId] = useState('')
  const [produto, setProduto] = useState('')
  const [sequencia, setSequencia] = useState('10')
  const [operacao, setOperacao] = useState('')
  const [posto, setPosto] = useState('')
  const [tempo, setTempo] = useState('0')
  const [produtos, setProdutos] = useState<Product[]>([])
  const [postos, setPostos] = useState<WorkCenter[]>([])
  const [operacoes, setOperacoes] = useState<Operation[]>([])
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
      const [productResult, workCenterResult] = await Promise.all([
        supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', companyId).eq('ativo', true).order('codigo').limit(3000),
        supabase.from('erp_postos_trabalho').select('id,codigo_posto,nome_posto').eq('empresa_id', companyId).eq('ativo', true).order('codigo_posto').limit(1000),
      ])
      if (productResult.error) throw productResult.error
      if (workCenterResult.error) throw workCenterResult.error
      setEmpresaId(companyId)
      setProdutos((productResult.data ?? []) as Product[])
      setPostos((workCenterResult.data ?? []) as WorkCenter[])
      if (produto) {
        const operationsResult = await supabase
          .from('erp_pcp_roteiro_operacoes')
          .select('id,sequencia,operacao,posto_id,tempo_min')
          .eq('empresa_id', companyId)
          .eq('produto_id', produto)
          .order('sequencia')
        if (operationsResult.error) throw operationsResult.error
        setOperacoes((operationsResult.data ?? []) as Operation[])
      } else {
        setOperacoes([])
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar o roteiro de fabricação.')
    } finally {
      setBusy(false)
    }
  }, [produto])

  useEffect(() => { void load() }, [load])

  const addOperation = async () => {
    setError('')
    setMessage('')
    const sequenceNumber = Number(sequencia)
    const minutes = Number(tempo)
    if (!empresaId) { setError('Empresa da sessão não identificada.'); return }
    if (!produto) { setError('Selecione o produto.'); return }
    if (!operacao.trim()) { setError('Informe a descrição da operação.'); return }
    if (!posto) { setError('Selecione o centro de trabalho.'); return }
    if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) { setError('A sequência deve ser um número inteiro positivo.'); return }
    if (!Number.isFinite(minutes) || minutes < 0) { setError('O tempo padrão deve ser zero ou maior.'); return }

    setBusy(true)
    try {
      const result = await supabase.from('erp_pcp_roteiro_operacoes').insert({
        empresa_id: empresaId,
        produto_id: produto,
        sequencia: sequenceNumber,
        operacao: operacao.trim(),
        posto_id: posto,
        tempo_min: minutes,
      })
      if (result.error) throw result.error
      setOperacao('')
      setMessage('Operação adicionada ao roteiro.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível gravar a operação.')
    } finally {
      setBusy(false)
    }
  }

  const totalMinutes = operacoes.reduce((sum, row) => sum + Number(row.tempo_min || 0), 0)

  return (
    <main className="min-h-screen bg-[#F4FBFD] p-2 text-[#123B50]">
      <div className="mx-auto max-w-[1600px] space-y-2">
        <header className="flex min-h-[38px] items-center justify-between gap-2 border-b border-slate-200 bg-white px-2 py-1">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={() => navigate('/engenharia')} className={buttonClass + ' border-slate-300 bg-white'}><ArrowLeft size={14} /> VOLTAR</button>
            <h1 className="truncate text-[12px] font-semibold">ENGENHARIA · ROTEIRO DE FABRICAÇÃO</h1>
          </div>
          <button type="button" onClick={() => void load()} disabled={busy} className={buttonClass + ' border-slate-300 bg-white'}><RefreshCw size={13} /> ATUALIZAR</button>
        </header>

        {error ? <div role="alert" className="border border-red-300 bg-red-50 px-2 py-1 text-[10px] text-red-800">{error}</div> : null}
        {message ? <div role="status" className="border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] text-emerald-800">{message}</div> : null}

        <section className="border border-slate-200 bg-white p-2">
          <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_80px_minmax(160px,1.4fr)_minmax(180px,1.4fr)_100px_92px]">
            <div className="min-w-0">
              <label className={labelClass} htmlFor="roteiro-produto">Produto</label>
              <select id="roteiro-produto" className={inputClass + ' w-full'} value={produto} onChange={event => setProduto(event.target.value)}>
                <option value="">Selecione o produto</option>
                {produtos.map(item => <option key={item.id} value={item.id}>{item.codigo} · {item.nome}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="roteiro-sequencia">Sequência</label>
              <input id="roteiro-sequencia" className={inputClass + ' w-full text-right'} inputMode="numeric" value={sequencia} onChange={event => setSequencia(event.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="roteiro-operacao">Operação</label>
              <input id="roteiro-operacao" className={inputClass + ' w-full'} maxLength={120} value={operacao} onChange={event => setOperacao(event.target.value)} placeholder="Ex.: Usinagem" />
            </div>
            <div>
              <label className={labelClass} htmlFor="roteiro-posto">Centro de trabalho</label>
              <select id="roteiro-posto" className={inputClass + ' w-full'} value={posto} onChange={event => setPosto(event.target.value)}>
                <option value="">Selecione o posto</option>
                {postos.map(item => <option key={item.id} value={item.id}>{item.codigo_posto} · {item.nome_posto}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="roteiro-tempo">Tempo padrão (min)</label>
              <input id="roteiro-tempo" className={inputClass + ' w-full text-right'} type="number" min="0" step="0.01" value={tempo} onChange={event => setTempo(event.target.value)} />
            </div>
            <button type="button" disabled={busy} onClick={() => void addOperation()} className={buttonClass + ' border-sky-700 bg-sky-700 text-white hover:bg-sky-800'}><Plus size={14} /> ADICIONAR</button>
          </div>
        </section>

        <section className="overflow-hidden border border-slate-200 bg-white">
          <div className="flex h-[30px] items-center justify-between border-b border-slate-200 px-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider">Sequência de operações</h2>
            <span className="text-[10px] text-slate-500">{operacoes.length} operação(ões)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[10px]">
              <thead className="bg-slate-100 text-[9px] uppercase tracking-wider text-slate-600">
                <tr className="h-[30px]">
                  <th className="w-[90px] px-2 font-semibold">Seq.</th>
                  <th className="px-2 font-semibold">Operação</th>
                  <th className="px-2 font-semibold">Centro de trabalho</th>
                  <th className="w-[140px] px-2 text-right font-semibold">Tempo (min)</th>
                </tr>
              </thead>
              <tbody>
                {operacoes.map(row => (
                  <tr key={row.id} className="h-[32px] border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-2 tabular-nums">{row.sequencia}</td>
                    <td className="px-2">{row.operacao}</td>
                    <td className="px-2">{postos.find(item => item.id === row.posto_id)?.nome_posto ?? 'Centro não localizado'}</td>
                    <td className="px-2 text-right tabular-nums">{Number(row.tempo_min).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                {!busy && operacoes.length === 0 ? <tr><td colSpan={4} className="h-[56px] px-2 text-center text-[10px] text-slate-500">Selecione um produto com roteiro cadastrado ou adicione a primeira operação.</td></tr> : null}
                {busy && operacoes.length === 0 ? <tr><td colSpan={4} className="h-[32px] animate-pulse bg-slate-50 px-2 text-center text-[10px] text-slate-500">Carregando dados do roteiro…</td></tr> : null}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50">
                <tr className="h-[30px]"><td colSpan={3} className="px-2 text-right text-[9px] font-semibold uppercase tracking-wider">Tempo padrão total</td><td className="px-2 text-right text-[10px] font-semibold tabular-nums">{totalMinutes.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} min</td></tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
