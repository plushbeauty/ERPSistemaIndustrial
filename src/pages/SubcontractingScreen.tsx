import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, ArrowLeftRight, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type StatusRemessa = 'PENDENTE' | 'ENVIADO' | 'RETORNADO' | 'CANCELADO'

interface SubcontratacaoOrdem {
  id: string
  codigo_remessa: string
  producao_ordem_id: string
  fornecedor_id: string
  data_emissao: string
  status: StatusRemessa
}

interface SubcontratacaoItem {
  id: string
  subcontratacao_id: string
  produto_id: string
  lote_id: string
  quantidade_enviada: number
  quantidade_retornada: number
}

const statusStyle: Record<StatusRemessa, string> = {
  PENDENTE: 'border-amber-200 bg-amber-50 text-amber-800',
  ENVIADO: 'border-sky-200 bg-sky-50 text-sky-800',
  RETORNADO: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  CANCELADO: 'border-slate-200 bg-slate-100 text-slate-600',
}

export default function SubcontractingScreen() {
  const [ordens, setOrdens] = useState<SubcontratacaoOrdem[]>([])
  const [itens, setItens] = useState<SubcontratacaoItem[]>([])
  const [selectedOrdemId, setSelectedOrdemId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingItens, setLoadingItens] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSubcontratacoes = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: queryError } = await supabase
      .from('erp_subcontratacao_ordens')
      .select('id,codigo_remessa,producao_ordem_id,fornecedor_id,data_emissao,status')
      .order('data_emissao', { ascending: false })
      .limit(500)

    if (queryError) {
      setError(queryError.message)
      setOrdens([])
    } else {
      const rows = (data ?? []) as SubcontratacaoOrdem[]
      setOrdens(rows)
      if (selectedOrdemId && !rows.some(row => row.id === selectedOrdemId)) {
        setSelectedOrdemId(null)
        setItens([])
      }
    }
    setLoading(false)
  }, [selectedOrdemId])

  const fetchItensOrdem = async (id: string) => {
    setSelectedOrdemId(id)
    setLoadingItens(true)
    setError(null)
    const { data, error: queryError } = await supabase
      .from('erp_subcontratacao_itens')
      .select('id,subcontratacao_id,produto_id,lote_id,quantidade_enviada,quantidade_retornada')
      .eq('subcontratacao_id', id)
      .order('created_at', { ascending: true })

    if (queryError) {
      setError(queryError.message)
      setItens([])
    } else {
      setItens((data ?? []) as SubcontratacaoItem[])
    }
    setLoadingItens(false)
  }

  useEffect(() => {
    void fetchSubcontratacoes()
  }, [fetchSubcontratacoes])

  return (
    <main className="erp-horizontal-workspace min-h-[calc(100vh-48px)] space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-700">
            <ArrowLeftRight size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold tracking-wide text-slate-900">Subcontratação industrial</h1>
            <p className="mt-1 text-xs text-slate-500">Remessas externas, lotes rastreáveis e retorno de materiais</p>
          </div>
        </div>
        <button type="button" onClick={() => void fetchSubcontratacoes()} disabled={loading}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
        <AlertCircle size={16} className="mt-0.5 shrink-0" /><span>Não foi possível carregar os dados reais: {error}</span>
      </div>}

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div><h2 className="text-sm font-bold text-slate-900">Ordens de remessa</h2><p className="mt-0.5 text-[11px] text-slate-500">Registros visíveis conforme sessão e RLS da empresa</p></div>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{ordens.length} registro(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] border-collapse text-left text-xs">
              <thead><tr className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <th className="p-3 pl-4">Código remessa</th><th className="p-3">OP</th><th className="p-3">Emissão</th><th className="p-3 pr-4 text-right">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan={4} className="p-8 text-center text-slate-500">Carregando remessas…</td></tr>
                  : ordens.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-slate-500">Nenhuma remessa encontrada para esta empresa.</td></tr>
                  : ordens.map(ordem => <tr key={ordem.id} onClick={() => void fetchItensOrdem(ordem.id)}
                    aria-selected={selectedOrdemId === ordem.id}
                    className={`cursor-pointer transition-colors hover:bg-orange-50/60 ${selectedOrdemId === ordem.id ? 'bg-orange-50 ring-1 ring-inset ring-orange-200' : ''}`}>
                    <td className="p-3 pl-4 font-bold text-slate-900">{ordem.codigo_remessa}</td>
                    <td className="max-w-[150px] truncate p-3 font-mono text-[10px] text-slate-500" title={ordem.producao_ordem_id}>{ordem.producao_ordem_id.slice(0, 8)}…</td>
                    <td className="whitespace-nowrap p-3 text-slate-600">{new Date(ordem.data_emissao).toLocaleDateString('pt-BR')}</td>
                    <td className="p-3 pr-4 text-right"><span className={`inline-flex rounded-md border px-2 py-1 text-[9px] font-extrabold uppercase ${statusStyle[ordem.status]}`}>{ordem.status}</span></td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Rastreabilidade dos itens</h2>
            <p className="mt-1 text-[11px] text-slate-500">Lote e quantidades enviadas/retornadas</p>
          </div>
          {!selectedOrdemId ? <p className="py-8 text-center text-xs text-slate-500">Selecione uma remessa para auditar os lotes e quantidades.</p>
            : loadingItens ? <p className="py-8 text-center text-xs text-slate-500">Carregando itens…</p>
            : itens.length === 0 ? <p className="py-8 text-center text-xs text-slate-500">Esta remessa não possui itens cadastrados.</p>
            : <div className="mt-3 space-y-3">{itens.map(item => <article key={item.id} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <span className="text-[10px] font-bold uppercase text-slate-500">Lote</span>
                <span className="font-mono text-xs font-bold text-orange-700" title={item.lote_id}>{item.lote_id.slice(0, 8)}…</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="block text-[9px] font-bold uppercase text-slate-500">Qtd. enviada</span><strong className="mt-1 block text-sm text-slate-800">{Number(item.quantidade_enviada).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</strong></div>
                <div className="text-right"><span className="block text-[9px] font-bold uppercase text-slate-500">Qtd. retornada</span><strong className="mt-1 block text-sm text-emerald-700">{Number(item.quantidade_retornada).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</strong></div>
              </div>
              <p className="truncate text-[10px] text-slate-500" title={item.produto_id}>Produto: {item.produto_id}</p>
            </article>)}</div>}
        </section>
      </div>
    </main>
  )
}
