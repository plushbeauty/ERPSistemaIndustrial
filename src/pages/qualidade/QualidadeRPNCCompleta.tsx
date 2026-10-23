import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { FileText, Plus, Printer, RefreshCw, Search, X, Save, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Destino = 'FORNECEDOR' | 'CLIENTE' | 'AUDITORIA_INTERNA' | 'AUDITORIA_EXTERNA' | 'PROCESSO' | 'PROCEDIMENTO'
type TabId = 'relato' | 'investigacao' | 'acoes' | 'eficacia'
type RPNC = {
  id: string
  numero_rpnc: string | null
  descricao_nao_conformidade: string | null
  origem: string | null
  gravidade: string | null
  status: string | null
  criado_em: string
  sgq_tipo_registro: string | null
  sgq_cliente_id: string | null
  sgq_produto_id: string | null
  sgq_ordem_producao_id: string | null
  sgq_lote: string | null
  sgq_data_ocorrencia: string | null
  quantidade_segregada: number | null
  sgq_responsavel_id: string | null
  sgq_contencao: string | null
  investigacao: string | null
  acao_corretiva: string | null
  sgq_acao_preventiva: string | null
  sgq_verificacao_eficacia: string | null
  sgq_data_prazo: string | null
}
type Props = { companyName?: string; logoUrl?: string }

const DESTINOS: { value: Destino; label: string; dbType: string; dbOrigin: string }[] = [
  { value: 'FORNECEDOR', label: 'Fornecedor', dbType: 'INTERNO', dbOrigin: 'fornecedor' },
  { value: 'CLIENTE', label: 'Cliente', dbType: 'RPNC_CLIENTE', dbOrigin: 'cliente' },
  { value: 'AUDITORIA_INTERNA', label: 'Auditoria Interna', dbType: 'AUDITORIA_INTERNA', dbOrigin: 'auditoria interna' },
  { value: 'AUDITORIA_EXTERNA', label: 'Auditoria Externa', dbType: 'AUDITORIA_EXTERNA', dbOrigin: 'auditoria externa' },
  { value: 'PROCESSO', label: 'Processo', dbType: 'RPNC_PROCESSO', dbOrigin: 'processo' },
  { value: 'PROCEDIMENTO', label: 'Procedimento', dbType: 'RPNC_PROCESSO', dbOrigin: 'procedimento' },
]
const TABS: { id: TabId; title: string }[] = [
  { id: 'relato', title: '1. Relato e identificação' },
  { id: 'investigacao', title: '2. Investigação e Ishikawa' },
  { id: 'acoes', title: '3. Contenção e plano de ação' },
  { id: 'eficacia', title: '4. Eficácia e padronização' },
]
const M6 = ['Método', 'Máquina', 'Mão de obra', 'Material', 'Medição', 'Meio ambiente'] as const
type M6Key = (typeof M6)[number]
type Form = {
  destino: Destino; destinatario: string; data: string; gravidade: string; descricao: string
  produto: string; op: string; lote: string; quantidade: string; clienteId: string; responsavel: string; prazo: string
  conten: string; causas: Record<M6Key, string>; whys: string[]; corretiva: string; preventiva: string
  eficacia: string; padronizacao: string
}
const localDate = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const emptyForm = (): Form => ({
  destino: 'FORNECEDOR', destinatario: '', data: localDate(), gravidade: 'Menor', descricao: '',
  produto: '', op: '', lote: '', quantidade: '', clienteId: '', responsavel: '', prazo: '', conten: '',
  causas: { Método: '', Máquina: '', 'Mão de obra': '', Material: '', Medição: '', 'Meio ambiente': '' },
  whys: ['', '', '', '', ''], corretiva: '', preventiva: '', eficacia: '', padronizacao: '',
})
const baseInput: CSSProperties = { width: '100%', minWidth: 0, height: 32, padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: 2, color: '#123B50', background: '#fff', fontSize: 12, boxSizing: 'border-box' }
const labelStyle: CSSProperties = { display: 'block', marginBottom: 4, color: '#526d79', fontSize: 9, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase' }
const panel: CSSProperties = { background: '#fff', border: '1px solid #d5e2e7', borderRadius: 3, padding: 12 }
const buttonStyle: CSSProperties = { height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px solid #c7d7df', borderRadius: 2, padding: '0 10px', color: '#123B50', background: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
const escapeHtml = (value: unknown) => String(value ?? '—').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char))
const formatDate = (value: string | null | undefined) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '—'
const shortType = (row: RPNC) => {
  const origin = (row.origem || '').toLowerCase()
  if (origin.includes('fornecedor')) return 'Fornecedor'
  if (origin.includes('procedimento')) return 'Procedimento'
  if (origin.includes('processo')) return 'Processo'
  if (row.sgq_tipo_registro === 'RPNC_CLIENTE') return 'Cliente'
  if (row.sgq_tipo_registro === 'AUDITORIA_INTERNA') return 'Auditoria Interna'
  if (row.sgq_tipo_registro === 'AUDITORIA_EXTERNA') return 'Auditoria Externa'
  return 'Interno'
}
const detailsFromNote = (note: string | null) => {
  const read = (key: string) => {
    const match = (note || '').match(new RegExp(`^${key}:\\s*(.*)$`, 'mi'))
    return match?.[1]?.trim() || ''
  }
  return { destinatario: read('Destinatário'), causas: note || '' }
}

export default function QualidadeRPNCCompleta({ companyName = 'SYSNQRA', logoUrl }: Props) {
  const [rows, setRows] = useState<RPNC[]>([])
  const [selected, setSelected] = useState<RPNC | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<TabId>('relato')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('TODOS')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState<Form>(emptyForm)
  const setField = <K extends keyof Form>(key: K, value: Form[K]) => setForm(current => ({ ...current, [key]: value }))

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const { data: companyId, error: companyError } = await supabase.rpc('erp_current_empresa_id')
      if (companyError || !companyId) throw companyError || new Error('Não foi possível identificar a empresa da sessão.')
      const { data, error: queryError } = await supabase.from('erp_rpnc')
        .select('id,numero_rpnc,descricao_nao_conformidade,origem,gravidade,status,criado_em,sgq_tipo_registro,sgq_cliente_id,sgq_produto_id,sgq_ordem_producao_id,sgq_lote,sgq_data_ocorrencia,quantidade_segregada,sgq_responsavel_id,sgq_contencao,investigacao,acao_corretiva,sgq_acao_preventiva,sgq_verificacao_eficacia,sgq_data_prazo')
        .eq('empresa_id', String(companyId)).order('criado_em', { ascending: false }).limit(500)
      if (queryError) throw queryError
      setRows((data || []) as RPNC[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar RPNCs. Verifique sessão, RLS e schema.')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const visible = useMemo(() => rows.filter(row => {
    const matchesQuery = !query.trim() || [row.numero_rpnc, row.descricao_nao_conformidade, row.origem, row.sgq_lote]
      .some(value => String(value || '').toLowerCase().includes(query.toLowerCase()))
    return matchesQuery && (statusFilter === 'TODOS' || (row.status || '').toLowerCase() === statusFilter)
  }), [rows, query, statusFilter])

  const createInvestigationText = () => {
    const sections = [
      `Destinatário: ${form.destinatario.trim() || 'Não informado'}`,
      'ANÁLISE DE CAUSAS — ISHIKAWA (6M)',
      ...M6.map(key => `${key}: ${form.causas[key].trim() || 'Não informado'}`),
      'ANÁLISE DOS 5 PORQUÊS',
      ...form.whys.map((why, index) => `${index + 1}º porquê: ${why.trim() || 'Não informado'}`),
      `Padronização: ${form.padronizacao.trim() || 'Não informado'}`,
    ]
    return sections.join('\n')
  }

  const save = async () => {
    setError(''); setNotice('')
    if (form.descricao.trim().length < 10) { setError('Descreva a não conformidade com pelo menos 10 caracteres.'); setTab('relato'); return }
    if (!form.responsavel.trim()) { setError('Informe o UUID do responsável cadastrado no ERP.'); setTab('relato'); return }
    if (!form.conten.trim()) { setError('Descreva a contenção imediata ou informe explicitamente que não se aplica.'); setTab('acoes'); return }
    if (!form.corretiva.trim()) { setError('Informe a ação corretiva ou registre que está em análise.'); setTab('acoes'); return }
    setSaving(true)
    try {
      const { data: companyId, error: companyError } = await supabase.rpc('erp_current_empresa_id')
      if (companyError || !companyId) throw companyError || new Error('Empresa da sessão não identificada.')
      const destination = DESTINOS.find(item => item.value === form.destino)!
      const number = `RPNC-${new Date().getFullYear()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`
      const { error: insertError } = await supabase.from('erp_rpnc').insert({
        empresa_id: String(companyId),
        numero_rpnc: number,
        descricao_nao_conformidade: form.descricao.trim(),
        origem: destination.dbOrigin,
        gravidade: form.gravidade.toLowerCase(),
        status: 'aberta',
        sgq_tipo_registro: destination.dbType,
        sgq_produto_id: form.produto.trim() || null,
        sgq_ordem_producao_id: form.op.trim() || null,
        sgq_lote: form.lote.trim() || null,
        sgq_data_ocorrencia: form.data || null,
        quantidade_segregada: form.quantidade ? Number(form.quantidade) : 0,
        sgq_cliente_id: form.destino === 'CLIENTE' && form.clienteId.trim() ? form.clienteId.trim() : null,
        sgq_responsavel_id: form.responsavel.trim(),
        sgq_data_prazo: form.prazo || null,
        sgq_contencao: form.conten.trim(),
        investigacao: createInvestigationText(),
        acao_corretiva: form.corretiva.trim(),
        sgq_acao_preventiva: form.preventiva.trim() || null,
        sgq_verificacao_eficacia: [form.eficacia.trim() && `Verificação: ${form.eficacia.trim()}`, `Padronização: ${form.padronizacao.trim() || 'Não informado'}`].filter(Boolean).join('\n') || null,
      })
      if (insertError) throw insertError
      setNotice('RPNC gravada no ERP. Revise o relatório antes de enviar ao destinatário.')
      setOpen(false); setTab('relato'); setForm(emptyForm()); await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível gravar a RPNC. Verifique permissões, RLS e campos aceitos pelo banco.')
    } finally { setSaving(false) }
  }

  const printReport = (row: RPNC) => {
    const w = window.open('', '_blank')
    if (!w) { setError('O navegador bloqueou a janela de impressão. Permita pop-ups para gerar o relatório.'); return }
    const info = detailsFromNote(row.investigacao)
    const logo = logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="Logo ${escapeHtml(companyName)}" />` : ''
    const metaRow = (label: string, value: unknown) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value || '—')}</td></tr>`
    const causeRows = M6.map(key => {
      const match = (row.investigacao || '').match(new RegExp(`^${key}:\\s*(.*)$`, 'mi'))
      return `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(match?.[1] || '—')}</td></tr>`
    }).join('')
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(row.numero_rpnc || 'RPNC')}</title><style>
      @page{size:A4;margin:14mm}*{box-sizing:border-box}body{font:10.5px Arial,sans-serif;color:#173b4d;margin:0;line-height:1.4}header{display:flex;align-items:center;gap:14px;border-bottom:3px solid #2d8db8;padding:0 0 10px;margin-bottom:12px}.logo{max-width:105px;max-height:58px;object-fit:contain}h1{font-size:19px;margin:0 0 4px;color:#123b50}.sub{font-size:9px;color:#617783}h2{margin:13px 0 5px;padding:5px 7px;background:#edf6f9;border-left:3px solid #2d8db8;font-size:11px;color:#123b50}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #cbd8de;text-align:left;vertical-align:top;padding:6px;white-space:pre-wrap;overflow-wrap:anywhere}th{width:25%;background:#f4f8fa;font-weight:700}.footer{margin-top:14px;font-size:8px;color:#617783}.sign{display:flex;gap:20px;margin-top:36px}.sign div{border-top:1px solid #637b85;padding-top:5px;width:50%;font-size:9px}@media print{.no-print{display:none}}
    </style></head><body><header>${logo}<div><div class="sub">${escapeHtml(companyName)} · SISTEMA DE GESTÃO DA QUALIDADE</div><h1>Relatório de Não Conformidade (RPNC)</h1><div>Código: <b>${escapeHtml(row.numero_rpnc || row.id)}</b> · Emissão: ${escapeHtml(new Date().toLocaleDateString('pt-BR'))}</div></div></header>
    <h2>1. Identificação e relato</h2><table>${metaRow('Destinatário', info.destinatario)}${metaRow('Tipo / origem', shortType(row))}${metaRow('Data da ocorrência', formatDate(row.sgq_data_ocorrencia))}${metaRow('Gravidade', row.gravidade)}${metaRow('Produto / OP / lote', `${row.sgq_produto_id || '—'} / ${row.sgq_ordem_producao_id || '—'} / ${row.sgq_lote || '—'} / ${row.quantidade_segregada ?? '—'} un.`)}${metaRow('Descrição da não conformidade', row.descricao_nao_conformidade)}</table>
    <h2>2. Contenção e investigação</h2><table>${metaRow('Contenção imediata', row.sgq_contencao)}${metaRow('Investigação / análise', row.investigacao)}</table>
    <h2>3. Análise de causas — Ishikawa (6M)</h2><table>${causeRows}</table>
    <h2>4. Ações e eficácia</h2><table>${metaRow('Ação corretiva', row.acao_corretiva)}${metaRow('Ação preventiva', row.sgq_acao_preventiva)}${metaRow('Verificação de eficácia / padronização', row.sgq_verificacao_eficacia)}${metaRow('Responsável (ID do ERP)', row.sgq_responsavel_id)}${metaRow('Prazo', formatDate(row.sgq_data_prazo))}${metaRow('Status', row.status)}</table>
    <div class="sign"><div>Responsável da Qualidade</div><div>Destinatário / aprovação (quando aplicável)</div></div><p class="footer">Documento de trabalho gerado pelo ERP. Revise dados, evidências e aprovações antes do envio externo. A impressão não equivale a assinatura digital certificada.</p>
    <script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`
    w.document.open(); w.document.write(html); w.document.close()
  }

  const Field = ({ title, children, span = 1 }: { title: string; children: ReactNode; span?: number }) => <label style={{ display: 'block', gridColumn: `span ${span}`, minWidth: 0 }}><span style={labelStyle}>{title}</span>{children}</label>
  const textArea = (value: string, onChange: (value: string) => void, rows = 3) => <textarea value={value} onChange={event => onChange(event.target.value)} rows={rows} style={{ ...baseInput, height: 'auto', minHeight: rows * 25, resize: 'vertical', lineHeight: 1.45 }} />
  const setCause = (key: M6Key, value: string) => setForm(current => ({ ...current, causas: { ...current.causas, [key]: value } }))
  const setWhy = (index: number, value: string) => setForm(current => ({ ...current, whys: current.whys.map((item, i) => i === index ? value : item) }))

  return <main style={{ minHeight: 'calc(100vh - 80px)', background: '#F4FBFD', padding: 12, color: '#123B50' }}>
    <div style={{ maxWidth: 1600, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderBottom: '1px solid #d2e2e8', paddingBottom: 12, marginBottom: 12 }}>
        <div><div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '.12em', color: '#2D8DB8' }}>{companyName} · SGQ · RPNC</div><h1 style={{ fontSize: 22, margin: '3px 0', fontWeight: 900 }}>Tratamento de Não Conformidade</h1><p style={{ margin: 0, fontSize: 11, color: '#617783' }}>Registro, análise de causa, ações e relatório para destinatários internos e externos.</p></div>
        <div style={{ display: 'flex', gap: 6 }}><button type="button" style={buttonStyle} onClick={() => void load()}><RefreshCw size={13} />{loading ? 'Atualizando…' : 'Atualizar'}</button><button type="button" style={{ ...buttonStyle, background: '#123B50', borderColor: '#123B50', color: '#fff' }} onClick={() => { setForm(emptyForm()); setError(''); setOpen(true) }}><Plus size={13} /> Nova RPNC</button></div>
      </header>
      {(error || notice) && <div role="alert" style={{ ...panel, marginBottom: 10, borderColor: error ? '#D65B61' : '#48B7C7', color: error ? '#a82f36' : '#176d70', fontSize: 11 }}>{error || notice}</div>}
      <section style={{ ...panel, marginBottom: 10, padding: 0, overflowX: 'auto' }}><div style={{ minWidth: 850, display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 0 }}>
        {[['REGISTROS', rows.length], ['EM ABERTO', rows.filter(row => !['encerrada', 'fechada', 'cancelada'].includes((row.status || '').toLowerCase())).length], ['CLIENTES', rows.filter(row => row.sgq_tipo_registro === 'RPNC_CLIENTE').length], ['AUDITORIAS', rows.filter(row => (row.sgq_tipo_registro || '').startsWith('AUDITORIA')).length]].map(([name, count]) => <div key={String(name)} style={{ padding: 12, borderRight: '1px solid #e4edf1', borderTop: '2px solid #2D8DB8' }}><div style={{ fontSize: 9, fontWeight: 900, color: '#627b86' }}>{name}</div><div style={{ fontSize: 22, fontWeight: 900, marginTop: 3 }}>{count}</div></div>)}
      </div></section>
      <section style={{ ...panel, display: 'grid', gridTemplateColumns: 'minmax(220px,1fr) 220px', gap: 8, marginBottom: 10 }}><label style={{ position: 'relative' }}><Search size={13} style={{ position: 'absolute', left: 8, top: 9, color: '#7a929d' }} /><input aria-label="Pesquisar RPNC" value={query} onChange={event => setQuery(event.target.value)} placeholder="Pesquisar código, descrição, origem ou lote…" style={{ ...baseInput, paddingLeft: 28 }} /></label><select aria-label="Filtrar por status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} style={baseInput}><option value="TODOS">Todos os status</option>{['aberta', 'em análise', 'em tratamento', 'aguardando eficácia', 'encerrada'].map(status => <option key={status} value={status}>{status}</option>)}</select></section>
      <section style={{ ...panel, padding: 0, overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 850, fontSize: 11 }}><thead><tr>{['Código', 'Destinatário', 'Descrição', 'Origem', 'Status', 'Data', 'Relatório'].map(title => <th key={title} style={{ padding: '9px 10px', textAlign: 'left', background: '#eaf4f7', borderBottom: '1px solid #cfdee4', fontSize: 9, textTransform: 'uppercase' }}>{title}</th>)}</tr></thead><tbody>
        {visible.map(row => <tr key={row.id} onClick={() => setSelected(row)} style={{ cursor: 'pointer', background: selected?.id === row.id ? '#edf8fb' : '#fff' }}><td style={cellStyle}>{row.numero_rpnc || row.id.slice(0, 8)}</td><td style={cellStyle}>{detailsFromNote(row.investigacao).destinatario || '—'}</td><td style={{ ...cellStyle, maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.descricao_nao_conformidade || '—'}</td><td style={cellStyle}>{shortType(row)}</td><td style={cellStyle}>{row.status || '—'}</td><td style={cellStyle}>{formatDate(row.sgq_data_ocorrencia || row.criado_em)}</td><td style={cellStyle}><button type="button" style={{ ...buttonStyle, height: 28 }} onClick={event => { event.stopPropagation(); printReport(row) }}><Printer size={12} /> Imprimir</button></td></tr>)}
        {!visible.length && <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#718994' }}>{loading ? 'Carregando registros…' : 'Nenhuma RPNC encontrada.'}</td></tr>}
      </tbody></table></section>
      {selected && <section style={{ ...panel, marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><div><strong>{selected.numero_rpnc || selected.id}</strong><div style={{ fontSize: 11, marginTop: 4 }}>{selected.descricao_nao_conformidade}</div><div style={{ fontSize: 10, color: '#617783', marginTop: 4 }}>Origem: {shortType(selected)} · Status: {selected.status || '—'} · Prazo: {formatDate(selected.sgq_data_prazo)}</div></div><button type="button" style={buttonStyle} onClick={() => printReport(selected)}><FileText size={13} /> Relatório com cabeçalho</button></section>}
      <footer style={{ padding: '12px 2px', fontSize: 9, color: '#748b95' }}>Acesso limitado à empresa da sessão e às políticas RLS do Supabase. Revise o relatório antes do envio externo.</footer>
    </div>
    {open && <div role="dialog" aria-modal="true" aria-labelledby="rpnc-title" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#0a202b80', display: 'grid', placeItems: 'center', padding: 12 }}><section style={{ width: 'min(1100px,100%)', maxHeight: '95vh', overflowY: 'auto', background: '#fff', border: '1px solid #cbdde3', borderRadius: 3, padding: 14 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><div><div style={{ color: '#2D8DB8', fontSize: 9, fontWeight: 900, letterSpacing: '.1em' }}>{companyName} · SGQ</div><h2 id="rpnc-title" style={{ margin: '2px 0', fontSize: 17 }}>Nova RPNC</h2></div><button type="button" aria-label="Fechar" style={buttonStyle} onClick={() => setOpen(false)}><X size={14} /></button></header>
      <nav aria-label="Etapas da RPNC" style={{ display: 'flex', gap: 4, overflowX: 'auto', borderBottom: '1px solid #d6e2e7', marginBottom: 12 }}>{TABS.map((item, index) => <button type="button" key={item.id} onClick={() => setTab(item.id)} style={{ ...buttonStyle, flex: '0 0 auto', border: 0, borderBottom: tab === item.id ? '2px solid #2D8DB8' : '2px solid transparent', background: tab === item.id ? '#f0f8fa' : '#fff', color: tab === item.id ? '#123B50' : '#607681' }}>{item.title}{index < TABS.length - 1 && <ChevronRight size={11} />}</button>)}</nav>
      {tab === 'relato' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,minmax(0,1fr))', gap: 9 }}>
        <Field title="Destinatário / contexto *" span={12}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 6 }}>{DESTINOS.map(item => <label key={item.value} style={{ display: 'flex', alignItems: 'center', gap: 7, minHeight: 34, border: `1px solid ${form.destino === item.value ? '#2D8DB8' : '#cbd5e1'}`, background: form.destino === item.value ? '#f0f8fa' : '#fff', padding: '5px 8px', borderRadius: 2, fontSize: 11, cursor: 'pointer' }}><input type="radio" name="rpnc-destino" value={item.value} checked={form.destino === item.value} onChange={() => setField('destino', item.value)} />{item.label}</label>)}</div></Field>
        <Field title="Cliente / fornecedor / área responsável (informativo)" span={6}><input value={form.destinatario} onChange={event => setField('destinatario', event.target.value)} placeholder="Nome da empresa, área ou auditoria" style={baseInput} /></Field>
        {form.destino === 'CLIENTE' && <Field title="ID do cliente cadastrado (UUID)" span={6}><input value={form.clienteId} onChange={event => setField('clienteId', event.target.value)} style={baseInput} /></Field>}
        <Field title="Data da ocorrência *" span={3}><input type="date" value={form.data} onChange={event => setField('data', event.target.value)} style={baseInput} /></Field>
        <Field title="Gravidade" span={3}><select value={form.gravidade} onChange={event => setField('gravidade', event.target.value)} style={baseInput}><option>Menor</option><option>Maior</option><option>Crítica</option></select></Field>
        <Field title="Descrição objetiva da não conformidade *" span={12}>{textArea(form.descricao, value => setField('descricao', value), 4)}</Field>
        <Field title="Produto (UUID cadastrado, opcional)" span={4}><input value={form.produto} onChange={event => setField('produto', event.target.value)} style={baseInput} /></Field>
        <Field title="Ordem de produção (UUID, opcional)" span={4}><input value={form.op} onChange={event => setField('op', event.target.value)} style={baseInput} /></Field>
        <Field title="Lote" span={2}><input value={form.lote} onChange={event => setField('lote', event.target.value)} style={baseInput} /></Field>
        <Field title="Quantidade afetada" span={2}><input type="number" min="0" value={form.quantidade} onChange={event => setField('quantidade', event.target.value)} style={baseInput} /></Field>
        <Field title="Responsável (UUID usuário cadastrado) *" span={6}><input value={form.responsavel} onChange={event => setField('responsavel', event.target.value)} style={baseInput} /></Field>
        <Field title="Prazo para tratamento" span={3}><input type="date" value={form.prazo} onChange={event => setField('prazo', event.target.value)} style={baseInput} /></Field>
        <div style={{ gridColumn: 'span 3', alignSelf: 'end', fontSize: 10, color: '#617783' }}>Campos UUID precisam corresponder a registros existentes do ERP.</div>
      </div>}
      {tab === 'investigacao' && <div style={{ display: 'grid', gap: 12 }}><div style={{ fontSize: 11, color: '#617783' }}>Registre causas possíveis por categoria. O diagrama é uma ferramenta de análise, não uma conclusão automática.</div><section style={{ ...panel, borderColor: '#9fc6d3' }}><div style={{ fontSize: 12, fontWeight: 900, marginBottom: 8 }}>Espinha de peixe · Ishikawa (6M)</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 8 }}>{M6.map(key => <Field key={key} title={key}>{textArea(form.causas[key], value => setCause(key, value), 2)}</Field>)}</div></section><section style={panel}><div style={{ fontSize: 12, fontWeight: 900, marginBottom: 8 }}>5 Porquês · desdobramento até causa raiz</div><div style={{ display: 'grid', gap: 7 }}>{form.whys.map((why, index) => <Field key={index} title={`${index + 1}º porquê`}>{textArea(why, value => setWhy(index, value), 2)}</Field>)}</div></section></div>}
      {tab === 'acoes' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 9 }}><Field title="Ação de contenção imediata *" span={2}>{textArea(form.conten, value => setField('conten', value), 4)}</Field><Field title="Ação corretiva *" span={2}>{textArea(form.corretiva, value => setField('corretiva', value), 4)}</Field><Field title="Ação preventiva / evitar recorrência" span={2}>{textArea(form.preventiva, value => setField('preventiva', value), 4)}</Field></div>}
      {tab === 'eficacia' && <div style={{ display: 'grid', gap: 9 }}><Field title="Como será verificada a eficácia?" >{textArea(form.eficacia, value => setField('eficacia', value), 4)}</Field><Field title="Padronização / documentos a revisar">{textArea(form.padronizacao, value => setField('padronizacao', value), 4)}</Field><div style={{ ...panel, background: '#f7fbfc', color: '#536e79', fontSize: 11 }}>O relatório impresso precisa ser revisado e aprovado pelos responsáveis antes de ser enviado. Esta tela não assina documentos digitalmente.</div></div>}
      <footer style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 14, paddingTop: 10, borderTop: '1px solid #e0e9ed' }}><div style={{ display: 'flex', gap: 6 }}>{TABS.map((item, index) => <button type="button" key={item.id} aria-label={`Ir para ${item.title}`} style={{ ...buttonStyle, width: 30, padding: 0, background: item.id === tab ? '#123B50' : '#fff', color: item.id === tab ? '#fff' : '#123B50' }} onClick={() => setTab(item.id)}>{index + 1}</button>)}</div><div style={{ display: 'flex', gap: 6 }}><button type="button" style={buttonStyle} onClick={() => setOpen(false)}>Cancelar</button><button type="button" disabled={saving} style={{ ...buttonStyle, background: '#123B50', borderColor: '#123B50', color: '#fff', opacity: saving ? .65 : 1 }} onClick={() => void save()}><Save size={13} />{saving ? 'Gravando…' : 'Gravar RPNC'}</button></div></footer>
    </section></div>}
  </main>
}

const cellStyle: CSSProperties = { padding: '8px 10px', borderBottom: '1px solid #edf2f4', verticalAlign: 'top' }