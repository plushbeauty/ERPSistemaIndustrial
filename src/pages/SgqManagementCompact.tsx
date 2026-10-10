import { useCallback, useEffect, useState } from 'react'
import { FileText, RefreshCw, Save, ShieldCheck, Upload, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import QualitySidebar from '../components/quality/QualitySidebar'

type Rpn = { id: string; numero_rpnc: string; descricao_nao_conformidade: string; sgq_origem: string; sgq_severidade: string; lote_afetado: string | null; quantidade_segregada: number; status: string; criado_em: string }
type Ishikawa = { id: string; rpnc_id: string; metodo: string | null; mao_de_obra: string | null; material: string | null; maquina: string | null; meio_ambiente: string | null; medicao: string | null }
type Capa = { id: string; rpnc_id: string; tipo: string; descricao: string; causa_raiz: string | null; responsavel_id: string; prazo: string; status: string; acao_o_que: string | null; acao_por_que: string | null; acao_onde: string | null; acao_quem: string | null; acao_quando: string | null; acao_como: string | null; acao_quanto: number | null }
type User = { id: string; nome: string | null; email: string | null }
type Sector = { id: string; nome: string }
type Doc = { id: string; codigo: string; titulo: string; tipo: string | null; revisao: number; data_revisao: string | null; preparado_por: string | null; pdf_storage_path: string | null; status: string }

const field = (bad = false) => `h-[30px] w-full rounded-[2px] border px-2 text-[12px] outline-none ${bad ? 'border-red-500 bg-red-50/50 placeholder:text-red-400' : 'border-slate-300 bg-white focus:border-[#2D8DB8]'}`
const label = 'grid gap-[2px] text-[9px] font-medium uppercase text-slate-600'
const btn = 'inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-medium text-white'

export default function SgqManagementCompact() {
  const [tab, setTab] = useState<'rnc' | 'capa' | 'ged'>('rnc')
  const [companyId, setCompanyId] = useState('')
  const [rncs, setRncs] = useState<Rpn[]>([])
  const [ishikawa, setIshikawa] = useState<Ishikawa | null>(null)
  const [actions, setActions] = useState<Capa[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [selectedRnc, setSelectedRnc] = useState('')
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
      const [r, a, u, s, d] = await Promise.all([
        supabase.from('erp_rpnc').select('id,numero_rpnc,descricao_nao_conformidade,sgq_origem,sgq_severidade,lote_afetado,quantidade_segregada,status,criado_em').eq('empresa_id', id).not('sgq_origem', 'is', null).order('criado_em', { ascending: false }).limit(500),
        supabase.from('erp_sgq_capa_acoes').select('id,rpnc_id,tipo,descricao,causa_raiz,responsavel_id,prazo,status,acao_o_que,acao_por_que,acao_onde,acao_quem,acao_quando,acao_como,acao_quanto').eq('empresa_id', id).order('created_at', { ascending: false }).limit(500),
        supabase.from('erp_usuarios').select('id,nome,email').eq('empresa_id', id).eq('ativo', true).is('deleted_at', null).order('nome').limit(500),
        supabase.from('erp_setores').select('id,nome').eq('empresa_id', id).eq('ativo', true).order('nome').limit(500),
        supabase.from('erp_documentos_qualidade').select('id,codigo,titulo,tipo,revisao,data_revisao,preparado_por,pdf_storage_path,status').eq('empresa_id', id).order('codigo').limit(500),
      ])
      if (r.error || a.error || u.error || s.error || d.error) throw r.error ?? a.error ?? u.error ?? s.error ?? d.error
      setRncs((r.data ?? []) as Rpn[]); setActions((a.data ?? []) as Capa[]); setUsers((u.data ?? []) as User[]); setSectors((s.data ?? []) as Sector[]); setDocs((d.data ?? []) as Doc[])
      if (!selectedRnc && r.data?.[0]) setSelectedRnc(r.data[0].id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar SGQ.')
    } finally { setBusy(false) }
  }, [selectedRnc])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!selectedRnc || !companyId) { setIshikawa(null); return }
    void (async () => {
      const result = await supabase.from('erp_sgq_rpnc_ishikawa').select('id,rpnc_id,metodo,mao_de_obra,material,maquina,meio_ambiente,medicao').eq('empresa_id', companyId).eq('rpnc_id', selectedRnc).maybeSingle()
      if (!result.error) {
        setIshikawa(result.data as Ishikawa | null)
        if (result.data) setSixM({ metodo: result.data.metodo ?? '', mao_de_obra: result.data.mao_de_obra ?? '', material: result.data.material ?? '', maquina: result.data.maquina ?? '', meio_ambiente: result.data.meio_ambiente ?? '', medicao: result.data.medicao ?? '' })
      }
    })()
  }, [selectedRnc, companyId])

  const selected = rncs.find((rnc) => rnc.id === selectedRnc) ?? null
  const selectedActions = actions.filter((item) => item.rpnc_id === selectedRnc)

  const openRnc = async () => {
    setError(''); setNotice('')
    if (!description.trim()) { setError('Descrição detalhada da falha é obrigatória.'); return }
    if (!lot.trim()) { setError('Lote afetado é obrigatório.'); return }
    setBusy(true)
    if (!sectorId) { setError('Setor responsável é obrigatório.'); return }
    setBusy(true)
    try {
      const lotResult = await supabase.from('erp_estoque_lotes').select('id').eq('empresa_id', companyId).or(`lote_interno.eq.${lot.trim()},lote_fornecedor.eq.${lot.trim()}`).maybeSingle()
      if (lotResult.error) throw lotResult.error
      if (!lotResult.data) throw new Error('Lote afetado não encontrado na empresa atual.')
      const result = await supabase.rpc('erp_sgq_abrir_rpnc', {
        p_descricao: description.trim(), p_origem: origin, p_severidade: 'Menor', p_setor_id: sectorId,
        p_linked_entity_type: 'lote', p_linked_entity_id: lotResult.data.id,
      })
      if (result.error) throw result.error
      if (!result.data || typeof result.data !== 'object' || !('id' in result.data)) throw new Error('A abertura da RNC não retornou o registro.')
      const createdId = String(result.data.id)
      const update = await supabase.from('erp_rpnc').update({ lote_afetado: lot.trim(), quantidade_segregada: Number(segregated || 0) }).eq('id', createdId).eq('empresa_id', companyId)
      if (update.error) throw update.error
      setSelectedRnc(createdId); setDescription(''); setLot(''); setSegregated('0'); setNotice('RNC aberta no banco real com lote e quantidade segregada.'); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao abrir RNC.') }
    finally { setBusy(false) }
  }

  const saveSixM = async () => {
    if (!selected) return
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await supabase.from('erp_sgq_rpnc_ishikawa').upsert({ empresa_id: companyId, rpnc_id: selected.id, ...sixM }, { onConflict: 'empresa_id,rpnc_id' }).select('id,rpnc_id,metodo,mao_de_obra,material,maquina,meio_ambiente,medicao').single()
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
      const result = await supabase.from('erp_sgq_capa_acoes').insert({
        empresa_id: companyId, rpnc_id: selected.id, tipo: action.tipo, descricao: action.oQue.trim(), causa_raiz: action.causa.trim() || null,
        responsavel_id: action.responsavel, prazo: action.prazo, acao_o_que: action.oQue.trim(), acao_por_que: action.porQue.trim() || null,
        acao_onde: action.onde.trim() || null, acao_quem: action.quem.trim(), acao_quando: action.quando || action.prazo, acao_como: action.como.trim() || null, acao_quanto: Number(action.quanto || 0),
      })
      if (result.error) throw result.error
      setAction({ tipo: 'Corretiva', oQue: '', porQue: '', onde: '', quem: '', quando: '', como: '', quanto: '0', causa: '', responsavel: '', prazo: '' })
      setNotice('Plano CAPA / 5W2H registrado.'); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao registrar ação CAPA.') }
    finally { setBusy(false) }
  }

  const uploadPdf = async (doc: Doc, file: File) => {
    if (file.type !== 'application/pdf') { setError('Somente PDF é aceito pelo GED.'); return }
    setBusy(true); setError(''); setNotice('')
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_')
      const path = `${companyId}/${doc.id}/${Date.now()}-${safeName}`
      const upload = await supabase.storage.from('erp-documentos-qualidade').upload(path, file, { upsert: true, contentType: 'application/pdf' })
      if (upload.error) throw upload.error
      const update = await supabase.from('erp_documentos_qualidade').update({ pdf_storage_path: path }).eq('id', doc.id).eq('empresa_id', companyId)
      if (update.error) throw update.error
      setNotice(`PDF real anexado ao GED: ${doc.codigo}.`); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao anexar PDF no Storage.') }
    finally { setBusy(false) }
  }

  const openPdf = async (doc: Doc) => {
    if (!doc.pdf_storage_path) return
    const signed = await supabase.storage.from('erp-documentos-qualidade').createSignedUrl(doc.pdf_storage_path, 3600)
    if (signed.error) { setError(signed.error.message); return }
    if (signed.data?.signedUrl) window.open(signed.data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <main className="min-h-screen bg-[#F4FBFD] p-3 text-[#123B50]"><div className="mx-auto max-w-[1800px] space-y-3"><QualitySidebar active="/qualidade/rnc" />
      <div className="sgq-compact">
        <div className="sgq-tabs">
          <button className={tab === 'rnc' ? 'active' : ''} type="button" onClick={() => setTab('rnc')}><ShieldCheck size={13}/> 01 · RNC / ISHIKAWA 6M</button>
          <button className={tab === 'capa' ? 'active' : ''} type="button" onClick={() => setTab('capa')}><CheckCircle2 size={13}/> 02 · CAPA / 5W2H</button>
          <button className={tab === 'ged' ? 'active' : ''} type="button" onClick={() => setTab('ged')}><FileText size={13}/> 03 · GED</button>
          <button className="refresh" type="button" onClick={() => void load()} disabled={busy}><RefreshCw size={13}/> ATUALIZAR</button>
        </div>
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
          <div className="sgq-table"><table><thead><tr><th>RNC</th><th>Origem</th><th>Lote</th><th>Segregada</th><th>Status</th></tr></thead><tbody>{rncs.map((row) => <tr key={row.id} className={row.id === selectedRnc ? 'selected' : ''} onClick={() => setSelectedRnc(row.id)}><td>{row.numero_rpnc}</td><td>{row.sgq_origem}</td><td>{row.lote_afetado || '—'}</td><td className="num">{row.quantidade_segregada}</td><td>{row.status}</td></tr>)}</tbody></table></div>
        </section>}

        {tab === 'capa' && <section className="sgq-panel">
          <div className="sgq-grid sgq-grid-5">
            <label className={label}>RNC<select className={field(false)} value={selectedRnc} onChange={(e) => setSelectedRnc(e.target.value)}><option value="">Preencher...</option>{rncs.map((row) => <option key={row.id} value={row.id}>{row.numero_rpnc} · {row.lote_afetado || 'sem lote'}</option>)}</select></label>
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
        </section>}
      </div>
      <style>{`
        .sgq-compact{padding:8px;background:#f4f7fe}.sgq-tabs{display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin-bottom:6px}.sgq-tabs button{height:30px;display:inline-flex;align-items:center;gap:4px;padding:0 9px;border:1px solid #cbd5e1;border-radius:2px;background:#fff;color:#123b50;font-size:10px;font-weight:500}.sgq-tabs button.active,.sgq-tabs button.refresh{background:#2d8db8;border-color:#2d8db8;color:#fff}.sgq-tabs .refresh{margin-left:auto}.sgq-panel{border:1px solid #cbd5e1;background:#fff;border-radius:2px;padding:8px}.sgq-grid{display:grid;gap:6px}.sgq-grid-5{grid-template-columns:1fr 1fr 1fr .8fr 1fr}.sgq-grid-6{grid-template-columns:repeat(6,minmax(0,1fr))}.sgq-grid-2{grid-template-columns:2fr 1fr}.sgq-mt{margin-top:6px}.sgq-action{display:flex;align-items:end}.sgq-save-row{display:flex;justify-content:flex-end;margin-top:6px}.sgq-textarea{width:100%;min-height:60px;padding:5px 7px;border:1px solid #cbd5e1;border-radius:2px;font-size:12px;outline:none;resize:vertical}.sgq-textarea:focus{border-color:#2d8db8}.sgq-table{overflow:auto;border:1px solid #dbe3e8;margin-top:6px}.sgq-table table{width:100%;border-collapse:collapse;font-size:10px}.sgq-table th,.sgq-table td{height:28px;padding:3px 6px;border-bottom:1px solid #e2e8f0;white-space:nowrap;text-align:left}.sgq-table th{background:#f1f5f9;color:#475569;font-size:9px;font-weight:500;text-transform:uppercase}.sgq-table td.num{text-align:right;font-variant-numeric:tabular-nums}.sgq-table tr.selected{background:#e8f5fb}.link-btn{height:26px;border:1px solid #2d8db8;border-radius:2px;background:#fff;color:#2d8db8;padding:0 7px;font-size:9px;font-weight:500}.sgq-message{margin-bottom:6px;padding:6px 8px;border:1px solid #b7d8e5;background:#f4fbfd;color:#17445a;font-size:10px}.sgq-message.error{border-color:#fca5a5;background:#fff1f2;color:#991b1b}@media(max-width:1000px){.sgq-grid-5{grid-template-columns:repeat(3,minmax(0,1fr))}.sgq-grid-6{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:650px){.sgq-grid-5,.sgq-grid-6,.sgq-grid-2{grid-template-columns:1fr}.sgq-tabs .refresh{margin-left:0}}
      `}</style>
    </div></main>
  )
}