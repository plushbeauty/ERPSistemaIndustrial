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


## Implementação incremental — REV-VENDAS-UI-003 a UI-013

Arquivos efetivamente alterados nesta branch:
- `src/pages/VendasAnaliseCustos.tsx`: campos e ação de anexo em 30 px, cards/bordas compactos, cabeçalho da tabela slate-100, linhas de 32 px e rótulo acessível para remover operação.
- `src/pages/DashboardComercial.tsx`: botão de impressão dos gráficos em 30 px e cabeçalho dos cards com borda/cor compactas; KPIs e alturas dos gráficos mantidos.
- `src/pages/VendasDashboardGraficos.tsx`: filtros de visão/período e impressão em 30 px; resumo compactado e altura do gráfico preservada.
- `src/pages/VendasPedidoStatus.tsx`: cards de resumo e condições, bloco de status e tabela de itens compactados; ações, consultas e valores preservados.
- `src/pages/VendasMetas.tsx`: tabela localmente escopada para cabeçalho/linhas de 32 px; ações em 30 px.
- `src/pages/VendasPDV.tsx`: selects, controles de quantidade, seleção de pagamento, limpeza de busca e finalização alinhados a 30 px; cartões de produto/carrinho mantidos como exceções de layout.
- `src/pages/VendasCatalogoDigital.tsx`: busca e botões de ação compactados; controles de grade, seleção, detalhe e compartilhamento alinhados; imagens e cards de produto mantidos como conteúdo, não controles.
- `src/pages/TabelaPrecos.tsx`: filtros e ação de reajuste em 30 px; labels compactas; cabeçalho slate-100 e linhas de tabela em 32 px; paginação compacta.
- `src/pages/VendasRelatorios.tsx`: filtros, impressão e tabela compactados; ação de impressão separada do resumo para alinhamento; impressão e filtros preservados.
- `src/pages/VendasMetas.tsx`: campos responsivos de 30 px, labels compactas e grid responsivo de 12 colunas; cálculo, competência e gravação preservados.
- `src/pages/VendasClientes.tsx`: linhas das tabelas e campo de pesquisa alinhados ao padrão compacto; CRUD, abas, lookups e vínculos preservados.
- `src/pages/VendasCatalogoDigitalGestao.tsx`: pesquisa flexível com largura máxima para evitar overflow; seleção e gravação preservadas.

A revisão das mudanças é estática. Os identificadores de RPC, chamadas `.from()`, filtros por `empresa_id`, cálculos, estados e handlers relevantes permanecem presentes nos arquivos; isso não substitui testes executados. Não foi possível fazer checkout local: a tentativa de `git clone` falhou por DNS/rede indisponível. Portanto, ainda não há resultado local de type-check/lint/build nem teste visual autenticado.

**Status da tranche:** código versionado na branch; aguardando PR/CI, revisão final do diff, validação de telas e deployment. Não declarar o módulo Vendas concluído.

## Cobertura restante e candidatos legados

- `VendasDashboardGraficos.tsx`: filtros usam o conjunto de classes `sales-button` e a folha compartilhada de workspaces; a área de gráfico de 420 px é conteúdo visual, não controle. Não foi necessário alterar a altura do gráfico.
- `VendasTablet.tsx`: usa CSS específico de tablet e busca de 32 px. Mantido como exceção de interação/touch; requer conferência visual autenticada em tablet antes de declarar concluído.
- `VendasPedidoStatus.tsx`: rota de detalhe; o banner de 50 px é conteúdo de status, não campo de formulário. Ações usam classes comerciais compartilhadas; manter sem redução indiscriminada.
- `VendasStatusPedidos.tsx`, `VendasCarteira.tsx` e `VendasConfiguracoes.tsx`: arquivos existentes, mas sem rota ativa direta correspondente identificada no roteador atual (status/carteira redirecionam para `VendasCentral`; configurações aponta para `ConfiguracoesADMPage`). Não remover nem reativar esses arquivos sem autorização e confirmação de referências históricas.
- `VendasPedidosMestre.tsx` e `PedidosVendas.tsx` são reexports das páginas congeladas; não são telas independentes.

