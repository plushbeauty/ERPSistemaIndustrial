/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 11:43 BRT
 * Desenvolvedor: IA Co-Pilot (Homologado por Fernando)
 * ID da Revisão: REV-029
 * Alterações: Reconstrução integral da tela de Calibração Industrial; correção do fluxo de recarga pós-gravação; remoção de referência inexistente freshResultResult; tipagem por guardas de runtime; formulário responsivo Tailwind para tablet.
 * Status do Build Local: Não executado — ambiente local sem acesso de rede ao repositório.
 * =========================================================================
 */

import { useEffect, useState } from 'react'
import { History, RefreshCw, Save } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog'

type Eq = {
  id: string
  empresa_id: string
  codigo: string
  descricao: string
  fabricante: string | null
  modelo: string | null
  status: string
  proxima_calibracao: string | null
  setor_localizacao: string | null
  ultima_calibracao: string | null
  numero_certificado_atual: string | null
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
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function parseEq(value: unknown): Eq | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || typeof value.empresa_id !== 'string' || typeof value.codigo !== 'string' || typeof value.descricao !== 'string' || typeof value.status !== 'string') return null
  return {
    id: value.id,
    empresa_id: value.empresa_id,
    codigo: value.codigo,
    descricao: value.descricao,
    fabricante: asNullableString(value.fabricante),
    modelo: asNullableString(value.modelo),
    status: value.status,
    proxima_calibracao: asNullableString(value.proxima_calibracao),
    setor_localizacao: asNullableString(value.setor_localizacao),
    ultima_calibracao: asNullableString(value.ultima_calibracao),
    numero_certificado_atual: asNullableString(value.numero_certificado_atual),
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
    proxima_calibracao: asNullableString(value.proxima_calibracao),
    laboratorio: asNullableString(value.laboratorio),
    resultado: value.resultado,
    observacao: asNullableString(value.observacao),
  }
}

