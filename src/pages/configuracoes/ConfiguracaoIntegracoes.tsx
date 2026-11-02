/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
/*
 * REVISÃO TÉCNICA: 16/10/2026
 * Página criada: central de integrações baseada em registros reais de outlook_integracoes, escopo por empresa via erp_current_empresa_id e acesso à configuração detalhada existente.
 * Limites: não cria integrações, não expõe tokens e não simula conexão; criação OAuth depende de VITE_OUTLOOK_OAUTH_URL e do backend já existente.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ExternalLink, Mail, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Integration = {
  id: string
  mailbox: string | null
  microsoft_email: string | null
  status: string
  ativo: boolean
  ultima_sincronizacao: string | null
  ultimo_erro: string | null
}

const button = 'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] border border-[#CFE1E7] bg-white px-2 text-[9px] font-extrabold text-[#123B50] hover:border-[#2D8DB8] disabled:opacity-50'
const stamp = (value: string | null) => value ? new Date(value).toLocaleString('pt-BR') : 'Nunca sincronizada'

export default function ConfiguracaoIntegracoes() {
  const [rows, setRows] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!auth.user) throw new Error('Entre no ERP para consultar as integrações da empresa.')
      const { data: companyId, error: companyError } = await supabase.rpc('erp_current_empresa_id')
      if (companyError) throw companyError
      if (!companyId) throw new Error('Não foi possível identificar a empresa ativa desta sessão.')
      const { data, error: queryError } = await supabase
        .from('outlook_integracoes')
        .select('id,mailbox,microsoft_email,status,ativo,ultima_sincronizacao,ultimo_erro')
        .eq('empresa_id', companyId)
        .order('created_at', { ascending: false })
      if (queryError) throw queryError
      setRows((data ?? []) as Integration[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao consultar integrações.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const toggle = async (row: Integration) => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { data: companyId, error: companyError } = await supabase.rpc('erp_current_empresa_id')
      if (companyError) throw companyError
      if (!companyId) throw new Error('Empresa ativa não identificada.')
      const { error: updateError } = await supabase.from('outlook_integracoes')
        .update({ ativo: !row.ativo, updated_at: new Date().toISOString() })
        .eq('id', row.id)
        .eq('empresa_id', companyId)
      if (updateError) throw updateError
      setMessage(row.ativo ? 'Integração desativada.' : 'Integração ativada.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível alterar a integração.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="space-y-2 text-[#334155]">
    <header className="flex flex-wrap items-center justify-between gap-2 border border-[#CFE1E7] bg-white p-3">
      <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-[2px] bg-[#E2F3F7] text-[#176487]"><Mail size={16}/></span><div><h2 className="text-[11px] font-extrabold uppercase tracking-wide text-[#123B50]">Integrações conectadas</h2><p className="mt-0.5 text-[9px] text-slate-500">Registros reais vinculados à empresa ativa. Segredos não são exibidos nesta tela.</p></div></div>
      <button type="button" className={button} onClick={() => void load()} disabled={loading || busy}><RefreshCw size={12}/> ATUALIZAR</button>
    </header>
    {error && <div role="alert" className="flex items-start gap-2 border border-red-200 bg-red-50 p-2 text-[10px] text-red-800"><AlertTriangle size={14} className="mt-0.5 shrink-0"/>{error}</div>}
    {message && <div role="status" className="border border-emerald-200 bg-emerald-50 p-2 text-[10px] text-emerald-800">{message}</div>}
    {loading ? <div className="border border-[#CFE1E7] bg-white p-4 text-[10px]">Consultando Supabase…</div> :
      rows.length === 0 ? <div className="border border-[#CFE1E7] bg-white p-4"><p className="text-[10px] font-bold text-[#123B50]">Nenhuma integração de e-mail cadastrada para esta empresa.</p><p className="mt-1 text-[9px] text-slate-500">Abra a configuração de Outlook para conferir as opções de conexão disponíveis. A tela não cria registros fictícios.</p></div> :
      <div className="space-y-2">{rows.map(row => <article key={row.id} className="grid gap-2 border border-[#CFE1E7] bg-white p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="break-all text-[10px] text-[#123B50]">{row.microsoft_email || row.mailbox || 'Caixa de e-mail sem identificação'}</strong><span className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[8px] font-extrabold ${row.ativo ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{row.ativo ? <CheckCircle2 size={10}/> : <XCircle size={10}/>} {row.ativo ? 'ATIVA' : 'INATIVA'}</span></div>
          <p className="mt-1 text-[9px] text-slate-500">Estado: {row.status || 'não informado'} · Última sincronização: {stamp(row.ultima_sincronizacao)}</p>
          {row.ultimo_erro && <p className="mt-1 break-words text-[9px] text-red-700">Último erro informado: {row.ultimo_erro}</p>}
        </div>
        <div className="flex flex-wrap gap-1.5"><button type="button" className={button} disabled={busy} onClick={() => void toggle(row)}>{row.ativo ? 'DESATIVAR' : 'ATIVAR'}</button><Link className={button} to="/outlook/configuracao">CONFIGURAR <ExternalLink size={11}/></Link></div>
      </article>)}</div>}
    <div className="flex items-start gap-2 border border-[#CFE1E7] bg-[#F8FCFD] p-2 text-[9px] text-slate-600"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-[#2D8DB8]"/>A consulta usa a empresa retornada pela função de sessão do ERP e filtra os registros por empresa. O banco e as políticas RLS continuam sendo a autoridade final de acesso.</div>
  </section>
}
