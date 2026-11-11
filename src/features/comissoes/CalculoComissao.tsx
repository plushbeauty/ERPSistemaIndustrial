/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-10
 * @REVISAO: REV-COMISSOES-CALCULO-WIREFRAME-20261110-01 — apuração analítica por competência e vendedor, grade vazia até cálculo real, resumo e exportação XLSX
 * @STATUS_APROVACAO: IMPLEMENTAÇÃO AUTORIZADA PELO PROPRIETÁRIO EM 2026-11-10
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Calculator, FileSpreadsheet, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import LinkFieldCombobox, { type LinkOption } from '../../components/ui/LinkFieldCombobox'
import './CalculoComissao.css'

type Seller = { id: string; nome: string; email: string }
type Client = { id: string; nome: string }
type Line = {
  id: string
  pedido_id: string
  item_id: string
  produto_id: string
  quantidade: number
  valor_total: number
  percentual: number
  comissao_liquida: number
  pedido?: { numero: number; cliente_id: string | null }
  produto?: { codigo: string; nome: string }
  usuario_id: string | null
}

const money = (value: number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const localMonth = () => {
  const now = new Date()
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
}
const parseMoney = (value: string) => {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}
const crc32 = (bytes: Uint8Array) => {
  let c = 0xffffffff
  for (const b of bytes) {
    c ^= b
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0)
  }
  return (c ^ 0xffffffff) >>> 0
}
function zipStored(files: Array<{ name: string; data: Uint8Array }>) {
  const encoder = new TextEncoder()
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let localOffset = 0
  for (const file of files) {
    const name = encoder.encode(file.name)
    const checksum = crc32(file.data)
    const local = new Uint8Array(30 + name.length + file.data.length)
    const localView = new DataView(local.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true)
    localView.setUint32(14, checksum, true)
    localView.setUint32(18, file.data.length, true)
    localView.setUint32(22, file.data.length, true)
    localView.setUint16(26, name.length, true)
    local.set(name, 30)
    local.set(file.data, 30 + name.length)
    localParts.push(local)
    const central = new Uint8Array(46 + name.length)
    const centralView = new DataView(central.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint32(16, checksum, true)
    centralView.setUint32(20, file.data.length, true)
    centralView.setUint32(24, file.data.length, true)
    centralView.setUint16(28, name.length, true)
    centralView.setUint32(42, localOffset, true)
    central.set(name, 46)
    centralParts.push(central)
    localOffset += local.length
  }
  const centralSize = centralParts.reduce((total, part) => total + part.length, 0)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, files.length, true)
  endView.setUint16(10, files.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, localOffset, true)
  const parts = [...localParts, ...centralParts, end].map(bytes => {
    const buffer = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(buffer).set(bytes)
    return buffer
  })
  return new Blob(parts, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
function sheetXml(lines: Line[], clients: Client[]) {
  const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const clientMap = new Map(clients.map(client => [client.id, client.nome]))
  const rows = [
    ['Pedido', 'Cliente', 'SKU', 'Qtd Faturada', 'Valor Total Nota', '% Comissão da Regra', 'Comissão Líquida R$'],
    ...lines.map(line => [
      String(line.pedido?.numero ?? ''),
      clientMap.get(line.pedido?.cliente_id ?? '') ?? '',
      line.produto?.codigo ?? '',
      String(line.quantidade),
      String(line.valor_total),
      String(line.percentual),
      String(line.comissao_liquida),
    ]),
  ]
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
    rows.map(row => '<row>' + row.map(value => '<c t="inlineStr"><is><t>' + esc(value) + '</t></is></c>').join('') + '</row>').join('') +
    '</sheetData></worksheet>'
}
async function exportXlsx(lines: Line[], clients: Client[], competencia: string) {
  const enc = new TextEncoder()
  const contentTypes = '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'
  const rels = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
  const workbook = '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Comissoes" sheetId="1" r:id="rId1"/></sheets></workbook>'
  const workbookRels = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'
  const blob = zipStored([
    { name: '[Content_Types].xml', data: enc.encode(contentTypes) },
    { name: '_rels/.rels', data: enc.encode(rels) },
    { name: 'xl/workbook.xml', data: enc.encode(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(workbookRels) },
    { name: 'xl/worksheets/sheet1.xml', data: enc.encode(sheetXml(lines, clients)) },
  ])
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'comissoes-' + competencia + '.xlsx'
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function CalculoComissao() {
  const [competencia, setCompetencia] = useState(localMonth)
  const [sellerId, setSellerId] = useState('')
  const [meta, setMeta] = useState('0,00')
  const [lines, setLines] = useState<Line[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [sellers, setSellers] = useState<Seller[]>([])
  const [empresaId, setEmpresaId] = useState('')
  const [loadingSellers, setLoadingSellers] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [calculated, setCalculated] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadSellers = useCallback(async () => {
    setLoadingSellers(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Selecione a empresa de trabalho antes de consultar os vendedores.')
      const tenant = String(company.data)
      setEmpresaId(tenant)
      const result = await supabase.from('erp_usuarios')
        .select('id,nome,email')
        .eq('empresa_id', tenant)
        .eq('ativo', true)
        .is('deleted_at', null)
        .order('nome')
      if (result.error) throw result.error
      setSellers((result.data ?? []) as Seller[])
    } catch (cause) {
      setSellers([])
      setEmpresaId('')
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar vendedores.')
    } finally {
      setLoadingSellers(false)
    }
  }, [])

  useEffect(() => { void loadSellers() }, [loadSellers])

  const loadGoal = useCallback(async () => {
    if (!empresaId || !competencia) return
    const result = await supabase.from('erp_vendas_metas')
      .select('meta_faturamento')
      .eq('empresa_id', empresaId)
      .eq('competencia', competencia + '-01')
      .maybeSingle()
    if (result.error) {
      setError(result.error.message)
      return
    }
    setMeta(Number(result.data?.meta_faturamento ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
  }, [empresaId, competencia])

  useEffect(() => { void loadGoal() }, [loadGoal])

  const resetResult = () => {
    setLines([])
    setClients([])
    setCalculated(false)
    setNotice('')
    setError('')
  }

  const sellerOptions: LinkOption[] = useMemo(
    () => sellers.map(seller => ({ value: seller.id, label: seller.nome, description: seller.email })),
    [sellers],
  )
  const totalSales = useMemo(() => lines.reduce((sum, line) => sum + Number(line.valor_total || 0), 0), [lines])
  const totalCommission = useMemo(() => lines.reduce((sum, line) => sum + Number(line.comissao_liquida || 0), 0), [lines])
  const orderCount = useMemo(() => new Set(lines.map(line => line.pedido_id)).size, [lines])
  const goal = parseMoney(meta)
  const goalReached = goal > 0 && totalSales >= goal

  const run = async () => {
    resetResult()
    if (!competencia) { setError('Informe a competência para calcular.'); return }
    if (!sellerId) { setError('Selecione o vendedor ou agente para calcular.'); return }
    if (!empresaId) { setError('Empresa de trabalho não identificada. Atualize os vendedores e tente novamente.'); return }
    if (goal < 0) { setError('A meta de faturamento não pode ser negativa.'); return }
    setCalculating(true)
    try {
      const rpc = await supabase.rpc('erp_comissao_calcular', {
        p_competencia: competencia + '-01',
        p_usuario_id: sellerId,
        p_meta_faturamento: goal,
      })
      if (rpc.error) throw rpc.error
      const payload = rpc.data as { calculo_id?: string; total_vendas?: number; total_comissao?: number; linhas?: number } | null
      if (!payload?.calculo_id) throw new Error('O banco não retornou o identificador da apuração.')
      const [lineResult, clientResult] = await Promise.all([
        supabase.from('erp_comissao_linhas')
          .select('id,pedido_id,item_id,produto_id,usuario_id,quantidade,valor_total,percentual,comissao_liquida,pedido:erp_pedidos_venda(numero,cliente_id),produto:erp_produtos(codigo,nome)')
          .eq('empresa_id', empresaId)
          .eq('calculo_id', payload.calculo_id)
          .order('created_at', { ascending: true }),
        supabase.from('erp_clientes').select('id,nome').eq('empresa_id', empresaId).eq('ativo', true).order('nome').limit(5000),
      ])
      if (lineResult.error) throw lineResult.error
      if (clientResult.error) throw clientResult.error
      setLines((lineResult.data ?? []) as unknown as Line[])
      setClients((clientResult.data ?? []) as Client[])
      setCalculated(true)
      setNotice('Apuração concluída com os registros retornados pelo banco.')
    } catch (cause) {
      setLines([])
      setClients([])
      setCalculated(false)
      setError(cause instanceof Error ? cause.message : 'Falha ao calcular as comissões.')
    } finally {
      setCalculating(false)
    }
  }

  const exportReport = () => {
    if (!calculated) return
    void exportXlsx(lines, clients, competencia)
  }

  return (
    <main className="commission-calculation">
      <header className="commission-page-header">
        <div>
          <nav className="commission-breadcrumb" aria-label="Caminho de navegação">
            <span>FINANCEIRO</span><span>›</span><span>COMISSÕES</span><span>›</span><strong>CÁLCULO DE COMISSÃO</strong>
          </nav>
          <h1>Cálculo de Comissão</h1>
          <p>Apuração analítica de comissões sobre pedidos faturados por competência, vendedor e regra de SKU.</p>
        </div>
        <button type="button" className="commission-button commission-button-secondary commission-export-top" onClick={exportReport} disabled={!calculated}>
          <FileSpreadsheet size={15}/>Exportar XLSX
        </button>
      </header>

      <section className="commission-card commission-filters">
        <div className="commission-section-title">Parâmetros de Apuração</div>
        <div className="commission-filter-grid">
          <label className="commission-field commission-period-field">
            <span>Competência <b>*</b></span>
            <input type="month" value={competencia} onChange={event => { setCompetencia(event.target.value); resetResult() }} />
          </label>
          <label className="commission-field commission-seller-field">
            <span>Vendedor / Agente <b>*</b></span>
            <div className="commission-seller-control">
              <LinkFieldCombobox value={sellerId} options={sellerOptions} onChange={value => { setSellerId(value); resetResult() }} placeholder={loadingSellers ? 'Carregando vendedores...' : 'Pesquisar...'} disabled={loadingSellers || !sellerOptions.length}/>
            </div>
            {!loadingSellers && !sellerOptions.length && <small>Nenhum vendedor ativo encontrado.</small>}
          </label>
          <label className="commission-field commission-goal-field">
            <span>Meta Faturamento (R$)</span>
            <input inputMode="decimal" value={meta} onChange={event => { setMeta(event.target.value); resetResult() }} onBlur={() => setMeta(goal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}/>
          </label>
          <div className="commission-calculate-wrap">
            <span>Ação</span>
            <button type="button" className="commission-button commission-button-primary" onClick={() => void run()} disabled={calculating || loadingSellers}>
              {calculating ? <RefreshCw size={14} className="commission-spin"/> : <Calculator size={14}/>}
              {calculating ? 'Calculando...' : 'Calcular'}
            </button>
          </div>
        </div>
        {error && <div className="commission-alert commission-alert-error" role="alert">{error}</div>}
        {notice && <div className="commission-alert commission-alert-success" role="status">{notice}</div>}
      </section>

      <section className="commission-card commission-grid-card">
        <div className="commission-grid-heading">
          <h2>Itens Faturados na Competência</h2>
          <span className="commission-count">{orderCount} pedido(s)</span>
        </div>
        <div className="commission-table-scroll">
          <table className="commission-table">
            <thead><tr>
              <th>Pedido</th><th>Cliente</th><th>SKU</th><th>Qtd Faturada</th>
              <th>Valor Total Nota</th><th>% Comissão da Regra</th><th>Comissão Líquida R$</th>
            </tr></thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.id} className={index % 2 ? 'is-striped' : ''}>
                  <td>{line.pedido?.numero ?? '—'}</td>
                  <td>{clients.find(client => client.id === line.pedido?.cliente_id)?.nome ?? '—'}</td>
                  <td>{line.produto?.codigo ?? '—'}</td>
                  <td className="is-number">{Number(line.quantidade).toLocaleString('pt-BR')}</td>
                  <td className="is-number">{money(Number(line.valor_total))}</td>
                  <td className="is-number">{Number(line.percentual).toFixed(2)}%</td>
                  <td className="is-number is-commission">{money(Number(line.comissao_liquida))}</td>
                </tr>
              ))}
              {!lines.length && (
                <tr className="commission-empty-row">
                  <td colSpan={7}>
                    {calculated ? 'Nenhum pedido faturado encontrado para os filtros informados.' : 'Nenhum pedido faturado encontrado para os filtros informados.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="commission-card commission-summary">
        <div className="commission-summary-metrics">
          <article className="commission-metric">
            <span>Total Vendas</span><strong>{money(totalSales)}</strong>
          </article>
          <article className="commission-metric">
            <span>Meta Batida</span><strong className="commission-goal-state"><em className={goalReached ? 'is-reached' : 'is-not-reached'}>{goalReached ? 'SIM' : 'NÃO'}</em></strong>
          </article>
          <article className="commission-metric">
            <span>Total Comissão</span><strong className="commission-total-commission">{money(totalCommission)}</strong>
          </article>
        </div>
        <button type="button" className="commission-button commission-button-secondary commission-export-bottom" onClick={exportReport} disabled={!calculated}>
          <FileSpreadsheet size={15}/>Exportar XLSX
        </button>
      </section>
      <footer className="commission-page-footnote">SYSNQRA ERP INDUSTRIAL · CONTROLADORIA COMERCIAL</footer>
    </main>
  )
}
