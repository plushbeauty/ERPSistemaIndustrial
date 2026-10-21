import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, CircleCheck, CirclePause, Factory, Gauge, RefreshCw, Search } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

/**
 * SYNQRA — Programação de Produção (Gantt) · tema claro premium
 * Revisão 2026-10-20 — rota dedicada com consultas reais filtradas por empresa_id.
 * Escopo: nova tela PCP; não alterar telas PCP aprovadas nem a lógica dos outros módulos.
 */
/* SYNQRA — Programação de Produção (Gantt) · tema claro premium
   Lê dados reais: erp_maquinas, erp_pcp_programacoes, erp_ordens_producao, erp_produtos (filtrados pela empresa da sessão). */

type Machine = { id: string; codigo: string; nome: string; status: string | null }
type Program = { id: string; ordem_producao_id: string | null; maquina_id: string | null; produto_id: string | null; inicio_planejado: string; fim_planejado: string; quantidade_planejada: number; quantidade_produzida: number | null; status: string }
type Order = { id: string; numero_op: string; produto_id: string | null; data_prevista: string | null }
type Product = { id: string; codigo: string; nome: string }

const HOUR_W = 22
const DAYS = 5
const DAY_MS = 86400000

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const norm = (s: string | null | undefined) => (s ?? '').toUpperCase()

type Tone = 'ok' | 'run' | 'stop' | 'late'
const toneOf = (p: Program, order?: Order): Tone => {
  const s = norm(p.status)
  if (s.includes('PARAD') || s.includes('PAUS')) return 'stop'
  const end = new Date(p.fim_planejado).getTime()
  const done = s.includes('CONCL') || s.includes('FINAL')
  if (!done && (end < Date.now() || (order?.data_prevista && new Date(order.data_prevista).getTime() < end))) return 'late'
  if (s.includes('PRODU') || s.includes('ANDAM') || s.includes('INICI')) return 'run'
  return 'ok'
}
const machineTone = (m: Machine, rows: Program[], orders: Map<string, Order>): Tone => {
  const s = norm(m.status)
  if (s.includes('PARAD') || s.includes('MANUT')) return 'stop'
  if (rows.some(r => toneOf(r, r.ordem_producao_id ? orders.get(r.ordem_producao_id) : undefined) === 'late')) return 'late'
  return rows.some(r => toneOf(r) === 'run') ? 'run' : 'ok'
}
const toneLabel: Record<Tone, string> = { ok: 'Programada', run: 'Em produção', stop: 'Parada', late: 'Atrasada' }

