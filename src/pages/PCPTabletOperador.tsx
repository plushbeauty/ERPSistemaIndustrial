import { useCallback, useEffect, useState } from 'react'
import { CheckCircle, CloudOff, LogOut, RefreshCw, Wifi } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { cn } from '../utils/cn'

type OP = {
  id: string
  numero_op: number
  produto_id: string | null
  maquina_id: string | null
  quantidade_planejada: number
}

type ProcessRecord = {
  processo_id: string
  ferramenta_id: string | null
  maquina_id: string | null
}

type PendingApontamento = {
  id: string
  createdAt: string
  opId: string
  found: number
  defects: number
  reason: string
  instrument: string
}

const QUEUE_KEY = 'erp:pcp:tablet:pending-apontamentos:v1'

function readQueue(): PendingApontamento[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as PendingApontamento[] : []
  } catch {
    return []
  }
}

function writeQueue(queue: PendingApontamento[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

function enqueue(item: PendingApontamento): void {
  const queue = readQueue()
  if (!queue.some((entry) => entry.id === item.id)) {
    queue.push(item)
    writeQueue(queue)
  }
}

function removeFromQueue(id: string): void {
  writeQueue(readQueue().filter((entry) => entry.id !== id))
}

function networkFailure(error: unknown): boolean {
  if (!navigator.onLine) return true
  if (error instanceof TypeError) return true
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : ''
  return code.startsWith('08') || code === 'PGRST000' || code === 'PGRST001' || code === 'PGRST003'
}

export default function PCPTabletOperador() {
  const [ops, setOps] = useState<OP[]>([])
  const [opId, setOpId] = useState('')
  const [found, setFound] = useState(0)
  const [defects, setDefects] = useState(0)
  const [reason, setReason] = useState('')
  const [instrument, setInstrument] = useState('')
  const [blocked, setBlocked] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(() => readQueue().length)

  const load = useCallback(async () => {
    const result = await supabase
      .from('erp_ordens_producao')
      .select('id,numero_op,produto_id,maquina_id,quantidade_planejada')
      .in('status', ['pendente', 'EM_EXECUCAO', 'EM_PRODUCAO', 'em_execucao'])
      .limit(200)

    if (!result.error) setOps((result.data ?? []) as OP[])
  }, [])

  const resolvePayload = useCallback(async (item: PendingApontamento) => {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) throw userError ?? new Error('Sessão do operador não encontrada.')

    const tenant = await supabase.rpc('erp_current_empresa_id')
    if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa não identificada.')

    const selectedOp = ops.find((entry) => entry.id === item.opId)
    let currentOp = selectedOp

    if (!currentOp) {
      const opResult = await supabase
        .from('erp_ordens_producao')
        .select('id,numero_op,produto_id,maquina_id,quantidade_planejada')
        .eq('id', item.opId)
        .maybeSingle()
      if (opResult.error) throw opResult.error
      currentOp = (opResult.data ?? undefined) as OP | undefined
    }

    if (!currentOp) throw new Error('A OP do lançamento não está mais disponível.')
    if (item.defects > item.found) throw new Error('Refugo não pode superar peças encontradas.')
    if (!item.reason.trim()) throw new Error('Motivo de refugo obrigatório.')
    if (!item.instrument.trim()) throw new Error('Instrumento obrigatório.')

    const processResult = await supabase
      .from('erp_receitas_processos')
      .select('processo_id,ferramenta_id,maquina_id')
      .eq('empresa_id', tenant.data)
      .eq('produto_id', currentOp.produto_id ?? '')
      .eq('status', 'APROVADA')
      .order('versao', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (processResult.error) throw processResult.error
    const process = processResult.data as ProcessRecord | null
    if (!process) throw new Error('Não existe receita de processo APROVADA para o produto da OP.')

    const instrumentResult = await supabase
      .from('erp_equipamentos_medicao')
      .select('status,proxima_calibracao')
      .eq('codigo', item.instrument)
      .maybeSingle()

    if (instrumentResult.error) throw instrumentResult.error
    const instrumentData = instrumentResult.data
    const calibrationExpired = Boolean(
      instrumentData?.proxima_calibracao &&
      new Date(instrumentData.proxima_calibracao) < new Date()
    )
    if (!instrumentData || String(instrumentData.status ?? '').toUpperCase() !== 'APROVADO' || calibrationExpired) {
      throw new Error('Instrumento vencido ou não aprovado. Apontamento bloqueado.')
    }

    const good = Math.max(0, item.found - item.defects)
    const startedAt = new Date(item.createdAt).toISOString()

    return {
      empresa_id: tenant.data,
      processo_id: process.processo_id,
      ordem_producao_id: currentOp.id,
      maquina_id: currentOp.maquina_id ?? process.maquina_id,
      ferramenta_id: process.ferramenta_id,
      inicio_em: startedAt,
      fim_em: new Date().toISOString(),
      quantidade_planejada: currentOp.quantidade_planejada,
      quantidade_boa: good,
      quantidade_refugada: item.defects,
      quantidade_reprocessada: 0,
      operador_id: userData.user.id,
      criado_por: userData.user.id,
      client_transaction_id: item.id,
      parametros_reais: {
        instrumento: item.instrument,
        motivo_refugo: item.reason,
        client_transaction_id: item.id
      }
    }
  }, [ops])

  const syncQueue = useCallback(async () => {
    if (!navigator.onLine || busy) return
    const queue = readQueue()
    if (!queue.length) {
      setPendingCount(0)
      return
    }

    setBusy(true)
    setMessage('Sincronizando apontamentos pendentes…')
    try {
      for (const item of queue) {
        const payload = await resolvePayload(item)
        const result = await supabase.from('erp_apontamentos_processo').insert(payload)
        if (result.error && result.error.code !== '23505') throw result.error
        removeFromQueue(item.id)
      }
      setPendingCount(readQueue().length)
      setMessage('Apontamentos sincronizados com sucesso.')
    } catch (error) {
      setPendingCount(readQueue().length)
      if (networkFailure(error)) {
        setMessage('Conexão instável. O apontamento permanece protegido na fila local.')
      } else {
        setMessage(error instanceof Error ? error.message : 'Falha ao sincronizar apontamentos.')
      }
    } finally {
      setBusy(false)
    }
  }, [busy, resolvePayload])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      void syncQueue()
    }
    const handleOffline = () => {
      setOnline(false)
      setMessage('Sem conexão. Novos apontamentos serão protegidos na fila local.')
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [syncQueue])

  useEffect(() => {
    if (online) void syncQueue()
  }, [online, syncQueue])

  const op = ops.find((entry) => entry.id === opId)
  const good = Math.max(0, found - defects)
  const quality = found ? (good / found) * 100 : 0

  const check = async () => {
    if (!instrument.trim()) {
      setBlocked('Instrumento obrigatório.')
      return false
    }
    const result = await supabase
      .from('erp_equipamentos_medicao')
      .select('status,proxima_calibracao')
      .eq('codigo', instrument)
      .maybeSingle()
    if (result.error) {
      setBlocked(result.error.message)
      return false
    }
    const expired = Boolean(result.data?.proxima_calibracao && new Date(result.data.proxima_calibracao) < new Date())
    const invalid = !result.data || String(result.data.status ?? '').toUpperCase() !== 'APROVADO' || expired
    setBlocked(invalid ? 'Instrumento vencido ou não aprovado. Apontamento bloqueado.' : '')
    return !invalid
  }

  const stopMachine = async (motivo: string) => {
    if (!op?.maquina_id) {
      setMessage('OP sem máquina vinculada.')
      return
    }
    setBusy(true)
    try {
      const result = await supabase.rpc('erp_registrar_parada_manutencao', {
        p_maquina_id: op.maquina_id,
        p_ordem_producao_id: op.id,
        p_motivo: motivo
      })
      if (result.error) throw result.error
      setBlocked('MÁQUINA BLOQUEADA PARA MANUTENÇÃO • O.S. ' + String((result.data as { numero_os?: string })?.numero_os ?? ''))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao abrir O.S. de manutenção.')
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    if (busy) return
    if (!op || defects > found || !reason.trim()) {
      setMessage('Selecione a OP e informe o motivo de refugo; defeitos não podem superar encontrados.')
      return
    }
    if (!await check()) return

    const item: PendingApontamento = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      opId,
      found,
      defects,
      reason: reason.trim(),
      instrument: instrument.trim().toUpperCase()
    }

    if (!navigator.onLine) {
      enqueue(item)
      setPendingCount(readQueue().length)
      setMessage('Sem conexão. Apontamento protegido na fila local para sincronização automática.')
      setFound(0)
      setDefects(0)
      setReason('')
      return
    }

    setBusy(true)
    try {
      const payload = await resolvePayload(item)
      const result = await supabase.from('erp_apontamentos_processo').insert(payload)
      if (result.error && result.error.code !== '23505') throw result.error
      setMessage(result.error?.code === '23505'
        ? 'Apontamento já registrado; duplicidade bloqueada.'
        : 'Apontamento gravado no Supabase.')
      setFound(0)
      setDefects(0)
      setReason('')
    } catch (error) {
      if (networkFailure(error)) {
        enqueue(item)
        setPendingCount(readQueue().length)
        setMessage('Conexão instável. Apontamento protegido na fila local.')
        setFound(0)
        setDefects(0)
        setReason('')
      } else {
        setMessage(error instanceof Error ? error.message : 'Falha ao gravar apontamento.')
      }
    } finally {
      setBusy(false)
    }
  }

  const step = (setter: (fn: (value: number) => number) => void, delta: number, max?: number) => {
    if (busy) return
    setter((value) => Math.max(0, Math.min(max ?? Number.POSITIVE_INFINITY, value + delta)))
  }

  const statusText = online ? 'ONLINE' : 'OFFLINE • FILA LOCAL ATIVA'

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100 md:p-6">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-col gap-4 border-b border-slate-700 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={cn(
                'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-black',
                online
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
              )}>
                {online ? <Wifi size={17} /> : <CloudOff size={17} />}
                {statusText}
              </span>
              {pendingCount > 0 && (
                <span className="inline-flex h-10 items-center rounded-full border border-sky-500/40 bg-sky-500/10 px-4 text-sm font-black text-sky-300">
                  {pendingCount} pendente{pendingCount === 1 ? '' : 's'} de sincronização
                </span>
              )}
            </div>
            <p className="mt-3 text-sm font-black text-slate-400">{new Date().toLocaleString('pt-BR')} • CHÃO DE FÁBRICA</p>
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">TERMINAL TOUCH DO OPERADOR</h1>
          </div>
          <button
            type="button"
            onClick={() => void supabase.auth.signOut().then(() => window.location.replace('/login'))}
            className="h-[60px] w-full rounded-xl bg-red-600 text-3xl font-black shadow-lg shadow-red-950/30 transition hover:bg-red-500 md:w-[60px]"
            aria-label="Sair"
          >
            <LogOut className="mx-auto" size={32} />
          </button>
        </header>

        {(message || blocked) && (
          <div className="my-4 rounded-xl border border-slate-700 bg-slate-900 p-4 text-base font-bold md:text-lg">
            {message || blocked}
          </div>
        )}

        <div className="my-5 rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-xl shadow-black/10 md:p-5">
          <label className="block text-sm font-black uppercase tracking-wide text-slate-300">
            Ordem de produção
            <select
              value={opId}
              onChange={(event) => setOpId(event.target.value)}
              className="mt-2 h-[60px] w-full rounded-xl border border-slate-600 bg-slate-950 px-4 text-lg font-black text-white outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
            >
              <option value="">Selecione uma OP real</option>
              {ops.map((entry) => <option key={entry.id} value={entry.id}>OP-{entry.numero_op}</option>)}
            </select>
          </label>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl shadow-black/10">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">Apontamento</p>
              <h2 className="mt-1 text-xl font-black">Produção e refugo</h2>
            </div>

            <div className="space-y-7">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-300">Peças encontradas</h3>
                <div className="mt-3 flex items-center gap-2">
                  {[-10, -1].map((delta) => <button key={delta} type="button" onClick={() => step(setFound, delta)} className="h-[60px] min-w-[68px] rounded-xl bg-slate-700 text-xl font-black transition hover:bg-slate-600">{delta}</button>)}
                  <strong className="min-w-0 flex-1 text-center text-4xl tabular-nums">{found}</strong>
                  {[1, 10].map((delta) => <button key={delta} type="button" onClick={() => step(setFound, delta)} className="h-[60px] min-w-[68px] rounded-xl bg-sky-700 text-xl font-black transition hover:bg-sky-600">+{delta}</button>)}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-300">Refugo</h3>
                <div className="mt-3 flex items-center gap-2">
                  {[-5, -1].map((delta) => <button key={delta} type="button" onClick={() => step(setDefects, delta, found)} className="h-[60px] min-w-[68px] rounded-xl bg-slate-700 text-xl font-black transition hover:bg-slate-600">{delta}</button>)}
                  <strong className="min-w-0 flex-1 text-center text-4xl tabular-nums">{defects}</strong>
                  {[1, 5].map((delta) => <button key={delta} type="button" onClick={() => step(setDefects, delta, found)} className="h-[60px] min-w-[68px] rounded-xl bg-red-700 text-xl font-black transition hover:bg-red-600">+{delta}</button>)}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-black uppercase tracking-wide text-slate-300">
                  Motivo do refugo
                  <input value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 h-[60px] w-full rounded-xl border border-slate-600 bg-slate-950 px-3 text-base font-bold normal-case text-white outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20" />
                </label>
                <label className="text-sm font-black uppercase tracking-wide text-slate-300">
                  Instrumento
                  <input value={instrument} onChange={(event) => setInstrument(event.target.value.toUpperCase())} onBlur={() => void check()} className="mt-2 h-[60px] w-full rounded-xl border border-slate-600 bg-slate-950 px-3 text-base font-bold normal-case text-white outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20" />
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl shadow-black/10">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Conferência</p>
                <h2 className="mt-1 text-xl font-black">Resultado em tempo real</h2>
              </div>
              {pendingCount > 0 && (
                <button type="button" disabled={busy || !online} onClick={() => void syncQueue()} className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 font-black disabled:opacity-50">
                  <RefreshCw size={18} /> Sincronizar
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {[
                ['PLANEJADA', op?.quantidade_planejada ?? 0],
                ['ENCONTRADAS', found],
                ['PEÇAS BOAS', good],
                ['REFUGO', defects],
                ['QUALIDADE', quality.toFixed(1) + '%']
              ].map(([label, value]) => (
                <article key={String(label)} className="rounded-xl border border-slate-700 bg-slate-950 p-4 md:p-5">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</span>
                  <strong className="mt-2 block text-2xl tabular-nums md:text-3xl">{value}</strong>
                </article>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-sky-300">Equação operacional</p>
              <p className="mt-1 text-lg font-black tabular-nums">Peças boas = {found} − {defects} = {good}</p>
            </div>

            <button type="button" onClick={() => void save()} disabled={busy} className="mt-6 h-[60px] w-full rounded-xl bg-emerald-600 text-lg font-black shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-50">
              <CheckCircle className="mr-2 inline" />{busy ? 'GRAVANDO / SINCRONIZANDO…' : 'CONFERIR E GRAVAR APONTAMENTO'}
            </button>
          </section>
        </div>
      </div>
    </main>
  )
}
