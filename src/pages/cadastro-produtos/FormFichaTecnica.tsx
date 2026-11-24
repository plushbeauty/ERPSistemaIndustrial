/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO: 2026-11-24
 * @REVISAO: REV-CADASTRO-PRODUTOS-PADRAO-OURO-20261124-02
 * Ficha técnica com pesquisa de clientes; persiste somente colunas já utilizadas pelo contrato atual.
 */
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Building2, CheckCircle2, Cpu, HelpCircle, Save, Search, Tag, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'
import { erroBancoNaoInstalado, MIGRACAO_CODIGO_PRODUTO } from '../../lib/supabaseRpcStatus'

type C = { id: string; prefixo: string; separador: string | null; modo_numeracao: string; sequencia_atual: number; digitos_produto: number }
type ClienteOption = { id: string; codigo: string | null; nome: string; documento: string | null }
type P = { id: string; codigo: string; nome: string; categoria: string | null; unidade: string; cliente: string | null; molde_codigo: string | null; cavidades: number | null; resina_tipo: string | null; cor_resina: string | null; temp_bico_padrao: number | null; tempo_ciclo_padrao: number | null }

const input = 'h-[30px] w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#2D8DB8] focus:ring-1 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50'
const label = 'grid min-w-0 gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-600'
const readOnly = 'flex h-[30px] min-w-0 items-center justify-between gap-2 rounded-[2px] border border-slate-200 bg-slate-50 px-2 font-mono text-[11px] font-bold text-slate-700'

