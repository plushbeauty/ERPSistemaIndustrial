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
    <main className="pcp-page" style={{ padding: 24, maxWidth: 1440, margin: '0 auto' }}>
      <header
        className="rounded-none"
        style={{ marginBottom: 18, padding: '18px 20px', color: '#FFFFFF', background: 'linear-gradient(110deg, #123B50 0%, #0E1E2F 100%)', border: '1px solid #123B50' }}
      >
        <span className="text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#F4FBFD' }}>COMPRAS • SOLICITAÇÃO INTERNA</span>
        <h1 style={{ fontSize: 24, lineHeight: 1.2, margin: '5px 0' }}>Solicitação de compra</h1>
        <p style={{ color: '#F4FBFD', fontSize: 12, margin: 0 }}>Registre materiais para autorização e encaminhamento ao setor de Compras.</p>
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

      <section style={{ background: '#FFFFFF', color: '#123B50', border: '1px solid #D8E4EA', borderRadius: 0, padding: 16 }}>
        <form onSubmit={(event) => void save(event)}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <label className="block min-w-0 md:col-span-4 max-w-[280px] text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#123B50' }}>
              Motivo da solicitação
              <input className="mt-1 block h-8 w-full max-w-[280px] rounded-none border px-2 text-xs font-normal normal-case" style={{ height: 32, borderColor: '#D8E4EA', background: '#FFFFFF', color: '#123B50', boxSizing: 'border-box' }} required value={descricao} onChange={(event) => setDescricao(event.target.value)} maxLength={500} />
            </label>
            <label className="block min-w-0 md:col-span-3 max-w-[220px] text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#123B50' }}>
              Fornecedor sugerido
              <select className="mt-1 block h-8 w-full max-w-[220px] rounded-none border px-2 text-xs font-normal normal-case" style={{ height: 32, borderColor: '#D8E4EA', background: '#FFFFFF', color: '#123B50', boxSizing: 'border-box' }} value={fornecedorId} onChange={(event) => setFornecedorId(event.target.value)}>
                <option value="">Sem preferência</option>
                {[...fornecedores].sort((left, right) => Number(right.iso_9001_certificado) - Number(left.iso_9001_certificado) || left.razao_social.localeCompare(right.razao_social)).map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.iso_9001_certificado ? 'ISO 9001 • ' : ''}{supplier.razao_social}{supplier.documento ? ` • ${supplier.documento}` : ''}</option>
                ))}
              </select>
            </label>
            <label className="block min-w-0 md:col-span-2 max-w-[160px] text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#123B50' }}>
              Prioridade
              <select className="mt-1 block h-8 w-full max-w-[160px] rounded-none border px-2 text-xs font-normal normal-case" style={{ height: 32, borderColor: '#D8E4EA', background: '#FFFFFF', color: '#123B50', boxSizing: 'border-box' }} value={prioridade} onChange={(event) => setPrioridade(event.target.value)}>
                <option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option>
              </select>
            </label>
            <label className="block min-w-0 md:col-span-3 max-w-[240px] text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#123B50' }}>
              E-mail do setor responsável
              <input className="mt-1 block h-8 w-full max-w-[240px] rounded-none border px-2 text-xs font-normal normal-case" style={{ height: 32, borderColor: '#D8E4EA', background: '#FFFFFF', color: '#123B50', boxSizing: 'border-box' }} type="email" value={emailDestino} onChange={(event) => setEmailDestino(event.target.value)} maxLength={254} placeholder="compras@empresa.com.br" />
            </label>
          </div>

          <div className="industrial-section-head" style={{ marginTop: 18, marginBottom: 8, alignItems: 'center' }}>
            <div><span style={{ color: '#2D8DB8', fontSize: 9, fontWeight: 700 }}>ITENS DA SOLICITAÇÃO</span><h2 style={{ color: '#123B50', fontSize: 15, margin: '3px 0' }}>Produtos e materiais</h2></div>
            <button className="secondary-v2 h-8 rounded-none px-3 text-xs" style={{ height: 32, borderRadius: 0, borderColor: '#D8E4EA', color: '#123B50' }} type="button" onClick={() => setItems((current) => [...current, emptyItem()])}><Plus size={14} /> Adicionar item</button>
          </div>

          <div className="crud-table-wrap" style={{ border: '1px solid #D8E4EA', borderRadius: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 640, tableLayout: 'fixed', borderCollapse: 'collapse', color: '#123B50' }}>
              <colgroup><col /><col style={{ width: 70 }} /><col style={{ width: 100 }} /><col style={{ width: 130 }} /><col style={{ width: 50 }} /></colgroup>
              <thead><tr><th>Produto / material</th><th style={{ width: 70, textAlign: 'center' }}>Unidade</th><th style={{ width: 100, textAlign: 'center' }}>Quantidade</th><th style={{ width: 130 }}>Valor estimado unitário</th><th style={{ width: 50, textAlign: 'center' }}>Ação</th></tr></thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td style={{ minWidth: 0, padding: 6 }}>
                      <select className="h-8 w-full rounded-none border px-2 text-xs" style={{ height: 32, minWidth: 0, borderRadius: 0, borderColor: '#D8E4EA', background: '#FFFFFF', color: '#123B50', boxSizing: 'border-box' }} required value={item.produto_id}
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
                    <td style={{ width: 70, textAlign: 'center', padding: 6 }}><span className="text-xs">{item.unidade}</span></td>
                    <td style={{ width: 100, padding: 6 }}>
                      <input className="h-8 w-full rounded-none border px-1 text-center text-xs" style={{ height: 32, width: '100%', borderRadius: 0, borderColor: '#D8E4EA', background: '#FFFFFF', color: '#123B50', boxSizing: 'border-box' }} type="number"
                        min="0.001"
                        step="0.001"
                        required
                        value={item.quantidade}
                        onChange={(event) => updateItem(index, { quantidade: event.target.value })}
                      />
                    </td>
                    <td style={{ width: 130, padding: 6 }}>
                      <input className="h-8 w-full rounded-none border px-1 text-xs" style={{ height: 32, width: '100%', borderRadius: 0, borderColor: '#D8E4EA', background: '#FFFFFF', color: '#123B50', boxSizing: 'border-box' }} type="number" min="0" step="0.01"
                        required
                        value={item.valor_estimado}
                        onChange={(event) => updateItem(index, { valor_estimado: event.target.value })}
                      />
                    </td>
                    <td style={{ width: 50, textAlign: 'center', padding: 4 }}>
                      <button className="icon-button danger h-8 w-[50px] rounded-none" style={{ width: 50, height: 32, borderRadius: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} type="button"
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

          <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#123B50' }}>Observações
            <textarea className="mt-1 block w-full rounded-none border px-2 py-1 text-xs font-normal normal-case" value={observacoes} onChange={(event) => setObservacoes(event.target.value)} maxLength={2000} rows={3} style={{ minHeight: 64, borderColor: '#D8E4EA', background: '#FFFFFF', color: '#123B50' }} />
          </label>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <button className="primary h-8 rounded-none px-3 text-xs" style={{ height: 32, borderRadius: 0 }} type="submit" disabled={busy || !empresaId}>
              <ShoppingCart size={18} /> {busy ? 'Salvando…' : 'Registrar solicitação'}
            </button>
            <button className="secondary-v2 h-8 rounded-none px-3 text-xs" style={{ height: 32, borderRadius: 0 }} type="button" onClick={() => window.print()}>
              <Printer size={18} /> Imprimir / Salvar PDF
            </button>
          </div>
        </form>
      </section>

      <section style={{ marginTop: 16, background: '#FFFFFF', color: '#123B50', border: '1px solid #D8E4EA', borderRadius: 0, padding: 16 }}>
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
      <small style={{ display: 'block', marginTop: 12, color: '#64748b', fontSize: 10 }}>
        Toda solicitação é registrada para autorização. A liberação é protegida pela permissão de edição de Compras.
      </small>
    </main>
    </VendasLayout>
  )
}
