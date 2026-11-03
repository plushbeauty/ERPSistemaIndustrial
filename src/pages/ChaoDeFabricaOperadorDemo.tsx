/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-03
 * @REVISAO: REV-CHAO-FABRICA-APONTAMENTO-PROTOTIPO-20261103-01 — integrado por ordem do proprietario
 * ("as telas que estao em C:\\Users\\Dri\\Documents\\Qoder\\2026-11-01 ... copie/integre os arquivos").
 * @STATUS_APROVACAO: PROTOTIPO VISUAL — sem integracao com o Supabase. A tela de apontamento que grava no
 *   servidor continua em /pageprincipal/chao-de-fabrica/portal-operador (PCPAreaFuncionario).
 */
import { useEffect, useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Play,
  Square,
  Trash2,
  UserRound,
  UsersRound,
  Wrench,
} from 'lucide-react'
import './chao-de-fabrica-operador-demo.css'

const demoMachines = [
  { code: 'M-01', name: 'Injetora 160T', status: 'Em produção', tone: 'running' },
  { code: 'M-02', name: 'Injetora 120T', status: 'Disponível', tone: 'available' },
  { code: 'M-03', name: 'Sopradora', status: 'Disponível', tone: 'available' },
  { code: 'M-04', name: 'Extrusora', status: 'Em parada', tone: 'stopped' },
  { code: 'M-05', name: 'Injetora 200T', status: 'Disponível', tone: 'available' },
  { code: 'M-06', name: 'Injetora 100T', status: 'Disponível', tone: 'available' },
  { code: 'M-07', name: 'Montagem', status: 'Disponível', tone: 'available' },
  { code: 'M-08', name: 'Embaladora', status: 'Disponível', tone: 'available' },
] as const

const stopReasons = [
  'Quebra de Máquina',
  'Falta de Material',
  'Ajuste de Processo',
  'Manutenção Planejada',
  'Falta de Operador',
  'Qualidade',
  'Limpeza',
  'Outro',
]

const initialGoodQuantity = 2350
const plannedQuantity = 10000

