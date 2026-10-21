import { useEffect, useState } from 'react'
import { RefreshCw, Square } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import '../styles/synqra-premium.css'

type Machine = { id: string; codigo: string; nome: string }
type Order = { id: string; numero_op: string | null; numero: string | null }
type OpenStop = { id: string; maquina_id: string; ordem_producao_id: string | null; motivo: string; inicio: string; observacao: string | null }

const reasons = [
  ['MANUTENÇÃO MECÂNICA / ELÉTRICA', 'bg-orange-500'],
  ['TROCA DE MOLDE / SETUP', 'bg-blue-600'],
  ['FALTA DE MATÉRIA-PRIMA', 'bg-rose-600'],
  ['FALTA DE OPERADOR / REFEIÇÃO', 'bg-slate-600'],
] as const

export default function PCPParadas() {
  const [companyId, setCompanyId] = useState('')
  const [machines, setMachines] = useState<Machine[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [machine, setMachine] = useState('')
  const [order, setOrder] = useState('')
  const [reason, setReason] = useState('')
  const [observation, setObservation] = useState('')
  const [stopId, setStopId] = useState('')
  const [started, setStarted] = useState<Date | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const id = String(company.data)
      const [machineRows, orderRows, openStop] = await Promise.all([
        fetchAllPages<Machine>((from, to) => supabase.from('erp_maquinas')
          .select('id,codigo,nome', { count: 'exact' })
          .eq('empresa_id', id).eq('ativo', true).order('codigo').range(from, to)),
        fetchAllPages<Order>((from, to) => supabase.from('erp_ordens_producao')
          .select('id,numero_op,numero', { count: 'exact' })
          .eq('empresa_id', id).order('created_at', { ascending: false }).range(from, to)),
        supabase.from('erp_producao_paradas')
          .select('id,maquina_id,ordem_producao_id,motivo,inicio,observacao')
          .eq('empresa_id', id).eq('status', 'ABERTA').is('fim', null).is('ordem_manutencao_id', null)
          .order('inicio', { ascending: false }).limit(1).maybeSingle(),
      ])
      if (openStop.error) throw openStop.error
      setCompanyId(id)
      setMachines(machineRows)
      setOrders(orderRows)
      if (openStop.data) {
        const activeStop = openStop.data as OpenStop
        setStopId(activeStop.id)
        setMachine(activeStop.maquina_id)
        setOrder(activeStop.ordem_producao_id ?? '')
        setReason(activeStop.motivo)
        setObservation(activeStop.observacao ?? '')
        const startAt = new Date(activeStop.inicio)
        setStarted(startAt)
        setElapsed(Math.max(0, Math.floor((Date.now() - startAt.getTime()) / 1000)))
      } else {
        setStopId('')
        setStarted(null)
        setReason('')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os dados de produção.')
    }
  }

  useEffect(() => { void load() }, [])
  useEffect(() => {
    if (!started) return
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started.getTime()) / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [started])

  const formatElapsed = (seconds: number) =>
    [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
      .map(value => String(value).padStart(2, '0')).join(':')

  async function start(reasonText: string) {
    if (!companyId || !machine) {
      setError('Selecione uma máquina antes de iniciar a parada.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    const startAt = new Date()
    try {
      const result = await supabase.from('erp_producao_paradas')
        .insert({
          empresa_id: companyId,
          maquina_id: machine,
          ordem_producao_id: order || null,
          motivo: reasonText,
          inicio: startAt.toISOString(),
          observacao: observation.trim() || null,
          status: 'ABERTA',
        })
        .select('id')
        .single()
      if (result.error) throw result.error
      setStopId(result.data.id)
      setReason(reasonText)
      setStarted(startAt)
      setElapsed(0)
      setMessage('Parada registrada no ERP e cronômetro iniciado.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível registrar a parada.')
    } finally {
      setBusy(false)
    }
  }

  async function close() {
    if (!companyId || !stopId || !started) {
      setError('Não há uma parada persistida para encerrar.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await supabase.from('erp_producao_paradas')
        .update({ fim: new Date().toISOString(), status: 'ENCERRADA', observacao: observation.trim() || null })
        .eq('empresa_id', companyId).eq('id', stopId).eq('status', 'ABERTA').is('fim', null)
        .select('id')
        .maybeSingle()
      if (result.error) throw result.error
      if (!result.data) throw new Error('A parada não está mais aberta ou não pertence à empresa atual.')
      setStopId('')
      setStarted(null)
      setElapsed(0)
      setReason('')
      setMessage('Evento encerrado e gravado no histórico de produção.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível encerrar a parada.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F8FF] p-3 text-[#0B2545]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCE3EE] pb-3">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-[#1D5FD1]">PCP &gt; PARADAS / SETUP</p>
          <h1 className="text-[16px] font-extrabold">Registro de Parada de Máquina</h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} disabled={busy} className="h-[30px] rounded-lg border border-[#D3DCE8] bg-white px-3 text-xs font-bold text-[#0B2545] disabled:opacity-50">
            <RefreshCw className="mr-2 inline" size={17} />Atualizar
          </button>
          <button type="button" onClick={() => void close()} disabled={busy || !stopId} className="h-[30px] rounded-lg bg-[#1D5FD1] px-3 text-xs font-bold text-white disabled:opacity-40">
            <Square className="mr-2 inline" size={17} />FECHAR EVENTO
          </button>
        </div>
      </header>

      {(error || message) && <div role={error ? 'alert' : 'status'} className={`mx-auto mt-3 max-w-[1600px] rounded-lg border p-2 text-[11px] font-bold ${error ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}>{error || message}</div>}

      <div className="mx-auto mt-3 grid max-w-[1600px] grid-cols-1 gap-3 lg:grid-cols-2">
        <section className="rounded-lg border border-[#DCE3EE] bg-white p-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-[11px] font-bold tracking-wider text-[#334155]">MÁQUINA
              <select value={machine} disabled={Boolean(stopId) || busy} onChange={event => setMachine(event.target.value)} className="h-[30px] rounded-lg border border-[#D3DCE8] bg-white px-2 text-xs text-[#0B2545]">
                <option value="">Selecionar máquina</option>
                {machines.map(entry => <option key={entry.id} value={entry.id}>{entry.codigo} — {entry.nome}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-[11px] font-bold tracking-wider text-[#334155]">ORDEM DE PRODUÇÃO
              <select value={order} disabled={Boolean(stopId) || busy} onChange={event => setOrder(event.target.value)} className="h-[30px] rounded-lg border border-[#D3DCE8] bg-white px-2 text-xs text-[#0B2545]">
                <option value="">Sem vínculo a OP</option>
                {orders.map(entry => <option key={entry.id} value={entry.id}>{entry.numero_op || entry.numero || entry.id.slice(0, 8)}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-3 rounded-lg border border-[#E4E9F2] bg-[#F5F8FF] p-3 text-center">
            <span className="text-[11px] font-bold tracking-wider text-[#5B6B82]">TEMPO DE PARADA</span>
            <div className="mt-1 font-mono text-3xl font-bold text-[#b7791f]">{formatElapsed(elapsed)}</div>
          </div>
          {reason && <p className="mt-2 text-xs font-bold text-[#8a5a13]">Motivo registrado: {reason}</p>}
        </section>

        <section className="rounded-lg border border-[#DCE3EE] bg-white p-3">
          <h2 className="text-xs font-extrabold tracking-wider text-[#0B2545]">MOTIVO OBRIGATÓRIO</h2>
          <div className="mt-3 grid gap-2">
            {reasons.map(([label, color]) => (
              <button key={label} type="button" disabled={busy || Boolean(stopId) || !machine} onClick={() => void start(label)} className={`min-h-[30px] rounded-lg border border-slate-200 px-3 py-1 text-left text-xs leading-tight font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${color}`}>
                {label}
              </button>
            ))}
          </div>
          <label className="mt-3 grid gap-1 text-[11px] font-bold tracking-wider text-[#334155]">OBSERVAÇÃO
            <textarea disabled={Boolean(stopId) || busy} className="min-h-[64px] w-full rounded-lg border border-[#D3DCE8] bg-white p-2 text-[11px] text-[#0B2545] disabled:opacity-70" value={observation} onChange={event => setObservation(event.target.value)} placeholder="Observação do operador"/>
          </label>
        </section>
      </div>
    </main>
  )
}