function parseRows<T>(value: unknown, parser: (row: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return []
  return value.map(parser).filter((row): row is T => row !== null)
}

export default function CalibracaoIndustrial() {
  const [equip, setEquip] = useState<Eq[]>([])
  const [sel, setSel] = useState<Eq | null>(null)
  const [hist, setHist] = useState<H[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    cert: '',
    data: new Date().toISOString().slice(0, 10),
    proxima: '',
    laboratorio: '',
    resultado: 'Aprovado',
    observacao: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setBusy(true)
    setError('')
    const result = await supabase
      .from('erp_equipamentos_medicao')
      .select('id, empresa_id, codigo, descricao, fabricante, modelo, status, proxima_calibracao, setor_localizacao, ultima_calibracao, numero_certificado_atual')
      .order('codigo')

    if (result.error) {
      setError(result.error.message)
      setEquip([])
    } else {
      setEquip(parseRows(result.data, parseEq))
    }
    setBusy(false)
  }

  async function openEq(equipment: Eq) {
    setSel(equipment)
    setOpen(true)
    setError('')
    const result = await supabase
      .from('erp_qualidade_calibracoes_historico')
      .select('id, revisao, numero_certificado, data_calibracao, proxima_calibracao, laboratorio, resultado, observacao')
      .eq('equipamento_id', equipment.id)
      .order('revisao', { ascending: false })

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
    const rev = (hist[0]?.revisao ?? -1) + 1

    const historyInsert = await supabase.from('erp_qualidade_calibracoes_historico').insert({
      empresa_id: sel.empresa_id,
      equipamento_id: sel.id,
      revisao: rev,
      numero_certificado: form.cert.trim(),
      data_calibracao: form.data,
      proxima_calibracao: form.proxima || null,
      laboratorio: form.laboratorio.trim() || null,
      resultado: form.resultado,
      observacao: form.observacao.trim() || null,
    })

    if (historyInsert.error) {
      setError(historyInsert.error.message)
      setBusy(false)
      return
    }

    const equipmentUpdate = await supabase
      .from('erp_equipamentos_medicao')
      .update({
        ultima_calibracao: form.data,
        proxima_calibracao: form.proxima || null,
        numero_certificado_atual: form.cert.trim(),
        status: form.resultado,
      })
      .eq('id', sel.id)
      .eq('empresa_id', sel.empresa_id)

    if (equipmentUpdate.error) {
      setError(equipmentUpdate.error.message)
      setBusy(false)
      return
    }

    const freshResult = await supabase
      .from('erp_equipamentos_medicao')
      .select('id, empresa_id, codigo, descricao, fabricante, modelo, status, proxima_calibracao, setor_localizacao, ultima_calibracao, numero_certificado_atual')
      .eq('id', sel.id)
      .eq('empresa_id', sel.empresa_id)
      .single()

    if (freshResult.error) {
      setError(freshResult.error.message)
      setBusy(false)
      return
    }

    const freshEquipment = parseEq(freshResult.data)
    if (!freshEquipment) {
      setError('O equipamento atualizado retornou dados incompatíveis com a ficha de calibração.')
      setBusy(false)
      return
    }

    setSel(freshEquipment)
    await openEq(freshEquipment)
    await load()
    setForm(current => ({ ...current, cert: '', observacao: '', proxima: '', laboratorio: '' }))
    setBusy(false)
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <main className="min-h-screen bg-[#f8fafc] p-4 md:p-6 text-[#0f172a]">
      <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="text-sm font-bold uppercase tracking-wider text-[#1e3a8a]">SGQ • METROLOGIA</span>
          <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">Calibração e Equipamentos de Medição</h1>
          <p className="mt-1 text-base text-slate-600">Rastreabilidade de instrumentos, certificados, revisões e localização física.</p>
        </div>
        <button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-base font-semibold shadow-sm hover:bg-slate-50 disabled:opacity-60" onClick={() => void load()} disabled={busy}>
          <RefreshCw size={18} className={busy ? 'animate-spin' : ''} /> Atualizar
        </button>
      </header>

      {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-base font-medium text-red-700">{error}</div>}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <h2 className="text-xl font-bold text-[#1e3a8a]">Instrumentos de Inspeção</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-base">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-semibold">
                <th className="p-3">Código</th>
                <th className="p-3">Descrição</th>
                <th className="p-3">Fabricante / Modelo</th>
                <th className="p-3">Setor</th>
                <th className="p-3">Status</th>
                <th className="p-3">Próxima Calibração</th>
                <th className="p-3">Certificado</th>
              </tr>
            </thead>
            <tbody>
              {equip.map(equipment => (
                <tr key={equipment.id} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50" onClick={() => void openEq(equipment)}>
                  <td className="p-3 font-bold">{equipment.codigo}</td>
                  <td className="p-3">{equipment.descricao}</td>
                  <td className="p-3">{equipment.fabricante || '—'} / {equipment.modelo || '—'}</td>
                  <td className="p-3 text-slate-600">{equipment.setor_localizacao || '—'}</td>
                  <td className="p-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">{equipment.status}</span></td>
                  <td className="p-3">{equipment.proxima_calibracao || '—'}</td>
                  <td className="p-3 font-mono text-sm text-slate-600">{equipment.numero_certificado_atual || '—'}</td>
                </tr>
              ))}
              {equip.length === 0 && !busy && <tr><td colSpan={7} className="p-6 text-center text-slate-500">Nenhum instrumento de medição localizado na base.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto bg-white p-5 md:p-6">
          <DialogTitle className="text-2xl font-bold text-[#1e3a8a]">{sel?.codigo} — Ficha Técnica de Metrologia</DialogTitle>
          <DialogDescription className="text-base text-slate-600">Histórico de laudos e revisões de calibração.</DialogDescription>

          {sel && (
            <div className="mt-5 space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                {[
                  ['Código', sel.codigo],
                  ['Descrição', sel.descricao],
                  ['Fabricante', sel.fabricante || '—'],
                  ['Setor', sel.setor_localizacao || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <span className="block text-sm font-bold uppercase tracking-wide text-slate-500">{label}</span>
                    <strong className="mt-1 block text-base">{value}</strong>
                  </div>
                ))}
              </div>

              <section className="rounded-xl border border-slate-200 p-4">
                <h2 className="flex items-center gap-2 border-b border-slate-200 pb-3 text-lg font-bold text-[#1e3a8a]"><History size={20} /> Histórico de Laudos e Revisões</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-base">
                    <thead><tr className="border-b border-slate-200 bg-slate-50"><th className="p-2">Revisão</th><th className="p-2">Certificado</th><th className="p-2">Data</th><th className="p-2">Laboratório</th><th className="p-2">Resultado</th></tr></thead>
                    <tbody>
                      {hist.map(item => <tr key={item.id} className="border-b border-slate-100"><td className="p-2 font-bold">{item.revisao}</td><td className="p-2">{item.numero_certificado}</td><td className="p-2">{item.data_calibracao}</td><td className="p-2">{item.laboratorio || '—'}</td><td className="p-2">{item.resultado}</td></tr>)}
                      {hist.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-slate-500">Nenhuma revisão registrada.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-4 flex items-center gap-2"><Save size={20} className="text-[#1e3a8a]" /><h2 className="text-lg font-bold text-[#1e3a8a]">Registrar Nova Calibração</h2></div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <label className="text-base font-semibold">Certificado<input className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base" value={form.cert} onChange={e => setForm(current => ({ ...current, cert: e.target.value }))} /></label>
                  <label className="text-base font-semibold">Data<input type="date" className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base" value={form.data} onChange={e => setForm(current => ({ ...current, data: e.target.value }))} /></label>
                  <label className="text-base font-semibold">Próxima<input type="date" className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base" value={form.proxima} onChange={e => setForm(current => ({ ...current, proxima: e.target.value }))} /></label>
                  <label className="text-base font-semibold">Resultado<select className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base" value={form.resultado} onChange={e => setForm(current => ({ ...current, resultado: e.target.value }))}><option>Aprovado</option><option>Reprovado</option><option>Condicional</option></select></label>
                  <label className="text-base font-semibold md:col-span-2">Laboratório<input className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base" value={form.laboratorio} onChange={e => setForm(current => ({ ...current, laboratorio: e.target.value }))} /></label>
                  <label className="text-base font-semibold md:col-span-2">Observação<textarea className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base" rows={2} value={form.observacao} onChange={e => setForm(current => ({ ...current, observacao: e.target.value }))} /></label>
                </div>
                <div className="mt-5 flex justify-end">
                  <button type="button" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#1e3a8a] px-5 text-base font-bold text-white disabled:opacity-60" onClick={() => void save()} disabled={busy}><Save size={18} /> Gravar calibração</button>
                </div>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}
