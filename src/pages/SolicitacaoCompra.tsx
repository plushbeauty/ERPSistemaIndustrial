import { FormEvent, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Plus, Printer, ShoppingCart, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import VendasLayout from './VendasLayout'
import { fetchAllPages } from '../lib/supabasePagination'

type RequestRow = {
  id: string
  numero: number
  descricao: string
  prioridade: string
  requer_autorizacao: boolean
  status: string
  email_destino: string | null
  fornecedor_id: string | null
  observacoes: string | null
  created_at: string
}

type Supplier = {
  id: string
  razao_social: string
  documento: string | null
  iso_9001_certificado: boolean
}

type Product = {
  id: string
  codigo: string
  nome: string
  unidade: string | null
  unidade_compra: string | null
}

type Item = {
  produto_id: string
  descricao: string
  unidade: string
  quantidade: string
  valor_estimado: string
}

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const PAGE_SIZE = 10
const emptyItem = (): Item => ({
  produto_id: '',
  descricao: '',
  unidade: 'UN',
  quantidade: '1',
  valor_estimado: '0',
})

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

export default function SolicitacaoCompra() {
  const [empresaId, setEmpresaId] = useState('')
  const [profileId, setProfileId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems] = useState<Item[]>([emptyItem()])
  const [fornecedorId, setFornecedorId] = useState('')
  const [fornecedores, setFornecedores] = useState<Supplier[]>([])
  const [prioridade, setPrioridade] = useState('normal')
  const [emailDestino, setEmailDestino] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [rows, setRows] = useState<RequestRow[]>([])
  const [page, setPage] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [canApprove, setCanApprove] = useState(false)

  const supplierById = useMemo(
    () => new Map(fornecedores.map((supplier) => [supplier.id, supplier])),
    [fornecedores],
  )
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const visibleRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  async function load() {
    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) {
        throw company.error ?? new Error('Empresa da sessão não identificada.')
      }

      const session = await supabase.auth.getUser()
      if (session.error || !session.data.user) {
        throw session.error ?? new Error('Sessão não autenticada.')
      }

      const profile = await supabase
        .from('erp_usuarios')
        .select('id')
        .eq('auth_user_id', session.data.user.id)
        .eq('empresa_id', company.data)
        .eq('ativo', true)
        .is('deleted_at', null)
        .maybeSingle()
      if (profile.error) throw profile.error
      if (!profile.data?.id) {
        throw new Error('Perfil ERP ativo não localizado para esta empresa.')
      }

      const permission = await supabase.rpc('erp_has_permission', {
        p_modulo: 'compras',
        p_acao: 'editar',
      })
      if (permission.error) throw permission.error

      const [requestRows, productRows, supplierRows] = await Promise.all([
        fetchAllPages<RequestRow>((from, to) =>
          supabase
            .from('erp_solicitacoes_compra')
            .select(
              'id,numero,descricao,prioridade,requer_autorizacao,status,email_destino,fornecedor_id,observacoes,created_at',
              { count: 'exact' },
            )
            .eq('empresa_id', company.data)
            .order('created_at', { ascending: false })
            .range(from, to),
        ),
        fetchAllPages<Product>((from, to) =>
          supabase
            .from('erp_produtos')
            .select('id,codigo,nome,unidade,unidade_compra', { count: 'exact' })
            .eq('empresa_id', company.data)
            .eq('ativo', true)
            .order('codigo')
            .range(from, to),
        ),
        fetchAllPages<Supplier>((from, to) =>
          supabase
            .from('erp_fornecedores')
            .select('id,razao_social,documento,iso_9001_certificado', { count: 'exact' })
            .eq('empresa_id', company.data)
            .eq('ativo', true)
            .order('razao_social')
            .range(from, to),
        ),
      ])

      setEmpresaId(company.data)
      setProfileId(profile.data.id)
      setCanApprove(permission.data === true)
      setRows(requestRows)
      setProducts(productRows)
      setFornecedores(supplierRows)
      setPage((current) => Math.min(current, Math.max(0, Math.ceil(requestRows.length / PAGE_SIZE) - 1)))
    } catch (loadError) {
      setError(errorMessage(loadError, 'Não foi possível carregar as solicitações de compra.'))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function updateItem(index: number, patch: Partial<Item>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    )
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (!empresaId) throw new Error('Empresa da sessão não identificada.')
      if (!descricao.trim()) throw new Error('Informe o motivo da solicitação.')

      const validItems = items.filter((item) => item.produto_id)
      if (!validItems.length) throw new Error('Adicione pelo menos um produto à solicitação.')
      if (
        validItems.some(
          (item) =>
            !Number.isFinite(Number(item.quantidade)) ||
            Number(item.quantidade) <= 0 ||
            !Number.isFinite(Number(item.valor_estimado)) ||
            Number(item.valor_estimado) < 0,
        )
      ) {
        throw new Error('Verifique as quantidades e os valores estimados dos itens.')
      }

      const result = await supabase.rpc('erp_compras_criar_solicitacao', {
        p_descricao: descricao.trim(),
        p_prioridade: prioridade,
        p_email_destino: emailDestino.trim() || null,
        p_observacoes: observacoes.trim() || null,
        p_fornecedor_id: fornecedorId || null,
        p_itens: validItems.map((item) => ({
          produto_id: item.produto_id,
          descricao: item.descricao.trim(),
          unidade: item.unidade || 'UN',
          quantidade: Number(item.quantidade),
          valor_estimado: Number(item.valor_estimado),
        })),
      })
      if (result.error) throw result.error

      const created = Array.isArray(result.data) ? result.data[0] : result.data
      if (
        !created ||
        typeof created !== 'object' ||
        !('numero' in created) ||
        !('id' in created)
      ) {
        throw new Error('A solicitação foi enviada, mas o banco não retornou seus dados.')
      }

      setMessage(`Solicitação #${String(created.numero)} criada e enviada para autorização.`)
      setDescricao('')
      setFornecedorId('')
      setPrioridade('normal')
      setEmailDestino('')
      setObservacoes('')
      setItems([emptyItem()])
      setPage(0)
      await load()
    } catch (saveError) {
      setError(errorMessage(saveError, 'Não foi possível criar a solicitação.'))
    } finally {
      setBusy(false)
    }
  }

  async function approve(id: string) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (!canApprove) throw new Error('Seu perfil não possui permissão para autorizar compras.')
      if (!empresaId || !profileId) throw new Error('Perfil da empresa não identificado.')

      const result = await supabase
        .from('erp_solicitacoes_compra')
        .update({
          status: 'autorizada',
          autorizado_por: profileId,
          autorizado_em: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('empresa_id', empresaId)
        .eq('status', 'aguardando_autorizacao')
        .select('id')
        .single()
      if (result.error) throw result.error

      setMessage('Solicitação autorizada e encaminhada para Compras.')
      await load()
    } catch (approvalError) {
      setError(errorMessage(approvalError, 'Não foi possível autorizar a solicitação.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <VendasLayout title="Solicitação de compra" subtitle="Compras • Necessidade interna para autorização" onRefresh={() => void load()} showStatusCards={false} titleActions={<div className="flex items-center gap-2"><button type="button" className="secondary-v2" onClick={() => window.print()}><Printer size={14} /> Imprimir</button><button type="submit" form="form-solicitacao-compra" className="primary" disabled={busy || !empresaId}><ShoppingCart size={14} /> {busy ? 'Salvando…' : 'Registrar'}</button></div>}>
    <main className="pcp-page purchase-request-premium" style={{ padding: 8, maxWidth: 1440, margin: '0 auto' }}>
      <style>{`
/* Revisão visual Compras — 20/10/2026 — referência premium aplicada somente à Solicitação de Compra. */
.purchase-request-premium{color:#123b50;font-family:Inter,Roboto,Arial,sans-serif}
.purchase-request-premium>header{margin-bottom:10px!important;padding:0 0 10px;border-bottom:1px solid #dbe5eb}
.purchase-request-premium .v2-eyebrow{font-size:9px!important;letter-spacing:.13em;font-weight:900;color:#2d8db8}
.purchase-request-premium h1{font-size:20px!important;font-weight:700;color:#123b50}
.purchase-request-premium>header p{font-size:11px}
.purchase-request-premium>section{border:1px solid #d8e3e9!important;border-radius:2px!important;padding:12px!important;box-shadow:0 2px 7px #123b5008}
.purchase-request-premium form>div:first-child{grid-template-columns:repeat(12,minmax(0,1fr))!important;gap:10px!important}
.purchase-request-premium form>div:first-child>label{grid-column:span 6;display:flex;flex-direction:column;gap:4px;min-width:0;font-size:9px;font-weight:700;letter-spacing:.02em;color:#385566}
.purchase-request-premium form>div:first-child>label:first-child{grid-column:span 6}
.purchase-request-premium form>div:first-child>label:nth-child(2){grid-column:span 6}
.purchase-request-premium form>div:first-child>label:nth-child(3){grid-column:span 4}
.purchase-request-premium form>div:first-child>label:nth-child(4){grid-column:span 8}
.purchase-request-premium input,.purchase-request-premium select,.purchase-request-premium textarea{box-sizing:border-box;min-width:0;width:100%;min-height:30px;height:30px;padding:0 8px;border:1px solid #c5d4dc;border-radius:2px;background:#fff;color:#123b50;font:400 11px Inter,Roboto,Arial,sans-serif;outline:none;transition:border-color .15s,box-shadow .15s}
.purchase-request-premium input:focus,.purchase-request-premium select:focus,.purchase-request-premium textarea:focus{border-color:#2d8db8;box-shadow:0 0 0 2px #2d8db81f}
.purchase-request-premium textarea{height:auto;min-height:66px;padding:8px;resize:vertical}
.purchase-request-premium .industrial-section-head{margin-top:14px!important;padding:10px 0;border-bottom:1px solid #e3ebef}
.purchase-request-premium .industrial-section-head span{font-size:9px;font-weight:900;letter-spacing:.12em;color:#2d8db8}
.purchase-request-premium .industrial-section-head h2{font-size:14px;margin:3px 0;color:#123b50}
.purchase-request-premium button{min-height:30px;border-radius:2px;font-size:10px;font-weight:600}
.purchase-request-premium .crud-table-wrap{width:100%;overflow-x:auto;border:1px solid #e0e8ed;border-radius:2px}
.purchase-request-premium table{width:100%;border-collapse:collapse;font-size:10px}
.purchase-request-premium th{height:30px;padding:5px 8px;background:#123b50;color:#f4fbfd;text-align:left;font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.purchase-request-premium td{height:34px;padding:5px 8px;border-bottom:1px solid #e7edf1;color:#28495a;vertical-align:middle}
.purchase-request-premium tbody tr:nth-child(even){background:#f4fbfd}
.purchase-request-premium tbody tr:hover{background:#eaf5f8}
.purchase-request-premium td input,.purchase-request-premium td select{height:28px;min-height:28px}
.purchase-request-premium .icon-button{width:30px;height:30px;display:inline-grid;place-items:center;border:1px solid #f2c4c4;background:#fff;color:#b4232c}
.purchase-request-premium form>label{display:flex;flex-direction:column;gap:4px;margin-top:12px;font-size:9px;font-weight:700;color:#385566}
.purchase-request-premium form>label textarea{width:100%}
.purchase-request-premium form>div:last-of-type{margin-top:12px!important;gap:6px!important}
.purchase-request-premium form>div:last-of-type button{height:30px;min-height:30px;padding:0 10px}
.purchase-request-premium .primary{background:#2d8db8;border:1px solid #2d8db8;color:white}
.purchase-request-premium .secondary-v2{background:#fff;border:1px solid #bfcfd8;color:#234b5d}
.purchase-request-premium nav button:disabled{opacity:.45;cursor:not-allowed}
@media(max-width:700px){.purchase-request-premium form>div:first-child>label,.purchase-request-premium form>div:first-child>label:first-child,.purchase-request-premium form>div:first-child>label:nth-child(2),.purchase-request-premium form>div:first-child>label:nth-child(3),.purchase-request-premium form>div:first-child>label:nth-child(4){grid-column:span 12}.purchase-request-premium>header h1{font-size:17px!important}.purchase-request-premium>section{padding:8px!important}.purchase-request-premium table{min-width:680px}}
@media(prefers-reduced-motion:reduce){.purchase-request-premium *{transition:none!important}}

.purchase-request-premium .request-fields{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:8px 12px;padding:12px}
.purchase-request-premium .request-fields label{grid-column:span 6;display:flex;flex-direction:column;gap:4px;min-width:0;color:#385566;font-size:10px;font-weight:800}
.purchase-request-premium .request-fields label:nth-child(1){grid-column:span 6}.purchase-request-premium .request-fields label:nth-child(2){grid-column:span 2}.purchase-request-premium .request-fields label:nth-child(3){grid-column:span 4}.purchase-request-premium .request-fields label:nth-child(4),.purchase-request-premium .request-fields label:nth-child(5){grid-column:span 6}
.purchase-request-premium .request-section-title{display:flex;align-items:center;justify-content:space-between;min-height:38px;padding:7px 12px;border-bottom:1px solid #dfe8ed;background:#f4fbfd}
.purchase-request-premium .request-section-title h2{margin:0;color:#2d8db8;font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
.purchase-request-premium .request-card{overflow:hidden;border:1px solid #d8e3e9;background:#fff;box-shadow:0 2px 7px #123b5008}
.purchase-request-premium .request-fields input,.purchase-request-premium .request-fields select,.purchase-request-premium .request-fields textarea{box-sizing:border-box;width:100%;min-width:0;height:32px;min-height:32px;padding:0 8px;border:1px solid #c5d4dc;border-radius:2px;background:#fff;color:#123b50;font:500 11px Inter,Roboto,Arial,sans-serif}
.purchase-request-premium .request-fields textarea{padding:7px;resize:vertical}
.purchase-request-premium .crud-table-wrap{width:100%;overflow-x:auto}.purchase-request-premium .crud-table-wrap table{width:100%;table-layout:fixed;border-collapse:collapse}
.purchase-request-premium .crud-table-wrap th{background:#123b50;color:#f4fbfd;font-size:9px;font-weight:900;white-space:nowrap}
.purchase-request-premium .crud-table-wrap td{height:36px;padding:5px 8px;border-bottom:1px solid #e7edf1;vertical-align:middle;overflow:hidden}
.purchase-request-premium .crud-table-wrap td input,.purchase-request-premium .crud-table-wrap td select{width:100%;min-width:0;box-sizing:border-box;height:29px;min-height:29px}
.purchase-request-premium .request-total{display:flex;justify-content:flex-end;align-items:center;gap:22px;padding:10px 12px;background:#f4fbfd;border-top:1px solid #d8e3e9}
.purchase-request-premium .request-total span{font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#385566}.purchase-request-premium .request-total strong{font-size:15px;font-weight:900;color:#123b50;font-variant-numeric:tabular-nums}
.purchase-request-premium .request-alert{margin:0 0 8px;padding:9px 12px;border-left:4px solid;font-size:11px;font-weight:700}.purchase-request-premium .request-alert.error{border-color:#d65b61;background:#fff1f1;color:#922b32}.purchase-request-premium .request-alert.success{border-color:#3a9d78;background:#effaf5;color:#176746}
.purchase-request-premium .request-badge{display:inline-flex;align-items:center;min-height:22px;padding:2px 7px;border:1px solid;border-radius:2px;font-size:9px;font-weight:900;text-transform:uppercase;white-space:nowrap}
.purchase-request-premium .tone-normal{border-color:#cbd5e1;background:#f1f5f9;color:#475569}.purchase-request-premium .tone-high,.purchase-request-premium .tone-waiting{border-color:#f3d28a;background:#fff7df;color:#8a5a00}.purchase-request-premium .tone-urgent,.purchase-request-premium .tone-cancelled{border-color:#f2b9bd;background:#fff0f0;color:#b4232c}.purchase-request-premium .tone-authorized{border-color:#a9dcc6;background:#eaf8f0;color:#21754d}.purchase-request-premium .tone-quote{border-color:#a7d7e7;background:#edf9fd;color:#176b8b}
.purchase-request-premium .request-list{margin-top:12px}.purchase-request-premium .request-pagination{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:8px 12px}
.purchase-request-premium .primary,.purchase-request-premium .secondary-v2{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;min-height:32px;padding:0 12px;border-radius:2px;font-size:11px;font-weight:800;white-space:nowrap}.purchase-request-premium .primary{background:#2d8db8;border:1px solid #2d8db8;color:#fff}.purchase-request-premium .secondary-v2{background:#fff;border:1px solid #bfcfd8;color:#234b5d}
@media(max-width:760px){.purchase-request-premium .request-fields label,.purchase-request-premium .request-fields label:nth-child(n){grid-column:span 12}.purchase-request-premium .request-list table{min-width:850px}.purchase-request-premium .request-total{justify-content:space-between}}
@media print{.purchase-request-premium .request-list,.purchase-request-premium .no-print{display:none!important}}
`}</style>
      {error && <div role="alert" className="request-alert error">{error}</div>}
      {message && <div role="status" className="request-alert success">{message}</div>}

      <section className="request-card">
        <form id="form-solicitacao-compra" onSubmit={(event) => void save(event)}>
          <div className="request-section-title"><h2>Dados da solicitação</h2></div>
          <div className="request-fields">
            <label>
              Motivo da solicitação
              <input
                required
                value={descricao}
                onChange={(event) => setDescricao(event.target.value)}
                maxLength={500}
              />
            </label>
            <label>
              Prioridade
              <select value={prioridade} onChange={(event) => setPrioridade(event.target.value)}>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </label>
            <label>
              E-mail do setor responsável
              <input
                type="email"
                value={emailDestino}
                onChange={(event) => setEmailDestino(event.target.value)}
                maxLength={254}
                placeholder="compras@empresa.com.br"
              />
            </label>
            <label>
              Fornecedor sugerido
              <select value={fornecedorId} onChange={(event) => setFornecedorId(event.target.value)}>
                <option value="">Sem preferência</option>
                {[...fornecedores]
                  .sort(
                    (left, right) =>
                      Number(right.iso_9001_certificado) - Number(left.iso_9001_certificado) ||
                      left.razao_social.localeCompare(right.razao_social),
                  )
                  .map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.iso_9001_certificado ? 'ISO 9001 • ' : ''}
                      {supplier.razao_social}
                      {supplier.documento ? ` • ${supplier.documento}` : ''}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Observações
              <textarea value={observacoes} onChange={(event) => setObservacoes(event.target.value)} maxLength={2000} rows={1} />
            </label>

          </div>

          <div className="request-section-title">
            <div>
              <span>ITENS DA SOLICITAÇÃO</span>
              <h2>Itens da solicitação ({items.length})</h2>
            </div>
            <button
              className="secondary-v2"
              type="button"
              onClick={() => setItems((current) => [...current, emptyItem()])}
            >
              <Plus size={17} /> Adicionar item
            </button>
          </div>

          <div className="crud-table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{width:42,textAlign:"center"}}>#</th>
                  <th>Produto / material</th>
                  <th style={{width:66,textAlign:"center"}}>Unidade</th>
                  <th style={{width:120,textAlign:"right"}}>Quantidade</th>
                  <th style={{width:145,textAlign:"right"}}>Valor unitário</th>
                  <th style={{width:135,textAlign:"right"}}>Total por item</th>
                  <th style={{width:48,textAlign:"center"}}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        required
                        value={item.produto_id}
                        onChange={(event) => {
                          const product = products.find((candidate) => candidate.id === event.target.value)
                          updateItem(index, {
                            produto_id: event.target.value,
                            descricao: product?.nome ?? '',
                            unidade: product?.unidade_compra || product?.unidade || 'UN',
                          })
                        }}
                      >
                        <option value="">Selecionar produto</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.codigo} — {product.nome}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{textAlign:"center",fontWeight:800}}>{item.unidade}</td>
                    <td>
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        required
                        value={item.quantidade}
                        onChange={(event) => updateItem(index, { quantidade: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={item.valor_estimado}
                        onChange={(event) => updateItem(index, { valor_estimado: event.target.value })}
                      />
                    </td>
                    <td style={{textAlign:"right",fontWeight:800,fontVariantNumeric:"tabular-nums"}}>
                      {money((Number(item.quantidade) || 0) * (Number(item.valor_estimado) || 0))}
                    </td>
                    <td style={{textAlign:"center"}}>
                      <button
                        className="icon-button danger"
                        type="button"
                        aria-label={`Remover item ${index + 1}`}
                        onClick={() =>
                          setItems((current) =>
                            current.length === 1
                              ? [emptyItem()]
                              : current.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="request-total"><span>Total estimado da solicitação</span><strong>{money(items.reduce((sum, item) => sum + (Number(item.quantidade) || 0) * (Number(item.valor_estimado) || 0), 0))}</strong></div>

        </form>
      </section>

      <section
        style={{
          marginTop: 20,
          background: '#fff',
          border: '1px solid #dfe7e4',
          borderRadius: 14,
          padding: 20,
        }}
      >
        <div className="request-section-title"><h2>Solicitações recentes ({rows.length})</h2></div>
        <div className="crud-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Número</th>
                <th>Motivo</th>
                <th>Prioridade</th>
                <th>Fornecedor sugerido</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => (
                <tr key={row.id} style={{ background: index % 2 === 1 ? '#f8fafc' : '#fff' }}>
                  <td>#{row.numero}</td>
                  <td>{row.descricao}</td>
                  <td><span className={"request-badge " + (row.prioridade === 'urgente' ? 'tone-urgent' : row.prioridade === 'alta' ? 'tone-high' : 'tone-normal')}>{row.prioridade === 'urgente' ? 'Urgente' : row.prioridade === 'alta' ? 'Alta' : 'Normal'}</span></td>
                  <td>{supplierById.get(row.fornecedor_id ?? '')?.razao_social ?? '—'}</td>
                  <td><span className={"request-badge " + (row.status === 'autorizada' ? 'tone-authorized' : row.status === 'cancelada' ? 'tone-cancelled' : row.status === 'em_cotacao' ? 'tone-quote' : 'tone-waiting')}>{row.status === 'aguardando_autorizacao' ? 'Aguardando autorização' : row.status === 'autorizada' ? 'Autorizada' : row.status === 'cancelada' ? 'Cancelada' : row.status === 'em_cotacao' ? 'Em cotação' : row.status.replaceAll('_', ' ')}</span></td>
                  <td>
                    {row.status === 'aguardando_autorizacao' && canApprove ? (
                      <button
                        className="secondary-v2"
                        type="button"
                        disabled={busy}
                        onClick={() => void approve(row.id)}
                      >
                        <CheckCircle2 size={16} /> Autorizar
                      </button>
                    ) : (
                      <span>
                        {row.requer_autorizacao && row.status === 'aguardando_autorizacao'
                          ? 'Aguardando responsável'
                          : row.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {!visibleRows.length && (
                <tr>
                  <td colSpan={6}>{busy ? 'Carregando…' : 'Nenhuma solicitação registrada.'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <nav aria-label="Paginação das solicitações" className="request-pagination">
          <button
            className="secondary-v2"
            type="button"
            disabled={page === 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            Anterior
          </button>
          <span aria-live="polite">
            Página {page + 1} de {pageCount}
          </span>
          <button
            className="secondary-v2"
            type="button"
            disabled={page + 1 >= pageCount}
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
          >
            Próxima
          </button>
        </nav>
      </section>
      <small style={{ display: 'block', marginTop: 14, color: '#64748b' }}>
        Toda solicitação é registrada para autorização. A liberação é protegida pela permissão de edição de Compras.
      </small>
    </main>
    </VendasLayout>
  )
}
