import { ArrowLeft, Plus, Trash2, Factory, Clock3, PackageCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

type Product = { id: string; codigo: string; nome: string }
type Post = { id: string; codigo_posto: string; nome_posto: string }
type Row = {
  id: string
  sequencia: number
  operacao: string
  posto_id: string
  posto_nome: string
  tempo_min: number
}

const inputClass = 'h-[38px] w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
const labelClass = 'grid min-w-0 gap-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500'

export default function FichaProcesso() {
  const navigate = useNavigate()
  const [produtos, setProdutos] = useState<Product[]>([])
  const [postos, setPostos] = useState<Post[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [produto, setProduto] = useState('')
  const [posto, setPosto] = useState('')
  const [operacao, setOperacao] = useState('')
  const [tempo, setTempo] = useState('15')
  const [seq, setSeq] = useState('10')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    setError('')

    try {
      const [produtosResp, postosResp] = await Promise.all([
        supabase.from('erp_produtos').select('id,codigo,nome').eq('ativo', true).order('codigo').limit(2000),
        supabase.from('erp_postos_trabalho').select('id,codigo_posto,nome_posto').order('codigo_posto').limit(500)
      ])

      if (produtosResp.error) throw produtosResp.error
      if (postosResp.error) throw postosResp.error

      const nextProdutos = (produtosResp.data ?? []) as Product[]
      const nextPostos = (postosResp.data ?? []) as Post[]

      setProdutos(nextProdutos)
      setPostos(nextPostos)

      if (!produto && nextProdutos[0]?.id) setProduto(nextProdutos[0].id)
      if (!posto && nextPostos[0]?.id) setPosto(nextPostos[0].id)
    } catch (e) {
      const fallbackProdutos: Product[] = [
        { id: 'prod-1', codigo: 'PA-001', nome: 'Peça plástica A' },
        { id: 'prod-2', codigo: 'PA-002', nome: 'Caixa organizadora 5L' },
        { id: 'prod-3', codigo: 'PA-003', nome: 'Suporte de montagem' },
      ]
      const fallbackPostos: Post[] = [
        { id: 'posto-1', codigo_posto: 'INJ-01', nome_posto: 'Injeção' },
        { id: 'posto-2', codigo_posto: 'ACB-02', nome_posto: 'Acabamento' },
        { id: 'posto-3', codigo_posto: 'EMB-03', nome_posto: 'Embalagem' },
      ]
      setProdutos(fallbackProdutos)
      setPostos(fallbackPostos)
      if (!produto) setProduto(fallbackProdutos[0].id)
      if (!posto) setPosto(fallbackPostos[0].id)
      setError('Carregamento do banco indisponível; exibindo dados de referência local.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const totalMin = useMemo(() => rows.reduce((sum, item) => sum + Number(item.tempo_min || 0), 0), [rows])

  const addRow = () => {
    setError('')
    if (!produto || !posto || !operacao.trim()) {
      setError('Produto, posto e operação são obrigatórios.')
      return
    }

    const tempoValue = Number(tempo)
    if (!Number.isFinite(tempoValue) || tempoValue <= 0) {
      setError('Tempo da operação deve ser maior que zero.')
      return
    }

    const postoSelecionado = postos.find((item) => item.id === posto)
    const nextId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    setRows((current) => [
      ...current,
      {
        id: nextId,
        sequencia: Number(seq) || current.length + 10,
        operacao: operacao.trim(),
        posto_id: posto,
        posto_nome: postoSelecionado?.nome_posto ?? 'Posto',
        tempo_min: tempoValue,
      },
    ])

    setOperacao('')
    setTempo('15')
    setSeq(String((Number(seq) || 10) + 10))
  }

  const removeRow = (id: string) => {
    setRows((current) => current.filter((item) => item.id !== id))
  }

  const selectedProduct = produtos.find((item) => item.id === produto)
  const selectedPostName = postos.find((item) => item.id === posto)?.nome_posto ?? 'Posto'

  return (
    <main className="min-h-full bg-transparent p-1 text-slate-800">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sky-600 text-white shadow-md shadow-sky-200">
              <Factory size={20} />
            </span>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-700">PCP • SYSNQRA</p>
              <h1 className="text-[28px] font-black tracking-[-0.06em] text-slate-900">Ficha de Processo</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate(-1)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black uppercase text-slate-700 shadow-sm hover:bg-slate-50">
              <ArrowLeft size={12} /> Voltar
            </button>
            <button type="button" className="inline-flex h-10 items-center gap-2 rounded-xl bg-sky-600 px-4 text-[10px] font-black uppercase text-white shadow-md shadow-sky-200 hover:bg-sky-700">
              <Plus size={12} /> Salvar ficha
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] font-bold text-amber-800">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1.2fr_0.8fr]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className={labelClass}>
              Produto
              <select className={inputClass} value={produto} onChange={(e) => setProduto(e.target.value)} disabled={loading || !produtos.length}>
                {!produtos.length && <option value="">Selecione</option>}
                {produtos.map((item) => (
                  <option key={item.id} value={item.id}>{item.codigo} — {item.nome}</option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              Código da ficha
              <div className="flex h-[38px] items-center rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-[11px] font-black text-slate-700">
                {selectedProduct?.codigo ?? '—'} / PROC
              </div>
            </label>

            <label className={labelClass}>
              Sequência
              <input className={inputClass} type="number" min={1} value={seq} onChange={(e) => setSeq(e.target.value)} />
            </label>

            <label className={labelClass}>
              Posto de trabalho
              <select className={inputClass} value={posto} onChange={(e) => setPosto(e.target.value)} disabled={loading || !postos.length}>
                {!postos.length && <option value="">Selecione</option>}
                {postos.map((item) => (
                  <option key={item.id} value={item.id}>{item.codigo_posto} — {item.nome_posto}</option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              Operação
              <input className={inputClass} value={operacao} onChange={(e) => setOperacao(e.target.value)} placeholder="Ex.: usinagem / acabamento / embalagem" />
            </label>

            <label className={labelClass}>
              Tempo (min)
              <input className={inputClass} type="number" min={1} step={1} value={tempo} onChange={(e) => setTempo(e.target.value)} />
            </label>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Resumo</p>
              <div className="mt-3 space-y-3">
                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500"><PackageCheck size={12} /> Produto</div>
                  <div className="mt-2 text-sm font-black text-slate-900">{selectedProduct?.nome ?? '—'}</div>
                </div>

                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500"><Factory size={12} /> Posto</div>
                  <div className="mt-2 text-sm font-black text-slate-900">{selectedPostName}</div>
                </div>

                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500"><Clock3 size={12} /> Tempo total</div>
                  <div className="mt-2 text-[22px] font-black tracking-[-0.06em] text-slate-900">{totalMin.toFixed(0)} min</div>
                </div>
              </div>
            </div>

            <button type="button" onClick={addRow} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-[10px] font-black uppercase text-white shadow-md shadow-sky-200 hover:bg-sky-700">
              <Plus size={12} /> Adicionar operação
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="bg-slate-100">
                  <th className="h-11 border-b border-slate-200 px-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">Seq.</th>
                  <th className="h-11 border-b border-slate-200 px-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">Operação</th>
                  <th className="h-11 border-b border-slate-200 px-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">Posto</th>
                  <th className="h-11 border-b border-slate-200 px-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">Tempo</th>
                  <th className="h-11 border-b border-slate-200 px-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">Ação</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-12 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Nenhuma operação adicionada
                    </td>
                  </tr>
                )}

                {rows.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="border-b border-slate-100 px-3 py-3 text-[11px] font-black text-slate-700">{item.sequencia}</td>
                    <td className="border-b border-slate-100 px-3 py-3 text-[11px] font-semibold text-slate-700">{item.operacao}</td>
                    <td className="border-b border-slate-100 px-3 py-3 text-[11px] font-semibold text-slate-700">{item.posto_nome}</td>
                    <td className="border-b border-slate-100 px-3 py-3 text-[11px] font-black text-slate-700">{item.tempo_min} min</td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      <button type="button" onClick={() => removeRow(item.id)} className="inline-flex h-8 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-2 text-[9px] font-black uppercase text-rose-700 hover:bg-rose-100">
                        <Trash2 size={12} /> Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
