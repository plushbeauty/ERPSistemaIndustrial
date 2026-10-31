/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
/**
 * @DATA_REVISAO_ANTERIOR: 2026-10-19
 * @DESENVOLVEDOR: FernandoSch
 * @NOME_SISTEMA: MOLDPLÁS ERP INDUSTRIAL
 * @STATUS_ANTERIOR: LIBERACAO-LOTES-INTEGRADO-REVISAO
 * @ESCOPO: registro documental de parecer SGQ; não efetua liberação transacional do estoque.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardCheck, Plus, Printer, RefreshCw, Search, ShieldAlert, ShieldCheck, X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import QualitySidebar from '../../components/quality/QualitySidebar'

type Product = { id: string; codigo: string; nome: string }
type LotStatus = 'APROVADO' | 'REPROVADO' | 'QUARENTENA'
type LotRow = {
  id: string
  codigo_lote: string
  produto_id: string
  quantidade: number
  status_sgq: LotStatus
  responsavel_liberacao: string
  observacoes: string | null
  created_at: string
  updated_at: string
  criado_por: string
}
type LotForm = {
  codigo: string
  produtoId: string
  quantidade: string
  status: LotStatus
  responsavel: string
  observacoes: string
}
const inputClass = 'h-8 w-full min-w-0 rounded-none border border-[#2E4A62] bg-[#0E1E2F] px-2 text-[11px] font-bold text-[#F4FBFD] outline-none focus:border-[#48B7C7] disabled:cursor-not-allowed disabled:opacity-60'
const labelClass = 'mb-1 block text-[9px] font-black uppercase tracking-wider text-[#8DCAD8]'
const blankForm = (): LotForm => ({ codigo: '', produtoId: '', quantidade: '1', status: 'QUARENTENA', responsavel: '', observacoes: '' })

export default function QualidadeLiberacaoLotes() {
  const [empresaId, setEmpresaId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [rows, setRows] = useState<LotRow[]>([])
  const [selected, setSelected] = useState<LotRow | null>(null)
  const [form, setForm] = useState<LotForm>(blankForm)
  const [query, setQuery] = useState('')
  const [panelOpen, setPanelOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: tenant, error: tenantError } = await supabase.rpc('erp_current_empresa_id')
      if (tenantError) throw tenantError
      if (!tenant) throw new Error('A empresa da sessão autenticada não foi identificada.')
      const companyId = String(tenant)
      setEmpresaId(companyId)
      const [productResult, lotResult] = await Promise.all([
        supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', companyId).eq('ativo', true).order('codigo').limit(2000),
        supabase.from('erp_qualidade_liberacao_lotes').select('id,codigo_lote,produto_id,quantidade,status_sgq,responsavel_liberacao,observacoes,created_at,updated_at,criado_por').eq('empresa_id', companyId).order('created_at', { ascending: false }).limit(500),
      ])
      if (productResult.error) throw productResult.error
      if (lotResult.error) throw lotResult.error
      setProducts((productResult.data ?? []) as Product[])
      setRows((lotResult.data ?? []) as LotRow[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os registros de parecer SGQ.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const productById = useMemo(() => new Map(products.map(product => [product.id, product])), [products])
  const filteredRows = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    if (!term) return rows
    return rows.filter(row => {
      const product = productById.get(row.produto_id)
      return [row.codigo_lote, row.status_sgq, row.responsavel_liberacao, product?.codigo, product?.nome]
        .some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(term))
    })
  }, [rows, query, productById])

  const startNew = () => {
    setSelected(null)
    setForm(blankForm())
    setPanelOpen(true)
    setError('')
    setMessage('')
  }

  const selectRow = (row: LotRow) => {
    setSelected(row)
    setForm({
      codigo: row.codigo_lote,
      produtoId: row.produto_id,
      quantidade: String(row.quantidade),
      status: row.status_sgq,
      responsavel: row.responsavel_liberacao,
      observacoes: row.observacoes ?? '',
    })
    setPanelOpen(true)
    setError('')
    setMessage('')
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (!empresaId) throw new Error('Empresa da sessão não identificada; atualize os dados e tente novamente.')
      const codigo = form.codigo.trim().toUpperCase()
      const responsavel = form.responsavel.trim()
      const amount = Number(form.quantidade)
      if (!codigo || codigo.length > 50) throw new Error('Informe um código de lote válido (até 50 caracteres).')
      if (!form.produtoId) throw new Error('Selecione o produto cadastrado na empresa atual.')
      if (!Number.isSafeInteger(amount) || amount < 1) throw new Error('O volume do lote deve ser um número inteiro maior que zero.')
      if (!responsavel || responsavel.length > 100) throw new Error('Informe o responsável pela decisão (até 100 caracteres).')
      const payload = {
        empresa_id: empresaId,
        codigo_lote: codigo,
        produto_id: form.produtoId,
        quantidade: amount,
        status_sgq: form.status,
        responsavel_liberacao: responsavel,
        observacoes: form.observacoes.trim() || null,
      }
      const result = selected
        ? await supabase.from('erp_qualidade_liberacao_lotes').update(payload).eq('id', selected.id).eq('empresa_id', empresaId).select('id').maybeSingle()
        : await supabase.from('erp_qualidade_liberacao_lotes').insert({ ...payload }).select('id').single()
      if (result.error) throw result.error
      if (!result.data?.id) throw new Error('Nenhuma linha foi confirmada pelo banco. Verifique a permissão RLS antes de repetir.')
      setMessage(selected ? 'Parecer SGQ atualizado no banco. O estoque não foi alterado por esta tela.' : 'Parecer SGQ gravado no banco. O estoque não foi alterado por esta tela.')
      setSelected(null)
      setForm(blankForm())
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao gravar o parecer SGQ do lote.')
    } finally {
      setBusy(false)
    }
  }

  const countByStatus = (status: LotStatus) => rows.filter(row => row.status_sgq === status).length

  return (
    <main className="min-h-screen bg-[#0E1E2F] p-2.5 text-[#F4FBFD] md:p-3">
      <QualitySidebar active="/qualidade/liberacao-lote" />
      <div className="mx-auto max-w-[1680px] space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-3 border border-[#2E4A62] bg-[#0D2638] p-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center border border-[#2D8DB8] bg-[#123B50] text-[#48B7C7]"><ClipboardCheck size={20} /></span>
            <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#48B7C7]">MOLDPLÁS ERP · SGQ</p><h1 className="text-sm font-black uppercase tracking-wide">Registro de parecer SGQ</h1><p className="mt-0.5 text-[10px] text-slate-400">Registro documental por empresa; não altera o status operacional do lote no estoque</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => window.print()} className="inline-flex h-8 items-center gap-1.5 border border-[#2E4A62] px-2.5 text-[10px] font-bold hover:bg-[#123B50]"><Printer size={13} /> Imprimir</button>
            <button type="button" onClick={() => void load()} disabled={loading || busy} className="inline-flex h-8 items-center gap-1.5 border border-[#2E4A62] px-2.5 text-[10px] font-bold hover:bg-[#123B50] disabled:opacity-50"><RefreshCw size={13} /> Atualizar</button>
            <button type="button" onClick={startNew} className="inline-flex h-8 items-center gap-1.5 border border-[#48B7C7] bg-[#2D8DB8] px-2.5 text-[10px] font-black text-white hover:bg-[#24799F]"><Plus size={13} /> Novo parecer</button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {([
            { label: 'Total de registros', value: rows.length, icon: ClipboardCheck, color: 'text-[#48B7C7]' },
            { label: 'Aprovados', value: countByStatus('APROVADO'), icon: ShieldCheck, color: 'text-emerald-400' },
            { label: 'Quarentena / reprovados', value: countByStatus('QUARENTENA') + countByStatus('REPROVADO'), icon: ShieldAlert, color: 'text-amber-300' },
          ]).map(item => { const Icon = item.icon; return <div key={item.label} className="flex items-center gap-2.5 border border-[#2E4A62] bg-[#0D2638] px-3 py-2"><Icon size={18} className={item.color} /><div><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{item.label}</p><p className="text-lg font-black tabular-nums">{item.value}</p></div></div> })}
        </section>

        <div role="note" className="flex items-start gap-2 border border-amber-700 bg-amber-950/50 p-2.5 text-[10px] font-semibold text-amber-100"><AlertTriangle size={14} className="mt-0.5 shrink-0" /><span><strong>Limite funcional:</strong> este formulário grava um parecer na tabela documental <code>erp_qualidade_liberacao_lotes</code>. Ele não executa liberação/bloqueio transacional na tabela de estoque nem substitui a operação autorizada de quarentena.</span></div>
        {error && <div role="alert" className="flex items-start gap-2 border border-red-800 bg-red-950/70 p-2.5 text-[11px] text-red-100"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{error}</div>}
        {message && <div role="status" className="flex items-start gap-2 border border-emerald-800 bg-emerald-950/70 p-2.5 text-[11px] text-emerald-100"><CheckCircle2 size={15} className="mt-0.5 shrink-0" />{message}</div>}

        <div className={`grid grid-cols-1 items-start gap-3 ${panelOpen ? 'xl:grid-cols-[minmax(0,1.25fr)_minmax(350px,.75fr)]' : 'grid-cols-1'}`}>
          <section className="min-w-0 overflow-hidden border border-[#2E4A62] bg-[#0D2638]">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E4A62] bg-[#0E1E2F] p-2">
              <div><h2 className="text-[10px] font-black uppercase tracking-widest text-[#48B7C7]" >Registros de parecer SGQ</h2><p className="mt-0.5 text-[9px] text-slate-400">{filteredRows.length} registro(s) · empresa da sessão</p></div>
              <label className="flex h-8 w-full max-w-[300px] items-center gap-2 border border-[#2E4A62] bg-[#071522] px-2"><Search size={13} className="shrink-0 text-[#48B7C7]" /><input value={query} onChange={event => setQuery(event.target.value)} className="h-full min-w-0 flex-1 bg-transparent text-[10px] outline-none placeholder:text-slate-500" placeholder="Pesquisar lote, produto ou parecer..." aria-label="Pesquisar liberações" /></label>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[10px]">
                <thead><tr className="h-8 border-b border-[#2E4A62] bg-[#123B50] text-[9px] uppercase tracking-wider text-[#BDECF3]"><th className="px-2">Código do lote</th><th className="px-2">Produto / SKU</th><th className="px-2 text-right">Volume</th><th className="px-2 text-center">Parecer SGQ</th></tr></thead>
                <tbody className="divide-y divide-[#2E4A62]/70">
                  {filteredRows.map(row => {
                    const product = productById.get(row.produto_id)
                    const active = selected?.id === row.id
                    return <tr key={row.id} onClick={() => selectRow(row)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectRow(row) } }} tabIndex={0} aria-selected={active} className={`h-9 cursor-pointer outline-none hover:bg-[#123B50] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#48B7C7] ${active ? 'bg-[#123B50] border-l-2 border-l-[#48B7C7]' : ''}`}>
                      <td className="px-2 font-mono font-black text-[#48B7C7]">{row.codigo_lote}</td><td className="max-w-[260px] truncate px-2 text-[#F4FBFD]">{product ? product.codigo + ' · ' + product.nome : row.produto_id}</td><td className="px-2 text-right font-mono tabular-nums">{row.quantidade.toLocaleString('pt-BR')} UN</td><td className="px-2 text-center"><span className={`inline-flex border px-1.5 py-0.5 text-[8px] font-black uppercase ${row.status_sgq === 'APROVADO' ? 'border-emerald-800 bg-emerald-950 text-emerald-300' : row.status_sgq === 'REPROVADO' ? 'border-red-800 bg-red-950 text-red-300' : 'border-amber-800 bg-amber-950 text-amber-300'}`}>{row.status_sgq}</span></td>
                    </tr>
                  })}
                  {!loading && filteredRows.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-[10px] text-slate-400">{query ? 'Nenhum lote corresponde à pesquisa.' : 'Nenhum parecer SGQ cadastrado para a empresa atual.'}</td></tr>}
                  {loading && <tr><td colSpan={4} className="p-6 text-center text-[10px] text-slate-400">Carregando registros do banco…</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          {panelOpen && <section className="min-w-0 border border-[#2E4A62] bg-[#0D2638]">
            <header className="flex items-center justify-between gap-2 border-b border-[#2E4A62] bg-[#0E1E2F] p-2.5"><div><p className="text-[9px] font-black uppercase tracking-widest text-[#48B7C7]">Painel de decisão</p><h2 className="text-xs font-black">{selected ? 'Revisar registro de lote' : 'Novo laudo de liberação'}</h2></div><button type="button" onClick={() => setPanelOpen(false)} aria-label="Fechar painel" className="grid h-7 w-7 place-items-center border border-[#2E4A62] text-slate-300 hover:bg-[#123B50]"><X size={14} /></button></header>
            <form onSubmit={event => void save(event)} className="space-y-3 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="min-w-0"><span className={labelClass}>Código do lote *</span><input required maxLength={50} value={form.codigo} disabled={Boolean(selected)} onChange={event => setForm(current => ({ ...current, codigo: event.target.value }))} placeholder="Ex.: LT-2026-001" className={inputClass} /></label>
                <label className="min-w-0"><span className={labelClass}>Volume físico (un.) *</span><input required type="number" min="1" step="1" value={form.quantidade} onChange={event => setForm(current => ({ ...current, quantidade: event.target.value }))} className={inputClass + ' text-right tabular-nums'} /></label>
                <label className="min-w-0 sm:col-span-2"><span className={labelClass}>Produto / SKU pai *</span><select required value={form.produtoId} onChange={event => setForm(current => ({ ...current, produtoId: event.target.value }))} className={inputClass}><option value="">Selecione um produto ativo…</option>{products.map(product => <option key={product.id} value={product.id}>{product.codigo} — {product.nome}</option>)}</select></label>
                <label className="min-w-0 sm:col-span-2"><span className={labelClass}>Parecer do inspetor *</span><select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value as LotStatus }))} className={inputClass}><option value="QUARENTENA">QUARENTENA TÉCNICA</option><option value="APROVADO">APROVADO (parecer documental)</option><option value="REPROVADO">REPROVADO (parecer documental)</option></select></label>
                <label className="min-w-0 sm:col-span-2"><span className={labelClass}>Responsável pela decisão *</span><input required maxLength={100} value={form.responsavel} onChange={event => setForm(current => ({ ...current, responsavel: event.target.value }))} placeholder="Nome ou registro interno do inspetor" className={inputClass} /></label>
                <label className="min-w-0 sm:col-span-2"><span className={labelClass}>Laudo / observações de rastreabilidade</span><textarea maxLength={4000} value={form.observacoes} onChange={event => setForm(current => ({ ...current, observacoes: event.target.value }))} placeholder="Desvios, certificados, evidências e justificativa da decisão…" className="h-20 w-full resize-y rounded-none border border-[#2E4A62] bg-[#0E1E2F] p-2 text-[11px] font-semibold text-[#F4FBFD] outline-none focus:border-[#48B7C7]" /></label>
              </div>
              {selected && <div className="border border-[#2E4A62] bg-[#071522] p-2 text-[9px] text-slate-400"><span className="font-black uppercase text-[#48B7C7]">Referência do registro</span><p className="mt-1 break-all font-mono">{selected.id}</p><p className="mt-1">Criado em {new Date(selected.created_at).toLocaleString('pt-BR')} · Atualizado em {new Date(selected.updated_at).toLocaleString('pt-BR')}</p></div>}
              <div className="flex flex-wrap justify-end gap-1.5 border-t border-[#2E4A62] pt-2"><button type="button" onClick={startNew} className="h-8 border border-[#2E4A62] px-3 text-[10px] font-bold text-slate-300 hover:bg-[#123B50]">LIMPAR</button><button type="submit" disabled={busy || loading || products.length === 0} className="inline-flex h-8 items-center gap-1.5 border border-[#48B7C7] bg-[#2D8DB8] px-3 text-[10px] font-black text-white hover:bg-[#24799F] disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 size={13} />{busy ? 'GRAVANDO…' : 'GRAVAR LAUDO'}</button></div>
              {products.length === 0 && !loading && <p className="text-[10px] text-amber-300">Não há produtos ativos disponíveis nesta empresa. O laudo não pode ser gravado sem um produto válido.</p>}
            </form>
          </section>}
        </div>
        <footer className="flex flex-wrap justify-between gap-2 border-t border-[#2E4A62] pt-2 text-[9px] text-slate-500"><span>CONTROLE SGQ · ISOLAMENTO POR EMPRESA VIA RLS</span><span>O status de gravação é confirmado pela resposta do banco, não por um indicador de Git/Deploy.</span></footer>
      </div>
      <style>{`@media print { body{background:#fff!important} main{background:#fff!important;color:#111!important} button, input, select, textarea, nav{print-color-adjust:exact} }`}</style>
    </main>
  )
}
