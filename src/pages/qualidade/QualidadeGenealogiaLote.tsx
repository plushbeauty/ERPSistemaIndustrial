/**
 * @DATA_REVISAO_APROVACAO: 2026-10-19
 * @DESENVOLVEDOR: FernandoSch
 * @NOME_SISTEMA: MOLDPLÁS ERP INDUSTRIAL
 * @REVISAO: Genealogia de lotes — Steel Blue, persistência real e isolamento por empresa
 * @NOTA: Indicador de banco representa leitura confirmada; não declara status de build/deploy.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertTriangle, ArrowRight, CheckCircle2, GitBranch, Plus, RefreshCw,
  Search, Server, X, Layers, Save, Eye
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import QualitySidebar from '../../components/quality/QualitySidebar'

type Product = { id: string; codigo: string; nome: string }
type GenealogiaRow = {
  id: string
  codigo_lote_pai: string
  produto_pai_id: string
  codigo_lote_filho: string
  produto_filho_id: string
  quantidade_vinculada: number
  ordem_producao_id: string | null
  hash_verificacao: string
  created_at: string
  prod_pai: Product | null
  prod_filho: Product | null
}

const inputClass = 'h-8 w-full rounded-none border border-[#2E4A62] bg-[#0E1E2F] px-2.5 text-xs font-mono font-bold text-[#F4FBFD] outline-none transition-colors placeholder:text-slate-500 focus:border-[#48B7C7] focus:ring-1 focus:ring-[#48B7C7]/30 disabled:opacity-50'
const labelClass = 'mb-1 block text-[9px] font-black uppercase tracking-widest text-[#B8C9D8]'
const panelClass = 'border border-[#2E4A62] bg-[#0D2638]'
const buttonClass = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-none border border-[#2E4A62] px-3 text-[9px] font-black uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-50'

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return 'Falha ao sincronizar os dados de genealogia.'
}

export default function QualidadeGenealogiaLote() {
  const [empresaId, setEmpresaId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [rows, setRows] = useState<GenealogiaRow[]>([])
  const [selectedRow, setSelectedRow] = useState<GenealogiaRow | null>(null)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showPanel, setShowPanel] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [databaseStatus, setDatabaseStatus] = useState<'VERIFICANDO' | 'LIDO' | 'ERRO'>('VERIFICANDO')
  const [lotePai, setLotePai] = useState('')
  const [produtoPaiId, setProdutoPaiId] = useState('')
  const [loteFilho, setLoteFilho] = useState('')
  const [produtoFilhoId, setProdutoFilhoId] = useState('')
  const [qtdVinculada, setQtdVinculada] = useState('1')
  const [opId, setOpId] = useState('')

  const loadGenealogyCatalog = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      if (!tenant.data) throw new Error('Empresa do usuário não identificada. Verifique a sessão e o vínculo de empresa.')
      const companyId = String(tenant.data)
      setEmpresaId(companyId)

      const [productResult, genealogyResult] = await Promise.all([
        supabase.from('erp_produtos')
          .select('id,codigo,nome')
          .eq('empresa_id', companyId)
          .eq('ativo', true)
          .order('codigo'),
        supabase.from('erp_qualidade_genealogia_lotes')
          .select('id,codigo_lote_pai,produto_pai_id,codigo_lote_filho,produto_filho_id,quantidade_vinculada,ordem_producao_id,hash_verificacao,created_at')
          .eq('empresa_id', companyId)
          .order('created_at', { ascending: false })
          .limit(500)
      ])
      if (productResult.error) throw productResult.error
      if (genealogyResult.error) throw genealogyResult.error

      const productRows = (productResult.data ?? []) as Product[]
      const productById = new Map(productRows.map((product) => [product.id, product]))
      const mapped: GenealogiaRow[] = (genealogyResult.data ?? []).map((item) => ({
        id: item.id,
        codigo_lote_pai: item.codigo_lote_pai,
        produto_pai_id: item.produto_pai_id,
        codigo_lote_filho: item.codigo_lote_filho,
        produto_filho_id: item.produto_filho_id,
        quantidade_vinculada: Number(item.quantidade_vinculada),
        ordem_producao_id: item.ordem_producao_id,
        hash_verificacao: item.hash_verificacao,
        created_at: item.created_at,
        prod_pai: productById.get(item.produto_pai_id) ?? null,
        prod_filho: productById.get(item.produto_filho_id) ?? null
      }))
      setProducts(productRows)
      setRows(mapped)
      setDatabaseStatus('LIDO')
    } catch (loadError) {
      setDatabaseStatus('ERRO')
      setError(messageOf(loadError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadGenealogyCatalog() }, [loadGenealogyCatalog])

  const filteredRows = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    if (!term) return rows
    return rows.filter((row) => [
      row.codigo_lote_pai, row.codigo_lote_filho,
      row.prod_pai?.codigo, row.prod_pai?.nome,
      row.prod_filho?.codigo, row.prod_filho?.nome,
      row.ordem_producao_id
    ].some((value) => (value ?? '').toLocaleLowerCase('pt-BR').includes(term)))
  }, [rows, query])

  const clearForm = () => {
    setSelectedRow(null)
    setLotePai('')
    setProdutoPaiId('')
    setLoteFilho('')
    setProdutoFilhoId('')
    setQtdVinculada('1')
    setOpId('')
    setError('')
    setSuccess('')
  }

  const selectRow = (row: GenealogiaRow) => {
    setSelectedRow(row)
    setLotePai(row.codigo_lote_pai)
    setProdutoPaiId(row.produto_pai_id)
    setLoteFilho(row.codigo_lote_filho)
    setProdutoFilhoId(row.produto_filho_id)
    setQtdVinculada(String(row.quantidade_vinculada))
    setOpId(row.ordem_producao_id ?? '')
    setShowPanel(true)
    setSuccess('')
  }

  const persistLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (selectedRow) {
      setError('Este vínculo é somente para consulta. Clique em “Novo vínculo” para registrar uma nova relação; o histórico existente não será sobrescrito.')
      return
    }
    if (!empresaId) {
      setError('Empresa não identificada. Atualize a sessão e tente novamente.')
      return
    }
    const parentLot = lotePai.trim().toUpperCase()
    const childLot = loteFilho.trim().toUpperCase()
    const quantity = Number(qtdVinculada)
    if (!parentLot || !produtoPaiId || !childLot || !produtoFilhoId) {
      setError('Preencha os dois lotes e selecione os dois produtos.')
      return
    }
    if (parentLot === childLot) {
      setError('O lote de origem e o lote derivado não podem ser iguais.')
      return
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('A quantidade vinculada deve ser maior que zero.')
      return
    }
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getUser()
      if (sessionError) throw sessionError
      if (!sessionData.user) throw new Error('Sessão autenticada necessária para registrar a genealogia.')
      const auditToken = globalThis.crypto?.randomUUID?.()
      if (!auditToken) throw new Error('O navegador não oferece gerador seguro de identificador de auditoria.')

      const result = await supabase.from('erp_qualidade_genealogia_lotes').insert({
        empresa_id: empresaId,
        codigo_lote_pai: parentLot,
        produto_pai_id: produtoPaiId,
        codigo_lote_filho: childLot,
        produto_filho_id: produtoFilhoId,
        quantidade_vinculada: quantity,
        ordem_producao_id: opId.trim() || null,
        hash_verificacao: auditToken
      })
      if (result.error) throw result.error
      setSuccess('Vínculo enviado ao banco. Atualizando a listagem para confirmar a persistência...')
      clearForm()
      await loadGenealogyCatalog()
      setSuccess('Vínculo registrado e confirmado pela releitura do banco.')
    } catch (saveError) {
      setError(messageOf(saveError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0E1E2F] p-2.5 text-[#F4FBFD] antialiased md:p-3">
      <QualitySidebar active="/qualidade/genealogia-lote" />
      <div className="mx-auto mt-2 max-w-[1800px] space-y-3 font-mono">
        <header className="flex flex-wrap items-center justify-between gap-3 border border-[#2E4A62] bg-[#0D2638] px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center border border-[#2E4A62] bg-[#0E1E2F] text-[#48B7C7]"><GitBranch size={19} /></div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#48B7C7]">SGQ / Rastreabilidade</p>
              <h1 className="text-sm font-black uppercase tracking-wide text-white md:text-base">Genealogia de lotes</h1>
              <p className="mt-0.5 text-[10px] text-[#B8C9D8]">Origem do insumo → produto derivado → ordem de produção</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-8 items-center gap-2 border border-[#2E4A62] bg-[#0E1E2F] px-2.5 text-[9px] font-black uppercase">
              <Server size={13} className={databaseStatus === 'LIDO' ? 'text-emerald-400' : databaseStatus === 'ERRO' ? 'text-rose-400' : 'text-[#48B7C7]'} />
              <span className="text-[#B8C9D8]">Banco:</span>
              <span className={databaseStatus === 'LIDO' ? 'text-emerald-300' : databaseStatus === 'ERRO' ? 'text-rose-300' : 'text-amber-300'}>
                {databaseStatus === 'LIDO' ? 'LEITURA CONFIRMADA' : databaseStatus === 'ERRO' ? 'ERRO DE LEITURA' : 'VERIFICANDO'}
              </span>
            </div>
            <button type="button" onClick={() => void loadGenealogyCatalog()} disabled={loading || busy} className={buttonClass + ' bg-[#123B50] text-white hover:bg-[#18516B]'}>
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Atualizar
            </button>
          </div>
        </header>

        {error && <div role="alert" className="flex items-start gap-2 border border-rose-800 bg-[#3B1720] px-3 py-2 text-xs font-bold text-rose-100"><AlertTriangle size={15} className="mt-0.5 shrink-0" /><span>{error}</span></div>}
        {success && <div role="status" className="flex items-start gap-2 border border-emerald-800 bg-[#102F2A] px-3 py-2 text-xs font-bold text-emerald-100"><CheckCircle2 size={15} className="mt-0.5 shrink-0" /><span>{success}</span></div>}

        <div className={'grid grid-cols-1 items-start gap-3 ' + (showPanel ? '2xl:grid-cols-12' : '')}>
          <section className={panelClass + ' min-w-0 overflow-hidden ' + (showPanel ? '2xl:col-span-7' : '')}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E4A62] bg-[#0E1E2F] p-2">
              <div className="flex h-8 min-w-[190px] flex-1 items-center gap-2 border border-[#2E4A62] bg-[#071522] px-2.5 sm:max-w-sm">
                <Search size={13} className="shrink-0 text-[#48B7C7]" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar lote, SKU, produto ou OP..." aria-label="Pesquisar genealogia" className="h-full w-full bg-transparent text-[10px] font-bold text-white outline-none placeholder:text-slate-500" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase text-[#B8C9D8]">{filteredRows.length} vínculo(s)</span>
                <button type="button" onClick={() => { clearForm(); setShowPanel(true) }} className={buttonClass + ' border-[#267C8E] bg-[#0B4A5B] text-white hover:bg-[#126176]'}>
                  <Plus size={12} /> Novo vínculo
                </button>
                <button type="button" aria-label={showPanel ? 'Recolher formulário' : 'Abrir formulário'} onClick={() => setShowPanel((value) => !value)} className={buttonClass + ' bg-[#123B50] text-white hover:bg-[#18516B]'}>
                  {showPanel ? <X size={12} /> : <Layers size={12} />}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[10px]">
                <thead>
                  <tr className="h-8 border-b border-[#2E4A62] bg-[#102B40] text-[8px] font-black uppercase tracking-wider text-[#48B7C7]">
                    <th className="px-2.5 py-2">Lote de origem / SKU</th>
                    <th className="w-7 px-1 text-center"></th>
                    <th className="px-2.5 py-2">Lote derivado / SKU</th>
                    <th className="px-2.5 py-2 text-right">Qtd.</th>
                    <th className="px-2.5 py-2">OP vinculada</th>
                    <th className="w-12 px-2 text-center">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2E4A62]/70">
                  {filteredRows.map((row) => (
                    <tr key={row.id} className={'min-h-10 hover:bg-[#123B50]/60 ' + (selectedRow?.id === row.id ? 'bg-[#123B50]' : '')}>
                      <td className="px-2.5 py-2">
                        <span className="block break-all font-black text-[#48B7C7]">{row.codigo_lote_pai}</span>
                        <span className="mt-0.5 block max-w-[230px] truncate text-[9px] text-[#B8C9D8]">{row.prod_pai ? row.prod_pai.codigo + ' — ' + row.prod_pai.nome : 'Produto fora do catálogo ativo'}</span>
                      </td>
                      <td className="px-1 text-center text-[#48B7C7]"><ArrowRight size={13} /></td>
                      <td className="px-2.5 py-2">
                        <span className="block break-all font-black text-white">{row.codigo_lote_filho}</span>
                        <span className="mt-0.5 block max-w-[230px] truncate text-[9px] text-[#B8C9D8]">{row.prod_filho ? row.prod_filho.codigo + ' — ' + row.prod_filho.nome : 'Produto fora do catálogo ativo'}</span>
                      </td>
                      <td className="px-2.5 py-2 text-right font-black tabular-nums text-[#B8DFF0]">{row.quantidade_vinculada}</td>
                      <td className="px-2.5 py-2 text-[#B8C9D8]">{row.ordem_producao_id || '—'}</td>
                      <td className="px-2 py-2 text-center">
                        <button type="button" aria-label={'Consultar vínculo ' + row.codigo_lote_pai + ' para ' + row.codigo_lote_filho} onClick={() => selectRow(row)} className="inline-flex h-7 w-7 items-center justify-center border border-[#2E4A62] text-[#48B7C7] hover:bg-[#123B50]"><Eye size={13} /></button>
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredRows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-[10px] text-[#B8C9D8]">{rows.length === 0 ? 'Nenhum vínculo encontrado no banco para esta empresa.' : 'Nenhum vínculo corresponde à pesquisa.'}</td></tr>}
                  {loading && <tr><td colSpan={6} className="px-3 py-8 text-center text-[10px] text-[#B8C9D8]"><RefreshCw size={14} className="mr-2 inline animate-spin" />Sincronizando com o banco...</td></tr>}
                </tbody>
              </table>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#2E4A62] bg-[#0E1E2F] px-2.5 py-2 text-[8px] font-bold uppercase tracking-wide text-[#8FA8BC]">
              <span>Consulta limitada à empresa autenticada</span>
              <span>Exibindo até 500 registros recentes</span>
            </footer>
          </section>

          {showPanel && <section className={panelClass + ' min-w-0 2xl:col-span-5'}>
            <header className="flex items-center justify-between gap-2 border-b border-[#2E4A62] bg-[#102B40] px-3 py-2.5">
              <div className="flex items-center gap-2"><GitBranch size={15} className="text-[#48B7C7]" /><div><h2 className="text-[10px] font-black uppercase tracking-wider text-white">{selectedRow ? 'Consultar vínculo' : 'Amarração de genealogia'}</h2><p className="mt-0.5 text-[9px] text-[#B8C9D8]">{selectedRow ? 'Histórico existente — somente leitura' : 'Registrar origem e derivação do lote'}</p></div></div>
              <button type="button" aria-label="Fechar painel" onClick={() => setShowPanel(false)} className="flex h-7 w-7 items-center justify-center border border-[#2E4A62] text-[#B8C9D8] hover:bg-[#0E1E2F]"><X size={13} /></button>
            </header>
            <form onSubmit={(event) => void persistLink(event)} className="space-y-3 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label><span className={labelClass}>1. Lote de origem *</span><input required maxLength={50} disabled={Boolean(selectedRow) || busy} value={lotePai} onChange={(event) => setLotePai(event.target.value)} placeholder="Ex.: MP-PP-001" className={inputClass} /></label>
                <label><span className={labelClass}>Produto / insumo de origem *</span><select required disabled={Boolean(selectedRow) || busy} value={produtoPaiId} onChange={(event) => setProdutoPaiId(event.target.value)} className={inputClass}><option value="">Selecione o produto...</option>{products.map((product) => <option key={product.id} value={product.id}>{product.codigo} — {product.nome}</option>)}</select></label>
              </div>
              <div className="flex items-center gap-2 border-y border-[#2E4A62] py-2 text-[9px] font-black uppercase tracking-widest text-[#48B7C7]"><ArrowRight size={14} /> Transformação / consumo</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label><span className={labelClass}>2. Lote derivado *</span><input required maxLength={50} disabled={Boolean(selectedRow) || busy} value={loteFilho} onChange={(event) => setLoteFilho(event.target.value)} placeholder="Ex.: PA-PEC-090" className={inputClass} /></label>
                <label><span className={labelClass}>Produto acabado / derivado *</span><select required disabled={Boolean(selectedRow) || busy} value={produtoFilhoId} onChange={(event) => setProdutoFilhoId(event.target.value)} className={inputClass}><option value="">Selecione o produto...</option>{products.map((product) => <option key={product.id} value={product.id}>{product.codigo} — {product.nome}</option>)}</select></label>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label><span className={labelClass}>3. Ordem de produção (OP)</span><input maxLength={50} disabled={Boolean(selectedRow) || busy} value={opId} onChange={(event) => setOpId(event.target.value)} placeholder="Número ou ID da OP" className={inputClass} /></label>
                <label><span className={labelClass}>Quantidade vinculada *</span><input required type="number" min="0.001" step="any" disabled={Boolean(selectedRow) || busy} value={qtdVinculada} onChange={(event) => setQtdVinculada(event.target.value)} className={inputClass + ' text-right tabular-nums'} /></label>
              </div>
              {selectedRow && <div className="border border-[#2E4A62] bg-[#0E1E2F] p-2 text-[9px] text-[#B8C9D8]"><span className="font-black uppercase text-[#48B7C7]">Identificador de auditoria:</span><p className="mt-1 break-all">{selectedRow.hash_verificacao}</p><p className="mt-1">Registrado em: {new Date(selectedRow.created_at).toLocaleString('pt-BR')}</p></div>}
              {selectedRow ? <button type="button" onClick={clearForm} className={buttonClass + ' w-full bg-[#123B50] text-white hover:bg-[#18516B]'}><Plus size={12} /> Novo vínculo</button> : <button type="submit" disabled={busy || loading || !empresaId || products.length === 0} className={buttonClass + ' w-full border-[#267C8E] bg-[#0B4A5B] text-white hover:bg-[#126176]'}>{busy ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}{busy ? 'Gravando e confirmando...' : 'Registrar vínculo no banco'}</button>}
              <p className="text-[9px] leading-relaxed text-[#8FA8BC]">A gravação depende das permissões RLS e da migração de banco. O estado “leitura confirmada” comprova apenas a consulta bem-sucedida, não o status do build ou do deploy.</p>
            </form>
          </section>}
        </div>
      </div>
    </main>
  )
}
