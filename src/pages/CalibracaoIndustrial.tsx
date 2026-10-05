import { useEffect, useMemo, useState } from 'react'
import { History, Plus, RefreshCw, Save, TriangleAlert } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog'

type Equipment = {
  id: string
  empresa_id: string
  codigo: string
  descricao: string
  fabricante: string | null
  equipamento: string | null
  numero_serie: string | null
  faixa_medicao: string | null
  resolucao: string | null
  setor: string | null
  responsavel: string | null
  status: string
  proxima_calibracao: string | null
  certificado_rbc: string | null
  certificado_validade: string | null
  tolerancia_nominal: number | null
  erro_maximo: number | null
  unidade_medida: string | null
  observacoes: string | null
}

type Calibration = {
  id: string
  revisao: number
  numero_certificado: string
  data_calibracao: string
  proxima_calibracao: string | null
  laboratorio: string | null
  resultado: string
  observacao: string | null
  certificado_rbc: string | null
}

const equipmentSelect = 'id,empresa_id,codigo,descricao,fabricante,equipamento,numero_serie,faixa_medicao,resolucao,setor,responsavel,status,proxima_calibracao,certificado_rbc,certificado_validade,tolerancia_nominal,erro_maximo,unidade_medida,observacoes'
const historySelect = 'id,revisao,numero_certificado,data_calibracao,proxima_calibracao,laboratorio,resultado,observacao,certificado_rbc'
const PAGE_SIZE = 25

const emptyEquipment = {
  id: '',
  codigo: '',
  descricao: '',
  fabricante: '',
  equipamento: '',
  numero_serie: '',
  faixa_medicao: '',
  resolucao: '',
  setor: '',
  responsavel: '',
  status: 'BLOQUEADO',
  proxima_calibracao: '',
  certificado_rbc: '',
  certificado_validade: '',
  tolerancia_nominal: '',
  erro_maximo: '',
  unidade_medida: '',
  observacoes: '',
}

function isUsable(equipment: Equipment): boolean {
  return equipment.status.toUpperCase() === 'APROVADO' && Boolean(equipment.proxima_calibracao && equipment.proxima_calibracao >= new Date().toISOString().slice(0, 10))
}

function isExpired(equipment: Equipment): boolean {
  return Boolean(equipment.proxima_calibracao && equipment.proxima_calibracao < new Date().toISOString().slice(0, 10))
}

