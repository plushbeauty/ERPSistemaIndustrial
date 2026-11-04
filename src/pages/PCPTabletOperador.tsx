/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-03
 * @REVISAO: PCP-TABLET-OPERADOR-ATOMIC-01
 * Terminal Touch do Operador — gravação transacional no servidor e fila offline idempotente.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle, CloudOff, LogOut, RefreshCw, ShieldAlert, Wifi } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { relogioDoServidor } from '../lib/serverClock'
import { cn } from '../utils/cn'
import '../styles/synqra-premium.css'

type OP = { id: string; numero_op: number; produto_id: string | null; maquina_id: string | null; quantidade_planejada: number }
type Pending = { id: string; createdAt: string; opId: string; found: number; defects: number; reason: string; instrument: string }
type LoadState = 'loading' | 'success' | 'empty' | 'error'
const QUEUE_KEY = 'erp:pcp:tablet:pending-apontamentos:v2'

function validPending(value: unknown): value is Pending {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.id === 'string' && typeof v.createdAt === 'string' && typeof v.opId === 'string'
    && typeof v.found === 'number' && typeof v.defects === 'number'
    && typeof v.reason === 'string' && typeof v.instrument === 'string'
}
function readQueue(): Pending[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const value: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(value) ? value.filter(validPending) : []
  } catch { return [] }
}
function writeQueue(items: Pending[]) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(items)) }
  catch { throw new Error('Não foi possível proteger o apontamento na fila local deste navegador.') }
}
function isNetworkError(error: unknown) {
  if (!navigator.onLine || error instanceof TypeError) return true
  if (!error || typeof error !== 'object' || !('code' in error)) return false
  const code = String(error.code)
  return code.startsWith('08') || ['PGRST000','PGRST001','PGRST003'].includes(code)
}
function tenantId(value: unknown) { return typeof value === 'string' ? value : '' }

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
  const [pending, setPending] = useState<Pending[]>(() => readQueue())
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState('')
  const [empresaId, setEmpresaId] = useState('')

  const load = useCallback(async () => {
    setLoadState('loading')
    setLoadError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      const company = tenantId(tenant.data)
      if (!company) throw new Error('Empresa da sessão não identificada.')
      const result = await supabase.from('erp_ordens_producao')
        .select('id,numero_op,produto_id,maquina_id,quantidade_planejada')
        .eq('empresa_id', company)
        .in('status', ['pendente','EM_EXECUCAO','EM_PRODUCAO','em_execucao'])
        .order('numero_op', { ascending: false }).limit(200)
      if (result.error) throw result.error
      setEmpresaId(company)
      setOps((result.data ?? []) as OP[])
      setLoadState(result.data?.length ? 'success' : 'empty')
    } catch (cause) {
      setLoadState('error')
      setLoadError(cause instanceof Error ? cause.message : 'Falha ao carregar OPs reais do Supabase.')
    }
  }, [])

  const checkInstrument = useCallback(async (tag: string) => {
    const normalized = tag.trim().toUpperCase()
    setInstrument(normalized)
    setInstrumentValid(false)
    setBlocked('')
    if (!normalized) { setBlocked('TAG do instrumento obrigatória.'); return false }
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      const id = tenantId(company.data)
      if (!id) throw new Error('Empresa da sessão não identificada.')
      const result = await supabase.from('erp_equipamentos_medicao')
        .select('status,proxima_calibracao').eq('empresa_id', id).eq('codigo', normalized).maybeSingle()
      if (result.error) throw result.error
      const clock = await relogioDoServidor()
      if (!clock.agora) throw new Error(clock.aviso || 'Relógio do servidor indisponível.')
      const validDate = result.data?.proxima_calibracao
        ? new Date(result.data.proxima_calibracao + 'T23:59:59-03:00') >= clock.agora
        : false
      const valid = Boolean(result.data) && String(result.data?.status ?? '').trim().toUpperCase() === 'APROVADO' && validDate
      setInstrumentValid(valid)
      if (!valid) setBlocked('TAG bloqueada: instrumento vencido ou não aprovado no banco.')
      return valid
    } catch (cause) {
      setBlocked(cause instanceof Error ? cause.message : 'Falha ao validar instrumento.')
      return false
    }
  }, [])

  const send = useCallback(async (item: Pending) => {
    const result = await supabase.rpc('erp_pcp_tablet_gravar_apontamento', {
      p_client_transaction_id: item.id,
      p_ordem_producao_id: item.opId,
      p_quantidade_encontrada: item.found,
      p_quantidade_refugada: item.defects,
      p_motivo_refugo: item.reason,
      p_instrumento: item.instrument,
      p_data_cliente: item.createdAt,
    })
    if (result.error) throw result.error
    const response = Array.isArray(result.data) ? result.data[0] : result.data
    if (!response?.apontamento_id) throw new Error('O servidor não confirmou o apontamento.')
    return Boolean(response.duplicado)
  }, [])

  const syncQueue = useCallback(async () => {
    if (!navigator.onLine || busy) return
    const items = readQueue()
    if (!items.length) { setPending([]); return }
    setBusy(true)
    setMessage('Sincronizando fila protegida…')
    try {
      for (const item of items) {
        await send(item)
        const remaining = readQueue().filter(entry => entry.id !== item.id)
        writeQueue(remaining)
        setPending(remaining)
      }
      setMessage('SUCCESS · Todos os apontamentos pendentes foram confirmados pelo servidor.')
    } catch (cause) {
      setPending(readQueue())
      setMessage(isNetworkError(cause)
        ? 'OFFLINE · A fila permanece protegida. A sincronização será retomada automaticamente.'
        : cause instanceof Error ? cause.message : 'Falha ao sincronizar a fila.')
    } finally { setBusy(false) }
  }, [busy, send])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const onlineHandler = () => { setOnline(true); void syncQueue() }
    const offlineHandler = () => { setOnline(false); setMessage('OFFLINE · Novos apontamentos ficam pendentes até validação do servidor.') }
    window.addEventListener('online', onlineHandler)
    window.addEventListener('offline', offlineHandler)
    return () => { window.removeEventListener('online', onlineHandler); window.removeEventListener('offline', offlineHandler) }
  }, [syncQueue])
  useEffect(() => { if (online) void syncQueue() }, [online, syncQueue])

  const op = useMemo(() => ops.find(item => item.id === opId), [ops, opId])
  const good = Math.max(0, found - defects)
  const quality = found > 0 ? (good / found) * 100 : 0
  const canSave = !busy && Boolean(op) && found > 0 && defects <= found
    && (defects === 0 || Boolean(reason.trim())) && instrumentValid && Boolean(empresaId)

  const save = async () => {
    if (!canSave || busy) return
    const item: Pending = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), opId,
      found, defects, reason: reason.trim(), instrument: instrument.trim().toUpperCase() }
    if (!navigator.onLine) {
      try {
        const next = [...readQueue(), item]
        writeQueue(next); setPending(next)
        setMessage('OFFLINE · Apontamento armazenado como pendente; não foi contabilizado no PCP.')
        setFound(0); setDefects(0); setReason('')
      } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Falha na fila local.') }
      return
    }
    setBusy(true)
    try {
      const duplicate = await send(item)
      setMessage(duplicate ? 'SUCCESS · Transação já registrada; duplicidade evitada.' : 'SUCCESS · Apontamento confirmado e gravado no Supabase.')
      setFound(0); setDefects(0); setReason('')
    } catch (cause) {
      if (isNetworkError(cause)) {
        try {
          const next = [...readQueue(), item]
          writeQueue(next); setPending(next)
          setMessage('CONEXÃO INSTÁVEL · Apontamento protegido na fila; ainda não contabilizado.')
          setFound(0); setDefects(0); setReason('')
        } catch (queueError) { setMessage(queueError instanceof Error ? queueError.message : 'Falha ao proteger apontamento.') }
      } else setMessage(cause instanceof Error ? cause.message : 'Falha técnica ao gravar apontamento.')
    } finally { setBusy(false) }
  }

  const adjust = (setter: (fn: (value: number) => number) => void, delta: number, max = Number.POSITIVE_INFINITY) => {
    if (!busy) setter(value => Math.max(0, Math.min(max, value + delta)))
  }

  const statePanel = loadState === 'loading'
    ? <div className="rounded-xl border border-slate-200 bg-white p-5">LOADING · Carregando OPs reais do Supabase…</div>
    : loadState === 'error'
      ? <div className="rounded-xl border border-rose-300 bg-rose-50 p-5 text-rose-800"><strong>ERROR · Falha ao carregar OPs</strong><p className="mt-2 break-words text-sm">{loadError}</p><button type="button" onClick={() => void load()} className="mt-4 min-h-[54px] rounded-xl bg-rose-600 px-5 font-black text-white"><RefreshCw className="mr-2 inline" size={18}/> Recarregar</button></div>
      : loadState === 'empty'
        ? <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-800">Nenhuma OP disponível para apontamento nesta empresa.</div>
        : <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-800">OPs carregadas do banco e isoladas pelo tenant.</div>

  return <main className="min-h-screen bg-[#F5F7FB] p-3 text-slate-900 md:p-5"><div className="mx-auto max-w-[1600px]">
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
      <div><div className="flex flex-wrap items-center gap-3">
        <span className={cn('inline-flex min-h-[54px] items-center gap-2 rounded-xl border px-4 text-sm font-black',online?'border-emerald-500/40 bg-emerald-50 text-emerald-800':'border-amber-500/40 bg-amber-50 text-amber-800')}>{online?<Wifi size={18}/>:<CloudOff size={18}/>} {online?'ONLINE':'OFFLINE · FILA LOCAL ATIVA'}</span>
        {pending.length>0&&<span className="inline-flex min-h-[54px] items-center rounded-xl border border-sky-300 bg-[#EEF4FF] px-4 text-sm font-black text-[#1D5FD1]">{pending.length} pendente(s)</span>}
      </div><p className="mt-3 text-xs font-black uppercase tracking-[.16em] text-slate-500">CHÃO DE FÁBRICA · TERMINAL TOUCH</p><h1 className="mt-1 text-2xl font-black md:text-4xl">Terminal Touch do Operador</h1></div>
      <button type="button" disabled={busy} onClick={() => void supabase.auth.signOut().then(() => window.location.replace('/login'))} className="inline-flex h-[60px] items-center justify-center rounded-xl bg-red-600 px-5 text-lg font-black text-white disabled:opacity-50"><LogOut className="mr-2" size={24}/> SAIR DO TERMINAL</button>
    </header>
    <div className="my-5">{statePanel}</div>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6"><label className="block text-sm font-black uppercase text-slate-600">Ordem de produção
      <select value={opId} onChange={e=>setOpId(e.target.value)} disabled={busy||loadState!=='success'} className="mt-2 min-h-[60px] w-full rounded-xl border border-slate-300 bg-[#F5F7FB] px-4 text-lg font-black">
        <option value="">Selecione uma OP real</option>{ops.map(item=><option key={item.id} value={item.id}>OP-{item.numero_op}</option>)}
      </select></label></section>
    <div className="my-5 grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"><p className="text-xs font-black uppercase tracking-widest text-[#1D5FD1]">APONTAMENTO REAL</p><h2 className="mt-1 text-2xl font-black">Produção e refugo</h2>
        <div className="mt-7 space-y-7">
          <div><h3 className="text-sm font-black uppercase text-slate-600">Peças encontradas</h3><div className="mt-3 grid grid-cols-5 gap-2">
            {[-10,-1].map(d=><button key={d} type="button" disabled={busy} onClick={()=>adjust(setFound,d)} className="min-h-[64px] rounded-xl bg-slate-100 text-xl font-black">{d}</button>)}
            <strong className="grid min-h-[64px] place-items-center rounded-xl border bg-[#F5F7FB] text-4xl tabular-nums">{found}</strong>
            {[1,10].map(d=><button key={d} type="button" disabled={busy} onClick={()=>adjust(setFound,d)} className="min-h-[64px] rounded-xl bg-[#1D5FD1] text-xl font-black text-white">+{d}</button>)}
          </div></div>
          <div><h3 className="text-sm font-black uppercase text-slate-600">Refugo</h3><div className="mt-3 grid grid-cols-5 gap-2">
            {[-10,-1].map(d=><button key={d} type="button" disabled={busy} onClick={()=>adjust(setDefects,d,found)} className="min-h-[64px] rounded-xl bg-slate-100 text-xl font-black">{d}</button>)}
            <strong className="grid min-h-[64px] place-items-center rounded-xl border bg-[#F5F7FB] text-4xl tabular-nums">{defects}</strong>
            {[1,10].map(d=><button key={d} type="button" disabled={busy} onClick={()=>adjust(setDefects,d,found)} className="min-h-[64px] rounded-xl bg-red-700 text-xl font-black text-white">+{d}</button>)}
          </div></div>
          <div className="grid gap-4 md:grid-cols-2">
            {defects>0&&<label className="text-sm font-black uppercase text-slate-600">Motivo do refugo · obrigatório<input value={reason} onChange={e=>setReason(e.target.value)} disabled={busy} className="mt-2 min-h-[60px] w-full rounded-xl border border-red-300 bg-[#F5F7FB] px-3 text-base normal-case"/></label>}
            <label className="text-sm font-black uppercase text-slate-600">TAG do paquímetro / instrumento<input value={instrument} onChange={e=>{setInstrument(e.target.value.toUpperCase());setInstrumentValid(false);setBlocked('')}} onBlur={()=>void checkInstrument(instrument)} disabled={busy} placeholder="BIPAR / DIGITAR TAG" className="mt-2 min-h-[60px] w-full rounded-xl border border-slate-300 bg-[#F5F7FB] px-3 text-base font-black uppercase"/>
              <span className={cn('mt-2 flex min-h-[42px] items-center rounded-lg px-3 text-xs font-black',instrumentValid?'bg-emerald-50 text-emerald-800':'bg-rose-50 text-rose-800')}>{instrumentValid?'CALIBRAÇÃO VÁLIDA':'TAG NÃO VALIDADA · GRAVAÇÃO BLOQUEADA'}</span>
            </label>
          </div>
          {blocked&&<div className="flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-800"><ShieldAlert size={20}/><strong>{blocked}</strong></div>}
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"><p className="text-xs font-black uppercase tracking-widest text-emerald-700">CONFERÊNCIA</p><h2 className="mt-1 text-2xl font-black">Resultado em tempo real</h2>
        <div className="mt-6 grid grid-cols-2 gap-3">{[['PLANEJADA',op?.quantidade_planejada??0],['ENCONTRADAS',found],['PEÇAS BOAS',good],['REFUGO',defects],['QUALIDADE',quality.toFixed(1)+'%']].map(([label,value])=><article key={String(label)} className="rounded-xl border border-slate-200 bg-[#F5F7FB] p-4"><span className="text-xs font-black text-slate-500">{label}</span><strong className="mt-2 block text-2xl tabular-nums">{value}</strong></article>)}</div>
        <div className="mt-4 rounded-xl border border-sky-200 bg-[#F5F8FF] p-4"><p className="text-xs font-black text-[#1D5FD1]">EQUAÇÃO OPERACIONAL</p><p className="mt-1 text-lg font-black">Peças boas = encontradas − refugadas</p><p className="text-2xl font-black text-[#1D5FD1]">{found} − {defects} = {good}</p></div>
        {pending.length>0&&<button type="button" disabled={busy||!online} onClick={()=>void syncQueue()} className="mt-4 min-h-[56px] w-full rounded-xl border border-slate-300 bg-slate-50 font-black disabled:opacity-40"><RefreshCw className="mr-2 inline" size={18}/> Sincronizar fila</button>}
        <button type="button" onClick={()=>void save()} disabled={!canSave} className="mt-5 min-h-[68px] w-full rounded-xl bg-emerald-600 px-5 text-lg font-black text-white disabled:bg-slate-300 disabled:text-slate-500"><CheckCircle className="mr-2 inline" size={22}/>{busy?'GRAVANDO / SINCRONIZANDO…':'CONFERIR E GRAVAR APONTAMENTO'}</button>
        <p className="mt-3 text-center text-xs font-bold text-slate-500">{busy?'Operação protegida contra cliques duplicados.':'O botão libera após OP + quantidade + TAG validada.'}</p>
      </section>
    </div>
    {message&&<div role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-800">{message}</div>}
  </div></main>
}
