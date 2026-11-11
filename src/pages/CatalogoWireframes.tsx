import { useState } from 'react'
import { ArrowLeft, Check, Clipboard, FileText, Layers3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type Wireframe = { id: string; title: string; route: string; content: string }

const wireframes: Wireframe[] = [
  {
    id: '01',
    title: 'Financeiro — Retificação Financeira',
    route: '/pageprincipal/financeiro/retificacao',
    content: String.raw`TELA 01 — FINANCEIRO: RETIFICAÇÃO FINANCEIRA (/pageprincipal/financeiro/retificacao)
====================================================================================================
[HEADER] Retificação Financeira                                      [Btn: Histórico Geral (160x40px)]
====================================================================================================
Busca Rápida: [ Edit: 380x40px ]   Tipo: [ Select: 160x40px ]   Status: [ Select: 160x40px ]   [ Btn: Buscar (110x40px) ]

| ID | Documento / NF | Cliente / Fornecedor | Vencimento | Valor Original | Status | Ação [Retificar] |
----------------------------------------------------------------------------------------------------
Dados Originais (Disabled): Valor [180x40] | Vencimento [150x40] | Conta [240x40] | Centro Custo [240x40]
Novos Dados: Tipo Retificação *: [ Select: 350x40 ] | Novo Valor *: [180x40] | Nova Data *: [160x40] | Juros: [150x40] | Desconto: [150x40]
Nova Conta: [ Select: 340x40 ] | Novo Centro Custo: [ Select: 340x40 ]
Justificativa *: [ Textarea: 100% x 90px ] | Anexo: [ Dropzone: 100% x 56px ]
[ Btn Sec: Cancelar (120x42px) ]   [ Btn Pri: Confirmar Retificação (210x42px) ]
====================================================================================================`,
  },
  {
    id: '02',
    title: 'Financeiro — Notas de Débito',
    route: '/pageprincipal/financeiro/notas-debito',
    content: String.raw`TELA 02 — FINANCEIRO: NOTAS DE DÉBITO (/pageprincipal/financeiro/notas-debito)
====================================================================================================
[HEADER] Notas de Débito e Rotinas Financeiras                      [Btn: + Nova Nota de Débito (190x40px)]
====================================================================================================
[ Notas de Débito (160x40) ] [ Conciliação (180x40) ] [ Importar Extratos (210x40) ] [ Demais Operações (170x40) ]
Busca: [ Edit: 380x40px ]   Tipo: [ Select: 160x40px ]   Status: [ Select: 160x40px ]   [ Btn: Buscar (110x40px) ]

| Nº Nota | Documento Ref. | Cliente / Fornecedor | Emissão | Vencimento | Valor (R$) | Status | Ações |
----------------------------------------------------------------------------------------------------
Nº Nota: [ Disabled: 180x40 ] | Doc. Origem: [180x40] | Emissão *: [150x40] | Vencimento *: [150x40]
Entidade *: [ Autocomplete: 440x40 ] | Tipo *: [ Select: 280x40 ]
Valor Principal *: [180x40] | Acréscimos: [160x40] | Descontos: [160x40] | Total: [ Disabled: 180x40 ]
Conta *: [ Select: 340x40 ] | Centro Custo *: [ Select: 340x40 ]
Motivo *: [ Textarea: 100% x 90px ] | [ Btn Sec: Cancelar (140x42px) ] [ Btn Pri: Salvar Nota de Débito (210x42px) ]
====================================================================================================`,
  },
  {
    id: '03',
    title: 'Financeiro — Configurações de Notas de Débito',
    route: '/pageprincipal/financeiro/notas-debito/configuracoes',
    content: String.raw`TELA 03 — FINANCEIRO: CONFIGURAÇÕES DE NOTAS DE DÉBITO (/pageprincipal/financeiro/notas-debito/configuracoes)
====================================================================================================
[HEADER] Configurações de Notas de Débito                           [Btn: Voltar para Rotinas (170x40px)]
====================================================================================================
Prefixo: [160x40] | Próximo Nº *: [180x40] | Série: [150x40] | Dias Venc. *: [150x40]
Natureza Padrão *: [ Select: 340x40 ] | Layout PDF *: [ Select: 340x40 ]
Conta Padrão *: [ Select: 340x40 ] | Centro Custo Padrão *: [ Select: 340x40 ]
Regra Conciliação: [ Select: 340x40 ] | Tolerância Divergência: [180x40]
Limite Alçada: [180x40] | Multa (%): [150x40] | Juros (%): [150x40] | E-mail Auditoria: [240x40]
Observações Padrão: [ Textarea: 100% x 90px ] | [ Btn Pri: Salvar Configurações (210x42px) ]
====================================================================================================`,
  },
]

export default function CatalogoWireframes() {
  const navigate = useNavigate()
  const [copied, setCopied] = useState<string | null>(null)
  const [copyError, setCopyError] = useState<string | null>(null)

  async function copyWireframe(item: Wireframe) {
    try {
      await navigator.clipboard.writeText(item.content)
      setCopied(item.id)
      setCopyError(null)
      window.setTimeout(() => setCopied(current => current === item.id ? null : current), 2200)
    } catch {
      setCopyError(item.id)
      setCopied(null)
    }
  }

  return (
    <main className="sysnqra-wireframes">
      <style>{`
        .sysnqra-wireframes{max-width:1500px;margin:0 auto;padding:22px 24px 40px;color:#123b50;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
        .sysnqra-wireframes *{box-sizing:border-box}
        .wf-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:20px;padding:20px 22px;border:1px solid #d3e3ea;border-radius:14px;background:#fff}
        .wf-kicker{display:flex;align-items:center;gap:7px;color:#2d8db8;font-size:10px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}
        .wf-head h1{margin:7px 0 5px;font-size:25px;line-height:1.2;letter-spacing:-.03em;color:#123b50}
        .wf-head p{margin:0;color:#607987;font-size:13px}
        .wf-head-actions{display:flex;gap:8px;flex-wrap:wrap}
        .wf-button{height:38px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 13px;border:1px solid #c9dce5;border-radius:8px;background:#fff;color:#123b50;font-size:12px;font-weight:800;cursor:pointer}
        .wf-button:hover{border-color:#2d8db8;background:#f3fbfd}
        .wf-button:focus-visible{outline:3px solid #8ed6e1;outline-offset:2px}
        .wf-button.primary{border-color:#176b8a;background:#176b8a;color:#fff}
        .wf-button.primary:hover{background:#125a75}
        .wf-summary{display:flex;align-items:center;gap:10px;margin:0 0 14px;color:#5f7785;font-size:12px}
        .wf-count{display:inline-grid;place-items:center;min-width:25px;height:25px;padding:0 7px;border-radius:7px;background:#e8f5f8;color:#176b8a;font-weight:900}
        .wf-list{display:grid;gap:14px}
        .wf-card{overflow:hidden;border:1px solid #d3e3ea;border-radius:13px;background:#fff;box-shadow:0 3px 12px rgba(18,59,80,.035)}
        .wf-card-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 17px;border-bottom:1px solid #e4edf1;background:#fbfdfe}
        .wf-title{display:flex;align-items:center;gap:11px;min-width:0}
        .wf-number{display:grid;place-items:center;flex:none;width:34px;height:34px;border-radius:9px;background:#e8f5f8;color:#176b8a;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;font-weight:900}
        .wf-title h2{margin:0;color:#123b50;font-size:14px;font-weight:850}
        .wf-title a{display:block;margin-top:4px;color:#6c8795;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;text-decoration:none;overflow-wrap:anywhere}
        .wf-title a:hover{color:#176b8a;text-decoration:underline}
        .wf-content{overflow:auto;padding:17px 18px;background:#fff}
        .wf-content pre{width:max-content;min-width:100%;margin:0;color:#254858;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.75;white-space:pre;tab-size:2}
        .wf-feedback{margin:0 17px 13px;color:#a23c37;font-size:11px;font-weight:700}
        @media(max-width:720px){.sysnqra-wireframes{padding:12px}.wf-head{flex-direction:column;padding:16px}.wf-head-actions{width:100%}.wf-head-actions .wf-button{flex:1}.wf-card-head{align-items:flex-start;flex-direction:column}.wf-content{padding:13px}.wf-content pre{font-size:11px}}
      `}</style>

      <header className="wf-head">
        <div>
          <div className="wf-kicker"><Layers3 size={14} /> SYSNQRA ERP INDUSTRIAL · DOCUMENTAÇÃO DE PRODUTO</div>
          <h1>Catálogo Mestre de Wireframes</h1>
          <p>Referências estruturais para construção das telas. As medidas são contratos de dimensão, não conteúdo fictício.</p>
        </div>
        <div className="wf-head-actions">
          <button type="button" className="wf-button" onClick={() => navigate('/pageprincipal')}>
            <ArrowLeft size={14} /> Voltar ao ERP
          </button>
          <span className="wf-button" aria-label="Quantidade de wireframes cadastrados">
            <FileText size={14} /> 03 telas registradas
          </span>
        </div>
      </header>

      <p className="wf-summary"><span className="wf-count">03</span> Bloco 1 · Financeiro · Wireframes recebidos e registrados</p>

      <section className="wf-list" aria-label="Wireframes cadastrados">
        {wireframes.map(item => (
          <article className="wf-card" key={item.id}>
            <header className="wf-card-head">
              <div className="wf-title">
                <span className="wf-number">{item.id}</span>
                <div>
                  <h2>{item.title}</h2>
                  <a href={item.route}>{item.route}</a>
                </div>
              </div>
              <button type="button" className="wf-button primary" onClick={() => void copyWireframe(item)}>
                {copied === item.id ? <Check size={14} /> : <Clipboard size={14} />}
                {copied === item.id ? 'Copiado' : 'Copiar Wireframe'}
              </button>
            </header>
            <div className="wf-content"><pre>{item.content}</pre></div>
            {copyError === item.id && <p className="wf-feedback" role="alert">Não foi possível copiar automaticamente. Selecione o bloco e copie manualmente.</p>}
          </article>
        ))}
      </section>
    </main>
  )
}
