import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle, RefreshCw, Save } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import EntityCodeLookup, { type LookupRecord } from '../components/industrial/EntityCodeLookup'
import { fetchAllPages } from '../lib/supabasePagination'

type OP = LookupRecord & { quantidade_boa_disponivel: number }
type ProductionPosting = { ordem_producao_id: string; quantidade_boa: number | null }
type FinishingPosting = { ordem_producao_id: string; quantidade_recebida: number | null }

const input = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] text-slate-900 outline-none focus:border-[#2D8DB8]'
const label = 'grid gap-[2px] text-[9px] font-medium uppercase tracking-wide text-slate-600'

export default function PCPAcabamento() {
  const [ops, setOps] = useState<OP[]>([])
  const [op, setOp] = useState('')
  const [posto, setPosto] = useState('Bancada de Rebarbação Manual')
  const [recebida, setRecebida] = useState(0)
  const [acabada, setAcabada] = useState(0)
  const [refugo, setRefugo] = useState(0)
  const [retrabalho, setRetrabalho] = useState(0)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const empresaId = String(company.data)
      const [orders, production, finishing] = await Promise.all([
        fetchAllPages<{ id: string; numero_op: string | null; numero: string | number | null; quantidade: number | null }>((from, to) =>
          supabase.from('erp_ordens_producao').select('id,numero_op,numero,quantidade', { count: 'exact' }).eq('empresa_id', empresaId).order('created_at', { ascending: false }).range(from, to)),
        fetchAllPages<ProductionPosting>((from, to) =>
          supabase.from('erp_producao_apontamentos').select('ordem_producao_id,quantidade_boa', { count: 'exact' }).eq('empresa_id', empresaId).range(from, to)),
        fetchAllPages<FinishingPosting>((from, to) =>
          supabase.from('erp_acabamentos').select('ordem_producao_id,quantidade_recebida', { count: 'exact' }).eq('empresa_id', empresaId).range(from, to)),
      ])
      const goodByOrder = new Map<string, number>()
      for (const posting of production) {
        const key = posting.ordem_producao_id
        goodByOrder.set(key, (goodByOrder.get(key) ?? 0) + Math.max(0, Number(posting.quantidade_boa ?? 0)))
      }
      const receivedByOrder = new Map<string, number>()
      for (const posting of finishing) {
        const key = posting.ordem_producao_id
        receivedByOrder.set(key, (receivedByOrder.get(key) ?? 0) + Math.max(0, Number(posting.quantidade_recebida ?? 0)))
      }
      const mapped = orders.map(order => {
        const available = Math.max(0, (goodByOrder.get(order.id) ?? 0) - (receivedByOrder.get(order.id) ?? 0))
        const code = String(order.numero_op || order.numero || '')
        return {
          id: order.id,
          codigo: code,
          nome: `Saldo bom disponível: ${available.toLocaleString('pt-BR')} un`,
          estoque_atual: available,
          quantidade_boa_disponivel: available,
        } as OP
      })
      setOps(mapped)
      setRecebida(current => {
        const selected = mapped.find(item => item.id === op)
        return selected ? Math.min(current, selected.quantidade_boa_disponivel) : current
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao calcular saldo bom disponível para acabamento.')
    } finally {
      setBusy(false)
    }
  }, [op])

  useEffect(() => { void load() }, [load])

  const selectedOp = useMemo(() => ops.find(item => item.id === op), [ops, op])
  const saldoBom = selectedOp?.quantidade_boa_disponivel ?? 0
  const saldoParaEmbalagem = Math.max(0, acabada)

  function selecionarOp(id: string) {
    const selected = ops.find(item => item.id === id)
    setOp(id)
    setRecebida(selected?.quantidade_boa_disponivel ?? 0)
    setAcabada(0)
    setRefugo(0)
    setRetrabalho(0)
    setMsg('')
    setError(selected && selected.quantidade_boa_disponivel <= 0 ? 'Esta OP não possui saldo bom apontado disponível para acabamento.' : '')
  }

  async function save() {
    setError('')
    setMsg('')
    if (!op) { setError('Selecione uma OP de origem.'); return }
    if (!Number.isFinite(recebida) || !Number.isFinite(acabada) || !Number.isFinite(refugo) || !Number.isFinite(retrabalho) || recebida <= 0) {
      setError('Informe quantidades válidas maiores que zero para o lote recebido.')
      return
    }
    if (recebida > saldoBom) { setError(`A quantidade recebida excede o saldo bom disponível de ${saldoBom.toLocaleString('pt-BR')} un.`); return }
    if (acabada < 0 || refugo < 0 || retrabalho < 0 || acabada + refugo + retrabalho > recebida) {
      setError('Acabado + refugo + retrabalho não pode superar a quantidade recebida.')
      return
    }
    setBusy(true)
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const status = Math.abs(acabada + refugo + retrabalho - recebida) < 0.0005 ? 'CONCLUIDO' : 'EM_PROCESSO'
      const result = await supabase.from('erp_acabamentos').insert({
        empresa_id: String(company.data),
        ordem_producao_id: op,
        posto_trabalho: posto,
        quantidade_recebida: recebida,
        quantidade_acabada: acabada,
        quantidade_refugo: refugo,
        quantidade_retrabalho: retrabalho,
        status,
      })
      if (result.error) throw result.error
      setMsg(status === 'CONCLUIDO'
        ? 'Acabamento registrado. A quantidade boa segue para inspeção/liberação de Qualidade; o estoque não é liberado automaticamente.'
        : 'Apontamento parcial registrado como EM_PROCESSO; o saldo restante permanece em processamento.')
      setOp('')
      setRecebida(0)
      setAcabada(0)
      setRefugo(0)
      setRetrabalho(0)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível registrar o acabamento.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="erp-global-surface erp-compact min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-300 bg-slate-900 px-3 py-2 text-white">
      <div className="mx-auto flex max-w-[1700px] flex-wrap items-center justify-between gap-2">
        <div><p className="text-[9px] font-medium uppercase tracking-widest text-sky-300">PCP • OPERAÇÕES POSTERIORES</p><h1 className="text-[15px] font-semibold">Acabamento, Rebarbação e Embalagem</h1><p className="text-[10px] text-slate-300">Consome saldo bom real da OP e mantém refugo e retrabalho separados.</p></div>
        <div className="flex gap-1"><button type="button" disabled={busy} onClick={() => void load()} className="h-[30px] border border-slate-500 px-2 text-[10px] disabled:opacity-50"><RefreshCw size={12} className="mr-1 inline"/> Atualizar</button><button type="button" disabled={busy} onClick={() => void save()} className="h-[30px] bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white disabled:opacity-50"><Save size={12} className="mr-1 inline"/> Registrar lote</button></div>
      </div>
    </header>
    <section className="mx-auto mt-3 max-w-[1700px] space-y-3 px-3 pb-4">
      {(error || msg) && <div role={error ? 'alert' : 'status'} className={error ? 'border border-red-300 bg-red-50 p-2 text-[11px] text-red-800' : 'border border-emerald-300 bg-emerald-50 p-2 text-[11px] text-emerald-800'}>{error || msg}</div>}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="border border-slate-200 bg-white p-3">
          <h2 className="mb-2 text-[12px] font-semibold">Registro de acabamento</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2"><EntityCodeLookup label="OP DE ORIGEM" value={op} records={ops} onChange={setOp} onSelect={record => selecionarOp(record.id)} required compact helper="Selecione uma OP com saldo bom disponível. O saldo é calculado pelos apontamentos de produção menos o que já entrou em acabamento."/></div>
            <label className={label}>Posto de trabalho<select className={input} value={posto} onChange={event => setPosto(event.target.value)}><option>Bancada de Rebarbação Manual</option><option>Posto de Pintura / Jateamento</option><option>Embalagem</option></select></label>
            <label className={label}>Quantidade recebida<input className={input} type="number" min="0.001" step="0.001" max={saldoBom} value={recebida} onChange={event => setRecebida(Number(event.target.value))}/></label>
            <label className={label}>Quantidade acabada<input className={input} type="number" min="0" step="0.001" value={acabada} onChange={event => setAcabada(Number(event.target.value))}/></label>
            <label className={label}>Quantidade de refugo<input className={input} type="number" min="0" step="0.001" value={refugo} onChange={event => setRefugo(Number(event.target.value))}/></label>
            <label className={label}>Quantidade em retrabalho<input className={input} type="number" min="0" step="0.001" value={retrabalho} onChange={event => setRetrabalho(Number(event.target.value))}/></label>
          </div>
          <div className="mt-3 border-t border-slate-200 pt-2 text-[10px] text-slate-600">A quantidade recebida é limitada ao saldo bom ainda não consumido. Registre todo o lote como acabado, refugo ou retrabalho; o sistema não inventa saldo nem libera produto sem Qualidade.</div>
        </section>
        <aside className="grid content-start gap-2">
          <article className="border border-slate-200 bg-white p-3"><p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Saldo bom para acabamento</p><p className="mt-1 text-[20px] font-semibold tabular-nums">{saldoBom.toLocaleString('pt-BR')} un</p><p className="text-[10px] text-slate-500">Apontamento bom da OP menos recebimentos anteriores de acabamento.</p></article>
          <article className="border border-emerald-300 bg-emerald-50 p-3"><p className="text-[9px] font-medium uppercase tracking-wide text-emerald-800">Disponível para embalagem</p><p className="mt-1 text-[20px] font-semibold tabular-nums text-emerald-900">{saldoParaEmbalagem.toLocaleString('pt-BR')} un</p><p className="text-[10px] text-emerald-800">Quantidade acabada neste apontamento, sujeita à liberação de Qualidade.</p></article>
          <article className="border border-slate-200 bg-white p-3"><p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Fechamento do lote</p><p className="mt-1 text-[12px] font-semibold">{Math.abs(acabada + refugo + retrabalho - recebida) < 0.0005 && recebida > 0 ? 'CONCLUÍDO' : 'EM PROCESSO'}</p><p className="text-[10px] text-slate-500">Acabado + refugo + retrabalho não pode ultrapassar o recebido.</p></article>
        </aside>
      </div>
      {busy && <p className="text-[10px] text-slate-500">Sincronizando saldos reais do Supabase…</p>}
    </section>
  </main>
}