export default function PCPProgramacaoGantt() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [from, setFrom] = useState(() => startOfDay(new Date(Date.now() - DAY_MS)))
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => new Date())
  const scroller = useRef<HTMLDivElement>(null)

  async function load() {
    setBusy(true); setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || typeof tenant.data !== 'string') throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const e = tenant.data
      const to = new Date(from.getTime() + DAYS * DAY_MS).toISOString()
      const [m, p, o, pr] = await Promise.all([
        supabase.from('erp_maquinas').select('id,codigo,nome,status').eq('empresa_id', e).order('codigo'),
        supabase.from('erp_pcp_programacoes').select('id,ordem_producao_id,maquina_id,produto_id,inicio_planejado,fim_planejado,quantidade_planejada,quantidade_produzida,status').eq('empresa_id', e).lt('inicio_planejado', to).gt('fim_planejado', from.toISOString()),
        supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,data_prevista').eq('empresa_id', e),
        supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', e),
      ])
      const err = m.error || p.error || o.error || pr.error
      if (err) throw err
      setMachines((m.data ?? []) as Machine[]); setPrograms((p.data ?? []) as Program[]); setOrders((o.data ?? []) as Order[]); setProducts((pr.data ?? []) as Product[])
    } catch (x) { setError(x instanceof Error ? x.message : 'Falha ao carregar a programação.') }
    finally { setBusy(false) }
  }
  useEffect(() => { void load() }, [from]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t) }, [])
  useEffect(() => { // centraliza no "agora"
    const el = scroller.current; if (!el) return
    const x = ((Date.now() - from.getTime()) / 3600000) * HOUR_W
    el.scrollLeft = Math.max(0, x - el.clientWidth / 3)
  }, [from, machines.length])

  const orderMap = useMemo(() => new Map(orders.map(o => [o.id, o])), [orders])
  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products])
  const byMachine = useMemo(() => {
    const map = new Map<string, Program[]>()
    programs.forEach(p => { if (!p.maquina_id) return; map.set(p.maquina_id, [...(map.get(p.maquina_id) ?? []), p]) })
    return map
  }, [programs])
  const q = query.trim().toLowerCase()
  const visible = machines.filter(m => !q || (m.codigo + ' ' + m.nome).toLowerCase().includes(q))

  const totalW = DAYS * 24 * HOUR_W
  const nowX = ((now.getTime() - from.getTime()) / 3600000) * HOUR_W
  const days = Array.from({ length: DAYS }, (_, i) => new Date(from.getTime() + i * DAY_MS))

  const late = programs.filter(p => toneOf(p, p.ordem_producao_id ? orderMap.get(p.ordem_producao_id) : undefined) === 'late').length
  const running = machines.filter(m => machineTone(m, byMachine.get(m.id) ?? [], orderMap) === 'run').length
  const stopped = machines.filter(m => machineTone(m, byMachine.get(m.id) ?? [], orderMap) === 'stop').length
  const plannedH = programs.reduce((s, p) => s + Math.max(0, (new Date(p.fim_planejado).getTime() - new Date(p.inicio_planejado).getTime()) / 3600000), 0)
  const capacity = machines.length ? Math.min(100, Math.round((plannedH / (machines.length * DAYS * 24)) * 100)) : 0
  const efficiency = machines.length ? Math.round(((machines.length - stopped) / machines.length) * 100) : 0

  return (
    <main className="sqg">
      <header className="sqg-head">
        <div>
          <span className="sqg-eyebrow"><Factory size={13} /> PCP · Programação</span>
          <h1>Programação de Produção</h1>
          <p>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeStyle: 'short' }).format(now)}</p>
        </div>
        <div className="sqg-actions">
          <label className="sqg-search"><Search size={15} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar máquina..." /></label>
          <div className="sqg-nav">
            <button type="button" aria-label="Dia anterior" onClick={() => setFrom(d => new Date(d.getTime() - DAY_MS))}><ChevronLeft size={16} /></button>
            <button type="button" onClick={() => setFrom(startOfDay(new Date()))}><CalendarDays size={15} /> Hoje</button><CalendarDays size={15} /> Hoje</button>
            <button type="button" aria-label="Próximo dia" onClick={() => setFrom(d => new Date(d.getTime() + DAY_MS))}><ChevronRight size={16} /></button>
          </div>
          <button type="button" className="sqg-primary" onClick={() => void load()} disabled={busy}><RefreshCw size={15} className={busy ? 'spin' : ''} /> Atualizar</button>
        </div>
      </header>

      <section className="sqg-kpis">
        <Kpi icon={<Gauge size={20} />} tone="blue" label="Eficiência da planta" value={`${efficiency}%`} ring={efficiency} />
        <Kpi icon={<Activity size={20} />} tone="green" label="Máquinas em produção" value={`${running}/${machines.length}`} />
        <Kpi icon={<AlertTriangle size={20} />} tone="red" label="Ordens em atraso" value={String(late)} />
        <Kpi icon={<CircleCheck size={20} />} tone="cyan" label="Capacidade ocupada" value={`${capacity}%`} ring={capacity} />
      </section>

      {error && <div className="sqg-error"><AlertTriangle size={15} /> {error}</div>}

      <section className="sqg-board">
        <div className="sqg-legend">
          {(['ok', 'run', 'stop', 'late'] as Tone[]).map(t => <span key={t}><i className={`dot ${t}`} />{toneLabel[t]}</span>)}
        </div>
        <div className="sqg-grid">
          <div className="sqg-side">
            <div className="sqg-side-head">Máquinas</div>
            {visible.map(m => {
              const t = machineTone(m, byMachine.get(m.id) ?? [], orderMap)
              return <div key={m.id} className={`sqg-machine ${t}`}>
                <div><strong>{m.nome}</strong><small>{m.codigo}</small></div>
                {t === 'stop' ? <CirclePause size={17} /> : t === 'late' ? <AlertTriangle size={17} /> : <CircleCheck size={17} />}
              </div>
            })}
          </div>
          <div className="sqg-scroll" ref={scroller}>
            <div style={{ width: totalW, position: 'relative' }}>
              <div className="sqg-days">{days.map(d => <div key={d.toISOString()} style={{ width: 24 * HOUR_W }} className={startOfDay(now).getTime() === d.getTime() ? 'today' : ''}>{new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).format(d)}</div>)}</div>
              <div className="sqg-hours">{days.flatMap(d => Array.from({ length: 12 }, (_, h) => <div key={d.toISOString() + h} style={{ width: 2 * HOUR_W }}>{String(h * 2).padStart(2, '0')}h</div>))}</div>
              {visible.map(m => <div key={m.id} className="sqg-row" style={{ backgroundSize: `${HOUR_W * 2}px 100%, ${HOUR_W * 24}px 100%` }}>
                {(byMachine.get(m.id) ?? []).map(p => {
                  const s = Math.max(0, (new Date(p.inicio_planejado).getTime() - from.getTime()) / 3600000)
                  const e = Math.min(DAYS * 24, (new Date(p.fim_planejado).getTime() - from.getTime()) / 3600000)
                  if (e <= s) return null
                  const order = p.ordem_producao_id ? orderMap.get(p.ordem_producao_id) : undefined
                  const prod = productMap.get(p.produto_id ?? order?.produto_id ?? '')
                  const t = toneOf(p, order)
                  const pct = p.quantidade_planejada ? Math.min(100, Math.round(((p.quantidade_produzida ?? 0) / p.quantidade_planejada) * 100)) : 0
                  return <div key={p.id} className={`sqg-bar ${t}`} style={{ left: s * HOUR_W, width: Math.max(28, (e - s) * HOUR_W - 4) }} title={`${order?.numero_op ?? 'OP'} · ${prod?.nome ?? ''} · ${toneLabel[t]}`}>
                    <div className="top"><b>{order?.numero_op ?? 'OP'}</b><span>{p.quantidade_planejada} un</span></div>
                    <div className="name">{prod?.nome ?? '—'}</div>
                    <div className="prog"><i style={{ width: `${pct}%` }} /></div>
                  </div>
                })}
              </div>)}
              {nowX > 0 && nowX < totalW && <div className="sqg-now" style={{ left: nowX }}><span>AGORA</span></div>}
            </div>
          </div>
        </div>
        {!busy && visible.length === 0 && <p className="sqg-empty">Nenhuma máquina encontrada.</p>}
      </section>

      <style>{CSS}</style>
    </main>
  )
}

