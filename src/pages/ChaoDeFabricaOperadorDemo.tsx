import { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock3, Play, Square, Trash2, UserRound, UsersRound, Wrench } from 'lucide-react'
import './chao-de-fabrica-operador-demo.css'

const machines = [
  { code: 'M-01', name: 'Injetora 160T', status: 'Em produção', tone: 'running' },
  { code: 'M-02', name: 'Injetora 120T', status: 'Disponível', tone: 'available' },
  { code: 'M-03', name: 'Sopradora', status: 'Disponível', tone: 'available' },
  { code: 'M-04', name: 'Extrusora', status: 'Em parada', tone: 'stopped' },
  { code: 'M-05', name: 'Injetora 200T', status: 'Disponível', tone: 'available' },
  { code: 'M-06', name: 'Injetora 100T', status: 'Disponível', tone: 'available' },
  { code: 'M-07', name: 'Montagem', status: 'Disponível', tone: 'available' },
  { code: 'M-08', name: 'Embaladora', status: 'Disponível', tone: 'available' },
] as const
const reasons = ['Quebra de Máquina','Falta de Material','Ajuste de Processo','Manutenção Planejada','Falta de Operador','Qualidade','Limpeza','Outro']
const planned = 10000
const fmt = (n:number) => n.toLocaleString('pt-BR')
const dateFmt = (d:Date) => new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d)
const timeFmt = (d:Date) => new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',hour12:false}).format(d)

