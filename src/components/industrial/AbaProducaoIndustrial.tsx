/**
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data da alteração: 2026-10-16
 * ID da revisão: REV-060
 * Área/módulo: Cadastro de Produtos / Produção (MRP)
 * O que foi revisto: substituir cards documentais simulados por consultas a fichas, operações e anexos vinculados ao produto; evitar depender de tabela PCP não confirmada.
 * O que foi alterado: painel de ficha técnica ativa, operações e máquinas, anexos técnicos com URL temporária assinada.
 * Motivo: operador precisa acessar documentação real do processo sem confundir anexos comuns com parâmetros de manufatura.
 * Schema/RPC/storage confirmado no código consultado: erp_fichas_tecnicas, erp_ficha_operacoes, erp_maquinas, erp_documentos_anexos, bucket documentos-erp. A tabela de roteiro PCP específica não foi confirmada e não é consultada.
 * Validação executada: inspeção estática do componente e confirmação da integração na tela de produtos.
 * Validação pendente: type-check, lint, build, schema remoto, Storage/RLS e teste com sessão autenticada.
 * Estado: implementado no código; não homologado.
 */

import { ClipboardList, FileText, Settings2, ExternalLink, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type ProcessSheet = {
  id: string
  versao: number
  rendimento: number
  unidade_rendimento: string
  status: string | null
  revisao: string | null
}
type Operation = {
  id: string
  sequencia: number
  operacao: string
  maquina_id: string | null
  setup_min: number
  ciclo_seg: number
  instrucoes: string | null
}
type Machine = { id: string; codigo: string; nome: string }
type Attachment = {
  id: string
  nome_arquivo: string
  storage_path: string
  mime_type: string | null
  tamanho_bytes: number | null
}

export default function AbaProducaoIndustrial({ productId, empresaId }: { productId: string | null; empresaId: string }) {
  const [sheet, setSheet] = useState<ProcessSheet | null>(null)
  const [operations, setOperations] = useState<Operation[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!productId || !empresaId) {
      setSheet(null)
      setOperations([])
      setMachines([])
      setAttachments([])
      setError('')
      return
    }
    setBusy(true)
    setError('')
    try {
      const [sheetResult, attachmentResult] = await Promise.all([
        supabase.from('erp_fichas_tecnicas')
          .select('id,versao,rendimento,unidade_rendimento,status,revisao')
          .eq('empresa_id', empresaId).eq('produto_id', productId).eq('ativa', true)
          .order('versao', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('erp_documentos_anexos')
          .select('id,nome_arquivo,storage_path,mime_type,tamanho_bytes')
          .eq('empresa_id', empresaId).eq('entidade_tipo', 'produto').eq('entidade_id', productId)
          .order('created_at', { ascending: false }).limit(100),
      ])
      if (sheetResult.error) throw sheetResult.error
      if (attachmentResult.error) throw attachmentResult.error

      const currentSheet = (sheetResult.data ?? null) as ProcessSheet | null
      setSheet(currentSheet)
      setAttachments((attachmentResult.data ?? []) as Attachment[])

      if (currentSheet) {
        const opResult = await supabase.from('erp_ficha_operacoes')
          .select('id,sequencia,operacao,maquina_id,setup_min,ciclo_seg,instrucoes')
          .eq('empresa_id', empresaId).eq('ficha_id', currentSheet.id).order('sequencia').limit(500)
        if (opResult.error) throw opResult.error
        const ops = (opResult.data ?? []) as Operation[]
        setOperations(ops)
        const machineIds = Array.from(new Set(ops.map(op => op.maquina_id).filter((id): id is string => Boolean(id))))
        if (machineIds.length) {
          const machineResult = await supabase.from('erp_maquinas')
            .select('id,codigo,nome').eq('empresa_id', empresaId).in('id', machineIds)
          if (machineResult.error) throw machineResult.error
          setMachines((machineResult.data ?? []) as Machine[])
        } else setMachines([])
      } else {
        setOperations([])
        setMachines([])
      }

    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os documentos e roteiros de produção.')
    } finally {
      setBusy(false)
    }
  }, [productId, empresaId])

  useEffect(() => { void load() }, [load])

  const openAttachment = async (item: Attachment) => {
    setError('')
    try {
      const result = await supabase.storage.from('documentos-erp').createSignedUrl(item.storage_path, 300)
      if (result.error || !result.data?.signedUrl) throw result.error ?? new Error('Não foi possível gerar o link temporário do documento.')
      window.open(result.data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível abrir o documento.')
    }
  }

  const openProcessSheet = () => {
    if (!productId) return
    window.open('/ficha-engenharia?produto=' + encodeURIComponent(productId), '_blank', 'noopener,noreferrer')
  }

  const drawings = attachments.filter(item => {
    const type = (item.mime_type ?? '').toLowerCase()
    const name = item.nome_arquivo.toLowerCase()
    return type === 'application/pdf' || type.startsWith('image/') || /\.(pdf|png|jpe?g|webp|tif?f)$/i.test(name)
  })
  const machineById = new Map(machines.map(machine => [machine.id, machine]))
  const card = 'min-w-0 rounded-[2px] border border-[#cbd5e1] bg-white p-3'
  const action = 'inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-2 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <section className="mt-3 border-t border-slate-300 pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#123B50]">05.C / Acesso rápido aos documentos de processo</h3>
          <p className="text-[10px] text-slate-600">Fichas ativas, roteiros de operação e desenhos anexados ao cadastro real deste produto.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={busy} className="inline-flex h-[28px] items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-slate-700 disabled:opacity-50">
          <RefreshCw size={12} /> Atualizar
        </button>
      </div>

      {error && <p role="alert" className="mb-2 border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] text-rose-800">{error}</p>}
      {!productId && <p className="mb-2 border border-amber-200 bg-amber-50 px-2 py-2 text-[10px] text-amber-900">Salve e selecione o produto para consultar documentos e roteiros vinculados.</p>}

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        <article className={card}>
          <div className="mb-2 flex items-center gap-2 text-[#123B50]"><ClipboardList size={16} /><h4 className="text-[10px] font-bold uppercase">Ficha de processo / roteiro mestre</h4></div>
          {sheet ? <>
            <p className="text-[10px] font-bold text-slate-800">Ficha técnica · v{sheet.versao} · {sheet.revisao ? 'Rev. ' + sheet.revisao : 'Revisão não informada'}</p>
            <p className="mt-1 text-[10px] text-slate-600">Status: {sheet.status || 'não informado'} · Rendimento: {Number(sheet.rendimento).toLocaleString('pt-BR')} {sheet.unidade_rendimento}</p>
            <p className="mt-1 text-[10px] text-slate-600">{operations.length} operação(ões) na ficha técnica · etapas documentadas na ficha técnica</p>
          </> : <p className="text-[10px] text-slate-500">Nenhuma ficha técnica ativa vinculada a este produto.</p>}
          <button type="button" disabled={!productId} onClick={openProcessSheet} className={action + ' mt-3'}><ExternalLink size={12} /> Abrir ficha real</button>
        </article>

        <article className={card}>
          <div className="mb-2 flex items-center gap-2 text-[#123B50]"><FileText size={16} /><h4 className="text-[10px] font-bold uppercase">Desenhos técnicos / PDFs anexados</h4></div>
          {drawings.length ? <ul className="space-y-1">{drawings.slice(0, 6).map(item => <li key={item.id} className="flex min-w-0 items-center justify-between gap-2 border-b border-slate-100 py-1"><span className="min-w-0 truncate text-[10px] text-slate-700" title={item.nome_arquivo}>{item.nome_arquivo}</span><button type="button" onClick={() => void openAttachment(item)} className="shrink-0 text-[10px] font-bold text-[#2D8DB8] underline">Abrir</button></li>)}</ul> : <p className="text-[10px] text-slate-500">Nenhum desenho PDF ou imagem anexado ao produto.</p>}
          <p className="mt-2 text-[9px] text-slate-500">{drawings.length} documento(s) técnico(s) localizado(s) nos anexos do produto.</p>
        </article>

        <article className={card}>
          <div className="mb-2 flex items-center gap-2 text-[#123B50]"><Settings2 size={16} /><h4 className="text-[10px] font-bold uppercase">Parâmetros de máquina / setup</h4></div>
          {operations.length ? <div className="space-y-1">{operations.slice(0, 5).map(op => {
            const machine = op.maquina_id ? machineById.get(op.maquina_id) : undefined
            return <div key={op.id} className="border-b border-slate-100 py-1">
              <p className="text-[10px] font-bold text-slate-800">{op.sequencia}. {op.operacao}</p>
              <p className="text-[10px] text-slate-600">{machine ? machine.codigo + ' · ' + machine.nome : 'Máquina não definida'} · Setup {Number(op.setup_min).toLocaleString('pt-BR')} min · Ciclo {Number(op.ciclo_seg).toLocaleString('pt-BR')} s</p>
              {op.instrucoes && <p className="mt-1 line-clamp-2 text-[9px] text-slate-500">{op.instrucoes}</p>}
            </div>
          })}</div> : <p className="text-[10px] text-slate-500">Nenhum parâmetro de máquina cadastrado na ficha técnica ativa.</p>}
          <button type="button" disabled={!productId} onClick={openProcessSheet} className={action + ' mt-3'}><ExternalLink size={12} /> Ver setup na ficha</button>
        </article>
      </div>
    </section>
  )
}
