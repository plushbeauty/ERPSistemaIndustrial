-- VENDAS: vendedor real no pedido e cálculo de comissão por vendedor.
alter table public.erp_pedidos_venda
  add column if not exists vendedor_id uuid references public.erp_usuarios(id) on delete set null;

create index if not exists idx_erp_pedidos_venda_vendedor
  on public.erp_pedidos_venda(empresa_id, vendedor_id, data_entrada desc);

-- Preenche pedidos antigos apenas quando existe um único usuário ativo com o mesmo nome.
update public.erp_pedidos_venda p
set vendedor_id = x.id
from (
  select u.empresa_id, lower(trim(u.nome)) as nome, min(u.id) as id
  from public.erp_usuarios u
  where u.ativo = true and u.deleted_at is null
  group by u.empresa_id, lower(trim(u.nome))
  having count(*) = 1
) x
where p.vendedor_id is null
  and p.empresa_id = x.empresa_id
  and lower(trim(coalesce(p.vendedor_nome,''))) = x.nome;

create or replace function public.erp_vendas_sync_vendedor_nome()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
begin
  if new.vendedor_id is not null then
    select u.nome into new.vendedor_nome
    from public.erp_usuarios u
    where u.id = new.vendedor_id
      and u.empresa_id = new.empresa_id
      and u.ativo = true
      and u.deleted_at is null;
    if new.vendedor_nome is null then
      raise exception 'Vendedor inválido ou inativo para a empresa do pedido.';
    end if;
  elsif nullif(trim(coalesce(new.vendedor_nome,'')),'') is not null then
    select u.id, u.nome into new.vendedor_id, new.vendedor_nome
    from public.erp_usuarios u
    where u.empresa_id = new.empresa_id
      and u.ativo = true
      and u.deleted_at is null
      and lower(trim(u.nome)) = lower(trim(new.vendedor_nome))
    order by u.id
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_erp_pedidos_venda_sync_vendedor on public.erp_pedidos_venda;
create trigger trg_erp_pedidos_venda_sync_vendedor
before insert or update of vendedor_id, vendedor_nome, empresa_id
on public.erp_pedidos_venda
for each row execute function public.erp_vendas_sync_vendedor_nome();

create or replace function public.erp_comissao_calcular(
  p_competencia date,
  p_usuario_id uuid default null,
  p_meta_faturamento numeric default 0
) returns jsonb
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_empresa uuid:=public.erp_current_empresa_id();
  v_calc uuid;
  v_total numeric:=0;
  v_comissao numeric:=0;
  v_meta numeric:=coalesce(p_meta_faturamento,0);
  v_count integer:=0;
begin
  if not public.erp_comissao_autorizado() then
    raise exception 'COMISSOES_NAO_AUTORIZADO';
  end if;
  if v_empresa is null then
    raise exception 'EMPRESA_NAO_IDENTIFICADA';
  end if;

  insert into public.erp_comissao_calculos(empresa_id,competencia,usuario_id,meta_faturamento,calculado_por)
  select v_empresa,date_trunc('month',p_competencia)::date,p_usuario_id,v_meta,u.id
  from public.erp_usuarios u
  where u.auth_user_id=auth.uid() and u.ativo=true
  limit 1
  returning id into v_calc;

  insert into public.erp_comissao_linhas(
    calculo_id,empresa_id,pedido_id,item_id,produto_id,usuario_id,
    quantidade,valor_total,percentual,comissao_liquida
  )
  select
    v_calc,p.empresa_id,p.id,i.id,i.produto_id,p.vendedor_id,
    i.quantidade,
    coalesce(i.total,i.quantidade*i.valor_unitario*(1-coalesce(i.desconto,0)/100)),
    coalesce(r.percentual,0),
    round(
      coalesce(i.total,i.quantidade*i.valor_unitario*(1-coalesce(i.desconto,0)/100))
      *coalesce(r.percentual,0)/100,2
    )
  from public.erp_pedidos_venda p
  join public.erp_pedidos_venda_itens i
    on i.pedido_id=p.id and i.empresa_id=p.empresa_id
  join public.erp_comissao_vinculos v
    on v.empresa_id=p.empresa_id
   and v.usuario_id=p.vendedor_id
   and v.status='Ativo'
  join public.erp_comissao_regras r
    on r.empresa_id=p.empresa_id
   and r.perfil_id=v.perfil_id
   and r.produto_id=i.produto_id
   and r.ativo=true
  where p.empresa_id=v_empresa
    and p.vendedor_id is not null
    and (p_usuario_id is null or p.vendedor_id=p_usuario_id)
    and p.data_entrada>=date_trunc('month',p_competencia)::date
    and p.data_entrada<(date_trunc('month',p_competencia)+interval '1 month')::date
    and lower(coalesce(p.status,'')) not in ('cancelado','cancelada','rascunho','aberto','cotação','cotacao');

  select coalesce(sum(valor_total),0),coalesce(sum(comissao_liquida),0),count(*)
  into v_total,v_comissao,v_count
  from public.erp_comissao_linhas
  where calculo_id=v_calc;

  update public.erp_comissao_calculos
  set total_vendas=v_total,total_comissao=v_comissao,meta_atingida=(v_total>=v_meta and v_meta>0)
  where id=v_calc;

  return jsonb_build_object(
    'calculo_id',v_calc,
    'total_vendas',v_total,
    'total_comissao',v_comissao,
    'meta_atingida',(v_total>=v_meta and v_meta>0),
    'linhas',v_count
  );
end;
$$;

revoke all on function public.erp_comissao_calcular(date,uuid,numeric) from public,anon;
grant execute on function public.erp_comissao_calcular(date,uuid,numeric) to authenticated;
revoke all on function public.erp_vendas_sync_vendedor_nome() from public,anon;
