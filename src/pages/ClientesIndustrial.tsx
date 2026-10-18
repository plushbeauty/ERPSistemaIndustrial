/**
 * @DATA_REVISAO_APROVACAO: 2026-10-18
 * @REVISAO: APROV-CLIENTES-001
 * @STATUS_APROVACAO: CLIENTES-INDUSTRIAL-UI-ALINHADA
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { BookOpen, Check, CreditCard, Filter, Pencil, Plus, Printer, RefreshCw, Search, ShieldCheck, Trash2, Users, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import VendasLayout from './VendasLayout'

type Client = { id: string; codigo: string | null; nome: string; documento: string | null; email: string | null; telefone: string | null; tipo_cliente: string | null; tabela_preco_id: string | null; desconto_padrao_percentual: number; ativo: boolean }
type PriceTable = { id: string; codigo: string; nome: string; ativo: boolean }
type ClientForm = { codigo: string; nome: string; documento: string; email: string; telefone: string; tipo_cliente: string; tabela_preco_id: string; desconto_padrao_percentual: string; ativo: boolean }

const empty: ClientForm = { codigo: '', nome: '', documento: '', email: '', telefone: '', tipo_cliente: 'PADRAO', tabela_preco_id: '', desconto_padrao_percentual: '0', ativo: true }
const field = 'h-8 w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-sky-600 focus:ring-1 focus:ring-sky-100 disabled:bg-slate-100'
const label = 'grid min-w-0 gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-600'
const button = 'inline-flex h-7 items-center justify-center gap-1.5 rounded-[2px] border border-slate-300 bg-white px-2.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40'
const primary = 'inline-flex h-7 items-center justify-center gap-1.5 rounded-[2px] border border-teal-800 bg-teal-700 px-3 text-[10px] font-black text-white hover:bg-teal-800 disabled:opacity-40'

export default function ClientesIndustrial() {
  const [rows, setRows] = useState<Client[]>([])
  const [tables, setTables] = useState<PriceTable[]>([])
  const [form, setForm] = useState<ClientForm>(empty)
  const [editing, setEditing] = useState<string | null>(null)
  const [selected, setSelected] = useState<Client | null>(null)
  const [show, setShow] = useState(false)
  const [filterOpen, setFilterOpen] = useState(true)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setBusy(true)
    setError('')
    try {
      const { data: empresa, error: companyError } = await supabase.rpc('erp_current_empresa_id')
      if (companyError || !empresa) throw companyError ?? new Error('Empresa da sessão não identificada.')
      const companyId = String(empresa)
      const [clients, priceTables] = await Promise.all([
        supabase.from('erp_clientes').select('id,codigo,nome,documento,email,telefone,tipo_cliente,tabela_preco_id,desconto_padrao_percentual,ativo').eq('empresa_id', companyId).order('nome').limit(1000),
        supabase.from('erp_tabelas_preco').select('id,codigo,nome,ativo').eq('empresa_id', companyId).eq('ativo', true).order('nome'),
      ])
      if (clients.error) throw clients.error
      if (priceTables.error) throw priceTables.error
      setRows((clients.data ?? []) as Client[])
      setTables((priceTables.data ?? []) as PriceTable[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os clientes.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => {
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const q = normalize(query.trim())
    return rows.filter(row => !q || normalize([row.codigo, row.nome, row.documento, row.email].filter(Boolean).join(' ')).includes(q))
  }, [rows, query])

  const startNew = () => { setEditing(null); setForm(empty); setError(''); setMessage(''); setShow(true) }
  const edit = (row: Client) => {
    setEditing(row.id)
    setForm({ codigo: row.codigo ?? '', nome: row.nome, documento: row.documento ?? '', email: row.email ?? '', telefone: row.telefone ?? '', tipo_cliente: row.tipo_cliente ?? 'PADRAO', tabela_preco_id: row.tabela_preco_id ?? '', desconto_padrao_percentual: String(row.desconto_padrao_percentual ?? 0), ativo: row.ativo })
    setError('')
    setMessage('')
    setShow(true)
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (!form.nome.trim()) throw new Error('Informe o nome ou a razão social.')
      const discount = Number(form.desconto_padrao_percentual)
      if (!Number.isFinite(discount) || discount < 0 || discount > 100) throw new Error('O desconto deve ficar entre 0% e 100%.')
      const { data: empresa, error: companyError } = await supabase.rpc('erp_current_empresa_id')
      if (companyError || !empresa) throw companyError ?? new Error('Empresa da sessão não identificada.')
      const companyId = String(empresa)
      const payload = { empresa_id: companyId, codigo: form.codigo.trim() || null, nome: form.nome.trim(), documento: form.documento.trim() || null, email: form.email.trim() || null, telefone: form.telefone.trim() || null, tipo_cliente: form.tipo_cliente.trim() || 'PADRAO', tabela_preco_id: form.tabela_preco_id || null, desconto_padrao_percentual: discount, ativo: form.ativo }
      const result = editing
        ? await supabase.from('erp_clientes').update(payload).eq('id', editing).eq('empresa_id', companyId)
        : await supabase.from('erp_clientes').insert(payload)
      if (result.error) throw result.error
      setShow(false)
      setMessage(editing ? 'Cadastro e política comercial atualizados.' : 'Cliente cadastrado com sucesso.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o cliente.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!selected || !window.confirm(`Excluir o cliente ${selected.nome}?`)) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { data: empresa, error: companyError } = await supabase.rpc('erp_current_empresa_id')
      if (companyError || !empresa) throw companyError ?? new Error('Empresa da sessão não identificada.')
      const result = await supabase.from('erp_clientes').delete().eq('id', selected.id).eq('empresa_id', String(empresa))
      if (result.error) throw result.error
      setSelected(null)
      setMessage('Cliente removido.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível excluir o cliente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <VendasLayout title="Ficha Cadastral de Clientes" subtitle="Cadastro mestre, contatos e parametrização comercial" onRefresh={() => { void load() }} titleActions={<Link to="/ajuda/clientes-industrial" className={button}><BookOpen size={12} /> POP / AJUDA</Link>}>
      <div className="space-y-3 p-1 text-xs">
        {(message || error) && <div role="alert" className={`rounded-[2px] border px-3 py-2 text-[10px] font-bold ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error || message}</div>}

        <section className="flex flex-col gap-2 rounded-[2px] border border-slate-200 bg-slate-50 p-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-600"><Users size={14} className="text-sky-700" /> Operação de cadastro de parceiros</div>
          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
            <button type="button" onClick={startNew} className={primary}><Plus size={12} /> NOVO CLIENTE</button>
            <button type="button" onClick={() => selected && edit(selected)} disabled={!selected || busy} className={button}><Pencil size={12} /> EDITAR</button>
            <button type="button" onClick={() => void remove()} disabled={!selected || busy} className={`${button} border-red-200 bg-red-50 text-red-700 hover:bg-red-100`}><Trash2 size={12} /> EXCLUIR</button>
            <button type="button" onClick={() => setFilterOpen(value => !value)} aria-expanded={filterOpen} className={button}><Filter size={12} /> FILTROS</button>
            <button type="button" onClick={() => void load()} disabled={busy} className={button}><RefreshCw size={12} className={busy ? 'animate-spin' : ''} /> ATUALIZAR</button>
            <button type="button" onClick={() => window.print()} className={button}><Printer size={12} /> IMPRIMIR</button>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2px] border border-slate-200 bg-white">
          <div className="flex flex-col gap-1 border-b border-slate-200 bg-[#F4FBFD] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-[#123B50]"><CreditCard size={13} /> Carteira de clientes</h2>
            <span className="text-[10px] font-semibold text-slate-500">{filtered.length} registro(s) {busy ? '• atualizando…' : ''}</span>
          </div>
          {filterOpen && <div className="grid grid-cols-1 items-end gap-3 border-b border-slate-200 bg-slate-50 p-3 md:grid-cols-12">
            <label className={`${label} md:col-span-10`}><span className="flex items-center gap-1"><Search size={11} /> Pesquisar nome, documento, código ou e-mail</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Digite para localizar…" className={field} /></label>
            <div className="md:col-span-2"><button type="button" onClick={() => setQuery('')} className={`${button} h-8 w-full`}><X size={12} /> LIMPAR</button></div>
          </div>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-[11px]">
              <thead className="h-8 bg-[#123B50] text-[9px] uppercase tracking-wide text-white"><tr>
                <th className="px-3 py-2 font-black">Código</th><th className="px-3 py-2 font-black">Razão social / documento</th><th className="px-3 py-2 font-black">Segmentação</th><th className="px-3 py-2 font-black">Tabela vinculada</th><th className="px-3 py-2 text-right font-black">Desconto</th><th className="px-3 py-2 font-black">Status</th>
              </tr></thead>
              <tbody>{filtered.map(row => <tr key={row.id} tabIndex={0} aria-selected={selected?.id === row.id} onClick={() => setSelected(row)} onDoubleClick={() => edit(row)} onKeyDown={event => { if (event.key === 'Enter') setSelected(row); if (event.key === 'Escape') setSelected(null) }} className={`h-9 cursor-pointer border-b border-slate-100 ${selected?.id === row.id ? 'bg-sky-50 font-bold ring-1 ring-inset ring-sky-300' : 'hover:bg-slate-50'}`}>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-slate-600">{row.codigo || '—'}</td>
                <td className="max-w-[360px] px-3 py-2"><div className="truncate font-bold text-slate-800">{row.nome}</div><div className="truncate text-[9px] font-normal text-slate-500">{row.documento || 'Documento não informado'}</div></td>
                <td className="whitespace-nowrap px-3 py-2">{row.tipo_cliente || 'PADRAO'}</td>
                <td className="max-w-[220px] truncate px-3 py-2">{tables.find(table => table.id === row.tabela_preco_id)?.nome || 'Preço base de fábrica'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-mono">{Number(row.desconto_padrao_percentual || 0).toFixed(2)}%</td>
                <td className="px-3 py-2"><span className={`inline-flex min-w-14 items-center justify-center rounded-[2px] px-1.5 py-1 text-[9px] font-black ${row.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{row.ativo ? 'ATIVO' : 'INATIVO'}</span></td>
              </tr>)}</tbody>
            </table>
            {!filtered.length && <div className="px-4 py-10 text-center text-[11px] text-slate-500">{busy ? 'Carregando clientes da empresa autenticada…' : 'Nenhum parceiro comercial localizado com esse filtro.'}</div>}
          </div>
        </section>

        {show && <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/60 p-3 sm:p-6">
          <form onSubmit={save} aria-labelledby="client-form-title" className="my-auto max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-[2px] border border-slate-300 bg-white shadow-2xl">
            <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-[#123B50] px-4 py-3 text-white">
              <div><div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-cyan-200"><ShieldCheck size={12} /> Dados fiscais e comerciais</div><h2 id="client-form-title" className="mt-1 text-sm font-black">{editing ? 'Ficha de alteração cadastral' : 'Abertura de cadastro mestre'}</h2></div>
              <button type="button" onClick={() => setShow(false)} aria-label="Fechar ficha" className="inline-flex h-7 w-7 items-center justify-center rounded-[2px] border border-white/30 text-white hover:bg-white/10"><X size={14} /></button>
            </header>
            <div className="grid grid-cols-1 gap-x-3 gap-y-3 p-4 sm:grid-cols-12">
              <label className={`${label} sm:col-span-3 lg:col-span-2`}>Código interno<input value={form.codigo} onChange={event => setForm({ ...form, codigo: event.target.value })} placeholder="CLI-001" className={field} /></label>
              <label className={`${label} sm:col-span-9 lg:col-span-7`}>Razão social / nome completo *<input required value={form.nome} onChange={event => setForm({ ...form, nome: event.target.value })} placeholder="Nome ou razão social" className={field} /></label>
              <label className={`${label} sm:col-span-6 lg:col-span-3`}>CNPJ / CPF<input value={form.documento} onChange={event => setForm({ ...form, documento: event.target.value })} placeholder="00.000.000/0000-00" className={`${field} font-mono`} /></label>
              <label className={`${label} sm:col-span-6 lg:col-span-5`}>E-mail de faturamento<input type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} placeholder="nfe@empresa.com.br" className={`${field} font-mono`} /></label>
              <label className={`${label} sm:col-span-6 lg:col-span-3`}>Telefone de contato<input value={form.telefone} onChange={event => setForm({ ...form, telefone: event.target.value })} placeholder="(00) 00000-0000" className={field} /></label>
              <label className={`${label} sm:col-span-6 lg:col-span-4`}>Segmentação operacional<select value={form.tipo_cliente} onChange={event => setForm({ ...form, tipo_cliente: event.target.value })} className={field}><option value="PADRAO">PADRÃO</option><option value="INDUSTRIAL">INDUSTRIAL</option><option value="REVENDA">REVENDA</option><option value="DISTRIBUIDOR">DISTRIBUIDOR</option><option value="OUTRO">OUTRO</option></select></label>
              <label className={`${label} sm:col-span-8 lg:col-span-7`}>Tabela de preço vinculada<select value={form.tabela_preco_id} onChange={event => setForm({ ...form, tabela_preco_id: event.target.value })} className={field}><option value="">Preço base de fábrica</option>{tables.map(table => <option key={table.id} value={table.id}>{table.codigo} • {table.nome}</option>)}</select></label>
              <label className={`${label} sm:col-span-4 lg:col-span-2`}>Desconto padrão %<input type="number" min="0" max="100" step="0.01" value={form.desconto_padrao_percentual} onChange={event => setForm({ ...form, desconto_padrao_percentual: event.target.value })} className={`${field} text-right font-mono`} /></label>
              <label className={`${label} sm:col-span-6 lg:col-span-3`}>Situação do cadastro<select value={form.ativo ? 'SIM' : 'NAO'} onChange={event => setForm({ ...form, ativo: event.target.value === 'SIM' })} className={field}><option value="SIM">ATIVO</option><option value="NAO">INATIVO</option></select></label>
            </div>
            <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setShow(false)} className={button}><X size={12} /> CANCELAR</button>
              <button type="submit" disabled={busy} className={primary}><Check size={12} /> {busy ? 'SALVANDO…' : 'SALVAR CLIENTE'}</button>
            </footer>
          </form>
        </div>}
      </div>
    </VendasLayout>
  )
}
