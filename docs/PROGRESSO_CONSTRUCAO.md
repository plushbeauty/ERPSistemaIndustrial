# Progresso de construção — SYSNQRA ERP INDUSTRIAL

Atualizado em 2026-11-10. Branch de integração: `feat/confronto-global-sysnqra`.
Base: `main` no commit `f5c8ac39d3e8cfc5c341f01ce57fd6e55f6b32f1`.

## Lote 1 — Controladoria

- [x] `src/features/controladoria/PainelLucratividade.tsx` — KPIs reais, margem somente com custo completo, consulta/paginação, CSV e impressão Plastibor.
- [x] `src/features/controladoria/PainelRazaoGeral.tsx` — KPIs, lançamentos tenant-scoped, saldo pela RPC oficial, paginação, CSV e impressão Plastibor.
- [x] `src/features/controladoria/CadastroDecimais.tsx` — CRUD de regra por RPC oficial, ativação/desativação tenant-scoped, seis padrões sob ação explícita, paginação, CSV e impressão.
- [x] `src/features/controladoria/AssistenteRetificacao.tsx` — correção do papel Master para o contrato canônico `SUPER_ADMIN`; preservado o comportamento auditável existente, sem simular reversão contábil.
- [x] `src/pages/FinanceiroCustoPadrao.tsx` — Voltar padronizado e impressão Plastibor adicionados; MRP, persistência e exportação preservados.
- [x] `src/pages/FinanceiroGraficoDesvios.tsx` — Voltar, impressão Plastibor e paginação adicionados; leitura tenant-scoped e dados persistidos preservados.
- [x] `scripts/telas-oficiais-manifest.json` — hashes sincronizados para os arquivos alterados.

### Pendências de validação do Lote 1

- [ ] Executar `npx tsc --noEmit`.
- [ ] Executar `npm run lint` ou o script oficial `lint:check`.
- [ ] Executar `npm run build`, `verify:release`, `verify:build` e `verify-routes`.
- [ ] Conferir GitHub Actions e Vercel Preview no SHA final.
- [ ] Validar visualmente as rotas e fluxos autenticados; não declarar validação visual sem preview funcional.
- [ ] Não mesclado na `main`; não publicado em produção.

## Lote 2 — Compras

- [ ] ComprasIndustrial, ComprasPedidoForm, RFQ, Análise de Preços, Requisições, Recebimento e Relatórios.

## Lote 3 — Financeiro e Comissões

- [ ] Fluxo de Caixa, Caixa, Contas a Receber, Contas a Pagar, Notas de Débito, Retificação, Importação de Extratos e Comissões (Regras, Cálculo, Perfil Vendedor e Auditoria).

## Lote 4 — RH / Departamento Pessoal

- [ ] RHIndustrial, Funcionários com foto, Turnos/Escalas, EPIs NR-6, Ponto, Treinamentos, Ausências, Acidentes, Documentos e rotas/menu RH.

## Lote 5 — Vendas, PCP, Estoque e Qualidade

- [ ] Pedidos, Orçamentos, Faturamento, BOM/MRP, Ordens de Produção, Montagem/Acabamento, Estoque e RPNC/Ishikawa.

## Regra de fechamento

Abrir um único PR de integração contra `main` somente após concluir os cinco lotes, revisar os diffs e registrar evidências dos gates. Não fazer merge nem deploy automaticamente.
