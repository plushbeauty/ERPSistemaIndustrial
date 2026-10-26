// Atualizado · Padrão Premium · 26/10/2026 — Previsão de Caixa.
/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 12:18 BRT
 * Desenvolvedor: Homologado por Fernando
 * ID da Revisão: REV-018
 * Alterações: Reconstrução do detalhamento de títulos da previsão de caixa,
 *            fechamento integral do JSX e manutenção da consulta financeira real.
 * Status do Build Local: Não executado — gate remoto em homologação.
 * =========================================================================
 */

import { useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, LockKeyhole, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

// Interface estrita para o caixa industrial - Sem o uso de 'any'
interface FinanceRow {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  status: string;
  tipo: string;
  documento: string | null;
  categoria: string | null;
}

const money = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const horizons = [0, 5, 10, 15, 30, 60, 90]
const isPayable = (tipo: string) => ['despesa', 'pagar', 'pagamento'].includes(String(tipo || '').trim().toLowerCase())
const isSettled = (status: string) => ['pago', 'liquidado', 'baixado', 'cancelado', 'cancelada'].includes(String(status || '').trim().toLowerCase())
const statusClass = (status: string) => {
  const value = String(status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (value.includes('vencid') || value.includes('atras')) return 'cash-status cash-status-danger'
  if (value.includes('pago') || value.includes('liquid') || value.includes('baixad')) return 'cash-status cash-status-success'
  if (value.includes('pend') || value.includes('abert') || value.includes('aguard')) return 'cash-status cash-status-pending'
  return 'cash-status cash-status-neutral'
}

export default function FiscalPrevisaoCaixa() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [days, setDays] = useState(30)
  const [rows, setRows] = useState<FinanceRow[]>([]) // Tipagem estrita aplicada
  const [open, setOpen] = useState<'receber' | 'pagar' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const loadCaixa = async () => {
    setBusy(true)
    setError('')
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) {
        setAllowed(false)
        setRows([])
        return
      }

      const profile = await supabase
        .from('erp_usuarios')
        .select('id, empresa_id, perfil, nivel_admin, is_master, setor_id, ativo, deleted_at, erp_setores(codigo, nome)')
        .eq('auth_user_id', user.id)
        .eq('ativo', true)
        .is('deleted_at', null)
        .maybeSingle()
      if (profile.error) throw profile.error

      const u = profile.data
      const s = Array.isArray(u?.erp_setores) ? u.erp_setores[0] : u?.erp_setores
      const perfil = String(u?.perfil || '').trim().toUpperCase()
      const setorCodigo = String(s?.codigo || '').trim().toUpperCase()
      const setorNome = String(s?.nome || '').trim().toUpperCase()
      const ok = !!u?.ativo && !!u?.empresa_id && (
        !!u?.is_master || ['ADMIN', 'ADMINISTRADOR', 'FINANCEIRO', 'FISCAL', 'DIRETOR'].includes(perfil) ||
        ['ADM', 'ADMIN', 'FINANCEIRO', 'FISCAL'].includes(setorCodigo) || setorNome.includes('FINANCEIRO') || setorNome.includes('FISCAL')
      )

      setAllowed(ok)
      if (!ok) {
        setRows([])
        if (!u?.empresa_id) setError('A sessão não possui empresa selecionada. O financeiro não consulta dados globais sem escopo de empresa.')
        return
      }

      const result = await supabase
        .from('erp_financeiro_lancamentos')
        .select('id, descricao, valor, vencimento, status, tipo, categoria')
        .eq('empresa_id', u.empresa_id)
        .order('vencimento', { ascending: true })
      if (result.error) throw result.error
      setRows((result.data ?? []).map((row): FinanceRow => ({ id: row.id, descricao: row.descricao, valor: Number(row.valor), vencimento: row.vencimento ?? '', status: row.status, tipo: row.tipo, categoria: row.categoria, documento: null })))
    } catch (cause) {
      setRows([])
      setAllowed(false)
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar a previsão de caixa.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void loadCaixa()
  }, [])

  const end = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  }, [days])

  const due = useMemo(() => rows.filter(r => r.vencimento && r.vencimento <= end), [rows, end])

  const receber = useMemo(() => due
    .filter(r => !isPayable(r.tipo) && !isSettled(r.status))
    .reduce((s, r) => s + Number(r.valor || 0), 0), [due])

  const pagar = useMemo(() => due
    .filter(r => isPayable(r.tipo) && !isSettled(r.status))
    .reduce((s, r) => s + Number(r.valor || 0), 0), [due])

  const details = open ? due.filter(row => (open === 'receber' ? !isPayable(row.tipo) : isPayable(row.tipo)) && !isSettled(row.status)) : []

  if (allowed === null) {
    return <main className="cash-page cash-loading"><span className="cash-spinner" aria-hidden="true"/>Validando permissões de acesso financeiro…</main>
  }

  if (!allowed) {
    return (
      <main className="cash-page cash-access-page">
        <section className="cash-access-card">
          <div className="cash-access-icon"><LockKeyhole size={25}/></div>
          <span className="cash-eyebrow">FINANCEIRO · CONTROLE DE ACESSO</span>
          <h1>{error ? 'Falha ao validar ou consultar os dados' : 'Acesso Financeiro Bloqueado'}</h1>
          {error ? <p role="alert" className="cash-access-error">{error}</p> : <p>Esta previsão é exclusiva para os setores administrativo, fiscal e diretores autorizados.</p>}
          <a className="cash-button cash-primary" href="/erp-industrial">Voltar ao ERP</a>
        </section>
        <style>{cashStyles}</style>
      </main>
    )
  }

  return (
    <main className="cash-page">
      <div className="cash-content">
        <header className="cash-hero">
          <div>
            <span>FINANCEIRO · PREVISÃO DE CAIXA</span>
            <h1>Fluxo de Caixa: Receber × Pagar</h1>
            <p>Previsão baseada em títulos reais e no horizonte de vencimento selecionado.</p>
            <small>Atualizado · Padrão Premium · 26/10/2026</small>
          </div>
          <LockKeyhole size={34} aria-label="Acesso restrito ao financeiro"/>
        </header>

        <div className="cash-actions" aria-label="Ações da previsão de caixa">
          <span>Visão consolidada · {rows.length} lançamentos autorizados</span>
          <button type="button" className="cash-button cash-primary" onClick={() => void loadCaixa()} disabled={busy}>
            <RefreshCw size={15} className={busy ? 'animate-spin' : ''}/>{busy ? 'Atualizando…' : 'Atualizar dados'}
          </button>
        </div>
        {error && <div role="alert" className="cash-alert">{error}</div>}

        <section className="cash-summary" aria-label="Valores previstos">
          <button type="button" onClick={() => setOpen(open === 'receber' ? null : 'receber')} aria-pressed={open === 'receber'} className={`cash-summary-card cash-receive${open === 'receber' ? ' selected' : ''}`}>
            <span><ArrowDownToLine size={16}/> Previsão de recebimentos</span>
            <strong>{money(receber)}</strong>
            <small>{due.filter(row => !isPayable(row.tipo) && !isSettled(row.status)).length} títulos em aberto · ver detalhamento</small>
          </button>
          <button type="button" onClick={() => setOpen(open === 'pagar' ? null : 'pagar')} aria-pressed={open === 'pagar'} className={`cash-summary-card cash-pay${open === 'pagar' ? ' selected' : ''}`}>
            <span><ArrowUpFromLine size={16}/> Compromissos a pagar</span>
            <strong>{money(pagar)}</strong>
            <small>{due.filter(row => isPayable(row.tipo) && !isSettled(row.status)).length} títulos em aberto · ver detalhamento</small>
          </button>
        </section>

        <section className="cash-panel cash-horizon">
          <div className="cash-panel-heading">
            <div><h2>Horizonte de vencimento</h2><p>Selecione o período usado para somar os títulos em aberto.</p></div>
            <span className="cash-date-range">Até {new Date(`${end}T00:00:00`).toLocaleDateString('pt-BR')}</span>
          </div>
          <div className="cash-horizon-options" role="group" aria-label="Selecionar horizonte em dias">
            {horizons.map(day => <button type="button" key={day} aria-pressed={days === day} onClick={() => setDays(day)} className={`cash-horizon-option${days === day ? ' active' : ''}`}>{day === 0 ? 'Hoje' : `+${day} dias`}</button>)}
          </div>
          <label className="cash-range-label">Ajustar período
            <input type="range" min={0} max={horizons.length - 1} step={1} value={horizons.indexOf(days)} aria-label="Ajustar horizonte de vencimento" onChange={event => setDays(horizons[Number(event.target.value)])}/>
          </label>
        </section>

        <section className="cash-net-panel" aria-live="polite">
          <div><span>Saldo líquido projetado</span><small>Recebimentos previstos menos compromissos a pagar</small></div>
          <strong className={receber - pagar >= 0 ? 'cash-net-positive' : 'cash-net-negative'}>{money(receber - pagar)}</strong>
        </section>

        {open && (
          <section className="cash-panel">
            <div className="cash-panel-heading">
              <div><h2>{open === 'receber' ? 'Títulos a receber' : 'Títulos a pagar'}</h2><p>Somente lançamentos em aberto até {new Date(`${end}T00:00:00`).toLocaleDateString('pt-BR')}.</p></div>
              <button type="button" className="cash-button cash-secondary" onClick={() => setOpen(null)}>Fechar detalhamento</button>
            </div>
            <div className="cash-table-wrap"><table className="cash-table"><thead><tr><th>Descrição</th><th>Documento</th><th>Vencimento</th><th className="numeric">Valor</th><th>Status</th></tr></thead>
              <tbody>{details.map(row => <tr key={row.id}>
                <td><strong>{row.descricao}</strong></td><td>{row.documento || 'Sem documento'}</td>
                <td>{row.vencimento ? new Date(`${row.vencimento}T00:00:00`).toLocaleDateString('pt-BR') : '—'}</td>
                <td className="numeric">{money(Number(row.valor || 0))}</td><td><span className={statusClass(row.status)}>{row.status}</span></td>
              </tr>)}</tbody>
            </table></div>
            {!details.length && <p className="cash-empty">Nenhum título em aberto localizado para o horizonte selecionado.</p>}
          </section>
        )}
      </div>
      <style>{cashStyles}</style>
    </main>
  )
}

