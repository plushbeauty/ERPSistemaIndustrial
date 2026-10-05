import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import FiscalSidebar from '../components/fiscal/FiscalSidebar'

type Tab = 'gerais' | 'parceiros' | 'itens' | 'impostos' | 'transporte'
type TipoNfe = '' | 'entrada' | 'saida'
type Ambiente = '' | 'homologacao' | 'producao'

type Partner = {
  id?: string
  cnpjCpf: string
  inscricaoEstadual: string
  razaoSocial: string
  endereco: string
  bairro: string
  cep: string
  cidade: string
  uf: string
  email: string
}

type NFeItem = {
  id: string
  produtoId: string
  codigo: string
  descricao: string
  ncm: string
  cfop: string
  cstCsosn: string
  unidade: string
  quantidade: string
  valorUnitario: string
  desconto: string
  origem: string
  icmsAliquota: string
  ipiAliquota: string
  pisAliquota: string
  cofinsAliquota: string
  pisCst: string
  cofinsCst: string
  lote: string
  total: number
}

type NFeForm = {
  numero: string
  serie: string
  emissao: string
  saida: string
  natureza: string
  cfop: string
  tipo: TipoNfe
  ambiente: Ambiente
  parceiro: Partner
  valorFrete: string
  valorDesconto: string
  outrasDespesas: string
  baseIcms: string
  valorIcms: string
  baseIcmsSt: string
  valorSt: string
  valorIpi: string
  valorPis: string
  valorCofins: string
  modalidadeFrete: string
  transportadora: string
  placa: string
  ufTransportadora: string
  pesoLiquido: string
  pesoBruto: string
  volumes: string
}

type Product = {
  id: string
  codigo: string
  nome: string
  unidade: string | null
  ncm: string | null
  cfop_saida: string | null
  preco_venda: number | null
}

type Company = {
  id: string
  razao_social: string
  nome_fantasia: string | null
  cnpj: string
  endereco: string | null
  cidade: string | null
  uf: string | null
  cep: string | null
  telefone: string | null
  email: string | null
}
type FiscalConfig = {
  ambiente: string | null
  provedor: string | null
  regime_tributario: string | null
  habilitado_nfe: boolean | null
}

const nowLocal = () => {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16)
}

const initialPartner: Partner = {
  cnpjCpf: '',
  inscricaoEstadual: '',
  razaoSocial: '',
  endereco: '',
  bairro: '',
  cep: '',
  cidade: '',
  uf: '',
  email: '',
}

const initialForm: NFeForm = {
  numero: '',
  serie: '',
  emissao: nowLocal(),
  saida: '',
  natureza: '',
  cfop: '',
  tipo: '',
  ambiente: '',
  parceiro: initialPartner,
  valorFrete: '0',
  valorDesconto: '0',
  outrasDespesas: '0',
  baseIcms: '0',
  valorIcms: '0',
  baseIcmsSt: '0',
  valorSt: '0',
  valorIpi: '0',
  valorPis: '0',
  valorCofins: '0',
  modalidadeFrete: '',
  transportadora: '',
  placa: '',
  ufTransportadora: '',
  pesoLiquido: '0',
  pesoBruto: '0',
  volumes: '0',
}

const emptyItem = (): NFeItem => ({
  id: crypto.randomUUID(),
  produtoId: '',
  codigo: '',
  descricao: '',
  ncm: '',
  cfop: '',
  unidade: '',
  quantidade: '',
  valorUnitario: '',
  desconto: '0',
  cstCsosn: '',
  origem: '',
  icmsAliquota: '',
  ipiAliquota: '',
  pisAliquota: '',
  cofinsAliquota: '',
  pisCst: '',
  cofinsCst: '',
  lote: '',
  total: 0,
})

const numberValue = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const raw = String(value ?? '').trim()
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw
  const result = Number(normalized)
  return Number.isFinite(result) ? result : 0
}
const validNumber = (value: string): boolean => {
  const raw = value.trim()
  if (!raw) return false
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw
  return Number.isFinite(Number(normalized))
}

const digits = (value: string, max: number) => value.replace(/\D/g, '').slice(0, max)
const normalizedDocument = (value: string) => {
  const raw = value.toUpperCase().trim()
  return /^[A-Z0-9./()\s-]+$/.test(raw) ? raw.replace(/[./()\s-]/g, '') : ''
}
const validCpf = (value: string) => {
  const cpf = normalizedDocument(value)
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false
  const checkDigit = (length: number) => {
    const sum = cpf.slice(0, length).split('').reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0)
    const remainder = (sum * 10) % 11
    return remainder === 10 ? 0 : remainder
  }
  return checkDigit(9) === Number(cpf[9]) && checkDigit(10) === Number(cpf[10])
}
const cnpjCheckDigit = (base: string) => {
  const weights = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const sum = base.split('').reduce((total, char, index) => total + (char.charCodeAt(0) - 48) * weights[index], 0)
  const remainder = sum % 11
  return remainder < 2 ? 0 : 11 - remainder
}
const validCnpj = (value: string) => {
  const cnpj = normalizedDocument(value)
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj) || /^([A-Z0-9])\1{13}$/.test(cnpj)) return false
  return cnpjCheckDigit(cnpj.slice(0, 12)) === Number(cnpj[12]) &&
    cnpjCheckDigit(cnpj.slice(0, 13)) === Number(cnpj[13])
}
const validFiscalDocument = (value: string) => {
  const normalized = normalizedDocument(value)
  return normalized.length === 11 ? validCpf(normalized) : normalized.length === 14 && validCnpj(normalized)
}
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
const dateTime = (value: string) => value ? new Date(value).toISOString() : null

function Field({ label, value, onChange, className = '', type = 'text', maxLength, inputMode, required = false, readOnly = false }: {
  label: string; value: string; onChange: (value: string) => void; className?: string; type?: string; maxLength?: number; inputMode?: 'text' | 'numeric' | 'decimal' | 'email'; required?: boolean; readOnly?: boolean
}) {
  return <label className={className}><span className="nfe-label">{label}{required ? ' *' : ''}</span><input className="nfe-input" type={type} value={value} maxLength={maxLength} inputMode={inputMode} required={required} readOnly={readOnly} onChange={(event) => onChange(event.target.value)} /></label>
}

