/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-10
 * @REVISAO: REV-FIN-NOTAS-DEBITO-WORKSPACE-20261110-01 — central financeira com consulta, cadastro, edição, anexos e persistência multiempresa.
 * @STATUS_APROVACAO: IMPLEMENTAÇÃO AUTORIZADA PELO PROPRIETÁRIO EM 2026-11-10; manter verify:official-screens-lock ativo.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { FileText, Plus, Search, RefreshCw, Save, X, Pencil, Paperclip, Upload, ArrowRightLeft, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

type Partner = { id: string; nome: string; nome_fantasia?: string | null; razao_social?: string | null; documento?: string | null }
type Account = { id: string; nome: string; banco?: string }
type CostCenter = { id: string; codigo: string; nome: string }
type Note = {
  id: string; numero_nota: string; documento_ref: string | null; cliente_id: string | null;
  entidade_nome: string; data_emissao: string; data_vencimento: string; tipo_lancamento: string;
  valor_principal: number; acrescimos: number; descontos: number; valor_total: number; status: string;
  conta_bancaria_id: string | null; centro_custo_id: string | null; descricao: string;
  comprovante_path: string | null; gerar_titulo: boolean; disponibilizar_conciliacao: boolean;
}
type Draft = Omit<Note, 'id' | 'status' | 'comprovante_path'> & { id?: string; comprovante_path?: string | null }
const empty: Draft = {
  numero_nota: '', documento_ref: '', cliente_id: null, entidade_nome: '', data_emissao: '', data_vencimento: '',
  tipo_lancamento: 'A_RECEBER', valor_principal: '', acrescimos: '', descontos: '', valor_total: 0,
  conta_bancaria_id: '', centro_custo_id: '', descricao: '', gerar_titulo: false,
  disponibilizar_conciliacao: false, comprovante_path: null,
} as unknown as Draft
const money = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const date = (v?: string | null) => v ? new Date(v + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
const field = 'erp-input w-full'
const label = 'erp-label block mb-1'
const btn = 'erp-btn inline-flex items-center justify-center gap-2'
const primary = 'erp-btn-primary inline-flex items-center justify-center gap-2'

export default function CustomerDnSettings() {
  const [rows, setRows] = useState<Note[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [centers, setCenters] = useState<CostCenter[]>([])
  const [draft, setDraft] = useState<Draft>(empty)
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState('TODOS')
  const [status, setStatus] = useState('TODOS')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [proof, setProof] = useState<File | null>(null)
  const [statement, setStatement] = useState<File | null>(null)
  const [statementAccount, setStatementAccount] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [notes, clients, bank, cost] = await Promise.all([
        supabase.from('erp_notas_debito_financeiras').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('erp_clientes').select('id,nome,nome_fantasia,razao_social,documento').eq('ativo', true).order('nome').limit(1000),
        supabase.from('erp_contas_bancarias').select('id,nome,banco').eq('ativo', true).order('nome'),
        supabase.from('erp_centros_custos').select('id,codigo,nome').eq('ativo', true).order('codigo'),
      ])
      if (notes.error) throw notes.error
      if (clients.error) throw clients.error
      if (bank.error) throw bank.error
      if (cost.error) throw cost.error
      setRows((notes.data ?? []) as Note[])
      setPartners((clients.data ?? []) as Partner[])
      setAccounts((bank.data ?? []) as Account[])
      setCenters((cost.data ?? []) as CostCenter[])
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível carregar os dados financeiros.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])
  const filtered = useMemo(() => rows.filter(row => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    const matches = !term || [row.numero_nota, row.documento_ref, row.entidade_nome].some(v => String(v ?? '').toLocaleLowerCase('pt-BR').includes(term))
    return matches && (kind === 'TODOS' || row.tipo_lancamento === kind) && (status === 'TODOS' || row.status === status)
  }), [rows, search, kind, status])
  const total = useMemo(() => filtered.reduce((sum, row) => sum + Number(row.valor_total || 0), 0), [filtered])
  const principal = Number(draft.valor_principal || 0), additions = Number(draft.acrescimos || 0), discounts = Number(draft.descontos || 0)
  const computedTotal = Math.max(0, principal + additions - discounts)
  function update<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft(current => ({ ...current, [key]: value, ...(key === 'cliente_id' ? { entidade_nome: partners.find(p => p.id === value)?.razao_social || partners.find(p => p.id === value)?.nome_fantasia || partners.find(p => p.id === value)?.nome || '' } : {}) })) }
  function newNote() { setDraft({ ...empty, data_emissao: new Date().toISOString().slice(0,10), data_vencimento: '' }); setProof(null); setEditing(true); setMessage(''); setError('') }
  function editNote(row: Note) { setDraft({ ...row }); setProof(null); setEditing(true); setMessage(''); setError('') }
  async function uploadProof(empresaId: string, noteId: string) {
    if (!proof) return draft.comprovante_path ?? null
    const safeName = proof.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = empresaId + '/' + noteId + '/' + Date.now() + '-' + safeName
    const uploaded = await supabase.storage.from('financeiro-comprovantes').upload(path, proof, { upsert: false })
    if (uploaded.error) throw uploaded.error
    return path
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('')
    try {
      if (!draft.cliente_id) throw new Error('Selecione um cliente cadastrado.')
      if (!draft.data_emissao || !draft.data_vencimento) throw new Error('Informe emissão e vencimento.')
      if (computedTotal <= 0) throw new Error('O valor total deve ser maior que zero.')
      if (!draft.conta_bancaria_id || !draft.centro_custo_id) throw new Error('Selecione a conta bancária e o centro de custo.')
      if (!draft.descricao.trim()) throw new Error('Descreva o motivo do débito.')
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      if (typeof tenant.data !== 'string' || !tenant.data) throw new Error('Empresa da sessão não identificada.')
      const user = await supabase.auth.getUser()
      if (user.error) throw user.error
      const id = draft.id || crypto.randomUUID()
      const comprovante_path = await uploadProof(tenant.data, id)
      const payload = {
        id, empresa_id: tenant.data, numero_nota: draft.numero_nota.trim() || null,
        documento_ref: draft.documento_ref?.trim() || null, cliente_id: draft.cliente_id,
        entidade_nome: draft.entidade_nome, data_emissao: draft.data_emissao, data_vencimento: draft.data_vencimento,
        tipo_lancamento: draft.tipo_lancamento, valor_principal: principal, acrescimos: additions,
        descontos: discounts, valor_total: computedTotal, conta_bancaria_id: draft.conta_bancaria_id,
        centro_custo_id: draft.centro_custo_id, descricao: draft.descricao.trim(), comprovante_path,
        gerar_titulo: draft.gerar_titulo, disponibilizar_conciliacao: draft.disponibilizar_conciliacao,
        criado_por: user.data.user?.id ?? null,
      }
      const result = await supabase.from('erp_notas_debito_financeiras').upsert(payload).select('id').single()
      if (result.error) throw result.error
      setEditing(false); setDraft({ ...empty }); setProof(null); setMessage('Nota de débito gravada no banco de dados.')
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao salvar a nota de débito.') }
    finally { setSaving(false) }
  }
  async function uploadStatement() {
    setError(''); setMessage('')
    try {
      if (!statement || !statementAccount) throw new Error('Selecione o arquivo e a conta bancária.')
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      if (typeof tenant.data !== 'string' || !tenant.data) throw new Error('Empresa da sessão não identificada.')
      const ext = statement.name.split('.').pop()?.toLowerCase() || ''
      if (!['ofx','txt','ret','rem'].includes(ext)) throw new Error('Formato não aceito. Selecione OFX ou arquivo CNAB.')
      const path = tenant.data + '/extratos/' + Date.now() + '-' + statement.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const uploaded = await supabase.storage.from('financeiro-comprovantes').upload(path, statement, { upsert: false })
      if (uploaded.error) throw uploaded.error
      const registered = await supabase.from('erp_notas_debito_extratos').insert({
        empresa_id: tenant.data, conta_bancaria_id: statementAccount, arquivo_nome: statement.name,
        arquivo_path: path, formato: ext.toUpperCase(), status: 'AGUARDANDO_CONFERENCIA',
      })
      if (registered.error) throw registered.error
      setMessage('Extrato recebido e registrado. A conferência e a conciliação devem ser concluídas na rotina própria.')
      setStatement(null)
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao registrar extrato.') }
  }

  return <main className="space-y-5 p-5" data-synqra-density="30px">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-3xl text-xs text-muted-foreground">Acompanhe notas de débito, registre reembolsos e organize comprovantes e rotinas integradas. Os registros são isolados pela empresa autenticada.</p>
      <button type="button" className={primary} onClick={newNote}><Plus size={15}/>Nova Nota de Débito</button>
    </div>
    <nav aria-label="Acesso rápido às rotinas financeiras" className="flex flex-wrap gap-3">
      <Link className={primary} to="/pageprincipal/financeiro/notas-debito/configuracoes"><FileText size={14}/>Notas de Débito</Link>
      <Link className={btn} to="/pageprincipal/financeiro/conciliacao-bancaria"><ArrowRightLeft size={14}/>Conciliação Bancária</Link>
      <Link className={btn} to="/pageprincipal/financeiro/importar-extratos"><Upload size={14}/>Importar Extratos OFX/CNAB</Link>
      <Link className={btn} to="/pageprincipal/financeiro"><RotateCcw size={14}/>Demais Operações</Link>
    </nav>
    {error && <div role="alert" className="erp-card border border-red-200 p-3 text-xs text-red-700">{error}</div>}
    {message && <div role="status" className="erp-card border border-emerald-200 p-3 text-xs text-emerald-700">{message}</div>}
    <section className="erp-card space-y-3 p-4">
      <h2 className="text-sm font-semibold text-foreground">Filtros de busca</h2>
      <div className="grid gap-3 xl:grid-cols-[minmax(260px,2fr)_minmax(150px,1fr)_minmax(150px,1fr)_auto]">
        <label><span className={label}>Busca rápida</span><input className={field} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar nº nota, documento ou entidade..."/></label>
        <label><span className={label}>Tipo de operação</span><select className={field} value={kind} onChange={e=>setKind(e.target.value)}><option value="TODOS">Todas</option><option value="A_RECEBER">A Receber (Reembolso)</option><option value="A_PAGAR">A Pagar</option></select></label>
        <label><span className={label}>Status</span><select className={field} value={status} onChange={e=>setStatus(e.target.value)}><option value="TODOS">Todos</option><option value="ABERTA">Aberta</option><option value="TITULO_GERADO">Título gerado</option><option value="CANCELADA">Cancelada</option></select></label>
        <div className="flex items-end gap-2"><button type="button" className={primary} onClick={()=>void load()} disabled={loading}><Search size={14}/>Buscar</button><button type="button" className={btn} onClick={()=>{setSearch('');setKind('TODOS');setStatus('TODOS')}}>Limpar</button></div>
      </div>
    </section>
    <section className="erp-card overflow-x-auto">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4"><div><h2 className="text-sm font-semibold">Listagem de Notas de Débito</h2><p className="text-xs text-muted-foreground">{filtered.length} registro(s) · Total filtrado: {money(total)}</p></div><button type="button" className={btn} onClick={()=>void load()} disabled={loading}><RefreshCw size={13}/>Atualizar</button></div>
      <table className="w-full min-w-[980px] border-collapse text-left text-xs"><thead><tr>{['Nº Nota','Documento Ref.','Cliente / Fornecedor','Emissão','Vencimento','Valor (R$)','Status','Ações'].map(x=><th key={x} className="erp-th">{x}</th>)}</tr></thead><tbody>
        {loading && <tr><td colSpan={8} className="erp-td py-8 text-center">Carregando registros...</td></tr>}
        {!loading && filtered.map(row=><tr key={row.id} className="erp-tr"><td className="erp-td font-semibold">{row.numero_nota || row.id.slice(0,8)}</td><td className="erp-td">{row.documento_ref || '—'}</td><td className="erp-td">{row.entidade_nome || '—'}</td><td className="erp-td">{date(row.data_emissao)}</td><td className="erp-td">{date(row.data_vencimento)}</td><td className="erp-td text-right font-semibold">{money(row.valor_total)}</td><td className="erp-td">{row.status}</td><td className="erp-td"><button type="button" className={btn+' px-2'} onClick={()=>editNote(row)} aria-label="Editar nota"><Pencil size={13}/>Editar</button></td></tr>)}
        {!loading && filtered.length===0 && <tr><td colSpan={8} className="erp-td py-10 text-center text-muted-foreground">Nenhum registro encontrado.</td></tr>}
      </tbody></table>
    </section>
    {editing && <section className="erp-card space-y-4 p-5" aria-label="Cadastro e edição de nota de débito">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold">{draft.id?'Editar Nota de Débito':'Cadastro de Nota de Débito'}</h2><p className="text-xs text-muted-foreground">Campos obrigatórios marcados com *.</p></div><button type="button" className={btn} onClick={()=>setEditing(false)}><X size={14}/>Fechar</button></div>
      <form onSubmit={save} className="space-y-5">
        <section className="space-y-3"><h3 className="text-xs font-bold uppercase tracking-wide text-foreground">1. Identificação e vínculo</h3><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label><span className={label}>Nº Nota</span><input className={field} value={draft.numero_nota||''} onChange={e=>update('numero_nota',e.target.value)} placeholder="Gerado ao salvar"/></label>
          <label><span className={label}>Documento / Pedido origem</span><input className={field} value={draft.documento_ref||''} onChange={e=>update('documento_ref',e.target.value)}/></label>
          <label><span className={label}>Data de emissão *</span><input required type="date" className={field} value={draft.data_emissao||''} onChange={e=>update('data_emissao',e.target.value)}/></label>
          <label><span className={label}>Data de vencimento *</span><input required type="date" className={field} value={draft.data_vencimento||''} onChange={e=>update('data_vencimento',e.target.value)}/></label>
        </div><div className="grid gap-3 md:grid-cols-[minmax(240px,1.5fr)_minmax(220px,1fr)]">
          <label><span className={label}>Cliente / Fornecedor *</span><select required className={field} value={draft.cliente_id||''} onChange={e=>update('cliente_id',e.target.value||null)}><option value="">Selecionar cliente cadastrado...</option>{partners.map(p=><option key={p.id} value={p.id}>{p.razao_social||p.nome_fantasia||p.nome}{p.documento?' · '+p.documento:''}</option>)}</select></label>
          <label><span className={label}>Tipo de lançamento *</span><select className={field} value={draft.tipo_lancamento} onChange={e=>update('tipo_lancamento',e.target.value)}><option value="A_RECEBER">A Receber (Reembolso)</option><option value="A_PAGAR">A Pagar</option></select></label>
        </div></section>
        <section className="space-y-3"><h3 className="text-xs font-bold uppercase tracking-wide text-foreground">2. Valores e classificação financeira</h3><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label><span className={label}>Valor principal (R$) *</span><input required type="number" min="0.01" step="0.01" className={field} value={draft.valor_principal as number||''} onChange={e=>update('valor_principal',e.target.value as unknown as number)}/></label>
          <label><span className={label}>Acréscimos / taxas (R$)</span><input type="number" min="0" step="0.01" className={field} value={draft.acrescimos as number||''} onChange={e=>update('acrescimos',e.target.value as unknown as number)}/></label>
          <label><span className={label}>Descontos (R$)</span><input type="number" min="0" step="0.01" className={field} value={draft.descontos as number||''} onChange={e=>update('descontos',e.target.value as unknown as number)}/></label>
          <label><span className={label}>Valor total (R$)</span><input readOnly className={field+' bg-muted font-semibold'} value={money(computedTotal)}/></label>
        </div><div className="grid gap-3 md:grid-cols-2">
          <label><span className={label}>Conta bancária / caixa *</span><select required className={field} value={draft.conta_bancaria_id||''} onChange={e=>update('conta_bancaria_id',e.target.value)}><option value="">Selecionar conta...</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.nome}{a.banco?' · '+a.banco:''}</option>)}</select></label>
          <label><span className={label}>Centro de custo *</span><select required className={field} value={draft.centro_custo_id||''} onChange={e=>update('centro_custo_id',e.target.value)}><option value="">Selecionar categoria...</option>{centers.map(c=><option key={c.id} value={c.id}>{c.codigo} · {c.nome}</option>)}</select></label>
        </div></section>
        <section className="space-y-3"><h3 className="text-xs font-bold uppercase tracking-wide text-foreground">3. Descrição e comprovante</h3><label><span className={label}>Motivo / discriminação do débito *</span><textarea required rows={3} className={field+' min-h-24 py-2'} value={draft.descricao||''} onChange={e=>update('descricao',e.target.value)} placeholder="Descreva os itens, despesas reembolsáveis ou motivo do débito..."/></label>
          <label className="block"><span className={label}>Anexar comprovante / fatura / extrato (PDF, PNG, JPG)</span><input type="file" accept=".pdf,.png,.jpg,.jpeg" className={field+' py-1'} onChange={e=>setProof(e.target.files?.[0]??null)}/>{draft.comprovante_path&&<span className="mt-1 block text-xs text-muted-foreground"><Paperclip size={12} className="inline"/> Comprovante já vinculado</span>}</label>
        </section>
        <section className="space-y-3"><h3 className="text-xs font-bold uppercase tracking-wide text-foreground">4. Ações de rotina integrada</h3><div className="flex flex-wrap gap-x-6 gap-y-2 text-xs"><label className="flex items-center gap-2"><input type="checkbox" checked={draft.gerar_titulo} onChange={e=>update('gerar_titulo',e.target.checked)}/>Gerar título automaticamente no Contas a Receber/Pagar</label><label className="flex items-center gap-2"><input type="checkbox" checked={draft.disponibilizar_conciliacao} onChange={e=>update('disponibilizar_conciliacao',e.target.checked)}/>Disponibilizar para Conciliação Bancária</label></div><p className="text-xs text-muted-foreground">As opções ficam gravadas com a nota. A geração de título/baixa contábil depende da rotina financeira autorizada.</p></section>
        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4"><button type="button" className={btn} onClick={()=>{setDraft({...empty});setProof(null)}}>Limpar</button><button type="button" className={btn} onClick={()=>setEditing(false)}>Cancelar</button><button type="submit" className={primary} disabled={saving}><Save size={14}/>{saving?'Salvando...':'Salvar Nota de Débito'}</button></div>
      </form>
    </section>}
    <section className="erp-card space-y-3 p-4">
      <div><h2 className="text-sm font-semibold">Importação rápida de extrato (OFX / CNAB)</h2><p className="text-xs text-muted-foreground">O arquivo fica armazenado com acesso restrito à empresa e registrado para conferência.</p></div>
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,2fr)_minmax(180px,1fr)_auto]"><label><span className={label}>Selecionar arquivo do banco</span><input type="file" accept=".ofx,.txt,.ret,.rem" className={field+' py-1'} onChange={e=>setStatement(e.target.files?.[0]??null)}/></label><label><span className={label}>Conta bancária</span><select className={field} value={statementAccount} onChange={e=>setStatementAccount(e.target.value)}><option value="">Selecionar conta...</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}</select></label><div className="flex items-end"><button type="button" className={primary} onClick={()=>void uploadStatement()} disabled={!statement||!statementAccount}><Upload size={14}/>Registrar Extrato</button></div></div>
    </section>
  </main>
}
