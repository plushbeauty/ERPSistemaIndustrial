import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, ClipboardList, RefreshCw, Save, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import QualitySidebar from '../../components/quality/QualitySidebar'

type FmeaRow = {
  id: string
  codigo_item_processo: string
  funcao: string
  modo_falha: string
  efeito: string
  severidade: number
  causa: string
  ocorrencia: number
  controles: string
  deteccao: number
  npr: number
  acoes_recomendadas: unknown
  status_acao: string
  created_at: string
}

type Draft = Omit<FmeaRow, 'id' | 'npr' | 'acoes_recomendadas' | 'status_acao' | 'created_at'> & { acao: string }
const field = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-slate-800 outline-none focus:border-[#2D8DB8]'
const label = 'mb-[2px] block text-[9px] font-bold uppercase tracking-wider text-neutral-500'
const initial: Draft = { codigo_item_processo: '', funcao: '', modo_falha: '', efeito: '', severidade: 5, causa: '', ocorrencia: 5, controles: '', deteccao: 5, acao: '' }

export default function QualidadeFMEA() {
  const [companyId, setCompanyId] = useState('')
  const [rows, setRows] = useState<FmeaRow[]>([])
  const [draft, setDraft] = useState<Draft>(initial)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const npr = useMemo(() => draft.severidade * draft.ocorrencia * draft.deteccao, [draft.severidade, draft.ocorrencia, draft.deteccao])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      if (typeof tenant.data !== 'string' || !tenant.data) throw new Error('Empresa ativa não identificada.')
      setCompanyId(tenant.data)
      const result = await supabase.from('qualidade_fmea')
        .select('id,codigo_item_processo,funcao,modo_falha,efeito,severidade,causa,ocorrencia,controles,deteccao,npr,acoes_recomendadas,status_acao,created_at')
        .eq('empresa_id', tenant.data).order('npr', { ascending: false }).limit(1000)
      if (result.error) throw result.error
      setRows((result.data ?? []) as FmeaRow[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao consultar a matriz FMEA.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!companyId) { setError('Empresa ativa não identificada.'); return }
    if (![draft.codigo_item_processo, draft.funcao, draft.modo_falha, draft.efeito, draft.causa, draft.controles].every(value => value.trim())) {
      setError('Preencha item/processo, função, modo de falha, efeito, causa e controles atuais.')
      return
    }
    setSaving(true)
    try {
      const result = await supabase.from('qualidade_fmea').insert({
        empresa_id: companyId,
        codigo_item_processo: draft.codigo_item_processo.trim(),
        funcao: draft.funcao.trim(),
        modo_falha: draft.modo_falha.trim(),
        efeito: draft.efeito.trim(),
        severidade: draft.severidade,
        causa: draft.causa.trim(),
        ocorrencia: draft.ocorrencia,
        controles: draft.controles.trim(),
        deteccao: draft.deteccao,
        npr,
        acoes_recomendadas: draft.acao.trim() ? [{ acao: draft.acao.trim(), responsavel: null, prazo: null, status: 'aberta' }] : [],
        status_acao: 'aberta',
      })
      if (result.error) throw result.error
      setDraft(initial)
      setNotice('Análise FMEA registrada no banco da empresa.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a análise FMEA.')
    } finally {
      setSaving(false)
    }
  }

  return <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900"><QualitySidebar active="/qualidade/fmea" />
      <header className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
        <ShieldCheck size={17} className="text-[#2D8DB8}" />
        <div><h1 className="text-[13px] font-semibold text-[#123B50]">Matriz de risco de processo</h1><p className="text-[9px] text-slate-500">Escala de 1 a 10 · NPR calculado em tempo real · registros segregados por empresa</p></div>
        <button className="ml-auto inline-flex h-[30px] items-center gap-1 border border-slate-300 bg-white px-2 text-[10px]" onClick={() => void load()} disabled={loading}><RefreshCw size={12}/> Atualizar</button>
      </header>
      <form onSubmit={save} className="mb-3 border border-slate-200 bg-white p-3">
        <h2 className="mb-2 flex items-center gap-1 text-[11px] font-semibold"><ClipboardList size={13}/> Nova análise</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <label><span className={label}>CÓDIGO DO ITEM / PROCESSO *</span><input className={field} title="Código rastreável do produto, componente ou etapa do processo." value={draft.codigo_item_processo} onChange={e => setDraft(v => ({...v,codigo_item_processo:e.target.value}))} required maxLength={120}/></label>
          <label><span className={label}>FUNÇÃO / REQUISITO *</span><input className={field} title="Função esperada do item ou requisito do processo." value={draft.funcao} onChange={e => setDraft(v => ({...v,funcao:e.target.value}))} required maxLength={500}/></label>
          <label><span className={label}>MODO POTENCIAL DE FALHA *</span><input className={field} title="Forma específica como o requisito pode deixar de ser atendido." value={draft.modo_falha} onChange={e => setDraft(v => ({...v,modo_falha:e.target.value}))} required maxLength={1000}/></label>
          <label><span className={label}>EFEITO DA FALHA *</span><input className={field} title="Impacto no cliente, segurança, produto ou etapa seguinte." value={draft.efeito} onChange={e => setDraft(v => ({...v,efeito:e.target.value}))} required maxLength={1000}/></label>
          <label><span className={label}>SEVERIDADE · 1–10 *</span><input className={field} title="Gravidade do efeito: 1 menor impacto; 10 impacto crítico." type="number" min={1} max={10} value={draft.severidade} onChange={e => setDraft(v => ({...v,severidade:Number(e.target.value)}))} required/></label>
          <label><span className={label}>CAUSA POTENCIAL *</span><input className={field} title="Causa física ou sistêmica que pode produzir o modo de falha." value={draft.causa} onChange={e => setDraft(v => ({...v,causa:e.target.value}))} required maxLength={1000}/></label>
          <label><span className={label}>OCORRÊNCIA · 1–10 *</span><input className={field} title="Probabilidade/frequência estimada: 1 rara; 10 recorrente." type="number" min={1} max={10} value={draft.ocorrencia} onChange={e => setDraft(v => ({...v,ocorrencia:Number(e.target.value)}))} required/></label>
          <label><span className={label}>CONTROLES ATUAIS *</span><input className={field} title="Prevenção e detecção existentes hoje para esta causa ou falha." value={draft.controles} onChange={e => setDraft(v => ({...v,controles:e.target.value}))} required maxLength={1000}/></label>
          <label><span className={label}>DETECÇÃO · 1–10 *</span><input className={field} title="Dificuldade de detectar antes do efeito: 1 detecção muito provável; 10 muito improvável." type="number" min={1} max={10} value={draft.deteccao} onChange={e => setDraft(v => ({...v,deteccao:Number(e.target.value)}))} required/></label>
          <label className="sm:col-span-2"><span className={label}>AÇÃO RECOMENDADA</span><input className={field} title="Ação preventiva/corretiva proposta para reduzir risco." value={draft.acao} onChange={e => setDraft(v => ({...v,acao:e.target.value}))} maxLength={1500}/></label>
          <div className="flex items-end justify-between border border-slate-200 bg-slate-50 px-2 py-1"><div><span className={label}>NPR ATUAL</span><strong className={'text-[18px] tabular-nums ' + (npr >= 200 ? 'text-rose-700' : npr >= 100 ? 'text-amber-700' : 'text-emerald-700')}>{npr}</strong></div><span className="text-[9px] text-slate-500">S × O × D</span></div>
          <div className="flex items-end"><button type="submit" className="inline-flex h-[30px] w-full items-center justify-center gap-1 bg-[#2D8DB8] px-3 text-[10px] font-bold text-white disabled:opacity-50" disabled={saving || loading}><Save size={12}/>{saving ? 'Salvando…' : 'Registrar FMEA'}</button></div>
        </div>
        {error && <p role="alert" className="mt-2 flex items-center gap-1 text-[10px] text-rose-700"><AlertTriangle size={12}/>{error}</p>}
        {notice && <p role="status" className="mt-2 text-[10px] text-emerald-700">{notice}</p>}
      </form>
      <section className="overflow-auto border border-slate-200 bg-white">
        <table className="w-full min-w-[1100px] border-collapse text-left text-[10px]">
          <thead className="bg-slate-100 text-[9px] uppercase text-slate-600"><tr>{['Item / processo','Modo de falha','Efeito','S','O','D','NPR','Ação','Status'].map(title => <th key={title} className="h-[30px] border-b border-slate-200 px-2">{title}</th>)}</tr></thead>
          <tbody>{loading ? <tr><td colSpan={9} className="h-[40px] text-center text-slate-500">Carregando matriz FMEA…</td></tr> : rows.length === 0 ? <tr><td colSpan={9} className="h-[40px] text-center text-slate-500">Nenhuma análise cadastrada para a empresa.</td></tr> : rows.map(row => <tr key={row.id} className="h-[32px] border-b border-slate-100 hover:bg-neutral-50/80"><td className="px-2">{row.codigo_item_processo}</td><td className="max-w-56 truncate px-2" title={row.modo_falha}>{row.modo_falha}</td><td className="max-w-56 truncate px-2" title={row.efeito}>{row.efeito}</td><td className="px-2 text-right tabular-nums">{row.severidade}</td><td className="px-2 text-right tabular-nums">{row.ocorrencia}</td><td className="px-2 text-right tabular-nums">{row.deteccao}</td><td className={'px-2 text-right font-bold tabular-nums '+(row.npr>=200?'text-rose-700':row.npr>=100?'text-amber-700':'text-emerald-700')}>{row.npr}</td><td className="max-w-64 truncate px-2" title={JSON.stringify(row.acoes_recomendadas)}>{Array.isArray(row.acoes_recomendadas) ? String((row.acoes_recomendadas[0] as {acao?:string}|undefined)?.acao ?? '—') : '—'}</td><td className="px-2">{row.status_acao}</td></tr>)}</tbody>
        </table>
      </section>
    </main>
}
