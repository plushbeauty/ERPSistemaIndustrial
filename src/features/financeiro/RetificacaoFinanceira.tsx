/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-10
 * @REVISAO: REV-RETIFICACAO-FINANCEIRA-AUDITADA-20261110-01
 * @ESCOPO: retificação de títulos e parcelas financeiros, com trilha imutável, justificativa e anexo.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRightLeft, FileClock, Paperclip, RefreshCw, Search, ShieldCheck, X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'

type Kind = 'PAGAR' | 'RECEBER'
type Installment = { id: string; numero: number; vencimento: string; valor: number; saldo: number; status: string; juros?: number; multa?: number; desconto?: number }
type Title = { id: string; empresa_id: string; tipo: Kind; parceiro_tipo: string; parceiro_id: string; descricao: string; documento: string | null; categoria: string | null; centro_custo: string | null; data_emissao: string; valor_total: number; status: string; conta_bancaria_id: string | null; erp_financeiro_parcelas: Installment[] | null }
type Partner = { id: string; name: string }
type Account = { id: string; codigo: string; nome: string; banco: string; agencia: string | null; conta: string | null }
type Audit = { id: string; tipo_retificacao: string; dados_antes: Record<string, unknown>; dados_depois: Record<string, unknown>; justificativa: string; anexo_path: string | null; usuario_id: string; criado_em: string }
type AuditUser = { id: string; nome: string }
type ClosedPeriod = { id:string; data_inicio:string; data_fim:string; motivo:string; fechado_em:string; fechado_por:string }
type Row = { title: Title; installment: Installment; partner: string }

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0))
const dateBR = (value: string) => value ? new Date(value + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
const localDate = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) }
const input = 'h-10 w-full min-w-0 rounded-md border border-[#D3E3EA] bg-white px-3 text-xs text-[#123B50] outline-none focus:border-[#2D8DB8] focus:ring-2 focus:ring-[#2D8DB8]/15 disabled:bg-[#F3F4F6] disabled:text-slate-500'
const label = 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#547080]'
const card = 'rounded-lg border border-[#D3E3EA] bg-white p-4 shadow-sm'
const btn = 'inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50'

