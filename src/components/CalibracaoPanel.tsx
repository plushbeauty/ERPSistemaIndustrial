import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock3, FileCheck2, MapPin, Plus, Search, TriangleAlert, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { supabase } from '../lib/supabaseClient'

type Equip = {
  id: string
  empresa_id: string
  codigo: string
  descricao: stringsssss
  fabricante: string | null
  equipamento: string | null
  numero_serie: string | null
  faixa_medicao: string | null
  resolucao: string | null
  setor: string | null
  responsavel: string | null
  status: string
  proxima_calibracao: string | null
  certificado_rbc: string | null
  certificado_validade: string | null
  tolerancia_nominal: number | null
  erro_maximo: number | null
  unidade_medida: string | null
  observacoes: string | null
}

type Hist = {
  id: string
  revisao: number
  numero_certificado: string
  data_calibracao: string
  proxima_calibracao: string | null
  laboratorio: string | null
  resultado: string
  observacao: string | null
  certificado_rbc: string | null
}

const equipmentSelect = 'id,empresa_id,codigo,descricao,fabricante,equipamento,numero_serie,faixa_medicao,resolucao,setor,responsavel,status,proxima_calibracao,certificado_rbc,certificado_validade,tolerancia_nominal,erro_maximo,unidade_medida,observacoes'
const historySelect = 'id,revisao,numero_certificado,data_calibracao,proxima_calibracao,laboratorio,resultado,observacao,certificado_rbc'

function usable(e: Equip): boolean {
  return e.status.toUpperCase() === 'APROVADO' && Boolean(e.proxima_calibracao && e.proxima_calibracao >= new Date().toISOString().slice(0, 10))
}