export default function ChaoDeFabricaOperadorDemo() {
  const [machine,setMachine] = useState('M-01')
  const [quantity,setQuantity] = useState(2350)
  const [reason,setReason] = useState(reasons[0])
  const [observations,setObservations] = useState('')
  const [now,setNow] = useState(()=>new Date())
  const [notice,setNotice] = useState('')
  useEffect(()=>{ const id=window.setInterval(()=>setNow(new Date()),30000); return ()=>window.clearInterval(id) },[])
  const progress=Math.min(quantity/planned*100,100)
  const demoAction=(name:string)=>setNotice(`${name}: demonstração visual. Nenhuma operação foi registrada no ERP.`)
  return <section className="operator-demo" aria-labelledby="operator-demo-title">
    <header className="operator-demo-header">
      <div className="operator-demo-heading"><div><h1 id="operator-demo-title">APONTAMENTO</h1><p>PRODUÇÃO EM TEMPO REAL</p></div><span className="operator-demo-badge">PROTÓTIPO VISUAL · DADOS ILUSTRATIVOS</span></div>
      <div className="operator-demo-session">
        <div className="operator-demo-session-item"><UserRound/><span><small>OPERADOR</small><strong>Operador demonstrativo</strong></span></div>
        <div className="operator-demo-session-item"><UsersRound/><span><small>TURNO</small><strong>1º Turno · 06:00 – 14:00</strong></span></div>
        <div className="operator-demo-session-item"><CalendarDays/><span><small>DATA</small><strong>{dateFmt(now)}</strong><small>Data do dispositivo · demonstração</small></span></div>
        <div className="operator-demo-clock"><Clock3/><time dateTime={now.toISOString()}>{timeFmt(now)}</time></div>
      </div>
    </header>
    <div className="operator-demo-notice" role="note"><span>i</span>Protótipo de apresentação — não conectado ao ERP e sem gravação de apontamentos.</div>
    <div className="operator-demo-overview">
      <div className="operator-demo-left">
        <section><div className="operator-demo-section-heading"><h2>MÁQUINA</h2><p>SELECIONE UMA MÁQUINA · ESTADOS ILUSTRATIVOS</p></div><div className="operator-demo-machines">{machines.map(m=><button type="button" key={m.code} className={`operator-demo-machine is-${m.tone}${machine===m.code?' is-selected':''}`} aria-pressed={machine===m.code} onClick={()=>setMachine(m.code)}><strong>{m.code}</strong><span className="operator-demo-machine-name">{m.name}</span><span className="operator-demo-machine-status"><i/>{m.status}</span></button>)}</div></section>
        <section><div className="operator-demo-section-heading"><h2>ORDEM ATIVA</h2><span className="operator-demo-inline-demo">DEMONSTRAÇÃO</span></div><div className="operator-demo-order-card"><div className="operator-demo-order-primary"><div><span className="operator-demo-field-label">ORDEM DE PRODUÇÃO</span><strong className="operator-demo-order-number">OP-4587</strong></div><div><span className="operator-demo-field-label">PRODUTO</span><strong className="operator-demo-product">Suporte Plástico A123</strong></div><div className="operator-demo-order-quantities"><div><span className="operator-demo-field-label">PLANO</span><strong>{fmt(planned)} un</strong></div><div><span className="operator-demo-field-label">QUANTIDADE BOA</span><strong>{fmt(quantity)} un</strong></div></div></div><div className="operator-demo-order-secondary">{[['CLIENTE','Indústria demonstrativa'],['CÓDIGO','A123-PL'],['INÍCIO','Exemplo · 07:12'],['PREVISÃO TÉRMINO','Exemplo · 14:00']].map(([l,v])=><div key={l}><span className="operator-demo-field-label">{l}</span><strong>{v}</strong></div>)}</div></div></section>
      </div>
      <div className="operator-demo-right">
        <section><div className="operator-demo-section-heading"><h2>CONTADOR DE PRODUÇÃO</h2></div><div className="operator-demo-counter-card"><span className="operator-demo-field-label">QUANTIDADE BOA · ILUSTRATIVA</span><div className="operator-demo-counter-value"><output aria-live="polite">{fmt(quantity)}</output><span>un</span></div><div className="operator-demo-counter-controls"><button type="button" className="operator-demo-counter-button is-decrease" aria-label="Diminuir quantidade" onClick={()=>setQuantity(q=>Math.max(0,q-1))}>−</button><button type="button" className="operator-demo-counter-button is-increase" aria-label="Aumentar quantidade" onClick={()=>setQuantity(q=>Math.min(planned,q+1))}>+</button></div></div></section>
        <section><div className="operator-demo-section-heading"><h2>METAS E AVANÇO</h2></div><div className="operator-demo-goals"><div className="operator-demo-goal-summary"><strong>{fmt(quantity)} de {fmt(planned)} un</strong><strong>{progress.toLocaleString('pt-BR',{maximumFractionDigits:1})}%</strong></div><div className="operator-demo-progress-track" role="progressbar" aria-label="Avanço demonstrativo" aria-valuemin={0} aria-valuemax={planned} aria-valuenow={quantity}><span style={{width:`${progress}%`}}/></div><div className="operator-demo-hourly-metrics"><div><span>META HORA</span><strong>800 un</strong></div><div><span>PRODUÇÃO HORA</span><strong>620 un</strong></div><div><span>EFICIÊNCIA</span><strong>77%</strong></div></div></div></section>
      </div>
    </div>
    <section><div className="operator-demo-section-heading"><h2>AÇÕES</h2><span className="operator-demo-inline-demo">VISUALIZAÇÃO · SEM EFEITO OPERACIONAL</span></div><div className="operator-demo-actions"><button type="button" className="operator-demo-action is-start" onClick={()=>demoAction('Iniciar')}><Play fill="currentColor"/><span><strong>INICIAR</strong><small>INICIAR PRODUÇÃO</small></span></button><button type="button" className="operator-demo-action is-stop" onClick={()=>demoAction('Parada')}><Square fill="currentColor"/><span><strong>PARADA</strong><small>REGISTRAR PARADA</small></span></button><button type="button" className="operator-demo-action is-scrap" onClick={()=>demoAction('Refugo')}><Trash2/><span><strong>REFUGO</strong><small>REGISTRAR REFUGO</small></span></button><button type="button" className="operator-demo-action is-setup" onClick={()=>demoAction('Setup')}><Wrench/><span><strong>SETUP</strong><small>TROCA / AJUSTE</small></span></button></div><p className="operator-demo-live-message" role="status" aria-live="polite">{notice||'As ações são apenas visuais nesta versão demonstrativa.'}</p></section>
    <section><div className="operator-demo-section-heading"><div><h2>MOTIVO DA PARADA</h2><p>SELECIONE O MOTIVO · SELEÇÃO DEMONSTRATIVA</p></div>{reason&&<span className="operator-demo-selected-reason"><CheckCircle2 size={15}/>{reason}</span>}</div><div className="operator-demo-reasons" role="group" aria-label="Motivos de parada">{reasons.map(r=><button type="button" key={r} aria-pressed={reason===r} className={`operator-demo-reason${reason===r?' is-selected':''}`} onClick={()=>setReason(r)}>{r}</button>)}</div></section>
    <section><div className="operator-demo-section-heading"><h2>OBSERVAÇÕES</h2><span className="operator-demo-inline-demo">NÃO SERÃO SALVAS</span></div><label className="operator-demo-sr-only" htmlFor="operator-demo-observations">Observações demonstrativas</label><textarea id="operator-demo-observations" value={observations} onChange={e=>setObservations(e.target.value)} placeholder="Digite observações (opcional)..." rows={3}/></section>
  </section>
}
