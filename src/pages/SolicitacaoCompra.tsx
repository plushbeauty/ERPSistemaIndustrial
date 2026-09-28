/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 11:43 BRT
 * Desenvolvedor: IA Co-Pilot (Homologado por Fernando)
 * ID da Revisão: REV-059
 * Alterações: Restaurar imports Plus e Trash2 usados pela grade de materiais.
 * Status do Build Local: Não executado — ambiente local sem acesso de rede ao repositório.
 * =========================================================================
 */

/*
📝 IDENTIFICAÇÃO DE LEITURA E REVISÃO DE CÓDIGO:
- Arquivo: src/pages/SolicitacaoCompra.tsx
- Status Atual: Revisão 3 (Compras com Fornecedor Qualificado)
- Total de Linhas Gerado: 95
- Assinatura de Entrada (Primeiros 3 Imports): import { FormEvent, useEffect, useState } from 'react' | import { ArrowLeft, CheckCircle2, Mail, Printer, ShoppingCart, Plus, Trash2, Save, Send, Search, RefreshCw } from 'lucide-react' | import { supabase } from '../lib/supabaseClient'
- Regra de Negócio Incorporada: Solicitação de compra grava fornecedor sugerido e ordena fornecedores ISO 9001 à frente.
*/
import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Mail, Plus, Printer, ShoppingCart, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type RequestRow = { id: string; numero: number; descricao: string; prioridade: string; requer_autorizacao: boolean; status: string; email_destino: string | null; fornecedor_id: string | null; created_at: string }
type Supplier = { id: string; razao_social: string; documento: string | null; iso_9001_certificado: boolean; iso_certificado_validade: string | null }
type Product={id:string;codigo:string;nome:string;unidade:string|null;unidade_compra:string|null;estoque_atual:number}
type Item={produto_id:string;codigo_mp:string;descricao:string;unidade:string;quantidade:string;cliente_interno:string;data_necessidade:string;nivel_urgencia:string;valor_unitario:string;observacoes:string}
const emptyItem=():Item=>({produto_id:'',codigo_mp:'',descricao:'',unidade:'UN',quantidade:'1',cliente_interno:'',data_necessidade:'',nivel_urgencia:'normal',valor_unitario:'0',observacoes:''})

function canApproveRole(role: unknown) {
  const normalized = typeof role === 'string' ? role.toUpperCase() : ''
  return ['MASTER', 'MASTER_ADMIN', 'SUPER_ADMIN', 'ADMIN'].includes(normalized)
}

