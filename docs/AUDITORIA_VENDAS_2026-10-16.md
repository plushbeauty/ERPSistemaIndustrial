# Auditoria das abas de Vendas — 2026-10-16

## Identificação
- Data da revisão: 2026-10-16
- Revisão de trabalho: VENDAS-001 a VENDAS-013, além da APROV-005 em Novo Pedido
- Branch: `fix/novo-pedido-field-audit-standard-2026-10-16`
- PR: https://github.com/plushbeauty/ERPSistemaIndustrial/pull/143
- Objetivo: primeira passada de geometria/legibilidade das abas comerciais sem reescrever regras de negócio, RPCs ou schema.

## Registro por arquivo

| Revisão | Arquivo/tela | Escopo revisado e alteração |
|---|---|---|
| APROV-005 | `src/pages/NovoPedido.tsx` | Campos de 30px, rótulos de 9px, cantos de 2px, cards alinhados e grade compacta; regras comerciais preservadas. |
| VENDAS-001 | `src/pages/VendasAnaliseCustos.tsx` | Campos de cálculo e seleção de posto/tempo em 30px, bordas de 2px e ações compactas; consultas e RPCs preservados. |
| VENDAS-002 | `src/pages/TabelaPrecos.tsx` | Filtros, aplicação do reajuste e paginação em 30px; cálculos e persistência preservados. |
| VENDAS-003 | `src/pages/VendasRelatorios.tsx` | Área de trabalho, cabeçalho e células compactados; filtros, consulta e impressão preservados. |
| VENDAS-004 | `src/pages/VendasCatalogoDigitalGestao.tsx` | Painel, pesquisa e grade compactados; origem `erp_produtos` e salvamento preservados. |
| VENDAS-005 | `src/pages/VendasMetas.tsx` | Campos e rótulos compactos, layout responsivo; consulta, cálculo e upsert preservados. |
| VENDAS-006 | `src/pages/VendasClientes.tsx` | Campos de cadastro e pesquisa ajustados a 30px; máscaras, CEP, tabela de preços, transportadoras e vínculos preservados. |
| VENDAS-007 | `src/pages/VendasCatalogoDigital.tsx` | Campo de pesquisa ajustado a 30px; dados e fluxo do catálogo preservados. |
| VENDAS-008 | `src/pages/DashboardComercial.tsx` | Cartões KPI, ícones e tipografia compactados; consultas e gráficos preservados. |
| VENDAS-009 | `src/pages/VendasPDV.tsx` | Seletores/desconto em 30px e finalização azul; botões de toque mantidos maiores por usabilidade operacional. |
| VENDAS-010 | `src/pages/VendasTablet.tsx` | Barra do menu, pesquisa e tamanho dos ícones compactados; navegação baseada nas rotas existentes preservada. |
| VENDAS-011 | `src/pages/VendasDashboardGraficos.tsx` | Filtros de período em 30px; consultas e limites de datas preservados. |
| VENDAS-012 | `src/pages/VendasPedidoStatus.tsx` | Detalhe do pedido: cartões e grade compactados; dados e encaminhamento de retificação preservados. |
| VENDAS-013 | `src/features/comissoes/PerfilVendedor.tsx` | Campos e botão padronizados em 30px, layout responsivo. Identificada pendência para confirmar escopo multiempresa das consultas com schema/RLS antes de modificar filtros. |

## Proteções mantidas
- A tela central `src/pages/VendasCentral.tsx` (Status do Pedido aprovado/congelado) não foi alterada.
- O shell compartilhado `src/pages/VendasLayout.tsx` não foi alterado nesta rodada para evitar regressões nas outras rotas que o reutilizam.
- Arquivos protegidos de Produtos e Login não foram alterados.
- Não foram introduzidos mocks, tabelas/colunas/RPCs inventados ou bypasses de validação.

## Validação — ainda não homologada
- As alterações foram feitas via commits GitHub na branch do PR.
- GitHub Actions `ERP Industrial CI`, run #6156, concluiu **success** no commit de código `f982be2883805781e2b8e770d2760a2dd5cb2e2f`: TypeScript, ESLint, auditoria global, auditoria brutal, interações, lazy imports, build, rotas, contratos de regressão e lock aprovados.
- A auditoria global inicialmente marcou `currentPassword` como possível segredo por falso positivo de regex. Foi corrigida em `scripts/auditoria-global.mjs` (revisão `SEC-AUDIT-001`) com limite de palavra; a auditoria global passou no run #6156.
- O check Vercel continua falhando por limite externo de implantação (`build-rate-limit` / limite de deploys), o que impede confirmar preview/produção.
- Ainda falta inspeção visual autenticada em cada rota. Esta é uma primeira passada geométrica, não uma declaração de homologação funcional total.