export default function CalibracaoPanel() {
  const [equip, setEquip] = useState<Equip[]>([])
  const [selected, setSelected] = useState<Equip | null>(null)
  const [history, setHistory] = useState<Hist[]>([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ numero_certificado: '', data_calibracao: new Date().toISOString().slice(0, 10), proxima_calibracao: '', laboratorio: '', resultado: 'Aprovado', observacao: '', certificado_rbc: '' })

  async function load() {
    setError('')
    const result = await supabase.from('erp_equipamentos_medicao').select(equipmentSelect).order('codigo').limit(500)
    if (result.error) setError(result.error.message)
    else setEquip((result.data ?? []) as Equip[])
  }

  async function loadHistory(id: string) {
    const result = await supabase.from('erp_qualidade_calibracoes_historico').select(historySelect).eq('equipamento_id', id).order('revisao', { ascending: false })
    if (result.error) setError(result.error.message)
    else setHistory((result.data ?? []) as Hist[])
  }

  useEffect(() => { void load() }, [])

  async function selectEquipment(item: Equip) {
    setSelected(item)
    setOpen(true)
    setMessage('')
    setError('')
    await loadHistory(item.id)
  }

  async function add() {
    if (!selected) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = await supabase.rpc('erp_registrar_calibracao', {
        p_equipamento_id: selected.id,
        p_numero_certificado: form.numero_certificado,
        p_data_calibracao: form.data_calibracao,
        p_proxima_calibracao: form.proxima_calibracao || null,
        p_laboratorio: form.laboratorio || null,
        p_resultado: form.resultado,
        p_observacao: form.observacao || null,
        p_certificado_rbc: form.certificado_rbc || null,
      })
      if (result.error) throw result.error
      const row = Array.isArray(result.data) ? result.data[0] as { revisao: number; status: string } | undefined : undefined
      if (!row) throw new Error('A calibração foi registrada sem retorno de revisão.')
      setMessage('Certificação registrada como Rev. ' + row.revisao + '. Status operacional: ' + row.status + '.')
      await load()
      const fresh = await supabase.from('erp_equipamentos_medicao').select(equipmentSelect).eq('id', selected.id).single()
      if (fresh.error) throw fresh.error
      setSelected(fresh.data as Equip)
      await loadHistory(selected.id)
      setForm({ numero_certificado: '', data_calibracao: new Date().toISOString().slice(0, 10), proxima_calibracao: '', laboratorio: '', resultado: 'Aprovado', observacao: '', certificado_rbc: '' })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a certificação.')
    } finally {
      setSaving(false)
    }
  }

  const filtered = useMemo(() => equip.filter(item => JSON.stringify(item).toLowerCase().includes(query.toLowerCase())), [equip, query])

  return <section className="quality-workspace">
    <div className="quality-section-head">
      <div>
        <span className="quality-kicker">SGQ • METROLOGIA</span>
        <h2>Equipamentos de medição</h2>
        <p>Cadastro, validade, certificados e histórico de calibração vinculados ao tenant real.</p>
      </div>
      <button type="button" className="quality-outline" onClick={() => void load()}><Clock3 size={17}/> Atualizar</button>
    </div>
    <div className="quality-search"><Search size={18}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Pesquisar código, equipamento, fabricante ou setor…"/></div>
    <div className="quality-table-shell"><table className="quality-table"><thead><tr><th>Código</th><th>Descrição</th><th>Fabricante / Equipamento</th><th>Setor</th><th>Status</th><th>Próxima calibração</th><th>Certificado</th></tr></thead><tbody>
      {filtered.map(item => <tr key={item.id} onClick={() => void selectEquipment(item)} tabIndex={0} onKeyDown={event => { if (event.key === 'Enter') void selectEquipment(item) }}>
        <td><b>{item.codigo}</b></td><td>{item.descricao}</td><td>{[item.fabricante, item.equipamento].filter(Boolean).join(' / ') || '—'}</td><td><span className="quality-location"><MapPin size={15}/>{item.setor || 'Não informado'}</span></td>
        <td><span className={'quality-status ' + (usable(item) ? 'ok' : 'danger')}>{usable(item) ? 'APTO PARA USO' : 'BLOQUEADO'}</span></td>
        <td>{item.proxima_calibracao ? new Date(item.proxima_calibracao + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td><td>{item.certificado_rbc || '—'}</td>
      </tr>)}
      {!filtered.length && <tr><td colSpan={7} className="quality-empty">Nenhum equipamento encontrado.</td></tr>}
    </tbody></table></div>

    <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Portal><Dialog.Overlay className="quality-dialog-overlay"/><Dialog.Content className="quality-dialog">
      <Dialog.Title className="quality-dialog-title"><div><span>FICHA DO INSTRUMENTO</span><h2>{selected?.codigo} · {selected?.descricao}</h2></div><Dialog.Close asChild><button type="button" className="quality-close" aria-label="Fechar"><X size={22}/></button></Dialog.Close></Dialog.Title>
      {selected && <div className="quality-dialog-body">
        {!usable(selected) && <div className="quality-alert danger"><TriangleAlert size={18}/> Instrumento bloqueado para uso operacional até possuir status APROVADO e próxima calibração válida.</div>}
        <div className="quality-master-grid">
          {[['Código', selected.codigo], ['Descrição', selected.descricao], ['Fabricante', selected.fabricante || '—'], ['Equipamento', selected.equipamento || '—'], ['Número de série', selected.numero_serie || '—'], ['Setor', selected.setor || '—'], ['Responsável', selected.responsavel || '—'], ['Status', selected.status], ['Próxima calibração', selected.proxima_calibracao || '—'], ['Certificado RBC', selected.certificado_rbc || '—'], ['Validade certificado', selected.certificado_validade || '—'], ['Faixa / resolução', [selected.faixa_medicao, selected.resolucao].filter(Boolean).join(' / ') || '—']].map(([key, value]) => <div key={key}><span>{key}</span><strong>{value}</strong></div>)}
        </div>
        <section className="quality-history-card"><header><div><span>RASTREABILIDADE</span><h3>Histórico de calibrações</h3></div><button type="button" className="quality-primary" onClick={() => document.getElementById('cal-form')?.scrollIntoView({ behavior: 'smooth' })}><Plus size={17}/> Nova certificação</button></header>
          <div className="quality-table-shell"><table className="quality-table"><thead><tr><th>Revisão</th><th>Certificado</th><th>Data</th><th>Laboratório</th><th>Resultado</th><th>Próxima</th></tr></thead><tbody>
            {history.map(item => <tr key={item.id}><td><b>Rev. {item.revisao}</b></td><td>{item.numero_certificado}</td><td>{new Date(item.data_calibracao + 'T00:00:00').toLocaleDateString('pt-BR')}</td><td>{item.laboratorio || '—'}</td><td>{item.resultado}</td><td>{item.proxima_calibracao || '—'}</td></tr>)}
            {!history.length && <tr><td colSpan={6} className="quality-empty">Nenhuma certificação registrada ainda.</td></tr>}
          </tbody></table></div>
        </section>
        <section id="cal-form" className="quality-cert-form"><h3><FileCheck2 size={19}/> Nova certificação</h3>
          <div className="quality-form-grid">
            <label>Número do certificado<input value={form.numero_certificado} onChange={event => setForm({ ...form, numero_certificado: event.target.value })}/></label>
            <label>Data da calibração<input type="date" value={form.data_calibracao} onChange={event => setForm({ ...form, data_calibracao: event.target.value })}/></label>
            <label>Próxima calibração<input type="date" value={form.proxima_calibracao} onChange={event => setForm({ ...form, proxima_calibracao: event.target.value })}/></label>
            <label>Laboratório executor<input value={form.laboratorio} onChange={event => setForm({ ...form, laboratorio: event.target.value })}/></label>
            <label>Resultado / Status<select value={form.resultado} onChange={event => setForm({ ...form, resultado: event.target.value })}><option>Aprovado</option><option>Condicional</option><option>Reprovado</option></select></label>
            <label>Certificado RBC<input value={form.certificado_rbc} onChange={event => setForm({ ...form, certificado_rbc: event.target.value })}/></label>
            <label className="span-2">Observação<textarea value={form.observacao} onChange={event => setForm({ ...form, observacao: event.target.value })} rows={3}/></label>
          </div>
          {error && <div className="quality-alert danger">{error}</div>}{message && <div className="quality-alert">{message}</div>}
          <button type="button" className="quality-primary" disabled={saving} onClick={() => void add()}><CheckCircle2 size={18}/>{saving ? 'Salvando certificação…' : 'Salvar certificação e criar nova revisão'}</button>
        </section>
      </div>}
    </Dialog.Content></Dialog.Portal></Dialog.Root>
  </section>
}
