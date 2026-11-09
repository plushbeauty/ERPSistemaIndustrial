/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-08
 * @REVISAO: REV-SGQ-CONTROLE-DESENHOS-20261108-01 — rota operacional para revisões e homologação de desenhos técnicos
 * @STATUS_APROVACAO: INTEGRADO AO TABLET CENTRAL DA QUALIDADE — revisão registrada em 2026-11-08
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, ExternalLink, FileCheck2, Plus, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Drawing = {
  id: string
  codigo_desenho: string
  produto_vinculado: string
  molde_referencia: string | null
  numero_revisao: number
  responsavel_nome: string
  status_revisao: 'EM_REVISAO' | 'HOMOLOGADO' | 'OBSOLETO'
  url_arquivo_cad: string | null
  motivo_alteracao: string | null
  criado_em: string
  data_homologacao: string | null
}

const inputClass = 'h-[30px] w-full border border-[#CFE1E7] bg-white px-2 text-[11px] text-[#123B50] outline-none focus:border-[#2D8DB8] disabled:opacity-60'
const labelClass = 'mb-1 block text-[9px] font-bold uppercase tracking-wider text-slate-500'
const panelClass = 'min-w-0 border border-[#CFE1E7] bg-white'

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) return String((error as { message: unknown }).message)
  return 'Não foi possível concluir a operação.'
}

