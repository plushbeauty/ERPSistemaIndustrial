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

  const field = 'h-[30px] w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-900 outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20 disabled:bg-slate-50'

  return (
    <section className="space-y-3">
      <div><p className="text-[9px] font-bold uppercase tracking-wider text-[#2D8DB8]">Dados mestres</p><h2 className="text-base font-bold text-slate-900">Ficha Técnica</h2><p className="text-[10px] text-slate-500">Cadastro persistido no tenant autenticado.</p></div>
      <div className="rounded-[2px] border border-slate-300 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-1 items-end gap-x-3 gap-y-2 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-700 md:col-span-2">SKU — SOMENTE LEITURA<input className={field+' font-bold text-[#123B50]'} readOnly value={p?.codigo || preview} /></label>
          <label className="grid gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-700">Tipo<select className={field} disabled={!!p} value={tipo} onChange={e => setTipo(e.target.value)}><option>MP</option><option>PA</option><option>SA</option><option>IN</option></select></label>
          <label className="grid gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-700">Regra<select className={field} disabled={!!p} value={configId} onChange={e => setConfigId(e.target.value)}>{cfg.map(x => <option key={x.id} value={x.id}>{x.prefixo} · {x.digitos_produto} dígitos</option>)}</select></label>
          <label className="grid gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-700 md:col-span-2">Nome do produto<input maxLength={50} className={field} value={nome} onChange={e => setNome(e.target.value)} /></label>
          <label className="grid gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-700">Categoria<input maxLength={50} className={field} value={categoria} onChange={e => setCategoria(e.target.value)} /></label>
          <label className="grid gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-700">Unidade<input maxLength={3} className={field} value={unidade} onChange={e => setUnidade(e.target.value.toUpperCase())} /></label>
          <label className="grid gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-700 md:col-span-2">Cliente / Mercado de destino<input maxLength={50} className={field} value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Cliente, linha ou mercado" /></label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
          <button type="button" onClick={() => void save()} className="inline-flex h-[30px] items-center gap-2 rounded-[2px] bg-[#2D8DB8] px-3 text-[10px] font-bold text-white hover:bg-[#23769b]"><Save size={13} /> {p ? 'SALVAR ALTERAÇÕES' : 'GERAR SKU E SALVAR'}</button>
          {error && <p className="flex items-center rounded-[2px] border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-semibold text-rose-800">{error}</p>}
          {ok && <p className="flex items-center rounded-[2px] border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-800">{ok}</p>}
        </div>
      </div>
    </section>
  )
}
