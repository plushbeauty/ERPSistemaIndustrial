begin;

-- The live customer-product mapping table existed, but the UI's product link and qualifiers were missing.
alter table public.erp_vendas_depara_produtos
  add column if not exists produto_id uuid,
  add column if not exists dimensoes text,
  add column if not exists canal text,
  add column if not exists molde text,
  add column if not exists ativo boolean not null default true;

create unique index if not exists erp_produtos_empresa_id_id_uq
  on public.erp_produtos (empresa_id, id);

do $migration$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'erp_vendas_depara_empresa_produto_fkey'
      and conrelid = 'public.erp_vendas_depara_produtos'::regclass
  ) then
    alter table public.erp_vendas_depara_produtos
      add constraint erp_vendas_depara_empresa_produto_fkey
      foreign key (empresa_id, produto_id)
      references public.erp_produtos (empresa_id, id)
      on delete restrict;
  end if;
end;
$migration$;

create unique index if not exists erp_vendas_depara_empresa_cliente_produto_uq
  on public.erp_vendas_depara_produtos (empresa_id, cliente_id, produto_id);

-- The Ishikawa screen saves exactly one 6M analysis per tenant/RNC; enforce the conflict target it uses.
create unique index if not exists erp_rpnc_empresa_id_id_uq
  on public.erp_rpnc (empresa_id, id);

create unique index if not exists erp_qualidade_ishikawa_empresa_rpnc_uq
  on public.erp_qualidade_ishikawa (empresa_id, rpnc_id);

do $migration$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'erp_qualidade_ishikawa_empresa_rpnc_fkey'
      and conrelid = 'public.erp_qualidade_ishikawa'::regclass
  ) then
    alter table public.erp_qualidade_ishikawa
      add constraint erp_qualidade_ishikawa_empresa_rpnc_fkey
      foreign key (empresa_id, rpnc_id)
      references public.erp_rpnc (empresa_id, id)
      on delete restrict;
  end if;
end;
$migration$;

commit;