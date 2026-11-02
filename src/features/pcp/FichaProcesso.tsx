import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Clock3, Factory, Plus, Save, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

type Product = { id: string; codigo: string; nome: string; tempo_ciclo_padrao?: number | null; cavidades?: number | null }
type Post = { id: string; codigo_posto: string; nome_posto: string }
type Row = { id: string; sequencia: number; operacao: string; posto_id: string; tempo_min: number }
const input = 'h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
const label = 'grid min-w-0 gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-slate-500'

export default function FichaProcesso() {
  const navigate = useNavigate()
  const [empresaId, setEmpresaId] = useState('')
  const [produtos, setProdutos] = useState<Product[]>([])
  const [postos, setPostos] = useState<Post[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [produto, setProduto] = useState('')
  const [posto, setPosto] = useState('')
  const [operacao, setOperacao] = useState('')
  const [tempo, setTempo] = useState('1')
  const [seq, setSeq] = useState('10')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadBase = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Não foi possível identificar a empresa da sessão.')
      const id = String(company.data)
      const [productsResult, postsResult] = await Promise.all([
        supabase.from('erp_produtos').select('id,codigo,nome,tempo_ciclo_padrao,cavidades').eq('empresa_id', id).eq('ativo', true).order('codigo').limit(3000),
        supabase.from('erp_postos_trabalho').select('id,codigo_posto,nome_posto').eq('empresa_id', id).eq('ativo', true).order('codigo_posto').limit(500),
      ])
      if (productsResult.error) throw productsResult.error
      if (postsResult.error) throw postsResult.error
      setEmpresaId(id); setProdutos((productsResult.data ?? []) as Product[]); setPostos((postsResult.data ?? []) as Post[])
      setProduto(current => current || productsResult.data?.[0]?.id || '')
      setPosto(current => current || postsResult.data?.[0]?.id || '')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar dados do PCP.')
      setProdutos([]); setPostos([])
    } finally { setLoading(false) }
  }, [])

  const loadRows = useCallback(async () => {
    if (!empresaId || !produto) { setRows([]); return }
    const result = await supabase.from('erp_pcp_roteiro_operacoes')
      .select('id,sequencia,operacao,posto_id,tempo_min')
      .eq('empresa_id', empresaId).eq('produto_id', produto).order('sequencia')
    if (result.error) { setError(result.error.message); setRows([]); return }
    setRows((result.data ?? []) as Row[])
  }, [empresaId, produto])

  useEffect(() => { void loadBase() }, [loadBase])
  useEffect(() => { void loadRows() }, [loadRows])

  const totalMin = useMemo(() => rows.reduce((sum, row) => sum + Number(row.tempo_min || 0), 0), [rows])
  const selectedProduct = produtos.find(item => item.id === produto)
  const cicloInjecao = Number(selectedProduct?.tempo_ciclo_padrao || 0)
  const cavidades = Math.max(1, Number(selectedProduct?.cavidades || 1))
  const tempoEstimadoPeca = totalMin + (cicloInjecao > 0 ? cicloInjecao / cavidades : 0)

  const addRow = async () => {
    setError(''); setNotice('')
    const minutes = Number(tempo)
    const sequence = Number(seq)
    if (!empresaId || !produto || !posto || !operacao.trim()) { setError('Selecione produto e posto e informe a operação.'); return }
    if (!Number.isFinite(minutes) || minutes <= 0 || !Number.isInteger(sequence) || sequence < 1) { setError('Sequência deve ser inteira e o tempo deve ser maior que zero.'); return }
    setSaving(true)
    try {
      const result = await supabase.from('erp_pcp_roteiro_operacoes').insert({
        empresa_id: empresaId, produto_id: produto, sequencia: sequence,
        operacao: operacao.trim(), posto_id: posto, tempo_min: minutes,
      }).select('id,sequencia,operacao,posto_id,tempo_min').single()
      if (result.error) throw result.error
      setRows(current => [...current, result.data as Row].sort((a,b) => a.sequencia-b.sequencia))
      setOperacao(''); setTempo('1'); setSeq(String(sequence + 10)); setNotice('Operação gravada na ficha de processo.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível gravar a operação.') }
    finally { setSaving(false) }
  }

  const removeRow = async (id: string) => {
    if (!empresaId) return
    setError(''); setNotice('')
    const result = await supabase.from('erp_pcp_roteiro_operacoes').delete().eq('id', id).eq('empresa_id', empresaId).eq('produto_id', produto)
    if (result.error) { setError(result.error.message); return }
    setRows(current => current.filter(row => row.id !== id)); setNotice('Operação removida.')
  }

  return (
    <main className="min-w-0 space-y-4 bg-white p-1 text-slate-800">
      <header className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-[#17445A] to-[#2D8DB8] px-5 py-4 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-sky-100">SYSNQRA ERP INDUSTRIAL · PCP</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight">Ficha de Processo</h1><p className="mt-1 text-xs text-sky-50">Roteiro operacional, recursos produtivos e tempo padrão por produto.</p></div>
            <button type="button" onClick={() => navigate(-1)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-3 text-xs font-bold text-white hover:bg-white/20"><ArrowLeft size={14}/> Voltar</button>
          </div>
        </div>
        <div className="grid gap-3 bg-sky-50/60 p-4 sm:grid-cols-3">
          <div className="rounded-xl border border-sky-100 bg-white p-3"><div className="text-[10px] font-bold uppercase text-slate-500">Tempo de operações</div><div className="mt-1 text-xl font-extrabold text-[#17445A]">{totalMin.toFixed(2)} min</div></div>
          <div className="rounded-xl border border-sky-100 bg-white p-3"><div className="text-[10px] font-bold uppercase text-slate-500">Ciclo de injeção cadastrado</div><div className="mt-1 text-xl font-extrabold text-[#17445A]">{cicloInjecao.toFixed(2)} s</div></div>
          <div className="rounded-xl border border-sky-100 bg-white p-3"><div className="text-[10px] font-bold uppercase text-slate-500">Estimativa de processo por peça</div><div className="mt-1 text-xl font-extrabold text-[#17445A]">{tempoEstimadoPeca.toFixed(2)} min</div><p className="mt-1 text-[10px] text-slate-400">Estimativa soma operações e ciclo de injeção dividido pelas cavidades.</p></div>
        </div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{notice}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><Factory size={16} className="text-sky-700"/><h2 className="text-sm font-extrabold text-[#17445A]">Identificação e roteiro de fabricação</h2></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className={label}>Produto<select className={input} value={produto} disabled={loading || !produtos.length} onChange={event => setProduto(event.target.value)}><option value="">Selecione o produto</option>{produtos.map(item => <option key={item.id} value={item.id}>{item.codigo} · {item.nome}</option>)}</select></label>
          <label className={label}>Código da ficha<div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-xs font-bold text-slate-600">{selectedProduct?.codigo ? selectedProduct.codigo + ' / PROC' : '—'}</div></label>
          <label className={label}>Sequência<input className={input} type="number" min="1" step="1" value={seq} onChange={event => setSeq(event.target.value)}/></label>
          <label className={label}>Posto / máquina<select className={input} value={posto} disabled={loading || !postos.length} onChange={event => setPosto(event.target.value)}><option value="">Selecione o posto</option>{postos.map(item => <option key={item.id} value={item.id}>{item.codigo_posto} · {item.nome_posto}</option>)}</select></label>
          <label className={label + ' sm:col-span-2'}>Operação<input className={input} value={operacao} onChange={event => setOperacao(event.target.value)} placeholder="Ex.: injeção, rebarbação, inspeção, embalagem"/></label>
          <label className={label}>Tempo padrão (min)<input className={input} type="number" min="0.001" step="0.001" value={tempo} onChange={event => setTempo(event.target.value)}/></label>
          <div className="flex items-end"><button type="button" disabled={saving || loading} onClick={() => void addRow()} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2D8DB8] to-[#1D709D] px-4 text-xs font-bold text-white shadow-md disabled:opacity-50"><Save size={14}/>{saving ? 'Gravando…' : 'Adicionar operação'}</button></div>
        </div>
        {!loading && !produtos.length && <p className="mt-3 text-xs text-amber-700">Nenhum produto ativo encontrado para a empresa atual.</p>}
        {!loading && !postos.length && <p className="mt-3 text-xs text-amber-700">Cadastre postos/máquinas no módulo Chão de Fábrica antes de montar o roteiro.</p>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3"><h2 className="text-sm font-extrabold text-[#17445A]">Sequência de operações</h2><span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-bold text-sky-800">{rows.length} operação(ões)</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-sky-50 text-[10px] uppercase tracking-wider text-slate-600"><tr><th className="px-4 py-3">Seq.</th><th className="px-4 py-3">Operação</th><th className="px-4 py-3">Posto</th><th className="px-4 py-3 text-right">Tempo (min)</th><th className="px-4 py-3 text-right">Ações</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Carregando dados reais…</td></tr> : rows.length ? rows.map(row => <tr key={row.id} className="border-t border-slate-100 hover:bg-sky-50/40"><td className="px-4 py-3 font-bold text-slate-600">{row.sequencia}</td><td className="px-4 py-3 font-semibold text-slate-800">{row.operacao}</td><td className="px-4 py-3 text-slate-600">{postos.find(item => item.id === row.posto_id)?.nome_posto ?? 'Posto não localizado'}</td><td className="px-4 py-3 text-right font-bold tabular-nums">{Number(row.tempo_min).toFixed(3)}</td><td className="px-4 py-3 text-right"><button type="button" onClick={() => void removeRow(row.id)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[10px] font-bold text-rose-700 hover:bg-rose-100"><Trash2 size={12}/> Remover</button></td></tr>) : <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Nenhuma operação cadastrada para este produto.</td></tr>}</tbody></table></div>
      </section>
      <div className="flex items-center gap-2 text-[10px] text-slate-400"><Clock3 size={12}/> Tempos reais cadastrados no roteiro; não são valores demonstrativos.</div>
    </main>
  )
}