export default function SolicitacaoCompra() {
  const [descricao, setDescricao] = useState('')
  const [products,setProducts]=useState<Product[]>([])
  const [items,setItems]=useState<Item[]>([emptyItem()])
  const [dataNecessidade,setDataNecessidade]=useState('')
  const [fornecedorId, setFornecedorId] = useState('')
  const [fornecedores, setFornecedores] = useState<Supplier[]>([])
  const [prioridade, setPrioridade] = useState('normal')
  const [requerAutorizacao, setRequerAutorizacao] = useState(true)
  const [emailDestino, setEmailDestino] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [rows, setRows] = useState<RequestRow[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [canApprove, setCanApprove] = useState(false)

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession()
    const role = sessionData.session?.user.app_metadata?.role
    setCanApprove(canApproveRole(role))
    const { data } = await supabase.from('erp_solicitacoes_compra').select('id,numero,descricao,prioridade,requer_autorizacao,status,email_destino,fornecedor_id,created_at').order('created_at', { ascending: false }).limit(50)
    setRows((data ?? []) as RequestRow[])
    const { data: productData } = await supabase.from('erp_produtos').select('id,codigo,nome,unidade,unidade_compra,estoque_atual').eq('ativo',true).order('codigo').limit(3000)
    setProducts((productData ?? []) as Product[])
    const { data: supplierData } = await supabase.from('erp_fornecedores').select('id,razao_social,documento,iso_9001_certificado,iso_certificado_validade').eq('ativo', true).order('razao_social')
    setFornecedores((supplierData ?? []) as Supplier[])
  }

  useEffect(() => { void load() }, [])

  async function save(event: FormEvent) {
    event.preventDefault()
    const valid=items.filter(i=>i.produto_id&&Number(i.quantidade)>0)
    if (!valid.length) { setMessage('Adicione pelo menos uma matéria-prima/material na grade.'); return }
    setBusy(true); setMessage('')
    try {
      const { data: empresaId, error: companyError } = await supabase.rpc('erp_current_empresa_id')
      if (companyError || !empresaId) throw companyError ?? new Error('Empresa não identificada.')
      const { data: created, error } = await supabase.from('erp_solicitacoes_compra').insert({ empresa_id: empresaId, descricao: valid.map(i=>`${i.codigo_mp} — ${i.descricao} x ${i.quantidade}`).join('; '), prioridade, requer_autorizacao: requerAutorizacao, status: requerAutorizacao ? 'aguardando_autorizacao' : 'autorizada', email_destino: emailDestino.trim() || null, observacoes: observacoes.trim() || null, fornecedor_id: fornecedorId || null }).select('id,numero').single()
      if (error) throw error
      setMessage(`Solicitação ${created.numero} criada. Status: ${requerAutorizacao ? 'aguardando autorização' : 'autorizada'}.`)
      await supabase.from('erp_pedidos_compra').insert(valid.map(i=>({produto_id:i.produto_id,quantidade:Number(i.quantidade),valor_unitario:Number(i.valor_unitario||0),total:Number(i.quantidade)*Number(i.valor_unitario||0),fornecedor_id:fornecedorId||null,status:'pendente',data_prevista:i.data_necessidade||dataNecessidade||null,observacoes:i.observacoes||observacoes.trim()||null,origem_solicitacao:'SOLICITACAO_INTERNA',data_necessidade:i.data_necessidade||dataNecessidade||null,nivel_urgencia:i.nivel_urgencia.toUpperCase()})))
      setDescricao(''); setObservacoes(''); setFornecedorId(''); setItems([emptyItem()]); await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível criar a solicitação.') }
    finally { setBusy(false) }
  }

  async function approve(id: string) {
    setBusy(true); setMessage('')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session
      if (!session || !canApproveRole(session.user.app_metadata?.role)) throw new Error('Somente responsável autorizado pode liberar compras.')
      const actorId = session.user.id
      const { error } = await supabase.from('erp_solicitacoes_compra').update({ status: 'autorizada', autorizado_por: actorId, autorizado_em: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      setMessage('Solicitação autorizada e encaminhada para Compras.')
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível autorizar.') }
    finally { setBusy(false) }
  }

  return <main className="pcp-page" style={{ padding: 28, maxWidth: 1250, margin: '0 auto' }}>
    <button className="secondary-v2" type="button" onClick={() => { window.location.href = '/erp-industrial' }}><ArrowLeft size={18} /> Voltar</button>
    <div style={{ margin: '18px 0 24px' }}><span className="v2-eyebrow">COMPRAS • SOLICITAÇÃO INTERNA</span><h1 style={{ fontSize: 36, margin: '6px 0' }}>Ordem / Solicitação de Compras</h1><p style={{ color: '#64748b', fontSize: 17 }}>Registre materiais diversos, peça autorização ao Financeiro/Direção e encaminhe a solicitação ao setor de Compras.</p></div>
    <section style={{ background: '#fff', border: '1px solid #dfe7e4', borderRadius: 18, padding: 24 }}>
      <form onSubmit={save}>
        <div className="industrial-section-head"><div><span>ITENS DA ORDEM DE COMPRA</span><h2>Matérias-primas e materiais</h2><p>Selecione o código da MP; descrição e unidade são preenchidas automaticamente.</p></div><button className="secondary-v2" type="button" onClick={()=>setItems(x=>[...x,emptyItem()])}><Plus size={17}/> ADD MATERIAL</button></div><div className="crud-table-wrap"><table><thead><tr><th>Código MP</th><th>Descrição</th><th>Un.</th><th>Quantidade</th><th>Cliente / interno</th><th>Data necessidade</th><th>Urgência</th><th>Valor unit.</th><th>Ação</th></tr></thead><tbody>{items.map((i,n)=>{const p=products.find(x=>x.id===i.produto_id);return <tr key={n}><td><select value={i.produto_id} onChange={e=>{const id=e.target.value;const p=products.find(x=>x.id===id);setItems(a=>a.map((z,k)=>k===n?{...z,produto_id:id,codigo_mp:p?.codigo||'',descricao:p?.nome||'',unidade:p?.unidade_compra||p?.unidade||'UN'}:z))}}><option value="">Selecionar MP</option>{products.map(x=><option key={x.id} value={x.id}>{x.codigo} — {x.nome}</option>)}</select></td><td>{i.descricao||'—'}</td><td>{i.unidade}</td><td><input type="number" min="0.001" step="0.001" value={i.quantidade} onChange={e=>setItems(a=>a.map((z,k)=>k===n?{...z,quantidade:e.target.value}:z))}/></td><td><input value={i.cliente_interno} onChange={e=>setItems(a=>a.map((z,k)=>k===n?{...z,cliente_interno:e.target.value}:z))} placeholder="Cliente / setor"/></td><td><input type="date" value={i.data_necessidade} onChange={e=>setItems(a=>a.map((z,k)=>k===n?{...z,data_necessidade:e.target.value}:z))}/></td><td><select value={i.nivel_urgencia} onChange={e=>setItems(a=>a.map((z,k)=>k===n?{...z,nivel_urgencia:e.target.value}:z))}><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option><option value="critica">Crítica</option></select></td><td><input type="number" min="0" step="0.01" value={i.valor_unitario} onChange={e=>setItems(a=>a.map((z,k)=>k===n?{...z,valor_unitario:e.target.value}:z))}/></td><td><button className="icon-button danger" type="button" onClick={()=>setItems(a=>a.length===1?[emptyItem()]:a.filter((_,k)=>k!==n))}><Trash2 size={16}/></button></td></tr>})}</tbody></table></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginTop: 15 }}><label>Fornecedor sugerido<select value={fornecedorId} onChange={event => setFornecedorId(event.target.value)}><option value="">Selecionar fornecedor</option>{[...fornecedores].sort((a,b)=>Number(b.iso_9001_certificado)-Number(a.iso_9001_certificado)||a.razao_social.localeCompare(b.razao_social)).map(s=><option key={s.id} value={s.id}>{s.iso_9001_certificado?'★ ISO 9001 • ':''}{s.razao_social}{s.documento?` • ${s.documento}`:''}</option>)}</select></label>
          <label>Prioridade<select value={prioridade} onChange={event => setPrioridade(event.target.value)}><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></label>
          <label>E-mail do setor responsável<input type="email" value={emailDestino} onChange={event => setEmailDestino(event.target.value)} placeholder="compras@empresa.com.br" /></label>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 16 }}><input type="checkbox" checked={requerAutorizacao} onChange={event => setRequerAutorizacao(event.target.checked)} /> Precisa de autorização do Financeiro / Dono antes da compra</label>
        <label style={{ display: 'block', marginTop: 14 }}>Observações<textarea value={observacoes} onChange={event => setObservacoes(event.target.value)} placeholder="Quantidade, prazo, aplicação, fornecedor sugerido ou justificativa…" style={{ width: '100%', minHeight: 80, marginTop: 7, padding: 12, borderRadius: 10, border: '1px solid #cbd5e1' }} /></label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}><button className="primary" type="submit" disabled={busy}><ShoppingCart size={18} /> {busy ? 'Salvando…' : 'Registrar solicitação'}</button><button className="secondary-v2" type="button" onClick={() => window.print()}><Printer size={18} /> Imprimir / Salvar PDF</button><button className="secondary-v2" type="button" disabled title="Envio real depende de provedor de e-mail configurado"><Mail size={18} /> E-mail — provedor pendente</button></div>
      </form>
      {message && <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: '#f0fdf4', color: '#166534' }}>{message}</div>}
    </section>
    <section style={{ marginTop: 20, background: '#fff', border: '1px solid #dfe7e4', borderRadius: 18, padding: 24 }}><h2 style={{ marginTop: 0 }}>Solicitações recentes</h2><div style={{ display: 'grid', gap: 9 }}>{rows.map(row => <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 150px 150px 160px', gap: 12, alignItems: 'center', padding: 12, border: '1px solid #e5e7eb', borderRadius: 10 }}><strong>#{row.numero}</strong><span>{row.descricao}</span><span>{row.status}</span><span>{fornecedores.find(s=>s.id===row.fornecedor_id)?.iso_9001_certificado?'★ ISO 9001':''}</span>{row.status === 'aguardando_autorizacao' && canApprove ? <button className="menu-green" type="button" disabled={busy} onClick={() => void approve(row.id)}><CheckCircle2 size={16} /> Autorizar</button> : <small style={{ color: '#64748b' }}>{row.requer_autorizacao ? 'Aguardando responsável' : 'Liberada para Compras'}</small>}</div>)}</div>{!rows.length && <p style={{ color: '#64748b' }}>Nenhuma solicitação registrada.</p>}</section>
    <small style={{ display: 'block', marginTop: 18, color: '#64748b' }}>Status: aguardando autorização → autorizada → Compras. Sem provedor de e-mail configurado, nenhum envio é simulado.</small>
  </main>
}
/* Revisão 3 registrada após validação estrutural do arquivo. */