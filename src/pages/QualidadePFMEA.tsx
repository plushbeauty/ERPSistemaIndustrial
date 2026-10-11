import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, Plus, Printer, RefreshCw, Save } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Score = number | ''
type FmeaRow = {
  id: string
  codigo_item_processo: string
  funcao: string
  modo_falha: string
  efeito: string
  severidade: number
  causa: string
  ocorrencia: number
  controles: string | null
  deteccao: number
  npr: number | null
  acoes_recomendadas: unknown
  status_acao: string
  created_at: string
}
const field = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-slate-800 outline-none focus:border-[#2D8DB8]'
const label = 'grid gap-[2px] text-[9px] font-semibold uppercase text-slate-600'
const button = 'inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white disabled:opacity-50'
const secondaryButton = 'inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] font-semibold text-slate-700 disabled:opacity-50'

export default function QualidadePFMEA() {
  const [companyId, setCompanyId] = useState('')
  const [rows, setRows] = useState<FmeaRow[]>([])
  const [codigo, setCodigo] = useState('')
  const [funcao, setFuncao] = useState('')
  const [modoFalha, setModoFalha] = useState('')
  const [efeito, setEfeito] = useState('')
  const [causa, setCausa] = useState('')
  const [controles, setControles] = useState('')
  const [acao, setAcao] = useState('')
  const [severidade, setSeveridade] = useState<Score>('')
  const [ocorrencia, setOcorrencia] = useState<Score>('')
  const [deteccao, setDeteccao] = useState<Score>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const npr = useMemo(() => [severidade, ocorrencia, deteccao].every((score): score is number => typeof score === 'number')
    ? Number(severidade) * Number(ocorrencia) * Number(deteccao)
    : null, [severidade, ocorrencia, deteccao])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Empresa da sessão não identificada.')
      const tenantId = String(company.data)
      setCompanyId(tenantId)
      const result = await supabase.from('qualidade_fmea')
        .select('id,codigo_item_processo,funcao,modo_falha,efeito,severidade,causa,ocorrencia,controles,deteccao,npr,acoes_recomendadas,status_acao,created_at')
        .eq('empresa_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100)
      if (result.error) throw result.error
      setRows((result.data ?? []) as FmeaRow[])
    } catch (causeError) {
      setError(causeError instanceof Error ? causeError.message : 'Falha ao carregar a matriz PFMEA.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  function resetForm() {
    setCodigo('')
    setFuncao('')
    setModoFalha('')
    setEfeito('')
    setCausa('')
    setControles('')
    setAcao('')
    setSeveridade('')
    setOcorrencia('')
    setDeteccao('')
    setError('')
    setNotice('')
  }

  async function save() {
    setError('')
    setNotice('')
    if (!companyId) { setError('Empresa da sessão não identificada.'); return }
    if (!codigo.trim() || !funcao.trim() || !modoFalha.trim() || !efeito.trim() || !causa.trim()) {
      setError('Preencha código, função/processo, modo de falha, efeito e causa.')
      return
    }
    const scores = [severidade, ocorrencia, deteccao]
    if (!scores.every((score): score is number => typeof score === 'number' && score >= 1 && score <= 10)) {
      setError('Informe severidade, ocorrência e detecção de 1 a 10.')
      return
    }
    setSaving(true)
    try {
      const result = await supabase.from('qualidade_fmea').insert({
        empresa_id: companyId,
        codigo_item_processo: codigo.trim(),
        funcao: funcao.trim(),
        modo_falha: modoFalha.trim(),
        efeito: efeito.trim(),
        severidade,
        causa: causa.trim(),
        ocorrencia,
        controles: controles.trim() || null,
        deteccao,
        npr,
        acoes_recomendadas: acao.trim() ? [acao.trim()] : [],
        status_acao: 'aberta',
      }).select('id').single()
      if (result.error) throw result.error
      setNotice('Registro PFMEA gravado no banco da empresa.')
      resetForm()
      await load()
    } catch (causeError) {
      setError(causeError instanceof Error ? causeError.message : 'Falha ao gravar o registro PFMEA.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F4FBFD] p-3 text-[#123B50]">
      <div className="mx-auto max-w-[1500px] space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#C8E3EE] pb-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center border border-[#C8E3EE] bg-white text-[#2D8DB8]"><ClipboardCheck size={17} /></span>
            <div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#2D8DB8]">ERP INDUSTRIAL · SGQ</p><h1 className="text-[15px] font-semibold">Matriz PFMEA</h1><p className="text-[10px] text-slate-500">Modo de falha, NPR e ações recomendadas</p></div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={resetForm} className={secondaryButton}><Plus size={12} /> NOVO</button>
            <button type="button" onClick={() => void load()} disabled={loading || saving} className={secondaryButton}><RefreshCw size={12} /> ATUALIZAR</button>
            <button type="button" onClick={() => void save()} disabled={loading || saving} className={button}><Save size={12} /> SALVAR PFMEA</button>
            <button type="button" onClick={() => window.print()} className={secondaryButton}><Printer size={12} /> IMPRIMIR</button>
          </div>
        </header>
        {(error || notice) && <div role={error ? 'alert' : 'status'} className={error ? 'border border-red-300 bg-red-50 p-2 text-[10px] text-red-800' : 'border border-emerald-300 bg-emerald-50 p-2 text-[10px] text-emerald-800'}>{error || notice}</div>}
        <section className="grid gap-2 border border-[#C8E3EE] bg-white p-3 md:grid-cols-3">
          <label className={label}>Código do item/processo<input className={field} value={codigo} onChange={event => setCodigo(event.target.value)} placeholder="Código real do processo" /></label>
          <label className={label}>Função / processo<input className={field} value={funcao} onChange={event => setFuncao(event.target.value)} placeholder="Função avaliada" /></label>
          <label className={label}>Modo de falha<input className={field} value={modoFalha} onChange={event => setModoFalha(event.target.value)} placeholder="Falha potencial" /></label>
          <label className={label}>Efeito da falha<input className={field} value={efeito} onChange={event => setEfeito(event.target.value)} placeholder="Impacto no produto/processo" /></label>
          <label className={label}>Causa potencial<input className={field} value={causa} onChange={event => setCausa(event.target.value)} placeholder="Causa identificada" /></label>
          <label className={label}>Controles atuais<input className={field} value={controles} onChange={event => setControles(event.target.value)} placeholder="Controles existentes" /></label>
          <label className={label}>Severidade (1–10)<select className={field} value={severidade} onChange={event => setSeveridade(event.target.value ? Number(event.target.value) : '')}><option value="">Selecionar…</option>{Array.from({ length: 10 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className={label}>Ocorrência (1–10)<select className={field} value={ocorrencia} onChange={event => setOcorrencia(event.target.value ? Number(event.target.value) : '')}><option value="">Selecionar…</option>{Array.from({ length: 10 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className={label}>Detecção (1–10)<select className={field} value={deteccao} onChange={event => setDeteccao(event.target.value ? Number(event.target.value) : '')}><option value="">Selecionar…</option>{Array.from({ length: 10 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className={label + ' md:col-span-2'}>Ações recomendadas<textarea className="min-h-[54px] w-full rounded-[2px] border border-slate-300 bg-white p-2 text-[10px] outline-none focus:border-[#2D8DB8]" value={acao} onChange={event => setAcao(event.target.value)} placeholder="Ação preventiva ou corretiva proposta" /></label>
          <div className="border border-[#C8E3EE] bg-[#F4FBFD] p-2"><p className="text-[9px] font-semibold uppercase text-slate-500">NPR = S × O × D</p><p className="mt-1 text-[18px] font-semibold">{npr === null ? '—' : npr}</p><p className="text-[9px] text-slate-500">Calculado após informar os três índices</p></div>
        </section>
        <section className="border border-[#C8E3EE] bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2"><h2 className="text-[11px] font-semibold">Histórico PFMEA</h2><span className="text-[9px] text-slate-500">{rows.length} registros</span></div>
          {loading ? <p className="p-3 text-[10px] text-slate-500">Carregando registros…</p> : rows.length === 0 ? <p className="p-3 text-[10px] text-slate-500">Nenhum registro PFMEA para esta empresa.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-[#123B50] text-white"><tr><th className="px-3 py-2 text-[9px]">CÓDIGO</th><th className="px-3 py-2 text-[9px]">PROCESSO</th><th className="px-3 py-2 text-[9px]">MODO DE FALHA</th><th className="px-3 py-2 text-[9px]">S/O/D</th><th className="px-3 py-2 text-[9px]">NPR</th><th className="px-3 py-2 text-[9px]">STATUS</th><th className="px-3 py-2 text-[9px]">DATA</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-t border-slate-100"><td className="px-3 py-2 text-[10px]">{row.codigo_item_processo}</td><td className="px-3 py-2 text-[10px]">{row.funcao}</td><td className="px-3 py-2 text-[10px]">{row.modo_falha}</td><td className="px-3 py-2 text-[10px]">{row.severidade}/{row.ocorrencia}/{row.deteccao}</td><td className="px-3 py-2 text-[10px] font-semibold">{row.npr ?? row.severidade * row.ocorrencia * row.deteccao}</td><td className="px-3 py-2 text-[10px]">{row.status_acao}</td><td className="px-3 py-2 text-[10px]">{new Date(row.created_at).toLocaleDateString('pt-BR')}</td></tr>)}</tbody></table></div>}
        </section>
      </div>
    </main>
  )
}
