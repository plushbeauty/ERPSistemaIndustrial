import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, History, LockKeyhole, Plus, Printer, RefreshCw, Save, ShieldCheck, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog'
import QualitySidebar from '../components/quality/QualitySidebar'

type NumericText = string
type Equipment = {
  id: string
  empresa_id: string
  codigo: string
  descricao: string
  fabricante: string | null
  equipamento: string | null
  modelo: string | null
  numero_serie: string | null
  faixa_medicao: string | null
  resolucao: string | null
  setor: string | null
  responsavel: string | null
  status: string
  proxima_calibracao: string | null
  ultima_calibracao: string | null
  numero_certificado_atual: string | null
  certificado_rbc: boolean
  certificado_validade: string | null
  tolerancia_nominal: number | null
  erro_maximo: number | null
  unidade_medida: string | null
  observacoes: string | null
  classe_exatidao: string | null
  erro_indicacao: number | null
  incerteza_expandida: number | null
  fator_abrangencia: number | null
  temperatura_lab_c: number | null
  umidade_relativa_pct: number | null
  rastreabilidade_padrao: string | null
  identificacao_rbc: string | null
  desvio_historico: string | null
  criterio_aceitacao: string | null
  laboratorio_calibracao: string | null
  intervalo_calibracao_dias: number | null
  criticidade: string | null
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
  certificado_rbc: boolean
  identificacao_rbc: string | null
  classe_exatidao: string | null
  erro_indicacao: number | null
  incerteza_expandida: number | null
  fator_abrangencia: number | null
  temperatura_lab_c: number | null
  umidade_relativa_pct: number | null
  rastreabilidade_padrao: string | null
  desvio_historico: string | null
  criterio_aceitacao: string | null
  created_at: string
}
type EquipmentForm = {
  id: string
  codigo: string
  descricao: string
  fabricante: string
  equipamento: string
  modelo: string
  numero_serie: string
  faixa_medicao: string
  resolucao: string
  setor: string
  responsavel: string
  status: string
  proxima_calibracao: string
  ultima_calibracao: string
  numero_certificado_atual: string
  certificado_rbc: boolean
  certificado_validade: string
  tolerancia_nominal: NumericText
  erro_maximo: NumericText
  unidade_medida: string
  observacoes: string
  classe_exatidao: string
  erro_indicacao: NumericText
  incerteza_expandida: NumericText
  fator_abrangencia: NumericText
  temperatura_lab_c: NumericText
  umidade_relativa_pct: NumericText
  rastreabilidade_padrao: string
  identificacao_rbc: string
  desvio_historico: string
  criterio_aceitacao: string
  laboratorio_calibracao: string
  intervalo_calibracao_dias: NumericText
  criticidade: string
}
type CalibrationForm = {
  numero_certificado: string
  data_calibracao: string
  proxima_calibracao: string
  laboratorio: string
  resultado: string
  observacao: string
  certificado_rbc: boolean
  identificacao_rbc: string
  classe_exatidao: string
  erro_indicacao: NumericText
  incerteza_expandida: NumericText
  fator_abrangencia: NumericText
  temperatura_lab_c: NumericText
  umidade_relativa_pct: NumericText
  rastreabilidade_padrao: string
  desvio_historico: string
  criterio_aceitacao: string
}
const PAGE_SIZE = 25
const equipmentSelect = 'id,empresa_id,codigo,descricao,fabricante,equipamento,modelo,numero_serie,faixa_medicao,resolucao,setor,responsavel,status,proxima_calibracao,ultima_calibracao,numero_certificado_atual,certificado_rbc,certificado_validade,tolerancia_nominal,erro_maximo,unidade_medida,observacoes,classe_exatidao,erro_indicacao,incerteza_expandida,fator_abrangencia,temperatura_lab_c,umidade_relativa_pct,rastreabilidade_padrao,identificacao_rbc,desvio_historico,criterio_aceitacao,laboratorio_calibracao,intervalo_calibracao_dias,criticidade'
const historySelect = 'id,revisao,numero_certificado,data_calibracao,proxima_calibracao,laboratorio,resultado,observacao,certificado_rbc,identificacao_rbc,classe_exatidao,erro_indicacao,incerteza_expandida,fator_abrangencia,temperatura_lab_c,umidade_relativa_pct,rastreabilidade_padrao,desvio_historico,criterio_aceitacao,created_at'
const emptyEquipment: EquipmentForm = {
  id: '', codigo: '', descricao: '', fabricante: '', equipamento: '', modelo: '', numero_serie: '',
  faixa_medicao: '', resolucao: '', setor: '', responsavel: '', status: 'BLOQUEADO',
  proxima_calibracao: '', ultima_calibracao: '', numero_certificado_atual: '', certificado_rbc: false,
  certificado_validade: '', tolerancia_nominal: '', erro_maximo: '', unidade_medida: '',
  observacoes: '', classe_exatidao: '', erro_indicacao: '', incerteza_expandida: '',
  fator_abrangencia: '', temperatura_lab_c: '', umidade_relativa_pct: '', rastreabilidade_padrao: '',
  identificacao_rbc: '', desvio_historico: '', criterio_aceitacao: '', laboratorio_calibracao: '',
  intervalo_calibracao_dias: '', criticidade: 'NORMAL',
}
const emptyCalibration = (): CalibrationForm => ({
  numero_certificado: '', data_calibracao: new Date().toISOString().slice(0, 10), proxima_calibracao: '',
  laboratorio: '', resultado: 'Aprovado', observacao: '', certificado_rbc: false, identificacao_rbc: '',
  classe_exatidao: '', erro_indicacao: '', incerteza_expandida: '', fator_abrangencia: '',
  temperatura_lab_c: '', umidade_relativa_pct: '', rastreabilidade_padrao: '', desvio_historico: '',
  criterio_aceitacao: '',
})
const inputClass = 'h-[30px] min-w-0 w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] font-normal text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]'
const labelClass = 'grid min-w-0 gap-[2px] text-[9px] font-semibold uppercase tracking-[.04em] text-slate-600'
const actionClass = 'inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-2.5 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50'
const lightActionClass = 'inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2.5 text-[10px] font-semibold text-slate-700 disabled:opacity-50'
const asNumber = (value: string): number | null => value.trim() === '' ? null : Number(value)
const isUsable = (item: Equipment) => item.status.toUpperCase() === 'APROVADO' && Boolean(item.proxima_calibracao && item.proxima_calibracao >= new Date().toISOString().slice(0, 10))
const isExpired = (item: Equipment) => Boolean(item.proxima_calibracao && item.proxima_calibracao < new Date().toISOString().slice(0, 10))
const errorText = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback

