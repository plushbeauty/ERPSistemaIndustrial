import { useEffect, useMemo, useState } from 'react'
import { History, RefreshCw, Save, TriangleAlert } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog'

type Eq = {
  id: string
  empresa_id: string
  codigo: string
  descricao: string
  status: string
  proxima_calibracao: string | null
  certificado_rbc: string | null
  certificado_validade: string | null
  tolerancia_nominal: number | null
  erro_maximo: number | null
  unidade_medida: string | null
  observacoes: string | null
}

type H = {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function nullableNumber(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function parseEq(value: unknown): Eq | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || typeof value.empresa_id !== 'string' || typeof value.codigo !== 'string' || typeof value.descricao !== 'string' || typeof value.status !== 'string') return null
  return {
    id: value.id,
    empresa_id: value.empresa_id,
    codigo: value.codigo,
    descricao: value.descricao,
    status: value.status,
    proxima_calibracao: nullableString(value.proxima_calibracao),
    certificado_rbc: nullableString(value.certificado_rbc),
    certificado_validade: nullableString(value.certificado_validade),
    tolerancia_nominal: nullableNumber(value.tolerancia_nominal),
    erro_maximo: nullableNumber(value.erro_maximo),
    unidade_medida: nullableString(value.unidade_medida),
    observacoes: nullableString(value.observacoes),
  }
}

function parseHistory(value: unknown): H | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || typeof value.numero_certificado !== 'string' || typeof value.data_calibracao !== 'string' || typeof value.resultado !== 'string') return null
  const revisao = Number(value.revisao)
  if (!Number.isFinite(revisao)) return null
  return {
    id: value.id,
    revisao,
    numero_certificado: value.numero_certificado,
    data_calibracao: value.data_calibracao,
    proxima_calibracao: nullableString(value.proxima_calibracao),
    laboratorio: nullableString(value.laboratorio),
    resultado: value.resultado,
    observacao: nullableString(value.observacao),
    certificado_rbc: nullableString(value.certificado_rbc),
  }
}

