/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
/**
 * @DATA_REVISAO_ANTERIOR: 2026-10-19
 * @DESENVOLVEDOR: FernandoSch
 * @NOME_SISTEMA: MOLDPLÁS ERP INDUSTRIAL
 * @STATUS_ANTERIOR: CONTROLE-PROCESSO-INJETORA-PREMIUM-OK
 * Revisão visual: Steel Blue, controles compactos, cantos retos e impressão A4 paisagem.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, Clock3, Factory, Plus, Printer, RefreshCw, Save, ShieldCheck, Thermometer } from 'lucide-react'
import ERPHorizontalShell from '../../components/layout/ERPHorizontalShell'
import { supabase } from '../../lib/supabaseClient'

type Lookup = { id: string; codigo?: string | null; nome?: string | null; nome_fantasia?: string | null; numero_op?: string | null; lote_interno?: string | null; status_inspecao?: string | null }
type Control = {
  id: string; data_producao: string; status: string; maquina_id: string; operador_id: string;
  ordem_producao_id: string | null; quantidade_total_pecas: number; numero_cavidades: number;
  hora_inicio: string | null; hora_fim: string | null; material_atual: string | null; cor_atual: string | null;
  observacoes: string | null; criado_em: string; pom_guilhotina_fechada: boolean; pom_residuo_consumido: boolean;
  temp_zona1: number | null; temp_zona2: number | null; temp_zona3: number | null; temp_zona4: number | null; temp_bico: number | null; temp_molde: number | null
}
type Sample = { id: string; numero_injecao: number; quantidade_inspecionada: number; resultado: 'APROVADO' | 'REPROVADO'; defeitos_observados: string | null; material_segregado: boolean; criado_em: string }
type Downtime = { id: string; hora_parada: string; hora_retorno: string | null; motivo: string; criado_em: string }

type FormState = {
  ordem_producao_id: string; maquina_id: string; operador_id: string; produto_id: string; lote_id: string;
  data_producao: string; turno: string; hora_inicio: string; hora_fim: string;
  quantidade_injecoes: string; numero_cavidades: string; quantidade_total_pecas: string;
  temp_zona1: string; temp_zona2: string; temp_zona3: string; temp_zona4: string; temp_bico: string; temp_molde: string;
  material_anterior: string; material_atual: string; cor_anterior: string; cor_atual: string;
  limpeza_cilindro_confirmada: boolean; limpeza_funil_confirmada: boolean; purga_sem_residuo_confirmada: boolean;
  borra_descartada: boolean; pom_procedimento_confirmado: boolean; pom_guilhotina_fechada: boolean;
  pom_residuo_consumido: boolean; pecas_iniciais_segregadas: boolean; ficha_processo_disponivel: boolean;
  checklist_maquina_ok: boolean; molde_verificado: boolean; comparacao_amostra_padrao: boolean;
  liberacao_qualidade: boolean; liberacao_provisoria: boolean; responsavel_liberacao_id: string; observacoes: string
}

const today = () => {
  const d = new Date()
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}
const emptyForm = (): FormState => ({
  ordem_producao_id: '', maquina_id: '', operador_id: '', produto_id: '', lote_id: '',
  data_producao: today(), turno: '', hora_inicio: '', hora_fim: '',
  quantidade_injecoes: '0', numero_cavidades: '1', quantidade_total_pecas: '0',
  temp_zona1: '', temp_zona2: '', temp_zona3: '', temp_zona4: '', temp_bico: '', temp_molde: '',
  material_anterior: '', material_atual: '', cor_anterior: '', cor_atual: '',
  limpeza_cilindro_confirmada: false, limpeza_funil_confirmada: false, purga_sem_residuo_confirmada: false,
  borra_descartada: false, pom_procedimento_confirmado: false, pom_guilhotina_fechada: false,
  pom_residuo_consumido: false, pecas_iniciais_segregadas: false, ficha_processo_disponivel: false,
  checklist_maquina_ok: false, molde_verificado: false, comparacao_amostra_padrao: false,
  liberacao_qualidade: false, liberacao_provisoria: false, responsavel_liberacao_id: '', observacoes: ''
})
const inputClass = 'h-8 w-full min-w-0 rounded-none border border-[#2E4A62] bg-[#0E1E2F] px-2.5 text-xs font-mono font-bold text-[#F4FBFD] outline-none transition-all placeholder:text-slate-400 focus:border-[#48B7C7] focus:ring-1 focus:ring-[#48B7C7]/20'
const areaClass = 'min-h-[62px] w-full min-w-0 rounded-none border border-[#2E4A62] bg-[#0E1E2F] p-2 text-xs leading-4 text-[#F4FBFD] outline-none focus:border-[#48B7C7]'
const labelClass = 'mb-1 block text-[9px] font-black uppercase tracking-widest text-[#A8BBC8]'
const buttonClass = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-none border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-black uppercase tracking-wide text-white transition-colors hover:bg-[#236f91] disabled:opacity-50'
const secondaryClass = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-none border border-[#2E4A62] bg-[#0E1E2F] px-3 text-[10px] font-bold text-[#F4FBFD] transition-colors hover:bg-[#123B50] disabled:opacity-50'
const checks: { key: keyof FormState; label: string }[] = [
  { key: 'limpeza_cilindro_confirmada', label: 'Cilindro limpo na troca de material/cor' },
  { key: 'limpeza_funil_confirmada', label: 'Funil limpo, centralizado e travado' },
  { key: 'purga_sem_residuo_confirmada', label: 'Purga concluída sem vestígio visual anterior' },
  { key: 'borra_descartada', label: 'Borra segregada/descarte confirmado quando materiais diferem' },
  { key: 'pecas_iniciais_segregadas', label: 'Peças iniciais segregadas e descartadas' },
  { key: 'ficha_processo_disponivel', label: 'Ficha de Processo e Peça Padrão disponíveis' },
  { key: 'checklist_maquina_ok', label: 'Checklist de liberação da máquina conferido' },
  { key: 'molde_verificado', label: 'Molde/ferramental verificado e registrado' }
]
function optionLabel(row: Lookup) { return row.codigo ? row.codigo + ' — ' + (row.nome ?? '') : row.numero_op ?? row.nome ?? row.nome_fantasia ?? row.lote_interno ?? row.id }
function datePt(value: string) { return new Date(value).toLocaleString('pt-BR') }

export default function ControleProcessoInjetora() {
  const [empresaId, setEmpresaId] = useState('')
  const [userId, setUserId] = useState('')
  const [machines, setMachines] = useState<Lookup[]>([])
  const [operators, setOperators] = useState<Lookup[]>([])
  const [orders, setOrders] = useState<Lookup[]>([])
  const [products, setProducts] = useState<Lookup[]>([])
  const [lots, setLots] = useState<Lookup[]>([])
  const [records, setRecords] = useState<Control[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [selected, setSelected] = useState<Control | null>(null)
  const [samples, setSamples] = useState<Sample[]>([])
  const [downtimes, setDowntimes] = useState<Downtime[]>([])
  const [sampleForm, setSampleForm] = useState({ numero_injecao: '', quantidade_inspecionada: '2', resultado: 'APROVADO' as 'APROVADO' | 'REPROVADO', defeitos_observados: '', material_segregado: false })
  const [stopForm, setStopForm] = useState({ hora_parada: '', hora_retorno: '', motivo: '' })
  const [finalHour, setFinalHour] = useState('')
  const [finalPomGuilhotina, setFinalPomGuilhotina] = useState(false)
  const [finalPomResiduo, setFinalPomResiduo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error || !auth.data.user) throw new Error('Entre no ERP para registrar o controle de processo.')
      setUserId(auth.data.user.id)
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw new Error('Empresa da sessão não identificada.')
      setEmpresaId(company.data)
      const [m, o, op, p, l, c] = await Promise.all([
        supabase.from('erp_maquinas').select('id,codigo,nome').eq('empresa_id', company.data).eq('ativo', true).order('codigo'),
        supabase.from('erp_usuarios').select('id,nome,email').eq('empresa_id', company.data).eq('ativo', true).is('deleted_at', null).order('nome'),
        supabase.from('erp_ordens_producao').select('id,numero_op').eq('empresa_id', company.data).order('criado_em', { ascending: false }).limit(200),
        supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', company.data).eq('ativo', true).order('codigo').limit(500),
        supabase.from('erp_estoque_lotes').select('id,lote_interno,status_inspecao').eq('empresa_id', company.data).neq('status_inspecao', 'RETIDO').order('created_at', { ascending: false }).limit(500),
        supabase.from('erp_qualidade_controles_injetora').select('id,data_producao,status,maquina_id,operador_id,ordem_producao_id,quantidade_total_pecas,numero_cavidades,hora_inicio,hora_fim,material_atual,cor_atual,observacoes,criado_em,pom_guilhotina_fechada,pom_residuo_consumido,temp_zona1,temp_zona2,temp_zona3,temp_zona4,temp_bico,temp_molde').eq('empresa_id', company.data).order('criado_em', { ascending: false }).limit(100)
      ])
      for (const result of [m, o, op, p, l, c]) if (result.error) throw result.error
      setMachines((m.data ?? []) as Lookup[]); setOperators((o.data ?? []) as Lookup[])
      setOrders((op.data ?? []) as Lookup[]); setProducts((p.data ?? []) as Lookup[])
      setLots((l.data ?? []) as Lookup[]); setRecords((c.data ?? []) as Control[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar o controle de injetora.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const selectedMachine = useMemo(() => machines.find(row => row.id === form.maquina_id), [machines, form.maquina_id])
  const isPom = /POM|POLIACETAL/i.test(form.material_atual)
  const coreChecksComplete = checks.every(item => Boolean(form[item.key])) && (!isPom || form.pom_procedimento_confirmado)
  const canRelease = coreChecksComplete && form.numero_cavidades.trim() !== '' && Number(form.numero_cavidades) > 0

  const openRecord = async (record: Control) => {
    setSelected(record); setError(''); setNotice('')
    setFinalHour(record.hora_fim ?? '')
    setFinalPomGuilhotina(record.pom_guilhotina_fechada)
    setFinalPomResiduo(record.pom_residuo_consumido)
    const [s, d] = await Promise.all([
      supabase.from('erp_qualidade_injetora_amostras').select('id,numero_injecao,quantidade_inspecionada,resultado,defeitos_observados,material_segregado,criado_em').eq('empresa_id', empresaId).eq('controle_id', record.id).order('numero_injecao'),
      supabase.from('erp_qualidade_injetora_paradas').select('id,hora_parada,hora_retorno,motivo,criado_em').eq('empresa_id', empresaId).eq('controle_id', record.id).order('hora_parada')
    ])
    if (s.error || d.error) { setError(s.error?.message ?? d.error?.message ?? 'Falha ao carregar detalhes.'); return }
    setSamples((s.data ?? []) as Sample[]); setDowntimes((d.data ?? []) as Downtime[])
  }

  const saveControl = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      if (!empresaId || !userId) throw new Error('Sessão/empresa não identificada.')
      if (!form.maquina_id || !form.operador_id) throw new Error('Máquina e operador são obrigatórios.')
      if (form.hora_inicio && form.hora_fim && form.hora_fim < form.hora_inicio) throw new Error('O horário final não pode ser anterior ao inicial.')
      if (form.liberacao_qualidade && !form.responsavel_liberacao_id) throw new Error('Informe quem realizou a liberação da Qualidade.')
      if (form.liberacao_provisoria && !form.comparacao_amostra_padrao) throw new Error('Liberação provisória exige comparação visual com a Amostra Padrão.')
      if (form.liberacao_provisoria && !canRelease) throw new Error('Complete os checklists de preparação antes da liberação provisória.')
      if ((form.liberacao_qualidade || form.liberacao_provisoria) && !form.responsavel_liberacao_id) throw new Error('Informe o responsável pela liberação.')
      if (form.liberacao_qualidade && !canRelease) throw new Error('Complete os checklists de limpeza, purga, peças iniciais, ficha, máquina e molde antes de liberar.')
      if (isPom && form.liberacao_qualidade && !form.pom_procedimento_confirmado) throw new Error('Confirme o procedimento de segurança para POM antes da liberação.')
      const status = form.liberacao_qualidade ? 'LIBERADO' : form.liberacao_provisoria ? 'LIBERACAO_PROVISORIA' : coreChecksComplete ? 'AGUARDANDO_QUALIDADE' : 'RASCUNHO'
      const payload = {
        empresa_id: empresaId, ordem_producao_id: form.ordem_producao_id || null, maquina_id: form.maquina_id,
        operador_id: form.operador_id, produto_id: form.produto_id || null, lote_id: form.lote_id || null,
        data_producao: form.data_producao, turno: form.turno.trim() || null, hora_inicio: form.hora_inicio || null,
        hora_fim: form.hora_fim || null, quantidade_injecoes: Math.max(0, Number(form.quantidade_injecoes) || 0),
        temp_zona1: form.temp_zona1 === '' ? null : Number(form.temp_zona1),
        temp_zona2: form.temp_zona2 === '' ? null : Number(form.temp_zona2),
        temp_zona3: form.temp_zona3 === '' ? null : Number(form.temp_zona3),
        temp_zona4: form.temp_zona4 === '' ? null : Number(form.temp_zona4),
        temp_bico: form.temp_bico === '' ? null : Number(form.temp_bico),
        temp_molde: form.temp_molde === '' ? null : Number(form.temp_molde),
        numero_cavidades: Math.max(1, Number(form.numero_cavidades) || 1), quantidade_total_pecas: Math.max(0, Number(form.quantidade_total_pecas) || 0),
        material_anterior: form.material_anterior.trim() || null, material_atual: form.material_atual.trim() || null,
        cor_anterior: form.cor_anterior.trim() || null, cor_atual: form.cor_atual.trim() || null,
        limpeza_cilindro_confirmada: form.limpeza_cilindro_confirmada, limpeza_funil_confirmada: form.limpeza_funil_confirmada,
        purga_sem_residuo_confirmada: form.purga_sem_residuo_confirmada, borra_descartada: form.borra_descartada,
        pom_procedimento_confirmado: form.pom_procedimento_confirmado, pom_guilhotina_fechada: form.pom_guilhotina_fechada,
        pom_residuo_consumido: form.pom_residuo_consumido, pecas_iniciais_segregadas: form.pecas_iniciais_segregadas,
        ficha_processo_disponivel: form.ficha_processo_disponivel, checklist_maquina_ok: form.checklist_maquina_ok,
        molde_verificado: form.molde_verificado, comparacao_amostra_padrao: form.comparacao_amostra_padrao,
        liberacao_qualidade: form.liberacao_qualidade, liberacao_provisoria: form.liberacao_provisoria,
        responsavel_liberacao_id: form.responsavel_liberacao_id || null, status, observacoes: form.observacoes.trim() || null,
        criado_por: userId, atualizado_em: new Date().toISOString()
      }
      const result = await supabase.from('erp_qualidade_controles_injetora').insert(payload).select('id').single()
      if (result.error) throw result.error
      setNotice('Controle de processo salvo. Situação: ' + status.replaceAll('_', ' ') + '.')
      setForm(emptyForm()); await load()
      const created = (await supabase.from('erp_qualidade_controles_injetora').select('id,data_producao,status,maquina_id,operador_id,ordem_producao_id,quantidade_total_pecas,numero_cavidades,hora_inicio,hora_fim,material_atual,cor_atual,observacoes,criado_em,pom_guilhotina_fechada,pom_residuo_consumido,temp_zona1,temp_zona2,temp_zona3,temp_zona4,temp_bico,temp_molde').eq('id', result.data.id).single())
      if (!created.error && created.data) await openRecord(created.data as Control)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o controle.') }
    finally { setBusy(false) }
  }

  const addSample = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!selected) return
    setBusy(true); setError(''); setNotice('')
    try {
      const number = Number(sampleForm.numero_injecao)
      if (!Number.isInteger(number) || number < 1) throw new Error('Informe o número da injeção inspecionada.')
      if (sampleForm.resultado === 'REPROVADO' && (!sampleForm.defeitos_observados.trim() || !sampleForm.material_segregado)) throw new Error('Para reprovação, descreva o defeito e confirme a segregação do material.')
      const result = await supabase.from('erp_qualidade_injetora_amostras').insert({
        empresa_id: empresaId, controle_id: selected.id, numero_injecao: number,
        quantidade_inspecionada: Math.max(1, Number(sampleForm.quantidade_inspecionada) || 2),
        resultado: sampleForm.resultado, defeitos_observados: sampleForm.defeitos_observados.trim() || null,
        material_segregado: sampleForm.material_segregado, criado_por: userId
      })
      if (result.error) throw result.error
      setSampleForm({ numero_injecao: '', quantidade_inspecionada: '2', resultado: 'APROVADO', defeitos_observados: '', material_segregado: false })
      setNotice('Amostragem registrada.')
      await openRecord(selected)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao registrar amostra.') }
    finally { setBusy(false) }
  }

  const addDowntime = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!selected) return
    setBusy(true); setError(''); setNotice('')
    try {
      if (!stopForm.hora_parada || !stopForm.motivo.trim()) throw new Error('Horário da parada e motivo exato são obrigatórios.')
      if (stopForm.hora_retorno && stopForm.hora_retorno < stopForm.hora_parada) throw new Error('O retorno não pode ser anterior à parada.')
      const result = await supabase.from('erp_qualidade_injetora_paradas').insert({
        empresa_id: empresaId, controle_id: selected.id, hora_parada: stopForm.hora_parada,
        hora_retorno: stopForm.hora_retorno || null, motivo: stopForm.motivo.trim(), criado_por: userId
      })
      if (result.error) throw result.error
      setStopForm({ hora_parada: '', hora_retorno: '', motivo: '' })
      setNotice('Parada registrada no Diário de Bordo.')
      await openRecord(selected)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao registrar parada.') }
    finally { setBusy(false) }
  }

  const closeProduction = async () => {
    if (!selected) return
    setBusy(true); setError(''); setNotice('')
    try {
      if (selected.status === 'ENCERRADO') throw new Error('Este registro já está encerrado.')
      if (/POM|POLIACETAL/i.test(selected.material_atual ?? '') && (!finalPomGuilhotina || !finalPomResiduo)) {
        throw new Error('Para encerrar lote com POM, confirme fechamento da guilhotina e consumo de todo o material do canhão.')
      }
      const result = await supabase.from('erp_qualidade_controles_injetora').update({
        status: 'ENCERRADO', hora_fim: finalHour || selected.hora_fim, pom_guilhotina_fechada: finalPomGuilhotina,
        pom_residuo_consumido: finalPomResiduo, atualizado_em: new Date().toISOString()
      }).eq('empresa_id', empresaId).eq('id', selected.id).select('id').single()
      if (result.error) throw result.error
      setNotice('Produção encerrada e controles finais registrados.')
      await load()
      const updated = records.find(row => row.id === selected.id)
      if (updated) await openRecord({ ...updated, status: 'ENCERRADO' })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao encerrar produção.') }
    finally { setBusy(false) }
  }

  const checkbox = (key: keyof FormState, labelText: string) => (
    <label key={key} className="flex items-start gap-2 rounded-[2px] border border-[#2E4A62] bg-[#0D2638] p-2 text-[10px] leading-4 text-[#D9E5EC]">
      <input type="checkbox" className="mt-0.5 accent-[#2D8DB8]" checked={Boolean(form[key])} onChange={e => setForm(current => ({ ...current, [key]: e.target.checked }))} />
      <span>{labelText}</span>
    </label>
  )

  return <ERPHorizontalShell>
    <main className="pcp-injetora-page min-h-screen bg-[#0E1E2F] p-3 font-mono text-[#F4FBFD] antialiased">
      <style>{'@media print{.no-print{display:none!important}.pcp-injetora-page{background:#fff!important;color:#111827!important;padding:0!important}.pcp-injetora-page *{color:#111827!important;box-shadow:none!important}.pcp-injetora-page section,.pcp-injetora-page form,.pcp-injetora-page aside,.pcp-injetora-page header{background:#fff!important;border-color:#cbd5e1!important}.pcp-injetora-page input,.pcp-injetora-page select,.pcp-injetora-page textarea{background:#fff!important;border-color:#cbd5e1!important;color:#111827!important}.pcp-injetora-page{font-family:Arial,sans-serif!important}@page{size:A4 landscape;margin:10mm}}'}</style>
      <div className="mx-auto max-w-[1600px] space-y-3">
        <div className="hidden print:block border-b-2 border-slate-900 pb-2 text-[#F4FBFD]"><h1 className="text-base font-black uppercase">MOLDPLÁS ERP INDUSTRIAL — Controle de Processo da Injetora</h1><p className="text-[9px]">Emitido em {new Date().toLocaleString()} • Desenvolvedor FernandoSch • Registro controlado do SGQ</p></div>
        <header className="flex flex-wrap items-center gap-3 border border-[#2E4A62] bg-[#0D2638] p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[2px] bg-[#123B50] text-white"><Factory size={18} /></div>
          <div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#2D8DB8]">SGQ • INJETADOS • IT-IJ-001 Rev. 00</p><h1 className="text-[15px] font-black">Controle de Processo da Injetora</h1><p className="text-[10px] text-slate-400">CCPP • liberação de máquina • amostragem • Diário de Bordo</p></div>
          <div className="no-print ml-auto flex flex-wrap gap-2"><button className={secondaryClass} type="button" onClick={() => window.print()}><Printer size={13} /> Imprimir A4</button><button className={secondaryClass} type="button" onClick={() => void load()} disabled={loading || busy}><RefreshCw size={13} /> Atualizar</button><span className="self-center text-[9px] text-slate-400">Próxima revisão da IT: 05/06/2028</span></div>
        </header>
        <div className="border border-amber-500 bg-[#332817] p-2 text-[10px] leading-4 text-amber-100">
          <strong className="flex items-center gap-1"><AlertTriangle size={13} /> ALERTA CRÍTICO — POM / POLIACETAL</strong>
          Se o material atual for POM, confirme o procedimento de segurança. Uma hora antes do término planejado, fechar a guilhotina do funil para consumir o material do canhão; nunca encerrar o lote deixando POM no cilindro.
        </div>
        {(error || notice) && <div role="status" className={'border p-2 text-[10px] ' + (error ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800')}>{error || notice}</div>}
        <section className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.8fr)]">
          <form onSubmit={saveControl} className="space-y-3 border border-[#2E4A62] bg-[#0D2638] p-3">
            <div className="flex items-center justify-between border-b border-[#2E4A62] pb-2"><h2 className="text-[11px] font-black uppercase tracking-wide">Cartão de Controle de Processo Produtivo (CCPP)</h2><span className="text-[9px] text-slate-400">Preencher sem rasuras</span></div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <label><span className={labelClass}>Data da produção *</span><input className={inputClass} type="date" required value={form.data_producao} onChange={e => setForm({ ...form, data_producao: e.target.value })} /></label>
              <label><span className={labelClass}>Turno</span><input className={inputClass} value={form.turno} onChange={e => setForm({ ...form, turno: e.target.value })} placeholder="Ex.: 1º turno" /></label>
              <label><span className={labelClass}>Ordem de produção</span><select className={inputClass} value={form.ordem_producao_id} onChange={e => setForm({ ...form, ordem_producao_id: e.target.value })}><option value="">Selecione OP</option>{orders.map(row => <option key={row.id} value={row.id}>{optionLabel(row)}</option>)}</select></label>
              <label><span className={labelClass}>Máquina / Tag *</span><select className={inputClass} required value={form.maquina_id} onChange={e => setForm({ ...form, maquina_id: e.target.value })}><option value="">Selecione máquina</option>{machines.map(row => <option key={row.id} value={row.id}>{optionLabel(row)}</option>)}</select></label>
              <label><span className={labelClass}>Operador *</span><select className={inputClass} required value={form.operador_id} onChange={e => setForm({ ...form, operador_id: e.target.value })}><option value="">Selecione operador</option>{operators.map(row => <option key={row.id} value={row.id}>{optionLabel(row)}</option>)}</select></label>
              <label><span className={labelClass}>Produto</span><select className={inputClass} value={form.produto_id} onChange={e => setForm({ ...form, produto_id: e.target.value })}><option value="">Selecione produto</option>{products.map(row => <option key={row.id} value={row.id}>{optionLabel(row)}</option>)}</select></label>
              <label><span className={labelClass}>Lote / rastreabilidade</span><select className={inputClass} value={form.lote_id} onChange={e => setForm({ ...form, lote_id: e.target.value })}><option value="">Selecione lote</option>{lots.map(row => <option key={row.id} value={row.id}>{optionLabel(row)}</option>)}</select></label>
              <label><span className={labelClass}>Início</span><input className={inputClass} type="time" value={form.hora_inicio} onChange={e => setForm({ ...form, hora_inicio: e.target.value })} /></label>
              <label><span className={labelClass}>Término planejado/real</span><input className={inputClass} type="time" value={form.hora_fim} onChange={e => setForm({ ...form, hora_fim: e.target.value })} /></label>
              <label><span className={labelClass}>Nº de injeções/prensadas</span><input className={inputClass} type="number" min="0" value={form.quantidade_injecoes} onChange={e => setForm({ ...form, quantidade_injecoes: e.target.value })} /></label>
              <label><span className={labelClass}>Nº de cavidades *</span><input className={inputClass} type="number" min="1" required value={form.numero_cavidades} onChange={e => setForm({ ...form, numero_cavidades: e.target.value })} /></label>
              <label><span className={labelClass}>Quantidade total produzida</span><input className={inputClass} type="number" min="0" step="1" value={form.quantidade_total_pecas} onChange={e => setForm({ ...form, quantidade_total_pecas: e.target.value })} /></label>
              <label><span className={labelClass}>Material anterior</span><input className={inputClass} value={form.material_anterior} onChange={e => setForm({ ...form, material_anterior: e.target.value })} /></label>
              <label><span className={labelClass}>Material atual</span><input className={inputClass} value={form.material_atual} onChange={e => setForm({ ...form, material_atual: e.target.value })} placeholder="Identificar POM se aplicável" /></label>
              <label><span className={labelClass}>Cor anterior</span><input className={inputClass} value={form.cor_anterior} onChange={e => setForm({ ...form, cor_anterior: e.target.value })} /></label>
              <label><span className={labelClass}>Cor atual</span><input className={inputClass} value={form.cor_atual} onChange={e => setForm({ ...form, cor_atual: e.target.value })} /></label>
            </div>
            <section aria-label="Perfil térmico da injetora" className="border border-[#2E4A62] bg-[#0E1E2F] p-2">
              <div className="mb-2 flex items-center gap-2 border-b border-[#2E4A62] pb-2"><Thermometer size={15} className="text-[#48B7C7]" /><h3 className="text-[10px] font-black uppercase tracking-wide">Perfil térmico — temperaturas reais (°C)</h3></div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {([{ key: 'temp_zona1', label: 'Zona 1' }, { key: 'temp_zona2', label: 'Zona 2' }, { key: 'temp_zona3', label: 'Zona 3' }, { key: 'temp_zona4', label: 'Zona 4' }, { key: 'temp_bico', label: 'Bico' }, { key: 'temp_molde', label: 'Molde' }] as const).map(item => <label key={item.key} className="min-w-0"><span className={labelClass}>{item.label} · °C</span><input className={inputClass + ' text-center'} aria-label={'Temperatura ' + item.label + ' em graus Celsius'} type="number" min="0" max={item.key === 'temp_molde' ? 300 : 500} step="0.1" value={form[item.key]} onChange={e => setForm(current => ({ ...current, [item.key]: e.target.value }))} placeholder="—" /></label>)}
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1" aria-label="Diagrama das zonas de aquecimento">
                {(['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4'] as const).map((zone, index) => <div key={zone} className="border border-[#2E4A62] bg-[#123B50] p-2 text-center"><div className="mx-auto mb-1 h-1.5 w-7 rounded-full bg-[#E6A34A]" /><span className="block text-[9px] font-black">{zone}</span><span className="text-[10px] font-bold text-[#48B7C7]">{form[(['temp_zona1', 'temp_zona2', 'temp_zona3', 'temp_zona4'] as const)[index]] || '—'} °C</span></div>)}
              </div>
            </section>
            <div className="border-t border-[#2E4A62] pt-2"><h3 className="mb-2 text-[10px] font-black uppercase">Preparação e liberação inicial</h3><div className="grid gap-2 md:grid-cols-2">{checks.map(item => checkbox(item.key, item.label))}</div></div>
            {isPom && <div className="grid gap-2 border border-amber-500 bg-[#332817] p-2 md:grid-cols-3">
              {checkbox('pom_procedimento_confirmado', 'Li e confirmei o procedimento crítico de segurança POM')}
              {checkbox('pom_guilhotina_fechada', 'Guilhotina do funil fechada antes do fim do lote')}
              {checkbox('pom_residuo_consumido', 'Todo POM consumido; cilindro sem resíduo ao encerrar')}
            </div>}
            <div className="grid gap-2 md:grid-cols-2">
              {checkbox('comparacao_amostra_padrao', 'Comparação visual realizada com a Peça Padrão (necessária para liberação provisória)')}
              {checkbox('liberacao_qualidade', 'Liberação formal inicial realizada pela Qualidade')}
              {checkbox('liberacao_provisoria', 'Liberação provisória pelo Líder (somente na ausência da Qualidade)')}
            </div>
            <label><span className={labelClass}>Responsável pela liberação</span><select className={inputClass} value={form.responsavel_liberacao_id} onChange={e => setForm({ ...form, responsavel_liberacao_id: e.target.value })}><option value="">Selecione responsável</option>{operators.map(row => <option key={row.id} value={row.id}>{optionLabel(row)}</option>)}</select></label>
            <label><span className={labelClass}>Observações do processo</span><textarea className={areaClass} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} /></label>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#2E4A62] pt-2"><span className="text-[9px] text-slate-400">{selectedMachine ? 'Máquina selecionada: ' + optionLabel(selectedMachine) : 'Selecione a máquina correta da empresa.'} • status calculado pelas confirmações</span><div className="flex gap-2"><button className={secondaryClass} type="button" onClick={() => { setForm(emptyForm()); setSelected(null); setSamples([]); setDowntimes([]); setError(''); setNotice('') }}>Limpar</button><button className={buttonClass} type="submit" disabled={busy || loading}><Save size={13} /> Salvar controle</button></div></div>
          </form>
          <aside className="no-print space-y-3">
            <section className="border border-[#2E4A62] bg-[#0D2638] p-3">
              <div className="mb-2 flex items-center justify-between"><h2 className="text-[11px] font-black uppercase">Registros recentes</h2><span className="text-[9px] text-slate-400">{records.length} registros</span></div>
              {loading ? <p className="text-[10px] text-slate-400">Carregando dados reais do ERP…</p> : records.length === 0 ? <p className="text-[10px] text-slate-400">Ainda não há controles de injetora nesta empresa.</p> :
                <div className="max-h-[460px] space-y-1 overflow-auto">{records.map(row => <button type="button" key={row.id} onClick={() => void openRecord(row)} className={'w-full border p-2 text-left ' + (selected?.id === row.id ? 'border-[#2D8DB8] bg-[#123B50]' : 'border-[#2E4A62] bg-[#0D2638] hover:bg-[#0E1E2F]')}><div className="flex items-center justify-between gap-2"><strong className="text-[10px]">{row.data_producao} • {row.status.replaceAll('_', ' ')}</strong><span className="text-[9px] text-slate-400">{Number(row.quantidade_total_pecas).toLocaleString('pt-BR')} peças</span></div><p className="mt-1 text-[9px] text-slate-400">Criado {datePt(row.criado_em)}</p></button>)}</div>}
            </section>
            {selected && <section className="space-y-3 border border-[#2E4A62] bg-[#0D2638] p-3">
              <div className="flex items-center justify-between"><h2 className="text-[11px] font-black uppercase">Acompanhamento do registro</h2><span className="text-[9px] font-bold text-[#2D8DB8]">{selected.status.replaceAll('_', ' ')}</span></div>
              <form onSubmit={addSample} className="space-y-2 border-t border-[#2E4A62] pt-2">
                <h3 className="text-[10px] font-black uppercase">Amostragem volante — cabos: 2 peças por injeção</h3>
                <div className="grid grid-cols-2 gap-2"><label><span className={labelClass}>Nº da injeção *</span><input className={inputClass} type="number" min="1" required value={sampleForm.numero_injecao} onChange={e => setSampleForm({ ...sampleForm, numero_injecao: e.target.value })} /></label><label><span className={labelClass}>Peças verificadas</span><input className={inputClass} type="number" min="1" required value={sampleForm.quantidade_inspecionada} onChange={e => setSampleForm({ ...sampleForm, quantidade_inspecionada: e.target.value })} /></label></div>
                <label><span className={labelClass}>Resultado</span><select className={inputClass} value={sampleForm.resultado} onChange={e => setSampleForm({ ...sampleForm, resultado: e.target.value as 'APROVADO' | 'REPROVADO' })}><option value="APROVADO">Aprovado</option><option value="REPROVADO">Reprovado</option></select></label>
                {sampleForm.resultado === 'REPROVADO' && <><label><span className={labelClass}>Defeito observado *</span><textarea required className={areaClass} value={sampleForm.defeitos_observados} onChange={e => setSampleForm({ ...sampleForm, defeitos_observados: e.target.value })} /></label><label className="flex items-center gap-2 text-[10px]"><input type="checkbox" checked={sampleForm.material_segregado} onChange={e => setSampleForm({ ...sampleForm, material_segregado: e.target.checked })} /> Material reprovado separado em caixa identificada</label></>}
                <button className={buttonClass} type="submit" disabled={busy}><Plus size={13} /> Registrar amostra</button>
                <div className="space-y-1">{samples.map(sample => <div key={sample.id} className="border border-[#2E4A62] p-2 text-[9px]"><strong>Injeção {sample.numero_injecao}</strong> • {sample.quantidade_inspecionada} peças • <span className={sample.resultado === 'REPROVADO' ? 'text-rose-700' : 'text-emerald-700'}>{sample.resultado}</span>{sample.defeitos_observados && <p>{sample.defeitos_observados}</p>}</div>)}</div>
              </form>
              <form onSubmit={addDowntime} className="space-y-2 border-t border-[#2E4A62] pt-2">
                <h3 className="flex items-center gap-1 text-[10px] font-black uppercase"><Clock3 size={13} /> Diário de Bordo — paradas</h3>
                <div className="grid grid-cols-2 gap-2"><label><span className={labelClass}>Hora da parada *</span><input className={inputClass} type="time" required value={stopForm.hora_parada} onChange={e => setStopForm({ ...stopForm, hora_parada: e.target.value })} /></label><label><span className={labelClass}>Hora do retorno</span><input className={inputClass} type="time" value={stopForm.hora_retorno} onChange={e => setStopForm({ ...stopForm, hora_retorno: e.target.value })} /></label></div>
                <label><span className={labelClass}>Motivo exato da parada *</span><textarea className={areaClass} required value={stopForm.motivo} onChange={e => setStopForm({ ...stopForm, motivo: e.target.value })} /></label>
                <button className={secondaryClass} type="submit" disabled={busy}><Plus size={13} /> Registrar parada</button>
                <div className="space-y-1">{downtimes.map(stop => <div key={stop.id} className="border border-[#2E4A62] p-2 text-[9px]"><strong>{stop.hora_parada} → {stop.hora_retorno ?? 'em aberto'}</strong><p>{stop.motivo}</p></div>)}</div>
              </form>
              <div className="border-t border-[#2E4A62] pt-2">
                <label className="mb-2 block"><span className={labelClass}>Horário real de término</span><input className={inputClass} type="time" value={finalHour} onChange={e => setFinalHour(e.target.value)} /></label>
                {/POM|POLIACETAL/i.test(selected.material_atual ?? '') && <div className="mb-2 grid gap-2 border border-amber-300 bg-amber-50 p-2 text-[10px]">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={finalPomGuilhotina} onChange={e => setFinalPomGuilhotina(e.target.checked)} /> Guilhotina fechada antes do fim do lote</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={finalPomResiduo} onChange={e => setFinalPomResiduo(e.target.checked)} /> Todo POM consumido; cilindro sem resíduo</label>
                </div>}
                <p className="mb-2 text-[9px] text-slate-400">Encerrar registra o término real e, para POM, exige confirmar o esvaziamento seguro do cilindro.</p>
                <button type="button" className={buttonClass} disabled={busy || selected.status === 'ENCERRADO' || !['LIBERADO', 'LIBERACAO_PROVISORIA', 'EM_PRODUCAO'].includes(selected.status)} onClick={() => void closeProduction()}><ShieldCheck size={13} /> Encerrar produção</button>
              </div>
            </section>}
          </aside>
        </section>
        <footer className="flex flex-wrap justify-between gap-2 border-t border-[#2E4A62] px-1 py-2 text-[9px] text-slate-400"><span>SYSNQRA ERP & SGQ INDUSTRIAL • IT-IJ-001 Rev. 00 • Departamento de Injetados</span><span>Registro operacional auditável • documentos originais permanecem sob controle do GED</span></footer>
      </div>
    </main>
  </ERPHorizontalShell>
}
