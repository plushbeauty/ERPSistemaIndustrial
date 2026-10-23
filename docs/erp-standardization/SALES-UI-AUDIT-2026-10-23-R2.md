# Auditoria integral de Vendas — SYSNQRA ERP Industrial

- Data: 2026-10-23
- Revisão: REV-VENDAS-UI-002
- Repositório oficial: `plushbeauty/ERPSistemaIndustrial`
- Base inspecionada: `main` — `8d5699c7355943b67fcfd828195ceaf40b55fda5`
- Branch desta execução: `feat/vendas-ui-standardization-full-20261023`
- Método: leitura de código versionado, roteador, componentes, scripts e auditorias existentes; análise estática.
- Limitação: inspeção visual autenticada, browser, execução local de scripts e teste de Supabase/RLS não foram executados nesta etapa. Não declarar as telas visualmente aprovadas apenas com base em classes Tailwind.

## Estado inicial do repositório e trabalho relacionado

1. A branch padrão do repositório é `main`; o repositório está acessível com permissão de escrita.
2. O SHA de `main` no início desta execução é `8d5699c7355943b67fcfd828195ceaf40b55fda5`.
3. O PR #212 (`style(vendas): padronizar controles compactos SYSNQRA`) está aberto em rascunho, não integrado, com head `83c8189c45bd3a90d6c14975f7f31bec167938d5` e base antiga `49cd473a3314ce5c998698820d6e875449b8fed1`. Seu escopo cobre somente PDV, Catálogo Digital e Orçamentos/Custos; não representa a conclusão de Vendas.
4. O comentário de integração do Vercel no PR #212 informa deployment cancelado: [BhEfeAmJ63UpCz9N1xtjLVShFL8Z](https://vercel.com/plushbeauty/erp-sistema-industrial/BhEfeAmJ63UpCz9N1xtjLVShFL8Z). Não é publicação de produção.
5. O status de Vercel observado para o SHA de `main` indica falha por limite de builds: [status do projeto](https://vercel.com/plushbeauty?upgradeToPro=build-rate-limit). Isso é um bloqueio de build/deploy e não prova falha de compilação do código.
6. O PR #210 (`feat(ui): adicionar componentes base SYSNQRA industrial`) permanece aberto e não integrado. Ele já propõe `src/components/ui/industrial-base.tsx`; esta execução não deve criar uma cópia concorrente nem assumir que esse componente já existe em `main`.

## Arquivos de referência e proteção

### Telas aprovadas — somente leitura nesta auditoria

- `src/pages/NovoPedido.tsx` — SHA de blob `6d1368026d51f186baa297f71569a61a1f79e944`, APROV-005.
- `src/pages/VendasCentral.tsx` — SHA de blob `3aa44f48901c8777344a7c7c72f9fd9b81e399a5`, APROV-006.
- `src/pages/ProdutosVendasIndustrial.tsx` — SHA de blob `95434d18498d1a0709c0ccfb1d7ba51949b71d1d`, APROV-011.
- `src/pages/PCPFichasProcesso.tsx` — referência aprovada de card/documento claro e ação/ícone violeta; preservar o hash congelado.
- `src/pages/PCPPedidosPendentes.tsx` — referência visual e funcional solicitada; permanece fora do escopo de edição nesta etapa.
- `src/components/layout/ERPHorizontalShell.tsx` — shell global protegido; não alterar.
- Contrato de proteção: `scripts/verify-approved-ui-lock.mjs`. Não atualizar hashes para ocultar regressões.

### Componentes existentes revisados

- `src/components/ui/CompactInput.tsx`, `CompactSelect.tsx`, `CompactButton.tsx`: já oferecem controles compactos de 30 px, com API controlada própria.
- `src/components/ui/ERPButton.tsx` e `ERPIconButton.tsx` + `erp-ui.css`: estilo atual usa 40 px e, em telas estreitas, 44 px; não corresponde por padrão ao novo contrato de 30 px.
- `src/components/ui/panel.tsx` e `kpi.tsx`: usam cards maiores, arredondamento amplo e ícones de 48 px; não são substitutos automáticos do card industrial compacto.
- `src/components/industrial/forms/industrialFormStyles.ts`: tokens legados `h-8`, labels de 11 px e espaçamentos maiores. A nova ordem especifica 30 px para controles comuns; exceções funcionais precisam ser justificadas.
- `src/pages/VendasLayout.tsx`: wrapper compartilhado por várias páginas de Vendas; não será alterado sem análise específica de impacto.
- `src/components/ui/industrial-base.tsx`: ausente em `main`; existe proposta não integrada no PR #210. Não duplicar.

## Inventário de rotas do módulo

Rotas comerciais próprias e aliases observados em `src/AppEntryV2.tsx`:

| Rota | Componente/arquivo | Tratamento |
|---|---|---|
| `/vendas`, `/vendas/dashboard` | `DashboardComercial.tsx` | Auditar e corrigir localmente |
| `/vendas/pdv` | `VendasPDV.tsx` | Auditar e corrigir localmente |
| `/vendas/tablet` | `VendasTablet.tsx` | Auditar UI própria e consistência |
| `/vendas/novo-pedido` | `NovoPedido.tsx` | Congelada; somente referência |
| `/vendas/orcamentos`, `/vendas/analise-custos` | `VendasAnaliseCustos.tsx` | Auditar e corrigir localmente |
| `/vendas/reajuste` | `TabelaPrecos.tsx` | Auditar e corrigir localmente |
| `/vendas/pedidos`, `/vendas/pendentes`, `/vendas/carteira` | Redirecionam para `/vendas/status` | Alias; verificar navegação |
| `/vendas/status` | `VendasCentral.tsx` | Congelada; somente referência |
| `/vendas/pedidos-pendentes` | `PCPPedidosPendentes.tsx` dentro de `QualityPlanGate` | Página PCP/pendências; referência somente, preservar gate |
| `/vendas/pedido/:id` | `VendasPedidoStatus.tsx` | Auditar e corrigir localmente |
| `/vendas/catalogo-digital` | `VendasCatalogoDigital.tsx` | Auditar e corrigir localmente |
| `/vendas/catalogo-digital/gestao` | `VendasCatalogoDigitalGestao.tsx` | Auditar e corrigir localmente |
| `/vendas/clientes`, `/cadastros/clientes` | `VendasClientes.tsx` | Auditar e corrigir localmente; alias preservado |
| `/vendas/dashboard-graficos` | `VendasDashboardGraficos.tsx` | Auditar e corrigir localmente |
| `/vendas/metas` | `VendasMetas.tsx` | Auditar e corrigir localmente |
| `/vendas/relatorios` | `VendasRelatorios.tsx` | Auditar e corrigir localmente |
| `/vendas/produtos` | `ProdutosVendasIndustrial.tsx` | Congelada; somente referência |
| `/vendas/configuracoes` | `ConfiguracoesADMPage` | Alias de outro fluxo; fora da correção visual de Vendas |
| `/vendas/estoque`, `expedicao`, `fiscal`, `rh`, `engenharia`, `materiais`, `mrp`, `pcp`, `chao-de-fabrica`, `qualidade`, `sgq`, `conciliacao`, `importador`, `ano-fiscal`, `fluxo-caixa`, `balanco`, `auditoria`, `classificacao-fiscal`, `razao-geral` | Componentes de outros domínios | Rotas de conveniência; não reestilizar nem alterar lógica de outros módulos |

Arquivos de compatibilidade:
- `src/pages/VendasPedidosMestre.tsx` reexporta `NovoPedido`.
- `src/pages/PedidosVendas.tsx` reexporta `ProdutosVendasIndustrial`.
- `src/pages/VendasStatusPedidos.tsx` existe, mas não foi identificado como componente das rotas comerciais principais na lista acima; verificar referências antes de remover ou alterar.

## Achados estáticos por tela

| Arquivo | Evidência estática | Achado/risco |
|---|---|---|
| `DashboardComercial.tsx` | 359 linhas; 10 ocorrências de Supabase, 1 RPC, 6 consultas `.from()`; alturas `h-11`, `h-20`, cards/gráficos `h-[235px]` e `h-[76px]` | Mistura de dimensões; diferenciar controles comuns de cards/gráficos intencionais |
| `VendasPDV.tsx` | 320 linhas; 8 referências Supabase, 2 RPCs, 4 consultas; campos em 30 px junto a classes de 28/32/36/40 px e cartões de produto de 90–260 px | Padronizar controles comuns; manter cartões de produto, área do carrinho e alvos de toque como exceções justificadas |
| `VendasTablet.tsx` | 87 linhas; CSS próprio embutido, controles de pesquisa de 32 px, cartões e cabeçalho próprios | Verificar responsividade e consistência sem duplicar o shell global |
| `VendasAnaliseCustos.tsx` | 85 linhas; 5 chamadas RPC e consultas reais; alturas `h-9` e `h-7` | Controles e linha de tabela não seguem todos o padrão 30/32 px |
| `VendasCatalogoDigital.tsx` | 593 linhas; 7 referências Supabase, 1 RPC; alturas de 24, 28, 32, 36, 44, 48 px e cartões/imagens | Variação grande; separar controles operacionais de imagens/cards de produto |
| `VendasCatalogoDigitalGestao.tsx` | 131 linhas; 6 referências Supabase, 1 RPC; alturas de 30 e 54 px | Avaliar campo comum e controle de seleção especial |
| `VendasClientes.tsx` | 610 linhas; 49 controles detectados, 20 referências Supabase, 1 RPC; alturas 28/30 px; dois elementos `header` | Conferir formulários/CRUD, alinhamento e cabeçalho interno; preservar busca por código e escopo por empresa |
| `VendasPedidoStatus.tsx` | 215 linhas; 8 referências Supabase, 1 RPC; banner de 50 px | Verificar se altura é card informativo ou controle; não reduzir indiscriminadamente |
| `TabelaPrecos.tsx` | 217 linhas; consulta por `erp_current_empresa_id`, filtro por `empresa_id`, RPCs de reajuste de vendas e custos | Inputs/selects de 40 px divergentes do contrato; reajuste altera dados reais e exige preservar confirmação/permissões |
| `VendasDashboardGraficos.tsx` | 147 linhas; consulta Supabase e gráfico de 420 px | Altura do gráfico é funcional; padronizar apenas filtros e ações |
| `VendasMetas.tsx` | 82 linhas; consulta/RPC e handlers de salvar/adicionar | Controles sem classes de altura explícitas; revisar alturas herdadas e estados de envio |
| `VendasRelatorios.tsx` | 144 linhas; consultas Supabase, RPC e impressão | Botões/selects compactos misturados; validar impressão e filtros |
| `VendasCentral.tsx` | 312 linhas; dados reais, filtros, RPC e contexto de empresa | Congelada; não modificar |
| `NovoPedido.tsx` | 171 linhas; 42 controles, 21 referências Supabase, 6 RPCs; classes de 30/32/36/40 px e painéis de altura fixa | Congelada; usar como referência aprovada e registrar exceções, sem editar |
| `ProdutosVendasIndustrial.tsx` | 644 linhas; 35 controles, 30 referências Supabase, 2 RPCs, vários filtros por empresa | Congelada; usar como referência, sem editar |
| `PCPPedidosPendentes.tsx` | 1.543 linhas; 21 controles, 16 referências Supabase, 4 RPCs; estilos compactos 28/30/32 px | Página de PCP referencial; fora do escopo de edição |
| `VendasStatusPedidos.tsx` | 55 linhas; 6 controles, 2 RPCs e fundos antigos `#DEE2E6`/`#212529` | Confirmar consumidores antes de decidir se é tela ativa ou legado; não remover sem evidência |
| `PedidosVendas.tsx`, `VendasPedidosMestre.tsx` | Reexports simples de telas congeladas | Não criar cópias nem duplicar componentes |

Os números acima são contagens estáticas de texto e não substituem o teste no navegador. Não comprovam que toda consulta é segura ou que a aparência renderizada está correta.

## Contrato visual a aplicar em páginas editáveis

- Controles comuns: `h-[30px] text-xs`; borda `border border-slate-300 rounded-[2px]`.
- Labels: `text-[9px] font-semibold text-slate-500 uppercase tracking-wider`.
- Cabeçalho de tabela: `bg-slate-100`; linhas próximas de 32 px.
- Formulários: grid responsivo de 12 colunas, filhos com `min-w-0`; larguras de código/quantidade curtas e descrição flexível.
- Paleta: fundo `#F4FBFD`, azul petróleo `#123B50`, ação `#2D8DB8`, hover `#237497`, ciano `#48B7C7`, sucesso `#3A9D78`, alerta `#E6A34A`, erro `#D65B61`.
- Card de referência: superfície branca, borda fina, sombra leve e raio de 2 px, conforme a Ficha de Processo. O fundo violeta de ícone é um padrão de ênfase de setor, não deve ser aplicado a todo ícone indiscriminadamente.
- Não padronizar à força imagens, cards de produto, gráficos, alvos de toque, banners informativos ou controles especiais de tablet para 30 px.
- Evitar alterações no shell global, estilos globais, tabelas de banco, permissões e componentes consumidos por outros módulos.

## Preservação da lógica

As telas editáveis usam consultas e mutações reais no Supabase. O código inspecionado contém chamadas `.from()`, `.rpc()`, filtros `empresa_id`, paginação, estados, efeitos e handlers. Qualquer correção visual deve ser limitada às classes/estrutura de apresentação e atributos de acessibilidade, sem alterar essas chamadas, seus parâmetros, estados, cálculos ou condições.

## Matriz de validação

| Verificação | Estado na auditoria inicial |
|---|---|
| Branch, SHA de base e permissão do repositório | CONCLUÍDO |
| Inventário estático de rotas comerciais e aliases | CONCLUÍDO |
| Leitura dos componentes visuais existentes e PR #210 | CONCLUÍDO |
| Revisão dos arquivos de auditoria/backlog existentes | CONCLUÍDO |
| Identificação das telas congeladas | CONCLUÍDO |
| Execução real de `npm run audit:ui-standardization` | PENDENTE — sem checkout/execução de terminal nesta etapa |
| `verify:approved-ui-lock`, type-check, lint, auditorias e build nesta branch | PENDENTE |
| Inspeção visual autenticada em preview | NÃO VERIFICADO |
| Testes de interação reais no Supabase/RLS | NÃO VERIFICADO |
| Deploy desta execução | PENDENTE |

## Próximos passos

1. Corrigir em etapas as páginas editáveis e pequenas, sem tocar nas congeladas.
2. Reavaliar o PR #212 contra o `main` atual; não tratá-lo como deploy concluído.
3. Usar o componente base do PR #210 somente depois de confirmar sua integração ou incorporar a implementação existente de forma controlada, sem duplicação.
4. Atualizar `docs/erp-standardization/BACKLOG.md` e `COMPLETED.md` apenas após evidências de testes, diff e deploy aplicáveis.
5. Após Vendas, iniciar Compras com o mesmo padrão, sem afetar o shell global ou telas aprovadas.
