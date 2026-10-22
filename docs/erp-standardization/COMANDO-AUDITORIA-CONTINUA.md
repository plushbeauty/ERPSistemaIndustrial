# COMANDO CONTÍNUO — AUDITORIA E CONCLUSÃO DO ERP SYSNQRA

**Repositório:** `plushbeauty/ERPSistemaIndustrial`  
**Branch de trabalho padrão:** `main` (confirmar branch atual antes de escrever)  
**Objetivo:** continuar a auditoria de todo o ERP a partir do estado real do repositório, consolidando diretrizes históricas, sem reiniciar auditorias já feitas e sem declarar conclusão sem evidências.

## Comando para repetir em cada rodada

> Continue a execução da **Auditoria Contínua do ERP SYSNQRA** usando este documento e todas as diretrizes e auditorias anteriores do projeto. Primeiro consulte o estado atual do GitHub, os commits recentes, os relatórios existentes, o backlog, o contrato de telas aprovadas/congeladas e as verificações de CI. Não presuma que tarefas anteriores estejam concluídas sem verificar o código atual.
>
> Escolha a próxima pendência de maior prioridade que possa ser concluída com segurança nesta rodada. Faça o trabalho real no repositório: leia o arquivo completo e seus consumidores, confirme a rota real, dependências, schema/colunas e fluxo de dados; corrija apenas o escopo necessário; atualize a auditoria/backlog e o registro de revisão no próprio arquivo quando apropriado. Não entregue apenas recomendações quando houver ferramentas e evidência suficientes para editar o código.
>
> Audite todas as páginas e todos os campos: dimensões excessivas, campos estreitos/largos demais, alturas inconsistentes, labels desalinhados, grades, espaçamento, overflow, responsividade, abas redundantes ou pouco úteis, ações escondidas, botões sem ação, validações, acessibilidade, tabelas, filtros, impressão, carregamento, estados vazios e erros.
>
> Use como padrão compacto aprovado: fundo `#F8FAFC`, cartões brancos com borda `#E2E8F0` e sombra discreta, texto principal `#123B50`, labels de 9–10px em caixa alta, controles normalmente com 30–32px de altura, texto de entrada 11–12px, cantos de 2px e largura proporcional ao conteúdo. Código, quantidade, unidade, data e status devem ser compactos; descrição e observação podem ser maiores. Preserve o padrão visual específico das telas já aprovadas.
>
> Compare estrutura e usabilidade com SAP Fiori, ERPNext, TOTVS Protheus, Carbon/shadcn/ui, TanStack Table, Recharts e Lucide, adotando somente padrões úteis ao fluxo industrial e compatíveis com o design aprovado; não copie layouts alheios nem introduza dependências sem necessidade.
>
> **Integridade funcional obrigatória:** não criar dados fictícios, fallbacks simulados, botões decorativos ou sucesso falso. Confirmar gravação/edição real, erros exibidos, schema existente, autenticação, RLS, permissões RBAC, isolamento por `empresa_id`/tenant, RPCs e paginação. Não usar `service_role` no navegador, não usar `any`, não enfraquecer políticas de segurança e não executar migrações destrutivas ou SQL de produção sem revisão e autorização explícita.
>
> **Telas congeladas:** consulte o contrato de aprovação visual atualizado antes de tocar em arquivos bloqueados. Não altere tela congelada sem autorização explícita; se ela tiver defeito, documente o achado e proponha a mudança isolada para aprovação.
>
> Antes de editar, verifique se a pendência já foi resolvida e se existe alteração concorrente. Depois de editar, reveja o diff, rode as verificações relevantes disponíveis (incluindo type-check, lint, rotas, imports lazy, auditorias de segurança/UI e build conforme scripts existentes), corrija regressões e confirme o resultado. Não afirme que um comando foi executado sem saída real. Não afirme que Vercel publicou sem verificar o deployment associado ao commit.
>
> Atualize o relatório de auditoria com: rota, arquivo, problema reproduzível, impacto, correção, testes executados e resultado, estado (PENDENTE / CORRIGIDO AGUARDANDO VALIDAÇÃO / VALIDADO COM EVIDÊNCIAS), commit e deployment quando houver. Remova do backlog apenas itens comprovadamente concluídos; mantenha pendências não verificadas.
>
> Faça uma unidade de trabalho por vez, com mudanças pequenas e rastreáveis. Não pare após escrever o plano: execute a próxima unidade possível. Ao final desta rodada, informe objetivamente os arquivos alterados, o que mudou, os comandos realmente executados e suas saídas, commit SHA/link, status de CI e Vercel, bloqueios e a próxima pendência. Na próxima repetição, retome do backlog atualizado e continue até que todas as rotas e campos tenham sido auditados e as pendências corrigidas ou formalmente bloqueadas.

## Ordem de trabalho

1. Confirmar estado atual de branch, commits, CI e deployment.
2. Consolidar relatórios, backlog, rotas, aliases, componentes compartilhados e contrato de telas congeladas.
3. Gerar/atualizar inventário por rota e componente realmente renderizado.
4. Auditar dimensões, alinhamento, responsividade e utilidade das abas em cada página.
5. Auditar ações, formulários, tabelas, filtros, impressão, validações e acessibilidade.
6. Verificar Supabase: tabelas/colunas reais, tenant, RLS/RBAC, consultas, gravações e RPCs.
7. Corrigir por módulo sem mudanças laterais, validando cada lote.
8. Revisar visualmente as telas em resoluções representativas quando houver navegador/ferramenta disponível.
9. Reconciliar backlog e registros de revisão, sem marcar como validado o que não foi testado.
10. Confirmar build/CI e deployment Vercel vinculados ao commit final de cada lote.

## Critérios de conclusão global

A auditoria só pode ser marcada como concluída quando:
- Todas as rotas ativas estiverem associadas a componentes identificados e revisados.
- Todos os formulários/campos, abas, grids, filtros, ações e estados principais tiverem evidência de revisão.
- Nenhum campo ou aba estiver marcado como corrigido sem validação pertinente.
- Fluxos críticos e segurança multiempresa tiverem sido verificados sem dados simulados.
- Os arquivos congelados tiverem sido preservados ou alterações autorizadas e documentadas.
- As verificações de CI/build e o status de deployment forem relatados com evidência real.
- Todas as pendências restantes estiverem resolvidas ou claramente documentadas como bloqueadas, com motivo e próximo passo.

**Importante:** repetir este comando retoma o trabalho; não significa que a auditoria completa acontece instantaneamente nem que execuções futuras serão automáticas em segundo plano.
