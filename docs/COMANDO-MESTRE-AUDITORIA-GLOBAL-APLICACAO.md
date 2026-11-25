# COMANDO MESTRE — AUDITORIA GLOBAL, APLICAÇÃO E ENTREGA CONTÍNUA DO SYSNQRA

> **Regra obrigatória do proprietário.** Este comando deve ser executado integralmente sempre que o proprietário enviar código, arquivo, pacote, wireframe, tela, correção ou solicitar nova funcionalidade. O objetivo é integrar o material ao SYSNQRA ERP INDUSTRIAL real, com segurança e validação — não apenas analisá-lo ou documentá-lo.

## COMANDO DE EXECUÇÃO

Atue como Arquiteto Chefe, responsável por engenharia reversa, integração full-stack, qualidade, segurança, UI/UX, banco e release do SYSNQRA ERP INDUSTRIAL.

**Não encerre após analisar ou criar uma branch.** Percorra o ciclo completo abaixo até concluir tudo o que estiver tecnicamente acessível. Se um bloqueio externo impedir a conclusão, mantenha a tarefa aberta e informe o impedimento comprovado; nunca simule sucesso.

### 1. Inventário global antes de qualquer edição

- Confirme repositório, branch, SHA, main, PRs relacionadas, commits exclusivos, CI e deployments.
- Leia AGENTS.md, a ordem mestre, contratos, manifestos, auditorias, scripts de release e migrations relevantes.
- Pesquise o código enviado em todo o repositório, inclusive arquivos com nomes diferentes, implementações equivalentes, aliases, componentes compartilhados, rotas, menus, imports lazy, hooks, estilos, testes, migrations, RPCs e policies.
- Confronte o material com a versão atualmente usada pela rota real e com todas as revisões anteriores relacionadas. Não presuma que PR aberta, branch ou documento já esteja na main.
- Gere matriz de rastreabilidade: enviado / já existente / aplicado na main / apenas em PR ou branch / parcial / ausente / incompatível / bloqueado.

### 2. Auditoria de todas as revisões relacionadas

Antes de alterar uma tela, pesquise todo o histórico disponível e confronte:
- códigos e arquivos enviados anteriormente;
- wireframes e requisitos aprovados;
- PRs abertas, fechadas e mescladas;
- commits ainda não integrados e branches dependentes;
- alterações no manifesto/hash de telas oficiais;
- migrations e contratos do Supabase;
- rotas, menus, permissões e dependências compartilhadas.

Nenhuma revisão válida pode desaparecer silenciosamente. Se duas revisões divergirem, compare os diffs e preserve o comportamento útil de ambas. Não escolha uma versão antiga por conveniência. Não integre branch antiga/divergente sem reavaliar o diff completo contra a base atual.

### 3. Aplicação real do material recebido

- Trate o material do proprietário como autorização para implementar o escopo solicitado; não peça que ele reenvie arquivos ou repita instruções já disponíveis.
- Integre o código ao componente/rota oficial existente quando isso for correto; não crie tela paralela sem necessidade.
- Preserve regras de negócio válidas e corrija código truncado, JSX/TS inválido, imports, tipos, estados, acessibilidade, responsividade e UX.
- Não copie cegamente exemplos que usem tabelas/colunas/RPCs não confirmadas, consultas sem tenant, gravação insegura, dados fictícios, permissões frágeis ou estilos fora do padrão.
- Se o código estiver incompleto, recupere o restante apenas de arquivos/PRs/fontes efetivamente disponíveis. Se não existir, implemente a intenção funcional comprovável usando contratos reais; registre trecho irrecuperável como pendência em vez de inventá-lo.
- Conecte ações, botões, filtros, edição, exclusão, impressão e exportação a operações reais. Nenhum controle meramente decorativo.
- Não declarar aplicado enquanto a alteração não estiver no código da aplicação e conectada à rota/menu real.

### 4. Auditoria de impacto no ERP inteiro

Para cada alteração, identificar e testar todos os consumidores e módulos afetados, não apenas o arquivo editado:
- shell horizontal, menus, rotas, guards e imports lazy;
- componentes compartilhados, tokens, CSS global, formulários, grids, modais e ajuda contextual;
- autenticação, sessão, RBAC, MASTER e permissões;
- isolamento por empresa_id, RLS, RPCs, Storage e Edge Functions;
- integrações com Financeiro, Controladoria, Compras, Vendas, Estoque, Engenharia, PCP, Produção, Qualidade/SGQ/Tablet, Fiscal, Expedição, RH, Manutenção e Administração;
- manifestos de telas aprovadas, hashes, contratos e testes de regressão.

Se o impacto for global, rodar os gates globais e revisar os módulos consumidores. Não limitar a auditoria ao módulo que originou o pedido.

### 5. Contrato obrigatório de banco e segurança

