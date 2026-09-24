import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Product = {
  id: string
  empresa_id: string
  codigo: string
  nome: string
  descricao: string | null
  categoria: string | null
  estoque_atual: number | null
  unidade: string | null
  ncm: string | null
  cfop_saida: string | null
  peso_liquido: number | null
  peso_bruto: number | null
  volume: string | null
  foto_url: string | null
  ativo: boolean | null
  catalogo_disponivel: boolean
}
type CurrentUser = { id: string; empresa_id: string | null }
type AuditAction = 'CATALOGO_PUBLICADO' | 'CATALOGO_RETIRADO' | 'CATALOGO_COMPARTILHADO'

const numberFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
const stockFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 })

function Icon({ kind }: { kind: 'refresh' | 'whatsapp' | 'mail' | 'history' | 'eye' | 'eyeOff' }) {
  if (kind === 'refresh') return <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 11a8 8 0 0 0-14.8-4L3 9"/><path d="M3 4v5h5"/><path d="M4 13a8 8 0 0 0 14.8 4L21 15"/><path d="M21 20v-5h-5"/></svg>
  if (kind === 'whatsapp') return <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 11.5a8.2 8.2 0 0 1-12.1 7.1L4 20l1.5-3.7A8.2 8.2 0 1 1 20 11.5Z"/><path d="M8.7 8.2c.2-.5.4-.6.8-.6h.5c.2 0 .4.1.5.4l.7 1.7c.1.2 0 .4-.1.6l-.6.7c.7 1.3 1.7 2.2 3 2.8l.7-.7c.2-.2.4-.2.7-.1l1.6.7c.3.1.4.3.3.6-.2.7-.8 1.3-1.5 1.4-1.1.2-2.9-.6-4.4-1.8-1.5-1.3-2.6-3-2.8-4.1-.1-.6.1-1.2.6-1.6Z"/></svg>
  if (kind === 'mail') return <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 5h16v14H4z"/><path d="m4 6 8 6 8-6"/></svg>
  if (kind === 'history') return <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/><path d="M12 7v5l3 2"/></svg>
  if (kind === 'eyeOff') return <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 3 18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 4.3A10.8 10.8 0 0 1 12 4c5.5 0 9 5.9 9 8a8.7 8.7 0 0 1-2.2 3.3"/><path d="M6.6 6.6C4.3 8.2 3 10.8 3 12c0 2.1 3.5 8 9 8 1.4 0 2.7-.3 3.8-.9"/></svg>
  return <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"/><circle cx="12" cy="12" r="2.5"/></svg>
}

function productCode(product: Product): string {
  return product.codigo?.trim() || product.id.slice(0, 8).toUpperCase()
}

function productLink(product: Product): string {
  const url = new URL('/comercial/catalogo', window.location.origin)
  url.searchParams.set('produto', product.id)
  return url.toString()
}

function productMessage(product: Product): string {
  return [
    'Catálogo Comercial B2B',
    '',
    'Código: ' + productCode(product),
    'Produto: ' + product.nome,
    'Estoque: ' + stockFormat.format(Number(product.estoque_atual ?? 0)) + ' ' + (product.unidade?.trim() || 'UN'),
    'Catálogo: ' + productLink(product),
  ].join('\n')
}

