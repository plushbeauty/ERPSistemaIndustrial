/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO: 2026-11-03
 * @MODULO: SYSNQRA ERP INDUSTRIAL — Moldes & Ferramentaria
 * @ROTA: /pageprincipal/pcp/ferramentaria
 */
import { useCallback, useEffect, useState } from 'react'
import { History, MapPin, Plus, RefreshCw, Save, Wrench } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog'
import { Progress } from '../components/ui/progress'

type Molde = {
  id: string
  empresa_id: string
  codigo: string
  nome: string
  tipo: string
  status: string
  numero_cavidades: number
  cavidades: number
  ciclos_atuais: number
  limite_ciclos: number
  limite_ciclos_preventiva: number | null
  localizacao_fisica: string | null
}
type Hist = {
  id: string
  revisao: number
  tipo: string
  data_intervencao: string
  descricao: string
  pecas_trocadas: string | null
  tecnico_responsavel: string | null
}
const MOLDE_FIELDS = 'id,empresa_id,codigo,nome,tipo,status,numero_cavidades,cavidades,ciclos_atuais,limite_ciclos,limite_ciclos_preventiva,localizacao_fisica'
const HISTORY_FIELDS = 'id,revisao,tipo,data_intervencao,descricao,pecas_trocadas,tecnico_responsavel'
const initialForm = () => ({ tipo: 'Preventiva', data: new Date().toISOString().slice(0, 10), descricao: '', pecas: '', tecnico: '', reset: false })

