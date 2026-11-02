import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, CheckCircle2, PackageCheck, Plus, Scissors, ShieldCheck, Trash2, Wrench } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Product = { id: string; codigo: string; nome: string }
type Post = { id: string; codigo_posto: string; nome_posto: string }
type Operation = { id: string; sequencia: number; operacao: string; posto_id: string; tempo_min: number }
const field = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
const label = 'grid gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500'
const toolCards = [
  { title: 'Tesoura de corte', group: 'Acabamento', icon: Scissors, description: 'Corte de canais, rebarbas e sobras conforme padrão aprovado.' },
  { title: 'Estilete industrial', group: 'Acabamento', icon: Wrench, description: 'Remoção controlada de rebarbas e ajustes manuais.' },
  { title: 'Ponta de tesoura', group: 'Acabamento', icon: Scissors, description: 'Acesso a regiões estreitas e detalhes da peça.' },
  { title: 'Bancada de inspeção', group: 'Qualidade', icon: ShieldCheck, description: 'Conferência visual e dimensional antes da embalagem.' },
  { title: 'Embalagem primária', group: 'Embalagem', icon: PackageCheck, description: 'Acondicionamento individual ou em conjunto.' },
  { title: 'Etiquetagem e proteção', group: 'Embalagem', icon: Box, description: 'Identificação, proteção e preparação para expedição.' },
]

