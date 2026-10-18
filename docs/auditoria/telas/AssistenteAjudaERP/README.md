# Auditoria — Central de Ajuda Operacional

- **Tela:** `src/pages/AssistenteAjudaERP.tsx`
- **Revisão:** 2026-10-18
- **Branch:** `fix/pcp-process-sheet-submenu-guard`
- **Status:** PARCIAL — código e migration versionados; schema remoto, testes automatizados e persistência autenticada ainda não confirmados.

## Causa raiz
A versão anterior mantinha perguntas e respostas apenas no estado local do React e não preservava o histórico após recarregar a tela. O layout do campo de consulta também usava controles maiores que o padrão compacto.

## Correções
- Consulta exige usuário autenticado, perfil ERP ativo e empresa definida.
- Histórico é carregado da tabela `erp_ajuda_suporte`, limitado à empresa atual, ordenando os registros recentes para exibir os 100 mais recentes em ordem cronológica.
- Envio grava pergunta, resposta de orientação, módulo, usuário e empresa; a conversa só aparece como salva depois do retorno positivo do banco.
- A caixa de entrada e o botão usam grid responsivo de 12 colunas, controles de 32 px e rótulos compactos.
- Respostas continuam sendo orientações locais baseadas em regras; **não são respostas de IA nem POPs formalmente aprovados**. O fallback sinaliza quando não há procedimento catalogado.

## Migration adicionada
`supabase/migrations/20261018190000_erp_ajuda_suporte_history.sql`
- Tabela com FK para empresa e perfil ERP.
- RLS habilitado.
- Leitura limitada à empresa da sessão.
- Inserção exige usuário autenticado ativo, perfil pertencente à mesma empresa e tenant atual.
- Não concede UPDATE/DELETE aos operadores.

## Validação pendente
- [ ] Confirmar schema e policies no Supabase remoto.
- [ ] Aplicar migration no ambiente correto após validar o projeto conectado.
- [ ] Testar inserção/leitura com sessão real e duas empresas.
- [ ] Type-check, lint, auditorias globais/interações, rotas, imports lazy, approved UI lock e build.
- [ ] Conferir desktop/tablet e fluxo de impressão.
- [ ] Confirmar deploy do commit final.

## Segurança e limite
A conexão do Supabase retornou lista de projetos vazia nesta execução; a migration **não foi aplicada remotamente**. Não declarar persistência em produção até teste autenticado.
