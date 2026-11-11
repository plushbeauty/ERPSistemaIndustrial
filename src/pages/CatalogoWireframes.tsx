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
  {
    id: '04',
    title: 'Financeiro — Fluxo de Caixa e Disponibilidades',
    route: '/pageprincipal/financeiro/fluxo-caixa',
    content: String.raw`TELA 04 — FINANCEIRO: FLUXO DE CAIXA E DISPONIBILIDADES (/pageprincipal/financeiro/fluxo-caixa)
====================================================================================================
[BREADCRUMB] SYSNQRA ERP INDUSTRIAL / FINANCEIRO
[HEADER] Fluxo de Caixa e Disponibilidades      [Badge: ● SUPABASE CONECTADO] [Btn Sec: ATUALIZAR (135x40px)]
====================================================================================================
[01 VISÃO FINANCEIRA - 4 CARDS]
[ Entradas previstas: R$ 0,00 ] [ Saídas previstas: R$ 0,00 ] [ Saldo projetado: R$ 0,00 ] [ Saldo liquidado: R$ 0,00 ]
----------------------------------------------------------------------------------------------------
[02 NOVO LANÇAMENTO]
Descrição *: [ Edit: 420x40px ]   Movimento *: [ Select: 160x40px ]   Valor (R$) *: [ Edit: 160x40px ]   Vencimento *: [ Edit Date: 160x40px ]
O título será gravado como PENDENTE.                                      [ Btn Pri: REGISTRAR TÍTULO (190x42px) ]
----------------------------------------------------------------------------------------------------
[03 EXTRATO PROJETADO - DBGRID]

| Movimento | Descrição | Vencimento | Baixa | Valor (R$) | Status |
Exibindo 0–0 de 0                               [ Btn: ANTERIOR (110x36px) ] Página 1 de 1 [ Btn: PRÓXIMA (110x36px) ]
====================================================================================================`,
  },
  {
    id: '05',
    title: 'Financeiro / Tesouraria — Contas a Receber',
    route: '/pageprincipal/financeiro/contas-receber',
    content: String.raw`TELA 05 — FINANCEIRO / TESOURARIA: CONTAS A RECEBER (/pageprincipal/financeiro/contas-receber)
====================================================================================================
[BREADCRUMB] Financeiro / Tesouraria › Contas a receber
[HEADER] Contas a receber                          [Btn Sec: Atualizar (135x40px)] [Btn Pri: + Novo título (155x40px)]
====================================================================================================
[ Títulos: 0 ] [ Saldo em aberto: R$ 0,00 ] [ Parcelas vencidas: 0 ] [ Parceiros ativos: 1 ]
Buscar título: [ Edit: 520x40px | Parceiro, documento, categoria ou status ]          [Badge: 0 título(s)]

| Parceiro / descrição | Documento | Origem | Parcelas | Total / saldo | Status | Ações [Ver/Baixar/Editar] |
Exibindo 0–0 de 0                               [ Btn: Anterior (110x36px) ] Página 1 de 1 [ Btn: Próxima (110x36px) ]
====================================================================================================`,
  },
  {
    id: '06',
    title: 'Financeiro / Tesouraria — Caixa (Fluxo de Caixa)',
    route: '/pageprincipal/financeiro/caixa',
    content: String.raw`TELA 06 — FINANCEIRO / TESOURARIA: CAIXA (FLUXO DE CAIXA) (/pageprincipal/financeiro/caixa)
====================================================================================================
[BREADCRUMB] Financeiro / Tesouraria › Caixa
[HEADER] Fluxo de caixa                                                   [Btn Sec: Atualizar (135x40px)]
====================================================================================================
[ A receber hoje: R$ 0,00 ] [ A pagar hoje: R$ 0,00 ] [ A receber no mês: R$ 0,00 ] [ A pagar no mês: R$ 0,00 ]
[ Recebido no mês: R$ 0,00] [ Pago no mês: R$ 0,00  ] [ A receber no ano: R$ 0,00 ] [ A pagar no ano: R$ 0,00 ]
----------------------------------------------------------------------------------------------------
[ DIA (90x40) ] [ SEMANA (100x40) ] [ MÊS (90x40) ] [ ANO (90x40) ]   Data Base: [ Edit Date: 160x40 ]   Conta: [ Select: 260x40 ]

| Data / Período | Entradas (R$) | Saídas (R$) | Variação do Dia (R$) | Variação Acumulada (R$) |
====================================================================================================`,
  },
  {
    id: '07',
    title: 'Comissões — Regras, Cálculo e Perfil do Vendedor',
    route: '/pageprincipal/comissoes/regras',
    content: String.raw`TELA 07 — COMISSÕES: REGRAS, CÁLCULO E PERFIL DO VENDEDOR
Rotas relacionadas: /pageprincipal/comissoes/regras · /pageprincipal/comissoes/calculo · /pageprincipal/comissoes/perfil
====================================================================================================
[BREADCRUMB] FINANCEIRO › COMISSÕES › CONTROLADORIA COMERCIAL
[ Aba: Regras (130x40) ]   [ Aba: Cálculo (130x40) ]   [ Aba: Perfil Vendedor (160x40) ]
----------------------------------------------------------------------------------------------------
1. REGRAS DE COMISSÃO:
   Perfil *: [ Select: 300x40 ] | Novo Perfil: [ Edit: 240x40 ] [ + Novo (110x40) ]
   SKU Produto *: [ Edit: 340x40 ] | % Comissão *: [ Edit: 140x40 ] | Meta Qtd *: [ Edit: 140x40 ] [ + Add (110x40) ]

   | Perfil | SKU | Produto | % Comissão | Meta Qtd | Ações | -> [ Btn Pri: Gravar (140x42px) ]
2. CÁLCULO DE COMISSÃO:
   Competência *: [ Edit Month: 190x40 ] | Vendedor *: [ Edit: 340x40 ] | Meta Faturamento: [ Edit: 180x40 ] [ Btn Pri: Calcular (140x40) ]

   | Pedido | Cliente | SKU | Qtd Faturada | Valor Total Nota | % Comissão Regra | Comissão Líquida R$ |
   [ Total Vendas: R$ 0,00 ] [ Meta Batida: NÃO ] [ Total Comissão: R$ 0,00 ] [ Btn Sec: Exportar XLSX (160x42px) ]
3. PERFIL DO VENDEDOR:
   Vendedor/Agente *: [ Edit: 320x40 ] | Perfil de Regras *: [ Edit: 320x40 ] | Status *: [ Select: 160x40 ] [ Btn Pri: Gravar Vínculo (165x40) ]

   | Vendedor | Perfil | Status | Ações |
====================================================================================================`,
  },
  {
    id: '08',
    title: 'Controladoria — Engenharia de Custo Padrão',
    route: '/pageprincipal/controladoria/engenharia-custo-padrao',
    content: String.raw`TELA 08 — CONTROLADORIA: ENGENHARIA DE CUSTO PADRÃO
[HEADER bg-brand + bg-glow] FINANCEIRO › ENGENHARIA DE CUSTO PADRÃO [Btn: Emitir Planilha] [Btn: Salvar Preço]
Formação de Preço por Custo Absorvido | Produto alvo * | Máquina/Centro custo * | Qtd. projeção * | Tempo ciclo/un | Margem % *
[Grid 65% Custo BOM Teórico MRP] | [Grid 35% Engenharia do Preço]
| Componente | Qtd. MRP | Custo Unit. | Total |
Estado vazio: Selecione produto com BOM ativa
(+) Matéria-prima BOM | (+) Fabricação | (+) Hora/Máquina
(=) CUSTO FÁBRICA TOTAL | (=) PREÇO SUGERIDO`,
  },
  {
    id: '09',
    title: 'Controladoria — Desvios de Custo (Padrão × Real)',
    route: '/pageprincipal/controladoria/desvios-custo',
    content: String.raw`TELA 09 — CONTROLADORIA: DESVIOS DE CUSTO (PADRÃO × REAL)
[HEADER bg-brand + bg-glow] FINANCEIRO › CUSTOS INDUSTRIAIS [Btn: Atualizar] [Btn: Imprimir]
[4 Cards -mt-12 animate-rise] Custo Padrão | Custo Real | Desvio Abs. | Variação %
[Panel Filtros] Competência * [Month: 170x40] | Produto [280x40] | OP [160x40] | Status [Select: 180x40]
[Panel Apuração por Produto] | Cód. Produto | Descrição | Qtd. Produzida | Custo Padrão Un. | Custo Real Un. | Desvio R$ | Var. % |`,
  },
  {
    id: '10',
    title: 'Controladoria — Lucratividade, Razão Geral e Decimais (Plastibor)',
    route: '/pageprincipal/controladoria/lucratividade-razao-decimais',
    content: String.raw`TELA 10 — CONTROLADORIA: LUCRATIVIDADE, RAZÃO GERAL E DECIMAIS (PLASTIBOR)
[Btn Voltar] [HEADER bg-brand] CONTROLADORIA
1. LUCRATIVIDADE: Mês/Competência * [Month: 200x40] | Margem Alvo % * [150x40 | 25] | [Btn Filtrar Custos]
| Nº Pedido | Razão Social/Produtos | Faturamento Bruto | Custo Fabricação | Margem Bruta | Taxa de Margem (Pill CUSTO PENDENTE) |
2. RAZÃO GERAL GL: Empresa * [Disabled: 280x40] | Banco/Diário * [Select: 340x40] | [Btn Filtrar]
| Data | Documento | Descrição | Débito | Crédito | SALDO TOTAL DO RAZÃO
3. PRECISÃO DECIMAL/CUBAGEM: Código * [180x40 | VOLUME] | Descrição * [420x40] | Casas * [120x40 | 4] | [Btn Gravar]
| Código | Descrição | Casas | Exemplo | Ações |
Padrões: VOLUME, PESO_LIQ, PESO_BRUTO, MEDIDA_TEC, QTD_BOM, VALOR_UNIT`,
  },
  {
    id: '11',
    title: 'Controladoria — Estorno Documental e Compliance',
    route: '/pageprincipal/controladoria/estorno-documental-compliance',
    content: String.raw`TELA 11 — CONTROLADORIA: ESTORNO DOCUMENTAL E COMPLIANCE
[Btn Voltar] [HEADER bg-brand] Assistente de Retificação e Compliance Financeiro [Pill Acesso Restrito]
[Panel Localizar] Tipo Documento * [Select: 240x40] | Nº Documento * [300x40] | Data [Date: 160x40] | [Btn Buscar]
[Panel Originais Disabled] Nº Doc | Entidade | Valor | Data | Conta | Centro Custo
[Panel Compliance] Motivo * [Select: 340x40] | Data Estorno * [Date: 160x40] | Ação Título * [Select: 290x40]
Justificativa * [Textarea 100%x85px] | Anexo [File: 480x40]
[ ] Período contábil ABERTO [ ] Ciente do lançamento inverso de auditoria
[Btn Limpar Tela] [Btn Destructive Executar Estorno Documental]
[Panel Log] Data/Hora | Documento Original | Tipo Operação | Valor Estornado | Usuário | Motivo | Comprovante`,
  },
  {
    id: '12',
    title: 'RH — Funcionários, Turnos e EPIs (NR-6)',
    route: '/pageprincipal/rh/gestao-pessoas',
    content: String.raw`TELA 12 — RH / DEPARTAMENTO PESSOAL: FUNCIONÁRIOS, TURNOS E EPIS (NR-6)
[HEADER bg-brand] RH / DEPARTAMENTO PESSOAL — GESTÃO DE PESSOAS
[Abas] Visão geral | Funcionários | Turnos e escalas | Ponto | Treinamentos | EPIs | Documentos
FUNCIONÁRIOS: Foto 3x4 | Nome * | Nasc * | CPF * | RG | Celular | Fixo | E-mail | Matrícula * | Admissão * | Cargo * | Depto * | Regime * | Turno * | RFID | Salário | Custo H/H | Situação *
DBGrid: Busca | Matrícula | Colaborador | Cargo/Departamento | Situação | Ação
TURNOS: Código * | Nome * | Escala * | Entrada * | Intervalos | Saída * | Tolerância | Dias Seg-Dom | Adicional Noturno | [Btn Gravar Turno]
EPIs NR-6: Colaborador * | EPI * | Nº CA * | Validade CA * | Qtd * | Data * | Motivo * | Próx. Troca | Termo * | Obs/Tamanho | [Btn Registrar Entrega]
DBGrid: Data Entrega | Colaborador | EPI | Nº CA | Validade CA | Qtd | Motivo | Status/Termo | Ações`,
  },
  {
    id: '13',
    title: 'Produção / Qualidade — Ficha de Montagem e Acabamento',
    route: '/pageprincipal/producao/ficha-montagem',
    content: String.raw`TELA 13 — PRODUÇÃO · QUALIDADE: FICHA DE MONTAGEM E ACABAMENTO
[HEADER bg-brand + bg-glow] Logo Synqra [Btn Imprimir ficha]
[4 Cards -mt-12 animate-rise] Etapas montagem 0/0 | Parâmetros acabamento 0/0 | Peças inspecionadas 0 | Situação lote Em aberto
[Panel Identificação da ordem] Grid 5 colunas sem dados fictícios: OP | Produto (2 cols) | Código | Cliente | Quantidade | Lote | Data | Turno | Linha/posto
[Abas] Montagem | Acabamento | Inspeção | Liberação
MONTAGEM: progresso + Check | Seq. | Operação | Padrão | Padrão min | Real min | Operador + gráfico tempo/etapa
ACABAMENTO: Característica | Mínimo | Máximo | Medido | Resultado Pill OK/Fora/Pendente
INSPEÇÃO: Peças aprovadas + contadores por defeito + Inspecionadas | Aprovadas | Refugo + Pareto
LIBERAÇÃO: decisões LIBERADO | RETRABALHO | SEGREGADO + Observações + assinaturas Montagem, Acabamento e Qualidade
Padrão visual: bg-brand + bg-glow; cards -mt-12 animate-rise; Panel/Btn/Pill/Th/Td; inputs rounded-lg border border-input bg-card; print:.`,
  }
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
          <p>Referências estruturais para construção das telas. Identidade visual oficial: FichaMontagem (bg-brand, bg-glow, cards -mt-12 animate-rise, Panel/Btn/Pill/Th/Td e suporte print:). Medidas são contratos; não são dados fictícios.</p>
        </div>
        <div className="wf-head-actions">
          <button type="button" className="wf-button" onClick={() => navigate('/pageprincipal')}>
            <ArrowLeft size={14} /> Voltar ao ERP
          </button>
          <span className="wf-button" aria-label="Quantidade de wireframes cadastrados">
            <FileText size={14} /> 13 telas registradas
          </span>
        </div>
      </header>

      <p className="wf-summary"><span className="wf-count">03</span> Blocos 1, 2 e 3 · Financeiro, Controladoria, RH, Produção e Qualidade · 13 wireframes recebidos e registrados</p>

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