const catalogCss = [
  '.catalog-page{min-height:calc(100vh - 82px);box-sizing:border-box;background:#F4FBFD;color:#123B50;padding:18px 24px 42px;font-family:Inter,Roboto,Arial,sans-serif}',
  '.catalog-header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;background:#123B50;color:#fff;border-radius:10px;padding:17px 18px;margin-bottom:12px}',
  '.catalog-eyebrow{display:block;color:#48B7C7;font-size:10px;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.catalog-header h1{margin:4px 0;font-size:24px}.catalog-header p{margin:0;color:#D7E8ED;font-size:12px}',
  '.catalog-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.button{min-height:36px;border-radius:7px;padding:0 11px;border:1px solid transparent;display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:900;cursor:pointer}.button:disabled{opacity:.55;cursor:not-allowed}.secondary{background:#fff;color:#123B50;border-color:#D5E5EA}.whatsapp{background:#2D8DB8;color:#fff}.mail{background:#fff;color:#123B50}.history{background:transparent;color:#fff;border-color:#6E9AA8}',
  '.catalog-alert{border-radius:7px;padding:9px 11px;margin-bottom:10px;font-size:12px;font-weight:800}.error{background:#FCEBEC;border:1px solid #E7B5B9;color:#8D3139}.success{background:#E8F7F1;border:1px solid #A8D9C2;color:#176C4E}',
  '.catalog-toolbar{display:grid;grid-template-columns:minmax(360px,1fr) auto auto;align-items:end;gap:12px;background:#fff;border:1px solid #D4E4EA;border-radius:9px;padding:11px;margin-bottom:10px}.search-field span{display:block;margin-bottom:3px;color:#58707B;font-size:10px;font-weight:950;text-transform:uppercase}.search-field input{width:100%;height:35px;box-sizing:border-box;border:1px solid #B9D0D8;border-radius:6px;padding:0 9px;color:#123B50;background:#fff}.compact-check{height:35px;display:flex;align-items:center;gap:7px;color:#405B67;font-size:12px;font-weight:800;white-space:nowrap}.compact-check input{accent-color:#48B7C7}.counter{height:35px;display:flex;align-items:baseline;gap:5px;white-space:nowrap}.counter strong{font-size:18px}.counter span{font-size:11px;color:#657C86}',
  '.card{background:#fff;border:1px solid #D4E4EA;border-radius:9px;overflow:hidden}.scroll{overflow:auto}.card table,.history table{width:100%;border-collapse:collapse;min-width:1080px}.card th,.history th{background:#123B50;color:#fff;text-align:left;font-size:9px;text-transform:uppercase;padding:8px 9px;white-space:nowrap}.card td,.history td{border-bottom:1px solid #E1ECEF;padding:7px 9px;font-size:12px;vertical-align:middle}.card tbody tr:hover{background:#F7FCFD}',
  '.code{width:90px}.description{width:62%}.short{width:100px}.stock{width:90px}.status{width:115px}.actions{width:80px}.mono{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-weight:900}.number{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}',
  '.product{display:flex;align-items:center;gap:8px;min-width:260px}.product img,.fallback{width:30px;height:30px;border-radius:5px;object-fit:cover;flex:none}.fallback{display:grid;place-items:center;background:#E8F3F6;color:#2D8DB8;font-weight:950}.product strong{display:block;font-size:12px}.product small{display:block;margin-top:2px;color:#718791;font-size:10px}',
  '.publish{height:26px;border-radius:5px;padding:0 7px;display:inline-flex;align-items:center;gap:5px;border:1px solid;font-size:10px;font-weight:900;cursor:pointer}.publish:disabled{opacity:.55}.published{background:#E8F7F1;color:#176C4E;border-color:#A8D9C2}.unpublished{background:#FFF5E7;color:#8A5A16;border-color:#E6C98E}.row-actions{display:flex;gap:4px}.icon{width:29px;height:27px;display:grid;place-items:center;border-radius:5px;border:1px solid #C9DDE3;background:#fff;cursor:pointer}.empty{text-align:center!important;color:#70858E;padding:25px!important}',
  '.history{margin-top:10px}.history-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #D4E4EA}.history h2{margin:3px 0;font-size:16px}.history-scroll{max-height:300px;overflow:auto}.audit{display:inline-flex;padding:4px 6px;border-radius:4px;background:#EAF5F7;color:#123B50;font-size:9px;font-weight:950}.audit-data{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:#5C737D;font-size:10px;max-width:600px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '@media(max-width:980px){.catalog-header{flex-direction:column}.catalog-actions{justify-content:flex-start}.catalog-toolbar{grid-template-columns:1fr}.compact-check,.counter{justify-self:start}}@media(max-width:620px){.catalog-page{padding:10px}.catalog-actions{width:100%}.button{flex:1;justify-content:center}}',
].join('')

