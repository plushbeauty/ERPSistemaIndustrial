import { useMemo, useState, type ChangeEvent } from 'react'
import { FileUp, FileCheck2, AlertCircle, PackageCheck } from 'lucide-react'

type XmlItem = { code: string; description: string; quantity: string; unit: string }
type ParsedInvoice = { key: string; number: string; series: string; issuedAt: string; supplier: string; supplierTaxId: string; items: XmlItem[] }

function firstText(parent: Element | Document, selectors: string[]): string {
  for (const selector of selectors) {
    const value = parent.querySelector(selector)?.textContent?.trim()
    if (value) return value
  }
  return ''
}

function parseNfeXml(source: string): ParsedInvoice {
  const documentXml = new DOMParser().parseFromString(source, 'application/xml')
  if (documentXml.querySelector('parsererror')) throw new Error('O arquivo selecionado não contém um XML válido.')
  const nfe = documentXml.querySelector('NFe')
  const info = nfe?.querySelector('infNFe')
  if (!nfe || !info) throw new Error('XML não reconhecido como NF-e. Selecione o XML autorizado da nota fiscal.')
  const accessKey = (info.getAttribute('Id') ?? '').replace(/^NFe/i, '')
  if (accessKey && !/^\d{44}$/.test(accessKey)) throw new Error('A chave de acesso encontrada no XML não possui 44 dígitos.')
  const items = Array.from(info.querySelectorAll(':scope > det')).map((detail) => {
    const product = detail.querySelector('prod')
    return {
      code: firstText(product ?? detail, ['cProd']) || '—',
      description: firstText(product ?? detail, ['xProd']) || 'Item sem descrição',
      quantity: firstText(product ?? detail, ['qCom']) || '0',
      unit: firstText(product ?? detail, ['uCom']) || '—',
    }
  })
  if (!items.length) throw new Error('A NF-e não contém itens de produtos para conferência.')
  return {
    key: accessKey,
    number: firstText(info, ['ide > nNF']),
    series: firstText(info, ['ide > serie']),
    issuedAt: firstText(info, ['ide > dhEmi', 'ide > dEmi']),
    supplier: firstText(info, ['emit > xNome']) || 'Fornecedor não identificado no XML',
    supplierTaxId: firstText(info, ['emit > CNPJ', 'emit > CPF']),
    items,
  }
}

export default function XmlInvoiceReceiptScreen() {
  const [invoice, setInvoice] = useState<ParsedInvoice | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [accessKey, setAccessKey] = useState('')
  const [busy, setBusy] = useState(false)
  const itemCount = useMemo(() => invoice?.items.length ?? 0, [invoice])

  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setError('')
    setInvoice(null)
    setFileName('')
    if (!file) return
    if (!file.name.toLocaleLowerCase('pt-BR').endsWith('.xml') && file.type !== 'text/xml' && file.type !== 'application/xml') {
      setError('Selecione um arquivo XML de NF-e.')
      event.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('O XML excede o limite de 5 MB para leitura no navegador.')
      event.target.value = ''
      return
    }
    setBusy(true)
    try {
      const parsed = parseNfeXml(await file.text())
      setInvoice(parsed)
      setFileName(file.name)
      setAccessKey(parsed.key)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível ler o XML selecionado.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="compras-page" aria-label="Recebimento de materiais por XML">
    <header className="compras-header"><div><h1>Recebimento de Materiais · XML Fiscal</h1><p>Leitura do XML real da NF-e para conferência antes de registrar a entrada.</p></div></header>
    <section className="compras-panel">
      <div className="compras-panel-heading"><div><h2>Importar nota fiscal</h2><p>Selecione o XML autorizado da NF-e. Nenhum dado demonstrativo será inventado.</p></div></div>
      <div className="compras-form-grid">
        <label className="compras-field compras-field--full"><span>Chave de acesso (44 dígitos, opcional se vier no XML)</span><input value={accessKey} onChange={event => setAccessKey(event.target.value.replace(/\D/g, '').slice(0,44))} inputMode="numeric" maxLength={44} placeholder="Digite ou carregue a chave de acesso" /></label>
        <label className="compras-field compras-field--full"><span>Arquivo XML da NF-e</span><input type="file" accept=".xml,text/xml,application/xml" onChange={loadFile} /></label>
      </div>
      {busy && <div className="compras-loading"><FileUp size={16}/> Lendo e validando o XML…</div>}
      {error && <div className="compras-error" role="alert"><AlertCircle size={17}/><strong>{error}</strong></div>}
      {invoice && <section className="compras-panel" aria-label="Conferência dos dados fiscais">
        <div className="compras-panel-heading"><div><h2><FileCheck2 size={16}/> Dados extraídos do arquivo</h2><p>{fileName}</p></div><span className="compras-status compras-status--success">XML lido</span></div>
        <div className="compras-form-grid">
          <div className="compras-field"><span>Número da NF-e</span><strong>{invoice.number || '—'} · Série {invoice.series || '—'}</strong></div>
          <div className="compras-field"><span>Data de emissão</span><strong>{invoice.issuedAt || '—'}</strong></div>
          <div className="compras-field compras-field--full"><span>Fornecedor / Emitente</span><strong>{invoice.supplier}</strong></div>
          <div className="compras-field"><span>CNPJ/CPF do emitente</span><strong>{invoice.supplierTaxId || '—'}</strong></div>
          <div className="compras-field"><span>Itens encontrados</span><strong>{itemCount}</strong></div>
          <div className="compras-field compras-field--full"><span>Chave de acesso extraída</span><strong>{invoice.key || 'Não informada no atributo infNFe@Id'}</strong></div>
        </div>
        <div className="compras-table-scroll"><table className="compras-table"><thead><tr><th>Código</th><th>Descrição do material</th><th>Quantidade</th><th>Unidade</th></tr></thead><tbody>{invoice.items.map((item,index)=><tr key={item.code+'-'+index}><td>{item.code}</td><td>{item.description}</td><td>{item.quantity}</td><td>{item.unit}</td></tr>)}</tbody></table></div>
        <div className="compras-notice compras-notice--warning"><PackageCheck size={17}/><div><strong>Conferência concluída; entrada ainda não efetivada.</strong><p>Antes de movimentar o estoque, o ERP precisa validar duplicidade, empresa/tenant, fornecedor, vínculo com pedido e a operação transacional de recebimento existente. Esta tela não grava estoque nem gera lote fictício.</p></div></div>
      </section>}
    </section>
    <footer className="compras-footer"><span>SYSNQRA ERP INDUSTRIAL · RECEBIMENTO FISCAL</span><span>Revisão 29/10/2026 · Leitura XML no navegador</span></footer>
  </main>
}
