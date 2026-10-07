import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { FileDown, Plus, RefreshCw, Save, Send, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import ERPHeader from '../components/layout/ERPHeader'
import CompactButton from '../components/ui/CompactButton'
import CompactInput from '../components/ui/CompactInput'
import CompactSelect from '../components/ui/CompactSelect'
import RequiredField from '../components/ui/RequiredField'
import '../styles/synqra-workspace.css'

type TextMap = Record<string, string>
type Item = {
  id: string
  produto_id: string
  codigo: string
  descricao: string
  ncm: string
  cst: string
  cfop: string
  unidade: string
  quantidade: string
  valorUnitario: string
  desconto: string
  icms: string
  ipi: string
  pis: string
  cofins: string
  origem: string
}
type Product = TextMap
type Transporter = TextMap

const newItem = (): Item => ({
  id: crypto.randomUUID(), produto_id: '', codigo: '', descricao: '', ncm: '', cst: '',
  cfop: '', unidade: '', quantidade: '1', valorUnitario: '0', desconto: '0',
  icms: '0', ipi: '0', pis: '0', cofins: '0', origem: '0',
})

const initialForm: TextMap = {
  natureza: '', modelo: '55', serie: '', numero: '', tipoEmissao: '1', finalidade: '1',
  operacao: '1', emissao: new Date().toISOString().slice(0, 16), saida: '', cfop: '',
  ambiente: 'homologacao', frete: '0', seguro: '0', outras: '0', baseIcms: '0',
  valorIcms: '0', baseIcmsSt: '0', valorIcmsSt: '0', modalidadeFrete: '9',
  transportadora: '', transportadoraCnpj: '', placa: '', ufPlaca: '', rntrc: '',
  volumes: '0', especie: '', marca: '', pesoLiquido: '0', pesoBruto: '0',
  informacoes: '',
}

const numberValue = (value: string): number => {
  const normalized = value.trim().replace(/\\./g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}
const onlyDigits = (value: string, max: number): string => value.replace(/\\D/g, '').slice(0, max)
const money = (value: number): string => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const field = (map: TextMap, key: string): string => map[key] ?? ''

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="synqra-nfe-block"><h2>{title}</h2>{children}</section>
}

export default function NFeEmissaoCompact() {
  const [companyId, setCompanyId] = useState('')
  const [company, setCompany] = useState<TextMap>({})
  const [customer, setCustomer] = useState<TextMap>({})
  const [products, setProducts] = useState<Product[]>([])
  const [transporters, setTransporters] = useState<Transporter[]>([])
  const [form, setForm] = useState<TextMap>(initialForm)
  const [items, setItems] = useState<Item[]>([newItem()])
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const updateForm = (key: string, value: string) => {
    setForm(current => ({ ...current, [key]: value }))
    setError('')
  }
  const updateCustomer = (key: string, value: string) => {
    setCustomer(current => ({ ...current, [key]: value }))
    setError('')
  }
  const updateItem = (id: string, key: keyof Item, value: string) => {
    setItems(current => current.map(item => item.id === id ? { ...item, [key]: value } : item))
  }

  const load = async () => {
    setBusy(true)
    setError('')
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error || !auth.data.user) throw new Error('Sessão não localizada.')
      const empresa = await supabase.rpc('erp_current_empresa_id')
      if (empresa.error || !empresa.data) throw empresa.error ?? new Error('Empresa da sessão não localizada.')
      const id = String(empresa.data)
      const [companyResult, productResult, transporterResult, fiscalResult] = await Promise.all([
        supabase.from('erp_empresas').select('razao_social,nome_fantasia,cnpj,endereco,cidade,uf,cep,telefone,email,inscricao_estadual').eq('id', id).single(),
        supabase.from('erp_produtos').select('id,codigo,nome,unidade,ncm,cfop_saida,cst_icms,csosn,origem_fiscal,preco_venda,aliquota_icms,aliquota_ipi,aliquota_pis,aliquota_cofins').eq('empresa_id', id).eq('ativo', true).order('nome').limit(1000),
        supabase.from('erp_transportadoras').select('id,codigo,razao_social,cnpj,ie,telefone,cidade,uf').eq('empresa_id', id).eq('ativo', true).order('razao_social').limit(500),
        supabase.from('erp_config_fiscal').select('serie_nfe,proximo_numero_nfe,ambiente').eq('empresa_id', id).maybeSingle(),
      ])
      if (companyResult.error) throw companyResult.error
      if (productResult.error) throw productResult.error
      if (transporterResult.error) throw transporterResult.error
      if (fiscalResult.error) throw fiscalResult.error
      setCompanyId(id)
      setCompany((companyResult.data ?? {}) as TextMap)
      setProducts((productResult.data ?? []) as Product[])
      setTransporters((transporterResult.data ?? []) as Transporter[])
      if (fiscalResult.data) {
        const cfg = fiscalResult.data as TextMap
        setForm(current => ({
          ...current,
          serie: String(cfg.serie_nfe ?? ''),
          numero: String(cfg.proximo_numero_nfe ?? ''),
          ambiente: String(cfg.ambiente ?? 'homologacao'),
        }))
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar o emissor fiscal.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  const totals = useMemo(() => {
    const result = items.reduce((acc, item) => {
      const gross = numberValue(item.quantidade) * numberValue(item.valorUnitario)
      const net = Math.max(0, gross - numberValue(item.desconto))
      return {
        produtos: acc.produtos + net,
        desconto: acc.desconto + numberValue(item.desconto),
        icms: acc.icms + net * numberValue(item.icms) / 100,
        ipi: acc.ipi + net * numberValue(item.ipi) / 100,
        pis: acc.pis + net * numberValue(item.pis) / 100,
        cofins: acc.cofins + net * numberValue(item.cofins) / 100,
      }
    }, { produtos: 0, desconto: 0, icms: 0, ipi: 0, pis: 0, cofins: 0 })
    return {
      ...result,
      frete: numberValue(field(form, 'frete')),
      seguro: numberValue(field(form, 'seguro')),
      outras: numberValue(field(form, 'outras')),
    }
  }, [items, form])

  const totalNota = totals.produtos + totals.frete + totals.seguro + totals.outras + totals.ipi + totals.pis + totals.cofins

  const selectProduct = (itemId: string, productId: string) => {
    const product = products.find(candidate => String(candidate.id) === productId)
    if (!product) return
    setItems(current => current.map(item => item.id !== itemId ? item : ({
      ...item,
      produto_id: productId,
      codigo: String(product.codigo ?? ''),
      descricao: String(product.nome ?? ''),
      ncm: onlyDigits(String(product.ncm ?? ''), 8),
      cfop: onlyDigits(String(product.cfop_saida ?? field(form, 'cfop')), 4),
      unidade: String(product.unidade ?? ''),
      valorUnitario: String(product.preco_venda ?? 0),
      cst: String(product.cst_icms ?? product.csosn ?? ''),
      origem: onlyDigits(String(product.origem_fiscal ?? '0'), 1),
      icms: String(product.aliquota_icms ?? 0),
      ipi: String(product.aliquota_ipi ?? 0),
      pis: String(product.aliquota_pis ?? 0),
      cofins: String(product.aliquota_cofins ?? 0),
    })))
  }

  const validate = (): string | null => {
    if (!field(form, 'natureza').trim()) return 'Natureza da operação é obrigatória.'
    if (!onlyDigits(field(form, 'serie'), 3)) return 'Série é obrigatória.'
    if (!field(customer, 'documento').trim()) return 'CNPJ/CPF do destinatário é obrigatório.'
    if (!field(customer, 'nome').trim()) return 'Nome/Razão Social do destinatário é obrigatório.'
    if (onlyDigits(field(form, 'cfop'), 4).length !== 4) return 'CFOP principal deve possuir 4 dígitos.'
    if (items.some(item => !item.codigo.trim() || onlyDigits(item.ncm, 8).length !== 8 || onlyDigits(item.cfop, 4).length !== 4 || !item.unidade.trim() || numberValue(item.quantidade) <= 0)) {
      return 'Complete código, NCM, CFOP, unidade e quantidade dos itens.'
    }
    return null
  }

  const saveDraft = async () => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const validation = validate()
      if (validation) throw new Error(validation)
      const payload = {
        empresa_id: companyId, tipo: field(form, 'operacao') === '1' ? 'NF-e' : 'NF-e Entrada', modelo: '55',
        serie: onlyDigits(field(form, 'serie'), 3), numero: field(form, 'numero') ? Number(field(form, 'numero')) : null,
        status: 'Rascunho', natureza_operacao: field(form, 'natureza'), cfop: onlyDigits(field(form, 'cfop'), 4),
        ambiente: field(form, 'ambiente') || 'homologacao', data_emissao: new Date(field(form, 'emissao')).toISOString(),
        data_saida: field(form, 'saida') ? new Date(field(form, 'saida')).toISOString() : null,
        destinatario_nome: field(customer, 'nome'), destinatario_documento: field(customer, 'documento'),
        destinatario_ie: field(customer, 'ie') || null, destinatario_email: field(customer, 'email') || null,
        destinatario_endereco: field(customer, 'endereco') || null, destinatario_bairro: field(customer, 'bairro') || null,
        destinatario_cep: field(customer, 'cep') || null, destinatario_cidade: field(customer, 'cidade') || null,
        destinatario_uf: field(customer, 'uf') || null, modalidade_frete: field(form, 'modalidadeFrete'),
        transportadora: field(form, 'transportadora') || null, placa: field(form, 'placa') || null,
        uf_transportadora: field(form, 'ufPlaca') || null, peso_liquido: numberValue(field(form, 'pesoLiquido')),
        peso_bruto: numberValue(field(form, 'pesoBruto')), volumes: numberValue(field(form, 'volumes')),
        valor_produtos: totals.produtos, valor_frete: totals.frete, valor_outras_despesas: totals.outras,
        valor_desconto: totals.desconto, base_calculo_icms: numberValue(field(form, 'baseIcms')),
        valor_icms: numberValue(field(form, 'valorIcms')), base_icms_st: numberValue(field(form, 'baseIcmsSt')),
        valor_icms_st: numberValue(field(form, 'valorIcmsSt')), valor_ipi: totals.ipi, valor_pis: totals.pis,
        valor_cofins: totals.cofins, valor_total: totalNota, valor_liquido: totalNota,
      }
      const rows = items.map((item, index) => ({
        produto_id: item.produto_id || null, item_numero: index + 1, codigo_produto: item.codigo,
        descricao_produto: item.descricao, ncm: onlyDigits(item.ncm, 8), cfop: onlyDigits(item.cfop, 4),
        unidade: item.unidade, quantidade: numberValue(item.quantidade), valor_unitario: numberValue(item.valorUnitario),
        valor_total: Math.max(0, numberValue(item.quantidade) * numberValue(item.valorUnitario) - numberValue(item.desconto)),
        valor_desconto: numberValue(item.desconto), origem: onlyDigits(item.origem, 1), cst_csosn: item.cst || null,
        icms_aliquota: numberValue(item.icms), ipi_aliquota: numberValue(item.ipi),
        pis_aliquota: numberValue(item.pis), cofins_aliquota: numberValue(item.cofins),
      }))
      const result = await supabase.rpc('erp_salvar_rascunho_nfe', { p_documento_id: documentId, p_documento: payload, p_itens: rows })
      if (result.error || !result.data) throw new Error(result.error?.message || 'Não foi possível salvar o rascunho.')
      setDocumentId(String(result.data))
      setMessage('NF-e gravada como rascunho. A transmissão à SEFAZ não foi executada.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar NF-e.')
    } finally {
      setBusy(false)
    }
  }

  const newDocument = () => {
    setDocumentId(null)
    setItems([newItem()])
    setCustomer({})
    setMessage('')
    setError('')
  }

  const setTransporter = (id: string) => {
    const transporter = transporters.find(candidate => String(candidate.id) === id)
    updateForm('transportadora', transporter ? String(transporter.razao_social ?? '') : '')
    updateForm('transportadoraCnpj', transporter ? String(transporter.cnpj ?? '') : '')
    updateForm('ufPlaca', transporter ? String(transporter.uf ?? '') : field(form, 'ufPlaca'))
  }

  return <main className="synqra-workspace synqra-nfe"><ERPHeader />    <section className="synqra-workspace-body">
      <div className="synqra-workspace-title">
        <div><h1>Emissor NF-e • Workspace Fiscal</h1><p>Modelo 55 • emissão compacta • dados reais do tenant</p></div>
        <CompactButton type="button" onClick={() => void load()} disabled={busy}><RefreshCw size={13} /> ATUALIZAR</CompactButton>
      </div>
      {(error || message) ? <div className={`synqra-nfe-alert ${error ? 'error' : 'ok'}`}>{error || message}</div> : null}
      <div className="synqra-nfe-actions">
        <CompactButton type="button" onClick={newDocument}><Plus size={13} /> NOVA</CompactButton>
        <CompactButton type="button" tone="primary" onClick={() => void saveDraft()} disabled={busy}><Save size={13} /> SALVAR / VALIDAR</CompactButton>
        <CompactButton type="button" tone="orange" disabled={!documentId || busy}><Send size={13} /> EMITIR</CompactButton>
        <CompactButton type="button" disabled={!documentId}><FileDown size={13} /> DANFE PDF</CompactButton>
        <CompactButton type="button" tone="danger" disabled={!documentId}><X size={13} /> CANCELAR</CompactButton>
      </div>

      <Section title="01 • IDE — IDENTIFICAÇÃO DO DOCUMENTO FISCAL">
        <div className="synqra-nfe-grid">
          <CompactInput label="Natureza da Operação" value={field(form, 'natureza')} onChange={v => updateForm('natureza', v)} required />
          <CompactInput label="Modelo" value="55" onChange={() => undefined} readOnly />
          <CompactInput label="Série" value={field(form, 'serie')} onChange={v => updateForm('serie', onlyDigits(v, 3))} required />
          <CompactInput label="Número" value={field(form, 'numero')} onChange={v => updateForm('numero', v)} readOnly />
          <CompactSelect label="Tipo de Emissão" value={field(form, 'tipoEmissao')} onChange={v => updateForm('tipoEmissao', v)} options={[{value:'1',label:'1 • Normal'},{value:'2',label:'2 • Contingência'}]} />
          <CompactSelect label="Finalidade" value={field(form, 'finalidade')} onChange={v => updateForm('finalidade', v)} options={[{value:'1',label:'1 • Normal'},{value:'2',label:'2 • Complementar'},{value:'4',label:'4 • Devolução'}]} />
          <CompactSelect label="Operação" value={field(form, 'operacao')} onChange={v => updateForm('operacao', v)} options={[{value:'1',label:'1 • Saída'},{value:'0',label:'0 • Entrada'}]} />
          <CompactInput label="Data/Hora Emissão" type="datetime-local" value={field(form, 'emissao')} onChange={v => updateForm('emissao', v)} />
          <CompactInput label="Data/Hora Saída/Entrada" type="datetime-local" value={field(form, 'saida')} onChange={v => updateForm('saida', v)} />
          <CompactInput label="CFOP Principal" value={field(form, 'cfop')} onChange={v => updateForm('cfop', onlyDigits(v, 4))} required />
          <CompactSelect label="Ambiente" value={field(form, 'ambiente')} onChange={v => updateForm('ambiente', v)} options={[{value:'homologacao',label:'Homologação'},{value:'producao',label:'Produção'}]} />
        </div>
      </Section>

      <Section title="02 • EMITENTE — DADOS OFICIAIS DO ESTABELECIMENTO">
        <div className="synqra-nfe-grid">
          <CompactInput label="CNPJ Emitente" value={String(company.cnpj ?? '')} onChange={() => undefined} readOnly />
          <CompactInput label="Razão Social" value={String(company.razao_social ?? company.nome_fantasia ?? '')} onChange={() => undefined} readOnly wide />
          <CompactInput label="Inscrição Estadual" value={String(company.inscricao_estadual ?? '')} onChange={() => undefined} readOnly />
          <CompactInput label="Endereço" value={String(company.endereco ?? '')} onChange={() => undefined} readOnly wide />
          <CompactInput label="Município" value={String(company.cidade ?? '')} onChange={() => undefined} readOnly />
          <CompactInput label="UF" value={String(company.uf ?? '')} onChange={() => undefined} readOnly />
          <CompactInput label="CEP" value={String(company.cep ?? '')} onChange={() => undefined} readOnly />
          <CompactInput label="Telefone" value={String(company.telefone ?? '')} onChange={() => undefined} readOnly />
        </div>
      </Section>

      <Section title="03 • DESTINATÁRIO / REMETENTE — IDENTIFICAÇÃO E ENDEREÇO">
        <div className="synqra-nfe-grid">
          <CompactInput label="CNPJ / CPF" value={field(customer, 'documento')} onChange={v => updateCustomer('documento', v)} required />
          <CompactInput label="IE" value={field(customer, 'ie')} onChange={v => updateCustomer('ie', v)} />
          <CompactInput label="Razão Social / Nome" value={field(customer, 'nome')} onChange={v => updateCustomer('nome', v)} required wide />
          <CompactInput label="Inscrição Municipal" value={field(customer, 'im')} onChange={v => updateCustomer('im', v)} />
          <CompactInput label="Endereço" value={field(customer, 'endereco')} onChange={v => updateCustomer('endereco', v)} wide />
          <CompactInput label="Bairro" value={field(customer, 'bairro')} onChange={v => updateCustomer('bairro', v)} />
          <CompactInput label="Município" value={field(customer, 'cidade')} onChange={v => updateCustomer('cidade', v)} />
          <CompactInput label="UF" value={field(customer, 'uf')} onChange={v => updateCustomer('uf', v.toUpperCase().slice(0, 2))} />
          <CompactInput label="CEP" value={field(customer, 'cep')} onChange={v => updateCustomer('cep', v)} />
          <CompactInput label="Telefone" value={field(customer, 'telefone')} onChange={v => updateCustomer('telefone', v)} />
          <CompactInput label="E-mail" type="email" value={field(customer, 'email')} onChange={v => updateCustomer('email', v)} />
        </div>
      </Section>

      <Section title="04 • ITENS — PRODUTOS, SERVIÇOS E TRIBUTAÇÃO">
        <div className="synqra-nfe-block-head"><span><RequiredField>Itens fiscais</RequiredField></span><CompactButton type="button" onClick={() => setItems(current => [...current, newItem()])}><Plus size={13} /> ADICIONAR ITEM</CompactButton></div>
        <div className="synqra-nfe-table-wrap">
          <table><thead><tr><th>ITEM</th><th>PRODUTO</th><th>CÓDIGO</th><th>DESCRIÇÃO</th><th>NCM</th><th>CST/CSOSN</th><th>CFOP</th><th>UN</th><th>QTD</th><th>VLR UNIT.</th><th>DESC.</th><th>ICMS %</th><th>IPI %</th><th>PIS %</th><th>COFINS %</th><th>TOTAL</th><th></th></tr></thead>
          <tbody>{items.map((item, index) => {
            const gross = numberValue(item.quantidade) * numberValue(item.valorUnitario)
            const total = Math.max(0, gross - numberValue(item.desconto))
            return <tr key={item.id}>
              <td>{index + 1}</td>
              <td><select value={item.produto_id} onChange={e => selectProduct(item.id, e.currentTarget.value)}><option value="">MANUAL</option>{products.map(product => <option key={String(product.id)} value={String(product.id)}>{String(product.codigo ?? '')} • {String(product.nome ?? '')}</option>)}</select></td>
              <td><input value={item.codigo} onChange={e => updateItem(item.id, 'codigo', e.currentTarget.value)} /></td>
              <td><input value={item.descricao} onChange={e => updateItem(item.id, 'descricao', e.currentTarget.value)} /></td>
              <td><input value={item.ncm} maxLength={8} onChange={e => updateItem(item.id, 'ncm', onlyDigits(e.currentTarget.value, 8))} /></td>
              <td><input value={item.cst} maxLength={4} onChange={e => updateItem(item.id, 'cst', e.currentTarget.value.toUpperCase())} /></td>
              <td><input value={item.cfop} maxLength={4} onChange={e => updateItem(item.id, 'cfop', onlyDigits(e.currentTarget.value, 4))} /></td>
              <td><input value={item.unidade} onChange={e => updateItem(item.id, 'unidade', e.currentTarget.value.toUpperCase())} /></td>
              <td><input className="right" value={item.quantidade} onChange={e => updateItem(item.id, 'quantidade', e.currentTarget.value)} /></td>
              <td><input className="right" value={item.valorUnitario} onChange={e => updateItem(item.id, 'valorUnitario', e.currentTarget.value)} /></td>
              <td><input className="right" value={item.desconto} onChange={e => updateItem(item.id, 'desconto', e.currentTarget.value)} /></td>
              <td><input className="right" value={item.icms} onChange={e => updateItem(item.id, 'icms', e.currentTarget.value)} /></td>
              <td><input className="right" value={item.ipi} onChange={e => updateItem(item.id, 'ipi', e.currentTarget.value)} /></td>
              <td><input className="right" value={item.pis} onChange={e => updateItem(item.id, 'pis', e.currentTarget.value)} /></td>
              <td><input className="right" value={item.cofins} onChange={e => updateItem(item.id, 'cofins', e.currentTarget.value)} /></td>
              <td className="right">{money(total)}</td>
              <td><button className="danger-icon" type="button" onClick={() => setItems(current => current.length === 1 ? current : current.filter(candidate => candidate.id !== item.id))} aria-label="Remover item">×</button></td>
            </tr>
          })}</tbody></table>
        </div>
      </Section>

      <Section title="05 • TOTAIS DE IMPOSTOS E VALORES DA NF-e">
        <div className="synqra-nfe-grid">
          <CompactInput label="BC ICMS" value={field(form, 'baseIcms')} onChange={v => updateForm('baseIcms', v)} />
          <CompactInput label="Valor ICMS" value={field(form, 'valorIcms')} onChange={v => updateForm('valorIcms', v)} />
          <CompactInput label="BC ICMS ST" value={field(form, 'baseIcmsSt')} onChange={v => updateForm('baseIcmsSt', v)} />
          <CompactInput label="Valor ICMS ST" value={field(form, 'valorIcmsSt')} onChange={v => updateForm('valorIcmsSt', v)} />
          <CompactInput label="Produtos" value={money(totals.produtos)} onChange={() => undefined} readOnly />
          <CompactInput label="Frete" value={field(form, 'frete')} onChange={v => updateForm('frete', v)} />
          <CompactInput label="Seguro" value={field(form, 'seguro')} onChange={v => updateForm('seguro', v)} />
          <CompactInput label="Desconto" value={money(totals.desconto)} onChange={() => undefined} readOnly />
          <CompactInput label="Outras Despesas" value={field(form, 'outras')} onChange={v => updateForm('outras', v)} />
          <CompactInput label="IPI" value={money(totals.ipi)} onChange={() => undefined} readOnly />
          <CompactInput label="PIS" value={money(totals.pis)} onChange={() => undefined} readOnly />
          <CompactInput label="COFINS" value={money(totals.cofins)} onChange={() => undefined} readOnly />
          <CompactInput label="VALOR TOTAL DA NF-e" value={money(totalNota)} onChange={() => undefined} readOnly wide />
        </div>
      </Section>

      <Section title="06 • VOLUMES">
        <div className="synqra-nfe-grid">
          <CompactInput label="Quantidade de Volumes" value={field(form, 'volumes')} onChange={v => updateForm('volumes', v)} />
          <CompactInput label="Espécie" value={field(form, 'especie')} onChange={v => updateForm('especie', v)} />
          <CompactInput label="Marca" value={field(form, 'marca')} onChange={v => updateForm('marca', v)} />
          <CompactInput label="Peso Líquido KG" value={field(form, 'pesoLiquido')} onChange={v => updateForm('pesoLiquido', v)} />
          <CompactInput label="Peso Bruto KG" value={field(form, 'pesoBruto')} onChange={v => updateForm('pesoBruto', v)} />
        </div>
      </Section>

      <Section title="07 • TRANSPORTADORA">
        <div className="synqra-nfe-grid">
          <CompactSelect label="Modalidade do Frete" value={field(form, 'modalidadeFrete')} onChange={v => updateForm('modalidadeFrete', v)} options={[{value:'0',label:'0 • CIF'},{value:'1',label:'1 • FOB'},{value:'9',label:'9 • Sem frete'}]} />
          <label className="grid min-w-0 gap-[2px] col-span-2"><span className="text-[9px] font-medium uppercase leading-[10px] text-slate-600">Transportadora</span><select value={field(form, 'transportadora')} onChange={e => setTransporter(e.currentTarget.value)}><option value="">Selecionar transportadora</option>{transporters.map(item => <option key={String(item.id)} value={String(item.id)}>{String(item.razao_social ?? '')}</option>)}</select></label>
          <CompactInput label="CNPJ/CPF Transportadora" value={field(form, 'transportadoraCnpj')} onChange={v => updateForm('transportadoraCnpj', v)} />
          <CompactInput label="Placa" value={field(form, 'placa')} onChange={v => updateForm('placa', v.toUpperCase().slice(0, 8))} />
          <CompactInput label="UF Placa" value={field(form, 'ufPlaca')} onChange={v => updateForm('ufPlaca', v.toUpperCase().slice(0, 2))} />
          <CompactInput label="RNTRC" value={field(form, 'rntrc')} onChange={v => updateForm('rntrc', v)} />
        </div>
      </Section>

      <Section title="08 • INFORMAÇÕES ADICIONAIS">
        <textarea className="synqra-nfe-textarea" value={field(form, 'informacoes')} onChange={e => updateForm('informacoes', e.currentTarget.value)} placeholder="Informações complementares de interesse do contribuinte" />
      </Section>
    </section>

    <style>{`
      .synqra-nfe{background:#f4f7fe}.synqra-nfe-block{margin-bottom:7px;border:1px solid #cbd5e1;border-radius:2px;background:#fff;padding:7px}.synqra-nfe-block h2{margin:0 0 6px;border-bottom:1px solid #dbe5e9;padding-bottom:4px;color:#123b50;font-size:10px;font-weight:600;letter-spacing:.05em}.synqra-nfe-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:6px}.synqra-nfe-grid>*{grid-column:span 2}.synqra-nfe-grid>.col-span-2{grid-column:span 4}.synqra-nfe-actions{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:7px}.synqra-nfe-alert{margin-bottom:7px;border:1px solid;border-radius:2px;padding:6px 8px;font-size:10px}.synqra-nfe-alert.error{border-color:#ef4444;background:#fff1f2;color:#991b1b}.synqra-nfe-alert.ok{border-color:#34d399;background:#ecfdf5;color:#065f46}.synqra-nfe-block-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px}.synqra-nfe-table-wrap{overflow:auto}.synqra-nfe table{min-width:1850px;table-layout:fixed}.synqra-nfe th{height:28px;padding:2px 4px;font-size:8px;white-space:nowrap}.synqra-nfe td{height:30px;padding:2px 4px;font-size:10px}.synqra-nfe td input,.synqra-nfe td select{width:100%;height:28px;min-height:28px;border:1px solid #cbd5e1;border-radius:2px;padding:0 5px;font-size:10px;outline:none}.synqra-nfe td input:focus,.synqra-nfe td select:focus{border-color:#2d8db8}.synqra-nfe td.right{text-align:right}.synqra-nfe .danger-icon{height:26px;width:26px;border:1px solid #fecaca;border-radius:2px;background:#fff1f2;color:#b91c1c}.synqra-nfe-textarea{width:100%;min-height:80px;resize:vertical;border:1px solid #cbd5e1;border-radius:2px;padding:6px;font-size:11px;outline:none}.synqra-nfe-textarea:focus{border-color:#2d8db8}@media(max-width:1100px){.synqra-nfe-grid{grid-template-columns:repeat(6,minmax(0,1fr))}.synqra-nfe-grid>*{grid-column:span 2}.synqra-nfe-grid>.col-span-2{grid-column:span 3}}@media(max-width:700px){.synqra-nfe-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.synqra-nfe-grid>*,.synqra-nfe-grid>.col-span-2{grid-column:span 2}}
    `}</style>
  </main>
}