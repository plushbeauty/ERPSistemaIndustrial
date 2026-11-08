/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-08
 * @REVISAO: REV-CRONOGRAMA-CORES-20261108-01 — grade anual colorida por situação, status calculado só a partir das O.S. reais de erp_manutencao_ordens, cadastro de máquinas na própria tela e painel de calibração dos instrumentos
 * @STATUS_APROVACAO: ORDEM EXPLICITA DO PROPRIETARIO EM 2026-11-08 — "fazer tela de manutencao preventiva cronograma com corres e puxar as maquinas do cadastro ... fazer a tela colorida para melhor visualizacao colocar legenda nas cores"
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CalendarPlus, Plus, RefreshCw, Ruler, Search, Wrench, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Maquina = { id: string; codigo: string; nome: string; tipo: string | null; fabricante: string | null; modelo: string | null; status: string | null; ativo: boolean | null }
type Ordem = { id: string; numero_os: string | null; ativo_id: string; tipo: string; descricao: string; status: string; data_prevista: string | null }
type Instrumento = { id: string; codigo: string; descricao: string; setor: string | null; status: string; proxima_calibracao: string | null }

type Codigo = 'P' | 'PE' | 'AT' | 'M' | 'D'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const SITUACOES: Record<Codigo, { rotulo: string; cor: string; classe: string }> = {
  P: { rotulo: 'Programado', cor: '#D9E1F2', classe: 'bg-[#D9E1F2] text-[#1E3A8A]' },
  PE: { rotulo: 'Programado e executado', cor: '#C6EFCE', classe: 'bg-[#C6EFCE] text-[#14532D]' },
  AT: { rotulo: 'Em atraso', cor: '#FFC7CE', classe: 'bg-[#FFC7CE] text-[#7F1D1D]' },
  M: { rotulo: 'Em manutenção', cor: '#FFF2CC', classe: 'bg-[#FFF2CC] text-[#78350F]' },
  D: { rotulo: 'Desativado', cor: '#E0E0E0', classe: 'bg-[#E0E0E0] text-[#334155]' },
}

const SITUACOES_INSTRUMENTO = {
  BLOQUEADO: { rotulo: 'Bloqueado / reprovado', cor: '#E0E0E0', classe: 'bg-[#E0E0E0] text-[#334155]' },
  VENCIDO: { rotulo: 'Calibração vencida', cor: '#FFC7CE', classe: 'bg-[#FFC7CE] text-[#7F1D1D]' },
  A_VENCER: { rotulo: 'Vence em até 30 dias', cor: '#FFF2CC', classe: 'bg-[#FFF2CC] text-[#78350F]' },
  EM_DIA: { rotulo: 'Calibração em dia', cor: '#C6EFCE', classe: 'bg-[#C6EFCE] text-[#14532D]' },
  SEM_DATA: { rotulo: 'Sem próxima calibração', cor: '#D9E1F2', classe: 'bg-[#D9E1F2] text-[#1E3A8A]' },
} as const

type SituacaoInstrumento = keyof typeof SITUACOES_INSTRUMENTO

