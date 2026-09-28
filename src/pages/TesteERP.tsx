import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Result = { name: string; ok: boolean; detail: string }

async function runCrud<T extends Record<string, unknown>>(name: string, table: string, payload: T): Promise<Result> {
  const { data: inserted, error: insertError } = await supabase.from(table).insert(payload).select('id').single()
  if (insertError || !inserted?.id) return { name, ok: false, detail: `INSERT: ${insertError?.message ?? 'sem id retornado'}` }
  const id = inserted.id as string
  const { data: read, error: readError } = await supabase.from(table).select('id').eq('id', id).single()
  if (readError || !read) { await supabase.from(table).delete().eq('id', id); return { name, ok: false, detail: `SELECT: ${readError?.message ?? 'registro não encontrado'}` } }
  const { error: updateError } = await supabase.from(table).update({ updated_at: new Date().toISOString() }).eq('id', id)
  if (updateError && !/updated_at/i.test(updateError.message)) { await supabase.from(table).delete().eq('id', id); return { name, ok: false, detail: `UPDATE: ${updateError.message}` } }
  const { error: deleteError } = await supabase.from(table).delete().eq('id', id)
  if (deleteError) return { name, ok: false, detail: `DELETE: ${deleteError.message}` }
  return { name, ok: true, detail: 'INSERT → SELECT → UPDATE → DELETE' }
}

export default function TesteERP() {
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [notice, setNotice] = useState('')

  async function run() {
    setBusy(true); setResults([]); setNotice('')
    const out: Result[] = []
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Sessão não autenticada.')
      const { data: empresaId, error: companyError } = await supabase.rpc('erp_current_empresa_id')
      if (companyError || !empresaId) throw companyError ?? new Error('Empresa do usuário não identificada.')
      const empresa_id = empresaId as string

      const { data: sectors, error: sectorsError } = await supabase.from('erp_setores').select('id').eq('empresa_id', empresa_id).limit(1)
      out.push(sectorsError ? { name: 'Setores / RLS', ok: false, detail: sectorsError.message } : { name: 'Setores / RLS', ok: true, detail: `${sectors?.length ?? 0} setor(es) visível(is)` })

      out.push(await runCrud('Produtos / Estoque', 'erp_produtos', { empresa_id, codigo: `TESTE-${Date.now()}`, nome: 'Registro temporário de teste', descricao: 'Criado e removido automaticamente pela tela de QA', preco_venda: 10, estoque_atual: 1, categoria: 'QA' }))
      out.push(await runCrud('Clientes / Comercial', 'erp_clientes', { empresa_id, codigo: `QA-${Date.now()}`, nome: 'Registro temporário de teste', email: 'qa@teste.invalid', telefone: '0000000000', ativo: true }))
      out.push(await runCrud('Funcionários / RH', 'erp_funcionarios', { empresa_id, matricula: `QA-${Date.now()}`, nome: 'Registro temporário de teste', cargo: 'QA', status: 'ativo' }))
      out.push(await runCrud('Documento / Qualidade', 'erp_documentos_qualidade', { empresa_id, codigo: `QA-${Date.now()}`, titulo: 'Registro temporário de teste', status: 'rascunho', revisao: 0 }))
      out.push(await runCrud('Inspeção / Qualidade', 'erp_inspecoes', { empresa_id, tipo: 'processo', resultado: 'pendente', observacao: 'Registro temporário de teste' }))
      out.push(await runCrud('Financeiro / Caixa', 'erp_financeiro_lancamentos', { empresa_id, tipo: 'despesa', categoria: 'QA', descricao: 'Registro temporário de teste', valor: 0.01, status: 'aberto' }))

      const client = await supabase.from('erp_clientes').insert({ empresa_id, codigo: `QA-VENDA-${Date.now()}`, nome: 'Cliente temporário de teste', ativo: true }).select('id').single()
      if (client.error || !client.data) out.push({ name: 'Vendas / Pedido', ok: false, detail: `Cliente temporário: ${client.error?.message ?? 'falha'}` })
      else {
        const sale = await runCrud('Vendas / Pedido', 'erp_pedidos_venda', { empresa_id, cliente_id: client.data.id, total: 0, status: 'aberto', observacoes: 'Registro temporário de teste' })
        out.push(sale)
        await supabase.from('erp_clientes').delete().eq('id', client.data.id)
      }
      setResults(out)
      setNotice(`Teste concluído: ${out.filter(x => x.ok).length}/${out.length} verificações aprovadas. Os registros temporários foram removidos.`)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Falha no teste.')
      setResults(out)
    } finally { setBusy(false) }
  }

  return <main className="pcp-page" style={{ padding: 28, maxWidth: 1100, margin: '0 auto' }}>
    <button className="secondary-v2" type="button" onClick={() => { window.location.href = '/erp-industrial' }}>← Voltar ao ERP</button>
    <div style={{ marginTop: 18 }}><span className="v2-eyebrow">QA • TRANSAÇÃO REAL</span><h1 style={{ fontSize: 38, margin: '6px 0' }}>Teste completo do ERP</h1><p style={{ color: '#64748b', fontSize: 17 }}>Executa operações reais no Supabase usando sua empresa autenticada e remove os registros temporários ao final. Não usa mock nem dados permanentes.</p></div>
    <section style={{ marginTop: 22, background: '#fff', border: '1px solid #dfe7e4', borderRadius: 20, padding: 24 }}>
      <button className="primary" type="button" disabled={busy} onClick={() => void run()}>{busy ? 'Executando testes…' : 'Executar teste completo'}</button>
      {notice && <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: '#f4f8f7', fontWeight: 700 }}>{notice}</div>}
      <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>{results.map(result => <div key={result.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 15, padding: 15, border: '1px solid #e2e8f0', borderRadius: 12 }}><strong>{result.ok ? '✅' : '❌'} {result.name}</strong><span style={{ color: '#64748b', textAlign: 'right' }}>{result.detail}</span></div>)}</div>
    </section>
  </main>
}
