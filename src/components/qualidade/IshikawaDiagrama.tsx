/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-01
 * @REVISAO: REV-SGQ-ISHIKAWA-EDITAVEL-20261101-02 — diagrama de Ishikawa 6M em SVG onde o desenho é a própria interface de edição
 * @STATUS_APROVACAO: SUBCAUSAS E CADEIA ACIMA DE CINCO PORQUES SÓ GRAVAM APÓS A MIGRATION 20261101220000_...SQL SER APLICADA PELO PROPRIETÁRIO
 */
/**
 * SYSNQRA ERP INDUSTRIAL — Qualidade · Ishikawa editável no desenho.
 * Clicar na espinha cria a causa; clicar no texto edita ali mesmo; o sinal de
 * mais abre a subcausa. Nada de campo de texto que "gera um desenho" depois:
 * o SVG é o editor, e o estado é exatamente o payload de erp_rpnc.ishikawa_data.
 * Cada bloco reserva altura fixa e cresce para longe da espinha, então digitar
 * não desloca as outras causas nem joga texto sobre a linha central.
 */
import { useState } from 'react'
import type { Ishikawa6MData, IshikawaCausa, IshikawaChave } from '../../types/qualidade'
import { semCausasVazias } from '../../types/qualidade'

type Edicao = { grupo: IshikawaChave; causa: number; sub: number | null }

type Props = {
  dados: Ishikawa6MData
  efeito: string
  editavel?: boolean
  onChange: (proximo: Ishikawa6MData) => void
}

type Grupo = { chave: IshikawaChave; rotulo: string; lado: 'cima' | 'baixo'; coluna: 0 | 1 | 2 }

const GRUPOS: Grupo[] = [
  { chave: 'MaoDeObra', rotulo: 'Mão de obra', lado: 'cima', coluna: 0 },
  { chave: 'Maquina', rotulo: 'Máquina', lado: 'cima', coluna: 1 },
  { chave: 'Metodo', rotulo: 'Método', lado: 'cima', coluna: 2 },
  { chave: 'Material', rotulo: 'Matéria-prima', lado: 'baixo', coluna: 0 },
  { chave: 'Medida', rotulo: 'Medição', lado: 'baixo', coluna: 1 },
  { chave: 'MeioAmbiente', rotulo: 'Ambiente', lado: 'baixo', coluna: 2 },
]

const LARGURA = 1360
const RIB = 232
const INCLINACAO = 104
const ANCORAS_X = [344, 704, 1064]
const ESPIRA_X0 = 24
const ESPIRA_X1 = 1146
const FOLGA_CABECA = 44
const ALTURA_TEXTO = 13
const ALTURA_SUB = 14
const LINHAS_CAUSA = 3
const CARACTERES_CAUSA = 28
const CARACTERES_SUB = 29
const RECUO_SUB = 16
const COLUNA_CONTROLES = 42
const MAXIMO_CAUSAS = 12
const MAXIMO_SUBCAUSAS = 8
const PASSO_INICIAL = 20
const ALTURA_RESERVA = LINHAS_CAUSA * ALTURA_TEXTO

const quebrar = (texto: string, caracteres: number, linhasMaximas: number): string[] => {
  const palavras = texto.split(/\s+/).filter(Boolean)
  if (palavras.length === 0) return ['']
  const linhas: string[] = []
  let atual = ''
  let truncou = false
  for (let indice = 0; indice < palavras.length; indice += 1) {
    const palavra = palavras[indice]
    const candidato = atual === '' ? palavra : `${atual} ${palavra}`
    if (candidato.length <= caracteres) {
      atual = candidato
      continue
    }
    if (atual !== '') {
      linhas.push(atual)
      atual = palavra
      if (atual.length > caracteres) {
        linhas.push(`${atual.slice(0, Math.max(1, caracteres - 1))}…`)
        atual = ''
      }
    } else {
      linhas.push(`${palavra.slice(0, Math.max(1, caracteres - 1))}…`)
    }
    if (linhas.length >= linhasMaximas) {
      truncou = true
      atual = ''
      break
    }
  }
  if (atual !== '' && linhas.length < linhasMaximas) linhas.push(atual)
  const resultado = linhas.slice(0, linhasMaximas)
  if (resultado.length === 0) return ['']
  const ultima = resultado[resultado.length - 1]
  if (truncou && !ultima.endsWith('…')) {
    resultado[resultado.length - 1] = `${ultima.slice(0, Math.max(4, caracteres - 2))}…`
  }
  return resultado
}

