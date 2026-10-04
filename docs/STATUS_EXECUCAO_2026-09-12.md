# Status de execução — ERP Industrial — 2026-09-12

## Base técnica verificada

- Repositório: `plushbeauty/ERPSistemaIndustrial`, branch `main`.
- Produção Vercel: deployment `READY` confirmado no projeto `erp-sistema-industrial`.
- Produção HTTP: `/` respondeu `200 OK` e carregou o bundle Vite atual.
- Supabase: projeto ERP conectado ao backend e Edge Functions ativas.

## Etapas executadas nesta rodada

### 3 — RLS / multiempresa
- Políticas das tabelas `erp_*` foram endurecidas para usuários autenticados.
- Auditoria atual não encontrou política `anon`/`public` nas tabelas `erp_*` consultadas.

### 4 — Integridade de banco
- As FKs tenant-aware anteriormente inválidas foram validadas.
- Auditoria atual: `tenant_fk_not_valid = 0`.

### 5 — Segurança de funções
- Execução anônima de `erp_auth_profile()` foi removida.
- `erp_resolver_login` não possui execução para `anon`/`authenticated`.
- Funções SECURITY DEFINER usam `search_path` explícito (`pg_catalog, public` ou `public, pg_catalog`).

### 8 — Estoque
- Verificadas relações produto → movimentação, estoque por loja e lotes: nenhuma inconsistência de `empresa_id` encontrada.
- Verificados valores inválidos de quantidade/saldo/custo: nenhum registro incompatível encontrado.
- Adicionadas FKs compostas tenant-aware para estoque/lotes.
- Movimento de estoque exige quantidade positiva.

### 9 — Compras
- Verificadas relações compra → fornecedor e item → produto/compra: nenhuma inconsistência de `empresa_id` encontrada.
- Adicionadas FKs compostas tenant-aware.
- Item de compra exige quantidade positiva e valor unitário não negativo.

### 10 — Qualidade
- Verificadas relações FMEA → processo e não conformidade → produto/responsável: nenhuma inconsistência tenant encontrada.
- Adicionadas FKs compostas tenant-aware.

### 11 — Calibração / manutenção
- Verificadas relações calibração → equipamento e manutenção → máquina: nenhuma inconsistência tenant encontrada.
- Adicionadas FKs compostas tenant-aware.

### 12 — Documentos / Fiscal
- Verificadas relações itens de documento fiscal → documento/produto: nenhuma inconsistência tenant encontrada.
- Adicionadas FKs compostas tenant-aware.

## Etapas estruturais já presentes e auditadas

- RH / funcionários / treinamentos / matriz de competências.
- PCP / ordens de produção / processos / apontamentos.
- Qualidade / FMEA / RPNC / não conformidades.
- Financeiro e previsão de caixa.
- Fiscal.
- Rotas / logística.
- Auditoria e histórico.
- Sistema de permissões.
- Workflow GitHub Actions com TypeScript, auditoria de interações e build.

## Referências externas aplicadas como padrão

- Supabase Auth continua sendo a autoridade de identidade; login por senha usa o fluxo oficial e recuperação de senha deve usar o fluxo nativo do Auth.
- Isolamento multiempresa permanece no PostgreSQL/RLS, não apenas no frontend.
- GoTrue/Auth foi usado como referência arquitetural para JWT/sessão, sem substituir o Supabase Auth gerenciado.
- Keycloak foi usado somente como referência de RBAC/isolamento conceitual; não foi introduzido outro provedor de identidade.
- PocketBase não foi introduzido: o projeto já possui PostgreSQL/Supabase e não há motivo para duplicar o backend.

## Pendências que não devem ser marcadas como concluídas sem prova

- Build/TypeScript de cada commit novo precisa continuar sendo confirmado pelo CI.
- Vercel pode estar `READY` no commit atual, mas cada novo commit precisa de nova confirmação.
- O Supabase Security Advisor ainda apresenta avisos em funções/tabelas legadas e não deve ser tratado como zero-warning.
- Proteção contra senhas vazadas precisa ser habilitada nas configurações de Auth do projeto.
- Testes E2E reais de login, cadastro, CRUD e isolamento entre duas empresas precisam ser executados antes do selo de produção definitiva.
