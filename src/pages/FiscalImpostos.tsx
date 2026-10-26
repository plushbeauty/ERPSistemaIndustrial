// Atualizado · Padrão Premium · 26/10/2026 — Regras tributárias por empresa.
import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import FiscalSidebar from '../components/fiscal/FiscalSidebar'
import { supabase } from '../lib/supabaseClient'

type FiscalRule = {
  id: string
  ncm: string | null
  cfop: string | null
  regime_empresa: string | null
  uf_destino: string | null
  icms_aliquota: number
  cst_csosn_icms: string | null
  ipi_aliquota: number
  cst_ipi: string | null
  pis_aliquota: number
  pis_cst: string | null
  cofins_aliquota: number
  cofins_cst: string | null
  ativo: boolean
}

type RuleForm = {
  ncm: string
  cfop: string
  regime_empresa: string
  uf_destino: string
  icms_aliquota: string
  cst_csosn_icms: string
  ipi_aliquota: string
  cst_ipi: string
  pis_aliquota: string
  pis_cst: string
  cofins_aliquota: string
  cofins_cst: string
}

const emptyForm: RuleForm = {
  ncm: '', cfop: '', regime_empresa: '', uf_destino: '',
  icms_aliquota: '', cst_csosn_icms: '', ipi_aliquota: '', cst_ipi: '',
  pis_aliquota: '', pis_cst: '', cofins_aliquota: '', cofins_cst: '',
}

const asForm = (rule: FiscalRule): RuleForm => ({
  ncm: rule.ncm ?? '',
  cfop: rule.cfop ?? '',
  regime_empresa: rule.regime_empresa ?? '',
  uf_destino: rule.uf_destino ?? '',
  icms_aliquota: String(rule.icms_aliquota),
  cst_csosn_icms: rule.cst_csosn_icms ?? '',
  ipi_aliquota: String(rule.ipi_aliquota),
  cst_ipi: rule.cst_ipi ?? '',
  pis_aliquota: String(rule.pis_aliquota),
  pis_cst: rule.pis_cst ?? '',
  cofins_aliquota: String(rule.cofins_aliquota),
  cofins_cst: rule.cofins_cst ?? '',
})

const rulesColumns = 'id,ncm,cfop,regime_empresa,uf_destino,icms_aliquota,cst_csosn_icms,ipi_aliquota,cst_ipi,pis_aliquota,pis_cst,cofins_aliquota,cofins_cst,ativo'

