# Arquitetura ERP Industrial

## Objetivo
Construir uma plataforma industrial modular, multiempresa e auditável, integrando ERP, MRP, MES, QMS e CMMS.

## Módulos funcionais
1. Dashboard executivo e operacional
2. Cadastro mestre: empresas, usuários, clientes, fornecedores, produtos, materiais, unidades e centros de custo
3. Engenharia: produtos, versões, BOM multinível, roteiros, operações, recursos e engenharia de mudança
4. Planejamento: demanda, MPS, MRP, capacidade finita, necessidades e sugestões de compras/produção
5. Produção: ordens de produção, apontamentos, consumo, WIP, refugo, retrabalho, paradas e chão de fábrica
6. Estoque/WMS: almoxarifados, endereços, lotes, séries, transferências, inventário, reservas e rastreabilidade
7. Compras: requisições, cotações, fornecedores, pedidos, recebimento e inspeção de entrada
8. Vendas/CRM: clientes, oportunidades, propostas, pedidos, expedição e faturamento
9. Qualidade/QMS: planos de inspeção, IQC/PQC/OQC, NCR, quarentena, CAPA/8D, FMEA, APQP, PPAP, plano de controle, SPC e MSA
10. Manutenção/CMMS: ativos, planos preventivos, corretivas, ordens, peças, MTBF/MTTR
11. Custos/Financeiro: custos padrão/real, variações, contas a pagar/receber, caixa, orçamento e centros de custo
12. Indicadores: OEE, produtividade, sucata, eficiência, OTIF, estoque, custos e qualidade
13. Documentos e auditoria: versões, aprovações, trilha de alterações e evidências
14. Integrações: API, webhooks, dispositivos de chão de fábrica e futuramente MQTT/OPC-UA

## Segurança
- Supabase Auth para identidade.
- RLS obrigatório em tabelas expostas.
- Isolamento por empresa/tenant.
- Perfis e permissões por módulo e operação.
- Funções privilegiadas fora do schema exposto.
- Nenhum service-role key no frontend.
- Auditoria de operações críticas.

## Regras de engenharia
- TypeScript strict.
- Componentes reutilizáveis.
- Formulários com validação e estados de carregamento/erro/sucesso.
- Todas as gravações devem retornar erro tratável e confirmação de persistência.
- Listagens devem ter busca, filtros, paginação e estados vazios.
- Exclusões críticas devem exigir confirmação e preferir inativação quando houver histórico.
- Toda entidade industrial deve considerar empresa, status, created_at, updated_at e auditoria quando aplicável.
