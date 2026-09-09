import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { FileCheck2, FileDown, FileUp, KeyRound, Plus, Search, Settings2, ShieldCheck, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type FiscalDoc = {
  id: string
  tipo: string
  modelo: string
  serie: number
  numero: number | null
  status: string
  ambiente: string
  natureza_operacao: string | null
  data_emissao: string | null
  chave_acesso: string | null
  destinatario_nome: string | null
  destinatario_documento: string | null
  valor_total: number
  mensagem_retorno: string | null
}

type FiscalConfig = {
  id?: string
  ambiente: 'homologacao' | 'producao'
  regime_tributario: string
  serie_nfe: number
  proximo_numero_nfe: number
  certificado_configurado: boolean
  integrador_configurado: boolean
}

const emptyConfig: FiscalConfig = {
  ambiente: 'homologacao', regime_tributario: '', serie_nfe: 1, proximo_numero_nfe: 1,
  certificado_configurado: false, integrador_configurado: false,
}

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0))
const date = (value: string | null) => value ? new Intl.DateTimeFormat('pt-BR').format(new Date(value)) : '—'

export default function Fiscal() {
  const [docs, setDocs] = useState<FiscalDoc[]>([])
  const [config, setConfig] = useState<FiscalConfig>(emptyConfig)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('todos')
  const [tab, setTab] = useState<'notas' | 'emitir' | 'config'>('notas')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [xmlName, setXmlName] = useState('')

  async function empresaId() {
    const { data, error: rpcError } = await supabase.rpc('erp_current_empresa_id')
    if (rpcError) throw rpcError
    if (!data) throw new Error('Empresa do usuário não encontrada.')
    return data as string
  }

  async function load() {
    const { data, error: docsError } = await supabase.from('erp_documentos_fiscais').select('id,tipo,modelo,serie,numero,status,ambiente,natureza_operacao,data_emissao,chave_acesso,destinatario_nome,destinatario_documento,valor_total,mensagem_retorno').order('created_at', { ascending: false }).limit(200)
    if (docsError) throw docsError
    setDocs((data || []) as FiscalDoc[])
    const companyId = await empresaId()
    const { data: cfg, error: cfgError } = await supabase.from('erp_config_fiscal').select('*').eq('empresa_id', companyId).maybeSingle()
    if (cfgError) throw cfgError
    if (cfg) setConfig(cfg as FiscalConfig)
  }

  useEffect(() => { void load().catch(e => setError(e instanceof Error ? e.message : 'Falha ao carregar Fiscal.')) }, [])

  const filtered = useMemo(() => docs.filter(d => {
    const hay = `${d.numero || ''} ${d.chave_acesso || ''} ${d.destinatario_nome || ''} ${d.destinatario_documento || ''}`.toLowerCase()
    return hay.includes(query.toLowerCase()) && (status === 'todos' || d.status === status)
  }), [docs, query, status])

  async function saveConfig(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      const companyId = await empresaId()
      const payload = { ...config, empresa_id: companyId }
      const { error: saveError } = config.id
        ? await supabase.from('erp_config_fiscal').update(payload).eq('id', config.id)
        : await supabase.from('erp_config_fiscal').insert(payload)
      if (saveError) throw saveError
      await load(); setMessage('Configuração fiscal salva.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar a configuração.') }
    finally { setBusy(false) }
  }

  async function createDraft() {
    setBusy(true); setError(''); setMessage('')
    try {
      const companyId = await empresaId()
      const number = config.proximo_numero_nfe || 1
      const { error: insertError } = await supabase.from('erp_documentos_fiscais').insert({
        empresa_id: companyId, tipo: 'NFe', modelo: '55', serie: config.serie_nfe || 1, numero: number,
        status: 'rascunho', ambiente: config.ambiente, natureza_operacao: 'Venda de mercadoria', data_emissao: new Date().toISOString(),
        mensagem_retorno: 'Rascunho criado. Para autorização real, configure certificado digital e integrador fiscal/SEFAZ.',
      })
      if (insertError) throw insertError
      const next = { ...config, proximo_numero_nfe: number + 1 }
      setConfig(next)
      const { data: cfgRow } = await supabase.from('erp_config_fiscal').select('id').eq('empresa_id', companyId).maybeSingle()
      if (cfgRow?.id) await supabase.from('erp_config_fiscal').update({ proximo_numero_nfe: number + 1 }).eq('id', cfgRow.id)
      await load(); setTab('notas'); setMessage(`NF-e ${number} criada como rascunho.`)
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao criar NF-e.') }
    finally { setBusy(false) }
  }

  function extractXml(xml: string) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'application/xml')
    if (doc.querySelector('parsererror')) throw new Error('XML inválido.')
    const all = xml.replace(/\s+/g, '')
    const keyMatch = all.match(/(?:NFe|nfe)?(?:[A-Za-z0-9:_-]*chNFe)?([0-9]{44})/)
    const accessKey = keyMatch?.[1] || doc.querySelector('chNFe')?.textContent?.trim() || null
    const node = (name: string) => doc.getElementsByTagNameNS('*', name)[0]?.textContent?.trim() || doc.getElementsByTagName(name)[0]?.textContent?.trim() || ''
    return { accessKey, numero: node('nNF'), serie: Number(node('serie') || 1), recipient: node('xNome'), recipientDoc: node('CNPJ') || node('CPF'), total: Number(node('vNF') || 0), issuedAt: node('dhEmi') || node('dEmi') }
  }

  async function importXml(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true); setError(''); setMessage(''); setXmlName(file.name)
    try {
      const xml = await file.text(); const parsed = extractXml(xml); const companyId = await empresaId()
      const { error: insertError } = await supabase.from('erp_documentos_fiscais').insert({
        empresa_id: companyId, tipo: 'NFe', modelo: '55', serie: parsed.serie, numero: parsed.numero ? Number(parsed.numero) : null,
        status: 'autorizada', ambiente: config.ambiente, data_emissao: parsed.issuedAt ? new Date(parsed.issuedAt).toISOString() : null,
        chave_acesso: parsed.accessKey, destinatario_nome: parsed.recipient, destinatario_documento: parsed.recipientDoc,
        valor_total: parsed.total, xml_original: xml, mensagem_retorno: 'XML importado da contabilidade. Chave de acesso identificada automaticamente.'
      })
      if (insertError) throw insertError
      await load(); setMessage(parsed.accessKey ? `XML importado. Chave de acesso: ${parsed.accessKey}` : 'XML importado, mas a chave de acesso não foi encontrada.')
    } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao importar XML.') }
    finally { setBusy(false); e.target.value = '' }
  }

  async function lookupKey(key: string) {
    setBusy(true); setError(''); setMessage('')
    try {
      const clean = key.replace(/\D/g, '')
      if (clean.length !== 44) throw new Error('A chave de acesso deve conter 44 dígitos.')
      const { data, error: findError } = await supabase.from('erp_documentos_fiscais').select('*').eq('chave_acesso', clean).maybeSingle()
      if (findError) throw findError
      setMessage(data ? `Nota localizada no ERP: ${data.numero || 'sem número'} — ${data.status}.` : 'Chave válida, mas esta NF-e ainda não foi importada para o ERP.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha na consulta.') }
    finally { setBusy(false) }
  }

  return <div className="panel fiscal-page">
    <div className="panel-head">
      <div><span className="eyebrow">FISCAL</span><h2>Notas fiscais eletrônicas</h2><p>Emissão, importação do XML da contabilidade, chave de acesso e rastreabilidade fiscal por empresa.</p></div>
      <div className="fiscal-actions"><label className="secondary fiscal-upload"><FileUp size={17}/> Importar XML<input type="file" accept=".xml,text/xml,application/xml" onChange={importXml}/></label><button className="primary" onClick={() => setTab('emitir')}><Plus size={17}/> Nova NF-e</button></div>
    </div>
    {(message || error) && <div className={error ? 'error' : 'notice'}>{error || message}</div>}
    <div className="tabs"><button className={tab === 'notas' ? 'tab active' : 'tab'} onClick={() => setTab('notas')}><FileCheck2 size={16}/> Notas</button><button className={tab === 'emitir' ? 'tab active' : 'tab'} onClick={() => setTab('emitir')}><Plus size={16}/> Emitir</button><button className={tab === 'config' ? 'tab active' : 'tab'} onClick={() => setTab('config')}><Settings2 size={16}/> Configuração</button></div>

    {tab === 'notas' && <>
      <div className="toolbar"><div className="search"><Search size={17}/><input placeholder="Pesquisar número, destinatário ou chave de acesso" value={query} onChange={e => setQuery(e.target.value)}/></div><select value={status} onChange={e => setStatus(e.target.value)}><option value="todos">Todos os status</option><option value="rascunho">Rascunho</option><option value="pendente">Pendente</option><option value="autorizada">Autorizada</option><option value="rejeitada">Rejeitada</option><option value="cancelada">Cancelada</option></select><span>{filtered.length} notas</span></div>
      <div className="fiscal-key-box"><div><KeyRound size={18}/><div><strong>Consultar chave de acesso</strong><small>Digite os 44 dígitos recebidos da contabilidade para localizar a NF-e importada.</small></div></div><input maxLength={44} placeholder="44 dígitos da chave" onKeyDown={e => { if (e.key === 'Enter') void lookupKey(e.currentTarget.value) }}/></div>
      <div className="table-wrap"><table><thead><tr><th>Número</th><th>Emissão</th><th>Destinatário</th><th>Chave de acesso</th><th>Total</th><th>Status</th></tr></thead><tbody>{filtered.map(d => <tr key={d.id}><td>{d.serie}/{d.numero || '—'}</td><td>{date(d.data_emissao)}</td><td>{d.destinatario_nome || '—'}<small className="table-sub">{d.destinatario_documento || ''}</small></td><td><code>{d.chave_acesso || 'Não informada'}</code></td><td>{money(d.valor_total)}</td><td><span className={`fiscal-status ${d.status}`}>{d.status}</span></td></tr>)}{!filtered.length && <tr><td colSpan={6} className="empty">Nenhuma nota encontrada.</td></tr>}</tbody></table></div>
      </>}

    {tab === 'emitir' && <div className="fiscal-emit-grid"><div className="panel fiscal-card"><span className="eyebrow">NOVA NF-e</span><h3>Preparar documento</h3><p>O ERP prepara o documento e numera a NF-e. A autorização fiscal real acontece somente após configurar certificado digital e um integrador compatível com a SEFAZ do estado.</p><button className="primary" disabled={busy} onClick={() => void createDraft()}><Plus size={17}/> {busy ? 'Criando…' : 'Criar NF-e como rascunho'}</button></div><div className="panel fiscal-card"><ShieldCheck size={34}/><h3>Checklist de emissão</h3><ul><li>Empresa com CNPJ, IE, endereço e regime tributário.</li><li>Produtos com NCM, CFOP, unidade e regras tributárias.</li><li>Certificado digital A1/A3 e credenciamento fiscal.</li><li>Integrador/serviço fiscal conectado à SEFAZ.</li><li>Homologação validada antes de produção.</li></ul></div></div>}

    {tab === 'config' && <form className="fiscal-config panel" onSubmit={saveConfig}><span className="eyebrow">CONFIGURAÇÃO FISCAL</span><h3>Parâmetros da empresa</h3><div className="form-grid"><label>Ambiente<select value={config.ambiente} onChange={e => setConfig({ ...config, ambiente: e.target.value as FiscalConfig['ambiente'] })}><option value="homologacao">Homologação</option><option value="producao">Produção</option></select></label><label>Regime tributário<input value={config.regime_tributario} onChange={e => setConfig({ ...config, regime_tributario: e.target.value })} placeholder="Ex.: Simples Nacional"/></label><label>Série NF-e<input type="number" min="1" value={config.serie_nfe} onChange={e => setConfig({ ...config, serie_nfe: Number(e.target.value) })}/></label><label>Próximo número<input type="number" min="1" value={config.proximo_numero_nfe} onChange={e => setConfig({ ...config, proximo_numero_nfe: Number(e.target.value) })}/></label></div><label className="fiscal-check"><input type="checkbox" checked={config.certificado_configurado} onChange={e => setConfig({ ...config, certificado_configurado: e.target.checked })}/> Certificado digital configurado</label><label className="fiscal-check"><input type="checkbox" checked={config.integrador_configurado} onChange={e => setConfig({ ...config, integrador_configurado: e.target.checked })}/> Integrador fiscal/SEFAZ configurado</label><button className="primary" disabled={busy}>Salvar configuração</button><p className="fiscal-note"><FileDown size={15}/> XML recebido da contabilidade pode ser importado pela tela de Notas; a chave de acesso de 44 dígitos é extraída automaticamente quando presente no XML.</p></form>}
    {xmlName && <div className="notice">Último arquivo processado: {xmlName}</div>}
  </div>
}
