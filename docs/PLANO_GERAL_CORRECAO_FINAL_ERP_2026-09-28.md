# ERP Industrial — Plano Geral de Correção e Finalização

> **Para execução agentic:** executar por fases, com validação objetiva ao fim de cada fase. Não tocar no repositório Plush Beauty.

**Objetivo:** levar `plushbeauty/ERPSistemaIndustrial` do estado atual para um ERP industrial coerente, funcional, seguro, responsivo e verificável em produção, corrigindo código, rotas, UX/UI, Supabase/RLS, CI e Vercel sem apagar funcionalidades existentes.

**Arquitetura:** preservar Vite + React + TypeScript + React Router + Supabase. Primeiro estabilizar infraestrutura, autenticação e dados; depois consolidar shell/navegação por setor; em seguida corrigir módulos e CRUDs; por fim fazer QA visual/interativo e produção. Não migrar para Next.js.

**Stack:** React 18, TypeScript, Vite, Tailwind CSS, Supabase, React Router, Lucide, Recharts, Radix.

## Restrições globais

- Repositório exclusivo: `plushbeauty/ERPSistemaIndustrial`.
- Não alterar Plush Beauty.
- Supabase canônico do ERP: `zsklkydlawgvwgnvxwwx`.
- URL canônica: `https://zsklkydlawgvwgnvxwwx.supabase.co`.
- Frontend usa somente `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Nunca expor `service_role` ou `sb_secret_` no frontend.
- Preservar Auth, RLS, CRUDs, rotas e regras já corretas.
- Não inventar dados, botões ou módulos.
- Dados de dashboard devem ser reais; quando não houver dados, mostrar estado vazio.
- Não declarar READY/GREEN sem build, testes, navegador e produção comprovados.
- Correções de banco são cirúrgicas: alterar somente a causa comprovada do problema em tratamento.
- Commits agrupados por fase/coerentes; não fazer uma sequência de microcommits cosméticos.

## Fases

### Fase 0 — Baseline e inventário
- Registrar HEAD, árvore, scripts, rotas, páginas, componentes, migrations e workflows.
- Rodar/inspecionar `verify:supabase-env`, type-check, lint check, build, auditorias e status dos workflows.
- Mapear cada rota para componente real.
- Mapear cada item de sidebar para conteúdo real.
- Classificar problemas: bloqueador, segurança, dados, funcionalidade, UX/UI, performance, documentação/histórico.
- Não corrigir ainda problemas não comprovados.

**Saída:** matriz única de defeitos com arquivo/rota/tabela/causa/teste esperado.

### Fase 1 — Build, CI e ambiente
- Corrigir primeiro tudo que impede build/type-check/lint.
- Garantir lockfile/dependências coerentes.
- Validar scripts de produção.
- Garantir gate Supabase canônico.
- Auditar workflows duplicados/conflitantes e manter um caminho de produção verificável.
- Verificar configuração Vercel e variáveis necessárias; não mascarar ausência de variável.

**Saída:** build local/CI comprovadamente verde antes de avançar.

### Fase 2 — Auth, sessão, Master e isolamento
- Validar login Supabase real.
- Validar persistência de sessão, refresh, logout e redirecionamento.
- Validar perfil `erp_usuarios`, empresa ativa e Master.
- Validar que usuário sem perfil/empresa não acessa o ERP.
- Validar Master com `is_master=true`, nível 100+, perfil MASTER e `empresa_id=null`.
- Auditar RLS de todas as tabelas expostas.
- Corrigir SECURITY DEFINER somente quando a análise provar necessidade; preferir SECURITY INVOKER.
- Corrigir políticas initplan/múltiplas permissivas uma a uma, preservando autorização.
- Auditar funções executáveis por anon/authenticated.
- Rodar Advisors após cada grupo coerente.

**Saída:** isolamento multiempresa demonstrável com testes positivos e negativos.

### Fase 3 — Shell e navegação industrial
- Consolidar o shell principal.
- Cada setor deve abrir sua própria barra lateral.
- Sidebar contém somente itens relacionados ao setor.
- Clique no item troca o conteúdo central sem misturar setores.
- Topbar mostra módulo, data/hora e usuário.
- Preservar o padrão visual industrial `#F4FBFD / #123B50 / #2D8DB8 / #48B7C7`.
- Corrigir alinhamento, tipografia, estados ativos/hover/foco e responsividade.
- Remover duplicidades e caminhos mortos.

**Saída:** navegação previsível, sem telas vazias, sobrepostas ou menus espalhados.

### Fase 4 — Dashboard e command center
- Corrigir duplicação atual de cards de atenção no `IndustrialCommandDashboard`.
- Garantir cards alinhados, texto branco, títulos e números visíveis, hover consistente.
- Manter métricas exclusivamente reais.
- Corrigir qualquer letra/código literal renderizado.
- Validar OEE, produção, atraso, qualidade, paradas e calibração contra dados reais.
- Estados vazios explícitos quando não houver dados.

**Saída:** dashboard funcional e visualmente consistente, sem números fictícios.

