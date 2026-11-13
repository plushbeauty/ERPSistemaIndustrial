# Relatório de divergências visuais — botões, cards e textos

- **Projeto:** SYSNQRA ERP INDUSTRIAL
- **Data:** 26/10/2026
- **Base auditada:** `main`, revisão `1391a2591606ac496c96bd72cf81b623af9d1211`
- **Escopo:** análise estática do inventário de 278 arquivos/declarações detectadas e comparação pontual de componentes e páginas de referência.
- **Status:** **DIVERGÊNCIAS CONFIRMADAS NO CÓDIGO**. Ainda não é homologação visual em navegador.

## Conclusão executiva

As telas **não usam ainda um contrato visual único** para botões, campos, cards, tipografia e espaçamentos. Há evidência concreta de alturas diferentes, estilos locais próprios e classes de cards divergentes. A auditoria anterior classificava páginas, mas não respondia diretamente se os elementos repetidos estavam iguais; este relatório registra esse problema.

## Evidências quantitativas do inventário estático

Fonte: `docs/erp-standardization/generated/ui-audit.json`, revisão `UI-AUDIT-R1`.

| Indicador | Resultado | Interpretação |
|---|---:|---|
| Arquivos inspecionados pelo inventário | 278 | Inventário amplo de código, não 278 inspeções visuais em navegador |
| Controles identificados | 2.475 | 1.154 botões, 951 inputs, 285 selects e 85 textareas |
| Arquivos com tokens compartilhados de formulário detectados | 2 de 278 | O padrão compartilhado não aparece uniformemente no inventário |
| Arquivos sem indícios locais de estilo detectados | 169 de 278 | Pode haver CSS herdado; exige checagem do componente renderizado |
| Controles sem altura estática detectável pelo analisador | 2.422 | Sinal de que a altura não pode ser comprovada por essa análise; não prova sozinho que estejam visualmente errados |
| Classes de arredondamento detectadas | 1.083 | Há várias escolhas de raio de borda; a contagem não distingue sozinha os valores |

## Divergências confirmadas

### 1. Altura e densidade dos botões

- `src/pages/Configuracoes.tsx`: `buttonStyle` define `h-6` (24 px), `rounded-sm` e `text-xs`.
- `src/pages/NovoPedido.tsx`: `buttonStyle` define `h-[30px]`, `rounded-[2px]` e `text-[10px]`.
- `src/pages/PCPParadas.tsx`: botões operacionais com `h-[30px]`, `rounded-lg` e `text-xs`.
- A referência industrial solicitada usa controles operacionais compactos de 36 px (`h-9`) quando apropriado.

**Resultado:** há diferenças explícitas de altura, raio e tamanho de texto. Não padronizar automaticamente telas congeladas sem autorização; primeiro definir o contrato e classificar exceções aprovadas.

### 2. Cards principais e painéis

- `src/pages/EstoqueAjustes.tsx): painel `rounded-xl border border-slate-200 bg-white p-4 shadow-sm`.
- `src/pages/EngenhariaRevisoesBOM.tsx): estrutura principal `bg-slate-50 p-4 md:p-6`, título `text-2xl font-black` e botões com padding `px-4 py-3`.
- `src/components/ui/kpi.tsx`: KPI com `rounded-xl`, sombra própria, `p-4` e ícone de `h-12 w-12`.
- A Central de Compras aprovada usa uma anatomia de cartões principais e atalhos própria, que deve servir de referência para o módulo Compras; não se deve substituir a composição aprovada por um modelo genérico.

**Resultado:** os painéis diferem em raio, padding, sombra, tamanho de ícone e densidade. É necessário separar os tipos de card (KPI, formulário, tabela, acesso rápido e alerta) e padronizar cada tipo.

### 3. Cores e hierarquia de ações

