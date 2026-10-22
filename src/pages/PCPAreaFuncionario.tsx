/**
 * SYSNQRA ERP · Área do Funcionário / CPP
 * Revisão: PCP-AREA-FUNCIONARIO-2026-10-22-R1
 * Acesso autenticado; programação filtrada pelo funcionário associado ao e-mail da sessão.
 * Registros enviados ao ERP: erp_apontamentos_processo. Sem dados de demonstração.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Factory, FileText, Package, Play, RefreshCw, ShieldCheck, Square, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Employee = { id: string; matricula: string; nome: string; email: string | null; status: string }
type Program = { id: string; ordem_producao_id: string | null; maquina_id: string | null; produto_id: string | null; inicio_planejado: string; fim_planejado: string; quantidade_planejada: number; quantidade_produzida: number; quantidade_refugada: number; status: string; operador_frente_id: string | null; operador_atras_id: string | null }
type Order = { id: string; numero_op: string | number; produto_id: string | null; quantidade_planejada: number | null; quantidade: number | null; status: string; data_prevista: string | null }
type Product = { id: string; codigo: string; nome: string; unidade: string | null; descricao?: string | null }
type Machine = { id: string; codigo: string; nome: string; status?: string }
type Recipe = { id: string; processo_id: string; produto_id: string | null; maquina_id: string | null; ferramenta_id: string | null; versao: number; status: string; parametros: Record<string, unknown>; ciclo_seg: number | null; setup_min: number | null; observacoes: string | null }
type ProcessEntry = { id: string; ordem_producao_id: string; operador_id: string | null; inicio_em: string; fim_em: string | null; quantidade_boa: number; quantidade_refugada: number; motivo_parada: string | null; observacoes: string | null }
type Material = { id: string; produto_pai_id: string; sku_insumo: string; qtd: number; unidade: string }
const input = 'h-[36px] w-full min-w-0 rounded-[3px] border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20'
const smallButton = 'inline-flex min-h-[36px] items-center justify-center gap-2 rounded-[3px] border px-3 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50'
const localDate = (date: Date) => {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return adjusted.toISOString().slice(0, 10)
}
const dateLabel = (date: string) => new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
const timeLabel = (date: string | null | undefined) => date ? new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'
const numberLabel = (value: number | null | undefined) => Number(value ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })

export default function PCPAreaFuncionario() {
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [entries, setEntries] = useState<ProcessEntry[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [selectedDay, setSelectedDay] = useState(localDate(new Date()))
  const [weekOffset, setWeekOffset] = useState(0)
  const [goodQty, setGoodQty] = useState('')
  const [scrapQty, setScrapQty] = useState('')
  const [stopReason, setStopReason] = useState('')
  const [observations, setObservations] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [userId, setUserId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [{ data: authData, error: authError }, tenant] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc('erp_current_empresa_id')
      ])
      if (authError || !authData.user) throw authError ?? new Error('Entre com a conta individual autorizada do funcionário.')
      if (tenant.error || typeof tenant.data !== 'string' || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const email = authData.user.email?.trim()
      if (!email) throw new Error('A conta autenticada não tem e-mail para vincular ao cadastro de RH.')
      setCompanyId(tenant.data)
      setUserId(authData.user.id)
      const employeeResult = await supabase.from('erp_funcionarios')
        .select('id,matricula,nome,email,status')
        .eq('empresa_id', tenant.data)
        .ilike('email', email)
        .maybeSingle()
      if (employeeResult.error) throw employeeResult.error
      const worker = employeeResult.data as Employee | null
      if (!worker) throw new Error('Funcionário não vinculado: o RH precisa cadastrar o mesmo e-mail da conta individual do portal.')
      if (['inativo','desligado','demitido','cancelado'].includes(String(worker.status).toLocaleLowerCase('pt-BR'))) throw new Error('Acesso bloqueado: o cadastro do funcionário está inativo.')
      setEmployee(worker)
      const [programResult, orderResult, productResult, machineResult, recipeResult, entryResult, materialResult] = await Promise.all([
        supabase.from('erp_pcp_programacoes').select('id,ordem_producao_id,maquina_id,produto_id,inicio_planejado,fim_planejado,quantidade_planejada,quantidade_produzida,quantidade_refugada,status,operador_frente_id,operador_atras_id').eq('empresa_id', tenant.data).or('operador_frente_id.eq.' + worker.id + ',operador_atras_id.eq.' + worker.id).order('inicio_planejado').limit(1000),
        supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,quantidade_planejada,quantidade,status,data_prevista').eq('empresa_id', tenant.data).limit(3000),
        supabase.from('erp_produtos').select('id,codigo,nome,unidade,descricao').eq('empresa_id', tenant.data).limit(3000),
        supabase.from('erp_maquinas').select('id,codigo,nome,status').eq('empresa_id', tenant.data).limit(1000),
        supabase.from('erp_receitas_processos').select('id,processo_id,produto_id,maquina_id,ferramenta_id,versao,status,parametros,ciclo_seg,setup_min,observacoes').eq('empresa_id', tenant.data).eq('status','APROVADA').order('versao',{ascending:false}).limit(3000),
        supabase.from('erp_apontamentos_processo').select('id,ordem_producao_id,operador_id,inicio_em,fim_em,quantidade_boa,quantidade_refugada,motivo_parada,observacoes').eq('empresa_id', tenant.data).eq('operador_id', worker.id).order('inicio_em',{ascending:false}).limit(1000),
        supabase.from('erp_pcp_bom_itens').select('id,produto_pai_id,sku_insumo,qtd,unidade').eq('empresa_id', tenant.data).limit(5000)
      ])
      for (const result of [programResult, orderResult, productResult, machineResult, recipeResult, entryResult, materialResult]) if (result.error) throw result.error
      setPrograms((programResult.data ?? []) as Program[])
      setOrders((orderResult.data ?? []) as Order[])
      setProducts((productResult.data ?? []) as Product[])
      setMachines((machineResult.data ?? []) as Machine[])
      setRecipes((recipeResult.data ?? []) as Recipe[])
      setEntries((entryResult.data ?? []) as ProcessEntry[])
      setMaterials((materialResult.data ?? []) as Material[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a programação individual.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const orderMap = useMemo(() => new Map(orders.map(order => [order.id, order])), [orders])
  const productMap = useMemo(() => new Map(products.map(product => [product.id, product])), [products])
  const machineMap = useMemo(() => new Map(machines.map(machine => [machine.id, machine])), [machines])
  const program = programs.find(item => item.id === selectedProgramId) ?? null
  const order = program?.ordem_producao_id ? orderMap.get(program.ordem_producao_id) : undefined
  const productId = program?.produto_id ?? order?.produto_id ?? null
  const product = productId ? productMap.get(productId) : undefined
  const machine = program?.maquina_id ? machineMap.get(program.maquina_id) : undefined
  const recipe = useMemo(() => {
    if (!program || !productId) return undefined
    return recipes.find(item => item.produto_id === productId && (!item.maquina_id || item.maquina_id === program.maquina_id))
  }, [program, productId, recipes])
  const openEntry = entries.find(item => program?.ordem_producao_id === item.ordem_producao_id && !item.fim_em)
  const programMaterials = materials.filter(item => item.produto_pai_id === productId)
  const days = useMemo(() => {
    const today = new Date()
    const monday = new Date(today)
    const weekday = (today.getDay() + 6) % 7
    monday.setDate(today.getDate() - weekday + weekOffset * 7)
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(monday)
      day.setDate(monday.getDate() + index)
      return localDate(day)
    })
  }, [weekOffset])
  function changeWeek(delta: number) {
    const firstDay = new Date(days[0] + 'T12:00:00')
    firstDay.setDate(firstDay.getDate() + delta * 7)
    setWeekOffset(value => value + delta)
    setSelectedDay(localDate(firstDay))
  }
  const dayPrograms = programs.filter(item => localDate(new Date(item.inicio_planejado)) === selectedDay)
  const selectedEntries = entries.filter(item => program?.ordem_producao_id === item.ordem_producao_id)
  const activeEntry = openEntry && openEntry.operador_id === employee?.id ? openEntry : null

  async function startProduction() {
    if (!employee || !program || !order || !productId || !machine || !recipe || !companyId || !userId) {
      setError('Não é possível iniciar: confira OP, produto, máquina e ficha de processo aprovada vinculada.')
      return
    }
    if (activeEntry) { setMessage('Esta OP já tem um apontamento em andamento para seu usuário.'); return }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const { data: tenantData, error: tenantError } = await supabase.rpc('erp_current_empresa_id')
      if (tenantError || tenantData !== companyId) throw tenantError ?? new Error('A empresa da sessão mudou. Atualize a página.')
      const response = await supabase.from('erp_apontamentos_processo').insert({
        empresa_id: companyId,
        processo_id: recipe.processo_id,
        receita_id: recipe.id,
        ordem_producao_id: order.id,
        maquina_id: machine.id,
        ferramenta_id: recipe.ferramenta_id,
        inicio_em: new Date().toISOString(),
        quantidade_planejada: Number(program.quantidade_planejada || order.quantidade_planejada || order.quantidade || 0),
        quantidade_boa: 0,
        quantidade_refugada: 0,
        operador_id: employee.id,
        criado_por: userId,
        parametros_reais: { origem: 'AREA_FUNCIONARIO_CPP', programacao_id: program.id, revisao_receita: recipe.versao }
      }).select('id,ordem_producao_id,operador_id,inicio_em,fim_em,quantidade_boa,quantidade_refugada,motivo_parada,observacoes').single()
      if (response.error) throw response.error
      setEntries(current => [response.data as ProcessEntry, ...current])
      setMessage('Início de produção registrado. Ao terminar, informe peças boas, refugos e eventuais paradas.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao registrar início da produção.')
    } finally {
      setSaving(false)
    }
  }

  async function finishProduction() {
    if (!employee || !program || !activeEntry || !companyId) { setError('Não há apontamento em andamento para finalizar nesta OP.'); return }
    const good = Number(goodQty)
    const scrap = Number(scrapQty)
    if (!Number.isFinite(good) || !Number.isFinite(scrap) || good < 0 || scrap < 0 || good + scrap <= 0) {
      setError('Informe quantidades válidas. A soma de peças boas e refugadas precisa ser maior que zero.')
      return
    }
    if (scrap > 0 && !observations.trim()) { setError('Descreva o defeito/causa quando houver peças refugadas.'); return }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const response = await supabase.from('erp_apontamentos_processo').update({
        fim_em: new Date().toISOString(),
        quantidade_boa: good,
        quantidade_refugada: scrap,
        motivo_parada: stopReason.trim() || null,
        observacoes: observations.trim() || null
      }).eq('empresa_id', companyId).eq('id', activeEntry.id).eq('operador_id', employee.id).select('id').maybeSingle()
      if (response.error) throw response.error
      if (!response.data) throw new Error('Nenhum apontamento foi atualizado. Confirme se o registro ainda está aberto e pertence ao seu usuário.')
      setMessage('Apontamento gravado e enviado ao PCP para conferência.')
      setGoodQty('')
      setScrapQty('')
      setStopReason('')
      setObservations('')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao finalizar o apontamento.')
    } finally {
      setSaving(false)
    }
  }

  return <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900 md:p-5">
    <div className="mx-auto max-w-[1200px] space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3 border border-[#C8E3EE] bg-white p-3 shadow-[0_3px_12px_rgba(18,59,80,.07)]">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center bg-[#123B50] text-white"><Factory size={22}/></span><div><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#2D8DB8]">SYSNQRA · CHÃO DE FÁBRICA</p><h1 className="text-lg font-black text-[#123B50]">Área do Funcionário</h1><p className="text-[10px] text-slate-500">Programação semanal e Cartão de Processo Produtivo (CPP)</p></div></div>
        <button type="button" onClick={()=>void load()} disabled={loading} className={smallButton+' border-slate-300 bg-white text-slate-700'}><RefreshCw size={14} className={loading?'animate-spin':''}/> Atualizar</button>
      </header>
      {(error || message) && <p role={error?'alert':'status'} className={'border p-3 text-xs font-bold '+(error?'border-rose-200 bg-rose-50 text-rose-800':'border-emerald-200 bg-emerald-50 text-emerald-800')}>{error||message}</p>}
      {!loading && !employee && !error && <p className="border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">Conta ainda não vinculada a um funcionário no RH.</p>}
      <section className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center border border-[#C8E3EE] bg-[#EAF6FA] text-[#2D8DB8]"><UserRound size={18}/></span><div><p className="text-[9px] font-black uppercase text-slate-500">Funcionário autenticado</p><p className="text-sm font-black text-[#123B50]">{employee?.nome ?? 'Identificando conta…'}</p></div></div>
        <div className="flex flex-wrap gap-2 text-[10px] font-bold"><span className="border border-slate-200 bg-slate-50 px-2 py-1">Matrícula: {employee?.matricula ?? '—'}</span><span className="border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800"><ShieldCheck size={12} className="mr-1 inline"/>Acesso autenticado</span></div>
      </section>
      <section className="border border-slate-200 bg-white p-3 shadow-[0_2px_8px_rgba(18,59,80,.04)]">
        <div className="mb-3 flex items-center gap-2"><CalendarDays size={16} className="text-[#2D8DB8]"/><div><h2 className="text-xs font-black uppercase text-[#123B50]">Minha semana</h2><p className="text-[10px] text-slate-500">Toque em uma data para ver os produtos programados para você.</p></div></div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <button type="button" onClick={()=>changeWeek(-1)} aria-label="Semana anterior" className="grid h-8 w-8 shrink-0 place-items-center border border-slate-300 bg-white text-[#123B50]"><ChevronLeft size={16}/></button>
          <p className="text-[9px] font-bold text-slate-500">{new Date(days[0]+'T12:00:00').toLocaleDateString('pt-BR')} — {new Date(days[6]+'T12:00:00').toLocaleDateString('pt-BR')}</p>
          <button type="button" onClick={()=>changeWeek(1)} aria-label="Próxima semana" className="grid h-8 w-8 shrink-0 place-items-center border border-slate-300 bg-white text-[#123B50]"><ChevronRight size={16}/></button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map(day=>{const count=programs.filter(item=>localDate(new Date(item.inicio_planejado))===day).length;const isSelected=selectedDay===day;return <button type="button" key={day} onClick={()=>setSelectedDay(day)} className={'min-w-[76px] shrink-0 border px-2 py-2 text-center '+(isSelected?'border-[#123B50] bg-[#123B50] text-white':'border-slate-200 bg-white text-slate-700 hover:border-[#2D8DB8]')}><span className="block text-[9px] font-bold uppercase">{new Date(day+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short'})}</span><span className="my-1 block text-sm font-black">{day.slice(8,10)}</span><span className={'mx-auto block h-1.5 w-1.5 rounded-full '+(count?'bg-emerald-500':'bg-slate-200')}/><span className="mt-1 block text-[8px]">{count?count+' tarefa(s)':'Livre'}</span></button>})}
        </div>
      </section>
      <section className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-2">
          <header className="flex items-center justify-between"><h2 className="text-xs font-black uppercase text-[#123B50]">Produtos programados · {dateLabel(selectedDay)}</h2><span className="text-[9px] font-bold text-slate-500">{dayPrograms.length} tarefa(s)</span></header>
          {dayPrograms.map(item=>{const itemOrder=item.ordem_producao_id?orderMap.get(item.ordem_producao_id):undefined;const itemProduct=productMap.get(item.produto_id??itemOrder?.produto_id??'');const itemMachine=machineMap.get(item.maquina_id??'');const isSelected=item.id===selectedProgramId;return <button type="button" key={item.id} onClick={()=>{setSelectedProgramId(item.id);setGoodQty('');setScrapQty('');setStopReason('');setObservations('');setMessage('');setError('')}} className={'w-full border p-3 text-left shadow-[0_2px_7px_rgba(18,59,80,.04)] '+(isSelected?'border-[#2D8DB8] bg-[#F4FBFD]':'border-slate-200 bg-white hover:border-[#9BCBDD]')}><div className="flex items-start justify-between gap-2"><div><p className="text-[9px] font-black uppercase text-[#2D8DB8]">OP {itemOrder?.numero_op??'—'}</p><h3 className="mt-1 text-sm font-black text-[#123B50]">{itemProduct?.codigo??'Produto'} · {itemProduct?.nome??'Descrição não cadastrada'}</h3></div><span className="border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-800">{item.status||'PROGRAMADA'}</span></div><div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-600"><span><Clock3 size={12} className="mr-1 inline"/>{timeLabel(item.inicio_planejado)}–{timeLabel(item.fim_planejado)}</span><span><Factory size={12} className="mr-1 inline"/>{itemMachine?.codigo??'Máquina —'}</span><span><Package size={12} className="mr-1 inline"/>Planejado: {numberLabel(item.quantidade_planejada)}</span><span><CheckCircle2 size={12} className="mr-1 inline"/>Produzido: {numberLabel(item.quantidade_produzida)}</span></div></button>})}
          {!loading&&dayPrograms.length===0&&<div className="border border-dashed border-slate-300 bg-white p-8 text-center"><CalendarDays size={22} className="mx-auto mb-2 text-slate-400"/><p className="text-xs font-bold text-slate-600">Nenhuma tarefa programada para esta data.</p><p className="mt-1 text-[10px] text-slate-500">Se esperava uma tarefa, peça ao PCP para conferir a programação e o operador atribuído.</p></div>}
        </div>
        <div className="min-w-0">
          {!program ? <div className="flex min-h-[260px] flex-col items-center justify-center border border-dashed border-slate-300 bg-white p-6 text-center"><FileText size={28} className="mb-2 text-[#2D8DB8]"/><h2 className="text-sm font-black text-[#123B50]">Cartão de Processo Produtivo</h2><p className="mt-1 max-w-sm text-[10px] text-slate-500">Selecione uma tarefa à esquerda para consultar a OP, material, máquina e ficha de processo.</p></div> : <section className="space-y-2 border border-[#B9D6E2] bg-white shadow-[0_3px_12px_rgba(18,59,80,.06)]">
            <header className="flex items-center gap-2 border-b border-[#C8E3EE] bg-[#EAF6FA] p-3"><FileText size={18} className="text-[#2D8DB8]"/><div><h2 className="text-sm font-black uppercase text-[#123B50]">CPP · Cartão de Processo Produtivo</h2><p className="text-[10px] text-slate-600">Dados da programação real do PCP</p></div></header>
            <div className="grid grid-cols-2 gap-2 p-3 text-[10px] sm:grid-cols-3"><div className="border border-slate-200 p-2"><p className="text-[8px] font-black uppercase text-slate-500">Ordem de produção</p><p className="mt-1 font-black">OP {order?.numero_op??'—'}</p></div><div className="border border-slate-200 p-2"><p className="text-[8px] font-black uppercase text-slate-500">Produto</p><p className="mt-1 font-black">{product?.codigo??'—'} · {product?.nome??'—'}</p></div><div className="border border-slate-200 p-2"><p className="text-[8px] font-black uppercase text-slate-500">Máquina</p><p className="mt-1 font-black">{machine?.codigo??'—'} · {machine?.nome??'—'}</p></div><div className="border border-slate-200 p-2"><p className="text-[8px] font-black uppercase text-slate-500">Início planejado</p><p className="mt-1 font-black">{timeLabel(program.inicio_planejado)}</p><p>{new Date(program.inicio_planejado).toLocaleDateString('pt-BR')}</p></div><div className="border border-slate-200 p-2"><p className="text-[8px] font-black uppercase text-slate-500">Término planejado</p><p className="mt-1 font-black">{timeLabel(program.fim_planejado)}</p><p>{new Date(program.fim_planejado).toLocaleDateString('pt-BR')}</p></div><div className="border border-slate-200 p-2"><p className="text-[8px] font-black uppercase text-slate-500">Quantidade planejada</p><p className="mt-1 text-base font-black text-[#123B50]">{numberLabel(program.quantidade_planejada)}</p></div></div>
            <div className="px-3"><h3 className="mb-1 text-[10px] font-black uppercase text-[#123B50]">Ficha de processo vigente</h3>{recipe?<div className="border border-emerald-200 bg-emerald-50 p-2 text-[10px]"><p className="font-black text-emerald-900">Receita aprovada · revisão {recipe.versao}</p>{recipe.ciclo_seg!==null&&<p>Ciclo padrão: {numberLabel(recipe.ciclo_seg)} s</p>}{recipe.setup_min!==null&&<p>Setup padrão: {numberLabel(recipe.setup_min)} min</p>}{recipe.observacoes&&<p className="mt-1">{recipe.observacoes}</p>}{Object.keys(recipe.parametros??{}).length>0&&<pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap border-t border-emerald-200 pt-2 text-[9px]">{JSON.stringify(recipe.parametros,null,2)}</pre>}</div>:<div className="border border-rose-200 bg-rose-50 p-2 text-[10px] font-bold text-rose-800"><AlertTriangle size={13} className="mr-1 inline"/>Não há receita aprovada para produto/máquina. O início da produção ficará bloqueado.</div>}</div>
            {programMaterials.length>0&&<div className="px-3"><h3 className="mb-1 text-[10px] font-black uppercase text-[#123B50]">Componentes previstos na estrutura de materiais</h3><div className="overflow-x-auto border border-slate-200"><table className="w-full text-left text-[10px]"><thead className="bg-slate-50 text-[9px] uppercase"><tr><th className="p-2">Código insumo</th><th className="p-2">Qtd. por estrutura</th><th className="p-2">Un.</th></tr></thead><tbody>{programMaterials.map(material=><tr key={material.id} className="border-t border-slate-100"><td className="p-2">{material.sku_insumo}</td><td className="p-2">{numberLabel(material.qtd)}</td><td className="p-2">{material.unidade}</td></tr>)}</tbody></table></div></div>}
            <div className="border-t border-slate-200 p-3">
              {activeEntry ? <div className="space-y-3"><div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 p-2 text-[10px] font-black text-emerald-900"><Play size={14}/> PRODUÇÃO EM ANDAMENTO · início {timeLabel(activeEntry.inicio_em)}</div><div className="grid grid-cols-2 gap-2"><label className="flex flex-col gap-1 text-[9px] font-black uppercase text-slate-500">Peças boas<input type="number" min="0" step="1" className={input} value={goodQty} onChange={e=>setGoodQty(e.target.value)} placeholder="0"/></label><label className="flex flex-col gap-1 text-[9px] font-black uppercase text-slate-500">Peças refugadas<input type="number" min="0" step="1" className={input} value={scrapQty} onChange={e=>setScrapQty(e.target.value)} placeholder="0"/></label><label className="col-span-2 flex flex-col gap-1 text-[9px] font-black uppercase text-slate-500">Parada / motivo (se ocorreu)<input className={input} value={stopReason} onChange={e=>setStopReason(e.target.value)} placeholder="Ex.: falta de material, ajuste, manutenção..."/></label><label className="col-span-2 flex flex-col gap-1 text-[9px] font-black uppercase text-slate-500">Defeito / observações<textarea className="min-h-[68px] rounded-[3px] border border-slate-300 p-3 text-sm outline-none focus:border-[#2D8DB8]" value={observations} onChange={e=>setObservations(e.target.value)} placeholder="Descreva defeitos, parada, ocorrência ou observação do turno."/></label></div><button type="button" onClick={()=>void finishProduction()} disabled={saving} className={smallButton+' w-full border-[#123B50] bg-[#123B50] text-white'}>{saving?<RefreshCw size={15} className="animate-spin"/>:<Square size={15}/>} Finalizar e enviar ao PCP</button></div> : <div className="space-y-2"><p className="text-[10px] text-slate-600">Ao iniciar, o sistema registra horário e vínculo com OP, máquina, receita e funcionário. Ao finalizar, informe as quantidades e ocorrências.</p><button type="button" onClick={()=>void startProduction()} disabled={saving||!recipe||!order||!machine} className={smallButton+' w-full border-[#2D8DB8] bg-[#2D8DB8] text-white'}>{saving?<RefreshCw size={15} className="animate-spin"/>:<Play size={15}/>} Iniciar produção</button></div>}
            </div>
            {selectedEntries.length>0&&<div className="border-t border-slate-200 p-3"><h3 className="mb-1 text-[10px] font-black uppercase text-[#123B50]">Histórico deste produto / OP</h3>{selectedEntries.slice(0,5).map(entry=><div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 py-2 text-[10px]"><span>{timeLabel(entry.inicio_em)}–{timeLabel(entry.fim_em)} · Boas {numberLabel(entry.quantidade_boa)} · Refugo {numberLabel(entry.quantidade_refugada)}</span><span className={entry.fim_em?'text-emerald-700':'text-amber-700'}>{entry.fim_em?'Enviado':'Em andamento'}</span></div>)}</div>}
          </section>}
        </div>
      </section>
      <p className="text-[9px] leading-relaxed text-slate-500">Segurança: esta versão exige sessão autenticada e vínculo por e-mail ao cadastro do RH. Não aceita CPF ou matrícula como senha. O acesso simplificado por crachá + PIN requer um fluxo de credenciais próprio e validação no servidor; não será simulado no navegador.</p>
    </div>
  </main>
}
