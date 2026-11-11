/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-10
 * @REVISAO: REV-ESTORNO-DOCUMENTAL-COMPLIANCE-20261110-01 — localização multiorigem, conferência somente leitura, checklist de compliance e grade de auditoria real.
 * @STATUS_APROVACAO: IMPLEMENTAÇÃO AUTORIZADA PELO PROPRIETÁRIO; gravação limitada à RPC auditável existente; não simula lançamentos inversos.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Search, RotateCcw, ShieldAlert, FileText, RefreshCw, Paperclip, LockKeyhole } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'

type DocType = 'TITULO' | 'BAIXA' | 'NOTA_DEBITO' | 'NFE'
type FoundDocument = {
  id: string
  type: DocType
  typeLabel: string
  number: string
  entity: string
  amount: number
  date: string
  account: string
  costCenter: string
  status: string
  sourceTable: string
}
type AuditRow = {
  id: string
  documento_alvo: string
  data_estorno: string
  justificativa: string
  documento_estornado_id: string | null
  criado_em: string
}

const control = 'h-10 w-full rounded-md border border-[#CBD9E0] bg-white px-3 text-[12px] text-[#183B4D] outline-none focus:border-[#2D8DB8] focus:ring-2 focus:ring-[#2D8DB8]/15 disabled:bg-[#F3F6F8] disabled:text-[#617784]'
const label = 'mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[#526C79]'
const card = 'rounded-lg border border-[#D3E3EA] bg-white p-4 shadow-sm sm:p-5'
const brl = (value: number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dateBR = (value: string) => value ? new Date(value + (value.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR') : '—'

export default function AssistenteRetificacao() {
  const navigate = useNavigate()
  const [access, setAccess] = useState<boolean | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [docType, setDocType] = useState<DocType>('TITULO')
  const [docNumber, setDocNumber] = useState('')
  const [competencia, setCompetencia] = useState('')
  const [found, setFound] = useState<FoundDocument | null>(null)
  const [searching, setSearching] = useState(false)
  const [reason, setReason] = useState('')
  const [reversalDate, setReversalDate] = useState(new Date().toISOString().slice(0, 10))
  const [linkedAction, setLinkedAction] = useState('REABRIR')
  const [justification, setJustification] = useState('')
  const [proof, setProof] = useState<File | null>(null)
  const [periodOpen, setPeriodOpen] = useState(false)
  const [inverseAware, setInverseAware] = useState(false)
  const [saving, setSaving] = useState(false)
  const [audit, setAudit] = useState<AuditRow[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [auditPage, setAuditPage] = useState(1)
  const auditPageSize = 20
  const auditPages = Math.max(1, Math.ceil(audit.length / auditPageSize))
  const visibleAudit = audit.slice((auditPage - 1) * auditPageSize, auditPage * auditPageSize)
  const auditToday = audit.filter(item => new Date(item.criado_em).toDateString() === new Date().toDateString()).length
  const auditLinked = audit.filter(item => Boolean(item.documento_estornado_id)).length

  const loadAudit = useCallback(async () => {
    setRefreshing(true)
    setError('')
    try {
      const result = await fetchAllPages<AuditRow>((from, to) => supabase.from('erp_fiscal_estornos')
        .select('id,documento_alvo,data_estorno,justificativa,documento_estornado_id,criado_em', { count: 'exact' })
        .order('criado_em', { ascending: false }).order('id').range(from, to))
      setAudit(result)
      setAuditPage(1)
    } catch (cause) {
      setError(cause instanceof Error ? 'Falha ao carregar auditoria: ' + cause.message : 'Falha ao carregar auditoria.')
    } finally { setRefreshing(false) }
  }, [])

  useEffect(() => {
    let active = true
    const checkAccess = async () => {
      const auth = await supabase.auth.getUser()
      if (auth.error) throw auth.error
      if (!auth.data.user) { navigate('/login', { replace: true }); return }
      const profile = await supabase.from('erp_usuarios')
        .select('perfil,is_master,nivel_admin,empresa_id,setor_id')
        .eq('auth_user_id', auth.data.user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
      if (profile.error) throw profile.error
      const role = String(profile.data?.perfil ?? '').trim().toUpperCase()
      const strictMaster = profile.data?.is_master === true && Number(profile.data?.nivel_admin) >= 100 &&
        role === 'SUPER_ADMIN' && profile.data?.empresa_id === null && profile.data?.setor_id === null
      if (active) setAccess(strictMaster || ['ADMINISTRADOR', 'CONTROLADORIA', 'FINANCEIRO'].includes(role))
    }
    void checkAccess().catch(reason => {
      if (active) { setAccess(false); setError(reason instanceof Error ? reason.message : 'Falha ao validar acesso.') }
    })
    return () => { active = false }
  }, [navigate])

  useEffect(() => { if (access === true) void loadAudit() }, [access, loadAudit])

  const searchDocument = async () => {
    setError(''); setMessage(''); setFound(null)
    if (!docNumber.trim()) { setError('Informe o número ou identificador exato do documento.'); return }
    setSearching(true)
    try {
      let row: FoundDocument | null = null
      if (docType === 'TITULO') {
        const q = await supabase.from('erp_financeiro_titulos')
          .select('id,tipo,parceiro_tipo,parceiro_id,descricao,documento,categoria,centro_custo,data_emissao,valor_total,status,conta_bancaria_id')
          .eq('documento', docNumber.trim()).order('criado_em', { ascending: false }).limit(1).maybeSingle()
        if (q.error) throw q.error
        if (q.data) row = { id:q.data.id, type:docType, typeLabel:'Título financeiro', number:q.data.documento || q.data.id,
          entity:[q.data.parceiro_tipo, q.data.parceiro_id].filter(Boolean).join(' · ') || 'Não informado',
          amount:Number(q.data.valor_total || 0), date:q.data.data_emissao || '', account:q.data.conta_bancaria_id || 'Não vinculada',
          costCenter:q.data.centro_custo || 'Não informado', status:q.data.status || '—', sourceTable:'erp_financeiro_titulos' }
      } else if (docType === 'BAIXA') {
        const q = await supabase.from('erp_financeiro_baixas')
          .select('id,titulo_id,parcela_id,valor,ocorrido_em,forma_pagamento,referencia')
          .eq('referencia', docNumber.trim()).order('ocorrido_em', { ascending: false }).limit(1).maybeSingle()
        if (q.error) throw q.error
        if (q.data) row = { id:q.data.id, type:docType, typeLabel:'Baixa bancária', number:q.data.referencia || q.data.id,
          entity:'Título vinculado: ' + (q.data.titulo_id || '—'), amount:Number(q.data.valor || 0), date:q.data.ocorrido_em || '',
          account:q.data.forma_pagamento || 'Não informada', costCenter:'—', status:'Baixa registrada', sourceTable:'erp_financeiro_baixas' }
      } else if (docType === 'NOTA_DEBITO') {
        const q = await supabase.from('erp_financeiro_titulos')
          .select('id,tipo,parceiro_tipo,parceiro_id,descricao,documento,categoria,centro_custo,data_emissao,valor_total,status,conta_bancaria_id')
          .eq('documento', docNumber.trim()).ilike('tipo', '%DEBITO%').order('criado_em', { ascending: false }).limit(1).maybeSingle()
        if (q.error) throw q.error
        if (q.data) row = { id:q.data.id, type:docType, typeLabel:'Nota de débito', number:q.data.documento || q.data.id,
          entity:[q.data.parceiro_tipo, q.data.parceiro_id].filter(Boolean).join(' · ') || 'Não informado',
          amount:Number(q.data.valor_total || 0), date:q.data.data_emissao || '', account:q.data.conta_bancaria_id || 'Não vinculada',
          costCenter:q.data.centro_custo || 'Não informado', status:q.data.status || '—', sourceTable:'erp_financeiro_titulos' }
      } else {
        const [out, incoming] = await Promise.all([
          supabase.from('fiscal_nfe_saidas').select('id,numero,chave_acesso,razao_social_destinatario,valor_total,emitida_em,status').or('numero.eq.'+docNumber.trim()+',chave_acesso.eq.'+docNumber.trim()).limit(1).maybeSingle(),
          supabase.from('fiscal_nfe_entradas').select('id,numero,chave_acesso,razao_social_emitente,valor_total,created_at,status').or('numero.eq.'+docNumber.trim()+',chave_acesso.eq.'+docNumber.trim()).limit(1).maybeSingle()
        ])
        if (out.error) throw out.error
        if (incoming.error) throw incoming.error
        const nfe = out.data ? { ...out.data, party:out.data.razao_social_destinatario, date:out.data.emitida_em, table:'fiscal_nfe_saidas' }
          : incoming.data ? { ...incoming.data, party:incoming.data.razao_social_emitente, date:incoming.data.created_at, table:'fiscal_nfe_entradas' } : null
        if (nfe) row = { id:nfe.id, type:docType, typeLabel:'NF-e', number:nfe.numero || nfe.chave_acesso || nfe.id,
          entity:nfe.party || 'Não informado', amount:Number(nfe.valor_total || 0), date:nfe.date || '', account:'Documento fiscal',
          costCenter:'—', status:nfe.status || '—', sourceTable:nfe.table }
      }
      if (!row) throw new Error('Nenhum documento correspondente foi encontrado para esta empresa e este número.')
      if (competencia && row.date && row.date.slice(0, 7) !== competencia) throw new Error('O documento foi localizado, mas não pertence à competência informada.')
      setFound(row)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Falha ao localizar o documento.')
    } finally { setSearching(false) }
  }

  const clear = () => {
    setDocNumber(''); setCompetencia(''); setFound(null); setReason(''); setJustification('')
    setProof(null); setPeriodOpen(false); setInverseAware(false); setMessage(''); setError('')
  }

  const canSubmit = access === true && !!found && !!reason && !!reversalDate && justification.trim().length >= 25 &&
    periodOpen && inverseAware && !saving

  const submit = async () => {
    if (!canSubmit || !found) return
    setError(''); setMessage('')
    if (proof) {
      setError('O arquivo foi selecionado, mas o armazenamento de comprovantes ainda não está vinculado ao registro de estorno. Não execute sem integração de anexo.')
      return
    }
    setSaving(true)
    try {
      // A RPC disponível registra a ocorrência auditável; não realiza baixa, cancelamento fiscal
      // ou lançamento contábil inverso. A interface deixa essa limitação explícita ao operador.
      const result = await supabase.rpc('erp_fiscal_estornar_documento', {
        p_documento: found.number,
        p_data: reversalDate,
        p_justificativa: '[' + found.typeLabel + ' | ' + reason + ' | ' + linkedAction + '] ' + justification.trim()
      })
      if (result.error) throw result.error
      setMessage('Ocorrência documental registrada no histórico de auditoria. Nenhum lançamento bancário, fiscal ou contábil foi alterado automaticamente.')
      setJustification(''); setProof(null); setPeriodOpen(false); setInverseAware(false)
      await loadAudit()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível registrar a ocorrência.')
    } finally { setSaving(false) }
  }

  const exportAudit = () => {
    const lines = [['Data/Hora', 'Documento', 'Data solicitada', 'Justificativa', 'Vínculo documental'], ...audit.map(item => [new Date(item.criado_em).toLocaleString('pt-BR'), item.documento_alvo, item.data_estorno, item.justificativa, item.documento_estornado_id || 'Sem vínculo'])]
    const csv = '\\ufeff' + lines.map(row => row.map(value => '"' + String(value ?? '').replace(/"/g, '""') + '"').join(';')).join('\\r\\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'auditoria-solicitacoes-estorno.csv'; anchor.click(); URL.revokeObjectURL(url)
  }
  const helpText = useMemo(() => 'Localize o documento pelo identificador exato. Confira os dados originais, informe o motivo padronizado e uma justificativa com pelo menos 25 caracteres. A confirmação registra uma solicitação no log de auditoria; não executa reversão contábil, cancelamento fiscal, alteração de título ou armazenamento de anexo.', [])

  return <main className="min-h-full bg-[#F4FBFD] p-3 text-[#183B4D] sm:p-4 print:bg-white print:p-0">
    <div className="mx-auto max-w-[1500px] space-y-3">
      <div className="hidden border-b-2 border-[#123B50] pb-3 print:block"><strong className="text-[19px] tracking-[.16em]">PLASTIBOR</strong><p className="text-[10px]">Controladoria · Solicitações de estorno documental</p><p className="text-[10px]">Emitido em {new Date().toLocaleString("pt-BR")}</p></div>
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="inline-flex h-[38px] w-[115px] items-center justify-center gap-2 rounded-full border border-[#E2E8F0] bg-white text-[13px] font-semibold text-[#334155] shadow-sm transition hover:bg-slate-50"><ArrowLeft size={15}/>Voltar</button>
          <p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#2D8DB8]">ERP INDUSTRIAL • CONTROLADORIA › ESTORNO DOCUMENTAL</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h1 className="text-lg font-bold text-[#123B50]">Assistente de Retificação e Compliance Financeiro</h1>
            <p className="mt-1 text-xs text-[#607987]">Registro auditável de solicitações de retificação; não executa estorno contábil, cancelamento fiscal ou alteração automática de títulos.</p></div>
          <div className="flex flex-wrap items-center gap-2 print:hidden"><button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#CBD9E0] bg-white px-3 text-xs font-semibold"><FileText size={14}/>Imprimir / PDF</button><span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-800"><LockKeyhole size={13}/>Acesso restrito à Administração, Controladoria ou Financeiro</span></div>
        </div>
      </header>

      {access === null && <div role="status" className={card}>Verificando permissões de acesso…</div>}
      {access === false && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Acesso restrito à Administração, Controladoria ou Financeiro. {error}</div>}
      {access === true && <>
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 print:hidden">{[{label:'Solicitações registradas',value:audit.length},{label:'Registradas hoje',value:auditToday},{label:'Com vínculo documental',value:auditLinked},{label:'Sem vínculo documental',value:audit.length-auditLinked}].map(item=><article key={item.label} className="min-h-[96px] rounded-lg border border-[#D3E3EA] bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wide text-[#607987]">{item.label}</p><strong className="mt-2 block text-xl font-bold tabular-nums text-[#123B50]">{refreshing?'—':item.value}</strong></article>)}</section>
        <section className={card}>
          <div className="mb-4 flex items-center gap-2"><Search size={16} className="text-[#2D8DB8]"/><h2 className="text-sm font-bold">1. Localizar documento para estorno</h2></div>
          <div className="grid grid-cols-1 items-end gap-3 lg:grid-cols-[240px_minmax(240px,1fr)_160px_175px]">
            <label><span className={label}>Tipo de documento *</span><select className={control} value={docType} onChange={e=>{setDocType(e.target.value as DocType);setFound(null)}}><option value="TITULO">Título Financeiro</option><option value="BAIXA">Baixa Bancária</option><option value="NOTA_DEBITO">Nota de Débito</option><option value="NFE">Movimentação / NF-e</option></select></label>
            <label><span className={label}>Nº Documento / NF-e / Título *</span><input className={control} value={docNumber} onChange={e=>setDocNumber(e.target.value)} placeholder="Digite o número exato..." maxLength={120}/></label>
            <label><span className={label}>Competência / Emissão</span><input className={control} type="month" value={competencia} onChange={e=>setCompetencia(e.target.value)}/></label>
            <button type="button" onClick={()=>void searchDocument()} disabled={searching} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#176B91] px-3 text-xs font-bold text-white disabled:opacity-50"><Search size={14}/>{searching?'Buscando…':'Buscar documento'}</button>
          </div>
        </section>

        <section className={card}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-bold">2. Conferência do documento localizado</h2><p className="mt-1 text-[11px] text-[#718792]">Dados do registro original — somente leitura</p></div><span className="rounded-full bg-[#EEF3F6] px-3 py-1 text-[10px] font-bold text-[#526C79]">Status: {found?.status || 'Aguardando busca'}</span></div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label><span className={label}>Nº Documento / ID</span><input className={control} disabled value={found?.number || ''} placeholder="—"/></label>
            <label><span className={label}>Entidade (Cliente / Fornecedor)</span><input className={control} disabled value={found?.entity || ''} placeholder="—"/></label>
            <label><span className={label}>Valor original (R$)</span><input className={control} disabled value={found ? brl(found.amount) : ''} placeholder="—"/></label>
            <label><span className={label}>Data de lançamento</span><input className={control} disabled value={found ? dateBR(found.date) : ''} placeholder="—"/></label>
            <label><span className={label}>Conta / Diário contábil</span><input className={control} disabled value={found?.account || ''} placeholder="—"/></label>
            <label><span className={label}>Centro de custo</span><input className={control} disabled value={found?.costCenter || ''} placeholder="—"/></label>
          </div>
          {found && <p className="mt-3 rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-[10px] text-sky-800">Origem confirmada: {found.sourceTable} · ID: {found.id} · Tipo: {found.typeLabel}</p>}
        </section>

        <section className={card}>
          <div className="mb-4 flex items-center gap-2"><ShieldAlert size={16} className="text-[#D18A28]"/><h2 className="text-sm font-bold">3. Parâmetros de compliance e justificativa</h2></div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(280px,1.2fr)_160px_minmax(260px,1fr)]">
            <label><span className={label}>Motivo padronizado (Compliance) *</span><select className={control} value={reason} onChange={e=>setReason(e.target.value)}><option value="">Selecione o motivo…</option><option>Lançamento em duplicidade</option><option>Erro de valor / alíquota</option><option>Devolução total</option><option>Cancelamento operacional</option><option>Documento emitido incorretamente</option><option>Outros</option></select></label>
            <label><span className={label}>Data contábil do estorno *</span><input className={control} type="date" value={reversalDate} onChange={e=>setReversalDate(e.target.value)}/></label>
            <label><span className={label}>Intenção para tratamento posterior *</span><select className={control} value={linkedAction} onChange={e=>setLinkedAction(e.target.value)}><option value="REABRIR">Solicitar reabertura do título</option><option value="CANCELAR">Solicitar cancelamento do título</option><option value="SEM_VINCULO">Não solicitar alteração do título</option></select></label>
          </div>
          <div className="mt-4">
            <label><span className={label}>Justificativa da Controladoria * (mínimo 25 caracteres)</span><textarea className="min-h-[85px] w-full rounded-md border border-[#CBD9E0] bg-white px-3 py-2 text-xs text-[#183B4D] outline-none focus:border-[#2D8DB8]" value={justification} onChange={e=>setJustification(e.target.value)} placeholder="Descreva detalhadamente o motivo do estorno documental para fins de auditoria..." maxLength={2000}/></label>
            <p className="mt-1 text-right text-[10px] text-[#718792]">{justification.trim().length}/25 caracteres mínimos</p>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[minmax(280px,480px)_1fr]">
            <label><span className={label}>Anexar documento comprobatório / protocolo</span><span className="flex h-10 items-center gap-2 rounded-md border border-[#CBD9E0] bg-white px-3 text-xs text-[#526C79]"><Paperclip size={14}/><input type="file" accept=".pdf,.xml,.png,.jpg,.jpeg" className="min-w-0 flex-1 text-[11px]" onChange={e=>setProof(e.target.files?.[0] || null)}/></span>{proof&&<span className="mt-1 block truncate text-[10px]">{proof.name}</span>}</label>
          </div>
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-amber-900">Travas de segurança e confirmação</p>
            <label className="flex items-start gap-2 text-xs text-amber-950"><input type="checkbox" checked={periodOpen} onChange={e=>setPeriodOpen(e.target.checked)} className="mt-0.5"/>Confirmo que consultei o fechamento financeiro e verifiquei que o período está aberto.</label>
            <label className="mt-2 flex items-start gap-2 text-xs text-amber-950"><input type="checkbox" checked={inverseAware} onChange={e=>setInverseAware(e.target.checked)} className="mt-0.5"/>Estou ciente de que esta tela registra somente uma solicitação; não executa lançamento inverso nem apaga o histórico.</label>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E3EBEF] pt-4">
            <button type="button" onClick={clear} className="inline-flex h-[42px] items-center justify-center gap-2 rounded-md border border-[#CBD9E0] bg-white px-5 text-xs font-bold text-[#526C79]"><RotateCcw size={14}/>Limpar tela</button>
            <button type="button" onClick={()=>void submit()} disabled={!canSubmit} className="inline-flex h-[42px] items-center justify-center gap-2 rounded-md bg-[#DC2626] px-5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><ShieldAlert size={14}/>{saving?'Registrando…':'Registrar ocorrência de estorno'}</button>
          </div>
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900"><strong>Limite operacional atual:</strong> a função transacional disponível no banco grava a ocorrência em auditoria, mas não executa lançamento contábil inverso, cancelamento fiscal, reabertura/cancelamento de título nem persiste anexos. Essas ações permanecem bloqueadas até existir rotina aprovada e integrada para cada origem documental.</p>
        </section>

        <section className={card}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><FileText size={16} className="text-[#2D8DB8]"/><h2 className="text-sm font-bold">4. Solicitações registradas — log de auditoria</h2></div><div className="flex items-center gap-2 print:hidden"><span className="rounded-full bg-[#EEF3F6] px-3 py-1 text-[10px] font-bold text-[#526C79]">{audit.length} registro(s)</span><button type="button" onClick={exportAudit} disabled={!audit.length} className="inline-flex h-8 items-center gap-1 rounded-md border border-[#CBD9E0] px-3 text-[10px] font-semibold">Exportar CSV</button><button type="button" onClick={()=>void loadAudit()} disabled={refreshing} className="inline-flex h-8 items-center gap-1 rounded-md border border-[#CBD9E0] px-3 text-[10px] font-semibold"><RefreshCw size={12} className={refreshing?'animate-spin':''}/>Atualizar</button></div></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[820px] border-collapse text-[11px]"><thead><tr className="h-10 bg-[#EAF2F6] text-left text-[10px] uppercase tracking-wide text-[#526C79]"><th className="px-3">Data / Hora</th><th className="px-3">Documento informado</th><th className="px-3">Tipo de registro</th><th className="px-3">Justificativa</th><th className="px-3">Vínculo documental</th></tr></thead><tbody>{refreshing?<tr><td colSpan={5} className="h-16 text-center text-[#718792]">Carregando auditoria…</td></tr>:visibleAudit.map(item=><tr key={item.id} className="h-12 border-b border-[#E6EDF1]"><td className="whitespace-nowrap px-3">{new Date(item.criado_em).toLocaleString('pt-BR')}</td><td className="px-3 font-semibold">{item.documento_alvo}</td><td className="px-3">Solicitação registrada</td><td className="max-w-[420px] px-3">{item.justificativa}</td><td className="px-3">{item.documento_estornado_id || 'Sem vínculo'}</td></tr>)}{!refreshing&&!audit.length&&<tr><td colSpan={5} className="h-16 text-center text-[#718792]">Nenhuma solicitação registrada para a empresa atual.</td></tr>}</tbody><tfoot><tr className="h-11 border-t-2 border-[#D3E3EA] bg-[#F4F8FA] text-[10px] font-bold"><td colSpan={4} className="px-3">TOTAL DE SOLICITAÇÕES REGISTRADAS</td><td className="px-3 text-right">{audit.length}</td></tr></tfoot></table></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#607987] print:hidden"><span>Página {auditPage} de {auditPages} · {audit.length} registros</span><div className="flex gap-2"><button type="button" disabled={auditPage<=1} onClick={()=>setAuditPage(p=>Math.max(1,p-1))} className="h-8 rounded-md border border-[#CBD9E0] px-3 disabled:opacity-40">Anterior</button><button type="button" disabled={auditPage>=auditPages} onClick={()=>setAuditPage(p=>Math.min(auditPages,p+1))} className="h-8 rounded-md border border-[#CBD9E0] px-3 disabled:opacity-40">Próxima</button></div></div>
        </section>
        <p className="text-[10px] text-[#718792]">{helpText}</p>
        <section className={card + ' print:hidden'}><h2 className="text-xs font-bold uppercase tracking-wide">Como usar esta tela</h2><p className="mt-2 text-[11px]">Localize o documento pelo identificador exato e confira os dados retornados. Escolha o motivo e a intenção de tratamento, informe justificativa com pelo menos 25 caracteres e confirme que consultou o período no fechamento financeiro.</p><p className="mt-1 text-[11px]">A gravação usa a RPC <code>erp_fiscal_estornar_documento</code> e registra a solicitação no histórico da empresa. A RPC atual não reverte lançamentos, não cancela NF-e, não altera títulos e não armazena anexos; essas ações não são anunciadas como concluídas.</p></section>
      </>}
      {error && access === true && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
      {message && access === true && <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</div>}
    </div>
  </main>
}
