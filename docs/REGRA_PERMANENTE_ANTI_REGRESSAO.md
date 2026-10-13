# Regra permanente: preservar telas aprovadas e impedir regressões

**Escopo:** todo o ERP Industrial, em toda correção, refatoração, atualização visual, integração de PR e publicação.

## Regra inviolável
Uma alteração solicitada em uma tela não autoriza modificar o comportamento aprovado das outras. Nenhuma tela, rota, menu, atalho, regra de negócio, permissão, consulta Supabase ou fluxo de impressão pode ser removido, substituído por versão antiga ou alterado de forma colateral sem necessidade explícita, revisão de impacto e validação.

## Procedimento obrigatório por alteração

### 1. Descobrir a fonte correta
- Identificar a branch de trabalho, SHA base e destino da publicação.
- Consultar PRs abertos/mesclados que afetem os mesmos arquivos e as aprovações registradas.
- Comparar a versão de produção/main com a última versão aprovada que ainda possa estar em uma branch ou PR.
- Não presumir que main é a fonte mais atual quando existem PRs encadeados.

### 2. Proteger o trabalho existente
- Fazer alteração mínima e focada.
- Em conflitos, preservar explicitamente o conteúdo e o comportamento de ambos os lados. Não escolher automaticamente a versão de main se ela for antiga.
- Se não for possível determinar qual versão foi aprovada, não sobrescrever: documentar o conflito e pedir decisão.
- Não mesclar PR dependente antes de sua base, a menos que o diff seja reavaliado integralmente e suas dependências estejam satisfeitas.
- Não fazer reset destrutivo, force-push ou remoção de código para “fazer compilar”.

### 3. Verificar impacto
Para arquivos compartilhados — shell, cabeçalho, menu, rotas, providers, CSS global, auth/RBAC e componentes comuns — identificar os módulos consumidores e testar os fluxos que possam ser afetados. Revisar explicitamente, conforme o impacto: Vendas, Cadastros, Estoque/Engenharia, Compras, PCP, Qualidade e Tablet Qualidade, Fiscal, Financeiro, Manutenção e RH.

### 4. Validar antes de aprovar
- Executar type-check, ESLint, build de produção e scripts de auditoria/contrato aplicáveis.
- Conferir o diff para remoções acidentais, rotas alteradas, atalhos sumidos, imports substituídos e estilos globais regressivos.
- Validar telas e fluxos no preview autenticado quando houver mudança visual/funcional; compilação sozinha não prova funcionamento.
- Se um teste falhar, corrigir ou registrar como bloqueio. Não declarar verde por inferência.
- Após merge, conferir o commit implantado e o status real do deploy. PR aberto não é produção.

## Critérios de aceite de cada PR
Todo PR deve descrever:
1. Tela/funcionalidade solicitada.
2. Arquivos e módulos afetados.
3. Telas e comportamentos aprovados que foram preservados.
4. Testes executados e resultados observados.
5. Pendências de validação visual, CI ou deploy.

## Definition of Done
A tarefa só está concluída quando a alteração solicitada funciona, as funcionalidades anteriores continuam presentes, os testes aplicáveis passam, a integração não perde alterações aprovadas e a publicação é verificada. Se faltar qualquer evidência, o status é **PENDENTE**, nunca “concluído”.

## Incidente de regressão
Quando uma tela aprovada voltar ao estado antigo:
1. Suspender alterações não relacionadas que possam ampliar o dano.
2. Identificar o último commit/PR em que o comportamento aprovado existia.
3. Comparar a versão aprovada com a branch atual e localizar o commit que perdeu a mudança.
4. Restaurar o comportamento a partir da implementação aprovada, integrando-o sem descartar correções posteriores válidas.
5. Adicionar/atualizar um teste de contrato ou regressão para o comportamento quebrado.
6. Executar os gates e validar o preview antes de promover a correção.

Esta política complementa e é obrigatória junto de `AGENTS.md`.
