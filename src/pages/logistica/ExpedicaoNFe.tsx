/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
/**
 * SYSNQRA ERP & SGQ INDUSTRIAL
 * REV-LOG-EXPEDICAO-NFE-001 | 2026-10-21
 * Escopo: controle de portaria para entrada/saída de NF-e; sem alterar telas congeladas.
 * Dados persistidos no PostgreSQL e isolados por empresa via erp_current_empresa_id() + RLS.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, RefreshCw, Search, Truck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'

type Fluxo = 'ENTRADA' | 'SAIDA'
type Status = 'AGUARDANDO_CONFERENCIA' | 'LIBERADO' | 'REJEITADO'
type Registro = {
  id: string
  numero_nfe: number
  chave_acesso: string
  tipo_fluxo: Fluxo
  parceiro_comercial: string
  transportadora: string | null
  placa_veiculo: string | null
  status_expedicao: Status
  data_movimentacao: string
}
const inputClass = 'h-9 w-full min-w-0 rounded-sm border border-slate-300 bg-white px-3 text-xs text-slate-800 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600/20'
const labelClass = 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500'
const statusClass: Record<Status, string> = {
  AGUARDANDO_CONFERENCIA: 'bg-amber-50 text-amber-800 ring-amber-200',
  LIBERADO: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  REJEITADO: 'bg-rose-50 text-rose-800 ring-rose-200',
}
export default function ExpedicaoNFe() {
  const [empresa, setEmpresa] = useState('')
  const [rows, setRows] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState<Fluxo>('SAIDA')
  const [numero, setNumero] = useState('')
  const [chave, setChave] = useState('')
  const [parceiro, setParceiro] = useState('')
  const [transportadora, setTransportadora] = useState('')
  const [placa, setPlaca] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const companyId = String(tenant.data)
      setEmpresa(companyId)
      const result = await fetchAllPages<Registro>((from, to) => supabase
        .from('erp_expedicao_nfe')
        .select('id,numero_nfe,chave_acesso,tipo_fluxo,parceiro_comercial,transportadora,placa_veiculo,status_expedicao,data_movimentacao', { count: 'exact' })
        .eq('empresa_id', companyId)
        .order('data_movimentacao', { ascending: false })
        .range(from, to))
      setRows(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar a esteira de NF-e.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    const q = busca.trim().toLocaleLowerCase('pt-BR')
    if (!q) return rows
    return rows.filter(row =>
      String(row.numero_nfe).includes(q) ||
      row.chave_acesso.includes(q) ||
      row.parceiro_comercial.toLocaleLowerCase('pt-BR').includes(q) ||
      (row.transportadora ?? '').toLocaleLowerCase('pt-BR').includes(q) ||
      (row.placa_veiculo ?? '').toLocaleLowerCase('pt-BR').includes(q))
  }, [rows, busca])

  async function registrar() {
    setError('')
    setMessage('')
    const n = Number(numero)
    const key = chave.replace(/\s/g, '')
    if (!empresa) { setError('Empresa da sessão não identificada.'); return }
    if (!Number.isInteger(n) || n <= 0 || !/^\d{44}$/.test(key) || !parceiro.trim()) {
      setError('Informe número inteiro positivo, chave de acesso com 44 dígitos e parceiro comercial.')
      return
    }
    setSaving(true)
    try {
      const result = await supabase.from('erp_expedicao_nfe').insert({
        empresa_id: empresa,
        numero_nfe: n,
        chave_acesso: key,
        tipo_fluxo: tipo,
        parceiro_comercial: parceiro.trim(),
        transportadora: transportadora.trim() || null,
        placa_veiculo: placa.trim().toUpperCase() || null,
        status_expedicao: 'AGUARDANDO_CONFERENCIA',
      })
      if (result.error) throw result.error
      setMessage(`NF-e ${n} registrada e aguardando conferência documental.`)
      setNumero(''); setChave(''); setParceiro(''); setTransportadora(''); setPlaca('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao gravar a movimentação no PostgreSQL.')
    } finally {
      setSaving(false)
    }
  }

  async function atualizarStatus(row: Registro, status: 'LIBERADO' | 'REJEITADO') {
    setError(''); setMessage(''); setSaving(true)
    try {
      if (!empresa) throw new Error('Empresa da sessão não identificada.')
      const result = await supabase.from('erp_expedicao_nfe')
        .update({ status_expedicao: status })
        .eq('id', row.id).eq('empresa_id', empresa).eq('status_expedicao', 'AGUARDANDO_CONFERENCIA')
        .select('id').maybeSingle()
      if (result.error) throw result.error
      if (!result.data) throw new Error('Registro não atualizado: confira permissões e status atual.')
      setMessage(`NF-e ${row.numero_nfe}: ${status === 'LIBERADO' ? 'liberada' : 'rejeitada'}.`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao atualizar a conferência.')
    } finally { setSaving(false) }
  }

  return <main className="min-h-full bg-slate-50 p-4 text-slate-800 md:p-6">
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
      <div><div className="flex items-center gap-2"><Truck className="text-sky-700" size={21}/><h1 className="text-lg font-bold tracking-tight text-[#123B50]">Expedição e Fluxo de Notas Fiscais</h1><span className="rounded-sm bg-sky-100 px-2 py-1 text-[9px] font-bold uppercase text-sky-800">Portaria</span></div><p className="mt-1 text-xs text-slate-500">Registro, conferência documental e liberação de entrada/saída de NF-e.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-9 items-center gap-2 border border-slate-300 bg-white px-3 text-xs font-semibold hover:bg-slate-100 disabled:opacity-50"><RefreshCw size={14}/> Atualizar</button>
    </header>
    {(error || message) && <div role={error ? 'alert' : 'status'} className={`mb-4 border px-3 py-2 text-xs ${error ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}>{error || message}</div>}
    <section className="mb-5 border border-slate-200 bg-white p-4 shadow-[0_3px_12px_rgba(18,59,80,0.06)]">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-[#123B50]">Registrar movimentação</h2>
      <div className="grid grid-cols-12 items-end gap-3">
        <div className="col-span-12 sm:col-span-3"><label className={labelClass}>Direção do fluxo</label><select className={inputClass} value={tipo} onChange={e => setTipo(e.target.value as Fluxo)}><option value="SAIDA">Saída / faturamento</option><option value="ENTRADA">Entrada / recebimento</option></select></div>
        <div className="col-span-12 sm:col-span-2"><label className={labelClass}>Número NF-e</label><input className={inputClass} inputMode="numeric" value={numero} onChange={e => setNumero(e.target.value.replace(/\D/g, ''))} placeholder="Ex.: 15042"/></div>
        <div className="col-span-12 sm:col-span-7"><label className={labelClass}>Chave de acesso (44 dígitos)</label><input className={inputClass} inputMode="numeric" maxLength={44} value={chave} onChange={e => setChave(e.target.value.replace(/\D/g, '').slice(0,44))} placeholder="Chave numérica da NF-e"/></div>
        <div className="col-span-12 md:col-span-6"><label className={labelClass}>Cliente / fornecedor</label><input className={inputClass} maxLength={255} value={parceiro} onChange={e => setParceiro(e.target.value)} placeholder="Razão social do parceiro"/></div>
        <div className="col-span-12 sm:col-span-4 md:col-span-4"><label className={labelClass}>Transportadora</label><input className={inputClass} maxLength={150} value={transportadora} onChange={e => setTransportadora(e.target.value)} placeholder="Opcional"/></div>
        <div className="col-span-12 sm:col-span-4 md:col-span-2"><label className={labelClass}>Placa</label><input className={inputClass} maxLength={10} value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())} placeholder="ABC1D23"/></div>
        <div className="col-span-12 flex justify-end border-t border-slate-100 pt-3"><button type="button" onClick={() => void registrar()} disabled={saving || loading} className="h-9 bg-sky-700 px-4 text-xs font-bold text-white hover:bg-sky-800 disabled:opacity-50">{saving ? 'Gravando…' : 'Registrar NF-e'}</button></div>
      </div>
    </section>
    <section className="border border-slate-200 bg-white shadow-[0_3px_12px_rgba(18,59,80,0.06)]">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 p-4"><div><h2 className="text-xs font-bold uppercase tracking-wide text-[#123B50]">Esteira de conferência</h2><p className="mt-1 text-[10px] text-slate-500">{filtered.length} registro(s) na consulta</p></div><div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-2.5 text-slate-400" size={14}/><input className={inputClass + ' pl-8'} value={busca} onChange={e => setBusca(e.target.value)} placeholder="NF-e, chave, parceiro, transportadora ou placa"/></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] border-collapse text-left text-xs"><thead className="bg-[#123B50] text-[9px] uppercase tracking-wide text-white"><tr>{['Fluxo','NF-e / Chave','Parceiro comercial','Transportadora / placa','Data de registro','Conferência documental'].map(h => <th key={h} className="px-3 py-3 font-bold">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan={6} className="p-8 text-center text-slate-500">Sincronizando com PostgreSQL…</td></tr> : filtered.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhuma NF-e encontrada para esta empresa.</td></tr> : filtered.map(row => <tr key={row.id} className="hover:bg-sky-50/50"><td className="px-3 py-3"><span className={`inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[10px] font-bold ${row.tipo_fluxo === 'ENTRADA' ? 'bg-blue-50 text-blue-800' : 'bg-violet-50 text-violet-800'}`}>{row.tipo_fluxo === 'ENTRADA' ? <ArrowDownToLine size={12}/> : <ArrowUpFromLine size={12}/>} {row.tipo_fluxo}</span></td><td className="px-3 py-3"><strong className="block">Nº {row.numero_nfe}</strong><span className="font-mono text-[9px] text-slate-500">{row.chave_acesso}</span></td><td className="px-3 py-3 font-semibold">{row.parceiro_comercial}</td><td className="px-3 py-3">{row.transportadora || '—'}<span className="block text-[10px] text-slate-500">{row.placa_veiculo || 'Sem placa'}</span></td><td className="px-3 py-3">{new Date(row.data_movimentacao).toLocaleString('pt-BR')}</td><td className="px-3 py-3"><span className={`inline-flex rounded-sm px-2 py-1 text-[9px] font-bold ring-1 ${statusClass[row.status_expedicao]}`}>{row.status_expedicao.replaceAll('_',' ')}</span>{row.status_expedicao === 'AGUARDANDO_CONFERENCIA' && <div className="mt-2 flex gap-2"><button type="button" disabled={saving} onClick={() => void atualizarStatus(row,'LIBERADO')} className="inline-flex h-7 items-center gap-1 bg-emerald-700 px-2 text-[10px] font-bold text-white disabled:opacity-50"><CheckCircle2 size={12}/> Liberar</button><button type="button" disabled={saving} onClick={() => void atualizarStatus(row,'REJEITADO')} className="h-7 border border-rose-300 px-2 text-[10px] font-bold text-rose-700 disabled:opacity-50">Rejeitar</button></div>}</td></tr>)}</tbody></table></div>
    </section>
  </main>
}
