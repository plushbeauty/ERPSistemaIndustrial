/**
 * @DATA_REVISAO_APROVACAO 2026-10-26
 * @STATUS_APROVACAO REV-COMPRAS-ANALISE-PREMIUM-001 — substituição integral do layout antigo autorizada.
 * Manter os ícones Lucide e os componentes funcionais; regressão verificada por verify:compras-rfq-premium-lock.
 */
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
  origem_portal?: boolean
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
      const [r, q, portalQuotes, s, i] = await Promise.all([
        fetchAllPages<Rfq>((from, to) => supabase.from('erp_rfq').select('id,numero,status,data_emissao,prazo_resposta,fornecedor_escolhido_id,justificativa_escolha,status_aprovacao,menor_preco_ofertado', { count: 'exact' }).eq('empresa_id', empresaId).order('created_at', { ascending: false }).range(from, to)),
        fetchAllPages<Quote>((from, to) => supabase.from('erp_rfq_fornecedores').select('id,rfq_id,fornecedor_id,status,valor_total,valor_frete,valor_desconto,prazo_entrega_dias,condicao_pagamento', { count: 'exact' }).eq('empresa_id', empresaId).range(from, to)),
        fetchAllPages<{id:string;rfq_id:string;fornecedor_id:string;valor_total:number;prazo_dias:number|null;condicao_pagamento:string|null}>((from,to)=>supabase.from('erp_rfq_respostas').select('id,rfq_id,fornecedor_id,valor_total,prazo_dias,condicao_pagamento',{count:'exact'}).eq('empresa_id',empresaId).eq('status','ENVIADA').range(from,to)),
        fetchAllPages<Supplier>((from, to) => supabase.from('erp_fornecedores').select('id,razao_social,nome_fantasia', { count: 'exact' }).eq('empresa_id', empresaId).eq('ativo', true).order('razao_social').range(from, to)),
        fetchAllPages<RfqItem>((from, to) => supabase.from('erp_rfq_itens').select('rfq_id,codigo,descricao,quantidade,unidade', { count: 'exact' }).eq('empresa_id', empresaId).range(from, to)),
      ])
      setRfqs(r)
      const merged = new Map(q.map(row => [row.rfq_id+':'+row.fornecedor_id,row]))
      for (const response of portalQuotes) {
        const key=response.rfq_id+':'+response.fornecedor_id
        if (!merged.has(key)) merged.set(key,{id:response.id,rfq_id:response.rfq_id,fornecedor_id:response.fornecedor_id,status:'PORTAL_ENVIADA',valor_total:response.valor_total,valor_frete:0,valor_desconto:0,prazo_entrega_dias:response.prazo_dias,condicao_pagamento:response.condicao_pagamento,origem_portal:true})
      }
      setQuotes([...merged.values()])
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

  return (
    <VendasLayout
      title="Análise de Preços"
      subtitle="Mapa comparativo real de propostas RFQ para decisão de suprimentos"
      onRefresh={() => void load()}
      titleActions={
        <Link className="synqra-analysis-action synqra-analysis-action-secondary" to="/compras/rfq">
          <ArrowLeft size={14} /> RFQ
        </Link>
      }
    >
      <main className="synqra-analysis-page">
        <header className="synqra-analysis-heading">
          <div>
            <div className="synqra-analysis-eyebrow">COMPRAS / SUPRIMENTOS</div>
            <h1>Análise de preços e propostas</h1>
            <p>Comparação de custo líquido, prazo comercial e condição de pagamento.</p>
          </div>
          <div className="synqra-analysis-heading-actions">
            <span className="synqra-analysis-status"><ClipboardCheck size={13} /> MAPA COMPARATIVO</span>
            <button type="button" title="Atualizar dados" aria-label="Atualizar dados" className="synqra-analysis-action synqra-analysis-action-secondary" onClick={() => void load()} disabled={busy}>
              <RefreshCw size={14} className={busy ? 'animate-spin' : ''} /> Atualizar
            </button>
          </div>
        </header>

        {error && <div role="alert" className="synqra-analysis-feedback synqra-analysis-feedback-error">{error}</div>}
        {success && <div role="status" className="synqra-analysis-feedback synqra-analysis-feedback-success"><Check size={14} /> {success}</div>}

        <section className="synqra-analysis-panel">
          <div className="synqra-analysis-panel-heading">
            <span className="synqra-analysis-icon"><Search size={14} /></span>
            <div>
              <h2>Localizar mapa de cotação</h2>
              <p>Pesquise por número da RFQ, situação ou código/descrição do item.</p>
            </div>
          </div>
          <div className="synqra-analysis-search-grid">
            <div>
              <label className="synqra-analysis-label" htmlFor="rfq-filter">Produto / RFQ vinculada</label>
              <div className="synqra-analysis-search-input">
                <Search size={14} aria-hidden="true" />
                <input id="rfq-filter" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Código, descrição ou nº da RFQ..." />
              </div>
            </div>
            <div>
              <label className="synqra-analysis-label" htmlFor="rfq-select">Mapa de cotação selecionado</label>
              <select id="rfq-select" className="synqra-analysis-edit" value={selected ?? ''} onChange={e => setSelected(e.target.value || null)}>
                <option value="">Selecione uma RFQ...</option>
                {filteredRfqs.map(r => <option key={r.id} value={r.id}>RFQ-{String(r.numero).padStart(4, '0')} · {r.status} · {dateLabel(r.data_emissao)}</option>)}
              </select>
            </div>
            <div>
              <label className="synqra-analysis-label">Prazo de resposta</label>
              <div className="synqra-analysis-readonly">{dateLabel(selectedRfq?.prazo_resposta ?? null)}</div>
            </div>
          </div>
        </section>

        {selectedRfq ? <>
          <section className="synqra-analysis-panel synqra-analysis-panel-flush">
            <div className="synqra-analysis-section-heading">
              <div>
                <h2><CircleDollarSign size={16} /> Mapa comparativo de valores</h2>
                <p>RFQ-{String(selectedRfq.numero).padStart(4, '0')} · Emitida em {dateLabel(selectedRfq.data_emissao)}</p>
              </div>
              <span className="synqra-analysis-status">{selectedRfq.status_aprovacao?.replaceAll('_', ' ') || 'EM ANÁLISE'}</span>
            </div>
            <div className="synqra-analysis-items">
              <strong>ITENS DA RFQ</strong>
              {rfqItems.map(i => `${i.codigo} — ${i.descricao} (${i.quantidade} ${i.unidade})`).join(' · ') || 'Nenhum item registrado nesta RFQ.'}
            </div>
            <div className="synqra-analysis-table-wrap">
              <table className="synqra-analysis-table">
                <thead><tr>
                  <th className="text-center">Escolher</th>
                  <th>Fornecedor participante</th>
                  <th className="text-right">Valor total</th>
                  <th className="text-right">Frete</th>
                  <th className="text-right">Desconto</th>
                  <th className="text-right">Custo líquido</th>
                  <th className="text-center">Prazo (dias)</th>
                  <th>Condição de pagamento</th>
                  <th className="text-center">Menor custo</th>
                </tr></thead>
                <tbody>
                  {rows.map(row => {
                    const isWinner = row.id === winner?.id
                    const isSelected = selectedSupplier === row.fornecedor_id
                    return <tr key={row.id} className={isSelected ? 'is-selected' : undefined}>
                      <td className="text-center"><input aria-label={`Selecionar ${supplierMap.get(row.fornecedor_id) || 'fornecedor'}`} type="radio" name="fornecedor-escolhido" checked={isSelected} onChange={() => setSelectedSupplier(row.fornecedor_id)} /></td>
                      <td className="synqra-analysis-supplier">{supplierMap.get(row.fornecedor_id) || 'Fornecedor não localizado'}{row.origem_portal&&<span className="synqra-analysis-muted"> · RESPOSTA DO PORTAL</span>}{isSelected && <span className="synqra-analysis-selected-tag">SELECIONADO</span>}</td>
                      <td className="text-right synqra-analysis-number">{money(Number(row.valor_total || 0))}</td>
                      <td className="text-right synqra-analysis-number">{money(Number(row.valor_frete || 0))}</td>
                      <td className="text-right synqra-analysis-number">{money(Number(row.valor_desconto || 0))}</td>
                      <td className="text-right synqra-analysis-number synqra-analysis-cost">{money(row.custo)}</td>
                      <td className="text-center">{row.prazo_entrega_dias ?? '—'}</td>
                      <td>{row.condicao_pagamento || '—'}</td>
                      <td className="text-center">{isWinner ? <span className="synqra-analysis-winner"><Check size={12} /> MENOR</span> : <span className="synqra-analysis-muted">—</span>}</td>
                    </tr>
                  })}
                  {!rows.length && <tr><td colSpan={9} className="synqra-analysis-empty"><ClipboardCheck size={20} />Nenhuma proposta cadastrada para esta RFQ. Nenhum preço fictício será criado.</td></tr>}
                </tbody>
              </table>
            </div>
            {winner && <div className="synqra-analysis-kpis">
              <div className="synqra-analysis-kpi">
                <CircleDollarSign size={18} />
                <div><span>MENOR CUSTO LÍQUIDO</span><strong>{money(winner.custo)}</strong></div>
              </div>
              <div className="synqra-analysis-kpi">
                <div><span>FORNECEDOR DE MENOR CUSTO</span><strong>{supplierMap.get(winner.fornecedor_id) || 'Fornecedor não localizado'}</strong></div>
              </div>
              <div className="synqra-analysis-kpi">
                <div><span>PROPOSTAS COMPARADAS</span><strong>{rows.length} fornecedor(es)</strong></div>
              </div>
            </div>}
          </section>

          <section className="synqra-analysis-panel">
            <div className="synqra-analysis-panel-heading">
              <span className="synqra-analysis-icon"><ClipboardCheck size={15} /></span>
              <div>
                <h2>Justificativa técnica / comercial</h2>
                <p>Obrigatória quando a escolha não for a proposta de menor custo líquido.</p>
              </div>
            </div>
            <label htmlFor="justificativa-escolha" className="synqra-analysis-label">Justificativa da escolha {needsJustification ? <span className="synqra-analysis-required">· OBRIGATÓRIA</span> : '(quando aplicável)'}</label>
            <textarea id="justificativa-escolha" value={justificativa} onChange={e => setJustificativa(e.target.value)} rows={3} maxLength={4000} className="synqra-analysis-textarea" placeholder="Registre critérios técnicos, qualidade, prazo de entrega, condição comercial ou outro motivo para a escolha..." />
            {needsJustification && <p className="synqra-analysis-warning">O fornecedor selecionado tem custo maior que a menor proposta. Registre a justificativa antes de enviar.</p>}
            <div className="synqra-analysis-savebar">
              <p>A decisão será gravada na RFQ da empresa autenticada e encaminhada para aprovação.</p>
              <button type="button" onClick={() => void submitForApproval()} disabled={saving || busy || !rows.length || !selectedSupplier} className="synqra-analysis-action synqra-analysis-action-primary">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                {saving ? 'Registrando...' : 'Finalizar análise e enviar para aprovação'}
              </button>
            </div>
          </section>
        </> : <section className="synqra-analysis-panel synqra-analysis-empty-state">
          <ClipboardCheck size={24} />
          <h2>Selecione uma RFQ</h2>
          <p>{busy ? 'Carregando mapas de cotação...' : 'Escolha um mapa para comparar propostas reais.'}</p>
        </section>}
      </main>
    </VendasLayout>
  )
}
