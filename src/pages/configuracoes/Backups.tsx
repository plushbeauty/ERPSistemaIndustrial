/**
 * @DATA_REVISAO_APROVACAO: 2026-10-18
 * @STATUS_APROVACAO: CONSOLE-BACKUPS-PREMIUM-UI-OK
 * @ESCOPO: histórico real de logs por empresa; nenhuma simulação de backup físico.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Clock3, DatabaseBackup, FileWarning, HardDrive, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type BackupLog = {
  id: string
  tamanho_mb: number | null
  status: string | null
  tipo: string | null
  responsavel_nome: string | null
  created_at: string | null
  hash_verificacao: string | null
}

const inputClass = 'h-8 w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-800 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-100'
const buttonClass = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-[2px] border px-2.5 text-[10px] font-black uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50'

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR')
}

function statusClass(status: string | null) {
  const value = (status ?? '').toUpperCase()
  if (['CONCLUIDO', 'SUCESSO', 'SUCCESS', 'COMPLETED'].includes(value)) return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (['FALHA', 'ERRO', 'FAILED', 'ERROR'].includes(value)) return 'border-red-200 bg-red-50 text-red-800'
  if (['EXECUTANDO', 'EM_ANDAMENTO', 'RUNNING', 'PENDENTE'].includes(value)) return 'border-amber-200 bg-amber-50 text-amber-800'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

export default function Backups() {
  const [backups, setBackups] = useState<BackupLog[]>([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState('')
  const [empresaId, setEmpresaId] = useState('')

  const loadBackups = useCallback(async () => {
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!userData.user) throw new Error('Sessão não autenticada. Entre novamente para consultar os registros.')

      const { data: companyData, error: companyError } = await supabase.rpc('erp_current_empresa_id')
      if (companyError) throw new Error('Não foi possível resolver a empresa da sessão: ' + companyError.message)
      if (!companyData) throw new Error('A sessão não possui empresa ativa. Nenhum registro foi consultado.')

      const company = String(companyData)
      setEmpresaId(company)

      const { data, error: queryError } = await supabase
        .from('erp_logs_backups')
        .select('id,tamanho_mb,status,tipo,responsavel_nome,created_at,hash_verificacao')
        .eq('empresa_id', company)
        .order('created_at', { ascending: false })
        .limit(200)

      if (queryError) throw new Error('Histórico de backups indisponível: ' + queryError.message)
      setBackups((data ?? []) as BackupLog[])
      if (!data?.length) setNotice('A consulta foi concluída, mas não há registros de backup para esta empresa.')
    } catch (err) {
      setBackups([])
      setError(err instanceof Error ? err.message : 'Falha ao consultar o histórico de backups.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadBackups() }, [loadBackups])

  const filteredLogs = useMemo(() => {
    const query = filter.trim().toLocaleLowerCase('pt-BR')
    return backups.filter((item) =>
      !query || [item.tipo, item.status, item.responsavel_nome, item.hash_verificacao]
        .some((value) => (value ?? '').toLocaleLowerCase('pt-BR').includes(query)),
    )
  }, [backups, filter])

  const metrics = useMemo(() => ({
    total: backups.length,
    sizeMb: backups.reduce((total, item) => total + Math.max(0, Number(item.tamanho_mb) || 0), 0),
    failures: backups.filter((item) => ['FALHA', 'ERRO', 'FAILED', 'ERROR'].includes((item.status ?? '').toUpperCase())).length,
    successes: backups.filter((item) => ['CONCLUIDO', 'SUCESSO', 'SUCCESS', 'COMPLETED'].includes((item.status ?? '').toUpperCase())).length,
  }), [backups])

  // A execução física de snapshots exige uma RPC de servidor confirmada e autorizada.
  // Não disparar uma função presumida: isso poderia aparentar sucesso sem gerar backup real.
  const requestManualBackup = async () => {
    setBusy(true)
    setError('')
    setNotice('A execução manual permanece bloqueada até a RPC de snapshot, suas permissões e o destino de armazenamento serem validados no banco.')
    setBusy(false)
  }

  return (
    <section className="space-y-3 bg-transparent p-1 text-[11px] text-slate-700">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 pb-2">
        <div>
          <span className="block text-[9px] font-black uppercase tracking-[.16em] text-[#2D8DB8]">ADMINISTRAÇÃO • CONTINUIDADE</span>
          <h2 className="mt-1 text-base font-black text-[#123B50]">Console de Backups e Continuidade</h2>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500">Histórico transacional por empresa e monitoramento dos resultados registrados.</p>
        </div>
        <span className="inline-flex h-7 items-center gap-1 rounded-[2px] border border-sky-200 bg-sky-50 px-2 text-[9px] font-black uppercase text-sky-800">
          <ShieldCheck size={12} /> Escopo de empresa aplicado
        </span>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-[2px] border border-red-200 bg-red-50 p-2.5 text-[10px] font-bold text-red-800"><AlertCircle size={14} className="mt-0.5 shrink-0" />{error}</div>}
      {notice && <div role="status" className="flex items-start gap-2 rounded-[2px] border border-amber-200 bg-amber-50 p-2.5 text-[10px] font-bold text-amber-900"><FileWarning size={14} className="mt-0.5 shrink-0" />{notice}</div>}

      <section className="grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Indicadores de backup">
        <article className="flex min-w-0 items-center justify-between gap-2 rounded-[2px] border border-slate-200 border-l-4 border-l-sky-600 bg-white p-2.5">
          <div><span className="block text-[9px] font-black uppercase tracking-wide text-slate-500">Registros consultados</span><strong className="mt-1 block font-mono text-lg font-black text-[#123B50]">{loading ? '—' : metrics.total}</strong></div>
          <DatabaseBackup size={17} className="shrink-0 text-sky-700" />
        </article>
        <article className="flex min-w-0 items-center justify-between gap-2 rounded-[2px] border border-slate-200 border-l-4 border-l-cyan-600 bg-white p-2.5">
          <div><span className="block text-[9px] font-black uppercase tracking-wide text-slate-500">Tamanho registrado</span><strong className="mt-1 block font-mono text-lg font-black text-cyan-800">{loading ? '—' : (metrics.sizeMb / 1024).toFixed(2) + ' GB'}</strong></div>
          <HardDrive size={17} className="shrink-0 text-cyan-700" />
        </article>
        <article className="flex min-w-0 items-center justify-between gap-2 rounded-[2px] border border-slate-200 border-l-4 border-l-emerald-600 bg-white p-2.5">
          <div><span className="block text-[9px] font-black uppercase tracking-wide text-slate-500">Conclusões registradas</span><strong className="mt-1 block font-mono text-lg font-black text-emerald-800">{loading ? '—' : metrics.successes}</strong></div>
          <CheckCircle2 size={17} className="shrink-0 text-emerald-700" />
        </article>
        <article className={'flex min-w-0 items-center justify-between gap-2 rounded-[2px] border border-slate-200 border-l-4 bg-white p-2.5 ' + (metrics.failures ? 'border-l-red-600' : 'border-l-slate-400')}>
          <div><span className="block text-[9px] font-black uppercase tracking-wide text-slate-500">Falhas registradas</span><strong className={'mt-1 block font-mono text-lg font-black ' + (metrics.failures ? 'text-red-700' : 'text-slate-700')}>{loading ? '—' : metrics.failures}</strong></div>
          <AlertCircle size={17} className={'shrink-0 ' + (metrics.failures ? 'text-red-600' : 'text-slate-400')} />
        </article>
      </section>

      <section className="grid grid-cols-1 items-end gap-2 rounded-[2px] border border-slate-200 bg-white p-2.5 md:grid-cols-12">
        <label className="grid gap-1 md:col-span-8">
          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-slate-500"><Search size={11} /> Pesquisar histórico</span>
          <input className={inputClass} value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Tipo, status, responsável ou hash de verificação..." />
        </label>
        <div className="flex gap-1.5 md:col-span-4">
          <button type="button" className={buttonClass + ' flex-1 border-slate-300 bg-white text-slate-700 hover:bg-slate-50'} onClick={() => void loadBackups()} disabled={loading || busy}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
          <button type="button" className={buttonClass + ' flex-1 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'} onClick={() => void requestManualBackup()} disabled={busy}>
            <DatabaseBackup size={12} /> {busy ? 'Validando…' : 'Backup manual'}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2px] border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-[#F4FBFD] px-3 py-2">
          <h3 className="text-[10px] font-black uppercase tracking-wide text-[#123B50]">Histórico de snapshots registrados</h3>
          <span className="text-[9px] font-bold text-slate-500">{empresaId ? 'Empresa vinculada à sessão' : 'Aguardando sessão'} • máximo de 200 registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left">
            <thead className="bg-slate-100 text-[9px] font-black uppercase tracking-wide text-slate-600">
              <tr>{['Data / hora', 'Tipo', 'Tamanho', 'Hash de verificação', 'Responsável', 'Status'].map((label) => <th key={label} className="border-b border-slate-200 px-2.5 py-2">{label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={6} className="px-3 py-8 text-center text-[10px] font-bold text-slate-500"><RefreshCw size={14} className="mr-1 inline animate-spin" /> Consultando registros autorizados…</td></tr>
                : filteredLogs.length === 0 ? <tr><td colSpan={6} className="px-3 py-8 text-center text-[10px] font-semibold text-slate-500">Nenhum registro correspondente à consulta.</td></tr>
                  : filteredLogs.map((item) => <tr key={item.id} className="h-9 hover:bg-sky-50/60">
                    <td className="whitespace-nowrap px-2.5 py-2 font-mono text-[10px]">{formatDate(item.created_at)}</td>
                    <td className="px-2.5 py-2 text-[10px] font-bold">{item.tipo || '—'}</td>
                    <td className="whitespace-nowrap px-2.5 py-2 font-mono text-[10px]">{item.tamanho_mb == null ? '—' : Number(item.tamanho_mb).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' MB'}</td>
                    <td className="max-w-[240px] truncate px-2.5 py-2 font-mono text-[9px]" title={item.hash_verificacao || ''}>{item.hash_verificacao || 'Não informado'}</td>
                    <td className="px-2.5 py-2 text-[10px]">{item.responsavel_nome || '—'}</td>
                    <td className="px-2.5 py-2"><span className={'inline-flex rounded-[2px] border px-1.5 py-1 text-[9px] font-black uppercase ' + statusClass(item.status)}>{item.status || 'SEM STATUS'}</span></td>
                  </tr>)}
            </tbody>
          </table>
        </div>
      </section>
      <footer className="flex flex-wrap items-start gap-2 border-t border-slate-200 pt-2 text-[9px] font-medium text-slate-500">
        <Clock3 size={12} className="mt-0.5 shrink-0" />
        <p>Esta tela apresenta apenas os logs retornados pelo banco. Não comprova a existência de arquivos físicos, criptografia, retenção GFS nem teste de restauração. A execução manual será habilitada após validar a função de servidor, as permissões e o destino do snapshot.</p>
      </footer>
    </section>
  )
}
