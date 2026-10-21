import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, CircleDollarSign, ClipboardCheck, RefreshCw, Search, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Rfq = {
  id: string
  numero: number
  status: string
  data_emissao: string
  prazo_resposta: string | null
  fornecedor_escolhido_id: string | null
  justificativa_escolha: string | null
  status_aprovacao: string
  menor_preco_ofertado: number | null
}
type Quote = {
  id: string
  rfq_id: string
  fornecedor_id: string
  status: string
  valor_total: number | null
  valor_frete: number
  valor_desconto: number
  prazo_entrega_dias: number | null
  condicao_pagamento: string | null
}
type QuoteRow = Quote & { custo: number }
type Supplier = { id: string; razao_social: string; nome_fantasia: string | null }
type RfqItem = { rfq_id: string; codigo: string; descricao: string; quantidade: number; unidade: string }

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dateLabel = (value: string | null) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : 'Não definida'

export default function ComprasAnalisePrecos() {
  const [rfqs, setRfqs] = useState<Rfq[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [items, setItems] = useState<RfqItem[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<string>('')
  const [justificativa, setJustificativa] = useState('')
  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = async () => {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const empresaId = String(company.data)
      const [r, q, s, i] = await Promise.all([
        fetchAllPages<Rfq>((from, to) => supabase.from('erp_rfq').select('id,numero,status,data_emissao,prazo_resposta,fornecedor_escolhido_id,justificativa_escolha,status_aprovacao,menor_preco_ofertado', { count: 'exact' }).eq('empresa_id', empresaId).order('created_at', { ascending: false }).range(from, to)),
        fetchAllPages<Quote>((from, to) => supabase.from('erp_rfq_fornecedores').select('id,rfq_id,fornecedor_id,status,valor_total,valor_frete,valor_desconto,prazo_entrega_dias,condicao_pagamento', { count: 'exact' }).eq('empresa_id', empresaId).range(from, to)),
        fetchAllPages<Supplier>((from, to) => supabase.from('erp_fornecedores').select('id,razao_social,nome_fantasia', { count: 'exact' }).eq('empresa_id', empresaId).eq('ativo', true).order('razao_social').range(from, to)),
        fetchAllPages<RfqItem>((from, to) => supabase.from('erp_rfq_itens').select('rfq_id,codigo,descricao,quantidade,unidade', { count: 'exact' }).eq('empresa_id', empresaId).range(from, to)),
      ])
      setRfqs(r)
      setQuotes(q)
      setSuppliers(s)
      setItems(i)
      setSelected(current => current && r.some(row => row.id === current) ? current : (r[0]?.id ?? null))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar análise de preços.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  const supplierMap = useMemo(() => new Map(suppliers.map(s => [s.id, s.nome_fantasia || s.razao_social])), [suppliers])
  const selectedRfq = rfqs.find(r => r.id === selected)
  const rfqItems = useMemo(() => items.filter(item => item.rfq_id === selected), [items, selected])
  const rows = useMemo<QuoteRow[]>(() => quotes
    .filter(q => q.rfq_id === selected)
    .map(q => ({ ...q, custo: Math.max(0, Number(q.valor_total || 0) + Number(q.valor_frete || 0) - Number(q.valor_desconto || 0)) }))
    .sort((a, b) => a.custo - b.custo), [quotes, selected])
  const winner = rows[0]
  const filteredRfqs = useMemo(() => {
    const term = filter.trim().toLocaleLowerCase('pt-BR')
    if (!term) return rfqs
    return rfqs.filter(r => {
      const itemText = items.filter(i => i.rfq_id === r.id).map(i => `${i.codigo} ${i.descricao}`).join(' ')
      return [String(r.numero), r.status, r.data_emissao, itemText].some(value => value.toLocaleLowerCase('pt-BR').includes(term))
    })
  }, [filter, rfqs, items])
  const chosenRow = rows.find(row => row.fornecedor_id === selectedSupplier)
  const needsJustification = Boolean(chosenRow && winner && chosenRow.fornecedor_id !== winner.fornecedor_id && chosenRow.custo > winner.custo)

  useEffect(() => {
    if (!selectedRfq) {
      setSelectedSupplier('')
      setJustificativa('')
      return
    }
    setSelectedSupplier(selectedRfq.fornecedor_escolhido_id || rows[0]?.fornecedor_id || '')
    setJustificativa(selectedRfq.justificativa_escolha || '')
  }, [selectedRfq?.id, selectedRfq?.fornecedor_escolhido_id, selectedRfq?.justificativa_escolha, rows.length])

  const submitForApproval = async () => {
    if (!selectedRfq || !selectedSupplier || !chosenRow || !winner) {
      setError('Selecione uma RFQ com proposta válida e escolha o fornecedor.')
      return
    }
    if (needsJustification && !justificativa.trim()) {
      setError('Justifique a escolha quando o fornecedor selecionado não tiver o menor custo líquido.')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const result = await supabase.from('erp_rfq').update({
        fornecedor_escolhido_id: selectedSupplier,
        menor_preco_ofertado: winner.custo,
        justificativa_escolha: justificativa.trim() || null,
        status_aprovacao: 'PENDENTE_APROVACAO',
        updated_at: new Date().toISOString(),
      }).eq('id', selectedRfq.id).eq('empresa_id', String(company.data)).select('id').maybeSingle()
      if (result.error) throw result.error
      if (!result.data) throw new Error('A RFQ não foi atualizada. Confirme sua permissão e a empresa ativa.')
      setRfqs(current => current.map(r => r.id === selectedRfq.id ? {
        ...r,
        fornecedor_escolhido_id: selectedSupplier,
        menor_preco_ofertado: winner.custo,
        justificativa_escolha: justificativa.trim() || null,
        status_aprovacao: 'PENDENTE_APROVACAO',
      } : r))
      setSuccess('Análise registrada no banco e enviada para aprovação.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível registrar a análise.')
    } finally {
      setSaving(false)
    }
  }

  return <VendasLayout title="Análise de preços" subtitle="Mapa comparativo real de propostas RFQ para decisão de suprimentos" onRefresh={() => void load()}>
    <main className="min-h-screen bg-slate-50 p-3 text-slate-800 antialiased">
      <style>{`
        .compras-analise-card { border: 1px solid #dbe5ef; border-radius: 12px; background: #fff; box-shadow: 0 4px 14px rgba(15, 45, 75, .055), 0 1px 2px rgba(15, 45, 75, .035); }
        .compras-analise-edit { height: 36px; min-width: 0; width: 100%; border: 1px solid #cbd5e1; border-radius: 7px; background: #fff; padding: 0 10px; color: #1e293b; font-size: 12px; outline: none; transition: border-color .15s, box-shadow .15s; }
        .compras-analise-edit:focus { border-color: #287fbd; box-shadow: 0 0 0 2px rgba(40,127,189,.14); }
        .compras-analise-label { display: block; margin-bottom: 5px; color: #526579; font-size: 9px; font-weight: 700; letter-spacing: .075em; text-transform: uppercase; }
        .compras-analise-table th { height: 34px; background: #173f5d; color: #f8fbff; font-size: 9px; font-weight: 700; letter-spacing: .055em; text-transform: uppercase; white-space: nowrap; }
        .compras-analise-table td { height: 38px; border-bottom: 1px solid #e8eef4; font-size: 11px; }
        .compras-analise-table tbody tr:hover { background: #f0f8fd; }
        @media (prefers-reduced-motion: reduce) { .compras-analise-edit { transition: none; } }
      `}</style>

      <header className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[.16em] text-sky-700">Compras / Suprimentos</span>
            <span className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-[9px] font-semibold text-blue-700">MAPA COMPARATIVO</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Análise de preços e propostas</h1>
          <p className="mt-1 text-[11px] text-slate-500">Comparação por custo líquido, prazo comercial e condição de pagamento.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" title="Atualizar dados" aria-label="Atualizar dados" className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50" onClick={() => void load()} disabled={busy}>
            <RefreshCw size={14} className={busy ? 'animate-spin' : ''} /> Atualizar
          </button>
          <Link className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50" to="/compras/rfq"><ArrowLeft size={14} /> RFQ</Link>
        </div>
      </header>

      {error && <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>}
      {success && <div role="status" className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{success}</div>}

      <section className="compras-analise-card mb-3 p-3 sm:p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-700"><Search size={15} /></span>
          <div>
            <h2 className="text-xs font-bold text-slate-800">Localizar mapa de cotação</h2>
            <p className="text-[10px] text-slate-500">Pesquise por número da RFQ, situação ou código/descrição do item.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
          <div className="md:col-span-5">
            <label className="compras-analise-label" htmlFor="rfq-filter">Produto / RFQ vinculada</label>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="rfq-filter" className="compras-analise-edit pl-8" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Código, descrição ou nº da RFQ..." />
            </div>
          </div>
          <div className="md:col-span-5">
            <label className="compras-analise-label" htmlFor="rfq-select">Mapa de cotação</label>
            <select id="rfq-select" className="compras-analise-edit" value={selected ?? ''} onChange={e => setSelected(e.target.value || null)}>
              <option value="">Selecione uma RFQ</option>
              {filteredRfqs.map(r => <option key={r.id} value={r.id}>RFQ-{String(r.numero).padStart(4, '0')} · {r.status} · {r.data_emissao}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="compras-analise-label">Prazo de resposta</label>
            <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-600">{dateLabel(selectedRfq?.prazo_resposta ?? null)}</div>
          </div>
        </div>
      </section>

      {selectedRfq ? <>
        <section className="compras-analise-card mb-3 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-3 sm:px-4">
            <div>
              <h2 className="text-xs font-bold text-slate-900">Mapa comparativo de valores</h2>
              <p className="mt-1 text-[10px] text-slate-500">RFQ-{String(selectedRfq.numero).padStart(4, '0')} · Emitida em {dateLabel(selectedRfq.data_emissao)}</p>
            </div>
            <span className="rounded-md border border-sky-100 bg-sky-50 px-2.5 py-1.5 text-[10px] font-bold text-sky-800">{selectedRfq.status_aprovacao?.replaceAll('_', ' ') || 'EM ANÁLISE'}</span>
          </div>
          <div className="border-b border-slate-100 bg-slate-50/80 px-3 py-2 text-[10px] text-slate-600 sm:px-4">
            <span className="mr-2 font-bold uppercase tracking-wide text-slate-500">Itens:</span>
            {rfqItems.map(i => `${i.codigo} — ${i.descricao} (${i.quantidade} ${i.unidade})`).join(' · ') || 'Nenhum item registrado nesta RFQ.'}
          </div>
          <div className="overflow-x-auto">
            <table className="compras-analise-table w-full min-w-[900px] border-collapse text-left">
              <thead><tr>
                <th className="w-10 px-3 text-center">Escolher</th><th className="px-3">Fornecedor participante</th><th className="px-3 text-right">Valor total</th><th className="px-3 text-right">Frete</th><th className="px-3 text-right">Desconto</th><th className="px-3 text-right">Custo líquido</th><th className="px-3 text-center">Prazo (dias)</th><th className="px-3">Condição de pagamento</th><th className="px-3 text-center">Menor custo</th>
              </tr></thead>
              <tbody>
                {rows.map(row => {
                  const isWinner = row.id === winner?.id
                  const isSelected = selectedSupplier === row.fornecedor_id
                  return <tr key={row.id} className={isSelected ? 'bg-sky-50/80' : 'bg-white'}>
                    <td className="px-3 text-center"><input aria-label={`Selecionar ${supplierMap.get(row.fornecedor_id) || 'fornecedor'}`} type="radio" name="fornecedor-escolhido" checked={isSelected} onChange={() => setSelectedSupplier(row.fornecedor_id)} className="h-4 w-4 accent-sky-700 focus:ring-sky-600" /></td>
                    <td className="px-3 font-semibold text-slate-800">{supplierMap.get(row.fornecedor_id) || 'Fornecedor não localizado'}{isSelected && <span className="ml-2 rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-800">SELECIONADO</span>}</td>
                    <td className="px-3 text-right tabular-nums">{money(Number(row.valor_total || 0))}</td><td className="px-3 text-right tabular-nums">{money(Number(row.valor_frete || 0))}</td><td className="px-3 text-right tabular-nums">{money(Number(row.valor_desconto || 0))}</td>
                    <td className="px-3 text-right font-bold tabular-nums text-slate-900">{money(row.custo)}</td><td className="px-3 text-center">{row.prazo_entrega_dias ?? '—'}</td><td className="px-3">{row.condicao_pagamento || '—'}</td>
                    <td className="px-3 text-center">{isWinner ? <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700"><Check size={12} /> MENOR</span> : <span className="text-slate-300">—</span>}</td>
                  </tr>
                })}
                {!rows.length && <tr><td colSpan={9} className="p-8 text-center text-xs text-slate-500">Nenhuma proposta cadastrada para esta RFQ. A tela não cria fornecedores ou preços fictícios.</td></tr>}
              </tbody>
            </table>
          </div>
          {winner && <div className="grid grid-cols-1 gap-2 border-t border-slate-100 bg-sky-50/50 p-3 sm:grid-cols-3 sm:px-4">
            <div className="flex items-center gap-2"><CircleDollarSign size={17} className="text-sky-700" /><div><div className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Menor custo líquido</div><div className="text-sm font-bold text-slate-900">{money(winner.custo)}</div></div></div>
            <div><div className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Fornecedor menor custo</div><div className="mt-1 text-xs font-semibold text-slate-800">{supplierMap.get(winner.fornecedor_id) || 'Fornecedor não localizado'}</div></div>
            <div><div className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Propostas comparadas</div><div className="mt-1 text-xs font-semibold text-slate-800">{rows.length} fornecedor(es)</div></div>
          </div>}
        </section>

        <section className="compras-analise-card p-3 sm:p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><ClipboardCheck size={16} /></span>
            <div><h2 className="text-xs font-bold text-slate-900">Justificativa técnica / comercial</h2><p className="text-[10px] text-slate-500">A justificativa é obrigatória quando a escolha não for a proposta de menor custo líquido.</p></div>
          </div>
          <label htmlFor="justificativa-escolha" className="compras-analise-label">Justificativa da escolha {needsJustification ? <span className="text-red-600">· Obrigatória</span> : '(quando aplicável)'}</label>
          <textarea id="justificativa-escolha" value={justificativa} onChange={e => setJustificativa(e.target.value)} rows={3} maxLength={4000} className="w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100" placeholder="Registre critérios técnicos, qualidade, prazo de entrega, condição comercial ou outro motivo para a escolha..." />
          {needsJustification && <p className="mt-1.5 text-[10px] font-medium text-amber-700">O fornecedor selecionado tem custo maior que a menor proposta. Registre a justificativa antes de enviar.</p>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <p className="text-[10px] text-slate-500">A decisão será gravada na RFQ da empresa autenticada e encaminhada para aprovação.</p>
            <button type="button" onClick={() => void submitForApproval()} disabled={saving || busy || !rows.length || !selectedSupplier} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-xs font-bold text-white shadow-[0_4px_10px_rgba(29,78,216,.18)] transition hover:bg-blue-800 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />} {saving ? 'Registrando...' : 'Finalizar análise e enviar para aprovação'}
            </button>
          </div>
        </section>
      </> : <section className="compras-analise-card p-10 text-center"><ClipboardCheck size={24} className="mx-auto mb-2 text-slate-400" /><h2 className="text-sm font-semibold text-slate-800">Selecione uma RFQ</h2><p className="mt-1 text-xs text-slate-500">{busy ? 'Carregando mapas de cotação...' : 'Escolha um mapa para comparar propostas reais.'}</p></section>}
    </main>
  </VendasLayout>
}
