/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO: 2026-11-11
 * @REVISAO: REV-CADASTRO-DECIMAIS-CRUD-TENANT-20261111-01
 * @STATUS: incremento aditivo; contrato oficial de tabela e RPC preservados
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Pencil, Plus, RotateCcw, Save, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Rule = { id: string; codigo: string; descricao: string; casas: number; ativo: boolean }
type DefaultRule = { codigo: string; descricao: string; casas: number }

const defaults: DefaultRule[] = [
  { codigo: 'VOLUME', descricao: 'Cubagem de faturamento e carga', casas: 4 },
  { codigo: 'PESO_LIQ', descricao: 'Peso líquido unitário de artefatos', casas: 4 },
  { codigo: 'PESO_BRUTO', descricao: 'Peso bruto de embalagem e expedição', casas: 3 },
  { codigo: 'MEDIDA_TEC', descricao: 'Dimensões técnicas de peças em milímetros', casas: 2 },
  { codigo: 'QTD_BOM', descricao: 'Consumo de matéria-prima na ficha técnica / MRP', casas: 4 },
  { codigo: 'VALOR_UNIT', descricao: 'Preço unitário de venda e custo industrial', casas: 4 },
]

const inputClass = 'h-10 rounded-lg border border-slate-200 bg-white px-3 text-[12px] text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
const labelClass = 'mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500'
const buttonBase = 'inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'

function exampleFor(rule: Pick<Rule, 'codigo' | 'casas'>) {
  const values: Record<string, { value: number; suffix: string }> = {
    VOLUME: { value: 1.254, suffix: ' m³' },
    PESO_LIQ: { value: 0.0485, suffix: ' kg' },
    PESO_BRUTO: { value: 12.45, suffix: ' kg' },
    MEDIDA_TEC: { value: 90.48, suffix: ' mm' },
    QTD_BOM: { value: 0.125, suffix: ' kg' },
    VALOR_UNIT: { value: 1.458, suffix: '' },
  }
  const sample = values[rule.codigo] ?? { value: 123.456789, suffix: '' }
  const formatted = sample.value.toLocaleString('pt-BR', {
    minimumFractionDigits: rule.casas,
    maximumFractionDigits: rule.casas,
  })
  return rule.codigo === 'VALOR_UNIT' ? `R$ ${formatted}` : formatted + sample.suffix
}

