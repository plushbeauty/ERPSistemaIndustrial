import { useEffect, useMemo, useState } from 'react'
import { Building2, Check, MapPin, Pencil, Plus, RefreshCw, Search, Trash2, Truck, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import EntityCodeLookup, { type LookupRecord } from '../components/industrial/EntityCodeLookup'
import VendasLayout from './VendasLayout'

type Client = {
  id: string
  codigo: string | null
  nome: string
  nome_fantasia: string | null
  documento: string | null
  inscricao_estadual: string | null
  inscricao_municipal: string | null
  tipo_pessoa: string
  regime_tributario: string | null
  contato_nome: string | null
  email: string | null
  email_nfe: string | null
  telefone: string | null
  whatsapp: string | null
  cep: string | null
  endereco: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  tipo_cliente: string | null
  tabela_preco_id: string | null
  desconto_padrao_percentual: number
  ativo: boolean
}

type Form = {
  codigo: string
  nome: string
  nome_fantasia: string
  documento: string
  inscricao_estadual: string
  inscricao_municipal: string
  tipo_pessoa: string
  regime_tributario: string
  contato_nome: string
  email: string
  email_nfe: string
  telefone: string
  whatsapp: string
  cep: string
  endereco: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  tipo_cliente: string
  desconto: string
  tabela_preco_id: string
  ativo: boolean
}

type Product = LookupRecord & { descricao?: string | null }
type PriceTable = { id: string; codigo: string; nome: string }
type Transportadora = { id: string; codigo: string; razao_social: string; cnpj: string | null; ie: string | null; telefone: string | null; cidade: string | null; uf: string | null; ativo: boolean }
type ClientTransportLink = { id: string; cliente_id: string; transportadora_id: string }
type DePara = { id: string; cliente_id: string; produto_id: string; codigo_cliente: string; dimensoes: string | null; canal: string | null; molde: string | null }

const empty = (): Form => ({
  codigo: 'CLI-' + crypto.randomUUID().slice(0, 8).toUpperCase(),
  nome: '',
  nome_fantasia: '',
  documento: '',
  inscricao_estadual: '',
  inscricao_municipal: '',
  tipo_pessoa: 'PJ',
  regime_tributario: '',
  contato_nome: '',
  email: '',
  email_nfe: '',
  telefone: '',
  whatsapp: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  tipo_cliente: 'PADRAO',
  desconto: '0',
  tabela_preco_id: '',
  ativo: true,
})

const baseInput = 'h-[28px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] font-normal text-slate-900 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-100'
const shortInput = baseInput + ' max-w-[110px]'
function HelpTip({ text }: { text: string }) {
  const [open, setOpen] = useState(true)
  return <span className="relative ml-1 inline-flex align-baseline">
    <span role="button" tabIndex={0} aria-label="Ajuda" onClick={() => setOpen(value => !value)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setOpen(value => !value) } }} className="cursor-pointer select-none text-[10px] font-extrabold leading-none text-sky-700">?</span>
    {open && <span className="absolute left-3 top-3 z-40 w-[260px] rounded-[2px] border border-sky-200 bg-white p-2 text-[9px] font-normal leading-4 text-slate-700 shadow-lg">{text}</span>}
  </span>
}

const cleanDigits = (value: string) => value.replace(/\D/g, '')
const maskCnpj = (value: string) => {
  const d = cleanDigits(value).slice(0, 14)
  return d.length <= 14 ? d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2') : d
}
const maskCpf = (value: string) => {
  const d = cleanDigits(value).slice(0, 11)
  return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
}
const maskCep = (value: string) => cleanDigits(value).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2')
const maskPhone = (value: string) => {
  const d = cleanDigits(value).slice(0, 11)
  if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  return d.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3')
}

type CnpjResult = {
  razao_social?: string
  nome_fantasia?: string
  email?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  municipio?: string
  uf?: string
  ddd_telefone_1?: string
  situacao_cadastral?: number
}

