/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
/**
 * SYSNQRA — PCP / APONTAMENTO DE PARADAS DE MÁQUINA
 * REV-PCP-PARADAS-002 | 2026-10-21
 * Consulta de OP alinhada às colunas essenciais; mantém filtro empresa_id e created_at.
 * Usa a tabela existente erp_producao_paradas e suas políticas RLS/RBAC.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Clock3, Factory, FileSpreadsheet, History, PauseCircle, PlayCircle, Printer, RefreshCw, Search, Square, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Machine = { id: string; codigo: string; nome: string; status?: string | null }
type Order = { id: string; numero_op?: string | number | null; status?: string | null }
type Stop = { id: string; empresa_id: string; maquina_id: string; ordem_producao_id: string | null; motivo: string; inicio: string; fim: string | null; observacao: string | null; status: 'ABERTA' | 'ENCERRADA' | string; ordem_manutencao_id?: string | null }

const reasons = [
  { label: 'MANUTENÇÃO MECÂNICA / ELÉTRICA', color: '#D97706' },
  { label: 'TROCA DE MOLDE / SETUP', color: '#2D8DB8' },
  { label: 'FALTA DE MATÉRIA-PRIMA', color: '#D65B61' },
  { label: 'FALTA DE OPERADOR / REFEIÇÃO', color: '#64748B' },
  { label: 'AJUSTE DE PROCESSO / QUALIDADE', color: '#0F766E' },
] as const
const inputClass = 'h-[30px] w-full min-w-0 rounded-[2px] border border-[#C8D6E0] bg-white px-2 text-[11px] text-[#123B50] outline-none focus:border-[#2D8DB8] disabled:bg-[#EEF3F6] disabled:text-slate-500'
const labelClass = 'grid min-w-0 gap-[3px] text-[9px] font-bold uppercase tracking-wide text-[#526B7A]'
const buttonClass = 'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] border px-3 text-[10px] font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50'
function formatMinutes(value: number) { const n = Math.max(0, value); const h = Math.floor(n / 60); const m = n % 60; return h ? `${h}h ${String(m).padStart(2, '0')}min` : `${m} min` }
function minutesBetween(start: string, end?: string | null, now = Date.now()) { const a = new Date(start).getTime(); const b = end ? new Date(end).getTime() : now; return !Number.isFinite(a) || !Number.isFinite(b) || b < a ? 0 : Math.round((b - a) / 60000) }
function formatDate(value?: string | null) { if (!value) return '—'; const d = new Date(value); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) }

export default function PCPParadasMaquina() {
  const [companyId, setCompanyId] = useState('')
  const [machines, setMachines] = useState<Machine[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [stops, setStops] = useState<Stop[]>([])
  const [machineId, setMachineId] = useState('')
  const [orderId, setOrderId] = useState('')
  const [reason, setReason] = useState('')
  const [observation, setObservation] = useState('')
  const [search, setSearch] = useState('')
  const [machineFilter, setMachineFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'TODAS' | 'ABERTA' | 'ENCERRADA'>('TODAS')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())
  const machineMap = useMemo(() => new Map(machines.map(m => [m.id, m])), [machines])
  const orderMap = useMemo(() => new Map(orders.map(o => [o.id, o])), [orders])
  const activeStop = useMemo(() => stops.find(s => s.status === 'ABERTA' && !s.fim && !s.ordem_manutencao_id) ?? null, [stops])

  const loadData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Não foi possível identificar a empresa da sessão.')
      const tenantId = String(company.data)
      const [machineRows, orderRows, stopRows] = await Promise.all([
        fetchAllPages<Machine>((from, to) => supabase.from('erp_maquinas').select('id,codigo,nome,status', { count: 'exact' }).eq('empresa_id', tenantId).eq('ativo', true).order('codigo').range(from, to)),
        fetchAllPages<Order>((from, to) => supabase.from('erp_ordens_producao').select('id,numero_op,status', { count: 'exact' }).eq('empresa_id', tenantId).order('created_at', { ascending: false }).range(from, to)),
        fetchAllPages<Stop>((from, to) => supabase.from('erp_producao_paradas').select('id,empresa_id,maquina_id,ordem_producao_id,motivo,inicio,fim,observacao,status,ordem_manutencao_id', { count: 'exact' }).eq('empresa_id', tenantId).order('inicio', { ascending: false }).range(from, to)),
      ])
      setCompanyId(tenantId); setMachines(machineRows); setOrders(orderRows); setStops(stopRows)
      const active = stopRows.find(s => s.status === 'ABERTA' && !s.fim && !s.ordem_manutencao_id)
      if (active) { setMachineId(active.maquina_id); setOrderId(active.ordem_producao_id ?? ''); setReason(active.motivo); setObservation(active.observacao ?? '') }
      else { setMachineId(current => machineRows.some(m => m.id === current) ? current : ''); setOrderId(''); setReason(''); setObservation('') }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao sincronizar paradas com o ERP.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void loadData() }, [loadData])
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])

  const filteredStops = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('pt-BR')
    return stops.filter(s => {
      if (s.ordem_manutencao_id || (statusFilter !== 'TODAS' && s.status !== statusFilter) || (machineFilter && s.maquina_id !== machineFilter)) return false
      const m = machineMap.get(s.maquina_id), o = s.ordem_producao_id ? orderMap.get(s.ordem_producao_id) : null
      return !needle || [m?.codigo, m?.nome, s.motivo, s.observacao, o?.numero_op].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(needle)
    })
  }, [stops, search, machineFilter, statusFilter, machineMap, orderMap])
  const openStops = stops.filter(s => s.status === 'ABERTA' && !s.fim && !s.ordem_manutencao_id)
  const totalMinutes = stops.filter(s => !s.ordem_manutencao_id).reduce((sum, s) => sum + minutesBetween(s.inicio, s.fim, now), 0)
  const exceptionCount = stops.filter(s => !s.ordem_manutencao_id && /FALTA|MANUTENÇÃO|AJUSTE/i.test(s.motivo)).length
  const activeMinutes = activeStop ? minutesBetween(activeStop.inicio, null, now) : 0

  async function startStop() {
    if (!companyId || !machineId || !reason) { setError('Selecione máquina e motivo antes de registrar.'); return }
    if (activeStop) { setError('Já existe uma parada aberta. Encerre-a antes de iniciar outra.'); return }
    setSaving(true); setError(''); setMessage('')
    try {
      const result = await supabase.from('erp_producao_paradas').insert({ empresa_id: companyId, maquina_id: machineId, ordem_producao_id: orderId || null, motivo: reason, inicio: new Date().toISOString(), observacao: observation.trim() || null, status: 'ABERTA' }).select('id').single()
      if (result.error) throw result.error
      setMessage('Parada registrada no banco de produção. Cronômetro iniciado.')
      await loadData()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível registrar a parada.') }
    finally { setSaving(false) }
  }
  async function closeStop() {
    if (!companyId || !activeStop) { setError('Não existe parada aberta para encerrar.'); return }
    setSaving(true); setError(''); setMessage('')
    const end = new Date().toISOString()
    try {
      const result = await supabase.from('erp_producao_paradas').update({ fim: end, status: 'ENCERRADA', observacao: observation.trim() || null }).eq('empresa_id', companyId).eq('id', activeStop.id).eq('status', 'ABERTA').is('fim', null).select('id').maybeSingle()
      if (result.error) throw result.error
      if (!result.data) throw new Error('A parada já foi encerrada ou não pertence à empresa ativa.')
      setMessage('Parada encerrada. Duração final: ' + formatMinutes(minutesBetween(activeStop.inicio, end)))
      await loadData()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível encerrar a parada.') }
    finally { setSaving(false) }
  }
  function resetForm() {
    if (activeStop) return
    setMachineId(''); setOrderId(''); setReason(''); setObservation(''); setError(''); setMessage('Formulário pronto para novo apontamento.')
  }

  return <main className="pcp-paradas-page min-h-full bg-[#F4FBFD] px-3 py-3 text-[#123B50] md:px-4">
    <style>{`
      .pcp-paradas-page .paradas-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:10px 12px;align-items:start}
      .pcp-paradas-page .paradas-grid>*{grid-column:span 6;min-width:0;align-self:start}
      .pcp-paradas-page .paradas-grid .span-12{grid-column:span 12}
      .pcp-paradas-page .paradas-workspace{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:12px;max-width:1500px;margin:12px auto 0;align-items:start}
      .pcp-paradas-page .paradas-card{min-width:0;border:1px solid #D5E1E8;background:#fff;border-radius:2px}
      .pcp-paradas-page .paradas-table{width:100%;border-collapse:collapse;table-layout:fixed}
      .pcp-paradas-page .paradas-table th{height:30px;background:#EAF4F8;color:#34566A;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.04em;padding:5px;border-bottom:1px solid #D5E1E8}
      .pcp-paradas-page .paradas-table td{height:32px;padding:5px;border-bottom:1px solid #E5EDF1;font-size:10px;overflow-wrap:anywhere}
      .pcp-paradas-page .paradas-table tbody tr:hover{background:#F0F9FC}
      .pcp-paradas-page .paradas-print{display:none}
      @media(max-width:1050px){.pcp-paradas-page .paradas-workspace{grid-template-columns:minmax(0,1fr)}}
      @media(max-width:650px){.pcp-paradas-page .paradas-grid>*{grid-column:span 12}.pcp-paradas-page .paradas-workspace{gap:8px}.pcp-paradas-page .paradas-table th,.pcp-paradas-page .paradas-table td{padding:4px;font-size:9px}}
      @media print{body *{visibility:hidden!important}.pcp-paradas-page .paradas-print,.pcp-paradas-page .paradas-print *{visibility:visible!important}.pcp-paradas-page .paradas-print{display:block!important;position:absolute!important;left:0;top:0;width:100%;padding:10mm;background:#fff!important;color:#0f172a!important;font-family:Arial,sans-serif!important}.pcp-paradas-page .paradas-screen{display:none!important}@page{size:A4 portrait;margin:10mm}}
    `}</style>
    <div className="paradas-screen mx-auto max-w-[1500px]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D5E1E8] pb-3">
        <div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] bg-[#123B50] text-white"><Factory size={18}/></div><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.12em] text-[#2D8DB8]">SYSNQRA • PCP / SGQ • IT-PCP-PARADAS-002</p><h1 className="text-[16px] font-extrabold leading-5">Apontamento de Paradas de Máquina</h1><p className="mt-1 text-[10px] text-[#5D7482]">Registro operacional de tempo improdutivo, setup e ocorrências críticas.</p></div></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void loadData()} disabled={loading || saving} className={buttonClass+' border-[#C8D6E0] bg-white text-[#123B50] hover:bg-[#F0F8FB]'}><RefreshCw size={13} className={loading?'animate-spin':''}/>Atualizar</button><button type="button" onClick={() => window.print()} className={buttonClass+' border-[#C8D6E0] bg-white text-[#123B50] hover:bg-[#F0F8FB]'}><Printer size={13}/>Imprimir A4</button><button type="button" onClick={resetForm} disabled={saving || Boolean(activeStop)} className={buttonClass+' border-[#2D8DB8] bg-[#2D8DB8] text-white hover:bg-[#236F91]'}><PlayCircle size={13}/>Nova parada</button></div>
      </header>
      {(error || message) && <div role={error?'alert':'status'} className={'mt-3 flex items-start justify-between gap-2 rounded-[2px] border px-3 py-2 text-[11px] font-semibold '+(error?'border-[#D65B61] bg-[#FFF1F1] text-[#9E3038]':'border-[#3A9D78] bg-[#F0FBF5] text-[#246B50]')}><span>{error||message}</span><button type="button" aria-label="Fechar mensagem" onClick={() => {setError('');setMessage('')}}><X size={14}/></button></div>}
      <section className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {title:'Paradas em aberto',value:String(openStops.length),detail:'Ocorrências ativas',icon:PauseCircle,tone:'#D65B61'},
          {title:'Tempo improdutivo',value:formatMinutes(totalMinutes),detail:'Total do histórico carregado',icon:Clock3,tone:'#D97706'},
          {title:'Ocorrências não programadas',value:String(exceptionCount),detail:'Manutenção, falta ou ajuste',icon:AlertTriangle,tone:'#2D8DB8'},
          {title:'Cronômetro ativo',value:activeStop?formatMinutes(activeMinutes):'—',detail:activeStop?'Parada em andamento':'Sem parada ativa',icon:History,tone:'#3A9D78'},
        ].map(item => <article key={item.title} className="rounded-[2px] border border-[#D5E1E8] bg-white p-3"><div className="flex items-center justify-between gap-2"><span className="text-[9px] font-bold uppercase tracking-wide text-[#5D7482]">{item.title}</span><item.icon size={16} color={item.tone}/></div><div className="mt-1 text-[20px] font-extrabold leading-6">{item.value}</div><p className="mt-1 text-[9px] text-[#708692]">{item.detail}</p></article>)}
      </section>
      <div className="paradas-workspace">
        <section className="paradas-card p-3">
          <div className="mb-3 flex items-center justify-between gap-2 border-b border-[#E2EBF0] pb-2"><div><h2 className="text-[12px] font-extrabold">{activeStop?'Parada em andamento':'Registrar parada'}</h2><p className="mt-1 text-[9px] text-[#6B818D]">{activeStop?'Encerre o evento atual para liberar novo apontamento.':'Informe máquina, OP e justificativa.'}</p></div>{activeStop&&<span className="inline-flex items-center gap-1 rounded-[2px] bg-[#FFF1F1] px-2 py-1 text-[9px] font-bold text-[#B43B43]"><PauseCircle size={12}/>ABERTA</span>}</div>
          <div className="paradas-grid">
            <label className={labelClass}>Máquina afetada *<select className={inputClass} value={machineId} disabled={Boolean(activeStop)||saving} onChange={e=>setMachineId(e.target.value)} required><option value="">Selecione a máquina</option>{machines.map(m=><option key={m.id} value={m.id}>{m.codigo} — {m.nome}</option>)}</select></label>
            <label className={labelClass}>Ordem de produção<select className={inputClass} value={orderId} disabled={Boolean(activeStop)||saving} onChange={e=>setOrderId(e.target.value)}><option value="">Sem OP vinculada</option>{orders.map(o=><option key={o.id} value={o.id}>{o.numero_op??o.id.slice(0,8)}{o.status?' • '+o.status:''}</option>)}</select></label>
            <label className="span-12 grid min-w-0 gap-[3px] text-[9px] font-bold uppercase tracking-wide text-[#526B7A]">Motivo da parada *<select className={inputClass} value={reason} disabled={Boolean(activeStop)||saving} onChange={e=>setReason(e.target.value)} required><option value="">Selecione a justificativa</option>{reasons.map(r=><option key={r.label} value={r.label}>{r.label}</option>)}</select></label>
            <label className="span-12 grid min-w-0 gap-[3px] text-[9px] font-bold uppercase tracking-wide text-[#526B7A]">Observação / análise de falha<textarea className="min-h-[72px] w-full resize-y rounded-[2px] border border-[#C8D6E0] bg-white p-2 text-[11px] text-[#123B50] outline-none focus:border-[#2D8DB8] disabled:bg-[#EEF3F6]" value={observation} disabled={saving} onChange={e=>setObservation(e.target.value)} placeholder="Descreva a ocorrência, causa provável ou ação corretiva."/></label>
          </div>
          {activeStop&&<div className="mt-3 flex items-center justify-between gap-3 rounded-[2px] border border-[#E6A34A] bg-[#FFF8EC] p-3"><div><div className="text-[9px] font-bold uppercase text-[#8A5B19]">Tempo decorrido</div><div className="mt-1 font-mono text-[22px] font-extrabold text-[#8A5B19]">{formatMinutes(activeMinutes)}</div><div className="text-[9px] text-[#8A5B19]">Início: {formatDate(activeStop.inicio)}</div></div><button type="button" onClick={()=>void closeStop()} disabled={saving} className={buttonClass+' border-[#D65B61] bg-[#D65B61] text-white hover:bg-[#B8474D]'}><Square size={12}/>{saving?'Gravando...':'Encerrar parada'}</button></div>}
          {!activeStop&&<div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-[#E2EBF0] pt-3"><button type="button" onClick={resetForm} disabled={saving} className={buttonClass+' border-[#C8D6E0] bg-white text-[#526B7A] hover:bg-[#F4F8FA]'}>Limpar</button><button type="button" onClick={()=>void startStop()} disabled={saving||loading||!machineId||!reason} className={buttonClass+' border-[#2D8DB8] bg-[#2D8DB8] text-white hover:bg-[#236F91]'}><PlayCircle size={13}/>{saving?'Gravando...':'Abrir parada de máquina'}</button></div>}
        </section>
        <section className="paradas-card min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D5E1E8] bg-[#F8FBFC] p-3"><div className="flex items-center gap-2"><FileSpreadsheet size={16} color="#2D8DB8"/><div><h2 className="text-[12px] font-extrabold">Histórico de paradas</h2><p className="text-[9px] text-[#6B818D]">{filteredStops.length} ocorrência(s) nos filtros atuais</p></div></div><span className="text-[9px] text-[#708692]">{loading?'Sincronizando...':'Dados do Supabase'}</span></div>
          <div className="grid grid-cols-1 gap-2 border-b border-[#E2EBF0] p-3 md:grid-cols-[minmax(0,1fr)_180px]"><label className="relative block min-w-0"><Search size={13} className="absolute left-2 top-[9px] text-[#708692]"/><input className={inputClass+' pl-7'} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar máquina, motivo, OP ou observação"/></label><select className={inputClass} value={machineFilter} onChange={e=>setMachineFilter(e.target.value)}><option value="">Todas as máquinas</option>{machines.map(m=><option key={m.id} value={m.id}>{m.codigo} — {m.nome}</option>)}</select></div>
          <div className="flex flex-wrap gap-1 border-b border-[#E2EBF0] px-3 py-2">{(['TODAS','ABERTA','ENCERRADA'] as const).map(tab=><button type="button" key={tab} onClick={()=>setStatusFilter(tab)} className={'h-[26px] rounded-[2px] border px-2 text-[9px] font-bold uppercase '+(statusFilter===tab?'border-[#123B50] bg-[#123B50] text-white':'border-[#D5E1E8] bg-white text-[#526B7A]')}>{tab==='TODAS'?'Todas':tab==='ABERTA'?'Em aberto':'Encerradas'}</button>)}</div>
          <div className="max-h-[480px] overflow-auto"><table className="paradas-table"><thead><tr><th style={{width:'18%'}}>Máquina</th><th style={{width:'28%'}}>Motivo</th><th style={{width:'18%'}}>Início</th><th style={{width:'17%'}}>Duração</th><th style={{width:'19%'}}>Status</th></tr></thead><tbody>
            {filteredStops.map(s=>{const m=machineMap.get(s.maquina_id);const isOpen=s.status==='ABERTA'&&!s.fim;const o=s.ordem_producao_id?orderMap.get(s.ordem_producao_id):null;return <tr key={s.id}><td><strong>{m?.codigo??'—'}</strong><div className="text-[9px] text-[#708692]">{m?.nome??'Máquina não localizada'}</div></td><td>{s.motivo}<div className="text-[9px] text-[#708692]">{s.ordem_producao_id?'OP '+(o?.numero_op??'vinculada'):'Sem OP'}</div></td><td>{formatDate(s.inicio)}{s.fim&&<div className="text-[9px] text-[#708692]">Fim: {formatDate(s.fim)}</div>}</td><td className="font-mono font-bold">{formatMinutes(minutesBetween(s.inicio,s.fim,now))}</td><td><span className={'inline-flex rounded-[2px] px-2 py-1 text-[9px] font-bold '+(isOpen?'bg-[#FFF1F1] text-[#B43B43]':'bg-[#EAF7F0] text-[#287653]')}>{isOpen?'ABERTA':s.status}</span></td></tr>})}
            {!filteredStops.length&&<tr><td colSpan={5} className="py-8 text-center text-[10px] text-[#708692]">{loading?'Carregando ocorrências...':'Nenhuma parada encontrada para os filtros atuais.'}</td></tr>}
          </tbody></table></div>
        </section>
      </div>
      <p className="mt-3 text-[9px] text-[#708692]">O tempo é calculado a partir dos horários persistidos. OEE percentual não é estimado nesta tela: requer tempo planejado e dados reais de produção.</p>
    </div>
    <section className="paradas-print" aria-label="Relatório A4 de auditoria">
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',borderBottom:'2px solid #0f172a',paddingBottom:8}}><div><h1 style={{fontSize:'15pt',fontWeight:700,margin:0}}>SYSNQRA SISTEMAS INDUSTRIAIS</h1><p style={{fontSize:'8pt',color:'#475569',margin:'3px 0 0'}}>PCP • DIÁRIO DE BORDO E MAPA DE PARADAS DE MÁQUINA</p></div><div style={{textAlign:'right',fontSize:'8pt'}}><strong>RELATÓRIO DE AUDITORIA</strong><p style={{margin:'3px 0 0'}}>{new Date().toLocaleString('pt-BR')}</p></div></header>
      <div style={{display:'flex',gap:16,margin:'12px 0',fontSize:'9pt'}}><span><strong>Empresa:</strong> {companyId||'Sessão não identificada'}</span><span><strong>Registros:</strong> {filteredStops.length}</span><span><strong>Tempo total:</strong> {formatMinutes(totalMinutes)}</span></div>
      <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed',fontSize:'8pt'}}><thead><tr>{['Máquina','Motivo / justificativa','Início','Fim','Duração','Status'].map(label=><th key={label} style={{textAlign:'left',borderBottom:'1px solid #334155',padding:'5px 3px'}}>{label}</th>)}</tr></thead><tbody>{filteredStops.map(s=><tr key={s.id}>{[machineMap.get(s.maquina_id)?.codigo??'—',s.motivo,formatDate(s.inicio),formatDate(s.fim),formatMinutes(minutesBetween(s.inicio,s.fim,now)),s.status].map((v,i)=><td key={i} style={{verticalAlign:'top',borderBottom:'1px solid #cbd5e1',padding:'5px 3px',overflowWrap:'anywhere'}}>{v}</td>)}</tr>)}</tbody></table>
      <div style={{marginTop:42,display:'grid',gridTemplateColumns:'1fr 1fr',gap:35,fontSize:'8pt',textAlign:'center'}}><div style={{borderTop:'1px solid #0f172a',paddingTop:5}}>Supervisor / Líder de Produção</div><div style={{borderTop:'1px solid #0f172a',paddingTop:5}}>Inspetor de Qualidade / SGQ</div></div>
    </section>
  </main>
}
