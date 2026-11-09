/*
 * SYSNQRA ERP INDUSTRIAL — folha A4 do relatório profissional
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-05
 * @REVISAO: REV-RELATORIO-A4-20261105-01 — layout próprio de documento; substitui a captura da tela
 * @STATUS_APROVACAO: ORDEM GERAL DO PROPRIETÁRIO EM 2026-11-05, item 5 (cabeçalho/rodapé, paginação
 * "página X de Y", tabelas sem corte, assinaturas e identificação da empresa)
 */
import { Fragment } from 'react'
import { QRCodeSVG } from 'qrcode.react'

import type { Bloco, Celula, Documento } from '../../lib/report/documento'
import { paginar } from '../../lib/report/documento'
import type { ContextoRelatorio } from '../../lib/report/relatorioContexto'

import '../../styles/synqra-relatorio.css'

const LOGO_SISNQRA = '/logo/logo.png'

function textoCelula(valor: Celula): string {
  if (valor === null || valor === undefined) return '—'
  const s = String(valor).trim()
  return s || '—'
}

function formatarDataHora(data: Date): string {
  return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function Alinhamento(alinhar?: 'esquerda' | 'direita' | 'centro'): string {
  if (alinhar === 'direita') return 'sr-num'
  if (alinhar === 'centro') return 'sr-center'
  return ''
}

function ConteudoBloco({ bloco }: { bloco: Bloco }) {
  if (bloco.tipo === 'campos') {
    const colunas = bloco.colunas ?? 2
    return (
      <>
        <div className="sr-block-title">{bloco.titulo}</div>
        <div className="sr-fields" style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))` }}>
          {bloco.itens.map((item, index) => (
            <div className="sr-field" key={`${item.rotulo}-${index}`}>
              <span className="sr-field-label">{item.rotulo}</span>
              <span className="sr-field-value">{textoCelula(item.valor)}</span>
            </div>
          ))}
        </div>
      </>
    )
  }

  if (bloco.tipo === 'tabela') {
    const larguraTotal = bloco.colunas.reduce((total, coluna) => total + (coluna.larguraMm ?? 0), 0)
    return (
      <>
        <div className="sr-block-title">{bloco.titulo}</div>
        {bloco.linhas.length === 0 ? (
          <p className="sr-empty">Sem registros no banco para este quadro.</p>
        ) : (
          <table className="sr-table">
            <colgroup>
              {bloco.colunas.map((coluna, index) => (
                <col key={`${coluna.titulo}-${index}`} style={coluna.larguraMm ? { width: `${coluna.larguraMm}mm` } : undefined} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {bloco.colunas.map((coluna, index) => (
                  <th
                    key={`${coluna.titulo}-${index}`}
                    className={Alinhamento(coluna.alinhar)}
                    style={larguraTotal === 0 && !coluna.larguraMm ? undefined : { width: coluna.larguraMm ? `${coluna.larguraMm}mm` : undefined }}
                  >
                    {coluna.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloco.linhas.map((linha, indexLinha) => (
                <tr key={indexLinha}>
                  {bloco.colunas.map((coluna, indexColuna) => (
                    <td key={indexColuna} className={Alinhamento(coluna.alinhar)}>
                      {textoCelula(linha[indexColuna])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {bloco.nota && <p className="sr-figure figcaption sr-empty">{bloco.nota}</p>}
      </>
    )
  }

  if (bloco.tipo === 'texto') {
    return (
      <>
        <div className="sr-block-title">{bloco.titulo}</div>
        <p className="sr-text">{bloco.texto}</p>
      </>
    )
  }

  if (bloco.tipo === 'lista') {
    return (
      <>
        <div className="sr-block-title">{bloco.titulo}</div>
        <ul className="sr-list">
          {bloco.itens.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </>
    )
  }

  if (bloco.tipo === 'historico') {
    return (
      <>
        <div className="sr-block-title">{bloco.titulo}</div>
        {bloco.itens.length === 0 ? (
          <p className="sr-empty">Sem histórico registrado.</p>
        ) : (
          <table className="sr-table">
            <thead>
              <tr>
                <th style={{ width: '32mm' }}>Data</th>
                <th style={{ width: '46mm' }}>Responsável</th>
                <th>Registro</th>
              </tr>
            </thead>
            <tbody>
              {bloco.itens.map((item, index) => (
                <tr key={index}>
                  <td>{textoCelula(item.quando)}</td>
                  <td>{textoCelula(item.quem)}</td>
                  <td>{textoCelula(item.oque)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </>
    )
  }

  if (bloco.tipo === 'imagem') {
    return (
      <>
        <div className="sr-block-title">{bloco.titulo}</div>
        <figure className="sr-figure">
          <img src={bloco.url} alt={bloco.legenda ?? bloco.titulo} style={bloco.alturaMm ? { maxHeight: `${bloco.alturaMm}mm` } : undefined} />
          {bloco.legenda && <figcaption>{bloco.legenda}</figcaption>}
        </figure>
      </>
    )
  }

  return (
    <>
      {bloco.titulo && <div className="sr-block-title">{bloco.titulo}</div>}
      <div className="sr-signs">
        {bloco.assinantes.map((assinante, index) => (
          <div className="sr-sign" key={index}>
            <div className="sr-sign-line">{textoCelula(assinante.nome)}</div>
            <div className="sr-sign-role">{assinante.papel}</div>
          </div>
        ))}
      </div>
    </>
  )
}

type Props = {
  documento: Documento
  contexto: ContextoRelatorio
  emissao: Date
  avisoEmissao?: string
}

export function SynqraRelatorioA4({ documento, contexto, emissao, avisoEmissao }: Props) {
  const paginas = paginar(documento.blocos)
  const total = paginas.length
  const linhaEmpresa = [contexto.empresaEndereco, contexto.empresaCidadeUf].filter(Boolean).join(' — ')
  const emitente = `${contexto.emitenteNome}${contexto.emitentePerfil ? ` (${contexto.emitentePerfil})` : ''}`

  return (
    <>
      {paginas.map((blocos, index) => (
        <section className="sr-page" key={index} aria-label={`Página ${index + 1} de ${total}`}>
          <header className="sr-head">
            <div className="sr-head-top">
              <div className="sr-brand">
                <img src={LOGO_SISNQRA} alt="SYSNQRA" />
                <div className="sr-company">
                  <div className="sr-company-name">{contexto.empresaNome}</div>
                  {contexto.empresaRazao && contexto.empresaRazao !== contexto.empresaNome && (
                    <div className="sr-company-line">{contexto.empresaRazao}</div>
                  )}
                  {contexto.empresaCnpj && <div className="sr-company-line">CNPJ {contexto.empresaCnpj}</div>}
                  {linhaEmpresa && <div className="sr-company-line">{linhaEmpresa}</div>}
                  {contexto.empresaContato && <div className="sr-company-line">{contexto.empresaContato}</div>}
                </div>
              </div>
              <div className="sr-doc-id">
                <div className="sr-doc-kind">{documento.tipo}</div>
                <div className="sr-doc-code">{documento.codigo}</div>
                <div className="sr-doc-module">{documento.modulo}</div>
                {documento.unidade && <div className="sr-doc-module">Unidade: {documento.unidade}</div>}
              </div>
              {documento.qrcode && (
                <div className="sr-doc-qr">
                  <QRCodeSVG value={documento.qrcode.valor} size={92} level="M" aria-label={`QR Code do documento ${documento.codigo}`} />
                  {documento.qrcode.legenda && <span className="sr-doc-qr-caption">{documento.qrcode.legenda}</span>}
                </div>
              )}
            </div>
            <h1 className="sr-title">{documento.titulo}</h1>
            {documento.subtitulo && <p className="sr-subtitle">{documento.subtitulo}</p>}
            <div className="sr-meta">
              <span>
                <b>Emissão</b> {formatarDataHora(emissao)}
              </span>
              <span>
                <b>Responsável</b> {emitente}
              </span>
              {contexto.unidade && !documento.unidade && (
                <span>
                  <b>Setor</b> {contexto.unidade}
                </span>
              )}
              <span>
                <b>Página</b> {index + 1} de {total}
              </span>
            </div>
            {index > 0 && <div className="sr-continua">Continuação do documento {documento.codigo}</div>}
          </header>

          <div className="sr-body">
            {blocos.map((bloco, indexBloco) => (
              <div className="sr-block" key={indexBloco}>
                <ConteudoBloco bloco={bloco} />
              </div>
            ))}
            {documento.observacoes && index === total - 1 && (
              <div className="sr-block">
                <div className="sr-block-title">Observações</div>
                <p className="sr-text">{documento.observacoes}</p>
              </div>
            )}
          </div>

          <footer className="sr-foot">
            <span>
              {contexto.empresaNome}
              {contexto.rodape ? ` — ${contexto.rodape}` : ''}
            </span>
            <Fragment>
              <span>
                {documento.tipo} {documento.codigo} · emitido em {formatarDataHora(emissao)}
                {avisoEmissao ? ` · ${avisoEmissao}` : ''}
              </span>
              <span className="sr-foot-page">
                Página {index + 1} de {total}
              </span>
            </Fragment>
          </footer>
        </section>
      ))}
    </>
  )
}

export type { Documento, Bloco }
