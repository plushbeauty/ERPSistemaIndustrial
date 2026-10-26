/** REVISÃO: PAQUIMETRO-APLICACAO-2026-10-26-R1 | Restaurado de PR #217; rota protegida e consulta real por empresa. */
import { useEffect, useState } from 'react'
import { AlertTriangle, Gauge, RefreshCw, Ruler, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import DigitalCaliper from '../components/DigitalCaliper'

type InstrumentOption = { codigo: string; descricao: string; status: string; proxima_calibracao: string | null }

export default function QualidadePaquimetroDigital() {
  const [instruments, setInstruments] = useState<InstrumentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadInstruments() {
    setLoading(true)
    setError('')
    try {
      const sessionResult = await supabase.auth.getSession()
      if (sessionResult.error) throw sessionResult.error
      if (!sessionResult.data.session) throw new Error('É necessário entrar no ERP para consultar os instrumentos da empresa.')
      const companyResult = await supabase.rpc('erp_current_empresa_id')
      if (companyResult.error) throw companyResult.error
      const empresaId = companyResult.data
      if (!empresaId) throw new Error('A sessão não possui empresa ativa. Selecione uma empresa antes de continuar.')
      const result = await supabase.from('erp_equipamentos_medicao')
        .select('codigo,descricao,status,proxima_calibracao')
        .eq('empresa_id', empresaId)
        .order('codigo')
      if (result.error) throw result.error
      setInstruments((result.data ?? []).map(item => ({ codigo: item.codigo, descricao: item.descricao, status: item.status, proxima_calibracao: item.proxima_calibracao })))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível consultar os instrumentos cadastrados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadInstruments() }, [])

  const today = new Date().toISOString().slice(0, 10)
  const blocked = instruments.filter(item => /BLOQUEADO|VENCIDO|INATIVO|REPROVADO/i.test(item.status) || (!!item.proxima_calibracao && item.proxima_calibracao < today)).length
  return (
    <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900 md:p-4">
      <div className="mx-auto max-w-[1680px] space-y-3">
        <header className="flex flex-wrap items-center gap-3 border border-slate-200 border-t-2 border-t-[#2D8DB8] bg-white p-3 shadow-sm">
          <span className="grid h-9 w-9 place-items-center border border-sky-200 bg-sky-50 text-[#2D8DB8]"><Ruler size={18}/></span>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">SYSNQRA • QUALIDADE / METROLOGIA</p>
            <h1 className="text-sm font-black uppercase text-[#123B50]">Paquímetro digital e controle dimensional</h1>
            <p className="text-[10px] text-slate-500">Identificação do instrumento, lote/peça, tolerâncias e bloqueio visual por situação cadastral.</p>
          </div>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <button type="button" onClick={() => void loadInstruments()} disabled={loading} className="inline-flex h-[30px] items-center gap-1.5 border border-slate-300 bg-white px-2.5 text-[10px] font-bold uppercase text-slate-700 disabled:opacity-50"><RefreshCw size={13}/> {loading ? 'Consultando…' : 'Atualizar'}</button>
          </div>
        </header>
        <section className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="border border-slate-200 border-t-2 border-t-[#2D8DB8] bg-white p-3 shadow-sm"><p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-slate-500"><Gauge size={12}/> Instrumentos disponíveis</p><p className="mt-1 text-xl font-black text-[#123B50]">{loading ? '—' : instruments.length}</p></div>
          <div className="border border-rose-200 border-t-2 border-t-rose-500 bg-white p-3 shadow-sm"><p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-rose-700"><AlertTriangle size={12}/> Bloqueados / vencidos</p><p className="mt-1 text-xl font-black text-rose-700">{loading ? '—' : blocked}</p></div>
          <div className="border border-slate-200 border-t-2 border-t-emerald-500 bg-white p-3 shadow-sm"><p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-emerald-700"><ShieldCheck size={12}/> Rastreabilidade</p><p className="mt-1 text-sm font-black text-[#123B50]">Tag + peça/lote</p></div>
        </section>
        {error && <div role="alert" className="flex items-start gap-2 border border-rose-300 bg-rose-50 p-3 text-[11px] font-semibold text-rose-800"><AlertTriangle size={15} className="mt-0.5 shrink-0"/><span>{error}</span></div>}
        {loading && <p className="border border-slate-200 bg-white p-3 text-[11px] text-slate-500">Consultando instrumentos reais da empresa autenticada…</p>}
        {!loading && !error && instruments.length === 0 && <p className="border border-amber-300 bg-amber-50 p-3 text-[11px] text-amber-900">Não há instrumentos cadastrados para esta empresa. Cadastre o instrumento em Qualidade → Instrumentos antes de registrar uma medição.</p>}
        <DigitalCaliper instrumentOptions={instruments} />
      </div>
    </main>
  )
}
