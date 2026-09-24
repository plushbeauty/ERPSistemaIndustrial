import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Product = {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  peso_liquido: number | null
  peso_bruto: number | null
  estoque_atual: number | null
  unidade: string
  foto_url: string | null
  ativo: boolean
}

const toNumber = (value: unknown): number => {
  const result = Number(value ?? 0)
  return Number.isFinite(result) ? result : 0
}

function safeCatalogUrl(): string {
  const url = new URL('/comercial/catalogo', window.location.origin)
  url.search = ''
  url.hash = ''
  return url.toString()
}

function Icon({ kind }: { kind: 'share' | 'mail' | 'refresh' }) {
  if (kind === 'mail') return <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 5h16v14H4z"/><path d="m4 6 8 6 8-6"/></svg>
  if (kind === 'refresh') return <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 11a8 8 0 0 0-14.8-4L3 9"/><path d="M3 4v5h5"/><path d="M4 13a8 8 0 0 0 14.8 4L21 15"/><path d="M21 20v-5h-5"/></svg>
  return <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/></svg>
}

export default function CatalogoDigital() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    setBusy(true)
    setError('')
    try {
      const result = await supabase
        .from('erp_produtos')
        .select('id,codigo,nome,descricao,peso_liquido,peso_bruto,estoque_atual,unidade,foto_url,ativo')
        .eq('ativo', true)
        .order('codigo', { ascending: true })

      if (result.error) throw result.error
      setProducts((result.data ?? []) as Product[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível consultar os produtos ativos.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR')
    if (!query) return products
    return products.filter((product) =>
      [product.codigo, product.nome, product.descricao ?? ''].some((value) =>
        value.toLocaleLowerCase('pt-BR').includes(query),
      ),
    )
  }, [products, search])

  const shareCatalog = async () => {
    const link = safeCatalogUrl()
    const messageText = `Catálogo Comercial B2B — confira os produtos disponíveis: ${link}`
    try {
      await navigator.clipboard?.writeText(messageText)
      setMessage('Mensagem comercial copiada. O WhatsApp será aberto para continuidade do envio.')
    } catch {
      setMessage('O link do catálogo foi preparado para compartilhamento.')
    }
    window.open(`https://whatsapp.com/?text=${encodeURIComponent(messageText)}`, '_blank', 'noopener,noreferrer')
  }

  const emailCatalog = () => {
    const link = safeCatalogUrl()
    const subject = encodeURIComponent('Catálogo Comercial B2B')
    const body = encodeURIComponent(`Olá,\n\nSegue o nosso catálogo comercial: ${link}\n\nAtenciosamente.`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  return (
    <main className="catalog-page">
      <header className="catalog-header">
        <div><span className="catalog-eyebrow">COMERCIAL • CATÁLOGO DIGITAL B2B</span><h1>Catálogo Comercial</h1><p>Produtos ativos, peso e estoque atual consultados diretamente do cadastro mestre do ERP.</p></div>
        <div className="catalog-actions">
          <button type="button" onClick={() => void load()} disabled={busy}><Icon kind="refresh"/>{busy ? 'Atualizando…' : 'Atualizar'}</button>
          <button type="button" onClick={() => void shareCatalog()}><Icon kind="share"/> WhatsApp</button>
          <button type="button" onClick={emailCatalog}><Icon kind="mail"/> E-mail</button>
        </div>
      </header>

      {error && <div className="catalog-alert error">{error}</div>}
      {message && <div className="catalog-alert success">{message}</div>}

      <section className="catalog-toolbar">
        <label><span>pesquisa</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Código ou descrição…" /></label>
        <strong>{filtered.length} produtos ativos</strong>
      </section>

      <section className="catalog-card">
        <div className="catalog-table-wrap">
          <table>
            <thead><tr><th className="code">código</th><th className="description">descrição</th><th className="weight">peso líquido</th><th className="weight">peso bruto</th><th className="stock">estoque atual</th><th className="unit">UN</th></tr></thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id}>
                  <td className="mono">{product.codigo}</td>
                  <td><strong>{product.nome}</strong><small>{product.descricao ?? '—'}</small></td>
                  <td className="number">{toNumber(product.peso_liquido).toFixed(3)} kg</td>
                  <td className="number">{toNumber(product.peso_bruto).toFixed(3)} kg</td>
                  <td className="number">{toNumber(product.estoque_atual).toLocaleString('pt-BR')}</td>
                  <td>{product.unidade || 'UN'}</td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={6} className="empty">Nenhum produto ativo encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <style>{`
        .catalog-page{min-height:calc(100vh - 70px);background:#F4FBFD;color:#123B50;padding:24px 28px 48px;font-family:Inter,Roboto,Arial,sans-serif;box-sizing:border-box}
        .catalog-header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;background:#123B50;color:#fff;border-radius:14px;padding:20px 22px;margin-bottom:16px}.catalog-eyebrow{font-size:11px;letter-spacing:.14em;font-weight:900;color:#48B7C7}.catalog-header h1{margin:5px 0;font-size:29px}.catalog-header p{margin:5px 0;color:#D4E9EE}.catalog-actions{display:flex;gap:8px;flex-wrap:wrap}.catalog-actions button{display:inline-flex;align-items:center;gap:7px;border:1px solid #4FA8C9;background:#fff;color:#123B50;border-radius:8px;padding:10px 12px;font-weight:900;cursor:pointer}.catalog-actions button:nth-child(2){background:#2D8DB8;color:#fff;border-color:#2D8DB8}
        .catalog-alert{padding:12px 14px;border-radius:9px;margin-bottom:12px;font-weight:700}.catalog-alert.error{background:#FCEBEC;border:1px solid #E6B1B5;color:#8B3038}.catalog-alert.success{background:#E8F7F1;border:1px solid #A9D9C3;color:#176C4E}
        .catalog-toolbar{display:flex;align-items:end;justify-content:space-between;gap:14px;background:#fff;border:1px solid #D4E4EA;border-radius:12px;padding:14px;margin-bottom:12px}.catalog-toolbar label{display:block;width:min(70%,720px)}.catalog-toolbar label span{display:block;font-size:11px;font-weight:900;color:#536C77;margin-bottom:4px}.catalog-toolbar input{width:100%;min-height:38px;border:1px solid #B9D2DA;border-radius:7px;padding:7px 9px;box-sizing:border-box}.catalog-toolbar strong{font-size:13px;color:#536C77}
        .catalog-card{background:#fff;border:1px solid #D4E4EA;border-radius:12px;overflow:hidden}.catalog-table-wrap{overflow:auto}.catalog-card table{width:100%;border-collapse:collapse;min-width:760px}.catalog-card th{background:#123B50;color:#fff;text-align:left;font-size:10px;text-transform:uppercase;padding:9px}.catalog-card td{border-bottom:1px solid #E1ECEF;padding:9px;font-size:13px}.catalog-card td small{display:block;color:#718893;margin-top:3px}.catalog-card th.code{width:110px}.catalog-card th.description{width:65%}.catalog-card th.weight{width:105px}.catalog-card th.stock{width:110px}.catalog-card th.unit{width:55px}.mono{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-weight:850}.number{text-align:right;font-variant-numeric:tabular-nums}.empty{text-align:center;padding:28px!important;color:#718893}
        @media(max-width:800px){.catalog-page{padding:12px}.catalog-header{flex-direction:column}.catalog-toolbar{align-items:stretch;flex-direction:column}.catalog-toolbar label{width:100%}}
      `}</style>
    </main>
  )
}
