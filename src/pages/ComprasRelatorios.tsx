/**
 * @DATA_REVISAO_APROVACAO: 2026-10-18
 * @HORA_REVISAO: 19:20 America/Sao_Paulo
 * @REVISAO: COMPRAS-RELATORIOS-R2
 * @STATUS_APROVACAO: COMPRAS-RELATORIOS-PREMIUM-UI-OK
 */
import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Printer, RefreshCw, Search, TrendingUp, DollarSign, ClipboardList, ShieldAlert } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Purchase = { id: string; numero: number; status: string; total: number; data_pedido: string; fornecedor_id: string | null; fiscal_status: string | null }
type Request = { id: string; status: string; prioridade: string; created_at: string }
type Rfq = { id: string; status: string; created_at: string }
type Supplier = { id: string; razao_social: string; nome_fantasia: string | null }
const money = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const monthKey = (v: string) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { month: '2-digit', year: '2-digit' }) }
const input = 'h-8 w-full rounded-sm border border-slate-300 bg-white px-2 text-xs text-slate-800 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-100'

export default function ComprasRelatorios() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [rfqs, setRfqs] = useState<Rfq[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = async () => {
    setBusy(true); setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const id = String(company.data)
      const [p, r, f, s] = await Promise.all([
        fetchAllPages<Purchase>((a, b) => supabase.from('erp_pedidos_compra').select('id,numero,status,total,data_pedido,fornecedor_id,fiscal_status', { count: 'exact' }).eq('empresa_id', id).order('data_pedido', { ascending: false }).range(a, b)),
        fetchAllPages<Request>((a, b) => supabase.from('erp_solicitacoes_compra').select('id,status,prioridade,created_at', { count: 'exact' }).eq('empresa_id', id).order('created_at', { ascending: false }).range(a, b)),
        fetchAllPages<Rfq>((a, b) => supabase.from('erp_rfq').select('id,status,created_at', { count: 'exact' }).eq('empresa_id', id).order('created_at', { ascending: false }).range(a, b)),
        fetchAllPages<Supplier>((a, b) => supabase.from('erp_fornecedores').select('id,razao_social,nome_fantasia', { count: 'exact' }).eq('empresa_id', id).range(a, b)),
      ])
      setPurchases(p); setRequests(r); setRfqs(f); setSuppliers(s)
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar relatórios de compras.') }
    finally { setBusy(false) }
  }
  useEffect(() => { void load() }, [])
  const supplierMap = useMemo(() => new Map(suppliers.map(s => [s.id, s.nome_fantasia || s.razao_social])), [suppliers])
  const visible = useMemo(() => purchases.filter(p => `${p.numero} ${supplierMap.get(p.fornecedor_id || '') || ''} ${p.status} ${p.fiscal_status || ''}`.toLowerCase().includes(q.toLowerCase())), [purchases, q, supplierMap])
  const total = visible.reduce((sum, p) => sum + Number(p.total || 0), 0)
  const approved = visible.filter(p => ['APROVADO', 'RECEBIMENTO_PARCIAL', 'RECEBIDO'].includes(String(p.status).toUpperCase())).length
  const pending = visible.filter(p => String(p.status).toUpperCase() === 'PENDENTE_APROVACAO').length
  const blocked = visible.filter(p => String(p.fiscal_status).toUpperCase() === 'BLOQUEADO').length
  const byMonth = useMemo(() => { const m = new Map<string, number>(); visible.forEach(p => { const k = monthKey(p.data_pedido); m.set(k, (m.get(k) || 0) + Number(p.total || 0)) }); return [...m].reverse().slice(-12).map(([mes, total]) => ({ mes, total })) }, [visible])
  const byStatus = useMemo(() => { const m = new Map<string, number>(); visible.forEach(p => m.set(p.status || 'Sem status', (m.get(p.status || 'Sem status') || 0) + 1)); return [...m].map(([status, quantidade]) => ({ status, quantidade })) }, [visible])
  const topSuppliers = useMemo(() => { const m = new Map<string, number>(); visible.forEach(p => { if (p.fornecedor_id) m.set(p.fornecedor_id, (m.get(p.fornecedor_id) || 0) + Number(p.total || 0)) }); return [...m].sort((a,b) => b[1]-a[1]).slice(0,8).map(([id,total]) => ({ fornecedor: (supplierMap.get(id) || 'Fornecedor').slice(0,24), total })) }, [visible, supplierMap])
  const kpis = [
    { label: 'Pedidos filtrados', value: String(visible.length), icon: ClipboardList, color: 'border-l-slate-500', text: 'text-slate-800' },
    { label: 'Capital alocado', value: money(total), icon: DollarSign, color: 'border-l-emerald-500', text: 'text-emerald-800' },
    { label: 'Pedidos concluídos', value: String(approved), icon: TrendingUp, color: 'border-l-sky-500', text: 'text-sky-800' },
    { label: 'Aguardando aprovação', value: String(pending), icon: ClipboardList, color: 'border-l-amber-500', text: 'text-amber-700' },
    { label: 'Bloqueios fiscais', value: String(blocked), icon: ShieldAlert, color: 'border-l-rose-500', text: 'text-rose-700' },
  ]
  return <VendasLayout title="Dashboard de Performance de Suprimentos" subtitle="Gastos, fornecedores, aprovações e indicadores fiscais" onRefresh={() => void load()}>
    <main className="space-y-3 p-1 text-[11px] text-slate-800">
      {error && <div role="alert" className="border border-rose-200 bg-rose-50 p-2 text-rose-800">{error}</div>}
      <section className="no-print grid grid-cols-1 items-end gap-2 border border-slate-200 bg-slate-50 p-2 md:grid-cols-12">
        <label className="grid gap-1 md:col-span-8"><span className="text-[9px] font-black uppercase tracking-wide text-slate-500"><Search size={12} className="mr-1 inline"/>Pesquisa de pedidos e fornecedores</span><input className={input} value={q} onChange={e => setQ(e.target.value)} placeholder="Número, fornecedor, status ou situação fiscal"/></label>
        <div className="flex gap-2 md:col-span-4"><button type="button" onClick={() => void load()} disabled={busy} className="flex h-8 flex-1 items-center justify-center gap-1 border border-slate-300 bg-white px-2 text-[10px] font-bold disabled:opacity-50"><RefreshCw size={12} className={busy ? 'animate-spin' : ''}/>{busy ? 'Lendo…' : 'Atualizar'}</button><button type="button" onClick={() => window.print()} className="flex h-8 flex-1 items-center justify-center gap-1 bg-sky-700 px-2 text-[10px] font-bold text-white"><Printer size={12}/>Imprimir / PDF</button></div>
      </section>
      <section className="grid grid-cols-2 gap-2 md:grid-cols-5">{kpis.map(({label,value,icon:Icon,color,text}) => <article key={label} className={`min-w-0 border border-slate-200 border-l-4 bg-white p-2.5 shadow-sm ${color}`}><div className="flex items-center justify-between gap-1 text-[9px] font-black uppercase text-slate-500"><span>{label}</span><Icon size={14}/></div><strong className={`mt-1 block truncate font-mono text-base ${text}`} title={value}>{value}</strong></article>)}</section>
      <section className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <article className="min-w-0 border border-slate-200 bg-white p-3 xl:col-span-7"><h2 className="mb-2 flex items-center gap-2 text-xs font-black text-[#123B50]"><BarChart3 size={14}/>Histórico de desembolso mensal</h2><div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={byMonth} margin={{top:8,right:8,bottom:4,left:8}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="mes" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} tickFormatter={v => `R$${Number(v)/1000}k`}/><Tooltip formatter={v => money(Number(v))}/><Bar dataKey="total" name="Total" fill="#2D8DB8" radius={[2,2,0,0]}/></BarChart></ResponsiveContainer></div></article>
        <article className="min-w-0 border border-slate-200 bg-white p-3 xl:col-span-5"><h2 className="mb-2 text-xs font-black text-[#123B50]">Volume por etapa</h2><div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={byStatus} layout="vertical" margin={{top:4,right:12,bottom:4,left:8}}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" tick={{fontSize:10}} allowDecimals={false}/><YAxis type="category" dataKey="status" width={110} tick={{fontSize:9}}/><Tooltip/><Bar dataKey="quantidade" name="Pedidos" fill="#123B50" radius={[0,2,2,0]}/></BarChart></ResponsiveContainer></div></article>
        <article className="min-w-0 border border-slate-200 bg-white p-3 xl:col-span-12"><h2 className="mb-2 text-xs font-black text-[#123B50]">Maiores fornecedores por valor de pedidos</h2><div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={topSuppliers} layout="vertical" margin={{top:4,right:20,bottom:4,left:8}}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" tick={{fontSize:10}} tickFormatter={v => `R$${Number(v)/1000}k`}/><YAxis type="category" dataKey="fornecedor" width={150} tick={{fontSize:9}}/><Tooltip formatter={v => money(Number(v))}/><Bar dataKey="total" name="Total" fill="#16796f" radius={[0,2,2,0]}/></BarChart></ResponsiveContainer></div></article>
      </section>
      <section className="overflow-hidden border border-slate-200 bg-white"><header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 p-2"><strong className="text-[10px] font-black uppercase">Pedidos de compra recentes</strong><span className="text-[10px] text-slate-500">{requests.length} solicitações · {rfqs.length} RFQs · {suppliers.length} fornecedores</span></header><div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left"><thead className="bg-[#123B50] text-[9px] uppercase text-white"><tr>{['Pedido','Fornecedor','Status','Fiscal','Data','Total'].map(x=><th key={x} className="p-2">{x}</th>)}</tr></thead><tbody>{visible.slice(0,100).map(p=><tr key={p.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50"><td className="p-2 font-mono">PC-{String(p.numero).padStart(5,'0')}</td><td className="p-2">{supplierMap.get(p.fornecedor_id || '') || '—'}</td><td className="p-2">{p.status}</td><td className="p-2">{p.fiscal_status || 'Não analisado'}</td><td className="p-2">{p.data_pedido ? new Date(p.data_pedido).toLocaleDateString('pt-BR') : '—'}</td><td className="p-2 font-mono">{money(p.total)}</td></tr>)}{!visible.length && <tr><td colSpan={6} className="p-5 text-center text-slate-500">Nenhum pedido encontrado.</td></tr>}</tbody></table></div></section>
    </main>
  </VendasLayout>
}