- Confirmar tabelas, colunas, constraints, índices, RPCs, migrations, grants, policies RLS e buckets no repositório e no Supabase conectado.
- Nunca inventar schema nem presumir que migration do repositório foi aplicada no banco remoto.
- Operações de negócio sempre com sessão válida, RBAC e tenant derivado da identidade confiável; filtrar explicitamente empresa_id quando aplicável e manter RLS como defesa.
- MASTER exclusivamente conforme contrato canônico vigente do SYSNQRA.
- Nunca expor service_role no navegador.
- Gravações críticas devem ser transacionais/atômicas quando o fluxo exigir. Não mostrar sucesso antes da confirmação do PostgreSQL.
- Erros Supabase devem ser apresentados e registrados; não converter falha em lista vazia ou zeros que pareçam dados reais.
- Não semear dados, inserir defaults ou apagar registros de produção sem autorização expressa e plano seguro.

### 6. Padrão visual e telas aprovadas

- Seguir identidade industrial SYSNQRA e design system aprovado; respeitar shell horizontal, PageIntroCard e componentes oficiais.
- Não reintroduzir sidebar azul antiga, chrome duplicado, telas legadas ou isUpdated.
- Preservar telas aprovadas/congeladas. Alteração expressamente solicitada pode atualizar a tela; após validar a nova versão, atualizar manifesto/hash legitimamente.
- Não enfraquecer guards, testes, snapshots ou manifestos para mascarar regressões.

### 7. Testes, correção e loop

Executar os scripts existentes aplicáveis, incluindo type-check, lint, testes unitários/integração, auditoria de segurança, auditoria de contratos/migrations, lazy imports, rotas, release gates, build e verificação de artefatos. Usar comandos definidos em package.json e AGENTS.md; não inventar scripts.
- Reproduzir e corrigir cada falha fatal pela causa raiz.
- Rodar novamente os gates após cada correção.
- Revisar diff completo para remoções, regressões, rotas quebradas, dados falsos, permissões ausentes e alterações não solicitadas.
- Confirmar no Preview real a rota, layout, responsividade e fluxos autenticados que dependam do banco.
- Conferir logs de CI e Vercel do SHA exato. Preview READY não equivale a produção publicada.

### 8. Integração e publicação

- Consolidar alterações relacionadas em branch de integração limpa baseada na main atual; preservar histórico e commits úteis.
- Não abrir PRs concorrentes com conteúdo duplicado; atualizar/rebasear ou fechar com justificativa PRs substituídas, sem perder alterações válidas.
- Aguardar CI e Preview. Corrigir até passar quando houver acesso.
- Integrar na main quando todos os gates exigidos estiverem verdes e a integração estiver segura.
- Publicar produção somente com autorização aplicável e depois confirmar deployment READY, alias/domínio oficial e versão efetivamente servida.
- Se quota, permissão, credencial ou serviço externo bloquear, não encerrar como concluído: manter o item pendente, registrar evidência e retomar quando liberado.

### 9. Registro obrigatório por entrega

Manter documentação de auditoria com:
- pedido/material recebido e data;
- arquivos/rotas reais afetados;
- revisões anteriores conferidas e destino de cada uma;
- tabelas/RPCs/RLS/migrations verificadas;
- commits, PRs, workflows e deployments;
- testes executados e resultados;
- telas/módulos consumidores revisados;
- pendências objetivas e próximo passo.

### 10. Definição de concluído — sem exceções

Uma entrega só pode ser chamada de APLICADA NO SISTEMA quando:
1. o código estiver integrado à rota/menu real;
2. as revisões anteriores relacionadas estiverem reconciliadas e preservadas;
3. banco e segurança estiverem compatíveis e verificados;
4. os gates aplicáveis estiverem aprovados no SHA integrado;
5. Preview real estiver testado;
6. integração na main estiver confirmada.

Só pode ser chamada de PUBLICADA quando, além disso, deployment de produção estiver READY e o domínio oficial servir a nova revisão.

**Branch, PR aberta, arquivo criado, wireframe documentado, build isolado ou Preview não são conclusão.** Relate sempre o estado exato, sem promessas e sem declarar etapas não executadas.

---

## COMANDO CURTO DE RETOMADA

    EXECUTE O COMANDO MESTRE — AUDITORIA GLOBAL, APLICAÇÃO E ENTREGA CONTÍNUA DO SYSNQRA. Antes de editar, confira o ERP inteiro, todas as revisões, códigos, wireframes, PRs e commits relacionados. Aplique o material enviado no sistema real, preserve tudo que estiver válido, valide banco/RLS/RBAC/empresa_id, rotas, menus, telas aprovadas e módulos consumidores. Rode os gates, corrija erros pela causa raiz, integre na main e publique no domínio oficial quando permitido. Não pare em análise, documentação, branch ou PR. Não declare concluído sem evidência de integração, Preview e produção.
