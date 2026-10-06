import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import type { IScannerControls } from '@zxing/browser'
import type { LucideIcon } from 'lucide-react'
import { ArrowDownCircle, ArrowUpCircle, Barcode, CalendarClock, Camera, Edit3, Plus, RefreshCw, ScanLine, Users, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import VendasLayout from './VendasLayout'
import { fetchAllPages } from '../lib/supabasePagination'
import { parseBoleto } from '../lib/boleto'

type Kind = 'PAGAR' | 'RECEBER'
const financeNav = [{ label:'Financeiro', items:[{label:'Caixa',href:'/financeiro/caixa'},{label:'Contas a pagar',href:'/financeiro/contas-pagar'},{label:'Contas a receber',href:'/financeiro/contas-receber'},{label:'Fluxo de caixa',href:'/financeiro/fluxo-caixa'},{label:'Conciliação',href:'/financeiro/reconciliacao'},{label:'Importar extratos',href:'/financeiro/importar-extratos'},{label:'Ano fiscal',href:'/financeiro/ano-fiscal'},{label:'Custos padrão',href:'/financeiro/custo-padrao'}] }]
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

const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const dateToday = () => new Date().toISOString().slice(0, 10)
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

function addMonthsClamped(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const firstOfTarget = new Date(Date.UTC(year, month - 1 + months, 1))
  const lastDay = new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth() + 1, 0)).getUTCDate()
  return [
    firstOfTarget.getUTCFullYear(),
    String(firstOfTarget.getUTCMonth() + 1).padStart(2, '0'),
    String(Math.min(day, lastDay)).padStart(2, '0'),
  ].join('-')
}