### Fase 5 — PCP e chão de fábrica
- Revisar programação finita, OPs, apontamentos, máquinas, setup, paradas, refugo/retrabalho, OEE e rastreabilidade.
- Validar fluxo: pedido → planejamento → OP → execução → apontamento → estoque/qualidade.
- Garantir sidebar completa de PCP conforme a organização solicitada.
- Validar transações atômicas e idempotência.
- Testar quantidades planejadas, boas, refugadas e saldos.

**Saída:** fluxo produtivo completo e verificável.

### Fase 6 — Engenharia
- Consolidar workspace com: PROJETOS, PEDIDOS, ENTRADAS, FICHAS DE PROCESSO, CÓDIGOS DE PRODUTOS, CONFIGURAÇÕES.
- Validar fichas técnicas, operações, versões, moldes/ferramentas e códigos.
- Garantir que CRUDs persistam no tenant correto.
- Testar vínculos com produto/OP/PCP.

### Fase 7 — Estoque, Almoxarifado, Compras e Expedição
- Revisar entradas, saídas, reservas, lotes, certificados, almoxarifado, pedidos de compra e expedição.
- Validar FKs, índices e idempotência.
- Corrigir saldos e vínculos somente com evidência.
- Testar documentos fiscais e rastreabilidade.

### Fase 8 — Qualidade/SGQ
- Revisar RPNC, auditorias, documentos, treinamentos, calibração, FMEA, plano de controle, inspeções, MSA/SPC quando presentes, genealogia/quarentena e CAPA/8D quando presentes.
- Validar estados, evidências, anexos e histórico.
- Garantir que alertas do dashboard derivem de registros reais.

### Fase 9 — Manutenção e ativos
- Revisar máquinas, manutenção preventiva/corretiva, ordens, histórico, calibração e vencimentos.
- Validar integração com PCP e dashboard.
- Garantir que equipamentos vencidos sejam calculados por data real.

### Fase 10 — Fiscal, Vendas, Financeiro e RH
- Revisar CRUDs e fluxos existentes sem inventar funções.
- Fiscal: documentos, regras, totais e permissões.
- Vendas: configurações, metas, pedidos, reservas e produção.
- Financeiro: contas e lançamentos.
- RH: funcionários, treinamentos e permissões.
- Validar tenant/RLS em todos.

### Fase 11 — Auditoria visual e interação
- Testar desktop, tablet e mobile.
- Clicar em todas as ações visíveis.
- Detectar botões sem ação, rotas 404, modais que não fecham, selects sem opções, tabelas quebradas e estados de erro.
- Conferir contraste, foco por teclado, labels e mensagens.
- Conferir que não exista texto de código, placeholder técnico ou dado fictício na interface.
- Comparar cada tela com a especificação/referência disponível; referência fornecida pelo usuário prevalece sobre inspiração externa.

### Fase 12 — Segurança, performance e limpeza final
- Resolver findings restantes do Supabase Advisors por causa, não por volume.
- Indexar FKs comprovadamente necessárias.
- Revisar múltiplas policies permissivas.
- Revisar funções privilegiadas.
- Remover código morto apenas quando comprovadamente não usado.
- Não remover migrations históricas válidas.
- Separar documentação histórica de configuração executável.

### Fase 13 — Homologação e produção
- Rodar: `verify:supabase-env`, type-check, lint check, auditorias, build.
- Rodar testes de navegador no ambiente de produção.
- Verificar console e network.
- Verificar login real e sessão.
- Verificar CRUD crítico em cada setor.
- Verificar RLS com usuários de empresas diferentes.
- Verificar Vercel deployment atual, não deployment antigo.
- Só então marcar GREEN/READY.

## Critério final de conclusão

O ERP somente será considerado concluído quando:
1. build e type-check passam;
2. lint passa sem erro bloqueador;
3. auditorias passam ou cada finding residual estiver documentado e deliberadamente aceito;
4. Supabase canônico é confirmado;
5. login e sessão funcionam;
6. Master/tenant/RLS são comprovados;
7. todas as rotas principais abrem;
8. cada item de sidebar possui conteúdo real;
9. CRUDs críticos persistem e respeitam tenant;
10. dashboard usa dados reais;
11. desktop/tablet/mobile foram verificados;
12. produção atual foi testada;
13. nenhum resultado antigo de Vercel/Supabase é usado como prova do estado atual.

## Ordem de execução

`Baseline → Build/CI → Auth/RLS → Shell/Sidebar → Dashboard → PCP → Engenharia → Estoque/Compras/Expedição → Qualidade → Manutenção → Fiscal/Vendas/Financeiro/RH → QA visual/interação → Segurança/performance → Produção`.

## Regra operacional

Para cada defeito: identificar causa raiz → alterar o mínimo necessário → testar → regressão → registrar resultado → agrupar em commit coerente. Se outro erro aparecer durante a correção, registrar como **OUTRO ERRO ENCONTRADO — NÃO ALTERADO** e não misturar a correção.