/**
 * Altura do bloco de uma causa: 3 linhas reservadas para o texto, folga fixa e
 * uma linha por subcausa. O bloco cresce para longe da espinha, então digitar
 * não redesenha as outras causas e nenhum texto cruza a linha central.
 */
const alturaBloco = (subcausas: number): number => ALTURA_RESERVA + 21 + subcausas * ALTURA_SUB

export default function IshikawaDiagrama({ dados, efeito, editavel = true, onChange }: Props) {
  const [edicao, setEdicao] = useState<Edicao | null>(null)
  const [aviso, setAviso] = useState('')

  const fecharEdicao = () => {
    setEdicao(null)
    setAviso('')
    onChange(semCausasVazias(dados))
  }

  const substituir = (grupo: IshikawaChave, proximas: IshikawaCausa[]) => {
    onChange({ ...dados, [grupo]: proximas })
  }

  const adicionarCausa = (grupo: IshikawaChave) => {
    if (!editavel) return
    const base = semCausasVazias(dados)
    if (base[grupo].length >= MAXIMO_CAUSAS) {
      setAviso(`A espinha ${grupo} tem o limite de ${MAXIMO_CAUSAS} causas, o mesmo limite que o banco aplica.`)
      return
    }
    const proximas = [...base[grupo], { texto: '', subcausas: [] }]
    substituir(grupo, proximas)
    setAviso('')
    setEdicao({ grupo, causa: proximas.length - 1, sub: null })
  }

  const removerCausa = (grupo: IshikawaChave, causa: number) => {
    substituir(grupo, dados[grupo].filter((_, indice) => indice !== causa))
    if (edicao?.grupo === grupo && edicao.causa === causa) setEdicao(null)
  }

  const adicionarSubcausa = (grupo: IshikawaChave, causa: number) => {
    const atual = dados[grupo][causa]
    if (!atual) return
    // O servidor descarta causa sem texto, e a subcausa morre junto: melhor avisar do que perder o que foi digitado.
    if (atual.texto.trim() === '') {
      setAviso('Escreva o texto da causa antes de abrir a subcausa — sem causa, o servidor descarta a subcausa.')
      return
    }
    if (atual.subcausas.length >= MAXIMO_SUBCAUSAS) {
      setAviso(`Cada causa tem o limite de ${MAXIMO_SUBCAUSAS} subcausas, o mesmo limite que o banco aplica.`)
      return
    }
    const proximas = dados[grupo].map((item, indice) => (
      indice === causa ? { ...item, subcausas: [...item.subcausas, ''] } : item
    ))
    substituir(grupo, proximas)
    setAviso('')
    setEdicao({ grupo, causa, sub: atual.subcausas.length })
  }

  const removerSubcausa = (grupo: IshikawaChave, causa: number, sub: number) => {
    const proximas = dados[grupo].map((item, indice) => (
      indice === causa ? { ...item, subcausas: item.subcausas.filter((_, j) => j !== sub) } : item
    ))
    substituir(grupo, proximas)
    if (edicao?.grupo === grupo && edicao.causa === causa) setEdicao(null)
  }

  const gravarTexto = (grupo: IshikawaChave, causa: number, sub: number | null, texto: string) => {
    substituir(grupo, dados[grupo].map((item, indice) => {
      if (indice !== causa) return item
      if (sub === null) return { ...item, texto }
      return { ...item, subcausas: item.subcausas.map((valor, j) => (j === sub ? texto : valor)) }
    }))
  }

  const linhasEfeito = quebrar(efeito, 22, 3)
  const corridas = { cima: 0, baixo: 0 }
  for (const grupo of GRUPOS) {
    const total = PASSO_INICIAL + dados[grupo.chave].reduce((soma, causa) => soma + alturaBloco(causa.subcausas.length), 0)
    corridas[grupo.lado] = Math.max(corridas[grupo.lado], total)
  }
  const runCima = Math.max(232, corridas.cima + 64)
  const runBaixo = Math.max(232, corridas.baixo + 64)
  const espinhaY = FOLGA_CABECA + runCima
  const alturaTotal = 2 * FOLGA_CABECA + runCima + runBaixo

  const geometria = (grupo: Grupo) => {
    const ax = ANCORAS_X[grupo.coluna]
    const run = grupo.lado === 'cima' ? runCima : runBaixo
    const yCabeca = grupo.lado === 'cima' ? espinhaY - run : espinhaY + run
    const xCabeca = ax - INCLINACAO
    const posicao = (distancia: number) => ({
      x: ax - (INCLINACAO * distancia) / run,
      y: grupo.lado === 'cima' ? espinhaY - distancia : espinhaY + distancia,
    })
    let cursor = PASSO_INICIAL
    const blocos = dados[grupo.chave].map((causa, indice) => {
      const bloco = {
        causa,
        indice,
        ...posicao(Math.min(cursor, run - 30)),
        linhas: quebrar(causa.texto, CARACTERES_CAUSA, LINHAS_CAUSA),
        subs: causa.subcausas.map((subcausa) => quebrar(subcausa, CARACTERES_SUB, 1)[0]),
      }
      cursor += alturaBloco(causa.subcausas.length)
      return bloco
    })
    return { ax, run, xCabeca, yCabeca, blocos, proxima: posicao(Math.min(cursor, run - 30)) }
  }

  const editorAberto = (grupo: IshikawaChave, causa: number, sub: number | null): boolean =>
    edicao !== null && edicao.grupo === grupo && edicao.causa === causa && edicao.sub === sub

  const renderEditor = (grupo: IshikawaChave, causa: number, sub: number | null, x: number, yTopo: number, largura: number, rotulo: string) => {
    const valor = sub === null ? dados[grupo][causa]?.texto ?? '' : dados[grupo][causa]?.subcausas[sub] ?? ''
    return (
      <foreignObject x={x} y={yTopo} width={largura} height={24}>
        <input
          autoFocus
          className="qrf-diagrama-entrada"
          value={valor}
          aria-label={rotulo}
          onChange={(evento) => gravarTexto(grupo, causa, sub, evento.target.value)}
          onBlur={fecharEdicao}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter' || evento.key === 'Escape') { evento.preventDefault(); fecharEdicao() }
          }}
        />
      </foreignObject>
    )
  }

  return (
    <div className="qrf-diagrama-wrap">
      <svg className="qrf-diagrama" viewBox={`0 0 ${LARGURA} ${alturaTotal}`} role="group" aria-label="Diagrama de Ishikawa editável">
        <line x1={ESPIRA_X0} y1={espinhaY} x2={ESPIRA_X1} y2={espinhaY} stroke="#123B50" strokeWidth={3} />
        <polygon points={`${ESPIRA_X1},${espinhaY - 9} ${ESPIRA_X1 + 16},${espinhaY} ${ESPIRA_X1},${espinhaY + 9}`} fill="#123B50" />

        <rect x={ESPIRA_X1 + 20} y={espinhaY - 46} width={LARGURA - ESPIRA_X1 - 34} height={92} rx={2} fill="#F4F8FB" stroke="#123B50" strokeWidth={1.6} />
        <text x={ESPIRA_X1 + 30} y={espinhaY - 28} className="qrf-diagrama-legenda">EFEITO / NÃO CONFORMIDADE</text>
        {linhasEfeito.map((linha, indice) => (
          <text key={indice} x={ESPIRA_X1 + 30} y={espinhaY - 10 + indice * 14} className="qrf-diagrama-efeito">{linha}</text>
        ))}

        {GRUPOS.map((grupo) => {
          const geo = geometria(grupo)
          const cima = grupo.lado === 'cima'
          const rotuloX = geo.xCabeca - 84
          const rotuloY = cima ? geo.yCabeca - 30 : geo.yCabeca + 6
          return (
            <g key={grupo.chave}>
              <line x1={geo.xCabeca} y1={geo.yCabeca} x2={geo.ax} y2={espinhaY} stroke="#123B50" strokeWidth={2.4} />
              {editavel && (
                <line
                  className="qrf-diagrama-espinha"
                  x1={geo.xCabeca} y1={geo.yCabeca} x2={geo.ax} y2={espinhaY}
                  stroke="transparent" strokeWidth={20}
                  onClick={() => adicionarCausa(grupo.chave)}
                >
                  <title>{`Clique na espinha ${grupo.rotulo} para criar uma causa`}</title>
                </line>
              )}
              <rect x={rotuloX} y={rotuloY} width={168} height={26} rx={2} fill="#123B50" />
              <text x={rotuloX + 80} y={rotuloY + 17} className="qrf-diagrama-grupo">{grupo.rotulo}</text>
              <text x={rotuloX + 152} y={rotuloY + 17} className="qrf-diagrama-contagem">{geo.blocos.length}</text>

              {geo.blocos.map(({ causa, indice, x, y, linhas, subs }) => {
                const xTexto = x - RIB + COLUNA_CONTROLES
                const xSub = xTexto + RECUO_SUB
                const larguraTexto = RIB - COLUNA_CONTROLES - 10
                // A linha mais próxima da espinha ancora o texto; as subcausas seguem
                // o texto para fora, encostadas nele, para não parecerem de outra causa.
                const baseTopo = cima ? y - 8 - (linhas.length - 1) * ALTURA_TEXTO : y + 8
                const baseFundo = cima ? y - 8 : y + 8 + (linhas.length - 1) * ALTURA_TEXTO
                const topoAlvo = cima ? baseTopo - 6 : y - 2
                const alturaAlvo = (cima ? y + 2 : baseFundo + 2) - topoAlvo
                const baseSub = (posicaoSub: number) => (cima ? baseTopo - 14 - posicaoSub * ALTURA_SUB : baseFundo + 14 + posicaoSub * ALTURA_SUB)
                const yControles = cima ? y - 6 : y + 6
                const editandoCausa = editorAberto(grupo.chave, indice, null)
                return (
                  <g key={indice}>
                    <line x1={x - RIB} y1={y} x2={x} y2={y} stroke="#475569" strokeWidth={1.4} />
                    {editavel && (
                      <>
                        <g className="qrf-diagrama-controle" onClick={() => adicionarSubcausa(grupo.chave, indice)}>
                          <title>{`Adicionar subcausa${causa.texto ? ` em “${causa.texto}”` : ''}`}</title>
                          <circle cx={x - RIB + 10} cy={yControles} r={7} />
                          <text x={x - RIB + 10} y={yControles + 3.6} textAnchor="middle">+</text>
                        </g>
                        <g className="qrf-diagrama-controle qrf-diagrama-controle--remover" onClick={() => removerCausa(grupo.chave, indice)}>
                          <title>{`Remover causa${causa.texto ? ` “${causa.texto}”` : ''}`}</title>
                          <circle cx={x - RIB + 28} cy={yControles} r={7} />
                          <text x={x - RIB + 28} y={yControles + 3.6} textAnchor="middle">×</text>
                        </g>
                      </>
                    )}
                    {editandoCausa
                      ? renderEditor(grupo.chave, indice, null, xTexto, baseTopo - 17, larguraTexto, `Causa ${indice + 1} do grupo ${grupo.rotulo}`)
                      : (
                        <>
                          <rect
                            className="qrf-diagrama-alvo"
                            x={xTexto}
                            y={topoAlvo}
                            width={larguraTexto}
                            height={alturaAlvo}
                            onClick={() => { if (editavel) setEdicao({ grupo: grupo.chave, causa: indice, sub: null }) }}
                          >
                            <title>{causa.texto || 'Causa sem texto — clique para digitar dentro do desenho'}</title>
                          </rect>
                          {linhas.map((linha, posicao) => (
                            <text key={posicao} x={xTexto} y={baseTopo + posicao * ALTURA_TEXTO} className="qrf-diagrama-causa">{linha}</text>
                          ))}
                        </>
                      )}

                    {subs.map((sub, posicaoSub) => {
                      const ySub = baseSub(posicaoSub)
                      const yConexao = cima ? ySub + 4 : ySub - 4
                      const editandoSub = editorAberto(grupo.chave, indice, posicaoSub)
                      return (
                        <g key={`s${posicaoSub}`}>
                          <line x1={x - RIB + 36} y1={yConexao} x2={xSub - 6} y2={yConexao} stroke="#94A3B8" strokeWidth={1.2} strokeDasharray="3 2" />
                          {editavel && (
                            <g className="qrf-diagrama-controle qrf-diagrama-controle--remover" onClick={() => removerSubcausa(grupo.chave, indice, posicaoSub)}>
                              <title>{`Remover subcausa ${sub}`}</title>
                              <circle cx={x - RIB + 10} cy={yConexao} r={6} />
                              <text x={x - RIB + 10} y={yConexao + 3.2} textAnchor="middle">×</text>
                            </g>
                          )}
                          {editandoSub
                            ? renderEditor(grupo.chave, indice, posicaoSub, xSub, ySub - 15, larguraTexto - RECUO_SUB, `Subcausa ${posicaoSub + 1} da causa ${indice + 1} do grupo ${grupo.rotulo}`)
                            : (
                              <>
                                <rect
                                  className="qrf-diagrama-alvo"
                                  x={xSub}
                                  y={ySub - 10}
                                  width={larguraTexto - RECUO_SUB}
                                  height={ALTURA_SUB + 3}
                                  onClick={() => { if (editavel) setEdicao({ grupo: grupo.chave, causa: indice, sub: posicaoSub }) }}
                                >
                                  <title>{sub || 'Subcausa sem texto — clique para digitar'}</title>
                                </rect>
                                <text x={xSub} y={ySub} className="qrf-diagrama-sub">{sub}</text>
                              </>
                            )}
                        </g>
                      )
                    })}
                  </g>
                )
              })}

              {editavel && (
                <g className="qrf-diagrama-adicionar" onClick={() => adicionarCausa(grupo.chave)}>
                  <title>{`Adicionar causa em ${grupo.rotulo}`}</title>
                  <line x1={geo.proxima.x - RIB} y1={geo.proxima.y} x2={geo.proxima.x} y2={geo.proxima.y} stroke="#94A3B8" strokeWidth={1.2} strokeDasharray="4 3" />
                  <circle cx={geo.proxima.x - RIB + 10} cy={geo.proxima.y - (cima ? 6 : -6)} r={7} />
                  <text x={geo.proxima.x - RIB + 10} y={geo.proxima.y - (cima ? 6 : -6) + 3.6} textAnchor="middle">+</text>
                  <text x={geo.proxima.x - RIB + 24} y={geo.proxima.y + (cima ? -3 : 10)} className="qrf-diagrama-dica">causa</text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
      <p className="qrf-diagrama-ajuda">
        {editavel
          ? 'Clique na espinha (ou no traço pontilhado) para criar a causa; clique no texto para editar dentro do desenho; “+” abre a subcausa e “×” remove. Limites do banco: 12 causas por espinha e 8 subcausas por causa.'
          : 'Diagrama somente leitura — a edição acontece na etapa de investigação do formulário.'}
        {aviso && <strong className="qrf-diagrama-aviso">{` ${aviso}`}</strong>}
      </p>
    </div>
  )
}