function Kpi({ icon, label, value, tone, ring }: { icon: React.ReactNode; label: string; value: string; tone: string; ring?: number }) {
  return <article className={`sqg-kpi ${tone}`}>
    <div className="ic" style={ring !== undefined ? { background: `conic-gradient(var(--c) ${ring * 3.6}deg, #EEF2F7 0)` } : undefined}><span>{icon}</span></div>
    <div><small>{label}</small><strong>{value}</strong></div>
  </article>
}

const CSS = `
.sqg{--navy:#0B2545;--blue:#1D5FD1;--cyan:#22B8CF;--bg:#F5F7FB;--bd:#E4E9F2;--mut:#5B6B82;--ok:#1D5FD1;--run:#059669;--stop:#D97706;--late:#DC2626;
  min-height:100vh;background:var(--bg);padding:24px;color:var(--navy);font-family:Inter,system-ui,sans-serif;box-sizing:border-box}
.sqg *{box-sizing:border-box}
.sqg-head{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between;margin-bottom:20px}
.sqg-eyebrow{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--blue)}
.sqg-head h1{margin:6px 0 4px;font-size:26px;font-weight:800;letter-spacing:-.02em}
.sqg-head p{margin:0;font-size:13px;color:var(--mut)}
.sqg-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.sqg-search{display:flex;align-items:center;gap:8px;height:38px;padding:0 12px;background:#fff;border:1px solid var(--bd);border-radius:10px;color:var(--mut)}
.sqg-search:focus-within{border-color:var(--blue);box-shadow:0 0 0 3px rgba(29,95,209,.14)}
.sqg-search input{border:0;outline:0;background:transparent;font-size:13px;width:170px;color:var(--navy)}
.sqg-nav{display:flex;background:#fff;border:1px solid var(--bd);border-radius:10px;overflow:hidden}
.sqg-nav button{height:36px;display:flex;align-items:center;gap:6px;padding:0 12px;border:0;background:transparent;color:var(--navy);font-size:13px;font-weight:600;cursor:pointer}
.sqg-nav button+button{border-left:1px solid var(--bd)}.sqg-nav button:hover{background:#F5F8FF;color:var(--blue)}
.sqg-primary{height:38px;display:flex;align-items:center;gap:8px;padding:0 16px;border:0;border-radius:10px;background:linear-gradient(135deg,var(--blue),var(--cyan));color:#fff;font-weight:600;font-size:13px;cursor:pointer;box-shadow:0 6px 16px rgba(29,95,209,.25)}
.sqg-primary:disabled{opacity:.7}.spin{animation:sqgspin 1s linear infinite}@keyframes sqgspin{to{transform:rotate(360deg)}}
.sqg-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:18px}
.sqg-kpi{--c:var(--blue);display:flex;align-items:center;gap:14px;padding:16px;background:#fff;border:1px solid var(--bd);border-radius:14px;box-shadow:0 1px 2px rgba(11,37,69,.04),0 4px 14px rgba(11,37,69,.05)}
.sqg-kpi.green{--c:var(--run)}.sqg-kpi.red{--c:var(--late)}.sqg-kpi.cyan{--c:var(--cyan)}
.sqg-kpi .ic{width:50px;height:50px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--c) 12%,#fff)}
.sqg-kpi .ic span{width:40px;height:40px;border-radius:50%;background:#fff;display:grid;place-items:center;color:var(--c)}
.sqg-kpi small{display:block;font-size:12px;color:var(--mut);font-weight:500}.sqg-kpi strong{font-size:24px;font-weight:800;letter-spacing:-.02em}
.sqg-error{display:flex;gap:8px;align-items:center;margin-bottom:14px;padding:10px 14px;border-radius:10px;background:#FEF2F2;border:1px solid #FECACA;color:#991B1B;font-size:13px}
.sqg-board{background:#fff;border:1px solid var(--bd);border-radius:16px;box-shadow:0 1px 2px rgba(11,37,69,.04),0 8px 24px rgba(11,37,69,.06);overflow:hidden}
.sqg-legend{display:flex;flex-wrap:wrap;gap:18px;padding:12px 18px;border-bottom:1px solid var(--bd);font-size:12px;color:var(--mut);font-weight:500}
.sqg-legend span{display:flex;align-items:center;gap:6px}
.dot{width:9px;height:9px;border-radius:50%;display:inline-block}.dot.ok{background:var(--ok)}.dot.run{background:var(--run)}.dot.stop{background:var(--stop)}.dot.late{background:var(--late)}
.sqg-grid{display:grid;grid-template-columns:230px 1fr}
.sqg-side{border-right:1px solid var(--bd);background:#FAFBFD}
.sqg-side-head{height:64px;display:flex;align-items:flex-end;padding:0 16px 10px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);border-bottom:1px solid var(--bd)}
.sqg-machine{--c:var(--ok);height:58px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 14px 0 13px;border-bottom:1px solid var(--bd);border-left:3px solid var(--c);color:var(--c)}
.sqg-machine.run{--c:var(--run)}.sqg-machine.stop{--c:var(--stop)}.sqg-machine.late{--c:var(--late)}
.sqg-machine div{min-width:0}.sqg-machine strong{display:block;font-size:13px;color:var(--navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sqg-machine small{font-size:11px;font-weight:700;color:var(--c)}
.sqg-scroll{overflow-x:auto;position:relative}
.sqg-days{display:flex;height:34px;border-bottom:1px solid var(--bd)}
.sqg-days div{display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--navy);border-right:1px solid var(--bd)}
.sqg-days div.today{background:#EEF4FF;color:var(--blue)}
.sqg-hours{display:flex;height:30px;border-bottom:1px solid var(--bd)}
.sqg-hours div{font-size:10px;color:var(--mut);padding:8px 0 0 4px;border-right:1px solid #F1F4F9}
.sqg-row{position:relative;height:58px;border-bottom:1px solid var(--bd);background-image:linear-gradient(to right,#F1F4F9 1px,transparent 1px),linear-gradient(to right,var(--bd) 1px,transparent 1px)}
.sqg-row:hover{background-color:#FAFBFD}
.sqg-bar{--c:var(--ok);position:absolute;top:7px;height:44px;padding:5px 9px;border-radius:9px;background:color-mix(in srgb,var(--c) 10%,#fff);border:1px solid color-mix(in srgb,var(--c) 30%,#fff);border-left:4px solid var(--c);overflow:hidden;cursor:pointer;transition:transform .12s,box-shadow .12s}
.sqg-bar:hover{transform:translateY(-1px);box-shadow:0 6px 16px color-mix(in srgb,var(--c) 25%,transparent);z-index:2}
.sqg-bar.run{--c:var(--run)}.sqg-bar.stop{--c:var(--stop)}.sqg-bar.late{--c:var(--late)}
.sqg-bar .top{display:flex;justify-content:space-between;gap:6px;font-size:11px;color:var(--navy);white-space:nowrap}
.sqg-bar .top span{color:var(--mut);font-weight:600}
.sqg-bar .name{font-size:11px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sqg-bar .prog{height:3px;margin-top:3px;background:color-mix(in srgb,var(--c) 15%,#fff);border-radius:3px}.sqg-bar .prog i{display:block;height:100%;background:var(--c);border-radius:3px}
.sqg-now{position:absolute;top:34px;bottom:0;width:2px;background:var(--late);z-index:3;pointer-events:none}
.sqg-now span{position:absolute;top:-1px;left:50%;transform:translateX(-50%);padding:3px 8px;border-radius:6px;background:var(--late);color:#fff;font-size:10px;font-weight:800;letter-spacing:.06em}
.sqg-empty{padding:28px;text-align:center;color:var(--mut);font-size:13px}
@media(max-width:760px){.sqg{padding:14px}.sqg-grid{grid-template-columns:150px 1fr}.sqg-search input{width:110px}}
`
