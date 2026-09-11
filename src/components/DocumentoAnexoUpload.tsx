import { ChangeEvent, useEffect, useState } from 'react'
import { Download, FileUp, Loader2, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Attachment = {
  id: string
  nome_arquivo: string
  storage_path: string | null
  mime_type: string | null
  tamanho_bytes: number | null
  created_at: string
}

type Props = {
  documentoId: string
  titulo?: string
}

const MAX_BYTES = 25 * 1024 * 1024
const ALLOWED = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

export default function DocumentoAnexoUpload({ documentoId, titulo = 'Anexos do documento' }: Props) {
  const [items, setItems] = useState<Attachment[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    const { data, error } = await supabase
      .from('erp_documentos_anexos')
      .select('id,nome_arquivo,storage_path,mime_type,tamanho_bytes,created_at')
      .eq('documento_id', documentoId)
      .order('created_at', { ascending: false })
    if (!error) setItems((data ?? []) as Attachment[])
  }

  useEffect(() => {
    void load()
  }, [documentoId])

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setMessage('')
    if (file.size > MAX_BYTES) {
      setMessage('Arquivo excede o limite de 25 MB.')
      return
    }
    if (!ALLOWED.has(file.type)) {
      setMessage('Formato não permitido. Use PDF, imagem, TXT ou Excel.')
      return
    }

    setBusy(true)
    try {
      const { data: companyId, error: companyError } = await supabase.rpc('erp_current_empresa_id')
      if (companyError || !companyId) throw companyError ?? new Error('Empresa não identificada.')
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_')
      const path = `${companyId}/documentos/${documentoId}/${crypto.randomUUID()}-${safeName}`
      const { error: uploadError } = await supabase.storage.from('documentos-erp').upload(path, file, { upsert: false })
      if (uploadError) throw uploadError

      const { data: userData } = await supabase.auth.getUser()
      const { error: rowError } = await supabase.from('erp_documentos_anexos').insert({
        empresa_id: companyId,
        documento_id: documentoId,
        nome_arquivo: file.name,
        storage_path: path,
        mime_type: file.type || null,
        tamanho_bytes: file.size,
        criado_por: userData.user?.id ?? null,
      })
      if (rowError) {
        await supabase.storage.from('documentos-erp').remove([path])
        throw rowError
      }
      setMessage('Anexo salvo com sucesso.')
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar o anexo.')
    } finally {
      setBusy(false)
    }
  }

  async function download(item: Attachment) {
    if (!item.storage_path) return
    const { data, error } = await supabase.storage.from('documentos-erp').createSignedUrl(item.storage_path, 300)
    if (error || !data?.signedUrl) {
      setMessage(error?.message ?? 'Não foi possível gerar o acesso ao arquivo.')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function remove(item: Attachment) {
    if (!window.confirm(`Excluir o anexo ${item.nome_arquivo}?`)) return
    setBusy(true)
    try {
      if (item.storage_path) {
        const { error } = await supabase.storage.from('documentos-erp').remove([item.storage_path])
        if (error) throw error
      }
      const { error } = await supabase.from('erp_documentos_anexos').delete().eq('id', item.id)
      if (error) throw error
      setItems(current => current.filter(row => row.id !== item.id))
      setMessage('Anexo excluído.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível excluir o anexo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ marginTop: 16, border: '1px solid #dfe7e4', borderRadius: 14, padding: 16, background: '#f8fbfa' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <strong>{titulo}</strong>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Storage privado por empresa • máximo 25 MB</div>
        </div>
        <label className="menu-green" style={{ cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? .65 : 1 }}>
          {busy ? <Loader2 size={17} className="spin" /> : <FileUp size={17} />}
          {busy ? 'Enviando…' : 'Anexar arquivo'}
          <input type="file" hidden disabled={busy} onChange={upload} accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.xls,.xlsx" />
        </label>
      </div>
      {message && <div style={{ marginTop: 10, fontSize: 14, color: message.includes('sucesso') || message === 'Anexo excluído.' ? '#166534' : '#b91c1c' }}>{message}</div>}
      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        {items.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb' }}>
            <div style={{ minWidth: 0 }}><strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nome_arquivo}</strong><small>{item.mime_type || 'arquivo'} • {item.tamanho_bytes ? `${Math.ceil(item.tamanho_bytes / 1024)} KB` : 'tamanho não informado'}</small></div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="icon-button" title="Abrir arquivo" onClick={() => void download(item)}><Download size={17} /></button>
              <button type="button" className="icon-button" title="Excluir anexo" onClick={() => void remove(item)} disabled={busy}><Trash2 size={17} /></button>
            </div>
          </div>
        ))}
        {!items.length && <span style={{ color: '#64748b', fontSize: 14 }}>Nenhum anexo salvo neste documento.</span>}
      </div>
    </div>
  )
}
