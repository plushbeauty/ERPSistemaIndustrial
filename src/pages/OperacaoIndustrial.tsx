import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Pencil, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Tab = 'op' | 'fmea' | 'ncr' | 'matriz' | 'estoque'
type Product = { id: string; codigo: string; nome: string; unidade?: string }
type User = { id: string; nome: string; matricula?: string | null }
type Competencia = { id: string; codigo: string; nome: string }
type OP = { id: string; numero: number; produto_id: string; quantidade_planejada: number; quantidade_produzida: number; status: string; data_prevista: string | null; observacoes: string | null }
type Fmea = { id: string; codigo: string; tipo: string; modo_falha: string; efeito: string | null; causa: string | null; severidade: number; ocorrencia: number; deteccao: number; rpn: number | null; status: string; acao_recomendada: string | null }
type Ncr = { id: string; numero: number; origem: string; severidade: string; produto_id: string | null; descricao: string; contencao: string | null; causa_raiz: string | null; status: string; prazo: string | null; rpn: number | null }
type Matriz = { id: string; usuario_id: string; competencia_id: string; nivel_atual: number; status: string; ultima_avaliacao: string | null; proxima_avaliacao: string | null; observacoes: string | null }
type Movimento = { id: string; produto_id: string; tipo: string; quantidade: number; custo_unitario: number; origem: string | null; observacao: string | null; created_at: string }

const tabs: Array<[Tab, string]> = [['op','Ordens de Produção'],['fmea','FMEA'],['ncr','Não Conformidades'],['matriz','Matriz de Competências'],['estoque','Estoque']]
const today = () => new Date().toISOString().slice(0, 10)
const input: React.CSSProperties = { width: '100%', minHeight: 42, border: '1px solid #cbd5e1', borderRadius: 9, padding: '0 10px', fontSize: 14, background: '#fff' }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #dfe7e4', borderRadius: 18, padding: 18, boxShadow: '0 8px 24px rgba(23,32,51,.05)' }
const h2: React.CSSProperties = { fontSize: 20, margin: '0 0 14px', color: '#172033' }