export default function MoldesFerramentaria() {
  const [moldes, setMoldes] = useState<Molde[]>([])
  const [selected, setSelected] = useState<Molde | null>(null)
  const [hist, setHist] = useState<Hist[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [historyBusy, setHistoryBusy] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const { data: empresaId, error: companyError } = await supabase.rpc('erp_current_empresa_id')
      if (companyError) throw companyError
      if (!empresaId) throw new Error('Não foi possível identificar a empresa da sessão.')
      const result = await supabase.from('erp_moldes').select(MOLDE_FIELDS).eq('empresa_id', String(empresaId)).eq('ativo', true).order('codigo')
      if (result.error) throw result.error
      setMoldes((result.data ?? []) as Molde[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar os moldes.')
      setMoldes([])
    } finally {
      setBusy(false)
    }
  }, [])

  const openMolde = async (molde: Molde) => {
    setSelected(molde)
    setOpen(true)
    setHist([])
    setHistoryBusy(true)
    setError('')
    try {
      const result = await supabase.from('erp_moldes_manutencao_historico')
        .select(HISTORY_FIELDS).eq('molde_id', molde.id).eq('empresa_id', molde.empresa_id)
        .order('revisao', { ascending: false })
      if (result.error) throw result.error
      setHist((result.data ?? []) as Hist[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o histórico de manutenção.')
    } finally {
      setHistoryBusy(false)
    }
  }

  const save = async () => {
    if (!selected || !form.descricao.trim() || !form.tecnico.trim() || !form.data) {
      setError('Preencha data, descrição e técnico responsável.')
      return
    }
    if (form.reset && !window.confirm('Confirma a manutenção preventiva total e o zeramento do contador de ciclos deste molde?')) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await supabase.rpc('erp_registrar_manutencao_molde', {
        p_molde_id: selected.id,
        p_tipo: form.tipo,
        p_data: form.data,
        p_descricao: form.descricao.trim(),
        p_pecas: form.pecas.trim(),
        p_tecnico: form.tecnico.trim(),
        p_reset_ciclos: form.reset,
      })
      if (result.error) throw result.error
      await load()
      const fresh = await supabase.from('erp_moldes').select(MOLDE_FIELDS)
        .eq('id', selected.id).eq('empresa_id', selected.empresa_id).single()
      if (fresh.error) throw fresh.error
      await openMolde(fresh.data as Molde)
      setForm(initialForm())
      setNotice('Manutenção registrada. Histórico e cadastro atualizados.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível registrar a manutenção.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [load])

  return (
    <main className="erp-page-v3">
      <header className="erp-page-header-v3">
        <div>
          <span className="erp-eyebrow">ENGENHARIA • PCP • FERRAMENTARIA</span>
          <h1>Moldes &amp; Ferramentaria</h1>
          <p>Vida útil, manutenção preventiva, localização física e histórico de intervenções.</p>
        </div>
        <button type="button" className="erp-btn-secondary" onClick={() => void load()} disabled={busy}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </header>

      {error && <div className="erp-alert-error" role="alert">{error}</div>}
      {notice && <div className="erp-alert-success" role="status">{notice}</div>}

      <section className="erp-card-v3">
        <div className="erp-table-head-v3">
          <div><h2>Ativos de ferramentaria</h2><p>Selecione um molde para consultar a ficha e registrar uma intervenção.</p></div>
          <span className="erp-count">{moldes.length} registros</span>
        </div>
        <div className="erp-table-scroll">
          <table className="erp-table-v3">
            <thead><tr><th>Código</th><th>Nome do molde</th><th>Cavidades</th><th>Ciclos</th><th>Preventiva</th><th>Status</th><th>Localização física</th></tr></thead>
            <tbody>
              {moldes.map(molde => {
                const limite = Number(molde.limite_ciclos_preventiva || molde.limite_ciclos || 0)
                const percentual = limite > 0 ? Math.min(100, Math.max(0, Number(molde.ciclos_atuais || 0) / limite * 100)) : 0
                const vencida = limite > 0 && Number(molde.ciclos_atuais || 0) >= limite
                const status = vencida ? 'MANUTENÇÃO REQUERIDA' : molde.status
                return (
                  <tr key={molde.id} onClick={() => void openMolde(molde)} className="erp-row-click" tabIndex={0}
                    onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') void openMolde(molde) }}>
                    <td className="font-semibold">{molde.codigo}</td><td>{molde.nome}</td><td>{molde.cavidades || molde.numero_cavidades}</td>
                    <td><div className="min-w-40"><b>{Number(molde.ciclos_atuais || 0).toLocaleString('pt-BR')}</b> / {limite || '—'}<Progress value={percentual} /></div></td>
                    <td>{limite ? Math.round(percentual) + '%' : '—'}</td>
                    <td><span className={vencida ? 'erp-badge-danger' : percentual >= 85 ? 'erp-badge-warn' : 'erp-badge-ok'}>{status}</span></td>
                    <td><span className="inline-flex items-center gap-1"><MapPin size={15} />{molde.localizacao_fisica || 'Não informado'}</span></td>
                  </tr>
                )
              })}
              {!busy && moldes.length === 0 && <tr><td colSpan={7} className="py-8 text-center">Nenhum molde ativo encontrado para a empresa da sessão.</td></tr>}
              {busy && moldes.length === 0 && <tr><td colSpan={7} className="py-8 text-center">Carregando ferramentaria…</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>{selected?.codigo} — {selected?.nome}</DialogTitle>
          <DialogDescription>Ficha técnica do ferramental e histórico de manutenção.</DialogDescription>
          {selected && <div className="mt-5 space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {[['Código', selected.codigo], ['Tipo', selected.tipo], ['Cavidades', selected.cavidades || selected.numero_cavidades], ['Ciclos atuais', Number(selected.ciclos_atuais || 0).toLocaleString('pt-BR')], ['Localização', selected.localizacao_fisica || '—']].map(([label, value]) =>
                <div className="erp-detail-card" key={label}><span>{label}</span><b>{value}</b></div>)}
            </div>
            <section className="erp-card-inner">
              <div className="flex items-center gap-3"><History /><h2>Histórico de manutenções e O.S.</h2></div>
              <div className="erp-table-scroll mt-3">
                <table className="erp-table-v3">
                  <thead><tr><th>Revisão</th><th>Tipo</th><th>Data</th><th>Descrição</th><th>Peças trocadas</th><th>Técnico</th></tr></thead>
                  <tbody>
                    {hist.map(item => <tr key={item.id}><td>Rev. {item.revisao}</td><td>{item.tipo}</td><td>{new Date(item.data_intervencao + 'T00:00:00').toLocaleDateString('pt-BR')}</td><td>{item.descricao}</td><td>{item.pecas_trocadas || '—'}</td><td>{item.tecnico_responsavel || '—'}</td></tr>)}
                    {!historyBusy && hist.length === 0 && <tr><td colSpan={6} className="py-5 text-center">Nenhuma manutenção registrada.</td></tr>}
                    {historyBusy && <tr><td colSpan={6} className="py-5 text-center">Carregando histórico…</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="erp-card-inner">
              <div className="flex items-center gap-3"><Plus /><h2>Registrar ordem de serviço / manutenção</h2></div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label>Tipo<select value={form.tipo} onChange={event => setForm({ ...form, tipo: event.target.value })}><option>Preventiva</option><option>Corretiva</option></select></label>
                <label>Data<input type="date" value={form.data} onChange={event => setForm({ ...form, data: event.target.value })} /></label>
                <label>Técnico responsável<input value={form.tecnico} onChange={event => setForm({ ...form, tecnico: event.target.value })} /></label>
                <label>Peças trocadas<input value={form.pecas} onChange={event => setForm({ ...form, pecas: event.target.value })} /></label>
                <label className="md:col-span-2">Descrição da intervenção<textarea value={form.descricao} onChange={event => setForm({ ...form, descricao: event.target.value })} rows={3} /></label>
                <label className="md:col-span-2 flex items-center gap-2"><input type="checkbox" checked={form.reset} onChange={event => setForm({ ...form, reset: event.target.checked })} /> Preventiva total: zerar ciclos (exige confirmação)</label>
              </div>
              <button type="button" className="erp-btn-primary mt-4" disabled={busy || historyBusy} onClick={() => void save()}><Save size={16} /> Salvar revisão</button>
            </section>
          </div>}
        </DialogContent>
      </Dialog>
    </main>
  )
}