function parseRows<T>(value: unknown, parser: (row: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return []
  return value.map(parser).filter((row): row is T => row !== null)
}

function isExpired(date: string | null): boolean {
  return Boolean(date && date < new Date().toISOString().slice(0, 10))
}

function isBlocked(equipment: Eq): boolean {
  const status = equipment.status.toLowerCase()
  return isExpired(equipment.proxima_calibracao) || status.includes('venc') || status.includes('reprov') || status.includes('bloque')
}

const equipmentSelect = 'id, empresa_id, codigo, descricao, status, proxima_calibracao, certificado_rbc, certificado_validade, tolerancia_nominal, erro_maximo, unidade_medida, observacoes'
const historySelect = 'id, revisao, numero_certificado, data_calibracao, proxima_calibracao, laboratorio, resultado, observacao, certificado_rbc'

export default function CalibracaoIndustrial() {
  const [equip, setEquip] = useState<Eq[]>([])
  const [sel, setSel] = useState<Eq | null>(null)
  const [hist, setHist] = useState<H[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    cert: '',
    data: new Date().toISOString().slice(0, 10),
    proxima: '',
    laboratorio: '',
    resultado: 'Aprovado',
    observacao: '',
    certificadoRbc: '',
  })

  const blockedCount = useMemo(() => equip.filter(isBlocked).length, [equip])

  async function load() {
    setBusy(true)
    setError('')
    try {
      const result = await supabase.from('erp_equipamentos_medicao').select(equipmentSelect).order('codigo')
      if (result.error) throw result.error
      setEquip(parseRows(result.data, parseEq))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os equipamentos de medição.')
      setEquip([])
    } finally {
      setBusy(false)
    }
  }

  async function openEq(equipment: Eq) {
    setSel(equipment)
    setOpen(true)
    setError('')
    const result = await supabase.from('erp_qualidade_calibracoes_historico').select(historySelect).eq('equipamento_id', equipment.id).order('revisao', { ascending: false })
    if (result.error) {
      setError(result.error.message)
      setHist([])
    } else {
      setHist(parseRows(result.data, parseHistory))
    }
  }

  async function save() {
    if (!sel || !form.cert.trim() || !form.data) {
      setError('Informe o número do certificado e a data da calibração.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const revisao = (hist[0]?.revisao ?? 0) + 1
      const history = await supabase.from('erp_qualidade_calibracoes_historico').insert({
        empresa_id: sel.empresa_id,
        equipamento_id: sel.id,
        revisao,
        numero_certificado: form.cert.trim(),
        data_calibracao: form.data,
        proxima_calibracao: form.proxima || null,
        laboratorio: form.laboratorio.trim() || null,
        resultado: form.resultado,
        observacao: form.observacao.trim() || null,
        certificado_rbc: form.certificadoRbc.trim() || null,
      })
      if (history.error) throw history.error

      const equipment = await supabase.from('erp_equipamentos_medicao').update({
        proxima_calibracao: form.proxima || null,
        certificado_validade: form.proxima || null,
        certificado_rbc: form.certificadoRbc.trim() || null,
        status: form.resultado,
        observacoes: form.observacao.trim() || sel.observacoes,
      }).eq('id', sel.id).eq('empresa_id', sel.empresa_id)
      if (equipment.error) throw equipment.error

      const fresh = await supabase.from('erp_equipamentos_medicao').select(equipmentSelect).eq('id', sel.id).eq('empresa_id', sel.empresa_id).single()
      if (fresh.error) throw fresh.error
      const freshEquipment = parseEq(fresh.data)
      if (!freshEquipment) throw new Error('O equipamento atualizado retornou dados incompatíveis.')

      setSel(freshEquipment)
      await openEq(freshEquipment)
      await load()
      setForm({ cert: '', data: new Date().toISOString().slice(0, 10), proxima: '', laboratorio: '', resultado: 'Aprovado', observacao: '', certificadoRbc: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registrar a calibração.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <main className="min-h-screen bg-[#f8fafc] p-4 md:p-6 text-slate-900">
      <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="text-sm font-bold uppercase tracking-wider text-[#1e3a8a]">SGQ • METROLOGIA</span>
          <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">Calibração e Equipamentos de Medição</h1>
          <p className="mt-1 text-base text-slate-600">Rastreabilidade real de instrumentos, certificados e validade metrológica.</p>
        </div>
        <div className="flex items-center gap-3">
          {blockedCount > 0 && <span className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-900"><TriangleAlert size={17} /> {blockedCount} bloqueado(s)</span>}
          <button type="button" onClick={() => void load()} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-base font-semibold text-slate-900 shadow-sm hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={18} className={busy ? 'animate-spin' : ''} /> Atualizar</button>
        </div>
      </header>

      {error && <div role="alert" className="mb-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-base font-bold text-rose-900">{error}</div>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-base">
            <thead><tr className="h-[54px] border-b border-slate-200 bg-slate-100 font-bold text-slate-900"><th className="p-3">CÓDIGO</th><th className="p-3">DESCRIÇÃO</th><th className="p-3">UNIDADE</th><th className="p-3">STATUS</th><th className="p-3">PRÓXIMA CALIBRAÇÃO</th><th className="p-3">CERTIFICADO RBC</th><th className="p-3 text-right">AÇÃO</th></tr></thead>
            <tbody>
              {equip.map(equipment => {
                const blocked = isBlocked(equipment)
                return <tr key={equipment.id} className={`h-[54px] border-b border-slate-100 text-slate-900 ${blocked ? 'bg-rose-50' : 'bg-white hover:bg-slate-50'}`}>
                  <td className="p-3 font-extrabold">{equipment.codigo}</td>
                  <td className="p-3">{equipment.descricao}</td>
                  <td className="p-3">{equipment.unidade_medida || '—'}</td>
                  <td className="p-3"><span className={`rounded-md px-2.5 py-1 text-xs font-black ${blocked ? 'bg-rose-200 text-rose-950' : 'bg-emerald-100 text-emerald-900'}`}>{blocked ? 'CALIBRAÇÃO VENCIDA / BLOQUEADO' : equipment.status}</span></td>
                  <td className="p-3">{equipment.proxima_calibracao || '—'}</td>
                  <td className="p-3">{equipment.certificado_rbc || '—'}</td>
                  <td className="p-3 text-right"><button type="button" onClick={() => void openEq(equipment)} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 hover:bg-slate-50"><History size={16} /> FICHA</button></td>
                </tr>
              })}
              {equip.length === 0 && !busy && <tr><td colSpan={7} className="p-8 text-center font-semibold text-slate-600">Nenhum instrumento de medição localizado na base.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto bg-white p-5 md:p-6">
          <DialogTitle className="text-2xl font-bold text-[#1e3a8a]">{sel?.codigo} — Ficha de Metrologia</DialogTitle>
          <DialogDescription className="text-base text-slate-600">Histórico real de certificados e revisões.</DialogDescription>
          {sel && <div className="mt-5 space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {[['Código', sel.codigo], ['Descrição', sel.descricao], ['Unidade', sel.unidade_medida || '—'], ['Próxima calibração', sel.proxima_calibracao || '—']].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><span className="block text-sm font-bold uppercase tracking-wide text-slate-500">{label}</span><strong className="mt-1 block text-base text-slate-900">{value}</strong></div>)}
            </div>

            {isBlocked(sel) && <div className="rounded-lg border-2 border-rose-300 bg-rose-50 p-4 text-base font-black text-rose-950">INSTRUMENTO BLOQUEADO PARA USO OPERACIONAL: calibração vencida, reprovada ou marcada como bloqueada.</div>}

            <section className="rounded-xl border border-slate-200 p-4">
              <h2 className="flex items-center gap-2 border-b border-slate-200 pb-3 text-lg font-bold text-[#1e3a8a]"><History size={20} /> Histórico de Calibrações</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-base"><thead><tr className="h-[54px] border-b border-slate-200 bg-slate-50 text-slate-900"><th className="p-2">REVISÃO</th><th className="p-2">CERTIFICADO</th><th className="p-2">DATA</th><th className="p-2">LABORATÓRIO</th><th className="p-2">RESULTADO</th></tr></thead>
                  <tbody>{hist.map(item => <tr key={item.id} className="h-[54px] border-b border-slate-100 text-slate-900"><td className="p-2 font-bold">{item.revisao}</td><td className="p-2">{item.numero_certificado}</td><td className="p-2">{item.data_calibracao}</td><td className="p-2">{item.laboratorio || '—'}</td><td className="p-2">{item.resultado}</td></tr>)}{hist.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500">Nenhuma revisão registrada.</td></tr>}</tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900"><Save size={20} /> Registrar nova calibração</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <label className="text-sm font-bold text-slate-800">CERTIFICADO<input className="mt-1 min-h-11 w-full rounded-md border border-slate-400 bg-white px-3 text-slate-900" value={form.cert} onChange={e => setForm(f => ({ ...f, cert: e.target.value }))} /></label>
                <label className="text-sm font-bold text-slate-800">DATA<input type="date" className="mt-1 min-h-11 w-full rounded-md border border-slate-400 bg-white px-3 text-slate-900" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></label>
                <label className="text-sm font-bold text-slate-800">PRÓXIMA CALIBRAÇÃO<input type="date" className="mt-1 min-h-11 w-full rounded-md border border-slate-400 bg-white px-3 text-slate-900" value={form.proxima} onChange={e => setForm(f => ({ ...f, proxima: e.target.value }))} /></label>
                <label className="text-sm font-bold text-slate-800">RESULTADO<select className="mt-1 min-h-11 w-full rounded-md border border-slate-400 bg-white px-3 text-slate-900" value={form.resultado} onChange={e => setForm(f => ({ ...f, resultado: e.target.value }))}><option>Aprovado</option><option>Reprovado</option><option>Condicional</option></select></label>
                <label className="text-sm font-bold text-slate-800 md:col-span-2">LABORATÓRIO<input className="mt-1 min-h-11 w-full rounded-md border border-slate-400 bg-white px-3 text-slate-900" value={form.laboratorio} onChange={e => setForm(f => ({ ...f, laboratorio: e.target.value }))} /></label>
                <label className="text-sm font-bold text-slate-800 md:col-span-2">CERTIFICADO RBC<input className="mt-1 min-h-11 w-full rounded-md border border-slate-400 bg-white px-3 text-slate-900" value={form.certificadoRbc} onChange={e => setForm(f => ({ ...f, certificadoRbc: e.target.value }))} /></label>
                <label className="text-sm font-bold text-slate-800 md:col-span-4">OBSERVAÇÃO<textarea className="mt-1 w-full rounded-md border border-slate-400 bg-white p-3 text-slate-900" rows={2} value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} /></label>
              </div>
              <div className="mt-5 flex justify-end"><button type="button" onClick={() => void save()} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-sky-700 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-sky-600 disabled:opacity-50"><Save size={17} /> {busy ? 'GRAVANDO…' : 'GRAVAR NOVA REVISÃO'}</button></div>
            </section>
          </div>}
        </DialogContent>
      </Dialog>
    </main>
  )
}
