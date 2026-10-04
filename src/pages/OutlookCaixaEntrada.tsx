import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, FileText, Inbox, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import type { IOutlookMailbox, IOutlookMessage, IXmlPedidoResult } from '../types/outlook'
import { processarXmlPedido } from '../types/outlook'
import { processarEConverterXmlPedido } from '../services/leitorXmlService'

const MAILBOXES: IOutlookMailbox[] = [
  { address: 'vendas@empresa.com', label: 'Vendas', role: 'vendedor' },
  { address: 'compras@empresa.com', label: 'Compras', role: 'comprador' },
  { address: 'adm@empresa.com', label: 'Administrador', role: 'administrador' },
]

type Profile = { perfil: string; nome: string | null }

async function loadProfile(): Promise<Profile | null> {
  const { data } = await supabase.auth.getUser()
  if (!data.user) return null
  const { data: profile } = await supabase.from('erp_usuarios').select('perfil,nome').eq('auth_user_id', data.user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
  return profile ? { perfil: String(profile.perfil ?? ''), nome: profile.nome ?? null } : null
}

function normalizeRole(perfil: string): 'vendedor' | 'comprador' | 'administrador' {
  const role = perfil.trim().toLowerCase()
  if (role.includes('vendedor') || role.includes('venda')) return 'vendedor'
  if (role.includes('comprador') || role.includes('compra')) return 'comprador'
  return 'administrador'
}

async function fetchMessages(mailbox: string): Promise<IOutlookMessage[]> {
  const endpoint = import.meta.env.VITE_OUTLOOK_API_URL as string | undefined
  if (!endpoint) return []
  const response = await fetch(`${endpoint.replace(/\/$/, '')}/messages?mailbox=${encodeURIComponent(mailbox)}`, { credentials: 'include' })
  if (!response.ok) throw new Error(`Outlook API respondeu HTTP ${response.status}.`)
  const payload: unknown = await response.json()
  if (!Array.isArray(payload)) throw new Error('Contrato da Outlook API inválido: esperado um array.')
  return payload.filter((item): item is IOutlookMessage => {
    if (!item || typeof item !== 'object') return false
    const x = item as Record<string, unknown>
    return typeof x.id === 'string' && typeof x.senderEmail === 'string' && typeof x.senderName === 'string' &&
      typeof x.subject === 'string' && typeof x.bodyPreview === 'string' && typeof x.receivedDateTime === 'string' &&
      typeof x.isRead === 'boolean' && typeof x.hasAttachments === 'boolean'
  })
}

export default function OutlookCaixaEntrada() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [mailbox, setMailbox] = useState('vendas@empresa.com')
  const [messages, setMessages] = useState<IOutlookMessage[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Aguardando atualização da caixa.')
  const [search, setSearch] = useState('')
  const role = normalizeRole(profile?.perfil ?? '')
  const available = MAILBOXES.filter(m => role === 'administrador' || m.role === role)

  useEffect(() => { void loadProfile().then(p => {
    setProfile(p)
    const r = normalizeRole(p?.perfil ?? '')
    setMailbox(MAILBOXES.find(m => m.role === r)?.address ?? 'vendas@empresa.com')
  }) }, [])

  const refresh = async () => {
    setBusy(true); setMessage('Consultando Outlook...')
    try {
      const rows = await fetchMessages(mailbox)
      setMessages(rows); setSelected(rows[0]?.id ?? null)
      setMessage(rows.length ? `${rows.length} e-mail(s) carregado(s).` : 'Nenhum e-mail retornado pela integração.')
    } catch (error) {
      setMessages([]); setMessage(error instanceof Error ? error.message : 'Falha ao consultar Outlook.')
    } finally { setBusy(false) }
  }

  useEffect(() => { if (profile) void refresh() }, [mailbox, profile])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return messages.filter(m => !q || [m.senderName, m.senderEmail, m.subject, m.bodyPreview].join(' ').toLowerCase().includes(q))
  }, [messages, search])
  const selectedMessage = messages.find(m => m.id === selected) ?? null

  const captureXml = async () => {
    if (!selectedMessage) return
    const attachment = selectedMessage.attachments?.find(a => a.contentType.includes('xml') || a.name.toLowerCase().endsWith('.xml'))
    if (!attachment) { setMessage('O e-mail selecionado não possui anexo XML.'); return }
    const result: IXmlPedidoResult = processarXmlPedido(attachment.contentBytes)
    if (!result.sucesso) { setMessage(result.erro ?? 'Falha no XML.'); return }
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setMessage('Sessão autenticada necessária para capturar o XML.'); return }
    const { data: profile } = await supabase.from('erp_usuarios').select('empresa_id').eq('auth_user_id', userData.user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
    if (!profile?.empresa_id) {
      setMessage('Não foi possível determinar a empresa do usuário autenticado.')
      return
    }
    const { data: cliente } = await supabase
      .from('erp_clientes')
      .select('id')
      .eq('empresa_id', profile.empresa_id)
      .eq('email', selectedMessage.senderEmail)
      .maybeSingle()
    if (!cliente?.id) {
      setMessage('Cliente remetente não localizado no cadastro. Cadastre o cliente antes de converter o XML.')
      return
    }
    const conversao = await processarEConverterXmlPedido(result.xmlTexto ?? '', cliente.id, profile.empresa_id)
    if (!conversao.sucesso) {
      setMessage(conversao.erro ?? 'Falha na conversão De-Para.')
      return
    }
    const faltantes = conversao.itens.filter(item => item.codigo_interno === 'NÃO_ENCONTRADO').length
    setMessage(faltantes > 0
      ? String(faltantes) + ' item(ns) sem De-Para. Abra a Lupa de Produtos para vincular.'
      : 'XML processado: ' + String(conversao.itens.length) + ' item(ns) convertido(s) com sucesso.')
    const captureEndpoint = import.meta.env.VITE_OUTLOOK_CAPTURE_URL as string | undefined
    if (!captureEndpoint) {
      setMessage(`XML lido: ${result.itens.length} item(ns). A integração de De-Para/PCP precisa estar configurada em VITE_OUTLOOK_CAPTURE_URL.`)
      return
    }
    setBusy(true)
    try {
      const response = await fetch(captureEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ message: selectedMessage, attachment, xml: result }) })
      if (!response.ok) throw new Error(`Captura recusada pelo serviço: HTTP ${response.status}.`)
      setMessage('XML capturado e enviado ao serviço de De-Para/PCP.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao enviar captura.')
    } finally { setBusy(false) }
  }

  const deleteSelected = async () => {
    if (!selectedMessage) return
    const endpoint = import.meta.env.VITE_OUTLOOK_API_URL as string | undefined
    if (!endpoint) { setMessage('Exclusão indisponível: VITE_OUTLOOK_API_URL não configurada.'); return }
    setBusy(true)
    try {
      const response = await fetch(`${endpoint.replace(/\/$/, '')}/messages/${encodeURIComponent(selectedMessage.id)}?mailbox=${encodeURIComponent(mailbox)}`, { method: 'DELETE', credentials: 'include' })
      if (!response.ok) throw new Error(`Outlook API respondeu HTTP ${response.status}.`)
      setMessages(rows => rows.filter(r => r.id !== selectedMessage.id)); setSelected(null); setMessage('E-mail excluído no servidor.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao excluir e-mail.') }
    finally { setBusy(false) }
  }

  return <div className="min-h-screen bg-slate-50 text-slate-950">
    <header className="border-b border-slate-200 bg-white px-4 py-4 lg:px-6">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3">
        <Inbox className="text-sky-700" size={28}/><div><p className="text-xs font-black uppercase tracking-widest text-slate-500">Módulo: Integrado</p><h1 className="text-xl font-black">Central de Comunicação Outlook</h1></div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-sm font-bold text-slate-600 md:inline">Visualizando e-mail de:</span>
          <select value={mailbox} onChange={e => setMailbox(e.target.value)} disabled={role !== 'administrador'} className="h-[46px] rounded-md border border-slate-300 bg-white px-3 font-bold text-slate-900 disabled:bg-slate-100">{available.map(m => <option key={m.address} value={m.address}>{m.address}{role === 'administrador' ? ' (Acesso Total)' : ''}</option>)}</select>
        </div>
      </div>
    </header>
    <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-slate-200 bg-white p-4 lg:block"><nav className="space-y-2"><a href="/erp-industrial" className="block rounded-md px-3 py-3 font-bold text-slate-700 hover:bg-slate-100">🗂️ Dashboard Central</a><div className="rounded-md bg-sky-50 px-3 py-3 font-black text-sky-900">✉️ Outlook ERP</div><a href="/configuracoes-adm" className="block rounded-md px-3 py-3 font-bold text-slate-700 hover:bg-slate-100">⚙️ Configs E-mail</a></nav></aside>
      <main className="min-w-0 p-4 lg:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button onClick={() => void refresh()} disabled={busy} className="h-[46px] rounded-md bg-sky-700 px-4 font-black text-white disabled:opacity-50"><RefreshCw size={17} className="mr-2 inline"/>ATUALIZAR CAIXA</button>
          <button onClick={() => void captureXml()} disabled={busy || !selectedMessage} className="h-[46px] rounded-md bg-emerald-600 px-4 font-black text-white disabled:opacity-50"><FileText size={17} className="mr-2 inline"/>CAPTURAR ANEXO XML</button>
          <button onClick={() => void deleteSelected()} disabled={busy || !selectedMessage} className="h-[46px] rounded-md bg-rose-600 px-4 font-black text-white disabled:opacity-50"><Trash2 size={17} className="mr-2 inline"/>EXCLUIR E-MAIL</button>
          <div className="ml-auto relative"><Search size={17} className="absolute left-3 top-3.5 text-slate-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrar e-mails" className="h-[46px] w-64 rounded-md border border-slate-300 bg-white pl-9 pr-3 text-base font-semibold text-slate-900"/></div>
        </div>
        <div className="mb-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">{message}</div>
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[850px] border-collapse"><thead><tr className="h-[54px] bg-slate-100 text-left text-xs font-black uppercase tracking-wide text-slate-700"><th className="w-12 px-3"></th><th className="px-3">Remetente</th><th className="px-3">Assunto / Prévia</th><th className="px-3">Data / Hora</th><th className="w-16 px-3">Anx</th></tr></thead>
          <tbody>{visible.map(m => <tr key={m.id} onClick={() => setSelected(m.id)} className={`h-[54px] cursor-pointer border-t border-slate-100 ${selected === m.id ? 'ring-2 ring-inset ring-sky-500' : ''} ${m.isRead ? 'bg-white text-slate-800' : 'bg-blue-50 text-slate-950 font-bold'}`}><td className="px-3 text-center"><input type="radio" checked={selected === m.id} onChange={() => setSelected(m.id)} aria-label={`Selecionar ${m.subject}`}/></td><td className="px-3"><div>{m.senderName}</div><div className="text-xs font-medium text-slate-500">{m.senderEmail}</div></td><td className="px-3"><div>{m.subject}</div><div className="truncate text-xs font-medium text-slate-500">{m.bodyPreview}</div></td><td className="px-3 text-sm">{new Date(m.receivedDateTime).toLocaleString('pt-BR')}</td><td className="px-3 text-center">{m.hasAttachments ? '📎' : ''}</td></tr>)}</tbody></table>
          {visible.length === 0 && <div className="p-10 text-center text-base font-bold text-slate-500">Nenhuma mensagem disponível na integração configurada.</div>}
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-600"><Check size={17} className="text-emerald-600"/><span>Perfil atual: {profile?.perfil ?? 'não identificado'}{profile?.nome ? ` • ${profile.nome}` : ''}</span></div>
      </main>
    </div>
  </div>
}