export default function OperacaoIndustrial() {
  const [tab, setTab] = useState<Tab>('op')
  const [empresaId, setEmpresaId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [competencias, setCompetencias] = useState<Competencia[]>([])
  const [ops, setOps] = useState<OP[]>([])
  const [fmeas, setFmeas] = useState<Fmea[]>([])
  const [ncrs, setNcrs] = useState<Ncr[]>([])
  const [matriz, setMatriz] = useState<Matriz[]>([])
  const [movs, setMovs] = useState<Movimento[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [op, setOp] = useState({ produto_id: '', quantidade_planejada: '', quantidade_produzida: '0', status: 'planejada', data_prevista: today(), observacoes: '' })
  const [fmea, setFmea] = useState({ codigo: '', tipo: 'PFMEA', modo_falha: '', efeito: '', causa: '', severidade: '1', ocorrencia: '1', deteccao: '1', acao_recomendada: '', status: 'aberta' })
  const [ncr, setNcr] = useState({ origem: 'processo', severidade: 'media', produto_id: '', descricao: '', contencao: '', causa_raiz: '', status: 'aberta', prazo: '', rpn: '' })
  const [mat, setMat] = useState({ usuario_id: '', competencia_id: '', nivel_atual: '0', status: 'gap', ultima_avaliacao: '', proxima_avaliacao: '', observacoes: '' })
  const [mov, setMov] = useState({ produto_id: '', tipo: 'entrada', quantidade: '', custo_unitario: '0', origem: 'almoxarifado', observacao: '' })

  async function load() {
    setBusy(true); setError('')
    try {
      const { data: empresa, error: empresaError } = await supabase.rpc('erp_current_empresa_id')
      if (empresaError) throw empresaError
      const id = String(empresa || '')
      if (!id) throw new Error('Empresa da sessão não identificada.')
      setEmpresaId(id)
      const [p, u, c, o, f, n, m, e] = await Promise.all([
        supabase.from('erp_produtos').select('id,codigo,nome,unidade').order('codigo').limit(500),
        supabase.from('erp_usuarios').select('id,nome,matricula').eq('ativo', true).order('nome').limit(500),
        supabase.from('erp_competencias').select('id,codigo,nome').eq('ativo', true).order('codigo').limit(500),
        supabase.from('erp_ordens_producao').select('id,numero,produto_id,quantidade_planejada,quantidade_produzida,status,data_prevista,observacoes').order('created_at', { ascending: false }).limit(300),
        supabase.from('erp_fmea').select('id,codigo,tipo,modo_falha,efeito,causa,severidade,ocorrencia,deteccao,rpn,status,acao_recomendada').order('updated_at', { ascending: false }).limit(300),
        supabase.from('erp_nao_conformidades').select('id,numero,origem,severidade,produto_id,descricao,contencao,causa_raiz,status,prazo,rpn').order('created_at', { ascending: false }).limit(300),
        supabase.from('erp_matriz_competencias').select('id,usuario_id,competencia_id,nivel_atual,status,ultima_avaliacao,proxima_avaliacao,observacoes').order('updated_at', { ascending: false }).limit(500),
        supabase.from('erp_estoque_movimentos').select('id,produto_id,tipo,quantidade,custo_unitario,origem,observacao,created_at').order('created_at', { ascending: false }).limit(500),
      ])
      for (const r of [p, u, c, o, f, n, m, e]) if (r.error) throw r.error
      setProducts((p.data || []) as Product[]); setUsers((u.data || []) as User[]); setCompetencias((c.data || []) as Competencia[])
      setOps((o.data || []) as OP[]); setFmeas((f.data || []) as Fmea[]); setNcrs((n.data || []) as Ncr[]); setMatriz((m.data || []) as Matriz[]); setMovs((e.data || []) as Movimento[])
      const firstProduct = p.data?.[0]?.id || ''
      if (!op.produto_id) setOp(x => ({ ...x, produto_id: firstProduct }))
      if (!ncr.produto_id) setNcr(x => ({ ...x, produto_id: firstProduct }))
      if (!mov.produto_id) setMov(x => ({ ...x, produto_id: firstProduct }))
      if (!mat.usuario_id && u.data?.[0]) setMat(x => ({ ...x, usuario_id: u.data[0].id }))
      if (!mat.competencia_id && c.data?.[0]) setMat(x => ({ ...x, competencia_id: c.data[0].id }))
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar o cockpit.') } finally { setBusy(false) }
  }
  useEffect(() => { void load() }, [])

  function clear() { setEditing(null); setNotice(''); setError('') }
  async function save(table: string, payload: Record<string, unknown>, id?: string) {
    setBusy(true); setNotice(''); setError('')
    try {
      if (!empresaId) throw new Error('Empresa da sessão não identificada.')
      const clean = { ...payload, empresa_id: empresaId }
      const response = id
        ? await supabase.from(table).update(clean).eq('id', id).eq('empresa_id', empresaId)
        : await supabase.from(table).insert(clean)
      if (response.error) throw response.error
      setNotice(id ? 'Registro atualizado com sucesso.' : 'Registro criado e persistido no Supabase.')
      clear(); await load(); return true
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar.'); return false } finally { setBusy(false) }
  }
  async function remove(table: string, id: string) {
    if (!confirm('Excluir este registro? Esta operação não pode ser desfeita.')) return
    setBusy(true); setError('')
    try {
      const { error: e } = await supabase.from(table).delete().eq('id', id).eq('empresa_id', empresaId)
      if (e) throw e
      setNotice('Registro excluído.'); await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível excluir.') } finally { setBusy(false) }
  }
  const productName = (id: string | null | undefined) => products.find(x => x.id === id)?.nome || products.find(x => x.id === id)?.codigo || '—'
  const userName = (id: string) => users.find(x => x.id === id)?.nome || '—'
  const compName = (id: string) => competencias.find(x => x.id === id)?.nome || '—'
  const rpn = (s: number, o: number, d: number) => s * o * d
  const q = search.trim().toLowerCase()
  const filtered = <T extends object>(rows: T[]) => !q ? rows : rows.filter(x => JSON.stringify(x).toLowerCase().includes(q))

  async function submitOp(e: FormEvent) { e.preventDefault(); const quantidade = Number(op.quantidade_planejada); if (!op.produto_id || quantidade <= 0) return setError('Informe produto e quantidade planejada maior que zero.'); await save('erp_ordens_producao', { produto_id: op.produto_id, quantidade_planejada: quantidade, quantidade_produzida: Math.max(0, Number(op.quantidade_produzida || 0)), status: op.status, data_prevista: op.data_prevista || null, observacoes: op.observacoes || null }, editing || undefined) }
  async function submitFmea(e: FormEvent) { e.preventDefault(); const s = Number(fmea.severidade), o = Number(fmea.ocorrencia), d = Number(fmea.deteccao); if (!fmea.codigo.trim() || !fmea.modo_falha.trim()) return setError('Informe código e modo de falha.'); if (![s,o,d].every(x => Number.isInteger(x) && x >= 1 && x <= 10)) return setError('S, O e D devem estar entre 1 e 10.'); await save('erp_fmea', { codigo: fmea.codigo.trim(), tipo: fmea.tipo, modo_falha: fmea.modo_falha.trim(), efeito: fmea.efeito || null, causa: fmea.causa || null, severidade: s, ocorrencia: o, deteccao: d, rpn: rpn(s,o,d), status: fmea.status, acao_recomendada: fmea.acao_recomendada || null }, editing || undefined) }
  async function submitNcr(e: FormEvent) { e.preventDefault(); if (!ncr.descricao.trim()) return setError('Informe a descrição da não conformidade.'); await save('erp_nao_conformidades', { origem: ncr.origem, severidade: ncr.severidade, produto_id: ncr.produto_id || null, descricao: ncr.descricao.trim(), contencao: ncr.contencao || null, causa_raiz: ncr.causa_raiz || null, status: ncr.status, prazo: ncr.prazo || null, rpn: ncr.rpn ? Number(ncr.rpn) : null }, editing || undefined) }
  async function submitMat(e: FormEvent) { e.preventDefault(); if (!mat.usuario_id || !mat.competencia_id) return setError('Selecione funcionário e competência.'); await save('erp_matriz_competencias', { usuario_id: mat.usuario_id, competencia_id: mat.competencia_id, nivel_atual: Math.max(0, Number(mat.nivel_atual)), status: mat.status, ultima_avaliacao: mat.ultima_avaliacao || null, proxima_avaliacao: mat.proxima_avaliacao || null, observacoes: mat.observacoes || null }, editing || undefined) }
  async function submitMov(e: FormEvent) { e.preventDefault(); const quantidade = Number(mov.quantidade); if (!mov.produto_id || quantidade <= 0) return setError('Informe produto e quantidade maior que zero.'); await save('erp_estoque_movimentos', { produto_id: mov.produto_id, tipo: mov.tipo, quantidade, custo_unitario: Math.max(0, Number(mov.custo_unitario || 0)), origem: mov.origem || null, observacao: mov.observacao || null }) }

  function edit(type: Tab, row: any) {
    setEditing(row.id); setNotice(''); setError('')
    if (type === 'op') setOp({ produto_id: row.produto_id, quantidade_planejada: String(row.quantidade_planejada), quantidade_produzida: String(row.quantidade_produzida), status: row.status, data_prevista: row.data_prevista || '', observacoes: row.observacoes || '' })
    if (type === 'fmea') setFmea({ codigo: row.codigo, tipo: row.tipo, modo_falha: row.modo_falha, efeito: row.efeito || '', causa: row.causa || '', severidade: String(row.severidade), ocorrencia: String(row.ocorrencia), deteccao: String(row.deteccao), acao_recomendada: row.acao_recomendada || '', status: row.status })
    if (type === 'ncr') setNcr({ origem: row.origem, severidade: row.severidade, produto_id: row.produto_id || '', descricao: row.descricao, contencao: row.contencao || '', causa_raiz: row.causa_raiz || '', status: row.status, prazo: row.prazo || '', rpn: row.rpn == null ? '' : String(row.rpn) })
    if (type === 'matriz') setMat({ usuario_id: row.usuario_id, competencia_id: row.competencia_id, nivel_atual: String(row.nivel_atual), status: row.status, ultima_avaliacao: row.ultima_avaliacao || '', proxima_avaliacao: row.proxima_avaliacao || '', observacoes: row.observacoes || '' })
  }
  const field = (label: string, value: string, onChange: (v: string) => void, type = 'text') => <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 800, color: '#334155' }}>{label}<input type={type} value={value} onChange={e => onChange(e.target.value)} style={input}/></label>
  const select = (label: string, value: string, onChange: (v: string) => void, options: Array<[string,string]>) => <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 800, color: '#334155' }}>{label}<select value={value} onChange={e => onChange(e.target.value)} style={input}>{options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
  const buttons = (label: string) => <div style={{ display: 'flex', gap: 8, marginTop: 14 }}><button className="menu-green" disabled={busy} type="submit"><Save size={16}/>{busy ? 'Salvando…' : editing ? 'Atualizar' : 'Gravar'} {label}</button>{editing && <button className="secondary-v2" type="button" onClick={clear}><X size={16}/>Cancelar</button>}</div>

  return <div style={{ padding: 24, maxWidth: 1600, margin: '0 auto' }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}><div><button className="secondary-v2" type="button" onClick={() => { location.href = '/erp-industrial' }}><ArrowLeft size={17}/> Voltar</button><span className="v2-eyebrow" style={{ display: 'block', marginTop: 14 }}>OPERAÇÃO • CRUD REAL • SUPABASE</span><h1 style={{ fontSize: 34, margin: '5px 0' }}>Cockpit Operacional Industrial</h1><p style={{ margin: 0, color: '#64748b' }}>OP, FMEA, RPNC, competências e estoque com persistência real e isolamento por empresa.</p></div><button className="secondary-v2" type="button" onClick={() => void load()} disabled={busy}><RefreshCw size={17}/> Atualizar dados</button></header>
    <nav style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 14 }}>{tabs.map(([key,label]) => <button key={key} type="button" onClick={() => { setTab(key); clear() }} style={{ padding: '11px 15px', borderRadius: 12, border: key === tab ? '2px solid #0f766e' : '1px solid #dbe3e8', background: key === tab ? '#e9f7f3' : '#fff', fontWeight: 900, whiteSpace: 'nowrap' }}>{label}</button>)}</nav>
    {(notice || error) && <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, background: error ? '#fff1f2' : '#ecfdf5', border: `1px solid ${error ? '#fecdd3' : '#bbf7d0'}`, color: error ? '#9f1239' : '#166534', fontWeight: 800 }}>{error || notice}</div>}
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(330px,420px) minmax(0,1fr)', gap: 16, alignItems: 'start' }}>
      <section style={card}>
        {tab === 'op' && <form onSubmit={submitOp}><h2 style={h2}>{editing ? 'Editar OP' : 'Nova Ordem de Produção'}</h2>{select('Produto',op.produto_id,v=>setOp(x=>({...x,produto_id:v})),products.map(p=>[p.id,`${p.codigo} • ${p.nome}`]))}{field('Quantidade planejada',op.quantidade_planejada,v=>setOp(x=>({...x,quantidade_planejada:v})),'number')}{field('Quantidade produzida',op.quantidade_produzida,v=>setOp(x=>({...x,quantidade_produzida:v})),'number')}{select('Status',op.status,v=>setOp(x=>({...x,status:v})),[['planejada','Planejada'],['liberada','Liberada'],['em_producao','Em produção'],['pausada','Pausada'],['concluida','Concluída'],['cancelada','Cancelada']])}{field('Data prevista',op.data_prevista,v=>setOp(x=>({...x,data_prevista:v})),'date')}{field('Observações',op.observacoes,v=>setOp(x=>({...x,observacoes:v})))}{buttons('OP')}</form>}
        {tab === 'fmea' && <form onSubmit={submitFmea}><h2 style={h2}>{editing ? 'Editar FMEA' : 'Novo FMEA'}</h2>{field('Código',fmea.codigo,v=>setFmea(x=>({...x,codigo:v})))}{select('Tipo',fmea.tipo,v=>setFmea(x=>({...x,tipo:v})),[['PFMEA','PFMEA'],['DFMEA','DFMEA']])}{field('Modo de falha',fmea.modo_falha,v=>setFmea(x=>({...x,modo_falha:v})))}{field('Efeito',fmea.efeito,v=>setFmea(x=>({...x,efeito:v})))}{field('Causa',fmea.causa,v=>setFmea(x=>({...x,causa:v})))}<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>{field('S',fmea.severidade,v=>setFmea(x=>({...x,severidade:v})),'number')}{field('O',fmea.ocorrencia,v=>setFmea(x=>({...x,ocorrencia:v})),'number')}{field('D',fmea.deteccao,v=>setFmea(x=>({...x,deteccao:v})),'number')}</div><div style={{marginTop:8,padding:10,borderRadius:10,background:'#f8fafc'}}>RPN calculado: <b>{rpn(Number(fmea.severidade)||0,Number(fmea.ocorrencia)||0,Number(fmea.deteccao)||0)}</b></div>{field('Ação recomendada',fmea.acao_recomendada,v=>setFmea(x=>({...x,acao_recomendada:v})))}{select('Status',fmea.status,v=>setFmea(x=>({...x,status:v})),[['aberta','Aberta'],['em_analise','Em análise'],['tratada','Tratada'],['encerrada','Encerrada']])}{buttons('FMEA')}</form>}
        {tab === 'ncr' && <form onSubmit={submitNcr}><h2 style={h2}>{editing ? 'Editar RPNC' : 'Nova Não Conformidade'}</h2>{select('Origem',ncr.origem,v=>setNcr(x=>({...x,origem:v})),[['processo','Processo'],['produto','Produto'],['cliente','Cliente'],['fornecedor','Fornecedor'],['auditoria','Auditoria']])}{select('Severidade',ncr.severidade,v=>setNcr(x=>({...x,severidade:v})),[['baixa','Baixa'],['media','Média'],['alta','Alta'],['critica','Crítica']])}{select('Produto',ncr.produto_id,v=>setNcr(x=>({...x,produto_id:v})),[['','Não informado'],...products.map(p=>[p.id,`${p.codigo} • ${p.nome}`])])}{field('Descrição',ncr.descricao,v=>setNcr(x=>({...x,descricao:v})))}{field('Contenção',ncr.contencao,v=>setNcr(x=>({...x,contencao:v})))}{field('Causa raiz',ncr.causa_raiz,v=>setNcr(x=>({...x,causa_raiz:v})))}{field('Prazo',ncr.prazo,v=>setNcr(x=>({...x,prazo:v})),'date')}{field('RPN',ncr.rpn,v=>setNcr(x=>({...x,rpn:v})),'number')}{select('Status',ncr.status,v=>setNcr(x=>({...x,status:v})),[['aberta','Aberta'],['contenção','Contenção'],['investigacao','Investigação'],['capa','CAPA'],['encerrada','Encerrada']])}{buttons('RPNC')}</form>}
        {tab === 'matriz' && <form onSubmit={submitMat}><h2 style={h2}>{editing ? 'Editar competência' : 'Vincular competência'}</h2>{select('Funcionário',mat.usuario_id,v=>setMat(x=>({...x,usuario_id:v})),users.map(u=>[u.id,`${u.nome}${u.matricula ? ` • ${u.matricula}` : ''}`]))}{select('Competência',mat.competencia_id,v=>setMat(x=>({...x,competencia_id:v})),competencias.map(c=>[c.id,`${c.codigo} • ${c.nome}`]))}{field('Nível atual',mat.nivel_atual,v=>setMat(x=>({...x,nivel_atual:v})),'number')}{select('Status',mat.status,v=>setMat(x=>({...x,status:v})),[['gap','Gap'],['em_desenvolvimento','Em desenvolvimento'],['apto','Apto'],['certificado','Certificado']])}{field('Última avaliação',mat.ultima_avaliacao,v=>setMat(x=>({...x,ultima_avaliacao:v})),'date')}{field('Próxima avaliação',mat.proxima_avaliacao,v=>setMat(x=>({...x,proxima_avaliacao:v})),'date')}{field('Observações',mat.observacoes,v=>setMat(x=>({...x,observacoes:v})))}{buttons('competência')}</form>}
        {tab === 'estoque' && <form onSubmit={submitMov}><h2 style={h2}>Novo movimento de estoque</h2><p style={{fontSize:13,color:'#64748b'}}>Movimentos são trilha operacional e não recebem exclusão por esta tela.</p>{select('Produto',mov.produto_id,v=>setMov(x=>({...x,produto_id:v})),products.map(p=>[p.id,`${p.codigo} • ${p.nome}`]))}{select('Tipo',mov.tipo,v=>setMov(x=>({...x,tipo:v})),[['entrada','Entrada'],['saida','Saída'],['consumo','Consumo'],['producao','Produção'],['ajuste','Ajuste'],['transferencia','Transferência'],['devolucao','Devolução']])}{field('Quantidade',mov.quantidade,v=>setMov(x=>({...x,quantidade:v})),'number')}{field('Custo unitário',mov.custo_unitario,v=>setMov(x=>({...x,custo_unitario:v})),'number')}{field('Origem',mov.origem,v=>setMov(x=>({...x,origem:v})))}{field('Observação',mov.observacao,v=>setMov(x=>({...x,observacao:v})))}{buttons('movimento')}</form>}
      </section>
      <section style={card}><div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',marginBottom:12}}><div><h2 style={{...h2,marginBottom:3}}>Registros persistidos</h2><small style={{color:'#64748b'}}>Empresa da sessão: {empresaId || '—'}</small></div><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar…" style={{...input,maxWidth:240}}/></div>
        {tab === 'op' && <Table headers={['OP','Produto','Planejada','Produzida','Status','Previsão','Ações']} rows={filtered(ops).map(x=>[x.numero,productName(x.produto_id),x.quantidade_planejada,x.quantidade_produzida,x.status,x.data_prevista || '—',actions(() => edit('op',x),() => void remove('erp_ordens_producao',x.id))])}/>} 
        {tab === 'fmea' && <Table headers={['Código','Falha','S','O','D','RPN','Status','Ações']} rows={filtered(fmeas).map(x=>[x.codigo,x.modo_falha,x.severidade,x.ocorrencia,x.deteccao,x.rpn ?? rpn(x.severidade,x.ocorrencia,x.deteccao),x.status,actions(() => edit('fmea',x),() => void remove('erp_fmea',x.id))])}/>} 
        {tab === 'ncr' && <Table headers={['RPNC','Origem','Severidade','Descrição','RPN','Status','Prazo','Ações']} rows={filtered(ncrs).map(x=>[x.numero || '—',x.origem,x.severidade,x.descricao,x.rpn ?? '—',x.status,x.prazo || '—',actions(() => edit('ncr',x),() => void remove('erp_nao_conformidades',x.id))])}/>} 
        {tab === 'matriz' && <Table headers={['Funcionário','Competência','Nível','Status','Última','Próxima','Ações']} rows={filtered(matriz).map(x=>[userName(x.usuario_id),compName(x.competencia_id),x.nivel_atual,x.status,x.ultima_avaliacao || '—',x.proxima_avaliacao || '—',actions(() => edit('matriz',x),() => void remove('erp_matriz_competencias',x.id))])}/>} 
        {tab === 'estoque' && <Table headers={['Data','Produto','Tipo','Qtd.','Custo','Origem','Observação']} rows={filtered(movs).map(x=>[new Date(x.created_at).toLocaleString('pt-BR'),productName(x.produto_id),x.tipo,x.quantidade,Number(x.custo_unitario || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),x.origem || '—',x.observacao || '—'])}/>} 
      </section>
    </div>
  </div>
}

function actions(edit: () => void, del: () => void) { return <div style={{display:'flex',gap:6}}><button type="button" className="icon-button" title="Editar" onClick={edit}><Pencil size={15}/></button><button type="button" className="icon-button" title="Excluir" onClick={del}><Trash2 size={15}/></button></div> }
function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) { return <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr>{headers.map(h=><th key={h} style={{textAlign:'left',padding:10,background:'#f8fafc',borderBottom:'1px solid #e2e8f0',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j} style={{padding:10,borderBottom:'1px solid #eef2f7',verticalAlign:'top'}}>{cell}</td>)}</tr>)}{rows.length===0&&<tr><td colSpan={headers.length} style={{padding:36,textAlign:'center',color:'#64748b'}}>Nenhum registro encontrado.</td></tr>}</tbody></table></div> }