export default function AcabamentoEmbalagem() {
  const [empresaId, setEmpresaId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [productId, setProductId] = useState('')
  const [postId, setPostId] = useState('')
  const [operation, setOperation] = useState('Acabamento com tesoura')
  const [minutes, setMinutes] = useState('1')
  const [sequence, setSequence] = useState('100')
  const [rows, setRows] = useState<Operation[]>([])
  const [busy, setBusy] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setBusy(true); setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Empresa da sessão não identificada.')
      const id = String(company.data)
      const [p, w] = await Promise.all([
        supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', id).eq('ativo', true).order('codigo').limit(3000),
        supabase.from('erp_postos_trabalho').select('id,codigo_posto,nome_posto').eq('empresa_id', id).eq('ativo', true).order('codigo_posto').limit(500),
      ])
      if (p.error) throw p.error
      if (w.error) throw w.error
      setEmpresaId(id); setProducts((p.data ?? []) as Product[]); setPosts((w.data ?? []) as Post[])
      setProductId(current => current || p.data?.[0]?.id || '')
      setPostId(current => current || w.data?.[0]?.id || '')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao carregar recursos do PCP.') }
    finally { setBusy(false) }
  }, [])

  const loadRows = useCallback(async () => {
    if (!empresaId || !productId) { setRows([]); return }
    const result = await supabase.from('erp_pcp_roteiro_operacoes').select('id,sequencia,operacao,posto_id,tempo_min').eq('empresa_id', empresaId).eq('produto_id', productId).order('sequencia')
    if (result.error) { setError(result.error.message); return }
    setRows((result.data ?? []) as Operation[])
  }, [empresaId, productId])

  useEffect(() => { void load() }, [load])
  useEffect(() => { void loadRows() }, [loadRows])
  const total = useMemo(() => rows.reduce((sum, row) => sum + Number(row.tempo_min || 0), 0), [rows])
  const finishRows = rows.filter(row => /acabamento|tesoura|estilete|rebarba|embalagem|etiquet|inspeção/i.test(row.operacao))
  const save = async () => {
    setError(''); setMessage('')
    const value = Number(minutes), seq = Number(sequence)
    if (!empresaId || !productId || !postId || !operation.trim()) { setError('Selecione produto, posto e informe a etapa.'); return }
    if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(seq) || seq < 1) { setError('Informe sequência válida e tempo maior que zero.'); return }
    setSaving(true)
    try {
      const result = await supabase.from('erp_pcp_roteiro_operacoes').insert({ empresa_id: empresaId, produto_id: productId, sequencia: seq, operacao: operation.trim(), posto_id: postId, tempo_min: value }).select('id,sequencia,operacao,posto_id,tempo_min').single()
      if (result.error) throw result.error
      setRows(current => [...current, result.data as Operation].sort((a,b) => a.sequencia-b.sequencia))
      setMessage('Etapa gravada e vinculada ao roteiro do produto.')
      setOperation(''); setMinutes('1'); setSequence(String(seq + 10))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível gravar a etapa.') }
    finally { setSaving(false) }
  }
  const remove = async (id: string) => {
    const result = await supabase.from('erp_pcp_roteiro_operacoes').delete().eq('id', id).eq('empresa_id', empresaId).eq('produto_id', productId)
    if (result.error) { setError(result.error.message); return }
    setRows(current => current.filter(row => row.id !== id)); setMessage('Etapa removida do roteiro.')
  }

  return (
    <main className="min-w-0 space-y-4 bg-white p-1 text-slate-800">
      <header className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-[#17445A] to-[#2D8DB8] px-5 py-4 text-white">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-sky-100">SYSNQRA ERP INDUSTRIAL · PCP</p>
          <h1 className="mt-1 text-2xl font-extrabold">Acabamento e Embalagem</h1>
          <p className="mt-1 text-xs text-sky-50">Selecione os recursos utilizados e registre tempos reais para o planejamento da produção.</p>
        </div>
        <div className="grid gap-3 bg-sky-50/60 p-4 sm:grid-cols-3">
          <div className="rounded-xl border border-sky-100 bg-white p-3"><div className="text-[10px] font-bold uppercase text-slate-500">Tempo total do roteiro</div><div className="mt-1 text-xl font-extrabold text-[#17445A]">{total.toFixed(2)} min</div></div>
          <div className="rounded-xl border border-sky-100 bg-white p-3"><div className="text-[10px] font-bold uppercase text-slate-500">Etapas de acabamento/embalagem</div><div className="mt-1 text-xl font-extrabold text-[#17445A]">{finishRows.length}</div></div>
          <div className="rounded-xl border border-sky-100 bg-white p-3"><div className="text-[10px] font-bold uppercase text-slate-500">Etapas cadastradas</div><div className="mt-1 text-xl font-extrabold text-[#17445A]">{rows.length}</div></div>
        </div>
      </header>
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</div>}
      {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{message}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-extrabold text-[#17445A]">Equipamentos e recursos por etapa</h2><span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-bold text-sky-800">Biblioteca de recursos</span></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{toolCards.map(({title,group,icon:Icon,description}) => <article key={title} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-sky-50/60 p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-100 text-sky-800"><Icon size={18}/></span><div><p className="text-[9px] font-bold uppercase tracking-wider text-sky-700">{group}</p><h3 className="text-sm font-extrabold text-slate-800">{title}</h3></div></div><p className="mt-3 text-xs leading-relaxed text-slate-500">{description}</p></article>)}</div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-extrabold text-[#17445A]">Registrar etapa no roteiro do produto</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className={label}>Produto<select className={field} value={productId} onChange={event => setProductId(event.target.value)} disabled={busy}><option value="">Selecione</option>{products.map(item => <option key={item.id} value={item.id}>{item.codigo} · {item.nome}</option>)}</select></label>
          <label className={label}>Equipamento / posto<select className={field} value={postId} onChange={event => setPostId(event.target.value)} disabled={busy}><option value="">Selecione</option>{posts.map(item => <option key={item.id} value={item.id}>{item.codigo_posto} · {item.nome_posto}</option>)}</select></label>
          <label className={label}>Etapa / operação<input className={field} value={operation} onChange={event => setOperation(event.target.value)} placeholder="Ex.: embalagem individual"/></label>
          <label className={label}>Tempo padrão (min)<input className={field} type="number" min="0.001" step="0.001" value={minutes} onChange={event => setMinutes(event.target.value)}/></label>
          <label className={label}>Sequência<input className={field} type="number" min="1" step="1" value={sequence} onChange={event => setSequence(event.target.value)}/></label>
        </div>
        <button type="button" disabled={saving || busy} onClick={() => void save()} className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-sky-700 px-4 text-xs font-bold text-white disabled:opacity-50"><Plus size={14}/>{saving ? 'Gravando…' : 'Gravar etapa no PCP'}</button>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3"><h2 className="text-sm font-extrabold text-[#17445A]">Etapas registradas no produto selecionado</h2></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-sky-50 text-[10px] uppercase text-slate-600"><tr><th className="px-4 py-3">Seq.</th><th className="px-4 py-3">Etapa</th><th className="px-4 py-3">Posto</th><th className="px-4 py-3 text-right">Minutos</th><th className="px-4 py-3 text-right">Ação</th></tr></thead><tbody>{busy ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">Carregando…</td></tr> : rows.length ? rows.map(row => <tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-3">{row.sequencia}</td><td className="px-4 py-3 font-semibold">{row.operacao}</td><td className="px-4 py-3">{posts.find(post => post.id === row.posto_id)?.nome_posto ?? '—'}</td><td className="px-4 py-3 text-right font-bold">{Number(row.tempo_min).toFixed(3)}</td><td className="px-4 py-3 text-right"><button type="button" onClick={() => void remove(row.id)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[10px] font-bold text-rose-700"><Trash2 size={12}/>Excluir</button></td></tr>) : <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhuma etapa cadastrada.</td></tr>}</tbody></table></div>
      </section>
      <p className="flex items-center gap-2 text-[10px] text-slate-400"><CheckCircle2 size={12}/> Os tempos exibidos vêm do roteiro persistido do produto; nenhum tempo padrão fictício é aplicado.</p>
    </main>
  )
}