const cashStyles = `
.cash-page{min-height:100vh;background:#f3f6fb;color:#0f172a;font-family:Inter,Segoe UI,Arial,sans-serif}.cash-content{width:min(100%,1500px);margin:0 auto;padding:18px 22px 32px;display:grid;gap:13px}.cash-hero{position:relative;display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:130px;overflow:hidden;padding:20px 26px;border-radius:16px;background:linear-gradient(112deg,#0b2545 0%,#123f72 58%,#1d5fd1 100%);color:#fff;box-shadow:0 10px 24px rgba(11,37,69,.15)}.cash-hero:after{position:absolute;right:9%;top:-115px;width:270px;height:270px;border:1px solid rgba(255,255,255,.14);border-radius:50%;box-shadow:0 0 0 30px rgba(255,255,255,.04),0 0 0 62px rgba(255,255,255,.025);content:"";pointer-events:none}.cash-hero>div,.cash-hero>svg{position:relative;z-index:1}.cash-hero div>span,.cash-eyebrow{color:#bfeef6;font-size:10px;font-weight:800;letter-spacing:.15em}.cash-hero h1{margin:7px 0 5px;color:#fff;font-size:24px;font-weight:800;line-height:1.2;letter-spacing:-.02em}.cash-hero p{margin:0;color:#e1edf9;font-size:12px;line-height:1.5}.cash-hero small{display:inline-flex;margin-top:10px;padding:4px 9px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:rgba(255,255,255,.1);color:#fff;font-size:10px;font-weight:700}.cash-hero>svg{margin-right:20px;color:#dbeafe}.cash-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:54px;padding:9px 12px;border:1px solid #dfe7f1;border-radius:11px;background:#fff;box-shadow:0 2px 7px rgba(15,23,42,.045)}.cash-actions>span{color:#64748b;font-size:11px;font-weight:650}.cash-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:36px;min-height:36px;padding:0 13px;border:1px solid transparent;border-radius:8px;font-size:11px;font-weight:750;line-height:1;white-space:nowrap;text-decoration:none;cursor:pointer;transition:transform .14s,box-shadow .14s}.cash-button:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 3px 8px rgba(15,23,42,.13)}.cash-button:disabled{cursor:not-allowed;opacity:.5}.cash-primary{background:linear-gradient(180deg,#2563eb,#1d4ed8);color:#fff;box-shadow:0 3px 0 #173f91}.cash-secondary{border-color:#cbd5e1;background:linear-gradient(180deg,#fff,#f1f5f9);color:#173452;box-shadow:0 2px 0 #d6dee8}.cash-alert{padding:10px 13px;border:1px solid #fecaca;border-radius:9px;background:#fff1f2;color:#b42318;font-size:11px;font-weight:700}.cash-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.cash-summary-card{display:flex;min-width:0;min-height:115px;flex-direction:column;align-items:flex-start;justify-content:center;gap:7px;padding:15px 17px;border:1px solid #dfe7f1;border-left:4px solid #16a36a;border-radius:12px;background:#fff;text-align:left;box-shadow:0 3px 10px rgba(15,23,42,.045);cursor:pointer;transition:transform .14s,box-shadow .14s,border-color .14s}.cash-summary-card:hover{transform:translateY(-1px);box-shadow:0 6px 15px rgba(15,23,42,.09)}.cash-summary-card.selected{box-shadow:0 0 0 2px #2563eb,0 6px 15px rgba(15,23,42,.09)}.cash-summary-card.cash-pay{border-left-color:#ef4444}.cash-summary-card>span{display:flex;align-items:center;gap:7px;color:#52677f;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}.cash-receive>span svg{color:#16a36a}.cash-pay>span svg{color:#dc2626}.cash-summary-card>strong{color:#102c4e;font-size:23px;font-weight:850;font-variant-numeric:tabular-nums}.cash-summary-card>small{color:#64748b;font-size:10px}.cash-panel{min-width:0;padding:16px;border:1px solid #dfe7f1;border-radius:12px;background:#fff;box-shadow:0 3px 10px rgba(15,23,42,.045)}.cash-panel-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 13px;padding-bottom:11px;border-bottom:1px solid #e7edf5}.cash-panel-heading h2{margin:0;color:#173452;font-size:14px;font-weight:800}.cash-panel-heading p{margin:4px 0 0;color:#64748b;font-size:11px;line-height:1.4}.cash-date-range{padding:5px 9px;border:1px solid #dbeafe;border-radius:7px;background:#eff6ff;color:#1d4ed8;font-size:10px;font-weight:750;white-space:nowrap}.cash-horizon-options{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}.cash-horizon-option{height:36px;min-height:36px;border:1px solid #d6e0eb;border-radius:8px;background:#f8fafc;color:#52677f;font-size:10px;font-weight:750;cursor:pointer}.cash-horizon-option:hover{border-color:#93c5fd;background:#eff6ff;color:#1d4ed8}.cash-horizon-option.active{border-color:#0b2545;background:#0b2545;color:#fff;box-shadow:0 2px 5px rgba(11,37,69,.2)}.cash-range-label{display:grid;gap:7px;margin-top:13px;color:#64748b;font-size:10px;font-weight:750}.cash-range-label input{width:100%;height:8px;accent-color:#2563eb;cursor:pointer}.cash-net-panel{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 17px;border:1px solid #dfe7f1;border-radius:12px;background:#fff;box-shadow:0 3px 10px rgba(15,23,42,.045)}.cash-net-panel>div{display:grid;gap:4px}.cash-net-panel>div>span{color:#475569;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}.cash-net-panel>div>small{color:#64748b;font-size:10px}.cash-net-panel>strong{padding:8px 12px;border:1px solid;border-radius:8px;font-size:19px;font-weight:850;font-variant-numeric:tabular-nums;white-space:nowrap}.cash-net-positive{border-color:#86efac!important;background:#dcfce7;color:#166534}.cash-net-negative{border-color:#fca5a5!important;background:#fee2e2;color:#b91c1c}.cash-table-wrap{overflow:auto}.cash-table{width:100%;min-width:680px;border-collapse:separate;border-spacing:0;text-align:left;font-size:11px}.cash-table th{padding:9px 10px;border-bottom:1px solid #dfe7f1;background:#f1f5f9;color:#475569;font-size:9px;font-weight:800;letter-spacing:.045em;text-transform:uppercase;white-space:nowrap}.cash-table td{padding:9px 10px;border-bottom:1px solid #edf1f6;color:#334155;vertical-align:middle}.cash-table tbody tr:nth-child(even){background:#f8fafc}.cash-table .numeric{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.cash-status{display:inline-flex;align-items:center;min-height:22px;padding:3px 7px;border:1px solid #cbd5e1;border-radius:6px;background:#f1f5f9;color:#475569;font-size:9px;font-weight:800}.cash-status-danger{border-color:#fecaca;background:#fee2e2;color:#b91c1c}.cash-status-success{border-color:#bbf7d0;background:#dcfce7;color:#166534}.cash-status-pending{border-color:#fde68a;background:#fef3c7;color:#92400e}.cash-status-neutral{border-color:#bfdbfe;background:#dbeafe;color:#1d4ed8}.cash-empty{margin:12px 0 0;padding:20px;border:1px dashed #cbd5e1;border-radius:9px;background:#f8fafc;color:#64748b;font-size:11px;text-align:center}.cash-access-page{display:grid;min-height:100vh;place-items:center;padding:20px}.cash-access-card{width:min(100%,420px);padding:26px;border:1px solid #dfe7f1;border-radius:14px;background:#fff;text-align:center;box-shadow:0 12px 30px rgba(15,23,42,.1)}.cash-access-icon{display:grid;width:48px;height:48px;margin:0 auto 14px;place-items:center;border:1px solid #fecaca;border-radius:12px;background:#fff1f2;color:#b91c1c}.cash-access-card h1{margin:9px 0;color:#173452;font-size:19px;font-weight:850}.cash-access-card p{margin:0 0 15px;color:#64748b;font-size:12px;line-height:1.55}.cash-access-card .cash-button{width:100%;margin-top:5px}.cash-access-error{color:#b91c1c!important}.cash-loading{display:flex;min-height:100vh;align-items:center;justify-content:center;gap:10px;color:#52677f;font-size:12px;font-weight:650}.cash-spinner{width:18px;height:18px;border:2px solid #bfdbfe;border-top-color:#1d4ed8;border-radius:50%;animation:cash-spin .7s linear infinite}@keyframes cash-spin{to{transform:rotate(360deg)}}.cash-page :focus-visible{outline:3px solid rgba(34,184,207,.65);outline-offset:2px}@media(max-width:760px){.cash-content{padding:10px 10px 24px}.cash-hero{min-height:0;padding:17px;border-radius:13px}.cash-hero h1{font-size:20px}.cash-hero>svg{width:28px;height:28px;margin:0}.cash-actions{align-items:stretch}.cash-summary{gap:8px}.cash-summary-card{min-height:105px;padding:12px}.cash-summary-card>strong{font-size:19px}.cash-panel{padding:12px}.cash-panel-heading{align-items:flex-start}.cash-horizon-options{grid-template-columns:repeat(4,minmax(0,1fr))}.cash-net-panel{align-items:flex-start;flex-direction:column}.cash-net-panel>strong{align-self:stretch;text-align:center}}@media(max-width:480px){.cash-hero>svg{display:none}.cash-actions{flex-direction:column}.cash-summary{grid-template-columns:minmax(0,1fr)}.cash-panel-heading{flex-direction:column}.cash-date-range{white-space:normal}.cash-horizon-options{grid-template-columns:repeat(2,minmax(0,1fr))}.cash-net-panel>strong{font-size:17px}}@media print{.cash-page{background:#fff}.cash-content{padding:0}.cash-actions,.cash-horizon,.cash-panel-heading>button{display:none}.cash-hero{background:#0b2545!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.cash-panel,.cash-summary-card,.cash-net-panel{box-shadow:none;break-inside:avoid}}
`
