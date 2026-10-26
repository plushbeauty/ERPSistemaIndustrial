/**
 * ERPSis — CONTROLE DE REVISÃO VISUAL
 * Data Atual: 2026-10-26
 * Revisão Incremental: padrão premium financeiro
 * Escopo: unificação de contas a pagar e receber, filtros e controles alinhados.
 * Escopo funcional preservado: consultas Supabase, validações, tenant, RPCs e gravações.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import type { IScannerControls } from '@zxing/browser'
import type { LucideIcon } from 'lucide-react'
import { ArrowDownCircle, ArrowUpCircle, Barcode, CalendarClock, Camera, Edit3, Plus, RefreshCw, ScanLine, X, Wallet, CalendarRange, History, CircleDollarSign } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import VendasLayout, { type SalesNavSection } from './VendasLayout'
import { Link } from 'react-router-dom'
import { fetchAllPages } from '../lib/supabasePagination'
import { parseBoleto } from '../lib/boleto'
import { localDateIso, makeInstallments, matchesDueFilter, type DueFilter } from '../lib/financeiroTitulos.mjs'

type Kind = 'PAGAR' | 'RECEBER'
const financeNav: SalesNavSection[] = [{ label:'Financeiro', items:[{label:'Caixa',href:'/financeiro/caixa',icon:CalendarClock},{label:'Contas a pagar',href:'/financeiro/contas-pagar',icon:CalendarClock},{label:'Contas a receber',href:'/financeiro/contas-receber',icon:CalendarClock},{label:'Fluxo de caixa',href:'/financeiro/fluxo-caixa',icon:CalendarClock},{label:'Conciliação',href:'/financeiro/reconciliacao',icon:CalendarClock},{label:'Importar extratos',href:'/financeiro/importar-extratos',icon:CalendarClock},{label:'Ano fiscal',href:'/financeiro/ano-fiscal',icon:CalendarClock},{label:'Custos padrão',href:'/financeiro/custo-padrao',icon:CalendarClock}] }]
type Partner = { id: string; nome: string }
type Company = { id: string; nome: string }
type Installment = { id: string; numero: number; vencimento: string; valor: number; saldo: number; status: string }
type Title = {
  id: string
  empresa_id: string
  tipo: Kind
  parceiro_tipo: string
  parceiro_id: string
  descricao: string
  documento: string | null
  categoria: string | null
  centro_custo: string | null
  data_emissao: string
  origem_tipo: string
  origem_id: string | null
  valor_total: number
  status: string
  erp_financeiro_parcelas: Installment[] | null
}
type SourceOrder = {
  id: string
  numero: string | number
  total: number
  partner_id: string
  data: string | null
  descricao: string
}
type Profile = { empresa_id: string | null; is_master: boolean }
type PaymentHistoryRow = { id: string; parcela_id: string; valor: number; ocorrido_em: string; forma_pagamento: string; referencia: string | null }
type TitleStatusFilter = 'TODOS' | 'ABERTO' | 'PARCIAL' | 'LIQUIDADO' | 'CANCELADO'

const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const dateToday = () => localDateIso()
const PAGE_SIZE = 25
const emptyForm = {
  titleId: '',
  partnerId: '',
  description: '',
  document: '',
  category: '',
  costCenter: '',
  issueDate: dateToday(),
  total: '',
  installments: '1',
  firstDue: dateToday(),
  sourceId: '',
}

export default function FinanceiroTitulos({ kind }: { kind: Kind }) {
  const payable = kind === 'PAGAR'
  const [profile, setProfile] = useState<Profile | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState('')
  const [partners, setPartners] = useState<Partner[]>([])
  const [titles, setTitles] = useState<Title[]>([])
  const [sources, setSources] = useState<SourceOrder[]>([])
  const [page, setPage] = useState(0)
  const [form, setForm] = useState(emptyForm)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TitleStatusFilter>('TODOS')
  const [dueFilter, setDueFilter] = useState<DueFilter>('TODOS')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [sourceMode, setSourceMode] = useState(false)
  const [payment, setPayment] = useState<{ installment: Installment; title: Title } | null>(null)
  const [paymentValue, setPaymentValue] = useState('')
  const [paymentDate, setPaymentDate] = useState(() => new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16))
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [historyTitle, setHistoryTitle] = useState<Title | null>(null)
  const [historyRows, setHistoryRows] = useState<PaymentHistoryRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [paymentsThisMonth, setPaymentsThisMonth] = useState(0)
  const [barcode, setBarcode] = useState('')
  const [barcodeMessage, setBarcodeMessage] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [videoDeviceId, setVideoDeviceId] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const scanControls = useRef<IScannerControls | null>(null)

  const companyId = profile?.is_master ? selectedCompany : profile?.empresa_id ?? ''

  const load = useCallback(async () => {
    if (!companyId) {
      setTitles([])
      setPartners([])
      setPaymentsThisMonth(0)
      setPage(0)
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const now = new Date()
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01T00:00:00`
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const nextMonthStart = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01T00:00:00`
      const [titleRows, partnerRows, paymentRows] = await Promise.all([
        fetchAllPages<unknown>((from, to) =>
          supabase.from('erp_financeiro_titulos')
            .select('id,empresa_id,tipo,parceiro_tipo,parceiro_id,descricao,documento,categoria,centro_custo,data_emissao,origem_tipo,origem_id,valor_total,status,erp_financeiro_parcelas(id,numero,vencimento,valor,saldo,status)', { count: 'exact' })
            .eq('empresa_id', companyId).eq('tipo', kind).order('criado_em', { ascending: false }).range(from, to),
        ),
        payable
          ? fetchAllPages<unknown>((from, to) =>
              supabase.from('erp_fornecedores').select('id,razao_social', { count: 'exact' }).eq('empresa_id', companyId).eq('ativo', true).order('razao_social').range(from, to),
            )
          : fetchAllPages<unknown>((from, to) =>
              supabase.from('erp_clientes').select('id,nome', { count: 'exact' }).eq('empresa_id', companyId).eq('ativo', true).order('nome').range(from, to),
            ),
        fetchAllPages<{ valor: number }>((from, to) =>
          supabase.from('erp_financeiro_baixas').select('valor,erp_financeiro_titulos!inner(tipo)', { count: 'exact' })
            .eq('empresa_id', companyId).eq('erp_financeiro_titulos.tipo', kind)
            .gte('ocorrido_em', monthStart).lt('ocorrido_em', nextMonthStart).range(from, to),
        ),
      ])
      setTitles(titleRows as unknown as Title[])
      setPartners(partnerRows.map((partner) => {
        const row = partner as { id: string; razao_social?: string; nome?: string }
        return { id: String(row.id), nome: String(payable ? row.razao_social ?? '' : row.nome ?? '') }
      }))
      setPaymentsThisMonth(paymentRows.reduce((sum, row) => sum + Number(row.valor || 0), 0))
      setPage(0)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível consultar os títulos financeiros.')
    } finally {
      setLoading(false)
    }
  }, [companyId, kind, payable])

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      try {
        const auth = await supabase.auth.getUser()
        if (auth.error) throw auth.error
        if (!auth.data.user) throw new Error('Sessão não localizada.')
        const profileResult = await supabase.from('erp_usuarios')
          .select('empresa_id,is_master,nivel_admin,perfil,ativo,deleted_at')
          .eq('auth_user_id', auth.data.user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
        if (profileResult.error) throw profileResult.error
        if (!profileResult.data) throw new Error('Usuário ERP ativo não localizado.')
        const master = profileResult.data.is_master === true
          && Number(profileResult.data.nivel_admin ?? 0) >= 100
          && String(profileResult.data.perfil ?? '').toUpperCase() === 'MASTER'
          && profileResult.data.empresa_id === null
        if (!master && !profileResult.data.empresa_id) throw new Error('Empresa da sessão não identificada.')
        if (!active) return
        setProfile({ empresa_id: profileResult.data.empresa_id, is_master: master })
        if (master) {
          const companyRows = await fetchAllPages<{ id: string; razao_social: string | null; nome_fantasia: string | null }>((from, to) =>
            supabase.from('erp_empresas').select('id,razao_social,nome_fantasia', { count: 'exact' }).eq('ativo', true).order('nome_fantasia').range(from, to),
          )
          if (!active) return
          const available = companyRows.map(company => ({
            id: String(company.id),
            nome: String(company.nome_fantasia || company.razao_social || company.id),
          }))
          setCompanies(available)
          setSelectedCompany(current => current || available[0]?.id || '')
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível validar o acesso financeiro.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!sourceMode || !companyId || form.titleId) return
    let active = true
    void (async () => {
      try {
        setSources([])
        const resultRows = payable
          ? await fetchAllPages<unknown>((from, to) =>
              supabase.from('erp_pedidos_compra').select('id,numero,total,fornecedor_id,created_at,status', { count: 'exact' }).eq('empresa_id', companyId).in('status', ['APROVADO','RECEBIMENTO_PARCIAL','RECEBIDO']).order('created_at', { ascending: false }).range(from, to),
            )
          : await fetchAllPages<unknown>((from, to) =>
              supabase.from('erp_pedidos_venda').select('id,numero,total,cliente_id,data_entrada,status', { count: 'exact' }).eq('empresa_id', companyId).eq('status','faturado').order('data_entrada', { ascending: false }).range(from, to),
            )
        if (!active) return
        setSources(resultRows.map((value) => {
          const source = value as { id: string; numero?: string | number | null; total?: number | null; fornecedor_id?: string; cliente_id?: string; created_at?: string | null; data_entrada?: string | null }
          return {
            id: String(source.id),
            numero: String(source.numero ?? source.id),
            total: Number(source.total ?? 0),
            partner_id: String(payable ? source.fornecedor_id ?? '' : source.cliente_id ?? ''),
            data: String(payable ? source.created_at ?? '' : source.data_entrada ?? '').slice(0,10) || null,
            descricao: `${payable ? 'Pedido de compra' : 'Pedido de venda'} #${String(source.numero ?? source.id)}`,
          }
        }).filter(source => source.total > 0))
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível consultar pedidos aprovados.')
      }
    })()
    return () => { active = false }
  }, [companyId, form.titleId, payable, sourceMode])

  useEffect(() => {
    if (!scannerOpen) return
    let active = true
    let controls: IScannerControls | null = null
    void (async () => {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices()
        if (!active) return
        setVideoDevices(devices)
        const preferred = videoDeviceId || devices.find(device => /back|rear|environment|traseira/i.test(device.label))?.deviceId || devices[0]?.deviceId
        if (!preferred) throw new Error('Nenhuma câmera disponível neste navegador.')
        if (videoDeviceId !== preferred) {
          setVideoDeviceId(preferred)
          return
        }
        if (!videoRef.current) return
        const reader = new BrowserMultiFormatReader()
        controls = await reader.decodeFromVideoDevice(preferred, videoRef.current, result => {
          if (!result || !active) return
          const text = result.getText()
          setScannerOpen(false)
          setBarcode(text)
          parseAndApplyBoleto(text)
        })
        scanControls.current = controls
      } catch (cause) {
        if (!active) return
        setScannerOpen(false)
        setError(cause instanceof Error ? cause.message : 'Câmera indisponível. Digite a linha digitável.')
      }
    })()
    return () => {
      active = false
      controls?.stop()
      scanControls.current?.stop()
      scanControls.current = null
    }
  }, [scannerOpen, videoDeviceId])

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('pt-BR')
    return titles.filter(title => {
      const searchMatches = !needle || [
        title.descricao, title.documento, title.categoria, title.centro_custo, title.status,
        partners.find(partner => partner.id === title.parceiro_id)?.nome,
      ].some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(needle))
      const statusMatches = statusFilter === 'TODOS' || title.status === statusFilter
      const dueMatches = matchesDueFilter(title.erp_financeiro_parcelas ?? [], dueFilter, dateToday())
      return searchMatches && statusMatches && dueMatches
    })
  }, [dueFilter, partners, query, statusFilter, titles])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visibleTitles = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  useEffect(() => { setPage(current => Math.min(current, pageCount - 1)) }, [pageCount])

  const openNew = () => {
    setForm(emptyForm)
    setSourceMode(false)
    setMessage('')
    setError('')
    setBarcodeMessage('')
    setShowForm(true)
  }

  const chooseSource = (sourceId: string) => {
    const source = sources.find(item => item.id === sourceId)
    if (!source) return
    setForm(current => ({
      ...current,
      titleId: '',
      sourceId,
      partnerId: source.partner_id,
      description: source.descricao,
      total: source.total.toFixed(2),
      issueDate: source.data || dateToday(),
    }))
  }

  const editTitle = (title: Title) => {
    if (title.origem_tipo !== 'MANUAL' || title.status !== 'ABERTO') {
      setError('Pedidos vinculados, títulos com baixa ou títulos que não estejam abertos não podem ser editados.')
      return
    }
    const installments = [...(title.erp_financeiro_parcelas ?? [])].sort((a,b) => a.numero-b.numero)
    if (!installments.length) {
      setError('O título não possui parcelas registradas e não pode ser editado por este formulário.')
      return
    }
    setForm({
      titleId: title.id,
      partnerId: title.parceiro_id,
      description: title.descricao,
      document: title.documento ?? '',
      category: title.categoria ?? '',
      costCenter: title.centro_custo ?? '',
      issueDate: title.data_emissao,
      total: title.valor_total.toFixed(2),
      installments: String(installments.length),
      firstDue: installments[0].vencimento,
      sourceId: '',
    })
    setSourceMode(false)
    setShowForm(true)
    setError('')
  }

  const saveTitle = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')
    const total = Number(form.total)
    const count = Number(form.installments)
    if (!companyId || !form.partnerId || !form.description.trim() || !Number.isFinite(total) || total <= 0 ||
        !Number.isInteger(count) || count < 1 || count > 120 || !form.firstDue) {
      setError('Informe parceiro, descrição, valor positivo, vencimento e parcelamento entre 1 e 120.')
      return
    }
    const source = sources.find(item => item.id === form.sourceId)
    if (sourceMode && !source) {
      setError('Selecione um pedido de origem válido.')
      return
    }
    if (source && (source.partner_id !== form.partnerId || Math.round(source.total*100) !== Math.round(total*100))) {
      setError('O parceiro e o total devem corresponder exatamente ao pedido de origem.')
      return
    }
    setBusy(true)
    try {
      const parcelas = makeInstallments(total, count, form.firstDue)
      const result = await supabase.rpc('erp_financeiro_salvar_titulo', {
        p_titulo_id: form.titleId || null,
        p_empresa_id: companyId,
        p_tipo: kind,
        p_parceiro_id: form.partnerId,
        p_descricao: form.description.trim(),
        p_documento: form.document.trim() || null,
        p_categoria: form.category.trim() || null,
        p_centro_custo: form.costCenter.trim() || null,
        p_data_emissao: form.issueDate,
        p_origem_tipo: source ? (payable ? 'PEDIDO_COMPRA' : 'PEDIDO_VENDA') : 'MANUAL',
        p_origem_id: source?.id ?? null,
        p_chave_idempotencia: crypto.randomUUID(),
        p_parcelas: parcelas,
      })
      if (result.error) throw result.error
      setMessage(source
        ? `${source.descricao} vinculado ao título financeiro sem duplicação.`
        : form.titleId ? 'Título atualizado; histórico financeiro preservado.' : 'Título e parcelas gravados com sucesso.')
      setShowForm(false)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível gravar o título financeiro.')
    } finally {
      setBusy(false)
    }
  }

  const parseAndApplyBoleto = (value: string) => {
    try {
      const parsed = parseBoleto(value)
      setForm(current => ({
        ...current,
        document: parsed.codigoBarras,
        ...(parsed.valor ? { total: parsed.valor.toFixed(2) } : {}),
        ...(parsed.vencimento ? { firstDue: parsed.vencimento } : {}),
        description: current.description || `Boleto bancário • banco ${parsed.banco}`,
      }))
      setBarcodeMessage(`Código validado. Banco ${parsed.banco}; confira valor e vencimento antes de gravar.`)
      setError('')
    } catch (cause) {
      setBarcodeMessage('')
      setError(cause instanceof Error ? cause.message : 'Não foi possível interpretar o código do boleto.')
    }
  }

  const startScanner = async () => {
    setError('')
    setScannerOpen(true)
  }

  const changeCamera = (deviceId: string) => {
    scanControls.current?.stop()
    setVideoDeviceId(deviceId)
  }

  const submitPayment = async (event: FormEvent) => {
    event.preventDefault()
    if (!payment || !companyId) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await supabase.rpc('erp_financeiro_registrar_baixa', {
        p_empresa_id: payment.title.empresa_id,
        p_parcela_id: payment.installment.id,
        p_valor: Number(paymentValue),
        p_ocorrido_em: new Date(paymentDate).toISOString(),
        p_forma_pagamento: paymentMethod,
        p_referencia: paymentReference.trim() || null,
        p_chave_idempotencia: crypto.randomUUID(),
      })
      if (result.error) throw result.error
      setMessage('Baixa financeira registrada e saldo da parcela atualizado.')
      setPayment(null)
      setPaymentValue('')
      setPaymentMethod('')
      setPaymentReference('')
      setPaymentDate(new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16))
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível registrar a baixa.')
    } finally {
      setBusy(false)
    }
  }

  const openHistory = async (title: Title) => {
    setHistoryTitle(title)
    setHistoryRows([])
    setHistoryLoading(true)
    setError('')
    try {
      const rows = await fetchAllPages<PaymentHistoryRow>((from, to) =>
        supabase.from('erp_financeiro_baixas')
          .select('id,parcela_id,valor,ocorrido_em,forma_pagamento,referencia', { count: 'exact' })
          .eq('empresa_id', title.empresa_id).eq('titulo_id', title.id)
          .order('ocorrido_em', { ascending: false }).range(from, to),
      )
      setHistoryRows(rows)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível consultar o histórico de baixas.')
      setHistoryTitle(null)
    } finally {
      setHistoryLoading(false)
    }
  }

  const title = payable ? 'Contas a pagar' : 'Contas a receber'
  const openBalance = titles.reduce((sum, row) => sum + (row.erp_financeiro_parcelas ?? []).reduce((total, installment) => total + Number(installment.saldo), 0), 0)
  const overdueBalance = titles.reduce((sum, row) => sum + (row.erp_financeiro_parcelas ?? []).filter(part => part.saldo > 0 && part.vencimento < dateToday()).reduce((total, part) => total + Number(part.saldo), 0), 0)
  const dueSoon = titles.reduce((sum, row) => sum + (row.erp_financeiro_parcelas ?? []).filter(part => part.saldo > 0 && matchesDueFilter([part], 'PROXIMOS_7', dateToday())).reduce((total, part) => total + Number(part.saldo), 0), 0)
  return <VendasLayout title="" subtitle="" showPageHeader={false} showStatusCards={false} onRefresh={()=>void load()} navSections={financeNav}><main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6">
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950 to-blue-700 px-6 py-5 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-12 -top-28 size-80 rounded-full border-[24px] border-white/5" />
        <p className="relative text-[10px] font-bold uppercase tracking-[.18em] text-white">Financeiro · Tesouraria industrial</p>
        <h1 className="relative mt-1 text-2xl font-extrabold">{title}</h1>
        <p className="relative mt-1 text-xs text-white">Títulos, parcelas, vencimentos e baixas integrados com compras e vendas.</p>
        <span className="relative mt-3 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold text-white">Atualizado · Padrão Premium · 26/10/2026</span>
      </header>
      <nav aria-label="Contas financeiras" className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <Link to="/financeiro/contas-pagar" className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-bold ${payable ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}><ArrowUpCircle size={15}/>Contas a pagar</Link>
        <Link to="/financeiro/contas-receber" className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-bold ${!payable ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}><ArrowDownCircle size={15}/>Contas a receber</Link>
      </nav>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <label className="grid min-w-56 flex-1 gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">Buscar título
          <input value={query} onChange={event => { setQuery(event.target.value); setPage(0) }} className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium normal-case tracking-normal outline-none focus:border-slate-400 focus:bg-white" placeholder="Parceiro, documento, categoria..."/>
        </label>
        <label className="grid min-w-36 gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">Status
          <select value={statusFilter} onChange={event => { setStatusFilter(event.target.value as TitleStatusFilter); setPage(0) }} className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium normal-case tracking-normal outline-none focus:border-slate-400 focus:bg-white">
            <option value="TODOS">Todos</option><option value="ABERTO">Aberto</option><option value="PARCIAL">Parcial</option><option value="LIQUIDADO">Liquidado</option><option value="CANCELADO">Cancelado</option>
          </select>
        </label>
        <label className="grid min-w-40 gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">Vencimento
          <select value={dueFilter} onChange={event => { setDueFilter(event.target.value as DueFilter); setPage(0) }} className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium normal-case tracking-normal outline-none focus:border-slate-400 focus:bg-white">
            <option value="TODOS">Todos os períodos</option><option value="VENCIDO">Vencidos</option><option value="HOJE">Vence hoje</option><option value="PROXIMOS_7">Próximos 7 dias</option>
          </select>
        </label>
        {profile?.is_master && <label className="grid min-w-56 gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">Empresa
            <select value={selectedCompany} onChange={event => setSelectedCompany(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium normal-case tracking-normal outline-none focus:border-slate-400 focus:bg-white">
              <option value="">Selecionar empresa</option>
              {companies.map(company => <option key={company.id} value={company.id}>{company.nome}</option>)}
            </select>
          </label>}
        <button type="button" onClick={openNew} disabled={!companyId || busy} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-700 px-4 text-xs font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-blue-800 disabled:opacity-50"><Plus size={15}/>Novo título</button>
      </div>
      {error && <div role="alert" className="border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error}</div>}
      {message && <div role="status" className="border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">{message}</div>}
      {!companyId && profile?.is_master && <p className="border border-amber-300 bg-amber-50 p-3 text-sm">Selecione a empresa que o Master vai administrar.</p>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi icon={payable ? ArrowUpCircle : ArrowDownCircle} label="Títulos registrados" value={String(titles.length)} />
        <Kpi icon={Wallet} label="Saldo em aberto" value={currency(openBalance)} />
        <Kpi icon={CalendarClock} label="Saldo vencido" value={currency(overdueBalance)} />
        <Kpi icon={CalendarRange} label="Vencendo em 7 dias" value={currency(dueSoon)} />
        <Kpi icon={CircleDollarSign} label={payable ? 'Pagamentos no mês' : 'Recebimentos no mês'} value={currency(paymentsThisMonth)} />
      </section>

      {showForm && <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div><h2 className="font-semibold">{form.titleId ? 'Editar título manual' : sourceMode ? 'Gerar título do pedido' : 'Novo título manual'}</h2><p className="text-xs text-slate-600">O parcelamento soma exatamente o valor total; gravar não baixa nem liquida parcelas.</p></div>
          <button type="button" onClick={() => setShowForm(false)} aria-label="Fechar formulário" className="grid size-8 place-items-center border border-slate-300"><X size={16}/></button>
        </div>
        {!form.titleId && <div className="mb-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => { setSourceMode(false); setForm(current => ({ ...current, sourceId: '' })) }} className={`border px-3 py-2 text-xs ${!sourceMode?'border-sky-700 bg-sky-50 font-semibold':'border-slate-300'}`}>Lançamento manual</button>
          <button type="button" onClick={() => setSourceMode(true)} className={`border px-3 py-2 text-xs ${sourceMode?'border-sky-700 bg-sky-50 font-semibold':'border-slate-300'}`}>Vincular pedido de {payable?'compra':'venda'}</button>
        </div>}
        {sourceMode && !form.titleId && <label className="mb-3 grid gap-1 text-xs font-semibold">Pedido elegível
          <select value={form.sourceId} onChange={event => chooseSource(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium">
            <option value="">Selecionar pedido aprovado</option>
            {sources.map(source => <option key={source.id} value={source.id}>{source.descricao} · {currency(source.total)} · {source.data ?? 'sem data'}</option>)}
          </select>
        </label>}
        {payable && !form.titleId && !sourceMode && <section className="mb-3 rounded-xl border border-sky-200 bg-sky-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-sky-950"><Barcode size={17}/>Ler código de boleto (somente preenchimento)</div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <input value={barcode} onChange={event => setBarcode(event.target.value)} placeholder="Linha digitável (47 dígitos) ou código de barras (44)" className="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold"/>
            <button type="button" onClick={() => parseAndApplyBoleto(barcode)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold shadow-sm">Validar linha</button>
            <button type="button" onClick={() => void startScanner()} className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-blue-700 px-3 text-xs font-semibold text-white shadow-sm"><Camera size={15}/>Abrir câmera</button>
          </div>
          {barcodeMessage && <p role="status" className="mt-2 text-xs text-emerald-800">{barcodeMessage}</p>}
          <p className="mt-1 text-[11px] text-slate-600">A leitura nunca registra pagamento: confira beneficiário, vencimento e valor antes de salvar o título.</p>
        </section>}
        <form onSubmit={event => void saveTitle(event)} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 xl:col-span-2">Parceiro
            <select required value={form.partnerId} disabled={Boolean(form.sourceId)} onChange={event => setForm(current => ({...current,partnerId:event.target.value}))} className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium normal-case tracking-normal focus:bg-white disabled:bg-slate-100">
              <option value="">Selecionar {payable?'fornecedor':'cliente'}</option>
              {partners.map(partner => <option key={partner.id} value={partner.id}>{partner.nome}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 xl:col-span-2">Descrição
            <input required value={form.description} onChange={event => setForm(current => ({...current,description:event.target.value}))} className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium normal-case tracking-normal focus:bg-white"/>
          </label>
          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">Documento
            <input value={form.document} onChange={event => setForm(current => ({...current,document:event.target.value}))} className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium normal-case tracking-normal focus:bg-white"/>
          </label>
          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">Categoria
            <input value={form.category} onChange={event => setForm(current => ({...current,category:event.target.value}))} className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium normal-case tracking-normal focus:bg-white"/>
          </label>
          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">Centro de custo
            <input value={form.costCenter} onChange={event => setForm(current => ({...current,costCenter:event.target.value}))} className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium normal-case tracking-normal focus:bg-white"/>
          </label>
          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">Data de emissão
            <input required type="date" value={form.issueDate} onChange={event => setForm(current => ({...current,issueDate:event.target.value}))} className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium normal-case tracking-normal focus:bg-white"/>
          </label>
          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">Valor total
            <input required type="number" min="0.01" step="0.01" value={form.total} disabled={Boolean(form.sourceId)} onChange={event => setForm(current => ({...current,total:event.target.value}))} className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium normal-case tracking-normal disabled:bg-slate-100"/>
          </label>
          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">Número de parcelas
            <input required type="number" min="1" max="120" step="1" value={form.installments} onChange={event => setForm(current => ({...current,installments:event.target.value}))} className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium normal-case tracking-normal"/>
          </label>
          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">Primeiro vencimento
            <input required type="date" value={form.firstDue} onChange={event => setForm(current => ({...current,firstDue:event.target.value}))} className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium normal-case tracking-normal"/>
          </label>
          <div className="flex items-end gap-2 xl:col-span-4">
            <button type="button" onClick={() => setShowForm(false)} className="h-10 border border-slate-300 px-4 text-sm">Cancelar</button>
            <button type="submit" disabled={busy} className="h-10 bg-sky-800 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy?'Salvando…':form.titleId?'Salvar alterações':'Gravar título e parcelas'}</button>
          </div>
        </form>
      </section>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-3"><div><h2 className="text-sm font-bold text-slate-800">Títulos e parcelas</h2><p className="text-xs text-slate-500">{filtered.length} resultado(s) · consulta da empresa selecionada</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">{loading ? 'Atualizando…' : `${filtered.length} registros`}</span></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr><th className="px-3 py-2">Parceiro / descrição</th><th className="px-3 py-2">Documento</th><th className="px-3 py-2">Origem</th><th className="px-3 py-2">Parcelas</th><th className="px-3 py-2">Total / saldo</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Ações</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="px-3 py-8 text-center">Carregando títulos financeiros…</td></tr>}
              {!loading && visibleTitles.map((title, index) => {
                const installments = [...(title.erp_financeiro_parcelas ?? [])].sort((a,b) => a.numero-b.numero)
                const balance = installments.reduce((sum,item) => sum+Number(item.saldo),0)
                return <tr key={title.id} className="border-t border-slate-100 align-top" style={{ background: index % 2 ? '#f8fafc' : '#fff' }}>
                  <td className="px-3 py-2"><strong>{partners.find(partner=>partner.id===title.parceiro_id)?.nome ?? 'Parceiro não disponível'}</strong><br/><span className="text-xs text-slate-600">{title.descricao}</span>{title.categoria&&<div className="text-[11px] text-slate-500">{title.categoria}{title.centro_custo?` · ${title.centro_custo}`:''}</div>}</td>
                  <td className="px-3 py-2">{title.documento||'—'}</td>
                  <td className="px-3 py-2">{title.origem_tipo==='MANUAL'?'Manual':`${title.origem_tipo==='PEDIDO_COMPRA'?'Pedido de compra':'Pedido de venda'} · idempotente`}</td>
                  <td className="px-3 py-2"><div className="space-y-1">{installments.map(item=><div key={item.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2 text-xs"><span>#{item.numero} · {item.vencimento} · {currency(item.valor)} · saldo {currency(item.saldo)} · <StatusBadge status={item.status}/></span>{item.saldo>0&&<button type="button" onClick={()=>{setPayment({title,installment:item});setPaymentValue(item.saldo.toFixed(2));setPaymentMethod('')}} className="inline-flex h-9 shrink-0 items-center rounded-lg border border-blue-200 bg-white px-2 text-[11px] font-bold text-blue-800 shadow-sm hover:bg-blue-50">Baixar</button>}</div>)}</div></td>
                  <td className="px-3 py-2 tabular-nums">{currency(title.valor_total)}<div className="text-xs text-slate-600">{currency(balance)} em aberto</div></td>
                  <td className="px-3 py-2"><StatusBadge status={title.status}/></td>
                  <td className="space-y-1 px-3 py-2"><button type="button" onClick={()=>void openHistory(title)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"><History size={13}/>Histórico</button>{title.origem_tipo==='MANUAL'&&title.status==='ABERTO'&&balance===title.valor_total&&<button type="button" onClick={()=>editTitle(title)} aria-label="Editar título manual" className="erp-edit-button"><Edit3 size={13}/>Editar</button>}</td>
                </tr>
              })}
              {!loading&&!filtered.length&&<tr><td colSpan={7} className="px-3 py-10 text-center text-slate-600">Nenhum título registrado para esta empresa.</td></tr>}
            </tbody>
          </table>
        </div>
        <nav aria-label="Paginação de títulos financeiros" className="flex items-center justify-end gap-3 border-t border-slate-200 p-3">
          <button type="button" disabled={page === 0} onClick={() => setPage(current => Math.max(0, current - 1))} className="h-9 border border-slate-300 px-3 text-sm disabled:opacity-50">Anterior</button>
          <span aria-live="polite" className="text-xs text-slate-600">Página {page + 1} de {pageCount}</span>
          <button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage(current => Math.min(pageCount - 1, current + 1))} className="h-9 border border-slate-300 px-3 text-sm disabled:opacity-50">Próxima</button>
        </nav>
      </section>
      {historyTitle&&<div role="dialog" aria-modal="true" aria-labelledby="history-title" className="fixed inset-0 z-[1000] grid place-items-center bg-slate-950/50 p-4">
        <section className="w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 id="history-title" className="font-bold text-slate-900">Histórico de baixas</h2><p className="text-xs text-slate-500">{historyTitle.descricao} · {historyTitle.documento || 'sem documento'}</p></div><button type="button" onClick={()=>setHistoryTitle(null)} aria-label="Fechar histórico" className="grid size-9 place-items-center rounded-lg border border-slate-200"><X size={16}/></button></header>
          <div className="max-h-[60vh] overflow-auto p-4">{historyLoading?<p className="py-8 text-center text-sm text-slate-500">Consultando baixas registradas…</p>:historyRows.length?<table className="w-full text-left text-xs"><thead className="bg-slate-100 uppercase text-slate-600"><tr><th className="p-3">Data</th><th className="p-3">Forma</th><th className="p-3">Referência</th><th className="p-3 text-right">Valor</th></tr></thead><tbody>{historyRows.map(row=><tr key={row.id} className="border-t border-slate-100"><td className="p-3">{new Date(row.ocorrido_em).toLocaleString('pt-BR')}</td><td className="p-3">{row.forma_pagamento}</td><td className="p-3">{row.referencia || '—'}</td><td className="p-3 text-right font-semibold">{currency(Number(row.valor))}</td></tr>)}</tbody></table>:<p className="py-8 text-center text-sm text-slate-500">Nenhuma baixa registrada neste título.</p>}</div>
        </section>
      </div>}
      {payment&&<div role="dialog" aria-modal="true" aria-labelledby="payment-title" className="fixed inset-0 z-[1000] grid place-items-center bg-slate-950/40 p-4">
        <form onSubmit={event=>void submitPayment(event)} className="w-full max-w-lg space-y-3 border border-slate-300 bg-white p-5 shadow-xl">
          <div className="flex items-start justify-between"><div><h2 id="payment-title" className="font-semibold">Registrar baixa</h2><p className="text-xs text-slate-600">Parcela #{payment.installment.numero} · saldo {currency(payment.installment.saldo)}</p></div><button type="button" onClick={()=>setPayment(null)} aria-label="Fechar baixa"><X size={17}/></button></div>
          <label className="grid gap-1 text-xs font-semibold">Valor recebido/pago
            <input required type="number" min="0.01" max={payment.installment.saldo} step="0.01" value={paymentValue} onChange={event=>setPaymentValue(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold"/>
          </label>
          <label className="grid gap-1 text-xs font-semibold">Data e hora da baixa
            <input required type="datetime-local" value={paymentDate} onChange={event=>setPaymentDate(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold"/>
          </label>
          <label className="grid gap-1 text-xs font-semibold">Forma de pagamento/recebimento
            <select required value={paymentMethod} onChange={event=>setPaymentMethod(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold"><option value="">Selecionar forma</option><option>PIX</option><option>TED/DOC</option><option>Boleto</option><option>Cartão</option><option>Dinheiro</option><option>Outro</option></select>
          </label>
          <label className="grid gap-1 text-xs font-semibold">Referência / comprovante
            <input value={paymentReference} onChange={event=>setPaymentReference(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold"/>
          </label>
          <div className="flex justify-end gap-2"><button type="button" onClick={()=>setPayment(null)} className="h-9 border border-slate-300 px-3 text-sm">Cancelar</button><button disabled={busy} className="h-9 bg-sky-800 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy?'Registrando…':'Confirmar baixa'}</button></div>
        </form>
      </div>}
      {scannerOpen&&<div role="dialog" aria-modal="true" aria-label="Leitor de código de boleto" className="fixed inset-0 z-[1100] grid place-items-center bg-slate-950/60 p-4">
        <section className="w-full max-w-2xl space-y-3 border border-slate-300 bg-white p-4">
          <header className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold"><ScanLine size={18}/>Leitura de boleto</h2><button type="button" aria-label="Fechar leitor" onClick={()=>{scanControls.current?.stop();setScannerOpen(false)}}><X size={18}/></button></header>
          {videoDevices.length>1&&<label className="grid gap-1 text-xs font-semibold">Câmera
            <select value={videoDeviceId} onChange={event=>void changeCamera(event.target.value)} className="h-9 border border-slate-300 bg-white px-2">{videoDevices.map((device,index)=><option key={device.deviceId} value={device.deviceId}>{device.label||`Câmera ${index+1}`}</option>)}</select>
          </label>}
          <video ref={videoRef} autoPlay muted playsInline className="max-h-[60vh] w-full bg-black"/>
          <p className="text-xs text-slate-600">A câmera só lê o código. A inclusão do título e qualquer baixa dependem de confirmação separada.</p>
        </section>
      </div>}
    </div>
  </main>
</VendasLayout>
}

export function FinanceiroContasPagar({ kind }: { kind: Kind }) {
  return <FinanceiroTitulos kind={kind} />
}

export function FinanceiroContasReceber({ kind }: { kind: Kind }) {
  return <FinanceiroTitulos kind={kind} />
}

function Kpi({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <article className="flex min-h-24 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon size={19}/></span><div className="min-w-0"><span className="block text-xs font-medium text-slate-500">{label}</span><strong className="mt-1 block truncate text-lg font-extrabold text-slate-900">{value}</strong></div></article>
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase()
  const color = normalized === 'LIQUIDADO' ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : normalized === 'PARCIAL' ? 'border-amber-200 bg-amber-50 text-amber-800'
    : normalized === 'CANCELADO' ? 'border-slate-300 bg-slate-100 text-slate-700'
    : 'border-blue-200 bg-blue-50 text-blue-800'
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${color}`}>{status}</span>
}
