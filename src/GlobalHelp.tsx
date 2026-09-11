import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Bot, HelpCircle, Search, X } from 'lucide-react'
import { supabase } from './lib/supabaseClient'

type HelpDoc = {
  id: string
  slug: string
  titulo: string
  resumo: string
  conteudo: string
  palavras_chave: string[]
  rota: string | null
  ordem: number
}

const fallback: HelpDoc[] = [
  { id:'fallback-login', slug:'login', titulo:'Login e acesso', resumo:'Como entrar no SGQ ERP.', conteudo:'Informe empresa, usuário ou e-mail e senha. O acesso é validado pelo Supabase Auth e pelo vínculo do usuário com a empresa.', palavras_chave:['login','usuário','senha','empresa','acesso'], rota:'/login', ordem:1 },
  { id:'fallback-cadastro', slug:'cadastro-empresa', titulo:'Cadastro de nova empresa', resumo:'Criação do ambiente industrial.', conteudo:'Informe Razão Social, Nome Fantasia, responsável, e-mail e senha. O ambiente é provisionado pelo backend.', palavras_chave:['cadastro','empresa','nova empresa','ambiente'], rota:'/cadastro-empresa', ordem:2 },
  { id:'fallback-dashboard', slug:'dashboard', titulo:'Dashboard', resumo:'Visão executiva da operação.', conteudo:'Use os indicadores e atalhos para acompanhar a operação industrial.', palavras_chave:['dashboard','indicadores','KPI'], rota:'/', ordem:3 },
]

const routeSlug: Record<string,string> = {
  '/': 'dashboard', '/login': 'login', '/cadastro-empresa': 'cadastro-empresa', '/qualidade': 'qualidade',
  '/fiscal': 'fiscal', '/pcp': 'pcp-mrp', '/compras-solicitacao': 'compras', '/master': 'usuarios-permissoes', '/erp-industrial': 'dashboard'
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export default function GlobalHelp() {
  const [open, setOpen] = useState(false)
  const [docs, setDocs] = useState<HelpDoc[]>(fallback)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [path, setPath] = useState(location.pathname)

  useEffect(() => {
    let alive = true
    const onRoute = () => setPath(location.pathname)
    addEventListener('popstate', onRoute)
    void (async () => {
      const { data, error } = await supabase.from('erp_ajuda_documentos').select('id,slug,titulo,resumo,conteudo,palavras_chave,rota,ordem').eq('publico', true).order('ordem')
      if (alive && !error && data?.length) setDocs(data as HelpDoc[])
    })()
    return () => { alive = false; removeEventListener('popstate', onRoute) }
  }, [])

  const current = useMemo(() => docs.find(d => d.slug === routeSlug[path]) || docs.find(d => d.slug === 'dashboard') || docs[0], [docs, path])
  const results = useMemo(() => {
    const term = normalize(search.trim())
    if (!term) return docs.slice(0, 8)
    return docs.filter(d => normalize([d.titulo, d.resumo, d.conteudo, ...d.palavras_chave].join(' ')).includes(term)).slice(0, 8)
  }, [docs, search])

  async function toggle() {
    setOpen(v => !v)
    if (!open) {
      setLoading(true)
      const { data } = await supabase.from('erp_ajuda_documentos').select('id,slug,titulo,resumo,conteudo,palavras_chave,rota,ordem').eq('publico', true).order('ordem')
      if (data?.length) setDocs(data as HelpDoc[])
      setLoading(false)
    }
  }

  return <>
    <button type="button" aria-label="Abrir ajuda desta tela" title="Ajuda" className="global-help-button" onClick={() => void toggle()}>{open ? <X size={20}/> : <HelpCircle size={20}/>}<span>Ajuda</span></button>
    {open && <aside className="global-help-panel" role="dialog" aria-label="Ajuda do SGQ ERP">
      <div className="global-help-head"><span className="global-help-icon"><Bot size={20}/></span><div><strong>Ajuda</strong><small>{current?.titulo || 'SGQ ERP'}</small></div><button type="button" onClick={() => setOpen(false)} aria-label="Fechar ajuda" title="Fechar"><X size={18}/></button></div>
      <div className="global-help-search"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar por palavra-chave" aria-label="Pesquisar ajuda"/></div>
      {!search ? <>
        <h3 className="global-help-topic-title">{current?.titulo || 'SGQ ERP'}</h3>
        <p>{current?.conteudo || current?.resumo || 'Consulte a base de conhecimento do sistema.'}</p>
        <div className="global-help-keywords">{(current?.palavras_chave || []).slice(0,7).map(k => <button type="button" key={k} onClick={() => setSearch(k)}>{k}</button>)}</div>
        {current?.rota && current.rota !== path && <a className="global-help-action" href={current.rota}>Abrir módulo <ArrowRight size={17}/></a>}
      </> : <div className="global-help-results">{results.map(d => <button type="button" key={d.id} onClick={() => { setSearch(''); if (d.rota && d.rota !== path) location.href=d.rota }}>{d.titulo}<small>{d.resumo}</small></button>)}{!results.length && <div className="global-help-no-results">Nenhum tópico encontrado. Tente outra palavra.</div>}</div>}
      {loading && <small className="global-help-loading">Atualizando base de ajuda…</small>}
      <div className="global-help-tips"><span>💡 Base inteligente</span><span>A ajuda pesquisa tópicos e palavras-chave gravados no banco de dados.</span></div>
      <button type="button" className="global-help-close" onClick={() => setOpen(false)}>Fechar</button>
    </aside>}
  </>
}
