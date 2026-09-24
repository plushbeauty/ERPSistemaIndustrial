import { useEffect, useState } from 'react'
import { History, Plus, RefreshCw, Save } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog'

// Inclusão do 'empresa_id' na interface mestre para erradicar sub-queries redundantes
type Eq = {
  id: string;
  empresa_id: string;
  codigo: string;
  descricao: string;
  fabricante: string | null;
  modelo: string | null;
  status: string;
  proxima_calibracao: string | null;
  setor_localizacao: string | null;
  ultima_calibracao: string | null;
  numero_certificado_atual: string | null;
}

type H = {
  id: string;
  revisao: number;
  numero_certificado: string;
  data_calibracao: string;
  proxima_calibracao: string | null;
  laboratorio: string | null;
  resultado: string;
  observacao: string | null;
}

export default function CalibracaoIndustrial() {
  const [equip, setEquip] = useState<Eq[]>([])
  const [sel, setSel] = useState<Eq | null>(null)
  const [hist, setHist] = useState<H[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    cert: '',
    data: new Date().toISOString().slice(0, 10),
    proxima: '',
    laboratorio: '',
    resultado: 'Aprovado',
    observacao: ''
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setBusy(true)
    setError('')
    const r = await supabase
      .from('erp_equipamentos_medicao')
      .select('id, empresa_id, codigo, descricao, fabricante, modelo, status, proxima_calibracao, setor_localizacao, ultima_calibracao, numero_certificado_atual')
      .order('codigo')
      
    if (r.error) setError(r.error.message)
    setEquip((r.data || []) as Eq[])
    setBusy(false)
  }

  async function openEq(e: Eq) {
    setSel(e)
    setOpen(true)
    const r = await supabase
      .from('erp_qualidade_calibracoes_historico')
      .select('id, revisao, numero_certificado, data_calibracao, proxima_calibracao, laboratorio, resultado, observacao')
      .eq('equipamento_id', e.id)
      .order('revisao', { ascending: false })
      
    if (r.error) setError(r.error.message)
    setHist((r.data || []) as H[])
  }

  async function save() {
    if (!sel || !form.cert || !form.data) {
      setError('Informe o número do certificado e a data da calibração.')
      return
    }
    setBusy(true)
    setError('')
    
    const rev = (hist[0]?.revisao ?? -1) + 1
    const empresa = sel.empresa_id

    if (!empresa) {
      setError('Identificação da empresa vinculada ao instrumento falhou.')
      setBusy(false)
      return
    }

    // Inserção da nova revisão diretamente na tabela de histórico filha
    const h = await supabase.from('erp_qualidade_calibracoes_historico').insert({
      empresa_id: empresa,
      equipamento_id: sel.id,
      revisao: rev,
      numero_certificado: form.cert,
      data_calibracao: form.data,
      proxima_calibracao: form.proxima || null,
      laboratorio: form.laboratorio,
      resultado: form.resultado,
      observacao: form.observacao
    })

    if (h.error) {
      setError(h.error.message)
      setBusy(false)
      return
    }

    // Atualização do status e certificado corrente na tabela mestre pai
    const u = await supabase.from('erp_equipamentos_medicao').update({
      ultima_calibracao: form.data,
      proxima_calibracao: form.proxima || null,
      numero_certificado_atual: form.cert,
      status: form.resultado
    }).eq('id', sel.id)

    if (u.error) setError(u.error.message)

    await load()

    // Recarregamento da Ficha Técnica higienizado, eliminando o cast ambíguo
    const freshResult = await supabase
      .from('erp_equipamentos_medicao')
      .select('id, empresa_id, codigo, descricao, fabricante, modelo, status, proxima_calibracao, setor_localizacao, ultima_calibracao, numero_certificado_atual')
      .eq('id', sel.id)
      .single()

    if (freshResult.data) {
      await openEq(freshResultResult.data as Eq)
    }

    setForm({ ...form, cert: '', observacao: '', proxima: '', laboratorio: '' })
    setBusy(false)
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <main className="erp-page-v3 bg-[#F4FBFD] p-6 min-h-screen font-sans text-[#17333F]">
      <header className="erp-page-header-v3 flex justify-between items-center border-b border-[#C9E1E8] pb-4 mb-6">
        <div>
          <span className="text-[#48B7C7] text-sm font-bold tracking-wider uppercase">SGQ • METROLOGIA</span>
          <h1 className="text-3xl font-extrabold text-[#123B50] mt-1">Calibração e Equipamentos de Medição</h1>
          <p className="text-base text-slate-600 mt-1">Rastreabilidade viva de instrumentos, certificados, revisões e localização física de ativos.</p>
        </div>
        <button 
          className="erp-btn-secondary bg-white border border-[#C9E1E8] text-[#123B50] hover:bg-slate-50 px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 shadow-sm text-base" 
          onClick={() => void load()}
          disabled={busy}
        >
          <RefreshCw size={18} className={busy ? "animate-spin" : ""} /> Atualizar
        </button>
      </header>

      {error && <div className="erp-alert-error bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 font-medium text-base">{error}</div>}

      <section className="erp-card-v3 bg-white p-6 rounded-xl border border-[#C9E1E8] shadow-sm">
        <h2 className="text-xl font-bold text-[#123B50]">Instrumentos de Inspeção</h2>
        <div className="erp-table-scroll mt-4 overflow-x-auto">
          <table className="erp-table-v3 w-full text-left border-collapse text-base">
            <thead>
              <tr className="border-b border-[#C9E1E8] bg-slate-50 text-[#17333F] font-semibold">
                <th className="p-3">Código</th>
                <th className="p-3">Descrição</th>
                <th className="p-3">Fabricante / Modelo</th>
                <th className="p-3">Setor de Localização</th>
                <th className="p-3">Status</th>
                <th className="p-3">Próxima Calibração</th>
                <th className="p-3">Certificado Atual</th>
              </tr>
            </thead>
            <tbody>
              {equip.map(e => (
                <tr 
                  key={e.id} 
                  className="erp-row-click border-b border-slate-100 hover:bg-[#EAF7FB] cursor-pointer transition-colors" 
                  onClick={() => void openEq(e)}
                >
                  <td className="p-3 font-bold text-[#123B50]">{e.codigo}</td>
                  <td className="p-3">{e.descricao}</td>
                  <td className="p-3">{e.fabricante || '—'} / {e.modelo || '—'}</td>
                  <td className="p-3 text-slate-600">{e.setor_localizacao || '—'}</td>
                  <td className="p-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      e.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="p-3 font-medium">{e.proxima_calibracao || '—'}</td>
                  <td className="p-3 text-slate-500 font-mono">{e.numero_certificado_atual || '—'}</td>
                </tr>
              ))}
              {equip.length === 0 && !busy && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">Nenhum instrumento de medição localizado na base.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-6 rounded-xl">
          <DialogTitle className="text-2xl font-bold text-[#123B50]">{sel?.codigo} — Ficha Técnica de Metrologia</DialogTitle>
          <DialogDescription className="text-base text-slate-500">Histórico de revisões e controle de laudos laboratoriais ativos.</DialogDescription>
          
          {sel && (
            <div className="space-y-6 mt-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  ['Código', sel.codigo],
                  ['Descrição', sel.descricao],
                  ['Fabricante', sel.fabricante || '—'],
                  ['Setor Alocado', sel.setor_localizacao || '—'],
                  ['Status', sel.status]
                ].map(x => (
                  <div className="erp-detail-card bg-[#F7FCFE] p-3 rounded-lg border border-[#C9E1E8]" key={x[0]}>
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide">{x[0]}</span>
                    <b className="block text-base text-[#123B50] mt-1 break-words">{x[1]}</b>
                  </div>
                ))}
              </div>

              <section className="erp-card-inner border border-slate-100 p-4 rounded-xl">
                <h2 className="flex items-center gap-2 text-lg font-bold text-[#123B50] border-b pb-2"><History size={20} className="text-[#2D8DB8]" /> Histórico de Laudos e Revisões (Rastreabilidade)</h2>
                <div className="erp-table-scroll mt-4 max-h-48 overflow-y-auto">
                  <table className="erp-table-v3 w-full text-left text-base">
                    <thead>
                      <tr className="border-b bg-slate-50 font-semibold text-slate-600">
                        <th className="p-2">Revisão</th>
                        <th className="p-2">Nº Certificado</th>
                        <th className="p-2">Data Emissão</th>
                        <th className="p-2">Laboratório Homologador</th>
                        <th className="p-2">Resultado</th>
                      </tr>
                    </thead>
Use o código com cuidado.{hist.map(h => (Rev. {h.revisao}{h.numero_certificado}{h.data_calibracao}{h.laboratorio || '—'}))})})}
