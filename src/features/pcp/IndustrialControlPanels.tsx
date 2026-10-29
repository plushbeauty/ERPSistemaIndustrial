/**
 * SYNQRA ERP INDUSTRIAL — controles operacionais adicionais.
 * @REVISAO 29/10/2026
 * Integrações usam sessão Supabase, empresa corrente e RPCs reais.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardCheck, Factory, LockKeyhole, MessageSquareText, Send, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Product = { id: string; codigo: string; nome: string }
type Machine = { id: string; codigo: string; nome: string; status: string }
type BomRow = { produto_id: string; sku_insumo: string; qtd: number; unidade: string }
type StockLot = { id: string; produto_id: string; lote: string; quantidade_disponivel: number; validade: string | null }
type Reservation = { produtoId: string; loteId: string; quantidade: string }
type Order = { id: string; numero_op: string; produto_id: string; quantidade_planejada: number; status: string }
type MessageRow = { id: string; autor_auth_id: string; corpo: string; tipo_mensagem: 'Comentario' | 'Notificacao_Sistema'; created_at: string }
type RatingRow = { id: string; nota: number; comentario: string | null; created_at: string }
type PasswordPolicy = { id: string; comprimento_minimo: number; exigir_maiuscula: boolean; exigir_numero: boolean }

const panel = 'rounded-xl border border-slate-700 bg-[#111827] p-4 text-slate-100 shadow-xl'
const field = 'min-h-9 w-full rounded-xl border border-slate-600 bg-[#0b0f19] px-3 py-2 text-xs text-slate-100 outline-none focus:border-orange-500'
const label = 'mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400'
const primary = 'inline-flex min-h-9 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50'

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação.'
}

export function OpEmissionScreen() {
  const [empresaId, setEmpresaId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [bom, setBom] = useState<BomRow[]>([])
  const [lots, setLots] = useState<StockLot[]>([])
  const [reservations, setReservations] = useState<Record<string, Reservation>>({})
  const [productId, setProductId] = useState('')
  const [machineId, setMachineId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const tenant = await supabase.rpc('erp_current_empresa_id')
        if (tenant.error || typeof tenant.data !== 'string' || !tenant.data) throw tenant.error ?? new Error('Empresa ativa não identificada.')
        const id = tenant.data
        const [p, m] = await Promise.all([
          supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', id).eq('ativo', true).order('codigo').limit(3000),
          supabase.from('erp_maquinas').select('id,codigo,nome,status').eq('empresa_id', id).eq('ativo', true).order('codigo').limit(1000),
        ])
        if (p.error || m.error) throw p.error ?? m.error
        if (!alive) return
        setEmpresaId(id)
        setProducts((p.data ?? []) as Product[])
        setMachines((m.data ?? []) as Machine[])
      } catch (cause) {
        if (alive) setError(messageOf(cause))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const requiredByProduct = useMemo(() => {
    const map = new Map<string, { sku: string; qty: number; unit: string }>()
    for (const row of bom) {
      const current = map.get(row.produto_id)
      map.set(row.produto_id, { sku: row.sku_insumo, qty: (current?.qty ?? 0) + Number(row.qtd), unit: row.unidade })
    }
    return [...map.entries()].map(([id, item]) => ({ id, ...item, required: item.qty * Math.max(0, Number(quantity) || 0) }))
  }, [bom, quantity])

  const loadBomAndLots = useCallback(async (selectedProduct: string) => {
    setError('')
    setNotice('')
    setBom([])
    setLots([])
    setReservations({})
    if (!selectedProduct || !empresaId) return
    const result = await supabase.from('erp_pcp_bom_itens').select('produto_id,sku_insumo,qtd,unidade').eq('empresa_id', empresaId).eq('produto_pai_id', selectedProduct)
    if (result.error) throw result.error
    const rows = (result.data ?? []) as BomRow[]
    if (!rows.length) {
      setBom([])
      setError('O produto não possui estrutura/BOM cadastrada. Cadastre os componentes antes de emitir a OP com reserva de lotes.')
      return
    }
    setBom(rows)
    const componentIds = [...new Set(rows.map(row => row.produto_id))]
    const lotResult = await supabase.from('erp_lotes_materiais').select('id,produto_id,lote,quantidade_disponivel,validade').eq('empresa_id', empresaId).eq('status', 'ativo').in('produto_id', componentIds).order('lote').limit(5000)
    if (lotResult.error) throw lotResult.error
    setLots((lotResult.data ?? []) as StockLot[])
  }, [empresaId])

  useEffect(() => {
    void loadBomAndLots(productId).catch(cause => setError(messageOf(cause)))
  }, [productId, loadBomAndLots])

  const emit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      if (!productId || !machineId || Number(quantity) <= 0 || !Number.isFinite(Number(quantity))) throw new Error('Selecione produto, máquina e quantidade positiva.')
      if (!bom.length || !requiredByProduct.length) throw new Error('Estrutura/BOM sem componentes; emissão bloqueada para preservar a rastreabilidade.')
      const payload = requiredByProduct.map(component => {
        const reservation = reservations[component.id]
        if (!reservation?.loteId) throw new Error('Selecione um lote para cada componente da BOM.')
        const lot = lots.find(item => item.id === reservation.loteId)
        if (!lot || lot.produto_id !== component.id) throw new Error('O lote escolhido não pertence ao componente selecionado.')
        return { lote_material_id: reservation.loteId, quantidade: component.required }
      })
      const result = await supabase.rpc('erp_pcp_emitir_op_com_lotes', {
        p_produto_id: productId,
        p_quantidade: Number(quantity),
        p_maquina_id: machineId,
        p_lotes: payload,
        p_pedido_venda_id: null,
        p_velocidade_nominal_hora: null,
        p_operacao_dupla: false,
      })
      if (result.error) throw result.error
      const row = (Array.isArray(result.data) ? result.data[0] : result.data) as { numero_op?: number } | null
      setNotice(row?.numero_op ? 'OP ' + row.numero_op + ' emitida com reserva de lotes confirmada.' : 'OP emitida com reserva de lotes confirmada.')
      setProductId('')
      setMachineId('')
      setQuantity('')
      setBom([])
      setLots([])
      setReservations({})
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className={panel}>Carregando produtos, máquinas e estrutura da empresa…</div>
  return <section className={panel + ' space-y-4'}>
    <header className="flex items-center gap-3 border-b border-slate-700 pb-3"><Factory className="text-orange-400" size={20}/><div><h2 className="text-sm font-extrabold uppercase tracking-wide">Emissão de Ordem de Produção</h2><p className="mt-1 text-xs text-slate-400">Produto, máquina, BOM e reserva transacional dos lotes reais.</p></div></header>
    {error && <div role="alert" className="flex gap-2 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200"><AlertTriangle size={15}/>{error}</div>}
    {notice && <div role="status" className="flex gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-200"><CheckCircle2 size={15}/>{notice}</div>}
    <form onSubmit={emit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div><label className={label}>Produto acabado *</label><select className={field} value={productId} onChange={event => setProductId(event.target.value)} required><option value="">Selecione produto cadastrado</option>{products.map(p => <option key={p.id} value={p.id}>{p.codigo} · {p.nome}</option>)}</select></div>
        <div><label className={label}>Máquina *</label><select className={field} value={machineId} onChange={event => setMachineId(event.target.value)} required><option value="">Selecione máquina ativa</option>{machines.map(m => <option key={m.id} value={m.id}>{m.codigo} · {m.nome} ({m.status})</option>)}</select></div>
        <div><label className={label}>Quantidade planejada *</label><input className={field} type="number" min="0.0001" step="0.0001" value={quantity} onChange={event => setQuantity(event.target.value)} required/></div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full min-w-[700px] text-left text-xs"><thead className="bg-[#0b0f19] text-[10px] uppercase tracking-wide text-slate-400"><tr><th className="p-3">Componente BOM</th><th className="p-3">Necessário</th><th className="p-3">Lote real disponível</th><th className="p-3">Disponível</th></tr></thead>
          <tbody>{requiredByProduct.map(component => {
            const options = lots.filter(lot => lot.produto_id === component.id)
            const current = reservations[component.id]
            return <tr key={component.id} className="border-t border-slate-800"><td className="p-3"><div className="font-bold text-white">{products.find(p => p.id === component.id)?.codigo ?? component.sku}</div><div className="mt-1 text-[10px] text-slate-400">{products.find(p => p.id === component.id)?.nome ?? component.sku} · {component.unit}</div></td><td className="p-3 tabular-nums">{component.required.toLocaleString('pt-BR',{maximumFractionDigits:4})}</td><td className="p-3"><select className={field} value={current?.loteId ?? ''} onChange={event => { const lot = options.find(item => item.id === event.target.value); setReservations(prev => ({...prev,[component.id]:{produtoId:component.id,loteId:event.target.value,quantidade:String(component.required)}})); if (!lot) setError('Selecione um lote disponível para o componente.') }} required><option value="">Selecione lote</option>{options.map(lot => <option key={lot.id} value={lot.id}>{lot.lote} · validade {lot.validade ?? 'não informada'}</option>)}</select>{!options.length && <p className="mt-1 text-[10px] text-amber-300">Sem lote ativo para este componente.</p>}</td><td className="p-3 tabular-nums">{current?.loteId ? Number(lots.find(l => l.id === current.loteId)?.quantidade_disponivel ?? 0).toLocaleString('pt-BR',{maximumFractionDigits:4}) : '—'}</td></tr>
          })}{!requiredByProduct.length && <tr><td colSpan={4} className="p-5 text-center text-slate-500">Selecione um produto com estrutura/BOM.</td></tr>}</tbody>
        </table>
      </div>
      <p className="text-[10px] leading-5 text-slate-400">A emissão exige ficha de processo aprovada, BOM cadastrada e lotes ativos suficientes. A reserva não reduz o saldo físico; a baixa de consumo deve ocorrer no apontamento de produção.</p>
      <div className="flex justify-end"><button className={primary} type="submit" disabled={saving || !products.length || !machines.length}>{saving ? 'Emitindo…' : 'Emitir OP e reservar lotes'}</button></div>
    </form>
  </section>
}

export function PasswordPolicyPanel() {
  const [authorized, setAuthorized] = useState(false)
  const [checked, setChecked] = useState(false)
  const [policy, setPolicy] = useState<PasswordPolicy | null>(null)
  const [minimum, setMinimum] = useState(8)
  const [uppercase, setUppercase] = useState(true)
  const [number, setNumber] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!auth.user) throw new Error('Sessão autenticada necessária.')
        const { data: isMaster, error: masterError } = await supabase.rpc('erp_is_master')
        if (masterError) throw masterError
        if (isMaster !== true) throw new Error('A política global de senha é exclusiva do usuário Master autenticado.')
        const { data, error: loadError } = await supabase.from('erp_sistema_politica_senha').select('id,comprimento_minimo,exigir_maiuscula,exigir_numero').eq('singleton', true).single()
        if (loadError) throw loadError
        if (!alive) return
        const saved = data as PasswordPolicy
        setPolicy(saved)
        setMinimum(saved.comprimento_minimo)
        setUppercase(saved.exigir_maiuscula)
        setNumber(saved.exigir_numero)
        setAuthorized(true)
      } catch (cause) {
        if (alive) setError(messageOf(cause))
      } finally {
        if (alive) setChecked(true)
      }
    })()
    return () => { alive = false }
  }, [])
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!policy) return
    setSaving(true); setError(''); setNotice('')
    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('Sessão expirada.')
      const { error: updateError } = await supabase.from('erp_sistema_politica_senha').update({ comprimento_minimo: minimum, exigir_maiuscula: uppercase, exigir_numero: number, atualizado_por: auth.user.id, atualizado_em: new Date().toISOString() }).eq('id', policy.id)
      if (updateError) throw updateError
      setNotice('Política global de senha atualizada. O cadastro público e os fluxos administrativos usam estas regras após a migration ser aplicada e as Edge Functions serem publicadas.')
    } catch (cause) { setError(messageOf(cause)) } finally { setSaving(false) }
  }
  if (!checked) return <section className={panel}>Validando identidade Master…</section>
  if (!authorized) return <section className={panel}><div className="flex items-center gap-2 text-sm font-bold"><LockKeyhole size={17} className="text-orange-400"/>Política global de senha</div><p className="mt-2 text-xs text-slate-400">Configuração restrita à identidade Master. {error}</p></section>
  return <section className={panel + ' space-y-4'}>
    <header className="flex items-center gap-3 border-b border-slate-700 pb-3"><ShieldCheck size={20} className="text-orange-400"/><div><h2 className="text-sm font-extrabold uppercase tracking-wide">Políticas globais de senha</h2><p className="mt-1 text-xs text-slate-400">Acesso exclusivo Master; configuração sem ID fixo.</p></div></header>
    {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}{notice && <p role="status" className="text-xs text-emerald-300">{notice}</p>}
    <form onSubmit={save} className="space-y-4">
      <div><label className={label}>Comprimento mínimo (8–128)</label><input className={field} type="number" min={8} max={128} value={minimum} onChange={event => setMinimum(Math.min(128,Math.max(8,Number(event.target.value)||8)))} required/></div>
      <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-[#0b0f19] p-3 text-xs text-slate-300"><input type="checkbox" checked={uppercase} onChange={event => setUppercase(event.target.checked)} className="accent-orange-500"/>Exigir pelo menos uma letra maiúscula</label>
      <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-[#0b0f19] p-3 text-xs text-slate-300"><input type="checkbox" checked={number} onChange={event => setNumber(event.target.checked)} className="accent-orange-500"/>Exigir pelo menos um número</label>
      <button className={primary} type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Aplicar política'}</button>
    </form>
  </section>
}

export function SynqraAuditoriaModulo() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [ratings, setRatings] = useState<RatingRow[]>([])
  const [comment, setComment] = useState('')
  const [rating, setRating] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [empresaId, setEmpresaId] = useState('')
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const load = useCallback(async () => {
    setError('')
    const [tenant, auth] = await Promise.all([supabase.rpc('erp_current_empresa_id'), supabase.auth.getUser()])
    if (tenant.error || typeof tenant.data !== 'string' || !tenant.data) throw tenant.error ?? new Error('Empresa ativa não identificada.')
    if (auth.error || !auth.data.user) throw auth.error ?? new Error('Sessão autenticada necessária.')
    setEmpresaId(tenant.data)
    setUserId(auth.data.user.id)
    const result = await supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,quantidade_planejada,status').eq('empresa_id', tenant.data).order('created_at', {ascending:false}).limit(200)
    if (result.error) throw result.error
    const rows = (result.data ?? []) as Order[]
    setOrders(rows)
    if (!selectedId && rows[0]) setSelectedId(rows[0].id)
  }, [selectedId])
  useEffect(() => { void load().catch(cause => setError(messageOf(cause))).finally(() => setLoading(false)) }, [load])
  const loadRecord = useCallback(async () => {
    if (!selectedId || !empresaId) { setMessages([]); setRatings([]); return }
    const [m, r] = await Promise.all([
      supabase.from('erp_synqra_discuss_message').select('id,autor_auth_id,corpo,tipo_mensagem,created_at').eq('empresa_id', empresaId).eq('res_model','erp_ordens_producao').eq('res_id',selectedId).order('created_at',{ascending:true}),
      supabase.from('erp_synqra_rating').select('id,nota,comentario,created_at').eq('empresa_id',empresaId).eq('res_model','erp_ordens_producao').eq('res_id',selectedId).order('created_at',{ascending:false}),
    ])
    if (m.error || r.error) throw m.error ?? r.error
    setMessages((m.data ?? []) as MessageRow[])
    setRatings((r.data ?? []) as RatingRow[])
  }, [selectedId, empresaId])
  useEffect(() => { void loadRecord().catch(cause => setError(messageOf(cause))) }, [loadRecord])
  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedId || !comment.trim()) return
    setSaving(true); setError(''); setNotice('')
    try {
      const result = await supabase.from('erp_synqra_discuss_message').insert({empresa_id:empresaId,res_model:'erp_ordens_producao',res_id:selectedId,autor_auth_id:userId,corpo:comment.trim(),tipo_mensagem:'Comentario'})
      if (result.error) throw result.error
      setComment('')
      await loadRecord()
      setNotice('Nota técnica registrada no histórico da OP.')
    } catch (cause) { setError(messageOf(cause)) } finally { setSaving(false) }
  }
  const sendRating = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedId) return
    setSaving(true); setError(''); setNotice('')
    try {
      const result = await supabase.from('erp_synqra_rating').insert({empresa_id:empresaId,res_model:'erp_ordens_producao',res_id:selectedId,nota:rating,comentario:ratingComment.trim()||null,operador_auth_id:userId})
      if (result.error) throw result.error
      setRatingComment('')
      await loadRecord()
      setNotice('Avaliação de conformidade registrada.')
    } catch (cause) { setError(messageOf(cause)) } finally { setSaving(false) }
  }
  if (loading) return <section className={panel}>Carregando histórico de auditoria…</section>
  return <section className={panel + ' space-y-4'}>
    <header className="flex items-center gap-3 border-b border-slate-700 pb-3"><MessageSquareText size={20} className="text-orange-400"/><div><h2 className="text-sm font-extrabold uppercase tracking-wide">Histórico de Auditoria e Inspeção de Conformidade</h2><p className="mt-1 text-xs text-slate-400">Apontamentos vinculados à OP selecionada, isolados por empresa.</p></div></header>
    {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}{notice && <p role="status" className="text-xs text-emerald-300">{notice}</p>}
    <div><label className={label}>Ordem de produção</label><select className={field} value={selectedId} onChange={event => setSelectedId(event.target.value)}><option value="">Selecione OP existente</option>{orders.map(order=><option key={order.id} value={order.id}>OP {order.numero_op} · {order.status}</option>)}</select></div>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="space-y-3"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-300">Conversas · Histórico de Auditoria</h3><div className="max-h-64 min-h-32 space-y-2 overflow-auto rounded-xl border border-slate-700 bg-[#0b0f19] p-3">{messages.map(msg=><article key={msg.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3"><div className="mb-1 flex justify-between gap-2 text-[10px] text-slate-500"><span className="text-orange-300">{msg.autor_auth_id === userId ? 'Você' : 'Usuário autenticado'}</span><time>{new Date(msg.created_at).toLocaleString('pt-BR')}</time></div><p className="whitespace-pre-wrap text-xs leading-5 text-slate-200">{msg.corpo}</p></article>)}{!messages.length&&<p className="text-xs text-slate-500">Nenhuma nota técnica registrada para esta OP.</p>}</div><form onSubmit={sendMessage} className="flex gap-2"><input className={field} value={comment} onChange={event=>setComment(event.target.value)} maxLength={10000} placeholder="Registrar nota técnica…" required/><button className={primary} type="submit" disabled={saving||!selectedId}><Send size={13}/>Registrar</button></form></div>
      <div className="space-y-3"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-300">Inspeção de Conformidade</h3><form onSubmit={sendRating} className="space-y-3 rounded-xl border border-slate-700 bg-[#0b0f19] p-3"><label className={label}>Nota de 1 a 5</label><select className={field} value={rating} onChange={event=>setRating(Number(event.target.value))}><option value={0} disabled>Selecione uma nota</option>{[5,4,3,2,1].map(n=><option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5-n)} ({n})</option>)}</select><label className={label}>Comentário técnico</label><textarea className={field} rows={3} maxLength={5000} value={ratingComment} onChange={event=>setRatingComment(event.target.value)} placeholder="Critério, evidência e observação técnica"/><button className={primary} type="submit" disabled={saving||!selectedId||rating<1}><ClipboardCheck size={14}/>Registrar laudo</button></form><div className="max-h-48 space-y-2 overflow-auto">{ratings.map(item=><article key={item.id} className="rounded-lg border border-slate-700 bg-slate-900 p-3"><div className="flex justify-between gap-2 text-[10px]"><span className="text-amber-300">{'★'.repeat(item.nota)}{'☆'.repeat(5-item.nota)}</span><time className="text-slate-500">{new Date(item.created_at).toLocaleDateString('pt-BR')}</time></div>{item.comentario&&<p className="mt-1 text-xs text-slate-300">{item.comentario}</p>}</article>)}{!ratings.length&&<p className="text-xs text-slate-500">Nenhuma avaliação anterior.</p>}</div></div>
    </div>
  </section>
}
