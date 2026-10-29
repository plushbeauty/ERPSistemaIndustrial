/**
 * SYSNQRA ERP INDUSTRIAL — Parâmetros gerais do sistema
 * @REVISAO 29/10/2026 · Persistência por empresa via Supabase/RLS.
 * Tokens, senhas e certificados privados nunca são persistidos neste formulário.
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Activity, AlertTriangle, Building2, CheckCircle2, Code2, DatabaseBackup, FileClock, KeyRound, Network, RefreshCw, Save, Settings2, ShieldCheck, UsersRound } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Settings = {
  tolerancia_refugo_percentual: string
  tempo_setup_padrao_min: string
  iot_gateway_url: string
  nfe_ambiente: 'homologacao' | 'producao'
  nfe_serie_padrao: string
  cfop_padrao: string
  icms_aliquota_padrao: string
  ipi_aliquota_padrao: string
  pis_aliquota_padrao: string
  cofins_aliquota_padrao: string
  fuso_horario: string
  idioma: string
}
type Field = { key: keyof Settings; label: string; type?: 'text' | 'number' | 'url'; min?: string; max?: string; step?: string; hint?: string }
const defaults: Settings = {
  tolerancia_refugo_percentual: '2.5', tempo_setup_padrao_min: '30', iot_gateway_url: '',
  nfe_ambiente: 'homologacao', nfe_serie_padrao: '1', cfop_padrao: '',
  icms_aliquota_padrao: '0', ipi_aliquota_padrao: '0', pis_aliquota_padrao: '0',
  cofins_aliquota_padrao: '0', fuso_horario: 'America/Sao_Paulo', idioma: 'pt-BR',
}
const productionFields: Field[] = [
  { key: 'tolerancia_refugo_percentual', label: 'Tolerância padrão de refugo (%)', type: 'number', min: '0', max: '100', step: '0.01' },
  { key: 'tempo_setup_padrao_min', label: 'Tempo padrão de setup (min)', type: 'number', min: '0', max: '1440', step: '1' },
]
const fiscalFields: Field[] = [
  { key: 'nfe_serie_padrao', label: 'Série padrão NF-e', type: 'number', min: '1', max: '999', step: '1' },
  { key: 'cfop_padrao', label: 'CFOP padrão', hint: 'Validar o CFOP conforme operação e orientação fiscal.' },
  { key: 'icms_aliquota_padrao', label: 'ICMS padrão (%)', type: 'number', min: '0', max: '100', step: '0.01' },
  { key: 'ipi_aliquota_padrao', label: 'IPI padrão (%)', type: 'number', min: '0', max: '100', step: '0.01' },
  { key: 'pis_aliquota_padrao', label: 'PIS padrão (%)', type: 'number', min: '0', max: '100', step: '0.01' },
  { key: 'cofins_aliquota_padrao', label: 'COFINS padrão (%)', type: 'number', min: '0', max: '100', step: '0.01' },
]
const destinations = [
  { to: '/pageprincipal/administracao-configuracoes/empresa', label: 'Empresa e identidade', detail: 'Dados cadastrais e identidade corporativa', icon: Building2 },
  { to: '/pageprincipal/administracao-configuracoes/codificacao', label: 'Codificação e áreas', detail: 'Padrões de código, grupos e setores', icon: Code2 },
  { to: '/pageprincipal/administracao-configuracoes/perfis', label: 'Perfis de usuários', detail: 'Perfis e níveis de acesso', icon: UsersRound },
  { to: '/pageprincipal/administracao-configuracoes/permissoes', label: 'Permissões RBAC', detail: 'Permissões por código e perfil', icon: ShieldCheck },
  { to: '/pageprincipal/administracao-configuracoes/usuarios', label: 'Usuários', detail: 'Contas e situação de acesso', icon: KeyRound },
  { to: '/pageprincipal/administracao-configuracoes/seguranca', label: 'Segurança e sessões', detail: 'Autenticação e sessão atual', icon: Activity },
  { to: '/pageprincipal/administracao-configuracoes/logs', label: 'Logs e auditoria', detail: 'Eventos de rastreabilidade', icon: FileClock },
  { to: '/pageprincipal/administracao-configuracoes/backups', label: 'Backups e recuperação', detail: 'Política e evidência de recuperação', icon: DatabaseBackup },
  { to: '/pageprincipal/administracao-configuracoes/integracoes', label: 'Integrações', detail: 'Serviços conectados', icon: Network },
]
const inputClass = 'h-[30px] w-full min-w-0 rounded-[2px] border border-[#C5D8E0] bg-white px-2 text-[11px] text-[#123B50] outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]'
const labelClass = 'mb-1 block text-[9px] font-bold uppercase tracking-wider text-slate-500'

export default function ConfiguracaoSistema() {
  const [settings, setSettings] = useState<Settings>(defaults)
  const [empresaId, setEmpresaId] = useState('')
  const [userId, setUserId] = useState('')
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(''); setMessage('')
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!auth.user) throw new Error('Entre no ERP para consultar os parâmetros administrativos.')
      const { data: tenant, error: tenantError } = await supabase.rpc('erp_current_empresa_id')
      if (tenantError) throw tenantError
      if (typeof tenant !== 'string' || !tenant) throw new Error('Empresa da sessão não identificada.')
      const { data: actor, error: actorError } = await supabase.from('erp_usuarios')
        .select('id,empresa_id,nivel_admin,ativo')
        .eq('auth_user_id', auth.user.id).eq('empresa_id', tenant).maybeSingle()
      if (actorError) throw actorError
      if (!actor || actor.ativo !== true) throw new Error('O usuário autenticado não possui vínculo ERP ativo nesta empresa.')
      setEmpresaId(tenant); setUserId(auth.user.id)
      setCanEdit(Number(actor.nivel_admin ?? 0) >= 9)
      const { data, error: configError } = await supabase.from('erp_configuracoes_sistema')
        .select('*').eq('empresa_id', tenant).maybeSingle()
      if (configError) throw configError
      if (data) {
        const row = data as Record<string, unknown>
        setSettings({
          tolerancia_refugo_percentual: String(row.tolerancia_refugo_percentual ?? defaults.tolerancia_refugo_percentual),
          tempo_setup_padrao_min: String(row.tempo_setup_padrao_min ?? defaults.tempo_setup_padrao_min),
          iot_gateway_url: String(row.iot_gateway_url ?? ''),
          nfe_ambiente: row.nfe_ambiente === 'producao' ? 'producao' : 'homologacao',
          nfe_serie_padrao: String(row.nfe_serie_padrao ?? '1'), cfop_padrao: String(row.cfop_padrao ?? ''),
          icms_aliquota_padrao: String(row.icms_aliquota_padrao ?? '0'), ipi_aliquota_padrao: String(row.ipi_aliquota_padrao ?? '0'),
          pis_aliquota_padrao: String(row.pis_aliquota_padrao ?? '0'), cofins_aliquota_padrao: String(row.cofins_aliquota_padrao ?? '0'),
          fuso_horario: String(row.fuso_horario ?? defaults.fuso_horario), idioma: String(row.idioma ?? defaults.idioma),
        })
      } else setSettings(defaults)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os parâmetros do sistema.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const change = (key: keyof Settings, value: string) => setSettings(current => ({ ...current, [key]: value }))

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setMessage('')
    if (!canEdit) { setError('Somente administrador da empresa pode alterar parâmetros globais.'); return }
    if (!empresaId || !userId) { setError('Sessão ou empresa não identificada.'); return }
    const numeric = [...productionFields, ...fiscalFields].filter(field => field.type === 'number')
    for (const field of numeric) {
      const value = Number(settings[field.key])
      if (!Number.isFinite(value) || (field.min !== undefined && value < Number(field.min)) || (field.max !== undefined && value > Number(field.max))) {
        setError(`Valor inválido para “${field.label}”.`); return
      }
    }
    if (settings.iot_gateway_url.trim()) {
      try { const url = new URL(settings.iot_gateway_url.trim()); if (!['https:', 'http:'].includes(url.protocol)) throw new Error() }
      catch { setError('Informe uma URL HTTP/HTTPS válida para o gateway IoT.'); return }
    }
    setSaving(true)
    try {
      const payload = {
        empresa_id: empresaId, updated_by: userId, updated_at: new Date().toISOString(),
        tolerancia_refugo_percentual: Number(settings.tolerancia_refugo_percentual),
        tempo_setup_padrao_min: Number(settings.tempo_setup_padrao_min),
        iot_gateway_url: settings.iot_gateway_url.trim() || null,
        nfe_ambiente: settings.nfe_ambiente, nfe_serie_padrao: Number(settings.nfe_serie_padrao),
        cfop_padrao: settings.cfop_padrao.trim() || null,
        icms_aliquota_padrao: Number(settings.icms_aliquota_padrao), ipi_aliquota_padrao: Number(settings.ipi_aliquota_padrao),
        pis_aliquota_padrao: Number(settings.pis_aliquota_padrao), cofins_aliquota_padrao: Number(settings.cofins_aliquota_padrao),
        fuso_horario: settings.fuso_horario, idioma: settings.idioma,
      }
      const { error: saveError } = await supabase.from('erp_configuracoes_sistema').upsert(payload, { onConflict: 'empresa_id' })
      if (saveError) throw saveError
      setMessage('Parâmetros gravados no PostgreSQL para esta empresa.')
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar os parâmetros.') }
    finally { setSaving(false) }
  }

  const field = (item: Field) => <label key={item.key} className="block min-w-0">
    <span className={labelClass}>{item.label}</span>
    <input className={inputClass} type={item.type ?? 'text'} min={item.min} max={item.max} step={item.step}
      value={settings[item.key]} onChange={event => change(item.key, event.target.value)} disabled={loading || saving || !canEdit} />
    {item.hint && <small className="mt-1 block text-[9px] text-slate-500">{item.hint}</small>}
  </label>

  return <section className="space-y-3 text-[#334155]" aria-label="Parâmetros do sistema">
    <header className="flex flex-wrap items-center justify-between gap-2 border border-[#CFE1E7] bg-white p-3">
      <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-[2px] bg-[#E2F3F7] text-[#176487]"><Settings2 size={16}/></span><div><h2 className="text-[12px] font-extrabold uppercase tracking-wide text-[#123B50]">Parâmetros gerais do sistema</h2><p className="mt-0.5 text-[10px] text-slate-500">Configuração persistida por empresa; alterações ficam sob RLS e autorização administrativa.</p></div></div>
      <button type="button" onClick={() => void load()} disabled={loading || saving} className="inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-[#C5D8E0] bg-white px-2 text-[10px] font-bold text-[#123B50] disabled:opacity-50"><RefreshCw size={12}/>Atualizar</button>
    </header>
    {error && <div role="alert" className="flex items-start gap-2 border border-red-200 bg-red-50 p-2 text-[10px] text-red-800"><AlertTriangle size={13} className="mt-0.5 shrink-0"/>{error}</div>}
    {message && <div role="status" className="flex items-start gap-2 border border-emerald-200 bg-emerald-50 p-2 text-[10px] text-emerald-800"><CheckCircle2 size={13} className="mt-0.5 shrink-0"/>{message}</div>}
    {loading ? <div className="border border-[#CFE1E7] bg-white p-3 text-[10px]">Validando sessão e carregando parâmetros da empresa…</div> : <>
      <form onSubmit={save} className="space-y-3">
        <div className="border border-[#CFE1E7] bg-white">
          <div className="flex items-center gap-2 border-b border-[#CFE1E7] bg-[#F4FBFD] px-3 py-2"><Activity size={14} className="text-[#2D8DB8]"/><h3 className="text-[10px] font-extrabold uppercase tracking-wide text-[#123B50]">Regras de produção</h3></div>
          <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2">{productionFields.map(field)}</div>
        </div>
        <div className="border border-[#CFE1E7] bg-white">
          <div className="flex items-center gap-2 border-b border-[#CFE1E7] bg-[#F4FBFD] px-3 py-2"><Network size={14} className="text-[#2D8DB8]"/><h3 className="text-[10px] font-extrabold uppercase tracking-wide text-[#123B50]">Integração IoT / telemetria</h3></div>
          <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2"><label className="block min-w-0 md:col-span-2"><span className={labelClass}>URL do gateway IoT</span><input className={inputClass} type="url" value={settings.iot_gateway_url} onChange={event => change('iot_gateway_url', event.target.value)} disabled={loading || saving || !canEdit} placeholder="https://gateway.suaempresa.com/api"/></label></div>
          <p className="px-3 pb-3 text-[9px] text-slate-500">Token e chaves privadas não são exibidos nem gravados no navegador. Configure-os no ambiente seguro do serviço de ingestão/Edge Function.</p>
        </div>
        <div className="border border-[#CFE1E7] bg-white">
          <div className="flex items-center gap-2 border-b border-[#CFE1E7] bg-[#F4FBFD] px-3 py-2"><Building2 size={14} className="text-[#2D8DB8]"/><h3 className="text-[10px] font-extrabold uppercase tracking-wide text-[#123B50]">Parâmetros fiscais — NF-e</h3></div>
          <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2"><label className="block min-w-0"><span className={labelClass}>Ambiente de emissão</span><select className={inputClass} value={settings.nfe_ambiente} onChange={event => change('nfe_ambiente', event.target.value)} disabled={loading || saving || !canEdit}><option value="homologacao">Homologação</option><option value="producao">Produção</option></select></label>{fiscalFields.map(field)}</div>
          <p className="px-3 pb-3 text-[9px] text-amber-700">São valores padrão de configuração. A emissão fiscal real exige certificado digital e validação específica do módulo fiscal.</p>
        </div>
        <div className="border border-[#CFE1E7] bg-white">
          <div className="flex items-center gap-2 border-b border-[#CFE1E7] bg-[#F4FBFD] px-3 py-2"><Settings2 size={14} className="text-[#2D8DB8]"/><h3 className="text-[10px] font-extrabold uppercase tracking-wide text-[#123B50]">Regionalização</h3></div>
          <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2"><label className="block min-w-0"><span className={labelClass}>Fuso horário</span><select className={inputClass} value={settings.fuso_horario} onChange={event => change('fuso_horario', event.target.value)} disabled={loading || saving || !canEdit}><option value="America/Sao_Paulo">America/Sao_Paulo (Brasil)</option><option value="America/Manaus">America/Manaus</option><option value="America/Rio_Branco">America/Rio_Branco</option><option value="UTC">UTC</option></select></label><label className="block min-w-0"><span className={labelClass}>Idioma</span><select className={inputClass} value={settings.idioma} onChange={event => change('idioma', event.target.value)} disabled={loading || saving || !canEdit}><option value="pt-BR">Português (Brasil)</option></select></label></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border border-[#CFE1E7] bg-white p-3"><span className="break-all text-[9px] text-slate-500">Empresa: {empresaId || '—'} · Escopo isolado por tenant</span><button type="submit" disabled={saving || loading || !canEdit} className="inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-extrabold text-white disabled:opacity-50"><Save size={12}/>{saving ? 'Salvando…' : 'Salvar parâmetros'}</button></div>
        {!canEdit && <p className="border border-amber-200 bg-amber-50 p-2 text-[9px] text-amber-800">A sessão atual é somente leitura. Solicite ao administrador da empresa a permissão para editar os parâmetros globais.</p>}
      </form>
    </>}
    <section className="space-y-2"><header className="flex items-center gap-2"><Settings2 size={14} className="text-[#2D8DB8]"/><h3 className="text-[10px] font-extrabold uppercase tracking-wide text-[#123B50]">Outras áreas de configuração</h3></header>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{destinations.map(item => {const Icon = item.icon; return <Link key={item.to} to={item.to} className="flex min-h-[58px] items-center gap-2 border border-[#CFE1E7] bg-white p-2 no-underline hover:border-[#2D8DB8] hover:bg-[#F4FBFD]"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-[2px] bg-[#E2F3F7] text-[#176487]"><Icon size={14}/></span><span className="min-w-0 flex-1"><strong className="block text-[10px] font-extrabold text-[#123B50]">{item.label}</strong><small className="mt-0.5 block text-[9px] text-slate-500">{item.detail}</small></span></Link>})}</div>
    </section>
  </section>
}
