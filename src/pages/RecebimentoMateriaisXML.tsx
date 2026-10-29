/**
 * SYNQRA ERP INDUSTRIAL — recebimento de materiais via XML NF-e.
 * @REVISAO 29/10/2026
 * Utiliza RPC transacional existente erp_confirmar_recebimento_nfe.
 * A interface valida coerência estrutural; não substitui validação criptográfica/XSD ou consulta SEFAZ.
 */
import { useState, type ChangeEvent } from 'react'
import { FileUp, CheckCircle2, AlertTriangle, Boxes, LoaderCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type NfeHeader = {
  chave_acesso: string
  numero_nfe: string
  serie: string
  cnpj_fornecedor: string
  nome_fornecedor: string
  data_emissao: string
  valor_total: number
  xml_nome_arquivo: string
  xml_hash: string
}
type NfeItem = {
  item_nfe: number
  codigo_produto: string
  descricao_produto: string
  unidade: string
  quantidade_total: number
  valor_unitario: number
  valor_total: number
  lote_interno: string
  lote_fabricante: string
  data_validade: string
}
const panel = 'rounded-xl border border-slate-700 bg-[#111827] p-4 text-slate-100 shadow-xl'
const field = 'min-h-9 w-full rounded-xl border border-slate-600 bg-[#0b0f19] px-3 py-2 text-xs text-slate-100 outline-none focus:border-orange-500'
const label = 'mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400'
const primary = 'inline-flex min-h-9 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50'

function tag(parent: Element | Document, name: string): string {
  return parent.getElementsByTagName(name)[0]?.textContent?.trim() ?? ''
}
function digits(value: string): string { return value.replace(/\D/g, '') }
function validNfeKey(key: string): boolean {
  if (!/^\d{44}$/.test(key)) return false
  const body = key.slice(0, 43)
  let weight = 2
  let sum = 0
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * weight
    weight = weight === 9 ? 2 : weight + 1
  }
  const remainder = sum % 11
  const checkDigit = remainder === 0 || remainder === 1 ? 0 : 11 - remainder
  return checkDigit === Number(key[43])
}
function errorText(error: unknown): string { return error instanceof Error ? error.message : 'Não foi possível processar o XML.' }

