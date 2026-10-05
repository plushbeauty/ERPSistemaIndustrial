import { useEffect, useMemo, useState } from 'react'
import { Boxes, ClipboardList, Factory, History, PackageSearch, Pencil, Plus, RefreshCw, Search, Settings2, ShieldCheck, XCircle } from 'lucide-react'
import VendasLayout, { type SalesNavSection } from './VendasLayout'
import { supabase } from '../lib/supabaseClient'

type Machine = {
  id: string
  codigo: string
  nome: string
  tipo: string | null
  fabricante: string | null
  modelo: string | null
  status: string | null
  ativo: boolean
  valor_hora_custo: number
}

type Mold = {
  id: string
  codigo: string
  nome: string
  tipo: string
  status: string
  produto_id: string | null
  numero_cavidades: number
  cavidades_ativas: number
  ciclos_atuais: number
  limite_ciclos: number
  ativo: boolean
  localizacao_fisica: string | null
}

type HistoryRow = { id:string; entidade:string; entidade_id:string; acao:string; codigo:string|null; descricao:string|null; detalhes:Record<string,unknown>; criado_em:string }

type ProductionOrder = {
  id: string
  numero_op: string
  quantidade: number
  quantidade_produzida: number
  status: string
  maquina_id: string | null
}

type MachineForm = {
  id: string | null
  codigo: string
  nome: string
  tipo: string
  fabricante: string
  modelo: string
  valor_hora_custo: string
}

type MoldForm = {
  id: string | null
  codigo: string
  nome: string
  status: string
  numero_cavidades: string
  cavidades_ativas: string
  limite_ciclos: string
  localizacao_fisica: string
}

