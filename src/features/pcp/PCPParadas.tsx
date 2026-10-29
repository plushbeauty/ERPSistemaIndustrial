import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Square, Wrench } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Machine = { id: string; codigo: string; nome: string }
type Order = { id: string; numero_op: string | null }
type ActiveStop = { id: string; maquina_id: string; ordem_producao_id: string | null; motivo: string; inicio: string; observacao: string | null }

const reasons = ['MANUTENÇÃO MECÂNICA / ELÉTRICA', 'TROCA DE MOLDE / SETUP', 'FALTA DE MATÉRIA-PRIMA', 'FALTA DE OPERADOR / REFEIÇÃO']

export default function PCPParadas() {
  const [companyId, setCompanyId] = useState('')
  const [machines, setMachines] = useState<Machine[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [machine, setMachine] = useState('')
  const [order, setOrder] = useState('')
  const [observation, setObservation] = useState('')
  const [active, setActive] = useState<ActiveStop | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const empresaId = String(tenant.data)
      const [machineResult, orderResult, stopResult] = await Promise.all([
        supabase.from('erp_maquinas').select('id,codigo,nome').eq('empresa_id', empresaId).eq('ativo', true).order('codigo'),
        supabase.from('erp_ordens_producao').select('id,numero_op').eq('empresa_id', empresaId).order('created_at', { ascending: false }),
        supabase.from('erp_producao_paradas').select('id,maquina_id,ordem_producao_id,motivo,inicio,observacao').eq('empresa_id', empresaId).eq('status', 'ABERTA').is('fim', null).is('ordem_manutencao_id', null).order('inicio', { ascending: false }).limit(1).maybeSingle(),
      ])
      const failure = machineResult.error ?? orderResult.error ?? stopResult.error
      if (failure) throw failure
      setCompanyId(empresaId)
      setMachines((machineResult.data ?? []) as Machine[])
      setOrders((orderResult.data ?? []) as Order[])
      const current = stopResult.data as ActiveStop | null
      setActive(current)
      if (current) {
        setMachine(current.maquina_id)
        setOrder(current.ordem_producao_id ?? '')
        setObservation(current.observacao ?? '')
        setElapsed(Math.max(0, Math.floor((Date.now() - new Date(current.inicio).getTime()) / 1000)))
      } else {
        setElapsed(0)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as paradas persistidas.')
    }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(active.inicio).getTime()) / 1000))), 1000)
    return () => window.clearInterval(timer)
  }, [active])

  const elapsedText = [Math.floor(elapsed / 3600), Math.floor(elapsed / 60) % 60, elapsed % 60].map((part) => String(part).padStart(2, '0')).join(':')

  const start = async (reason: string) => {
    if (!companyId || !machine) { setError('Selecione uma máquina antes de registrar a parada.'); return }
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await supabase.from('erp_producao_paradas').insert({
        empresa_id: companyId,
        maquina_id: machine,
        ordem_producao_id: order || null,
        motivo: reason,
        inicio: new Date().toISOString(),
        observacao: observation.trim() || null,
        status: 'ABERTA',
      }).select('id,maquina_id,ordem_producao_id,motivo,inicio,observacao').single()
      if (result.error) throw result.error
      setActive(result.data as ActiveStop)
      setNotice('Parada registrada no banco. O cronômetro acompanha o evento persistido.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível registrar a parada.')
    } finally { setBusy(false) }
  }

  const close = async () => {
    if (!companyId || !active) { setError('Não há parada persistida para encerrar.'); return }
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await supabase.from('erp_producao_paradas').update({ fim: new Date().toISOString(), status: 'ENCERRADA', observacao: observation.trim() || null }).eq('empresa_id', companyId).eq('id', active.id).eq('status', 'ABERTA').is('fim', null).select('id').maybeSingle()
      if (result.error) throw result.error
      if (!result.data) throw new Error('A parada não está mais aberta ou não pertence à empresa atual.')
      setActive(null); setElapsed(0); setNotice('Evento encerrado no banco e confirmado pela linha atualizada.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível encerrar a parada.')
    } finally { setBusy(false) }
  }

  return (
    <section className="space-y-3 p-2 text-slate-800">
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#123b50] text-white"><Wrench size={16} /></span>
        <div><p className="text-[10px] font-bold uppercase tracking-widest text-[#2d8db8]">Manufatura / PCP</p><h2 className="text-sm font-extrabold">Paradas e setup de máquina</h2><p className="text-[11px] text-slate-500">Registro persistente com escopo da empresa e confirmação das gravações.</p></div>
        <div className="ml-auto flex gap-1"><button type="button" onClick={() => void load()} disabled={busy} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-bold"><RefreshCw size={12} /> Atualizar</button><button type="button" onClick={() => void close()} disabled={busy || !active} className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#123b50] px-3 text-xs font-bold text-white disabled:opacity-40"><Square size={12} /> Encerrar evento</button></div>
      </header>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">{notice}</p>}
      <div className="grid gap-3 lg:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Máquina<select className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-normal normal-case text-slate-800 disabled:bg-slate-50" value={machine} disabled={Boolean(active) || busy} onChange={(event) => setMachine(event.target.value)}><option value="">Selecionar máquina</option>{machines.map((entry) => <option key={entry.id} value={entry.id}>{entry.codigo} · {entry.nome}</option>)}</select></label>
            <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Ordem de produção<select className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-normal normal-case text-slate-800 disabled:bg-slate-50" value={order} disabled={Boolean(active) || busy} onChange={(event) => setOrder(event.target.value)}><option value="">Sem vínculo a OP</option>{orders.map((entry) => <option key={entry.id} value={entry.id}>{entry.numero_op ?? entry.id.slice(0, 8)}</option>)}</select></label>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tempo decorrido</span><p className="mt-1 font-mono text-3xl font-extrabold text-amber-700">{elapsedText}</p><p className="mt-1 text-[10px] text-slate-500">{active ? 'Evento ativo recuperado do Supabase' : 'Nenhuma parada ativa registrada'}</p></div>
          {active && <p className="text-xs font-bold text-slate-700">Motivo: {active.motivo} · Início: {new Date(active.inicio).toLocaleString('pt-BR')}</p>}
          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Observação<textarea className="min-h-20 rounded-lg border border-slate-200 p-2 text-xs font-normal normal-case text-slate-800 disabled:bg-slate-50" value={observation} disabled={Boolean(active) || busy} onChange={(event) => setObservation(event.target.value)} placeholder="Observação operacional" /></label>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-3"><h3 className="text-xs font-extrabold">Registrar motivo da parada</h3><div className="mt-3 grid gap-2">{reasons.map((reason) => <button key={reason} type="button" disabled={busy || Boolean(active) || !machine} onClick={() => void start(reason)} className="min-h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-700 hover:border-[#2d8db8] hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40">{reason}</button>)}</div></section>
      </div>
    </section>
  )
}
