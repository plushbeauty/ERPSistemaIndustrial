import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle, CloudOff, LogOut, RefreshCw, ShieldAlert, Wifi } from 'lucide-react'
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

type LoadState = 'loading' | 'success' | 'empty' | 'error'

const QUEUE_KEY = 'erp:pcp:tablet:pending-apontamentos:v1'

function isPendingApontamento(value: unknown): value is PendingApontamento {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.createdAt === 'string' &&
    typeof item.opId === 'string' &&
    typeof item.found === 'number' &&
    typeof item.defects === 'number' &&
    typeof item.reason === 'string' &&
    typeof item.instrument === 'string'
  )
}

function readQueue(): PendingApontamento[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isPendingApontamento) : []
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
    writeQueue([...queue, item])
  }
}

function removeFromQueue(id: string): void {
  writeQueue(readQueue().filter((entry) => entry.id !== id))
}

function networkFailure(error: unknown): boolean {
  if (!navigator.onLine) return true
  if (error instanceof TypeError) return true
  if (typeof error !== 'object' || error === null || !('code' in error)) return false
  const code = String(error.code)
  return code.startsWith('08') || code === 'PGRST000' || code === 'PGRST001' || code === 'PGRST003'
}

function tenantIdFromRpc(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export default function PCPTabletOperador() {
  const [ops, setOps] = useState<OP[]>([])
  const [opId, setOpId] = useState('')
  const [found, setFound] = useState(0)
  const [defects, setDefects] = useState(0)
  const [reason, setReason] = useState('')
  const [instrument, setInstrument] = useState('')
  const [instrumentValid, setInstrumentValid] = useState(false)
  const [blocked, setBlocked] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(() => readQueue().length)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState('')

  const load = useCallback(async () => {
    setLoadState('loading')
    setLoadError('')

    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      const empresaId = tenantIdFromRpc(tenant.data)
      if (!empresaId) throw new Error('Empresa do operador não identificada pelo contexto multi-tenant.')

      const result = await supabase
        .from('erp_ordens_producao')
        .select('id,numero_op,produto_id,maquina_id,quantidade_planejada')
        .eq('empresa_id', empresaId)
        .in('status', ['pendente', 'EM_EXECUCAO', 'EM_PRODUCAO', 'em_execucao'])
        .order('numero_op', { ascending: false })
        .limit(200)

      if (result.error) throw result.error

      const rows = (result.data ?? []) as OP[]
      setOps(rows)
      setLoadState(rows.length ? 'success' : 'empty')
    } catch (cause) {
      setLoadState('error')
      setLoadError(cause instanceof Error ? cause.message : 'Falha técnica ao carregar as ordens de produção do Supabase.')
    }
  }, [])

  const resolvePayload = useCallback(async (item: PendingApontamento) => {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) throw userError ?? new Error('Sessão do operador não encontrada.')

    const tenant = await supabase.rpc('erp_current_empresa_id')
    if (tenant.error) throw tenant.error
    const empresaId = tenantIdFromRpc(tenant.data)
    if (!empresaId) throw new Error('Empresa do operador não identificada.')

    const selectedOp = ops.find((entry) => entry.id === item.opId)
    let currentOp = selectedOp

    if (!currentOp) {
      const opResult = await supabase
        .from('erp_ordens_producao')
        .select('id,numero_op,produto_id,maquina_id,quantidade_planejada')
        .eq('empresa_id', empresaId)
        .eq('id', item.opId)
        .maybeSingle()
      if (opResult.error) throw opResult.error
      currentOp = (opResult.data ?? undefined) as OP | undefined
    }

    if (!currentOp) throw new Error('A OP do lançamento não está mais disponível.')
    if (item.found <= 0) throw new Error('Informe pelo menos uma peça encontrada.')
    if (item.defects > item.found) throw new Error('Refugo não pode superar peças encontradas.')
    if (!item.reason.trim() && item.defects > 0) throw new Error('Motivo de refugo obrigatório.')
    if (!item.instrument.trim()) throw new Error('TAG do instrumento obrigatória.')

    const processResult = await supabase
      .from('erp_receitas_processos')
      .select('processo_id,ferramenta_id,maquina_id')
      .eq('empresa_id', empresaId)
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
      .eq('empresa_id', empresaId)
      .eq('codigo', item.instrument)
      .maybeSingle()

    if (instrumentResult.error) throw instrumentResult.error
    const instrumentData = instrumentResult.data
    const calibrationExpired = Boolean(
      instrumentData?.proxima_calibracao &&
      new Date(instrumentData.proxima_calibracao + 'T23:59:59') < new Date(),
    )
    const calibrationStatus = String(instrumentData?.status ?? '').trim().toUpperCase()
    if (!instrumentData || calibrationStatus !== 'APROVADO' || calibrationExpired) {
      throw new Error('TAG bloqueada: instrumento vencido ou não aprovado no banco.')
    }

    const good = Math.max(0, item.found - item.defects)
    const startedAt = new Date(item.createdAt).toISOString()

    return {
      empresa_id: empresaId,
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
        client_transaction_id: item.id,
      },
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
      setMessage('SUCCESS · Apontamentos sincronizados com sucesso.')
    } catch (cause) {
      setPendingCount(readQueue().length)
      setMessage(
        networkFailure(cause)
          ? 'OFFLINE · Conexão instável. O apontamento permanece protegido na fila local.'
          : cause instanceof Error
            ? cause.message
            : 'Falha técnica ao sincronizar apontamentos.',
      )
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
      setMessage('OFFLINE · Novos apontamentos serão protegidos na fila local.')
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
  const quality = found > 0 ? (good / found) * 100 : 0
  const canSave = !busy && Boolean(op) && found > 0 && (defects === 0 || reason.trim().length > 0) && instrumentValid
  const statusText = online ? 'ONLINE' : 'OFFLINE • FILA LOCAL ATIVA'

  const check = async () => {
    const normalizedInstrument = instrument.trim().toUpperCase()
    setInstrument(normalizedInstrument)

    if (!normalizedInstrument) {
      setInstrumentValid(false)
      setBlocked('TAG do instrumento obrigatória.')
      return false
    }

    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      const empresaId = tenantIdFromRpc(tenant.data)
      if (!empresaId) throw new Error('Empresa do operador não identificada.')

      const result = await supabase
        .from('erp_equipamentos_medicao')
        .select('status,proxima_calibracao')
        .eq('empresa_id', empresaId)
        .eq('codigo', normalizedInstrument)
        .maybeSingle()

      if (result.error) throw result.error

      const expired = Boolean(
        result.data?.proxima_calibracao &&
        new Date(result.data.proxima_calibracao + 'T23:59:59') < new Date(),
      )
      const approved = String(result.data?.status ?? '').trim().toUpperCase() === 'APROVADO'
      const valid = Boolean(result.data) && approved && !expired

      setInstrumentValid(valid)
      setBlocked(valid ? '' : 'TAG bloqueada: calibração vencida ou instrumento não aprovado no banco.')
      return valid
    } catch (cause) {
      setInstrumentValid(false)
      setBlocked(cause instanceof Error ? cause.message : 'Falha técnica ao validar a TAG no Supabase.')
      return false
    }
  }

  const save = async () => {
    if (busy) return
    if (!canSave) {
      setMessage('DISABLED · Complete OP, quantidade, refugo, motivo quando aplicável e TAG calibrada antes de gravar.')
      return
    }

    const item: PendingApontamento = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      opId,
      found,
      defects,
      reason: reason.trim(),
      instrument: instrument.trim().toUpperCase(),
    }

    if (!navigator.onLine) {
      enqueue(item)
      setPendingCount(readQueue().length)
      setMessage('OFFLINE · Apontamento protegido na fila local para sincronização automática.')
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

      setMessage(
        result.error?.code === '23505'
          ? 'SUCCESS · Apontamento já registrado; duplicidade bloqueada.'
          : 'SUCCESS · Apontamento gravado no Supabase.',
      )
      setFound(0)
      setDefects(0)
      setReason('')
    } catch (cause) {
      if (networkFailure(cause)) {
        enqueue(item)
        setPendingCount(readQueue().length)
        setMessage('OFFLINE · Conexão instável. Apontamento protegido na fila local.')
        setFound(0)
        setDefects(0)
        setReason('')
      } else {
        setMessage(cause instanceof Error ? cause.message : 'Falha técnica ao gravar apontamento.')
      }
    } finally {
      setBusy(false)
    }
  }

  const step = (
    setter: (update: (value: number) => number) => void,
    delta: number,
    max = Number.POSITIVE_INFINITY,
  ) => {
    if (busy) return
    setter((value) => Math.max(0, Math.min(max, value + delta)))
  }

  const statePanel = loadState === 'loading'
    ? <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-slate-200">LOADING · Carregando OPs reais do Supabase…</div>
    : loadState === 'error'
      ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/50 p-5 text-rose-100">
          <strong>ERROR · Falha técnica do Supabase</strong>
          <p className="mt-2 break-words text-sm">{loadError}</p>
          <button type="button" onClick={() => void load()} className="mt-4 min-h-[60px] rounded-xl bg-rose-600 px-5 font-black text-white hover:bg-rose-500">
            <RefreshCw className="mr-2 inline" size={18} /> Recarregar OPs
          </button>
        </div>
      )
      : loadState === 'empty'
        ? <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-5 text-amber-100">EMPTY · Nenhuma OP disponível para o operador nesta empresa.</div>
        : <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-5 text-emerald-100">SUCCESS · OPs carregadas do banco e isoladas pelo contexto da empresa.</div>

  return (
    <main className="min-h-screen bg-[#05050a] p-3 text-slate-100 md:p-5">
      <div className="mx-auto max-w-[1600px]">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={cn(
                'inline-flex min-h-[54px] items-center gap-2 rounded-xl border px-4 text-sm font-black',
                online
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-300',
              )}>
                {online ? <Wifi size={18} /> : <CloudOff size={18} />}
                {statusText}
              </span>
              {pendingCount > 0 && (
                <span className="inline-flex min-h-[54px] items-center rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 text-sm font-black text-sky-300">
                  {pendingCount} pendente{pendingCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
            <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">CHÃO DE FÁBRICA · TERMINAL TOUCH</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white md:text-4xl">Terminal Touch do Operador</h1>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void supabase.auth.signOut().then(() => window.location.replace('/login'))}
            className="inline-flex h-[64px] w-full items-center justify-center rounded-xl bg-red-600 px-5 text-lg font-black text-white shadow-xl shadow-red-950/40 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
            aria-label="Sair do terminal tablet"
          >
            <LogOut className="mr-2" size={26} />
            ❌ SAIR DO TERMINAL TABLET
          </button>
        </header>

        <div className="my-5">{statePanel}</div>

        <section className="rounded-2xl border border-slate-800 bg-[#0f172a] p-4 shadow-2xl md:p-6">
          <label className="block text-sm font-black uppercase tracking-wide text-slate-300">
            Ordem de produção
            <select
              value={opId}
              onChange={(event) => setOpId(event.target.value)}
              disabled={busy || loadState !== 'success'}
              className="mt-2 min-h-[60px] w-full rounded-xl border border-slate-700 bg-[#05050a] px-4 text-lg font-black text-white outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Selecione uma OP real</option>
              {ops.map((entry) => (
                <option key={entry.id} value={entry.id}>OP-{entry.numero_op}</option>
              ))}
            </select>
          </label>
        </section>

        <div className="my-5 grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-[#0f172a] p-5 shadow-2xl md:p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">APONTAMENTO REAL</p>
            <h2 className="mt-1 text-2xl font-black text-white">Produção e refugo</h2>

            <div className="mt-7 space-y-7">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-300">Peças encontradas</h3>
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {[-10, -1].map((delta) => (
                    <button key={delta} type="button" disabled={busy} onClick={() => step(setFound, delta)} className="min-h-[64px] rounded-xl bg-slate-700 text-xl font-black text-white hover:bg-slate-600 disabled:opacity-40">{delta}</button>
                  ))}
                  <strong className="grid min-h-[64px] place-items-center rounded-xl border border-slate-700 bg-[#05050a] text-4xl tabular-nums text-white">{found}</strong>
                  {[1, 10].map((delta) => (
                    <button key={delta} type="button" disabled={busy} onClick={() => step(setFound, delta)} className="min-h-[64px] rounded-xl bg-sky-700 text-xl font-black text-white hover:bg-sky-600 disabled:opacity-40">+{delta}</button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-300">Refugo</h3>
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {[-10, -1].map((delta) => (
                    <button key={delta} type="button" disabled={busy} onClick={() => step(setDefects, delta, found)} className="min-h-[64px] rounded-xl bg-slate-700 text-xl font-black text-white hover:bg-slate-600 disabled:opacity-40">{delta}</button>
                  ))}
                  <strong className="grid min-h-[64px] place-items-center rounded-xl border border-slate-700 bg-[#05050a] text-4xl tabular-nums text-white">{defects}</strong>
                  {[1, 10].map((delta) => (
                    <button key={delta} type="button" disabled={busy} onClick={() => step(setDefects, delta, found)} className="min-h-[64px] rounded-xl bg-red-700 text-xl font-black text-white hover:bg-red-600 disabled:opacity-40">+{delta}</button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {defects > 0 && (
                  <label className="text-sm font-black uppercase tracking-wide text-slate-300">
                    Motivo do refugo · obrigatório
                    <input
                      required
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      disabled={busy}
                      className="mt-2 min-h-[60px] w-full rounded-xl border border-red-500/50 bg-[#05050a] px-3 text-base font-bold normal-case text-white outline-none focus:border-red-400 disabled:opacity-50"
                    />
                  </label>
                )}
                <label className="text-sm font-black uppercase tracking-wide text-slate-300">
                  TAG do paquímetro / instrumento
                  <input
                    value={instrument}
                    onChange={(event) => {
                      setInstrument(event.target.value.toUpperCase())
                      setInstrumentValid(false)
                      setBlocked('')
                    }}
                    onBlur={() => void check()}
                    disabled={busy}
                    placeholder="BIPAR / DIGITAR TAG"
                    className="mt-2 min-h-[60px] w-full rounded-xl border border-slate-600 bg-[#05050a] px-3 text-base font-black uppercase text-white outline-none focus:border-sky-400 disabled:opacity-50"
                  />
                  <span className={cn(
                    'mt-2 flex min-h-[44px] items-center rounded-lg px-3 text-xs font-black',
                    instrumentValid
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : 'bg-rose-500/10 text-rose-300',
                  )}>
                    {instrumentValid ? 'CALIBRAÇÃO VÁLIDA · APONTAMENTO LIBERADO' : 'TAG NÃO VALIDADA · BOTÃO MESTRE BLOQUEADO'}
                  </span>
                </label>
              </div>

              {blocked && (
                <div className="flex items-start gap-3 rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-rose-100">
                  <ShieldAlert className="mt-0.5 shrink-0" size={20} />
                  <strong>{blocked}</strong>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#0f172a] p-5 shadow-2xl md:p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">CONFERÊNCIA</p>
            <h2 className="mt-1 text-2xl font-black text-white">Resultado em tempo real</h2>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                ['PLANEJADA', op?.quantidade_planejada ?? 0],
                ['ENCONTRADAS', found],
                ['PEÇAS BOAS', good],
                ['REFUGO', defects],
                ['QUALIDADE', quality.toFixed(1) + '%'],
              ].map(([label, value]) => (
                <article key={String(label)} className="rounded-xl border border-slate-800 bg-[#05050a] p-4">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
                  <strong className="mt-2 block text-2xl tabular-nums text-white md:text-3xl">{value}</strong>
                </article>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-sky-300">Equação operacional</p>
              <p className="mt-1 text-xl font-black tabular-nums text-white">Peças Boas = Peças Encontradas − Peças Defeituosas</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-sky-300">{found} − {defects} = {good}</p>
            </div>

            {pendingCount > 0 && (
              <button
                type="button"
                disabled={busy || !online}
                onClick={() => void syncQueue()}
                className="mt-4 inline-flex min-h-[60px] w-full items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 font-black text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RefreshCw size={18} /> Sincronizar fila
              </button>
            )}

            <button
              type="button"
              onClick={() => void save()}
              disabled={!canSave}
              className="mt-5 min-h-[68px] w-full rounded-xl bg-emerald-600 px-5 text-lg font-black text-white shadow-xl shadow-emerald-950/40 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              <CheckCircle className="mr-2 inline" size={22} />
              {busy ? 'GRAVANDO / SINCRONIZANDO…' : 'CONFERIR E GRAVAR APONTAMENTO'}
            </button>

            <p className="mt-3 text-center text-xs font-bold text-slate-500">
              {busy ? 'DISABLED · Operação protegida contra cliques duplicados.' : 'O botão mestre só libera após OP + quantidade + TAG calibrada válida.'}
            </p>
          </section>
        </div>

        {message && (
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm font-bold text-slate-200" role="status">
            {message}
          </div>
        )}
      </div>
    </main>
  )
}
