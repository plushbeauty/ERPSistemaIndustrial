import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, CalendarClock, Factory, RefreshCw, Save } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Order = { id: string; numero: string; produto_id: string; status: string }
type Product = { id: string; codigo: string; descricao_tecnica: string }
type Schedule = { id: string; ordem_producao_id: string; centro_trabalho: string; inicio_planejado: string; fim_planejado: string; quantidade_planejada: number; prioridade: number; status: string; observacoes: string | null }

const btn = 'inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40'
const th = 'h-[32px] border-b border-slate-200 bg-slate-100 px-2 text-left text-[9px] font-bold uppercase tracking-wide text-slate-600'
const td = 'h-[32px] border-b border-slate-100 px-2 text-[10px] text-slate-700'
const errorText = (e: unknown) => e instanceof Error ? e.message : 'Falha ao sequenciar as operações do PCP.'

export default function PCPSequenciamento() {
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || typeof tenant.data !== 'string' || !tenant.data) {
        throw tenant.error ?? new Error('Empresa da sessão não identificada; sequenciamento bloqueado.')
      }
      const companyId = tenant.data
      const [scheduleResult, orderResult, productResult] = await Promise.all([
        supabase.from('pcp_programacao_capacidade')
          .select('id,ordem_producao_id,centro_trabalho,inicio_planejado,fim_planejado,quantidade_planejada,prioridade,status,observacoes')
          .eq('empresa_id', companyId).neq('status', 'cancelada')
          .order('centro_trabalho').order('prioridade').order('inicio_planejado').limit(5000),
        supabase.from('pcp_ordens_producao')
          .select('id,numero,produto_id,status').eq('empresa_id', companyId).limit(3000),
        supabase.from('engenharia_produtos')
          .select('id,codigo,descricao_tecnica').eq('empresa_id', companyId).order('codigo').limit(3000)
      ])
      for (const result of [scheduleResult, orderResult, productResult]) if (result.error) throw result.error
      setSchedules((scheduleResult.data ?? []) as Schedule[])
      setOrders((orderResult.data ?? []) as Order[])
      setProducts((productResult.data ?? []) as Product[])
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])
  const orderMap = useMemo(() => new Map(orders.map(row => [row.id, row])), [orders])
  const productMap = useMemo(() => new Map(products.map(row => [row.id, row])), [products])
  const lanes = useMemo(() => {
    const grouped = new Map<string, Schedule[]>()
    for (const row of schedules) {
      const key = row.centro_trabalho
      grouped.set(key, [...(grouped.get(key) ?? []), row])
    }
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR')).map(([center, rows]) => ({
      center,
      rows: rows.sort((a, b) => a.prioridade - b.prioridade || a.inicio_planejado.localeCompare(b.inicio_planejado))
    }))
  }, [schedules])

  async function move(row: Schedule, direction: -1 | 1) {
    const lane = lanes.find(item => item.center === row.centro_trabalho)
    if (!lane) return
    const index = lane.rows.findIndex(item => item.id === row.id)
    const other = lane.rows[index + direction]
    if (!other) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || typeof tenant.data !== 'string' || !tenant.data) {
        throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      }
      const companyId = tenant.data
      // Troca a prioridade dentro do mesmo centro; os horários continuam sujeitos
      // à validação transacional de capacidade no PostgreSQL.
      const first = await supabase.from('pcp_programacao_capacidade')
        .update({ prioridade: other.prioridade }).eq('id', row.id).eq('empresa_id', companyId)
      if (first.error) throw first.error
      const second = await supabase.from('pcp_programacao_capacidade')
        .update({ prioridade: row.prioridade }).eq('id', other.id).eq('empresa_id', companyId)
      if (second.error) {
        // Evita deixar a sequência parcialmente trocada caso a segunda atualização falhe.
        const rollback = await supabase.from('pcp_programacao_capacidade')
          .update({ prioridade: row.prioridade }).eq('id', row.id).eq('empresa_id', companyId)
        if (rollback.error) throw new Error(second.error.message + ' | A reversão também falhou: ' + rollback.error.message)
        throw second.error
      }
      setNotice('Prioridade trocada. A programação e a prevenção de sobreposição continuam controladas pelo banco.')
      await load()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900 md:p-4">
    <div className="mx-auto max-w-[1600px]">
      <header className="mb-3 flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-[2px] bg-[#123B50] text-white"><CalendarClock size={17}/></div>
        <div><p className="text-[9px] font-bold uppercase tracking-[.18em] text-sky-700">PCP / SEQUENCIAMENTO</p><h1 className="text-base font-semibold">Fila por centro de trabalho</h1><p className="text-[10px] text-slate-500">Prioridade operacional por recurso, ligada à programação de capacidade real.</p></div>
        <button type="button" className={btn + ' ml-auto'} onClick={() => void load()} disabled={busy}><RefreshCw size={12}/> Atualizar</button>
      </header>
      {error && <div role="alert" className="mb-2 flex gap-2 border border-rose-300 bg-rose-50 p-2 text-[10px] text-rose-800"><AlertTriangle size={13}/>{error}</div>}
      {notice && <div role="status" className="mb-2 flex gap-2 border border-emerald-300 bg-emerald-50 p-2 text-[10px] text-emerald-800"><Save size={13}/>{notice}</div>}
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        {[['ALOCAÇÕES ATIVAS', schedules.length], ['CENTROS EM USO', lanes.length], ['OPs VINCULADAS', new Set(schedules.map(row => row.ordem_producao_id)).size], ['STATUS', busy ? 'ATUALIZANDO' : 'SINCRONIZADO']].map(([label, value]) => <section key={String(label)} className="border border-slate-200 bg-white p-2"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</p><strong className="text-sm tabular-nums">{value}</strong></section>)}
      </div>
      {lanes.length === 0 ? <section className="border border-slate-200 bg-white p-8 text-center text-[11px] text-slate-500">{busy ? 'Carregando programação…' : 'Nenhuma alocação ativa encontrada. Primeiro programe as OPs em PCP → Capacidade.'}</section> :
        <div className="grid gap-3 xl:grid-cols-2">
          {lanes.map(lane => <section key={lane.center} className="min-w-0 border border-slate-200 bg-white">
            <header className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-3 py-2"><Factory size={14} className="text-sky-700"/><h2 className="text-[11px] font-bold uppercase">{lane.center}</h2><span className="ml-auto text-[9px] text-slate-500">{lane.rows.length} operações</span></header>
            <div className="overflow-x-auto"><table className="w-full border-collapse text-left"><thead><tr><th className={th}>Prioridade</th><th className={th}>OP / Produto</th><th className={th}>Início</th><th className={th}>Fim</th><th className={th}>Estado</th><th className={th}>Mover</th></tr></thead>
              <tbody>{lane.rows.map((row, index) => {
                const order = orderMap.get(row.ordem_producao_id)
                const product = order ? productMap.get(order.produto_id) : undefined
                return <tr key={row.id} className="hover:bg-slate-50">
                  <td className={td}>{row.prioridade}</td>
                  <td className={td}><strong>{order?.numero ?? 'OP não localizada'}</strong><div className="max-w-48 truncate text-[9px] text-slate-500">{product ? product.codigo + ' · ' + product.descricao_tecnica : 'Produto não localizado'}</div></td>
                  <td className={td + ' whitespace-nowrap'}>{new Date(row.inicio_planejado).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className={td + ' whitespace-nowrap'}>{new Date(row.fim_planejado).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className={td}>{row.status.replaceAll('_', ' ').toUpperCase()}</td>
                  <td className={td}><div className="flex gap-1"><button type="button" aria-label="Aumentar prioridade" className={btn} disabled={busy || index === 0} onClick={() => void move(row, -1)}><ArrowUp size={12}/></button><button type="button" aria-label="Diminuir prioridade" className={btn} disabled={busy || index === lane.rows.length - 1} onClick={() => void move(row, 1)}><ArrowDown size={12}/></button></div></td>
                </tr>
              })}</tbody>
            </table></div>
          </section>)}
        </div>}
      <p className="mt-2 text-[9px] text-slate-500">Dados reais do Supabase, limitados à empresa da sessão. Esta tela altera a prioridade da fila; datas e conflitos de capacidade são validados separadamente pelo PCP de capacidade finita.</p>
    </div>
  </main>
}
