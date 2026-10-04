import { Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type C = { id: string; prefixo: string; digitos_produto: number }
type P = { id: string; codigo: string; nome: string; categoria: string | null; unidade: string; cliente: string | null }

export default function FormFichaTecnica({ productId, onSaved }: { productId?: string; onSaved: () => void }) {
  const [cfg, setCfg] = useState<C[]>([])
  const [configId, setConfigId] = useState('')
  const [tipo, setTipo] = useState('PA')
  const [p, setP] = useState<P | null>(null)
  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('')
  const [unidade, setUnidade] = useState('UN')
  const [cliente, setCliente] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  useEffect(() => {
    void (async () => {
      const u = await supabase.auth.getUser()
      if (!u.data.user) { setError('Sessão não autenticada.'); return }
      const r = await supabase.from('erp_usuarios').select('empresa_id').eq('auth_user_id', u.data.user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
      if (r.error || !r.data?.empresa_id) { setError(r.error?.message || 'Empresa não identificada.'); return }
      setEmpresa(r.data.empresa_id)
      const c = await supabase.from('erp_codigos').select('id,prefixo,digitos_produto').eq('empresa_id', r.data.empresa_id)
      if (c.error) setError(c.error.message)
      else { setCfg((c.data ?? []) as C[]); if (c.data?.[0]) setConfigId(c.data[0].id) }
      if (productId) {
        const x = await supabase.from('erp_produtos').select('id,codigo,nome,categoria,unidade,cliente').eq('id', productId).eq('empresa_id', r.data.empresa_id).maybeSingle()
        if (x.data) { const z = x.data as P; setP(z); setNome(z.nome); setCategoria(z.categoria || ''); setUnidade(z.unidade); setCliente(z.cliente || '') }
      } else {
        setP(null); setNome(''); setCategoria(''); setCliente('')
      }
    })()
  }, [productId])

  const c = cfg.find(x => x.id === configId)
  const preview = (c?.prefixo || 'PL') + tipo + '0'.repeat(Math.max(3, Math.min(6, c?.digitos_produto || 3)))

  const save = async () => {
    setError('')
    setOk('')
    if (!empresa || !nome.trim()) { setError('Empresa e nome do produto são obrigatórios.'); return }
    let codigo = p?.codigo || ''
    if (!codigo) {
      if (!configId) { setError('Cadastre uma regra em Regras do Código.'); return }
      const r = await supabase.rpc('erp_gerar_codigo_produto', { p_config_id: configId, p_tipo_sigla: tipo })
      if (r.error) { setError(r.error.message); return }
      codigo = String(r.data)
    }
    const r = p
      ? await supabase.from('erp_produtos').update({ nome: nome.trim(), categoria: categoria || null, unidade, unidade_compra: unidade, unidade_venda: unidade, cliente: cliente || null }).eq('id', p.id).eq('empresa_id', empresa)
      : await supabase.from('erp_produtos').insert({ empresa_id: empresa, codigo, nome: nome.trim(), categoria: categoria || null, unidade, unidade_compra: unidade, unidade_venda: unidade, cliente: cliente || null, ativo: true }).select('id,codigo,nome,categoria,unidade,cliente').single()
    if (r.error) { setError(r.error.message); return }
    setOk('Produto salvo no banco com SKU ' + codigo + '.')
    onSaved()
  }

  const field = 'min-h-[46px] rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

  return (
    <section className="space-y-5">
      <div><p className="text-xs font-black tracking-[.2em] text-blue-700">DADOS MESTRES</p><h2 className="text-2xl font-black text-slate-900">Ficha Técnica</h2><p className="text-sm font-semibold text-slate-500">Cadastro persistido no tenant autenticado.</p></div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-xs font-black text-slate-700 md:col-span-2">SKU — SOMENTE LEITURA<input className={field+' font-black text-blue-800'} readOnly value={p?.codigo || preview} /></label>
          <label className="grid gap-2 text-xs font-black text-slate-700">Tipo<select className={field} disabled={!!p} value={tipo} onChange={e => setTipo(e.target.value)}><option>MP</option><option>PA</option><option>SA</option><option>IN</option></select></label>
          <label className="grid gap-2 text-xs font-black text-slate-700">Regra<select className={field} disabled={!!p} value={configId} onChange={e => setConfigId(e.target.value)}>{cfg.map(x => <option key={x.id} value={x.id}>{x.prefixo} · {x.digitos_produto} dígitos</option>)}</select></label>
          <label className="grid gap-2 text-xs font-black text-slate-700 md:col-span-2">Nome do produto<input className={field} value={nome} onChange={e => setNome(e.target.value)} /></label>
          <label className="grid gap-2 text-xs font-black text-slate-700">Categoria<input className={field} value={categoria} onChange={e => setCategoria(e.target.value)} /></label>
          <label className="grid gap-2 text-xs font-black text-slate-700">Unidade<input className={field} value={unidade} onChange={e => setUnidade(e.target.value.toUpperCase())} /></label>
          <label className="grid gap-2 text-xs font-black text-slate-700 md:col-span-2">Cliente / Mercado de destino<input className={field} value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Cliente, linha ou mercado" /></label>
        </div>
        <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-200 pt-5">
          <button type="button" onClick={() => void save()} className="inline-flex min-h-[50px] items-center gap-2 rounded-xl bg-blue-700 px-5 font-black text-white shadow-md hover:bg-blue-800"><Save size={18} /> {p ? 'SALVAR ALTERAÇÕES' : 'GERAR SKU E SALVAR'}</button>
          {error && <p className="flex items-center rounded-xl border border-rose-200 bg-rose-50 px-4 font-bold text-rose-800">{error}</p>}
          {ok && <p className="flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 font-bold text-emerald-800">{ok}</p>}
        </div>
      </div>
    </section>
  )
}