export default function CatalogoDigital() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [onlyPublished, setOnlyPublished] = useState(false)
  const [busy, setBusy] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [history, setHistory] = useState<Array<{ id: string; acao: string; created_at: string; dados: unknown }>>([])
  const [showHistory, setShowHistory] = useState(false)

  const loadUser = useCallback(async (): Promise<CurrentUser> => {
    const auth = await supabase.auth.getUser()
    if (auth.error || !auth.data.user) throw new Error('Sessão de autenticação não localizada.')

    const profile = await supabase.from('erp_usuarios').select('id,empresa_id').eq('auth_user_id', auth.data.user.id).eq('ativo', true).maybeSingle()
    if (profile.error) throw profile.error
    if (!profile.data) throw new Error('Usuário ERP ativo não localizado para a sessão atual.')

    const current = { id: String(profile.data.id), empresa_id: profile.data.empresa_id ? String(profile.data.empresa_id) : null }
    setUser(current)
    return current
  }, [])

  const loadProducts = useCallback(async (currentUser: CurrentUser) => {
    setBusy(true)
    setError('')
    try {
      const result = await supabase
        .from('erp_produtos')
        .select('id,empresa_id,codigo,nome,descricao,categoria,estoque_atual,unidade,ncm,cfop_saida,peso_liquido,peso_bruto,volume,foto_url,ativo,catalogo_disponivel')
        .eq('empresa_id', currentUser.empresa_id ?? '')
        .eq('ativo', true)
        .order('sku', { ascending: true, nullsFirst: false })
        .order('nome', { ascending: true })
      if (result.error) throw result.error
      setProducts((result.data ?? []) as Product[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível consultar os produtos ativos.')
    } finally {
      setBusy(false)
    }
  }, [])

  const loadHistory = useCallback(async (currentUser: CurrentUser) => {
    let query = supabase.from('erp_logs_sistema').select('id,acao,created_at,dados').eq('modulo', 'Comercial').eq('entidade', 'erp_produtos').in('acao', ['CATALOGO_PUBLICADO', 'CATALOGO_RETIRADO', 'CATALOGO_COMPARTILHADO']).order('created_at', { ascending: false }).limit(25)
    if (currentUser.empresa_id) query = query.eq('empresa_id', currentUser.empresa_id)
    const result = await query
    if (result.error) throw result.error
    setHistory((result.data ?? []) as Array<{ id: string; acao: string; created_at: string; dados: unknown }>)
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const current = await loadUser()
        await Promise.all([loadProducts(current), loadHistory(current)])
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Não foi possível inicializar o catálogo.')
      }
    })()
  }, [loadHistory, loadProducts, loadUser])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR')
    return products.filter((product) => {
      const searchable = [productCode(product), product.nome, product.categoria ?? '', product.ncm ?? '', product.cfop ?? '']
      const matchesSearch = !query || searchable.some((value) => value.toLocaleLowerCase('pt-BR').includes(query))
      return matchesSearch && (!onlyPublished || product.catalogo_disponivel)
    })
  }, [onlyPublished, products, search])

  const writeAudit = useCallback(async (action: AuditAction, product: Product | null, extra: Record<string, unknown> = {}) => {
    if (!user) throw new Error('Usuário ERP não localizado para registrar o histórico.')
    const result = await supabase.from('erp_logs_sistema').insert({
      empresa_id: user.empresa_id,
      usuario_id: user.id,
      modulo: 'Comercial',
      acao: action,
      entidade: 'erp_produtos',
      entidade_id: product?.id ?? null,
      dados: { rota: '/comercial/catalogo', produto_codigo: product ? productCode(product) : null, produto_nome: product?.nome ?? null, ...extra },
    })
    if (result.error) throw result.error
  }, [user])

  const togglePublished = async (product: Product) => {
    setSavingId(product.id)
    setError('')
    setMessage('')
    const nextValue = !product.catalogo_disponivel
    try {
      const result = await supabase.from('erp_produtos').update({ catalogo_disponivel: nextValue, updated_at: new Date().toISOString() }).eq('id', product.id).select('id,catalogo_disponivel').single()
      if (result.error || !result.data) throw new Error(result.error?.message || 'Não foi possível gravar a disponibilidade do catálogo.')
      setProducts((current) => current.map((item) => item.id === product.id ? { ...item, catalogo_disponivel: Boolean(result.data.catalogo_disponivel) } : item))
      await writeAudit(nextValue ? 'CATALOGO_PUBLICADO' : 'CATALOGO_RETIRADO', product)
      setMessage(nextValue ? 'Produto ' + productCode(product) + ' publicado no catálogo.' : 'Produto ' + productCode(product) + ' retirado do catálogo.')
      if (showHistory && user) await loadHistory(user)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao gravar a disponibilidade do catálogo.')
    } finally {
      setSavingId(null)
    }
  }

  const shareProduct = async (product: Product, channel: 'whatsapp' | 'email') => {
    setError('')
    setMessage('')
    try {
      const text = productMessage(product)
      await writeAudit('CATALOGO_COMPARTILHADO', product, { canal: channel })
      if (channel === 'whatsapp') window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer')
      else window.location.href = 'mailto:?subject=' + encodeURIComponent('Catálogo B2B — ' + productCode(product) + ' — ' + product.nome) + '&body=' + encodeURIComponent(text)
      setMessage('Compartilhamento ' + (channel === 'whatsapp' ? 'WhatsApp' : 'E-mail') + ' registrado no histórico.')
      if (showHistory && user) await loadHistory(user)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível registrar o compartilhamento.')
    }
  }

  const shareAll = async (channel: 'whatsapp' | 'email') => {
    setError('')
    setMessage('')
    try {
      const link = new URL('/comercial/catalogo', window.location.origin).toString()
      const text = 'Catálogo Comercial B2B — produtos ativos disponíveis: ' + link
      await writeAudit('CATALOGO_COMPARTILHADO', null, { canal: channel, escopo: 'catalogo_completo' })
      if (channel === 'whatsapp') window.open('https://whatsapp.com/?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer')
      else window.location.href = 'mailto:?subject=' + encodeURIComponent('Catálogo Comercial B2B') + '&body=' + encodeURIComponent(text)
      setMessage('Catálogo completo preparado e registrado no histórico.')
      if (showHistory && user) await loadHistory(user)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível registrar o compartilhamento.')
    }
  }

  const toggleHistory = async () => {
    const next = !showHistory
    setShowHistory(next)
    if (next && user) {
      try {
        await loadHistory(user)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o histórico.')
      }
    }
  }

  return (
    <main className="catalog-page">
      <header className="catalog-header">
        <div>
          <span className="catalog-eyebrow">COMERCIAL • CATÁLOGO DIGITAL B2B</span>
          <h1>Catálogo Comercial</h1>
          <p>Produtos ativos do cadastro mestre, com estoque, peso, publicação e trilha de auditoria.</p>
        </div>
        <div className="catalog-actions">
          <button className="button secondary" type="button" onClick={() => void loadProducts()} disabled={busy}><Icon kind="refresh" />{busy ? 'Atualizando…' : 'Atualizar'}</button>
          <button className="button whatsapp" type="button" onClick={() => void shareAll('whatsapp')} disabled={!products.length}><Icon kind="whatsapp" />WhatsApp</button>
          <button className="button mail" type="button" onClick={() => void shareAll('email')} disabled={!products.length}><Icon kind="mail" />E-mail</button>
          <button className="button history" type="button" onClick={() => void toggleHistory()}><Icon kind="history" />{showHistory ? 'Fechar histórico' : 'Histórico'}</button>
        </div>
      </header>

      {error && <div className="catalog-alert error" role="alert">{error}</div>}
      {message && <div className="catalog-alert success" role="status">{message}</div>}

      <section className="catalog-toolbar">
        <label className="search-field">
          <span>pesquisa</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Código, descrição, NCM, CFOP…" autoComplete="off" />
        </label>
        <label className="compact-check"><input type="checkbox" checked={onlyPublished} onChange={(event) => setOnlyPublished(event.target.checked)} /><span>somente publicados</span></label>
        <div className="counter"><strong>{filtered.length}</strong><span>de {products.length} produtos ativos</span></div>
      </section>

      <section className="card">
        <div className="scroll">
          <table>
            <thead><tr><th className="code">código</th><th className="description">descrição</th><th className="short">peso líquido</th><th className="short">peso bruto</th><th className="stock">estoque</th><th className="short">UN</th><th className="status">catálogo</th><th className="actions">ações</th></tr></thead>
            <tbody>
              {filtered.map((product) => {
                const published = product.catalogo_disponivel
                const saving = savingId === product.id
                const image = product.imagem_url?.trim()
                return (
                  <tr key={product.id}>
                    <td className="mono">{productCode(product)}</td>
                    <td>
                      <div className="product">
                        {image ? <img src={image} alt="" loading="lazy" /> : <span className="fallback">P</span>}
                        <div><strong>{product.nome}</strong><small>{product.categoria || product.volume || 'Sem categoria informada'}</small></div>
                      </div>
                    </td>
                    <td className="number">{product.peso_liquido == null ? '—' : numberFormat.format(product.peso_liquido) + ' kg'}</td>
                    <td className="number">{product.peso_bruto == null ? '—' : numberFormat.format(product.peso_bruto) + ' kg'}</td>
                    <td className="number">{stockFormat.format(Number(product.quantidade ?? 0))}</td>
                    <td>{product.unidade?.trim() || 'UN'}</td>
                    <td>
                      <button className={'publish ' + (published ? 'published' : 'unpublished')} type="button" onClick={() => void togglePublished(product)} disabled={saving} aria-pressed={published}>
                        <Icon kind={published ? 'eye' : 'eyeOff'} />{saving ? 'gravando…' : published ? 'publicado' : 'interno'}
                      </button>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="icon" type="button" onClick={() => void shareProduct(product, 'whatsapp')} title="Compartilhar no WhatsApp"><Icon kind="whatsapp" /></button>
                        <button className="icon" type="button" onClick={() => void shareProduct(product, 'email')} title="Compartilhar por e-mail"><Icon kind="mail" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!filtered.length && <tr><td colSpan={8} className="empty">{busy ? 'Consultando produtos ativos no Supabase…' : 'Nenhum produto ativo atende aos filtros atuais.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {showHistory && (
        <section className="card history">
          <div className="history-head"><div><span className="catalog-eyebrow">AUDITORIA</span><h2>Histórico do catálogo</h2></div><span>últimos {history.length} eventos</span></div>
          <div className="history-scroll">
            <table>
              <thead><tr><th>data/hora</th><th>ação</th><th>dados</th></tr></thead>
              <tbody>
                {history.map((item) => <tr key={item.id}><td>{new Date(item.created_at).toLocaleString('pt-BR')}</td><td><span className="audit">{item.acao.replaceAll('_', ' ')}</span></td><td className="audit-data">{JSON.stringify(item.dados)}</td></tr>)}
                {!history.length && <tr><td colSpan={3} className="empty">Nenhum evento de catálogo registrado para a empresa.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <style>{catalogCss}</style>
    </main>
  )
}
