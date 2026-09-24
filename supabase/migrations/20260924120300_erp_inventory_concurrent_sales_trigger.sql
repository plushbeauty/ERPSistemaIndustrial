-- =========================================================================
-- REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
-- Data/Hora: 24/09/2026 - 12:03 BRT
-- Desenvolvedor: Homologado por Fernando
-- ID da Revisão: REV-009
-- Alterações: Ativação do gatilho de vendas concorrentes durante inventário
--              cíclico, preservando snapshot e cálculo de divergência.
-- Status do Build Local: Não executado — gate certificado pelo CI/Vercel.
-- =========================================================================

drop trigger if exists trg_erp_estoque_registrar_venda_concorrente
on public.erp_estoque_movimentos;

create trigger trg_erp_estoque_registrar_venda_concorrente
after insert on public.erp_estoque_movimentos
for each row
execute function public.erp_estoque_registrar_venda_concorrente();

comment on trigger trg_erp_estoque_registrar_venda_concorrente
on public.erp_estoque_movimentos
is 'REV-009: contabiliza saídas de venda em inventário cíclico aberto sem bloquear o movimento real.';
