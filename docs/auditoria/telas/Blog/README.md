# Auditoria de tela — Blog.tsx / Portal de Conhecimento e POPs

- **Data da revisão:** 2026-10-18
- **Arquivo da tela:** `src/pages/Blog.tsx`
- **Migration:** `supabase/migrations/20261018200000_erp_portal_conhecimento_tenant_rls.sql`
- **Status:** **PARCIAL — aguardando aplicação da migration e validação autenticada**
- **Escopo:** substituir o array estático por leitura de artigos publicados no Supabase, retirar CSS paralelo do componente e limitar leitura ao tenant da sessão.

## Achados

1. **Conteúdo estático:** os artigos ficavam no array `articles`; novos procedimentos não apareciam sem alterar e publicar código.
2. **CSS paralelo:** a tela dependia de `login-blog-fix.css` e `blog-visual-2026.css`, o que dificultava auditar a origem do layout.
3. **Ausência de estados de sessão/erro:** a versão anterior não lia dados remotos nem informava quando a biblioteca não carregava.
4. **RLS insuficiente no SQL proposto:** uma política `FOR ALL` com `USING/WITH CHECK` para qualquer usuário do tenant daria também permissão de escrita a operadores. A migration desta revisão separa SELECT de INSERT/UPDATE/DELETE e limita escrita a Master ou administrador ativo do mesmo tenant.

## Alterações registradas

- A tela consulta `erp_current_empresa_id()` e interrompe a consulta se não houver sessão autenticada ou tenant válido.
- A listagem consulta apenas `empresa_id` da sessão e `status = 'publicado'`; a aplicação não considera o filtro de empresa como substituto do RLS.
- Adicionados pesquisa por título/resumo/categoria, filtros dinâmicos, estado de carregamento, mensagem de erro e modal de leitura.
- Removidas as importações dos CSS paralelos; layout e controles usam classes Tailwind no componente.
- A migration cria `erp_portal_conhecimento`, status de publicação, metadados de criação/atualização, índices e políticas RLS separadas por operação.
- A leitura de rascunhos/arquivados fica limitada a administradores ativos do próprio tenant (ou Master dentro do contexto de tenant); leitores comuns veem somente publicados.

## Segurança e limites conhecidos

- A migration **foi gravada no repositório**, mas **não foi aplicada nem confirmada no Supabase remoto** nesta revisão.
- Não foram executados testes com duas empresas, perfis de operador/administrador, nem testes de persistência remota.
- A tela implementada é um portal de consulta. O formulário administrativo para criar/editar/publicar POPs não faz parte desta alteração; a política RLS permite a gestão via cliente administrativo autorizado, mas o fluxo de publicação dentro da interface permanece pendente.
- O estado de Master sem `empresa_id` não deve ser usado para consulta cross-tenant nesta tela; é necessário selecionar/estabelecer um contexto de empresa autorizado antes de abrir o portal.
- A migration assume os contratos existentes `erp_empresas(id)`, `erp_usuarios(auth_user_id, empresa_id, ativo, deleted_at, nivel_admin)`, `erp_current_empresa_id()` e `erp_is_master()`; confirmar esses contratos no banco remoto antes da aplicação.

## Validação

| Verificação | Resultado |
|---|---|
| Revisão estática do código | Concluída |
| Type-check | Pendente — execução local/CI não disponível nesta revisão |
| Lint | Pendente |
| Auditorias globais/interações | Pendente |
| Verificação de rotas/imports e telas congeladas | Pendente |
| Build | Pendente; não declarar sucesso sem saída do comando/CI |
| Migration remota e RLS | Pendente |
| Testes de isolamento entre duas empresas | Pendente |
| Deploy de produção | Não confirmado |

## Revisão e commits

- **Código da tela:** `2f73db8b87980ee2536f800244b75c9abfd00ea6`
- **Migration:** `f6d86f5b271918881aa4a48150f2cf8de60206e1`
- **Branch:** `fix/blog-portal-conhecimento-20261018`
- **Produção:** não alterada por merge nesta revisão.
