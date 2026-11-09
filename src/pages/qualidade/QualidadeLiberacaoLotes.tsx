/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-05
 * @REVISAO: REV-SGQ-REL001-20261108-01 — decisão operacional de lote por RPC, FK e trilha SGQ transacional
 * @STATUS_APROVACAO: INCREMENTO FUNCIONAL AUTORIZADO NA ORDEM DE EXECUÇÃO DE 2026-11-08; folha A4 e padrão visual preservados
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardCheck, Printer, RefreshCw, Search, ShieldAlert, ShieldCheck, X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { abrirRelatorio } from '../../lib/report/abrirRelatorio'
import type { Bloco } from '../../lib/report/documento'

type Product = { id: string; codigo: string; nome: string }
type LotStatus = 'APROVADO' | 'REPROVADO' | 'QUARENTENA'
type OperationalLot = {
  id: string
  lote_interno: string
  lote_fornecedor: string | null
  produto_id: string
  quantidade_recebida: number
  quantidade_disponivel: number
  quantidade_reservada: number
  localizacao: string | null
  status_inspecao: string | null
  data_entrada: string
  created_at: string
}
type LotRow = {
  id: string
  lote_operacional_id: string | null
  codigo_lote: string
  produto_id: string
  quantidade: number
  status_sgq: LotStatus
  responsavel_liberacao: string
  observacoes: string | null
  localizacao_anterior: string | null
  created_at: string
  updated_at: string
  criado_por: string
}
const inputClass = 'h-8 w-full min-w-0 rounded-none border border-slate-300 bg-[#EAF6FA] px-2 text-[11px] font-bold text-[#123B50] outline-none focus:border-[#2D8DB8] disabled:cursor-not-allowed disabled:opacity-60'
const labelClass = 'mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500'