const injectionNav: SalesNavSection[] = [
  { label:'Injeção', items:[{ label:'Painel de injeção', href:'/processos/injecao', icon:Factory },{ label:'Processos e receitas', href:'/processos/injecao', icon:Settings2 },{ label:'Fichas de processo', href:'/fichas-processo', icon:ClipboardList }]},
  { label:'Integrações', items:[{ label:'PCP e ordens', href:'/pcp', icon:Boxes },{ label:'Qualidade', href:'/qualidade', icon:ShieldCheck },{ label:'Estoque', href:'/estoque', icon:PackageSearch }]},
]
const emptyMachine: MachineForm = { id: null, codigo: '', nome: '', tipo: 'INJETORA', fabricante: '', modelo: '', valor_hora_custo: '0' }
const emptyMold: MoldForm = { id: null, codigo: '', nome: '', status: 'DISPONIVEL', numero_cavidades: '1', cavidades_ativas: '1', limite_ciclos: '0', localizacao_fisica: '' }

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export default function InjecaoIndustrial() {
  const [companyId, setCompanyId] = useState('')
  const [machines, setMachines] = useState<Machine[]>([])
  const [molds, setMolds] = useState<Mold[]>([])
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [statusFilter, setStatusFilter] = useState('TODOS')
  const [historyFilter, setHistoryFilter] = useState('TODOS')
  const [query, setQuery] = useState('')
  const [machineForm, setMachineForm] = useState<MachineForm>(emptyMachine)
  const [moldForm, setMoldForm] = useState<MoldForm>(emptyMold)
  const [form, setForm] = useState<'machine' | 'mold' | null>(null)
  const [busy, setBusy] = useState(false)
  const [canCreate, setCanCreate] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load(): Promise<void> {
    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const id = String(company.data)
      const [machineResult, moldResult, orderResult, createPermission, editPermission] = await Promise.all([
        supabase.from('erp_maquinas').select('id,codigo,nome,tipo,fabricante,modelo,status,ativo,valor_hora_custo').eq('empresa_id', id).order('codigo'),
        supabase.from('erp_moldes').select('id,codigo,nome,tipo,status,produto_id,numero_cavidades,cavidades_ativas,ciclos_atuais,limite_ciclos,ativo,localizacao_fisica').eq('empresa_id', id).eq('tipo', 'INJECAO').order('codigo'),
        supabase.from('erp_ordens_producao').select('id,numero_op,quantidade,quantidade_produzida,status,maquina_id').eq('empresa_id', id).order('numero_op', { ascending: false }).limit(100),
        supabase.rpc('erp_has_permission', { p_modulo: 'production', p_acao: 'criar' }),
        supabase.rpc('erp_has_permission', { p_modulo: 'production', p_acao: 'editar' }),
      ])
      if (machineResult.error) throw machineResult.error
      if (moldResult.error) throw moldResult.error
      if (orderResult.error) throw orderResult.error
      setCompanyId(id)
      setMachines((machineResult.data ?? []) as Machine[])
      setMolds((moldResult.data ?? []) as Mold[])
      setOrders((orderResult.data ?? []) as ProductionOrder[])
      const historyResult = await supabase.from('erp_injecao_historico').select('id,entidade,entidade_id,acao,codigo,descricao,detalhes,criado_em').eq('empresa_id', id).order('criado_em', { ascending:false }).limit(100)
      setHistory(historyResult.error ? [] : (historyResult.data ?? []) as HistoryRow[])
      setCanCreate(createPermission.error ? false : Boolean(createPermission.data))
      setCanEdit(editPermission.error ? false : Boolean(editPermission.data))
    } catch (cause) {
      setError(messageOf(cause, 'Falha ao carregar o módulo de injeção.'))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  const filteredMachines = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('pt-BR')
    if (!needle) return machines.filter(machine => (statusFilter === 'TODOS' || (machine.ativo ? (machine.status ?? 'ATIVO') : 'INATIVO') === statusFilter) && (!needle || [machine.codigo, machine.nome, machine.tipo ?? '', machine.status ?? ''].some(value => value.toLocaleLowerCase('pt-BR').includes(needle))))
  }, [machines, query, statusFilter])

  const filteredMolds = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('pt-BR')
    if (!needle) return molds.filter(mold => (statusFilter === 'TODOS' || (mold.ativo ? mold.status : 'INATIVO') === statusFilter) && (!needle || [mold.codigo, mold.nome, mold.status, mold.localizacao_fisica ?? ''].some(value => value.toLocaleLowerCase('pt-BR').includes(needle))))
  }, [molds, query, statusFilter])

  const activeOrders = orders.filter(order => !['concluida', 'concluído', 'cancelada', 'cancelado'].includes(order.status.toLocaleLowerCase('pt-BR')))
  const visibleHistory = history.filter(item => historyFilter === 'TODOS' || item.entidade === historyFilter)

  async function saveMachine(): Promise<void> {
    if (!canCreate && !machineForm.id) { setError('Seu perfil não possui permissão para criar recursos de produção.'); return }
    if (!canEdit && machineForm.id) { setError('Seu perfil não possui permissão para editar recursos de produção.'); return }
    if (!companyId || !machineForm.codigo.trim() || !machineForm.nome.trim()) { setError('Código e nome da injetora são obrigatórios.'); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const payload = {
        empresa_id: companyId,
        codigo: machineForm.codigo.trim(),
        nome: machineForm.nome.trim(),
        tipo: machineForm.tipo.trim() || 'INJETORA',
        fabricante: machineForm.fabricante.trim() || null,
        modelo: machineForm.modelo.trim() || null,
        valor_hora_custo: Number(machineForm.valor_hora_custo || 0),
        ativo: true,
      }
      const result = machineForm.id
        ? await supabase.from('erp_maquinas').update(payload).eq('id', machineForm.id).eq('empresa_id', companyId)
        : await supabase.from('erp_maquinas').insert(payload)
      if (result.error) throw result.error
      setForm(null); setMachineForm(emptyMachine); setMessage(machineForm.id ? 'Injetora atualizada.' : 'Injetora cadastrada.')
      await load()
    } catch (cause) {
      setError(messageOf(cause, 'Não foi possível gravar a injetora.'))
    } finally { setBusy(false) }
  }

  async function saveMold(): Promise<void> {
    if (!canCreate && !moldForm.id) { setError('Seu perfil não possui permissão para criar recursos de produção.'); return }
    if (!canEdit && moldForm.id) { setError('Seu perfil não possui permissão para editar recursos de produção.'); return }
    if (!companyId || !moldForm.codigo.trim() || !moldForm.nome.trim()) { setError('Código e nome do molde são obrigatórios.'); return }
    const cavities = Math.max(1, Number(moldForm.numero_cavidades || 1))
    const activeCavities = Math.max(0, Math.min(cavities, Number(moldForm.cavidades_ativas || cavities)))
    setBusy(true); setError(''); setMessage('')
    try {
      const payload = {
        empresa_id: companyId,
        codigo: moldForm.codigo.trim(),
        nome: moldForm.nome.trim(),
        tipo: 'INJECAO',
        status: moldForm.status,
        numero_cavidades: cavities,
        cavidades: cavities,
        cavidades_ativas: activeCavities,
        limite_ciclos: Math.max(0, Number(moldForm.limite_ciclos || 0)),
        localizacao_fisica: moldForm.localizacao_fisica.trim() || null,
        ativo: true,
      }
      const result = moldForm.id
        ? await supabase.from('erp_moldes').update(payload).eq('id', moldForm.id).eq('empresa_id', companyId)
        : await supabase.from('erp_moldes').insert(payload)
      if (result.error) throw result.error
      setForm(null); setMoldForm(emptyMold); setMessage(moldForm.id ? 'Molde atualizado.' : 'Molde cadastrado.')
      await load()
    } catch (cause) {
      setError(messageOf(cause, 'Não foi possível gravar o molde.'))
    } finally { setBusy(false) }
  }

  async function inactivate(table: 'erp_maquinas' | 'erp_moldes', id: string): Promise<void> {
    if (!canEdit) { setError('Seu perfil não possui permissão para editar recursos de produção.'); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await supabase.from(table).update({ ativo: false }).eq('id', id).eq('empresa_id', companyId)
      if (result.error) throw result.error
      setMessage(table === 'erp_maquinas' ? 'Injetora inativada.' : 'Molde inativado.')
      await load()
    } catch (cause) {
      setError(messageOf(cause, 'Não foi possível inativar o registro.'))
    } finally { setBusy(false) }
  }

  return (
    <VendasLayout title="Injeção Plástica" subtitle="Injetoras • moldes • ordens • histórico" onRefresh={() => void load()} navSections={injectionNav}>
    <main className="min-h-screen bg-[#F4FBFD] p-3 text-xs text-slate-800 md:p-4">
      <header className="mb-3 flex flex-wrap items-center gap-2 border border-slate-300 bg-white px-3 py-2">
        <Factory size={18} className="text-[#3A9D78]" />
        <div className="mr-auto min-w-0">
          <span className="text-[10px] tracking-wide text-[#3A9D78]">MANUFATURA • INJEÇÃO</span>
          <h1 className="text-lg text-[#123B50]">Injeção Plástica</h1>
          <p className="text-[11px] text-slate-500">Injetoras, moldes, cavidades, ciclos e ordens de produção da empresa autenticada.</p>
        </div>
        <button type="button" title="Atualizar" aria-label="Atualizar módulo" onClick={() => void load()} disabled={busy} className="flex h-8 items-center gap-1 border border-slate-300 bg-white px-2 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={13} /> Atualizar</button>
      </header>

      {(message || error) && <div role={error ? 'alert' : 'status'} className={error ? 'mb-3 border border-red-300 bg-red-50 px-3 py-2 text-red-800' : 'mb-3 border border-emerald-300 bg-emerald-50 px-3 py-2 text-emerald-800'}>{error || message}</div>}

      <section className="mb-3 flex flex-wrap items-center gap-2 border border-slate-300 bg-white p-2">
        <label className="flex h-8 min-w-64 flex-1 items-center gap-2 border border-slate-300 px-2"><Search size={13} /><input className="min-w-0 flex-1 outline-none" value={query} onChange={event => setQuery(event.target.value)} placeholder="Código, nome, tipo ou status..." /></label>
        <select aria-label="Filtrar status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="h-8 border border-slate-300 bg-white px-2">
          <option value="TODOS">Todos os status</option><option value="DISPONIVEL">Disponível</option><option value="ATIVA">Ativa</option><option value="EM_PRODUCAO">Em produção</option><option value="EM_MANUTENCAO">Em manutenção</option><option value="INATIVO">Inativo</option>
        </select>
        <button type="button" title="Nova injetora" disabled={!canCreate || busy} onClick={() => { setMachineForm(emptyMachine); setForm('machine') }} className="flex h-8 items-center gap-1 border border-slate-400 bg-white px-2 hover:bg-slate-50 disabled:opacity-50"><Plus size={13} /> Nova Injetora</button>
        <button type="button" title="Novo molde" disabled={!canCreate || busy} onClick={() => { setMoldForm(emptyMold); setForm('mold') }} className="flex h-8 items-center gap-1 border border-slate-400 bg-white px-2 hover:bg-slate-50 disabled:opacity-50"><Plus size={13} /> Novo Molde</button>
      </section>

      <section className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          ['Injetoras', String(machines.filter(item => item.ativo).length)],
          ['Moldes', String(molds.filter(item => item.ativo).length)],
          ['OPs abertas', String(activeOrders.length)],
          ['Cavidades ativas', String(molds.filter(item => item.ativo).reduce((sum, item) => sum + item.cavidades_ativas, 0))]
        ].map(([label, value]) => <div key={label} className="border border-slate-300 bg-white px-3 py-2"><span className="block text-[10px] text-slate-500">{label}</span><strong className="text-base text-[#123B50]">{value}</strong></div>)}
      </section>

      <div className="grid gap-3 xl:grid-cols-2">
        <section className="overflow-x-auto border border-slate-300 bg-white">
          <div className="flex items-center justify-between border-b border-slate-300 px-3 py-2"><h2 className="text-sm text-[#123B50]">Injetoras</h2><span className="text-[10px] text-slate-500">{filteredMachines.length} registros</span></div>
          <table className="w-full min-w-[760px] border-collapse text-[11px]">
            <thead><tr className="bg-slate-100 text-left"><th className="p-2">Código</th><th className="p-2">Nome</th><th className="p-2">Fabricante / Modelo</th><th className="p-2">Status</th><th className="p-2 text-right">Custo/h</th><th className="p-2">Ações</th></tr></thead>
            <tbody>{filteredMachines.map(machine => <tr key={machine.id} className="border-t border-slate-200">
              <td className="p-2">{machine.codigo}</td><td className="p-2">{machine.nome}</td><td className="p-2">{[machine.fabricante, machine.modelo].filter(Boolean).join(' / ') || '—'}</td><td className="p-2">{machine.ativo ? machine.status ?? 'ativo' : 'INATIVA'}</td><td className="p-2 text-right">{Number(machine.valor_hora_custo).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
              <td className="p-2"><div className="flex gap-1"><button type="button" title="Editar injetora" aria-label={`Editar injetora ${machine.codigo}`} disabled={!canEdit || busy} onClick={() => { setMachineForm({ id: machine.id, codigo: machine.codigo, nome: machine.nome, tipo: machine.tipo ?? 'INJETORA', fabricante: machine.fabricante ?? '', modelo: machine.modelo ?? '', valor_hora_custo: String(machine.valor_hora_custo ?? 0) }); setForm('machine') }} className="flex h-7 w-7 items-center justify-center border border-slate-300 hover:bg-slate-100 disabled:opacity-50"><Pencil size={13} /></button>{machine.ativo && <button type="button" title="Inativar injetora" aria-label={`Inativar injetora ${machine.codigo}`} disabled={!canEdit || busy} onClick={() => window.confirm(`Inativar a injetora ${machine.codigo}?`) && void inactivate('erp_maquinas', machine.id)} className="flex h-7 w-7 items-center justify-center border border-slate-300 hover:bg-red-50 disabled:opacity-50"><XCircle size={13} /></button>}</div></td>
            </tr>)}{!filteredMachines.length && <tr><td colSpan={6} className="p-6 text-center text-slate-500">Nenhuma injetora encontrada no banco da empresa.</td></tr>}</tbody>
          </table>
        </section>

        <section className="overflow-x-auto border border-slate-300 bg-white">
          <div className="flex items-center justify-between border-b border-slate-300 px-3 py-2"><h2 className="text-sm text-[#123B50]">Moldes de injeção</h2><span className="text-[10px] text-slate-500">{filteredMolds.length} registros</span></div>
          <table className="w-full min-w-[760px] border-collapse text-[11px]">
            <thead><tr className="bg-slate-100 text-left"><th className="p-2">Código</th><th className="p-2">Nome</th><th className="p-2 text-right">Cavidades</th><th className="p-2 text-right">Ciclos</th><th className="p-2">Status</th><th className="p-2">Ações</th></tr></thead>
            <tbody>{filteredMolds.map(mold => <tr key={mold.id} className="border-t border-slate-200">
              <td className="p-2">{mold.codigo}</td><td className="p-2">{mold.nome}</td><td className="p-2 text-right">{mold.cavidades_ativas}/{mold.numero_cavidades}</td><td className="p-2 text-right">{Number(mold.ciclos_atuais).toLocaleString('pt-BR')} / {Number(mold.limite_ciclos).toLocaleString('pt-BR')}</td><td className="p-2">{mold.ativo ? mold.status : 'INATIVO'}</td>
              <td className="p-2"><div className="flex gap-1"><button type="button" title="Editar molde" aria-label={`Editar molde ${mold.codigo}`} disabled={!canEdit || busy} onClick={() => { setMoldForm({ id: mold.id, codigo: mold.codigo, nome: mold.nome, status: mold.status, numero_cavidades: String(mold.numero_cavidades), cavidades_ativas: String(mold.cavidades_ativas), limite_ciclos: String(mold.limite_ciclos), localizacao_fisica: mold.localizacao_fisica ?? '' }); setForm('mold') }} className="flex h-7 w-7 items-center justify-center border border-slate-300 hover:bg-slate-100 disabled:opacity-50"><Pencil size={13} /></button>{mold.ativo && <button type="button" title="Inativar molde" aria-label={`Inativar molde ${mold.codigo}`} disabled={!canEdit || busy} onClick={() => window.confirm(`Inativar o molde ${mold.codigo}?`) && void inactivate('erp_moldes', mold.id)} className="flex h-7 w-7 items-center justify-center border border-slate-300 hover:bg-red-50 disabled:opacity-50"><XCircle size={13} /></button>}</div></td>
            </tr>)}{!filteredMolds.length && <tr><td colSpan={6} className="p-6 text-center text-slate-500">Nenhum molde de injeção encontrado no banco da empresa.</td></tr>}</tbody>
          </table>
        </section>
      </div>

      <section className="mt-3 overflow-x-auto border border-slate-300 bg-white">
        <div className="border-b border-slate-300 px-3 py-2"><h2 className="text-sm text-[#123B50]">Ordens de produção vinculadas a máquinas</h2></div>
        <table className="w-full min-w-[720px] border-collapse text-[11px]"><thead><tr className="bg-slate-100 text-left"><th className="p-2">OP</th><th className="p-2">Status</th><th className="p-2 text-right">Planejada</th><th className="p-2 text-right">Produzida</th><th className="p-2">Injetora</th></tr></thead>
          <tbody>{activeOrders.map(order => <tr key={order.id} className="border-t border-slate-200"><td className="p-2">{order.numero_op}</td><td className="p-2">{order.status}</td><td className="p-2 text-right">{Number(order.quantidade).toLocaleString('pt-BR')}</td><td className="p-2 text-right">{Number(order.quantidade_produzida).toLocaleString('pt-BR')}</td><td className="p-2">{machines.find(machine => machine.id === order.maquina_id)?.codigo ?? 'Não vinculada'}</td></tr>)}</tbody>
        </table>
        {!activeOrders.length && <p className="p-6 text-center text-slate-500">Nenhuma OP aberta vinculada ao módulo.</p>}
      </section>

      <section className="mt-3 overflow-x-auto border border-slate-300 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 px-3 py-2"><div><h2 className="text-sm text-[#123B50]">Histórico do módulo</h2><p className="text-[10px] text-slate-500">Inclusões, alterações e inativações registradas no banco.</p></div><div className="flex items-center gap-2"><History size={14}/><select value={historyFilter} onChange={event=>setHistoryFilter(event.target.value)} className="h-8 border border-slate-300 bg-white px-2 text-[11px]"><option value="TODOS">Todos</option><option value="INJETORA">Injetoras</option><option value="MOLDE">Moldes</option></select></div></div>
        <table className="w-full min-w-[760px] border-collapse text-[11px]"><thead><tr className="bg-slate-100 text-left"><th className="p-2">Data</th><th className="p-2">Entidade</th><th className="p-2">Código</th><th className="p-2">Ação</th><th className="p-2">Descrição</th></tr></thead><tbody>{visibleHistory.map(item=><tr key={item.id} className="border-t border-slate-200"><td className="p-2">{new Date(item.criado_em).toLocaleString('pt-BR')}</td><td className="p-2">{item.entidade}</td><td className="p-2 font-semibold">{item.codigo ?? '—'}</td><td className="p-2">{item.acao}</td><td className="p-2">{item.descricao ?? '—'}</td></tr>)}{!visibleHistory.length&&<tr><td colSpan={5} className="p-6 text-center text-slate-500">Nenhum evento registrado.</td></tr>}</tbody></table>
      </section>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl border border-slate-300 bg-white shadow-xl">
            <header className="flex items-center justify-between border-b border-slate-300 px-3 py-2"><h2 className="text-sm text-[#123B50]">{form === 'machine' ? (machineForm.id ? 'Editar Injetora' : 'Nova Injetora') : (moldForm.id ? 'Editar Molde' : 'Novo Molde')}</h2><button type="button" title="Fechar" aria-label="Fechar formulário" onClick={() => setForm(null)} className="flex h-7 w-7 items-center justify-center border border-slate-300"><XCircle size={14} /></button></header>
            {form === 'machine' ? (
              <div className="grid gap-2 p-3 sm:grid-cols-2">
                {[
                  ['Código','codigo'],['Nome','nome'],['Tipo','tipo'],['Fabricante','fabricante'],['Modelo','modelo'],['Custo/hora','valor_hora_custo']
                ].map(([label,key]) => <label key={key} className="grid gap-1 text-[10px] text-slate-600">{label}<input className="h-8 border border-slate-300 px-2 text-xs outline-none focus:border-[#3A9D78]" value={machineForm[key as keyof MachineForm] as string} onChange={event => setMachineForm(previous => ({ ...previous, [key]: event.target.value }))} /></label>)}
                <div className="sm:col-span-2 flex justify-end gap-2 border-t pt-3"><button type="button" onClick={() => setForm(null)} className="h-8 border border-slate-300 px-3">Cancelar</button><button type="button" disabled={busy} onClick={() => void saveMachine()} className="h-8 border border-[#3A9D78] bg-[#3A9D78] px-3 text-white disabled:opacity-50">{busy ? 'Gravando…' : 'Gravar Injetora'}</button></div>
              </div>
            ) : (
              <div className="grid gap-2 p-3 sm:grid-cols-2">
                {[
                  ['Código','codigo'],['Nome','nome'],['Status','status'],['Nº cavidades','numero_cavidades'],['Cavidades ativas','cavidades_ativas'],['Limite de ciclos','limite_ciclos'],['Localização','localizacao_fisica']
                ].map(([label,key]) => <label key={key} className="grid gap-1 text-[10px] text-slate-600">{label}<input className="h-8 border border-slate-300 px-2 text-xs outline-none focus:border-[#3A9D78]" value={moldForm[key as keyof MoldForm] as string} onChange={event => setMoldForm(previous => ({ ...previous, [key]: event.target.value }))} /></label>)}
                <div className="sm:col-span-2 flex justify-end gap-2 border-t pt-3"><button type="button" onClick={() => setForm(null)} className="h-8 border border-slate-300 px-3">Cancelar</button><button type="button" disabled={busy} onClick={() => void saveMold()} className="h-8 border border-[#3A9D78] bg-[#3A9D78] px-3 text-white disabled:opacity-50">{busy ? 'Gravando…' : 'Gravar Molde'}</button></div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
    </main>
    </VendasLayout>
  )
}
