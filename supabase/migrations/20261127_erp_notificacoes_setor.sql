begin;

create table if not exists public.erp_notificacoes_setor (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  setor_origem text not null check (setor_origem in ('VENDAS','PCP','COMPRAS','ALMOXARIFADO','SGQ','FINANCEIRO')),
  setor_destino text not null check (setor_destino in ('VENDAS','PCP','COMPRAS','ALMOXARIFADO','SGQ','FINANCEIRO')),
  titulo text not null,
  mensagem text not null,
  referencia_tipo text check (referencia_tipo in ('PEDIDO','OP','REQUISICAO','TITULO','RPNC')),
  referencia_id uuid,
  rota_destino text,
  lida boolean not null default false,
  lida_em timestamptz,
  created_at timestamptz not null default now(),
  expira_em timestamptz not null default (now() + interval '10 days')
);

create index if not exists erp_notificacoes_setor_inbox_idx
  on public.erp_notificacoes_setor (empresa_id, setor_destino, lida, created_at desc);
create index if not exists erp_notificacoes_setor_expira_idx
  on public.erp_notificacoes_setor (expira_em);
create unique index if not exists erp_notificacoes_setor_ref_uk
  on public.erp_notificacoes_setor (empresa_id, setor_origem, setor_destino, referencia_tipo, referencia_id)
  where referencia_id is not null;

alter table public.erp_notificacoes_setor enable row level security;

drop policy if exists erp_notificacoes_setor_select_tenant_sector on public.erp_notificacoes_setor;
create policy erp_notificacoes_setor_select_tenant_sector
  on public.erp_notificacoes_setor for select to authenticated
  using (
    (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
    and (
      public.erp_is_master()
      or exists (
        select 1
          from public.erp_usuarios u
          left join public.erp_setores s on s.id = u.setor_id and s.empresa_id = u.empresa_id
         where u.auth_user_id = auth.uid()
           and u.empresa_id = erp_notificacoes_setor.empresa_id
           and u.ativo = true
           and u.deleted_at is null
           and case erp_notificacoes_setor.setor_destino
             when 'VENDAS' then upper(coalesce(s.codigo,'')) in ('VENDAS','VDA','COMERCIAL') or upper(coalesce(s.nome,'')) like '%VENDA%' or upper(coalesce(s.nome,'')) like '%COMERCIAL%'
             when 'PCP' then upper(coalesce(s.codigo,'')) = 'PCP' or upper(coalesce(s.nome,'')) like '%PCP%'
             when 'COMPRAS' then upper(coalesce(s.codigo,'')) in ('COM','COMPRAS') or upper(coalesce(s.nome,'')) like '%COMPRA%'
             when 'ALMOXARIFADO' then upper(coalesce(s.codigo,'')) in ('ALM','ALMOX','ESTOQUE') or upper(coalesce(s.nome,'')) like '%ALMOX%' or upper(coalesce(s.nome,'')) like '%ESTOQUE%'
             when 'SGQ' then upper(coalesce(s.codigo,'')) in ('QUA','SGQ') or upper(coalesce(s.nome,'')) like '%QUALIDADE%' or upper(coalesce(s.nome,'')) like '%SGQ%'
             when 'FINANCEIRO' then upper(coalesce(s.codigo,'')) in ('FIN','FINANCEIRO','FISCAL') or upper(coalesce(s.nome,'')) like '%FINANCEIRO%' or upper(coalesce(s.nome,'')) like '%FISCAL%'
             else false
           end
      )
    )
  );

drop policy if exists erp_notificacoes_setor_update_tenant_sector on public.erp_notificacoes_setor;
create policy erp_notificacoes_setor_update_tenant_sector
  on public.erp_notificacoes_setor for update to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and exists (
      select 1 from public.erp_usuarios u
      left join public.erp_setores s on s.id = u.setor_id and s.empresa_id = u.empresa_id
      where u.auth_user_id = auth.uid() and u.empresa_id = erp_notificacoes_setor.empresa_id
        and u.ativo = true and u.deleted_at is null
        and case erp_notificacoes_setor.setor_destino
          when 'VENDAS' then upper(coalesce(s.codigo,'')) in ('VENDAS','VDA','COMERCIAL') or upper(coalesce(s.nome,'')) like '%VENDA%' or upper(coalesce(s.nome,'')) like '%COMERCIAL%'
          when 'PCP' then upper(coalesce(s.codigo,'')) = 'PCP' or upper(coalesce(s.nome,'')) like '%PCP%'
          when 'COMPRAS' then upper(coalesce(s.codigo,'')) in ('COM','COMPRAS') or upper(coalesce(s.nome,'')) like '%COMPRA%'
          when 'ALMOXARIFADO' then upper(coalesce(s.codigo,'')) in ('ALM','ALMOX','ESTOQUE') or upper(coalesce(s.nome,'')) like '%ALMOX%' or upper(coalesce(s.nome,'')) like '%ESTOQUE%'
          when 'SGQ' then upper(coalesce(s.codigo,'')) in ('QUA','SGQ') or upper(coalesce(s.nome,'')) like '%QUALIDADE%' or upper(coalesce(s.nome,'')) like '%SGQ%'
          when 'FINANCEIRO' then upper(coalesce(s.codigo,'')) in ('FIN','FINANCEIRO','FISCAL') or upper(coalesce(s.nome,'')) like '%FINANCEIRO%' or upper(coalesce(s.nome,'')) like '%FISCAL%'
          else false
        end
    )
  )
  with check (
    empresa_id = public.erp_current_empresa_id()
    and lida = true and lida_em is not null
  );

