/**
 * @DATA_REVISAO_APROVACAO: 2026-10-18
 * @STATUS_APROVACAO: PARAMETROS-CODIGO-PREMIUM-UI-OK
 */
import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Plus, RefreshCw, Save, Settings2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type C = {
  id: string
  prefixo: string
  separador: string
  modo_numeracao: string
  sequencia_atual: number
  digitos_produto: number
}

export default function ParametrosCodigo() {
  const [regras, setRegras] = useState<C[]>([])
  const [empresaId, setEmpresaId] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)
  const [savingId, setSavingId] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    setOk('')
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error) throw auth.error
      if (!auth.data.user) throw new Error('Sessão não autenticada.')

      const perfil = await supabase
        .from('erp_usuarios')
        .select('empresa_id')
        .eq('auth_user_id', auth.data.user.id)
        .eq('ativo', true)
        .is('deleted_at', null)
        .maybeSingle()

      if (perfil.error) throw perfil.error
      if (!perfil.data?.empresa_id) throw new Error('Empresa não identificada para o usuário autenticado.')
      setEmpresaId(perfil.data.empresa_id)

      const result = await supabase
        .from('erp_codigos')
        .select('id,prefixo,separador,modo_numeracao,sequencia_atual,digitos_produto')
        .eq('empresa_id', perfil.data.empresa_id)
        .order('prefixo')

      if (result.error) throw result.error
      setRegras((result.data ?? []) as C[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar as regras de codificação.')
      setRegras([])
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const updateLocal = (id: string, field: 'prefixo' | 'separador' | 'modo_numeracao' | 'digitos_produto', value: string | number) => {
    setRegras(current => current.map(regra => regra.id === id ? { ...regra, [field]: value } : regra))
    setOk('')
  }

  const save = async (regra: C) => {
    setError('')
    setOk('')
    setSavingId(regra.id)
    try {
      if (!empresaId) throw new Error('Empresa não carregada. Atualize a listagem antes de salvar.')
      const prefixo = regra.prefixo.trim().toUpperCase()
      if (!prefixo) throw new Error('O prefixo é obrigatório.')
      if (!Number.isInteger(regra.digitos_produto) || regra.digitos_produto < 3 || regra.digitos_produto > 6) {
        throw new Error('A quantidade de dígitos deve ser um número inteiro entre 3 e 6.')
      }

      const result = await supabase
        .from('erp_codigos')
        .update({
          prefixo,
          separador: regra.separador,
          modo_numeracao: regra.modo_numeracao,
          digitos_produto: regra.digitos_produto,
        })
        .eq('id', regra.id)
        .eq('empresa_id', empresaId)
        .select('id')
        .maybeSingle()

      if (result.error) throw result.error
      if (!result.data) throw new Error('Nenhuma regra foi atualizada. Confira o acesso da empresa e as permissões do banco.')
      setRegras(current => current.map(item => item.id === regra.id ? { ...item, prefixo } : item))
      setOk(`Regra ${prefixo} salva no banco de dados.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar a regra.')
    } finally {
      setSavingId('')
    }
  }

  const add = async () => {
    setError('')
    setOk('')
    if (!empresaId) {
      setError('A empresa ainda não foi carregada. Atualize os parâmetros e tente novamente.')
      return
    }
    setBusy(true)
    try {
      const result = await supabase
        .from('erp_codigos')
        .insert({
          empresa_id: empresaId,
          prefixo: 'PL',
          separador: '',
          modo_numeracao: 'PS',
          sequencia_atual: 0,
          digitos_produto: 3,
        })
        .select('id,prefixo,separador,modo_numeracao,sequencia_atual,digitos_produto')
        .single()

      if (result.error) throw result.error
      setRegras(current => [...current, result.data as C].sort((a, b) => a.prefixo.localeCompare(b.prefixo)))
      setOk('Nova regra criada. Revise os parâmetros e salve as alterações.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao criar a regra. Verifique as permissões e restrições do banco.')
    } finally {
      setBusy(false)
    }
  }

  const inputClass = 'h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-sky-600 focus:ring-1 focus:ring-sky-100'

  return (
    <section className="space-y-3 bg-transparent p-1 text-[11px] text-slate-800">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div>
          <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[.18em] text-sky-700">
            <Settings2 size={12} /> Governança e máscara de SKUs
          </p>
          <h2 className="text-base font-bold uppercase leading-tight tracking-tight text-slate-800">Regras de codificação automática</h2>
          <p className="mt-0.5 text-[10px] text-slate-500">Parâmetros da empresa autenticada; as permissões do banco continuam sendo aplicadas.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <a href="/ajuda/parametros-codigo" className="inline-flex h-7 items-center rounded border border-slate-300 bg-white px-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50">POP / Ajuda</a>
          <button type="button" onClick={() => void load()} disabled={busy} aria-label="Atualizar regras" className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw size={12} className={busy ? 'animate-spin' : ''} />
          </button>
          <button type="button" onClick={() => void add()} disabled={busy || !empresaId} className="inline-flex h-7 items-center gap-1 rounded bg-teal-700 px-3 text-[10px] font-black uppercase tracking-wide text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">
            <Plus size={11} /> Nova regra
          </button>
        </div>
      </header>

      {error && <div role="alert" className="flex items-start gap-1.5 rounded border border-red-200 bg-red-50 p-2.5 text-[10px] font-bold text-red-800"><AlertTriangle size={12} className="mt-0.5 shrink-0" />{error}</div>}
      {ok && <div role="status" className="flex items-start gap-1.5 rounded border border-emerald-200 bg-emerald-50 p-2.5 text-[10px] font-bold text-emerald-700"><CheckCircle2 size={12} className="mt-0.5 shrink-0" />{ok}</div>}

      <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-[11px]">
            <thead>
              <tr className="h-8 bg-[#123B50] text-[9px] font-black uppercase tracking-wider text-white">
                <th scope="col" className="w-28 p-2 text-center">Prefixo</th>
                <th scope="col" className="w-28 p-2 text-center">Separador</th>
                <th scope="col" className="w-56 p-2">Modo de numeração</th>
                <th scope="col" className="w-28 p-2 text-center">Dígitos</th>
                <th scope="col" className="w-32 p-2 text-center">Sequência atual</th>
                <th scope="col" className="w-24 p-2 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {regras.map((regra, index) => (
                <tr key={regra.id} className={`h-11 transition-colors hover:bg-sky-50/60 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                  <td className="p-1.5 text-center">
                    <input aria-label={`Prefixo da regra ${regra.prefixo}`} value={regra.prefixo} maxLength={4} onChange={e => updateLocal(regra.id, 'prefixo', e.target.value.toUpperCase())} className={`${inputClass} mx-auto max-w-20 text-center font-mono font-black uppercase text-sky-800`} />
                  </td>
                  <td className="p-1.5 text-center">
                    <input aria-label={`Separador da regra ${regra.prefixo}`} value={regra.separador} maxLength={2} onChange={e => updateLocal(regra.id, 'separador', e.target.value)} className={`${inputClass} mx-auto max-w-16 text-center font-mono font-bold`} placeholder="—" />
                  </td>
                  <td className="p-1.5">
                    <select aria-label={`Modo da regra ${regra.prefixo}`} value={regra.modo_numeracao} onChange={e => updateLocal(regra.id, 'modo_numeracao', e.target.value)} className={inputClass}>
                      <option value="PS">PS — Prefixo e sigla</option>
                      <option value="PGR">PGR — Grupo de produto</option>
                      <option value="NUM">NUM — Numeração pura</option>
                    </select>
                  </td>
                  <td className="p-1.5 text-center">
                    <input aria-label={`Dígitos da regra ${regra.prefixo}`} type="number" min={3} max={6} step={1} value={regra.digitos_produto} onChange={e => updateLocal(regra.id, 'digitos_produto', Math.max(3, Math.min(6, Number(e.target.value) || 3)))} className={`${inputClass} mx-auto max-w-16 text-center font-mono font-bold`} />
                  </td>
                  <td className="p-2 text-center font-mono text-[10px] font-black text-slate-500">{String(regra.sequencia_atual).padStart(regra.digitos_produto, '0')}</td>
                  <td className="p-1.5 text-center">
                    <button type="button" onClick={() => void save(regra)} disabled={busy || savingId === regra.id} className="mx-auto inline-flex h-7 items-center justify-center gap-1 rounded bg-teal-700 px-2.5 text-[9px] font-black uppercase text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-wait disabled:opacity-50">
                      <Save size={10} /> {savingId === regra.id ? 'Salvando' : 'Salvar'}
                    </button>
                  </td>
                </tr>
              ))}
              {!regras.length && (
                <tr><td colSpan={6} className="p-8 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">{busy ? 'Carregando regras...' : 'Nenhuma regra cadastrada para esta empresa. Use “Nova regra” para iniciar.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2 text-[9px] text-slate-500">
          <span>{regras.length} regra(s) carregada(s)</span>
          <span>Campos compactos • gravação por linha • escopo por empresa</span>
        </footer>
      </div>
    </section>
  )
}
