import { ChangeEvent, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, FileUp, PackageCheck, Plus, Printer, RefreshCw, Trash2, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type NfeItem = { item_nfe:number; codigo_produto:string; descricao_produto:string; unidade:string; quantidade_total:number; valor_unitario:number; valor_total:number }
type Lote = { id:string; item_nfe:number; lote_fabricante:string; lote_interno:string; data_validade:string; quantidade:number }
type Header = { numero_nfe:string; serie:string; chave_acesso:string; data_emissao:string; cnpj_fornecedor:string; valor_total:string; xml_nome_arquivo:string }

const blankHeader = (): Header => ({ numero_nfe:'', serie:'', chave_acesso:'', data_emissao:new Date().toISOString().slice(0,10), cnpj_fornecedor:'', valor_total:'', xml_nome_arquivo:'manual' })
const blankItem = (n:number): NfeItem => ({ item_nfe:n, codigo_produto:'', descricao_produto:'', unidade:'UN', quantidade_total:0, valor_unitario:0, valor_total:0 })
const tag = (root:Element, name:string) => Array.from(root.getElementsByTagName('*')).find(x => x.localName === name)?.textContent?.trim() ?? ''
const money = (v:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v || 0)

function parseNfe(xml:string): { header:Header; items:NfeItem[] } {
  const doc = new DOMParser().parseFromString(xml,'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('O arquivo selecionado não é um XML válido.')
  const inf = Array.from(doc.getElementsByTagName('*')).find(e => e.localName === 'infNFe')
  if (!inf) throw new Error('O XML não possui a estrutura de uma NF-e.')
  const ide = Array.from(inf.getElementsByTagName('*')).find(e => e.localName === 'ide') || inf
  const emit = Array.from(inf.getElementsByTagName('*')).find(e => e.localName === 'emit') || inf
  const total = Array.from(inf.getElementsByTagName('*')).find(e => e.localName === 'ICMSTot') || inf
  const dets = Array.from(inf.getElementsByTagName('*')).filter(e => e.localName === 'det')
  const header:Header = {
    numero_nfe: tag(ide,'nNF'),
    serie: tag(ide,'serie'),
    chave_acesso: (inf.getAttribute('Id') || '').replace(/^NFe/,''),
    data_emissao: tag(ide,'dhEmi') || tag(ide,'dEmi'),
    cnpj_fornecedor: tag(emit,'CNPJ'),
    valor_total: tag(total,'vNF'),
    xml_nome_arquivo: ''
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
    file.text().then(text => {
      const parsed = parseNfe(text)
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
    <header className="industrial-page-head">
      <div><span className="industrial-eyebrow">ALMOXARIFADO • ENTRADA DE MATERIAIS</span><h1>Recebimento de materiais</h1><p>Registre a entrada pela NF-e, manualmente ou pelo XML, e faça a rastreabilidade por lote.</p></div>
      <div className="receipt-actions"><button className="industrial-secondary" type="button" onClick={reset}><RefreshCw size={17}/> Novo</button><button className="industrial-secondary" type="button" onClick={() => window.print()}><Printer size={17}/> Imprimir</button><a className="industrial-secondary" href="/erp-industrial"><ArrowLeft size={17}/> Voltar</a></div>
    </header>
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
      .receipt-actions{display:flex;gap:8px;flex-wrap:wrap}.receipt-form-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}.receipt-wide{grid-column:span 2}.receipt-upload{display:inline-flex;align-items:center;gap:7px;background:#2D8DB8;color:#fff;border-radius:10px;padding:10px 14px;font-weight:900;cursor:pointer}.receipt-items{display:grid;gap:10px}.receipt-item{display:grid;grid-template-columns:42px 1fr 2fr 110px 130px 130px 38px;gap:10px;align-items:end;padding:13px;border:1px solid #d9e6eb;border-radius:12px;background:#f8fcfd}.receipt-item-number{display:grid;place-items:center;height:42px;border-radius:9px;background:#123B50;color:#fff;font-weight:950}.receipt-item label{font-size:12px}.receipt-lot-table{overflow:auto}.receipt-lot-table input{min-width:120px}.receipt-lot-add{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.receipt-alert{display:flex;align-items:center;gap:8px;padding:11px 13px;border-radius:10px;margin-top:12px;font-weight:750}.receipt-alert.error{background:#fff1f2;border:1px solid #fecdd3;color:#9f1239}.receipt-alert.ok{background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46}.receipt-ok{display:inline-flex;align-items:center;gap:5px;color:#16845B;font-weight:850}.receipt-bad{display:inline-flex;align-items:center;gap:5px;color:#C74646;font-weight:850}.receipt-summary{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:18px;background:#123B50;color:#fff;border-radius:16px;margin-top:14px}.receipt-summary>div{display:grid;gap:4px}.receipt-summary span{opacity:.85}@media(max-width:1050px){.receipt-form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.receipt-item{grid-template-columns:42px 1fr 1fr 110px 130px 38px}.receipt-item-description{grid-column:span 2}}@media(max-width:700px){.receipt-form-grid{grid-template-columns:1fr}.receipt-wide{grid-column:auto}.receipt-item{grid-template-columns:1fr}.receipt-item-description{grid-column:auto}.receipt-summary{align-items:stretch;flex-direction:column}}@media print{.receipt-actions,.v7-topbar{display:none!important}.receipt-summary{color:#111;background:#fff;border:1px solid #999}}`
    }</style>
  </div>
}
