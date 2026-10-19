/**
 * APROVADO — painel de fotos de moldes/processos restaurado do arquivo enviado em 2026-10-18.
 * Não alterar a apresentação ou fluxo de fotos sem autorização expressa.
 */
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
    <section className="mt-4 rounded-xl border border-[#294456] bg-[#0D2638] p-4">
      <header className="mb-3 flex flex-wrap items-center gap-3 border-b border-[#294456] pb-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg border border-[#48B7C7]/30 bg-[#071522] text-[#48B7C7]"><Camera size={17} /></span>
        <div>
          <h2 className="text-sm font-bold uppercase text-[#F4FBFD]">Fotos do molde · localização visual na fábrica</h2>
          <p className="text-xs text-[#A8BBC8]">Identifique o número do molde antes do setup e consulte imagens para inspeção visual.</p>
        </div>
        <button type="button" className="erp-premium-button erp-premium-button-secondary ml-auto" disabled={busy} onClick={() => { setBusy(true); void loadMolds().then(() => selectedId ? loadPhotos(selectedId) : undefined).catch(e => setError(e instanceof Error ? e.message : 'Falha ao atualizar.')).finally(() => setBusy(false)) }}><RefreshCw size={14} /> Atualizar</button>
      </header>
      {error && <p role="alert" className="mb-3 rounded-lg border border-[#D65B61]/50 bg-[#D65B61]/10 p-3 text-sm text-[#F4B8BB]">{error}</p>}
      {notice && <p role="status" className="mb-3 rounded-lg border border-[#3A9D78]/40 bg-[#3A9D78]/10 p-3 text-sm text-[#8ED0B4]">{notice}</p>}
      <div className="grid gap-3 md:grid-cols-[minmax(240px,360px)_minmax(0,1fr)]">
        <div>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#A8BBC8]">Buscar número / código do molde</span>
            <input className="mb-2 h-9 w-full rounded-md border border-[#294456] bg-[#071522] px-3 text-sm text-[#F4FBFD] outline-none focus:border-[#48B7C7]" value={moldQuery} onChange={e => setMoldQuery(e.target.value)} placeholder="Digite o código ou descrição do molde"/>
            <select className="h-9 w-full rounded-md border border-[#294456] bg-[#071522] px-3 text-sm text-[#F4FBFD] outline-none focus:border-[#48B7C7]" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              <option value="">Selecione um molde cadastrado ({productMolds.length} encontrados)</option>
              {productMolds.map(m => <option key={m.id} value={m.id}>{m.codigo} · {m.nome}</option>)}
            </select>
          </label>
          {selected && <div className="mt-3 rounded-lg border border-[#294456] bg-[#071522] p-3 text-xs text-[#A8BBC8]">
            <p><strong>Código:</strong> {selected.codigo}</p>
            <p><strong>Descrição:</strong> {selected.nome}</p>
            <p><strong>Situação:</strong> {selected.status}</p>
            <p><strong>Cavidades:</strong> {selected.cavidades_ativas} ativas / {selected.numero_cavidades} totais</p>
          </div>}
          <label className="erp-premium-button mt-3 flex min-h-10 cursor-pointer items-center justify-center gap-2">
            <ImagePlus size={15} /> {busy ? 'Enviando foto…' : 'Adicionar foto do molde'}
            <input className="sr-only" type="file" accept="image/*" disabled={busy || !selectedId} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; void uploadPhoto(file) }} />
          </label>
          <p className="mt-2 text-[11px] text-[#8297A5]">Imagens são salvas no Storage privado da empresa, com vínculo ao ID do molde. Limite: 15 MB por imagem.</p>
        </div>
        <div className="min-w-0">
          {photos.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map(photo => <figure key={photo.id} className="overflow-hidden rounded-lg border border-[#294456] bg-[#071522]">
              <a href={photo.url} target="_blank" rel="noreferrer" className="block h-[145px] bg-[#071522]">
                <img src={photo.url} alt={'Foto do molde ' + (selected?.codigo ?? '') + ': ' + photo.nome_arquivo} className="h-full w-full object-contain" loading="lazy" />
              </a>
              <figcaption className="truncate px-3 py-2 text-[11px] text-[#A8BBC8]" title={photo.nome_arquivo}>{photo.nome_arquivo}</figcaption>
            </figure>)}
          </div> : <div className="grid min-h-[145px] place-items-center rounded-lg border border-dashed border-[#294456] bg-[#071522] p-4 text-center">
            <div><ImagePlus size={22} className="mx-auto mb-2 text-[#8297A5]" /><p className="text-xs font-semibold text-[#A8BBC8]">{selected ? 'Nenhuma foto salva para este molde.' : 'Selecione um molde para consultar as fotos.'}</p><p className="mt-1 text-[11px] text-[#8297A5]">Cadastre fotos gerais e detalhes para reconhecer cavidades, conexões e sinais de desgaste.</p></div>
          </div>}
        </div>
      </div>
    </section>
  )
}