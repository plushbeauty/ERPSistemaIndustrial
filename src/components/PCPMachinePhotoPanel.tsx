/**
 * SYSNQRA — Fotos de máquinas do PCP.
 * REV-2026-10-22 — vincula imagens ao cadastro real de erp_maquinas por empresa.
 * Fotos são armazenadas no bucket privado documentos-erp e registradas em erp_documentos_anexos.
 */
import { useEffect, useState } from 'react'
import { Camera, ImagePlus, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Machine = { id: string; codigo: string; nome: string; tipo?: string | null; status?: string | null }
type Photo = { id: string; nome_arquivo: string; storage_path: string; mime_type: string | null; url: string }
const maxPhotoBytes = 15 * 1024 * 1024

export default function PCPMachinePhotoPanel({ machineId }: { machineId?: string }) {
  const [company, setCompany] = useState('')
  const [machines, setMachines] = useState<Machine[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [query, setQuery] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadMachines() {
    const tenant = await supabase.rpc('erp_current_empresa_id')
    if (tenant.error || typeof tenant.data !== 'string' || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
    setCompany(tenant.data)
    const result = await supabase.from('erp_maquinas').select('id,codigo,nome,tipo,status').eq('empresa_id', tenant.data).eq('ativo', true).order('codigo').limit(2000)
    if (result.error) throw result.error
    const rows = (result.data ?? []) as Machine[]
    setMachines(rows)
    setSelectedId(current => rows.some(m => m.id === current) ? current : (rows.find(m => machineId && m.id === machineId)?.id ?? rows[0]?.id ?? ''))
  }

  async function loadPhotos(id: string) {
    setPhotos([])
    if (!company || !id) return
    const result = await supabase.from('erp_documentos_anexos').select('id,nome_arquivo,storage_path,mime_type').eq('empresa_id', company).eq('entidade_tipo', 'maquina').eq('entidade_id', id).order('created_at', { ascending: false }).limit(50)
    if (result.error) throw result.error
    const rows = await Promise.all((result.data ?? []).map(async row => {
      const signed = await supabase.storage.from('documentos-erp').createSignedUrl(String(row.storage_path), 300)
      return { id: String(row.id), nome_arquivo: String(row.nome_arquivo), storage_path: String(row.storage_path), mime_type: row.mime_type ? String(row.mime_type) : null, url: signed.error ? '' : (signed.data?.signedUrl ?? '') } satisfies Photo
    }))
    setPhotos(rows.filter(p => p.url && (p.mime_type ?? '').startsWith('image/')))
  }

  useEffect(() => {
    let active = true
    void loadMachines().catch(e => { if (active) setError(e instanceof Error ? e.message : 'Não foi possível carregar as máquinas.') })
    return () => { active = false }
  }, [])
  useEffect(() => {
    let active = true
    void loadPhotos(selectedId).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Não foi possível carregar as fotos da máquina.') })
    return () => { active = false }
  }, [selectedId, company])

  async function uploadPhoto(file?: File) {
    if (!file || !selectedId || !company) return
    setError(''); setNotice('')
    if (!file.type.startsWith('image/')) { setError('Selecione um arquivo de imagem.'); return }
    if (file.size > maxPhotoBytes) { setError('A foto excede o limite de 15 MB.'); return }
    setBusy(true)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_')
    const path = company + '/pcp-maquinas/' + selectedId + '/' + crypto.randomUUID() + '-' + safeName
    try {
      const uploaded = await supabase.storage.from('documentos-erp').upload(path, file, { upsert: false, contentType: file.type })
      if (uploaded.error) throw uploaded.error
      const inserted = await supabase.from('erp_documentos_anexos').insert({ empresa_id: company, entidade_tipo: 'maquina', entidade_id: selectedId, nome_arquivo: file.name, storage_path: path, mime_type: file.type, tamanho_bytes: file.size })
      if (inserted.error) {
        await supabase.storage.from('documentos-erp').remove([path])
        throw inserted.error
      }
      setNotice('Foto salva e vinculada ao cadastro da máquina.')
      await loadPhotos(selectedId)
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar a foto da máquina.') }
    finally { setBusy(false) }
  }

  const selected = machines.find(m => m.id === selectedId)
  const filtered = machines.filter(m => !query || (m.codigo + ' ' + m.nome + ' ' + (m.tipo ?? '')).toLocaleLowerCase().includes(query.toLocaleLowerCase()))
  return <section className="rounded-[2px] border border-slate-200 bg-white p-2 shadow-sm">
    <header className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-2">
      <span className="grid h-7 w-7 place-items-center rounded-[2px] border border-slate-200 bg-slate-50 text-[#2D8DB8]"><Camera size={14}/></span>
      <div className="min-w-0"><h2 className="text-[10px] font-black uppercase text-[#123B50]">Fotos da máquina</h2><p className="text-[9px] text-slate-500">Imagens do equipamento real</p></div>
      <button type="button" className="ml-auto text-slate-500" disabled={busy} aria-label="Atualizar máquinas e fotos" onClick={() => {setBusy(true);void loadMachines().then(()=>loadPhotos(selectedId)).catch(e=>setError(e instanceof Error?e.message:'Falha ao atualizar.')).finally(()=>setBusy(false))}}><RefreshCw size={13}/></button>
    </header>
    {error && <p role="alert" className="mb-2 text-[10px] text-red-700">{error}</p>}
    {notice && <p role="status" className="mb-2 text-[10px] text-emerald-700">{notice}</p>}
    <input className="mb-1.5 h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-slate-800" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar código / máquina"/>
    <select className="h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-slate-800" value={selectedId} onChange={e=>setSelectedId(e.target.value)}>
      <option value="">Selecione máquina ({filtered.length})</option>{filtered.map(m=><option key={m.id} value={m.id}>{m.codigo} · {m.nome}</option>)}
    </select>
    {selected && <p className="my-1.5 truncate text-[9px] text-slate-500" title={selected.nome}>{selected.codigo} · {selected.nome}</p>}
    <label className="mt-1.5 flex h-[30px] cursor-pointer items-center justify-center gap-1 rounded-[2px] bg-[#2D8DB8] px-2 text-[9px] font-bold uppercase text-white">
      <ImagePlus size={12}/>{busy ? 'Enviando…' : 'Anexar foto da máquina'}
      <input className="sr-only" type="file" accept="image/*" disabled={busy || !selectedId} onChange={e=>{const file=e.target.files?.[0];e.target.value='';void uploadPhoto(file)}}/>
    </label>
    <p className="mt-1 text-[9px] text-slate-400">JPG, PNG ou WebP · até 15 MB</p>
    {photos.length ? <div className="mt-2 grid grid-cols-2 gap-1.5">{photos.map(photo=><a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-[2px] border border-slate-200"><img src={photo.url} alt={'Foto da máquina '+(selected?.codigo??'')+': '+photo.nome_arquivo} className="h-[76px] w-full object-contain" loading="lazy"/><span className="block truncate px-1 py-1 text-[9px] text-slate-600">{photo.nome_arquivo}</span></a>)}</div> : <div className="mt-2 grid min-h-[64px] place-items-center rounded-[2px] border border-dashed border-slate-300 p-2 text-center"><p className="text-[9px] text-slate-500">{selected ? 'Nenhuma foto cadastrada para esta máquina.' : 'Selecione uma máquina para consultar ou anexar fotos.'}</p></div>}
    {!machines.length && !error && <p className="mt-2 text-[9px] text-amber-700">Nenhuma máquina cadastrada para esta empresa. Cadastre o equipamento em Máquinas antes de anexar fotos.</p>}
  </section>
}
