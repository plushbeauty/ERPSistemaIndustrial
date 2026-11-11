import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Save, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Account = { id: string; codigo: string; nome: string; banco: string }
type CostCenter = { id: string; codigo: string; nome: string }
type Config = {
  prefixo: string; proximo_numero: string; serie: string; dias_vencimento: string;
  natureza_padrao: string; layout_pdf: string; conta_padrao_id: string;
  centro_custo_padrao_id: string; regra_conciliacao: string; tolerancia_divergencia: string;
  limite_alcada: string; multa_percentual: string; juros_percentual: string;
  email_auditoria: string; observacoes_padrao: string;
}
const initial: Config = {
  prefixo: 'ND', proximo_numero: '1', serie: '1', dias_vencimento: '30',
  natureza_padrao: 'COBRANCA', layout_pdf: 'PADRAO', conta_padrao_id: '',
  centro_custo_padrao_id: '', regra_conciliacao: 'MANUAL', tolerancia_divergencia: '0',
  limite_alcada: '0', multa_percentual: '0', juros_percentual: '0',
  email_auditoria: '', observacoes_padrao: '',
}
const input = 'h-10 w-full rounded-md border border-[#D3E3EA] bg-white px-3 text-xs text-[#123B50] outline-none focus:border-[#2D8DB8] focus:ring-2 focus:ring-[#2D8DB8]/15'
const label = 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#547080]'
const button = 'inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50'

