// Atualizado · Padrão Premium · 26/10/2026 — Recebimento de materiais.
import { ChangeEvent, useMemo, useState } from 'react'
import { CheckCircle2, FileUp, PackageCheck, Plus, Printer, RefreshCw, Trash2, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type NfeItem = { item_nfe:number; codigo_produto:string; descricao_produto:string; unidade:string; quantidade_total:number; valor_unitario:number; valor_total:number }
type Lote = { id:string; item_nfe:number; lote_fabricante:string; lote_interno:string; data_validade:string; quantidade:number }
type Header = { numero_nfe:string; serie:string; chave_acesso:string; data_emissao:string; cnpj_fornecedor:string; valor_total:string; xml_nome_arquivo:string; xml_hash:string }

const blankHeader = (): Header => ({ numero_nfe:'', serie:'', chave_acesso:'', data_emissao:new Date().toISOString().slice(0,10), cnpj_fornecedor:'', valor_total:'', xml_nome_arquivo:'manual', xml_hash:'' })
const blankItem = (n:number): NfeItem => ({ item_nfe:n, codigo_produto:'', descricao_produto:'', unidade:'UN', quantidade_total:0, valor_unitario:0, valor_total:0 })
const tag = (root:Element, name:string) => Array.from(root.getElementsByTagName('*')).find(x => x.localName === name)?.textContent?.trim() ?? ''
const element = (root:Element, name:string) => Array.from(root.getElementsByTagName('*')).find(x => x.localName === name) ?? null
const digits = (value:string) => value.replace(/\D/g,'')
const validAccessKey = (value:string) => {
  if (!/^\d{44}$/.test(value)) return false
  let weight = 2
  let sum = 0
  for (let index = value.length - 2; index >= 0; index -= 1) {
    sum += Number(value[index]) * weight
    weight = weight === 9 ? 2 : weight + 1
  }
  const remainder = sum % 11
  const checkDigit = remainder < 2 ? 0 : 11 - remainder
  return checkDigit === Number(value[43])
}
const money = (v:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v || 0)

function parseNfe(xml:string): { header:Header; items:NfeItem[] } {
  const doc = new DOMParser().parseFromString(xml,'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('O arquivo selecionado não é um XML válido.')
  const inf = Array.from(doc.getElementsByTagName('*')).find(e => e.localName === 'infNFe')
  if (!inf) throw new Error('O XML não possui a estrutura de uma NF-e.')
  const ide = Array.from(inf.getElementsByTagName('*')).find(e => e.localName === 'ide') || inf
  const emit = Array.from(inf.getElementsByTagName('*')).find(e => e.localName === 'emit') || inf
  const total = Array.from(inf.getElementsByTagName('*')).find(e => e.localName === 'ICMSTot') || inf
  const protocol = element(doc.documentElement,'infProt')
  const key = (inf.getAttribute('Id') || '').replace(/^NFe/,'')
  const protocolKey = protocol ? tag(protocol,'chNFe') : ''
  const protocolStatus = protocol ? tag(protocol,'cStat') : ''
  if (!validAccessKey(key)) throw new Error('A chave de acesso do XML está ausente ou inválida.')
  if (!protocol || protocolKey !== key || !['100','150'].includes(protocolStatus) || !tag(protocol,'nProt')) {
    throw new Error('O XML precisa conter protocolo autorizado compatível com a chave (cStat 100 ou 150). XML assinado sem protocolo não comprova autorização.')
  }
  const dets = Array.from(inf.getElementsByTagName('*')).filter(e => e.localName === 'det')
  const header:Header = {
    numero_nfe: tag(ide,'nNF'),
    serie: tag(ide,'serie'),
    chave_acesso: key,
    data_emissao: tag(ide,'dhEmi') || tag(ide,'dEmi'),
    cnpj_fornecedor: tag(emit,'CNPJ'),
    valor_total: tag(total,'vNF'),
    xml_nome_arquivo: '',
    xml_hash: ''
  }
  const paddedSeries = /^\d{1,3}$/.test(header.serie) ? header.serie.padStart(3,'0') : ''
  const paddedNumber = /^\d{1,9}$/.test(header.numero_nfe) ? header.numero_nfe.padStart(9,'0') : ''
  if (key.slice(20,22) !== '55' || key.slice(22,25) !== paddedSeries || key.slice(25,34) !== paddedNumber ||
      key.slice(6,20) !== digits(header.cnpj_fornecedor) || !header.valor_total.trim() ||
      !Number.isFinite(Number(header.valor_total)) || !header.data_emissao ||
      !Number.isFinite(new Date(header.data_emissao).getTime())) {
    throw new Error('Os dados de emitente, modelo, série, número, data ou total não correspondem à chave e ao cabeçalho da NF-e.')
  }
  const items = dets.map((det,index) => {
    const prod = Array.from(det.getElementsByTagName('*')).find(e => e.localName === 'prod') || det
    return {
      item_nfe:Number(det.getAttribute('nItem') || index + 1),
      codigo_produto:tag(prod,'cProd'),
      descricao_produto:tag(prod,'xProd'),
      unidade:tag(prod,'uCom') || 'UN',
      quantidade_total:Number(tag(prod,'qCom') || 0),
      valor_unitario:Number(tag(prod,'vUnCom') || 0),
      valor_total:Number(tag(prod,'vProd') || 0)
    }
  })
  if (!items.length) throw new Error('A NF-e não contém itens.')
  if (items.some(item => !item.codigo_produto || !item.descricao_produto || !item.unidade ||
      !Number.isFinite(item.quantidade_total) || item.quantidade_total <= 0 ||
      !Number.isFinite(item.valor_unitario) || item.valor_unitario < 0 ||
      !Number.isFinite(item.valor_total) || item.valor_total < 0)) {
    throw new Error('O XML contém item sem código, descrição, unidade ou quantidade/valores válidos.')
  }
  return { header, items }
}

export default function RecebimentoMateriais() {
  const [header,setHeader] = useState<Header>(blankHeader())
  const [items,setItems] = useState<NfeItem[]>([blankItem(1)])
  const [lotes,setLotes] = useState<Lote[]>([])
  const [fileError,setFileError] = useState('')
  const [saving,setSaving] = useState(false)
  const [saved,setSaved] = useState('')
  const [error,setError] = useState('')
  const totals = useMemo(() => items.map(item => ({
    item,
    soma:lotes.filter(l => l.item_nfe === item.item_nfe).reduce((sum,l) => sum + Number(l.quantidade || 0),0)
  })),[items,lotes])
  const ready = items.length > 0 && items.every(item => {
    const rows = lotes.filter(l => l.item_nfe === item.item_nfe)
    return item.codigo_produto.trim() && item.descricao_produto.trim() && item.quantidade_total > 0 &&
      rows.length > 0 && rows.every(l => l.lote_interno.trim() && l.quantidade > 0) &&
      Math.abs(rows.reduce((sum,l) => sum + Number(l.quantidade || 0),0) - item.quantidade_total) < 0.00001
  })
  const setHeaderValue = (key:keyof Header,value:string) => setHeader(current => ({...current,[key]:value}))
  const setItemValue = (index:number,key:keyof NfeItem,value:string|number) => setItems(current => current.map((item,i) => i === index ? {...item,[key]:value} : item))
  const addItem = () => setItems(current => [...current,blankItem(current.length + 1)])
  const removeItem = (itemNumber:number) => {
    if (items.length === 1) return
    setItems(current => current.filter(item => item.item_nfe !== itemNumber).map((item,index) => ({...item,item_nfe:index + 1})))
    setLotes(current => current.filter(lote => lote.item_nfe !== itemNumber).map(lote => ({...lote,item_nfe:lote.item_nfe > itemNumber ? lote.item_nfe - 1 : lote.item_nfe})))
  }
  const addLote = (item:NfeItem) => {
    const current = lotes.filter(l => l.item_nfe === item.item_nfe).reduce((sum,l) => sum + Number(l.quantidade || 0),0)
    setLotes(rows => [...rows,{id:crypto.randomUUID(),item_nfe:item.item_nfe,lote_fabricante:'',lote_interno:'',data_validade:'',quantidade:Math.max(item.quantidade_total-current,0)}])
  }
  const updateLote = (id:string,key:keyof Lote,value:string|number) => setLotes(rows => rows.map(lote => lote.id === id ? {...lote,[key]:value} : lote))
  const loadXml = (event:ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setFileError('')
    setError('')
    setSaved('')
    setHeader(blankHeader())
    setItems([blankItem(1)])
    setLotes([])
    Promise.all([file.text(), file.arrayBuffer()]).then(async ([text, bytes]) => {
      const parsed = parseNfe(text)
      const digest = await crypto.subtle.digest('SHA-256', bytes)
      parsed.header.xml_hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,'0')).join('')
      parsed.header.xml_nome_arquivo = file.name
      setHeader(parsed.header)
      setItems(parsed.items)
      setLotes(parsed.items.map(item => ({id:crypto.randomUUID(),item_nfe:item.item_nfe,lote_fabricante:'',lote_interno:'',data_validade:'',quantidade:item.quantidade_total})))
    }).catch(err => setFileError(err instanceof Error ? err.message : 'Falha ao ler o XML.'))
    event.target.value = ''
  }
  const reset = () => {
    setHeader(blankHeader())
    setItems([blankItem(1)])
    setLotes([])
    setFileError('')
    setError('')
    setSaved('')
  }
  const save = async () => {
    if (!ready) return
    if (!validAccessKey(header.chave_acesso)) {
      setError('Informe uma chave de acesso NF-e válida com 44 dígitos verificadores.')
      return
    }
    setSaving(true); setError(''); setSaved('')
    try {
      const { data, error:rpcError } = await supabase.rpc('erp_confirmar_recebimento_nfe',{p_header:header,p_items:items,p_lotes:lotes})
      if (rpcError) throw rpcError
      if (!data) throw new Error('O banco não retornou o número do recebimento.')
      setSaved('Recebimento ' + String(data) + ' confirmado e enviado ao estoque.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível confirmar o recebimento.')
    } finally {
      setSaving(false)
    }
  }
  return <div className="industrial-form-page receipt-workspace">
    <header className="industrial-page-head receipt-hero">
      <div><span className="industrial-eyebrow">SUPRIMENTOS · SYSNQRA ERP INDUSTRIAL</span><h1>Recebimento de materiais</h1><p>Importe a NF-e, confira os itens e rastreie a entrada por lote até o estoque.</p><small>Atualizado · Padrão Premium · 26/10/2026</small></div>
      <PackageCheck aria-hidden="true" size={42}/>
    </header>
    <div className="receipt-commandbar" role="toolbar" aria-label="Ações do recebimento">
      <span>Entrada de materiais <small>NF-e · conferência · lotes</small></span>
      <div className="receipt-actions"><button className="industrial-secondary" type="button" onClick={reset}><RefreshCw size={15}/> Novo recebimento</button><button className="industrial-secondary" type="button" onClick={() => window.print()}><Printer size={15}/> Imprimir</button></div>
    </div>
    <section className="receipt-metrics" aria-label="Resumo do recebimento">
      <article><span>Itens da nota</span><strong>{items.length}</strong></article>
      <article><span>Lotes informados</span><strong>{lotes.length}</strong></article>
      <article><span>Valor da NF-e</span><strong>{money(Number(String(header.valor_total).replace(',', '.')) || 0)}</strong></article>
      <article className={ready ? 'is-ready' : ''}><span>Conferência</span><strong>{ready ? 'Pronta' : 'Pendente'}</strong></article>
    </section>
    <section className="industrial-panel">
      <div className="industrial-section-head"><div><h2>1. Documento de entrada</h2><p>Preencha os dados ou importe o XML da NF-e.</p></div><label className="receipt-upload"><FileUp size={17}/> Importar XML<input hidden type="file" accept=".xml,text/xml,application/xml" onChange={loadXml}/></label></div>
      {fileError && <div className="receipt-alert error"><XCircle size={18}/>{fileError}</div>}
      <div className="receipt-form-grid">
        <label>Número NF-e *<input value={header.numero_nfe} onChange={e => setHeaderValue('numero_nfe',e.target.value)} placeholder="Ex.: 000123"/></label>
        <label>Série<input value={header.serie} onChange={e => setHeaderValue('serie',e.target.value)} placeholder="1"/></label>
        <label>Data de emissão<input type="date" value={header.data_emissao.slice(0,10)} onChange={e => setHeaderValue('data_emissao',e.target.value)}/></label>
        <label>CNPJ fornecedor<input value={header.cnpj_fornecedor} onChange={e => setHeaderValue('cnpj_fornecedor',e.target.value)} placeholder="00.000.000/0000-00"/></label>
        <label>Valor total<input value={header.valor_total} onChange={e => setHeaderValue('valor_total',e.target.value)} placeholder="0,00"/></label>
        <label className="receipt-wide">Chave de acesso<input value={header.chave_acesso} onChange={e => setHeaderValue('chave_acesso',e.target.value)} placeholder="44 dígitos"/></label>
      </div>
    </section>
    <section className="industrial-panel">
      <div className="industrial-section-head"><div><h2>2. Itens recebidos</h2><p>Cadastre os materiais e a quantidade efetivamente recebida.</p></div><button className="industrial-primary" type="button" onClick={addItem}><Plus size={17}/> Adicionar item</button></div>
      <div className="receipt-items">
        {items.map((item,index) => <article className="receipt-item" key={item.item_nfe}>
          <div className="receipt-item-number">{String(item.item_nfe).padStart(2,'0')}</div>
          <label>Código do produto *<input value={item.codigo_produto} onChange={e => setItemValue(index,'codigo_produto',e.target.value)} placeholder="Código interno"/></label>
          <label className="receipt-item-description">Descrição *<input value={item.descricao_produto} onChange={e => setItemValue(index,'descricao_produto',e.target.value)} placeholder="Descrição do material"/></label>
          <label>Unidade<select value={item.unidade} onChange={e => setItemValue(index,'unidade',e.target.value)}><option>UN</option><option>KG</option><option>PC</option><option>M</option><option>MT</option><option>L</option></select></label>
          <label>Quantidade *<input type="number" min="0" step="0.0001" value={item.quantidade_total || ''} onChange={e => setItemValue(index,'quantidade_total',Number(e.target.value))}/></label>
          <label>Vlr. unitário<input type="number" min="0" step="0.0001" value={item.valor_unitario || ''} onChange={e => setItemValue(index,'valor_unitario',Number(e.target.value))}/></label>
          <button className="icon-button danger" type="button" title="Excluir item" disabled={items.length === 1} onClick={() => removeItem(item.item_nfe)}><Trash2 size={17}/></button>
        </article>)}
      </div>
    </section>
    <section className="industrial-panel">
      <div className="industrial-section-head"><div><h2>3. Lotes e rastreabilidade</h2><p>A quantidade dos lotes deve fechar exatamente com a quantidade recebida.</p></div></div>
      <div className="receipt-lot-table"><table className="industrial-table"><thead><tr><th>Item</th><th>Produto</th><th>Lote fabricante</th><th>Lote interno *</th><th>Validade</th><th>Quantidade *</th><th>Status</th><th></th></tr></thead><tbody>
        {items.map(item => {
          const rows = lotes.filter(l => l.item_nfe === item.item_nfe)
          const total = totals.find(t => t.item.item_nfe === item.item_nfe)?.soma ?? 0
          const ok = rows.length > 0 && Math.abs(total - item.quantidade_total) < 0.00001 && rows.every(l => l.lote_interno.trim() && l.quantidade > 0)
          return rows.map(lote => <tr key={lote.id}><td>{item.item_nfe}</td><td>{item.codigo_produto || '—'}</td><td><input value={lote.lote_fabricante} onChange={e => updateLote(lote.id,'lote_fabricante',e.target.value)}/></td><td><input value={lote.lote_interno} onChange={e => updateLote(lote.id,'lote_interno',e.target.value)} placeholder="LOT-2026-001"/></td><td><input type="date" value={lote.data_validade} onChange={e => updateLote(lote.id,'data_validade',e.target.value)}/></td><td><input type="number" min="0" step="0.0001" value={lote.quantidade || ''} onChange={e => updateLote(lote.id,'quantidade',Number(e.target.value))}/></td><td>{ok ? <span className="receipt-ok"><CheckCircle2 size={16}/> Fechado</span> : <span className="receipt-bad"><XCircle size={16}/> Pendente</span>}</td><td><button className="icon-button danger" type="button" onClick={() => setLotes(rows => rows.filter(row => row.id !== lote.id))}><Trash2 size={16}/></button></td></tr>)
        })}
      </tbody></table></div>
      <div className="receipt-lot-add">{items.map(item => <button key={item.item_nfe} className="industrial-secondary" type="button" onClick={() => addLote(item)}><Plus size={16}/> Lote item {item.item_nfe}</button>)}</div>
    </section>
    <section className="receipt-summary">
      <div><strong>Conferência de entrada</strong><span>{items.length} item(ns) • {lotes.length} lote(s)</span>{error && <div className="receipt-alert error">{error}</div>}{saved && <div className="receipt-alert ok">{saved}</div>}</div>
      <button className="industrial-primary" type="button" disabled={!ready || saving} onClick={() => void save()}><PackageCheck size={18}/>{saving ? 'Confirmando…' : 'Confirmar entrada no estoque'}</button>
    </section>
    <style>{`
      .receipt-workspace{display:grid;gap:12px;background:#f1f5f9!important;color:#0f172a!important;padding:14px!important}
      .receipt-workspace .receipt-hero{min-height:116px;margin:0!important;padding:20px 24px!important;border-radius:16px!important;background:linear-gradient(112deg,#0f2747 0%,#123f78 58%,#2563c7 100%)!important;color:#fff!important;box-shadow:0 12px 24px rgba(15,39,71,.16)!important;display:flex!important;justify-content:space-between!important;align-items:center!important}
      .receipt-workspace .receipt-hero h1{font-size:24px!important;color:#fff!important;font-weight:800!important;margin:5px 0!important}.receipt-workspace .receipt-hero p{font-size:12px!important;color:#dbeafe!important;margin:0!important}.receipt-workspace .receipt-hero .industrial-eyebrow{color:#bfdbfe!important;font-size:9px!important;letter-spacing:.14em!important}.receipt-workspace .receipt-hero>div>small{display:inline-flex;margin-top:9px;color:#dbeafe;font-size:9px;font-weight:700}
      .receipt-commandbar{min-height:48px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 12px;background:#fff;border:1px solid #dbe3ee;border-radius:12px;box-shadow:0 2px 5px rgba(15,23,42,.04);font-size:11px;font-weight:800;color:#1e293b}.receipt-commandbar>span{display:flex;gap:9px;align-items:center}.receipt-commandbar small{font-size:10px;font-weight:500;color:#64748b}.receipt-actions{display:flex;gap:7px;flex-wrap:wrap}.receipt-workspace .receipt-commandbar button{min-height:34px!important;height:34px!important;border-radius:8px!important;padding:0 11px!important;font-size:10px!important;font-weight:750!important;box-shadow:0 1px 2px rgba(15,23,42,.08)}
      .receipt-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.receipt-metrics article{min-height:70px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;background:#fff;border:1px solid #dbe3ee;border-radius:12px;box-shadow:0 2px 6px rgba(15,23,42,.04)}.receipt-metrics span{font-size:10px;color:#64748b;font-weight:700}.receipt-metrics strong{font-size:19px;color:#102c50;font-weight:800}.receipt-metrics .is-ready strong{color:#15803d}
      .receipt-workspace .industrial-panel{padding:14px!important;margin:0!important;border:1px solid #dbe3ee!important;border-radius:12px!important;box-shadow:0 3px 8px rgba(15,23,42,.04)!important;background:#fff!important}.receipt-workspace .industrial-section-head{margin-bottom:12px!important}.receipt-workspace .industrial-section-head h2{font-size:14px!important;color:#102c50!important;font-weight:800!important}.receipt-workspace .industrial-section-head p{font-size:10px!important;color:#64748b!important}.receipt-workspace .receipt-form-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.receipt-workspace label{display:grid;min-width:0;gap:4px!important;color:#475569!important;font-size:9px!important;font-weight:750!important;letter-spacing:.04em;text-transform:uppercase}.receipt-workspace input:not([type=checkbox]):not([type=radio]):not([type=range]),.receipt-workspace select{box-sizing:border-box;width:100%;height:36px!important;min-height:36px!important;padding:0 10px!important;border:1px solid #cbd5e1!important;border-radius:8px!important;background:#f8fafc!important;color:#0f172a!important;font-size:11px!important;font-weight:500!important;line-height:34px!important}.receipt-workspace input:focus,.receipt-workspace select:focus{background:#fff!important;border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,.12)!important}.receipt-workspace .receipt-wide{grid-column:span 2}
      .receipt-upload{height:34px;display:inline-flex;align-items:center;gap:7px;background:#1d4ed8;color:#fff;border:1px solid #1d4ed8;border-radius:8px;padding:0 12px;font-size:10px;font-weight:800;cursor:pointer;box-shadow:0 2px 4px rgba(29,78,216,.18)}.receipt-upload:hover{background:#1e40af}
      .receipt-items{display:grid;gap:8px}.receipt-item{display:grid;grid-template-columns:34px minmax(130px,1fr) minmax(180px,1.5fr) 90px 112px 112px 34px;gap:8px;align-items:end;padding:10px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc}.receipt-item-number{display:grid;place-items:center;height:36px;border-radius:8px;background:#eaf1ff;color:#1d4ed8;font-size:11px;font-weight:850}.receipt-item label{font-size:9px!important}.receipt-workspace .industrial-primary,.receipt-workspace .industrial-secondary{height:34px!important;min-height:34px!important;display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:8px!important;padding:0 11px!important;font-size:10px!important;font-weight:750!important}.receipt-workspace .industrial-primary{background:#1d4ed8!important;border-color:#1d4ed8!important;color:#fff!important;box-shadow:0 2px 4px rgba(29,78,216,.18)}.receipt-workspace .industrial-secondary{background:#fff!important;border:1px solid #cbd5e1!important;color:#334155!important}.receipt-workspace .industrial-secondary:hover{background:#f8fafc!important}
      .receipt-lot-table{overflow:auto;border:1px solid #e2e8f0;border-radius:9px}.receipt-workspace .industrial-table{min-width:900px!important;font-size:10px!important}.receipt-workspace .industrial-table th{height:34px!important;padding:0 8px!important;background:#f1f5f9!important;color:#475569!important;font-size:9px!important;font-weight:800!important}.receipt-workspace .industrial-table td{height:42px!important;padding:5px 8px!important;vertical-align:middle!important}.receipt-workspace .industrial-table input:not([type=checkbox]){height:32px!important;min-height:32px!important;font-size:10px!important}.receipt-lot-table input{min-width:105px}.receipt-lot-add{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.receipt-alert{display:flex;align-items:center;gap:8px;padding:9px 11px;border-radius:9px;margin-top:10px;font-size:10px;font-weight:700}.receipt-alert.error{background:#fff1f2;border:1px solid #fecdd3;color:#9f1239}.receipt-alert.ok{background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46}.receipt-ok,.receipt-bad{display:inline-flex;align-items:center;gap:4px;font-size:9px;font-weight:800;white-space:nowrap}.receipt-ok{color:#15803d}.receipt-bad{color:#b91c1c}
      .receipt-summary{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:12px 14px;background:#fff!important;color:#0f172a!important;border:1px solid #dbe3ee;border-radius:12px;margin:0!important;box-shadow:0 3px 8px rgba(15,23,42,.04)}.receipt-summary>div{display:grid;gap:4px}.receipt-summary strong{font-size:12px}.receipt-summary span{color:#64748b;font-size:10px;opacity:1}.receipt-summary .receipt-alert{margin:5px 0 0}
      @media(max-width:1000px){.receipt-workspace .receipt-form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.receipt-item{grid-template-columns:34px minmax(130px,1fr) minmax(150px,1.2fr) 82px 100px 100px 34px}}@media(max-width:700px){.receipt-workspace{padding:8px!important}.receipt-workspace .receipt-hero{padding:16px!important}.receipt-workspace .receipt-hero>svg{display:none}.receipt-commandbar,.receipt-summary{align-items:stretch;flex-direction:column}.receipt-commandbar>span{align-items:flex-start;flex-direction:column;gap:2px}.receipt-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.receipt-workspace .receipt-form-grid{grid-template-columns:1fr}.receipt-workspace .receipt-wide{grid-column:auto}.receipt-item{grid-template-columns:1fr 1fr}.receipt-item-number{grid-column:1/-1;justify-content:start;padding:0 10px}.receipt-item-description{grid-column:1/-1}.receipt-item .icon-button{grid-column:1/-1;justify-self:end}}
      @media print{.receipt-actions,.receipt-commandbar,.v7-topbar{display:none!important}.receipt-workspace{background:#fff!important;padding:0!important}.receipt-workspace .receipt-hero{background:#fff!important;color:#111!important;border:1px solid #999}.receipt-workspace .receipt-hero h1,.receipt-workspace .receipt-hero p{color:#111!important}.receipt-summary{color:#111!important;background:#fff!important;border:1px solid #999}.receipt-summary .industrial-primary{display:none!important}}
     `}</style>
  </div>
}
