/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-06
 * @REVISAO: REV-CENTRAL-EVOLUCAO-20261106-01
 * @STATUS_APROVACAO: ORDEM MASTER 2026-11-06 §7 — painel permanente de acompanhamento do projeto,
 * com Supabase real (erp_central_evolucao_item / _evento / RPCs), filtros e relatório A4.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, Filter, History, ListChecks, Printer, RefreshCw, TriangleAlert } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import { abrirRelatorio } from '../lib/report/abrirRelatorio'
import type { Documento } from '../lib/report/documento'

type Item = {
  id: string
  empresa_id: string | null
  codigo: string
  titulo: string
  descricao: string
  setor: string
  modulo: string
  tipo: string
  prioridade: 'baixa' | 'media' | 'alta' | 'critica'
  situacao: 'pendente' | 'em_andamento' | 'concluido' | 'bloqueado' | 'nao_aplicavel'
  responsavel: string
  origem: string
  arquivo: string
  rota: string
  dependencia: string
  evidencia: string
  ordem: number
  criado_em: string
  updated_at: string
}

type Evento = {
  id: string
  quando: string
  quem: string
  tipo_evento: string
  de_valor: string
  para_valor: string
  nota: string
}

type Resumo = {
  total: number
  pendente: number
  em_andamento: number
  concluido: number
  bloqueado: number
  nao_aplicavel: number
  criticas_abertas: number
  percentual_concluido: number
  por_setor: Record<string, number>
}

const PAGE_SIZE = 25
const MIGRATION = 'supabase/migrations/20261106150000_erp_central_evolucao_v1.sql'

const ROTULO_SITUACAO: Record<Item['situacao'], string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  bloqueado: 'Bloqueado',
  nao_aplicavel: 'Não aplicável',
}
const ROTULO_PRIORIDADE: Record<Item['prioridade'], string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
}
const COR_SITUACAO: Record<Item['situacao'], string> = {
  pendente: 'bg-[#E6A34A]/15 text-[#8a5a1d]',
  em_andamento: 'bg-[#2D8DB8]/15 text-[#123B50]',
  concluido: 'bg-[#3A9D78]/15 text-[#1f5c44]',
  bloqueado: 'bg-[#D65B61]/15 text-[#8f2f34]',
  nao_aplicavel: 'bg-slate-100 text-slate-500',
}

function dataBR(valor: string) {
  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? '—' : data.toLocaleString('pt-BR')
}