function dataHoraRelatorio(valor: string | null | undefined): string {
  if (!valor) return '—'
  const data = new Date(valor)
  if (!Number.isFinite(data.getTime())) return valor
  return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function quantidadeRelatorio(valor: number | string | null | undefined): string {
  const n = Number(valor ?? 0)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
}

export default function QualidadeLiberacaoLotes() {
  const [empresaId, setEmpresaId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [operationalLots, setOperationalLots] = useState<OperationalLot[]>([])
  const [rows, setRows] = useState<LotRow[]>([])
  const [selectedLotId, setSelectedLotId] = useState('')
  const [selected, setSelected] = useState<LotRow | null>(null)
  const [query, setQuery] = useState('')
  const [panelOpen, setPanelOpen] = useState(true)
  const [observacoes, setObservacoes] = useState('')
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
      const [productResult, lotResult, decisionResult] = await Promise.all([
        supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', companyId).eq('ativo', true).order('codigo').limit(2000),
        supabase.from('erp_estoque_lotes')
          .select('id,lote_interno,lote_fornecedor,produto_id,quantidade_recebida,quantidade_disponivel,quantidade_reservada,localizacao,status_inspecao,data_entrada,created_at')
          .eq('empresa_id', companyId).order('created_at', { ascending: false }).limit(1000),
        supabase.from('erp_qualidade_liberacao_lotes')
          .select('id,lote_operacional_id,codigo_lote,produto_id,quantidade,status_sgq,responsavel_liberacao,observacoes,localizacao_anterior,created_at,updated_at,criado_por')
          .eq('empresa_id', companyId).order('created_at', { ascending: false }).limit(1000),
      ])
      if (productResult.error) throw productResult.error
      if (lotResult.error) throw lotResult.error
      if (decisionResult.error) {
        throw new Error(`A migration SGQ-REL-001 ainda precisa ser aplicada para habilitar a liberação transacional: ${decisionResult.error.message}`)
      }
      setProducts((productResult.data ?? []) as Product[])
      setOperationalLots((lotResult.data ?? []) as OperationalLot[])
      setRows((decisionResult.data ?? []) as LotRow[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os lotes operacionais da empresa.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const productById = useMemo(() => new Map(products.map(product => [product.id, product])), [products])
  const decisionByLot = useMemo(() => new Map(
    rows.filter(row => row.lote_operacional_id).map(row => [row.lote_operacional_id as string, row]),
  ), [rows])
  const filteredLots = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    if (!term) return operationalLots
    return operationalLots.filter(lot => {
      const product = productById.get(lot.produto_id)
      const decision = decisionByLot.get(lot.id)
      return [
        lot.lote_interno, lot.lote_fornecedor, lot.status_inspecao, lot.localizacao,
        product?.codigo, product?.nome, decision?.status_sgq,
      ].some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(term))
    })
  }, [operationalLots, query, productById, decisionByLot])
  const selectedLot = operationalLots.find(lot => lot.id === selectedLotId) ?? null

  const startNew = () => {
    setSelected(null)
    setSelectedLotId('')
    setObservacoes('')
    setPanelOpen(true)
    setError('')
    setMessage('')
  }

  const selectLot = (lot: OperationalLot) => {
    setSelected(null)
    setSelectedLotId(lot.id)
    setObservacoes(decisionByLot.get(lot.id)?.observacoes ?? '')
    setPanelOpen(true)
    setError('')
    setMessage('')
  }

  const selectRow = (row: LotRow) => {
    setSelected(row)
    setSelectedLotId(row.lote_operacional_id ?? '')
    setObservacoes(row.observacoes ?? '')
    setPanelOpen(true)
    setError('')
    setMessage('')
  }

  const decidir = async (status: 'APROVADO' | 'REPROVADO') => {
    if (!empresaId) {
      setError('Empresa da sessão não identificada; atualize os dados.')
      return
    }
    if (!selectedLot) {
      setError('Selecione um lote operacional real antes de decidir.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const rpc = status === 'APROVADO' ? 'erp_liberar_lote' : 'erp_bloquear_lote'
      const result = await supabase.rpc(rpc, {
        p_lote_operacional_id: selectedLot.id,
        p_observacoes: observacoes.trim() || null,
      })
      if (result.error) throw result.error
      const payload = result.data as unknown as {
        registro?: LotRow
        lote?: { status_inspecao?: string | null; localizacao?: string | null }
      } | null
      const decision = payload?.registro
      const operational = payload?.lote
      if (!decision?.id || !operational) {
        throw new Error('A RPC não retornou o parecer e o estado operacional do lote; nenhuma decisão foi confirmada na tela.')
      }
      setMessage(
        `Lote ${decision.codigo_lote}: ${decision.status_sgq}. Status operacional confirmado pelo banco: ${operational.status_inspecao ?? '—'}. Localização: ${operational.localizacao ?? '—'}. Responsável registrado: ${decision.responsavel_liberacao}.`,
      )
      setSelected(decision)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na decisão transacional do lote.')
    } finally {
      setBusy(false)
    }
  }

  const countByStatus = (status: LotStatus) => rows.filter(row => row.status_sgq === status).length

  async function emitirRelatorioParecer() {
    setError('')
    try {
      const linhasRegistro = rows.map(row => {
        const product = productById.get(row.produto_id)
        return [
          row.codigo_lote,
          product ? `${product.codigo} · ${product.nome}` : row.produto_id,
          `${quantidadeRelatorio(row.quantidade)} UN`,
          row.status_sgq,
          row.responsavel_liberacao,
          dataHoraRelatorio(row.created_at),
        ]
      })
      const tabelaRegistro: Bloco = {
        tipo: 'tabela',
        titulo: 'Decisões transacionais de lote registradas no banco',
        colunas: [
          { titulo: 'Código do lote', larguraMm: 26 },
          { titulo: 'Produto / SKU', larguraMm: 36 },
          { titulo: 'Volume', larguraMm: 16, alinhar: 'direita' },
          { titulo: 'Decisão', larguraMm: 20, alinhar: 'centro' },
          { titulo: 'Responsável', larguraMm: 26 },
          { titulo: 'Registrado em', larguraMm: 28 },
        ],
        linhas: linhasRegistro,
      }

      if (selected) {
        const product = productById.get(selected.produto_id)
        await abrirRelatorio({
          modulo: 'Qualidade',
          tipo: 'Liberação transacional de lote',
          titulo: `Decisão SGQ do lote ${selected.codigo_lote}`,
          codigo: selected.codigo_lote,
          subtitulo: product ? `${product.codigo} — ${product.nome}` : selected.produto_id,
          blocos: [
            {
              tipo: 'campos',
              titulo: 'Identificação e estado operacional',
              colunas: 2,
              itens: [
                { rotulo: 'Lote operacional (FK)', valor: selected.lote_operacional_id ?? 'Registro histórico sem vínculo' },
                { rotulo: 'Código do lote', valor: selected.codigo_lote },
                { rotulo: 'Produto / SKU', valor: product ? `${product.codigo} · ${product.nome}` : selected.produto_id },
                { rotulo: 'Quantidade recebida', valor: `${quantidadeRelatorio(selected.quantidade)} UN` },
                { rotulo: 'Decisão SGQ', valor: selected.status_sgq },
                { rotulo: 'Responsável (ID ERP)', valor: selected.responsavel_liberacao },
                { rotulo: 'Localização anterior', valor: selected.localizacao_anterior ?? 'Não registrada' },
                { rotulo: 'Criado em', valor: dataHoraRelatorio(selected.created_at) },
                { rotulo: 'Atualizado em', valor: dataHoraRelatorio(selected.updated_at) },
              ],
            },
            ...(selected.observacoes ? [{ tipo: 'texto' as const, titulo: 'Observações da decisão', texto: selected.observacoes }] : []),
            tabelaRegistro,
            {
              tipo: 'assinaturas',
              titulo: 'Responsabilidade',
              assinantes: [
                { papel: 'Responsável pela decisão', nome: selected.responsavel_liberacao },
                { papel: 'Garantia da Qualidade / SGQ' },
              ],
            },
          ],
          observacoes: 'Decisão transacional gravada por RPC no banco. Lote aprovado que permaneça fisicamente em Quarentena exige movimentação para endereço liberado antes da separação.',
        })
        return
      }

      if (!rows.length) throw new Error('Nenhuma decisão transacional de lote encontrada para emitir o relatório.')
      await abrirRelatorio({
        modulo: 'Qualidade',
        tipo: 'Registro de decisões de lote',
        titulo: 'Histórico de decisões SGQ por lote',
        codigo: `DECISOES-SGQ-${empresaId}`,
        subtitulo: `${rows.length} registro(s) · empresa da sessão`,
        blocos: [
          {
            tipo: 'campos',
            titulo: 'Resumo das decisões',
            colunas: 2,
            itens: [
              { rotulo: 'Registros', valor: rows.length },
              { rotulo: 'Aprovados', valor: countByStatus('APROVADO') },
              { rotulo: 'Em quarentena', valor: countByStatus('QUARENTENA') },
              { rotulo: 'Reprovados', valor: countByStatus('REPROVADO') },
            ],
          },
          tabelaRegistro,
        ],
        observacoes: 'Relatório gerado a partir dos registros transacionais da empresa autenticada.',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao emitir o relatório A4 de decisões SGQ.')
    }
  }

  return (
    <main className="min-h-screen bg-[#F4FBFD] p-2.5 text-[#123B50] md:p-3">
      <div className="mx-auto max-w-[1680px] space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-3 border border-[#CFE1E7] bg-white p-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center border border-[#2D8DB8] bg-[#123B50] text-[#48B7C7]"><ClipboardCheck size={20} /></span>
            <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#176487]">SYSNQRA ERP · SGQ</p><h1 className="text-sm font-black uppercase tracking-wide text-[#123B50]">Liberação transacional de lotes</h1><p className="mt-0.5 text-[10px] text-slate-500">Decisão vinculada ao lote operacional, com autorização e auditoria no banco.</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => void emitirRelatorioParecer()} className="inline-flex h-8 items-center gap-1.5 border border-[#CFE1E7] px-2.5 text-[10px] font-bold text-[#123B50] hover:bg-[#EAF6FA]"><Printer size={13} /> Imprimir A4</button>
            <button type="button" onClick={() => void load()} disabled={loading || busy} className="inline-flex h-8 items-center gap-1.5 border border-[#CFE1E7] px-2.5 text-[10px] font-bold text-[#123B50] hover:bg-[#EAF6FA] disabled:opacity-50"><RefreshCw size={13} /> Atualizar</button>
            <button type="button" onClick={startNew} className="inline-flex h-8 items-center gap-1.5 border border-[#2D8DB8] bg-[#2D8DB8] px-2.5 text-[10px] font-black text-white hover:bg-[#24799F]">Nova decisão</button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {([
            { label: 'Lotes operacionais', value: operationalLots.length, icon: ClipboardCheck, color: 'text-[#176487]' },
            { label: 'Liberados pela Qualidade', value: operationalLots.filter(lot => lot.status_inspecao === 'APROVADO').length, icon: ShieldCheck, color: 'text-emerald-700' },
            { label: 'Retidos / quarentena', value: operationalLots.filter(lot => ['REPROVADO', 'RETIDO'].includes(String(lot.status_inspecao))).length, icon: ShieldAlert, color: 'text-amber-800' },
          ]).map(item => { const Icon = item.icon; return <div key={item.label} className="flex items-center gap-2.5 border border-[#CFE1E7] bg-white px-3 py-2"><Icon size={18} className={item.color} /><div><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">{item.label}</p><p className="text-lg font-black tabular-nums text-[#123B50]">{item.value}</p></div></div> })}
        </section>

        <div role="note" className="flex items-start gap-2 border border-[#C8E3EE] bg-[#EAF6FA] p-2.5 text-[10px] font-semibold text-[#123B50]">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" />
          <span><strong>Controle transacional:</strong> a tela não grava parecer diretamente. Liberar/bloquear chama RPC do banco, exige <code>nivel_admin ≥ 8</code>, atualiza o lote operacional e grava trilha em <code>erp_sgq_auditoria</code>. A separação passa a rejeitar lotes não aprovados ou ainda em Quarentena.</span>
        </div>
        {error && <div role="alert" className="flex items-start gap-2 border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-700"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{error}</div>}
        {message && <div role="status" className="flex items-start gap-2 border border-emerald-200 bg-emerald-50 p-2.5 text-[11px] text-emerald-700"><CheckCircle2 size={15} className="mt-0.5 shrink-0" />{message}</div>}

        <div className={`grid grid-cols-1 items-start gap-3 ${panelOpen ? 'xl:grid-cols-[minmax(0,1.25fr)_minmax(350px,.75fr)]' : 'grid-cols-1'}`}>
          <section className="min-w-0 overflow-hidden border border-[#CFE1E7] bg-white">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#CFE1E7] bg-[#F8FAFC] p-2">
              <div><h2 className="text-[10px] font-black uppercase tracking-widest text-[#176487]">Lotes operacionais</h2><p className="mt-0.5 text-[9px] text-slate-500">{filteredLots.length} lote(s) · empresa da sessão</p></div>
              <label className="flex h-8 w-full max-w-[300px] items-center gap-2 border border-[#CFE1E7] bg-[#EAF6FA] px-2"><Search size={13} className="shrink-0 text-[#176487]" /><input value={query} onChange={event => setQuery(event.target.value)} className="h-full min-w-0 flex-1 bg-transparent text-[10px] text-[#123B50] outline-none placeholder:text-slate-500" placeholder="Pesquisar lote, produto ou status..." aria-label="Pesquisar lotes operacionais" /></label>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[10px]">
                <thead><tr className="h-8 border-b border-[#CFE1E7] bg-[#123B50] text-[9px] uppercase tracking-wider text-[#BDECF3]"><th className="px-2">Lote interno</th><th className="px-2">Produto / SKU</th><th className="px-2 text-right">Disponível</th><th className="px-2">Inspeção</th><th className="px-2">Localização</th><th className="px-2">Decisão SGQ</th></tr></thead>
                <tbody className="divide-y divide-[#CFE1E7]">
                  {filteredLots.map(lot => {
                    const product = productById.get(lot.produto_id)
                    const decision = decisionByLot.get(lot.id)
                    const active = selectedLotId === lot.id
                    return <tr key={lot.id} onClick={() => selectLot(lot)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectLot(lot) } }} tabIndex={0} aria-selected={active} className={`h-9 cursor-pointer outline-none hover:bg-[#EAF6FA] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#2D8DB8] ${active ? 'bg-[#EAF6FA] border-l-2 border-l-[#2D8DB8]' : ''}`}>
                      <td className="px-2 font-mono font-black text-[#176487]">{lot.lote_interno}</td>
                      <td className="max-w-[220px] truncate px-2 text-[#123B50]">{product ? product.codigo + ' · ' + product.nome : lot.produto_id}</td>
                      <td className="px-2 text-right font-mono tabular-nums text-[#123B50]">{quantidadeRelatorio(lot.quantidade_disponivel)}</td>
                      <td className="px-2"><span className="text-[9px] font-bold">{lot.status_inspecao ?? 'AGUARDANDO'}</span></td>
                      <td className="px-2">{lot.localizacao ?? '—'}</td>
                      <td className="px-2"><span className={`inline-flex border px-1.5 py-0.5 text-[8px] font-black uppercase ${decision?.status_sgq === 'APROVADO' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : decision?.status_sgq === 'REPROVADO' ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{decision?.status_sgq ?? 'SEM DECISÃO'}</span></td>
                    </tr>
                  })}
                  {!loading && filteredLots.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-[10px] text-slate-500">{query ? 'Nenhum lote corresponde à pesquisa.' : 'Nenhum lote operacional encontrado para esta empresa.'}</td></tr>}
                  {loading && <tr><td colSpan={6} className="p-6 text-center text-[10px] text-slate-500">Carregando lotes do banco…</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          {panelOpen && <section className="min-w-0 border border-[#CFE1E7] bg-white">
            <header className="flex items-center justify-between gap-2 border-b border-[#CFE1E7] bg-[#F8FAFC] p-2.5"><div><p className="text-[9px] font-black uppercase tracking-widest text-[#176487]">Painel de decisão</p><h2 className="text-xs font-black text-[#123B50]">Liberar ou bloquear lote</h2></div><button type="button" onClick={() => setPanelOpen(false)} aria-label="Fechar painel" className="grid h-7 w-7 place-items-center border border-[#CFE1E7] text-[#123B50] hover:bg-[#EAF6FA]"><X size={14} /></button></header>
            <div className="space-y-3 p-3">
              <label className="block"><span className={labelClass}>Lote operacional *</span><select required value={selectedLotId} onChange={event => { setSelected(null); setSelectedLotId(event.target.value); setObservacoes(decisionByLot.get(event.target.value)?.observacoes ?? '') }} className={inputClass}><option value="">Selecione um lote real…</option>{operationalLots.map(lot => { const product = productById.get(lot.produto_id); return <option key={lot.id} value={lot.id}>{lot.lote_interno} · {product?.codigo ?? lot.produto_id} · {lot.status_inspecao ?? 'AGUARDANDO'}</option> })}</select></label>
              {selectedLot ? (
                <div className="grid grid-cols-2 gap-2 border border-[#CFE1E7] bg-[#F8FAFC] p-2 text-[9px]">
                  <div><span className={labelClass}>Produto</span><strong>{productById.get(selectedLot.produto_id)?.codigo ?? selectedLot.produto_id}</strong></div>
                  <div><span className={labelClass}>Lote fornecedor</span><strong>{selectedLot.lote_fornecedor ?? '—'}</strong></div>
                  <div><span className={labelClass}>Quantidade recebida</span><strong>{quantidadeRelatorio(selectedLot.quantidade_recebida)}</strong></div>
                  <div><span className={labelClass}>Disponível / reservada</span><strong>{quantidadeRelatorio(selectedLot.quantidade_disponivel)} / {quantidadeRelatorio(selectedLot.quantidade_reservada)}</strong></div>
                  <div><span className={labelClass}>Status de inspeção</span><strong>{selectedLot.status_inspecao ?? 'AGUARDANDO'}</strong></div>
                  <div><span className={labelClass}>Localização física</span><strong>{selectedLot.localizacao ?? '—'}</strong></div>
                </div>
              ) : <p className="border border-dashed border-[#CFE1E7] p-4 text-center text-[10px] text-slate-500">Selecione um lote na tabela ou na lista para habilitar a decisão.</p>}
              <label className="block"><span className={labelClass}>Justificativa / observações da decisão</span><textarea maxLength={4000} value={observacoes} onChange={event => setObservacoes(event.target.value)} placeholder="Registre inspeção, evidência, causa da retenção ou autorização de liberação…" className="h-24 w-full resize-y rounded-none border border-slate-300 bg-[#EAF6FA] p-2 text-[11px] font-semibold text-[#123B50] outline-none focus:border-[#2D8DB8]" /></label>
              <div className="border border-amber-200 bg-amber-50 p-2 text-[9px] leading-4 text-amber-900">A RPC valida a identidade ativa da empresa e exige <strong>nivel_admin ≥ 8</strong>. Se o lote estiver em Quarentena sem localização anterior conhecida, a aprovação de qualidade não o retira fisicamente da área; uma movimentação de estoque continuará necessária.</div>
              <div className="flex flex-wrap justify-end gap-1.5 border-t border-[#CFE1E7] pt-2">
                <button type="button" onClick={() => void decidir('REPROVADO')} disabled={busy || loading || !selectedLot} className="inline-flex h-8 items-center gap-1.5 border border-rose-300 bg-rose-50 px-3 text-[10px] font-black text-rose-800 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"><ShieldAlert size={13} />{busy ? 'PROCESSANDO…' : 'BLOQUEAR / QUARENTENA'}</button>
                <button type="button" onClick={() => void decidir('APROVADO')} disabled={busy || loading || !selectedLot} className="inline-flex h-8 items-center gap-1.5 border border-emerald-600 bg-emerald-600 px-3 text-[10px] font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"><ShieldCheck size={13} />{busy ? 'PROCESSANDO…' : 'LIBERAR LOTE'}</button>
              </div>
            </div>
          </section>}
        </div>

        <section className="min-w-0 overflow-hidden border border-[#CFE1E7] bg-white">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#CFE1E7] bg-[#F8FAFC] p-2">
            <div><h2 className="text-[10px] font-black uppercase tracking-widest text-[#176487]">Histórico de decisões SGQ</h2><p className="mt-0.5 text-[9px] text-slate-500">{rows.length} decisão(ões) gravada(s) · fonte: banco da empresa</p></div>
            <div className="flex gap-2 text-[9px] font-bold text-slate-600"><span>Aprovados: {countByStatus('APROVADO')}</span><span>Quarentena: {countByStatus('QUARENTENA')}</span><span>Reprovados: {countByStatus('REPROVADO')}</span></div>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[10px]">
              <thead><tr className="h-8 border-b border-[#CFE1E7] bg-[#123B50] text-[9px] uppercase tracking-wider text-[#BDECF3]"><th className="px-2">Lote</th><th className="px-2">Vínculo operacional</th><th className="px-2">Decisão</th><th className="px-2">Responsável ERP</th><th className="px-2">Data</th><th className="px-2">Ação</th></tr></thead>
              <tbody className="divide-y divide-[#CFE1E7]">
                {rows.map(row => <tr key={row.id} className="h-9 hover:bg-[#F4FBFD]">
                  <td className="px-2 font-mono font-bold">{row.codigo_lote}</td>
                  <td className="px-2 font-mono text-[9px]">{row.lote_operacional_id ?? 'HISTÓRICO SEM FK'}</td>
                  <td className="px-2">{row.status_sgq}</td>
                  <td className="px-2">{row.responsavel_liberacao}</td>
                  <td className="px-2">{dataHoraRelatorio(row.updated_at)}</td>
                  <td className="px-2"><button type="button" onClick={() => selectRow(row)} className="h-7 border border-[#CFE1E7] px-2 text-[9px] font-bold hover:bg-[#EAF6FA]">Ver / imprimir</button></td>
                </tr>)}
                {!loading && rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-[10px] text-slate-500">Nenhuma decisão transacional registrada para esta empresa.</td></tr>}
                {loading && <tr><td colSpan={6} className="p-6 text-center text-[10px] text-slate-500">Carregando histórico…</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <footer className="flex flex-wrap justify-between gap-2 border-t border-[#CFE1E7] pt-2 text-[9px] text-slate-500"><span>SGQ-REL-001 · ISOLAMENTO POR EMPRESA · AUDITORIA TRANSACIONAL</span><span>Sem SQL remoto nesta execução; a tela depende da migration SGQ-REL-001 aplicada pelo proprietário.</span></footer>
      </div>
    </main>
  )
}
