import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { Camera, RefreshCw, UserRound } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Props = { funcionarioId: string; nome: string }
const BUCKET = 'rh-privado'
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Erro inesperado ao carregar a foto.'
export default function FotoColaborador({ funcionarioId, nome }: Props) {
  const [path, setPath] = useState<string | null>(null)
  const [signedUrl, setSignedUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const { data, error: queryError } = await supabase.from('erp_funcionarios').select('foto_url').eq('id', funcionarioId).maybeSingle()
      if (queryError) throw queryError
      const storagePath = data?.foto_url ?? null
      setPath(storagePath)
      if (storagePath) {
        const { data: signed, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60)
        if (signedError) throw signedError
        setSignedUrl(signed.signedUrl)
      } else setSignedUrl('')
    } catch (cause) { setError(errorText(cause)) }
    finally { setLoading(false) }
  }, [funcionarioId])

  useEffect(() => { void load() }, [load])

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    setError(''); setNotice('')
    if (!['image/jpeg','image/png'].includes(file.type)) { setError('A foto deve estar em formato JPG ou PNG.'); input.value=''; return }
    if (file.size > 5 * 1024 * 1024) { setError('A foto deve ter no máximo 5 MB.'); input.value=''; return }
    setLoading(true)
    const nextPath = `rh/funcionarios/${funcionarioId}/foto/${crypto.randomUUID()}.${file.type === 'image/png' ? 'png' : 'jpg'}`
    try {
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(nextPath, file, { contentType: file.type, cacheControl: '0', upsert: false })
      if (uploadError) throw uploadError
      const { error: updateError } = await supabase.from('erp_funcionarios').update({ foto_url: nextPath }).eq('id', funcionarioId)
      if (updateError) {
        await supabase.storage.from(BUCKET).remove([nextPath])
        throw updateError
      }
      if (path) await supabase.storage.from(BUCKET).remove([path])
      setNotice('Foto atualizada no armazenamento privado.')
      await load()
    } catch (cause) { setError(errorText(cause)) }
    finally { setLoading(false); input.value='' }
  }

  return <section className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white p-3">
    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
      {signedUrl ? <img src={signedUrl} alt={`Foto de ${nome}`} className="h-full w-full object-cover"/> : <UserRound size={26} className="text-slate-400"/>}
    </div>
    <div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-800">{nome}</p><p className="mt-0.5 text-[10px] text-slate-500">Foto privada · URL assinada válida por 60 segundos · JPG/PNG até 5 MB</p>
      {error && <p role="alert" className="mt-1 text-[11px] text-rose-700">{error}</p>}{notice && <p role="status" className="mt-1 text-[11px] text-emerald-700">{notice}</p>}
    </div>
    <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded border border-slate-300 px-3 text-[10px] font-bold text-slate-700 hover:bg-slate-50">
      {loading ? <RefreshCw size={12} className="animate-spin"/> : <Camera size={12}/>} {loading ? 'Processando…' : 'Alterar foto'}
      <input type="file" className="hidden" accept=".jpg,.jpeg,.png,image/jpeg,image/png" disabled={loading} onChange={event=>void upload(event)}/>
    </label>
    <button type="button" onClick={()=>void load()} disabled={loading} className="inline-flex h-8 items-center gap-1 rounded border border-slate-300 px-2 text-[10px] font-bold text-slate-600"><RefreshCw size={12}/>Atualizar</button>
  </section>
}
