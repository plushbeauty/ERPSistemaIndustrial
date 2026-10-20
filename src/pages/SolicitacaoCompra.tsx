/** @DATA_REVISAO_APROVACAO: 2026-10-20 @STATUS_APROVACAO: COMPRAS-SOLICITACAO-MANUAL-TRAVADO-OK @ESCOPO: restaurar identidade industrial clara aprovada; somente apresentação, fluxo/RPC/RLS preservados. */
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
    <VendasLayout title="Solicitação de compra" subtitle="Necessidade interna • autorização • encaminhamento" onRefresh={() => void load()}>
    <main className="pcp-page compras-solicitacao-manual" style={{ padding: 12, maxWidth: 1800, margin: '0 auto' }}>
      <style>{`
        .compras-solicitacao-manual { color: #123B50; font-size: 12px; background: #F4F7F9; }
        .compras-solicitacao-manual .compras-page-heading { display:flex; align-items:center; justify-content:space-between; gap:16px; margin:0 0 12px!important; padding:12px 16px; color:#F4FBFD; background:linear-gradient(105deg,#123B50 0%,#0E1E2F 100%); border-left:4px solid #48B7C7; }
        .compras-solicitacao-manual .compras-page-heading .v2-eyebrow { display:block; color:#9DDFE6; font-size:9px; font-weight:900; letter-spacing:.12em; }
        .compras-solicitacao-manual .compras-page-heading h1 { font-size:17px!important; line-height:1.25; margin:3px 0!important; font-weight:800; color:#fff; }
        .compras-solicitacao-manual .compras-page-heading p { font-size:11px; margin:0; color:#D5E7EC; }
        .compras-solicitacao-manual .compras-card-title { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:0 0 10px; padding-bottom:8px; border-bottom:1px solid #D8E4EA; }
        .compras-solicitacao-manual .compras-card-title h2 { margin:0; color:#123B50; font-size:12px; font-weight:900; }
        .compras-solicitacao-manual .compras-card-title p { margin:3px 0 0; color:#647985; font-size:10px; }
        .compras-solicitacao-manual .compras-recent-heading { margin:0 0 10px; font-size:12px; font-weight:900; color:#123B50; }
        .compras-solicitacao-manual .compras-recent-subtitle { margin:-5px 0 10px; color:#647985; font-size:10px; }
        .compras-solicitacao-manual .compras-unit { display:inline-flex; min-width:32px; height:24px; align-items:center; justify-content:center; padding:0 6px; border:1px solid #D8E4EA; background:#F4F7F9; color:#123B50; font-size:10px; font-weight:800; }
        .compras-solicitacao-manual .compras-priority { display:inline-block; padding:3px 6px; border:1px solid #D8E4EA; background:#F4F7F9; color:#123B50; font-size:9px; font-weight:900; text-transform:uppercase; }
        .compras-solicitacao-manual .compras-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:12px; padding-top:10px; border-top:1px solid #D8E4EA; }
        .compras-solicitacao-manual .compras-message { padding:8px 10px; border:1px solid; border-radius:2px; font-size:11px; font-weight:700; }
        .compras-solicitacao-manual > header { margin-bottom: 12px !important; }
        .compras-solicitacao-manual > header h1 { font-size: 17px !important; line-height: 1.25; margin: 3px 0 !important; font-weight: 800; color: #123B50; }
        .compras-solicitacao-manual > header p { font-size: 11px; }
        .compras-solicitacao-manual > section { border-radius: 2px !important; padding: 12px !important; border-color: #D8E4EA !important; box-shadow: 0 2px 8px rgba(18,59,80,.04); }
        .compras-solicitacao-manual form label { display: flex; flex-direction: column; align-items: stretch; gap: 5px; min-width: 0; line-height: 1.3; color: #123B50; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .025em; }
        .compras-solicitacao-manual .compras-cabecalho-grid { grid-template-columns: minmax(220px, 1.15fr) minmax(240px, 1.4fr) minmax(130px, .65fr) minmax(240px, 1.25fr) !important; align-items: start; }
        .compras-solicitacao-manual .compras-cabecalho-grid input, .compras-solicitacao-manual .compras-cabecalho-grid select { width: 100%; max-width: none; min-width: 0; }
        .compras-solicitacao-manual form input:not([type="checkbox"]), .compras-solicitacao-manual form select { box-sizing: border-box; width: 100%; min-width: 0; max-width: 260px; height: 32px; padding: 0 8px; border: 1px solid #D8E4EA; border-radius: 0; background: #fff; color: #123B50; font-size: 11px; font-weight: 600; outline: none; }
        .compras-solicitacao-manual form input:focus, .compras-solicitacao-manual form select:focus, .compras-solicitacao-manual form textarea:focus { border-color: #48B7C7; }
        .compras-solicitacao-manual form textarea { box-sizing: border-box; border: 1px solid #D8E4EA; border-radius: 0; padding: 8px; font-size: 11px; color: #123B50; }
        .compras-solicitacao-manual .industrial-section-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:14px!important; padding-bottom:7px; border-bottom:1px solid #D8E4EA; }
        .compras-solicitacao-manual .industrial-section-head span { font-size: 9px; font-weight: 900; letter-spacing: .1em; color: #2D8DB8; }
        .compras-solicitacao-manual .industrial-section-head h2 { margin-top: 3px; font-size: 12px; font-weight: 800; color: #123B50; }
        .compras-solicitacao-manual .crud-table-wrap { width:100%; overflow-x:auto; border:1px solid #D8E4EA; }
        .compras-solicitacao-manual .compras-itens-table { min-width:780px; }
        .compras-solicitacao-manual .compras-recentes-table { min-width:680px; }
        .compras-solicitacao-manual table { width: 100%; min-width: 760px; table-layout: fixed; border-collapse: collapse; font-size: 11px; }
        .compras-solicitacao-manual th:nth-child(1), .compras-solicitacao-manual td:nth-child(1) { width: 42%; }
        .compras-solicitacao-manual th:nth-child(2), .compras-solicitacao-manual td:nth-child(2) { width: 10%; }
        .compras-solicitacao-manual th:nth-child(3), .compras-solicitacao-manual td:nth-child(3) { width: 15%; }
        .compras-solicitacao-manual th:nth-child(4), .compras-solicitacao-manual td:nth-child(4) { width: 23%; }
        .compras-solicitacao-manual th:nth-child(5), .compras-solicitacao-manual td:nth-child(5) { width: 10%; }
        .compras-solicitacao-manual th { height: 28px; padding: 5px 8px; background: #EAF3F7; color: #123B50; text-align: left; font-size: 9px; font-weight: 900; text-transform: uppercase; border: 1px solid #D8E4EA; }
        .compras-solicitacao-manual td { padding: 5px 8px; border: 1px solid #D8E4EA; vertical-align: middle; }
        .compras-solicitacao-manual td input, .compras-solicitacao-manual td select { box-sizing: border-box; width: 100%; max-width: none !important; min-width: 0; }
        .compras-solicitacao-manual td select { text-overflow: ellipsis; }
        .compras-solicitacao-manual button { min-height:30px; border-radius:2px!important; font-size:10px; font-weight:800; }
        .compras-solicitacao-manual .compras-page-heading button { border-color:rgba(244,251,253,.35)!important; color:#fff!important; }
        .compras-solicitacao-manual .compras-page-heading button:hover { background:rgba(244,251,253,.1)!important; }
        @media (max-width: 1100px) { .compras-solicitacao-manual .compras-cabecalho-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }
        @media (max-width:640px) { .compras-solicitacao-manual { padding:8px!important; } .compras-solicitacao-manual > section { padding:9px!important; } .compras-solicitacao-manual .compras-page-heading { align-items:flex-start; padding:10px; } .compras-solicitacao-manual .compras-cabecalho-grid { grid-template-columns:minmax(0,1fr)!important; } .compras-solicitacao-manual .industrial-section-head { align-items:flex-start; flex-direction:column; } }
        @media print { .compras-solicitacao-manual .secondary-v2, .compras-solicitacao-manual .primary { display: none !important; } }
      `}</style>

      <header className="compras-page-heading">
        <div>
          <span className="v2-eyebrow">COMPRAS • SOLICITAÇÃO INTERNA</span>
          <h1>Solicitação manual de compra</h1>
          <p>Registre materiais para autorização e encaminhamento ao setor de Compras.</p>
        </div>
      </header>

      {error && (
        <p role="alert" className="compras-message" style={{ color: '#991b1b', background: '#fef2f2', borderColor: '#fecaca' }}>
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="compras-message" style={{ color: '#166534', background: '#f0fdf4', borderColor: '#bbf7d0' }}>
          {message}
        </p>
      )}

      <section className="compras-card" style={{ background: '#fff', border: '1px solid #D8E4EA', borderRadius: 2, padding: 12 }}>
        <div className="compras-card-title">
          <div><h2>Dados da solicitação</h2><p>Preencha o motivo, a prioridade e os dados de encaminhamento.</p></div>
        </div>
        <form onSubmit={(event) => void save(event)}>
          <div
            className="compras-cabecalho-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
              gap: 10,
            }}
          >
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
          </div>

          <div className="industrial-section-head" style={{ marginTop: 22 }}>
            <div>
              <span>ITENS DA SOLICITAÇÃO</span>
              <h2>Produtos e materiais</h2>
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
            <table className="compras-itens-table">
              <thead>
                <tr>
                  <th>Produto / material</th>
                  <th>Unidade</th>
                  <th>Quantidade</th>
                  <th>Valor estimado unitário</th>
                  <th>Ação</th>
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
                    <td><span className="compras-unit">{item.unidade}</span></td>
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
                    <td>
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

          <label style={{ display: 'flex', flexDirection: 'column', marginTop: 12, maxWidth: '100%' }}>
            Observações
            <textarea
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
              maxLength={2000}
              rows={3}
              style={{ width: '100%', marginTop: 6 }}
            />
          </label>

          <div className="compras-actions">
            <button className="primary" type="submit" disabled={busy || !empresaId}>
              <ShoppingCart size={18} /> {busy ? 'Salvando…' : 'Registrar solicitação'}
            </button>
            <button className="secondary-v2" type="button" onClick={() => window.print()}>
              <Printer size={18} /> Imprimir / Salvar PDF
            </button>
          </div>
        </form>
      </section>

      <section className="compras-card compras-recentes-card" style={{ marginTop: 12, background: '#fff', border: '1px solid #D8E4EA', borderRadius: 2, padding: 12 }}>
        <h2 className="compras-recent-heading">Solicitações recentes</h2>
        <p className="compras-recent-subtitle">Acompanhe o status e autorize as solicitações conforme sua permissão.</p>
        <div className="crud-table-wrap">
          <table className="compras-recentes-table">
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
                  <td><span className="compras-priority">{row.prioridade}</span></td>
                  <td>{supplierById.get(row.fornecedor_id ?? '')?.razao_social ?? '—'}</td>
                  <td>{row.status}</td>
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
        <nav
          aria-label="Paginação das solicitações"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}
        >
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
