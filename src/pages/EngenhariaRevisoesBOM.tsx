import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, RefreshCw, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import EntityCodeLookup, { type LookupRecord } from '../components/industrial/EntityCodeLookup'

type Product = LookupRecord
type Revision = {
  id: string
  produto_id: string
  versao: number
  rendimento: number
  unidade_rendimento: string
  ativa: boolean
  status: string | null
  revisao: string | null
  created_at: string
  updated_at: string
}

export default function EngenhariaRevisoesBOM() {
  const navigate = useNavigate()
  const [empresaId, setEmpresaId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [productId, setProductId] = useState('')
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadBase = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Empresa da sessão não identificada.')
      const id = String(company.data)
      const result = await supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', id).eq('ativo', true).order('codigo').limit(2000)
      if (result.error) throw result.error
      setEmpresaId(id)
      setProducts((result.data ?? []) as Product[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar produtos da empresa.')
    } finally {
      setBusy(false)
    }
  }, [])

  const loadRevisions = useCallback(async (selectedProduct: string) => {
    if (!selectedProduct) { setRevisions([]); return }
    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Empresa da sessão não identificada.')
      const result = await supabase.from('erp_fichas_tecnicas')
        .select('id,produto_id,versao,rendimento,unidade_rendimento,ativa,status,revisao,created_at,updated_at')
        .eq('empresa_id', String(company.data))
        .eq('produto_id', selectedProduct)
        .order('versao', { ascending: false })
      if (result.error) throw result.error
      setRevisions((result.data ?? []) as Revision[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao consultar revisões reais da ficha técnica.')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => { void loadBase() }, [loadBase])
  useEffect(() => { void loadRevisions(productId) }, [productId, loadRevisions])

  const selectedProduct = products.find(product => product.id === productId)

  function openRevision() {
    if (!productId) {
      setError('Selecione um produto real para abrir sua ficha de processo.')
      return
    }
    navigate(`/ficha-engenharia?produto=${encodeURIComponent(productId)}`)
  }

  return <main className="erp-global-surface erp-compact min-h-screen bg-slate-50 p-3 text-slate-900">
    <header className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-white p-3">
      <div><p className="text-[9px] font-medium uppercase tracking-widest text-slate-500">ENGENHARIA • BOM</p><h1 className="text-[15px] font-semibold">Histórico de revisões da ficha técnica</h1><p className="mt-1 text-[10px] text-slate-600">Consulta a versão real da BOM/roteiro em erp_fichas_tecnicas. A nova revisão é criada pela ficha de engenharia, com seus itens e operações.</p></div>
      <div className="flex gap-2"><button type="button" disabled={busy} onClick={() => { void loadBase(); if (productId) void loadRevisions(productId) }} className="border border-slate-300 px-3"><RefreshCw size={13} className="mr-1 inline"/> Atualizar</button><button type="button" onClick={() => { setProductId(''); setRevisions([]); setError(''); setNotice('') }} className="border border-slate-300 px-3"><RotateCcw size={13} className="mr-1 inline"/> Limpar</button></div>
    </header>
    {(error || notice) && <div role={error ? 'alert' : 'status'} className={error ? 'mb-3 border border-red-200 bg-red-50 p-2 text-[11px] text-red-800' : 'mb-3 border border-emerald-200 bg-emerald-50 p-2 text-[11px] text-emerald-800'}>{error || notice}</div>}
    <section className="mb-3 grid grid-cols-1 gap-3 border border-slate-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <EntityCodeLookup label="Produto / código" value={productId} records={products} onChange={setProductId} onSelect={product => setProductId(product.id)} required helper="Digite o código ou consulte pela lupa." compact/>
      <button type="button" disabled={!productId || busy} onClick={openRevision} className="bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white disabled:opacity-50">Abrir ficha para nova revisão <ArrowRight size={13} className="ml-1 inline"/></button>
    </section>
    <section className="border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-3"><h2 className="text-[12px] font-semibold">Revisões cadastradas</h2><p className="text-[10px] text-slate-500">{selectedProduct ? `${selectedProduct.codigo} — ${selectedProduct.nome}` : 'Selecione um produto'} • {revisions.length} versão(ões)</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead className="bg-slate-100"><tr><th>Versão</th><th>Revisão</th><th>Rendimento</th><th>Status</th><th>Ativa</th><th>Última alteração</th></tr></thead><tbody>
        {revisions.map(row => <tr key={row.id} className="border-t border-slate-100"><td className="font-semibold">{row.versao}</td><td>{row.revisao || String(row.versao)}</td><td>{Number(row.rendimento).toLocaleString('pt-BR')} {row.unidade_rendimento}</td><td>{row.status || '—'}</td><td>{row.ativa ? 'SIM' : 'NÃO'}</td><td>{new Date(row.updated_at || row.created_at).toLocaleString('pt-BR')}</td></tr>)}
        {!revisions.length && <tr><td colSpan={6} className="p-6 text-center text-[11px] text-slate-500">{busy ? 'Consultando revisões...' : 'Nenhuma revisão encontrada para este produto.'}</td></tr>}
      </tbody></table></div>
    </section>
    <p className="mt-2 text-[10px] text-slate-500">As revisões são lidas do banco real e isoladas pela empresa autenticada. Esta tela não grava em tabelas de revisão não verificadas.</p>
  </main>
}