export default function FiscalImpostos() {
  const [rules, setRules] = useState<FiscalRule[]>([])
  const [form, setForm] = useState<RuleForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [regime, setRegime] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error || !auth.data.user) throw new Error('Sessão não localizada.')
      const profile = await supabase.from('erp_usuarios').select('empresa_id,ativo,deleted_at').eq('auth_user_id', auth.data.user.id).maybeSingle()
      if (profile.error) throw profile.error
      if (!profile.data?.ativo || profile.data.deleted_at || !profile.data.empresa_id) throw new Error('Empresa ativa não localizada para a sessão.')
      setEmpresaId(profile.data.empresa_id)
      const [result, config] = await Promise.all([
        supabase.from('erp_regras_fiscais').select(rulesColumns)
          .eq('empresa_id', profile.data.empresa_id).order('ncm').order('cfop').limit(1000),
        supabase.from('erp_config_fiscal').select('regime_tributario').eq('empresa_id', profile.data.empresa_id).maybeSingle(),
      ])
      if (result.error) throw result.error
      if (config.error) throw config.error
      setRules((result.data ?? []) as FiscalRule[])
      setRegime(config.data?.regime_tributario ?? '')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar regras fiscais.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const setValue = <K extends keyof RuleForm>(key: K, value: RuleForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setError('')
    setMessage('')
  }

  const save = async () => {
    if (!empresaId) return setError('Empresa não localizada.')
    if (form.ncm && !/^\d{8}$/.test(form.ncm)) return setError('NCM deve conter oito dígitos ou ficar vazio para regra geral.')
    if (form.cfop && !/^\d{4}$/.test(form.cfop)) return setError('CFOP deve conter quatro dígitos ou ficar vazio para regra geral.')
    if (form.uf_destino && !/^[A-Za-z]{2}$/.test(form.uf_destino)) return setError('UF deve conter duas letras ou ficar vazia para regra geral.')
    const rates = [form.icms_aliquota, form.ipi_aliquota, form.pis_aliquota, form.cofins_aliquota]
    if (rates.some((rate) => rate.trim() === '' || !Number.isFinite(Number(rate)) || Number(rate) < 0 || Number(rate) > 100)) {
      return setError('Informe alíquotas numéricas explícitas entre 0 e 100; não são aplicados valores presumidos.')
    }
    if (![form.cst_csosn_icms, form.cst_ipi, form.pis_cst, form.cofins_cst].every((code) => code.trim())) {
      return setError('Preencha os códigos CST/CSOSN de ICMS, IPI, PIS e COFINS conforme a parametrização validada pela empresa.')
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const payload = {
        empresa_id: empresaId,
        ncm: form.ncm || null,
        cfop: form.cfop || null,
        regime_empresa: form.regime_empresa || null,
        uf_destino: form.uf_destino.toUpperCase() || null,
        icms_aliquota: Number(form.icms_aliquota),
        cst_csosn_icms: form.cst_csosn_icms.trim(),
        ipi_aliquota: Number(form.ipi_aliquota),
        cst_ipi: form.cst_ipi.trim(),
        pis_aliquota: Number(form.pis_aliquota),
        pis_cst: form.pis_cst.trim(),
        cofins_aliquota: Number(form.cofins_aliquota),
        cofins_cst: form.cofins_cst.trim(),
        ativo: true,
        updated_at: new Date().toISOString(),
      }
      const result = editingId
        ? await supabase.from('erp_regras_fiscais').update(payload).eq('id', editingId).eq('empresa_id', empresaId)
        : await supabase.from('erp_regras_fiscais').insert(payload)
      if (result.error) throw result.error
      setForm(emptyForm)
      setEditingId(null)
      setMessage(editingId ? 'Regra atualizada.' : 'Regra criada.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar regra. Verifique sua permissão e a configuração do banco.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (rule: FiscalRule) => {
    if (!empresaId || !window.confirm(`Excluir a regra NCM ${rule.ncm || 'geral'} / CFOP ${rule.cfop || 'geral'}?`)) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await supabase.from('erp_regras_fiscais').delete().eq('id', rule.id).eq('empresa_id', empresaId)
      if (result.error) throw result.error
      setMessage('Regra excluída.')
      if (editingId === rule.id) {
        setEditingId(null)
        setForm(emptyForm)
      }
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao excluir regra.')
    } finally {
      setBusy(false)
    }
  }

  const saveRegime = async () => {
    if (!empresaId || !regime) return setError('Selecione o regime tributário efetivo do emitente.')
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await supabase.from('erp_config_fiscal').update({ regime_tributario: regime, updated_at: new Date().toISOString() })
        .eq('empresa_id', empresaId).select('empresa_id').maybeSingle()
      if (result.error) throw result.error
      if (!result.data) throw new Error('Configuração fiscal não atualizada. Verifique se já existe o cadastro e se seu perfil possui permissão administrativa.')
      setMessage('Regime tributário do emitente atualizado.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao atualizar o regime tributário.')
    } finally {
      setBusy(false)
    }
  }

  const field = (label: string, key: keyof RuleForm, options: { inputMode?: 'numeric' | 'decimal'; maxLength?: number; type?: string } = {}) =>
    <label key={key} className="grid gap-1 text-xs font-medium text-slate-700">{label}
      <input value={form[key]} onChange={(event) => setValue(key, event.target.value)} inputMode={options.inputMode} maxLength={options.maxLength} type={options.type ?? 'text'} className="h-9 rounded-sm border border-slate-300 px-2 text-sm" />
    </label>

  return <main className="erp-dense fiscal-workspace fiscal-tax-page min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white px-5 py-4"><p className="text-xs font-bold uppercase tracking-wide text-blue-800">Fiscal / parametrização</p><h1 className="text-xl font-semibold">Regras tributárias da empresa</h1><p className="mt-1 text-sm text-slate-600">As regras persistidas são a origem dos códigos e alíquotas enviados ao integrador; não são consultoria nem substituem revisão fiscal.</p><small>Atualizado · Padrão Premium · 26/10/2026</small></header>
    <div className="block"><FiscalSidebar/><div className="fiscal-tax-actions"><span>Configuração tributária da empresa ativa</span><button type="button" className="fiscal-tax-button fiscal-tax-secondary" disabled={loading} onClick={() => void load()}><RefreshCw size={14} className={loading?'animate-spin':''}/>{loading?'Atualizando…':'Atualizar regras'}</button></div><section className="min-w-0 flex-1 space-y-4 p-4">
      {error && <div role="alert" className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</div>}
      {message && <div role="status" className="border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{message}</div>}
      <section className="flex flex-wrap items-end gap-3 border border-slate-200 bg-white p-4">
        <label className="grid min-w-64 flex-1 gap-1 text-xs font-medium text-slate-700">Regime tributário do emitente
          <select value={regime} onChange={(event) => setRegime(event.target.value)} className="h-9 rounded-sm border border-slate-300 bg-white px-2 text-sm">
            <option value="">Selecione conforme cadastro fiscal da empresa</option><option value="SIMPLES_NACIONAL">Simples Nacional</option><option value="LUCRO_PRESUMIDO">Lucro Presumido</option><option value="LUCRO_REAL">Lucro Real</option>
          </select>
        </label>
        <button type="button" onClick={() => void saveRegime()} disabled={busy || loading || !regime} className="h-9 rounded-sm border border-blue-800 px-3 text-sm font-semibold text-blue-900 disabled:opacity-50">Salvar regime</button>
        <p className="w-full text-xs text-slate-600">A atualização respeita a RLS administrativa existente em erp_config_fiscal.</p>
      </section>
      <section className="border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">{editingId ? 'Editar regra' : 'Nova regra'}</h2><p className="text-xs text-slate-600">Campo fiscal em branco não será tratado como uma alíquota zero.</p></div><button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); setError(''); setMessage('') }} className="h-8 rounded-sm border border-slate-300 px-3 text-xs">Limpar formulário</button></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {field('NCM (vazio = geral)', 'ncm', { inputMode: 'numeric', maxLength: 8 })}
          {field('CFOP (vazio = geral)', 'cfop', { inputMode: 'numeric', maxLength: 4 })}
          {field('Regime tributário', 'regime_empresa')}
          {field('UF destino (vazio = geral)', 'uf_destino', { maxLength: 2 })}
          {field('ICMS (%)', 'icms_aliquota', { inputMode: 'decimal' })}
          {field('CST/CSOSN ICMS', 'cst_csosn_icms', { maxLength: 4 })}
          {field('IPI (%)', 'ipi_aliquota', { inputMode: 'decimal' })}
          {field('CST IPI', 'cst_ipi', { maxLength: 3 })}
          {field('PIS (%)', 'pis_aliquota', { inputMode: 'decimal' })}
          {field('CST PIS', 'pis_cst', { maxLength: 3 })}
          {field('COFINS (%)', 'cofins_aliquota', { inputMode: 'decimal' })}
          {field('CST COFINS', 'cofins_cst', { maxLength: 3 })}
        </div>
        <div className="mt-3 flex justify-end"><button type="button" onClick={() => void save()} disabled={busy || loading} className="h-9 rounded-sm bg-blue-800 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Criar regra'}</button></div>
      </section>
      <section className="overflow-x-auto border border-slate-200 bg-white">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr><th className="px-3 py-2">NCM / CFOP</th><th className="px-3 py-2">Regime / UF</th><th className="px-3 py-2">ICMS</th><th className="px-3 py-2">IPI</th><th className="px-3 py-2">PIS</th><th className="px-3 py-2">COFINS</th><th className="px-3 py-2">Ações</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-3 py-8 text-center">Carregando regras fiscais…</td></tr>}
            {!loading && rules.map((rule) => <tr key={rule.id} className="border-t border-slate-100">
              <td className="px-3 py-2 font-mono">{rule.ncm || 'geral'} / {rule.cfop || 'geral'}</td><td className="px-3 py-2">{rule.regime_empresa || 'todos'} / {rule.uf_destino || 'todas'}</td>
              <td className="px-3 py-2">{rule.icms_aliquota}% · {rule.cst_csosn_icms || 'sem CST'}</td><td className="px-3 py-2">{rule.ipi_aliquota}% · {rule.cst_ipi || 'sem CST'}</td>
              <td className="px-3 py-2">{rule.pis_aliquota}% · {rule.pis_cst || 'sem CST'}</td><td className="px-3 py-2">{rule.cofins_aliquota}% · {rule.cofins_cst || 'sem CST'}</td>
              <td className="px-3 py-2"><div className="flex gap-2"><button type="button" onClick={() => { setEditingId(rule.id); setForm(asForm(rule)); setError(''); setMessage('') }} className="erp-row-action no-underline">Editar</button><button type="button" disabled={busy} onClick={() => void remove(rule)} className="text-red-700 underline disabled:opacity-50">Excluir</button></div></td>
            </tr>)}
            {!loading && !rules.length && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-600">Nenhuma regra fiscal cadastrada. Nenhuma alíquota será presumida.</td></tr>}
          </tbody>
        </table>
      </section>
    </section></div>
    <style>{`.fiscal-tax-page{padding:16px 20px 30px;background:#f3f6fb}.fiscal-tax-page>header{position:relative;overflow:hidden;margin-bottom:12px;padding:20px 26px;border:0!important;border-radius:16px;background:linear-gradient(112deg,#0b2545 0%,#123f72 58%,#1d5fd1 100%)!important;color:#fff;box-shadow:0 10px 24px rgba(11,37,69,.15)}.fiscal-tax-page>header:after{position:absolute;right:8%;top:-105px;width:260px;height:260px;border:1px solid rgba(255,255,255,.14);border-radius:50%;box-shadow:0 0 0 28px rgba(255,255,255,.04),0 0 0 58px rgba(255,255,255,.025);content:"";pointer-events:none}.fiscal-tax-page>header>*{position:relative;z-index:1}.fiscal-tax-page>header p:first-child{color:#bfeef6!important;font-size:10px!important;font-weight:800!important;letter-spacing:.15em}.fiscal-tax-page>header h1{margin-top:7px;color:#fff!important;font-size:24px!important;font-weight:800!important;line-height:1.2}.fiscal-tax-page>header p:not(:first-child){margin-top:5px;color:#e1edf9!important;font-size:12px!important;line-height:1.5}.fiscal-tax-page>header small{display:inline-flex;margin-top:10px;padding:4px 9px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:rgba(255,255,255,.1);color:#fff;font-size:10px;font-weight:700}.fiscal-tax-page>.block{display:grid;gap:11px}.fiscal-tax-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;border:1px solid #dfe7f1;border-radius:11px;background:#fff;box-shadow:0 2px 7px rgba(15,23,42,.04);color:#64748b;font-size:11px;font-weight:650}.fiscal-tax-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:36px;min-height:36px;padding:0 12px;border:1px solid transparent;border-radius:8px;font-size:10px;font-weight:750;cursor:pointer}.fiscal-tax-button:disabled{opacity:.5;cursor:not-allowed}.fiscal-tax-secondary{border-color:#cbd5e1;background:linear-gradient(180deg,#fff,#f1f5f9);color:#173452;box-shadow:0 2px 0 #d6dee8}.fiscal-tax-page section section{padding:15px;border:1px solid #dfe7f1;border-radius:12px;background:#fff;box-shadow:0 3px 10px rgba(15,23,42,.045)}.fiscal-tax-page section section+section{margin-top:12px}.fiscal-tax-page section label{color:#475569!important;font-size:9px!important;font-weight:800!important;letter-spacing:.04em}.fiscal-tax-page input,.fiscal-tax-page select{height:36px!important;min-height:36px!important;box-sizing:border-box;border:1px solid #cbd5e1!important;border-radius:8px!important;background:#f8fafc!important;padding:0 10px!important;color:#0f172a!important;font-size:11px!important;outline:none}.fiscal-tax-page input:focus,.fiscal-tax-page select:focus{border-color:#2563eb!important;background:#fff!important;box-shadow:0 0 0 3px rgba(37,99,235,.12)}.fiscal-tax-page button:not(.fiscal-module-link){border-radius:8px!important}.fiscal-tax-page table{width:100%;border-collapse:separate;border-spacing:0;text-align:left;font-size:10px}.fiscal-tax-page thead{background:#f1f5f9;color:#475569;font-size:8px;font-weight:800;letter-spacing:.045em;text-transform:uppercase}.fiscal-tax-page th{padding:9px;border-bottom:1px solid #dfe7f1;white-space:nowrap}.fiscal-tax-page td{padding:9px;border-bottom:1px solid #edf1f6;color:#334155;vertical-align:middle}.fiscal-tax-page tbody tr:nth-child(even){background:#f8fafc}.fiscal-tax-page [role=alert]{border-radius:8px!important;font-size:11px!important}.fiscal-tax-page :focus-visible{outline:3px solid rgba(34,184,207,.65);outline-offset:2px}@media(max-width:720px){.fiscal-tax-page{padding:10px}.fiscal-tax-page>header{padding:17px;border-radius:13px}.fiscal-tax-page>header h1{font-size:20px!important}.fiscal-tax-actions{align-items:stretch;flex-direction:column}.fiscal-tax-button{width:100%}.fiscal-tax-page section section{padding:11px}.fiscal-tax-page table{min-width:900px}}`}</style>
  </main>
}
