import { useEffect, useState } from 'react'
import { Camera, ImagePlus, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Mold = {
  id: string
  codigo: string
  nome: string
  status: string
  produto_id: string | null
  numero_cavidades: number
  cavidades_ativas: number
}
type Photo = {
  id: string
  nome_arquivo: string
  storage_path: string
  mime_type: string | null
  tamanho_bytes: number | null
  url: string
}
const maxPhotoBytes = 15 * 1024 * 1024

export default function PCPMoldPhotoPanel({ productId }: { productId?: string }) {
  const [company, setCompany] = useState('')
  const [molds, setMolds] = useState<Mold[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [moldQuery, setMoldQuery] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadMolds() {
    setError('')
    const tenant = await supabase.rpc('erp_current_empresa_id')
    if (tenant.error || typeof tenant.data !== 'string' || !tenant.data) {
      throw tenant.error ?? new Error('Empresa da sessão não identificada.')
    }
    setCompany(tenant.data)
    const result = await supabase
      .from('erp_moldes')
      .select('id,codigo,nome,status,produto_id,numero_cavidades,cavidades_ativas')
      .eq('empresa_id', tenant.data)
      .eq('ativo', true)
      .order('codigo')
      .limit(2000)
    if (result.error) throw result.error
    const next = (result.data ?? []) as Mold[]
    setMolds(next)
    setSelectedId(current => next.some(m => m.id === current) ? current : (next.find(m => productId && m.produto_id === productId)?.id ?? next[0]?.id ?? ''))
  }

  async function loadPhotos(moldId: string) {
    setPhotos([])
    if (!company || !moldId) return
    const result = await supabase
      .from('erp_documentos_anexos')
      .select('id,nome_arquivo,storage_path,mime_type,tamanho_bytes')
      .eq('empresa_id', company)
      .eq('entidade_tipo', 'molde')
      .eq('entidade_id', moldId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (result.error) throw result.error
    const rows = result.data ?? []
    const withUrls = await Promise.all(rows.map(async row => {
      const signed = await supabase.storage.from('documentos-erp').createSignedUrl(String(row.storage_path), 300)
      return {
        id: String(row.id),
        nome_arquivo: String(row.nome_arquivo),
        storage_path: String(row.storage_path),
        mime_type: row.mime_type ? String(row.mime_type) : null,
        tamanho_bytes: row.tamanho_bytes == null ? null : Number(row.tamanho_bytes),
        url: signed.error ? '' : (signed.data?.signedUrl ?? ''),
      } satisfies Photo
    }))
    setPhotos(withUrls.filter(photo => photo.url && (photo.mime_type ?? '').startsWith('image/')))
  }

  useEffect(() => {
    let active = true
    void loadMolds().catch(e => { if (active) setError(e instanceof Error ? e.message : 'Não foi possível carregar os moldes.') })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    void loadPhotos(selectedId).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Não foi possível carregar as fotos do molde.') })
    return () => { active = false }
  }, [selectedId, company])

  async function uploadPhoto(file?: File) {
    if (!file || !selectedId || !company) return
    setError('')
    setNotice('')
    if (!file.type.startsWith('image/')) { setError('Selecione um arquivo de imagem.'); return }
    if (file.size > maxPhotoBytes) { setError('A foto excede o limite de 15 MB.'); return }
    setBusy(true)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_')
    const storagePath = company + '/pcp-moldes/' + selectedId + '/' + crypto.randomUUID() + '-' + safeName
    try {
      const uploaded = await supabase.storage.from('documentos-erp').upload(storagePath, file, { upsert: false, contentType: file.type })
      if (uploaded.error) throw uploaded.error
      const inserted = await supabase.from('erp_documentos_anexos').insert({
        empresa_id: company,
        entidade_tipo: 'molde',
        entidade_id: selectedId,
        nome_arquivo: file.name,
        storage_path: storagePath,
        mime_type: file.type,
        tamanho_bytes: file.size,
      })
      if (inserted.error) {
        await supabase.storage.from('documentos-erp').remove([storagePath])
        throw inserted.error
      }
      setNotice('Foto do molde salva e vinculada ao cadastro do ferramental.')
      await loadPhotos(selectedId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar a foto do molde.')
    } finally {
      setBusy(false)
    }
  }

  const selected = molds.find(m => m.id === selectedId)
  const productMolds = [...molds].sort((a, b) => Number(b.produto_id === productId) - Number(a.produto_id === productId)).filter(m => !moldQuery || (m.codigo + ' ' + m.nome).toLocaleLowerCase().includes(moldQuery.toLocaleLowerCase()))

  return (
    <section className="mt-3 border border-slate-200 bg-white p-3">
      <header className="mb-3 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <span className="grid h-7 w-7 place-items-center bg-[#123B50] text-white"><Camera size={14} /></span>
        <div>
          <h2 className="text-[11px] font-bold uppercase">Fotos do molde · localização visual na fábrica</h2>
          <p className="text-[9px] text-slate-500">Identifique o número do molde antes do setup e consulte imagens para inspeção visual.</p>
        </div>
        <button type="button" className="ml-auto flex h-[30px] items-center gap-1 border border-slate-300 px-2 text-[10px] font-semibold" disabled={busy} onClick={() => { setBusy(true); void loadMolds().then(() => selectedId ? loadPhotos(selectedId) : undefined).catch(e => setError(e instanceof Error ? e.message : 'Falha ao atualizar.')).finally(() => setBusy(false)) }}><RefreshCw size={12} /> Atualizar</button>
      </header>
      {error && <p role="alert" className="mb-2 border border-rose-300 bg-rose-50 p-2 text-[10px] text-rose-800">{error}</p>}
      {notice && <p role="status" className="mb-2 border border-emerald-300 bg-emerald-50 p-2 text-[10px] text-emerald-800">{notice}</p>}
      <div className="grid gap-3 md:grid-cols-[minmax(240px,360px)_minmax(0,1fr)]">
        <div>
          <label className="block">
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider">Buscar número / código do molde</span>
            <input className="mb-1 h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[10px]" value={moldQuery} onChange={e => setMoldQuery(e.target.value)} placeholder="Digite o código ou descrição do molde"/>
            <select className="h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[10px]" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              <option value="">Selecione um molde cadastrado ({productMolds.length} encontrados)</option>
              {productMolds.map(m => <option key={m.id} value={m.id}>{m.codigo} · {m.nome}</option>)}
            </select>
          </label>
          {selected && <div className="mt-2 border border-slate-200 bg-slate-50 p-2 text-[10px]">
            <p><strong>Código:</strong> {selected.codigo}</p>
            <p><strong>Descrição:</strong> {selected.nome}</p>
            <p><strong>Situação:</strong> {selected.status}</p>
            <p><strong>Cavidades:</strong> {selected.cavidades_ativas} ativas / {selected.numero_cavidades} totais</p>
          </div>}
          <label className="mt-2 flex min-h-[34px] cursor-pointer items-center justify-center gap-2 border border-[#2D8DB8] bg-[#F4FBFD] px-2 text-[10px] font-bold text-[#123B50]">
            <ImagePlus size={14} /> {busy ? 'Enviando foto…' : 'Adicionar foto do molde'}
            <input className="sr-only" type="file" accept="image/*" disabled={busy || !selectedId} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; void uploadPhoto(file) }} />
          </label>
          <p className="mt-1 text-[9px] text-slate-500">Imagens são salvas no Storage privado da empresa, com vínculo ao ID do molde. Limite: 15 MB por imagem.</p>
        </div>
        <div className="min-w-0">
          {photos.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map(photo => <figure key={photo.id} className="overflow-hidden border border-slate-200 bg-white">
              <a href={photo.url} target="_blank" rel="noreferrer" className="block h-[145px] bg-slate-100">
                <img src={photo.url} alt={'Foto do molde ' + (selected?.codigo ?? '') + ': ' + photo.nome_arquivo} className="h-full w-full object-contain" loading="lazy" />
              </a>
              <figcaption className="truncate px-2 py-1 text-[9px] text-slate-600" title={photo.nome_arquivo}>{photo.nome_arquivo}</figcaption>
            </figure>)}
          </div> : <div className="grid min-h-[145px] place-items-center border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
            <div><ImagePlus size={22} className="mx-auto mb-2 text-slate-400" /><p className="text-[10px] font-semibold text-slate-600">{selected ? 'Nenhuma foto salva para este molde.' : 'Selecione um molde para consultar as fotos.'}</p><p className="mt-1 text-[9px] text-slate-500">Cadastre fotos gerais e detalhes para reconhecer cavidades, conexões e sinais de desgaste.</p></div>
          </div>}
        </div>
      </div>
    </section>
  )
}
