import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Printer } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Cliente = { id: string; tipo_cliente: string | null; nome: string; documento: string | null }
type DocumentoFiscal = {
  valor_total: number | null
  data_emissao: string | null
  destinatario_documento: string | null
  destinatario_nome: string | null
}
type Meta = { competencia: string; meta_faturamento: number | null }
type Empresa = {
  razao_social: string
  nome_fantasia: string | null
  cnpj: string | null
  logo_url: string | null
  logo_impressao_url: string | null
  telefone: string | null
  email: string | null
  endereco: string | null
  cidade: string | null
  uf: string | null
  cep: string | null
  cabecalho_relatorios: string | null
  rodape_relatorios: string | null
}

type PrintTarget = 'perfil' | 'evolucao' | 'metas' | null
type MonthRow = { mes: string; faturamento: number; acumulado: number; meta: number }
type ProfileRow = { perfil: string; valor: number; percentual: number }

const brl = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function chartTitle(target: PrintTarget): string {
  if (target === 'perfil') return 'Faturamento por Perfil de Cliente'
  if (target === 'evolucao') return 'Evolução Mensal do Faturamento'
  if (target === 'metas') return 'Metas vs. Realizado'
  return ''
}

export default function DashboardComercial() {
  const [pedidosCount, setPedidosCount] = useState(0)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [documentos, setDocumentos] = useState<DocumentoFiscal[]>([])
  const [metas, setMetas] = useState<Meta[]>([])
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [logoSrc, setLogoSrc] = useState<string | null>(null)
  const [printTarget, setPrintTarget] = useState<PrintTarget>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const currentYear = new Date().getFullYear()
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const current = await supabase.rpc('erp_current_empresa_id')
      if (current.error || !current.data) throw current.error ?? new Error('Empresa não identificada.')

      const empresaId = String(current.data)
      const yearStart = `${currentYear}-01-01`
      const nextYearStart = `${currentYear + 1}-01-01`
      const [documentsResult, clientsResult, metasResult, empresaResult, ordersResult] = await Promise.all([
        fetchAllPages((from, to) => supabase
          .from('erp_documentos_fiscais')
          .select('valor_total,data_emissao,destinatario_documento,destinatario_nome', { count: 'exact' })
          .eq('empresa_id', empresaId)
          .eq('tipo', 'saida')
          .eq('status', 'Autorizada')
          .gte('data_emissao', yearStart)
          .lt('data_emissao', nextYearStart)
          .order('data_emissao')
          .range(from, to)),
        fetchAllPages((from, to) => supabase
          .from('erp_clientes')
          .select('id,tipo_cliente,nome,documento', { count: 'exact' })
          .eq('empresa_id', empresaId)
          .eq('ativo', true)
          .order('nome')
          .range(from, to)),
        supabase
          .from('erp_vendas_metas')
          .select('competencia,meta_faturamento')
          .eq('empresa_id', empresaId)
          .gte('competencia', yearStart)
          .lt('competencia', nextYearStart)
          .order('competencia'),
        supabase
          .from('erp_empresas')
          .select('razao_social,nome_fantasia,cnpj,logo_url,logo_impressao_url,telefone,email,endereco,cidade,uf,cep,cabecalho_relatorios,rodape_relatorios')
          .eq('id', empresaId)
          .maybeSingle(),
        supabase
          .from('erp_pedidos_venda')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresaId),
      ])
      if (metasResult.error) throw metasResult.error
      if (empresaResult.error) throw empresaResult.error
      if (ordersResult.error) throw ordersResult.error

      setDocumentos(documentsResult as unknown as DocumentoFiscal[])
      setClientes(clientsResult as unknown as Cliente[])
      setMetas((metasResult.data ?? []) as Meta[])
      setEmpresa((empresaResult.data ?? null) as Empresa | null)
      setPedidosCount(ordersResult.count ?? 0)

      const storedLogo = empresaResult.data?.logo_impressao_url || empresaResult.data?.logo_url
      if (!storedLogo) {
        setLogoSrc(null)
      } else if (/^https?:\/\//i.test(storedLogo)) {
        setLogoSrc(storedLogo)
      } else {
        const cleanPath = storedLogo.replace(/^\/+/, '')
        const signed = await supabase.storage.from('erp-documentos').createSignedUrl(cleanPath, 3600)
        setLogoSrc(signed.data?.signedUrl ?? null)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar o dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const clientesPorDocumento = useMemo(() => new Map(
    clientes
      .filter((cliente): cliente is Cliente & { documento: string } => Boolean(cliente.documento))
      .map((cliente) => [cliente.documento.replace(/\D/g, ''), cliente]),
  ), [clientes])

  const profileData = useMemo<ProfileRow[]>(() => {
    const totals = new Map<string, number>()
    for (const documento of documentos) {
      const customerDocument = documento.destinatario_documento?.replace(/\D/g, '') ?? ''
      const perfil = clientesPorDocumento.get(customerDocument)?.tipo_cliente?.trim() || 'Não informado'
      totals.set(perfil, (totals.get(perfil) ?? 0) + Number(documento.valor_total ?? 0))
    }
    const total = [...totals.values()].reduce((sum, value) => sum + value, 0)
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([perfil, valor]) => ({ perfil, valor, percentual: total ? (valor / total) * 100 : 0 }))
  }, [documentos, clientesPorDocumento])

  const monthlyData = useMemo<MonthRow[]>(() => {
    const metaMap = new Map(metas.map((meta) => [Number(meta.competencia.slice(5, 7)), Number(meta.meta_faturamento ?? 0)]))
    const values = monthNames.map((mes, index) => ({ mes, faturamento: 0, acumulado: 0, meta: metaMap.get(index + 1) ?? 0 }))
    for (const documento of documentos) {
      const date = documento.data_emissao?.slice(0, 10)
      if (!date || Number(date.slice(0, 4)) !== currentYear) continue
      const monthIndex = Number(date.slice(5, 7)) - 1
      if (monthIndex < 0 || monthIndex > 11) continue
      values[monthIndex].faturamento += Number(documento.valor_total ?? 0)
    }
    let acumulado = 0
    return values.map((row) => { acumulado += row.faturamento; return { ...row, acumulado } })
  }, [documentos, metas, currentYear])

  const totals = useMemo(() => ({
    faturamento: monthlyData.reduce((sum, row) => sum + row.faturamento, 0),
    meta: monthlyData.reduce((sum, row) => sum + row.meta, 0),
    pedidos: pedidosCount,
  }), [monthlyData, pedidosCount])

  const requestPrint = (target: PrintTarget) => {
    setPrintTarget(target)
    window.setTimeout(() => window.print(), 80)
  }

  useEffect(() => {
    const afterPrint = () => setPrintTarget(null)
    window.addEventListener('afterprint', afterPrint)
    return () => window.removeEventListener('afterprint', afterPrint)
  }, [])

  const printRows = printTarget === 'perfil'
    ? profileData
    : monthlyData

  return (
    <VendasLayout title="Dashboard Comercial" subtitle="Indicadores reais do módulo de vendas" onRefresh={() => void load()}>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          body { background: #fff !important; }
          body * { visibility: hidden !important; }
          #dashboard-print-area, #dashboard-print-area * { visibility: visible !important; }
          #dashboard-print-area {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            background: #fff !important;
            color: #111 !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }
          .print-chart { width: 100% !important; height: 410px !important; }
          .recharts-wrapper, .recharts-surface { overflow: visible !important; }
        }
      `}</style>

      {error && <div role="alert" className="mb-2 border border-red-200 bg-red-50 p-2 text-[11px] text-red-800">{error}</div>}
      {loading && <div role="status" className="mb-2 text-[11px] text-slate-500">Carregando indicadores comerciais…</div>}

      <div className="space-y-2 text-[11px]">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Kpi label="Faturamento no ano" value={brl(totals.faturamento)} />
          <Kpi label="Meta anual" value={brl(totals.meta)} />
          <Kpi label="Pedidos" value={totals.pedidos} />
                  </div>

        <div className="grid min-w-0 gap-2">
          <div className="grid min-w-0 grid-cols-1 gap-2 xl:grid-cols-2">
            <ChartCard title="Faturamento por Perfil de Cliente" onPrint={() => requestPrint('perfil')} className="min-h-[235px]">
              <ResponsiveContainer width="100%" height={205}>
                <PieChart>
                  <Pie data={profileData} dataKey="valor" nameKey="perfil" innerRadius={55} outerRadius={82} paddingAngle={2} onClick={() => requestPrint('perfil')} isAnimationActive={false}>
                    {profileData.map((entry, index) => <Cell key={entry.perfil} fill={['#2D8DB8', '#3A9D78', '#E6A34A', '#D65B61', '#7C6F64'][index % 5]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => brl(value)} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Evolução Mensal do Faturamento" onPrint={() => requestPrint('evolucao')} className="min-h-[235px]">
              <ResponsiveContainer width="100%" height={205}>
                <LineChart data={monthlyData} onClick={() => requestPrint('evolucao')} margin={{ top: 4, right: 10, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" fontSize={9} />
                  <YAxis fontSize={9} tickFormatter={(value: number) => value >= 1000 ? `R$ ${Math.round(value / 1000)}k` : String(value)} />
                  <Tooltip formatter={(value: number) => brl(value)} />
                  <Line type="monotone" dataKey="acumulado" name="Faturamento acumulado" stroke="#2D8DB8" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Metas vs. Realizado" onPrint={() => requestPrint('metas')} className="min-h-[235px] xl:col-span-2">
              <ResponsiveContainer width="100%" height={205}>
                <BarChart data={monthlyData} onClick={() => requestPrint('metas')} margin={{ top: 4, right: 10, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" fontSize={9} />
                  <YAxis fontSize={9} tickFormatter={(value: number) => value >= 1000 ? `R$ ${Math.round(value / 1000)}k` : String(value)} />
                  <Tooltip formatter={(value: number) => brl(value)} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="meta" name="Meta" fill="#E6A34A" barSize={12} isAnimationActive={false} />
                  <Bar dataKey="faturamento" name="Realizado" fill="#3A9D78" barSize={12} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>


        </div>
      </div>

      <div id="dashboard-print-area" className={printTarget ? '' : 'hidden'}>
        <div className="border-b-2 border-slate-800 pb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[15px] font-bold">{empresa?.razao_social ?? 'Empresa'}</div>
              <div className="text-[10px]">{empresa?.nome_fantasia ?? ''} • CNPJ {empresa?.cnpj ?? '—'}</div>
              <div className="text-[10px]">{empresa?.endereco ?? ''} {empresa?.cidade ?? ''}/{empresa?.uf ?? ''} {empresa?.cep ?? ''}</div>
              <div className="text-[10px]">{empresa?.telefone ?? ''} • {empresa?.email ?? ''}</div>
              {empresa?.cabecalho_relatorios && <div className="mt-1 text-[10px]">{empresa.cabecalho_relatorios}</div>}
            </div>
            {logoSrc && <img src={logoSrc} alt="Logomarca da empresa" className="max-h-20 max-w-52 object-contain" />}
          </div>
        </div>
        <h1 className="mt-4 text-center text-[16px] font-bold">{chartTitle(printTarget)} — {currentYear}</h1>
        <div className="print-chart mt-2">
          {printTarget === 'perfil' && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={profileData} dataKey="valor" nameKey="perfil" innerRadius={100} outerRadius={145} label={({ perfil, percentual }) => `${perfil} ${percentual.toFixed(1)}%`} isAnimationActive={false}>
                  {profileData.map((entry, index) => <Cell key={entry.perfil} fill={['#2D8DB8', '#3A9D78', '#E6A34A', '#D65B61', '#7C6F64'][index % 5]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => brl(value)} />
              </PieChart>
            </ResponsiveContainer>
          )}
          {printTarget === 'evolucao' && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis tickFormatter={(value: number) => brl(value)} />
                <Tooltip formatter={(value: number) => brl(value)} />
                <Line type="monotone" dataKey="acumulado" name="Faturamento acumulado" stroke="#2D8DB8" strokeWidth={3} dot isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
          {printTarget === 'metas' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis tickFormatter={(value: number) => brl(value)} />
                <Tooltip formatter={(value: number) => brl(value)} />
                <Legend />
                <Bar dataKey="meta" name="Meta" fill="#E6A34A" isAnimationActive={false} />
                <Bar dataKey="faturamento" name="Realizado" fill="#3A9D78" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <table className="mt-4 w-full border-collapse text-[10px]">
          <thead><tr className="border-b-2 border-slate-700 text-left"><th className="p-1">Período / Perfil</th><th className="p-1 text-right">Valor</th><th className="p-1 text-right">Referência</th></tr></thead>
          <tbody>
            {printTarget === 'perfil'
              ? profileData.map((row) => <tr key={row.perfil} className="border-b"><td className="p-1">{row.perfil}</td><td className="p-1 text-right">{brl(row.valor)}</td><td className="p-1 text-right">{row.percentual.toFixed(1)}%</td></tr>)
              : (printRows as MonthRow[]).map((row) => <tr key={row.mes} className="border-b"><td className="p-1">{row.mes}/{currentYear}</td><td className="p-1 text-right">{brl(printTarget === 'metas' ? row.meta : row.acumulado)}</td><td className="p-1 text-right">{printTarget === 'metas' ? brl(row.faturamento) : 'Faturamento acumulado'}</td></tr>)}
          </tbody>
        </table>
        {empresa?.rodape_relatorios && <div className="mt-5 border-t pt-2 text-[9px]">{empresa.rodape_relatorios}</div>}
      </div>
    </VendasLayout>
  )
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return <div className="border border-slate-300 bg-white p-2"><div className="text-[9px] uppercase text-slate-500">{label}</div><div className="mt-1 text-[15px] font-semibold text-[#123B50]">{value}</div></div>
}

function ChartCard({ title, onPrint, className = '', children }: { title: string; onPrint: () => void; className?: string; children: ReactNode }) {
  return <section className={`border border-slate-300 bg-white ${className}`}><div className="flex items-center justify-between border-b bg-[#F4F7FE] px-2 py-1.5"><b className="text-[10px] uppercase">{title}</b><button type="button" title="Imprimir relatório deste gráfico" onClick={onPrint} className="no-print flex items-center gap-1 border px-1.5 py-1 text-[9px]"><Printer size={12}/>IMPRIMIR</button></div>{children}</section>
}
