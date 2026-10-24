# Central de Parceiros — revisão APROV-PARCEIROS-2026-10-24-R1

**Data/hora:** 2026-10-24 18:52:12 -03:00  
**Rota canônica:** `/cadastros/parceiros`  
**Arquivo:** `src/pages/ParceirosIndustrial.tsx`

## Escopo implementado

- Consolida Clientes e Fornecedores numa única tela com abas, usando os formulários e funções CRUD existentes.
- O menu global Cadastros, o menu comercial e o catálogo de navegação passam a exibir uma única entrada: **Central de Parceiros**.
- As rotas antigas redirecionam para a aba correspondente:
  - `/vendas/clientes`, `/cadastros/clientes`, `/clientes` → `/cadastros/parceiros?tipo=cliente`
  - `/cadastros/fornecedores`, `/fornecedores`, `/compras/fornecedores` → `/cadastros/parceiros?tipo=fornecedor`
- A tela antiga duplicada `ClientesIndustrial.tsx` foi removida por não ser mais usada. `VendasClientes.tsx` e `FornecedoresIndustrial.tsx` permanecem como componentes reutilizados pela Central para preservar formulários, validações e persistência.

## Dados e segurança

Não foram criadas tabelas, dados falsos, políticas RLS nem credenciais novas. Os formulários existentes continuam responsáveis pelos acessos Supabase e filtros de empresa que já implementam. A integração deve ser validada com sessão autenticada e banco real.

## Validação pendente

- Type-check, lint e build da branch.
- Conferência de navegação por abas e redirecionamentos no preview autenticado.
- Confirmar deployment Vercel `READY` antes de considerar publicada.