function formatDemoDate(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatDemoTime(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export default function ChaoDeFabricaOperadorDemo() {
  const [selectedMachine, setSelectedMachine] = useState('M-01')
  const [goodQuantity, setGoodQuantity] = useState(initialGoodQuantity)
  const [selectedReason, setSelectedReason] = useState(stopReasons[0])
  const [observations, setObservations] = useState('')
  const [demoTime, setDemoTime] = useState(() => new Date())
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const timer = window.setInterval(() => setDemoTime(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const progress = Math.min((goodQuantity / plannedQuantity) * 100, 100)

  const showDemoNotice = (action: string) => {
    setNotice(`${action}: esta demonstração não registra nem inicia operações reais.`)
  }

  return (
    <section className="operator-demo" aria-labelledby="operator-demo-title">
      <header className="operator-demo-header">
        <div className="operator-demo-heading">
          <div>
            <h1 id="operator-demo-title">APONTAMENTO</h1>
            <p>PRODUÇÃO EM TEMPO REAL</p>
          </div>
          <span className="operator-demo-badge">PROTÓTIPO VISUAL · DADOS ILUSTRATIVOS</span>
        </div>

        <div className="operator-demo-session" aria-label="Identificação demonstrativa do operador e do turno">
          <div className="operator-demo-session-item">
            <UserRound aria-hidden="true" />
            <span><small>OPERADOR</small><strong>Carlos Silva · demonstração</strong></span>
          </div>
          <div className="operator-demo-session-item">
            <UsersRound aria-hidden="true" />
            <span><small>TURNO</small><strong>1º Turno · 06:00 – 14:00</strong></span>
          </div>
          <div className="operator-demo-session-item">
            <CalendarDays aria-hidden="true" />
            <span><small>DATA</small><strong>{formatDemoDate(demoTime)}</strong><small>Data do dispositivo · demonstração</small></span>
          </div>
          <div className="operator-demo-clock">
            <Clock3 aria-hidden="true" />
            <time dateTime={demoTime.toISOString()}>{formatDemoTime(demoTime)}</time>
          </div>
        </div>
      </header>

      <div className="operator-demo-notice" role="note">
        <span aria-hidden="true">i</span>
        Protótipo de apresentação — não conectado ao ERP e sem gravação de apontamentos.
      </div>

      <div className="operator-demo-overview">
        <div className="operator-demo-left">
          <section aria-labelledby="operator-demo-machines-title">
            <div className="operator-demo-section-heading">
              <h2 id="operator-demo-machines-title">MÁQUINA</h2>
              <p>SELECIONE UMA MÁQUINA · ESTADOS ILUSTRATIVOS</p>
            </div>
            <div className="operator-demo-machines">
              {demoMachines.map(machine => (
                <button
                  type="button"
                  key={machine.code}
                  className={`operator-demo-machine is-${machine.tone}${selectedMachine === machine.code ? ' is-selected' : ''}`}
                  aria-pressed={selectedMachine === machine.code}
                  onClick={() => setSelectedMachine(machine.code)}
                >
                  <strong>{machine.code}</strong>
                  <span className="operator-demo-machine-name">{machine.name}</span>
                  <span className="operator-demo-machine-status">
                    <i aria-hidden="true" />
                    {machine.status}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby="operator-demo-order-title">
            <div className="operator-demo-section-heading">
              <h2 id="operator-demo-order-title">ORDEM ATIVA</h2>
              <span className="operator-demo-inline-demo">DEMONSTRAÇÃO</span>
            </div>
            <div className="operator-demo-order-card">
              <div className="operator-demo-order-primary">
                <div>
                  <span className="operator-demo-field-label">ORDEM DE PRODUÇÃO</span>
                  <strong className="operator-demo-order-number">OP-4587</strong>
                </div>
                <div>
                  <span className="operator-demo-field-label">PRODUTO</span>
                  <strong className="operator-demo-product">Suporte Plástico A123</strong>
                </div>
                <div className="operator-demo-order-quantities">
                  <div>
                    <span className="operator-demo-field-label">PLANO</span>
                    <strong>{plannedQuantity.toLocaleString('pt-BR')} un</strong>
                  </div>
                  <div>
                    <span className="operator-demo-field-label">QUANTIDADE BOA</span>
                    <strong>{goodQuantity.toLocaleString('pt-BR')} un</strong>
                  </div>
                </div>
              </div>
              <div className="operator-demo-order-secondary">
                <div>
                  <span className="operator-demo-field-label">CLIENTE</span>
                  <strong>Indústria Beta · demonstração</strong>
                </div>
                <div>
                  <span className="operator-demo-field-label">CÓDIGO</span>
                  <strong>A123-PL</strong>
                </div>
                <div>
                  <span className="operator-demo-field-label">INÍCIO</span>
                  <strong>Exemplo · 07:12</strong>
                </div>
                <div>
                  <span className="operator-demo-field-label">PREVISÃO TÉRMINO</span>
                  <strong>Exemplo · 14:00</strong>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="operator-demo-right">
          <section aria-labelledby="operator-demo-counter-title">
            <div className="operator-demo-section-heading">
              <h2 id="operator-demo-counter-title">CONTADOR DE PRODUÇÃO</h2>
            </div>
            <div className="operator-demo-counter-card">
              <span className="operator-demo-field-label">QUANTIDADE BOA · ILUSTRATIVA</span>
              <div className="operator-demo-counter-value" aria-live="polite">
                <output aria-label={`${goodQuantity.toLocaleString('pt-BR')} unidades boas demonstrativas`}>
                  {goodQuantity.toLocaleString('pt-BR')}
                </output>
                <span>un</span>
              </div>
              <div className="operator-demo-counter-controls">
                <button
                  type="button"
                  className="operator-demo-counter-button is-decrease"
                  aria-label="Diminuir quantidade boa demonstrativa"
                  onClick={() => setGoodQuantity(quantity => Math.max(0, quantity - 1))}
                >
                  <span aria-hidden="true">−</span>
                </button>
                <button
                  type="button"
                  className="operator-demo-counter-button is-increase"
                  aria-label="Aumentar quantidade boa demonstrativa"
                  onClick={() => setGoodQuantity(quantity => Math.min(plannedQuantity, quantity + 1))}
                >
                  <span aria-hidden="true">+</span>
                </button>
              </div>
            </div>
          </section>

          <section aria-labelledby="operator-demo-goals-title">
            <div className="operator-demo-section-heading">
              <h2 id="operator-demo-goals-title">METAS E AVANÇO</h2>
            </div>
            <div className="operator-demo-goals">
              <div className="operator-demo-goal-summary">
                <strong>{goodQuantity.toLocaleString('pt-BR')} de {plannedQuantity.toLocaleString('pt-BR')} un</strong>
                <strong>{progress.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</strong>
              </div>
              <div
                className="operator-demo-progress-track"
                role="progressbar"
                aria-label="Avanço ilustrativo da meta de produção"
                aria-valuemin={0}
                aria-valuemax={plannedQuantity}
                aria-valuenow={goodQuantity}
              >
                <span style={{ width: `${progress}%` }} />
              </div>
              <div className="operator-demo-hourly-metrics">
                <div><span>META HORA</span><strong>800 un</strong></div>
                <div><span>PRODUÇÃO HORA</span><strong>620 un</strong></div>
                <div><span>EFICIÊNCIA</span><strong>77%</strong></div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section aria-labelledby="operator-demo-actions-title">
        <div className="operator-demo-section-heading">
          <h2 id="operator-demo-actions-title">AÇÕES</h2>
          <span className="operator-demo-inline-demo">VISUALIZAÇÃO · SEM EFEITO OPERACIONAL</span>
        </div>
        <div className="operator-demo-actions">
          <button type="button" className="operator-demo-action is-start" onClick={() => showDemoNotice('Iniciar')}>
            <Play aria-hidden="true" fill="currentColor" />
            <span><strong>INICIAR</strong><small>INICIAR PRODUÇÃO</small></span>
          </button>
          <button type="button" className="operator-demo-action is-stop" onClick={() => showDemoNotice('Parada')}>
            <Square aria-hidden="true" fill="currentColor" />
            <span><strong>PARADA</strong><small>REGISTRAR PARADA</small></span>
          </button>
          <button type="button" className="operator-demo-action is-scrap" onClick={() => showDemoNotice('Refugo')}>
            <Trash2 aria-hidden="true" />
            <span><strong>REFUGO</strong><small>REGISTRAR REFUGO</small></span>
          </button>
          <button type="button" className="operator-demo-action is-setup" onClick={() => showDemoNotice('Setup')}>
            <Wrench aria-hidden="true" />
            <span><strong>SETUP</strong><small>TROCA / AJUSTE</small></span>
          </button>
        </div>
        <p className="operator-demo-live-message" role="status" aria-live="polite">
          {notice || 'As ações são apenas visuais nesta versão demonstrativa.'}
        </p>
      </section>

      <section aria-labelledby="operator-demo-stop-title">
        <div className="operator-demo-section-heading">
          <div>
            <h2 id="operator-demo-stop-title">MOTIVO DA PARADA</h2>
            <p>SELECIONE O MOTIVO · SELEÇÃO DEMONSTRATIVA</p>
          </div>
          {selectedReason && <span className="operator-demo-selected-reason"><CheckCircle2 aria-hidden="true" size={15} />{selectedReason}</span>}
        </div>
        <div className="operator-demo-reasons" role="group" aria-label="Motivos de parada demonstrativos">
          {stopReasons.map(reason => (
            <button
              type="button"
              key={reason}
              aria-pressed={selectedReason === reason}
              className={`operator-demo-reason${selectedReason === reason ? ' is-selected' : ''}`}
              onClick={() => setSelectedReason(reason)}
            >
              {reason}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="operator-demo-observations-title">
        <div className="operator-demo-section-heading">
          <h2 id="operator-demo-observations-title">OBSERVAÇÕES</h2>
          <span className="operator-demo-inline-demo">NÃO SERÃO SALVAS</span>
        </div>
        <label className="operator-demo-sr-only" htmlFor="operator-demo-observations">Observações demonstrativas</label>
        <textarea
          id="operator-demo-observations"
          value={observations}
          onChange={event => setObservations(event.target.value)}
          placeholder="Digite observações (opcional)..."
          rows={3}
        />
      </section>
    </section>
  )
}