## Resultado CI e Vercel — head `399dab7a73f6ff733ddb76e800c062a7a1e69545`

Workflow [ERP Industrial CI #40039194459](https://github.com/plushbeauty/ERPSistemaIndustrial/actions/runs/40039194459):
- **PASSOU:** instalação determinística, lockfile, configuração Vercel, política de CI, contrato Auth Master, nomenclatura pública, ambiente Supabase, guard Supabase, integridade de deploy, TypeScript, ESLint, auditoria global, auditoria brutal, auditoria de interações, lazy imports, build de produção, verificação de artefatos e rotas.
- **FALHOU:** contrato de regressão do Tablet de Qualidade: exige a rota direta `/qualidade/tablet` declarada e protegida por `QualityPlanGate`. O mesmo bloqueio já existia no PR #212 e está fora do escopo autorizado de Vendas; não foi alterado aqui.
- **PENDENTE/IGNORADO pelo fail-fast:** verificações posteriores de shell global, assets de logo, hash lock de UI aprovada, contrato visual de login/produtos e política de segurança. Os arquivos congelados não aparecem no diff, mas o script do lock não foi executado nesta execução.
- **PENDENTE:** `npm run audit:ui-standardization`. O workflow que executa este script está configurado para push em `main` ou execução manual; o checkout local não foi possível por indisponibilidade de DNS/rede. Não declarar o relatório JSON gerado pelo script como executado.

Vercel:
- Status reportado no commit mais recente: falha por limite de builds (`build-rate-limit`).
- Consulta de deployments por SHA `399dab7a73f6ff733ddb76e800c062a7a1e69545`: **nenhum deployment correspondente encontrado**.
- Há um preview antigo `erp-sistema-industrial-hrm1fbpt7-plushbeauty.vercel.app` em estado READY, mas corresponde ao SHA `2d227a3ed29f1a1b413f74d8f9c8f3978cb2b829`, anterior às correções posteriores; não serve como prova de preview do head atual.
- Portanto, nenhuma alteração desta branch foi validada visualmente no preview atual e nada foi publicado em produção.

## Status final desta rodada

- Código da primeira tranche: versionado na branch e PR #215; compilação e auditorias anteriores ao contrato de Qualidade passaram.
- CI geral: **FALHOU** por um contrato preexistente de Qualidade fora do escopo.
- Auditoria visual estática gerada pelo script: **PENDENTE**.
- Inspeção visual autenticada e teste real Supabase/RLS: **NÃO VERIFICADO**.
- Preview para o SHA atual: **NÃO DISPONÍVEL** por bloqueio de Vercel.
- Produção: **NÃO PUBLICADO**.
- Módulo Vendas completo: **PENDENTE** até fechar os testes visuais e revisar as exceções/rotas não ativas.


## Atualização após segunda tranche — 2026-10-23

Também foram corrigidos `VendasDashboardGraficos.tsx` e `VendasPedidoStatus.tsx`, além da compactação da tabela de `VendasMetas.tsx`. Esses ajustes ficaram limitados às classes/estrutura de apresentação e a um estilo local escopado, sem alterar consultas, cálculo de faturamento, itens do pedido, ações de edição ou gravação de metas.

Validação da versão de código `5df0967290f2123843d23c9147ce4711200636b9`, workflow push [#40039687284](https://github.com/plushbeauty/ERPSistemaIndustrial/actions/runs/40039687284):
- **PASSOU:** TypeScript, ESLint, auditoria global, auditoria brutal, auditoria de interações, lazy imports, build de produção, artefatos e rotas.
- **FALHOU:** somente `verify:quality-tablet-contract`, pela rota protegida `/qualidade/tablet` ausente; fora do escopo de Vendas.
- **Vercel:** sem deployment para este SHA; o status do check segue bloqueado por `build-rate-limit`.