export default function CustomerDnSettings() {
  const [empresaId,setEmpresaId] = useState('')
  const [empresaNome,setEmpresaNome] = useState('Empresa ativa')
  const [config,setConfig] = useState<Config>(initial)
  const [accounts,setAccounts] = useState<Account[]>([])
  const [centers,setCenters] = useState<CostCenter[]>([])
  const [loading,setLoading] = useState(true)
  const [saving,setSaving] = useState(false)
  const [error,setError] = useState('')
  const [message,setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(''); setMessage('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      if (typeof tenant.data !== 'string' || !tenant.data) throw new Error('Empresa da sessão não identificada.')
      const id = tenant.data
      setEmpresaId(id)
      const [company, saved, bank, cost] = await Promise.all([
        supabase.from('erp_empresas').select('nome_fantasia,razao_social').eq('id',id).maybeSingle(),
        supabase.from('erp_financeiro_notas_debito_config').select('*').eq('empresa_id',id).maybeSingle(),
        supabase.from('erp_contas_bancarias').select('id,codigo,nome,banco').eq('empresa_id',id).eq('ativo',true).order('nome'),
        supabase.from('erp_centros_custos').select('id,codigo,nome').eq('empresa_id',id).eq('ativo',true).order('codigo'),
      ])
      if (company.error) throw company.error
      if (saved.error) throw saved.error
      if (bank.error) throw bank.error
      if (cost.error) throw cost.error
      setEmpresaNome(company.data?.nome_fantasia?.trim() || company.data?.razao_social?.trim() || 'Empresa ativa')
      setAccounts((bank.data ?? []) as Account[])
      setCenters((cost.data ?? []) as CostCenter[])
      if (saved.data) setConfig({
        prefixo:saved.data.prefixo??'ND', proximo_numero:String(saved.data.proximo_numero??1),
        serie:saved.data.serie??'1', dias_vencimento:String(saved.data.dias_vencimento??30),
        natureza_padrao:saved.data.natureza_padrao??'COBRANCA', layout_pdf:saved.data.layout_pdf??'PADRAO',
        conta_padrao_id:saved.data.conta_padrao_id??'', centro_custo_padrao_id:saved.data.centro_custo_padrao_id??'',
        regra_conciliacao:saved.data.regra_conciliacao??'MANUAL',
        tolerancia_divergencia:String(saved.data.tolerancia_divergencia??0), limite_alcada:String(saved.data.limite_alcada??0),
        multa_percentual:String(saved.data.multa_percentual??0), juros_percentual:String(saved.data.juros_percentual??0),
        email_auditoria:saved.data.email_auditoria??'', observacoes_padrao:saved.data.observacoes_padrao??'',
      })
      else setConfig(initial)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao carregar configurações.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])
  const update = (key:keyof Config,value:string) => setConfig(current=>({...current,[key]:value}))

  async function save(event:FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('')
    try {
      if (!empresaId) throw new Error('Empresa da sessão não identificada.')
      if (!config.prefixo.trim() || Number(config.proximo_numero)<1 || Number(config.dias_vencimento)<0) throw new Error('Informe prefixo, próximo número e dias de vencimento válidos.')
      const payload = {
        empresa_id:empresaId, prefixo:config.prefixo.trim(), proximo_numero:Number(config.proximo_numero),
        serie:config.serie.trim()||'1', dias_vencimento:Number(config.dias_vencimento),
        natureza_padrao:config.natureza_padrao, layout_pdf:config.layout_pdf,
        conta_padrao_id:config.conta_padrao_id||null, centro_custo_padrao_id:config.centro_custo_padrao_id||null,
        regra_conciliacao:config.regra_conciliacao, tolerancia_divergencia:Number(config.tolerancia_divergencia||0),
        limite_alcada:Number(config.limite_alcada||0), multa_percentual:Number(config.multa_percentual||0),
        juros_percentual:Number(config.juros_percentual||0), email_auditoria:config.email_auditoria.trim()||null,
        observacoes_padrao:config.observacoes_padrao.trim()||null, updated_at:new Date().toISOString(),
      }
      const result = await supabase.from('erp_financeiro_notas_debito_config').upsert(payload,{onConflict:'empresa_id'}).select('id').single()
      if (result.error) throw result.error
      setMessage('Configurações salvas para a empresa ativa.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao salvar configurações.') }
    finally { setSaving(false) }
  }

  return <main className="min-h-full bg-[#F4FBFD] p-3 text-[#123B50]">
    <div className="mx-auto max-w-[1400px] space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#D3E3EA] bg-white p-3">
        <div><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#2D8DB8]">FINANCEIRO · NOTAS DE DÉBITO</p><h1 className="mt-1 text-base font-bold">Configurações de Notas de Débito</h1><p className="mt-1 text-[10px] text-[#547080]">{empresaNome}</p></div>
        <div className="flex gap-2"><Link to="/pageprincipal/financeiro/notas-debito" className={button+' border border-[#D3E3EA] bg-white text-[#315466]'}><ArrowLeft size={14}/>Voltar para Rotinas</Link><button type="submit" form="dn-config-form" className={button+' bg-[#176487] text-white'} disabled={saving||loading}><Save size={14}/>{saving?'Salvando…':'Salvar Configurações'}</button></div>
      </header>
      {error&&<div role="alert" className="rounded border border-[#D65B61]/30 bg-[#FFF4F4] px-3 py-2 text-xs text-[#A63C3C]">{error}</div>}
      {message&&<div role="status" className="rounded border border-[#3A9D78]/30 bg-[#F0FAF5] px-3 py-2 text-xs text-[#246B50]">{message}</div>}
      {loading?<div className="rounded-lg border border-[#D3E3EA] bg-white p-4 text-xs">Carregando configurações da empresa…</div>:
      <form id="dn-config-form" onSubmit={save} className="rounded-lg border border-[#D3E3EA] bg-white p-3 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label><span className={label}>Prefixo *</span><input required maxLength={12} className={input} value={config.prefixo} onChange={e=>update('prefixo',e.target.value)}/></label>
          <label><span className={label}>Próximo Nº *</span><input required min="1" type="number" className={input} value={config.proximo_numero} onChange={e=>update('proximo_numero',e.target.value)}/></label>
          <label><span className={label}>Série</span><input className={input} value={config.serie} onChange={e=>update('serie',e.target.value)}/></label>
          <label><span className={label}>Dias Venc. *</span><input required min="0" type="number" className={input} value={config.dias_vencimento} onChange={e=>update('dias_vencimento',e.target.value)}/></label>
          <label><span className={label}>Natureza Padrão *</span><select required className={input} value={config.natureza_padrao} onChange={e=>update('natureza_padrao',e.target.value)}><option value="COBRANCA">Cobrança</option><option value="REEMBOLSO">Reembolso</option><option value="AJUSTE">Ajuste</option><option value="OUTROS">Outros</option></select></label>
          <label><span className={label}>Layout PDF *</span><select required className={input} value={config.layout_pdf} onChange={e=>update('layout_pdf',e.target.value)}><option value="PADRAO">Padrão</option><option value="COM_LOGO">Com logotipo</option><option value="DETALHADO">Detalhado</option></select></label>
          <label><span className={label}>Conta Padrão *</span><select required className={input} value={config.conta_padrao_id} onChange={e=>update('conta_padrao_id',e.target.value)}><option value="">Selecione conta da empresa</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.codigo} · {a.nome} — {a.banco}</option>)}</select></label>
          <label><span className={label}>Centro de Custo Padrão *</span><select required className={input} value={config.centro_custo_padrao_id} onChange={e=>update('centro_custo_padrao_id',e.target.value)}><option value="">Selecione centro de custo</option>{centers.map(c=><option key={c.id} value={c.id}>{c.codigo} · {c.nome}</option>)}</select></label>
          <label><span className={label}>Regra Conciliação</span><select className={input} value={config.regra_conciliacao} onChange={e=>update('regra_conciliacao',e.target.value)}><option value="MANUAL">Manual</option><option value="AUTOMATICA_EXATA">Automática por valor exato</option><option value="TOLERANCIA">Automática com tolerância</option></select></label>
          <label><span className={label}>Tolerância Divergência (R$)</span><input type="number" min="0" step="0.01" className={input} value={config.tolerancia_divergencia} onChange={e=>update('tolerancia_divergencia',e.target.value)}/></label>
          <label><span className={label}>Limite Alçada (R$)</span><input type="number" min="0" step="0.01" className={input} value={config.limite_alcada} onChange={e=>update('limite_alcada',e.target.value)}/></label>
          <label><span className={label}>Multa (%)</span><input type="number" min="0" step="0.0001" className={input} value={config.multa_percentual} onChange={e=>update('multa_percentual',e.target.value)}/></label>
          <label><span className={label}>Juros (%)</span><input type="number" min="0" step="0.0001" className={input} value={config.juros_percentual} onChange={e=>update('juros_percentual',e.target.value)}/></label>
          <label className="sm:col-span-2"><span className={label}>E-mail Auditoria</span><input type="email" className={input} value={config.email_auditoria} onChange={e=>update('email_auditoria',e.target.value)}/></label>
          <label className="sm:col-span-2 xl:col-span-4"><span className={label}>Observações Padrão</span><textarea rows={3} className={input+' h-auto min-h-[90px] py-2'} value={config.observacoes_padrao} onChange={e=>update('observacoes_padrao',e.target.value)}/></label>
        </div>
        <div className="mt-3 flex justify-end border-t border-[#E6EEF2] pt-3"><button type="submit" className={button+' bg-[#176487] text-white'} disabled={saving}><Save size={14}/>{saving?'Salvando…':'Salvar Configurações'}</button></div>
      </form>}
      <p className="text-[10px] text-[#66808D]">As configurações são isoladas por empresa. Contas e centros de custo exibidos são consultados no cadastro real da empresa ativa.</p>
    </div>
  </main>
}
