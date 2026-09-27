import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, RefreshCw, Save, Truck, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Vehicle = { id: string; placa: string; descricao: string | null; capacidade_kg: number }
type Driver = { id: string; nome: string; documento: string | null; cnh: string | null }
type Invoice = {
  id: string
  numero: number
  destinatario_nome: string | null
  destinatario_cidade: string | null
  destinatario_uf: string | null
  peso_liquido: number | null
  peso_bruto: number | null
  status: string
}
type Manifest = { id: string; numero: number; status: string; peso_total_kg: number; data_expedicao: string | null }

const input = 'h-[54px] w-full rounded-md border border-slate-300 bg-white px-3 text-base font-semibold text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100'

export default function ExpedicaoRoteirizacao() {
  const [empresa, setEmpresa] = useState('')
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [manifests, setManifests] = useState<Manifest[]>([])
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set())
  const [vehicle, setVehicle] = useState('')
  const [driver, setDriver] = useState('')
  const [manifestNumber, setManifestNumber] = useState('')
  const [carrier, setCarrier] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [capacityOverride, setCapacityOverride] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const selectedVehicle = vehicles.find(item => item.id === vehicle) ?? null
  const selectedWeight = useMemo(
    () => invoices.filter(item => selectedInvoices.has(item.id)).reduce((sum, item) => sum + Number(item.peso_bruto ?? item.peso_liquido ?? 0), 0),
    [invoices, selectedInvoices],
  )
  const capacity = Number(capacityOverride) > 0 ? Number(capacityOverride) : Number(selectedVehicle?.capacidade_kg ?? 0)
  const occupation = capacity > 0 ? Math.min(100, (selectedWeight / capacity) * 100) : 0
  const overloaded = capacity > 0 && selectedWeight > capacity

  const load = async () => {
    setBusy(true)
    setError('')
    try {
      const current = await supabase.rpc('erp_current_empresa_id')
      if (current.error || !current.data) throw current.error ?? new Error('Empresa ERP não identificada.')
      const empresaId = String(current.data)
      setEmpresa(empresaId)

      const [vehicleResult, driverResult, invoiceResult, manifestResult] = await Promise.all([
        supabase.from('erp_veiculos').select('id,placa,descricao,capacidade_kg').eq('empresa_id', empresaId).eq('ativo', true).order('placa'),
        supabase.from('erp_motoristas').select('id,nome,documento,cnh').eq('empresa_id', empresaId).eq('ativo', true).order('nome'),
        supabase.from('erp_documentos_fiscais').select('id,numero,destinatario_nome,destinatario_cidade,destinatario_uf,peso_liquido,peso_bruto,status').eq('empresa_id', empresaId).eq('status', 'AUTORIZADA').order('numero', { ascending: false }).limit(500),
        supabase.from('erp_expedicoes').select('id,numero,status,peso_total_kg,data_expedicao').eq('empresa_id', empresaId).order('numero', { ascending: false }).limit(30),
      ])
      if (vehicleResult.error) throw vehicleResult.error
      if (driverResult.error) throw driverResult.error
      if (invoiceResult.error) throw invoiceResult.error
      if (manifestResult.error) throw manifestResult.error
      setVehicles((vehicleResult.data ?? []) as Vehicle[])
      setDrivers((driverResult.data ?? []) as Driver[])
      setInvoices((invoiceResult.data ?? []) as Invoice[])
      setManifests((manifestResult.data ?? []) as Manifest[])
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar a logística.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  const toggleInvoice = (id: string) => {
    setSelectedInvoices(previous => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const saveManifest = async () => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (!empresa || !vehicle || !driver) throw new Error('Informe veículo e motorista.')
      const number = Number(manifestNumber)
      if (!Number.isInteger(number) || number <= 0) throw new Error('Informe um número de romaneio válido.')
      if (selectedInvoices.size === 0) throw new Error('Selecione ao menos uma NF autorizada.')
      if (overloaded) throw new Error('A carga excede a capacidade do veículo.')
      const selected = invoices.filter(item => selectedInvoices.has(item.id))
      const created = await supabase.from('erp_expedicoes').insert({
        empresa_id: empresa,
        numero: number,
        status: 'PREPARACAO',
        veiculo_id: vehicle,
        motorista_id: driver,
        transportadora: carrier.trim() || null,
        capacidade_kg: capacity || null,
        peso_total_kg: selectedWeight,
        data_expedicao: date || null,
      }).select('id').single()
      if (created.error) throw created.error

      const lines = selected.map(item => ({
        empresa_id: empresa,
        expedicao_id: created.data.id,
        nota_fiscal_id: item.id,
        peso_kg: Number(item.peso_bruto ?? item.peso_liquido ?? 0),
        cidade: [item.destinatario_cidade, item.destinatario_uf].filter(Boolean).join(' / ') || null,
      }))
      const lineResult = await supabase.from('erp_expedicao_notas').insert(lines)
      if (lineResult.error) {
        await supabase.from('erp_expedicoes').delete().eq('id', created.data.id).eq('empresa_id', empresa)
        throw lineResult.error
      }
      setMessage('Romaneio gravado com as NFs selecionadas.')
      setSelectedInvoices(new Set())
      await load()
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Falha ao gravar o romaneio.')
    } finally {
      setBusy(false)
    }
  }

  const releaseManifest = async (id: string) => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await supabase.from('erp_expedicoes').update({ status: 'LIBERADA', updated_at: new Date().toISOString() }).eq('id', id).eq('empresa_id', empresa).eq('status', 'PREPARACAO')
      if (result.error) throw result.error
      if (result.count === 0) throw new Error('Romaneio não estava em preparação ou não pertence à empresa atual.')
      setMessage('Saída liberada.')
      await load()
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Falha ao liberar a saída.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6">
      <div className="mx-auto max-w-[1800px] space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-sky-700">EXPEDIÇÃO › LOGÍSTICA</p>
            <h1 className="text-3xl font-black text-slate-950">Roteirização e Carregamento de Caminhões</h1>
            <p className="mt-1 font-semibold text-slate-600">Romaneio real, ocupação por peso e liberação controlada de saída.</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={busy} className="flex h-[54px] items-center gap-2 rounded-md border border-slate-300 bg-white px-5 font-black disabled:opacity-50"><RefreshCw size={18}/> ATUALIZAR</button>
        </header>

        {(message || error) && <div className={error ? 'rounded-md border border-rose-300 bg-rose-50 p-4 font-bold text-rose-900' : 'rounded-md border border-emerald-300 bg-emerald-50 p-4 font-bold text-emerald-900'}>{error || message}</div>}

        <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3"><Truck size={24} className="text-sky-700"/><div><h2 className="text-xl font-black">1. Veículo e motorista</h2><p className="text-sm font-semibold text-slate-600">Somente cadastros reais da empresa.</p></div></div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-black">VEÍCULO
                <select className={input} value={vehicle} onChange={event => setVehicle(event.target.value)}><option value="">Selecione</option>{vehicles.map(item => <option key={item.id} value={item.id}>{item.placa} • {item.descricao ?? 'Veículo'} • {Number(item.capacidade_kg).toLocaleString('pt-BR')} kg</option>)}</select>
              </label>
              <label className="grid gap-2 text-sm font-black">MOTORISTA
                <select className={input} value={driver} onChange={event => setDriver(event.target.value)}><option value="">Selecione</option>{drivers.map(item => <option key={item.id} value={item.id}>{item.nome}{item.cnh ? ` • CNH ${item.cnh}` : ''}</option>)}</select>
              </label>
              <label className="grid gap-2 text-sm font-black">NÚMERO DO ROMANEIO<input className={input} type="number" min="1" value={manifestNumber} onChange={event => setManifestNumber(event.target.value)} placeholder="Ex.: 1001"/></label>
              <label className="grid gap-2 text-sm font-black">TRANSPORTADORA<input className={input} value={carrier} onChange={event => setCarrier(event.target.value)} placeholder="Opcional"/></label>
              <label className="grid gap-2 text-sm font-black">DATA DE EXPEDIÇÃO<input className={input} type="date" value={date} onChange={event => setDate(event.target.value)}/></label>
              <label className="grid gap-2 text-sm font-black">CAPACIDADE MANUAL (KG)<input className={input} type="number" min="0" value={capacityOverride} onChange={event => setCapacityOverride(event.target.value)} placeholder={selectedVehicle ? String(selectedVehicle.capacidade_kg) : 'Usar capacidade do veículo'}/></label>
            </div>
          </article>

          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black">2. Performance de carga</h2>
            <p className="mt-4 text-3xl font-black">{selectedWeight.toLocaleString('pt-BR')} kg <span className="text-lg text-slate-500">/ {capacity.toLocaleString('pt-BR')} kg</span></p>
            <progress className="mt-4 h-5 w-full" max={100} value={occupation} aria-label="Ocupação do caminhão"/>
            <div className="mt-2 flex items-center justify-between font-black"><span>{occupation.toFixed(1)}% ocupado</span><span className={overloaded ? 'text-rose-700' : 'text-emerald-700'}>{overloaded ? 'CAPACIDADE EXCEDIDA' : 'DENTRO DA CAPACIDADE'}</span></div>
            <button type="button" onClick={() => void saveManifest()} disabled={busy || overloaded || selectedInvoices.size === 0} className="mt-5 flex h-[54px] w-full items-center justify-center gap-2 rounded-md bg-slate-900 font-black text-white disabled:cursor-not-allowed disabled:opacity-40"><Save size={18}/> GRAVAR MANIFESTO</button>
          </article>
        </section>

        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 p-5"><div><h2 className="text-xl font-black">Notas fiscais autorizadas</h2><p className="text-sm font-semibold text-slate-600">A seleção usa dados fiscais reais; não há fallback fictício.</p></div><span className="rounded-md bg-slate-100 px-3 py-2 font-black">{selectedInvoices.size} selecionada(s)</span></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-slate-100"><tr><th className="h-[54px] px-4 text-left">Selecionar</th><th className="px-4 text-left">NF</th><th className="px-4 text-left">Destinatário</th><th className="px-4 text-left">Destino</th><th className="px-4 text-right">Peso</th><th className="px-4 text-left">Status</th></tr></thead>
              <tbody>
                {invoices.map(item => <tr key={item.id} className="h-[54px] border-t border-slate-200 hover:bg-slate-50"><td className="px-4"><input type="checkbox" className="h-5 w-5" checked={selectedInvoices.has(item.id)} onChange={() => toggleInvoice(item.id)}/></td><td className="px-4 font-black">{item.numero}</td><td className="px-4 font-semibold">{item.destinatario_nome ?? '—'}</td><td className="px-4">{[item.destinatario_cidade, item.destinatario_uf].filter(Boolean).join(' / ') || '—'}</td><td className="px-4 text-right font-semibold">{Number(item.peso_bruto ?? item.peso_liquido ?? 0).toLocaleString('pt-BR')} kg</td><td className="px-4"><span className="rounded-md bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-900"><CheckCircle2 className="mr-1 inline" size={15}/> AUTORIZADA</span></td></tr>)}
                {!invoices.length && <tr><td colSpan={6} className="h-24 text-center font-semibold text-slate-500">Nenhuma NF autorizada encontrada.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="p-5"><h2 className="text-xl font-black">Romaneios recentes</h2></div>
          <table className="w-full min-w-[800px]">
            <thead className="bg-slate-100"><tr><th className="h-[54px] px-4 text-left">Romaneio</th><th className="px-4 text-left">Data</th><th className="px-4 text-right">Peso</th><th className="px-4 text-left">Status</th><th className="px-4 text-right">Ação</th></tr></thead>
            <tbody>{manifests.map(item => <tr key={item.id} className="h-[54px] border-t border-slate-200"><td className="px-4 font-black">{item.numero}</td><td className="px-4">{item.data_expedicao ?? '—'}</td><td className="px-4 text-right">{Number(item.peso_total_kg).toLocaleString('pt-BR')} kg</td><td className="px-4 font-bold">{item.status}</td><td className="px-4 text-right">{item.status === 'PREPARACAO' ? <button type="button" onClick={() => void releaseManifest(item.id)} disabled={busy} className="rounded-md bg-emerald-700 px-4 py-2 font-black text-white disabled:opacity-50">LIBERAR SAÍDA</button> : <span className="text-slate-500">—</span>}</td></tr>)}</tbody>
          </table>
        </section>
      </div>
    </main>
  )
}
