import { Plus, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type C = { id: string; prefixo: string; separador: string; modo_numeracao: string; sequencia_atual: number; digitos_produto: number }

export default function ParametrosCodigo() {
  const [c, setC] = useState<C[]>([])
  const [empresa, setEmpresa] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const load = async () => {
    const u = await supabase.auth.getUser()
    if (!u.data.user) throw new Error('Sessão não autenticada.')
    const p = await supabase.from('erp_usuarios').select('empresa_id').eq('auth_user_id', u.data.user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
    if (p.error) throw p.error
    if (!p.data?.empresa_id) throw new Error('Empresa não identificada.')
    setEmpresa(p.data.empresa_id)
    const r = await supabase.from('erp_codigos').select('id,prefixo,separador,modo_numeracao,sequencia_atual,digitos_produto').eq('empresa_id', p.data.empresa_id).order('prefixo')
    if (r.error) throw r.error
    setC((r.data ?? []) as C[])
  }

  useEffect(() => { void load().catch(e => setError(e instanceof Error ? e.message : 'Falha ao carregar.')) }, [])

  const upd = (id: string, k: keyof C, v: string | number) => setC(a => a.map(x => x.id === id ? { ...x, [k]: v } : x))
  const save = async (x: C) => {
    const r = await supabase.from('erp_codigos').update({ prefixo: x.prefixo.toUpperCase(), separador: x.separador, modo_numeracao: x.modo_numeracao, digitos_produto: x.digitos_produto }).eq('id', x.id).eq('empresa_id', empresa)
    if (r.error) setError(r.error.message); else setOk('Regra salva no banco.')
  }
  const add = async () => {
    setError(''); setOk('')
    const r = await supabase.from('erp_codigos').insert({ empresa_id: empresa, prefixo: 'PL', separador: '', modo_numeracao: 'PS', sequencia_atual: 0, digitos_produto: 3 }).select('id,prefixo,separador,modo_numeracao,sequencia_atual,digitos_produto').single()
    if (r.error) setError(r.error.message); else setC(a => [...a, r.data as C])
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto"><p className="text-xs font-black tracking-[.2em] text-blue-700">GOVERNANÇA DO SKU</p><h2 className="text-2xl font-black text-slate-900">Regras do Código</h2><p className="text-sm font-semibold text-slate-500">Parâmetros reais da numeração da empresa.</p></div>
        <button type="button" onClick={() => void add()} className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-black text-white shadow-md hover:bg-blue-800"><Plus size={18} /> CRIAR REGRA PL</button>
      </div>
      {(error || ok) && <p className={error ? 'rounded-xl border border-rose-200 bg-rose-50 p-3 font-bold text-rose-800' : 'rounded-xl border border-emerald-200 bg-emerald-50 p-3 font-bold text-emerald-800'}>{error || ok}</p>}
      {c.map(x => <article key={x.id} className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl md:grid-cols-5">
        <label className="grid gap-2 text-xs font-black text-slate-700">Prefixo<input className="min-h-[46px] rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-900" value={x.prefixo} onChange={e => upd(x.id, 'prefixo', e.target.value)} /></label>
        <label className="grid gap-2 text-xs font-black text-slate-700">Separador<input className="min-h-[46px] rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-900" value={x.separador} onChange={e => upd(x.id, 'separador', e.target.value)} /></label>
        <label className="grid gap-2 text-xs font-black text-slate-700">Modo<select className="min-h-[46px] rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-900" value={x.modo_numeracao} onChange={e => upd(x.id, 'modo_numeracao', e.target.value)}><option>PS</option><option>PGR</option><option>NUM</option></select></label>
        <label className="grid gap-2 text-xs font-black text-slate-700">Dígitos<input className="min-h-[46px] rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-900" type="number" min={3} max={6} value={x.digitos_produto} onChange={e => upd(x.id, 'digitos_produto', Math.max(3, Math.min(6, Number(e.target.value) || 3)))} /></label>
        <button type="button" onClick={() => void save(x)} className="self-end rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white hover:bg-blue-800"><Save size={18} className="mr-2 inline" /> SALVAR</button>
      </article>)}
      {!c.length && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center font-black text-slate-700 shadow-xl">Nenhuma regra cadastrada. Use “Criar regra PL” para habilitar a geração.</div>}
    </section>
  )
}