function SelectField({ label, value, onChange, children, className = '' }: {
  label: string; value: string; onChange: (value: string) => void; children: ReactNode; className?: string
}) {
  return <label className={className}><span className="nfe-label">{label}</span><select className="nfe-input" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></label>
}

export default function NFeEmissao() {
  const [tab, setTab] = useState<Tab>('gerais')
  const [form, setForm] = useState<NFeForm>(initialForm)
  const [items, setItems] = useState<NFeItem[]>([emptyItem()])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Partner[]>([])
  const [company, setCompany] = useState<Company | null>(null)
  const [fiscalConfig, setFiscalConfig] = useState<FiscalConfig | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [documentStatus, setDocumentStatus] = useState<'Rascunho' | 'Processando' | 'Autorizada' | 'Não confirmado'>('Rascunho')
  const [busy, setBusy] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const totalProdutos = useMemo(() => items.reduce((sum, item) => sum + item.total, 0), [items])
  const totalNota = Math.max(0, totalProdutos + numberValue(form.valorFrete) + numberValue(form.outrasDespesas) + numberValue(form.valorIpi) + numberValue(form.valorSt) - numberValue(form.valorDesconto))

  useEffect(() => { void loadReferenceData() }, [])

  async function loadReferenceData() {
    setLoadingData(true)
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error || !auth.data.user) throw new Error('Sessão não localizada.')
      const profile = await supabase.from('erp_usuarios').select('id,empresa_id').eq('auth_user_id', auth.data.user.id).eq('ativo', true).maybeSingle()
      if (profile.error || !profile.data?.empresa_id) throw new Error(profile.error?.message || 'Empresa do usuário não localizada.')
      const empresaId = String(profile.data.empresa_id)
      const [empresaResult, productResult, customerResult, fiscalConfigResult] = await Promise.all([
        supabase.from('erp_empresas').select('id,razao_social,nome_fantasia,cnpj,endereco,cidade,uf,cep,telefone,email').eq('id', empresaId).single(),
        supabase.from('erp_produtos').select('id,codigo,nome,unidade,ncm,cfop_saida,preco_venda').eq('empresa_id', empresaId).eq('ativo', true).order('nome').limit(500),
        supabase.from('erp_clientes').select('id,documento,nome,inscricao_estadual,endereco,numero,bairro,cep,cidade,estado,email').eq('empresa_id', empresaId).eq('ativo', true).order('nome').limit(500),
        supabase.from('erp_config_fiscal').select('ambiente,provedor,regime_tributario,habilitado_nfe').eq('empresa_id', empresaId).maybeSingle(),
      ])
      if (empresaResult.error) throw empresaResult.error
      if (productResult.error) throw productResult.error
      if (customerResult.error) throw customerResult.error
      if (fiscalConfigResult.error) throw fiscalConfigResult.error
      setCompany(empresaResult.data as Company)
      const fiscalConfig = fiscalConfigResult.data
      setFiscalConfig(fiscalConfig as FiscalConfig | null)
      if (fiscalConfig?.ambiente === 'homologacao' || fiscalConfig?.ambiente === 'producao') {
        setForm((current) => ({ ...current, ambiente: fiscalConfig.ambiente as Ambiente }))
      }
      setProducts((productResult.data ?? []) as Product[])
      setCustomers((customerResult.data ?? []).map((row) => ({
        id: String(row.id),
        cnpjCpf: String(row.documento ?? ''),
        inscricaoEstadual: String(row.inscricao_estadual ?? ''),
        razaoSocial: String(row.nome ?? ''),
        endereco: [row.endereco, row.numero].filter(Boolean).join(', '),
        bairro: String(row.bairro ?? ''),
        cep: String(row.cep ?? ''),
        cidade: String(row.cidade ?? ''),
        uf: String(row.estado ?? '').toUpperCase().slice(0, 2),
        email: String(row.email ?? ''),
      })))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar cadastros fiscais.')
    } finally {
      setLoadingData(false)
    }
  }

  const updateForm = <K extends keyof NFeForm>(key: K, value: NFeForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setMessage('')
    setError('')
  }

  const updatePartner = <K extends keyof Partner>(key: K, value: Partner[K]) => setForm((current) => ({ ...current, parceiro: { ...current.parceiro, [key]: value } }))

  const updateItem = <K extends keyof NFeItem>(id: string, key: K, value: NFeItem[K]) => {
    setItems((current) => current.map((item) => {
      if (item.id !== id) return item
      const next = { ...item, [key]: value }
      return { ...next, total: Math.max(0, numberValue(next.quantidade) * numberValue(next.valorUnitario) - numberValue(next.desconto)) }
    }))
    setError('')
  }

  const selectCustomer = (id: string) => {
    const customer = customers.find((item) => item.id === id)
    if (customer) updateForm('parceiro', customer)
  }

  const selectProduct = (id: string, itemId: string) => {
    const product = products.find((item) => item.id === id)
    if (!product) return
    setItems((current) => current.map((item) => item.id === itemId ? {
      ...item,
      produtoId: product.id,
      codigo: product.codigo,
      descricao: product.nome,
      ncm: digits(product.ncm ?? '', 8),
      cfop: digits(product.cfop_saida ?? form.cfop, 4),
      unidade: (product.unidade ?? '').toUpperCase(),
      valorUnitario: product.preco_venda === null ? '' : String(product.preco_venda),
      total: Math.max(0, numberValue(item.quantidade) * Number(product.preco_venda ?? 0) - numberValue(item.desconto)),
    } : item))
  }

  const validate = (): string | null => {
    if (!form.tipo) return 'Selecione se a operação da NF-e é de entrada ou saída.'
    if (!form.ambiente) return 'Selecione o ambiente fiscal. Nenhum ambiente é presumido.'
    if (!form.natureza.trim()) return 'Informe a natureza da operação.'
    if (digits(form.cfop, 4).length !== 4) return 'O CFOP deve possuir 4 dígitos.'
    if (!form.emissao || !Number.isFinite(new Date(form.emissao).getTime())) return 'Informe uma data e hora de emissão válidas.'
    if (!validFiscalDocument(form.parceiro.cnpjCpf)) return 'Informe um CPF/CNPJ válido, incluindo os dígitos verificadores.'
    if (!form.parceiro.razaoSocial.trim()) return 'Informe a razão social do destinatário.'
    if (!form.parceiro.endereco.trim() || !form.parceiro.bairro.trim() || digits(form.parceiro.cep, 8).length !== 8 || !form.parceiro.cidade.trim() || !/^[A-Za-z]{2}$/.test(form.parceiro.uf)) return 'Complete logradouro, bairro, CEP, município e UF do destinatário.'
    const valid = items.filter((item) => item.codigo.trim() && item.descricao.trim())
    if (!valid.length) return 'Inclua ao menos um item válido na NF-e.'
    for (const item of valid) {
      if (digits(item.ncm, 8).length !== 8) return 'Cada NCM informado deve possuir 8 dígitos.'
      if (digits(item.cfop, 4).length !== 4) return 'Cada CFOP de item deve possuir 4 dígitos.'
      if (!validNumber(item.quantidade) || numberValue(item.quantidade) <= 0) return 'A quantidade deve ser um número maior que zero.'
      if (!validNumber(item.valorUnitario) || numberValue(item.valorUnitario) < 0) return 'O valor unitário deve ser um número não negativo.'
      if (!validNumber(item.desconto) || numberValue(item.desconto) < 0 || numberValue(item.desconto) > numberValue(item.quantidade) * numberValue(item.valorUnitario)) return 'O desconto do item deve estar entre zero e o subtotal do item.'
      if (!item.unidade.trim()) return 'Informe a unidade de medida de cada item.'
      if (!/^[0-8]$/.test(digits(item.origem, 1))) return 'Informe a origem fiscal do item conforme o cadastro e a regra aplicável.'
    }
    return null
  }

  const reserveNumber = async () => {
    setBusy(true); setMessage(''); setError('')
    try {
      if (form.numero) throw new Error('Esta NF-e já possui número reservado.')
      const serie = Number(form.serie)
      if (!Number.isInteger(serie) || serie < 0 || serie > 999) throw new Error('Informe uma série entre 0 e 999.')
      const result = await supabase.rpc('erp_reservar_numero_nfe', { p_serie: serie })
      if (result.error || result.data === null) throw new Error(result.error?.message || 'Não foi possível reservar a numeração fiscal.')
      const numero = String(result.data)
      setForm((current) => ({ ...current, numero }))
      setMessage(`Número ${numero} reservado para a série ${serie}. A reserva foi registrada na auditoria fiscal.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao reservar número fiscal.')
    } finally {
      setBusy(false)
    }
  }

  const saveDraft = async (keepBusy = false): Promise<string | null> => {
    setBusy(true); setMessage(''); setError('')
    try {
      const validation = validate()
      if (validation) throw new Error(validation)
      const auth = await supabase.auth.getUser()
      if (auth.error || !auth.data.user) throw new Error('Sessão de autenticação não localizada.')
      const profile = await supabase.from('erp_usuarios').select('id,empresa_id').eq('auth_user_id', auth.data.user.id).eq('ativo', true).maybeSingle()
      if (profile.error || !profile.data?.empresa_id) throw new Error(profile.error?.message || 'Empresa da sessão não localizada.')
      const empresaId = String(profile.data.empresa_id)
      const payload = {
        empresa_id: empresaId,
        tipo: form.tipo === 'entrada' ? 'NF-e Entrada' : 'NF-e',
        modelo: '55',
        serie: form.serie,
        numero: form.numero || null,
        status: 'Rascunho',
        natureza_operacao: form.natureza.trim(),
        cfop: digits(form.cfop, 4),
        ambiente: form.ambiente,
        data_emissao: dateTime(form.emissao),
        data_saida: dateTime(form.saida),
        destinatario_nome: form.parceiro.razaoSocial.trim(),
        destinatario_documento: form.parceiro.cnpjCpf.trim(),
        destinatario_ie: form.parceiro.inscricaoEstadual.trim() || null,
        destinatario_email: form.parceiro.email.trim() || null,
        destinatario_endereco: form.parceiro.endereco.trim() || null,
        destinatario_bairro: form.parceiro.bairro.trim() || null,
        destinatario_cep: form.parceiro.cep.trim() || null,
        destinatario_cidade: form.parceiro.cidade.trim() || null,
        destinatario_uf: form.parceiro.uf.trim().toUpperCase() || null,
        modalidade_frete: form.modalidadeFrete,
        transportadora: form.transportadora.trim() || null,
        placa: form.placa.trim().toUpperCase() || null,
        uf_transportadora: form.ufTransportadora.trim().toUpperCase() || null,
        peso_liquido: numberValue(form.pesoLiquido),
        peso_bruto: numberValue(form.pesoBruto),
        volumes: numberValue(form.volumes),
        valor_produtos: totalProdutos,
        valor_frete: numberValue(form.valorFrete),
        valor_outras_despesas: numberValue(form.outrasDespesas),
        valor_desconto: numberValue(form.valorDesconto),
        base_calculo_icms: numberValue(form.baseIcms),
        valor_icms: numberValue(form.valorIcms),
        base_icms_st: numberValue(form.baseIcmsSt),
        valor_icms_st: numberValue(form.valorSt),
        valor_ipi: numberValue(form.valorIpi),
        valor_pis: numberValue(form.valorPis),
        valor_cofins: numberValue(form.valorCofins),
        valor_total: totalNota,
        valor_liquido: totalNota,
      }
      const rows = items.filter((item) => item.codigo.trim() && item.descricao.trim()).map((item, index) => ({
        produto_id: item.produtoId || null,
        item_numero: index + 1,
        codigo_produto: item.codigo.trim(),
        descricao_produto: item.descricao.trim(),
        ncm: digits(item.ncm, 8),
        cfop: digits(item.cfop, 4),
        unidade: item.unidade.trim().slice(0, 6),
        quantidade: numberValue(item.quantidade),
        valor_unitario: numberValue(item.valorUnitario),
        valor_total: item.total,
        valor_desconto: numberValue(item.desconto),
        lote: item.lote.trim() || null,
        origem: digits(item.origem, 1) || null,
        cst_csosn: item.cstCsosn.trim() || null,
        icms_aliquota: item.icmsAliquota.trim() ? numberValue(item.icmsAliquota) : null,
        ipi_aliquota: item.ipiAliquota.trim() ? numberValue(item.ipiAliquota) : null,
        pis_aliquota: item.pisAliquota.trim() ? numberValue(item.pisAliquota) : null,
        cofins_aliquota: item.cofinsAliquota.trim() ? numberValue(item.cofinsAliquota) : null,
        pis_cst: item.pisCst.trim() || null,
        cofins_cst: item.cofinsCst.trim() || null,
      }))
      const rpc = await supabase.rpc('erp_salvar_rascunho_nfe', {
        p_documento_id: documentId,
        p_documento: payload,
        p_itens: rows,
      })
      if (rpc.error || !rpc.data) throw new Error(rpc.error?.message || 'Não foi possível gravar o rascunho fiscal.')
      const id = String(rpc.data)
      setDocumentId(id)
      setDocumentStatus('Rascunho')
      setMessage('NF-e gravada como rascunho de forma transacional. Nenhuma transmissão à SEFAZ foi executada.')
      return id
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar a NF-e.')
      return null
    } finally {
      if (!keepBusy) setBusy(false)
    }
  }

  const transmit = async () => {
    const validation = validate()
    if (validation) {
      setError(validation)
      setMessage('')
      return
    }
    if (form.tipo !== 'saida') {
      setError('Esta integração transmite somente NF-e de saída. Para NF-e de entrada, use o fluxo de importação e recebimento de XML.')
      setMessage('')
      return
    }
    if (!form.numero) {
      setError('Reserve uma numeração fiscal antes de solicitar transmissão.')
      setMessage('')
      return
    }
    if (!window.confirm(`Solicitar transmissão da NF-e ${form.numero}, série ${form.serie}, no ambiente ${form.ambiente}? A autorização só será exibida após confirmação verificável do integrador.`)) return
    setBusy(true)
    setError('')
    setMessage('Preparando transmissão fiscal...')
    let submittedDocumentId: string | null = null
    try {
      const id = await saveDraft(true)
      if (!id) return
      submittedDocumentId = id
      const result = await supabase.functions.invoke('emitir-nfe', { body: { documento_id: id } })
      if (result.error) throw result.error
      const data = result.data as { ok?: boolean; status?: string; error?: string; chave_acesso?: string; protocolo_autorizacao?: string; xml_storage_path?: string }
      if (data?.status === 'Processando') {
        setDocumentStatus('Processando')
        setMessage(data.error || `Solicitação aceita pelo integrador. Status atual: ${data.status}. A autorização ainda não foi confirmada.`)
        return
      }
      if (data?.ok !== true) throw new Error(data?.error || 'O integrador não confirmou a solicitação fiscal.')
      if (data.status !== 'Autorizada') throw new Error('O integrador retornou um estado fiscal não reconhecido; a autorização não foi confirmada nesta tela.')
      if (!/^\d{44}$/.test(data.chave_acesso ?? '') || !data.protocolo_autorizacao?.trim() || !data.xml_storage_path?.trim()) {
        throw new Error('A resposta não confirmou chave de acesso, protocolo e XML armazenado; a autorização não foi confirmada nesta tela.')
      }
      setDocumentStatus('Autorizada')
      setMessage(`NF-e autorizada. Protocolo: ${data.protocolo_autorizacao}.`)
    } catch (cause) {
      const failure = cause instanceof Error ? cause.message : 'Falha na transmissão da NF-e.'
      if (submittedDocumentId) {
        const persisted = await supabase.from('erp_documentos_fiscais')
          .select('status,chave_acesso,xml_storage_path')
          .eq('id', submittedDocumentId).maybeSingle()
        const persistedInvoice = await supabase.from('erp_notas_fiscais')
          .select('status,chave_acesso,protocolo_autorizacao,xml_autorizado_path')
          .eq('documento_id', submittedDocumentId).maybeSingle()
        if (persisted.error || persistedInvoice.error) {
          setDocumentStatus('Não confirmado')
          setError(`${failure} Não foi possível confirmar o estado persistido; consulte a carteira fiscal antes de tentar novamente.`)
        } else if (persisted.data?.status === 'Processando') {
          setDocumentStatus('Processando')
          setError(`${failure} O documento permanece em processamento; consulte as pendências antes de qualquer nova tentativa.`)
        } else if (
          persisted.data?.status === 'Autorizada' &&
          persistedInvoice.data?.status === 'Autorizada' &&
          /^\d{44}$/.test(persistedInvoice.data.chave_acesso ?? '') &&
          Boolean(persistedInvoice.data.protocolo_autorizacao?.trim()) &&
          Boolean(persistedInvoice.data.xml_autorizado_path?.trim()) &&
          persisted.data.chave_acesso === persistedInvoice.data.chave_acesso &&
          persisted.data.xml_storage_path === persistedInvoice.data.xml_autorizado_path
        ) {
          setDocumentStatus('Autorizada')
          setError(`${failure} O banco registra chave, protocolo e XML compatíveis; consulte a carteira para conferir os documentos persistidos.`)
        } else if (persisted.data?.status === 'Rascunho') {
          setDocumentStatus('Rascunho')
          setError(failure)
        } else {
          setDocumentStatus('Não confirmado')
          setError(`${failure} O estado fiscal retornado não é reconhecido; consulte a carteira antes de tentar novamente.`)
        }
      } else {
        setError(failure)
      }
      setMessage('')
    } finally {
      setBusy(false)
    }
  }

  const tabs: Array<[Tab, string]> = [['gerais', '1. Dados Gerais'], ['parceiros', '2. Emitente / Destinatário'], ['itens', '3. Itens da Nota'], ['impostos', '4. Tributação Detalhada'], ['transporte', '5. Transporte / Totais']]

  return <div className="min-h-screen bg-slate-50"><FiscalSidebar/><main className="nfe-page erp-dense fiscal-workspace">
    <header className="nfe-header"><div><span className="nfe-eyebrow">FISCAL • NF-e MODELO 55</span><h1>Emissão de Nota Fiscal Eletrônica</h1><p>Documento fiscal persistido no ERP com trilha de rascunho. A transmissão depende de confirmação verificável do integrador.</p></div><div className="nfe-header-actions"><span className="nfe-status">{documentStatus === 'Rascunho' ? (documentId ? 'RASCUNHO SALVO' : 'NOVO RASCUNHO') : documentStatus === 'Não confirmado' ? 'ESTADO NÃO CONFIRMADO' : documentStatus.toUpperCase()}</span><button className="nfe-primary" type="button" onClick={() => void saveDraft()} disabled={busy || loadingData || documentStatus !== 'Rascunho'}>{busy ? 'Salvando…' : 'Salvar rascunho'}</button><button className="nfe-action transmit" type="button" onClick={() => void transmit()} disabled={busy || loadingData || documentStatus !== 'Rascunho'}>{busy ? 'Processando…' : 'Solicitar transmissão'}</button></div></header>
    {error && <div className="nfe-alert nfe-error" role="alert">{error}</div>}
    {message && <div className="nfe-alert nfe-success" role="status">{message}</div>}
    {!loadingData && <div className="nfe-alert" role="status">{fiscalConfig?.habilitado_nfe && fiscalConfig?.provedor?.toLowerCase() === 'notaas' && fiscalConfig?.regime_tributario ? `Configuração fiscal cadastrada · ambiente ${fiscalConfig.ambiente ?? 'pendente'} · regime ${fiscalConfig.regime_tributario}. O segredo e a resposta do integrador são validados no servidor; autorização depende de protocolo e XML compatíveis.` : 'INTEGRAÇÃO EXTERNA PENDENTE: confira provedor, ambiente, regime tributário, habilitação e segredo server-side antes de transmitir.'}</div>}
    <nav className="nfe-tabs" aria-label="Etapas da NF-e">{tabs.map(([id, label]) => <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</nav>
    <fieldset className="nfe-fields" disabled={documentStatus !== 'Rascunho'}>
    {tab === 'gerais' && <section className="nfe-card"><div className="nfe-grid">
      <Field label="número reservado" value={form.numero} onChange={() => undefined} className="erp-field-number" inputMode="numeric" readOnly />
      <button className="nfe-secondary erp-form-action" type="button" onClick={() => void reserveNumber()} disabled={busy || Boolean(form.numero) || !form.serie}>Reservar número</button>
      <Field label="série" value={form.serie} onChange={(v) => updateForm('serie', digits(v, 3))} className="erp-field-series" inputMode="numeric" readOnly={Boolean(form.numero)} />
      <Field label="emissão" type="datetime-local" value={form.emissao} onChange={(v) => updateForm('emissao', v)} className="erp-field-datetime" />
      <Field label="saída" type="datetime-local" value={form.saida} onChange={(v) => updateForm('saida', v)} className="erp-field-datetime" />
      <Field label="natureza da operação" value={form.natureza} onChange={(v) => updateForm('natureza', v)} className="wide-field erp-field-description" required />
      <Field label="CFOP" value={form.cfop} onChange={(v) => updateForm('cfop', digits(v, 4))} className="erp-field-cfop" maxLength={4} inputMode="numeric" required />
      <SelectField label="tipo" value={form.tipo} onChange={(v) => updateForm('tipo', v as TipoNfe)} className="erp-field-series"><option value="">Selecione</option><option value="saida">Saída</option><option value="entrada">Entrada</option></SelectField>
      <SelectField label="ambiente" value={form.ambiente} onChange={(v) => updateForm('ambiente', v as Ambiente)} className="erp-field-md"><option value="">Selecione</option><option value="homologacao">Homologação</option><option value="producao">Produção</option></SelectField>
    </div></section>}
    {tab === 'parceiros' && <section className="nfe-card"><div className="partner-choice"><label className="customer-select"><span className="nfe-label">selecionar destinatário cadastrado</span><select className="nfe-input" value={form.parceiro.id || ''} onChange={(e) => selectCustomer(e.target.value)}><option value="">Digitar manualmente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.razaoSocial} — {customer.cnpjCpf || 'sem documento'}</option>)}</select></label></div><div className="issuer-box"><span>emitente</span><strong>{company?.nome_fantasia || company?.razao_social || 'Empresa da sessão'}</strong><small>{company?.cnpj || 'CNPJ não cadastrado'} • {company?.endereco || 'Endereço não cadastrado'}</small></div><div className="nfe-grid">
      <Field label="CNPJ / CPF destinatário" value={form.parceiro.cnpjCpf} onChange={(v) => updatePartner('cnpjCpf', v)} className="erp-field-cnpj" required />
      <Field label="inscrição estadual" value={form.parceiro.inscricaoEstadual} onChange={(v) => updatePartner('inscricaoEstadual', v)} className="erp-field-ie" />
      <Field label="razão social / nome" value={form.parceiro.razaoSocial} onChange={(v) => updatePartner('razaoSocial', v)} className="wide-field erp-field-name" required />
      <Field label="endereço" value={form.parceiro.endereco} onChange={(v) => updatePartner('endereco', v)} className="wide-field erp-field-address" />
      <Field label="bairro" value={form.parceiro.bairro} onChange={(v) => updatePartner('bairro', v)} />
      <Field label="CEP" value={form.parceiro.cep} onChange={(v) => updatePartner('cep', v)} className="erp-field-cep" />
      <Field label="cidade" value={form.parceiro.cidade} onChange={(v) => updatePartner('cidade', v)} />
      <Field label="UF" value={form.parceiro.uf.toUpperCase().slice(0, 2)} onChange={(v) => updatePartner('uf', v.toUpperCase().slice(0, 2))} className="erp-field-uf" maxLength={2} />
      <Field label="e-mail" value={form.parceiro.email} onChange={(v) => updatePartner('email', v)} className="wide-field" type="email" />
    </div></section>}
    {tab === 'itens' && <section className="nfe-card nfe-items-card">
      <div className="nfe-card-title">
        <div><h2>Itens da Nota</h2><p>Campos atualmente persistidos para o item fiscal; demais componentes tributários dependem do schema e do integrador.</p></div>
        <button className="nfe-secondary" type="button" onClick={() => setItems((current) => [...current, emptyItem()])}>+ Adicionar item</button>
      </div>
      <div className="nfe-table-wrap">
        <table className="nfe-table">
          <colgroup><col style={{width:54}}/><col style={{width:220}}/><col style={{width:120}}/><col style={{width:280}}/><col style={{width:130}}/><col style={{width:110}}/><col style={{width:120}}/><col style={{width:75}}/><col style={{width:160}}/><col style={{width:170}}/><col style={{width:170}}/><col style={{width:140}}/><col style={{width:75}}/><col style={{width:130}}/><col style={{width:130}}/><col style={{width:130}}/><col style={{width:130}}/><col style={{width:120}}/><col style={{width:120}}/><col style={{width:160}}/><col style={{width:44}}/></colgroup>
          <thead><tr><th>item</th><th>produto</th><th>código</th><th>descrição</th><th>NCM</th><th>CFOP</th><th>CST/CSOSN</th><th>UN</th><th>qtd.</th><th>unit. (R$)</th><th>desc. (R$)</th><th>total item sem tributos (R$)</th><th>orig.</th><th>ICMS %</th><th>IPI %</th><th>PIS %</th><th>COFINS %</th><th>PIS CST</th><th>COFINS CST</th><th>lote</th><th /></tr></thead>
          <tbody>
            {items.map((item, index) => <tr key={item.id}>
              <td className="nfe-number">{index + 1}</td>
              <td><select className="nfe-table-input" value={item.produtoId} onChange={(e) => selectProduct(e.target.value, item.id)}><option value="">Manual</option>{products.map((product) => <option key={product.id} value={product.id}>{product.codigo ? `${product.codigo} — ${product.nome}` : product.nome}</option>)}</select></td>
              <td><input className="nfe-table-input" value={item.codigo} onChange={(e) => updateItem(item.id, 'codigo', e.target.value)} /></td>
              <td><input className="nfe-table-input" value={item.descricao} onChange={(e) => updateItem(item.id, 'descricao', e.target.value)} /></td>
              <td><input className="nfe-table-input" maxLength={8} inputMode="numeric" value={item.ncm} onChange={(e) => updateItem(item.id, 'ncm', digits(e.target.value, 8))} /></td>
              <td><input className="nfe-table-input" maxLength={4} inputMode="numeric" value={item.cfop} onChange={(e) => updateItem(item.id, 'cfop', digits(e.target.value, 4))} /></td>
              <td><input className="nfe-table-input" maxLength={4} value={item.cstCsosn} onChange={(e) => updateItem(item.id, 'cstCsosn', e.target.value.toUpperCase().slice(0, 4))} /></td>
              <td><input className="nfe-table-input" maxLength={6} value={item.unidade} onChange={(e) => updateItem(item.id, 'unidade', e.target.value.toUpperCase())} /></td>
              <td><input className="nfe-table-input nfe-right" inputMode="decimal" value={item.quantidade} onChange={(e) => updateItem(item.id, 'quantidade', e.target.value)} /></td>
              <td><input className="nfe-table-input nfe-right" inputMode="decimal" value={item.valorUnitario} onChange={(e) => updateItem(item.id, 'valorUnitario', e.target.value)} /></td>
              <td><input className="nfe-table-input nfe-right" inputMode="decimal" value={item.desconto} onChange={(e) => updateItem(item.id, 'desconto', e.target.value)} /></td>
              <td className="nfe-right nfe-item-total" aria-label={`Total do item ${index + 1} sem tributos`}>{validNumber(item.quantidade) && numberValue(item.quantidade) > 0 && validNumber(item.valorUnitario) && validNumber(item.desconto) ? money(item.total) : '—'}</td>
              <td><input className="nfe-table-input" maxLength={1} inputMode="numeric" value={item.origem} onChange={(e) => updateItem(item.id, 'origem', digits(e.target.value, 1))} /></td>
              <td><input className="nfe-table-input nfe-right" inputMode="decimal" value={item.icmsAliquota} onChange={(e) => updateItem(item.id, 'icmsAliquota', e.target.value)} /></td>
              <td><input className="nfe-table-input nfe-right" inputMode="decimal" value={item.ipiAliquota} onChange={(e) => updateItem(item.id, 'ipiAliquota', e.target.value)} /></td>
              <td><input className="nfe-table-input nfe-right" inputMode="decimal" value={item.pisAliquota} onChange={(e) => updateItem(item.id, 'pisAliquota', e.target.value)} /></td>
              <td><input className="nfe-table-input nfe-right" inputMode="decimal" value={item.cofinsAliquota} onChange={(e) => updateItem(item.id, 'cofinsAliquota', e.target.value)} /></td>
              <td><input className="nfe-table-input" maxLength={3} value={item.pisCst} onChange={(e) => updateItem(item.id, 'pisCst', e.target.value.toUpperCase().slice(0, 3))} /></td>
              <td><input className="nfe-table-input" maxLength={3} value={item.cofinsCst} onChange={(e) => updateItem(item.id, 'cofinsCst', e.target.value.toUpperCase().slice(0, 3))} /></td>
              <td><input className="nfe-table-input" value={item.lote} onChange={(e) => updateItem(item.id, 'lote', e.target.value)} /></td>
              <td><button className="nfe-remove" type="button" onClick={() => setItems((current) => current.filter((row) => row.id !== item.id))} aria-label={`Remover item ${index + 1}`} title={`Remover item ${index + 1}`}>×</button></td>
            </tr>)}
            {items.length === 0 && <tr><td colSpan={21} className="p-4 text-center">Nenhum item. Use “Adicionar item” para incluir produtos na NF-e.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="nfe-total-strip"><span>{items.filter((item) => item.codigo.trim() && item.descricao.trim()).length} item(ns) válido(s)</span><strong>Total dos produtos {money(totalProdutos)}</strong></div>
    </section>}
    {tab === 'impostos' && <section className="nfe-card">
      <div className="nfe-grid">
        <Field label="base ICMS" value={form.baseIcms} onChange={(v) => updateForm('baseIcms', v)} className="erp-field-money" inputMode="decimal" />
        <Field label="valor ICMS" value={form.valorIcms} onChange={(v) => updateForm('valorIcms', v)} className="erp-field-money" inputMode="decimal" />
        <Field label="base ICMS ST" value={form.baseIcmsSt} onChange={(v) => updateForm('baseIcmsSt', v)} className="erp-field-money" inputMode="decimal" />
        <Field label="valor ICMS ST" value={form.valorSt} onChange={(v) => updateForm('valorSt', v)} className="erp-field-money" inputMode="decimal" />
        <Field label="valor IPI" value={form.valorIpi} onChange={(v) => updateForm('valorIpi', v)} className="erp-field-money" inputMode="decimal" />
        <Field label="valor PIS" value={form.valorPis} onChange={(v) => updateForm('valorPis', v)} className="erp-field-money" inputMode="decimal" />
        <Field label="valor COFINS" value={form.valorCofins} onChange={(v) => updateForm('valorCofins', v)} className="erp-field-money" inputMode="decimal" />
      </div>
      <div className="nfe-summary-grid">
        <article><span>produtos</span><strong>{money(totalProdutos)}</strong></article>
        <article><span>frete</span><strong>{money(numberValue(form.valorFrete))}</strong></article>
        <article><span>desconto</span><strong>{money(numberValue(form.valorDesconto))}</strong></article>
        <article><span>total provisório NF-e</span><strong>{money(totalNota)}</strong></article>
      </div>
      <p role="note" className="mt-2 text-xs text-amber-800">Total provisório calculado localmente para o rascunho. Não substitui a totalização tributária do provedor nem representa autorização fiscal.</p>
    </section>}
    {tab === 'transporte' && <section className="nfe-card">
      <div className="nfe-grid">
        <SelectField label="modalidade frete" value={form.modalidadeFrete} onChange={(v) => updateForm('modalidadeFrete', v)} className="erp-field-md"><option value="">Selecione a modalidade</option><option value="0">CIF</option><option value="1">FOB</option><option value="9">Sem frete</option></SelectField>
        <Field label="transportadora" value={form.transportadora} onChange={(v) => updateForm('transportadora', v)} className="wide-field erp-field-description" />
        <Field label="placa" value={form.placa.toUpperCase()} onChange={(v) => updateForm('placa', v.toUpperCase().slice(0, 8))} className="erp-field-series" />
        <Field label="UF" value={form.ufTransportadora.toUpperCase().slice(0, 2)} onChange={(v) => updateForm('ufTransportadora', v.toUpperCase().slice(0, 2))} className="erp-field-uf" maxLength={2} />
        <Field label="peso líquido" value={form.pesoLiquido} onChange={(v) => updateForm('pesoLiquido', v)} className="erp-field-quantity" inputMode="decimal" />
        <Field label="peso bruto" value={form.pesoBruto} onChange={(v) => updateForm('pesoBruto', v)} className="erp-field-quantity" inputMode="decimal" />
        <Field label="volumes" value={form.volumes} onChange={(v) => updateForm('volumes', v)} className="erp-field-number" inputMode="numeric" />
        <Field label="frete (R$)" value={form.valorFrete} onChange={(v) => updateForm('valorFrete', v)} className="erp-field-money" inputMode="decimal" />
        <Field label="desconto (R$)" value={form.valorDesconto} onChange={(v) => updateForm('valorDesconto', v)} className="erp-field-money" inputMode="decimal" />
        <Field label="outras despesas" value={form.outrasDespesas} onChange={(v) => updateForm('outrasDespesas', v)} className="erp-field-money" inputMode="decimal" />
      </div>
      <div className="nfe-footer-total">
        <div><span>Total produtos</span><strong>{money(totalProdutos)}</strong></div>
        <div><span>Total provisório NF-e</span><strong>{money(totalNota)}</strong></div>
      </div>
      <p role="note" className="mt-2 text-xs text-amber-800">Total provisório calculado localmente para o rascunho. Não substitui a totalização tributária do provedor nem representa autorização fiscal.</p>
    </section>}
    </fieldset>
    <style>{`.nfe-page{min-height:calc(100vh - 70px);background:#F4FBFD;color:#123B50;padding:18px 24px 42px;font-family:Inter,Roboto,Arial,sans-serif;box-sizing:border-box}.nfe-header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;background:#123B50;color:#fff;border-radius:10px;padding:17px 18px;margin-bottom:12px}.nfe-eyebrow{font-size:10px;letter-spacing:.13em;font-weight:950;color:#48B7C7}.nfe-header h1{margin:4px 0;font-size:24px}.nfe-header p{margin:4px 0 0;color:#D4E9EE;font-size:12px}.nfe-header-actions{display:flex;align-items:center;gap:10px}.nfe-status{font-size:10px;font-weight:950;color:#BFE6EC;white-space:nowrap}.nfe-primary,.nfe-secondary,.nfe-remove{border:0;cursor:pointer;font-weight:900}.nfe-primary{background:#2D8DB8;color:#fff;border-radius:7px;padding:10px 14px}.nfe-secondary{background:#2D8DB8;color:#fff;border-radius:7px;padding:9px 12px}.nfe-primary:disabled{opacity:.55;cursor:not-allowed}.nfe-alert{padding:9px 11px;border-radius:7px;margin-bottom:10px;font-size:12px;font-weight:800}.nfe-error{background:#FCEBEC;border:1px solid #E6B1B5;color:#8B3038}.nfe-success{background:#E8F7F1;border:1px solid #A9D9C3;color:#176C4E}.nfe-tabs{display:flex;gap:3px;background:#fff;border:1px solid #CFE1E7;border-radius:9px;padding:4px;margin-bottom:10px;overflow:auto}.nfe-tabs button{border:0;background:transparent;color:#526C77;padding:9px 12px;border-radius:6px;white-space:nowrap;font-size:11px;font-weight:900;cursor:pointer}.nfe-tabs button.active{background:#2D8DB8;color:#fff}.nfe-card{background:#fff;border:1px solid #D4E4EA;border-radius:9px;padding:14px}.nfe-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:10px}.nfe-grid>label{grid-column:span 3;min-width:0}.nfe-grid .wide-field{grid-column:span 6}.nfe-label{display:block;font-size:9px;text-transform:lowercase;font-weight:950;color:#536C77;margin:0 0 3px 1px}.nfe-input{width:100%;box-sizing:border-box;min-height:34px;border:1px solid #B9D2DA;border-radius:5px;background:#F9FCFD;color:#123B50;padding:6px 8px;outline:none;font-size:12px}.nfe-input:focus{border-color:#48B7C7;box-shadow:0 0 0 2px rgba(72,183,199,.14)}.compact-70{grid-column:span 1!important;max-width:70px}.compact-80{grid-column:span 1!important;max-width:80px}.compact-90{grid-column:span 1!important;max-width:90px}.compact-100{grid-column:span 1!important;max-width:100px}.compact-130{grid-column:span 2!important;max-width:130px}.compact-150{grid-column:span 2!important;max-width:150px}.compact-180{grid-column:span 2!important;max-width:180px}.partner-choice{display:grid;grid-template-columns:minmax(300px,520px);margin-bottom:10px}.issuer-box{background:#F4FBFD;border:1px solid #D4E4EA;border-left:4px solid #48B7C7;border-radius:7px;padding:9px 11px;margin-bottom:11px}.issuer-box span{display:block;font-size:9px;font-weight:950;text-transform:uppercase;color:#58717C}.issuer-box strong{display:block;font-size:13px;margin-top:2px}.issuer-box small{display:block;color:#687F89;margin-top:2px;font-size:10px}.nfe-card-title{display:flex;justify-content:space-between;gap:14px;align-items:center;margin-bottom:10px}.nfe-card-title h2{margin:0;font-size:17px}.nfe-card-title p{margin:3px 0 0;color:#607985;font-size:11px}.nfe-table-wrap{overflow:auto}.nfe-table{width:100%;border-collapse:collapse;min-width:1350px}.nfe-table th{background:#123B50;color:#fff;text-align:left;font-size:9px;text-transform:uppercase;padding:7px 6px;white-space:nowrap}.nfe-table td{border-bottom:1px solid #E1ECEF;padding:4px}.nfe-table td input,.nfe-table td select{width:100%;box-sizing:border-box;min-height:29px;border:1px solid #C7D9DF;border-radius:4px;padding:4px 5px;font-size:11px}.w-code{width:85px}.w-description{width:250px}.w-ncm{width:72px}.w-cfop{width:55px}.w-unit{width:45px}.w-qty{width:65px}.w-price{width:82px}.w-total{width:100px}.nfe-number{text-align:right;font-weight:900;white-space:nowrap}.nfe-remove{background:#FCEBEC;color:#9D3039;border-radius:4px;width:27px;height:27px;font-size:17px}.nfe-total-strip{display:flex;justify-content:flex-end;gap:14px;padding-top:10px;font-size:13px}.nfe-total-strip strong{font-size:16px}.nfe-summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}.nfe-summary-grid article,.nfe-footer-total>div{background:#F4FBFD;border:1px solid #D4E4EA;border-radius:7px;padding:10px}.nfe-summary-grid span,.nfe-footer-total span{display:block;color:#607985;font-size:9px;text-transform:uppercase;font-weight:900}.nfe-summary-grid strong,.nfe-footer-total strong{display:block;font-size:16px;margin-top:4px}.nfe-footer-total{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}.nfe-footer-total>div{min-width:170px}.nfe-footer-total>div:last-child{border-color:#48B7C7;background:#EAF7FA}@media(max-width:900px){.nfe-header{flex-direction:column}.nfe-header-actions{width:100%;justify-content:space-between}.nfe-grid{grid-template-columns:repeat(6,minmax(0,1fr))}.nfe-grid>label{grid-column:span 3}.nfe-grid .wide-field{grid-column:span 6}.nfe-summary-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.nfe-page{padding:10px}.nfe-grid{grid-template-columns:1fr 1fr}.nfe-grid>label,.nfe-grid .wide-field{grid-column:span 2!important;max-width:none}.nfe-summary-grid{grid-template-columns:1fr}.nfe-footer-total{flex-direction:column}.nfe-footer-total>div{min-width:0}}.nfe-page input.nfe-input,.nfe-page select.nfe-input,.nfe-page input.nfe-table-input,.nfe-page select.nfe-table-input{height:34px!important;min-height:34px!important;font-size:11px!important;line-height:18px!important;box-sizing:border-box}.nfe-page button.nfe-primary,.nfe-page button.nfe-secondary,.nfe-page button.nfe-remove{min-height:32px!important;height:32px!important;font-size:10px!important}.nfe-grid{display:flex!important;flex-wrap:wrap!important;align-items:flex-end!important;gap:7px!important}.nfe-grid>label{grid-column:auto!important;min-width:0}.nfe-grid .wide-field{grid-column:auto!important;flex:0 0 430px!important}.nfe-grid .compact-70{flex:0 0 70px!important;max-width:none!important}.nfe-grid .compact-80{flex:0 0 80px!important;max-width:none!important}.nfe-grid .compact-90{flex:0 0 90px!important;max-width:none!important}.nfe-grid .compact-100{flex:0 0 100px!important;max-width:none!important}.nfe-grid .compact-130{flex:0 0 130px!important;max-width:none!important}.nfe-grid .compact-150{flex:0 0 150px!important;max-width:none!important}.nfe-grid .compact-180{flex:0 0 180px!important;max-width:none!important}.nfe-table{table-layout:fixed;min-width:1730px!important}.nfe-table th{height:34px!important;padding:5px 6px!important}.nfe-table td{height:42px!important;padding:5px!important}.nfe-table td input,.nfe-table td select{height:32px!important;min-height:32px!important;font-size:10px!important}.nfe-right{text-align:right}.nfe-actions{position:sticky;bottom:0;z-index:20;display:flex;align-items:center;gap:5px;background:#fff;border:1px solid #CFE1E7;border-radius:4px;padding:5px;margin-top:7px;box-shadow:0 -4px 12px rgba(18,59,80,.06)}.nfe-action{height:32px!important;min-height:32px!important;border:1px solid #B9D2DA;border-radius:3px;padding:0 9px;font-size:10px!important;font-weight:800;cursor:pointer}.nfe-action.secondary{background:#fff;color:#17333F}.nfe-action.primary{background:#2D8DB8;border-color:#2D8DB8;color:#fff}.nfe-action.transmit{background:#3A9D78;border-color:#3A9D78;color:#fff}.nfe-action:disabled{opacity:.45;cursor:not-allowed}.nfe-action-spacer{flex:1}.nfe-card-title h2{font-size:13px!important}.nfe-card-title p{font-size:10px!important}.nfe-page input,.nfe-page select,.nfe-page button{border-radius:3px}`}</style>
  </main></div>
}
