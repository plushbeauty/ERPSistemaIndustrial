/**
 * SYSNQRA — Gestão da Qualidade | Refugos e perdas
 * Revisão QAL-REFUGO-001 | 2026-10-21
 * Escrita transacional por RPC; sem alterar diretamente o acumulado produzido da OP.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Printer, RefreshCw, Save, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type OP = { id: string; numero_op: number | string; produto_id: string | null; quantidade_planejada: number; quantidade_produzida: number; status: string }
type Product = { id: string; codigo: string; nome: string }
type Defect = { id: string; codigo_defeito: string; descricao: string; classificacao: 'CRÍTICO' | 'MAIOR' | 'MENOR' }
type Scrap = { id: string; ordem_producao_id: string; defeito_id: string; quantidade_refugada: number; peso_refugo_kg: number | null; turno: string; operador: string; disposicao_material: 'RETRABALHO' | 'SUCATAMENTO' | 'SEGREGADO'; observacoes: string | null; created_at: string }

const field = 'h-[30px] w-full min-w-0 rounded-[2px] border border-[#3b5e7c] bg-[#091522] px-2.5 text-xs font-mono font-bold text-[#F4FBFD] outline-none focus:border-[#48B7C7] disabled:opacity-50'
const label = 'mb-1 block text-[9px] font-black uppercase tracking-wider text-[#A8BBC8]'
const button = 'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] border px-3 text-[10px] font-black uppercase disabled:opacity-50'

export default function QualidadeRefugos() {
  const [ops, setOps] = useState<OP[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [defects, setDefects] = useState<Defect[]>([])
  const [records, setRecords] = useState<Scrap[]>([])
  const [opId, setOpId] = useState('')
  const [defectId, setDefectId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [weight, setWeight] = useState('')
  const [shift, setShift] = useState('1')
  const [operator, setOperator] = useState('')
  const [disposition, setDisposition] = useState<'RETRABALHO' | 'SUCATAMENTO' | 'SEGREGADO'>('SUCATAMENTO')
  const [notes, setNotes] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [printRecord, setPrintRecord] = useState<Scrap | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão autenticada não identificada.')
      const tenant = String(company.data)
      const [orderRows, productRows, defectRows, scrapRows] = await Promise.all([
        fetchAllPages<OP>((from,to) => supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,quantidade_planejada,quantidade_produzida,status').eq('empresa_id',tenant).order('created_at',{ascending:false}).range(from,to)),
        fetchAllPages<Product>((from,to) => supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id',tenant).order('codigo').range(from,to)),
        supabase.from('erp_qualidade_defeitos_motivos').select('id,codigo_defeito,descricao,classificacao').eq('empresa_id',tenant).eq('ativo',true).order('codigo_defeito'),
        fetchAllPages<Scrap>((from,to) => supabase.from('erp_qualidade_refugos').select('id,ordem_producao_id,defeito_id,quantidade_refugada,peso_refugo_kg,turno,operador,disposicao_material,observacoes,created_at').eq('empresa_id',tenant).order('created_at',{ascending:false}).range(from,to))
      ])
      if (defectRows.error) throw defectRows.error
      setOps(orderRows); setProducts(productRows); setDefects((defectRows.data ?? []) as Defect[]); setRecords(scrapRows)
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar dados do SGQ.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const productMap = useMemo(() => new Map(products.map(p=>[p.id,p])),[products])
  const opMap = useMemo(() => new Map(ops.map(o=>[o.id,o])),[ops])
  const defectMap = useMemo(() => new Map(defects.map(d=>[d.id,d])),[defects])
  const totalQty = records.reduce((sum,r)=>sum+Number(r.quantidade_refugada||0),0)
  const totalWeight = records.reduce((sum,r)=>sum+Number(r.peso_refugo_kg||0),0)
  const critical = records.filter(r=>defectMap.get(r.defeito_id)?.classificacao==='CRÍTICO').length
  const filtered = records.filter(r => {
    const op=opMap.get(r.ordem_producao_id), product=op?.produto_id?productMap.get(op.produto_id):undefined, defect=defectMap.get(r.defeito_id)
    return [op?.numero_op,product?.codigo,product?.nome,defect?.descricao,r.operador,r.disposicao_material].join(' ').toLowerCase().includes(query.toLowerCase())
  })

  async function save() {
    const q=Number(quantity), kg=weight===''?null:Number(weight)
    if (!opId || !defectId || !Number.isInteger(q) || q<=0 || !operator.trim()) { setError('Informe OP, motivo, quantidade inteira positiva e operador.'); return }
    if (kg!==null && (!Number.isFinite(kg)||kg<0)) { setError('O peso deve ser zero ou positivo.'); return }
    setSaving(true); setError(''); setMessage('')
    try {
      const result=await supabase.rpc('erp_registrar_refugo',{
        p_ordem_producao_id:opId,p_defeito_id:defectId,p_quantidade_refugada:q,p_peso_refugo_kg:kg,
        p_turno:shift,p_operador:operator.trim(),p_disposicao_material:disposition,p_observacoes:notes.trim()||null
      })
      if(result.error) throw result.error
      setMessage('Refugo registrado transacionalmente. A quantidade boa estimada é calculada a partir do produzido menos os refugos registrados.')
      setQuantity(''); setWeight(''); setNotes('')
      await load()
    } catch(e) { setError(e instanceof Error?e.message:'Falha ao gravar refugo no banco.') }
    finally { setSaving(false) }
  }

  const selectedOp=opMap.get(printRecord?.ordem_producao_id ?? '')
  const selectedProduct=selectedOp?.produto_id?productMap.get(selectedOp.produto_id):undefined
  const selectedDefect=defectMap.get(printRecord?.defeito_id ?? '')

  return <main className="min-h-screen bg-[#0A111A] p-3 font-mono text-[#F4FBFD] md:p-5 print:bg-white print:p-0">
    <div className="mx-auto max-w-[1600px] space-y-4 print:hidden">
      <header className="flex flex-wrap items-center gap-3 border border-[#2E4A62] border-l-4 border-l-[#D65B61] bg-[#0E1E2F] p-4 shadow-xl">
        <span className="flex h-11 w-11 items-center justify-center border border-[#D65B61]/40 bg-[#123B50] text-[#D65B61]"><AlertTriangle size={22}/></span>
        <div className="min-w-0 flex-1"><span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#D65B61]">SYSNQRA • SGQ / IT-QAL-RNC-006</span><h1 className="text-lg font-black md:text-xl">Apontamento de Refugos &amp; Perdas</h1><p className="text-[10px] text-slate-400">Registros reais por empresa autenticada; gravação validada no PostgreSQL.</p></div>
        <button className={button+' border-[#2E4A62]'} disabled={loading} onClick={()=>void load()}><RefreshCw size={13}/> Sincronizar</button>
      </header>
      {(error||message)&&<div role="status" className={'flex items-start justify-between gap-3 border px-3 py-2 text-xs '+(error?'border-rose-500 bg-rose-950/40 text-rose-200':'border-emerald-500 bg-emerald-950/40 text-emerald-200')}><span>{error||message}</span><button onClick={()=>{setError('');setMessage('')}} aria-label="Fechar"><X size={14}/></button></div>}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article className="border border-rose-900 border-l-4 border-l-[#D65B61] bg-gradient-to-br from-[#3a121a] to-[#160b10] p-3"><span className="text-[9px] font-black uppercase text-rose-200">Peças refugadas</span><div className="mt-1 text-2xl font-black text-rose-300">{totalQty.toLocaleString('pt-BR')}</div></article>
        <article className="border border-amber-900 border-l-4 border-l-[#E6A34A] bg-gradient-to-br from-[#332007] to-[#1a1003] p-3"><span className="text-[9px] font-black uppercase text-amber-200">Peso de refugo (kg)</span><div className="mt-1 text-2xl font-black text-amber-300">{totalWeight.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div></article>
        <article className="border border-violet-900 border-l-4 border-l-violet-500 bg-gradient-to-br from-[#241533] to-[#100a18] p-3"><span className="text-[9px] font-black uppercase text-violet-200">Registros críticos</span><div className="mt-1 text-2xl font-black text-violet-300">{critical}</div></article>
      </section>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className="space-y-3 border border-[#2E4A62] bg-[#0D2638] p-4 lg:col-span-5">
          <h2 className="border-b border-[#2E4A62] pb-2 text-xs font-black uppercase text-[#48B7C7]">Novo apontamento de não conformidade</h2>
          <div><label className={label}>Ordem de produção *</label><select value={opId} onChange={e=>setOpId(e.target.value)} className={field} disabled={loading}><option value="">Selecione a OP</option>{ops.map(o=><option key={o.id} value={o.id}>OP-{o.numero_op} — {productMap.get(o.produto_id??'')?.codigo??'Produto'}</option>)}</select></div>
          <div><label className={label}>Motivo técnico *</label><select value={defectId} onChange={e=>setDefectId(e.target.value)} className={field} disabled={loading}><option value="">Selecione o defeito cadastrado</option>{defects.map(d=><option key={d.id} value={d.id}>[{d.codigo_defeito}] {d.descricao} ({d.classificacao})</option>)}</select>{!defects.length&&!loading&&<p className="mt-1 text-[10px] text-amber-300">Nenhum motivo ativo cadastrado para esta empresa. Cadastre os motivos antes de apontar.</p>}</div>
          <div className="grid grid-cols-2 gap-2"><div><label className={label}>Quantidade refug ada (un) *</label><input className={field} type="number" min="1" step="1" value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="0"/></div><div><label className={label}>Peso do refugo (kg)</label><input className={field} type="number" min="0" step="0.0001" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="0,0000"/></div></div>
          <div className="grid grid-cols-2 gap-2"><div><label className={label}>Turno</label><select className={field} value={shift} onChange={e=>setShift(e.target.value)}><option value="1">1º turno</option><option value="2">2º turno</option><option value="3">3º turno</option></select></div><div><label className={label}>Disposição *</label><select className={field} value={disposition} onChange={e=>setDisposition(e.target.value as typeof disposition)}><option value="SUCATAMENTO">Sucateamento</option><option value="RETRABALHO">Retrabalho</option><option value="SEGREGADO">Segregado</option></select></div></div>
          <div><label className={label}>Operador / inspetor *</label><input className={field} value={operator} onChange={e=>setOperator(e.target.value)} maxLength={160} placeholder="Identificação do operador"/></div>
          <div><label className={label}>Análise de causa / observações</label><textarea className="w-full border border-[#3b5e7c] bg-[#091522] p-2 text-xs text-white outline-none focus:border-[#48B7C7]" rows={3} maxLength={4000} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Rebarba, bolha, trinca, quebra de molde, lote de matéria-prima…"/></div>
          <button className={button+' h-[34px] w-full border-transparent bg-[#2D8DB8] text-white hover:bg-[#236F91]'} disabled={saving||loading||!defects.length||!ops.length} onClick={()=>void save()}><Save size={14}/>{saving?'Gravando no banco…':'Registrar não conformidade'}</button>
          <p className="text-[9px] leading-4 text-slate-400">O apontamento não altera artificialmente a quantidade produzida da OP. Peças boas = produzido acumulado menos refugos registrados; integração ao KPI OEE exige validar o contrato do painel OEE existente.</p>
        </section>
        <section className="min-w-0 space-y-3 border border-[#2E4A62] bg-[#0E1E2F] p-4 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xs font-black uppercase text-[#48B7C7]">Histórico de refugos e perdas</h2><p className="text-[10px] text-slate-400">{filtered.length} registro(s)</p></div><button className={button+' border-[#2E4A62]'} disabled={!filtered.length} onClick={()=>{setPrintRecord(filtered[0]);window.setTimeout(()=>window.print(),0)}}><Printer size={13}/> Imprimir RNC</button></div>
          <input className={field} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar OP, produto, defeito, operador…"/>
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-[10px]"><thead><tr className="border-b border-[#2E4A62] bg-[#091522] text-[9px] uppercase text-slate-400"><th className="p-2">Data</th><th className="p-2">OP / produto</th><th className="p-2">Defeito</th><th className="p-2 text-right">Qtd.</th><th className="p-2">Disposição</th><th className="p-2">RNC</th></tr></thead><tbody>{filtered.map(r=>{const o=opMap.get(r.ordem_producao_id),d=defectMap.get(r.defeito_id),p=productMap.get(o?.produto_id??'');return <tr key={r.id} className="border-b border-[#1b3447] hover:bg-[#123B50]/30"><td className="p-2">{new Date(r.created_at).toLocaleDateString('pt-BR')}</td><td className="p-2">OP-{o?.numero_op??'—'}<div className="text-slate-400">{p?.codigo??'—'}</div></td><td className="p-2">{d?.descricao??'Motivo indisponível'}</td><td className="p-2 text-right font-black">{r.quantidade_refugada}</td><td className="p-2">{r.disposicao_material}</td><td className="p-2"><button className="text-[#48B7C7] underline" onClick={()=>{setPrintRecord(r);window.setTimeout(()=>window.print(),0)}}>Imprimir</button></td></tr>})}{!filtered.length&&<tr><td colSpan={6} className="p-8 text-center text-slate-500">{loading?'Consultando banco…':'Nenhum registro encontrado.'}</td></tr>}</tbody></table></div>
        </section>
      </div>
    </div>
    <section className="rnc-print-sheet hidden bg-white p-12 font-sans text-black print:block">
      <div className="flex justify-between border-b-2 border-black pb-3"><div><h1 className="text-xl font-bold">SYSNQRA SISTEMAS INDUSTRIAIS</h1><p className="text-xs">RELATÓRIO DE NÃO CONFORMIDADE • SGQ</p></div><div className="text-right text-xs">IT-QAL-RNC-006<br/>Emissão: {new Date().toLocaleDateString('pt-BR')}</div></div>
      {printRecord&&<div className="mt-8 space-y-3 text-sm leading-6"><p><b>Ordem de produção:</b> OP-{selectedOp?.numero_op??'—'}</p><p><b>Produto:</b> {selectedProduct?.codigo??'—'} — {selectedProduct?.nome??'—'}</p><p><b>Defeito:</b> {selectedDefect?.codigo_defeito??'—'} — {selectedDefect?.descricao??'—'} ({selectedDefect?.classificacao??'—'})</p><p><b>Quantidade refug ada:</b> {printRecord.quantidade_refugada} un. <b>Peso:</b> {printRecord.peso_refugo_kg??'—'} kg</p><p><b>Turno / operador:</b> {printRecord.turno} / {printRecord.operador}</p><p><b>Disposição:</b> {printRecord.disposicao_material}</p><h2 className="mt-8 border-b border-black font-bold">Análise de causa / observações</h2><p>{printRecord.observacoes||'Sem observações registradas.'}</p><div className="mt-24 grid grid-cols-2 gap-16 text-center text-xs"><div className="border-t border-black pt-2">Operador / Líder</div><div className="border-t border-black pt-2">Garantia da Qualidade / SGQ</div></div></div>}
    </section>
    <style>{'@media print { body * { visibility: hidden !important; } .rnc-print-sheet, .rnc-print-sheet * { visibility: visible !important; } .rnc-print-sheet { display:block !important; position:absolute !important; left:0 !important; top:0 !important; width:100% !important; } }'}</style>
  </main>
}
