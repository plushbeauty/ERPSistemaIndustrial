/**
 * @DATA_REVISAO_APROVACAO: 2026-11-04
 * @REVISAO: REV-PADRAO-COR-CLARO-20261104-01 — tela convertida do tema escuro para o padrao industrial claro (fundo #F4FBFD, paineis brancos, texto #123B50); nenhuma alteracao de logica ou de consulta
 * @AUTOR: FernandoSch
 * @STATUS_APROVACAO: PADRAO UNICO DE COR APLICADO POR ORDEM DO PROPRIETARIO EM 2026-11-04
 */
/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */

/**
 * @DATA_REVISAO_ANTERIOR: 2026-10-19
 * @DESENVOLVEDOR: FernandoSch
 * @NOME_SISTEMA: SYSNQRA ERP INDUSTRIAL
 * @REVISAO_ANTERIOR: Genealogia de lotes — Steel Blue, persistência real e isolamento por empresa
 * @NOTA: Indicador de banco representa leitura confirmada; não declara status de build/deploy.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertTriangle, ArrowRight, CheckCircle2, GitBranch, Plus, RefreshCw,
  Search, Server, X, Layers, Save, Eye
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

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

const inputClass = 'h-8 w-full rounded-none border border-[#CFE1E7] bg-[#F8FAFC] px-2.5 text-xs font-bold text-[#123B50] outline-none transition-colors placeholder:text-slate-500 focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/30 disabled:opacity-50'
const labelClass = 'mb-1 block text-[9px] font-black uppercase tracking-widest text-slate-500'
const panelClass = 'border border-[#CFE1E7] bg-white'
const buttonClass = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-none border border-[#CFE1E7] px-3 text-[9px] font-black uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-50'

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

  const loadGenealogyCatalog = useCallback(async (): Promise<boolean> => {
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
      return true
    } catch (loadError) {
      setDatabaseStatus('ERRO')
      setError(messageOf(loadError))
      return false
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
      const reloadConfirmed = await loadGenealogyCatalog()
      if (!reloadConfirmed) throw new Error('O envio foi aceito, mas a releitura de confirmação falhou. Verifique a listagem antes de tentar cadastrar novamente.')
      setSuccess('Vínculo registrado e confirmado pela releitura do banco.')
    } catch (saveError) {
      setError(messageOf(saveError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F4FBFD] p-2.5 text-[#123B50] antialiased md:p-3">
      <div className="mx-auto mt-2 max-w-[1800px] space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-3 border border-[#CFE1E7] bg-white px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center border border-[#CFE1E7] bg-[#EAF6FA] text-[#176487]"><GitBranch size={19} /></div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#176487]">SGQ / Rastreabilidade</p>
              <h1 className="text-sm font-black uppercase tracking-wide text-[#123B50] md:text-base">Genealogia de lotes</h1>
              <p className="mt-0.5 text-[10px] text-slate-500">Origem do insumo → produto derivado → ordem de produção</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-8 items-center gap-2 border border-[#CFE1E7] bg-[#F8FAFC] px-2.5 text-[9px] font-black uppercase">
              <Server size={13} className={databaseStatus === 'LIDO' ? 'text-emerald-700' : databaseStatus === 'ERRO' ? 'text-rose-700' : 'text-[#176487]'} />
              <span className="text-slate-500">Banco:</span>
              <span className={databaseStatus === 'LIDO' ? 'text-emerald-700' : databaseStatus === 'ERRO' ? 'text-rose-700' : 'text-amber-800'}>
                {databaseStatus === 'LIDO' ? 'LEITURA CONFIRMADA' : databaseStatus === 'ERRO' ? 'ERRO DE LEITURA' : 'VERIFICANDO'}
              </span>
            </div>
            <button type="button" onClick={() => void loadGenealogyCatalog()} disabled={loading || busy} className={buttonClass + ' bg-[#123B50] text-white hover:bg-[#18516B]'}>
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Atualizar
            </button>
          </div>
        </header>

        {error && <div role="alert" className="flex items-start gap-2 border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"><AlertTriangle size={15} className="mt-0.5 shrink-0" /><span>{error}</span></div>}
        {success && <div role="status" className="flex items-start gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"><CheckCircle2 size={15} className="mt-0.5 shrink-0" /><span>{success}</span></div>}

        <div className={'grid grid-cols-1 items-start gap-3 ' + (showPanel ? '2xl:grid-cols-12' : '')}>
          <section className={panelClass + ' min-w-0 overflow-hidden ' + (showPanel ? '2xl:col-span-7' : '')}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#CFE1E7] bg-[#F8FAFC] p-2">
              <div className="flex h-8 min-w-[190px] flex-1 items-center gap-2 border border-[#CFE1E7] bg-white px-2.5 sm:max-w-sm">
                <Search size={13} className="shrink-0 text-[#176487]" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar lote, SKU, produto ou OP..." aria-label="Pesquisar genealogia" className="h-full w-full bg-transparent text-[10px] font-bold text-[#123B50] outline-none placeholder:text-slate-500" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase text-slate-500">{filteredRows.length} vínculo(s)</span>
                <button type="button" onClick={() => { clearForm(); setShowPanel(true) }} className={buttonClass + ' border-[#B8D5DE] bg-[#2D8DB8] text-white hover:bg-[#236F91]'}>
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
                  <tr className="h-8 border-b border-[#CFE1E7] bg-[#123B50] text-[8px] font-black uppercase tracking-wider text-[#BDECF3]">
                    <th className="px-2.5 py-2">Lote de origem / SKU</th>
                    <th className="w-7 px-1 text-center"></th>
                    <th className="px-2.5 py-2">Lote derivado / SKU</th>
                    <th className="px-2.5 py-2 text-right">Qtd.</th>
                    <th className="px-2.5 py-2">OP vinculada</th>
                    <th className="w-12 px-2 text-center">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CFE1E7]">
                  {filteredRows.map((row) => (
                    <tr key={row.id} className={'min-h-10 hover:bg-[#EAF6FA] ' + (selectedRow?.id === row.id ? 'bg-[#C8E3EE]' : '')}>
                      <td className="px-2.5 py-2">
                        <span className="block break-all font-black text-[#176487]">{row.codigo_lote_pai}</span>
                        <span className="mt-0.5 block max-w-[230px] truncate text-[9px] text-slate-500">{row.prod_pai ? row.prod_pai.codigo + ' — ' + row.prod_pai.nome : 'Produto fora do catálogo ativo'}</span>
                      </td>
                      <td className="px-1 text-center text-[#2D8DB8]"><ArrowRight size={13} /></td>
                      <td className="px-2.5 py-2">
                        <span className="block break-all font-black text-[#123B50]">{row.codigo_lote_filho}</span>
                        <span className="mt-0.5 block max-w-[230px] truncate text-[9px] text-slate-500">{row.prod_filho ? row.prod_filho.codigo + ' — ' + row.prod_filho.nome : 'Produto fora do catálogo ativo'}</span>
                      </td>
                      <td className="px-2.5 py-2 text-right font-black tabular-nums text-[#176487]">{row.quantidade_vinculada}</td>
                      <td className="px-2.5 py-2 text-slate-500">{row.ordem_producao_id || '—'}</td>
                      <td className="px-2 py-2 text-center">
                        <button type="button" aria-label={'Consultar vínculo ' + row.codigo_lote_pai + ' para ' + row.codigo_lote_filho} onClick={() => selectRow(row)} className="inline-flex h-7 w-7 items-center justify-center border border-[#CFE1E7] text-[#176487] hover:bg-[#EAF6FA]"><Eye size={13} /></button>
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredRows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-[10px] text-slate-500">{rows.length === 0 ? 'Nenhum vínculo encontrado no banco para esta empresa.' : 'Nenhum vínculo corresponde à pesquisa.'}</td></tr>}
                  {loading && <tr><td colSpan={6} className="px-3 py-8 text-center text-[10px] text-slate-500"><RefreshCw size={14} className="mr-2 inline animate-spin" />Sincronizando com o banco...</td></tr>}
                </tbody>
              </table>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#CFE1E7] bg-[#F8FAFC] px-2.5 py-2 text-[8px] font-bold uppercase tracking-wide text-slate-500">
              <span>Consulta limitada à empresa autenticada</span>
              <span>Exibindo até 500 registros recentes</span>
            </footer>
          </section>

          {showPanel && <section className={panelClass + ' min-w-0 2xl:col-span-5'}>
            <header className="flex items-center justify-between gap-2 border-b border-[#CFE1E7] bg-[#EAF6FA] px-3 py-2.5">
              <div className="flex items-center gap-2"><GitBranch size={15} className="text-[#176487]" /><div><h2 className="text-[10px] font-black uppercase tracking-wider text-[#123B50]">{selectedRow ? 'Consultar vínculo' : 'Amarração de genealogia'}</h2><p className="mt-0.5 text-[9px] text-slate-500">{selectedRow ? 'Histórico existente — somente leitura' : 'Registrar origem e derivação do lote'}</p></div></div>
              <button type="button" aria-label="Fechar painel" onClick={() => setShowPanel(false)} className="flex h-7 w-7 items-center justify-center border border-[#CFE1E7] text-slate-500 hover:bg-[#EAF6FA]"><X size={13} /></button>
            </header>
            <form onSubmit={(event) => void persistLink(event)} className="space-y-3 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label><span className={labelClass}>1. Lote de origem *</span><input required maxLength={50} disabled={Boolean(selectedRow) || busy} value={lotePai} onChange={(event) => setLotePai(event.target.value)} placeholder="Ex.: MP-PP-001" className={inputClass} /></label>
                <label><span className={labelClass}>Produto / insumo de origem *</span><select required disabled={Boolean(selectedRow) || busy} value={produtoPaiId} onChange={(event) => setProdutoPaiId(event.target.value)} className={inputClass}><option value="">Selecione o produto...</option>{products.map((product) => <option key={product.id} value={product.id}>{product.codigo} — {product.nome}</option>)}</select></label>
              </div>
              <div className="flex items-center gap-2 border-y border-[#CFE1E7] py-2 text-[9px] font-black uppercase tracking-widest text-[#176487]"><ArrowRight size={14} /> Transformação / consumo</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label><span className={labelClass}>2. Lote derivado *</span><input required maxLength={50} disabled={Boolean(selectedRow) || busy} value={loteFilho} onChange={(event) => setLoteFilho(event.target.value)} placeholder="Ex.: PA-PEC-090" className={inputClass} /></label>
                <label><span className={labelClass}>Produto acabado / derivado *</span><select required disabled={Boolean(selectedRow) || busy} value={produtoFilhoId} onChange={(event) => setProdutoFilhoId(event.target.value)} className={inputClass}><option value="">Selecione o produto...</option>{products.map((product) => <option key={product.id} value={product.id}>{product.codigo} — {product.nome}</option>)}</select></label>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label><span className={labelClass}>3. Ordem de produção (OP)</span><input maxLength={50} disabled={Boolean(selectedRow) || busy} value={opId} onChange={(event) => setOpId(event.target.value)} placeholder="Número ou ID da OP" className={inputClass} /></label>
                <label><span className={labelClass}>Quantidade vinculada *</span><input required type="number" min="0.001" step="any" disabled={Boolean(selectedRow) || busy} value={qtdVinculada} onChange={(event) => setQtdVinculada(event.target.value)} className={inputClass + ' text-right tabular-nums'} /></label>
              </div>
              {selectedRow && <div className="border border-[#CFE1E7] bg-[#F8FAFC] p-2 text-[9px] text-slate-500"><span className="font-black uppercase text-[#176487]">Identificador de auditoria:</span><p className="mt-1 break-all">{selectedRow.hash_verificacao}</p><p className="mt-1">Registrado em: {new Date(selectedRow.created_at).toLocaleString('pt-BR')}</p></div>}
              {selectedRow ? <button type="button" onClick={clearForm} className={buttonClass + ' w-full bg-[#123B50] text-white hover:bg-[#18516B]'}><Plus size={12} /> Novo vínculo</button> : <button type="submit" disabled={busy || loading || !empresaId || products.length === 0} className={buttonClass + ' w-full border-[#B8D5DE] bg-[#2D8DB8] text-white hover:bg-[#236F91]'}>{busy ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}{busy ? 'Gravando e confirmando...' : 'Registrar vínculo no banco'}</button>}
              <p className="text-[9px] leading-relaxed text-slate-500">A gravação depende das permissões RLS e da migração de banco. O estado “leitura confirmada” comprova apenas a consulta bem-sucedida, não o status do build ou do deploy.</p>
            </form>
          </section>}
        </div>
      </div>
    </main>
  )
}
