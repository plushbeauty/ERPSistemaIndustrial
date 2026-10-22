/**
 * SYSNQRA ERP & SGQ INDUSTRIAL
 * Revisão: 1.0 | Data: 21/10/2026
 * Escopo: Almoxarifado mestre, rastreabilidade, alertas de validade e fila FIFO.
 * Fonte de verdade: erp_estoque_lotes_rastreabilidade + erp_produtos.
 * Segurança: empresa obtida no banco e filtro de tenant em todas as leituras.
 * Entradas: exclusivamente pela RPC transacional fn_receber_lote_almoxarifado.
 * Não simula registros nem permite editar saldo diretamente no cliente.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Archive, CalendarClock, CheckCircle2, PackageCheck, RefreshCw, Search, ShieldAlert } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Product = { id: string; codigo: string | null; nome: string | null; unidade_medida: string | null }
type Lot = {
  id: string
  empresa_id: string
  produto_id: string
  nf_numero: string | null
  lote_fornecedor: string
  quantidade_inicial: number
  quantidade_disponivel: number
  status_qualidade: 'APROVADO' | 'REPROVADO' | 'RETIDO' | string
  certificado_path: string | null
  data_validade: string | null
  created_at: string
}
type LotView = Lot & { codigo: string; nome: string; unidade: string; dias: number | null; validadeStatus: 'VENCIDO' | 'CRITICO' | 'REGULAR' | 'SEM VALIDADE' }
const input = 'h-[30px] w-full min-w-0 rounded-[2px] border border-[#3b5e7c] bg-[#091522] px-2.5 text-xs font-mono font-bold text-[#F4FBFD] outline-none focus:border-[#48B7C7] disabled:opacity-50'
const label = 'mb-1 block text-[9px] font-black uppercase tracking-wider text-[#A8BBC8]'
const button = 'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] border px-3 text-[10px] font-black uppercase tracking-wide disabled:opacity-50'
const todayISO = () => {
  const d = new Date()
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}
function dayDiff(date: string, today: string) {
  return Math.floor((Date.parse(date + 'T00:00:00') - Date.parse(today + 'T00:00:00')) / 86400000)
}
function fmtDate(value: string | null) {
  if (!value) return 'SEM VALIDADE'
  const [y, m, d] = value.slice(0, 10).split('-')
  return [d, m, y].join('/')
}

export default function AlmoxarifadoInventario() {
  const [companyId, setCompanyId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [lots, setLots] = useState<LotView[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [today, setToday] = useState(todayISO)
  const [search, setSearch] = useState('')
  const [materialFilter, setMaterialFilter] = useState('')
  const [productId, setProductId] = useState('')
  const [nf, setNf] = useState('')
  const [lotCode, setLotCode] = useState('')
  const [quantity, setQuantity] = useState('')
  const [expiry, setExpiry] = useState('')
  const [certificate, setCertificate] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (typeof company.data !== 'string' || !company.data) throw new Error('Empresa da sessão não identificada. Entre novamente no ERP.')
      const tenant = company.data
      const [productRows, lotRows] = await Promise.all([
        fetchAllPages<Product>((from, to) => supabase.from('erp_produtos').select('id,codigo,nome,unidade_medida').eq('empresa_id', tenant).eq('ativo', true).order('codigo').range(from, to)),
        fetchAllPages<Lot>((from, to) => supabase.from('erp_estoque_lotes_rastreabilidade').select('id,empresa_id,produto_id,nf_numero,lote_fornecedor,quantidade_inicial,quantidade_disponivel,status_qualidade,certificado_path,data_validade,created_at').eq('empresa_id', tenant).order('created_at', { ascending: true }).range(from, to)),
      ])
      const productMap = new Map(productRows.map(p => [p.id, p]))
      const now = todayISO()
      setCompanyId(tenant)
      setProducts(productRows)
      setToday(now)
      setLots(lotRows.map(lot => {
        const p = productMap.get(lot.produto_id)
        const days = lot.data_validade ? dayDiff(lot.data_validade.slice(0, 10), now) : null
        return {
          ...lot,
          codigo: p?.codigo ?? '—',
          nome: p?.nome ?? 'Produto não localizado',
          unidade: p?.unidade_medida ?? '',
          dias: days,
          validadeStatus: days === null ? 'SEM VALIDADE' : days < 0 ? 'VENCIDO' : days <= 5 ? 'CRITICO' : 'REGULAR',
        }
      }))
    } catch (cause) {
      setProducts([])
      setLots([])
      setError(cause instanceof Error ? cause.message : 'Falha ao consultar o inventário de lotes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const fifoRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return lots.filter(lot => {
      if (materialFilter && lot.produto_id !== materialFilter) return false
      if (!term) return true
      return [lot.codigo, lot.nome, lot.lote_fornecedor, lot.nf_numero ?? '', lot.status_qualidade].some(v => v.toLocaleLowerCase('pt-BR').includes(term))
    }).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
  }, [lots, search, materialFilter])

  const nextEligibleLotId = fifoRows.find(lot => lot.status_qualidade === 'APROVADO' && lot.validadeStatus !== 'VENCIDO' && Number(lot.quantidade_disponivel) > 0)?.id ?? null

  const kpis = useMemo(() => ({
    total: lots.length,
    expired: lots.filter(l => l.validadeStatus === 'VENCIDO' && Number(l.quantidade_disponivel) > 0).length,
    critical: lots.filter(l => l.validadeStatus === 'CRITICO' && Number(l.quantidade_disponivel) > 0).length,
    held: lots.filter(l => l.status_qualidade !== 'APROVADO').length,
    balance: lots.reduce((sum, l) => sum + Number(l.quantidade_disponivel || 0), 0),
  }), [lots])

  async function receiveLot() {
    const qty = Number(quantity)
    if (!companyId || !productId || !nf.trim() || !lotCode.trim() || !Number.isFinite(qty) || qty <= 0) {
      setError('Informe material, NF, lote do fornecedor e quantidade positiva.')
      return
    }
    if (expiry && expiry <= today) {
      setError('A validade precisa ser posterior à data atual para uma entrada nova.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const { data, error: rpcError } = await supabase.rpc('fn_receber_lote_almoxarifado', {
        p_empresa_id: companyId,
        p_produto_id: productId,
        p_nf_numero: nf.trim(),
        p_lote_fornecedor: lotCode.trim(),
        p_quantidade: qty,
        p_status_qualidade: 'APROVADO',
        p_certificado_path: certificate.trim() || null,
        p_data_validade: expiry || null,
      })
      if (rpcError) throw rpcError
      if (!data) throw new Error('A RPC não retornou o identificador do lote; confirme o resultado no inventário antes de repetir.')
      setMessage('Recebimento registrado pela transação do banco. Lote: ' + String(data))
      setNf('')
      setLotCode('')
      setQuantity('')
      setExpiry('')
      setCertificate('')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao registrar o recebimento transacional.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0A111A] p-3 font-mono text-[#F4FBFD] antialiased md:p-5">
      <div className="mx-auto max-w-[1700px] space-y-4">
        <header className="flex flex-wrap items-center gap-3 border border-[#2E4A62] border-l-4 border-l-[#E6A34A] bg-[#0E1E2F] p-4 shadow-2xl">
          <span className="flex h-11 w-11 items-center justify-center rounded-[2px] border border-[#E6A34A]/30 bg-[#123B50] text-[#E6A34A]"><Archive size={22} /></span>
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-[#E6A34A]">SYSNQRA · LOGÍSTICA / SGQ</div>
            <h1 className="text-lg font-black leading-6 md:text-xl">Almoxarifado Mestre · Rastreabilidade FIFO</h1>
            <p className="text-[10px] text-[#A8BBC8]">Lotes reais, validade, bloqueios de qualidade e ordem de entrada</p>
          </div>
          <button type="button" disabled={loading} onClick={() => void load()} className={button + ' ml-auto border-[#2E4A62] bg-[#123B50] hover:bg-[#1b344a]'}><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Atualizar lotes</button>
        </header>

        {(error || message) && <div role={error ? 'alert' : 'status'} className={'flex items-start justify-between gap-3 border px-3 py-2 text-xs font-bold ' + (error ? 'border-rose-500 bg-rose-950/40 text-rose-200' : 'border-emerald-500 bg-emerald-950/40 text-emerald-200')}><span>{error || message}</span><button type="button" onClick={() => { setError(''); setMessage('') }} aria-label="Fechar mensagem">×</button></div>}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <article className="border border-[#2D8DB8]/50 bg-[#123B50] p-3"><div className="flex items-center justify-between text-[9px] font-black uppercase text-[#B7D9E8]">Lotes cadastrados <Archive size={16} /></div><div className="mt-2 text-2xl font-black">{kpis.total}</div><div className="text-[9px] text-[#B7D9E8]">Empresa autenticada</div></article>
          <article className="border border-rose-500/50 bg-gradient-to-br from-rose-950 to-[#35141c] p-3"><div className="flex items-center justify-between text-[9px] font-black uppercase text-rose-200">Vencidos com saldo <ShieldAlert size={16} /></div><div className="mt-2 text-2xl font-black text-rose-100">{kpis.expired}</div><div className="text-[9px] text-rose-200">Não liberar para consumo</div></article>
          <article className="border border-amber-500/50 bg-gradient-to-br from-amber-950 to-[#352716] p-3"><div className="flex items-center justify-between text-[9px] font-black uppercase text-amber-200">Vencem em até 5 dias <CalendarClock size={16} /></div><div className="mt-2 text-2xl font-black text-amber-100">{kpis.critical}</div><div className="text-[9px] text-amber-200">Priorizar avaliação</div></article>
          <article className="border border-[#48B7C7]/50 bg-[#102B3B] p-3"><div className="flex items-center justify-between text-[9px] font-black uppercase text-[#8EDCE3]">Saldo disponível <PackageCheck size={16} /></div><div className="mt-2 text-2xl font-black">{kpis.balance.toLocaleString('pt-BR')}</div><div className="text-[9px] text-[#8EDCE3]">Unidades conforme cadastro</div></article>
          <article className="border border-violet-500/50 bg-gradient-to-br from-violet-950 to-[#251d3d] p-3"><div className="flex items-center justify-between text-[9px] font-black uppercase text-violet-200">Retidos / reprovados <AlertTriangle size={16} /></div><div className="mt-2 text-2xl font-black text-violet-100">{kpis.held}</div><div className="text-[9px] text-violet-200">Excluídos da elegibilidade FIFO</div></article>
        </section>

        <section className="border border-[#2E4A62] bg-[#0E1E2F] p-3">
          <div className="mb-3 flex items-center gap-2"><PackageCheck size={16} className="text-[#48B7C7]" /><h2 className="text-xs font-black uppercase tracking-wide">Recebimento de lote · transação atômica</h2></div>
          <p className="mb-3 text-[10px] text-[#A8BBC8]">Este formulário só recebe material com status de qualidade APROVADO. Quarentena/reprovação devem passar pelo fluxo de inspeção do SGQ. O saldo é atualizado no banco pela RPC; não há escrita direta no cliente.</p>
          <div className="grid grid-cols-12 items-end gap-3">
            <div className="col-span-12 md:col-span-6"><label className={label}>Material / insumo *</label><select value={productId} onChange={e => setProductId(e.target.value)} className={input} disabled={loading}><option value="">Selecione material ativo</option>{products.map(p => <option key={p.id} value={p.id}>{p.codigo ?? '—'} — {p.nome ?? 'Sem descrição'}</option>)}</select></div>
            <div className="col-span-12 sm:col-span-4 md:col-span-3"><label className={label}>NF / documento *</label><input value={nf} onChange={e => setNf(e.target.value)} className={input} maxLength={80} placeholder="Número da NF-e" /></div>
            <div className="col-span-12 sm:col-span-8 md:col-span-3"><label className={label}>Lote fornecedor *</label><input value={lotCode} onChange={e => setLotCode(e.target.value)} className={input} maxLength={120} placeholder="Código rastreável" /></div>
            <div className="col-span-12 sm:col-span-4 md:col-span-3"><label className={label}>Quantidade *</label><input type="number" min="0.0001" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} className={input} placeholder="0,000" /></div>
            <div className="col-span-12 sm:col-span-4 md:col-span-3"><label className={label}>Validade</label><input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} className={input} /></div>
            <div className="col-span-12 md:col-span-6"><label className={label}>Caminho do certificado (opcional)</label><input value={certificate} onChange={e => setCertificate(e.target.value)} className={input} maxLength={500} placeholder="Referência documental já existente" /></div>
            <div className="col-span-12 flex flex-wrap justify-end gap-2"><button type="button" disabled={saving || loading} onClick={() => { setProductId(''); setNf(''); setLotCode(''); setQuantity(''); setExpiry(''); setCertificate(''); setError(''); setMessage('') }} className={button + ' border-[#2E4A62] bg-[#091522] text-slate-200'}>Limpar</button><button type="button" disabled={saving || loading} onClick={() => void receiveLot()} className={button + ' border-[#E6A34A] bg-[#E6A34A] text-[#091522] hover:bg-amber-400'}>{saving ? 'Gravando...' : 'Efetivar recebimento'}</button></div>
          </div>
        </section>

        <section className="border border-[#2E4A62] bg-[#0E1E2F] p-3">
          <div className="mb-3 flex flex-wrap items-center gap-2"><div className="mr-auto"><h2 className="text-xs font-black uppercase tracking-wide">Fila mestre de lotes · FIFO / PEPS</h2><p className="mt-1 text-[10px] text-[#A8BBC8]">Ordenação pela entrada mais antiga. A validade é alerta de FEFO e não substitui a regra FIFO.</p></div><div className="relative w-full sm:w-64"><Search size={13} className="absolute left-2 top-2 text-slate-500" /><input value={search} onChange={e => setSearch(e.target.value)} className={input + ' pl-7'} placeholder="Buscar lote, material ou NF..." /></div><select value={materialFilter} onChange={e => setMaterialFilter(e.target.value)} className={input + ' w-full sm:w-56'}><option value="">Todos os materiais</option>{products.map(p => <option key={p.id} value={p.id}>{p.codigo ?? '—'} — {p.nome ?? ''}</option>)}</select></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-[10px]">
              <thead><tr className="border-b border-[#2E4A62] bg-[#091522] text-[9px] uppercase text-[#A8BBC8]"><th className="p-2">FIFO</th><th className="p-2">Material</th><th className="p-2">Lote fornecedor</th><th className="p-2">NF</th><th className="p-2 text-right">Saldo</th><th className="p-2">Entrada</th><th className="p-2">Validade / SGQ</th></tr></thead>
              <tbody>{fifoRows.map((lot, i) => {
                const eligible = lot.status_qualidade === 'APROVADO' && lot.validadeStatus !== 'VENCIDO' && Number(lot.quantidade_disponivel) > 0
                const rowTone = lot.validadeStatus === 'VENCIDO' ? 'bg-rose-950/50 text-rose-100' : lot.validadeStatus === 'CRITICO' ? 'bg-amber-950/40 text-amber-100' : lot.status_qualidade !== 'APROVADO' ? 'bg-violet-950/30 text-violet-100' : 'bg-[#0b1a28] text-slate-200'
                return <tr key={lot.id} className={'border-b border-[#22394c] ' + rowTone}>
                  <td className="p-2 font-black">{i === 0 ? <span className="text-[#48B7C7]">PRÓXIMO</span> : String(i + 1).padStart(2, '0')}</td>
                  <td className="p-2"><div className="font-bold">{lot.codigo}</div><div className="max-w-[250px] truncate text-[9px] opacity-80">{lot.nome}</div></td>
                  <td className="p-2 font-bold">{lot.lote_fornecedor}</td><td className="p-2">{lot.nf_numero ?? '—'}</td>
                  <td className="p-2 text-right font-bold tabular-nums">{Number(lot.quantidade_disponivel).toLocaleString('pt-BR')} {lot.unidade}</td>
                  <td className="p-2">{fmtDate(lot.created_at.slice(0, 10))}</td>
                  <td className="p-2"><div className="font-bold">{fmtDate(lot.data_validade)}</div><div className="mt-0.5 text-[9px] font-black">{lot.validadeStatus === 'VENCIDO' ? 'VENCIDO · BLOQUEAR' : lot.validadeStatus === 'CRITICO' ? 'CRÍTICO · ' + lot.dias + ' DIA(S)' : lot.status_qualidade === 'APROVADO' ? 'APROVADO' : lot.status_qualidade}</div><div className="mt-0.5 text-[9px]">{eligible ? 'Elegível em consulta FIFO' : 'NÃO ELEGÍVEL PARA CONSUMO'}</div></td>
                </tr>
              })}{!loading && fifoRows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-xs text-[#A8BBC8]">Nenhum lote encontrado para os filtros selecionados.</td></tr>}</tbody>
            </table>
          </div>
          {loading && <p className="mt-3 text-[10px] text-[#A8BBC8]">Carregando dados reais do Supabase…</p>}
          <div className="mt-3 flex items-start gap-2 border-l-2 border-[#E6A34A] bg-[#251f16] p-2 text-[10px] text-amber-100"><AlertTriangle size={14} className="mt-0.5 shrink-0" /><p>Regra de segurança: a tela apenas informa elegibilidade. O bloqueio definitivo de lote vencido e o consumo FIFO precisam ser impostos também pela RPC de saída/PCP no banco, para evitar consumo concorrente ou chamada direta à API.</p></div>
        </section>
        <footer className="text-[9px] text-[#6F899B]">SYSNQRA · IT-ALM-FIFO-009 · Tenant: {companyId ? companyId.slice(0, 8) + '…' : 'não carregado'} · Atualização {today}</footer>
      </div>
    </main>
  )
}