export default function QualidadeControleDesenhos() {
  const [empresaId, setEmpresaId] = useState('')
  const [rows, setRows] = useState<Drawing[]>([])
  const [query, setQuery] = useState('')
  const [codigo, setCodigo] = useState('')
  const [produto, setProduto] = useState('')
  const [molde, setMolde] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [arquivo, setArquivo] = useState('')
  const [motivo, setMotivo] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      if (!tenant.data) throw new Error('Empresa da sessão autenticada não identificada.')
      const companyId = String(tenant.data)
      setEmpresaId(companyId)
      const result = await supabase.from('erp_qualidade_desenhos')
        .select('id,codigo_desenho,produto_vinculado,molde_referencia,numero_revisao,responsavel_nome,status_revisao,url_arquivo_cad,motivo_alteracao,criado_em,data_homologacao')
        .eq('empresa_id', companyId)
        .order('codigo_desenho')
        .order('numero_revisao', { ascending: false })
        .limit(500)
      if (result.error) throw result.error
      setRows((result.data ?? []) as Drawing[])
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    if (!term) return rows
    return rows.filter(row => [row.codigo_desenho, row.produto_vinculado, row.molde_referencia, row.responsavel_nome, row.status_revisao]
      .some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(term)))
  }, [rows, query])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (!empresaId) throw new Error('Empresa não identificada. Atualize a tela.')
      if (!codigo.trim() || !produto.trim() || !responsavel.trim()) throw new Error('Preencha código do desenho, produto vinculado e responsável.')
      const link = arquivo.trim()
      if (link && !/^https:\/\/[^\s]+$/i.test(link)) throw new Error('O link do arquivo CAD precisa começar com HTTPS.')
      const result = await supabase.rpc('erp_qualidade_desenho_nova_revisao', {
        p_codigo_desenho: codigo.trim().toUpperCase(),
        p_produto_vinculado: produto.trim(),
        p_molde_referencia: molde.trim() || null,
        p_responsavel_nome: responsavel.trim(),
        p_url_arquivo_cad: link || null,
        p_motivo_alteracao: motivo.trim() || null,
      })
      if (result.error) throw result.error
      const revision = result.data && typeof result.data === 'object' ? (result.data as Record<string, unknown>).numero_revisao : null
      setMessage('Nova revisão registrada no banco' + (revision ? ' · revisão ' + String(revision) : '') + ' · aguardando homologação.')
      setCodigo('')
      setProduto('')
      setMolde('')
      setArquivo('')
      setMotivo('')
      await load()
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  const homologar = async (row: Drawing) => {
    if (!row.url_arquivo_cad) {
      setError('A homologação exige um link HTTPS para o arquivo técnico.')
      return
    }
    if (!window.confirm('Homologar a revisão ' + row.numero_revisao + ' do desenho ' + row.codigo_desenho + '? A revisão homologada anterior será marcada como obsoleta pelo banco.')) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await supabase.rpc('erp_qualidade_desenho_homologar', { p_desenho_id: row.id })
      if (result.error) throw result.error
      setMessage('Revisão ' + row.numero_revisao + ' de ' + row.codigo_desenho + ' homologada pelo banco.')
      await load()
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F4FBFD] p-3 text-[#123B50] antialiased">
      <div className="mx-auto max-w-[1600px] space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#CFE1E7] pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center border border-[#CFE1E7] bg-white text-[#176487]"><FileCheck2 size={18} /></span>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#176487]">SGQ · Engenharia e Qualidade</p>
              <h1 className="text-base font-bold text-[#123B50]">Controle de desenhos técnicos</h1>
              <p className="text-[10px] text-slate-500">Revisões controladas, homologação e histórico por empresa.</p>
            </div>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading || busy} className="inline-flex h-[30px] items-center gap-1.5 border border-[#CFE1E7] bg-[#123B50] px-3 text-[10px] font-bold text-white disabled:opacity-50">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
        </header>

        {error && <p role="alert" className="border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-semibold text-rose-700">{error}</p>}
        {message && <p role="status" className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-semibold text-emerald-700"><CheckCircle2 size={13} />{message}</p>}

        <section className={panelClass}>
          <header className="border-b border-[#CFE1E7] bg-[#EAF6FA] px-3 py-2">
            <h2 className="text-[10px] font-bold uppercase tracking-wider">Registrar nova revisão</h2>
            <p className="text-[9px] text-slate-500">A numeração é gerada de forma transacional pelo banco. A homologação exige link HTTPS do arquivo técnico.</p>
          </header>
          <form onSubmit={event => void save(event)} className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2 xl:grid-cols-3">
            <label><span className={labelClass}>Código do desenho *</span><input required maxLength={50} value={codigo} onChange={event => setCodigo(event.target.value.toUpperCase())} className={inputClass} /></label>
            <label><span className={labelClass}>Produto vinculado *</span><input required maxLength={255} value={produto} onChange={event => setProduto(event.target.value)} className={inputClass} /></label>
            <label><span className={labelClass}>Molde de referência</span><input maxLength={120} value={molde} onChange={event => setMolde(event.target.value)} className={inputClass} /></label>
            <label><span className={labelClass}>Responsável *</span><input required maxLength={255} value={responsavel} onChange={event => setResponsavel(event.target.value)} className={inputClass} /></label>
            <label><span className={labelClass}>Link HTTPS do arquivo CAD</span><input type="url" value={arquivo} onChange={event => setArquivo(event.target.value)} placeholder="https://..." className={inputClass} /></label>
            <label><span className={labelClass}>Motivo da alteração</span><input value={motivo} onChange={event => setMotivo(event.target.value)} className={inputClass} /></label>
            <div className="sm:col-span-2 xl:col-span-3">
              <button type="submit" disabled={busy} className="inline-flex h-[30px] items-center gap-1.5 border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-bold text-white disabled:opacity-50"><Plus size={12} /> {busy ? 'Registrando...' : 'Registrar revisão'}</button>
            </div>
          </form>
        </section>

        <section className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#CFE1E7] p-2.5">
            <div><h2 className="text-[10px] font-bold uppercase tracking-wider">Histórico de revisões</h2><p className="text-[9px] text-slate-500">{filtered.length} registro(s) · somente empresa autenticada</p></div>
            <div className="flex h-[30px] min-w-[210px] items-center gap-2 border border-[#CFE1E7] bg-white px-2"><Search size={12} className="text-slate-400" /><input aria-label="Pesquisar desenhos" value={query} onChange={event => setQuery(event.target.value)} placeholder="Código, produto, molde ou status..." className="w-full text-[10px] outline-none" /></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-[10px]">
              <thead className="bg-[#123B50] text-[9px] uppercase text-white"><tr><th className="p-2">Desenho</th><th className="p-2">Produto / molde</th><th className="p-2">Rev.</th><th className="p-2">Responsável</th><th className="p-2">Status</th><th className="p-2">Arquivo / ação</th></tr></thead>
              <tbody>
                {filtered.map(row => <tr key={row.id} className="border-t border-[#E1EBEF] hover:bg-[#F4FBFD]">
                  <td className="p-2 font-bold">{row.codigo_desenho}</td>
                  <td className="p-2">{row.produto_vinculado}<span className="block text-[9px] text-slate-500">{row.molde_referencia || 'Sem molde informado'}</span></td>
                  <td className="p-2">R{row.numero_revisao}</td>
                  <td className="p-2">{row.responsavel_nome}</td>
                  <td className="p-2"><span className="border border-[#CFE1E7] bg-[#F8FAFC] px-2 py-1 text-[9px] font-bold">{row.status_revisao}</span></td>
                  <td className="p-2"><div className="flex flex-wrap items-center gap-2">
                    {row.url_arquivo_cad && <a href={row.url_arquivo_cad} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#176487] underline"><ExternalLink size={11} /> Abrir CAD</a>}
                    {row.status_revisao === 'EM_REVISAO' && <button type="button" onClick={() => void homologar(row)} disabled={busy || !row.url_arquivo_cad} className="inline-flex h-7 items-center gap-1 border border-[#3A9D78] px-2 text-[9px] font-bold text-[#24734F] disabled:cursor-not-allowed disabled:opacity-40"><ShieldCheck size={11} /> Homologar</button>}
                    {!row.url_arquivo_cad && <span className="text-[9px] text-slate-400">Sem arquivo HTTPS</span>}
                  </div></td>
                </tr>)}
                {!loading && filtered.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-500">Nenhuma revisão de desenho cadastrada para esta empresa.</td></tr>}
                {loading && <tr><td colSpan={6} className="p-6 text-center text-slate-500">Consultando revisões no banco...</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