const input = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-[#123B50] outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#B9E1ED]'
const rotulo = 'grid gap-[3px] text-[9px] font-semibold uppercase tracking-[.04em] text-slate-600'
const botao = 'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] bg-[#2D8DB8] px-3 text-[10px] font-bold text-white disabled:opacity-50'
const botaoClaro = 'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] font-semibold text-[#123B50] disabled:opacity-50'

const hojeTexto = () => new Date().toISOString().slice(0, 10)
const normalizar = (valor: string | null | undefined) => String(valor ?? '').trim().toUpperCase().replaceAll(' ', '_')
const erroTexto = (causa: unknown, reserva: string) => causa instanceof Error ? causa.message : reserva

function situacaoDoMes(maquina: Maquina, ordens: Ordem[], hoje: string): Codigo | '' {
  if (maquina.ativo === false) return 'D'
  if (ordens.length === 0) return ''
  const abertas = ordens.filter(ordem => !['CONCLUIDA', 'CANCELADA'].includes(normalizar(ordem.status)))
  if (abertas.some(ordem => Boolean(ordem.data_prevista && ordem.data_prevista < hoje))) return 'AT'
  if (abertas.some(ordem => normalizar(ordem.status) === 'EM_EXECUCAO')) return 'M'
  if (abertas.some(ordem => normalizar(ordem.status) === 'ABERTA')) return 'P'
  return ordens.some(ordem => normalizar(ordem.status) === 'CONCLUIDA') ? 'PE' : ''
}

function situacaoDoInstrumento(instrumento: Instrumento, hoje: string): SituacaoInstrumento {
  const status = normalizar(instrumento.status)
  if (['BLOQUEADO', 'REPROVADO', 'INATIVO'].includes(status)) return 'BLOQUEADO'
  if (!instrumento.proxima_calibracao) return 'SEM_DATA'
  if (instrumento.proxima_calibracao < hoje) return 'VENCIDO'
  const dias = Math.round((Date.parse(instrumento.proxima_calibracao) - Date.parse(hoje)) / 86400000)
  return dias <= 30 ? 'A_VENCER' : 'EM_DIA'
}

function dataBr(valor: string | null) {
  if (!valor) return '—'
  const [ano, mes, dia] = valor.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

export default function ManutencaoCronograma() {
  const [maquinas, setMaquinas] = useState<Maquina[]>([])
  const [ordens, setOrdens] = useState<Ordem[]>([])
  const [instrumentos, setInstrumentos] = useState<Instrumento[]>([])
  const [empresaId, setEmpresaId] = useState('')
  const [ano, setAno] = useState(() => new Date().getFullYear())
  const [busca, setBusca] = useState('')
  const [mostrarInativas, setMostrarInativas] = useState(true)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [erroMetrologia, setErroMetrologia] = useState('')

  const [modalMaquina, setModalMaquina] = useState(false)
  const [formMaquina, setFormMaquina] = useState({ codigo: '', nome: '', tipo: 'MÁQUINA', fabricante: '', modelo: '', status: 'ATIVA' })

  const [modalPreventiva, setModalPreventiva] = useState<{ aberto: boolean; maquinaId: string; data: string; descricao: string; prioridade: string }>({ aberto: false, maquinaId: '', data: '', descricao: '', prioridade: 'MEDIA' })

  const carregar = async () => {
    setCarregando(true)
    setErro('')
    let tenant = ''
    try {
      const empresa = await supabase.rpc('erp_current_empresa_id')
      if (empresa.error || !empresa.data) throw empresa.error ?? new Error('Empresa da sessão não identificada.')
      tenant = String(empresa.data)
      setEmpresaId(tenant)
      const inicio = `${ano}-01-01`
      const fim = `${ano + 1}-01-01`
      const [listaMaquinas, listaOrdens] = await Promise.all([
        fetchAllPages<Maquina>((from, to) => supabase.from('erp_maquinas')
          .select('id,codigo,nome,tipo,fabricante,modelo,status,ativo', { count: 'exact' })
          .eq('empresa_id', tenant).order('codigo').range(from, to)),
        fetchAllPages<Ordem>((from, to) => supabase.from('erp_manutencao_ordens')
          .select('id,numero_os,ativo_id,tipo,descricao,status,data_prevista', { count: 'exact' })
          .eq('empresa_id', tenant).gte('data_prevista', inicio).lt('data_prevista', fim)
          .order('data_prevista').range(from, to)),
      ])
      setMaquinas(listaMaquinas)
      setOrdens(listaOrdens)
    } catch (causa) {
      setMaquinas([])
      setOrdens([])
      setErro(erroTexto(causa, 'Não foi possível carregar máquinas e ordens de serviço.'))
    } finally {
      setCarregando(false)
    }
    if (!tenant) { setInstrumentos([]); return }
    try {
      const lista = await fetchAllPages<Instrumento>((from, to) => supabase.from('erp_equipamentos_medicao')
        .select('id,codigo,descricao,setor,status,proxima_calibracao', { count: 'exact' })
        .eq('empresa_id', tenant).order('codigo').range(from, to))
      setInstrumentos(lista)
      setErroMetrologia('')
    } catch (causa) {
      setInstrumentos([])
      setErroMetrologia(erroTexto(causa, 'Não foi possível consultar os equipamentos de medição.'))
    }
  }

  useEffect(() => { void carregar() }, [ano])

  const hoje = hojeTexto()

  const ordensPorMaquinaMes = useMemo(() => {
    const mapa = new Map<string, Ordem[]>()
    for (const ordem of ordens) {
      const mes = Number((ordem.data_prevista ?? '').slice(5, 7))
      if (!mes || mes < 1 || mes > 12) continue
      const chave = `${ordem.ativo_id}|${mes}`
      const atual = mapa.get(chave)
      if (atual) atual.push(ordem)
      else mapa.set(chave, [ordem])
    }
    return mapa
  }, [ordens])

  const linhas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')
    const filtradas = maquinas.filter(maquina => {
      if (!mostrarInativas && maquina.ativo === false) return false
      if (!termo) return true
      return [maquina.codigo, maquina.nome, maquina.tipo, maquina.fabricante, maquina.modelo, maquina.status]
        .some(valor => String(valor ?? '').toLocaleLowerCase('pt-BR').includes(termo))
    })
    return filtradas.map(maquina => {
      const celulas = MESES_CURTOS.map((sigla, indice) => {
        const mes = indice + 1
        const ordensDoMes = ordensPorMaquinaMes.get(`${maquina.id}|${mes}`) ?? []
        return { sigla, mes, ordens: ordensDoMes, codigo: situacaoDoMes(maquina, ordensDoMes, hoje) }
      })
      const total = celulas.reduce((soma, celula) => soma + celula.ordens.length, 0)
      return { maquina, celulas, total }
    })
  }, [maquinas, busca, mostrarInativas, ordensPorMaquinaMes, hoje])

  const contagem = useMemo(() => {
    const total: Record<Codigo, number> = { P: 0, PE: 0, AT: 0, M: 0, D: 0 }
    for (const linha of linhas) for (const celula of linha.celulas) if (celula.codigo) total[celula.codigo] += 1
    return total
  }, [linhas])

  const instrumentosOrdenados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')
    return instrumentos
      .filter(item => !termo || [item.codigo, item.descricao, item.setor, item.status].some(valor => String(valor ?? '').toLocaleLowerCase('pt-BR').includes(termo)))
      .map(item => ({ ...item, situacao: situacaoDoInstrumento(item, hoje) }))
  }, [instrumentos, busca, hoje])

  const anos = useMemo(() => {
    const atual = new Date().getFullYear()
    const presentes = new Set<number>([atual, ano])
    for (const ordem of ordens) {
      const valor = Number((ordem.data_prevista ?? '').slice(0, 4))
      if (valor >= 2000 && valor <= 2100) presentes.add(valor)
    }
    return [...presentes].sort((a, b) => a - b)
  }, [ordens, ano])

  const abrirPreventiva = (maquina: Maquina, mes?: number) => {
    const mesAlvo = mes ?? new Date().getMonth() + 1
    const dia = mesAlvo === new Date().getMonth() + 1 && new Date().getDate() <= 28 ? new Date().getDate() : 15
    setModalPreventiva({
      aberto: true,
      maquinaId: maquina.id,
      data: `${ano}-${String(mesAlvo).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
      descricao: `Manutenção preventiva — ${MESES[mesAlvo - 1]}/${ano}`,
      prioridade: 'MEDIA',
    })
    setErro('')
    setAviso('')
  }

  async function gravarMaquina() {
    if (!empresaId) { setErro('Empresa da sessão não identificada.'); return }
    if (!formMaquina.codigo.trim() || !formMaquina.nome.trim()) { setErro('Código e nome da máquina são obrigatórios.'); return }
    setSalvando(true)
    setErro('')
    setAviso('')
    try {
      const resultado = await supabase.from('erp_maquinas').insert({
        empresa_id: empresaId,
        codigo: formMaquina.codigo.trim().toUpperCase(),
        nome: formMaquina.nome.trim(),
        tipo: formMaquina.tipo.trim() || null,
        fabricante: formMaquina.fabricante.trim() || null,
        modelo: formMaquina.modelo.trim() || null,
        status: formMaquina.status,
        ativo: true,
      }).select('id').single()
      if (resultado.error) throw resultado.error
      setAviso(`Máquina ${formMaquina.codigo.trim().toUpperCase()} cadastrada e já disponível no cronograma.`)
      setModalMaquina(false)
      setFormMaquina({ codigo: '', nome: '', tipo: 'MÁQUINA', fabricante: '', modelo: '', status: 'ATIVA' })
      await carregar()
    } catch (causa) {
      setErro(erroTexto(causa, 'Não foi possível cadastrar a máquina.'))
    } finally {
      setSalvando(false)
    }
  }

  async function gravarPreventiva() {
    if (!empresaId) { setErro('Empresa da sessão não identificada.'); return }
    if (!modalPreventiva.maquinaId || !modalPreventiva.data) { setErro('Máquina e data prevista são obrigatórias.'); return }
    setSalvando(true)
    setErro('')
    setAviso('')
    try {
      const maquina = maquinas.find(item => item.id === modalPreventiva.maquinaId)
      const resultado = await supabase.from('erp_manutencao_ordens').insert({
        empresa_id: empresaId,
        ativo_id: modalPreventiva.maquinaId,
        tipo: 'PREVENTIVA',
        descricao: modalPreventiva.descricao.trim() || `Manutenção preventiva — ${maquina?.codigo ?? ''}`,
        prioridade: modalPreventiva.prioridade,
        status: 'ABERTA',
        data_prevista: modalPreventiva.data,
      }).select('id').single()
      if (resultado.error) throw resultado.error
      setAviso(`Preventiva lançada para ${maquina?.codigo ?? 'máquina'} em ${dataBr(modalPreventiva.data)}.`)
      setModalPreventiva({ aberto: false, maquinaId: '', data: '', descricao: '', prioridade: 'MEDIA' })
      await carregar()
    } catch (causa) {
      setErro(erroTexto(causa, 'Não foi possível lançar a preventiva.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F4FBFD] text-[#123B50]">
      <header className="border-b border-[#D8E8EE] bg-white">
        <div className="mx-auto flex max-w-[1700px] flex-wrap items-center gap-3 px-5 py-3">
          <Link to="/manutencao" aria-label="Voltar à central de manutenção" className="flex h-[30px] items-center gap-2 rounded-[2px] border border-slate-300 px-3 text-[10px] font-semibold hover:bg-slate-50"><ArrowLeft size={13} /> CENTRAL</Link>
          <span className="flex h-8 w-8 items-center justify-center rounded-[2px] bg-[#E7F4F8] text-[#2D8DB8]"><CalendarPlus size={18} /></span>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#2D8DB8]">MANUTENÇÃO / PLANEJAMENTO</p>
            <h1 className="text-[15px] font-semibold">Cronograma de manutenção preventiva</h1>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Link to="/manutencao/ordens" className="flex h-[30px] items-center rounded-[2px] border border-[#B8D5E0] px-3 text-[10px] font-semibold">ORDENS DE SERVIÇO</Link>
            <button type="button" onClick={() => { setFormMaquina({ codigo: '', nome: '', tipo: 'MÁQUINA', fabricante: '', modelo: '', status: 'ATIVA' }); setModalMaquina(true); setErro(''); setAviso('') }} className="flex h-[30px] items-center gap-1.5 rounded-[2px] border border-[#2D8DB8] bg-white px-3 text-[10px] font-bold text-[#2D8DB8]"><Plus size={13} /> NOVA MÁQUINA</button>
            <button type="button" onClick={() => setModalPreventiva({ aberto: true, maquinaId: maquinas[0]?.id ?? '', data: `${ano}-${String(new Date().getMonth() + 1).padStart(2, '0')}-15`, descricao: '', prioridade: 'MEDIA' })} className="flex h-[30px] items-center gap-1.5 rounded-[2px] bg-[#2D8DB8] px-3 text-[10px] font-bold text-white"><CalendarPlus size={13} /> LANÇAR PREVENTIVA</button>
            <button type="button" onClick={() => void carregar()} disabled={carregando} className="flex h-[30px] items-center gap-1.5 rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] font-semibold disabled:opacity-50"><RefreshCw size={13} className={carregando ? 'animate-spin' : ''} /> ATUALIZAR</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1700px] space-y-3 px-5 py-4">
        {erro && <div role="alert" className="border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-semibold text-rose-800">{erro}</div>}
        {aviso && <div role="status" className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-semibold text-emerald-800">{aviso}</div>}

        <section className="grid grid-cols-2 gap-2 xl:grid-cols-5">
          <Kpi rotulo="Máquinas no cadastro" valor={linhas.length} detalhe={`${maquinas.filter(maquina => maquina.ativo !== false).length} ativas`} />
          <Kpi rotulo="Células programadas" valor={contagem.P} detalhe="O.S. abertas no período" cor="#1E3A8A" />
          <Kpi rotulo="Executadas" valor={contagem.PE} detalhe="O.S. concluídas" cor="#14532D" />
          <Kpi rotulo="Em atraso" valor={contagem.AT} detalhe="Data prevista vencida" cor="#7F1D1D" alerta={contagem.AT > 0} />
          <Kpi rotulo="Desativadas" valor={contagem.D} detalhe="Máquinas inativas" cor="#334155" />
        </section>

        <section className="border border-[#D8E8EE] bg-white">
          <div className="grid grid-cols-1 gap-2 border-b border-[#D8E8EE] p-3 sm:grid-cols-4">
            <label className={rotulo}>Ano do cronograma
              <select aria-label="Ano do cronograma" className={input} value={ano} onChange={evento => setAno(Number(evento.target.value))}>
                {anos.map(valor => <option key={valor} value={valor}>{valor}</option>)}
              </select>
            </label>
            <label className={rotulo}>Pesquisar máquina
              <span className="flex h-[30px] items-center gap-1.5 rounded-[2px] border border-slate-300 bg-white px-2">
                <Search size={13} className="text-[#2D8DB8]" />
                <input aria-label="Pesquisar máquina, tag, fabricante ou modelo" value={busca} onChange={evento => setBusca(evento.target.value)} placeholder="Tag, nome, tipo, fabricante…" className="w-full bg-transparent text-[10px] outline-none" />
              </span>
            </label>
            <label className={`${rotulo} justify-end`}>Máquinas desativadas
              <span className="flex h-[30px] items-center gap-2 rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] font-semibold normal-case tracking-normal text-slate-600">
                <input type="checkbox" checked={mostrarInativas} onChange={evento => setMostrarInativas(evento.target.checked)} className="h-3 w-3 accent-[#2D8DB8]" />
                Exibir na grade
              </span>
            </label>
            <div className={`${rotulo} justify-end`}>Cadastro
              <div className="flex h-[30px] items-center gap-2 text-[10px] font-semibold normal-case tracking-normal text-slate-600">
                <Link to="/pageprincipal/qualidade/calibracao" className="inline-flex h-[30px] items-center gap-1.5 rounded-[2px] border border-slate-300 px-2.5 font-semibold text-[#123B50] hover:bg-slate-50"><Ruler size={13} /> EQUIPAMENTOS DE MEDIÇÃO</Link>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-[#D8E8EE] bg-[#F8FCFD] px-3 py-2">
            <span className="text-[9px] font-bold uppercase tracking-[.08em] text-[#17445A]">Legenda das cores</span>
            {(Object.keys(SITUACOES) as Codigo[]).map(codigo => (
              <span key={codigo} className="inline-flex items-center gap-1.5 text-[9px] text-slate-600">
                <span className={'inline-flex h-[16px] min-w-[26px] items-center justify-center rounded-[2px] px-1 text-[9px] font-bold ' + SITUACOES[codigo].classe}>{codigo}</span>
                {SITUACOES[codigo].rotulo}
                <span className="font-semibold tabular-nums text-[#17445A]">{contagem[codigo]}</span>
              </span>
            ))}
            <span className="ml-auto text-[9px] text-slate-500">Célula vazia = nenhuma O.S. com data prevista no mês.</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left">
              <thead className="bg-[#EAF4F7] text-[9px] uppercase tracking-wide text-[#17445A]">
                <tr>
                  <th className="w-8 px-2 py-2">N°</th>
                  <th className="px-2 py-2">Equipamento / máquina</th>
                  <th className="w-24 px-2 py-2">Tag</th>
                  <th className="w-24 px-2 py-2">Tipo</th>
                  {MESES_CURTOS.map(sigla => <th key={sigla} className="w-11 px-1 py-2 text-center">{sigla}</th>)}
                  <th className="w-12 px-2 py-2 text-center">O.S.</th>
                  <th className="w-16 px-2 py-2 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="text-[10px]">
                {linhas.map((linha, indice) => (
                  <tr key={linha.maquina.id} className="border-t border-slate-100 hover:bg-[#F4FBFD]">
                    <td className="px-2 py-1 tabular-nums text-slate-500">{indice + 1}</td>
                    <td className="px-2 py-1 font-medium">
                      {linha.maquina.nome}
                      {linha.maquina.ativo === false && <span className="ml-1.5 rounded-[2px] bg-slate-200 px-1 text-[8px] font-bold uppercase text-slate-600">inativa</span>}
                    </td>
                    <td className="px-2 py-1 font-semibold text-[#17445A]">{linha.maquina.codigo}</td>
                    <td className="px-2 py-1 text-slate-600">{linha.maquina.tipo || '—'}</td>
                    {linha.celulas.map(celula => {
                      const detalhe = celula.ordens.map(ordem => `${ordem.numero_os ?? ordem.id.slice(0, 8)} · ${ordem.status} · ${dataBr(ordem.data_prevista)}`).join(' | ')
                      return (
                        <td key={celula.mes} className="px-0.5 py-1 text-center">
                          <button
                            type="button"
                            onClick={() => abrirPreventiva(linha.maquina, celula.mes)}
                            disabled={linha.maquina.ativo === false}
                            title={detalhe || `${MESES[celula.mes - 1]}/${ano} · sem O.S. — clique para lançar preventiva`}
                            aria-label={`${linha.maquina.codigo} ${MESES[celula.mes - 1]} ${ano}: ${celula.codigo ? SITUACOES[celula.codigo].rotulo : 'sem O.S.'}`}
                            className={'mx-auto flex h-[22px] w-[28px] items-center justify-center rounded-[2px] text-[9px] font-bold transition-colors disabled:cursor-not-allowed ' + (celula.codigo ? SITUACOES[celula.codigo].classe : 'bg-white text-slate-300 hover:bg-[#EAF4F7] hover:text-[#2D8DB8]')}
                          >
                            {celula.codigo || '—'}
                          </button>
                        </td>
                      )
                    })}
                    <td className="px-2 py-1 text-center font-semibold tabular-nums">{linha.total}</td>
                    <td className="px-2 py-1 text-center">
                      <button type="button" onClick={() => abrirPreventiva(linha.maquina)} disabled={linha.maquina.ativo === false} className="inline-flex h-[22px] items-center gap-1 rounded-[2px] border border-slate-300 px-1.5 text-[9px] font-semibold disabled:opacity-40"><Wrench size={10} /> O.S.</button>
                    </td>
                  </tr>
                ))}
                {linhas.length === 0 && (
                  <tr><td colSpan={18} className="px-3 py-8 text-center text-slate-500">{carregando ? 'Carregando máquinas do cadastro…' : 'Nenhuma máquina corresponde ao filtro. Cadastre uma máquina para começar o cronograma.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#D8E8EE] bg-[#F8FCFD] px-3 py-2 text-[9px] leading-4 text-[#17445A]">
            <strong>Como as cores são calculadas:</strong> cada célula lê as O.S. reais de <code className="font-semibold">erp_manutencao_ordens</code> com data prevista no mês — todas concluídas = PE; alguma em execução = M; alguma aberta com data vencida = AT; alguma aberta no futuro = P; máquina inativa = D. Nenhuma periodicidade é inventada pela tela: o plano só aparece depois de uma O.S. preventiva real ser lançada.
          </div>
        </section>

        <section className="border border-[#D8E8EE] bg-white">
          <div className="flex flex-wrap items-center gap-3 border-b border-[#D8E8EE] px-3 py-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-[2px] bg-[#E7F4F8] text-[#2D8DB8]"><Ruler size={15} /></span>
            <div>
              <h2 className="text-[12px] font-semibold">Equipamentos de medição · calibração</h2>
              <p className="text-[9px] text-slate-500">Consulta real de <code>erp_equipamentos_medicao</code>; o cadastro e as calibrações são feitos na tela de Metrologia.</p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1">
              {(Object.keys(SITUACOES_INSTRUMENTO) as SituacaoInstrumento[]).map(chave => (
                <span key={chave} className="inline-flex items-center gap-1 text-[9px] text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-[1px]" style={{ backgroundColor: SITUACOES_INSTRUMENTO[chave].cor }} />
                  {SITUACOES_INSTRUMENTO[chave].rotulo}
                </span>
              ))}
            </div>
          </div>
          {erroMetrologia
            ? <div className="px-3 py-3 text-[10px] text-rose-800">{erroMetrologia}</div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left">
                  <thead className="bg-[#EAF4F7] text-[9px] uppercase tracking-wide text-[#17445A]">
                    <tr><th className="px-3 py-2">Instrumento</th><th className="px-3 py-2">Descrição</th><th className="px-3 py-2">Setor</th><th className="px-3 py-2">Situação</th><th className="px-3 py-2">Próxima calibração</th></tr>
                  </thead>
                  <tbody className="text-[10px]">
                    {instrumentosOrdenados.slice(0, 40).map(item => (
                      <tr key={item.id} className="border-t border-slate-100 hover:bg-[#F4FBFD]">
                        <td className="px-3 py-1.5 font-semibold text-[#17445A]">{item.codigo}</td>
                        <td className="px-3 py-1.5">{item.descricao}</td>
                        <td className="px-3 py-1.5 text-slate-600">{item.setor || '—'}</td>
                        <td className="px-3 py-1.5">
                          <span className={'inline-flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 text-[9px] font-bold ' + SITUACOES_INSTRUMENTO[item.situacao].classe}>
                            {SITUACOES_INSTRUMENTO[item.situacao].rotulo}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 tabular-nums">{dataBr(item.proxima_calibracao)}</td>
                      </tr>
                    ))}
                    {instrumentosOrdenados.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Nenhum equipamento de medição cadastrado para esta empresa. Cadastre em Metrologia › Calibração.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          {instrumentosOrdenados.length > 40 && <p className="border-t border-[#D8E8EE] px-3 py-2 text-[9px] text-slate-500">Exibindo os 40 primeiros de {instrumentosOrdenados.length} instrumentos. Use a pesquisa acima para localizar um instrumento específico.</p>}
        </section>
      </div>

      {modalMaquina && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-4">
          <section className="w-full max-w-2xl rounded-[2px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#2D8DB8]">CADASTRO DE ATIVOS</p>
                <h2 className="text-[13px] font-semibold">Nova máquina</h2>
              </div>
              <button type="button" onClick={() => setModalMaquina(false)} aria-label="Fechar cadastro de máquina" className="flex h-[30px] w-[30px] items-center justify-center rounded-[2px] border border-slate-300"><X size={14} /></button>
            </div>
            <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3">
              <label className={rotulo}>Código / tag *
                <input className={input} maxLength={24} value={formMaquina.codigo} onChange={evento => setFormMaquina(atual => ({ ...atual, codigo: evento.target.value }))} placeholder="PR-01" />
              </label>
              <label className={`${rotulo} sm:col-span-2`}>Nome / descrição *
                <input className={input} value={formMaquina.nome} onChange={evento => setFormMaquina(atual => ({ ...atual, nome: evento.target.value }))} placeholder="Prensa Hidráulica" />
              </label>
              <label className={rotulo}>Tipo
                <input className={input} value={formMaquina.tipo} onChange={evento => setFormMaquina(atual => ({ ...atual, tipo: evento.target.value }))} placeholder="MÁQUINA" />
              </label>
              <label className={rotulo}>Fabricante
                <input className={input} value={formMaquina.fabricante} onChange={evento => setFormMaquina(atual => ({ ...atual, fabricante: evento.target.value }))} />
              </label>
              <label className={rotulo}>Modelo
                <input className={input} value={formMaquina.modelo} onChange={evento => setFormMaquina(atual => ({ ...atual, modelo: evento.target.value }))} />
              </label>
              <label className={rotulo}>Situação do ativo
                <select className={input} value={formMaquina.status} onChange={evento => setFormMaquina(atual => ({ ...atual, status: evento.target.value }))}>
                  {['ATIVA', 'INATIVA', 'BLOQUEADA_MANUTENCAO'].map(valor => <option key={valor} value={valor}>{valor.replace('_', ' ')}</option>)}
                </select>
              </label>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-4 py-3">
              <p className="text-[9px] text-slate-500">Gravação direta em <code>erp_maquinas</code> com a empresa da sessão. O código deve ser único por empresa.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setModalMaquina(false)} className={botaoClaro}>CANCELAR</button>
                <button type="button" onClick={() => void gravarMaquina()} disabled={salvando} className={botao}>{salvando ? 'SALVANDO…' : 'GRAVAR MÁQUINA'}</button>
              </div>
            </div>
          </section>
        </div>
      )}

      {modalPreventiva.aberto && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-4">
          <section className="w-full max-w-xl rounded-[2px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#2D8DB8]">PLANEJAMENTO PREVENTIVO</p>
                <h2 className="text-[13px] font-semibold">Lançar O.S. preventiva</h2>
              </div>
              <button type="button" onClick={() => setModalPreventiva(atual => ({ ...atual, aberto: false }))} aria-label="Fechar lançamento de preventiva" className="flex h-[30px] w-[30px] items-center justify-center rounded-[2px] border border-slate-300"><X size={14} /></button>
            </div>
            <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
              <label className={rotulo}>Máquina *
                <select className={input} value={modalPreventiva.maquinaId} onChange={evento => setModalPreventiva(atual => ({ ...atual, maquinaId: evento.target.value }))}>
                  <option value="">Selecione…</option>
                  {maquinas.filter(maquina => maquina.ativo !== false).map(maquina => <option key={maquina.id} value={maquina.id}>{maquina.codigo} · {maquina.nome}</option>)}
                </select>
              </label>
              <label className={rotulo}>Data prevista *
                <input type="date" className={input} value={modalPreventiva.data} onChange={evento => setModalPreventiva(atual => ({ ...atual, data: evento.target.value }))} />
              </label>
              <label className={`${rotulo} sm:col-span-2`}>Descrição da atividade
                <input className={input} value={modalPreventiva.descricao} onChange={evento => setModalPreventiva(atual => ({ ...atual, descricao: evento.target.value }))} placeholder="Manutenção preventiva trimestral" />
              </label>
              <label className={rotulo}>Prioridade
                <select className={input} value={modalPreventiva.prioridade} onChange={evento => setModalPreventiva(atual => ({ ...atual, prioridade: evento.target.value }))}>
                  {['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'].map(valor => <option key={valor} value={valor}>{valor}</option>)}
                </select>
              </label>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-4 py-3">
              <p className="text-[9px] text-slate-500">Cria uma O.S. <strong>PREVENTIVA / ABERTA</strong> real no cronograma. A execução continua em Ordens de Serviço.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setModalPreventiva(atual => ({ ...atual, aberto: false }))} className={botaoClaro}>CANCELAR</button>
                <button type="button" onClick={() => void gravarPreventiva()} disabled={salvando} className={botao}>{salvando ? 'LANÇANDO…' : 'LANÇAR PREVENTIVA'}</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

function Kpi({ rotulo: titulo, valor, detalhe, cor, alerta = false }: { rotulo: string; valor: number; detalhe: string; cor?: string; alerta?: boolean }) {
  return (
    <article className={'border bg-white px-4 py-3 ' + (alerta ? 'border-rose-300' : 'border-[#D8E8EE]')}>
      <span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-500">{titulo}</span>
      <strong className="mt-1 block text-[22px] font-semibold tabular-nums" style={{ color: cor ?? '#17445A' }}>{valor}</strong>
      <span className="block text-[9px] text-slate-500">{detalhe}</span>
    </article>
  )
}
