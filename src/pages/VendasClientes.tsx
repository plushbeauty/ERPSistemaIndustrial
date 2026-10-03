import { useEffect, useMemo, useState } from 'react'
import { Building2, Check, MapPin, Pencil, Plus, RefreshCw, Search, Trash2, UserRound, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import EntityCodeLookup, { type LookupRecord } from '../components/industrial/EntityCodeLookup'

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

const baseInput = 'h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100'
const shortInput = baseInput + ' max-w-[180px]'
const cleanDigits = (value: string) => value.replace(/\\D/g, '')
const maskCnpj = (value: string) => {
  const d = cleanDigits(value).slice(0, 14)
  return d.length <= 14 ? d.replace(/^(\\d{2})(\\d)/, '$1.$2').replace(/^(\\d{2})\\.(\\d{3})(\\d)/, '$1.$2.$3').replace(/\\.(\\d{3})(\\d)/, '.$1/$2').replace(/(\\d{4})(\\d)/, '$1-$2') : d
}
const maskCpf = (value: string) => {
  const d = cleanDigits(value).slice(0, 11)
  return d.replace(/^(\\d{3})(\\d)/, '$1.$2').replace(/^(\\d{3})\\.(\\d{3})(\\d)/, '$1.$2.$3').replace(/^(\\d{3})\\.(\\d{3})\\.(\\d{3})(\\d)/, '$1.$2.$3-$4')
}
const maskCep = (value: string) => cleanDigits(value).slice(0, 8).replace(/^(\\d{5})(\\d)/, '$1-$2')
const maskPhone = (value: string) => {
  const d = cleanDigits(value).slice(0, 11)
  if (d.length <= 10) return d.replace(/^(\\d{2})(\\d)/, '($1) $2').replace(/(\\d{4})(\\d)/, '$1-$2')
  return d.replace(/^(\\d{2})(\\d{5})(\\d{4}).*/, '($1) $2-$3')
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
  const [mappings, setMappings] = useState<DePara[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(empty())
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'fiscal' | 'contato' | 'endereco' | 'comercial' | 'depara'>('fiscal')
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

      const [clients, productsResult, mappingsResult, priceTablesResult] = await Promise.all([
        supabase.from('erp_clientes').select('id,codigo,nome,nome_fantasia,documento,inscricao_estadual,inscricao_municipal,tipo_pessoa,regime_tributario,contato_nome,email,email_nfe,telefone,whatsapp,cep,endereco,numero,complemento,bairro,cidade,estado,tipo_cliente,tabela_preco_id,desconto_padrao_percentual,ativo').eq('empresa_id', empresaId).order('nome'),
        supabase.from('erp_produtos').select('id,codigo,nome,descricao,estoque_atual').eq('empresa_id', empresaId).eq('ativo', true).order('codigo').limit(3000),
        supabase.from('erp_cliente_produto_de_para').select('id,cliente_id,produto_id,codigo_cliente,dimensoes,canal,molde,ativo').eq('empresa_id', empresaId).eq('ativo', true).order('codigo_cliente'),
        supabase.from('erp_tabelas_preco').select('id,codigo,nome').eq('empresa_id', empresaId).eq('ativo', true).order('nome'),
      ])
      if (clients.error) throw clients.error
      if (productsResult.error) throw productsResult.error
      if (mappingsResult.error) throw mappingsResult.error
      if (priceTablesResult.error) throw priceTablesResult.error
      setRows((clients.data ?? []) as Client[])
      setProducts((productsResult.data ?? []) as Product[])
      setMappings((mappingsResult.data ?? []) as DePara[])
      setPriceTables((priceTablesResult.data ?? []) as PriceTable[])
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
      setOpen(false)
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
  ] as const

  return (
    <main className="erp-compact min-h-screen bg-slate-50 p-5 text-slate-900">
      <div className="mx-auto max-w-[1700px] space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">VENDAS › CLIENTES</p>
            <h1 className="text-3xl font-black text-slate-950">Cadastro de Clientes</h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">Cadastro fiscal, contatos, endereço, regras comerciais e De/Para do cliente.</p>
          </div>
          <div className="erp-action-toolbar">
            <button type="button" onClick={openNew} className="flex h-7 items-center gap-1 rounded-md bg-sky-700 px-2 text-[11px] font-bold text-white"><Plus size={13}/> NOVO</button>
            <button type="button" disabled={!selectedClient} onClick={() => selectedClient && edit(selectedClient)} className="flex h-7 items-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-[11px] font-bold disabled:opacity-50"><Pencil size={13}/> EDITAR</button>
            <button type="button" disabled={!selected} onClick={() => void remove()} className="flex h-7 items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2 text-[11px] font-bold text-rose-800 disabled:opacity-50"><Trash2 size={13}/> EXCLUIR</button>
            <button type="button" onClick={() => void load()} className="flex h-7 items-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-[11px] font-bold"><RefreshCw size={13}/> ATUALIZAR</button>
          </div>
        </header>

        {(message || error) && <div className={error ? 'rounded-md border border-rose-300 bg-rose-50 p-4 text-sm font-bold text-rose-800' : 'rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-800'}>{error || message}</div>}

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Search size={19} className="text-sky-700"/>
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Pesquisar por código, razão social, CNPJ ou e-mail" className={baseInput}/>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-slate-100"><tr className="h-12 text-left font-black"><th className="px-4">Código</th><th className="px-4">Razão Social / Nome</th><th className="px-4">CNPJ / CPF</th><th className="px-4">Contato</th><th className="px-4">Cidade/UF</th><th className="px-4">Status</th><th className="w-[60px] px-2 text-right">Ações</th></tr></thead>
              <tbody>{filtered.map(row => <tr key={row.id} onClick={() => setSelected(row.id)} className={'h-12 cursor-pointer border-t border-slate-200 ' + (selected === row.id ? 'bg-sky-50' : 'hover:bg-slate-50')}><td className="px-4 font-mono font-black">{row.codigo ?? '—'}</td><td className="px-4 font-bold">{row.nome}<span className="ml-2 font-normal text-slate-500">{row.nome_fantasia ?? ''}</span></td><td className="px-4">{row.documento ?? '—'}</td><td className="px-4">{row.contato_nome ?? '—'}</td><td className="px-4">{[row.cidade, row.estado].filter(Boolean).join(' / ') || '—'}</td><td className={'px-4 font-black ' + (row.ativo ? 'text-emerald-700' : 'text-rose-700')}>{row.ativo ? 'ATIVO' : 'INATIVO'}</td><td className="px-2 text-right"><div className="erp-row-actions"><button type="button" className="erp-edit-button" title={`Editar ${row.nome}`} aria-label={`Editar ${row.nome}`} onClick={event => { event.stopPropagation(); edit(row) }}><Pencil size={14}/></button></div></td></tr>)}</tbody>
            </table>
          </div>
          {!busy && !filtered.length && <p className="p-10 text-center font-bold text-slate-500">Nenhum cliente encontrado.</p>}
        </section>

        {selected && <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-sky-700">DE/PARA DE PRODUTOS</p><h2 className="text-xl font-black">{selectedClient?.nome ?? 'Cliente'}</h2></div><span className="rounded bg-slate-100 px-3 py-2 text-xs font-black">{mappings.filter(item => item.cliente_id === selected).length} vínculo(s)</span></div>
          <div className="mt-5 grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto]">
            <EntityCodeLookup label="Produto interno" value={produto} records={productRecords} onChange={setProduto} onSelect={record => setProduto(record.id)}/>
            <label className="grid gap-1 text-xs font-black">CÓDIGO DO CLIENTE<input value={codigoCliente} onChange={event => setCodigoCliente(event.target.value)} className={baseInput}/></label>
            <label className="grid gap-1 text-xs font-black">DIMENSÕES<input value={dimensoes} onChange={event => setDimensoes(event.target.value)} className={baseInput}/></label>
            <label className="grid gap-1 text-xs font-black">CANAL<input value={canal} onChange={event => setCanal(event.target.value)} className={baseInput}/></label>
            <label className="grid gap-1 text-xs font-black">MOLDE<input value={molde} onChange={event => setMolde(event.target.value)} className={baseInput}/></label>
            <button type="button" onClick={() => void addMapping()} className="mt-5 h-11 rounded-md bg-slate-900 px-4 text-xs font-black text-white">VINCULAR</button>
          </div>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-slate-100"><tr className="h-11 text-left font-black"><th className="px-4">Código ERP</th><th className="px-4">Código Cliente</th><th className="px-4">Dimensões</th><th className="px-4">Canal</th><th className="px-4">Molde</th><th/></tr></thead><tbody>{mappings.filter(item => item.cliente_id === selected).map(item => <tr key={item.id} className="h-11 border-t border-slate-200"><td className="px-4 font-mono font-black">{products.find(product => product.id === item.produto_id)?.codigo ?? '—'}</td><td className="px-4 font-semibold">{item.codigo_cliente}</td><td className="px-4">{item.dimensoes ?? '—'}</td><td className="px-4">{item.canal ?? '—'}</td><td className="px-4">{item.molde ?? '—'}</td><td className="px-4 text-right"><button type="button" onClick={() => void deleteMapping(item.id)} className="text-rose-700"><Trash2 size={17}/></button></td></tr>)}</tbody></table></div>
        </section>}
      </div>

      {open && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4">
        <section className="mx-auto my-4 w-full max-w-6xl rounded-lg bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4"><div><p className="text-xs font-black uppercase tracking-widest text-sky-700">MÓDULO DE VENDAS</p><h2 className="text-xl font-black">{selected ? 'Editar cliente' : 'Novo cliente'}</h2></div><button type="button" onClick={() => setOpen(false)} className="rounded-md p-2 hover:bg-slate-100"><X/></button></header>
          <nav className="flex flex-wrap border-b border-slate-200 bg-slate-50 px-5">{tabs.map(([id, label]) => <button key={id} type="button" onClick={() => setTab(id)} className={'border-b-2 px-4 py-3 text-xs font-black ' + (tab === id ? 'border-sky-700 text-sky-700 bg-white' : 'border-transparent text-slate-500')}>{label}</button>)}</nav>
          <div className="max-h-[68vh] overflow-y-auto p-6">
            {tab === 'fiscal' && <div className="space-y-5"><div className="grid gap-4 md:grid-cols-[150px_170px_1fr]"><label className="grid gap-1 text-xs font-black">CÓDIGO AUTOMÁTICO<input readOnly value={form.codigo} className={shortInput + ' bg-slate-100 font-mono'}/></label><label className="grid gap-1 text-xs font-black">TIPO DE PESSOA<select value={form.tipo_pessoa} onChange={event => setForm({...form, tipo_pessoa: event.target.value})} className={baseInput}><option value="PJ">PJ</option><option value="PF">PF</option></select></label><div className="flex items-end gap-2"><label className="grid flex-1 gap-1 text-xs font-black">CNPJ / CPF *<input value={form.documento} onChange={event => setForm({...form, documento: form.tipo_pessoa === 'PJ' ? maskCnpj(event.target.value) : maskCpf(event.target.value)})} className={baseInput} placeholder={form.tipo_pessoa === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}/></label>{form.tipo_pessoa === 'PJ' && <button type="button" onClick={() => void lookupCnpj()} disabled={cnpjLoading} className="h-11 rounded-md bg-sky-700 px-4 text-xs font-black text-white">{cnpjLoading ? 'CONSULTANDO...' : 'CONSULTAR CNPJ'}</button>}</div></div><div className="grid gap-4 md:grid-cols-[1.5fr_1fr]"><label className="grid gap-1 text-xs font-black">RAZÃO SOCIAL / NOME COMPLETO *<input value={form.nome} onChange={event => setForm({...form, nome: event.target.value})} className={baseInput}/></label><label className="grid gap-1 text-xs font-black">NOME FANTASIA<input value={form.nome_fantasia} onChange={event => setForm({...form, nome_fantasia: event.target.value})} className={baseInput}/></label></div><div className="grid gap-4 md:grid-cols-3"><label className="grid gap-1 text-xs font-black">INSCRIÇÃO ESTADUAL<input value={form.inscricao_estadual} onChange={event => setForm({...form, inscricao_estadual: event.target.value})} className={baseInput}/></label><label className="grid gap-1 text-xs font-black">INSCRIÇÃO MUNICIPAL<input value={form.inscricao_municipal} onChange={event => setForm({...form, inscricao_municipal: event.target.value})} className={baseInput}/></label><label className="grid gap-1 text-xs font-black">REGIME TRIBUTÁRIO<select value={form.regime_tributario} onChange={event => setForm({...form, regime_tributario: event.target.value})} className={baseInput}><option value="">Não informado</option><option value="SIMPLES_NACIONAL">Simples Nacional</option><option value="LUCRO_PRESUMIDO">Lucro Presumido</option><option value="LUCRO_REAL">Lucro Real</option></select></label></div></div>}

            {tab === 'contato' && <div className="grid gap-4 md:grid-cols-2"><label className="grid gap-1 text-xs font-black">CONTATO PRINCIPAL<input value={form.contato_nome} onChange={event => setForm({...form, contato_nome: event.target.value})} className={baseInput} placeholder="Nome do comprador/responsável"/></label><label className="grid gap-1 text-xs font-black">E-MAIL COMERCIAL<input type="email" value={form.email} onChange={event => setForm({...form, email: event.target.value})} className={baseInput}/></label><label className="grid max-w-[260px] gap-1 text-xs font-black">TELEFONE<input maxLength={15} value={form.telefone} onChange={event => setForm({...form, telefone: maskPhone(event.target.value)})} className={baseInput}/></label><label className="grid max-w-[260px] gap-1 text-xs font-black">WHATSAPP<input maxLength={15} value={form.whatsapp} onChange={event => setForm({...form, whatsapp: maskPhone(event.target.value)})} className={baseInput}/></label><label className="grid gap-1 text-xs font-black md:col-span-2">E-MAIL NFe / FATURAMENTO<input type="email" value={form.email_nfe} onChange={event => setForm({...form, email_nfe: event.target.value})} className={baseInput}/></label></div>}

            {tab === 'endereco' && <div className="space-y-4"><div className="grid gap-4 md:grid-cols-[150px_1fr_130px]"><label className="grid gap-1 text-xs font-black">CEP<input maxLength={9} value={form.cep} onChange={event => setForm({...form, cep: maskCep(event.target.value)})} onBlur={() => void lookupCep()} className={shortInput}/></label><label className="grid gap-1 text-xs font-black">LOGRADOURO / RUA<input value={form.endereco} onChange={event => setForm({...form, endereco: event.target.value})} className={baseInput}/></label><label className="grid gap-1 text-xs font-black">NÚMERO<input value={form.numero} onChange={event => setForm({...form, numero: event.target.value})} className={shortInput}/></label></div><div className="grid gap-4 md:grid-cols-[1fr_1fr_150px_80px]"><label className="grid gap-1 text-xs font-black">BAIRRO<input value={form.bairro} onChange={event => setForm({...form, bairro: event.target.value})} className={baseInput}/></label><label className="grid gap-1 text-xs font-black">CIDADE<input value={form.cidade} onChange={event => setForm({...form, cidade: event.target.value})} className={baseInput}/></label><label className="grid gap-1 text-xs font-black">COMPLEMENTO<input value={form.complemento} onChange={event => setForm({...form, complemento: event.target.value})} className={baseInput}/></label><label className="grid gap-1 text-xs font-black">UF<input maxLength={2} value={form.estado} onChange={event => setForm({...form, estado: event.target.value.toUpperCase()})} className={shortInput}/></label></div><div className="rounded-md border border-sky-100 bg-sky-50 p-4 text-sm font-semibold text-sky-900"><MapPin size={17} className="mr-2 inline"/>Ao informar o CEP, o sistema tenta preencher rua, bairro, cidade e UF. Confira antes de salvar.</div></div>}

            {tab === 'comercial' && <div className="grid gap-4 md:grid-cols-3"><label className="grid gap-1 text-xs font-black">TIPO DE CLIENTE<input value={form.tipo_cliente} onChange={event => setForm({...form, tipo_cliente: event.target.value})} className={baseInput}/></label><label className="grid gap-1 text-xs font-black">TABELA DE PREÇO<select value={form.tabela_preco_id} onChange={event => setForm({...form, tabela_preco_id: event.target.value})} className={baseInput}><option value="">Preço padrão do produto</option>{priceTables.map(table => <option key={table.id} value={table.id}>{table.codigo} — {table.nome}</option>)}</select></label><label className="grid gap-1 text-xs font-black">DESCONTO PADRÃO (%)<input type="number" min="0" max="100" step="0.01" value={form.desconto} onChange={event => setForm({...form, desconto: event.target.value})} className={baseInput}/></label><label className="flex h-11 items-center gap-3 self-end rounded-md border border-slate-300 px-3 text-sm font-black"><input type="checkbox" checked={form.ativo} onChange={event => setForm({...form, ativo: event.target.checked})} className="h-5 w-5"/> CLIENTE ATIVO</label><div className="md:col-span-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700"><Building2 size={17} className="mr-2 inline"/>A tabela de preços define o valor comercial das peças para este cliente. Ao gerar um pedido, o preço do item será buscado primeiro nesta tabela; somente sem tabela/valor cadastrado será usado o preço padrão do produto.</div></div>}

            {tab === 'depara' && <div><div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700"><UserRound size={17} className="mr-2 inline"/>Use esta seção para vincular o código que o cliente usa ao produto interno do ERP.</div><p className="mt-4 text-sm font-semibold text-slate-600">O cadastro de De/Para continua utilizando a estrutura real já existente no ERP.</p></div>}
          </div>
          <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4"><button type="button" onClick={() => setOpen(false)} className="h-11 rounded-md border border-slate-300 bg-white px-5 text-sm font-black">CANCELAR</button><button type="button" onClick={() => void save()} disabled={busy} className="flex h-11 items-center gap-2 rounded-md bg-emerald-700 px-6 text-sm font-black text-white disabled:opacity-50"><Check size={17}/> SALVAR CLIENTE</button></footer>
        </section>
      </div>}
    </main>
  )
}
