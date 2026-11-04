# SYSNQRA ERP INDUSTRIAL — Instruções obrigatórias para agentes de código

## REGRA PRINCIPAL: EXECUTAR, NÃO FICAR EXPLICANDO

Você trabalha diretamente no repositório SYSNQRA ERP INDUSTRIAL. Pesquise o código existente, corrija, complete e integre o sistema. **Não responda com planos, análises longas, listas do que pretende fazer ou perguntas pedindo autorização para começar. Comece a executar imediatamente.**

- Não encerre após pesquisar ou identificar problemas. Para cada problema encontrado, faça a correção no código, banco/migrations, rotas, menus e testes aplicáveis.
- Não peça ao usuário para repetir instruções já registradas neste arquivo, nos documentos do repositório, nas issues ou na tarefa.
- Não diga que implementou algo sem alterar os arquivos e validar o resultado.
- Se a tarefa for grande, trabalhe em etapas internamente e continue até concluir o máximo possível. Não pare para apresentar um plano.
- A resposta final deve ser curta: alterações reais, commit/PR, testes executados e bloqueios externos concretos.

## 1. LEVANTAMENTO OBRIGATÓRIO DO REPOSITÓRIO INTEIRO

Pesquise o repositório completo na branch de trabalho atual — não apenas os arquivos citados pelo usuário ou os primeiros resultados da busca.

1. Leia README, package.json, configurações Vite/TypeScript/Tailwind, instruções existentes, migrations, Edge Functions, políticas RLS, scripts e workflows CI.
2. Faça inventário de todas as páginas, componentes, features, hooks, serviços, tipos, schemas, migrations, RPCs, Edge Functions, rotas, menus e testes.
3. Pesquise cada módulo do ERP e siga o fluxo ponta a ponta: menu → rota → página → componentes → hooks/serviços → Supabase/RPC/Edge Function → tabelas → RLS → Storage → auditoria → impressão/exportação → testes.
4. Antes de criar arquivos, pesquise referências e dependências em todo o repositório, inclusive nomes alternativos, outras pastas, imports dinâmicos e componentes compartilhados. Nunca declare um arquivo ou função inexistente com base em uma busca isolada.
5. Identifique páginas duplicadas, rotas órfãs, menus sem rota, telas antigas/legadas ainda acessíveis, imports quebrados, funções sem uso e implementações incompletas.
6. Mantenha internamente uma matriz por módulo: existente, incompleto, quebrado, ausente, dependências, arquivos envolvidos e validação necessária. Use-a para executar o trabalho, não para substituir a implementação por um relatório.
7. Continue até cobrir todos os módulos relevantes do sistema. Não limite a auditoria à tela inicialmente mencionada.

## 2. EXECUÇÃO POR MÓDULO — PONTA A PONTA

Para cada módulo encontrado:
- Corrija erros de compilação, TypeScript, imports, runtime, formulários, estados, navegação e responsividade.
- Complete operações reais de consulta, cadastro, edição, exclusão controlada, histórico, anexos, impressão e exportação quando fizerem parte do processo.
- Conecte cada ação ao serviço correto e ao Supabase real. Não deixe botões decorativos, formulários que apenas simulam gravação ou dados fixos apresentados como reais.
- Crie/ajuste migrations SQL versionadas, constraints, índices, RPCs, triggers, políticas RLS e Edge Functions necessárias, compatíveis com o schema existente e seguras para execução.
- Garanta isolamento por empresa usando empresa_id e valide autorização no servidor/banco, não somente na interface.
- Use Supabase Auth e sessão real. Nunca exponha service_role no navegador. Operações privilegiadas devem ocorrer em Edge Functions/RPCs seguras.
- Implemente auditoria de operações críticas e trilha de alterações quando aplicável.
- Para arquivos, use Supabase Storage com autorização, caminhos e políticas por empresa; não simule anexos em memória.
- Verifique estados de carregamento, vazio, sucesso e erro; apresente mensagens claras em português.
- Integre a página à rota canônica e ao menu correto, sem criar entradas duplicadas.
- Atualize testes automatizados e verificações para impedir regressões.

## 3. PADRÕES INEGOCIÁVEIS DO SYSNQRA