export default function CalibracaoIndustrial() {
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [selected, setSelected] = useState<Equipment | null>(null)
  const [history, setHistory] = useState<Calibration[]>([])
  const [open, setOpen] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [historyPage, setHistoryPage] = useState(0)
  const [equipmentForm, setEquipmentForm] = useState<EquipmentForm>(emptyEquipment)
  const [calibrationForm, setCalibrationForm] = useState<CalibrationForm>(emptyCalibration)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Empresa da sessão não identificada.')
      const rows = await fetchAllPages<Equipment>((from, to) => supabase.from('erp_equipamentos_medicao')
        .select(equipmentSelect, { count: 'exact' }).eq('empresa_id', company.data).order('codigo').range(from, to))
      setEquipments(rows)
      setPage(0)
    } catch (cause) {
      setError(errorText(cause, 'Não foi possível carregar os instrumentos de medição.'))
      setEquipments([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadHistory = useCallback(async (equipment: Equipment) => {
    setHistory([])
    setHistoryPage(0)
    const rows = await fetchAllPages<Calibration>((from, to) => supabase.from('erp_qualidade_calibracoes_historico')
      .select(historySelect, { count: 'exact' })
      .eq('empresa_id', equipment.empresa_id).eq('equipamento_id', equipment.id)
      .order('revisao', { ascending: false }).range(from, to))
    setHistory(rows)
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    return equipments.filter(item => [item.codigo, item.descricao, item.fabricante, item.equipamento, item.modelo, item.numero_serie, item.setor, item.status, item.numero_certificado_atual].some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(term)))
  }, [equipments, query])
  const blockedCount = useMemo(() => equipments.filter(item => !isUsable(item)).length, [equipments])
  const approvedCount = useMemo(() => equipments.filter(isUsable).length, [equipments])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visibleEquipments = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const visibleHistory = history.slice(historyPage * PAGE_SIZE, (historyPage + 1) * PAGE_SIZE)
  const historyPageCount = Math.max(1, Math.ceil(history.length / PAGE_SIZE))

  useEffect(() => { setPage(current => Math.min(current, pageCount - 1)) }, [pageCount])
  useEffect(() => { setHistoryPage(current => Math.min(current, historyPageCount - 1)) }, [historyPageCount])

  function setEquipmentField<K extends keyof EquipmentForm>(key: K, value: EquipmentForm[K]) {
    setEquipmentForm(current => ({ ...current, [key]: value }))
  }
  function setCalibrationField<K extends keyof CalibrationForm>(key: K, value: CalibrationForm[K]) {
    setCalibrationForm(current => ({ ...current, [key]: value }))
  }

  function editEquipment(item: Equipment) {
    setEquipmentForm({
      id: item.id, codigo: item.codigo, descricao: item.descricao, fabricante: item.fabricante ?? '',
      equipamento: item.equipamento ?? '', modelo: item.modelo ?? '', numero_serie: item.numero_serie ?? '', faixa_medicao: item.faixa_medicao ?? '',
      resolucao: item.resolucao ?? '', setor: item.setor ?? '', responsavel: item.responsavel ?? '', status: item.status,
      proxima_calibracao: item.proxima_calibracao ?? '', ultima_calibracao: item.ultima_calibracao ?? '',
      numero_certificado_atual: item.numero_certificado_atual ?? '', certificado_rbc: item.certificado_rbc,
      certificado_validade: item.certificado_validade ?? '', tolerancia_nominal: item.tolerancia_nominal === null ? '' : String(item.tolerancia_nominal),
      erro_maximo: item.erro_maximo === null ? '' : String(item.erro_maximo), unidade_medida: item.unidade_medida ?? '',
      observacoes: item.observacoes ?? '', classe_exatidao: item.classe_exatidao ?? '',
      erro_indicacao: item.erro_indicacao === null ? '' : String(item.erro_indicacao),
      incerteza_expandida: item.incerteza_expandida === null ? '' : String(item.incerteza_expandida),
      fator_abrangencia: item.fator_abrangencia === null ? '' : String(item.fator_abrangencia),
      temperatura_lab_c: item.temperatura_lab_c === null ? '' : String(item.temperatura_lab_c),
      umidade_relativa_pct: item.umidade_relativa_pct === null ? '' : String(item.umidade_relativa_pct),
      rastreabilidade_padrao: item.rastreabilidade_padrao ?? '', identificacao_rbc: item.identificacao_rbc ?? '',
      desvio_historico: item.desvio_historico ?? '', criterio_aceitacao: item.criterio_aceitacao ?? '',
      laboratorio_calibracao: item.laboratorio_calibracao ?? '',
      intervalo_calibracao_dias: item.intervalo_calibracao_dias === null ? '' : String(item.intervalo_calibracao_dias),
      criticidade: item.criticidade ?? 'NORMAL',
    })
    setShowNew(true)
    setError('')
  }

  async function saveEquipment() {
    setBusy(true); setError(''); setNotice('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Empresa da sessão não identificada.')
      if (!equipmentForm.codigo.trim() || !equipmentForm.descricao.trim()) throw new Error('Código e descrição são obrigatórios.')
      const numericValues = [equipmentForm.tolerancia_nominal, equipmentForm.erro_maximo, equipmentForm.erro_indicacao, equipmentForm.incerteza_expandida, equipmentForm.fator_abrangencia, equipmentForm.temperatura_lab_c, equipmentForm.umidade_relativa_pct, equipmentForm.intervalo_calibracao_dias]
      if (numericValues.some(value => value.trim() !== '' && !Number.isFinite(Number(value)))) throw new Error('Revise os campos numéricos: todos precisam conter valores válidos.')
      if (equipmentForm.fator_abrangencia && Number(equipmentForm.fator_abrangencia) <= 0) throw new Error('O fator de abrangência k deve ser maior que zero.')
      if (equipmentForm.umidade_relativa_pct && (Number(equipmentForm.umidade_relativa_pct) < 0 || Number(equipmentForm.umidade_relativa_pct) > 100)) throw new Error('A umidade relativa deve estar entre 0 e 100%.')
      const payload = {
        empresa_id: company.data, codigo: equipmentForm.codigo.trim(), descricao: equipmentForm.descricao.trim(),
        fabricante: equipmentForm.fabricante.trim() || null, equipamento: equipmentForm.equipamento.trim() || null, modelo: equipmentForm.modelo.trim() || null,
        numero_serie: equipmentForm.numero_serie.trim() || null, faixa_medicao: equipmentForm.faixa_medicao.trim() || null,
        resolucao: equipmentForm.resolucao.trim() || null, setor: equipmentForm.setor.trim() || null,
        responsavel: equipmentForm.responsavel.trim() || null, status: equipmentForm.status,
        proxima_calibracao: equipmentForm.proxima_calibracao || null, ultima_calibracao: equipmentForm.ultima_calibracao || null,
        numero_certificado_atual: equipmentForm.numero_certificado_atual.trim() || null,
        certificado_rbc: equipmentForm.certificado_rbc, certificado_validade: equipmentForm.certificado_validade || null,
        tolerancia_nominal: asNumber(equipmentForm.tolerancia_nominal), erro_maximo: asNumber(equipmentForm.erro_maximo),
        unidade_medida: equipmentForm.unidade_medida.trim() || null, observacoes: equipmentForm.observacoes.trim() || null,
        classe_exatidao: equipmentForm.classe_exatidao.trim() || null,
        erro_indicacao: asNumber(equipmentForm.erro_indicacao), incerteza_expandida: asNumber(equipmentForm.incerteza_expandida),
        fator_abrangencia: asNumber(equipmentForm.fator_abrangencia), temperatura_lab_c: asNumber(equipmentForm.temperatura_lab_c),
        umidade_relativa_pct: asNumber(equipmentForm.umidade_relativa_pct), rastreabilidade_padrao: equipmentForm.rastreabilidade_padrao.trim() || null,
        identificacao_rbc: equipmentForm.identificacao_rbc.trim() || null, desvio_historico: equipmentForm.desvio_historico.trim() || null,
        criterio_aceitacao: equipmentForm.criterio_aceitacao.trim() || null, laboratorio_calibracao: equipmentForm.laboratorio_calibracao.trim() || null,
        intervalo_calibracao_dias: asNumber(equipmentForm.intervalo_calibracao_dias), criticidade: equipmentForm.criticidade,
      }
      const result = equipmentForm.id
        ? await supabase.from('erp_equipamentos_medicao').update(payload).eq('id', equipmentForm.id).eq('empresa_id', company.data).select(equipmentSelect).single()
        : await supabase.from('erp_equipamentos_medicao').insert(payload).select(equipmentSelect).single()
      if (result.error) throw result.error
      setShowNew(false); setEquipmentForm(emptyEquipment); setNotice('Cadastro do instrumento salvo.')
      await load()
    } catch (cause) {
      setError(errorText(cause, 'Não foi possível gravar o instrumento.'))
    } finally { setBusy(false) }
  }

  async function openEquipment(item: Equipment) {
    setSelected(item); setOpen(true); setError(''); setNotice('')
    try { await loadHistory(item) } catch (cause) { setHistory([]); setError(errorText(cause, 'Não foi possível carregar o histórico.')) }
  }

  async function saveCalibration() {
    if (!selected) return
    setBusy(true); setError(''); setNotice('')
    try {
      if (!calibrationForm.numero_certificado.trim()) throw new Error('Informe o número do certificado.')
      if (!calibrationForm.data_calibracao) throw new Error('Informe a data da calibração.')
      if (calibrationForm.proxima_calibracao && calibrationForm.proxima_calibracao < calibrationForm.data_calibracao) throw new Error('A próxima calibração não pode anteceder a data da calibração.')
      const numbers = [calibrationForm.erro_indicacao, calibrationForm.incerteza_expandida, calibrationForm.fator_abrangencia, calibrationForm.temperatura_lab_c, calibrationForm.umidade_relativa_pct]
      if (numbers.some(value => value.trim() !== '' && !Number.isFinite(Number(value)))) throw new Error('Revise os campos numéricos da calibração.')
      if (calibrationForm.fator_abrangencia && Number(calibrationForm.fator_abrangencia) <= 0) throw new Error('O fator de abrangência k deve ser maior que zero.')
      if (calibrationForm.umidade_relativa_pct && (Number(calibrationForm.umidade_relativa_pct) < 0 || Number(calibrationForm.umidade_relativa_pct) > 100)) throw new Error('A umidade relativa deve estar entre 0 e 100%.')
      const result = await supabase.rpc('erp_registrar_calibracao', {
        p_equipamento_id: selected.id, p_numero_certificado: calibrationForm.numero_certificado.trim(),
        p_data_calibracao: calibrationForm.data_calibracao, p_proxima_calibracao: calibrationForm.proxima_calibracao || null,
        p_laboratorio: calibrationForm.laboratorio.trim() || null, p_resultado: calibrationForm.resultado,
        p_observacao: calibrationForm.observacao.trim() || null, p_certificado_rbc: calibrationForm.certificado_rbc,
        p_identificacao_rbc: calibrationForm.identificacao_rbc.trim() || null, p_classe_exatidao: calibrationForm.classe_exatidao.trim() || null,
        p_erro_indicacao: asNumber(calibrationForm.erro_indicacao), p_incerteza_expandida: asNumber(calibrationForm.incerteza_expandida),
        p_fator_abrangencia: asNumber(calibrationForm.fator_abrangencia), p_temperatura_lab_c: asNumber(calibrationForm.temperatura_lab_c),
        p_umidade_relativa_pct: asNumber(calibrationForm.umidade_relativa_pct), p_rastreabilidade_padrao: calibrationForm.rastreabilidade_padrao.trim() || null,
        p_desvio_historico: calibrationForm.desvio_historico.trim() || null, p_criterio_aceitacao: calibrationForm.criterio_aceitacao.trim() || null,
      })
      if (result.error) throw result.error
      setNotice('Calibração registrada no histórico técnico.')
      setCalibrationForm(emptyCalibration())
      await load()
      const fresh = await supabase.from('erp_equipamentos_medicao').select(equipmentSelect).eq('id', selected.id).eq('empresa_id', selected.empresa_id).single()
      if (fresh.error) throw fresh.error
      setSelected(fresh.data as Equipment)
      await loadHistory(fresh.data as Equipment)
    } catch (cause) {
      setError(errorText(cause, 'Não foi possível registrar a calibração.'))
    } finally { setBusy(false) }
  }

  async function blockSelected() {
    if (!selected) return
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await supabase.from('erp_equipamentos_medicao').update({ status: 'BLOQUEADO' }).eq('id', selected.id).eq('empresa_id', selected.empresa_id).select(equipmentSelect).single()
      if (result.error) throw result.error
      setSelected(result.data as Equipment); setNotice('Instrumento bloqueado para uso.')
      await load()
    } catch (cause) { setError(errorText(cause, 'Não foi possível bloquear o instrumento.')) }
    finally { setBusy(false) }
  }

  function exportCsv() {
    const headers = ['Código', 'Descrição', 'Fabricante', 'Número de série', 'Setor', 'Status', 'Faixa', 'Resolução', 'Classe de exatidão', 'Erro de indicação', 'Incerteza expandida', 'Fator k', 'Temperatura laboratório °C', 'Umidade relativa %', 'Rastreabilidade padrão', 'Identificação RBC', 'Certificado atual', 'Próxima calibração', 'Criticidade']
    const lines = filtered.map(item => [item.codigo, item.descricao, item.fabricante, item.numero_serie, item.setor, item.status, item.faixa_medicao, item.resolucao, item.classe_exatidao, item.erro_indicacao, item.incerteza_expandida, item.fator_abrangencia, item.temperatura_lab_c, item.umidade_relativa_pct, item.rastreabilidade_padrao, item.identificacao_rbc, item.numero_certificado_atual, item.proxima_calibracao, item.criticidade])
    const csv = [headers, ...lines].map(row => row.map(value => '"' + String(value ?? '').replace(/"/g, '""') + '"').join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'metrologia-instrumentos.csv'; anchor.click(); URL.revokeObjectURL(url)
  }

  const trend = history.filter(item => item.erro_indicacao !== null).slice(0, 8).reverse()
  const maxError = Math.max(0.000001, ...trend.map(item => Math.abs(Number(item.erro_indicacao ?? 0))))

  const textField = (title: string, value: string, onChange: (value: string) => void, type = 'text', placeholder = '') => (
    <label className={labelClass}>{title}<input type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className={inputClass} /></label>
  )
  const equipmentText = (title: string, key: Exclude<keyof EquipmentForm, 'certificado_rbc'>, type = 'text') => textField(title, equipmentForm[key], value => setEquipmentField(key, value), type)
  const calibrationText = (title: string, key: Exclude<keyof CalibrationForm, 'certificado_rbc'>, type = 'text') => textField(title, calibrationForm[key], value => setCalibrationField(key, value), type)

  return <main className="min-h-screen bg-[#F4FBFD] p-3 text-[#123B50] print:bg-white print:p-0">
    <div className="mx-auto max-w-[1600px] space-y-3">
      <QualitySidebar active="/qualidade/calibracao" />
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#C8E3EE] pb-3">
        <div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#2D8DB8]">ERP INDUSTRIAL · SGQ · METROLOGIA</p><h1 className="text-[15px] font-semibold">Calibração e Equipamentos de Medição</h1><p className="text-[10px] text-slate-500">Cadastro técnico, rastreabilidade, certificados e bloqueio metrológico</p></div>
        <div className="flex flex-wrap gap-1.5 print:hidden">
          <button type="button" onClick={() => { setEquipmentForm(emptyEquipment); setShowNew(true); setError(''); setNotice('') }} className={actionClass}><Plus size={12}/> NOVO INSTRUMENTO</button>
          <button type="button" onClick={() => void load()} disabled={busy || loading} className={lightActionClass}><RefreshCw size={12}/> ATUALIZAR</button>
          <button type="button" onClick={exportCsv} disabled={!filtered.length} className={lightActionClass}><Download size={12}/> EXPORTAR CSV</button>
          <button type="button" onClick={() => window.print()} className={lightActionClass}><Printer size={12}/> IMPRIMIR A4</button>
        </div>
      </header>
      {(error || notice) && <div role={error ? 'alert' : 'status'} className={error ? 'border border-red-300 bg-red-50 p-2 text-[10px] text-red-800' : 'border border-emerald-300 bg-emerald-50 p-2 text-[10px] text-emerald-800'}>{error || notice}</div>}
      <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="border border-[#C8E3EE] bg-white p-2"><p className="text-[9px] uppercase text-slate-500">Instrumentos cadastrados</p><p className="text-[18px] font-semibold">{equipments.length}</p></div>
        <div className="border border-[#C8E3EE] bg-white p-2"><p className="text-[9px] uppercase text-slate-500">Aptos para uso</p><p className="text-[18px] font-semibold text-emerald-700">{approvedCount}</p></div>
        <div className="border border-[#C8E3EE] bg-white p-2"><p className="text-[9px] uppercase text-slate-500">Bloqueados / vencidos</p><p className="text-[18px] font-semibold text-rose-700">{blockedCount}</p></div>
        <div className="border border-[#C8E3EE] bg-white p-2"><p className="text-[9px] uppercase text-slate-500">Históricos no resultado</p><p className="text-[18px] font-semibold">{history.length}</p></div>
      </section>
      <section className="flex flex-wrap items-end gap-2 border border-[#C8E3EE] bg-white p-2 print:hidden">
        <label className={labelClass + ' min-w-[220px] flex-1'}>Pesquisar instrumento<input value={query} onChange={event => { setQuery(event.target.value); setPage(0) }} placeholder="Código, descrição, série, setor, certificado…" className={inputClass}/></label>
        <p className="pb-1 text-[10px] text-slate-500">{filtered.length} resultado(s) · {loading ? 'carregando…' : 'dados do Supabase'}</p>
      </section>
      <section className="overflow-x-auto border border-[#C8E3EE] bg-white">
        <table className="w-full min-w-[1100px] text-left">
          <thead className="bg-[#123B50] text-white"><tr>{['CÓDIGO / TAG','INSTRUMENTO','FAIXA / RESOLUÇÃO','SETOR','CERTIFICADO','PRÓXIMA CALIBRAÇÃO','STATUS','AÇÕES'].map(title => <th key={title} className="px-2 py-2 text-[9px] font-semibold">{title}</th>)}</tr></thead>
          <tbody>{visibleEquipments.map(item => <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
            <td className="px-2 py-2 text-[10px]"><strong>{item.codigo}</strong><p className="text-[9px] text-slate-500">{item.numero_serie || 'sem nº de série'}</p></td>
            <td className="px-2 py-2 text-[10px]">{item.descricao}<p className="text-[9px] text-slate-500">{[item.fabricante, item.modelo || item.equipamento].filter(Boolean).join(' · ') || '—'}</p></td>
            <td className="px-2 py-2 text-[10px]">{item.faixa_medicao || '—'}<p className="text-[9px] text-slate-500">{item.resolucao || '—'} {item.unidade_medida || ''}</p></td>
            <td className="px-2 py-2 text-[10px]">{item.setor || '—'}</td>
            <td className="px-2 py-2 text-[10px]">{item.numero_certificado_atual || '—'}<p className="text-[9px] text-slate-500">{item.certificado_rbc ? 'RBC acreditado' : 'RBC não informado'}</p></td>
            <td className="px-2 py-2 text-[10px]">{item.proxima_calibracao || '—'}</td>
            <td className="px-2 py-2"><span className={'inline-flex border px-1.5 py-0.5 text-[9px] font-semibold ' + (isUsable(item) ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800')}>{isUsable(item) ? 'APTO' : isExpired(item) ? 'VENCIDO / BLOQUEADO' : item.status.toUpperCase()}</span></td>
            <td className="px-2 py-2"><div className="flex gap-1"><button type="button" onClick={() => void openEquipment(item)} className={lightActionClass}><History size={11}/> FICHA</button><button type="button" onClick={() => editEquipment(item)} className={lightActionClass + " erp-edit-button"}>EDITAR</button></div></td>
          </tr>)}
          {!visibleEquipments.length && <tr><td colSpan={8} className="px-3 py-6 text-center text-[10px] text-slate-500">{loading ? 'Carregando registros…' : 'Nenhum instrumento cadastrado para esta empresa.'}</td></tr>}</tbody>
        </table>
        <nav aria-label="Paginação dos instrumentos" className="flex items-center justify-between border-t border-slate-100 p-2 text-[10px]"><span>{filtered.length} registro(s) · página {page + 1}/{pageCount}</span><div className="flex gap-1"><button type="button" disabled={page === 0} onClick={() => setPage(value => Math.max(0, value - 1))} className={lightActionClass}>ANTERIOR</button><button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage(value => Math.min(pageCount - 1, value + 1))} className={lightActionClass}>PRÓXIMA</button></div></nav>
      </section>
      <section className="grid gap-2 border border-[#C8E3EE] bg-white p-3 md:grid-cols-2">
        <div><h2 className="text-[11px] font-semibold">Tendência de erro de indicação</h2><p className="text-[9px] text-slate-500">Últimas calibrações com erro registrado; valores reais do histórico.</p>
          {trend.length ? <div className="mt-3 flex h-[86px] items-end gap-2 border-b border-slate-200 pb-1">{trend.map(item => <div key={item.id} title={item.data_calibracao + ': ' + item.erro_indicacao} className="flex h-full flex-1 flex-col items-center justify-end gap-1"><div className="w-full max-w-10 bg-[#2D8DB8]" style={{ height: Math.max(5, Math.abs(Number(item.erro_indicacao ?? 0)) / maxError * 65) + 'px' }}/><span className="text-[8px] text-slate-500">{item.data_calibracao.slice(5)}</span></div>)}</div> : <p className="mt-3 border border-dashed border-slate-200 p-3 text-[10px] text-slate-500">Sem medições de erro registradas para montar tendência. Nenhum dado foi inventado.</p>}
        </div>
        <div><h2 className="text-[11px] font-semibold">Controles metrológicos</h2><ul className="mt-2 space-y-1 text-[10px] text-slate-600"><li>• Instrumento apto exige status APROVADO e próxima calibração vigente.</li><li>• Registro de calibração mantém revisão e certificado no histórico.</li><li>• RBC, rastreabilidade, incerteza e condições ambientais ficam registrados por revisão.</li><li>• Exportação e impressão usam os registros reais carregados da empresa.</li></ul></div>
      </section>
    </div>

    <Dialog open={showNew} onOpenChange={setShowNew}><DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto rounded-[2px] bg-white p-3">
      <DialogTitle className="text-[14px] font-semibold">{equipmentForm.id ? 'Editar instrumento de medição' : 'Cadastrar instrumento de medição'}</DialogTitle>
      <DialogDescription className="text-[10px] text-slate-500">Campos compactos de 30px · identificação, desempenho e rastreabilidade metrológica.</DialogDescription>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
        {equipmentText('Código / TAG','codigo')}{equipmentText('Descrição','descricao')}{equipmentText('Tipo de instrumento','equipamento')}{equipmentText('Fabricante','fabricante')}{equipmentText('Tipo de instrumento','equipamento')}{equipmentText('Modelo','modelo')}{equipmentText('Número de série','numero_serie')}{equipmentText('Faixa de medição','faixa_medicao')}{equipmentText('Resolução','resolucao')}{equipmentText('Unidade de medida','unidade_medida')}{equipmentText('Setor','setor')}{equipmentText('Responsável','responsavel')}{equipmentText('Classe de exatidão','classe_exatidao')}{equipmentText('Tolerância nominal','tolerancia_nominal','number')}{equipmentText('Erro máximo permitido','erro_maximo','number')}{equipmentText('Erro de indicação','erro_indicacao','number')}{equipmentText('Incerteza expandida (U)','incerteza_expandida','number')}{equipmentText('Fator de abrangência (k)','fator_abrangencia','number')}{equipmentText('Temperatura laboratório (°C)','temperatura_lab_c','number')}{equipmentText('Umidade relativa (%)','umidade_relativa_pct','number')}{equipmentText('Identificação RBC','identificacao_rbc')}{equipmentText('Laboratório calibrador','laboratorio_calibracao')}{equipmentText('Nº certificado atual','numero_certificado_atual')}{equipmentText('Última calibração','ultima_calibracao','date')}{equipmentText('Próxima calibração','proxima_calibracao','date')}{equipmentText('Validade do certificado','certificado_validade','date')}{equipmentText('Intervalo (dias)','intervalo_calibracao_dias','number')}{equipmentText('Criticidade','criticidade')}
        <label className={labelClass}>Certificado de laboratório RBC<input type="checkbox" checked={equipmentForm.certificado_rbc} onChange={event => setEquipmentField('certificado_rbc', event.target.checked)} className="h-[30px] accent-[#2D8DB8]"/></label>
        {equipmentText('Rastreabilidade do padrão','rastreabilidade_padrao')}
        {equipmentText('Critério de aceitação','criterio_aceitacao')}
        {equipmentText('Histórico de desvios','desvio_historico')}
        <label className={labelClass + ' col-span-2 xl:col-span-4'}>Observações<textarea value={equipmentForm.observacoes} onChange={event => setEquipmentField('observacoes', event.target.value)} className="min-h-[60px] rounded-[2px] border border-slate-300 p-2 text-[10px] outline-none focus:border-[#2D8DB8]"/></label>
        <label className={labelClass}>Status<select value={equipmentForm.status} onChange={event => setEquipmentField('status', event.target.value)} className={inputClass}><option value="BLOQUEADO">BLOQUEADO</option><option value="APROVADO">APROVADO</option><option value="ATIVO">ATIVO</option><option value="INATIVO">INATIVO</option></select></label>
      </div>
      <div className="flex justify-end gap-1.5 border-t border-slate-100 pt-2"><button type="button" onClick={() => setShowNew(false)} className={lightActionClass}>CANCELAR</button><button type="button" disabled={busy} onClick={() => void saveEquipment()} className={actionClass}><Save size={12}/> {busy ? 'SALVANDO…' : 'SALVAR INSTRUMENTO'}</button></div>
    </DialogContent></Dialog>

    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[94vh] max-w-7xl overflow-y-auto rounded-[2px] bg-white p-3">
      <div className="flex items-start justify-between gap-2"><div><DialogTitle className="text-[14px] font-semibold">{selected?.codigo} — Ficha de Metrologia</DialogTitle><DialogDescription className="text-[10px] text-slate-500">Histórico de calibrações e condições técnicas por revisão.</DialogDescription></div><button type="button" onClick={() => setOpen(false)} className={lightActionClass}><X size={12}/> ENCERRAR</button></div>
      {selected && <div className="space-y-3">
        {!isUsable(selected) && <div className="border border-rose-300 bg-rose-50 p-2 text-[10px] font-semibold text-rose-800">INSTRUMENTO BLOQUEADO: calibração não aprovada ou vencida. Não utilizar em decisões de qualidade.</div>}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[['Status',selected.status],['Última calibração',selected.ultima_calibracao || '—'],['Próxima calibração',selected.proxima_calibracao || '—'],['Certificado',selected.numero_certificado_atual || '—'],['Classe de exatidão',selected.classe_exatidao || '—'],['Erro de indicação',selected.erro_indicacao ?? '—'],['Incerteza expandida',selected.incerteza_expandida ?? '—'],['Fator k',selected.fator_abrangencia ?? '—'],['Temperatura °C',selected.temperatura_lab_c ?? '—'],['Umidade %',selected.umidade_relativa_pct ?? '—'],['Padrão rastreável',selected.rastreabilidade_padrao || '—'],['Identificação RBC',selected.identificacao_rbc || '—']].map(([title,value])=><div key={title} className="border border-slate-200 bg-slate-50 p-2"><p className="text-[8px] uppercase text-slate-500">{title}</p><p className="text-[10px] font-semibold">{value}</p></div>)}
        </div>
        <section className="overflow-x-auto border border-[#C8E3EE]">
          <div className="border-b border-slate-100 px-2 py-2 text-[11px] font-semibold">Histórico de calibração ({history.length})</div>
          <table className="w-full min-w-[1000px] text-left"><thead className="bg-[#123B50] text-white"><tr>{['REV.','CERTIFICADO','DATA','LABORATÓRIO','RBC','ERRO','INCERTEZA','TEMP. / UR','RESULTADO','PRÓXIMA'].map(title=><th key={title} className="px-2 py-2 text-[9px]">{title}</th>)}</tr></thead><tbody>{visibleHistory.map(item=><tr key={item.id} className="border-b border-slate-100"><td className="px-2 py-2 text-[10px]">{item.revisao}</td><td className="px-2 py-2 text-[10px]">{item.numero_certificado}</td><td className="px-2 py-2 text-[10px]">{item.data_calibracao}</td><td className="px-2 py-2 text-[10px]">{item.laboratorio || '—'}</td><td className="px-2 py-2 text-[10px]">{item.certificado_rbc ? item.identificacao_rbc || 'Sim' : 'Não'}</td><td className="px-2 py-2 text-[10px]">{item.erro_indicacao ?? '—'}</td><td className="px-2 py-2 text-[10px]">{item.incerteza_expandida ?? '—'}</td><td className="px-2 py-2 text-[10px]">{item.temperatura_lab_c ?? '—'} / {item.umidade_relativa_pct ?? '—'}</td><td className="px-2 py-2 text-[10px]">{item.resultado}</td><td className="px-2 py-2 text-[10px]">{item.proxima_calibracao || '—'}</td></tr>)}
            {!visibleHistory.length && <tr><td colSpan={10} className="px-2 py-4 text-center text-[10px] text-slate-500">Nenhuma revisão registrada.</td></tr>}</tbody></table>
          <nav className="flex items-center justify-between border-t border-slate-100 p-2 text-[10px]"><span>Página {historyPage + 1} de {historyPageCount}</span><div className="flex gap-1"><button type="button" disabled={historyPage===0} onClick={()=>setHistoryPage(value=>Math.max(0,value-1))} className={lightActionClass}>ANTERIOR</button><button type="button" disabled={historyPage+1>=historyPageCount} onClick={()=>setHistoryPage(value=>Math.min(historyPageCount-1,value+1))} className={lightActionClass}>PRÓXIMA</button></div></nav>
        </section>
        <section className="border border-[#C8E3EE] p-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="text-[11px] font-semibold">Registrar nova calibração</h2><div className="flex gap-1"><button type="button" onClick={() => void blockSelected()} disabled={busy || selected.status.toUpperCase()==='BLOQUEADO'} className={lightActionClass}><LockKeyhole size={11}/> BLOQUEAR INSTRUMENTO</button><span className="inline-flex items-center gap-1 text-[9px] text-slate-500"><ShieldCheck size={12}/> gravação transacional</span></div></div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-5">
            {calibrationText('Nº certificado *','numero_certificado')}
            {calibrationText('Data calibração *','data_calibracao','date')}
            {calibrationText('Próxima calibração','proxima_calibracao','date')}
            {calibrationText('Laboratório','laboratorio')}
            {calibrationText('Classe de exatidão','classe_exatidao')}
            {calibrationText('Erro de indicação','erro_indicacao','number')}
            {calibrationText('Incerteza expandida (U)','incerteza_expandida','number')}
            {calibrationText('Fator abrangência (k)','fator_abrangencia','number')}
            {calibrationText('Temperatura laboratório °C','temperatura_lab_c','number')}
            {calibrationText('Umidade relativa %','umidade_relativa_pct','number')}
            {calibrationText('Identificação RBC','identificacao_rbc')}
            {calibrationText('Rastreabilidade do padrão','rastreabilidade_padrao')}
            {calibrationText('Critério de aceitação','criterio_aceitacao')}
            <label className={labelClass}>Certificado RBC<input type="checkbox" checked={calibrationForm.certificado_rbc} onChange={event=>setCalibrationField('certificado_rbc',event.target.checked)} className="h-[30px] accent-[#2D8DB8]"/></label>
            <label className={labelClass}>Resultado<select value={calibrationForm.resultado} onChange={event=>setCalibrationField('resultado',event.target.value)} className={inputClass}><option>Aprovado</option><option>Condicional</option><option>Reprovado</option></select></label>
            {calibrationText('Histórico de desvios','desvio_historico')}
            <label className={labelClass + ' col-span-2 xl:col-span-5'}>Observação / evidência<textarea value={calibrationForm.observacao} onChange={event=>setCalibrationField('observacao',event.target.value)} className="min-h-[48px] rounded-[2px] border border-slate-300 p-2 text-[10px] outline-none focus:border-[#2D8DB8]"/></label>
          </div>
          <div className="mt-2 flex justify-end"><button type="button" disabled={busy} onClick={() => void saveCalibration()} className={actionClass}><Save size={12}/>{busy ? ' SALVANDO…' : ' SALVAR CALIBRAÇÃO'}</button></div>
        </section>
        {trend.length > 0 && <section className="border border-[#C8E3EE] p-2"><h3 className="text-[10px] font-semibold">Tendência de erro — instrumento selecionado</h3><div className="mt-2 flex h-[70px] items-end gap-2">{trend.map(item=><div key={item.id} title={item.data_calibracao + ': ' + item.erro_indicacao} className="flex flex-1 flex-col items-center gap-1"><div className="w-full max-w-12 bg-[#2D8DB8]" style={{height: Math.max(4,Math.abs(Number(item.erro_indicacao??0))/maxError*48)+'px'}}/><span className="text-[8px]">{item.data_calibracao.slice(5)}</span></div>)}</div></section>}
      </div>}
    </DialogContent></Dialog>
  </main>
}