- Há páginas usando tokens institucionais (`#0B2545`, `#1D5FD1), outras usam combinações locais como `#123B50`/`#2D8DB8`, e outras classes genéricas como `bg-blue-600`, `bg-slate-900`, `bg-slate-50`.
- O analisador estático não calcula cor final após cascata CSS, estados hover/disabled, nem contraste renderizado. Portanto, a divergência de classes está confirmada, mas a igualdade visual de cada botão precisa ser conferida em tela.

**Resultado:** definir tokens semânticos únicos para ação primária, secundária, destrutiva, contorno, navegação, sucesso e alerta. Não escolher cor por página isoladamente.

### 4. Tipografia e textos repetidos

- `NovoPedido.tsx` declara labels em `text-[9px]`, botões em `text-[10px]`.
- `Configuracoes.tsx` usa labels `text-[10px]` e botões `text-xs`.
- Páginas como `EngenhariaRevisoesBOM.tsx` usam título `text-2xl` e cabeçalho `text-sm`.
- O inventário não faz comparação semântica completa dos textos de botões e títulos; portanto, **duplicidade de rótulos/ações não está quantificada neste relatório**. Deve-se procurar ações repetidas no mesmo cabeçalho/formulário e títulos duplicados entre shell e conteúdo.

**Resultado:** uniformizar níveis de título, labels, texto de botão, mensagens de estado e nomes de ações; remover duplicações somente após conferir a função de cada ação.

## Prioridade de revisão por módulo

| Prioridade | Arquivos/telas | O que comparar |
|---|---|---|
| P0 | `src/pages/ComprasCentral.tsx`, `ComprasAbaNativa.tsx`, `ComprasRFQ.tsx`, `ComprasRequisicoes.tsx`, `ComprasPedidoCompra.tsx`, `ComprasRelatorios.tsx` | Usar a Central de Compras aprovada como referência; comparar botão primário, ações secundárias, cards principais, labels, tabela e títulos duplicados |
| P0 | `src/pages/Configuracoes.tsx` | Botões de 24 px e hierarquia de textos versus padrão operacional |
| P1 | `src/pages/NovoPedido.tsx`, `src/pages/VendasClientes.tsx`, `src/pages/VendasRelatorios.tsx` | Manter telas congeladas intactas; comparar seus componentes reutilizados e registrar exceções |
| P1 | `src/pages/PCPIndustrial.tsx`, `PCPOrdens.tsx`, `PCPParadas.tsx`, `PCPDashboardOEE.tsx` | Alturas, cores de ação, cards de KPI e títulos por aba |
| P1 | `src/pages/EstoqueAjustes.tsx`, `EstoqueCurvaABC.tsx`, `EstoqueSeparacao.tsx`, `EstoqueAlmoxarifadoCompact.tsx` | Tipo de card, padding, tabela, botões e variante ativa de rota |
| P1 | `src/pages/FinanceiroDashboardCaixa.tsx`, `FinanceiroTitulos.tsx`, `FinanceiroCustoPadrao.tsx`, `FinanceiroGraficoDesvios.tsx` | Referência financeira, hierarquia de cards e consistência de ações |
| P2 | Fiscal, Qualidade/SGQ, RH, Engenharia, Manutenção, Logística e Administração | Repetir comparação por tipo de tela e registrar exceções operacionais justificadas |

## Regra para telas aprovadas

1. Preservar o código visual das telas congeladas e os hashes do contrato.
2. Comparar as outras páginas com a tela aprovada do mesmo módulo; usar a Central de Compras como referência principal para anatomia compacta quando aplicável.
3. Se um padrão divergir, registrar arquivo, rota, elemento, classe atual, padrão de referência e correção proposta.
4. Não atualizar hashes de proteção para esconder regressões.
5. Só declarar conformidade visual após verificar a tela renderizada, incluindo desktop, largura reduzida, hover, disabled, mensagens e modais.

## Limitações e próximos passos

Esta etapa confirma inconsistências no código e identifica os alvos. Não afirma que cada uma das 278 rotas foi aberta visualmente em navegador autenticado. Também não altera telas. A próxima rodada deve mapear cada rota ao componente real e gerar uma matriz elemento-a-elemento (botão primário/secundário, card principal/KPI, labels/títulos, estados e duplicidades) antes de aplicar correções em lote.