revoke all on public.erp_notificacoes_setor from public, anon, authenticated;
grant select on public.erp_notificacoes_setor to authenticated;
grant update (lida, lida_em) on public.erp_notificacoes_setor to authenticated;

do $publication$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'erp_notificacoes_setor') then
    alter publication supabase_realtime add table public.erp_notificacoes_setor;
  end if;
end;
$publication$;

create or replace function public.erp_notificacoes_pedido_venda_trigger()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_new jsonb := to_jsonb(new);
  v_old jsonb;
  v_status text;
  v_id uuid;
  v_empresa uuid;
  v_codigo text;
begin
  if tg_op = 'UPDATE' then v_old := to_jsonb(old); end if;
  v_status := lower(coalesce(v_new ->> 'status',''));
  if v_status not in ('aprovado','aprovada','enviado_producao','enviado para produção','enviado para producao','liberado para produção','liberado para producao') then
    return new;
  end if;
  if tg_op = 'UPDATE' and lower(coalesce(v_old ->> 'status','')) = v_status then return new; end if;
  v_id := (v_new ->> 'id')::uuid;
  v_empresa := (v_new ->> 'empresa_id')::uuid;
  v_codigo := coalesce(v_new ->> 'numero_pedido', v_new ->> 'numero', v_new ->> 'codigo', left(v_id::text,8));
  if v_id is null or v_empresa is null then return new; end if;
  insert into public.erp_notificacoes_setor
    (empresa_id,setor_origem,setor_destino,titulo,mensagem,referencia_tipo,referencia_id,rota_destino)
  values
    (v_empresa,'VENDAS','PCP','Pedido de venda liberado para produção',
     'Novo Pedido nº ' || v_codigo || ' enviado por Vendas para programação no PCP',
     'PEDIDO',v_id,'/pageprincipal/pcp/pedidos-pendentes')
  on conflict do nothing;
  return new;
end;
$function$;

drop trigger if exists erp_notificacoes_pedido_venda_status on public.erp_pedidos_venda;
create trigger erp_notificacoes_pedido_venda_status
after insert or update of status on public.erp_pedidos_venda
for each row execute function public.erp_notificacoes_pedido_venda_trigger();

create or replace function public.erp_notificacoes_requisicao_compra_trigger()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_new jsonb := to_jsonb(new);
  v_id uuid;
  v_empresa uuid;
  v_codigo text;
begin
  v_id := (v_new ->> 'id')::uuid;
  v_empresa := (v_new ->> 'empresa_id')::uuid;
  v_codigo := coalesce(v_new ->> 'codigo', v_new ->> 'numero', left(v_id::text,8));
  if v_id is null or v_empresa is null then return new; end if;
  insert into public.erp_notificacoes_setor
    (empresa_id,setor_origem,setor_destino,titulo,mensagem,referencia_tipo,referencia_id,rota_destino)
  values
    (v_empresa,'PCP','COMPRAS','Nova requisição de compra gerada pelo PCP',
     'Requisição nº ' || v_codigo || ' gerada pelo PCP — verificar compra',
     'REQUISICAO',v_id,'/pageprincipal/compras/requisicoes')
  on conflict do nothing;
  return new;
end;
$function$;

drop trigger if exists erp_notificacoes_requisicao_compra_insert on public.erp_requisicoes_compra;
create trigger erp_notificacoes_requisicao_compra_insert
after insert on public.erp_requisicoes_compra
for each row execute function public.erp_notificacoes_requisicao_compra_trigger();

create or replace function public.erp_notificacoes_titulo_compra_trigger()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_new jsonb := to_jsonb(new);
  v_id uuid;
  v_empresa uuid;
  v_origem text;
  v_documento text;
begin
  v_id := (v_new ->> 'id')::uuid;
  v_empresa := (v_new ->> 'empresa_id')::uuid;
  v_origem := upper(coalesce(v_new ->> 'origem_tipo',''));
  v_documento := coalesce(v_new ->> 'documento', v_new ->> 'descricao', left(v_id::text,8));
  if v_id is null or v_empresa is null or v_origem <> 'PEDIDO_COMPRA' then return new; end if;
  insert into public.erp_notificacoes_setor
    (empresa_id,setor_origem,setor_destino,titulo,mensagem,referencia_tipo,referencia_id,rota_destino)
  values
    (v_empresa,'COMPRAS','FINANCEIRO','Título de compra disponível para conferência',
     'Título ' || v_documento || ' gerado a partir de compra/recebimento — conferir pagamento',
     'TITULO',v_id,'/pageprincipal/financeiro')
  on conflict do nothing;
  return new;
end;
$function$;

drop trigger if exists erp_notificacoes_titulo_compra_insert on public.erp_financeiro_titulos;
create trigger erp_notificacoes_titulo_compra_insert
after insert on public.erp_financeiro_titulos
for each row execute function public.erp_notificacoes_titulo_compra_trigger();

revoke all on function public.erp_notificacoes_pedido_venda_trigger() from public, anon, authenticated;
revoke all on function public.erp_notificacoes_requisicao_compra_trigger() from public, anon, authenticated;
revoke all on function public.erp_notificacoes_titulo_compra_trigger() from public, anon, authenticated;

commit;
