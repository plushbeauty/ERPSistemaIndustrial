# ORDEM MESTRA — EXECUÇÃO CONTÍNUA DO SYSNQRA

**Projeto:** SYSNQRA ERP INDUSTRIAL  
**Repositório:** `plushbeauty/ERPSistemaIndustrial`  
**Painel operacional existente:** `/pageprincipal/administracao/central-evolucao`  
**Branch inicial desta ordem:** `feat/central-evolucao-autonoma-20261110`  
**Base validada:** `bbc753ab6f666c1e013e34ded1bb10a8830d5f73`  
**Regra:** trabalhar em lotes pequenos, com evidência, sem publicar em produção automaticamente.

## 1. Comando mestre para retomar o trabalho

Copie este comando em uma nova conversa para retomar a execução sem reexplicar o projeto:

> Continue a EXECUÇÃO CONTÍNUA DO SYSNQRA ERP INDUSTRIAL pela ordem deste documento e pelo backlog da Central de Evolução. Consulte primeiro a branch de trabalho, HEAD, PR, alterações concorrentes, CI, Vercel, inventário de rotas, manifesto de telas aprovadas, auditorias e estado remoto do Supabase. Não confie em relatórios antigos sem confirmar o código atual.
>
> Execute a próxima tarefa pendente de maior prioridade. Não pare em diagnóstico ou plano quando houver acesso e evidência suficientes para corrigir. Leia arquivos completos e consumidores, rastreie a rota real, compare a tela com referências de ERPs do segmento e exemplos fornecidos pelo proprietário, valide schema remoto, RPC, RLS, RBAC e isolamento por empresa. Corrija a tela e seus fluxos reais, não apenas o visual.
>
> Em cada tela verifique: finalidade e fluxo; campos obrigatórios/opcionais; dimensões e alinhamento; filtros e pesquisa; abas; inclusão; edição; exclusão quando permitida; salvar/cancelar; validações; botões e menus; impressão/exportação; anexos; histórico; ajuda contextual; estados de carregamento/vazio/erro; responsividade desktop/tablet/celular; acessibilidade; autorização por perfil; persistência e leitura real no Supabase.
>
> Nenhum botão decorativo, dado fictício, sucesso simulado, fallback que esconda erro, RPC inventada ou acesso cruzado entre empresas. Não usar `service_role` no navegador. Não alterar FKs, dados antigos, políticas RLS ou telas congeladas sem necessidade demonstrada e autorização aplicável. Não reaplicar migrations remotas nem ignorar drift.
>
> Antes de editar, confirme que o problema ainda existe e que o arquivo não foi alterado por outro commit. Preserve o contrato visual e os hashes das telas aprovadas. Depois, revise o diff, rode testes pertinentes, type-check, lint, auditorias, gates de rotas/imports, manifesto e build. Corrija qualquer regressão antes de avançar.
>
> Atualize a Central de Evolução com evidência e estado correto. Faça commit na branch de trabalho, verifique CI e crie/acompanhe Preview. Se qualquer gate falhar, investigue o log, corrija e rode novamente. Não marque concluído com base apenas em build verde: valide o fluxo e a tela. Não faça merge em main, não promova domínio oficial e não aplique alteração destrutiva em produção sem autorização explícita.
>
> Ao concluir uma unidade, avance para a próxima pendência segura enquanto houver tempo e ferramentas nesta execução. Ao final, informe somente o que foi realmente alterado, SHAs, testes e resultados, Preview, bloqueios e próxima tarefa. Retome do ponto exato na próxima rodada.

## 2. Ordem obrigatória por módulos

A ordem abaixo define prioridade, não presume que as telas estejam incompletas. Cada item deve ser inspecionado e marcado como VALIDADO, CORRIGIDO AGUARDANDO VALIDAÇÃO, PENDENTE ou BLOQUEADO com evidência.

