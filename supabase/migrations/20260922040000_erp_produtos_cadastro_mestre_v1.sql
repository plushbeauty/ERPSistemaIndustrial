/*
  Cadastro Mestre de Produtos v1
  - amplia erp_produtos para o cadastro industrial/fiscal mostrado no SGQ ERP
  - mantém compatibilidade com o núcleo existente
  - registra histórico de INSERT/UPDATE/DELETE em erp_audit_logs
*/
alter table public.erp_produtos
  add column if not exists descricao_resumida text,
  add column if not exists codigo_barras text,
  add column if not exists grupo text,
  add column if not exists subgrupo text,
  add column if not exists marca text,
  add column if not exists unidade text not null default 'UN',
  add column if not exists unidade_compra text not null default 'UN',
  add column if not exists unidade_venda text not null default 'UN',
  add column if not exists fornecedor_padrao_id uuid,
  add column if not exists referencia_interna text,
  add column if not exists referencia_cliente text,
  add column if not exists origem text default '0 - Nacional',
  add column if not exists ncm text,
  add column if not exists cest text,
  add column if not exists peso_liquido numeric(18,6) not null default 0,
  add column if not exists peso_bruto numeric(18,6) not null default 0,
  add column if not exists comprimento_mm numeric(18,3) not null default 0,
  add column if not exists largura_mm numeric(18,3) not null default 0,
  add column if not exists altura_mm numeric(18,3) not null default 0,
  add column if not exists observacoes text,
  add column if not exists foto_url text,
  add column if not exists fabricado boolean not null default false,
  add column if not exists comprado boolean not null default false,
  add column if not exists revenda boolean not null default false,
  add column if not exists estoque_maximo numeric(18,6) not null default 0,
  add column if not exists ponto_reposicao numeric(18,6) not null default 0,
  add column if not exists localizacao_padrao_id uuid,
  add column if not exists controla_lote boolean not null default false,
  add column if not exists controla_serie boolean not null default false,
  add column if not exists permite_estoque_negativo boolean not null default false,
  add column if not exists lote_validade_dias integer not null default 0,
  add column if not exists inspecao_qualidade_obrigatoria boolean not null default false,
  add column if not exists nivel_qualidade text,
  add column if not exists origem_fiscal text,
  add column if not exists cst_icms text,
  add column if not exists csosn text,
  add column if not exists cfop_entrada text,
  add column if not exists cfop_saida text,
  add column if not exists aliquota_icms numeric(9,4) not null default 0,
  add column if not exists aliquota_ipi numeric(9,4) not null default 0,
  add column if not exists aliquota_pis numeric(9,4) not null default 0,
  add column if not exists aliquota_cofins numeric(9,4) not null default 0,
  add column if not exists prazo_compra_dias integer not null default 0,
  add column if not exists prazo_producao_dias integer not null default 0,
  add column if not exists tolerancia_percentual numeric(9,4) not null default 0,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists ix_erp_produtos_empresa_codigo_barras
  on public.erp_produtos(empresa_id, codigo_barras)
  where codigo_barras is not null;

create index if not exists ix_erp_produtos_empresa_grupo
  on public.erp_produtos(empresa_id, grupo, subgrupo);

create index if not exists ix_erp_produtos_empresa_fornecedor
  on public.erp_produtos(empresa_id, fornecedor_padrao_id);

create index if not exists ix_erp_produtos_empresa_localizacao
  on public.erp_produtos(empresa_id, localizacao_padrao_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='erp_produtos_fornecedor_padrao_fk'
  ) then
    alter table public.erp_produtos
      add constraint erp_produtos_fornecedor_padrao_fk
      foreign key (fornecedor_padrao_id) references public.erp_fornecedores(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='erp_produtos_localizacao_padrao_fk'
  ) then
    alter table public.erp_produtos
      add constraint erp_produtos_localizacao_padrao_fk
      foreign key (localizacao_padrao_id) references public.erp_estoque_localizacoes(id) on delete set null;
  end if;
end $$;

create or replace function public.erp_produto_audit()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  v_empresa uuid;
  v_action text;
begin
  v_empresa := coalesce(new.empresa_id, old.empresa_id);
  v_action := case tg_op
    when 'INSERT' then 'produto_criado'
    when 'UPDATE' then 'produto_atualizado'
    when 'DELETE' then 'produto_excluido'
  end;

  insert into public.erp_audit_logs(
    company_id,user_id,action,module,entity,entity_id,old_data,new_data,created_at
  )
  values(
    v_empresa,auth.uid(),v_action,'produtos','erp_produtos',
    coalesce(new.id,old.id),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end,
    now()
  );

  return coalesce(new,old);
end;
$$;

drop trigger if exists trg_erp_produto_audit on public.erp_produtos;
create trigger trg_erp_produto_audit
after insert or update or delete on public.erp_produtos
for each row execute function public.erp_produto_audit();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'erp-produtos',
  'erp-produtos',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public=true,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "erp produtos foto insert tenant" on storage.objects;
create policy "erp produtos foto insert tenant"
on storage.objects for insert to authenticated
with check (
  bucket_id='erp-produtos'
  and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text
);

drop policy if exists "erp produtos foto update tenant" on storage.objects;
create policy "erp produtos foto update tenant"
on storage.objects for update to authenticated
using (
  bucket_id='erp-produtos'
  and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text
)
with check (
  bucket_id='erp-produtos'
  and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text
);

drop policy if exists "erp produtos foto delete tenant" on storage.objects;
create policy "erp produtos foto delete tenant"
on storage.objects for delete to authenticated
using (
  bucket_id='erp-produtos'
  and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text
);
