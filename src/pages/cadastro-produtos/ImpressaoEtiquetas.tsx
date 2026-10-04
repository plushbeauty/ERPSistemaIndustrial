import { Copy, Download } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type P = { id: string; codigo: string; nome: string }

export default function ImpressaoEtiquetas() {
  const [p, setP] = useState<P[]>([])
  const [id, setId] = useState('')
  const [n, setN] = useState(1)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    void (async () => {
      const u = await supabase.auth.getUser()
      if (!u.data.user) return
      const x = await supabase.from('erp_usuarios').select('empresa_id').eq('auth_user_id', u.data.user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
      if (!x.data?.empresa_id) return
      const r = await supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', x.data.empresa_id).eq('ativo', true).order('codigo')
      setP((r.data ?? []) as P[])
    })()
  }, [])

  const product = p.find(a => a.id === id)
  const z = useMemo(() => product ? Array.from({ length: n }, () => ['^XA', '^CI28', '^FO30,30^A0N,30,30^FDPLASTIBOR INDUSTRIAL^FS', '^FO30,70^A0N,28,28^FDSKU: ' + product.codigo + '^FS', '^FO30,115^BY2,3,55^BCN,55,Y,N,N^FD' + product.codigo + '^FS', '^XZ'].join('\n')).join('\n') : '', [product, n])

  const copy = async () => { if (!z) return; await navigator.clipboard.writeText(z); setMsg('ZPL copiado; nenhuma impressora foi acionada.') }
  const download = () => { if (!z) return; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([z], { type: 'text/plain' })); a.download = 'etiqueta-' + (product?.codigo || 'produto') + '.zpl'; a.click(); setMsg('ZPL gerado para envio pela ponte de impressão.') }

  return (
    <section className="space-y-5">
      <div><p className="text-xs font-black tracking-[.2em] text-blue-700">IDENTIFICAÇÃO</p><h2 className="text-2xl font-black text-slate-900">Código de Barras</h2><p className="text-sm font-semibold text-slate-500">Geração ZPL real para a ponte de impressão.</p></div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-xs font-black text-slate-700">Produto<select className="min-h-[46px] rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-900" value={id} onChange={e => setId(e.target.value)}><option value="">Selecione…</option>{p.map(x => <option key={x.id} value={x.id}>{x.codigo} · {x.nome}</option>)}</select></label>
          <label className="grid gap-2 text-xs font-black text-slate-700">Quantidade<input className="min-h-[46px] rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-900" type="number" min={1} max={100} value={n} onChange={e => setN(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} /></label>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" disabled={!z} onClick={() => void copy()} className="inline-flex min-h-[50px] items-center gap-2 rounded-xl bg-blue-700 px-5 font-black text-white shadow-md hover:bg-blue-800 disabled:opacity-50"><Copy size={18} /> COPIAR ZPL</button>
          <button type="button" disabled={!z} onClick={download} className="inline-flex min-h-[50px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 font-black text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"><Download size={18} /> BAIXAR ZPL</button>
        </div>
        {msg && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 font-bold text-emerald-800">{msg}</p>}
        <pre className="mt-5 max-h-96 overflow-auto rounded-2xl bg-slate-950 p-5 text-xs text-cyan-100">{z || 'Selecione um produto para gerar o ZPL.'}</pre>
      </div>
    </section>
  )
}
