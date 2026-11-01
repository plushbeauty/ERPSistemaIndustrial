/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-01
 * @REVISAO: REV-ONBOARDING-20261101-01 — aviso de término do teste grátis de 15 dias
 * @STATUS_APROVACAO: MISSÃO DE ONBOARDING AUTORIZADA PELO PROPRIETÁRIO EM 2026-11-01
 *
 * Os dias restantes vêm da RPC erp_empresa_situacao_plano(), calculada com now()
 * do Postgres. O navegador nunca mede o prazo: se medisse, bastaria adiantar o
 * relógio da máquina para ganhar dias de teste.
 */
import { useEffect, useState } from 'react'
import { CalendarClock, X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Situacao = {
  plano_status?: string | null
  plano_codigo?: string | null
  trial_ends_at?: string | null
  dias_restantes?: number | null
  expirado?: boolean | null
}

const CHAVE_AVISO = 'sysnqra_trial_aviso_disposto'

const dataCurta = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR')
}

export default function TrialStatusBanner() {
  const [situacao, setSituacao] = useState<Situacao | null>(null)
  const [dispensado, setDispensado] = useState(() => {
    try {
      return window.sessionStorage.getItem(CHAVE_AVISO) === new Date().toISOString().slice(0, 10)
    } catch {
      return false
    }
  })

  useEffect(() => {
    let ativo = true
    void (async () => {
      const { data: sessao } = await supabase.auth.getUser()
      if (!sessao?.user) return
      const { data: perfil } = await supabase
        .from('erp_usuarios')
        .select('empresa_id,is_master')
        .eq('auth_user_id', sessao.user.id)
        .eq('ativo', true)
        .is('deleted_at', null)
        .maybeSingle<{ empresa_id: string | null; is_master: boolean }>()
      // Master não tem empresa vinculada e não consome teste.
      if (!perfil?.empresa_id || perfil.is_master === true) return
      const { data, error } = await supabase.rpc('erp_empresa_situacao_plano', { p_empresa_id: perfil.empresa_id })
      if (!error && data && ativo) setSituacao(data as Situacao)
    })().catch(() => undefined)
    return () => { ativo = false }
  }, [])

  const status = String(situacao?.plano_status ?? '').toLowerCase()
  const dias = Number(situacao?.dias_restantes ?? 0)
  const expirado = situacao?.expirado === true
  const emTeste = status === 'trial' || status === 'teste'
  const visivel = emTeste && !dispensado && (expirado || dias <= 5)

  if (!visivel) return null

  const contratar = `/cadastro-empresa?modo=pago${situacao?.plano_codigo ? `&plano=${encodeURIComponent(String(situacao.plano_codigo))}` : ''}`
  const urgente = expirado || dias <= 2
  const prazo = dataCurta(situacao?.trial_ends_at)

  return (
    <div
      role="status"
      style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        margin: '0 0 12px', padding: '11px 14px', border: `1px solid ${urgente ? '#F0C9A8' : '#D8E7EE'}`,
        borderLeft: `3px solid ${urgente ? '#C65D00' : '#2D8DB8'}`, borderRadius: 3,
        background: urgente ? '#FFF8F1' : '#F4FAFC', color: '#12333F',
        fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12.5, lineHeight: 1.5,
      }}
    >
      <CalendarClock size={17} style={{ color: urgente ? '#C65D00' : '#2D8DB8', flex: 'none' }} />
      <div style={{ minWidth: 0, flex: '1 1 340px' }}>
        <strong style={{ fontWeight: 900 }}>
          {expirado
            ? `O teste grátis terminou em ${prazo || 'data informada'}.`
            : `Restam ${dias} ${dias === 1 ? 'dia' : 'dias'} do teste grátis (até ${prazo || '—'}).`}
        </strong>{' '}
        <span style={{ color: '#4A6672' }}>
          {expirado
            ? 'Nenhum documento, desenho ou cadastro da empresa é apagado automaticamente: tudo continua salvo e consultável. Contrate um plano para liberar novamente as gravações.'
            : 'Nenhum dado é apagado no fim do prazo. Contrate um plano para manter o ambiente em produção.'}
        </span>
      </div>
      <a href={contratar} style={{ border: 0, borderRadius: 3, padding: '9px 14px', background: urgente ? '#C65D00' : '#1F7FA8', color: '#fff', fontWeight: 900, fontSize: 12, textDecoration: 'none', whiteSpace: 'nowrap' }}>
        {expirado ? 'Contratar agora' : 'Ver planos'}
      </a>
      <a href="/planos" style={{ color: '#1F7FA8', fontWeight: 800, fontSize: 12, textDecoration: 'none', whiteSpace: 'nowrap' }}>Comparar planos</a>
      <button
        type="button"
        aria-label="Dispensar aviso por hoje"
        onClick={() => {
          setDispensado(true)
          try { window.sessionStorage.setItem(CHAVE_AVISO, new Date().toISOString().slice(0, 10)) } catch { /* armazenamento indisponível: o aviso apenas reaparece */ }
        }}
        style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, border: '1px solid #D8E7EE', borderRadius: 3, background: '#fff', color: '#5C7885', cursor: 'pointer', flex: 'none' }}
      >
        <X size={15} />
      </button>
    </div>
  )
}
