# Rollback controlado — custo real por OP

**Migration:** 20261108223500_financeiro_custo_op_real.sql  
**Revisão:** REV-ROLLBACK-CUSTO-OP-20261108-01  
**Status:** DOCUMENTAÇÃO — não executar sem autorização e conferência do banco.

## Princípio

A migration reutiliza erp_custos_produtos, erp_custos_componentes, erp_custos_apontamentos, erp_estoque_movimentos e erp_apontamentos_processo. O contrato erp_financeiro_custo_op é uma VIEW com security_invoker, não uma segunda tabela de armazenamento.

Os registros de consumo e de custos indiretos são movimentos operacionais reais. Não devem ser apagados como parte de um rollback técnico.

## 1. Desativação da interface de leitura

Se for necessário retirar somente o contrato de consulta, após confirmar que nenhuma aplicação depende dele:

    DROP VIEW IF EXISTS public.erp_financeiro_custo_op;

## 2. Remoção das RPCs novas

Somente após desativar as telas e confirmar que não há chamadas pendentes:

    DROP FUNCTION IF EXISTS public.erp_pcp_consumir_material_op(uuid, uuid, numeric, text);
    DROP FUNCTION IF EXISTS public.erp_financeiro_custo_op_registrar_indireto(uuid, text, numeric, text, numeric, numeric);
    DROP FUNCTION IF EXISTS public.erp_financeiro_custo_op_apurar(uuid);

A remoção dessas funções interrompe novos consumos vinculados à OP e novas apurações. Ela não desfaz movimentos de estoque nem lançamentos indiretos já registrados.

## 3. Dados e colunas aditivas

Não remover automaticamente:
- movimentos de estoque com origem consumo_producao;
- registros de erp_custos_apontamentos vinculados a OP;
- linhas de custo REAL em erp_custos_produtos;
- componentes detalhados em erp_custos_componentes;
- colunas status_apuracao, revisao_apuracao, receita_estimada, apurado_em, apurado_por e updated_at.

Esses campos podem conter histórico e evidência operacional. A retirada de colunas exige exportação, análise de dependências e aprovação do proprietário. A reversão padrão preserva os dados e remove somente VIEW/RPCs.

## 4. Reversão operacional

Se um consumo tiver sido registrado incorretamente, não apagar o movimento original. Registrar movimento de estorno vinculado à mesma OP, com referência ao movimento original e autorização de estoque, mantendo a trilha de auditoria.

Se um custo indireto estiver incorreto, registrar ajuste/estorno auditável em vez de apagar o lançamento.

## 5. Validação pós-rollback

- confirmar que as telas não chamam as RPCs removidas;
- confirmar que nenhum movimento ou custo histórico foi apagado;
- executar type-check, lint, build e gates;
- validar RLS e isolamento multiempresa;
- registrar commit, SHA e resultado do preview.

**Importante:** este rollback ainda não foi executado. A migration também ainda não foi aplicada no Supabase.