export default function CentralEvolucao() {
  const [itens, setItens] = useState<Item[]>([])
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [migrationPendente, setMigrationPendente] = useState(false)
  const [page, setPage] = useState(0)

  const [setorFiltro, setSetorFiltro] = useState('Todos')
  const [moduloFiltro, setModuloFiltro] = useState('Todos')
  const [prioridadeFiltro, setPrioridadeFiltro] = useState('Todas')
  const [situacaoFiltro, setSituacaoFiltro] = useState('Todas')
  const [responsavelFiltro, setResponsavelFiltro] = useState('Todos')
  const [busca, setBusca] = useState('')

  const [abertoId, setAbertoId] = useState<string | null>(null)
  const [eventos, setEventos] = useState<Evento[]>([])
  const [eventosBusy, setEventosBusy] = useState(false)
  const [novaSituacao, setNovaSituacao] = useState<Item['situacao']>('pendente')
  const [nota, setNota] = useState('')
  const [gravando, setGravando] = useState(false)
  const [avisoGravacao, setAvisoGravacao] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    setMigrationPendente(false)
    try {
      const [rows, resumoResult] = await Promise.all([
        fetchAllPages<Item>((from, to) => supabase.from('erp_central_evolucao_item')
          .select('*')
          .order('ordem', { ascending: true })
          .order('codigo', { ascending: true })
          .range(from, to)),
        supabase.rpc('erp_central_evolucao_resumo'),
      ])
      setItens(rows)
      if (resumoResult.error) {
        if (resumoResult.error.code === 'PGRST202') setMigrationPendente(true)
        else throw resumoResult.error
      } else {
        setResumo(resumoResult.data as Resumo)
      }
    } catch (cause) {
      const code = (cause as { code?: string })?.code
      if (code === 'PGRST205' || code === 'PGRST202') setMigrationPendente(true)
      else setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a Central de Evolução.')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const carregarEventos = useCallback(async (itemId: string) => {
    setEventosBusy(true)
    try {
      const rows = await fetchAllPages<Evento>((from, to) => supabase.from('erp_central_evolucao_evento')
        .select('id,quando,quem,tipo_evento,de_valor,para_valor,nota')
        .eq('item_id', itemId)
        .order('quando', { ascending: false })
        .range(from, to))
      setEventos(rows)
    } catch {
      setEventos([])
    } finally {
      setEventosBusy(false)
    }
  }, [])

  const abrirItem = useCallback((item: Item) => {
    if (abertoId === item.id) {
      setAbertoId(null)
      return
    }
    setAbertoId(item.id)
    setNovaSituacao(item.situacao)
    setNota('')
    setAvisoGravacao('')
    void carregarEventos(item.id)
  }, [abertoId, carregarEventos])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return itens.filter(item =>
      (setorFiltro === 'Todos' || item.setor === setorFiltro)
      && (moduloFiltro === 'Todos' || item.modulo === moduloFiltro)
      && (prioridadeFiltro === 'Todas' || item.prioridade === prioridadeFiltro)
      && (situacaoFiltro === 'Todas' || item.situacao === situacaoFiltro)
      && (responsavelFiltro === 'Todos' || item.responsavel === responsavelFiltro)
      && (!termo || `${item.codigo} ${item.titulo} ${item.descricao} ${item.arquivo} ${item.rota}`.toLowerCase().includes(termo)),
    )
  }, [itens, setorFiltro, moduloFiltro, prioridadeFiltro, situacaoFiltro, responsavelFiltro, busca])

  const pageCount = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE))
  const pagina = filtrados.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const setores = useMemo(() => Array.from(new Set(itens.map(item => item.setor))).sort((a, b) => a.localeCompare(b, 'pt-BR')), [itens])
  const modulos = useMemo(() => Array.from(new Set(itens.map(item => item.modulo).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')), [itens])
  const responsaveis = useMemo(() => Array.from(new Set(itens.map(item => item.responsavel).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')), [itens])

  const mudarSituacao = useCallback(async (item: Item) => {
    setGravando(true)
    setAvisoGravacao('')
    try {
      const { error: rpcError } = await supabase.rpc('erp_central_evolucao_mudar_situacao', {
        p_item_id: item.id,
        p_situacao: novaSituacao,
        p_nota: nota,
      })
      if (rpcError) throw rpcError
      setAvisoGravacao('Situação gravada no banco com o evento de histórico correspondente.')
      setNota('')
      await Promise.all([load(), carregarEventos(item.id)])
    } catch (cause) {
      setAvisoGravacao(cause instanceof Error ? cause.message : 'A gravação falhou; a situação anterior foi mantida.')
    } finally {
      setGravando(false)
    }
  }, [novaSituacao, nota, load, carregarEventos])

  const imprimir = useCallback(async () => {
    const documento: Documento = {
      modulo: 'Administração',
      tipo: 'RELATÓRIO',
      titulo: 'Central de Evolução e Conclusão do SYSNQRA',
      codigo: `CE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      subtitulo: 'Agenda de conclusão do sistema — pendências medidas com evidência',
      blocos: [
        ...(resumo ? [{
          tipo: 'campos' as const,
          titulo: 'Resumo consolidado (RLS do usuário atual)',
          colunas: 3 as const,
          itens: [
            { rotulo: 'Total de itens', valor: resumo.total },
            { rotulo: 'Pendentes', valor: resumo.pendente },
            { rotulo: 'Em andamento', valor: resumo.em_andamento },
            { rotulo: 'Concluídos', valor: resumo.concluido },
            { rotulo: 'Bloqueados', valor: resumo.bloqueado },
            { rotulo: 'Críticas em aberto', valor: resumo.criticas_abertas },
            { rotulo: 'Percentual concluído', valor: `${resumo.percentual_concluido}%` },
            { rotulo: 'Itens no filtro atual', valor: filtrados.length },
          ],
        }] : []),
        {
          tipo: 'tabela',
          titulo: 'Itens da agenda (filtro aplicado)',
          colunas: [
            { titulo: 'Código', larguraMm: 18 },
            { titulo: 'Pendência', larguraMm: 62 },
            { titulo: 'Módulo', larguraMm: 24 },
            { titulo: 'Prioridade', larguraMm: 20 },
            { titulo: 'Situação', larguraMm: 26 },
            { titulo: 'Responsável', larguraMm: 26 },
          ],
          linhas: filtrados.map(item => [
            item.codigo,
            item.titulo,
            item.modulo || item.setor,
            ROTULO_PRIORIDADE[item.prioridade],
            ROTULO_SITUACAO[item.situacao],
            item.responsavel || '—',
          ]),
          nota: 'Cada linha desta agenda tem origem, arquivo, rota, dependência e evidência registrados no banco (erp_central_evolucao_item).',
        },
      ],
      observacoes: migrationPendente
        ? `A migration ${MIGRATION} ainda não foi aplicada no banco; este relatório reflete apenas o que o banco devolver.`
        : 'Documento emitido pelo motor de relatórios A4 do SYSNQRA com dados reais do Supabase.',
    }
    await abrirRelatorio(documento)
  }, [resumo, filtrados, migrationPendente])

  return <div className="space-y-6 bg-[#F4FBFD]">
    <header className="border-b border-slate-200 pb-4">
      <span className="block text-xs font-bold uppercase tracking-wider text-[#2D8DB8]">Administração / Acompanhamento do projeto</span>
      <h2 className="text-3xl font-black tracking-tight text-[#123B50]">Central de Evolução e Conclusão</h2>
      <p className="mt-1 text-sm text-slate-500">Agenda permanente de pendências do SYSNQRA, com evidência medida, histórico de status e relatório A4. Itens do produto são visíveis apenas ao MASTER; itens de implantação pertencem à empresa.</p>
    </header>

    {migrationPendente && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-[#E6A34A]/40 bg-[#E6A34A]/10 p-4 text-sm font-semibold text-[#8a5a1d]">
      <TriangleAlert size={20} className="mt-0.5 shrink-0" />
      <span>Migration pendente no banco: aplique <code className="rounded bg-white/70 px-1 py-0.5 text-xs">{MIGRATION}</code> no SQL Editor do Supabase. Sem ela a agenda não existe no banco e nenhum número é simulado aqui.</span>
    </div>}
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

    {resumo && <section className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
      {([
        ['Total', resumo.total, '#123B50'],
        ['Pendentes', resumo.pendente, '#E6A34A'],
        ['Em andamento', resumo.em_andamento, '#2D8DB8'],
        ['Concluídos', resumo.concluido, '#3A9D78'],
        ['Bloqueados', resumo.bloqueado, '#D65B61'],
        ['Críticas abertas', resumo.criticas_abertas, '#D65B61'],
        ['Concluído %', `${resumo.percentual_concluido}%`, '#48B7C7'],
      ] as const).map(([rotulo, valor, cor]) => <div key={rotulo} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400">{rotulo}</span>
        <span className="mt-1 block text-2xl font-black" style={{ color: cor }}>{valor}</span>
      </div>)}
    </section>}

    <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40">
      <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400"><Filter size={17} className="text-[#2D8DB8]" />Filtros da agenda</div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <label className="text-[11px] font-black uppercase text-slate-500">Setor
          <select value={setorFiltro} onChange={event => { setSetorFiltro(event.target.value); setPage(0) }} className="mt-1 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800">
            <option value="Todos">Todos</option>
            {setores.map(setor => <option key={setor} value={setor}>{setor}</option>)}
          </select>
        </label>
        <label className="text-[11px] font-black uppercase text-slate-500">Módulo
          <select value={moduloFiltro} onChange={event => { setModuloFiltro(event.target.value); setPage(0) }} className="mt-1 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800">
            <option value="Todos">Todos</option>
            {modulos.map(modulo => <option key={modulo} value={modulo}>{modulo}</option>)}
          </select>
        </label>
        <label className="text-[11px] font-black uppercase text-slate-500">Prioridade
          <select value={prioridadeFiltro} onChange={event => { setPrioridadeFiltro(event.target.value); setPage(0) }} className="mt-1 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800">
            <option value="Todas">Todas</option>
            {Object.entries(ROTULO_PRIORIDADE).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
          </select>
        </label>
        <label className="text-[11px] font-black uppercase text-slate-500">Situação
          <select value={situacaoFiltro} onChange={event => { setSituacaoFiltro(event.target.value); setPage(0) }} className="mt-1 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800">
            <option value="Todas">Todas</option>
            {Object.entries(ROTULO_SITUACAO).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
          </select>
        </label>
        <label className="text-[11px] font-black uppercase text-slate-500">Responsável
          <select value={responsavelFiltro} onChange={event => { setResponsavelFiltro(event.target.value); setPage(0) }} className="mt-1 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800">
            <option value="Todos">Todos</option>
            {responsaveis.map(responsavel => <option key={responsavel} value={responsavel}>{responsavel}</option>)}
          </select>
        </label>
        <label className="text-[11px] font-black uppercase text-slate-500">Busca livre
          <input value={busca} onChange={event => { setBusca(event.target.value); setPage(0) }} placeholder="Código, título, arquivo, rota…" className="mt-1 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800" />
        </label>
      </div>
    </section>

    <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-6">
        <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400"><ListChecks size={17} className="text-[#2D8DB8]" />Pendências registradas no banco</h3>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} disabled={busy} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-[#123B50] disabled:opacity-50"><RefreshCw size={15} />Atualizar</button>
          <button type="button" onClick={() => void imprimir()} disabled={busy || migrationPendente} className="flex items-center gap-2 rounded-xl bg-[#123B50] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Printer size={15} />Relatório A4</button>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="w-full min-w-[1050px] text-sm">
          <thead className="bg-[#123B50] text-white"><tr>
            <th scope="col" className="p-4 text-left">Código</th>
            <th scope="col" className="p-4 text-left">Pendência</th>
            <th scope="col" className="p-4 text-left">Módulo / setor</th>
            <th scope="col" className="p-4 text-left">Prioridade</th>
            <th scope="col" className="p-4 text-left">Situação</th>
            <th scope="col" className="p-4 text-left">Responsável</th>
            <th scope="col" className="p-4 text-left">Identificada em</th>
          </tr></thead>
          <tbody>
            {busy
              ? <tr><td colSpan={7} className="p-8 text-center text-slate-400">Consultando a agenda no banco…</td></tr>
              : pagina.length
                ? pagina.map(item => <FragmentItem key={item.id} item={item} aberto={abertoId === item.id} eventos={eventos} eventosBusy={eventosBusy} novaSituacao={novaSituacao} nota={nota} gravando={gravando} avisoGravacao={avisoGravacao} onAbrir={() => abrirItem(item)} onSituacao={setNovaSituacao} onNota={setNota} onGravar={() => void mudarSituacao(item)} />)
                : <tr><td colSpan={7} className="p-10 text-center font-bold text-slate-400">{migrationPendente ? 'A tabela da agenda ainda não existe no banco (migration pendente).' : 'Nenhum item corresponde ao filtro atual.'}</td></tr>}
          </tbody>
        </table>
      </div>
      <nav aria-label="Paginação da agenda" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-xs text-slate-500">
        <span>{filtrados.length} item(ns) · página {Math.min(page + 1, pageCount)} de {pageCount}</span>
        <div className="flex gap-2">
          <button type="button" disabled={page === 0 || busy} onClick={() => setPage(current => Math.max(0, current - 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-bold disabled:opacity-50">Anterior</button>
          <button type="button" disabled={page >= pageCount - 1 || busy} onClick={() => setPage(current => Math.min(pageCount - 1, current + 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-bold disabled:opacity-50">Próxima</button>
        </div>
      </nav>
    </section>

    <section className="rounded-3xl border border-cyan-100 bg-white p-6 shadow-xl shadow-slate-200/30">
      <div className="flex items-center gap-2 font-black text-[#123B50]"><ClipboardList size={18} className="text-[#2D8DB8]" />Como esta central é alimentada</div>
      <p className="mt-2 text-sm text-slate-600">Cada linha nasce de uma medição real (probe do banco vivo, grep do repositório ou documento auditado) e fica registrada em <code className="text-xs">erp_central_evolucao_item</code>. Mudanças de situação passam pela RPC <code className="text-xs">erp_central_evolucao_mudar_situacao</code>, que grava o item e o evento na mesma transação sob RLS. Nada aqui usa localStorage ou dado fictício.</p>
    </section>
  </div>
}

function FragmentItem(props: {
  item: Item
  aberto: boolean
  eventos: Evento[]
  eventosBusy: boolean
  novaSituacao: Item['situacao']
  nota: string
  gravando: boolean
  avisoGravacao: string
  onAbrir: () => void
  onSituacao: (valor: Item['situacao']) => void
  onNota: (valor: string) => void
  onGravar: () => void
}) {
  const { item, aberto, eventos, eventosBusy, novaSituacao, nota, gravando, avisoGravacao, onAbrir, onSituacao, onNota, onGravar } = props
  const conclusao = eventos.find(evento => evento.tipo_evento === 'situacao' && evento.para_valor === 'concluido')
  return <>
    <tr className="cursor-pointer border-t border-slate-100 even:bg-slate-50 hover:bg-[#2D8DB8]/5" onClick={onAbrir}>
      <td className="whitespace-nowrap p-4 font-mono text-xs font-bold text-[#2D8DB8]">{item.codigo}</td>
      <td className="p-4 font-bold text-[#123B50]">{item.titulo}</td>
      <td className="p-4 text-xs font-semibold text-slate-600">{item.modulo || '—'}<span className="block text-slate-400">{item.setor}</span></td>
      <td className="p-4 text-xs font-black uppercase">{ROTULO_PRIORIDADE[item.prioridade]}</td>
      <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${COR_SITUACAO[item.situacao]}`}>{ROTULO_SITUACAO[item.situacao]}</span></td>
      <td className="p-4 text-xs font-semibold">{item.responsavel || '—'}</td>
      <td className="whitespace-nowrap p-4 font-mono text-xs">{dataBR(item.criado_em)}</td>
    </tr>
    {aberto && <tr className="border-t border-slate-100 bg-[#F4FBFD]">
      <td colSpan={7} className="p-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="space-y-3 text-sm">
            <p className="text-slate-700">{item.descricao}</p>
            <dl className="grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
              {([
                ['Tipo', item.tipo],
                ['Origem / ordem', item.origem || '—'],
                ['Arquivo', item.arquivo || '—'],
                ['Rota', item.rota || '—'],
                ['Dependência', item.dependencia || '—'],
                ['Escopo', item.empresa_id ? 'Implantação da empresa' : 'Produto SYSNQRA (MASTER)'],
                ['Identificada em', dataBR(item.criado_em)],
                ['Concluída em', conclusao ? dataBR(conclusao.quando) : '—'],
              ] as const).map(([rotulo, valor]) => <div key={rotulo} className="rounded-xl border border-slate-100 bg-white p-3">
                <dt className="font-black uppercase tracking-wide text-slate-400">{rotulo}</dt>
                <dd className="mt-1 break-words font-semibold text-[#123B50]">{valor}</dd>
              </div>)}
            </dl>
            <div className="rounded-xl border border-[#48B7C7]/30 bg-white p-3 text-xs">
              <span className="font-black uppercase tracking-wide text-[#2D8DB8]">Evidência da medição</span>
              <p className="mt-1 text-slate-600">{item.evidencia || '—'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Mudar situação (grava no banco com histórico)</span>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <select value={novaSituacao} onChange={event => onSituacao(event.target.value as Item['situacao'])} className="rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800">
                  {Object.entries(ROTULO_SITUACAO).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
                </select>
                <input value={nota} onChange={event => onNota(event.target.value)} placeholder="Nota da mudança (opcional)" className="min-w-[220px] flex-1 rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800" />
                <button type="button" onClick={event => { event.stopPropagation(); onGravar() }} disabled={gravando || novaSituacao === item.situacao} className="rounded-xl bg-[#2D8DB8] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{gravando ? 'Gravando…' : 'Gravar situação'}</button>
              </div>
              {avisoGravacao && <p className="mt-2 text-xs font-bold text-[#123B50]">{avisoGravacao}</p>}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400"><History size={15} className="text-[#2D8DB8]" />Histórico de mudanças</div>
            {eventosBusy
              ? <p className="text-sm text-slate-400">Carregando histórico…</p>
              : eventos.length
                ? <ol className="space-y-2">
                  {eventos.map(evento => <li key={evento.id} className="rounded-xl border border-slate-100 bg-white p-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-black text-[#123B50]">{evento.tipo_evento === 'criado' ? 'Item cadastrado' : `${evento.de_valor || '—'} → ${evento.para_valor}`}</span>
                      <span className="font-mono text-slate-400">{dataBR(evento.quando)}</span>
                    </div>
                    <p className="mt-1 text-slate-500">por {evento.quem || 'sistema'}{evento.nota ? ` — ${evento.nota}` : ''}</p>
                  </li>)}
                </ol>
                : <p className="text-sm text-slate-400">Nenhum evento registrado para este item.</p>}
          </div>
        </div>
      </td>
    </tr>}
  </>
}