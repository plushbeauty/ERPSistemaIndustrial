/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, ChevronDown, ChevronRight, FileText, Folder, FolderOpen, Image as ImageIcon, RefreshCw, Search } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type RpncRow = {
  id: string
  numero_rpnc: string
  lote_producao: string | null
  descricao_nao_conformidade: string | null
  criado_em: string | null
  cliente_id: string | null
  equipamento_codigo: string | null
}
type EvidenceRow = {
  id: string
  rpnc_id: string
  nome_arquivo: string
  storage_path: string
  mime_type: string | null
  created_at: string
}
type ClientRow = { id: string; razao_social: string; nome_fantasia: string | null }
type TreeRpnc = RpncRow & { clienteNome: string; evidencias: EvidenceRow[] }

const BUCKET = 'qualidade-evidencias'

export default function FileTreeGED() {
  const [busca, setBusca] = useState('')
  const [rpncs, setRpncs] = useState<TreeRpnc[]>([])
  const [pastasAbertas, setPastasAbertas] = useState<Record<string, boolean>>({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [abrindoArquivo, setAbrindoArquivo] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const { data: rpncData, error: rpncError } = await supabase
        .from('erp_rpnc')
        .select('id, numero_rpnc, lote_producao, descricao_nao_conformidade, criado_em, cliente_id, equipamento_codigo')
        .order('criado_em', { ascending: false })
        .limit(1000)
      if (rpncError) throw rpncError
      const rows = (rpncData ?? []) as unknown as RpncRow[]
      const { data: evidenceData, error: evidenceError } = await supabase
        .from('erp_qualidade_rpnc_evidencias')
        .select('id, rpnc_id, nome_arquivo, storage_path, mime_type, created_at')
        .order('created_at', { ascending: false })
        .limit(5000)
      if (evidenceError) throw evidenceError
      const evidenceRows = (evidenceData ?? []) as unknown as EvidenceRow[]
      const clientIds = [...new Set(rows.map(row => row.cliente_id).filter((id): id is string => Boolean(id)))]
      let clientNames = new Map<string, string>()
      if (clientIds.length) {
        const { data: clientsData, error: clientsError } = await supabase
          .from('erp_clientes')
          .select('id, razao_social, nome_fantasia')
          .in('id', clientIds)
        if (clientsError) throw clientsError
        const clients = (clientsData ?? []) as unknown as ClientRow[]
        clientNames = new Map(clients.map(client => [client.id, client.nome_fantasia?.trim() || client.razao_social]))
      }
      const grouped = new Map<string, EvidenceRow[]>()
      for (const evidence of evidenceRows) {
        const current = grouped.get(evidence.rpnc_id) ?? []
        current.push(evidence)
        grouped.set(evidence.rpnc_id, current)
      }
      setRpncs(rows.map(row => ({
        ...row,
        clienteNome: row.cliente_id ? clientNames.get(row.cliente_id) ?? 'Cliente não identificado' : 'Cliente não vinculado',
        evidencias: grouped.get(row.id) ?? [],
      })))
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'Não foi possível carregar os documentos de qualidade.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')
    if (!termo) return rpncs
    return rpncs.flatMap(rpnc => {
      const matchPrincipal = [
        rpnc.clienteNome, rpnc.numero_rpnc, rpnc.equipamento_codigo ?? '',
        rpnc.lote_producao ?? '', rpnc.descricao_nao_conformidade ?? '',
      ].some(value => value.toLocaleLowerCase('pt-BR').includes(termo))
      if (matchPrincipal) return [rpnc]
      const matchingFiles = rpnc.evidencias.filter(file => file.nome_arquivo.toLocaleLowerCase('pt-BR').includes(termo))
      return matchingFiles.length ? [{ ...rpnc, evidencias: matchingFiles }] : []
    })
  }, [busca, rpncs])

  const clientes = useMemo(() => {
    const groups = new Map<string, TreeRpnc[]>()
    for (const rpnc of filtrados) {
      const current = groups.get(rpnc.clienteNome) ?? []
      current.push(rpnc)
      groups.set(rpnc.clienteNome, current)
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
  }, [filtrados])

  const togglePasta = (id: string) => setPastasAbertas(previous => ({ ...previous, [id]: !previous[id] }))

  const abrirArquivo = async (file: EvidenceRow) => {
    setAbrindoArquivo(file.id)
    try {
      const { data, error: urlError } = await supabase.storage.from(BUCKET).createSignedUrl(file.storage_path, 60)
      if (urlError) throw urlError
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'Não foi possível abrir a evidência.')
    } finally {
      setAbrindoArquivo(null)
    }
  }

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-7xl space-y-5 p-4 md:p-6">
      <header className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Central de Evidências (GED)</h1>
          <p className="mt-1 text-xs text-slate-500">Rastreabilidade documental por cliente, RPNC, equipamento e lote</p>
        </div>
        <button type="button" onClick={() => void carregar()} disabled={carregando} aria-label="Atualizar documentos" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw size={15} className={carregando ? 'animate-spin' : ''} /> Atualizar
        </button>
      </header>

      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" />
        <input value={busca} onChange={event => setBusca(event.target.value)} placeholder="Buscar arquivo, RPNC, equipamento, lote ou cliente..." className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
      </div>

      {erro && <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle size={17} className="mt-0.5 shrink-0" />{erro}</div>}

      <section className="min-h-[400px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {carregando ? <div role="status" className="py-12 text-center text-sm text-slate-500">Carregando registros reais do Supabase…</div>
          : clientes.length === 0 ? <div className="flex flex-col items-center justify-center py-14 text-center text-slate-400"><Folder size={42} strokeWidth={1.4} /><p className="mt-3 text-sm">Nenhuma RPNC ou evidência corresponde à busca.</p></div>
          : <div className="space-y-2">
            {clientes.map(([clienteNome, items]) => {
              const clienteKey = `cliente:${clienteNome}`
              const clienteAberto = Boolean(pastasAbertas[clienteKey] || busca.trim())
              return <div key={clienteKey} className="select-none">
                <button type="button" onClick={() => togglePasta(clienteKey)} aria-expanded={clienteAberto} className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50">
                  {clienteAberto ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                  {clienteAberto ? <FolderOpen size={19} className="text-amber-500" /> : <Folder size={19} className="text-amber-500" />}
                  <span>{clienteNome}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">{items.length} RPNC(s)</span>
                </button>
                {clienteAberto && <div className="ml-5 space-y-1 border-l border-slate-200 pl-3">
                  {items.map(rpnc => {
                    const rpncKey = `rpnc:${rpnc.id}`
                    const aberta = Boolean(pastasAbertas[rpncKey] || busca.trim())
                    return <div key={rpnc.id}>
                      <button type="button" onClick={() => togglePasta(rpncKey)} aria-expanded={aberta} className="flex w-full items-center gap-2 rounded-md p-2 text-left text-xs text-slate-700 hover:bg-slate-50">
                        {aberta ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                        {aberta ? <FolderOpen size={16} className="text-sky-600" /> : <Folder size={16} className="text-sky-600" />}
                        <span className="font-bold text-sky-700">{rpnc.numero_rpnc}</span>
                        {rpnc.equipamento_codigo && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">Equipamento: {rpnc.equipamento_codigo}</span>}
                        {rpnc.lote_producao && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">Lote: {rpnc.lote_producao}</span>}
                        <span className="ml-auto text-[10px] text-slate-400">{rpnc.evidencias.length} arquivo(s)</span>
                      </button>
                      {aberta && <div className="ml-6 space-y-1 border-l border-slate-200 pl-3">
                        {rpnc.evidencias.length ? rpnc.evidencias.map(file => {
                          const isImage = file.mime_type?.startsWith('image/') ?? /\.(png|jpe?g|webp|gif)$/i.test(file.nome_arquivo)
                          return <button key={file.id} type="button" disabled={abrindoArquivo === file.id} onClick={() => void abrirArquivo(file)} className="flex w-full items-center gap-2 rounded p-2 text-left text-xs text-slate-600 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-50">
                            {isImage ? <ImageIcon size={14} className="text-emerald-600" /> : <FileText size={14} className="text-rose-500" />}
                            <span className="min-w-0 flex-1 truncate">{file.nome_arquivo}</span>
                            <span className="shrink-0 text-[10px] text-slate-400">{abrindoArquivo === file.id ? 'Abrindo…' : new Date(file.created_at).toLocaleDateString('pt-BR')}</span>
                          </button>
                        }) : <p className="p-2 text-[11px] italic text-slate-400">Nenhuma evidência anexada a esta RPNC.</p>}
                      </div>}
                    </div>
                  })}
                </div>}
              </div>
            })}
          </div>}
      </section>
      <p className="text-[11px] text-slate-400">Arquivos privados são abertos por URL temporária assinada. A visualização respeita a sessão e as permissões configuradas no Supabase.</p>
    </main>
  )
}
