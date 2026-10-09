-- Engineering BOM compatibility contract: expose the existing BOM source of truth under the domain name.
begin;

alter table public.erp_pcp_bom_itens
  add column if not exists perda_quimica_percent numeric(7,4) not null default 0,
  add column if not exists operacao_consumo text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='erp_pcp_bom_perda_quimica_ck' and conrelid='public.erp_pcp_bom_itens'::regclass) then
    alter table public.erp_pcp_bom_itens add constraint erp_pcp_bom_perda_quimica_ck
      check (perda_quimica_percent >= 0 and perda_quimica_percent < 100);
  end if;
end $$;

create index if not exists idx_erp_pcp_bom_operation
  on public.erp_pcp_bom_itens(empresa_id,produto_pai_id,operacao_consumo);

do $$
begin
  if to_regclass('public.engenharia_bom') is null then
    execute $view$
      create view public.engenharia_bom with (security_invoker = true) as
      select
        id, empresa_id, produto_pai_id, produto_id, sku_insumo, qtd, unidade,
        custo_unitario, item_pai_id, perda_mecanica_percent, perda_quimica_percent,
        perda_galvanica_percent, revisao, vigencia_inicio, vigencia_fim, ativo,
        operacao_consumo,
        round((qtd / nullif(
          (1 - perda_mecanica_percent / 100)
          * (1 - perda_quimica_percent / 100)
          * (1 - perda_galvanica_percent / 100), 0
        ))::numeric, 4) as quantidade_bruta_calculada
      from public.erp_pcp_bom_itens
    $view$;
  end if;
end $$;

grant select on public.engenharia_bom to authenticated;

commit;
