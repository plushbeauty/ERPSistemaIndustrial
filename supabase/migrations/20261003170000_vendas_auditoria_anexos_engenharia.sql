-- Vendas: anexos de auditoria, Storage privado e operações de engenharia.
-- Aplicada no projeto Supabase em 2026-10-03.
create unique index if not exists uq_erp_pedidos_venda_empresa_id on public.erp_pedidos_venda(empresa_id,id);

create table if not exists public.erp_pedidos_anexos(
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  pedido_id uuid not null,
  url_arquivo text not null,
  nome_arquivo text not null,
  criado_em timestamptz not null default now(),
  constraint fk_erp_pedidos_anexos_pedido_tenant foreign key(empresa_id,pedido_id)
    references public.erp_pedidos_venda(empresa_id,id) on delete cascade
);
create index if not exists idx_erp_pedidos_anexos_empresa_pedido
  on public.erp_pedidos_anexos(empresa_id,pedido_id,criado_em desc);
alter table public.erp_pedidos_anexos enable row level security;
drop policy if exists erp_pedidos_anexos_tenant on public.erp_pedidos_anexos;
create policy erp_pedidos_anexos_tenant on public.erp_pedidos_anexos for all to authenticated
  using(empresa_id=public.erp_current_empresa_id())
  with check(empresa_id=public.erp_current_empresa_id());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('pedidos-origem','pedidos-origem',false,52428800,
  array['message/rfc822','application/pdf','image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=false,file_size_limit=52428800,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists pedidos_origem_select_tenant on storage.objects;
create policy pedidos_origem_select_tenant on storage.objects for select to authenticated
  using(bucket_id='pedidos-origem' and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text);
drop policy if exists pedidos_origem_insert_tenant on storage.objects;
create policy pedidos_origem_insert_tenant on storage.objects for insert to authenticated
  with check(bucket_id='pedidos-origem' and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text);
drop policy if exists pedidos_origem_update_tenant on storage.objects;
create policy pedidos_origem_update_tenant on storage.objects for update to authenticated
  using(bucket_id='pedidos-origem' and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text)
  with check(bucket_id='pedidos-origem' and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text);
drop policy if exists pedidos_origem_delete_tenant on storage.objects;
create policy pedidos_origem_delete_tenant on storage.objects for delete to authenticated
  using(bucket_id='pedidos-origem' and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text);

insert into storage.buckets(id,name,public,file_size_limit)
values('engenharia-projetos','engenharia-projetos',false,104857600)
on conflict(id) do update set public=false,file_size_limit=104857600;

drop policy if exists engenharia_projetos_select_tenant on storage.objects;
create policy engenharia_projetos_select_tenant on storage.objects for select to authenticated
  using(bucket_id='engenharia-projetos' and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text);
drop policy if exists engenharia_projetos_insert_tenant on storage.objects;
create policy engenharia_projetos_insert_tenant on storage.objects for insert to authenticated
  with check(bucket_id='engenharia-projetos' and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text);
drop policy if exists engenharia_projetos_update_tenant on storage.objects;
create policy engenharia_projetos_update_tenant on storage.objects for update to authenticated
  using(bucket_id='engenharia-projetos' and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text)
  with check(bucket_id='engenharia-projetos' and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text);
drop policy if exists engenharia_projetos_delete_tenant on storage.objects;
create policy engenharia_projetos_delete_tenant on storage.objects for delete to authenticated
  using(bucket_id='engenharia-projetos' and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text);

create or replace function public.erp_calcular_custo_tecnico(p_produto_id uuid)
returns table(custo_tecnico numeric,operacoes integer)
language plpgsql security invoker set search_path=pg_catalog,public as $$
declare v_empresa uuid:=public.erp_current_empresa_id();v_ficha uuid;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if not exists(select 1 from public.erp_produtos where id=p_produto_id and empresa_id=v_empresa and ativo)
    then raise exception 'Produto inválido para a empresa atual.'; end if;
  select f.id into v_ficha from public.erp_fichas_processo f
    where f.empresa_id=v_empresa and f.produto_id=p_produto_id and f.ativo
    order by f.updated_at desc,f.created_at desc limit 1;
  return query select
    round(coalesce(sum((o.tempo_minutos/60.0)*coalesce(m.valor_hora_custo,0)),0),2),
    count(o.id)::integer
  from public.erp_ficha_processo_operacoes o
  left join public.erp_maquinas m on m.id=o.posto_trabalho_id and m.empresa_id=v_empresa
  where o.empresa_id=v_empresa and o.ficha_processo_id=v_ficha;
end $$;
revoke execute on function public.erp_calcular_custo_tecnico(uuid) from public,anon;
grant execute on function public.erp_calcular_custo_tecnico(uuid) to authenticated;

create or replace function public.erp_listar_operacoes_orcamento(p_produto_id uuid)
returns table(id uuid,sequencial_operacao integer,descricao_operacao text,posto_trabalho_id uuid,tempo_minutos numeric,maquina jsonb)
language plpgsql security invoker set search_path=pg_catalog,public as $$
declare v_empresa uuid:=public.erp_current_empresa_id();v_ficha uuid;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  select f.id into v_ficha from public.erp_fichas_processo f
    where f.empresa_id=v_empresa and f.produto_id=p_produto_id and f.ativo
    order by f.updated_at desc,f.created_at desc limit 1;
  return query select o.id,o.sequencial_operacao,o.descricao_operacao,o.posto_trabalho_id,o.tempo_minutos,
    jsonb_build_object('id',m.id,'codigo',m.codigo,'nome',m.nome,'valor_hora_custo',m.valor_hora_custo)
  from public.erp_ficha_processo_operacoes o
  left join public.erp_maquinas m on m.id=o.posto_trabalho_id and m.empresa_id=v_empresa
  where o.empresa_id=v_empresa and o.ficha_processo_id=v_ficha
  order by o.sequencial_operacao,o.created_at;
end $$;
revoke execute on function public.erp_listar_operacoes_orcamento(uuid) from public,anon;
grant execute on function public.erp_listar_operacoes_orcamento(uuid) to authenticated;

create or replace function public.erp_adicionar_operacao_orcamento(p_produto_id uuid,p_posto_trabalho_id uuid,p_tempo_minutos numeric)
returns uuid language plpgsql security invoker set search_path=pg_catalog,public as $$
declare v_empresa uuid:=public.erp_current_empresa_id();v_ficha uuid;v_seq integer;v_id uuid;v_codigo text;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if p_tempo_minutos<=0 then raise exception 'Tempo da operação deve ser maior que zero.'; end if;
  if not exists(select 1 from public.erp_produtos where id=p_produto_id and empresa_id=v_empresa and ativo)
    then raise exception 'Produto inválido.'; end if;
  if not exists(select 1 from public.erp_maquinas where id=p_posto_trabalho_id and empresa_id=v_empresa and ativo)
    then raise exception 'Posto de trabalho inválido.'; end if;
  select id into v_ficha from public.erp_fichas_processo
    where empresa_id=v_empresa and produto_id=p_produto_id and ativo
    order by updated_at desc,created_at desc limit 1;
  if v_ficha is null then
    select codigo into v_codigo from public.erp_produtos where id=p_produto_id and empresa_id=v_empresa;
    insert into public.erp_fichas_processo(empresa_id,produto_id,codigo_ficha,ativo)
      values(v_empresa,p_produto_id,'ORC-'||v_codigo,true) returning id into v_ficha;
  end if;
  select coalesce(max(sequencial_operacao),0)+10 into v_seq
    from public.erp_ficha_processo_operacoes where empresa_id=v_empresa and ficha_processo_id=v_ficha;
  insert into public.erp_ficha_processo_operacoes(
    empresa_id,ficha_processo_id,sequencial_operacao,descricao_operacao,posto_trabalho_id,tempo_minutos)
    select v_empresa,v_ficha,v_seq,m.nome,p_posto_trabalho_id,p_tempo_minutos
    from public.erp_maquinas m where m.id=p_posto_trabalho_id and m.empresa_id=v_empresa
    returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.erp_adicionar_operacao_orcamento(uuid,uuid,numeric) from public,anon;
grant execute on function public.erp_adicionar_operacao_orcamento(uuid,uuid,numeric) to authenticated;

create or replace function public.erp_remover_operacao_orcamento(p_operacao_id uuid)
returns boolean language plpgsql security invoker set search_path=pg_catalog,public as $$
declare v_empresa uuid:=public.erp_current_empresa_id();v_count integer;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  delete from public.erp_ficha_processo_operacoes where id=p_operacao_id and empresa_id=v_empresa;
  get diagnostics v_count=row_count;
  return v_count=1;
end $$;
revoke execute on function public.erp_remover_operacao_orcamento(uuid) from public,anon;
grant execute on function public.erp_remover_operacao_orcamento(uuid) to authenticated;