export default function CalibracaoIndustrial() {
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [selected, setSelected] = useState<Equipment | null>(null)
  const [history, setHistory] = useState<Calibration[]>([])
  const [open, setOpen] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [equipmentForm, setEquipmentForm] = useState(emptyEquipment)
  const [calibrationForm, setCalibrationForm] = useState({ numero_certificado: '', data_calibracao: new Date().toISOString().slice(0, 10), proxima_calibracao: '', laboratorio: '', resultado: 'Aprovado', observacao: '', certificado_rbc: '' })

  async function load() {
    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const rows = await fetchAllPages<Equipment>((from, to) => supabase.from('erp_equipamentos_medicao')
        .select(equipmentSelect, { count: 'exact' })
        .eq('empresa_id', company.data)
        .order('codigo')
        .range(from, to))
      setEquipments(rows)
      setPage(0)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os equipamentos.')
      setEquipments([])
    } finally {
      setBusy(false)
    }
  }

  async function openEquipment(equipment: Equipment) {
    setSelected(equipment)
    setHistory([])
    setOpen(true)
    setError('')
    try {
      const rows = await fetchAllPages<Calibration>((from, to) => supabase.from('erp_qualidade_calibracoes_historico')
        .select(historySelect, { count: 'exact' })
        .eq('empresa_id', equipment.empresa_id)
        .eq('equipamento_id', equipment.id)
        .order('revisao', { ascending: false })
        .range(from, to))
      setHistory(rows)
    } catch (cause) {
      setHistory([])
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o histórico de calibração.')
    }
  }

  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => equipments.filter(item => JSON.stringify(item).toLowerCase().includes(query.toLowerCase())), [equipments, query])
  const blockedCount = useMemo(() => equipments.filter(item => !isUsable(item)).length, [equipments])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visibleEquipments = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  useEffect(() => { setPage(current => Math.min(current, pageCount - 1)) }, [pageCount])

  async function saveEquipment() {
    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      if (!equipmentForm.codigo.trim() || !equipmentForm.descricao.trim()) throw new Error('Código e descrição são obrigatórios.')
      const payload = {
        empresa_id: company.data,
        codigo: equipmentForm.codigo.trim(),
        descricao: equipmentForm.descricao.trim(),
        fabricante: equipmentForm.fabricante.trim() || null,
        equipamento: equipmentForm.equipamento.trim() || null,
        numero_serie: equipmentForm.numero_serie.trim() || null,
        faixa_medicao: equipmentForm.faixa_medicao.trim() || null,
        resolucao: equipmentForm.resolucao.trim() || null,
        setor: equipmentForm.setor.trim() || null,
        responsavel: equipmentForm.responsavel.trim() || null,
        status: equipmentForm.status,
        proxima_calibracao: equipmentForm.proxima_calibracao || null,
        certificado_rbc: equipmentForm.certificado_rbc.trim() || null,
        certificado_validade: equipmentForm.certificado_validade || null,
        tolerancia_nominal: equipmentForm.tolerancia_nominal === '' ? null : Number(equipmentForm.tolerancia_nominal),
        erro_maximo: equipmentForm.erro_maximo === '' ? null : Number(equipmentForm.erro_maximo),
        unidade_medida: equipmentForm.unidade_medida.trim() || null,
        observacoes: equipmentForm.observacoes.trim() || null,
      }
      const result = equipmentForm.id
        ? await supabase.from('erp_equipamentos_medicao').update(payload).eq('id', equipmentForm.id).eq('empresa_id', company.data).select(equipmentSelect).single()
        : await supabase.from('erp_equipamentos_medicao').insert(payload).select(equipmentSelect).single()
      if (result.error) throw result.error
      setShowNew(false)
      setEquipmentForm(emptyEquipment)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível gravar o equipamento.')
    } finally {
      setBusy(false)
    }
  }

  async function saveCalibration() {
    if (!selected) return
    setBusy(true)
    setError('')
    try {
      const result = await supabase.rpc('erp_registrar_calibracao', {
        p_equipamento_id: selected.id,
        p_numero_certificado: calibrationForm.numero_certificado,
        p_data_calibracao: calibrationForm.data_calibracao,
        p_proxima_calibracao: calibrationForm.proxima_calibracao || null,
        p_laboratorio: calibrationForm.laboratorio || null,
        p_resultado: calibrationForm.resultado,
        p_observacao: calibrationForm.observacao || null,
        p_certificado_rbc: calibrationForm.certificado_rbc || null,
      })
      if (result.error) throw result.error
      await load()
      const fresh = await supabase.from('erp_equipamentos_medicao').select(equipmentSelect).eq('id', selected.id).eq('empresa_id', selected.empresa_id).single()
      if (fresh.error) throw fresh.error
      const nextEquipment = fresh.data as Equipment
      setSelected(nextEquipment)
      await openEquipment(nextEquipment)
      setCalibrationForm({ numero_certificado: '', data_calibracao: new Date().toISOString().slice(0, 10), proxima_calibracao: '', laboratorio: '', resultado: 'Aprovado', observacao: '', certificado_rbc: '' })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível registrar a calibração.')
    } finally {
      setBusy(false)
    }
  }

  function editEquipment(equipment: Equipment) {
    setEquipmentForm({
      id: equipment.id,
      codigo: equipment.codigo,
      descricao: equipment.descricao,
      fabricante: equipment.fabricante || '',
      equipamento: equipment.equipamento || '',
      numero_serie: equipment.numero_serie || '',
      faixa_medicao: equipment.faixa_medicao || '',
      resolucao: equipment.resolucao || '',
      setor: equipment.setor || '',
      responsavel: equipment.responsavel || '',
      status: equipment.status,
      proxima_calibracao: equipment.proxima_calibracao || '',
      certificado_rbc: equipment.certificado_rbc || '',
      certificado_validade: equipment.certificado_validade || '',
      tolerancia_nominal: equipment.tolerancia_nominal === null ? '' : String(equipment.tolerancia_nominal),
      erro_maximo: equipment.erro_maximo === null ? '' : String(equipment.erro_maximo),
      unidade_medida: equipment.unidade_medida || '',
      observacoes: equipment.observacoes || '',
    })
    setShowNew(true)
  }

  const field = (label: string, key: keyof typeof emptyEquipment, type = 'text') => <label className="grid gap-1 text-sm font-extrabold text-slate-800">{label}<input type={type} value={equipmentForm[key]} onChange={event => setEquipmentForm({ ...equipmentForm, [key]: event.target.value })} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-900"/></label>

  return <main className="min-h-screen bg-[#f8fafc] p-4 text-slate-900 md:p-6">
    <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
      <div><span className="text-sm font-black uppercase tracking-wider text-sky-700">SGQ • METROLOGIA</span><h1 className="mt-1 text-2xl font-black md:text-3xl">Calibração e Equipamentos de Medição</h1><p className="mt-1 text-base text-slate-600">Cadastro real, rastreabilidade de certificados e barreira operacional por validade metrológica.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        {blockedCount > 0 && <span className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-black text-rose-950"><TriangleAlert size={17}/> {blockedCount} bloqueado(s)</span>}
        <button type="button" onClick={() => { setEquipmentForm(emptyEquipment); setShowNew(true) }} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-sky-700 px-4 text-sm font-extrabold text-white"><Plus size={18}/> Novo instrumento</button>
        <button type="button" onClick={() => void load()} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900"><RefreshCw size={18} className={busy ? 'animate-spin' : ''}/> Atualizar</button>
      </div>
    </header>

    {error && <div role="alert" className="mb-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-base font-bold text-rose-900">{error}</div>}

    <div className="mb-4"><input value={query} onChange={event => { setQuery(event.target.value); setPage(0) }} placeholder="Pesquisar código, descrição, fabricante, setor…" className="min-h-11 w-full max-w-xl rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-900"/></div>

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full border-collapse text-left text-base">
      <thead><tr className="h-[54px] border-b border-slate-200 bg-slate-100 font-black"><th className="p-3">CÓDIGO</th><th className="p-3">DESCRIÇÃO</th><th className="p-3">FABRICANTE / EQUIPAMENTO</th><th className="p-3">SETOR</th><th className="p-3">STATUS</th><th className="p-3">PRÓXIMA</th><th className="p-3">CERTIFICADO</th><th className="p-3 text-right">AÇÃO</th></tr></thead>
      <tbody>{visibleEquipments.map((item, index) => <tr key={item.id} className={`h-[54px] border-b border-slate-100 hover:bg-slate-50 ${index % 2 ? 'bg-slate-50' : 'bg-white'}`}>
        <td className="p-3 font-black">{item.codigo}</td><td className="p-3">{item.descricao}</td><td className="p-3">{[item.fabricante, item.equipamento].filter(Boolean).join(' / ') || '—'}</td><td className="p-3">{item.setor || '—'}</td>
        <td className="p-3"><span className={'inline-flex rounded-md px-2.5 py-1 text-xs font-black ' + (isUsable(item) ? 'bg-emerald-100 text-emerald-950' : 'bg-rose-100 text-rose-950')}>{isUsable(item) ? 'APTO PARA USO' : isExpired(item) ? 'VENCIDO / BLOQUEADO' : item.status}</span></td>
        <td className="p-3">{item.proxima_calibracao || '—'}</td><td className="p-3">{item.certificado_rbc || '—'}</td>
        <td className="p-3 text-right"><div className="flex justify-end gap-2"><button type="button" onClick={() => void openEquipment(item)} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-bold"><History size={16}/> Ficha</button><button type="button" onClick={() => editEquipment(item)} className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-bold">Editar</button></div></td>
      </tr>)}{!filtered.length && !busy && <tr><td colSpan={8} className="p-8 text-center font-semibold text-slate-600">Nenhum instrumento de medição cadastrado na empresa.</td></tr>}</tbody>
    </table></div><nav aria-label="Paginação dos instrumentos de medição" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-3 text-sm"><span>{filtered.length} instrumento(s) · página {page + 1} de {pageCount}</span><div className="flex gap-2"><button type="button" disabled={page === 0} onClick={() => setPage(current => Math.max(0, current - 1))} className="min-h-10 rounded border border-slate-300 px-3 font-bold disabled:opacity-50">Anterior</button><button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage(current => Math.min(pageCount - 1, current + 1))} className="min-h-10 rounded border border-slate-300 px-3 font-bold disabled:opacity-50">Próxima</button></div></nav></section>

    <Dialog open={showNew} onOpenChange={setShowNew}><DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto bg-white p-5"><DialogTitle className="text-2xl font-black text-slate-950">{equipmentForm.id ? 'Editar instrumento' : 'Novo instrumento de medição'}</DialogTitle><DialogDescription className="text-slate-600">Somente campos existentes em erp_equipamentos_medicao.</DialogDescription>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{field('Código','codigo')}{field('Descrição','descricao')}{field('Fabricante','fabricante')}{field('Equipamento','equipamento')}{field('Número de série','numero_serie')}{field('Faixa de medição','faixa_medicao')}{field('Resolução','resolucao')}{field('Setor','setor')}{field('Responsável','responsavel')}{field('Próxima calibração','proxima_calibracao','date')}{field('Certificado RBC','certificado_rbc')}{field('Validade certificado','certificado_validade','date')}{field('Tolerância nominal','tolerancia_nominal','number')}{field('Erro máximo','erro_maximo','number')}{field('Unidade de medida','unidade_medida')}</div>
      <label className="mt-4 grid gap-1 text-sm font-extrabold text-slate-800">STATUS<select value={equipmentForm.status} onChange={event => setEquipmentForm({ ...equipmentForm, status: event.target.value })} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-900"><option>BLOQUEADO</option><option>ATIVO</option><option>APROVADO</option><option>INATIVO</option></select></label>
      <label className="mt-4 grid gap-1 text-sm font-extrabold text-slate-800">OBSERVAÇÕES<textarea value={equipmentForm.observacoes} onChange={event => setEquipmentForm({ ...equipmentForm, observacoes: event.target.value })} className="min-h-24 rounded-md border border-slate-300 bg-white p-3 text-slate-900"/></label>
      <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setShowNew(false)} className="min-h-11 rounded-md border border-slate-300 px-4 font-bold">Cancelar</button><button type="button" disabled={busy} onClick={() => void saveEquipment()} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-sky-700 px-5 font-extrabold text-white"><Save size={17}/> {busy ? 'Gravando…' : 'Gravar instrumento'}</button></div>
    </DialogContent></Dialog>

    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto bg-white p-5"><DialogTitle className="text-2xl font-black text-slate-950">{selected?.codigo} — Ficha de Metrologia</DialogTitle><DialogDescription className="text-slate-600">Histórico real de certificados e revisões.</DialogDescription>
      {selected && <div className="mt-5 space-y-6">
        {!isUsable(selected) && <div className="flex items-start gap-2 rounded-lg border-2 border-rose-300 bg-rose-50 p-4 text-base font-black text-rose-950"><TriangleAlert size={20}/> Instrumento bloqueado para uso operacional até possuir calibração aprovada e vigente.</div>}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">{[['Código',selected.codigo],['Descrição',selected.descricao],['Fabricante',selected.fabricante||'—'],['Equipamento',selected.equipamento||'—'],['Nº série',selected.numero_serie||'—'],['Setor',selected.setor||'—'],['Responsável',selected.responsavel||'—'],['Status',selected.status],['Última calibração',history[0]?.data_calibracao||'—'],['Próxima calibração',selected.proxima_calibracao||'—'],['Certificado RBC',selected.certificado_rbc||'—'],['Validade certificado',selected.certificado_validade||'—'],['Unidade',selected.unidade_medida||'—']].map(([label,value])=><div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><span className="block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span><strong className="mt-1 block text-base">{value}</strong></div>)}</div>
        <section className="rounded-xl border border-slate-200 p-4"><h2 className="flex items-center gap-2 border-b border-slate-200 pb-3 text-lg font-black text-slate-950"><History size={20}/> Histórico de calibrações</h2><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-base"><thead><tr className="h-[54px] bg-slate-100 font-black"><th className="p-2">REVISÃO</th><th className="p-2">CERTIFICADO</th><th className="p-2">DATA</th><th className="p-2">LABORATÓRIO</th><th className="p-2">RESULTADO</th><th className="p-2">PRÓXIMA</th></tr></thead><tbody>{history.map(item => <tr key={item.id} className="h-[54px] border-b border-slate-100"><td className="p-2 font-black">Rev. {item.revisao}</td><td className="p-2">{item.numero_certificado}</td><td className="p-2">{item.data_calibracao}</td><td className="p-2">{item.laboratorio || '—'}</td><td className="p-2">{item.resultado}</td><td className="p-2">{item.proxima_calibracao || '—'}</td></tr>)}{!history.length && <tr><td colSpan={6} className="p-6 text-center text-slate-500">Nenhuma revisão registrada.</td></tr>}</tbody></table></div></section>
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h2 className="mb-4 text-lg font-black">Registrar nova calibração</h2><div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="text-sm font-bold">CERTIFICADO<input value={calibrationForm.numero_certificado} onChange={event => setCalibrationForm({ ...calibrationForm, numero_certificado: event.target.value })} className="mt-1 min-h-11 w-full rounded-md border border-slate-400 bg-white px-3"/></label>
          <label className="text-sm font-bold">DATA<input type="date" value={calibrationForm.data_calibracao} onChange={event => setCalibrationForm({ ...calibrationForm, data_calibracao: event.target.value })} className="mt-1 min-h-11 w-full rounded-md border border-slate-400 bg-white px-3"/></label>
          <label className="text-sm font-bold">PRÓXIMA<input type="date" value={calibrationForm.proxima_calibracao} onChange={event => setCalibrationForm({ ...calibrationForm, proxima_calibracao: event.target.value })} className="mt-1 min-h-11 w-full rounded-md border border-slate-400 bg-white px-3"/></label>
          <label className="text-sm font-bold">LABORATÓRIO<input value={calibrationForm.laboratorio} onChange={event => setCalibrationForm({ ...calibrationForm, laboratorio: event.target.value })} className="mt-1 min-h-11 w-full rounded-md border border-slate-400 bg-white px-3"/></label>
          <label className="text-sm font-bold">RESULTADO<select value={calibrationForm.resultado} onChange={event => setCalibrationForm({ ...calibrationForm, resultado: event.target.value })} className="mt-1 min-h-11 w-full rounded-md border border-slate-400 bg-white px-3"><option>Aprovado</option><option>Condicional</option><option>Reprovado</option></select></label>
          <label className="text-sm font-bold">CERTIFICADO RBC<input value={calibrationForm.certificado_rbc} onChange={event => setCalibrationForm({ ...calibrationForm, certificado_rbc: event.target.value })} className="mt-1 min-h-11 w-full rounded-md border border-slate-400 bg-white px-3"/></label>
          <label className="text-sm font-bold md:col-span-3">OBSERVAÇÃO<textarea value={calibrationForm.observacao} onChange={event => setCalibrationForm({ ...calibrationForm, observacao: event.target.value })} rows={3} className="mt-1 w-full rounded-md border border-slate-400 bg-white p-3"/></label>
        </div><div className="mt-5 flex justify-end"><button type="button" disabled={busy} onClick={() => void saveCalibration()} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-sky-700 px-5 font-extrabold text-white"><Save size={17}/> {busy ? 'Gravando…' : 'Gravar nova revisão'}</button></div></section>
      </div>}
    </DialogContent></Dialog>
  </main>
}
