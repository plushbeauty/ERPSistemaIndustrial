import { useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'

type Tab = 'gerais' | 'parceiros' | 'itens' | 'impostos' | 'transporte'

type NFeItem = {
  id: string
  codigo: string
  descricao: string
  ncm: string
  cfop: string
  unidade: string
  quantidade: string
  valorUnitario: string
  desconto: string
  origem: string
  total: number
}

type Partner = {
  cnpjCpf: string
  inscricaoEstadual: string
  razaoSocial: string
  endereco: string
  bairro: string
  cep: string
  cidade: string
  uf: string
  email: string
}

type NFeForm = {
  numero: string
  serie: string
  emissao: string
  saida: string
  natureza: string
  cfop: string
  tipo: 'E' | 'S'
  ambiente: 'homologacao' | 'producao'
  parceiro: Partner
  valorFrete: string
  valorDesconto: string
  outrasDespesas: string
  baseIcms: string
  valorIcms: string
  baseIcmsSt: string
  valorSt: string
  valorIpi: string
  valorPis: string
  valorCofins: string
  modalidadeFrete: '0' | '1'
  transportadora: string
  placa: string
  ufTransportadora: string
  pesoLiquido: string
  pesoBruto: string
  volumes: string
}

const initialForm: NFeForm = {
  numero: '',
  serie: '1',
  emissao: new Date().toISOString().slice(0, 16),
  saida: '',
  natureza: 'Venda de produção do estabelecimento',
  cfop: '5101',
  tipo: 'S',
  ambiente: 'homologacao',
  parceiro: { cnpjCpf: '', inscricaoEstadual: '', razaoSocial: '', endereco: '', bairro: '', cep: '', cidade: '', uf: '', email: '' },
  valorFrete: '0',
  valorDesconto: '0',
  outrasDespesas: '0',
  baseIcms: '0',
  valorIcms: '0',
  baseIcmsSt: '0',
  valorSt: '0',
  valorIpi: '0',
  valorPis: '0',
  valorCofins: '0',
  modalidadeFrete: '0',
  transportadora: '',
  placa: '',
  ufTransportadora: '',
  pesoLiquido: '0',
  pesoBruto: '0',
  volumes: '0',
}

const emptyItem = (): NFeItem => ({
  id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  codigo: '',
  descricao: '',
  ncm: '',
  cfop: '5101',
  unidade: 'UN',
  quantidade: '1',
  valorUnitario: '0',
  desconto: '0',
  origem: '0',
  total: 0,
})

const numberValue = (value: string): number => {
  const normalized = value.replace(/\./g, '').replace(',', '.').trim()
  const result = Number(normalized)
  return Number.isFinite(result) ? result : 0
}

const digits = (value: string, max: number): string => value.replace(/\D/g, '').slice(0, max)
const codeForDatabase = (value: string, length: number): string => digits(value, length).padStart(length, '0')

const money = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

function Field({
  label, value, onChange, className = '', type = 'text', maxLength, inputMode,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
  type?: string
  maxLength?: number
  inputMode?: 'text' | 'numeric' | 'decimal' | 'email'
}) {
  return (
    <label className={className}>
      <span className="nfe-label">{label}</span>
      <input className="nfe-input" type={type} value={value} maxLength={maxLength} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function SelectField({
  label, value, onChange, children, className = '',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
  className?: string
}) {
  return (
    <label className={className}>
      <span className="nfe-label">{label}</span>
      <select className="nfe-input" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
    </label>
  )
}

export default function NFeEmissao() {
  const [tab, setTab] = useState<Tab>('gerais')
  const [form, setForm] = useState<NFeForm>(initialForm)
  const [items, setItems] = useState<NFeItem[]>([emptyItem()])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [documentId, setDocumentId] = useState<string | null>(null)

  const totalProdutos = useMemo(() => items.reduce((sum, item) => sum + item.total, 0), [items])
  const valorFrete = numberValue(form.valorFrete)
  const valorDesconto = numberValue(form.valorDesconto)
  const outrasDespesas = numberValue(form.outrasDespesas)
  const totalNota = Math.max(0, totalProdutos + valorFrete + outrasDespesas - valorDesconto)

  const updateForm = <K extends keyof NFeForm>(key: K, value: NFeForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setMessage('')
    setError('')
  }

  const updatePartner = <K extends keyof Partner>(key: K, value: Partner[K]) => {
    setForm((current) => ({ ...current, parceiro: { ...current.parceiro, [key]: value } }))
  }

  const updateItem = <K extends keyof NFeItem>(id: string, key: K, value: NFeItem[K]) => {
    setItems((current) => current.map((item) => {
      if (item.id !== id) return item
      const next = { ...item, [key]: value }
      const quantity = numberValue(next.quantidade)
      const unit = numberValue(next.valorUnitario)
      const discount = numberValue(next.desconto)
      return { ...next, total: Math.max(0, quantity * unit - discount) }
    }))
  }

  const addItem = () => setItems((current) => [...current, emptyItem()])
  const removeItem = (id: string) => setItems((current) => current.length === 1 ? current : current.filter((item) => item.id !== id))

  const validate = (): string | null => {
    if (!form.natureza.trim()) return 'Informe a natureza da operação.'
    if (digits(form.cfop, 4).length !== 4) return 'O CFOP deve possuir 4 dígitos.'
    if (!form.parceiro.cnpjCpf.trim()) return 'Informe o CNPJ/CPF do destinatário.'
    if (!form.parceiro.razaoSocial.trim()) return 'Informe a razão social do destinatário.'
    const validItems = items.filter((item) => item.codigo.trim() && item.descricao.trim())
    if (!validItems.length) return 'Inclua ao menos um item válido na NF-e.'
    for (const item of validItems) {
      if (digits(item.ncm, 8).length !== 8) return 'Cada NCM informado deve possuir 8 dígitos.'
      if (digits(item.cfop, 4).length !== 4) return 'Cada CFOP de item deve possuir 4 dígitos.'
      if (numberValue(item.quantidade) <= 0) return 'A quantidade de cada item deve ser maior que zero.'
    }
    return null
  }

  const saveDraft = async () => {
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const validation = validate()
      if (validation) throw new Error(validation)

      const company = await supabase.rpc('erp_current_company_id')
      if (company.error || !company.data) throw new Error(company.error?.message || 'Empresa da sessão não localizada.')
      const empresaId = String(company.data)

      const payload = {
        empresa_id: empresaId,
        tipo: form.tipo === 'S' ? 'saida' : 'entrada',
        modelo: '55',
        serie: numberValue(form.serie),
        numero: form.numero ? numberValue(form.numero) : null,
        status: 'rascunho',
        ambiente: form.ambiente,
        natureza_operacao: form.natureza.trim(),
        data_emissao: form.emissao ? new Date(form.emissao).toISOString() : new Date().toISOString(),
        destinatario_nome: form.parceiro.razaoSocial.trim(),
        destinatario_documento: form.parceiro.cnpjCpf.trim(),
        valor_total: totalNota,
        valor_produtos: totalProdutos,
        valor_frete: valorFrete,
        valor_outras_despesas: outrasDespesas,
        valor_desconto: valorDesconto,
        base_calculo_icms: numberValue(form.baseIcms),
        valor_icms: numberValue(form.valorIcms),
        valor_ipi: numberValue(form.valorIpi),
        valor_pis: numberValue(form.valorPis),
        valor_cofins: numberValue(form.valorCofins),
        valor_liquido: totalNota,
      }

      const saved = documentId
        ? await supabase.from('erp_documentos_fiscais').update(payload).eq('id', documentId).select('id').single()
        : await supabase.from('erp_documentos_fiscais').insert(payload).select('id').single()

      if (saved.error || !saved.data) throw new Error(saved.error?.message || 'Não foi possível gravar o rascunho.')
      const id = String(saved.data.id)
      setDocumentId(id)

      if (documentId) {
        const deleted = await supabase.from('erp_documentos_fiscais_itens').delete().eq('documento_id', id)
        if (deleted.error) throw deleted.error
      }

      const rows = items
        .filter((item) => item.codigo.trim() && item.descricao.trim())
        .map((item, index) => ({
          empresa_id: empresaId,
          documento_id: id,
          item_numero: index + 1,
          codigo_produto: item.codigo.trim(),
          descricao_produto: item.descricao.trim(),
          ncm: codeForDatabase(item.ncm, 8),
          cfop: codeForDatabase(item.cfop, 4),
          unidade: item.unidade.trim().slice(0, 6) || 'UN',
          quantidade: numberValue(item.quantidade),
          valor_unitario: numberValue(item.valorUnitario),
          valor_total: item.total,
          origem: codeForDatabase(item.origem, 1),
        }))

      if (rows.length) {
        const inserted = await supabase.from('erp_documentos_fiscais_itens').insert(rows)
        if (inserted.error) throw inserted.error
      }

      setMessage('NF-e salva como rascunho. Nenhuma transmissão à SEFAZ foi executada.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar a NF-e.')
    } finally {
      setBusy(false)
    }
  }

  const tabs: Array<[Tab, string]> = [
    ['gerais', '1. Gerais'], ['parceiros', '2. Parceiros'], ['itens', '3. Itens da NF'], ['impostos', '4. Impostos'], ['transporte', '5. Transporte / Totais'],
  ]

  return (
    <main className="nfe-page">
      <header className="nfe-header">
        <div><span className="nfe-eyebrow">FISCAL • MODELO 55 • NF-e</span><h1>Emissão de Nota Fiscal Eletrônica</h1><p>Digitação compacta por abas, com rascunho persistido no ERP.</p></div>
        <div className="nfe-header-actions"><span className="nfe-status">{documentId ? 'RASCUNHO SALVO' : 'NOVO RASCUNHO'}</span><button className="nfe-primary" type="button" onClick={() => void saveDraft()} disabled={busy}>{busy ? 'Salvando…' : 'Salvar rascunho'}</button></div>
      </header>

      {error && <div className="nfe-alert nfe-error">{error}</div>}
      {message && <div className="nfe-alert nfe-success">{message}</div>}

      <nav className="nfe-tabs" aria-label="Etapas da NF-e">
        {tabs.map(([id, label]) => <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
      </nav>

      {tab === 'gerais' && <section className="nfe-card"><div className="nfe-grid nfe-grid-general">
        <Field label="número da nota" value={form.numero} onChange={(v) => updateForm('numero', v)} className="compact-100" inputMode="numeric" />
        <Field label="série" value={form.serie} onChange={(v) => updateForm('serie', digits(v, 3))} className="compact-80" inputMode="numeric" />
        <Field label="emissão" type="datetime-local" value={form.emissao} onChange={(v) => updateForm('emissao', v)} className="compact-180" />
        <Field label="saída" type="datetime-local" value={form.saida} onChange={(v) => updateForm('saida', v)} className="compact-180" />
        <Field label="natureza da operação" value={form.natureza} onChange={(v) => updateForm('natureza', v)} className="wide-field" />
        <Field label="CFOP" value={form.cfop} onChange={(v) => updateForm('cfop', digits(v, 4))} className="compact-90" maxLength={4} inputMode="numeric" />
        <SelectField label="tipo" value={form.tipo} onChange={(v) => updateForm('tipo', v as 'E' | 'S')} className="compact-80"><option value="S">Saída</option><option value="E">Entrada</option></SelectField>
        <SelectField label="ambiente" value={form.ambiente} onChange={(v) => updateForm('ambiente', v as 'homologacao' | 'producao')} className="compact-130"><option value="homologacao">Homologação</option><option value="producao">Produção</option></SelectField>
      </div></section>}

      {tab === 'parceiros' && <section className="nfe-card"><div className="nfe-grid nfe-grid-partner">
        <Field label="CNPJ / CPF" value={form.parceiro.cnpjCpf} onChange={(v) => updatePartner('cnpjCpf', v)} className="compact-180" />
        <Field label="inscrição estadual" value={form.parceiro.inscricaoEstadual} onChange={(v) => updatePartner('inscricaoEstadual', v)} className="compact-150" />
        <Field label="razão social" value={form.parceiro.razaoSocial} onChange={(v) => updatePartner('razaoSocial', v)} className="wide-field" />
        <Field label="endereço" value={form.parceiro.endereco} onChange={(v) => updatePartner('endereco', v)} className="wide-field" />
        <Field label="bairro" value={form.parceiro.bairro} onChange={(v) => updatePartner('bairro', v)} />
        <Field label="CEP" value={form.parceiro.cep} onChange={(v) => updatePartner('cep', v)} className="compact-100" />
        <Field label="cidade" value={form.parceiro.cidade} onChange={(v) => updatePartner('cidade', v)} />
        <Field label="UF" value={form.parceiro.uf.toUpperCase().slice(0, 2)} onChange={(v) => updatePartner('uf', v.toUpperCase().slice(0, 2))} className="compact-70" maxLength={2} />
        <Field label="e-mail" value={form.parceiro.email} onChange={(v) => updatePartner('email', v)} className="wide-field" type="email" />
      </div></section>}

      {tab === 'itens' && <section className="nfe-card nfe-items-card">
        <div className="nfe-card-title"><div><h2>Itens da NF-e</h2><p>Grade densa para lançamento sequencial. NCM e CFOP são normalizados somente no envio ao banco.</p></div><button className="nfe-secondary" type="button" onClick={addItem}>+ Adicionar item</button></div>
        <div className="nfe-table-wrap"><table className="nfe-table"><thead><tr><th className="w-code">código</th><th className="w-description">descrição</th><th className="w-ncm">NCM</th><th className="w-cfop">CFOP</th><th className="w-unit">UN</th><th className="w-qty">qtd.</th><th className="w-price">preço unit.</th><th className="w-price">desconto</th><th className="w-origin">origem</th><th className="w-total">total</th><th /></tr></thead>
          <tbody>{items.map((item) => <tr key={item.id}>
            <td><input value={item.codigo} onChange={(e) => updateItem(item.id, 'codigo', e.target.value)} /></td>
            <td><input value={item.descricao} onChange={(e) => updateItem(item.id, 'descricao', e.target.value)} /></td>
            <td><input maxLength={8} inputMode="numeric" value={item.ncm} onChange={(e) => updateItem(item.id, 'ncm', digits(e.target.value, 8))} /></td>
            <td><input maxLength={4} inputMode="numeric" value={item.cfop} onChange={(e) => updateItem(item.id, 'cfop', digits(e.target.value, 4))} /></td>
            <td><input maxLength={6} value={item.unidade} onChange={(e) => updateItem(item.id, 'unidade', e.target.value.toUpperCase())} /></td>
            <td><input inputMode="decimal" value={item.quantidade} onChange={(e) => updateItem(item.id, 'quantidade', e.target.value)} /></td>
            <td><input inputMode="decimal" value={item.valorUnitario} onChange={(e) => updateItem(item.id, 'valorUnitario', e.target.value)} /></td>
            <td><input inputMode="decimal" value={item.desconto} onChange={(e) => updateItem(item.id, 'desconto', e.target.value)} /></td>
            <td><input maxLength={1} inputMode="numeric" value={item.origem} onChange={(e) => updateItem(item.id, 'origem', digits(e.target.value, 1))} /></td>
            <td className="nfe-number">{money(item.total)}</td><td><button className="nfe-remove" type="button" onClick={() => removeItem(item.id)} aria-label="Remover item">×</button></td>
          </tr>)}</tbody></table></div>
        <div className="nfe-total-strip"><span>Total dos produtos</span><strong>{money(totalProdutos)}</strong></div>
      </section>}

      {tab === 'impostos' && <section className="nfe-card"><div className="nfe-grid nfe-grid-taxes">
        <Field label="base de cálculo ICMS" value={form.baseIcms} onChange={(v) => updateForm('baseIcms', v)} inputMode="decimal" />
        <Field label="valor ICMS" value={form.valorIcms} onChange={(v) => updateForm('valorIcms', v)} inputMode="decimal" />
        <Field label="base ICMS ST" value={form.baseIcmsSt} onChange={(v) => updateForm('baseIcmsSt', v)} inputMode="decimal" />
        <Field label="valor ICMS ST" value={form.valorSt} onChange={(v) => updateForm('valorSt', v)} inputMode="decimal" />
        <Field label="valor IPI" value={form.valorIpi} onChange={(v) => updateForm('valorIpi', v)} inputMode="decimal" />
        <Field label="PIS" value={form.valorPis} onChange={(v) => updateForm('valorPis', v)} inputMode="decimal" />
        <Field label="COFINS" value={form.valorCofins} onChange={(v) => updateForm('valorCofins', v)} inputMode="decimal" />
      </div><div className="nfe-summary-grid">
        <article><span>produtos</span><strong>{money(totalProdutos)}</strong></article><article><span>frete</span><strong>{money(valorFrete)}</strong></article><article><span>desconto</span><strong>{money(valorDesconto)}</strong></article><article><span>total geral</span><strong>{money(totalNota)}</strong></article>
      </div></section>}

      {tab === 'transporte' && <section className="nfe-card"><div className="nfe-grid nfe-grid-transport">
        <SelectField label="frete" value={form.modalidadeFrete} onChange={(v) => updateForm('modalidadeFrete', v as '0' | '1')} className="compact-100"><option value="0">CIF</option><option value="1">FOB</option></SelectField>
        <Field label="transportadora" value={form.transportadora} onChange={(v) => updateForm('transportadora', v)} className="wide-field" />
        <Field label="placa" value={form.placa.toUpperCase()} onChange={(v) => updateForm('placa', v.toUpperCase().slice(0, 8))} className="compact-100" />
        <Field label="UF" value={form.ufTransportadora.toUpperCase().slice(0, 2)} onChange={(v) => updateForm('ufTransportadora', v.toUpperCase().slice(0, 2))} className="compact-70" maxLength={2} />
        <Field label="peso líquido" value={form.pesoLiquido} onChange={(v) => updateForm('pesoLiquido', v)} inputMode="decimal" />
        <Field label="peso bruto" value={form.pesoBruto} onChange={(v) => updateForm('pesoBruto', v)} inputMode="decimal" />
        <Field label="volumes" value={form.volumes} onChange={(v) => updateForm('volumes', v)} className="compact-100" inputMode="numeric" />
        <Field label="frete (R$)" value={form.valorFrete} onChange={(v) => updateForm('valorFrete', v)} inputMode="decimal" />
        <Field label="desconto (R$)" value={form.valorDesconto} onChange={(v) => updateForm('valorDesconto', v)} inputMode="decimal" />
        <Field label="outras despesas (R$)" value={form.outrasDespesas} onChange={(v) => updateForm('outrasDespesas', v)} inputMode="decimal" />
      </div><div className="nfe-footer-total"><div><span>Total dos produtos</span><strong>{money(totalProdutos)}</strong></div><div><span>Total geral da NF-e</span><strong>{money(totalNota)}</strong></div></div></section>}

      <style>{`
        .nfe-page{min-height:calc(100vh - 70px);background:#F4FBFD;color:#123B50;padding:24px 28px 48px;font-family:Inter,Roboto,Arial,sans-serif;box-sizing:border-box}
        .nfe-header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;background:#123B50;color:#fff;border-radius:14px;padding:20px 22px;margin-bottom:16px}.nfe-eyebrow{font-size:11px;letter-spacing:.14em;font-weight:900;color:#48B7C7}.nfe-header h1{margin:5px 0;font-size:29px;line-height:1.1}.nfe-header p{margin:5px 0 0;color:#D4E9EE}.nfe-header-actions{display:flex;align-items:center;gap:12px}.nfe-status{font-size:11px;font-weight:900;color:#BFE6EC;white-space:nowrap}
        .nfe-primary,.nfe-secondary,.nfe-remove{border:0;cursor:pointer;font-weight:900}.nfe-primary{background:#2D8DB8;color:#fff;border-radius:8px;padding:11px 16px}.nfe-secondary{background:#2D8DB8;color:#fff;border-radius:8px;padding:10px 14px}
        .nfe-alert{padding:12px 14px;border-radius:9px;margin-bottom:12px;font-weight:700}.nfe-error{background:#FCEBEC;border:1px solid #E6B1B5;color:#8B3038}.nfe-success{background:#E8F7F1;border:1px solid #A9D9C3;color:#176C4E}
        .nfe-tabs{display:flex;gap:4px;background:#fff;border:1px solid #CFE1E7;border-radius:11px;padding:5px;margin-bottom:14px;overflow:auto}.nfe-tabs button{border:0;background:transparent;color:#526C77;padding:11px 15px;border-radius:7px;white-space:nowrap;font-weight:850;cursor:pointer}.nfe-tabs button.active{background:#48B7C7;color:#123B50}
        .nfe-card{background:#fff;border:1px solid #D4E4EA;border-radius:12px;padding:18px;box-shadow:0 5px 18px rgba(18,59,80,.05)}.nfe-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:12px}.nfe-grid>label{min-width:0}.nfe-label{display:block;font-size:11px;text-transform:lowercase;font-weight:900;color:#536C77;margin:0 0 4px 1px}.nfe-input{width:100%;box-sizing:border-box;min-height:38px;border:1px solid #B9D2DA;border-radius:7px;background:#F9FCFD;color:#123B50;padding:7px 9px;outline:none;font-size:13px}.nfe-input:focus{border-color:#48B7C7;box-shadow:0 0 0 2px rgba(72,183,199,.16)}
        .nfe-grid-general>label,.nfe-grid-partner>label,.nfe-grid-taxes>label,.nfe-grid-transport>label{grid-column:span 3}.nfe-grid-general .wide-field,.nfe-grid-partner .wide-field,.nfe-grid-transport .wide-field{grid-column:span 6}.compact-70{grid-column:span 1!important;max-width:70px}.compact-80{grid-column:span 1!important;max-width:80px}.compact-90{grid-column:span 1!important;max-width:90px}.compact-100{grid-column:span 1!important;max-width:100px}.compact-130{grid-column:span 2!important;max-width:130px}.compact-150{grid-column:span 2!important;max-width:150px}.compact-180{grid-column:span 2!important;max-width:180px}
        .nfe-card-title{display:flex;justify-content:space-between;gap:14px;align-items:center;margin-bottom:14px}.nfe-card-title h2{margin:0;font-size:20px}.nfe-card-title p{margin:4px 0 0;color:#607985;font-size:13px}.nfe-table-wrap{overflow:auto}.nfe-table{width:100%;border-collapse:collapse;min-width:1120px}.nfe-table th{background:#123B50;color:#fff;text-align:left;font-size:10px;text-transform:uppercase;padding:8px 7px}.nfe-table td{border-bottom:1px solid #E1ECEF;padding:5px}.nfe-table td input{width:100%;box-sizing:border-box;min-height:31px;border:1px solid #C7D9DF;border-radius:5px;padding:5px 6px;font-size:12px}.w-code{width:110px}.w-description{width:34%}.w-ncm{width:82px}.w-cfop{width:58px}.w-unit{width:50px}.w-qty{width:72px}.w-price{width:92px}.w-origin{width:55px}.w-total{width:105px}.nfe-number{text-align:right;font-weight:850;white-space:nowrap}.nfe-remove{background:#FCEBEC;color:#9D3039;border-radius:5px;width:28px;height:28px;font-size:18px}.nfe-total-strip{display:flex;justify-content:flex-end;gap:16px;padding-top:12px;font-size:14px}.nfe-summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}.nfe-summary-grid article,.nfe-footer-total>div{background:#F4FBFD;border:1px solid #D4E4EA;border-radius:9px;padding:12px}.nfe-summary-grid span,.nfe-footer-total span{display:block;color:#607985;font-size:11px}.nfe-summary-grid strong,.nfe-footer-total strong{display:block;font-size:18px;margin-top:5px}.nfe-footer-total{display:flex;justify-content:flex-end;gap:12px;margin-top:18px}.nfe-footer-total>div{min-width:190px}.nfe-footer-total>div:last-child{border-color:#48B7C7;background:#EAF7FA}
        @media(max-width:900px){.nfe-header{flex-direction:column}.nfe-header-actions{width:100%;justify-content:space-between}.nfe-grid{grid-template-columns:repeat(6,minmax(0,1fr))}.nfe-grid-general>label,.nfe-grid-partner>label,.nfe-grid-taxes>label,.nfe-grid-transport>label{grid-column:span 3}.nfe-grid-general .wide-field,.nfe-grid-partner .wide-field,.nfe-grid-transport .wide-field{grid-column:span 6}.nfe-summary-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:600px){.nfe-page{padding:12px}.nfe-grid{grid-template-columns:1fr 1fr}.nfe-grid-general>label,.nfe-grid-partner>label,.nfe-grid-taxes>label,.nfe-grid-transport>label,.nfe-grid-general .wide-field,.nfe-grid-partner .wide-field,.nfe-grid-transport .wide-field{grid-column:span 2!important;max-width:none}.nfe-summary-grid{grid-template-columns:1fr}.nfe-footer-total{flex-direction:column}.nfe-footer-total>div{min-width:0}}
      `}</style>
    </main>
  )
}