export default function CadastroDecimais() {
  const navigate = useNavigate()
  const [rules, setRules] = useState<Rule[]>([])
  const [empresaId, setEmpresaId] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [codigo, setCodigo] = useState('VOLUME')
  const [descricao, setDescricao] = useState('Cubagem de faturamento e carga')
  const [casas, setCasas] = useState('4')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    const company = await supabase.rpc('erp_current_empresa_id')
    if (company.error || !company.data) {
      setEmpresaId('')
      setRules([])
      setLoading(false)
      setError(company.error?.message ?? 'Empresa de trabalho não identificada.')
      return
    }

    const tenant = String(company.data)
    setEmpresaId(tenant)
    const result = await supabase
      .from('erp_regras_decimais')
      .select('id,codigo,descricao,casas,ativo')
      .eq('empresa_id', tenant)
      .order('codigo')

    if (result.error) {
      setRules([])
      setError(result.error.message)
    } else {
      setRules((result.data ?? []) as Rule[])
    }
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const resetForm = () => {
    setEditingId(null)
    setCodigo('VOLUME')
    setDescricao('Cubagem de faturamento e carga')
    setCasas('4')
    setError('')
    setMessage('')
  }

  const save = async () => {
    setError('')
    setMessage('')
    if (!empresaId) return setError('Empresa de trabalho não identificada.')
    if (!codigo.trim() || !descricao.trim() || !Number.isInteger(Number(casas)) || Number(casas) < 0 || Number(casas) > 8) {
      return setError('Informe código, descrição e uma quantidade inteira de 0 a 8 casas decimais.')
    }

    setSaving(true)
    const result = await supabase.rpc('erp_decimal_salvar_regra', {
      p_codigo: codigo.trim().toUpperCase(),
      p_descricao: descricao.trim(),
      p_casas: Number(casas),
    })
    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    setMessage(editingId ? 'Regra atualizada pela RPC oficial.' : 'Regra gravada pela RPC oficial.')
    resetForm()
    await load()
    setSaving(false)
  }

  const edit = (rule: Rule) => {
    setEditingId(rule.id)
    setCodigo(rule.codigo)
    setDescricao(rule.descricao)
    setCasas(String(rule.casas))
    setError('')
    setMessage('')
  }

  const toggleActive = async (rule: Rule) => {
    if (!empresaId) return setError('Empresa de trabalho não identificada.')
    setError('')
    setMessage('')
    const result = await supabase
      .from('erp_regras_decimais')
      .update({ ativo: !rule.ativo })
      .eq('id', rule.id)
      .eq('empresa_id', empresaId)
      .select('id,ativo')
      .maybeSingle()

    if (result.error || !result.data) {
      setError(result.error?.message ?? 'A regra não foi alterada. Verifique a permissão da empresa.')
      return
    }
    if (editingId === rule.id && !result.data.ativo) resetForm()
    setMessage(result.data.ativo ? `Regra ${rule.codigo} ativada.` : `Regra ${rule.codigo} desativada.`)
    await load()
  }

  const loadDefaults = async () => {
    if (!empresaId) return setError('Empresa de trabalho não identificada.')
    setSaving(true)
    setError('')
    setMessage('')
    let saved = 0

    for (const rule of defaults) {
      const result = await supabase.rpc('erp_decimal_salvar_regra', {
        p_codigo: rule.codigo,
        p_descricao: rule.descricao,
        p_casas: rule.casas,
      })
      if (result.error) {
        setError(`Carga interrompida após ${saved} de 6 padrões. ${rule.codigo}: ${result.error.message}`)
        await load()
        setSaving(false)
        return
      }
      saved += 1
    }

    setMessage('Os seis padrões industriais foram gravados/atualizados para a empresa ativa.')
    await load()
    setSaving(false)
  }

  const activeCount = rules.filter(rule => rule.ativo).length

  return (
    <main className="min-h-full bg-[#F4FBFD] p-3 text-slate-800">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className={buttonBase + ' w-[115px] border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50'}>
            <ArrowLeft size={14} /> Voltar
          </button>
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Controladoria › Cadastro de Decimais</div>
            <h1 className="text-[16px] font-bold tracking-tight text-[#123B50]">CADASTRO DE PRECISÃO DECIMAL — CUBAGEM</h1>
            <p className="mt-1 text-[11px] text-slate-500">Configuração das casas decimais para cubagem, peso, medidas técnicas, ficha técnica e faturamento.</p>
          </div>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[12px] font-bold text-[#123B50]">Formulário de precisão decimal</h2>
              <p className="mt-1 text-[10px] text-slate-500">Gravação por empresa via RPC erp_decimal_salvar_regra.</p>
            </div>
            {editingId && <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-700">Editando regra · salvar reativa se estiver inativa</span>}
          </div>
          <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[180px_minmax(260px,420px)_120px_140px_auto]">
            <div>
              <label className={labelClass}>Código *</label>
              <input className={inputClass + ' w-full'} value={codigo} readOnly={!!editingId} maxLength={40} onChange={e => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))} />
            </div>
            <div>
              <label className={labelClass}>Descrição *</label>
              <input className={inputClass + ' w-full'} value={descricao} maxLength={160} onChange={e => setDescricao(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Casas *</label>
              <input className={inputClass + ' w-full'} type="number" min="0" max="8" step="1" value={casas} onChange={e => setCasas(e.target.value)} />
            </div>
            <button type="button" onClick={() => void save()} disabled={saving || loading || !empresaId} className={buttonBase + ' w-full rounded-lg bg-[#2D8DB8] text-white hover:bg-[#23789F]'}>
              <Save size={14} /> {saving ? 'Gravando...' : 'Gravar'}
            </button>
            {editingId && <button type="button" onClick={resetForm} className={buttonBase + ' border border-slate-200 bg-white text-slate-600'}><X size={14} /> Cancelar</button>}
          </div>
          {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[11px] text-rose-700">{error}</p>}
          {message && <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">{message}</p>}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-[12px] font-bold text-[#123B50]">Regras de Precisão Decimal</h2>
              <p className="mt-1 text-[10px] text-slate-500">{activeCount} ativa(s) · {rules.length - activeCount} inativa(s) · exemplos formatados conforme as casas decimais.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => void loadDefaults()} disabled={saving || loading || !empresaId} className={buttonBase + ' h-9 border border-slate-200 bg-white text-slate-700'}>
                <Plus size={13} /> Carregar padrões industriais
              </button>
              <button type="button" onClick={() => void load()} disabled={loading || saving} className={buttonBase + ' h-9 border border-slate-200 bg-white text-slate-700'}>
                <RotateCcw size={13} /> Atualizar
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-[11px]">
              <thead className="bg-[#123B50] text-white">
                <tr className="h-10">
                  <th className="px-4 text-left font-semibold">Código</th>
                  <th className="px-4 text-left font-semibold">Descrição</th>
                  <th className="w-[90px] px-4 text-right font-semibold">Casas</th>
                  <th className="w-[170px] px-4 text-right font-semibold">Exemplo</th>
                  <th className="w-[110px] px-4 text-center font-semibold">Status</th>
                  <th className="w-[220px] px-4 text-center font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={6} className="h-16 text-center text-slate-500">Carregando regras...</td></tr> :
                  rules.length === 0 ? <tr><td colSpan={6} className="h-20 px-4 text-center text-slate-500">Nenhuma regra cadastrada. Use “Carregar padrões industriais” ou cadastre uma regra acima.</td></tr> :
                  rules.map(rule => (
                    <tr key={rule.id} className="h-12 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 font-bold text-[#123B50]">{rule.codigo}</td>
                      <td className="px-4 text-slate-600">{rule.descricao}</td>
                      <td className="px-4 text-right tabular-nums">{rule.casas}</td>
                      <td className="px-4 text-right font-semibold tabular-nums text-slate-700">{exampleFor(rule)}</td>
                      <td className="px-4 text-center">
                        <span className={rule.ativo ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700' : 'rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500'}>
                          {rule.ativo ? 'ATIVA' : 'INATIVA'}
                        </span>
                      </td>
                      <td className="px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" onClick={() => edit(rule)} disabled={saving || loading} aria-label={`Editar ${rule.codigo}`} className="inline-flex h-8 items-center gap-1 rounded-full border border-slate-200 px-3 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"><Pencil size={12} /> Editar</button>
                          <button type="button" onClick={() => void toggleActive(rule)} disabled={saving || loading} aria-label={`${rule.ativo ? 'Desativar' : 'Ativar'} ${rule.codigo}`} className={rule.ativo ? 'inline-flex h-8 items-center gap-1 rounded-full border border-rose-100 px-3 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50' : 'inline-flex h-8 items-center gap-1 rounded-full border border-emerald-100 px-3 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50'}>
                            {rule.ativo ? <><ToggleLeft size={13} /> Desativar</> : <><ToggleRight size={13} /> Ativar</>}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-[10px] leading-5 text-slate-500">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
          <p>Como usar: selecione uma regra para editar, ajuste descrição ou casas decimais e grave. Ative/desative pela grade. A carga dos seis padrões só ocorre quando o botão for acionado; regras são isoladas pela empresa ativa.</p>
        </div>
      </div>
    </main>
  )
}