export default function VendasClientes() {
  const [empresa, setEmpresa] = useState('')
  const [rows, setRows] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [priceTables, setPriceTables] = useState<PriceTable[]>([])
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([])
  const [clientTransportLinks, setClientTransportLinks] = useState<ClientTransportLink[]>([])
  const [transportadoraId, setTransportadoraId] = useState('')
  const [transportadoraForm, setTransportadoraForm] = useState({ codigo: '', razao_social: '', cnpj: '', ie: '', telefone: '', cidade: '', uf: '' })
  const [mappings, setMappings] = useState<DePara[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(empty())
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'fiscal' | 'contato' | 'endereco' | 'comercial' | 'depara' | 'transportadora'>('fiscal')
  const [busy, setBusy] = useState(false)
  const [cnpjLoading, setCnpjLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [produto, setProduto] = useState('')
  const [codigoCliente, setCodigoCliente] = useState('')
  const [dimensoes, setDimensoes] = useState('')
  const [canal, setCanal] = useState('')
  const [molde, setMolde] = useState('')

  const load = async () => {
    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa ERP não identificada.')
      const empresaId = String(company.data)
      setEmpresa(empresaId)

      const [clients, productsResult, mappingsResult, priceTablesResult, transportadorasResult, clientTransportResult] = await Promise.all([
        supabase.from('erp_clientes').select('id,codigo,nome,nome_fantasia,documento,inscricao_estadual,inscricao_municipal,tipo_pessoa,regime_tributario,contato_nome,email,email_nfe,telefone,whatsapp,cep,endereco,numero,complemento,bairro,cidade,estado,tipo_cliente,tabela_preco_id,desconto_padrao_percentual,ativo').eq('empresa_id', empresaId).order('nome'),
        fetchAllPages<Product>((from,to)=>supabase.from('erp_produtos').select('id,codigo,nome,descricao,estoque_atual',{count:'exact'}).eq('empresa_id', empresaId).eq('ativo', true).order('codigo').range(from,to)),
        supabase.from('erp_cliente_produto_de_para').select('id,cliente_id,produto_id,codigo_cliente,dimensoes,canal,molde,ativo').eq('empresa_id', empresaId).eq('ativo', true).order('codigo_cliente'),
        supabase.from('erp_tabelas_preco').select('id,codigo,nome').eq('empresa_id', empresaId).eq('ativo', true).order('nome'),
        supabase.from('erp_transportadoras').select('id,codigo,razao_social,cnpj,ie,telefone,cidade,uf,ativo').eq('empresa_id', empresaId).eq('ativo', true).order('razao_social'),
        supabase.from('erp_cliente_transportadoras').select('id,cliente_id,transportadora_id').eq('empresa_id', empresaId),
      ])
      if (clients.error) throw clients.error
      setRows((clients.data ?? []) as Client[])
      setProducts(productsResult)
      setMappings((mappingsResult.data ?? []) as DePara[])
      setPriceTables((priceTablesResult.data ?? []) as PriceTable[])
      if (transportadorasResult.error) throw transportadorasResult.error
      if (clientTransportResult.error) throw clientTransportResult.error
      setTransportadoras((transportadorasResult.data ?? []) as Transportadora[])
      setClientTransportLinks((clientTransportResult.data ?? []) as ClientTransportLink[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar clientes.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(row => !q || [row.codigo, row.nome, row.nome_fantasia, row.documento, row.email].filter(Boolean).join(' ').toLowerCase().includes(q))
  }, [rows, query])

  const selectedClient = rows.find(row => row.id === selected) ?? null
  const productRecords = products.map(product => ({ id: product.id, codigo: product.codigo, nome: product.nome, descricao: product.descricao ?? undefined }))

  const openNew = () => {
    setSelected(null)
    setForm(empty())
    setTab('fiscal')
    setOpen(true)
    setMessage('')
    setError('')
  }

  const edit = (client: Client) => {
    setSelected(client.id)
    setForm({
      codigo: client.codigo ?? 'CLI-' + crypto.randomUUID().slice(0, 8).toUpperCase(),
      nome: client.nome,
      nome_fantasia: client.nome_fantasia ?? '',
      documento: client.documento ?? '',
      inscricao_estadual: client.inscricao_estadual ?? '',
      inscricao_municipal: client.inscricao_municipal ?? '',
      tipo_pessoa: client.tipo_pessoa ?? 'PJ',
      regime_tributario: client.regime_tributario ?? '',
      contato_nome: client.contato_nome ?? '',
      email: client.email ?? '',
      email_nfe: client.email_nfe ?? '',
      telefone: client.telefone ?? '',
      whatsapp: client.whatsapp ?? '',
      cep: client.cep ?? '',
      endereco: client.endereco ?? '',
      numero: client.numero ?? '',
      complemento: client.complemento ?? '',
      bairro: client.bairro ?? '',
      cidade: client.cidade ?? '',
      estado: client.estado ?? '',
      tipo_cliente: client.tipo_cliente ?? 'PADRAO',
      tabela_preco_id: client.tabela_preco_id ?? '',
      desconto: String(client.desconto_padrao_percentual ?? 0),
      ativo: client.ativo,
    })
    setTab('fiscal')
    setOpen(true)
    setMessage('')
    setError('')
  }

  const lookupCnpj = async () => {
    const cnpj = cleanDigits(form.documento)
    if (cnpj.length !== 14) {
      setError('Informe um CNPJ válido com 14 dígitos.')
      return
    }
    setCnpjLoading(true)
    setError('')
    try {
      const existing = rows.find(row => cleanDigits(row.documento ?? '') === cnpj)
      if (existing && (!selected || existing.id !== selected)) {
        edit(existing)
        setMessage('CNPJ já cadastrado nesta empresa. Cadastro existente carregado para edição.')
        return
      }
      const response = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + cnpj)
      if (!response.ok) throw new Error(response.status === 404 ? 'CNPJ não encontrado na consulta pública.' : 'Não foi possível consultar o CNPJ.')
      const data = await response.json() as CnpjResult
      setForm(current => ({
        ...current,
        documento: maskCnpj(cnpj),
        nome: data.razao_social ?? current.nome,
        nome_fantasia: data.nome_fantasia ?? current.nome_fantasia,
        email: data.email ?? current.email,
        cep: data.cep ? maskCep(data.cep) : current.cep,
        endereco: data.logradouro ?? current.endereco,
        numero: data.numero ?? current.numero,
        complemento: data.complemento ?? current.complemento,
        bairro: data.bairro ?? current.bairro,
        cidade: data.municipio ?? current.cidade,
        estado: data.uf ?? current.estado,
        telefone: data.ddd_telefone_1 ? maskPhone(data.ddd_telefone_1) : current.telefone,
      }))
      setMessage('Dados encontrados pelo CNPJ. Confira os campos e complete o que não estiver disponível.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha na consulta do CNPJ.')
    } finally {
      setCnpjLoading(false)
    }
  }

  const lookupCep = async () => {
    const cep = cleanDigits(form.cep)
    if (cep.length !== 8) return
    try {
      const response = await fetch('https://viacep.com.br/ws/' + cep + '/json/')
      if (!response.ok) return
      const data = await response.json() as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string }
      if (data.erro) return
      setForm(current => ({
        ...current,
        cep: maskCep(cep),
        endereco: data.logradouro ?? current.endereco,
        bairro: data.bairro ?? current.bairro,
        cidade: data.localidade ?? current.cidade,
        estado: data.uf ?? current.estado,
      }))
    } catch {
      // CEP continua preenchível manualmente quando o serviço externo não responder.
    }
  }

  const save = async () => {
    if (!empresa || !form.nome.trim()) {
      setError('Razão social/nome é obrigatório.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const payload = {
        empresa_id: empresa,
        codigo: form.codigo.trim(),
        nome: form.nome.trim(),
        nome_fantasia: form.nome_fantasia.trim() || null,
        documento: form.documento.trim() || null,
        inscricao_estadual: form.inscricao_estadual.trim() || null,
        inscricao_municipal: form.inscricao_municipal.trim() || null,
        tipo_pessoa: form.tipo_pessoa,
        regime_tributario: form.regime_tributario.trim() || null,
        contato_nome: form.contato_nome.trim() || null,
        email: form.email.trim() || null,
        email_nfe: form.email_nfe.trim() || null,
        telefone: form.telefone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        cep: form.cep.trim() || null,
        endereco: form.endereco.trim() || null,
        numero: form.numero.trim() || null,
        complemento: form.complemento.trim() || null,
        bairro: form.bairro.trim() || null,
        cidade: form.cidade.trim() || null,
        estado: form.estado.trim().toUpperCase() || null,
        tipo_cliente: form.tipo_cliente.trim() || 'PADRAO',
        tabela_preco_id: form.tabela_preco_id || null,
        desconto_padrao_percentual: Number(form.desconto) || 0,
        ativo: form.ativo,
      }
      const result = selected
        ? await supabase.from('erp_clientes').update(payload).eq('id', selected).eq('empresa_id', empresa)
        : await supabase.from('erp_clientes').insert(payload)
      if (result.error) throw result.error
      setOpen(true)
      setMessage(selected ? 'Cliente atualizado com todos os dados informados.' : 'Cliente cadastrado com sucesso.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar cliente.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!selected || !window.confirm('Excluir este cliente?')) return
    setBusy(true)
    try {
      const result = await supabase.from('erp_clientes').delete().eq('id', selected).eq('empresa_id', empresa)
      if (result.error) throw result.error
      setSelected(null)
      setMessage('Cliente excluído.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao excluir cliente.')
    } finally {
      setBusy(false)
    }
  }

  const addMapping = async () => {
    if (!selected || !produto || !codigoCliente.trim()) {
      setError('Selecione o cliente, o produto e informe o código do cliente.')
      return
    }
    const existing = mappings.find(item => item.cliente_id === selected && item.produto_id === produto)
    const payload = {
      empresa_id: empresa,
      cliente_id: selected,
      produto_id: produto,
      codigo_cliente: codigoCliente.trim(),
      dimensoes: dimensoes.trim() || null,
      canal: canal.trim() || null,
      molde: molde.trim() || null,
      ativo: true,
    }
    const result = existing
      ? await supabase.from('erp_cliente_produto_de_para').update(payload).eq('id', existing.id).eq('empresa_id', empresa)
      : await supabase.from('erp_cliente_produto_de_para').insert(payload)
    if (result.error) setError(result.error.message)
    else {
      setCodigoCliente('')
      setDimensoes('')
      setCanal('')
      setMolde('')
      setMessage('De-Para gravado.')
      await load()
    }
  }

  const saveTransportadora = async () => {
    if (!selected || !transportadoraForm.codigo.trim() || !transportadoraForm.razao_social.trim()) {
      setError('Selecione o cliente e informe código e razão social da transportadora.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const created = await supabase.from('erp_transportadoras').insert({
        empresa_id: empresa, codigo: transportadoraForm.codigo.trim(), razao_social: transportadoraForm.razao_social.trim(),
        cnpj: transportadoraForm.cnpj.trim() || null, ie: transportadoraForm.ie.trim() || null, telefone: transportadoraForm.telefone.trim() || null,
        cidade: transportadoraForm.cidade.trim() || null, uf: transportadoraForm.uf.trim().toUpperCase() || null, ativo: true,
      }).select('id').single()
      if (created.error) throw created.error
      const link = await supabase.from('erp_cliente_transportadoras').insert({ empresa_id: empresa, cliente_id: selected, transportadora_id: created.data.id })
      if (link.error) throw link.error
      setTransportadoraForm({ codigo: '', razao_social: '', cnpj: '', ie: '', telefone: '', cidade: '', uf: '' })
      setMessage('Transportadora cadastrada e vinculada ao cliente.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao cadastrar transportadora.')
    } finally {
      setBusy(false)
    }
  }

  const linkTransportadora = async () => {
    if (!selected || !transportadoraId) return
    const exists = clientTransportLinks.some(link => link.cliente_id === selected && link.transportadora_id === transportadoraId)
    if (exists) { setError('Esta transportadora já está vinculada ao cliente.'); return }
    const result = await supabase.from('erp_cliente_transportadoras').insert({ empresa_id: empresa, cliente_id: selected, transportadora_id: transportadoraId })
    if (result.error) setError(result.error.message)
    else { setTransportadoraId(''); setMessage('Transportadora vinculada ao cliente.'); await load() }
  }

  const unlinkTransportadora = async (id: string) => {
    const result = await supabase.from('erp_cliente_transportadoras').delete().eq('id', id).eq('empresa_id', empresa)
    if (result.error) setError(result.error.message)
    else await load()
  }

  const deleteMapping = async (id: string) => {
    const result = await supabase.from('erp_cliente_produto_de_para').delete().eq('id', id).eq('empresa_id', empresa)
    if (result.error) setError(result.error.message)
    else await load()
  }

  const tabs = [
    ['fiscal', '1. Identificação e Fiscal'],
    ['contato', '2. Contato'],
    ['endereco', '3. Endereço'],
    ['comercial', '4. Comercial'],
    ['depara', '5. De/Para Produtos'],
    ['transportadora', '6. Transportadora'],
  ] as const

  return (
    <VendasLayout title="Clientes" subtitle="" onRefresh={() => void load()} showStatusCards={false}>
      <main className="sales-workspace sales-detail">
        <div className="mx-auto max-w-[1700px] space-y-3">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-sky-700">VENDAS › CLIENTES</p>
                <HelpTip text="Tela de cadastro e consulta de clientes. Use NOVO CLIENTE para abrir o cadastro na própria tela; EDITAR usa a linha selecionada." />
              </div>
              
            </div>
            <div className="flex flex-wrap gap-1">
              <button type="button" onClick={openNew} className="erp-standard-button"><Plus size={12}/> NOVO CLIENTE</button><button type="button" onClick={() => void save()} disabled={busy} className="erp-standard-button border-emerald-800 bg-emerald-700 disabled:opacity-40"><Check size={12}/> SALVAR CLIENTE</button>
              <button type="button" disabled={!selectedClient} onClick={() => selectedClient && edit(selectedClient)} className="erp-standard-button disabled:opacity-40"><Pencil size={12}/> EDITAR</button>
              <button type="button" disabled={!selected} onClick={() => void remove()} className="erp-standard-button border-rose-700 bg-rose-700 disabled:opacity-40"><Trash2 size={12}/> EXCLUIR</button>
              <button type="button" onClick={() => void load()} className="erp-standard-button"><RefreshCw size={12}/> ATUALIZAR</button>
            </div>
          </header>

          {(message || error) && <div className={error ? 'border border-rose-300 bg-rose-50 px-2 py-1 text-[10px] text-rose-800' : 'border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] text-emerald-800'}>{error || message}</div>}

          <section className="border border-slate-200 bg-white">
            <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-2 py-1.5">
              <div className="flex items-center gap-1.5"><span className="text-[11px] font-semibold text-sky-800">{selected ? 'EDITAR CLIENTE' : 'NOVO CLIENTE'}</span><HelpTip text="Preencha as abas da esquerda para a direita. Campos que alimentam pedidos, fiscal e comercial ficam no cadastro do cliente para evitar cadastros duplicados." /></div>
              
            </header>
            <nav className="flex flex-wrap border-b border-slate-200 bg-white px-1">{tabs.map(([id, label]) => <button key={id} type="button" onClick={() => setTab(id)} className={'border-b-2 px-3 py-1.5 text-[9px] font-semibold ' + (tab === id ? 'border-sky-700 bg-sky-50 text-sky-800' : 'border-transparent text-slate-500 hover:bg-slate-50')}>{label}</button>)}</nav>
            <div className="p-2">
              {tab === 'fiscal' && <div className="space-y-2">
                <div className="grid gap-1.5 md:grid-cols-[100px_100px_190px_auto]">
                  <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Código<HelpTip text="Código interno do cliente. É gerado automaticamente e usado nas pesquisas e referências do ERP."/><input readOnly value={form.codigo} className={shortInput + ' bg-slate-100 font-mono'}/></label>
                  <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Pessoa<HelpTip text="PJ usa CNPJ; PF usa CPF. A escolha define a máscara e a consulta fiscal."/><select value={form.tipo_pessoa} onChange={event => setForm({...form, tipo_pessoa: event.target.value})} className={baseInput}><option value="PJ">PJ</option><option value="PF">PF</option></select></label>
                  <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">CNPJ / CPF *<HelpTip text="Informe o documento fiscal. Para PJ, CONSULTAR CNPJ tenta trazer razão social, endereço e contato para conferência."/><input value={form.documento} onChange={event => setForm({...form, documento: form.tipo_pessoa === 'PJ' ? maskCnpj(event.target.value) : maskCpf(event.target.value)})} className={baseInput} placeholder={form.tipo_pessoa === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}/></label>
                  <div className="flex items-end"><button type="button" onClick={() => void lookupCnpj()} disabled={form.tipo_pessoa !== 'PJ' || cnpjLoading} className="erp-standard-button disabled:opacity-40">{cnpjLoading ? 'CONSULTANDO...' : 'CONSULTAR CNPJ'}</button></div>
                </div>
                <div className="grid gap-2 md:grid-cols-[1.5fr_1fr_1fr]">
                  <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Razão Social / Nome *<input value={form.nome} onChange={event => setForm({...form, nome: event.target.value})} className={baseInput}/></label>
                  <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Nome Fantasia<input value={form.nome_fantasia} onChange={event => setForm({...form, nome_fantasia: event.target.value})} className={baseInput}/></label>
                  <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Regime Tributário<HelpTip text="Usado para registrar o enquadramento tributário do cliente e apoiar as regras fiscais. Não altera sozinho o cadastro fiscal."/><select value={form.regime_tributario} onChange={event => setForm({...form, regime_tributario: event.target.value})} className={baseInput}><option value="">Não informado</option><option value="SIMPLES_NACIONAL">Simples Nacional</option><option value="LUCRO_PRESUMIDO">Lucro Presumido</option><option value="LUCRO_REAL">Lucro Real</option></select></label>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Inscrição Estadual<input value={form.inscricao_estadual} onChange={event => setForm({...form, inscricao_estadual: event.target.value})} className={baseInput}/></label>
                  <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Inscrição Municipal<input value={form.inscricao_municipal} onChange={event => setForm({...form, inscricao_municipal: event.target.value})} className={baseInput}/></label>
                  <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Status<HelpTip text="Cliente ativo pode ser usado nas operações comerciais. Inativo permanece no histórico e deixa de ser selecionável onde o ERP exigir cliente ativo."/><select value={form.ativo ? '1' : '0'} onChange={event => setForm({...form, ativo: event.target.value === '1'})} className={baseInput}><option value="1">ATIVO</option><option value="0">INATIVO</option></select></label>
                </div>
              </div>}

              {tab === 'contato' && <div className="grid gap-2 md:grid-cols-[1fr_1fr_180px_180px]">
                <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Contato Principal<HelpTip text="Nome do comprador, responsável ou contato comercial do cliente."/><input value={form.contato_nome} onChange={event => setForm({...form, contato_nome: event.target.value})} className={baseInput}/></label>
                <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">E-mail Comercial<HelpTip text="E-mail de contato comercial. Digite no formato nome@empresa.com."/><input type="email" value={form.email} onChange={event => setForm({...form, email: event.target.value})} className={baseInput}/></label>
                <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Telefone<input maxLength={15} value={form.telefone} onChange={event => setForm({...form, telefone: maskPhone(event.target.value)})} className={baseInput}/></label>
                <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">WhatsApp<input maxLength={15} value={form.whatsapp} onChange={event => setForm({...form, whatsapp: maskPhone(event.target.value)})} className={baseInput}/></label>
                <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500 md:col-span-2">E-mail NF-e / Faturamento<HelpTip text="E-mail utilizado para comunicações de faturamento e documentos fiscais quando o fluxo do ERP solicitar esse endereço."/><input type="email" value={form.email_nfe} onChange={event => setForm({...form, email_nfe: event.target.value})} className={baseInput}/></label>
              </div>}

              {tab === 'endereco' && <div className="space-y-2">
                <div className="grid gap-2 md:grid-cols-[110px_1fr_110px]"><label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">CEP<HelpTip text="Informe o CEP. Ao sair do campo, o ERP tenta completar rua, bairro, cidade e UF; revise antes de salvar."/><input maxLength={9} value={form.cep} onChange={event => setForm({...form, cep: maskCep(event.target.value)})} onBlur={() => void lookupCep()} className={shortInput}/></label><label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Logradouro / Rua<input value={form.endereco} onChange={event => setForm({...form, endereco: event.target.value})} className={baseInput}/></label><label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Número<input value={form.numero} onChange={event => setForm({...form, numero: event.target.value})} className={shortInput}/></label></div>
                <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_70px]"><label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Bairro<input value={form.bairro} onChange={event => setForm({...form, bairro: event.target.value})} className={baseInput}/></label><label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Cidade<input value={form.cidade} onChange={event => setForm({...form, cidade: event.target.value})} className={baseInput}/></label><label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Complemento<input value={form.complemento} onChange={event => setForm({...form, complemento: event.target.value})} className={baseInput}/></label><label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">UF<input maxLength={2} value={form.estado} onChange={event => setForm({...form, estado: event.target.value.toUpperCase()})} className={shortInput}/></label></div>
              </div>}

              {tab === 'comercial' && <div className="space-y-2">
                <div className="grid gap-2 md:grid-cols-[1fr_1.4fr_130px_120px]">
                  <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Tipo de Cliente<HelpTip text="Classificação comercial gravada no campo tipo_cliente. Use o padrão definido pela empresa para segmentar o cliente."/><input value={form.tipo_cliente} onChange={event => setForm({...form, tipo_cliente: event.target.value})} className={baseInput}/></label>
                  <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Tabela de Preço<HelpTip text="Preço padrão do produto = erp_produtos.preco_venda. Quando você escolhe uma tabela, o ERP usa o preço específico de erp_tabelas_preco_itens para o produto e depois aplica o desconto padrão do cliente. As tabelas e seus preços são mantidos em Vendas › Tabela de Preços / Reajuste."/><select value={form.tabela_preco_id} onChange={event => setForm({...form, tabela_preco_id: event.target.value})} className={baseInput}><option value="">Preço padrão do produto</option>{priceTables.map(table => <option key={table.id} value={table.id}>{table.codigo} — {table.nome}</option>)}</select></label>
                  <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Desconto %<HelpTip text="Desconto padrão aplicado pela resolução de preço do cliente. Informe apenas o percentual, de 0 a 100."/><input type="number" min="0" max="100" step="0.01" value={form.desconto} onChange={event => setForm({...form, desconto: event.target.value})} className={baseInput}/></label>
                  <div className="flex items-end"><span className="flex h-[30px] w-full items-center border border-slate-300 px-2 text-[9px] font-semibold text-slate-700">ATIVO: {form.ativo ? 'SIM' : 'NÃO'}</span></div>
                </div>
                <div className="border border-sky-100 bg-sky-50 px-2 py-1.5 text-[10px] text-sky-900"><Building2 size={12} className="mr-1 inline"/>Para criar ou alterar uma tabela e seus preços, use <strong>Vendas › Tabela de Preços / Reajuste</strong>. Aqui o cadastro do cliente apenas escolhe qual tabela será usada por ele.</div>
              </div>}

              {tab === 'depara' && selected && <div className="space-y-2">
                <div className="border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] text-slate-700"><UserRound size={12} className="mr-1 inline"/>De/Para liga o código que o cliente usa ao produto interno do ERP. <HelpTip text="Selecione o produto interno, informe o código que o cliente usa para esse mesmo item e, se necessário, dimensões, canal e molde. Salve em VINCULAR. A relação é por cliente + produto e usa a estrutura real erp_cliente_produto_de_para." /></div>
                <div className="grid gap-2 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
                  <EntityCodeLookup label="Produto interno" value={produto} records={productRecords} onChange={setProduto} onSelect={record => setProduto(record.id)}/>
                  <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Código Cliente<input value={codigoCliente} onChange={event => setCodigoCliente(event.target.value)} className={baseInput}/></label>
                  <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Dimensões<input value={dimensoes} onChange={event => setDimensoes(event.target.value)} className={baseInput}/></label>
                  <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Canal<input value={canal} onChange={event => setCanal(event.target.value)} className={baseInput}/></label>
                  <button type="button" onClick={() => void addMapping()} className="erp-standard-button self-end">VINCULAR</button>
                </div>
                <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-[10px]"><thead className="bg-slate-100"><tr className="h-7 text-left"><th className="px-2">Código ERP</th><th className="px-2">Código Cliente</th><th className="px-2">Dimensões</th><th className="px-2">Canal</th><th className="px-2">Molde</th><th/></tr></thead><tbody>{mappings.filter(item => item.cliente_id === selected).map(item => <tr key={item.id} className="h-7 border-t border-slate-200"><td className="px-2 font-mono">{products.find(product => product.id === item.produto_id)?.codigo ?? '—'}</td><td className="px-2">{item.codigo_cliente}</td><td className="px-2">{item.dimensoes ?? '—'}</td><td className="px-2">{item.canal ?? '—'}</td><td className="px-2">{item.molde ?? '—'}</td><td className="px-2 text-right"><button type="button" onClick={() => void deleteMapping(item.id)} title="Excluir De/Para" className="text-rose-700"><Trash2 size={12}/></button></td></tr>)}</tbody></table></div>
              </div>}

              {tab === 'transportadora' && selected && <div className="space-y-2">
                <div className="border border-sky-100 bg-sky-50 px-2 py-1.5 text-[10px] text-sky-900"><Truck size={12} className="mr-1 inline"/>O cliente pode ter uma ou mais transportadoras vinculadas. O cadastro usa as tabelas reais <strong>erp_transportadoras</strong> e <strong>erp_cliente_transportadoras</strong>. <HelpTip text="Use uma transportadora já cadastrada para apenas vincular. Para uma nova, preencha os campos de cadastro abaixo e clique em CADASTRAR + VINCULAR." /></div>
                <div className="grid gap-2 md:grid-cols-[1.4fr_auto]">
                  <select value={transportadoraId} onChange={event => setTransportadoraId(event.target.value)} className={baseInput}><option value="">Selecione uma transportadora já cadastrada</option>{transportadoras.map(item => <option key={item.id} value={item.id}>{item.codigo} — {item.razao_social}</option>)}</select>
                  <button type="button" onClick={() => void linkTransportadora()} className="erp-standard-button">VINCULAR EXISTENTE</button>
                </div>
                <div className="grid gap-2 md:grid-cols-[110px_1.5fr_180px_140px]">
                  <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Código<HelpTip text="Código único da transportadora dentro da empresa."/><input value={transportadoraForm.codigo} onChange={event => setTransportadoraForm({...transportadoraForm, codigo: event.target.value})} className={shortInput}/></label>
                  <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Razão Social *<input value={transportadoraForm.razao_social} onChange={event => setTransportadoraForm({...transportadoraForm, razao_social: event.target.value})} className={baseInput}/></label>
                  <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">CNPJ<input value={transportadoraForm.cnpj} onChange={event => setTransportadoraForm({...transportadoraForm, cnpj: event.target.value})} className={baseInput}/></label>
                  <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">IE<input value={transportadoraForm.ie} onChange={event => setTransportadoraForm({...transportadoraForm, ie: event.target.value})} className={baseInput}/></label>
                </div>
                <div className="grid gap-2 md:grid-cols-[180px_1fr_70px_auto]">
                  <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Telefone<input value={transportadoraForm.telefone} onChange={event => setTransportadoraForm({...transportadoraForm, telefone: event.target.value})} className={baseInput}/></label>
                  <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">Cidade<input value={transportadoraForm.cidade} onChange={event => setTransportadoraForm({...transportadoraForm, cidade: event.target.value})} className={baseInput}/></label>
                  <label className="grid gap-0.5 text-[9px] font-semibold uppercase text-slate-500">UF<input maxLength={2} value={transportadoraForm.uf} onChange={event => setTransportadoraForm({...transportadoraForm, uf: event.target.value.toUpperCase()})} className={shortInput}/></label>
                  <button type="button" onClick={() => void saveTransportadora()} className="erp-standard-button self-end"><Truck size={12}/> CADASTRAR + VINCULAR</button>
                </div>
                <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-[10px]"><thead className="bg-slate-100"><tr className="h-7 text-left"><th className="px-2">Código</th><th className="px-2">Transportadora</th><th className="px-2">CNPJ</th><th className="px-2">Cidade/UF</th><th/></tr></thead><tbody>{clientTransportLinks.filter(link => link.cliente_id === selected).map(link => { const item=transportadoras.find(row => row.id === link.transportadora_id); return item ? <tr key={link.id} className="h-7 border-t border-slate-200"><td className="px-2">{item.codigo}</td><td className="px-2">{item.razao_social}</td><td className="px-2">{item.cnpj ?? '—'}</td><td className="px-2">{[item.cidade,item.uf].filter(Boolean).join(' / ') || '—'}</td><td className="px-2 text-right"><button type="button" onClick={() => void unlinkTransportadora(link.id)} title="Desvincular transportadora" className="text-rose-700"><Trash2 size={12}/></button></td></tr> : null })}</tbody></table></div>
              </div>}
            </div>
            <footer className="border-t border-slate-200 bg-slate-50 px-2 py-1.5 text-[9px] text-slate-500">SALVAMENTO PELO BOTÃO SUPERIOR • O FORMULÁRIO PERMANECE FIXO NA TELA.</footer>
          </section>

          <section className="border border-slate-200 bg-white">
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-2 py-1">
              <Search size={13} className="text-sky-700"/>
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Pesquisar por código, razão social, CNPJ ou e-mail" className="h-[28px] min-w-0 flex-1 border-0 bg-transparent px-1 text-[10px] outline-none"/>
              <HelpTip text="Digite parte do código, razão social, CNPJ ou e-mail. A grade abaixo filtra os clientes já cadastrados na empresa atual." />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-[10px]">
                <thead className="bg-slate-100"><tr className="h-7 text-left font-semibold"><th className="px-2">Código</th><th className="px-2">Razão Social / Nome</th><th className="px-2">CNPJ / CPF</th><th className="px-2">Contato</th><th className="px-2">Cidade/UF</th><th className="px-2">Status</th></tr></thead>
                <tbody>{filtered.map(row => <tr key={row.id} onClick={() => { setSelected(row.id); if (!open) edit(row) }} className={'h-7 cursor-pointer border-t border-slate-200 ' + (selected === row.id ? 'bg-sky-50' : 'hover:bg-slate-50')}><td className="px-2 font-mono">{row.codigo ?? '—'}</td><td className="px-2">{row.nome}<span className="ml-2 text-slate-500">{row.nome_fantasia ?? ''}</span></td><td className="px-2">{row.documento ?? '—'}</td><td className="px-2">{row.contato_nome ?? '—'}</td><td className="px-2">{[row.cidade, row.estado].filter(Boolean).join(' / ') || '—'}</td><td className={row.ativo ? 'px-2 text-emerald-700' : 'px-2 text-rose-700'}>{row.ativo ? 'ATIVO' : 'INATIVO'}</td></tr>)}</tbody>
              </table>
            </div>
            {!busy && !filtered.length && <p className="p-6 text-center text-[10px] text-slate-500">Nenhum cliente encontrado.</p>}
          </section>
        </div>
      </main>
    </VendasLayout>
  )

}