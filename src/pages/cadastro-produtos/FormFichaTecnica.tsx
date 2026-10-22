/**
 * @DATA_REVISAO_APROVACAO: 2026-10-21
 * @REVISAO: REV-PRODUTO-UI-009 — controles compactos no padrão claro PCP
 * @STATUS_APROVACAO: REVISÃO VISUAL AUTORIZADA EM 2026-10-21
 * ESCOPO: Ficha técnica do cadastro mestre; persistência real no Supabase e isolamento por empresa.
 */
import { useEffect, useState } from 'react'
import { AlertTriangle, Building2, CheckCircle2, Cpu, HelpCircle, Save, Tag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

type C = { id: string; prefixo: string; digitos_produto: number }
type P = { id: string; codigo: string; nome: string; categoria: string | null; unidade: string; cliente: string | null; molde_codigo: string | null; cavidades: number | null; resina_tipo: string | null; cor_resina: string | null; temp_bico_padrao: number | null; tempo_ciclo_padrao: number | null }

const baseInput = 'h-[30px] w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-600 focus:ring-1 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50'
const labelClass = 'grid min-w-0 gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500'
const readOnlyInput = 'flex h-[30px] min-w-0 items-center justify-between gap-2 rounded-[2px] border border-slate-200 bg-slate-50 px-2 font-mono text-[11px] font-black text-slate-600 shadow-inner'

export default function FormFichaTecnica({ productId, onSaved }: { productId?: string; onSaved: () => void }) {
  const [cfg, setCfg] = useState<C[]>([])
  const [configId, setConfigId] = useState('')
  const [tipo, setTipo] = useState('PA')
  const [p, setP] = useState<P | null>(null)
  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('')
  const [unidade, setUnidade] = useState('UN')
  const [cliente, setCliente] = useState('')
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
      setLoading(true)
      setError('')
      try {
        const u = await supabase.auth.getUser()
        if (u.error) throw u.error
        if (!u.data.user) throw new Error('Sessão corporativa não autenticada.')
        const r = await supabase.from('erp_usuarios').select('empresa_id').eq('auth_user_id', u.data.user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
        if (r.error) throw r.error
        if (!r.data?.empresa_id) throw new Error('Empresa não identificada para o usuário autenticado.')
        const empresaId = r.data.empresa_id
        const c = await supabase.from('erp_codigos').select('id,prefixo,digitos_produto').eq('empresa_id', empresaId).order('prefixo')
        if (c.error) throw c.error
        let product: P | null = null
        if (productId) {
          const x = await supabase.from('erp_produtos').select('id,codigo,nome,categoria,unidade,cliente,molde_codigo,cavidades,resina_tipo,cor_resina,temp_bico_padrao,tempo_ciclo_padrao').eq('id', productId).eq('empresa_id', empresaId).maybeSingle()
          if (x.error) throw x.error
          if (!x.data) throw new Error('Produto não encontrado nesta empresa ou sem permissão de acesso.')
          product = x.data as P
        }
        if (cancelled) return
        setEmpresa(empresaId)
        const configs = (c.data ?? []) as C[]
        setCfg(configs)
        setConfigId(current => configs.some(item => item.id === current) ? current : (configs[0]?.id ?? ''))
        setP(product)
        setNome(product?.nome ?? '')
        setCategoria(product?.categoria ?? '')
        setUnidade(product?.unidade ?? 'UN')
        setCliente(product?.cliente ?? '')
        setMoldeCodigo(product?.molde_codigo ?? '')
        setCavidades(product?.cavidades ?? 1)
        setResinaTipo(product?.resina_tipo ?? '')
        setCorResina(product?.cor_resina ?? '')
        setTempBico(product?.temp_bico_padrao ?? 220)
        setTempoCiclo(product?.tempo_ciclo_padrao ?? 28)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Falha ao carregar a ficha técnica.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [productId])

  const currentCfg = cfg.find(x => x.id === configId)
  const digits = Math.max(3, Math.min(6, currentCfg?.digitos_produto || 3))
  const preview = (currentCfg?.prefixo || 'PL') + tipo + '0'.repeat(digits)

  const save = async () => {
    setError('')
    setOk('')
    if (busy) return
    if (loading) { setError('Aguarde o carregamento dos dados da empresa.'); return }
    if (!empresa || !nome.trim()) { setError('Empresa e Nome do Produto são obrigatórios.'); return }
    if (!unidade.trim()) { setError('Informe a unidade de medida.'); return }
    if (!moldeCodigo.trim()) { setError('Informe o código do molde.'); return }
    if (!Number.isInteger(cavidades) || cavidades < 1) { setError('Cavidades deve ser um inteiro maior que zero.'); return }
    if (!Number.isFinite(tempBico) || tempBico < 0 || !Number.isFinite(tempoCiclo) || tempoCiclo <= 0) { setError('Confira a temperatura do bico e o tempo de ciclo.'); return }
    setBusy(true)
    try {
      let codigo = p?.codigo || ''
      if (!codigo) {
        if (!configId) throw new Error('Cadastre uma regra de numeração em Regras do Código primeiro.')
        const r = await supabase.rpc('erp_gerar_codigo_produto', { p_config_id: configId, p_tipo_sigla: tipo })
        if (r.error) throw r.error
        if (r.data === null || r.data === undefined || String(r.data).trim() === '') throw new Error('A rotina de numeração não retornou um SKU válido.')
        codigo = String(r.data)
      }
      const values = { nome: nome.trim(), categoria: categoria.trim() || null, unidade: unidade.trim().toUpperCase(), unidade_compra: unidade.trim().toUpperCase(), unidade_venda: unidade.trim().toUpperCase(), cliente: cliente.trim() || null, molde_codigo: moldeCodigo.trim(), cavidades, resina_tipo: resinaTipo.trim() || null, cor_resina: corResina.trim() || null, temp_bico_padrao: tempBico, tempo_ciclo_padrao: tempoCiclo }
      if (p) {
        const r = await supabase.from('erp_produtos').update(values).eq('id', p.id).eq('empresa_id', empresa).select('id').maybeSingle()
        if (r.error) throw r.error
        if (!r.data?.id) throw new Error('Nenhuma ficha foi atualizada. Verifique a empresa e as permissões RLS.')
      } else {
        const r = await supabase.from('erp_produtos').insert({ empresa_id: empresa, codigo, ...values, ativo: true }).select('id,codigo,nome,categoria,unidade,cliente,molde_codigo,cavidades,resina_tipo,cor_resina,temp_bico_padrao,tempo_ciclo_padrao').single()
        if (r.error) throw r.error
        setP(r.data as P)
      }
      setOk('Produto salvo no banco de dados com o SKU ' + codigo + '.')
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar o produto.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3" aria-busy={loading || busy}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div>
          <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-sky-700"><Cpu size={12} /> Engenharia de Produto · Dados Mestres</p>
          <h2 className="text-sm font-black uppercase tracking-tight text-slate-900">Ficha Técnica do Item</h2>
          <p className="mt-0.5 text-[10px] text-slate-500">Cadastro persistido no tenant autenticado.</p>
        </div>
        <Link to="/ajuda/ficha-tecnica" className="inline-flex h-8 items-center gap-1.5 rounded border border-slate-300 bg-white px-3 text-[10px] font-bold uppercase text-slate-700 hover:bg-slate-50"><HelpCircle size={13} /> POP / Ajuda</Link>
      </header>

      {error && <div role="alert" className="flex items-start gap-1.5 rounded border border-rose-200 bg-rose-50 p-2 text-[10px] font-bold text-rose-800"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> <span>{error}</span></div>}
      {ok && <div role="status" className="flex items-start gap-1.5 rounded border border-emerald-200 bg-emerald-50 p-2 text-[10px] font-bold text-emerald-800"><CheckCircle2 size={13} className="mt-0.5 shrink-0" /> <span>{ok}</span></div>}

      <div className="grid grid-cols-1 items-end gap-x-3 gap-y-2.5 rounded-[2px] border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-12">
        <div className="grid min-w-0 gap-1 md:col-span-4">
          <label className={labelClass}><span className="flex items-center gap-1"><Tag size={10} /> SKU Gerado · Chave Mestre</span></label>
          <div className={readOnlyInput} aria-label="SKU somente leitura"><span className="truncate">{p?.codigo || preview}</span><span className="shrink-0 text-[8px] tracking-wide text-slate-400">TRAVADO</span></div>
        </div>
        <label className={labelClass + ' md:col-span-2'}>Tipo Sigla
          <select className={baseInput} disabled={!!p || loading} value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="PA">PA · Acabado</option><option value="MP">MP · Matéria-prima</option><option value="SA">SA · Semi-acabado</option><option value="IN">IN · Compra</option>
          </select>
        </label>
        <label className={labelClass + ' md:col-span-3'}>Regra de Geração
          <select className={baseInput} disabled={!!p || loading} value={configId} onChange={e => setConfigId(e.target.value)}>
            {cfg.map(x => <option key={x.id} value={x.id}>{x.prefixo} · {x.digitos_produto} dígitos</option>)}
          </select>
        </label>
        <label className={labelClass + ' md:col-span-3'}>Categoria / Família
          <input maxLength={50} className={baseInput} disabled={loading} value={categoria} onChange={e => setCategoria(e.target.value)} placeholder="Ex.: Injetados PP" />
        </label>
        <label className={labelClass + ' md:col-span-6'}>Nome Descritivo do Produto *
          <input maxLength={50} className={baseInput} disabled={loading} value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do produto" required />
        </label>
        <label className={labelClass + ' md:col-span-2'}>U.M. Estoque
          <input maxLength={3} className={baseInput + ' text-center font-mono uppercase'} disabled={loading} value={unidade} onChange={e => setUnidade(e.target.value.toUpperCase())} placeholder="UN" required />
        </label>
        <label className={labelClass + ' md:col-span-4'}><span className="flex items-center gap-1"><Building2 size={10} /> Mercado / Cliente</span>
          <input maxLength={50} className={baseInput} disabled={loading} value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Cliente ou mercado de destino" />
        </label>
      </div>

      <section className="space-y-3 rounded border border-sky-200 bg-sky-50/50 p-3 shadow-sm">
        <header className="flex items-center gap-2 border-b border-sky-100 pb-2">
          <Cpu size={14} className="text-sky-700" />
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-800">Parâmetros técnicos de injeção</h3>
            <p className="text-[9px] text-slate-500">Dados-base de engenharia associados ao produto.</p>
          </div>
        </header>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
          <label className={labelClass + ' lg:col-span-3'}>Código do molde *
            <input className={baseInput} maxLength={50} value={moldeCodigo} onChange={e => setMoldeCodigo(e.target.value)} disabled={loading} placeholder="Ex.: M-2026-089" required />
          </label>
          <label className={labelClass + ' lg:col-span-2'}>Cavidades *
            <input className={baseInput} type="number" min={1} step={1} value={cavidades} onChange={e => setCavidades(Number(e.target.value))} disabled={loading} required />
          </label>
          <label className={labelClass + ' lg:col-span-3'}>Tipo de resina
            <input className={baseInput} maxLength={100} value={resinaTipo} onChange={e => setResinaTipo(e.target.value)} disabled={loading} placeholder="Ex.: PP copolímero" />
          </label>
          <label className={labelClass + ' lg:col-span-4'}>Cor da resina
            <input className={baseInput} maxLength={50} value={corResina} onChange={e => setCorResina(e.target.value)} disabled={loading} placeholder="Ex.: Preto / natural" />
          </label>
          <label className={labelClass + ' lg:col-span-3'}>Temperatura base do bico (°C)
            <input className={baseInput} type="number" min={0} step={1} value={tempBico} onChange={e => setTempBico(Number(e.target.value))} disabled={loading} required />
          </label>
          <label className={labelClass + ' lg:col-span-3'}>Tempo de ciclo base (s)
            <input className={baseInput} type="number" min={0.01} step={0.01} value={tempoCiclo} onChange={e => setTempoCiclo(Number(e.target.value))} disabled={loading} required />
          </label>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
        <p className="text-[9px] text-slate-500">{loading ? 'Carregando dados da empresa…' : p ? 'Edição de cadastro existente' : 'Novo cadastro · SKU gerado pela rotina do banco'}</p>
        <button type="button" onClick={() => void save()} disabled={busy || loading} className="inline-flex h-[30px] items-center gap-1.5 rounded-[2px] bg-[#2D8DB8] px-4 text-[10px] font-black uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-[#246f91] disabled:cursor-not-allowed disabled:opacity-50">
          <Save size={12} /> {busy ? 'SALVANDO…' : p ? 'SALVAR ALTERAÇÕES' : 'GERAR SKU E SALVAR'}
        </button>
      </footer>
    </section>
  )
}