### Fase 0 — Fundação e inventário
- [ ] Confirmar branch/HEAD/PR e sincronização com a base verde.
- [ ] Inventariar todas as rotas ativas e redirecionamentos; ligar cada rota ao componente renderizado.
- [ ] Cruzar inventário com manifesto/hash de telas aprovadas e arquivos congelados.
- [ ] Mapear componentes compartilhados, formulários, tabelas, diálogos, hooks, RPCs e buckets.
- [ ] Reconciliar migrations locais/remotas por versão e conteúdo; não reaplicar migration já executada.
- [ ] Gerar matriz tela × rota × arquivo × tabela/RPC × permissões × ajuda × testes.

### Fase 1 — COMPRAS (primeiro módulo a concluir integralmente)
- [ ] Central de Compras / workspace: navegação, abas, atalhos, indicadores e ações.
- [ ] Solicitação de compra: criação, edição, aprovação, cancelamento, anexos e histórico.
- [ ] Requisições: centro de custo, urgência, itens, aprovação e rastreabilidade.
- [ ] RFQ/cotações: fornecedores convidados, propostas, comparação, decisão e status permitidos.
- [ ] Análise de preços: histórico, comparativo, memória de cálculo e decisão.
- [ ] Cadastro/seleção de fornecedores: dados, contatos, documentos e validações.
- [ ] Pedidos: novo, editar, salvar, duplicar se permitido, imprimir, itens, totais, datas, status, numeração e RPC atômica.
- [ ] Recebimento/fiscal: vínculo do pedido, itens recebidos, divergências e documentos fiscais.
- [ ] Relatórios e indicadores: filtros reais, totais conferíveis, exportação/impressão.
- [ ] Ajuda de Compras: finalidade, campos, regras, passos e erros comuns em cada fluxo.
- [ ] Verificar todas as ações dos botões: nenhum botão sem callback/ação real.
- [ ] Conferir contratos remotos de `erp_pedidos_compra`, `erp_pedidos_compra_itens`, RPCs, sequências, constraints e RLS por `empresa_id`.
- [ ] Testar leitura, inclusão e edição com usuário autorizado; testar bloqueio de acesso entre empresas sem alterar dados de produção.
- [ ] Executar auditoria funcional/visual de todas as rotas de Compras e fechar a fase somente com evidências.

### Fase 2 — Financeiro e Controladoria
- [ ] Fluxo de caixa, contas a pagar/receber, conciliação e importação de extratos.
- [ ] Notas de débito, notas fiscais, comissões e regras de cálculo.
- [ ] Custo padrão, custo por OP, apuração de custos e lucratividade.
- [ ] Razão geral, auditoria, retificações, relatórios e exportações.
- [ ] Conferir fórmulas, arredondamentos, competências, períodos e totais com registros reais.
- [ ] Validar permissões, RPCs, gravações e RLS por empresa.

### Fase 3 — PCP, Engenharia e Chão de Fábrica
- [ ] Fichas de processo, BOM/revisões, roteiros e capacidade.
- [ ] Ordens, programação, apontamento e terminal do operador.
- [ ] Acabamento, montagem, consolidação de origens e rastreabilidade.
- [ ] Máquinas, turnos, paradas, produção parcial e leitura por código/QR.
- [ ] Validar fluxo ponta a ponta com dados reais e permissões.

### Fase 4 — Qualidade / SGQ
- [ ] Inspeções, templates versionados, liberação de lotes e instrumentos.
- [ ] RPNC, Ishikawa 6M, 5 Porquês, CAPA, recorrência e eficácia.
- [ ] Auditorias, documentos controlados, aprovações e distribuição.
- [ ] Genealogia, refugos, evidências e anexos nos buckets corretos.
- [ ] Preservar a navegação aprovada pelo tablet SGQ e os contratos congelados.

### Fase 5 — Estoque, Almoxarifado, Logística e Expedição
- [ ] Saldos, inventário, separação, ajustes, etiquetas e rastreabilidade.
- [ ] Recebimento, armazenagem, saída de materiais e validade.
- [ ] Expedição, NF-e, romaneio, roteirização e impressão de etiquetas.
- [ ] Validar movimentos, saldos, vínculos e isolamento por empresa.

