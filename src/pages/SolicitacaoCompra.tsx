import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Mail, Printer, ShoppingCart } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type RequestRow = { id: string; numero: number; descricao: string; prioridade: string; requer_autorizacao: boolean; status: string; email_destino: string | null; created_at: string }

export default function SolicitacaoCompra() {
  const [descricao, setDescricao] = useState('')
  const [prioridade, setPrioridade] = useState('normal')
  const [requerAutorizacao, setRequerAutorizacao] = useState(true)
  const [emailDestino, setEmailDestino] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [rows, setRows] = useState<RequestRow[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [canApprove, setCanApprove] = useState(false)

  async function load() {
    const { data: userData } = await supabase.auth.getUser()
    if (userData.user) {
      const { data: profile } = await supabase.from('erp_usuarios').select('nivel_admin').eq('auth_user_id', userData.user.id).maybeSingle()
      setCanApprove((profile?.nivel_admin ?? 99) <= 2)
    }
    const { data } = await supabase.from('erp_solicitacoes_compra').select('id,numero,descricao,prioridade,requer_autorizacao,status,email_destino,created_at').order('created_at', { ascending: false }).limit(50)
    setRows((data ?? []) as RequestRow[])
  }

  useEffect(() => { void load() }, [])

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!descricao.trim()) { setMessage('Informe o material ou serviço necessário.'); return }
    setBusy(true); setMessage('')
    try {
      const { data: empresaId, error: companyError } = await supabase.rpc('erp_current_empresa_id')
      if (companyError || !empresaId) throw companyError ?? new Error('Empresa não identificada.')
      const { data: created, error } = await supabase.from('erp_solicitacoes_compra').insert({ empresa_id: empresaId, descricao: descricao.trim(), prioridade, requer_autorizacao: requerAutorizacao, status: requerAutorizacao ? 'aguardando_autorizacao' : 'autorizada', email_destino: emailDestino.trim() || null, observacoes: observacoes.trim() || null }).select('id,numero').single()
      if (error) throw error
      setMessage(`Solicitação ${created.numero} criada. Status: ${requerAutorizacao ? 'aguardando autorização' : 'autorizada'}.`)
      setDescricao(''); setObservacoes(''); await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível criar a solicitação.') }
    finally { setBusy(false) }
  }

  async function approve(id: string) {
    setBusy(true); setMessage('')
    try {
      const { data: userData } = await supabase.auth.getUser()
      const { data: actor } = userData.user ? await supabase.from('erp_usuarios').select('id,nivel_admin').eq('auth_user_id', userData.user.id).maybeSingle() : { data: null }
      if (!actor || actor.nivel_admin > 2) throw new Error('Somente responsável autorizado pode liberar compras.')
      const { error } = await supabase.from('erp_solicitacoes_compra').update({ status: 'autorizada', autorizado_por: actor.id, autorizado_em: new Date().toISOString() }).eq('id', id)
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
        <label>Material ou serviço necessário<textarea value={descricao} onChange={event => setDescricao(event.target.value)} placeholder="Ex.: borracha NBR, arruelas, material de manutenção, ferramental, embalagem…" required style={{ width: '100%', minHeight: 110, marginTop: 7, padding: 12, borderRadius: 10, border: '1px solid #cbd5e1' }} /></label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginTop: 15 }}>
          <label>Prioridade<select value={prioridade} onChange={event => setPrioridade(event.target.value)}><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></label>
          <label>E-mail do setor responsável<input type="email" value={emailDestino} onChange={event => setEmailDestino(event.target.value)} placeholder="compras@empresa.com.br" /></label>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 16 }}><input type="checkbox" checked={requerAutorizacao} onChange={event => setRequerAutorizacao(event.target.checked)} /> Precisa de autorização do Financeiro / Dono antes da compra</label>
        <label style={{ display: 'block', marginTop: 14 }}>Observações<textarea value={observacoes} onChange={event => setObservacoes(event.target.value)} placeholder="Quantidade, prazo, aplicação, fornecedor sugerido ou justificativa…" style={{ width: '100%', minHeight: 80, marginTop: 7, padding: 12, borderRadius: 10, border: '1px solid #cbd5e1' }} /></label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}><button className="primary" type="submit" disabled={busy}><ShoppingCart size={18} /> {busy ? 'Salvando…' : 'Registrar solicitação'}</button><button className="secondary-v2" type="button" onClick={() => window.print()}><Printer size={18} /> Imprimir / Salvar PDF</button><button className="secondary-v2" type="button" disabled title="Envio real depende de provedor de e-mail configurado"><Mail size={18} /> E-mail — provedor pendente</button></div>
      </form>
      {message && <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: '#f0fdf4', color: '#166534' }}>{message}</div>}
    </section>
    <section style={{ marginTop: 20, background: '#fff', border: '1px solid #dfe7e4', borderRadius: 18, padding: 24 }}><h2 style={{ marginTop: 0 }}>Solicitações recentes</h2><div style={{ display: 'grid', gap: 9 }}>{rows.map(row => <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 150px 160px', gap: 12, alignItems: 'center', padding: 12, border: '1px solid #e5e7eb', borderRadius: 10 }}><strong>#{row.numero}</strong><span>{row.descricao}</span><span>{row.status}</span>{row.status === 'aguardando_autorizacao' && canApprove ? <button className="menu-green" type="button" disabled={busy} onClick={() => void approve(row.id)}><CheckCircle2 size={16} /> Autorizar</button> : <small style={{ color: '#64748b' }}>{row.requer_autorizacao ? 'Aguardando responsável' : 'Liberada para Compras'}</small>}</div>)}</div>{!rows.length && <p style={{ color: '#64748b' }}>Nenhuma solicitação registrada.</p>}</section>
    <small style={{ display: 'block', marginTop: 18, color: '#64748b' }}>Status: aguardando autorização → autorizada → Compras. Sem provedor de e-mail configurado, nenhum envio é simulado.</small>
  </main>
}
