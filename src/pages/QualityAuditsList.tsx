/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-31
 * @REVISAO: REV-SGQ-AUDITORIAS-20261031-01 — grade de monitoramento de auditorias e vínculo transacional de RPNCs como constatações
 * @STATUS_APROVACAO: AGUARDA APLICAÇÃO DA MIGRATION 20261031100000_...SQL PELO PROPRIETÁRIO
 */
/**
 * SYSNQRA ERP INDUSTRIAL — Qualidade · QualityAuditsList.
 * Monitoramento de auditorias (código, escopo/norma, período, auditor líder, status)
 * e rastreabilidade das RPNCs geradas como constatações (erp_rpnc.sgq_auditoria_id),
 * com estados explícitos de carregamento, erro, vazio e sucesso.
 */
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { AlertCircle, CheckCircle2, ClipboardCheck, Link2, Plus, RefreshCw, Unlink, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import '../styles/quality-rpnc-form.css'

type EstadoAuditoria = 'Planejada' | 'Em Andamento' | 'Concluída'
type TipoAuditoria = 'Interna' | 'Externa' | 'Fornecedor' | 'Processo' | 'Produto'
type Auditoria = {
  id: string
  codigo_auditoria: string
  escopo: string
  objetivo: string | null
  tipo: TipoAuditoria
  auditor_lider_id: string | null
  auditor_lider_nome: string
  data_inicio: string
  data_fim: string
  status: EstadoAuditoria
  observacoes: string | null
  criado_em: string
}
type Rpnc = {
  id: string
  numero_rpnc: string
  descricao_nao_conformidade: string
  status: string
  sgq_severidade: string | null
  sgq_tipo_registro: string | null
  sgq_data_ocorrencia: string | null
  sgq_auditoria_id: string | null
  criado_em: string
}
type Usuario = { id: string; nome: string }

const ESTADOS: EstadoAuditoria[] = ['Planejada', 'Em Andamento', 'Concluída']
const TIPOS: TipoAuditoria[] = ['Interna', 'Externa', 'Fornecedor', 'Processo', 'Produto']
const SELECT_AUDITORIA = 'id,codigo_auditoria,escopo,objetivo,tipo,auditor_lider_id,auditor_lider_nome,data_inicio,data_fim,status,observacoes,criado_em'
const SELECT_RPNC = 'id,numero_rpnc,descricao_nao_conformidade,status,sgq_severidade,sgq_tipo_registro,sgq_data_ocorrencia,sgq_auditoria_id,criado_em'

const mensagem = (cause: unknown): string =>
  cause instanceof Error ? cause.message : 'Operação não concluída. Consulte os logs do Supabase.'
const dataBR = (valor: string | null | undefined): string => {
  if (!valor) return '—'
  const d = new Date(valor.length === 10 ? `${valor}T12:00:00` : valor)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}
const selloEstado = (estado: string): string =>
  estado === 'Concluída' ? 'bg-emerald-100 text-emerald-800'
    : estado === 'Em Andamento' ? 'bg-sky-100 text-sky-800'
      : 'bg-amber-100 text-amber-800'

/** O filtro `or()` do Supabase usa vírgula e parênteses como sintaxe; o termo de busca é tratado como texto simples. */
const termoSeguro = (valor: string): string => valor.replace(/[(),]/g, ' ').trim()

const formVazio = () => ({
  escopo: '', objetivo: '', tipo: 'Interna' as TipoAuditoria,
  auditor_lider_id: '', auditor_lider_nome: '', data_inicio: new Date().toISOString().slice(0, 10), data_fim: '',
})

export default function QualityAuditsList() {
  const [companyId, setCompanyId] = useState('')
  const [auditorias, setAuditorias] = useState<Auditoria[]>([])
  const [constatacoes, setConstatacoes] = useState<Rpnc[]>([])
  const [disponiveis, setDisponiveis] = useState<Rpnc[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])

  const [form, setForm] = useState(formVazio())
  const [abrirFormulario, setAbrirFormulario] = useState(false)
  const [selecionada, setSelecionada] = useState<Auditoria | null>(null)
  const [buscaConstatacao, setBuscaConstatacao] = useState('')
  const [constatacaoEscolhida, setConstatacaoEscolhida] = useState('')

  const [loading, setLoading] = useState(true)
  const [buscando, setBuscando] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const primeiraRenderizacao = useRef(true)

  const consultarRpnc = useCallback(async (tenantId: string, termo: string) => {
    const limpo = termoSeguro(termo)
    let consulta = supabase.from('erp_rpnc').select(SELECT_RPNC)
      .eq('empresa_id', tenantId).not('sgq_origem', 'is', null).is('sgq_auditoria_id', null)
      .order('criado_em', { ascending: false }).limit(200)
    if (limpo) {
      const padrao = `%${limpo}%`
      consulta = consulta.or(`numero_rpnc.ilike.${padrao},descricao_nao_conformidade.ilike.${padrao}`)
    }
    return consulta
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error) throw auth.error
      if (!auth.data.user) throw new Error('Sessão expirada. Entre novamente para acessar o SGQ.')
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      if (!tenant.data) throw new Error('Empresa da sessão não identificada.')
      const tenantId = String(tenant.data)
      const [auditoriaRes, vinculadaRes, disponivelRes, usuarioRes] = await Promise.all([
        supabase.from('erp_sgq_auditorias').select(SELECT_AUDITORIA).eq('empresa_id', tenantId)
          .order('data_inicio', { ascending: false }).limit(300),
        supabase.from('erp_rpnc').select(SELECT_RPNC).eq('empresa_id', tenantId)
          .not('sgq_origem', 'is', null).not('sgq_auditoria_id', 'is', null)
          .order('criado_em', { ascending: false }).limit(500),
        consultarRpnc(tenantId, ''),
        supabase.from('erp_usuarios').select('id,nome').eq('empresa_id', tenantId)
          .eq('ativo', true).is('deleted_at', null).order('nome'),
      ])
      const falha = auditoriaRes.error ?? vinculadaRes.error ?? disponivelRes.error ?? usuarioRes.error
      if (falha) throw falha
      setCompanyId(tenantId)
      setAuditorias((auditoriaRes.data ?? []) as Auditoria[])
      setConstatacoes((vinculadaRes.data ?? []) as Rpnc[])
      setDisponiveis((disponivelRes.data ?? []) as Rpnc[])
      setUsuarios((usuarioRes.data ?? []) as Usuario[])
      setSelecionada((atual) => ((auditoriaRes.data ?? []) as Auditoria[]).find((a) => a.id === atual?.id) ?? null)
    } catch (cause) {
      setError(mensagem(cause))
    } finally {
      setLoading(false)
    }
  }, [consultarRpnc])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false
      return
    }
    if (!companyId) return
    const temporizador = window.setTimeout(() => {
      setBuscando(true)
      void consultarRpnc(companyId, buscaConstatacao)
        .then((res) => {
          if (res.error) setError(mensagem(res.error))
          else setDisponiveis((res.data ?? []) as Rpnc[])
        })
        .finally(() => setBuscando(false))
    }, 350)
    return () => window.clearTimeout(temporizador)
  }, [buscaConstatacao, companyId, consultarRpnc])

  const constatacoesDe = useCallback((auditoriaId: string) =>
    constatacoes.filter((c) => c.sgq_auditoria_id === auditoriaId), [constatacoes])

  const criar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const liderNome = form.auditor_lider_id
        ? (usuarios.find((u) => u.id === form.auditor_lider_id)?.nome ?? form.auditor_lider_nome)
        : form.auditor_lider_nome.trim()
      if (form.escopo.trim().length < 3) throw new Error('Informe o escopo da auditoria (norma / série ISO / requisito).')
      if (!liderNome) throw new Error('Informe o auditor líder.')
      if (!form.data_inicio) throw new Error('Informe a data de início.')
      const dataFim = form.data_fim || form.data_inicio
      if (dataFim < form.data_inicio) throw new Error('A data de término não pode ser anterior à de início.')
      const insercao = await supabase.from('erp_sgq_auditorias').insert({
        empresa_id: companyId,
        codigo_auditoria: '',
        escopo: form.escopo.trim(),
        objetivo: form.objetivo.trim() || null,
        tipo: form.tipo,
        auditor_lider_id: form.auditor_lider_id || null,
        auditor_lider_nome: liderNome,
        data_inicio: form.data_inicio,
        data_fim: dataFim,
        status: 'Planejada',
      }).select(SELECT_AUDITORIA).single()
      if (insercao.error) throw insercao.error
      const nova = insercao.data as Auditoria
      setAuditorias((atual) => [nova, ...atual])
      setForm(formVazio())
      setAbrirFormulario(false)
      setNotice(`Auditoria ${nova.codigo_auditoria} agendada com código gerado pelo banco.`)
    } catch (cause) {
      setError(mensagem(cause))
    } finally {
      setSaving(false)
    }
  }

  const mudarEstado = async (auditoria: Auditoria, estado: EstadoAuditoria) => {
    if (estado === auditoria.status) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const atualizacao = await supabase.from('erp_sgq_auditorias')
        .update({ status: estado, atualizado_em: new Date().toISOString() })
        .eq('id', auditoria.id).eq('empresa_id', companyId)
        .select(SELECT_AUDITORIA).single()
      if (atualizacao.error) throw atualizacao.error
      const nova = atualizacao.data as Auditoria
      setAuditorias((atual) => atual.map((a) => (a.id === nova.id ? nova : a)))
      setSelecionada((atual) => (atual?.id === nova.id ? nova : atual))
      setNotice(`Auditoria ${nova.codigo_auditoria} · ${estado}.`)
    } catch (cause) {
      setError(mensagem(cause))
    } finally {
      setSaving(false)
    }
  }

  const recarregarVinculo = async () => {
    const [vinculadas, livres] = await Promise.all([
      supabase.from('erp_rpnc').select(SELECT_RPNC).eq('empresa_id', companyId)
        .not('sgq_origem', 'is', null).not('sgq_auditoria_id', 'is', null)
        .order('criado_em', { ascending: false }).limit(500),
      consultarRpnc(companyId, buscaConstatacao),
    ])
    const falha = vinculadas.error ?? livres.error
    if (falha) throw falha
    setConstatacoes((vinculadas.data ?? []) as Rpnc[])
    setDisponiveis((livres.data ?? []) as Rpnc[])
  }

  const vincular = async () => {
    if (!selecionada || !constatacaoEscolhida) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await supabase.rpc('erp_sgq_vincular_rpnc_auditoria', {
        p_rpnc_id: constatacaoEscolhida,
        p_auditoria_id: selecionada.id,
      })
      if (result.error) throw result.error
      const numero = disponiveis.find((c) => c.id === constatacaoEscolhida)?.numero_rpnc ?? ''
      await recarregarVinculo()
      setConstatacaoEscolhida('')
      setNotice(`RPNC ${numero} registrada como constatação de ${selecionada.codigo_auditoria}.`)
    } catch (cause) {
      setError(mensagem(cause))
    } finally {
      setSaving(false)
    }
  }

  const desvincular = async (constatacao: Rpnc) => {
    if (!selecionada) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await supabase.rpc('erp_sgq_vincular_rpnc_auditoria', {
        p_rpnc_id: constatacao.id,
        p_auditoria_id: null,
      })
      if (result.error) throw result.error
      await recarregarVinculo()
      setNotice(`${constatacao.numero_rpnc} desvinculada de ${selecionada.codigo_auditoria}.`)
    } catch (cause) {
      setError(mensagem(cause))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="space-y-3 p-2 text-slate-800">
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <span className="grid h-8 w-8 place-items-center rounded-[2px] bg-[#123B50] text-white"><ClipboardCheck size={16} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#2D8DB8]">SGQ · Auditorias de qualidade</p>
          <h1 className="text-sm font-extrabold text-[#123B50]">Monitoramento de auditorias e constatações</h1>
          <p className="text-[11px] text-slate-500">Programa de auditorias (norma/ISO), período, líder e vínculo transacional das RPNCs geradas.</p>
        </div>
        <button type="button" className="erp-btn" onClick={() => void load()} disabled={loading || saving}><RefreshCw size={13} /> Atualizar</button>
        <button type="button" className="erp-btn-primary" onClick={() => setAbrirFormulario((v) => !v)} disabled={saving}>
          <Plus size={14} /> {abrirFormulario ? 'Fechar agendamento' : 'Agendar auditoria'}
        </button>
      </header>

      {error && <div role="alert" className="flex gap-2 rounded-[2px] border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle size={15} className="mt-0.5 shrink-0" /><span>{error}</span></div>}
      {notice && <div role="status" className="flex gap-2 rounded-[2px] border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><CheckCircle2 size={15} className="mt-0.5 shrink-0" /><span>{notice}</span></div>}

      {abrirFormulario && (
        <form onSubmit={(event) => void criar(event)} className="erp-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
            <h2 className="text-xs font-extrabold">Nova auditoria</h2>
            <span className="text-[10px] text-slate-500">O código é gerado pela trigger do banco (SGQ-AUD-AAAA-NNNNN).</span>
          </div>
          <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="qrf-field">Escopo (norma / série ISO / requisito)
              <input required className="erp-input" placeholder="ex.: ISO 9001:2015 · 8.5.1" value={form.escopo}
                onChange={(e) => setForm({ ...form, escopo: e.target.value })} disabled={saving} />
            </label>
            <label className="qrf-field">Tipo
              <select className="erp-input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoAuditoria })} disabled={saving}>
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="qrf-field">Auditor líder (usuário ERP)
              <select className="erp-input" value={form.auditor_lider_id}
                onChange={(e) => setForm({ ...form, auditor_lider_id: e.target.value, auditor_lider_nome: usuarios.find((u) => u.id === e.target.value)?.nome ?? form.auditor_lider_nome })} disabled={saving}>
                <option value="">Digitar nome</option>
                {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </label>
            <label className="qrf-field">Nome do auditor líder
              <input required className="erp-input" value={form.auditor_lider_nome} onChange={(e) => setForm({ ...form, auditor_lider_nome: e.target.value })} disabled={saving} />
            </label>
            <label className="qrf-field">Data de início
              <input required type="date" className="erp-input" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} disabled={saving} />
            </label>
            <label className="qrf-field">Data de término
              <input type="date" className="erp-input" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} disabled={saving} />
            </label>
            <label className="qrf-field md:col-span-2 xl:col-span-3">Objetivo
              <input className="erp-input" value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} disabled={saving} />
            </label>
          </div>
          <footer className="flex justify-end gap-2 border-t border-slate-100 p-3">
            <button type="button" className="erp-btn" onClick={() => setAbrirFormulario(false)} disabled={saving}><X size={13} /> Cancelar</button>
            <button type="submit" className="erp-btn-primary" disabled={saving || form.escopo.trim().length < 3}>Agendar</button>
          </footer>
        </form>
      )}

      <section className="erp-card overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
          <h2 className="text-xs font-extrabold">Grade de monitoramento</h2>
          <span className="text-[10px] text-slate-500">{loading ? 'carregando…' : `${auditorias.length} auditoria(s) · ${constatacoes.length} constatação(ões) vinculada(s)`}</span>
        </header>

        {loading ? (
          <div className="space-y-2 p-4" role="status" aria-live="polite">
            <p className="text-xs text-slate-500">Consultando o Supabase…</p>
            <div className="h-8 w-full animate-pulse rounded-[2px] bg-slate-100" />
            <div className="h-8 w-full animate-pulse rounded-[2px] bg-slate-50" />
          </div>
        ) : !auditorias.length ? (
          <div className="p-4">
            <p className="text-xs font-bold text-[#123B50]">Nenhuma auditoria agendada para esta empresa.</p>
            <p className="mt-1 text-[11px] text-slate-500">Use “Agendar auditoria” para criar a primeira entrada do programa de auditorias.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="erp-th">Código</th><th className="erp-th">Escopo (norma/ISO)</th><th className="erp-th">Início</th>
                  <th className="erp-th">Término</th><th className="erp-th">Auditor líder</th><th className="erp-th">Status</th><th className="erp-th">Constatações</th>
                </tr>
              </thead>
              <tbody>
                {auditorias.map((a) => {
                  const vinculadas = constatacoesDe(a.id)
                  return (
                    <tr key={a.id} className="erp-tr">
                      <td className="erp-td"><button type="button" className="font-mono font-bold text-[#123B50] underline-offset-2 hover:underline" onClick={() => setSelecionada(a)}>{a.codigo_auditoria}</button></td>
                      <td className="erp-td"><span className="block max-w-md">{a.escopo}</span><span className="text-[10px] text-slate-500">{a.tipo}{a.objetivo ? ` · ${a.objetivo}` : ''}</span></td>
                      <td className="erp-td whitespace-nowrap">{dataBR(a.data_inicio)}</td>
                      <td className="erp-td whitespace-nowrap">{dataBR(a.data_fim)}</td>
                      <td className="erp-td">{a.auditor_lider_nome}</td>
                      <td className="erp-td">
                        <select className="erp-input" value={a.status} disabled={saving} onChange={(e) => void mudarEstado(a, e.target.value as EstadoAuditoria)}>
                          {ESTADOS.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
                        </select>
                        <span className={`mt-1 inline-block rounded-[2px] px-2 py-0.5 text-[10px] font-bold ${selloEstado(a.status)}`}>{a.status}</span>
                      </td>
                      <td className="erp-td">
                        <button type="button" className="erp-btn" onClick={() => setSelecionada(a)} disabled={saving}>
                          <Link2 size={12} /> {vinculadas.length} RPNC(s)
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selecionada && (
        <aside className="qrf-drawer-scrim" onClick={() => setSelecionada(null)} role="presentation" />
      )}
      {selecionada && (
        <aside className="qrf-drawer" role="dialog" aria-modal="true" aria-label={`Constatações da auditoria ${selecionada.codigo_auditoria}`}>
          <header className="flex items-center gap-2 border-b border-slate-200 p-3">
            <ClipboardCheck size={15} className="text-[#2D8DB8]" />
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-extrabold">{selecionada.codigo_auditoria} · {selecionada.escopo}</h2>
              <p className="text-[11px] text-slate-500">{dataBR(selecionada.data_inicio)} → {dataBR(selecionada.data_fim)} · {selecionada.auditor_lider_nome} · {selecionada.status}</p>
            </div>
            <button type="button" className="erp-btn" onClick={() => setSelecionada(null)}><X size={13} /> Fechar</button>
          </header>
          <div className="qrf-drawer-body space-y-3">
            <section className="space-y-2 rounded-[2px] border border-slate-200 p-2.5">
              <p className="erp-label">Vincular RPNC como constatação</p>
              <input className="erp-input w-full" placeholder="buscar protocolo ou descrição da não conformidade" value={buscaConstatacao}
                onChange={(e) => setBuscaConstatacao(e.target.value)} disabled={saving} />
              <select className="erp-input" value={constatacaoEscolhida} disabled={saving || buscando} onChange={(e) => setConstatacaoEscolhida(e.target.value)}>
                <option value="">{buscando ? 'buscando…' : 'Selecionar RPNC sem auditoria'}</option>
                {disponiveis.map((c) => <option key={c.id} value={c.id}>{c.numero_rpnc} · {c.descricao_nao_conformidade.slice(0, 60)}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <button type="button" className="erp-btn-primary" onClick={() => void vincular()} disabled={saving || buscando || !constatacaoEscolhida}>
                  <Link2 size={13} /> Vincular constatação
                </button>
                {!buscando && !disponiveis.length && <span className="text-[10px] text-slate-500">Não há RPNC aberta sem auditoria para o termo informado.</span>}
              </div>
              <p className="text-[10px] text-slate-500">Busca restrita à empresa da sessão (<code>empresa_id</code> + RLS); o vínculo grava <code>erp_rpnc.sgq_auditoria_id</code> pela RPC <code>erp_sgq_vincular_rpnc_auditoria</code>.</p>
            </section>

            <section className="space-y-2">
              <p className="erp-label">Constatações desta auditoria</p>
              {constatacoesDe(selecionada.id).map((c) => (
                <article key={c.id} className="space-y-1 rounded-[2px] border border-slate-200 p-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="font-mono">{c.numero_rpnc}</strong>
                    <span className="rounded-[2px] bg-slate-100 px-2 py-0.5 text-[10px] font-bold">{c.status}</span>
                    <span className="text-[10px] text-slate-500">{c.sgq_severidade ?? '—'} · {dataBR(c.sgq_data_ocorrencia ?? c.criado_em)}</span>
                    <button type="button" className="erp-btn ml-auto" disabled={saving} onClick={() => void desvincular(c)}><Unlink size={12} /> Desvincular</button>
                  </div>
                  <p className="text-[11px]">{c.descricao_nao_conformidade}</p>
                </article>
              ))}
              {!constatacoesDe(selecionada.id).length && <p className="text-xs italic text-slate-500">Nenhuma RPNC vinculada a esta auditoria.</p>}
            </section>
          </div>
        </aside>
      )}
    </main>
  )
}