export default function FormFichaTecnica({ productId, onSaved }: { productId?: string; onSaved: () => void }) {
  const [cfg, setCfg] = useState<C[]>([])
  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [configId, setConfigId] = useState('')
  const [tipo, setTipo] = useState('PA')
  const [p, setP] = useState<P | null>(null)
  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('')
  const [unidade, setUnidade] = useState('UN')
  const [codigoCliente, setCodigoCliente] = useState('')
  const [cliente, setCliente] = useState('')
  const [clienteModal, setClienteModal] = useState(false)
  const [clienteSearch, setClienteSearch] = useState('')
  const [moldeCodigo, setMoldeCodigo] = useState('')
  const [cavidades, setCavidades] = useState(1)
  const [resinaTipo, setResinaTipo] = useState('')
  const [corResina, setCorResina] = useState('')
  const [tempBico, setTempBico] = useState(220)
  const [tempoCiclo, setTempoCiclo] = useState(28)
  const [empresa, setEmpresa] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true); setError('')
      try {
        const auth = await supabase.auth.getUser()
        if (auth.error) throw auth.error
        if (!auth.data.user) throw new Error('Sessão corporativa não autenticada.')
        const profile = await supabase.from('erp_usuarios').select('empresa_id').eq('auth_user_id', auth.data.user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
        if (profile.error) throw profile.error
        const empresaId = profile.data?.empresa_id
        if (!empresaId) throw new Error('Empresa não identificada para o usuário autenticado.')
        const [rules, clients] = await Promise.all([
          supabase.from('erp_codigos').select('id,prefixo,separador,modo_numeracao,sequencia_atual,digitos_produto').eq('empresa_id', empresaId).order('prefixo'),
          fetchAllPages<ClienteOption>((from, to) => supabase.from('erp_clientes').select('id,codigo,nome,documento', { count: 'exact' }).eq('empresa_id', empresaId).eq('ativo', true).order('nome').order('id').range(from, to)),
        ])
        if (rules.error) throw rules.error
        let product: P | null = null
        if (productId) {
          const result = await supabase.from('erp_produtos').select('id,codigo,nome,categoria,unidade,cliente,molde_codigo,cavidades,resina_tipo,cor_resina,temp_bico_padrao,tempo_ciclo_padrao').eq('id', productId).eq('empresa_id', empresaId).maybeSingle()
          if (result.error) throw result.error
          if (!result.data) throw new Error('Produto não encontrado nesta empresa ou sem permissão de acesso.')
          product = result.data as P
        }
        if (cancelled) return
        setEmpresa(empresaId); setCfg((rules.data ?? []) as C[]); setClientes(clients)
        setConfigId(current => (rules.data ?? []).some(item => item.id === current) ? current : ((rules.data ?? [])[0]?.id ?? ''))
        setP(product); setNome(product?.nome ?? ''); setCategoria(product?.categoria ?? ''); setUnidade(product?.unidade ?? 'UN')
        setCliente(product?.cliente ?? '')
        const selected = clients.find(item => item.nome === product?.cliente)
        setCodigoCliente(selected?.codigo ?? '')
        setMoldeCodigo(product?.molde_codigo ?? ''); setCavidades(product?.cavidades ?? 1)
        setResinaTipo(product?.resina_tipo ?? ''); setCorResina(product?.cor_resina ?? '')
        setTempBico(product?.temp_bico_padrao ?? 220); setTempoCiclo(product?.tempo_ciclo_padrao ?? 28)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Falha ao carregar a ficha técnica.')
      } finally { if (!cancelled) setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [productId])

  const currentCfg = cfg.find(item => item.id === configId)
  const digits = Math.max(3, Math.min(6, currentCfg?.digitos_produto || 4))
  const mode = (currentCfg?.modo_numeracao || 'PS').toUpperCase()
  const separator = (currentCfg?.separador || '').trim()
  const base = mode === 'NUM' ? '' : (currentCfg?.prefixo || '').toUpperCase() + (mode === 'PGR' ? separator + tipo : '')
  const sequence = String((currentCfg?.sequencia_atual || 0) + 1).padStart(digits, '0')
  const preview = mode === 'NUM' ? sequence : base + separator + sequence

  const filteredClients = useMemo(() => {
    const term = clienteSearch.trim().toLocaleLowerCase('pt-BR')
    const list = !term ? clientes : clientes.filter(item => `${item.codigo ?? ''} ${item.nome} ${item.documento ?? ''}`.toLocaleLowerCase('pt-BR').includes(term))
    return list.slice(0, 100)
  }, [clientes, clienteSearch])

  const chooseClient = (item: ClienteOption) => {
    setCodigoCliente(item.codigo ?? '')
    setCliente(item.nome)
    setClienteModal(false)
    setClienteSearch('')
  }
  const lookupClient = () => {
    const code = codigoCliente.trim().toLocaleLowerCase('pt-BR')
    if (!code) return
    const documentDigits = code.replace(/\D/g, '')
    const found = clientes.find(item =>
      (item.codigo ?? '').trim().toLocaleLowerCase('pt-BR') === code ||
      (documentDigits.length > 0 && (item.documento ?? '').replace(/\D/g, '') === documentDigits)
    )
    if (found) chooseClient(found)
  }

  const save = async () => {
    setError(''); setOk('')
    if (busy) return
    if (loading) { setError('Aguarde o carregamento dos dados da empresa.'); return }
    if (!empresa || !nome.trim()) { setError('Empresa e Nome do Produto são obrigatórios.'); return }
    if (!unidade.trim()) { setError('Informe a unidade de medida.'); return }
    if (!moldeCodigo.trim()) { setError('Informe o código do molde.'); return }
    if (!Number.isInteger(cavidades) || cavidades < 1) { setError('Cavidades deve ser um inteiro maior que zero.'); return }
    if (!Number.isFinite(tempBico) || tempBico < 0 || !Number.isFinite(tempoCiclo) || tempoCiclo <= 0) { setError('Confira a temperatura e o tempo de ciclo.'); return }
    setBusy(true)
    try {
      let codigo = p?.codigo || ''
      if (!codigo) {
        if (!configId) throw new Error('Cadastre uma regra de numeração em Regras do Código primeiro.')
        const generated = await supabase.rpc('erp_gerar_codigo', { p_config_id: configId, p_grupo_codigo: tipo })
        if (generated.error) throw new Error(erroBancoNaoInstalado(generated.error, 'erp_gerar_codigo', MIGRACAO_CODIGO_PRODUTO) ?? `Não foi possível gerar o SKU: ${generated.error.message}`)
        if (generated.data === null || generated.data === undefined || String(generated.data).trim() === '') throw new Error('A rotina de numeração não retornou um SKU válido.')
        codigo = String(generated.data)
      }
      const values = { nome: nome.trim(), categoria: categoria.trim() || null, unidade: unidade.trim().toUpperCase(), unidade_compra: unidade.trim().toUpperCase(), unidade_venda: unidade.trim().toUpperCase(), cliente: cliente.trim() || null, molde_codigo: moldeCodigo.trim(), cavidades, resina_tipo: resinaTipo.trim() || null, cor_resina: corResina.trim() || null, temp_bico_padrao: tempBico, tempo_ciclo_padrao: tempoCiclo }
      if (p) {
        const result = await supabase.from('erp_produtos').update(values).eq('id', p.id).eq('empresa_id', empresa).select('id').maybeSingle()
        if (result.error) throw result.error
        if (!result.data?.id) throw new Error('Nenhuma ficha foi atualizada. Verifique a empresa e as permissões RLS.')
      } else {
        const result = await supabase.from('erp_produtos').insert({ empresa_id: empresa, codigo, ...values, ativo: true }).select('id').single()
        if (result.error) throw result.error
      }
      setOk(`Produto salvo com SKU ${codigo}.`)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar o produto.')
    } finally { setBusy(false) }
  }

  return (
    <section className="space-y-3" aria-busy={loading || busy}>
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div><p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#2D8DB8]"><Cpu size={12}/> Engenharia de Produto · Dados Mestres</p><h2 className="text-sm font-bold text-slate-900">Ficha Técnica do Produto</h2></div>
        <div className="flex items-center gap-2">
          <Link to="/ajuda/ficha-tecnica" className="inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] font-bold uppercase text-slate-700 hover:bg-slate-50"><HelpCircle size={12}/> Ajuda</Link>
          <button type="button" onClick={() => void save()} disabled={busy || loading} className="inline-flex h-[30px] items-center gap-1.5 rounded-[2px] bg-[#2D8DB8] px-4 text-[10px] font-bold uppercase text-white hover:bg-[#246f91] disabled:opacity-50"><Save size={12}/>{busy ? 'Salvando…' : p ? 'Salvar alterações' : 'Gerar SKU e salvar'}</button>
        </div>
      </header>
      {error && <div role="alert" className="flex items-start gap-2 rounded-[2px] border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-800"><AlertTriangle size={13}/><span>{error}</span></div>}
      {ok && <div role="status" className="flex items-center gap-2 rounded-[2px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-800"><CheckCircle2 size={13}/>{ok}</div>}

      <section className="rounded-[2px] border border-slate-200 bg-white p-3 shadow-sm">
        <header className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2"><Tag size={13} className="text-[#2D8DB8]"/><h3 className="text-[10px] font-bold uppercase tracking-wider text-[#2D8DB8]">1. Identificação do Produto</h3></header>
        <div className="grid grid-cols-1 items-end gap-2.5 md:grid-cols-12">
          <div className="grid min-w-0 gap-1 md:col-span-3"><label className={label}>SKU · Chave Mestre</label><div className={readOnly}><span className="truncate">{p?.codigo || preview}</span><span className="text-[8px] text-slate-400">BANCO</span></div></div>
          <label className={label + ' md:col-span-2'}>Tipo Sigla<select className={input} disabled={!!p || loading} value={tipo} onChange={e => setTipo(e.target.value)}><option value="PA">PA · Acabado</option><option value="MP">MP · Matéria-prima</option><option value="SA">SA · Semi-acabado</option><option value="IN">IN · Compra</option></select></label>
          <label className={label + ' md:col-span-3'}>Regra de Geração<select className={input} disabled={!!p || loading} value={configId} onChange={e => setConfigId(e.target.value)}>{cfg.map(item => <option key={item.id} value={item.id}>{item.prefixo} · {item.digitos_produto} dígitos</option>)}</select></label>
          <label className={label + ' md:col-span-4'}>Categoria / Família<input className={input} maxLength={50} disabled={loading} value={categoria} onChange={e => setCategoria(e.target.value)} placeholder="Ex.: Injetados PP"/></label>
          <label className={label + ' md:col-span-9'}>Nome Descritivo do Produto *<input className={input} maxLength={50} disabled={loading} value={nome} onChange={e => setNome(e.target.value)} placeholder="Descrição técnica do produto" required/></label>
          <label className={label + ' md:col-span-3'}>Unidade de Medida *<input className={input + ' text-center font-mono uppercase'} maxLength={3} disabled={loading} value={unidade} onChange={e => setUnidade(e.target.value.toUpperCase())} placeholder="UN" required/></label>
        </div>
      </section>

      <section className="rounded-[2px] border border-slate-200 bg-white p-3 shadow-sm">
        <header className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2"><Building2 size={13} className="text-[#2D8DB8]"/><h3 className="text-[10px] font-bold uppercase tracking-wider text-[#2D8DB8]">2. Cliente Vinculado</h3></header>
        <div className="grid grid-cols-1 items-end gap-2.5 md:grid-cols-12">
          <div className="grid min-w-0 gap-1 md:col-span-4"><label className={label}>Código do Cliente</label><div className="flex gap-1"><input className={input + ' font-mono'} value={codigoCliente} onChange={e => setCodigoCliente(e.target.value)} onBlur={lookupClient} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); lookupClient() } }} disabled={loading} placeholder="Código cadastrado"/><button type="button" onClick={() => setClienteModal(true)} disabled={loading} aria-label="Pesquisar cliente" title="Pesquisar cliente" className="inline-flex h-[30px] w-[34px] shrink-0 items-center justify-center rounded-[2px] border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"><Search size={13}/></button></div></div>
          <label className={label + ' md:col-span-8'}>Nome / Razão Social<input className={input} value={cliente} onChange={e => setCliente(e.target.value)} disabled={loading} placeholder="Selecione um cliente ou informe o nome"/></label>
        </div>
        <p className="mt-2 text-[9px] text-slate-500">A busca consulta clientes ativos da empresa autenticada. O cadastro do produto mantém o campo de cliente já existente no banco.</p>
      </section>

      <section className="rounded-[2px] border border-slate-200 bg-white p-3 shadow-sm">
        <header className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2"><Cpu size={13} className="text-[#2D8DB8]"/><h3 className="text-[10px] font-bold uppercase tracking-wider text-[#2D8DB8]">3. Parâmetros Técnicos de Injeção</h3></header>
        <div className="grid grid-cols-1 items-end gap-2.5 sm:grid-cols-2 lg:grid-cols-12">
          <label className={label + ' lg:col-span-3'}>Código do Molde *<input className={input + ' font-mono'} maxLength={50} value={moldeCodigo} onChange={e => setMoldeCodigo(e.target.value)} disabled={loading} placeholder="Ex.: M-2026-089" required/></label>
          <label className={label + ' lg:col-span-2'}>Cavidades *<input className={input + ' text-right font-mono'} type="number" min={1} step={1} value={cavidades} onChange={e => setCavidades(Number(e.target.value))} disabled={loading} required/></label>
          <label className={label + ' lg:col-span-3'}>Tipo de Resina<input className={input} maxLength={100} value={resinaTipo} onChange={e => setResinaTipo(e.target.value)} disabled={loading} placeholder="Ex.: PP copolímero"/></label>
          <label className={label + ' lg:col-span-4'}>Cor da Resina<input className={input} maxLength={50} value={corResina} onChange={e => setCorResina(e.target.value)} disabled={loading} placeholder="Ex.: Preto / natural"/></label>
          <label className={label + ' lg:col-span-3'}>Temperatura do Bico (°C)<input className={input + ' text-right font-mono'} type="number" min={0} step={1} value={tempBico} onChange={e => setTempBico(Number(e.target.value))} disabled={loading}/></label>
          <label className={label + ' lg:col-span-3'}>Tempo de Ciclo (s)<input className={input + ' text-right font-mono'} type="number" min={0.01} step={0.01} value={tempoCiclo} onChange={e => setTempoCiclo(Number(e.target.value))} disabled={loading}/></label>
        </div>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-2 rounded-[2px] border border-slate-200 bg-white px-3 py-2"><p className="text-[9px] text-slate-500">{loading ? 'Carregando dados da empresa…' : p ? 'Edição de cadastro existente' : 'Novo cadastro · SKU definitivo gerado pela rotina do banco'}</p><button type="button" onClick={() => void save()} disabled={busy || loading} className="inline-flex h-[30px] items-center gap-1.5 rounded-[2px] bg-[#2D8DB8] px-4 text-[10px] font-bold uppercase text-white hover:bg-[#246f91] disabled:opacity-50"><Save size={12}/>{busy ? 'Salvando…' : p ? 'Salvar alterações' : 'Gerar SKU e salvar'}</button></footer>

      {clienteModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label="Selecionar cliente"><div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2px] border border-slate-300 bg-white shadow-xl"><header className="flex items-center justify-between bg-[#123B50] px-4 py-2.5 text-white"><h3 className="text-[10px] font-bold uppercase tracking-wider">Pesquisar Cliente Cadastrado</h3><button type="button" onClick={() => setClienteModal(false)} aria-label="Fechar pesquisa" className="inline-flex h-7 w-7 items-center justify-center rounded-[2px] text-white hover:bg-white/10"><X size={14}/></button></header><div className="border-b border-slate-200 p-3"><div className="flex h-[30px] items-center gap-2 rounded-[2px] border border-slate-300 px-2"><Search size={13} className="text-slate-400"/><input autoFocus value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} placeholder="Código, razão social ou CPF/CNPJ" className="h-full w-full border-0 text-[11px] outline-none"/></div></div><div className="overflow-auto"><table className="w-full border-collapse text-left text-[10px]"><thead><tr className="bg-slate-100 text-[9px] font-bold uppercase text-slate-600"><th className="h-8 px-3">Código</th><th className="px-3">Nome / Razão Social</th><th className="px-3">Documento</th><th className="px-3 text-right">Ação</th></tr></thead><tbody>{filteredClients.map((item, index) => <tr key={item.id} className={`h-8 border-b border-slate-100 hover:bg-sky-50 ${index % 2 ? 'bg-slate-50/60' : 'bg-white'}`}><td className="px-3 font-mono font-bold text-[#2D8DB8]">{item.codigo || '—'}</td><td className="px-3 font-semibold text-slate-800">{item.nome}</td><td className="px-3 font-mono text-slate-500">{item.documento || '—'}</td><td className="px-3 text-right"><button type="button" onClick={() => chooseClient(item)} className="inline-flex h-7 items-center rounded-[2px] bg-[#2D8DB8] px-2.5 text-[9px] font-bold uppercase text-white hover:bg-[#246f91]">Selecionar</button></td></tr>)}{!filteredClients.length && <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">Nenhum cliente encontrado.</td></tr>}</tbody></table></div></div></div>}
    </section>
  )
}
