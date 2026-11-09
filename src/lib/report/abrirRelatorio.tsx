/*
 * SYSNQRA ERP INDUSTRIAL — motor de impressão dos relatórios profissionais
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-05
 * @REVISAO: REV-RELATORIO-A4-20261105-01 — monta a folha A4 fora da árvore do sistema e imprime só ela
 * @STATUS_APROVACAO: ORDEM GERAL DO PROPRIETÁRIO EM 2026-11-05, item 5 — "O botão Imprimir deve
 * gerar o documento completo, com os dados reais do banco" e "Não imprimir: menu lateral, botões
 * de ação, filtros da tela, cards de navegação, barra de ferramentas"
 */
import { useCallback, useEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { FileText, Printer, X } from 'lucide-react'

import { SynqraRelatorioA4 } from '../../components/report/SynqraRelatorioA4'
import type { Documento } from '../../lib/report/documento'
import { carregarContextoRelatorio, type ContextoRelatorio } from './relatorioContexto'
import { relogioDoServidor } from '../serverClock'

const CLASSE_IMPRESSAO = 'sr-printing'

type ViewerProps = {
  documento: Documento
  contexto: ContextoRelatorio
  emissao: Date
  avisoEmissao: string
  onFechar: () => void
}

function Viewer({ documento, contexto, emissao, avisoEmissao, onFechar }: ViewerProps) {
  const [avisando, setAvisando] = useState(false)

  const imprimir = useCallback(() => {
    setAvisando(true)
    // Dois quadros: a folha já está no DOM; aqui o navegador só aplica o CSS de impressão.
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()))
  }, [])

  useEffect(() => {
    const aoTerminar = () => setAvisando(false)
    window.addEventListener('afterprint', aoTerminar)
    return () => window.removeEventListener('afterprint', aoTerminar)
  }, [])

  useEffect(() => {
    const aoPressionar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', aoPressionar)
    return () => window.removeEventListener('keydown', aoPressionar)
  }, [onFechar])

  return (
    <div className="sr-overlay" role="dialog" aria-modal="true" aria-label={`Relatório ${documento.tipo} ${documento.codigo}`}>
      <div className="sr-toolbar">
        <div className="sr-toolbar-title">
          <FileText size={18} aria-hidden="true" />
          <strong>
            {documento.tipo} · {documento.codigo}
          </strong>
          <span>{documento.titulo}</span>
        </div>
        <div className="sr-toolbar-actions">
          <span className="sr-hint">Na janela do navegador escolha a impressora ou “Salvar como PDF”.</span>
          <button type="button" className="sr-btn" onClick={imprimir}>
            <Printer size={16} aria-hidden="true" /> Imprimir / salvar PDF
          </button>
          <button type="button" className="sr-btn sr-btn-ghost" onClick={onFechar}>
            <X size={16} aria-hidden="true" /> Fechar
          </button>
        </div>
      </div>

      {avisando && (
        <p className="sr-hint" style={{ textAlign: 'center', marginBottom: '16px' }}>
          Se a janela de impressão não abriu, use Ctrl+P — a folha A4 é o que será impresso.
        </p>
      )}

      <div className="sr-sheet">
        <SynqraRelatorioA4 documento={documento} contexto={contexto} emissao={emissao} avisoEmissao={avisoEmissao} />
      </div>
    </div>
  )
}

let raiz: Root | null = null
let container: HTMLDivElement | null = null

function desmontar() {
  document.body.classList.remove(CLASSE_IMPRESSAO)
  if (raiz) {
    raiz.unmount()
    raiz = null
  }
  if (container) {
    container.remove()
    container = null
  }
}

/**
 * Abre o relatório profissional do documento. Nada aqui desenha a tela do sistema: a folha A4 é
 * montada num raiz React separada, fora do #root, e o CSS de impressão esconde o resto.
 * Empresa, unidade e responsável vêm do banco; se a leitura falhar, o relatório não é emitido.
 */
export async function abrirRelatorio(documento: Documento): Promise<void> {
  if (raiz) desmontar()

  const contexto = await carregarContextoRelatorio()
  const relogio = await relogioDoServidor()
  const emissao = relogio.agora ?? new Date()
  const avisoEmissao = relogio.agora ? '' : relogio.aviso

  container = document.createElement('div')
  container.id = 'synqra-report-root'
  document.body.appendChild(container)
  document.body.classList.add(CLASSE_IMPRESSAO)

  raiz = createRoot(container)
  raiz.render(
    <Viewer
      documento={documento}
      contexto={contexto}
      emissao={emissao}
      avisoEmissao={avisoEmissao}
      onFechar={() => {
        desmontar()
      }}
    />,
  )
}
