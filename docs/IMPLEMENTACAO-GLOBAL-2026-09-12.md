# Fechamento global — ERP Industrial

Data: 2026-09-12

## Escopo consolidado

- Supabase Auth como identidade de login.
- Perfis ERP vinculados por `auth_user_id` e `empresa_id`.
- Sessão persistente e renovação automática no frontend.
- RLS habilitado nas tabelas ERP.
- Segregação por empresa e permissões por módulo/ação.
- Administração de usuários via função server-side com Supabase Auth.
- Fluxo SGQ: criação, revisão, solicitação de alteração, revisão, aprovação, liberação e substituição de versão.
- Revisões aprovadas/liberadas protegidas contra alteração direta.
- Impressão/PDF controlado de documentos.
- Base de produtos com código, unidade, tipo, estoque mínimo, custos, markup, margem e preço.
- Venda registrada de forma atômica por RPC autenticada.
- Itens de venda vinculados aos produtos.
- Saída de estoque registrada automaticamente na venda.
- Validação de estoque insuficiente antes da finalização.
- Histórico de movimentação de estoque associado à venda.
- Auditoria estrutural das políticas/RLS executada.

## Validação atual do banco

- Tabelas ERP com RLS: 106.
- Políticas RLS ERP: 120.
- Usuários Auth existentes no momento da auditoria: 1.
- Usuários ERP existentes no momento da auditoria: 1.

## Observação de produção

A validação final no domínio de produção depende da execução de um novo build/deploy pela Vercel. O código e as migrações ficam registrados no repositório principal; não declarar produção validada enquanto o build estiver bloqueado pelo limite da Vercel.