### Fase 6 — RH, Administração, Cadastros e demais módulos
- [ ] Funcionários, ponto, turnos, escalas, treinamentos, ausências e acidentes.
- [ ] EPIs, entregas e histórico por funcionário.
- [ ] Usuários, RBAC, configurações, cadastros e Master.
- [ ] Produtos, clientes, fornecedores, GED e integrações.
- [ ] Ajuda global e contextual, login, recuperação e onboarding.

### Fase 7 — Revisão global e liberação
- [ ] Reexecutar inventário de todas as rotas e identificar telas órfãs/duplicadas.
- [ ] Reexecutar auditoria de campos, botões, ajuda, acessibilidade e responsividade.
- [ ] Reexecutar TypeScript, ESLint, auditorias, gates, manifesto, imports lazy e build.
- [ ] Revisar erros e warnings dos logs do Preview.
- [ ] Validar rotas principais no Preview e testar fluxos reais com credenciais/perfis autorizados.
- [ ] Confirmar status Vercel associado exatamente ao SHA do PR.
- [ ] Preparar relatório final de pendências e evidências antes de pedir liberação de produção.

## 3. Checklist obrigatório por tela

| Área | O que deve ser comprovado |
|---|---|
| Estrutura | Rota canônica, componente real, título, abas úteis e navegação |
| Campos | Todos os campos do processo, tipos, obrigatoriedade, máscara, largura e validação |
| Ações | Novo, editar, salvar, cancelar, excluir quando permitido, imprimir/exportar |
| Tabelas | Colunas, ordenação, filtros, busca, paginação e estados vazios |
| Ajuda | Ajuda global/contextual com instrução específica da tela |
| Dados | Tabelas/colunas reais, RPCs corretas, persistência e leitura |
| Segurança | Auth, RBAC, RLS, tenant e `empresa_id`; sem vazamento cruzado |
| Interface | Alinhamento, densidade, contraste, overflow e responsividade |
| Evidências | Teste executado, resultado, commit e Preview vinculados |

## 4. Regras de execução e de segurança

1. **Uma unidade por vez:** uma tela ou fluxo funcional por lote, sem misturar refatorações sem relação.
2. **Comparação real:** usar exemplos fornecidos pelo proprietário e referências de mercado pertinentes ao segmento; registrar o que foi aproveitado e o que não se aplica.
3. **Telas aprovadas:** hash diferente exige investigação; nunca atualizar manifesto apenas para silenciar gate.
4. **Banco:** inspecionar schema remoto antes de SQL; não alterar FK, registros antigos ou RLS para fazer a tela passar.
5. **Migrations:** comparar versão e conteúdo remoto/local; drift deve ser resolvido conscientemente.
6. **Falhas Vercel:** ler o log do deployment específico; distinguir falha de código, limite de build, configuração e ambiente.
7. **Commit:** commits pequenos e descritivos na branch de trabalho; nunca presumir que o commit foi criado.
8. **Produção:** Preview verde não é produção. Merge, alias oficial e migração produtiva são etapas distintas.
9. **Sem falsa conclusão:** “corrigido” não significa “validado”; só concluir com evidência apropriada.
10. **Retomada:** em cada nova rodada, reler o backlog e o último SHA; não repetir trabalho já comprovado.

## 5. Estados padronizados da fila

- `PENDENTE`: ainda não inspecionado ou problema confirmado sem correção.
- `EM ANDAMENTO`: execução ativa.
- `CORRIGIDO AGUARDANDO VALIDAÇÃO`: alteração feita, faltam testes/Preview/fluxo.
- `VALIDADO`: evidências funcionais, técnicas e de segurança anexadas.
- `BLOQUEADO`: depende de acesso, schema, decisão ou recurso; registrar motivo e próximo passo.
- `NÃO APLICÁVEL`: somente com justificativa objetiva.

## 6. Limite da automação

A Central de Evolução existente é o painel persistente de acompanhamento no produto. Este documento é o roteiro e o comando de retomada. Uma conversa não permanece executando indefinidamente em segundo plano: a execução pode avançar enquanto houver uma sessão ativa e ferramentas disponíveis; para continuar depois, retome com o comando da seção 1. Não marcar tarefas como executadas só porque estão descritas neste roteiro.
