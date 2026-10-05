import { FormEvent, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Plus, Printer, ShoppingCart, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
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
    <main className="pcp-page" style={{ padding: 24, maxWidth: 1440, margin: '0 auto' }}>
      <header style={{ marginBottom: 22 }}>
        <span className="v2-eyebrow">COMPRAS • SOLICITAÇÃO INTERNA</span>
        <h1 style={{ fontSize: 32, margin: '6px 0' }}>Solicitação de compra</h1>
        <p style={{ color: '#64748b', margin: 0 }}>
          Registre materiais para autorização e encaminhamento ao setor de Compras.
        </p>
      </header>

      {error && (
        <p role="alert" style={{ padding: 12, color: '#991b1b', background: '#fef2f2', borderRadius: 8 }}>
          {error}
        </p>
      )}
      {message && (
        <p role="status" style={{ padding: 12, color: '#166534', background: '#f0fdf4', borderRadius: 8 }}>
          {message}
        </p>
      )}

      <section style={{ background: '#fff', border: '1px solid #dfe7e4', borderRadius: 14, padding: 20 }}>
        <form onSubmit={(event) => void save(event)}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
              gap: 14,
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
            <table>
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
                    <td>{item.unidade}</td>
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

          <label style={{ display: 'block', marginTop: 14 }}>
            Observações
            <textarea
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
              maxLength={2000}
              rows={3}
              style={{ width: '100%', marginTop: 6 }}
            />
          </label>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
            <button className="primary" type="submit" disabled={busy || !empresaId}>
              <ShoppingCart size={18} /> {busy ? 'Salvando…' : 'Registrar solicitação'}
            </button>
            <button className="secondary-v2" type="button" onClick={() => window.print()}>
              <Printer size={18} /> Imprimir / Salvar PDF
            </button>
          </div>
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
        <h2 style={{ marginTop: 0 }}>Solicitações recentes</h2>
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
                  <td>{row.prioridade}</td>
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