function makeInstallments(total: number, count: number, firstDue: string) {
  const cents = Math.round(total * 100)
  const base = Math.floor(cents / count)
  return Array.from({ length: count }, (_, index) => ({
    numero: index + 1,
    vencimento: addMonthsClamped(firstDue, index),
    valor: (index === count - 1 ? cents - base * (count - 1) : base) / 100,
  }))
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
      setPage(0)
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const [titleRows, partnerRows] = await Promise.all([
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
      ])
      setTitles(titleRows as unknown as Title[])
      setPartners(partnerRows.map((partner) => {
        const row = partner as { id: string; razao_social?: string; nome?: string }
        return { id: String(row.id), nome: String(payable ? row.razao_social ?? '' : row.nome ?? '') }
      }))
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
              supabase.from('erp_pedidos_compra').select('id,numero,total,fornecedor_id,data_pedido,status', { count: 'exact' }).eq('empresa_id', companyId).in('status', ['APROVADO','RECEBIMENTO_PARCIAL','RECEBIDO']).order('data_pedido', { ascending: false }).range(from, to),
            )
          : await fetchAllPages<unknown>((from, to) =>
              supabase.from('erp_pedidos_venda').select('id,numero,total,cliente_id,data_entrada,status', { count: 'exact' }).eq('empresa_id', companyId).eq('status','faturado').order('data_entrada', { ascending: false }).range(from, to),
            )
        if (!active) return
        setSources(resultRows.map((value) => {
          const source = value as { id: string; numero?: string | number | null; total?: number | null; fornecedor_id?: string; cliente_id?: string; data_pedido?: string | null; data_entrada?: string | null }
          return {
            id: String(source.id),
            numero: String(source.numero ?? source.id),
            total: Number(source.total ?? 0),
            partner_id: String(payable ? source.fornecedor_id ?? '' : source.cliente_id ?? ''),
            data: String(payable ? source.data_pedido ?? '' : source.data_entrada ?? '').slice(0,10) || null,
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
    return titles.filter(title => !needle || [
      title.descricao, title.documento, title.categoria, title.centro_custo, title.status,
      partners.find(partner => partner.id === title.parceiro_id)?.nome,
    ].some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(needle)))
  }, [partners, query, titles])
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

  const title = payable ? 'Contas a pagar' : 'Contas a receber'
  return <VendasLayout title={title} subtitle="Títulos • parcelas • baixas • integração com vendas e compras" onRefresh={()=>void load()} navSections={financeNav}><main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6">
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-sky-700">Financeiro / Tesouraria</p>
          <h1 className="text-2xl font-semibold text-[#123B50]">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">Títulos, parcelas e baixas persistidos por empresa. Nenhum pagamento é criado pela leitura do boleto.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile?.is_master && <label className="grid gap-1 text-xs font-semibold">Empresa
            <select value={selectedCompany} onChange={event => setSelectedCompany(event.target.value)} className="h-9 min-w-56 rounded-sm border border-slate-300 bg-white px-2">
              <option value="">Selecionar empresa</option>
              {companies.map(company => <option key={company.id} value={company.id}>{company.nome}</option>)}
            </select>
          </label>}
          <button type="button" onClick={() => void load()} disabled={loading || busy} className="inline-flex h-9 items-center gap-2 border border-slate-300 bg-white px-3 text-sm disabled:opacity-50"><RefreshCw size={15}/>Atualizar</button>
          <button type="button" onClick={openNew} disabled={!companyId || busy} className="inline-flex h-9 items-center gap-2 bg-[#123B50] px-3 text-sm font-semibold text-white disabled:opacity-50"><Plus size={15}/>Novo título</button>
        </div>
      </header>
      {error && <div role="alert" className="border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error}</div>}
      {message && <div role="status" className="border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">{message}</div>}
      {!companyId && profile?.is_master && <p className="border border-amber-300 bg-amber-50 p-3 text-sm">Selecione a empresa que o Master vai administrar.</p>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={payable ? ArrowUpCircle : ArrowDownCircle} label="Títulos" value={String(filtered.length)} />
        <Kpi icon={payable ? ArrowUpCircle : ArrowDownCircle} label="Saldo em aberto" value={currency(filtered.reduce((sum, row) => sum+(row.erp_financeiro_parcelas??[]).reduce((parcelSum, installment) => parcelSum+Number(installment.saldo),0),0))} />
        <Kpi icon={CalendarClock} label="Parcelas vencidas" value={String(filtered.reduce((sum,row) => sum+(row.erp_financeiro_parcelas??[]).filter(part => part.saldo>0&&part.vencimento<dateToday()).length,0))} />
        <Kpi icon={Users} label="Parceiros ativos" value={String(partners.length)} />
      </section>

      {showForm && <section className="border border-slate-300 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div><h2 className="font-semibold">{form.titleId ? 'Editar título manual' : sourceMode ? 'Gerar título do pedido' : 'Novo título manual'}</h2><p className="text-xs text-slate-600">O parcelamento soma exatamente o valor total; gravar não baixa nem liquida parcelas.</p></div>
          <button type="button" onClick={() => setShowForm(false)} aria-label="Fechar formulário" className="grid size-8 place-items-center border border-slate-300"><X size={16}/></button>
        </div>
        {!form.titleId && <div className="mb-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => { setSourceMode(false); setForm(current => ({ ...current, sourceId: '' })) }} className={`border px-3 py-2 text-xs ${!sourceMode?'border-sky-700 bg-sky-50 font-semibold':'border-slate-300'}`}>Lançamento manual</button>
          <button type="button" onClick={() => setSourceMode(true)} className={`border px-3 py-2 text-xs ${sourceMode?'border-sky-700 bg-sky-50 font-semibold':'border-slate-300'}`}>Vincular pedido de {payable?'compra':'venda'}</button>
        </div>}
        {sourceMode && !form.titleId && <label className="mb-3 grid gap-1 text-xs font-semibold">Pedido elegível
          <select value={form.sourceId} onChange={event => chooseSource(event.target.value)} className="h-10 border border-slate-300 px-2">
            <option value="">Selecionar pedido aprovado</option>
            {sources.map(source => <option key={source.id} value={source.id}>{source.descricao} · {currency(source.total)} · {source.data ?? 'sem data'}</option>)}
          </select>
        </label>}
        {payable && !form.titleId && !sourceMode && <section className="mb-3 border border-sky-200 bg-sky-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-sky-950"><Barcode size={17}/>Ler código de boleto (somente preenchimento)</div>
          <div className="flex flex-wrap gap-2">
            <input value={barcode} onChange={event => setBarcode(event.target.value)} placeholder="Linha digitável (47 dígitos) ou código de barras (44)" className="h-9 min-w-72 flex-1 border border-slate-300 bg-white px-2 text-sm"/>
            <button type="button" onClick={() => parseAndApplyBoleto(barcode)} className="h-9 border border-slate-300 bg-white px-3 text-xs font-semibold">Validar linha</button>
            <button type="button" onClick={() => void startScanner()} className="inline-flex h-9 items-center gap-1 bg-sky-800 px-3 text-xs font-semibold text-white"><Camera size={15}/>Abrir câmera</button>
          </div>
          {barcodeMessage && <p role="status" className="mt-2 text-xs text-emerald-800">{barcodeMessage}</p>}
          <p className="mt-1 text-[11px] text-slate-600">A leitura nunca registra pagamento: confira beneficiário, vencimento e valor antes de salvar o título.</p>
        </section>}
        <form onSubmit={event => void saveTitle(event)} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-xs font-semibold xl:col-span-2">Parceiro
            <select required value={form.partnerId} disabled={Boolean(form.sourceId)} onChange={event => setForm(current => ({...current,partnerId:event.target.value}))} className="h-10 border border-slate-300 bg-white px-2 disabled:bg-slate-100">
              <option value="">Selecionar {payable?'fornecedor':'cliente'}</option>
              {partners.map(partner => <option key={partner.id} value={partner.id}>{partner.nome}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold xl:col-span-2">Descrição
            <input required value={form.description} onChange={event => setForm(current => ({...current,description:event.target.value}))} className="h-10 border border-slate-300 px-2"/>
          </label>
          <label className="grid gap-1 text-xs font-semibold">Documento
            <input value={form.document} onChange={event => setForm(current => ({...current,document:event.target.value}))} className="h-10 border border-slate-300 px-2"/>
          </label>
          <label className="grid gap-1 text-xs font-semibold">Categoria
            <input value={form.category} onChange={event => setForm(current => ({...current,category:event.target.value}))} className="h-10 border border-slate-300 px-2"/>
          </label>
          <label className="grid gap-1 text-xs font-semibold">Centro de custo
            <input value={form.costCenter} onChange={event => setForm(current => ({...current,costCenter:event.target.value}))} className="h-10 border border-slate-300 px-2"/>
          </label>
          <label className="grid gap-1 text-xs font-semibold">Data de emissão
            <input required type="date" value={form.issueDate} onChange={event => setForm(current => ({...current,issueDate:event.target.value}))} className="h-10 border border-slate-300 px-2"/>
          </label>
          <label className="grid gap-1 text-xs font-semibold">Valor total
            <input required type="number" min="0.01" step="0.01" value={form.total} disabled={Boolean(form.sourceId)} onChange={event => setForm(current => ({...current,total:event.target.value}))} className="h-10 border border-slate-300 px-2 disabled:bg-slate-100"/>
          </label>
          <label className="grid gap-1 text-xs font-semibold">Número de parcelas
            <input required type="number" min="1" max="120" step="1" value={form.installments} onChange={event => setForm(current => ({...current,installments:event.target.value}))} className="h-10 border border-slate-300 px-2"/>
          </label>
          <label className="grid gap-1 text-xs font-semibold">Primeiro vencimento
            <input required type="date" value={form.firstDue} onChange={event => setForm(current => ({...current,firstDue:event.target.value}))} className="h-10 border border-slate-300 px-2"/>
          </label>
          <div className="flex items-end gap-2 xl:col-span-4">
            <button type="button" onClick={() => setShowForm(false)} className="h-10 border border-slate-300 px-4 text-sm">Cancelar</button>
            <button type="submit" disabled={busy} className="h-10 bg-sky-800 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy?'Salvando…':form.titleId?'Salvar alterações':'Gravar título e parcelas'}</button>
          </div>
        </form>
      </section>}

      <section className="border border-slate-200 bg-white">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 p-3">
          <label className="grid min-w-60 flex-1 gap-1 text-xs font-semibold">Buscar título
            <input value={query} onChange={event => { setQuery(event.target.value); setPage(0) }} className="h-9 border border-slate-300 px-2" placeholder="Parceiro, documento, categoria ou status"/>
          </label>
          <span className="text-xs text-slate-600">{filtered.length} título(s)</span>
        </div>
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
                  <td className="px-3 py-2"><div className="space-y-1">{installments.map(item=><div key={item.id} className="flex items-center gap-2 text-xs"><span>#{item.numero} · {item.vencimento} · {currency(item.valor)} · saldo {currency(item.saldo)} · {item.status}</span>{item.saldo>0&&<button type="button" onClick={()=>{setPayment({title,installment:item});setPaymentValue(item.saldo.toFixed(2));setPaymentMethod('')}} className="shrink-0 border border-sky-700 px-2 py-1 text-[11px] text-sky-900">Baixar</button>}</div>)}</div></td>
                  <td className="px-3 py-2 tabular-nums">{currency(title.valor_total)}<div className="text-xs text-slate-600">{currency(balance)} em aberto</div></td>
                  <td className="px-3 py-2">{title.status}</td>
                  <td className="px-3 py-2">{title.origem_tipo==='MANUAL'&&title.status==='ABERTO'&&balance===title.valor_total&&<button type="button" onClick={()=>editTitle(title)} aria-label="Editar título manual" className="inline-flex items-center gap-1 border border-slate-300 px-2 py-1 text-xs"><Edit3 size={13}/>Editar</button>}</td>
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
      {payment&&<div role="dialog" aria-modal="true" aria-labelledby="payment-title" className="fixed inset-0 z-[1000] grid place-items-center bg-slate-950/40 p-4">
        <form onSubmit={event=>void submitPayment(event)} className="w-full max-w-lg space-y-3 border border-slate-300 bg-white p-5 shadow-xl">
          <div className="flex items-start justify-between"><div><h2 id="payment-title" className="font-semibold">Registrar baixa</h2><p className="text-xs text-slate-600">Parcela #{payment.installment.numero} · saldo {currency(payment.installment.saldo)}</p></div><button type="button" onClick={()=>setPayment(null)} aria-label="Fechar baixa"><X size={17}/></button></div>
          <label className="grid gap-1 text-xs font-semibold">Valor recebido/pago
            <input required type="number" min="0.01" max={payment.installment.saldo} step="0.01" value={paymentValue} onChange={event=>setPaymentValue(event.target.value)} className="h-10 border border-slate-300 px-2"/>
          </label>
          <label className="grid gap-1 text-xs font-semibold">Data e hora da baixa
            <input required type="datetime-local" value={paymentDate} onChange={event=>setPaymentDate(event.target.value)} className="h-10 border border-slate-300 px-2"/>
          </label>
          <label className="grid gap-1 text-xs font-semibold">Forma de pagamento/recebimento
            <select required value={paymentMethod} onChange={event=>setPaymentMethod(event.target.value)} className="h-10 border border-slate-300 bg-white px-2"><option value="">Selecionar forma</option><option>PIX</option><option>TED/DOC</option><option>Boleto</option><option>Cartão</option><option>Dinheiro</option><option>Outro</option></select>
          </label>
          <label className="grid gap-1 text-xs font-semibold">Referência / comprovante
            <input value={paymentReference} onChange={event=>setPaymentReference(event.target.value)} className="h-10 border border-slate-300 px-2"/>
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
  return <article className="flex items-center gap-3 border border-slate-200 bg-white p-3"><Icon size={19} className="text-sky-800"/><div><span className="block text-xs text-slate-600">{label}</span><strong className="mt-1 block text-lg font-semibold text-[#123B50]">{value}</strong></div></article>
}