export default function RetificacaoFinanceira() {
  const [company, setCompany] = useState('')
  const [titles, setTitles] = useState<Title[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [selected, setSelected] = useState<Row | null>(null)
  const [audit, setAudit] = useState<Audit[]>([])
  const [auditUsers, setAuditUsers] = useState<AuditUser[]>([])
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('TODOS')
  const [status, setStatus] = useState('TODOS')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [reasonType, setReasonType] = useState('CORRECAO_VALOR')
  const [newValue, setNewValue] = useState('')
  const [newDue, setNewDue] = useState('')
  const [newAccount, setNewAccount] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newCostCenter, setNewCostCenter] = useState('')
  const [interest, setInterest] = useState('0')
  const [fine, setFine] = useState('0')
  const [discount, setDiscount] = useState('0')
  const [justification, setJustification] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [generalAudit, setGeneralAudit] = useState<Audit[]>([])
  const [generalPeriods, setGeneralPeriods] = useState<ClosedPeriod[]>([])
  const [periodStart, setPeriodStart] = useState(localDate().slice(0,7)+'-01')
  const [periodEnd, setPeriodEnd] = useState(localDate())
  const [periodReason, setPeriodReason] = useState('')
  const [closingPeriod, setClosingPeriod] = useState(false)

  const partnerName = useCallback((id: string) => partners.find(p => p.id === id)?.name || 'Parceiro não identificado', [partners])

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const companyResult = await supabase.rpc('erp_current_empresa_id')
      if (companyResult.error) throw companyResult.error
      if (typeof companyResult.data !== 'string' || !companyResult.data) throw new Error('Empresa ativa não identificada na sessão.')
      const tenant = companyResult.data
      setCompany(tenant)
      const [titleRows, suppliers, customers, accountRows] = await Promise.all([
        fetchAllPages<Title>((a,b) => supabase.from('erp_financeiro_titulos')
          .select('id,empresa_id,tipo,parceiro_tipo,parceiro_id,descricao,documento,categoria,centro_custo,data_emissao,valor_total,status,conta_bancaria_id,erp_financeiro_parcelas(id,numero,vencimento,valor,saldo,status,juros,multa,desconto)', { count: 'exact' })
          .eq('empresa_id', tenant).neq('status','CANCELADO').order('criado_em',{ascending:false}).range(a,b)),
        fetchAllPages<{id:string;razao_social:string;nome_fantasia:string|null;codigo:string|null}>((a,b) => supabase.from('erp_fornecedores').select('id,razao_social,nome_fantasia,codigo',{count:'exact'}).eq('empresa_id',tenant).range(a,b)),
        fetchAllPages<{id:string;nome:string;razao_social?:string;codigo?:string}>((a,b) => supabase.from('erp_clientes').select('id,nome,razao_social,codigo',{count:'exact'}).eq('empresa_id',tenant).range(a,b)),
        fetchAllPages<Account>((a,b) => supabase.from('erp_contas_bancarias').select('id,codigo,nome,banco,agencia,conta',{count:'exact'}).eq('empresa_id',tenant).eq('ativo',true).order('nome').range(a,b)),
      ])
      setTitles(titleRows)
      setPartners([
        ...suppliers.map(p => ({id:p.id,name:p.nome_fantasia || p.razao_social || p.codigo || 'Fornecedor'})),
        ...customers.map(p => ({id:p.id,name:p.nome || p.razao_social || p.codigo || 'Cliente'})),
      ])
      setAccounts(accountRows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar os títulos financeiros.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!showHistory || !company) return
    void (async () => {
      const [events, periods] = await Promise.all([
        supabase.from('erp_financeiro_retificacoes').select('id,tipo_retificacao,dados_antes,dados_depois,justificativa,anexo_path,usuario_id,criado_em').eq('empresa_id',company).order('criado_em',{ascending:false}).limit(100),
        supabase.from('erp_financeiro_periodos_fechados').select('id,data_inicio,data_fim,motivo,fechado_em,fechado_por').eq('empresa_id',company).order('data_inicio',{ascending:false}).limit(50),
      ])
      if (events.error) { setError(events.error.message); return }
      if (periods.error) { setError(periods.error.message); return }
      setGeneralAudit((events.data || []) as Audit[])
      setGeneralPeriods((periods.data || []) as ClosedPeriod[])
      const ids = [...new Set((events.data || []).map(e => e.usuario_id))]
      if (ids.length) {
        const users = await supabase.from('erp_usuarios').select('id,nome').in('id',ids)
        if (!users.error) setAuditUsers((users.data || []) as AuditUser[])
      }
    })()
  }, [showHistory,company])

  const allRows = useMemo<Row[]>(() => titles.flatMap(title =>
    (title.erp_financeiro_parcelas || []).filter(p => p.status !== 'CANCELADO').map(installment => ({
      title, installment, partner: partnerName(title.parceiro_id),
    }))
  ), [titles, partnerName])

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    return allRows.filter(row => {
      const p = row.installment
      const t = row.title
      const matchTerm = !term || [t.id, t.documento || '', t.descricao, row.partner, String(p.numero)].join(' ').toLocaleLowerCase('pt-BR').includes(term)
      const matchKind = kind === 'TODOS' || t.tipo === kind
      const matchStatus = status === 'TODOS' || p.status === status
      const matchFrom = !from || p.vencimento >= from
      const matchTo = !to || p.vencimento <= to
      return matchTerm && matchKind && matchStatus && matchFrom && matchTo
    })
  }, [allRows, query, kind, status, from, to])

  const selectRow = async (row: Row) => {
    setSelected(row)
    setReasonType('CORRECAO_VALOR')
    setNewValue(String(Number(row.installment.valor).toFixed(2)))
    setNewDue(row.installment.vencimento)
    setNewAccount(row.title.conta_bancaria_id || '')
    setNewCategory(row.title.categoria || '')
    setNewCostCenter(row.title.centro_custo || '')
    setInterest(String(Number(row.installment.juros || 0).toFixed(2)))
    setFine(String(Number(row.installment.multa || 0).toFixed(2)))
    setDiscount(String(Number(row.installment.desconto || 0).toFixed(2)))
    setJustification(''); setAttachment(null); setError(''); setMessage('')
    const result = await supabase.from('erp_financeiro_retificacoes').select('id,tipo_retificacao,dados_antes,dados_depois,justificativa,anexo_path,usuario_id,criado_em')
      .eq('empresa_id', company).eq('titulo_id', row.title.id).order('criado_em',{ascending:false}).limit(50)
    if (result.error) { setError(result.error.message); setAudit([]); return }
    const events = (result.data || []) as Audit[]
    setAudit(events)
    const ids = [...new Set(events.map(e => e.usuario_id))]
    if (ids.length) {
      const users = await supabase.from('erp_usuarios').select('id,nome').in('id',ids)
      if (!users.error) setAuditUsers((users.data || []) as AuditUser[])
    } else setAuditUsers([])
  }

  const calculated = Number(newValue || 0) + Number(interest || 0) + Number(fine || 0) - Number(discount || 0)
  const paid = selected ? Number(selected.installment.valor) - Number(selected.installment.saldo) : 0
  const impact = selected ? calculated - Number(selected.installment.valor) : 0
  const canEdit = !!selected && selected.installment.status !== 'LIQUIDADO' && Number(selected.installment.saldo) > 0

  const save = async () => {
    if (!selected || !canEdit) return
    if (justification.trim().length < 20) { setError('A justificativa deve conter pelo menos 20 caracteres.'); return }
    if (reasonType !== 'ESTORNO' && (!Number.isFinite(calculated) || calculated <= 0 || calculated < paid)) {
      setError('O valor final precisa ser positivo e não pode ficar abaixo do total já pago.'); return
    }
    if (attachment && !['application/pdf','image/png','image/jpeg'].includes(attachment.type)) {
      setError('Anexe somente PDF, PNG ou JPG.'); return
    }
    setBusy(true); setError(''); setMessage('')
    let attachmentPath: string | null = null
    try {
      if (attachment) {
        const safeName = attachment.name.replace(/[^a-zA-Z0-9._-]/g,'_')
        attachmentPath = company + '/' + selected.title.id + '/' + crypto.randomUUID() + '-' + safeName
        const upload = await supabase.storage.from('financeiro-retificacoes').upload(attachmentPath, attachment, { upsert:false, contentType:attachment.type })
        if (upload.error) throw upload.error
      }
      const result = await supabase.rpc('erp_financeiro_retificar_parcela', {
        p_empresa_id: company,
        p_titulo_id: selected.title.id,
        p_parcela_id: selected.installment.id,
        p_tipo_retificacao: reasonType,
        p_novo_valor: reasonType === 'ESTORNO' ? null : Number(newValue),
        p_novo_vencimento: newDue || null,
        p_nova_conta_id: newAccount || null,
        p_nova_categoria: newCategory || null,
        p_novo_centro_custo: newCostCenter || null,
        p_juros: Number(interest || 0),
        p_multa: Number(fine || 0),
        p_desconto: Number(discount || 0),
        p_justificativa: justification.trim(),
        p_anexo_path: attachmentPath,
      })
      if (result.error) throw result.error
      setMessage('Retificação registrada com histórico de auditoria.')
      setSelected(null)
      await load()
    } catch (e) {
      if (attachmentPath) await supabase.storage.from('financeiro-retificacoes').remove([attachmentPath])
      setError(e instanceof Error ? e.message : 'Falha ao registrar a retificação.')
    } finally { setBusy(false) }
  }

  const viewAttachment = async (path: string) => {
    const signed = await supabase.storage.from('financeiro-retificacoes').createSignedUrl(path, 300)
    if (signed.error) { setError(signed.error.message); return }
    window.open(signed.data.signedUrl,'_blank','noopener,noreferrer')
  }

  const badge = (value: string) => {
    const styles: Record<string,string> = { ABERTO:'bg-amber-50 text-amber-800 border-amber-200', PARCIAL:'bg-blue-50 text-blue-800 border-blue-200', LIQUIDADO:'bg-emerald-50 text-emerald-800 border-emerald-200', CANCELADO:'bg-slate-100 text-slate-600 border-slate-200' }
    return <span className={'inline-flex rounded-full border px-2 py-1 text-[10px] font-bold '+(styles[value] || styles.ABERTO)}>{value === 'ABERTO' ? 'Em aberto' : value === 'PARCIAL' ? 'Parcialmente pago' : value === 'LIQUIDADO' ? 'Liquidado' : value}</span>
  }

  return <main className="min-h-full bg-[#F4FBFD] p-3 text-[#123B50] sm:p-4">
    <div className="mx-auto max-w-[1500px] space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#123B50] px-5 py-4 text-white shadow-sm">
        <div><div className="text-[10px] font-bold uppercase tracking-[.16em] text-[#48B7C7]">SYSNQRA ERP INDUSTRIAL · FINANCEIRO</div><h1 className="mt-1 text-xl font-extrabold">Retificação Financeira</h1><p className="mt-1 text-xs text-slate-200">Correção de valores, datas, categorias e estornos de títulos financeiros.</p></div>
        <button type="button" onClick={() => setShowHistory(v => !v)} className={btn+' border border-white/25 bg-white/10 text-white'}><FileClock size={15}/> {showHistory ? 'Fechar histórico' : 'Histórico geral'}</button>
      </header>

      <section className={card}>
        <div className="grid grid-cols-1 items-end gap-3 lg:grid-cols-[minmax(260px,2.4fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)_auto]">
          <div><label className={label}>Busca rápida · NF-e, título, pedido ou cliente/fornecedor</label><div className="relative"><Search size={14} className="absolute left-3 top-3 text-slate-400"/><input className={input+' pl-9'} value={query} onChange={e=>setQuery(e.target.value)} placeholder="NF 4589, título ou nome do parceiro"/></div></div>
          <div><label className={label}>Tipo</label><select className={input} value={kind} onChange={e=>setKind(e.target.value)}><option value="TODOS">Todos</option><option value="PAGAR">Contas a pagar</option><option value="RECEBER">Contas a receber</option></select></div>
          <div><label className={label}>Status</label><select className={input} value={status} onChange={e=>setStatus(e.target.value)}><option value="TODOS">Todos</option><option value="ABERTO">Em aberto</option><option value="PARCIAL">Parcialmente pago</option><option value="LIQUIDADO">Liquidado</option></select></div>
          <div><label className={label}>Vencimento de / até</label><div className="flex gap-1"><input type="date" className={input} value={from} onChange={e=>setFrom(e.target.value)}/><input type="date" className={input} value={to} onChange={e=>setTo(e.target.value)}/></div></div>
          <button type="button" onClick={()=>void load()} className={btn+' bg-[#2D8DB8] text-white'}><RefreshCw size={14}/> Buscar</button>
        </div>
      </section>

      {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>}
      {message && <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{message}</div>}

      <section className={card+' p-0'}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D3E3EA] px-4 py-3"><h2 className="text-sm font-bold">Títulos e parcelas elegíveis</h2><span className="text-[10px] text-slate-500">{filtered.length} registro(s)</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[980px] border-collapse text-xs">
          <thead className="bg-[#EAF3F7] text-[10px] uppercase text-[#547080]"><tr className="h-10"><th className="px-3 text-left">ID / Parcela</th><th className="px-3 text-left">Documento / NF</th><th className="px-3 text-left">Cliente / Fornecedor</th><th className="px-3 text-left">Vencimento</th><th className="px-3 text-right">Valor original</th><th className="px-3 text-right">Saldo</th><th className="px-3 text-left">Status</th><th className="px-3 text-right">Ação</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan={8} className="h-16 text-center text-slate-500">Carregando títulos financeiros…</td></tr> : filtered.map(row=><tr key={row.installment.id} className={'h-12 border-t border-[#E8F0F4] '+(selected?.installment.id===row.installment.id?'bg-sky-50':'hover:bg-slate-50')}>
            <td className="px-3 font-semibold">#{row.title.id.slice(0,8).toUpperCase()} · {String(row.installment.numero).padStart(2,'0')}</td><td className="px-3">{row.title.documento || row.title.descricao}</td><td className="px-3">{row.partner}</td><td className="px-3">{dateBR(row.installment.vencimento)}</td><td className="px-3 text-right tabular-nums">{money(row.installment.valor)}</td><td className="px-3 text-right tabular-nums">{money(row.installment.saldo)}</td><td className="px-3">{badge(row.installment.status)}</td><td className="px-3 text-right"><button type="button" onClick={()=>void selectRow(row)} className="h-8 rounded-md border border-[#2D8DB8] px-3 text-[11px] font-bold text-[#17658B] hover:bg-sky-50">Retificar</button></td>
          </tr>)}{!loading && !filtered.length && <tr><td colSpan={8} className="h-16 text-center text-slate-400">Nenhum título corresponde aos filtros. Confira o período e o cadastro financeiro.</td></tr>}</tbody>
        </table></div>
      </section>

      {selected && <section className={card+' space-y-4'}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D3E3EA] pb-3"><div><div className="text-[10px] font-bold uppercase tracking-wide text-[#2D8DB8]">Retificação do título selecionado</div><h2 className="mt-1 text-base font-extrabold">#{selected.title.id.slice(0,8).toUpperCase()} · {selected.partner}</h2><p className="text-[11px] text-slate-500">{selected.title.documento || selected.title.descricao} · Parcela {selected.installment.numero}</p></div><button type="button" onClick={()=>setSelected(null)} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-3 text-xs"><X size={13}/> Fechar</button></div>
        <div><h3 className="mb-2 text-xs font-bold text-slate-700">1. Dados originais · somente leitura</h3><div className="grid grid-cols-1 gap-2 rounded-md bg-[#F3F4F6] p-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><label className={label}>Valor original</label><input disabled className={input} value={money(selected.installment.valor)}/></div><div><label className={label}>Vencimento original</label><input disabled className={input} value={dateBR(selected.installment.vencimento)}/></div><div><label className={label}>Conta bancária</label><input disabled className={input} value={accounts.find(a=>a.id===selected.title.conta_bancaria_id)?.banco || 'Não vinculada'}/></div><div><label className={label}>Centro de custo</label><input disabled className={input} value={selected.title.centro_custo || 'Não informado'}/></div>
        </div></div>
        <div><h3 className="mb-2 text-xs font-bold text-slate-700">2. Novos dados para retificação</h3>
          {!canEdit && <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><AlertTriangle size={14} className="mr-1 inline"/> Esta parcela está liquidada. Não é permitido sobrescrever o pagamento; use o procedimento de estorno bancário ou lançamento complementar.</div>}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><label className={label}>Tipo de retificação *</label><select disabled={!canEdit} className={input} value={reasonType} onChange={e=>setReasonType(e.target.value)}><option value="CORRECAO_VALOR">Correção de valor</option><option value="ALTERACAO_VENCIMENTO">Alteração de vencimento</option><option value="TROCA_CONTA">Troca de conta bancária / caixa</option><option value="RECLASSIFICACAO">Reclassificação</option><option value="ESTORNO">Estorno total</option></select></div>
            <div><label className={label}>Nova data de vencimento *</label><input disabled={!canEdit || reasonType==='ESTORNO'} type="date" className={input} value={newDue} onChange={e=>setNewDue(e.target.value)}/></div>
            <div><label className={label}>Novo valor base (R$) *</label><input disabled={!canEdit || reasonType==='ESTORNO'} type="number" min="0.01" step="0.01" className={input} value={newValue} onChange={e=>setNewValue(e.target.value)}/></div>
            <div className="grid grid-cols-3 gap-2"><div><label className={label}>Juros</label><input disabled={!canEdit || reasonType==='ESTORNO'} type="number" min="0" step="0.01" className={input} value={interest} onChange={e=>setInterest(e.target.value)}/></div><div><label className={label}>Multa</label><input disabled={!canEdit || reasonType==='ESTORNO'} type="number" min="0" step="0.01" className={input} value={fine} onChange={e=>setFine(e.target.value)}/></div><div><label className={label}>Desconto</label><input disabled={!canEdit || reasonType==='ESTORNO'} type="number" min="0" step="0.01" className={input} value={discount} onChange={e=>setDiscount(e.target.value)}/></div></div>
            <div><label className={label}>Nova conta bancária / caixa</label><select disabled={!canEdit || reasonType==='ESTORNO'} className={input} value={newAccount} onChange={e=>setNewAccount(e.target.value)}><option value="">Manter conta atual</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.banco} · {a.nome} ({a.codigo})</option>)}</select></div>
            <div className="grid grid-cols-2 gap-2"><div><label className={label}>Nova categoria financeira</label><input disabled={!canEdit || reasonType==='ESTORNO'} className={input} value={newCategory} onChange={e=>setNewCategory(e.target.value)} placeholder="Categoria"/></div><div><label className={label}>Novo centro de custo</label><input disabled={!canEdit || reasonType==='ESTORNO'} className={input} value={newCostCenter} onChange={e=>setNewCostCenter(e.target.value)} placeholder="Centro de custo"/></div></div>
          </div>
        </div>
        <div><h3 className="mb-2 text-xs font-bold text-slate-700">3. Auditoria e comprovação · obrigatório</h3><label className={label}>Justificativa da retificação * · mínimo 20 caracteres</label><textarea disabled={!canEdit} className="min-h-[90px] w-full rounded-md border border-[#D3E3EA] bg-white p-3 text-xs text-[#123B50] outline-none focus:border-[#2D8DB8] focus:ring-2 focus:ring-[#2D8DB8]/15" value={justification} onChange={e=>setJustification(e.target.value)} placeholder="Descreva o motivo detalhado, a origem da divergência e a autorização da alteração."/><label className={label+' mt-3'}>Anexar comprovante · PDF, PNG ou JPG</label><input disabled={!canEdit} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={e=>setAttachment(e.target.files?.[0] || null)} className="block w-full rounded-md border border-dashed border-[#B9D0DC] bg-[#F8FBFC] p-3 text-xs"/>{attachment && <p className="mt-1 text-[10px] text-slate-500"><Paperclip size={12} className="mr-1 inline"/>{attachment.name}</p>}</div>
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950"><div className="flex items-center gap-2 font-bold"><AlertTriangle size={15}/> 4. Resumo do impacto financeiro</div>{reasonType==='ESTORNO' ? <p className="mt-1">O título será cancelado somente se nenhuma parcela tiver pagamento registrado. Nenhuma baixa bancária será apagada.</p> : <p className="mt-1">Diferença prevista nesta parcela: <strong>{money(impact)}</strong>. Novo saldo previsto: <strong>{money(Math.max(0,calculated-paid))}</strong>. A retificação não cria baixa bancária nem movimenta caixa automaticamente; a diferença será refletida no saldo da parcela e nas próximas consultas financeiras.</p>}</div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[#D3E3EA] pt-3"><button type="button" onClick={()=>setSelected(null)} className={btn+' border border-[#D3E3EA] bg-white text-[#123B50]'}>Cancelar</button><button type="button" disabled={!canEdit || busy} onClick={()=>void save()} className={btn+' bg-[#2D8DB8] text-white'}><ShieldCheck size={14}/>{busy?'Gravando…':'Confirmar retificação'}</button></div>
        <div><h3 className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-700"><FileClock size={14}/> 5. Histórico de auditoria do título</h3>{audit.length ? <div className="space-y-2">{audit.map(event=><article key={event.id} className="rounded-md border border-[#D3E3EA] bg-[#FAFCFD] p-3 text-xs"><div className="flex flex-wrap justify-between gap-2"><strong>{new Date(event.criado_em).toLocaleString('pt-BR')} · {auditUsers.find(u=>u.id===event.usuario_id)?.nome || 'Usuário '+event.usuario_id.slice(0,8)}</strong><span className="text-[10px] font-bold text-[#2D8DB8]">{event.tipo_retificacao}</span></div><p className="mt-1 text-slate-600">Antes: {JSON.stringify(event.dados_antes)} </p><p className="mt-1 text-slate-600">Depois: {JSON.stringify(event.dados_depois)}</p><p className="mt-1"><strong>Motivo:</strong> {event.justificativa}</p>{event.anexo_path && <button type="button" onClick={()=>void viewAttachment(event.anexo_path!)} className="mt-2 text-[#17658B] underline">Ver anexo</button>}</article>)}</div> : <p className="rounded-md bg-slate-50 p-3 text-xs text-slate-500">Ainda não há retificações registradas para este título.</p>}</div>
      </section>}

      {showHistory && <section className={card}>
        <h2 className="mb-3 text-sm font-bold">Histórico geral de retificações</h2>
        <p className="mb-3 text-[11px] text-slate-500">Últimas 100 operações da empresa, com valores anteriores, novos dados, justificativa e comprovante.</p>
        {generalAudit.length ? <div className="space-y-2">{generalAudit.map(event=><article key={event.id} className="rounded-md border border-[#D3E3EA] bg-[#FAFCFD] p-3 text-xs">
          <div className="flex flex-wrap justify-between gap-2"><strong>{new Date(event.criado_em).toLocaleString("pt-BR")} · {auditUsers.find(u=>u.id===event.usuario_id)?.nome || "Usuário "+event.usuario_id.slice(0,8)}</strong><span className="font-bold text-[#2D8DB8]">{event.tipo_retificacao}</span></div>
          <p className="mt-1 text-slate-600">Antes: {JSON.stringify(event.dados_antes)}</p><p className="mt-1 text-slate-600">Depois: {JSON.stringify(event.dados_depois)}</p><p className="mt-1"><strong>Justificativa:</strong> {event.justificativa}</p>
          {event.anexo_path && <button type="button" onClick={()=>void viewAttachment(event.anexo_path!)} className="mt-1 text-[#17658B] underline">Ver anexo</button>}</article>)}</div> : <p className="rounded-md bg-slate-50 p-3 text-xs text-slate-500">Nenhuma retificação registrada.</p>}
        <div className="mt-4 border-t border-[#D3E3EA] pt-3"><h3 className="text-xs font-bold">Períodos fechados</h3>{generalPeriods.length ? generalPeriods.map(p=><div key={p.id} className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-xs">{dateBR(p.data_inicio)} a {dateBR(p.data_fim)} · {p.motivo}</div>) : <p className="mt-2 text-xs text-slate-500">Nenhum período fechado registrado.</p>}</div>
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-[160px_160px_1fr_auto]"><div><label className={label}>Início do bloqueio</label><input type="date" className={input} value={periodStart} onChange={e=>setPeriodStart(e.target.value)}/></div><div><label className={label}>Fim do bloqueio</label><input type="date" className={input} value={periodEnd} onChange={e=>setPeriodEnd(e.target.value)}/></div><div><label className={label}>Motivo do fechamento</label><input className={input} value={periodReason} onChange={e=>setPeriodReason(e.target.value)} placeholder="Motivo com pelo menos 10 caracteres"/></div><button type="button" disabled={closingPeriod} onClick={async()=>{if(periodReason.trim().length<10){setError("Informe o motivo do fechamento com pelo menos 10 caracteres.");return}setClosingPeriod(true);const result=await supabase.rpc("erp_financeiro_fechar_periodo",{p_empresa_id:company,p_data_inicio:periodStart,p_data_fim:periodEnd,p_motivo:periodReason.trim()});if(result.error)setError(result.error.message);else{setPeriodReason("");setMessage("Período fechado; novas retificações nessas datas serão bloqueadas.");const p=await supabase.from("erp_financeiro_periodos_fechados").select("id,data_inicio,data_fim,motivo,fechado_em,fechado_por").eq("empresa_id",company).order("data_inicio",{ascending:false}).limit(50);if(!p.error)setGeneralPeriods((p.data||[]) as ClosedPeriod[])}setClosingPeriod(false)}} className={btn+" self-end bg-[#123B50] text-white"}>{closingPeriod?"Fechando…":"Fechar período"}</button></div>
      </section>}
      <footer className="flex items-center gap-2 text-[10px] text-slate-500"><ArrowRightLeft size={12}/> Alterações financeiras protegidas por autenticação, empresa ativa, validação de período e trilha de auditoria.</footer>
    </div>
  </main>
}