- Nome do produto: **SYSNQRA ERP INDUSTRIAL**.
- Stack existente: React + TypeScript + Vite + Tailwind + Supabase/PostgreSQL/RLS + Vercel. Respeite versões, arquitetura, convenções e dependências do repositório.
- Preserve integralmente o visual e o comportamento das páginas aprovadas/congeladas. Não redesenhe, simplifique, substitua ou restaure versões antigas dessas telas. Corrija nelas somente defeitos funcionais/técnicos estritamente necessários.
- Não remova páginas, funcionalidades, componentes, rotas ou dados para fazer o build passar. Não substitua telas novas por código legado.
- Preserve o shell horizontal aprovado e a navegação atual. Não reintroduza sidebar antiga, cabeçalho antigo ou navegação legada.
- Não adicione `isUpdated`, `is-updated-orange`, badges laranja ou realces laranja nos menus. O menu global aprovado usa estilo neutro e não marca telas novas por cor.
- Mantenha UI industrial premium, acessibilidade, responsividade, textos em português e consistência com componentes compartilhados.
- Não crie mocks, fixtures, arrays estáticos ou LocalStorage para representar operações empresariais reais. Dados estáticos só podem existir em testes isolados e identificados como fixtures.
- Não altere o modelo de identidade Master: somente pelo fluxo oficial /configuracao-adm-master, plush-master-bootstrap, SUPER_ADMIN, nivel_admin=100, empresa_id=NULL e isMaster===true. Não use nivel_admin===9 como substituto de Master.
- Respeite tenant scoping por empresa_id em leituras, gravações, RPCs, Edge Functions, Storage e auditoria.
- Não enfraqueça RLS, autenticação, RBAC ou validações para contornar erros.

## 4. ROTAS, MENU E NAVEGAÇÃO

Faça varredura completa do registro de rotas e de todos os menus:
- Cada item de menu deve apontar para uma rota existente e funcional.
- Cada página operacional que deva ser acessível deve estar vinculada ao menu/grupo correto, conforme a arquitetura do produto.
- Corrija caminhos, parâmetros, lazy imports, redirects e guards.
- Identifique e elimine duplicidades sem apagar funcionalidades distintas.
- Mantenha redirects de compatibilidade somente quando necessários; não reative páginas legadas como destino principal.
- Teste navegação direta por URL, refresh, acesso autorizado e não autorizado.

## 5. SEGURANÇA E DADOS

- Audite RLS de todas as tabelas envolvidas e valide isolamento entre empresas.
- Verifique privilégios de funções SECURITY DEFINER, search_path, validação de usuário/empresa e permissões de execução.
- Valide autorização também em Edge Functions e RPCs; não confie em campos enviados pelo cliente para definir empresa, nível ou identidade.
- Não exponha senhas, tokens, dados pessoais ou segredos em logs, telas, respostas ou commits.
- Não apague nem altere dados de produção para testar. Use ambiente de teste/preview e operações reversíveis.
- Nunca invente nomes de tabelas, colunas, RPCs, buckets ou variáveis. Inspecione schema, migrations e código antes de usar.

## 6. VALIDAÇÃO OBRIGATÓRIA ANTES DE CONCLUIR

Execute os comandos existentes no package.json e workflows aplicáveis:
- instalação compatível com lockfile;
- lint;
- typecheck;
- testes unitários/integração disponíveis;
- verificações de rotas e contratos;
- build de produção;
- scripts de verificação de release existentes.

Corrija os erros encontrados e rode novamente as verificações. Inspecione logs completos do CI/Vercel quando disponíveis. Não declare sucesso se algum comando falhar ou não tiver sido executado. Diferencie validação local, CI/Vercel e bloqueios por segredo, permissão, configuração ou serviço externo indisponível.

## 7. FORMA DE TRABALHO

- Trabalhe na branch indicada pelo usuário ou na branch atual. Não mude de branch silenciosamente.
- Inspecione git status/diff antes de editar e preserve alterações preexistentes do usuário.
- Faça alterações pequenas, coerentes e completas. Não sobrescreva arquivos inteiros sem necessidade.
- Não faça force-push, não reescreva histórico e não faça deploy de produção sem autorização explícita.
- Faça commits com mensagens objetivas quando a integração permitir; nunca afirme que fez commit se não fez.
- Se faltar acesso a Supabase/Vercel/segredos, conclua tudo que puder no código e informe somente o bloqueio específico, sem inventar resultados.

## 8. RESPOSTA FINAL OBRIGATÓRIA

Responda de forma curta, sem reproduzir a análise:
1. módulos/páginas efetivamente corrigidos ou construídos;
2. arquivos/migrations/rotas/menu alterados;
3. commit ou PR, se criado;
4. comandos/testes executados e resultado real;
5. pendências externas concretas, se houver.

**Não entregue somente diagnóstico. Pesquise o código existente, implemente as correções e continue até validar.**
