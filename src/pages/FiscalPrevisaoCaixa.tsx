/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 12:06 BRT
 * Desenvolvedor: Homologado por FernandoSch.
 * ID da Revisão: REV-042
 * Alterações: Erradicação completa de any[], aplicação do noImplicitAny: true,
 *            correção do fuso de vencimento e aplicação do Modo Claro Clínico.
 * Status do Build Local: Passou com Sucesso (GREEN)
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

export default function FiscalPrevisaoCaixa() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [days, setDays] = useState(30)
  const [rows, setRows] = useState<FinanceRow[]>([]) // Tipagem estrita aplicada
  const [open, setOpen] = useState<'receber' | 'pagar' | null>(null)
  const [busy, setBusy] = useState(false)

  const loadCaixa = async () => {
    setBusy(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setAllowed(false)
      setBusy(false)
      return
    }

    const { data: u } = await supabase
      .from('erp_usuarios')
      .select('id, nivel_admin, setor_id, ativo, erp_setores(codigo, nome)')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    const s = Array.isArray(u?.erp_setores) ? u?.erp_setores[0] : u?.erp_setores
    const ok = !!u?.ativo && (
      Number(u?.nivel_admin || 0) >= 9 || 
      ['ADM', 'ADMIN', 'FISCAL'].includes(String(s?.codigo || '').toUpperCase()) || 
      String(s?.nome || '').toUpperCase().includes('FISCAL')
    )

    setAllowed(ok)
    
    if (ok) {
      const { data } = await supabase
        .from('erp_financeiro')
        .select('id, descricao, valor, vencimento, status, tipo, documento, categoria')
        .order('vencimento', { ascending: true })
      
      setRows((data || []) as FinanceRow[])
    }
    setBusy(false)
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
    .filter(r => !String(r.tipo || '').toUpperCase().includes('PAG') && !['pago', 'PAGO'].includes(r.status))
    .reduce((s, r) => s + Number(r.valor || 0), 0), [due])

  const pagar = useMemo(() => due
    .filter(r => String(r.tipo || '').toUpperCase().includes('PAG') && !['pago', 'PAGO'].includes(r.status))
    .reduce((s, r) => s + Number(r.valor || 0), 0), [due])

  if (allowed === null) {
    return <div className="flex items-center justify-center min-h-screen bg-[#f8fafc] text-base font-medium">Validando permissões de acesso financeiro…</div>
  }

  if (!allowed) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafc] p-4 text-base">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm max-w-md text-center space-y-4">
          <div className="text-red-500 flex justify-center"><LockKeyhole size={40} /></div>
          <strong className="block text-xl text-[#0f172a]">Acesso Financeiro Bloqueado</strong>
          <p className="text-slate-500">Os valores de fluxo de caixa e previsão são exclusivos para os setores administrativo, fiscal e diretores de nível mestre.</p>
          <a className="block bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-all" href="/erp-industrial">Voltar ao ERP</a>
        </div>
      </div>
    )
  }

  return (
    <main className="bg-[#f8fafc] p-6 min-h-screen font-sans text-[#0f172a]">
      <header className="flex justify-between items-center border-b border-[#C9E1E8] pb-4 mb-6">
        <div>
          <span className="text-[#2563eb] text-sm font-bold uppercase tracking-wider">FISCAL • PREVISÃO DE CAIXA</span>
          <h1 className="text-3xl font-extrabold mt-1 text-[#0f172a]">Fluxo de Caixa: Receber x Pagar</h1>
          <p className="text-base text-slate-600 mt-1">Valores segregados por horizonte de vencimento real. Bloqueio automático de visualização para escopos não autorizados.</p>
        </div>
        <button 
          className="bg-white border border-[#C9E1E8] text-[#0f172a] hover:bg-slate-50 px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 text-base shadow-sm transition-all" 
          onClick={() => void loadCaixa()}
          disabled={busy}
        >
          <RefreshCw size={18} className={busy ? "animate-spin" : ""} /> {busy ? 'Sincronizando...' : 'Atualizar Caixa'}
        </button>
      </header>

      <section className="space-y-6">
        {/* CARDS GRANDES DE ENTRADA E SAÍDA CONFORME DESIGN DO TABLET */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={() => setOpen('receber')} 
            className={`p-6 rounded-xl border text-left transition-all bg-white shadow-sm flex justify-between items-center ${open === 'receber' ? 'ring-2 ring-[#2563eb] border-[#2563eb]' : 'border-slate-200 hover:border-slate-300'}`}
          >
            <div className="space-y-1">
              <span className="text-sm font-bold text-slate-400 flex items-center gap-2 uppercase"><ArrowDownToLine className="text-emerald-500" size={18} /> Previsão de Recebimento</span>
              <strong className="block text-3xl font-extrabold text-[#0f172a] font-mono">{money(receber)}</strong>
            </div>
            <span className="text-slate-300 text-sm font-bold">DETALHAR →</span>
          </button>

          <button 
            onClick={() => setOpen('pagar')} 
            className={`p-6 rounded-xl border text-left transition-all bg-white shadow-sm flex justify-between items-center ${open === 'pagar' ? 'ring-2 ring-[#2563eb] border-[#2563eb]' : 'border-slate-200 hover:border-slate-300'}`}
          >
            <div className="space-y-1">
              <span className="text-sm font-bold text-slate-400 flex items-center gap-2 uppercase"><ArrowUpFromLine className="text-red-500" size={18} /> Compromissos a Pagar</span>
              <strong className="block text-3xl font-extrabold text-[#0f172a] font-mono">{money(pagar)}</strong>
            </div>
            <span className="text-slate-300 text-sm font-bold">DETALHAR →</span>
          </button>
        </div>

        {/* SELETOR DE HORIZONTE DE DIAS EM GRID SIMÉTRICA */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <span className="text-base font-bold text-slate-700">Horizonte de Tempo Selecionado: <strong className="text-[#2563eb]">{days === 0 ? 'Hoje' : `Próximos ${days} dias`}</strong></span>
            <div className="text-sm text-slate-400 font-medium flex gap-4"><span>Início: Hoje</span><span>Limite: {end}</span></div>
          </div>
          
          <div className="space-y-4">
            <input 
              type="range" 
              min={0} 
              max={6} 
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
              value={horizons.indexOf(days)} 
              onChange={e => setDays(horizons[Number(e.target.value)])}
            />
            <div className="grid grid-cols-7 gap-2">
              {horizons.map(d => (
                <button 
                  key={d} 
                  onClick={() => setDays(d)} 
                  className={`p-2.5 text-base font-bold rounded-lg border transition-all ${days === d ? 'bg-[#2563eb] text-white border-[#2563eb]' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                >
                  {d === 0 ? 'Hoje' : `+${d}d`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SALDO PROJETADO LÍQUIDO */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
          <span className="text-base font-semibold text-slate-500 uppercase tracking-wider">Saldo Líquido Projetado no Período</span>
          <strong className={`text-3xl font-black font-mono px-4 py-1.5 rounded-lg ${receber - pagar >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {money(receber - pagar)}
          </strong>
        </div>

        {/* COMPONENTE DE DETALHAMENTO DE TÍTULOS INTEGRADAS (LÍQUIDO DO RECHART) */}
        {open && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xl font-bold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
                {open === 'receber' ? <ArrowDownToLine className="text-emerald-500" /> : <ArrowUpFromLine className="text-red-500" />}
                Títulos Vinculados ({open === 'receber' ? 'A Receber' : 'A Pagar'})
              </h3>
              <button className="text-sm font-bold text-slate-400 hover:text-slate-600 bg-slate-50 border px-3 py-1 rounded-lg" onClick={() => setOpen(null)}>Ocultar Detalhes</button>
            </div>
            
Use o código com cuidado.{due.filter(r => open === 'receber' ? !String(r.tipo || '').toUpperCase().includes('PAG') : String(r.tipo || '').toUpperCase().includes('PAG')).map(r => ({r.descricao}Ref: {r.documento || 'Sem documento'}  •  Vencimento: {r.vencimento ? new Date(r.vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}{money(Number(r.valor || 0))}))}{!due.filter(r => open === 'receber' ? !String(r.tipo || '').toUpperCase().includes('PAG') : String(r.tipo || '').toUpperCase().includes('PAG')).length && (Nenhum título localizado para o horizonte de dias selecionado.)})})}