export default function RecebimentoMateriaisXML() {
  const [header, setHeader] = useState<NfeHeader | null>(null)
  const [items, setItems] = useState<NfeItem[]>([])
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const importXml = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setBusy(true); setError(''); setNotice(''); setHeader(null); setItems([])
    try {
      if (!file.name.toLowerCase().endsWith('.xml') || file.size > 15 * 1024 * 1024) {
        throw new Error('Selecione um arquivo XML de até 15 MB.')
      }
      const bytes = await file.arrayBuffer()
      const xmlText = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      const documentXml = new DOMParser().parseFromString(xmlText, 'application/xml')
      if (documentXml.getElementsByTagName('parsererror').length) throw new Error('O arquivo não contém XML bem-formado.')
      const infNfe = documentXml.getElementsByTagName('infNFe')[0]
      const prot = documentXml.getElementsByTagName('infProt')[0]
      if (!infNfe || !prot) throw new Error('O arquivo precisa conter infNFe e o protocolo de autorização infProt.')
      const keyFromInf = (infNfe.getAttribute('Id') ?? '').replace(/^NFe/, '')
      const keyFromProtocol = tag(prot, 'chNFe')
      const key = keyFromProtocol || keyFromInf
      const cStat = tag(prot, 'cStat')
      if (!validNfeKey(key)) throw new Error('A chave de acesso NF-e está inválida ou com dígito verificador incorreto.')
      if (keyFromInf && keyFromInf !== key) throw new Error('A chave do protocolo não corresponde ao documento infNFe.')
      if (!['100', '150'].includes(cStat)) throw new Error('O protocolo não informa autorização de uso (cStat 100/150).')
      const emit = infNfe.getElementsByTagName('emit')[0]
      const ide = infNfe.getElementsByTagName('ide')[0]
      const total = infNfe.getElementsByTagName('ICMSTot')[0]
      if (!emit || !ide) throw new Error('A NF-e não contém os grupos de emitente e identificação.')
      const cnpj = digits(tag(emit, 'CNPJ'))
      const numero = tag(ide, 'nNF')
      const serie = tag(ide, 'serie')
      const emitted = tag(ide, 'dhEmi') || tag(ide, 'dEmi')
      if (cnpj.length !== 14 || !numero || !serie || !emitted) throw new Error('Dados obrigatórios do emitente ou da NF-e estão ausentes.')
      const detNodes = Array.from(infNfe.getElementsByTagName('det'))
      if (!detNodes.length) throw new Error('A NF-e não contém itens.')
      const nextItems: NfeItem[] = detNodes.map((det, index) => {
        const prod = det.getElementsByTagName('prod')[0]
        if (!prod) throw new Error('Um item da NF-e não contém o grupo prod.')
        const itemNumber = Number(det.getAttribute('nItem') || index + 1)
        const code = tag(prod, 'cProd')
        const description = tag(prod, 'xProd')
        const unit = tag(prod, 'uCom') || 'UN'
        const qty = Number(tag(prod, 'qCom'))
        const unitValue = Number(tag(prod, 'vUnCom'))
        const totalValue = Number(tag(prod, 'vProd') || qty * unitValue)
        if (!code || !description || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitValue) || unitValue < 0) {
          throw new Error('Um item contém código/descrição ausente ou quantidade/valor inválido.')
        }
        const rastro = det.getElementsByTagName('rastro')[0]
        const supplierLot = rastro ? tag(rastro, 'nLote') : ''
        const validity = rastro ? tag(rastro, 'dVal') : ''
        return {
          item_nfe: itemNumber,
          codigo_produto: code,
          descricao_produto: description,
          unidade: unit,
          quantidade_total: qty,
          valor_unitario: unitValue,
          valor_total: totalValue,
          lote_interno: 'REC-' + key.slice(-8) + '-' + String(itemNumber).padStart(3, '0'),
          lote_fabricante: supplierLot,
          data_validade: validity,
        }
      })
      const hash = await crypto.subtle.digest('SHA-256', bytes)
      const xmlHash = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
      setHeader({
        chave_acesso: key,
        numero_nfe: numero,
        serie,
        cnpj_fornecedor: cnpj,
        nome_fornecedor: tag(emit, 'xNome'),
        data_emissao: emitted.slice(0, 10),
        valor_total: Number(tag(total ?? infNfe, 'vNF') || nextItems.reduce((sum, item) => sum + item.valor_total, 0)),
        xml_nome_arquivo: file.name,
        xml_hash: xmlHash,
      })
      setItems(nextItems)
    } catch (cause) {
      setError(errorText(cause))
    } finally {
      setBusy(false)
      event.target.value = ''
    }
  }

  const updateItem = (index: number, key: 'lote_interno' | 'lote_fabricante' | 'data_validade', value: string) => {
    setItems(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item))
  }

  const confirm = async () => {
    if (!header || !items.length) return
    setSaving(true); setError(''); setNotice('')
    try {
      if (items.some(item => !item.lote_interno.trim())) throw new Error('Todos os itens precisam de código de lote interno.')
      const { data, error: rpcError } = await supabase.rpc('erp_confirmar_recebimento_nfe', {
        p_header: header,
        p_items: items.map(item => ({
          item_nfe: item.item_nfe,
          codigo_produto: item.codigo_produto,
          descricao_produto: item.descricao_produto,
          unidade: item.unidade,
          quantidade_total: item.quantidade_total,
          valor_unitario: item.valor_unitario,
          valor_total: item.valor_total,
        })),
        p_lotes: items.map(item => ({
          item_nfe: item.item_nfe,
          lote_interno: item.lote_interno.trim(),
          lote_fabricante: item.lote_fabricante.trim() || null,
          data_validade: item.data_validade || null,
          quantidade: item.quantidade_total,
        })),
      })
      if (rpcError) throw rpcError
      if (!data) throw new Error('A RPC não retornou o identificador do recebimento.')
      setNotice('Recebimento confirmado. Estoque, lotes e rastreabilidade foram gravados pela transação do banco.')
      setHeader(null); setItems([])
    } catch (cause) {
      setError(errorText(cause))
    } finally { setSaving(false) }
  }

  return <main className="min-h-[calc(100vh-76px)] bg-[#0b0f19] p-4 text-slate-100 md:p-6">
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-800 pb-4"><div className="grid h-11 w-11 place-items-center rounded-xl bg-orange-500 text-slate-950"><Boxes size={22}/></div><div><h1 className="text-lg font-extrabold uppercase tracking-wide text-white">Recebimento de materiais via XML</h1><p className="mt-1 text-xs text-slate-400">Conferência da NF-e, mapeamento de lotes e entrada transacional no estoque.</p></div></header>
      {error && <div role="alert" className="flex gap-2 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200"><AlertTriangle size={15}/>{error}</div>}
      {notice && <div role="status" className="flex gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-200"><CheckCircle2 size={15}/>{notice}</div>}
      <section className={panel + ' flex flex-wrap items-center justify-between gap-4'}>
        <div className="flex items-center gap-3"><FileUp size={20} className="text-orange-400"/><div><h2 className="text-sm font-bold">Arquivo autorizado de NF-e</h2><p className="mt-1 text-xs text-slate-400">XML até 15 MB; exige protocolo e chave coerente.</p></div></div>
        <label className={primary + ' cursor-pointer'}>{busy ? <LoaderCircle size={14} className="animate-spin"/> : <FileUp size={14}/>} {busy ? 'Lendo XML…' : 'Selecionar XML'}<input type="file" accept=".xml,application/xml,text/xml" onChange={event => void importXml(event)} disabled={busy||saving} className="sr-only"/></label>
      </section>
      {header && <><section className={panel + ' grid grid-cols-1 gap-3 md:grid-cols-4'}><div className="md:col-span-4"><label className={label}>Chave de acesso</label><p className="break-all font-mono text-xs text-cyan-300">{header.chave_acesso}</p></div><div><label className={label}>Número / Série</label><p className="text-xs">{header.numero_nfe} / {header.serie}</p></div><div><label className={label}>Emitente</label><p className="text-xs font-bold text-orange-300">{header.nome_fornecedor}</p><p className="mt-1 text-[10px] text-slate-400">CNPJ {header.cnpj_fornecedor}</p></div><div><label className={label}>Data de emissão</label><p className="text-xs">{header.data_emissao}</p></div><div><label className={label}>Valor total</label><p className="text-xs font-bold">{header.valor_total.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p></div></section>
        <section className={panel + ' space-y-3'}><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-extrabold uppercase">Itens e rastreabilidade</h2><span className="text-[10px] text-slate-400">{items.length} item(ns)</span></div><div className="overflow-x-auto rounded-xl border border-slate-700"><table className="w-full min-w-[1050px] text-left text-xs"><thead className="bg-[#0b0f19] text-[10px] uppercase text-slate-400"><tr><th className="p-3">Código / descrição XML</th><th className="p-3 text-right">Quantidade</th><th className="p-3">Lote interno</th><th className="p-3">Lote fabricante</th><th className="p-3">Validade</th></tr></thead><tbody>{items.map((item,index)=><tr key={item.item_nfe} className="border-t border-slate-800"><td className="p-3"><b>{item.codigo_produto}</b><p className="mt-1 text-[10px] text-slate-400">{item.descricao_produto}</p></td><td className="p-3 text-right tabular-nums">{item.quantidade_total.toLocaleString('pt-BR')}</td><td className="p-3"><input className={field} value={item.lote_interno} onChange={event=>updateItem(index,'lote_interno',event.target.value)} required/></td><td className="p-3"><input className={field} value={item.lote_fabricante} onChange={event=>updateItem(index,'lote_fabricante',event.target.value)} placeholder="Não informado no XML"/></td><td className="p-3"><input className={field} type="date" value={item.data_validade} onChange={event=>updateItem(index,'data_validade',event.target.value)}/></td></tr>)}</tbody></table></div><div className="flex flex-wrap items-start justify-between gap-3"><p className="max-w-3xl text-[10px] leading-5 text-amber-200">A leitura verifica estrutura, protocolo informado e dígito da chave. Ela não verifica criptograficamente a assinatura, não valida XSD nem consulta a SEFAZ; confirme a autenticidade fiscal antes de efetivar a entrada.</p><button type="button" onClick={()=>void confirm()} className={primary} disabled={saving||busy}>{saving?<LoaderCircle size={14} className="animate-spin"/>:<CheckCircle2 size={14}/>} {saving?'Confirmando…':'Confirmar entrada no estoque'}</button></div></section></>}
    </div>
  </main>
}
