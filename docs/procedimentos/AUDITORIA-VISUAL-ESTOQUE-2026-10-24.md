# Auditoria visual e funcional — Estoque SYSNQRA ERP INDUSTRIAL

- Data: 2026-10-24
- Branch: `fix/estoque-anatomia-visual-2026-10-24`
- Referência visual: Central de Compras aprovada (`/compras`, componente `src/pages/ComprasIndustrial.tsx`) e tokens mestres de formulário.
- Escopo: telas de estoque/almoxarifado e balanço. Nenhuma tela aprovada de Compras foi modificada.

## Inspeção anterior às alterações

A rota `/estoque` e `/estoque/saldos` usa `src/pages/EstoqueAlmoxarifadoCompact.tsx` em `src/AppEntryV2.tsx`; o arquivo `EstoqueAlmoxarifado.tsx` é uma implementação paralela não usada por essas duas rotas. As telas de ajustes, separação, etiquetas, recebimento e Curva ABC têm componentes próprios.

## Correções incluídas nesta branch

1. Criado `src/styles/estoque-standard.css`, com escopo `.stock-standard`, para normalizar controles operacionais em 36 px (h-9), labels legíveis, foco visível, cabeçalhos navy, tabelas compactas com cabeçalho consistente e comportamento responsivo. O CSS não altera telas de outros módulos.
2. Aplicado o escopo visual às páginas:
   - `src/pages/EstoqueAlmoxarifadoCompact.tsx`
   - `src/pages/EstoqueAjustes.tsx`
   - `src/pages/EstoqueSeparacao.tsx`
   - `src/pages/EstoqueEtiquetas.tsx`
   - `src/pages/EstoqueCurvaABC.tsx`
   - `src/pages/estoque/EstoqueRecebimentoLotes.tsx`
   - `src/features/inventario/BalancoEstoque.tsx`
3. No balanço, removido o limite fixo de 5.000 produtos e aplicado `fetchAllPages` para produtos e almoxarifados, com `empresa_id` explícito.
4. No balanço, corrigido o rótulo incorreto “Status do Lote” para “Status do Saldo”. A interface declara que os números são saldo atual, não snapshot histórico. Os controles de almoxarifado e método de custo ficam desabilitados enquanto a fonte por endereço/lote necessária não estiver confirmada; a valoração atual continua sendo saldo do produto × `custo_medio`.
5. Mantidos os fluxos existentes de Supabase/RPC, campos, mensagens e regras do estoque; não foi criada tabela ou migration nova.

## Riscos e limites que permanecem explícitos

- Ajuste de avaria usa a RPC `erp_estoque_registrar_movimento`; a branch não prova a assinatura/policies no banco remoto nem concorrência, autorização ou atomicidade. Requer teste autenticado em ambiente autorizado.
- Separação grava a separação/cartão segundo o contrato atual e **não baixa nem reserva saldo**. Não alterar esse comportamento sem contrato de negócio confirmado.
- Etiquetas gera arquivo ZPL para produto ativo da empresa; copiar/baixar não aciona uma impressora. A geração de barras deve ser validada no modelo físico de impressora/leitor antes de homologar.
- Recebimento de lote usa Storage e RPC transacional; RLS, permissões, limpeza compensatória de upload e assinatura da RPC não foram exercitadas contra banco de teste.
- A Curva ABC usa saldo físico e o custo mais recente encontrado; não é consumo anual. Não apresentar como ABC anual sem fonte histórica e fórmula de negócio aprovada.
- O balanço não é uma valoração contábil oficial nem histórico por data. A fonte consultada usa `erp_produtos.estoque_atual` e `custo_medio`.

## Validação

- Inspeção do código-fonte e mapeamento de rotas: concluídos por leitura do repositório.
- Testes de tipo, lint, auditorias, build e rotas: **pendentes** até execução dos checks automáticos da pull request.
- Testes de navegador/responsividade visual: não executados nesta etapa.
- Testes autenticados Supabase/RLS/RPC/Storage: não executados; não há evidência de sessão de teste conectada nesta execução.
- Deploy: não solicitado nem considerado validado. Não publicar para tentar provar integração de banco.

## Critério de conclusão

A branch só deve ser considerada pronta após CI verde e revisão visual em desktop/tablet. A homologação funcional exige ambiente de teste Supabase e casos de isolamento entre empresas, usuário sem permissão, falha de RPC, repetição concorrente, lotes inválidos e falha/compensação do upload.
