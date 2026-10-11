import { useCallback, useEffect, useState } from 'react'
import { FileText, RefreshCw, Save, ShieldCheck, Upload, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import { useLocation } from 'react-router-dom'
import QualitySidebar from '../components/quality/QualitySidebar'

type Rpn = { id: string; numero_rpnc: string; descricao_nao_conformidade: string; origem: string | null; gravidade: string | null; lote_producao: string | null; quantidade_segregada: number; bloqueia_lote: boolean; setor_envolvido_id: string | null; status: string; criado_em: string }
type Ishikawa = { id: string; rpnc_id: string; efeito: string; metodo: string | null; mao_de_obra: string | null; material: string | null; maquina: string | null; meio_ambiente: string | null; medicao: string | null }
type Capa = { id: string; rpnc_id: string; tipo: string; descricao: string; causa_raiz: string | null; responsavel_id: string; prazo: string; status: string; acao_o_que: string | null; acao_por_que: string | null; acao_onde: string | null; acao_quem: string | null; acao_quando: string | null; acao_como: string | null; acao_quanto: number | null }
type CapaRecord = { id: string; rpnc_id: string | null; codigo: string; origem: string; descricao: string; plano_5w2h: unknown; status: string; created_at: string }
type DocBase = { id: string; codigo: string; titulo: string; area: string | null; revisao: number; data_revisao: string | null; responsavel_id: string | null; status: string }
type Attachment = { id: string; documento_id: string; nome_arquivo: string; storage_path: string; revisao: number; status: string; criado_em: string }
type User = { id: string; nome: string | null; email: string | null }
type Sector = { id: string; nome: string }
type Doc = { id: string; codigo: string; titulo: string; tipo: string | null; revisao: number; data_revisao: string | null; preparado_por: string | null; pdf_storage_path: string | null; nome_arquivo: string | null; status: string }


const jsonRecord = (value: unknown): Record<string, unknown> | null => typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null
const stringField = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : fallback
const actionsFromCapa = (row: CapaRecord): Capa[] => {
  const rpncId = row.rpnc_id
  if (!rpncId || !Array.isArray(row.plano_5w2h)) return []
  return row.plano_5w2h.flatMap((value, index) => {
    const item = jsonRecord(value)
    if (!item) return []
    const prazo = stringField(item.prazo)
    const oQue = stringField(item.oQue, row.descricao)
    return [{ id: stringField(item.id, row.id + '-' + index), rpnc_id: rpncId, tipo: stringField(item.tipo, 'Corretiva'), descricao: oQue, causa_raiz: stringField(item.causa) || null, responsavel_id: stringField(item.responsavel), prazo, status: row.status, acao_o_que: oQue, acao_por_que: stringField(item.porQue) || null, acao_onde: stringField(item.onde) || null, acao_quem: stringField(item.quem), acao_quando: stringField(item.quando, prazo), acao_como: stringField(item.como) || null, acao_quanto: typeof item.quanto === 'number' ? item.quanto : Number(item.quanto ?? 0) }]
  })
}

const field = (bad = false) => `h-[30px] w-full rounded-[2px] border px-2 text-[12px] outline-none ${bad ? 'border-red-500 bg-red-50/50 placeholder:text-red-400' : 'border-slate-300 bg-white focus:border-[#2D8DB8]'}`
const label = 'grid gap-[2px] text-[9px] font-medium uppercase text-slate-600'
const btn = 'inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-medium text-white'

type QualidadeRNCProps = { initialTab?: 'rnc' | 'capa' | 'ged' | 'ishikawa' }

export default function QualidadeRNC({ initialTab = 'rnc' }: QualidadeRNCProps) {
  const location = useLocation()
  const [tab, setTab] = useState<'rnc' | 'capa' | 'ged' | 'ishikawa'>(initialTab)
  const [companyId, setCompanyId] = useState('')
  const [rncs, setRncs] = useState<Rpn[]>([])
  const [ishikawa, setIshikawa] = useState<Ishikawa | null>(null)
  const [actions, setActions] = useState<Capa[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [docAttachments, setDocAttachments] = useState<Attachment[]>([])
  const [selectedRnc, setSelectedRnc] = useState('')
  const [registrySearch, setRegistrySearch] = useState('')
  const [registryStatus, setRegistryStatus] = useState('TODAS')
  const [registryOrigin, setRegistryOrigin] = useState('TODAS')
  const [description, setDescription] = useState('')
  const [origin, setOrigin] = useState('Processo')
  const [sectorId, setSectorId] = useState('')
  const [lot, setLot] = useState('')
  const [segregated, setSegregated] = useState('0')
  const [sixM, setSixM] = useState({ metodo: '', mao_de_obra: '', material: '', maquina: '', meio_ambiente: '', medicao: '' })
  const [action, setAction] = useState({ tipo: 'Corretiva', oQue: '', porQue: '', onde: '', quem: '', quando: '', como: '', quanto: '0', causa: '', responsavel: '', prazo: '' })
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true); setError('')
    try {
      const current = await supabase.rpc('erp_current_empresa_id')
      if (current.error) throw current.error
      if (!current.data) throw new Error('Empresa da sessão não identificada.')
      const id = String(current.data); setCompanyId(id)
      const [r, a, u, s, d, attachments] = await Promise.all([
        fetchAllPages<Rpn>((from, to) => supabase.from('erp_rpnc').select('id,numero_rpnc,descricao_nao_conformidade,origem,gravidade,lote_producao,quantidade_segregada,bloqueia_lote,setor_envolvido_id,status,criado_em',{count:'exact'}).eq('empresa_id', id).order('criado_em', { ascending: false }).range(from, to)),
        fetchAllPages<CapaRecord>((from, to) => supabase.from('qualidade_rnc_capa').select('id,rpnc_id,codigo,origem,descricao,plano_5w2h,status,created_at',{count:'exact'}).eq('empresa_id', id).order('created_at', { ascending: false }).range(from, to)),
        fetchAllPages<User>((from, to) => supabase.from('erp_usuarios').select('id,nome,email',{count:'exact'}).eq('empresa_id', id).eq('ativo', true).is('deleted_at', null).order('nome').range(from, to)),
        fetchAllPages<Sector>((from, to) => supabase.from('erp_setores').select('id,nome',{count:'exact'}).eq('empresa_id', id).eq('ativo', true).order('nome').range(from, to)),
        fetchAllPages<DocBase>((from, to) => supabase.from('erp_documentos_qualidade').select('id,codigo,titulo,area,revisao,data_revisao,responsavel_id,status',{count:'exact'}).eq('empresa_id', id).order('codigo').range(from, to)),
        fetchAllPages<Attachment>((from, to) => supabase.from('erp_documentos_qualidade_anexos').select('id,documento_id,nome_arquivo,storage_path,revisao,status,criado_em',{count:'exact'}).eq('empresa_id', id).order('revisao', { ascending: false }).order('criado_em', { ascending: false }).range(from, to)),
      ])
      setRncs(r); setActions(a.flatMap(actionsFromCapa)); setUsers(u); setSectors(s)
      const userNames = new Map<string, string>(u.map(user => [user.id, user.nome || user.email || '—'] as const))
      const activeAttachments = new Map<string, { storage_path: string; nome_arquivo: string }>()
      for (const attachment of attachments) {
        if (attachment.status.toLowerCase() === 'vigente' && !activeAttachments.has(attachment.documento_id)) activeAttachments.set(attachment.documento_id, { storage_path: attachment.storage_path, nome_arquivo: attachment.nome_arquivo })
      }
      setDocAttachments(attachments)
      setDocs(d.map(doc => {
        const attachment = activeAttachments.get(doc.id)
        return { id: doc.id, codigo: doc.codigo, titulo: doc.titulo, tipo: doc.area, revisao: doc.revisao, data_revisao: doc.data_revisao, preparado_por: doc.responsavel_id ? userNames.get(doc.responsavel_id) ?? null : null, pdf_storage_path: attachment?.storage_path ?? null, nome_arquivo: attachment?.nome_arquivo ?? null, status: doc.status }
      }))
      if (!selectedRnc && r[0]) setSelectedRnc(r[0].id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar SGQ.')
    } finally { setBusy(false) }
  }, [selectedRnc])

  useEffect(() => { setTab(initialTab) }, [initialTab])
  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!selectedRnc || !companyId) { setIshikawa(null); return }
    void (async () => {
      const result = await supabase.from('erp_qualidade_ishikawa').select('id,rpnc_id,efeito,metodo,mao_de_obra,material,maquina,meio_ambiente,medicao').eq('empresa_id', companyId).eq('rpnc_id', selectedRnc).maybeSingle()
      if (!result.error) {
        setIshikawa(result.data as Ishikawa | null)
        if (result.data) setSixM({ metodo: result.data.metodo ?? '', mao_de_obra: result.data.mao_de_obra ?? '', material: result.data.material ?? '', maquina: result.data.maquina ?? '', meio_ambiente: result.data.meio_ambiente ?? '', medicao: result.data.medicao ?? '' })
      }
    })()
  }, [selectedRnc, companyId])

  const selected = rncs.find((rnc) => rnc.id === selectedRnc) ?? null
  const filteredRncs = rncs.filter((row) => {
    const term = registrySearch.trim().toLocaleLowerCase('pt-BR')
    const matchesSearch = !term || [row.numero_rpnc, row.descricao_nao_conformidade, row.lote_producao ?? '', row.origem ?? ''].some(value => value.toLocaleLowerCase('pt-BR').includes(term))
    const status = (row.status || '').toLocaleLowerCase('pt-BR')
    const isClosed = ['encerrada','encerrado','fechada','fechado','concluida','concluído','cancelada','cancelado'].includes(status)
    const matchesStatus = registryStatus === 'TODAS' || (registryStatus === 'ABERTAS' && !isClosed) || (registryStatus === 'FECHADAS' && isClosed)
    const origin = (row.origem || '').toLocaleLowerCase('pt-BR')
    const matchesOrigin = registryOrigin === 'TODAS' || (registryOrigin === 'CLIENTE' && origin.includes('cliente')) || (registryOrigin === 'AUDITORIA' && origin.includes('auditoria')) || (registryOrigin === 'INTERNA' && (origin.includes('processo') || origin.includes('interna'))) || (registryOrigin === 'FORNECEDOR' && origin.includes('fornecedor'))
    return matchesSearch && matchesStatus && matchesOrigin
  })
  const openCount = rncs.filter(row => !['encerrada','encerrado','fechada','fechado','concluida','concluído','cancelada','cancelado'].includes((row.status || '').toLocaleLowerCase('pt-BR'))).length
  const closedCount = rncs.length - openCount
  const selectedActions = actions.filter((item) => item.rpnc_id === selectedRnc)
  const fishboneCategories = [
    { key: 'metodo', title: 'MÉTODO', side: 'top' },
    { key: 'mao_de_obra', title: 'MÃO DE OBRA', side: 'bottom' },
    { key: 'material', title: 'MATERIAL', side: 'top' },
    { key: 'maquina', title: 'MÁQUINA', side: 'bottom' },
    { key: 'meio_ambiente', title: 'MEIO AMBIENTE', side: 'top' },
    { key: 'medicao', title: 'MEDIÇÃO', side: 'bottom' },
  ] as const
  const fishboneCauseList = (value: string) => value.split(/\n|;/).map((cause) => cause.trim()).filter(Boolean)

  const openRnc = async () => {
    setError(''); setNotice('')
    if (!description.trim()) { setError('Descrição detalhada da falha é obrigatória.'); return }
    if (!lot.trim()) { setError('Lote afetado é obrigatório.'); return }
    if (!sectorId) { setError('Setor responsável é obrigatório.'); return }
    setBusy(true)
    try {
      const lotNumber = lot.trim()
      const internalLot = await supabase.from('erp_estoque_lotes').select('id').eq('empresa_id', companyId).eq('lote_interno', lotNumber).maybeSingle()
      if (internalLot.error) throw internalLot.error
      let lotExists = Boolean(internalLot.data)
      if (!lotExists) {
        const supplierLot = await supabase.from('erp_estoque_lotes').select('id').eq('empresa_id', companyId).eq('lote_fornecedor', lotNumber).maybeSingle()
        if (supplierLot.error) throw supplierLot.error
        lotExists = Boolean(supplierLot.data)
      }
      if (!lotExists) throw new Error('Lote afetado não encontrado na empresa atual.')
      const created = await supabase.from('erp_rpnc').insert({
        empresa_id: companyId,
        numero_rpnc: 'RPNC-' + new Date().getFullYear() + '-' + crypto.randomUUID().slice(0, 8).toUpperCase(),
        descricao_nao_conformidade: description.trim(), origem: origin.toLowerCase(), gravidade: 'menor',
        setor_envolvido_id: sectorId, lote_producao: lotNumber,
        quantidade_segregada: Number(segregated || 0), bloqueia_lote: Number(segregated || 0) > 0, status: 'aberta',
      }).select('id').single()
      if (created.error) throw created.error
      const createdId = created.data.id
      setSelectedRnc(createdId); setDescription(''); setLot(''); setSegregated('0'); setNotice('RNC aberta no banco real com lote e quantidade segregada.'); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao abrir RNC.') }
    finally { setBusy(false) }
  }

  const saveSixM = async () => {
    if (!selected) return
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await supabase.from('erp_qualidade_ishikawa').upsert({ empresa_id: companyId, rpnc_id: selected.id, efeito: selected.descricao_nao_conformidade, ...sixM }, { onConflict: 'empresa_id,rpnc_id' }).select('id,rpnc_id,efeito,metodo,mao_de_obra,material,maquina,meio_ambiente,medicao').single()
      if (result.error) throw result.error
      setIshikawa(result.data as Ishikawa); setNotice('Análise de causa raiz 6M salva no banco real.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao salvar Ishikawa.') }
    finally { setBusy(false) }
  }

  const createAction = async () => {
    if (!selected) return
    if (!action.oQue.trim() || !action.quem.trim() || !action.prazo || !action.responsavel) { setError('O quê, quem, prazo e responsável são obrigatórios.'); return }
    setBusy(true); setError(''); setNotice('')
    try {
      const actionRow = { id: crypto.randomUUID(), tipo: action.tipo, oQue: action.oQue.trim(), porQue: action.porQue.trim() || null, onde: action.onde.trim() || null, quem: action.quem.trim(), quando: action.quando || action.prazo, como: action.como.trim() || null, quanto: Number(action.quanto || 0), causa: action.causa.trim() || null, responsavel: action.responsavel, prazo: action.prazo }
      const existing = await supabase.from('qualidade_rnc_capa').select('id,plano_5w2h').eq('empresa_id', companyId).eq('rpnc_id', selected.id).maybeSingle()
      if (existing.error) throw existing.error
      if (existing.data) {
        const currentPlan = Array.isArray(existing.data.plano_5w2h) ? existing.data.plano_5w2h : []
        const updated = await supabase.from('qualidade_rnc_capa').update({ plano_5w2h: [...currentPlan, actionRow], ishikawa: sixM, status: 'em_execucao' }).eq('empresa_id', companyId).eq('id', existing.data.id)
        if (updated.error) throw updated.error
      } else {
        const source = String(selected.origem || '').toLowerCase()
        const capa = await supabase.from('qualidade_rnc_capa').insert({ empresa_id: companyId, rpnc_id: selected.id, codigo: 'CAPA-' + selected.numero_rpnc, origem: source === 'cliente' ? 'cliente' : source === 'fornecedor' ? 'fornecedor' : 'interna', descricao: selected.descricao_nao_conformidade, ishikawa: sixM, plano_5w2h: [actionRow], status: 'em_execucao' })
        if (capa.error) throw capa.error
      }
      setAction({ tipo: 'Corretiva', oQue: '', porQue: '', onde: '', quem: '', quando: '', como: '', quanto: '0', causa: '', responsavel: '', prazo: '' })
      setNotice('Plano CAPA / 5W2H registrado.'); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao registrar ação CAPA.') }
    finally { setBusy(false) }
  }

  const uploadPdf = async (doc: Doc, file: File) => {
    if (file.type && file.type !== 'application/pdf') { setError('Somente PDF é aceito pelo GED.'); return }
    if (!file.name.toLowerCase().endsWith('.pdf')) { setError('O arquivo precisa ter extensão PDF.'); return }
    setBusy(true); setError(''); setNotice('')
    let uploadedPath: string | null = null
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_')
      const path = companyId + '/documentos/' + doc.id + '/' + Date.now() + '-' + safeName
      const upload = await supabase.storage.from('erp-qualidade-anexos').upload(path, file, { upsert: false, contentType: 'application/pdf' })
      if (upload.error) throw upload.error
      uploadedPath = path

      const auth = await supabase.auth.getUser()
      if (auth.error || !auth.data.user) throw auth.error ?? new Error('Sessão não autenticada.')
      const profile = await supabase.from('erp_usuarios').select('id').eq('auth_user_id', auth.data.user.id).eq('empresa_id', companyId).eq('ativo', true).is('deleted_at', null).maybeSingle()
      if (profile.error || !profile.data?.id) throw profile.error ?? new Error('Usuário ERP ativo não encontrado.')

      const saved = await supabase.rpc('erp_documento_qualidade_anexo_substituir', {
        p_documento_id: doc.id,
        p_nome_arquivo: file.name,
        p_storage_path: path,
        p_tipo_mime: 'application/pdf',
        p_tamanho_bytes: file.size,
      })
      if (saved.error) throw saved.error
      uploadedPath = null
      setNotice('PDF registrado no GED: ' + doc.codigo + '. A revisão anterior do anexo foi preservada no histórico.')
      await load()
    } catch (cause) {
      if (uploadedPath) await supabase.storage.from('erp-qualidade-anexos').remove([uploadedPath])
      setError(cause instanceof Error ? cause.message : 'Falha ao anexar PDF no Storage.')
    } finally { setBusy(false) }
  }

  const openPdf = async (doc: Doc) => {
    if (!doc.pdf_storage_path) return
    const signed = await supabase.storage.from('erp-qualidade-anexos').createSignedUrl(doc.pdf_storage_path, 3600)
    if (signed.error) { setError(signed.error.message); return }
    if (signed.data?.signedUrl) window.open(signed.data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  const openAttachment = async (attachment: Attachment) => {
    const signed = await supabase.storage.from('erp-qualidade-anexos').createSignedUrl(attachment.storage_path, 3600)
    if (signed.error) { setError(signed.error.message); return }
    if (signed.data?.signedUrl) window.open(signed.data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <main className="min-h-screen bg-[#F4FBFD] text-[#123B50]"><div className="mx-auto max-w-[1800px] space-y-3 p-3"><QualitySidebar active={location.pathname} /><div className="sgq-compact">
      <div className="sgq-compact">
        {location.pathname === '/vendas/sgq' && <div className="sgq-tabs">
          <button className={tab === 'rnc' ? 'active' : ''} type="button" onClick={() => setTab('rnc')}><ShieldCheck size={13}/> 01 · RNC / ISHIKAWA 6M</button>
          <button className={tab === 'capa' ? 'active' : ''} type="button" onClick={() => setTab('capa')}><CheckCircle2 size={13}/> 02 · CAPA / 5W2H</button>
          <button className={tab === 'ishikawa' ? 'active' : ''} type="button" onClick={() => setTab('ishikawa')}><FileText size={13}/> 03 · ISHIKAWA</button>
          <button className={tab === 'ged' ? 'active' : ''} type="button" onClick={() => setTab('ged')}><FileText size={13}/> 04 · GED</button>
          <button className="refresh" type="button" onClick={() => void load()} disabled={busy}><RefreshCw size={13}/> ATUALIZAR</button>
        </div>}
        {(error || notice) && <div className={error ? 'sgq-message error' : 'sgq-message'}>{error || notice}</div>}

        {tab === 'rnc' && <section className="sgq-panel">
          <div className="sgq-grid sgq-grid-5">
            <label className={label}>Código RNC<input className={field(false)} readOnly value={selected?.numero_rpnc ?? 'Gerado pelo banco'} /></label>
            <label className={label}>Origem<select className={field(false)} value={origin} onChange={(e) => setOrigin(e.target.value)}><option>Cliente</option><option>Processo</option><option>Fornecedor</option></select></label>
            <label className={label}>Setor responsável<select className={field(!sectorId)} value={sectorId} onChange={(e) => setSectorId(e.target.value)}><option value="">Preencher...</option>{sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.nome}</option>)}</select></label>
            <label className={label}>Lote afetado<input className={field(!lot && !selected)} value={lot} onChange={(e) => setLot(e.target.value)} placeholder="Preencher..." /></label>
            <label className={label}>Qtd. segregada<input className={field(false)} type="number" min="0" value={segregated} onChange={(e) => setSegregated(e.target.value)} /></label>
          </div>
          <div className="sgq-save-row"><button className={btn} type="button" disabled={busy} onClick={() => void openRnc()}><Save size={13}/> ABRIR RNC</button></div>
          <label className={label + ' sgq-mt'}>Descrição detalhada da falha<textarea className="sgq-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Preencher..." /></label>
          <div className="sgq-grid sgq-grid-6 sgq-mt">
            {(['metodo','mao_de_obra','material','maquina','meio_ambiente','medicao'] as const).map((key) => <label className={label} key={key}>{key === 'mao_de_obra' ? 'Mão de obra' : key === 'meio_ambiente' ? 'Meio ambiente' : key.replace('_',' ')}<input className={field(false)} value={sixM[key]} onChange={(e) => setSixM({ ...sixM, [key]: e.target.value })} placeholder="Preencher..." /></label>)}
          </div>
          <div className="sgq-save-row"><button className={btn} type="button" disabled={!selected || busy} onClick={() => void saveSixM()}><Save size={13}/> SALVAR 6M</button></div>
          <div className="sgq-grid sgq-grid-5 sgq-mt">
            <label className={label}>Pesquisar RNC<input className={field(false)} value={registrySearch} onChange={e => setRegistrySearch(e.target.value)} placeholder="Número, defeito, lote ou origem"/></label>
            <label className={label}>Situação<select className={field(false)} value={registryStatus} onChange={e => setRegistryStatus(e.target.value)}><option value="TODAS">Todas as situações</option><option value="ABERTAS">Em aberto / andamento</option><option value="FECHADAS">Fechadas</option></select></label>
            <label className={label}>Origem / tipo<select className={field(false)} value={registryOrigin} onChange={e => setRegistryOrigin(e.target.value)}><option value="TODAS">Todas as origens</option><option value="CLIENTE">Reclamação de cliente</option><option value="AUDITORIA">Auditoria interna</option><option value="INTERNA">Processo interno</option><option value="FORNECEDOR">Fornecedor</option></select></label>
            <div className="rounded-[2px] border border-slate-200 bg-[#F4FBFD] p-2"><span className="text-[9px] font-bold uppercase text-slate-500">Registros encontrados</span><div className="text-base font-bold text-[#123B50]">{filteredRncs.length} / {rncs.length}</div></div>
            <div className="rounded-[2px] border border-slate-200 bg-[#F4FBFD] p-2"><span className="text-[9px] font-bold uppercase text-slate-500">Abertas / fechadas</span><div className="text-base font-bold text-[#123B50]">{openCount} / {closedCount}</div></div>
          </div>
          <div className="sgq-table"><table><thead><tr><th>RNC / RPNC</th><th>Origem</th><th>Lote</th><th>Qtd. segregada</th><th>Status / andamento</th></tr></thead><tbody>{filteredRncs.map((row) => <tr key={row.id} className={row.id === selectedRnc ? 'selected' : ''} onClick={() => setSelectedRnc(row.id)}><td>{row.numero_rpnc}</td><td>{row.origem || '—'}</td><td>{row.lote_producao || '—'}</td><td className="num">{row.quantidade_segregada}</td><td>{row.status}</td></tr>)}{filteredRncs.length === 0 && <tr><td colSpan={5}>Nenhuma não conformidade corresponde aos filtros.</td></tr>}</tbody></table></div>
        </section>}

        {tab === 'ishikawa' && <section className="sgq-panel ishikawa-print-area">
          <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } body * { visibility: hidden !important; } .ishikawa-print-area, .ishikawa-print-area * { visibility: visible !important; } .ishikawa-print-area { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; border: 0 !important; box-shadow: none !important; padding: 0 !important; } .ishikawa-no-print { display: none !important; } .ishikawa-svg { width: 100% !important; max-height: 175mm !important; } .ishikawa-print-caption { display: block !important; } } .ishikawa-print-caption { display:none; }`}</style>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div><p className="text-[10px] font-bold uppercase tracking-wide text-[#2D8DB8]">SGQ · Análise de causa raiz</p><h2 className="text-base font-bold">Diagrama de Ishikawa — Espinha de Peixe (6M)</h2><p className="text-xs text-slate-600">RNC: {selected?.numero_rpnc ?? 'Selecione uma não conformidade'} · {selected?.lote_producao ?? 'Lote não informado'}</p></div>
            <div className="ishikawa-no-print flex flex-wrap gap-2"><button type="button" className={btn} disabled={!selected || busy} onClick={() => void saveSixM()}><Save size={13}/> SALVAR DIAGRAMA</button><button type="button" className={btn} onClick={() => window.print()}><FileText size={13}/> IMPRIMIR / PDF</button></div>
          </div>
          <label className={label + ' mt-3'}>Efeito / problema principal<textarea className="sgq-textarea" readOnly value={selected?.descricao_nao_conformidade ?? ''} placeholder="Selecione uma RNC para carregar o efeito." /></label>
          <div className="mt-3 overflow-x-auto rounded-[2px] border border-slate-200 bg-white p-2"><svg className="ishikawa-svg min-w-[900px]" viewBox="0 0 1400 520" role="img" aria-label="Diagrama de espinha de peixe Ishikawa com seis categorias de causas">
            <defs><marker id="ishikawa-arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#2D8DB8" /></marker></defs>
            <path d="M70 260 H1110" stroke="#2D8DB8" strokeWidth="5" strokeLinecap="round" markerEnd="url(#ishikawa-arrow)" />
            <path d="M70 260 L35 235 L35 285 Z" fill="#123B50" />
            {fishboneCategories.map((category, index) => {
              const x = 180 + index * 145
              const top = category.side === 'top'
              const endX = x - 85
              const endY = top ? 95 : 425
              const causes = fishboneCauseList(sixM[category.key])
              const labelX = top ? endX - 8 : endX - 8
              const causeY = top ? Math.max(28, endY - Math.max(1, causes.length) * 17 - 28) : endY + 35
              return <g key={category.key}>
                <path d={`M ${x} 260 L ${endX} ${endY}`} stroke="#123B50" strokeWidth="3" strokeLinecap="round" />
                <text x={labelX} y={top ? endY - 12 : endY + 20} textAnchor="middle" fontSize="15" fontWeight="700" fill="#123B50">{category.title}</text>
                {causes.slice(0, 12).map((cause, causeIndex) => <text key={causeIndex} x={labelX} y={causeY + causeIndex * 16} textAnchor="middle" fontSize="12" fill="#334155">{cause.length > 25 ? cause.slice(0, 23) + '…' : cause}</text>)}
              </g>
            })}
            <path d="M 1108 260 C 1150 207 1230 190 1305 235 L 1355 205 L 1342 260 L 1355 315 L 1305 285 C 1230 330 1150 313 1108 260 Z" fill="#EAF5F9" stroke="#2D8DB8" strokeWidth="2.5" strokeLinejoin="round" />
            <circle cx="1292" cy="239" r="5" fill="#123B50" />
            <path d="M 1335 260 L 1352 260" stroke="#123B50" strokeWidth="2" strokeLinecap="round" />
            <text x="1205" y="232" textAnchor="middle" fontSize="12" fontWeight="700" fill="#123B50">EFEITO / PROBLEMA</text>
            {(selected?.descricao_nao_conformidade ?? 'Selecione uma RNC').match(/.{1,26}(?:\s|$)/g)?.slice(0, 3).map((line, index) => <text key={index} x="1205" y={255 + index * 18} textAnchor="middle" fontSize="12" fill="#123B50">{line.trim()}</text>)}
            <text x="70" y="310" fontSize="11" fill="#64748b">CAUSAS</text>
          </svg></div>
          <p className="ishikawa-print-caption mt-2 text-[10px] text-slate-600">Documento de análise de causa raiz gerado pelo SGQ ERP Industrial. Confirmar causas e evidências antes da aprovação.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{fishboneCategories.map((category) => { const causes = sixM[category.key].split("\n"); const updateCause = (index: number, value: string) => { const next = [...causes]; next[index] = value; setSixM({ ...sixM, [category.key]: next.join("\n") }); }; return <section key={category.key} className="grid content-start gap-2 rounded-[2px] border border-slate-200 bg-[#F8FBFC] p-2"><label className={label}>{category.title}<span className="text-[10px] font-normal normal-case text-slate-500">Informe cada causa em um campo separado; use Adicionar causa para ampliar a análise.</span></label>{causes.map((cause, index) => <div key={`${category.key}-${index}`} className="grid gap-1"><label className={label}>{category.title} {index + 1}<textarea className="sgq-textarea min-h-[110px]" value={cause} onChange={(e) => updateCause(index, e.target.value)} placeholder={`Descreva a causa ${index + 1} com detalhes...`} /></label>{causes.length > 1 && <button type="button" className={btn + " justify-self-end"} onClick={() => setSixM({ ...sixM, [category.key]: causes.filter((_, i) => i !== index).join("\n") })}>Remover causa</button>}</div>)}<button type="button" className={btn + " justify-self-start"} onClick={() => setSixM({ ...sixM, [category.key]: [...causes, ""].join("\n") })}>+ Adicionar causa</button><span className="text-[10px] font-normal normal-case text-slate-500">{fishboneCauseList(sixM[category.key]).length} causa(s) listada(s)</span></section>})}</div>
          <div className="ishikawa-no-print sgq-save-row"><button className={btn} type="button" disabled={!selected || busy} onClick={() => void saveSixM()}><Save size={13}/> SALVAR CAUSAS NO SGQ</button><label className={label}>Selecionar RNC para análise<select className={field(false)} value={selectedRnc} onChange={(e) => setSelectedRnc(e.target.value)}><option value="">Selecionar...</option>{rncs.map((row) => <option key={row.id} value={row.id}>{row.numero_rpnc} · {row.lote_producao || 'sem lote'}</option>)}</select></label></div>
        </section>}

        {tab === 'capa' && <section className="sgq-panel">
          <div className="sgq-grid sgq-grid-5">
            <label className={label}>RNC<select className={field(false)} value={selectedRnc} onChange={(e) => setSelectedRnc(e.target.value)}><option value="">Preencher...</option>{rncs.map((row) => <option key={row.id} value={row.id}>{row.numero_rpnc} · {row.lote_producao || 'sem lote'}</option>)}</select></label>
            <label className={label}>O quê<input className={field(!action.oQue)} value={action.oQue} onChange={(e) => setAction({ ...action, oQue: e.target.value })} placeholder="Preencher..." /></label>
            <label className={label}>Por quê<input className={field(false)} value={action.porQue} onChange={(e) => setAction({ ...action, porQue: e.target.value })} placeholder="Preencher..." /></label>
            <label className={label}>Onde<input className={field(false)} value={action.onde} onChange={(e) => setAction({ ...action, onde: e.target.value })} placeholder="Preencher..." /></label>
            <label className={label}>Quem<input className={field(!action.quem)} value={action.quem} onChange={(e) => setAction({ ...action, quem: e.target.value })} placeholder="Preencher..." /></label>
          </div>
          <div className="sgq-grid sgq-grid-5 sgq-mt">
            <label className={label}>Quando<input className={field(false)} type="date" value={action.quando} onChange={(e) => setAction({ ...action, quando: e.target.value })} /></label>
            <label className={label}>Como<input className={field(false)} value={action.como} onChange={(e) => setAction({ ...action, como: e.target.value })} placeholder="Preencher..." /></label>
            <label className={label}>Quanto custa<input className={field(false)} type="number" min="0" step="0.01" value={action.quanto} onChange={(e) => setAction({ ...action, quanto: e.target.value })} /></label>
            <label className={label}>Responsável<select className={field(!action.responsavel)} value={action.responsavel} onChange={(e) => setAction({ ...action, responsavel: e.target.value })}><option value="">Preencher...</option>{users.map((user) => <option key={user.id} value={user.id}>{user.nome || user.email || user.id}</option>)}</select></label>
            <label className={label}>Prazo<input className={field(!action.prazo)} type="date" value={action.prazo} onChange={(e) => setAction({ ...action, prazo: e.target.value })} /></label>
          </div>
          <div className="sgq-grid sgq-grid-2 sgq-mt"><label className={label}>Causa raiz<input className={field(false)} value={action.causa} onChange={(e) => setAction({ ...action, causa: e.target.value })} placeholder="Preencher..." /></label><div className="sgq-action"><button className={btn} type="button" disabled={!selected || busy} onClick={() => void createAction()}><Save size={13}/> REGISTRAR AÇÃO</button></div></div>
          <div className="sgq-table sgq-mt"><table><thead><tr><th>O quê</th><th>Por quê</th><th>Onde</th><th>Quem</th><th>Quando</th><th>Como</th><th>Quanto</th><th>Status</th></tr></thead><tbody>{selectedActions.map((row) => <tr key={row.id}><td>{row.acao_o_que || row.descricao}</td><td>{row.acao_por_que || '—'}</td><td>{row.acao_onde || '—'}</td><td>{row.acao_quem || '—'}</td><td>{row.acao_quando || row.prazo}</td><td>{row.acao_como || '—'}</td><td className="num">{row.acao_quanto ?? 0}</td><td>{row.status}</td></tr>)}</tbody></table></div>
        </section>}

        {tab === 'ged' && <section className="sgq-panel">
          <div className="sgq-table"><table><thead><tr><th>Código</th><th>Nome do documento</th><th>Tipo</th><th>Rev.</th><th>Última revisão</th><th>Elaborado por</th><th>PDF Storage</th><th>Ação</th></tr></thead><tbody>{docs.map((doc) => <tr key={doc.id}><td>{doc.codigo}</td><td>{doc.titulo}</td><td>{doc.tipo || '—'}</td><td className="num">{doc.revisao}</td><td>{doc.data_revisao ? new Date(doc.data_revisao).toLocaleDateString('pt-BR') : '—'}</td><td>{doc.preparado_por || '—'}</td><td>{doc.pdf_storage_path ? <button className="link-btn" type="button" onClick={() => void openPdf(doc)}>ABRIR PDF REAL</button> : 'SEM PDF'}</td><td><label className={btn + ' cursor-pointer'}><Upload size={13}/> ANEXAR PDF<input className="hidden" type="file" accept="application/pdf" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadPdf(doc, file); e.currentTarget.value = '' }} /></label></td></tr>)}</tbody></table></div>
          <h3 className="mt-3 text-[11px] font-bold uppercase tracking-wide">Histórico de revisões de PDF</h3>
          <div className="sgq-table"><table><thead><tr><th>Documento</th><th>Revisão</th><th>Arquivo</th><th>Status</th><th>Data</th><th>Ação</th></tr></thead><tbody>{docAttachments.map((attachment) => { const doc = docs.find(item => item.id === attachment.documento_id); return <tr key={attachment.id}><td>{doc?.codigo || '—'}</td><td className="num">{attachment.revisao}</td><td>{attachment.nome_arquivo}</td><td>{attachment.status}</td><td>{attachment.criado_em ? new Date(attachment.criado_em).toLocaleString('pt-BR') : '—'}</td><td><button className="link-btn" type="button" onClick={() => void openAttachment(attachment)}>ABRIR VERSÃO</button></td></tr>})}</tbody></table></div>
        </section>}
      </div>
      <style>{`
        .sgq-compact{padding:8px;background:#f4f7fe}.sgq-tabs{display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin-bottom:6px}.sgq-tabs button{height:30px;display:inline-flex;align-items:center;gap:4px;padding:0 9px;border:1px solid #cbd5e1;border-radius:2px;background:#fff;color:#123b50;font-size:10px;font-weight:500}.sgq-tabs button.active,.sgq-tabs button.refresh{background:#2d8db8;border-color:#2d8db8;color:#fff}.sgq-tabs .refresh{margin-left:auto}.sgq-panel{border:1px solid #cbd5e1;background:#fff;border-radius:2px;padding:8px}.sgq-grid{display:grid;gap:6px}.sgq-grid-5{grid-template-columns:1fr 1fr 1fr .8fr 1fr}.sgq-grid-6{grid-template-columns:repeat(6,minmax(0,1fr))}.sgq-grid-2{grid-template-columns:2fr 1fr}.sgq-mt{margin-top:6px}.sgq-action{display:flex;align-items:end}.sgq-save-row{display:flex;justify-content:flex-end;margin-top:6px}.sgq-textarea{width:100%;min-height:60px;padding:5px 7px;border:1px solid #cbd5e1;border-radius:2px;font-size:12px;outline:none;resize:vertical}.sgq-textarea:focus{border-color:#2d8db8}.sgq-table{overflow:auto;border:1px solid #dbe3e8;margin-top:6px}.sgq-table table{width:100%;border-collapse:collapse;font-size:10px}.sgq-table th,.sgq-table td{height:28px;padding:3px 6px;border-bottom:1px solid #e2e8f0;white-space:nowrap;text-align:left}.sgq-table th{background:#f1f5f9;color:#475569;font-size:9px;font-weight:500;text-transform:uppercase}.sgq-table td.num{text-align:right;font-variant-numeric:tabular-nums}.sgq-table tr.selected{background:#e8f5fb}.link-btn{height:26px;border:1px solid #2d8db8;border-radius:2px;background:#fff;color:#2d8db8;padding:0 7px;font-size:9px;font-weight:500}.sgq-message{margin-bottom:6px;padding:6px 8px;border:1px solid #b7d8e5;background:#f4fbfd;color:#17445a;font-size:10px}.sgq-message.error{border-color:#fca5a5;background:#fff1f2;color:#991b1b}@media(max-width:1000px){.sgq-grid-5{grid-template-columns:repeat(3,minmax(0,1fr))}.sgq-grid-6{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:650px){.sgq-grid-5,.sgq-grid-6,.sgq-grid-2{grid-template-columns:1fr}.sgq-tabs .refresh{margin-left:0}}
      `}</style>
    </div></div></main>
  )
}